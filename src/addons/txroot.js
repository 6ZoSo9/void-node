export default function(app){
  const SAFE = (process.env.VOID_SAFEBOOT || "") === "1";
  const TICK = Number(process.env.PROPOSER_TICK_MS || 2000);
  let setTotal = 0, errorsTotal = 0;

  if (SAFE) setInterval(()=>{ setTotal += 1; }, TICK);

  // Health endpoint (Prom-compatible or JSON)
  app.get("/health/txroot3", (req,res)=>{
    const healthy = SAFE ? 1 : 0;
    if (req.query.format === "prom"){
      res.type("text/plain; version=0.0.4");
      res.send(
        "# HELP void_txroot_health 1=healthy,0=degraded\n" +
        "# TYPE void_txroot_health gauge\n" +
        "void_txroot_health " + healthy + "\n"
      );
      return;
    }
    res.json({ ok: healthy===1, mode: SAFE ? "safeboot" : "disabled" });
  });

  // Setter metrics (Prom text)
  app.get("/__void/metrics/txroot4/setter.prom", (_req,res)=>{
    res.type("text/plain; version=0.0.4");
    res.send([
      "void_block_txroot_set_total "+setTotal,
      "void_block_txroot_errors_total "+errorsTotal,
      "void_block_txroot_header_last_set_block -1",
      "void_block_txroot_last_ts_ms "+Date.now()
    ].join("\n")+"\n");
  });
}
