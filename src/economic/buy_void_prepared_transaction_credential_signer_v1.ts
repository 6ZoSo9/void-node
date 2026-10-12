import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Transaction, getAddress, keccak256 } from "ethers";
import {
  VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1,
  createBuyVoidNativeFulfillmentWalletCredentialSignerV1,
} from "./buy_void_native_fulfillment_wallet_credential_signer_v1.js";
import type {
  BuyVoidPreparedTransactionCustodianPrepareRequestV1,
} from "./buy_void_prepared_transaction_custody_v1.js";
import type {
  BuyVoidNativeDeliveryUnsignedTransactionV1,
} from "./buy_void_native_delivery_sign_broadcast_adapter_v1.js";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_CREDENTIAL_SIGNER_V1 =
  "VOID_BUY_VOID_PREPARED_TRANSACTION_CREDENTIAL_SIGNER_V1";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_CREDENTIAL_SIGNER_AUTHORITY_V1 = {
  source_only_contract: true,
  existing_fixed_systemd_credential_signer_reused: true,
  fixed_credential_id: true,
  credential_read_at_factory: false,
  credential_read_only_on_prepare: true,
  server_controlled_credentials_directory: true,
  server_controlled_expected_wallet: true,
  signer_fingerprint_public_derivation: true,
  deterministic_idempotency_key_required: true,
  private_idempotency_cache_required: true,
  idempotency_cache_inside_custodian_private_store: true,
  durable_cached_signed_bytes_before_success_return: true,
  duplicate_prepare_credential_read: false,
  deterministic_resign_after_crash_window_required: true,
  signed_transaction_independently_validated: true,
  raw_signed_transaction_application_visibility: false,
  raw_signed_transaction_ipc_output: false,
  raw_signed_transaction_private_store_only: true,
  runtime_route_mount: false,
  background_loop: false,
  startup_execution: false,
  rpc_call: false,
  transaction_broadcast: false,
  automatic_retry: false,
  money_movement: false,
} as const;

const RESULT_SCHEMA =
  "void_buy_void_prepared_transaction_credential_signer_result_v1";
const INTENT_SCHEMA =
  "void_buy_void_prepared_transaction_credential_signer_intent_v1";
const IDEMPOTENCY_DOMAIN = "void-buy-prepared-transaction-custody-v1";
const FINGERPRINT_DOMAIN =
  "void-buy-prepared-transaction-credential-signer-v1";
const SHA256 = /^[0-9a-f]{64}$/;
const SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const DECIMAL = /^(0|[1-9][0-9]*)$/;
const RAW = /^0x(?:[0-9a-fA-F]{2})+$/;
const MAX_JSON_BYTES = 512 * 1024;
const MAX_RAW_BYTES = 256 * 1024;

const REQUEST_KEYS = [
  "idempotency_key_sha256",
  "saga_id",
  "attempt_id",
  "plan_reservation_id",
  "transaction_plan_fingerprint_sha256",
  "chain_id",
  "wallet_address",
  "nonce",
  "delivery_address",
  "native_value_wei",
  "gas_limit",
  "max_fee_per_gas_wei",
  "max_priority_fee_per_gas_wei",
] as const;

const RECORD_KEYS = [
  "schema",
  "marker",
  "version",
  "recorded_at_ms",
  "request",
  "raw_signed_transaction",
  "raw_signed_transaction_sha256",
  "signed_transaction_hash",
  "wallet_address",
  "signer_fingerprint_sha256",
  "transaction_plan_fingerprint_sha256",
] as const;

export type BuyVoidPreparedTransactionCredentialSignerPolicyV1 = {
  credentials_directory: string;
  expected_wallet_address: string;
  idempotency_state_dir: string;
};

export type BuyVoidPreparedTransactionCredentialSignerResultV1 = {
  status: "prepared" | "duplicate";
  raw_signed_transaction: string;
  wallet_address: string;
  signer_fingerprint_sha256: string;
  transaction_plan_fingerprint_sha256: string;
};

export type BuyVoidPreparedTransactionCredentialSignerV1 = {
  prepare_once: (
    request: Readonly<BuyVoidPreparedTransactionCustodianPrepareRequestV1>,
  ) => Promise<BuyVoidPreparedTransactionCredentialSignerResultV1>;
  signer_fingerprint_sha256: string;
  authority:
    typeof VOID_BUY_VOID_PREPARED_TRANSACTION_CREDENTIAL_SIGNER_AUTHORITY_V1;
};

export type BuyVoidPreparedTransactionCredentialSignerFaultStageV1 =
  | "after_cache_intent_before_credential"
  | "after_credential_sign_before_cache_record";

export type BuyVoidPreparedTransactionCredentialSignerDependenciesV1 = {
  create_credential_signer?:
    typeof createBuyVoidNativeFulfillmentWalletCredentialSignerV1;
  fault_inject?: (
    stage: BuyVoidPreparedTransactionCredentialSignerFaultStageV1,
  ) => void | Promise<void>;
};

type NormalizedRequestV1 = {
  idempotency_key_sha256: string;
  saga_id: string;
  attempt_id: string;
  plan_reservation_id: string;
  transaction_plan_fingerprint_sha256: string;
  chain_id: "2050";
  wallet_address: string;
  nonce: number;
  delivery_address: string;
  native_value_wei: string;
  gas_limit: string;
  max_fee_per_gas_wei: string;
  max_priority_fee_per_gas_wei: string;
};

type CachedResultV1 = {
  schema: typeof RESULT_SCHEMA;
  marker: typeof VOID_BUY_VOID_PREPARED_TRANSACTION_CREDENTIAL_SIGNER_V1;
  version: 1;
  recorded_at_ms: number;
  request: NormalizedRequestV1;
  raw_signed_transaction: string;
  raw_signed_transaction_sha256: string;
  signed_transaction_hash: string;
  wallet_address: string;
  signer_fingerprint_sha256: string;
  transaction_plan_fingerprint_sha256: string;
};

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeAddress(value: unknown): string {
  const raw = String(value || "").trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) return "";
  try {
    const normalized = getAddress(raw).toLowerCase();
    return ADDRESS.test(normalized) ? normalized : "";
  } catch {
    return "";
  }
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

function directObject(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label}_object_required`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error(`${label}_prototype_invalid`);
  }
  return value as Record<string, unknown>;
}

function decimal(
  value: unknown,
  options: { positive?: boolean } = {},
): string {
  const raw = String(value ?? "").trim();
  if (!DECIMAL.test(raw)) return "";
  try {
    const parsed = BigInt(raw);
    if (options.positive ? parsed <= 0n : parsed < 0n) return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function absoluteNonRoot(value: unknown, label: string): string {
  const raw = String(value || "").trim();
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) {
    throw new Error(`${label}_absolute_path_required`);
  }
  const resolved = path.resolve(raw);
  if (resolved === path.parse(resolved).root) {
    throw new Error(`${label}_root_path_forbidden`);
  }
  return resolved;
}

function assertNoSymlinkAncestors(target: string, label: string): void {
  const resolved = path.resolve(target);
  const parsed = path.parse(resolved);
  let cursor = parsed.root;
  const relative = resolved.slice(parsed.root.length);
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, segment);
    try {
      const metadata = fs.lstatSync(cursor);
      if (metadata.isSymbolicLink()) {
        throw new Error(`${label}_symlink_ancestor_rejected`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return;
      throw error;
    }
  }
}

function assertDirectPrivateDirectory(
  directory: string,
  label: string,
): void {
  const metadata = fs.lstatSync(directory);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error(`${label}_must_be_direct_directory`);
  }
  if (
    typeof process.getuid === "function" &&
    metadata.uid !== process.getuid()
  ) {
    throw new Error(`${label}_owner_mismatch`);
  }
  if ((metadata.mode & 0o077) !== 0) {
    throw new Error(`${label}_must_be_private`);
  }
}

function ensurePrivateDirectory(
  directory: string,
  label: string,
): void {
  const resolved = path.resolve(directory);
  assertNoSymlinkAncestors(path.dirname(resolved), `${label}_parent`);
  fs.mkdirSync(resolved, { recursive: true, mode: 0o700 });
  const metadata = fs.lstatSync(resolved);
  if (metadata.isSymbolicLink()) {
    throw new Error(`${label}_symlink_rejected`);
  }
  fs.chmodSync(resolved, 0o700);
  assertDirectPrivateDirectory(resolved, label);
}

function fsyncDirectory(directory: string): void {
  const descriptor = fs.openSync(directory, "r");
  try {
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
}

function atomicCreateJson(
  file: string,
  value: unknown,
): "created" | "exists" {
  const parent = path.dirname(file);
  ensurePrivateDirectory(parent, "prepared_credential_signer_state_directory");
  const temporary = path.join(
    parent,
    `.${path.basename(file)}.tmp-${process.pid}-${crypto
      .randomBytes(8)
      .toString("hex")}`,
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

function readJson(file: string): Record<string, unknown> | null {
  try {
    const metadata = fs.lstatSync(file);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
      throw new Error("prepared_credential_signer_record_must_be_direct_file");
    }
    if (
      typeof process.getuid === "function" &&
      metadata.uid !== process.getuid()
    ) {
      throw new Error("prepared_credential_signer_record_owner_mismatch");
    }
    if ((metadata.mode & 0o077) !== 0) {
      throw new Error("prepared_credential_signer_record_must_be_private");
    }
    if (metadata.size < 2 || metadata.size > MAX_JSON_BYTES) {
      throw new Error("prepared_credential_signer_record_size_invalid");
    }
    return directObject(
      JSON.parse(fs.readFileSync(file, "utf8")),
      "prepared_credential_signer_record",
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return null;
    throw error;
  }
}

function normalizeRequest(
  raw: Readonly<BuyVoidPreparedTransactionCustodianPrepareRequestV1>,
  expectedWallet: string,
): NormalizedRequestV1 {
  const object = directObject(
    raw as unknown,
    "prepared_credential_signer_request",
  );
  exactKeys(
    object,
    REQUEST_KEYS,
    "prepared_credential_signer_request",
  );

  const sagaId = String(object.saga_id || "").trim().toLowerCase();
  const attemptId = String(object.attempt_id || "").trim().toLowerCase();
  const reservationId = String(object.plan_reservation_id || "")
    .trim()
    .toLowerCase();
  const planFingerprint = String(
    object.transaction_plan_fingerprint_sha256 || "",
  )
    .trim()
    .toLowerCase();
  const idempotencyKey = String(
    object.idempotency_key_sha256 || "",
  )
    .trim()
    .toLowerCase();
  const wallet = normalizeAddress(object.wallet_address);
  const delivery = normalizeAddress(object.delivery_address);
  const nonce = Number(object.nonce);
  const nativeValue = decimal(object.native_value_wei, { positive: true });
  const gasLimit = decimal(object.gas_limit, { positive: true });
  const maxFee = decimal(object.max_fee_per_gas_wei, { positive: true });
  const priorityFee = decimal(
    object.max_priority_fee_per_gas_wei,
    { positive: false },
  );

  if (
    !SAGA_ID.test(sagaId) ||
    !SHA256.test(attemptId) ||
    !SHA256.test(reservationId) ||
    !SHA256.test(planFingerprint) ||
    !SHA256.test(idempotencyKey) ||
    object.chain_id !== "2050" ||
    wallet !== expectedWallet ||
    !delivery ||
    !Number.isSafeInteger(nonce) ||
    nonce < 0 ||
    !nativeValue ||
    !gasLimit ||
    !maxFee ||
    !priorityFee ||
    BigInt(priorityFee) > BigInt(maxFee)
  ) {
    throw new Error("prepared_credential_signer_request_invalid");
  }

  const expectedIdempotency = sha256(
    [
      IDEMPOTENCY_DOMAIN,
      sagaId,
      attemptId,
      reservationId,
      planFingerprint,
    ].join("\n"),
  );
  if (idempotencyKey !== expectedIdempotency) {
    throw new Error("prepared_credential_signer_idempotency_key_mismatch");
  }

  return {
    idempotency_key_sha256: idempotencyKey,
    saga_id: sagaId,
    attempt_id: attemptId,
    plan_reservation_id: reservationId,
    transaction_plan_fingerprint_sha256: planFingerprint,
    chain_id: "2050",
    wallet_address: wallet,
    nonce,
    delivery_address: delivery,
    native_value_wei: nativeValue,
    gas_limit: gasLimit,
    max_fee_per_gas_wei: maxFee,
    max_priority_fee_per_gas_wei: priorityFee,
  };
}

function sameRequest(
  left: NormalizedRequestV1,
  right: NormalizedRequestV1,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function renderUnsignedTransaction(
  request: NormalizedRequestV1,
): BuyVoidNativeDeliveryUnsignedTransactionV1 {
  return {
    type: 2,
    chainId: 2050n,
    nonce: request.nonce,
    gasLimit: BigInt(request.gas_limit),
    maxFeePerGas: BigInt(request.max_fee_per_gas_wei),
    maxPriorityFeePerGas:
      BigInt(request.max_priority_fee_per_gas_wei),
    to: request.delivery_address,
    value: BigInt(request.native_value_wei),
    data: "0x",
  };
}

function validateSignedTransaction(
  raw: unknown,
  request: NormalizedRequestV1,
): { raw: string; hash: string } {
  const signed = String(raw || "").trim();
  if (
    !RAW.test(signed) ||
    (signed.length - 2) / 2 > MAX_RAW_BYTES
  ) {
    throw new Error("prepared_credential_signer_raw_transaction_invalid");
  }

  let transaction: Transaction;
  try {
    transaction = Transaction.from(signed);
  } catch {
    throw new Error("prepared_credential_signer_transaction_decode_failed");
  }

  const from = normalizeAddress(transaction.from);
  const to = normalizeAddress(transaction.to);
  const accessList = transaction.accessList || [];
  const hash = String(transaction.hash || "").toLowerCase();
  const independentlyComputedHash = keccak256(signed).toLowerCase();

  if (
    transaction.type !== 2 ||
    transaction.chainId !== 2050n ||
    transaction.nonce !== request.nonce ||
    transaction.gasLimit !== BigInt(request.gas_limit) ||
    transaction.maxFeePerGas !== BigInt(request.max_fee_per_gas_wei) ||
    transaction.maxPriorityFeePerGas !==
      BigInt(request.max_priority_fee_per_gas_wei) ||
    to !== request.delivery_address ||
    transaction.value !== BigInt(request.native_value_wei) ||
    transaction.data !== "0x" ||
    !Array.isArray(accessList) ||
    accessList.length !== 0 ||
    from !== request.wallet_address ||
    hash !== independentlyComputedHash ||
    !/^0x[0-9a-f]{64}$/.test(hash)
  ) {
    throw new Error("prepared_credential_signer_transaction_binding_invalid");
  }

  return { raw: signed, hash };
}

function intentFile(stateDir: string, key: string): string {
  return path.join(stateDir, "intents", `${key}.json`);
}

function recordFile(stateDir: string, key: string): string {
  return path.join(stateDir, "records", `${key}.json`);
}

function ensureState(stateDir: string): void {
  for (const directory of [
    stateDir,
    path.join(stateDir, "intents"),
    path.join(stateDir, "records"),
  ]) {
    ensurePrivateDirectory(
      directory,
      "prepared_credential_signer_state_directory",
    );
  }
}

function readIntent(
  stateDir: string,
  request: NormalizedRequestV1,
): NormalizedRequestV1 | null {
  const value = readJson(intentFile(stateDir, request.idempotency_key_sha256));
  if (!value) return null;
  exactKeys(
    value,
    ["schema", "marker", "version", "recorded_at_ms", "request"],
    "prepared_credential_signer_intent",
  );
  if (
    value.schema !== INTENT_SCHEMA ||
    value.marker !==
      VOID_BUY_VOID_PREPARED_TRANSACTION_CREDENTIAL_SIGNER_V1 ||
    value.version !== 1 ||
    !Number.isSafeInteger(value.recorded_at_ms) ||
    Number(value.recorded_at_ms) <= 0
  ) {
    throw new Error("prepared_credential_signer_intent_invalid");
  }
  const stored = normalizeRequest(
    value.request as BuyVoidPreparedTransactionCustodianPrepareRequestV1,
    request.wallet_address,
  );
  if (!sameRequest(stored, request)) {
    throw new Error("prepared_credential_signer_intent_conflict");
  }
  return stored;
}

function validateCachedResult(
  value: Record<string, unknown>,
  request: NormalizedRequestV1,
  signerFingerprint: string,
): CachedResultV1 {
  exactKeys(
    value,
    RECORD_KEYS,
    "prepared_credential_signer_cached_result",
  );
  if (
    value.schema !== RESULT_SCHEMA ||
    value.marker !==
      VOID_BUY_VOID_PREPARED_TRANSACTION_CREDENTIAL_SIGNER_V1 ||
    value.version !== 1 ||
    !Number.isSafeInteger(value.recorded_at_ms) ||
    Number(value.recorded_at_ms) <= 0 ||
    value.wallet_address !== request.wallet_address ||
    value.signer_fingerprint_sha256 !== signerFingerprint ||
    value.transaction_plan_fingerprint_sha256 !==
      request.transaction_plan_fingerprint_sha256
  ) {
    throw new Error("prepared_credential_signer_cached_result_invalid");
  }

  const storedRequest = normalizeRequest(
    value.request as BuyVoidPreparedTransactionCustodianPrepareRequestV1,
    request.wallet_address,
  );
  if (!sameRequest(storedRequest, request)) {
    throw new Error("prepared_credential_signer_cached_request_conflict");
  }

  const validated = validateSignedTransaction(
    value.raw_signed_transaction,
    request,
  );
  if (
    value.raw_signed_transaction_sha256 !==
      sha256(validated.raw.toLowerCase()) ||
    value.signed_transaction_hash !== validated.hash
  ) {
    throw new Error("prepared_credential_signer_cached_payload_conflict");
  }

  return value as unknown as CachedResultV1;
}

function readCachedResult(
  stateDir: string,
  request: NormalizedRequestV1,
  signerFingerprint: string,
): CachedResultV1 | null {
  const value = readJson(recordFile(stateDir, request.idempotency_key_sha256));
  return value
    ? validateCachedResult(value, request, signerFingerprint)
    : null;
}

function result(
  record: CachedResultV1,
  status: "prepared" | "duplicate",
): BuyVoidPreparedTransactionCredentialSignerResultV1 {
  return {
    status,
    raw_signed_transaction: record.raw_signed_transaction,
    wallet_address: record.wallet_address,
    signer_fingerprint_sha256: record.signer_fingerprint_sha256,
    transaction_plan_fingerprint_sha256:
      record.transaction_plan_fingerprint_sha256,
  };
}

async function invokeFault(
  dependencies: BuyVoidPreparedTransactionCredentialSignerDependenciesV1,
  stage: BuyVoidPreparedTransactionCredentialSignerFaultStageV1,
): Promise<void> {
  if (typeof dependencies.fault_inject === "function") {
    await dependencies.fault_inject(stage);
  }
}

export function buyVoidPreparedTransactionCredentialSignerFingerprintV1(
  expectedWalletAddress: string,
): string {
  const wallet = normalizeAddress(expectedWalletAddress);
  if (!wallet) {
    throw new Error("prepared_credential_signer_expected_wallet_invalid");
  }
  return sha256(
    [
      FINGERPRINT_DOMAIN,
      `credential_id=${VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1}`,
      `wallet_address=${wallet}`,
    ].join("\n"),
  );
}

export function createBuyVoidPreparedTransactionCredentialSignerV1(
  policy: Readonly<BuyVoidPreparedTransactionCredentialSignerPolicyV1>,
  dependencies: BuyVoidPreparedTransactionCredentialSignerDependenciesV1 = {},
): BuyVoidPreparedTransactionCredentialSignerV1 {
  const credentialsDirectory = absoluteNonRoot(
    policy?.credentials_directory,
    "prepared_credential_signer_credentials_directory",
  );
  const stateDir = absoluteNonRoot(
    policy?.idempotency_state_dir,
    "prepared_credential_signer_state_dir",
  );
  const expectedWallet = normalizeAddress(policy?.expected_wallet_address);
  if (!expectedWallet) {
    throw new Error("prepared_credential_signer_expected_wallet_invalid");
  }

  const signerFingerprint =
    buyVoidPreparedTransactionCredentialSignerFingerprintV1(
      expectedWallet,
    );
  const createCredentialSigner =
    dependencies.create_credential_signer ||
    createBuyVoidNativeFulfillmentWalletCredentialSignerV1;
  const locks = new Map<string, Promise<void>>();

  async function withKeyLock<T>(
    key: string,
    action: () => Promise<T>,
  ): Promise<T> {
    const previous = locks.get(key) || Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const chain = previous.then(() => gate);
    locks.set(key, chain);
    await previous;
    try {
      return await action();
    } finally {
      release();
      if (locks.get(key) === chain) locks.delete(key);
    }
  }

  async function prepareOnce(
    rawRequest: Readonly<BuyVoidPreparedTransactionCustodianPrepareRequestV1>,
  ): Promise<BuyVoidPreparedTransactionCredentialSignerResultV1> {
    const request = normalizeRequest(rawRequest, expectedWallet);

    return withKeyLock(request.idempotency_key_sha256, async () => {
      ensureState(stateDir);

      const cached = readCachedResult(
        stateDir,
        request,
        signerFingerprint,
      );
      if (cached) return result(cached, "duplicate");

      const intent = {
        schema: INTENT_SCHEMA,
        marker:
          VOID_BUY_VOID_PREPARED_TRANSACTION_CREDENTIAL_SIGNER_V1,
        version: 1,
        recorded_at_ms: Date.now(),
        request,
      };
      atomicCreateJson(
        intentFile(stateDir, request.idempotency_key_sha256),
        intent,
      );
      readIntent(stateDir, request);

      await invokeFault(
        dependencies,
        "after_cache_intent_before_credential",
      );

      assertNoSymlinkAncestors(
        credentialsDirectory,
        "prepared_credential_signer_credentials_directory",
      );
      const credentialDecision = createCredentialSigner({
        credentials_directory: credentialsDirectory,
        expected_wallet_address: expectedWallet,
      });
      if ("reason" in credentialDecision) {
        throw new Error(
          `prepared_credential_signer_credential_${credentialDecision.reason}`,
        );
      }

      const observedAddress = normalizeAddress(
        await credentialDecision.signer.get_address(),
      );
      if (observedAddress !== expectedWallet) {
        throw new Error(
          "prepared_credential_signer_credential_wallet_mismatch",
        );
      }

      const rawSigned = await credentialDecision.signer.sign_transaction(
        renderUnsignedTransaction(request),
      );
      const validated = validateSignedTransaction(rawSigned, request);

      await invokeFault(
        dependencies,
        "after_credential_sign_before_cache_record",
      );

      const record: CachedResultV1 = {
        schema: RESULT_SCHEMA,
        marker:
          VOID_BUY_VOID_PREPARED_TRANSACTION_CREDENTIAL_SIGNER_V1,
        version: 1,
        recorded_at_ms: Date.now(),
        request,
        raw_signed_transaction: validated.raw,
        raw_signed_transaction_sha256: sha256(
          validated.raw.toLowerCase(),
        ),
        signed_transaction_hash: validated.hash,
        wallet_address: expectedWallet,
        signer_fingerprint_sha256: signerFingerprint,
        transaction_plan_fingerprint_sha256:
          request.transaction_plan_fingerprint_sha256,
      };

      const created = atomicCreateJson(
        recordFile(stateDir, request.idempotency_key_sha256),
        record,
      );
      const durable = readCachedResult(
        stateDir,
        request,
        signerFingerprint,
      );
      if (!durable) {
        throw new Error(
          "prepared_credential_signer_cached_result_missing",
        );
      }
      if (
        durable.raw_signed_transaction !== record.raw_signed_transaction ||
        durable.signed_transaction_hash !== record.signed_transaction_hash
      ) {
        throw new Error(
          "prepared_credential_signer_nondeterministic_signature_conflict",
        );
      }

      return result(
        durable,
        created === "created" ? "prepared" : "duplicate",
      );
    });
  }

  return {
    prepare_once: prepareOnce,
    signer_fingerprint_sha256: signerFingerprint,
    authority:
      VOID_BUY_VOID_PREPARED_TRANSACTION_CREDENTIAL_SIGNER_AUTHORITY_V1,
  };
}
