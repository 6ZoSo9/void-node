#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const fixture = JSON.parse(read("fixtures/economic/void-market-distribution-policy-v1.json"));

assert.equal(fixture.marker, "VOID_MARKET_DISTRIBUTION_POLICY_V1");
assert.equal(fixture.version, 1);
assert.equal(fixture.scope, "distribution_policy_only");

assert.equal(fixture.supply.max_supply_void, "666666666");
assert.equal(fixture.supply.premine_void, "333333333");
assert.equal(fixture.supply.emissions_void, "333333333");
assert.equal(fixture.supply.emissions_horizon_years, 100);

assert.equal(fixture.presale.active, false);
assert.equal(fixture.presale.retired, true);
assert.equal(fixture.presale.fixed_usd_or_usdc_price_authoritative, false);
assert.equal(fixture.presale.new_intake_authorized, false);
assert.equal(fixture.presale.new_fulfillment_authorized, false);

assert.equal(fixture.wc_void.protocol_seed_void, "10000000");
assert.equal(fixture.wc_void.protocol_seed_wc, "0");
assert.equal(fixture.wc_void.fixed_conversion, false);
assert.equal(fixture.wc_void.fixed_opening_price, false);
assert.equal(fixture.wc_void.opening_price_source, "market_discovery");
assert.equal(fixture.wc_void.quote_asset_supplied_by_market, true);

assert.equal(fixture.btc_void.protocol_seed_void, "10000000");
assert.equal(fixture.btc_void.protocol_seed_btc, "0");
assert.equal(fixture.btc_void.fixed_opening_price, false);
assert.equal(fixture.btc_void.opening_price_source, "market_discovery");
assert.equal(fixture.btc_void.quote_asset_supplied_by_market, true);

assert.equal(fixture.eth_void.protocol_seed_void, "10000000");
assert.equal(fixture.eth_void.protocol_seed_eth, "0");
assert.equal(fixture.eth_void.fixed_opening_price, false);
assert.equal(fixture.eth_void.opening_price_source, "market_discovery");
assert.equal(fixture.eth_void.quote_asset_supplied_by_market, true);

assert.equal(fixture.solvency.virtual_quote_reserve_spendable, false);
assert.equal(fixture.solvency.real_wc_only_for_wc_payout, true);
assert.equal(fixture.solvency.real_btc_only_for_btc_payout, true);
assert.equal(fixture.solvency.real_eth_only_for_eth_payout, true);
assert.equal(fixture.solvency.cross_market_quote_reserve_backing, false);

assert.equal(fixture.legacy.preserve_historical_evidence, true);
assert.equal(fixture.legacy.historical_presale_artifacts_are_current_price_authority, false);
assert.equal(fixture.legacy.historical_fixed_wc_rate_artifacts_are_current_price_authority, false);

for (const [key, value] of Object.entries(fixture.authority)) {
  assert.equal(value, false, `authority.${key} must remain false`);
}

const policy = read("docs/architecture/void-market-distribution-policy-v1.md");
assert.match(policy, /fixed-price VOID\npresale is retired/);
assert.match(policy, /WC\/VOID \| `10,000,000 VOID` \| `0 WC`/);
assert.match(policy, /BTC\/VOID \| `10,000,000 VOID` \| `0 BTC`/);
assert.match(policy, /ETH\/VOID \| `10,000,000 VOID` \| `0 ETH`/);
assert.match(policy, /None of the three markets has a fixed opening price/);
assert.match(policy, /Historical source, proof, receipt, and canary artifacts/);

const purpose = read("docs/operators/void-purpose-vault-allocation-v1.md");
assert.match(purpose, /`WCVoidMarketVault` \| 10,000,000/);
assert.match(purpose, /`BTCVoidMarketVault` \| 10,000,000/);
assert.match(purpose, /`ETHVoidMarketVault` \| 10,000,000/);
assert.match(purpose, /Core `VoidTreasury` reserve \| 297,073,333/);
assert.doesNotMatch(purpose, /`PresaleInventoryVault`/);
assert.doesNotMatch(purpose, /\$0\.50-per-VOID/);

const audit = read("docs/architecture/void-presale-fixed-rate-retirement-audit-v1.md");
assert.match(audit, /VOID_PRESALE_FIXED_RATE_RETIREMENT_AUDIT_V1/);
assert.match(audit, /ops\/private\/wc-to-void-settlement-preview-v1\.sh/);
assert.match(audit, /ops\/mainnet0\/wc-devnet-bootstrap-proof\.sh/);
assert.match(audit, /ops\/wc-smoke\.sh/);
assert.match(audit, /Preserve as historical evidence/);
assert.match(audit, /Retire as current economics/);
assert.match(audit, /Reuse rather than delete/);
assert.match(audit, /Disable fixed-price presale public intake and checkout behavior/);

console.log("VOID_MARKET_DISTRIBUTION_POLICY_V1_PROOF_GREEN");
