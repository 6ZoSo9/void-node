import assert from "node:assert/strict";
import crypto from "node:crypto";
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
import type {
  BuyVoidTransactionReceiptV2,
} from "../src/economic/buy_void_verified_payment_v2.js";

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
  request_id: "buyvoid_not_broadcast_coordinator_idempotency_v1",
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
  logs: [{
    address: usdc,
    topics: [transferTopic, topic(delivery), topic(receive)],
    data: "0x989680",
    logIndex: 7,
    transactionHash: paymentTx,
    blockNumber: 100,
    removed: false,
  }],
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
  pool_id: "proof-not-broadcast-idempotency-v1",
  inventory_policy_version: "proof-not-broadcast-idempotency-v1",
  pool_capacity_void_units: "1000000000",
  max_reservation_void_units: "1000000000",
};

const executionPolicy = {
  attempt_journal_enabled: true,
  max_attempts_per_payment: 2,
  chain_id: 2050,
  fulfillment_wallet_allowlist: [wallet],
};

function appliedResult(
  decision: ReturnType<typeof runBuyVoidPipelineCommandV1>,
): any {
  if ("reason" in decision) throw new Error(decision.reason);
  if (!("result" in decision)) throw new Error("expected_applied_result");
  return decision.result;
}

function treeFingerprint(root: string): string {
  const entries: Array<Record<string, unknown>> = [];

  function visit(dir: string): void {
    for (const name of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, name);
      const relative = path.relative(root, full);
      const stat = fs.lstatSync(full);
      if (stat.isDirectory()) {
        entries.push({
          path: relative,
          kind: "dir",
          mode: stat.mode & 0o777,
        });
        visit(full);
      } else if (stat.isFile()) {
        entries.push({
          path: relative,
          kind: "file",
          mode: stat.mode & 0o777,
          size: stat.size,
          sha256: crypto.createHash("sha256").update(fs.readFileSync(full)).digest("hex"),
        });
      }
    }
  }

  visit(root);
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(entries))
    .digest("hex");
}

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-not-broadcast-idempotency-v1-"),
);

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
  now_ms: 1_701_100_000_000,
});
const intent = appliedResult(claim).claim.intent;

const reserve = runBuyVoidPipelineCommandV1({
  action: "reserve_execution",
  apply: true,
  confirmation: VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.reserve_execution,
  root_dir: root,
  intent,
  execution_policy: executionPolicy,
  now_ms: 1_701_100_010_000,
});
const attemptId =
  appliedResult(reserve).attempt.reservation.attempt_id as string;
assert.match(attemptId, /^[0-9a-f]{64}$/);

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
  now_ms: 1_701_100_020_000,
});
assert.equal(appliedResult(prepare).attempt.status, "prepared");

const notBroadcastCommand = {
  action: "record_not_broadcast" as const,
  apply: true,
  confirmation:
    VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.record_not_broadcast,
  root_dir: root,
  attempt_id: attemptId,
  transaction_hash: deliveryTx,
  reason_code: "provider_rejected_before_submission",
  provider_submission_id: "no-submit-idempotency-v1",
  detail: {
    canary: "VOID_BUY_VOID_RECORD_NOT_BROADCAST_COORDINATOR_IDEMPOTENCY_V1",
    external_submission_attempted: false,
  },
  now_ms: 1_701_100_030_000,
};

const first = runBuyVoidPipelineCommandV1(notBroadcastCommand);
const firstResult = appliedResult(first);
assert.equal(firstResult.outcome.status, "recorded");
assert.equal(firstResult.outcome.state.status, "not_broadcast");
assert.equal(firstResult.outcome.state.retry_allowed, true);
assert.equal(
  firstResult.outcome.state.not_broadcast
    .transaction_broadcast_performed_by_this_module,
  false,
);
assert.equal(firstResult.attempt.status, "recorded");
assert.equal(firstResult.attempt.attempt.status, "failed_retryable");
assert.equal(firstResult.attempt.attempt.broadcast, null);
assert.equal(firstResult.attempt.attempt.confirmation, null);

const afterFirst = treeFingerprint(root);

const duplicate = runBuyVoidPipelineCommandV1(notBroadcastCommand);
const duplicateResult = appliedResult(duplicate);
assert.equal(duplicateResult.outcome.status, "duplicate");
assert.equal(duplicateResult.outcome.duplicate, true);
assert.equal(duplicateResult.outcome.state.status, "not_broadcast");
assert.equal(duplicateResult.attempt.status, "duplicate");
assert.equal(duplicateResult.attempt.duplicate, true);
assert.equal(duplicateResult.attempt.attempt.status, "failed_retryable");
assert.equal(treeFingerprint(root), afterFirst);

const conflict = runBuyVoidPipelineCommandV1({
  ...notBroadcastCommand,
  reason_code: "different_prebroadcast_failure",
  provider_submission_id: "different-no-submit-id",
});
assert.equal(conflict.ok, false);
assert.equal(
  "reason" in conflict && conflict.reason,
  "not_broadcast_record_conflict",
);
assert.equal(treeFingerprint(root), afterFirst);

const retry = runBuyVoidPipelineCommandV1({
  action: "reserve_execution",
  apply: true,
  confirmation: VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.reserve_execution,
  root_dir: root,
  intent,
  execution_policy: executionPolicy,
  now_ms: 1_701_100_040_000,
});
const retryResult = appliedResult(retry);
assert.equal(retryResult.status, "reserved");
assert.equal(retryResult.new_attempt, true);
assert.equal(retryResult.attempt.reservation.attempt_number, 2);
assert.notEqual(
  retryResult.attempt.reservation.attempt_id,
  attemptId,
);

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    "src",
    "economic",
    "buy_void_broadcast_outcome_journal_v1.ts",
  ),
  "utf8",
);

assert.equal(
  source.includes("allowExistingNotBroadcastAfterFailure"),
  true,
);
assert.equal(
  source.includes(
    "currentForMutation(\n    input?.root_dir,\n    String(input?.attempt_id || \"\"),\n    true,\n  )",
  ),
  true,
);

console.log(
  "VOID_BUY_VOID_RECORD_NOT_BROADCAST_COORDINATOR_IDEMPOTENCY_V1_GREEN",
);
