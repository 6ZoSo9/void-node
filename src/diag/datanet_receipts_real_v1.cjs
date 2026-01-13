/* datanet_receipts_real_v1.cjs (rewrite v1)
   Goals:
   - Attach safely WITHOUT touching src/index.ts (no fragile patching).
   - Wait until (globalThis).__void_http_app exists, then mount once.
   - POST alias: /datanet/v1/receipts -> /datanet/v1/receipt
   - Persistent exporter: /datanet/v1/metrics/receipts.persist.(prom|json) reads jsonl each scrape
   - Optional enforcement (light): if DATANET_RECEIPTS_REQUIRE_WHO=1 then missing who => 400 + append ok:0 line
*/
const fs = require("fs");
const path = require("path");

function nowMs(){ return Date.now(); }
function safeJson(x){ try { return JSON.stringify(x); } catch { return "{}"; } }

function resolveReceiptsFile() {
  if (process.env.DATANET_RECEIPTS_FILE) return process.env.DATANET_RECEIPTS_FILE;
  const cwd = process.cwd();
  const dataDir = process.env.DATA_DIR || "data_a";
  const base = path.isAbsolute(dataDir) ? dataDir : path.join(cwd, dataDir);
  return path.join(base, "datanet", "receipts", "datanet.jsonl");
}

function ensureDirForFile(f){
  try { fs.mkdirSync(path.dirname(f), { recursive: true }); } catch {}
}

function appendJsonlLine(file, obj){
  try {
    ensureDirForFile(file);
    fs.appendFileSync(file, safeJson(obj) + "\n");
  } catch {}
}

function parseJsonlCounters(file){
  const out = {
    total: 0,
    ok_total: 0,
    bad_total: 0,
    bytes_total: 0,
    wc_total: 0,
    denied_total: 0,
    denied_missing_who_total: 0,
    last_ts_ms: 0,
  };
  let s = "";
  try { s = fs.readFileSync(file, "utf8"); } catch { return out; }
  const lines = s.split("\n");
  for (const line of lines) {
    if (!line) continue;
    out.total++;
    let j;
    try { j = JSON.parse(line); } catch { out.bad_total++; continue; }
    const ok = Number(j.ok) === 1;
    if (ok) out.ok_total++; else out.denied_total++;
    if (!ok && String(j.reason||"") === "missing_who") out.denied_missing_who_total++;
    const b = Number(j.bytes);
    const wc = Number(j.wc_award);
    if (Number.isFinite(b) && b > 0) out.bytes_total += b;
    if (Number.isFinite(wc) && wc > 0) out.wc_total += wc;
    const ts = Number(j.ts_ms);
    if (Number.isFinite(ts) && ts > out.last_ts_ms) out.last_ts_ms = ts;
  }
  out.bad_total = out.total - out.ok_total - out.denied_total; // strict “bad parse” already counted; keep simple
  return out;
}

function promEscapeLabelValue(s){
  return String(s).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/"/g, '\\"');
}

function toProm(c){
  const ageSec = c.last_ts_ms > 0 ? Math.max(0, (nowMs() - c.last_ts_ms)/1000) : 1e12;
  return [
    "# HELP void_datanet_receipts_total DataNet receipts total (derived from jsonl)",
    "# TYPE void_datanet_receipts_total counter",
    `void_datanet_receipts_total ${c.total}`,
    "# HELP void_datanet_receipts_ok_total DataNet receipts ok total (derived from jsonl)",
    "# TYPE void_datanet_receipts_ok_total counter",
    `void_datanet_receipts_ok_total ${c.ok_total}`,
    "# HELP void_datanet_receipts_bad_total DataNet receipts bad/invalid total (derived from jsonl)",
    "# TYPE void_datanet_receipts_bad_total counter",
    `void_datanet_receipts_bad_total ${Math.max(0, c.bad_total)}`,
    "# HELP void_datanet_receipts_bytes_total Total bytes recorded from receipts (derived from jsonl)",
    "# TYPE void_datanet_receipts_bytes_total counter",
    `void_datanet_receipts_bytes_total ${c.bytes_total}`,
    "# HELP void_datanet_receipts_wc_total Total WC awarded (derived from jsonl)",
    "# TYPE void_datanet_receipts_wc_total counter",
    `void_datanet_receipts_wc_total ${c.wc_total}`,
    "# HELP void_datanet_receipts_last_ts_ms Last receipt timestamp (ms) seen in jsonl",
    "# TYPE void_datanet_receipts_last_ts_ms gauge",
    `void_datanet_receipts_last_ts_ms ${c.last_ts_ms || 0}`,
    "# HELP void_datanet_receipts_age_seconds Age in seconds since last receipt in jsonl",
    "# TYPE void_datanet_receipts_age_seconds gauge",
    `void_datanet_receipts_age_seconds ${ageSec}`,
    "# HELP void_datanet_receipts_denied_total Denied receipts total (ok:0 lines)",
    "# TYPE void_datanet_receipts_denied_total counter",
    `void_datanet_receipts_denied_total ${c.denied_total}`,
    "# HELP void_datanet_receipts_denied_missing_who_total Denied receipts missing who",
    "# TYPE void_datanet_receipts_denied_missing_who_total counter",
    `void_datanet_receipts_denied_missing_who_total ${c.denied_missing_who_total}`,
    "",
  ].join("\n");
}

function attachOnce(){
  const G = globalThis;
  if (G.__void_datanet_receipts_preload_rewrite_v1) return true;

  const app = G.__void_http_app;
  if (!app) return false;

  G.__void_datanet_receipts_preload_rewrite_v1 = true;

  const receiptsFile = resolveReceiptsFile();

  // (A) POST alias middleware (rewrite BEFORE routing)
  try {
    app.use(function datanetReceiptAlias(req, _res, next){
      try {
        const m = String(req && req.method || "");
        if (m !== "POST") return next();
        const u = String(req && req.url || "");
        if (u === "/datanet/v1/receipts" || u.startsWith("/datanet/v1/receipts?")) {
          req.url = u.replace("/datanet/v1/receipts", "/datanet/v1/receipt");
        }
      } catch {}
      return next();
    });
  } catch {}

  // (B) Optional enforcement shim: require who (does NOT try to fully revalidate receipt)
  // Important: mounted early so it runs before the real route handler.
  try {
    app.use("/datanet/v1/receipt", function datanetReceiptEnforce(req, res, next){
      try {
        const m = String(req && req.method || "");
        if (m !== "POST") return next();

        const requireWho = String(process.env.DATANET_RECEIPTS_REQUIRE_WHO || "0") === "1";
        if (!requireWho) return next();

        const body = (req && req.body) || {};
        const who = String(body.who || "");
        if (!who.trim()) {
          // append deny line so metrics reflect it
          appendJsonlLine(receiptsFile, {
            ts_ms: nowMs(),
            ok: 0,
            reason: "missing_who",
            id: String(body.id || ""),
            root: String(body.root || ""),
            leaf: String(body.leaf || ""),
            index: Number(body.index || 0) || 0,
            bytes: Number(body.bytes || 0) || 0,
            who: "",
            wc_award: 0,
          });
          res.status(400).json({ ok:false, err:"missing_who" });
          return;
        }
      } catch {}
      return next();
    });
  } catch {}

  // (C) Persistent exporter (reads jsonl each scrape)
  try {
    app.get("/datanet/v1/metrics/receipts.persist.prom", function(_req, res){
      const c = parseJsonlCounters(receiptsFile);
      res.setHeader("content-type", "text/plain; version=0.0.4; charset=utf-8");
      res.status(200).send(toProm(c));
    });
    app.get("/datanet/v1/metrics/receipts.persist.json", function(_req, res){
      const c = parseJsonlCounters(receiptsFile);
      res.status(200).json({ ok:true, file: receiptsFile, counters: c, ts_ms: nowMs() });
    });
  } catch {}

  try { console.error("[datanet.receipts.preload.rewrite.v1] attached: alias + persist exporter + require_who shim"); } catch {}
  return true;
}

// Try immediately, then poll briefly until app exists.
(function boot(){
  if (attachOnce()) return;
  let tries = 0;
  const maxTries = 240; // ~60s at 250ms
  const t = setInterval(() => {
    tries++;
    if (attachOnce()) { clearInterval(t); return; }
    if (tries >= maxTries) { clearInterval(t); return; }
  }, 250);
})();
