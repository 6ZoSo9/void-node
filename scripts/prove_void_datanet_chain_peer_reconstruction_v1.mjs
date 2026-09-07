#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  VOID_DATANET_CHAIN_COMMITMENT_V1,
  VOID_DATANET_CHAIN_PEER_RECONSTRUCTION_V1,
  VOID_DATANET_RECONSTRUCTION_AUTHORITY_V1,
  VOID_DATANET_RECONSTRUCTION_DEFAULT_POLICY_V1,
  createDatanetChainCommitmentV1,
  planDatanetChainPeerReconstructionV1,
  validateDatanetChainCommitmentV1,
} from "./lib/void_datanet_chain_peer_reconstruction_v1.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MODULE_PATH = resolve(
  ROOT,
  "scripts/lib/void_datanet_chain_peer_reconstruction_v1.mjs",
);
const PROOF_PATH = resolve(
  ROOT,
  "scripts/prove_void_datanet_chain_peer_reconstruction_v1.mjs",
);
const DOC_PATH = resolve(
  ROOT,
  "docs/architecture/datanet-chain-peer-reconstruction-v1.md",
);
const WORKFLOW_PATH = resolve(
  ROOT,
  ".github/workflows/void-datanet-chain-peer-reconstruction-v1.yml",
);

const PAYLOAD = Buffer.from("VOID_DATANET_CHAIN_PEER_RECONSTRUCTION_CONTROL\n", "utf8");
const WRONG = Buffer.from("VOID_DATANET_CHAIN_PEER_RECONSTRUCTION_FORGED!\n", "utf8");
const SHA = "3d29e7a976352a10ad149979e7ef297384eec1d32ac9feb4f0a2d36a6815b8a0";
const CHECKPOINT_HASH = `0x${"a".repeat(64)}`;
const COMMITMENT_TX = `0x${"b".repeat(64)}`;
let cases = 0;

function check(name, fn) {
  try {
    fn();
    cases += 1;
  } catch (error) {
    error.message = `${name}: ${error.message}`;
    throw error;
  }
}

function clone(value) {
  return structuredClone(value);
}

function commitmentInput(overrides = {}) {
  return {
    chain_id: "2050",
    object_id: "datanet-object-control-v1",
    content_sha256: SHA,
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
  return createDatanetChainCommitmentV1(commitmentInput(overrides));
}

function localPresent(payload = PAYLOAD, overrides = {}) {
  const c = commitment();
  return {
    present: true,
    object_id: c.object_id,
    commitment_id: c.commitment_id,
    payload,
    ...overrides,
  };
}

function localAbsent(overrides = {}) {
  return {
    present: false,
    object_id: null,
    commitment_id: null,
    payload: null,
    ...overrides,
  };
}

function peer(id, payload = PAYLOAD, overrides = {}) {
  const c = commitment();
  return {
    peer_id: id,
    authenticated: true,
    accepts_repair: false,
    object_id: payload === null ? null : c.object_id,
    commitment_id: payload === null ? null : c.commitment_id,
    retrieval_generation: `${id}-retrieval-v1`,
    payload,
    ...overrides,
  };
}

function request(overrides = {}) {
  return {
    commitment: commitment(),
    local: localAbsent(),
    peers: [peer("peer-alpha")],
    policy: { ...VOID_DATANET_RECONSTRUCTION_DEFAULT_POLICY_V1 },
    ...overrides,
  };
}

function expectHold(input, reason) {
  const decision = planDatanetChainPeerReconstructionV1(input);
  assert.equal(decision.ok, false, JSON.stringify(decision));
  assert.equal(decision.status, "DATANET_RECONSTRUCTION_HOLD");
  assert.equal(decision.reason, reason);
  assert.equal(decision.network_or_filesystem_authority_granted, false);
  assert.equal(decision.chain_or_peer_mutation_authority_granted, false);
  return decision;
}

check("payload hash fixture", () => {
  const { createHash } = requireForProof();
  assert.equal(createHash("sha256").update(PAYLOAD).digest("hex"), SHA);
});

function requireForProof() {
  return {
    createHash: (algorithm) => {
      assert.equal(algorithm, "sha256");
      const crypto = globalThis.crypto;
      void crypto;
      return {
        chunks: [],
        update(value) {
          this.chunks.push(Buffer.from(value));
          return this;
        },
        digest(format) {
          assert.equal(format, "hex");
          const { createHash } = process.getBuiltinModule("node:crypto");
          return createHash("sha256")
            .update(Buffer.concat(this.chunks))
            .digest("hex");
        },
      };
    },
  };
}

check("commitment construction", () => {
  const c = commitment();
  assert.equal(c.marker, VOID_DATANET_CHAIN_COMMITMENT_V1);
  assert.equal(c.version, 1);
  assert.match(c.commitment_id, /^voiddncommit1_[0-9a-f]{64}$/);
  assert.equal(validateDatanetChainCommitmentV1(c).commitment_id, c.commitment_id);
});

check("commitment deterministic", () => {
  assert.deepEqual(commitment(), commitment());
});

for (const [name, value, reason] of [
  ["chain_id", "2051", "commitment_wrong_chain_id"],
  ["object_id", "x", "commitment_invalid_object_id"],
  ["object_id", "bad/id", "commitment_invalid_object_id"],
  ["content_sha256", "0x1234", "commitment_invalid_content_sha256"],
  ["content_sha256", "G".repeat(64), "commitment_invalid_content_sha256"],
  ["byte_length", "0", "commitment_invalid_byte_length"],
  ["byte_length", "01", "commitment_invalid_byte_length"],
  ["byte_length", "-1", "commitment_invalid_byte_length"],
  ["checkpoint_height", "01", "commitment_invalid_checkpoint_height"],
  ["checkpoint_height", "1.5", "commitment_invalid_checkpoint_height"],
  ["checkpoint_block_hash", "0x1234", "commitment_invalid_checkpoint_block_hash"],
  ["accepted_checkpoint_id", "x", "commitment_invalid_accepted_checkpoint_id"],
  ["accepted_checkpoint_id", "bad id", "commitment_invalid_accepted_checkpoint_id"],
  ["commitment_transaction_hash", "0x1234", "commitment_invalid_transaction_hash"],
  ["commitment_log_index", "01", "commitment_invalid_log_index"],
  ["commitment_log_index", "4294967296", "commitment_invalid_log_index"],
]) {
  check(`invalid commitment input ${name} ${value}`, () => {
    assert.throws(
      () => createDatanetChainCommitmentV1(commitmentInput({ [name]: value })),
      new RegExp(reason),
    );
  });
}

check("commitment input unknown field", () => {
  assert.throws(() =>
    createDatanetChainCommitmentV1({ ...commitmentInput(), extra: true }),
  );
});

for (const [name, mutate] of [
  ["unknown field", (c) => { c.extra = true; }],
  ["marker", (c) => { c.marker = "wrong"; }],
  ["version", (c) => { c.version = 2; }],
  ["commitment id", (c) => { c.commitment_id = `voiddncommit1_${"0".repeat(64)}`; }],
  ["object id", (c) => { c.object_id = "different-object-v1"; }],
  ["content hash", (c) => { c.content_sha256 = "0".repeat(64); }],
  ["byte length", (c) => { c.byte_length = "99"; }],
  ["checkpoint height", (c) => { c.checkpoint_height = "1951059"; }],
  ["checkpoint block", (c) => { c.checkpoint_block_hash = `0x${"c".repeat(64)}`; }],
  ["acceptance id", (c) => { c.accepted_checkpoint_id = "other-checkpoint-v1"; }],
  ["transaction hash", (c) => { c.commitment_transaction_hash = `0x${"d".repeat(64)}`; }],
  ["log index", (c) => { c.commitment_log_index = "8"; }],
]) {
  check(`tampered commitment ${name}`, () => {
    const c = clone(commitment());
    mutate(c);
    assert.throws(() => validateDatanetChainCommitmentV1(c));
  });
}

check("one authenticated exact peer reconstructs", () => {
  const decision = planDatanetChainPeerReconstructionV1(request());
  assert.equal(decision.ok, true);
  assert.equal(decision.status, "RECOVERABLE_LOCAL_RECONSTRUCTION_REQUIRED");
  assert.deepEqual(decision.selected_source, {
    kind: "peer",
    id: "peer-alpha",
    retrieval_generation: "peer-alpha-retrieval-v1",
  });
  assert.equal(decision.local_reconstruction_required, true);
  assert.equal(decision.peer_majority_authority_used, false);
});

check("healthy target replicas", () => {
  const decision = planDatanetChainPeerReconstructionV1(
    request({
      local: localPresent(),
      peers: [peer("peer-alpha"), peer("peer-bravo")],
    }),
  );
  assert.equal(decision.ok, true);
  assert.equal(decision.status, "AVAILABLE_TARGET_REPLICAS_MET");
  assert.equal(decision.valid_replica_count, 3);
  assert.equal(decision.missing_replica_count, 0);
});

check("local valid but repair required", () => {
  const decision = planDatanetChainPeerReconstructionV1(
    request({ local: localPresent(), peers: [] }),
  );
  assert.equal(decision.ok, true);
  assert.equal(decision.status, "AVAILABLE_REPAIR_REQUIRED");
  assert.equal(decision.repair_capacity_shortfall, 2);
});

check("deterministic repair recipients", () => {
  const decision = planDatanetChainPeerReconstructionV1(
    request({
      local: localPresent(),
      peers: [
        peer("peer-zulu", null, { accepts_repair: true }),
        peer("peer-alpha", null, { accepts_repair: true }),
        peer("peer-bravo", null, { accepts_repair: true }),
      ],
    }),
  );
  assert.deepEqual(decision.repair_recipients, ["peer-alpha", "peer-bravo"]);
  assert.equal(decision.repair_execution_authority_granted, false);
});

check("forged majority cannot override chain", () => {
  const forged = Array.from({ length: 12 }, (_, index) =>
    peer(`forged-peer-${String(index).padStart(2, "0")}`, WRONG),
  );
  const decision = planDatanetChainPeerReconstructionV1(
    request({
      peers: [...forged, peer("honest-peer")],
      policy: {
        ...VOID_DATANET_RECONSTRUCTION_DEFAULT_POLICY_V1,
        max_object_bytes: 1024,
        max_total_candidate_bytes: 4096,
      },
    }),
  );
  assert.equal(decision.ok, true);
  assert.equal(decision.selected_source.id, "honest-peer");
  assert.equal(decision.authenticated_exact_source_count, 1);
  assert.equal(decision.chain_digest_selected_over_peer_majority, true);
  assert.equal(
    decision.peer_results.filter((candidate) => candidate.payload_valid_against_chain).length,
    1,
  );
});

check("all forged peers hold", () => {
  const forged = Array.from({ length: 10 }, (_, index) =>
    peer(`forged-${index}`, WRONG),
  );
  expectHold(
    request({
      peers: forged,
      policy: {
        ...VOID_DATANET_RECONSTRUCTION_DEFAULT_POLICY_V1,
        max_object_bytes: 1024,
        max_total_candidate_bytes: 4096,
      },
    }),
    "payload_unavailable_from_authenticated_exact_sources",
  );
});

check("unauthenticated exact payload is not source", () => {
  const decision = expectHold(
    request({ peers: [peer("peer-alpha", PAYLOAD, { authenticated: false })] }),
    "payload_unavailable_from_authenticated_exact_sources",
  );
  assert.equal(
    decision.detail.peer_results[0].reason,
    "unauthenticated_exact_payload_not_authoritative_source",
  );
});

check("lexicographically deterministic source", () => {
  const decision = planDatanetChainPeerReconstructionV1(
    request({ peers: [peer("peer-zulu"), peer("peer-alpha"), peer("peer-mike")] }),
  );
  assert.equal(decision.ok, true);
  assert.equal(decision.selected_source.id, "peer-alpha");
});

for (const [name, overrides, expectedReason] of [
  ["object mismatch", { object_id: "different-object-v1" }, "object_id_mismatch"],
  ["commitment mismatch", { commitment_id: "different-commitment-v1" }, "commitment_generation_mismatch"],
  ["wrong bytes", { payload: WRONG }, "content_sha256_mismatch"],
  ["absent", { payload: null, object_id: null, commitment_id: null }, "payload_absent"],
]) {
  check(`peer ${name} rejected`, () => {
    const decision = expectHold(
      request({ peers: [peer("peer-alpha", PAYLOAD, overrides)] }),
      "payload_unavailable_from_authenticated_exact_sources",
    );
    assert.equal(decision.detail.peer_results[0].reason, expectedReason);
  });
}

check("same-length forged bytes rejected", () => {
  const forged = Buffer.from(PAYLOAD);
  forged[0] ^= 0xff;
  const decision = expectHold(
    request({ peers: [peer("peer-alpha", forged)] }),
    "payload_unavailable_from_authenticated_exact_sources",
  );
  assert.equal(decision.detail.peer_results[0].reason, "content_sha256_mismatch");
});

for (let index = 0; index < 32; index += 1) {
  check(`forged peer ${index} cannot become authority`, () => {
    const forged = Buffer.from(PAYLOAD);
    forged[index % forged.length] ^= (index + 1) & 0xff;
    const decision = planDatanetChainPeerReconstructionV1(
      request({
        peers: [peer(`forged-peer-${index}`, forged), peer("exact-peer")],
      }),
    );
    assert.equal(decision.ok, true);
    assert.equal(decision.selected_source.id, "exact-peer");
    assert.equal(decision.peer_majority_authority_used, false);
  });
}

check("local corruption repaired from peer", () => {
  const decision = planDatanetChainPeerReconstructionV1(
    request({ local: localPresent(WRONG) }),
  );
  assert.equal(decision.ok, true);
  assert.equal(decision.status, "RECOVERABLE_LOCAL_RECONSTRUCTION_REQUIRED");
  assert.equal(decision.local_result.valid_against_chain, false);
  assert.equal(decision.selected_source.kind, "peer");
});

for (const [name, local, reason] of [
  ["present null payload", { ...localAbsent(), present: true }, "local_presence_payload_mismatch"],
  ["absent non-null payload", { ...localPresent(), present: false }, "local_presence_payload_mismatch"],
  ["present non-buffer", { ...localPresent(), payload: "bytes" }, "local_payload_not_buffer_or_null"],
  ["invalid object", { ...localPresent(), object_id: "x" }, "local_invalid_object_id"],
  ["invalid commitment", { ...localPresent(), commitment_id: "x" }, "local_invalid_commitment_id"],
  ["unknown field", { ...localAbsent(), extra: true }, "local_unknown_or_missing_fields"],
]) {
  check(`invalid local ${name}`, () => {
    expectHold(request({ local }), reason);
  });
}

for (const [name, overrides, reason] of [
  ["bad peer id", { peer_id: "x" }, "peer_invalid_peer_id"],
  ["bad authentication", { authenticated: "yes" }, "peer_authenticated_not_boolean"],
  ["bad repair flag", { accepts_repair: 1 }, "peer_accepts_repair_not_boolean"],
  ["bad object id", { object_id: "x" }, "peer_invalid_object_id"],
  ["bad commitment id", { commitment_id: "x" }, "peer_invalid_commitment_id"],
  ["bad generation", { retrieval_generation: "x" }, "peer_invalid_retrieval_generation"],
  ["bad payload", { payload: "bytes" }, "peer_payload_not_buffer_or_null"],
  ["unknown field", { extra: true }, "peer_unknown_or_missing_fields"],
]) {
  check(`invalid peer ${name}`, () => {
    expectHold(request({ peers: [peer("peer-alpha", PAYLOAD, overrides)] }), reason);
  });
}

check("duplicate peer id holds", () => {
  expectHold(
    request({
      peers: [peer("peer-alpha"), peer("peer-alpha", PAYLOAD, { retrieval_generation: "peer-alpha-v2" })],
    }),
    "duplicate_peer_id",
  );
});

check("too many peers holds", () => {
  const peers = Array.from({ length: 5 }, (_, index) => peer(`peer-${index}`));
  expectHold(
    request({
      peers,
      policy: {
        ...VOID_DATANET_RECONSTRUCTION_DEFAULT_POLICY_V1,
        max_peer_candidates: 4,
        target_replica_count: 3,
      },
    }),
    "peer_candidate_count_exceeds_policy_bound",
  );
});

check("total candidate bytes bound", () => {
  expectHold(
    request({
      local: localPresent(),
      peers: [peer("peer-alpha")],
      policy: {
        ...VOID_DATANET_RECONSTRUCTION_DEFAULT_POLICY_V1,
        max_object_bytes: PAYLOAD.length,
        max_total_candidate_bytes: PAYLOAD.length,
      },
    }),
    "total_candidate_bytes_exceed_policy_bound",
  );
});

check("committed object policy bound", () => {
  expectHold(
    request({
      policy: {
        ...VOID_DATANET_RECONSTRUCTION_DEFAULT_POLICY_V1,
        max_object_bytes: PAYLOAD.length - 1,
        max_total_candidate_bytes: 1024,
      },
    }),
    "chain_committed_object_exceeds_policy_bound",
  );
});

for (const [field, value, reason] of [
  ["max_object_bytes", 0, "policy_invalid_max_object_bytes"],
  ["max_object_bytes", 268435457, "policy_max_object_bytes_exceeds_absolute_bound"],
  ["max_total_candidate_bytes", 0, "policy_invalid_max_total_candidate_bytes"],
  ["max_total_candidate_bytes", 1073741825, "policy_total_candidate_bytes_exceeds_absolute_bound"],
  ["max_peer_candidates", 0, "policy_invalid_max_peer_candidates"],
  ["max_peer_candidates", 257, "policy_peer_candidates_exceeds_absolute_bound"],
  ["target_replica_count", 0, "policy_invalid_target_replica_count"],
  ["max_target_replica_count", 0, "policy_invalid_max_target_replica_count"],
  ["max_target_replica_count", 65, "policy_replica_ceiling_exceeds_absolute_bound"],
]) {
  check(`invalid policy ${field} ${value}`, () => {
    expectHold(
      request({
        policy: {
          ...VOID_DATANET_RECONSTRUCTION_DEFAULT_POLICY_V1,
          [field]: value,
        },
      }),
      reason,
    );
  });
}

check("policy total below object", () => {
  expectHold(
    request({
      policy: {
        ...VOID_DATANET_RECONSTRUCTION_DEFAULT_POLICY_V1,
        max_object_bytes: 100,
        max_total_candidate_bytes: 99,
      },
    }),
    "policy_total_candidate_bytes_below_object_bound",
  );
});

check("policy target above ceiling", () => {
  expectHold(
    request({
      policy: {
        ...VOID_DATANET_RECONSTRUCTION_DEFAULT_POLICY_V1,
        target_replica_count: 5,
        max_target_replica_count: 4,
      },
    }),
    "policy_target_replica_count_exceeds_ceiling",
  );
});

check("policy target unreachable", () => {
  expectHold(
    request({
      policy: {
        ...VOID_DATANET_RECONSTRUCTION_DEFAULT_POLICY_V1,
        max_peer_candidates: 2,
        target_replica_count: 4,
        max_target_replica_count: 4,
      },
    }),
    "policy_target_replica_count_unreachable",
  );
});

check("policy unknown field", () => {
  expectHold(
    request({
      policy: {
        ...VOID_DATANET_RECONSTRUCTION_DEFAULT_POLICY_V1,
        extra: true,
      },
    }),
    "policy_unknown_or_missing_fields",
  );
});

check("request unknown field", () => {
  expectHold({ ...request(), extra: true }, "request_unknown_or_missing_fields");
});

check("peers must be array", () => {
  expectHold(request({ peers: {} }), "peers_not_array");
});

for (let index = 0; index < 12; index += 1) {
  check(`exact source remains authoritative across peer order ${index}`, () => {
    const left = peer(`wrong-left-${index}`, Buffer.from(WRONG));
    const exact = peer(`exact-source-${index}`);
    const right = peer(`wrong-right-${index}`, Buffer.from(WRONG));
    const candidates = index % 3 === 0
      ? [left, exact, right]
      : index % 3 === 1
        ? [exact, right, left]
        : [right, left, exact];
    const decision = planDatanetChainPeerReconstructionV1(
      request({ peers: candidates }),
    );
    assert.equal(decision.ok, true);
    assert.equal(decision.selected_source.id, `exact-source-${index}`);
    assert.equal(decision.authenticated_exact_source_count, 1);
    assert.equal(decision.peer_majority_authority_used, false);
  });
}

check("authority remains negative", () => {
  const decision = planDatanetChainPeerReconstructionV1(request());
  assert.equal(decision.ok, true);
  assert.deepEqual(decision.authority, VOID_DATANET_RECONSTRUCTION_AUTHORITY_V1);
  assert.equal(decision.durable_future_availability_proven, false);
  assert.equal(decision.repair_execution_authority_granted, false);
});

check("default policy exact", () => {
  assert.deepEqual(VOID_DATANET_RECONSTRUCTION_DEFAULT_POLICY_V1, {
    max_object_bytes: 67_108_864,
    max_total_candidate_bytes: 268_435_456,
    max_peer_candidates: 64,
    target_replica_count: 3,
    max_target_replica_count: 16,
  });
});

check("documentation doctrine", () => {
  const doc = readFileSync(DOC_PATH, "utf8");
  for (const marker of [
    "Chain-2050",
    "peer majority",
    "one exact authenticated source",
    "forged majority",
    "availability",
    "does not prove durable future availability",
    "no repair execution",
    "V510",
  ]) {
    assert.match(
      doc,
      new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
    );
  }
});

check("workflow topology", () => {
  const workflow = readFileSync(WORKFLOW_PATH, "utf8");
  for (const marker of [
    "runs-on: ubuntu-24.04",
    "node: [22, 24, 26]",
    "permissions:",
    "contents: read",
    "persist-credentials: false",
    "node --check scripts/lib/void_datanet_chain_peer_reconstruction_v1.mjs",
    "node scripts/prove_void_datanet_chain_peer_reconstruction_v1.mjs",
    "git diff --check",
  ]) {
    assert.ok(workflow.includes(marker), marker);
  }
  assert.match(workflow, /actions\/checkout@[0-9a-f]{40}/);
  assert.match(workflow, /actions\/setup-node@[0-9a-f]{40}/);
});

check("source paths nonempty", () => {
  for (const path of [MODULE_PATH, PROOF_PATH, DOC_PATH, WORKFLOW_PATH]) {
    assert.ok(readFileSync(path).length > 0, path);
  }
});

assert.ok(cases >= 125, `expected at least 125 cases, observed ${cases}`);
console.log("VOID_DATANET_CHAIN_PEER_RECONSTRUCTION_V1_GREEN");
console.log("chain2050_commitment_required=true");
console.log("chain_digest_overrides_peer_majority=true");
console.log("forged_peer_majority_rejected=true");
console.log("one_exact_authenticated_source_sufficient=true");
console.log("local_cache_override=false");
console.log("deterministic_repair_plan=true");
console.log("bounded_peer_and_byte_work=true");
console.log("durable_future_availability_claim=false");
console.log("network_filesystem_repair_chain_mutation=false");
console.log(`cases=${cases}`);
