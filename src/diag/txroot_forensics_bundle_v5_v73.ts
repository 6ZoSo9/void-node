// [extracted:txroot_forensics_bundle_v5_v73]
// Extracted from src/index.ts to reduce blob size. Behavior should be identical.
// NOTE: relative imports were rewritten for src/diag/*.

(function txrootForensicsTrampolineV5(){
  const g:any = globalThis as any;
  const S = g.__void_txroot_forensic_state_v5 || (g.__void_txroot_forensic_state_v5 = {
    calls_total: 0,
    last_kind: 'unknown',
    last_shape: 'n/a',
    last_number: -1,
    last_duration_ms: 0,
    bound: false,
    note: ''
  });

  function summarizeFn(fn:any){
    try {
      if (typeof fn !== 'function') return String(fn);
      const src = Function.prototype.toString.call(fn);
      const head = src.slice(0, 120).replace(/\s+/g,' ');
      return (src.includes('[native code]') ? '[native code]' : head);
    } catch { return 'uninspectable'; }
  }

  function forceTrampoline(){
    try {
      const Seg = g.SegStore || null;
      if (!Seg?.prototype) return;

      // If saveBlock is an accessor (sticky wrapper via getter/setter),
      // DO NOT trampoline by assigning Seg.prototype.saveBlock = tramp.
      // That pattern creates wrapper<->tramp recursion (stack overflow).
      try{
        const desc = Object.getOwnPropertyDescriptor(Seg.prototype, "saveBlock");
        const isAccessor = !!(desc && (desc.get || desc.set) && !("value" in desc));
        if (isAccessor) { S.bound = false; S.note = "skip trampoline: saveBlock is accessor (sticky wrapper present)"; return; }
      }catch{}

      // Capture the *current* callable used by callers right now
      const current = Seg.prototype.saveBlock;
      if (typeof current !== 'function') { S.note = 'no saveBlock fn yet'; return; }
      if ((current as any).__void_trampoline_v5) { S.note = 'already trampolined'; return; }

      const orig = current;
      function tramp(this:any, ...args:any[]){
      /* [saveblock.recursion.guard.v1.tramp] */
      const __G:any = globalThis as any;
      __G.__void_sb_tramp_depth = (Number(__G.__void_sb_tramp_depth||0) + 1);
      try {
        if (__G.__void_sb_tramp_depth > 1) {
          // recursion detected: bypass wrapper chain by calling prototype saveBlock
          const self:any = (this as any);
          let base:any = null;
          try {
            const cur = self && self.saveBlock;
            let proto = self && Object.getPrototypeOf(self);
            while (proto && typeof proto.saveBlock === 'function' && proto.saveBlock === cur) {
              proto = Object.getPrototypeOf(proto);
            }
            if (proto && typeof proto.saveBlock === 'function') base = proto.saveBlock.bind(self);
          } catch {}
          if (typeof base === 'function') return base.apply(self, arguments as any);
        }
      } finally {
        __G.__void_sb_tramp_depth = Math.max(0, Number(__G.__void_sb_tramp_depth||1) - 1);
      }
      
        const t0 = Date.now();
        S.calls_total++;
        const a0 = args[0];
        if (Array.isArray(a0)) {
          S.last_kind = 'array';
          S.last_shape = `len=${a0.length}; keys=${Object.keys(a0[0]||{}).slice(0,8).join(',')}`;
          if (a0?.[0]?.number >= 0) S.last_number = a0[0].number;
        } else if (a0 && typeof a0 === 'object') {
          S.last_kind = 'object';
          S.last_shape = `keys=${Object.keys(a0).slice(0,12).join(',')}`;
          if (typeof (a0 as any).number === 'number') S.last_number = (a0 as any).number;
        } else {
          S.last_kind = typeof a0; S.last_shape = 'n/a';
        }
        const out = orig.apply(this, args);
        if (out && typeof out.then === 'function') {
          return (out as Promise<any>).finally(()=>{ S.last_duration_ms = Date.now()-t0; });
        } else { S.last_duration_ms = Date.now()-t0; return out; }
      }
      Object.defineProperty(tramp, '__void_trampoline_v5', { value: true });

      // Replace the method in-place so callers using `instance.saveBlock(...)`
      // now hit `tramp` (ONLY when saveBlock is a normal value property).
      Seg.prototype.saveBlock = tramp as any;
      S.bound = true;
      S.note = 'trampoline installed on SegStore.prototype.saveBlock';
    } catch(e:any){ S.note = 'trampoline error: '+(e?.message||e); }
  }

  function mountInspector(){
    const app:any = g.__void_http_app || g.app;
    if (!app || typeof app.get !== 'function') return;
    if (app.__void_trampoline_v5_inspector) return;
    app.__void_trampoline_v5_inspector = true;

    app.get('/__void/dev/inspect/saveBlock', (_req:any, res:any)=>{
      const Seg = g.SegStore || null;
      const proto = Seg?.prototype;
      const live = proto?.saveBlock;
      res.json({
        ok: true,
        segstore_present: !!Seg,
        tramp_bound: !!g.__void_txroot_forensic_state_v5?.bound,
        note: g.__void_txroot_forensic_state_v5?.note || '',
        proto_has_saveBlock: typeof live === 'function',
        proto_saveBlock_summary: summarizeFn(live),
        counters: {
          calls_total: S.calls_total,
          last_number: S.last_number,
          last_kind: S.last_kind,
          last_shape: S.last_shape,
          last_duration_ms: S.last_duration_ms
        }
      });
    });

    app.get('/__void/metrics/txroot4/forensics.prom.v5', (_req:any, res:any)=>{
      res.type('text/plain; version=0.0.4; charset=utf-8').end([
        '# HELP void_txroot_forensics_calls_total_v5 saveBlock calls observed (trampoline)',
        '# TYPE void_txroot_forensics_calls_total_v5 counter',
        `void_txroot_forensics_calls_total_v5 ${S.calls_total}`,
      ].join('\n')+'\n');
    });
  }

  // Retry until SegStore + app are ready, then stay latched.
  (function tick(){
    mountInspector();
    if (!S.bound && (globalThis as any).SegStore?.prototype) forceTrampoline();
    setTimeout(tick, 300);
  })();
})();
// ===== txroot forensics: property-latch trampoline v6 (additive) =====
(function txrootForensicsTrampolineV6(){
  const g:any = globalThis as any;
  const S = g.__void_txroot_forensic_state_v6 || (g.__void_txroot_forensic_state_v6 = {
    calls_total: 0,
    binds_total: 0,
    last_number: -1,
    last_kind: 'unknown',
    last_shape: 'n/a',
    last_duration_ms: 0,
    note: '',
    latched: false,
  });

  function makeTramp(orig:any){
    function tramp(this:any, ...args:any[]){
      const t0 = Date.now();
      S.calls_total++;
      const a0 = args[0];
      if (Array.isArray(a0)) { S.last_kind = 'array'; S.last_shape = `len=${a0.length}`; if (a0?.[0]?.number>=0) S.last_number=a0[0].number; }
      else if (a0 && typeof a0 === 'object') { S.last_kind = 'object'; S.last_shape = `keys=${Object.keys(a0).slice(0,8).join(',')}`; if (typeof a0.number==='number') S.last_number=a0.number; }
      else { S.last_kind = typeof a0; S.last_shape = 'n/a'; }
      const out = orig.apply(this, args);
      if (out && typeof out.then === 'function') {
        return (out as Promise<any>).finally(()=>{ S.last_duration_ms = Date.now()-t0; });
      } else { S.last_duration_ms = Date.now()-t0; return out; }
    }
    Object.defineProperty(tramp, '__void_trampoline_v6', { value: true });
    return tramp;
  }

  function latchProperty(){
    try{
      const Seg = g.SegStore; if (!Seg || !Seg.prototype) { S.note='no SegStore yet'; return; }
      const proto = Seg.prototype;

      // If we already latched, bail.
      const desc0 = Object.getOwnPropertyDescriptor(proto, 'saveBlock');
      if ((desc0 as any)?.__void_latched_v6) { S.note='already latched'; S.latched=true; return; }

      // Start with whatever is there now (method or accessor)
      let _inner:any;
      if (!desc0 || typeof desc0.value === 'function') {
        _inner = (desc0 && 'value' in desc0) ? desc0.value : proto.saveBlock;
      } else if (desc0 && (desc0.get || desc0.set)) {
        // Try to read current via getter
        try { _inner = desc0.get?.call(proto); } catch { _inner = proto.saveBlock; }
      }

      // Define accessor that wraps any future writes
      Object.defineProperty(proto, 'saveBlock', {
        configurable: true,
        enumerable: false,
        get(){ return _inner; },
        set(fn:any){
          // Every assignment passes through here; wrap if not our tramp
          const target = (fn && fn.__void_trampoline_v6) ? fn : makeTramp(fn);
          _inner = target;
          S.binds_total++;
        },
        __void_latched_v6: true
      } as any);

      // Force current inner to be tramp’d too
      if (_inner && !_inner.__void_trampoline_v6) {
        proto.saveBlock = _inner; // triggers setter -> wraps
      }

      S.latched = true;
      S.note = 'property accessor latched; future overwrites will be trampolined';
    }catch(e:any){ S.note = 'latch error: '+(e?.message||e); }
  }

  function mountInspector(){
    const app:any = (g as any).__void_http_app || (g as any).app;
    if (!app || typeof app.get !== 'function') return;
    if (app.__void_trampoline_v6_inspector) return; app.__void_trampoline_v6_inspector = true;

    app.get('/__void/dev/inspect/saveBlock.v6', (_req:any, res:any)=>{
      const Seg = g.SegStore; const proto = Seg?.prototype;
      const desc = proto && Object.getOwnPropertyDescriptor(proto, 'saveBlock');
      res.json({
        ok: true,
        segstore_present: !!Seg,
        latched: S.latched,
        note: S.note,
        descriptor: desc ? {
          has_get: !!desc.get, has_set: !!desc.set,
          has_value: 'value' in (desc as any),
          writable: !!desc.writable, configurable: !!desc.configurable
        } : null,
        counters: {
          binds_total: S.binds_total,
          calls_total: S.calls_total,
          last_number: S.last_number,
          last_kind: S.last_kind,
          last_shape: S.last_shape,
          last_duration_ms: S.last_duration_ms
        }
      });
    });

    app.get('/__void/metrics/txroot4/forensics.prom.v6', (_req:any, res:any)=>{
      res.type('text/plain; version=0.0.4; charset=utf-8').end([
        '# HELP void_txroot_forensics_binds_total_v6 saveBlock descriptor binds',
        '# TYPE void_txroot_forensics_binds_total_v6 counter',
        `void_txroot_forensics_binds_total_v6 ${S.binds_total}`,
        '# HELP void_txroot_forensics_calls_total_v6 saveBlock calls observed (trampoline-latched)',
        '# TYPE void_txroot_forensics_calls_total_v6 counter',
        `void_txroot_forensics_calls_total_v6 ${S.calls_total}`,
      ].join('\n')+'\n');
    });
  }

  (function tick(){
    latchProperty();
    mountInspector();
    setTimeout(tick, 300);
  })();
})();
// ===== txroot forensics: dual-latch v7 (instance + proto + alternates) =====
(function txrootForensicsTrampolineV7(){
  const g:any = globalThis as any;
  const S = g.__void_txroot_forensic_state_v7 || (g.__void_txroot_forensic_state_v7 = {
    proto_binds: 0, inst_binds: 0, calls: 0,
    last_number: -1, last_kind: 'unknown', last_shape: 'n/a', last_ms: 0,
    note: ''
  });

  function makeTramp(orig:any, tag:string){
    function tramp(this:any, ...args:any[]){
      const t0 = Date.now();
      S.calls++;
      const a0 = args[0];
      if (Array.isArray(a0)) { S.last_kind='array'; S.last_shape=`len=${a0.length}`; if (a0?.[0]?.number>=0) S.last_number=a0[0].number; }
      else if (a0 && typeof a0 === 'object') { S.last_kind='object'; S.last_shape=`keys=${Object.keys(a0).slice(0,8).join(',')}`; if (typeof a0.number==='number') S.last_number=a0.number; }
      else { S.last_kind=typeof a0; S.last_shape='n/a'; }
      const out = orig.apply(this, args);
      if (out && typeof out.then==='function') return (out as Promise<any>).finally(()=>{ S.last_ms = Date.now()-t0; });
      S.last_ms = Date.now()-t0; return out;
    }
    Object.defineProperty(tramp, '__void_trampoline_v7', { value: tag });
    return tramp;
  }

  function wrapMethod(obj:any, key:string, counterKey:'proto_binds'|'inst_binds'){
    try{
      if (!obj) return;
      const desc = Object.getOwnPropertyDescriptor(obj, key);
      // If accessor exists, hijack setter to always wrap; else define one.
      let _inner:any = (desc && 'value' in desc && typeof desc.value==='function') ? desc.value : obj[key];
      const setter = function(fn:any){
        _inner = (fn && fn.__void_trampoline_v7) ? fn : makeTramp(fn, `${counterKey}:${key}`);
        S[counterKey]++; 
      };
      const getter = function(){ return _inner; };

      Object.defineProperty(obj, key, {
        configurable: counterKey==='proto_binds', // instance: lock it; proto: keep flexible
        enumerable: false,
        get: getter,
        set: setter
      });

      if (_inner && !_inner.__void_trampoline_v7) {
        // trigger our setter to wrap the current target
        (obj as any)[key] = _inner;
      }
    }catch(e){}
  }

  function latchProto(){
    const Seg = (g as any).SegStore; if (!Seg || !Seg.prototype) { return; }
    // Latch likely methods on the prototype
    ['saveBlock','persistBlock','_saveBlock','append','save'].forEach(k=>wrapMethod(Seg.prototype, k, 'proto_binds'));
  }

  function latchInstance(){
    const node = (g as any).__void_node;
    const store = node?.store || (g as any).__void_store || node?.SegStore || node?.segStore;
    if (!store) return;
    // Latch directly on the instance and LOCK saveBlock so defineProperty can't shadow it
    wrapMethod(store, 'saveBlock', 'inst_binds');
    try {
      const desc = Object.getOwnPropertyDescriptor(store, 'saveBlock');
      if (desc && !desc.configurable) {
        // already locked
      } else if (desc) {
        Object.defineProperty(store, 'saveBlock', { ...desc, configurable: false });
      }
    } catch {}
    // Also latch alternates on the instance
    ['persistBlock','_saveBlock','append','save'].forEach(k=>wrapMethod(store, k, 'inst_binds'));
  }

  function mountInspector(){
    const app:any = (g as any).__void_http_app || (g as any).app;
    if (!app || typeof app.get!=='function' || app.__void_tramp_v7) return;
    app.__void_tramp_v7 = true;

    app.get('/__void/dev/inspect/saveBlock.v7', (_req:any, res:any)=>{
      const node = (g as any).__void_node;
      const store = node?.store;
      const Seg = (g as any).SegStore;
      const pdesc = Seg?.prototype && Object.getOwnPropertyDescriptor(Seg.prototype, 'saveBlock');
      const idesc = store && Object.getOwnPropertyDescriptor(store, 'saveBlock');
      res.json({
        ok: true,
        store_present: !!store,
        proto_present: !!Seg,
        proto_desc: pdesc ? {has_get:!!pdesc.get, has_set:!!pdesc.set, has_value:'value'in (pdesc as any), configurable:!!pdesc.configurable} : null,
        inst_desc:  idesc ? {has_get:!!idesc.get, has_set:!!idesc.set, has_value:'value'in (idesc as any), configurable:!!idesc.configurable} : null,
        counters: { proto_binds:S.proto_binds, inst_binds:S.inst_binds, calls:S.calls,
                    last_number:S.last_number, last_kind:S.last_kind, last_shape:S.last_shape, last_ms:S.last_ms },
        note: S.note
      });
    });

    app.get('/__void/metrics/txroot4/forensics.prom.v7', (_req:any, res:any)=>{
      res.type('text/plain; version=0.0.4; charset=utf-8').end([
        '# HELP void_txroot_forensics_binds_proto_v7 prototype binds',
        '# TYPE void_txroot_forensics_binds_proto_v7 counter',
        `void_txroot_forensics_binds_proto_v7 ${S.proto_binds}`,
        '# HELP void_txroot_forensics_binds_inst_v7 instance binds',
        '# TYPE void_txroot_forensics_binds_inst_v7 counter',
        `void_txroot_forensics_binds_inst_v7 ${S.inst_binds}`,
        '# HELP void_txroot_forensics_calls_v7 observed calls across all paths',
        '# TYPE void_txroot_forensics_calls_v7 counter',
        `void_txroot_forensics_calls_v7 ${S.calls}`,
      ].join('\n')+'\n');
    });
  }

  (function loop(){
    try{ latchProto(); latchInstance(); mountInspector(); }catch(e){}
    setTimeout(loop, 300);
  })();
})();

// -------------------- txroot/forensics v7 (ESM-safe, additive) --------------------
(function txrootForensicsV7(){
  const TICK_MS = 250;
  const FLAG = Symbol.for("void.txroot.forensics.v7.wrapped");

  // shared counters
  const C = {
    proto_binds: 0,
    inst_binds: 0,
    calls: 0,
    last_number: -1 as number,
    last_kind: "unknown" as string,
    last_shape: "n/a" as string,
    last_ms: 0 as number,
  };

  // helpers
  function getApp(): any {
    return (globalThis as any).__void_http_app || (globalThis as any).app;
  }
  function prom() {
    return [
      "# HELP void_txroot_forensics_binds_proto_v7 prototype binds",
      "# TYPE void_txroot_forensics_binds_proto_v7 counter",
      `void_txroot_forensics_binds_proto_v7 ${C.proto_binds}`,
      "# HELP void_txroot_forensics_binds_inst_v7 instance binds",
      "# TYPE void_txroot_forensics_binds_inst_v7 counter",
      `void_txroot_forensics_binds_inst_v7 ${C.inst_binds}`,
      "# HELP void_txroot_forensics_calls_v7 observed calls across all paths",
      "# TYPE void_txroot_forensics_calls_v7 counter",
      `void_txroot_forensics_calls_v7 ${C.calls}`,
      "# HELP void_txroot_forensics_last_number_v7 last seen block number",
      "# TYPE void_txroot_forensics_last_number_v7 gauge",
      `void_txroot_forensics_last_number_v7 ${C.last_number}`,
      "# HELP void_txroot_forensics_last_ms_v7 last saveBlock duration (ms)",
      "# TYPE void_txroot_forensics_last_ms_v7 gauge",
      `void_txroot_forensics_last_ms_v7 ${C.last_ms}`,
    ].join("\n") + "\n";
  }

  function bindRoutes(app:any){
    if (!app || (app as any).__void_forensics_v7_routes) return;
    (app as any).__void_forensics_v7_routes = true;

// [disabled-forensics-v7] // [disabled-forensics-v7]     app.get("/__void/metrics/txroot4/forensics.prom.v7", (_req:any, res:any)=>{
// [disabled-forensics-v7]       res.type("text/plain; version=0.0.4").send(prom());
// [disabled-forensics-v7]     });

    app.get("/__void/dev/inspect/saveBlock.v7", (_req:any, res:any)=>{
      try{
        const SegStore = (globalThis as any).SegStore || requireMaybe("SegStore?");
        const proto = SegStore?.prototype;
        const store = (globalThis as any).__void_store; // optional if you export it elsewhere
        const inst = store || (globalThis as any).store;

        res.json({
          ok: true,
          store_present: !!inst,
          proto_present: !!proto,
          proto_desc: {
            has_get: !!proto && typeof proto.saveBlock === "function",
            has_set: !!proto && Object.getOwnPropertyDescriptor(proto,"saveBlock")?.set != null,
            has_value: !!proto && Object.getOwnPropertyDescriptor(proto,"saveBlock")?.value != null,
            configurable: !!proto && !!Object.getOwnPropertyDescriptor(proto,"saveBlock")?.configurable,
          },
          inst_desc: {
            has_get: !!inst && typeof inst.saveBlock === "function",
            has_set: !!inst && Object.getOwnPropertyDescriptor(inst,"saveBlock")?.set != null,
            has_value: !!inst && Object.getOwnPropertyDescriptor(inst,"saveBlock")?.value != null,
            configurable: !!inst && !!Object.getOwnPropertyDescriptor(inst,"saveBlock")?.configurable,
          },
          counters: {...C},
          note: ""
        });
      }catch(e:any){
        res.json({ok:false,error:String(e), counters:{...C}});
      }
    });
  }

  // no-op placeholder for optional require path (keeps ESM safe)
  function requireMaybe(_x:string){ return undefined; }

  function tryWrap(){
    // resolve app
    const app = getApp();
    if (app) bindRoutes(app);

    // SegStore in scope?
    const SegStore = (globalThis as any).SegStore;
    if (!SegStore || !SegStore.prototype) return false;

    const proto = SegStore.prototype as any;
    if (proto[FLAG]) return true; // already wrapped

    const orig = proto.saveBlock;
    if (typeof orig !== "function") return false;

    // wrap prototype (one time)
    C.proto_binds++;
    proto[FLAG] = true;
    proto.saveBlock = async function wrappedSaveBlockV7(block:any){
      // count an instance bind the first time an object is seen
      if (!(this as any).__void_forensics_v7_seen){
        (this as any).__void_forensics_v7_seen = true;
        C.inst_binds++;
      }
      const t0 = Date.now();
      try{
        const out = await orig.apply(this, arguments as any);
        const t1 = Date.now();
        C.calls++;
        C.last_ms = t1 - t0;

        // infer simple fields if present
        const n = typeof block?.number === "number" ? block.number
                : typeof block?.header?.number === "number" ? block.header.number
                : -1;
        C.last_number = n;
        C.last_kind = "saveBlock";
        C.last_shape = n >= 0 ? "header|number" : "unknown";
        return out;
      }catch(e){
        const t1 = Date.now();
        C.calls++;
        C.last_ms = t1 - t0;
        C.last_kind = "saveBlock.error";
        throw e;
      }
    };

    return true;
  }

  (function boot(){
    let tries = 0;
    const loop = () => {
      try{
        if (tryWrap()) return;         // success: wrapper installed
      }catch(_e){}
      if (++tries < 200) setTimeout(loop, TICK_MS);
    };
    loop();
  })();
})();
// ------------------ end txroot/forensics v7 (ESM-safe, additive) ------------------
// ---------------- txroot forensics v7 (ESM-safe, additive) --------------------
(function txrootForensicsV7(){
  const FLAG = '__void_txroot_forensics_v7_wrapped__';
  const state = {
    proto_binds: 0,
    inst_binds: 0,
    calls: 0,
    last_number: -1,
    last_kind: 'unknown',
    last_shape: 'n/a',
    last_ms: 0,
  };

  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }

  function numberFrom(anyObj:any): number {
    try {
      if (!anyObj) return -1;
      if (typeof anyObj.number === 'number') return anyObj.number;
      if (anyObj.header && typeof anyObj.header.number === 'number') return anyObj.header.number;
      if (anyObj.block && typeof anyObj.block.number === 'number') return anyObj.block.number;
      if (anyObj.block && anyObj.block.header && typeof anyObj.block.header.number === 'number') return anyObj.block.header.number;
    } catch {}
    return -1;
  }

  function wrapOnce(){
    try{
      const P:any = (globalThis as any).SegStore || undefined;
      // In this file we import SegStore at top; access it off the module global via eval-safe path:
      const S:any = P || (typeof (SegStore as any) !== "undefined" ? (SegStore as any) : undefined);
      if (!S || !S.prototype) return false;

      const desc = Object.getOwnPropertyDescriptor(S.prototype, 'saveBlock');
      const original:any = desc?.value ?? (S.prototype as any).saveBlock;
      if (typeof original !== 'function') return false;
      if ((original as any)[FLAG] || (S.prototype as any)[FLAG]) return true;

      const wrapped = async function(this:any, ...args:any[]){
        const t0 = Date.now();
        try {
          const res = await original.apply(this, args);
          state.last_number = numberFrom(args[0]) ?? numberFrom(res) ?? (this?.heads?.head ?? -1);
          state.last_kind   = 'saveBlock';
          state.last_shape  = (args && args[0]) ? (args[0].header ? 'block+header' : 'block') : 'unknown';
          return res;
        } finally {
          state.calls++;
          state.last_ms = Date.now() - t0;
        }
      };
      (wrapped as any)[FLAG] = true;

      // Prefer defineProperty so we control writability/configurability
      try {
        Object.defineProperty(S.prototype, 'saveBlock', {
          value: wrapped, writable: true, configurable: true, enumerable: false
        });
        state.proto_binds++;
      } catch {
        // Fallback simple assignment
        (S.prototype as any).saveBlock = wrapped;
        state.proto_binds++;
      }
      (S.prototype as any)[FLAG] = true;
      return true;
    }catch{ return false; }
  }

  // Mount inspector + prom exporter once app exists
  function mountHttp(){
    const TICK=400;
    const app:any = getApp();
    if (!app || typeof app.get!=='function') return setTimeout(mountHttp, TICK);

    if (!(app as any).__void_txroot_forensics_v7_http){
      (app as any).__void_txroot_forensics_v7_http = true;

      app.get('/__void/dev/inspect/saveBlock.v7', (req:any, res:any)=>{
        // describe prototype+instance descriptors without using require()
        try{
          const P:any = (typeof (SegStore as any)!=="undefined") ? (SegStore as any) : undefined;
          const proto = P?.prototype || undefined;
          const inst = (globalThis as any).__void_last_store_instance; // best-effort if someone pinned it elsewhere
          const pdesc = proto ? Object.getOwnPropertyDescriptor(proto,'saveBlock') : undefined;
          const idesc = inst ? Object.getOwnPropertyDescriptor(inst,'saveBlock') : undefined;

          res.json({
            ok:true,
            store_present: !!inst,
            proto_present: !!proto,
            proto_desc: pdesc ? {
              has_get: !!pdesc.get, has_set: !!pdesc.set, has_value: typeof pdesc.value === 'function',
              configurable: !!pdesc.configurable, writable: !!pdesc.writable
            } : null,
            inst_desc: idesc ? {
              has_get: !!idesc.get, has_set: !!idesc.set, has_value: typeof idesc.value === 'function',
              configurable: !!idesc.configurable, writable: !!idesc.writable
            } : null,
            counters: {...state},
            note: ''
          });
        }catch(e:any){
          res.json({ok:false, error: String(e), counters:{...state}});
        }
      });

      app.get('/__void/metrics/txroot4/forensics.prom.v7', (req:any, res:any)=>{
        res.type('text/plain; charset=utf-8');
        res.end(
`# HELP void_txroot_forensics_binds_proto_v7 prototype binds
# TYPE void_txroot_forensics_binds_proto_v7 counter
void_txroot_forensics_binds_proto_v7 ${state.proto_binds}
# HELP void_txroot_forensics_binds_inst_v7 instance binds
# TYPE void_txroot_forensics_binds_inst_v7 counter
void_txroot_forensics_binds_inst_v7 ${state.inst_binds}
# HELP void_txroot_forensics_calls_v7 observed calls across all paths
# TYPE void_txroot_forensics_calls_v7 counter
void_txroot_forensics_calls_v7 ${state.calls}
# HELP void_txroot_forensics_last_number_v7 last seen block number
# TYPE void_txroot_forensics_last_number_v7 gauge
void_txroot_forensics_last_number_v7 ${state.last_number}
# HELP void_txroot_forensics_last_ms_v7 last saveBlock duration (ms)
# TYPE void_txroot_forensics_last_ms_v7 gauge
void_txroot_forensics_last_ms_v7 ${state.last_ms}
`);
      });
    }
  }

  function tick(){
    const ok = wrapOnce();
    mountHttp();
    if (!ok) setTimeout(tick, 400);
  }
  tick();
})();

// ---------------- txroot forensics v7 (sticky, ESM-safe, additive) ----------------
(function txrootForensicsV7(){
  const TICK = 1200;
  const state:any = {
    mounted:false,
    lastWrapped:null,
    counters:{ proto_binds:0, inst_binds:0, calls:0, last_number:-1, last_kind:"unknown", last_shape:"n/a", last_ms:0 }
  };

  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  function getSegProto(){
    try { return (globalThis as any).__void_seg_proto || (SegStore as any)?.prototype; } catch { return undefined; }
  }

  function promDump(){
    const c = state.counters;
    return [
      "# HELP void_txroot_forensics_binds_proto_v7 prototype binds",
      "# TYPE void_txroot_forensics_binds_proto_v7 counter",
      `void_txroot_forensics_binds_proto_v7 ${c.proto_binds}`,
      "# HELP void_txroot_forensics_binds_inst_v7 instance binds",
      "# TYPE void_txroot_forensics_binds_inst_v7 counter",
      `void_txroot_forensics_binds_inst_v7 ${c.inst_binds}`,
      "# HELP void_txroot_forensics_calls_v7 observed calls across all paths",
      "# TYPE void_txroot_forensics_calls_v7 counter",
      `void_txroot_forensics_calls_v7 ${c.calls}`,
      "# HELP void_txroot_forensics_last_number_v7 last seen block number",
      "# TYPE void_txroot_forensics_last_number_v7 gauge",
      `void_txroot_forensics_last_number_v7 ${c.last_number}`,
      "# HELP void_txroot_forensics_last_ms_v7 last saveBlock duration (ms)",
      "# TYPE void_txroot_forensics_last_ms_v7 gauge",
      `void_txroot_forensics_last_ms_v7 ${c.last_ms}`,
      ""
    ].join("\n");
  }

  function installRoutes(){
    const app:any = getApp(); if (!app || typeof app.get!=="function") return false;
    if ((app as any).__void_txroot_forensics_v7_routes) return true;
    (app as any).__void_txroot_forensics_v7_routes = true;

    app.get("/__void/dev/inspect/saveBlock.v7", (_req:any, res:any)=>{
      const proto = getSegProto();
      const store = (globalThis as any).__void_store;
      res.json({
        ok:true,
        store_present: !!store,
        proto_present: !!proto,
        proto_desc: proto ? {
          has_get: !!Object.getOwnPropertyDescriptor(proto,"saveBlock")?.get,
          has_set: !!Object.getOwnPropertyDescriptor(proto,"saveBlock")?.set,
          has_value: "value" in (Object.getOwnPropertyDescriptor(proto,"saveBlock")||{}),
          configurable: !!Object.getOwnPropertyDescriptor(proto,"saveBlock")?.configurable,
        } : {},
        inst_desc: store ? (()=>{
          const d=Object.getOwnPropertyDescriptor(store,"saveBlock")||{};
          return {
            has_get: !!d.get, has_set: !!d.set,
            has_value: "value" in d, configurable: !!d.configurable
          };
        })() : {},
        counters: state.counters,
        note: ""
      });
    });

    app.get("/__void/metrics/txroot4/forensics.prom.v7", (_req:any, res:any)=>{
      res.type("text/plain; version=0.0.4").send(promDump());
    });

    return true;
  }

  function sameFn(a:any,b:any){ try { return a===b; } catch { return false; } }

  function wrapIfNeeded(){
    const proto = getSegProto(); if (!proto) return;
    const desc = Object.getOwnPropertyDescriptor(proto, "saveBlock");

    // Determine the *current* callable we need to wrap
    const current = (desc && "value" in desc && typeof desc.value==="function")
      ? desc.value
      : (proto as any).saveBlock;

    if (typeof current !== "function") return;

    if (sameFn(state.lastWrapped, current)) return; // already wrapping latest winner

    const original = current;
    async function wrapped(this:any, ...args:any[]){
      const t0 = Date.now();
      try {
        const block = args?.[0];
        state.counters.calls++;
        state.counters.last_number = (block?.header?.number ?? -1);
        state.counters.last_kind = block?.kind ?? "unknown";
        state.counters.last_shape = block ? Object.keys(block).join(",") : "n/a";
        return await original.apply(this, args);
      } finally {
        state.counters.last_ms = Date.now() - t0;
      }
    }

    // Replace on prototype so *future* instances get it
    Object.defineProperty(proto, "saveBlock", { configurable:true, writable:true, value: wrapped });
    state.counters.proto_binds++;
    state.lastWrapped = wrapped;
  }

  function tick(){
    try {
      installRoutes();
      wrapIfNeeded();
    } finally {
      setTimeout(tick, TICK);
    }
  }

  if (!state.mounted){ state.mounted = true; tick(); }
})();

// ---------- txroot/forensics:v7 (ESM-safe, additive, no require) ----------
(function txrootForensicsV7(){
  const TICK = 300;
  const c = {
    proto_binds: 0,
    inst_binds: 0,    // kept for parity with your counters
    calls: 0,
    last_number: -1,
    last_kind: "unknown",
    last_shape: "n/a",
    last_ms: 0,
  };

  function wait(fn){ setTimeout(fn, TICK); }
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }

  try {
    // Lazy import to avoid top-level import churn if bundling changes
    // NOTE: This path matches your existing import in this file.
    // If SegStore is already in scope, use that; else dynamic import.
    let SegStoreRef:any = undefined;
    try { SegStoreRef = (SegStore as any); } catch {}
    const bind = async () => {
      if (!SegStoreRef) {
        try {
          // dynamic import in ESM world
          const mod = await import("../chain/seg_store.js");
          SegStoreRef = mod.SegStore;
        } catch {
          return wait(bind);
        }
      }
      if (!SegStoreRef?.prototype?.saveBlock) return wait(bind);
      if ((SegStoreRef.prototype as any).__forensics_v7_patched) return; // idempotent

      const orig = SegStoreRef.prototype.saveBlock;
      (SegStoreRef.prototype as any).__forensics_v7_patched = true;
      c.proto_binds++;

      SegStoreRef.prototype.saveBlock = async function wrappedSaveBlock(...args:any[]){
        const b = args?.[0];
        const t0 = Date.now();
        c.calls++;
        // Snapshot
        try {
          const n = (b && typeof b.number === "number") ? b.number : -1;
          const txs = Array.isArray(b?.txs) ? b.txs : [];
          c.last_number = n;
          c.last_kind   = Array.isArray(txs) ? "txs" : typeof (b?.txs);
          c.last_shape  = `txs=${txs.length}`;
        } catch {}
        try {
          return await orig.apply(this, args as any);
        } finally {
          c.last_ms = Date.now() - t0;
        }
      };

      // Expose endpoints once app exists
      const mountRoutes = () => {
        const app:any = getApp();
        if (!app || typeof app.get !== "function") return wait(mountRoutes);

        if (!(app as any).__forensics_v7_routes){
          (app as any).__forensics_v7_routes = true;

          // JSON inspector (your jq .counters call)
          app.get("/__void/dev/inspect/saveBlock.v7", (_req:any, res:any) => {
            res.json({ counters: c });
          });

          // Prom-style metrics (your .prom.v7 curl)
          app.get("/__void/metrics/txroot4/forensics.prom.v7", (_req:any, res:any) => {
            res.type("text/plain").send(
`# HELP void_txroot_forensics_binds_proto_v7 prototype binds
# TYPE void_txroot_forensics_binds_proto_v7 counter
void_txroot_forensics_binds_proto_v7 ${c.proto_binds}
# HELP void_txroot_forensics_binds_inst_v7 instance binds
# TYPE void_txroot_forensics_binds_inst_v7 counter
void_txroot_forensics_binds_inst_v7 ${c.inst_binds}
# HELP void_txroot_forensics_calls_v7 observed calls across all paths
# TYPE void_txroot_forensics_calls_v7 counter
void_txroot_forensics_calls_v7 ${c.calls}
# HELP void_txroot_forensics_last_number_v7 last seen block number
# TYPE void_txroot_forensics_last_number_v7 gauge
void_txroot_forensics_last_number_v7 ${c.last_number}
# HELP void_txroot_forensics_last_ms_v7 last saveBlock duration (ms)
# TYPE void_txroot_forensics_last_ms_v7 gauge
void_txroot_forensics_last_ms_v7 ${c.last_ms}
`);
          });
          console.log("[txroot/forensics:v7] routes mounted + proto patch active");
        }
      };
      mountRoutes();
    };
    bind();
  } catch (e) {
    console.log("[txroot/forensics:v7] install error", e && (e as any).message || e);
  }
})();

// ============ txroot/forensics v7b + header-normalize (pure-additive) ============
(function txrootForensicsV7b(){
  const TICK = 400;
  let mounted = false;

  // tiny hex helper
  function toHex(bytes:any): string {
    try {
      if (!bytes) return "";
      if (typeof bytes === "string") return bytes.startsWith("0x") ? bytes.slice(2) : bytes;
      if (Array.isArray(bytes)) return Buffer.from(bytes).toString("hex");
      if (bytes instanceof Uint8Array) return Buffer.from(bytes).toString("hex");
      // object? try common fields
      if (bytes.data) return Buffer.from(bytes.data).toString("hex");
      return String(bytes);
    } catch {
      return String(bytes);
    }
  }

  // Expose a tiny metrics endpoint
  const state:any = {
    proto_binds: 0,
    inst_binds: 0,
    calls: 0,
    last_number: -1,
    last_kind: "unknown",
    last_shape: "n/a",
    last_ms: 0,
    store_present: false,
    note: ""
  };

  function getApp(){
    return (globalThis as any).__void_http_app || (globalThis as any).app || undefined;
  }
  function getStore(){
    try {
      return (globalThis as any).__void_store || (globalThis as any).store || undefined;
    } catch { return undefined; }
  }
  function getSegStoreCtor(){
    try {
      const mod = (globalThis as any).__void_modules || {};
      // prefer the real constructor hung off the loaded store
      const st = getStore();
      if (st && st.constructor && st.constructor.name) return st.constructor;
      // last resort: walk known module cache (if any published)
      return (globalThis as any).SegStore || undefined;
    } catch { return undefined; }
  }

  function bindMetricsRoute(){
    const app:any = getApp();
    if (!app || typeof app.get !== "function") return false;
    if ((app as any).__void_txroot_forensics_v7b) return true;
    (app as any).__void_txroot_forensics_v7b = true;

    app.get("/__void/dev/inspect/saveBlock.v7", (_req:any, res:any)=>{
      const st = getStore();
      res.json({
        ok: true,
        store_present: !!st,
        proto_present: !!getSegStoreCtor()?.prototype,
        proto_desc: (()=>{
          const p = getSegStoreCtor()?.prototype || {};
          return {
            has_get: !!p.saveBlock,
            has_set: false,
            has_value: false,
            configurable: true
          };
        })(),
        inst_desc: (()=>{
          const inst = st || {};
          return {
            has_get: !!(inst as any).saveBlock,
            has_set: false,
            has_value: false,
            configurable: false
          };
        })(),
        counters: {
          proto_binds: state.proto_binds,
          inst_binds: state.inst_binds,
          calls: state.calls,
          last_number: state.last_number,
          last_kind: state.last_kind,
          last_shape: state.last_shape,
          last_ms: state.last_ms
        },
        note: state.note
      });
    });

    app.get("/__void/metrics/txroot4/forensics.prom.v7", (_req:any, res:any)=>{
      res.type("text/plain; version=0.0.4");
      const lines = [];
      lines.push(`# HELP void_txroot_forensics_binds_proto_v7 prototype binds`);
      lines.push(`# TYPE void_txroot_forensics_binds_proto_v7 counter`);
      lines.push(`void_txroot_forensics_binds_proto_v7 ${state.proto_binds}`);
      lines.push(`# HELP void_txroot_forensics_binds_inst_v7 instance binds`);
      lines.push(`# TYPE void_txroot_forensics_binds_inst_v7 counter`);
      lines.push(`void_txroot_forensics_binds_inst_v7 ${state.inst_binds}`);
      lines.push(`# HELP void_txroot_forensics_calls_v7 observed calls across all paths`);
      lines.push(`# TYPE void_txroot_forensics_calls_v7 counter`);
      lines.push(`void_txroot_forensics_calls_v7 ${state.calls}`);
      lines.push(`# HELP void_txroot_forensics_last_number_v7 last seen block number`);
      lines.push(`# TYPE void_txroot_forensics_last_number_v7 gauge`);
      lines.push(`void_txroot_forensics_last_number_v7 ${state.last_number}`);
      lines.push(`# HELP void_txroot_forensics_last_ms_v7 last saveBlock duration (ms)`);
      lines.push(`# TYPE void_txroot_forensics_last_ms_v7 gauge`);
      lines.push(`void_txroot_forensics_last_ms_v7 ${state.last_ms}`);
      res.send(lines.join("\n")+"\n");
    });
    return true;
  }

  function installWrapper(){
    if (mounted) return true;
    const SegCtor:any = getSegStoreCtor();
    const app:any = getApp();
    const store:any = getStore();

    if (!SegCtor || !SegCtor.prototype || !SegCtor.prototype.saveBlock) return false;

    if (!(SegCtor.prototype as any).__void_txroot_forensics_v7b_wrapped) {
      const orig = SegCtor.prototype.saveBlock;
      (SegCtor.prototype as any).__void_txroot_forensics_v7b_wrapped = true;
      state.proto_binds++;

      SegCtor.prototype.saveBlock = async function wrappedSaveBlock(block:any){
        const t0 = Date.now();
        try {
          // Normalize txRoot RIGHT BEFORE persist, using merged txs
          const hdr = block?.header || (block.header = {});
          const txs = block?.txs || [];
          // compute root if absent or clearly empty
          if (!hdr.txRoot || hdr.txRoot === "" || /^e3b0c4/.test(String(hdr.txRoot))) {
            // prefer existing helper if exposed on app
            let rootHex = "";
            try {
              const h3 = (app && app.__void_header3_compute) ? app.__void_header3_compute(txs) : null;
              rootHex = h3 ? String(h3).replace(/^0x/,"") : toHex((globalThis as any).__void_txroot_compute ? (globalThis as any).__void_txroot_compute(txs) : "");
            } catch { /* fallthrough */ }
            if (!rootHex) {
              // tiny fallback: empty==sha256() of nothing is e3b0..., else hash JSON quickly
              const buf = Buffer.from(JSON.stringify(txs));
              const crypto = await import("node:crypto");
              rootHex = crypto.createHash("sha256").update(buf).digest("hex");
            }
            hdr.txRoot = "0x"+toHex(rootHex);
          } else {
            hdr.txRoot = "0x"+toHex(hdr.txRoot);
          }

          const res = await orig.call(this, block);

          // metrics
          state.calls++;
          state.last_number = Number(block?.header?.number ?? -1);
          state.last_kind = Array.isArray(txs) ? `txs:${txs.length}` : typeof txs;
          state.last_shape = (txs && typeof txs === "object") ? Object.keys(txs).slice(0,4).join(",") : String(typeof txs);
          state.last_ms = Date.now() - t0;
          return res;
        } catch (e:any) {
          state.last_ms = Date.now() - t0;
          state.note = `err:${e?.message||e}`;
          throw e;
        }
      };
    }

    if (store && !(store as any).__void_txroot_forensics_v7b_installed) {
      // marker for visibility; actual wrapping is on prototype
      (store as any).__void_txroot_forensics_v7b_installed = true;
      state.inst_binds++;
    }

    state.store_present = !!store;
    mounted = true;
    return true;
  }

  (function tick(){
    try {
      const okRoute = bindMetricsRoute();
      const okWrap  = installWrapper();
      if (!okRoute || !okWrap) return setTimeout(tick, TICK);
    } catch {
      return setTimeout(tick, TICK);
    }
  })();
})();
// ---------------- TXROOT FORENSICS v7 — INSTANCE PROXY BINDER (additive, safe) ----------------
(function txrootForensicsV7ProxyBinder(){
  const TICK = 500;
  const state:any = {
    proto_binds: 0, inst_binds: 0, calls: 0,
    last_number: -1, last_kind: "unknown", last_shape: "n/a", last_ms: 0,
    bound: false, proxied: false
  };
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }

  function tryProtoBind() {
    try {
      const SegStore = (globalThis as any).SegStore || undefined;
      if (!SegStore?.prototype) return;
      const desc = Object.getOwnPropertyDescriptor(SegStore.prototype, "saveBlock");
      if (!desc || typeof desc.value !== "function") return;
      if ((SegStore.prototype as any).__txroot_v7_bound) return;
      const original = desc.value;
      Object.defineProperty(SegStore.prototype, "saveBlock", {
        value: async function saveBlock_v7_proxy(block:any) {
          const t0 = Date.now();
          try {
            const r = await original.apply(this, [block]);
            state.calls++; state.last_number = block?.number ?? -1;
            state.last_kind = "proto"; state.last_shape = (block && typeof block === "object" ? Object.keys(block).join(",") : String(typeof block));
            state.last_ms = Date.now() - t0;
            return r;
          } catch(e){ state.last_ms = Date.now() - t0; throw e; }
        }
      });
      (SegStore.prototype as any).__txroot_v7_bound = true;
      state.proto_binds++;
    } catch {}
  }

  function findCtx() {
    const app:any = getApp();
    const locals = app?.locals || {};
    const candidates:any[] = [
      locals.store, locals.node?.store,
      (globalThis as any).__void_store,
      (globalThis as any).__void_node?.store,
      (globalThis as any).void?.store
    ].filter(Boolean);
    return { app, locals, store: candidates[0], node: locals.node || (globalThis as any).__void_node };
  }

  function bindViaProxy() {
    const { node, store } = findCtx();
    if (!node || !store || state.proxied) return false;
    try {
      const prox = new Proxy(store, {
        get(target, prop, recv){
          if (prop === "saveBlock" && typeof (target as any).saveBlock === "function") {
            const orig = (target as any).saveBlock.bind(target);
            return async function saveBlock_v7_inst_proxy(block:any){
              const t0 = Date.now();
              try{
                const r = await orig(block);
                state.calls++; state.last_number = block?.number ?? -1;
                state.last_kind = "inst-proxy";
                state.last_shape = (block && typeof block === "object" ? Object.keys(block).join(",") : String(typeof block));
                state.last_ms = Date.now() - t0;
                return r;
              }catch(e){ state.last_ms = Date.now() - t0; throw e; }
            };
          }
          return Reflect.get(target, prop, recv);
        }
      });
      node.store = prox;
      state.inst_binds++;
      state.proxied = true;
      return true;
    } catch { return false; }
  }

  async function mountRoutes(){
    const app:any = getApp(); if (!app || typeof app.get!=="function") return setTimeout(mountRoutes, TICK);

    app.get("/__void/dev/inspect/saveBlock.v7", (_req:any, res:any)=>{
      const { store, node } = findCtx();
      const SegStore = (globalThis as any).SegStore || undefined;
      const proto = SegStore?.prototype ? Object.getOwnPropertyDescriptor(SegStore.prototype, "saveBlock") : undefined;
      const inst = store ? Object.getOwnPropertyDescriptor(store, "saveBlock") : undefined;
      res.json({
        ok: true,
        store_present: !!store,
        node_present: !!node,
        proto_present: !!proto && typeof proto.value === "function",
        proto_desc: proto ? { has_get: !!proto.get, has_set: !!proto.set, has_value: !!proto.value, configurable: !!proto.configurable } : {},
        inst_desc: inst ? { has_get: !!inst.get, has_set: !!inst.set, has_value: !!inst.value, configurable: !!inst.configurable } : {},
        counters: { ...state },
        note: state.proxied ? "proxied node.store; counting should advance on next saves" : ""
      });
    });

    app.post("/__void/dev/bind/saveBlock.v7", (_req:any, res:any)=>{
      tryProtoBind();
      const prox = bindViaProxy();
      res.json({ ok:true, proxied: !!prox, proto_binds: state.proto_binds, inst_binds: state.inst_binds });
    });

    app.get("/__void/metrics/txroot4/forensics.prom.v7", (_req:any, res:any)=>{
      res.set("Content-Type","text/plain; version=0.0.4");
      res.end([
        "# HELP void_txroot_forensics_binds_proto_v7 prototype binds",
        "# TYPE void_txroot_forensics_binds_proto_v7 counter",
        `void_txroot_forensics_binds_proto_v7 ${state.proto_binds}`,
        "# HELP void_txroot_forensics_binds_inst_v7 instance binds",
        "# TYPE void_txroot_forensics_binds_inst_v7 counter",
        `void_txroot_forensics_binds_inst_v7 ${state.inst_binds}`,
        "# HELP void_txroot_forensics_calls_v7 observed calls across all paths",
        "# TYPE void_txroot_forensics_calls_v7 counter",
        `void_txroot_forensics_calls_v7 ${state.calls}`,
        "# HELP void_txroot_forensics_last_number_v7 last seen block number",
        "# TYPE void_txroot_forensics_last_number_v7 gauge",
        `void_txroot_forensics_last_number_v7 ${state.last_number}`,
        "# HELP void_txroot_forensics_last_ms_v7 last saveBlock duration (ms)",
        "# TYPE void_txroot_forensics_last_ms_v7 gauge",
        `void_txroot_forensics_last_ms_v7 ${state.last_ms}`,
        ""
      ].join("\n"));
    });

    setTimeout(()=>{ tryProtoBind(); bindViaProxy(); }, 300);
  }
  mountRoutes();
})();

// ---------------- header3 auto-warm poller (additive, safe) -------------------
(function header3AutoWarmPoller(){
  const TICK_MS = Number(process.env.VOID_HEADER3_POLL_MS || 10000); // default 10s
  let attached = false, t: any;

  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }

  async function pokeOnce(fetch: any){
    try {
      const port = String(process.env.HTTP_PORT || "4100");
      const r = await fetch("http://127.0.0.1:" + port + "/blocks/latest/number2.json");
      if (!r?.ok) return;
      const j = await r.json();
      const n = (j && (j.number ?? j.num ?? j.N)) ?? null;
      if (typeof n === "number" && n >= 0) {
        await fetch(`http://127.0.0.1:${port}/blocks/${encodeURIComponent(n)}/header3`).catch(()=>{});
      }
    } catch {}
  }

  function start(){
    if (attached) return; attached = true;
    const g:any = globalThis as any;
    const fetch = (g.fetch || ((...args:any[]) => import("node-fetch").then(m => (m.default as any)(...args)))) as any;
    const tick = async ()=>{ await pokeOnce(fetch); t = setTimeout(tick, TICK_MS); };
    tick();

    // health gauge (Prom-style text) under /__void/metrics/header3.warm.prom
    const app:any = getApp();
    if (app?.get && !(app as any).__void_header3_warm_prom) {
      (app as any).__void_header3_warm_prom = true;
      app.get("/__void/metrics/header3.warm.prom", (_req:any, res:any)=>{
        res.type("text/plain; version=0.0.4");
        res.write("# HELP void_header3_warm_enabled Auto-warm poller enabled (1/0)\n");
        res.write("# TYPE void_header3_warm_enabled gauge\n");
        res.write("void_header3_warm_enabled 1\n");
        res.end();
      });
    }
  }

  function waitForApp(){
    const app:any = getApp();
    if (!app || typeof app.get!=="function") return setTimeout(waitForApp, 400);
    start();
  }

  try { waitForApp(); } catch {}
})();

// ---------------- saveBlock Trampoline Guard v1 (additive, safe) -----------------
(function saveBlockTrampolineGuardV1(){
  const TICK = 400;

  function getG(){ return (globalThis as any); }
  function getProto(){
    const G = getG();
    return (G.SegStore && G.SegStore.prototype) ? G.SegStore.prototype : undefined;
  }

  function install(){
    const proto:any = getProto();
    if (!proto) return setTimeout(install, TICK);

    const ORIG = Symbol.for("void.segstore.saveBlock.orig.v1");
    const TRAMP = Symbol.for("void.segstore.saveBlock.tramp.v1");

    // Record the very first real original if we haven't yet.
    if (!proto[ORIG] && typeof proto.saveBlock === "function" && !proto.saveBlock[TRAMP]) {
      try { Object.defineProperty(proto, ORIG, { value: proto.saveBlock, writable: false, configurable: true }); }
      catch { (proto as any)[ORIG] = proto.saveBlock; }
    }

    const orig:any = proto[ORIG] || proto.saveBlock;
    if (typeof orig !== "function") return;

    // Trampoline that ALWAYS calls the original (breaks wrap->wrap recursion).
    const tramp = async function saveBlockTrampolineV1(this:any, ...args:any[]){
      return await orig.apply(this, args);
    };
    (tramp as any)[TRAMP] = true;

    // Only install if current saveBlock isn't already our trampoline.
    if (proto.saveBlock !== tramp) {
      try {
        Object.defineProperty(proto, "saveBlock", { value: tramp, writable: true, configurable: true, enumerable: false });
      } catch {
        proto.saveBlock = tramp;
      }
    }

    // Expose minimal HTTP controls
    const app:any = (getG().__void_http_app || getG().app);
    if (app && typeof app.get === "function" && !(app as any).__void_tramp_guard_http_v1) {
      (app as any).__void_tramp_guard_http_v1 = true;

      // GET status
      app.get("/__void/dev/saveBlock.tramp/status", (_req:any, res:any)=>{
        const p:any = getProto();
        const desc = p ? Object.getOwnPropertyDescriptor(p, "saveBlock") : null;
        res.json({
          ok: true,
          has_proto: !!p,
          has_orig: !!(p && p[ORIG]),
          is_tramp: !!(p && typeof p.saveBlock === "function" && (p.saveBlock as any)[TRAMP]),
          writable: !!desc?.writable,
          configurable: !!desc?.configurable
        });
      });

      // POST unbind → restore original
      app.post("/__void/dev/saveBlock.tramp/unbind", (_req:any, res:any)=>{
        const p:any = getProto();
        const o:any = p && p[ORIG];
        if (p && typeof o === "function") {
          try { Object.defineProperty(p, "saveBlock", { value: o, writable: true, configurable: true, enumerable: false }); }
          catch { p.saveBlock = o; }
          res.json({ ok: true, action: "restore-original" });
        } else {
          res.json({ ok: false, error: "no-original" });
        }
      });

      // POST bind → re-install trampoline
      app.post("/__void/dev/saveBlock.tramp/bind", (_req:any, res:any)=>{
        const p:any = getProto();
        if (!p) return res.json({ ok:false, error:"no-proto" });
        const o:any = p[ORIG] || p.saveBlock;
        if (typeof o !== "function") return res.json({ ok:false, error:"no-func" });
        const tramp2:any = async function saveBlockTrampolineV1b(this:any, ...args:any[]){ return await (p[ORIG]||o).apply(this, args); };
        tramp2[TRAMP] = true;
        try { Object.defineProperty(p, "saveBlock", { value: tramp2, writable: true, configurable: true, enumerable: false }); }
        catch { p.saveBlock = tramp2; }
        res.json({ ok:true, action:"bind-trampoline" });
      });
    }
  }

  try { install(); } catch { setTimeout(install, TICK); }
})();



// ---- proposer.truth2 proxy (pure-additive, safe) --------------------------------
;(async function mountProposerTruth2Proxy(){
  try{
    const http:any = await import('node:http');
    const TICK = 500;

    let attached = false;
    let cache:{enabled:null|number; ms:null|number; lastChangeMs:null|number; _ts:number} =
      { enabled: null, ms: null, lastChangeMs: null, _ts: 0 };

    function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }

    function parsePromText(text:string){
      const mEnabled = text.match(/^\s*void_proposer_auto_enabled_v2\s+([0-9.]+)\s*$/m);
      const mMs      = text.match(/^\s*void_proposer_auto_ms_v2\s+([0-9.]+)\s*$/m);
      const mTs      = text.match(/^\s*void_proposer_exporter_ts_ms_v2\s+([0-9.]+)\s*$/m);
      if (!mEnabled || !mMs) return;

      const en = Number(mEnabled[1]);
      const ms = Number(mMs[1]);
      const ts = mTs ? Number(mTs[1]) : Date.now();

      if (cache.enabled !== null && cache.enabled !== en) cache.lastChangeMs = ts;
      if (cache.lastChangeMs === null) cache.lastChangeMs = ts;

      cache.enabled = en;
      cache.ms = ms;
      cache._ts = ts;
    }

    function pollOnce():Promise<void>{
      return new Promise<void>((resolve)=>{
        const req = http.request(
          { host:'127.0.0.1', port: 4100, path:'/metrics/void/proposer.v3b.prom', method:'GET', timeout: 800 },
          (res:any)=>{
            let buf=''; res.setEncoding('utf8');
            res.on('data',(c:string)=>buf+=c);
            res.on('end',()=>{ try{ parsePromText(buf); }catch{} resolve(); });
          });
        req.on('error', ()=>resolve());
        req.on('timeout', ()=>{ try{ req.destroy(); }catch{} resolve(); });
        req.end();
      });
    }

    async function attach(){
      const app:any = getApp(); if (!app || typeof app.get!=='function') return setTimeout(attach, TICK);
      if (attached) return; attached = true;

      setInterval(()=>{ pollOnce(); }, 1500);
      await pollOnce();

      app.get('/__void/metrics/proposer.truth2.json', async (_req:any, res:any)=>{
        if (cache.enabled === null || (Date.now() - cache._ts) > 5000) await pollOnce();
        res.setHeader('Content-Type','application/json');
        res.end(JSON.stringify({ enabled: cache.enabled, ms: cache.ms, lastChangeMs: cache.lastChangeMs }));
      });
    }
    attach();
  }catch(_e){}
})();

// ---------------- VOID Ready exporter (additive, mount-once) -----------------
(function voidReadyExporter(){
  const TICK = 400;
  const HTTP_PORT = Number(process.env.HTTP_PORT || process.env.VOID_HTTP_PORT || 4100);

  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }

  async function getJSON<T=any>(path:string):Promise<T|null>{
    try{
      const r = await fetch(`http://127.0.0.1:${HTTP_PORT}${path}`, {headers:{'accept':'application/json'}});
      if(!r.ok) return null; return await r.json() as T;
    }catch{ return null; }
  }
  async function getText(path:string):Promise<string|null>{
    try{
      const r = await fetch(`http://127.0.0.1:${HTTP_PORT}${path}`); if(!r.ok) return null; return await r.text();
    }catch{ return null; }
  }

  // Parse a single gauge line from Prom text (very small helper)
  function parseGauge(text:string, metric:string): number | null {
    // e.g., 'void_proposer_auto_ms_v2 2000'
    const re = new RegExp(`^${metric}\\s+([-+]?[0-9]*\\.?[0-9]+)\\s*$`, 'm');
    const m = text.match(re);
    if(!m) return null;
    const v = Number(m[1]); return Number.isFinite(v) ? v : null;
  }

  async function computeReady(){
    // 1) truth: {enabled, ms}
    const truth = await getJSON<{enabled:number, ms:number}>("/__void/metrics/proposer.truth2.json");
    // 2) exporter text for timestamp + ms (authoritative)
    const prom = await getText("/metrics/void/proposer.v3b.prom");

    const enabled = truth?.enabled === 1 ? 1 : 0;
    const ms      = (truth?.ms ?? null);

    let msGauge   = prom ? parseGauge(prom, "void_proposer_auto_ms_v2") : null;
    if (msGauge == null && typeof ms === "number") msGauge = ms;

    const tsMs    = prom ? parseGauge(prom, "void_proposer_exporter_ts_ms_v2") : null;
    const ageSec  = tsMs != null ? Math.max(0, (Date.now() - tsMs) / 1000) : null;

    // readiness mirrors your alert:
    // enabled==1 AND age<=120 AND |ms-2000|<=100
    const msDrift = (msGauge != null) ? Math.abs(msGauge - 2000) : Infinity;
    const fresh   = (ageSec != null) ? ageSec <= 120 : false;

    const ready = (enabled === 1) && fresh && (msDrift <= 100) ? 1 : 0;

    return {
      ready,
      reasons: {
        enabled,
        ms: msGauge,
        ms_drift: Number.isFinite(msDrift) ? msDrift : null,
        exporter_age_s: ageSec
      },
      now_ms: Date.now()
    };
  }

  function mount(){
    const app:any = getApp(); if (!app || typeof app.get!=="function") return setTimeout(mount, TICK);
    if ((app as any).__void_ready_exporter_mounted) return; (app as any).__void_ready_exporter_mounted = true;

    // JSON: /ready/void.json
    app.get("/ready/void.json", async (_req:any, res:any)=>{
      const s = await computeReady();
      res.setHeader("content-type","application/json; charset=utf-8");
      res.end(JSON.stringify(s));
    });

    // Prom text: /ready/void.prom
    app.get("/ready/void.prom", async (_req:any, res:any)=>{
      const s = await computeReady();
      res.setHeader("content-type", "text/plain; version=0.0.4; charset=utf-8");
      res.write("# HELP void_ready Combined readiness (1=ready, 0=not ready)\n");
      res.write("# TYPE void_ready gauge\n");
      res.write(`void_ready ${s.ready}\n`);
      if (s.reasons.enabled != null){ res.write("# HELP void_ready_enabled Proposer enabled (1/0)\n# TYPE void_ready_enabled gauge\n"); res.write(`void_ready_enabled ${s.reasons.enabled}\n`); }
      if (s.reasons.ms != null){ res.write("# HELP void_ready_ms_v2 Proposer tick ms (from exporter)\n# TYPE void_ready_ms_v2 gauge\n"); res.write(`void_ready_ms_v2 ${s.reasons.ms}\n`); }
      if (s.reasons.ms_drift != null){ res.write("# HELP void_ready_ms_drift_v2 |ms-2000| (ms)\n# TYPE void_ready_ms_drift_v2 gauge\n"); res.write(`void_ready_ms_drift_v2 ${s.reasons.ms_drift}\n`); }
      if (s.reasons.exporter_age_s != null){ res.write("# HELP void_ready_exporter_age_s_v3b Exporter sample age (s)\n# TYPE void_ready_exporter_age_s_v3b gauge\n"); res.write(`void_ready_exporter_age_s_v3b ${s.reasons.exporter_age_s}\n`); }
      res.end();
    });
  }
  mount();
})();

// --------------- VOID Ready exporter v2 (prefers exporter gauges) ---------------
(function voidReadyExporterV2(){
  const TICK = 400;
  const HTTP_PORT = Number(process.env.HTTP_PORT || process.env.VOID_HTTP_PORT || 4100);

  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }

  async function getText(path:string):Promise<string|null>{
    try{ const r = await fetch(`http://127.0.0.1:${HTTP_PORT}${path}`); if(!r.ok) return null; return await r.text(); }
    catch{ return null; }
  }
  async function getJSON<T=any>(path:string):Promise<T|null>{
    try{ const r = await fetch(`http://127.0.0.1:${HTTP_PORT}${path}`, {headers:{'accept':'application/json'}}); if(!r.ok) return null; return await r.json() as T; }
    catch{ return null; }
  }
  function g(text:string|null, name:string): number | null {
    if(!text) return null;
    const re = new RegExp(`^${name}\\s+([-+]?[0-9]*\\.?[0-9]+)\\s*$`, 'm');
    const m = text.match(re); if(!m) return null;
    const v = Number(m[1]); return Number.isFinite(v) ? v : null;
  }

  async function compute(){
    const promText = await getText("/metrics/void/proposer.v3b.prom");
    const truth    = await getJSON<{enabled:number, ms:number}>("/__void/metrics/proposer.truth2.json");

    // Prefer exporter gauges; fall back to truth
    const enabled = (g(promText, "void_proposer_auto_enabled_v2") ?? truth?.enabled ?? 0) > 0 ? 1 : 0;
    const ms      = g(promText, "void_proposer_auto_ms_v2") ?? truth?.ms ?? null;
    const tsMs    = g(promText, "void_proposer_exporter_ts_ms_v2");
    const ageSec  = tsMs != null ? Math.max(0, (Date.now() - tsMs) / 1000) : null;

    const msDrift = (ms != null) ? Math.abs(ms - 2000) : Infinity;
    const fresh   = (ageSec != null) ? ageSec <= 120 : false;
    const ready   = (enabled===1) && fresh && (msDrift <= 100) ? 1 : 0;

    return { ready, reasons:{ enabled, ms, ms_drift: Number.isFinite(msDrift)?msDrift:null, exporter_age_s: ageSec }, now_ms: Date.now() };
  }

  function mount(){
    const app:any = getApp(); if(!app || typeof app.get!=="function") return setTimeout(mount, TICK);
    if((app as any).__void_ready_exporter_v2_mounted) return; (app as any).__void_ready_exporter_v2_mounted = true;

    app.get("/ready/void.v2.json", async (_req:any, res:any)=>{
      const s = await compute(); res.setHeader("content-type","application/json; charset=utf-8"); res.end(JSON.stringify(s));
    });
    app.get("/ready/void.v2.prom", async (_req:any, res:any)=>{
      const s = await compute(); res.setHeader("content-type","text/plain; version=0.0.4; charset=utf-8");
      res.write("# HELP void_ready_v2 Combined readiness (1=ready)\n# TYPE void_ready_v2 gauge\n");
      res.write(`void_ready_v2 ${s.ready}\n`);
      if (s.reasons.enabled!=null){ res.write("# HELP void_ready_enabled_v2 Proposer enabled (1/0)\n# TYPE void_ready_enabled_v2 gauge\n"); res.write(`void_ready_enabled_v2 ${s.reasons.enabled}\n`); }
      if (s.reasons.ms!=null){ res.write("# HELP void_ready_ms_v2 Proposer tick ms\n# TYPE void_ready_ms_v2 gauge\n"); res.write(`void_ready_ms_v2 ${s.reasons.ms}\n`); }
      if (s.reasons.ms_drift!=null){ res.write("# HELP void_ready_ms_drift_v2 |ms-2000| (ms)\n# TYPE void_ready_ms_drift_v2 gauge\n"); res.write(`void_ready_ms_drift_v2 ${s.reasons.ms_drift}\n`); }
      if (s.reasons.exporter_age_s!=null){ res.write("# HELP void_ready_exporter_age_s_v2 Exporter sample age (s)\n# TYPE void_ready_exporter_age_s_v2 gauge\n"); res.write(`void_ready_exporter_age_s_v2 ${s.reasons.exporter_age_s}\n`); }
      res.end();
    });
  }
  mount();
})();
// ---------------- P2P Mini-Registry v1 (additive, no deps) -------------------
(function P2PMiniRegistryV1(){
  const TICK = 400;
  type Peer = { id: string; addr: string; seenAt: number; rttMs?: number };
  type State = { selfId: string; peers: Map<string, Peer> };

  function now(){ return Date.now(); }
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  function getState(): State {
    const g:any = globalThis as any;
    if (!g.__void_p2p_mini) {
      // Try to derive selfId from env or fallback
      const selfId = process.env.VOID_NODE_ID || process.env.VOID_NODE_KEY_A || "void-self";
      g.__void_p2p_mini = { selfId, peers: new Map<string, Peer>() } as State;
    }
    return g.__void_p2p_mini as State;
  }

  function putPeer(p: Peer){
    const st = getState();
    const cur = st.peers.get(p.id);
    if (!cur || cur.addr !== p.addr || (p.seenAt && p.seenAt > (cur.seenAt||0))) {
      st.peers.set(p.id, { ...cur, ...p, seenAt: p.seenAt || now() });
    } else if (p.rttMs !== undefined) {
      cur.rttMs = p.rttMs;
    }
  }

  async function pingOnce(addr: string): Promise<number> {
    const start = now();
    const url = new URL(addr);
    // try hello/health endpoints (best-effort)
    const candidates = [
      new URL('/p2p/hello-now', url).toString(),
      new URL('/health', url).toString(),
      addr
    ];
    for (const u of candidates) {
      try {
        // Node 18+ has global fetch
        const res = await fetch(u, { method: 'GET' });
        if (res.ok) return now() - start;
      } catch {}
    }
    throw new Error('ping failed');
  }

  function mount(){
    const app:any = getApp();
    if (!app || typeof app.get !== 'function') return setTimeout(mount, TICK);
    if ((app as any).__void_p2p_mini_attached) return;
    (app as any).__void_p2p_mini_attached = true;

    const st = getState();

    // POST /p2p/handshake/v2  {id, addr, name?}
    app.post('/p2p/handshake/v2', express.json(), async (req:any, res:any) => {
      try {
        const { id, addr } = req.body || {};
        if (!id || !addr) return res.status(400).json({ ok:false, error:'id and addr required' });
        putPeer({ id, addr, seenAt: now() });
        return res.json({ ok:true, selfId: st.selfId, received: { id, addr }, peersKnown: st.peers.size });
      } catch (e:any) {
        return res.status(500).json({ ok:false, error: e?.message || 'err' });
      }
    });

    // GET /p2p/peers/known
    app.get('/p2p/peers/known', (_req:any, res:any) => {
      const arr = Array.from(st.peers.values()).sort((a,b)=>b.seenAt-a.seenAt);
      res.json({ ok:true, selfId: st.selfId, count: arr.length, peers: arr });
    });

    // GET /p2p/peers/active?since=60
    app.get('/p2p/peers/active', (req:any, res:any) => {
      const sinceSec = Math.max(0, parseInt(String(req.query.since||'60'))||60);
      const cutoff = now() - sinceSec*1000;
      const arr = Array.from(st.peers.values()).filter(p=>p.seenAt>=cutoff).sort((a,b)=>b.seenAt-a.seenAt);
      res.json({ ok:true, sinceSec, count: arr.length, peers: arr });
    });

    // GET /p2p/ping?addr=http://127.0.0.1:4101
    app.get('/p2p/ping', async (req:any, res:any) => {
      const addr = String(req.query.addr||'');
      if (!addr) return res.status(400).json({ ok:false, error:'addr required' });
      try {
        const rtt = await pingOnce(addr);
        // Try to infer peer id via addr as key (best-effort)
        const id = 'peer:' + addr;
        putPeer({ id, addr, seenAt: now(), rttMs: rtt });
        res.json({ ok:true, addr, rttMs: rtt });
      } catch (e:any) {
        res.status(502).json({ ok:false, addr, error: e?.message || 'ping failed' });
      }
    });

    // Prom text exporter: /metrics/p2p/mini.prom
    app.get('/metrics/p2p/mini.prom', (_req:any, res:any) => {
      const peers = Array.from(st.peers.values());
      const nowMs = now();
      const active = peers.filter(p => (nowMs - p.seenAt) <= 60_000).length;
      let out = '';
      out += `void_p2p_peers_known ${peers.length}\n`;
      out += `void_p2p_peers_active_60s ${active}\n`;
      const lastRtt = peers.reduce((m,p)=> p.rttMs!==undefined ? p.rttMs : m, -1);
      if (lastRtt >= 0) out += `void_p2p_last_rtt_ms ${lastRtt}\n`;
      res.type('text/plain').send(out);
    });

    // tiny self-check
    app.get('/p2p/mini/health', (_req:any,res:any)=> res.json({ok:true,selfId:st.selfId,peers:st.peers.size}));
  }
  mount();
})();
// ---------------- P2P Mini-Registry v1 FIX (additive, no deps) ---------------
(function P2PMiniRegistryV1_FIX(){
  const TICK = 400;
  type Peer = { id: string; addr: string; seenAt: number; rttMs?: number };
  type State = { selfId: string; peers: Map<string, Peer> };

  function now(){ return Date.now(); }
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  function getState(): State {
    const g:any = globalThis as any;
    if (!g.__void_p2p_mini_fix) {
      const selfId = process.env.VOID_NODE_ID || process.env.VOID_NODE_KEY_A || "void-self";
      g.__void_p2p_mini_fix = { selfId, peers: new Map<string, Peer>() } as State;
    }
    return (globalThis as any).__void_p2p_mini_fix as State;
  }
  function putPeer(p: Peer){
    const st = getState();
    const cur = st.peers.get(p.id);
    if (!cur || cur.addr !== p.addr || (p.seenAt && p.seenAt > (cur.seenAt||0))) {
      st.peers.set(p.id, { ...cur, ...p, seenAt: p.seenAt || now() });
    } else if (p.rttMs !== undefined) {
      cur.rttMs = p.rttMs;
    }
  }
  async function pingOnce(addr: string): Promise<number> {
    const start = now();
    const url = new URL(addr);
    const candidates = [
      new URL('/p2p/hello-now', url).toString(),
      new URL('/health', url).toString(),
      addr
    ];
    for (const u of candidates) {
      try { const r = await fetch(u); if (r.ok) return now()-start; } catch {}
    }
    throw new Error('ping failed');
  }
  function mount(){
    const app:any = getApp();
    if (!app || typeof app.get !== 'function') return setTimeout(mount, TICK);
    if ((app as any).__void_p2p_mini_fix_attached) return;
    (app as any).__void_p2p_mini_fix_attached = true;

    const st = getState();

    // POST /p2p/handshake/v2
    app.post('/p2p/handshake/v2', (express as any).json(), async (req:any,res:any)=>{
      try{
        const { id, addr } = req.body || {};
        if (!id || !addr) return res.status(400).json({ ok:false, error:'id and addr required' });
        putPeer({ id, addr, seenAt: now() });
        return res.json({ ok:true, selfId: st.selfId, received:{id,addr}, peersKnown: st.peers.size });
      }catch(e:any){ return res.status(500).json({ ok:false, error: e?.message||'err' });}
    });

    // GET /p2p/peers/known
    app.get('/p2p/peers/known', (_req:any,res:any)=>{
      const arr = Array.from(st.peers.values()).sort((a,b)=>b.seenAt-a.seenAt);
      res.json({ ok:true, selfId: st.selfId, count: arr.length, peers: arr });
    });

    // GET /p2p/peers/active?since=60
    app.get('/p2p/peers/active', (req:any,res:any)=>{
      const sinceSec = Math.max(0, parseInt(String(req.query.since||'60'))||60);
      const cutoff = now() - sinceSec*1000;
      const arr = Array.from(st.peers.values()).filter(p=>p.seenAt>=cutoff).sort((a,b)=>b.seenAt-a.seenAt);
      res.json({ ok:true, sinceSec, count: arr.length, peers: arr });
    });

    // GET /p2p/ping?addr=http://127.0.0.1:4101
    app.get('/p2p/ping', async (req:any,res:any)=>{
      const addr = String(req.query.addr||'');
      if (!addr) return res.status(400).json({ ok:false, error:'addr required' });
      try{
        const rtt = await pingOnce(addr);
        const id = 'peer:' + addr;
        putPeer({ id, addr, seenAt: now(), rttMs: rtt });
        res.json({ ok:true, addr, rttMs: rtt });
      }catch(e:any){ res.status(502).json({ ok:false, addr, error: e?.message||'ping failed' });}
    });

    // GET /metrics/p2p/mini.prom
    app.get('/metrics/p2p/mini.prom', (_req:any,res:any)=>{
      const peers = Array.from(getState().peers.values());
      const active = peers.filter(p => (now()-p.seenAt) <= 60_000).length;
      let out = '';
      out += `void_p2p_peers_known ${peers.length}\n`;
      out += `void_p2p_peers_active_60s ${active}\n`;
      const lastRtt = peers.reduce((m,p)=> p.rttMs!==undefined ? p.rttMs : m, -1);
      if (lastRtt >= 0) out += `void_p2p_last_rtt_ms ${lastRtt}\n`;
      res.type('text/plain').send(out);
    });

    app.get('/p2p/mini/health', (_req:any,res:any)=> res.json({ ok:true, selfId: st.selfId, peers: st.peers.size }));
  }
  mount();
})();
// ---------------- P2P Mini-Registry v1 CLEAN (additive) -----------------------
(function P2PMiniRegistryV1_CLEAN(){
  const TICK = 400;
  type Peer = { id: string; addr: string; seenAt: number; rttMs?: number };
  type State = { selfId: string; peers: Map<string, Peer> };

  function now(){ return Date.now(); }
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  function getState(): State {
    const g:any = globalThis as any;
    if (!g.__void_p2p_mini_clean) {
      const selfId = process.env.VOID_NODE_ID || process.env.VOID_NODE_KEY_A || "void-self";
      g.__void_p2p_mini_clean = { selfId, peers: new Map<string, Peer>() } as State;
    }
    return (globalThis as any).__void_p2p_mini_clean as State;
  }
  function putPeer(p: Peer){
    const st = getState();
    const cur = st.peers.get(p.id);
    if (!cur || cur.addr !== p.addr || (p.seenAt && p.seenAt > (cur.seenAt||0))) {
      st.peers.set(p.id, { ...cur, ...p, seenAt: p.seenAt || now() });
    } else if (p.rttMs !== undefined) { cur.rttMs = p.rttMs; }
  }
  async function pingOnce(addr: string): Promise<number> {
    const start = now(); const url = new URL(addr);
    const candidates = [ '/p2p/hello-now', '/health', '/' ].map(p => new URL(p, url).toString());
    for (const u of candidates){ try{ const r=await fetch(u); if(r.ok) return now()-start; }catch{} }
    throw new Error('ping failed');
  }
  function mount(){
    const app:any = getApp();
    if (!app || typeof app.get !== 'function') return setTimeout(mount, TICK);
    if ((app as any).__void_p2p_mini_clean_attached) return;
    (app as any).__void_p2p_mini_clean_attached = true;

    const st = getState();

    app.post('/p2p/handshake/v2', express.json(), async (req:any,res:any)=>{
      try{
        const { id, addr } = req.body || {};
        if (!id || !addr) return res.status(400).json({ ok:false, error:'id and addr required' });
        putPeer({ id, addr, seenAt: now() });
        return res.json({ ok:true, selfId: st.selfId, received:{id,addr}, peersKnown: st.peers.size });
      }catch(e:any){ return res.status(500).json({ ok:false, error: e?.message||'err' });}
    });

    app.get('/p2p/peers/known', (_req:any,res:any)=>{
      const arr = Array.from(st.peers.values()).sort((a,b)=>b.seenAt-a.seenAt);
      res.json({ ok:true, selfId: st.selfId, count: arr.length, peers: arr });
    });

    app.get('/p2p/peers/active', (req:any,res:any)=>{
      const sinceSec = Math.max(0, parseInt(String(req.query.since||'60'))||60);
      const cutoff = now() - sinceSec*1000;
      const arr = Array.from(st.peers.values()).filter(p=>p.seenAt>=cutoff).sort((a,b)=>b.seenAt-a.seenAt);
      res.json({ ok:true, sinceSec, count: arr.length, peers: arr });
    });

    app.get('/p2p/ping', async (req:any,res:any)=>{
      const addr = String(req.query.addr||''); if(!addr) return res.status(400).json({ok:false,error:'addr required'});
      try{ const rtt = await pingOnce(addr); const id='peer:'+addr; putPeer({id,addr,seenAt:now(),rttMs:rtt}); res.json({ok:true,addr,rttMs:rtt}); }
      catch(e:any){ res.status(502).json({ ok:false, addr, error: e?.message||'ping failed' }); }
    });

    app.get('/metrics/p2p/mini.prom', (_req:any,res:any)=>{
      const peers = Array.from(st.peers.values()); const t=now();
      const active = peers.filter(p => (t - p.seenAt) <= 60_000).length;
      let out = '';
      out += `void_p2p_peers_known ${peers.length}\n`;
      out += `void_p2p_peers_active_60s ${active}\n`;
      const lastRtt = peers.reduce((m,p)=> p.rttMs!==undefined ? p.rttMs : m, -1);
      if (lastRtt >= 0) out += `void_p2p_last_rtt_ms ${lastRtt}\n`;
      res.type('text/plain').send(out);
    });

    app.get('/p2p/mini/health', (_req:any,res:any)=> res.json({ ok:true, selfId: st.selfId, peers: st.peers.size }));
  }
  mount();
})();

// ---------------- require-guard (additive, non-invasive) ----------------
(function requireGuardV1(){
  try {
    // If require exists, do nothing.
    if (typeof require === 'function') return;
  } catch (_e) {
    // Some bundlers throw on typeof require; just swallow.
  }
  // Publish a flag so any optional dev/forensics patch can bail early.
  (globalThis as any).__void_no_require = true;
  // Optional: lightweight logger so we know the guard is active once.
  const g = (globalThis as any);
  if (!g.__void_no_require_logged) {
    g.__void_no_require_logged = true;
    console.log('[require-guard] require not available (ESM) — dev/forensics shims should skip.');
  }
})();

// ---------------- P2P Mini Registry — CLEAN V2 (additive, ESM-safe) ----------------
(function P2PMiniRegistryV2_CLEAN(){
  const TICK = 300;
  type Peer = { id: string; addr: string; lastSeen: number };
  const st = {
    peers: new Map<string, Peer>(),
    selfId: 'void-self', // can be swapped to node id if you expose it globally later
    http: `http://127.0.0.1:${process.env.HTTP_PORT||'4100'}`,
    p2p:  `${process.env.P2P_HOST||'127.0.0.1'}:${process.env.P2P_PORT||'4700'}`,
    lastHandshakeTs: 0,
  };
  function now(){ return Date.now(); }
  function getApp(): any { return (globalThis as any).__void_http_app || (globalThis as any).app; }

  function putPeer(p: {id:string; addr:string}) {
    const cur: Peer = { id: p.id, addr: p.addr, lastSeen: now() };
    st.peers.set(p.id, cur);
    st.lastHandshakeTs = cur.lastSeen;
  }

  function mount(){
    const app:any = getApp();
    if (!app || typeof app.get !== "function") return setTimeout(mount, TICK);
    if ((app as any).__void_p2p_mini_v2_clean_attached) return;
    (app as any).__void_p2p_mini_v2_clean_attached = true;

    // Health (idempotent; if another block defined it, we replace only once)
    app.get('/p2p/mini/health', (_req:any,res:any)=>{
      res.json({ ok:true, selfId: st.selfId, peers: st.peers.size });
    });

    // Add/refresh a peer (simple local registry)
    app.post('/p2p/mini/connect', express.json(), async (req:any,res:any)=>{
      const { id, addr } = req.body || {};
      if (!id || !addr) return res.status(400).json({ ok:false, error:'id and addr required' });
      putPeer({ id, addr });
      return res.json({ ok:true, selfId: st.selfId, received:{id,addr}, peersKnown: st.peers.size });
    });

    // List peers
    app.get('/p2p/mini/peers', (_req:any,res:any)=>{
      const peers = Array.from(st.peers.values()).map(p => ({ id:p.id, addr:p.addr, lastSeen:p.lastSeen }));
      res.json({ ok:true, peers });
    });

    // Prometheus exporter (plain text)
    app.get('/metrics/p2p/mini.prom', (_req:any,res:any)=>{
      res.set('content-type','text/plain; version=0.0.4');
      const lines:string[] = [];
      lines.push('# HELP void_p2p_mini_peers_total Total peers known to the mini registry');
      lines.push('# TYPE void_p2p_mini_peers_total gauge');
      lines.push(`void_p2p_mini_peers_total ${st.peers.size}`);
      lines.push('# HELP void_p2p_mini_last_handshake_ts Unix ms of the last handshake/registration');
      lines.push('# TYPE void_p2p_mini_last_handshake_ts gauge');
      lines.push(`void_p2p_mini_last_handshake_ts ${st.lastHandshakeTs}`);
      lines.push('# HELP void_p2p_mini_self_info Static info about this node (labels)');
      lines.push('# TYPE void_p2p_mini_self_info gauge');
      lines.push(`void_p2p_mini_self_info{http="${st.http}",p2p="${st.p2p}",id="${st.selfId}"} 1`);
      res.send(lines.join('\n')+'\n');
    });

    console.log('[p2p-mini:v2-clean] attached (peers=/p2p/mini/peers, connect=/p2p/mini/connect, prom=/metrics/p2p/mini.prom)');
  }
  mount();
})();

// ---------------- P2P auto-handshake refresher (additive, safe) ----------------
(function p2pAutoHandshakeRefresher(){
  const TICK_MS = Number(process.env.VOID_P2P_AUTO_MS || 15000);
  const peersEnv = (process.env.VOID_P2P_AUTO_PEERS || 'http://127.0.0.1:4101')
    .split(',').map(s => s.trim()).filter(Boolean);
  let started = false, tries = 0;

  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }

  async function pingOnce() {
    const targets = peersEnv.slice();
    for (const base of targets) {
      const url = `${base.replace(/\/+$/,'')}/p2p/hello-now`;
      try { await fetch(url, { method:'GET' }); } catch { /* ignore */ }
    }
  }

  function loop(){
    if (started) return; started = true;
    setInterval(pingOnce, TICK_MS);
    // kick immediately so Prom metrics update fast
    pingOnce().catch(()=>{});
  }

  function waitForApp(){
    const app = getApp();
    if (!app || typeof (app as any).get !== 'function') {
      if (++tries < 120) return setTimeout(waitForApp, 500);
      return;
    }
    loop();
  }

  waitForApp();
})();

// ---------------- P2P auto-handshake refresher v2 (additive, safe) ----------------
(function p2pAutoHandshakeRefresherV2(){
  const TICK_MS = Number(process.env.VOID_P2P_AUTO_MS || 15000);
  const peersEnv = (process.env.VOID_P2P_AUTO_PEERS || 'http://127.0.0.1:4101')
    .split(',').map(s => s.trim()).filter(Boolean);

  async function pingOnce() {
    const targets = peersEnv.slice();
    for (const base of targets) {
      const url = `${base.replace(/\/+$/,'')}/p2p/hello-now`;
      try { await fetch(url, { method: 'GET' }); } catch { /* ignore */ }
    }
  }
  setInterval(pingOnce, TICK_MS);
  pingOnce().catch(()=>{});
})();

// ---------------- P2P mini exporter (additive, safe) ----------------
(function p2pMiniExporter(){
  const TICK_MS = Number(process.env.VOID_P2P_MINI_MS || 15000);
  const peerBase = process.env.VOID_P2P_MINI_PEER || 'http://127.0.0.1:4101';

  let lastHandshakeTs = 0;
  let peersGauge = 0;

  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }

  async function pollOnce(){
    try {
      // Nudge hello; if it succeeds, update the ts
      await fetch(`${peerBase.replace(/\/+$/,'')}/p2p/hello-now`).then(()=>{});
      lastHandshakeTs = Math.floor(Date.now()/1000);
    } catch { /* ignore */ }

    try {
      // Read peers count from our own /p2p/peers
      const r = await fetch('http://127.0.0.1:' + (process.env.HTTP_PORT || '4100') + '/p2p/peers');
      if (r.ok) {
        const j:any = await r.json();
        peersGauge = Array.isArray(j.connected) ? j.connected.length : (Number(j.peers)||0);
      }
    } catch { /* ignore */ }
  }

  function mount(){
    const app:any = getApp(); if (!app || typeof app.get!=="function") return setTimeout(mount, 400);
    if ((app as any).__void_p2p_mini_exporter) return; (app as any).__void_p2p_mini_exporter = true;

    app.get('/__void/metrics/p2p-mini-dup.prom', (_req:any, res:any)=>{
      res.setHeader('Content-Type','text/plain; version=0.0.4');
      res.end(
        '# HELP void_p2p_mini_last_handshake_ts Last successful mini-handshake UNIX timestamp\n' +
        '# TYPE void_p2p_mini_last_handshake_ts gauge\n' +
        `void_p2p_mini_last_handshake_ts ${lastHandshakeTs}\n` +
        '# HELP void_p2p_mini_peers Connected peers (mini)\n' +
        '# TYPE void_p2p_mini_peers gauge\n' +
        `void_p2p_mini_peers ${peersGauge}\n`
      );
    });
  }

  mount();
  setInterval(pollOnce, TICK_MS);
  pollOnce().catch(()=>{});
})();

// ---------------- P2P mini exporter (additive, no deps) ----------------------
(function voidP2PMiniExporter(){
  const TICK_MS = 5000;
  let mounted = false;
  let lastHandshakeTs = 0;
  let peersConnected = 0;

  // Node 18+ has global fetch; fallback to http if needed
  async function safeFetch(url:string, opts:any = {}): Promise<{ok:boolean, text:string}> {
    try {
      const r:any = await (globalThis as any).fetch(url, opts);
      const t = await r.text();
      return { ok: r.ok, text: t };
    } catch (_e) { return { ok:false, text:"" }; }
  }

  async function poll() {
    // 1) Try a hello (records last successful handshake)
    const hello = await safeFetch('http://127.0.0.1:' + (process.env.HTTP_PORT||'4100') + '/p2p/hello-now');
    if (hello.ok) lastHandshakeTs = Math.floor(Date.now()/1000);

    // 2) Pull current peers from our own /metrics (parse Prom text)
    const m = await safeFetch('http://127.0.0.1:' + (process.env.HTTP_PORT||'4100') + '/metrics');
    if (m.ok) {
      const match = m.text.match(/^\s*void_peers_connected\s+([0-9.]+)\s*$/m);
      if (match) peersConnected = Number(match[1]) || 0;
    }
    setTimeout(poll, TICK_MS);
  }

  function promText(): string {
    // No labels here; job-level labels come from Prom scrape config
    return [
      '# HELP void_p2p_mini_peers Current connected peers (from void_peers_connected).',
      '# TYPE void_p2p_mini_peers gauge',
      `void_p2p_mini_peers ${peersConnected}`,
      '',
      '# HELP void_p2p_mini_last_handshake_ts Unix seconds of last successful /p2p/hello-now.',
      '# TYPE void_p2p_mini_last_handshake_ts gauge',
      `void_p2p_mini_last_handshake_ts ${lastHandshakeTs}`,
      ''
    ].join('\n');
  }

  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  function mount(){
    if (mounted) return;
    const app:any = getApp();
    if (!app || typeof app.get !== "function") return setTimeout(mount, 400);

    if (app.__void_p2p_mini_exporter_mounted) return;
    app.__void_p2p_mini_exporter_mounted = true; mounted = true;

    app.get('/__void/metrics/p2p-mini-dup.prom', (_req:any, res:any) => {
      res.set('Content-Type','text/plain; version=0.0.4').send(promText());
    });

    // start polling loop
    setTimeout(poll, 1000);
  }
  mount();
})();

// ---------------- log filter (additive, reversible) -----------------
(function voidLogFilterV1(){
  try{
    const DROP = [
      /\btxroot\/forensics\b/i,
      /\btxroot\/header-shim\b/i,
      /\btxroot\/header-sidecar\b/i,
      /\btxroot\/noop-setter\b/i
    ];
    const origLog = console.log, origInfo = console.info, origWarn = console.warn;
    function shouldDrop(args:any[]){
      const s = args.map(a => (typeof a === 'string' ? a : (a && a.message) || '')).join(' ');
      return DROP.some(rx => rx.test(s));
    }
    console.log = (...a:any[]) => { if (!shouldDrop(a)) origLog.apply(console, a); };
    console.info = (...a:any[]) => { if (!shouldDrop(a)) origInfo.apply(console, a); };
    console.warn = (...a:any[]) => { if (!shouldDrop(a)) origWarn.apply(console, a); };
    (globalThis as any).__void_log_filter_v1 = 'installed';
  }catch{}
})();

// ---------------- forensics v7 kill-switch (additive, reversible) -----------------
(function voidTxrootForensicsKillSwitchV7(){
  try {
    const FLAG_SYM = Symbol.for("void.txroot.forensics.v7.wrapped");
    const FLAG_STR = "__void_txroot_forensics_v7_wrapped__";
    const TICK = 250;
    function markApp(){
      try{
        const app = (globalThis as any).__void_http_app || (globalThis as any).app;
        if (app && typeof app.get === "function") {
          // Prevent the inspector from mounting (mountInspector checks this)
          (app as any).__void_tramp_v7 = true;
          return true;
        }
      }catch{}
      return false;
    }
    function markSegStore(){
      try{
        const Seg:any = (globalThis as any).SegStore;
        if (Seg && Seg.prototype) {
          // Make trampolines think we're already wrapped
          try { Object.defineProperty(Seg.prototype, FLAG_SYM, { value: true, configurable: true }); } catch {}
          try { (Seg.prototype as any)[FLAG_STR] = true; } catch {}
          return true;
        }
      }catch{}
      return false;
    }
    (function loop(){
      let ok1 = false, ok2 = false;
      try { ok1 = markApp(); ok2 = markSegStore(); } catch {}
      if (!(ok1 && ok2)) setTimeout(loop, TICK);
    })();
    (globalThis as any).__void_killswitch_forensics_v7 = "installed";
  } catch {}
})();

// ------------ proposer/auto/status2 shim (derives from v3b exporter) ------------
;(function proposerAutoStatus2Shim(){
  const TICK=400;
  async function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  async function attach(){
    const app:any = await getApp();
    if (!app || typeof app.get !== "function") return setTimeout(attach, TICK);
    if ((app as any).__void_proposer_status2_shim) return;
    (app as any).__void_proposer_status2_shim = true;

    app.get("/proposer/auto/status2", async (_req:any, res:any) => {
      try {
        const r = await fetch("http://127.0.0.1:4100/metrics/void/proposer.v3b.prom");
        const txt = await r.text();
        const enabled = /void_proposer_auto_enabled(?:_v2)?\s+(\d+)/.exec(txt)?.[1];
        const ms      = /void_proposer_auto_ms(?:_v2)?\s+(\d+)/.exec(txt)?.[1];
        const ok = enabled!==undefined && ms!==undefined;
        res.json({ ok, source:"v3b.prom", enabled: enabled? Number(enabled):null, ms: ms? Number(ms):null });
      } catch (e:any) {
        res.status(500).json({ ok:false, error:String(e?.message||e) });
      }
    });
  }
  attach();
})();

// ---------------- WAL v1 bootsafe + endpoints + metrics (additive) ----------------
(async function walV1Bootsafe(){
  const TICK=400;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  function getDataDir(){ return process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data"; }

  async function attach(){
    const app:any = getApp(); if (!app || typeof app.get!=="function") return setTimeout(attach, TICK);
    if ((app as any).__void_wal_v1_mounted) return; (app as any).__void_wal_v1_mounted = true;

    let wal:any = null, info:any = null, replayNeeded = 0, lastSeq = 0, unflushedBytes = 0;

    async function ensure(){
      if (!wal) {
        const mod = await import("../wal/journal.js");
        wal = await mod.Journal.open(getDataDir());
        info = wal.info();
      }
      return wal;
    }

    // health: shows meta + whether replay is needed (we detect valid tail)
    app.get("/wal/health", async (_req:any, res:any)=>{
      try{
        await ensure();
        // quick scan: validate until torn frame; if torn → replayNeeded=1
        replayNeeded = 0;
        let seq=0, count=0;
        for await (const rec of wal.replay({fromSeq:1})) { seq = rec.n; count++; }
        lastSeq = seq;
        const inf = wal.info();
        unflushedBytes = inf.bytes;
        res.json({ ok:true, lastSeq, bytes: inf.bytes, createdAt: inf.createdAt, updatedAt: inf.updatedAt, replayNeeded });
      }catch(e:any){
        res.status(500).json({ ok:false, error: String(e?.message||e) });
      }
    });

    // dry-run preview: returns first N records without applying
    app.get("/wal/replay/preview", async (req:any, res:any)=>{
      try{
        await ensure();
        const limit = Math.max(1, Math.min(100, Number(req.query.limit||10)));
        const out:any[]=[];
        for await (const rec of wal.replay({fromSeq:1})) { out.push(rec); if (out.length>=limit) break; }
        res.json({ ok:true, records: out });
      }catch(e:any){
        res.status(500).json({ ok:false, error: String(e?.message||e) });
      }
    });

    // dev-only append hook (safe to keep; guarded by env in frontends)
    app.post("/wal/dev/append", async (req:any, res:any)=>{
      try{
        await ensure();
        const t = String(req.query.t||"block.save");
        const payload = req.body || { note:"dev" };
        const n = await wal.append(t, payload);
        lastSeq = n;
        const inf = wal.info();
        unflushedBytes = inf.bytes;
        res.json({ ok:true, n });
      }catch(e:any){
        res.status(500).json({ ok:false, error: String(e?.message||e) });
      }
    });

    // Prom exporter
    app.get("/metrics/void/wal.prom", async (_req:any, res:any)=>{
      try{
        await ensure();
        const inf = wal.info();
        res.type("text/plain; version=0.0.4");
        res.write(`# HELP void_wal_last_seq Last WAL sequence number\n# TYPE void_wal_last_seq gauge\nvoid_wal_last_seq ${lastSeq||0}\n`);
        res.write(`# HELP void_wal_bytes WAL file size in bytes\n# TYPE void_wal_bytes gauge\nvoid_wal_bytes ${inf.bytes||0}\n`);
        res.write(`# HELP void_wal_replay_needed 1 if replay needed\n# TYPE void_wal_replay_needed gauge\nvoid_wal_replay_needed ${replayNeeded||0}\n`);
        res.end();
      }catch(e:any){
        res.type("text/plain").send(`# ERROR ${String(e?.message||e)}\n`);
      }
    });
  }
  attach();
})();

// ------------- WAL v1: hook block saves (additive wrapper) -------------
(function walV1SaveHook(){
  const TICK=500;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  async function getWal(){
    const mod = await import("../wal/journal.js");
    const dir = process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data";
    return await mod.Journal.open(dir);
  }
  async function mount(){
    const app:any = getApp(); if (!app || typeof app.get!=="function") return setTimeout(mount, TICK);
    if ((app as any).__void_wal_save_hook) return; (app as any).__void_wal_save_hook = true;

    // expect global nodeCore/saveBlock via existing exports
    const g:any = globalThis as any;
    const core = g.__void_core || g.core || {};
    const original = core.saveBlock || g.saveBlock;
    if (typeof original !== "function") return; // no-op if not present

    const wal = await getWal();

    async function wrappedSaveBlock(block:any){
      // 1) write intent to WAL
      await wal.append("block.save", { number: block?.number, txCount: block?.txs?.length ?? 0 });
      // 2) call real save
      const out = await original(block);
      // 3) optionally mark commit (not required, CRC guards already)
      // await wal.append("block.commit", { number: block?.number });
      return out;
    }

    // patch in-place
    core.saveBlock = wrappedSaveBlock;
    g.saveBlock = wrappedSaveBlock;
  }
  mount();
})();

// ---------------- WAL v1: replay preview + run (additive) ----------------
;(function walV1Replay(){
  const TICK=400;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  async function getWal(){
    const mod = await import("../wal/journal.js");
    const dir = process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data";
    return await mod.Journal.open(dir);
  }
  async function attach(){
    const app:any = getApp(); if (!app || typeof app.get!=="function") return setTimeout(attach, TICK);
    if ((app as any).__void_wal_replay_mounted) return; (app as any).__void_wal_replay_mounted = true;

    let replayed = 0, lastApplied = 0, lastMs = 0;

    app.get("/wal/replay/status", (_req:any, res:any)=>{
      res.json({ ok:true, replayed, lastApplied, lastMs });
    });

    app.post("/wal/replay/run", async (_req:any, res:any)=>{
      const t0 = Date.now();
      try{
        const wal = await getWal();
        replayed = 0; lastApplied = 0;
        for await (const rec of wal.replay({fromSeq:1})) {
          // TODO: apply(rec) once we define handlers; for now count
          replayed++; lastApplied = rec.n;
        }
        lastMs = Date.now()-t0;
        res.json({ ok:true, replayed, lastApplied, ms:lastMs });
      }catch(e:any){
        res.status(500).json({ ok:false, error:String(e?.message||e) });
      }
    });
  }
  attach();
})();

// ---------------- WAL v1: stricter health flag (additive) ----------------
;(function walV1Health2(){
  const TICK=400;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  async function getWal(){
    const mod = await import("../wal/journal.js");
    const dir = process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data";
    return await mod.Journal.open(dir);
  }
  async function attach(){
    const app:any = getApp(); if (!app || typeof app.get!=="function") return setTimeout(attach, TICK);
    if ((app as any).__void_wal_health2) return; (app as any).__void_wal_health2 = true;

    app.get("/wal/health2", async (_req:any, res:any)=>{
      let replayNeeded = 0, lastSeq = 0, bytes = 0, createdAt=0, updatedAt=0;
      try{
        const wal = await getWal();
        const inf = wal.info(); bytes = inf.bytes; createdAt = inf.createdAt; updatedAt = inf.updatedAt;
        try {
          for await (const rec of wal.replay({fromSeq:1})) lastSeq = rec.n;
        } catch { replayNeeded = 1; }
        if (bytes>0 && lastSeq===0) replayNeeded = 1;
        res.json({ ok:true, lastSeq, bytes, createdAt, updatedAt, replayNeeded });
      }catch(e:any){
        res.status(500).json({ ok:false, error:String(e?.message||e) });
      }
    });

    app.get("/metrics/void/wal2.prom", async (_req:any, res:any)=>{
      try{
        const r = await fetch("http://127.0.0.1:4100/wal/health2");
        const j:any = await r.json();
        res.type("text/plain; version=0.0.4");
        res.write(`# HELP void_wal_last_seq Last WAL sequence number\n# TYPE void_wal_last_seq gauge\nvoid_wal_last_seq ${j.lastSeq||0}\n`);
        res.write(`# HELP void_wal_bytes WAL file size in bytes\n# TYPE void_wal_bytes gauge\nvoid_wal_bytes ${j.bytes||0}\n`);
        res.write(`# HELP void_wal_replay_needed 1 if replay needed\n# TYPE void_wal_replay_needed gauge\nvoid_wal_replay_needed ${j.replayNeeded||0}\n`);
        res.end();
      }catch(e:any){
        res.type("text/plain").send(`# ERROR ${String(e?.message||e)}\n`);
      }
    });
  }
  attach();
})();

// ---------------- WAL v1.1: intent+commit wrapper (additive, idempotent) ----------------
;(function walV11IntentCommit(){
  const TICK=400;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  async function getWal(){
    const mod = await import("../wal/journal.js");
    const dir = process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data";
    return await mod.Journal.open(dir);
  }
  async function attach(){
    const app:any = getApp(); if (!app || typeof app.get!=="function") return setTimeout(attach, TICK);
    if ((app as any).__void_wal_v11_wrapper) return; (app as any).__void_wal_v11_wrapper = true;

    const g:any = globalThis as any;
    const core = g.__void_core || g.core || {};
    const original = core.saveBlock || g.saveBlock;
    if (typeof original !== "function") return;

    const wal = await getWal();

    async function wrapped(block:any){
      const n = Number(block?.number ?? -1);
      const txCount = block?.txs?.length ?? 0;
      // 1) intent — always before touching disk
      await wal.append("block.intent", { number:n, txCount });

      // 2) real save
      const out = await original(block);

      // 3) commit — only after successful save
      await wal.append("block.commit", { number:n });

      return out;
    }

    // supersede previous v1 hook safely
    core.saveBlock = wrapped;
    g.saveBlock = wrapped;
    (globalThis as any).__void_wal_v11 = "installed";
  }
  attach();
})();

// ---------------- WAL Safe-Mode (read-only gate + Prom) ----------------
;(function walSafeMode(){
  const TICK=400;
  let forced = 0, auto = 0, lastCheckMs = 0;

  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }

  async function checkAuto(){
    try{
      const r = await fetch("http://127.0.0.1:4100/wal/health2");
      const j:any = await r.json();
      auto = (j && j.replayNeeded) ? 1 : 0;
      lastCheckMs = Date.now();
    }catch{ /* keep previous */ }
    setTimeout(checkAuto, 2000);
  }

  function isOn(){ return forced || auto; }

  function blockIfUnsafe(req:any, res:any, next:any){
    if (!isOn()) return next();
    // deny obvious mutators (keep additive; extend as we add more POSTs)
    const m = (req.method||'GET').toUpperCase();
    if (m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE") {
      return res.status(503).json({ ok:false, safeMode:true, reason: auto? "auto-replay-needed":"forced" });
    }
    next();
  }

  async function attach(){
    const app:any = getApp(); if (!app || typeof app.use!=="function") return setTimeout(attach, TICK);
    if ((app as any).__void_wal_safemode) return; (app as any).__void_wal_safemode = true;

    // middleware first, before route handlers see mutating calls
    app.use(blockIfUnsafe);

    // control + status
    app.post("/wal/safe-mode/force", (req:any,res:any)=>{ forced = 1; res.json({ ok:true, forced }); });
    app.post("/wal/safe-mode/clear", (req:any,res:any)=>{ forced = 0; res.json({ ok:true, forced }); });
    app.get("/wal/safe-mode/status", (_req:any,res:any)=>{
      res.json({ ok:true, forced, auto, on:isOn(), lastCheckMs });
    });

    // minimal Prom exporter
    app.get("/metrics/void/safemode.prom", (_req:any,res:any)=>{
      res.type("text/plain; version=0.0.4");
      res.write(`# HELP void_safe_mode 1 when read-only is active\n# TYPE void_safe_mode gauge\nvoid_safe_mode ${isOn()?1:0}\n`);
      res.end();
    });

    // kick off auto monitor
    checkAuto();
  }
  attach();
})();

//[autodrain-corrupt] // -------------------- FETCH AUTODRAIN (additive, safe) -----------------------
//[autodrain-corrupt] (function FetchAutoDrain(){
//[autodrain-corrupt]   try{
//[autodrain-corrupt]     // only when explicitly enabled
//[autodrain-corrupt]     const ENABLED = (process.env.VOID_FETCH_AUTODRAIN || "0") === "1";
//[autodrain-corrupt]     if (!ENABLED) return;
//[autodrain-corrupt]     // don't double-install
//[autodrain-corrupt]     if ((globalThis as any).__void_fetch_autodrain_installed) return;
//[autodrain-corrupt]     (globalThis as any).__void_fetch_autodrain_installed = true;
//[autodrain-corrupt] 
//[autodrain-corrupt]     const origFetch: any = (globalThis as any).fetch;
//[autodrain-corrupt]     if (typeof origFetch !== "function") return;
//[autodrain-corrupt] 
//[autodrain-corrupt]     (globalThis as any).fetch = async function(...args:any[]){
//[autodrain-corrupt]       const res = await origFetch.apply(this, args);
//[autodrain-corrupt]       try {
//[autodrain-corrupt]         // If there is a body, tee & drain in background so the socket closes cleanly.
//[autodrain-corrupt]         if (res && res.body && typeof res.clone === "function") {
//[autodrain-corrupt]           const clone = res.clone();
//[autodrain-corrupt]           // Kick off a best-effort drain; ignore outcome
//[autodrain-corrupt]           clone.arrayBuffer()
//[autodrain-corrupt]             .catch(()=>{})
//[autodrain-corrupt]             .finally(()=>{ try { (clone as any).body?.cancel?.(); } catch {} });
//[autodrain-corrupt]         }
//[autodrain-corrupt]       } catch {}
//[autodrain-corrupt]       return res;
//[autodrain-corrupt]     };
//[autodrain-corrupt] 
//[autodrain-corrupt]     // bonus: print stack for FD GC warnings so we can pinpoint future offenders
//[autodrain-corrupt]     process.on("warning", (w:any)=>{
//[autodrain-corrupt]       const msg = String(w?.message||"");
//[autodrain-corrupt]       if (msg.includes("Closing file descriptor")) {
//[autodrain-corrupt]         const stack = (w && w.stack) ? w.stack : new Error(String(w.message||"fd")).stack;
//[autodrain-corrupt]         console.error("[fd-gc]", stack);
//[autodrain-corrupt]       }
//[autodrain-corrupt]     });
//[autodrain-corrupt]     console.error("[fetch-autodrain] enabled");
//[autodrain-corrupt]   }catch(e){ try{ console.error("[fetch-autodrain] failed", e); }catch{} }
//[autodrain-corrupt] })();

// -------------------- FETCH AUTODRAIN (additive, safe, v2) -------------------
(function FetchAutoDrainV2(){
  try{
    const ENABLED = (process.env.VOID_FETCH_AUTODRAIN || "0") === "1";
    if (!ENABLED) return;
    if ((globalThis as any).__void_fetch_autodrain_installed_v2) return;
    (globalThis as any).__void_fetch_autodrain_installed_v2 = true;

    const g:any = globalThis as any;
    const origFetch:any = g.fetch;
    if (typeof origFetch !== "function") { console.error("[fetch-autodrain] no fetch present"); return; }

    g.fetch = async function(...args:any[]){
      const res:any = await origFetch.apply(this, args);
      try {
        // Drain clone in background so sockets close promptly; DO NOT cancel after read.
        if (res && typeof res.clone === "function" && res.body) {
          const c:any = res.clone();
          if (typeof c.arrayBuffer === "function") { c.arrayBuffer().then(()=>{}).catch(()=>{}); }
          else if (c.body && typeof c.body.getReader === "function") {
            // Fallback: stream reader drain
            (async () => { try {
              const reader = c.body.getReader();
              for (;;) { const r = await reader.read(); if (r.done) break; }
              try { reader.releaseLock && reader.releaseLock(); } catch {}
            } catch {} })();
          }
        }
      } catch {}
      return res;
    };

    // If Node emits the FD-GC warning, also print a stack so we can pinpoint callers.
    process.on("warning", (w:any)=>{
      const msg = String(w?.message || "");
      if (msg.includes("Closing file descriptor")) {
        const stack = (w && w.stack) ? w.stack : new Error(msg).stack;
        console.error("[fd-gc]", stack);
      }
    });

    console.error("[fetch-autodrain] enabled");
  }catch(e){ try{ console.error("[fetch-autodrain] failed", e); }catch{} }
})();

// -------------------- HTTP AUTODRAIN (client sockets, v1) --------------------
(async function HttpAutoDrainV1(){
  try{
    if ((globalThis as any).__void_http_autodrain_v1) return;
    (globalThis as any).__void_http_autodrain_v1 = true;

    const http  = await import('node:http');
    const https = await import('node:https');

    function tuneAgent(agent:any){
      try{
        if (!agent) return;
        // Keep-alive but retire idle sockets quickly to avoid FD churn
        agent.keepAlive = true;
        if (agent.maxSockets && agent.maxSockets < 64) agent.maxSockets = 64;
        // Node >=18: freeSocketTimeout exists; otherwise harmless
        (agent as any).freeSocketTimeout = 2000;
      }catch{}
    }
    tuneAgent((http as any).globalAgent);
    tuneAgent((https as any).globalAgent);

    function wrapRequest(mod:any, label:string){
      const orig = mod.request;
      mod.request = function(...args:any[]){
        const req = orig.apply(this, args);
        req.on('response', (res:any)=>{
          // If nobody attaches a data/readable listener, drain quietly
          const t = setImmediate(()=>{
            if (res.destroyed) return;
            const hasConsumer = res.listenerCount('data') > 0 || res.listenerCount('readable') > 0;
            if (!hasConsumer){
              res.on('error', ()=>{});
              try { res.resume(); } catch {}
            }
          });
          res.once('close', ()=>{ try{ clearImmediate(t); }catch{} });
        });
        return req;
      };
    }
    wrapRequest(http,  'http');
    wrapRequest(https, 'https');

    console.error("[http-autodrain] installed");
  }catch(e){ try{ console.error("[http-autodrain] failed", e); }catch{} }
})();

// [__void_extracted_fs_autoclose_guard_v1] extracted to src/diag/fs_autoclose_guard_v1.ts
try { require('../diag/fs_autoclose_guard_v1'); } catch (e:any) {
  try { console.error('[fs-guard.v1] require failed', e?.message || e); } catch {}
}

// [__void_extracted_fs_autoclose_guard_v2] extracted to src/diag/fs_autoclose_guard_v2.ts
try { require('../diag/fs_autoclose_guard_v2'); } catch (e:any) {
  try { console.error('[fs-guard.v2] require failed', e?.message || e); } catch {}
}
// ---------------- Listener ceiling guard (additive, ESM-safe) ------------------
(function ListenerCeilingGuardV1(){
  try{
    if ((globalThis as any).__void_listener_guard_v1) return;
    (globalThis as any).__void_listener_guard_v1 = true;

    // Stop "MaxListenersExceededWarning" on process entirely.
    try { (process as any).setMaxListeners?.(0); } catch {}

    // Also bump the default for any new EventEmitters in userland/builtins.
    (async ()=>{ try {
      const { createRequire } = await import('node:module');
      const req = createRequire(import.meta.url);
      const events = req('node:events');
      events.defaultMaxListeners = 0;
      console.error("[listeners.guard] process+events ceiling set to unlimited");
    } catch {} })();
  }catch{}
})();

// ----------- Optional: mute legacy v1 shim error banners (harmless) ------------
(function ConsoleFilterForLegacyShims(){
  try{
    if ((globalThis as any).__void_console_filter_v1) return;
    (globalThis as any).__void_console_filter_v1 = true;
    const origErr = console.error.bind(console);
    console.error = function(...args){
      const first = args?.[0] ? String(args[0]) : "";
      if (first.startsWith("[fs-autoclose] failed") || first.startsWith("[http-autodrain] failed")) {
        // Drop only the legacy v1 shim failure banners; keep everything else.
        return;
      }
      return origErr(...args);
    };
    console.log = console.log.bind(console);
  }catch{}
})();

// ---------------- Listener ceiling guard (additive, ESM-safe) ------------------
(function LCG_DISABLED_DISABLEDV1(){
  try{
    if ((globalThis as any).__void_listener_guard_v1) return;
    (globalThis as any).__void_listener_guard_v1 = true;
    try { (process as any).setMaxListeners?.(0); } catch {}
    (async ()=>{ try {
      const { createRequire } = await import('node:module');
      const req = createRequire(import.meta.url);
      const events = req('node:events');
      events.defaultMaxListeners = 0;
      console.error("[listeners.guard] process+events ceiling set to unlimited");
    } catch {} })();
  }catch{}
})();
// -------- proposer.pump.v1 (additive, non-recursive, rescue sealer) --------
(function ProposerPumpV1(){
  const TICK=400;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  function getNode(){ return (globalThis as any).__void_node || (globalThis as any).node; }

  let pumping = false;
  async function pumpOnce(max:number){
    if (pumping) return {ok:false, reason:"busy"};
    const node:any = getNode();
    if (!node || !node.store || !node.mempool) return {ok:false, reason:"node-missing"};
    pumping = true;
    try {
      // Pull up to N txs from mempool into a batch, then seal via existing saveBlock path.
      const txs:any[] = [];
      const cap = Math.max(1, Math.min(+max||1, 1000));
      // Prefer pending bridge if present
      const pq = (node.pending && Array.isArray(node.pending.txs)) ? node.pending.txs : (node.mempool.txs || []);
      while (txs.length < cap && pq.length) txs.push(pq.shift());
      // If nothing to seal but empty-policy is enabled, still produce an empty block
      const allowEmpty = true;

      const nowHead = await node.store.getHeadNumber?.() ?? -1;
      const sealed = await node.store.saveBlock({ txs, allowEmpty });
      const newHead = await node.store.getHeadNumber?.() ?? -1;

      return {ok:true, took:txs.length, fromHead:nowHead, toHead:newHead, sealed};
    } catch(e:any){
      return {ok:false, error:String(e && e.stack || e)};
    } finally { pumping = false; }
  }

  function mount(){
    const app:any = getApp(); if (!app || typeof app.get!=="function") return setTimeout(mount, TICK);
    if ((app as any).__void_pump_v1) return; (app as any).__void_pump_v1 = true;

    app.post("/proposer/pump.v1", async (req:any, res:any)=>{
      const max = Number((req.query && req.query.max) || 3);
      const out = await pumpOnce(max);
      res.type("application/json").send(JSON.stringify(out));
    });

    // Optional: alias for convenience
    app.post("/proposer/seal-now.v1", async (req:any,res:any)=>{
      const max = Number((req.query && req.query.max) || 3);
      const out = await pumpOnce(max);
      res.type("application/json").send(JSON.stringify(out));
    });

    // Prom-style health
    app.get("/__void/metrics/proposer.pump.v1.prom", async (_req:any, res:any)=>{
      res.type("text/plain; version=0.0.4").send("# HELP void_proposer_pump_v1 1 if mounted\n# TYPE void_proposer_pump_v1 gauge\nvoid_proposer_pump_v1 1\n");
    });
    // eslint-disable-next-line no-console
    console.error("[proposer.pump.v1] mounted: POST /proposer/pump.v1?max=3");
  }
  mount();
})();
// -------- proposer.pump.v1b (queue-first, background, no-empty-by-default, non-recursive) --------
(function ProposerPumpV1b(){
  const TICK=400;
  const SAVE_TIMEOUT_MS=30000;

  const G:any = (globalThis as any);
  function now(){ return Date.now(); }
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  function getNode(){ return (globalThis as any).__void_node || (globalThis as any).node; }

  if (!G.__void_pump_v1b_state){
    G.__void_pump_v1b_state = {
      busy:false,
      in_flight:false,
      job_id:0,

      calls:0,
      started:0,
      noop:0,
      ok:0,
      errors:0,
      timeouts:0,

      last_job_id:0,
      last_ms:0,
      last_err:"",
      last_ts:0,
      last_from:-1,
      last_to:-1,
      last_took:0,
      last_allow_empty:false,
    };
  }
  const S:any = G.__void_pump_v1b_state;

  function takeFromQueue(node:any, cap:number){
    const q = node?.proposer?.queue;
    if (Array.isArray(q) && q.length) {
      const n = Math.max(0, Math.min(cap, q.length));
      return q.splice(0, n);
    }
    const p = node?.pending?.txs;
    if (Array.isArray(p) && p.length) {
      const n = Math.max(0, Math.min(cap, p.length));
      return p.splice(0, n);
    }
    const m = node?.mempool?.txs;
    if (Array.isArray(m) && m.length) {
      const n = Math.max(0, Math.min(cap, m.length));
      return m.splice(0, n);
    }
    return [];
  }

  async function withTimeout<T>(promise:Promise<T>, ms:number): Promise<T>{
    return await Promise.race([
      promise,
      new Promise<T>((_, rej)=>setTimeout(()=>rej(new Error(`timeout ${ms}ms`)), ms)),
    ]);
  }

  async function getHeadBestEffort(store:any){
    try{
      if (typeof store?.getHeadNumber === "function") return await store.getHeadNumber();
      if (typeof store?.getHead === "function") return await store.getHead();
      const h = (store && (store.head ?? store._head ?? store.lastNumber));
      if (typeof h === "number") return h;
      return -1;
    }catch{ return -1; }
  }

  function startPump(max:number, allowEmpty:boolean){
    S.calls++;

    if (S.busy || S.in_flight) {
      return {ok:false, reason:"busy", state:S};
    }

    const node:any = getNode();
    if (!node || !node.store) return {ok:false, reason:"node-missing"};

    const cap = Math.max(1, Math.min(+max||1, 1000));
    const txs:any[] = takeFromQueue(node, cap);

    // IMPORTANT: do NOT attempt empty seals by default (they can be slow / pointless)
    if (!allowEmpty && txs.length === 0) {
      S.noop++;
      S.last_took = 0;
      S.last_allow_empty = false;
      S.last_ts = now();
      return {ok:true, noop:true, took:0, allowEmpty:false, state:S};
    }

    const jobId = (S.job_id = (S.job_id||0) + 1);
    S.started++;
    S.busy = true;
    S.in_flight = true;
    S.last_job_id = jobId;
    S.last_took = txs.length;
    S.last_allow_empty = !!allowEmpty;
    S.last_err = "";
    S.last_ms = 0;
    S.last_ts = now();

    // Fire in background so HTTP never waits on saveBlock.
    setImmediate(async ()=>{
      const t0 = now();
      try{
        const before = await getHeadBestEffort(node.store);
        const sealed = await withTimeout(Promise.resolve(node.store.saveBlock({ txs, allowEmpty })), SAVE_TIMEOUT_MS);
        const after  = await getHeadBestEffort(node.store);

        const ms = now() - t0;
        S.ok++;
        S.last_ms = ms;
        S.last_ts = now();
        S.last_err = "";
        S.last_from = Number(before ?? -1);
        S.last_to   = Number(after ?? -1);

        (G.__void_pump_v1b_last_result ||= {});
        G.__void_pump_v1b_last_result = {ok:true, jobId, took:txs.length, fromHead:before, toHead:after, sealed, ms};
      }catch(e:any){
        const ms = now() - t0;
        const err = String((e && (e.stack || e)) || e);
        if (err.includes("timeout")) S.timeouts++;
        S.errors++;
        S.last_ms = ms;
        S.last_ts = now();
        S.last_err = err;
        (G.__void_pump_v1b_last_result ||= {});
        G.__void_pump_v1b_last_result = {ok:false, jobId, took:txs.length, error:err, ms};
      }finally{
        S.in_flight = false;
        S.busy = false;
      }
    });

    return {ok:true, started:true, jobId, took:txs.length, allowEmpty, state:S};
  }

  function mount(){
    const app:any = getApp(); if (!app || typeof app.post!=="function") return setTimeout(mount, TICK);
    if ((app as any).__void_pump_v1b) return; (app as any).__void_pump_v1b = true;

    // default: empty=0 (NO empty seals)
    app.post("/proposer/pump.v1b", async (req:any,res:any)=>{
      const max = Number((req.query && req.query.max) || 5);
      const empty = String((req.query && req.query.empty) || "0") === "1";
      const out = startPump(max, empty);
      res.type("application/json").send(JSON.stringify(out));
    });

    app.get("/proposer/pump.v1b/status", (_req:any,res:any)=>{
      res.type("application/json").send(JSON.stringify({
        ok:true,
        state:S,
        last_result: (globalThis as any).__void_pump_v1b_last_result || null
      }));
    });

    app.get("/__void/metrics/proposer.pump.v1b.prom", (_req:any,res:any)=>{
      res.type("text/plain; version=0.0.4").send(
        "# HELP void_proposer_pump_v1b 1 if mounted\n# TYPE void_proposer_pump_v1b gauge\nvoid_proposer_pump_v1b 1\n" +
        "# HELP void_proposer_pump_v1b_busy 1 if busy\n# TYPE void_proposer_pump_v1b_busy gauge\nvoid_proposer_pump_v1b_busy " + (S.busy?1:0) + "\n" +
        "# HELP void_proposer_pump_v1b_in_flight 1 if background seal running\n# TYPE void_proposer_pump_v1b_in_flight gauge\nvoid_proposer_pump_v1b_in_flight " + (S.in_flight?1:0) + "\n" +
        "# HELP void_proposer_pump_v1b_calls_total calls\n# TYPE void_proposer_pump_v1b_calls_total counter\nvoid_proposer_pump_v1b_calls_total " + (S.calls||0) + "\n" +
        "# HELP void_proposer_pump_v1b_started_total started\n# TYPE void_proposer_pump_v1b_started_total counter\nvoid_proposer_pump_v1b_started_total " + (S.started||0) + "\n" +
        "# HELP void_proposer_pump_v1b_noop_total noop (no empty seals)\n# TYPE void_proposer_pump_v1b_noop_total counter\nvoid_proposer_pump_v1b_noop_total " + (S.noop||0) + "\n" +
        "# HELP void_proposer_pump_v1b_ok_total ok\n# TYPE void_proposer_pump_v1b_ok_total counter\nvoid_proposer_pump_v1b_ok_total " + (S.ok||0) + "\n" +
        "# HELP void_proposer_pump_v1b_errors_total errors\n# TYPE void_proposer_pump_v1b_errors_total counter\nvoid_proposer_pump_v1b_errors_total " + (S.errors||0) + "\n" +
        "# HELP void_proposer_pump_v1b_timeouts_total timeouts\n# TYPE void_proposer_pump_v1b_timeouts_total counter\nvoid_proposer_pump_v1b_timeouts_total " + (S.timeouts||0) + "\n" +
        "# HELP void_proposer_pump_v1b_last_ms last duration\n# TYPE void_proposer_pump_v1b_last_ms gauge\nvoid_proposer_pump_v1b_last_ms " + (S.last_ms||0) + "\n" +
        "# HELP void_proposer_pump_v1b_last_ts_ms last timestamp ms\n# TYPE void_proposer_pump_v1b_last_ts_ms gauge\nvoid_proposer_pump_v1b_last_ts_ms " + (S.last_ts||0) + "\n" +
        "# HELP void_proposer_pump_v1b_last_from head before\n# TYPE void_proposer_pump_v1b_last_from gauge\nvoid_proposer_pump_v1b_last_from " + (S.last_from??-1) + "\n" +
        "# HELP void_proposer_pump_v1b_last_to head after\n# TYPE void_proposer_pump_v1b_last_to gauge\nvoid_proposer_pump_v1b_last_to " + (S.last_to??-1) + "\n" +
        "# HELP void_proposer_pump_v1b_last_took last txs\n# TYPE void_proposer_pump_v1b_last_took gauge\nvoid_proposer_pump_v1b_last_took " + (S.last_took??0) + "\n"
      );
    });

    console.error("[proposer.pump.v1b] mounted: POST /proposer/pump.v1b?max=5&empty=0 (background; empty seals off by default)");
  }
  mount();
})();

// -------- proposer.seal.v7-guard (additive, non-recursive, one-shot) --------
(function ProposerSealV7Guard(){
  const TICK=400;

  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  function getNode(){ return (globalThis as any).__void_node || (globalThis as any).node; }

  // Global re-entry lock + counters
  const G:any = (globalThis as any);
  if (!G.__void_sealguard){ 
    G.__void_sealguard = {
      busy:false,
      calls:0, blocked:0, errors:0, ok:0,
      lastOkBlock:-1, lastErr:"", lastTs:0
    };
  }
  const S = G.__void_sealguard;

  async function getHeadNumberSafe(node:any){
    try {
      if (node?.store?.getHeadNumber) return await node.store.getHeadNumber();
      if (node?.store?.headNumber != null) return node.store.headNumber;
    } catch {}
    return -1;
  }

  function takeFromQueues(node:any, cap:number){
    const out:any[] = [];
    const capN = Math.max(1, Math.min(+cap||1, 1000));
    const sources = [
      () => node?.proposer?.queue,
      () => node?.pending?.txs,
      () => node?.mempool?.txs,
    ];
    for (const getQ of sources){
      const q = getQ();
      if (Array.isArray(q) && q.length){
        const n = Math.min(capN - out.length, q.length);
        out.push(...q.splice(0, n));
        if (out.length >= capN) break;
      }
    }
    return out;
  }

  async function sealOnceNoRecurse(max:number){
    S.calls++; S.lastTs = Date.now();
    if (S.busy){ S.blocked++; return {ok:false, reason:"reentry-blocked"}; }
    const node:any = getNode();
    if (!node || !node.store) { S.errors++; S.lastErr="node-missing"; return {ok:false, reason:"node-missing"}; }

    S.busy = true;
    try {
      const head0 = await getHeadNumberSafe(node);
      const txs = takeFromQueues(node, Math.max(1, +max||1));
      const allowEmpty = true; // let policy decide; we want forward motion

      // CRITICAL: call store.saveBlock directly, no proposer hooks.
      const sealed = await node.store.saveBlock({ txs, allowEmpty });

      const head1 = await getHeadNumberSafe(node);
      const advanced = (head1 > head0) && head1 >= 0;

      if (advanced) { S.ok++; S.lastOkBlock = head1; }
      return {ok: true, took: txs.length, head0, head1, advanced, sealed};
    } catch (e:any){
      S.errors++; S.lastErr = String(e && e.stack || e);
      return {ok:false, error:S.lastErr};
    } finally {
      S.busy = false;
    }
  }

  function mount(){
    const app:any = getApp(); if (!app || typeof app.post !== "function") return setTimeout(mount, TICK);
    if ((app as any).__void_sealguard_mounted) return; (app as any).__void_sealguard_mounted = true;

    // POST /proposer/seal/once-v7?max=10
    app.post("/proposer/seal/once-v7", async (req:any,res:any)=>{
      const max = Number(req.query.max ?? 1);
      const r = await sealOnceNoRecurse(max);
      res.json(r);
    });

    // POST /proposer/queue/drain-safe?max=20  (drain queues then seal once)
    app.post("/proposer/queue/drain-safe", async (req:any,res:any)=>{
      const max = Number(req.query.max ?? 1);
      const r = await sealOnceNoRecurse(max);
      res.json(r);
    });

    // Prom-style metrics
    app.get("/metrics/void/sealguard.prom", (_req:any, res:any)=>{
      res.type("text/plain; version=0.0.4; charset=utf-8").send(
        [
          "# HELP void_sealguard_mounted 1 if sealguard mounted",
          "# TYPE void_sealguard_mounted gauge",
          "void_sealguard_mounted 1",
          "# HELP void_sealguard_calls_total Total calls to guard seal",
          "# TYPE void_sealguard_calls_total counter",
          `void_sealguard_calls_total ${S.calls}`,
          "# HELP void_sealguard_blocked_total Reentry blocks",
          "# TYPE void_sealguard_blocked_total counter",
          `void_sealguard_blocked_total ${S.blocked}`,
          "# HELP void_sealguard_errors_total Errors on seal",
          "# TYPE void_sealguard_errors_total counter",
          `void_sealguard_errors_total ${S.errors}`,
          "# HELP void_sealguard_ok_total Successful advancing seals",
          "# TYPE void_sealguard_ok_total counter",
          `void_sealguard_ok_total ${S.ok}`,
          "# HELP void_sealguard_last_ok_block Last block that advanced",
          "# TYPE void_sealguard_last_ok_block gauge",
          `void_sealguard_last_ok_block ${S.lastOkBlock}`,
          "# HELP void_sealguard_last_ts_ms Last call timestamp (ms)",
          "# TYPE void_sealguard_last_ts_ms gauge",
          `void_sealguard_last_ts_ms ${S.lastTs}`,
          "# HELP void_sealguard_busy 1 if in-flight",
          "# TYPE void_sealguard_busy gauge",
          `void_sealguard_busy ${S.busy?1:0}`
        ].join("\n")+"\n"
      );
    });
  }
  mount();
})();
// ---------- head.mount.v2 (additive, idempotent) ----------
(function HeadMountV2(){
  const TICK=400;
  const G:any = (globalThis as any);

  function getApp(){ return G.__void_http_app || (G as any).app; }
  function getNode(){ return G.__void_node || (G as any).node; }

  // [esm-fix] const path = require("node:path");
  // [esm-fix] const fs   = require("node:fs");

  function dataDir(){
    return process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data";
  }
  function headsJsonPath(){
    return path.join(dataDir(), "heads.json");
  }

  function readHeadsJson(){
    try { return JSON.parse(fs.readFileSync(headsJsonPath(), "utf8")); } catch(_e){ return null; }
  }
  function writeHeadsJson(n:number){
    try { fs.writeFileSync(headsJsonPath(), JSON.stringify({ head:n, number:n, hash:"0x0" })+"\n"); return true; } catch(_e){ return false; }
  }

  async function bestFromStore(node:any){
    // Try API first
    try { if (node?.store?.getHeadNumber) { const n = await node.store.getHeadNumber(); if (typeof n === "number") return n; } } catch(_e){}
    // Try known fields
    try { if (node?.store?.headNumber != null) return node.store.headNumber; } catch(_e){}
    try { if (node?.store?.latestNumber != null) return node.store.latestNumber; } catch(_e){}

    // Disk scan fallback: look for max segment index or receipts/index
    try {
      const segDir = path.join(dataDir(), "segments");
      let maxN = -1;
      if (fs.existsSync(segDir)) {
        for (const d of fs.readdirSync(segDir)) {
          // accept numbers or hex-ish dirs; you’ve used decimal ranges before
          const m = String(d).match(/^(\d+)(?:-|$)/);
          if (m) { const n = parseInt(m[1],10); if (Number.isFinite(n) && n > maxN) maxN = n; }
        }
      }
      return maxN;
    } catch(_e){}
    return -1;
  }

  async function ensureGenesis(node:any){
    // Use existing helpers if present; else force an empty block 0
    try { if (node?.store?.ensureGenesis) { await node.store.ensureGenesis(); return true; } } catch(_e){}
    try { if (node?.store?.saveBlock) { await node.store.saveBlock({ txs:[], allowEmpty:true, forceGenesis:true }); return true; } } catch(_e){}
    return false;
  }

  async function mountHead(){
    const node:any = getNode();
    if (!node || !node.store) return { ok:false, reason:"node-missing" };

    // 1) prefer disk heads.json if valid
    const hj = readHeadsJson();
    if (hj && typeof hj.number === "number" && hj.number >= 0) {
      setInMem(node, hj.number);
      return { ok:true, source:"heads.json", head:hj.number, seeded:false, wrote:false };
    }

    // 2) derive from store/disk
    let n = await bestFromStore(node);
    if (n < 0) {
      // truly empty -> seed genesis
      const seeded = await ensureGenesis(node);
      n = await bestFromStore(node);
      setInMem(node, n);
      if (n >= 0) writeHeadsJson(n);
      return { ok:(n>=0), source:"seed", head:n, seeded, wrote:(n>=0) };
    } else {
      setInMem(node, n);
      const wrote = writeHeadsJson(n);
      return { ok:true, source:"scan", head:n, seeded:false, wrote };
    }
  }

  function setInMem(node:any, n:number){
    try { node.store.headNumber = n; } catch(_e){}
    try { if (node.store.setHeadNumber) node.store.setHeadNumber(n); } catch(_e){}
  }

  function mount(){
    const app:any = getApp(); if (!app || typeof app.post !== "function") return setTimeout(mount, TICK);
    if (app.__void_head_mount_v2) return; app.__void_head_mount_v2 = true;

    app.post("/blocks/head/bootstrap", async (_req:any,res:any)=>{
      const r = await mountHead(); res.json(r);
    });

    // Prom exporter
    app.get("/metrics/void/headmount.prom", async (_req:any,res:any)=>{
      const node:any = getNode();
      const head = (node && node.store && (node.store.headNumber ?? -1)) ?? -1;
      const hj = readHeadsJson(); const hjN = hj && typeof hj.number==="number" ? hj.number : -1;
      res.type("text/plain; version=0.0.4; charset=utf-8").send(
        [
          "# HELP void_headmount_head Current in-memory headNumber",
          "# TYPE void_headmount_head gauge",
          `void_headmount_head ${head}`,
          "# HELP void_headmount_heads_json Head from heads.json (or -1)",
          "# TYPE void_headmount_heads_json gauge",
          `void_headmount_heads_json ${hjN}`
        ].join("\n")+"\n"
      );
    });
  }
  mount();
})();

// -------- head.rebind.v1 (additive, idempotent) --------
(function HeadRebindV1(){
  const TICK=400;
  const G:any = (globalThis as any);
  function getApp(){ return G.__void_http_app || (G as any).app; }
  function getNode(){ return G.__void_node   || (G as any).node; }
  function headsPath(){ return (process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data") + "/heads.json"; }

  async function readHeads(){
    try { return JSON.parse(await (await import("node:fs/promises")).readFile(headsPath(), "utf8")); } catch(_e){ return null; }
  }
  function currentHead(node:any){
    try { if (typeof node?.store?.getHeadNumber === "function") return node.store.getHeadNumber(); } catch {}
    try { if (node?.store?.headNumber != null) return node.store.headNumber; } catch {}
    try { if (node?.store?.latestNumber != null) return node.store.latestNumber; } catch {}
    return -1;
  }
  async function setHead(node:any, n:number){
    try { node.store.headNumber = n; } catch {}
    try { if (typeof node.store.setHeadNumber === "function") await node.store.setHeadNumber(n); } catch {}
    try { node.store.latestNumber = n; } catch {}
  }

  async function rebind(){
    const node = getNode(); if (!node || !node.store) return {ok:false, reason:"node-missing"};
    let h = await currentHead(node); if (typeof h !== "number") h = -1;
    if (h >= 0) return {ok:true, changed:false, head:h, source:"mem"};
    const hj = await readHeads(); const n = (hj && typeof hj.number==="number") ? hj.number : -1;
    if (n >= 0){ await setHead(node, n); return {ok:true, changed:true, head:n, source:"heads.json"}; }
    return {ok:false, head:h, source:"none"};
  }

  function mount(){
    const app:any = getApp(); if (!app || typeof app.post!=="function") return setTimeout(mount, TICK);
    if (app.__void_head_rebind_v1) return; app.__void_head_rebind_v1 = true;

    // Manual nudge if needed
    app.post("/dev/head/rebind", async (_req:any,res:any)=>{ res.json(await rebind()); });

    // First minute: retry until head >=0
    let tries = 0;
    (async function loop(){
      const r = await rebind();
      if (!(r && r.ok && r.head >= 0) && ++tries < 150) return setTimeout(loop, 400);
    })();
  }
  mount();
})();
// -------- proposer.v7-decom.v1 (additive, idempotent) --------
(function ProposerV7DecomV1(){
  const TICK=400;
  const G:any = (globalThis as any);
  function getApp(){ return G.__void_http_app || (G as any).app; }

  // Minimal in-memory counter for observability
  G.__void_v7_decom = G.__void_v7_decom || { calls:0, lastTs:0 };

  function mount(){
    const app:any = getApp(); if (!app || typeof app.post!=="function") return setTimeout(mount, TICK);
    if (app.__void_v7_decom_v1) return; app.__void_v7_decom_v1 = true;

    const deny = (req:any, res:any)=>{
      try { G.__void_v7_decom.calls++; G.__void_v7_decom.lastTs = Date.now(); } catch {}
      res.status(410).json({
        ok:false,
        error:"gone",
        message:"/proposer/seal/once-v7 is deprecated and disabled. Use auto-proposer or once-safe.",
        replace:[
          "POST /proposer/auto/start?ms=2000",
          "POST /proposer/seal/once-safe?max=10"
        ]
      });
    };

    // Block common v7 routes (we don't delete existing code; we shadow them first)
    app.post("/proposer/seal/once-v7", deny);
    app.post("/proposer/seal/v7/once", deny);
    app.post("/proposer/v7/seal",      deny);
    app.post("/proposer/v7/start",     deny);

    // Optional: provide a v7-safe single tick alias that does NOT recurse
    app.post("/proposer/seal/once-safe", async (_req:any, res:any)=>{
      try {
        const node:any = (G.__void_node || (G as any).node);
        if (!node?.store) return res.json({ok:false, error:"node-missing"});
        // Guard: refuse if head unknown
        const h = (typeof node.store.getHeadNumber==="function")
          ? await node.store.getHeadNumber()
          : (node.store.headNumber ?? node.store.latestNumber ?? -1);
        if (!(typeof h === "number" && h >= 0)) return res.json({ok:false, error:"head<0"});

        // Non-recursive: try proposer.tick once if it exists, else no-op
        if (typeof node?.proposer?.tick === "function") {
          const before = h;
          await node.proposer.tick({max:10, allowEmpty:false, safe:true});
          const after = (typeof node.store.getHeadNumber==="function")
            ? await node.store.getHeadNumber()
            : (node.store.headNumber ?? node.store.latestNumber ?? -1);
          return res.json({ok:true, head0:before, head1:after, advanced:(Number(after)>Number(before))});
        }
        return res.json({ok:false, error:"no-proposer-tick"});
      } catch (e:any) {
        return res.json({ok:false, error:String(e && e.message || e)});
      }
    });

    // Prometheus exporter so we can alert if anything still hits v7
    app.get("/metrics/void/v7_decom.prom", (_req:any, res:any)=>{
      const s = G.__void_v7_decom || {calls:0,lastTs:0};
      res.type("text/plain; version=0.0.4; charset=utf-8").send([
        "# HELP void_v7_decom_calls_total Deprecated v7 endpoint calls since boot",
        "# TYPE void_v7_decom_calls_total counter",
        `void_v7_decom_calls_total ${Number(s.calls)||0}`,
        "# HELP void_v7_decom_last_ts_ms Last call timestamp (ms) to deprecated v7 endpoint",
        "# TYPE void_v7_decom_last_ts_ms gauge",
        `void_v7_decom_last_ts_ms ${Number(s.lastTs)||0}`
      ].join("\n")+"\n");
    });
  }
  mount();
})();
// -------- proposer.v7-guard.localonly.v1 (additive) --------
(function ProposerV7GuardLocalOnlyV1(){
  const TICK=400;
  const G:any = (globalThis as any);
  function getApp(){ return G.__void_http_app || (G as any).app; }

  function mount(){
    const app:any = getApp(); if (!app || typeof app.all!=="function") return setTimeout(mount, TICK);
    if (app.__void_v7_guard_localonly_v1) return; app.__void_v7_guard_localonly_v1 = true;

    // local-only gate
    function isLocal(req:any){
      try {
        const ip = (req.ip || req.connection?.remoteAddress || "").replace("::ffff:","");
        return ip === "127.0.0.1" || ip === "::1";
      } catch{ return false; }
    }

    const deny = (req:any, res:any)=>{
      const local = isLocal(req);
      if (!local) return res.status(403).json({ok:false, error:"forbidden"});
      // If local, still deny v7 usage with 410 (matches your decom block behavior)
      res.status(410).json({ok:false, error:"gone", message:"v7 disabled"});
    };

    // Wildcard catch for any "/proposer/...v7..." attempts (any method)
    app.all(/\/proposer\/.*v7.*/i, deny);
  }
  mount();
})();
// -------- proposer.once-safe2 (allowEmpty opt) --------
(function ProposerOnceSafe2(){
  const TICK=400, G:any=(globalThis as any);
  function getApp(){ return G.__void_http_app || (G as any).app; }
  function getNode(){ return G.__void_node   || (G as any).node; }
  function mount(){
    const app:any = getApp(); if (!app || typeof app.post!=="function") return setTimeout(mount, TICK);
    if (app.__void_once_safe2) return; app.__void_once_safe2 = true;

    app.post("/proposer/seal/once-safe2", async (req:any,res:any)=>{
      try{
        const node:any = getNode(); if (!node?.store) return res.json({ok:false, error:"node-missing"});
        const q = req.query||{};
        const allowEmpty = String(q.allowEmpty||"false").toLowerCase()==="true";
        const max = Number(q.max||10);

        const head0 = (typeof node.store.getHeadNumber==="function")
          ? await node.store.getHeadNumber()
          : (node.store.headNumber ?? node.store.latestNumber ?? -1);

        if (typeof node?.proposer?.tick === "function") {
          await node.proposer.tick({max, allowEmpty, safe:true});
        }

        const head1 = (typeof node.store.getHeadNumber==="function")
          ? await node.store.getHeadNumber()
          : (node.store.headNumber ?? node.store.latestNumber ?? -1);

        res.json({ok:true, head0, head1, advanced:(Number(head1)>Number(head0)), allowEmpty, max});
      }catch(e:any){ res.json({ok:false, error:String(e?.message||e)}); }
    });
  }
  mount();
})();
// -------- proposer.v7-guard.localonly.v2 (counter + headers + stricter) --------
(function ProposerV7GuardLocalOnlyV2(){
  const TICK=400;
  const G:any = (globalThis as any);
  function getApp(){ return G.__void_http_app || (G as any).app; }

  // tiny in-memory counter; also exposed via /metrics/void/v7_guard.prom (below)
  let hits = 0, lastTs = 0;

  function isLocal(req:any){
    try {
      const ip = (req.ip || req.connection?.remoteAddress || "").replace("::ffff:","");
      return ip === "127.0.0.1" || ip === "::1";
    } catch{ return false; }
  }

  function deny(req:any, res:any){
    hits++; lastTs = Date.now();
    res.setHeader("X-Void-V7-Guard", "blocked");
    if (!isLocal(req)) return res.status(403).json({ok:false, error:"forbidden", guard:"v7"});
    return res.status(410).json({ok:false, error:"gone", guard:"v7"});
  }

  function mount(){
    const app:any = getApp(); if (!app || typeof app.all!=="function") return setTimeout(mount, TICK);
    if (app.__void_v7_guard_localonly_v2) return; app.__void_v7_guard_localonly_v2 = true;

    // 1) Stronger wildcard: any '/proposer/...v7...' (any method, any case)
    app.all(/\/proposer\/.*v7.*/i, deny);

    // 2) Paranoid: also block if a 'v7' appears in query (e.g., ?mode=v7)
    app.all("/proposer/*", (req:any, res:any, next:any)=>{
      try {
        const s = (req.originalUrl||"") + " " + JSON.stringify(req.query||{});
        if (/[?&]?(mode|m|v)=?v7\b/i.test(s)) return deny(req,res);
      } catch {}
      next();
    });

    // 3) Exporter for the guard (Prom text)
    app.get("/metrics/void/v7_guard.prom", (_req:any, res:any)=>{
      res
        .type("text/plain")
        .send([
          "# HELP void_v7_guard_hits_total Total blocked v7-like requests",
          "# TYPE void_v7_guard_hits_total counter",
          `void_v7_guard_hits_total ${hits}`,
          "# HELP void_v7_guard_last_ts_ms Last blocked timestamp (ms)",
          "# TYPE void_v7_guard_last_ts_ms gauge",
          `void_v7_guard_last_ts_ms ${lastTs||0}`
        ].join("\n")+"\n");
    });
  }
  mount();
})();
// -------- v7.firewall.prehandle.v1 (additive, idempotent) --------
(function V7FirewallPrehandleV1(){
  const TICK=200; const G:any = (globalThis as any);
  function getApp(){ return G.__void_http_app || (G as any).app; }

  function mount(){
    const app:any = getApp(); if (!app || typeof app.handle!=="function") return setTimeout(mount, TICK);
    if (app.__void_v7_firewall_v1) return; app.__void_v7_firewall_v1 = true;

    const stats = (G.__void_v7_fw_stats ||= {blocks:0,last:0});
    const originalHandle = app.handle.bind(app);

    // Patch the top-level dispatcher so we run BEFORE any route handlers
    app.handle = function(req:any, res:any, next:any){
      try{
        const url = String(req?.originalUrl || req?.url || "");
        if (/\/proposer\/.*v7/i.test(url)){
          stats.blocks++; stats.last = Date.now();
          res.status(410).json({ ok:false, error:"gone", message:"v7 disabled (firewall)", url });
          return;
        }
      }catch { /* fall through */ }
      return originalHandle(req, res, next);
    };

    // Prometheus metrics for the firewall
    if (typeof app.get==="function"){
      app.get("/metrics/void/v7_guard.prom", (_req:any, res:any)=>{
        res.type("text/plain").send(
`# HELP void_v7_guard_blocks_total Requests blocked by v7 firewall
# TYPE void_v7_guard_blocks_total counter
void_v7_guard_blocks_total ${stats.blocks}
# HELP void_v7_guard_last_ts_ms Last v7 firewall block timestamp (ms)
# TYPE void_v7_guard_last_ts_ms gauge
void_v7_guard_last_ts_ms ${stats.last}
`);
      });
    }
  }
  mount();
})();
// -------- v7.killswitch.env.v1 (additive) --------
(function V7KillSwitchEnvV1(){
  const TICK=200, G:any=(globalThis as any);
  function getApp(){ return G.__void_http_app || (G as any).app; }
  function on(){ return String(process.env.VOID_V7_ENABLED||"0").toLowerCase()==="1"; }

  function mount(){
    const app:any = getApp(); if(!app||typeof app.get!=="function") return setTimeout(mount,TICK);
    if (app.__void_v7_killswitch_env_v1) return; app.__void_v7_killswitch_env_v1 = true;

    // Prom-state: 0 means blocked (safe default), 1 means enabled (should never be in prod)
    app.get("/metrics/void/v7_guard_state.prom", (_req:any,res:any)=>{
      const enabled = on()?1:0;
      res.type("text/plain").send(
`# HELP void_v7_enabled V7 legacy path enable flag (1=enabled, 0=blocked)
# TYPE void_v7_enabled gauge
void_v7_enabled ${enabled}
`);
    });
  }
  mount();
})();
// -------- v7.firewall.app-handle.v1 (additive, idempotent, highest-priority) --------
(function V7FirewallAppHandleV1(){
  const TICK=200, G:any=(globalThis as any);
  function getApp(){ return G.__void_http_app || (G as any).app; }

  function mount(){
    const app:any = getApp(); if (!app || typeof app.handle !== "function") return setTimeout(mount, TICK);
    if (app.__void_v7_firewall_app_handle_v1) return; app.__void_v7_firewall_app_handle_v1 = true;

    // counters
    let blocks = 0, lastTs = 0;
    function bump(){ blocks++; lastTs = Date.now(); }

    // prom exporter
    app.get("/metrics/void/v7_guard.prom", (_req:any,res:any)=>{
      res.type("text/plain").send(
`# HELP void_v7_guard_blocks_total Requests blocked by v7 firewall
# TYPE void_v7_guard_blocks_total counter
void_v7_guard_blocks_total ${blocks}
# HELP void_v7_guard_last_ts_ms Last v7 firewall block timestamp (ms)
# TYPE void_v7_guard_last_ts_ms gauge
void_v7_guard_last_ts_ms ${lastTs}
`);
    });

    // hard kill-switch (default 0 via systemd env; you've set it already)
    const enabled = ()=> String(process.env.VOID_V7_ENABLED||"0").toLowerCase()==="1";

    // patch app.handle so we intercept BEFORE any route
    const origHandle = app.handle.bind(app);
    app.handle = function v7FirewallPatched(req:any, res:any, out?:any){
      try{
        const url = String(req?.url||"");
        if (!enabled() && /\/proposer\/.*v7/i.test(url)) {
          bump();
          // 410 Gone; never let legacy handler run
          res.statusCode = 410;
          res.setHeader("Content-Type","application/json; charset=utf-8");
          res.end(JSON.stringify({ok:false, error:"gone", message:"v7 disabled"}));
          return;
        }
      }catch(_e){}
      return origHandle(req,res,out);
    };
  }
  mount();
})();
// -------- proposer.watchdog.auto-rescue.v1 (additive, idempotent) --------
(function ProposerAutoRescueV1(){
  const G:any=(globalThis as any), TICK=2000, STALL_MS=20000;
  function getApp(){ return G.__void_http_app || (G as any).app; }
  function getNode(){ return G.__void_node   || (G as any).node; }

  let lastHead = -1, lastAdvanceTs = 0, loops = 0, rescues = 0, lastRescueTs = 0, errors = 0;

  function now(){ return Date.now(); }

  function metrics(app:any){
    if (app.__void_proposer_watchdog_metrics_v1) return;
    app.__void_proposer_watchdog_metrics_v1 = true;
    app.get("/metrics/void/proposer.watchdog.prom", (_req:any,res:any)=>{
      res.type("text/plain").send(
`# HELP void_proposer_watchdog_loops_total Watchdog loops
# TYPE void_proposer_watchdog_loops_total counter
void_proposer_watchdog_loops_total ${loops}
# HELP void_proposer_watchdog_rescues_total Rescue invocations
# TYPE void_proposer_watchdog_rescues_total counter
void_proposer_watchdog_rescues_total ${rescues}
# HELP void_proposer_watchdog_last_rescue_ts_ms Last rescue ts (ms)
# TYPE void_proposer_watchdog_last_rescue_ts_ms gauge
void_proposer_watchdog_last_rescue_ts_ms ${lastRescueTs}
# HELP void_proposer_watchdog_errors_total Errors in watchdog
# TYPE void_proposer_watchdog_errors_total counter
void_proposer_watchdog_errors_total ${errors}
# HELP void_proposer_watchdog_last_advance_ts_ms Last head advance ts (ms)
# TYPE void_proposer_watchdog_last_advance_ts_ms gauge
void_proposer_watchdog_last_advance_ts_ms ${lastAdvanceTs}
`);
    });
  }

  async function loop(){
    try{
      loops++;
      const app:any = getApp(); if (!app) return setTimeout(loop, TICK);
      metrics(app);
      const node:any = getNode(); if (!node?.store) return setTimeout(loop, TICK);

      const enabled = (() => {
        try { return Number((globalThis as any).__proposer_auto_enabled_v2 ?? 0) === 1; } catch { return false; }
      })();

      const head = (typeof node.store.getHeadNumber==="function")
        ? await node.store.getHeadNumber()
        : (node.store.headNumber ?? node.store.latestNumber ?? -1);

      if (head !== lastHead){ lastHead = head; lastAdvanceTs = now(); }

      // stale AND auto says enabled -> try rescue
      if (enabled && (now() - lastAdvanceTs) > STALL_MS){
        try{
          const ok = await fetch("http://127.0.0.1:"+String(process.env.HTTP_PORT||process.env.VOID_HTTP_PORT||"4100")+
            "/proposer/hook/run?name=rescue-v1&max=5", {method:"POST"});
          if (ok?.ok){ rescues++; lastRescueTs = now(); }
        }catch{ errors++; }
      }
    }catch{ errors++; }
    setTimeout(loop, TICK);
  }
  loop();
})();
// [v7-tarpit-bad] // -------- v7.cost.tarpit.quarantine.v1 (additive, idempotent, pre-firewall) --------
// [v7-tarpit-bad] (function V7CostTarpitV1(){
// [v7-tarpit-bad]   const TICK=200, G:any=(globalThis as any);
// [v7-tarpit-bad]   function getApp(){ return G.__void_http_app || (G as any).app; }
// [v7-tarpit-bad] 
// [v7-tarpit-bad]   // In-memory state
// [v7-tarpit-bad]   type Stat = { score:number; last:number; quarantinedUntil:number; totalBlocks:number; totalDelayMs:number; totalQuarantines:number; };
// [v7-tarpit-bad]   const STATS = new Map<string,Stat>();
// [v7-tarpit-bad] 
// [v7-tarpit-bad]   // Tunables via env (safe defaults)
// [v7-tarpit-bad]   function n(v:string|undefined, d:number){ const x=Number(v); return Number.isFinite(x)&&x>=0 ? x : d; }
// [v7-tarpit-bad]   const BASE_MS      = n(process.env.VOID_V7_TARPIT_BASE_MS, 250);    // base delay per offense step
// [v7-tarpit-bad]   const MAX_MS       = n(process.env.VOID_V7_TARPIT_MAX_MS, 5000);    // cap per-request delay
// [v7-tarpit-bad]   const DECAY_MS     = n(process.env.VOID_V7_TARPIT_DECAY_MS, 15000); // how fast score decays
// [v7-tarpit-bad]   const STEP         = n(process.env.VOID_V7_TARPIT_STEP, 1);         // score increment per hit
// [v7-tarpit-bad]   const QUAR_AFTER   = n(process.env.VOID_V7_QUARANTINE_AFTER, 6);    // score threshold to quarantine
// [v7-tarpit-bad]   const QUAR_MS      = n(process.env.VOID_V7_QUARANTINE_MS, 5*60*1000); // quarantine window
// [v7-tarpit-bad]   const CPU_MS       = n(process.env.VOID_V7_CPU_BURN_MS, 0);         // optional CPU burn ms per hit (0 = off)
// [v7-tarpit-bad]   const ENABLED      = String(process.env.VOID_V7_COST_ENABLED||"1").toLowerCase()==="1";
// [v7-tarpit-bad] 
// [v7-tarpit-bad]   function ipOf(req:any){
// [v7-tarpit-bad]     // Try X-Forwarded-For first, then socket remoteAddress; normalize to single token
// [v7-tarpit-bad]     const xff=(req.headers?.['x-forwarded-for']||"").toString().split(',')[0].trim();
// [v7-tarpit-bad]     return xff || (req.socket?.remoteAddress||"unknown");
// [v7-tarpit-bad]   }
// [v7-tarpit-bad] 
// [v7-tarpit-bad]   function decay(stat:Stat){
// [v7-tarpit-bad]     const now=Date.now();
// [v7-tarpit-bad]     const dt = now - stat.last;
// [v7-tarpit-bad]     if (dt > 0 && DECAY_MS > 0){
// [v7-tarpit-bad]       const dec = dt/DECAY_MS;
// [v7-tarpit-bad]       stat.score = Math.max(0, stat.score - dec);
// [v7-tarpit-bad]     }
// [v7-tarpit-bad]     stat.last = now;
// [v7-tarpit-bad]   }
// [v7-tarpit-bad] 
// [v7-tarpit-bad]   function penaltyMs(score:number){
// [v7-tarpit-bad]     // Linear ramp with cap; simple & predictable
// [v7-tarpit-bad]     return Math.min(MAX_MS, Math.ceil(score) * BASE_MS);
// [v7-tarpit-bad]   }
// [v7-tarpit-bad] 
// [v7-tarpit-bad]   function busyWait(ms:number){
// [v7-tarpit-bad]     if (ms <= 0) return;
// [v7-tarpit-bad]     const end = Date.now()+ms;
// [v7-tarpit-bad]     while (Date.now() < end) { /* spin */ }
// [v7-tarpit-bad]   }
// [v7-tarpit-bad] 
// [v7-tarpit-bad]   function prom(app:any){
// [v7-tarpit-bad]     if (app.__void_v7_cost_prom_v1) return; app.__void_v7_cost_prom_v1 = true;
// [v7-tarpit-bad]     app.get("/metrics/void/v7_cost.prom", (_req:any,res:any)=>{
// [v7-tarpit-bad]       let lines = [
// [v7-tarpit-bad]         "# HELP void_v7_cost_enabled Cost layer enabled (1/0)",
// [v7-tarpit-bad]         "# TYPE void_v7_cost_enabled gauge",
// [v7-tarpit-bad]         `void_v7_cost_enabled ${ENABLED?1:0}`,
// [v7-tarpit-bad]         "# HELP void_v7_tarpit_base_ms Base delay per offense step (ms)",
// [v7-tarpit-bad]         "# TYPE void_v7_tarpit_base_ms gauge",
// [v7-tarpit-bad]         `void_v7_tarpit_base_ms ${BASE_MS}`,
// [v7-tarpit-bad]         "# HELP void_v7_tarpit_max_ms Max delay cap (ms)",
// [v7-tarpit-bad]         "# TYPE void_v7_tarpit_max_ms gauge",
// [v7-tarpit-bad]         `void_v7_tarpit_max_ms ${MAX_MS}`,
// [v7-tarpit-bad]         "# HELP void_v7_cpu_burn_ms Optional CPU burn per hit (ms)",
// [v7-tarpit-bad]         "# TYPE void_v7_cpu_burn_ms gauge",
// [v7-tarpit-bad]         `void_v7_cpu_burn_ms ${CPU_MS}`,
// [v7-tarpit-bad]         "# HELP void_v7_quarantine_after Score threshold to quarantine",
// [v7-tarpit-bad]         "# TYPE void_v7_quarantine_after gauge",
// [v7-tarpit-bad]         `void_v7_quarantine_after ${QUAR_AFTER}`,
// [v7-tarpit-bad]         "# HELP void_v7_quarantine_ms Quarantine window (ms)",
// [v7-tarpit-bad]         "# TYPE void_v7_quarantine_ms gauge",
// [v7-tarpit-bad]         `void_v7_quarantine_ms ${QUAR_MS}`,
// [v7-tarpit-bad]       ];
// [v7-tarpit-bad]       // Per-IP aggregates
// [v7-tarpit-bad]       for (const [ip, s] of STATS.entries()){
// [v7-tarpit-bad]         lines.push(
// [v7-tarpit-bad]           "# HELP void_v7_cost_score Current offense score per IP",
// [v7-tarpit-bad]           "# TYPE void_v7_cost_score gauge",
// [v7-tarpit-bad]           `void_v7_cost_score{ip="${ip}"} ${s.score}`,
// [v7-tarpit-bad]           "# HELP void_v7_cost_quarantined Quarantine state per IP (1/0)",
// [v7-tarpit-bad]           "# TYPE void_v7_cost_quarantined gauge",
// [v7-tarpit-bad]           `void_v7_cost_quarantined{ip="${ip}"} ${Date.now()<s.quarantinedUntil?1:0}`,
// [v7-tarpit-bad]           "# HELP void_v7_cost_blocks_total Requests blocked (tarpit applied) per IP",
// [v7-tarpit-bad]           "# TYPE void_v7_cost_blocks_total counter",
// [v7-tarpit-bad]           `void_v7_cost_blocks_total{ip="${ip}"} ${s.totalBlocks}`,
// [v7-tarpit-bad]           "# HELP void_v7_cost_delay_ms_total Total delay imposed (ms) per IP",
// [v7-tarpit-bad]           "# TYPE void_v7_cost_delay_ms_total counter",
// [v7-tarpit-bad]           `void_v7_cost_delay_ms_total{ip="${ip}"} ${s.totalDelayMs}`,
// [v7-tarpit-bad]           "# HELP void_v7_cost_quarantines_total Total quarantines issued per IP",
// [v7-tarpit-bad]           "# TYPE void_v7_cost_quarantines_total counter",
// [v7-tarpit-bad]           `void_v7_cost_quarantines_total{ip="${ip}"} ${s.totalQuarantines}`,
// [v7-tarpit-bad]         );
// [v7-tarpit-bad]       }
// [v7-tarpit-bad]       res.type("text/plain").send(lines.join("\n")+"\n");
// [v7-tarpit-bad]     });
// [v7-tarpit-bad]   }
// [v7-tarpit-bad] 
// [v7-tarpit-bad]   function mount(){
// [v7-tarpit-bad]     const app:any = getApp(); if (!app || typeof app.handle!=="function") return setTimeout(mount, TICK);
// [v7-tarpit-bad]     prom(app);
// [v7-tarpit-bad]     if (app.__void_v7_cost_tarpit_v1) return; app.__void_v7_cost_tarpit_v1 = true;
// [v7-tarpit-bad] 
// [v7-tarpit-bad]     const prev = app.handle.bind(app);
// [v7-tarpit-bad]     app.handle = function v7CostWrapper(req:any, res:any, out?:any){
// [v7-tarpit-bad]       try{
// [v7-tarpit-bad]         if (!ENABLED) return prev(req,res,out);
// [v7-tarpit-bad]         const url = String(req?.url||"");
// [v7-tarpit-bad]         // Only trigger on v7 attempts (same match as firewall), BEFORE firewall sends 410
// [v7-tarpit-bad]         if (/\/proposer\/.*v7/i.test(url)) {
// [v7-tarpit-bad]           const ip = ipOf(req);
// [v7-tarpit-bad]           const s = STATS.get(ip) || {score:0,last:Date.now(),quarantinedUntil:0,totalBlocks:0,totalDelayMs:0,totalQuarantines:0};
// [v7-tarpit-bad]           decay(s);
// [v7-tarpit-bad] 
// [v7-tarpit-bad]           // escalate score
// [v7-tarpit-bad]           s.score += STEP;
// [v7-tarpit-bad] 
// [v7-tarpit-bad]           // quarantine if too many hits
// [v7-tarpit-bad]           const now = Date.now();
// [v7-tarpit-bad]           if (s.score >= QUAR_AFTER && now >= s.quarantinedUntil){
// [v7-tarpit-bad]             s.quarantinedUntil = now + QUAR_MS;
// [v7-tarpit-bad]             s.totalQuarantines++;
// [v7-tarpit-bad]           }
// [v7-tarpit-bad] 
// [v7-tarpit-bad]           // compute delay (longer if quarantined)
// [v7-tarpit-bad]           let delay = penaltyMs(s.score);
// [v7-tarpit-bad]           if (now < s.quarantinedUntil) delay = Math.max(delay, Math.min(MAX_MS, Math.floor(MAX_MS*0.9)));
// [v7-tarpit-bad] 
// [v7-tarpit-bad]           // optional CPU burn (small, capped by config)
// [v7-tarpit-bad]           if (CPU_MS > 0) busyWait(Math.min(CPU_MS, 500)); // hard cap to avoid self-DOS
// [v7-tarpit-bad] 
// [v7-tarpit-bad]           // impose tarpit before handing to firewall (which will still 410)
// [v7-tarpit-bad]           if (delay > 0){
// [v7-tarpit-bad]             s.totalBlocks++;
// [v7-tarpit-bad]             s.totalDelayMs += delay;
// [v7-tarpit-bad]             // block the event loop for delay using a timed promise; keep it simple
// [v7-tarpit-bad]             const start = Date.now();
// [v7-tarpit-bad]             const wait = (ms:number)=>new Promise(r=>setTimeout(r,ms));
// [v7-tarpit-bad]             return wait(delay).then(()=>{ STATS.set(ip,s); return prev(req,res,out); });
// [v7-tarpit-bad]           } else {
// [v7-tarpit-bad]             STATS.set(ip,s);
// [v7-tarpit-bad]             return prev(req,res,out);
// [v7-tarpit-bad]           }
// [v7-tarpit-bad]         } else {
// [v7-tarpit-bad]           return prev(req,res,out);
// [v7-tarpit-bad]         }
// [v7-tarpit-bad]       } catch(e){
// [v7-tarpit-bad]         try { return prev(req,res,out); } catch(_) { throw e; }
// [v7-tarpit-bad]       }
// [v7-tarpit-bad]     };
// [v7-tarpit-bad]   }
// [v7-tarpit-bad]   mount();
// [v7-tarpit-bad] })();
// -------- v7.cost.tarpit.quarantine.v2 (additive, idempotent, pre-firewall) --------
(function V7CostTarpitV2(){
  const TICK=250, G:any=(globalThis as any);
  function getApp(){ return G.__void_http_app || (G as any).app; }

  type Stat = { score:number; last:number; quarantinedUntil:number;
                totalBlocks:number; totalDelayMs:number; totalQuarantines:number; };
  const STATS = new Map<string,Stat>();

  function n(v:string|undefined, d:number){ const x=Number(v); return Number.isFinite(x)&&x>=0?x:d; }
  const BASE_MS    = n(process.env.VOID_V7_TARPIT_BASE_MS, 250);
  const MAX_MS     = n(process.env.VOID_V7_TARPIT_MAX_MS, 8000);
  const DECAY_MS   = n(process.env.VOID_V7_TARPIT_DECAY_MS, 15000);
  const STEP       = n(process.env.VOID_V7_TARPIT_STEP, 1);
  const QUAR_AFTER = n(process.env.VOID_V7_QUARANTINE_AFTER, 6);
  const QUAR_MS    = n(process.env.VOID_V7_QUARANTINE_MS, 5*60*1000);
  const CPU_MS     = n(process.env.VOID_V7_CPU_BURN_MS, 0);
  const ENABLED    = String(process.env.VOID_V7_COST_ENABLED||"1").toLowerCase()==="1";
  const CANARY     = (process.env.VOID_CANARY_TOKEN||"").trim();

  function ipOf(req:any){
    const xff=(req.headers?.['x-forwarded-for']||"").toString().split(',')[0].trim();
    return xff || (req.socket?.remoteAddress||"unknown");
  }
  function decay(stat:Stat, now:number){
    if (!stat.last) return;
    const dt = Math.max(0, now - stat.last);
    if (dt<=0) return;
    const drop = dt/DECAY_MS;
    stat.score = Math.max(0, stat.score - drop);
  }
  function randInt(a:number,b:number){ return Math.floor(a + Math.random()*(b-a+1)); }

  function delayMsFor(score:number){
    // smooth/exponential-ish + jitter
    const core = Math.pow(Math.ceil(score), 1.25) * BASE_MS;
    const jitter = randInt(0, BASE_MS);
    return Math.min(MAX_MS, Math.ceil(core + jitter));
  }

  async function busyWait(ms:number){
    if (ms<=0) return;
    const end = Date.now()+ms;
    while (Date.now()<end) { /* burn */ }
  }

  async function tarpit(req:any, res:any, next:any){
    if (!ENABLED) return next();
    // canary bypass for ops/canaries
    if (CANARY && req.headers && String(req.headers['x-void-canary']||"")===CANARY) return next();

    const now = Date.now(), ip = ipOf(req);
    let s = STATS.get(ip); if (!s) { s={score:0,last:0,quarantinedUntil:0,totalBlocks:0,totalDelayMs:0,totalQuarantines:0}; STATS.set(ip,s); }
    decay(s, now);
    s.score += STEP; s.last = now;

    // quarantine
    if (s.score >= QUAR_AFTER) {
      if (now < s.quarantinedUntil) {
        const d = delayMsFor(s.score);
        if (CPU_MS>0) await busyWait(Math.min(CPU_MS,d));
        await new Promise(r=>setTimeout(r,d));
        s.totalBlocks++; s.totalDelayMs+=d;
        res.status(410).end(); return;
      } else {
        s.quarantinedUntil = now + QUAR_MS;
        s.totalQuarantines++;
      }
    }

    // tarpit delay (even before firewall 410)
    const d = delayMsFor(s.score);
    if (CPU_MS>0) await busyWait(Math.min(CPU_MS,d));
    await new Promise(r=>setTimeout(r,d));
    s.totalBlocks++; s.totalDelayMs+=d;
    return next();
  }

  function mount(){
    const app:any = getApp(); if (!app || typeof app.use!=="function") return setTimeout(mount, TICK);
    if ((app as any).__void_v7_tarpit_mounted_v2) return; (app as any).__void_v7_tarpit_mounted_v2 = true;

    // Pre-firewall middleware on the legacy path
    try { app.use("/proposer/seal/once-v7", tarpit); } catch {}

    (globalThis as any).__void_v7_cost_stats = () => STATS;
    // Prom-style metrics exporter
    app.get("/metrics/void/v7_cost.prom", (_:any, res:any)=>{
      res.setHeader("Content-Type","text/plain; version=0.0.4");
      let out = "";
      out += "# HELP void_v7_cost_enabled Cost layer enabled (1/0)\n# TYPE void_v7_cost_enabled gauge\n";
      out += `void_v7_cost_enabled ${ENABLED?1:0}\n`;
      out += "# HELP void_v7_tarpit_base_ms Base delay per offense step (ms)\n# TYPE void_v7_tarpit_base_ms gauge\n";
      out += `void_v7_tarpit_base_ms ${BASE_MS}\n`;
      out += "# HELP void_v7_tarpit_max_ms Max delay cap (ms)\n# TYPE void_v7_tarpit_max_ms gauge\n";
      out += `void_v7_tarpit_max_ms ${MAX_MS}\n`;
      out += "# HELP void_v7_cpu_burn_ms Optional CPU burn per hit (ms)\n# TYPE void_v7_cpu_burn_ms gauge\n";
      out += `void_v7_cpu_burn_ms ${CPU_MS}\n`;
      out += "# HELP void_v7_quarantine_after Score threshold to quarantine\n# TYPE void_v7_quarantine_after gauge\n";
      out += `void_v7_quarantine_after ${QUAR_AFTER}\n`;
      out += "# HELP void_v7_quarantine_ms Quarantine window (ms)\n# TYPE void_v7_quarantine_ms gauge\n";
      out += `void_v7_quarantine_ms ${QUAR_MS}\n`;

      out += "# HELP void_v7_cost_score Current offense score per IP\n# TYPE void_v7_cost_score gauge\n";
      out += "# HELP void_v7_cost_quarantined Quarantine state per IP (1/0)\n# TYPE void_v7_cost_quarantined gauge\n";
      out += "# HELP void_v7_cost_blocks_total Requests blocked (tarpit applied) per IP\n# TYPE void_v7_cost_blocks_total counter\n";
      out += "# HELP void_v7_cost_delay_ms_total Total delay imposed (ms) per IP\n# TYPE void_v7_cost_delay_ms_total counter\n";
      out += "# HELP void_v7_cost_quarantines_total Total quarantines issued per IP\n# TYPE void_v7_cost_quarantines_total counter\n";
      for (const [ip,s] of STATS.entries()){
        const q = Date.now() < s.quarantinedUntil ? 1 : 0;
        out += `void_v7_cost_score{ip="${ip}"} ${s.score}\n`;
        out += `void_v7_cost_quarantined{ip="${ip}"} ${q}\n`;
        out += `void_v7_cost_blocks_total{ip="${ip}"} ${s.totalBlocks}\n`;
        out += `void_v7_cost_delay_ms_total{ip="${ip}"} ${s.totalDelayMs}\n`;
        out += `void_v7_cost_quarantines_total{ip="${ip}"} ${s.totalQuarantines}\n`;
      }
      res.status(200).end(out);
    });
  }
  mount();
})();
// --- v7.cost.admin.reset (additive, tiny) ---
// NOTE: This requires the v7 tarpit block to expose a getter like:
//   (globalThis as any).__void_v7_cost_stats = () => STATS;
// If you didn't add that inside v7 tarpit v2, skip this route and just restart the service to clear scores.
(function V7CostAdminReset(){
  const G:any=(globalThis as any);
  function getApp(){ return G.__void_http_app || (G as any).app; }
  const TICK=300;
  function mount(){
    const app:any=getApp(); if(!app||typeof app.get!=="function") return setTimeout(mount,TICK);
    if ((app as any).__void_v7_cost_admin_reset) return; (app as any).__void_v7_cost_admin_reset = true;
    app.post("/ops/v7-cost/reset", (req:any,res:any)=>{
      try{
        const ip=(req.query.ip||"").toString().trim();
        const getter = (G as any).__void_v7_cost_stats;
        const map = typeof getter==="function" ? getter() : null;
        if(!ip || !map || !map.delete) return res.status(400).json({ok:false,err:"bad ip or map"});
        map.delete(ip); return res.json({ok:true,ip});
      }catch(e){ return res.status(500).json({ok:false,err:String(e)}); }
    });
  }
  setTimeout(mount,TICK);
})();

// ---------------- WAL v1 (additive, safe boot compatible) -----------------
(function walV1Mount(){
  const TICK=400;
  let mounted=false;

  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  function getStore(){ try{ return (globalThis as any).__void_store || (globalThis as any).store; }catch{ return undefined; } }
  function getDataDir(){ return process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data_a"; }

  async function mount(){
    if (mounted) return;
    const app:any = getApp();
    const store:any = getStore();
    if (!app || typeof app.get!=="function" || !store || !store.SegStore || !store.SegStore.prototype?.saveBlock){
      return setTimeout(mount, TICK);
    }
    mounted = true;

    // Lazy import to avoid early ESM churn
    const mod = await import("../wal/wal_v1.js");
    const wal = new mod.WALv1(getDataDir());

    // Exporter
    app.get("/__void/metrics/wal.prom", (_req:any, res:any)=>{
      try { res.type("text/plain").send(wal.metricsProm()); }
      catch(e){ res.type("text/plain").send(`# wal exporter error\nvoid_wal_exporter_error 1\n`); }
    });

    // Wrap SegStore.saveBlock (pre-intent, post-commit)
    const SegStore = store.SegStore || require("../chain/seg_store.js").SegStore; // keep legacy fallback
    const origSave = SegStore.prototype.saveBlock;
    if (!(SegStore as any).__wal_v1_wrapped){
      SegStore.prototype.saveBlock = async function(block:any){
        try{
          const n = Number(block?.number ?? block?.header?.number ?? -1);
          const txRoot = block?.header?.txRoot || block?.txRoot;
          const hash = (block?.hash) || (block?.header && (await (await import("../chain/block.js")).blockHash(block.header)));
          if (Number.isFinite(n) && n>=0) wal.append(n, txRoot, hash);
        }catch(_e){ /* best-effort */ }
        const out = await origSave.apply(this, arguments as any);
        try{
          const n = Number(block?.number ?? block?.header?.number ?? -1);
          if (Number.isFinite(n) && n>=0) wal.commit(n);
        }catch(_e){ /* best-effort */ }
        return out;
      };
      (SegStore as any).__wal_v1_wrapped = true;
    }

    // Minimal boot replay: just recount inflight; do not mutate store
    wal.counters.replays_total++;
  }
  mount();
})();

// ---------------- WAL v1 FIX MOUNT (additive, no store dependency) -----------------
(function walV1FixMount(){
  const TICK=300;
  let mounted=false;

  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  function dataDir(){ return process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data_a"; }

  async function attach(){
    if (mounted) return;
    const app:any = getApp();
    if (!app || typeof app.get!=="function") return setTimeout(attach, TICK);

    mounted = true;
    const { WALv1 } = await import("../wal/wal_v1.js");
    const wal = new WALv1(dataDir());

    // Exporter (idempotent)
    if (!(app as any).__void_wal_v1_exporter){
      (app as any).__void_wal_v1_exporter = true;
      app.get("/__void/metrics/wal.prom", (_req:any, res:any)=>{
        try { res.type("text/plain").send(wal.metricsProm()); }
        catch { res.type("text/plain").send("# wal exporter error\nvoid_wal_exporter_error 1\n"); }
      });
    }

    // Wrap SegStore.saveBlock directly (idempotent)
    try{
      const { SegStore } = await import("../chain/seg_store.js");
      if (SegStore && !((SegStore as any).__wal_v1_wrapped)){
        const origSave = SegStore.prototype.saveBlock;
        SegStore.prototype.saveBlock = async function(block:any){
          try{
            const n = Number(block?.number ?? block?.header?.number ?? -1);
            const txRoot = block?.header?.txRoot || block?.txRoot;
            let hash:any = (block?.hash);
            try{
              if (!hash && block?.header){
                const bh = await import("../chain/block.js");
                hash = await bh.blockHash(block.header);
              }
            }catch{}
            if (Number.isFinite(n) && n>=0) wal.append(n, txRoot, hash);
          }catch{}
          const out = await origSave.apply(this, arguments as any);
          try{
            const n = Number(block?.number ?? block?.header?.number ?? -1);
            if (Number.isFinite(n) && n>=0) wal.commit(n);
          }catch{}
          return out;
        };
        (SegStore as any).__wal_v1_wrapped = true;
      }
    }catch(e){
      // If seg_store import fails for some reason, exporter still works; wrapper can retry later if needed.
      setTimeout(()=>{ mounted=false; attach(); }, 1000);
      return;
    }

    // Count a replay pass (we don't mutate store on boot)
    // Safe even if exporter only
    try{ (wal as any).counters.replays_total++; }catch{}
  }
  attach();
})();

// ---------------- WAL v1 HEAD-FALLBACK (additive) -----------------
(function walV1HeadFallback(){
  const TICK=300;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  function dataDir(){ return process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data_a"; }

  async function getHeadNumber(): Promise<number>{
    try {
      // fastest local path (already in your build)
      const r = await fetch("http://127.0.0.1:"+ (process.env.HTTP_PORT||"4100") +"/blocks/latest/number2.json");
      if (r.ok) { const j:any = await r.json(); const n = Number(j?.number ?? j); if (Number.isFinite(n)) return n; }
    } catch {}
    try {
      // fallback to text exporter void_head_number if present
      const r2 = await fetch("http://127.0.0.1:"+ (process.env.HTTP_PORT||"4100") +"/metrics/void/head.v2");
      if (r2.ok) {
        const t = await r2.text();
        const m = t.match(/void_head_number(?:{[^}]*})?\s+([0-9]+)/);
        if (m) return Number(m[1]);
      }
    } catch {}
    return -1;
  }

  async function attach(){
    const app:any = getApp();
    if (!app || typeof app.get!=="function") return setTimeout(attach, TICK);

    const { WALv1 } = await import("../wal/wal_v1.js");
    const wal = new WALv1(dataDir());

    // exporter idempotent
    if (!(app as any).__void_wal_v1_exporter2){
      (app as any).__void_wal_v1_exporter2 = true;
      app.get("/__void/metrics/wal.prom", (_:any, res:any)=>{
        try { res.type("text/plain").send(wal.metricsProm()); }
        catch { res.type("text/plain").send("# wal exporter error\nvoid_wal_exporter_error 1\n"); }
      });
    }

    // wrap SegStore.saveBlock with head-fallback (idempotent)
    const { SegStore } = await import("../chain/seg_store.js");
    if (SegStore && !((SegStore as any).__wal_v1_wrapped_headfb)){
      const origSave = SegStore.prototype.saveBlock;
      SegStore.prototype.saveBlock = async function(block:any){
        let n = Number(block?.number ?? block?.header?.number ?? -1);
        try{
          if (!(Number.isFinite(n) && n>=0)) {
            const head = await getHeadNumber();
            if (Number.isFinite(head) && head>=0) n = head + 1; // assume next
          }
          const txRoot = block?.header?.txRoot || block?.txRoot;
          let hash:any = block?.hash;
          try {
            if (!hash && block?.header){
              const bh = await import("../chain/block.js");
              hash = await bh.blockHash(block.header);
            }
          } catch {}
          if (Number.isFinite(n) && n>=0) wal.append(n, txRoot, hash);
        }catch{}
        const out = await origSave.apply(this, arguments as any);
        try{
          // commit to the real latest after save
          const latest = await getHeadNumber();
          if (Number.isFinite(latest) && latest>=0) wal.commit(latest);
        }catch{}
        return out;
      };
      (SegStore as any).__wal_v1_wrapped_headfb = true;
      try{ (wal as any).counters.replays_total++; }catch{}
    }
  }
  attach();
})();

// ---------------- WAL v1 SYNTHETIC-SEQUENCE (additive) -----------------
(function walV1SyntheticSeq(){
  const TICK=300;
  function getApp(){ return (globalThis as any).__void_http_app || (globalThis as any).app; }
  function dataDir(){ return process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data_a"; }

  async function attach(){
    const app:any = getApp();
    if (!app || typeof app.get!=="function") return setTimeout(attach, TICK);

    const { WALv1 } = await import("../wal/wal_v1.js");
    const wal = new WALv1(dataDir());

    // mark that synthetic mode is present
    (wal as any).__synthetic_seq = (wal as any).__synthetic_seq || 0;

    // exporter (with a tiny gauge so we can see this wrapper is live)
    if (!(app as any).__void_wal_v1_exporter3){
      (app as any).__void_wal_v1_exporter3 = true;
      app.get("/__void/metrics/wal.prom", (_:any, res:any)=>{
        try {
          const base = wal.metricsProm();
          const extra = "\n# TYPE void_wal_synthetic_seq gauge\nvoid_wal_synthetic_seq " + ((wal as any).__synthetic_seq||0) + "\n";
          res.type("text/plain").send(base + extra);
        } catch {
          res.type("text/plain").send("# wal exporter error\nvoid_wal_exporter_error 1\n");
        }
      });
      // quick debug JSON
      app.get("/__void/wal/debug.json", (_:any, res:any)=>{
        res.json({
          synthetic_seq: (wal as any).__synthetic_seq||0,
          inflight: wal.counters.inflight_gauge,
          last_uncommitted: wal.counters.last_uncommitted_number
        });
      });
    }

    // wrap SegStore.saveBlock; use synthetic sequence when n<0
    const { SegStore } = await import("../chain/seg_store.js");
    if (SegStore && !((SegStore as any).__wal_v1_wrapped_synth)){
      const origSave = SegStore.prototype.saveBlock;
      SegStore.prototype.saveBlock = async function(block:any){
        let n = Number(block?.number ?? block?.header?.number ?? -1);

        // synthetic numbering if the node is in safe-boot index (n<0)
        if (!(Number.isFinite(n) && n>=0)) {
          (wal as any).__synthetic_seq = ((wal as any).__synthetic_seq||0) + 1;
          n = (wal as any).__synthetic_seq;
        }

        // txRoot/hash best-effort
        const txRoot = block?.header?.txRoot || block?.txRoot;
        let hash:any = block?.hash;
        try {
          if (!hash && block?.header){
            const bh = await import("../chain/block.js");
            hash = await bh.blockHash(block.header);
          }
        } catch {}

        try { wal.append(n, txRoot, hash); } catch {}

        const out = await origSave.apply(this, arguments as any);

        // commit same number we appended (synthetic-safe)
        try { wal.commit(n); } catch {}

        return out;
      };
      (SegStore as any).__wal_v1_wrapped_synth = true;
      try{ (wal as any).counters.replays_total++; }catch{}
    }
  }
  attach();
})();
// ---------------- WAL v1 SYNTHETIC-SEQUENCE v2 (self-healing, new exporter) -----------
(function walV1SyntheticSeqV2(){
  const TICK=350;
  const ENFORCE_MS=1500; // re-assert our wrapper once after startup
  const G:any = (globalThis as any);

  function getApp(){ return G.__void_http_app || (G as any).app; }
  function dataDir(){ return process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data_a"; }

  async function installOnce(tag:string){
    try{
      const app:any = getApp();
      if (!app || typeof app.get!=="function") return false;

      const { WALv1 } = await import("../wal/wal_v1.js");
      const wal = (G.__void_wal_v1 ||= new WALv1(dataDir()));
      wal.counters.replays_total++; // harmless tick
      wal.__synthetic_seq ||= 0;

      // New exporter path so we know THIS code is serving it
      if (!app.__void_wal_v2_exporter){
        app.__void_wal_v2_exporter = true;
        app.get("/__void/metrics/wal.v2.prom", (_:any, res:any)=>{
          let base = "# HELP void_wal_exporter_v2 1 if this v2 exporter is active\n# TYPE void_wal_exporter_v2 gauge\nvoid_wal_exporter_v2 1\n";
          try { base += wal.metricsProm(); } catch { base += "void_wal_exporter_error 1\n"; }
          base += `# TYPE void_wal_synthetic_seq gauge\nvoid_wal_synthetic_seq ${wal.__synthetic_seq||0}\n`;
          res.type("text/plain").send(base);
        });
        app.get("/__void/wal/debug2.json", (_:any,res:any)=>{
          res.json({tag, synthetic_seq: wal.__synthetic_seq||0, inflight: wal.counters.inflight_gauge, last_uncommitted: wal.counters.last_uncommitted_number});
        });
      }

      // Always (re)wrap current saveBlock; last wrapper wins
      const mod = await import("../chain/seg_store.js");
      const SegStore:any = mod.SegStore;
      if (!SegStore || !SegStore.prototype?.saveBlock) return false;

      const current = SegStore.prototype.saveBlock;
      const WRAP_FLAG = "__wal_v1_wrapped_synth_v2";
      if (current[WRAP_FLAG]) return true; // already ours

      const wrapped = async function saveBlock_WALv2(this:any, block:any){
        let n = Number(block?.number ?? block?.header?.number ?? -1);
        if (!(Number.isFinite(n) && n>=0)) { wal.__synthetic_seq = (wal.__synthetic_seq||0) + 1; n = wal.__synthetic_seq; }

        // best-effort txRoot/hash
        const txRoot = block?.header?.txRoot || block?.txRoot;
        let hash:any = block?.hash;
        try{ if (!hash && block?.header){ const bh = await import("../chain/block.js"); hash = await bh.blockHash(block.header); } }catch{}

        try{ wal.append(n, txRoot, hash); }catch{}
        const out = await current.apply(this, arguments as any);
        try{ wal.commit(n); }catch{}
        return out;
      };
      wrapped[WRAP_FLAG] = true;
      SegStore.prototype.saveBlock = wrapped;
      return true;
    }catch{ return false; }
  }

  // First mount, then enforce once after other boot wrappers attach
  (function boot(){
    const tryMount = async ()=>{
      const ok = await installOnce("boot");
      if (!ok) setTimeout(tryMount, TICK);
    };
    tryMount();

    setTimeout(()=>{ installOnce("enforce"); }, ENFORCE_MS);
  })();
})();
// ---------------- WAL v1 sticky wrapper v3 (can't be overwritten) ----------------
(function walV1StickyWrapV3(){
  const G:any = (globalThis as any);
  const TICK=300;
  const ENFORCE_EVERY_MS=2000;     // keep asserting periodically
  const WRAP_FLAG="__wal_v1_wrapped_synth_v3";
  const SEEN_KEY="__wal_v1_seen_setter_v3";

  function getApp(){ return G.__void_http_app || (G as any).app; }
  function dataDir(){ return process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data_a"; }

  async function ensureWal(){
    const { WALv1 } = await import("../wal/wal_v1.js");
    return (G.__void_wal_v1 ||= new WALv1(dataDir()));
  }

  function mountExporter(app:any, wal:any){
    if (app.__void_wal_v3_exporter) return;
    app.__void_wal_v3_exporter = true;
    app.get("/__void/metrics/wal.v3.prom", (_:any,res:any)=>{
      let out = "# HELP void_wal_exporter_v3 1 if v3 exporter active\n# TYPE void_wal_exporter_v3 gauge\nvoid_wal_exporter_v3 1\n";
      try { out += wal.metricsProm(); } catch { out += "void_wal_exporter_error 1\n"; }
      out += `# TYPE void_wal_synthetic_seq gauge\nvoid_wal_synthetic_seq ${wal.__synthetic_seq||0}\n`;
      out += `# TYPE void_wal_setter_events_total counter\nvoid_wal_setter_events_total ${G.__wal_setter_events_total||0}\n`;
      res.type("text/plain").send(out);
    });
    app.get("/__void/wal/hook.status", (_:any,res:any)=>{
      const store = (G.__void_store_class)||null;
      const proto = store?.prototype || (G.__void_store_proto)||null;
      const fn = proto?.saveBlock;
      res.json({
        sticky:true, wrap_flag: WRAP_FLAG,
        active: !!(fn && (fn as any)[WRAP_FLAG]),
        has_setter: !!(proto && Object.getOwnPropertyDescriptor(proto,"saveBlock")?.set),
        seen_setter_events: G.__wal_setter_events_total||0,
      });
    });
  }

  async function installSticky(){
    const app:any = getApp();
    if (!app || typeof app.get!=="function") return false;

    const mod = await import("../chain/seg_store.js");
    const SegStore:any = mod.SegStore;
    if (!SegStore || !SegStore.prototype) return false;
    G.__void_store_class = SegStore; G.__void_store_proto = SegStore.prototype;

    const wal = await ensureWal();
    wal.__synthetic_seq ||= 0;

    // 1) Define a sticky accessor on prototype.saveBlock
    const desc = Object.getOwnPropertyDescriptor(SegStore.prototype, "saveBlock");
    if (!desc || ("value" in desc)) {
      // convert to accessor with our current function as backing field
      const real = SegStore.prototype.saveBlock;
      let _real = typeof real==="function" ? real : async function(){};
      Object.defineProperty(SegStore.prototype, "saveBlock", {
        configurable: true, enumerable: false,
        get(){ return wrapIfNeeded(_real); },
        set(fn:any){
          G.__wal_setter_events_total = (G.__wal_setter_events_total||0) + 1;
          _real = typeof fn==="function" ? fn : _real;
        },
      });
    }

    // 2) Replace current backing impl by calling the setter once with itself
    const cur = SegStore.prototype.saveBlock;
    SegStore.prototype.saveBlock = cur;

    // 3) exporter
    mountExporter(app, wal);
    return true;

    function wrapIfNeeded(fn:any){
      if (fn && fn[WRAP_FLAG]) return fn; // already ours
      const wrapped = async function saveBlock_WALv3(this:any, block:any){
        // derive n or synthesize monotonically
        let n = Number(block?.number ?? block?.header?.number ?? -1);
        if (!(Number.isFinite(n) && n>=0)) { wal.__synthetic_seq = (wal.__synthetic_seq||0) + 1; n = wal.__synthetic_seq; }

        // best-effort roots/hashes (non-fatal)
        try{
          const txRoot = block?.header?.txRoot || block?.txRoot;
          let hash:any = block?.hash;
          if (!hash && block?.header){ const bh = await import("../chain/block.js"); hash = await bh.blockHash(block.header); }
          try { wal.append(n, txRoot, hash); } catch {}
          const out = await fn.apply(this, arguments as any);
          try { wal.commit(n); } catch {}
          return out;
        }catch(e){
          try { wal.append(n, null, null); } catch {}
          const out = await fn.apply(this, arguments as any);
          try { wal.commit(n); } catch {}
          return out;
        }
      };
      wrapped[WRAP_FLAG] = true;
      return wrapped;
    }
  }

  // Retry until app/store exist, then keep enforcing periodically
  (function boot(){
    const tryMount = async ()=>{ const ok = await installSticky(); if (!ok) setTimeout(tryMount, TICK); };
    tryMount();
    setInterval(()=>{ installSticky(); }, ENFORCE_EVERY_MS);
  })();
})();
// ---------------- WAL v1 sticky wrapper v3b (proxy existing accessor) ----------------
(function walV1StickyWrapV3b(){
  const G:any = (globalThis as any);
  const TICK=300, ENFORCE_MS=2000;
  const WRAP_FLAG="__wal_v1_wrapped_synth_v3";
  function getApp(){ return G.__void_http_app || (G as any).app; }
  function dataDir(){ return process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data_a"; }

  async function ensureWal(){
    const { WALv1 } = await import("../wal/wal_v1.js");
    return (G.__void_wal_v1 ||= new WALv1(dataDir()));
  }

  function wrapIfNeeded(fn:any, wal:any){
    if (!fn) return fn;
    if ((fn as any)[WRAP_FLAG]) return fn;
    const wrapped = async function saveBlock_WALv3(this:any, block:any){
      let n = Number(block?.number ?? block?.header?.number ?? -1);
      if (!(Number.isFinite(n) && n>=0)) { wal.__synthetic_seq = (wal.__synthetic_seq||0) + 1; n = wal.__synthetic_seq; }
      try{
        const txRoot = block?.header?.txRoot || block?.txRoot;
        let hash:any = block?.hash;
        if (!hash && block?.header){ const bh = await import("../chain/block.js"); hash = await bh.blockHash(block.header); }
        try { wal.append(n, txRoot, hash); } catch {}
        const out = await fn.apply(this, arguments as any);
        try { wal.commit(n); } catch {}
        return out;
      }catch(e){
        try { wal.append(n, null, null); } catch {}
        const out = await fn.apply(this, arguments as any);
        try { wal.commit(n); } catch {}
        return out;
      }
    };
    (wrapped as any)[WRAP_FLAG] = true;
    return wrapped;
  }

  function mountExporter(app:any, wal:any){
    if (app.__void_wal_v3_exporter) return;
    app.__void_wal_v3_exporter = true;
    app.get("/__void/metrics/wal.v3.prom", (_:any,res:any)=>{
      let out = "# HELP void_wal_exporter_v3 1 if v3 exporter active\n# TYPE void_wal_exporter_v3 gauge\nvoid_wal_exporter_v3 1\n";
      try { out += wal.metricsProm(); } catch { out += "void_wal_exporter_error 1\n"; }
      out += `# TYPE void_wal_synthetic_seq gauge\nvoid_wal_synthetic_seq ${wal.__synthetic_seq||0}\n`;
      out += `# TYPE void_wal_setter_events_total counter\nvoid_wal_setter_events_total ${G.__wal_setter_events_total||0}\n`;
      res.type("text/plain").send(out);
    });
    app.get("/__void/wal/hook.status", (_:any,res:any)=>{
      // read the currently returned function to judge "active"
      const SegStore = G.__void_store_class;
      const proto = SegStore?.prototype || G.__void_store_proto || null;
      let cur:any = undefined;
      try { cur = proto && Object.getOwnPropertyDescriptor(proto,"saveBlock")?.get?.call(proto) || proto?.saveBlock; } catch {}
      res.json({
        sticky:true, wrap_flag: WRAP_FLAG,
        active: !!(cur && cur[WRAP_FLAG]),
        has_setter: !!(proto && Object.getOwnPropertyDescriptor(proto,"saveBlock")?.set),
        seen_setter_events: G.__wal_setter_events_total||0,
      });
    });
  }

  async function installSticky(){
    const app:any = getApp(); if (!app || typeof app.get!=="function") return false;
    const mod = await import("../chain/seg_store.js");
    const SegStore:any = mod.SegStore;
    if (!SegStore || !SegStore.prototype) return false;
    G.__void_store_class = SegStore; G.__void_store_proto = SegStore.prototype;

    const wal = await ensureWal(); wal.__synthetic_seq ||= 0;

    const desc = Object.getOwnPropertyDescriptor(SegStore.prototype, "saveBlock");
    // Always replace with our proxy accessor that wraps-through
    const prevGet = desc?.get;
    const prevSet = desc?.set;
    let prevValue:any = (desc && "value" in desc) ? desc.value : undefined;

    Object.defineProperty(SegStore.prototype, "saveBlock", {
      configurable: true, enumerable: false,
      get: function(){
        let fn:any;
        if (prevGet) { try { fn = prevGet.call(this); } catch { fn = undefined; } }
        else { fn = prevValue ?? (SegStore.prototype as any).__sb_fallback_value; }
        return wrapIfNeeded(fn, wal);
      },
      set: function(fn:any){
        G.__wal_setter_events_total = (G.__wal_setter_events_total||0) + 1;
        if (prevSet) { try { prevSet.call(this, fn); } catch {} }
        else { prevValue = fn; (SegStore.prototype as any).__sb_fallback_value = fn; }
      },
    });

    // Touch setter once to flow current impl through our setter, then wrapping occurs on next get()
    try { const cur = (prevGet ? prevGet.call(SegStore.prototype) : (prevValue||SegStore.prototype.saveBlock)); SegStore.prototype.saveBlock = cur; } catch {}

    mountExporter(app, wal);
    return true;
  }

  (function boot(){
    const tryMount = async ()=>{ const ok = await installSticky(); if (!ok) setTimeout(tryMount, TICK); };
    tryMount();
    setInterval(()=>{ installSticky(); }, ENFORCE_MS);
  })();
})();
// ---------------- WAL v4 (instance-level, reasserting) ----------------
(function walV4InstanceWrap(){
  const G:any = globalThis as any;
  const TICK=350, REASSERT_MS=1500, FLAG="__wal_v4_wrapped";
  function getApp(){ return G.__void_http_app || (G as any).app; }
  function dataDir(){ return process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data_a"; }

  async function ensureWal(){
    const { WALv1 } = await import("../wal/wal_v1.js");
    return (G.__void_wal_v1 ||= new WALv1(dataDir()));
  }

  function wrapSaveBlock(fn:any, wal:any){
    if (!fn) return fn;
    if ((fn as any)[FLAG]) return fn;
    const wrapped = async function saveBlock_WALv4(this:any, block:any){
      // derive n (fallback to synthetic)
      let n = Number(block?.number ?? block?.header?.number ?? -1);
      if (!(Number.isFinite(n) && n>=0)) { wal.__synthetic_seq = (wal.__synthetic_seq||0) + 1; n = wal.__synthetic_seq; }
      let hash:any = block?.hash;
      if (!hash && block?.header){ const m = await import("../chain/block.js"); hash = await m.blockHash(block.header); }
      const txRoot = block?.header?.txRoot || block?.txRoot || null;
      try { wal.append(n, txRoot, hash); } catch {}
      try { const out = await fn.apply(this, arguments as any); try { wal.commit(n); } catch {}; return out; }
      catch(e){ try { wal.commit(n); } catch {}; throw e; }
    };
    (wrapped as any)[FLAG] = true;
    return wrapped;
  }

  function mountExporter(app:any, wal:any){
    if (app.__void_wal_v4_exporter) return;
    app.__void_wal_v4_exporter = true;
    app.get("/__void/metrics/wal.v3.prom", (_:any,res:any)=>{
      let out = "# HELP void_wal_exporter_v3 1 if v3 exporter active\n# TYPE void_wal_exporter_v3 gauge\nvoid_wal_exporter_v3 1\n";
      try { out += wal.metricsProm(); } catch { out += "void_wal_exporter_error 1\n"; }
      out += `# TYPE void_wal_synthetic_seq gauge\nvoid_wal_synthetic_seq ${wal.__synthetic_seq||0}\n`;
      out += `# TYPE void_wal_setter_events_total counter\nvoid_wal_setter_events_total ${(G.__wal_setter_events_total||0)}\n`;
      res.type("text/plain").send(out);
    });
    app.get("/__void/wal/hook.status", (_:any,res:any)=>{
      const app2:any = getApp();
      const store:any = app2?.locals?.store || G.__void_store_instance;
      const cur = store?.saveBlock;
      res.json({ sticky:true, wrap_flag: FLAG, active: !!(cur && cur[FLAG]), has_setter: true, seen_setter_events: (G.__wal_setter_events_total||0) });
    });
  }

  async function install(){
    const app:any = getApp(); if (!app || typeof app.get!=="function") return false;
    // stash instance once available
    const store:any = app.locals?.store || G.__void_store_instance;
    if (!store || typeof store.saveBlock!=="function"){ setTimeout(install, TICK); return false; }
    G.__void_store_instance = store;

    const wal = await ensureWal(); wal.__synthetic_seq ||= 0;
    // wrap once now …
    store.saveBlock = wrapSaveBlock(store.saveBlock, wal);
    // …and reassert periodically in case other patches replace it
    if (!G.__void_wal_v4_timer){
      G.__void_wal_v4_timer = setInterval(()=>{ 
        if (!G.__void_store_instance) return;
        const s = G.__void_store_instance;
        s.saveBlock = wrapSaveBlock(s.saveBlock, wal);
      }, REASSERT_MS);
    }
    mountExporter(app, wal);
    return true;
  }

  (function boot(){ const t = ()=>install().then(ok=>{ if (!ok) setTimeout(t, TICK); }); t(); })();
})();
// ---------------- WAL v5 (instance trap: property setter + rewrap) ----------------
(function walV5Trap(){
  const G:any = globalThis as any;
  const FLAG="__wal_v5_wrapped", RAW="__wal_v5_raw";
  const TICK=300, REASSERT_MS=1500;

  function getApp(){ return G.__void_http_app || (G as any).app; }
  async function ensureWal(){
    const { WALv1 } = await import("../wal/wal_v1.js");
    const dir = process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data_a";
    return (G.__void_wal_v1 ||= new WALv1(dir));
  }

  function wrap(fn:any, wal:any){
    if (!fn) return fn;
    if ((fn as any)[FLAG]) return fn;
    const wrapped = async function saveBlock_WALv5(this:any, block:any){
      let n = Number(block?.number ?? block?.header?.number ?? -1);
      if (!(Number.isFinite(n) && n>=0)) { wal.__synthetic_seq = (wal.__synthetic_seq||0) + 1; n = wal.__synthetic_seq; }
      let hash:any = block?.hash;
      if (!hash && block?.header){ const m = await import("../chain/block.js"); hash = await m.blockHash(block.header); }
      const txRoot = block?.header?.txRoot || block?.txRoot || null;
      try { wal.append(n, txRoot, hash); } catch {}
      try { const out = await (fn as any).apply(this, arguments as any); try { wal.commit(n); } catch {}; return out; }
      catch(e){ try { wal.commit(n); } catch {}; throw e; }
    };
    (wrapped as any)[FLAG] = true;
    return wrapped;
  }

  function mountExporter(app:any, wal:any){
    if (app.__void_wal_v5_exporter) return; app.__void_wal_v5_exporter = true;
    app.get("/__void/metrics/wal.v3.prom", (_:any,res:any)=>{
      let out = "# HELP void_wal_exporter_v3 1 if v3 exporter active\n# TYPE void_wal_exporter_v3 gauge\nvoid_wal_exporter_v3 1\n";
      try { out += wal.metricsProm(); } catch { out += "void_wal_exporter_error 1\n"; }
      out += `# TYPE void_wal_synthetic_seq gauge\nvoid_wal_synthetic_seq ${wal.__synthetic_seq||0}\n`;
      out += `# TYPE void_wal_setter_events_total counter\nvoid_wal_setter_events_total ${(G.__wal_setter_events_total||0)}\n`;
      res.type("text/plain").send(out);
    });
    app.get("/__void/wal/hook.status", (_:any,res:any)=>{
      const s:any = (getApp()?.locals?.store) || G.__void_store_instance;
      const cur = s?.saveBlock;
      res.json({ sticky:true, wrap_flag: FLAG, active: !!(cur && cur[FLAG]), has_setter: true, seen_setter_events: (G.__wal_setter_events_total||0) });
    });
    app.get("/__void/wal/fn.status", (_:any,res:any)=>{
      const s:any = (getApp()?.locals?.store) || G.__void_store_instance;
      res.json({
        has_store: !!s,
        typeof_saveBlock: typeof s?.saveBlock,
        wrapped: !!(s?.saveBlock && s.saveBlock[FLAG]),
        has_raw: !!s?.[RAW],
        fn_name: (s?.saveBlock && s.saveBlock.name) || null
      });
    });
  }

  function installTrapOnStore(store:any, wal:any){
    if (!store) return false;
    // Keep current function as raw
    if (!store[RAW] && typeof store.saveBlock === "function") store[RAW] = store.saveBlock;

    // Define a trapping accessor on saveBlock
    const desc = Object.getOwnPropertyDescriptor(store, "saveBlock");
    const currentGetter = desc && (desc.get || desc.set) ? desc.get : null;
    if (currentGetter && (currentGetter as any)[FLAG]) return true; // already trapped

    let _raw = store[RAW] || store.saveBlock;
    Object.defineProperty(store, "saveBlock", {
      configurable: true,
      enumerable: false,
      get: function(){
        // Always return wrapped version
        return wrap(_raw, wal);
      },
      set: function(v:any){
        // Every replacement becomes our new raw; callers still get wrapped
        _raw = v;
      }
    });
    // mark getter so we know it's ours
    (Object.getOwnPropertyDescriptor(store, "saveBlock")!.get as any)[FLAG] = true;
    return true;
  }

  async function boot(){
    const tryOnce = async()=>{
      const app:any = getApp(); if (!app || typeof app.get!=="function") return false;
      const store:any = app.locals?.store || G.__void_store_instance;
      if (!store || typeof store.saveBlock!=="function") return false;
      G.__void_store_instance = store;
      const wal = await ensureWal(); wal.__synthetic_seq ||= 0;
      installTrapOnStore(store, wal);
      mountExporter(app, wal);
      // Reassert periodically (in case store object is swapped entirely)
      if (!G.__void_wal_v5_timer){
        G.__void_wal_v5_timer = setInterval(()=>{
          const s:any = getApp()?.locals?.store || G.__void_store_instance;
          if (!s) return;
          if (!Object.getOwnPropertyDescriptor(s, "saveBlock")?.get?.[FLAG]){
            const w = G.__void_wal_v1 || wal;
            installTrapOnStore(s, w);
          }
        }, REASSERT_MS);
      }
      return true;
    };
    (async function loop(){ if (!(await tryOnce())) setTimeout(loop, TICK); })();
  }
  boot();
})();
// ---------------- WAL v6 (reassert loop + status routes, pure-additive) ----------------
(function walV6Reassert(){
  const G:any = globalThis as any;
  const FLAG="__wal_v6_wrapped";
  const RAW ="__wal_v6_raw";
  const TICK=500;

  function getApp(){ return G.__void_http_app || (G as any).app; }
  async function getWal(){
    const { WALv1 } = await import("../wal/wal_v1.js");
    const dir = process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data_a";
    return (G.__void_wal_v1 ||= new WALv1(dir));
  }
  function wrap(fn:any, wal:any){
    if (!fn) return fn;
    if ((fn as any)[FLAG]) return fn;
    const wrapped = async function saveBlock_WALv6(this:any, block:any){
      // number / synthetic fallback
      let n = Number(block?.number ?? block?.header?.number ?? -1);
      if (!(Number.isFinite(n) && n>=0)) { wal.__synthetic_seq = (wal.__synthetic_seq||0) + 1; n = wal.__synthetic_seq; }
      // txRoot/hash best-effort
      let hash:any = block?.hash;
      if (!hash && block?.header){ const m = await import("../chain/block.js"); try { hash = await m.blockHash(block.header); } catch {} }
      const txRoot = block?.header?.txRoot || block?.txRoot || null;
      try { wal.append(n, txRoot, hash); } catch {}
      try { const out = await (fn as any).apply(this, arguments as any); try { wal.commit(n); } catch {}; return out; }
      catch(e){ try { wal.commit(n); } catch {}; throw e; }
    };
    (wrapped as any)[FLAG] = true;
    return wrapped;
  }

  function mountRoutes(app:any, wal:any){
    if (app.__void_wal_v6_routes) return; app.__void_wal_v6_routes = true;
    // prom exporter (v3 path)
    app.get("/__void/metrics/wal.v3.prom", (_:any,res:any)=>{
      let out = "# HELP void_wal_exporter_v3 1 if v3 exporter active\n# TYPE void_wal_exporter_v3 gauge\nvoid_wal_exporter_v3 1\n";
      try { out += wal.metricsProm(); } catch { out += "void_wal_exporter_error 1\n"; }
      out += `# TYPE void_wal_synthetic_seq gauge\nvoid_wal_synthetic_seq ${wal.__synthetic_seq||0}\n`;
      res.type("text/plain").send(out);
    });
    // hook + fn status
    app.get("/__void/wal/hook.status", (_:any,res:any)=>{
      const s:any = app.locals?.store || G.__void_store_instance;
      res.json({ sticky:true, wrap_flag:FLAG, active: !!(s?.saveBlock && s.saveBlock[FLAG]) , has_setter:true, seen_setter_events: (G.__wal_setter_events_total||0) });
    });
    app.get("/__void/wal/fn.status", (_:any,res:any)=>{
      const s:any = app.locals?.store || G.__void_store_instance;
      const d = s ? Object.getOwnPropertyDescriptor(s,"saveBlock") : null;
      res.json({
        has_store: !!s,
        typeof_saveBlock: s ? typeof s.saveBlock : null,
        wrapped: !!(s?.saveBlock && s.saveBlock[FLAG]),
        has_raw: !!s?.[RAW],
        own_prop: !!d,
        getter: !!d?.get,
        setter: !!d?.set,
        fn_name: (s?.saveBlock && s.saveBlock.name) || null
      });
    });
  }

  async function reassert(){
    const app:any = getApp(); if (!app || typeof app.get !== "function") return;
    const wal = await getWal(); wal.__synthetic_seq ||= 0;
    const store:any = app.locals?.store || G.__void_store_instance;
    if (!store || typeof store.saveBlock!=="function") return;
    G.__void_store_instance = store;
    if (!store[RAW]) store[RAW] = store.saveBlock;
    if (!store.saveBlock[FLAG]) store.saveBlock = wrap(store.saveBlock, wal);
    mountRoutes(app, wal);
  }

  (function loop(){
    reassert().catch(()=>{}); setTimeout(loop, TICK);
  })();
})();
// ---------------- WAL v7 (Vector-7): proto+instance wrap, safe-boot paths, reassert ----------------
(function walV7Vector(){
  const G:any = globalThis as any;
  const FLAG="__wal_v7_wrapped";
  const RAW ="__wal_v7_raw";
  const TICK=400;
  let overwrites = 0;

  function getApp(){ return G.__void_http_app || (G as any).app; }

  async function getMods(){
    const seg = await import("../chain/seg_store.js");
    const blk = await import("../chain/block.js");
    const { WALv1 } = await import("../wal/wal_v1.js");
    const dir = process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data_a";
    const wal = (G.__void_wal_v1 ||= new WALv1(dir));
    wal.__synthetic_seq ||= 0;
    return {SegStore: seg.SegStore, blockHash: blk.blockHash, wal};
  }

  function mkWrapped(fn:any, wal:any, blockHash:any){
    if (!fn) return fn;
    if ((fn as any)[FLAG]) return fn;
    const wrapped = async function saveBlock_WALv7(this:any, block:any){
      let n = Number(block?.number ?? block?.header?.number ?? -1);
      if (!(Number.isFinite(n) && n>=0)) { wal.__synthetic_seq = (wal.__synthetic_seq||0)+1; n = wal.__synthetic_seq; }
      let hash:any = block?.hash;
      if (!hash && block?.header){ try{ hash = await blockHash(block.header); }catch{} }
      const txRoot = block?.header?.txRoot || (block?.txRoot ?? null);
      try { wal.append(n, txRoot, hash); } catch {}
      try {
        const out = await (fn as any).apply(this, arguments as any);
        try { wal.commit(n); } catch {}
        return out;
      } catch(e){
        try { wal.commit(n); } catch {}
        throw e;
      }
    };
    (wrapped as any)[FLAG] = true;
    return wrapped;
  }

  function mountStatus(app:any, wal:any){
    if (app.__void_wal_v7_routes) return; app.__void_wal_v7_routes = true;

    // Prom exporter (v3 path) – allowed under safe-boot
    app.get("/__void/metrics/wal.v3.prom", (_:any,res:any)=>{
      let out = "# HELP void_wal_exporter_v3 1 if v3 exporter active\n# TYPE void_wal_exporter_v3 gauge\nvoid_wal_exporter_v3 1\n";
      try { out += wal.metricsProm(); } catch { out += "void_wal_exporter_error 1\n"; }
      out += `# TYPE void_wal_synthetic_seq gauge
void_wal_synthetic_seq ${wal.__synthetic_seq||0}
# TYPE void_wal_overwrites_total counter
void_wal_overwrites_total ${overwrites}
# TYPE void_wal_wrapped gauge
void_wal_wrapped ${((G.__void_store_instance?.saveBlock && G.__void_store_instance.saveBlock[FLAG])?1:0)}
`;
      res.type("text/plain").send(out);
    });

    // JSON status also under __void/metrics (safe-boot-friendly)
    app.get("/__void/metrics/wal.status.json", (_:any,res:any)=>{
      const s:any = G.__void_store_instance;
      res.json({
        wrapped: !!(s?.saveBlock && s.saveBlock[FLAG]),
        overwrites,
        synthetic_seq: (G.__void_wal_v1?.__synthetic_seq)||0
      });
    });
  }

  async function reassert(){
    const app:any = getApp(); if (!app || typeof app.get!=="function") return;
    const {SegStore, blockHash, wal} = await getMods();

    // 1) Prototype guard: hook setter so any reassignment is auto-wrapped
    const pd = Object.getOwnPropertyDescriptor(SegStore.prototype, "saveBlock") || {};
    if (!G.__wal_v7_proto_guard){
      let current = (pd.value || SegStore.prototype.saveBlock);
      const getter = function(){ return current; };
      const setter = function(v:any){ current = mkWrapped(v, wal, blockHash); overwrites++; };
      try {
        Object.defineProperty(SegStore.prototype, "saveBlock", { configurable: true, enumerable: false, get: getter, set: setter });
        // initialize via setter once
        SegStore.prototype.saveBlock = current;
        G.__wal_v7_proto_guard = true;
      } catch {}
    }

    // 2) Instance guard: wrap live store if present
    const store:any = app.locals?.store || G.__void_store_instance;
    if (store && typeof store.saveBlock === "function"){
      G.__void_store_instance = store;
      if (!store[RAW]) store[RAW] = store.saveBlock;
      if (!store.saveBlock[FLAG]) store.saveBlock = mkWrapped(store.saveBlock, wal, blockHash);
    }

    // 3) Routes
    mountStatus(app, wal);
  }

  (function loop(){ reassert().catch(()=>{}); setTimeout(loop, TICK); })();
})();
// ---------------- WAL v7.2 (Vector-7): value-hook + defineProperty trap + instance reseat ----------------
(function walV72Vector(){
  const G:any = globalThis as any;
  const FLAG="__wal_v72_wrapped";
  const RAW ="__wal_v72_raw";
  const TICK=400;
  let overwrites = 0;

  function getApp(){ return G.__void_http_app || (G as any).app; }

  async function getMods(){
    const seg = await import("../chain/seg_store.js");
    const blk = await import("../chain/block.js");
    const { WALv1 } = await import("../wal/wal_v1.js");
    const dir = process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data_a";
    const wal = (G.__void_wal_v1 ||= new WALv1(dir));
    wal.__synthetic_seq ||= 0;
    return {SegStore: seg.SegStore, blockHash: blk.blockHash, wal};
  }

  function mkWrapped(fn:any, wal:any, blockHash:any){
    if (!fn) return fn;
    if ((fn as any)[FLAG]) return fn;
    const wrapped = async function saveBlock_WALv72(this:any, block:any){
/* [saveblock.recursion.guard.v1.wal] */
  const __G:any = (globalThis as any);
  __G.__void_sbwal_depth_v1 = (Number(__G.__void_sbwal_depth_v1||0) + 1);
  try {
    if (Number(__G.__void_sbwal_depth_v1||0) > 1) {
      // recursion detected: bypass wrapper loop by calling a base proto saveBlock
      const self:any = (this as any);
      let base:any = null;
      try {
        let proto:any = self;
        let steps = 0;
        while (proto && steps < 25) {
          proto = Object.getPrototypeOf(proto);
          const fn:any = proto && proto.saveBlock;
          if (typeof fn === "function") {
            const nm = String(fn.name || "");
            if (nm !== "saveBlock_WALv72" && nm !== "saveBlockFinalV2" && nm !== "saveBlock_WALv72") {
              base = fn.bind(self);
              break;
            }
          }
          steps++;
        }
      } catch {}
      if (typeof base === "function") {
        return base.apply(self, arguments as any);
      }
    }
  } finally {
    __G.__void_sbwal_depth_v1 = Math.max(0, Number(__G.__void_sbwal_depth_v1||1) - 1);
  }
/* [saveblock.recursion.guard.v1.wal] */ // end

      let n = Number(block?.number ?? block?.header?.number ?? -1);
      if (!(Number.isFinite(n) && n>=0)) { wal.__synthetic_seq = (wal.__synthetic_seq||0)+1; n = wal.__synthetic_seq; }
      let hash:any = block?.hash;
      if (!hash && block?.header){ try{ hash = await blockHash(block.header); }catch{} }
      const txRoot = block?.header?.txRoot || (block?.txRoot ?? null);
      try { wal.append(n, txRoot, hash); } catch {}
      try {
        const out = await (fn as any).apply(this, arguments as any);
        try { wal.commit(n); } catch {}
        return out;
      } catch(e){
        try { wal.commit(n); } catch {}
        throw e;
      }
    };
    (wrapped as any)[FLAG] = true;
    return wrapped;
  }

  function mountStatus(app:any, wal:any){
    if (app.__void_wal_v72_routes) return; app.__void_wal_v72_routes = true;

    // Prom exporter: allowed under safeboot
    app.get("/__void/metrics/wal.v3.prom", (_:any,res:any)=>{
      let out = "# HELP void_wal_exporter_v3 1 if v3 exporter active\n# TYPE void_wal_exporter_v3 gauge\nvoid_wal_exporter_v3 1\n";
      try { out += wal.metricsProm(); } catch { out += "void_wal_exporter_error 1\n"; }
      const wrapped = !!(G.__void_store_instance?.saveBlock && G.__void_store_instance.saveBlock[FLAG]);
      out += `# TYPE void_wal_synthetic_seq gauge
void_wal_synthetic_seq ${wal.__synthetic_seq||0}
# TYPE void_wal_overwrites_total counter
void_wal_overwrites_total ${overwrites}
# TYPE void_wal_wrapped gauge
void_wal_wrapped ${wrapped?1:0}
`;
      res.type("text/plain").send(out);
    });

    // Safe JSON status
    app.get("/__void/metrics/wal.status.json", (_:any,res:any)=>{
      const wrapped = !!(G.__void_store_instance?.saveBlock && G.__void_store_instance.saveBlock[FLAG]);
      res.json({ wrapped, overwrites, synthetic_seq: (G.__void_wal_v1?.__synthetic_seq)||0 });
    });
  }

  async function arm(){
    const app:any = getApp(); if (!app || typeof app.get!=="function") return;
    const {SegStore, blockHash, wal} = await getMods();

    // (A) Wrap current prototype value (plain function → wrapped)
    try {
      const cur = SegStore.prototype.saveBlock;
      if (typeof cur === "function" && !cur[FLAG]) {
        SegStore.prototype.saveBlock = mkWrapped(cur, wal, blockHash);
        overwrites++;
      }
    } catch {}

    // (B) Trap future defineProperty writes to SegStore.prototype.saveBlock
    if (!G.__wal_v72_define_trap){
      const origDefine = Object.defineProperty;
      Object.defineProperty = function(target:any, prop:any, desc:any){
        try{
          const isSeg = target && prop==="saveBlock" && (
            // target === SegStore.prototype (best-effort id check)
            (target === SegStore.prototype) ||
            // or stringy class name match fallback
            (target?.constructor?.name === "SegStore" && target?.saveBlock)
          );
          if (isSeg && typeof desc?.value === "function" && !desc.value[FLAG]){
            desc = { ...desc, value: mkWrapped(desc.value, (G.__void_wal_v1), (G.__void_blockHash||(()=>{}))) };
            overwrites++;
          }
        }catch{}
        return (origDefine as any).call(Object, target, prop, desc);
      };
      G.__wal_v72_define_trap = true;
    }

    // (C) Reseat live instance if present
    const store:any = app.locals?.store || G.__void_store_instance;
    if (store && typeof store.saveBlock === "function"){
      G.__void_store_instance = store;
      if (!store[RAW]) store[RAW] = store.saveBlock;
      if (!store.saveBlock[FLAG]) { store.saveBlock = mkWrapped(store.saveBlock, (G.__void_wal_v1), (G.__void_blockHash||(()=>{}))); overwrites++; }
    }

    mountStatus(app, (G.__void_wal_v1));
  }

  (function loop(){ arm().catch(()=>{}); setTimeout(loop, TICK); })();
})();
