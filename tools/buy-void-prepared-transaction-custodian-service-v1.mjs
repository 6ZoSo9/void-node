import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Transaction, keccak256 } from "ethers";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_SERVICE_V1 =
  "VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_SERVICE_V1";
export const VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_IPC_V1 =
  "VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_IPC_V1";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_SERVICE_AUTHORITY_V1 =
  Object.freeze({
    source_only_service: true,
    cli_activation: false,
    unix_socket_only: true,
    socket_mode_0600: true,
    store_mode_0700: true,
    record_mode_0600: true,
    signer_dependency_injected: true,
    signer_prepare_once_idempotency_required: true,
    signer_result_exact_schema_required: true,
    deterministic_idempotency_key_required: true,
    server_controlled_signer_fingerprint_required: true,
    signed_transaction_independently_decoded: true,
    signed_transaction_plan_binding_required: true,
    signed_transaction_sender_binding_required: true,
    durable_intent_before_signer: true,
    retry_after_ambiguous_signer_result_uses_same_idempotency_key: true,
    raw_signed_transaction_private_store_only: true,
    raw_signed_transaction_ipc_output: false,
    prepare_once_idempotent: true,
    inspect_prepared_read_only: true,
    durable_record_before_success_reply: true,
    transaction_broadcast_interface: false,
    application_private_key_access: false,
    application_wallet_access: false,
    automatic_retry: false,
    money_movement: false,
  });

const REQUEST_SCHEMA =
  "void_buy_void_prepared_transaction_custodian_ipc_request_v1";
const RESPONSE_SCHEMA =
  "void_buy_void_prepared_transaction_custodian_ipc_response_v1";
const INTENT_SCHEMA =
  "void_buy_void_prepared_transaction_custodian_service_intent_v1";
const RECORD_SCHEMA =
  "void_buy_void_prepared_transaction_custodian_service_record_v1";
const SHA256 = /^[0-9a-f]{64}$/;
const IDEMPOTENCY_DOMAIN = "void-buy-prepared-transaction-custody-v1";
const SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const RAW = /^0x(?:[0-9a-fA-F]{2})+$/;
const HANDLE = /^custody:void-buy:[A-Za-z0-9._:@/-]{1,220}$/;
const MAX_REQUEST_BYTES = 64 * 1024;
const MAX_RECORD_BYTES = 768 * 1024;
const MAX_RAW_BYTES = 256 * 1024;
const PREPARE_KEYS = Object.freeze([
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
]);
const INSPECT_KEYS = Object.freeze([
  "idempotency_key_sha256",
  "attempt_id",
  "custody_handle",
]);
const SIGNER_KEYS = Object.freeze([
  "status",
  "raw_signed_transaction",
  "wallet_address",
  "signer_fingerprint_sha256",
  "transaction_plan_fingerprint_sha256",
]);
const INTENT_KEYS = Object.freeze([
  "schema",
  "marker",
  "version",
  "recorded_at_ms",
  ...PREPARE_KEYS,
  "signing_state",
  "transaction_broadcast_authorized",
  "money_movement_authorized",
]);
const RECORD_KEYS = Object.freeze([
  "schema",
  "marker",
  "version",
  "recorded_at_ms",
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
  "custody_handle",
  "signed_transaction_hash",
  "signer_fingerprint_sha256",
  "raw_signed_transaction",
  "raw_signed_transaction_sha256",
  "transaction_broadcast_authorized",
  "money_movement_authorized",
]);

function directObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label}_object_required`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error(`${label}_prototype_invalid`);
  }
  return value;
}

function exactKeys(value, expected, label) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label}_keys_invalid`);
  }
}

function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizedAddress(value) {
  const address = String(value || "").trim().toLowerCase();
  return ADDRESS.test(address) ? address : "";
}

function decimal(value, { positive = false } = {}) {
  const raw = String(value ?? "").trim();
  if (!/^(0|[1-9][0-9]*)$/.test(raw)) return "";
  try {
    const parsed = BigInt(raw);
    if (positive ? parsed <= 0n : parsed < 0n) return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function assertNoSymlinkAncestors(target, label) {
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
      if (error?.code === "ENOENT") return;
      throw error;
    }
  }
}

function assertPrivateDirectory(directory) {
  const metadata = fs.lstatSync(directory);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error("prepared_custodian_service_directory_must_be_direct");
  }
  if (
    typeof process.getuid === "function" &&
    metadata.uid !== process.getuid()
  ) {
    throw new Error("prepared_custodian_service_directory_owner_mismatch");
  }
  if ((metadata.mode & 0o077) !== 0) {
    throw new Error("prepared_custodian_service_directory_must_be_private");
  }
}

function ensurePrivateDirectory(directory) {
  const resolved = path.resolve(directory);
  const parent = path.dirname(resolved);
  assertNoSymlinkAncestors(parent, "prepared_custodian_service_directory");
  const parentMetadata = fs.lstatSync(parent);
  if (!parentMetadata.isDirectory() || parentMetadata.isSymbolicLink()) {
    throw new Error("prepared_custodian_service_parent_must_be_direct_directory");
  }
  try {
    assertPrivateDirectory(resolved);
    return;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  try {
    fs.mkdirSync(resolved, { recursive: false, mode: 0o700 });
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
  }
  assertPrivateDirectory(resolved);
}

function assertPrivateRecordFile(file) {
  const metadata = fs.lstatSync(file);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error("prepared_custodian_service_record_must_be_direct_file");
  }
  if (
    typeof process.getuid === "function" &&
    metadata.uid !== process.getuid()
  ) {
    throw new Error("prepared_custodian_service_record_owner_mismatch");
  }
  if ((metadata.mode & 0o077) !== 0) {
    throw new Error("prepared_custodian_service_record_must_be_private");
  }
  if (metadata.size < 2 || metadata.size > MAX_RECORD_BYTES) {
    throw new Error("prepared_custodian_service_record_size_invalid");
  }
}

function fsyncDirectory(directory) {
  const descriptor = fs.openSync(directory, "r");
  try {
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
}

function atomicCreateJson(file, value) {
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
      if (error?.code === "EEXIST") return "exists";
      throw error;
    }
  } finally {
    try {
      fs.unlinkSync(temporary);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
}

function intentFile(storeDir, key) {
  return path.join(storeDir, "intents", `${key}.json`);
}

function recordFile(storeDir, key) {
  return path.join(storeDir, "records", `${key}.json`);
}

function readPrivateJson(file, label) {
  try {
    const parent = path.dirname(file);
    assertNoSymlinkAncestors(parent, `${label}_directory`);
    assertPrivateDirectory(parent);
    assertPrivateRecordFile(file);
    return directObject(JSON.parse(fs.readFileSync(file, "utf8")), label);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function readIntent(storeDir, key) {
  const value = readPrivateJson(
    intentFile(storeDir, key),
    "prepared_custodian_service_intent",
  );
  return value ? parseIntent(value) : null;
}

function readRecord(storeDir, key, expectedSignerFingerprint) {
  const value = readPrivateJson(
    recordFile(storeDir, key),
    "prepared_custodian_service_record",
  );
  return value ? parseRecord(value, expectedSignerFingerprint) : null;
}

function normalizePrepareRequest(raw) {
  const request = directObject(raw, "prepared_custodian_prepare_request");
  exactKeys(request, PREPARE_KEYS, "prepared_custodian_prepare_request");
  const idempotencyKey = String(
    request.idempotency_key_sha256 || "",
  ).trim().toLowerCase();
  const sagaId = String(request.saga_id || "").trim();
  const attemptId = String(request.attempt_id || "").trim().toLowerCase();
  const planReservationId = String(
    request.plan_reservation_id || "",
  ).trim().toLowerCase();
  const planFingerprint = String(
    request.transaction_plan_fingerprint_sha256 || "",
  ).trim().toLowerCase();
  const wallet = normalizedAddress(request.wallet_address);
  const delivery = normalizedAddress(request.delivery_address);
  const nativeValue = decimal(request.native_value_wei, { positive: true });
  const gasLimit = decimal(request.gas_limit, { positive: true });
  const maxFee = decimal(request.max_fee_per_gas_wei, { positive: true });
  const priority = decimal(request.max_priority_fee_per_gas_wei);
  const expectedIdempotencyKey = sha256(
    [
      IDEMPOTENCY_DOMAIN,
      sagaId,
      attemptId,
      planReservationId,
      planFingerprint,
    ].join("\n"),
  );
  if (
    idempotencyKey !== expectedIdempotencyKey ||
    !SAGA_ID.test(sagaId) ||
    !SHA256.test(attemptId) ||
    !SHA256.test(planReservationId) ||
    !SHA256.test(planFingerprint) ||
    request.chain_id !== "2050" ||
    !wallet ||
    !delivery ||
    wallet === delivery ||
    !Number.isSafeInteger(request.nonce) ||
    Number(request.nonce) < 0 ||
    !nativeValue ||
    !gasLimit ||
    !maxFee ||
    priority === "" ||
    BigInt(priority) > BigInt(maxFee)
  ) {
    throw new Error("prepared_custodian_prepare_request_invalid");
  }
  return Object.freeze({
    idempotency_key_sha256: idempotencyKey,
    saga_id: sagaId,
    attempt_id: attemptId,
    plan_reservation_id: planReservationId,
    transaction_plan_fingerprint_sha256: planFingerprint,
    chain_id: "2050",
    wallet_address: wallet,
    nonce: Number(request.nonce),
    delivery_address: delivery,
    native_value_wei: nativeValue,
    gas_limit: gasLimit,
    max_fee_per_gas_wei: maxFee,
    max_priority_fee_per_gas_wei: priority,
  });
}

function normalizeInspectRequest(raw) {
  const request = directObject(raw, "prepared_custodian_inspect_request");
  exactKeys(request, INSPECT_KEYS, "prepared_custodian_inspect_request");
  const key = String(request.idempotency_key_sha256 || "").trim().toLowerCase();
  const attemptId = String(request.attempt_id || "").trim().toLowerCase();
  const handle = String(request.custody_handle || "").trim();
  if (!SHA256.test(key) || !SHA256.test(attemptId) || !HANDLE.test(handle)) {
    throw new Error("prepared_custodian_inspect_request_invalid");
  }
  return Object.freeze({
    idempotency_key_sha256: key,
    attempt_id: attemptId,
    custody_handle: handle,
  });
}

function buildIntent(request) {
  return {
    schema: INTENT_SCHEMA,
    marker: VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_SERVICE_V1,
    version: 1,
    recorded_at_ms: Date.now(),
    ...request,
    signing_state: "intent_committed",
    transaction_broadcast_authorized: false,
    money_movement_authorized: false,
  };
}

function parseIntent(value) {
  exactKeys(value, INTENT_KEYS, "prepared_custodian_service_intent");
  const request = normalizePrepareRequest(
    Object.fromEntries(PREPARE_KEYS.map((key) => [key, value[key]])),
  );
  if (
    value.schema !== INTENT_SCHEMA ||
    value.marker !== VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_SERVICE_V1 ||
    value.version !== 1 ||
    !Number.isSafeInteger(value.recorded_at_ms) ||
    Number(value.recorded_at_ms) <= 0 ||
    value.signing_state !== "intent_committed" ||
    value.transaction_broadcast_authorized !== false ||
    value.money_movement_authorized !== false
  ) {
    throw new Error("prepared_custodian_service_intent_invalid");
  }
  return Object.freeze({ ...value, ...request });
}

function requestMatchesIntent(request, intent) {
  return PREPARE_KEYS.every((key) => request[key] === intent[key]);
}

function requestMatchesRecord(request, record) {
  return PREPARE_KEYS.every((key) => request[key] === record[key]);
}

function custodyHandleFor(idempotencyKey) {
  return `custody:void-buy:ipc-v1/${idempotencyKey}`;
}

function validateSignedTransactionAgainstRequest(rawSigned, request) {
  if (
    !RAW.test(rawSigned) ||
    Buffer.byteLength(rawSigned, "utf8") > MAX_RAW_BYTES * 2 + 2
  ) {
    throw new Error("prepared_custodian_signed_transaction_invalid");
  }

  let parsed;
  try {
    parsed = Transaction.from(rawSigned);
  } catch {
    throw new Error("prepared_custodian_signed_transaction_parse_failed");
  }

  const from = normalizedAddress(parsed.from);
  const to = normalizedAddress(parsed.to);
  const parsedHash = String(parsed.hash || "").trim().toLowerCase();
  const accessList = parsed.accessList;
  if (
    parsed.type !== 2 ||
    parsed.chainId !== 2050n ||
    parsed.nonce !== request.nonce ||
    parsed.gasLimit !== BigInt(request.gas_limit) ||
    parsed.maxFeePerGas !== BigInt(request.max_fee_per_gas_wei) ||
    parsed.maxPriorityFeePerGas !==
      BigInt(request.max_priority_fee_per_gas_wei) ||
    to !== request.delivery_address ||
    parsed.value !== BigInt(request.native_value_wei) ||
    String(parsed.data || "").toLowerCase() !== "0x" ||
    (Array.isArray(accessList) && accessList.length !== 0) ||
    from !== request.wallet_address ||
    !/^0x[0-9a-f]{64}$/.test(parsedHash) ||
    parsedHash !== keccak256(rawSigned).toLowerCase()
  ) {
    throw new Error("prepared_custodian_signed_transaction_binding_mismatch");
  }

  return Object.freeze({ signed_transaction_hash: parsedHash });
}

function parseRecord(value, expectedSignerFingerprint) {
  exactKeys(value, RECORD_KEYS, "prepared_custodian_service_record");
  const request = normalizePrepareRequest(
    Object.fromEntries(PREPARE_KEYS.map((key) => [key, value[key]])),
  );
  const raw = String(value.raw_signed_transaction || "").trim();
  let signed;
  try {
    signed = validateSignedTransactionAgainstRequest(raw, request);
  } catch {
    throw new Error("prepared_custodian_service_record_invalid");
  }
  if (
    value.schema !== RECORD_SCHEMA ||
    value.marker !==
      VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_SERVICE_V1 ||
    value.version !== 1 ||
    !Number.isSafeInteger(value.recorded_at_ms) ||
    Number(value.recorded_at_ms) <= 0 ||
    value.custody_handle !== custodyHandleFor(request.idempotency_key_sha256) ||
    value.signed_transaction_hash !== signed.signed_transaction_hash ||
    value.signer_fingerprint_sha256 !== expectedSignerFingerprint ||
    !SHA256.test(String(value.raw_signed_transaction_sha256 || "")) ||
    value.raw_signed_transaction_sha256 !== sha256(raw.toLowerCase()) ||
    value.transaction_broadcast_authorized !== false ||
    value.money_movement_authorized !== false
  ) {
    throw new Error("prepared_custodian_service_record_invalid");
  }
  return Object.freeze({ ...value, ...request, raw_signed_transaction: raw });
}

function publicDecision(record, status) {
  return {
    ok: true,
    status,
    custody_handle: record.custody_handle,
    signed_transaction_hash: record.signed_transaction_hash,
    wallet_address: record.wallet_address,
    signer_fingerprint_sha256: record.signer_fingerprint_sha256,
    transaction_plan_fingerprint_sha256:
      record.transaction_plan_fingerprint_sha256,
  };
}

function held(reason) {
  const raw = String(reason || "prepared_custodian_service_held").trim();
  const code = /^[a-z][a-z0-9_]{2,159}$/.test(raw) &&
    raw.includes("_") &&
    !/(?:0x)?[0-9a-fA-F]{48,}/.test(raw)
    ? raw
    : "prepared_custodian_service_held";
  return {
    ok: false,
    status: "held",
    reason: code,
  };
}

async function invokeFault(faultInject, stage) {
  if (typeof faultInject === "function") await faultInject(stage);
}

async function prepareOnce(options, rawRequest) {
  const request = normalizePrepareRequest(rawRequest);
  const existing = readRecord(
    options.store_dir,
    request.idempotency_key_sha256,
    options.expected_signer_fingerprint_sha256,
  );
  if (existing) {
    if (!requestMatchesRecord(request, existing)) {
      return held("prepared_custodian_idempotency_conflict");
    }
    return publicDecision(existing, "duplicate");
  }

  const intent = buildIntent(request);
  const intentPath = intentFile(options.store_dir, request.idempotency_key_sha256);
  const intentCreated = atomicCreateJson(intentPath, intent);
  const durableIntent = readIntent(
    options.store_dir,
    request.idempotency_key_sha256,
  );
  if (!durableIntent || !requestMatchesIntent(request, durableIntent)) {
    return held("prepared_custodian_intent_conflict");
  }
  await invokeFault(options.fault_inject, "after_intent_before_signer");

  const signed = directObject(
    await options.signer.prepare_once(Object.freeze({ ...request })),
    "prepared_custodian_signer_result",
  );
  exactKeys(signed, SIGNER_KEYS, "prepared_custodian_signer_result");
  const signerStatus = String(signed.status || "").trim();
  const rawSigned = String(signed.raw_signed_transaction || "").trim();
  const wallet = normalizedAddress(signed.wallet_address);
  const signerFingerprint = String(
    signed.signer_fingerprint_sha256 || "",
  ).trim().toLowerCase();
  const planFingerprint = String(
    signed.transaction_plan_fingerprint_sha256 || "",
  ).trim().toLowerCase();
  if (
    (signerStatus !== "prepared" && signerStatus !== "duplicate") ||
    wallet !== request.wallet_address ||
    signerFingerprint !== options.expected_signer_fingerprint_sha256 ||
    planFingerprint !== request.transaction_plan_fingerprint_sha256
  ) {
    throw new Error("prepared_custodian_signer_result_invalid");
  }
  const signedValidation = validateSignedTransactionAgainstRequest(rawSigned, request);

  const signedHash = signedValidation.signed_transaction_hash;
  const handle = custodyHandleFor(request.idempotency_key_sha256);
  const record = {
    schema: RECORD_SCHEMA,
    marker: VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_SERVICE_V1,
    version: 1,
    recorded_at_ms: Date.now(),
    ...request,
    custody_handle: handle,
    signed_transaction_hash: signedHash,
    signer_fingerprint_sha256: signerFingerprint,
    raw_signed_transaction: rawSigned,
    raw_signed_transaction_sha256: sha256(rawSigned.toLowerCase()),
    transaction_broadcast_authorized: false,
    money_movement_authorized: false,
  };
  parseRecord(record, options.expected_signer_fingerprint_sha256);

  await invokeFault(options.fault_inject, "after_signer_before_persist");
  const file = recordFile(options.store_dir, request.idempotency_key_sha256);
  const created = atomicCreateJson(file, record);
  const durable = readRecord(
    options.store_dir,
    request.idempotency_key_sha256,
    options.expected_signer_fingerprint_sha256,
  );
  if (!durable) throw new Error("prepared_custodian_record_missing_after_persist");
  if (!requestMatchesRecord(request, durable)) {
    throw new Error("prepared_custodian_persisted_request_conflict");
  }
  if (
    durable.custody_handle !== record.custody_handle ||
    durable.signed_transaction_hash !== record.signed_transaction_hash ||
    durable.signer_fingerprint_sha256 !== record.signer_fingerprint_sha256 ||
    durable.raw_signed_transaction_sha256 !==
      record.raw_signed_transaction_sha256
  ) {
    throw new Error("prepared_custodian_persisted_payload_conflict");
  }
  await invokeFault(
    options.fault_inject,
    "after_record_persisted_before_reply",
  );
  const recovered = intentCreated === "exists" || signerStatus === "duplicate";
  return publicDecision(
    durable,
    created === "created" && !recovered ? "prepared" : "duplicate",
  );
}

async function inspectPrepared(options, rawRequest) {
  const request = normalizeInspectRequest(rawRequest);
  const record = readRecord(
    options.store_dir,
    request.idempotency_key_sha256,
    options.expected_signer_fingerprint_sha256,
  );
  if (!record) return held("prepared_custodian_record_not_found");
  if (
    record.attempt_id !== request.attempt_id ||
    record.custody_handle !== request.custody_handle
  ) {
    return held("prepared_custodian_inspection_conflict");
  }
  return publicDecision(record, "duplicate");
}

function normalizeOptions(raw) {
  const options = directObject(raw, "prepared_custodian_service_options");
  const socketPath = String(options.socket_path || "").trim();
  const storeDir = String(options.store_dir || "").trim();
  if (
    !socketPath ||
    !path.isAbsolute(socketPath) ||
    socketPath.includes("\0") ||
    !storeDir ||
    !path.isAbsolute(storeDir) ||
    storeDir.includes("\0")
  ) {
    throw new Error("prepared_custodian_service_absolute_paths_required");
  }
  if (
    !options.signer ||
    typeof options.signer.prepare_once !== "function"
  ) {
    throw new Error("prepared_custodian_service_signer_required");
  }
  const expectedSignerFingerprint = String(
    options.expected_signer_fingerprint_sha256 || "",
  ).trim().toLowerCase();
  if (!SHA256.test(expectedSignerFingerprint)) {
    throw new Error("prepared_custodian_service_signer_fingerprint_required");
  }
  return {
    socket_path: path.resolve(socketPath),
    store_dir: path.resolve(storeDir),
    signer: options.signer,
    expected_signer_fingerprint_sha256: expectedSignerFingerprint,
    fault_inject: options.fault_inject,
  };
}

function responseEnvelope(requestId, decision) {
  return {
    schema: RESPONSE_SCHEMA,
    marker: VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_IPC_V1,
    version: 1,
    request_id_sha256: requestId,
    decision,
  };
}

async function handleEnvelope(options, value) {
  const envelope = directObject(value, "prepared_custodian_ipc_request");
  exactKeys(
    envelope,
    ["schema", "marker", "version", "request_id_sha256", "method", "request"],
    "prepared_custodian_ipc_request",
  );
  const requestId = String(envelope.request_id_sha256 || "").trim().toLowerCase();
  if (
    envelope.schema !== REQUEST_SCHEMA ||
    envelope.marker !== VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_IPC_V1 ||
    envelope.version !== 1 ||
    !SHA256.test(requestId)
  ) {
    throw new Error("prepared_custodian_ipc_request_envelope_invalid");
  }
  if (envelope.method === "prepare_once") {
    return responseEnvelope(
      requestId,
      await prepareOnce(options, envelope.request),
    );
  }
  if (envelope.method === "inspect_prepared") {
    return responseEnvelope(
      requestId,
      await inspectPrepared(options, envelope.request),
    );
  }
  throw new Error("prepared_custodian_ipc_method_invalid");
}

export function createPreparedTransactionCustodianServiceV1(rawOptions) {
  const options = normalizeOptions(rawOptions);
  let started = false;
  let server = null;

  async function start() {
    if (started) throw new Error("prepared_custodian_service_already_started");
    ensurePrivateDirectory(path.dirname(options.socket_path));
    ensurePrivateDirectory(options.store_dir);
    ensurePrivateDirectory(path.join(options.store_dir, "intents"));
    ensurePrivateDirectory(path.join(options.store_dir, "records"));
    try {
      fs.lstatSync(options.socket_path);
      throw new Error("prepared_custodian_service_socket_path_already_exists");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }

    server = net.createServer((socket) => {
      socket.setEncoding("utf8");
      let input = "";
      let handled = false;

      const fail = (reason) => {
        if (handled || socket.destroyed) return;
        handled = true;
        const requestId = "0".repeat(64);
        socket.end(
          `${JSON.stringify(responseEnvelope(requestId, held(reason)))}\n`,
        );
      };

      socket.on("data", async (chunk) => {
        if (handled) return;
        input += chunk;
        if (Buffer.byteLength(input, "utf8") > MAX_REQUEST_BYTES) {
          fail("prepared_custodian_ipc_request_too_large");
          return;
        }
        const newline = input.indexOf("\n");
        if (newline < 0) return;
        if (input.slice(newline + 1).trim()) {
          fail("prepared_custodian_ipc_multiple_requests_rejected");
          return;
        }
        handled = true;
        try {
          const envelope = JSON.parse(input.slice(0, newline));
          const response = await handleEnvelope(options, envelope);
          if (!socket.destroyed) {
            socket.end(`${JSON.stringify(response)}\n`);
          }
        } catch (error) {
          if (!socket.destroyed) {
            const requestId = (() => {
              try {
                const parsed = JSON.parse(input.slice(0, newline));
                const id = String(parsed?.request_id_sha256 || "");
                return SHA256.test(id) ? id : "0".repeat(64);
              } catch {
                return "0".repeat(64);
              }
            })();
            socket.end(
              `${JSON.stringify(
                responseEnvelope(
                  requestId,
                  held("prepared_custodian_service_failed"),
                ),
              )}\n`,
            );
          }
        }
      });
      socket.on("error", () => {});
    });

    await new Promise((resolve, reject) => {
      const onError = (error) => {
        server?.off("listening", onListening);
        reject(error);
      };
      const onListening = () => {
        server?.off("error", onError);
        resolve();
      };
      server.once("error", onError);
      server.once("listening", onListening);
      server.listen(options.socket_path);
    });
    try {
      fs.chmodSync(options.socket_path, 0o600);
      const metadata = fs.lstatSync(options.socket_path);
      if (!metadata.isSocket() || metadata.isSymbolicLink()) {
        throw new Error("prepared_custodian_service_socket_not_direct");
      }
      if (
        typeof process.getuid === "function" &&
        metadata.uid !== process.getuid()
      ) {
        throw new Error("prepared_custodian_service_socket_owner_mismatch");
      }
      if ((metadata.mode & 0o077) !== 0) {
        throw new Error("prepared_custodian_service_socket_not_private");
      }
    } catch (error) {
      await new Promise((resolve) => server?.close(() => resolve()));
      server = null;
      try {
        const metadata = fs.lstatSync(options.socket_path);
        if (metadata.isSocket() && !metadata.isSymbolicLink()) {
          fs.unlinkSync(options.socket_path);
        }
      } catch (cleanupError) {
        if (cleanupError?.code !== "ENOENT") throw cleanupError;
      }
      throw error;
    }
    started = true;
    return {
      socket_path: options.socket_path,
      store_dir: options.store_dir,
      transaction_broadcast_interface: false,
    };
  }

  async function stop() {
    if (!server) return;
    await new Promise((resolve) => server.close(() => resolve()));
    server = null;
    started = false;
    try {
      const metadata = fs.lstatSync(options.socket_path);
      if (!metadata.isSocket() || metadata.isSymbolicLink()) {
        throw new Error("prepared_custodian_service_stop_socket_type_invalid");
      }
      fs.unlinkSync(options.socket_path);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }

  return Object.freeze({
    start,
    stop,
    authority:
      VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_SERVICE_AUTHORITY_V1,
  });
}

const invokedAsScript =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedAsScript) {
  console.error(
    `${VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_SERVICE_V1}: ` +
      "source-only library; direct CLI activation is intentionally disabled",
  );
  process.exitCode = 64;
}
