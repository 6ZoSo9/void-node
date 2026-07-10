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
const DEFAULT_REDEEM_FEE_BPS = Number(process.env.WC_RELAYER_REDEEM_FEE_BPS || '50');

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

async function castCalldata(sig, args = []) {
  const argv = ['calldata', sig, ...args.map(String)];
  const out = await execFileP('cast', argv);
  return String(out || '').trim();
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
  const p = process.env.STATE_JSON || process.env.WC_STATE_JSON || path.join(ROOT, 'docs', 'VOID-DEVNET-PROTOCOL-STATE.json');
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
    } catch (e) {
      if (!globalThis.__void_ops_wc_relayer_void_token_seen) {
        globalThis.__void_ops_wc_relayer_void_token_seen = true;
        console.warn("VOID_OPS_WC_RELAYER_VOID_TOKEN_VISIBLE", e && e.message ? e.message : e);
      }
    }
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

async function realQuoteVoidToWC(amountHuman, wallet) {
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
  let rawOut = (rawIn * reserveWc) / (reserveVoid + rawIn);
  rawOut = (rawOut * 995n) / 1000n;
  return {
    ok: true,
    mode: 'onchain_quote',
    side: 'void_to_wc',
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
  const s = String(side || '').trim();
  if (s === 'wc_to_void') {
    return await realQuoteWCToVoid(amount, wallet || DEFAULT_WALLET);
  }
  if (s === 'void_to_wc') {
    return await realQuoteVoidToWC(amount, wallet || DEFAULT_WALLET);
  }
  return {
    ok: false,
    error: 'unsupported_side',
    side: s,
    supported: ['wc_to_void', 'void_to_wc'],
  };
}

async function executeTrade(body) {
  const side = String(body && body.side || '').trim();
  const account = String(body && body.account || process.env.WC_ACCOUNT || process.env.WC_ADDR || '').trim();
  if (!account) return send(res, 400, { ok:false, error:'missing_account' });
  const wallet = String(body && body.wallet || DEFAULT_WALLET).trim().toLowerCase();
  const amountStr = String(body && body.amount != null ? body.amount : '0').trim();
  const slippageBps = Number(body && body.maxSlippageBps != null ? body.maxSlippageBps : DEFAULT_SLIPPAGE_BPS);

  if (side !== 'wc_to_void' && side !== 'void_to_wc') {
    return { status: 400, body: { ok:false, error:'unsupported_side', side, supported: ['wc_to_void', 'void_to_wc'] } };
  }
  if (!/^\d+(\.\d+)?$/.test(amountStr) || Number(amountStr) <= 0) {
    return { status: 400, body: { ok:false, error:'invalid_amount', amount: body && body.amount } };
  }

  const [addrs, q] = await Promise.all([
    resolveAddresses(wallet),
    quote(side, amountStr, wallet),
  ]);

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

  if (side === 'void_to_wc') {
    const amountNum = Number(amountStr);
    const amountInRaw = q.amount_in_raw;
    const quotedOutRaw = q.amount_out_raw;
    const minOutRaw = applySlippage(quotedOutRaw, slippageBps);

    const approveTx = await castSend(addrs.voidToken, 'approve(address,uint256)', [addrs.pool, amountInRaw]);
    const swapTx = await castSend(addrs.pool, 'swapVoidForWc(uint256,uint256,address)', [amountInRaw, minOutRaw, wallet]);

    const postDashboard = await getDashboard(wallet).catch(() => null);

    return {
      status: 200,
      body: {
        ok: true,
        accepted: true,
        execute: true,
        mode: 'onchain_swap',
        side,
        account,
        wallet,
        requested_void: amountNum,
        requested_void_raw: amountInRaw,
        quoted_wc: q.amount_out,
        quoted_wc_raw: quotedOutRaw,
        min_wc_raw: minOutRaw,
        max_slippage_bps: slippageBps,
        pool: addrs.pool,
        wc_token: addrs.wc,
        void_token: addrs.voidToken,
        approve_tx: approveTx,
        swap_tx: swapTx,
        helper_dashboard_before: addrs.dashboard || null,
        helper_dashboard_after: postDashboard || null,
        note: 'On-chain VOID->WC swap executed through VoidWorkCreditsPool.'
      }
    };
  }

  const redeemable = await j(`${NODE_BASE}/wc/redeemable?account=${encodeURIComponent(account)}`);
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


async function executeTradeOnchainOnly(body) {
  const side = String(body && body.side || '').trim();
  const amountStr = String(body && body.amount != null ? body.amount : '0').trim();
  const amountNum = Number(amountStr);
  const account = String(body && body.account || '').trim();
  const wallet = String(body && body.wallet || DEFAULT_WALLET).trim().toLowerCase();
  const slippageBps = Math.max(1, Number(body && body.max_slippage_bps != null ? body.max_slippage_bps : 100) || 100);

  if (side !== 'wc_to_void') {
    return {
      status: 400,
      body: {
        ok: false,
        error: 'unsupported_side_onchain_only',
        mode: 'onchain_only',
        side,
        account,
        wallet,
        note: 'onchain_only is currently supported only for wc_to_void.'
      }
    };
  }

  if (!(Number.isFinite(amountNum) && amountNum > 0)) {
    return {
      status: 400,
      body: {
        ok: false,
        error: 'invalid_amount',
        mode: 'onchain_only',
        side,
        account,
        wallet,
        requested_wc: amountStr
      }
    };
  }

  const addrs = await resolveAddresses(wallet);
  const preDashboard = await getDashboard(wallet).catch(() => null);
  const onchainWc = (
    preDashboard &&
    preDashboard.account &&
    preDashboard.account.balances &&
    Number.isFinite(Number(preDashboard.account.balances.wc))
  )
    ? Number(preDashboard.account.balances.wc)
    : 0;

  if (!(Number.isFinite(onchainWc) && onchainWc >= amountNum)) {
    return {
      status: 409,
      body: {
        ok: false,
        accepted: false,
        execute: false,
        mode: 'onchain_only',
        error: 'insufficient_onchain_wc',
        side,
        account,
        wallet,
        requested_wc: amountNum,
        onchain_wc: onchainWc,
        note: 'On-chain WC is insufficient. Redeem local WC separately first.'
      }
    };
  }

  const q = await quote(side, amountStr, wallet);
  if (!q || !q.ok) {
    return {
      status: 400,
      body: {
        ok: false,
        accepted: false,
        execute: false,
        mode: 'onchain_only',
        error: 'quote_failed',
        side,
        account,
        wallet,
        quote: q || null
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
      mode: 'onchain_only_swap',
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
      approve_tx: approveTx,
      swap_tx: swapTx,
      helper_dashboard_before: preDashboard || null,
      helper_dashboard_after: postDashboard || null,
      note: 'On-chain WC->VOID swap executed without redeem fallback.'
    }
  };
}




async function buildWalletTrade(body) {
  const side = String(body && body.side || '').trim();
  const amountStr = String(body && body.amount != null ? body.amount : '0').trim();
  const amountNum = Number(amountStr);
  const wallet = String(body && body.wallet || '').trim().toLowerCase();
  const slippageBps = Math.max(1, Number(body && body.max_slippage_bps != null ? body.max_slippage_bps : 100) || 100);

  if (side !== 'wc_to_void') {
    return {
      status: 400,
      body: {
        ok:false,
        error:'unsupported_side_wallet_build',
        side,
        wallet,
        note:'Only wallet-signed WC->VOID is wired right now.'
      }
    };
  }
  if (!(Number.isFinite(amountNum) && amountNum > 0)) {
    return {
      status: 400,
      body: {
        ok:false,
        error:'invalid_amount',
        side,
        wallet,
        requested_wc: amountStr
      }
    };
  }
  if (!/^0x[a-f0-9]{40}$/.test(wallet)) {
    return {
      status: 400,
      body: {
        ok:false,
        error:'invalid_wallet',
        side,
        wallet
      }
    };
  }

  const addrs = await resolveAddresses(wallet);
  if (!addrs.pool || !addrs.wc) {
    return {
      status: 500,
      body: {
        ok:false,
        error:'missing_pool_or_wc_token',
        side,
        wallet,
        pool:addrs.pool || null,
        wc_token:addrs.wc || null
      }
    };
  }

  const q = await quote(side, amountStr, wallet);
  if (!q || !q.ok) {
    return {
      status: 400,
      body: {
        ok:false,
        error:'quote_failed',
        side,
        wallet,
        quote:q || null
      }
    };
  }

  const amountInRaw = String(q.amount_in_raw || '0');
  const quotedOutRaw = String(q.amount_out_raw || '0');
  const minOutRaw = applySlippage(quotedOutRaw, slippageBps);

  const approveData = await castCalldata('approve(address,uint256)', [addrs.pool, amountInRaw]);
  const swapData = await castCalldata('swapWcForVoid(uint256,uint256,address)', [amountInRaw, minOutRaw, wallet]);

  return {
    status: 200,
    body: {
      ok:true,
      accepted:true,
      execute:false,
      mode:'wallet_signed_wc_to_void',
      side,
      wallet,
      requested_wc: amountNum,
      requested_wc_raw: amountInRaw,
      quoted_void: q.amount_out,
      quoted_void_raw: quotedOutRaw,
      min_void_raw: minOutRaw,
      max_slippage_bps: slippageBps,
      pool: addrs.pool,
      wc_token: addrs.wc,
      void_token: addrs.voidToken || null,
      approve_tx_request: {
        from: wallet,
        to: addrs.wc,
        data: approveData
      },
      swap_tx_request: {
        from: wallet,
        to: addrs.pool,
        data: swapData
      },
      note:'Wallet must sign approve first, then swap.'
    }
  };
}


async function executeRedeemBridge(body) {
  const amountStr = String(body && body.amount != null ? body.amount : '0').trim();
  const amountNum = Number(amountStr);
  const account = String(body && body.account || '').trim();
  const wallet = String(body && body.wallet || DEFAULT_WALLET).trim().toLowerCase();

  if (!account) {
    return {
      status: 400,
      body: { ok:false, error:'missing_account', note:'account is required.' }
    };
  }
  if (!(Number.isFinite(amountNum) && amountNum > 0)) {
    return {
      status: 400,
      body: { ok:false, error:'invalid_amount', account, wallet, requested_wc: amountStr }
    };
  }
  if (!/^0x[a-f0-9]{40}$/.test(wallet)) {
    return {
      status: 400,
      body: { ok:false, error:'invalid_wallet', account, wallet }
    };
  }

  const localState = await j(`${NODE_BASE}/wc/redeemable?account=${encodeURIComponent(account)}`).catch(() => null);
  const spendable = localState && localState.ok ? Number(localState.redeemable || 0) : 0;
  if (!(Number.isFinite(spendable) && spendable >= amountNum)) {
    return {
      status: 409,
      body: {
        ok:false,
        accepted:false,
        execute:false,
        mode:'redeem_bridge',
        error:'insufficient_local_wc',
        account,
        wallet,
        requested_wc: amountNum,
        local_redeemable: spendable,
        note:'Local spendable WC is insufficient for redeem bridge.'
      }
    };
  }

  const addrs = await resolveAddresses(wallet);
  if (!addrs.wc) {
    return {
      status: 500,
      body: {
        ok:false,
        accepted:false,
        execute:false,
        mode:'redeem_bridge',
        error:'missing_wc_token',
        account,
        wallet
      }
    };
  }

  const grossRaw = BigInt(String(parseHumanToRaw18(amountNum)));
  let feeRaw = (grossRaw * BigInt(Math.max(0, DEFAULT_REDEEM_FEE_BPS))) / 10000n;
  if (feeRaw < 0n) feeRaw = 0n;
  const netRaw = grossRaw - feeRaw;

  if (!(netRaw > 0n)) {
    return {
      status: 400,
      body: {
        ok:false,
        accepted:false,
        execute:false,
        mode:'redeem_bridge',
        error:'amount_too_small_after_fee',
        account,
        wallet,
        requested_wc: amountNum,
        fee_bps: DEFAULT_REDEEM_FEE_BPS
      }
    };
  }

  const beforeDashboard = await getDashboard(wallet).catch(() => null);
  const transferTx = await castSend(addrs.wc, 'transfer(address,uint256)', [wallet, netRaw.toString()]);

  const redeem = await j(`${NODE_BASE}/wc/redeem`, {
    method:'POST',
    headers:{ 'content-type':'application/json' },
    body: JSON.stringify({ account, amount: amountNum, wallet })
  }).catch(() => null);

  if (!(redeem && redeem.ok)) {
    return {
      status: 502,
      body: {
        ok:false,
        accepted:false,
        execute:false,
        mode:'redeem_bridge',
        error:'local_redeem_record_failed_after_transfer',
        account,
        wallet,
        requested_wc: amountNum,
        bridged_wc: format18(netRaw),
        fee_wc: format18(feeRaw),
        transfer_tx: transferTx,
        redeem_result: redeem || null,
        note:'WC transfer succeeded but local redeem record failed.'
      }
    };
  }

  const afterDashboard = await getDashboard(wallet).catch(() => null);

  return {
    status: 200,
    body: {
      ok:true,
      accepted:true,
      execute:true,
      mode:'redeem_bridge',
      account,
      wallet,
      requested_wc: amountNum,
      bridged_wc: format18(netRaw),
      bridged_wc_raw: netRaw.toString(),
      fee_wc: format18(feeRaw),
      fee_wc_raw: feeRaw.toString(),
      fee_bps: DEFAULT_REDEEM_FEE_BPS,
      wc_token: addrs.wc,
      transfer_tx: transferTx,
      local_before: localState || null,
      redeem_result: redeem,
      helper_dashboard_before: beforeDashboard || null,
      helper_dashboard_after: afterDashboard || null,
      note:'Local WC redeemed and net WC transferred on-chain to the wallet. Relayer retained the fee in WC to offset gas.'
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
        can_redeem_bridge: true,
        mode: 'onchain_only_or_redeem_then_onchain_swap',
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

    if (req.method === 'POST' && u.pathname === '/api/wc-relayer/v1/redeem-bridge') {
      const body = await readBody(req);
      const out = await executeRedeemBridge(body);
      return send(res, out.status, out.body);
    }

    if (req.method === 'POST' && u.pathname === '/api/wc-relayer/v1/build-wallet-trade') {
      const body = await readBody(req);
      const out = await buildWalletTrade(body);
      return send(res, out.status, out.body);
    }

    if (req.method === 'POST' && u.pathname === '/api/wc-relayer/v1/execute') {
      const body = await readBody(req);
      const source = String(body && body.source || '').trim().toLowerCase();
      const out = source === 'onchain_only'
        ? await executeTradeOnchainOnly(body)
        : await executeTrade(body);
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
