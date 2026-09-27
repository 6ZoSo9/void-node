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
  VOID_WC_VOID_OPENING_CLAIM_BINDING_AUTHORITY_V1,
  VOID_WC_VOID_OPENING_CLAIM_BINDING_V1,
  VOID_WC_VOID_OPENING_REFUND_CLAIM_SCHEMA_V1,
  VOID_WC_VOID_OPENING_TRANSFER_CLAIM_SCHEMA_V1,
  deriveWcVoidOpeningClaimBindingV1,
  wcVoidOpeningRefundDispositionIdV1,
  wcVoidOpeningTransferDispositionIdV1,
} from "../tools/void-wc-void-opening-claim-binding-v1.mjs";

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

const first = commitment("1", "wc-opening-alpha", "250");
const second = commitment("2", "wc-opening-beta", "750");
const firstDebit = debit(first, 250, 1790344000001);
const secondDebit = debit(second, 750, 1790344000002);
const commitments = [first, second];
const ledgerDebits = [firstDebit, secondDebit];

const openingState = deriveWcVoidCoupledOpeningStateV1({
  coupled_launch_id: launchId,
  commitments,
  ledger_debits: ledgerDebits,
});
const settlementSet = verifyWcVoidOpeningLedgerSettlementsV1(
  launchId,
  commitments,
  ledgerDebits,
);
const allocationsByCommitment = new Map(
  openingState.participant_allocations.map((value) => [
    value.commitment_id,
    value,
  ]),
);
const settlementsByCommitment = new Map(
  settlementSet.settlements.map((value) => [
    value.commitment_id,
    value,
  ]),
);

function transferClaim(commitmentValue, recipient) {
  const allocation = allocationsByCommitment.get(
    commitmentValue.commitment_id,
  );
  const settlement = settlementsByCommitment.get(
    commitmentValue.commitment_id,
  );
  const value = {
    schema: VOID_WC_VOID_OPENING_TRANSFER_CLAIM_SCHEMA_V1,
    disposition_id: hash("0"),
    coupled_launch_id: launchId,
    opening_state_id: openingState.opening_state_id,
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
  const settlement = settlementsByCommitment.get(
    commitmentValue.commitment_id,
  );
  const value = {
    schema: VOID_WC_VOID_OPENING_REFUND_CLAIM_SCHEMA_V1,
    disposition_id: hash("0"),
    coupled_launch_id: launchId,
    opening_state_id: openingState.opening_state_id,
    commitment_id: commitmentValue.commitment_id,
    settlement_id: settlement.settlement_id,
    participant_id: commitmentValue.participant_id,
    account: commitmentValue.account,
    wc_refund_units: settlement.amount_wc,
  };
  value.disposition_id = wcVoidOpeningRefundDispositionIdV1(value);
  return value;
}

assert.equal(
  VOID_WC_VOID_OPENING_CLAIM_BINDING_V1,
  "VOID_WC_VOID_OPENING_CLAIM_BINDING_V1",
);

const firstTransfer = transferClaim(
  first,
  "0x1111111111111111111111111111111111111111",
);
const secondTransfer = transferClaim(
  second,
  "0x2222222222222222222222222222222222222222",
);

const finalized = deriveWcVoidOpeningClaimBindingV1({
  coupled_launch_id: launchId,
  commitments,
  ledger_debits: ledgerDebits,
  mode: "finalize",
  dispositions: [secondTransfer, firstTransfer],
});

assert.equal(finalized.marker, VOID_WC_VOID_OPENING_CLAIM_BINDING_V1);
assert.equal(finalized.mode, "finalize");
assert.equal(finalized.opening_state_id, openingState.opening_state_id);
assert.match(finalized.binding_id, /^sha256:[0-9a-f]{64}$/);
assert.equal(finalized.disposition_count, 2);
assert.equal(
  finalized.transferred_void_atoms,
  "5000000000000000000000000",
);
assert.equal(finalized.refunded_wc_units, "0");
assert.equal(
  finalized.opening_claim_transfer_or_refund_binding_source_ready,
  true,
);
assert.equal(finalized.cohort_atomic_outcome_required, true);
assert.equal(finalized.mixed_transfer_refund_forbidden, true);
assert.equal(finalized.partial_refund_forbidden, true);
assert.equal(finalized.finalize_requires_exact_tranche_transfer_claims, true);
assert.equal(finalized.abort_requires_exact_full_wc_refund_claims, true);
assert.equal(finalized.opening_state_accepted, true);
assert.equal(finalized.runtime_execution_ready, false);
assert.equal(finalized.binding_persistence_verified, false);
assert.equal(finalized.ledger_write_performed, false);
assert.equal(finalized.wc_balance_mutation_performed, false);
assert.equal(finalized.token_transfer_performed, false);
assert.equal(finalized.refund_write_performed, false);
assert.equal(finalized.market_activation_authority, false);
assert.equal(finalized.public_presale_activation_authority, false);
assert.equal(finalized.funds_movement_authority, false);

const reordered = deriveWcVoidOpeningClaimBindingV1({
  coupled_launch_id: launchId,
  commitments: [second, first],
  ledger_debits: [secondDebit, firstDebit],
  mode: "finalize",
  dispositions: [firstTransfer, secondTransfer],
});
assert.equal(reordered.binding_id, finalized.binding_id);
assert.deepEqual(reordered.dispositions, finalized.dispositions);

const firstRefund = refundClaim(first);
const secondRefund = refundClaim(second);
const aborted = deriveWcVoidOpeningClaimBindingV1({
  coupled_launch_id: launchId,
  commitments,
  ledger_debits: ledgerDebits,
  mode: "abort",
  dispositions: [firstRefund, secondRefund],
});
assert.equal(aborted.mode, "abort");
assert.equal(aborted.transferred_void_atoms, "0");
assert.equal(aborted.refunded_wc_units, "1000");
assert.equal(aborted.opening_state_accepted, false);
assert.match(aborted.binding_id, /^sha256:[0-9a-f]{64}$/);

for (const [key, value] of Object.entries(
  VOID_WC_VOID_OPENING_CLAIM_BINDING_AUTHORITY_V1,
)) {
  assert.equal(
    key === "source_only" ||
      key === "explicit_input_only" ||
      key === "cohort_atomic_outcome_required"
      ? value
      : !value,
    true,
    key,
  );
}

{
  const bad = clone(firstTransfer);
  bad.void_atoms = (BigInt(bad.void_atoms) - 1n).toString();
  bad.disposition_id = wcVoidOpeningTransferDispositionIdV1(bad);
  rejects(
    () => deriveWcVoidOpeningClaimBindingV1({
      coupled_launch_id: launchId,
      commitments,
      ledger_debits: ledgerDebits,
      mode: "finalize",
      dispositions: [bad, secondTransfer],
    }),
    "WC_VOID_OPENING_TRANSFER_ALLOCATION_MISMATCH",
  );
}

{
  const bad = clone(firstTransfer);
  bad.settlement_id = secondDebit.settlement_id;
  bad.disposition_id = wcVoidOpeningTransferDispositionIdV1(bad);
  rejects(
    () => deriveWcVoidOpeningClaimBindingV1({
      coupled_launch_id: launchId,
      commitments,
      ledger_debits: ledgerDebits,
      mode: "finalize",
      dispositions: [bad, secondTransfer],
    }),
    "WC_VOID_OPENING_DISPOSITION_BINDING_MISMATCH",
  );
}

{
  const bad = clone(firstTransfer);
  bad.opening_state_id = hash("b");
  bad.disposition_id = wcVoidOpeningTransferDispositionIdV1(bad);
  rejects(
    () => deriveWcVoidOpeningClaimBindingV1({
      coupled_launch_id: launchId,
      commitments,
      ledger_debits: ledgerDebits,
      mode: "finalize",
      dispositions: [bad, secondTransfer],
    }),
    "WC_VOID_OPENING_DISPOSITION_STATE_MISMATCH",
  );
}

{
  const bad = clone(firstTransfer);
  bad.void_recipient = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  bad.disposition_id = wcVoidOpeningTransferDispositionIdV1(bad);
  rejects(
    () => deriveWcVoidOpeningClaimBindingV1({
      coupled_launch_id: launchId,
      commitments,
      ledger_debits: ledgerDebits,
      mode: "finalize",
      dispositions: [bad, secondTransfer],
    }),
    "INVALID_WC_VOID_OPENING_VOID_RECIPIENT",
  );
}

rejects(
  () => deriveWcVoidOpeningClaimBindingV1({
    coupled_launch_id: launchId,
    commitments,
    ledger_debits: ledgerDebits,
    mode: "finalize",
    dispositions: [firstTransfer, firstTransfer],
  }),
  "DUPLICATE_WC_VOID_OPENING_DISPOSITION_ID",
);

rejects(
  () => deriveWcVoidOpeningClaimBindingV1({
    coupled_launch_id: launchId,
    commitments,
    ledger_debits: ledgerDebits,
    mode: "finalize",
    dispositions: [firstTransfer, secondRefund],
  }),
  "WC_VOID_OPENING_COHORT_ATOMICITY_VIOLATION",
);

rejects(
  () => deriveWcVoidOpeningClaimBindingV1({
    coupled_launch_id: launchId,
    commitments,
    ledger_debits: ledgerDebits,
    mode: "abort",
    dispositions: [firstRefund, secondTransfer],
  }),
  "WC_VOID_OPENING_COHORT_ATOMICITY_VIOLATION",
);

rejects(
  () => deriveWcVoidOpeningClaimBindingV1({
    coupled_launch_id: launchId,
    commitments,
    ledger_debits: ledgerDebits,
    mode: "abort",
    dispositions: [firstRefund],
  }),
  "WC_VOID_OPENING_DISPOSITION_COUNT_MISMATCH",
);

{
  const bad = clone(firstRefund);
  bad.wc_refund_units = "249";
  bad.disposition_id = wcVoidOpeningRefundDispositionIdV1(bad);
  rejects(
    () => deriveWcVoidOpeningClaimBindingV1({
      coupled_launch_id: launchId,
      commitments,
      ledger_debits: ledgerDebits,
      mode: "abort",
      dispositions: [bad, secondRefund],
    }),
    "WC_VOID_OPENING_REFUND_AMOUNT_MISMATCH",
  );
}

const source = fs.readFileSync(
  "tools/void-wc-void-opening-claim-binding-v1.mjs",
  "utf8",
);
assert.doesNotMatch(source, /appendFileSync|writeFileSync|renameSync/);
assert.doesNotMatch(source, /private[_-]?key|mnemonic/i);
assert.doesNotMatch(source, /100\s*WC\s*=\s*1\s*VOID/i);
assert.doesNotMatch(source, /eth_sendRawTransaction|eth_sendTransaction/i);
assert.match(source, /cohort_atomic_outcome_required/);
assert.match(source, /partial_refund_forbidden/);

console.log("VOID_WC_VOID_OPENING_CLAIM_BINDING_V1_PROOF_GREEN");
console.log("opening_claim_transfer_or_refund_binding_source_ready=true");
console.log("cohort_atomic_outcome_required=true");
console.log("mixed_transfer_refund_forbidden=true");
console.log("partial_refund_forbidden=true");
console.log("finalize_exact_5m_void_transfer_claims=true");
console.log("abort_exact_full_wc_refund_claims=true");
console.log("runtime_execution_ready=false");
console.log("binding_persistence_verified=false");
console.log("ledger_write=false");
console.log("token_transfer=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
