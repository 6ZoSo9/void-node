/* datanet_receipts_real_v1.cjs (v1.10)
   - Publish: capture JSON response; ok from body.ok when present; id from body.id.
   - Fetch: id from URL; ok from body.ok when JSON (fetch returns JSON).
   - If who missing => ok=0, wc=0, reason2=missing_who (even if status 200).
   Adds WC calc + per-who per-minute budget. Never throws.
*/
(function(){
  const fs = require("fs");
  const http = require("http");
  const path = require("path");

  const VOID_DATANET_RECEIPTS_REAL_V1_EMPTY_CATCH_VISIBILITY_V1_MARKER = "VOID_DATANET_RECEIPTS_REAL_V1_EMPTY_CATCH_VISIBILITY_V1";
  function recordVoidDataNetReceiptsRealV1EmptyCatchVisibilityV1(site, err) {
    try {
      const g = globalThis;
      const key = "__void_datanet_receipts_real_v1_empty_catch_visibility_v1";
      const bucket = Array.isArray(g[key]) ? g[key] : [];
      bucket.push({ marker: VOID_DATANET_RECEIPTS_REAL_V1_EMPTY_CATCH_VISIBILITY_V1_MARKER, site: String(site || "unknown"), message: err && err.message ? String(err.message) : String(err || "") });
      while (bucket.length > 50) bucket.shift();
      g[key] = bucket;
    } catch (_visibilityRecordErr) {
      /* VOID_DATANET_RECEIPTS_REAL_V1_EMPTY_CATCH_VISIBILITY_V1_RECORD_FAILURE_SUPPRESSED */
    }
  }

  function nowMs(){ return Date.now(); }
  function safeStr(x){ try { return (x===undefined||x===null) ? "" : String(x); } catch { return ""; } }
  function safeNum(x, d=0){ try { const n=Number(x); return Number.isFinite(n)?n:d; } catch { return d; } }

  function getWho(req){
    try {
      const h = req && req.headers ? (req.headers["x-void-who"] || req.headers["x-VOID-who"] || req.headers["x-void-WHO"]) : "";
      const q = req && req.query ? (req.query.who || req.query.WHO) : "";
      // fallback: parse who from URL query string (finish-time may not have req.query populated)
      let q2 = "";
      try {
        const u0 = (req && (req.originalUrl || req.url)) ? String(req.originalUrl || req.url) : "";
        if (u0 && u0.indexOf("?") >= 0) {
          const qs = u0.split("?").slice(1).join("?");
          const m = qs.match(/(?:^|&)(?:who|WHO)=([^&]*)/);
          if (m && m[1] != null) q2 = decodeURIComponent(String(m[1]).replace(/\+/g, "%20"));
        }
      } catch (whoQueryParseErr) { recordVoidDataNetReceiptsRealV1EmptyCatchVisibilityV1("VOID_DATANET_RECEIPTS_REAL_V1_EMPTY_CATCH_VISIBILITY_V1_SITE_WHO_QUERY_PARSE", whoQueryParseErr); }

      const pick = h || q || q2 || "";
      return safeStr(pick).trim();
    } catch { return ""; }
  }

  function getFile(){
    try { return safeStr(process.env.DATANET_RECEIPTS_FILE || "").trim(); } catch { return ""; }
  }

  const WC_PER_KIB = safeNum(process.env.DATANET_WC_PER_KIB, 1);
  const WC_CAP_PUBLISH = safeNum(process.env.DATANET_WC_CAP_PUBLISH, 64);
  const WC_CAP_FETCH   = safeNum(process.env.DATANET_WC_CAP_FETCH,   16);
  const WC_BUDGET_PER_MIN = safeNum(process.env.DATANET_WC_BUDGET_PER_MIN, 120);

  function wcFromBytes(bytes, cap){
    try {
      const b = Math.max(0, safeNum(bytes, 0));
      let wc = Math.ceil(b / 1024) * WC_PER_KIB;
      wc = Math.max(1, wc);
      wc = Math.min(cap, wc);
      wc = Math.max(0, Math.floor(wc));
      return wc;
    } catch { return 0; }
  }

  const buckets = new Map();
  function budgetAllow(who, want){
    try {
      if (!who) return { ok:false, granted:0, reason2:"missing_who" };
      const m = Math.floor(nowMs() / 60000);
      let b = buckets.get(who);
      if (!b || b.m !== m) b = { m, used:0 };
      const remaining = Math.max(0, WC_BUDGET_PER_MIN - b.used);
      const granted = Math.min(Math.max(0, want|0), remaining);
      b.used += granted;
      buckets.set(who, b);
      if (granted <= 0) return { ok:false, granted:0, reason2:"wc_budget" };
      if (granted < want) return { ok:true, granted, reason2:"wc_capped_budget" };
      return { ok:true, granted, reason2:"" };
    } catch { return { ok:false, granted:0, reason2:"budget_err" }; }
  }

  function append(line){
    try {
      const file = getFile();
      if (!file) return false;
      fs.mkdirSync(path.dirname(file), { recursive:true });
      fs.appendFileSync(file, JSON.stringify(line) + "\n");
      return true;
    } catch { return false; }
  }

  function classify(req){
    try {
      const url = safeStr(req && (req.originalUrl || req.url) || "");
      if (url.startsWith("/datanet/v1/publish")) return "datanet_mvp_publish";
      if (url.startsWith("/datanet/v1/fetch/"))  return "datanet_mvp_fetch";
      return "";
    } catch { return ""; }
  }

  function fetchIdFromUrl(req){
    try {
      const u = safeStr(req.originalUrl || req.url || "");
      const m = u.match(/^\/datanet\/v1\/fetch\/([0-9a-f]{8,})/i);
      return m ? safeStr(m[1]).trim() : "";
    } catch { return ""; }
  }

  function parseJsonMaybe(bodyStr){
    try {
      if (!bodyStr || typeof bodyStr !== "string") return null;
      if (bodyStr.length < 2) return null;
      if (bodyStr[0] !== '{' && bodyStr[0] !== '[') return null;
      return JSON.parse(bodyStr);
    } catch { return null; }
  }

  if (!globalThis.__void_datanet_receipts_real_v110__) {
    globalThis.__void_datanet_receipts_real_v110__ = true;

    const origEmit = http.Server.prototype.emit;
    http.Server.prototype.emit = function(ev, req, res){
      try {
        if (ev === "request" && req && res && !req.__void_dn_receipts_v110) {
          req.__void_dn_receipts_v110 = 1;

          const op = classify(req);
          if (op) {
            const t0 = nowMs();
            const who = getWho(req);

            let bytesOut = 0;
            let bodyBufs = [];
            let bodyBytes = 0;
            const BODY_MAX = 32 * 1024; // publish+fetch JSON is tiny; keep cap

            const _write = res.write;
            const _end   = res.end;

            res.write = function(chunk, enc, cb){
              try {
                if (chunk) {
                  const n = Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(String(chunk), enc||"utf8");
                  bytesOut += n;
                  if (bodyBytes < BODY_MAX) {
                    const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), enc||"utf8");
                    const take = Math.min(BODY_MAX - bodyBytes, b.length);
                    if (take > 0) { bodyBufs.push(b.subarray(0, take)); bodyBytes += take; }
                  }
                }
              } catch (writeCaptureErr) { recordVoidDataNetReceiptsRealV1EmptyCatchVisibilityV1("VOID_DATANET_RECEIPTS_REAL_V1_EMPTY_CATCH_VISIBILITY_V1_SITE_WRITE_CAPTURE", writeCaptureErr); }
              return _write.apply(this, arguments);
            };

            res.end = function(chunk, enc, cb){
              try {
                if (chunk) {
                  const n = Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(String(chunk), enc||"utf8");
                  bytesOut += n;
                  if (bodyBytes < BODY_MAX) {
                    const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), enc||"utf8");
                    const take = Math.min(BODY_MAX - bodyBytes, b.length);
                    if (take > 0) { bodyBufs.push(b.subarray(0, take)); bodyBytes += take; }
                  }
                }
              } catch (endCaptureErr) { recordVoidDataNetReceiptsRealV1EmptyCatchVisibilityV1("VOID_DATANET_RECEIPTS_REAL_V1_EMPTY_CATCH_VISIBILITY_V1_SITE_END_CAPTURE", endCaptureErr); }
              return _end.apply(this, arguments);
            };

            res.once("finish", function(){
              try {
                const status = safeNum(res.statusCode, 0);
                const bodyStr = Buffer.concat(bodyBufs).toString("utf8");
                const j = parseJsonMaybe(bodyStr);

                // default ok from status
                let ok = (status >= 200 && status < 400) ? 1 : 0;

                // if JSON has ok, trust it
                if (j && typeof j === "object" && j.ok !== undefined) {
                  ok = (j.ok === true || j.ok === 1 || j.ok === "1") ? 1 : 0;
                }

                // force missing_who to be a denial (you want this)
                let reason2 = "";
                if (!who) {
                  ok = 0;
                  reason2 = "missing_who";
                }

                let id = "";
                if (op === "datanet_mvp_fetch") {
                  id = fetchIdFromUrl(req);
                  if (j && typeof j === "object") {
                    const bid = safeStr(j.id || "").trim();
                    if (bid) id = bid;
                  }
                } else if (op === "datanet_mvp_publish") {
                  if (j && typeof j === "object") id = safeStr(j.id || "").trim();
                }

                let wc = 0;
                if (ok === 1) {
                  const cap = (op === "datanet_mvp_publish") ? WC_CAP_PUBLISH : WC_CAP_FETCH;
                  const want = wcFromBytes(bytesOut, cap);
                  const r = budgetAllow(who, want);
                  wc = r.granted;
                  reason2 = reason2 || r.reason2 || "";
                  if (wc <= 0) ok = 0; // don’t log ok=1 if budget granted 0
                } else {
                  reason2 = reason2 || (j && typeof j === "object" && j.detail ? safeStr(j.detail).slice(0,120) : ("http_" + String(status || 0)));
                }

                append({
                  ts_ms: nowMs(),
                  ts: Math.floor(nowMs()/1000),
                  ok,
                  who: safeStr(who),
                  op,
                  id,
                  bytes: bytesOut,
                  wc,
                  status,
                  ms: Math.max(0, nowMs() - t0),
                  method: safeStr(req.method),
                  url: safeStr(req.originalUrl || req.url),
                  reason2
                });
              } catch (finishReceiptErr) { recordVoidDataNetReceiptsRealV1EmptyCatchVisibilityV1("VOID_DATANET_RECEIPTS_REAL_V1_EMPTY_CATCH_VISIBILITY_V1_SITE_FINISH_RECEIPT", finishReceiptErr); }
            });
          }
        }
      } catch (requestWrapErr) { recordVoidDataNetReceiptsRealV1EmptyCatchVisibilityV1("VOID_DATANET_RECEIPTS_REAL_V1_EMPTY_CATCH_VISIBILITY_V1_SITE_REQUEST_WRAP", requestWrapErr); }
      return origEmit.apply(this, arguments);
    };

    try { console.error("[datanet.receipts_real.v1.10] installed (ok from body, missing_who->deny)"); } catch (installedLogErr) { recordVoidDataNetReceiptsRealV1EmptyCatchVisibilityV1("VOID_DATANET_RECEIPTS_REAL_V1_EMPTY_CATCH_VISIBILITY_V1_SITE_INSTALLED_LOG", installedLogErr); }
  }
})();
