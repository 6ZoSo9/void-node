/* datanet_publish_encrypt_preload_v1.cjs
   Adds:
     POST /datanet/v1/publish.enc   { who?, plaintext_b64, name?, mime? }
     GET  /datanet/v1/fetch.enc/:id -> { ok, id, cipher_b64, cipher_sha256_server, verify_ok }
   Notes:
     - AES-256-GCM encryption per publish
     - returns key_b64 + nonce_b64 so caller can decrypt
     - stores ciphertext + manifest under DATA_DIR/datanet/publish_enc_v1/...
   Safe:
     - never throws on boot; waits for global app hook
     - uses unique variable names to avoid collisions
*/
(() => {
  const fs = require("fs");
  const path = require("path");
  const crypto2 = require("crypto");

  const G = globalThis;
  if (G.__void_datanet_publish_enc_preload_v1) return;
  G.__void_datanet_publish_enc_preload_v1 = true;

  const nowMs = () => Date.now();
  const b64 = (buf) => Buffer.from(buf).toString("base64");
  const fromB64 = (s) => Buffer.from(String(s || ""), "base64");
  const sha256Hex = (buf) => crypto2.createHash("sha256").update(buf).digest("hex");

  // RAW_JSON_FALLBACK_V1: parse JSON even if express.json middleware is not attached to this route.
  function readJsonBody(req, maxBytes) {
    return new Promise((resolve) => {
      try {
        if (!req || typeof req.on !== "function") return resolve({});
        const ct = String((req.headers && req.headers["content-type"]) || "");
        if (!ct.toLowerCase().includes("application/json")) return resolve({});
        let total = 0;
        const chunks = [];
        req.on("data", (c) => {
          try {
            const b = Buffer.from(c);
            total += b.length;
            if (total > maxBytes) {
              try { req.destroy(); } catch (voidDatanetPublishEncryptPreloadCatchError) { void voidDatanetPublishEncryptPreloadCatchError; /* VOID_DATANET_PUBLISH_ENCRYPT_PRELOAD_EMPTY_CATCH_VISIBILITY_V1 */ }
              return resolve({ __too_large: true });
            }
            chunks.push(b);
          } catch (voidDatanetPublishEncryptPreloadCatchError) { void voidDatanetPublishEncryptPreloadCatchError; /* VOID_DATANET_PUBLISH_ENCRYPT_PRELOAD_EMPTY_CATCH_VISIBILITY_V1 */ }
        });
        req.on("end", () => {
          try {
            const raw = Buffer.concat(chunks).toString("utf8");
            if (!raw.trim()) return resolve({});
            const obj = JSON.parse(raw);
            resolve(obj && typeof obj === "object" ? obj : {});
          } catch {
            resolve({ __bad_json: true });
          }
        });
        req.on("error", () => resolve({}));
      } catch {
        resolve({});
      }
    });
  }

  function mkdirp(p) { try { fs.mkdirSync(p, { recursive: true }); } catch (voidDatanetPublishEncryptPreloadCatchError) { void voidDatanetPublishEncryptPreloadCatchError; /* VOID_DATANET_PUBLISH_ENCRYPT_PRELOAD_EMPTY_CATCH_VISIBILITY_V1 */ } }
  function writeFileAtomic(filePath, dataBuf) {
    const tmp = filePath + ".tmp." + process.pid + "." + nowMs();
    fs.writeFileSync(tmp, dataBuf);
    fs.renameSync(tmp, filePath);
  }

  // RECEIPTS_APPEND_V1: append one JSONL receipt per successful publish.enc
  function appendJsonlSafe(filePath, obj) {
    try {
      if (!filePath) return false;
      const line = JSON.stringify(obj) + "\n";
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.appendFileSync(filePath, line, { encoding: "utf8" });
      return true;
    } catch {
      return false;
    }
  }

  function tryMount(app) {
    try {
      if (!app || typeof app.post !== "function" || typeof app.get !== "function") return false;

      const dataDir = String(process.env.DATA_DIR || path.join(process.cwd(), "data"));
      const root = path.join(dataDir, "datanet", "publish_enc_v1");
      const cdir = path.join(root, "chunks");
      const mdir = path.join(root, "manifests");
      mkdirp(cdir); mkdirp(mdir);

      // Express JSON middleware may not exist here; rely on whatever index.ts already configured.
      // We'll tolerate missing body by reading req.body if present.
      app.post("/datanet/v1/publish.enc", async (req, res) => {
        try {
          let body = (req && req.body) ? req.body : null;
          if (!body || typeof body !== "object") {
            const parsed = await readJsonBody(req, 12 * 1024 * 1024);
            body = (parsed && typeof parsed === "object") ? parsed : {};
          }
          const plaintext_b64 = body && body.plaintext_b64;
          const name = (body && body.name) ? String(body.name) : "mvp.bin";
          const mime = (body && body.mime) ? String(body.mime) : "application/octet-stream";
          const who =
            (body && body.who) ? String(body.who) :
            (req && req.query && (req.query.who || req.query.WHO)) ? String(req.query.who || req.query.WHO) :
            (req && req.headers && (req.headers["x-void-who"] || req.headers["x-VOID-who"] || req.headers["x-void-WHO"])) ? String(req.headers["x-void-who"] || req.headers["x-VOID-who"] || req.headers["x-void-WHO"]) :
            "";

          if (!plaintext_b64 || typeof plaintext_b64 !== "string") {
            return res.status(400).json({ ok:false, err:"bad_request", detail:"missing plaintext_b64 (base64)" });
          }

          const plainBuf = fromB64(plaintext_b64);
          const plain_sha256 = sha256Hex(plainBuf);

          const keyBuf = crypto2.randomBytes(32);
          const nonceBuf = crypto2.randomBytes(12);
          const enc = crypto2.createCipheriv("aes-256-gcm", keyBuf, nonceBuf);
          const c1 = enc.update(plainBuf);
          const c2 = enc.final();
          const tagBuf = enc.getAuthTag();
          const cipherAll = Buffer.concat([c1, c2, tagBuf]);

          const cipher_sha256 = sha256Hex(cipherAll);
          const id = cipher_sha256.slice(0, 32);

          const chunkPath = path.join(cdir, id + ".bin");
          const manifestPath = path.join(mdir, id + ".json");

          writeFileAtomic(chunkPath, cipherAll);
          const manifest = {
            ok: true,
            v: 1,
            id,
            who,
            name,
            mime,
            plain_sha256,
            cipher_sha256,
            cipher_bytes: cipherAll.length,
            alg: "aes-256-gcm",
            tag_bytes: tagBuf.length,
            ts_ms: nowMs()
          };
          writeFileAtomic(manifestPath, Buffer.from(JSON.stringify(manifest)));

          // RECEIPTS_APPEND_V1
          try {
            const receiptsFile = String(process.env.DATANET_RECEIPTS_FILE || "").trim();
            // ENC_RECEIPTS_OVERRIDE_V1
            const encFlag = String(process.env.DATANET_PUBLISH_ENC_NO_LOCAL_RECEIPTS || "").trim();
            const noLocal = (encFlag === "1") ? true : (encFlag === "0") ? false : (String(process.env.DATANET_MVP_NO_LOCAL_RECEIPTS || "").trim() === "1");
            const requireWho = String(process.env.DATANET_RECEIPTS_REQUIRE_WHO || "").trim() === "1";

            if (!noLocal && receiptsFile) {
              const okWho = (!requireWho) || !!who;
              const receipt = {
                ok: okWho ? 1 : 0,
                ts_ms: nowMs(),
                kind: "datanet.publish.enc",
                v: 1,
                who: who || "",
                id,
                plain_sha256,
                cipher_sha256,
                bytes: cipherAll.length,
                alg: "aes-256-gcm",
                reason: okWho ? "" : "missing_who"
              };
              appendJsonlSafe(receiptsFile, receipt);
            }
          } catch (voidDatanetPublishEncryptPreloadCatchError) { void voidDatanetPublishEncryptPreloadCatchError; /* VOID_DATANET_PUBLISH_ENCRYPT_PRELOAD_EMPTY_CATCH_VISIBILITY_V1 */ }

          // optional receipts hook (same semantics as mvp): requireWho gate
          const requireWho = (process.env.DATANET_RECEIPTS_REQUIRE_WHO || "").trim() === "1";
          if (requireWho && !who) {
            // still allow publish, but mark receipt ok=0 (caller can decide policy)
          }

          return res.json({
            ok: true,
            id,
            who,
            name,
            mime,
            plain_sha256,
            cipher_sha256,
            cipher_bytes: cipherAll.length,
            key_b64: b64(keyBuf),
            nonce_b64: b64(nonceBuf),
            tag_bytes: tagBuf.length,
            dataDir: dataDir
          });
        } catch (e) {
          return res.status(500).json({ ok:false, err:"internal", detail: (e && e.message) ? e.message : String(e) });
        }
      });

      app.get("/datanet/v1/fetch.enc/:id", (req, res) => {
        try {
          const id = String(req && req.params && req.params.id ? req.params.id : "").trim();
          if (!id) return res.status(400).json({ ok:false, err:"bad_request", detail:"missing id" });

          const chunkPath = path.join(cdir, id + ".bin");
          const manifestPath = path.join(mdir, id + ".json");
          if (!fs.existsSync(chunkPath) || !fs.existsSync(manifestPath)) {
            return res.status(404).json({ ok:false, err:"not_found", id });
          }

          const cipherAll = fs.readFileSync(chunkPath);
          const m = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
          const cipher_sha256_server = sha256Hex(cipherAll);
          const verify_ok = !!(m && m.cipher_sha256 && m.cipher_sha256 === cipher_sha256_server);

          return res.json({
            ok: true,
            id,
            verify_ok,
            cipher_sha256_server,
            cipher_b64: b64(cipherAll)
          });
        } catch (e) {
          return res.status(500).json({ ok:false, err:"internal", detail: (e && e.message) ? e.message : String(e) });
        }
      });

      try { console.error("[datanet.publish.enc.preload.v1] mounted: POST /datanet/v1/publish.enc ; GET /datanet/v1/fetch.enc/:id"); } catch (voidDatanetPublishEncryptPreloadCatchError) { void voidDatanetPublishEncryptPreloadCatchError; /* VOID_DATANET_PUBLISH_ENCRYPT_PRELOAD_EMPTY_CATCH_VISIBILITY_V1 */ }
      return true;
    } catch {
      return false;
    }
  }

  (function boot() {
    const started = nowMs();
    const maxMs = 15000;
    const t = setInterval(() => {
      const app = G.__void_http_app;
      if (tryMount(app)) { clearInterval(t); return; }
      if (nowMs() - started > maxMs) {
        clearInterval(t);
        try { console.error("[datanet.publish.enc.preload.v1] gave up waiting for app hook"); } catch (voidDatanetPublishEncryptPreloadCatchError) { void voidDatanetPublishEncryptPreloadCatchError; /* VOID_DATANET_PUBLISH_ENCRYPT_PRELOAD_EMPTY_CATCH_VISIBILITY_V1 */ }
      }
    }, 200);
  })();
})();

/* __VOID_DATANET_NONENC_RECEIPTS_V1__ BEGIN */
try {
  const fs = require("fs");
  const path = require("path");

  function __void_now_ms(){ return Date.now(); }
  function __void_safe_json(x){ try { return JSON.stringify(x); } catch { return ""; } }

  // append one JSONL line safely (mkdir -p)
  function __void_append_jsonl(filePath, obj){
    try {
      const dir = path.dirname(filePath);
      fs.mkdirSync(dir, { recursive: true });
      fs.appendFileSync(filePath, __void_safe_json(obj) + "\n", { encoding: "utf8" });
      return true;
    } catch (e) {
      try { console.error("[datanet.nonenc.receipts.v1] append fail:", e && (e.stack||e.message||e)); } catch (voidDatanetPublishEncryptPreloadCatchError) { void voidDatanetPublishEncryptPreloadCatchError; /* VOID_DATANET_PUBLISH_ENCRYPT_PRELOAD_EMPTY_CATCH_VISIBILITY_V1 */ }
      return false;
    }
  }

  // this preload already has getApp/mountOnce style helpers in other blocks;
  // do a tolerant "get express app" pattern used across your diag preloads.
  function __void_get_app(){
    const G = globalThis;
    const a = G.__void_http_app || G.__void_app || G.__app;
    return a;
  }

  function __void_install(){
    const app = __void_get_app();
    if (!app || typeof app.use !== "function") return false;
    const G = globalThis;
    if (G.__void_datanet_nonenc_receipts_v1_installed) return true;
    G.__void_datanet_nonenc_receipts_v1_installed = true;

    // discover receipts file from env if you later add it; default to data_a path.
    const defaultFile = (process.env.VOID_DATANET_RECEIPTS_FILE || (process.env.HOME ? (process.env.HOME + "/dev/void-node/data_a/datanet/receipts/datanet.jsonl") : ""));
    const RECEIPTS_FILE = defaultFile;

    app.use((req, res, next) => {
      try {
        const url = (req && req.originalUrl) ? String(req.originalUrl) : "";
        // only these endpoints
        if (!(url.startsWith("/datanet/v1/publish") || url.startsWith("/datanet/v1/fetch"))) return next();
        // never touch metrics
        if (url.includes("/metrics/")) return next();

        // avoid double logging
        let done = false;
                // __VOID_NONENC_WHO_FROM_BODY_V1__
        // who: query wins; otherwise try JSON body (for clients that send {"who":...})
        const who_q = (req && req.query && req.query.who) ? String(req.query.who) : "";
        let who_b = "";
        try { if (req && req.body && typeof req.body === "object" && req.body.who) who_b = String(req.body.who); } catch (voidDatanetPublishEncryptPreloadCatchError) { void voidDatanetPublishEncryptPreloadCatchError; /* VOID_DATANET_PUBLISH_ENCRYPT_PRELOAD_EMPTY_CATCH_VISIBILITY_V1 */ }
        const who = who_q || who_b || "";

        const method = (req && req.method) ? String(req.method) : "";
        const t0 = __void_now_ms();

        // __VOID_NONENC_BYTES_SENT_HOOK_V1__
        // Track response bytes sent (works for json + binary)
        try {
          if (res && !res.__void_bytes_sent_hooked) {
            res.__void_bytes_sent_hooked = 1;
            res.__void_bytes_sent = 0;

            const _w = res.write && res.write.bind(res);
            const _e = res.end && res.end.bind(res);

            if (_w) {
              res.write = function(chunk, enc, cb){
                try {
                  if (chunk) {
                    if (typeof chunk === "string") res.__void_bytes_sent += Buffer.byteLength(chunk, enc || "utf8");
                    else if (typeof Buffer !== "undefined" && Buffer.isBuffer && Buffer.isBuffer(chunk)) res.__void_bytes_sent += chunk.length;
                    else if (chunk && chunk.byteLength != null) res.__void_bytes_sent += chunk.byteLength;
                  }
                } catch (voidDatanetPublishEncryptPreloadCatchError) { void voidDatanetPublishEncryptPreloadCatchError; /* VOID_DATANET_PUBLISH_ENCRYPT_PRELOAD_EMPTY_CATCH_VISIBILITY_V1 */ }
                return _w(chunk, enc, cb);
              };
            }

            if (_e) {
              res.end = function(chunk, enc, cb){
                try {
                  if (chunk) {
                    if (typeof chunk === "string") res.__void_bytes_sent += Buffer.byteLength(chunk, enc || "utf8");
                    else if (typeof Buffer !== "undefined" && Buffer.isBuffer && Buffer.isBuffer(chunk)) res.__void_bytes_sent += chunk.length;
                    else if (chunk && chunk.byteLength != null) res.__void_bytes_sent += chunk.byteLength;
                  }
                } catch (voidDatanetPublishEncryptPreloadCatchError) { void voidDatanetPublishEncryptPreloadCatchError; /* VOID_DATANET_PUBLISH_ENCRYPT_PRELOAD_EMPTY_CATCH_VISIBILITY_V1 */ }
                return _e(chunk, enc, cb);
              };
            }
          }
        } catch (voidDatanetPublishEncryptPreloadCatchError) { void voidDatanetPublishEncryptPreloadCatchError; /* VOID_DATANET_PUBLISH_ENCRYPT_PRELOAD_EMPTY_CATCH_VISIBILITY_V1 */ }
        const _json = res.json && res.json.bind(res);
        const _send = res.send && res.send.bind(res);

        function logFromPayload(payload){
          if (done) return;
          done = true;

          // parse payload if needed (handles Buffer/Uint8Array)
          let j = null;
          try {
            if (typeof payload === "string") {
              j = JSON.parse(payload);
            } else if (payload && typeof Buffer !== "undefined" && Buffer.isBuffer && Buffer.isBuffer(payload)) {
              j = JSON.parse(payload.toString("utf8"));
            } else if (payload && typeof Uint8Array !== "undefined" && payload instanceof Uint8Array) {
              j = JSON.parse(Buffer.from(payload).toString("utf8"));
            } else if (payload && typeof payload === "object") {
              j = payload;
            }
          } catch (voidDatanetPublishEncryptPreloadCatchError) { void voidDatanetPublishEncryptPreloadCatchError; /* VOID_DATANET_PUBLISH_ENCRYPT_PRELOAD_EMPTY_CATCH_VISIBILITY_V1 */ }

          const ok = j && (j.ok === true || j.ok === 1);
          const id = j && (j.id ? String(j.id) : "");
          if (!ok || !id) return;

          // __VOID_NONENC_BYTES_FROM_PAYLOAD_V3__
          // bytes should reflect payload size (logger runs before res writes)
          let payloadBytes = 0;
          try {
            if (typeof payload === "string") {
              payloadBytes = Buffer.byteLength(payload, "utf8");
            } else if (payload && typeof Buffer !== "undefined" && Buffer.isBuffer && Buffer.isBuffer(payload)) {
              payloadBytes = payload.length;
            } else if (payload && typeof Uint8Array !== "undefined" && payload instanceof Uint8Array) {
              payloadBytes = payload.byteLength;
            } else if (payload && typeof payload === "object") {
              payloadBytes = Buffer.byteLength(JSON.stringify(payload), "utf8");
            }
          } catch (voidDatanetPublishEncryptPreloadCatchError) { void voidDatanetPublishEncryptPreloadCatchError; /* VOID_DATANET_PUBLISH_ENCRYPT_PRELOAD_EMPTY_CATCH_VISIBILITY_V1 */ }


          const ms = Math.max(0, __void_now_ms() - t0);
          const line = {
            ts_ms: __void_now_ms(),
            ts: Math.floor(__void_now_ms()/1000),
            ok: 1,
            who: who || "unknown",
            op: url.startsWith("/datanet/v1/publish") ? "datanet_mvp_publish" : "datanet_mvp_fetch",
            id,
            bytes: payloadBytes,
            wc: 1,
            status: (res && typeof res.statusCode === "number") ? res.statusCode : 200,
            ms,
            method,
            url,
            reason2: ""
          };

          if (RECEIPTS_FILE) __void_append_jsonl(RECEIPTS_FILE, line);
        }

        if (_json) {
          res.json = (body) => { try { logFromPayload(body); } catch (voidDatanetPublishEncryptPreloadCatchError) { void voidDatanetPublishEncryptPreloadCatchError; /* VOID_DATANET_PUBLISH_ENCRYPT_PRELOAD_EMPTY_CATCH_VISIBILITY_V1 */ } return _json(body); };
        }
        if (_send) {
          res.send = (body) => { try { logFromPayload(body); } catch (voidDatanetPublishEncryptPreloadCatchError) { void voidDatanetPublishEncryptPreloadCatchError; /* VOID_DATANET_PUBLISH_ENCRYPT_PRELOAD_EMPTY_CATCH_VISIBILITY_V1 */ } return _send(body); };
        }
      } catch (voidDatanetPublishEncryptPreloadCatchError) { void voidDatanetPublishEncryptPreloadCatchError; /* VOID_DATANET_PUBLISH_ENCRYPT_PRELOAD_EMPTY_CATCH_VISIBILITY_V1 */ }
      return next();
    });

    try { console.error("[datanet.nonenc.receipts.v1] mounted: receipt logging for /datanet/v1/publish + /datanet/v1/fetch*"); } catch (voidDatanetPublishEncryptPreloadCatchError) { void voidDatanetPublishEncryptPreloadCatchError; /* VOID_DATANET_PUBLISH_ENCRYPT_PRELOAD_EMPTY_CATCH_VISIBILITY_V1 */ }
    return true;
  }

  // attempt immediate install; also retry once shortly (boot order races)
  if (!__void_install()) {
    setTimeout(() => { try { __void_install(); } catch (voidDatanetPublishEncryptPreloadCatchError) { void voidDatanetPublishEncryptPreloadCatchError; /* VOID_DATANET_PUBLISH_ENCRYPT_PRELOAD_EMPTY_CATCH_VISIBILITY_V1 */ } }, 250);
    setTimeout(() => { try { __void_install(); } catch (voidDatanetPublishEncryptPreloadCatchError) { void voidDatanetPublishEncryptPreloadCatchError; /* VOID_DATANET_PUBLISH_ENCRYPT_PRELOAD_EMPTY_CATCH_VISIBILITY_V1 */ } }, 1500);
  }
} catch (e) {
  try { console.error("[datanet.nonenc.receipts.v1] fatal:", e && (e.stack||e.message||e)); } catch (voidDatanetPublishEncryptPreloadCatchError) { void voidDatanetPublishEncryptPreloadCatchError; /* VOID_DATANET_PUBLISH_ENCRYPT_PRELOAD_EMPTY_CATCH_VISIBILITY_V1 */ }
}
/* __VOID_DATANET_NONENC_RECEIPTS_V1__ END */
