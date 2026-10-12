function recordDiagEmptyHandlerVisibilityFailure_src_diag_fs_autoclose_guard_v1_ts(scope: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  console.warn("VOID_DIAG_EMPTY_CATCH_VISIBILITY_PACK_V1_FAILURE_VISIBLE", {
    file: "src/diag/fs_autoclose_guard_v1.ts",
    scope,
    message,
  });
}

// [extracted:fs_autoclose_guard_v1]
// Extracted from src/index.ts to reduce blob size. Runtime behavior should be identical.

// -------------------- FS AUTOCLOSE GUARD (v1, additive) ----------------------
(function FsAutoCloseGuardV1(){
  try {
    if ((globalThis as any).__void_fs_guard_v1) return;
    (globalThis as any).__void_fs_guard_v1 = true;

    const fs = require('node:fs');
    const fsp = require('node:fs/promises');

    // Wrap fs.promises.open to ensure explicit .close() or log on GC
    const origOpen = fsp.open;
    const __FR = (globalThis as any).FinalizationRegistry;
    const reg = (__FR ? new __FR((info:any)=>{
      try {
        console.error("[fs-guard] GC closed FileHandle (missing .close) at", info?.stack || info);
      } catch (err) { recordDiagEmptyHandlerVisibilityFailure_src_diag_fs_autoclose_guard_v1_ts("empty-handler-1", err); }
    }) : { register(){} });


    fsp.open = async function(...args:any[]){
      const err = new Error();
      // limit stack noise
      const stack = (err.stack||"").split("\n").slice(2,8).join("\n");
      const fh = await origOpen.apply(this, args);
      let closed = false;
      const oclose = fh.close.bind(fh);
      fh.close = async (...cargs:any[]) => { try { closed = true; } catch (err) { recordDiagEmptyHandlerVisibilityFailure_src_diag_fs_autoclose_guard_v1_ts("empty-handler-2", err); }; return oclose(...cargs); };
      reg.register(fh, { stack }, fh);
      // safety: auto-close on process exit hooks (best-effort)
      process.on('beforeExit', ()=>{ if (!closed) try{ oclose(); }catch (err) { recordDiagEmptyHandlerVisibilityFailure_src_diag_fs_autoclose_guard_v1_ts("empty-handler-3", err); } });
      return fh;
    };

    // Wrap createRead/WriteStream: auto .destroy() if nobody consumes
    function wrapStreamFactory(name:string){
      const orig = (fs as any)[name];
      (fs as any)[name] = function(...args:any[]){
        const s = orig.apply(this, args);
        // If no consumer attaches within a tick, drain/destroy to free FD
        const t = setImmediate(()=>{
          const hasListener = s.listenerCount('data') + s.listenerCount('readable') + s.listenerCount('pipe') > 0;
          if (!hasListener && !s.destroyed){
            try { s.resume && s.resume(); } catch (err) { recordDiagEmptyHandlerVisibilityFailure_src_diag_fs_autoclose_guard_v1_ts("empty-handler-4", err); }
            try { s.destroy && s.destroy(); } catch (err) { recordDiagEmptyHandlerVisibilityFailure_src_diag_fs_autoclose_guard_v1_ts("empty-handler-5", err); }
          }
        });
        s.once('close', ()=>{ try{ clearImmediate(t); }catch (err) { recordDiagEmptyHandlerVisibilityFailure_src_diag_fs_autoclose_guard_v1_ts("empty-handler-6", err); } });
        return s;
      };
    }
    wrapStreamFactory('createReadStream');
    wrapStreamFactory('createWriteStream');

    console.error("[fs-autoclose] installed");
  } catch(e) { try{ console.error("[fs-autoclose] failed", e); }catch (err) { recordDiagEmptyHandlerVisibilityFailure_src_diag_fs_autoclose_guard_v1_ts("empty-handler-7", err); } }
})();

// -------------------- HTTP AUTODRAIN (client sockets, v1) --------------------
(function HttpAutoDrainV1(){
  try{
    if ((globalThis as any).__void_http_autodrain_v1) return;
    (globalThis as any).__void_http_autodrain_v1 = true;

    const http  = require('node:http');
    const https = require('node:https');

    function tuneAgent(agent:any){
      try{
        if (!agent) return;
        agent.keepAlive = true;
        if (agent.maxSockets && agent.maxSockets < 64) agent.maxSockets = 64;
        (agent as any).freeSocketTimeout = 2000;
        (agent as any).maxFreeSockets = 32;
      }catch (err) { recordDiagEmptyHandlerVisibilityFailure_src_diag_fs_autoclose_guard_v1_ts("empty-handler-8", err); }
    }
    tuneAgent((http as any).globalAgent);
    tuneAgent((https as any).globalAgent);

    function wrapRequest(mod:any){
      const orig = mod.request;
      mod.request = function(...args:any[]){
        const req = orig.apply(this, args);
        req.on('response', (res:any)=>{
          const t = setImmediate(()=>{
            if (res.destroyed) return;
            const hasConsumer = res.listenerCount('data')>0 || res.listenerCount('readable')>0;
            if (!hasConsumer){ res.on('error', ()=>{}); try{ res.resume(); }catch (err) { recordDiagEmptyHandlerVisibilityFailure_src_diag_fs_autoclose_guard_v1_ts("empty-handler-9", err); } }
          });
          res.once('close', ()=>{ try{ clearImmediate(t); }catch (err) { recordDiagEmptyHandlerVisibilityFailure_src_diag_fs_autoclose_guard_v1_ts("empty-handler-10", err); } });
        });
        return req;
      };
    }
    wrapRequest(http);
    wrapRequest(https);

    console.error("[http-autodrain] installed");
  }catch(e){ try{ console.error("[http-autodrain] failed", e); }catch (err) { recordDiagEmptyHandlerVisibilityFailure_src_diag_fs_autoclose_guard_v1_ts("empty-handler-11", err); } }
})();

