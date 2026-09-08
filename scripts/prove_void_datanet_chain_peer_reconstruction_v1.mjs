#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  VOID_DATANET_CHAIN_COMMITMENT_V1,
  VOID_DATANET_CHAIN_PEER_RECONSTRUCTION_V1,
  VOID_DATANET_RECONSTRUCTION_AUTHORITY_V1,
  VOID_DATANET_RECONSTRUCTION_DEFAULT_POLICY_V1,
  createDatanetChainCommitmentV1,
  planDatanetChainPeerReconstructionV1 as evaluate,
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
const caseNames = [];
assert.ok(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === "--case-manifest"));

// This raw API check deliberately precedes the reference-algorithm checks.
// The old result must not remain usable as a successful availability gate.
const unverifiedResult = evaluate(request());
assert.equal(unverifiedResult.ok, false, "raw caller evidence must remain HOLD");
assert.equal(unverifiedResult.status, "DATANET_RECONSTRUCTION_HOLD");
assert.equal(unverifiedResult.availability_proven_for_this_evaluation, false);

function assertOperationalHold(result) {
  assert.equal(result.ok, false);
  assert.equal(result.status, "DATANET_RECONSTRUCTION_HOLD");
  assert.equal(result.result_version, 2);
  assert.equal(result.evidence_scope, "UNVERIFIED_REFERENCE_INPUTS");
  assert.equal(result.verified_independent_replica_count, 0);
  for (const key of [
    "availability_proven_for_this_evaluation", "durable_future_availability_proven",
    "chain_digest_selected_over_peer_majority", "reconstruction_authority_granted",
    "publication_authority_granted", "local_replica_admission_authority_granted",
    "retirement_authority_granted", "repair_execution_authority_granted",
    "network_or_filesystem_authority_granted", "chain_or_peer_mutation_authority_granted",
  ]) assert.equal(result[key], false, key);
  for (const key of [
    "peer_authentication_verified", "chain_finality_verified", "independent_custody_verified",
    "replication_policy_verified", "selected_bytes_custody_bound", "publication_readmission_verified",
    "repair_execution", "money_movement",
  ]) assert.equal(result.authority[key], false, key);
  assert.equal(Object.hasOwn(result, "selected_source"), false);
  assert.equal(Object.hasOwn(result, "valid_replica_count"), false);
}

// Algorithm assertions below inspect only explicitly non-authoritative plans.
// Every call first checks the real public result's operational HOLD boundary.
function referencePlanOrHold(input) {
  const result = evaluate(input);
  assertOperationalHold(result);
  return result.reference_plan ?? result;
}

// Count hashing of the supplied payloads, excluding commitment/metadata hashes.
// Restore the shared crypto entry point even if evaluation or an assertion fails.
function evaluateWithPayloadHashCount(input) {
  const payloads = new Set([input.local.payload, ...input.peers.map((p) => p.payload)]);
  let payloadHashUpdates = 0;
  const originalCreateHash = crypto.createHash;
  crypto.createHash = function (...args) {
    const hash = originalCreateHash.apply(this, args);
    const originalUpdate = hash.update;
    hash.update = function (value, ...rest) {
      if (payloads.has(value)) payloadHashUpdates += 1;
      return originalUpdate.call(this, value, ...rest);
    };
    return hash;
  };
  try {
    return { decision: evaluate(input), payloadHashUpdates };
  } finally {
    crypto.createHash = originalCreateHash;
  }
}

function check(name, fn) {
  try {
    fn();
    cases += 1;
    caseNames.push(name);
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
  const decision = referencePlanOrHold(input);
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

check("one exact peer supplies a reference candidate", () => {
  const decision = referencePlanOrHold(request());
  assert.equal(decision.evaluated, true);
  assert.equal(decision.status, "REFERENCE_LOCAL_COPY_NEEDED");
  assert.deepEqual(decision.selected_candidate, {
    kind: "peer",
    id: "peer-alpha",
    retrieval_generation: "peer-alpha-retrieval-v1",
    commitment_id: commitment().commitment_id,
    content_sha256: SHA,
    byte_length: String(PAYLOAD.length),
    bytes_retained: false,
    requires_reacquisition_and_reverification: true,
  });
  assert.equal(decision.reference_local_copy_needed, true);
  assert.equal(decision.peer_majority_authority_used, false);
});

check("caller reference copy target met", () => {
  const decision = referencePlanOrHold(
    request({
      local: localPresent(),
      peers: [peer("peer-alpha"), peer("peer-bravo")],
    }),
  );
  assert.equal(decision.evaluated, true);
  assert.equal(decision.status, "REFERENCE_CALLER_COPY_TARGET_MET");
  assert.equal(decision.reference_copy_count, 3);
  assert.equal(decision.missing_reference_copies, 0);
});

check("local valid but repair required", () => {
  const decision = referencePlanOrHold(
    request({ local: localPresent(), peers: [] }),
  );
  assert.equal(decision.evaluated, true);
  assert.equal(decision.status, "REFERENCE_MORE_COPIES_REQUESTED");
  assert.equal(decision.reference_repair_shortfall, 2);
});

check("deterministic repair recipients", () => {
  const decision = referencePlanOrHold(
    request({
      local: localPresent(),
      peers: [
        peer("peer-zulu", null, { accepts_repair: true }),
        peer("peer-alpha", null, { accepts_repair: true }),
        peer("peer-bravo", null, { accepts_repair: true }),
      ],
    }),
  );
  assert.deepEqual(decision.candidate_repair_recipients, ["peer-alpha", "peer-bravo"]);
});

check("forged majority cannot override reference digest", () => {
  const forged = Array.from({ length: 12 }, (_, index) =>
    peer(`forged-peer-${String(index).padStart(2, "0")}`, WRONG),
  );
  const decision = referencePlanOrHold(
    request({
      peers: [...forged, peer("honest-peer")],
      policy: {
        ...VOID_DATANET_RECONSTRUCTION_DEFAULT_POLICY_V1,
        max_object_bytes: 1024,
        max_total_candidate_bytes: 4096,
      },
    }),
  );
  assert.equal(decision.evaluated, true);
  assert.equal(decision.selected_candidate.id, "honest-peer");
  assert.equal(decision.reference_peer_candidate_count, 1);
  assert.equal(decision.reference_digest_selected_over_peer_majority, true);
  assert.equal(
    decision.reference_candidate_results.filter((candidate) => candidate.payload_matches_reference).length,
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
    "no_payload_matches_reference_commitment",
  );
});

check("unverified peer bytes remain reference candidates only", () => {
  const result = evaluate(request({ peers: [peer("peer-alpha", PAYLOAD, { authenticated: false })] }));
  assertOperationalHold(result);
  assert.equal(result.reference_plan.selected_candidate.id, "peer-alpha");
  assert.equal(result.reference_plan.reference_candidate_results[0].caller_authenticated_claim, false);
  assert.equal(result.reference_plan.reference_candidate_results[0].peer_authentication_verified, false);
});

check("lexicographically deterministic source", () => {
  const decision = referencePlanOrHold(
    request({ peers: [peer("peer-zulu"), peer("peer-alpha"), peer("peer-mike")] }),
  );
  assert.equal(decision.evaluated, true);
  assert.equal(decision.selected_candidate.id, "peer-alpha");
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
      "no_payload_matches_reference_commitment",
    );
    assert.equal(decision.detail.reference_candidate_results[0].reason, expectedReason);
  });
}

check("same-length forged bytes rejected", () => {
  const forged = Buffer.from(PAYLOAD);
  forged[0] ^= 0xff;
  const decision = expectHold(
    request({ peers: [peer("peer-alpha", forged)] }),
    "no_payload_matches_reference_commitment",
  );
  assert.equal(decision.detail.reference_candidate_results[0].reason, "content_sha256_mismatch");
});

for (let index = 0; index < 32; index += 1) {
  check(`forged peer ${index} cannot match reference digest`, () => {
    const forged = Buffer.from(PAYLOAD);
    forged[index % forged.length] ^= (index + 1) & 0xff;
    const decision = referencePlanOrHold(
      request({
        peers: [peer(`forged-peer-${index}`, forged), peer("exact-peer")],
      }),
    );
    assert.equal(decision.evaluated, true);
    assert.equal(decision.selected_candidate.id, "exact-peer");
    assert.equal(decision.peer_majority_authority_used, false);
  });
}

check("local corruption repaired from peer", () => {
  const decision = referencePlanOrHold(
    request({ local: localPresent(WRONG) }),
  );
  assert.equal(decision.evaluated, true);
  assert.equal(decision.status, "REFERENCE_LOCAL_COPY_NEEDED");
  assert.equal(decision.local_result.matches_reference, false);
  assert.equal(decision.selected_candidate.kind, "peer");
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

for (const kind of ["local", "peer"]) {
  for (const mismatchedIdentity of [false, true]) {
    check(`oversized ${kind} payload rejected before hashing, mismatched identity ${mismatchedIdentity}`, () => {
      const oversized = Buffer.alloc(PAYLOAD.length + 1);
      const identity = mismatchedIdentity ? { object_id: "foreign-object" } : {};
      const input = request({
        local: kind === "local" ? localPresent(oversized, identity) : localAbsent(),
        peers: kind === "peer"
          ? [peer("peer-alpha"), peer("peer-oversized", oversized, identity)]
          : [peer("peer-alpha")],
        policy: {
          ...VOID_DATANET_RECONSTRUCTION_DEFAULT_POLICY_V1,
          max_object_bytes: PAYLOAD.length,
          max_total_candidate_bytes: PAYLOAD.length * 4,
        },
      });
      const { decision, payloadHashUpdates } = evaluateWithPayloadHashCount(input);
      assert.equal(payloadHashUpdates, 0, "size rejection must precede all payload hashing");
      assertOperationalHold(decision);
      assert.equal(decision.reason, `${kind}_payload_bytes_exceed_policy_bound`);
      assert.equal(Object.hasOwn(decision, "reference_plan"), false);
      assert.equal(decision.detail.observed, PAYLOAD.length + 1);
      assert.equal(decision.detail.maximum, PAYLOAD.length);
      if (kind === "peer") assert.equal(decision.detail.peer_id, "peer-oversized");
    });
  }

  check(`exact per-object and aggregate boundary admits ${kind} reference bytes`, () => {
    const input = request({
      local: kind === "local" ? localPresent() : localAbsent(),
      peers: kind === "peer" ? [peer("peer-alpha")] : [],
      policy: {
        ...VOID_DATANET_RECONSTRUCTION_DEFAULT_POLICY_V1,
        max_object_bytes: PAYLOAD.length,
        max_total_candidate_bytes: PAYLOAD.length,
      },
    });
    const { decision, payloadHashUpdates } = evaluateWithPayloadHashCount(input);
    assertOperationalHold(decision);
    assert.equal(decision.reference_plan.selected_candidate.kind, kind);
    assert.equal(payloadHashUpdates, 1);
  });
}

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
  check(`exact reference candidate stable across peer order ${index}`, () => {
    const left = peer(`wrong-left-${index}`, Buffer.from(WRONG));
    const exact = peer(`exact-source-${index}`);
    const right = peer(`wrong-right-${index}`, Buffer.from(WRONG));
    const candidates = index % 3 === 0
      ? [left, exact, right]
      : index % 3 === 1
        ? [exact, right, left]
        : [right, left, exact];
    const decision = referencePlanOrHold(
      request({ peers: candidates }),
    );
    assert.equal(decision.evaluated, true);
    assert.equal(decision.selected_candidate.id, `exact-source-${index}`);
    assert.equal(decision.reference_peer_candidate_count, 1);
    assert.equal(decision.peer_majority_authority_used, false);
  });
}

check("authority remains negative", () => {
  const result = evaluate(request());
  assertOperationalHold(result);
  assert.deepEqual(result.authority, VOID_DATANET_RECONSTRUCTION_AUTHORITY_V1);
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

check("returned authority cannot poison later decisions", () => {
  const first = evaluate(request());
  for (const key of ["repair_execution", "money_movement", "network_call", "filesystem_write"]) {
    assert.equal(Reflect.set(first.authority, key, true), false, key);
    assert.equal(Reflect.set(VOID_DATANET_RECONSTRUCTION_AUTHORITY_V1, key, true), false, key);
  }
  assertOperationalHold(first);
  assertOperationalHold(evaluate(request()));
});

check("exported defaults and snapshots cannot poison future defaults", () => {
  assert.equal(Reflect.set(VOID_DATANET_RECONSTRUCTION_DEFAULT_POLICY_V1, "target_replica_count", 1), false);
  const first = evaluate(request({ policy: undefined }));
  assertOperationalHold(first);
  assert.equal(first.reference_plan.requested_policy.target_replica_count, 3);
  assert.equal(Reflect.set(first.reference_plan.requested_policy, "target_replica_count", 1), false);
  const later = evaluate(request({ policy: undefined }));
  assertOperationalHold(later);
  assert.equal(later.reference_plan.requested_copy_target, 3);
});

check("authentication boolean cannot elevate a reference candidate", () => {
  const results = [false, true].map((authenticated) =>
    evaluate(request({ peers: [peer("peer-alpha", PAYLOAD, { authenticated })] })),
  );
  for (const result of results) {
    assertOperationalHold(result);
    const candidate = result.reference_plan.reference_candidate_results[0];
    assert.equal(candidate.peer_authentication_verified, false);
    assert.equal(Object.hasOwn(candidate, "admitted_reconstruction_source"), false);
  }
  assert.deepEqual(results[0].reference_plan.selected_candidate, results[1].reference_plan.selected_candidate);
});

for (const [name, overrides] of [
  ["invented finalized event", { checkpoint_height: "999999999", accepted_checkpoint_id: "invented-policy-v1" }],
  ["earlier checkpoint", { checkpoint_height: "1" }],
  ["conflicting checkpoint", { checkpoint_block_hash: `0x${"f".repeat(64)}` }],
]) {
  check(`${name} cannot become finalized truth`, () => {
    const c = commitment(overrides);
    const result = evaluate(request({
      commitment: c,
      peers: [peer("peer-alpha", PAYLOAD, { commitment_id: c.commitment_id })],
    }));
    assertOperationalHold(result);
    assert.equal(result.reference_plan.evaluated, true);
    assert.equal(result.reference_plan.reference_commitment.commitment_id, c.commitment_id);
  });
}

check("shared-buffer aliases are only non-independent reference observations", () => {
  const result = evaluate(request({ peers: [peer("alias-a"), peer("alias-b"), peer("alias-c")] }));
  assertOperationalHold(result);
  assert.equal(result.reference_plan.reference_copy_count, 3);
  assert.equal(result.reference_plan.projected_reference_copies_after_local, 4);
  assert.equal(result.verified_independent_replica_count, 0);
  assert.equal(result.authority.independent_custody_verified, false);
});

check("target one cannot satisfy release availability", () => {
  const result = evaluate(request({ local: localPresent(), peers: [], policy: {
    max_object_bytes: PAYLOAD.length,
    max_total_candidate_bytes: PAYLOAD.length,
    max_peer_candidates: 1,
    target_replica_count: 1,
    max_target_replica_count: 1,
  } }));
  assertOperationalHold(result);
  assert.equal(result.reference_plan.status, "REFERENCE_CALLER_COPY_TARGET_MET");
  assert.equal(result.reference_plan.reference_copy_count, 1);
  assert.equal(result.reference_plan.requested_copy_target, 1);
  assert.equal(result.authority.replication_policy_verified, false);
});

check("changed bytes cannot use an old plan as publication or readmission authority", () => {
  const bytes = Buffer.from(PAYLOAD);
  const input = request({ peers: [peer("peer-alpha", bytes)] });
  const before = evaluate(input);
  assertOperationalHold(before);
  const snapshot = JSON.stringify(before);
  const selected = before.reference_plan.selected_candidate;
  assert.equal(selected.content_sha256, SHA);
  assert.equal(selected.byte_length, String(PAYLOAD.length));
  assert.equal(selected.bytes_retained, false);
  assert.equal(selected.requires_reacquisition_and_reverification, true);
  bytes[0] ^= 0xff;
  assert.equal(JSON.stringify(before), snapshot);
  assertOperationalHold(before);
  const after = evaluate(input);
  assertOperationalHold(after);
  assert.equal(after.reason, "no_payload_matches_reference_commitment");
  assert.equal(Object.hasOwn(after, "reference_plan"), false);
});

for (const [name, mutate, reason] of [
  ["request finality receipt", (r) => { r.finality_verified = true; }, "request_unknown_or_missing_fields"],
  ["commitment verifier receipt", (r) => { r.commitment.verifier_result = { verified: true }; }, "commitment_unknown_or_missing_fields"],
  ["peer authentication envelope", (r) => { r.peers[0].authentication_envelope = { verified: true }; }, "peer_unknown_or_missing_fields"],
  ["local custody receipt", (r) => { r.local.custody_domain = "trusted-volume"; }, "local_unknown_or_missing_fields"],
  ["policy approval", (r) => { r.policy.approved = true; }, "policy_unknown_or_missing_fields"],
]) {
  check(`caller-injected ${name} cannot bypass HOLD`, () => {
    const input = request();
    mutate(input);
    const result = evaluate(input);
    assertOperationalHold(result);
    assert.equal(result.reason, reason);
    assert.equal(Object.hasOwn(result, "reference_plan"), false);
  });
}

check("returned snapshots are detached immutable metadata without byte custody", () => {
  const input = request();
  const result = evaluate(input);
  const snapshot = JSON.stringify(result);
  assert.equal(Reflect.set(result, "ok", true), false);
  assert.equal(Reflect.set(result.reference_plan.selected_candidate, "id", "forged-peer"), false);
  assert.equal(Reflect.set(result.reference_plan.requested_policy, "target_replica_count", 1), false);
  assert.equal(Reflect.set(result.reference_plan.reference_commitment, "content_sha256", "0".repeat(64)), false);
  input.policy.target_replica_count = 1;
  input.peers[0].peer_id = "changed-caller-peer";
  assert.equal(Object.isFrozen(input), false);
  assert.equal(Object.isFrozen(input.policy), false);
  assert.equal(JSON.stringify(result), snapshot);
  assertOperationalHold(result);
  function inspect(value) {
    if (!value || typeof value !== "object") return;
    assert.equal(Buffer.isBuffer(value), false);
    assert.equal(Object.isFrozen(value), true);
    for (const child of Object.values(value)) inspect(child);
  }
  inspect(result);
});

check("documentation doctrine", () => {
  const doc = readFileSync(DOC_PATH, "utf8").replace(/\s+/g, " ");
  for (const marker of [
    "Chain-2050",
    "peer majority",
    "reference-only",
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
    "node scripts/void_datanet_reconstruction_evidence_v1.mjs emit planner",
    "needs: [planner, accounting]",
    "node scripts/void_datanet_reconstruction_evidence_v1.mjs aggregate",
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

assert.equal(cases, 149);
console.log("VOID_DATANET_CHAIN_PEER_RECONSTRUCTION_V1_GREEN");
console.log("reference_commitment_required=true");
console.log("reference_digest_overrides_peer_majority=true");
console.log("forged_peer_majority_rejected=true");
console.log("caller_authentication_claim_is_not_verification=true");
console.log("local_cache_override=false");
console.log("deterministic_repair_plan=true");
console.log("bounded_peer_and_byte_work=true");
console.log("oversized_candidate_rejected_before_payload_hash=true");
console.log("durable_future_availability_claim=false");
console.log("network_filesystem_repair_chain_mutation=false");
console.log("shared_authority_poisoning_rejected=true");
console.log("exported_default_policy_poisoning_rejected=true");
console.log("unverified_inputs_always_operational_hold=true");
console.log("independent_custody_not_inferred_from_aliases=true");
console.log("caller_target_not_release_availability=true");
console.log("mutable_bytes_not_publication_authority=true");
console.log("reference_result_metadata_detached_immutable=true");
console.log(`cases=${cases}`);
if (process.argv[2] === "--case-manifest") {
  console.log("case_manifest_json=" + JSON.stringify({
    schema: "VOID_DATANET_CASE_MANIFEST_V1", suite: "planner", case_names: caseNames,
  }));
}
