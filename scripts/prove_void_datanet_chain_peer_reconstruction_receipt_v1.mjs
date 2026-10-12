#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { Interface } from "ethers";

import {
  VOID_DATANET_RECONSTRUCTION_AUTHORITY_V1,
  VOID_DATANET_RECONSTRUCTION_DEFAULT_POLICY_V1,
  createDatanetChainCommitmentV1 as rawCreate,
} from "./lib/void_datanet_chain_peer_reconstruction_v1.mjs";
import {
  VOID_DATANET_CHAIN_PEER_RECONSTRUCTION_RECEIPT_V1,
  planDatanetChainPeerReconstructionWithReceiptV1,
} from "./lib/void_datanet_chain_peer_reconstruction_receipt_v1.mjs";

function fixtureJson(value) {
  if (Buffer.isBuffer(value)) return JSON.stringify(value.toString("base64"));
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(fixtureJson).join(",")}]`;
  return `{${Object.keys(value).sort().map(
    (key) => `${JSON.stringify(key)}:${fixtureJson(value[key])}`,
  ).join(",")}}`;
}

const wire = (value) => Buffer.from(fixtureJson(value), "utf8");
const evidenceWire = (value) => Buffer.from(JSON.stringify(value), "utf8");

const PAYLOAD = Buffer.from(
  "VOID_DATANET_CHAIN_PEER_RECONSTRUCTION_CONTROL\n",
  "utf8",
);
const OBJECT_ID = "datanet-object-control-v1";
const CONTENT_SHA256 = crypto.createHash("sha256").update(PAYLOAD).digest("hex");
const CHECKPOINT_HASH = "0x" + "a".repeat(64);
const COMMITMENT_TX = "0x" + "b".repeat(64);
const OTHER_TX = "0x" + "c".repeat(64);
const REGISTRY = "0x1111111111111111111111111111111111111111";
const RECEIPT_BLOCK_HASH = "0x" + "4".repeat(64);
const RECEIPT_PARENT_HASH = "0x" + "5".repeat(64);

const eventInterface = new Interface([
  "event ContentCommitted(bytes32 indexed objectIdSha256, bytes32 indexed contentSha256, uint64 byteLength, uint256 committedAtBlock)",
]);
const event = eventInterface.getEvent("ContentCommitted");
if (!event) throw new Error("ContentCommitted event unavailable");

function commitmentInput(overrides = {}) {
  return {
    chain_id: "2050",
    object_id: OBJECT_ID,
    content_sha256: CONTENT_SHA256,
    byte_length: String(PAYLOAD.length),
    checkpoint_height: "1951058",
    checkpoint_block_hash: CHECKPOINT_HASH,
    accepted_checkpoint_id: "mainnet0-accepted-checkpoint-v1",
    commitment_transaction_hash: COMMITMENT_TX,
    commitment_log_index: "7",
    ...overrides,
  };
}

function commitment(overrides = {}) {
  return rawCreate(wire(commitmentInput(overrides)));
}

function request(commitmentOverrides = {}) {
  const c = commitment(commitmentOverrides);
  return {
    commitment: c,
    local: {
      present: true,
      object_id: c.object_id,
      commitment_id: c.commitment_id,
      payload: PAYLOAD,
    },
    peers: [],
    policy: { ...VOID_DATANET_RECONSTRUCTION_DEFAULT_POLICY_V1 },
  };
}

function objectDigest(value = OBJECT_ID) {
  return "0x" + crypto.createHash("sha256")
    .update(Buffer.from(value, "utf8"))
    .digest("hex");
}

function encodedEvent(options = {}) {
  return eventInterface.encodeEventLog(event, [
    options.objectIdSha256 ?? objectDigest(),
    options.contentSha256 ?? ("0x" + CONTENT_SHA256),
    options.byteLength ?? BigInt(PAYLOAD.length),
    options.committedAtBlock ?? 100n,
  ]);
}

function receiptLog(options = {}) {
  const encoded = encodedEvent(options);
  return {
    address: options.address ?? REGISTRY,
    topics: encoded.topics,
    data: encoded.data,
    transactionHash: options.transactionHash ?? COMMITMENT_TX,
    blockNumber: options.blockNumber ?? "0x64",
    blockHash: options.blockHash ?? RECEIPT_BLOCK_HASH,
    logIndex: options.logIndex ?? "0x7",
    removed: options.removed ?? false,
  };
}

function receipt(options = {}) {
  return {
    transactionHash: options.transactionHash ?? COMMITMENT_TX,
    status: options.status ?? "0x1",
    blockNumber: options.blockNumber ?? "0x64",
    blockHash: options.blockHash ?? RECEIPT_BLOCK_HASH,
    logs: options.logs ?? [receiptLog(options.logOptions ?? {})],
  };
}

function canonicalBlock(options = {}) {
  return {
    number: options.number ?? "0x64",
    hash: options.hash ?? RECEIPT_BLOCK_HASH,
    parentHash: options.parentHash ?? RECEIPT_PARENT_HASH,
  };
}

function receiptEvidence(overrides = {}) {
  return {
    chain_id: "2050",
    registry_address: REGISTRY,
    object_id: OBJECT_ID,
    content_sha256: CONTENT_SHA256,
    byte_length: String(PAYLOAD.length),
    transaction_hash: COMMITMENT_TX,
    log_index: "7",
    receipt_before: receipt(),
    receipt_after: receipt(),
    canonical_block_before: canonicalBlock(),
    canonical_block_after: canonicalBlock(),
    ...overrides,
  };
}

function compose(
  requestValue = request(),
  receiptValue = receiptEvidence(),
) {
  return planDatanetChainPeerReconstructionWithReceiptV1(
    wire(requestValue),
    evidenceWire(receiptValue),
  );
}

function assertNoOperationalAuthority(result) {
  assert.equal(result.ok, false);
  assert.equal(result.status, "DATANET_RECONSTRUCTION_HOLD");
  for (const key of [
    "availability_proven_for_this_evaluation",
    "durable_future_availability_proven",
    "chain_digest_selected_over_peer_majority",
    "reconstruction_authority_granted",
    "publication_authority_granted",
    "local_replica_admission_authority_granted",
    "retirement_authority_granted",
    "repair_execution_authority_granted",
    "network_or_filesystem_authority_granted",
    "chain_or_peer_mutation_authority_granted",
  ]) {
    assert.equal(result[key], false, key);
  }
  assert.deepEqual(result.authority, VOID_DATANET_RECONSTRUCTION_AUTHORITY_V1);
}

const green = compose();
assertNoOperationalAuthority(green);
assert.equal(
  green.receipt_composition_marker,
  VOID_DATANET_CHAIN_PEER_RECONSTRUCTION_RECEIPT_V1,
);
assert.equal(green.reason, "reference_inputs_not_independently_verified");
assert.equal(green.evidence_scope, "UNVERIFIED_REFERENCE_INPUTS");
assert.equal(green.commitment_receipt_verified, true);
assert.equal(
  green.commitment_evidence_scope,
  "SOURCE_BACKED_RECEIPT_CHECKPOINT_MEMBERSHIP_UNVERIFIED",
);
assert.equal(green.receipt_verification.event_receipt_membership_verified, true);
assert.equal(green.receipt_verification.receipt_revalidation_verified, true);
assert.equal(green.receipt_verification.canonical_block_hash_verified, true);
assert.equal(green.receipt_verification.durable_checkpoint_binding_verified, false);
assert.equal(green.receipt_verification.accepted_checkpoint_membership_verified, false);
assert.equal(green.receipt_verification.fork_choice_verified, false);
assert.equal(green.receipt_verification.peer_quorum_verified, false);
assert.equal(green.receipt_verification.chain_finality_verified, false);
assert.equal(green.receipt_verification.authority_ready_for_1464, false);
assert.equal(green.receipt_verification.block_height, "100");
assert.equal(
  green.reference_plan.reference_commitment.checkpoint_height,
  "1951058",
);
assert.equal(
  green.reference_plan.reference_commitment.checkpoint_block_hash,
  CHECKPOINT_HASH,
);
assert.notEqual(
  green.receipt_verification.block_height,
  green.reference_plan.reference_commitment.checkpoint_height,
  "receipt block must not be synthesized into checkpoint height",
);

const mismatchedReceipt = structuredClone(receiptEvidence());
mismatchedReceipt.content_sha256 = "9".repeat(64);
const verifierHeld = compose(request(), mismatchedReceipt);
assertNoOperationalAuthority(verifierHeld);
assert.equal(
  verifierHeld.reason,
  "chain2050_commitment_receipt_not_verified",
);
assert.equal(verifierHeld.commitment_receipt_verified, false);

const bindingMismatch = compose(request({
  commitment_transaction_hash: OTHER_TX,
}));
assertNoOperationalAuthority(bindingMismatch);
assert.equal(
  bindingMismatch.reason,
  "chain2050_commitment_receipt_binding_mismatch",
);
assert.equal(bindingMismatch.commitment_receipt_verified, false);

let proxyTrapCalls = 0;
const hostileEvidence = new Proxy(evidenceWire(receiptEvidence()), {
  get() {
    proxyTrapCalls += 1;
    throw new Error("proxy trap executed");
  },
});
const hostileHeld =
  planDatanetChainPeerReconstructionWithReceiptV1(
    wire(request()),
    hostileEvidence,
  );
assertNoOperationalAuthority(hostileHeld);
assert.equal(
  hostileHeld.reason,
  "chain2050_commitment_receipt_input_invalid",
);
assert.equal(proxyTrapCalls, 0);

const oversizedHeld =
  planDatanetChainPeerReconstructionWithReceiptV1(
    wire(request()),
    Buffer.alloc(4_194_305, 0x20),
  );
assertNoOperationalAuthority(oversizedHeld);
assert.equal(
  oversizedHeld.reason,
  "chain2050_commitment_receipt_input_invalid",
);

const invalidRequest =
  planDatanetChainPeerReconstructionWithReceiptV1(
    Buffer.from("{}", "utf8"),
    evidenceWire(receiptEvidence()),
  );
assertNoOperationalAuthority(invalidRequest);
assert.equal(
  Object.hasOwn(invalidRequest, "receipt_composition_marker"),
  false,
  "invalid base request must remain the original planner HOLD",
);

console.log("VOID_DATANET_CHAIN_PEER_RECONSTRUCTION_RECEIPT_V1_PROOF_GREEN");
console.log("commitment_receipt_verified=true");
console.log("accepted_checkpoint_membership_verified=false");
console.log("chain_finality_verified=false");
console.log("reconstruction_authority_granted=false");
console.log("publication_authority_granted=false");
console.log("repair_execution_authority_granted=false");
console.log("wallet_or_funds_action=false");
