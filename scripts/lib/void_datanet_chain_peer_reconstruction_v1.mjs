import crypto from "node:crypto";
import { TextDecoder, types } from "node:util";

export const VOID_DATANET_RECONSTRUCTION_INGRESS_V1 = Object.freeze({
  encoding: "canonical-utf8-json-buffer", max_request_bytes: 65536,
  max_nodes: 4096, max_depth: 6, max_byte_length: "268435456",
  max_checkpoint_height: "18446744073709551615", max_log_index: "4294967295",
});
const reasons = new WeakMap();
function invalid(reason) {
  const error = new Error(reason);
  reasons.set(error, reason.split(":", 1)[0]);
  return error;
}
const typedArray = Object.getPrototypeOf(Uint8Array.prototype);
const byteLengthOf = Object.getOwnPropertyDescriptor(typedArray, "byteLength").get;
const backingOf = Object.getOwnPropertyDescriptor(typedArray, "buffer").get;
const resizableOf = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "resizable").get;
const copyBytes = Uint8Array.prototype.set;
const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

// Never inspect a caller graph. Brand checks do not execute Proxy traps. For
// real Buffers, use internal-slot getters and copy bytes without instance hooks.
function parseEnvelope(input) {
  if (typeof input !== "object" || input === null || types.isProxy(input) ||
      !types.isUint8Array(input) || Object.getPrototypeOf(input) !== Buffer.prototype) {
    throw invalid("ingress_requires_plain_buffer");
  }
  const backing = backingOf.call(input);
  if (types.isSharedArrayBuffer(backing) || resizableOf.call(backing)) {
    throw invalid("ingress_mutable_backing_store");
  }
  const length = byteLengthOf.call(input);
  if (length === 0 || length > 65536) throw invalid("ingress_request_byte_bound");
  const owned = Buffer.alloc(length);
  copyBytes.call(owned, input);
  let encoded, value;
  try { encoded = decoder.decode(owned); value = JSON.parse(encoded); }
  catch { throw invalid("ingress_invalid_utf8_json"); }
  // JSON.parse creates inert records. Bound traversal and every scalar before
  // schema regexes, canonicalization, sorting or any reference hashing.
  const pending = [[value, 0, ""]];
  let nodes = 0;
  while (pending.length) {
    const [item, depth, key] = pending.pop();
    if (++nodes > 4096 || depth > 6) throw invalid("ingress_structure_bound");
    if (typeof item === "string") {
      const decimal = {
        byte_length: [9, "commitment_invalid_byte_length"],
        checkpoint_height: [20, "commitment_invalid_checkpoint_height"],
        commitment_log_index: [10, "commitment_invalid_log_index"],
      }[key];
      if (decimal && item.length > decimal[0]) throw invalid(decimal[1]);
      const maximum = key === "payload" ? 65536 : 160;
      if (item.length > maximum || Buffer.byteLength(item, "utf8") > maximum) {
        throw invalid("ingress_scalar_byte_bound");
      }
    } else if (typeof item === "number") {
      if (!Number.isSafeInteger(item) || Object.is(item, -0)) throw invalid("ingress_noncanonical_number");
    } else if (Array.isArray(item)) {
      if (item.length > 256) throw invalid("ingress_structure_bound");
      for (let i = item.length - 1; i >= 0; i--) pending.push([item[i], depth + 1, ""]);
    } else if (item !== null && typeof item === "object") {
      const keys = Object.keys(item);
      if (keys.length > 13) throw invalid("ingress_structure_bound");
      let previous = "";
      for (const name of keys) {
        if (name.length > 40 || name <= previous) throw invalid("ingress_noncanonical_keys");
        previous = name;
        pending.push([item[name], depth + 1, name]);
      }
    }
  }
  // Insertion order was checked without sorting. Exact roundtrip also rejects
  // duplicate keys, whitespace, alternate escapes and number spellings.
  return { value, encoded };
}

export const VOID_DATANET_CHAIN_PEER_RECONSTRUCTION_V1 =
  "VOID_DATANET_CHAIN_PEER_RECONSTRUCTION_V1";
export const VOID_DATANET_CHAIN_COMMITMENT_V1 =
  "VOID_DATANET_CHAIN_COMMITMENT_V1";
export const VOID_DATANET_RECONSTRUCTION_HOLD_V1 =
  "DATANET_RECONSTRUCTION_HOLD";

// These flat, module-owned contracts are shared across calls. A returned
// authority reference must never let one caller poison a later decision.
export const VOID_DATANET_RECONSTRUCTION_AUTHORITY_V1 = Object.freeze({
  source_only_planner: true,
  chain2050_commitment_input_required: true,
  peer_majority_is_truth_authority: false,
  reference_digest_overrides_peer_claims: true,
  peer_authentication_verified: false,
  chain_finality_verified: false,
  independent_custody_verified: false,
  replication_policy_verified: false,
  selected_bytes_custody_bound: false,
  publication_readmission_verified: false,
  local_cache_can_override_chain: false,
  network_call: false,
  filesystem_read: false,
  filesystem_write: false,
  peer_mutation: false,
  repair_execution: false,
  chain2050_mutation: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  transaction_construction: false,
  transaction_broadcast: false,
  money_movement: false,
});

export const VOID_DATANET_RECONSTRUCTION_DEFAULT_POLICY_V1 = Object.freeze({
  max_object_bytes: 67_108_864,
  max_total_candidate_bytes: 268_435_456,
  max_peer_candidates: 64,
  target_replica_count: 3,
  max_target_replica_count: 16,
});

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{1,159}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const TX_HASH = /^0x[0-9a-f]{64}$/;
const UINT = /^(0|[1-9][0-9]*)$/;
const MAX_U32 = "4294967295";
const MAX_U64 = "18446744073709551615";
const EXACT_COMMITMENT_INPUT_KEYS = [
  "accepted_checkpoint_id",
  "byte_length",
  "chain_id",
  "checkpoint_block_hash",
  "checkpoint_height",
  "commitment_log_index",
  "commitment_transaction_hash",
  "content_sha256",
  "object_id",
];
const EXACT_COMMITMENT_KEYS = [
  ...EXACT_COMMITMENT_INPUT_KEYS,
  "commitment_id",
  "marker",
  "version",
];
const EXACT_POLICY_KEYS = [
  "max_object_bytes",
  "max_peer_candidates",
  "max_target_replica_count",
  "max_total_candidate_bytes",
  "target_replica_count",
];
const EXACT_LOCAL_KEYS = [
  "commitment_id",
  "object_id",
  "payload",
  "present",
];
const EXACT_PEER_KEYS = [
  "accepts_repair",
  "authenticated",
  "commitment_id",
  "object_id",
  "payload",
  "peer_id",
  "retrieval_generation",
];
const EXACT_REQUEST_KEYS = [
  "commitment",
  "local",
  "peers",
  "policy",
];

function text(value) {
  if (typeof value !== "string" || value.length > 160 || Buffer.byteLength(value) > 160) {
    throw invalid("invalid_scalar_type_or_size");
  }
  return value;
}

function exactKeys(value, expected, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw invalid(`${code}:not_object`);
  }
  const actual = Object.keys(value);
  if (actual.length !== expected.length || actual.some(key => !expected.includes(key))) {
    throw invalid(code);
  }
}

function canonical(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw invalid("non_canonical_number");
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  }
  throw invalid(`non_canonical_value:${typeof value}`);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hashObject(value) {
  return sha256(Buffer.from(canonical(value), "utf8"));
}

function safeId(value, code) {
  const normalized = text(value);
  if (!SAFE_ID.test(normalized)) throw invalid(code);
  return normalized;
}

function hash64(value, code) {
  const normalized = text(value);
  if (!SHA256.test(normalized)) throw invalid(code);
  return normalized;
}

function transactionHash(value, code) {
  const normalized = text(value);
  if (!TX_HASH.test(normalized)) throw invalid(code);
  return normalized;
}

function uint(value, code, maximum = MAX_U64) {
  // All limits are decimal strings: compare length/value before any conversion.
  if (typeof value !== "string" || value.length > maximum.length ||
      !UINT.test(value) || (value.length === maximum.length && value > maximum)) {
    throw invalid(code);
  }
  return { normalized: value };
}

function positiveSafeInteger(value, code) {
  if (!Number.isSafeInteger(value) || value <= 0) throw invalid(code);
  return value;
}

function boolean(value, code) {
  if (value !== true && value !== false) throw invalid(code);
  return value;
}

function bytesOrNull(value, code) {
  if (value === null) return null;
  if (typeof value !== "string" || value.length > 65536 || value.length % 4 !== 0 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw invalid(code);
  }
  const bytes = Buffer.from(value, "base64");
  if (bytes.toString("base64") !== value) throw invalid(code);
  return bytes;
}

function hold(reason, detail = undefined) {
  return freezeOwnedResult({
    ok: false,
    marker: VOID_DATANET_CHAIN_PEER_RECONSTRUCTION_V1,
    result_version: 2,
    status: VOID_DATANET_RECONSTRUCTION_HOLD_V1,
    reason,
    ...(detail ? { detail } : {}),
    evidence_scope: "UNVERIFIED_REFERENCE_INPUTS",
    verified_independent_replica_count: 0,
    availability_proven_for_this_evaluation: false,
    durable_future_availability_proven: false,
    chain_digest_selected_over_peer_majority: false,
    reconstruction_authority_granted: false,
    publication_authority_granted: false,
    local_replica_admission_authority_granted: false,
    retirement_authority_granted: false,
    repair_execution_authority_granted: false,
    network_or_filesystem_authority_granted: false,
    chain_or_peer_mutation_authority_granted: false,
    authority: VOID_DATANET_RECONSTRUCTION_AUTHORITY_V1,
  });
}

// Only detached JSON-shaped values created by this module enter this helper.
// Payload Buffers and caller-owned objects are never frozen or returned.
function freezeOwnedResult(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeOwnedResult(child);
    Object.freeze(value);
  }
  return value;
}

function normalizedCommitmentInput(input) {
  exactKeys(
    input,
    EXACT_COMMITMENT_INPUT_KEYS,
    "commitment_input_unknown_or_missing_fields",
  );
  if (text(input.chain_id) !== "2050") {
    throw invalid("commitment_wrong_chain_id");
  }
  const objectId = safeId(input.object_id, "commitment_invalid_object_id");
  const contentSha256 = hash64(
    input.content_sha256,
    "commitment_invalid_content_sha256",
  );
  const byteLength = uint(input.byte_length, "commitment_invalid_byte_length", "268435456");
  if (byteLength.normalized === "0") throw invalid("commitment_invalid_byte_length");
  const checkpointHeight = uint(
    input.checkpoint_height,
    "commitment_invalid_checkpoint_height",
  );
  const checkpointBlockHash = transactionHash(
    input.checkpoint_block_hash,
    "commitment_invalid_checkpoint_block_hash",
  );
  const acceptedCheckpointId = safeId(
    input.accepted_checkpoint_id,
    "commitment_invalid_accepted_checkpoint_id",
  );
  const commitmentTransactionHash = transactionHash(
    input.commitment_transaction_hash,
    "commitment_invalid_transaction_hash",
  );
  const commitmentLogIndex = uint(
    input.commitment_log_index,
    "commitment_invalid_log_index",
    MAX_U32,
  );

  return {
    chain_id: "2050",
    object_id: objectId,
    content_sha256: contentSha256,
    byte_length: byteLength.normalized,
    checkpoint_height: checkpointHeight.normalized,
    checkpoint_block_hash: checkpointBlockHash,
    accepted_checkpoint_id: acceptedCheckpointId,
    commitment_transaction_hash: commitmentTransactionHash,
    commitment_log_index: commitmentLogIndex.normalized,
  };
}

function createCommitment(input) {
  const normalized = normalizedCommitmentInput(input);
  const commitmentDigest = hashObject({
    domain: "void:datanet:chain2050:content-commitment:v1",
    ...normalized,
  });
  return {
    marker: VOID_DATANET_CHAIN_COMMITMENT_V1,
    version: 1,
    ...normalized,
    commitment_id: `voiddncommit1_${commitmentDigest}`,
  };
}

// Structural/self-derived identity validation only; no chain event or finality
// verification is performed. Planner results remain operational HOLD.
function validateCommitment(commitment) {
  exactKeys(
    commitment,
    EXACT_COMMITMENT_KEYS,
    "commitment_unknown_or_missing_fields",
  );
  if (commitment.marker !== VOID_DATANET_CHAIN_COMMITMENT_V1) {
    throw invalid("commitment_marker_mismatch");
  }
  if (commitment.version !== 1) throw invalid("commitment_version_mismatch");
  const rebuilt = createCommitment(
    Object.fromEntries(
      EXACT_COMMITMENT_INPUT_KEYS.map((key) => [key, commitment[key]]),
    ),
  );
  if (canonical(rebuilt) !== canonical(commitment)) {
    throw invalid("commitment_derived_identity_mismatch");
  }
  return rebuilt;
}

function normalizePolicy(policyInput = VOID_DATANET_RECONSTRUCTION_DEFAULT_POLICY_V1) {
  exactKeys(policyInput, EXACT_POLICY_KEYS, "policy_unknown_or_missing_fields");
  const policy = {
    max_object_bytes: positiveSafeInteger(
      policyInput.max_object_bytes,
      "policy_invalid_max_object_bytes",
    ),
    max_total_candidate_bytes: positiveSafeInteger(
      policyInput.max_total_candidate_bytes,
      "policy_invalid_max_total_candidate_bytes",
    ),
    max_peer_candidates: positiveSafeInteger(
      policyInput.max_peer_candidates,
      "policy_invalid_max_peer_candidates",
    ),
    target_replica_count: positiveSafeInteger(
      policyInput.target_replica_count,
      "policy_invalid_target_replica_count",
    ),
    max_target_replica_count: positiveSafeInteger(
      policyInput.max_target_replica_count,
      "policy_invalid_max_target_replica_count",
    ),
  };
  if (policy.max_object_bytes > 268_435_456) {
    throw invalid("policy_max_object_bytes_exceeds_absolute_bound");
  }
  if (policy.max_total_candidate_bytes > 1_073_741_824) {
    throw invalid("policy_total_candidate_bytes_exceeds_absolute_bound");
  }
  if (policy.max_total_candidate_bytes < policy.max_object_bytes) {
    throw invalid("policy_total_candidate_bytes_below_object_bound");
  }
  if (policy.max_peer_candidates > 256) {
    throw invalid("policy_peer_candidates_exceeds_absolute_bound");
  }
  if (policy.max_target_replica_count > 64) {
    throw invalid("policy_replica_ceiling_exceeds_absolute_bound");
  }
  if (policy.target_replica_count > policy.max_target_replica_count) {
    throw invalid("policy_target_replica_count_exceeds_ceiling");
  }
  if (policy.target_replica_count > policy.max_peer_candidates + 1) {
    throw invalid("policy_target_replica_count_unreachable");
  }
  return policy;
}

function normalizeLocal(local) {
  exactKeys(local, EXACT_LOCAL_KEYS, "local_unknown_or_missing_fields");
  const present = boolean(local.present, "local_present_not_boolean");
  const payload = bytesOrNull(local.payload, "local_payload_not_buffer_or_null");
  if (present !== (payload !== null)) {
    throw invalid("local_presence_payload_mismatch");
  }
  return {
    present,
    object_id: local.object_id === null
      ? null
      : safeId(local.object_id, "local_invalid_object_id"),
    commitment_id: local.commitment_id === null
      ? null
      : safeId(local.commitment_id, "local_invalid_commitment_id"),
    payload,
  };
}

function normalizePeer(peer) {
  exactKeys(peer, EXACT_PEER_KEYS, "peer_unknown_or_missing_fields");
  return {
    peer_id: safeId(peer.peer_id, "peer_invalid_peer_id"),
    authenticated: boolean(
      peer.authenticated,
      "peer_authenticated_not_boolean",
    ),
    accepts_repair: boolean(
      peer.accepts_repair,
      "peer_accepts_repair_not_boolean",
    ),
    object_id: peer.object_id === null
      ? null
      : safeId(peer.object_id, "peer_invalid_object_id"),
    commitment_id: peer.commitment_id === null
      ? null
      : safeId(peer.commitment_id, "peer_invalid_commitment_id"),
    retrieval_generation: safeId(
      peer.retrieval_generation,
      "peer_invalid_retrieval_generation",
    ),
    payload: bytesOrNull(peer.payload, "peer_payload_not_buffer_or_null"),
  };
}

function preflightCommitment(commitment) {
  exactKeys(commitment, EXACT_COMMITMENT_KEYS, "commitment_unknown_or_missing_fields");
  if (commitment.marker !== VOID_DATANET_CHAIN_COMMITMENT_V1) throw invalid("commitment_marker_mismatch");
  if (commitment.version !== 1) throw invalid("commitment_version_mismatch");
  safeId(commitment.commitment_id, "commitment_invalid_commitment_id");
  normalizedCommitmentInput(Object.fromEntries(
    EXACT_COMMITMENT_INPUT_KEYS.map(key => [key, commitment[key]]),
  ));
}

function preflightRequest(request) {
  exactKeys(request, EXACT_REQUEST_KEYS, "request_unknown_or_missing_fields");
  preflightCommitment(request.commitment);
  const policy = normalizePolicy(request.policy);
  normalizeLocal(request.local);
  if (!Array.isArray(request.peers)) throw invalid("peers_not_array");
  if (request.peers.length > policy.max_peer_candidates) throw invalid("peer_candidate_count_exceeds_policy_bound");
  for (const peer of request.peers) normalizePeer(peer);
}

// Builders/structural validators use the same byte boundary. No exported
// function accepts a live object graph; all record-consuming helpers are private.
export function createDatanetChainCommitmentV1(input) {
  const { value: record, encoded } = parseEnvelope(input);
  normalizedCommitmentInput(record);
  if (JSON.stringify(record) !== encoded) throw invalid("ingress_noncanonical_json");
  return createCommitment(record);
}

export function validateDatanetChainCommitmentV1(input) {
  const { value: record, encoded } = parseEnvelope(input);
  preflightCommitment(record);
  if (JSON.stringify(record) !== encoded) throw invalid("ingress_noncanonical_json");
  return validateCommitment(record);
}

function classifyPayload(commitment, objectId, commitmentId, payload) {
  if (payload === null) {
    return {
      valid: false,
      reason: "payload_absent",
      observed_byte_length: 0,
      observed_sha256: sha256(Buffer.alloc(0)),
    };
  }
  if (objectId !== commitment.object_id) {
    return {
      valid: false,
      reason: "object_id_mismatch",
      observed_byte_length: payload.length,
      observed_sha256: sha256(payload),
    };
  }
  if (commitmentId !== commitment.commitment_id) {
    return {
      valid: false,
      reason: "commitment_generation_mismatch",
      observed_byte_length: payload.length,
      observed_sha256: sha256(payload),
    };
  }
  const observedSha256 = sha256(payload);
  if (String(payload.length) !== commitment.byte_length) {
    return {
      valid: false,
      reason: "byte_length_mismatch",
      observed_byte_length: payload.length,
      observed_sha256: observedSha256,
    };
  }
  if (observedSha256 !== commitment.content_sha256) {
    return {
      valid: false,
      reason: "content_sha256_mismatch",
      observed_byte_length: payload.length,
      observed_sha256: observedSha256,
    };
  }
  return {
    valid: true,
    reason: "reference_commitment_match",
    observed_byte_length: payload.length,
    observed_sha256: observedSha256,
  };
}

function canonicalCandidateId(peer) {
  return hashObject({
    peer_id: peer.peer_id,
    retrieval_generation: peer.retrieval_generation,
  });
}

export function planDatanetChainPeerReconstructionV1(input) {
  try {
    const { value: request, encoded } = parseEnvelope(input);
    preflightRequest(request);
    if (JSON.stringify(request) !== encoded) throw invalid("ingress_noncanonical_json");
    exactKeys(request, EXACT_REQUEST_KEYS, "request_unknown_or_missing_fields");
    const commitment = validateCommitment(request.commitment);
    const policy = normalizePolicy(request.policy);
    const committedBytes = Number(commitment.byte_length);
    if (committedBytes > policy.max_object_bytes) {
      return hold("chain_committed_object_exceeds_policy_bound", {
        committed_byte_length: commitment.byte_length,
        max_object_bytes: String(policy.max_object_bytes),
      });
    }
    const local = normalizeLocal(request.local);
    if (!Array.isArray(request.peers)) {
      throw invalid("peers_not_array");
    }
    if (request.peers.length > policy.max_peer_candidates) {
      return hold("peer_candidate_count_exceeds_policy_bound", {
        observed: request.peers.length,
        maximum: policy.max_peer_candidates,
      });
    }
    const peers = request.peers.map(normalizePeer);
    const peerIds = new Set();
    const candidateIds = new Set();
    for (const peer of peers) {
      if (peerIds.has(peer.peer_id)) {
        return hold("duplicate_peer_id", { peer_id: peer.peer_id });
      }
      peerIds.add(peer.peer_id);
      const candidateId = canonicalCandidateId(peer);
      if (candidateIds.has(candidateId)) {
        return hold("duplicate_peer_retrieval_generation", {
          candidate_id: candidateId,
        });
      }
      candidateIds.add(candidateId);
    }

    // Bound actual candidate buffers, not only the reference's claimed size.
    // Complete all byte-budget checks before hashing any supplied payload.
    let totalCandidateBytes = local.payload?.length ?? 0;
    if (totalCandidateBytes > policy.max_object_bytes) {
      return hold("local_payload_bytes_exceed_policy_bound", {
        observed: totalCandidateBytes,
        maximum: policy.max_object_bytes,
      });
    }
    for (const peer of peers) {
      const candidateBytes = peer.payload?.length ?? 0;
      if (candidateBytes > policy.max_object_bytes) {
        return hold("peer_payload_bytes_exceed_policy_bound", {
          peer_id: peer.peer_id,
          observed: candidateBytes,
          maximum: policy.max_object_bytes,
        });
      }
      totalCandidateBytes += candidateBytes;
    }
    if (totalCandidateBytes > policy.max_total_candidate_bytes) {
      return hold("total_candidate_bytes_exceed_policy_bound", {
        observed: totalCandidateBytes,
        maximum: policy.max_total_candidate_bytes,
      });
    }

    const localClassification = classifyPayload(
      commitment,
      local.object_id,
      local.commitment_id,
      local.payload,
    );
    const peerResults = peers.map((peer) => {
      const payloadClassification = classifyPayload(
        commitment,
        peer.object_id,
        peer.commitment_id,
        peer.payload,
      );
      return {
        peer_id: peer.peer_id,
        caller_authenticated_claim: peer.authenticated,
        caller_accepts_repair_claim: peer.accepts_repair,
        peer_authentication_verified: false,
        retrieval_generation: peer.retrieval_generation,
        payload_present: peer.payload !== null,
        payload_matches_reference: payloadClassification.valid,
        reference_candidate: payloadClassification.valid,
        reason: payloadClassification.reason,
        observed_byte_length: payloadClassification.observed_byte_length,
        observed_sha256: payloadClassification.observed_sha256,
      };
    });

    const validSources = peerResults
      .filter((peer) => peer.reference_candidate)
      .sort((left, right) =>
        left.peer_id.localeCompare(right.peer_id) ||
        left.retrieval_generation.localeCompare(right.retrieval_generation),
      );
    const validSourcePeers = new Set(validSources.map((peer) => peer.peer_id));
    const validReplicaCount =
      (localClassification.valid ? 1 : 0) + validSources.length;

    const localValid = localClassification.valid;
    const selectedSource = localValid
      ? { kind: "local", id: "local", retrieval_generation: null }
      : validSources.length
        ? {
            kind: "peer",
            id: validSources[0].peer_id,
            retrieval_generation: validSources[0].retrieval_generation,
          }
        : null;

    if (!selectedSource) {
      return hold("no_payload_matches_reference_commitment", {
        object_id: commitment.object_id,
        commitment_id: commitment.commitment_id,
        reference_candidate_results: peerResults,
        local_result: localClassification,
        peer_majority_authority_used: false,
      });
    }

    const missingReplicas = Math.max(
      0,
      policy.target_replica_count - validReplicaCount,
    );
    const plannedLocalReconstructionReplicaCount = localValid ? 0 : 1;
    const projectedReplicaCountAfterLocalReconstruction =
      validReplicaCount + plannedLocalReconstructionReplicaCount;
    const remoteRepairReplicaCountRequired = Math.max(
      0,
      policy.target_replica_count -
        projectedReplicaCountAfterLocalReconstruction,
    );
    const repairRecipients = peerResults
      .filter(
        (peer) =>
          peer.caller_accepts_repair_claim &&
          !validSourcePeers.has(peer.peer_id),
      )
      .map((peer) => peer.peer_id)
      .sort()
      .slice(0, remoteRepairReplicaCountRequired);
    const projectedReplicaCountAfterPlan =
      projectedReplicaCountAfterLocalReconstruction + repairRecipients.length;
    let status;
    if (!localValid) {
      status = "REFERENCE_LOCAL_COPY_NEEDED";
    } else if (missingReplicas > 0) {
      status = "REFERENCE_MORE_COPIES_REQUESTED";
    } else {
      status = "REFERENCE_CALLER_COPY_TARGET_MET";
    }

    const referencePlan = {
      evaluated: true,
      evidence_scope: "UNVERIFIED_REFERENCE_INPUTS",
      status,
      reference_commitment: commitment,
      requested_policy: policy,
      reference_policy_sha256: hashObject(policy),
      selected_candidate: {
        ...selectedSource,
        commitment_id: commitment.commitment_id,
        content_sha256: commitment.content_sha256,
        byte_length: commitment.byte_length,
        bytes_retained: false,
        requires_reacquisition_and_reverification: true,
      },
      local_result: {
        present: local.present,
        matches_reference: localClassification.valid,
        reason: localClassification.reason,
        observed_byte_length: localClassification.observed_byte_length,
        observed_sha256: localClassification.observed_sha256,
      },
      reference_candidate_results: peerResults,
      reference_peer_candidate_count: validSources.length,
      reference_copy_count: validReplicaCount,
      requested_copy_target: policy.target_replica_count,
      missing_reference_copies: missingReplicas,
      reference_local_copy_needed: !localValid,
      hypothetical_local_copy_count:
        plannedLocalReconstructionReplicaCount,
      projected_reference_copies_after_local:
        projectedReplicaCountAfterLocalReconstruction,
      remote_reference_copies_requested: remoteRepairReplicaCountRequired,
      candidate_repair_recipients: repairRecipients,
      projected_reference_copies_after_plan: projectedReplicaCountAfterPlan,
      reference_repair_shortfall:
        Math.max(
          0,
          remoteRepairReplicaCountRequired - repairRecipients.length,
        ),
      reference_digest_selected_over_peer_majority: true,
      peer_majority_authority_used: false,
    };
    return freezeOwnedResult({
      ...hold("reference_inputs_not_independently_verified"),
      reference_plan: referencePlan,
    });
  } catch (error) {
    return hold(reasons.get(error) ?? "reconstruction_request_invalid");
  }
}
