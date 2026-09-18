import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { Interface } from "ethers";
import {
  VOID_DATANET_CHAIN2050_COMMITMENT_RECEIPT_AUTHORITY_V1,
  verifyDatanetChain2050CommitmentReceiptV1,
} from "./lib/void_datanet_chain2050_commitment_receipt_v1.mjs";

const registry = "0x1111111111111111111111111111111111111111";
const otherRegistry = "0x2222222222222222222222222222222222222222";
const txHash = "0x" + "3".repeat(64);
const blockHash = "0x" + "4".repeat(64);
const parentHash = "0x" + "5".repeat(64);
const objectId = "void-object:receipt-proof-v1";
const contentSha256 = "6".repeat(64);
const byteLength = 4096n;
const blockNumber = 100n;
const logIndex = 7n;

const eventInterface = new Interface([
  "event ContentCommitted(bytes32 indexed objectIdSha256, bytes32 indexed contentSha256, uint64 byteLength, uint256 committedAtBlock)",
]);
const event = eventInterface.getEvent("ContentCommitted");
if (!event) throw new Error("ContentCommitted event unavailable");

function objectDigest(value = objectId) {
  return "0x" + crypto.createHash("sha256")
    .update(Buffer.from(value, "utf8"))
    .digest("hex");
}

function encodedEvent(options = {}) {
  return eventInterface.encodeEventLog(event, [
    options.objectIdSha256 ?? objectDigest(),
    options.contentSha256 ?? ("0x" + contentSha256),
    options.byteLength ?? byteLength,
    options.committedAtBlock ?? blockNumber,
  ]);
}

function log(options = {}) {
  const encoded = encodedEvent(options);
  return {
    address: options.address ?? registry,
    topics: encoded.topics,
    data: encoded.data,
    transactionHash: options.transactionHash ?? txHash,
    blockNumber: options.blockNumber ?? "0x64",
    blockHash: options.blockHash ?? blockHash,
    logIndex: options.logIndex ?? "0x7",
    removed: options.removed ?? false,
  };
}

function receipt(options = {}) {
  return {
    transactionHash: options.transactionHash ?? txHash,
    status: options.status ?? "0x1",
    blockNumber: options.blockNumber ?? "0x64",
    blockHash: options.blockHash ?? blockHash,
    logs: options.logs ?? [log(options.logOptions ?? {})],
  };
}

function block(options = {}) {
  return {
    number: options.number ?? "0x64",
    hash: options.hash ?? blockHash,
    parentHash: options.parentHash ?? parentHash,
  };
}

function input() {
  return {
    chain_id: "2050",
    registry_address: registry,
    object_id: objectId,
    content_sha256: contentSha256,
    byte_length: byteLength.toString(),
    transaction_hash: txHash,
    log_index: logIndex.toString(),
    receipt_before: receipt(),
    receipt_after: receipt(),
    canonical_block_before: block(),
    canonical_block_after: block(),
  };
}

function expectHeld(reason, mutate) {
  const candidate = structuredClone(input());
  mutate(candidate);
  const decision = verifyDatanetChain2050CommitmentReceiptV1(candidate);
  assert.equal(decision.ok, false, "expected held decision for " + reason);
  assert.equal(decision.reason, reason);
}

const green = verifyDatanetChain2050CommitmentReceiptV1(input());
assert.equal(green.ok, true);
if (!green.ok) throw new Error(green.reason);
assert.equal(green.status, "commitment_receipt_verified");
assert.equal(green.chain_id, "2050");
assert.equal(green.registry_address, registry);
assert.equal(green.object_id, objectId);
assert.equal(green.object_id_sha256, objectDigest().slice(2));
assert.equal(green.content_sha256, contentSha256);
assert.equal(green.byte_length, "4096");
assert.equal(green.transaction_hash, txHash);
assert.equal(green.log_index, "7");
assert.equal(green.block_height, "100");
assert.equal(green.block_hash, blockHash);
assert.match(green.receipt_fingerprint_sha256, /^[0-9a-f]{64}$/);
assert.deepEqual(green.observation_for_1464, {
  chain_id: "2050",
  object_id: objectId,
  content_sha256: contentSha256,
  byte_length: "4096",
  commitment_transaction_hash: txHash,
  commitment_log_index: "7",
});
assert.equal(green.event_receipt_membership_verified, true);
assert.equal(green.receipt_revalidation_verified, true);
assert.equal(green.canonical_block_hash_verified, true);
assert.equal(green.durable_checkpoint_binding_verified, false);
assert.equal(green.accepted_checkpoint_membership_verified, false);
assert.equal(green.fork_choice_verified, false);
assert.equal(green.peer_quorum_verified, false);
assert.equal(green.chain_finality_verified, false);
assert.equal(green.authority_ready_for_1464, false);
assert.equal(green.network_call_performed, false);
assert.equal(green.filesystem_write_performed, false);
assert.equal(green.chain2050_mutation_performed, false);
assert.equal(green.wallet_access_performed, false);
assert.equal(green.signing_performed, false);
assert.equal(green.transaction_broadcast_performed, false);
assert.equal(green.money_movement_performed, false);

assert.equal(VOID_DATANET_CHAIN2050_COMMITMENT_RECEIPT_AUTHORITY_V1.chain_id_verified, true);
assert.equal(VOID_DATANET_CHAIN2050_COMMITMENT_RECEIPT_AUTHORITY_V1.event_receipt_membership_verified, true);
assert.equal(VOID_DATANET_CHAIN2050_COMMITMENT_RECEIPT_AUTHORITY_V1.receipt_revalidation_verified, true);
assert.equal(VOID_DATANET_CHAIN2050_COMMITMENT_RECEIPT_AUTHORITY_V1.canonical_block_hash_verified, true);
assert.equal(VOID_DATANET_CHAIN2050_COMMITMENT_RECEIPT_AUTHORITY_V1.accepted_checkpoint_membership_verified, false);
assert.equal(VOID_DATANET_CHAIN2050_COMMITMENT_RECEIPT_AUTHORITY_V1.chain_finality_verified, false);

expectHeld("chain_id_mismatch", (x) => { x.chain_id = "1"; });
expectHeld("registry_address_invalid", (x) => { x.registry_address = "0x1234"; });
expectHeld("object_id_invalid", (x) => { x.object_id = "x"; });
expectHeld("content_sha256_invalid", (x) => { x.content_sha256 = "xyz"; });
expectHeld("byte_length_invalid", (x) => { x.byte_length = "268435457"; });
expectHeld("transaction_hash_invalid", (x) => { x.transaction_hash = "0x1234"; });
expectHeld("log_index_invalid", (x) => { x.log_index = "18446744073709551616"; });

expectHeld("receipt_execution_not_success", (x) => {
  x.receipt_before.status = "0x0";
});
expectHeld("receipt_transaction_hash_mismatch", (x) => {
  x.receipt_before.transactionHash = "0x" + "9".repeat(64);
});
expectHeld("receipt_log_transaction_hash_mismatch", (x) => {
  x.receipt_before.logs[0].transactionHash = "0x" + "9".repeat(64);
});
expectHeld("receipt_log_block_hash_mismatch", (x) => {
  x.receipt_before.logs[0].blockHash = "0x" + "9".repeat(64);
});
expectHeld("receipt_log_removed", (x) => {
  x.receipt_before.logs[0].removed = true;
});
expectHeld("receipt_duplicate_log_index", (x) => {
  const extra = structuredClone(x.receipt_before.logs[0]);
  extra.address = otherRegistry;
  x.receipt_before.logs.push(extra);
});
expectHeld("receipt_revalidation_mismatch", (x) => {
  x.receipt_after.logs[0].address = otherRegistry;
});

expectHeld("commitment_log_not_found", (x) => {
  x.log_index = "8";
});
expectHeld("commitment_log_registry_mismatch", (x) => {
  x.receipt_before.logs[0].address = otherRegistry;
  x.receipt_after.logs[0].address = otherRegistry;
});
expectHeld("commitment_event_object_id_mismatch", (x) => {
  const wrong = encodedEvent({ objectIdSha256: objectDigest("void-object:wrong") });
  for (const key of ["receipt_before", "receipt_after"]) {
    x[key].logs[0].topics = wrong.topics;
    x[key].logs[0].data = wrong.data;
  }
});
expectHeld("commitment_event_content_sha256_mismatch", (x) => {
  const wrong = encodedEvent({ contentSha256: "0x" + "a".repeat(64) });
  for (const key of ["receipt_before", "receipt_after"]) {
    x[key].logs[0].topics = wrong.topics;
    x[key].logs[0].data = wrong.data;
  }
});
expectHeld("commitment_event_byte_length_mismatch", (x) => {
  const wrong = encodedEvent({ byteLength: 8192n });
  for (const key of ["receipt_before", "receipt_after"]) {
    x[key].logs[0].topics = wrong.topics;
    x[key].logs[0].data = wrong.data;
  }
});
expectHeld("commitment_event_block_number_mismatch", (x) => {
  const wrong = encodedEvent({ committedAtBlock: 99n });
  for (const key of ["receipt_before", "receipt_after"]) {
    x[key].logs[0].topics = wrong.topics;
    x[key].logs[0].data = wrong.data;
  }
});
expectHeld("canonical_block_receipt_mismatch", (x) => {
  x.canonical_block_before.hash = "0x" + "8".repeat(64);
});
expectHeld("canonical_block_revalidation_mismatch", (x) => {
  x.canonical_block_after.parentHash = "0x" + "8".repeat(64);
});

const contractText = fs.readFileSync(
  "contracts/mainnet/DatanetContentCommitmentRegistryV1.sol",
  "utf8",
);
assert.match(
  contractText,
  /event ContentCommitted\(\s*bytes32 indexed objectIdSha256,\s*bytes32 indexed contentSha256,\s*uint64 byteLength,\s*uint256 committedAtBlock\s*\)/s,
);
assert.match(contractText, /uint64 internal constant _MAX_OBJECT_BYTES = 268_435_456/);
assert.match(contractText, /emit ContentCommitted\(/);

console.log("VOID_DATANET_CHAIN2050_COMMITMENT_RECEIPT_V1_PROOF_GREEN");
console.log("event_receipt_membership_verified=true");
console.log("receipt_revalidation_verified=true");
console.log("canonical_block_hash_verified=true");
console.log("accepted_checkpoint_membership_verified=false");
console.log("fork_choice_verified=false");
console.log("peer_quorum_verified=false");
console.log("chain_finality_verified=false");
console.log("authority_ready_for_1464=false");
console.log("network_call_performed=false");
console.log("filesystem_write_performed=false");
console.log("chain2050_mutation_performed=false");
console.log("transaction_broadcast_performed=false");
console.log("money_movement_performed=false");
