// --- segstore_instance_capture (additive, idempotent) ---
(function SegStoreInstanceCapture(){
  const TICK = 300;
  const CANDIDATES = ['saveBlock','persistBlock','appendBlock','writeBlock','save','putBlock','saveBlockV2'];

  async function importSegStore(){
    // Try TS first (tsx runtime), then JS fallback
    try { return await import('../chain/seg_store.ts'); } catch(_e){}
    try { return await import('../chain/seg_store.js'); } catch(_e){}
    return null;
  }

  async function mount(){
    if ((globalThis).__void_segstore_instance_capture_mounted) return;
    (globalThis).__void_segstore_instance_capture_mounted = true;

    // Ensure module is actually loadable
    let mod = await importSegStore();
    if (!mod || !(mod.SegStore || mod.default)) { setTimeout(mount, TICK); return; }
    const SegStore = mod.SegStore || mod.default;

    // If an instance already captured, done
    if (globalThis.__void_store) return;

    const proto = SegStore && SegStore.prototype;
    if (!proto) { setTimeout(mount, TICK); return; }

    const key = CANDIDATES.find(k => typeof proto[k] === 'function');
    if (!key) { setTimeout(mount, TICK); return; }

    const orig = proto[key];
    if (orig && !orig.__void_capture_wrapped) {
      proto[key] = function wrappedSaveBlock(...args){
        try {
          if (!globalThis.__void_store) {
            const inst = this;
            globalThis.__void_store = inst;

            // gather callable keys (introspection)
            try {
              const keys = new Set();
              let p = inst;
              while (p && p !== Object.prototype){
                for (const n of Object.getOwnPropertyNames(p)){
                  try { if (typeof inst[n] === 'function') keys.add(n); } catch(_e){}
                }
                p = Object.getPrototypeOf(p);
              }
              const list = Array.from(keys).sort();
              globalThis.__void_save_keys = {
                storeKeys: list,
                candidates: CANDIDATES.filter(k=>list.includes(k)),
              };
              console.error('[segstore.instance_capture] store captured via', key, 'candidates=', JSON.stringify(globalThis.__void_save_keys.candidates||[]));
            } catch(_e) {}
          }
        } catch(_e) {}
        return orig.apply(this, args);
      };
      proto[key].__void_capture_wrapped = true;
    }

    // Make a tiny inspector if app exists
    try {
      const app = (globalThis.__void_http_app || globalThis.app || null);
      if (app && typeof app.get === 'function' && !(app).__void_segstore_instance_dump){
        (app).__void_segstore_instance_dump = true;
        app.get('/__void/txroot-wrap/ctor', (_q,res)=>{
          const k = (globalThis.__void_save_keys||{});
          res.json({ hasStore: !!globalThis.__void_store, keys: k.storeKeys||[], candidates: k.candidates||[] });
        });
      }
    } catch(_e) {}
  }
  mount();
})();

// --- segstore_instance_capture v3 (additive, idempotent) ---
(function SegStoreInstanceCaptureV3(){
  const TICK = 300;

  async function importSegStore(){
    try { return await import('../chain/seg_store.ts'); } catch(_e){}
    try { return await import('../chain/seg_store.js'); } catch(_e){}
    return null;
  }

  async function mount(){
    if ((globalThis).__void_segstore_instance_capture_v3) return;
    (globalThis).__void_segstore_instance_capture_v3 = true;

    const mod = await importSegStore();
    if (!mod) return setTimeout(mount, TICK);

    const SegStore = (mod).SegStore || (mod).default;
    if (!SegStore || !SegStore.prototype) return setTimeout(mount, TICK);

    const method = (globalThis).__void_pick || 'saveBlock'; // overridden via __void_pick later if needed
    const key = (typeof SegStore.prototype[method] === 'function') ? method : null;

    if (!key) { 
      console.error('[segstore.instance_capture.v3] method not found yet, will retry');
      return setTimeout(mount, TICK);
    }

    const proto = SegStore.prototype;
    if ((proto[key] && proto[key].__void_capwrapped)) return;

    const orig = proto[key];
    proto[key] = function wrapped(...args){
      try{
        if (!(globalThis).__void_store) {
          (globalThis).__void_store = this;

          // collect callable keys for inspector
          const names = [];
          try {
            const seen = new Set();
            let p = this;
            while(p && p!==Object.prototype){
              for (const n of Object.getOwnPropertyNames(p)){
                if(seen.has(n)) continue; seen.add(n);
                try{ if(typeof this[n] === 'function') names.push(n); }catch{}
              }
              p = Object.getPrototypeOf(p);
            }
          } catch {}
          (globalThis).__void_save_keys = { storeKeys: names.sort() };
          console.error('[segstore.instance_capture.v3] captured via', key);
        }
      }catch{}
      return orig.apply(this, args);
    };
    proto[key].__void_capwrapped = true;
    console.error('[segstore.instance_capture.v3] installed wrapper on', key);
  }
  mount();
})();
