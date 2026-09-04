import crypto from "node:crypto";

export const VOID_DATANET_CHAIN_PEER_RECONSTRUCTION_V1 =
  "VOID_DATANET_CHAIN_PEER_RECONSTRUCTION_V1";
export const VOID_DATANET_CHAIN_COMMITMENT_V1 =
  "VOID_DATANET_CHAIN_COMMITMENT_V1";
export const VOID_DATANET_RECONSTRUCTION_HOLD_V1 =
  "DATANET_RECONSTRUCTION_HOLD";

export const VOID_DATANET_RECONSTRUCTION_AUTHORITY_V1 = {
  source_only_planner: true,
  chain2050_commitment_input_required: true,
  peer_majority_is_truth_authority: false,
  chain_digest_overrides_peer_claims: true,
  one_exact_authenticated_source_sufficient_for_reconstruction: true,
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
};

export const VOID_DATANET_RECONSTRUCTION_DEFAULT_POLICY_V1 = {
  max_object_bytes: 67_108_864,
  max_total_candidate_bytes: 268_435_456,
  max_peer_candidates: 64,
  target_replica_count: 3,
  max_target_replica_count: 16,
};

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{1,159}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const TX_HASH = /^0x[0-9a-f]{64}$/;
const UINT = /^(0|[1-9][0-9]*)$/;
const MAX_U32 = 0xffff_ffffn;
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
  return String(value ?? "").trim();
}

function exactKeys(value, expected, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${code}:not_object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    throw new Error(`${code}:${actual.join(",")}`);
  }
}

function canonical(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new Error("non_canonical_number");
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
  throw new Error(`non_canonical_value:${typeof value}`);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hashObject(value) {
  return sha256(Buffer.from(canonical(value), "utf8"));
}

function safeId(value, code) {
  const normalized = text(value);
  if (!SAFE_ID.test(normalized)) throw new Error(code);
  return normalized;
}

function hash64(value, code) {
  const normalized = text(value).toLowerCase();
  if (!SHA256.test(normalized)) throw new Error(code);
  return normalized;
}

function transactionHash(value, code) {
  const normalized = text(value).toLowerCase();
  if (!TX_HASH.test(normalized)) throw new Error(code);
  return normalized;
}

function uint(value, code, maximum = null) {
  const normalized = text(value);
  if (!UINT.test(normalized)) throw new Error(code);
  let parsed;
  try {
    parsed = BigInt(normalized);
  } catch {
    throw new Error(code);
  }
  if (maximum !== null && parsed > maximum) throw new Error(code);
  return { normalized, parsed };
}

function positiveSafeInteger(value, code) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(code);
  return value;
}

function boolean(value, code) {
  if (value !== true && value !== false) throw new Error(code);
  return value;
}

function bytesOrNull(value, code) {
  if (value === null) return null;
  if (!Buffer.isBuffer(value)) throw new Error(code);
  return value;
}

function hold(reason, detail = undefined) {
  return {
    ok: false,
    status: VOID_DATANET_RECONSTRUCTION_HOLD_V1,
    reason,
    ...(detail ? { detail } : {}),
    network_or_filesystem_authority_granted: false,
    chain_or_peer_mutation_authority_granted: false,
  };
}

function normalizedCommitmentInput(input) {
  exactKeys(
    input,
    EXACT_COMMITMENT_INPUT_KEYS,
    "commitment_input_unknown_or_missing_fields",
  );
  if (text(input.chain_id) !== "2050") {
    throw new Error("commitment_wrong_chain_id");
  }
  const objectId = safeId(input.object_id, "commitment_invalid_object_id");
  const contentSha256 = hash64(
    input.content_sha256,
    "commitment_invalid_content_sha256",
  );
  const byteLength = uint(input.byte_length, "commitment_invalid_byte_length");
  if (byteLength.parsed <= 0n) throw new Error("commitment_invalid_byte_length");
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

export function createDatanetChainCommitmentV1(input) {
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

export function validateDatanetChainCommitmentV1(commitment) {
  exactKeys(
    commitment,
    EXACT_COMMITMENT_KEYS,
    "commitment_unknown_or_missing_fields",
  );
  if (commitment.marker !== VOID_DATANET_CHAIN_COMMITMENT_V1) {
    throw new Error("commitment_marker_mismatch");
  }
  if (commitment.version !== 1) throw new Error("commitment_version_mismatch");
  const rebuilt = createDatanetChainCommitmentV1(
    Object.fromEntries(
      EXACT_COMMITMENT_INPUT_KEYS.map((key) => [key, commitment[key]]),
    ),
  );
  if (canonical(rebuilt) !== canonical(commitment)) {
    throw new Error("commitment_derived_identity_mismatch");
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
    throw new Error("policy_max_object_bytes_exceeds_absolute_bound");
  }
  if (policy.max_total_candidate_bytes > 1_073_741_824) {
    throw new Error("policy_total_candidate_bytes_exceeds_absolute_bound");
  }
  if (policy.max_total_candidate_bytes < policy.max_object_bytes) {
    throw new Error("policy_total_candidate_bytes_below_object_bound");
  }
  if (policy.max_peer_candidates > 256) {
    throw new Error("policy_peer_candidates_exceeds_absolute_bound");
  }
  if (policy.max_target_replica_count > 64) {
    throw new Error("policy_replica_ceiling_exceeds_absolute_bound");
  }
  if (policy.target_replica_count > policy.max_target_replica_count) {
    throw new Error("policy_target_replica_count_exceeds_ceiling");
  }
  if (policy.target_replica_count > policy.max_peer_candidates + 1) {
    throw new Error("policy_target_replica_count_unreachable");
  }
  return policy;
}

function normalizeLocal(local) {
  exactKeys(local, EXACT_LOCAL_KEYS, "local_unknown_or_missing_fields");
  const present = boolean(local.present, "local_present_not_boolean");
  const payload = bytesOrNull(local.payload, "local_payload_not_buffer_or_null");
  if (present !== (payload !== null)) {
    throw new Error("local_presence_payload_mismatch");
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
    reason: "chain_commitment_match",
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

export function planDatanetChainPeerReconstructionV1(request) {
  try {
    exactKeys(request, EXACT_REQUEST_KEYS, "request_unknown_or_missing_fields");
    const commitment = validateDatanetChainCommitmentV1(request.commitment);
    const policy = normalizePolicy(request.policy);
    const committedBytes = BigInt(commitment.byte_length);
    if (committedBytes > BigInt(policy.max_object_bytes)) {
      return hold("chain_committed_object_exceeds_policy_bound", {
        committed_byte_length: commitment.byte_length,
        max_object_bytes: String(policy.max_object_bytes),
      });
    }
    const local = normalizeLocal(request.local);
    if (!Array.isArray(request.peers)) {
      throw new Error("peers_not_array");
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

    let totalCandidateBytes = local.payload?.length ?? 0;
    for (const peer of peers) totalCandidateBytes += peer.payload?.length ?? 0;
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
      const admittedSource = peer.authenticated && payloadClassification.valid;
      return {
        peer_id: peer.peer_id,
        authenticated: peer.authenticated,
        accepts_repair: peer.accepts_repair,
        retrieval_generation: peer.retrieval_generation,
        payload_present: peer.payload !== null,
        payload_valid_against_chain: payloadClassification.valid,
        admitted_reconstruction_source: admittedSource,
        reason: !peer.authenticated && payloadClassification.valid
          ? "unauthenticated_exact_payload_not_authoritative_source"
          : payloadClassification.reason,
        observed_byte_length: payloadClassification.observed_byte_length,
        observed_sha256: payloadClassification.observed_sha256,
      };
    });

    const validSources = peerResults
      .filter((peer) => peer.admitted_reconstruction_source)
      .sort((left, right) =>
        left.peer_id.localeCompare(right.peer_id) ||
        left.retrieval_generation.localeCompare(right.retrieval_generation),
      );
    const validSourcePeers = new Set(validSources.map((peer) => peer.peer_id));
    const validReplicaCount =
      (localClassification.valid ? 1 : 0) + validSources.length;

    const repairRecipients = peerResults
      .filter(
        (peer) =>
          peer.authenticated &&
          peer.accepts_repair &&
          !validSourcePeers.has(peer.peer_id),
      )
      .map((peer) => peer.peer_id)
      .sort()
      .slice(0, Math.max(0, policy.target_replica_count - validReplicaCount));

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
      return hold("payload_unavailable_from_authenticated_exact_sources", {
        object_id: commitment.object_id,
        commitment_id: commitment.commitment_id,
        peer_results: peerResults,
        local_result: localClassification,
        peer_majority_authority_used: false,
      });
    }

    const missingReplicas = Math.max(
      0,
      policy.target_replica_count - validReplicaCount,
    );
    let status;
    if (!localValid) {
      status = "RECOVERABLE_LOCAL_RECONSTRUCTION_REQUIRED";
    } else if (missingReplicas > 0) {
      status = "AVAILABLE_REPAIR_REQUIRED";
    } else {
      status = "AVAILABLE_TARGET_REPLICAS_MET";
    }

    return {
      ok: true,
      marker: VOID_DATANET_CHAIN_PEER_RECONSTRUCTION_V1,
      status,
      commitment,
      policy,
      selected_source: selectedSource,
      local_result: {
        present: local.present,
        valid_against_chain: localClassification.valid,
        reason: localClassification.reason,
        observed_byte_length: localClassification.observed_byte_length,
        observed_sha256: localClassification.observed_sha256,
      },
      peer_results: peerResults,
      authenticated_exact_source_count: validSources.length,
      valid_replica_count: validReplicaCount,
      target_replica_count: policy.target_replica_count,
      missing_replica_count: missingReplicas,
      local_reconstruction_required: !localValid,
      repair_recipients: repairRecipients,
      repair_capacity_shortfall:
        Math.max(0, missingReplicas - repairRecipients.length),
      chain_digest_selected_over_peer_majority: true,
      peer_majority_authority_used: false,
      availability_proven_for_this_evaluation: true,
      durable_future_availability_proven: false,
      repair_execution_authority_granted: false,
      network_or_filesystem_authority_granted: false,
      chain_or_peer_mutation_authority_granted: false,
      authority: VOID_DATANET_RECONSTRUCTION_AUTHORITY_V1,
    };
  } catch (error) {
    const message = text(error?.message);
    return hold(message ? message.split(":", 1)[0] : "reconstruction_request_invalid");
  }
}
