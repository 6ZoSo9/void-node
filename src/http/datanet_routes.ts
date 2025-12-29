import express from "express";
import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import { merkleRoot } from "../datanet/merkle.js";

function isHex64(s: string) {
  return /^[0-9a-fA-F]{64}$/.test(s);
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

// First hex64 found anywhere in object/array/string.
function firstHex64Deep(x: any): string | null {
  if (typeof x === "string") {
    const s = x.startsWith("0x") ? x.slice(2) : x;
    return isHex64(s) ? s.toLowerCase() : null;
  }
  if (Array.isArray(x)) {
    for (const v of x) {
      const h = firstHex64Deep(v);
      if (h) return h;
    }
    return null;
  }
  if (x && typeof x === "object") {
    for (const k of Object.keys(x)) {
      const h = firstHex64Deep((x as any)[k]);
      if (h) return h;
    }
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

function leafHexToBuf(h: string): Buffer {
  const s = h.startsWith("0x") ? h.slice(2) : h;
  if (!isHex64(s)) throw new Error("invalid leaf hex64");
  return Buffer.from(s.toLowerCase(), "hex");
}

function computeRootHexFromLeaves(leavesHex: string[]): string {
  // CRITICAL: merkleRoot expects Buffers; passing strings changes the hash domain.
  const bufs = leavesHex.map(leafHexToBuf);
  const r = merkleRoot(bufs);
  // merkleRoot returns Buffer
  return Buffer.isBuffer(r) ? r.toString("hex") : Buffer.from(r as any).toString("hex");
}

function sha256Hex(buf: Buffer) {
  return createHash("sha256").update(buf).digest("hex");
}

export function registerDataNetRoutes(app: express.Express, opts?: { dataDir?: string }) {
  const strictManifest = (process.env.DATANET_STRICT_MANIFEST || "").trim() === "1";

  const baseDir = opts?.dataDir || process.env.DATA_DIR || "data";
  const dnDir = path.join(baseDir, "datanet");
  const chunksDir = path.join(dnDir, "chunks");
  const manifestsDir = path.join(dnDir, "manifests");
  ensureDir(chunksDir);
  ensureDir(manifestsDir);

  const router = express.Router();
  router.use(express.json({ limit: "10mb", type: ["application/json", "text/json", "application/*+json"] }));

  router.get("/status", (req, res) => {
    const chunks = fs.existsSync(chunksDir) ? fs.readdirSync(chunksDir).filter(f => f.endsWith(".bin")).length : 0;
    const manifests = fs.existsSync(manifestsDir) ? fs.readdirSync(manifestsDir).filter(f => f.endsWith(".json")).length : 0;
    res.json({ ok: true, dataDir: baseDir, chunks, manifests });
  });

  router.get("/manifests/:root", (req, res) => {
    const root = String(req.params.root || "").toLowerCase().replace(/^0x/, "");
    if (!isHex64(root)) return res.status(400).json({ ok: false, err: "bad_root" });
    const p = path.join(manifestsDir, `${root}.json`);
    const j = readJsonSafe(p);
    if (!j) return res.status(404).json({ ok: false, err: "not_found" });
    res.json({ ok: true, manifest: j });
  });

  router.put("/manifests/:root", (req, res) => {
    const root = String(req.params.root || "").toLowerCase().replace(/^0x/, "");
    if (!isHex64(root)) return res.status(400).json({ ok: false, err: "bad_root" });

    const man = req.body;
    if (!man || typeof man !== "object") return res.status(400).json({ ok: false, err: "bad_json" });

    const rootIn = firstHex64Deep(man?.merkleRootHex) || null;
    if (rootIn && rootIn !== root) {
      return res.status(400).json({ ok: false, err: "root_mismatch_param_vs_body", want: root, got: rootIn });
    }

    const leaves = normalizeLeavesFromManifest(man);
    if (!leaves.length) return res.status(400).json({ ok: false, err: "no_leaves" });

    let computed = "";
    try {
      computed = computeRootHexFromLeaves(leaves);
    } catch (e: any) {
      return res.status(400).json({ ok: false, err: "compute_failed", msg: e?.message || String(e) });
    }

    if (computed !== root) {
      if (strictManifest) {
        return res.status(400).json({ ok: false, err: "root_mismatch", want: root, got: computed, leaves: leaves.length });
      }
      // non-strict: store anyway but warn
      const p = path.join(manifestsDir, `${root}.json`);
      fs.writeFileSync(p, JSON.stringify(man, null, 2) + "\n");
      return res.json({ ok: true, root, leaves: leaves.length, warn: "root_mismatch_stored_anyway", want: root, got: computed });
    }

    const p = path.join(manifestsDir, `${root}.json`);
    fs.writeFileSync(p, JSON.stringify(man, null, 2) + "\n");
    return res.json({ ok: true, root, leaves: leaves.length });
  });

  router.get("/chunks/:leaf", (req, res) => {
    const leaf = String(req.params.leaf || "").toLowerCase().replace(/^0x/, "");
    if (!isHex64(leaf)) return res.status(400).json({ ok: false, err: "bad_leaf" });
    const p = path.join(chunksDir, `${leaf}.bin`);
    if (!fs.existsSync(p)) return res.status(404).json({ ok: false, err: "not_found" });
    res.setHeader("content-type", "application/octet-stream");
    fs.createReadStream(p).pipe(res);
  });

  router.put("/chunks/:leaf", express.raw({ type: "*/*", limit: "64mb" }), (req, res) => {
    const leaf = String(req.params.leaf || "").toLowerCase().replace(/^0x/, "");
    if (!isHex64(leaf)) return res.status(400).json({ ok: false, err: "bad_leaf" });
    const body = req.body as Buffer;
    if (!Buffer.isBuffer(body) || body.length === 0) return res.status(400).json({ ok: false, err: "empty" });

    // sanity: leaf should be sha256(chunk)
    const got = sha256Hex(body);
    if (got !== leaf) return res.status(400).json({ ok: false, err: "leaf_hash_mismatch", want: leaf, got });

    const p = path.join(chunksDir, `${leaf}.bin`);
    fs.writeFileSync(p, body);
    res.json({ ok: true, leaf, bytes: body.length });
  });

  router.get("/proof/:root/:index", (req, res) => {
    const root = String(req.params.root || "").toLowerCase().replace(/^0x/, "");
    const idx = Number(req.params.index);
    if (!isHex64(root)) return res.status(400).json({ ok: false, err: "bad_root" });
    if (!Number.isInteger(idx) || idx < 0) return res.status(400).json({ ok: false, err: "bad_index" });

    const mp = path.join(manifestsDir, `${root}.json`);
    const man = readJsonSafe(mp);
    if (!man) return res.status(404).json({ ok: false, err: "manifest_not_found" });

    const leavesHex = normalizeLeavesFromManifest(man);
    if (idx >= leavesHex.length) return res.status(400).json({ ok: false, err: "index_oob", leaves: leavesHex.length });

    // build merkle levels using Buffer leaves (same domain as pack)
    let level: Buffer[] = leavesHex.map(leafHexToBuf);
    const siblings: string[] = [];
    let at = idx;

    while (level.length > 1) {
      const isRight = (at % 2) === 1;
      const sibIdx = isRight ? at - 1 : at + 1;
      const sib = level[sibIdx] ?? level[at];
      siblings.push(Buffer.from(sib).toString("hex"));

      const next: Buffer[] = [];
      for (let i = 0; i < level.length; i += 2) {
        const L = level[i];
        const R = level[i + 1] ?? level[i];
        next.push(createHash("sha256").update(Buffer.concat([L, R])).digest());
      }
      level = next;
      at = Math.floor(at / 2);
    }

    const computed = level[0].toString("hex");
    if (computed !== root) {
      if (strictManifest) {
        return res.status(400).json({ ok: false, err: "root_mismatch", want: root, got: computed, leaves: leavesHex.length });
      }
      return res.json({ ok: true, root, leaves: leavesHex.length, index: idx, leaf: leavesHex[idx], siblings, warn: "root_mismatch_non_strict", want: root, got: computed });
    }

    res.json({ ok: true, root, leaves: leavesHex.length, index: idx, leaf: leavesHex[idx], siblings });
  });

  app.use("/datanet/v1", router);
}
