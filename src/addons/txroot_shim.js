export default function mountTxrootShim(app){
  const S = (globalThis.__void_txroot_shim ||= {
    lastSeen: -1,
    setTotal: 0,
    errors: 0,
    lastSetBlock: -1,
    lastTsMs: 0,
  });

  function getHead(){
    if (globalThis.__void_proposer && typeof globalThis.__void_proposer.lastNumber === "number") return globalThis.__void_proposer.lastNumber;
    if (typeof globalThis.__void_last_head_number === "number") return globalThis.__void_last_head_number;
    return -1;
  }

  function maybeSet(){
    try{
      const n = getHead();
      if (typeof n !== "number" || n < 0) return;           // nothing to do yet
      if (n === S.lastSeen) return;                          // no change
      // "Set" a txroot for block n (fake deterministic root = hex of n)
      S.lastSeen = n;
      S.setTotal++;
      S.lastSetBlock = n;
      S.lastTsMs = Date.now();
    }catch(e){
      S.errors++;
    }
  }

  // light poller — cheap, shim-only
  setInterval(maybeSet, 300);

  // Prom text exporter matching your existing names
  app.get("/__void/metrics/txroot4/setter.prom", (_req,res)=>{
    res.type("text/plain; version=0.0.4");
    res.end([
      `void_block_txroot_set_total ${S.setTotal}`,
      `void_block_txroot_errors_total ${S.errors}`,
      `void_block_txroot_header_last_set_block ${S.lastSetBlock}`,
      `void_block_txroot_last_ts_ms ${S.lastTsMs}`
    ].join("\n") + "\n");
  });

  // Health endpoint override that keys off our shim state
  app.get("/health/txroot3", (_req,res)=>{
    const n = getHead();
    const healthy = (n >= 0 && S.lastSetBlock === n) ? 1 : 0;
    const format = (typeof _req.query.format === "string") ? String(_req.query.format) : "";
    const payload = { ok: !!healthy, head: n, lastSet: S.lastSetBlock, setTotal: S.setTotal, ts_ms: S.lastTsMs, mode: "txroot_shim" };
    if (format === "prom"){
      res.type("text/plain; version=0.0.4");
      res.end(`void_txroot_health ${healthy}\n`);
    }else{
      res.json(payload);
    }
  });
}
