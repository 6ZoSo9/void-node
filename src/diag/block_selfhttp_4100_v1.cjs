/* block_selfhttp_4100_v1.cjs
 * Triage: prevent self-http socket churn to :4100 even if pollers are still being started.
 * Enable with: VOID_BLOCK_SELFHTTP_4100=1
 */
(function(){
  if (process.env.VOID_BLOCK_SELFHTTP_4100 !== "1") return;

  const BAD_PORT = 4100;
  const BAD_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

  function isBad(host, port){
    if (!port) return false;
    const p = Number(port);
    if (p !== BAD_PORT) return false;
    if (!host) return true;
    return BAD_HOSTS.has(String(host).toLowerCase());
  }

  const net = require("net");
  const http = require("http");
  const https = require("https");

  const origNetConnect = net.connect;
  net.connect = function(...args){
    try{
      const a0 = args[0] || {};
      const host = (typeof a0 === "object") ? a0.host : undefined;
      const port = (typeof a0 === "object") ? a0.port : undefined;
      if (isBad(host, port)) {
        const e = new Error("VOID_BLOCK_SELFHTTP_4100: net.connect refused");
        e.code = "ECONNREFUSED";
        process.nextTick(() => { throw e; });
        const s = new net.Socket();
        s.destroy(e);
        return s;
      }
    }catch(_){}
    return origNetConnect.apply(this, args);
  };

  function wrapRequest(mod, name){
    const orig = mod.request;
    mod.request = function(...args){
      try{
        const o = args[0] || {};
        const host = o.hostname || o.host;
        const port = o.port;
        if (isBad(host, port)) {
          const e = new Error(`VOID_BLOCK_SELFHTTP_4100: ${name}.request refused`);
          e.code = "ECONNREFUSED";
          const req = new (require("events")).EventEmitter();
          req.end = ()=>{};
          process.nextTick(() => req.emit("error", e));
          return req;
        }
      }catch(_){}
      return orig.apply(this, args);
    };
  }

  wrapRequest(http, "http");
  wrapRequest(https, "https");

  console.log("[triage] block_selfhttp_4100_v1 enabled");
})();
