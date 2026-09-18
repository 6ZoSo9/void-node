import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  withBuyVoidFilesystemBakeryLockV1,
} from "./buy_void_filesystem_bakery_lock_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CALL_V1,
  type BuyVoidPaymentKeyedFulfillmentCallReadyV1,
} from "./buy_void_payment_keyed_fulfillment_call_v1.js";
import type {
  BuyVoidDeliveryTransactionPlanV1,
} from "./buy_void_delivery_sign_broadcast_adapter_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_PLAN_RESERVATION_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_PLAN_RESERVATION_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_PLAN_RESERVATION_AUTHORITY_V1 = {
  source_only_contract: true,
  one_wallet_nonce_per_reservation: true,
  wallet_scoped_nonce_allocation_lock: true,
  dead_nonce_allocation_claim_cleanup: true,
  immutable_nonce_claim: true,
  atomic_nonce_publication: true,
  crash_recoverable_attempt_index: true,
  concurrent_attempt_collision_safe: true,
  observed_pending_nonce_is_floor_only: true,
  reserved_nonce_below_observed_pending_fails_closed: true,
  exact_payment_keyed_fulfillment_call_bound: true,
  fulfillment_contract_target_bound: true,
  canonical_payment_identity_bound: true,
  canonical_payment_key_bound: true,
  exact_calldata_bound: true,
  exact_recipient_and_amount_bound: true,
  runtime_policy_fingerprint_bound: true,
  preparation_policy_fingerprint_bound: true,
  canonical_transaction_plan_fingerprint: true,
  nonce_release: false,
  rpc_call: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  raw_signed_transaction_input: false,
  raw_signed_transaction_persistence: false,
  runtime_route_mount: false,
  money_movement: false,
} as const;

const RECORD_SCHEMA =
  "void_buy_void_payment_keyed_plan_reservation_v1";
const INDEX_SCHEMA =
  "void_buy_void_payment_keyed_plan_attempt_index_v1";
const SHA256 = /^[0-9a-f]{64}$/;
const SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const PAYMENT_ID =
  /^voidpay1:(base|ethereum):(0x[0-9a-f]{64}):(0|[1-9][0-9]*)$/;
const DECIMAL = /^(0|[1-9][0-9]*)$/;
const NONCE_FILE = /^[0-9]{16}\.json$/;
const MAX_JSON_BYTES = 512 * 1024;
const MAX_NONCE_PROBES = 4096;
const MAX_CALLDATA_BYTES = 256 * 1024;

export type BuyVoidPaymentKeyedPlanReservationInputV1 = {
  root_dir: string;
  saga_id: string;
  attempt_id: string;
  wallet_address: string;
  observed_pending_nonce: unknown;
  fulfillment_call: BuyVoidPaymentKeyedFulfillmentCallReadyV1;
  gas_limit: unknown;
  max_fee_per_gas_wei: unknown;
  max_priority_fee_per_gas_wei: unknown;
  runtime_policy_fingerprint_sha256: string;
  preparation_policy_fingerprint_sha256: string;
  now_ms?: number;
};

export type BuyVoidPaymentKeyedPlanReservationV1 = {
  schema: typeof RECORD_SCHEMA;
  marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_PLAN_RESERVATION_V1;
  version: 1;
  reservation_id: string;
  reserved_at_ms: number;
  saga_id: string;
  attempt_id: string;
  chain_id: "2050";
  wallet_address: string;
  wallet_key_sha256: string;
  nonce: number;
  fulfillment_call: BuyVoidPaymentKeyedFulfillmentCallReadyV1;
  gas_limit: string;
  max_fee_per_gas_wei: string;
  max_priority_fee_per_gas_wei: string;
  runtime_policy_fingerprint_sha256: string;
  preparation_policy_fingerprint_sha256: string;
  transaction_template_fingerprint_sha256: string;
  transaction_plan_fingerprint_sha256: string;
  reservation_status: "reserved";
  nonce_release_authorized: false;
  credential_access_authorized: false;
  wallet_access_authorized: false;
  signing_authorized: false;
  transaction_broadcast_authorized: false;
  raw_signed_transaction_persisted: false;
  money_movement_authorized: false;
};

export type BuyVoidPaymentKeyedPlanAttemptIndexV1 = {
  schema: typeof INDEX_SCHEMA;
  marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_PLAN_RESERVATION_V1;
  version: 1;
  attempt_id: string;
  reservation_id: string;
  wallet_key_sha256: string;
  nonce: number;
  transaction_template_fingerprint_sha256: string;
  transaction_plan_fingerprint_sha256: string;
};

export type BuyVoidPaymentKeyedPlanReservationDecisionV1 =
  | {
      ok: true;
      status: "reserved" | "duplicate";
      duplicate: boolean;
      recovered_attempt_index: boolean;
      reservation: BuyVoidPaymentKeyedPlanReservationV1;
      transaction_plan: BuyVoidDeliveryTransactionPlanV1;
      mutation_performed: boolean;
      signing_performed: false;
      transaction_broadcast_performed: false;
      raw_signed_transaction_persisted: false;
      money_movement_performed: false;
    }
  | {
      ok: false;
      status: "held";
      reason: string;
      detail?: Record<string, unknown>;
      mutation_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      raw_signed_transaction_persisted: false;
      money_movement_performed: false;
    };

type HeldV1 = Extract<
  BuyVoidPaymentKeyedPlanReservationDecisionV1,
  { ok: false }
>;

type NormalizedV1 = {
  root_dir: string;
  saga_id: string;
  attempt_id: string;
  wallet_address: string;
  wallet_key_sha256: string;
  observed_pending_nonce: number;
  fulfillment_call: BuyVoidPaymentKeyedFulfillmentCallReadyV1;
  gas_limit: string;
  max_fee_per_gas_wei: string;
  max_priority_fee_per_gas_wei: string;
  runtime_policy_fingerprint_sha256: string;
  preparation_policy_fingerprint_sha256: string;
  transaction_template_fingerprint_sha256: string;
  now_ms: number;
};

type PathsV1 = {
  root: string;
  wallets: string;
  wallet: string;
  nonces: string;
  attempts: string;
  allocation_lock: string;
};

const RECORD_KEYS = [
  "schema",
  "marker",
  "version",
  "reservation_id",
  "reserved_at_ms",
  "saga_id",
  "attempt_id",
  "chain_id",
  "wallet_address",
  "wallet_key_sha256",
  "nonce",
  "fulfillment_call",
  "gas_limit",
  "max_fee_per_gas_wei",
  "max_priority_fee_per_gas_wei",
  "runtime_policy_fingerprint_sha256",
  "preparation_policy_fingerprint_sha256",
  "transaction_template_fingerprint_sha256",
  "transaction_plan_fingerprint_sha256",
  "reservation_status",
  "nonce_release_authorized",
  "credential_access_authorized",
  "wallet_access_authorized",
  "signing_authorized",
  "transaction_broadcast_authorized",
  "raw_signed_transaction_persisted",
  "money_movement_authorized",
] as const;

const INDEX_KEYS = [
  "schema",
  "marker",
  "version",
  "attempt_id",
  "reservation_id",
  "wallet_key_sha256",
  "nonce",
  "transaction_template_fingerprint_sha256",
  "transaction_plan_fingerprint_sha256",
] as const;

function held(
  reason: string,
  detail?: Record<string, unknown>,
): HeldV1 {
  return {
    ok: false,
    status: "held",
    reason,
    ...(detail ? { detail } : {}),
    mutation_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    raw_signed_transaction_persisted: false,
    money_movement_performed: false,
  };
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function directObject(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(label + "_object_required");
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    throw new Error(label + "_prototype_invalid");
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(label + "_keys_invalid");
  }
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  const record = directObject(value, "canonical_value");
  return (
    "{" +
    Object.keys(record)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonical(record[key]))
      .join(",") +
    "}"
  );
}

function parseNonNegative(value: unknown): bigint | null {
  if (typeof value === "bigint") return value >= 0n ? value : null;
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value >= 0 ? BigInt(value) : null;
  }
  const raw = text(value);
  if (!DECIMAL.test(raw)) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function parsePositive(value: unknown): bigint | null {
  const parsed = parseNonNegative(value);
  return parsed !== null && parsed > 0n ? parsed : null;
}

function safeNumber(value: bigint): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function safeNow(value: unknown): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : Date.now();
}

function normalizeAddress(value: unknown): string {
  const address = text(value).toLowerCase();
  return ADDRESS.test(address) ? address : "";
}

function validateCall(
  value: BuyVoidPaymentKeyedFulfillmentCallReadyV1,
  attemptId: string,
): BuyVoidPaymentKeyedFulfillmentCallReadyV1 | null {
  const calldata = text(value?.calldata).toLowerCase();
  const calldataBytes =
    calldata.startsWith("0x") && calldata.length % 2 === 0
      ? (calldata.length - 2) / 2
      : -1;
  if (
    value?.ok !== true ||
    value.status !== "ready" ||
    value.marker !== VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CALL_V1 ||
    value.version !== 1 ||
    text(value.attempt_id).toLowerCase() !== attemptId ||
    !PAYMENT_ID.test(text(value.canonical_payment_identity).toLowerCase()) ||
    !SHA256.test(text(value.canonical_payment_key_sha256).toLowerCase()) ||
    !SHA256.test(text(value.legacy_local_payment_key_sha256).toLowerCase()) ||
    value.legacy_local_payment_key_chain_authority !== false ||
    !ADDRESS.test(text(value.delivery_address).toLowerCase()) ||
    !/^[1-9][0-9]*$/.test(text(value.void_amount_units)) ||
    !/^[1-9][0-9]*$/.test(text(value.token_amount_atoms)) ||
    !ADDRESS.test(text(value.fulfillment_contract_address).toLowerCase()) ||
    value.chain_id !== "2050" ||
    value.value_wei !== "0" ||
    !/^0x[0-9a-f]+$/i.test(calldata) ||
    calldataBytes <= 0 ||
    calldataBytes > MAX_CALLDATA_BYTES ||
    !SHA256.test(text(value.calldata_sha256).toLowerCase()) ||
    sha256(calldata) !== text(value.calldata_sha256).toLowerCase() ||
    !SHA256.test(text(value.call_fingerprint_sha256).toLowerCase()) ||
    value.source_finality_ready_verified !== true ||
    value.wallet_access_performed !== false ||
    value.signing_performed !== false ||
    value.transaction_broadcast_performed !== false ||
    value.money_movement_performed !== false
  ) {
    return null;
  }
  return structuredClone(value);
}

function canonicalPlanFingerprint(input: {
  nonce: number;
  gas_limit: string;
  max_fee_per_gas_wei: string;
  max_priority_fee_per_gas_wei: string;
}): string {
  return sha256(
    [
      "chain_id=2050",
      "nonce=" + String(input.nonce),
      "gas_limit=" + input.gas_limit,
      "max_fee_per_gas_wei=" + input.max_fee_per_gas_wei,
      "max_priority_fee_per_gas_wei=" +
        input.max_priority_fee_per_gas_wei,
    ].join("\n"),
  );
}

function normalizeInput(
  input: BuyVoidPaymentKeyedPlanReservationInputV1,
): NormalizedV1 | HeldV1 {
  const root = text(input?.root_dir);
  if (!root || !path.isAbsolute(root) || root.includes("\0")) {
    return held("payment_keyed_plan_root_must_be_absolute");
  }
  const resolvedRoot = path.resolve(root);
  if (resolvedRoot === path.parse(resolvedRoot).root) {
    return held("payment_keyed_plan_root_must_not_be_filesystem_root");
  }

  const sagaId = text(input?.saga_id).toLowerCase();
  const attemptId = text(input?.attempt_id).toLowerCase();
  if (!SAGA_ID.test(sagaId)) {
    return held("payment_keyed_plan_saga_id_invalid");
  }
  if (!SHA256.test(attemptId)) {
    return held("payment_keyed_plan_attempt_id_invalid");
  }

  const wallet = normalizeAddress(input?.wallet_address);
  if (!wallet) return held("payment_keyed_plan_wallet_invalid");

  const observedNonce = parseNonNegative(input?.observed_pending_nonce);
  const observedNonceNumber =
    observedNonce === null ? null : safeNumber(observedNonce);
  if (observedNonceNumber === null) {
    return held("payment_keyed_plan_pending_nonce_invalid");
  }

  const call = validateCall(input?.fulfillment_call, attemptId);
  if (!call) return held("payment_keyed_plan_fulfillment_call_invalid");
  if (normalizeAddress(call.fulfillment_contract_address) === wallet) {
    return held("payment_keyed_plan_contract_equals_wallet");
  }

  const gasLimit = parsePositive(input?.gas_limit);
  const maxFee = parsePositive(input?.max_fee_per_gas_wei);
  const priority = parseNonNegative(input?.max_priority_fee_per_gas_wei);
  if (
    gasLimit === null ||
    maxFee === null ||
    priority === null ||
    priority > maxFee
  ) {
    return held("payment_keyed_plan_fee_envelope_invalid");
  }

  const runtimePolicy = text(
    input?.runtime_policy_fingerprint_sha256,
  ).toLowerCase();
  const preparationPolicy = text(
    input?.preparation_policy_fingerprint_sha256,
  ).toLowerCase();
  if (!SHA256.test(runtimePolicy)) {
    return held("payment_keyed_plan_runtime_policy_fingerprint_invalid");
  }
  if (!SHA256.test(preparationPolicy)) {
    return held("payment_keyed_plan_preparation_policy_fingerprint_invalid");
  }

  const template = {
    saga_id: sagaId,
    attempt_id: attemptId,
    chain_id: "2050",
    wallet_address: wallet,
    fulfillment_call: call,
    gas_limit: gasLimit.toString(),
    max_fee_per_gas_wei: maxFee.toString(),
    max_priority_fee_per_gas_wei: priority.toString(),
    runtime_policy_fingerprint_sha256: runtimePolicy,
    preparation_policy_fingerprint_sha256: preparationPolicy,
  };

  return {
    root_dir: resolvedRoot,
    saga_id: sagaId,
    attempt_id: attemptId,
    wallet_address: wallet,
    wallet_key_sha256: sha256(
      "void-buy-payment-keyed-wallet-v1\n2050\n" + wallet,
    ),
    observed_pending_nonce: observedNonceNumber,
    fulfillment_call: call,
    gas_limit: gasLimit.toString(),
    max_fee_per_gas_wei: maxFee.toString(),
    max_priority_fee_per_gas_wei: priority.toString(),
    runtime_policy_fingerprint_sha256: runtimePolicy,
    preparation_policy_fingerprint_sha256: preparationPolicy,
    transaction_template_fingerprint_sha256: sha256(canonical(template)),
    now_ms: safeNow(input?.now_ms),
  };
}

function pathsFor(input: NormalizedV1): PathsV1 {
  const root = path.join(
    input.root_dir,
    "buy-void-payment-keyed-plan-reservation-v1",
  );
  const wallets = path.join(root, "wallets");
  const wallet = path.join(wallets, input.wallet_key_sha256);
  return {
    root,
    wallets,
    wallet,
    nonces: path.join(wallet, "nonces"),
    attempts: path.join(wallet, "attempts"),
    allocation_lock: path.join(wallet, "nonce-allocation"),
  };
}

function assertPrivateDirectory(directory: string): void {
  const metadata = fs.lstatSync(directory);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error("payment_keyed_plan_directory_invalid");
  }
  if (
    typeof process.getuid === "function" &&
    metadata.uid !== process.getuid()
  ) {
    throw new Error("payment_keyed_plan_directory_owner_mismatch");
  }
  if ((metadata.mode & 0o077) !== 0) {
    throw new Error("payment_keyed_plan_directory_not_private");
  }
}

function ensurePrivateDirectory(directory: string): void {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
  assertPrivateDirectory(directory);
}

function privateDirectoryExistsReadOnly(directory: string): boolean {
  try {
    assertPrivateDirectory(directory);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return false;
    throw error;
  }
}

function initializePaths(paths: PathsV1): void {
  for (const directory of [
    paths.root,
    paths.wallets,
    paths.wallet,
    paths.nonces,
    paths.attempts,
  ]) {
    ensurePrivateDirectory(directory);
  }
}

function fsyncDirectory(directory: string): void {
  const fd = fs.openSync(directory, "r");
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function atomicCreateJson(file: string, value: unknown): "created" | "exists" {
  const parent = path.dirname(file);
  ensurePrivateDirectory(parent);
  const temporary = path.join(
    parent,
    "." +
      path.basename(file) +
      ".tmp-" +
      process.pid +
      "-" +
      crypto.randomBytes(8).toString("hex"),
  );
  const fd = fs.openSync(temporary, "wx", 0o600);
  try {
    fs.writeFileSync(fd, JSON.stringify(value, null, 2) + "\n", "utf8");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }

  try {
    try {
      fs.linkSync(temporary, file);
      fsyncDirectory(parent);
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
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") throw error;
    }
  }
}

function readJsonObject(file: string): Record<string, unknown> | null {
  try {
    const metadata = fs.lstatSync(file);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
      throw new Error("payment_keyed_plan_record_invalid_file");
    }
    if ((metadata.mode & 0o077) !== 0) {
      throw new Error("payment_keyed_plan_record_not_private");
    }
    if (metadata.size < 2 || metadata.size > MAX_JSON_BYTES) {
      throw new Error("payment_keyed_plan_record_size_invalid");
    }
    return directObject(
      JSON.parse(fs.readFileSync(file, "utf8")),
      "payment_keyed_plan_record",
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return null;
    throw error;
  }
}

function nonceFilename(nonce: number): string {
  return String(nonce).padStart(16, "0") + ".json";
}

function nonceFile(paths: PathsV1, nonce: number): string {
  return path.join(paths.nonces, nonceFilename(nonce));
}

function attemptFile(paths: PathsV1, attemptId: string): string {
  return path.join(paths.attempts, attemptId + ".json");
}

function buildRecord(
  input: NormalizedV1,
  nonce: number,
): BuyVoidPaymentKeyedPlanReservationV1 {
  const transactionPlanFingerprint =
    canonicalPlanFingerprint({
      nonce,
      gas_limit: input.gas_limit,
      max_fee_per_gas_wei: input.max_fee_per_gas_wei,
      max_priority_fee_per_gas_wei:
        input.max_priority_fee_per_gas_wei,
    });
  const reservationId = sha256(
    [
      "void-buy-payment-keyed-plan-reservation-v1",
      input.wallet_key_sha256,
      String(nonce),
      input.attempt_id,
      input.transaction_template_fingerprint_sha256,
      transactionPlanFingerprint,
    ].join("\n"),
  );

  return {
    schema: RECORD_SCHEMA,
    marker: VOID_BUY_VOID_PAYMENT_KEYED_PLAN_RESERVATION_V1,
    version: 1,
    reservation_id: reservationId,
    reserved_at_ms: input.now_ms,
    saga_id: input.saga_id,
    attempt_id: input.attempt_id,
    chain_id: "2050",
    wallet_address: input.wallet_address,
    wallet_key_sha256: input.wallet_key_sha256,
    nonce,
    fulfillment_call: structuredClone(input.fulfillment_call),
    gas_limit: input.gas_limit,
    max_fee_per_gas_wei: input.max_fee_per_gas_wei,
    max_priority_fee_per_gas_wei:
      input.max_priority_fee_per_gas_wei,
    runtime_policy_fingerprint_sha256:
      input.runtime_policy_fingerprint_sha256,
    preparation_policy_fingerprint_sha256:
      input.preparation_policy_fingerprint_sha256,
    transaction_template_fingerprint_sha256:
      input.transaction_template_fingerprint_sha256,
    transaction_plan_fingerprint_sha256:
      transactionPlanFingerprint,
    reservation_status: "reserved",
    nonce_release_authorized: false,
    credential_access_authorized: false,
    wallet_access_authorized: false,
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    raw_signed_transaction_persisted: false,
    money_movement_authorized: false,
  };
}

function parseRecord(
  value: Record<string, unknown>,
): BuyVoidPaymentKeyedPlanReservationV1 {
  exactKeys(value, RECORD_KEYS, "payment_keyed_plan_record");
  const attemptId = text(value.attempt_id).toLowerCase();
  const call = validateCall(
    value.fulfillment_call as BuyVoidPaymentKeyedFulfillmentCallReadyV1,
    attemptId,
  );
  if (
    value.schema !== RECORD_SCHEMA ||
    value.marker !== VOID_BUY_VOID_PAYMENT_KEYED_PLAN_RESERVATION_V1 ||
    value.version !== 1 ||
    !SHA256.test(text(value.reservation_id).toLowerCase()) ||
    !Number.isSafeInteger(value.reserved_at_ms) ||
    Number(value.reserved_at_ms) <= 0 ||
    !SAGA_ID.test(text(value.saga_id).toLowerCase()) ||
    !SHA256.test(attemptId) ||
    value.chain_id !== "2050" ||
    !ADDRESS.test(text(value.wallet_address).toLowerCase()) ||
    !SHA256.test(text(value.wallet_key_sha256).toLowerCase()) ||
    !Number.isSafeInteger(value.nonce) ||
    Number(value.nonce) < 0 ||
    !call ||
    parsePositive(value.gas_limit) === null ||
    parsePositive(value.max_fee_per_gas_wei) === null ||
    parseNonNegative(value.max_priority_fee_per_gas_wei) === null ||
    !SHA256.test(
      text(value.runtime_policy_fingerprint_sha256).toLowerCase(),
    ) ||
    !SHA256.test(
      text(value.preparation_policy_fingerprint_sha256).toLowerCase(),
    ) ||
    !SHA256.test(
      text(value.transaction_template_fingerprint_sha256).toLowerCase(),
    ) ||
    !SHA256.test(
      text(value.transaction_plan_fingerprint_sha256).toLowerCase(),
    ) ||
    value.reservation_status !== "reserved" ||
    value.nonce_release_authorized !== false ||
    value.credential_access_authorized !== false ||
    value.wallet_access_authorized !== false ||
    value.signing_authorized !== false ||
    value.transaction_broadcast_authorized !== false ||
    value.raw_signed_transaction_persisted !== false ||
    value.money_movement_authorized !== false
  ) {
    throw new Error("payment_keyed_plan_record_invalid");
  }

  const record =
    value as unknown as BuyVoidPaymentKeyedPlanReservationV1;
  const normalized = normalizeInput({
    root_dir: "/tmp/void-payment-keyed-plan-parse",
    saga_id: record.saga_id,
    attempt_id: record.attempt_id,
    wallet_address: record.wallet_address,
    observed_pending_nonce: record.nonce,
    fulfillment_call: record.fulfillment_call,
    gas_limit: record.gas_limit,
    max_fee_per_gas_wei: record.max_fee_per_gas_wei,
    max_priority_fee_per_gas_wei:
      record.max_priority_fee_per_gas_wei,
    runtime_policy_fingerprint_sha256:
      record.runtime_policy_fingerprint_sha256,
    preparation_policy_fingerprint_sha256:
      record.preparation_policy_fingerprint_sha256,
    now_ms: record.reserved_at_ms,
  });
  if ("reason" in normalized) {
    throw new Error("payment_keyed_plan_record_rebuild_invalid");
  }
  const rebuilt = buildRecord(normalized, record.nonce);
  if (
    rebuilt.reservation_id !== record.reservation_id ||
    rebuilt.wallet_key_sha256 !== record.wallet_key_sha256 ||
    rebuilt.transaction_template_fingerprint_sha256 !==
      record.transaction_template_fingerprint_sha256 ||
    rebuilt.transaction_plan_fingerprint_sha256 !==
      record.transaction_plan_fingerprint_sha256 ||
    canonical(rebuilt.fulfillment_call) !==
      canonical(record.fulfillment_call)
  ) {
    throw new Error("payment_keyed_plan_record_fingerprint_mismatch");
  }

  return record;
}

function indexFor(
  record: BuyVoidPaymentKeyedPlanReservationV1,
): BuyVoidPaymentKeyedPlanAttemptIndexV1 {
  return {
    schema: INDEX_SCHEMA,
    marker: VOID_BUY_VOID_PAYMENT_KEYED_PLAN_RESERVATION_V1,
    version: 1,
    attempt_id: record.attempt_id,
    reservation_id: record.reservation_id,
    wallet_key_sha256: record.wallet_key_sha256,
    nonce: record.nonce,
    transaction_template_fingerprint_sha256:
      record.transaction_template_fingerprint_sha256,
    transaction_plan_fingerprint_sha256:
      record.transaction_plan_fingerprint_sha256,
  };
}

function parseIndex(
  value: Record<string, unknown>,
): BuyVoidPaymentKeyedPlanAttemptIndexV1 {
  exactKeys(value, INDEX_KEYS, "payment_keyed_plan_attempt_index");
  if (
    value.schema !== INDEX_SCHEMA ||
    value.marker !== VOID_BUY_VOID_PAYMENT_KEYED_PLAN_RESERVATION_V1 ||
    value.version !== 1 ||
    !SHA256.test(text(value.attempt_id).toLowerCase()) ||
    !SHA256.test(text(value.reservation_id).toLowerCase()) ||
    !SHA256.test(text(value.wallet_key_sha256).toLowerCase()) ||
    !Number.isSafeInteger(value.nonce) ||
    Number(value.nonce) < 0 ||
    !SHA256.test(
      text(value.transaction_template_fingerprint_sha256).toLowerCase(),
    ) ||
    !SHA256.test(
      text(value.transaction_plan_fingerprint_sha256).toLowerCase(),
    )
  ) {
    throw new Error("payment_keyed_plan_attempt_index_invalid");
  }
  return value as unknown as BuyVoidPaymentKeyedPlanAttemptIndexV1;
}

function validateIndexBinding(
  index: BuyVoidPaymentKeyedPlanAttemptIndexV1,
  record: BuyVoidPaymentKeyedPlanReservationV1,
): void {
  if (
    index.attempt_id !== record.attempt_id ||
    index.reservation_id !== record.reservation_id ||
    index.wallet_key_sha256 !== record.wallet_key_sha256 ||
    index.nonce !== record.nonce ||
    index.transaction_template_fingerprint_sha256 !==
      record.transaction_template_fingerprint_sha256 ||
    index.transaction_plan_fingerprint_sha256 !==
      record.transaction_plan_fingerprint_sha256
  ) {
    throw new Error("payment_keyed_plan_attempt_index_binding_mismatch");
  }
}

function assertCompatible(
  record: BuyVoidPaymentKeyedPlanReservationV1,
  input: NormalizedV1,
): void {
  if (
    record.saga_id !== input.saga_id ||
    record.attempt_id !== input.attempt_id ||
    record.wallet_address !== input.wallet_address ||
    record.wallet_key_sha256 !== input.wallet_key_sha256 ||
    canonical(record.fulfillment_call) !== canonical(input.fulfillment_call) ||
    record.gas_limit !== input.gas_limit ||
    record.max_fee_per_gas_wei !== input.max_fee_per_gas_wei ||
    record.max_priority_fee_per_gas_wei !==
      input.max_priority_fee_per_gas_wei ||
    record.runtime_policy_fingerprint_sha256 !==
      input.runtime_policy_fingerprint_sha256 ||
    record.preparation_policy_fingerprint_sha256 !==
      input.preparation_policy_fingerprint_sha256 ||
    record.transaction_template_fingerprint_sha256 !==
      input.transaction_template_fingerprint_sha256
  ) {
    throw new Error("payment_keyed_plan_attempt_binding_conflict");
  }
}

function listRecords(
  paths: PathsV1,
): BuyVoidPaymentKeyedPlanReservationV1[] {
  const output: BuyVoidPaymentKeyedPlanReservationV1[] = [];
  for (const entry of fs.readdirSync(paths.nonces, { withFileTypes: true })) {
    if (
      !NONCE_FILE.test(entry.name) ||
      !entry.isFile() ||
      entry.isSymbolicLink()
    ) {
      throw new Error("payment_keyed_plan_nonce_directory_entry_invalid");
    }
    const raw = readJsonObject(path.join(paths.nonces, entry.name));
    if (!raw) throw new Error("payment_keyed_plan_nonce_record_missing");
    const record = parseRecord(raw);
    if (nonceFilename(record.nonce) !== entry.name) {
      throw new Error("payment_keyed_plan_nonce_filename_mismatch");
    }
    output.push(record);
  }
  return output.sort((left, right) => left.nonce - right.nonce);
}

function publishAttemptIndex(
  paths: PathsV1,
  record: BuyVoidPaymentKeyedPlanReservationV1,
): boolean {
  const file = attemptFile(paths, record.attempt_id);
  const created = atomicCreateJson(file, indexFor(record));
  if (created === "created") return true;
  const raced = readJsonObject(file);
  if (!raced) throw new Error("payment_keyed_plan_attempt_index_unreadable");
  const parsed = parseIndex(raced);
  validateIndexBinding(parsed, record);
  return false;
}

function recoverAttempt(
  paths: PathsV1,
  input: NormalizedV1,
): {
  record: BuyVoidPaymentKeyedPlanReservationV1 | null;
  recovered_index: boolean;
} {
  const indexRaw = readJsonObject(attemptFile(paths, input.attempt_id));
  if (indexRaw) {
    const index = parseIndex(indexRaw);
    const recordRaw = readJsonObject(nonceFile(paths, index.nonce));
    if (!recordRaw) {
      throw new Error("payment_keyed_plan_index_target_missing");
    }
    const record = parseRecord(recordRaw);
    validateIndexBinding(index, record);
    assertCompatible(record, input);
    if (record.nonce < input.observed_pending_nonce) {
      throw new Error(
        "payment_keyed_plan_reserved_nonce_below_observed_pending",
      );
    }
    const duplicates = listRecords(paths).filter(
      (candidate) => candidate.attempt_id === input.attempt_id,
    );
    if (
      duplicates.length !== 1 ||
      duplicates[0].reservation_id !== record.reservation_id
    ) {
      throw new Error("payment_keyed_plan_attempt_has_multiple_nonces");
    }
    return { record, recovered_index: false };
  }

  const matches = listRecords(paths).filter(
    (record) => record.attempt_id === input.attempt_id,
  );
  if (matches.length > 1) {
    throw new Error("payment_keyed_plan_attempt_has_multiple_nonces");
  }
  if (matches.length === 0) {
    return { record: null, recovered_index: false };
  }
  const record = matches[0];
  assertCompatible(record, input);
  if (record.nonce < input.observed_pending_nonce) {
    throw new Error(
      "payment_keyed_plan_reserved_nonce_below_observed_pending",
    );
  }
  const created = publishAttemptIndex(paths, record);
  return { record, recovered_index: created };
}

function transactionPlan(
  record: BuyVoidPaymentKeyedPlanReservationV1,
): BuyVoidDeliveryTransactionPlanV1 {
  return {
    chain_id: "2050",
    nonce: record.nonce,
    gas_limit: record.gas_limit,
    max_fee_per_gas_wei: record.max_fee_per_gas_wei,
    max_priority_fee_per_gas_wei:
      record.max_priority_fee_per_gas_wei,
  };
}

function success(
  status: "reserved" | "duplicate",
  reservation: BuyVoidPaymentKeyedPlanReservationV1,
  mutationPerformed: boolean,
  recoveredAttemptIndex: boolean,
): Extract<BuyVoidPaymentKeyedPlanReservationDecisionV1, { ok: true }> {
  return {
    ok: true,
    status,
    duplicate: status === "duplicate",
    recovered_attempt_index: recoveredAttemptIndex,
    reservation,
    transaction_plan: transactionPlan(reservation),
    mutation_performed: mutationPerformed,
    signing_performed: false,
    transaction_broadcast_performed: false,
    raw_signed_transaction_persisted: false,
    money_movement_performed: false,
  };
}

export function reserveBuyVoidPaymentKeyedPlanV1(
  input: BuyVoidPaymentKeyedPlanReservationInputV1,
): BuyVoidPaymentKeyedPlanReservationDecisionV1 {
  const normalized = normalizeInput(input);
  if ("reason" in normalized) return normalized;

  try {
    const paths = pathsFor(normalized);
    initializePaths(paths);

    return withBuyVoidFilesystemBakeryLockV1(
      paths.allocation_lock,
      () => {
        const recovered = recoverAttempt(paths, normalized);
        if (recovered.record) {
          return success(
            "duplicate",
            recovered.record,
            recovered.recovered_index,
            recovered.recovered_index,
          );
        }

        const existing = listRecords(paths);
        const highest = existing.reduce(
          (maximum, record) => Math.max(maximum, record.nonce),
          -1,
        );
        let candidate = Math.max(
          normalized.observed_pending_nonce,
          highest + 1,
        );

        for (let probe = 0; probe < MAX_NONCE_PROBES; probe += 1) {
          if (!Number.isSafeInteger(candidate) || candidate < 0) {
            throw new Error("payment_keyed_plan_nonce_space_exhausted");
          }

          const record = buildRecord(normalized, candidate);
          const created = atomicCreateJson(
            nonceFile(paths, candidate),
            record,
          );
          if (created === "created") {
            publishAttemptIndex(paths, record);
            return success("reserved", record, true, false);
          }

          const occupiedRaw = readJsonObject(
            nonceFile(paths, candidate),
          );
          if (!occupiedRaw) {
            throw new Error("payment_keyed_plan_occupied_nonce_unreadable");
          }
          const occupied = parseRecord(occupiedRaw);
          if (occupied.attempt_id === normalized.attempt_id) {
            assertCompatible(occupied, normalized);
            if (occupied.nonce < normalized.observed_pending_nonce) {
              throw new Error(
                "payment_keyed_plan_reserved_nonce_below_observed_pending",
              );
            }
            const recoveredSame = recoverAttempt(paths, normalized);
            if (!recoveredSame.record) {
              throw new Error(
                "payment_keyed_plan_same_attempt_recovery_failed",
              );
            }
            return success(
              "duplicate",
              recoveredSame.record,
              recoveredSame.recovered_index,
              recoveredSame.recovered_index,
            );
          }

          candidate += 1;
        }

        throw new Error("payment_keyed_plan_nonce_probe_cap_reached");
      },
    );
  } catch (error) {
    return held("payment_keyed_plan_reservation_failed", {
      message: text((error as Error)?.message || error).slice(0, 240),
    });
  }
}

export function listBuyVoidPaymentKeyedPlanReservationsV1(input: {
  root_dir: string;
  wallet_address: string;
}): BuyVoidPaymentKeyedPlanReservationV1[] {
  const wallet = normalizeAddress(input?.wallet_address);
  if (!wallet) throw new Error("payment_keyed_plan_wallet_invalid");

  const root = text(input?.root_dir);
  if (!root || !path.isAbsolute(root) || root.includes("\0")) {
    throw new Error("payment_keyed_plan_root_must_be_absolute");
  }

  const normalized = normalizeInput({
    root_dir: root,
    saga_id: "voidbvfsg1_" + "0".repeat(64),
    attempt_id: "0".repeat(64),
    wallet_address: wallet,
    observed_pending_nonce: 0,
    fulfillment_call: {
      ok: true,
      status: "ready",
      marker: VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CALL_V1,
      version: 1,
      attempt_id: "0".repeat(64),
      canonical_payment_identity:
        "voidpay1:base:0x" + "0".repeat(64) + ":0",
      source_chain: "base",
      canonical_payment_key_sha256: "0".repeat(64),
      legacy_local_payment_key_sha256: "1".repeat(64),
      legacy_local_payment_key_chain_authority: false,
      delivery_address: "0x0000000000000000000000000000000000000001",
      void_amount_units: "1",
      token_amount_atoms: "1000000000000",
      fulfillment_contract_address:
        "0x0000000000000000000000000000000000000002",
      chain_id: "2050",
      value_wei: "0",
      calldata: "0x00",
      calldata_sha256: sha256("0x00"),
      call_fingerprint_sha256: "0".repeat(64),
      source_finality_ready_verified: true,
      wallet_access_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    },
    gas_limit: 1,
    max_fee_per_gas_wei: 1,
    max_priority_fee_per_gas_wei: 0,
    runtime_policy_fingerprint_sha256: "0".repeat(64),
    preparation_policy_fingerprint_sha256: "0".repeat(64),
  });
  if ("reason" in normalized) {
    throw new Error(normalized.reason);
  }

  const paths = pathsFor(normalized);
  for (const directory of [
    paths.root,
    paths.wallets,
    paths.wallet,
    paths.nonces,
  ]) {
    if (!privateDirectoryExistsReadOnly(directory)) return [];
  }
  privateDirectoryExistsReadOnly(paths.attempts);
  return listRecords(paths);
}

export function inspectBuyVoidPaymentKeyedPlanReservationPathsV1(input: {
  root_dir: string;
  wallet_address: string;
}): {
  root_exists: boolean;
  wallet_exists: boolean;
  nonces_exists: boolean;
  attempts_exists: boolean;
} {
  const wallet = normalizeAddress(input?.wallet_address);
  if (!wallet) throw new Error("payment_keyed_plan_wallet_invalid");
  const root = text(input?.root_dir);
  if (!root || !path.isAbsolute(root) || root.includes("\0")) {
    throw new Error("payment_keyed_plan_root_must_be_absolute");
  }
  const normalized = normalizeInput({
    root_dir: root,
    saga_id: "voidbvfsg1_" + "0".repeat(64),
    attempt_id: "0".repeat(64),
    wallet_address: wallet,
    observed_pending_nonce: 0,
    fulfillment_call: {
      ok: true,
      status: "ready",
      marker: VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CALL_V1,
      version: 1,
      attempt_id: "0".repeat(64),
      canonical_payment_identity:
        "voidpay1:base:0x" + "0".repeat(64) + ":0",
      source_chain: "base",
      canonical_payment_key_sha256: "0".repeat(64),
      legacy_local_payment_key_sha256: "1".repeat(64),
      legacy_local_payment_key_chain_authority: false,
      delivery_address: "0x0000000000000000000000000000000000000001",
      void_amount_units: "1",
      token_amount_atoms: "1000000000000",
      fulfillment_contract_address:
        "0x0000000000000000000000000000000000000002",
      chain_id: "2050",
      value_wei: "0",
      calldata: "0x00",
      calldata_sha256: sha256("0x00"),
      call_fingerprint_sha256: "0".repeat(64),
      source_finality_ready_verified: true,
      wallet_access_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    },
    gas_limit: 1,
    max_fee_per_gas_wei: 1,
    max_priority_fee_per_gas_wei: 0,
    runtime_policy_fingerprint_sha256: "0".repeat(64),
    preparation_policy_fingerprint_sha256: "0".repeat(64),
  });
  if ("reason" in normalized) {
    throw new Error(normalized.reason);
  }
  const paths = pathsFor(normalized);
  return {
    root_exists: privateDirectoryExistsReadOnly(paths.root),
    wallet_exists: privateDirectoryExistsReadOnly(paths.wallet),
    nonces_exists: privateDirectoryExistsReadOnly(paths.nonces),
    attempts_exists: privateDirectoryExistsReadOnly(paths.attempts),
  };
}
