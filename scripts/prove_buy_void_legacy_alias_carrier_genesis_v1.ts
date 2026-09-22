#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  planBuyVoidLegacyAliasCarrierGenesisFromRootV1,
  VOID_BUY_VOID_LEGACY_ALIAS_CARRIER_GENESIS_AUTHORITY_V1,
  VOID_BUY_VOID_LEGACY_ALIAS_CARRIER_GENESIS_V1,
} from "../src/economic/buy_void_legacy_alias_carrier_genesis_v1.js";
import {
  applyBuyVoidLegacyHistoryMigrationFromRootV1,
} from "../src/economic/buy_void_legacy_history_migration_apply_v1.js";
import {
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
const LEGACY_POOL =
  VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PREDECESSOR_POOL_ID_V1;
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
  ) return JSON.stringify(value);
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

function poolKey(poolId: string): string {
  return sha256("void-buy-inventory-pool-v1\n" + poolId);
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

function privateFile(
  file: string,
  bytes: Buffer | string,
): void {
  privateDirectory(path.dirname(file));
  fs.writeFileSync(file, bytes, { mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

function expectFailure(
  run: () => unknown,
  marker: RegExp,
): void {
  let caught: unknown;
  try {
    run();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught instanceof Error);
  assert.match((caught as Error).message, marker);
}

const tmp = fs.mkdtempSync(
  path.join(
    os.tmpdir(),
    "void-buy-legacy-alias-carrier-genesis-v1-",
  ),
);
fs.chmodSync(tmp, 0o700);

try {
  const rootDir = path.join(tmp, "runtime");
  const requestDir = path.join(tmp, "requests");
  privateDirectory(rootDir);
  privateDirectory(requestDir);

  const txHash = "0x" + "6".repeat(64);
  const request: BuyVoidRequestV1 = {
    request_id: "buyvoid-alias-carrier-genesis-proof",
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
        "alias-carrier-genesis-proof-submit",
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

  const currentProjection =
    projectBuyVoidPaymentHistoryV1({
      root_dir: rootDir,
      pool_id: POOL,
      payment_key_sha256:
        intent.payment_key_sha256,
    });
  assert.equal(
    currentProjection.lifecycle_state,
    "confirmed_pending_closeout",
  );
  assert.equal(currentProjection.closeout, null);

  const legacyReservationId =
    reservationIdFor(
      LEGACY_POOL,
      intent.payment_key_sha256,
      intent.claim.instruction_id,
    );
  const legacyReservation:
    Record<string, any> = {
    ...(currentProjection.primary_record as
      Record<string, any>),
    reservation_id: legacyReservationId,
    pool_id: LEGACY_POOL,
    inventory_policy_version: "fixed-cap-v1",
  };
  privateFile(
    path.join(
      rootDir,
      "buy-void-inventory-reservation-v1",
      "pools",
      poolKey(LEGACY_POOL),
      "reservations",
      legacyReservationId + ".json",
    ),
    JSON.stringify(legacyReservation) + "\n",
  );

  const legacyConsumptionBinding = {
    marker:
      baseCloseout.plan.inventory_consumption.marker,
    pool_id: LEGACY_POOL,
    reservation_id: legacyReservationId,
    execution_attempt_id:
      baseCloseout.plan.inventory_consumption
        .execution_attempt_id,
    canonical_payment_identity:
      baseCloseout.plan.inventory_consumption
        .canonical_payment_identity,
    request_id:
      baseCloseout.plan.inventory_consumption.request_id,
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
  const legacyConsumptionFingerprint =
    sha256(canonicalJson(legacyConsumptionBinding));
  const legacyConsumptionId =
    sha256(
      canonicalJson({
        schema:
          "void_buy_void_inventory_consumption_v1",
        ...legacyConsumptionBinding,
      }),
    );
  const legacyConsumption = {
    ...baseCloseout.plan.inventory_consumption,
    pool_id: LEGACY_POOL,
    reservation_id: legacyReservationId,
    consumption_id: legacyConsumptionId,
    consumption_fingerprint_sha256:
      legacyConsumptionFingerprint,
  };
  const legacyConsumptionFile =
    path.join(
      rootDir,
      "inventory-consumption-v1",
      "records",
      legacyReservationId + ".json",
    );
  privateFile(
    legacyConsumptionFile,
    JSON.stringify(legacyConsumption) + "\n",
  );

  const phaseA =
    planBuyVoidLegacyHistoryMigrationFromRootV1({
      runtime_root: rootDir,
      pool_id: POOL,
    });
  assert.equal(
    phaseA.lineage_mode,
    "legacy_pool_consumed_current_pool_alias",
  );
  assert.equal(
    phaseA.lifecycle_state,
    "legacy_pool_consumed_alias",
  );

  const applied =
    applyBuyVoidLegacyHistoryMigrationFromRootV1({
      runtime_root: rootDir,
      pool_id: POOL,
      expected_migration_plan_sha256:
        phaseA.migration_plan_sha256,
    });
  assert.equal(applied.status, "created");

  const plan =
    planBuyVoidLegacyAliasCarrierGenesisFromRootV1({
      runtime_root: rootDir,
      pool_id: POOL,
      expected_migration_plan_sha256:
        phaseA.migration_plan_sha256,
      expected_migration_evidence_id:
        applied.evidence.evidence_id,
      expected_segmented_durable_root_sha256:
        applied.evidence.durable_root_sha256,
      expected_current_pointer_id:
        applied.pointer.pointer_id,
      expected_record_sha256:
        phaseA.canonical_jsonl_row_sha256,
    });
  const replay =
    planBuyVoidLegacyAliasCarrierGenesisFromRootV1({
      runtime_root: rootDir,
      pool_id: POOL,
      expected_migration_plan_sha256:
        phaseA.migration_plan_sha256,
      expected_migration_evidence_id:
        applied.evidence.evidence_id,
      expected_segmented_durable_root_sha256:
        applied.evidence.durable_root_sha256,
      expected_current_pointer_id:
        applied.pointer.pointer_id,
      expected_record_sha256:
        phaseA.canonical_jsonl_row_sha256,
    });
  assert.deepEqual(replay, plan);

  assert.equal(
    plan.marker,
    VOID_BUY_VOID_LEGACY_ALIAS_CARRIER_GENESIS_V1,
  );
  assert.equal(plan.version, 1);
  assert.equal(
    plan.effective_lifecycle_state,
    "inventory_consumed",
  );
  assert.notEqual(
    plan.effective_payment_history_fingerprint_sha256,
    plan.current_projection_fingerprint_sha256,
  );
  assert.equal(
    plan.predecessor_projection_fingerprint_sha256,
    phaseA.legacy_payment_history_fingerprint_sha256,
  );
  assert.equal(
    plan.carrier_root.payment_history_fingerprint_sha256,
    plan.effective_payment_history_fingerprint_sha256,
  );
  assert.equal(
    plan.carrier_root.active_segmented_durable_root_sha256,
    applied.evidence.durable_root_sha256,
  );
  assert.equal(
    plan.carrier_root.active_segmented_store_generation,
    1,
  );
  assert.equal(
    plan.carrier_root.committed_void_units,
    "750000",
  );
  assert.equal(
    plan.carrier_root.reservation_count,
    "1",
  );
  assert.equal(
    plan.carrier_root.obligation_count,
    "0",
  );
  assert.equal(
    plan.carrier_root.previous_carrier_root_sha256,
    null,
  );
  assert.equal(
    plan.carrier_root.carrier_generation,
    1,
  );
  assert.equal(
    plan.payment_index_root_sha256,
    plan.carrier_root.payment_index_root_sha256,
  );
  assert.equal(plan.new_page_count, 1);
  assert.equal(plan.new_pages.length, 1);
  assert.match(plan.page_set_sha256, /^[0-9a-f]{64}$/u);
  assert.match(
    plan.attestation_plan_sha256,
    /^[0-9a-f]{64}$/u,
  );
  assert.deepEqual(
    plan.authority,
    VOID_BUY_VOID_LEGACY_ALIAS_CARRIER_GENESIS_AUTHORITY_V1,
  );

  const evidenceFile =
    path.join(
      rootDir,
      "buy-void-payment-history-segmented-v1",
      "generations",
      phaseA.migration_plan_sha256,
      "migration-evidence.v1.json",
    );
  const originalEvidence =
    fs.readFileSync(evidenceFile);
  const tamperedEvidence =
    JSON.parse(originalEvidence.toString("utf8"));
  tamperedEvidence.legacy_pool_alias_fingerprint_sha256 =
    "0".repeat(64);
  privateFile(
    evidenceFile,
    JSON.stringify(tamperedEvidence) + "\n",
  );
  expectFailure(
    () =>
      planBuyVoidLegacyAliasCarrierGenesisFromRootV1({
        runtime_root: rootDir,
        pool_id: POOL,
        expected_migration_plan_sha256:
          phaseA.migration_plan_sha256,
        expected_migration_evidence_id:
          applied.evidence.evidence_id,
        expected_segmented_durable_root_sha256:
          applied.evidence.durable_root_sha256,
        expected_current_pointer_id:
          applied.pointer.pointer_id,
        expected_record_sha256:
          phaseA.canonical_jsonl_row_sha256,
      }),
    /EVIDENCE_BINDING_INVALID/u,
  );
  privateFile(evidenceFile, originalEvidence);

  const originalLegacyConsumption =
    fs.readFileSync(legacyConsumptionFile);
  const tamperedConsumption =
    JSON.parse(
      originalLegacyConsumption.toString("utf8"),
    );
  tamperedConsumption.consumed_void_units = "750001";
  privateFile(
    legacyConsumptionFile,
    JSON.stringify(tamperedConsumption) + "\n",
  );
  expectFailure(
    () =>
      planBuyVoidLegacyAliasCarrierGenesisFromRootV1({
        runtime_root: rootDir,
        pool_id: POOL,
        expected_migration_plan_sha256:
          phaseA.migration_plan_sha256,
        expected_migration_evidence_id:
          applied.evidence.evidence_id,
        expected_segmented_durable_root_sha256:
          applied.evidence.durable_root_sha256,
        expected_current_pointer_id:
          applied.pointer.pointer_id,
        expected_record_sha256:
          phaseA.canonical_jsonl_row_sha256,
      }),
    /(PHASE_A_REVALIDATION_MISMATCH|LEGACY_POOL_ALIAS_PROJECTION_INVALID)/u,
  );
  privateFile(
    legacyConsumptionFile,
    originalLegacyConsumption,
  );

  const source =
    fs.readFileSync(
      path.join(
        process.cwd(),
        "src/economic/buy_void_legacy_alias_carrier_genesis_v1.ts",
      ),
      "utf8",
    );
  for (const forbidden of [
    "writeFileSync(",
    "appendFileSync(",
    "renameSync(",
    "linkSync(",
    "unlinkSync(",
    "rmSync(",
    "mkdirSync(",
    "systemctl",
    "fetch(",
    "curl",
  ]) {
    assert.equal(
      source.includes(forbidden),
      false,
      "read-only genesis source contains forbidden primitive: " +
        forbidden,
    );
  }

  console.log(
    "VOID_BUY_VOID_LEGACY_ALIAS_CARRIER_GENESIS_V1_PROOF_GREEN",
  );
  console.log(
    "phase_b_durable_root_verified_at_use=true",
  );
  console.log(
    "effective_alias_consumed_fingerprint_bound=true",
  );
  console.log(
    "global_payment_history_projection_mutation=false",
  );
  console.log("genesis_carrier_generation=1");
  console.log("genesis_reservation_count=1");
  console.log("page_set_planned_not_published=true");
  console.log("carrier_root_planned_not_published=true");
  console.log("filesystem_write=false");
  console.log("transaction_broadcast=false");
  console.log("funds_movement=false");
} finally {
  fs.rmSync(tmp, {
    recursive: true,
    force: true,
  });
}
