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

const SCAN_DEADLINE_MS = 5_000;
const MAX_SCAN_WINDOW_BYTES = 256 * 1024;
const MAX_CARRY_BYTES = 1024 * 1024;

// incremental state
let st = {
  file: "",
  dev: 0,
  ino: 0,
  pos: 0,
  buf: Buffer.alloc(0),
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

function resetFor(file, dev, ino) {
  st.file = file;
  st.dev = dev;
  st.ino = ino;
  st.pos = 0;
  st.buf = Buffer.alloc(0);
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

function snapshotState() {
  return {
    file: st.file,
    dev: st.dev,
    ino: st.ino,
    pos: st.pos,
    buf: Buffer.from(st.buf),
    totals: { ...st.totals },
    last_scan_ms: st.last_scan_ms,
  };
}

async function scanOnceUnlocked() {
  const file = receiptsFile();
  const openFlags =
    fs.constants.O_RDONLY |
    Number(fs.constants.O_NOFOLLOW || 0) |
    Number(fs.constants.O_NONBLOCK || 0);
  let fd;
  try {
    fd = fs.openSync(file, openFlags);
  } catch (error) {
    if (error && (error.code === "ENOENT" || error.code === "ENOTDIR")) {
      // Missing path: retain counters, but force generation revalidation if it returns.
      st.last_scan_ms = nowMs();
      st.file = file;
      st.dev = 0;
      st.ino = 0;
      return { file, missing: true };
    }
    throw error;
  }

  let descriptorOpen = true;
  const closeDescriptor = () => {
    if (!descriptorOpen) return;
    descriptorOpen = false;
    fs.closeSync(fd);
  };

  const beforeScan = snapshotState();
  try {
    const s = fs.fstatSync(fd);
    if (!s.isFile()) throw new Error("receipts_file_not_regular");
    const dev = Number(s.dev || 0);
    const ino = Number(s.ino || 0);
    if (
      !st.file ||
      st.file !== file ||
      st.dev !== dev ||
      st.ino !== ino ||
      s.size < st.pos
    ) {
      resetFor(file, dev, ino);
    }

    if (s.size === st.pos) {
      closeDescriptor();
      st.last_scan_ms = nowMs();
      return { file, missing: false };
    }

    const start = st.pos;
    const end = Math.min(s.size, start + MAX_SCAN_WINDOW_BYTES) - 1;
    const expectedBytes = end - start + 1;
    await new Promise((resolve, reject) => {
      const rs = fs.createReadStream(file, {
        fd,
        autoClose: false,
        start,
        end,
      });
      let settled = false;
      let deadlineTimer = null;
      const settle = (done, value) => {
        if (settled) return;
        settled = true;
        if (deadlineTimer !== null) {
          clearTimeout(deadlineTimer);
          deadlineTimer = null;
        }
        done(value);
      };
      const rejectAndDestroy = (code) => {
        if (settled) return;
        settle(reject, new Error(code));
        try {
          if (typeof rs.destroy === "function") rs.destroy();
        } catch (destroyError) {
          try {
            console.error("[datanet_receipts_persist_v1] stream destroy failed");
          } catch (logError) {
            void logError;
          }
          void destroyError;
        }
      };
      deadlineTimer = setTimeout(
        () => rejectAndDestroy("scan_timeout"),
        SCAN_DEADLINE_MS,
      );
      rs.on("data", (chunk) => {
        if (settled) return;
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        let cursor = 0;
        while (cursor <= bytes.length) {
          const newline = bytes.indexOf(0x0a, cursor);
          const terminal = newline < 0;
          const segment = terminal
            ? bytes.subarray(cursor)
            : bytes.subarray(cursor, newline);
          const carryBytes = st.buf.length;
          const segmentBytes = segment.length;
          if (
            carryBytes > MAX_CARRY_BYTES ||
            segmentBytes > MAX_CARRY_BYTES - carryBytes
          ) {
            rejectAndDestroy("line_too_large");
            return;
          }
          if (terminal) {
            st.buf = Buffer.concat(
              [st.buf, segment],
              carryBytes + segmentBytes,
            );
            break;
          }
          const lineBytes = Buffer.concat(
            [st.buf, segment],
            carryBytes + segmentBytes,
          );
          const line = lineBytes.toString("utf8").trim();
          st.buf = Buffer.alloc(0);
          if (line) absorbLine(line);
          cursor = newline + 1;
        }
      });
      rs.once("error", (error) => settle(reject, error));
      rs.once("end", () => {
        const readBytes = Number(rs.bytesRead);
        if (!Number.isSafeInteger(readBytes) || readBytes !== expectedBytes) {
          settle(reject, new Error(`short_read:${readBytes}/${expectedBytes}`));
          return;
        }
        settle(resolve);
      });
      rs.once("close", () => {
        settle(reject, new Error("premature_close"));
      });
    });

    closeDescriptor();
    st.pos = end + 1;
    st.last_scan_ms = nowMs();
    return { file, missing: false };
  } catch (error) {
    let terminalError = error;
    try {
      closeDescriptor();
    } catch (closeError) {
      terminalError = closeError;
    }
    st = beforeScan;
    st.last_scan_ms = nowMs();
    throw terminalError;
  }
}

let scanInFlight = null;
function scanOnce() {
  if (scanInFlight) return scanInFlight;

  const run = scanOnceUnlocked();
  let shared;
  shared = run.then(
    (value) => {
      if (scanInFlight === shared) scanInFlight = null;
      return value;
    },
    (error) => {
      if (scanInFlight === shared) scanInFlight = null;
      throw error;
    },
  );
  scanInFlight = shared;
  return shared;
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

const RECEIPTS_PERSIST_METRICS_PATH = "/datanet/v1/metrics/receipts.persist.prom";

async function receiptsPersistMetricsRoute(req, res) {
  try {
    const extra = await scanOnce();
    res.status(200).type("text/plain; version=0.0.4").send(renderProm(extra));
  } catch (e) {
    const message = String(e?.message || "");
    const reason = message === "scan_timeout"
      ? "timeout"
      : message === "line_too_large"
        ? "line_too_large"
        : "scan_failed";
    res.status(200).type("text/plain; version=0.0.4").send(
      renderProm({ file: receiptsFile(), missing: false }) +
      "\n# err=1\n# err_reason=" + reason + "\n",
    );
  }
}

const EXPRESS4_ROUTER_GETTER_ERROR =
  "'app.router' is deprecated!\n" +
  "Please see the 3.x to 4.x migration guide for details on how to update your app.";

function isExpectedExpress4RouterGetterError(key, error) {
  if (key !== "router") return false;
  return String(error?.message || error || "") === EXPRESS4_ROUTER_GETTER_ERROR;
}

function retainedRouteState(app, routePath, handler) {
  let observedUnretained = false;
  let unreadableAlias = false;
  for (const key of ["_router", "router"]) {
    try {
      const router = app && app[key];
      const stack = router && router.stack;
      if (!stack || typeof stack.length !== "number") continue;
      let stackIndeterminate = false;
      for (let index = 0; index < stack.length; index += 1) {
        const route = stack[index] && stack[index].route;
        if (!route || route.path !== routePath) continue;
        const methods = route.methods;
        if (methods && methods.get !== true) continue;
        const routeStack = route.stack;
        if (!routeStack || typeof routeStack.length !== "number") {
          stackIndeterminate = true;
          continue;
        }
        for (let routeIndex = 0; routeIndex < routeStack.length; routeIndex += 1) {
          const layer = routeStack[routeIndex];
          if (layer && layer.handle === handler) return true;
        }
      }
      if (!stackIndeterminate) observedUnretained = true;
    } catch (error) {
      if (!isExpectedExpress4RouterGetterError(key, error)) {
        unreadableAlias = true;
      }
    }
  }
  if (unreadableAlias) return null;
  if (observedUnretained) return false;
  return null;
}

function mountOnce() {
  const app = getApp();
  if (!app || typeof app.get !== "function") return false;
  if (app.__void_datanet_receipts_persist_v1_mounted) {
    app.__void_datanet_receipts_persist_v1_mount_state = "bound";
    return true;
  }
  if (app.__void_datanet_receipts_persist_v1_mount_state === "bound") return true;
  if (app.__void_datanet_receipts_persist_v1_mount_state === "indeterminate") return true;

  if (retainedRouteState(app, RECEIPTS_PERSIST_METRICS_PATH, receiptsPersistMetricsRoute) === true) {
    app.__void_datanet_receipts_persist_v1_mounted = true;
    app.__void_datanet_receipts_persist_v1_mount_state = "bound";
    return true;
  }

  app.__void_datanet_receipts_persist_v1_mount_state = "indeterminate";
  try {
    app.get(RECEIPTS_PERSIST_METRICS_PATH, receiptsPersistMetricsRoute);
    app.__void_datanet_receipts_persist_v1_mounted = true;
    app.__void_datanet_receipts_persist_v1_mount_state = "bound";
  } catch (error) {
    const retained = retainedRouteState(
      app,
      RECEIPTS_PERSIST_METRICS_PATH,
      receiptsPersistMetricsRoute,
    );
    if (retained === true) {
      app.__void_datanet_receipts_persist_v1_mounted = true;
      app.__void_datanet_receipts_persist_v1_mount_state = "bound";
    } else if (retained === false) {
      app.__void_datanet_receipts_persist_v1_mount_state = "idle";
    }
    throw error;
  }

  try { console.error("[datanet_receipts_persist_v1] mounted: " + RECEIPTS_PERSIST_METRICS_PATH); } catch (__void_diag_pack3_err) { __voidSrcDiagPack3Visible("VOID_SRC_DIAG_DATANET_RECEIPT_PACK3_DATANET_RECEIPTS_PERSIST_V1_CJS_26_1_VISIBLE", __void_diag_pack3_err); }
  return true;
}

function reportMountError(error) {
  const message =
    "[datanet_receipts_persist_v1] mount attempt failed: " +
    String(error?.message || error || "unknown");
  try {
    console.error(message);
    return true;
  } catch (consoleError) {
    const fallback =
      message +
      "; console_error=" +
      String(consoleError?.message || consoleError || "unknown");
    try {
      if (
        typeof process !== "undefined" &&
        process.stderr &&
        typeof process.stderr.write === "function"
      ) {
        process.stderr.write(fallback + "\\n");
        return true;
      }
    } catch (stderrError) {
      void stderrError;
    }
    return false;
  }
}

let tries = 0;
const iv = setInterval(() => {
  tries++;
  try {
    if (mountOnce()) { clearInterval(iv); return; }
  } catch (error) {
    reportMountError(error);
  }
  const app = getApp();
  if (
    app &&
    (app.__void_datanet_receipts_persist_v1_mount_state === "bound" ||
      app.__void_datanet_receipts_persist_v1_mount_state === "indeterminate")
  ) {
    clearInterval(iv);
    return;
  }
  if (tries >= 200) { clearInterval(iv); }
}, 250);
