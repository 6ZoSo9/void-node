'use strict';

const http = require('http');
const url = require('url');
const { execFile } = require('child_process');
const path = require('path');

const ROOT = process.env.ROOT || process.cwd();
const PORT = Number(process.env.WC_HTTP_PORT || '4312');

function log(...args) {
  console.log('[workcredits-http]', ...args);
}

function runScript(scriptRelPath, args, cb) {
  const scriptPath = path.join(ROOT, scriptRelPath);

  const cleanEnv = {
    HOME: process.env.HOME || "",
    PATH: process.env.PATH || "/usr/local/bin:/usr/bin:/bin",
    ROOT,
    WC_HTTP_PORT: String(PORT),
    RPC_URL: process.env.RPC_URL || "http://127.0.0.1:8545",
    PROM_URL: process.env.PROM_URL || "http://127.0.0.1:9090",
    STATE_FILE: process.env.STATE_FILE || path.join(ROOT, "docs", "VOID-WORKCREDITS-DEVNET-STATE.json"),
    STATE_JSON: process.env.STATE_JSON || path.join(ROOT, "docs", "VOID-DEVNET-PROTOCOL-STATE.json"),
    BCAST_FILE: process.env.BCAST_FILE || path.join(ROOT, "broadcast", "WorkCreditsDevnetDeploy.s.sol", "2050", "run-latest.json"),
    CAST_BIN: process.env.CAST_BIN || "",
    LANG: "C.UTF-8",
    LC_ALL: "C.UTF-8",
  };

  execFile("bash", [scriptPath, ...(args || [])], {
    env: cleanEnv,
    cwd: ROOT,
    timeout: 8000,
    maxBuffer: 1024 * 1024,
  }, (err, stdout, stderr) => {
    if (err) {
      log("error running", scriptRelPath, err.message);
      if (stderr) {
        log("stderr:", String(stderr).slice(0, 400));
      }
      cb(err);
      return;
    }
    cb(null, stdout);
  });
}



function sendErr(res, status, err) {
  const message = String((err && err.message) || err || "internal_error");
  try {
    if (!res.headersSent) {
      res.writeHead(status || 500, { "content-type": "application/json" });
    }
    res.end(JSON.stringify({ ok: false, error: message }) + "\n");
  } catch (_) {
    try { res.end(); } catch (_) { console.error("VOID_OPS_WC_DEVNET_HTTP_SEND_ERROR_END_VISIBLE", _ && _.message ? _.message : _); }
  }
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function sendText(res, status, text) {
  const body = String(text);
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function sendHtml(res, status, html) {
  const body = String(html);
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function readJsonSafe(p) {
  try {
    return JSON.parse(require("fs").readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function toHuman(raw) {
  const s = String(raw ?? "0").trim();
  if (!s || s === "0") return 0;
  try {
    return Number(BigInt(s)) / 1e18;
  } catch {
    return 0;
  }
}

function rawStr(v) {
  try {
    return String(BigInt(String(v ?? "0").trim() || "0"));
  } catch {
    return "0";
  }
}

function roundNum(n, places = 8) {
  const x = Number(n || 0);
  if (!Number.isFinite(x)) return 0;
  return Number(x.toFixed(places));
}

function evmUintToDecStr(v) {
  const s = String(v || "").trim().split(/\s+/)[0];
  if (!s) return "0";
  if (/^0x[0-9a-fA-F]+$/.test(s)) {
    try { return BigInt(s).toString(); } catch { return "0"; }
  }
  if (/^\d+$/.test(s)) return s;
  return "0";
}

async function buildPoolJsonNative() {
  const statePath = process.env.STATE_FILE || path.join(ROOT, "docs", "VOID-WORKCREDITS-DEVNET-STATE.json");
  const protoPath = process.env.STATE_JSON || path.join(ROOT, "docs", "VOID-DEVNET-PROTOCOL-STATE.json");
  const state = readJsonSafe(statePath) || {};
  const proto = readJsonSafe(protoPath) || {};
  const rpcUrl = String(
    state.rpc_url ||
    proto.rpc_url ||
    process.env.RPC_URL ||
    "http://127.0.0.1:8545"
  );
  const castBin = process.env.CAST_BIN || "cast";

  const poolAddr = String(
    state.pool_address ||
    proto.workCreditsPoolV1 ||
    proto.workCreditsPool ||
    ""
  );
  const wcAddr = String(
    state.workcredits_token ||
    proto.workCreditsToken ||
    ""
  );
  const voidAddr = String(
    state.void_token ||
    proto.voidToken ||
    ""
  );

  if (!poolAddr || !wcAddr || !voidAddr) {
    throw new Error("missing live pool/token addresses");
  }

  const wcRawStr = evmUintToDecStr(await execFileP(
    castBin,
    ["call", "--rpc-url", rpcUrl, wcAddr, "balanceOf(address)(uint256)", poolAddr],
    { encoding: "utf8" }
  ));
  const voidRawStr = evmUintToDecStr(await execFileP(
    castBin,
    ["call", "--rpc-url", rpcUrl, voidAddr, "balanceOf(address)(uint256)", poolAddr],
    { encoding: "utf8" }
  ));

  const voidHuman = toHuman(voidRawStr);
  const wcHuman = toHuman(wcRawStr);

  return {
    chain: String(state.chain || proto.chain || "devnet"),
    up: 1,
    health: 1,
    health_5m: 1,
    pool: {
      address: poolAddr,
      rpcUrl: rpcUrl,
    },
    reserves: {
      void_raw: voidRawStr,
      wc_raw: wcRawStr,
      void: roundNum(voidHuman, 8),
      wc: roundNum(wcHuman, 8),
    },
    price: {
      wc_per_void: roundNum(voidHuman > 0 ? (wcHuman / voidHuman) : 0, 8),
      void_per_wc: roundNum(wcHuman > 0 ? (voidHuman / wcHuman) : 0, 8),
    }
  };
}

function execFileP(cmd, args, opts) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, opts || {}, (err, stdout, stderr) => {
      if (err) {
        err.stdout = String(stdout || "");
        err.stderr = String(stderr || "");
        reject(err);
        return;
      }
      resolve(String(stdout || "").trim());
    });
  });
}

function poolHistoryFile() {
  return path.join(ROOT, "runtime", "wc_devnet_pool_history.jsonl");
}

function appendPoolHistorySnapshot(obj) {
  try {
    const file = poolHistoryFile();
    require("fs").mkdirSync(path.dirname(file), { recursive: true });
    const rec = {
      ts: Date.now(),
      chain: String((obj && obj.chain) || "devnet"),
      reserves: (obj && obj.reserves) ? obj.reserves : null,
      price: (obj && obj.price) ? obj.price : null
    };
    require("fs").appendFileSync(file, JSON.stringify(rec) + "\n", "utf8");
    return { ok: true, file, ts: rec.ts };
  } catch (e) {
    return {
      ok: false,
      file: poolHistoryFile(),
      error: String((e && e.message) || e)
    };
  }
}

function readPoolHistorySnapshots() {
  try {
    const file = poolHistoryFile();
    if (!require("fs").existsSync(file)) return [];
    const now = Date.now();
    const keepAfter = now - (35 * 24 * 60 * 60 * 1000);
    const lines = String(require("fs").readFileSync(file, "utf8") || "")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

    const out = [];
    for (const line of lines) {
      try {
        const j = JSON.parse(line);
        const ts = Number((j && j.ts) || 0);
        const wcPerVoid = Number(j && j.price && j.price.wc_per_void || 0);
        const voidPerWc = Number(j && j.price && j.price.void_per_wc || 0);
        if (!Number.isFinite(ts) || ts < keepAfter) continue;
        if (!Number.isFinite(wcPerVoid) || wcPerVoid <= 0) continue;
        if (!Number.isFinite(voidPerWc) || voidPerWc <= 0) continue;
        out.push({
          ts,
          chain: String((j && j.chain) || "devnet"),
          reserves: j && j.reserves ? j.reserves : null,
          price: {
            wc_per_void: wcPerVoid,
            void_per_wc: voidPerWc
          }
        });
      } catch (_) {
        if (!globalThis.__void_ops_wc_devnet_http_recent_proof_seen) {
          globalThis.__void_ops_wc_devnet_http_recent_proof_seen = true;
          console.warn("VOID_OPS_WC_DEVNET_HTTP_RECENT_PROOF_PARSE_VISIBLE", _ && _.message ? _.message : _);
        }
      }
    }
    return out.slice(-20000);
  } catch (_) {
    return [];
  }
}

async function buildAccountJsonNative(addr) {
  const statePath = process.env.STATE_JSON || path.join(ROOT, "docs", "VOID-DEVNET-PROTOCOL-STATE.json");
  const bcastPath = process.env.BCAST_FILE || path.join(ROOT, "broadcast", "WorkCreditsDevnetDeploy.s.sol", "2050", "run-latest.json");
  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
  const castBin = process.env.CAST_BIN || "cast";

  const state = readJsonSafe(statePath) || {};
  const bcast = readJsonSafe(bcastPath) || {};
  const txs = Array.isArray(bcast.transactions) ? bcast.transactions : [];

  function firstAddr(regexes) {
    for (const tx of txs) {
      const name = String((tx && tx.contractName) || "");
      if (regexes.some((re) => re.test(name))) {
        const a = String(tx.contractAddress || "");
        if (a) return a;
      }
    }
    return "";
  }

  function readLocalLedgerBalanceForAccount(account) {
    try {
      const fs = require("fs");
      const baseCandidates = [
        path.join(ROOT, "data_a", "wc_v1"),
        path.join(ROOT, "data", "wc_v1"),
      ];
      let baseDir = null;
      for (const c of baseCandidates) {
        try { if (fs.existsSync(c)) { baseDir = c; break; } } catch (e) { if (!globalThis.__void_ops_wc_devnet_http_base_dir_seen) { globalThis.__void_ops_wc_devnet_http_base_dir_seen = true; console.warn("VOID_OPS_WC_DEVNET_HTTP_BASE_DIR_CHECK_VISIBLE", c, e && e.message ? e.message : e); } }
      }
      if (!baseDir) return { earned: 0, redeemed: 0, redeemable: 0, count: 0, ledger_file: null, redeemed_file: null };

      const ledger = path.join(baseDir, "ledger.jsonl");
      const redeemed = path.join(baseDir, "redeemed.jsonl");

      const lines = fs.existsSync(ledger)
        ? String(fs.readFileSync(ledger, "utf8") || "").split("\n").map((x) => x.trim()).filter(Boolean)
        : [];
      const redeemedLines = fs.existsSync(redeemed)
        ? String(fs.readFileSync(redeemed, "utf8") || "").split("\n").map((x) => x.trim()).filter(Boolean)
        : [];

      let earned = 0;
      let count = 0;
      for (const line of lines) {
        try {
          const j = JSON.parse(line);
          if (String(j?.account || "") !== String(account || "")) continue;
          const d = Number(j?.delta || 0);
          if (Number.isFinite(d) && d > 0) earned += d;
          count++;
        } catch (e) {
          if (!globalThis.__void_ops_wc_devnet_http_ledger_line_seen) {
            globalThis.__void_ops_wc_devnet_http_ledger_line_seen = true;
            console.warn("VOID_OPS_WC_DEVNET_HTTP_LEDGER_LINE_PARSE_VISIBLE", e && e.message ? e.message : e);
          }
        }
      }

      let redeemedAmt = 0;
      for (const line of redeemedLines) {
        try {
          const j = JSON.parse(line);
          if (String(j?.account || "") !== String(account || "")) continue;
          const d = Number(j?.amount || 0);
          if (Number.isFinite(d) && d > 0) redeemedAmt += d;
        } catch (e) {
          if (!globalThis.__void_ops_wc_devnet_http_redeemed_line_seen) {
            globalThis.__void_ops_wc_devnet_http_redeemed_line_seen = true;
            console.warn("VOID_OPS_WC_DEVNET_HTTP_REDEEMED_LINE_PARSE_VISIBLE", e && e.message ? e.message : e);
          }
        }
      }

      const earnedRounded = wcRound(earned);
      const redeemedRounded = wcRound(redeemedAmt);
      const redeemableRounded = wcRound(Math.max(0, earnedRounded - redeemedRounded));
      return {
        earned: earnedRounded,
        redeemed: redeemedRounded,
        redeemable: redeemableRounded,
        count,
        ledger_file: ledger,
        redeemed_file: redeemed
      };
    } catch {
      return { earned: 0, redeemed: 0, redeemable: 0, count: 0, ledger_file: null, redeemed_file: null };
    }
  }

    const localEarned = readLocalLedgerBalanceForAccount(addr);

  function wcRound(n) {
    const x = Number(n || 0);
    if (!Number.isFinite(x)) return 0;
    return Math.round(x * 1e9) / 1e9;
  }

  function format18(v) {
    const s = String(v ?? "0").trim();
    if (!/^-?\d+$/.test(s)) return 0;
    const neg = s.startsWith("-");
    const n = neg ? s.slice(1) : s;
    const whole = n.length > 18 ? n.slice(0, -18) : "0";
    const frac0 = n.length > 18 ? n.slice(-18) : n.padStart(18, "0");
    const frac = frac0.replace(/0+$/, "");
    const out = frac ? (whole + "." + frac) : whole;
    return Number((neg ? "-" : "") + out);
  }


  const wcAddr =
    String(state.workCreditsToken || state.workcreditsToken || "") ||
    firstAddr([/WorkCredits.*Token/i, /Token.*WorkCredits/i]);

  const poolAddr =
    String(state.workCreditsPoolV1 || state.workcreditsPoolV1 || "") ||
    firstAddr([/WorkCredits.*Pool/i, /Pool.*WorkCredits/i]);

  if (!wcAddr) throw new Error("missing WorkCredits token address");
  if (!poolAddr) throw new Error("missing WorkCredits pool address");

  let voidAddr = String(state.voidToken || state.voidTokenWorkCredits || "");
  if (!voidAddr) {
    try {
      voidAddr = await execFileP(castBin, ["call", poolAddr, "voidToken()(address)", "--rpc-url", rpcUrl], {
        cwd: ROOT,
        env: {
          HOME: process.env.HOME || "",
          PATH: process.env.PATH || "/usr/local/bin:/usr/bin:/bin",
          LANG: "C.UTF-8",
          LC_ALL: "C.UTF-8",
        },
        timeout: 8000,
        maxBuffer: 1024 * 1024,
      });
    } catch {
      voidAddr = "";
    }
  }

  async function balanceOf(token, who) {
    if (!token) return "0";
    try {
      const out = await execFileP(castBin, ["call", token, "balanceOf(address)(uint256)", who, "--rpc-url", rpcUrl], {
        cwd: ROOT,
        env: {
          HOME: process.env.HOME || "",
          PATH: process.env.PATH || "/usr/local/bin:/usr/bin:/bin",
          LANG: "C.UTF-8",
          LC_ALL: "C.UTF-8",
        },
        timeout: 8000,
        maxBuffer: 1024 * 1024,
      });
      return rawStr(out.split(/\s+/)[0] || "0");
    } catch {
      return "0";
    }
  }

  const wcRaw = await balanceOf(wcAddr, addr);
  const voidRaw = await balanceOf(voidAddr, addr);
  const lpRaw = "0";

  const earnedWhole = Math.max(0, Number(localEarned.earned || 0));
  const redeemedWhole = Math.max(0, Number(localEarned.redeemed || 0));
  const redeemableWhole = Math.max(0, Number(localEarned.redeemable || 0));

  function humanToRaw18(v) {
    const n = Math.max(0, Number(v || 0));
    const s = String(n);
    if (!/^\d+(\.\d+)?$/.test(s)) return "0";
    const [whole, frac0 = ""] = s.split(".");
    const frac = (frac0 + "000000000000000000").slice(0, 18);
    return (BigInt(whole) * (10n ** 18n) + BigInt(frac)).toString();
  }

  const earnedRaw = humanToRaw18(earnedWhole);

  return {
    chain: "devnet",
    address: addr,
    up: 1,
    balances: {
      void_raw: voidRaw,
      wc_raw: wcRaw,
      lp_raw: lpRaw,
      void: format18(voidRaw),
      wc: format18(wcRaw),
      lp: format18(lpRaw),
    },
    earnings: {
      diagnostic_pending_wc_raw: humanToRaw18(redeemableWhole),
      diagnostic_pending_wc: redeemableWhole,
      diagnostic_local_earned_wc_raw: earnedRaw,
      diagnostic_local_earned_wc: earnedWhole,
      diagnostic_redeemed_wc_raw: humanToRaw18(redeemedWhole),
      diagnostic_redeemed_wc: redeemedWhole,
      diagnostic_redeemable_wc_raw: humanToRaw18(redeemableWhole),
      diagnostic_redeemable_wc: redeemableWhole,
      local_ledger_events: Math.max(0, Number(localEarned.count || 0)),
      source: "local_receipt_ledger_v1",
      note: "Diagnostic only. These wallet-scoped local ledger values are not canonical participant redeem/trading balances.",
    },
    meta: {
      pool_address: poolAddr || null,
      workcredits_token: wcAddr || null,
      void_token: voidAddr || null,
      rpc_url: rpcUrl,
      state_json: statePath,
      broadcast_file: bcastPath,
      ledger_file: localEarned.ledger_file,
      redeemed_file: localEarned.redeemed_file,
      updated_at: Math.floor(Date.now() / 1000),
    }
  };
}

function renderHtmlUi() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>VOID WorkCredits Devnet Dashboard</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root {
      color-scheme: dark;
      --bg: #05060a;
      --panel: #101320;
      --panel-alt: #151826;
      --accent: #7f5af0;
      --accent-soft: rgba(127, 90, 240, 0.18);
      --danger: #ff6b6b;
      --text: #e5e7f0;
      --muted: #98a0c0;
      --border: #22263a;
      --mono: SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: radial-gradient(circle at top, #15192b 0, #05060a 55%);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      align-items: stretch;
      justify-content: center;
    }
    .shell {
      max-width: 1120px;
      width: 100%;
      padding: 24px 16px 32px;
    }
    .card {
      background: linear-gradient(145deg, rgba(16,19,32,0.96), rgba(10,12,22,0.98));
      border-radius: 18px;
      padding: 20px 20px 18px;
      border: 1px solid rgba(127, 90, 240, 0.15);
      box-shadow:
        0 18px 45px rgba(0, 0, 0, 0.8),
        0 0 0 1px rgba(5, 6, 10, 0.8);
      backdrop-filter: blur(18px);
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
      margin-bottom: 12px;
    }
    .title-block h1 {
      font-size: 20px;
      font-weight: 650;
      letter-spacing: 0.03em;
      margin: 0 0 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(127, 90, 240, 0.18);
      color: var(--accent);
      border: 1px solid rgba(127, 90, 240, 0.4);
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }
    .subtitle {
      margin: 0;
      font-size: 12px;
      color: var(--muted);
    }
    .status-dot {
      width: 9px;
      height: 9px;
      border-radius: 999px;
      background: #19c37d;
      box-shadow: 0 0 12px rgba(25, 195, 125, 0.85);
    }
    .status-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.14em;
    }
    .status-row span.key {
      color: var(--muted);
    }
    .status-row span.value {
      color: #19c37d;
    }
    .grid {
      display: grid;
      grid-template-columns: 1.15fr 0.95fr;
      gap: 14px;
      margin-top: 12px;
    }
    @media (max-width: 860px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
    .panel {
      background: radial-gradient(circle at top left, rgba(127,90,240,0.16), rgba(8,10,18,0.96));
      border-radius: 14px;
      padding: 12px 12px 10px;
      border: 1px solid rgba(34, 38, 58, 0.95);
    }
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
    }
    .panel-title {
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .badge {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      padding: 2px 6px;
      border-radius: 999px;
      border: 1px solid rgba(152,160,192,0.45);
      color: var(--muted);
      opacity: 0.9;
    }
    .field-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .field-row label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
    }
    .field-row input {
      flex: 1;
      padding: 6px 8px;
      border-radius: 999px;
      border: 1px solid rgba(60, 66, 100, 0.95);
      background: radial-gradient(circle at top left, rgba(17,24,39,0.85), rgba(5,6,10,0.98));
      color: var(--text);
      font-family: var(--mono);
      font-size: 11px;
      outline: none;
    }
    .field-row input:focus {
      border-color: rgba(127, 90, 240, 0.85);
      box-shadow: 0 0 0 1px rgba(127, 90, 240, 0.6);
    }
    .btn {
      padding: 6px 12px;
      border-radius: 999px;
      border: 1px solid rgba(127,90,240,0.9);
      background: radial-gradient(circle at top left, var(--accent), #5034af);
      color: #f7f7ff;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      cursor: pointer;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .btn-secondary {
      border-color: rgba(60, 66, 100, 0.9);
      background: radial-gradient(circle at top left, #161824, #090a12);
      color: var(--muted);
    }
    .btn-secondary span.dot {
      width: 6px;
      height: 6px;
      border-radius: 999px;
      background: #19c37d;
    }
    .metrics-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin-bottom: 8px;
    }
    .metric {
      background: radial-gradient(circle at top left, rgba(11,15,29,0.96), rgba(6,7,13,0.97));
      border-radius: 11px;
      padding: 7px 8px 6px;
      border: 1px solid rgba(36, 40, 72, 0.9);
    }
    .metric-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
      margin-bottom: 3px;
    }
    .metric-value {
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
    }
    .metric-sub {
      font-size: 10px;
      color: var(--muted);
      margin-top: 1px;
    }
    .section-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      color: var(--muted);
      margin: 6px 0 4px;
    }
    .mono {
      font-family: var(--mono);
    }
    .json-box {
      margin-top: 6px;
      background: radial-gradient(circle at top left, rgba(10,12,20,0.96), rgba(6,7,12,0.98));
      border-radius: 10px;
      padding: 8px 10px;
      border: 1px solid rgba(34, 38, 58, 0.95);
      max-height: 260px;
      overflow: auto;
      font-family: var(--mono);
      font-size: 11px;
      line-height: 1.4;
      color: #c9d1ff;
      white-space: pre;
    }
    .footer {
      margin-top: 8px;
      font-size: 10px;
      color: var(--muted);
      display: flex;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
    }
    .footer span.key {
      text-transform: uppercase;
      letter-spacing: 0.2em;
      color: var(--muted);
    }
    .footer span.val {
      color: var(--text);
      font-family: var(--mono);
    }
    .error {
      color: var(--danger);
      font-size: 11px;
      margin-top: 4px;
      min-height: 14px;
    }
  </style>
</head>
<body>
<div style="max-width:920px;margin:0 auto 14px auto;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 4px;">
  <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
    <a href="http://100.122.79.39:4100/participant" style="color:#93c5fd;text-decoration:none;">Participant</a>
    <a href="http://100.122.79.39:4100/datanet-demo" style="color:#93c5fd;text-decoration:none;">DataNet</a>
    <a href="/workcredits/devnet/ui" style="color:#e5e7eb;text-decoration:none;font-weight:700;">Trading</a>
  </div>
  <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
    <a href="http://100.122.79.39:4100/participant#wallet" style="color:#94a3b8;text-decoration:none;">Back to Wallet</a>
  </div>
</div>
  <div class="shell">
    <div class="card">
      <div class="header-row">
        <div class="title-block">
          <h1>
            VOID / Obelisk
            <span class="pill">
              <span class="status-dot"></span>
              <span>devnet · workcredits</span>
            </span>
          </h1>
          <p class="subtitle">Live WC/VOID pool + account balances from helper on <span class="mono">:4312</span>.</p>
        </div>
        <div class="status-row">
          <span class="key">helper</span>
          <span class="value" id="helper-status">connected</span>
        </div>
      </div>

      <div class="panel" style="margin-bottom: 10px;">
        <div class="panel-header">
          <div class="panel-title">Account</div>
          <div class="badge">devnet · wc dashboard</div>
        </div>
        <div class="field-row">
          <label for="addr-input">Address</label>
          <input
            id="addr-input"
            type="text"
            spellcheck="false"
            autocomplete="off"
            value="0x1111111111111111111111111111111111111111"
          />
          <button class="btn" id="load-btn" type="button">
            <span>Load</span>
          </button>
        </div>
        <div class="error" id="error-line"></div>
      </div>

      <div class="grid">
        <div class="panel">
          <div class="panel-header">
            <div class="panel-title">Pool &amp; Price</div>
            <div class="badge">wc / void amm</div>
          </div>

          <div class="metrics-row">
            <div class="metric">
              <div class="metric-label">Price · WC per 1 VOID</div>
              <div class="metric-value" id="wc-per-void">–</div>
              <div class="metric-sub">wc / void</div>
            </div>
            <div class="metric">
              <div class="metric-label">Price · VOID per 1 WC</div>
              <div class="metric-value" id="void-per-wc">–</div>
              <div class="metric-sub">void / wc</div>
            </div>
            <div class="metric">
              <div class="metric-label">Health</div>
              <div class="metric-value" id="pool-health">–</div>
              <div class="metric-sub">up / health_5m</div>
            </div>
          </div>

          <div class="section-label">Pool reserves</div>
          <div class="metrics-row">
            <div class="metric">
              <div class="metric-label">VOID reserve</div>
              <div class="metric-value" id="pool-void">–</div>
              <div class="metric-sub mono">decimals: 18</div>
            </div>
            <div class="metric">
              <div class="metric-label">WC reserve</div>
              <div class="metric-value" id="pool-wc">–</div>
              <div class="metric-sub mono">decimals: 18</div>
            </div>
            <div class="metric">
              <div class="metric-label">Pool address</div>
              <div class="metric-value mono" id="pool-address" style="font-size: 10px;">–</div>
              <div class="metric-sub mono" id="pool-rpc" style="font-size: 10px;">rpc: –</div>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <div class="panel-title">Account Balances</div>
            <div class="badge">wallet preview</div>
          </div>

          <div class="metrics-row">
            <div class="metric">
              <div class="metric-label">VOID</div>
              <div class="metric-value" id="acc-void">–</div>
              <div class="metric-sub mono" id="acc-void-raw">raw: –</div>
            </div>
            <div class="metric">
              <div class="metric-label">WorkCredits</div>
              <div class="metric-value" id="acc-wc">–</div>
              <div class="metric-sub mono" id="acc-wc-raw">raw: –</div>
            </div>
            <div class="metric">
              <div class="metric-label">LP Tokens</div>
              <div class="metric-value" id="acc-lp">–</div>
              <div class="metric-sub mono" id="acc-lp-raw">raw: –</div>
            </div>
          </div>

          <div class="metrics-row">
            <div class="metric">
              <div class="metric-label">Pending WC earnings</div>
              <div class="metric-value" id="pending-wc">–</div>
              <div class="metric-sub mono" id="pending-wc-raw">raw: –</div>
            </div>
            <div class="metric">
              <div class="metric-label">Chain</div>
              <div class="metric-value" id="chain-name">–</div>
              <div class="metric-sub mono">devnet helper</div>
            </div>
            <div class="metric">
              <div class="metric-label">Address</div>
              <div class="metric-value mono" id="acc-address" style="font-size: 10px;">–</div>
              <div class="metric-sub mono">target wallet</div>
            </div>
          </div>
        </div>
      </div>

      <div class="section-label" style="margin-top: 10px;">Raw dashboard JSON</div>
      <div class="json-box" id="json-box">{}</div>

      <div class="footer">
        <div><span class="key">endpoint</span> · <span class="val">/workcredits/devnet/dashboard/&lt;address&gt;.json</span></div>
        <div><span class="key">ui</span> · <span class="val">/workcredits/devnet/ui</span></div>
      </div>
    </div>
  </div>

  <script>
    const addrInput = document.getElementById('addr-input');
    const loadBtn = document.getElementById('load-btn');
    const errorLine = document.getElementById('error-line');
    const jsonBox = document.getElementById('json-box');

    const el = (id) => document.getElementById(id);

    function setError(msg) {
      errorLine.textContent = msg || '';
    }

    function setText(id, value) {
      const node = el(id);
      if (!node) return;
      node.textContent = value;
    }

    function formatNum(x) {
      if (x === null || x === undefined || Number.isNaN(Number(x))) return '0';
      const n = Number(x);
      if (!Number.isFinite(n)) return String(x);
      if (Math.abs(n) >= 1_000_000_000) return n.toExponential(2);
      if (Math.abs(n) >= 10_000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
      if (Math.abs(n) >= 1) return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
      return n.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 8 });
    }

    async function loadDashboard() {
      setError('');
      const addrRaw = (addrInput.value || '').trim();
      if (!/^0x[0-9a-fA-F]{40}$/.test(addrRaw)) {
        setError('Enter a valid 0x-prefixed EVM address (40 hex chars).');
        return;
      }

      loadBtn.disabled = true;
      loadBtn.textContent = 'Loading…';

      try {
        const resp = await fetch('/workcredits/devnet/dashboard/' + addrRaw + '.json', {
          cache: 'no-store'
        });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error('HTTP ' + resp.status + ': ' + text.slice(0, 200));
        }
        const data = await resp.json();
        jsonBox.textContent = JSON.stringify(data, null, 2);

        const pool = data.pool || {};
        const reserves = pool.reserves || {};
        const price = pool.price || {};
        const account = data.account || {};
        const balances = account.balances || {};
        const earnings = account.earnings || {};
        const meta = account.meta || {};
        const chain = data.chain || pool.chain || account.chain || 'devnet';

        setText('chain-name', chain);
        setText('acc-address', data.address || account.address || addrRaw);

        setText('wc-per-void', price.wc_per_void != null ? formatNum(price.wc_per_void) : '0');
        setText('void-per-wc', price.void_per_wc != null ? formatNum(price.void_per_wc) : '0');
        const up = pool.up === 1 || pool.up === '1' || pool.up === true;
        const h5 = pool.health_5m === 1 || pool.health_5m === '1' || pool.health_5m === true;
        setText('pool-health', up && h5 ? 'healthy' : 'check gauges');

        setText('pool-void', reserves.void != null ? formatNum(reserves.void) : '0');
        setText('pool-wc', reserves.wc != null ? formatNum(reserves.wc) : '0');
        setText('pool-address', pool.pool && pool.pool.address ? pool.pool.address : (pool.address || '–'));
        setText('pool-rpc', pool.pool && pool.pool.rpcUrl ? 'rpc: ' + pool.pool.rpcUrl : 'rpc: –');

        setText('acc-void', balances.void != null ? formatNum(balances.void) : '0');
        setText('acc-void-raw', 'raw: ' + (balances.void_raw ?? '0'));
        setText('acc-wc', balances.wc != null ? formatNum(balances.wc) : '0');
        setText('acc-wc-raw', 'raw: ' + (balances.wc_raw ?? '0'));
        setText('acc-lp', balances.lp != null ? formatNum(balances.lp) : '0');
        setText('acc-lp-raw', 'raw: ' + (balances.lp_raw ?? '0'));

        setText('pending-wc', earnings.pending_wc != null ? formatNum(earnings.pending_wc) : '0');
        setText('pending-wc-raw', 'raw: ' + (earnings.pending_wc_raw ?? '0'));

      } catch (err) {
        console.error('loadDashboard error', err);
        setError('Failed to load dashboard: ' + (err.message || String(err)));
      } finally {
        loadBtn.disabled = false;
        loadBtn.textContent = 'Load';
      }
    }

    loadBtn.addEventListener('click', loadDashboard);
    addrInput.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        loadDashboard();
      }
    });

    // auto-load once on page open
    window.addEventListener('load', () => {
      if (addrInput.value && addrInput.value.length === 42) {
        loadDashboard();
      }
    });
  </script>

<script>
(function(){
  if (window.__void_wallet_session_v1) return;
  window.__void_wallet_session_v1 = true;

  var KEY = "void_wallet_session_v1";

  function valid(v){
    return /^0x[a-fA-F0-9]{40}$/.test(String(v || "").trim());
  }

  function shorten(v){
    v = String(v || "").trim();
    return valid(v) ? (v.slice(0, 6) + "…" + v.slice(-4)) : "Not connected";
  }

  function qs(name){
    try {
      var u = new URL(window.location.href);
      return (u.searchParams.get(name) || "").trim();
    } catch (_) {
      return "";
    }
  }

  function getStored(){
    try { return localStorage.getItem(KEY) || ""; } catch (_) { return ""; }
  }

  function setStored(v){
    try { localStorage.setItem(KEY, String(v || "").trim()); } catch (_) { if (window.console && console.warn) console.warn("VOID_OPS_WC_DEVNET_HTTP_WALLET_STORAGE_SET_VISIBLE", _ && _.message ? _.message : _); }
  }

  function clearStored(){
    try { localStorage.removeItem(KEY); } catch (_) { if (window.console && console.warn) console.warn("VOID_OPS_WC_DEVNET_HTTP_WALLET_STORAGE_CLEAR_VISIBLE", _ && _.message ? _.message : _); }
  }

  function current(){
    var q = qs("wallet");
    if (valid(q)) {
      setStored(q);
      return q;
    }
    return getStored();
  }

  function fillInputs(addr){
    if (!valid(addr)) return;

    var ids = ["redeemWallet","wallet","walletAddress","address","tradeWallet","sendWallet"];
    ids.forEach(function(id){
      var el = document.getElementById(id);
      if (!el || typeof el.value !== "string") return;
      var v = String(el.value || "").trim();
      if (!v || valid(v)) el.value = addr;
    });

    var acct = document.getElementById("account");
    if (acct && typeof acct.value === "string") {
      var v = String(acct.value || "").trim();
      if (!v || valid(v)) acct.value = addr;
    }
  }

  function helperHref(addr){
    var base = window.location.protocol + "//" + window.location.hostname + ":4312/workcredits/devnet/ui";
    var from = encodeURIComponent(window.location.href);
    if (valid(addr)) return base + "?wallet=" + encodeURIComponent(addr) + "&from=" + from;
    return base + "?from=" + from;
  }

  function bindLinks(addr){
    var pool = window.location.protocol + "//" + window.location.hostname + ":4312/workcredits/devnet/pool.json";
    document.querySelectorAll("[data-local-wc-ui]").forEach(function(a){
      a.href = helperHref(addr);
      a.removeAttribute("target");
      a.removeAttribute("rel");
    });
    document.querySelectorAll("[data-local-wc-pool]").forEach(function(a){
      a.href = pool;
      a.removeAttribute("target");
      a.removeAttribute("rel");
    });

    if (window.location.pathname === "/workcredits/devnet/ui") {
      var from = qs("from") || (window.location.protocol + "//" + window.location.hostname + ":4100/participant#wallet");
      var back = document.getElementById("voidWalletBackLink");
      if (back) back.href = from;
    }
  }

  function rerender(){
    var addr = current();
    fillInputs(addr);
    bindLinks(addr);

    var badge = document.getElementById("voidWalletSessionBadge");
    var full = document.getElementById("voidWalletSessionFull");
    var connectBtn = document.getElementById("voidWalletConnectBtn");
    var refreshBtn = document.getElementById("voidWalletRefreshBtn");
    var disconnectBtn = document.getElementById("voidWalletDisconnectBtn");

    if (badge) badge.textContent = shorten(addr);
    if (full) full.textContent = valid(addr) ? addr : "No wallet connected";
    if (connectBtn) connectBtn.style.display = valid(addr) ? "none" : "";
    if (refreshBtn) refreshBtn.style.display = valid(addr) ? "" : "none";
    if (disconnectBtn) disconnectBtn.style.display = valid(addr) ? "" : "none";

    try {
      if (window.refreshAll && typeof window.refreshAll === "function") window.refreshAll().catch(function(){});
      if (window.refresh && typeof window.refresh === "function") window.refresh().catch(function(){});
    } catch (_) { if (window.console && console.warn) console.warn("VOID_OPS_WC_DEVNET_HTTP_WALLET_RERENDER_VISIBLE", _ && _.message ? _.message : _); }
  }

  async function connectWallet(){
    if (!window.ethereum || !window.ethereum.request) {
      alert("MetaMask or another injected wallet was not found in this browser.");
      return;
    }
    var accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    var addr = (Array.isArray(accounts) && accounts.length) ? String(accounts[0]) : "";
    if (!valid(addr)) {
      alert("Wallet returned an invalid address.");
      return;
    }
    setStored(addr);
    rerender();
  }

  function disconnectWallet(){
    clearStored();
    rerender();
  }

  async function refreshWalletSession(){
    if (!window.ethereum || !window.ethereum.request) {
      rerender();
      return;
    }

    var accounts = [];
    try {
      accounts = await window.ethereum.request({ method: "eth_accounts" });
    } catch (_) {
      rerender();
      return;
    }

    var addr = (Array.isArray(accounts) && accounts.length) ? String(accounts[0]) : "";
    if (valid(addr)) setStored(addr);
    else clearStored();

    rerender();
  }


  function mountBar(){
    if (document.getElementById("voidWalletSessionBar")) return;

    var onHelper = window.location.pathname === "/workcredits/devnet/ui";
    var from = qs("from") || (window.location.protocol + "//" + window.location.hostname + ":4100/participant#wallet");

    var wrap = document.createElement("div");
    wrap.id = "voidWalletSessionBar";
    wrap.style.cssText = "display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:0;border:0;background:transparent;box-shadow:none;color:#e5e7eb;font:12px/1.2 Inter,ui-sans-serif,system-ui,sans-serif;";
    wrap.innerHTML =
      '<div style="display:flex;flex-direction:column;gap:2px;min-width:180px">' +
        '<div style="font-weight:800;letter-spacing:.04em;color:#f8fafc">Wallet Session</div>' +
        '<div id="voidWalletSessionBadge" style="color:#93c5fd;font-weight:700">Not connected</div>' +
        '<div id="voidWalletSessionFull" style="color:#94a3b8;font-size:11px;max-width:260px;overflow-wrap:anywhere">No wallet connected</div>' +
      '</div>' +
      (onHelper ? ('<a id="voidWalletBackLink" href="' + from + '" style="padding:8px 10px;border-radius:10px;background:#0f172a;border:1px solid #334155;color:#e5e7eb;text-decoration:none;font-weight:700">Back</a>') : '') +
      '<button id="voidWalletConnectBtn" type="button" style="padding:8px 10px;border-radius:10px;background:#0f172a;border:1px solid #334155;color:#e5e7eb;font-weight:700;cursor:pointer">Connect</button>' +
      '<button id="voidWalletRefreshBtn" type="button" style="padding:8px 10px;border-radius:10px;background:#0f172a;border:1px solid #334155;color:#e5e7eb;font-weight:700;cursor:pointer;display:none">Refresh</button>' +
      '<button id="voidWalletDisconnectBtn" type="button" style="padding:8px 10px;border-radius:10px;background:#0f172a;border:1px solid #334155;color:#e5e7eb;font-weight:700;cursor:pointer;display:none">Disconnect</button>';

    var navHost =
      document.querySelector("body > div[style*='justify-content:space-between'] > div:last-child") ||
      document.querySelector("body > div[style*='justify-content:space-between']") ||
      document.body;

    navHost.appendChild(wrap);

    var c = document.getElementById("voidWalletConnectBtn");
    var rf = document.getElementById("voidWalletRefreshBtn");
    var d = document.getElementById("voidWalletDisconnectBtn");
    if (c) c.addEventListener("click", function(){ connectWallet().catch(function(e){ alert(String((e && e.message) || e)); }); });
    if (rf) rf.addEventListener("click", function(){
      refreshWalletSession()
        .then(function(){ window.location.reload(); })
        .catch(function(e){ alert(String((e && e.message) || e)); });
    });
    if (d) d.addEventListener("click", function(){ disconnectWallet(); });
  }

  window.addEventListener("storage", function(){ rerender(); });
  window.addEventListener("focus", function(){ refreshWalletSession().catch(function(){}); });
  document.addEventListener("visibilitychange", function(){
    if (!document.hidden) refreshWalletSession().catch(function(){});
  });

  if (window.ethereum && window.ethereum.on) {
    try {
      window.ethereum.on("accountsChanged", function(accounts){
        var addr = (Array.isArray(accounts) && accounts.length) ? String(accounts[0]) : "";
        if (valid(addr)) setStored(addr); else clearStored();
        rerender();
      });
      window.ethereum.on("chainChanged", function(){ rerender(); });
    } catch (_) { if (window.console && console.warn) console.warn("VOID_OPS_WC_DEVNET_HTTP_WALLET_EVENTS_VISIBLE", _ && _.message ? _.message : _); }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function(){ mountBar(); refreshWalletSession().catch(function(){ rerender(); }); }, { once:true });
  } else {
    mountBar();
    refreshWalletSession().catch(function(){ rerender(); });
  }
})();
</script>

</body>
</html>`;
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '600',
      'Content-Length': '0',
    });
    res.end();
    return;
  }


  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname || '/';

  // HTML UI
  if (req.method === 'GET' && (pathname === '/' || pathname === '/workcredits/devnet/ui')) {
    log('GET', pathname, '-> ui');
    const html = renderHtmlUi();
    sendHtml(res, 200, html);
    return;
  }

  // Pool JSON
  if (req.method === 'GET' && pathname === '/workcredits/devnet/pool.json') {
    log('GET', pathname, '-> pool native');
    try {
      Promise.resolve()
        .then(() => buildPoolJsonNative())
        .then((obj) => {
          const hist = appendPoolHistorySnapshot(obj);
          obj.history_append = hist;
          sendJson(res, 200, obj);
        })
        .catch((err) => sendErr(res, 500, err));
    } catch (e) {
      sendJson(res, 500, { error: 'pool native failed', details: String((e && e.message) || e) });
    }
    return;
  }

  if (req.method === 'GET' && pathname === '/workcredits/devnet/pool-history.json') {
    log('GET', pathname, '-> pool history');
    try {
      const items = readPoolHistorySnapshots();
      sendJson(res, 200, {
        ok: true,
        chain: 'devnet',
        count: items.length,
        points: items,
        file: poolHistoryFile(),
        retention_days: 35
      });
    } catch (e) {
      sendJson(res, 500, { ok: false, error: 'pool history failed', details: String((e && e.message) || e) });
    }
    return;
  }

  // Account JSON
  const accountMatch = pathname.match(/^\/workcredits\/devnet\/account\/(0x[0-9a-fA-F]{40})\.json$/);
  if (req.method === 'GET' && accountMatch) {
    const addr = accountMatch[1];
    log('GET', pathname, '-> account native for addr', addr);
    buildAccountJsonNative(addr)
      .then((body) => sendJson(res, 200, body))
      .catch((e) => sendJson(res, 500, { error: 'account native failed', address: addr, details: String((e && e.message) || e) }));
    return;
  }

  // Dashboard JSON (pool + account)
  const dashMatch = pathname.match(/^\/workcredits\/devnet\/dashboard\/(0x[0-9a-fA-F]{40})\.json$/);
  if (req.method === 'GET' && dashMatch) {
    const addr = dashMatch[1];
    log('GET', pathname, '-> dashboard native for addr', addr);
    Promise.all([
      Promise.resolve().then(() => buildPoolJsonNative()),
      buildAccountJsonNative(addr)
    ])
      .then(([pool, account]) => {
        sendJson(res, 200, {
          chain: pool.chain || account.chain || 'devnet',
          address: addr,
          pool,
          account,
        });
      })
      .catch((e) => sendJson(res, 500, { error: 'dashboard native failed', address: addr, details: String((e && e.message) || e) }));
    return;
  }

  // Fallback
  log('GET', pathname, '-> 404');
  sendText(res, 404, 'Not found');
});

server.listen(PORT, () => {
  log('ROOT=' + ROOT);
  log('PORT=' + PORT);
  log('listening on http://127.0.0.1:' + PORT);

  const SAMPLE_MS = Math.max(15000, Number(process.env.WC_POOL_HISTORY_SAMPLE_MS || 60000) || 60000);
  let sampling = false;

  async function samplePoolHistoryTick() {
    if (sampling) return;
    sampling = true;
    try {
      const obj = await buildPoolJsonNative();
      const hist = appendPoolHistorySnapshot(obj);
      if (hist && hist.ok) {
        log('pool-history sample ok', hist.file, String(hist.ts));
      } else {
        log('pool-history sample skipped/fail', JSON.stringify(hist || {}));
      }
    } catch (e) {
      log('pool-history sample failed', String((e && e.message) || e));
    } finally {
      sampling = false;
    }
  }

  setTimeout(samplePoolHistoryTick, 2500);
  setInterval(samplePoolHistoryTick, SAMPLE_MS);
  log('pool-history sampler enabled every ' + SAMPLE_MS + 'ms');
});
