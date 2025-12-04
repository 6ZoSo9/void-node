#!/usr/bin/env node
import http from "http";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { MainDashboard } from "../src/ui/MainDashboard";

const PORT = Number(process.env.VOID_DASHBOARD_PORT || "4305");

// Upstream UI health proxy (the little helper you start on 4315)
const UPSTREAM_UI_HEALTH_URL =
  process.env.VOID_UI_HEALTH_URL || "http://127.0.0.1:4315/api/ui/health";

// HTML renderer (SSR)
function renderHtml(): string {
  const app = ReactDOMServer.renderToString(
    React.createElement(MainDashboard, { uiHealthUrl: "/api/ui/health" })
  );

  const css = `
html, body { margin: 0; padding: 0; background: #020308; color: #e0e0e0; }
body {
  font-family: "JetBrains Mono", Menlo, Monaco, Consolas, "Courier New", monospace;
}
a { color: #7CFC7C; text-decoration: none; }
a:hover { text-decoration: underline; }

/* nav pills */
.void-nav-pill {
  border-radius: 999px;
  border: 1px solid #343d5c;
  padding: 4px 10px;
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  background: transparent;
  color: #9aa4cc;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}
.void-nav-pill[data-active="true"] {
  background: #16331a;
  color: #7CFC7C;
  box-shadow: 0 0 6px rgba(0,255,140,0.4);
}
.void-nav-pill[data-active="false"] {
  background: transparent;
}
.void-nav-pill-cta {
  border-color: #555;
}

/* small status chips */
.void-status-pill {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  border: 1px solid #555;
}
.void-status-pill-pending {
  background: #221c10;
  color: #f4c06a;
  box-shadow: 0 0 6px rgba(244,192,106,0.45);
}
.void-status-pill-ok {
  background: #16331a;
  color: #7CFC7C;
  box-shadow: 0 0 6px rgba(0,255,140,0.4);
}
.void-status-pill-bad {
  background: #3a1518;
  color: #ff8b9b;
  box-shadow: 0 0 6px rgba(255,60,90,0.6);
}

/* little dots */
.void-gauge-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #444;
  box-shadow: 0 0 4px rgba(0,0,0,0.4);
}
.void-gauge-dot-pending {
  background: #444;
}
.void-gauge-dot-ok {
  background: #00ff88;
  box-shadow: 0 0 6px rgba(0,255,140,0.7);
}
.void-gauge-dot-bad {
  background: #ff4f6d;
  box-shadow: 0 0 6px rgba(255,60,90,0.7);
}
`;

  const script = `
<script>
(function () {
  function byId(id) { return document.getElementById(id); }

  function setPillState(id, state) {
    var el = byId(id);
    if (!el) return;
    el.setAttribute("data-void-status", state);
    el.classList.remove("void-status-pill-pending", "void-status-pill-ok", "void-status-pill-bad");
    if (state === "ok") el.classList.add("void-status-pill-ok");
    else if (state === "bad") el.classList.add("void-status-pill-bad");
    else el.classList.add("void-status-pill-pending");
    if (state === "ok") el.textContent = "OK";
    else if (state === "bad") el.textContent = "ATTENTION";
    else el.textContent = "CHECK";
  }

  function setGauge(idDot, idValue, value, ok) {
    var dot = byId(idDot);
    var val = byId(idValue);
    if (val) {
      val.textContent = value == null || isNaN(value) ? "–" : String(value);
    }
    if (!dot) return;
    dot.classList.remove("void-gauge-dot-pending", "void-gauge-dot-ok", "void-gauge-dot-bad");
    if (value == null || isNaN(value)) {
      dot.classList.add("void-gauge-dot-pending");
    } else if (ok) {
      dot.classList.add("void-gauge-dot-ok");
    } else {
      dot.classList.add("void-gauge-dot-bad");
    }
  }

  function setOverallState(state) {
    var badge = byId("void-overall-badge");
    if (!badge) return;
    badge.setAttribute("data-void-overall-state", state);
    badge.style.borderColor = "#555";

    if (state === "ok") {
      badge.textContent = "ALL GREEN";
      badge.style.background = "#16331a";
      badge.style.color = "#7CFC7C";
      badge.style.boxShadow = "0 0 6px rgba(0,255,140,0.4)";
    } else if (state === "bad") {
      badge.textContent = "ATTENTION";
      badge.style.background = "#3a1518";
      badge.style.color = "#ff8b9b";
      badge.style.boxShadow = "0 0 6px rgba(255,60,90,0.6)";
    } else {
      badge.textContent = "CHECK PILLARS";
      badge.style.background = "#221c10";
      badge.style.color = "#f4c06a";
      badge.style.boxShadow = "0 0 6px rgba(244,192,106,0.45)";
    }
  }

  function refreshUiHealth() {
    var root = document.getElementById("void-dashboard-root");
    if (!root) return;
    var url = root.getAttribute("data-ui-health-url");
    if (!url) return;

    var btn = byId("void-check-pillars-btn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "CHECKING...";
    }

    fetch(url, { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var ok = !!data && !!data.ok;
        var gauges = (data && data.gauges) || {};
        var rec = (data && data.recordings_5m) || {};

        function readGauge(name) {
          var g = gauges[name];
          if (!g) return NaN;
          var raw = g.raw != null ? String(g.raw) : String(g.value);
          var v = parseFloat(raw);
          return isNaN(v) ? NaN : v;
        }

        function readRec(name) {
          var g = rec[name];
          if (!g) return NaN;
          var raw = g.raw != null ? String(g.raw) : String(g.value);
          var v = parseFloat(raw);
          return isNaN(v) ? NaN : v;
        }

        var wc = readGauge("void_mainnet_ui_work_credits_health");
        var dash = readGauge("void_mainnet_ui_dashboard_health");
        var ui = readGauge("void_mainnet_ui_pillars_health");

        var recCore = readRec("void:mainnet_pillars:health:last_5m");
        var recUi = readRec("void:mainnet_ui_pillars:health:last_5m");
        var recCombo = readRec("void:mainnet_pillars_with_ui:health:last_5m");

        setGauge("void-gauge-dot-wc", "void-gauge-value-wc", wc, wc === 1);
        setGauge("void-gauge-dot-dash", "void-gauge-value-dash", dash, dash === 1);
        setGauge("void-gauge-dot-ui-pillars", "void-gauge-value-ui-pillars", ui, ui === 1);

        if (!isNaN(recCore)) setPillState("void-core-pillars-badge", recCore === 1 ? "ok" : "bad");
        if (!isNaN(recUi)) setPillState("void-ui-pillars-badge", recUi === 1 ? "ok" : "bad");
        if (!isNaN(recCombo)) setPillState("void-composite-pillars-badge", recCombo === 1 ? "ok" : "bad");

        if (
          ok &&
          wc === 1 &&
          dash === 1 &&
          ui === 1 &&
          recCore === 1 &&
          recUi === 1 &&
          recCombo === 1
        ) {
          setOverallState("ok");
        } else {
          setOverallState("bad");
        }
      })
      .catch(function () {
        setOverallState("bad");
      })
      .finally(function () {
        var btn2 = byId("void-check-pillars-btn");
        if (btn2) {
          btn2.disabled = false;
          btn2.textContent = "CHECK PILLARS";
        }
      });
  }

  function setupTabs() {
    var tabs = Array.prototype.slice.call(
      document.querySelectorAll("[data-void-tab]")
    );
    if (!tabs.length) return;

    function activate(name) {
      tabs.forEach(function (tab) {
        var t = tab.getAttribute("data-void-tab");
        tab.setAttribute("data-active", t === name ? "true" : "false");
      });
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var name = tab.getAttribute("data-void-tab") || "overview";
        activate(name);
      });
    });

    activate("overview");
  }

  window.addEventListener("DOMContentLoaded", function () {
    setupTabs();

    var btn = byId("void-check-pillars-btn");
    if (btn) {
      btn.addEventListener("click", function (ev) {
        ev.preventDefault();
        refreshUiHealth();
      });
    }

    // First load
    refreshUiHealth();
  });
})();
</script>
`;

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8" />',
    '  <title>VOID Mainnet — Command Center (UI v0)</title>',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    "  <style>",
    css,
    "  </style>",
    "</head>",
    "<body>",
    '  <div id="root">',
    app,
    "  </div>",
    script,
    "</body>",
    "</html>",
  ].join("\n");
}

// Proxy helper: /api/ui/health on 4305 -> upstream health proxy on 4315
async function handleUiHealthProxy(res: http.ServerResponse) {
  try {
    const upstream = await fetch(UPSTREAM_UI_HEALTH_URL, {
      method: "GET",
      cache: "no-store",
    });
    const body = await upstream.text();
    const contentType =
      upstream.headers.get("content-type") ||
      "application/json; charset=utf-8";

    res.writeHead(upstream.status, {
      "Content-Type": contentType,
    });
    res.end(body);
  } catch (err) {
    res.writeHead(502, {
      "Content-Type": "application/json; charset=utf-8",
    });
    res.end(
      JSON.stringify({
        ok: false,
        error: "ui_health_upstream_error",
      })
    );
  }
}

const server = http.createServer((req, res) => {
  const url = req.url || "/";

  if (url === "/healthz") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({
        ok: true,
        port: PORT,
        upstreamUiHealthUrl: UPSTREAM_UI_HEALTH_URL,
      })
    );
    return;
  }

  if (url === "/api/ui/health") {
    void handleUiHealthProxy(res);
    return;
  }

  const html = renderHtml();
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
});

console.log(
  `=== [dev-dashboard] starting Main Dashboard on http://127.0.0.1:${PORT}/ ===`
);
console.log("    (override with VOID_DASHBOARD_PORT=<port>)");
console.log(
  `    (proxying /api/ui/health -> ${UPSTREAM_UI_HEALTH_URL})`
);

server.listen(PORT, "127.0.0.1", () => {
  console.log("");
  console.log(
    `=== [dev-dashboard] listening on http://127.0.0.1:${PORT}/ ===`
  );
});
