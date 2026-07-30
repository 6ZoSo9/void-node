import express from "express";
import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import { merkleRoot } from "../datanet/merkle.js";
import * as crypto from "node:crypto";
import { packFile } from "../datanet/pack.js";

function recordSegstoreDatanetEmptyCatchVisibilityFailure_src_http_datanet_routes_ts(scope: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  console.warn("VOID_SEGSTORE_DATANET_EMPTY_CATCH_VISIBILITY_PACK_V1_FAILURE_VISIBLE", {
    file: "src/http/datanet_routes.ts",
    scope,
    message,
  });
}


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
    } catch (err) { recordSegstoreDatanetEmptyCatchVisibilityFailure_src_http_datanet_routes_ts("empty-handler-1", err); }
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
      } catch (err) { recordSegstoreDatanetEmptyCatchVisibilityFailure_src_http_datanet_routes_ts("empty-handler-2", err); }
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

// --- DataNet receipts metrics (v1) ---
// Stored on globalThis so it survives route remounts; no deps.
function __datanetReceiptsMetricsV1() {
  const G: any = globalThis as any;
  if (G.__void_datanet_receipts_metrics_v1) return G.__void_datanet_receipts_metrics_v1;
  const m = {
    post_total: 0,
    ok_total: 0,
    bad_total: 0,
    bytes_total: 0,
    wc_total: 0,
    last_ok_ts_ms: 0,
  };
  G.__void_datanet_receipts_metrics_v1 = m;
  return m;
}

function __datanetPromLine(name: string, value: number, labels?: Record<string,string>) {
  const ls = labels && Object.keys(labels).length
    ? "{" + Object.entries(labels).map(([k,v]) => `${k}="${String(v).replace(/"/g,'\\"')}"`).join(",") + "}"
    : "";
  return `${name}${ls} ${Number.isFinite(value) ? value : 0}\n`;
}
export function registerDataNetRoutes(app: express.Express, opts?: { dataDir?: string }) {
  const strictManifest = (process.env.DATANET_STRICT_MANIFEST || "").trim() === "1";

  const baseDir = opts?.dataDir || process.env.DATA_DIR || "data";
  const dnDir = path.join(baseDir, "datanet");
  const chunksDir = path.join(dnDir, "chunks");
  const manifestsDir = path.join(dnDir, "manifests");
  ensureDir(chunksDir);
  ensureDir(manifestsDir);

  // VOID_DATANET_PAID_READ_EXPLICIT_PUBLIC_ROUTES_V1_BEGIN
  try {
    const appAny: any = app as any;
    if (!appAny.__void_datanet_paid_read_explicit_public_routes_v1) {
      const publicDatanetRoot = path.resolve(
        process.cwd(),
        "public",
        "public-node",
        "datanet",
      );
      const publicRoutes = Object.freeze([
        {
          route: "/public-node/datanet/index.json",
          file: "index.json",
        },
        {
          route: "/public-node/datanet/paid-read-quote-v1.json",
          file: "paid-read-quote-v1.json",
        },
        {
          route: "/public-node/datanet/paid-read-quote-v1.schema.json",
          file: "paid-read-quote-v1.schema.json",
        },
      ]);

      const applyPublicHeaders = (
        res: express.Response,
        contentLength: number,
      ): void => {
        res.setHeader("Cache-Control", "public, max-age=60");
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Content-Length", String(contentLength));
        res.setHeader("X-Content-Type-Options", "nosniff");
      };

      for (const entry of publicRoutes) {
        const filePath = path.resolve(publicDatanetRoot, entry.file);
        const relative = path.relative(publicDatanetRoot, filePath);
        if (
          !relative
          || relative.startsWith("..")
          || path.isAbsolute(relative)
        ) {
          throw new Error("public_datanet_route_path_escape");
        }

        app.head(entry.route, (_req, res) => {
          try {
            const fileStat = fs.statSync(filePath);
            if (!fileStat.isFile()) {
              return res.status(404).json({
                ok: false,
                error: "public_datanet_file_not_found",
              });
            }
            applyPublicHeaders(res, fileStat.size);
            return res.status(200).end();
          } catch (error: unknown) {
            const code = (error as NodeJS.ErrnoException)?.code || "";
            if (code === "ENOENT" || code === "ENOTDIR") {
              return res.status(404).json({
                ok: false,
                error: "public_datanet_file_not_found",
              });
            }
            recordSegstoreDatanetEmptyCatchVisibilityFailure_src_http_datanet_routes_ts(
              "paid-read-explicit-public-route-head",
              error,
            );
            return res.status(500).json({
              ok: false,
              error: "public_datanet_file_read_failed",
            });
          }
        });

        app.get(entry.route, (_req, res) => {
          try {
            const body = fs.readFileSync(filePath);
            applyPublicHeaders(res, body.length);
            return res.status(200).send(body);
          } catch (error: unknown) {
            const code = (error as NodeJS.ErrnoException)?.code || "";
            if (code === "ENOENT" || code === "ENOTDIR") {
              return res.status(404).json({
                ok: false,
                error: "public_datanet_file_not_found",
              });
            }
            recordSegstoreDatanetEmptyCatchVisibilityFailure_src_http_datanet_routes_ts(
              "paid-read-explicit-public-route-get",
              error,
            );
            return res.status(500).json({
              ok: false,
              error: "public_datanet_file_read_failed",
            });
          }
        });
      }

      appAny.__void_datanet_paid_read_explicit_public_routes_v1 = true;
    }
  } catch (error: unknown) {
    recordSegstoreDatanetEmptyCatchVisibilityFailure_src_http_datanet_routes_ts(
      "paid-read-explicit-public-route-registration",
      error,
    );
  }
  // VOID_DATANET_PAID_READ_EXPLICIT_PUBLIC_ROUTES_V1_END

  const receiptsDir = path.join(dnDir, "receipts");
  const receiptsFile = path.join(receiptsDir, "datanet.jsonl");
  ensureDir(receiptsDir);
const router = express.Router();

  // [routermount.v1] mount router at /datanet/v1 (required so /datanet/v1/status works)
  try {
    const a: any = app as any;
    if (!a.__void_datanet_router_mounted_v1) {
      a.__void_datanet_router_mounted_v1 = true;
      app.use("/datanet/v1", router);
      try { console.log("[datanet_routes] mounted at /datanet/v1"); } catch (err) { recordSegstoreDatanetEmptyCatchVisibilityFailure_src_http_datanet_routes_ts("empty-handler-3", err); }
    }
  } catch (e: any) {
    try { console.log("[datanet_routes] mount failed:", e?.message || String(e)); } catch (err) { recordSegstoreDatanetEmptyCatchVisibilityFailure_src_http_datanet_routes_ts("empty-handler-4", err); }
  }
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
          try { b.id = idRaw; } catch (err) { recordSegstoreDatanetEmptyCatchVisibilityFailure_src_http_datanet_routes_ts("empty-handler-5", err); }
          if (!b.ts_ms) { try { b.ts_ms = ts0; } catch (err) { recordSegstoreDatanetEmptyCatchVisibilityFailure_src_http_datanet_routes_ts("empty-handler-6", err); } }
        } catch (err) { recordSegstoreDatanetEmptyCatchVisibilityFailure_src_http_datanet_routes_ts("empty-handler-7", err); }
      }
      const id = idRaw.replace(/^0x/, "");
      // accept hex-ish ids (publish ids have been 32-hex; roots are 64-hex)
      if (!(id.length >= 16 && id.length <= 128 && isHexLike(id))) {
        return res.status(400).json({ ok: false, err: "bad_id" });
      }

      // --- DataNet MVP receipt validation (v1) ---
      const rootIn = String(b.root || "").toLowerCase().replace(/^0x/, "");
      const leafIn = String(b.leaf || "").toLowerCase().replace(/^0x/, "");
      const idxIn = Number(b.index);
      const bytesClaim = Number(b.bytes || 0);

      if (!isHex64(rootIn)) return res.status(400).json({ ok: false, err: "bad_root" });
      if (!isHex64(leafIn)) return res.status(400).json({ ok: false, err: "bad_leaf" });
      if (!Number.isInteger(idxIn) || idxIn < 0) return res.status(400).json({ ok: false, err: "bad_index" });

      // Load manifest for root and confirm leaf at index.
      const mp2 = path.join(manifestsDir, `${rootIn}.json`);
      const man2 = readJsonSafe(mp2);
      if (!man2) return res.status(400).json({ ok: false, err: "manifest_missing" });

      const leaves2 = normalizeLeavesFromManifest(man2);
      if (!leaves2.length) return res.status(400).json({ ok: false, err: "manifest_no_leaves" });
      if (idxIn >= leaves2.length) return res.status(400).json({ ok: false, err: "index_oob", leaves: leaves2.length });

      const leafAtIdx = String(leaves2[idxIn] || "").toLowerCase().replace(/^0x/, "");
      if (leafAtIdx !== leafIn) {
        return res.status(400).json({
          ok: false,
          err: "leaf_mismatch_at_index",
          want: leafAtIdx,
          got: leafIn,
          index: idxIn,
          leaves: leaves2.length,
        });
      }

      // Confirm chunk exists and matches leaf hash.
      const cp2 = path.join(chunksDir, `${leafIn}.bin`);
      if (!fs.existsSync(cp2)) return res.status(400).json({ ok: false, err: "chunk_missing" });

      let bytes_on_disk = 0;
      try {
        const buf = fs.readFileSync(cp2);
        bytes_on_disk = buf.length;
        const gotLeaf = sha256Hex(buf);
        if (gotLeaf !== leafIn) {
          return res.status(400).json({ ok: false, err: "chunk_hash_mismatch", want: leafIn, got: gotLeaf });
        }
      } catch (e: any) {
        return res.status(400).json({ ok: false, err: "chunk_read_failed", msg: e?.message || String(e) });
      }

      // Prefer actual bytes; claim is informational only.
      if (Number.isFinite(bytesClaim) && bytesClaim > 0 && bytesClaim !== bytes_on_disk) {
        // non-fatal: client bytes mismatched; we record actual bytes.
      }
      // --- end validation (v1) ---


      const plain_sha = String(b.plain_sha256 || "").trim().replace(/^0x/, "");
      if (plain_sha && !isHex64(plain_sha)) return res.status(400).json({ ok: false, err: "bad_plain_sha256" });

      const account = String(b.account || b.who || b.owner || "").slice(0, 96);
      const who = account; // compat mirror for older readers/writers
      const mime = String(b.mime || "").slice(0, 96);
      const name = String(b.name || "").slice(0, 96);

      const bytesClaimIn = Number(b.bytes || 0);

      const bytes_claim = Number.isFinite(bytesClaimIn) && bytesClaimIn >= 0 ? Math.floor(bytesClaimIn) : 0;

      // Prefer validated on-disk size when available.

      const bytes_actual = (Number.isFinite(bytes_on_disk) && bytes_on_disk >= 0)
        ? Math.floor(bytes_on_disk)
        : bytes_claim;

      const bytes = bytes_actual;
      const ok = (b.ok === false) ? 0 : 1;

      // VOID_DATANET_RECEIPT_ONLY_NO_WC_MUTATION_V1
      // Public receipt ingestion records validated DataNet evidence only.
      // Caller-controlled ok/accepted/verified/wc_award fields never authorize WC issuance.
      const wc_eligible = 0;
      const wc_award = 0;

      const now = Date.now();
      const rec = {
        ts_ms: now,
        ok,
        wc_eligible,
        id: id.toLowerCase(),
        root: rootIn,
        leaf: leafIn,
        index: idxIn,
        bytes_claim,
        bytes_actual,

        plain_sha256: plain_sha ? plain_sha.toLowerCase() : "",
        bytes,
        mime,
        name,
        account,
        who,
        wc_award,
      };

      // VOID_DATANET_RECEIPT_WC_BRIDGE_DISABLED_V1
      // Receipt ingestion is evidence-only. No WC ledger mutation path exists here.

      const __m = __datanetReceiptsMetricsV1();
      __m.post_total++;
      if (ok) { __m.ok_total++; __m.last_ok_ts_ms = now; } else { __m.bad_total++; }
      __m.bytes_total += (bytes || 0);
      __m.wc_total += (wc_award || 0);

      appendJsonl(receiptsFile, rec);
      return res.json({ ok: true, wrote: true, id: rec.id, bytes: rec.bytes, file: receiptsFile });
    } catch (e: any) {
      return res.status(500).json({ ok: false, err: "receipt_write_failed", msg: e?.message || String(e) });
    }
  });

  // GET /datanet/v1/receipts/status (ultralow)
  
  // GET /datanet/v1/metrics/receipts.prom
  router.get("/metrics/receipts.prom", (_req, res) => {
    try {
      const m = __datanetReceiptsMetricsV1();
      res.setHeader("content-type", "text/plain; version=0.0.4; charset=utf-8");
      let out = "";
      out += "# HELP void_datanet_receipts_post_total DataNet receipt POST attempts\n";
      out += "# TYPE void_datanet_receipts_post_total counter\n";
      out += __datanetPromLine("void_datanet_receipts_post_total", m.post_total);
      out += "# HELP void_datanet_receipts_ok_total DataNet receipt OK appended\n";
      out += "# TYPE void_datanet_receipts_ok_total counter\n";
      out += __datanetPromLine("void_datanet_receipts_ok_total", m.ok_total);
      out += "# HELP void_datanet_receipts_bad_total DataNet receipt rejected/bad\n";
      out += "# TYPE void_datanet_receipts_bad_total counter\n";
      out += __datanetPromLine("void_datanet_receipts_bad_total", m.bad_total);
      out += "# HELP void_datanet_receipts_bytes_total Total bytes recorded from receipts\n";
      out += "# TYPE void_datanet_receipts_bytes_total counter\n";
      out += __datanetPromLine("void_datanet_receipts_bytes_total", m.bytes_total);
      out += "# HELP void_datanet_receipts_wc_total Total WC awarded\n";
      out += "# TYPE void_datanet_receipts_wc_total counter\n";
      out += __datanetPromLine("void_datanet_receipts_wc_total", m.wc_total);
      out += "# HELP void_datanet_receipts_last_ok_ts_ms Last OK receipt timestamp (ms)\n";
      out += "# TYPE void_datanet_receipts_last_ok_ts_ms gauge\n";
      out += __datanetPromLine("void_datanet_receipts_last_ok_ts_ms", m.last_ok_ts_ms);
      return res.send(out);
    } catch (e: any) {
      return res.status(500).send("error\n");
    }
  });

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
          } catch (err) { recordSegstoreDatanetEmptyCatchVisibilityFailure_src_http_datanet_routes_ts("empty-handler-11", err); }
        }
      }
      res.json({ ok: true, file: receiptsFile, total, last_ts_ms, last_ok_ts_ms });
    } catch (e: any) {
      res.status(500).json({ ok: false, err: "status_failed", msg: e?.message || String(e) });
    }
  });


  // POST /datanet/v1/publish (MVP v2: encrypt -> pack(cipherFile) -> meta.json)

  // GET /datanet/v1/fetch2/:id (MVP v2: reads mvp2/<id>/cipher.bin or chunks)
  router.get("/fetch2/:id", async (req: any, res: any) => {
    try {
      const who = String((req?.query?.who ?? "") || "").trim();
      if (!who) return res.status(400).json({ ok:false, error:"missing_who" });
      const id = String(req?.params?.id || "").trim();
      if (!id) return res.status(400).json({ ok:false, error:"missing_id" });

      const fs = await import("node:fs");
      const path = await import("node:path");
      const crypto = await import("node:crypto");
      const dataDir = String((process.env.DATA_DIR || "data") || "data");
      const dnDir = path.join(dataDir, "datanet");
      const mvp2Dir = path.join(dnDir, "mvp2", id);
      const mvp2ManPath = path.join(mvp2Dir, "manifest.v1.json");
      const mvp2MetaPath = path.join(mvp2Dir, "meta.json");

      let man: any = null;
      let meta: any = {};
      let cipherAll: Buffer | null = null;
      let source = "mvp2";

      if (fs.existsSync(mvp2Dir) && fs.existsSync(mvp2ManPath)) {
        man = JSON.parse(fs.readFileSync(mvp2ManPath, "utf8"));
        meta = fs.existsSync(mvp2MetaPath) ? JSON.parse(fs.readFileSync(mvp2MetaPath, "utf8")) : {};

        const cipherPath = path.join(mvp2Dir, "cipher.bin");
        if (fs.existsSync(cipherPath)) {
          cipherAll = fs.readFileSync(cipherPath);
        } else {
          const chunks = Array.isArray(man.chunks) ? man.chunks : [];
          const parts: Buffer[] = [];
          for (const c of chunks) {
            const fname = String(c.file || "");
            if (!fname) continue;
            parts.push(fs.readFileSync(path.join(mvp2Dir, fname)));
          }
          cipherAll = Buffer.concat(parts);
        }
      } else {
        const manifestsDir2 = path.join(dnDir, "manifests");
        const chunksDir2 = path.join(dnDir, "chunks");
        const manPath2 = path.join(manifestsDir2, `${id}.json`);
        if (!fs.existsSync(manPath2)) return res.status(404).json({ ok:false, error:"not_found" });

        source = "manifest_chunks";
        man = JSON.parse(fs.readFileSync(manPath2, "utf8"));
        meta = {};

        const chunks = Array.isArray(man.chunks) ? man.chunks : [];
        const parts: Buffer[] = [];
        for (const c of chunks) {
          const wantHex = String(c.leafHashHex || "").toLowerCase();
          if (!wantHex) continue;
          parts.push(fs.readFileSync(path.join(chunksDir2, `${wantHex}.bin`)));
        }
        cipherAll = Buffer.concat(parts);
      }

      const cipher_sha256_server = crypto.createHash("sha256").update(cipherAll).digest("hex");
      const plain_sha256_out = String(meta.plain_sha256 || cipher_sha256_server || "");

      // verify: chunk hashes match manifest + merkle root matches id
      let verify_ok = false;
      try {
        const mm = await import("../datanet/merkle.js");
        const sha256 = (mm as any).sha256;
        const merkleRoot = (mm as any).merkleRoot;
        const hex = (mm as any).hex;
        const chunks = Array.isArray(man.chunks) ? man.chunks : [];
        const leaves: Buffer[] = [];
        for (const c of chunks) {
          const wantHex = String(c.leafHashHex || "").toLowerCase();
          if (!wantHex) throw new Error("bad_manifest_chunk");

          let buf: Buffer;
          if (source === "mvp2") {
            const fname = String(c.file || "");
            if (!fname) throw new Error("bad_manifest_chunk");
            buf = fs.readFileSync(path.join(mvp2Dir, fname));
          } else {
            buf = fs.readFileSync(path.join(dnDir, "chunks", `${wantHex}.bin`));
          }

          const leaf = sha256(buf);
          const gotHex = hex(leaf);
          if (gotHex !== wantHex) throw new Error("leaf_mismatch");
          leaves.push(leaf);
        }
        const root = merkleRoot(leaves);
        const rootHex = hex(root);
        verify_ok = (rootHex === String(man.merkleRootHex || "")) && (rootHex === id);
      } catch {
        verify_ok = false;
      }

      return res.status(200).json({
        ok: true,
        id,
        source,
        verify_ok,
        cipher_sha256_server,
        cipher_b64: cipherAll.toString("base64"),
        plain_sha256: plain_sha256_out,
      });
    } catch (e:any) {
      return res.status(500).json({ ok:false, error:"fetch2_throw", msg: e?.message || String(e) });
    }
  });



// [repair_eof_v2] truncated tail starting at marker containing: // === [BEGIN DataNetPublishMvpV3] ===

}
