/* proposer_force_off_v1.cjs
   When VOID_FORCE_PROPOSER_AUTO_OFF=1, force proposer exporter to report disabled.
   This fixes /proposer/auto/status2 + proposer.truth2 (which parse v3b prom).
*/
const http = require("http");
if (globalThis.__void_proposer_force_off_v1) process.exit(0);
globalThis.__void_proposer_force_off_v1 = true;

const SHOULD = () => {
  const v = process.env.VOID_FORCE_PROPOSER_AUTO_OFF;
  return v === "1" || v === "true" || v === "yes";
};

function patchPromBody(s) {
  if (!SHOULD()) return s;
  // Force OFF for both v1 and v2 metrics if present.
  s = s.replace(/^void_proposer_auto_enabled\s+[0-9.]+/m, "void_proposer_auto_enabled 0");
  s = s.replace(/^void_proposer_auto_ms\s+[-0-9A-Za-z.+]+/m, "void_proposer_auto_ms 0");
  s = s.replace(/^void_proposer_auto_enabled_v2\s+[0-9.]+/m, "void_proposer_auto_enabled_v2 0");
  s = s.replace(/^void_proposer_auto_ms_v2\s+[-0-9A-Za-z.+]+/m, "void_proposer_auto_ms_v2 0");
  return s;
}

const _create = http.createServer;
http.createServer = function patchedCreateServer(...args) {
  const srv = _create.apply(this, args);
  srv.on("request", (req, res) => {
    try {
      const u = req && req.url ? String(req.url) : "";
      // Patch only the exporter endpoints we care about.
      if (!u.includes("/metrics/void/proposer.v3b.prom") && !u.includes("/metrics/void/proposer.v3.prom")) return;

      const _end = res.end;
      res.end = function patchedEnd(chunk, encoding, cb) {
        try {
          if (chunk && (typeof chunk === "string" || Buffer.isBuffer(chunk))) {
            const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), encoding || "utf8");
            const s = buf.toString("utf8");
            const out = patchPromBody(s);
            if (out !== s) {
              const b2 = Buffer.from(out, "utf8");
              try { res.setHeader("content-length", String(b2.length)); } catch (__void_diag_pack2_err) { __voidSrcDiagPack2Visible("VOID_SRC_DIAG_FORCE_PROPOSER_PACK2_PROPOSER_FORCE_OFF_V1_CJS_1_1_VISIBLE", __void_diag_pack2_err); }
              return _end.call(this, b2, "utf8", cb);
            }
          }
        } catch (__void_diag_pack2_err) { __voidSrcDiagPack2Visible("VOID_SRC_DIAG_FORCE_PROPOSER_PACK2_PROPOSER_FORCE_OFF_V1_CJS_1_2_VISIBLE", __void_diag_pack2_err); }
        return _end.call(this, chunk, encoding, cb);
      };
    } catch (__void_diag_pack2_err) { __voidSrcDiagPack2Visible("VOID_SRC_DIAG_FORCE_PROPOSER_PACK2_PROPOSER_FORCE_OFF_V1_CJS_1_3_VISIBLE", __void_diag_pack2_err); }
  });
  return srv;
};
