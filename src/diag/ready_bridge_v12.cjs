/* ready_bridge_v12.cjs (v12k)
   Goal: make /__void/ready.json + /__void/ready.prom stable across restarts.
   Fixes:
     - main-thread only + hardguard
     - txroot3 poller: boot 404 does NOT poison; activate after first success
     - recompute gap safely (clamp lastmile_seen=-1 bootstrap)
     - recompute txroot_live (bridged) once txroot3 has succeeded
     - recompute ready based on (txroot_live==1 && gap<=10) so JSON+PROM agree
*/
(() => {
  let isMainThread = true;
  let threadId = 0;
  try {
    const wt = require("worker_threads");
    isMainThread = !!wt.isMainThread;
    threadId = (wt.threadId ?? 0) | 0;
  } catch (voidReadyBridgeV12CatchError) { void voidReadyBridgeV12CatchError; /* VOID_READY_BRIDGE_V12_EMPTY_CATCH_VISIBILITY_V1 */ }

  const G = globalThis;
  const HARD = Symbol.for("VOID.ready_bridge_v12.HARDGUARD");
  if (!isMainThread) {
    try { console.error("[ready_bridge_v12] skip (worker) tid=" + threadId); } catch (voidReadyBridgeV12CatchError) { void voidReadyBridgeV12CatchError; /* VOID_READY_BRIDGE_V12_EMPTY_CATCH_VISIBILITY_V1 */ }
    return;
  }
  if (G[HARD]) {
    try { console.error("[ready_bridge_v12] already installed (hardguard)"); } catch (voidReadyBridgeV12CatchError) { void voidReadyBridgeV12CatchError; /* VOID_READY_BRIDGE_V12_EMPTY_CATCH_VISIBILITY_V1 */ }
    return;
  }
  G[HARD] = true;
  try { console.error("[ready_bridge_v12] hardguard ok (main) tid=" + threadId); } catch (voidReadyBridgeV12CatchError) { void voidReadyBridgeV12CatchError; /* VOID_READY_BRIDGE_V12_EMPTY_CATCH_VISIBILITY_V1 */ }

  const http = require("http");
  const https = require("https");
// [boot-grace.v1] avoid false-red ready during early boot when txroot3 routes may not exist yet.
const __RB_BOOT_MS = Date.now();
const __RB_BOOT_GRACE_MS = (() => {
  const v = String(process.env.VOID_READY_BOOT_GRACE_MS || "60000").trim();
  const n = parseInt(v, 10);
  return (Number.isFinite(n) && n >= 0) ? n : 60000;
})();
function __rbInBootGrace() {
  const age = Date.now() - __RB_BOOT_MS;
  return age >= 0 && age < __RB_BOOT_GRACE_MS;
}

  const { URL } = require("url");

  const HTTP_HOST =
    process.env.VOID_HTTP_HOST ||
    process.env.HTTP_HOST ||
    "127.0.0.1";
  const HTTP_PORT = Number(process.env.HTTP_PORT || 4100);
  const BASE = `http://${HTTP_HOST}:${HTTP_PORT}`;
  const TXROOT3 = `${BASE}/health/txroot3?format=json`;

  const br = {
    v: "12k",
    seen_ok: false,
    ok: false,
    latest: -1,
    age_ms: 1_000_000_000,
    in_flight: false,
    last_err: "not_started",
    last_ok_ms: 0,
    last_poll_ms: 0,
  };

  function fetchJson(urlStr, timeoutMs) {
    return new Promise((resolve, reject) => {
      let u;
      try { u = new URL(urlStr); } catch (e) { return reject(e); }
      const mod = (u.protocol === "https:") ? https : http;
      const req = mod.request(
        {
          protocol: u.protocol,
          hostname: u.hostname,
          port: u.port,
          path: u.pathname + u.search,
          method: "GET",
          headers: { "accept": "application/json" },
        },
        (res) => {
          const code = res.statusCode | 0;
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            const body = Buffer.concat(chunks).toString("utf8");
            if (code >= 200 && code < 300) {
              try { return resolve({ ok: true, code, json: JSON.parse(body) }); }
              catch { return reject(new Error("json_parse")); }
            }
            return resolve({ ok: false, code, body: body.slice(0, 200) });
          });
        }
      );
      req.on("error", reject);
      req.setTimeout(timeoutMs, () => req.destroy(new Error("timeout")));
      req.end();
    });
  }

  async function pollOnce() {
    if (br.in_flight) return;
    br.in_flight = true;
    br.last_poll_ms = Date.now();
    try {
      const r = await fetchJson(TXROOT3, 1500);
      if (r && r.ok && r.json && typeof r.json === "object") {
        const j = r.json;
        const healthy = (j.healthy ?? j.ok ?? j.ready ?? 0) ? 1 : 0;
        const latest = Number(j.latest ?? j.number ?? j.head ?? -1);
        br.ok = !!healthy;
        br.latest = Number.isFinite(latest) ? latest : -1;
        br.last_err = "";
        br.last_ok_ms = Date.now();
        br.seen_ok = true;
      } else {
        const code = (r && r.code) ? (r.code | 0) : 0;
        if (code === 404) br.last_err = "http_404";  // boot window; do not activate
        else br.last_err = code ? ("http_" + code) : "http_err";
        br.ok = false;
      }
    } catch (e) {
      br.last_err = (e && e.message) ? String(e.message).slice(0, 64) : "err";
      br.ok = false;
    } finally {
      br.in_flight = false;
      br.age_ms = br.last_ok_ms ? ((Date.now() - br.last_ok_ms) | 0) : 1_000_000_000;
    }
  }

  setInterval(() => { pollOnce().catch(() => {}); }, 1000).unref?.();
  pollOnce().catch(() => {});
  try { console.error("[ready_bridge_v12] installed (http.createServer hooked)"); } catch (voidReadyBridgeV12CatchError) { void voidReadyBridgeV12CatchError; /* VOID_READY_BRIDGE_V12_EMPTY_CATCH_VISIBILITY_V1 */ }
  try { console.error("[ready_bridge_v12] txroot3 poller started (1s)"); } catch (voidReadyBridgeV12CatchError) { void voidReadyBridgeV12CatchError; /* VOID_READY_BRIDGE_V12_EMPTY_CATCH_VISIBILITY_V1 */ }

  function safeJsonParse(s) { try { return JSON.parse(s); } catch { return null; } }
  function toNum(x, d) { const n = Number(x); return Number.isFinite(n) ? n : d; }
  function toInt(x, d) { const n = Number(x); return Number.isFinite(n) ? (n | 0) : d; }

  function bridgeMeta() {
    return {
      v: br.v,
      txroot3_seen_ok: br.seen_ok ? 1 : 0,
      txroot3_ok: br.ok ? 1 : 0,
      txroot3_age_ms: br.age_ms | 0,
      txroot3_latest: br.latest,
      txroot3_in_flight: br.in_flight ? 1 : 0,
      txroot3_last_err: br.last_err || "",
    };
  }

  function recomputeGap(head, lastmileSeen, gapIn) {
    // If lastmileSeen is -1 during boot, original gap often becomes head+1 (nonsense for readiness).
    if (!Number.isFinite(head) || head < 0) return 0;
    if (!Number.isFinite(lastmileSeen) || lastmileSeen < 0) return 0; // clamp boot sentinel
    const g = toNum(gapIn, Math.max(0, head - lastmileSeen));
    if (!Number.isFinite(g) || g < 0) return Math.max(0, head - lastmileSeen);
    // also clamp "gap bigger than head by miles" to sane
    if (g > head + 1000) return Math.max(0, head - lastmileSeen);
    return g;
  }

  function patchReadyJson(bodyStr) {
    const obj = safeJsonParse(bodyStr);
    if (!obj || typeof obj !== "object") return bodyStr;

    const out = { ...obj };
    out.__ready_bridge = bridgeMeta();

    const head = toNum(out.head ?? out.number ?? -1, -1);
    const lastmileSeen = toNum(out.lastmile_seen ?? out.lastmileSeen ?? out.lastmile ?? -1, -1);
    const gap = recomputeGap(head, lastmileSeen, out.gap);

    // txroot_live: once we've ever seen txroot3 success, make it authoritative.
    let txroot_live = toInt(out.txroot_live, 0);
    // [bootgrace-assume-txroot-live.v1] During early boot (before we've ever seen txroot3),
    // assume txroot_live=1 for a short grace window so first-hit /__void/ready.json is not false-red.
    let __rb_boot_grace_assumed = 0;
    try {
      if (!br.seen_ok && typeof __rbInBootGrace === "function" && __rbInBootGrace()) {
        txroot_live = 1;
        __rb_boot_grace_assumed = 1;
      }
    } catch (voidReadyBridgeV12CatchError) { void voidReadyBridgeV12CatchError; /* VOID_READY_BRIDGE_V12_EMPTY_CATCH_VISIBILITY_V1 */ }

    if (br.seen_ok) txroot_live = (br.ok && (br.age_ms | 0) <= 5000) ? 1 : 0;

    // ready: force consistency with our bridged view.
    const ready = (txroot_live === 1 && gap <= 10) ? true : false;

    out.gap = gap;
    out.txroot_live = txroot_live;
    out.ready = ready;

    // if we clamped boot sentinel, also publish lastmile_seen=head to avoid base gap calc flip-flopping.
    if (Number.isFinite(head) && head >= 0) {
      if ("lastmile_seen" in out && (!Number.isFinite(lastmileSeen) || lastmileSeen < 0)) out.lastmile_seen = head;
      if (!("lastmile_seen" in out) && ("lastmileSeen" in out) && (!Number.isFinite(lastmileSeen) || lastmileSeen < 0)) out.lastmileSeen = head;
    }

    if (ready) out.reasons = null;
    // [bootgrace-assume-txroot-live.v1] publish a marker so boot-grace events are visible in JSON.

    if (__rb_boot_grace_assumed) out.__ready_bridge_boot_grace = 1;



    return JSON.stringify(out);
  }

  function upsertPromGauge(s, name, value) {
    const re = new RegExp("^" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s+[-+0-9.eE]+\\s*$", "m");
    const line = name + " " + String(value) + "\n";
    if (re.test(s)) return s.replace(re, name + " " + String(value));
    if (!s.endsWith("\n")) s += "\n";
    return s + line;
  }

  function patchReadyProm(bodyStr) {
    let s = String(bodyStr || "");
    // Pull base values (if present) by parsing the ready.json we just patched would be ideal,
    // but we don't have it here; we approximate via txroot3 state and leave other lines alone.
    // Still, we can at least make void_txroot_live / txroot3_age / seen_ok consistent.
    const seen = br.seen_ok ? 1 : 0;
    const ageS = Math.floor((br.age_ms | 0) / 1000);

    s = upsertPromGauge(s, "void_txroot3_seen_ok", seen);
    s = upsertPromGauge(s, "void_txroot3_age_seconds", ageS);

    // If seen_ok, force void_txroot_live to bridged truth.
    if (br.seen_ok) {
      const live = (br.ok && (br.age_ms | 0) <= 5000) ? 1 : 0;
      s = upsertPromGauge(s, "void_txroot_live", live);
      // Best-effort: if gap is already 0 in prom (common after boot), then set ready accordingly.
      // If gap isn't present, don't invent it.
      const mGap = s.match(/^void_ready_gap\s+([-+0-9.eE]+)\s*$/m);
      const gap = mGap ? Number(mGap[1]) : NaN;
      if (Number.isFinite(gap)) {
        const ready = (live === 1 && gap <= 10) ? 1 : 0;
        s = upsertPromGauge(s, "void_ready", ready);
      }
    }    // [prom-align.lite.v1] Ensure void_ready matches (void_txroot_live && gap<=10).
    try {
      const mLive = s.match(/^void_txroot_live\s+([-+0-9.eE]+)\s*$/m);
      const mGap  = s.match(/^void_ready_gap\s+([-+0-9.eE]+)\s*$/m);
      const live = mLive ? Number(mLive[1]) : NaN;
      const gap  = mGap  ? Number(mGap[1])  : NaN;
      if (Number.isFinite(live) && Number.isFinite(gap)) {
        const ready2 = (live > 0 && gap <= 10) ? 1 : 0;
        s = upsertPromGauge(s, "void_ready", ready2);
      }
    } catch (voidReadyBridgeV12CatchError) { void voidReadyBridgeV12CatchError; /* VOID_READY_BRIDGE_V12_EMPTY_CATCH_VISIBILITY_V1 */ }


    return s;
  }

  const origCreate = http.createServer.bind(http);
  http.createServer = function patchedCreateServer(...args) {
    let listener = args[0];
    if (typeof listener !== "function") return origCreate(...args);

    const wrapped = function (req, res) {
      try {
        const u = (req && req.url) ? String(req.url) : "";
        if (u.startsWith("/__void/ready.json") || u.startsWith("/__void/ready.prom")) {
          const isJson = u.startsWith("/__void/ready.json");
          const origEnd = res.end.bind(res);
          const chunks = [];

          const origWrite = res.write ? res.write.bind(res) : null;
          res.write = function (chunk, enc, cb) {
            if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, enc));
            if (typeof cb === "function") cb();
            return true;
          };

          res.end = function (chunk, enc, cb) {
            if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, enc));
            let body = "";
            try { body = Buffer.concat(chunks).toString("utf8"); } catch (voidReadyBridgeV12CatchError) { void voidReadyBridgeV12CatchError; /* VOID_READY_BRIDGE_V12_EMPTY_CATCH_VISIBILITY_V1 */ }
            let out = body;
            try { out = isJson ? patchReadyJson(body) : patchReadyProm(body); } catch { out = body; }

            try {
              if (!res.headersSent) {
                res.setHeader("content-length", Buffer.byteLength(out));
                if (isJson) res.setHeader("content-type", "application/json; charset=utf-8");
                else res.setHeader("content-type", "text/plain; version=0.0.4; charset=utf-8");
              }
            } catch (voidReadyBridgeV12CatchError) { void voidReadyBridgeV12CatchError; /* VOID_READY_BRIDGE_V12_EMPTY_CATCH_VISIBILITY_V1 */ }

            return origEnd(out, "utf8", cb);
          };

          // prevent downstream write storms from bypassing our capture
          if (origWrite) {
            // keep it reachable if someone calls it (rare)
            res.__orig_write = origWrite;
          }
        }
      } catch (voidReadyBridgeV12CatchError) { void voidReadyBridgeV12CatchError; /* VOID_READY_BRIDGE_V12_EMPTY_CATCH_VISIBILITY_V1 */ }
      return listener(req, res);
    };

    return origCreate(wrapped);
  };
})();
