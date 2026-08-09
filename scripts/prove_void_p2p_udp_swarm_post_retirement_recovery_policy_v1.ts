import assert from "node:assert/strict";

import {
  VOID_P2P_UDP_SWARM_POST_RETIREMENT_RECOVERY_MAX_ATTEMPTS_V1,
  VOID_P2P_UDP_SWARM_POST_RETIREMENT_RECOVERY_POLICY_AUTHORITY_V1,
  VOID_P2P_UDP_SWARM_POST_RETIREMENT_RECOVERY_RETRY_INTERVAL_MS_V1,
  evaluateVoidUdpSwarmPostRetirementRecoveryPolicyV1,
  type VoidUdpSwarmPostRetirementRecoveryDecisionV1,
  type VoidUdpSwarmPostRetirementRecoveryEvidenceV1,
  type VoidUdpSwarmPostRetirementRecoveryReasonV1,
} from "../src/p2p/udp_swarm_post_retirement_recovery_policy_v1.js";

const SESSION_ID = "0123456789abcdef0123456789abcdef";
const EXPECTED_PEER_NODE_ID = "11".repeat(16);
const RELAY_NODE_ID = "22".repeat(16);
const RETIRED_RELAY_STREAM_ID = "retired-stream-proof-v1";
const RETIRED_AT_MS = 100_000;

function evidence(
  overrides: Partial<VoidUdpSwarmPostRetirementRecoveryEvidenceV1> = {},
): VoidUdpSwarmPostRetirementRecoveryEvidenceV1 {
  return Object.freeze({
    session_id: SESSION_ID,
    expected_peer_node_id: EXPECTED_PEER_NODE_ID,
    relay_node_id: RELAY_NODE_ID,
    retired_relay_stream_id: RETIRED_RELAY_STREAM_ID,
    retirement_phase: "retired",
    retirement_callback_attempted: true,
    relay_retirement_performed: true,
    relay_retired_at_ms: RETIRED_AT_MS,
    node_stopping: false,
    newer_udp_swarm_session_present: false,
    direct_route_live: false,
    normal_route_live: false,
    relay_fallback_live: false,
    retired_relay_stream_live: false,
    replacement_relay_stream_live: false,
    recovery_in_flight: false,
    relay_control_route_live: true,
    relay_control_route_transport: "direct",
    authenticated_relay_control_node_id: RELAY_NODE_ID,
    reacquisition_attempt_count: 0,
    last_reacquisition_attempt_at_ms: null,
    now_ms: RETIRED_AT_MS + 1,
    ...overrides,
  });
}

function assertNoMutationAuthority(
  result: VoidUdpSwarmPostRetirementRecoveryDecisionV1,
): void {
  assert.equal(result.requires_fresh_relay_stream, true);
  assert.equal(result.retired_stream_reuse_authorized, false);
  assert.equal(result.direct_route_reconnect_authorized, false);
  assert.equal(result.verified_direct_evidence_persistence_authorized, false);
  assert.equal(result.normal_peer_map_mutation_performed, false);
  assert.equal(result.relay_stream_mutation_performed, false);
  assert.equal(result.network_dial_performed, false);
  assert.equal(result.verified_direct_evidence_persisted, false);
  assert.equal(result.production_udp_activation_performed, false);
}

function expectHold(
  input: unknown,
  reason: VoidUdpSwarmPostRetirementRecoveryReasonV1,
): VoidUdpSwarmPostRetirementRecoveryDecisionV1 {
  const result = evaluateVoidUdpSwarmPostRetirementRecoveryPolicyV1(input);
  assert.equal(result.action, "hold_recovery");
  assert.equal(result.reason, reason);
  assert.equal(result.relay_reacquisition_authorized, false);
  assert.equal(result.next_attempt_number, null);
  assertNoMutationAuthority(result);
  assert.equal(Object.isFrozen(result), true);
  if (result.binding) assert.equal(Object.isFrozen(result.binding), true);
  return result;
}

assert.deepEqual(
  VOID_P2P_UDP_SWARM_POST_RETIREMENT_RECOVERY_POLICY_AUTHORITY_V1,
  {
    consumes_confirmed_retirement_and_current_route_state: true,
    may_authorize_fresh_same_relay_continuity_reacquisition: true,
    requires_fresh_relay_stream: true,
    retired_stream_reuse_authorized: false,
    blocks_during_node_stop: true,
    requires_no_newer_udp_swarm_session: true,
    requires_no_retired_or_replacement_relay_stream: true,
    requires_no_recovery_in_flight: true,
    direct_route_reconnect_authorized: false,
    verified_direct_evidence_persistence_authorized: false,
    normal_peer_map_mutation_performed: false,
    relay_stream_mutation_performed: false,
    network_dial_performed: false,
    verified_direct_evidence_persisted: false,
    production_udp_activation_performed: false,
    wallet_signer_validator_wc_money_authority: 0,
  },
);
assert.equal(
  VOID_P2P_UDP_SWARM_POST_RETIREMENT_RECOVERY_RETRY_INTERVAL_MS_V1,
  5_000,
);
assert.equal(
  VOID_P2P_UDP_SWARM_POST_RETIREMENT_RECOVERY_MAX_ATTEMPTS_V1,
  3,
);

{
  const result = evaluateVoidUdpSwarmPostRetirementRecoveryPolicyV1(evidence());
  assert.equal(result.action, "authorize_fresh_relay_reacquisition");
  assert.equal(
    result.reason,
    "fresh_relay_reacquisition_may_be_authorized",
  );
  assert.equal(result.relay_reacquisition_authorized, true);
  assert.equal(result.next_attempt_number, 1);
  assert.equal(result.minimum_retry_at_ms, null);
  assert.deepEqual(result.binding, {
    session_id: SESSION_ID,
    expected_peer_node_id: EXPECTED_PEER_NODE_ID,
    relay_node_id: RELAY_NODE_ID,
    retired_relay_stream_id: RETIRED_RELAY_STREAM_ID,
  });
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.binding), true);
  assertNoMutationAuthority(result);
}

{
  const lastAttemptAtMs = 110_000;
  const minimumRetryAtMs =
    lastAttemptAtMs +
    VOID_P2P_UDP_SWARM_POST_RETIREMENT_RECOVERY_RETRY_INTERVAL_MS_V1;

  const early = expectHold(
    evidence({
      reacquisition_attempt_count: 1,
      last_reacquisition_attempt_at_ms: lastAttemptAtMs,
      now_ms: minimumRetryAtMs - 1,
    }),
    "retry_interval_not_elapsed",
  );
  assert.equal(early.minimum_retry_at_ms, minimumRetryAtMs);

  const exactBoundary = evaluateVoidUdpSwarmPostRetirementRecoveryPolicyV1(
    evidence({
      reacquisition_attempt_count: 1,
      last_reacquisition_attempt_at_ms: lastAttemptAtMs,
      now_ms: minimumRetryAtMs,
    }),
  );
  assert.equal(
    exactBoundary.action,
    "authorize_fresh_relay_reacquisition",
  );
  assert.equal(exactBoundary.relay_reacquisition_authorized, true);
  assert.equal(exactBoundary.next_attempt_number, 2);
  assert.equal(exactBoundary.minimum_retry_at_ms, minimumRetryAtMs);
  assertNoMutationAuthority(exactBoundary);
}

{
  const lastAttemptAtMs = Number.MAX_SAFE_INTEGER - 1_000;
  const overflow = expectHold(
    evidence({
      relay_retired_at_ms: 0,
      reacquisition_attempt_count: 1,
      last_reacquisition_attempt_at_ms: lastAttemptAtMs,
      now_ms: Number.MAX_SAFE_INTEGER,
    }),
    "retry_interval_not_elapsed",
  );
  assert.equal(overflow.minimum_retry_at_ms, Number.MAX_SAFE_INTEGER);
}

{
  const exhausted = expectHold(
    evidence({
      reacquisition_attempt_count: 3,
      last_reacquisition_attempt_at_ms: 110_000,
      now_ms: 120_000,
    }),
    "reacquisition_attempts_exhausted",
  );
  assert.equal(exhausted.minimum_retry_at_ms, null);
}

for (const phase of [
  "pending",
  "callback_rejected",
  "callback_indeterminate",
] as const) {
  expectHold(
    evidence({
      retirement_phase: phase,
      relay_retirement_performed:
        phase === "callback_indeterminate" ? null : false,
      relay_retired_at_ms: null,
    }),
    "retirement_not_successful",
  );
}
expectHold(
  evidence({ retirement_callback_attempted: false }),
  "retirement_not_successful",
);
expectHold(
  evidence({ relay_retirement_performed: false }),
  "retirement_not_successful",
);
expectHold(
  evidence({ relay_retired_at_ms: null }),
  "retirement_not_successful",
);

expectHold(
  evidence({ relay_retired_at_ms: RETIRED_AT_MS + 2, now_ms: RETIRED_AT_MS + 1 }),
  "retirement_time_invalid",
);
expectHold(
  evidence({
    reacquisition_attempt_count: 1,
    last_reacquisition_attempt_at_ms: RETIRED_AT_MS - 1,
    now_ms: RETIRED_AT_MS + 10_000,
  }),
  "retirement_time_invalid",
);
expectHold(
  evidence({
    reacquisition_attempt_count: 1,
    last_reacquisition_attempt_at_ms: RETIRED_AT_MS + 2,
    now_ms: RETIRED_AT_MS + 1,
  }),
  "retirement_time_invalid",
);

expectHold(evidence({ node_stopping: true }), "node_stopping");
expectHold(
  evidence({ newer_udp_swarm_session_present: true }),
  "newer_udp_swarm_session_present",
);
expectHold(evidence({ direct_route_live: true }), "direct_route_still_live");
expectHold(evidence({ normal_route_live: true }), "normal_route_already_live");
expectHold(evidence({ relay_fallback_live: true }), "relay_fallback_already_live");
expectHold(
  evidence({ retired_relay_stream_live: true }),
  "retired_relay_stream_still_live",
);
expectHold(
  evidence({ replacement_relay_stream_live: true }),
  "replacement_relay_stream_already_live",
);
expectHold(evidence({ recovery_in_flight: true }), "recovery_already_in_flight");
expectHold(
  evidence({ relay_control_route_live: false }),
  "relay_control_route_unavailable",
);
expectHold(
  evidence({ relay_control_route_transport: "relay" }),
  "relay_control_route_not_direct",
);
expectHold(
  evidence({ relay_control_route_transport: null }),
  "relay_control_route_not_direct",
);
expectHold(
  evidence({ authenticated_relay_control_node_id: "33".repeat(16) }),
  "relay_control_identity_mismatch",
);
expectHold(
  evidence({ authenticated_relay_control_node_id: null }),
  "relay_control_identity_mismatch",
);

for (const malformed of [
  null,
  [],
  { ...evidence(), unexpected: true },
  { ...evidence(), session_id: "contains whitespace" },
  { ...evidence(), expected_peer_node_id: "not-a-node" },
  { ...evidence(), relay_node_id: "not-a-node" },
  { ...evidence(), retired_relay_stream_id: "" },
  { ...evidence(), retirement_phase: "unknown" },
  { ...evidence(), retirement_callback_attempted: "true" },
  { ...evidence(), relay_retirement_performed: "true" },
  { ...evidence(), relay_retired_at_ms: -1 },
  { ...evidence(), relay_retired_at_ms: 1.5 },
  { ...evidence(), node_stopping: "false" },
  { ...evidence(), newer_udp_swarm_session_present: "false" },
  { ...evidence(), direct_route_live: "false" },
  { ...evidence(), retired_relay_stream_live: "false" },
  { ...evidence(), replacement_relay_stream_live: "false" },
  { ...evidence(), recovery_in_flight: "false" },
  { ...evidence(), relay_control_route_transport: "udp" },
  { ...evidence(), authenticated_relay_control_node_id: "invalid" },
  { ...evidence(), reacquisition_attempt_count: -1 },
  { ...evidence(), reacquisition_attempt_count: 4 },
  { ...evidence(), reacquisition_attempt_count: 1.5 },
  {
    ...evidence(),
    reacquisition_attempt_count: 0,
    last_reacquisition_attempt_at_ms: 100_001,
  },
  {
    ...evidence(),
    reacquisition_attempt_count: 1,
    last_reacquisition_attempt_at_ms: null,
  },
  { ...evidence(), now_ms: -1 },
  { ...evidence(), now_ms: 1.5 },
]) {
  const result = expectHold(malformed, "invalid_evidence");
  assert.equal(result.binding, null);
  assert.equal(result.minimum_retry_at_ms, null);
}

console.log("fresh_relay_stream_required=true");
console.log("retired_stream_reuse_authorized=false");
console.log("automatic_reacquisition_attempts_max=3");
console.log("retry_interval_ms=5000");
console.log("stale_recovery_race_guards=true");
console.log("direct_route_reconnect_authorized=false");
console.log("verified_direct_evidence_persistence_authorized=false");
console.log("network_dial_performed=false");
console.log("verified_direct_evidence_persisted=false");
console.log("VOID_P2P_UDP_SWARM_POST_RETIREMENT_RECOVERY_POLICY_V1_PROOF_GREEN");
