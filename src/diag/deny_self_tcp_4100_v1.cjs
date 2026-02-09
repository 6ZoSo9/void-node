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
