/* eslint-disable */
"use strict";

(function(){
  const fs = require("fs");
  const path = require("path");
  const http = require("http");

  const G = globalThis;

  function readIntFile(p){
    try{
      const s = fs.readFileSync(p, "utf8");
      const t = String(s || "").trim();
      const n = Number.parseInt(t, 10);
      if (!Number.isFinite(n)) return -1;
      return n;
    }catch{
      return -1;
    }
  }

  function headFilePath(){
    const dd = process.env.DATA_DIR || "data_a";
    // match your node behavior: relative to CWD (systemd WorkingDirectory)
    return path.join(process.cwd(), dd, "head.txt");
  }

  function httpGetNumber(pathname, timeoutMs){
    return new Promise((resolve) => {
      try{
        const req = http.request(
          { method: "GET", host: "127.0.0.1", port: Number(process.env.HTTP_PORT || 4100), path: pathname },
          (res) => {
            let buf = "";
            res.setEncoding("utf8");
            res.on("data", (d) => { buf += d; });
            res.on("end", () => {
              const t = String(buf || "").trim();
              const n = Number.parseInt(t, 10);
              if (!Number.isFinite(n)) return resolve(-1);
              resolve(n);
            });
          }
        );
        req.on("error", () => resolve(-1));
        req.setTimeout(timeoutMs, () => { try{ req.destroy(); }catch{} resolve(-1); });
        req.end();
      }catch{
        resolve(-1);
      }
    });
  }

  function makeHandler(){
    const fn = async function(req, res, next){
      try{
        if (!req || !res) return (typeof next === "function" ? next() : undefined);
        if ((req.method || "GET") !== "GET") return next();
        const u = String(req.originalUrl || req.url || "");
        if (!(u === "/blocks/latest/number2.json" || u.startsWith("/blocks/latest/number2.json?"))) return next();

        // 1) file-first
        const hf = headFilePath();
        let n = readIntFile(hf);

        // 2) fallback to canonical endpoint
        if (!(Number.isFinite(n) && n >= 0)){
          n = await httpGetNumber("/blocks/latest/number", 250);
        }

        if (!(Number.isFinite(n) && n >= 0)){
          res.statusCode = 503;
          res.setHeader("content-type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ ok: false, number: -1, err: "no-head" }));
          return;
        }

        res.statusCode = 200;
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ ok: true, number: n }));
      }catch{
        try{ return next(); }catch{}
      }
    };
    fn.__void_number2_shim_v3 = true;
    return fn;
  }

  function moveLayerToFront(app){
    try{
      const st = app && app._router && app._router.stack;
      if (!Array.isArray(st) || st.length < 2) return;
      for (let i = st.length - 1; i >= 0; i--){
        const layer = st[i];
        if (layer && layer.handle && layer.handle.__void_number2_shim_v3){
          const picked = st.splice(i, 1)[0];
          st.unshift(picked);
          return;
        }
      }
    }catch{}
  }

  function tryMount(app){
    try{
      if (!app || typeof app.use !== "function") return false;
      if (G.__void_number2_shim_v3_installed) return true;
      const h = makeHandler();
      app.use(h);
      moveLayerToFront(app);
      G.__void_number2_shim_v3_installed = true;
      try{ console.error("[compat] number2 shim v3 installed (file-first, fallback /blocks/latest/number)"); }catch{}
      return true;
    }catch{
      return false;
    }
  }

  function getApp(){
    // canonical hook you keep in src/index.ts
    if (G.__void_http_app && typeof G.__void_http_app.use === "function") return G.__void_http_app;
    return null;
  }

  if (G.__void_number2_shim_v3_boot) return;
  G.__void_number2_shim_v3_boot = true;

  // poll briefly until app exists
  let tries = 0;
  const t = setInterval(() => {
    tries++;
    const app = getApp();
    if (app && tryMount(app)){
      clearInterval(t);
      return;
    }
    if (tries > 200){ // ~10s
      clearInterval(t);
      try{ console.error("[compat] number2 shim v3 gave up (no app found)"); }catch{}
    }
  }, 50);
})();
