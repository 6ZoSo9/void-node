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

function normalizeLeavesFromManifest(man: any): string[] {
  const chunks = man?.chunks;
  if (!Array.isArray(chunks)) return [];
  const out: string[] = [];
  for (const c of chunks) {
    const v =
      (typeof c === "string" ? c : null) ??
      c?.leafHex ??
      c?.hashHex ??
      c?.hash ??
      c?.leaf ??
      c?.h ??
      null;
    if (typeof v === "string" && /^[0-9a-fA-F]{64}$/.test(v)) out.push(v.toLowerCase());
  }
  return out;
}

// Local merkle (fallback). Leaves are hex32 (64 chars). Internal nodes: sha256(left||right) on raw bytes.
function merkleRootHexFallback(leavesHex: string[]): string {
  if (leavesHex.length === 0) return sha256Hex(Buffer.alloc(0));
  let level = leavesHex.map((h) => Buffer.from(h, "hex"));
  while (level.length > 1) {
    const next: Buffer[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = (i + 1 < level.length) ? level[i + 1] : level[i]; // duplicate last
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

      if (i === (idx ^ 1) || i + 1 === (idx ^ 1)) {
        // sibling for this idx is the other element in its pair
        const sib = (idx % 2 === 0) ? right : left;
        siblings.push(sib.toString("hex"));
      }
      if (i === idx || i + 1 === idx) {
        idx = pairIndex;
      }
    }
    level = next;
  }
  const root = level[0].toString("hex");
  return { index, leaf: leavesHex[index].toLowerCase(), siblings, root };
}

async function merkleProofMaybeFromModule(leavesHex: string[], index: number) {
  // Try to use existing src/datanet/merkle.ts if it exports a compatible helper; else fallback.
  try {
    const m: any = await import("../datanet/merkle.js");
    const leaf = leavesHex[index]?.toLowerCase?.() ?? "";
    if (typeof m?.buildProof === "function") {
      const proof = m.buildProof(leavesHex, index);
      return { ...proof, leaf, root: proof?.root ?? proof?.rootHex ?? "" };
    }
    if (typeof m?.proof === "function") {
      return m.proof(leavesHex, index);
    }
    if (typeof m?.merkleProof === "function") {
      return m.merkleProof(leavesHex, index);
    }
  } catch {}
  return merkleProofFallback(leavesHex, index);
}

async function merkleRootMaybeFromModule(leavesHex: string[]) {
  try {
    const m: any = await import("../datanet/merkle.js");
    if (typeof m?.merkleRootHex === "function") return m.merkleRootHex(leavesHex);
    if (typeof m?.rootHex === "function") return m.rootHex(leavesHex);
    if (typeof m?.merkleRoot === "function") return m.merkleRoot(leavesHex);
  } catch {}
  return merkleRootHexFallback(leavesHex);
}

export function registerDataNetRoutes(app: express.Express, opts?: { dataDir?: string }) {
  const dataDir = opts?.dataDir || process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data";
  const base = path.resolve(dataDir, "datanet");
  const chunksDir = path.join(base, "chunks");
  const manifestsDir = path.join(base, "manifests");
  ensureDir(chunksDir);
  ensureDir(manifestsDir);

  const router = express.Router();

  // Store manifest under its root (client supplies root in URL; we verify against manifest leaves).
  router.put(
    "/datanet/v1/manifests/:rootHex",
    express.json({ limit: "4mb" }),
    async (req, res) => {
      const rootHex = String(req.params.rootHex || "").toLowerCase();
      if (!isHex64(rootHex)) return res.status(400).json({ ok: false, err: "bad rootHex" });

      const man = req.body;
      const leaves = normalizeLeavesFromManifest(man);
      if (!leaves.length) return res.status(400).json({ ok: false, err: "manifest has no chunks/leaves" });

      const computed = (await merkleRootMaybeFromModule(leaves)).toLowerCase();
      if (computed !== rootHex) {
        return res.status(400).json({ ok: false, err: "root mismatch", want: rootHex, got: computed, leaves: leaves.length });
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

  // Store chunk by leaf hash (sha256 of bytes). Verifies URL hash matches content.
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
      if (!fs.existsSync(p)) fs.writeFileSync(p, buf);
      return res.json({ ok: true, leaf: leafHex, bytes: buf.length, existed: fs.existsSync(p) });
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

  // Proof for (root, index) using stored manifest leaves.
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

    const proof = await merkleProofMaybeFromModule(leaves, index);
    // normalize a minimal shape
    return res.json({
      ok: true,
      root: rootHex,
      leaves: leaves.length,
      index,
      leaf: leaves[index],
      siblings: (proof as any).siblings || (proof as any).path || (proof as any).proof || [],
    });
  });

  // Tiny status
  router.get("/datanet/v1/status", (_req, res) => {
    const chunks = fs.existsSync(chunksDir) ? fs.readdirSync(chunksDir).filter((x) => x.endsWith(".bin")).length : 0;
    const mans = fs.existsSync(manifestsDir) ? fs.readdirSync(manifestsDir).filter((x) => x.endsWith(".json")).length : 0;
    return res.json({ ok: true, dataDir, chunks, manifests: mans });
  });

  app.use(router);
}
