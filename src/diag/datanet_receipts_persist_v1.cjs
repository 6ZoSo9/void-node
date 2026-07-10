/* datanet_receipts_persist_v1.cjs
   Exposes persisted totals from DATANET_RECEIPTS_FILE via an incremental tail scanner.
   Endpoint: GET /datanet/v1/metrics/receipts.persist.prom
*/
const fs = require("fs");
const path = require("path");

function getApp() {
  const g = globalThis;
  return g.__void_http_app || g.__void_app || null;
}

function receiptsFile() {
  const f = process.env.DATANET_RECEIPTS_FILE;
  if (f && String(f).trim()) return String(f).trim();
  // fallback: DATA_DIR/datanet/receipts/datanet.jsonl
  const dd = process.env.DATA_DIR || path.join(process.env.HOME || ".", "dev/void-node/data_a");
  return path.join(dd, "datanet/receipts/datanet.jsonl");
}

function promLine(k, v, labels) {
  if (!labels) return `${k} ${v}\n`;
  const parts = Object.entries(labels).map(([a,b]) => `${a}="${String(b).replace(/\\/g,"\\\\").replace(/"/g,'\\"')}"`);
  return `${k}{${parts.join(",")}} ${v}\n`;
}

function nowMs() { return Date.now(); }

const G = globalThis;
if (G.__void_datanet_receipts_persist_v1) process.exit(0);
G.__void_datanet_receipts_persist_v1 = true;

// incremental state
let st = {
  file: "",
  ino: 0,
  pos: 0,
  buf: "",
  totals: {
    lines: 0,
    ok: 0,
    bad: 0,
    bytes: 0,
    wc: 0,
    parse_err: 0,
    last_any_ts_ms: 0,
    last_ok_ts_ms: 0,
  },
  last_scan_ms: 0,
};

function resetFor(file, ino) {
  st.file = file;
  st.ino = ino;
  st.pos = 0;
  st.buf = "";
  st.totals = { lines:0, ok:0, bad:0, bytes:0, wc:0, parse_err:0, last_any_ts_ms:0, last_ok_ts_ms:0 };
}

function absorbLine(line) {
  if (!line) return;
  st.totals.lines++;
  let o;
  try { o = JSON.parse(line); } catch { st.totals.parse_err++; return; }
  const ts = Number(o.ts_ms || 0) || 0;
  if (ts > st.totals.last_any_ts_ms) st.totals.last_any_ts_ms = ts;

  const ok = (o.ok === 1 || o.ok === true || o.ok === "1");
  if (ok) {
    st.totals.ok++;
    if (ts > st.totals.last_ok_ts_ms) st.totals.last_ok_ts_ms = ts;
  } else {
    st.totals.bad++;
  }

  const b = Number(o.bytes || 0) || 0;
  st.totals.bytes += b;

  const wc = Number(o.wc_award || o.wc || 0) || 0;
  st.totals.wc += wc;
}

async function scanOnce() {
  const file = receiptsFile();
  let s;
  try { s = fs.statSync(file); } catch {
    // missing file: keep state but mark last_scan
    st.last_scan_ms = nowMs();
    st.file = file;
    return { file, missing: true };
  }

  if (!st.file || st.file !== file || st.ino !== (s.ino || 0) || s.size < st.pos) {
    resetFor(file, s.ino || 0);
  }

  if (s.size === st.pos) {
    st.last_scan_ms = nowMs();
    return { file, missing: false };
  }

  const start = st.pos;
  const end = s.size - 1;
  await new Promise((resolve) => {
    const rs = fs.createReadStream(file, { start, end, encoding: "utf8" });
    rs.on("data", (chunk) => {
      st.buf += chunk;
      let idx;
      while ((idx = st.buf.indexOf("\n")) >= 0) {
        const line = st.buf.slice(0, idx).trim();
        st.buf = st.buf.slice(idx + 1);
        if (line) absorbLine(line);
      }
    });
    rs.on("error", () => resolve());
    rs.on("end", () => resolve());
  });

  st.pos = s.size;
  st.last_scan_ms = nowMs();
  return { file, missing: false };
}

function renderProm(extra) {
  const t = st.totals;
  let out = "";
  out += "# HELP void_datanet_receipts_persist_lines_total Receipts lines seen from jsonl (persisted)\n";
  out += "# TYPE void_datanet_receipts_persist_lines_total counter\n";
  out += promLine("void_datanet_receipts_persist_lines_total", t.lines);

  out += "# HELP void_datanet_receipts_persist_ok_total Receipts ok count from jsonl (persisted)\n";
  out += "# TYPE void_datanet_receipts_persist_ok_total counter\n";
  out += promLine("void_datanet_receipts_persist_ok_total", t.ok);

  out += "# HELP void_datanet_receipts_persist_bad_total Receipts bad count from jsonl (persisted)\n";
  out += "# TYPE void_datanet_receipts_persist_bad_total counter\n";
  out += promLine("void_datanet_receipts_persist_bad_total", t.bad);

  out += "# HELP void_datanet_receipts_persist_bytes_total Total bytes from jsonl (persisted)\n";
  out += "# TYPE void_datanet_receipts_persist_bytes_total counter\n";
  out += promLine("void_datanet_receipts_persist_bytes_total", t.bytes);

  out += "# HELP void_datanet_receipts_persist_wc_total Total WC awarded from jsonl (persisted)\n";
  out += "# TYPE void_datanet_receipts_persist_wc_total counter\n";
  out += promLine("void_datanet_receipts_persist_wc_total", t.wc);

  out += "# HELP void_datanet_receipts_persist_parse_err_total JSON parse errors while reading jsonl\n";
  out += "# TYPE void_datanet_receipts_persist_parse_err_total counter\n";
  out += promLine("void_datanet_receipts_persist_parse_err_total", t.parse_err);

  out += "# HELP void_datanet_receipts_persist_last_any_ts_ms Last receipt timestamp from jsonl (ms)\n";
  out += "# TYPE void_datanet_receipts_persist_last_any_ts_ms gauge\n";
  out += promLine("void_datanet_receipts_persist_last_any_ts_ms", t.last_any_ts_ms);

  out += "# HELP void_datanet_receipts_persist_last_ok_ts_ms Last OK receipt timestamp from jsonl (ms)\n";
  out += "# TYPE void_datanet_receipts_persist_last_ok_ts_ms gauge\n";
  out += promLine("void_datanet_receipts_persist_last_ok_ts_ms", t.last_ok_ts_ms);

  out += "# HELP void_datanet_receipts_persist_scan_age_seconds Seconds since last scan attempt\n";
  out += "# TYPE void_datanet_receipts_persist_scan_age_seconds gauge\n";
  const age = st.last_scan_ms ? Math.max(0, (nowMs() - st.last_scan_ms) / 1000) : 1e9;
  out += promLine("void_datanet_receipts_persist_scan_age_seconds", age);

  if (extra && extra.file) {
    out += "# HELP void_datanet_receipts_persist_file_info 1 with labels\n";
    out += "# TYPE void_datanet_receipts_persist_file_info gauge\n";
    out += promLine("void_datanet_receipts_persist_file_info", 1, { file: extra.file, missing: String(!!extra.missing) });
  }
  return out;
}

function mountOnce() {
  const app = getApp();
  if (!app || typeof app.get !== "function") return false;
  if (app.__void_datanet_receipts_persist_v1_mounted) return true;
  app.__void_datanet_receipts_persist_v1_mounted = true;

  app.get("/datanet/v1/metrics/receipts.persist.prom", async (req, res) => {
    try {
      const extra = await scanOnce();
      res.status(200).type("text/plain; version=0.0.4").send(renderProm(extra));
    } catch (e) {
      res.status(200).type("text/plain; version=0.0.4").send(renderProm({ file: receiptsFile(), missing: false }) + "\n# err=1\n");
    }
  });

  try { console.error("[datanet_receipts_persist_v1] mounted: /datanet/v1/metrics/receipts.persist.prom"); } catch (__void_diag_pack3_err) { __voidSrcDiagPack3Visible("VOID_SRC_DIAG_DATANET_RECEIPT_PACK3_DATANET_RECEIPTS_PERSIST_V1_CJS_26_1_VISIBLE", __void_diag_pack3_err); }
  return true;
}

let tries = 0;
const iv = setInterval(() => {
  tries++;
  if (mountOnce()) { clearInterval(iv); return; }
  if (tries >= 200) { clearInterval(iv); }
}, 250);
