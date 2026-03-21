// [extracted:fs_autoclose_guard_v2]
// Extracted from src/index.ts to reduce blob size. Runtime behavior should be identical.

// ================== FS AUTOCLOSE GUARD (v2, ESM-safe, additive) =================
(async function FsAutoCloseGuardV2(){
  try{
    if ((globalThis as any).__void_fs_guard_v2) return;
    (globalThis as any).__void_fs_guard_v2 = true;

    const { createRequire } = await import('node:module');
    const req = createRequire(import.meta.url);
    const fs  = req('node:fs');
    const fsp = req('node:fs/promises');

    const origOpen = fsp.open;

    const FR:any = (globalThis as any).FinalizationRegistry
      ? new (globalThis as any).FinalizationRegistry((info:any)=>{
          try{ console.error("[fs-guard.v2] GC closed FileHandle (missing .close) at\n"+(info?.stack||info)); }catch{}
        })
      : { register(){} };

    fsp.open = async function(...args:any[]){
      const err = new Error();
      const stack = (err.stack||"").split("\n").slice(2,8).join("\n");
      const fh = await origOpen.apply(this, args as any);
      let closed = false;
      const oclose = fh.close.bind(fh);
      fh.close = async (...c:any[]) => { try{ closed = true; }catch{}; return oclose(...c); };
      FR.register(fh, { stack }, fh);
      process.on('beforeExit', ()=>{ if (!closed) { try{ oclose(); }catch{} } });
      return fh;
    };

    // Auto-drain/destroy streams with no consumer
    function wrapStreamFactory(name:string){
      const orig = (fs as any)[name];
      (fs as any)[name] = function(...args:any[]){
        const s = orig.apply(this, args);
        const t = setImmediate(()=>{
          const hasL = s.listenerCount('data') + s.listenerCount('readable') + s.listenerCount('pipe') > 0;
          if (!hasL && !s.destroyed){ try{ s.resume?.(); }catch{} try{ s.destroy?.(); }catch{} }
        });
        s.once('close', ()=>{ try{ clearImmediate(t); }catch{} });
        return s;
      };
    }
    wrapStreamFactory('createReadStream');
    wrapStreamFactory('createWriteStream');

    // Also surface full stacks for any Node warnings
    process.on('warning', (w:any)=>{
      if (String(w?.message||"").includes("Closing file descriptor")) {
        const st = (w && w.stack) ? w.stack : new Error(String(w?.message||"fd")).stack;
        console.error("[fd-gc.v2]", st);
      }
    });

    console.error("[fs-autoclose.v2] installed");
  }catch(e){ try{ console.error("[fs-autoclose.v2] failed", e); }catch{} }
})();

// ================= HTTP AUTODRAIN (client sockets, v2, ESM-safe) ================
(async function HttpAutoDrainV2(){
  try{
    if ((globalThis as any).__void_http_autodrain_v2) return;
    (globalThis as any).__void_http_autodrain_v2 = true;

    const { createRequire } = await import('node:module');
    const req   = createRequire(import.meta.url);
    const http  = req('node:http');   // CommonJS object (mutable)
    const https = req('node:https');

    function tuneAgent(agent:any){
      try{
        if (!agent) return;
        agent.keepAlive = true;
        if (agent.maxSockets && agent.maxSockets < 64) agent.maxSockets = 64;
        (agent as any).freeSocketTimeout = 2000;
        (agent as any).maxFreeSockets   = 32;
      }catch{}
    }
    tuneAgent(http.globalAgent);
    tuneAgent(https.globalAgent);

    function wrapRequest(mod:any){
      const orig = mod.request;
      mod.request = function(...args:any[]){
        const req = orig.apply(this, args);
        req.on('response', (res:any)=>{
          const t = setImmediate(()=>{
            if (res.destroyed) return;
            const consumed = res.listenerCount('data')>0 || res.listenerCount('readable')>0;
            if (!consumed){ res.on('error', ()=>{}); try{ res.resume(); }catch{} }
          });
          res.once('close', ()=>{ try{ clearImmediate(t); }catch{} });
        });
        return req;
      };
    }
    wrapRequest(http);
    wrapRequest(https);

    console.error("[http-autodrain.v2] installed");
  }catch(e){ try{ console.error("[http-autodrain.v2] failed", e); }catch{} }
})();

