/* seals_head_truthfix_v1.js
   Appends HEAD-truth gauges to /metrics/void/seals without changing src/index.ts.
   It does NOT change existing metrics; it only adds:
     - void_seal_head_number
     - void_seal_head_ts_ms
*/
(function(){
  if (globalThis.__void_seals_head_truthfix_v1) return;
  globalThis.__void_seals_head_truthfix_v1 = true;

  const fs = require("fs");
  const path = require("path");
  const http = require("http");

  function nowMs(){ return Date.now(); }

  function tryReadJson(p){
    try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
  }

  function resolveDataDir(){
    // Prefer explicit DATA_DIR; fall back to common defaults.
    const cwd = process.cwd();
    const home = process.env.HOME || "";
    const dd = process.env.DATA_DIR || "data_a";
    const cands = [
      path.join(cwd, dd),
      path.join(cwd, "data_a"),
      path.join(cwd, "data_b"),
      home ? path.join(home, "dev/void-node", dd) : "",
      home ? path.join(home, "dev/void-node", "data_a") : "",
      home ? path.join(home, "dev/void-node", "data_b") : "",
    ].filter(Boolean);
    for (const d of cands){
      try {
        if (fs.existsSync(path.join(d, "heads.json"))) return d;
      } catch (__void_diag_pack5_err) { __voidSrcDiagPack5Visible("VOID_SRC_DIAG_HEAD_SHIM_RESIDUAL_PACK5_SEALS_HEAD_TRUTHFIX_V1_CJS_1_1_VISIBLE", __void_diag_pack5_err); }
    }
    return cands[0] || cwd;
  }

  function readHeadFromHeadsJson(){
    const dir = resolveDataDir();
    const p = path.join(dir, "heads.json");
    const j = tryReadJson(p);
    if (!j || typeof j !== "object") return -1;

    // heads.json has varied shapes across your history; be defensive.
    // Try common locations: {head}, {heads:{...}}, {shards:{...}}, {0:{head}} etc.
    const nums = [];

    function pushNum(x){
      if (typeof x === "number" && isFinite(x)) nums.push(x);
      if (typeof x === "string" && x.trim() && !isNaN(Number(x))) nums.push(Number(x));
    }

    // direct
    pushNum(j.head);
    pushNum(j.number);
    pushNum(j.last);
    pushNum(j.latest);

    // nested objects: scan shallow + one level deeper
    for (const k of Object.keys(j)){
      const v = j[k];
      if (v && typeof v === "object"){
        pushNum(v.head);
        pushNum(v.number);
        pushNum(v.last);
        pushNum(v.latest);
        // if it's a map, scan its values one level
        for (const kk of Object.keys(v)){
          const vv = v[kk];
          if (vv && typeof vv === "object"){
            pushNum(vv.head);
            pushNum(vv.number);
            pushNum(vv.last);
            pushNum(vv.latest);
          }
        }
      }
    }

    if (!nums.length) return -1;
    return Math.max(...nums);
  }

  function shouldPatch(req){
    try {
      const u = req && req.url ? String(req.url) : "";
      return u === "/metrics/void/seals" || u.startsWith("/metrics/void/seals?");
    } catch { return false; }
  }

  const origEnd = http.ServerResponse.prototype.end;

  http.ServerResponse.prototype.end = function(chunk, encoding, cb){
    try {
      const req = this.req;
      if (!shouldPatch(req)) return origEnd.call(this, chunk, encoding, cb);

      // Buffer body (metrics are small). Handle string/buffer/undefined.
      let body = "";
      if (chunk == null) body = "";
      else if (Buffer.isBuffer(chunk)) body = chunk.toString("utf8");
      else body = String(chunk);

      const head = readHeadFromHeadsJson();
      const ts = nowMs();

      const extra =
        "\n" +
        "# HELP void_seal_head_number Current head (from heads.json) appended by seals_head_truthfix_v1\n" +
        "# TYPE void_seal_head_number gauge\n" +
        "void_seal_head_number " + head + "\n" +
        "# HELP void_seal_head_ts_ms Timestamp (ms) when void_seal_head_number was sampled\n" +
        "# TYPE void_seal_head_ts_ms gauge\n" +
        "void_seal_head_ts_ms " + ts + "\n";

      const out = body + extra;
      return origEnd.call(this, out, "utf8", cb);
    } catch {
      return origEnd.call(this, chunk, encoding, cb);
    }
  };

  try { console.error("[seals_head_truthfix_v1] installed: appends void_seal_head_* to /metrics/void/seals"); } catch (__void_diag_pack5_err) { __voidSrcDiagPack5Visible("VOID_SRC_DIAG_HEAD_SHIM_RESIDUAL_PACK5_SEALS_HEAD_TRUTHFIX_V1_CJS_8_2_VISIBLE", __void_diag_pack5_err); }
})();
