// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import type { VoidUdpSwarmDirectRouteHealthPolicyDecisionV1 } from "./udp_swarm_direct_route_health_policy_v1.js";

export const VOID_P2P_UDP_SWARM_RELAY_RETIREMENT_EXECUTOR_VERSION_V1 = 1;

export const VOID_P2P_UDP_SWARM_RELAY_RETIREMENT_EXECUTOR_AUTHORITY_V1 =
  Object.freeze({
    consumes_current_health_authorization: true,
    revalidates_exact_runtime_bindings_before_callback: true,
    may_invoke_exact_relay_retirement_callback: true,
    direct_route_mutation_performed: false,
    verified_direct_evidence_persisted: false,
    production_udp_activation_performed: false,
    wallet_signer_validator_wc_money_authority: 0,
  });

const NODE_ID_RE = /^[0-9a-f]{32}$/;
const SAFE_TOKEN_RE = /^[^\s\u0000-\u001f\u007f]{1,128}$/;

export type VoidUdpSwarmRelayRetirementBindingV1 = Readonly<{
  session_id: string;
  expected_peer_node_id: string;
  relay_node_id: string;
  relay_stream_id: string;
}>;

export type VoidUdpSwarmRelayRetirementRevalidationV1 = Readonly<{
  session_id: string;
  expected_peer_node_id: string;
  authenticated_peer_node_id: string | null;
  relay_node_id: string;
  relay_stream_id: string;
  direct_route_live: boolean;
  direct_route_transport: "direct" | "relay" | null;
  relay_fallback_live: boolean;
  exact_direct_route_binding_live: boolean;
  exact_relay_fallback_binding_live: boolean;
  health_policy_decision: VoidUdpSwarmDirectRouteHealthPolicyDecisionV1;
}>;

export type VoidUdpSwarmRelayRetirementExecutorPhaseV1 =
  | "pending"
  | "retired"
  | "callback_rejected"
  | "callback_indeterminate";

export type VoidUdpSwarmRelayRetirementExecutorErrorV1 =
  | "executor_terminal"
  | "revalidation_failed"
  | "binding_changed"
  | "authenticated_identity_mismatch"
  | "promoted_direct_route_not_live"
  | "promoted_route_not_direct"
  | "exact_direct_route_binding_not_live"
  | "relay_fallback_not_live"
  | "exact_relay_fallback_binding_not_live"
  | "health_not_authorized"
  | "retirement_callback_rejected"
  | "retirement_callback_threw";

export type VoidUdpSwarmRelayRetirementExecutorSnapshotV1 = Readonly<{
  version: 1;
  phase: VoidUdpSwarmRelayRetirementExecutorPhaseV1;
  binding: VoidUdpSwarmRelayRetirementBindingV1;
  retirement_callback_attempted: boolean;
  relay_retirement_performed: boolean | null;
  direct_route_mutation_performed: false;
  verified_direct_evidence_persisted: false;
  production_udp_activation_performed: false;
}>;

export type VoidUdpSwarmRelayRetirementExecutorSuccessV1 = Readonly<{
  ok: true;
  action: "relay_retired";
  binding: VoidUdpSwarmRelayRetirementBindingV1;
  relay_retirement_performed: true;
  direct_route_mutation_performed: false;
  verified_direct_evidence_persisted: false;
  production_udp_activation_performed: false;
}>;

export type VoidUdpSwarmRelayRetirementExecutorFailureV1 = Readonly<{
  ok: false;
  error: VoidUdpSwarmRelayRetirementExecutorErrorV1;
  terminal: boolean;
  binding: VoidUdpSwarmRelayRetirementBindingV1;
  relay_retirement_performed: boolean | null;
  direct_route_mutation_performed: false;
  verified_direct_evidence_persisted: false;
  production_udp_activation_performed: false;
}>;

export type VoidUdpSwarmRelayRetirementExecutorResultV1 =
  | VoidUdpSwarmRelayRetirementExecutorSuccessV1
  | VoidUdpSwarmRelayRetirementExecutorFailureV1;

export type VoidUdpSwarmRelayRetirementExecutorOptionsV1 = Readonly<{
  revalidate: () => VoidUdpSwarmRelayRetirementRevalidationV1;
  retireExactRelayFallback: (
    binding: VoidUdpSwarmRelayRetirementBindingV1,
  ) => boolean;
}>;

function validBinding(binding: VoidUdpSwarmRelayRetirementBindingV1): boolean {
  return (
    SAFE_TOKEN_RE.test(binding.session_id) &&
    NODE_ID_RE.test(binding.expected_peer_node_id) &&
    NODE_ID_RE.test(binding.relay_node_id) &&
    SAFE_TOKEN_RE.test(binding.relay_stream_id)
  );
}

function sameBinding(
  expected: VoidUdpSwarmRelayRetirementBindingV1,
  current: VoidUdpSwarmRelayRetirementRevalidationV1,
): boolean {
  return (
    current.session_id === expected.session_id &&
    current.expected_peer_node_id === expected.expected_peer_node_id &&
    current.relay_node_id === expected.relay_node_id &&
    current.relay_stream_id === expected.relay_stream_id
  );
}

function exactHealthAuthorization(
  decision: VoidUdpSwarmDirectRouteHealthPolicyDecisionV1,
): boolean {
  return (
    decision.version === 1 &&
    decision.action === "authorize_relay_retirement" &&
    decision.reason === "relay_retirement_may_be_authorized" &&
    decision.relay_retirement_authorized === true &&
    decision.relay_retirement_performed === false &&
    decision.normal_peer_map_mutation_performed === false &&
    decision.direct_route_mutation_performed === false &&
    decision.relay_socket_mutation_performed === false
  );
}

function freezeBinding(
  binding: VoidUdpSwarmRelayRetirementBindingV1,
): VoidUdpSwarmRelayRetirementBindingV1 {
  if (!validBinding(binding)) {
    throw new Error("invalid UDP swarm relay-retirement binding");
  }
  return Object.freeze({
    session_id: binding.session_id,
    expected_peer_node_id: binding.expected_peer_node_id,
    relay_node_id: binding.relay_node_id,
    relay_stream_id: binding.relay_stream_id,
  });
}

export class VoidUdpSwarmRelayRetirementExecutorV1 {
  private readonly binding: VoidUdpSwarmRelayRetirementBindingV1;
  private phase: VoidUdpSwarmRelayRetirementExecutorPhaseV1 = "pending";

  constructor(binding: VoidUdpSwarmRelayRetirementBindingV1) {
    this.binding = freezeBinding(binding);
  }

  snapshot(): VoidUdpSwarmRelayRetirementExecutorSnapshotV1 {
    const attempted = this.phase !== "pending";
    const performed =
      this.phase === "retired"
        ? true
        : this.phase === "callback_indeterminate"
          ? null
          : false;
    return Object.freeze({
      version: VOID_P2P_UDP_SWARM_RELAY_RETIREMENT_EXECUTOR_VERSION_V1,
      phase: this.phase,
      binding: this.binding,
      retirement_callback_attempted: attempted,
      relay_retirement_performed: performed,
      direct_route_mutation_performed: false,
      verified_direct_evidence_persisted: false,
      production_udp_activation_performed: false,
    });
  }

  private failure(
    error: VoidUdpSwarmRelayRetirementExecutorErrorV1,
    terminal: boolean,
    performed: boolean | null = false,
  ): VoidUdpSwarmRelayRetirementExecutorFailureV1 {
    return Object.freeze({
      ok: false,
      error,
      terminal,
      binding: this.binding,
      relay_retirement_performed: performed,
      direct_route_mutation_performed: false,
      verified_direct_evidence_persisted: false,
      production_udp_activation_performed: false,
    });
  }

  execute(
    options: VoidUdpSwarmRelayRetirementExecutorOptionsV1,
  ): VoidUdpSwarmRelayRetirementExecutorResultV1 {
    if (this.phase !== "pending") {
      return this.failure(
        "executor_terminal",
        true,
        this.phase === "retired"
          ? true
          : this.phase === "callback_indeterminate"
            ? null
            : false,
      );
    }

    let current: VoidUdpSwarmRelayRetirementRevalidationV1;
    try {
      current = options.revalidate();
    } catch {
      return this.failure("revalidation_failed", false);
    }

    if (!sameBinding(this.binding, current)) {
      return this.failure("binding_changed", false);
    }
    if (
      current.authenticated_peer_node_id !==
      this.binding.expected_peer_node_id
    ) {
      return this.failure("authenticated_identity_mismatch", false);
    }
    if (current.direct_route_live !== true) {
      return this.failure("promoted_direct_route_not_live", false);
    }
    if (current.direct_route_transport !== "direct") {
      return this.failure("promoted_route_not_direct", false);
    }
    if (current.exact_direct_route_binding_live !== true) {
      return this.failure("exact_direct_route_binding_not_live", false);
    }
    if (current.relay_fallback_live !== true) {
      return this.failure("relay_fallback_not_live", false);
    }
    if (current.exact_relay_fallback_binding_live !== true) {
      return this.failure("exact_relay_fallback_binding_not_live", false);
    }
    if (!exactHealthAuthorization(current.health_policy_decision)) {
      return this.failure("health_not_authorized", false);
    }

    let retired = false;
    try {
      retired = options.retireExactRelayFallback(this.binding);
    } catch {
      this.phase = "callback_indeterminate";
      return this.failure("retirement_callback_threw", true, null);
    }

    if (!retired) {
      this.phase = "callback_rejected";
      return this.failure("retirement_callback_rejected", true, false);
    }

    this.phase = "retired";
    return Object.freeze({
      ok: true,
      action: "relay_retired",
      binding: this.binding,
      relay_retirement_performed: true,
      direct_route_mutation_performed: false,
      verified_direct_evidence_persisted: false,
      production_udp_activation_performed: false,
    });
  }
}
