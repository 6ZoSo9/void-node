// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import type { VoidUdpSwarmAuthenticatedDirectCandidatePhaseV1 } from "./udp_swarm_authenticated_direct_candidate_v1.js";

export const VOID_P2P_UDP_SWARM_RELAY_PRESERVING_TAKEOVER_POLICY_VERSION_V1 = 1;

export const VOID_P2P_UDP_SWARM_RELAY_PRESERVING_TAKEOVER_POLICY_AUTHORITY_V1 =
  Object.freeze({
    authenticated_candidate_required: true,
    exact_peer_identity_required: true,
    authenticated_relay_route_required: true,
    live_relay_fallback_required: true,
    existing_direct_route_replaced: false,
    normal_peer_map_mutation_performed: false,
    candidate_socket_mutation_performed: false,
    relay_retirement_authorized: false,
    relay_retirement_performed: false,
    production_udp_activation_performed: false,
    wallet_signer_validator_wc_money_authority: 0,
  });

const NODE_ID_RE = /^[0-9a-f]{32}$/;
const SAFE_TOKEN_RE = /^[^\s\u0000-\u001f\u007f]{1,128}$/;

export type VoidUdpSwarmExistingAuthenticatedRouteV1 = Readonly<{
  peer_node_id: string;
  transport: "direct" | "relay";
  relay_node_id: string | null;
  relay_stream_id: string | null;
}>;

export type VoidUdpSwarmRelayPreservingTakeoverPolicyInputV1 = Readonly<{
  candidate_phase: VoidUdpSwarmAuthenticatedDirectCandidatePhaseV1;
  expected_peer_node_id: string;
  authenticated_peer_node_id: string | null;
  existing_authenticated_route: VoidUdpSwarmExistingAuthenticatedRouteV1 | null;
  relay_fallback_live: boolean;
}>;

export type VoidUdpSwarmRelayPreservingTakeoverPolicyReasonV1 =
  | "candidate_not_authenticated"
  | "candidate_identity_invalid"
  | "candidate_identity_mismatch"
  | "continuity_route_missing"
  | "continuity_route_peer_invalid"
  | "continuity_route_peer_mismatch"
  | "existing_direct_route_already_preferred"
  | "relay_route_binding_invalid"
  | "relay_fallback_not_live"
  | "relay_preserved_candidate_may_stage";

export type VoidUdpSwarmRelayPreservingTakeoverPolicyDecisionV1 = Readonly<{
  version: 1;
  action: "reject_candidate" | "stage_authenticated_candidate";
  reason: VoidUdpSwarmRelayPreservingTakeoverPolicyReasonV1;
  existing_route_retained: boolean;
  normal_peer_map_mutation_performed: false;
  relay_retirement_authorized: false;
}>;

function decision(
  action: VoidUdpSwarmRelayPreservingTakeoverPolicyDecisionV1["action"],
  reason: VoidUdpSwarmRelayPreservingTakeoverPolicyReasonV1,
  existingRouteRetained: boolean,
): VoidUdpSwarmRelayPreservingTakeoverPolicyDecisionV1 {
  return Object.freeze({
    version: VOID_P2P_UDP_SWARM_RELAY_PRESERVING_TAKEOVER_POLICY_VERSION_V1,
    action,
    reason,
    existing_route_retained: existingRouteRetained,
    normal_peer_map_mutation_performed: false,
    relay_retirement_authorized: false,
  });
}

export function evaluateVoidUdpSwarmRelayPreservingTakeoverPolicyV1(
  input: VoidUdpSwarmRelayPreservingTakeoverPolicyInputV1,
): VoidUdpSwarmRelayPreservingTakeoverPolicyDecisionV1 {
  if (input.candidate_phase !== "authenticated_candidate") {
    return decision("reject_candidate", "candidate_not_authenticated", true);
  }

  if (
    !NODE_ID_RE.test(input.expected_peer_node_id) ||
    !input.authenticated_peer_node_id ||
    !NODE_ID_RE.test(input.authenticated_peer_node_id)
  ) {
    return decision("reject_candidate", "candidate_identity_invalid", true);
  }
  if (input.authenticated_peer_node_id !== input.expected_peer_node_id) {
    return decision("reject_candidate", "candidate_identity_mismatch", true);
  }

  const route = input.existing_authenticated_route;
  if (!route) {
    return decision("reject_candidate", "continuity_route_missing", false);
  }
  if (!NODE_ID_RE.test(route.peer_node_id)) {
    return decision("reject_candidate", "continuity_route_peer_invalid", true);
  }
  if (route.peer_node_id !== input.expected_peer_node_id) {
    return decision("reject_candidate", "continuity_route_peer_mismatch", true);
  }
  if (route.transport === "direct") {
    return decision(
      "reject_candidate",
      "existing_direct_route_already_preferred",
      true,
    );
  }

  if (
    !route.relay_node_id ||
    !NODE_ID_RE.test(route.relay_node_id) ||
    !route.relay_stream_id ||
    !SAFE_TOKEN_RE.test(route.relay_stream_id)
  ) {
    return decision("reject_candidate", "relay_route_binding_invalid", true);
  }
  if (input.relay_fallback_live !== true) {
    return decision("reject_candidate", "relay_fallback_not_live", true);
  }

  return decision(
    "stage_authenticated_candidate",
    "relay_preserved_candidate_may_stage",
    true,
  );
}
