#!/usr/bin/env node
// VOID_PUBLIC_ECONOMIC_LAUNCH_UI_PROOF_V1
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const paths = {
  app: 'public/void-app-wave1-v1/index.html',
  views: 'public/void-app-wave1-v1/assets/js/views.js',
  buy: 'public/void-app-wave1-v1/assets/js/buy-live.js',
  home: 'ops/public/voidchain-org-wordpress-home-v1.html',
  checkout: 'docs/public/buy-void-public-checkout-contract-v1.md',
};
const entries = await Promise.all(Object.entries(paths).map(async ([key, path]) => [key, await readFile(path, 'utf8')]));
const files = Object.fromEntries(entries);

const receiver = '0x17a26d4f0c51bd28fbcf5cdd4d20853bfa112ae5';
const usdc = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const ethereumUsdc = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

for (const [name, source] of Object.entries({
  views: files.views,
  home: files.home,
  checkout: files.checkout,
})) {
  assert.match(source, /VOID is not listed on any exchange/, `${name} must state exchange listing truth`);
  assert.match(source, /exchange|custodial/i, `${name} must carry exchange custody warning`);
  assert.match(source, /lost/i, `${name} must state loss consequence`);
}
assert.match(files.views, /Ethereum mainnet native USDC is policy-approved, but the current purchase-request flow accepts Base only/);
assert.match(files.home, /Ethereum native USDC is policy-approved but must not be sent until the site explicitly marks that rail OPEN/);
assert.match(files.checkout, /This checkout remains Base-only/);
assert.ok(files.checkout.includes(ethereumUsdc), 'checkout contract must identify canonical Ethereum USDC without presenting it as active');


for (const token of [
  receiver,
  usdc,
  "BUY_REQUEST_ENDPOINT = '/__void/buy-void/request'",
  "method: 'POST'",
  'config.requests_enabled === true',
  'snapshot.status.request_intake_ready === true',
  'snapshot.sale.sold_out === false',
  'snapshot.sale.remaining_void > 0',
  'payment_sender_must_equal_void_destination',
  'do_not_send_from_exchange',
  'do_not_send_from_exchange_or_pooled_custody',
  'VOID cannot recover exchange/custodial sends',
]) {
  assert.ok(files.buy.includes(token), `buy-live missing: ${token}`);
}

for (const forbidden of [
  'window.ethereum',
  'eth_sendTransaction',
  'personal_sign',
  'eth_requestAccounts',
  'wallet_requestPermissions',
]) {
  assert.ok(!files.buy.includes(forbidden), `Buy UI must not gain browser-wallet authority: ${forbidden}`);
}

assert.match(files.views, /Earn Work Credits — not VOID directly/);
assert.match(files.views, /market-determined price/);
assert.match(files.views, /The fixed \$0\.50 presale price does not set the WC\/VOID exchange rate/);
assert.match(files.views, /WC\/VOID trading is not open from this page/);
assert.match(files.views, /there is no fixed 100 WC = 1 VOID redemption/);
assert.match(files.app, /href="#\/market"/);
assert.match(files.app, /assets\/js\/buy-live\.js/);

for (const path of ['#/buy', '#/earn', '#/market']) {
  assert.ok(files.home.includes(path), `WordPress home missing economic launch link ${path}`);
}
assert.match(files.home, /PRESALE \/ ACTIVATION-GATED/);
assert.match(files.home, /WC \/ VOID \/ ACTIVATION-GATED/);

console.log('VOID_PUBLIC_ECONOMIC_LAUNCH_UI_PROOF_V1_GREEN');
console.log('presale_request_ui_activation_gated=true');
console.log('exchange_custody_loss_warning=true');
console.log('browser_wallet_send=false');
console.log('wc_earn_not_void_direct=true');
console.log('wc_void_market_trade_ui=false');
console.log('wc_void_price_market_determined=true');
