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
      try { console.error("[datanet.mvp.publish_fetch.v1] waiting for app hook..."); } catch {}
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

    try { console.error("[datanet.mvp.publish_fetch.v1] mounted: POST /datanet/v1/publish ; GET /datanet/v1/fetch/:id"); } catch {}
    return true;
  } catch (e) {
    try { console.error("[datanet.mvp.publish_fetch.v1] mount threw:", e && e.message ? e.message : String(e)); } catch {}
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
      try { console.error("[datanet.mvp.publish_fetch.v1] gave up waiting for app hook"); } catch {}
    }
  }, 200);
})();
