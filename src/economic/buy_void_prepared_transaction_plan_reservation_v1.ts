import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  withBuyVoidFilesystemBakeryLockV1,
} from "./buy_void_filesystem_bakery_lock_v1.js";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_PLAN_RESERVATION_V1 =
  "VOID_BUY_VOID_PREPARED_TRANSACTION_PLAN_RESERVATION_V1";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_PLAN_RESERVATION_AUTHORITY_V1 = {
  source_only_contract: true,
  one_wallet_nonce_per_reservation: true,
  wallet_scoped_nonce_allocation_lock: true,
  dead_nonce_allocation_claim_cleanup: true,
  immutable_nonce_claim: true,
  atomic_nonce_publication: true,
  crash_recoverable_attempt_index: true,
  concurrent_attempt_collision_safe: true,
  wallet_allocation_lock_required: true,
  observed_pending_nonce_is_floor_only: true,
  reserved_nonce_below_observed_pending_fails_closed: true,
  server_controlled_plan_required: true,
  nonce_release: false,
  rpc_call: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  raw_signed_transaction_input: false,
  raw_signed_transaction_persistence: false,
  money_movement: false,
} as const;

const RECORD_SCHEMA =
  "void_buy_void_prepared_transaction_plan_reservation_v1";
const INDEX_SCHEMA =
  "void_buy_void_prepared_transaction_attempt_index_v1";
const SHA256 = /^[0-9a-f]{64}$/;
const SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const DECIMAL = /^(0|[1-9][0-9]*)$/;
const NONCE_FILE = /^[0-9]{16}\.json$/;
const MAX_JSON_BYTES = 256 * 1024;
const MAX_NONCE_PROBES = 4096;

export type BuyVoidPreparedTransactionPlanReservationInputV1 = {
  root_dir: string;
  saga_id: string;
  attempt_id: string;
  chain_id: "2050";
  wallet_address: string;
  observed_pending_nonce: unknown;
  delivery_address: string;
  native_value_wei: unknown;
  gas_limit: unknown;
  max_fee_per_gas_wei: unknown;
  max_priority_fee_per_gas_wei: unknown;
  economic_policy_fingerprint_sha256: string;
  preparation_policy_fingerprint_sha256: string;
  now_ms?: number;
};

export type BuyVoidPreparedTransactionPlanReservationV1 = {
  schema: typeof RECORD_SCHEMA;
  marker: typeof VOID_BUY_VOID_PREPARED_TRANSACTION_PLAN_RESERVATION_V1;
  version: 1;
  reservation_id: string;
  reserved_at_ms: number;
  saga_id: string;
  attempt_id: string;
  chain_id: "2050";
  wallet_address: string;
  wallet_key_sha256: string;
  nonce: number;
  delivery_address: string;
  native_value_wei: string;
  gas_limit: string;
  max_fee_per_gas_wei: string;
  max_priority_fee_per_gas_wei: string;
  economic_policy_fingerprint_sha256: string;
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

export type BuyVoidPreparedTransactionAttemptIndexV1 = {
  schema: typeof INDEX_SCHEMA;
  marker: typeof VOID_BUY_VOID_PREPARED_TRANSACTION_PLAN_RESERVATION_V1;
  version: 1;
  attempt_id: string;
  reservation_id: string;
  wallet_key_sha256: string;
  nonce: number;
  transaction_template_fingerprint_sha256: string;
  transaction_plan_fingerprint_sha256: string;
};

export type BuyVoidPreparedTransactionPlanReservationDecisionV1 =
  | {
      ok: true;
      status: "reserved" | "duplicate";
      duplicate: boolean;
      recovered_attempt_index: boolean;
      reservation: BuyVoidPreparedTransactionPlanReservationV1;
      mutation_performed: boolean;
      signing_performed: false;
      transaction_broadcast_performed: false;
      raw_signed_transaction_persisted: false;
      money_movement_performed: false;
      reason?: never;
      detail?: never;
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
      reservation?: never;
    };

export type BuyVoidPreparedTransactionPlanReservationHeldV1 = Extract<
  BuyVoidPreparedTransactionPlanReservationDecisionV1,
  { ok: false }
>;

type NormalizedInputV1 = {
  root_dir: string;
  saga_id: string;
  attempt_id: string;
  chain_id: "2050";
  wallet_address: string;
  wallet_key_sha256: string;
  observed_pending_nonce: number;
  delivery_address: string;
  native_value_wei: string;
  gas_limit: string;
  max_fee_per_gas_wei: string;
  max_priority_fee_per_gas_wei: string;
  economic_policy_fingerprint_sha256: string;
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

function held(
  reason: string,
  detail?: Record<string, unknown>,
): BuyVoidPreparedTransactionPlanReservationHeldV1 {
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

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`)
    .join(",")}}`;
}

function fingerprint(value: unknown): string {
  return sha256(canonical(value));
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label}_keys_invalid`);
  }
}

function normalizeAddress(value: unknown): string {
  const address = String(value || "").trim().toLowerCase();
  return ADDRESS.test(address) ? address : "";
}

function parseNonNegativeInteger(value: unknown): bigint | null {
  if (typeof value === "bigint") return value >= 0n ? value : null;
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value >= 0 ? BigInt(value) : null;
  }
  const raw = String(value ?? "").trim();
  if (!DECIMAL.test(raw)) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function parsePositiveInteger(value: unknown): bigint | null {
  const parsed = parseNonNegativeInteger(value);
  return parsed !== null && parsed > 0n ? parsed : null;
}

function safeNumber(value: bigint): number | null {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function safeNow(value: unknown): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : Date.now();
}

function normalizeInput(
  input: BuyVoidPreparedTransactionPlanReservationInputV1,
): NormalizedInputV1 | BuyVoidPreparedTransactionPlanReservationHeldV1 {
  const root = String(input?.root_dir || "").trim();
  if (!root || !path.isAbsolute(root) || root.includes("\0")) {
    return held("prepared_plan_root_must_be_absolute");
  }
  const sagaId = String(input?.saga_id || "").trim();
  const attemptId = String(input?.attempt_id || "").trim().toLowerCase();
  if (!SAGA_ID.test(sagaId)) return held("prepared_plan_saga_id_invalid");
  if (!SHA256.test(attemptId)) return held("prepared_plan_attempt_id_invalid");
  if (input?.chain_id !== "2050") return held("prepared_plan_chain_id_invalid");

  const wallet = normalizeAddress(input?.wallet_address);
  const delivery = normalizeAddress(input?.delivery_address);
  if (!wallet) return held("prepared_plan_wallet_address_invalid");
  if (!delivery || delivery === wallet) {
    return held("prepared_plan_delivery_address_invalid");
  }

  const observedNonce = parseNonNegativeInteger(input?.observed_pending_nonce);
  const nativeValue = parsePositiveInteger(input?.native_value_wei);
  const gasLimit = parsePositiveInteger(input?.gas_limit);
  const maxFee = parsePositiveInteger(input?.max_fee_per_gas_wei);
  const priorityFee = parseNonNegativeInteger(
    input?.max_priority_fee_per_gas_wei,
  );
  const observedNonceNumber =
    observedNonce === null ? null : safeNumber(observedNonce);
  if (observedNonceNumber === null) {
    return held("prepared_plan_pending_nonce_invalid");
  }
  if (nativeValue === null) return held("prepared_plan_native_value_invalid");
  if (gasLimit === null) return held("prepared_plan_gas_limit_invalid");
  if (maxFee === null) return held("prepared_plan_max_fee_invalid");
  if (priorityFee === null || priorityFee > maxFee) {
    return held("prepared_plan_priority_fee_invalid");
  }

  const economicPolicy = String(
    input?.economic_policy_fingerprint_sha256 || "",
  ).trim().toLowerCase();
  const preparationPolicy = String(
    input?.preparation_policy_fingerprint_sha256 || "",
  ).trim().toLowerCase();
  if (!SHA256.test(economicPolicy)) {
    return held("prepared_plan_economic_policy_fingerprint_invalid");
  }
  if (!SHA256.test(preparationPolicy)) {
    return held("prepared_plan_preparation_policy_fingerprint_invalid");
  }

  const template = {
    saga_id: sagaId,
    attempt_id: attemptId,
    chain_id: "2050",
    wallet_address: wallet,
    delivery_address: delivery,
    native_value_wei: nativeValue.toString(),
    gas_limit: gasLimit.toString(),
    max_fee_per_gas_wei: maxFee.toString(),
    max_priority_fee_per_gas_wei: priorityFee.toString(),
    economic_policy_fingerprint_sha256: economicPolicy,
    preparation_policy_fingerprint_sha256: preparationPolicy,
  };

  return {
    root_dir: path.resolve(root),
    saga_id: sagaId,
    attempt_id: attemptId,
    chain_id: "2050",
    wallet_address: wallet,
    wallet_key_sha256: sha256(`void-buy-wallet-v1\n2050\n${wallet}`),
    observed_pending_nonce: observedNonceNumber,
    delivery_address: delivery,
    native_value_wei: nativeValue.toString(),
    gas_limit: gasLimit.toString(),
    max_fee_per_gas_wei: maxFee.toString(),
    max_priority_fee_per_gas_wei: priorityFee.toString(),
    economic_policy_fingerprint_sha256: economicPolicy,
    preparation_policy_fingerprint_sha256: preparationPolicy,
    transaction_template_fingerprint_sha256: fingerprint(template),
    now_ms: safeNow(input?.now_ms),
  };
}

function ensurePrivateDirectory(directory: string): void {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
  const metadata = fs.lstatSync(directory);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error("prepared_plan_directory_must_be_direct_directory");
  }
  if (
    typeof process.getuid === "function" &&
    metadata.uid !== process.getuid()
  ) {
    throw new Error("prepared_plan_directory_owner_mismatch");
  }
  if ((metadata.mode & 0o077) !== 0) {
    throw new Error("prepared_plan_directory_must_be_private");
  }
}

function pathsFor(input: NormalizedInputV1): PathsV1 {
  const root = path.join(
    input.root_dir,
    "buy-void-prepared-transaction-plan-reservation-v1",
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
  const descriptor = fs.openSync(directory, "r");
  try {
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
}

function atomicCreateJson(file: string, value: unknown): "created" | "exists" {
  const parent = path.dirname(file);
  ensurePrivateDirectory(parent);
  const temporary = path.join(
    parent,
    `.${path.basename(file)}.tmp-${process.pid}-${crypto
      .randomBytes(8)
      .toString("hex")}`,
  );
  const descriptor = fs.openSync(temporary, "wx", 0o600);
  try {
    fs.writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  try {
    try {
      fs.linkSync(temporary, file);
      fsyncDirectory(parent);
      return "created";
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === "EEXIST") return "exists";
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
      throw new Error("prepared_plan_record_must_be_direct_file");
    }
    if ((metadata.mode & 0o077) !== 0) {
      throw new Error("prepared_plan_record_must_be_private");
    }
    if (metadata.size < 2 || metadata.size > MAX_JSON_BYTES) {
      throw new Error("prepared_plan_record_size_out_of_range");
    }
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("prepared_plan_record_object_required");
    }
    return value as Record<string, unknown>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return null;
    throw error;
  }
}

function nonceFilename(nonce: number): string {
  return `${String(nonce).padStart(16, "0")}.json`;
}

function nonceFile(paths: PathsV1, nonce: number): string {
  return path.join(paths.nonces, nonceFilename(nonce));
}

function attemptFile(paths: PathsV1, attemptId: string): string {
  return path.join(paths.attempts, `${attemptId}.json`);
}

function buildRecord(
  input: NormalizedInputV1,
  nonce: number,
): BuyVoidPreparedTransactionPlanReservationV1 {
  const planFingerprint = fingerprint({
    transaction_template_fingerprint_sha256:
      input.transaction_template_fingerprint_sha256,
    nonce,
  });
  const reservationId = sha256(
    [
      "void-buy-prepared-transaction-plan-reservation-v1",
      input.wallet_key_sha256,
      String(nonce),
      input.attempt_id,
      planFingerprint,
    ].join("\n"),
  );
  return {
    schema: RECORD_SCHEMA,
    marker: VOID_BUY_VOID_PREPARED_TRANSACTION_PLAN_RESERVATION_V1,
    version: 1,
    reservation_id: reservationId,
    reserved_at_ms: input.now_ms,
    saga_id: input.saga_id,
    attempt_id: input.attempt_id,
    chain_id: "2050",
    wallet_address: input.wallet_address,
    wallet_key_sha256: input.wallet_key_sha256,
    nonce,
    delivery_address: input.delivery_address,
    native_value_wei: input.native_value_wei,
    gas_limit: input.gas_limit,
    max_fee_per_gas_wei: input.max_fee_per_gas_wei,
    max_priority_fee_per_gas_wei: input.max_priority_fee_per_gas_wei,
    economic_policy_fingerprint_sha256:
      input.economic_policy_fingerprint_sha256,
    preparation_policy_fingerprint_sha256:
      input.preparation_policy_fingerprint_sha256,
    transaction_template_fingerprint_sha256:
      input.transaction_template_fingerprint_sha256,
    transaction_plan_fingerprint_sha256: planFingerprint,
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
  "delivery_address",
  "native_value_wei",
  "gas_limit",
  "max_fee_per_gas_wei",
  "max_priority_fee_per_gas_wei",
  "economic_policy_fingerprint_sha256",
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

function parseRecord(
  value: Record<string, unknown>,
): BuyVoidPreparedTransactionPlanReservationV1 {
  exactKeys(value, RECORD_KEYS, "prepared_plan_record");
  if (
    value.schema !== RECORD_SCHEMA ||
    value.marker !== VOID_BUY_VOID_PREPARED_TRANSACTION_PLAN_RESERVATION_V1 ||
    value.version !== 1 ||
    !SHA256.test(String(value.reservation_id || "")) ||
    !Number.isSafeInteger(value.reserved_at_ms) ||
    Number(value.reserved_at_ms) <= 0 ||
    !SAGA_ID.test(String(value.saga_id || "")) ||
    !SHA256.test(String(value.attempt_id || "")) ||
    value.chain_id !== "2050" ||
    !ADDRESS.test(String(value.wallet_address || "")) ||
    !SHA256.test(String(value.wallet_key_sha256 || "")) ||
    !Number.isSafeInteger(value.nonce) ||
    Number(value.nonce) < 0 ||
    !ADDRESS.test(String(value.delivery_address || "")) ||
    parsePositiveInteger(value.native_value_wei) === null ||
    parsePositiveInteger(value.gas_limit) === null ||
    parsePositiveInteger(value.max_fee_per_gas_wei) === null ||
    parseNonNegativeInteger(value.max_priority_fee_per_gas_wei) === null ||
    !SHA256.test(String(value.economic_policy_fingerprint_sha256 || "")) ||
    !SHA256.test(String(value.preparation_policy_fingerprint_sha256 || "")) ||
    !SHA256.test(String(value.transaction_template_fingerprint_sha256 || "")) ||
    !SHA256.test(String(value.transaction_plan_fingerprint_sha256 || "")) ||
    value.reservation_status !== "reserved" ||
    value.nonce_release_authorized !== false ||
    value.credential_access_authorized !== false ||
    value.wallet_access_authorized !== false ||
    value.signing_authorized !== false ||
    value.transaction_broadcast_authorized !== false ||
    value.raw_signed_transaction_persisted !== false ||
    value.money_movement_authorized !== false
  ) {
    throw new Error("prepared_plan_record_invalid");
  }
  const record = value as unknown as BuyVoidPreparedTransactionPlanReservationV1;
  const rebuilt = buildRecord(
    {
      root_dir: "unused",
      saga_id: record.saga_id,
      attempt_id: record.attempt_id,
      chain_id: "2050",
      wallet_address: record.wallet_address,
      wallet_key_sha256: record.wallet_key_sha256,
      observed_pending_nonce: record.nonce,
      delivery_address: record.delivery_address,
      native_value_wei: record.native_value_wei,
      gas_limit: record.gas_limit,
      max_fee_per_gas_wei: record.max_fee_per_gas_wei,
      max_priority_fee_per_gas_wei: record.max_priority_fee_per_gas_wei,
      economic_policy_fingerprint_sha256:
        record.economic_policy_fingerprint_sha256,
      preparation_policy_fingerprint_sha256:
        record.preparation_policy_fingerprint_sha256,
      transaction_template_fingerprint_sha256:
        record.transaction_template_fingerprint_sha256,
      now_ms: record.reserved_at_ms,
    },
    record.nonce,
  );
  if (
    rebuilt.reservation_id !== record.reservation_id ||
    rebuilt.transaction_plan_fingerprint_sha256 !==
      record.transaction_plan_fingerprint_sha256
  ) {
    throw new Error("prepared_plan_record_fingerprint_mismatch");
  }
  return record;
}

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

function indexFor(
  record: BuyVoidPreparedTransactionPlanReservationV1,
): BuyVoidPreparedTransactionAttemptIndexV1 {
  return {
    schema: INDEX_SCHEMA,
    marker: VOID_BUY_VOID_PREPARED_TRANSACTION_PLAN_RESERVATION_V1,
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
): BuyVoidPreparedTransactionAttemptIndexV1 {
  exactKeys(value, INDEX_KEYS, "prepared_plan_attempt_index");
  if (
    value.schema !== INDEX_SCHEMA ||
    value.marker !== VOID_BUY_VOID_PREPARED_TRANSACTION_PLAN_RESERVATION_V1 ||
    value.version !== 1 ||
    !SHA256.test(String(value.attempt_id || "")) ||
    !SHA256.test(String(value.reservation_id || "")) ||
    !SHA256.test(String(value.wallet_key_sha256 || "")) ||
    !Number.isSafeInteger(value.nonce) ||
    Number(value.nonce) < 0 ||
    !SHA256.test(String(value.transaction_template_fingerprint_sha256 || "")) ||
    !SHA256.test(String(value.transaction_plan_fingerprint_sha256 || ""))
  ) {
    throw new Error("prepared_plan_attempt_index_invalid");
  }
  return value as unknown as BuyVoidPreparedTransactionAttemptIndexV1;
}

function assertCompatible(
  record: BuyVoidPreparedTransactionPlanReservationV1,
  input: NormalizedInputV1,
): void {
  if (
    record.saga_id !== input.saga_id ||
    record.attempt_id !== input.attempt_id ||
    record.wallet_address !== input.wallet_address ||
    record.wallet_key_sha256 !== input.wallet_key_sha256 ||
    record.delivery_address !== input.delivery_address ||
    record.native_value_wei !== input.native_value_wei ||
    record.gas_limit !== input.gas_limit ||
    record.max_fee_per_gas_wei !== input.max_fee_per_gas_wei ||
    record.max_priority_fee_per_gas_wei !==
      input.max_priority_fee_per_gas_wei ||
    record.economic_policy_fingerprint_sha256 !==
      input.economic_policy_fingerprint_sha256 ||
    record.preparation_policy_fingerprint_sha256 !==
      input.preparation_policy_fingerprint_sha256 ||
    record.transaction_template_fingerprint_sha256 !==
      input.transaction_template_fingerprint_sha256
  ) {
    throw new Error("prepared_plan_attempt_binding_conflict");
  }
}

function listRecords(
  paths: PathsV1,
): BuyVoidPreparedTransactionPlanReservationV1[] {
  const output: BuyVoidPreparedTransactionPlanReservationV1[] = [];
  for (const entry of fs.readdirSync(paths.nonces, { withFileTypes: true })) {
    if (!NONCE_FILE.test(entry.name)) {
      throw new Error("prepared_plan_nonce_directory_entry_invalid");
    }
    if (!entry.isFile() || entry.isSymbolicLink()) {
      throw new Error("prepared_plan_nonce_record_invalid");
    }
    const raw = readJsonObject(path.join(paths.nonces, entry.name));
    if (!raw) throw new Error("prepared_plan_nonce_record_missing");
    const record = parseRecord(raw);
    if (nonceFilename(record.nonce) !== entry.name) {
      throw new Error("prepared_plan_nonce_filename_mismatch");
    }
    output.push(record);
  }
  return output.sort((left, right) => left.nonce - right.nonce);
}

function validateIndexBinding(
  index: BuyVoidPreparedTransactionAttemptIndexV1,
  record: BuyVoidPreparedTransactionPlanReservationV1,
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
    throw new Error("prepared_plan_attempt_index_binding_mismatch");
  }
}

function publishAttemptIndex(
  paths: PathsV1,
  record: BuyVoidPreparedTransactionPlanReservationV1,
): boolean {
  const file = attemptFile(paths, record.attempt_id);
  const created = atomicCreateJson(file, indexFor(record));
  if (created === "created") return true;
  const raced = readJsonObject(file);
  if (!raced) throw new Error("prepared_plan_attempt_index_unreadable");
  const parsed = parseIndex(raced);
  validateIndexBinding(parsed, record);
  return false;
}

function recoverAttempt(
  paths: PathsV1,
  input: NormalizedInputV1,
): {
  record: BuyVoidPreparedTransactionPlanReservationV1 | null;
  recovered_index: boolean;
} {
  const indexRaw = readJsonObject(attemptFile(paths, input.attempt_id));
  if (indexRaw) {
    const index = parseIndex(indexRaw);
    const recordRaw = readJsonObject(nonceFile(paths, index.nonce));
    if (!recordRaw) throw new Error("prepared_plan_index_target_missing");
    const record = parseRecord(recordRaw);
    validateIndexBinding(index, record);
    assertCompatible(record, input);
    if (record.nonce < input.observed_pending_nonce) {
      throw new Error("prepared_plan_reserved_nonce_below_observed_pending");
    }
    const duplicateRecords = listRecords(paths).filter(
      (candidate) => candidate.attempt_id === input.attempt_id,
    );
    if (
      duplicateRecords.length !== 1 ||
      duplicateRecords[0].reservation_id !== record.reservation_id
    ) {
      throw new Error("prepared_plan_attempt_has_multiple_nonces");
    }
    return { record, recovered_index: false };
  }

  const matches = listRecords(paths).filter(
    (record) => record.attempt_id === input.attempt_id,
  );
  if (matches.length > 1) {
    throw new Error("prepared_plan_attempt_has_multiple_nonces");
  }
  if (matches.length === 0) {
    return { record: null, recovered_index: false };
  }
  const record = matches[0];
  assertCompatible(record, input);
  if (record.nonce < input.observed_pending_nonce) {
    throw new Error("prepared_plan_reserved_nonce_below_observed_pending");
  }
  const created = publishAttemptIndex(paths, record);
  return { record, recovered_index: created };
}

function success(
  status: "reserved" | "duplicate",
  reservation: BuyVoidPreparedTransactionPlanReservationV1,
  mutationPerformed: boolean,
  recoveredAttemptIndex: boolean,
): Extract<BuyVoidPreparedTransactionPlanReservationDecisionV1, { ok: true }> {
  return {
    ok: true,
    status,
    duplicate: status === "duplicate",
    recovered_attempt_index: recoveredAttemptIndex,
    reservation,
    mutation_performed: mutationPerformed,
    signing_performed: false,
    transaction_broadcast_performed: false,
    raw_signed_transaction_persisted: false,
    money_movement_performed: false,
  };
}

export function reserveBuyVoidPreparedTransactionPlanV1(
  input: BuyVoidPreparedTransactionPlanReservationInputV1,
): BuyVoidPreparedTransactionPlanReservationDecisionV1 {
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
            throw new Error("prepared_plan_nonce_space_exhausted");
          }
          const record = buildRecord(normalized, candidate);
          const created = atomicCreateJson(nonceFile(paths, candidate), record);
          if (created === "created") {
            publishAttemptIndex(paths, record);
            return success("reserved", record, true, false);
          }

          const occupiedRaw = readJsonObject(nonceFile(paths, candidate));
          if (!occupiedRaw) {
            throw new Error("prepared_plan_occupied_nonce_unreadable");
          }
          const occupied = parseRecord(occupiedRaw);
          if (occupied.attempt_id === normalized.attempt_id) {
            assertCompatible(occupied, normalized);
            if (occupied.nonce < normalized.observed_pending_nonce) {
              throw new Error(
                "prepared_plan_reserved_nonce_below_observed_pending",
              );
            }
            const recoveredSame = recoverAttempt(paths, normalized);
            if (!recoveredSame.record) {
              throw new Error("prepared_plan_same_attempt_recovery_failed");
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
        throw new Error("prepared_plan_nonce_probe_cap_reached");
      },
    );
  } catch (error) {
    return held("prepared_plan_reservation_failed", {
      message: String((error as Error)?.message || error).slice(0, 240),
    });
  }
}

export function listBuyVoidPreparedTransactionPlanReservationsV1(input: {
  root_dir: string;
  wallet_address: string;
}): BuyVoidPreparedTransactionPlanReservationV1[] {
  const wallet = normalizeAddress(input?.wallet_address);
  if (!wallet) throw new Error("prepared_plan_wallet_address_invalid");
  const root = String(input?.root_dir || "").trim();
  if (!root || !path.isAbsolute(root) || root.includes("\0")) {
    throw new Error("prepared_plan_root_must_be_absolute");
  }
  const normalized = normalizeInput({
    root_dir: root,
    saga_id: `voidbvfsg1_${"0".repeat(64)}`,
    attempt_id: "0".repeat(64),
    chain_id: "2050",
    wallet_address: wallet,
    observed_pending_nonce: 0,
    delivery_address: "0x0000000000000000000000000000000000000001",
    native_value_wei: 1,
    gas_limit: 1,
    max_fee_per_gas_wei: 1,
    max_priority_fee_per_gas_wei: 0,
    economic_policy_fingerprint_sha256: "0".repeat(64),
    preparation_policy_fingerprint_sha256: "0".repeat(64),
  });
  if ("reason" in normalized) throw new Error(String(normalized.reason));
  const paths = pathsFor(normalized);
  if (!fs.existsSync(paths.nonces)) return [];
  initializePaths(paths);
  return listRecords(paths);
}
