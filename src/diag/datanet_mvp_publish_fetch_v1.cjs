/* datanet_mvp_publish_fetch_v1.cjs
   Adds missing endpoints expected by ops/bin/datanet-mvp-roundtrip.sh:
     POST /datanet/v1/publish
     GET  /datanet/v1/fetch/:id
   Storage: ${DATA_DIR}/__datanet_mvp_v1/{manifests,chunks}
*/
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const G = globalThis;
if (G.__void_datanet_mvp_publish_fetch_v1) return;
G.__void_datanet_mvp_publish_fetch_v1 = true;

function nowMs() { return Date.now(); }
function sha256Hex(buf) { return crypto.createHash("sha256").update(buf).digest("hex"); }
function b64(buf) { return Buffer.from(buf).toString("base64"); }
function fromB64(s) { return Buffer.from(String(s || ""), "base64"); }
function mkdirp(p) { fs.mkdirSync(p, { recursive: true }); }
function writeFileAtomic(p, data) {
  const tmp = p + ".tmp." + process.pid + "." + nowMs();
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, p);
}

function receiptsFilePath() {
  const f = (process.env.DATANET_RECEIPTS_FILE || "").trim();
  if (f) return f;
  // default under DATA_DIR
  const dd = getDataDir();
  return path.join(dd, "datanet", "receipts", "datanet.jsonl");
}

function appendReceiptLine(rec) {
  try {
    const fp = receiptsFilePath();
    mkdirp(path.dirname(fp));
    fs.appendFileSync(fp, JSON.stringify(rec) + "\n");
    return true;
  } catch (e) {
    try { console.error("[datanet.mvp.publish_fetch.v1] receipt append failed:", e && e.message ? e.message : String(e)); } catch (voidDatanetMvpPublishFetchCatchError) { void voidDatanetMvpPublishFetchCatchError; /* VOID_DATANET_MVP_PUBLISH_FETCH_EMPTY_CATCH_VISIBILITY_V1 */ }
    return false;
  }
}

function getDataDir() {
  const dd = (process.env.DATA_DIR || "").trim();
  if (dd) return dd;
  // fall back to repo-local data_a (dev default)
  return path.join(process.cwd(), "data_a");
}

function getStoreDirs() {
  const base = path.join(getDataDir(), "__datanet_mvp_v1");
  const mdir = path.join(base, "manifests");
  const cdir = path.join(base, "chunks");
  mkdirp(mdir); mkdirp(cdir);
  return { base, mdir, cdir };
}

function tryMount(app) {
  try {
    if (!app || typeof app.post !== "function" || typeof app.get !== "function") {
      if (!G.__void_datanet_mvp_publish_fetch_v1_noapp_once) {
      G.__void_datanet_mvp_publish_fetch_v1_noapp_once = true;
      try { console.error("[datanet.mvp.publish_fetch.v1] waiting for app hook..."); } catch (voidDatanetMvpPublishFetchCatchError) { void voidDatanetMvpPublishFetchCatchError; /* VOID_DATANET_MVP_PUBLISH_FETCH_EMPTY_CATCH_VISIBILITY_V1 */ }
    }
    return false;
    }

    const { mdir, cdir } = getStoreDirs();

    app.post("/datanet/v1/publish", (req, res) => {
      try {
        const body = (req && req.body) ? req.body : null;
        const plaintext_b64 = body && body.plaintext_b64;
        const name = (body && body.name) ? String(body.name) : "mvp.bin";
        const mime = (body && body.mime) ? String(body.mime) : "application/octet-stream";

        if (!plaintext_b64 || typeof plaintext_b64 !== "string") {
          return res.status(400).json({ ok:false, err:"bad_request", detail:"missing plaintext_b64 (base64)" });
        }

        const plain = fromB64(plaintext_b64);
        const plain_sha256 = sha256Hex(plain);

        const key = crypto.randomBytes(32);
        const nonce = crypto.randomBytes(12);

        const enc = crypto.createCipheriv("aes-256-gcm", key, nonce);
        const c1 = enc.update(plain);
        const c2 = enc.final();
        const tag = enc.getAuthTag();
        const cipherAll = Buffer.concat([c1, c2, tag]);

        const cipher_sha256 = sha256Hex(cipherAll);
        const id = cipher_sha256.slice(0, 32); // stable 16-byte hex prefix

        const chunkPath = path.join(cdir, id + ".bin");
        const manifestPath = path.join(mdir, id + ".json");

        // write chunk + manifest (atomic-ish)
        writeFileAtomic(chunkPath, cipherAll);
        const manifest = {
          ok: true,
          v: 1,
          id,
          name,
          mime,
          plain_sha256,
          cipher_sha256,
          cipher_bytes: cipherAll.length,
          ts_ms: nowMs()
        };
        writeFileAtomic(manifestPath, Buffer.from(JSON.stringify(manifest)));


        /*__VOID_DN_MVP_RECEIPT_V1__*/
        const who =
          (body && body.who) ? String(body.who) :
          (req && req.query && (req.query.who || req.query.WHO)) ? String(req.query.who || req.query.WHO) :
          (req && req.headers && (req.headers["x-void-who"] || req.headers["x-VOID-who"] || req.headers["x-void-WHO"])) ? String(req.headers["x-void-who"] || req.headers["x-VOID-who"] || req.headers["x-void-WHO"]) :
          "";
        const requireWho = (process.env.DATANET_RECEIPTS_REQUIRE_WHO || "").trim() === "1";
        const ts_ms = nowMs();
        const baseRec = {
          ts_ms,
          ts: Math.floor(ts_ms / 1000),
          ok: (requireWho && !who) ? 0 : 1,
          who,
          op: "datanet_mvp_publish",
          id,
          bytes: cipherAll.length,
          wc: ((requireWho && !who)) ? 0 : 1
        };
        if ((process.env.DATANET_MVP_NO_LOCAL_RECEIPTS || "").trim() !== "1") appendReceiptLine(baseRec);
        return res.json({
          ok: true,
          id,
          name,
          mime,
          plain_sha256,
          key_b64: b64(key),
          nonce_b64: b64(nonce)
        });
      } catch (e) {
        return res.status(500).json({ ok:false, err:"internal", detail: (e && e.message) ? e.message : String(e) });
      }
    });

    app.get("/datanet/v1/fetch/:id", (req, res) => {
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

    try { console.error("[datanet.mvp.publish_fetch.v1] mounted: POST /datanet/v1/publish ; GET /datanet/v1/fetch/:id"); } catch (voidDatanetMvpPublishFetchCatchError) { void voidDatanetMvpPublishFetchCatchError; /* VOID_DATANET_MVP_PUBLISH_FETCH_EMPTY_CATCH_VISIBILITY_V1 */ }
    return true;
  } catch (e) {
    try { console.error("[datanet.mvp.publish_fetch.v1] mount threw:", e && e.message ? e.message : String(e)); } catch (voidDatanetMvpPublishFetchCatchError) { void voidDatanetMvpPublishFetchCatchError; /* VOID_DATANET_MVP_PUBLISH_FETCH_EMPTY_CATCH_VISIBILITY_V1 */ }
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
      try { console.error("[datanet.mvp.publish_fetch.v1] gave up waiting for app hook"); } catch (voidDatanetMvpPublishFetchCatchError) { void voidDatanetMvpPublishFetchCatchError; /* VOID_DATANET_MVP_PUBLISH_FETCH_EMPTY_CATCH_VISIBILITY_V1 */ }
    }
  }, 200);
})();

// __VOID_RECEIPTS_SAFE_MOUNT_V1__
// Goal: attempt to load receipts modules WITHOUT ever bricking the node.
// - catches require() failures
// - optionally mounts a tiny status endpoint once express app exists
(() => {
  const path = require("path");

  const G = globalThis;
  if (G.__void_receipts_safemount_v1) return;
  G.__void_receipts_safemount_v1 = true;

  const state = {
    ok: true,
    tried: false,
    loaded_real: 0,
    loaded_persist: 0,
    err_real: "",
    err_persist: "",
    file: process.env.DATANET_RECEIPTS_FILE || "",
    require_who: process.env.DATANET_RECEIPTS_REQUIRE_WHO || "",
    ts_ms: Date.now(),
    mounted: 0,
  };

  function oneLineErr(e) {
    try {
      const msg = (e && (e.stack || e.message || String(e))) || "unknown";
      return String(msg).split("\n")[0].slice(0, 400);
    } catch {
      return "unknown";
    }
  }

  // Only attempt if receipts file is configured (keeps behavior explicit)
  if (!state.file) {
    state.ok = true;
    state.tried = false;
  } else {
    state.tried = true;

    const real = path.join(__dirname, "datanet_receipts_real_v1.cjs");
    const persist = path.join(__dirname, "datanet_receipts_persist_v1.cjs");

    try {
      require(real);
      state.loaded_real = 1;
    } catch (e) {
      state.loaded_real = 0;
      state.err_real = oneLineErr(e);
      // DO NOT throw.
      try { console.error("[receipts.safemount.v1] require(real) failed:", state.err_real); } catch (voidDatanetMvpPublishFetchCatchError) { void voidDatanetMvpPublishFetchCatchError; /* VOID_DATANET_MVP_PUBLISH_FETCH_EMPTY_CATCH_VISIBILITY_V1 */ }
    }

    try {
      require(persist);
      state.loaded_persist = 1;
    } catch (e) {
      state.loaded_persist = 0;
      state.err_persist = oneLineErr(e);
      // DO NOT throw.
      try { console.error("[receipts.safemount.v1] require(persist) failed:", state.err_persist); } catch (voidDatanetMvpPublishFetchCatchError) { void voidDatanetMvpPublishFetchCatchError; /* VOID_DATANET_MVP_PUBLISH_FETCH_EMPTY_CATCH_VISIBILITY_V1 */ }
    }
  }

  // Mount a tiny status endpoint once the express app exists.
  // Many of our diags rely on (globalThis as any).__void_http_app set in src/index.ts.
  const WANT_PATH = "/__void/datanet/receipts/safemount.v1/status.json";
  let tries = 0;
  const t = setInterval(() => {
    tries++;
    const app = G.__void_http_app;
    if (app && typeof app.get === "function") {
      try {
        app.get(WANT_PATH, (_req, res) => {
          let stat = null;
          try {
            if (state.file) {
              const fs = require("fs");
              const st = fs.statSync(state.file);
              stat = { size: st.size, mtimeMs: st.mtimeMs };
            }
          } catch (voidDatanetMvpPublishFetchCatchError) { void voidDatanetMvpPublishFetchCatchError; /* VOID_DATANET_MVP_PUBLISH_FETCH_EMPTY_CATCH_VISIBILITY_V1 */ }
          res.json({ ok: true, state, fileStat: stat });
        });
        state.mounted = 1;
        try { console.error("[receipts.safemount.v1] mounted:", WANT_PATH); } catch (voidDatanetMvpPublishFetchCatchError) { void voidDatanetMvpPublishFetchCatchError; /* VOID_DATANET_MVP_PUBLISH_FETCH_EMPTY_CATCH_VISIBILITY_V1 */ }
      } catch (e) {
        state.mounted = 0;
        try { console.error("[receipts.safemount.v1] mount failed:", oneLineErr(e)); } catch (voidDatanetMvpPublishFetchCatchError) { void voidDatanetMvpPublishFetchCatchError; /* VOID_DATANET_MVP_PUBLISH_FETCH_EMPTY_CATCH_VISIBILITY_V1 */ }
      }
      clearInterval(t);
      return;
    }
    if (tries >= 40) { clearInterval(t); }
  }, 250);
})();

