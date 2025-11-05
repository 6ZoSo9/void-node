const TICK = 200;
let installed = false;

async function loadSegStore(): Promise<any|null> {
  try { return await import('../chain/seg_store.ts'); } catch(_) {}
  try { return await import('../chain/seg_store.js'); } catch(_) {}
  return null;
}

async function install(){
  if (installed) return; installed = true;
  const mod = await loadSegStore();
  if (!mod) return setTimeout(install, TICK);

  const Orig:any = (mod as any).SegStore || (mod as any).default;
  if (!Orig || (Orig as any).__void_ctor_wrapped) return;

  const Wrapped:any = new Proxy(Orig, {
    construct(target, args, newTarget){
      const inst = Reflect.construct(target, args, newTarget);
      try {
        if (!(globalThis as any).__void_store) {
          (globalThis as any).__void_store = inst;

          // Collect callable keys
          const keys = new Set<string>();
          const push = (o:any) => {
            for (const n of Object.getOwnPropertyNames(o)) {
              try { if (typeof (inst as any)[n] === 'function') keys.add(n); } catch {}
            }
          };
          let p:any = inst;
          while (p && p !== Object.prototype) { push(p); p = Object.getPrototypeOf(p); }
          push(inst);

          (globalThis as any).__void_save_keys = {
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
  (Wrapped as any).__void_ctor_wrapped = true;

  try { (mod as any).SegStore = Wrapped; } catch {}
  try { (mod as any).default = Wrapped; } catch {}
}

install();
