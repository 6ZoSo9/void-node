// Early SegStore constructor capture (side-effect module)
const TICK = 200;
let installed = false;

async function loadSegStore(){
  try { return await import('../chain/seg_store.ts'); } catch(_) {}
  try { return await import('../chain/seg_store.js'); } catch(_) {}
  return null;
}

async function install(){
  if (installed) return; installed = true;
  const mod = await loadSegStore();
  if (!mod) return setTimeout(install, TICK);

  const Orig = (mod.SegStore || mod.default);
  if (!Orig || Orig.__void_ctor_wrapped) return;

  const Wrapped = new Proxy(Orig, {
    construct(target, args, newTarget){
      const inst = Reflect.construct(target, args, newTarget);
      try {
        if (!globalThis.__void_store) {
          globalThis.__void_store = inst;

          // Collect callable names (proto chain + instance)
          const keys = new Set();
          const pushFns = obj => {
            for (const n of Object.getOwnPropertyNames(obj)) {
              try { if (typeof inst[n] === 'function') keys.add(n); } catch {}
            }
          };
          let p = inst;
          while (p && p !== Object.prototype) { pushFns(p); p = Object.getPrototypeOf(p); }
          pushFns(inst);

          globalThis.__void_save_keys = {
            storeKeys: Array.from(keys).sort(),
            candidates: ['saveBlock','persistBlock','appendBlock','writeBlock','save','putBlock','saveBlockV2']
              .filter(k => keys.has(k)),
          };
          console.error('[segstore.ctor_capture] captured SegStore instance');
        }
      } catch {}
      return inst;
    }
  });
  Wrapped.__void_ctor_wrapped = true;

  // Swap both named and default exports in-place
  try { mod.SegStore = Wrapped; } catch {}
  try { mod.default = Wrapped; } catch {}
}
install();
