'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const PORT = Number(process.env.WC_RELAYER_PORT || '4313');
const HOST = String(process.env.WC_RELAYER_HOST || '0.0.0.0');
const HELPER = process.env.WC_HELPER_BASE || 'http://127.0.0.1:4312/workcredits/devnet';
const NODE_BASE = process.env.NODE_BASE || 'http://127.0.0.1:4100';
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
const ROOT = process.env.ROOT || process.cwd();
const ANVIL_PK = process.env.ANVIL_PK || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const DEFAULT_WALLET = (process.env.WC_RELAYER_WALLET || '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266').toLowerCase();
const DEFAULT_SLIPPAGE_BPS = Number(process.env.WC_RELAYER_MAX_SLIPPAGE_BPS || '50');

async function j(url, opts) {
  const r = await fetch(url, opts);
  const t = await r.text();
  let body;
  try { body = JSON.parse(t); } catch { body = { ok:false, status:r.status, raw:t }; }
  if (!r.ok && !(body && typeof body === 'object' && 'status' in body)) body.status = r.status;
  return body;
}

function send(res, status, obj) {
  const body = JSON.stringify(obj, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', c => {
      buf += c;
      if (buf.length > 1024 * 1024) {
        reject(new Error('body_too_large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!buf.trim()) return resolve({});
      try { resolve(JSON.parse(buf)); }
      catch { reject(new Error('invalid_json')); }
    });
    req.on('error', reject);
  });
}

function execFileP(cmd, args, opts) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, {
      cwd: ROOT,
      timeout: 20000,
      maxBuffer: 1024 * 1024,
      env: {
        ...process.env,
        HOME: process.env.HOME || '',
        PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
        LANG: 'C.UTF-8',
        LC_ALL: 'C.UTF-8',
      },
      ...(opts || {}),
    }, (err, stdout, stderr) => {
      const out = String(stdout || '');
      const errTxt = String(stderr || '');
      if (err) {
        err.stdout = out;
        err.stderr = errTxt;
        reject(err);
        return;
      }
      resolve(out.trim());
    });
  });
}

function firstToken(s) {
  return String(s || '').trim().split(/\s+/)[0] || '0';
}

function parseRaw(out) {
  const tok = firstToken(out);
  if (/^0x[0-9a-fA-F]+$/.test(tok)) return BigInt(tok).toString();
  if (/^-?\d+$/.test(tok)) return BigInt(tok).toString();
  return '0';
}

function format18(raw) {
  const s = String(raw || '0').trim();
  if (!/^-?\d+$/.test(s)) return 0;
  const neg = s.startsWith('-');
  const n = neg ? s.slice(1) : s;
  const whole = n.length > 18 ? n.slice(0, -18) : '0';
  const frac0 = n.length > 18 ? n.slice(-18) : n.padStart(18, '0');
  const frac = frac0.replace(/0+$/, '');
  const out = frac ? (whole + '.' + frac) : whole;
  return Number((neg ? '-' : '') + out);
}

function parseHumanToRaw18(v) {
  const s = String(v == null ? '0' : v).trim();
  if (!/^\d+(\.\d+)?$/.test(s)) throw new Error('invalid_decimal_amount');
  let [whole, frac = ''] = s.split('.');
  frac = (frac + '000000000000000000').slice(0, 18);
  return (BigInt(whole) * (10n ** 18n) + BigInt(frac)).toString();
}

function applySlippage(rawOut, bps) {
  const n = BigInt(String(rawOut || '0'));
  const keep = BigInt(10000 - Math.max(0, Math.min(5000, Number(bps || 0))));
  return ((n * keep) / 10000n).toString();
}

async function castCall(to, sig, args) {
  const argv = ['call', to, sig, ...(args || []), '--rpc-url', RPC_URL];
  const out = await execFileP('cast', argv);
  return out;
}

async function castSend(to, sig, args = []) {
  const cmd = ['send', to, sig, ...args.map(String), '--private-key', ANVIL_PK, '--rpc-url', RPC_URL];
  const raw = await execFileP('cast', cmd);
  const m = String(raw || '').match(/transactionHash\s+(0x[a-fA-F0-9]{64})/);
  return {
    ok: true,
    tx_hash: m ? m[1] : null,
    raw
  };
}

async function getPool() {
  return await j(`${HELPER}/pool.json`);
}

async function getDashboard(wallet) {
  return await j(`${HELPER}/dashboard/${encodeURIComponent(wallet)}.json`);
}

function readStateJson() {
  const p = path.join(ROOT, 'docs', 'VOID-DEVNET-PROTOCOL-STATE.json');
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return {}; }
}

async function resolveAddresses(wallet) {
  const [dashboard, poolJson] = await Promise.all([
    getDashboard(wallet).catch(() => null),
    getPool().catch(() => null),
  ]);
  const state = readStateJson();

  const pool =
    (dashboard && dashboard.account && dashboard.account.meta && dashboard.account.meta.pool_address) ||
    (dashboard && dashboard.pool && dashboard.pool.pool && dashboard.pool.pool.address) ||
    state.workCreditsPoolV1 ||
    state.workcreditsPoolV1 ||
    '';

  const wc =
    (dashboard && dashboard.account && dashboard.account.meta && dashboard.account.meta.workcredits_token) ||
    state.workCreditsToken ||
    state.workcreditsToken ||
    '';

  let voidToken =
    (dashboard && dashboard.account && dashboard.account.meta && dashboard.account.meta.void_token) ||
    state.voidToken ||
    state.voidTokenWorkCredits ||
    '';

  if (!voidToken && pool) {
    try {
      voidToken = firstToken(await castCall(pool, 'voidToken()(address)', []));
    } catch {}
  }

  return {
    wallet,
    dashboard: dashboard || null,
    helper_pool: poolJson || null,
    pool: String(pool || ''),
    wc: String(wc || ''),
    voidToken: String(voidToken || ''),
  };
}

async function realQuoteWCToVoid(amountHuman, wallet) {
  const addrs = await resolveAddresses(wallet);
  if (!addrs.pool) throw new Error('missing_pool_address');
  const rawIn = BigInt(String(parseHumanToRaw18(amountHuman)));
  const poolJson = JSON.parse(require('child_process').execFileSync(
    'curl',
    ['-fsS', 'http://127.0.0.1:4312/workcredits/devnet/pool.json'],
    { encoding: 'utf8' }
  ));
  const reserveWc = BigInt(String(poolJson.reserves.wc_raw));
  const reserveVoid = BigInt(String(poolJson.reserves.void_raw));
  if (reserveWc <= 0n || reserveVoid <= 0n) {
    throw new Error('helper pool reserves unavailable');
  }
  let rawOut = (rawIn * reserveVoid) / (reserveWc + rawIn);
  rawOut = (rawOut * 995n) / 1000n;
  return {
    ok: true,
    mode: 'onchain_quote',
    side: 'wc_to_void',
    amount_in: String(amountHuman),
    amount_in_raw: rawIn.toString(),
    amount_out: format18(rawOut),
    amount_out_raw: rawOut.toString(),
    pricing_source: 'helper.pool_json.constant_product_conservative',
    pool_price: addrs.helper_pool && addrs.helper_pool.price ? addrs.helper_pool.price : null,
    pool: addrs.pool,
    wc_token: addrs.wc || null,
    void_token: addrs.voidToken || null,
    helper_pool: addrs.helper_pool || null,
  };
}

async function quote(side, amount, wallet) {
  if (String(side) !== 'wc_to_void') {
    return {
      ok: false,
      error: 'unsupported_side',
      side: String(side || ''),
      supported: ['wc_to_void'],
    };
  }
  return await realQuoteWCToVoid(amount, wallet || DEFAULT_WALLET);
}

async function executeTrade(body) {
  const side = String(body && body.side || '').trim();
  const account = String(body && body.account || process.env.WC_ACCOUNT || process.env.WC_ADDR || '').trim();
  if (!account) return send(res, 400, { ok:false, error:'missing_account' });
  const wallet = String(body && body.wallet || DEFAULT_WALLET).trim().toLowerCase();
  const amountStr = String(body && body.amount != null ? body.amount : '0').trim();
  const slippageBps = Number(body && body.maxSlippageBps != null ? body.maxSlippageBps : DEFAULT_SLIPPAGE_BPS);

  if (side !== 'wc_to_void') {
    return { status: 400, body: { ok:false, error:'unsupported_side', side } };
  }
  if (!/^\d+(\.\d+)?$/.test(amountStr) || Number(amountStr) <= 0) {
    return { status: 400, body: { ok:false, error:'invalid_amount', amount: body && body.amount } };
  }

  const [redeemable, addrs, q] = await Promise.all([
    j(`${NODE_BASE}/wc/redeemable?account=${encodeURIComponent(account)}`),
    resolveAddresses(wallet),
    quote(side, amountStr, wallet),
  ]);

  const redeemableWc = Number(redeemable && redeemable.redeemable || 0);
  if (!(redeemable && redeemable.ok)) {
    return {
      status: 502,
      body: {
        ok:false,
        error:'redeemable_unavailable',
        account,
        node_base: NODE_BASE,
        redeemable_state: redeemable || null
      }
    };
  }

  if (!q || !q.ok) {
    return {
      status: 502,
      body: {
        ok:false,
        error:'quote_failed',
        quote: q || null
      }
    };
  }

  if (!addrs.pool || !addrs.wc || !addrs.voidToken) {
    return {
      status: 500,
      body: {
        ok:false,
        error:'missing_contract_addresses',
        addresses: addrs
      }
    };
  }

  const amountNum = Number(amountStr);
  if (amountNum > redeemableWc) {
    return {
      status: 409,
      body: {
        ok:false,
        error:'insufficient_redeemable_wc',
        account,
        requested_wc: amountNum,
        redeemable_wc: redeemableWc,
        quote: q
      }
    };
  }

  const redeem = await j(`${NODE_BASE}/wc/redeem`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ account, amount: amountNum, wallet })
  });

  if (!(redeem && redeem.ok)) {
    return {
      status: 502,
      body: {
        ok:false,
        error:'redeem_failed',
        account,
        requested_wc: amountNum,
        wallet,
        redeem_result: redeem || null
      }
    };
  }

  const amountInRaw = q.amount_in_raw;
  const quotedOutRaw = q.amount_out_raw;
  const minOutRaw = applySlippage(quotedOutRaw, slippageBps);

  const approveTx = await castSend(addrs.wc, 'approve(address,uint256)', [addrs.pool, amountInRaw]);
  const swapTx = await castSend(addrs.pool, 'swapWcForVoid(uint256,uint256,address)', [amountInRaw, minOutRaw, wallet]);

  const postDashboard = await getDashboard(wallet).catch(() => null);

  return {
    status: 200,
    body: {
      ok: true,
      accepted: true,
      execute: true,
      mode: 'redeem_then_onchain_swap',
      side,
      account,
      wallet,
      requested_wc: amountNum,
      requested_wc_raw: amountInRaw,
      quoted_void: q.amount_out,
      quoted_void_raw: quotedOutRaw,
      min_void_raw: minOutRaw,
      max_slippage_bps: slippageBps,
      pool: addrs.pool,
      wc_token: addrs.wc,
      void_token: addrs.voidToken,
      redeem_result: redeem,
      approve_tx: approveTx,
      swap_tx: swapTx,
      helper_dashboard_before: addrs.dashboard || null,
      helper_dashboard_after: postDashboard || null,
      note: 'Redeem applied locally and on-chain WC->VOID swap executed through VoidWorkCreditsPool.'
    }
  };
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return send(res, 204, { ok:true });

    const u = new URL(req.url, `http://127.0.0.1:${PORT}`);

    if (req.method === 'GET' && u.pathname === '/api/wc-relayer/v1/health') {
      const addrs = await resolveAddresses(DEFAULT_WALLET).catch(() => null);
      return send(res, 200, {
        ok: true,
        service: 'wc-relayer-v1',
        port: PORT,
        helper_base: HELPER,
        node_base: NODE_BASE,
        rpc_url: RPC_URL,
        helper_up: !!(addrs && addrs.helper_pool && addrs.helper_pool.up === 1),
        can_quote: true,
        can_execute: true,
        mode: 'redeem_then_onchain_swap',
        pool: addrs && addrs.pool || null,
        wc_token: addrs && addrs.wc || null,
        void_token: addrs && addrs.voidToken || null,
      });
    }

    if (req.method === 'POST' && u.pathname === '/api/wc-relayer/v1/quote') {
      const body = await readBody(req);
      const amountStr = String(body && body.amount != null ? body.amount : '0').trim();
      const wallet = String(body && body.wallet || DEFAULT_WALLET).trim().toLowerCase();
      const out = await quote(body.side, amountStr, wallet);
      return send(res, out && out.ok ? 200 : 400, out);
    }

    if (req.method === 'POST' && u.pathname === '/api/wc-relayer/v1/execute') {
      const body = await readBody(req);
      const out = await executeTrade(body);
      return send(res, out.status, out.body);
    }

    return send(res, 404, { ok:false, error:'not_found', path:u.pathname });
  } catch (e) {
    return send(res, 500, { ok:false, error:String(e && e.message || e) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[wc-relayer-v1] listening on http://127.0.0.1:${PORT}`);
});
