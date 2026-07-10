"use strict";

const net = require("net");

function log(...a){ try{ console.error("[force-listen.v3]", ...a); }catch (__void_diag_pack2_err) { __voidSrcDiagPack2Visible("VOID_SRC_DIAG_FORCE_PROPOSER_PACK2_PATCH_FORCE_LISTEN_V3_CJS_1_1_VISIBLE", __void_diag_pack2_err); } }

const PORT = Number(process.env.HTTP_PORT || "4100") || 4100;
const HOSTS = ["127.0.0.1", "0.0.0.0"];

function probe(host, port, ms=150) {
  return new Promise((resolve) => {
    const s = net.connect({host, port});
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      try { s.destroy(); } catch (__void_diag_pack2_err) { __voidSrcDiagPack2Visible("VOID_SRC_DIAG_FORCE_PROPOSER_PACK2_PATCH_FORCE_LISTEN_V3_CJS_1_2_VISIBLE", __void_diag_pack2_err); }
      resolve(ok);
    };
    s.setTimeout(ms, () => finish(false));
    s.on("connect", () => finish(true));
    s.on("error", () => finish(false));
  });
}

async function isListening() {
  for (const h of HOSTS) {
    if (await probe(h, PORT)) return true;
  }
  return false;
}

let done = false;

async function tick() {
  if (done) return;
  try {
    if (await isListening()) {
      done = true;
      log("already listening", {port: PORT});
      return;
    }
  } catch (__void_diag_pack2_err) { __voidSrcDiagPack2Visible("VOID_SRC_DIAG_FORCE_PROPOSER_PACK2_PATCH_FORCE_LISTEN_V3_CJS_1_3_VISIBLE", __void_diag_pack2_err); }

  const G = globalThis;
  const app = G && G.__void_http_app;

  if (!app || typeof app.listen !== "function") {
    return;
  }

  if (app.__void_force_listen_v3_started) return;
  try { app.__void_force_listen_v3_started = true; } catch (__void_diag_pack2_err) { __voidSrcDiagPack2Visible("VOID_SRC_DIAG_FORCE_PROPOSER_PACK2_PATCH_FORCE_LISTEN_V3_CJS_1_4_VISIBLE", __void_diag_pack2_err); }

  // wrap listen for visibility (even if main later calls it)
  try {
    if (!app.__void_listen_wrapped_v3 && typeof app.listen === "function") {
      const orig = app.listen.bind(app);
      app.listen = function(...args) {
        log("app.listen called", {args0: args[0], args1: args[1]});
        return orig(...args);
      };
      app.__void_listen_wrapped_v3 = true;
    }
  } catch (__void_diag_pack2_err) { __voidSrcDiagPack2Visible("VOID_SRC_DIAG_FORCE_PROPOSER_PACK2_PATCH_FORCE_LISTEN_V3_CJS_1_5_VISIBLE", __void_diag_pack2_err); }

  for (const host of HOSTS) {
    try {
      const srv = app.listen(PORT, host, () => log("FORCED listen OK", {host, port: PORT, captured_by: (G && G.__void_http_app__captured_by) || "unknown"}));
      srv.on("error", (e) => log("FORCED listen error", String(e && (e.stack||e.message||e))));
      done = true;
      return;
    } catch (e) {
      log("listen threw", {host, err: String(e && (e.stack||e.message||e))});
    }
  }
}

log("installed pid=" + process.pid, {port: PORT});

const start = Date.now();
const fast = setInterval(() => {
  tick().catch(()=>{});
  if (done) clearInterval(fast);
  if (!done && (Date.now() - start) > 30000) {
    clearInterval(fast);
    const slow = setInterval(() => tick().catch(()=>{}), 5000);
    try { slow.unref(); } catch (__void_diag_pack2_err) { __voidSrcDiagPack2Visible("VOID_SRC_DIAG_FORCE_PROPOSER_PACK2_PATCH_FORCE_LISTEN_V3_CJS_1_6_VISIBLE", __void_diag_pack2_err); }
  }
}, 200);
try { fast.unref(); } catch (__void_diag_pack2_err) { __voidSrcDiagPack2Visible("VOID_SRC_DIAG_FORCE_PROPOSER_PACK2_PATCH_FORCE_LISTEN_V3_CJS_1_7_VISIBLE", __void_diag_pack2_err); }
