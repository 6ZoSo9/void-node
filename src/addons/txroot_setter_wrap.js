export default async function mountSetterWrap(app){
  const S = { enabled:false, reason:'init', tries:0, owner:null, key:null, helper:false };
  app.get('/__void/txroot-wrap/status', (_q,res)=>res.json(S));

  const WANT = process.env.TXROOT_SETTER_REAL === "1";
  if (!WANT){ S.enabled=false; S.reason='disabled'; return; }

  // Load helper
  let computeTxRoot=null;
  try{
    const mod = await import('../util/txroot.ts');
    computeTxRoot = mod.computeTxRoot || mod.txroot || mod.default || null;
    if (typeof computeTxRoot === 'function') S.helper = true;
  }catch(e){ console.error('[txroot-wrap] helper import failed:', e?.message||e); }
  if (typeof computeTxRoot !== 'function'){ S.enabled=false; S.reason='no-helper'; return; }

  const KEYS = ['saveBlock','persistBlock','appendBlock','writeBlock','save','putBlock','saveBlockV2'];
  const TICK_MS=300, MAX_TRIES=400;

  function bindIf(obj){
    if(!obj) return {save:null,key:null};
    let p = obj, seen = new Set();
    while(p && p !== Object.prototype){
      for(const k of KEYS){
        if(Object.prototype.hasOwnProperty.call(p,k) && typeof obj[k]==='function'){
          return { save: obj[k].bind(obj), key:k };
        }
      }
      p = Object.getPrototypeOf(p);
      if(seen.has(p)) break; seen.add(p);
    }
    return {save:null,key:null};
  }

  function pickOwner(){
    const g = globalThis;
    const node  = g.__void_node_core || g.node || null;
    const store = g.__void_store || node?.store || node?.segStore || null;
    let cand = bindIf(store); if (cand.save) return { owner:store, ...cand, ownerType:'store' };
    cand = bindIf(node);      if (cand.save) return { owner:node,  ...cand, ownerType:'node' };
    return { owner:null, save:null, key:null, ownerType:null };
  }

  function install(){
    S.tries++;
    const pick = pickOwner();
    if(!pick.save){
      if(S.tries % 10 === 1) console.error(`[txroot-wrap] waiting for save fn (try ${S.tries})`);
      if(S.tries < MAX_TRIES) return setTimeout(install, TICK_MS);
      S.enabled=false; S.reason='no-save-fn'; return;
    }

    const { owner, save, key, ownerType } = pick;
    if(owner.__txroot_wrap_installed){ S.enabled=true; S.reason='already-installed'; S.owner=ownerType; S.key=owner.__txroot_wrap_key||key; return; }

    const orig = save;
    owner[key] = async function wrappedSaveBlock(block){
      try{
        const txs = (block && (block.txs || block.transactions || block.persistedTxs)) || [];
        const leaves = txs.map(t => (typeof t === 'string' ? t : JSON.stringify(t)));
        const root = computeTxRoot(leaves);
        block.header ||= {};
        block.header.txRoot = root;
        globalThis.__void_txroot_real_last_set = (block.header.number ?? block.number ?? -1);
      }catch(e){ console.error('[txroot-wrap] compute/stamp failed:', e?.message||e); }
      return await orig(block);
    };
    owner.__txroot_wrap_installed = true;
    owner.__txroot_wrap_key = key;

    S.enabled=true; S.reason='installed'; S.owner=ownerType; S.key=key;
    console.error(`[txroot-wrap] installed over ${ownerType}.${key}`);
  }
  install();
}

// Keep the probe so we can introspect quickly
(function TxrootWrapProbe(){
  const TICK=300;
  function listFnsDeep(obj){
    const out = new Set();
    let p = obj;
    while(p && p !== Object.prototype){
      Object.getOwnPropertyNames(p).forEach(k=>{ try{ if(typeof obj[k]==='function') out.add(k); }catch(_e){} });
      p = Object.getPrototypeOf(p);
    }
    return Array.from(out).sort();
  }
  function mount(){
    const app = (globalThis.__void_http_app || globalThis.app || null);
    if (!app || typeof app.get!=='function') return setTimeout(mount, TICK);
    app.get('/__void/txroot-wrap/probe', (_req,res)=>{
      const g=globalThis, node=g.__void_node_core||g.node||{}, store=g.__void_store||node.store||node.segStore||null;
      res.json({ hasNode: !!node, hasStore: !!store, nodeKeys: listFnsDeep(node), storeKeys: listFnsDeep(store) });
    });
  }
  mount();
})();

// --- finder/bridge (additive) ---
(function TxrootWrapFinder(){
  const KEYS = ['saveBlock','persistBlock','appendBlock','writeBlock','save','putBlock','saveBlockV2'];
  const TICK=400;

  function listFnsDeep(obj){
    const out = new Set();
    let p = obj;
    while (p && p !== Object.prototype){
      for (const k of Object.getOwnPropertyNames(p)){
        try{ if (typeof obj[k]==='function') out.add(k); }catch(_e){}
      }
      p = Object.getPrototypeOf(p);
    }
    return Array.from(out).sort();
  }

  function scanOne(path, obj){
    if (!obj || typeof obj!=='object') return null;
    const keys = listFnsDeep(obj);
    const hit = KEYS.find(k=>keys.includes(k));
    return hit ? { path, hit, keys } : null;
  }

  function scanAll(){
    const g = globalThis;
    const roots = [];

    // Likely places first
    roots.push(['g.node', g.node]);
    roots.push(['g.__void_node_core', g.__void_node_core]);
    roots.push(['g.__void_store', g.__void_store]);
    roots.push(['app', g.__void_http_app || g.app || null]);
    const app = (g.__void_http_app || g.app || null);
    roots.push(['app.locals', app && app.locals ? app.locals : null]);

    // Scan any obvious globals (shallow)
    for (const k of Object.getOwnPropertyNames(g)){
      try{
        if (k.startsWith('_') || k.startsWith('process') || k.startsWith('global')) continue;
        const v = g[k];
        if (v && typeof v==='object') roots.push([`g.${k}`, v]);
      }catch(_e){}
    }

    const hits = [];
    for (const [p,o] of roots){
      const h = scanOne(p,o);
      if (h) hits.push(h);
    }
    return hits;
  }

  function bridgeBest(hits){
    const g = globalThis;
    // prefer store-ish objects first
    const best = hits.find(h=>/store|seg|node/i.test(h.path)) || hits[0];
    if (!best) return null;

    // Try to set globals so the wrapper can bind
    try{
      const ref = best.path.split('.').reduce((acc,part)=>{
        if (part==='g') return globalThis;
        if (!acc) return undefined;
        return acc[part];
      }, globalThis);
      if (ref && typeof ref==='object'){
        if (!(g.__void_store)) g.__void_store = ref;
        if (!(g.__void_node_core) && ref.node) g.__void_node_core = ref.node;
        return { chosen: best.path, key: best.hit };
      }
    }catch(_e){}
    return null;
  }

  function mount(){
    const app = (globalThis.__void_http_app || globalThis.app || null);
    if (!app || typeof app.get!=='function') return setTimeout(mount, TICK);

    app.get('/__void/txroot-wrap/find', (_req,res)=>{
      const hits = scanAll();
      const bridged = bridgeBest(hits);
      res.json({ hits, bridged, hasStore: !!globalThis.__void_store, hasNode: !!globalThis.__void_node_core });
    });

    // One background attempt so it self-heals on boot
    try{
      const hits = scanAll();
      const bridged = bridgeBest(hits);
      if (bridged) console.error('[txroot-wrap.find] bridged', bridged);
      else console.error('[txroot-wrap.find] no candidates yet');
    }catch(e){ console.error('[txroot-wrap.find] error', e?.message||e); }
  }
  mount();
})();

// --- segstore prototype tap (additive) ---
(function TxrootWrapSegStoreTap(){
  const TICK=400;
  const CANDIDATES = ['saveBlock','persistBlock','appendBlock','writeBlock','save','putBlock','saveBlockV2'];

  async function tryTap(){
    let SegStore = null;
    try {
      const mod = await import('../chain/seg_store.ts');
      SegStore = mod.SegStore || mod.default || null;
    } catch(e){ /* keep retrying until module resolves */ }

    if (!SegStore || !SegStore.prototype) return setTimeout(tryTap, TICK);

    let wrappedAny = false;
    for (const k of CANDIDATES){
      const fn = SegStore.prototype[k];
      if (typeof fn !== 'function') continue;

      // Don't double-wrap
      if (fn.__void_wrapped) { wrappedAny = true; continue; }

      SegStore.prototype[k] = async function(...args){
        // Expose live instance so the wrapper can see a real owner + key
        const g = globalThis;
        if (!g.__void_store) g.__void_store = this;
        if (!g.__void_save_keys) g.__void_save_keys = { storeKeys: [], candidates: [] };

        // Update visible keys/candidates for the probe routes
        try{
          const keys = new Set();
          let p = Object.getPrototypeOf(this);
          while (p && p !== Object.prototype){
            for (const n of Object.getOwnPropertyNames(p)){
              try{ if (typeof this[n]==='function') keys.add(n); }catch(_e){}
            }
            p = Object.getPrototypeOf(p);
          }
          const list = Array.from(keys).sort();
          g.__void_save_keys.storeKeys = list;
          g.__void_save_keys.candidates = CANDIDATES.filter(x=>list.includes(x));
        }catch(_e){}

        return await fn.apply(this, args);
      };
      SegStore.prototype[k].__void_wrapped = true;
      wrappedAny = true;
      console.error(`[segstore.tap] wrapped SegStore.prototype.${k}`);
    }

    if (!wrappedAny){
      console.error('[segstore.tap] SegStore loaded but no candidate methods found, retrying…');
      return setTimeout(tryTap, TICK);
    }

    // Quick HTTP inspector (idempotent)
    const app = (globalThis.__void_http_app || globalThis.app || null);
    if (app && typeof app.get==='function' && !(app).__void_segstore_tap_route){
      (app).__void_segstore_tap_route = true;
      app.get('/__void/txroot-wrap/tap', (_q,res)=>{
        res.json({
          hasStore: !!globalThis.__void_store,
          keys: (globalThis.__void_save_keys && globalThis.__void_save_keys.storeKeys) || [],
          candidates: (globalThis.__void_save_keys && globalThis.__void_save_keys.candidates) || []
        });
      });
    }
  }

  tryTap();
})();

// --- segstore constructor hook (additive) ---
(function SegStoreCtorHook(){
  const TICK=300;
  const CANDIDATES = ['saveBlock','persistBlock','appendBlock','writeBlock','save','putBlock','saveBlockV2'];

  async function hook(){
    let SegStore = null;
    try {
      const mod = await import('../chain/seg_store.ts');
      SegStore = mod.SegStore || mod.default || null;
    } catch(_e){ /* retry until module resolves */ }

    if (!SegStore) return setTimeout(hook, TICK);

    // Don't double-wrap constructor
    if (SegStore.__void_ctor_wrapped) return;

    const Orig = SegStore;
    function WrappedSegStore(...args){
      const inst = new Orig(...args);

      // Expose this live instance globally
      const g = globalThis;
      g.__void_store = inst;

      // Snapshot method keys for probes
      try{
        const keys = new Set();
        let p = inst;
        while (p && p !== Object.prototype){
          for (const n of Object.getOwnPropertyNames(p)){
            try{ if (typeof inst[n] === 'function') keys.add(n); }catch(_e){}
          }
          p = Object.getPrototypeOf(p);
        }
        const list = Array.from(keys).sort();
        g.__void_save_keys = {
          storeKeys: list,
          candidates: CANDIDATES.filter(k=>list.includes(k)),
        };
        console.error('[segstore.ctor] instance captured; candidates=', JSON.stringify(g.__void_save_keys.candidates||[]));
      }catch(_e){}

      return inst;
    }
    // Preserve prototype chain and static props
    WrappedSegStore.prototype = Orig.prototype;
    Object.setPrototypeOf(WrappedSegStore, Orig);
    // Replace export in module system and mark
    try { (await import('../chain/seg_store.ts')).SegStore = WrappedSegStore; } catch(_e){}
    globalThis.__void_SegStoreWrapped = true;
    SegStore.__void_ctor_wrapped = true;

    // Tiny HTTP dumper (idempotent)
    const app = (globalThis.__void_http_app || globalThis.app || null);
    if (app && typeof app.get === 'function' && !(app).__void_segstore_ctor_dump){
      (app).__void_segstore_ctor_dump = true;
      app.get('/__void/txroot-wrap/ctor', (_q,res)=>{
        const k = (globalThis.__void_save_keys||{});
        res.json({ hasStore: !!globalThis.__void_store, keys: k.storeKeys||[], candidates: k.candidates||[] });
      });
    }
  }
  hook();
})();
