/* txroot3_liveprom_intercept_v1.cjs
   Intercept GET /health/txroot3/live.prom and respond with legacy series:
     - void_txroot3_seen_ok
     - void_txroot3_age_seconds
   This runs BEFORE Express sees the request, so it works even if the existing handler bypasses res.write/end monkeypatches.
*/
const http = require("http");
const G = globalThis;
if (G.__void_txroot3_liveprom_intercept_v1) return;
G.__void_txroot3_liveprom_intercept_v1 = true;

function safeStr(b){
  try { return Buffer.isBuffer(b) ? b.toString("utf8") : String(b||""); } catch { return ""; }
}
function pickGauge(body, name){
  try{
    const re = new RegExp("^" + name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&") + "\\s+([-+]?[0-9]*\\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\\s*$","m");
    const m = String(body||"").match(re);
    if (!m) return null;
    const v = Number(m[1]);
    return Number.isFinite(v) ? v : null;
  } catch { return null; }
}

const origEmit = http.Server && http.Server.prototype && http.Server.prototype.emit;
if (typeof origEmit !== "function") return;

http.Server.prototype.emit = function(ev, req, res){
  try{
    if (ev === "request" && req && res) {
      const url = String(req.url || "");
      const path = url.split("?")[0];
      if (req.method === "GET" && (path === "/health/txroot3/live.prom")) {

        const done = (seen, ageS) => {
          try{
            const body =
`# HELP void_txroot_health TxRoot health (1 healthy, 0 not)
# TYPE void_txroot_health gauge
void_txroot_health ${seen}

# HELP void_txroot3_seen_ok Legacy txroot3 seen_ok (compat)
# TYPE void_txroot3_seen_ok gauge
void_txroot3_seen_ok ${seen}

# HELP void_txroot3_age_seconds Legacy txroot3 age_seconds (compat)
# TYPE void_txroot3_age_seconds gauge
void_txroot3_age_seconds ${ageS}
`;
            res.statusCode = 200;
            res.setHeader("Content-Type","text/plain; version=0.0.4; charset=utf-8");
            res.setHeader("Cache-Control","no-store");
            res.end(body);
          } catch {
            try { res.statusCode = 200; res.end(""); } catch (__void_diag_pack5_err) { __voidSrcDiagPack5Visible("VOID_SRC_DIAG_HEAD_SHIM_RESIDUAL_PACK5_TXROOT3_LIVEPROM_INTERCEPT_V1_CJS_1_1_VISIBLE", __void_diag_pack5_err); }
          }
        };

        // derive from ready.details.prom (best source)
        let seen = 0;
        let ageS = 0;

        try{
          const r = http.request({
            hostname: "127.0.0.1",
            port: 4100,
            path: "/__void/ready.details.prom",
            method: "GET",
            headers: { "x-void-readybridge": "1" },
          }, (rr) => {
            const chunks = [];
            rr.on("data", (c) => chunks.push(c));
            rr.on("end", () => {
              const body = safeStr(Buffer.concat(chunks));
              const vLive = pickGauge(body, "void_txroot_live");
              if (vLive != null) seen = vLive ? 1 : 0;

              const tsMs = pickGauge(body, "void_ready_exporter_timestamp_ms");
              if (tsMs != null && Number.isFinite(tsMs) && tsMs > 0) {
                ageS = Math.max(0, Date.now() - tsMs) / 1000;
              } else {
                ageS = 0;
              }
              if (!Number.isFinite(ageS) || ageS < 0) ageS = 0;

              done(seen, ageS);
            });
          });
          r.on("error", () => done(0, 0));
          r.end();
        } catch {
          done(0, 0);
        }

        return true; // handled
      }
    }
  } catch (__void_diag_pack5_err) { __voidSrcDiagPack5Visible("VOID_SRC_DIAG_HEAD_SHIM_RESIDUAL_PACK5_TXROOT3_LIVEPROM_INTERCEPT_V1_CJS_1_2_VISIBLE", __void_diag_pack5_err); }
  return origEmit.call(this, ev, req, res);
};
