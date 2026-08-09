// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import {
  buildVoidUdpSwarmRelayRetirementReceiptV1,
  type VoidUdpSwarmRelayRetirementReceiptV1,
} from "./udp_swarm_relay_retirement_receipt_v1.js";

export const VOID_P2P_UDP_SWARM_POST_RETIREMENT_RELAY_RECOVERY_POLICY_VERSION_V1 =
  1;

export const VOID_P2P_UDP_SWARM_POST_RETIREMENT_RELAY_RECOVERY_POLICY_AUTHORITY_V1 =
  Object.freeze({
    consumes_terminal_retirement_snapshot: true,
    requires_confirmed_relay_retired_receipt: true,
    requires_direct_route_loss: true,
    requires_no_retained_or_replacement_relay_stream: true,
    requires_exact_authenticated_relay_control_peer: true,
    may_authorize_fresh_relay_reacquisition: true,
    relay_request_performed: false,
    relay_stream_mutation_performed: false,
    normal_peer_map_mutation_performed: false,
    direct_route_reconnect_authorized: false,
    verified_direct_evidence_persistence_authorized: false,
    verified_direct_evidence_persisted: false,
    production_udp_activation_performed: false,
    wallet_signer_validator_wc_money_authority: 0,
  });

const NODE_ID_RE = /^[0-9a-f]{32}$/;

const STATE_KEYS = Object.freeze([
  "expected_peer_node_id",
  "retirement_executor_snapshot",
  "direct_route_live",
  "normal_peer_route_present",
  "retained_relay_fallback_present",
  "retired_relay_stream_live",
  "replacement_relay_stream_live",
  "relay_control_peer_live",
  "relay_control_authenticated_node_id",
  "newer_udp_swarm_session_present",
  "recovery_in_flight",
  "node_stopping",
]);

export type VoidUdpSwarmPostRetirementRelayRecoveryStateV1 = Readonly<{
  expected_peer_node_id: string;
  retirement_executor_snapshot: unknown;
  direct_route_live: boolean;
  normal_peer_route_present: boolean;
  retained_relay_fallback_present: boolean;
  retired_relay_stream_live: boolean;
  replacement_relay_stream_live: boolean;
  relay_control_peer_live: boolean;
  relay_control_authenticated_node_id: string | null;
  newer_udp_swarm_session_present: boolean;
  recovery_in_flight: boolean;
  node_stopping: boolean;
}>;

export type VoidUdpSwarmPostRetirementRelayRecoveryActionV1 =
  | "hold_recovery"
  | "authorize_fresh_relay_reacquisition";

export type VoidUdpSwarmPostRetirementRelayRecoveryReasonV1 =
  | "invalid_state_shape"
  | "invalid_retirement_snapshot"
  | "relay_not_confirmed_retired"
  | "receipt_binding_mismatch"
  | "node_stopping"
  | "newer_udp_swarm_session_present"
  | "direct_route_still_live"
  | "normal_peer_route_present"
  | "retained_relay_fallback_present"
  | "retired_relay_stream_still_live"
  | "replacement_relay_stream_already_live"
  | "recovery_already_in_flight"
  | "relay_control_peer_not_live"
  | "relay_control_identity_mismatch"
  | "fresh_relay_reacquisition_may_be_authorized";

export type VoidUdpSwarmPostRetirementRelayRecoveryDecisionV1 = Readonly<{
  version: 1;
  action: VoidUdpSwarmPostRetirementRelayRecoveryActionV1;
  reason: VoidUdpSwarmPostRetirementRelayRecoveryReasonV1;
  binding: VoidUdpSwarmRelayRetirementReceiptV1["binding"] | null;
  retirement_receipt_id_sha256: string | null;
  fresh_relay_reacquisition_authorized: boolean;
  fresh_relay_stream_required: boolean;
  retired_relay_stream_reuse_allowed: false;
  relay_request_performed: false;
  relay_stream_mutation_performed: false;
  normal_peer_map_mutation_performed: false;
  direct_route_reconnect_authorized: false;
  verified_direct_evidence_persistence_authorized: false;
  verified_direct_evidence_persisted: false;
  production_udp_activation_performed: false;
}>;

function exactObjectKeys(
  raw: unknown,
  expected: readonly string[],
): raw is Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const actual = Object.keys(raw as Record<string, unknown>).sort();
  const wanted = [...expected].sort();
  return (
    actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index])
  );
}

function validState(
  raw: unknown,
): raw is VoidUdpSwarmPostRetirementRelayRecoveryStateV1 {
  if (!exactObjectKeys(raw, STATE_KEYS)) return false;
  const state = raw as Record<string, unknown>;
  if (
    typeof state.expected_peer_node_id !== "string" ||
    !NODE_ID_RE.test(state.expected_peer_node_id)
  ) {
    return false;
  }
  if (
    state.relay_control_authenticated_node_id !== null &&
    (typeof state.relay_control_authenticated_node_id !== "string" ||
      !NODE_ID_RE.test(state.relay_control_authenticated_node_id))
  ) {
    return false;
  }
  return [
    "direct_route_live",
    "normal_peer_route_present",
    "retained_relay_fallback_present",
    "retired_relay_stream_live",
    "replacement_relay_stream_live",
    "relay_control_peer_live",
    "newer_udp_swarm_session_present",
    "recovery_in_flight",
    "node_stopping",
  ].every((key) => typeof state[key] === "boolean");
}

function decision(
  action: VoidUdpSwarmPostRetirementRelayRecoveryActionV1,
  reason: VoidUdpSwarmPostRetirementRelayRecoveryReasonV1,
  receipt: VoidUdpSwarmRelayRetirementReceiptV1 | null,
): VoidUdpSwarmPostRetirementRelayRecoveryDecisionV1 {
  const authorized = action === "authorize_fresh_relay_reacquisition";
  return Object.freeze({
    version: VOID_P2P_UDP_SWARM_POST_RETIREMENT_RELAY_RECOVERY_POLICY_VERSION_V1,
    action,
    reason,
    binding: receipt?.binding ?? null,
    retirement_receipt_id_sha256: receipt?.receipt_id_sha256 ?? null,
    fresh_relay_reacquisition_authorized: authorized,
    fresh_relay_stream_required: authorized,
    retired_relay_stream_reuse_allowed: false,
    relay_request_performed: false,
    relay_stream_mutation_performed: false,
    normal_peer_map_mutation_performed: false,
    direct_route_reconnect_authorized: false,
    verified_direct_evidence_persistence_authorized: false,
    verified_direct_evidence_persisted: false,
    production_udp_activation_performed: false,
  });
}

function hold(
  reason: VoidUdpSwarmPostRetirementRelayRecoveryReasonV1,
  receipt: VoidUdpSwarmRelayRetirementReceiptV1 | null = null,
): VoidUdpSwarmPostRetirementRelayRecoveryDecisionV1 {
  return decision("hold_recovery", reason, receipt);
}

export function evaluateVoidUdpSwarmPostRetirementRelayRecoveryPolicyV1(
  rawState: unknown,
): VoidUdpSwarmPostRetirementRelayRecoveryDecisionV1 {
  if (!validState(rawState)) {
    return hold("invalid_state_shape");
  }
  const state = rawState;

  const receiptResult = buildVoidUdpSwarmRelayRetirementReceiptV1(
    state.retirement_executor_snapshot,
  );
  if (receiptResult.ok !== true) {
    return hold("invalid_retirement_snapshot");
  }
  const receipt = receiptResult.receipt;

  if (
    receipt.executor_phase !== "retired" ||
    receipt.disposition !== "relay_retired" ||
    receipt.relay_retirement_performed !== true
  ) {
    return hold("relay_not_confirmed_retired", receipt);
  }
  if (receipt.binding.expected_peer_node_id !== state.expected_peer_node_id) {
    return hold("receipt_binding_mismatch", receipt);
  }
  if (state.node_stopping) {
    return hold("node_stopping", receipt);
  }
  if (state.newer_udp_swarm_session_present) {
    return hold("newer_udp_swarm_session_present", receipt);
  }
  if (state.direct_route_live) {
    return hold("direct_route_still_live", receipt);
  }
  if (state.normal_peer_route_present) {
    return hold("normal_peer_route_present", receipt);
  }
  if (state.retained_relay_fallback_present) {
    return hold("retained_relay_fallback_present", receipt);
  }
  if (state.retired_relay_stream_live) {
    return hold("retired_relay_stream_still_live", receipt);
  }
  if (state.replacement_relay_stream_live) {
    return hold("replacement_relay_stream_already_live", receipt);
  }
  if (state.recovery_in_flight) {
    return hold("recovery_already_in_flight", receipt);
  }
  if (!state.relay_control_peer_live) {
    return hold("relay_control_peer_not_live", receipt);
  }
  if (
    state.relay_control_authenticated_node_id !== receipt.binding.relay_node_id
  ) {
    return hold("relay_control_identity_mismatch", receipt);
  }

  return decision(
    "authorize_fresh_relay_reacquisition",
    "fresh_relay_reacquisition_may_be_authorized",
    receipt,
  );
}
