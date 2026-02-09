/* txroot_health_compat_proxy_v1.cjs
   Proxies legacy /health/txroot and /health/txroot2 to /health/txroot3.
   Additive-only. Bounded install poll. No timers beyond install.
*/
(function () {
  const g = globalThis;
  const log = (...a) => { try { console.log("[txroot-compat]", ...a); } catch {} };

  function tryInstall() {
    const app = g.__void_http_app;
    if (!app || app.__txrootCompatInstalled) return false;
    app.__txrootCompatInstalled = true;

    for (const p of ["/health/txroot", "/health/txroot2"]) {
      app.get(p, async (req, res) => {
        try {
          const port = process.env.HTTP_PORT || "4100";
          const q = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
          const u = "http://127.0.0.1:" + port + "/health/txroot3" + q;

          const r = await fetch(u, { headers: { "accept": req.headers["accept"] || "*/*" } });
          const body = await r.text();

          res.status(r.status);
          const ct = r.headers.get("content-type");
          if (ct) res.setHeader("content-type", ct);
          res.send(body);
        } catch (e) {
          res.status(500).json({ ok:false, err:"txroot-compat-proxy-failed", detail:String((e && e.stack) || e) });
        }
      });
    }

    log("installed: /health/txroot + /health/txroot2 -> /health/txroot3");
    return true;
  }

  let tries = 0;
  const t = setInterval(() => {
    tries++;
    try {
      if (tryInstall() || tries >= 40) clearInterval(t);
    } catch {
      if (tries >= 40) clearInterval(t);
    }
  }, 50);
})();
