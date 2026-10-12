#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_WC_VOID_OPENING_COMMITMENT_SCHEMA_V1,
  VOID_WC_VOID_OPENING_LEDGER_DEBIT_SCHEMA_V1,
  VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
  deriveWcVoidCoupledOpeningStateV1,
  verifyWcVoidOpeningLedgerSettlementsV1,
  wcVoidOpeningCommitmentIdV1,
  wcVoidOpeningSettlementIdV1,
} from "../tools/void-wc-void-coupled-opening-v1.mjs";

import {
  VOID_WC_VOID_OPENING_EXECUTION_BINDING_V1,
  VOID_WC_VOID_OPENING_REFUND_CLAIM_SCHEMA_V1,
  VOID_WC_VOID_OPENING_TRANSFER_CLAIM_SCHEMA_V1,
  wcVoidOpeningRefundDispositionIdV1,
  wcVoidOpeningTransferDispositionIdV1,
} from "../tools/void-wc-void-opening-claim-binding-v1.mjs";

import {
  VOID_WC_VOID_OPENING_REPLAY_PROTECTION_AUTHORITY_V1,
  VOID_WC_VOID_OPENING_REPLAY_PROTECTION_V1,
  VOID_WC_VOID_OPENING_REPLAY_STATE_V1,
  VOID_WC_VOID_OPENING_REPLAY_TRANSITION_V1,
  deriveWcVoidOpeningReplayTransitionV1,
  initialWcVoidOpeningReplayStateV1,
} from "../tools/void-wc-void-opening-replay-protection-v1.mjs";

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

const first = commitment("1", "replay-alpha", "250");
const second = commitment("2", "replay-beta", "750");
const firstDebit = debit(first, 250, 1790351000001);
const secondDebit = debit(second, 750, 1790351000002);
const commitments = [first, second];
const ledgerDebits = [firstDebit, secondDebit];

const opening = deriveWcVoidCoupledOpeningStateV1({
  coupled_launch_id: launchId,
  commitments,
  ledger_debits: ledgerDebits,
});
const settlements = verifyWcVoidOpeningLedgerSettlementsV1(
  launchId,
  commitments,
  ledgerDebits,
);
const allocationByCommitment = new Map(
  opening.participant_allocations.map((value) => [
    value.commitment_id,
    value,
  ]),
);
const settlementByCommitment = new Map(
  settlements.settlements.map((value) => [
    value.commitment_id,
    value,
  ]),
);

function transferClaim(commitmentValue, recipient) {
  const allocation = allocationByCommitment.get(
    commitmentValue.commitment_id,
  );
  const settlement = settlementByCommitment.get(
    commitmentValue.commitment_id,
  );
  const value = {
    schema: VOID_WC_VOID_OPENING_TRANSFER_CLAIM_SCHEMA_V1,
    disposition_id: hash("0"),
    coupled_launch_id: launchId,
    opening_state_id: opening.opening_state_id,
    chain_id: VOID_WC_VOID_OPENING_EXECUTION_BINDING_V1.chain_id,
    network_identity:
      VOID_WC_VOID_OPENING_EXECUTION_BINDING_V1.network_identity,
    execution_epoch:
      VOID_WC_VOID_OPENING_EXECUTION_BINDING_V1.execution_epoch,
    void_token: VOID_WC_VOID_OPENING_EXECUTION_BINDING_V1.void_token,
    commitment_id: commitmentValue.commitment_id,
    settlement_id: settlement.settlement_id,
    participant_id: commitmentValue.participant_id,
    account: commitmentValue.account,
    void_recipient: recipient,
    void_atoms: allocation.void_atoms,
  };
  value.disposition_id = wcVoidOpeningTransferDispositionIdV1(value);
  return value;
}

function refundClaim(commitmentValue) {
  const settlement = settlementByCommitment.get(
    commitmentValue.commitment_id,
  );
  const value = {
    schema: VOID_WC_VOID_OPENING_REFUND_CLAIM_SCHEMA_V1,
    disposition_id: hash("0"),
    coupled_launch_id: launchId,
    opening_state_id: opening.opening_state_id,
    chain_id: VOID_WC_VOID_OPENING_EXECUTION_BINDING_V1.chain_id,
    network_identity:
      VOID_WC_VOID_OPENING_EXECUTION_BINDING_V1.network_identity,
    execution_epoch:
      VOID_WC_VOID_OPENING_EXECUTION_BINDING_V1.execution_epoch,
    void_token: VOID_WC_VOID_OPENING_EXECUTION_BINDING_V1.void_token,
    commitment_id: commitmentValue.commitment_id,
    settlement_id: settlement.settlement_id,
    participant_id: commitmentValue.participant_id,
    account: commitmentValue.account,
    wc_refund_units: settlement.amount_wc,
  };
  value.disposition_id = wcVoidOpeningRefundDispositionIdV1(value);
  return value;
}

const transfers = [
  transferClaim(first, "0x1111111111111111111111111111111111111111"),
  transferClaim(second, "0x2222222222222222222222222222222222222222"),
];
const refunds = [refundClaim(first), refundClaim(second)];

assert.equal(
  VOID_WC_VOID_OPENING_REPLAY_PROTECTION_V1,
  "VOID_WC_VOID_OPENING_REPLAY_PROTECTION_V1",
);
assert.equal(
  VOID_WC_VOID_OPENING_REPLAY_STATE_V1,
  "VOID_WC_VOID_OPENING_REPLAY_STATE_V1",
);
assert.equal(
  VOID_WC_VOID_OPENING_REPLAY_TRANSITION_V1,
  "VOID_WC_VOID_OPENING_REPLAY_TRANSITION_V1",
);

const initial = initialWcVoidOpeningReplayStateV1(launchId);
assert.equal(initial.revision, 0);
assert.equal(initial.consumed_binding_ids.length, 0);
assert.match(initial.state_id, /^sha256:[0-9a-f]{64}$/);

const finalize = deriveWcVoidOpeningReplayTransitionV1({
  before_state: initial,
  coupled_launch_id: launchId,
  commitments,
  ledger_debits: ledgerDebits,
  mode: "finalize",
  dispositions: transfers,
});
assert.equal(finalize.before_revision, 0);
assert.equal(finalize.after_revision, 1);
assert.equal(finalize.next_state.revision, 1);
assert.equal(finalize.next_state.consumed_binding_ids.length, 1);
assert.equal(finalize.next_state.consumed_commitment_ids.length, 2);
assert.equal(finalize.next_state.consumed_settlement_ids.length, 2);
assert.equal(finalize.next_state.consumed_disposition_ids.length, 2);
assert.match(finalize.transition_id, /^sha256:[0-9a-f]{64}$/);
assert.equal(finalize.duplicate_replay_protection_source_ready, true);
assert.equal(finalize.duplicate_replay_protection_proven, false);
assert.equal(finalize.durable_replay_state_persistence_verified, false);
assert.equal(finalize.replay_state_write_performed, false);
assert.equal(finalize.runtime_execution_ready, false);
assert.equal(finalize.market_activation_authority, false);
assert.equal(finalize.public_presale_activation_authority, false);
assert.equal(finalize.funds_movement_authority, false);

const reordered = deriveWcVoidOpeningReplayTransitionV1({
  before_state: initial,
  coupled_launch_id: launchId,
  commitments: [second, first],
  ledger_debits: [secondDebit, firstDebit],
  mode: "finalize",
  dispositions: [transfers[1], transfers[0]],
});
assert.equal(reordered.binding_id, finalize.binding_id);
assert.equal(reordered.after_state_id, finalize.after_state_id);
assert.equal(reordered.transition_id, finalize.transition_id);

assert.throws(
  () => deriveWcVoidOpeningReplayTransitionV1({
    before_state: finalize.next_state,
    coupled_launch_id: launchId,
    commitments,
    ledger_debits: ledgerDebits,
    mode: "finalize",
    dispositions: transfers,
  }),
  (error) =>
    error instanceof Error &&
    error.message === "WC_VOID_OPENING_REPLAY_BINDING_ALREADY_CONSUMED",
);

assert.throws(
  () => deriveWcVoidOpeningReplayTransitionV1({
    before_state: finalize.next_state,
    coupled_launch_id: launchId,
    commitments,
    ledger_debits: ledgerDebits,
    mode: "abort",
    dispositions: refunds,
  }),
  (error) =>
    error instanceof Error &&
    error.message === "WC_VOID_OPENING_REPLAY_COMMITMENT_ALREADY_CONSUMED",
);

{
  const tampered = structuredClone(initial);
  tampered.revision = 1;
  assert.throws(
    () => deriveWcVoidOpeningReplayTransitionV1({
      before_state: tampered,
      coupled_launch_id: launchId,
      commitments,
      ledger_debits: ledgerDebits,
      mode: "finalize",
      dispositions: transfers,
    }),
    (error) =>
      error instanceof Error &&
      error.message === "WC_VOID_OPENING_REPLAY_STATE_ID_MISMATCH",
  );
}

for (const [key, value] of Object.entries(
  VOID_WC_VOID_OPENING_REPLAY_PROTECTION_AUTHORITY_V1,
)) {
  if (key === "pure_transition_only") {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const source = fs.readFileSync(
  "tools/void-wc-void-opening-replay-protection-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "appendFileSync",
  "writeFileSync",
  "renameSync",
  "unlinkSync",
  "mkdirSync",
  "JsonRpcProvider(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
  "private_key",
  "mnemonic",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log("VOID_WC_VOID_OPENING_REPLAY_PROTECTION_V1_PROOF_GREEN");
console.log("duplicate_replay_protection_source_ready=true");
console.log("duplicate_replay_protection_proven=false");
console.log("durable_replay_state_persistence_verified=false");
console.log("exact_replay_rejected=true");
console.log("alternate_outcome_same_commitments_rejected=true");
console.log("replay_state_write=false");
console.log("runtime_execution_ready=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
