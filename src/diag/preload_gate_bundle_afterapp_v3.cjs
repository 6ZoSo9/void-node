/* afterapp_skip_tsx_wrapper_v1
   Reason: systemd launches a tsx *wrapper* PID (node ... node_modules/.bin/tsx ...)
   that never creates express app, causing noisy after-app-gate timeouts.
   We skip ONLY that wrapper process.
*/
try {
  const argv = (process && process.argv) ? process.argv.join(" ") : "";
  if (argv.includes("node_modules/.bin/tsx")) {
    try { console.error("[after-app-gate:v3] skip (tsx wrapper pid)"); } catch {}
    module.exports = module.exports || {};
    return;
  }
} catch {}

/* preload_gate_bundle_afterapp_v3.cjs
   Goal: require modules only AFTER express app hook exists (globalThis.__void_http_app).
   v3+: self-proving, supports requires list file, supports waitMs file.
*/
(function(){
  const fs = require("fs");

  const KEY = process.env.VOID_APP_GATE_KEY || "__void_http_app";

  const waitFile = process.env.VOID_APP_WAIT_MS_FILE || process.env.VOID_AFTERAPP_WAIT_MS_FILE || "";
  function readWaitMsFile(p){
    try{
      const s = String(fs.readFileSync(p, "utf8") || "").trim();
      const n = parseInt(s, 10);
      if (Number.isFinite(n) && n >= 0) return n;
    }catch{}
    return null;
  }

  const envWait = parseInt(process.env.VOID_APP_WAIT_MS || "", 10);
  let waitMs = (Number.isFinite(envWait) && envWait >= 0) ? envWait : 12000;
  if (!Number.isFinite(envWait) && waitFile) {
    const f = readWaitMsFile(waitFile);
    if (typeof f === "number") waitMs = f;
  }

  const reqFile =
    process.env.VOID_AFTER_APP_REQUIRES_FILE ||
    process.env.VOID_AFTERAPP_REQUIRES_FILE ||
    "";

  const listEnv = (process.env.VOID_AFTER_APP_REQUIRES || "")
    .split(",")
    .map(s => (s || "").trim())
    .filter(Boolean);

  function readListFile(p){
    try{
      const raw = String(fs.readFileSync(p, "utf8") || "");
      return raw
        .split(/\r?\n/g)
        .map(s => (s || "").trim())
        .filter(Boolean)
        .map(s => s.replace(/[,]+$/g, "").trim())
        .filter(Boolean);
    }catch{
      return [];
    }
  }

  const list = (reqFile ? readListFile(reqFile) : []).concat(listEnv);

  function log(msg){ try{ console.error(msg); }catch{} }
  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

  function writeLoaded(){
    try{
      const p = `/tmp/void-afterapp.gate.loaded.${process.pid}`;
      fs.appendFileSync(p, `afterapp_gate_v3 loaded ts_ms=${Date.now()} pid=${process.pid}\n`);
    }catch{}
  }

  async function main(){
    writeLoaded();

    const t0 = Date.now();
    while (!globalThis[KEY]) {
      const dt = Date.now() - t0;
      if (dt >= waitMs) break;
      await sleep(50);
    }

    const p = `/tmp/void-afterapp.gate.loaded.${process.pid}`;
    try{
      fs.appendFileSync(p, `timeout key=${KEY} waitMs=${waitMs}\n`);
    }catch{}

    if (!globalThis[KEY]) {
      log(`[after-app-gate:v3] timeout waiting for ${KEY} (waitMs=${waitMs}); not loading after-app modules`);
      return;
    }

    try{
      fs.appendFileSync(p, `saw key=${KEY} list_len=${list.length}\n`);
      if (reqFile) fs.appendFileSync(p, `requires_file=${reqFile}\n`);
      if (waitFile) fs.appendFileSync(p, `waitms_file=${waitFile}\n`);
    }catch{}

    for (const m of list) {
      try {
        require(m);
        try{ fs.appendFileSync(p, `ok ${m}\n`); }catch{}
        log(`[after-app-gate:v3] ok require: ${m}`);
      } catch (e) {
        const msg = (e && e.message) ? e.message : String(e);
        try{ fs.appendFileSync(p, `ERR ${m} :: ${msg}\n`); }catch{}
        log(`[after-app-gate:v3][ERR] require failed: ${m} :: ${msg}`);
      }
    }
  }

  main().catch(e => log(`[after-app-gate:v3][FATAL] ${(e&&e.stack)||String(e)}`));
})();
