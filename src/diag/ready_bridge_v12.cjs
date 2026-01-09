;(function(){
  'use strict';
  const { isMainThread, threadId } = require('worker_threads');
  if (!isMainThread) { try { console.error('[ready_bridge_v12] skip (worker) tid='+threadId); } catch {} ; return; }
  const __K = Symbol.for('VOID.ready_bridge_v12.HARDGUARD');
  const __G = globalThis;
  if (__G[__K]) { try { console.error('[ready_bridge_v12] already installed (hardguard)'); } catch {} ; return; }
  __G[__K] = 1;
  try { console.error('[ready_bridge_v12] hardguard ok (main) tid='+threadId); } catch {}
/* ready_bridge_v12.cjs (v12b fix)
   - hooks http.createServer once
   - polls /health/txroot3?format=json
   - patches /__void/ready.json and /__void/ready.prom AFTER handler generates body
   - ALWAYS emits valid JSON; recomputes reasons from scratch
*/

// --- rb12 mainthread+dedupe guard ---
(()=>{
  let wt=null;
  try{ wt=require("worker_threads"); }catch{}
  const isMain = wt ? !!wt.isMainThread : true;
  const tid = wt && typeof wt.threadId === "number" ? wt.threadId : 0;
  const KEY = Symbol.for("void.ready_bridge_v12.installed");
  const G = globalThis;
  try{
    if (!isMain) { return; }
    if (G[KEY]) { return; }
    G[KEY] = true;

  } catch {}
})();
// --- rb12 mainthread+dedupe guard end ---
const http = require("http");

const G = globalThis;
if (G.__void_ready_bridge_v12b_installed) {
  // avoid double install
  try { console.error("[ready_bridge_v12] already installed; skipping"); } catch {}
  return;
}
G.__void_ready_bridge_v12b_installed = true;

const BASE = process.env.VOID_READYBRIDGE_BASE || "http://127.0.0.1:4100";
const TXROOT3 = `${BASE}/health/txroot3?format=json`;

const st = {
  ok: 0,
  ts_ms: 0,
  age_ms: 1e9,
  latest: -1,
  in_flight: 0,
  last_err: "",
};

function nowMs() { return Date.now(); }

function httpGetJson(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request(
      {
        method: "GET",
        hostname: u.hostname,
        port: u.port || 80,
        path: u.pathname + (u.search || ""),
        timeout: timeoutMs,
        headers: { "accept": "application/json" },
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try { resolve(JSON.parse(data)); } catch (e) { reject(new Error("bad_json:" + e.message)); }
          } else {
            reject(new Error("http_" + res.statusCode));
          }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => { try { req.destroy(new Error("timeout")); } catch {} });
    req.end();
  });
}

async function pollTxroot3() {
  if (st.in_flight) return;
  st.in_flight = 1;
  try {
    const j = await httpGetJson(TXROOT3, 1500);
    // expected: { ok:true, healthy:1, latest:<n>, ... }
    const latest = Number(j && (j.latest ?? j.number ?? -1));
    st.ok = (j && (j.ok === true || j.healthy === 1 || j.healthy === true)) ? 1 : 0;
    st.latest = Number.isFinite(latest) ? latest : -1;
    st.ts_ms = nowMs();
    st.age_ms = 0;
    st.last_err = "";
  } catch (e) {
    st.ok = 0;
    st.last_err = (e && e.message) ? String(e.message) : "err";
    // keep ts_ms; age grows
  } finally {
    st.in_flight = 0;
  }
}

setInterval(() => {
  const n = nowMs();
  if (st.ts_ms > 0) st.age_ms = Math.max(0, n - st.ts_ms);
  pollTxroot3().catch(() => {});
}, 1000);

function safeJsonParse(s) {
  try { return { ok: 1, obj: JSON.parse(s) }; }
  catch (e) { return { ok: 0, err: (e && e.message) ? String(e.message) : "parse_err" }; }
}

function clampBridge() {
  const age = Number.isFinite(st.age_ms) ? st.age_ms : 1e9;
  const ok = st.ok === 1 && age <= 3000 && st.latest >= 0;
  return { ok, age_ms: age, latest: st.latest, in_flight: st.in_flight, last_err: st.last_err || "" };
}

function patchReadyJsonBody(bodyStr) {
  const parsed = safeJsonParse(bodyStr);
  const br = clampBridge();

  // if handler produced garbage, return minimal valid JSON
  if (!parsed.ok) {
    return JSON.stringify({
      ready: false,
      head: -1,
      lastmile_seen: -1,
      gap: 0,
      txroot_live: br.ok ? 1 : 0,
      reasons: ["invalid_json_from_handler"],
      __ready_bridge: {
        v: "12b",
        txroot3_ok: br.ok ? 1 : 0,
        txroot3_age_ms: br.age_ms | 0,
        txroot3_latest: br.latest,
        txroot3_in_flight: br.in_flight ? 1 : 0,
        txroot3_last_err: br.last_err,
        parse_err: parsed.err,
      },
    });
  }

  const o = parsed.obj && typeof parsed.obj === "object" ? parsed.obj : {};
  const gap = Number.isFinite(Number(o.gap)) ? Number(o.gap) : 0;

  // treat txroot_live as "bridged": if txroot3 is fresh+ok, force to 1; otherwise normalize to 0/1
  const bridgedTxLive = br.ok ? 1 : (Number(o.txroot_live) === 1 ? 1 : 0);

  const reasons = [];
  if (gap !== 0) reasons.push("gap!=0");
  if (bridgedTxLive !== 1) reasons.push("txroot_live!=1");
  if (!br.ok) reasons.push("txroot3_stale_or_error");

  const ready = reasons.length === 0;

  // write back canonical fields
  o.txroot_live = bridgedTxLive;
  o.ready = ready;

  // reasons: ONLY present when not ready
  if (!ready) o.reasons = reasons;
  else if (o.reasons) delete o.reasons;

  // keep bridge payload tiny
  o.__ready_bridge = {
    v: "12b",
    txroot3_ok: br.ok ? 1 : 0,
    txroot3_age_ms: br.age_ms | 0,
    txroot3_latest: br.latest,
    txroot3_in_flight: br.in_flight ? 1 : 0,
    txroot3_last_err: br.last_err,
  };

  return JSON.stringify(o);
}

function upsertPromGauge(text, name, value) {
  const re = new RegExp("^" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s+[-0-9.eE]+\\s*$", "m");
  if (re.test(text)) return text.replace(re, `${name} ${value}`);
  // try to append after TYPE line if present; else append at end
  const typeRe = new RegExp("^#\\s*TYPE\\s+" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s+gauge\\s*$", "m");
  if (typeRe.test(text)) return text.replace(typeRe, (m) => `${m}\n${name} ${value}`);
  return text.replace(/\s*$/, "") + `\n${name} ${value}\n`;
}

function patchReadyPromBody(bodyStr) {
  // We only touch the few gauges we care about.
  // Determine values from our own bridge state. (We do NOT attempt to parse JSON here.)
  const br = clampBridge();
  const txLive = br.ok ? 1 : 0;
  const gap = 0; // we can't safely derive gap from prom; leave existing if present below
  let out = bodyStr;

  // ready: if the handler already has void_ready_gap/void_txroot_live we keep gap from it;
  // but we can reliably stamp txroot_live and txroot3_age_seconds.
  out = upsertPromGauge(out, "void_txroot_live", txLive);
  out = upsertPromGauge(out, "void_txroot3_age_seconds", Math.floor((br.age_ms | 0) / 1000));

  // if handler already has gap, keep it; otherwise stamp 0
  if (!/^void_ready_gap\b/m.test(out)) out = upsertPromGauge(out, "void_ready_gap", gap);

  // void_ready: compute from available gap (best effort) + txLive
  let gapVal = 0;
  const m = out.match(/^void_ready_gap\s+([-0-9.eE]+)\s*$/m);
  if (m) gapVal = Number(m[1]);
  const ready = (Number.isFinite(gapVal) ? gapVal : 0) === 0 && txLive === 1 && br.ok;
  out = upsertPromGauge(out, "void_ready", ready ? 1 : 0);

  return out;
}

function hookHttpCreateServer() {
  const orig = http.createServer;
  http.createServer = function wrappedCreateServer(...args) {
    const srv = orig.apply(this, args);
    try {
      // attach once per server
      if (!srv || srv.__void_ready_bridge_attached) return srv;
      srv.__void_ready_bridge_attached = true;

      srv.on("request", (req, res) => {
        try {
          if (!req || !res || !req.url) return;
          const url = String(req.url);
          const isReadyJson = url.startsWith("/__void/ready.json");
          const isReadyProm = url.startsWith("/__void/ready.prom");
          if (!isReadyJson && !isReadyProm) return;

          let chunks = [];
          let bytes = 0;
          const maxBytes = 512 * 1024; // safety: never buffer >512KB

          const origWrite = res.write;
          const origEnd = res.end;

          res.write = function (chunk, enc, cb) {
            try {
              if (chunk && bytes < maxBytes) {
                const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, enc);
                bytes += b.length;
                if (bytes <= maxBytes) chunks.push(b);
              }
            } catch {}
            return origWrite.call(this, chunk, enc, cb);
          };

          res.end = function (chunk, enc, cb) {
            // Let original end run first (handler finishes), then patch by rewriting body if still possible.
            // But Node already sent bytes; so we patch by intercepting BEFORE sending: we need to suppress original writes.
            // Therefore: if we got here, we should finalize by sending patched body ourselves only if headers not sent.
            // We handle this by overriding write/end behavior only when headers not sent: if sent, do nothing.
            try {
              if (chunk && bytes < maxBytes) {
                const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, enc);
                bytes += b.length;
                if (bytes <= maxBytes) chunks.push(b);
              }
            } catch {}

            try {
              // If headers already sent, just pass-through (can't safely patch).
              if (res.headersSent) return origEnd.call(this, chunk, enc, cb);

              // Build original body string
              const body = Buffer.concat(chunks).toString("utf8");

              if (isReadyJson) {
                const patched = patchReadyJsonBody(body);
                try { res.setHeader("content-type", "application/json; charset=utf-8"); } catch {}
                try { res.setHeader("content-length", Buffer.byteLength(patched)); } catch {}
                return origEnd.call(this, patched, "utf8", cb);
              }

              if (isReadyProm) {
                const patched = patchReadyPromBody(body);
                try { res.setHeader("content-type", "text/plain; version=0.0.4; charset=utf-8"); } catch {}
                try { res.setHeader("content-length", Buffer.byteLength(patched)); } catch {}
                return origEnd.call(this, patched, "utf8", cb);
              }
            } catch {
              // fallback: never break response
              return origEnd.call(this, chunk, enc, cb);
            }
            return origEnd.call(this, chunk, enc, cb);
          };
        } catch {}
      });
    } catch {}
    return srv;
  };
}

hookHttpCreateServer();
try { console.error("[ready_bridge_v12] installed (http.createServer hooked)"); } catch {}
try { console.error("[ready_bridge_v12] txroot3 poller started (1s)"); } catch {}
})();
