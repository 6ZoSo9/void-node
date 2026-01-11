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
  // Accept common manifest shapes:
  //  - { leaves: ["hex64", ...] }
  //  - { leavesHex: ["hex64", ...] }
  //  - { leaves_hex: ["hex64", ...] }
  //  - { manifest: { leaves/leavesHex/leaves_hex: ... } }
  //  - { chunks: [{leaf|hash|sha256|id: hex64}, ...] }  (your current shape)
  //  - string lists: "hex64,hex64 ..." (comma/space separated)
  function normHex64(x: any): string | null {
    try {
      if (typeof x === "string") {
        const t = x.toLowerCase().replace(/^0x/, "").trim();
        if (isHex64(t)) return t;
      }
      const d = (typeof firstHex64Deep === "function") ? firstHex64Deep(x) : null;
      if (d && typeof d === "string") {
        const t = d.toLowerCase().replace(/^0x/, "").trim();
        if (isHex64(t)) return t;
      }
    } catch {}
    return null;
  }

  function pushFrom(v: any, out: string[]) {
    if (!v) return;

    if (typeof v === "string") {
      const parts = v.split(/[,\s]+/).map(x => x.trim()).filter(Boolean);
      for (const it of parts) {
        const t = String(it).toLowerCase().replace(/^0x/, "").trim();
        if (isHex64(t)) out.push(t);
      }
      return;
    }

    if (Array.isArray(v)) {
      for (const it of v) {
        const one = normHex64(it);
        if (one) out.push(one);
        else if (it && typeof it === "object") {
          for (const k of ["leaf","hash","sha256","id"]) {
            const vv = (it as any)[k];
            if (typeof vv !== "string") continue;
            const t = vv.toLowerCase().replace(/^0x/, "").trim();
            if (isHex64(t)) out.push(t);
          }
        }
      }
      return;
    }

    if (typeof v === "object") {
      try {
        for (const vv of Object.values(v)) {
          const one = normHex64(vv);
          if (one) out.push(one);
        }
      } catch {}
    }
  }

  const out: string[] = [];

  // direct keys
  pushFrom(man?.leaves, out);
  pushFrom(man?.leavesHex, out);
  pushFrom(man?.leaves_hex, out);

  // nested common wrapper
  pushFrom(man?.manifest?.leaves, out);
  pushFrom(man?.manifest?.leavesHex, out);
  pushFrom(man?.manifest?.leaves_hex, out);

  // keep supporting your existing current behavior
  pushFrom(man?.chunks, out);
  pushFrom(man?.manifest?.chunks, out);

  // de-dupe preserving order
  const seen = new Set<string>();
  const uniq: string[] = [];
  for (const x of out) {
    const t = String(x || "").toLowerCase().replace(/^0x/, "").trim();
    if (!t || !isHex64(t)) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    uniq.push(t);
  }
  return uniq;
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


function isHexLike(s: string) {
  return /^[0-9a-fA-F]+$/.test(s);
}

function appendJsonl(file: string, obj: any) {
  const line = JSON.stringify(obj);
  // cheap DoS guard: cap line size
  if (line.length > 32_000) throw new Error("receipt_too_large");
  fs.appendFileSync(file, line + "\n");
}
export function registerDataNetRoutes(app: express.Express, opts?: { dataDir?: string }) {
  const strictManifest = (process.env.DATANET_STRICT_MANIFEST || "").trim() === "1";

  const baseDir = opts?.dataDir || process.env.DATA_DIR || "data";
  const dnDir = path.join(baseDir, "datanet");
  const chunksDir = path.join(dnDir, "chunks");
  const manifestsDir = path.join(dnDir, "manifests");
  ensureDir(chunksDir);
  ensureDir(manifestsDir);

  
  const receiptsDir = path.join(dnDir, "receipts");
  const receiptsFile = path.join(receiptsDir, "datanet.jsonl");
  ensureDir(receiptsDir);
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

    // === receipts: client-verified decrypt/roundtrip ===
  // POST /datanet/v1/receipt
  // Body: { id, plain_sha256?, bytes?, mime?, name?, who?, wc_award?, ok? }
  router.post("/receipt", (req, res) => {
    try {
      const b: any = req.body || {};
      let idRaw = String(b.id || "").trim();
      // If caller didn't provide id, derive a stable one from core fields.
      // This keeps clients simple and preserves append-only receipts.jsonl semantics.
      if (!idRaw) {
        try {
          const root0 = String(b?.root || "").toLowerCase().replace(/^0x/, "");
          const leaf0 = String(b?.leaf || "").toLowerCase().replace(/^0x/, "");
          const idx0 = Number(b?.index);
          const bytes0 = Number(b?.bytes);
          const ts0 = Number(b?.ts_ms || Date.now());
          const src = `${root0}:${leaf0}:${idx0}:${bytes0}:${ts0}`;
          idRaw = createHash("sha256").update(src).digest("hex");
          try { b.id = idRaw; } catch {}
          if (!b.ts_ms) { try { b.ts_ms = ts0; } catch {} }
        } catch {}
      }
      const id = idRaw.replace(/^0x/, "");
      // accept hex-ish ids (publish ids have been 32-hex; roots are 64-hex)
      if (!(id.length >= 16 && id.length <= 128 && isHexLike(id))) {
        return res.status(400).json({ ok: false, err: "bad_id" });
      }

      const plain_sha = String(b.plain_sha256 || "").trim().replace(/^0x/, "");
      if (plain_sha && !isHex64(plain_sha)) return res.status(400).json({ ok: false, err: "bad_plain_sha256" });

      const who = String(b.who || "").slice(0, 96);
      const mime = String(b.mime || "").slice(0, 96);
      const name = String(b.name || "").slice(0, 96);

      const bytesIn = Number(b.bytes || 0);
      const bytes = Number.isFinite(bytesIn) && bytesIn >= 0 ? Math.floor(bytesIn) : 0;

      const ok = (b.ok === false) ? 0 : 1;

      const wcIn = Number(b.wc_award || 0);
      const wc_award = Number.isFinite(wcIn) && wcIn >= 0 && wcIn <= 1_000_000 ? Math.floor(wcIn) : 0;

      const now = Date.now();
      const rec = {
        ts_ms: now,
        ok,
        id: id.toLowerCase(),
        plain_sha256: plain_sha ? plain_sha.toLowerCase() : "",
        bytes,
        mime,
        name,
        who,
        wc_award,
      };

      appendJsonl(receiptsFile, rec);
      return res.json({ ok: true, wrote: true, file: receiptsFile });
    } catch (e: any) {
      return res.status(500).json({ ok: false, err: "receipt_write_failed", msg: e?.message || String(e) });
    }
  });

  // GET /datanet/v1/receipts/status (ultralow)
  router.get("/receipts/status", (req, res) => {
    try {
      let total = 0;
      let last_ts_ms = 0;
      let last_ok_ts_ms = 0;
      if (fs.existsSync(receiptsFile)) {
        const s = fs.readFileSync(receiptsFile, "utf8");
        const lines = s.split(/\n/).filter(Boolean);
        total = lines.length;
        // scan last ~50 for timestamps
        for (let i = Math.max(0, lines.length - 50); i < lines.length; i++) {
          try {
            const j = JSON.parse(lines[i]);
            const t = Number(j?.ts_ms || 0);
            if (Number.isFinite(t) && t > last_ts_ms) last_ts_ms = t;
            if ((j?.ok|0) === 1 && Number.isFinite(t) && t > last_ok_ts_ms) last_ok_ts_ms = t;
          } catch {}
        }
      }
      res.json({ ok: true, file: receiptsFile, total, last_ts_ms, last_ok_ts_ms });
    } catch (e: any) {
      res.status(500).json({ ok: false, err: "status_failed", msg: e?.message || String(e) });
    }
  });

  app.use("/datanet/v1", router);
}
