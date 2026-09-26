#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_WC_VOID_COUPLED_OPENING_AUTHORITY_V1,
  VOID_WC_VOID_COUPLED_OPENING_V1,
  VOID_WC_VOID_OPENING_COMMITMENT_SCHEMA_V1,
  VOID_WC_VOID_OPENING_LEDGER_DEBIT_SCHEMA_V1,
  VOID_WC_VOID_OPENING_POLICY_V1,
  VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
  deriveWcVoidCoupledOpeningStateV1,
  verifyWcVoidOpeningLedgerSettlementsV1,
  wcVoidOpeningCommitmentIdV1,
  wcVoidOpeningSettlementIdV1,
} from "../tools/void-wc-void-coupled-opening-v1.mjs";

const hash = (digit) => "sha256:" + String(digit).repeat(64);
const launchId = hash("a");

function commitment(participantDigit, account, wcUnits) {
  const value = {
    schema: VOID_WC_VOID_OPENING_COMMITMENT_SCHEMA_V1,
    commitment_id: hash("0"),
    coupled_launch_id: launchId,
    participant_id: hash(participantDigit),
    account,
    wc_units: String(wcUnits),
  };
  value.commitment_id = wcVoidOpeningCommitmentIdV1(value);
  return value;
}

function debit(commitmentValue, amount, tsMs) {
  const value = {
    schema: VOID_WC_VOID_OPENING_LEDGER_DEBIT_SCHEMA_V1,
    kind: "debit",
    account: commitmentValue.account,
    amount,
    delta: -amount,
    ts_ms: tsMs,
    reason: "wc_void_opening_settlement_v1",
    settlement_id: hash("0"),
    commitment_id: commitmentValue.commitment_id,
    coupled_launch_id: launchId,
    pair: "WC_VOID",
    source_domain: "void-work-credit-ledger",
    quote_asset_form: "ledger-credit",
    quote_unit: "wc",
    quote_decimals: 0,
    market_meta: {
      adapter_id: VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
      opening_only: true,
      fixed_price: false,
      protocol_wc_seed_units: "0",
    },
  };
  value.settlement_id = wcVoidOpeningSettlementIdV1(value);
  return value;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function rejects(fn, code) {
  assert.throws(
    fn,
    (error) => error instanceof Error && error.message === code,
    code,
  );
}

assert.equal(VOID_WC_VOID_COUPLED_OPENING_V1, "VOID_WC_VOID_COUPLED_OPENING_V1");
assert.equal(
  VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
  "void-wc-ledger-opening-settlement-v1",
);
assert.equal(VOID_WC_VOID_OPENING_POLICY_V1.chain_id, 2050);
assert.equal(VOID_WC_VOID_OPENING_POLICY_V1.pair, "WC_VOID");
assert.equal(VOID_WC_VOID_OPENING_POLICY_V1.source_domain, "void-work-credit-ledger");
assert.equal(VOID_WC_VOID_OPENING_POLICY_V1.quote_asset_form, "ledger-credit");
assert.equal(VOID_WC_VOID_OPENING_POLICY_V1.quote_unit, "wc");
assert.equal(VOID_WC_VOID_OPENING_POLICY_V1.quote_decimals, 0);
assert.equal(
  VOID_WC_VOID_OPENING_POLICY_V1.protocol_void_inventory_atoms,
  "10000000000000000000000000",
);
assert.equal(
  VOID_WC_VOID_OPENING_POLICY_V1.opening_sale_tranche_void_atoms,
  "5000000000000000000000000",
);
assert.equal(
  VOID_WC_VOID_OPENING_POLICY_V1.post_opening_void_reserve_atoms,
  "5000000000000000000000000",
);
assert.equal(
  VOID_WC_VOID_OPENING_POLICY_V1.opening_allocation_policy,
  "pro_rata_largest_remainder_v1",
);
assert.equal(VOID_WC_VOID_OPENING_POLICY_V1.protocol_wc_seed_units, "0");
assert.equal(VOID_WC_VOID_OPENING_POLICY_V1.fixed_conversion, false);
assert.equal(VOID_WC_VOID_OPENING_POLICY_V1.fixed_opening_price, false);

const first = commitment("1", "wc-opening-alpha", "250");
const second = commitment("2", "wc-opening-beta", "750");
const firstDebit = debit(first, 250, 1790344000001);
const secondDebit = debit(second, 750, 1790344000002);

const settlements = verifyWcVoidOpeningLedgerSettlementsV1(
  launchId,
  [first, second],
  [secondDebit, firstDebit],
);
assert.equal(settlements.adapter_id, "void-wc-ledger-opening-settlement-v1");
assert.equal(settlements.source_domain, "void-work-credit-ledger");
assert.equal(settlements.quote_asset_form, "ledger-credit");
assert.equal(settlements.quote_unit, "wc");
assert.equal(settlements.quote_decimals, 0);
assert.equal(settlements.settlement_count, 2);
assert.equal(settlements.total_settled_wc_units, "1000");
assert.equal(settlements.exact_commitment_settlement_bijection, true);
assert.equal(settlements.duplicate_settlement_rejected, true);
assert.equal(settlements.duplicate_commitment_settlement_rejected, true);
assert.equal(settlements.ledger_event_shape_verified, true);
assert.equal(settlements.canonical_balance_debit_compatible, true);
assert.equal(settlements.ledger_persistence_verified, false);
assert.equal(settlements.ledger_write_performed, false);
assert.equal(settlements.wc_balance_mutation_performed, false);

const state = deriveWcVoidCoupledOpeningStateV1({
  coupled_launch_id: launchId,
  commitments: [second, first],
  ledger_debits: [firstDebit, secondDebit],
});
assert.equal(state.chain_id, 2050);
assert.equal(state.pair, "WC_VOID");
assert.equal(state.settled_wc_reserve_units, "1000");
assert.equal(state.protocol_wc_seed_units, "0");
assert.equal(state.protocol_void_inventory_atoms, "10000000000000000000000000");
assert.equal(state.opening_sale_tranche_void_atoms, "5000000000000000000000000");
assert.equal(state.post_opening_void_reserve_atoms, "5000000000000000000000000");
assert.equal(state.opening_allocation_policy, "pro_rata_largest_remainder_v1");
assert.match(state.opening_allocation_root, /^sha256:[0-9a-f]{64}$/);
assert.equal(state.opening_allocated_void_atoms, "5000000000000000000000000");
assert.equal(state.opening_price_wc_per_void_numerator, "1");
assert.equal(state.opening_price_wc_per_void_denominator, "5000");
assert.equal(state.opening_price_source, "settled_wc_over_opening_sale_tranche");
assert.equal(state.fixed_conversion, false);
assert.equal(state.fixed_opening_price, false);
assert.equal(state.real_participant_wc_required, true);
assert.equal(state.zero_protocol_wc_seed_required, true);
assert.equal(state.commitment_settlement_bijection_verified, true);
assert.equal(state.settlement_event_shape_verified, true);
assert.equal(state.ledger_persistence_verified, false);
assert.equal(state.quote_reserve_custody_verified, false);
assert.equal(state.void_market_vault_custody_verified, false);
assert.equal(state.participant_opening_claim_policy_ready, false);
assert.equal(state.opening_commitment_window_policy_ready, false);
assert.equal(state.participant_provenance_and_eligibility_verified, false);
assert.equal(state.opening_concentration_and_sybil_limits_ready, false);
assert.equal(state.opening_minimum_quote_depth_policy_ready, false);
assert.equal(state.nonproduction_wc_exclusion_verified, false);
assert.equal(state.opening_price_manipulation_protection_ready, false);
assert.equal(state.opening_price_is_production_authority, false);
assert.equal(state.exact_opening_tranche_conservation, true);
assert.equal(state.post_opening_wc_reserve_units, "1000");
assert.equal(state.post_opening_reserve_ratio_matches_clearing_price, true);
assert.equal(state.opening_allocation_math_source_ready, true);
assert.equal(state.opening_allocation_transfer_or_claim_runtime_ready, false);
assert.equal(state.participant_allocations.length, 2);

const allocationByAccount = new Map(
  state.participant_allocations.map((entry) => [entry.account, entry]),
);
assert.equal(
  allocationByAccount.get("wc-opening-alpha").void_atoms,
  "1250000000000000000000000",
);
assert.equal(
  allocationByAccount.get("wc-opening-beta").void_atoms,
  "3750000000000000000000000",
);
assert.equal(state.market_activation_authority, false);
assert.equal(state.inventory_funding_authority, false);
assert.equal(state.liquidity_movement_authority, false);
assert.equal(state.ledger_write_authority, false);
assert.equal(state.wc_issuance_authority, false);
assert.equal(state.funds_movement_authority, false);
assert.match(state.opening_state_id, /^sha256:[0-9a-f]{64}$/);

// Non-divisible pro-rata allocations use deterministic largest remainder,
// conserve the entire 5M-VOID tranche exactly, and are input-order invariant.
{
  const a = commitment("3", "wc-opening-gamma", "1");
  const b = commitment("4", "wc-opening-delta", "1");
  const d = commitment("5", "wc-opening-epsilon", "1");
  const aDebit = debit(a, 1, 1790344000011);
  const bDebit = debit(b, 1, 1790344000012);
  const dDebit = debit(d, 1, 1790344000013);

  const one = deriveWcVoidCoupledOpeningStateV1({
    coupled_launch_id: launchId,
    commitments: [a, b, d],
    ledger_debits: [dDebit, aDebit, bDebit],
  });
  const two = deriveWcVoidCoupledOpeningStateV1({
    coupled_launch_id: launchId,
    commitments: [d, b, a],
    ledger_debits: [bDebit, dDebit, aDebit],
  });

  assert.equal(
    one.opening_allocated_void_atoms,
    "5000000000000000000000000",
  );
  assert.equal(one.opening_allocation_root, two.opening_allocation_root);
  assert.deepEqual(one.participant_allocations, two.participant_allocations);

  const allocations = one.participant_allocations.map((entry) =>
    BigInt(entry.void_atoms)
  );
  const total = allocations.reduce((sum, value) => sum + value, 0n);
  const min = allocations.reduce((left, right) =>
    left < right ? left : right
  );
  const max = allocations.reduce((left, right) =>
    left > right ? left : right
  );
  assert.equal(total, 5_000_000n * 10n ** 18n);
  assert.ok(max - min <= 1n);
}

for (const [key, value] of Object.entries(
  VOID_WC_VOID_COUPLED_OPENING_AUTHORITY_V1,
)) {
  assert.equal(
    key === "source_only" ||
      key === "explicit_input_only" ||
      key === "canonical_wc_ledger_event_shape_required"
      ? value
      : !value,
    true,
    key,
  );
}

{
  const bad = clone(first);
  bad.wc_units = "1.5";
  rejects(
    () => deriveWcVoidCoupledOpeningStateV1({
      coupled_launch_id: launchId,
      commitments: [bad, second],
      ledger_debits: [firstDebit, secondDebit],
    }),
    "INVALID_WC_VOID_OPENING_WC_UNITS",
  );
}

{
  const bad = clone(firstDebit);
  bad.delta = -249;
  bad.settlement_id = wcVoidOpeningSettlementIdV1(bad);
  rejects(
    () => verifyWcVoidOpeningLedgerSettlementsV1(
      launchId,
      [first, second],
      [bad, secondDebit],
    ),
    "WC_VOID_OPENING_LEDGER_DEBIT_NUMERIC_INVALID",
  );
}

{
  const bad = clone(firstDebit);
  bad.market_meta.fixed_price = true;
  bad.settlement_id = wcVoidOpeningSettlementIdV1(bad);
  rejects(
    () => verifyWcVoidOpeningLedgerSettlementsV1(
      launchId,
      [first, second],
      [bad, secondDebit],
    ),
    "WC_VOID_OPENING_LEDGER_DEBIT_META_MISMATCH",
  );
}

{
  const bad = clone(firstDebit);
  bad.market_meta.protocol_wc_seed_units = "1";
  bad.settlement_id = wcVoidOpeningSettlementIdV1(bad);
  rejects(
    () => verifyWcVoidOpeningLedgerSettlementsV1(
      launchId,
      [first, second],
      [bad, secondDebit],
    ),
    "WC_VOID_OPENING_LEDGER_DEBIT_META_MISMATCH",
  );
}

rejects(
  () => verifyWcVoidOpeningLedgerSettlementsV1(
    launchId,
    [first, second],
    [firstDebit, firstDebit],
  ),
  "DUPLICATE_WC_VOID_OPENING_SETTLEMENT_ID",
);

{
  const bad = clone(secondDebit);
  bad.commitment_id = first.commitment_id;
  bad.account = first.account;
  bad.amount = 250;
  bad.delta = -250;
  bad.settlement_id = wcVoidOpeningSettlementIdV1(bad);
  rejects(
    () => verifyWcVoidOpeningLedgerSettlementsV1(
      launchId,
      [first, second],
      [firstDebit, bad],
    ),
    "DUPLICATE_WC_VOID_OPENING_SETTLED_COMMITMENT",
  );
}

{
  const bad = clone(firstDebit);
  bad.coupled_launch_id = hash("b");
  bad.settlement_id = wcVoidOpeningSettlementIdV1(bad);
  rejects(
    () => verifyWcVoidOpeningLedgerSettlementsV1(
      launchId,
      [first, second],
      [bad, secondDebit],
    ),
    "WC_VOID_OPENING_SETTLEMENT_LAUNCH_MISMATCH",
  );
}

const canonicalLedgerSource = fs.readFileSync(
  "src/economic/wc_verified_receipt_acceptance_v1.ts",
  "utf8",
);
assert.match(canonicalLedgerSource, /if \(entry\.kind === "debit"\)/);
assert.match(canonicalLedgerSource, /entry\.amount/);
assert.match(canonicalLedgerSource, /debitedQuanta \+= amountQuanta/);

const source = fs.readFileSync(
  "tools/void-wc-void-coupled-opening-v1.mjs",
  "utf8",
);
assert.doesNotMatch(source, /appendFileSync|writeFileSync|renameSync/);
assert.doesNotMatch(source, /private[_-]?key|mnemonic/i);
assert.doesNotMatch(source, /100\s*WC\s*=\s*1\s*VOID/i);
assert.doesNotMatch(source, /presale_closeout_id/);
assert.match(source, /coupled_launch_id/);

console.log("VOID_WC_VOID_COUPLED_OPENING_V1_PROOF_GREEN");
console.log("coupled_launch_reference=true");
console.log("presale_closeout_dependency=false");
console.log("settlement_adapter_id=void-wc-ledger-opening-settlement-v1");
console.log("canonical_wc_ledger_debit_shape_verified=true");
console.log("opening_discovery_implemented=true");
console.log("settlement_adapter_implemented=true");
console.log("fixed_wc_void_redemption=false");
console.log("protocol_wc_seed_units=0");
console.log("opening_price_source=settled_wc_over_opening_sale_tranche");
console.log("opening_sale_tranche_void=5000000");
console.log("post_opening_void_reserve=5000000");
console.log("opening_allocation_policy=pro_rata_largest_remainder_v1");
console.log("opening_tranche_conservation=true");
console.log("opening_allocation_order_independent=true");
console.log("opening_largest_remainder_rounding_exact=true");
console.log("post_opening_reserve_ratio_matches_clearing_price=true");
console.log("opening_allocation_transfer_or_claim_runtime_ready=false");
console.log("ledger_persistence_verified=false");
console.log("participant_opening_claim_policy_ready=false");
console.log("opening_commitment_window_policy_ready=false");
console.log("participant_provenance_and_eligibility_verified=false");
console.log("opening_concentration_and_sybil_limits_ready=false");
console.log("opening_minimum_quote_depth_policy_ready=false");
console.log("nonproduction_wc_exclusion_verified=false");
console.log("opening_price_manipulation_protection_ready=false");
console.log("opening_price_is_production_authority=false");
console.log("market_activation=false");
console.log("inventory_funding=false");
console.log("wc_ledger_write=false");
console.log("funds_movement=false");
