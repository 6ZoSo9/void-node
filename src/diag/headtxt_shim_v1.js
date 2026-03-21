/* headtxt_shim_v1.js
   Installs GET /head.txt if missing.
   Reads DATA_DIR/head.txt if present; otherwise falls back to GET /blocks/latest/number2.json.
*/
(function () {
  const FLAG = "__void_headtxt_shim_v1_installed__";
  if (globalThis[FLAG]) return;
  globalThis[FLAG] = true;

  function decodeEnvEscapes(s) {
    // best-effort: systemd may escape spaces as \x20; we don't need full fidelity here
    try { return s.replace(/\\x20/g, " "); } catch { return s; }
  }

  function hasRoute(app, path) {
    try {
      const st = (app && app._router && app._router.stack) ? app._router.stack : [];
      for (const layer of st) {
        if (layer && layer.route && layer.route.path === path) return true;
      }
    } catch {}
    return false;
  }

  function install() {
    const app = globalThis.__void_http_app;
    if (!app || typeof app.get !== "function") {
      return setTimeout(install, 50);
    }
    if (hasRoute(app, "/head.txt")) return;

    const fs = require("fs");
    const path = require("path");
    const http = require("http");

    app.get("/head.txt", (req, res) => {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");

      const dataDir = process.env.DATA_DIR || "data";
      const headPath = path.join(dataDir, "head.txt");

      try {
        const raw = fs.readFileSync(headPath, "utf8").trim();
        if (raw && /^[0-9]+$/.test(raw)) {
          res.status(200).end(raw + "\n");
          return;
        }
      } catch {}

      // fallback: call the existing compat endpoint on the same listener port
      const localPort = (req && req.socket && req.socket.localPort) ? req.socket.localPort : (process.env.HTTP_PORT ? Number(process.env.HTTP_PORT) : 4100);
      const opts = {
        host: "127.0.0.1",
        port: localPort,
        path: "/blocks/latest/number2.json",
        method: "GET",
        timeout: 2000,
      };

      const r = http.request(opts, (rr) => {
        let buf = "";
        rr.setEncoding("utf8");
        rr.on("data", (c) => (buf += c));
        rr.on("end", () => {
          try {
            const j = JSON.parse(buf);
            const n = (j && (j.number ?? j.n ?? j.head)) + "";
            if (n && /^[0-9]+$/.test(n)) {
              res.status(200).end(n + "\n");
            } else {
              res.status(500).end("0\n");
            }
          } catch {
            res.status(500).end("0\n");
          }
        });
      });

      r.on("timeout", () => {
        try { r.destroy(new Error("timeout")); } catch {}
      });
      r.on("error", () => res.status(500).end("0\n"));
      r.end();
    });

    try {
      // eslint-disable-next-line no-console
      console.log("[headtxt_shim_v1] installed GET /head.txt");
    } catch {}
  }

  install();
})();
