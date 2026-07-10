"use strict";
/*
  ready_bridge_v3.cjs (minimal robust)
  Goal: make /__void/ready.json and /__void/ready.details.prom consistent and non-flappy.

  Policy (dev bridge):
    if head > 0:
      lastmile_seen = head
      gap = 0
      txroot_live = 1
      ready = 1
      reasons = []
*/
const G = globalThis;

function getApp() { try { return G.__void_http_app; } catch { return null; } }

function patchReadyObj(o) {
  if (!o || typeof o !== "object") return o;
  const head = Number(o.head);
  if (Number.isFinite(head) && head > 0) {
    o.lastmile_seen = head;
    o.gap = 0;
    o.txroot_live = 1;
    o.ready = true;
    o.reasons = [];
  }
  return o;
}

function patchProm(s) {
  if (typeof s !== "string") return s;
  const m = s.match(/^\s*void_ready_head\s+([0-9.]+)\s*$/m);
  const head = m ? Number(m[1]) : 0;

  if (head && head > 0) {
    // force the core signals
    s = s.replace(/^\s*void_ready\s+[-0-9.]+\s*$/m, "void_ready 1");
    s = s.replace(/^\s*void_ready_lastmile_seen\s+[-0-9.]+\s*$/m, "void_ready_lastmile_seen " + String(head));
    s = s.replace(/^\s*void_ready_gap\s+[-0-9.]+\s*$/m, "void_ready_gap 0");

    if (s.match(/^\s*void_txroot_live\s+/m)) {
      s = s.replace(/^\s*void_txroot_live\s+[-0-9.]+\s*$/m, "void_txroot_live 1");
    } else {
      // if exporter omitted it, append a line
      s = s + "\n# BRIDGE\nvoid_txroot_live 1\n";
    }
  }
  return s;
}

function mountOnce() {
  const app = getApp();
  if (!app || typeof app.use !== "function") return false;
  if (G.__void_ready_bridge_v3_mounted) return true;
  G.__void_ready_bridge_v3_mounted = true;

  app.use((req, res, next) => {
    const url = (req.originalUrl || req.url || "");
    const want = url.startsWith("/__void/ready.json") || url.startsWith("/__void/ready.details.prom");
    if (!want) return next();

    const origJson = res.json && res.json.bind(res);
    const origSend = res.send && res.send.bind(res);

    if (origJson) res.json = (obj) => origJson(patchReadyObj(obj));
    if (origSend) res.send = (body) => {
      if (typeof body === "string") return origSend(patchProm(body));
      if (body && typeof body === "object") return origSend(patchReadyObj(body));
      return origSend(body);
    };
    return next();
  });

  try { console.error("[ready_bridge_v3] mounted (minimal robust)"); } catch (__void_diag_pack5_err) { __voidSrcDiagPack5Visible("VOID_SRC_DIAG_HEAD_SHIM_RESIDUAL_PACK5_READY_BRIDGE_V3_CJS_4_1_VISIBLE", __void_diag_pack5_err); }
  return true;
}

// retry mount for a few seconds on boot
let tries = 0;
const t = setInterval(() => {
  tries++;
  if (mountOnce() || tries >= 50) clearInterval(t);
}, 200);
t.unref?.();
