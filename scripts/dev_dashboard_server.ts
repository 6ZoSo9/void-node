import express from "express";
import React from "react";
import { renderToString } from "react-dom/server";
import MainDashboard from "../src/ui/MainDashboard";

const app = express();

app.get("/", (_req, res) => {
  const html = renderToString(React.createElement(MainDashboard));
  res.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>VOID — Main Dashboard (Dev)</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { margin: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #050810; color: #f5f5f5; }
      #root { min-height: 100vh; }
      a { color: #7dd3fc; }
    </style>
  </head>
  <body>
    <div id="root">${html}</div>
  </body>
</html>`);
});

const port = Number(process.env.VOID_DASHBOARD_PORT || 4305);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`=== [dev-dashboard] listening on http://127.0.0.1:${port}/ ===`);
});

export {};
