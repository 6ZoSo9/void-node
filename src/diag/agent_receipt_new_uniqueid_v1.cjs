/* agent_receipt_new_uniqueid_v1.cjs
   Fix: /agent/v0/receipt/new returning constant id="new".
   Strategy: wrap res.json/res.send for POST /agent/v0/receipt/new and replace id if it equals "new".
   NOTE: does NOT enforce who. This only fixes the broken id generator behavior safely.
*/
const crypto = require("crypto");

function genId() {
  // 16 bytes hex = 32 chars; stable + URL-safe
  return crypto.randomBytes(16).toString("hex");
}

function getApp() {
  return globalThis && globalThis.__void_http_app;
}

function mountOnce() {
  const app = getApp();
  if (!app || app.__void_agent_receipt_new_uniqueid_v1) return false;
  app.__void_agent_receipt_new_uniqueid_v1 = true;

  app.use((req, res, next) => {
    try {
      // Express may set req.originalUrl; fall back to req.url
      const url = (req.originalUrl || req.url || "");
      if (req.method !== "POST") return next();
      if (!url.startsWith("/agent/v0/receipt/new")) return next();

      const patchedId = genId();

      const patchObj = (obj) => {
        if (!obj || typeof obj !== "object") return obj;
        if (obj.id === "new") {
          // clone shallow to avoid mutating shared object
          const out = Object.assign({}, obj);
          out.id = patchedId;
          return out;
        }
        return obj;
      };

      const _json = res.json.bind(res);
      res.json = (obj) => _json(patchObj(obj));

      const _send = res.send.bind(res);
      res.send = (body) => {
        try {
          if (typeof body === "string" && body.includes('"id":"new"')) {
            // best-effort safe rewrite for string JSON
            body = body.replace(/"id"\s*:\s*"new"/g, `"id":"${patchedId}"`);
          } else if (Buffer.isBuffer(body)) {
            const s = body.toString("utf8");
            if (s.includes('"id":"new"')) {
              const s2 = s.replace(/"id"\s*:\s*"new"/g, `"id":"${patchedId}"`);
              body = Buffer.from(s2, "utf8");
            }
          }
        } catch (__void_diag_pack3_err) { __voidSrcDiagPack3Visible("VOID_SRC_DIAG_DATANET_RECEIPT_PACK3_AGENT_RECEIPT_NEW_UNIQUEID_V1_CJS_1_1_VISIBLE", __void_diag_pack3_err); }
        return _send(body);
      };
    } catch (__void_diag_pack3_err) { __voidSrcDiagPack3Visible("VOID_SRC_DIAG_DATANET_RECEIPT_PACK3_AGENT_RECEIPT_NEW_UNIQUEID_V1_CJS_1_2_VISIBLE", __void_diag_pack3_err); }
    return next();
  });

  try { console.error("[agent_receipt_new_uniqueid_v1] mounted"); } catch (__void_diag_pack3_err) { __voidSrcDiagPack3Visible("VOID_SRC_DIAG_DATANET_RECEIPT_PACK3_AGENT_RECEIPT_NEW_UNIQUEID_V1_CJS_1_3_VISIBLE", __void_diag_pack3_err); }
  return true;
}

(function boot() {
  // mount ASAP after app is created (your global hook is right after `const app = express();`)
  for (let i = 0; i < 200; i++) {
    if (mountOnce()) return;
    // tight loop is fine here; this runs at process start only
  }
  // fallback: async poll
  let tries = 0;
  const t = setInterval(() => {
    tries++;
    if (mountOnce() || tries > 2000) clearInterval(t);
  }, 5);
})();
