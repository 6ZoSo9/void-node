/* datanet_receipts_persist_wrap_fetch_v4_finalrunner_quiet.cjs  (SAFE v1)
   Goal: never wedge HTTP (event-loop starvation) while still allowing lightweight fetch logging.
   Changes:
   - NO background runner / polling.
   - Wrap global fetch ONLY; no response body reads, no JSON.parse.
   - Async append queue with caps; drops on overload.
*/
"use strict";

const fs = require("fs");
const path = require("path");

const VOID_DATANET_RECEIPTS_PERSIST_WRAP_FETCH_V4_FINALRUNNER_QUIET_EMPTY_CATCH_VISIBILITY_V1_MARKER = "VOID_DATANET_RECEIPTS_PERSIST_WRAP_FETCH_V4_FINALRUNNER_QUIET_EMPTY_CATCH_VISIBILITY_V1";
function recordVoidDataNetReceiptsPersistWrapFetchV4FinalrunnerQuietEmptyCatchVisibilityV1(site, err) {
  try {
    const g = globalThis;
    const key = "__void_datanet_receipts_persist_wrap_fetch_v4_finalrunner_quiet_empty_catch_visibility_v1";
    const bucket = Array.isArray(g[key]) ? g[key] : [];
    bucket.push({ marker: VOID_DATANET_RECEIPTS_PERSIST_WRAP_FETCH_V4_FINALRUNNER_QUIET_EMPTY_CATCH_VISIBILITY_V1_MARKER, site: String(site || "unknown"), message: err && err.message ? String(err.message) : String(err || "") });
    while (bucket.length > 50) bucket.shift();
    g[key] = bucket;
  } catch (_visibilityRecordErr) {
    /* VOID_DATANET_RECEIPTS_PERSIST_WRAP_FETCH_V4_FINALRUNNER_QUIET_EMPTY_CATCH_VISIBILITY_V1_RECORD_FAILURE_SUPPRESSED */
  }
}

(function install() {
  const G = globalThis;
  if (G.__void_wrap_fetch_v4_safe_v1_installed) return;
  G.__void_wrap_fetch_v4_safe_v1_installed = true;

  const origFetch = G.fetch;
  if (typeof origFetch !== "function") {
    try { console.error("[wrap_fetch_v4_safe_v1] no global fetch; skipping"); } catch (noFetchLogErr) { recordVoidDataNetReceiptsPersistWrapFetchV4FinalrunnerQuietEmptyCatchVisibilityV1("VOID_DATANET_RECEIPTS_PERSIST_WRAP_FETCH_V4_FINALRUNNER_QUIET_EMPTY_CATCH_VISIBILITY_V1_SITE_NO_FETCH_LOG", noFetchLogErr); }
    return;
  }

  const dataDir = process.env.DATA_DIR || process.env.VOID_DATA_DIR || "";
  const receiptsFile =
    process.env.VOID_DATANET_RECEIPTS_FILE ||
    (dataDir ? path.join(dataDir, "datanet", "receipts", "datanet.jsonl") : "");

  // best-effort ensure parent dir exists
  try {
    if (receiptsFile) fs.mkdirSync(path.dirname(receiptsFile), { recursive: true });
  } catch (mkdirErr) { recordVoidDataNetReceiptsPersistWrapFetchV4FinalrunnerQuietEmptyCatchVisibilityV1("VOID_DATANET_RECEIPTS_PERSIST_WRAP_FETCH_V4_FINALRUNNER_QUIET_EMPTY_CATCH_VISIBILITY_V1_SITE_MKDIR", mkdirErr); }

  // async append queue (never appendFileSync)
  const q = [];
  let flushing = false;
  let dropped = 0;

  async function flush() {
    if (flushing) return;
    flushing = true;
    try {
      if (!receiptsFile) return;
      if (q.length === 0) return;
      const chunk = q.splice(0, 200).join("");
      await fs.promises.appendFile(receiptsFile, chunk, "utf8");
    } catch (e) {
      try { console.error("[wrap_fetch_v4_safe_v1] append failed:", (e && e.message) ? e.message : e); } catch (appendLogErr) { recordVoidDataNetReceiptsPersistWrapFetchV4FinalrunnerQuietEmptyCatchVisibilityV1("VOID_DATANET_RECEIPTS_PERSIST_WRAP_FETCH_V4_FINALRUNNER_QUIET_EMPTY_CATCH_VISIBILITY_V1_SITE_APPEND_LOG", appendLogErr); }
    } finally {
      flushing = false;
    }
  }

  setInterval(() => { flush().catch(()=>{}); }, 250).unref?.();

  function enqueue(obj) {
    try {
      const line = JSON.stringify(obj) + "\n";
      // hard cap: 10k pending lines
      if (q.length >= 10000) { dropped++; return; }
      q.push(line);
    } catch (enqueueErr) { recordVoidDataNetReceiptsPersistWrapFetchV4FinalrunnerQuietEmptyCatchVisibilityV1("VOID_DATANET_RECEIPTS_PERSIST_WRAP_FETCH_V4_FINALRUNNER_QUIET_EMPTY_CATCH_VISIBILITY_V1_SITE_ENQUEUE", enqueueErr); }
  }

  function safeWhoFromHeaders(h) {
    try {
      if (!h) return null;
      const k = (name) => {
        if (typeof h.get === "function") return h.get(name) || h.get(name.toLowerCase());
        if (typeof h === "object") return h[name] || h[name.toLowerCase()];
        return null;
      };
      return k("x-void-who") || k("x-void-agent") || k("x-who") || null;
    } catch { return null; }
  }

  function safePath(u) {
    try {
      const U = new URL(u, "http://localhost");
      return { path: U.pathname || "", qs: U.search || "" };
    } catch {
      return { path: String(u || ""), qs: "" };
    }
  }

  // Wrap fetch (lightweight)
  G.fetch = async function wrappedFetch(input, init) {
    const t0 = Date.now();
    let url = "";
    let method = "GET";
    let headers = null;

    try {
      if (typeof input === "string") url = input;
      else if (input && typeof input.url === "string") url = input.url;
      else url = String(input || "");

      if (init && init.method) method = String(init.method).toUpperCase();
      else if (input && input.method) method = String(input.method).toUpperCase();

      headers = (init && init.headers) ? init.headers : (input && input.headers) ? input.headers : null;
    } catch (fetchInputParseErr) { recordVoidDataNetReceiptsPersistWrapFetchV4FinalrunnerQuietEmptyCatchVisibilityV1("VOID_DATANET_RECEIPTS_PERSIST_WRAP_FETCH_V4_FINALRUNNER_QUIET_EMPTY_CATCH_VISIBILITY_V1_SITE_FETCH_INPUT_PARSE", fetchInputParseErr); }

    const { path: p } = safePath(url);

    // only care about datanet fetch surfaces
    const isDatanetFetch = typeof p === "string" && /\/datanet\/v1\/fetch\b/.test(p);
    const who = safeWhoFromHeaders(headers);

    let res;
    try {
      res = await origFetch.apply(this, arguments);
    } catch (e) {
      if (isDatanetFetch) {
        enqueue({
          ts_ms: Date.now(),
          ts: Math.floor(Date.now()/1000),
          ok: 0,
          op: "datanet_fetch_http",
          who: who || "unknown",
          method,
          path: p,
          status: -1,
          ms: Date.now() - t0,
          err: (e && e.message) ? String(e.message).slice(0, 200) : "fetch_error"
        });
      }
      throw e;
    }

    if (isDatanetFetch) {
      const st = (res && typeof res.status === "number") ? res.status : 0;
      // schedule enqueue off the critical path
      setImmediate(() => {
        enqueue({
          ts_ms: Date.now(),
          ts: Math.floor(Date.now()/1000),
          ok: (st >= 200 && st < 400) ? 1 : 0,
          op: "datanet_fetch_http",
          who: who || "unknown",
          method,
          path: p,
          status: st,
          ms: Date.now() - t0,
          dropped
        });
      });
    }

    return res;
  };

  try {
    console.error("[wrap_fetch_v4_safe_v1] installed (lightweight). file=" + (receiptsFile || "<none>"));
  } catch (installedLogErr) { recordVoidDataNetReceiptsPersistWrapFetchV4FinalrunnerQuietEmptyCatchVisibilityV1("VOID_DATANET_RECEIPTS_PERSIST_WRAP_FETCH_V4_FINALRUNNER_QUIET_EMPTY_CATCH_VISIBILITY_V1_SITE_INSTALLED_LOG", installedLogErr); }
})();
