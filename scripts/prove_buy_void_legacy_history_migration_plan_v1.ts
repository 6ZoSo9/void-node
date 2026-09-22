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
  VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PREDECESSOR_POOL_ID_V1,
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

function poolKey(poolId: string): string {
  return sha256(
    "void-buy-inventory-pool-v1\n" + poolId,
  );
}

function reservationIdFor(
  poolId: string,
  paymentKey: string,
  instructionId: string,
): string {
  return sha256(
    [
      "void-buy-inventory-reservation-v1",
      poolKey(poolId),
      paymentKey,
      instructionId,
    ].join("\n"),
  );
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
    plan.primary_record_fingerprint_sha256,
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
  assert.equal(
    plan.lineage_mode,
    "direct_current_pool_consumption",
  );
  assert.equal(plan.legacy_pool_id, null);
  assert.equal(
    plan.legacy_pool_alias_fingerprint_sha256,
    null,
  );

  const predecessorPool =
    VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PREDECESSOR_POOL_ID_V1;
  const predecessorReservationId =
    reservationIdFor(
      predecessorPool,
      intent.payment_key_sha256,
      intent.claim.instruction_id,
    );
  const predecessorReservation = {
    ...(projection.primary_record as Record<string, any>),
    reservation_id: predecessorReservationId,
    pool_id: predecessorPool,
    inventory_policy_version: "fixed-cap-v1",
  };
  const predecessorReservationFile = path.join(
    rootDir,
    "buy-void-inventory-reservation-v1",
    "pools",
    poolKey(predecessorPool),
    "reservations",
    predecessorReservationId + ".json",
  );
  privateFile(
    predecessorReservationFile,
    JSON.stringify(predecessorReservation) + "\n",
  );

  const predecessorConsumptionBinding = {
    marker:
      baseCloseout.plan.inventory_consumption.marker,
    pool_id: predecessorPool,
    reservation_id: predecessorReservationId,
    execution_attempt_id:
      baseCloseout.plan.inventory_consumption
        .execution_attempt_id,
    canonical_payment_identity:
      baseCloseout.plan.inventory_consumption
        .canonical_payment_identity,
    request_id:
      baseCloseout.plan.inventory_consumption
        .request_id,
    instruction_id:
      baseCloseout.plan.inventory_consumption
        .instruction_id,
    delivery_address:
      baseCloseout.plan.inventory_consumption
        .delivery_address,
    void_delivery_tx_hash:
      baseCloseout.plan.inventory_consumption
        .void_delivery_tx_hash,
    consumed_void_units:
      baseCloseout.plan.inventory_consumption
        .consumed_void_units,
  };
  const predecessorConsumptionFingerprint =
    sha256(
      canonicalJson(
        predecessorConsumptionBinding,
      ),
    );
  const predecessorConsumptionId =
    sha256(
      canonicalJson({
        schema:
          "void_buy_void_inventory_consumption_v1",
        ...predecessorConsumptionBinding,
      }),
    );
  const predecessorConsumption = {
    ...baseCloseout.plan.inventory_consumption,
    pool_id: predecessorPool,
    reservation_id: predecessorReservationId,
    consumption_id: predecessorConsumptionId,
    consumption_fingerprint_sha256:
      predecessorConsumptionFingerprint,
  };

  const currentConsumptionFile = path.join(
    rootDir,
    "inventory-consumption-v1",
    "records",
    projection.primary_record_id + ".json",
  );
  fs.rmSync(currentConsumptionFile);
  const predecessorConsumptionFile = path.join(
    rootDir,
    "inventory-consumption-v1",
    "records",
    predecessorReservationId + ".json",
  );
  privateFile(
    predecessorConsumptionFile,
    JSON.stringify(predecessorConsumption) + "\n",
  );

  const currentAliasProjection =
    projectBuyVoidPaymentHistoryV1({
      root_dir: rootDir,
      pool_id: POOL,
      payment_key_sha256:
        intent.payment_key_sha256,
    });
  assert.equal(
    currentAliasProjection.lifecycle_state,
    "confirmed_pending_closeout",
  );
  assert.equal(
    currentAliasProjection.closeout,
    null,
  );

  const predecessorProjection =
    projectBuyVoidPaymentHistoryV1({
      root_dir: rootDir,
      pool_id: predecessorPool,
      payment_key_sha256:
        intent.payment_key_sha256,
    });
  assert.equal(
    predecessorProjection.lifecycle_state,
    "inventory_consumed",
  );
  assert.ok(predecessorProjection.closeout);

  const aliasPlan =
    planBuyVoidLegacyHistoryMigrationFromRootV1({
      runtime_root: rootDir,
      pool_id: POOL,
    });
  const aliasReplay =
    planBuyVoidLegacyHistoryMigrationFromRootV1({
      runtime_root: rootDir,
      pool_id: POOL,
    });
  assert.deepEqual(aliasReplay, aliasPlan);
  assert.equal(
    aliasPlan.lineage_mode,
    "legacy_pool_consumed_current_pool_alias",
  );
  assert.equal(
    aliasPlan.lifecycle_state,
    "legacy_pool_consumed_alias",
  );
  assert.equal(
    aliasPlan.legacy_pool_id,
    predecessorPool,
  );
  assert.equal(
    aliasPlan.primary_record_id,
    currentAliasProjection.primary_record_id,
  );
  assert.equal(
    aliasPlan.legacy_primary_record_id,
    predecessorProjection.primary_record_id,
  );
  assert.notEqual(
    aliasPlan.primary_record_id,
    aliasPlan.legacy_primary_record_id,
  );
  assert.equal(
    aliasPlan.payment_history_fingerprint_sha256,
    currentAliasProjection
      .payment_history_fingerprint_sha256,
  );
  assert.equal(
    aliasPlan.legacy_payment_history_fingerprint_sha256,
    predecessorProjection
      .payment_history_fingerprint_sha256,
  );
  assert.equal(
    aliasPlan.inventory_consumption_id,
    predecessorProjection.closeout
      ?.consumption_id,
  );
  assert.match(
    String(
      aliasPlan.legacy_pool_alias_fingerprint_sha256,
    ),
    /^[0-9a-f]{64}$/u,
  );

  const aliasPayload = Buffer.from(
    canonicalJson(
      currentAliasProjection.primary_record,
    ),
    "utf8",
  );
  const aliasRow = Buffer.concat([
    aliasPayload,
    Buffer.from("\n", "utf8"),
  ]);
  assert.equal(
    aliasPlan.primary_record_fingerprint_sha256,
    sha256(aliasPayload),
  );
  assert.equal(
    aliasPlan.canonical_jsonl_row_sha256,
    sha256(aliasRow),
  );

  const predecessorReservationMutated = {
    ...predecessorReservation,
    reserved_at_ms:
      Number(predecessorReservation.reserved_at_ms) + 1,
  };
  privateFile(
    predecessorReservationFile,
    JSON.stringify(
      predecessorReservationMutated,
    ) + "\n",
  );
  assert.throws(
    () =>
      planBuyVoidLegacyHistoryMigrationFromRootV1({
        runtime_root: rootDir,
        pool_id: POOL,
      }),
    /LEGACY_POOL_ALIAS_PRIMARY_MISMATCH/u,
  );
  privateFile(
    predecessorReservationFile,
    JSON.stringify(predecessorReservation) + "\n",
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

  const observerSource = fs.readFileSync(
    path.join(
      process.cwd(),
      "scripts/observe_buy_void_legacy_history_migration_plan_precision_v1.ts",
    ),
    "utf8",
  );
  for (const required of [
    'const REPO_ROOT = "/home/zoso/dev/void-node";',
    '"/usr/bin/git"',
    '"--git-dir=" + GIT_DIR',
    '"--work-tree=" + REPO_ROOT',
    '"core.fsmonitor=false"',
    'GIT_CONFIG_NOSYSTEM: "1"',
    'GIT_CONFIG_GLOBAL: "/dev/null"',
    "process.argv.length !== 2",
    "const firstPlan =",
    "const secondPlan =",
    "PLAN_UNSTABLE_BETWEEN_PASSES",
    "const after = gitSnapshot()",
    "REPOSITORY_CHANGED_DURING_OBSERVATION",
    "filesystem_content_read: true",
    "filesystem_mutation: false",
    "segmented_store_write: false",
    "service_action: false",
    "credential_content_read: false",
    "wallet_or_signer_access: false",
    "rpc_call: false",
    "transaction_broadcast: false",
    "funds_movement: false",
  ]) {
    assert.equal(
      observerSource.includes(required),
      true,
      "missing Precision observer contract: " + required,
    );
  }
  for (const forbidden of [
    "fetch(",
    "writeFile",
    "appendFile",
    "renameSync",
    "unlinkSync",
    "rmSync",
    "systemctl",
    "sudo",
    "curl",
    "wget",
  ]) {
    assert.equal(
      observerSource.includes(forbidden),
      false,
      "Precision observer mutation/network primitive forbidden: " +
        forbidden,
    );
  }

  console.log(
    "VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PLAN_V1_PROOF_GREEN",
  );
  console.log("single_production_reservation_bound=true");
  console.log("inventory_consumed_lifecycle_bound=true");
  console.log("legacy_pool_consumed_alias_bound=true");
  console.log("legacy_pool_alias_primary_equivalence_required=true");
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
