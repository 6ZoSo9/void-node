import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  VOID_BUY_VOID_FULFILLMENT_CONFIRMATION_V1,
  type BuyVoidConfirmedFulfillmentRecordV1,
} from "./buy_void_fulfillment_confirmation_v1.js";
import {
  VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1,
  type BuyVoidFulfillmentJournalIntentV1,
} from "./buy_void_fulfillment_journal_v1.js";

export const VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_V1 =
  "VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_V1";

export const VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_AUTHORITY_V1 = {
  filesystem_read: true,
  filesystem_write: true,
  confirmed_state_persistence: true,
  payment_index_persistence: true,
  request_index_persistence: true,
  delivery_tx_index_persistence: true,
  rpc_call: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  runtime_route_mount: false,
  money_movement: false,
} as const;

const ADDRESS = /^0x[0-9a-f]{40}$/;
const HEX_32 = /^0x[0-9a-f]{64}$/;
const SHA256 = /^[0-9a-f]{64}$/;

export type BuyVoidConfirmedStateJournalPathsV1 = {
  root_dir: string;
  journal_dir: string;
  candidates_dir: string;
  complete_dir: string;
  payments_dir: string;
  requests_dir: string;
  deliveries_dir: string;
  holds_dir: string;
};

export type BuyVoidConfirmedStateV1 = {
  schema: "void_buy_void_confirmed_state_v1";
  marker: typeof VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_V1;
  state_id: string;
  persisted_at_ms: number;
  payment_key_sha256: string;
  request_key_sha256: string;
  delivery_key_sha256: string;
  canonical_payment_identity: string;
  request_id: string;
  instruction_id: string;
  confirmation: BuyVoidConfirmedFulfillmentRecordV1;
  buyer_status: {
    schema: "void_buy_void_buyer_fulfilled_status_v1";
    status: "fulfilled_confirmed";
    request_id: string;
    delivery_address: string;
    void_delivery_tx_hash: string;
    buyer_fulfilled: true;
  };
  allocation_status: {
    schema: "void_buy_void_allocation_fulfilled_status_v1";
    status: "fulfilled_confirmed";
    canonical_payment_identity: string;
    request_id: string;
    reserved_void_units: string;
    delivered_void_units: string;
    allocation_fulfilled: true;
  };
  fulfillment_receipt: {
    schema: "void_buy_void_fulfillment_receipt_v1";
    status: "confirmed";
    delivery_chain_id: string;
    void_delivery_tx_hash: string;
    delivery_block_number: string;
    delivery_block_hash?: string;
    delivery_confirmation_count: string;
    fulfillment_wallet: string;
    delivery_address: string;
    void_amount_units: string;
  };
  projection_fingerprint: string;
  signing_authorized_by_this_module: false;
  transaction_broadcast_authorized_by_this_module: false;
  money_movement_authorized_by_this_module: false;
};

export type BuyVoidConfirmedStateIndexV1 = {
  schema: "void_buy_void_confirmed_state_index_v1";
  marker: typeof VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_V1;
  index_kind: "payment" | "request" | "delivery";
  key_sha256: string;
  state_id: string;
  canonical_payment_identity: string;
  request_id: string;
  instruction_id: string;
  void_delivery_tx_hash: string;
};

export type BuyVoidConfirmedStateCompletionV1 = {
  schema: "void_buy_void_confirmed_state_completion_v1";
  marker: typeof VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_V1;
  state_id: string;
  completed_at_ms: number;
  payment_key_sha256: string;
  request_key_sha256: string;
  delivery_key_sha256: string;
  projection_fingerprint: string;
  final: true;
};

export type PersistBuyVoidConfirmedStateInputV1 = {
  root_dir: string;
  intent: BuyVoidFulfillmentJournalIntentV1;
  confirmed_record: BuyVoidConfirmedFulfillmentRecordV1;
  now_ms?: number;
};

export type BuyVoidConfirmedStateJournalDecisionV1 =
  | {
      ok: true;
      status: "persisted";
      duplicate: false;
      new_state: true;
      recovered_indexes: string[];
      recovered_completion: false;
      state: BuyVoidConfirmedStateV1;
      completion: BuyVoidConfirmedStateCompletionV1;
    }
  | {
      ok: true;
      status: "duplicate";
      duplicate: true;
      new_state: false;
      recovered_indexes: string[];
      recovered_completion: boolean;
      state: BuyVoidConfirmedStateV1;
      completion: BuyVoidConfirmedStateCompletionV1;
    }
  | {
      ok: false;
      status: "held";
      duplicate: false;
      new_state: boolean;
      recovered_indexes: string[];
      recovered_completion: false;
      reason: string;
      detail?: Record<string, unknown>;
    };

function held(
  reason: string,
  detail?: Record<string, unknown>,
  newState = false,
  recoveredIndexes: string[] = [],
): BuyVoidConfirmedStateJournalDecisionV1 {
  return {
    ok: false,
    status: "held",
    duplicate: false,
    new_state: newState,
    recovered_indexes: recoveredIndexes,
    recovered_completion: false,
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

function normalizeAddress(value: unknown): string {
  const address = String(value || "").trim().toLowerCase();
  return ADDRESS.test(address) ? address : "";
}

function normalizeHash(value: unknown): string {
  const hash = String(value || "").trim().toLowerCase();
  return HEX_32.test(hash) ? hash : "";
}

function parseNonNegativeInteger(value: unknown): bigint | null {
  if (typeof value === "bigint") return value >= 0n ? value : null;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) return null;
    return BigInt(value);
  }
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;
  try {
    if (/^0x[0-9a-f]+$/.test(raw) || /^[0-9]+$/.test(raw)) {
      const n = BigInt(raw);
      return n >= 0n ? n : null;
    }
  } catch {
    return null;
  }
  return null;
}

function safeNow(value: unknown): number {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : Date.now();
}

function validateRoot(rootDir: unknown): string {
  const raw = String(rootDir || "").trim();
  if (!raw || raw.includes("\0")) throw new Error("invalid_confirmed_state_root");
  return path.resolve(raw);
}

export function buyVoidConfirmedStateJournalPathsV1(
  rootDir: string,
): BuyVoidConfirmedStateJournalPathsV1 {
  const root = validateRoot(rootDir);
  const journalDir = path.join(root, "buy-void-confirmed-state-v1");
  return {
    root_dir: root,
    journal_dir: journalDir,
    candidates_dir: path.join(journalDir, "candidates"),
    complete_dir: path.join(journalDir, "complete"),
    payments_dir: path.join(journalDir, "payments"),
    requests_dir: path.join(journalDir, "requests"),
    deliveries_dir: path.join(journalDir, "deliveries"),
    holds_dir: path.join(journalDir, "holds"),
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
  let fd: number | null = null;
  try {
    fd = fs.openSync(dir, "r");
    fs.fsyncSync(fd);
  } catch {
    // Directory fsync is unavailable on some filesystems.
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }
}

function writeTempJson(parentDir: string, basename: string, value: unknown): string {
  ensurePrivateDir(parentDir);
  const temp = path.join(
    parentDir,
    `.${basename}.tmp-${process.pid}-${crypto.randomBytes(8).toString("hex")}`,
  );
  const fd = fs.openSync(temp, "wx", 0o600);
  try {
    fs.writeFileSync(fd, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  return temp;
}

function atomicCreateJson(file: string, value: unknown): "created" | "exists" {
  const parent = path.dirname(file);
  const temp = writeTempJson(parent, path.basename(file), value);
  try {
    try {
      fs.linkSync(temp, file);
    } catch (error) {
      const code = String((error as NodeJS.ErrnoException)?.code || "");
      if (code === "EEXIST") return "exists";
      throw error;
    }
    fsyncDir(parent);
    return "created";
  } finally {
    try {
      fs.unlinkSync(temp);
    } catch {
      // The published hard link remains durable.
    }
  }
}

function readJsonObject(file: string): Record<string, any> | null {
  if (!fs.existsSync(file)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(
      `confirmed_state_corrupt_json:${file}:${String((error as Error)?.message || error)}`,
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`confirmed_state_corrupt_shape:${file}`);
  }
  return parsed as Record<string, any>;
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

function candidateFile(paths: BuyVoidConfirmedStateJournalPathsV1, stateId: string): string {
  return path.join(paths.candidates_dir, `${stateId}.json`);
}

function completionFile(paths: BuyVoidConfirmedStateJournalPathsV1, stateId: string): string {
  return path.join(paths.complete_dir, `${stateId}.json`);
}

function indexFile(
  paths: BuyVoidConfirmedStateJournalPathsV1,
  kind: BuyVoidConfirmedStateIndexV1["index_kind"],
  key: string,
): string {
  const dir =
    kind === "payment"
      ? paths.payments_dir
      : kind === "request"
        ? paths.requests_dir
        : paths.deliveries_dir;
  return path.join(dir, `${key}.json`);
}

function holdFile(paths: BuyVoidConfirmedStateJournalPathsV1, stateId: string): string {
  return path.join(paths.holds_dir, `${stateId}.json`);
}

function parseState(value: Record<string, any>): BuyVoidConfirmedStateV1 {
  if (
    value.schema !== "void_buy_void_confirmed_state_v1" ||
    value.marker !== VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_V1 ||
    !SHA256.test(String(value.state_id || "")) ||
    !value.confirmation ||
    !value.buyer_status ||
    !value.allocation_status ||
    !value.fulfillment_receipt
  ) {
    throw new Error("confirmed_state_corrupt_candidate");
  }
  return value as BuyVoidConfirmedStateV1;
}

function parseIndex(value: Record<string, any>): BuyVoidConfirmedStateIndexV1 {
  if (
    value.schema !== "void_buy_void_confirmed_state_index_v1" ||
    value.marker !== VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_V1 ||
    !["payment", "request", "delivery"].includes(String(value.index_kind || "")) ||
    !SHA256.test(String(value.key_sha256 || "")) ||
    !SHA256.test(String(value.state_id || ""))
  ) {
    throw new Error("confirmed_state_corrupt_index");
  }
  return value as BuyVoidConfirmedStateIndexV1;
}

function parseCompletion(
  value: Record<string, any>,
): BuyVoidConfirmedStateCompletionV1 {
  if (
    value.schema !== "void_buy_void_confirmed_state_completion_v1" ||
    value.marker !== VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_V1 ||
    value.final !== true ||
    !SHA256.test(String(value.state_id || "")) ||
    !SHA256.test(String(value.projection_fingerprint || ""))
  ) {
    throw new Error("confirmed_state_corrupt_completion");
  }
  return value as BuyVoidConfirmedStateCompletionV1;
}

function validateAndBuildState(
  input: PersistBuyVoidConfirmedStateInputV1,
): { ok: true; state: BuyVoidConfirmedStateV1 } | { ok: false; reason: string; detail?: Record<string, unknown> } {
  const intent = input?.intent;
  const record = input?.confirmed_record;
  if (!intent || !record) return { ok: false, reason: "missing_input" };

  if (
    intent.schema !== "void_buy_void_fulfillment_journal_intent_v1" ||
    intent.marker !== VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1
  ) {
    return { ok: false, reason: "invalid_fulfillment_intent" };
  }
  if (
    intent.signing_authorized !== false ||
    intent.transaction_broadcast_authorized !== false ||
    intent.money_movement_authorized !== false
  ) {
    return { ok: false, reason: "intent_authority_boundary_violation" };
  }
  if (
    record.schema !== "void_buy_void_confirmed_fulfillment_record_v1" ||
    record.marker !== VOID_BUY_VOID_FULFILLMENT_CONFIRMATION_V1 ||
    record.status !== "fulfilled_confirmed"
  ) {
    return { ok: false, reason: "invalid_confirmation_record" };
  }
  if (
    record.buyer_fulfilled !== true ||
    record.automatic_fulfillment_completed !== true ||
    record.payment_claim_persisted !== true ||
    record.delivery_confirmation_observed !== true
  ) {
    return { ok: false, reason: "confirmation_truth_flags_missing" };
  }
  if (
    record.signing_authorized_by_this_module !== false ||
    record.transaction_broadcast_authorized_by_this_module !== false ||
    record.money_movement_authorized_by_this_module !== false
  ) {
    return { ok: false, reason: "confirmation_authority_boundary_violation" };
  }

  const claim = intent.claim;
  const instruction = claim?.unsigned_instruction;
  if (
    claim?.schema !== "void_buy_void_fulfillment_claim_v1" ||
    claim?.status !== "claimed" ||
    !instruction ||
    instruction.schema !== "void_buy_void_unsigned_fulfillment_instruction_v1"
  ) {
    return { ok: false, reason: "invalid_claim_shape" };
  }

  const deliveryTx = normalizeHash(record.void_delivery_tx_hash);
  const paymentTx = normalizeHash(record.payment_transaction_hash);
  const fulfillmentWallet = normalizeAddress(record.fulfillment_wallet);
  const deliveryAddress = normalizeAddress(record.delivery_address);
  const amountUnits = parseNonNegativeInteger(record.void_amount_units);
  const blockNumber = parseNonNegativeInteger(record.delivery_block_number);
  const deliveryBlockHashSupplied =
    record.delivery_block_hash !== undefined &&
    record.delivery_block_hash !== null &&
    String(record.delivery_block_hash).trim() !== "";
  const deliveryBlockHash = deliveryBlockHashSupplied
    ? normalizeHash(record.delivery_block_hash)
    : "";
  const confirmations = parseNonNegativeInteger(record.delivery_confirmation_count);
  const deliveryChainId = parseNonNegativeInteger(record.delivery_chain_id);
  const paymentLogIndex = parseNonNegativeInteger(record.payment_log_index);

  if (!deliveryTx || !paymentTx || deliveryTx === paymentTx) {
    return { ok: false, reason: "invalid_delivery_payment_hash_binding" };
  }
  if (deliveryBlockHashSupplied && !deliveryBlockHash) {
    return { ok: false, reason: "invalid_delivery_block_hash_binding" };
  }
  if (!fulfillmentWallet || !deliveryAddress) {
    return { ok: false, reason: "invalid_delivery_address_binding" };
  }
  if (
    amountUnits === null ||
    amountUnits <= 0n ||
    blockNumber === null ||
    blockNumber <= 0n ||
    confirmations === null ||
    confirmations <= 0n ||
    deliveryChainId === null ||
    deliveryChainId <= 0n ||
    paymentLogIndex === null
  ) {
    return { ok: false, reason: "invalid_confirmation_numeric_binding" };
  }

  const bindings: Array<[boolean, string]> = [
    [
      record.canonical_payment_identity === claim.canonical_payment_identity,
      "canonical_payment_identity_mismatch",
    ],
    [
      record.canonical_payment_identity_sha256 ===
        claim.canonical_payment_identity_sha256,
      "canonical_payment_identity_hash_mismatch",
    ],
    [record.request_id === claim.request_id, "request_id_mismatch"],
    [record.instruction_id === claim.instruction_id, "instruction_id_mismatch"],
    [
      String(record.source_payment_chain || "").toLowerCase() ===
        instruction.source_chain,
      "source_payment_chain_mismatch",
    ],
    [
      paymentTx === normalizeHash(instruction.payment_transaction_hash),
      "payment_transaction_hash_mismatch",
    ],
    [
      paymentLogIndex.toString() === instruction.payment_log_index,
      "payment_log_index_mismatch",
    ],
    [
      deliveryAddress === normalizeAddress(instruction.delivery_address),
      "delivery_address_mismatch",
    ],
    [
      amountUnits.toString() === instruction.void_amount_units,
      "void_amount_units_mismatch",
    ],
  ];
  for (const [condition, reason] of bindings) {
    if (!condition) return { ok: false, reason };
  }

  if (
    sha256Hex(record.canonical_payment_identity) !==
    record.canonical_payment_identity_sha256
  ) {
    return { ok: false, reason: "canonical_payment_identity_hash_invalid" };
  }

  const expectedDeliveryFingerprint = stableFingerprint({
    canonical_payment_identity: record.canonical_payment_identity,
    request_id: record.request_id,
    instruction_id: record.instruction_id,
    delivery_chain_id: deliveryChainId.toString(),
    void_delivery_tx_hash: deliveryTx,
    delivery_block_number: blockNumber.toString(),
    ...(deliveryBlockHash
      ? { delivery_block_hash: deliveryBlockHash }
      : {}),
    fulfillment_wallet: fulfillmentWallet,
    delivery_address: deliveryAddress,
    void_amount_units: amountUnits.toString(),
  });
  if (expectedDeliveryFingerprint !== record.delivery_binding_fingerprint) {
    return { ok: false, reason: "delivery_binding_fingerprint_mismatch" };
  }

  const paymentKeyValue = paymentKey(record.canonical_payment_identity);
  const requestKeyValue = requestKey(record.request_id);
  const deliveryKeyValue = deliveryKey(deliveryTx);
  const stateId = stableFingerprint({
    canonical_payment_identity: record.canonical_payment_identity,
    request_id: record.request_id,
    instruction_id: record.instruction_id,
    void_delivery_tx_hash: deliveryTx,
  });

  const buyerStatus = {
    schema: "void_buy_void_buyer_fulfilled_status_v1" as const,
    status: "fulfilled_confirmed" as const,
    request_id: record.request_id,
    delivery_address: deliveryAddress,
    void_delivery_tx_hash: deliveryTx,
    buyer_fulfilled: true as const,
  };
  const allocationStatus = {
    schema: "void_buy_void_allocation_fulfilled_status_v1" as const,
    status: "fulfilled_confirmed" as const,
    canonical_payment_identity: record.canonical_payment_identity,
    request_id: record.request_id,
    reserved_void_units: instruction.void_amount_units,
    delivered_void_units: amountUnits.toString(),
    allocation_fulfilled: true as const,
  };
  const fulfillmentReceipt = {
    schema: "void_buy_void_fulfillment_receipt_v1" as const,
    status: "confirmed" as const,
    delivery_chain_id: deliveryChainId.toString(),
    void_delivery_tx_hash: deliveryTx,
    delivery_block_number: blockNumber.toString(),
    ...(deliveryBlockHash
      ? { delivery_block_hash: deliveryBlockHash }
      : {}),
    delivery_confirmation_count: confirmations.toString(),
    fulfillment_wallet: fulfillmentWallet,
    delivery_address: deliveryAddress,
    void_amount_units: amountUnits.toString(),
  };

  const projectionFingerprint = stableFingerprint({
    state_id: stateId,
    canonical_payment_identity: record.canonical_payment_identity,
    request_id: record.request_id,
    instruction_id: record.instruction_id,
    void_delivery_tx_hash: deliveryTx,
    delivery_address: deliveryAddress,
    void_amount_units: amountUnits.toString(),
    delivery_block_number: blockNumber.toString(),
    ...(deliveryBlockHash
      ? { delivery_block_hash: deliveryBlockHash }
      : {}),
    delivery_chain_id: deliveryChainId.toString(),
  });

  return {
    ok: true,
    state: {
      schema: "void_buy_void_confirmed_state_v1",
      marker: VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_V1,
      state_id: stateId,
      persisted_at_ms: safeNow(input.now_ms),
      payment_key_sha256: paymentKeyValue,
      request_key_sha256: requestKeyValue,
      delivery_key_sha256: deliveryKeyValue,
      canonical_payment_identity: record.canonical_payment_identity,
      request_id: record.request_id,
      instruction_id: record.instruction_id,
      confirmation: record,
      buyer_status: buyerStatus,
      allocation_status: allocationStatus,
      fulfillment_receipt: fulfillmentReceipt,
      projection_fingerprint: projectionFingerprint,
      signing_authorized_by_this_module: false,
      transaction_broadcast_authorized_by_this_module: false,
      money_movement_authorized_by_this_module: false,
    },
  };
}

function stateCompatibility(
  attempted: BuyVoidConfirmedStateV1,
  existing: BuyVoidConfirmedStateV1,
): { ok: true } | { ok: false; reason: string; detail?: Record<string, unknown> } {
  const exactFields: Array<[unknown, unknown, string]> = [
    [attempted.state_id, existing.state_id, "state_id_conflict"],
    [
      attempted.canonical_payment_identity,
      existing.canonical_payment_identity,
      "canonical_payment_identity_conflict",
    ],
    [attempted.request_id, existing.request_id, "request_id_conflict"],
    [attempted.instruction_id, existing.instruction_id, "instruction_id_conflict"],
    [
      attempted.confirmation.void_delivery_tx_hash,
      existing.confirmation.void_delivery_tx_hash,
      "delivery_tx_conflict",
    ],
    [
      attempted.projection_fingerprint,
      existing.projection_fingerprint,
      "projection_fingerprint_conflict",
    ],
  ];
  for (const [left, right, reason] of exactFields) {
    if (left !== right) return { ok: false, reason };
  }

  const attemptedConfirmations = parseNonNegativeInteger(
    attempted.confirmation.delivery_confirmation_count,
  );
  const existingConfirmations = parseNonNegativeInteger(
    existing.confirmation.delivery_confirmation_count,
  );
  if (
    attemptedConfirmations === null ||
    existingConfirmations === null ||
    attemptedConfirmations < existingConfirmations
  ) {
    return {
      ok: false,
      reason: "delivery_confirmation_count_regression",
      detail: {
        persisted_confirmation_count:
          existingConfirmations === null ? "invalid" : existingConfirmations.toString(),
        attempted_confirmation_count:
          attemptedConfirmations === null ? "invalid" : attemptedConfirmations.toString(),
      },
    };
  }

  return { ok: true };
}

function indexFor(
  state: BuyVoidConfirmedStateV1,
  kind: BuyVoidConfirmedStateIndexV1["index_kind"],
): BuyVoidConfirmedStateIndexV1 {
  const key =
    kind === "payment"
      ? state.payment_key_sha256
      : kind === "request"
        ? state.request_key_sha256
        : state.delivery_key_sha256;
  return {
    schema: "void_buy_void_confirmed_state_index_v1",
    marker: VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_V1,
    index_kind: kind,
    key_sha256: key,
    state_id: state.state_id,
    canonical_payment_identity: state.canonical_payment_identity,
    request_id: state.request_id,
    instruction_id: state.instruction_id,
    void_delivery_tx_hash: state.confirmation.void_delivery_tx_hash,
  };
}

function completionFor(
  state: BuyVoidConfirmedStateV1,
  nowMs: number,
): BuyVoidConfirmedStateCompletionV1 {
  return {
    schema: "void_buy_void_confirmed_state_completion_v1",
    marker: VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_V1,
    state_id: state.state_id,
    completed_at_ms: nowMs,
    payment_key_sha256: state.payment_key_sha256,
    request_key_sha256: state.request_key_sha256,
    delivery_key_sha256: state.delivery_key_sha256,
    projection_fingerprint: state.projection_fingerprint,
    final: true,
  };
}

function ensureIndex(
  paths: BuyVoidConfirmedStateJournalPathsV1,
  desired: BuyVoidConfirmedStateIndexV1,
): { ok: true; created: boolean } | { ok: false; reason: string; detail?: Record<string, unknown> } {
  const file = indexFile(paths, desired.index_kind, desired.key_sha256);
  const raw = readJsonObject(file);
  if (raw) {
    const existing = parseIndex(raw);
    if (
      existing.index_kind === desired.index_kind &&
      existing.key_sha256 === desired.key_sha256 &&
      existing.state_id === desired.state_id &&
      existing.canonical_payment_identity === desired.canonical_payment_identity &&
      existing.request_id === desired.request_id &&
      existing.instruction_id === desired.instruction_id &&
      existing.void_delivery_tx_hash === desired.void_delivery_tx_hash
    ) {
      return { ok: true, created: false };
    }
    return {
      ok: false,
      reason: `${desired.index_kind}_index_conflict`,
      detail: {
        existing_state_id: existing.state_id,
        attempted_state_id: desired.state_id,
      },
    };
  }

  const result = atomicCreateJson(file, desired);
  if (result === "created") return { ok: true, created: true };

  const racedRaw = readJsonObject(file);
  if (!racedRaw) {
    return { ok: false, reason: `${desired.index_kind}_index_race_unreadable` };
  }
  const raced = parseIndex(racedRaw);
  if (
    raced.state_id === desired.state_id &&
    raced.index_kind === desired.index_kind &&
    raced.key_sha256 === desired.key_sha256
  ) {
    return { ok: true, created: false };
  }
  return {
    ok: false,
    reason: `${desired.index_kind}_index_race_conflict`,
    detail: {
      existing_state_id: raced.state_id,
      attempted_state_id: desired.state_id,
    },
  };
}

function recordHold(
  paths: BuyVoidConfirmedStateJournalPathsV1,
  stateId: string,
  reason: string,
  detail?: Record<string, unknown>,
): void {
  try {
    atomicCreateJson(holdFile(paths, stateId), {
      schema: "void_buy_void_confirmed_state_hold_v1",
      marker: VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_V1,
      state_id: stateId,
      recorded_at_ms: Date.now(),
      reason,
      ...(detail ? { detail } : {}),
    });
  } catch {
    // Hold evidence is best effort.
  }
}

export function persistBuyVoidConfirmedStateV1(
  input: PersistBuyVoidConfirmedStateInputV1,
): BuyVoidConfirmedStateJournalDecisionV1 {
  let paths: BuyVoidConfirmedStateJournalPathsV1;
  try {
    paths = buyVoidConfirmedStateJournalPathsV1(input?.root_dir);
  } catch (error) {
    return held(String((error as Error)?.message || error));
  }

  try {
    const built = validateAndBuildState(input);
    if ("reason" in built) return held(built.reason, built.detail);
    const attempted = built.state;
    const candidatePath = candidateFile(paths, attempted.state_id);
    const completionPath = completionFile(paths, attempted.state_id);

    let state = attempted;
    let newState = false;
    const existingCandidateRaw = readJsonObject(candidatePath);
    if (existingCandidateRaw) {
      const existing = parseState(existingCandidateRaw);
      const compatible = stateCompatibility(attempted, existing);
      if ("reason" in compatible) {
        return held(compatible.reason, compatible.detail);
      }
      state = existing;
    } else {
      const created = atomicCreateJson(candidatePath, attempted);
      if (created === "created") {
        newState = true;
      } else {
        const racedRaw = readJsonObject(candidatePath);
        if (!racedRaw) return held("candidate_race_unreadable");
        const raced = parseState(racedRaw);
        const compatible = stateCompatibility(attempted, raced);
        if ("reason" in compatible) {
          return held(compatible.reason, compatible.detail);
        }
        state = raced;
      }
    }

    const completionBefore = readJsonObject(completionPath);
    let existingCompletion: BuyVoidConfirmedStateCompletionV1 | null = null;
    if (completionBefore) {
      existingCompletion = parseCompletion(completionBefore);
      if (
        existingCompletion.state_id !== state.state_id ||
        existingCompletion.payment_key_sha256 !== state.payment_key_sha256 ||
        existingCompletion.request_key_sha256 !== state.request_key_sha256 ||
        existingCompletion.delivery_key_sha256 !== state.delivery_key_sha256 ||
        existingCompletion.projection_fingerprint !== state.projection_fingerprint
      ) {
        return held("completion_conflict");
      }
    }

    const recoveredIndexes: string[] = [];
    for (const kind of ["payment", "request", "delivery"] as const) {
      const result = ensureIndex(paths, indexFor(state, kind));
      if ("reason" in result) {
        recordHold(paths, state.state_id, result.reason, result.detail);
        return held(result.reason, result.detail, newState, recoveredIndexes);
      }
      if (result.created && !newState) recoveredIndexes.push(kind);
    }

    let completion = existingCompletion;
    let recoveredCompletion = false;
    if (!completion) {
      const desired = completionFor(state, safeNow(input.now_ms));
      const created = atomicCreateJson(completionPath, desired);
      if (created === "created") {
        completion = desired;
        recoveredCompletion = !newState;
      } else {
        const racedRaw = readJsonObject(completionPath);
        if (!racedRaw) return held("completion_race_unreadable", undefined, newState, recoveredIndexes);
        completion = parseCompletion(racedRaw);
        if (
          completion.state_id !== state.state_id ||
          completion.projection_fingerprint !== state.projection_fingerprint
        ) {
          return held("completion_race_conflict", undefined, newState, recoveredIndexes);
        }
      }
    }

    if (newState) {
      return {
        ok: true,
        status: "persisted",
        duplicate: false,
        new_state: true,
        recovered_indexes: [],
        recovered_completion: false,
        state,
        completion,
      };
    }

    return {
      ok: true,
      status: "duplicate",
      duplicate: true,
      new_state: false,
      recovered_indexes: recoveredIndexes,
      recovered_completion: recoveredCompletion,
      state,
      completion,
    };
  } catch (error) {
    return held("confirmed_state_journal_failed", {
      message: String((error as Error)?.message || error),
    });
  }
}

export function readBuyVoidConfirmedStateByPaymentV1(input: {
  root_dir: string;
  canonical_payment_identity: string;
}): BuyVoidConfirmedStateV1 | null {
  const paths = buyVoidConfirmedStateJournalPathsV1(input.root_dir);
  const key = paymentKey(String(input.canonical_payment_identity || ""));
  const rawIndex = readJsonObject(indexFile(paths, "payment", key));
  if (!rawIndex) return null;
  const index = parseIndex(rawIndex);
  const rawCompletion = readJsonObject(completionFile(paths, index.state_id));
  if (!rawCompletion) return null;
  parseCompletion(rawCompletion);
  const rawState = readJsonObject(candidateFile(paths, index.state_id));
  return rawState ? parseState(rawState) : null;
}

export function listBuyVoidConfirmedStatesV1(
  rootDir: string,
): BuyVoidConfirmedStateV1[] {
  const paths = buyVoidConfirmedStateJournalPathsV1(rootDir);
  if (!fs.existsSync(paths.complete_dir)) return [];
  const out: BuyVoidConfirmedStateV1[] = [];
  for (const name of fs.readdirSync(paths.complete_dir).sort()) {
    if (!/^[0-9a-f]{64}\.json$/.test(name)) continue;
    const completionRaw = readJsonObject(path.join(paths.complete_dir, name));
    if (!completionRaw) continue;
    const completion = parseCompletion(completionRaw);
    const stateRaw = readJsonObject(candidateFile(paths, completion.state_id));
    if (!stateRaw) {
      throw new Error(`confirmed_state_missing_candidate:${completion.state_id}`);
    }
    out.push(parseState(stateRaw));
  }
  return out;
}
