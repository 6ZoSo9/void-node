/* selfcall_probe_v1.cjs (refresh v3)
   Goal: NEVER hang; prove self-HTTP and self-TCP are safe.
   Changes: prefer /blocks/latest/number2.json (truth) over /head.txt.
*/
const net = require("net");

function nowMs(){ return Date.now(); }

async function fetchWithCap(url, capMs) {
  const started = nowMs();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(new Error("timeout")), capMs).unref?.() || setTimeout(() => {}, 0);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    const txt = await res.text().catch(() => "");
    return { ok: 1, url, ms: capMs, dt_ms: nowMs()-started, status: res.status, err: null, body_head: txt.slice(0, 160) };
  } catch (e) {
    return { ok: 0, url, ms: capMs, dt_ms: nowMs()-started, status: -1, err: String(e && e.message ? e.message : e) };
  } finally {
    clearTimeout(t);
  }
}

function tcpConnectCap(host, port, capMs) {
  return new Promise((resolve) => {
    const started = nowMs();
    const sock = net.connect({ host, port });
    let done = false;
    const finish = (err) => {
      if (done) return;
      done = true;
      try { sock.destroy(); } catch (__void_diag_pack5_err) { __voidSrcDiagPack5Visible("VOID_SRC_DIAG_HEAD_SHIM_RESIDUAL_PACK5_SELFCALL_PROBE_V1_CJS_1_1_VISIBLE", __void_diag_pack5_err); }
      resolve({ ok: err ? 0 : 1, host, port, ms: capMs, dt_ms: nowMs()-started, err: err ? String(err.message || err) : null });
    };
    const t = setTimeout(() => finish(new Error("tcp_timeout")), capMs);
    t.unref?.();
    sock.once("connect", () => { clearTimeout(t); finish(null); });
    sock.once("error", (e) => { clearTimeout(t); finish(e); });
  });
}

function mount(app){
  if (!app || typeof app.get !== "function") return false;
  const G = globalThis;
  if (G.__void_selfcall_probe_v1_hardcap_v3) return true;
  G.__void_selfcall_probe_v1_hardcap_v3 = true;

  app.get("/__void/dev/selfcall/probe", async (req, res) => {
    const t0 = nowMs();
    const env = {
      VOID_ALLOW_SELFHTTP_4100: process.env.VOID_ALLOW_SELFHTTP_4100 || null,
      VOID_ALLOW_SELFTCP_4100: process.env.VOID_ALLOW_SELFTCP_4100 || null,
      VOID_DENY_SELF_TCP_4100: process.env.VOID_DENY_SELF_TCP_4100 || null,
      VOID_DENY_SELF_TCP_4100_HARD: process.env.VOID_DENY_SELF_TCP_4100_HARD || null,
      VOID_DENY_SELF_HTTP_4100: process.env.VOID_DENY_SELF_HTTP_4100 || null,
      VOID_DISABLE_DENY_SELF_TCP_4100: process.env.VOID_DISABLE_DENY_SELF_TCP_4100 || null,
      VOID_DISABLE_DENY_SELF_HTTP_4100: process.env.VOID_DISABLE_DENY_SELF_HTTP_4100 || null,
    };

    const capHttp = 350;   // per-request cap
    const capTcp  = 250;

    const fetch_health = await fetchWithCap("http://127.0.0.1:4100/health", capHttp);
    const fetch_number2 = await fetchWithCap("http://127.0.0.1:4100/blocks/latest/number2.json", capHttp);

    // optional legacy check; tolerate 404 (it is now gone in your logs)
    const fetch_headtxt = await fetchWithCap("http://127.0.0.1:4100/head.txt", capHttp);

    const tcp_connect = await tcpConnectCap("127.0.0.1", 4100, capTcp);

    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({
      ok: 1,
      pid: process.pid,
      dt_ms: nowMs()-t0,
      env,
      fetch_health,
      fetch_number2,
      fetch_headtxt,
      tcp_connect
    }));
  });

  try { console.error("[selfcall.probe.v1 hardcap-v3] mounted: /__void/dev/selfcall/probe"); } catch (__void_diag_pack5_err) { __voidSrcDiagPack5Visible("VOID_SRC_DIAG_HEAD_SHIM_RESIDUAL_PACK5_SELFCALL_PROBE_V1_CJS_1_2_VISIBLE", __void_diag_pack5_err); }
  return true;
}

try {
  const G = globalThis;
  const app = G.__void_http_app || G.__void_app || null;
  if (app) mount(app);
  else {
    const int = setInterval(() => {
      const a = (globalThis.__void_http_app || globalThis.__void_app || null);
      if (a) { clearInterval(int); mount(a); }
    }, 100);
    int.unref?.();
  }
} catch (__void_diag_pack5_err) { __voidSrcDiagPack5Visible("VOID_SRC_DIAG_HEAD_SHIM_RESIDUAL_PACK5_SELFCALL_PROBE_V1_CJS_1_3_VISIBLE", __void_diag_pack5_err); }
module.exports = { mount };
