(() => {
  const G = globalThis;

  // Tell the noisy addons "already mounted" so they bail.
  G.__void_trampoline_v6_inspector = true;
  G.__void_tramp_v7 = true;
  G.__void_forensics_v7_routes = true;
  G.__void_txroot_forensics_v7_http = true;
  G.__void_forensics_route_mounted = true;

  const HOT = new Set(["saveBlock","persistBlock","_saveBlock","append","save"]);
  const realDP = Object.defineProperty;

  function toValueDesc(obj, key, desc) {
    let fn = (desc && typeof desc.value === "function") ? desc.value : obj?.[key];
    if (typeof fn !== "function") fn = function(){ throw new Error("Vector7 guard"); };
    return { value: fn, writable: false, configurable: false, enumerable: false };
  }

  // Only intercept defineProperty for SegStore prototype/instances + HOT keys.
  Object.defineProperty(Object, "defineProperty", {
    value(obj, key, desc) {
      try {
        const Seg = G.SegStore;
        const isSegProto = !!Seg && obj === Seg.prototype;
        const isSegInst  = !!Seg && obj && obj.constructor === Seg;
        if ((isSegProto || isSegInst) && HOT.has(String(key))) {
          if (!desc || desc.get || desc.set || !("value" in desc)) {
            return realDP(obj, key, toValueDesc(obj, key, desc));
          }
          return realDP(obj, key, {
            value: (typeof desc.value === "function" ? desc.value : obj[key]),
            writable: false, configurable: false, enumerable: false
          });
        }
      } catch { /* ignore */ }
      return realDP(obj, key, desc);
    },
    writable: false, configurable: false, enumerable: false
  });

  function sealProtoOnce() {
    const Seg = G.SegStore;
    if (!Seg || !Seg.prototype) return false;
    for (const k of HOT) {
      try {
        const cur = Object.getOwnPropertyDescriptor(Seg.prototype, k);
        realDP(Seg.prototype, k, toValueDesc(Seg.prototype, k, cur));
      } catch {}
    }
    try { Object.seal(Seg.prototype); } catch {}
    return true;
  }

  function lockInstOnce() {
    const store = G.__void_node?.store || G.__void_store || G.__voidNode?.store;
    if (!store) return false;
    for (const k of HOT) {
      try {
        const cur = Object.getOwnPropertyDescriptor(store, k);
        realDP(store, k, toValueDesc(store, k, cur));
      } catch {}
    }
    return true;
  }

  (function loopP(){ if (!sealProtoOnce()) setTimeout(loopP, 50); })();
  (function loopI(){ lockInstOnce(); setTimeout(loopI, 150); })();
})();
