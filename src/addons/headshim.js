export default function mountHeadShim(app){
  function getHead(){
    if (globalThis.__void_proposer && typeof globalThis.__void_proposer.lastNumber === "number") {
      return globalThis.__void_proposer.lastNumber;
    }
    if (typeof globalThis.__void_last_head_number === "number") {
      return globalThis.__void_last_head_number;
    }
    return -1;
  }

  // Override the latest-number endpoint used by all your scripts/dashboards
  app.get("/blocks/latest/number2.json", (_req, res)=>{
    res.json({ number: getHead(), mode: "addon" });
  });

  // Prom text: head number
  app.get("/metrics/void/head", (_req,res)=>{
    res.type("text/plain; version=0.0.4");
    res.end(`void_head_number ${getHead()}\n`);
  });

  // Legacy seals exporter path (you probed this and saw 404)
  app.get("/metrics/void/seals", (_req,res)=>{
    res.type("text/plain; version=0.0.4");
    const n = getHead();
    const healthy = n >= 0 ? 1 : 0;
    // keep the names you’ve been scraping
    res.end([
      `void_seal_last_number ${n}`,
      `void_seals_health ${healthy}`,
      `void_seals_rate_1m 0`
    ].join("\n")+"\n");
  });
}
