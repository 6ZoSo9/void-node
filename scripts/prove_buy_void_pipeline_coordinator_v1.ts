import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1,
  VOID_BUY_VOID_PIPELINE_COORDINATOR_AUTHORITY_V1,
  runBuyVoidPipelineCommandV1,
} from "../src/economic/buy_void_pipeline_coordinator_v1.js";
import {
  buyVoidExecutionAttemptJournalPathsV1,
  readBuyVoidExecutionAttemptV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";
import { readBuyVoidConfirmedStateByPaymentV1 } from "../src/economic/buy_void_confirmed_state_journal_v1.js";
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

const delivery = "0x1111111111111111111111111111111111111111";
const receive = "0x2222222222222222222222222222222222222222";
const usdc = "0x3333333333333333333333333333333333333333";
const wallet = "0x4444444444444444444444444444444444444444";
const paymentTx = `0x${"a".repeat(64)}`;
const deliveryTx = `0x${"b".repeat(64)}`;
const transferTopic =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const topic = (address: string): string =>
  `0x${"0".repeat(24)}${address.slice(2)}`;

const request: BuyVoidRequestV1 = {
  request_id: "buyvoid_pipeline_coordinator_v1",
  source_chain: "base",
  tx_hash: paymentTx,
  delivery_address: delivery,
  receive_address: receive,
  usdc_amount: "25",
  quoted_void: "50",
};

const receipt: BuyVoidTransactionReceiptV2 = {
  status: 1,
  transactionHash: paymentTx,
  blockNumber: 100,
  logs: [
    {
      address: usdc,
      topics: [transferTopic, topic(delivery), topic(receive)],
      data: "0x17d7840",
      logIndex: 7,
      transactionHash: paymentTx,
      blockNumber: 100,
      removed: false,
    },
  ],
};

const verificationPolicy = {
  allowed_chains: ["base"],
  usdc_contract_by_chain: { base: usdc },
  receive_address_by_chain: { base: receive },
  current_block_number_by_chain: { base: 105 },
};

const fulfillmentPolicy: BuyVoidAutoFulfillmentPolicyV1 = {
  automatic_fulfillment_enabled: true,
  allowed_chains: ["base"],
  min_confirmations_by_chain: { base: 3 },
  usdc_contract_by_chain: { base: usdc },
  receive_address_by_chain: { base: receive },
  rate_void_units_numerator: "2",
  rate_void_units_denominator: "1",
  pool_remaining_void_units: "1000000000",
  exact_payment_required: true,
};

const inventoryPolicy = {
  inventory_reservation_enabled: true,
  pool_id: "proof-pipeline-v1",
  inventory_policy_version: "proof-pipeline-v1",
  pool_capacity_void_units: "1000000000",
  max_reservation_void_units: "1000000000",
};

const executionPolicy = {
  attempt_journal_enabled: true,
  max_attempts_per_payment: 2,
  chain_id: 2050,
  fulfillment_wallet_allowlist: [wallet],
};

const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-buy-pipeline-v1-"));

assert.equal(VOID_BUY_VOID_PIPELINE_COORDINATOR_AUTHORITY_V1.dry_by_default, true);
assert.equal(VOID_BUY_VOID_PIPELINE_COORDINATOR_AUTHORITY_V1.rpc_call, false);
assert.equal(VOID_BUY_VOID_PIPELINE_COORDINATOR_AUTHORITY_V1.wallet_access, false);
assert.equal(VOID_BUY_VOID_PIPELINE_COORDINATOR_AUTHORITY_V1.signing, false);
assert.equal(
  VOID_BUY_VOID_PIPELINE_COORDINATOR_AUTHORITY_V1.transaction_broadcast,
  false,
);
assert.equal(VOID_BUY_VOID_PIPELINE_COORDINATOR_AUTHORITY_V1.money_movement, false);

const safeRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-pipeline-safe-admission-v1-"),
);
const safeClaim = runBuyVoidPipelineCommandV1({
  action: "verify_reserve_and_claim",
  apply: true,
  confirmation:
    VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.verify_reserve_and_claim,
  root_dir: safeRoot,
  request,
  receipt,
  verification_policy: verificationPolicy,
  fulfillment_policy: fulfillmentPolicy,
  inventory_policy: inventoryPolicy,
  now_ms: 1_701_000_000_000,
});
if ("reason" in safeClaim) throw new Error(safeClaim.reason);
const safeResult = appliedResult(safeClaim);
assert.equal(safeResult.reservation.status, "reserved");
assert.equal(safeResult.claim.status, "approved");
assert.equal(safeResult.reservation_before_new_claim, true);
fs.rmSync(safeRoot, { recursive: true, force: true });

const dryClaim = runBuyVoidPipelineCommandV1({
  action: "verify_and_claim",
  root_dir: root,
  request,
  receipt,
  verification_policy: verificationPolicy,
  fulfillment_policy: fulfillmentPolicy,
});
if ("reason" in dryClaim) throw new Error(dryClaim.reason);
assert.equal(dryClaim.status, "dry_run");
assert.equal(dryClaim.mutation_performed, false);
assert.equal(
  dryClaim.required_confirmation,
  VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.verify_and_claim,
);
assert.deepEqual(fs.readdirSync(root), []);

const wrongClaimConfirmation = runBuyVoidPipelineCommandV1({
  action: "verify_and_claim",
  apply: true,
  confirmation: "wrong",
  root_dir: root,
  request,
  receipt,
  verification_policy: verificationPolicy,
  fulfillment_policy: fulfillmentPolicy,
});
assert.equal(wrongClaimConfirmation.ok, false);
assert.equal(
  "reason" in wrongClaimConfirmation && wrongClaimConfirmation.reason,
  "explicit_confirmation_required",
);

const retiredClaim = runBuyVoidPipelineCommandV1({
  action: "verify_and_claim",
  apply: true,
  confirmation: VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.verify_and_claim,
  root_dir: root,
  request,
  receipt,
  verification_policy: verificationPolicy,
  fulfillment_policy: fulfillmentPolicy,
  now_ms: 1_701_000_000_000,
});
assert.equal(retiredClaim.ok, false);
assert.equal(retiredClaim.status, "held");
assert.equal(retiredClaim.applied, true);
assert.equal(retiredClaim.mutation_performed, false);
assert.equal(
  "reason" in retiredClaim && retiredClaim.reason,
  "legacy_verify_and_claim_apply_retired",
);
assert.deepEqual(fs.readdirSync(root), []);

const claimed = runBuyVoidPipelineCommandV1({
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
  now_ms: 1_701_000_000_000,
});
if ("reason" in claimed) throw new Error(claimed.reason);
assert.equal(claimed.status, "applied");
const claimResult = appliedResult(claimed).claim;
const intent = claimResult.intent;
assert.equal(intent.claim.request_id, request.request_id);

const executionPaths = buyVoidExecutionAttemptJournalPathsV1(root);
const dryReserve = runBuyVoidPipelineCommandV1({
  action: "reserve_execution",
  root_dir: root,
  intent,
  execution_policy: executionPolicy,
});
if ("reason" in dryReserve) throw new Error(dryReserve.reason);
assert.equal(dryReserve.status, "dry_run");
assert.equal(fs.existsSync(executionPaths.journal_dir), false);

const reserved = runBuyVoidPipelineCommandV1({
  action: "reserve_execution",
  apply: true,
  confirmation: VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.reserve_execution,
  root_dir: root,
  intent,
  execution_policy: executionPolicy,
  now_ms: 1_701_000_010_000,
});
if ("reason" in reserved) throw new Error(reserved.reason);
const attemptId = appliedResult(reserved).attempt.reservation.attempt_id as string;
assert.match(attemptId, /^[0-9a-f]{64}$/);

const prepared = runBuyVoidPipelineCommandV1({
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
    amount_units: "50000000",
  },
  now_ms: 1_701_000_020_000,
});
if ("reason" in prepared) throw new Error(prepared.reason);
assert.equal(appliedResult(prepared).attempt.status, "prepared");

const accepted = runBuyVoidPipelineCommandV1({
  action: "record_broadcast_accepted",
  apply: true,
  confirmation:
    VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.record_broadcast_accepted,
  root_dir: root,
  attempt_id: attemptId,
  transaction_hash: deliveryTx,
  provider_submission_id: "provider-accepted-1",
  now_ms: 1_701_000_030_000,
});
if ("reason" in accepted) throw new Error(accepted.reason);
assert.equal(appliedResult(accepted).outcome.state.status, "broadcast_accepted");

const dryConfirmed = runBuyVoidPipelineCommandV1({
  action: "record_confirmed",
  root_dir: root,
  attempt_id: attemptId,
  intent,
  observation: {
    chain_id: 2050,
    transaction_hash: deliveryTx,
    transaction_status: 1,
    block_number: 500,
    block_hash: `0x${"9".repeat(64)}`,
    current_block_number: 505,
    from_address: wallet,
    to_address: delivery,
    amount_units: "50000000",
  },
  confirmation_policy: {
    chain_id: 2050,
    min_confirmations: 3,
    fulfillment_wallet_allowlist: [wallet],
  },
});
if ("reason" in dryConfirmed) throw new Error(dryConfirmed.reason);
assert.equal(dryConfirmed.status, "dry_run");
assert.equal(
  readBuyVoidConfirmedStateByPaymentV1({
    root_dir: root,
    canonical_payment_identity: intent.claim.canonical_payment_identity,
  }),
  null,
);

const confirmed = runBuyVoidPipelineCommandV1({
  action: "record_confirmed",
  apply: true,
  confirmation: VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.record_confirmed,
  root_dir: root,
  attempt_id: attemptId,
  intent,
  observation: {
    chain_id: 2050,
    transaction_hash: deliveryTx,
    transaction_status: 1,
    block_number: 500,
    block_hash: `0x${"9".repeat(64)}`,
    current_block_number: 505,
    from_address: wallet,
    to_address: delivery,
    amount_units: "50000000",
  },
  confirmation_policy: {
    chain_id: 2050,
    min_confirmations: 3,
    fulfillment_wallet_allowlist: [wallet],
  },
  now_ms: 1_701_000_040_000,
});
if ("reason" in confirmed) throw new Error(confirmed.reason);
assert.equal(appliedResult(confirmed).final_state.state.buyer_status.buyer_fulfilled, true);
assert.equal(
  appliedResult(confirmed).final_state.state.allocation_status.allocation_fulfilled,
  true,
);
assert.equal(
  appliedResult(confirmed).outcome.state.status,
  "confirmed",
);

const attemptState = readBuyVoidExecutionAttemptV1({
  root_dir: root,
  attempt_id: attemptId,
});
assert.ok(attemptState);
assert.equal(attemptState.status, "confirmed");

const finalState = readBuyVoidConfirmedStateByPaymentV1({
  root_dir: root,
  canonical_payment_identity: intent.claim.canonical_payment_identity,
});
assert.ok(finalState);
assert.equal(finalState.fulfillment_receipt.void_delivery_tx_hash, deliveryTx);

const duplicate = runBuyVoidPipelineCommandV1({
  action: "record_confirmed",
  apply: true,
  confirmation: VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.record_confirmed,
  root_dir: root,
  attempt_id: attemptId,
  intent,
  observation: {
    chain_id: 2050,
    transaction_hash: deliveryTx,
    transaction_status: 1,
    block_number: 500,
    block_hash: `0x${"9".repeat(64)}`,
    current_block_number: 510,
    from_address: wallet,
    to_address: delivery,
    amount_units: "50000000",
  },
  confirmation_policy: {
    chain_id: 2050,
    min_confirmations: 3,
    fulfillment_wallet_allowlist: [wallet],
  },
  prior_results: [appliedResult(confirmed).confirmation.record],
  now_ms: 1_701_000_050_000,
});
if ("reason" in duplicate) throw new Error(duplicate.reason);
assert.equal(appliedResult(duplicate).final_state.status, "duplicate");

const partialRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-pipeline-partial-v1-"),
);
const partialRequest = {
  ...request,
  request_id: "buyvoid_pipeline_partial_mutation_v1",
};
const partialClaim = runBuyVoidPipelineCommandV1({
  action: "verify_reserve_and_claim",
  apply: true,
  confirmation:
    VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.verify_reserve_and_claim,
  root_dir: partialRoot,
  request: partialRequest,
  receipt,
  verification_policy: verificationPolicy,
  fulfillment_policy: fulfillmentPolicy,
  inventory_policy: inventoryPolicy,
  now_ms: 1_701_000_100_000,
});
const partialIntent = appliedResult(partialClaim).claim.intent;
const partialReserve = runBuyVoidPipelineCommandV1({
  action: "reserve_execution",
  apply: true,
  confirmation: VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.reserve_execution,
  root_dir: partialRoot,
  intent: partialIntent,
  execution_policy: executionPolicy,
  now_ms: 1_701_000_110_000,
});
const partialAttemptId = appliedResult(partialReserve).attempt.reservation
  .attempt_id as string;
const partialPrepare = runBuyVoidPipelineCommandV1({
  action: "prepare_execution",
  apply: true,
  confirmation: VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.prepare_execution,
  root_dir: partialRoot,
  attempt_id: partialAttemptId,
  intent: partialIntent,
  execution_policy: executionPolicy,
  transaction: {
    chain_id: 2050,
    transaction_hash: deliveryTx,
    from_address: wallet,
    to_address: delivery,
    amount_units: "50000000",
  },
  now_ms: 1_701_000_120_000,
});
if ("reason" in partialPrepare) throw new Error(partialPrepare.reason);

fs.writeFileSync(
  path.join(partialRoot, "buy-void-broadcast-outcomes-v1"),
  "blocked-by-proof\n",
  { mode: 0o600 },
);
const partialMutation = runBuyVoidPipelineCommandV1({
  action: "record_broadcast_unknown",
  apply: true,
  confirmation:
    VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.record_broadcast_unknown,
  root_dir: partialRoot,
  attempt_id: partialAttemptId,
  transaction_hash: deliveryTx,
  reason_code: "synthetic_outcome_journal_fault",
  provider_submission_id: "provider-partial-1",
  now_ms: 1_701_000_130_000,
});
assert.equal(partialMutation.ok, false);
assert.equal(partialMutation.status, "held");
assert.equal(partialMutation.applied, true);
assert.equal(partialMutation.mutation_performed, true);
assert.equal(
  "reason" in partialMutation && partialMutation.reason,
  "broadcast_outcome_state_invalid",
);
const partiallyMutatedAttempt = readBuyVoidExecutionAttemptV1({
  root_dir: partialRoot,
  attempt_id: partialAttemptId,
});
assert.ok(partiallyMutatedAttempt?.broadcast);
assert.equal(
  partiallyMutatedAttempt.broadcast.void_delivery_tx_hash,
  deliveryTx,
);

fs.rmSync(partialRoot, { recursive: true, force: true });
fs.rmSync(root, { recursive: true, force: true });

console.log("VOID_BUY_VOID_PIPELINE_COORDINATOR_V1_GREEN");
console.log("partial_mutation_truth_preserved=1");
console.log("legacy_verify_and_claim_apply_retired=1");
