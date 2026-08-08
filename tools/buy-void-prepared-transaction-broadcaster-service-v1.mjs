import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Transaction, keccak256 } from "ethers";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SERVICE_V1 =
  "VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SERVICE_V1";
export const VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_IPC_V1 =
  "VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_IPC_V1";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SERVICE_AUTHORITY_V1 =
  Object.freeze({
    source_only_service: true,
    cli_activation: false,
    submission_gate_supported: true,
    submission_gate_rejects_before_custody_lookup: true,
    submission_gate_rejects_before_durable_intent: true,
    unix_socket_only: true,
    socket_mode_0600: true,
    state_store_mode_0700: true,
    state_record_mode_0600: true,
    custody_store_read_only: true,
    custody_record_same_uid_required: true,
    custody_record_private_required: true,
    raw_signed_transaction_private_read: true,
    raw_signed_transaction_to_injected_transport_only: true,
    raw_signed_transaction_ipc_input: false,
    raw_signed_transaction_ipc_output: false,
    custody_handle_ipc_input: false,
    custody_handle_ipc_output: false,
    deterministic_submission_idempotency_key_required: true,
    durable_submission_intent_before_transport: true,
    submit_reentry_requires_inspection: true,
    reconciliation_never_calls_submit: true,
    terminal_outcome_reused_without_transport: true,
    monotonic_submission_outcome: true,
    application_private_material_access: false,
    application_wallet_access: false,
    application_signing: false,
    external_transaction_submission_when_injected: true,
    automatic_resubmission: false,
    runtime_route_mount: false,
    background_loop: false,
    startup_execution: false,
  });

const REQUEST_SCHEMA =
  "void_buy_void_prepared_transaction_broadcaster_ipc_request_v1";
const RESPONSE_SCHEMA =
  "void_buy_void_prepared_transaction_broadcaster_ipc_response_v1";
const INTENT_SCHEMA =
  "void_buy_void_prepared_transaction_broadcaster_service_intent_v1";
const OUTCOME_SCHEMA =
  "void_buy_void_prepared_transaction_broadcaster_service_outcome_v1";
const CUSTODY_RECORD_SCHEMA =
  "void_buy_void_prepared_transaction_custodian_service_record_v1";
const CUSTODY_RECORD_MARKER =
  "VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_SERVICE_V1";

const SHA256 = /^[0-9a-f]{64}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/;
const BROADCAST_INTENT_ID = /^voidbvbci1_[0-9a-f]{64}$/;
const HANDLE = /^custody:void-buy:[A-Za-z0-9._:@/-]{1,220}$/;
const DECIMAL = /^(0|[1-9][0-9]*)$/;
const RAW = /^0x(?:[0-9a-fA-F]{2})+$/;
const SAFE_PROVIDER_ID = /^[A-Za-z0-9._:@/-]{0,200}$/;
const SAFE_REASON = /^[a-z][a-z0-9_]{2,159}$/;
const MAX_REQUEST_BYTES = 64 * 1024;
const MAX_RECORD_BYTES = 768 * 1024;
const MAX_RAW_BYTES = 256 * 1024;
const MAX_RESULT_DEPTH = 16;

const REQUEST_KEYS = Object.freeze([
  "submission_idempotency_key_sha256",
  "saga_id",
  "attempt_id",
  "broadcast_intent_id",
  "custody_idempotency_key_sha256",
  "custody_handle_fingerprint_sha256",
  "transaction_plan_fingerprint_sha256",
  "signed_transaction_hash",
]);

const CUSTODY_RECORD_KEYS = Object.freeze([
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

const READY_KEYS = Object.freeze([
  "ok",
  "status",
  "transaction_hash",
  "provider_submission_id",
  "definitive_not_submitted",
  "submission_call_performed",
  "submission_may_have_occurred",
  "receipt",
]);
const HELD_KEYS = Object.freeze(["ok", "status", "reason"]);
const RECEIPT_KEYS = Object.freeze([
  "chain_id",
  "transaction_hash",
  "transaction_status",
  "block_number",
  "block_hash",
  "current_block_number",
  "confirmation_count",
  "from_address",
  "to_address",
  "amount_units",
]);
const FORBIDDEN_RESULT_KEYS = new Set([
  "privatekey",
  "private_key",
  "mnemonic",
  "seed",
  "seedphrase",
  "seed_phrase",
  "keystore",
  "password",
  "secret",
  "custodyhandle",
  "custody_handle",
  "rawtransaction",
  "raw_transaction",
  "rawsignedtransaction",
  "raw_signed_transaction",
  "signedtransaction",
  "signed_transaction",
  "signedpayload",
  "signed_payload",
]);

function text(value) {
  return String(value ?? "").trim();
}

function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

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

function normalizedKey(value) {
  return text(value).toLowerCase().replace(/[^a-z0-9_]/g, "");
}

function forbiddenResultKey(value, depth = 0) {
  if (!value || typeof value !== "object") return null;
  if (depth > MAX_RESULT_DEPTH) return "__broadcast_result_depth_exceeded__";
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = forbiddenResultKey(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_RESULT_KEYS.has(normalizedKey(key))) return key;
    const found = forbiddenResultKey(child, depth + 1);
    if (found) return found;
  }
  return null;
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

function assertPrivateDirectory(directory, label) {
  assertNoSymlinkAncestors(directory, `${label}_ancestor`);
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

function ensurePrivateDirectory(directory) {
  const resolved = path.resolve(directory);
  const parent = path.dirname(resolved);
  assertNoSymlinkAncestors(parent, "prepared_broadcaster_service_directory");
  const parentMetadata = fs.lstatSync(parent);
  if (!parentMetadata.isDirectory() || parentMetadata.isSymbolicLink()) {
    throw new Error(
      "prepared_broadcaster_service_parent_must_be_direct_directory",
    );
  }
  try {
    assertPrivateDirectory(
      resolved,
      "prepared_broadcaster_service_directory",
    );
    return;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  fs.mkdirSync(resolved, { recursive: false, mode: 0o700 });
  assertPrivateDirectory(
    resolved,
    "prepared_broadcaster_service_directory",
  );
}

function fsyncDirectory(directory) {
  const descriptor = fs.openSync(directory, "r");
  try {
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
}

function assertPrivateRecord(file, label) {
  const metadata = fs.lstatSync(file);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error(`${label}_must_be_direct_file`);
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
  if (metadata.size < 2 || metadata.size > MAX_RECORD_BYTES) {
    throw new Error(`${label}_size_invalid`);
  }
}

function readPrivateJson(file, label) {
  try {
    assertPrivateDirectory(path.dirname(file), `${label}_directory`);
    assertPrivateRecord(file, label);
    return directObject(JSON.parse(fs.readFileSync(file, "utf8")), label);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
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

function atomicReplaceJson(file, value) {
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
  fs.renameSync(temporary, file);
  fsyncDirectory(parent);
}

function validateRequest(raw) {
  const request = directObject(raw, "prepared_broadcaster_service_request");
  exactKeys(request, REQUEST_KEYS, "prepared_broadcaster_service_request");
  const normalized = {
    submission_idempotency_key_sha256: text(
      request.submission_idempotency_key_sha256,
    ).toLowerCase(),
    saga_id: text(request.saga_id).toLowerCase(),
    attempt_id: text(request.attempt_id).toLowerCase(),
    broadcast_intent_id: text(request.broadcast_intent_id).toLowerCase(),
    custody_idempotency_key_sha256: text(
      request.custody_idempotency_key_sha256,
    ).toLowerCase(),
    custody_handle_fingerprint_sha256: text(
      request.custody_handle_fingerprint_sha256,
    ).toLowerCase(),
    transaction_plan_fingerprint_sha256: text(
      request.transaction_plan_fingerprint_sha256,
    ).toLowerCase(),
    signed_transaction_hash: text(request.signed_transaction_hash).toLowerCase(),
  };
  const expectedSubmissionKey = sha256(
    [
      "void-buy-prepared-transaction-broadcast-custody-v1",
      normalized.saga_id,
      normalized.attempt_id,
      normalized.broadcast_intent_id,
      normalized.custody_idempotency_key_sha256,
      normalized.signed_transaction_hash,
    ].join("\n"),
  );
  if (
    normalized.submission_idempotency_key_sha256 !== expectedSubmissionKey ||
    !SAGA_ID.test(normalized.saga_id) ||
    !SHA256.test(normalized.attempt_id) ||
    !BROADCAST_INTENT_ID.test(normalized.broadcast_intent_id) ||
    !SHA256.test(normalized.custody_idempotency_key_sha256) ||
    !SHA256.test(normalized.custody_handle_fingerprint_sha256) ||
    !SHA256.test(normalized.transaction_plan_fingerprint_sha256) ||
    !HASH.test(normalized.signed_transaction_hash)
  ) {
    throw new Error("prepared_broadcaster_service_request_invalid");
  }
  return Object.freeze(normalized);
}

function custodyRecordFile(options, request) {
  return path.join(
    options.custody_store_dir,
    "records",
    `${request.custody_idempotency_key_sha256}.json`,
  );
}

function validateCustodyRecord(options, request) {
  const file = custodyRecordFile(options, request);
  const record = readPrivateJson(
    file,
    "prepared_broadcaster_service_custody_record",
  );
  if (!record) {
    throw new Error("prepared_broadcaster_service_custody_record_missing");
  }
  exactKeys(
    record,
    CUSTODY_RECORD_KEYS,
    "prepared_broadcaster_service_custody_record",
  );
  const raw = text(record.raw_signed_transaction);
  if (
    record.schema !== CUSTODY_RECORD_SCHEMA ||
    record.marker !== CUSTODY_RECORD_MARKER ||
    record.version !== 1 ||
    !Number.isSafeInteger(record.recorded_at_ms) ||
    Number(record.recorded_at_ms) <= 0 ||
    record.idempotency_key_sha256 !==
      request.custody_idempotency_key_sha256 ||
    record.saga_id !== request.saga_id ||
    record.attempt_id !== request.attempt_id ||
    record.transaction_plan_fingerprint_sha256 !==
      request.transaction_plan_fingerprint_sha256 ||
    record.chain_id !== "2050" ||
    !ADDRESS.test(text(record.wallet_address).toLowerCase()) ||
    !Number.isSafeInteger(record.nonce) ||
    Number(record.nonce) < 0 ||
    !ADDRESS.test(text(record.delivery_address).toLowerCase()) ||
    !DECIMAL.test(text(record.native_value_wei)) ||
    BigInt(text(record.native_value_wei)) <= 0n ||
    !HANDLE.test(text(record.custody_handle)) ||
    sha256(text(record.custody_handle)) !==
      request.custody_handle_fingerprint_sha256 ||
    text(record.signed_transaction_hash).toLowerCase() !==
      request.signed_transaction_hash ||
    text(record.signer_fingerprint_sha256).toLowerCase() !==
      options.expected_signer_fingerprint_sha256 ||
    record.transaction_broadcast_authorized !== false ||
    record.money_movement_authorized !== false ||
    !RAW.test(raw) ||
    Buffer.byteLength(raw, "utf8") > MAX_RAW_BYTES * 2 + 2 ||
    text(record.raw_signed_transaction_sha256).toLowerCase() !==
      sha256(raw.toLowerCase())
  ) {
    throw new Error("prepared_broadcaster_service_custody_record_invalid");
  }

  let parsed;
  try {
    parsed = Transaction.from(raw);
  } catch {
    throw new Error(
      "prepared_broadcaster_service_signed_transaction_parse_failed",
    );
  }
  const parsedHash = text(parsed.hash).toLowerCase();
  if (
    parsed.type !== 2 ||
    parsed.chainId !== 2050n ||
    parsedHash !== request.signed_transaction_hash ||
    parsedHash !== keccak256(raw).toLowerCase()
  ) {
    throw new Error(
      "prepared_broadcaster_service_signed_transaction_binding_invalid",
    );
  }

  return Object.freeze({
    raw_signed_transaction: raw,
    signed_transaction_hash: parsedHash,
  });
}

function validateReceipt(value, expectedHash, expectedStatus) {
  const object = directObject(value, "prepared_broadcaster_service_receipt");
  exactKeys(object, RECEIPT_KEYS, "prepared_broadcaster_service_receipt");
  const receipt = {
    chain_id: "2050",
    transaction_hash: text(object.transaction_hash).toLowerCase(),
    transaction_status: Number(object.transaction_status),
    block_number: text(object.block_number),
    block_hash: text(object.block_hash).toLowerCase(),
    current_block_number: text(object.current_block_number),
    confirmation_count: text(object.confirmation_count),
    from_address: text(object.from_address).toLowerCase(),
    to_address: text(object.to_address).toLowerCase(),
    amount_units: text(object.amount_units),
  };
  if (
    object.chain_id !== "2050" ||
    receipt.transaction_hash !== expectedHash ||
    receipt.transaction_status !== expectedStatus ||
    !DECIMAL.test(receipt.block_number) ||
    BigInt(receipt.block_number) <= 0n ||
    !HASH.test(receipt.block_hash) ||
    !DECIMAL.test(receipt.current_block_number) ||
    BigInt(receipt.current_block_number) <= 0n ||
    !DECIMAL.test(receipt.confirmation_count) ||
    BigInt(receipt.confirmation_count) <= 0n ||
    !ADDRESS.test(receipt.from_address) ||
    !ADDRESS.test(receipt.to_address) ||
    !DECIMAL.test(receipt.amount_units) ||
    BigInt(receipt.amount_units) <= 0n
  ) {
    throw new Error("prepared_broadcaster_service_receipt_invalid");
  }
  const observed =
    BigInt(receipt.current_block_number) -
    BigInt(receipt.block_number) +
    1n;
  if (
    observed <= 0n ||
    observed.toString() !== receipt.confirmation_count
  ) {
    throw new Error(
      "prepared_broadcaster_service_receipt_confirmation_count_invalid",
    );
  }
  return Object.freeze(receipt);
}

function validateTransportDecision(value, request) {
  const forbidden = forbiddenResultKey(value);
  if (forbidden) {
    throw new Error(
      `prepared_broadcaster_service_secret_transport_result_rejected:${forbidden}`,
    );
  }
  const object = directObject(
    value,
    "prepared_broadcaster_service_transport_result",
  );
  if (object.ok === false) {
    exactKeys(
      object,
      HELD_KEYS,
      "prepared_broadcaster_service_transport_held",
    );
    const reason = text(object.reason);
    if (
      object.status !== "held" ||
      !SAFE_REASON.test(reason) ||
      !reason.includes("_")
    ) {
      throw new Error(
        "prepared_broadcaster_service_transport_held_invalid",
      );
    }
    return Object.freeze({ ok: false, status: "held", reason });
  }

  exactKeys(
    object,
    READY_KEYS,
    "prepared_broadcaster_service_transport_ready",
  );
  const status = text(object.status);
  const transactionHash = text(object.transaction_hash).toLowerCase();
  const providerSubmissionId = text(object.provider_submission_id);
  if (
    object.ok !== true ||
    ![
      "not_submitted",
      "unknown",
      "accepted",
      "confirmed",
      "reverted",
    ].includes(status) ||
    transactionHash !== request.signed_transaction_hash ||
    !SAFE_PROVIDER_ID.test(providerSubmissionId)
  ) {
    throw new Error("prepared_broadcaster_service_transport_ready_invalid");
  }

  if (status === "not_submitted") {
    if (
      object.definitive_not_submitted !== true ||
      object.submission_call_performed !== false ||
      object.submission_may_have_occurred !== false ||
      object.receipt !== null
    ) {
      throw new Error(
        "prepared_broadcaster_service_not_submitted_invalid",
      );
    }
    return Object.freeze({
      ok: true,
      status: "not_submitted",
      transaction_hash: transactionHash,
      provider_submission_id: providerSubmissionId,
      definitive_not_submitted: true,
      submission_call_performed: false,
      submission_may_have_occurred: false,
      receipt: null,
    });
  }

  if (
    object.definitive_not_submitted !== false ||
    object.submission_call_performed !== true ||
    object.submission_may_have_occurred !== true
  ) {
    throw new Error(
      "prepared_broadcaster_service_submission_flags_invalid",
    );
  }
  if (status === "unknown" || status === "accepted") {
    if (object.receipt !== null) {
      throw new Error(
        "prepared_broadcaster_service_nonterminal_receipt_invalid",
      );
    }
    return Object.freeze({
      ok: true,
      status,
      transaction_hash: transactionHash,
      provider_submission_id: providerSubmissionId,
      definitive_not_submitted: false,
      submission_call_performed: true,
      submission_may_have_occurred: true,
      receipt: null,
    });
  }

  const receipt = validateReceipt(
    object.receipt,
    transactionHash,
    status === "confirmed" ? 1 : 0,
  );
  return Object.freeze({
    ok: true,
    status,
    transaction_hash: transactionHash,
    provider_submission_id: providerSubmissionId,
    definitive_not_submitted: false,
    submission_call_performed: true,
    submission_may_have_occurred: true,
    receipt,
  });
}

function held(reason) {
  const raw = text(reason);
  const safe =
    SAFE_REASON.test(raw) &&
    raw.includes("_") &&
    !/(?:0x)?[0-9a-fA-F]{48,}/.test(raw)
      ? raw
      : "prepared_broadcaster_service_held";
  return { ok: false, status: "held", reason: safe };
}

function intentFile(options, request) {
  return path.join(
    options.state_dir,
    "intents",
    `${request.submission_idempotency_key_sha256}.json`,
  );
}

function outcomeFile(options, request) {
  return path.join(
    options.state_dir,
    "outcomes",
    `${request.submission_idempotency_key_sha256}.json`,
  );
}

function requestMatches(a, b) {
  return REQUEST_KEYS.every((key) => a[key] === b[key]);
}

function readIntent(options, request) {
  const value = readPrivateJson(
    intentFile(options, request),
    "prepared_broadcaster_service_intent",
  );
  if (!value) return null;
  exactKeys(
    value,
    ["schema", "marker", "version", "recorded_at_ms", "request"],
    "prepared_broadcaster_service_intent",
  );
  const stored = validateRequest(value.request);
  if (
    value.schema !== INTENT_SCHEMA ||
    value.marker !==
      VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SERVICE_V1 ||
    value.version !== 1 ||
    !Number.isSafeInteger(value.recorded_at_ms) ||
    Number(value.recorded_at_ms) <= 0 ||
    !requestMatches(stored, request)
  ) {
    throw new Error("prepared_broadcaster_service_intent_invalid");
  }
  return Object.freeze({ ...value, request: stored });
}

function readOutcome(options, request) {
  const value = readPrivateJson(
    outcomeFile(options, request),
    "prepared_broadcaster_service_outcome",
  );
  if (!value) return null;
  exactKeys(
    value,
    ["schema", "marker", "version", "recorded_at_ms", "request", "decision"],
    "prepared_broadcaster_service_outcome",
  );
  const stored = validateRequest(value.request);
  const decision = validateTransportDecision(value.decision, request);
  if (
    value.schema !== OUTCOME_SCHEMA ||
    value.marker !==
      VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SERVICE_V1 ||
    value.version !== 1 ||
    !Number.isSafeInteger(value.recorded_at_ms) ||
    Number(value.recorded_at_ms) <= 0 ||
    !requestMatches(stored, request)
  ) {
    throw new Error("prepared_broadcaster_service_outcome_invalid");
  }
  return Object.freeze({ ...value, request: stored, decision });
}

function selectMonotonicOutcome(existing, incoming) {
  if (!existing) {
    return Object.freeze({ decision: incoming, persist: true });
  }

  const previous = existing.decision;
  if (
    previous.status === "confirmed" ||
    previous.status === "reverted" ||
    previous.status === "not_submitted"
  ) {
    return Object.freeze({ decision: previous, persist: false });
  }

  if (
    previous.status === "unknown" &&
    incoming.status === "not_submitted"
  ) {
    throw new Error(
      "prepared_broadcaster_service_unknown_not_submitted_conflict",
    );
  }

  if (previous.status === "accepted") {
    if (incoming.status === "not_submitted") {
      throw new Error(
        "prepared_broadcaster_service_accepted_not_submitted_conflict",
      );
    }
    if (
      incoming.provider_submission_id !==
      previous.provider_submission_id
    ) {
      throw new Error(
        "prepared_broadcaster_service_provider_identity_conflict",
      );
    }
    if (
      incoming.status === "unknown" ||
      incoming.status === "accepted"
    ) {
      return Object.freeze({ decision: previous, persist: false });
    }
  }

  return Object.freeze({ decision: incoming, persist: true });
}

function persistOutcome(options, request, decision) {
  const selected = selectMonotonicOutcome(
    readOutcome(options, request),
    decision,
  );
  if (!selected.persist) return selected.decision;

  const record = {
    schema: OUTCOME_SCHEMA,
    marker: VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SERVICE_V1,
    version: 1,
    recorded_at_ms: Date.now(),
    request,
    decision: selected.decision,
  };
  atomicReplaceJson(outcomeFile(options, request), record);
  return readOutcome(options, request).decision;
}

function normalizeOptions(raw) {
  const options = directObject(
    raw,
    "prepared_broadcaster_service_options",
  );
  const socketPath = text(options.socket_path);
  const custodyStoreDir = text(options.custody_store_dir);
  const stateDir = text(options.state_dir);
  if (
    !socketPath ||
    !path.isAbsolute(socketPath) ||
    socketPath.includes("\0") ||
    !custodyStoreDir ||
    !path.isAbsolute(custodyStoreDir) ||
    custodyStoreDir.includes("\0") ||
    !stateDir ||
    !path.isAbsolute(stateDir) ||
    stateDir.includes("\0")
  ) {
    throw new Error(
      "prepared_broadcaster_service_absolute_paths_required",
    );
  }
  if (
    !options.transport ||
    typeof options.transport.submit_once !== "function" ||
    typeof options.transport.inspect_submission !== "function"
  ) {
    throw new Error("prepared_broadcaster_service_transport_required");
  }
  const expectedSignerFingerprint = text(
    options.expected_signer_fingerprint_sha256,
  ).toLowerCase();
  if (!SHA256.test(expectedSignerFingerprint)) {
    throw new Error(
      "prepared_broadcaster_service_signer_fingerprint_required",
    );
  }
  if (
    options.submission_enabled !== undefined &&
    typeof options.submission_enabled !== "boolean"
  ) {
    throw new Error(
      "prepared_broadcaster_service_submission_enabled_boolean_required",
    );
  }
  const submissionEnabled = options.submission_enabled !== false;
  return {
    socket_path: path.resolve(socketPath),
    custody_store_dir: path.resolve(custodyStoreDir),
    state_dir: path.resolve(stateDir),
    transport: options.transport,
    expected_signer_fingerprint_sha256: expectedSignerFingerprint,
    submission_enabled: submissionEnabled,
    fault_inject: options.fault_inject,
  };
}

async function invokeFault(options, stage) {
  if (typeof options.fault_inject === "function") {
    await options.fault_inject(stage);
  }
}

function privateSubmitRequest(request, custody) {
  return Object.freeze({
    submission_idempotency_key_sha256:
      request.submission_idempotency_key_sha256,
    saga_id: request.saga_id,
    attempt_id: request.attempt_id,
    broadcast_intent_id: request.broadcast_intent_id,
    signed_transaction_hash: request.signed_transaction_hash,
    raw_signed_transaction: custody.raw_signed_transaction,
  });
}

function publicInspectRequest(request) {
  return Object.freeze({ ...request });
}

async function submitOnce(options, rawRequest) {
  const request = validateRequest(rawRequest);
  const custody = validateCustodyRecord(options, request);

  const existingIntent = readIntent(options, request);
  if (existingIntent) {
    return held(
      "prepared_broadcaster_submit_reentry_requires_inspection",
    );
  }

  const intent = {
    schema: INTENT_SCHEMA,
    marker: VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SERVICE_V1,
    version: 1,
    recorded_at_ms: Date.now(),
    request,
  };
  if (atomicCreateJson(intentFile(options, request), intent) !== "created") {
    return held(
      "prepared_broadcaster_submit_reentry_requires_inspection",
    );
  }
  const durableIntent = readIntent(options, request);
  if (!durableIntent || !requestMatches(durableIntent.request, request)) {
    throw new Error("prepared_broadcaster_service_intent_persist_failed");
  }

  await invokeFault(options, "after_intent_before_submit");

  const decision = validateTransportDecision(
    await options.transport.submit_once(
      privateSubmitRequest(request, custody),
    ),
    request,
  );

  await invokeFault(options, "after_transport_before_outcome");
  return persistOutcome(options, request, decision);
}

async function inspectSubmission(options, rawRequest) {
  const request = validateRequest(rawRequest);

  const intent = readIntent(options, request);
  if (!intent) {
    validateCustodyRecord(options, request);
    return {
      ok: true,
      status: "not_submitted",
      transaction_hash: request.signed_transaction_hash,
      provider_submission_id: "",
      definitive_not_submitted: true,
      submission_call_performed: false,
      submission_may_have_occurred: false,
      receipt: null,
    };
  }

  const existing = readOutcome(options, request);
  if (
    existing &&
    (existing.decision.status === "confirmed" ||
      existing.decision.status === "reverted" ||
      existing.decision.status === "not_submitted")
  ) {
    return existing.decision;
  }

  const decision = validateTransportDecision(
    await options.transport.inspect_submission(
      publicInspectRequest(request),
    ),
    request,
  );
  return persistOutcome(options, request, decision);
}

function responseEnvelope(requestId, decision) {
  return {
    schema: RESPONSE_SCHEMA,
    marker: VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_IPC_V1,
    version: 1,
    request_id_sha256: requestId,
    decision,
  };
}

async function handleEnvelope(options, value) {
  const envelope = directObject(
    value,
    "prepared_broadcaster_ipc_request",
  );
  exactKeys(
    envelope,
    ["schema", "marker", "version", "request_id_sha256", "method", "request"],
    "prepared_broadcaster_ipc_request",
  );
  const requestId = text(envelope.request_id_sha256).toLowerCase();
  if (
    envelope.schema !== REQUEST_SCHEMA ||
    envelope.marker !==
      VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_IPC_V1 ||
    envelope.version !== 1 ||
    !SHA256.test(requestId)
  ) {
    throw new Error("prepared_broadcaster_ipc_request_envelope_invalid");
  }
  if (envelope.method === "submit_once") {
    if (options.submission_enabled !== true) {
      return responseEnvelope(
        requestId,
        held("prepared_broadcaster_service_submission_disabled"),
      );
    }
    return responseEnvelope(
      requestId,
      await submitOnce(options, envelope.request),
    );
  }
  if (envelope.method === "inspect_submission") {
    return responseEnvelope(
      requestId,
      await inspectSubmission(options, envelope.request),
    );
  }
  throw new Error("prepared_broadcaster_ipc_method_invalid");
}

export function createPreparedTransactionBroadcasterServiceV1(rawOptions) {
  const options = normalizeOptions(rawOptions);
  let server = null;
  let started = false;
  const locks = new Map();

  async function withRequestLock(rawRequest, action) {
    const request = validateRequest(rawRequest);
    const key = request.submission_idempotency_key_sha256;
    const previous = locks.get(key) || Promise.resolve();
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const chain = previous.then(() => gate);
    locks.set(key, chain);
    await previous;
    try {
      return await action(request);
    } finally {
      release();
      if (locks.get(key) === chain) locks.delete(key);
    }
  }

  async function start() {
    if (started) {
      throw new Error("prepared_broadcaster_service_already_started");
    }
    assertPrivateDirectory(
      options.custody_store_dir,
      "prepared_broadcaster_service_custody_store",
    );
    ensurePrivateDirectory(path.dirname(options.socket_path));
    ensurePrivateDirectory(options.state_dir);
    ensurePrivateDirectory(path.join(options.state_dir, "intents"));
    ensurePrivateDirectory(path.join(options.state_dir, "outcomes"));

    try {
      fs.lstatSync(options.socket_path);
      throw new Error(
        "prepared_broadcaster_service_socket_path_already_exists",
      );
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }

    server = net.createServer((socket) => {
      socket.setEncoding("utf8");
      let input = "";
      let handled = false;

      const finishHeld = (requestId, reason) => {
        if (socket.destroyed) return;
        socket.end(
          `${JSON.stringify(
            responseEnvelope(requestId, held(reason)),
          )}\n`,
        );
      };

      socket.on("data", async (chunk) => {
        if (handled) return;
        input += chunk;
        if (Buffer.byteLength(input, "utf8") > MAX_REQUEST_BYTES) {
          handled = true;
          finishHeld(
            "0".repeat(64),
            "prepared_broadcaster_ipc_request_too_large",
          );
          return;
        }
        const newline = input.indexOf("\n");
        if (newline < 0) return;
        if (input.slice(newline + 1).trim()) {
          handled = true;
          finishHeld(
            "0".repeat(64),
            "prepared_broadcaster_ipc_multiple_requests_rejected",
          );
          return;
        }
        handled = true;
        let requestId = "0".repeat(64);
        try {
          const envelope = directObject(
            JSON.parse(input.slice(0, newline)),
            "prepared_broadcaster_ipc_request",
          );
          const candidate = text(envelope.request_id_sha256).toLowerCase();
          if (SHA256.test(candidate)) requestId = candidate;
          const method = envelope.method;
          const response = await withRequestLock(
            envelope.request,
            async (request) => {
              const normalizedEnvelope = {
                ...envelope,
                request,
              };
              return await handleEnvelope(options, normalizedEnvelope);
            },
          );
          if (!socket.destroyed) {
            socket.end(`${JSON.stringify(response)}\n`);
          }
        } catch {
          finishHeld(
            requestId,
            "prepared_broadcaster_service_failed",
          );
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
      if (
        !metadata.isSocket() ||
        metadata.isSymbolicLink() ||
        (metadata.mode & 0o077) !== 0
      ) {
        throw new Error(
          "prepared_broadcaster_service_socket_not_private",
        );
      }
      if (
        typeof process.getuid === "function" &&
        metadata.uid !== process.getuid()
      ) {
        throw new Error(
          "prepared_broadcaster_service_socket_owner_mismatch",
        );
      }
    } catch (error) {
      await new Promise((resolve) => server?.close(() => resolve()));
      server = null;
      try {
        fs.unlinkSync(options.socket_path);
      } catch (cleanupError) {
        if (cleanupError?.code !== "ENOENT") throw cleanupError;
      }
      throw error;
    }

    started = true;
    return {
      socket_path: options.socket_path,
      custody_store_dir: options.custody_store_dir,
      state_dir: options.state_dir,
      raw_signed_transaction_ipc_output: false,
      direct_cli_activation: false,
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
        throw new Error(
          "prepared_broadcaster_service_stop_socket_type_invalid",
        );
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
      VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SERVICE_AUTHORITY_V1,
  });
}

const invokedAsScript =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedAsScript) {
  console.error(
    `${VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SERVICE_V1}: ` +
      "source-only library; direct CLI activation is intentionally disabled",
  );
  process.exitCode = 64;
}
