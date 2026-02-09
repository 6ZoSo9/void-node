// __void_afterapp_once_latch_v1
try {
  const G = globalThis;
  const KEY = "__void_afterapp_once_latch_v1_installed";
  if (G[KEY]) {
    try { console.error("[afterapp.once] already installed; skipping"); } catch {}
    module.exports = module.exports || {};
  } else {
    Object.defineProperty(G, KEY, { value: 1, writable: false, configurable: false });
  }
} catch {}
"use strict";
/*
  NO-OP stub.
  Exists only so afterapp guards and NODE_OPTIONS --require chains never brick the node.
  Safe: does nothing, mounts nothing, no IO.
*/
(function(){
  try {
    const G = globalThis;
    const k = "__void_noop_stub_" + (process && process.argv && process.argv[0] ? "1" : "0");
    if (G[k]) return;
    G[k] = true;
  } catch {}
})();
