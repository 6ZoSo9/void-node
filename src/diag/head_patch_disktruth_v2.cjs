;(function headPatchDiskTruthV4(){
  const G = globalThis;
  const TAG = "[headPatchDiskTruthV4]";
  const S = {
    ok:false, ts:0, errs:0, lastErr:"",
    installed:0,
    wrappedGet:0,
    seenDefineHead:0,
    seenDefineHeadTxt:0,
    lastHead:-1
  };

  const getApp = () => (G.__void_http_app || G.app);

  function readHead(){
    try{
      const fs = require("node:fs");
      const path = require("node:path");
      const dir = process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data";
      const root = path.join(process.cwd(), dir);

      // 1) head.txt
      try {
        const ht = path.join(root, "head.txt");
        const n = Number(String(fs.readFileSync(ht,"utf8")).trim());
        if (Number.isFinite(n)) return n;
      } catch {}

      // 2) heads.json
      try {
        const hj = path.join(root, "heads.json");
        const j = JSON.parse(fs.readFileSync(hj,"utf8"));
        const n = Number(j && (j.number ?? j.n));
        if (Number.isFinite(n)) return n;
      } catch {}

      // 3) segments/*/meta.json max(to)
      try {
        const segDir = path.join(root, "segments");
        const ents = fs.readdirSync(segDir, { withFileTypes:true });
        let maxTo = -1;
        for (const e of ents){
          if (!e.isDirectory()) continue;
          try {
            const mp = path.join(segDir, e.name, "meta.json");
            const mj = JSON.parse(fs.readFileSync(mp,"utf8"));
            const to = Number(mj && mj.to);
            if (Number.isFinite(to)) maxTo = Math.max(maxTo, to);
          } catch {}
        }
        if (maxTo >= 0) return maxTo;
      } catch {}
    } catch {}
    return -1;
  }

  function headJson(_req, res){
    const n = readHead();
    S.lastHead = n;
    res.json({ ok:true, head:n });
  }
  function headTxt(_req, res){
    const n = readHead();
    S.lastHead = n;
    res.type("text/plain").send(String(n) + "\n");
  }

  function install(app){
    try{
      // install diag endpoint
      app.get("/__void/diag/headPatchDiskTruthV4.json", (_req,res)=>{
        S.ok = true;
        S.ts = Date.now();
        res.json({ ok:true, state:S });
      });

      // wrap app.get so later /head definitions get replaced
      if (!app.__headPatchDiskTruthV4_wrapped){
        const origGet = app.get.bind(app);
        app.get = function(path){
          const args = Array.prototype.slice.call(arguments, 0);
          const p = String(path || "");
          if (p === "/head"){
            S.seenDefineHead++;
            return origGet("/head", headJson);
          }
          if (p === "/head.txt"){
            S.seenDefineHeadTxt++;
            return origGet("/head.txt", headTxt);
          }
          return origGet.apply(null, args);
        };
        app.__headPatchDiskTruthV4_wrapped = 1;
        S.wrappedGet = 1;
      }

      // also force-install ours now (in case nothing else defines them)
      app.get("/head", headJson);
      app.get("/head.txt", headTxt);

      S.installed = 1;
      S.ok = true;
      S.ts = Date.now();
      console.error(TAG, "installed (wrappedGet=1).");
    } catch(e){
      S.errs++;
      S.lastErr = String(e && (e.stack || e.message || e));
      try { console.error(TAG, "install error:", S.lastErr); } catch {}
    }
  }

  (function attach(tries=0){
    const app = getApp();
    if (!app){
      if (tries < 120) return setTimeout(()=>attach(tries+1), 250);
      S.errs++; S.lastErr = "no app after attach timeout";
      try { console.error(TAG, S.lastErr); } catch {}
      return;
    }
    install(app);
  })();
})();
