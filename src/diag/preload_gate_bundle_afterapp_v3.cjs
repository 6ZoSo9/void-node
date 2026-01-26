/* preload_gate_bundle_afterapp_v3.cjs (v3j fs-lock singleton)
   Fix: we still saw double "armed" in v3i => two loop instances in same pid.
   Solution: OS-level lockfile per PID using O_EXCL to guarantee singleton even across realms.
*/
const fs = require("fs");
const G = globalThis;
const P = process;
const pid = P.pid;
const argv = (P.argv || []).join(" ");

function log(msg){ try{ console.error(msg); } catch {} }
function readText(p){ try{ return fs.readFileSync(p, "utf8"); } catch { return ""; } }

function isTsxWrapper(){
  return /tsx\/dist\/preflight\.cjs|tsx\/dist\/loader\.mjs/.test(argv);
}
if (isTsxWrapper()) {
  log(`[after-app-gate:v3j] skip (tsx wrapper pid=${pid})`);
  return;
}

// fs lock => singleton per pid
const lock = `/tmp/void-afterapp-gate.v3j.${pid}.lock`;
try {
  const fd = fs.openSync(lock, "wx"); // O_EXCL
  fs.closeSync(fd);
} catch {
  // already running in this pid (or no perms) => do nothing
  return;
}

function readWaitMs(){
  const raw = readText(__dirname + "/afterapp_waitms.txt").trim();
  const n = parseInt(raw, 10);
  if (Number.isFinite(n) && n > 0 && n <= 120000) return n;
  return 15000;
}

function parseList(raw){
  raw = (raw || "").replace(/\r/g, "");
  let lines = raw.split("\n").map(s => s.trim()).filter(Boolean).filter(s => !s.startsWith("#"));
  if (lines.length === 1) {
    const one = lines[0];
    const hits = (one.match(/\/home\//g) || []).length;
    if (hits >= 2) lines = one.split(/(?=\/home\/)/g).map(s => s.trim()).filter(Boolean);
  }
  const out = [];
  for (let s of lines) {
    s = s.replace(/["'\s]+$/g, "");
    s = s.replace(/,+$/g, "");
    s = s.trim();
    if (s) out.push(s);
  }
  return out;
}

function getApp(){
  try { return G.__void_http_app || G.__void_http_app2 || G.__void_http_app_ref || null; }
  catch { return null; }
}

let loaded = false;
function loadModulesOnce(tag){
  if (loaded) return;
  loaded = true;
  try {
    const listPath = __dirname + "/afterapp_requires.list";
    const mods = parseList(readText(listPath));
    let ok = 0, bad = 0;
    for (const p of mods) {
      try { require(p); ok++; log(`[after-app-gate:v3j] ok require: ${p}`); }
      catch (e) { bad++; log(`[after-app-gate:v3j] FAIL require: ${p}, ${e && e.message ? e.message : String(e)}`); }
    }
    log(`[after-app-gate:v3j] loaded modules ok=${ok} bad=${bad} pid=${pid} (${tag})`);
  } catch (e) {
    log(`[after-app-gate:v3j] loadModulesOnce error: ${e && e.message ? e.message : String(e)}`);
  }
}

const waitMs = readWaitMs();
const start = Date.now();
log(`[after-app-gate:v3j] armed pid=${pid}`);

(function loop(){
  try {
    const app = getApp();
    if (app) { loadModulesOnce("app-seen"); log(`[after-app-gate:v3j] done (stop polling) pid=${pid}`); return; }
    const dt = Date.now() - start;
    if (dt >= waitMs) { loadModulesOnce("timeout-noapp"); log(`[after-app-gate:v3j] done (stop polling) pid=${pid}`); return; }
    if (dt < 2000) log(`[after-app-gate:v3j] waiting for __void_http_app (soft) pid=${pid} ...`);
    setTimeout(loop, 2000);
  } catch {
    loadModulesOnce("exception-fallback");
    log(`[after-app-gate:v3j] done (stop polling) pid=${pid}`);
  }
})();
