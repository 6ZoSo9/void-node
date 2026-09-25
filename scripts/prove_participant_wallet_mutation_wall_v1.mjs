#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const walletPath = "src/http/participant_wallet_native_v1.ts";
const indexPath = "src/index.ts";

const wallet = fs.readFileSync(walletPath, "utf8");
const index = fs.readFileSync(indexPath, "utf8");

assert.match(
  index,
  /import "\.\/http\/participant_wallet_native_v1\.js";\s*\/\/ VOID_DIST_START_ESM_IMPORT_GUARD_V1/,
);

assert.match(wallet, /const WALLET_MUTATION_ENABLED_V1 = false;/);
assert.match(
  wallet,
  /const CANONICAL_VOID_TOKEN_V1\s*=\s*"0x470075b85352eb86f7d089fb9ba88945f12aad94";/,
);
assert.match(wallet, /function isLoopbackRequest\(/);
assert.match(wallet, /function loopbackOnly\(/);
assert.doesNotMatch(wallet, /access-control-allow-origin/i);

for (const route of ["create", "import", "unlock", "lock", "send-void"]) {
  const marker = 'app.post("/__void/participant/wallet/' + route + '"';
  const start = wallet.indexOf(marker);
  assert.ok(start >= 0, route + " route missing");
  const window = wallet.slice(start, start + 500);
  assert.match(window, /loopbackOnly\(req, res\)/, route + " loopback wall missing");
  assert.match(
    window,
    /WALLET_MUTATION_ENABLED_V1/,
    route + " mutation wall missing",
  );
}

{
  const marker = 'app.get("/__void/participant/wallet/export"';
  const start = wallet.indexOf(marker);
  assert.ok(start >= 0, "export route missing");
  const window = wallet.slice(start, start + 500);
  assert.match(window, /loopbackOnly\(req, res\)/);
  assert.match(window, /WALLET_MUTATION_ENABLED_V1/);
}

{
  const marker = 'app.get("/__void/participant/wallet/status"';
  const start = wallet.indexOf(marker);
  assert.ok(start >= 0, "status route missing");
  assert.match(wallet.slice(start, start + 300), /loopbackOnly\(req, res\)/);
}

{
  const marker = 'app.post("/__void/participant/wallet/trade/wc-to-void"';
  const start = wallet.indexOf(marker);
  assert.ok(start >= 0, "legacy trade route identity missing");
  const window = wallet.slice(start, start + 700);
  assert.match(window, /legacy_wc_void_route_retired/);
  assert.match(window, /production_wc_void_market_active: false/);
  assert.match(window, /fixed_rate_fallback_allowed: false/);
  assert.match(window, /relayer_trade_allowed: false/);
}

assert.doesNotMatch(wallet, /\/api\/wc-relayer\/v1/);
assert.doesNotMatch(wallet, /build-wallet-trade/);
assert.doesNotMatch(wallet, /nativeTradeWcToVoid/);
assert.doesNotMatch(wallet, /quoted_void_raw/);

assert.match(wallet, /parseUnits\(amount, 18\)/);
assert.doesNotMatch(wallet, /Math\.round\(Number\(amount\) \* 1e18\)/);
assert.doesNotMatch(wallet, /Number\(amount\) \* 1e18/);

assert.match(wallet, /mutation_routes_enabled: WALLET_MUTATION_ENABLED_V1/);
assert.match(wallet, /legacy_wc_void_route_retired: true/);
assert.match(wallet, /canonical_void_token: CANONICAL_VOID_TOKEN_V1/);

console.log("VOID_PARTICIPANT_WALLET_MUTATION_WALL_V1_PROOF_GREEN");
console.log("wallet_module_still_imported=true");
console.log("raw_wallet_routes_loopback_only=true");
console.log("wallet_mutation_routes_enabled=false");
console.log("legacy_wc_void_route_retired=true");
console.log("legacy_wc_relayer_dependency=false");
console.log("canonical_void_token_bound=true");
console.log("send_void_exact_decimal_parse=true");
console.log("public_wallet_mutation_authorized=false");
console.log("funds_moved=false");
