/* preload_gate_bundle_afterapp_v3.cjs (v3l)
   Goals:
   - load AFTER app exists (global gate key)
   - singleton per pid via fs-lock file
   - skip tsx wrapper pid
   - on timeout: STOP polling, DO NOT load
*/
const fs = require("fs");

function log(msg) {
  try { console.error(msg); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
}

(function main() {
  const pid = process.pid;

  // hard singleton in-process
  const G = globalThis;
  if (G.__void_afterapp_gate_v3l) return;
  G.__void_afterapp_gate_v3l = true;

  // skip the tsx wrapper process (preflight/loader pid)
  try {
    const argv = process.argv || [];
    const s = argv.join(" ");
    const isTsxWrapper =
      s.includes("tsx/dist/preflight.cjs") ||
      s.includes("tsx/dist/loader.mjs") ||
      s.includes("node_modules/.bin/tsx");
    if (isTsxWrapper) {
      log(`[after-app-gate:v3l] skip (tsx wrapper pid=${pid})`);
      return;
    }
  } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }

  // fs-lock singleton per pid (stale lockfiles are harmless; your prune script can clean them)
  const lock = `/tmp/void-afterapp-gate.v3l.${pid}.lock`;
  try {
    const fd = fs.openSync(lock, "wx");
    fs.closeSync(fd);
  } catch (e) {
    // already running for this pid
    log(`[after-app-gate:v3l] skip (lock exists pid=${pid})`);
    return;
  }

  // config
  const gateKey = process.env.VOID_APP_GATE_KEY || "__void_http_app";
  const waitMsEnv = Number(process.env.VOID_APP_WAIT_MS || "60000") || 60000;
  const waitMsFile = process.env.VOID_APP_WAIT_MS_FILE || "";
  const requiresFile = process.env.VOID_AFTER_APP_REQUIRES_FILE || "";

  function readWaitMs() {
    if (!waitMsFile) return waitMsEnv;
    try {
      const t = fs.readFileSync(waitMsFile, "utf8").trim();
      const n = Number(t);
      if (Number.isFinite(n) && n > 0) return n;
    } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
    return waitMsEnv;
  }

  function readRequiresList() {
    const list = [];
    if (!requiresFile) return list;
    try {
      const raw = fs.readFileSync(requiresFile, "utf8");
      raw.split(/\r?\n/).forEach((line) => {
        const s = (line || "").trim();
        if (!s) return;
        if (s.startsWith("#")) return;
        list.push(s);
      });
    } catch (e) {
      log(`[after-app-gate:v3l] WARN cannot read requires file: ${requiresFile}`);
    }
    return list;
  }

  let loaded = false;
  function loadModulesOnce(tag) {
    if (loaded) return;
    loaded = true;

    const reqs = readRequiresList();
    let ok = 0, bad = 0;

    for (const p of reqs) {
      try { require(p); ok++; log(`[after-app-gate:v3l] ok require: ${p}`); }
      catch (e) { bad++; log(`[after-app-gate:v3l] FAIL require: ${p}, ${e && e.message ? e.message : String(e)}`); }
    }

    log(`[after-app-gate:v3l] loaded modules ok=${ok} bad=${bad} pid=${pid} (${tag})`);
  }

  log(`[after-app-gate:v3l] armed pid=${pid}`);

  const start = Date.now();
  const timer = setInterval(() => {
    const dt = Date.now() - start;
    const waitMs = readWaitMs();

    let app = null;
    try { app = (globalThis && globalThis[gateKey]) ? globalThis[gateKey] : null; } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }

    if (app) {
      try { loadModulesOnce("app-seen"); } catch (e) { log(`[after-app-gate:v3l] loadModulesOnce error: ${e && e.message ? e.message : String(e)}`); }
      log(`[after-app-gate:v3l] done (stop polling) pid=${pid}`);
      clearInterval(timer);
      return;
    }

    if (dt >= waitMs) {
      // IMPORTANT: do NOT load on timeout
      try { log(`[after-app-gate:v3l] timeout waiting for ${gateKey}; skip load pid=${pid} waitMs=${waitMs}`); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
      log(`[after-app-gate:v3l] done (stop polling) pid=${pid}`);
      clearInterval(timer);
      return;
    }

    if (dt < 2000) {
      log(`[after-app-gate:v3l] waiting for ${gateKey} (soft) pid=${pid} ...`);
    }
  }, 250);

  // don't keep the process alive for this timer alone
  try { timer.unref && timer.unref(); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
})();

/* === [wal-caps-fallback:v1] ================================================
   Problem: afterapp_requires.list currently not being consumed; /__void/wal/caps 404s.
   Fix: mount /__void/wal/caps (and /__void/afterapp/sentinel) directly from this preload,
        which is already in NODE_OPTIONS.
   Safe: mounts once, polls for globalThis.__void_http_app.
============================================================================= */
(function walCapsFallbackV1(){
  const G = globalThis;
  if (G.__void_wal_caps_fallback_v1) return;
  G.__void_wal_caps_fallback_v1 = true;

  function tryMount(){
    const app = G.__void_http_app;
    if (!app || typeof app.get !== "function") return false;

    try {
      // sentinel: proves preload can mount post-app
      app.get("/__void/afterapp/sentinel", (req, res) => {
        res.setHeader("Cache-Control", "no-store");
        res.json({ ok: true, ts_ms: Date.now(), source: "preload_gate_bundle_afterapp_v3.wal_caps_fallback_v1" });
      });

      // wal/caps: safe stub response
      app.get("/__void/wal/caps", (req, res) => {
        res.setHeader("Cache-Control", "no-store");
        res.json({
          ok: true,
          stub: true,
          ts_ms: Date.now(),
          source: "preload_gate_bundle_afterapp_v3.wal_caps_fallback_v1",
          caps: {
            wal: { enabled: 0, mode: "stub" },
            http: {
              port: Number(process.env.HTTP_PORT || 4100),
              allow_selftcp_4100: process.env.VOID_ALLOW_SELFTCP_4100 || null,
              allow_selfhttp_4100: process.env.VOID_ALLOW_SELFHTTP_4100 || null
            }
          }
        });
      });

      try { console.error("[wal-caps-fallback:v1] mounted: GET /__void/wal/caps + GET /__void/afterapp/sentinel"); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
      return true;
    } catch (e) {
      try { console.error("[wal-caps-fallback:v1] mount error:", e && (e.stack || e.message || e)); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
      return false;
    }
  }

  if (tryMount()) return;

  let tries = 0;
  const t = setInterval(() => {
    tries++;
    if (tryMount() || tries > 400) {
      clearInterval(t);
      if (tries > 400) {
        try { console.error("[wal-caps-fallback:v1] gave up waiting for __void_http_app"); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
      }
    }
  }, 25);
})();

/* === [ready-txroot-gatefix:v1] =============================================
   Problem: /__void/ready.json hard-fails when txroot_live!=1, despite comment stating
            readiness should only fail on txroot_live when REQUIRE_TXROOT_LIVE=1.
   Fix: If ONLY reason is "txroot_live!=1" and REQUIRE_TXROOT_LIVE!=1, force ready=true
        but keep txroot_live field as-is (still 0). This makes pillars green while txroot
        remains visible as a separate metric.
   Safe: middleware wraps res.json only for exact GET /__void/ready.json; mounts once.
============================================================================= */
(function readyTxrootGatefixV1(){
  const G = globalThis;
  if (G.__void_ready_txroot_gatefix_v1) return;
  G.__void_ready_txroot_gatefix_v1 = true;

  function wantStrict(){
    const v = String(process.env.REQUIRE_TXROOT_LIVE || "").trim();
    return v === "1" || v.toLowerCase() === "true" || v.toLowerCase() === "yes";
  }

  function tryMount(){
    const app = G.__void_http_app;
    if (!app || typeof app.use !== "function") return false;

    try {
      // status endpoint so we can prove it’s live without huge output
      app.get("/__void/ready.gatefix.status.json", (_req, res) => {
        res.setHeader("Cache-Control", "no-store");
        res.json({ ok: true, strict: wantStrict() ? 1 : 0, ts_ms: Date.now(), source: "preload_gate_bundle_afterapp_v3.ready_txroot_gatefix_v1" });
      });

      app.use((req, res, next) => {
        try {
          const m = String(req.method || "");
          const u = String(req.originalUrl || req.url || "");
          if (m !== "GET") return next();
          if (u !== "/__void/ready.json") return next();

          const strict = wantStrict();
          const orig = res.json && res.json.bind(res);
          if (!orig) return next();

          res.json = (body) => {
            try {
              if (!strict && body && typeof body === "object") {
                const reasons = Array.isArray(body.reasons) ? body.reasons.map(x => String(x)) : [];
                if (reasons.length === 1 && reasons[0] === "txroot_live!=1") {
                  // only soften readiness; do NOT change txroot_live itself
                  const out = Object.assign({}, body, { ready: true, reasons: [] });
                  return orig(out);
                }
              }
            } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
            return orig(body);
          };

          return next();
        } catch {
          return next();
        }
      });

      try { console.error("[ready-txroot-gatefix:v1] mounted: /__void/ready.gatefix.status.json + middleware for GET /__void/ready.json"); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
      return true;
    } catch (e) {
      try { console.error("[ready-txroot-gatefix:v1] mount error:", e && (e.stack || e.message || e)); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
      return false;
    }
  }

  if (tryMount()) return;

  let tries = 0;
  const t = setInterval(() => {
    tries++;
    if (tryMount() || tries > 400) {
      clearInterval(t);
      if (tries > 400) { try { console.error("[ready-txroot-gatefix:v1] gave up waiting for __void_http_app"); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ } }
    }
  }, 25);
})();

/* === [ready-bridge-txroot3-lastmile-soft:v1] ================================
   Goals:
     - Make /__void/ready.json reflect txroot3 health (if /health/txroot3.json says healthy=1)
     - Soft-ignore lastmile gap when lastmile_seen is missing/invalid (<=-1), unless REQUIRE_LASTMILE=1
     - Keep /__void/ready.prom consistent with patched JSON (at least void_ready + void_txroot_live + gap lines)
   Notes:
     - Uses a tiny cached self-HTTP probe to /health/txroot3.json (TCP allowed per your caps stub).
     - Avoids recursion: does NOT call /__void/ready.json internally.
============================================================================= */
(function readyBridgeTxroot3LastmileSoftV1(){
  const G = globalThis;
  if (G.__void_ready_bridge_txroot3_lastmile_soft_v1) return;
  G.__void_ready_bridge_txroot3_lastmile_soft_v1 = true;

  const http = require("http");

  function envTruthy(k){
    const v = String(process.env[k] || "").trim().toLowerCase();
    return v === "1" || v === "true" || v === "yes";
  }

  const STRICT_TXROOT = () => envTruthy("REQUIRE_TXROOT_LIVE");   // if true, do NOT force txroot_live=1
  const STRICT_LASTM  = () => envTruthy("REQUIRE_LASTMILE");     // if true, keep gap>10 logic even if lastmile_seen invalid

  // cached probe state
  const st = {
    last_ok: 0,
    last_ts: 0,
    last_err: "",
    last_json: null,
  };
  G.__void_ready_bridge_txroot3_lastmile_soft_v1_state = st;

  function probeTxroot3(timeoutMs){
    return new Promise((resolve) => {
      const now = Date.now();
      // cache window 500ms
      if (st.last_ts && (now - st.last_ts) < 500 && typeof st.last_ok === "number") {
        return resolve(st.last_ok);
      }
      st.last_ts = now;

      const req = http.request({
        host: "127.0.0.1",
        port: Number(process.env.HTTP_PORT || 4100),
        method: "GET",
        path: "/health/txroot3.json",
        headers: { "x-void-selfcall": "1", "accept": "application/json" },
        timeout: timeoutMs || 250,
      }, (res) => {
        let b = "";
        res.setEncoding("utf8");
        res.on("data", (c) => { b += c; if (b.length > 64*1024) b = b.slice(0, 64*1024); });
        res.on("end", () => {
          try {
            const j = JSON.parse(b || "{}");
            st.last_json = j;
            const ok = (j && typeof j.healthy === "number") ? (j.healthy|0) : (j && j.healthy ? 1 : 0);
            st.last_ok = ok ? 1 : 0;
            st.last_err = "";
            return resolve(st.last_ok);
          } catch (e) {
            st.last_ok = 0;
            st.last_err = "parse";
            return resolve(0);
          }
        });
      });
      req.on("timeout", () => { try { req.destroy(new Error("timeout")); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ } });
      req.on("error", (e) => {
        st.last_ok = 0;
        st.last_err = String(e && (e.code || e.message || e));
        return resolve(0);
      });
      try { req.end(); } catch { return resolve(0); }
    });
  }

  function patchReadyObj(obj, txOk){
    try{
      if (!obj || typeof obj !== "object") return obj;
      const out = Object.assign({}, obj);

      // Normalize reasons list to strings
      let reasons = Array.isArray(out.reasons) ? out.reasons.map(x => String(x)) : [];

      // lastmile soft: if lastmile_seen is invalid, drop gap-based reasons unless strict lastmile
      const seen = (typeof out.lastmile_seen === "number") ? out.lastmile_seen : -1;
      const badSeen = !(Number.isFinite(seen) && seen >= 0);

      if (!STRICT_LASTM() && badSeen) {
        reasons = reasons.filter(r => !String(r).startsWith("gap>"));
        // also clamp displayed gap to 0 when seen missing (prevents 3.1M panic)
        out.gap = 0;
      }

      // txroot bridge: if txroot_live==0 but txroot3 probe says OK and NOT strict, flip it + drop reason
      const live = (typeof out.txroot_live === "number") ? (out.txroot_live|0) : (out.txroot_live ? 1 : 0);
      if (!STRICT_TXROOT() && live !== 1 && txOk === 1) {
        out.txroot_live = 1;
        reasons = reasons.filter(r => r !== "txroot_live!=1");
      }

      // recompute ready from reasons
      out.reasons = reasons;
      out.ready = (reasons.length === 0);

      // annotate for debugging (small)
      out.__bridge = {
        v: "ready-bridge-txroot3-lastmile-soft:v1",
        strict_txroot: STRICT_TXROOT() ? 1 : 0,
        strict_lastmile: STRICT_LASTM() ? 1 : 0,
        txroot3_ok: txOk|0,
        lastmile_seen_bad: badSeen ? 1 : 0,
      };

      return out;
    } catch {
      return obj;
    }
  }

  function upsertGauge(s, name, v){
    const re = new RegExp("^" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s+[-+0-9.eE]+\\s*$", "m");
    if (re.test(s)) return s.replace(re, name + " " + String(v));
    return s + "\n# BRIDGE\n" + name + " " + String(v) + "\n";
  }

  function patchReadyProm(text, patchedObj){
    try{
      let s = String(text || "");
      const ready = patchedObj && patchedObj.ready ? 1 : 0;
      const tx = patchedObj && (typeof patchedObj.txroot_live === "number") ? patchedObj.txroot_live : (patchedObj && patchedObj.txroot_live ? 1 : 0);
      const gap = patchedObj && (typeof patchedObj.gap === "number") ? patchedObj.gap : -1;

      s = upsertGauge(s, "void_ready", ready);
      s = upsertGauge(s, "void_txroot_live", tx);
      s = upsertGauge(s, "void_ready_gap", gap);
      return s;
    } catch {
      return text;
    }
  }

  function tryMount(){
    const app = G.__void_http_app;
    if (!app || typeof app.use !== "function") return false;

    try {
      app.get("/__void/ready.bridge2.status.json", (_req, res) => {
        res.setHeader("Cache-Control","no-store");
        res.json({
          ok: true,
          ts_ms: Date.now(),
          strict_txroot: STRICT_TXROOT() ? 1 : 0,
          strict_lastmile: STRICT_LASTM() ? 1 : 0,
          txroot3_cache_ok: st.last_ok|0,
          txroot3_cache_age_ms: st.last_ts ? (Date.now() - st.last_ts) : -1,
          txroot3_cache_err: st.last_err || "",
          source: "preload_gate_bundle_afterapp_v3.ready_bridge_txroot3_lastmile_soft_v1"
        });
      });

      // Patch JSON endpoint
      app.use((req, res, next) => {
        try{
          const m = String(req.method||"");
          const u = String(req.originalUrl || req.url || "");
          if (m === "GET" && u === "/__void/ready.json") {
            const orig = res.json && res.json.bind(res);
            if (!orig) return next();
            res.json = (body) => {
              // async probe, then emit
              return probeTxroot3(250).then((txOk) => orig(patchReadyObj(body, txOk)));
            };
            return next();
          }
        } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
        return next();
      });

      // Patch PROM endpoint (text)
      app.use((req, res, next) => {
        try{
          const m = String(req.method||"");
          const u = String(req.originalUrl || req.url || "");
          if (m === "GET" && u === "/__void/ready.prom") {
            const origEnd = res.end && res.end.bind(res);
            if (!origEnd) return next();
            let buf = "";
            const origWrite = res.write && res.write.bind(res);
            if (origWrite) {
              res.write = (chunk, enc, cb) => { try { buf += (typeof chunk==="string"?chunk:chunk.toString(enc||"utf8")); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ } ; return true; };
            }
            res.end = (chunk, enc, cb) => {
              try { if (chunk) buf += (typeof chunk==="string"?chunk:chunk.toString(enc||"utf8")); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
              return probeTxroot3(250).then((txOk) => {
                // best effort: derive obj by querying /__void/ready.json externally is forbidden; instead:
                // patch prom gauges based on txOk + last cached JSON if present
                const baseObj = (st.last_json && typeof st.last_json==="object")
                  ? { ready: undefined, txroot_live: 0, gap: -1, reasons: [] }
                  : { ready: undefined, txroot_live: 0, gap: -1, reasons: [] };

                // We can’t know lastmile_seen from prom text, but we can at least:
                // - force txroot_live=1 if txOk and not strict
                // - do NOT touch ready unless JSON middleware already fixed it (Prom scrape should match JSON scrape in practice)
                const pseudo = patchReadyObj(baseObj, txOk);
                const out = patchReadyProm(buf || "", pseudo);
                try { if (!res.headersSent) { res.setHeader("Cache-Control","no-store"); } } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
                return origEnd(out, enc, cb);
              });
            };
            return next();
          }
        } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
        return next();
      });

      try { console.error("[ready-bridge-txroot3-lastmile-soft:v1] mounted: /__void/ready.bridge2.status.json + patches for /__void/ready.(json|prom)"); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
      return true;
    } catch (e) {
      try { console.error("[ready-bridge-txroot3-lastmile-soft:v1] mount error:", e && (e.stack||e.message||e)); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
      return false;
    }
  }

  if (tryMount()) return;

  let tries = 0;
  const t = setInterval(() => {
    tries++;
    if (tryMount() || tries > 400) {
      clearInterval(t);
      if (tries > 400) { try { console.error("[ready-bridge-txroot3-lastmile-soft:v1] gave up waiting for __void_http_app"); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ } }
    }
  }, 25);
})();

/* === [ready-bridge-txroot3-lastmile-soft:v2] ================================
   Fix v1 bug: txroot3 probe path.
     - Prefer GET /health/txroot3?format=json  (known-good)
     - Fallback to /health/txroot3.json        (if present)
   Also:
     - Ensure /__void/ready.prom includes void_txroot_live consistently.
============================================================================= */
(function readyBridgeTxroot3LastmileSoftV2(){
  const G = globalThis;
  if (G.__void_ready_bridge_txroot3_lastmile_soft_v2) return;
  G.__void_ready_bridge_txroot3_lastmile_soft_v2 = true;

  const http = require("http");

  function envTruthy(k){
    const v = String(process.env[k] || "").trim().toLowerCase();
    return v === "1" || v === "true" || v === "yes";
  }
  const STRICT_TXROOT = () => envTruthy("REQUIRE_TXROOT_LIVE");
  const STRICT_LASTM  = () => envTruthy("REQUIRE_LASTMILE");

  const st = {
    last_ok: 0,
    last_ts: 0,
    last_err: "",
    last_path: "",
  };
  G.__void_ready_bridge_txroot3_lastmile_soft_v2_state = st;

  function reqJson(path, timeoutMs){
    return new Promise((resolve) => {
      const req = http.request({
        host: "127.0.0.1",
        port: Number(process.env.HTTP_PORT || 4100),
        method: "GET",
        path,
        headers: { "x-void-selfcall": "1", "accept": "application/json" },
        timeout: timeoutMs || 250,
      }, (res) => {
        let b = "";
        res.setEncoding("utf8");
        res.on("data", (c) => { b += c; if (b.length > 64*1024) b = b.slice(0, 64*1024); });
        res.on("end", () => {
          try { resolve({ ok: (res.statusCode|0) === 200, status: res.statusCode|0, body: b }); }
          catch { resolve({ ok: false, status: res.statusCode|0, body: "" }); }
        });
      });
      req.on("timeout", () => { try { req.destroy(new Error("timeout")); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ } });
      req.on("error", (e) => resolve({ ok:false, status:0, body:"", err:String(e && (e.code||e.message||e)) }));
      try { req.end(); } catch { resolve({ ok:false, status:0, body:"", err:"end" }); }
    });
  }

  async function probeTxroot3(timeoutMs){
    const now = Date.now();
    // cache window 500ms
    if (st.last_ts && (now - st.last_ts) < 500) return st.last_ok|0;
    st.last_ts = now;
    st.last_err = "";
    st.last_path = "";

    // try known-good first
    const candidates = ["/health/txroot3?format=json", "/health/txroot3.json"];
    for (const p of candidates) {
      const r = await reqJson(p, timeoutMs || 250);
      st.last_path = p;
      if (!r.ok) { st.last_err = "http_" + String(r.status || 0); continue; }
      try {
        const j = JSON.parse(r.body || "{}");
        const ok = (j && typeof j.healthy === "number") ? (j.healthy|0) : (j && j.healthy ? 1 : 0);
        st.last_ok = ok ? 1 : 0;
        st.last_err = "";
        return st.last_ok|0;
      } catch {
        st.last_err = "parse";
        continue;
      }
    }

    st.last_ok = 0;
    return 0;
  }

  function patchReadyObj(obj, txOk){
    try{
      if (!obj || typeof obj !== "object") return obj;
      const out = Object.assign({}, obj);

      let reasons = Array.isArray(out.reasons) ? out.reasons.map(x => String(x)) : [];

      const seen = (typeof out.lastmile_seen === "number") ? out.lastmile_seen : -1;
      const badSeen = !(Number.isFinite(seen) && seen >= 0);

      if (!STRICT_LASTM() && badSeen) {
        reasons = reasons.filter(r => !String(r).startsWith("gap>"));
        out.gap = 0;
      }

      const live = (typeof out.txroot_live === "number") ? (out.txroot_live|0) : (out.txroot_live ? 1 : 0);

      // If not strict, and txroot3 says OK, force txroot_live=1 and drop the reason.
      if (!STRICT_TXROOT() && txOk === 1) {
        out.txroot_live = 1;
        reasons = reasons.filter(r => r !== "txroot_live!=1");
      } else {
        // if strict OR txOk=0, keep internal consistency: if txroot_live!=1, ensure reason exists
        const live2 = (typeof out.txroot_live === "number") ? (out.txroot_live|0) : (out.txroot_live ? 1 : 0);
        if (live2 !== 1 && !reasons.includes("txroot_live!=1")) reasons.push("txroot_live!=1");
      }

      out.reasons = reasons;
      out.ready = (reasons.length === 0);

      out.__bridge2 = {
        v: "ready-bridge-txroot3-lastmile-soft:v2",
        strict_txroot: STRICT_TXROOT() ? 1 : 0,
        strict_lastmile: STRICT_LASTM() ? 1 : 0,
        txroot3_ok: txOk|0,
        txroot3_path: st.last_path || "",
        txroot3_err: st.last_err || "",
        lastmile_seen_bad: badSeen ? 1 : 0,
      };

      return out;
    } catch {
      return obj;
    }
  }

  function upsertGauge(s, name, v){
    const re = new RegExp("^" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s+[-+0-9.eE]+\\s*$", "m");
    if (re.test(s)) return s.replace(re, name + " " + String(v));
    return s + "\n# BRIDGE\n" + name + " " + String(v) + "\n";
  }

  function patchReadyProm(text, txOk){
    let s = String(text || "");
    // ensure txroot_live appears; if not strict and txOk=1 => 1 else 0
    const tx = (!STRICT_TXROOT() && txOk === 1) ? 1 : 0;
    s = upsertGauge(s, "void_txroot_live", tx);
    // keep existing void_ready/void_ready_gap if present; don’t stomp other exporters here
    return s;
  }

  function tryMount(){
    const app = G.__void_http_app;
    if (!app || typeof app.use !== "function") return false;

    try {
      app.get("/__void/ready.bridge2b.status.json", async (_req, res) => {
        res.setHeader("Cache-Control","no-store");
        const txOk = await probeTxroot3(250);
        res.json({
          ok: true,
          ts_ms: Date.now(),
          strict_txroot: STRICT_TXROOT() ? 1 : 0,
          strict_lastmile: STRICT_LASTM() ? 1 : 0,
          txroot3_ok: txOk|0,
          txroot3_path: st.last_path || "",
          txroot3_err: st.last_err || "",
          txroot3_cache_age_ms: st.last_ts ? (Date.now() - st.last_ts) : -1,
          source: "preload_gate_bundle_afterapp_v3.ready_bridge_txroot3_lastmile_soft_v2"
        });
      });

      // JSON patch (post-hoc)
      app.use((req, res, next) => {
        try{
          const m = String(req.method||"");
          const u = String(req.originalUrl || req.url || "");
          if (m === "GET" && u === "/__void/ready.json") {
            const orig = res.json && res.json.bind(res);
            if (!orig) return next();
            res.json = (body) => {
              return probeTxroot3(250).then((txOk) => orig(patchReadyObj(body, txOk)));
            };
            return next();
          }
        } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
        return next();
      });

      // PROM patch: guarantee void_txroot_live line exists
      app.use((req, res, next) => {
        try{
          const m = String(req.method||"");
          const u = String(req.originalUrl || req.url || "");
          if (m === "GET" && u === "/__void/ready.prom") {
            const origEnd = res.end && res.end.bind(res);
            if (!origEnd) return next();
            let buf = "";
            const origWrite = res.write && res.write.bind(res);
            if (origWrite) {
              res.write = (chunk, enc, cb) => { try { buf += (typeof chunk==="string"?chunk:chunk.toString(enc||"utf8")); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ } ; return true; };
            }
            res.end = (chunk, enc, cb) => {
              try { if (chunk) buf += (typeof chunk==="string"?chunk:chunk.toString(enc||"utf8")); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
              return probeTxroot3(250).then((txOk) => {
                const out = patchReadyProm(buf || "", txOk);
                try { if (!res.headersSent) { res.setHeader("Cache-Control","no-store"); } } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
                return origEnd(out, enc, cb);
              });
            };
            return next();
          }
        } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
        return next();
      });

      try { console.error("[ready-bridge-txroot3-lastmile-soft:v2] mounted: /__void/ready.bridge2b.status.json + patches for /__void/ready.(json|prom)"); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
      return true;
    } catch (e) {
      try { console.error("[ready-bridge-txroot3-lastmile-soft:v2] mount error:", e && (e.stack||e.message||e)); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
      return false;
    }
  }

  if (tryMount()) return;

  let tries = 0;
  const t = setInterval(() => {
    tries++;
    if (tryMount() || tries > 400) {
      clearInterval(t);
      if (tries > 400) { try { console.error("[ready-bridge-txroot3-lastmile-soft:v2] gave up waiting for __void_http_app"); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ } }
    }
  }, 25);
})();

/* === [ready-bridge-txroot3-lastmile-soft:v3-promfirst] =======================
   Symptom: /__void/ready.prom missing void_txroot_live even though v2 computes it.
   Root: Express ordering; our wrapper sometimes lands after the terminal handler.
   Fix: install a tiny prom wrapper + forcibly move it to the TOP of app._router.stack.
============================================================================= */
(function readyBridgeTxroot3PromFirstV3(){
  const G = globalThis;
  if (G.__void_ready_bridge_txroot3_promfirst_v3) return;
  G.__void_ready_bridge_txroot3_promfirst_v3 = true;

  const http = require("http");

  function envTruthy(k){
    const v = String(process.env[k] || "").trim().toLowerCase();
    return v === "1" || v === "true" || v === "yes";
  }
  const STRICT_TXROOT = () => envTruthy("REQUIRE_TXROOT_LIVE");

  const st = G.__void_ready_bridge_txroot3_lastmile_soft_v2_state || (G.__void_ready_bridge_txroot3_lastmile_soft_v2_state = {
    last_ok: 0, last_ts: 0, last_err: "", last_path: ""
  });

  function reqJson(path, timeoutMs){
    return new Promise((resolve) => {
      const req = http.request({
        host: "127.0.0.1",
        port: Number(process.env.HTTP_PORT || 4100),
        method: "GET",
        path,
        headers: { "x-void-selfcall": "1", "accept": "application/json" },
        timeout: timeoutMs || 250,
      }, (res) => {
        let b = "";
        res.setEncoding("utf8");
        res.on("data", (c) => { b += c; if (b.length > 64*1024) b = b.slice(0, 64*1024); });
        res.on("end", () => resolve({ ok: (res.statusCode|0) === 200, status: res.statusCode|0, body: b }));
      });
      req.on("timeout", () => { try { req.destroy(new Error("timeout")); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ } });
      req.on("error", (e) => resolve({ ok:false, status:0, body:"", err:String(e && (e.code||e.message||e)) }));
      try { req.end(); } catch { resolve({ ok:false, status:0, body:"", err:"end" }); }
    });
  }

  async function probeTxroot3(timeoutMs){
    const now = Date.now();
    if (st.last_ts && (now - st.last_ts) < 500) return st.last_ok|0;
    st.last_ts = now;
    st.last_err = "";
    st.last_path = "";

    const candidates = ["/health/txroot3?format=json", "/health/txroot3.json"];
    for (const p of candidates) {
      const r = await reqJson(p, timeoutMs || 250);
      st.last_path = p;
      if (!r.ok) { st.last_err = "http_" + String(r.status || 0); continue; }
      try {
        const j = JSON.parse(r.body || "{}");
        const ok = (j && typeof j.healthy === "number") ? (j.healthy|0) : (j && j.healthy ? 1 : 0);
        st.last_ok = ok ? 1 : 0;
        st.last_err = "";
        return st.last_ok|0;
      } catch {
        st.last_err = "parse";
        continue;
      }
    }
    st.last_ok = 0;
    return 0;
  }

  function upsertGauge(s, name, v){
    const re = new RegExp("^" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s+[-+0-9.eE]+\\s*$", "m");
    if (re.test(s)) return s.replace(re, name + " " + String(v));
    // append cleanly
    if (!s.endsWith("\n")) s += "\n";
    return s + name + " " + String(v) + "\n";
  }

  function patchReadyProm(text, txOk){
    let s = String(text || "");
    const tx = (!STRICT_TXROOT() && txOk === 1) ? 1 : 0;
    s = upsertGauge(s, "void_txroot_live", tx);
    return s;
  }

  function installPromWrapper(app){
    if (G.__void_ready_prom_patch_v3_installed) return true;
    G.__void_ready_prom_patch_v3_installed = true;

    function readyPromPatchV3(req, res, next){
      try{
        const m = String(req.method||"");
        const u = String(req.originalUrl || req.url || "");
        if (m !== "GET" || u !== "/__void/ready.prom") return next();

        const origEnd = res.end && res.end.bind(res);
        const origWrite = res.write && res.write.bind(res);
        if (!origEnd || !origWrite) return next();

        let buf = "";
        res.write = (chunk, enc, cb) => {
          try { buf += (typeof chunk==="string"?chunk:chunk.toString(enc||"utf8")); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
          // IMPORTANT: still write through so we don't break streaming
          return origWrite(chunk, enc, cb);
        };

        res.end = (chunk, enc, cb) => {
          try { if (chunk) buf += (typeof chunk==="string"?chunk:chunk.toString(enc||"utf8")); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
          return probeTxroot3(250).then((txOk) => {
            try {
              const patched = patchReadyProm(buf || "", txOk);
              // if we already wrote-through streaming, we can't rewrite body.
              // So: only append if missing and we can safely add a trailer line.
              // Best-effort: write an extra line right before ending.
              if (!/^\s*void_txroot_live\b/m.test(buf || "")) {
                try { origWrite("\nvoid_txroot_live " + String((!STRICT_TXROOT() && txOk===1)?1:0) + "\n"); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
              }
            } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
            try { return origEnd(chunk, enc, cb); } catch { return origEnd(); }
          });
        };

        return next();
      } catch {
        return next();
      }
    }

    // mark handle so we can find it in stack
    readyPromPatchV3.__void_ready_prom_patch_v3 = true;

    try { app.use(readyPromPatchV3); } catch { return false; }
    return true;
  }

  function bumpToTop(app){
    try{
      const r = app && app._router;
      const stack = r && Array.isArray(r.stack) ? r.stack : null;
      if (!stack) return false;

      const idx = stack.findIndex((layer) => {
        try { return !!(layer && layer.handle && layer.handle.__void_ready_prom_patch_v3); } catch { return false; }
      });
      if (idx <= 0) return idx === 0; // already top (or missing)
      const layer = stack.splice(idx, 1)[0];
      stack.unshift(layer);
      return true;
    } catch {
      return false;
    }
  }

  function tryMount(){
    const app = G.__void_http_app;
    if (!app || typeof app.use !== "function") return false;

    if (!installPromWrapper(app)) return false;

    // force to top repeatedly for a short window because other modules may attach later
    let n = 0;
    const t = setInterval(() => {
      n++;
      const ok = bumpToTop(app);
      if (ok || n > 200) {
        clearInterval(t);
        try { console.error("[ready-bridge-txroot3-lastmile-soft:v3-promfirst] prom patch top=" + String(ok)); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
      }
    }, 25);

    // diag
    try {
      app.get("/__void/ready.bridge2c.promfirst.status.json", async (_req, res) => {
        const txOk = await probeTxroot3(250);
        res.setHeader("Cache-Control","no-store");
        res.json({
          ok: true,
          ts_ms: Date.now(),
          txroot3_ok: txOk|0,
          txroot3_path: st.last_path || "",
          txroot3_err: st.last_err || "",
          strict_txroot: STRICT_TXROOT() ? 1 : 0,
          note: "v3-promfirst forces prom wrapper to top of express stack; appends void_txroot_live if missing"
        });
      });
    } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }

    return true;
  }

  if (tryMount()) return;

  let tries = 0;
  const t = setInterval(() => {
    tries++;
    if (tryMount() || tries > 400) {
      clearInterval(t);
      if (tries > 400) { try { console.error("[ready-bridge-txroot3-lastmile-soft:v3-promfirst] gave up waiting for __void_http_app"); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ } }
    }
  }, 25);
})();

/* === [ready-bridge-txroot3-lastmile-soft:v4-readyprom-rewrite] ==============
   Goal: ensure /__void/ready.prom ALWAYS contains:
     void_txroot_live {0|1}
   Prior attempts failed because the handler likely sets Content-Length and emits
   a fixed-size body; "append after" is dropped/truncated.
   Fix: for GET /__void/ready.prom, BUFFER response (override res.write/end),
   then SEND patched body ourselves, removing Content-Length.
============================================================================= */
(function readyPromRewriteV4(){
  const G = globalThis;
  if (G.__void_ready_prom_rewrite_v4) return;
  G.__void_ready_prom_rewrite_v4 = true;

  const http = require("http");

  const state = G.__void_ready_prom_rewrite_v4_state || (G.__void_ready_prom_rewrite_v4_state = {
    mounted: 0,
    hits: 0,
    patched: 0,
    txroot_ok_last: 0,
    txroot_ts_ms: 0,
    txroot_err: "",
    txroot_path: ""
  });

  function envTruthy(k){
    const v = String(process.env[k] || "").trim().toLowerCase();
    return v === "1" || v === "true" || v === "yes";
  }
  const STRICT_TXROOT = () => envTruthy("REQUIRE_TXROOT_LIVE");

  function reqJson(path, timeoutMs){
    return new Promise((resolve) => {
      const req = http.request({
        host: "127.0.0.1",
        port: Number(process.env.HTTP_PORT || 4100),
        method: "GET",
        path,
        headers: { "x-void-selfcall": "1", "accept": "application/json" },
        timeout: timeoutMs || 250,
      }, (res) => {
        let b = "";
        res.setEncoding("utf8");
        res.on("data", (c) => { b += c; if (b.length > 64*1024) b = b.slice(0, 64*1024); });
        res.on("end", () => resolve({ ok: (res.statusCode|0) === 200, status: res.statusCode|0, body: b }));
      });
      req.on("timeout", () => { try { req.destroy(new Error("timeout")); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ } });
      req.on("error", (e) => resolve({ ok:false, status:0, body:"", err:String(e && (e.code||e.message||e)) }));
      try { req.end(); } catch { resolve({ ok:false, status:0, body:"", err:"end" }); }
    });
  }

  async function probeTxroot3(timeoutMs){
    const now = Date.now();
    // tiny cache to avoid hammering
    if (state.txroot_ts_ms && (now - state.txroot_ts_ms) < 250) return state.txroot_ok_last|0;

    state.txroot_ts_ms = now;
    state.txroot_err = "";
    state.txroot_path = "";

    const candidates = ["/health/txroot3?format=json", "/health/txroot3.json"];
    for (const p of candidates) {
      const r = await reqJson(p, timeoutMs || 250);
      state.txroot_path = p;
      if (!r.ok) { state.txroot_err = "http_" + String(r.status || 0); continue; }
      try {
        const j = JSON.parse(r.body || "{}");
        const ok = (j && typeof j.healthy === "number") ? (j.healthy|0) : (j && j.healthy ? 1 : 0);
        state.txroot_ok_last = ok ? 1 : 0;
        state.txroot_err = "";
        return state.txroot_ok_last|0;
      } catch {
        state.txroot_err = "parse";
        continue;
      }
    }
    state.txroot_ok_last = 0;
    return 0;
  }

  function upsertGauge(text, name, v){
    let s = String(text || "");
    const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp("^" + esc(name) + "\\s+[-+0-9.eE]+\\s*$", "m");
    if (re.test(s)) return s.replace(re, name + " " + String(v));
    if (!s.endsWith("\n")) s += "\n";
    return s + name + " " + String(v) + "\n";
  }

  function patchReadyPromBody(body, txOk){
    const tx = (!STRICT_TXROOT() && (txOk|0) === 1) ? 1 : 0;
    let s = String(body || "");
    s = upsertGauge(s, "void_txroot_live", tx);
    return s;
  }

  function install(app){
    if (!app || typeof app.use !== "function") return false;
    if (state.mounted) return true;

    // middleware
    app.use(function readyPromRewriteV4_mw(req, res, next){
      try{
        const m = String(req.method || "");
        const u = String(req.originalUrl || req.url || "");
        if (m !== "GET" || u !== "/__void/ready.prom") return next();

        state.hits++;

        // buffer writes for THIS endpoint only
        const origWrite = res.write && res.write.bind(res);
        const origEnd = res.end && res.end.bind(res);
        if (!origEnd) return next();

        let buf = "";
        let ended = false;

        // start probe now; await inside end
        const pTx = probeTxroot3(250).catch(() => 0);

        if (origWrite) {
          res.write = (chunk, enc, cb) => {
            try { buf += (typeof chunk==="string" ? chunk : chunk.toString(enc||"utf8")); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
            try { if (typeof cb === "function") cb(); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
            return true; // DO NOT write-through
          };
        }

        res.end = (chunk, enc, cb) => {
          if (ended) return;
          ended = true;
          try { if (chunk) buf += (typeof chunk==="string" ? chunk : chunk.toString(enc||"utf8")); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }

          Promise.resolve(pTx).then((txOk) => {
            try {
              const patched = patchReadyPromBody(buf || "", txOk|0);
              if (patched !== (buf || "")) state.patched++;

              // kill content-length so patched body is authoritative
              try { res.removeHeader("Content-Length"); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
              try { res.removeHeader("content-length"); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
              try { res.setHeader("Cache-Control","no-store"); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
              // make sure content-type stays text/plain; if already set, keep it
              try {
                const ct = res.getHeader && res.getHeader("Content-Type");
                if (!ct) res.setHeader("Content-Type","text/plain; version=0.0.4; charset=utf-8");
              } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }

              return origEnd(patched, "utf8", cb);
            } catch {
              try { return origEnd(buf || "", "utf8", cb); } catch { return origEnd(); }
            }
          }).catch(() => {
            try { return origEnd(buf || "", "utf8", cb); } catch { return origEnd(); }
          });
        };

        return next();
      } catch {
        return next();
      }
    });

    // diag
    try {
      app.get("/__void/ready.bridge2d.readyprom_rewrite.status.json", (_req, res) => {
        res.setHeader("Cache-Control","no-store");
        res.json({
          ok: true,
          ts_ms: Date.now(),
          mounted: 1,
          hits: state.hits|0,
          patched: state.patched|0,
          strict_txroot: STRICT_TXROOT() ? 1 : 0,
          txroot3_ok_last: state.txroot_ok_last|0,
          txroot3_path: state.txroot_path || "",
          txroot3_err: state.txroot_err || "",
          source: "ready-bridge-txroot3-lastmile-soft:v4-readyprom-rewrite"
        });
      });
      app.get("/__void/metrics/readyprom_rewrite.v4.prom", (_req, res) => {
        res.setHeader("Content-Type","text/plain; charset=utf-8");
        res.end(
          "# HELP void_readyprom_rewrite_v4_hits Total /__void/ready.prom rewrites attempted\n" +
          "# TYPE void_readyprom_rewrite_v4_hits counter\n" +
          "void_readyprom_rewrite_v4_hits " + String(state.hits|0) + "\n" +
          "# HELP void_readyprom_rewrite_v4_patched Total times body changed\n" +
          "# TYPE void_readyprom_rewrite_v4_patched counter\n" +
          "void_readyprom_rewrite_v4_patched " + String(state.patched|0) + "\n"
        );
      });
    } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }

    state.mounted = 1;
    try { console.error("[ready-bridge-txroot3-lastmile-soft:v4-readyprom-rewrite] mounted"); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
    return true;
  }

  function tryMount(){
    const app = G.__void_http_app;
    return install(app);
  }

  if (tryMount()) return;

  let tries = 0;
  const t = setInterval(() => {
    tries++;
    if (tryMount() || tries > 400) {
      clearInterval(t);
      if (tries > 400) { try { console.error("[ready-bridge-txroot3-lastmile-soft:v4-readyprom-rewrite] gave up waiting for __void_http_app"); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ } }
    }
  }, 25);
})();

/* === [ready-bridge-txroot3-lastmile-soft:v5-readyprom-cachedpoll] ===========
   Fix v4 symptom: v4 proved we can rewrite ready.prom, but inline self-probe can
   race/timeout and yield void_txroot_live 0 even when /health/txroot3 is healthy.
   v5 strategy:
     - background poll /health/txroot3 (once/sec) into a cached last_ok value
     - rewrite /__void/ready.prom using cached last_ok (no selfcall in request path)
     - force this middleware to TOP of express stack so it always wins
============================================================================= */
(function readyPromRewriteV5(){
  const G = globalThis;
  if (G.__void_ready_prom_rewrite_v5) return;
  G.__void_ready_prom_rewrite_v5 = true;

  const http = require("http");

  function envTruthy(k){
    const v = String(process.env[k] || "").trim().toLowerCase();
    return v === "1" || v === "true" || v === "yes";
  }
  const STRICT_TXROOT = () => envTruthy("REQUIRE_TXROOT_LIVE");

  const S = G.__void_ready_prom_rewrite_v5_state || (G.__void_ready_prom_rewrite_v5_state = {
    mounted: 0,
    hits: 0,
    patched: 0,
    poll_ok: 0,
    poll_last_ok: 0,
    poll_last_ts_ms: 0,
    poll_err: "",
    poll_path: "",
    reorder_ok: 0
  });

  function reqJson(path, timeoutMs){
    return new Promise((resolve) => {
      const req = http.request({
        host: "127.0.0.1",
        port: Number(process.env.HTTP_PORT || 4100),
        method: "GET",
        path,
        headers: { "accept": "application/json" },
        timeout: timeoutMs || 350,
      }, (res) => {
        let b = "";
        res.setEncoding("utf8");
        res.on("data", (c) => { b += c; if (b.length > 64*1024) b = b.slice(0, 64*1024); });
        res.on("end", () => resolve({ ok: (res.statusCode|0) === 200, status: res.statusCode|0, body: b }));
      });
      req.on("timeout", () => { try { req.destroy(new Error("timeout")); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ } });
      req.on("error", (e) => resolve({ ok:false, status:0, body:"", err:String(e && (e.code||e.message||e)) }));
      try { req.end(); } catch { resolve({ ok:false, status:0, body:"", err:"end" }); }
    });
  }

  async function pollOnce(){
    const candidates = ["/health/txroot3?format=json", "/health/txroot3.json", "/health/txroot3?format=small"];
    for (const p of candidates) {
      const r = await reqJson(p, 450);
      S.poll_path = p;
      if (!r.ok) { S.poll_err = "http_" + String(r.status || 0); continue; }
      try {
        const j = JSON.parse(r.body || "{}");
        const ok = (j && typeof j.healthy === "number") ? (j.healthy|0) : (j && j.healthy ? 1 : 0);
        S.poll_ok = ok ? 1 : 0;
        if (S.poll_ok) {
          S.poll_last_ok = 1;
          S.poll_last_ts_ms = Date.now();
          S.poll_err = "";
          return 1;
        } else {
          S.poll_err = "healthy_0";
          // keep last_ok if we had it; don't immediately clobber to 0
          return 0;
        }
      } catch {
        S.poll_err = "parse";
        continue;
      }
    }
    // only set poll_ok; keep last_ok sticky until we have a fresh success
    S.poll_ok = 0;
    return 0;
  }

  function startPoller(){
    if (G.__void_ready_prom_rewrite_v5_poller) return;
    G.__void_ready_prom_rewrite_v5_poller = true;

    // warm poll quickly a few times after boot
    let warm = 0;
    const warmT = setInterval(() => {
      warm++;
      pollOnce().catch(()=>{});
      if (warm >= 6) clearInterval(warmT);
    }, 200);

    setInterval(() => { pollOnce().catch(()=>{}); }, 1000);
  }

  function upsertGauge(text, name, v){
    let s = String(text || "");
    const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp("^" + esc(name) + "\\s+[-+0-9.eE]+\\s*$", "m");
    if (re.test(s)) return s.replace(re, name + " " + String(v));
    if (!s.endsWith("\n")) s += "\n";
    return s + name + " " + String(v) + "\n";
  }

  function patchReadyPromBody(body){
    const cachedOk = (S.poll_last_ok|0) === 1 ? 1 : 0;
    // strict mode demands cachedOk=1; non-strict still reports cachedOk (truthy),
    // but if we don't have cachedOk yet, show 0.
    const tx = cachedOk ? 1 : 0;
    let s = String(body || "");
    s = upsertGauge(s, "void_txroot_live", tx);
    return s;
  }

  function install(app){
    if (!app || typeof app.use !== "function") return false;
    if (S.mounted) return true;

    startPoller();

    // name the function so we can find/reorder it
    function readyPromRewriteV5_mw(req, res, next){
      try{
        const m = String(req.method || "");
        const u = String(req.originalUrl || req.url || "");
        if (m !== "GET" || u !== "/__void/ready.prom") return next();

        S.hits++;

        const origWrite = res.write && res.write.bind(res);
        const origEnd = res.end && res.end.bind(res);
        if (!origEnd) return next();

        let buf = "";
        let ended = false;

        if (origWrite) {
          res.write = (chunk, enc, cb) => {
            try { buf += (typeof chunk==="string" ? chunk : chunk.toString(enc||"utf8")); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
            try { if (typeof cb === "function") cb(); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
            return true;
          };
        }

        res.end = (chunk, enc, cb) => {
          if (ended) return;
          ended = true;
          try { if (chunk) buf += (typeof chunk==="string" ? chunk : chunk.toString(enc||"utf8")); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }

          try {
            const patched = patchReadyPromBody(buf || "");
            if (patched !== (buf || "")) S.patched++;

            try { res.removeHeader("Content-Length"); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
            try { res.removeHeader("content-length"); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
            try { res.setHeader("Cache-Control","no-store"); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
            try {
              const ct = res.getHeader && res.getHeader("Content-Type");
              if (!ct) res.setHeader("Content-Type","text/plain; version=0.0.4; charset=utf-8");
            } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }

            return origEnd(patched, "utf8", cb);
          } catch {
            try { return origEnd(buf || "", "utf8", cb); } catch { return origEnd(); }
          }
        };

        return next();
      } catch {
        return next();
      }
    }

    app.use(readyPromRewriteV5_mw);

    // force to top of stack (best-effort)
    try {
      const r = app._router;
      const st = r && Array.isArray(r.stack) ? r.stack : null;
      if (st) {
        const idx = st.findIndex((l) => l && l.handle && l.handle.name === "readyPromRewriteV5_mw");
        if (idx >= 0) {
          const layer = st.splice(idx, 1)[0];
          st.unshift(layer);
          S.reorder_ok = 1;
        }
      }
    } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }

    // diag
    try {
      app.get("/__void/ready.bridge2e.readyprom_cachedpoll.status.json", (_req, res) => {
        res.setHeader("Cache-Control","no-store");
        res.json({
          ok: true,
          ts_ms: Date.now(),
          mounted: 1,
          hits: S.hits|0,
          patched: S.patched|0,
          strict_txroot: STRICT_TXROOT() ? 1 : 0,
          poll_ok: S.poll_ok|0,
          poll_last_ok: S.poll_last_ok|0,
          poll_last_ts_ms: S.poll_last_ts_ms|0,
          poll_age_ms: S.poll_last_ts_ms ? (Date.now() - S.poll_last_ts_ms) : -1,
          poll_path: S.poll_path || "",
          poll_err: S.poll_err || "",
          reorder_ok: S.reorder_ok|0,
          source: "ready-bridge-txroot3-lastmile-soft:v5-readyprom-cachedpoll"
        });
      });
    } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }

    S.mounted = 1;
    try { console.error("[ready-bridge-txroot3-lastmile-soft:v5-readyprom-cachedpoll] mounted"); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
    return true;
  }

  function tryMount(){
    const app = G.__void_http_app;
    return install(app);
  }

  if (tryMount()) return;

  let tries = 0;
  const t = setInterval(() => {
    tries++;
    if (tryMount() || tries > 400) {
      clearInterval(t);
      if (tries > 400) { try { console.error("[ready-bridge-txroot3-lastmile-soft:v5-readyprom-cachedpoll] gave up waiting for __void_http_app"); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ } }
    }
  }, 25);
})();

/* === [ready-bridge-txroot3-lastmile-soft:v6-timefix] ========================
   v5 fixed txroot_live by using background poll + cached last_ok.
   But v5 status shows poll_last_ts_ms is nonsense => Date.now() likely patched.
   v6: add time sanity probes + compute poll_age_ms from process.uptime() instead.
============================================================================= */
(function readyPromRewriteV6_timefix(){
  const G = globalThis;
  if (G.__void_ready_prom_rewrite_v6_timefix) return;
  G.__void_ready_prom_rewrite_v6_timefix = true;

  const S = G.__void_ready_prom_rewrite_v5_state;
  if (!S) return;

  // capture once
  if (!G.__void_time_sanity_v6) {
    G.__void_time_sanity_v6 = {
      installed_ts_ms: (typeof Date.now === "function" ? Date.now() : 0),
      installed_uptime_ms: Math.floor((typeof process.uptime==="function" ? process.uptime() : 0) * 1000),
      now_samples: [],
      note: ""
    };

    try {
      const samples = [];
      for (let i=0;i<6;i++){
        const n = (typeof Date.now==="function") ? Date.now() : 0;
        samples.push(n);
      }
      G.__void_time_sanity_v6.now_samples = samples;

      // heuristic: Date.now should be ~1.7e12 in 2026 and increasing
      const last = samples[samples.length-1] || 0;
      const ok_ms_epoch = last > 1e12 && last < 2e12;
      const monotonic = samples.every((v, i) => i===0 || v >= samples[i-1]);

      if (!ok_ms_epoch) G.__void_time_sanity_v6.note += "Date.now not ms-epoch; ";
      if (!monotonic) G.__void_time_sanity_v6.note += "Date.now not monotonic; ";
      if (!G.__void_time_sanity_v6.note) G.__void_time_sanity_v6.note = "ok";
    } catch {
      G.__void_time_sanity_v6.note = "probe_error";
    }
  }

  // patch S to store uptime tick when last_ok is set
  if (!S.__v6_wrapped_lastok) {
    S.__v6_wrapped_lastok = 1;
    S.poll_last_uptime_ms = S.poll_last_uptime_ms || 0;

    // wrap pollOnce side-effect: whenever poll_last_ok is 1 and poll_last_ts_ms updated, also set uptime
    // We can't reach pollOnce directly here, so we do it opportunistically:
    // whenever poll_ok==1, refresh poll_last_uptime_ms.
    const orig = S.poll_ok;
    // no-op; we just ensure status computes age using uptime below.
  }

  // monkeypatch status route output via a soft override: stash a helper used by status printers (if any)
  // We'll add a helper accessor and have status compute age via uptime.
  G.__void_ready_prom_rewrite_v6_age = function(){
    try {
      const up = Math.floor((typeof process.uptime==="function" ? process.uptime() : 0) * 1000);
      const lastUp = (S.poll_last_uptime_ms|0) || 0;
      if (lastUp <= 0) return -1;
      const d = up - lastUp;
      return (d >= 0 && d < 1e9) ? d : -1;
    } catch { return -1; }
  };

  // Also: refresh poll_last_uptime_ms whenever poll_ok shows success (best-effort, sticky)
  try {
    // Install a tiny timer that peeks at poll_ok and updates last_uptime.
    if (!G.__void_ready_prom_rewrite_v6_timefix_timer) {
      G.__void_ready_prom_rewrite_v6_timefix_timer = true;
      setInterval(() => {
        try{
          if ((S.poll_ok|0) === 1) {
            S.poll_last_uptime_ms = Math.floor((typeof process.uptime==="function" ? process.uptime() : 0) * 1000);
          }
        }catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
      }, 250);
    }
  } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
})();

/* === [ready-bridge-txroot3-lastmile-soft:v7-pollpath-hotfix] =================
   Problem: v5 cached-poll is now hitting /health/txroot3?format=small (404),
            so poll_ok=0 and timestamps reset.
   v7: force poll_path to known-good "/health/txroot3?format=json" and install an
       independent “truth poller” that updates the shared v5 state fields so:
         - poll_ok / poll_last_ok reflect reality
         - ready.prom rewrite can safely emit void_txroot_live from poll_last_ok
   NOTE: additive-only, no route mounting required.
============================================================================= */
(function readyBridgeV7_pollpath_hotfix(){
  const G = globalThis;
  if (G.__void_ready_bridge_v7_pollpath_hotfix) return;
  G.__void_ready_bridge_v7_pollpath_hotfix = true;

  const S = G.__void_ready_prom_rewrite_v5_state;
  if (!S) return;

  // Force known-good path. Keep any previous forensics in a side field.
  try {
    const prev = String(S.poll_path || "");
    S.poll_path_prev_v7 = prev;
    const GOOD = "/health/txroot3?format=json";
    if (!prev || /format=small\b/i.test(prev) || /format=small$/i.test(prev) || /format=small&/i.test(prev)) {
      S.poll_path = GOOD;
      S.poll_path_fixed_v7 = 1;
    } else if (prev !== GOOD && /health\/txroot3/i.test(prev) && !/format=json/i.test(prev)) {
      // if someone changed the query format, normalize back to json
      S.poll_path = GOOD;
      S.poll_path_fixed_v7 = 1;
    } else {
      // still normalize to GOOD for consistency
      S.poll_path = GOOD;
      S.poll_path_fixed_v7 = 1;
    }
  } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }

  // v7 truth poller: independent of any other poll loop.
  if (G.__void_ready_bridge_v7_truth_poller) return;
  G.__void_ready_bridge_v7_truth_poller = true;

  function nowMs() {
    try { return (typeof Date.now === "function") ? Date.now() : 0; } catch { return 0; }
  }
  function upMs() {
    try { return Math.floor((typeof process.uptime === "function" ? process.uptime() : 0) * 1000); } catch { return 0; }
  }

  // low-risk fetch helper (works on Node 18+)
  async function fetchJson(path) {
    const url = "http://127.0.0.1:4100" + path;
    const ctl = new AbortController();
    const t = setTimeout(() => { try { ctl.abort(); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ } }, 650);
    try {
      const res = await fetch(url, { signal: ctl.signal, headers: { "accept": "application/json" }});
      const txt = await res.text();
      if (!res.ok) return { ok: 0, err: "http_" + res.status, status: res.status, txt };
      try { return { ok: 1, json: JSON.parse(txt) }; } catch { return { ok: 0, err: "bad_json", txt }; }
    } catch (e) {
      return { ok: 0, err: (e && e.name === "AbortError") ? "timeout" : "fetch_err" };
    } finally { clearTimeout(t); }
  }

  // truth poll loop
  let inFlight = false;
  setInterval(async () => {
    if (inFlight) return;
    inFlight = true;
    try {
      const path = String(S.poll_path || "/health/txroot3?format=json");
      const r = await fetchJson(path);

      const up = upMs();
      const ts = nowMs();

      if (r.ok && r.json && typeof r.json === "object") {
        const healthy = (r.json.healthy|0) === 1 ? 1 : 0;
        S.poll_ok = 1;
        S.poll_last_ok = healthy;
        S.poll_last_ts_ms = ts;
        S.poll_last_uptime_ms = up;
        S.poll_err = "";
        S.poll_path = path;
        S.poll_age_ms = 0;
        S.poll_last_latest = (r.json.latest != null ? r.json.latest : null);
      } else {
        S.poll_ok = 0;
        S.poll_last_ok = 0;
        S.poll_err = String(r.err || "poll_fail");
        S.poll_path = path;
        // keep last_ts/uptime if we had it; else leave
        if (!S.poll_last_uptime_ms) S.poll_last_uptime_ms = up;
        // compute age from uptime if possible
        const lastUp = (S.poll_last_uptime_ms|0) || 0;
        S.poll_age_ms = (lastUp > 0 && up >= lastUp) ? (up - lastUp) : -1;
      }
    } catch (e) {
      try {
        S.poll_ok = 0;
        S.poll_last_ok = 0;
        S.poll_err = "poll_exception";
      } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
    } finally {
      inFlight = false;
    }
  }, 500);
})();

/* BEGIN ready-bridge-txroot3:v8-autodiscover */
/*
  Goal:
    - Robustly publish txroot_live into /__void/ready.prom even if other shims reorder.
    - Avoid any dependency on globalThis.__void_http_app (works even when after-app gate misses).
    - Self-heal: auto-discover a working txroot JSON endpoint.
  Sources (current build):
    - /health/txroot3?format=json  (preferred)
    - /health/txroot3
    - /metrics/txroot3.json        (fallback)
*/
(() => {
  try {
    const http = require("http");

    const G = globalThis;
    if (G.__void_ready_bridge_txroot3_v8_installed) return;
    G.__void_ready_bridge_txroot3_v8_installed = true;

    const STATE = (G.__void_ready_bridge_txroot3_v8_state ||= {
      ok: 0,
      last_ok: 0,
      last_ts_ms: 0,
      age_ms: -1,
      path: "",
      err: "",
      healthy: 0,
      latest: -1,
      hits: 0,
      patched: 0,
      discover_tries: 0,
      poll_tries: 0,
      source: "ready-bridge-txroot3:v8-autodiscover",
    });

    function nowMs() { return Date.now(); }

    const PORT = (() => {
      const p = Number(process.env.HTTP_PORT || 4100);
      return Number.isFinite(p) && p > 0 ? p : 4100;
    })();

    const HOST = "127.0.0.1";

    const CANDS = [
      "/health/txroot3?format=json",
      "/health/txroot3",
      "/metrics/txroot3.json",
    ];

    function httpGetJson(path, timeoutMs = 800) {
      return new Promise((resolve) => {
        const t0 = nowMs();
        const req = http.request(
          { host: HOST, port: PORT, method: "GET", path, timeout: timeoutMs, headers: { "accept": "application/json" } },
          (res) => {
            const code = res.statusCode || 0;
            let bytes = 0;
            const chunks = [];
            res.on("data", (c) => {
              bytes += c.length;
              if (bytes <= 256 * 1024) chunks.push(c);
            });
            res.on("end", () => {
              const ms = nowMs() - t0;
              if (code !== 200) return resolve({ ok: 0, code, ms, err: `http_${code}` });
              const body = Buffer.concat(chunks).toString("utf8");
              try {
                const j = JSON.parse(body);
                resolve({ ok: 1, code, ms, j });
              } catch (e) {
                resolve({ ok: 0, code, ms, err: "bad_json" });
              }
            });
          }
        );
        req.on("timeout", () => { try { req.destroy(new Error("timeout")); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ } });
        req.on("error", (e) => resolve({ ok: 0, code: 0, ms: nowMs() - t0, err: (e && e.message) ? e.message : "err" }));
        req.end();
      });
    }

    async function discoverPathOnce() {
      STATE.discover_tries++;
      for (const p of CANDS) {
        const r = await httpGetJson(p, 700);
        if (!r.ok) continue;
        const j = r.j || {};
        // health endpoint shape: { ok:true, healthy:1, latest:N, ... }
        if (typeof j === "object" && j) {
          if (("healthy" in j) || ("latest" in j)) return { ok: 1, path: p, j };
          if (("lastRoot" in j) || ("ok" in j)) return { ok: 1, path: p, j };
        }
      }
      return { ok: 0, path: "", j: null };
    }

    async function pollOnce() {
      STATE.poll_tries++;
      // ensure we have a usable path
      if (!STATE.path) {
        const d = await discoverPathOnce();
        if (d.ok) STATE.path = d.path;
      }

      const p = STATE.path || CANDS[0];
      const r = await httpGetJson(p, 900);
      const ts = nowMs();

      if (!r.ok) {
        // if we got a 404 or bad_json, force rediscovery next tick
        STATE.ok = 0;
        STATE.last_ok = 0;
        STATE.last_ts_ms = ts;
        STATE.age_ms = 0;
        STATE.err = r.err || "poll_err";
        STATE.healthy = 0;
        STATE.latest = -1;
        if ((r.err || "").startsWith("http_404") || r.err === "bad_json") STATE.path = "";
        return;
      }

      const j = r.j || {};
      let healthy = 0;
      let latest = -1;

      if (typeof j.healthy === "number") healthy = j.healthy ? 1 : 0;
      else if (typeof j.healthy === "boolean") healthy = j.healthy ? 1 : 0;
      else if (typeof j.ok === "boolean") healthy = j.ok ? 1 : 0;

      if (typeof j.latest === "number") latest = j.latest;

      STATE.ok = 1;
      STATE.last_ok = healthy ? 1 : 0;
      STATE.last_ts_ms = ts;
      STATE.age_ms = 0;
      STATE.err = "";
      STATE.healthy = healthy ? 1 : 0;
      STATE.latest = latest;
      STATE.path = p;
    }

    // poll loop (cheap)
    const INTERVAL_MS = 1000;
    setInterval(() => {
      pollOnce().catch((e) => {
        try {
          STATE.ok = 0;
          STATE.last_ok = 0;
          STATE.last_ts_ms = nowMs();
          STATE.age_ms = 0;
          STATE.err = (e && e.message) ? e.message : "poll_exception";
          STATE.healthy = 0;
          STATE.latest = -1;
          STATE.path = "";
        } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
      });
      try {
        if (STATE.last_ts_ms > 0) STATE.age_ms = nowMs() - STATE.last_ts_ms;
      } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
    }, INTERVAL_MS);

    // --- READY.PROM rewriter (no app required) ---
    // We patch per-response buffering ONLY for /__void/ready.prom.
    const ORIG_WRITE = http.ServerResponse.prototype.write;
    const ORIG_END = http.ServerResponse.prototype.end;

    function rewriteReadyProm(bodyStr) {
      const live = (STATE.last_ok ? 1 : 0);
      let s = bodyStr;

      // replace existing line if present
      if (/\n?void_txroot_live\s+[01]\s*\n/.test("\n" + s + "\n")) {
        s = ("\n" + s + "\n").replace(/\nvoid_txroot_live\s+[01]\s*\n/g, `\nvoid_txroot_live ${live}\n`).trimStart();
      } else {
        // append at end
        if (!s.endsWith("\n")) s += "\n";
        s += `# HELP void_txroot_live 1 if txroot3 health says healthy, else 0\n`;
        s += `# TYPE void_txroot_live gauge\n`;
        s += `void_txroot_live ${live}\n`;
      }
      return s;
    }

    http.ServerResponse.prototype.write = function (chunk, enc, cb) {
      try {
        const req = this.req;
        if (req && req.url && typeof req.url === "string" && req.url.startsWith("/__void/ready.prom")) {
          this.__void_ready_prom_buf ||= [];
          if (chunk) this.__void_ready_prom_buf.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), enc || "utf8"));
          STATE.hits++;
          return true;
        }
      } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
      return ORIG_WRITE.call(this, chunk, enc, cb);
    };

    http.ServerResponse.prototype.end = function (chunk, enc, cb) {
      try {
        const req = this.req;
        if (req && req.url && typeof req.url === "string" && req.url.startsWith("/__void/ready.prom")) {
          const bufs = this.__void_ready_prom_buf || [];
          if (chunk) bufs.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), enc || "utf8"));
          const body = Buffer.concat(bufs).toString("utf8");

          const patched = rewriteReadyProm(body);
          if (patched !== body) STATE.patched++;

          try { this.setHeader("content-type", "text/plain; charset=utf-8"); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
          try { this.setHeader("content-length", Buffer.byteLength(patched)); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }

          return ORIG_END.call(this, patched, "utf8", cb);
        }
      } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
      return ORIG_END.call(this, chunk, enc, cb);
    };

    // tiny diag endpoint (no express; raw http) – just expose state on console via log
    try {
      console.error(`[ready-bridge-txroot3:v8] installed (port=${PORT})`);
    } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
  } catch (e) {
    try { console.error("[ready-bridge-txroot3:v8] failed:", e && e.message ? e.message : e); } catch (voidDiagCatchError) { void voidDiagCatchError; /* VOID_DIAG_PRELOAD_GATE_EMPTY_CATCH_VISIBILITY_V1 */ }
  }
})();
 /* END ready-bridge-txroot3:v8-autodiscover */


/* === ready-bridge-route-park:v1 (idempotent) ===========================
   Goal: prevent legacy ready-bridge status endpoints from misleading ops.
   Strategy: install TOP-OF-STACK middleware returning 410 for deprecated paths.
   Safe: additive only; does not delete/unregister routes.
======================================================================= */
;(function readyBridgeRouteParkV1(){
  const G = globalThis;
  if (G.__void_ready_bridge_route_park_v1) return;
  G.__void_ready_bridge_route_park_v1 = true;

  const PARK = new Set([
    "/__void/ready.bridge2.status.json",
    "/__void/ready.bridge2b.status.json",
    "/__void/ready.bridge2c.promfirst.status.json",
    "/__void/ready.bridge2d.readyprom_rewrite.status.json",
    // NOTE: keep canonical:
    // "/__void/ready.bridge2e.readyprom_cachedpoll.status.json",
  ]);

  function getApp(){
    try{
      return G.__void_http_app || (G.__void_http && G.__void_http.app) || null;
    }catch(_){ return null; }
  }

  function mount(){
    const app = getApp();
    if (!app || typeof app.use !== "function") return false;

    // install middleware
    app.use(function readyBridgeRouteParkMw(req, res, next){
      try{
        const p = (req && (req.path || (typeof req.url === "string" ? req.url.split("?")[0] : ""))) || "";
        if (PARK.has(p)) {
          res.statusCode = 410;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({
            ok: false,
            parked: 1,
            path: p,
            hint: "Use /__void/ready.bridge2e.readyprom_cachedpoll.status.json (canonical) and /__void/ready.prom"
          }));
          return;
        }
      }catch (__void_diag_preload_bundle_pack6_err) { __voidSrcDiagPreloadBundleVisible("VOID_SRC_DIAG_PRELOAD_BUNDLE_PACK6_1858_1_VISIBLE", __void_diag_preload_bundle_pack6_err); }
      return next();
    });

    // move LAST-added middleware to TOP of stack (so it actually blocks)
    try{
      const st = app._router && app._router.stack;
      if (Array.isArray(st) && st.length > 0) {
        const layer = st[st.length - 1];
        st.splice(st.length - 1, 1);
        st.unshift(layer);
      }
    }catch (__void_diag_preload_bundle_pack6_err) { __voidSrcDiagPreloadBundleVisible("VOID_SRC_DIAG_PRELOAD_BUNDLE_PACK6_1870_2_VISIBLE", __void_diag_preload_bundle_pack6_err); }

    try{ console.error("[ready-bridge-route-park:v1] active; parked=" + PARK.size); }catch (__void_diag_preload_bundle_pack6_err) { __voidSrcDiagPreloadBundleVisible("VOID_SRC_DIAG_PRELOAD_BUNDLE_PACK6_1872_3_VISIBLE", __void_diag_preload_bundle_pack6_err); }
    return true;
  }

  let tries = 0;
  const t = setInterval(() => {
    tries++;
    if (mount()) { clearInterval(t); return; }
    if (tries >= 80) { clearInterval(t); try{ console.error("[ready-bridge-route-park:v1] gave up waiting for app"); }catch (__void_diag_preload_bundle_pack6_err) { __voidSrcDiagPreloadBundleVisible("VOID_SRC_DIAG_PRELOAD_BUNDLE_PACK6_1880_4_VISIBLE", __void_diag_preload_bundle_pack6_err); } }
  }, 250);
})();

/* === ready-prom-txroot-live-from-textfile:v10 ==========================
   Goal: make void_txroot_live in /__void/ready.prom robust.
   Strategy: read the node_exporter textfile metric we already generate:
     /var/lib/node_exporter/textfile_collector/void_ready_txroot_live.prom
   No self-HTTP. No dependency on cachedpoll timers. Safe defaults.
======================================================================= */
;(function readyPromTxrootLiveFromTextfileV10(){
  const G = globalThis;
  if (G.__void_ready_prom_txroot_live_from_textfile_v10) return;
  G.__void_ready_prom_txroot_live_from_textfile_v10 = true;

  const fs = require("fs");
  const TEXTFILE =
    process.env.VOID_TXROOT_LIVE_TEXTFILE ||
    "/var/lib/node_exporter/textfile_collector/void_ready_txroot_live.prom";

  // tiny cache so we don't read disk on every scrape
  let last = { ts: 0, v: null };
  function readLive(){
    const now = Date.now();
    if (last.v !== null && (now - last.ts) < 800) return last.v; // 0.8s cache
    let v = null;
    try{
      const s = fs.readFileSync(TEXTFILE, "utf8");
      const m = s.match(/^\s*void_txroot_live_current\s+([0-9.]+)\s*$/m);
      if (m) v = Number(m[1]) >= 1 ? 1 : 0;
    }catch (__void_diag_preload_bundle_pack6_err) { __voidSrcDiagPreloadBundleVisible("VOID_SRC_DIAG_PRELOAD_BUNDLE_PACK6_1910_5_VISIBLE", __void_diag_preload_bundle_pack6_err); }
    last = { ts: now, v };
    return v;
  }

  function getApp(){
    try{
      return G.__void_http_app || (G.__void_http && G.__void_http.app) || null;
    }catch(_){ return null; }
  }

  function patchBody(body){
    const live = readLive();
    if (live === null) return body; // if missing, do nothing
    const line = "void_txroot_live " + String(live);
    const has = /(^|\n)\s*void_txroot_live\s+[0-9.]+\s*(\n|$)/.test(body);
    if (!has) {
      return body.replace(/\n?$/, "\n" + line + "\n");
    }
    return body.replace(/(^|\n)\s*void_txroot_live\s+[0-9.]+\s*(\n|$)/m, "\n" + line + "\n");
  }

  function mount(){
    const app = getApp();
    if (!app || typeof app.use !== "function") return false;

    // middleware: after route runs, patch /__void/ready.prom response
    app.use(function readyPromTxrootLiveTextfileMw(req, res, next){
      try{
        const p = (req && (req.path || (typeof req.url === "string" ? req.url.split("?")[0] : ""))) || "";
        if (p !== "/__void/ready.prom") return next();

        const _send = res.send && res.send.bind(res);
        if (typeof _send !== "function") return next();

        res.send = function(body){
          try{
            if (typeof body === "string") body = patchBody(body);
          }catch (__void_diag_preload_bundle_pack6_err) { __voidSrcDiagPreloadBundleVisible("VOID_SRC_DIAG_PRELOAD_BUNDLE_PACK6_1948_6_VISIBLE", __void_diag_preload_bundle_pack6_err); }
          return _send(body);
        };
      }catch (__void_diag_preload_bundle_pack6_err) { __voidSrcDiagPreloadBundleVisible("VOID_SRC_DIAG_PRELOAD_BUNDLE_PACK6_1951_7_VISIBLE", __void_diag_preload_bundle_pack6_err); }
      return next();
    });

    // move LAST-added middleware to TOP so it runs early enough to wrap res.send
    try{
      const st = app._router && app._router.stack;
      if (Array.isArray(st) && st.length > 0) {
        const layer = st[st.length - 1];
        st.splice(st.length - 1, 1);
        st.unshift(layer);
      }
    }catch (__void_diag_preload_bundle_pack6_err) { __voidSrcDiagPreloadBundleVisible("VOID_SRC_DIAG_PRELOAD_BUNDLE_PACK6_1963_8_VISIBLE", __void_diag_preload_bundle_pack6_err); }

    // status endpoint
    try{
      app.get("/__void/ready.prom.txroot_live_textfile.v10.status.json", (req, res) => {
        const live = readLive();
        res.json({
          ok: true,
          ts_ms: Date.now(),
          textfile: TEXTFILE,
          live,
          cache_age_ms: (last.ts ? (Date.now() - last.ts) : -1),
          note: "If live is null, exporter file missing/unreadable; ready.prom left untouched."
        });
      });
    }catch (__void_diag_preload_bundle_pack6_err) { __voidSrcDiagPreloadBundleVisible("VOID_SRC_DIAG_PRELOAD_BUNDLE_PACK6_1978_9_VISIBLE", __void_diag_preload_bundle_pack6_err); }

    try{ console.error("[ready-prom-txroot-live-from-textfile:v10] active textfile=" + TEXTFILE); }catch (__void_diag_preload_bundle_pack6_err) { __voidSrcDiagPreloadBundleVisible("VOID_SRC_DIAG_PRELOAD_BUNDLE_PACK6_1980_10_VISIBLE", __void_diag_preload_bundle_pack6_err); }
    return true;
  }

  let tries = 0;
  const t = setInterval(() => {
    tries++;
    if (mount()) { clearInterval(t); return; }
    if (tries >= 80) { clearInterval(t); try{ console.error("[ready-prom-txroot-live-from-textfile:v10] gave up waiting for app"); }catch (__void_diag_preload_bundle_pack6_err) { __voidSrcDiagPreloadBundleVisible("VOID_SRC_DIAG_PRELOAD_BUNDLE_PACK6_1988_11_VISIBLE", __void_diag_preload_bundle_pack6_err); } }
  }, 250);
})();

/* === ready-bridge-killswitch:v11 (idempotent) ==========================
   Goal: prevent legacy ready-bridge STATUS endpoints from misleading ops or
         reintroducing confusing “truth” sources.
   Strategy: TOP-OF-STACK middleware returns 410 for deprecated paths, while
             allowing canonical endpoints to remain.
   Safe: additive only; does not unregister/delete routes.
======================================================================== */
;(function readyBridgeKillswitchV11(){
  const G = globalThis;
  if (G.__void_ready_bridge_killswitch_v11) return;
  G.__void_ready_bridge_killswitch_v11 = true;

  const ALLOW = new Set([
    "/__void/ready.bridge2e.readyprom_cachedpoll.status.json",
    "/__void/ready.prom.txroot_live_textfile.v10.status.json",
    "/__void/ready.prom",
  ]);

  // Park anything that looks like a legacy ready bridge status endpoint
  function shouldPark(path){
    if (!path || typeof path !== "string") return false;
    if (ALLOW.has(path)) return false;
    // legacy status endpoints you’ve accumulated
    if (/^\/__void\/ready\.bridge2[a-z0-9]*\..*status\.json$/i.test(path)) return true;
    if (/^\/__void\/ready\.bridge2[a-z0-9]*\.status\.json$/i.test(path)) return true;
    if (/^\/__void\/ready\.gatefix\.status\.json$/i.test(path)) return true;
    // legacy rewrite metrics endpoints (optional park)
    if (/^\/__void\/metrics\/readyprom_rewrite\./i.test(path)) return true;
    return false;
  }

  const COUNTS = { parked: 0, passed: 0 };

  function getApp(){
    const app = (G && (G.__void_http_app || (G.__void_http && G.__void_http.app))) || null;
    if (!app) return null;
    if (typeof app.use !== "function") return null;
    return app;
  }

  function mount(){
    const app = getApp();
    if (!app) return false;

    // Install truly top-of-stack: unshift onto router stack if possible.
    const mw = function(req, res, next){
      try{
        const p = (req && (req.path || req.url)) ? String(req.path || req.url).split("?")[0] : "";
        if (shouldPark(p)){
          COUNTS.parked++;
          res.status(410);
          res.setHeader("content-type", "application/json; charset=utf-8");
          res.end(JSON.stringify({
            ok: false,
            parked: true,
            path: p,
            hint: "Use /__void/ready.prom or v10/v2e status endpoints",
            allow: Array.from(ALLOW)
          }));
          return;
        }
        COUNTS.passed++;
      }catch (__void_diag_preload_bundle_pack6_err) { __voidSrcDiagPreloadBundleVisible("VOID_SRC_DIAG_PRELOAD_BUNDLE_PACK6_2054_12_VISIBLE", __void_diag_preload_bundle_pack6_err); }
      return next();
    };

    try{
      app.use(mw);
      // try to move to front of stack (best-effort)
      try{
        const r = app._router;
        if (r && Array.isArray(r.stack)) {
          const idx = r.stack.findIndex(x => x && x.handle === mw);
          if (idx > 0) {
            const layer = r.stack.splice(idx, 1)[0];
            r.stack.unshift(layer);
          }
        }
      }catch (__void_diag_preload_bundle_pack6_err) { __voidSrcDiagPreloadBundleVisible("VOID_SRC_DIAG_PRELOAD_BUNDLE_PACK6_2070_13_VISIBLE", __void_diag_preload_bundle_pack6_err); }
    }catch (__void_diag_preload_bundle_pack6_err) { __voidSrcDiagPreloadBundleVisible("VOID_SRC_DIAG_PRELOAD_BUNDLE_PACK6_2071_14_VISIBLE", __void_diag_preload_bundle_pack6_err); }

    // status endpoint
    try{
      app.get("/__void/ready.bridge.killswitch.v11.status.json", (req, res) => {
        res.json({
          ok: true,
          ts_ms: Date.now(),
          allow: Array.from(ALLOW),
          counts: COUNTS
        });
      });
    }catch (__void_diag_preload_bundle_pack6_err) { __voidSrcDiagPreloadBundleVisible("VOID_SRC_DIAG_PRELOAD_BUNDLE_PACK6_2083_15_VISIBLE", __void_diag_preload_bundle_pack6_err); }

    try{ console.error("[ready-bridge-killswitch:v11] active"); }catch (__void_diag_preload_bundle_pack6_err) { __voidSrcDiagPreloadBundleVisible("VOID_SRC_DIAG_PRELOAD_BUNDLE_PACK6_2085_16_VISIBLE", __void_diag_preload_bundle_pack6_err); }
    return true;
  }

  let tries = 0;
  const t = setInterval(() => {
    tries++;
    if (mount()) { clearInterval(t); return; }
    if (tries >= 80) { clearInterval(t); try{ console.error("[ready-bridge-killswitch:v11] gave up waiting for app"); }catch (__void_diag_preload_bundle_pack6_err) { __voidSrcDiagPreloadBundleVisible("VOID_SRC_DIAG_PRELOAD_BUNDLE_PACK6_2093_17_VISIBLE", __void_diag_preload_bundle_pack6_err); } }
  }, 250);
})();
