#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  AUTHORITY,
  COUPLED_GAS_PAYER_V1,
  MAX_FEE_PER_GAS_WEI_V1,
  MAX_PRIORITY_FEE_PER_GAS_WEI_V1,
  POLICY,
  PRESALE_MAX_COST_PER_ATTEMPT_WEI_V1,
  PRESALE_MAX_GAS_LIMIT_V1,
  PRESALE_MAX_RESERVED_LIABILITY_PER_OBLIGATION_WEI_V1,
  RESERVED_ATTEMPTS_PER_OBLIGATION_V1,
  VOID_COUPLED_NATIVE_GAS_LIABILITY_V1,
  evaluateCoupledNativeGasAdmissionV1,
} from "../tools/void-coupled-native-gas-liability-v1.mjs";

function request(overrides = {}) {
  return {
    schema: "void.coupled_native_gas_admission.v1",
    lane: "presale",
    obligation_id: "payment:voidpay1:test",
    payer_address: COUPLED_GAS_PAYER_V1,
    payer_native_balance_wei: "10000000000000000",
    journal_snapshot_id: `sha256:${"1".repeat(64)}`,
    journal_verified: true,
    open_reserved_liability_wei: "1000000000000000",
    gas_limit: PRESALE_MAX_GAS_LIMIT_V1.toString(),
    max_fee_per_gas_wei: MAX_FEE_PER_GAS_WEI_V1.toString(),
    gas_ceiling_observed: true,
    gas_ceiling_source: "production_real_token_fulfill_v1",
    attempts_reserved: Number(RESERVED_ATTEMPTS_PER_OBLIGATION_V1),
    fee_observation_id: `sha256:${"2".repeat(64)}`,
    fee_observation_verified: true,
    fee_observation_fresh: true,
    observed_base_fee_per_gas_wei: "1000000000",
    max_priority_fee_per_gas_wei:
      MAX_PRIORITY_FEE_PER_GAS_WEI_V1.toString(),
    nonce_scheduler_snapshot_id: `sha256:${"3".repeat(64)}`,
    nonce_scheduler_verified: true,
    nonce_slot_available: true,
    ...overrides,
  };
}

assert.equal(
  VOID_COUPLED_NATIVE_GAS_LIABILITY_V1,
  "VOID_COUPLED_NATIVE_GAS_LIABILITY_V1",
);
assert.equal(COUPLED_GAS_PAYER_V1, "0xc884f631c3881b8b672bfcbf019c856146cd7f73");
assert.equal(PRESALE_MAX_GAS_LIMIT_V1, 320000n);
assert.equal(MAX_FEE_PER_GAS_WEI_V1, 3000000000n);
assert.equal(MAX_PRIORITY_FEE_PER_GAS_WEI_V1, 1000000000n);
assert.equal(RESERVED_ATTEMPTS_PER_OBLIGATION_V1, 2n);
assert.equal(PRESALE_MAX_COST_PER_ATTEMPT_WEI_V1, 960000000000000n);
assert.equal(
  PRESALE_MAX_RESERVED_LIABILITY_PER_OBLIGATION_WEI_V1,
  1920000000000000n,
);

assert.equal(POLICY.native_gas_balance_separate_from_void_token_balance, true);
assert.equal(POLICY.void_token_withholding_does_not_refill_native_gas_balance, true);
assert.equal(POLICY.shared_payer_requires_single_cross_lane_reservation_journal, true);
assert.equal(POLICY.shared_payer_requires_single_cross_lane_nonce_scheduler, true);
assert.equal(POLICY.fresh_fee_observation_required_before_admission, true);
assert.equal(POLICY.gas_reservation_release_requires_terminal_receipt_finality, true);
assert.equal(
  POLICY.presale_lifetime_capacity_or_replenishment_must_be_proven_before_activation,
  true,
);
assert.equal(
  POLICY.ongoing_wc_void_requires_native_gas_replenishment_or_user_paid_model,
  true,
);
assert.equal(POLICY.reservation_must_precede_presale_payment_instruction_authority, true);
assert.equal(POLICY.reservation_must_precede_wc_void_irreversible_settlement_authority, true);
assert.equal(POLICY.presale_hidden_minimum_introduced, false);
assert.equal(POLICY.presale_public_purchase_throttle_introduced, false);
assert.equal(POLICY.automatic_retry, false);

const presale = evaluateCoupledNativeGasAdmissionV1(request());
assert.equal(presale.request.lane, "presale");
assert.equal(presale.accounting.per_attempt_max_cost_wei, "960000000000000");
assert.equal(presale.accounting.attempts_reserved, "2");
assert.equal(presale.accounting.requested_liability_wei, "1920000000000000");
assert.equal(
  presale.accounting.open_reserved_liability_before_wei,
  "1000000000000000",
);
assert.equal(
  presale.accounting.open_reserved_liability_after_wei,
  "2920000000000000",
);
assert.equal(
  presale.accounting.unreserved_native_balance_after_wei,
  "7080000000000000",
);
assert.equal(presale.invariants.primary_attempt_funded, true);
assert.equal(presale.invariants.manual_recovery_attempt_funded, true);
assert.equal(presale.invariants.single_cross_lane_nonce_scheduler_required, true);
assert.equal(presale.invariants.fresh_fee_observation_bound_to_admission, true);
assert.equal(
  presale.invariants.reservation_release_requires_terminal_receipt_finality,
  true,
);
assert.equal(
  presale.invariants.pending_or_reorg_uncertain_receipt_keeps_liability_reserved,
  true,
);
assert.equal(presale.invariants.automatic_retry_forbidden, true);
assert.equal(presale.invariants.presale_hidden_minimum_required, false);
assert.match(presale.gas_reservation_id, /^voidgasr1_[0-9a-f]{64}$/u);

const wc = evaluateCoupledNativeGasAdmissionV1(
  request({
    lane: "wc_void",
    obligation_id: "wcvoid:settlement:test",
    open_reserved_liability_wei:
      presale.accounting.open_reserved_liability_after_wei,
    gas_limit: "250000",
    gas_ceiling_source: "deployed_wc_void_settle_void_v1",
  }),
);
assert.equal(wc.accounting.per_attempt_max_cost_wei, "750000000000000");
assert.equal(wc.accounting.requested_liability_wei, "1500000000000000");
assert.equal(
  wc.accounting.open_reserved_liability_after_wei,
  "4420000000000000",
);
assert.equal(
  wc.accounting.unreserved_native_balance_after_wei,
  "5580000000000000",
);

assert.throws(
  () =>
    evaluateCoupledNativeGasAdmissionV1(
      request({
        payer_native_balance_wei: "2000000000000000",
        open_reserved_liability_wei: "1000000000000000",
      }),
    ),
  /insufficient unreserved native gas balance/,
);

assert.throws(
  () =>
    evaluateCoupledNativeGasAdmissionV1(
      request({
        journal_verified: false,
      }),
    ),
  /cross-lane reservation journal must be verified/,
);

assert.throws(
  () =>
    evaluateCoupledNativeGasAdmissionV1(
      request({
        fee_observation_fresh: false,
      }),
    ),
  /fresh verified fee observation is required/,
);

assert.throws(
  () =>
    evaluateCoupledNativeGasAdmissionV1(
      request({
        observed_base_fee_per_gas_wei: "3000000000",
      }),
    ),
  /observed base fee does not fit max fee cap/,
);

assert.throws(
  () =>
    evaluateCoupledNativeGasAdmissionV1(
      request({
        nonce_slot_available: false,
      }),
    ),
  /shared cross-lane nonce scheduler is not ready/,
);

assert.throws(
  () =>
    evaluateCoupledNativeGasAdmissionV1(
      request({
        attempts_reserved: 1,
      }),
    ),
  /exactly two bounded attempts/,
);

assert.throws(
  () =>
    evaluateCoupledNativeGasAdmissionV1(
      request({
        lane: "wc_void",
        obligation_id: "wcvoid:settlement:unmeasured",
        gas_limit: "250000",
        gas_ceiling_observed: false,
        gas_ceiling_source: "deployed_wc_void_settle_void_v1",
      }),
    ),
  /runtime gas ceiling must be observed/,
);

assert.throws(
  () =>
    evaluateCoupledNativeGasAdmissionV1(
      request({
        lane: "wc_void",
        obligation_id: "wcvoid:settlement:wrong-source",
        gas_limit: "250000",
        gas_ceiling_source: "caller_guess",
      }),
    ),
  /WC\/VOID gas ceiling source mismatch/,
);

assert.throws(
  () =>
    evaluateCoupledNativeGasAdmissionV1({
      ...request(),
      extra: true,
    }),
  /keys mismatch/,
);

for (const [key, expected] of Object.entries({
  source_only_policy: true,
  wallet_access: false,
  credential_access: false,
  rpc_call: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_broadcast: false,
  chain2050_write: false,
  wc_ledger_write: false,
  presale_payment_acceptance: false,
  market_activation: false,
  public_presale_activation: false,
  funds_movement: false,
})) {
  assert.equal(AUTHORITY[key], expected, key);
}

const source = fs.readFileSync(
  "tools/void-coupled-native-gas-liability-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "Wallet(",
  "sendTransaction",
  "eth_sendRawTransaction",
  "privateKey",
  "mnemonic",
  "systemctl",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log("VOID_COUPLED_NATIVE_GAS_LIABILITY_V1_PROOF_GREEN");
console.log("native_gas_separate_from_void_token=true");
console.log("void_token_withholding_refills_native_gas=false");
console.log("shared_cross_lane_reservation_journal_required=true");
console.log("shared_cross_lane_nonce_scheduler_required=true");
console.log("fresh_fee_observation_required=true");
console.log("reservation_release_requires_terminal_receipt_finality=true");
console.log("presale_lifetime_capacity_or_replenishment_required=true");
console.log("wc_void_native_gas_replenishment_or_user_paid_model_required=true");
console.log("source_chain_refund_fee_budget_separate=true");
console.log("presale_max_gas_limit=320000");
console.log("presale_max_fee_per_gas_wei=3000000000");
console.log("presale_attempts_reserved=2");
console.log("presale_max_liability_per_obligation_wei=1920000000000000");
console.log("presale_hidden_minimum_required=false");
console.log("presale_public_purchase_throttle_required=false");
console.log("wc_void_deployed_settle_void_gas_census_required=true");
console.log("wc_void_gas_ceiling_observed_in_canonical_candidate=false");
console.log("automatic_retry=false");
console.log("market_activation_authorized=false");
console.log("public_presale_activation_authorized=false");
console.log("funds_moved=false");
