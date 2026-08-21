import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1,
  type BuyVoidFulfillmentJournalIntentV1,
} from "./buy_void_fulfillment_journal_v1.js";

export const VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1 =
  "VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1";

export const VOID_BUY_VOID_PAID_UNRESERVABLE_OBLIGATION_V1 =
  "VOID_BUY_VOID_PAID_UNRESERVABLE_OBLIGATION_V1";

export const VOID_BUY_VOID_INVENTORY_RESERVATION_AUTHORITY_V1 = {
  filesystem_read: true,
  filesystem_write: true,
  aggregate_inventory_reservation: true,
  duplicate_safe_reservation: true,
  global_pool_lock: true,
  paid_unreservable_terminal_obligation: true,
  obligation_automatic_retry: false,
  obligation_refund_execution_authorized: false,
  inventory_decrement: false,
  reservation_release: false,
  sold_out_closeout: false,
  request_journal_write: false,
  rpc_call: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  runtime_route_mount: false,
  money_movement: false,
} as const;

const SHA256 = /^[0-9a-f]{64}$/;
const TX_HASH = /^0x[0-9a-f]{64}$/;
const SAFE_CODE = /^[A-Za-z0-9._:-]{1,160}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;

export type BuyVoidInventoryReservationPolicyV1 = {
  inventory_reservation_enabled: boolean;
  pool_id: string;
  inventory_policy_version: string;
  pool_capacity_void_units: string | number;
  max_reservation_void_units: string | number;
};

export type BuyVoidInventoryReservationJournalPathsV1 = {
  root_dir: string;
  journal_dir: string;
  pools_dir: string;
  pool_dir: string;
  reservations_dir: string;
  holds_dir: string;
  lock_dir: string;
};

export type BuyVoidInventoryAggregateV1 = {
  schema: "void_buy_void_inventory_aggregate_v1";
  marker: typeof VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1;
  pool_id: string;
  inventory_policy_version: string;
  pool_capacity_void_units: string;
  committed_void_units: string;
  available_void_units: string;
  reservation_count: number;
  sold_out: boolean;
};

export type BuyVoidInventoryReservationV1 = {
  schema: "void_buy_void_inventory_reservation_v1";
  marker: typeof VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1;
  reservation_id: string;
  reserved_at_ms: number;
  pool_id: string;
  inventory_policy_version: string;
  pool_capacity_void_units: string;
  committed_before_void_units: string;
  reserved_void_units: string;
  committed_after_void_units: string;
  available_after_void_units: string;
  payment_key_sha256: string;
  request_key_sha256: string;
  canonical_payment_identity: string;
  request_id: string;
  instruction_id: string;
  delivery_address: string;
  intent_fingerprint: string;
  reservation_status: "reserved";
  inventory_decrement_performed: false;
  reservation_release_authorized: false;
  execution_authorized_by_this_module: false;
  signing_authorized_by_this_module: false;
  transaction_broadcast_authorized_by_this_module: false;
  money_movement_authorized_by_this_module: false;
};

export type BuyVoidPaidUnreservableObligationV1 = {
  schema: "void_buy_void_paid_unreservable_obligation_v1";
  marker: typeof VOID_BUY_VOID_PAID_UNRESERVABLE_OBLIGATION_V1;
  obligation_id: string;
  recorded_at_ms: number;
  terminal_state: "operator_reconciliation_required";
  reservation_failure_reason:
    | "inventory_sold_out"
    | "insufficient_void_inventory";
  pool_id: string;
  inventory_policy_version: string;
  pool_capacity_void_units: string;
  inventory_policy_fingerprint_sha256: string;
  available_void_units: string;
  requested_void_units: string;
  source_chain: string;
  payment_transaction_hash: string;
  payment_log_index: string;
  confirmed_block_number: string;
  confirmation_count_at_claim: string;
  payment_usdc_units: string;
  payment_key_sha256: string;
  request_key_sha256: string;
  canonical_payment_identity: string;
  request_id: string;
  instruction_id: string;
  delivery_address: string;
  customer_payment_confirmed: true;
  reservation_created: false;
  automatic_retry: false;
  refund_execution_authorized: false;
  alternate_fulfillment_execution_authorized: false;
  wallet_access_authorized: false;
  signing_authorized: false;
  transaction_broadcast_authorized: false;
  money_movement_authorized: false;
};

export type BuyVoidInventoryReservationDecisionV1 =
  | {
      ok: true;
      status: "available";
      applied: false;
      duplicate: boolean;
      new_reservation: false;
      reservation: BuyVoidInventoryReservationV1;
      aggregate: BuyVoidInventoryAggregateV1;
    }
  | {
      ok: true;
      status: "reserved";
      applied: true;
      duplicate: false;
      new_reservation: true;
      reservation: BuyVoidInventoryReservationV1;
      aggregate: BuyVoidInventoryAggregateV1;
    }
  | {
      ok: true;
      status: "duplicate";
      applied: true;
      duplicate: true;
      new_reservation: false;
      reservation: BuyVoidInventoryReservationV1;
      aggregate: BuyVoidInventoryAggregateV1;
    }
  | {
      ok: false;
      status: "held";
      applied: boolean;
      duplicate: false;
      new_reservation: false;
      reason: string;
      detail?: Record<string, unknown>;
    };

export type ReserveBuyVoidInventoryInputV1 = {
  root_dir: string;
  intent: BuyVoidFulfillmentJournalIntentV1;
  policy: BuyVoidInventoryReservationPolicyV1;
  apply?: boolean;
  now_ms?: number;
};

type NormalizedPolicyV1 = {
  pool_id: string;
  inventory_policy_version: string;
  capacity: bigint;
  max_reservation: bigint;
  pool_key_sha256: string;
  policy_fingerprint: string;
};

function held(
  applied: boolean,
  reason: string,
  detail?: Record<string, unknown>,
): BuyVoidInventoryReservationDecisionV1 {
  return {
    ok: false,
    status: "held",
    applied,
    duplicate: false,
    new_reservation: false,
    reason,
    ...(detail ? { detail } : {}),
  };
}

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

function safeNow(value: unknown): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : Date.now();
}

function parsePositiveInteger(value: unknown): bigint | null {
  if (typeof value === "bigint") return value > 0n ? value : null;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value <= 0) return null;
    return BigInt(value);
  }
  const raw = String(value ?? "").trim();
  if (!/^[0-9]+$/.test(raw)) return null;
  try {
    const parsed = BigInt(raw);
    return parsed > 0n ? parsed : null;
  } catch {
    return null;
  }
}

function parseNonNegativeInteger(value: unknown): bigint | null {
  if (typeof value === "bigint") return value >= 0n ? value : null;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) return null;
    return BigInt(value);
  }
  const raw = String(value ?? "").trim();
  if (!/^[0-9]+$/.test(raw)) return null;
  try {
    const parsed = BigInt(raw);
    return parsed >= 0n ? parsed : null;
  } catch {
    return null;
  }
}

function validateRoot(rootDir: unknown): string {
  const raw = String(rootDir || "").trim();
  if (!raw || raw.includes("\0")) {
    throw new Error("invalid_inventory_journal_root");
  }
  return path.resolve(raw);
}

function normalizeAddress(value: unknown): string {
  const address = String(value || "").trim().toLowerCase();
  return ADDRESS.test(address) ? address : "";
}

function validateIntent(
  intent: BuyVoidFulfillmentJournalIntentV1,
):
  | {
      ok: true;
      amount: bigint;
      intent_fingerprint: string;
    }
  | { ok: false; reason: string } {
  if (!intent || typeof intent !== "object") {
    return { ok: false, reason: "missing_fulfillment_intent" };
  }
  if (intent.marker !== VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1) {
    return { ok: false, reason: "wrong_fulfillment_journal_marker" };
  }
  if (intent.claim?.status !== "claimed") {
    return { ok: false, reason: "fulfillment_intent_not_claimed" };
  }
  if (intent.signing_authorized !== false) {
    return { ok: false, reason: "intent_signing_authority_present" };
  }
  if (intent.transaction_broadcast_authorized !== false) {
    return { ok: false, reason: "intent_broadcast_authority_present" };
  }
  if (intent.money_movement_authorized !== false) {
    return { ok: false, reason: "intent_money_movement_authority_present" };
  }
  if (!SHA256.test(String(intent.payment_key_sha256 || ""))) {
    return { ok: false, reason: "invalid_payment_key" };
  }
  if (!SHA256.test(String(intent.request_key_sha256 || ""))) {
    return { ok: false, reason: "invalid_request_key" };
  }
  if (!SAFE_CODE.test(String(intent.claim?.request_id || ""))) {
    return { ok: false, reason: "invalid_request_id" };
  }
  if (!SAFE_CODE.test(String(intent.claim?.instruction_id || ""))) {
    return { ok: false, reason: "invalid_instruction_id" };
  }
  if (!String(intent.claim?.canonical_payment_identity || "").trim()) {
    return { ok: false, reason: "missing_canonical_payment_identity" };
  }
  if (!normalizeAddress(
    intent.claim?.unsigned_instruction?.delivery_address,
  )) {
    return { ok: false, reason: "invalid_delivery_address" };
  }

  const amount = parsePositiveInteger(
    intent.claim?.unsigned_instruction?.void_amount_units,
  );
  if (amount === null) {
    return { ok: false, reason: "invalid_void_amount" };
  }

  return {
    ok: true,
    amount,
    intent_fingerprint: stableFingerprint({
      marker: String(intent.marker || ""),
      payment_key_sha256: String(intent.payment_key_sha256 || ""),
      request_key_sha256: String(intent.request_key_sha256 || ""),
      canonical_payment_identity: String(
        intent.claim?.canonical_payment_identity || "",
      ),
      request_id: String(intent.claim?.request_id || ""),
      instruction_id: String(intent.claim?.instruction_id || ""),
      delivery_address: String(
        intent.claim?.unsigned_instruction?.delivery_address || "",
      ).toLowerCase(),
      void_amount_units: amount.toString(),
    }),
  };
}

function normalizePolicy(
  policy: BuyVoidInventoryReservationPolicyV1,
): { ok: true; policy: NormalizedPolicyV1 } | { ok: false; reason: string } {
  if (!policy || policy.inventory_reservation_enabled !== true) {
    return { ok: false, reason: "inventory_reservation_disabled" };
  }

  const poolId = String(policy.pool_id || "").trim();
  const policyVersion = String(
    policy.inventory_policy_version || "",
  ).trim();
  if (!SAFE_CODE.test(poolId)) {
    return { ok: false, reason: "invalid_inventory_pool_id" };
  }
  if (!SAFE_CODE.test(policyVersion)) {
    return { ok: false, reason: "invalid_inventory_policy_version" };
  }

  const capacity = parsePositiveInteger(
    policy.pool_capacity_void_units,
  );
  const maximum = parsePositiveInteger(
    policy.max_reservation_void_units,
  );
  if (capacity === null) {
    return { ok: false, reason: "invalid_inventory_capacity" };
  }
  if (maximum === null || maximum > capacity) {
    return { ok: false, reason: "invalid_inventory_reservation_cap" };
  }

  const poolKey = sha256Hex(
    `void-buy-inventory-pool-v1\n${poolId}`,
  );
  return {
    ok: true,
    policy: {
      pool_id: poolId,
      inventory_policy_version: policyVersion,
      capacity,
      max_reservation: maximum,
      pool_key_sha256: poolKey,
      policy_fingerprint: stableFingerprint({
        pool_id: poolId,
        inventory_policy_version: policyVersion,
        pool_capacity_void_units: capacity.toString(),
        max_reservation_void_units: maximum.toString(),
      }),
    },
  };
}

export function buyVoidInventoryReservationJournalPathsV1(
  rootDir: string,
  poolId: string,
): BuyVoidInventoryReservationJournalPathsV1 {
  const root = validateRoot(rootDir);
  if (!SAFE_CODE.test(String(poolId || "").trim())) {
    throw new Error("invalid_inventory_pool_id");
  }
  const journalDir = path.join(
    root,
    "buy-void-inventory-reservation-v1",
  );
  const poolsDir = path.join(journalDir, "pools");
  const poolKey = sha256Hex(
    `void-buy-inventory-pool-v1\n${String(poolId).trim()}`,
  );
  const poolDir = path.join(poolsDir, poolKey);
  return {
    root_dir: root,
    journal_dir: journalDir,
    pools_dir: poolsDir,
    pool_dir: poolDir,
    reservations_dir: path.join(poolDir, "reservations"),
    holds_dir: path.join(poolDir, "holds"),
    lock_dir: path.join(poolDir, ".reserve.lock"),
  };
}

function ensurePrivateDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  try {
    fs.chmodSync(dir, 0o700);
  } catch {
    // Permission tightening is best effort on non-POSIX filesystems.
  }
}

function fsyncDir(dir: string): void {
  let descriptor: number | null = null;
  try {
    descriptor = fs.openSync(dir, "r");
    fs.fsyncSync(descriptor);
  } catch {
    // Directory fsync is not supported on all filesystems.
  } finally {
    if (descriptor !== null) fs.closeSync(descriptor);
  }
}

function atomicCreateJson(
  file: string,
  value: unknown,
): "created" | "exists" {
  const parent = path.dirname(file);
  ensurePrivateDir(parent);
  const temporary = path.join(
    parent,
    `.${path.basename(file)}.tmp-${process.pid}-` +
      crypto.randomBytes(8).toString("hex"),
  );
  const descriptor = fs.openSync(temporary, "wx", 0o600);
  try {
    fs.writeFileSync(
      descriptor,
      `${JSON.stringify(value, null, 2)}\n`,
      "utf8",
    );
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }

  try {
    try {
      fs.linkSync(temporary, file);
      fsyncDir(parent);
      return "created";
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === "EEXIST") {
        return "exists";
      }
      throw error;
    }
  } finally {
    try {
      fs.unlinkSync(temporary);
    } catch {
      // Best effort cleanup.
    }
  }
}

function readJsonObject(file: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return parsed && typeof parsed === "object"
      ? parsed as Record<string, unknown>
      : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function reservationIdFor(
  policy: NormalizedPolicyV1,
  intent: BuyVoidFulfillmentJournalIntentV1,
): string {
  return sha256Hex(
    [
      "void-buy-inventory-reservation-v1",
      policy.pool_key_sha256,
      intent.payment_key_sha256,
      intent.claim.instruction_id,
    ].join("\n"),
  );
}

function reservationFile(
  paths: BuyVoidInventoryReservationJournalPathsV1,
  reservationId: string,
): string {
  if (!SHA256.test(reservationId)) {
    throw new Error("invalid_inventory_reservation_id");
  }
  return path.join(
    paths.reservations_dir,
    `${reservationId}.json`,
  );
}

function obligationIdFor(
  policy: NormalizedPolicyV1,
  intent: BuyVoidFulfillmentJournalIntentV1,
): string {
  return sha256Hex(
    [
      "void-buy-paid-unreservable-obligation-v1",
      policy.pool_key_sha256,
      intent.payment_key_sha256,
      intent.request_key_sha256,
      intent.claim.instruction_id,
    ].join("\n"),
  );
}

function obligationFile(
  paths: BuyVoidInventoryReservationJournalPathsV1,
  obligationId: string,
): string {
  if (!SHA256.test(obligationId)) {
    throw new Error("invalid_paid_unreservable_obligation_id");
  }
  return path.join(paths.holds_dir, `${obligationId}.json`);
}

function parsePaidUnreservableObligation(
  raw: Record<string, unknown>,
): BuyVoidPaidUnreservableObligationV1 {
  const poolId = String(raw.pool_id || "");
  const paymentKey = String(raw.payment_key_sha256 || "");
  const requestKey = String(raw.request_key_sha256 || "");
  const instructionId = String(raw.instruction_id || "");
  const expectedPoolKey = SAFE_CODE.test(poolId)
    ? sha256Hex(`void-buy-inventory-pool-v1\n${poolId}`)
    : "";
  const expectedObligationId =
    expectedPoolKey &&
    SHA256.test(paymentKey) &&
    SHA256.test(requestKey) &&
    SAFE_CODE.test(instructionId)
      ? sha256Hex(
          [
            "void-buy-paid-unreservable-obligation-v1",
            expectedPoolKey,
            paymentKey,
            requestKey,
            instructionId,
          ].join("\n"),
        )
      : "";
  if (
    raw.schema !== "void_buy_void_paid_unreservable_obligation_v1" ||
    raw.marker !== VOID_BUY_VOID_PAID_UNRESERVABLE_OBLIGATION_V1 ||
    String(raw.obligation_id || "") !== expectedObligationId ||
    !Number.isSafeInteger(raw.recorded_at_ms) ||
    Number(raw.recorded_at_ms) <= 0 ||
    raw.terminal_state !== "operator_reconciliation_required" ||
    !["inventory_sold_out", "insufficient_void_inventory"].includes(
      String(raw.reservation_failure_reason || ""),
    ) ||
    !SAFE_CODE.test(poolId) ||
    !SAFE_CODE.test(String(raw.inventory_policy_version || "")) ||
    parsePositiveInteger(raw.pool_capacity_void_units) === null ||
    !SHA256.test(String(raw.inventory_policy_fingerprint_sha256 || "")) ||
    parseNonNegativeInteger(raw.available_void_units) === null ||
    parsePositiveInteger(raw.requested_void_units) === null ||
    !SAFE_CODE.test(String(raw.source_chain || "")) ||
    !TX_HASH.test(String(raw.payment_transaction_hash || "")) ||
    parseNonNegativeInteger(raw.payment_log_index) === null ||
    parsePositiveInteger(raw.confirmed_block_number) === null ||
    parsePositiveInteger(raw.confirmation_count_at_claim) === null ||
    parsePositiveInteger(raw.payment_usdc_units) === null ||
    !SHA256.test(paymentKey) ||
    !SHA256.test(requestKey) ||
    !String(raw.canonical_payment_identity || "").trim() ||
    !SAFE_CODE.test(String(raw.request_id || "")) ||
    !SAFE_CODE.test(instructionId) ||
    !normalizeAddress(raw.delivery_address) ||
    raw.customer_payment_confirmed !== true ||
    raw.reservation_created !== false ||
    raw.automatic_retry !== false ||
    raw.refund_execution_authorized !== false ||
    raw.alternate_fulfillment_execution_authorized !== false ||
    raw.wallet_access_authorized !== false ||
    raw.signing_authorized !== false ||
    raw.transaction_broadcast_authorized !== false ||
    raw.money_movement_authorized !== false
  ) {
    throw new Error("invalid_paid_unreservable_obligation_record");
  }
  return raw as BuyVoidPaidUnreservableObligationV1;
}

function recordPaidUnreservableObligation(
  paths: BuyVoidInventoryReservationJournalPathsV1,
  intent: BuyVoidFulfillmentJournalIntentV1,
  policy: NormalizedPolicyV1,
  reason: "inventory_sold_out" | "insufficient_void_inventory",
  availableVoidUnits: string,
  requestedVoidUnits: string,
  nowMs: number,
): BuyVoidPaidUnreservableObligationV1 {
  ensurePrivateDir(paths.holds_dir);
  const obligationId = obligationIdFor(policy, intent);
  const binding = intent.verification_binding;
  const record: BuyVoidPaidUnreservableObligationV1 = {
    schema: "void_buy_void_paid_unreservable_obligation_v1",
    marker: VOID_BUY_VOID_PAID_UNRESERVABLE_OBLIGATION_V1,
    obligation_id: obligationId,
    recorded_at_ms: nowMs,
    terminal_state: "operator_reconciliation_required",
    reservation_failure_reason: reason,
    pool_id: policy.pool_id,
    inventory_policy_version: policy.inventory_policy_version,
    pool_capacity_void_units: policy.capacity.toString(),
    inventory_policy_fingerprint_sha256: policy.policy_fingerprint,
    available_void_units: availableVoidUnits,
    requested_void_units: requestedVoidUnits,
    source_chain: binding.source_chain,
    payment_transaction_hash: binding.payment_transaction_hash,
    payment_log_index: binding.payment_log_index,
    confirmed_block_number: binding.confirmed_block_number,
    confirmation_count_at_claim: binding.confirmation_count_at_claim,
    payment_usdc_units: binding.payment_usdc_units,
    payment_key_sha256: intent.payment_key_sha256,
    request_key_sha256: intent.request_key_sha256,
    canonical_payment_identity: intent.claim.canonical_payment_identity,
    request_id: intent.claim.request_id,
    instruction_id: intent.claim.instruction_id,
    delivery_address: String(
      intent.claim.unsigned_instruction.delivery_address,
    ).toLowerCase(),
    customer_payment_confirmed: true,
    reservation_created: false,
    automatic_retry: false,
    refund_execution_authorized: false,
    alternate_fulfillment_execution_authorized: false,
    wallet_access_authorized: false,
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    money_movement_authorized: false,
  };

  const file = obligationFile(paths, obligationId);
  const created = atomicCreateJson(file, record);
  if (created === "created") return record;

  const existingRaw = readJsonObject(file);
  if (!existingRaw) {
    throw new Error("paid_unreservable_obligation_race_unreadable");
  }
  const existing = parsePaidUnreservableObligation(existingRaw);
  for (const key of [
    "pool_id",
    "inventory_policy_version",
    "pool_capacity_void_units",
    "inventory_policy_fingerprint_sha256",
    "requested_void_units",
    "source_chain",
    "payment_transaction_hash",
    "payment_log_index",
    "confirmed_block_number",
    "confirmation_count_at_claim",
    "payment_usdc_units",
    "payment_key_sha256",
    "request_key_sha256",
    "canonical_payment_identity",
    "request_id",
    "instruction_id",
    "delivery_address",
  ] as const) {
    if (existing[key] !== record[key]) {
      throw new Error("paid_unreservable_obligation_identity_conflict");
    }
  }
  return existing;
}

function parseReservation(
  raw: Record<string, unknown>,
): BuyVoidInventoryReservationV1 {
  const reservationId = String(raw.reservation_id || "");
  const poolId = String(raw.pool_id || "");
  const paymentKey = String(raw.payment_key_sha256 || "");
  const instructionId = String(raw.instruction_id || "");
  const capacity = parsePositiveInteger(
    raw.pool_capacity_void_units,
  );
  const committedBefore = parseNonNegativeInteger(
    raw.committed_before_void_units,
  );
  const reserved = parsePositiveInteger(raw.reserved_void_units);
  const committedAfter = parsePositiveInteger(
    raw.committed_after_void_units,
  );
  const availableAfter = parseNonNegativeInteger(
    raw.available_after_void_units,
  );
  const expectedPoolKey = SAFE_CODE.test(poolId)
    ? sha256Hex(`void-buy-inventory-pool-v1\n${poolId}`)
    : "";
  const expectedReservationId =
    expectedPoolKey &&
    SHA256.test(paymentKey) &&
    SAFE_CODE.test(instructionId)
      ? sha256Hex(
          [
            "void-buy-inventory-reservation-v1",
            expectedPoolKey,
            paymentKey,
            instructionId,
          ].join("\n"),
        )
      : "";

  if (
    raw.schema !== "void_buy_void_inventory_reservation_v1" ||
    raw.marker !== VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1 ||
    !SHA256.test(reservationId) ||
    reservationId !== expectedReservationId ||
    !SAFE_CODE.test(poolId) ||
    !SAFE_CODE.test(String(raw.inventory_policy_version || "")) ||
    capacity === null ||
    committedBefore === null ||
    reserved === null ||
    committedAfter === null ||
    availableAfter === null ||
    committedBefore + reserved !== committedAfter ||
    committedAfter > capacity ||
    capacity - committedAfter !== availableAfter ||
    !Number.isSafeInteger(raw.reserved_at_ms) ||
    Number(raw.reserved_at_ms) <= 0 ||
    !SHA256.test(paymentKey) ||
    !SHA256.test(String(raw.request_key_sha256 || "")) ||
    !String(raw.canonical_payment_identity || "").trim() ||
    !SAFE_CODE.test(String(raw.request_id || "")) ||
    !SAFE_CODE.test(instructionId) ||
    !normalizeAddress(raw.delivery_address) ||
    !SHA256.test(String(raw.intent_fingerprint || "")) ||
    raw.reservation_status !== "reserved" ||
    raw.inventory_decrement_performed !== false ||
    raw.reservation_release_authorized !== false ||
    raw.execution_authorized_by_this_module !== false ||
    raw.signing_authorized_by_this_module !== false ||
    raw.transaction_broadcast_authorized_by_this_module !== false ||
    raw.money_movement_authorized_by_this_module !== false
  ) {
    throw new Error("invalid_inventory_reservation_record");
  }
  return raw as BuyVoidInventoryReservationV1;
}

function listReservationsFromPaths(
  paths: BuyVoidInventoryReservationJournalPathsV1,
): BuyVoidInventoryReservationV1[] {
  if (!fs.existsSync(paths.reservations_dir)) return [];

  const output: BuyVoidInventoryReservationV1[] = [];
  for (const name of fs.readdirSync(paths.reservations_dir).sort()) {
    if (!/^[0-9a-f]{64}\.json$/.test(name)) continue;
    const raw = readJsonObject(path.join(paths.reservations_dir, name));
    if (!raw) continue;
    output.push(parseReservation(raw));
  }

  output.sort((left, right) =>
    left.reservation_id.localeCompare(right.reservation_id),
  );
  return output;
}

export function listBuyVoidInventoryReservationsV1(input: {
  root_dir: string;
  pool_id: string;
}): BuyVoidInventoryReservationV1[] {
  return listReservationsFromPaths(
    buyVoidInventoryReservationJournalPathsV1(
      input.root_dir,
      input.pool_id,
    ),
  );
}

export function listBuyVoidPaidUnreservableObligationsV1(input: {
  root_dir: string;
  pool_id: string;
}): BuyVoidPaidUnreservableObligationV1[] {
  const paths = buyVoidInventoryReservationJournalPathsV1(
    input.root_dir,
    input.pool_id,
  );
  if (!fs.existsSync(paths.holds_dir)) return [];
  const output: BuyVoidPaidUnreservableObligationV1[] = [];
  for (const name of fs.readdirSync(paths.holds_dir).sort()) {
    if (!/^[0-9a-f]{64}\.json$/.test(name)) continue;
    const raw = readJsonObject(path.join(paths.holds_dir, name));
    if (!raw) continue;
    output.push(parsePaidUnreservableObligation(raw));
  }
  output.sort((left, right) =>
    left.obligation_id.localeCompare(right.obligation_id),
  );
  return output;
}

function aggregateFor(
  policy: NormalizedPolicyV1,
  reservations: BuyVoidInventoryReservationV1[],
): BuyVoidInventoryAggregateV1 {
  let committed = 0n;
  for (const reservation of reservations) {
    if (
      reservation.pool_id !== policy.pool_id ||
      reservation.inventory_policy_version !==
        policy.inventory_policy_version ||
      reservation.pool_capacity_void_units !==
        policy.capacity.toString()
    ) {
      throw new Error("inventory_policy_changed");
    }
    committed += BigInt(reservation.reserved_void_units);
  }
  if (committed > policy.capacity) {
    throw new Error("inventory_underflow");
  }

  const available = policy.capacity - committed;
  return {
    schema: "void_buy_void_inventory_aggregate_v1",
    marker: VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1,
    pool_id: policy.pool_id,
    inventory_policy_version: policy.inventory_policy_version,
    pool_capacity_void_units: policy.capacity.toString(),
    committed_void_units: committed.toString(),
    available_void_units: available.toString(),
    reservation_count: reservations.length,
    sold_out: available === 0n,
  };
}

function acquirePoolLock(
  paths: BuyVoidInventoryReservationJournalPathsV1,
): { ok: true } | { ok: false; reason: string } {
  ensurePrivateDir(paths.pool_dir);
  try {
    fs.mkdirSync(paths.lock_dir, { mode: 0o700 });
    fs.writeFileSync(
      path.join(paths.lock_dir, "owner.json"),
      `${JSON.stringify({
        pid: process.pid,
        acquired_at_ms: Date.now(),
      }, null, 2)}\n`,
      { encoding: "utf8", mode: 0o600 },
    );
    fsyncDir(paths.pool_dir);
    return { ok: true };
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "EEXIST") {
      return { ok: false, reason: "inventory_reservation_busy" };
    }
    throw error;
  }
}

function releasePoolLock(
  paths: BuyVoidInventoryReservationJournalPathsV1,
): void {
  try {
    fs.rmSync(paths.lock_dir, { recursive: true, force: true });
    fsyncDir(paths.pool_dir);
  } catch {
    // A leftover lock is fail-closed and requires operator review.
  }
}

function evaluateReservation(
  intent: BuyVoidFulfillmentJournalIntentV1,
  intentCheck: {
    amount: bigint;
    intent_fingerprint: string;
  },
  policy: NormalizedPolicyV1,
  reservations: BuyVoidInventoryReservationV1[],
  nowMs: number,
):
  | {
      ok: true;
      duplicate: boolean;
      reservation: BuyVoidInventoryReservationV1;
      aggregate_before: BuyVoidInventoryAggregateV1;
      aggregate_after: BuyVoidInventoryAggregateV1;
    }
  | {
      ok: false;
      reason: string;
      detail?: Record<string, unknown>;
    } {
  let aggregateBefore: BuyVoidInventoryAggregateV1;
  try {
    aggregateBefore = aggregateFor(policy, reservations);
  } catch (error) {
    return {
      ok: false,
      reason: String((error as Error)?.message || error),
    };
  }

  const reservationId = reservationIdFor(policy, intent);
  const sameId = reservations.find(
    (item) => item.reservation_id === reservationId,
  );
  if (sameId) {
    if (
      sameId.payment_key_sha256 !== intent.payment_key_sha256 ||
      sameId.request_key_sha256 !== intent.request_key_sha256 ||
      sameId.canonical_payment_identity !==
        intent.claim.canonical_payment_identity ||
      sameId.request_id !== intent.claim.request_id ||
      sameId.instruction_id !== intent.claim.instruction_id ||
      sameId.delivery_address !==
        String(
          intent.claim.unsigned_instruction.delivery_address,
        ).toLowerCase() ||
      sameId.reserved_void_units !== intentCheck.amount.toString() ||
      sameId.intent_fingerprint !==
        intentCheck.intent_fingerprint
    ) {
      return {
        ok: false,
        reason: "inventory_reservation_identity_conflict",
      };
    }

    return {
      ok: true,
      duplicate: true,
      reservation: sameId,
      aggregate_before: aggregateBefore,
      aggregate_after: aggregateBefore,
    };
  }

  const conflict = reservations.find((item) =>
    item.payment_key_sha256 === intent.payment_key_sha256 ||
    item.request_key_sha256 === intent.request_key_sha256 ||
    item.canonical_payment_identity ===
      intent.claim.canonical_payment_identity ||
    item.request_id === intent.claim.request_id ||
    item.instruction_id === intent.claim.instruction_id
  );
  if (conflict) {
    return {
      ok: false,
      reason: "inventory_reservation_claim_conflict",
      detail: {
        existing_reservation_id: conflict.reservation_id,
      },
    };
  }

  if (intentCheck.amount > policy.max_reservation) {
    return {
      ok: false,
      reason: "inventory_reservation_amount_exceeds_policy",
      detail: {
        requested_void_units: intentCheck.amount.toString(),
        max_reservation_void_units:
          policy.max_reservation.toString(),
      },
    };
  }

  const committedBefore = BigInt(
    aggregateBefore.committed_void_units,
  );
  const committedAfter = committedBefore + intentCheck.amount;
  if (committedAfter > policy.capacity) {
    return {
      ok: false,
      reason: aggregateBefore.sold_out
        ? "inventory_sold_out"
        : "insufficient_void_inventory",
      detail: {
        requested_void_units: intentCheck.amount.toString(),
        available_void_units:
          aggregateBefore.available_void_units,
      },
    };
  }

  const availableAfter = policy.capacity - committedAfter;
  const reservation: BuyVoidInventoryReservationV1 = {
    schema: "void_buy_void_inventory_reservation_v1",
    marker: VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1,
    reservation_id: reservationId,
    reserved_at_ms: nowMs,
    pool_id: policy.pool_id,
    inventory_policy_version:
      policy.inventory_policy_version,
    pool_capacity_void_units: policy.capacity.toString(),
    committed_before_void_units: committedBefore.toString(),
    reserved_void_units: intentCheck.amount.toString(),
    committed_after_void_units: committedAfter.toString(),
    available_after_void_units: availableAfter.toString(),
    payment_key_sha256: intent.payment_key_sha256,
    request_key_sha256: intent.request_key_sha256,
    canonical_payment_identity:
      intent.claim.canonical_payment_identity,
    request_id: intent.claim.request_id,
    instruction_id: intent.claim.instruction_id,
    delivery_address: String(
      intent.claim.unsigned_instruction.delivery_address,
    ).toLowerCase(),
    intent_fingerprint: intentCheck.intent_fingerprint,
    reservation_status: "reserved",
    inventory_decrement_performed: false,
    reservation_release_authorized: false,
    execution_authorized_by_this_module: false,
    signing_authorized_by_this_module: false,
    transaction_broadcast_authorized_by_this_module: false,
    money_movement_authorized_by_this_module: false,
  };

  const aggregateAfter: BuyVoidInventoryAggregateV1 = {
    ...aggregateBefore,
    committed_void_units: committedAfter.toString(),
    available_void_units: availableAfter.toString(),
    reservation_count: aggregateBefore.reservation_count + 1,
    sold_out: availableAfter === 0n,
  };

  return {
    ok: true,
    duplicate: false,
    reservation,
    aggregate_before: aggregateBefore,
    aggregate_after: aggregateAfter,
  };
}

export function reserveBuyVoidInventoryV1(
  input: ReserveBuyVoidInventoryInputV1,
): BuyVoidInventoryReservationDecisionV1 {
  let paths: BuyVoidInventoryReservationJournalPathsV1;
  try {
    paths = buyVoidInventoryReservationJournalPathsV1(
      input?.root_dir,
      input?.policy?.pool_id,
    );
  } catch (error) {
    return held(
      input?.apply === true,
      String((error as Error)?.message || error),
    );
  }

  const intentCheck = validateIntent(input?.intent);
  if ("reason" in intentCheck) {
    return held(
      input?.apply === true,
      intentCheck.reason,
    );
  }

  const policyCheck = normalizePolicy(input?.policy);
  if ("reason" in policyCheck) {
    return held(
      input?.apply === true,
      policyCheck.reason,
    );
  }
  const policy = policyCheck.policy;
  const nowMs = safeNow(input?.now_ms);

  if (input?.apply !== true) {
    try {
      const reservations = listReservationsFromPaths(paths);
      const evaluated = evaluateReservation(
        input.intent,
        intentCheck,
        policy,
        reservations,
        nowMs,
      );
      if ("reason" in evaluated) {
        return held(false, evaluated.reason, evaluated.detail);
      }
      return {
        ok: true,
        status: "available",
        applied: false,
        duplicate: evaluated.duplicate,
        new_reservation: false,
        reservation: evaluated.reservation,
        aggregate: evaluated.aggregate_after,
      };
    } catch (error) {
      return held(
        false,
        "inventory_reservation_preview_failed",
        {
          message: String((error as Error)?.message || error),
        },
      );
    }
  }

  const lock = acquirePoolLock(paths);
  if ("reason" in lock) return held(true, lock.reason);

  try {
    ensurePrivateDir(paths.reservations_dir);
    ensurePrivateDir(paths.holds_dir);

    const reservations = listReservationsFromPaths(paths);
    const evaluated = evaluateReservation(
      input.intent,
      intentCheck,
      policy,
      reservations,
      nowMs,
    );
    if ("reason" in evaluated) {
      if (
        evaluated.reason === "inventory_sold_out" ||
        evaluated.reason === "insufficient_void_inventory"
      ) {
        try {
          const obligation = recordPaidUnreservableObligation(
            paths,
            input.intent,
            policy,
            evaluated.reason,
            String(evaluated.detail?.available_void_units || "0"),
            intentCheck.amount.toString(),
            nowMs,
          );
          return held(true, evaluated.reason, {
            ...(evaluated.detail || {}),
            terminal_recovery_obligation_recorded: true,
            terminal_recovery_obligation_id: obligation.obligation_id,
            terminal_recovery_state: obligation.terminal_state,
            confirmed_payment_stranded: false,
            automatic_retry: false,
          });
        } catch (error) {
          return held(true, "paid_unreservable_obligation_write_failed", {
            reservation_failure_reason: evaluated.reason,
            message: String((error as Error)?.message || error),
          });
        }
      }
      return held(true, evaluated.reason, evaluated.detail);
    }
    if (evaluated.duplicate) {
      return {
        ok: true,
        status: "duplicate",
        applied: true,
        duplicate: true,
        new_reservation: false,
        reservation: evaluated.reservation,
        aggregate: evaluated.aggregate_after,
      };
    }

    const file = reservationFile(
      paths,
      evaluated.reservation.reservation_id,
    );
    const created = atomicCreateJson(
      file,
      evaluated.reservation,
    );
    if (created === "exists") {
      const existingRaw = readJsonObject(file);
      if (!existingRaw) {
        return held(
          true,
          "inventory_reservation_race_unreadable",
        );
      }
      const existing = parseReservation(existingRaw);
      if (
        existing.intent_fingerprint !==
          evaluated.reservation.intent_fingerprint
      ) {
        return held(
          true,
          "inventory_reservation_race_conflict",
        );
      }
      const current = aggregateFor(
        policy,
        listReservationsFromPaths(paths),
      );
      return {
        ok: true,
        status: "duplicate",
        applied: true,
        duplicate: true,
        new_reservation: false,
        reservation: existing,
        aggregate: current,
      };
    }

    const current = aggregateFor(
      policy,
      listReservationsFromPaths(paths),
    );
    return {
      ok: true,
      status: "reserved",
      applied: true,
      duplicate: false,
      new_reservation: true,
      reservation: evaluated.reservation,
      aggregate: current,
    };
  } catch (error) {
    return held(
      true,
      "inventory_reservation_write_failed",
      {
        message: String((error as Error)?.message || error),
      },
    );
  } finally {
    releasePoolLock(paths);
  }
}
