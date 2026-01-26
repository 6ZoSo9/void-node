/* preload_gate_bundle_afterapp_v3.cjs (v3l)
   Goals:
   - load AFTER app exists (global gate key)
   - singleton per pid via fs-lock file
   - skip tsx wrapper pid
   - on timeout: STOP polling, DO NOT load
*/
const fs = require("fs");

function log(msg) {
  try { console.error(msg); } catch {}
}

(function main() {
  const pid = process.pid;

  // hard singleton in-process
  const G = globalThis;
  if (G.__void_afterapp_gate_v3l) return;
  G.__void_afterapp_gate_v3l = true;

  // skip the tsx wrapper process (preflight/loader pid)
  try {
    const argv = process.argv || [];
    const s = argv.join(" ");
    const isTsxWrapper =
      s.includes("tsx/dist/preflight.cjs") ||
      s.includes("tsx/dist/loader.mjs") ||
      s.includes("node_modules/.bin/tsx");
    if (isTsxWrapper) {
      log(`[after-app-gate:v3l] skip (tsx wrapper pid=${pid})`);
      return;
    }
  } catch {}

  // fs-lock singleton per pid (stale lockfiles are harmless; your prune script can clean them)
  const lock = `/tmp/void-afterapp-gate.v3l.${pid}.lock`;
  try {
    const fd = fs.openSync(lock, "wx");
    fs.closeSync(fd);
  } catch (e) {
    // already running for this pid
    log(`[after-app-gate:v3l] skip (lock exists pid=${pid})`);
    return;
  }

  // config
  const gateKey = process.env.VOID_APP_GATE_KEY || "__void_http_app";
  const waitMsEnv = Number(process.env.VOID_APP_WAIT_MS || "60000") || 60000;
  const waitMsFile = process.env.VOID_APP_WAIT_MS_FILE || "";
  const requiresFile = process.env.VOID_AFTER_APP_REQUIRES_FILE || "";

  function readWaitMs() {
    if (!waitMsFile) return waitMsEnv;
    try {
      const t = fs.readFileSync(waitMsFile, "utf8").trim();
      const n = Number(t);
      if (Number.isFinite(n) && n > 0) return n;
    } catch {}
    return waitMsEnv;
  }

  function readRequiresList() {
    const list = [];
    if (!requiresFile) return list;
    try {
      const raw = fs.readFileSync(requiresFile, "utf8");
      raw.split(/\r?\n/).forEach((line) => {
        const s = (line || "").trim();
        if (!s) return;
        if (s.startsWith("#")) return;
        list.push(s);
      });
    } catch (e) {
      log(`[after-app-gate:v3l] WARN cannot read requires file: ${requiresFile}`);
    }
    return list;
  }

  let loaded = false;
  function loadModulesOnce(tag) {
    if (loaded) return;
    loaded = true;

    const reqs = readRequiresList();
    let ok = 0, bad = 0;

    for (const p of reqs) {
      try { require(p); ok++; log(`[after-app-gate:v3l] ok require: ${p}`); }
      catch (e) { bad++; log(`[after-app-gate:v3l] FAIL require: ${p}, ${e && e.message ? e.message : String(e)}`); }
    }

    log(`[after-app-gate:v3l] loaded modules ok=${ok} bad=${bad} pid=${pid} (${tag})`);
  }

  log(`[after-app-gate:v3l] armed pid=${pid}`);

  const start = Date.now();
  const timer = setInterval(() => {
    const dt = Date.now() - start;
    const waitMs = readWaitMs();

    let app = null;
    try { app = (globalThis && globalThis[gateKey]) ? globalThis[gateKey] : null; } catch {}

    if (app) {
      try { loadModulesOnce("app-seen"); } catch (e) { log(`[after-app-gate:v3l] loadModulesOnce error: ${e && e.message ? e.message : String(e)}`); }
      log(`[after-app-gate:v3l] done (stop polling) pid=${pid}`);
      clearInterval(timer);
      return;
    }

    if (dt >= waitMs) {
      // IMPORTANT: do NOT load on timeout
      try { log(`[after-app-gate:v3l] timeout waiting for ${gateKey}; skip load pid=${pid} waitMs=${waitMs}`); } catch {}
      log(`[after-app-gate:v3l] done (stop polling) pid=${pid}`);
      clearInterval(timer);
      return;
    }

    if (dt < 2000) {
      log(`[after-app-gate:v3l] waiting for ${gateKey} (soft) pid=${pid} ...`);
    }
  }, 250);

  // don't keep the process alive for this timer alone
  try { timer.unref && timer.unref(); } catch {}
})();
