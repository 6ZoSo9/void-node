import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1,
  runBuyVoidPipelineCommandV1,
} from "../src/economic/buy_void_pipeline_coordinator_v1.js";
import type {
  BuyVoidAutoFulfillmentPolicyV1,
  BuyVoidRequestV1,
} from "../src/economic/buy_void_auto_fulfillment_v1.js";
import type { BuyVoidTransactionReceiptV2 } from "../src/economic/buy_void_verified_payment_v2.js";

function appliedResult(decision: ReturnType<typeof runBuyVoidPipelineCommandV1>): any {
  if ("reason" in decision) throw new Error(decision.reason);
  if (!("result" in decision)) throw new Error("expected_applied_result");
  return decision.result;
}

const source = fs.readFileSync(
  path.join(process.cwd(), "src", "economic", "buy_void_pipeline_coordinator_v1.ts"),
  "utf8",
);

for (const forbidden of [
  "fetch(",
  "sendTransaction(",
  "broadcastTransaction(",
  "new Wallet(",
  "PRIVATE_KEY",
  "private_key",
  "app.post(",
  "app.get(",
]) {
  assert.equal(source.includes(forbidden), false, `forbidden authority: ${forbidden}`);
}
for (const required of [
  "dry_by_default: true",
  "explicit_confirmation_required: true",
  'verify_and_claim: "buyVoidVerifyAndClaim"',
  'verify_reserve_and_claim: "buyVoidVerifyReserveAndClaim"',
  "legacy_verify_and_claim_apply_retired",
  "canonical_inventory_reservation_before_new_paid_claim: true",
  "paid_unreservable_terminal_obligation_required: true",
  'record_broadcast_unknown: "buyVoidRecordBroadcastUnknown"',
  'record_reverted: "buyVoidRecordReverted"',
  'record_confirmed: "buyVoidRecordConfirmed"',
  "recordBuyVoidExecutionPostbroadcastFailureV1",
  "recordBuyVoidBroadcastRevertedV1",
]) {
  assert.equal(source.includes(required), true, `missing guard marker: ${required}`);
}

const delivery = "0x1111111111111111111111111111111111111111";
const receive = "0x2222222222222222222222222222222222222222";
const usdc = "0x3333333333333333333333333333333333333333";
const wallet = "0x4444444444444444444444444444444444444444";
const paymentTx = `0x${"c".repeat(64)}`;
const deliveryTx = `0x${"d".repeat(64)}`;
const transferTopic =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const topic = (address: string): string =>
  `0x${"0".repeat(24)}${address.slice(2)}`;

const request: BuyVoidRequestV1 = {
  request_id: "buyvoid_pipeline_guard_v1",
  source_chain: "base",
  tx_hash: paymentTx,
  delivery_address: delivery,
  receive_address: receive,
  usdc_amount: "10",
  quoted_void: "20",
};
const receipt: BuyVoidTransactionReceiptV2 = {
  status: 1,
  transactionHash: paymentTx,
  blockNumber: 100,
  logs: [
    {
      address: usdc,
      topics: [transferTopic, topic(delivery), topic(receive)],
      data: "0x989680",
      logIndex: 4,
      transactionHash: paymentTx,
      blockNumber: 100,
    },
  ],
};
const fulfillmentPolicy: BuyVoidAutoFulfillmentPolicyV1 = {
  automatic_fulfillment_enabled: true,
  allowed_chains: ["base"],
  min_confirmations_by_chain: { base: 3 },
  usdc_contract_by_chain: { base: usdc },
  receive_address_by_chain: { base: receive },
  rate_void_units_numerator: 2,
  rate_void_units_denominator: 1,
  pool_remaining_void_units: "1000000000",
  exact_payment_required: true,
};
const verificationPolicy = {
  allowed_chains: ["base"],
  usdc_contract_by_chain: { base: usdc },
  receive_address_by_chain: { base: receive },
  current_block_number_by_chain: { base: 105 },
};
const inventoryPolicy = {
  inventory_reservation_enabled: true,
  pool_id: "proof-pipeline-guard-v1",
  inventory_policy_version: "proof-pipeline-guard-v1",
  pool_capacity_void_units: "1000000000",
  max_reservation_void_units: "1000000000",
};
const executionPolicy = {
  attempt_journal_enabled: true,
  max_attempts_per_payment: 2,
  chain_id: 2050,
  fulfillment_wallet_allowlist: [wallet],
};
const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-buy-pipeline-guard-"));

const retiredClaim = runBuyVoidPipelineCommandV1({
  action: "verify_and_claim",
  apply: true,
  confirmation: VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.verify_and_claim,
  root_dir: root,
  request,
  receipt,
  verification_policy: verificationPolicy,
  fulfillment_policy: fulfillmentPolicy,
});
assert.equal(retiredClaim.ok, false);
assert.equal(retiredClaim.status, "held");
assert.equal(retiredClaim.mutation_performed, false);
assert.equal(
  "reason" in retiredClaim && retiredClaim.reason,
  "legacy_verify_and_claim_apply_retired",
);
assert.deepEqual(fs.readdirSync(root), []);

const claim = runBuyVoidPipelineCommandV1({
  action: "verify_reserve_and_claim",
  apply: true,
  confirmation:
    VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.verify_reserve_and_claim,
  root_dir: root,
  request,
  receipt,
  verification_policy: verificationPolicy,
  fulfillment_policy: fulfillmentPolicy,
  inventory_policy: inventoryPolicy,
});
if ("reason" in claim) throw new Error(claim.reason);
const intent = appliedResult(claim).claim.intent;

const reserve = runBuyVoidPipelineCommandV1({
  action: "reserve_execution",
  apply: true,
  confirmation: VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.reserve_execution,
  root_dir: root,
  intent,
  execution_policy: executionPolicy,
});
if ("reason" in reserve) throw new Error(reserve.reason);
const attemptId = appliedResult(reserve).attempt.reservation.attempt_id as string;

const dryPrepare = runBuyVoidPipelineCommandV1({
  action: "prepare_execution",
  root_dir: root,
  attempt_id: attemptId,
  intent,
  execution_policy: executionPolicy,
  transaction: {
    chain_id: 2050,
    transaction_hash: deliveryTx,
    from_address: wallet,
    to_address: delivery,
    amount_units: "20000000",
  },
});
if ("reason" in dryPrepare) throw new Error(dryPrepare.reason);
assert.equal(dryPrepare.status, "dry_run");

const prepare = runBuyVoidPipelineCommandV1({
  action: "prepare_execution",
  apply: true,
  confirmation: VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.prepare_execution,
  root_dir: root,
  attempt_id: attemptId,
  intent,
  execution_policy: executionPolicy,
  transaction: {
    chain_id: 2050,
    transaction_hash: deliveryTx,
    from_address: wallet,
    to_address: delivery,
    amount_units: "20000000",
  },
});
if ("reason" in prepare) throw new Error(prepare.reason);

const wrongUnknown = runBuyVoidPipelineCommandV1({
  action: "record_broadcast_unknown",
  apply: true,
  confirmation: "wrong",
  root_dir: root,
  attempt_id: attemptId,
  transaction_hash: deliveryTx,
  reason_code: "provider_timeout",
});
assert.equal(wrongUnknown.ok, false);
assert.equal("reason" in wrongUnknown && wrongUnknown.reason, "explicit_confirmation_required");

const unknown = runBuyVoidPipelineCommandV1({
  action: "record_broadcast_unknown",
  apply: true,
  confirmation:
    VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.record_broadcast_unknown,
  root_dir: root,
  attempt_id: attemptId,
  transaction_hash: deliveryTx,
  reason_code: "provider_timeout",
  provider_submission_id: "provider-timeout-1",
});
if ("reason" in unknown) throw new Error(unknown.reason);
assert.equal(appliedResult(unknown).outcome.state.status, "broadcast_unknown");
assert.equal(appliedResult(unknown).outcome.state.retry_allowed, false);
assert.equal(appliedResult(unknown).outcome.state.reconciliation_required, true);

const frozenReserve = runBuyVoidPipelineCommandV1({
  action: "reserve_execution",
  apply: true,
  confirmation: VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.reserve_execution,
  root_dir: root,
  intent,
  execution_policy: executionPolicy,
});
if ("reason" in frozenReserve) throw new Error(frozenReserve.reason);
assert.equal(appliedResult(frozenReserve).status, "duplicate");
assert.equal(appliedResult(frozenReserve).new_attempt, false);
assert.equal(
  appliedResult(frozenReserve).attempt.reservation.attempt_id,
  attemptId,
);

const underConfirmedRevert = runBuyVoidPipelineCommandV1({
  action: "record_reverted",
  apply: true,
  confirmation: VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.record_reverted,
  root_dir: root,
  attempt_id: attemptId,
  transaction_hash: deliveryTx,
  observation: {
    chain_id: 2050,
    transaction_status: 0,
    block_number: 500,
    current_block_number: 500,
  },
  outcome_policy: {
    outcome_journal_enabled: true,
    chain_id: 2050,
    min_revert_confirmations: 3,
  },
});
assert.equal(underConfirmedRevert.ok, false);
assert.equal(
  "reason" in underConfirmedRevert && underConfirmedRevert.reason,
  "insufficient_revert_confirmations",
);

const reverted = runBuyVoidPipelineCommandV1({
  action: "record_reverted",
  apply: true,
  confirmation: VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.record_reverted,
  root_dir: root,
  attempt_id: attemptId,
  transaction_hash: deliveryTx,
  observation: {
    chain_id: 2050,
    transaction_status: 0,
    block_number: 500,
    current_block_number: 502,
  },
  outcome_policy: {
    outcome_journal_enabled: true,
    chain_id: 2050,
    min_revert_confirmations: 3,
  },
});
if ("reason" in reverted) throw new Error(reverted.reason);
assert.equal(appliedResult(reverted).attempt.attempt.status, "failed_retryable");
assert.equal(appliedResult(reverted).outcome.state.status, "reverted");

const retryReserve = runBuyVoidPipelineCommandV1({
  action: "reserve_execution",
  apply: true,
  confirmation: VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.reserve_execution,
  root_dir: root,
  intent,
  execution_policy: executionPolicy,
});
if ("reason" in retryReserve) throw new Error(retryReserve.reason);
assert.equal(appliedResult(retryReserve).new_attempt, true);
assert.equal(appliedResult(retryReserve).attempt.reservation.attempt_number, 2);
assert.notEqual(
  appliedResult(retryReserve).attempt.reservation.attempt_id,
  attemptId,
);

console.log("VOID_BUY_VOID_PIPELINE_COORDINATOR_GUARD_V1_GREEN");
