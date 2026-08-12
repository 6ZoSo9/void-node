#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_PREMINE_PURPOSE_VAULT_TARGET_V1,
  canonicalJson,
  deriveBtcVoidBuybackLotV1,
  validatePurposeVaultTargetV1,
} from "../tools/void-btc-void-market-maker-reserve-policy-v1.mjs";

function request(overrides = {}) {
  const base = {
    schema: "void.btc_void.reserve_recycling_request.v1",
    settlement: {
      source_sale_id:
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      direction: "btc_to_void",
      status: "settled",
      btc_received_sats: "1000000",
      void_sold_atomic: "2000000",
      observed_bitcoin_confirmations: 6,
      required_bitcoin_confirmations: 6,
    },
    policy: {
      minimum_spread_bps: 200,
      bitcoin_network_fee_reserve_sats: "10000",
    },
  };
  return {
    ...base,
    ...overrides,
    settlement: { ...base.settlement, ...(overrides.settlement || {}) },
    policy: { ...base.policy, ...(overrides.policy || {}) },
  };
}

const allocation = validatePurposeVaultTargetV1();
assert.equal(allocation.allocation_conserved, true);
assert.equal(
  allocation.amounts_void.total_premine,
  VOID_PREMINE_PURPOSE_VAULT_TARGET_V1.amounts_void.total_premine,
);
assert.deepEqual(allocation.amounts_void, {
  core_void_treasury: "308207333",
  presale_inventory_vault: "10000000",
  btc_void_market_vault: "10000000",
  ops_treasury: "5000000",
  previously_distributed_or_unreconciled: "126000",
  total_premine: "333333333",
});
assert.equal(allocation.transition_basis_void.planned_ops_treasury_top_up, "4000000");
assert.deepEqual(allocation.funding_readiness, {
  current_balance_reconciliation_required: true,
  unexplained_balance_must_be_resolved: true,
  final_vault_identity_and_controls_required: true,
  canary_transfer_receipt_required: true,
  full_target_delta_funded_after_gates: true,
  funding_does_not_activate_use: true,
});
assert.deepEqual(allocation.authority, {
  source_only_target: true,
  wallet_or_signer_accessed: false,
  treasury_transfer_authorized: false,
  transaction_constructed: false,
  transaction_broadcast: false,
  funds_moved: false,
});

const allocationDoc = fs.readFileSync(
  "docs/operators/void-purpose-vault-allocation-v1.md",
  "utf8",
);
for (const expected of [
  "VOID_PREMINE_PURPOSE_VAULT_TARGET_V1",
  "308,207,333",
  "10,000,000",
  "5,000,000",
  "126,000",
  "333,333,333",
  "verified target delta in one controlled funding event",
  "Funding does not activate use",
  "No wallet, signer, transaction, treasury transfer, or fund movement is authorized",
]) {
  assert.ok(allocationDoc.includes(expected), `allocation doc missing ${expected}`);
}

const original = request();
const before = structuredClone(original);
const lot = deriveBtcVoidBuybackLotV1(original);
assert.deepEqual(original, before);
assert.equal(lot.schema, "void.btc_void.buyback_lot_plan.v1");
assert.equal(
  lot.marker,
  "VOID_BTC_VOID_MARKET_MAKER_RESERVE_POLICY_V1",
);
assert.equal(lot.market.pricing_basis, "native_btc_sats_per_native_void_atomic_only");
assert.equal(lot.market.fiat_or_usd_value_used, false);
assert.equal(lot.market.external_price_oracle_used, false);
assert.equal(
  lot.reserve_recycling.confirmed_btc_added_to_market_reserve_sats,
  "1000000",
);
assert.equal(lot.reserve_recycling.automatic_bid_budget_sats, "970200");
assert.equal(lot.reserve_recycling.bitcoin_network_fee_reserve_sats, "10000");
assert.equal(lot.reserve_recycling.retained_spread_equity_sats, "19800");
assert.equal(lot.reserve_recycling.automatic_ops_treasury_sweep_sats, "0");
assert.equal(lot.reserve_recycling.proceeds_conserved, true);
assert.equal(lot.buyback_lot.target_void_atomic, "2000000");
assert.equal(lot.buyback_lot.maximum_btc_out_sats, "970200");
assert.equal(
  lot.buyback_lot.full_source_lot_round_trip_btc_out_lt_btc_received,
  true,
);
assert.ok(
  BigInt(lot.buyback_lot.maximum_btc_out_sats) <
    BigInt(lot.source.settlement.btc_received_sats),
);
assert.equal(lot.lifecycle.pending_or_unconfirmed_btc_bid_eligible, false);
assert.equal(lot.lifecycle.settled_confirmed_btc_bid_eligible, true);
assert.equal(lot.lifecycle.duplicate_source_sale_creates_second_lot, false);
assert.equal(lot.lifecycle.completed_buyback_returns_void_to_market_inventory, true);
assert.equal(
  lot.lifecycle.opening_bid_requires_existing_confirmed_btc_or_first_confirmed_sale,
  true,
);
assert.equal(lot.lifecycle.opening_btc_seed_authorized_by_this_plan, false);
assert.deepEqual(lot.authority, {
  source_only_plan: true,
  reserve_state_mutated: false,
  inventory_reserved: false,
  wallet_or_signer_accessed: false,
  transaction_constructed: false,
  transaction_broadcast: false,
  ops_treasury_sweep_authorized: false,
  leverage_or_credit_authorized: false,
  funds_moved: false,
});
assert.match(lot.buyback_lot_id, /^sha256:[0-9a-f]{64}$/);
assert.equal(
  lot.buyback_lot_id,
  "sha256:a4d2c13a02f1849f93c670ea2660ac22a4da6a088983ab9e7e75ce45ce80fadb",
);

const nativePairOnlyExample = deriveBtcVoidBuybackLotV1(
  request({
    settlement: {
      btc_received_sats: "100000000",
      void_sold_atomic: "100000000000000000000",
    },
    policy: {
      minimum_spread_bps: 100,
      bitcoin_network_fee_reserve_sats: "0",
    },
  }),
);
assert.equal(
  nativePairOnlyExample.buyback_lot.maximum_btc_out_sats,
  "99000000",
);
assert.equal(
  nativePairOnlyExample.buyback_lot.target_void_atomic,
  "100000000000000000000",
);

const reordered = {
  policy: structuredClone(original.policy),
  settlement: structuredClone(original.settlement),
  schema: original.schema,
};
assert.equal(
  deriveBtcVoidBuybackLotV1(reordered).buyback_lot_id,
  lot.buyback_lot_id,
);
assert.equal(canonicalJson({ z: 1, a: 2 }), '{"a":2,"z":1}');
assert.notEqual(
  deriveBtcVoidBuybackLotV1(
    request({ settlement: { btc_received_sats: "1000001" } }),
  ).buyback_lot_id,
  lot.buyback_lot_id,
);

assert.throws(
  () => deriveBtcVoidBuybackLotV1({ ...request(), extra: true }),
  /keys mismatch/,
);
assert.throws(
  () => deriveBtcVoidBuybackLotV1({ ...request(), usd_price: "100000" }),
  /keys mismatch/,
);
assert.throws(
  () =>
    deriveBtcVoidBuybackLotV1(
      request({ policy: { usd_value_cents: "100" } }),
    ),
  /keys mismatch/,
);
assert.throws(
  () =>
    deriveBtcVoidBuybackLotV1(
      request({ settlement: { status: "source_confirmed" } }),
    ),
  /not bid-eligible/,
);
assert.throws(
  () =>
    deriveBtcVoidBuybackLotV1(
      request({ settlement: { observed_bitcoin_confirmations: 5 } }),
    ),
  /insufficient Bitcoin confirmations/,
);
assert.throws(
  () =>
    deriveBtcVoidBuybackLotV1(
      request({ settlement: { direction: "void_to_btc" } }),
    ),
  /only settled BTC-to-VOID sales/,
);
assert.throws(
  () =>
    deriveBtcVoidBuybackLotV1(
      request({ settlement: { source_sale_id: "not-a-digest" } }),
    ),
  /canonical sha256 identity/,
);
assert.throws(
  () =>
    deriveBtcVoidBuybackLotV1(
      request({ settlement: { btc_received_sats: 1000000 } }),
    ),
  /canonical decimal string/,
);
assert.throws(
  () =>
    deriveBtcVoidBuybackLotV1(request({ policy: { minimum_spread_bps: 0 } })),
  /integer range/,
);
assert.throws(
  () =>
    deriveBtcVoidBuybackLotV1(
      request({ policy: { minimum_spread_bps: 5001 } }),
    ),
  /integer range/,
);
assert.throws(
  () =>
    deriveBtcVoidBuybackLotV1(
      request({ policy: { bitcoin_network_fee_reserve_sats: "1000000" } }),
    ),
  /exhausts sale proceeds/,
);
assert.throws(
  () =>
    deriveBtcVoidBuybackLotV1(
      request({ schema: "void.btc_void.reserve_recycling_request.v2" }),
    ),
  /schema mismatch/,
);

const marketDoc = fs.readFileSync(
  "docs/public/btc-void-market-maker-reserve-policy-v1.md",
  "utf8",
);
for (const expected of [
  "VOID_BTC_VOID_MARKET_MAKER_RESERVE_POLICY_V1",
  "confirmed BTC",
  "buyback lot",
  "2%",
  "No USD",
  "100 VOID for 1 BTC",
  "automatic_ops_treasury_sweep_sats: 0",
  "creates the first buyback budget",
  "separately approved native-BTC seed",
  "no leverage",
  "no wallet or signer access",
]) {
  assert.ok(marketDoc.includes(expected), `market doc missing ${expected}`);
}

const architectureDoc = fs.readFileSync(
  "docs/public/btc-void-native-atomic-market-v1.md",
  "utf8",
);
for (const expected of [
  "VOID_BTC_VOID_MARKET_MAKER_RESERVE_POLICY_V1",
  "satoshis per native VOID atomic unit",
  "not automatically swept to OpsTreasury",
  "btc-void-market-maker-reserve-policy-v1.md",
]) {
  assert.ok(
    architectureDoc.includes(expected),
    `architecture doc missing ${expected}`,
  );
}

const workflowDoc = fs.readFileSync(
  ".github/workflows/void-btc-void-market-maker-reserve-policy-v1.yml",
  "utf8",
);
for (const expected of [
  "node --check tools/void-btc-void-market-maker-reserve-policy-v1.mjs",
  "node --check scripts/prove_void_btc_void_market_maker_reserve_policy_v1.mjs",
  "node scripts/prove_void_btc_void_market_maker_reserve_policy_v1.mjs",
]) {
  assert.ok(workflowDoc.includes(expected), `workflow missing ${expected}`);
}
assert.equal(workflowDoc.includes("market_maker-reserve_policy"), false);

process.stdout.write(
  JSON.stringify({
    marker: "VOID_BTC_VOID_MARKET_MAKER_RESERVE_POLICY_V1_PROOF_GREEN",
    status: "green",
    premine_allocation_conserved: true,
    presale_inventory_vault_void: "10000000",
    btc_void_market_vault_void: "10000000",
    ops_treasury_target_void: "5000000",
    confirmed_btc_recycled_to_bid_reserve: true,
    source_sale_btc_sats: lot.source.settlement.btc_received_sats,
    buyback_budget_sats: lot.buyback_lot.maximum_btc_out_sats,
    lower_effective_buyback_price: true,
    fiat_or_usd_value_used: false,
    external_price_oracle_used: false,
    automatic_ops_sweep: false,
    funding_readiness_gated: true,
    funding_does_not_activate_use: true,
    opening_bid_requires_existing_confirmed_btc_or_first_confirmed_sale: true,
    opening_btc_seed_authorized: false,
    reserve_state_mutated: false,
    wallet_or_signer_accessed: false,
    transaction_constructed: false,
    transaction_broadcast: false,
    funds_moved: false,
  }) + "\n",
);
