// --- segstore scan & capture (additive, safe) ---
(function SegStoreScanAndCapture(){
  const TICK = 400;

  function trySet(inst, how){
    if (inst && typeof inst === 'object' && !globalThis.__void_store) {
      // weak fingerprint for SegStore-ish objects
      const hasSave = typeof inst.saveBlock === 'function';
      const hasMeta  = typeof inst.meta === 'function' || typeof inst.meta === 'object';
      const hasSeg   = typeof inst.segPaths === 'function' || typeof inst.segBase === 'function';
      if (hasSave || (hasMeta && hasSeg)) {
        globalThis.__void_store = inst;
        try { console.error('[segstore.scan_capture] captured via', how); } catch {}
        return true;
      }
    }
    return false;
  }

  function scanOnce(){
    // 1) Things we know might exist
    trySet((globalThis).__void_store, 'global.__void_store(pre)');
    trySet((globalThis).store, 'global.store');
    trySet((globalThis).node?.store, 'global.node.store');
    trySet((globalThis).app?.locals?.store, 'app.locals.store');

    // 2) Any globals with a saveBlock function (best-effort)
    try {
      for (const k of Object.getOwnPropertyNames(globalThis)) {
        if (k.startsWith('__')) continue;
        const v = (globalThis)[k];
        if (trySet(v, `global.${k}`)) return true;
      }
    } catch {}
    return !!(globalThis).__void_store;
  }

  function tick(){
    if (scanOnce()) return;
    setTimeout(tick, TICK);
  }
  tick();

  // Mount a manual poke route and a dump (when app is ready)
  const mount = ()=>{
    const a = (globalThis).__void_http_app || (globalThis).app;
    if (!a || typeof a.get !== 'function') return setTimeout(mount, TICK);

    if (!a.__void_segstore_scan_dump){
      a.__void_segstore_scan_dump = true;
      a.get('/__void/segstore/scan', (_req,res)=>{
        const keys = [];
        try { keys.push(...Object.getOwnPropertyNames(globalThis).filter(k=>!k.startsWith('__'))); } catch {}
        res.json({
          hasStore: !!(globalThis).__void_store,
          candidateKeys: keys.slice(0,200),
        });
      });
      a.post('/__void/segstore/poke', (_req,res)=>{
        const ok = scanOnce();
        res.json({ poked: true, captured: ok });
      });
    }
  };
  mount();
})();
