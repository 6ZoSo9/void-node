import express from "express";
import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";

function isHex64(s: string) {
  return /^[0-9a-fA-F]{64}$/.test(s);
}

function sha256Hex(buf: Buffer) {
  return createHash("sha256").update(buf).digest("hex");
}

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function readJsonSafe(p: string): any | null {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function normalizeHex64(x: any): string | null {
  try {
    if (typeof x === "string") {
      const s = x.startsWith("0x") ? x.slice(2) : x;
      return isHex64(s) ? s.toLowerCase() : null;
    }
    if (Buffer.isBuffer(x)) return x.toString("hex").toLowerCase();
    if (x && typeof x === "object" && x.constructor && x.constructor.name === "Uint8Array") {
      return Buffer.from(x as Uint8Array).toString("hex").toLowerCase();
    }
  } catch {}
  return null;
}

// Scan any object/array for the first hex64 string (schema-agnostic).
function firstHex64Deep(x: any): string | null {
  const direct = normalizeHex64(x);
  if (direct) return direct;

  if (!x || typeof x !== "object") return null;
  if (Array.isArray(x)) {
    for (const v of x) {
      const h = firstHex64Deep(v);
      if (h) return h;
    }
    return null;
  }
  for (const k of Object.keys(x)) {
    const v = (x as any)[k];
    const h = firstHex64Deep(v);
    if (h) return h;
  }
  return null;
}

function normalizeLeavesFromManifest(man: any): string[] {
  const chunks = man?.chunks;
  if (!Array.isArray(chunks)) return [];
  const out: string[] = [];
  for (const c of chunks) {
    const h = firstHex64Deep(c);
    if (h) out.push(h);
  }
  return out;
}

// Fallback merkle: internal = sha256(left||right) over raw bytes; duplicate last if odd.
// Empty tree => sha256("").
function merkleRootHexFallback(leavesHex: string[]): string {
  if (leavesHex.length === 0) return sha256Hex(Buffer.alloc(0));
  let level = leavesHex.map((h) => Buffer.from(h, "hex"));
  while (level.length > 1) {
    const next: Buffer[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = (i + 1 < level.length) ? level[i + 1] : level[i];
      next.push(createHash("sha256").update(Buffer.concat([left, right])).digest());
    }
    level = next;
  }
  return level[0].toString("hex");
}

function merkleProofFallback(leavesHex: string[], index: number): { index: number; leaf: string; siblings: string[]; root: string } {
  if (index < 0 || index >= leavesHex.length) throw new Error("index out of range");
  let idx = index;
  let level = leavesHex.map((h) => Buffer.from(h, "hex"));
  const siblings: string[] = [];
  while (level.length > 1) {
    const next: Buffer[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = (i + 1 < level.length) ? level[i + 1] : level[i];
      const pairIndex = Math.floor(i / 2);
      next.push(createHash("sha256").update(Buffer.concat([left, right])).digest());

      if (i === (idx & ~1)) {
        const sib = (idx % 2 === 0) ? right : left;
        siblings.push(sib.toString("hex"));
        idx = pairIndex;
      }
    }
    level = next;
  }
  const root = level[0].toString("hex");
  return { index, leaf: leavesHex[index].toLowerCase(), siblings, root };
}

async function merkleRootMaybeFromModule(leavesHex: string[]) {
  try {
    const m: any = await import("../datanet/merkle.js");

    const fns = [
      m?.merkleRootHex,
      m?.rootHex,
      m?.merkleRoot,
      m?.root,
    ].filter((f: any) => typeof f === "function");

    for (const fn of fns) {
      const r = fn(leavesHex);
      const hex = normalizeHex64(r);
      if (hex && isHex64(hex)) return hex;
    }
  } catch {}
  return merkleRootHexFallback(leavesHex).toLowerCase();
}

function normalizeSiblingList(x: any): string[] {
  if (!Array.isArray(x)) return [];
  const out: string[] = [];
  for (const v of x) {
    const h = normalizeHex64(v);
    if (h && isHex64(h)) out.push(h);
  }
  return out;
}

async function merkleProofMaybeFromModule(leavesHex: string[], index: number) {
  try {
    const m: any = await import("../datanet/merkle.js");
    const fns = [m?.buildProof, m?.proof, m?.merkleProof].filter((f: any) => typeof f === "function");
    for (const fn of fns) {
      const p = fn(leavesHex, index);
      if (p) return p;
    }
  } catch {}
  return merkleProofFallback(leavesHex, index);
}

export function registerDataNetRoutes(app: express.Express, opts?: { dataDir?: string }) {
  const strictManifest = (process.env.DATANET_STRICT_MANIFEST || "").trim() === "1";
  const dataDir = opts?.dataDir || process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data";
  const base = path.resolve(dataDir, "datanet");
  const chunksDir = path.join(base, "chunks");
  const manifestsDir = path.join(base, "manifests");
  ensureDir(chunksDir);
  ensureDir(manifestsDir);

  const router = express.Router();

  router.put(
    "/datanet/v1/manifests/:rootHex",
    express.json({ limit: "8mb" }),
    async (req, res) => {
      const rootHex = String(req.params.rootHex || "").toLowerCase();
      if (!isHex64(rootHex)) return res.status(400).json({ ok: false, err: "bad rootHex" });

      const man = req.body;
      const leaves = normalizeLeavesFromManifest(man);
      if (!leaves.length) return res.status(400).json({ ok: false, err: "manifest has no hex64 leaves in chunks[]" });

      const computed = await merkleRootMaybeFromModule(leaves);
      if (!isHex64(computed)) return res.status(500).json({ ok: false, err: "merkle root compute returned non-hex" });

      if (computed !== rootHex) {
        if (strictManifest) {
          return res.status(400).json({ ok: false, err: "root_mismatch", want: rootHex, got: computed, leaves: leaves.length });
        }
        // non-strict mode: store anyway but warn (default while we align algorithms)
        const p = path.join(manifestsDir, `${rootHex}.json`);
        fs.writeFileSync(p, JSON.stringify(man, null, 2) + "
");
        return res.json({ ok: true, root: rootHex, leaves: leaves.length, warn: "root_mismatch_stored_anyway", want: rootHex, got: computed });
      }

      const p = path.join(manifestsDir, `${rootHex}.json`);
      fs.writeFileSync(p, JSON.stringify(man, null, 2) + "\n");
      return res.json({ ok: true, root: rootHex, leaves: leaves.length });
    }
  );

  router.get("/datanet/v1/manifests/:rootHex", (req, res) => {
    const rootHex = String(req.params.rootHex || "").toLowerCase();
    if (!isHex64(rootHex)) return res.status(400).json({ ok: false, err: "bad rootHex" });
    const p = path.join(manifestsDir, `${rootHex}.json`);
    if (!fs.existsSync(p)) return res.status(404).json({ ok: false, err: "manifest not found" });
    res.setHeader("Content-Type", "application/json");
    return res.send(fs.readFileSync(p));
  });

  router.put(
    "/datanet/v1/chunks/:leafHex",
    express.raw({ type: "*/*", limit: process.env.DATANET_MAX_CHUNK_MB ? `${process.env.DATANET_MAX_CHUNK_MB}mb` : "32mb" }),
    (req, res) => {
      const leafHex = String(req.params.leafHex || "").toLowerCase();
      if (!isHex64(leafHex)) return res.status(400).json({ ok: false, err: "bad leafHex" });

      const buf = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);
      const got = sha256Hex(buf);
      if (got !== leafHex) return res.status(400).json({ ok: false, err: "hash mismatch", want: leafHex, got });

      const p = path.join(chunksDir, `${leafHex}.bin`);
      const existed = fs.existsSync(p);
      if (!existed) fs.writeFileSync(p, buf);
      return res.json({ ok: true, leaf: leafHex, bytes: buf.length, existed });
    }
  );

  router.get("/datanet/v1/chunks/:leafHex", (req, res) => {
    const leafHex = String(req.params.leafHex || "").toLowerCase();
    if (!isHex64(leafHex)) return res.status(400).send("bad leafHex");
    const p = path.join(chunksDir, `${leafHex}.bin`);
    if (!fs.existsSync(p)) return res.status(404).send("not found");
    res.setHeader("Content-Type", "application/octet-stream");
    return res.send(fs.readFileSync(p));
  });

  router.get("/datanet/v1/proof/:rootHex/:index", async (req, res) => {
    const rootHex = String(req.params.rootHex || "").toLowerCase();
    const index = Number(req.params.index);
    if (!isHex64(rootHex)) return res.status(400).json({ ok: false, err: "bad rootHex" });
    if (!Number.isInteger(index) || index < 0) return res.status(400).json({ ok: false, err: "bad index" });

    const p = path.join(manifestsDir, `${rootHex}.json`);
    const man = readJsonSafe(p);
    if (!man) return res.status(404).json({ ok: false, err: "manifest not found" });

    const leaves = normalizeLeavesFromManifest(man);
    if (index >= leaves.length) return res.status(400).json({ ok: false, err: "index out of range", leaves: leaves.length });

    const proof: any = await merkleProofMaybeFromModule(leaves, index);
    const sibRaw = proof?.siblings ?? proof?.path ?? proof?.proof ?? [];
    const siblings = normalizeSiblingList(sibRaw);

    return res.json({ ok: true, root: rootHex, leaves: leaves.length, index, leaf: leaves[index], siblings });
  });

  router.get("/datanet/v1/status", (_req, res) => {
    const chunks = fs.existsSync(chunksDir) ? fs.readdirSync(chunksDir).filter((x) => x.endsWith(".bin")).length : 0;
    const mans = fs.existsSync(manifestsDir) ? fs.readdirSync(manifestsDir).filter((x) => x.endsWith(".json")).length : 0;
    return res.json({ ok: true, dataDir, chunks, manifests: mans });
  });

  app.use(router);
}
