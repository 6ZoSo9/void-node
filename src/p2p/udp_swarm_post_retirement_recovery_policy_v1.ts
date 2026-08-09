// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

export const VOID_P2P_UDP_SWARM_POST_RETIREMENT_RECOVERY_POLICY_VERSION_V1 = 1;
export const VOID_P2P_UDP_SWARM_POST_RETIREMENT_RECOVERY_RETRY_INTERVAL_MS_V1 =
  5_000;
export const VOID_P2P_UDP_SWARM_POST_RETIREMENT_RECOVERY_MAX_ATTEMPTS_V1 = 3;

export const VOID_P2P_UDP_SWARM_POST_RETIREMENT_RECOVERY_POLICY_AUTHORITY_V1 =
  Object.freeze({
    consumes_confirmed_retirement_and_current_route_state: true,
    may_authorize_fresh_same_relay_continuity_reacquisition: true,
    requires_fresh_relay_stream: true,
    retired_stream_reuse_authorized: false,
    normal_peer_map_mutation_performed: false,
    relay_stream_mutation_performed: false,
    network_dial_performed: false,
    verified_direct_evidence_persisted: false,
    production_udp_activation_performed: false,
    wallet_signer_validator_wc_money_authority: 0,
  });

const NODE_ID_RE = /^[0-9a-f]{32}$/;
const SAFE_TOKEN_RE = /^[^\s\u0000-\u001f\u007f]{1,128}$/;

const EVIDENCE_KEYS = Object.freeze([
  "session_id",
  "expected_peer_node_id",
  "relay_node_id",
  "retired_relay_stream_id",
  "retirement_phase",
  "retirement_callback_attempted",
  "relay_retirement_performed",
  "relay_retired_at_ms",
  "direct_route_live",
  "normal_route_live",
  "relay_fallback_live",
  "relay_control_route_live",
  "relay_control_route_transport",
  "authenticated_relay_control_node_id",
  "reacquisition_attempt_count",
  "last_reacquisition_attempt_at_ms",
  "now_ms",
]);

export type VoidUdpSwarmPostRetirementRecoveryBindingV1 = Readonly<{
  session_id: string;
  expected_peer_node_id: string;
  relay_node_id: string;
  retired_relay_stream_id: string;
}>;

export type VoidUdpSwarmPostRetirementRecoveryEvidenceV1 = Readonly<{
  session_id: string;
  expected_peer_node_id: string;
  relay_node_id: string;
  retired_relay_stream_id: string;
  retirement_phase:
    | "pending"
    | "retired"
    | "callback_rejected"
    | "callback_indeterminate";
  retirement_callback_attempted: boolean;
  relay_retirement_performed: boolean | null;
  relay_retired_at_ms: number | null;
  direct_route_live: boolean;
  normal_route_live: boolean;
  relay_fallback_live: boolean;
  relay_control_route_live: boolean;
  relay_control_route_transport: "direct" | "relay" | null;
  authenticated_relay_control_node_id: string | null;
  reacquisition_attempt_count: number;
  last_reacquisition_attempt_at_ms: number | null;
  now_ms: number;
}>;

export type VoidUdpSwarmPostRetirementRecoveryActionV1 =
  | "hold_recovery"
  | "authorize_fresh_relay_reacquisition";

export type VoidUdpSwarmPostRetirementRecoveryReasonV1 =
  | "invalid_evidence"
  | "retirement_not_successful"
  | "retirement_time_invalid"
  | "direct_route_still_live"
  | "normal_route_already_live"
  | "relay_fallback_already_live"
  | "relay_control_route_unavailable"
  | "relay_control_route_not_direct"
  | "relay_control_identity_mismatch"
  | "reacquisition_attempts_exhausted"
  | "retry_interval_not_elapsed"
  | "fresh_relay_reacquisition_may_be_authorized";

export type VoidUdpSwarmPostRetirementRecoveryDecisionV1 = Readonly<{
  version: 1;
  action: VoidUdpSwarmPostRetirementRecoveryActionV1;
  reason: VoidUdpSwarmPostRetirementRecoveryReasonV1;
  binding: VoidUdpSwarmPostRetirementRecoveryBindingV1 | null;
  relay_reacquisition_authorized: boolean;
  next_attempt_number: number | null;
  minimum_retry_at_ms: number | null;
  requires_fresh_relay_stream: true;
  retired_stream_reuse_authorized: false;
  normal_peer_map_mutation_performed: false;
  relay_stream_mutation_performed: false;
  network_dial_performed: false;
  verified_direct_evidence_persisted: false;
  production_udp_activation_performed: false;
}>;

function hasExactKeys(value: unknown, expected: readonly string[]): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return (
    actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index])
  );
}

function safeNonNegativeInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
  );
}

function validEvidenceShape(
  value: unknown,
): value is VoidUdpSwarmPostRetirementRecoveryEvidenceV1 {
  if (!hasExactKeys(value, EVIDENCE_KEYS)) return false;
  const evidence = value as Record<string, unknown>;

  if (
    typeof evidence.session_id !== "string" ||
    !SAFE_TOKEN_RE.test(evidence.session_id) ||
    typeof evidence.expected_peer_node_id !== "string" ||
    !NODE_ID_RE.test(evidence.expected_peer_node_id) ||
    typeof evidence.relay_node_id !== "string" ||
    !NODE_ID_RE.test(evidence.relay_node_id) ||
    typeof evidence.retired_relay_stream_id !== "string" ||
    !SAFE_TOKEN_RE.test(evidence.retired_relay_stream_id)
  ) {
    return false;
  }

  if (
    evidence.retirement_phase !== "pending" &&
    evidence.retirement_phase !== "retired" &&
    evidence.retirement_phase !== "callback_rejected" &&
    evidence.retirement_phase !== "callback_indeterminate"
  ) {
    return false;
  }

  if (
    typeof evidence.retirement_callback_attempted !== "boolean" ||
    (typeof evidence.relay_retirement_performed !== "boolean" &&
      evidence.relay_retirement_performed !== null) ||
    (evidence.relay_retired_at_ms !== null &&
      !safeNonNegativeInteger(evidence.relay_retired_at_ms)) ||
    typeof evidence.direct_route_live !== "boolean" ||
    typeof evidence.normal_route_live !== "boolean" ||
    typeof evidence.relay_fallback_live !== "boolean" ||
    typeof evidence.relay_control_route_live !== "boolean"
  ) {
    return false;
  }

  if (
    evidence.relay_control_route_transport !== "direct" &&
    evidence.relay_control_route_transport !== "relay" &&
    evidence.relay_control_route_transport !== null
  ) {
    return false;
  }

  if (
    evidence.authenticated_relay_control_node_id !== null &&
    (typeof evidence.authenticated_relay_control_node_id !== "string" ||
      !NODE_ID_RE.test(evidence.authenticated_relay_control_node_id))
  ) {
    return false;
  }

  if (
    !safeNonNegativeInteger(evidence.reacquisition_attempt_count) ||
    evidence.reacquisition_attempt_count >
      VOID_P2P_UDP_SWARM_POST_RETIREMENT_RECOVERY_MAX_ATTEMPTS_V1 ||
    (evidence.last_reacquisition_attempt_at_ms !== null &&
      !safeNonNegativeInteger(evidence.last_reacquisition_attempt_at_ms)) ||
    !safeNonNegativeInteger(evidence.now_ms)
  ) {
    return false;
  }

  if (
    evidence.reacquisition_attempt_count === 0 &&
    evidence.last_reacquisition_attempt_at_ms !== null
  ) {
    return false;
  }
  if (
    evidence.reacquisition_attempt_count > 0 &&
    evidence.last_reacquisition_attempt_at_ms === null
  ) {
    return false;
  }

  return true;
}

function freezeBinding(
  evidence: VoidUdpSwarmPostRetirementRecoveryEvidenceV1,
): VoidUdpSwarmPostRetirementRecoveryBindingV1 {
  return Object.freeze({
    session_id: evidence.session_id,
    expected_peer_node_id: evidence.expected_peer_node_id,
    relay_node_id: evidence.relay_node_id,
    retired_relay_stream_id: evidence.retired_relay_stream_id,
  });
}

function decision(
  action: VoidUdpSwarmPostRetirementRecoveryActionV1,
  reason: VoidUdpSwarmPostRetirementRecoveryReasonV1,
  binding: VoidUdpSwarmPostRetirementRecoveryBindingV1 | null,
  relayReacquisitionAuthorized: boolean,
  nextAttemptNumber: number | null = null,
  minimumRetryAtMs: number | null = null,
): VoidUdpSwarmPostRetirementRecoveryDecisionV1 {
  return Object.freeze({
    version: VOID_P2P_UDP_SWARM_POST_RETIREMENT_RECOVERY_POLICY_VERSION_V1,
    action,
    reason,
    binding,
    relay_reacquisition_authorized: relayReacquisitionAuthorized,
    next_attempt_number: nextAttemptNumber,
    minimum_retry_at_ms: minimumRetryAtMs,
    requires_fresh_relay_stream: true,
    retired_stream_reuse_authorized: false,
    normal_peer_map_mutation_performed: false,
    relay_stream_mutation_performed: false,
    network_dial_performed: false,
    verified_direct_evidence_persisted: false,
    production_udp_activation_performed: false,
  });
}

export function evaluateVoidUdpSwarmPostRetirementRecoveryPolicyV1(
  evidenceInput: unknown,
): VoidUdpSwarmPostRetirementRecoveryDecisionV1 {
  if (!validEvidenceShape(evidenceInput)) {
    return decision("hold_recovery", "invalid_evidence", null, false);
  }

  const evidence = evidenceInput;
  const binding = freezeBinding(evidence);

  if (
    evidence.retirement_phase !== "retired" ||
    evidence.retirement_callback_attempted !== true ||
    evidence.relay_retirement_performed !== true ||
    evidence.relay_retired_at_ms === null
  ) {
    return decision(
      "hold_recovery",
      "retirement_not_successful",
      binding,
      false,
    );
  }

  if (
    evidence.relay_retired_at_ms > evidence.now_ms ||
    (evidence.last_reacquisition_attempt_at_ms !== null &&
      (evidence.last_reacquisition_attempt_at_ms < evidence.relay_retired_at_ms ||
        evidence.last_reacquisition_attempt_at_ms > evidence.now_ms))
  ) {
    return decision(
      "hold_recovery",
      "retirement_time_invalid",
      binding,
      false,
    );
  }

  if (evidence.direct_route_live) {
    return decision(
      "hold_recovery",
      "direct_route_still_live",
      binding,
      false,
    );
  }
  if (evidence.normal_route_live) {
    return decision(
      "hold_recovery",
      "normal_route_already_live",
      binding,
      false,
    );
  }
  if (evidence.relay_fallback_live) {
    return decision(
      "hold_recovery",
      "relay_fallback_already_live",
      binding,
      false,
    );
  }
  if (!evidence.relay_control_route_live) {
    return decision(
      "hold_recovery",
      "relay_control_route_unavailable",
      binding,
      false,
    );
  }
  if (evidence.relay_control_route_transport !== "direct") {
    return decision(
      "hold_recovery",
      "relay_control_route_not_direct",
      binding,
      false,
    );
  }
  if (
    evidence.authenticated_relay_control_node_id !== evidence.relay_node_id
  ) {
    return decision(
      "hold_recovery",
      "relay_control_identity_mismatch",
      binding,
      false,
    );
  }

  if (
    evidence.reacquisition_attempt_count >=
    VOID_P2P_UDP_SWARM_POST_RETIREMENT_RECOVERY_MAX_ATTEMPTS_V1
  ) {
    return decision(
      "hold_recovery",
      "reacquisition_attempts_exhausted",
      binding,
      false,
    );
  }

  let minimumRetryAtMs: number | null = null;
  if (evidence.last_reacquisition_attempt_at_ms !== null) {
    const next =
      evidence.last_reacquisition_attempt_at_ms +
      VOID_P2P_UDP_SWARM_POST_RETIREMENT_RECOVERY_RETRY_INTERVAL_MS_V1;
    minimumRetryAtMs = Number.isSafeInteger(next) ? next : Number.MAX_SAFE_INTEGER;
    if (evidence.now_ms < minimumRetryAtMs) {
      return decision(
        "hold_recovery",
        "retry_interval_not_elapsed",
        binding,
        false,
        null,
        minimumRetryAtMs,
      );
    }
  }

  return decision(
    "authorize_fresh_relay_reacquisition",
    "fresh_relay_reacquisition_may_be_authorized",
    binding,
    true,
    evidence.reacquisition_attempt_count + 1,
    minimumRetryAtMs,
  );
}
