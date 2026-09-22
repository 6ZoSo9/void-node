#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_SEGMENTED_JSONL_DURABLE_ROOT_V1,
  type SegmentedJsonlDurableRootV1,
} from "../src/storage/segmented_jsonl_durable_root_v1.js";
import {
  createEmptyBuyVoidHistoryIndexV1,
  lookupBuyVoidHistoryIndexV1,
  planBuyVoidHistoryCarrierCommitFromVerifiedBytesV1,
  type BuyVoidHistoryRecordLocatorV1,
} from "../src/economic/buy_void_history_carrier_v1.js";
import {
  projectBuyVoidPaymentHistoryV1,
} from "../src/economic/buy_void_payment_history_projection_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_CARRIER_ROOT_ENV_V1,
  VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_MAX_SAGA_DIRECTORY_ENTRIES_V1,
  VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_MAX_SAGA_EVENTS_V1,
  VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_PROJECTION_V1,
  projectBuyVoidPaymentHistoryTerminalV1,
} from "../src/economic/buy_void_payment_history_terminal_projection_v1.js";
import {
  persistTerminalCloseoutPlanV1,
} from "../src/economic/buy_void_saga_terminal_closeout_artifacts_v1.js";
import {
  TERMINAL_CLOSEOUT_SAGA_ROOT,
  VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_V1,
  terminalCanonical,
  terminalFingerprint,
  type BuyVoidSagaTerminalCloseoutPlanV1,
} from "../src/economic/buy_void_saga_terminal_closeout_model_v1.js";
import {
  claimBuyVoidFulfillmentJournalV1,
} from "../src/economic/buy_void_fulfillment_journal_v1.js";
import {
  buildBuyVoidVerifiedPaymentEventV2,
  type BuyVoidTransactionReceiptV2,
} from "../src/economic/buy_void_verified_payment_v2.js";
import type {
  BuyVoidAutoFulfillmentPolicyV1,
  BuyVoidRequestV1,
} from "../src/economic/buy_void_auto_fulfillment_v1.js";
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

function durableRoot(): SegmentedJsonlDurableRootV1 {
  const core = {
    v: 1 as const,
    format:
      VOID_SEGMENTED_JSONL_DURABLE_ROOT_V1 as
        typeof VOID_SEGMENTED_JSONL_DURABLE_ROOT_V1,
    store_generation: 1,
    checkpoint_sha256: sha256("terminal-checkpoint"),
    snapshot_sha256: sha256("terminal-snapshot"),
    manifest_sha256: sha256("terminal-manifest"),
    materialized_authority_sha256:
      sha256("terminal-materialized-authority"),
    materialized_sha256: sha256("terminal-materialized"),
    append_only_witness_sha256: null,
    previous_root_sha256: null,
    total_bytes: 4096,
    total_records: 1,
  };
  return {
    ...core,
    root_sha256: sha256(JSON.stringify(core)),
  };
}

function topic(address: string): string {
  return "0x" + "0".repeat(24) + address.slice(2);
}

function writePrivateJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), {
    recursive: true,
    mode: 0o700,
  });
  fs.chmodSync(path.dirname(file), 0o700);
  fs.writeFileSync(
    file,
    JSON.stringify(value, null, 2) + "\n",
    { mode: 0o600 },
  );
}

function snapshotTree(root: string): string[] {
  const out: string[] = [];
  function walk(current: string): void {
    if (!fs.existsSync(current)) return;
    const relative = path.relative(root, current) || ".";
    const metadata = fs.lstatSync(current);
    if (metadata.isDirectory()) {
      out.push("D:" + relative);
      for (const entry of fs.readdirSync(current).sort()) {
        walk(path.join(current, entry));
      }
      return;
    }
    const bytes = fs.readFileSync(current);
    out.push(
      "F:" +
        relative +
        ":" +
        bytes.length +
        ":" +
        sha256(bytes),
    );
  }
  walk(root);
  return out;
}

function expectFailure(
  marker: string,
  run: () => Promise<unknown>,
): Promise<void> {
  return assert.rejects(
    run,
    (error: unknown) =>
      error instanceof Error &&
      error.message.includes(marker),
  ) as Promise<void>;
}

const tmp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-terminal-history-v1-"),
);
fs.chmodSync(tmp, 0o700);
const priorRuntimeDir =
  process.env.VOID_BUY_VOID_RUNTIME_DIR;
const priorRequestDir =
  process.env.VOID_BUY_REQUEST_DIR;
const priorCarrierRootPin =
  process.env[
    VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_CARRIER_ROOT_ENV_V1
  ];

try {
  const rootDir = path.join(tmp, "runtime");
  const requestDir = path.join(tmp, "requests");
  fs.mkdirSync(rootDir, { recursive: true, mode: 0o700 });
  fs.mkdirSync(requestDir, { recursive: true, mode: 0o700 });
  fs.chmodSync(rootDir, 0o700);
  fs.chmodSync(requestDir, 0o700);

  process.env.VOID_BUY_VOID_RUNTIME_DIR =
    rootDir;
  process.env.VOID_BUY_REQUEST_DIR =
    requestDir;

  const txHash = "0x" + "6".repeat(64);
  const request: BuyVoidRequestV1 = {
    request_id: "buyvoid-terminal-history-proof",
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
  if ("reason" in verified) throw new Error(verified.reason);

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
  if ("reason" in claimed) throw new Error(claimed.reason);
  const intent = claimed.intent;

  const inventoryPolicy = {
    inventory_reservation_enabled: true,
    pool_id: POOL,
    inventory_policy_version: "presale-v1",
    pool_capacity_void_units: "1000000",
    max_reservation_void_units: "1000000",
  };
  const reserved =
    reserveBuyVoidInventoryV1({
      root_dir: rootDir,
      intent,
      policy: inventoryPolicy,
      apply: true,
      now_ms: 1_770_000_000_100,
    });
  if (reserved.ok === false) throw new Error(reserved.reason);

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
  if ("reason" in attempt) throw new Error(attempt.reason);

  const deliveryTx = "0x" + "a".repeat(64);
  const deliveryBlockHash = "0x" + "b".repeat(64);
  const prepared =
    prepareBuyVoidExecutionTransactionV1({
      root_dir: rootDir,
      attempt_id: attempt.attempt.reservation.attempt_id,
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
  if ("reason" in prepared) throw new Error(prepared.reason);

  const broadcast =
    recordBuyVoidExecutionBroadcastV1({
      root_dir: rootDir,
      attempt_id: attempt.attempt.reservation.attempt_id,
      transaction_hash: deliveryTx,
      provider_submission_id: "terminal-history-proof-submit",
      now_ms: 1_770_000_000_400,
    });
  if ("reason" in broadcast) throw new Error(broadcast.reason);

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
      attempt_id: attempt.attempt.reservation.attempt_id,
      confirmed_record: confirmation.record,
      delivery_block_hash: deliveryBlockHash,
      now_ms: 1_770_000_000_500,
    });
  if ("reason" in recorded) throw new Error(recorded.reason);

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
      record: baseCloseout.plan.inventory_consumption,
    });
  if (consumption.ok === false) {
    throw new Error(consumption.reason);
  }

  const payment = projectBuyVoidPaymentHistoryV1({
    root_dir: rootDir,
    pool_id: POOL,
    payment_key_sha256: intent.payment_key_sha256,
  });
  assert.equal(payment.lifecycle_state, "inventory_consumed");
  assert.ok(payment.closeout);

  const empty = createEmptyBuyVoidHistoryIndexV1();
  const pages = new Map<string, Buffer>([
    [empty.root_sha256, Buffer.from(empty.page)],
  ]);
  const readPage = (digest: string): Buffer => {
    const value = pages.get(digest);
    if (!value) throw new Error("missing-page:" + digest);
    return Buffer.from(value);
  };
  const reservationBytes = Buffer.from(
    JSON.stringify(reserved.reservation) + "\n",
    "utf8",
  );
  const root = durableRoot();
  const locator: BuyVoidHistoryRecordLocatorV1 = {
    segmented_durable_root_sha256: root.root_sha256,
    segment_id: 0,
    segment_sha256: sha256("terminal-segment-0"),
    byte_offset: "0",
    byte_length: reservationBytes.length,
    record_sha256: sha256(reservationBytes),
  };
  const carrier =
    planBuyVoidHistoryCarrierCommitFromVerifiedBytesV1({
      previous_carrier_root: null,
      current_index_root_sha256: empty.root_sha256,
      segmented_durable_root: root,
      pool_id: POOL,
      payment_history_fingerprint_sha256:
        payment.payment_history_fingerprint_sha256,
      record: reserved.reservation,
      record_locator: locator,
      record_bytes: reservationBytes,
      read_page: readPage,
    });
  assert.equal(carrier.status, "planned");
  if (carrier.status !== "planned") {
    throw new Error("carrier-not-planned");
  }
  for (const page of carrier.new_pages) {
    pages.set(page.sha256, Buffer.from(page.bytes));
  }
  const carrierEntry = lookupBuyVoidHistoryIndexV1(
    carrier.index_root_sha256,
    intent.payment_key_sha256,
    readPage,
  );
  assert.equal(carrierEntry.found, true);
  assert.ok(carrierEntry.entry);
  assert.equal(
    carrierEntry.entry?.primary_record_fingerprint_sha256,
    sha256(terminalCanonical(payment.primary_record)),
  );
  process.env[
    VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_CARRIER_ROOT_ENV_V1
  ] = carrier.carrier_root.carrier_root_sha256;

  const saga: any = await import(
    new URL(
      "../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs",
      import.meta.url,
    ).href,
  );
  const binding = {
    request_id: payment.request_id,
    canonical_payment_identity:
      payment.canonical_payment_identity,
    request_key_sha256: payment.request_key_sha256,
    payment_key_sha256: payment.payment_key_sha256,
    delivery_address: payment.delivery_address,
    void_amount_units: payment.void_amount_units,
    chain_id: "2050",
    pool_id: POOL,
  };
  const sagaId = saga.computeSagaIdV1(binding);
  const confirmedStateId = sha256("confirmed-state-id");
  const confirmedStateFingerprint =
    sha256("confirmed-state-fingerprint");
  const serverPolicyFingerprint =
    sha256("terminal-server-policy");

  const terminalInventoryFingerprint = terminalFingerprint({
    schema: "void_buy_void_saga_terminal_inventory_consumption_v1",
    saga_id: sagaId,
    attempt_id: payment.closeout!.execution_attempt_id,
    reservation_id: payment.primary_record_id,
    transaction_hash: payment.closeout!.void_delivery_tx_hash,
    canonical_confirmed_state_id: confirmedStateId,
    canonical_confirmed_state_fingerprint:
      confirmedStateFingerprint,
    inventory_consumption_id:
      payment.closeout!.consumption_id,
    inventory_consumption_fingerprint_sha256:
      payment.closeout!.consumption_fingerprint_sha256,
  });
  const closeoutId = terminalFingerprint({
    schema: "void_buy_void_saga_terminal_closeout_id_v1",
    saga_id: sagaId,
    attempt_id: payment.closeout!.execution_attempt_id,
    reservation_id: payment.primary_record_id,
    transaction_hash: payment.closeout!.void_delivery_tx_hash,
    canonical_confirmed_state_id: confirmedStateId,
    canonical_confirmed_state_fingerprint:
      confirmedStateFingerprint,
    inventory_terminal_fingerprint_sha256:
      terminalInventoryFingerprint,
    server_policy_fingerprint_sha256:
      serverPolicyFingerprint,
  });
  const terminalInventory = {
    ...baseCloseout.plan.inventory_consumption,
    terminal_closeout_schema:
      "void_buy_void_saga_terminal_inventory_consumption_v1" as const,
    terminal_closeout_marker:
      VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_V1 as
        typeof VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_V1,
    terminal_closeout_version: 1 as const,
    saga_id: sagaId,
    closeout_id: closeoutId,
    canonical_confirmed_state_id: confirmedStateId,
    canonical_confirmed_state_fingerprint:
      confirmedStateFingerprint,
    canonical_confirmed_state_completion_final: true as const,
    terminal_closeout_fingerprint_sha256:
      terminalInventoryFingerprint,
  };
  const publicBase = {
    ...baseCloseout.plan.public_closeout_event,
    terminal_closeout_schema:
      "void_buy_void_saga_terminal_closeout_event_v1" as const,
    terminal_closeout_marker:
      VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_V1,
    terminal_closeout_version: 1 as const,
    saga_id: sagaId,
    closeout_id: closeoutId,
    canonical_confirmed_state_id: confirmedStateId,
    canonical_confirmed_state_fingerprint:
      confirmedStateFingerprint,
    canonical_confirmed_state_completion_final: true as const,
    inventory_consumption_terminal_fingerprint_sha256:
      terminalInventoryFingerprint,
  };
  const terminalPublic = {
    ...publicBase,
    public_event_fingerprint_sha256:
      terminalFingerprint(publicBase),
  };
  const planWithoutFingerprint = {
    schema: "void_buy_void_saga_terminal_closeout_plan_v1" as const,
    marker:
      VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_V1 as
        typeof VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_V1,
    version: 1 as const,
    closeout_id: closeoutId,
    saga_id: sagaId,
    request_id: payment.request_id,
    attempt_id: payment.closeout!.execution_attempt_id,
    reservation_id: payment.primary_record_id,
    transaction_hash: payment.closeout!.void_delivery_tx_hash,
    canonical_confirmed_state_id: confirmedStateId,
    canonical_confirmed_state_fingerprint:
      confirmedStateFingerprint,
    server_policy_fingerprint_sha256:
      serverPolicyFingerprint,
    inventory_consumption: terminalInventory,
    public_closeout_event: terminalPublic,
    base_closeout_plan: baseCloseout.plan,
    inventory_decrement_required: true as const,
    public_request_fulfilled_required: true as const,
    public_request_base_record_mutation_authorized: false as const,
    reservation_base_record_mutation_authorized: false as const,
    credential_access_authorized: false as const,
    wallet_access_authorized: false as const,
    signing_authorized: false as const,
    transaction_broadcast_authorized: false as const,
    money_movement_authorized: false as const,
  };
  const terminalPlan: BuyVoidSagaTerminalCloseoutPlanV1 = {
    ...planWithoutFingerprint,
    plan_fingerprint_sha256:
      terminalFingerprint(planWithoutFingerprint),
  };
  assert.equal(
    persistTerminalCloseoutPlanV1(rootDir, terminalPlan),
    "created",
  );

  const sidecarPath = path.join(
    requestDir,
    "operator-event-terminal-closeout-" +
      payment.request_id +
      "-" +
      closeoutId +
      ".json",
  );
  writePrivateJson(sidecarPath, terminalPublic);

  const sagaEventsDir = path.join(
    rootDir,
    TERMINAL_CLOSEOUT_SAGA_ROOT,
    "sagas",
    sagaId,
    "events",
  );
  fs.mkdirSync(sagaEventsDir, {
    recursive: true,
    mode: 0o700,
  });
  for (const directory of [
    path.join(rootDir, TERMINAL_CLOSEOUT_SAGA_ROOT),
    path.join(rootDir, TERMINAL_CLOSEOUT_SAGA_ROOT, "sagas"),
    path.join(
      rootDir,
      TERMINAL_CLOSEOUT_SAGA_ROOT,
      "sagas",
      sagaId,
    ),
    sagaEventsDir,
  ]) {
    fs.chmodSync(directory, 0o700);
  }

  const events: any[] = [];
  const addEvent = (
    eventType: string,
    payload: Record<string, unknown>,
  ): any => {
    const prior = events.at(-1) || null;
    const event = saga.buildSagaEventV1({
      binding,
      sequence: events.length,
      previous_event_id: prior?.event_id ?? null,
      recorded_at_utc:
        new Date(
          Date.UTC(2026, 8, 21, 23, 0, events.length),
        ).toISOString(),
      event_type: eventType,
      fencing_token: 1,
      payload,
    });
    events.push(event);
    return event;
  };
  addEvent("saga_initialized", {
    source_floor_main: "1".repeat(40),
    policy_id: "terminal-history-proof-policy",
    max_attempts: 1,
  });
  addEvent("claim_committed", {
    claim_id: "terminal-history-proof-claim",
    instruction_id: payment.instruction_id,
  });
  addEvent("inventory_reserved", {
    reservation_id: payment.primary_record_id,
  });
  addEvent("attempt_reserved", {
    attempt_id: payment.closeout!.execution_attempt_id,
    attempt_number: 1,
  });
  addEvent("transaction_prepared", {
    attempt_id: payment.closeout!.execution_attempt_id,
    transaction_hash: payment.closeout!.void_delivery_tx_hash,
    nonce: 0,
    fulfillment_wallet_fingerprint_sha256:
      sha256(WALLET),
    gas_limit: "200000",
    max_fee_per_gas_wei: "3000000000",
    max_priority_fee_per_gas_wei: "1000000000",
  });
  const broadcastIntentId = saga.computeBroadcastIntentIdV1({
    saga_id: sagaId,
    attempt_id: payment.closeout!.execution_attempt_id,
    transaction_hash: payment.closeout!.void_delivery_tx_hash,
  });
  addEvent("broadcast_intent_committed", {
    attempt_id: payment.closeout!.execution_attempt_id,
    transaction_hash: payment.closeout!.void_delivery_tx_hash,
    broadcast_intent_id: broadcastIntentId,
  });
  addEvent("broadcast_accepted", {
    attempt_id: payment.closeout!.execution_attempt_id,
    transaction_hash: payment.closeout!.void_delivery_tx_hash,
    reason_code: "provider_accepted",
    broadcast_call_performed: true,
    provider_submission_id_sha256:
      sha256("terminal-provider-submission"),
  });
  addEvent("receipt_confirmed", {
    attempt_id: payment.closeout!.execution_attempt_id,
    transaction_hash: payment.closeout!.void_delivery_tx_hash,
    block_number: "500",
    block_hash: deliveryBlockHash,
    confirmations: 6,
    receipt_status: 1,
  });
  addEvent("closeout_committed", {
    attempt_id: payment.closeout!.execution_attempt_id,
    transaction_hash: payment.closeout!.void_delivery_tx_hash,
    closeout_id: closeoutId,
    inventory_decremented: true,
    public_request_fulfilled: true,
  });

  for (const event of events) {
    writePrivateJson(
      path.join(
        sagaEventsDir,
        String(event.sequence).padStart(8, "0") +
          "-" +
          event.event_id +
          ".json",
      ),
      event,
    );
  }

  const before = snapshotTree(tmp);
  const terminal =
    await projectBuyVoidPaymentHistoryTerminalV1({
      pool_id: POOL,
      payment_key_sha256: payment.payment_key_sha256,
      carrier_root: carrier.carrier_root,
      read_page: readPage,
    });
  const after = snapshotTree(tmp);
  assert.deepEqual(after, before);
  assert.equal(
    terminal.marker,
    VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_PROJECTION_V1,
  );
  assert.equal(
    terminal.lifecycle_state,
    "public_fulfilled_terminal_closed",
  );
  assert.equal(terminal.saga_id, sagaId);
  assert.equal(terminal.closeout_id, closeoutId);
  assert.equal(terminal.saga_event_count, 9);
  assert.equal(
    terminal.public_event_fingerprint_sha256,
    terminalPublic.public_event_fingerprint_sha256,
  );
  assert.equal(
    terminal.carrier_root_sha256,
    carrier.carrier_root.carrier_root_sha256,
  );
  assert.equal(terminal.carrier_root_mutation_performed, false);
  assert.equal(terminal.filesystem_write_performed, false);
  assert.equal(terminal.money_movement_performed, false);

  process.env[
    VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_CARRIER_ROOT_ENV_V1
  ] = "f".repeat(64);
  await expectFailure(
    "CARRIER_ROOT_TRUST_MISMATCH",
    () =>
      projectBuyVoidPaymentHistoryTerminalV1({
        pool_id: POOL,
        payment_key_sha256: payment.payment_key_sha256,
        carrier_root: carrier.carrier_root,
        read_page: readPage,
      }),
  );
  process.env[
    VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_CARRIER_ROOT_ENV_V1
  ] = carrier.carrier_root.carrier_root_sha256;

  const wrongPayment = "0".repeat(64);
  await expectFailure(
    "CARRIER_PAYMENT_MEMBERSHIP_REQUIRED",
    () =>
      projectBuyVoidPaymentHistoryTerminalV1({
        pool_id: POOL,
        payment_key_sha256: wrongPayment,
        carrier_root: carrier.carrier_root,
        read_page: readPage,
      }),
  );

  const sidecarAlias = sidecarPath + ".hardlink";
  fs.linkSync(sidecarPath, sidecarAlias);
  await expectFailure(
    "PUBLIC_TERMINAL_SIDECAR_FILE_SHAPE_INVALID",
    () =>
      projectBuyVoidPaymentHistoryTerminalV1({
        pool_id: POOL,
        payment_key_sha256: payment.payment_key_sha256,
        carrier_root: carrier.carrier_root,
        read_page: readPage,
      }),
  );
  fs.rmSync(sidecarAlias);

  const originalSidecar =
    fs.readFileSync(sidecarPath);
  const wrongSidecar = {
    ...terminalPublic,
    closeout_id: "f".repeat(64),
  };
  writePrivateJson(sidecarPath, wrongSidecar);
  await expectFailure(
    "PUBLIC_TERMINAL_SIDECAR_BINDING_INVALID",
    () =>
      projectBuyVoidPaymentHistoryTerminalV1({
        pool_id: POOL,
        payment_key_sha256: payment.payment_key_sha256,
        carrier_root: carrier.carrier_root,
        read_page: readPage,
      }),
  );
  fs.writeFileSync(sidecarPath, originalSidecar, { mode: 0o600 });

  const extraFiles: string[] = [];
  for (
    let sequence = events.length;
    sequence <=
      VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_MAX_SAGA_EVENTS_V1;
    sequence += 1
  ) {
    const file = path.join(
      sagaEventsDir,
      String(sequence).padStart(8, "0") +
        "-voidbvfsge1_" +
        sha256("extra-event-" + sequence) +
        ".json",
    );
    writePrivateJson(file, { invalid: true });
    extraFiles.push(file);
  }
  await expectFailure(
    "SAGA_EVENT_COUNT_OUT_OF_RANGE",
    () =>
      projectBuyVoidPaymentHistoryTerminalV1({
        pool_id: POOL,
        payment_key_sha256: payment.payment_key_sha256,
        carrier_root: carrier.carrier_root,
        read_page: readPage,
      }),
  );
  for (const file of extraFiles) fs.rmSync(file);

  const temporaryEntries: string[] = [];
  for (
    let index = 0;
    index <
      VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_MAX_SAGA_DIRECTORY_ENTRIES_V1 -
        events.length +
        1;
    index += 1
  ) {
    const file = path.join(
      sagaEventsDir,
      "00000000-voidbvfsge1_" +
        sha256("recognized-temp-" + index) +
        ".json.tmp-" +
        String(process.pid) +
        "-" +
        index.toString(16).padStart(16, "0") +
        "",
    );
    fs.writeFileSync(file, "{}\n", { mode: 0o600 });
    temporaryEntries.push(file);
  }
  await expectFailure(
    "SAGA_DIRECTORY_ENTRY_COUNT_EXCEEDED",
    () =>
      projectBuyVoidPaymentHistoryTerminalV1({
        pool_id: POOL,
        payment_key_sha256: payment.payment_key_sha256,
        carrier_root: carrier.carrier_root,
        read_page: readPage,
      }),
  );
  for (const file of temporaryEntries) fs.rmSync(file);

  for (const [key, expected] of Object.entries({
    source_only_projection: true,
    carrier_membership_required: true,
    trusted_carrier_root_sha256_required: true,
    server_controlled_carrier_root_pin_required: true,
    caller_supplied_unpinned_carrier_root_authority: false,
    canonical_server_path_entrypoint: true,
    explicit_path_helper_mount_authority: false,
    current_carrier_lifecycle_fingerprint_required: true,
    current_carrier_primary_record_fingerprint_required: true,
    inventory_consumed_required: true,
    deterministic_terminal_plan_required: true,
    terminal_plan_fingerprint_recomputed: true,
    terminal_inventory_fingerprint_recomputed: true,
    terminal_closeout_id_recomputed: true,
    public_event_fingerprint_recomputed: true,
    deterministic_public_sidecar_required: true,
    shared_operator_event_journal_scan_required: false,
    bounded_saga_directory_entries: true,
    maximum_saga_directory_entries: 128,
    bounded_saga_event_count_pre_admission: true,
    maximum_saga_events: 64,
    stable_terminal_plan_read: true,
    stable_direct_file_owner_required: true,
    stable_direct_file_mode_0600_required: true,
    stable_direct_file_single_link_required: true,
    saga_event_hash_chain_revalidated: true,
    saga_closed_state_required: true,
    closeout_committed_last_event_required: true,
    carrier_root_mutation: false,
    history_carrier_successor_created: false,
    caller_root_dir_mount_authority: false,
    caller_request_dir_mount_authority: false,
    caller_saga_validator_injection_authority: false,
    caller_read_page_content_authority: false,
    full_history_scan: false,
    filesystem_write: false,
    saga_mutation: false,
    public_request_mutation: false,
    runtime_activation: false,
    automatic_retry: false,
    credential_access: false,
    wallet_access: false,
    rpc_call: false,
    signing: false,
    transaction_broadcast: false,
    inventory_funding: false,
    treasury_or_liquidity_action: false,
    money_movement: false,
  })) {
    assert.equal(
      (VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_AUTHORITY_V1 as any)[key],
      expected,
      key,
    );
  }

  const terminalSource = fs.readFileSync(
    path.join(
      process.cwd(),
      "src/economic/buy_void_payment_history_terminal_projection_v1.ts",
    ),
    "utf8",
  );
  assert.equal(
    terminalSource.includes("load_saga_module"),
    false,
    "terminal projection must not accept an injected saga validator",
  );

  assert.equal(
    terminalSource.includes("buy_void_confirmed_closeout_runtime_v1"),
    false,
    "terminal projection must not import side-effecting confirmed-closeout runtime",
  );
  for (const requiredSource of [
    '"VOID_BUY_VOID_RUNTIME_DIR"',
    '"VOID_BUY_REQUEST_DIR"',
    "process.env.VOID_DATA_DIR",
    "process.env.DATA_DIR",
    '"public-buy-void-requests-v1"',
    '"runtime-integration-v1"',
  ]) {
    assert.equal(
      terminalSource.includes(requiredSource),
      true,
      "missing server path policy source: " + requiredSource,
    );
  }

  console.log(
    "VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_PROJECTION_V1_PROOF_GREEN",
  );
  console.log("carrier_membership_bound=true");
  console.log("carrier_primary_record_fingerprint_bound=true");
  console.log("trusted_carrier_root_bound=true");
  console.log("saga_validator_injection_authority=false");
  console.log("runtime_module_import_side_effects=false");
  console.log("inventory_consumed_bound=true");
  console.log("terminal_plan_fingerprint_recomputed=true");
  console.log("terminal_inventory_fingerprint_recomputed=true");
  console.log("terminal_closeout_id_recomputed=true");
  console.log("public_event_fingerprint_recomputed=true");
  console.log("deterministic_public_sidecar_bound=true");
  console.log("terminal_evidence_single_link_required=true");
  console.log("saga_directory_entry_max=128");
  console.log("saga_event_pre_admission_max=64");
  console.log("saga_hash_chain_revalidated=true");
  console.log("saga_closed_state_bound=true");
  console.log("carrier_root_mutation=false");
  console.log("filesystem_write=false");
  console.log("runtime_activation=false");
  console.log("transaction_broadcast=false");
  console.log("money_movement=false");
} finally {
  if (priorRuntimeDir === undefined) {
    delete process.env.VOID_BUY_VOID_RUNTIME_DIR;
  } else {
    process.env.VOID_BUY_VOID_RUNTIME_DIR =
      priorRuntimeDir;
  }
  if (priorRequestDir === undefined) {
    delete process.env.VOID_BUY_REQUEST_DIR;
  } else {
    process.env.VOID_BUY_REQUEST_DIR =
      priorRequestDir;
  }
  if (priorCarrierRootPin === undefined) {
    delete process.env[
      VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_CARRIER_ROOT_ENV_V1
    ];
  } else {
    process.env[
      VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_CARRIER_ROOT_ENV_V1
    ] = priorCarrierRootPin;
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}
