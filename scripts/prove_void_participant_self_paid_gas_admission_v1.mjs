#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  AUTHORITY,
  VOID_PARTICIPANT_SELF_PAID_GAS_ADMISSION_V1,
  admitParticipantSelfPaidGasOperationV1,
} from "../tools/void-participant-self-paid-gas-admission-v1.mjs";

const USER = "0x1111111111111111111111111111111111111111";

function legs() {
  return [
    {
      leg_id: "approve_wc",
      gas_limit: "100000",
      max_fee_per_gas_wei: "3000000000",
      native_value_wei: "0",
      gas_limit_source: "bounded_preflight_or_reviewed_ceiling",
      max_fee_source: "bounded_preflight_or_policy_cap",
    },
    {
      leg_id: "swap_wc_for_void",
      gas_limit: "300000",
      max_fee_per_gas_wei: "3000000000",
      native_value_wei: "0",
      gas_limit_source: "bounded_preflight_or_reviewed_ceiling",
      max_fee_source: "bounded_preflight_or_policy_cap",
    },
  ];
}

function input(overrides = {}) {
  return {
    chain_id: 2050,
    operation_id: "trade-1",
    operation_kind: "wc_to_void_trade",
    participant_address: USER,
    native_balance_wei: "1500000000000000",
    transaction_legs: legs(),
    relayer_requested: false,
    sponsorship_requested: false,
    expected_trade_output_native_wei: "999999999999999999999999",
    ...overrides,
  };
}

assert.equal(
  VOID_PARTICIPANT_SELF_PAID_GAS_ADMISSION_V1,
  "VOID_PARTICIPANT_SELF_PAID_GAS_ADMISSION_V1",
);

for (const [key, value] of Object.entries(AUTHORITY)) {
  if (
    [
      "source_only_policy",
      "participant_pays_native_gas",
      "all_legs_must_be_prebounded",
      "aggregate_upfront_balance_check_required",
    ].includes(key)
  ) {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const admitted = admitParticipantSelfPaidGasOperationV1(input());
assert.equal(admitted.ok, true);
assert.equal(admitted.status, "SELF_PAID_GAS_ADMITTED");
assert.equal(
  admitted.admission_id,
  "voidspga1_28038bac0c26fccb3fe41ae3a700ebda6f49adbbf535251bab8a2586c60b1348",
);
assert.equal(admitted.operation_admitted, true);
assert.equal(admitted.participant_pays_native_gas, true);
assert.equal(admitted.relayer_used, false);
assert.equal(admitted.relayer_available, false);
assert.equal(admitted.sponsorship_allowed, false);
assert.equal(
  admitted.post_execution_proceeds_counted_toward_upfront_gas,
  false,
);
assert.equal(
  admitted.aggregate_upfront_native_requirement_wei,
  "1200000000000000",
);
assert.equal(admitted.native_gas_shortfall_wei, "0");
assert.equal(
  admitted.balance_after_full_reservation_wei,
  "300000000000000",
);
assert.equal(admitted.transaction_leg_count, 2);
assert.equal(admitted.transaction_legs[0].gas_ceiling_wei, "300000000000000");
assert.equal(admitted.transaction_legs[1].gas_ceiling_wei, "900000000000000");
assert.equal(admitted.transaction_signing_authorized, false);
assert.equal(admitted.transaction_broadcast_authorized, false);
assert.equal(admitted.funds_movement_authorized, false);

const held = admitParticipantSelfPaidGasOperationV1(
  input({ native_balance_wei: "1000000000000000" }),
);
assert.equal(held.ok, false);
assert.equal(held.status, "HOLD_INSUFFICIENT_NATIVE_GAS");
assert.equal(
  held.reason,
  "insufficient_native_gas_for_complete_operation",
);
assert.equal(held.operation_admitted, false);
assert.equal(
  held.aggregate_upfront_native_requirement_wei,
  "1200000000000000",
);
assert.equal(held.native_gas_shortfall_wei, "200000000000000");
assert.equal(
  held.next_action,
  "participant_must_add_native_void_gas_then_revalidate_entire_operation",
);
assert.equal(held.relayer_used, false);
assert.equal(held.relayer_available, false);
assert.equal(held.sponsorship_allowed, false);

{
  const hugeExpectedOutput = admitParticipantSelfPaidGasOperationV1(
    input({
      native_balance_wei: "0",
      expected_trade_output_native_wei: "999999999999999999999999999999999",
    }),
  );
  assert.equal(hugeExpectedOutput.ok, false);
  assert.equal(
    hugeExpectedOutput.reason,
    "insufficient_native_gas_for_complete_operation",
  );
  assert.equal(
    hugeExpectedOutput.post_execution_proceeds_counted_toward_upfront_gas,
    false,
  );
}

{
  const valueTransfer = admitParticipantSelfPaidGasOperationV1({
    chain_id: 2050,
    operation_id: "send-1",
    operation_kind: "native_value_transfer",
    participant_address: USER,
    native_balance_wei: "1100000000000000000",
    relayer_requested: false,
    sponsorship_requested: false,
    transaction_legs: [
      {
        leg_id: "native_send",
        gas_limit: "21000",
        max_fee_per_gas_wei: "3000000000",
        native_value_wei: "1000000000000000000",
        gas_limit_source: "bounded_preflight_or_reviewed_ceiling",
        max_fee_source: "bounded_preflight_or_policy_cap",
      },
    ],
  });
  assert.equal(valueTransfer.ok, true);
  assert.equal(
    valueTransfer.aggregate_upfront_native_requirement_wei,
    "1000063000000000000",
  );
}

for (const [label, override, reason] of [
  [
    "relayer requested",
    { relayer_requested: true },
    "request_identity_or_relayer_policy_invalid",
  ],
  [
    "sponsorship requested",
    { sponsorship_requested: true },
    "request_identity_or_relayer_policy_invalid",
  ],
  [
    "wrong chain",
    { chain_id: 1 },
    "request_identity_or_relayer_policy_invalid",
  ],
  [
    "missing legs",
    { transaction_legs: [] },
    "transaction_legs_required",
  ],
]) {
  const decision = admitParticipantSelfPaidGasOperationV1(input(override));
  assert.equal(decision.ok, false, label);
  assert.equal(decision.reason, reason, label);
}

{
  const bad = legs();
  bad[1].gas_limit_source = "unbounded_guess";
  const decision = admitParticipantSelfPaidGasOperationV1(
    input({ transaction_legs: bad }),
  );
  assert.equal(decision.ok, false);
  assert.equal(
    decision.reason,
    "transaction_leg_bound_provenance_required",
  );
}

{
  const bad = legs();
  bad[1].leg_id = "approve_wc";
  const decision = admitParticipantSelfPaidGasOperationV1(
    input({ transaction_legs: bad }),
  );
  assert.equal(decision.ok, false);
  assert.equal(decision.reason, "transaction_leg_binding_invalid");
}

const source = fs.readFileSync(
  "tools/void-participant-self-paid-gas-admission-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "relayer fee",
  "sponsorship quote",
  "100 WC = 1 VOID",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "broadcastTransaction",
  "sendTransaction(",
  "--private-key",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log(
  "VOID_PARTICIPANT_SELF_PAID_GAS_ADMISSION_V1_PROOF_GREEN",
);
console.log("participant_pays_native_gas=true");
console.log("relayer_sponsorship_allowed=false");
console.log("aggregate_upfront_balance_check_required=true");
console.log("all_transaction_legs_prebounded=true");
console.log("post_execution_trade_output_counts_toward_gas=false");
console.log(
  "insufficient_native_gas_fails_before_operation_admission=true",
);
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("funds_movement=false");
