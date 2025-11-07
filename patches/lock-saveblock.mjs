// --- Vector 7 hard guard v2: deny accessors on SegStore save paths & enforce stable value ---

(function hardGuard(){
  const KEYS = new Set(["saveBlock","persistBlock","_saveBlock","append","save"]);
  const G = globalThis;

  // Short-circuit any of your forensics loops that check these flags
  G.__void_trampoline_v6_inspector = true;
  G.__void_tramp_v7 = true;
  G.__void_forensics_v7_routes = true;

  // Record originals
  const _defineProperty = Object.defineProperty.bind(Object);
  const _getOwnPropDesc = Object.getOwnPropertyDescriptor.bind(Object);
  const _seal = Object.seal.bind(Object);

  // Helper: convert any accessor descriptor into a stable value descriptor
  function toValueDesc(target, key, desc) {
    // If they tried to set an accessor, preserve the *current callable* if any
    let fn = (typeof target[key] === "function") ? target[key] : undefined;
    // Try to resolve through existing accessor
    try {
      const cur = _getOwnPropDesc(target, key);
      if (cur && (cur.get || cur.value)) {
        const cand = cur.get ? cur.get.call(target) : cur.value;
        if (typeof cand === "function") fn = cand;
      }
    } catch {}
    // If incoming desc had a value function, allow it (first one wins)
    if (!fn && typeof desc?.value === "function") fn = desc.value;
    if (typeof fn !== "function") {
      // last-ditch: leave as-is but normalized to no-op function to prevent recursion
      fn = function(){ throw new Error("saveBlock disabled by Vector7 guard"); };
    }
    return { value: fn, writable: false, configurable: false, enumerable: false };
  }

  // Gate that forces value descriptors for SegStore proto/instances
  function guardedDefineProperty(obj, key, desc){
    try {
      const name = String(key);
      if (!KEYS.has(name)) return _defineProperty(obj, key, desc);

      // Identify SegStore proto or live instances
      const isSegStoreProto = !!G.SegStore && obj === G.SegStore.prototype;
      const isSegStoreInst  = !!obj && typeof obj === "object" &&
                              (obj.constructor && obj.constructor === G.SegStore);

      if (isSegStoreProto || isSegStoreInst) {
        // If someone tries to install an accessor, normalize to stable value
        if (desc && (desc.get || desc.set || !("value" in desc))) {
          const vd = toValueDesc(obj, name, desc);
          return _defineProperty(obj, key, vd);
        }
        // If they pass a value desc, harden it
        const vd = {
          value: (typeof desc.value === "function" ? desc.value : obj[key]),
          writable: false, configurable: false, enumerable: false
        };
        return _defineProperty(obj, key, vd);
      }
      return _defineProperty(obj, key, desc);
    } catch (e) {
      // Fail closed
      const vd = toValueDesc(obj, key, desc);
      return _defineProperty(obj, key, vd);
    }
  }

  // Install the global hook ASAP
  Object.defineProperty = guardedDefineProperty;

  // Kill legacy accessors too
  try {
    Object.prototype.__defineGetter__ = function(k, fn){
      if (KEYS.has(String(k)) && (this === G.SegStore?.prototype || this?.constructor === G.SegStore)) {
        return guardedDefineProperty(this, k, { value: fn });
      }
      return Reflect.apply(Function.prototype, this, arguments);
    };
    Object.prototype.__defineSetter__ = function(k, fn){
      if (KEYS.has(String(k)) && (this === G.SegStore?.prototype || this?.constructor === G.SegStore)) {
        return guardedDefineProperty(this, k, { value: this[k] });
      }
      return Reflect.apply(Function.prototype, this, arguments);
    };
  } catch {}

  // Wait for SegStore to exist, then enforce stable value + seal proto
  (function waitAndSeal(){
    const T=100;
    const Seg = G.SegStore;
    if (!Seg || !Seg.prototype) return setTimeout(waitAndSeal, T);
    for (const k of KEYS) {
      try {
        const cur = _getOwnPropDesc(Seg.prototype, k);
        const vd  = toValueDesc(Seg.prototype, k, cur || { value: Seg.prototype[k] });
        _defineProperty(Seg.prototype, k, vd);
      } catch {}
    }
    try { _seal(Seg.prototype); } catch {}
  })();

  // Also attempt to harden live instance once the node exports it
  ;(function lockInstance(){
    const T=150;
    const loop = () => {
      try {
        const store = G.__void_node?.store || G.__void_store;
        if (store) {
          for (const k of KEYS) {
            const cur = _getOwnPropDesc(store, k);
            const vd  = toValueDesc(store, k, cur || { value: store[k] });
            _defineProperty(store, k, vd);
          }
        }
      } catch {}
      setTimeout(loop, T);
    };
    loop();
  })();
})();
