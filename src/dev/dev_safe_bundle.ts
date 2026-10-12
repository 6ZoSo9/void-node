// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

/**
 * Dev Safe Bundle — idempotent, additive observer:
 * - Patches SegStore.append to snapshot sealed tx hashes (non-invasive)
 * - Adds routes: /dev/diag/routes, /dev/hook/status, /dev/last-seal,
 *                /dev/sealed/window, /dev/blocks/:n/txs/raw
 * - Adds JSON-only 404/500 tail so curl|jq never sees HTML
 */
import { SegStore } from "../chain/seg_store.js";

function recordSmallEmptyCatchVisibilityFailure_src_dev_dev_safe_bundle_ts(scope: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  console.warn("VOID_SMALL_EMPTY_CATCH_VISIBILITY_PACK_V1_FAILURE_VISIBLE", {
    file: "src/dev/dev_safe_bundle.ts",
    scope,
    message,
  });
}


(function devSafeBundle(){
  const g:any = globalThis as any;
  if (g.__void_dev_safe_bundle_installed) return;
  g.__void_dev_safe_bundle_installed = true;
  console.log("[diag] devSafeBundle: init");

  function getApp(): any { return g.__void_http_app || (g as any).app || undefined; }

  // 1) Patch SegStore.append to snapshot sealed tx hashes
  function tryPatchAppend(): boolean {
    try {
      const S:any = (SegStore as unknown);
      if (!S || !S.prototype || typeof S.prototype.append !== "function") return false;
      if (S.__void_append_patched_dev_safe_bundle) return true;

      const orig = S.prototype.append;
      S.prototype.append = function(...args:any[]){
        try {
          const blk:any = args.find((x:any)=> x && typeof x==="object" && typeof x.number==="number") ?? args[0];
          const number = (blk && blk.number) ?? args[0];
          const txs:any[] = Array.isArray(blk?.txs) ? blk.txs : (args.find((x:any)=> Array.isArray(x)) ?? []);
          const hashes = (Array.isArray(txs)?txs:[])
            .map((t:any)=> (typeof t==="string") ? t : (t?.hash ?? null))
            .filter(Boolean);
          g.__void_last_seal = { number, count: hashes.length, hashes, at: Date.now() };
        } catch (err) { recordSmallEmptyCatchVisibilityFailure_src_dev_dev_safe_bundle_ts("empty-catch-1", err); }
        return orig.apply(this, args);
      };

      S.__void_append_patched_dev_safe_bundle = true;
      console.log("[diag] SegStore.append patched (dev-safe-bundle)");
      return true;
    } catch {
      return false;
    }
  }

  // 2) JSON-only error tail
  function attachJsonTail(app:any){
    if (!app || app.__void_json_tail_attached) return;
    app.__void_json_tail_attached = true;

    app.use((req:any, res:any, next:any)=>{
      if (res.headersSent) return next();
      res.status(404).json({ ok:false, error:"not_found", path:req.url });
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    app.use((err:any, _req:any, res:any, _next:any)=>{
      try {
        const msg = (err && (err.message||String(err))) || "internal_error";
        res.status(500).json({ ok:false, error: msg });
      } catch {
        res.status(500).json({ ok:false, error: "internal_error" });
      }
    });

    console.log("[diag] devSafeBundle JSON error tail attached");
  }

  // 3) Dev routes
  function attachRoutes(app:any){
    if (!app || app.__void_dev_safe_routes_attached) return;
    app.__void_dev_safe_routes_attached = true;

    app.get("/dev/diag/routes", (_req:any, res:any) => {
      try {
        const stack = (app._router?.stack || [])
          .map((l:any)=> l?.route?.path ? { path: l.route.path, methods: Object.keys(l.route.methods||{}) } : null)
          .filter(Boolean);
        res.json({ ok:true, routes: stack });
      } catch(e:any){
        res.status(500).json({ ok:false, error:String(e?.message||e) });
      }
    });

    app.get("/dev/hook/status", (_req:any, res:any) => {
      const S:any = (SegStore as unknown);
      res.json({
        ok: true,
        segstore_visible: !!S,
        segstore_has_prototype: !!(S && S.prototype),
        segstore_has_append: !!(S && S.prototype && typeof S.prototype.append === "function"),
        patched: !!(S && S.__void_append_patched_dev_safe_bundle),
        last: g.__void_last_seal || null
      });
    });

    app.get("/dev/last-seal", (_req:any, res:any) => {
      res.json({ ok:true, last: g.__void_last_seal || null });
    });

    app.get("/dev/sealed/window", async (req:any, res:any) => {
      try {
        const port = +(process.env.HTTP_PORT || 4100);
        const latest = await fetch(`http://127.0.0.1:${port}/blocks/latest/full`).then(r=>r.json()).then(j=>j?.number ?? -1);
        if (latest < 0) return res.status(404).json({ ok:false, error:"latest unavailable" });
        const qf=req.query?.from, qt=req.query?.to;
        const from = Math.max(0, qf? +qf : latest-40);
        const to   = Math.max(from, qt? +qt : latest);
        const blocks:any[] = await fetch(`http://127.0.0.1:${port}/blocks/range?from=${from}&to=${to}`).then(r=>r.json());
        const view = (Array.isArray(blocks)?blocks:[]).map(b=>{
          const txs = Array.isArray(b?.txs)? b.txs : [];
          const hashes = txs.map((t:any)=> (typeof t==="string") ? t : (t?.hash ?? null)).filter(Boolean);
          return { number: b?.number, count: hashes.length, hashes };
        });
        res.json({ ok:true, from, to, blocks:view });
      } catch(e:any){
        res.status(500).json({ ok:false, error:String(e?.message||e) });
      }
    });

    app.get("/dev/blocks/:n/txs/raw", async (req:any, res:any) => {
      try {
        const n = +req.params.n;
        const port = +(process.env.HTTP_PORT || 4100);
        const arr = await fetch(`http://127.0.0.1:${port}/blocks/range?from=${n}&to=${n}`).then(r=>r.json());
        const b = Array.isArray(arr) ? arr[0] : null;
        if (!b) return res.status(404).json({ ok:false, error:"block_not_found", number:n });
        const txs = Array.isArray(b?.txs) ? b.txs : [];
        res.json({ ok:true, number: b?.number ?? n, tx_count: txs.length, types: txs.map((t:any)=> typeof t), sample: txs.slice(0,5) });
      } catch(e:any){
        res.status(500).json({ ok:false, error:String(e?.message||e) });
      }
    });

    console.log("[diag] devSafeBundle routes attached");
  }

  // 4) Retry loops (bounded)
  let triesPatch = 0;
  (function loopPatch(){
    if (tryPatchAppend()) return;
    if (++triesPatch < 120) setTimeout(loopPatch, 500);
    else console.warn("[diag] devSafeBundle: append patch did not land");
  })();

  let triesRoutes = 0;
  (function loopRoutes(){
    const app = getApp();
    if (app && typeof app.get === "function") { attachRoutes(app); attachJsonTail(app); return; }
    if (++triesRoutes < 120) setTimeout(loopRoutes, 500);
    else console.warn("[diag] devSafeBundle: no app handle after retries");
  })();
})();
