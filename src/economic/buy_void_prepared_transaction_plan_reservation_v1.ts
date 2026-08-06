import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_PLAN_RESERVATION_V1 =
  "VOID_BUY_VOID_PREPARED_TRANSACTION_PLAN_RESERVATION_V1";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_PLAN_RESERVATION_AUTHORITY_V1 = {
  source_only_contract: true,
  one_wallet_nonce_per_reservation: true,
  immutable_nonce_claim: true,
  atomic_nonce_publication: true,
  crash_recoverable_attempt_index: true,
  concurrent_attempt_collision_safe: true,
  observed_pending_nonce_is_floor_only: true,
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

function normalizeAddress(value: unknown): string {
  const address = String(value || "").trim().toLowerCase();
  return ADDRESS.test(address) ? address : "";
}

function parseNonNegativeInteger(value: unknown): bigint | null {
  if (typeof value === "bigint") return value >= 0n ? value : null;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) return null;
    return BigInt(value);
  }
  const raw = String(value ?? "").trim();
  if (!DECIMAL.test(raw)) return null;
  try {
    return BigInt(raw);
  } catch (error) {
    void error;
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
  const observedNonceNumber = observedNonce === null
    ? null
    : safeNumber(observedNonce);
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
  if (typeof process.getuid === "function" && metadata.uid !== process.getuid()) {
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
  };
}

function initializePaths(paths: PathsV1): void {
  for (const directory of [
    paths.root,
    paths.wallets,
    paths.wallet,
    paths.nonces,
    paths.attempts,
  ]) ensurePrivateDirectory(directory);
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
    `.${path.basename(file)}.tmp-${process.pid}-${crypto.randomBytes(8).toString("hex")}`,
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

function readJsonObject(file: string): Record<string, any> | null {
  try {
    const metadata = fs.lstatSync(file);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
      throw new Error("prepared_plan_record_must_be_direct_file");
    }
    if (metadata.size < 2 || metadata.size > MAX_JSON_BYTES) {
      throw new Error("prepared_plan_record_size_out_of_range");
    }
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("prepared_plan_record_object_required");
    }
    return value as Record<string, any>;
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
  const plan = {
    transaction_template_fingerprint_sha256:
      input.transaction_template_fingerprint_sha256,
    nonce,
  };
  const planFingerprint = fingerprint(plan);
  const reservationId = sha256([
    "void-buy-prepared-transaction-plan-reservation-v1",
    input.wallet_key_sha256,
    String(nonce),
    input.attempt_id,
    planFingerprint,
  ].join("\n"));
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

function parseRecord(value: Record<string, any>): BuyVoidPreparedTransactionPlanReservationV1 {
  if (
    value.schema !== RECORD_SCHEMA ||
    value.marker !== VOID_BUY_VOID_PREPARED_TRANSACTION_PLAN_RESERVATION_V1 ||
    value.version !== 1 ||
    !SHA256.test(String(value.reservation_id || "")) ||
    !SAGA_ID.test(String(value.saga_id || "")) ||
    !SHA256.test(String(value.attempt_id || "")) ||
    value.chain_id !== "2050" ||
    !ADDRESS.test(String(value.wallet_address || "")) ||
    !SHA256.test(String(value.wallet_key_sha256 || "")) ||
    !Number.isSafeInteger(value.nonce) ||
    value.nonce < 0 ||
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
  const expected = buildRecord({
    root_dir: "unused",
    saga_id: value.saga_id,
    attempt_id: value.attempt_id,
    chain_id: "2050",
    wallet_address: value.wallet_address,
    wallet_key_sha256: value.wallet_key_sha256,
    observed_pending_nonce: value.nonce,
    delivery_address: value.delivery_address,
    native_value_wei: String(value.native_value_wei),
    gas_limit: String(value.gas_limit),
    max_fee_per_gas_wei: String(value.max_fee_per_gas_wei),
    max_priority_fee_per_gas_wei: String(value.max_priority_fee_per_gas_wei),
    economic_policy_fingerprint_sha256:
      value.economic_policy_fingerprint_sha256,
    preparation_policy_fingerprint_sha256:
      value.preparation_policy_fingerprint_sha256,
    transaction_template_fingerprint_sha256:
      value.transaction_template_fingerprint_sha256,
    now_ms: value.reserved_at_ms,
  }, value.nonce);
  if (
    expected.reservation_id !== value.reservation_id ||
    expected.transaction_plan_fingerprint_sha256 !==
      value.transaction_plan_fingerprint_sha256
  ) {
    throw new Error("prepared_plan_record_fingerprint_mismatch");
  }
  return value as BuyVoidPreparedTransactionPlanReservationV1;
}

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

function parseIndex(value: Record<string, any>): BuyVoidPreparedTransactionAttemptIndexV1 {
  if (
    value.schema !== INDEX_SCHEMA ||
    value.marker !== VOID_BUY_VOID_PREPARED_TRANSACTION_PLAN_RESERVATION_V1 ||
    value.version !== 1 ||
    !SHA256.test(String(value.attempt_id || "")) ||
    !SHA256.test(String(value.reservation_id || "")) ||
    !SHA256.test(String(value.wallet_key_sha256 || "")) ||
    !Number.isSafeInteger(value.nonce) ||
    value.nonce < 0 ||
    !SHA256.test(String(value.transaction_template_fingerprint_sha256 || "")) ||
    !SHA256.test(String(value.transaction_plan_fingerprint_sha256 || ""))
  ) {
    throw new Error("prepared_plan_attempt_index_invalid");
  }
  return value as BuyVoidPreparedTransactionAttemptIndexV1;
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

function listRecords(paths: PathsV1): BuyVoidPreparedTransactionPlanReservationV1[] {
  const output: BuyVoidPreparedTransactionPlanReservationV1[] = [];
  for (const name of fs.readdirSync(paths.nonces).sort()) {
    if (!/^[0-9]{16}\.json$/.test(name)) continue;
    const raw = readJsonObject(path.join(paths.nonces, name));
    if (!raw) continue;
    const record = parseRecord(raw);
    if (nonceFilename(record.nonce) !== name) {
      throw new Error("prepared_plan_nonce_filename_mismatch");
    }
    output.push(record);
  }
  return output;
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
    if (
      index.attempt_id !== record.attempt_id ||
      index.reservation_id !== record.reservation_id ||
      index.wallet_key_sha256 !== record.wallet_key_sha256 ||
      index.transaction_template_fingerprint_sha256 !==
        record.transaction_template_fingerprint_sha256 ||
      index.transaction_plan_fingerprint_sha256 !==
        record.transaction_plan_fingerprint_sha256
    ) {
      throw new Error("prepared_plan_attempt_index_binding_mismatch");
    }
    assertCompatible(record, input);
    return { record, recovered_index: false };
  }

  const matches = listRecords(paths).filter(
    (record) => record.attempt_id === input.attempt_id,
  );
  if (matches.length > 1) throw new Error("prepared_plan_attempt_has_multiple_nonces");
  if (matches.length === 0) return { record: null, recovered_index: false };
  const record = matches[0];
  assertCompatible(record, input);
  const created = atomicCreateJson(
    attemptFile(paths, input.attempt_id),
    indexFor(record),
  );
  if (created === "exists") {
    const raced = readJsonObject(attemptFile(paths, input.attempt_id));
    if (!raced) throw new Error("prepared_plan_attempt_index_race_unreadable");
    const parsed = parseIndex(raced);
    if (parsed.reservation_id !== record.reservation_id) {
      throw new Error("prepared_plan_attempt_index_race_conflict");
    }
  }
  return { record, recovered_index: true };
}

export function reserveBuyVoidPreparedTransactionPlanV1(
  input: BuyVoidPreparedTransactionPlanReservationInputV1,
): BuyVoidPreparedTransactionPlanReservationDecisionV1 {
  const normalized = normalizeInput(input);
  if ("reason" in normalized) return normalized;

  try {
    const paths = pathsFor(normalized);
    initializePaths(paths);
    const recovered = recoverAttempt(paths, normalized);
    if (recovered.record) {
      return {
        ok: true,
        status: "duplicate",
        duplicate: true,
        recovered_attempt_index: recovered.recovered_index,
        reservation: recovered.record,
        mutation_performed: recovered.recovered_index,
        signing_performed: false,
        transaction_broadcast_performed: false,
        raw_signed_transaction_persisted: false,
        money_movement_performed: false,
      };
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
        return held("prepared_plan_nonce_space_exhausted");
      }
      const record = buildRecord(normalized, candidate);
      const created = atomicCreateJson(nonceFile(paths, candidate), record);
      if (created === "created") {
        const indexCreated = atomicCreateJson(
          attemptFile(paths, normalized.attempt_id),
          indexFor(record),
        );
        if (indexCreated === "exists") {
          const raced = readJsonObject(attemptFile(paths, normalized.attempt_id));
          if (!raced) throw new Error("prepared_plan_attempt_index_unreadable");
          const parsed = parseIndex(raced);
          if (parsed.reservation_id !== record.reservation_id) {
            throw new Error("prepared_plan_attempt_index_conflict_after_nonce_claim");
          }
        }
        return {
          ok: true,
          status: "reserved",
          duplicate: false,
          recovered_attempt_index: false,
          reservation: record,
          mutation_performed: true,
          signing_performed: false,
          transaction_broadcast_performed: false,
          raw_signed_transaction_persisted: false,
          money_movement_performed: false,
        };
      }

      const occupiedRaw = readJsonObject(nonceFile(paths, candidate));
      if (!occupiedRaw) throw new Error("prepared_plan_occupied_nonce_unreadable");
      const occupied = parseRecord(occupiedRaw);
      if (occupied.attempt_id === normalized.attempt_id) {
        assertCompatible(occupied, normalized);
        const recoveredIndex = recoverAttempt(paths, normalized);
        if (!recoveredIndex.record) {
          throw new Error("prepared_plan_same_attempt_recovery_failed");
        }
        return {
          ok: true,
          status: "duplicate",
          duplicate: true,
          recovered_attempt_index: recoveredIndex.recovered_index,
          reservation: recoveredIndex.record,
          mutation_performed: recoveredIndex.recovered_index,
          signing_performed: false,
          transaction_broadcast_performed: false,
          raw_signed_transaction_persisted: false,
          money_movement_performed: false,
        };
      }

      const sameAttemptElsewhere = recoverAttempt(paths, normalized);
      if (sameAttemptElsewhere.record) {
        return {
          ok: true,
          status: "duplicate",
          duplicate: true,
          recovered_attempt_index: sameAttemptElsewhere.recovered_index,
          reservation: sameAttemptElsewhere.record,
          mutation_performed: sameAttemptElsewhere.recovered_index,
          signing_performed: false,
          transaction_broadcast_performed: false,
          raw_signed_transaction_persisted: false,
          money_movement_performed: false,
        };
      }
      candidate += 1;
    }
    return held("prepared_plan_nonce_probe_cap_reached", {
      max_nonce_probes: MAX_NONCE_PROBES,
    });
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
  if (!root || !path.isAbsolute(root)) {
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
  if ("reason" in normalized) throw new Error(normalized.reason);
  const paths = pathsFor(normalized);
  if (!fs.existsSync(paths.nonces)) return [];
  return listRecords(paths);
}
