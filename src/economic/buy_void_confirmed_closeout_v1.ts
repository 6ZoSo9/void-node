import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  listBuyVoidInventoryReservationsV1,
} from "./buy_void_inventory_reservation_journal_v1.js";
import {
  listBuyVoidExecutionAttemptsV1,
} from "./buy_void_execution_attempt_journal_v1.js";

export const VOID_BUY_VOID_CONFIRMED_CLOSEOUT_V1 =
  "VOID_BUY_VOID_CONFIRMED_CLOSEOUT_V1";

export const VOID_BUY_VOID_CONFIRMED_CLOSEOUT_CONFIRMATION_V1 =
  "buyVoidConsumeInventoryAndClosePublicRequest";

export const VOID_BUY_VOID_CONFIRMED_CLOSEOUT_AUTHORITY_V1 = {
  one_request_per_run: true,
  disabled_by_policy_default: true,
  dry_by_default: true,
  exact_confirmation_required: true,
  confirmed_execution_attempt_required: true,
  append_only_inventory_consumption_journal: true,
  append_only_public_operator_event: true,
  duplicate_safe: true,
  partial_recovery_safe: true,
  server_controlled_root_dir: true,
  server_controlled_request_dir: true,
  public_request_base_record_mutation: false,
  reservation_base_record_mutation: false,
  wallet_access: false,
  credential_access: false,
  signing: false,
  transaction_broadcast: false,
  rpc_call: false,
  raw_signed_transaction_input: false,
  raw_signed_transaction_persistence: false,
  runtime_route_mount: false,
  background_loop: false,
  service_restart: false,
  money_movement: false,
} as const;

const SHA256 = /^[0-9a-f]{64}$/;
const TX_HASH = /^0x[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const SAFE_CODE = /^[A-Za-z0-9._:-]{1,180}$/;
const MAX_NOTE = 240;

export type BuyVoidConfirmedCloseoutPolicyV1 = {
  enabled: boolean;
  pool_id: string;
  request_dir: string;
};

export type BuyVoidConfirmedCloseoutSnapshotV1 = {
  attempt: Record<string, any>;
  inventory_reservation: Record<string, any>;
  request: Record<string, any>;
  operator_events: Array<Record<string, any>>;
  effective_status: string;
  existing_fulfilled_event: Record<string, any> | null;
};

export type BuyVoidInventoryConsumptionRecordV1 = {
  schema: "void_buy_void_inventory_consumption_v1";
  marker: typeof VOID_BUY_VOID_CONFIRMED_CLOSEOUT_V1;
  version: 1;
  consumption_id: string;
  consumption_fingerprint_sha256: string;
  recorded_at_ms: number;
  pool_id: string;
  reservation_id: string;
  execution_attempt_id: string;
  canonical_payment_identity: string;
  request_id: string;
  instruction_id: string;
  delivery_address: string;
  void_delivery_tx_hash: string;
  reserved_void_units: string;
  consumed_void_units: string;
  reservation_status_before: "reserved";
  reservation_status_after: "consumed";
  inventory_decrement_performed: true;
  base_reservation_record_mutated: false;
  public_request_base_record_mutated: false;
  wallet_access_performed: false;
  credential_access_performed: false;
  signing_performed: false;
  transaction_broadcast_performed: false;
  money_movement_performed: false;
};

export type BuyVoidPublicFulfillmentCloseoutEventV1 = {
  schema: "void_buy_void_operator_mark_v1";
  closeout_schema:
    "void_buy_void_confirmed_public_fulfillment_closeout_v1";
  closeout_marker: typeof VOID_BUY_VOID_CONFIRMED_CLOSEOUT_V1;
  closeout_version: 1;
  request_id: string;
  operator_status: "fulfilled";
  note: string;
  marked_at_ms: number;
  prior_status: string;
  tx_hash: string;
  void_delivery_tx_hash: string;
  fulfillment_receipt_required: true;
  usdc_amount: string;
  quoted_void: string;
  delivery_address: string;
  canonical_payment_identity: string;
  instruction_id: string;
  execution_attempt_id: string;
  inventory_reservation_id: string;
  inventory_consumption_id: string;
  inventory_consumption_fingerprint_sha256: string;
  buyer_fulfilled: true;
  automatic_fulfillment_completed: true;
  confirmed_state_required: true;
  inventory_consumption_required: true;
  credential_access_performed: false;
  signing_performed: false;
  transaction_broadcast_performed: false;
  money_movement_performed: false;
};

export type BuyVoidConfirmedCloseoutPlanV1 = {
  schema: "void_buy_void_confirmed_closeout_plan_v1";
  marker: typeof VOID_BUY_VOID_CONFIRMED_CLOSEOUT_V1;
  version: 1;
  attempt_id: string;
  request_id: string;
  reservation_id: string;
  void_delivery_tx_hash: string;
  effective_status_before: string;
  already_fulfilled: boolean;
  inventory_consumption:
    BuyVoidInventoryConsumptionRecordV1;
  public_closeout_event:
    BuyVoidPublicFulfillmentCloseoutEventV1;
  public_request_base_record_mutation_authorized: false;
  reservation_base_record_mutation_authorized: false;
  credential_access_authorized: false;
  signing_authorized: false;
  transaction_broadcast_authorized: false;
  money_movement_authorized: false;
};

export type BuyVoidConfirmedCloseoutWriteDecisionV1 =
  | {
      ok: true;
      status: "created" | "duplicate";
      mutation_performed: boolean;
      duplicate: boolean;
      recovered_partial: boolean;
      path: string;
      record?: Record<string, any>;
    }
  | {
      ok: false;
      status: "held";
      mutation_performed: boolean;
      duplicate: false;
      recovered_partial: boolean;
      reason: string;
      detail?: Record<string, unknown>;
    };

export type BuyVoidConfirmedCloseoutDecisionV1 =
  | {
      ok: true;
      status: "dry_run";
      applied: false;
      mutation_performed: false;
      duplicate: false;
      recovered_partial: false;
      required_confirmation:
        typeof VOID_BUY_VOID_CONFIRMED_CLOSEOUT_CONFIRMATION_V1;
      plan: BuyVoidConfirmedCloseoutPlanV1;
      credential_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
    }
  | {
      ok: true;
      status: "applied" | "duplicate" | "recovered_partial";
      applied: true;
      mutation_performed: boolean;
      duplicate: boolean;
      recovered_partial: boolean;
      plan: BuyVoidConfirmedCloseoutPlanV1;
      inventory: BuyVoidConfirmedCloseoutWriteDecisionV1;
      public_closeout: BuyVoidConfirmedCloseoutWriteDecisionV1;
      credential_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
    }
  | {
      ok: false;
      status: "held";
      applied: boolean;
      mutation_performed: boolean;
      duplicate: false;
      recovered_partial: boolean;
      reason: string;
      detail?: Record<string, unknown>;
      credential_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
    };

export type BuyVoidConfirmedCloseoutDependenciesV1 = {
  load_snapshot?: (
    input: {
      root_dir: string;
      request_dir: string;
      pool_id: string;
      attempt_id: string;
    },
  ) =>
    | { ok: true; snapshot: BuyVoidConfirmedCloseoutSnapshotV1 }
    | { ok: false; reason: string; detail?: Record<string, unknown> };
  write_inventory_consumption?: (
    input: {
      root_dir: string;
      record: BuyVoidInventoryConsumptionRecordV1;
    },
  ) => BuyVoidConfirmedCloseoutWriteDecisionV1;
  write_public_closeout?: (
    input: {
      request_dir: string;
      event: BuyVoidPublicFulfillmentCloseoutEventV1;
    },
  ) => BuyVoidConfirmedCloseoutWriteDecisionV1;
};

function held(
  applied: boolean,
  reason: string,
  detail?: Record<string, unknown>,
  mutationPerformed = false,
  recoveredPartial = false,
): BuyVoidConfirmedCloseoutDecisionV1 {
  return {
    ok: false,
    status: "held",
    applied,
    mutation_performed: mutationPerformed,
    duplicate: false,
    recovered_partial: recoveredPartial,
    reason,
    ...(detail ? { detail } : {}),
    credential_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
  };
}

function normalizeAddress(value: unknown): string {
  const normalized = String(value || "").trim().toLowerCase();
  return ADDRESS.test(normalized) ? normalized : "";
}

function normalizeHash(value: unknown): string {
  const normalized = String(value || "").trim().toLowerCase();
  return TX_HASH.test(normalized) ? normalized : "";
}

function parsePositiveInteger(value: unknown): bigint | null {
  const normalized = String(value ?? "").trim();
  if (!/^[0-9]+$/.test(normalized)) return null;
  try {
    const parsed = BigInt(normalized);
    return parsed > 0n ? parsed : null;
  } catch {
    return null;
  }
}

function safeNow(value?: number): number {
  return Number.isSafeInteger(value) && Number(value) >= 0
    ? Number(value)
    : Date.now();
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) =>
        `${JSON.stringify(key)}:${stableJson(nested)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function fingerprint(value: unknown): string {
  return crypto
    .createHash("sha256")
    .update(stableJson(value))
    .digest("hex");
}

function readJsonObject(file: string): Record<string, any> | null {
  try {
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, any>
      : null;
  } catch {
    return null;
  }
}

function readJsonLines(file: string): Array<Record<string, any>> {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        const value = JSON.parse(line);
        return value && typeof value === "object" && !Array.isArray(value)
          ? value as Record<string, any>
          : null;
      } catch {
        return null;
      }
    })
    .filter((value): value is Record<string, any> => Boolean(value));
}

function ensureDirectory(directory: string): void {
  fs.mkdirSync(directory, {
    recursive: true,
    mode: 0o700,
  });
  fs.chmodSync(directory, 0o700);
}

function atomicCreateJson(
  file: string,
  value: Record<string, unknown>,
): "created" | "exists" {
  ensureDirectory(path.dirname(file));
  let handle: number | null = null;
  try {
    handle = fs.openSync(file, "wx", 0o600);
    fs.writeFileSync(handle, JSON.stringify(value, null, 2) + "\n");
    fs.fsyncSync(handle);
    fs.closeSync(handle);
    handle = null;
    fs.chmodSync(file, 0o600);
    return "created";
  } catch (error: any) {
    if (handle !== null) {
      try {
        fs.closeSync(handle);
      } catch {
        // Best-effort close only.
      }
    }
    if (String(error?.code || "") === "EEXIST") return "exists";
    throw error;
  }
}

function appendJsonLineDurable(
  file: string,
  value: Record<string, unknown>,
): void {
  ensureDirectory(path.dirname(file));
  const handle = fs.openSync(file, "a", 0o600);
  try {
    fs.writeFileSync(handle, JSON.stringify(value) + "\n");
    fs.fsyncSync(handle);
  } finally {
    fs.closeSync(handle);
  }
  fs.chmodSync(file, 0o600);
}

function effectiveStatus(
  request: Record<string, any>,
  events: Array<Record<string, any>>,
): string {
  const applicable = events
    .filter((event) =>
      String(event.request_id || "") === String(request.request_id || ""))
    .sort((left, right) =>
      Number(left.marked_at_ms || 0) - Number(right.marked_at_ms || 0));
  const latest = applicable.at(-1);
  return String(
    latest?.operator_status ||
    request.effective_status ||
    request.status ||
    "",
  ).trim();
}

function defaultLoadSnapshot(input: {
  root_dir: string;
  request_dir: string;
  pool_id: string;
  attempt_id: string;
}):
  | { ok: true; snapshot: BuyVoidConfirmedCloseoutSnapshotV1 }
  | { ok: false; reason: string; detail?: Record<string, unknown> } {
  const rootDir = path.resolve(String(input.root_dir || ""));
  const requestDir = path.resolve(String(input.request_dir || ""));
  const poolId = String(input.pool_id || "").trim();
  const attemptId = String(input.attempt_id || "").trim().toLowerCase();

  if (!rootDir || !requestDir) {
    return { ok: false, reason: "missing_server_controlled_directory" };
  }
  if (!SAFE_CODE.test(poolId)) {
    return { ok: false, reason: "invalid_pool_id" };
  }
  if (!SHA256.test(attemptId)) {
    return { ok: false, reason: "invalid_execution_attempt_id" };
  }

  let attempts: Array<Record<string, any>>;
  let inventory: Array<Record<string, any>>;
  try {
    attempts = listBuyVoidExecutionAttemptsV1(rootDir) as any;
    inventory = listBuyVoidInventoryReservationsV1({
      root_dir: rootDir,
      pool_id: poolId,
    }) as any;
  } catch (error) {
    return {
      ok: false,
      reason: "confirmed_closeout_journal_read_failed",
      detail: {
        message: String((error as Error)?.message || error),
      },
    };
  }

  const attempt = attempts.find((state) =>
    String(state?.reservation?.attempt_id || "").toLowerCase() ===
      attemptId);
  if (!attempt) {
    return { ok: false, reason: "execution_attempt_not_found" };
  }
  if (attempt.status !== "confirmed" || !attempt.confirmation) {
    return {
      ok: false,
      reason: "execution_attempt_not_confirmed",
      detail: { status: String(attempt.status || "") },
    };
  }

  const confirmed = attempt.confirmation.confirmed_record;
  if (!confirmed || confirmed.status !== "fulfilled_confirmed") {
    return { ok: false, reason: "confirmed_fulfillment_record_missing" };
  }

  const requestId = String(confirmed.request_id || "");
  const instructionId = String(confirmed.instruction_id || "");
  const deliveryAddress = normalizeAddress(confirmed.delivery_address);
  const amount = String(confirmed.void_amount_units || "");

  const candidates = inventory.filter((record) =>
    String(record.request_id || "") === requestId &&
    String(record.instruction_id || "") === instructionId &&
    normalizeAddress(record.delivery_address) === deliveryAddress &&
    String(record.reserved_void_units || "") === amount);

  if (candidates.length !== 1) {
    return {
      ok: false,
      reason: "exact_inventory_reservation_not_found",
      detail: { candidate_count: candidates.length },
    };
  }

  const requestFile = path.join(requestDir, `${requestId}.json`);
  const request = readJsonObject(requestFile);
  if (!request) {
    return {
      ok: false,
      reason: "public_buy_void_request_not_found",
      detail: { request_file: requestFile },
    };
  }

  const events = readJsonLines(
    path.join(requestDir, "operator-events.jsonl"),
  );
  const fulfilledEvents = events.filter((event) =>
    String(event.request_id || "") === requestId &&
    String(event.operator_status || "") === "fulfilled");

  const distinctFulfilledHashes = new Set(
    fulfilledEvents
      .map((event) => normalizeHash(event.void_delivery_tx_hash))
      .filter(Boolean),
  );

  if (distinctFulfilledHashes.size > 1) {
    return {
      ok: false,
      reason: "conflicting_public_fulfillment_events",
    };
  }

  const expectedHash = normalizeHash(confirmed.void_delivery_tx_hash);
  const existingFulfilled = fulfilledEvents.find((event) =>
    normalizeHash(event.void_delivery_tx_hash) === expectedHash) || null;

  if (
    fulfilledEvents.length > 0 &&
    !existingFulfilled
  ) {
    return {
      ok: false,
      reason: "public_fulfillment_transaction_hash_conflict",
      detail: {
        expected_transaction_hash: expectedHash,
        observed_transaction_hashes:
          Array.from(distinctFulfilledHashes),
      },
    };
  }

  return {
    ok: true,
    snapshot: {
      attempt,
      inventory_reservation: candidates[0],
      request,
      operator_events: events,
      effective_status: effectiveStatus(request, events),
      existing_fulfilled_event: existingFulfilled,
    },
  };
}

export function planBuyVoidConfirmedCloseoutV1(input: {
  policy: BuyVoidConfirmedCloseoutPolicyV1;
  snapshot: BuyVoidConfirmedCloseoutSnapshotV1;
  now_ms?: number;
}):
  | { ok: true; plan: BuyVoidConfirmedCloseoutPlanV1 }
  | { ok: false; reason: string; detail?: Record<string, unknown> } {
  const policy = input?.policy;
  const snapshot = input?.snapshot;
  const attempt = snapshot?.attempt;
  const reservation = snapshot?.inventory_reservation;
  const request = snapshot?.request;

  if (!policy || !snapshot || !attempt || !reservation || !request) {
    return { ok: false, reason: "missing_closeout_input" };
  }

  const poolId = String(policy.pool_id || "").trim();
  const requestDir = String(policy.request_dir || "").trim();
  if (!SAFE_CODE.test(poolId) || !requestDir) {
    return { ok: false, reason: "invalid_closeout_policy" };
  }

  if (attempt.status !== "confirmed" || !attempt.confirmation) {
    return {
      ok: false,
      reason: "execution_attempt_not_confirmed",
      detail: { status: String(attempt.status || "") },
    };
  }

  const attemptId = String(
    attempt.reservation?.attempt_id || "",
  ).toLowerCase();
  const reservationId = String(
    reservation.reservation_id || "",
  ).toLowerCase();
  const confirmed = attempt.confirmation.confirmed_record || {};

  if (!SHA256.test(attemptId) || !SHA256.test(reservationId)) {
    return { ok: false, reason: "invalid_closeout_identity" };
  }

  const requestId = String(confirmed.request_id || "");
  const instructionId = String(confirmed.instruction_id || "");
  const canonicalPaymentIdentity = String(
    confirmed.canonical_payment_identity || "",
  );
  const deliveryAddress = normalizeAddress(
    confirmed.delivery_address,
  );
  const deliveryHash = normalizeHash(
    confirmed.void_delivery_tx_hash,
  );
  const confirmedAmount = parsePositiveInteger(
    confirmed.void_amount_units,
  );
  const reservedAmount = parsePositiveInteger(
    reservation.reserved_void_units,
  );

  const requestDelivery = normalizeAddress(
    request.delivery_address,
  );
  const requestPaymentHash = normalizeHash(
    request.tx_hash,
  );
  const confirmedPaymentHash = normalizeHash(
    confirmed.payment_transaction_hash,
  );
  const paymentHash = confirmedPaymentHash;

  const bindingFailures: string[] = [];

  if (!SAFE_CODE.test(requestId)) bindingFailures.push("request_id");
  if (!SAFE_CODE.test(instructionId)) {
    bindingFailures.push("instruction_id");
  }
  if (!canonicalPaymentIdentity) {
    bindingFailures.push("canonical_payment_identity");
  }
  if (!deliveryAddress || requestDelivery !== deliveryAddress) {
    bindingFailures.push("delivery_address");
  }
  if (!deliveryHash) bindingFailures.push("delivery_hash");
  if (
    !requestPaymentHash ||
    !confirmedPaymentHash ||
    requestPaymentHash !== confirmedPaymentHash
  ) {
    bindingFailures.push(
      "request_payment_transaction_hash_mismatch",
    );
  }
  if (confirmedAmount === null || reservedAmount === null) {
    bindingFailures.push("amount");
  }
  if (
    confirmedAmount !== null &&
    reservedAmount !== null &&
    confirmedAmount !== reservedAmount
  ) {
    bindingFailures.push("reserved_confirmed_amount");
  }
  if (String(reservation.request_id || "") !== requestId) {
    bindingFailures.push("reservation_request");
  }
  if (String(reservation.instruction_id || "") !== instructionId) {
    bindingFailures.push("reservation_instruction");
  }
  if (
    String(reservation.reservation_status || "") !== "reserved" ||
    reservation.inventory_decrement_performed !== false
  ) {
    bindingFailures.push("reservation_state");
  }
  if (
    confirmed.buyer_fulfilled !== true ||
    confirmed.automatic_fulfillment_completed !== true ||
    confirmed.delivery_confirmation_observed !== true
  ) {
    bindingFailures.push("confirmation_truth");
  }
  if (
    !["payment_verified", "reviewed", "fulfilled"].includes(
      String(snapshot.effective_status || ""),
    )
  ) {
    bindingFailures.push("public_effective_status");
  }

  const existingFulfilled = snapshot.existing_fulfilled_event;
  if (
    existingFulfilled &&
    normalizeHash(existingFulfilled.void_delivery_tx_hash) !==
      deliveryHash
  ) {
    bindingFailures.push("existing_fulfillment_hash");
  }

  if (bindingFailures.length) {
    return {
      ok: false,
      reason: "confirmed_closeout_binding_mismatch",
      detail: { failures: bindingFailures },
    };
  }

  const recordedAt = safeNow(
    Number(attempt.confirmation.confirmed_at_ms || input.now_ms),
  );

  const consumptionBinding = {
    marker: VOID_BUY_VOID_CONFIRMED_CLOSEOUT_V1,
    pool_id: poolId,
    reservation_id: reservationId,
    execution_attempt_id: attemptId,
    canonical_payment_identity: canonicalPaymentIdentity,
    request_id: requestId,
    instruction_id: instructionId,
    delivery_address: deliveryAddress,
    void_delivery_tx_hash: deliveryHash,
    consumed_void_units: confirmedAmount!.toString(),
  };

  const consumptionFingerprint = fingerprint(consumptionBinding);
  const consumptionId = fingerprint({
    schema: "void_buy_void_inventory_consumption_v1",
    ...consumptionBinding,
  });

  const consumption:
    BuyVoidInventoryConsumptionRecordV1 = {
      schema: "void_buy_void_inventory_consumption_v1",
      marker: VOID_BUY_VOID_CONFIRMED_CLOSEOUT_V1,
      version: 1,
      consumption_id: consumptionId,
      consumption_fingerprint_sha256:
        consumptionFingerprint,
      recorded_at_ms: recordedAt,
      pool_id: poolId,
      reservation_id: reservationId,
      execution_attempt_id: attemptId,
      canonical_payment_identity: canonicalPaymentIdentity,
      request_id: requestId,
      instruction_id: instructionId,
      delivery_address: deliveryAddress,
      void_delivery_tx_hash: deliveryHash,
      reserved_void_units: reservedAmount!.toString(),
      consumed_void_units: confirmedAmount!.toString(),
      reservation_status_before: "reserved",
      reservation_status_after: "consumed",
      inventory_decrement_performed: true,
      base_reservation_record_mutated: false,
      public_request_base_record_mutated: false,
      wallet_access_performed: false,
      credential_access_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    };

  const note = (
    "Automatic closeout from confirmed Chain-2050 " +
    "delivery and durable inventory consumption."
  ).slice(0, MAX_NOTE);

  const publicEvent:
    BuyVoidPublicFulfillmentCloseoutEventV1 = {
      schema: "void_buy_void_operator_mark_v1",
      closeout_schema:
        "void_buy_void_confirmed_public_fulfillment_closeout_v1",
      closeout_marker: VOID_BUY_VOID_CONFIRMED_CLOSEOUT_V1,
      closeout_version: 1,
      request_id: requestId,
      operator_status: "fulfilled",
      note,
      marked_at_ms: recordedAt,
      prior_status: String(snapshot.effective_status || ""),
      tx_hash: paymentHash,
      void_delivery_tx_hash: deliveryHash,
      fulfillment_receipt_required: true,
      usdc_amount: String(request.usdc_amount || ""),
      quoted_void: String(request.quoted_void || ""),
      delivery_address: deliveryAddress,
      canonical_payment_identity: canonicalPaymentIdentity,
      instruction_id: instructionId,
      execution_attempt_id: attemptId,
      inventory_reservation_id: reservationId,
      inventory_consumption_id: consumptionId,
      inventory_consumption_fingerprint_sha256:
        consumptionFingerprint,
      buyer_fulfilled: true,
      automatic_fulfillment_completed: true,
      confirmed_state_required: true,
      inventory_consumption_required: true,
      credential_access_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    };

  return {
    ok: true,
    plan: {
      schema: "void_buy_void_confirmed_closeout_plan_v1",
      marker: VOID_BUY_VOID_CONFIRMED_CLOSEOUT_V1,
      version: 1,
      attempt_id: attemptId,
      request_id: requestId,
      reservation_id: reservationId,
      void_delivery_tx_hash: deliveryHash,
      effective_status_before:
        String(snapshot.effective_status || ""),
      already_fulfilled: Boolean(existingFulfilled),
      inventory_consumption: consumption,
      public_closeout_event: publicEvent,
      public_request_base_record_mutation_authorized: false,
      reservation_base_record_mutation_authorized: false,
      credential_access_authorized: false,
      signing_authorized: false,
      transaction_broadcast_authorized: false,
      money_movement_authorized: false,
    },
  };
}

export function writeBuyVoidInventoryConsumptionV1(input: {
  root_dir: string;
  record: BuyVoidInventoryConsumptionRecordV1;
}): BuyVoidConfirmedCloseoutWriteDecisionV1 {
  const rootDir = path.resolve(String(input.root_dir || ""));
  const record = input.record;
  const file = path.join(
    rootDir,
    "inventory-consumption-v1",
    "records",
    `${record.reservation_id}.json`,
  );

  try {
    const created = atomicCreateJson(file, record as any);
    if (created === "created") {
      return {
        ok: true,
        status: "created",
        mutation_performed: true,
        duplicate: false,
        recovered_partial: false,
        path: file,
        record,
      };
    }

    const existing = readJsonObject(file);
    if (!existing) {
      return {
        ok: false,
        status: "held",
        mutation_performed: false,
        duplicate: false,
        recovered_partial: true,
        reason: "inventory_consumption_record_unreadable",
        detail: { path: file },
      };
    }
    if (
      existing.consumption_fingerprint_sha256 !==
        record.consumption_fingerprint_sha256 ||
      existing.void_delivery_tx_hash !==
        record.void_delivery_tx_hash ||
      existing.consumed_void_units !==
        record.consumed_void_units
    ) {
      return {
        ok: false,
        status: "held",
        mutation_performed: false,
        duplicate: false,
        recovered_partial: true,
        reason: "inventory_consumption_conflict",
        detail: { path: file },
      };
    }

    return {
      ok: true,
      status: "duplicate",
      mutation_performed: false,
      duplicate: true,
      recovered_partial: false,
      path: file,
      record: existing,
    };
  } catch (error) {
    return {
      ok: false,
      status: "held",
      mutation_performed: false,
      duplicate: false,
      recovered_partial: false,
      reason: "inventory_consumption_write_failed",
      detail: {
        path: file,
        message: String((error as Error)?.message || error),
      },
    };
  }
}

function sameCloseout(
  left: Record<string, any>,
  right: BuyVoidPublicFulfillmentCloseoutEventV1,
): boolean {
  const existingConsumptionId = String(
    left.inventory_consumption_id || "",
  );
  return (
    String(left.request_id || "") === right.request_id &&
    String(left.operator_status || "") === "fulfilled" &&
    normalizeHash(left.void_delivery_tx_hash) ===
      right.void_delivery_tx_hash &&
    (
      !existingConsumptionId ||
      existingConsumptionId ===
        right.inventory_consumption_id
    )
  );
}

export function writeBuyVoidPublicFulfillmentCloseoutV1(input: {
  request_dir: string;
  event: BuyVoidPublicFulfillmentCloseoutEventV1;
}): BuyVoidConfirmedCloseoutWriteDecisionV1 {
  const requestDir = path.resolve(String(input.request_dir || ""));
  const event = input.event;
  const journal = path.join(requestDir, "operator-events.jsonl");
  const sidecar = path.join(
    requestDir,
    `operator-event-${event.request_id}-${event.marked_at_ms}.json`,
  );

  try {
    const current = readJsonLines(journal);
    const fulfilled = current.filter((candidate) =>
      String(candidate.request_id || "") === event.request_id &&
      String(candidate.operator_status || "") === "fulfilled");

    const conflict = fulfilled.find((candidate) =>
      normalizeHash(candidate.void_delivery_tx_hash) !==
        event.void_delivery_tx_hash);
    if (conflict) {
      return {
        ok: false,
        status: "held",
        mutation_performed: false,
        duplicate: false,
        recovered_partial: true,
        reason: "public_fulfillment_closeout_conflict",
        detail: {
          observed_transaction_hash:
            normalizeHash(conflict.void_delivery_tx_hash),
          expected_transaction_hash:
            event.void_delivery_tx_hash,
        },
      };
    }

    const consumptionConflict = fulfilled.find(
      (candidate) => {
        const candidateConsumptionId = String(
          candidate.inventory_consumption_id || "",
        );
        return (
          normalizeHash(candidate.void_delivery_tx_hash) ===
            event.void_delivery_tx_hash &&
          Boolean(candidateConsumptionId) &&
          candidateConsumptionId !==
            event.inventory_consumption_id
        );
      },
    );
    if (consumptionConflict) {
      return {
        ok: false,
        status: "held",
        mutation_performed: false,
        duplicate: false,
        recovered_partial: true,
        reason:
          "public_fulfillment_inventory_consumption_conflict",
        detail: {
          observed_inventory_consumption_id:
            String(
              consumptionConflict
                .inventory_consumption_id || "",
            ),
          expected_inventory_consumption_id:
            event.inventory_consumption_id,
        },
      };
    }

    const existing = fulfilled.find((candidate) =>
      sameCloseout(candidate, event));
    let mutationPerformed = false;
    let recoveredPartial = false;

    if (!existing) {
      appendJsonLineDurable(journal, event as any);
      mutationPerformed = true;
    }

    const sidecarState = atomicCreateJson(sidecar, event as any);
    if (sidecarState === "created") {
      mutationPerformed = true;
      recoveredPartial = Boolean(existing);
    } else {
      const existingSidecar = readJsonObject(sidecar);
      if (!existingSidecar || !sameCloseout(existingSidecar, event)) {
        return {
          ok: false,
          status: "held",
          mutation_performed: mutationPerformed,
          duplicate: false,
          recovered_partial: true,
          reason: "public_fulfillment_sidecar_conflict",
          detail: { path: sidecar },
        };
      }
    }

    return {
      ok: true,
      status: existing ? "duplicate" : "created",
      mutation_performed: mutationPerformed,
      duplicate: Boolean(existing),
      recovered_partial: recoveredPartial,
      path: sidecar,
      record: existing || event,
    };
  } catch (error) {
    return {
      ok: false,
      status: "held",
      mutation_performed: false,
      duplicate: false,
      recovered_partial: false,
      reason: "public_fulfillment_closeout_write_failed",
      detail: {
        message: String((error as Error)?.message || error),
      },
    };
  }
}

export function listBuyVoidInventoryConsumptionsV1(
  rootDir: string,
): BuyVoidInventoryConsumptionRecordV1[] {
  const directory = path.join(
    path.resolve(String(rootDir || "")),
    "inventory-consumption-v1",
    "records",
  );
  if (!fs.existsSync(directory)) return [];

  return (
    fs
      .readdirSync(directory)
      .filter((name) => name.endsWith(".json"))
      .sort()
      .map((name) =>
        readJsonObject(path.join(directory, name)))
      .filter((value): value is Record<string, any> =>
        Boolean(value))
      .filter((value) =>
        value.schema ===
          "void_buy_void_inventory_consumption_v1" &&
        value.marker ===
          VOID_BUY_VOID_CONFIRMED_CLOSEOUT_V1 &&
        value.inventory_decrement_performed === true &&
        value.reservation_status_after === "consumed")
  ) as BuyVoidInventoryConsumptionRecordV1[];
}

export function runBuyVoidConfirmedCloseoutV1(input: {
  root_dir: string;
  attempt_id: string;
  policy: BuyVoidConfirmedCloseoutPolicyV1;
  apply?: boolean;
  confirmation?: unknown;
  now_ms?: number;
  dependencies?: BuyVoidConfirmedCloseoutDependenciesV1;
}): BuyVoidConfirmedCloseoutDecisionV1 {
  const rootDir = path.resolve(String(input?.root_dir || ""));
  const attemptId = String(
    input?.attempt_id || "",
  ).trim().toLowerCase();
  const policy = input?.policy;

  if (!rootDir || !SHA256.test(attemptId) || !policy) {
    return held(
      input?.apply === true,
      "invalid_confirmed_closeout_input",
    );
  }

  if (policy.enabled !== true) {
    return held(
      input.apply === true,
      "confirmed_closeout_policy_disabled",
    );
  }

  if (
    input.apply === true &&
    String(input.confirmation || "") !==
      VOID_BUY_VOID_CONFIRMED_CLOSEOUT_CONFIRMATION_V1
  ) {
    return held(
      true,
      "explicit_confirmation_required",
      {
        required_confirmation:
          VOID_BUY_VOID_CONFIRMED_CLOSEOUT_CONFIRMATION_V1,
      },
    );
  }

  const load =
    input.dependencies?.load_snapshot ||
    defaultLoadSnapshot;
  const loaded = load({
    root_dir: rootDir,
    request_dir: policy.request_dir,
    pool_id: policy.pool_id,
    attempt_id: attemptId,
  });
  if (loaded.ok === false) {
    return held(
      input.apply === true,
      loaded.reason,
      loaded.detail,
    );
  }

  const planned = planBuyVoidConfirmedCloseoutV1({
    policy,
    snapshot: loaded.snapshot,
    now_ms: input.now_ms,
  });
  if (planned.ok === false) {
    return held(
      input.apply === true,
      planned.reason,
      planned.detail,
    );
  }

  if (input.apply !== true) {
    return {
      ok: true,
      status: "dry_run",
      applied: false,
      mutation_performed: false,
      duplicate: false,
      recovered_partial: false,
      required_confirmation:
        VOID_BUY_VOID_CONFIRMED_CLOSEOUT_CONFIRMATION_V1,
      plan: planned.plan,
      credential_access_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    };
  }

  const writeInventory =
    input.dependencies?.write_inventory_consumption ||
    writeBuyVoidInventoryConsumptionV1;
  const inventory = writeInventory({
    root_dir: rootDir,
    record: planned.plan.inventory_consumption,
  });

  if (inventory.ok === false) {
    return held(
      true,
      inventory.reason,
      inventory.detail,
      inventory.mutation_performed,
      inventory.recovered_partial,
    );
  }

  const writePublic =
    input.dependencies?.write_public_closeout ||
    writeBuyVoidPublicFulfillmentCloseoutV1;
  const publicCloseout = writePublic({
    request_dir: policy.request_dir,
    event: planned.plan.public_closeout_event,
  });

  if (publicCloseout.ok === false) {
    return held(
      true,
      publicCloseout.reason,
      publicCloseout.detail,
      inventory.mutation_performed ||
        publicCloseout.mutation_performed,
      true,
    );
  }

  const mutationPerformed =
    inventory.mutation_performed ||
    publicCloseout.mutation_performed;
  const duplicate =
    inventory.duplicate &&
    publicCloseout.duplicate;
  const recoveredPartial =
    inventory.recovered_partial ||
    publicCloseout.recovered_partial ||
    (
      inventory.duplicate &&
      publicCloseout.mutation_performed
    );

  return {
    ok: true,
    status: recoveredPartial
      ? "recovered_partial"
      : duplicate
        ? "duplicate"
        : "applied",
    applied: true,
    mutation_performed: mutationPerformed,
    duplicate,
    recovered_partial: recoveredPartial,
    plan: planned.plan,
    inventory,
    public_closeout: publicCloseout,
    credential_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
  };
}
