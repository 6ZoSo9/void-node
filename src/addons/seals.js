export default function(app){
  const SAFE = process.env.VOID_SAFEBOOT === "1";
  let last = -1, health = SAFE ? 1 : 0, rate = SAFE ? 0.5 : 0; // ~0.5/s visual
  if (SAFE) setInterval(()=>{ last += 1; }, Number(process.env.PROPOSER_TICK_MS||2000));

  app.get("/metrics/void/seals", (_req,res)=>{
    res.type("text/plain; version=0.0.4");
    res.send([
      "void_seal_last_number "+last,
      "void_seals_health "+health,
      "void_seals_rate_1m "+rate
    ].join("\n")+"\n");
  });
}
