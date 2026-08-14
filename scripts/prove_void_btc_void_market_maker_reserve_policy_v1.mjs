#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  VOID_BTC_VOID_V1_MINIMUM_SPREAD_BPS,
  VOID_PREMINE_PURPOSE_VAULT_TARGET_V1,
  canonicalJson,
  deriveBtcVoidBuybackLotV1,
  validatePurposeVaultTargetV1,
} from "../tools/void-btc-void-market-maker-reserve-policy-v1.mjs";

function contentId(value) {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(canonicalJson(value)).digest("hex")
  );
}

function sourceSaleId(settlement) {
  return contentId({
    schema: "void.btc_void.source_sale_receipt.v1",
    direction: settlement.direction,
    bitcoin_network: settlement.bitcoin_network,
    bitcoin_funding_txid: settlement.bitcoin_funding_txid,
    bitcoin_funding_vout: settlement.bitcoin_funding_vout,
    void_chain_id: settlement.void_chain_id,
    void_network_identity: settlement.void_network_identity,
    void_settlement_receipt_id: settlement.void_settlement_receipt_id,
    btc_received_sats: settlement.btc_received_sats,
    void_sold_atomic: settlement.void_sold_atomic,
  });
}

function request(overrides = {}) {
  const baseSettlement = {
    direction: "btc_to_void",
    status: "settled",
    bitcoin_network: "bitcoin_mainnet",
    bitcoin_funding_txid: "11".repeat(32),
    bitcoin_funding_vout: 1,
    bitcoin_confirmed_block_hash: "44".repeat(32),
    bitcoin_confirmed_block_height: 800000,
    bitcoin_observed_tip_hash: "55".repeat(32),
    bitcoin_observed_tip_height: 800005,
    void_chain_id: 2050,
    void_network_identity: "mainnet0",
    void_settlement_receipt_id: "sha256:" + "22".repeat(32),
    btc_received_sats: "1000000",
    void_sold_atomic: "2000000",
    observed_bitcoin_confirmations: 6,
    required_bitcoin_confirmations: 6,
  };
  const { source_sale_id: suppliedSourceSaleId, ...settlementOverrides } =
    overrides.settlement || {};
  const settlement = { ...baseSettlement, ...settlementOverrides };
  return {
    schema: overrides.schema || "void.btc_void.reserve_recycling_request.v1",
    ...overrides,
    settlement: {
      source_sale_id: suppliedSourceSaleId || sourceSaleId(settlement),
      ...settlement,
    },
    policy: {
      minimum_spread_bps: VOID_BTC_VOID_V1_MINIMUM_SPREAD_BPS,
      bitcoin_network_fee_reserve_sats: "10000",
      ...(overrides.policy || {}),
    },
  };
}

const allocation = validatePurposeVaultTargetV1();
assert.equal(allocation.allocation_conserved, true);
assert.equal(
  allocation.amounts_void.total_premine,
  VOID_PREMINE_PURPOSE_VAULT_TARGET_V1.amounts_void.total_premine,
);
assert.deepEqual(allocation.amounts_void, {
  core_void_treasury: "307073333",
  presale_inventory_vault: "10000000",
  btc_void_market_vault: "10000000",
  ops_treasury: "5000000",
  validator_stake_target: "1260000",
  total_premine: "333333333",
});
assert.deepEqual(allocation.transition_basis_void, {
  reconciled_void_treasury: "333207333",
  reconciled_ops_treasury: "0",
  reconciled_validator_stake: "126000",
  planned_presale_inventory_funding: "10000000",
  planned_btc_void_market_funding: "10000000",
  planned_ops_treasury_funding: "5000000",
  planned_validator_stake_delta: "1134000",
  combined_future_treasury_delta: "26134000",
});
assert.deepEqual(allocation.funding_readiness, {
  current_balance_reconciliation_required: true,
  canonical_custody_snapshot_required: true,
  final_vault_identity_and_controls_required: true,
  validator_target_mechanism_review_required: true,
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
  "307,073,333",
  "10,000,000",
  "5,000,000",
  "1,260,000",
  "1,134,000",
  "126,000",
  "333,333,333",
  "verified target delta in one controlled funding event",
  "Funding does not activate use",
  "No wallet, signer, transaction, treasury transfer, validator top-up, or fund",
]) {
  assert.ok(allocationDoc.includes(expected), `allocation doc missing ${expected}`);
}

const allocationSnapshot = JSON.parse(
  fs.readFileSync(
    "ops/mainnet/mainnet0-premine-allocation.current.json",
    "utf8",
  ),
);
assert.equal(
  allocationSnapshot.marker,
  "VOID_MAINNET0_PREMINE_ALLOCATION_CURRENT_V1",
);
assert.equal(allocationSnapshot.status, "reconciled");
assert.equal(allocationSnapshot.invariants.unreconciled_void, "0");
assert.equal(
  allocationSnapshot.current_nonzero_holders.find(
    ({ label }) => label === "VoidTreasury",
  )?.balance_void,
  allocation.transition_basis_void.reconciled_void_treasury,
);
assert.equal(
  allocationSnapshot.current_nonzero_holders.find(
    ({ label }) => label === "UpgradeStaking",
  )?.balance_void,
  allocation.transition_basis_void.reconciled_validator_stake,
);
assert.equal(
  allocationSnapshot.future_target_allocations.target_core_void_treasury_reserve_void,
  allocation.amounts_void.core_void_treasury,
);
assert.equal(
  allocationSnapshot.future_target_allocations.ops_treasury_void,
  allocation.amounts_void.ops_treasury,
);
assert.equal(
  allocationSnapshot.future_target_allocations.validator_stake_target_total_void,
  allocation.amounts_void.validator_stake_target,
);
assert.equal(
  allocationSnapshot.future_target_allocations.validator_stake_remaining_delta_void,
  allocation.transition_basis_void.planned_validator_stake_delta,
);
assert.equal(
  allocationSnapshot.future_target_allocations.combined_future_treasury_delta_void,
  allocation.transition_basis_void.combined_future_treasury_delta,
);
assert.equal(allocationSnapshot.authority.validator_top_up, false);
assert.equal(allocationSnapshot.authority.money_movement, false);

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
assert.equal(lot.market.bitcoin_network, "bitcoin_mainnet");
assert.equal(lot.market.void_chain_id, 2050);
assert.equal(lot.market.void_network_identity, "mainnet0");
assert.equal(lot.market.fiat_or_usd_value_used, false);
assert.equal(lot.market.external_price_oracle_used, false);
assert.equal(
  lot.source.policy.minimum_spread_bps,
  VOID_BTC_VOID_V1_MINIMUM_SPREAD_BPS,
);
assert.equal(
  lot.reserve_recycling.confirmed_btc_added_to_market_reserve_sats,
  "1000000",
);
assert.equal(lot.reserve_recycling.automatic_bid_budget_sats, "980100");
assert.equal(lot.reserve_recycling.bitcoin_network_fee_reserve_sats, "10000");
assert.equal(lot.reserve_recycling.retained_spread_equity_sats, "9900");
assert.equal(lot.reserve_recycling.automatic_ops_treasury_sweep_sats, "0");
assert.equal(lot.reserve_recycling.proceeds_conserved, true);
assert.equal(lot.buyback_lot.target_void_atomic, "2000000");
assert.equal(lot.buyback_lot.maximum_btc_out_sats, "980100");
assert.equal(
  lot.buyback_lot.full_source_lot_round_trip_btc_out_lt_btc_received,
  true,
);
assert.ok(
  BigInt(lot.buyback_lot.maximum_btc_out_sats) <
    BigInt(lot.source.settlement.btc_received_sats),
);
assert.equal(lot.lifecycle.pending_or_unconfirmed_btc_bid_eligible, false);
assert.equal(lot.lifecycle.source_sale_content_address_verified, true);
assert.equal(lot.lifecycle.settled_confirmed_btc_bid_eligible, true);
assert.equal(lot.lifecycle.duplicate_source_sale_creates_second_lot, false);
assert.equal(lot.lifecycle.conflicting_source_sale_plan_requires_hold, true);
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
assert.match(lot.buyback_lot_plan_id, /^sha256:[0-9a-f]{64}$/);
assert.equal(
  lot.source.settlement.source_sale_id,
  "sha256:b60b88ff3c3e9271ef9b9c38a60f62cbc3051884a876073a71bfc83c653a88ad",
);
assert.equal(
  lot.buyback_lot_id,
  "sha256:47bc1085cc19e206bfaeb21e83b3c94ce2eafffc1b2c33fc18092f50db6eec97",
);
assert.equal(
  lot.buyback_lot_plan_id,
  "sha256:a67b1d79f766f94d983a5f07f747e9637494b7aded2eda029d11f3b9c8e0f0ff",
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
  ).buyback_lot_plan_id,
  lot.buyback_lot_plan_id,
);

for (const offPolicySpreadBps of [99, 101, 200, 300]) {
  assert.throws(
    () =>
      deriveBtcVoidBuybackLotV1(
        request({ policy: { minimum_spread_bps: offPolicySpreadBps } }),
      ),
    /v1 minimum spread must be exactly 100 basis points/,
  );
}
assert.throws(
  () =>
    deriveBtcVoidBuybackLotV1(
      request({
        settlement: {
          source_sale_id: original.settlement.source_sale_id,
          btc_received_sats: "2000000",
        },
      }),
    ),
  /does not match canonical settled-sale content/,
);
const sameSaleLaterConfirmationEvidence = deriveBtcVoidBuybackLotV1(
  request({ settlement: {
    bitcoin_observed_tip_hash: "66".repeat(32),
    bitcoin_observed_tip_height: 800006,
    observed_bitcoin_confirmations: 7,
  } }),
);
assert.equal(
  sameSaleLaterConfirmationEvidence.buyback_lot_id,
  lot.buyback_lot_id,
);
assert.notEqual(
  sameSaleLaterConfirmationEvidence.buyback_lot_plan_id,
  lot.buyback_lot_plan_id,
);
const sameSaleReorgEvidence = deriveBtcVoidBuybackLotV1(
  request({ settlement: {
    bitcoin_confirmed_block_hash: "77".repeat(32),
  } }),
);
assert.equal(sameSaleReorgEvidence.buyback_lot_id, lot.buyback_lot_id);
assert.notEqual(
  sameSaleReorgEvidence.buyback_lot_plan_id,
  lot.buyback_lot_plan_id,
);
const distinctSaleSameAmounts = deriveBtcVoidBuybackLotV1(
  request({ settlement: { bitcoin_funding_txid: "33".repeat(32) } }),
);
assert.notEqual(
  distinctSaleSameAmounts.source.settlement.source_sale_id,
  lot.source.settlement.source_sale_id,
);
assert.notEqual(
  distinctSaleSameAmounts.buyback_lot_id,
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
  /do not match bound block heights/,
);
assert.throws(
  () =>
    deriveBtcVoidBuybackLotV1(
      request({ settlement: {
        bitcoin_observed_tip_height: 800004,
        observed_bitcoin_confirmations: 5,
      } }),
    ),
  /insufficient Bitcoin confirmations/,
);
assert.throws(
  () =>
    deriveBtcVoidBuybackLotV1(
      request({ settlement: { bitcoin_observed_tip_height: 799999 } }),
    ),
  /predates the confirmed funding block/,
);
assert.throws(
  () =>
    deriveBtcVoidBuybackLotV1(
      request({ settlement: { direction: "void_to_btc" } }),
    ),
  /only settled BTC-to-VOID sales/,
);
for (const bitcoinNetwork of ["bitcoin_testnet", "bitcoin_regtest"]) {
  assert.throws(
    () =>
      deriveBtcVoidBuybackLotV1(
        request({ settlement: { bitcoin_network: bitcoinNetwork } }),
      ),
    /require bitcoin_mainnet/,
  );
}
assert.throws(
  () =>
    deriveBtcVoidBuybackLotV1(
      request({ settlement: { void_chain_id: 2051 } }),
    ),
  /require Chain-2050/,
);
assert.throws(
  () =>
    deriveBtcVoidBuybackLotV1(
      request({ settlement: { void_network_identity: "devnet" } }),
    ),
  /require VOID mainnet0/,
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
      request({ settlement: { bitcoin_funding_txid: "AA".repeat(32) } }),
    ),
  /lowercase hex64/,
);
assert.throws(
  () =>
    deriveBtcVoidBuybackLotV1(
      request({ settlement: { bitcoin_funding_vout: 0x1_0000_0000 } }),
    ),
  /integer range/,
);
assert.throws(
  () =>
    deriveBtcVoidBuybackLotV1(
      request({ settlement: { bitcoin_confirmed_block_hash: "AA".repeat(32) } }),
    ),
  /lowercase hex64/,
);
assert.throws(
  () =>
    deriveBtcVoidBuybackLotV1(
      request({ settlement: { void_settlement_receipt_id: "not-a-digest" } }),
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
  "1%",
  "No USD",
  "100 VOID for 1 BTC",
  "automatic_ops_treasury_sweep_sats: 0",
  "buyback_lot_plan_id",
  "Bitcoin outpoint",
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
    source_sale_content_address_verified: true,
    bitcoin_network_bound: true,
    bitcoin_confirmation_evidence_bound: true,
    void_chain_identity_bound: true,
    source_sale_id: lot.source.settlement.source_sale_id,
    buyback_lot_id: lot.buyback_lot_id,
    buyback_lot_plan_id: lot.buyback_lot_plan_id,
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
