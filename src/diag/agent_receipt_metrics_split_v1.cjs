/* agent_receipt_metrics_split_v1.cjs (v2)
   Fix: /agent/v0/receipt/new is likely routed through /agent/v0/receipt/:id with id="new".
   So classify by req.path / req.originalUrl / req.params.id, NOT by route.path.
   - Counts ONLY on successful responses (status < 400).
   - Exposes /__void/metrics/agent_receipts_split.prom (+ .json).
   - Does NOT change existing legacy counters semantics.
*/
(function(){
  const G = globalThis;
  if (G.__void_agent_receipt_metrics_split_v2) return;
  G.__void_agent_receipt_metrics_split_v2 = true;

  const PREFIX = "/agent/v0/receipt";
  const EXPORT_PROM = "/__void/metrics/agent_receipts_split.prom";
  const EXPORT_JSON = "/__void/metrics/agent_receipts_split.json";

  const VOID_AGENT_RECEIPT_METRICS_SPLIT_EMPTY_CATCH_VISIBILITY_V1_MARKER = "VOID_AGENT_RECEIPT_METRICS_SPLIT_EMPTY_CATCH_VISIBILITY_V1";
  function recordVoidAgentReceiptMetricsSplitEmptyCatchVisibilityV1(site, err) {
    try {
      const g = globalThis;
      const key = "__void_agent_receipt_metrics_split_empty_catch_visibility_v1";
      const bucket = Array.isArray(g[key]) ? g[key] : [];
      bucket.push({ marker: VOID_AGENT_RECEIPT_METRICS_SPLIT_EMPTY_CATCH_VISIBILITY_V1_MARKER, site: String(site || "unknown"), message: err && err.message ? String(err.message) : String(err || "") });
      while (bucket.length > 50) bucket.shift();
      g[key] = bucket;
    } catch (_visibilityRecordErr) {
      /* VOID_AGENT_RECEIPT_METRICS_SPLIT_EMPTY_CATCH_VISIBILITY_V1_RECORD_FAILURE_SUPPRESSED */
    }
  }

  function met(){ return (G.__void_agent_metrics ||= {}); }
  function inc(k){ const m=met(); m[k] = Number(m[k]||0) + 1; }

  function getApp(){
    try { return G.__void_http_app; } catch { return null; }
  }

  function mountExporter(app){
    try{
      if (app.__void_agent_receipts_split_exporter_v2) return;
      app.__void_agent_receipts_split_exporter_v2 = true;

      app.get(EXPORT_JSON, (_req,res)=>{
        const m=met();
        res.json({
          ok:true,
          receipts_new_total: Number(m.receipts_new_total||0),
          receipts_write_total: Number(m.receipts_write_total||0),
          receipts_total: Number(m.receipts_total||0),
          receipts_errors: Number(m.receipts_errors||0),
        });
      });

      app.get(EXPORT_PROM, (_req,res)=>{
        const m=met();
        const lines=[];
        lines.push("# HELP void_agent_receipts_new_total successful /agent/v0/receipt/new responses");
        lines.push("# TYPE void_agent_receipts_new_total counter");
        lines.push(`void_agent_receipts_new_total ${Number(m.receipts_new_total||0)}`);
        lines.push("# HELP void_agent_receipts_write_total successful /agent/v0/receipt/:id writes (excludes /new)");
        lines.push("# TYPE void_agent_receipts_write_total counter");
        lines.push(`void_agent_receipts_write_total ${Number(m.receipts_write_total||0)}`);
        lines.push("# HELP void_agent_receipts_total total receipts written (legacy semantics)");
        lines.push("# TYPE void_agent_receipts_total counter");
        lines.push(`void_agent_receipts_total ${Number(m.receipts_total||0)}`);
        lines.push("# HELP void_agent_receipts_errors total receipt write errors (legacy)");
        lines.push("# TYPE void_agent_receipts_errors counter");
        lines.push(`void_agent_receipts_errors ${Number(m.receipts_errors||0)}`);
        res.setHeader("content-type","text/plain; version=0.0.4; charset=utf-8");
        res.send(lines.join("\n")+"\n");
      });
    }catch(exporterErr){ recordVoidAgentReceiptMetricsSplitEmptyCatchVisibilityV1("VOID_AGENT_RECEIPT_METRICS_SPLIT_EMPTY_CATCH_VISIBILITY_V1_SITE_MOUNT_EXPORTER", exporterErr); }
  }

  function attachMiddleware(app){
    try{
      if (app.__void_agent_receipts_split_mw_v2) return;
      app.__void_agent_receipts_split_mw_v2 = true;

      app.use((req,res,next)=>{
        try{
          const m = (req && req.method) ? String(req.method).toUpperCase() : "";
          if (m !== "POST") return next();

          const path = String(req.path || "");
          const orig = String(req.originalUrl || "");
          if (!path.startsWith(PREFIX) && orig.indexOf(PREFIX) === -1) return next();

          if (res && typeof res.once === "function"){
            res.once("finish", ()=>{
              try{
                const sc = Number(res.statusCode||0);
                if (!sc || sc >= 400) return;

                const p = String(req.path || "");
                const id = (req && req.params && typeof req.params.id === "string") ? req.params.id : "";
                const isNew =
                  (p === (PREFIX + "/new")) ||
                  (orig.indexOf(PREFIX + "/new") !== -1) ||
                  (id === "new");

                // classify:
                if (isNew) inc("receipts_new_total");
                else if (id) inc("receipts_write_total");
                else {
                  // fallback: /agent/v0/receipt/<something> without params
                  // treat as write if it looks like /.../receipt/<one-seg>
                  const m2 = p.match(/^\/agent\/v0\/receipt\/([^\/]+)$/);
                  if (m2) inc("receipts_write_total");
                }
              }catch(finishClassifyErr){ recordVoidAgentReceiptMetricsSplitEmptyCatchVisibilityV1("VOID_AGENT_RECEIPT_METRICS_SPLIT_EMPTY_CATCH_VISIBILITY_V1_SITE_FINISH_CLASSIFY", finishClassifyErr); }
            });
          }
        }catch(middlewareErr){ recordVoidAgentReceiptMetricsSplitEmptyCatchVisibilityV1("VOID_AGENT_RECEIPT_METRICS_SPLIT_EMPTY_CATCH_VISIBILITY_V1_SITE_MIDDLEWARE_BODY", middlewareErr); }
        return next();
      });
    }catch(attachErr){ recordVoidAgentReceiptMetricsSplitEmptyCatchVisibilityV1("VOID_AGENT_RECEIPT_METRICS_SPLIT_EMPTY_CATCH_VISIBILITY_V1_SITE_ATTACH_MIDDLEWARE", attachErr); }
  }

  function tryAttach(){
    const app = getApp();
    if (!app) return false;
    attachMiddleware(app);
    mountExporter(app);
    return true;
  }

  let tries = 0;
  const maxTries = 30; // ~6s at 200ms
  const t = setInterval(()=>{
    tries++;
    try{
      const ok = tryAttach();
      if (ok || tries >= maxTries){
        clearInterval(t);
        try{ console.error(`[agent_receipts_split_metrics_v2] done tries=${tries} ok=${!!ok}`); }catch(doneLogErr){ recordVoidAgentReceiptMetricsSplitEmptyCatchVisibilityV1("VOID_AGENT_RECEIPT_METRICS_SPLIT_EMPTY_CATCH_VISIBILITY_V1_SITE_DONE_LOG", doneLogErr); }
      }
    }catch{
      if (tries >= maxTries) clearInterval(t);
    }
  }, 200);
})();
