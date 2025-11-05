(function SegstoreManualBootstrap(){
  const TICK=400;
  function app(){ return (globalThis).__void_http_app || (globalThis).app; }

  async function loadSegStore(){
    // tsx-friendly dual-path import: try .js first, then .ts
    try { return await import("../chain/seg_store.js"); }
    catch(_e1){
      try { return await import("../chain/seg_store.ts"); }
      catch(e2){ console.error("[segstore.bootstrap] import failed:", e2?.message||e2); return null; }
    }
  }

  function mount(){
    const a = app();
    if (!a || typeof a.post!=='function') return setTimeout(mount, TICK);
    if (a.__void_segstore_manual_bootstrap) return; a.__void_segstore_manual_bootstrap = true;

    a.post('/__void/segstore/bootstrap', async (_req,res)=>{
      try{
        if ((globalThis).__void_store) return res.json({ ok:true, existed:true });
        const mod = await loadSegStore();
        if (!mod || !mod.SegStore) return res.status(500).json({ ok:false, error:"SegStore module not available" });

        const dir = process.env.DATA_DIR || process.env.VOID_DATA_DIR || 'data';
        const store = new mod.SegStore(dir);  // read-only intent; we don't mutate here
        (globalThis).__void_store = store;
        console.error("[segstore.bootstrap] constructed SegStore at", dir);
        return res.json({ ok:true, existed:false, dir });
      }catch(e){
        console.error("[segstore.bootstrap] error:", e?.message||e);
        return res.status(500).json({ ok:false, error:String(e) });
      }
    });
  }
  mount();
})();
