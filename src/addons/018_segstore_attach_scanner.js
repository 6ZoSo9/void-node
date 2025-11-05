// additive: keep hunting for a real SegStore instance and latch it
(function SegstoreAttachScanner(){
  const TICK = 500;
  function isStore(s){
    return !!s && typeof s === 'object' &&
      (typeof s.saveBlock === 'function' || typeof s.loadHeadNumber === 'function') &&
      (typeof s.segBase === 'function' || typeof s.segPaths === 'function' || s.segBase || s.segPaths);
  }
  function tryCandidates(){
    const g = globalThis;
    const a = g.__void_http_app || g.app;
    const cands = [
      g.__void_store, g.store,
      g.node?.store, a?.locals?.store,
      a?.locals?.node?.store, a?.store,
    ];
    for (const c of cands){
      if (isStore(c)){ g.__void_store = c; return c; }
    }
    return null;
  }
  function tick(){
    if (tryCandidates()) { try { console.error('[segstore.attach] captured via scanner'); } catch{}; return; }
    setTimeout(tick, TICK);
  }
  tick();
})();
