import crypto from "node:crypto";
import { Interface } from "ethers";

export const VOID_DATANET_CHAIN2050_COMMITMENT_RECEIPT_V1 =
  "VOID_DATANET_CHAIN2050_COMMITMENT_RECEIPT_V1";

export const VOID_DATANET_CHAIN2050_COMMITMENT_RECEIPT_AUTHORITY_V1 =
  Object.freeze({
    source_only_candidate: true,
    chain_id_verified: true,
    event_receipt_membership_verified: true,
    receipt_revalidation_verified: true,
    canonical_block_hash_verified: true,
    durable_checkpoint_binding_verified: false,
    accepted_checkpoint_membership_verified: false,
    fork_choice_verified: false,
    peer_quorum_verified: false,
    chain_finality_verified: false,
    authority_ready_for_1464: false,
    network_call: false,
    filesystem_read: false,
    filesystem_write: false,
    runtime_route_mount: false,
    chain2050_mutation: false,
    credential_access: false,
    wallet_access: false,
    signing: false,
    transaction_construction: false,
    transaction_broadcast: false,
    money_movement: false,
  });

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{1,159}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const HASH32 = /^0x[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const HEX_DATA = /^0x(?:[0-9a-f]{2})*$/;
const MAX_OBJECT_BYTES = 268_435_456n;
const MAX_U64 = 18_446_744_073_709_551_615n;
const MAX_RECEIPT_LOGS = 1_024;

const COMMITMENT_INTERFACE = new Interface([
  "event ContentCommitted(bytes32 indexed objectIdSha256, bytes32 indexed contentSha256, uint64 byteLength, uint256 committedAtBlock)",
]);

function held(reason, detail) {
  return Object.freeze({
    ok: false,
    status: "held",
    marker: VOID_DATANET_CHAIN2050_COMMITMENT_RECEIPT_V1,
    reason,
    ...(detail ? { detail: Object.freeze({ ...detail }) } : {}),
  });
}

function normalizeAddress(value) {
  const address = String(value ?? "").trim().toLowerCase();
  return ADDRESS.test(address) ? address : "";
}

function normalizeHash(value) {
  const hash = String(value ?? "").trim().toLowerCase();
  return HASH32.test(hash) ? hash : "";
}

function normalizeSha256(value) {
  const digest = String(value ?? "").trim().toLowerCase();
  return SHA256.test(digest) ? digest : "";
}

function parseUnsigned(value, maximum = null) {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) return null;
    const parsed = BigInt(value);
    return maximum !== null && parsed > maximum ? null : parsed;
  }
  if (typeof value === "bigint") {
    if (value < 0n || (maximum !== null && value > maximum)) return null;
    return value;
  }
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;
  try {
    let parsed;
    if (/^0x(?:0|[1-9a-f][0-9a-f]*)$/.test(raw)) parsed = BigInt(raw);
    else if (/^(?:0|[1-9][0-9]*)$/.test(raw)) parsed = BigInt(raw);
    else return null;
    if (maximum !== null && parsed > maximum) return null;
    return parsed;
  } catch {
    return null;
  }
}

function sha256Utf8(value) {
  return crypto.createHash("sha256").update(Buffer.from(value, "utf8")).digest("hex");
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new Error("non_canonical_number");
    return String(value);
  }
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map(
      (key) => JSON.stringify(key) + ":" + canonicalJson(value[key]),
    ).join(",") + "}";
  }
  throw new Error("non_canonical_value");
}

function fingerprint(value) {
  return crypto.createHash("sha256")
    .update(Buffer.from(canonicalJson(value), "utf8"))
    .digest("hex");
}

function normalizeLog(raw, expectedTransactionHash, receiptBlock, receiptBlockHash) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, reason: "receipt_log_shape_invalid" };
  }
  const address = normalizeAddress(raw.address);
  const transactionHash = normalizeHash(raw.transactionHash);
  const blockHash = normalizeHash(raw.blockHash);
  const blockNumber = parseUnsigned(raw.blockNumber);
  const logIndex = parseUnsigned(raw.logIndex ?? raw.index, MAX_U64);
  const topics = Array.isArray(raw.topics)
    ? raw.topics.map((topic) => String(topic ?? "").trim().toLowerCase())
    : null;
  const data = String(raw.data ?? "").trim().toLowerCase();

  if (!address) return { ok: false, reason: "receipt_log_address_invalid" };
  if (transactionHash !== expectedTransactionHash) {
    return { ok: false, reason: "receipt_log_transaction_hash_mismatch" };
  }
  if (blockNumber === null || blockNumber !== receiptBlock) {
    return { ok: false, reason: "receipt_log_block_number_mismatch" };
  }
  if (blockHash !== receiptBlockHash) {
    return { ok: false, reason: "receipt_log_block_hash_mismatch" };
  }
  if (logIndex === null) return { ok: false, reason: "receipt_log_index_invalid" };
  if (!topics || topics.length === 0 || topics.some((topic) => !HASH32.test(topic))) {
    return { ok: false, reason: "receipt_log_topics_invalid" };
  }
  if (!HEX_DATA.test(data)) return { ok: false, reason: "receipt_log_data_invalid" };
  if (raw.removed === true) return { ok: false, reason: "receipt_log_removed" };
  if (raw.removed !== undefined && raw.removed !== false) {
    return { ok: false, reason: "receipt_log_removed_flag_invalid" };
  }

  return {
    ok: true,
    value: Object.freeze({
      address,
      transaction_hash: transactionHash,
      block_number: blockNumber.toString(),
      block_hash: blockHash,
      log_index: logIndex.toString(),
      topics: Object.freeze([...topics]),
      data,
      removed: false,
    }),
  };
}

function normalizeReceipt(raw, expectedTransactionHash) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, reason: "receipt_shape_invalid" };
  }
  const transactionHash = normalizeHash(raw.transactionHash);
  const status = parseUnsigned(raw.status);
  const blockNumber = parseUnsigned(raw.blockNumber);
  const blockHash = normalizeHash(raw.blockHash);
  const logs = Array.isArray(raw.logs) ? raw.logs : null;

  if (transactionHash !== expectedTransactionHash) {
    return { ok: false, reason: "receipt_transaction_hash_mismatch" };
  }
  if (status !== 1n) return { ok: false, reason: "receipt_execution_not_success" };
  if (blockNumber === null || blockNumber <= 0n) {
    return { ok: false, reason: "receipt_block_number_invalid" };
  }
  if (!blockHash) return { ok: false, reason: "receipt_block_hash_invalid" };
  if (!logs || logs.length > MAX_RECEIPT_LOGS) {
    return { ok: false, reason: "receipt_logs_invalid" };
  }

  const normalizedLogs = [];
  const seenLogIndexes = new Set();
  for (const rawLog of logs) {
    const normalized = normalizeLog(
      rawLog,
      expectedTransactionHash,
      blockNumber,
      blockHash,
    );
    if (!normalized.ok) return normalized;
    if (seenLogIndexes.has(normalized.value.log_index)) {
      return { ok: false, reason: "receipt_duplicate_log_index" };
    }
    seenLogIndexes.add(normalized.value.log_index);
    normalizedLogs.push(normalized.value);
  }
  normalizedLogs.sort((a, b) => {
    const ai = BigInt(a.log_index);
    const bi = BigInt(b.log_index);
    return ai < bi ? -1 : ai > bi ? 1 : 0;
  });

  const value = Object.freeze({
    transaction_hash: transactionHash,
    status: "1",
    block_number: blockNumber.toString(),
    block_hash: blockHash,
    logs: Object.freeze(normalizedLogs),
  });
  return { ok: true, value, fingerprint_sha256: fingerprint(value) };
}

function normalizeCanonicalBlock(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, reason: "canonical_block_shape_invalid" };
  }
  const number = parseUnsigned(raw.number);
  const hash = normalizeHash(raw.hash);
  const parentHash = normalizeHash(raw.parentHash);
  if (number === null || number <= 0n) {
    return { ok: false, reason: "canonical_block_number_invalid" };
  }
  if (!hash) return { ok: false, reason: "canonical_block_hash_invalid" };
  if (!parentHash) return { ok: false, reason: "canonical_block_parent_hash_invalid" };
  return {
    ok: true,
    value: Object.freeze({
      number: number.toString(),
      hash,
      parent_hash: parentHash,
    }),
  };
}

function decodeExpectedCommitmentLog(log, expected) {
  if (log.address !== expected.registry_address) {
    return { ok: false, reason: "commitment_log_registry_mismatch" };
  }
  if (log.log_index !== expected.log_index) {
    return { ok: false, reason: "commitment_log_index_mismatch" };
  }
  if (log.topics.length !== 3) {
    return { ok: false, reason: "commitment_log_topic_count_invalid" };
  }

  let parsed;
  try {
    parsed = COMMITMENT_INTERFACE.parseLog({
      topics: [...log.topics],
      data: log.data,
    });
  } catch {
    parsed = null;
  }
  if (!parsed || parsed.name !== "ContentCommitted") {
    return { ok: false, reason: "commitment_event_decode_failed" };
  }

  const objectIdSha256 = String(parsed.args[0] ?? "").toLowerCase();
  const contentSha256 = String(parsed.args[1] ?? "").toLowerCase();
  let byteLength;
  let committedAtBlock;
  try {
    byteLength = BigInt(parsed.args[2]);
    committedAtBlock = BigInt(parsed.args[3]);
  } catch {
    return { ok: false, reason: "commitment_event_numeric_decode_failed" };
  }

  if (objectIdSha256 !== "0x" + expected.object_id_sha256) {
    return { ok: false, reason: "commitment_event_object_id_mismatch" };
  }
  if (contentSha256 !== "0x" + expected.content_sha256) {
    return { ok: false, reason: "commitment_event_content_sha256_mismatch" };
  }
  if (byteLength.toString() !== expected.byte_length) {
    return { ok: false, reason: "commitment_event_byte_length_mismatch" };
  }
  if (committedAtBlock.toString() !== expected.block_number) {
    return { ok: false, reason: "commitment_event_block_number_mismatch" };
  }

  return {
    ok: true,
    value: Object.freeze({
      object_id_sha256: expected.object_id_sha256,
      content_sha256: expected.content_sha256,
      byte_length: expected.byte_length,
      committed_at_block: expected.block_number,
    }),
  };
}

export function verifyDatanetChain2050CommitmentReceiptV1(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return held("input_shape_invalid");
  }

  if (String(input.chain_id ?? "").trim() !== "2050") {
    return held("chain_id_mismatch");
  }

  const registryAddress = normalizeAddress(input.registry_address);
  if (!registryAddress) return held("registry_address_invalid");

  const objectId = String(input.object_id ?? "");
  if (
    !SAFE_ID.test(objectId) ||
    objectId.length > 160 ||
    Buffer.byteLength(objectId, "utf8") > 160
  ) {
    return held("object_id_invalid");
  }

  const contentSha256 = normalizeSha256(input.content_sha256);
  if (!contentSha256) return held("content_sha256_invalid");

  const byteLength = parseUnsigned(input.byte_length, MAX_OBJECT_BYTES);
  if (byteLength === null || byteLength <= 0n) return held("byte_length_invalid");

  const transactionHash = normalizeHash(input.transaction_hash);
  if (!transactionHash) return held("transaction_hash_invalid");

  const logIndex = parseUnsigned(input.log_index, MAX_U64);
  if (logIndex === null) return held("log_index_invalid");

  const expectedBase = {
    registry_address: registryAddress,
    object_id_sha256: sha256Utf8(objectId),
    content_sha256: contentSha256,
    byte_length: byteLength.toString(),
    log_index: logIndex.toString(),
  };

  const before = normalizeReceipt(input.receipt_before, transactionHash);
  if (!before.ok) return held(before.reason, { observation: "before" });
  const after = normalizeReceipt(input.receipt_after, transactionHash);
  if (!after.ok) return held(after.reason, { observation: "after" });

  if (before.fingerprint_sha256 !== after.fingerprint_sha256) {
    return held("receipt_revalidation_mismatch");
  }

  if (before.value.block_number !== after.value.block_number) {
    return held("receipt_block_number_revalidation_mismatch");
  }
  if (before.value.block_hash !== after.value.block_hash) {
    return held("receipt_block_hash_revalidation_mismatch");
  }

  const selectedBefore = before.value.logs.find(
    (log) => log.log_index === logIndex.toString(),
  );
  const selectedAfter = after.value.logs.find(
    (log) => log.log_index === logIndex.toString(),
  );
  if (!selectedBefore || !selectedAfter) return held("commitment_log_not_found");

  const expected = {
    ...expectedBase,
    block_number: before.value.block_number,
  };
  const eventBefore = decodeExpectedCommitmentLog(selectedBefore, expected);
  if (!eventBefore.ok) return held(eventBefore.reason, { observation: "before" });
  const eventAfter = decodeExpectedCommitmentLog(selectedAfter, expected);
  if (!eventAfter.ok) return held(eventAfter.reason, { observation: "after" });

  const blockBefore = normalizeCanonicalBlock(input.canonical_block_before);
  if (!blockBefore.ok) return held(blockBefore.reason, { observation: "before" });
  const blockAfter = normalizeCanonicalBlock(input.canonical_block_after);
  if (!blockAfter.ok) return held(blockAfter.reason, { observation: "after" });

  if (
    blockBefore.value.number !== before.value.block_number ||
    blockBefore.value.hash !== before.value.block_hash
  ) {
    return held("canonical_block_receipt_mismatch", { observation: "before" });
  }
  if (
    blockAfter.value.number !== after.value.block_number ||
    blockAfter.value.hash !== after.value.block_hash
  ) {
    return held("canonical_block_receipt_mismatch", { observation: "after" });
  }
  if (
    blockBefore.value.number !== blockAfter.value.number ||
    blockBefore.value.hash !== blockAfter.value.hash ||
    blockBefore.value.parent_hash !== blockAfter.value.parent_hash
  ) {
    return held("canonical_block_revalidation_mismatch");
  }

  return Object.freeze({
    ok: true,
    status: "commitment_receipt_verified",
    marker: VOID_DATANET_CHAIN2050_COMMITMENT_RECEIPT_V1,
    version: 1,
    chain_id: "2050",
    registry_address: registryAddress,
    object_id: objectId,
    object_id_sha256: expectedBase.object_id_sha256,
    content_sha256: contentSha256,
    byte_length: byteLength.toString(),
    transaction_hash: transactionHash,
    log_index: logIndex.toString(),
    block_height: before.value.block_number,
    block_hash: before.value.block_hash,
    receipt_fingerprint_sha256: before.fingerprint_sha256,
    observation_for_1464: Object.freeze({
      chain_id: "2050",
      object_id: objectId,
      content_sha256: contentSha256,
      byte_length: byteLength.toString(),
      commitment_transaction_hash: transactionHash,
      commitment_log_index: logIndex.toString(),
    }),
    event_receipt_membership_verified: true,
    receipt_revalidation_verified: true,
    canonical_block_hash_verified: true,
    durable_checkpoint_binding_verified: false,
    accepted_checkpoint_membership_verified: false,
    fork_choice_verified: false,
    peer_quorum_verified: false,
    chain_finality_verified: false,
    authority_ready_for_1464: false,
    network_call_performed: false,
    filesystem_write_performed: false,
    chain2050_mutation_performed: false,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
  });
}
