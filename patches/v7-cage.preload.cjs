(() => {
  const G = globalThis;
  // Kill switches so all “forensics/observer/tramp” families bail immediately:
  G.__void_trampoline_v5_inspector = true;
  G.__void_trampoline_v6_inspector = true;
  G.__void_tramp_v7 = true;
  G.__void_forensics_v7_routes = true;
  G.__void_txroot_forensics_v7_http = true;
  G.__void_forensics_route_mounted = true;
  G.VOID_V7_KILLSWITCH = 1; G.VOID_V7_DISABLE = 1;
  G.DISABLE_V7_FORensics = 1; G.DISABLE_TXROOT_FORENSICS = 1; G.DISABLE_TXROOT_OBSERVER = 1;

  // Seal hot methods as non-configurable value props to block trampolines.
  const HOT = ["saveBlock","persistBlock","_saveBlock","append","save"];
  function passthrough(fn){ return typeof fn==="function" ? function(...a){ return fn.apply(this,a) } : function(){ throw new Error("Vector7 blocked"); }; }
  function seal(obj){
    if (!obj) return;
    for (const k of HOT) {
      try {
        const d = Object.getOwnPropertyDescriptor(obj,k);
        const f = d && ("value" in d ? d.value : obj[k]);
        Object.defineProperty(obj, k, { value: passthrough(f), writable:false, configurable:false, enumerable:false });
      } catch {}
    }
    try { Object.seal(obj) } catch {}
  }
  function trySealProto(){ const S = G.SegStore; if (!S?.prototype) return false; seal(S.prototype); return true; }
  function trySealInst(){
    const store = G.__void_node?.store || G.__void_store || G.app?.locals?.node?.store;
    if (!store) return false; seal(store); return true;
  }
  (function loopP(){ if (!trySealProto()) setTimeout(loopP, 50) })();
  (function loopI(){ trySealInst(); setTimeout(loopI, 150) })();
})();
