#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  BITCOIN_MAX_MONEY_SATOSHIS_V1,
  VOID_BTC_VOID_ATOMIC_SETTLEMENT_STATE_INVARIANTS_V1,
  VOID_MAX_SUPPLY_ATOMS_V1,
  canonicalJson,
  evaluateBtcVoidAtomicSettlementTraceV1,
} from "../tools/void-btc-void-atomic-settlement-state-invariants-v1.mjs";

function contentId(value) {
  return `sha256:${crypto.createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}

function makeContract(direction = "BTC_TO_VOID", overrides = {}) {
  const payload = {
    schema: "void.btc_void.atomic_settlement_contract.v1",
    pair: "native_btc/native_void",
    direction,
    bitcoin_network: "bitcoin_regtest",
    void_chain_id: 2050,
    void_network_identity: "isolated_chain_2050_test_v1",
    quote_id: `sha256:${"11".repeat(32)}`,
    reserve_snapshot_id: `sha256:${"22".repeat(32)}`,
    bitcoin_amount_satoshis: "125000",
    void_amount_atoms: "500000000000",
    hashlock_sha256: "33".repeat(32),
    bitcoin_refund_horizon_seconds: direction === "BTC_TO_VOID" ? "7200" : "3600",
    void_refund_horizon_seconds: direction === "BTC_TO_VOID" ? "3600" : "7200",
    minimum_refund_safety_margin_seconds: "1800",
    ...overrides,
  };
  return { ...payload, contract_id: contentId(payload) };
}

function makeEvent(
  contractId,
  direction,
  eventType,
  fromPhase,
  toPhase,
  evidenceByte,
) {
  const sourceRefundRole =
    direction === "BTC_TO_VOID" ? "SOURCE_NATIVE_BTC" : "SOURCE_NATIVE_VOID";
  const counterpartyRefundRole =
    direction === "BTC_TO_VOID"
      ? "COUNTERPARTY_NATIVE_VOID"
      : "COUNTERPARTY_NATIVE_BTC";
  const refundAssetRole =
    eventType === "OBSERVE_SOURCE_REFUND"
      ? sourceRefundRole
      : eventType === "OBSERVE_COUNTERPARTY_REFUND"
        ? counterpartyRefundRole
        : "NOT_A_REFUND";
  const payload = {
    schema: "void.btc_void.atomic_settlement_event.v1",
    contract_id: contractId,
    event_type: eventType,
    from_phase: fromPhase,
    to_phase: toPhase,
    refund_asset_role: refundAssetRole,
    evidence_id: `sha256:${evidenceByte.repeat(64)}`,
  };
  return { ...payload, event_id: contentId(payload) };
}

function recomputeEventId(event) {
  const { event_id: ignoredEventId, ...payload } = event;
  void ignoredEventId;
  event.event_id = contentId(payload);
  return event;
}

const happyTransitions = [
  ["BIND_HASHLOCK", "RESERVED", "HASH_BOUND", "a"],
  ["OBSERVE_SOURCE_FUNDING", "HASH_BOUND", "SOURCE_FUNDED", "b"],
  ["CONFIRM_SOURCE_FUNDING", "SOURCE_FUNDED", "SOURCE_CONFIRMED", "c"],
  ["OBSERVE_COUNTERPARTY_LOCK", "SOURCE_CONFIRMED", "COUNTERPARTY_LOCKED", "d"],
  ["OBSERVE_PREIMAGE_REVEAL", "COUNTERPARTY_LOCKED", "PREIMAGE_REVEALED", "e"],
  ["OBSERVE_BOTH_CLAIMS", "PREIMAGE_REVEALED", "BOTH_CLAIMS_OBSERVED", "f"],
  ["FINALIZE_SETTLEMENT", "BOTH_CLAIMS_OBSERVED", "SETTLED", "1"],
];

function trace(direction = "BTC_TO_VOID", transitions = happyTransitions, overrides = {}) {
  const contract = makeContract(direction, overrides);
  return {
    schema: "void.btc_void.atomic_settlement_trace.v1",
    contract,
    initial_phase: "RESERVED",
    events: transitions.map(([type, from, to, byte]) =>
      makeEvent(contract.contract_id, direction, type, from, to, byte),
    ),
  };
}

for (const direction of ["BTC_TO_VOID", "VOID_TO_BTC"]) {
  const result = evaluateBtcVoidAtomicSettlementTraceV1(trace(direction));
  assert.equal(result.marker, VOID_BTC_VOID_ATOMIC_SETTLEMENT_STATE_INVARIANTS_V1);
  assert.equal(result.direction, direction);
  assert.equal(result.final_phase, "SETTLED");
  assert.equal(result.terminal, true);
  assert.equal(result.applied_event_ids.length, 7);
  assert.equal(result.invariants.native_integer_amounts_bound, true);
  assert.equal(result.authority.transaction_constructed, false);
  assert.equal(result.authority.executable_inventory_reserved, false);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.authority));
}

const replayTrace = trace();
replayTrace.events.splice(2, 0, structuredClone(replayTrace.events[1]));
const replay = evaluateBtcVoidAtomicSettlementTraceV1(replayTrace);
const baseline = evaluateBtcVoidAtomicSettlementTraceV1(trace());
assert.equal(replay.evaluation_id, baseline.evaluation_id);
assert.equal(replay.applied_event_ids.length, 7);

const differentBitcoinAmount = trace("BTC_TO_VOID", happyTransitions, {
  bitcoin_amount_satoshis: "125001",
});
assert.notEqual(
  differentBitcoinAmount.contract.contract_id,
  trace().contract.contract_id,
);
assert.notEqual(
  evaluateBtcVoidAtomicSettlementTraceV1(differentBitcoinAmount).evaluation_id,
  baseline.evaluation_id,
);

const differentVoidAmount = trace("BTC_TO_VOID", happyTransitions, {
  void_amount_atoms: "500000000001",
});
assert.notEqual(
  differentVoidAmount.contract.contract_id,
  trace().contract.contract_id,
);
assert.notEqual(
  evaluateBtcVoidAtomicSettlementTraceV1(differentVoidAmount).evaluation_id,
  baseline.evaluation_id,
);

const maximumAmounts = evaluateBtcVoidAtomicSettlementTraceV1(
  trace("BTC_TO_VOID", happyTransitions, {
    bitcoin_amount_satoshis: BITCOIN_MAX_MONEY_SATOSHIS_V1,
    void_amount_atoms: VOID_MAX_SUPPLY_ATOMS_V1,
  }),
);
assert.equal(
  maximumAmounts.invariants.native_amounts_within_chain_supply_limits,
  true,
);
for (const [field, maximum, label] of [
  [
    "bitcoin_amount_satoshis",
    BITCOIN_MAX_MONEY_SATOSHIS_V1,
    "Bitcoin MAX_MONEY",
  ],
  ["void_amount_atoms", VOID_MAX_SUPPLY_ATOMS_V1, "VOID maximum supply"],
]) {
  assert.throws(
    () =>
      evaluateBtcVoidAtomicSettlementTraceV1(
        trace("BTC_TO_VOID", happyTransitions, {
          [field]: (BigInt(maximum) + 1n).toString(),
        }),
      ),
    new RegExp(`exceeds ${label}`),
  );
}

for (const [field, value] of [
  ["bitcoin_amount_satoshis", "0"],
  ["void_amount_atoms", "0"],
  ["bitcoin_amount_satoshis", "0125000"],
  ["void_amount_atoms", "5e11"],
]) {
  assert.throws(
    () => evaluateBtcVoidAtomicSettlementTraceV1(trace("BTC_TO_VOID", happyTransitions, {
      [field]: value,
    })),
    /positive canonical decimal string/,
  );
}

const refunded = evaluateBtcVoidAtomicSettlementTraceV1(
  trace("BTC_TO_VOID", [
    ["BIND_HASHLOCK", "RESERVED", "HASH_BOUND", "a"],
    ["OBSERVE_SOURCE_FUNDING", "HASH_BOUND", "SOURCE_FUNDED", "b"],
    ["OBSERVE_SOURCE_REFUND", "SOURCE_FUNDED", "REFUNDED", "c"],
  ]),
);
assert.equal(refunded.final_phase, "REFUNDED");
assert.equal(refunded.terminal, true);

for (const invalidEventType of [
  ["OBSERVE_SOURCE_REFUND"],
  { 0: "OBSERVE_SOURCE_REFUND", length: 1 },
  null,
  true,
  7,
  "UNKNOWN_EVENT",
]) {
  const invalidTypeTrace = trace("BTC_TO_VOID", [
    ["BIND_HASHLOCK", "RESERVED", "HASH_BOUND", "a"],
    ["OBSERVE_SOURCE_FUNDING", "HASH_BOUND", "SOURCE_FUNDED", "b"],
    ["OBSERVE_SOURCE_REFUND", "SOURCE_FUNDED", "REFUNDED", "c"],
  ]);
  const event = invalidTypeTrace.events[2];
  event.event_type = invalidEventType;
  event.refund_asset_role = "NOT_A_REFUND";
  recomputeEventId(event);
  assert.throws(
    () => evaluateBtcVoidAtomicSettlementTraceV1(invalidTypeTrace),
    /event_type must be a supported v1 event name/,
  );
}

function assertRejectedEventScalar(field, invalidValue, expectedError) {
  const invalidTrace = trace();
  const event = invalidTrace.events[0];
  event[field] =
    invalidValue === "__CONTRACT_ID_ARRAY__"
      ? [invalidTrace.contract.contract_id]
      : invalidValue;
  if (field !== "event_id") recomputeEventId(event);
  assert.throws(
    () => evaluateBtcVoidAtomicSettlementTraceV1(invalidTrace),
    expectedError,
  );
}

assertRejectedEventScalar(
  "schema",
  ["void.btc_void.atomic_settlement_event.v1"],
  /schema mismatch/,
);
assertRejectedEventScalar(
  "contract_id",
  "__CONTRACT_ID_ARRAY__",
  /contract_id mismatch/,
);
assertRejectedEventScalar("from_phase", ["RESERVED"], /from_phase does not match/);
assertRejectedEventScalar("to_phase", ["HASH_BOUND"], /transition is not allowed/);
assertRejectedEventScalar(
  "refund_asset_role",
  ["NOT_A_REFUND"],
  /refund_asset_role mismatch/,
);
assertRejectedEventScalar(
  "evidence_id",
  [`sha256:${"a".repeat(64)}`],
  /canonical sha256 identity/,
);
assertRejectedEventScalar(
  "event_id",
  [`sha256:${"b".repeat(64)}`],
  /event_id content mismatch/,
);

function bothLockedRefundTransitions(complete = true) {
  const transitions = [
    ["BIND_HASHLOCK", "RESERVED", "HASH_BOUND", "a"],
    ["OBSERVE_SOURCE_FUNDING", "HASH_BOUND", "SOURCE_FUNDED", "b"],
    ["CONFIRM_SOURCE_FUNDING", "SOURCE_FUNDED", "SOURCE_CONFIRMED", "c"],
    ["OBSERVE_COUNTERPARTY_LOCK", "SOURCE_CONFIRMED", "COUNTERPARTY_LOCKED", "d"],
    [
      "OBSERVE_COUNTERPARTY_REFUND",
      "COUNTERPARTY_LOCKED",
      "REFUND_PENDING_SOURCE",
      "2",
    ],
  ];
  if (complete) {
    transitions.push([
      "OBSERVE_SOURCE_REFUND",
      "REFUND_PENDING_SOURCE",
      "REFUNDED",
      "3",
    ]);
  }
  return transitions;
}

for (const direction of ["BTC_TO_VOID", "VOID_TO_BTC"]) {
  const partialTrace = trace(direction, bothLockedRefundTransitions(false));
  const partial = evaluateBtcVoidAtomicSettlementTraceV1(partialTrace);
  assert.equal(partial.final_phase, "REFUND_PENDING_SOURCE");
  assert.equal(partial.terminal, false);
  assert.equal(partial.applied_event_ids.length, 5);
  assert.equal(
    partial.invariants.both_locked_refund_requires_both_asset_resolutions,
    true,
  );

  const completedTrace = trace(direction, bothLockedRefundTransitions());
  const completed = evaluateBtcVoidAtomicSettlementTraceV1(completedTrace);
  assert.equal(completed.final_phase, "REFUNDED");
  assert.equal(completed.terminal, true);
  assert.equal(completed.applied_event_ids.length, 6);

  const replayedTrace = structuredClone(completedTrace);
  replayedTrace.events.splice(5, 0, structuredClone(replayedTrace.events[4]));
  assert.equal(
    evaluateBtcVoidAtomicSettlementTraceV1(replayedTrace).evaluation_id,
    completed.evaluation_id,
  );

  const reusedRefundReceipt = structuredClone(completedTrace);
  reusedRefundReceipt.events[5].evidence_id =
    reusedRefundReceipt.events[4].evidence_id;
  const { event_id: ignoredRefundReceiptId, ...reusedRefundPayload } =
    reusedRefundReceipt.events[5];
  void ignoredRefundReceiptId;
  reusedRefundReceipt.events[5].event_id = contentId(reusedRefundPayload);
  assert.throws(
    () => evaluateBtcVoidAtomicSettlementTraceV1(reusedRefundReceipt),
    /reuses evidence_id from a different event/,
  );

  const wrongRole = structuredClone(partialTrace);
  wrongRole.events[4].refund_asset_role =
    direction === "BTC_TO_VOID"
      ? "SOURCE_NATIVE_BTC"
      : "SOURCE_NATIVE_VOID";
  const { event_id: ignoredWrongRoleId, ...wrongRolePayload } = wrongRole.events[4];
  void ignoredWrongRoleId;
  wrongRole.events[4].event_id = contentId(wrongRolePayload);
  assert.throws(
    () => evaluateBtcVoidAtomicSettlementTraceV1(wrongRole),
    /refund_asset_role mismatch/,
  );
}

assert.throws(
  () =>
    evaluateBtcVoidAtomicSettlementTraceV1(
      trace("BTC_TO_VOID", [
        ["BIND_HASHLOCK", "RESERVED", "HASH_BOUND", "a"],
        ["OBSERVE_SOURCE_FUNDING", "HASH_BOUND", "SOURCE_FUNDED", "b"],
        ["CONFIRM_SOURCE_FUNDING", "SOURCE_FUNDED", "SOURCE_CONFIRMED", "c"],
        [
          "OBSERVE_COUNTERPARTY_LOCK",
          "SOURCE_CONFIRMED",
          "COUNTERPARTY_LOCKED",
          "d",
        ],
        [
          "OBSERVE_SOURCE_REFUND",
          "COUNTERPARTY_LOCKED",
          "REFUNDED",
          "2",
        ],
      ]),
    ),
  /transition is not allowed/,
);

const cancelled = evaluateBtcVoidAtomicSettlementTraceV1(
  trace("VOID_TO_BTC", [
    ["BIND_HASHLOCK", "RESERVED", "HASH_BOUND", "a"],
    ["CANCEL_BEFORE_FUNDING", "HASH_BOUND", "CANCELLED_BEFORE_FUNDING", "b"],
  ]),
);
assert.equal(cancelled.final_phase, "CANCELLED_BEFORE_FUNDING");

const held = evaluateBtcVoidAtomicSettlementTraceV1(
  trace("BTC_TO_VOID", [["HOLD", "RESERVED", "HELD", "a"]]),
);
assert.equal(held.final_phase, "HELD");

assert.throws(
  () => evaluateBtcVoidAtomicSettlementTraceV1(trace("BTC_TO_VOID", happyTransitions, {
    bitcoin_refund_horizon_seconds: "5399",
  })),
  /safely longer/,
);
assert.throws(
  () => evaluateBtcVoidAtomicSettlementTraceV1(trace("VOID_TO_BTC", happyTransitions, {
    void_refund_horizon_seconds: "5399",
  })),
  /safely longer/,
);
assert.throws(
  () => evaluateBtcVoidAtomicSettlementTraceV1(trace("BTC_TO_VOID", happyTransitions, {
    bitcoin_network: "bitcoin_mainnet",
  })),
  /bitcoin_regtest/,
);
assert.throws(
  () => evaluateBtcVoidAtomicSettlementTraceV1(trace("BTC_TO_VOID", happyTransitions, {
    void_network_identity: "mainnet0",
  })),
  /isolated Chain-2050/,
);

const outOfOrder = trace();
outOfOrder.events[1].from_phase = "SOURCE_FUNDED";
const { event_id: ignoredOutOfOrderId, ...outOfOrderPayload } = outOfOrder.events[1];
void ignoredOutOfOrderId;
outOfOrder.events[1].event_id = contentId(outOfOrderPayload);
assert.throws(
  () => evaluateBtcVoidAtomicSettlementTraceV1(outOfOrder),
  /from_phase does not match/,
);

const illegal = trace("BTC_TO_VOID", [
  ["FINALIZE_SETTLEMENT", "RESERVED", "SETTLED", "a"],
]);
assert.throws(() => evaluateBtcVoidAtomicSettlementTraceV1(illegal), /not allowed/);

const reopen = trace("BTC_TO_VOID", [
  ["HOLD", "RESERVED", "HELD", "a"],
  ["BIND_HASHLOCK", "HELD", "HASH_BOUND", "b"],
]);
assert.throws(() => evaluateBtcVoidAtomicSettlementTraceV1(reopen), /reopen terminal/);

const tamperedEvent = trace();
tamperedEvent.events[0].evidence_id = `sha256:${"99".repeat(32)}`;
assert.throws(
  () => evaluateBtcVoidAtomicSettlementTraceV1(tamperedEvent),
  /event_id content mismatch/,
);

const reusedEvidence = trace();
reusedEvidence.events[2].evidence_id = reusedEvidence.events[1].evidence_id;
const { event_id: ignoredReusedEvidenceId, ...reusedEvidencePayload } =
  reusedEvidence.events[2];
void ignoredReusedEvidenceId;
reusedEvidence.events[2].event_id = contentId(reusedEvidencePayload);
assert.throws(
  () => evaluateBtcVoidAtomicSettlementTraceV1(reusedEvidence),
  /reuses evidence_id from a different event/,
);

const unknownField = trace();
unknownField.usd_price = "0.50";
assert.throws(() => evaluateBtcVoidAtomicSettlementTraceV1(unknownField), /keys mismatch/);

const canonicalOrder = trace();
canonicalOrder.contract = Object.fromEntries(Object.entries(canonicalOrder.contract).reverse());
canonicalOrder.events = canonicalOrder.events.map((event) =>
  Object.fromEntries(Object.entries(event).reverse()),
);
assert.equal(
  evaluateBtcVoidAtomicSettlementTraceV1(canonicalOrder).evaluation_id,
  baseline.evaluation_id,
);

assert.throws(() => {
  baseline.authority.funds_moved = true;
}, TypeError);

const doc = fs.readFileSync(
  "docs/public/btc-void-atomic-settlement-state-invariants-v1.md",
  "utf8",
);
for (const required of [
  "native BTC/native VOID",
  "bitcoin_regtest",
  "isolated Chain-2050",
  "exact replay",
  "cannot reopen",
  "does not construct",
  "presale",
  "not live",
]) {
  assert.ok(doc.includes(required), `documentation missing ${required}`);
}

process.stdout.write(
  JSON.stringify(
    {
      marker: `${VOID_BTC_VOID_ATOMIC_SETTLEMENT_STATE_INVARIANTS_V1}_PROOF_GREEN`,
      status: "PASS",
      assertions: 89,
      btc_to_void_evaluation_id: baseline.evaluation_id,
      refund_terminal: refunded.final_phase,
      authority: baseline.authority,
    },
    null,
    2,
  ) + "\n",
);
