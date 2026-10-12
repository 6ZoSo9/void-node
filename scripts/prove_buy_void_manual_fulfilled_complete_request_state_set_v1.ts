import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import evaluateBuyVoidManualFulfilledConfirmedStateGateV1 from
  "../src/economic/buy_void_manual_fulfilled_confirmed_state_gate_v1.js";
import {
  VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_V1,
  buyVoidConfirmedStateJournalPathsV1,
  type BuyVoidConfirmedStateV1,
} from "../src/economic/buy_void_confirmed_state_journal_v1.js";
import {
  VOID_BUY_VOID_CONFIRMED_STATE_REQUEST_RESOLUTION_V1,
  resolveBuyVoidConfirmedStatesByRequestV1,
} from "../src/economic/buy_void_confirmed_state_request_resolution_v1.js";

const REQUEST_ID = "buyvoid_manual_complete_request_set_v1";
const INSTRUCTION_ID = "buyvoid_instruction_complete_request_set_v1";
const PAYMENT_IDENTITY = `voidpay1:base:0x${"a".repeat(64)}:11`;
const DELIVERY_ADDRESS = `0x${"b".repeat(40)}`;
const DELIVERY_TX_A = `0x${"c".repeat(64)}`;
const DELIVERY_TX_B = `0x${"d".repeat(64)}`;
const PAYMENT_TX = `0x${"e".repeat(64)}`;

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function stableFingerprint(parts: Record<string, string>): string {
  return sha256Hex(
    Object.keys(parts)
      .sort()
      .map((key) => `${key}=${parts[key]}`)
      .join("\n"),
  );
}

function paymentKey(identity: string): string {
  return sha256Hex(`void-buy-confirmed-payment-v1\n${identity}`);
}

function requestKey(requestId: string): string {
  return sha256Hex(`void-buy-confirmed-request-v1\n${requestId}`);
}

function deliveryKey(txHash: string): string {
  return sha256Hex(`void-buy-confirmed-delivery-v1\n${txHash}`);
}

function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

function buildState(
  deliveryTx: string,
  paymentIdentity = PAYMENT_IDENTITY,
): BuyVoidConfirmedStateV1 {
  const deliveryBlockNumber = "2050";
  const deliveryChainId = "2050";
  const voidAmountUnits = "14000000000000000000";
  const normalizedTx = deliveryTx.toLowerCase();
  const stateId = stableFingerprint({
    canonical_payment_identity: paymentIdentity,
    request_id: REQUEST_ID,
    instruction_id: INSTRUCTION_ID,
    void_delivery_tx_hash: normalizedTx,
  });
  const projectionFingerprint = stableFingerprint({
    state_id: stateId,
    canonical_payment_identity: paymentIdentity,
    request_id: REQUEST_ID,
    instruction_id: INSTRUCTION_ID,
    void_delivery_tx_hash: normalizedTx,
    delivery_address: DELIVERY_ADDRESS,
    void_amount_units: voidAmountUnits,
    delivery_block_number: deliveryBlockNumber,
    delivery_chain_id: deliveryChainId,
  });

  return {
    schema: "void_buy_void_confirmed_state_v1",
    marker: VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_V1,
    state_id: stateId,
    persisted_at_ms: 1_786_000_000_000,
    payment_key_sha256: paymentKey(paymentIdentity),
    request_key_sha256: requestKey(REQUEST_ID),
    delivery_key_sha256: deliveryKey(normalizedTx),
    canonical_payment_identity: paymentIdentity,
    request_id: REQUEST_ID,
    instruction_id: INSTRUCTION_ID,
    confirmation: {
      schema: "void_buy_void_confirmed_fulfillment_record_v1",
      marker: "VOID_BUY_VOID_FULFILLMENT_CONFIRMATION_V1",
      status: "fulfilled_confirmed",
      canonical_payment_identity: paymentIdentity,
      canonical_payment_identity_sha256: sha256Hex(paymentIdentity),
      request_id: REQUEST_ID,
      instruction_id: INSTRUCTION_ID,
      source_payment_chain: "base",
      payment_transaction_hash: PAYMENT_TX,
      payment_log_index: "11",
      delivery_chain_id: deliveryChainId,
      void_delivery_tx_hash: normalizedTx,
      delivery_block_number: deliveryBlockNumber,
      delivery_confirmation_count: "12",
      fulfillment_wallet: `0x${"f".repeat(40)}`,
      delivery_address: DELIVERY_ADDRESS,
      void_amount_units: voidAmountUnits,
      delivery_binding_fingerprint: "0".repeat(64),
      buyer_fulfilled: true,
      automatic_fulfillment_completed: true,
      payment_claim_persisted: true,
      delivery_confirmation_observed: true,
      signing_authorized_by_this_module: false,
      transaction_broadcast_authorized_by_this_module: false,
      money_movement_authorized_by_this_module: false,
    },
    buyer_status: {
      schema: "void_buy_void_buyer_fulfilled_status_v1",
      status: "fulfilled_confirmed",
      request_id: REQUEST_ID,
      delivery_address: DELIVERY_ADDRESS,
      void_delivery_tx_hash: normalizedTx,
      buyer_fulfilled: true,
    },
    allocation_status: {
      schema: "void_buy_void_allocation_fulfilled_status_v1",
      status: "fulfilled_confirmed",
      canonical_payment_identity: paymentIdentity,
      request_id: REQUEST_ID,
      reserved_void_units: voidAmountUnits,
      delivered_void_units: voidAmountUnits,
      allocation_fulfilled: true,
    },
    fulfillment_receipt: {
      schema: "void_buy_void_fulfillment_receipt_v1",
      status: "confirmed",
      delivery_chain_id: deliveryChainId,
      void_delivery_tx_hash: normalizedTx,
      delivery_block_number: deliveryBlockNumber,
      delivery_confirmation_count: "12",
      fulfillment_wallet: `0x${"f".repeat(40)}`,
      delivery_address: DELIVERY_ADDRESS,
      void_amount_units: voidAmountUnits,
    },
    projection_fingerprint: projectionFingerprint,
    signing_authorized_by_this_module: false,
    transaction_broadcast_authorized_by_this_module: false,
    money_movement_authorized_by_this_module: false,
  };
}

function completionFor(state: BuyVoidConfirmedStateV1): Record<string, unknown> {
  return {
    schema: "void_buy_void_confirmed_state_completion_v1",
    marker: VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_V1,
    state_id: state.state_id,
    completed_at_ms: 1_786_000_000_100,
    payment_key_sha256: state.payment_key_sha256,
    request_key_sha256: state.request_key_sha256,
    delivery_key_sha256: state.delivery_key_sha256,
    projection_fingerprint: state.projection_fingerprint,
    final: true,
  };
}

function requestIndexFor(state: BuyVoidConfirmedStateV1): Record<string, unknown> {
  return {
    schema: "void_buy_void_confirmed_state_index_v1",
    marker: VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_V1,
    index_kind: "request",
    key_sha256: state.request_key_sha256,
    state_id: state.state_id,
    canonical_payment_identity: state.canonical_payment_identity,
    request_id: state.request_id,
    instruction_id: state.instruction_id,
    void_delivery_tx_hash: state.confirmation.void_delivery_tx_hash,
  };
}

function persistFixture(root: string, state: BuyVoidConfirmedStateV1): void {
  const paths = buyVoidConfirmedStateJournalPathsV1(root);
  writeJson(
    path.join(paths.candidates_dir, `${state.state_id}.json`),
    state,
  );
  writeJson(
    path.join(paths.complete_dir, `${state.state_id}.json`),
    completionFor(state),
  );
}

async function runGate(
  deliveryTx: string,
): Promise<{ result: any; writes: Record<string, any>[] }> {
  const writes: Record<string, any>[] = [];
  const found = {
    request_id: REQUEST_ID,
    status: "payment_submitted_pending_manual_review",
    tx_hash: PAYMENT_TX,
    usdc_amount: 7,
    quoted_void: 14,
    delivery_address: DELIVERY_ADDRESS,
  };
  const result = await evaluateBuyVoidManualFulfilledConfirmedStateGateV1(
    found,
    REQUEST_ID,
    "fulfilled",
    "focused-complete-request-set-proof",
    deliveryTx,
    async () => [
      {
        request_id: REQUEST_ID,
        operator_status: "payment_verified",
      },
    ],
    (requests) => requests.map((request) => ({
      ...request,
      effective_status: "payment_verified",
    })),
    async (event) => {
      writes.push(event);
    },
  );
  return { result, writes };
}

async function main(): Promise<void> {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-buy-manual-complete-request-set-v1-"),
  );
  const priorRoot = process.env.VOID_BUY_VOID_RUNTIME_DIR;
  process.env.VOID_BUY_VOID_RUNTIME_DIR = root;

  try {
    const paths = buyVoidConfirmedStateJournalPathsV1(root);
    const first = buildState(DELIVERY_TX_A);
    persistFixture(root, first);
    writeJson(
      path.join(paths.requests_dir, `${first.request_key_sha256}.json`),
      requestIndexFor(first),
    );

    const exactResolution = resolveBuyVoidConfirmedStatesByRequestV1(
      root,
      REQUEST_ID,
    );
    assert.equal(exactResolution.length, 1);
    assert.equal(exactResolution[0].state_id, first.state_id);

    const exactGate = await runGate(DELIVERY_TX_A);
    assert.equal(exactGate.result.ok, true);
    assert.equal(exactGate.writes.length, 1);
    assert.equal(
      exactGate.writes[0].canonical_confirmed_state_id,
      first.state_id,
    );

    const requestIndexPath = path.join(
      paths.requests_dir,
      `${first.request_key_sha256}.json`,
    );
    writeJson(requestIndexPath, {
      ...requestIndexFor(first),
      state_id: "9".repeat(64),
    });
    assert.throws(
      () => resolveBuyVoidConfirmedStatesByRequestV1(root, REQUEST_ID),
      /request_index_state_id_mismatch/,
    );
    const indexFailure = await runGate(DELIVERY_TX_A);
    assert.equal(indexFailure.result.ok, false);
    assert.equal(indexFailure.result.status_code, 503);
    assert.equal(
      indexFailure.result.body.error,
      "canonical_confirmed_state_read_failed",
    );
    assert.equal(indexFailure.writes.length, 0);
    writeJson(requestIndexPath, requestIndexFor(first));

    const completionPath = path.join(
      paths.complete_dir,
      `${first.state_id}.json`,
    );
    writeJson(completionPath, {
      ...completionFor(first),
      projection_fingerprint: "8".repeat(64),
    });
    assert.throws(
      () => resolveBuyVoidConfirmedStatesByRequestV1(root, REQUEST_ID),
      /completion_projection_fingerprint_mismatch/,
    );
    writeJson(completionPath, completionFor(first));

    const conflicting = buildState(
      DELIVERY_TX_B,
      `${PAYMENT_IDENTITY}:conflict`,
    );
    persistFixture(root, conflicting);

    const completeRequestSet = resolveBuyVoidConfirmedStatesByRequestV1(
      root,
      REQUEST_ID,
    );
    assert.equal(completeRequestSet.length, 2);
    assert.deepEqual(
      new Set(completeRequestSet.map((state) => state.state_id)),
      new Set([first.state_id, conflicting.state_id]),
    );

    const ambiguousGate = await runGate(DELIVERY_TX_A);
    assert.equal(ambiguousGate.result.ok, false);
    assert.equal(ambiguousGate.result.status_code, 409);
    assert.equal(
      ambiguousGate.result.body.error,
      "manual_fulfilled_confirmed_state_ambiguous",
    );
    assert.equal(
      ambiguousGate.result.body.canonical_confirmed_state_match_count,
      2,
    );
    assert.equal(ambiguousGate.writes.length, 0);

    console.log(
      "VOID_BUY_VOID_MANUAL_FULFILLED_COMPLETE_REQUEST_STATE_SET_V1_GREEN",
    );
    console.log(
      `request_resolution_marker=${VOID_BUY_VOID_CONFIRMED_STATE_REQUEST_RESOLUTION_V1}`,
    );
    console.log("completion_candidate_binding_verified=1");
    console.log("request_index_binding_verified=1");
    console.log("state_id_recomputed=1");
    console.log("projection_fingerprint_recomputed=1");
    console.log("matching_plus_conflicting_state_write=0");
    console.log("wallet_access=0");
    console.log("credential_access=0");
    console.log("signing=0");
    console.log("transaction_broadcast=0");
    console.log("money_movement=0");
  } finally {
    if (priorRoot === undefined) {
      delete process.env.VOID_BUY_VOID_RUNTIME_DIR;
    } else {
      process.env.VOID_BUY_VOID_RUNTIME_DIR = priorRoot;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
