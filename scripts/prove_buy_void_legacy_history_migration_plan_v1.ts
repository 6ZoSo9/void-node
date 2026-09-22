#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_VOID_HISTORY_CARRIER_ACTIVE_SEGMENT_ID_V1,
} from "../src/economic/buy_void_history_carrier_v1.js";
import {
  VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PLAN_AUTHORITY_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PLAN_V1,
  planBuyVoidLegacyHistoryMigrationFromRootV1,
} from "../src/economic/buy_void_legacy_history_migration_plan_v1.js";
import {
  projectBuyVoidPaymentHistoryV1,
} from "../src/economic/buy_void_payment_history_projection_v1.js";
import {
  claimBuyVoidFulfillmentJournalV1,
} from "../src/economic/buy_void_fulfillment_journal_v1.js";
import {
  reserveBuyVoidInventoryV1,
} from "../src/economic/buy_void_inventory_reservation_journal_v1.js";
import {
  prepareBuyVoidExecutionTransactionV1,
  recordBuyVoidExecutionBroadcastV1,
  recordBuyVoidExecutionConfirmedV1,
  reserveBuyVoidExecutionAttemptV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";
import {
  confirmBuyVoidFulfillmentV1,
} from "../src/economic/buy_void_fulfillment_confirmation_v1.js";
import {
  planBuyVoidConfirmedCloseoutV1,
  writeBuyVoidInventoryConsumptionV1,
} from "../src/economic/buy_void_confirmed_closeout_v1.js";
import {
  buildBuyVoidVerifiedPaymentEventV2,
  type BuyVoidTransactionReceiptV2,
} from "../src/economic/buy_void_verified_payment_v2.js";
import type {
  BuyVoidAutoFulfillmentPolicyV1,
  BuyVoidRequestV1,
} from "../src/economic/buy_void_auto_fulfillment_v1.js";

const POOL = "buy-void-presale-v1";
const DELIVERY =
  "0x1111111111111111111111111111111111111111";
const RECEIVE =
  "0x3333333333333333333333333333333333333333";
const USDC =
  "0x4444444444444444444444444444444444444444";
const WALLET =
  "0x8888888888888888888888888888888888888888";
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function sha256(value: Buffer | string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new Error("non-safe-number");
    }
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(record)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key) +
            ":" +
            canonicalJson(record[key]),
        )
        .join(",") +
      "}"
    );
  }
  throw new Error("non-canonical-value");
}

function topic(address: string): string {
  return "0x" + "0".repeat(24) + address.slice(2);
}

function privateDirectory(directory: string): void {
  fs.mkdirSync(directory, {
    recursive: true,
    mode: 0o700,
  });
  fs.chmodSync(directory, 0o700);
}

function privateFile(file: string, bytes: string): void {
  privateDirectory(path.dirname(file));
  fs.writeFileSync(file, bytes, { mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

const tmp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-legacy-history-plan-v1-"),
);
fs.chmodSync(tmp, 0o700);

try {
  const rootDir = path.join(tmp, "runtime");
  const requestDir = path.join(tmp, "requests");
  privateDirectory(rootDir);
  privateDirectory(requestDir);

  const txHash = "0x" + "6".repeat(64);
  const request: BuyVoidRequestV1 = {
    request_id: "buyvoid-legacy-history-plan-proof",
    source_chain: "base",
    tx_hash: txHash,
    delivery_address: DELIVERY,
    receive_address: RECEIVE,
    usdc_amount: "0.375",
    quoted_void: "0.75",
  };
  const receipt: BuyVoidTransactionReceiptV2 = {
    status: "0x1",
    transactionHash: txHash,
    blockNumber: "0x64",
    logs: [
      {
        address: USDC,
        topics: [
          TRANSFER_TOPIC,
          topic(DELIVERY),
          topic(RECEIVE),
        ],
        data: "0x" + 375_000n.toString(16),
        logIndex: "0x7",
        transactionHash: txHash,
        blockNumber: "0x64",
        removed: false,
      },
    ],
  };
  const verified =
    buildBuyVoidVerifiedPaymentEventV2({
      request,
      receipt,
      policy: {
        allowed_chains: ["base"],
        usdc_contract_by_chain: { base: USDC },
        receive_address_by_chain: { base: RECEIVE },
        current_block_number_by_chain: { base: 105 },
      },
    });
  if ("reason" in verified) {
    throw new Error(verified.reason);
  }

  const fulfillmentPolicy:
    BuyVoidAutoFulfillmentPolicyV1 = {
      automatic_fulfillment_enabled: true,
      allowed_chains: ["base"],
      min_confirmations_by_chain: { base: 3 },
      usdc_contract_by_chain: { base: USDC },
      receive_address_by_chain: { base: RECEIVE },
      rate_void_units_numerator: "2",
      rate_void_units_denominator: "1",
      pool_remaining_void_units: "1000000",
      exact_payment_required: true,
    };
  const claimed =
    claimBuyVoidFulfillmentJournalV1({
      root_dir: rootDir,
      request,
      verified_payment_event: verified.event,
      policy: fulfillmentPolicy,
      now_ms: 1_770_000_000_000,
    });
  if ("reason" in claimed) {
    throw new Error(claimed.reason);
  }
  const intent = claimed.intent;

  const reserved =
    reserveBuyVoidInventoryV1({
      root_dir: rootDir,
      intent,
      policy: {
        inventory_reservation_enabled: true,
        pool_id: POOL,
        inventory_policy_version: "presale-v1",
        pool_capacity_void_units: "1000000",
        max_reservation_void_units: "1000000",
      },
      apply: true,
      now_ms: 1_770_000_000_100,
    });
  if (reserved.ok === false) {
    throw new Error(reserved.reason);
  }

  const executionPolicy = {
    attempt_journal_enabled: true,
    max_attempts_per_payment: 1,
    chain_id: 2050,
    fulfillment_wallet_allowlist: [WALLET],
  };
  const attempt =
    reserveBuyVoidExecutionAttemptV1({
      root_dir: rootDir,
      intent,
      policy: executionPolicy,
      now_ms: 1_770_000_000_200,
    });
  if ("reason" in attempt) {
    throw new Error(attempt.reason);
  }

  const deliveryTx = "0x" + "a".repeat(64);
  const deliveryBlockHash = "0x" + "b".repeat(64);
  const prepared =
    prepareBuyVoidExecutionTransactionV1({
      root_dir: rootDir,
      attempt_id:
        attempt.attempt.reservation.attempt_id,
      intent,
      policy: executionPolicy,
      transaction: {
        chain_id: 2050,
        transaction_hash: deliveryTx,
        from_address: WALLET,
        to_address: DELIVERY,
        amount_units: "750000",
      },
      now_ms: 1_770_000_000_300,
    });
  if ("reason" in prepared) {
    throw new Error(prepared.reason);
  }

  const broadcast =
    recordBuyVoidExecutionBroadcastV1({
      root_dir: rootDir,
      attempt_id:
        attempt.attempt.reservation.attempt_id,
      transaction_hash: deliveryTx,
      provider_submission_id:
        "legacy-history-plan-proof-submit",
      now_ms: 1_770_000_000_400,
    });
  if ("reason" in broadcast) {
    throw new Error(broadcast.reason);
  }

  const confirmation =
    confirmBuyVoidFulfillmentV1({
      intent,
      observation: {
        chain_id: 2050,
        transaction_hash: deliveryTx,
        transaction_status: 1,
        block_number: 500,
        block_hash: deliveryBlockHash,
        current_block_number: 505,
        from_address: WALLET,
        to_address: DELIVERY,
        amount_units: "750000",
      },
      policy: {
        chain_id: 2050,
        min_confirmations: 3,
        fulfillment_wallet_allowlist: [WALLET],
      },
    });
  if ("reason" in confirmation) {
    throw new Error(confirmation.reason);
  }

  const recorded =
    recordBuyVoidExecutionConfirmedV1({
      root_dir: rootDir,
      attempt_id:
        attempt.attempt.reservation.attempt_id,
      confirmed_record: confirmation.record,
      delivery_block_hash: deliveryBlockHash,
      now_ms: 1_770_000_000_500,
    });
  if ("reason" in recorded) {
    throw new Error(recorded.reason);
  }

  const baseCloseout =
    planBuyVoidConfirmedCloseoutV1({
      policy: {
        enabled: true,
        pool_id: POOL,
        request_dir: requestDir,
      },
      snapshot: {
        attempt: recorded.attempt as any,
        inventory_reservation:
          reserved.reservation as any,
        request: request as any,
        operator_events: [],
        effective_status: "payment_verified",
        existing_fulfilled_event: null,
      },
      now_ms: 1_770_000_000_600,
    });
  if (baseCloseout.ok === false) {
    throw new Error(baseCloseout.reason);
  }

  const consumption =
    writeBuyVoidInventoryConsumptionV1({
      root_dir: rootDir,
      record:
        baseCloseout.plan.inventory_consumption,
    });
  if (consumption.ok === false) {
    throw new Error(consumption.reason);
  }

  const projection =
    projectBuyVoidPaymentHistoryV1({
      root_dir: rootDir,
      pool_id: POOL,
      payment_key_sha256:
        intent.payment_key_sha256,
    });
  assert.equal(
    projection.lifecycle_state,
    "inventory_consumed",
  );
  assert.equal(projection.primary_kind, "reservation");
  assert.equal(projection.attempt_count, 1);
  assert.equal(
    projection.attempts[0]?.status,
    "confirmed",
  );
  assert.ok(projection.closeout);

  const plan =
    planBuyVoidLegacyHistoryMigrationFromRootV1({
      runtime_root: rootDir,
      pool_id: POOL,
    });
  const replay =
    planBuyVoidLegacyHistoryMigrationFromRootV1({
      runtime_root: rootDir,
      pool_id: POOL,
    });
  assert.deepEqual(replay, plan);

  const payload = Buffer.from(
    canonicalJson(projection.primary_record),
    "utf8",
  );
  const row = Buffer.concat([
    payload,
    Buffer.from("\n", "utf8"),
  ]);

  assert.equal(
    plan.marker,
    VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PLAN_V1,
  );
  assert.equal(plan.version, 1);
  assert.equal(
    plan.payment_key_sha256,
    intent.payment_key_sha256,
  );
  assert.equal(
    plan.primary_record_id,
    projection.primary_record_id,
  );
  assert.equal(
    plan.primary_record_journal_sha256,
    projection.primary_record_sha256,
  );
  assert.equal(
    plan.primary_record_canonical_sha256,
    sha256(payload),
  );
  assert.equal(
    plan.payment_history_fingerprint_sha256,
    projection.payment_history_fingerprint_sha256,
  );
  assert.equal(
    plan.canonical_jsonl_payload_bytes,
    payload.length,
  );
  assert.equal(
    plan.canonical_jsonl_row_bytes,
    row.length,
  );
  assert.equal(
    plan.canonical_jsonl_row_sha256,
    sha256(row),
  );
  assert.equal(
    plan.proposed_segment_generation,
    1,
  );
  assert.equal(
    plan.proposed_active_segment_id,
    VOID_BUY_VOID_HISTORY_CARRIER_ACTIVE_SEGMENT_ID_V1,
  );
  assert.equal(
    plan.proposed_active_segment_sha256,
    sha256(row),
  );
  assert.equal(
    plan.proposed_record_byte_offset,
    "0",
  );
  assert.equal(
    plan.proposed_record_byte_length,
    row.length,
  );
  assert.equal(
    plan.proposed_record_sha256,
    sha256(row),
  );
  assert.equal(
    plan.segmented_durable_root_sha256,
    null,
  );
  assert.equal(plan.carrier_root_sha256, null);
  assert.match(
    plan.migration_plan_sha256,
    /^[0-9a-f]{64}$/u,
  );
  assert.deepEqual(
    plan.authority,
    VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PLAN_AUTHORITY_V1,
  );

  const secondPayment = path.join(
    rootDir,
    "buy-void-auto-fulfillment-v1",
    "payments",
    "f".repeat(64) + ".json",
  );
  privateFile(secondPayment, "{}\n");
  assert.throws(
    () =>
      planBuyVoidLegacyHistoryMigrationFromRootV1({
        runtime_root: rootDir,
        pool_id: POOL,
      }),
    /CENSUS_SHAPE_MISMATCH/u,
  );

  const source = fs.readFileSync(
    path.join(
      process.cwd(),
      "src/economic/buy_void_legacy_history_migration_plan_v1.ts",
    ),
    "utf8",
  );
  for (const forbidden of [
    "buildSegmentedJsonlV1FromFile(",
    "reconstructSegmentedJsonlV1ToFile(",
    "publishSegmentedJsonlDurableRootV1(",
    "writeFileSync(",
    "appendFileSync(",
    "renameSync(",
    "linkSync(",
    "unlinkSync(",
    "rmSync(",
    "systemctl",
    "fetch(",
    "curl",
  ]) {
    assert.equal(
      source.includes(forbidden),
      false,
      "phase-A mutation primitive forbidden: " +
        forbidden,
    );
  }

  console.log(
    "VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PLAN_V1_PROOF_GREEN",
  );
  console.log("single_production_reservation_bound=true");
  console.log("inventory_consumed_lifecycle_bound=true");
  console.log("canonical_jsonl_row_bound=true");
  console.log("replay_deterministic=true");
  console.log("segmented_store_write=false");
  console.log("segmented_durable_root_claimed=false");
  console.log("carrier_root_claimed=false");
  console.log("service_action=false");
  console.log("credential_content_read=false");
  console.log("wallet_or_signer_access=false");
  console.log("rpc_call=false");
  console.log("transaction_broadcast=false");
  console.log("funds_movement=false");
} finally {
  fs.rmSync(tmp, {
    recursive: true,
    force: true,
  });
}
