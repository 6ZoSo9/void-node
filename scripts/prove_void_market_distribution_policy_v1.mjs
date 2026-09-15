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
assert.equal(fixture.scope, "market_policy_overlay_only");
assert.equal(fixture.supply.max_supply_void, "666666666");
assert.equal(fixture.supply.premine_void, "333333333");
assert.equal(fixture.supply.emissions_void, "333333333");
assert.equal(fixture.supply.emissions_horizon_years, 100);
assert.equal(fixture.approved_economic_lanes_void, "40000000");

assert.equal(fixture.launch_order.presale_first, true);
assert.equal(fixture.launch_order.approved_markets_activate_before_presale_closeout, false);
assert.equal(fixture.launch_order.presale_closeout_auto_activates_markets, false);

assert.equal(fixture.presale.unchanged_existing_lane, true);
assert.equal(fixture.presale.inventory_void, "10000000");
assert.equal(fixture.presale.market_price_authority, false);

assert.equal(fixture.wc_void.approved, true);
assert.equal(fixture.wc_void.protocol_seed_void, "10000000");
assert.equal(fixture.wc_void.protocol_seed_wc, "0");
assert.equal(fixture.wc_void.fixed_conversion, false);
assert.equal(fixture.wc_void.fixed_opening_price, false);
assert.equal(fixture.wc_void.opening_price_source, "market_discovery");
assert.equal(fixture.wc_void.quote_asset_supplied_by_market, true);
assert.equal(fixture.wc_void.activation_after_presale_closeout_only, true);

assert.equal(fixture.btc_void.approved, true);
assert.equal(fixture.btc_void.protocol_seed_void, "10000000");
assert.equal(fixture.btc_void.protocol_seed_btc, "0");
assert.equal(fixture.btc_void.fixed_opening_price, false);
assert.equal(fixture.btc_void.opening_price_source, "market_discovery");
assert.equal(fixture.btc_void.quote_asset_supplied_by_market, true);
assert.equal(fixture.btc_void.activation_after_presale_closeout_only, true);

assert.equal(fixture.eth_void.approved, true);
assert.equal(fixture.eth_void.protocol_seed_void, "10000000");
assert.equal(fixture.eth_void.protocol_seed_eth, "0");
assert.equal(fixture.eth_void.fixed_opening_price, false);
assert.equal(fixture.eth_void.opening_price_source, "market_discovery");
assert.equal(fixture.eth_void.quote_asset_supplied_by_market, true);
assert.equal(fixture.eth_void.activation_after_presale_closeout_only, true);

assert.equal(fixture.market_pool_policy.protocol_void_locked_while_active, true);
assert.equal(fixture.market_pool_policy.operator_discretionary_withdrawal, false);
assert.equal(fixture.market_pool_policy.operator_manual_price_authority, false);
assert.equal(fixture.market_pool_policy.dynamic_pricing_after_opening, true);
assert.deepEqual(fixture.market_pool_policy.dynamic_price_state_inputs, [
  "approved_market_mechanism",
  "actual_market_state",
  "real_reserves",
]);
assert.equal(fixture.market_pool_policy.cross_market_inventory_backing, false);
assert.equal(fixture.market_pool_policy.lock_mechanism_separately_gated, true);
assert.equal(fixture.market_pool_policy.emergency_or_closeout_requires_separate_authorization, true);

assert.equal(fixture.usdc_void_candidate.approved, false);
assert.equal(fixture.usdc_void_candidate.allocated_void, "0");
assert.equal(fixture.usdc_void_candidate.activated, false);
assert.equal(fixture.usdc_void_candidate.contemplated_seed_void, "10000000");
assert.equal(fixture.usdc_void_candidate.contemplated_seed_usdc, "0");
assert.equal(fixture.usdc_void_candidate.contemplated_fixed_opening_price, false);
assert.equal(fixture.usdc_void_candidate.contemplated_opening_price_source, "market_discovery");
assert.equal(fixture.usdc_void_candidate.would_raise_total_economic_lanes_void_to, "50000000");

assert.equal(fixture.solvency.virtual_quote_reserve_spendable, false);
assert.equal(fixture.solvency.real_wc_only_for_wc_payout, true);
assert.equal(fixture.solvency.real_btc_only_for_btc_payout, true);
assert.equal(fixture.solvency.real_eth_only_for_eth_payout, true);
assert.equal(fixture.solvency.cross_market_quote_reserve_backing, false);
assert.equal(fixture.solvency.presale_usdc_is_market_backing, false);

assert.equal(fixture.legacy.historical_presale_artifacts_preserved, true);
assert.equal(fixture.legacy.historical_fixed_wc_rate_artifacts_are_current_market_price_authority, false);
assert.equal(fixture.legacy.preserve_historical_evidence, true);

for (const [key, value] of Object.entries(fixture.authority)) {
  assert.equal(value, false, `authority.${key} must remain false`);
}

const policy = read("docs/architecture/void-market-distribution-policy-v1.md");
assert.match(policy, /existing presale lane is unchanged by this policy/);
assert.match(policy, /The presale comes first/);
assert.match(policy, /WC\/VOID \| `10,000,000 VOID` \| `0 WC`/);
assert.match(policy, /BTC\/VOID \| `10,000,000 VOID` \| `0 BTC`/);
assert.match(policy, /ETH\/VOID \| `10,000,000 VOID` \| `0 ETH`/);
assert.match(policy, /None of the three approved market pairs has a fixed opening price/);
assert.match(policy, /Locked market pools and dynamic adjustment/);
assert.match(policy, /its dedicated\n`10,000,000 VOID` protocol inventory is locked to that market pool/);
assert.match(policy, /operator has no discretionary pool-withdrawal authority/);
assert.match(policy, /operator has no manual price-setting, price-reset, or peg authority/);
assert.match(policy, /market price adjusts automatically from the approved market mechanism/);
assert.match(policy, /canonical approved total remains\n`40,000,000 VOID`/);
assert.match(policy, /USDC\/VOID candidate -- not approved/);
assert.match(policy, /allocated VOID: `0`/);
assert.match(policy, /would become `50,000,000 VOID`/);

const purpose = read("docs/operators/void-purpose-vault-allocation-v1.md");
assert.match(purpose, /`PresaleInventoryVault` \| 10,000,000/);
assert.match(purpose, /`BTCVoidMarketVault` \| 10,000,000/);
assert.match(purpose, /\$0\.50-per-VOID/);

const amendment = read("docs/operators/void-purpose-vault-allocation-eth-market-amendment-v1.md");
assert.match(amendment, /VOID_PREMINE_PURPOSE_VAULT_MARKET_EXPANSION_AMENDMENT_V1/);
assert.match(amendment, /Core `VoidTreasury` reserve \| 287,073,333/);
assert.match(amendment, /`PresaleInventoryVault` \| 10,000,000/);
assert.match(amendment, /`WCVoidMarketVault` \| 10,000,000/);
assert.match(amendment, /`BTCVoidMarketVault` \| 10,000,000/);
assert.match(amendment, /`ETHVoidMarketVault` \| 10,000,000/);
assert.match(amendment, /40,000,000 VOID/);
assert.match(amendment, /combined future target delta is `46,134,000 VOID`/);
assert.match(amendment, /WC\/VOID, BTC\/VOID, and ETH\/VOID must remain inactive until formal presale/);
assert.match(amendment, /USDC\/VOID market remains under consideration only/);
assert.match(amendment, /Current allocation is `0 VOID`/);

const audit = read("docs/architecture/void-presale-market-separation-audit-v1.md");
assert.match(audit, /VOID_PRESALE_MARKET_SEPARATION_AUDIT_V1/);
assert.match(audit, /presale lane stays exactly as it is/);
assert.match(audit, /The presale comes first because it is the funding lane/);
assert.match(audit, /WC\/VOID: `10,000,000 VOID`, `0 WC`/);
assert.match(audit, /BTC\/VOID: `10,000,000 VOID`, `0 BTC`/);
assert.match(audit, /ETH\/VOID: `10,000,000 VOID`, `0 ETH`/);
assert.match(audit, /four approved\neconomic lanes account for `40,000,000 VOID`/);
assert.match(audit, /USDC\/VOID remains undecided/);
assert.match(audit, /`0 VOID` allocated/);

console.log("VOID_MARKET_DISTRIBUTION_POLICY_V1_PROOF_GREEN");
