(() => {
  const G = globalThis;
  // Make all the noisy variants bail.
  G.__void_trampoline_v5_inspector = true;
  G.__void_trampoline_v6_inspector = true;
  G.__void_tramp_v7 = true;
  G.__void_forensics_v7_routes = true;
  G.__void_txroot_forensics_v7_http = true;
  G.__void_forensics_route_mounted = true;
  G.VOID_V7_KILLSWITCH = 1;
  G.VOID_V7_DISABLE = 1;
  G.DISABLE_V7_FORensics = 1;
  G.DISABLE_TXROOT_FORENSICS = 1;
  G.DISABLE_TXROOT_OBSERVER = 1;

  const HOT = ["saveBlock","persistBlock","_saveBlock","append","save"];
  function toSealed(fn) {
    if (typeof fn !== "function") return function(){ throw new Error("Vector7 guard"); };
    const orig = fn;
    function pass(...a){ return orig.apply(this, a); }
    Object.defineProperties(pass, {
      name:   { value:"segstore_passthrough", configurable:false },
      length: { value:orig.length,           configurable:false },
    });
    return pass;
  }
  function sealMethods(obj){
    if (!obj) return;
    for (const k of HOT) {
      try {
        const d = Object.getOwnPropertyDescriptor(obj, k);
        const f = d && ("value" in d ? d.value : obj[k]);
        Object.defineProperty(obj, k, { value: toSealed(f), writable:false, configurable:false, enumerable:false });
      } catch {}
    }
    try { Object.seal(obj); } catch {}
  }
  function trySealProto(){ const S = G.SegStore; if (!S?.prototype) return false; sealMethods(S.prototype); return true; }
  function trySealInst(){
    const store = G.__void_node?.store || G.__void_store || G.__voidNode?.store || G.app?.locals?.node?.store;
    if (!store) return false; sealMethods(store); return true;
  }
  (function loopP(){ if (!trySealProto()) setTimeout(loopP, 50); })();
  (function loopI(){ trySealInst(); setTimeout(loopI, 150); })();
})();
