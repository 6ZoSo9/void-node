export default function(app){
  const SAFE = process.env.VOID_SAFEBOOT === "1";
  let lastNumber = -1;
  if (SAFE) setInterval(()=>{ lastNumber += 1; }, Number(process.env.PROPOSER_TICK_MS||2000));

  // Advancing synthetic header endpoint
  app.get("/blocks/:n/header3", (req,res)=>{
    const n = Number(req.params.n);
    if (!SAFE) return res.status(503).json({ok:false, reason:"safeboot disabled"});
    const txRoot = "0x"+("dead".repeat(8)).slice(0,64);
    res.json({ number: n, txCount: 0, txRoot, mode:"safeboot" });
  });

  // Export the advancing "latest number" that dashboards expect
  app.get("/blocks/latest/number2.json", (_req,res)=>{
    res.json({ number: lastNumber, mode: "safeboot" });
  });

  // Metrics exporter matching your prior surface
  app.get("/__void/metrics/header3.prom", (_req,res)=>{
    const match = SAFE ? 1 : 0;
    res.type("text/plain; version=0.0.4");
    res.send([
      `void_header3_match{number="${lastNumber}"} ${match}`,
      `void_header3_last_number ${lastNumber}`,
      `void_header3_last_mismatch -1`
    ].join("\n")+"\n");
  });
}
