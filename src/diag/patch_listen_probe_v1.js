/* patch_listen_probe_v1.js */
(function () {
  const VOID_LISTEN_PROBE_V1_EMPTY_CATCH_VISIBILITY_V1_MARKER = "VOID_LISTEN_PROBE_V1_EMPTY_CATCH_VISIBILITY_V1";
  function recordVoidListenProbeV1EmptyCatchVisibilityV1(site, err) {
    try {
      const g = globalThis;
      const key = "__void_listen_probe_v1_empty_catch_visibility_v1";
      const bucket = Array.isArray(g[key]) ? g[key] : [];
      bucket.push({ marker: VOID_LISTEN_PROBE_V1_EMPTY_CATCH_VISIBILITY_V1_MARKER, site: String(site || "unknown"), message: err && err.message ? String(err.message) : String(err || "") });
      while (bucket.length > 50) bucket.shift();
      g[key] = bucket;
    } catch (_visibilityRecordErr) {
      /* VOID_LISTEN_PROBE_V1_EMPTY_CATCH_VISIBILITY_V1_RECORD_FAILURE_SUPPRESSED */
    }
  }

  function log(...a) {
    try { console.error(...a); } catch (logErr) { recordVoidListenProbeV1EmptyCatchVisibilityV1("VOID_LISTEN_PROBE_V1_EMPTY_CATCH_VISIBILITY_V1_SITE_LOG_WRITE", logErr); }
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
        } catch (listenCallLogErr) { recordVoidListenProbeV1EmptyCatchVisibilityV1("VOID_LISTEN_PROBE_V1_EMPTY_CATCH_VISIBILITY_V1_SITE_HTTP_LISTEN_CALL_LOG", listenCallLogErr); }
        try {
          this.once("listening", () => {
            try { log("[listen-probe] http.Server LISTENING", this.address && this.address()); } catch (listeningLogErr) { recordVoidListenProbeV1EmptyCatchVisibilityV1("VOID_LISTEN_PROBE_V1_EMPTY_CATCH_VISIBILITY_V1_SITE_HTTP_LISTENING_LOG", listeningLogErr); }
          });
          this.once("error", (e) => {
            try { log("[listen-probe] http.Server ERROR", e && (e.stack || e.message) || e); } catch (errorLogErr) { recordVoidListenProbeV1EmptyCatchVisibilityV1("VOID_LISTEN_PROBE_V1_EMPTY_CATCH_VISIBILITY_V1_SITE_HTTP_ERROR_LOG", errorLogErr); }
          });
        } catch (listenerInstallErr) { recordVoidListenProbeV1EmptyCatchVisibilityV1("VOID_LISTEN_PROBE_V1_EMPTY_CATCH_VISIBILITY_V1_SITE_HTTP_LISTENER_INSTALL", listenerInstallErr); }
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
        try { log("[listen-probe] express.application.listen called", { a0: args[0], a1: args[1], argc: args.length }); } catch (expressListenLogErr) { recordVoidListenProbeV1EmptyCatchVisibilityV1("VOID_LISTEN_PROBE_V1_EMPTY_CATCH_VISIBILITY_V1_SITE_EXPRESS_LISTEN_LOG", expressListenLogErr); }
        return orig2.apply(this, args);
      };
      log("[listen-probe] patched express.application.listen");
    }
  } catch (e) {
    log("[listen-probe] express patch skipped", e && (e.message || e) || e);
  }

  setTimeout(() => log("[listen-probe] alive +5s"), 5000).unref?.();
})();
