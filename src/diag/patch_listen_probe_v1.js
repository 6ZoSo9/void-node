/* patch_listen_probe_v1.js */
(function () {
  function log(...a) {
    try { console.error(...a); } catch {}
  }

  log("[listen-probe] loaded");

  // http.Server.listen
  try {
    const http = require("http");
    const orig = http.Server && http.Server.prototype && http.Server.prototype.listen;
    if (typeof orig === "function") {
      http.Server.prototype.listen = function (...args) {
        try {
          const a0 = args[0];
          const a1 = args[1];
          log("[listen-probe] http.Server.listen called", { a0, a1, argc: args.length });
        } catch {}
        try {
          this.once("listening", () => {
            try { log("[listen-probe] http.Server LISTENING", this.address && this.address()); } catch {}
          });
          this.once("error", (e) => {
            try { log("[listen-probe] http.Server ERROR", e && (e.stack || e.message) || e); } catch {}
          });
        } catch {}
        return orig.apply(this, args);
      };
      log("[listen-probe] patched http.Server.listen");
    } else {
      log("[listen-probe] http.Server.listen not found");
    }
  } catch (e) {
    log("[listen-probe] failed patch http.Server.listen", e && (e.stack || e.message) || e);
  }

  // express app.listen (best-effort)
  try {
    const express = require("express");
    const proto = express && express.application;
    if (proto && typeof proto.listen === "function") {
      const orig2 = proto.listen;
      proto.listen = function (...args) {
        try { log("[listen-probe] express.application.listen called", { a0: args[0], a1: args[1], argc: args.length }); } catch {}
        return orig2.apply(this, args);
      };
      log("[listen-probe] patched express.application.listen");
    }
  } catch (e) {
    log("[listen-probe] express patch skipped", e && (e.message || e) || e);
  }

  setTimeout(() => log("[listen-probe] alive +5s"), 5000).unref?.();
})();
