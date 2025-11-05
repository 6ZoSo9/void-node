export default function mountProposer(app){
  const state = (globalThis.__void_proposer ||= {
    enabled:false, ms:2000, timer:null, lastNumber:-1
  });

  function tick(){
    // Minimal dev tick: bump head; other addons (header3/txroot/seals) will follow
    state.lastNumber = (state.lastNumber ?? -1) + 1;
    (globalThis.__void_last_head_number = state.lastNumber);
  }

  function startLoop(ms){
    state.ms = Math.max(250, Number(ms)||2000);
    if (state.timer) clearInterval(state.timer);
    state.timer = setInterval(tick, state.ms);
    state.enabled = true;
  }

  function stopLoop(){
    if (state.timer) clearInterval(state.timer);
    state.timer = null; state.enabled = false;
  }

  app.get("/proposer/auto/status2", (_req,res)=>{
    res.json({ ok:true, enabled:state.enabled, ms:state.ms, last:state.lastNumber });
  });
  app.post("/proposer/auto/start", (req,res)=>{
    const ms = Number(req.query.ms || 2000);
    startLoop(ms);
    res.json({ ok:true, enabled:state.enabled, ms:state.ms });
  });
  app.post("/proposer/auto/stop", (_req,res)=>{
    stopLoop();
    res.json({ ok:true, enabled:state.enabled });
  });

  // small Prom text exporter so existing Prom jobs can see something
  app.get("/metrics/void/proposer.v3b.prom", (_req,res)=>{
    res.type("text/plain; version=0.0.4");
    const n = state.lastNumber ?? -1;
    res.end(`void_proposer_enabled ${state.enabled?1:0}\nvoid_seal_last_number ${n}\n`);
  });

  // honor env to auto-start
  if ((process.env.PROPOSER_AUTO||"") === "1") startLoop(process.env.PROPOSER_TICK_MS||2000);
}
