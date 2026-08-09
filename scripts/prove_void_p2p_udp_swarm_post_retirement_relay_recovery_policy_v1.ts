import assert from "node:assert/strict";

import {
  VOID_P2P_UDP_SWARM_POST_RETIREMENT_RELAY_RECOVERY_POLICY_AUTHORITY_V1,
  evaluateVoidUdpSwarmPostRetirementRelayRecoveryPolicyV1,
  type VoidUdpSwarmPostRetirementRelayRecoveryReasonV1,
  type VoidUdpSwarmPostRetirementRelayRecoveryStateV1,
} from "../src/p2p/udp_swarm_post_retirement_relay_recovery_policy_v1.js";
import {
  buildVoidUdpSwarmRelayRetirementReceiptV1,
} from "../src/p2p/udp_swarm_relay_retirement_receipt_v1.js";
import {
  VoidUdpSwarmRelayRetirementExecutorV1,
  type VoidUdpSwarmRelayRetirementBindingV1,
  type VoidUdpSwarmRelayRetirementExecutorSnapshotV1,
  type VoidUdpSwarmRelayRetirementRevalidationV1,
} from "../src/p2p/udp_swarm_relay_retirement_executor_v1.js";
import type { VoidUdpSwarmDirectRouteHealthPolicyDecisionV1 } from "../src/p2p/udp_swarm_direct_route_health_policy_v1.js";

const binding: VoidUdpSwarmRelayRetirementBindingV1 = Object.freeze({
  session_id: "0123456789abcdef0123456789abcdef",
  expected_peer_node_id: "11".repeat(16),
  relay_node_id: "22".repeat(16),
  relay_stream_id: "retired-stream-v1",
});

const authorizedDecision: VoidUdpSwarmDirectRouteHealthPolicyDecisionV1 =
  Object.freeze({
    version: 1,
    action: "authorize_relay_retirement",
    reason: "relay_retirement_may_be_authorized",
    relay_retirement_authorized: true,
    relay_retirement_performed: false,
    normal_peer_map_mutation_performed: false,
    direct_route_mutation_performed: false,
    relay_socket_mutation_performed: false,
  });

function revalidation(): VoidUdpSwarmRelayRetirementRevalidationV1 {
  return Object.freeze({
    session_id: binding.session_id,
    expected_peer_node_id: binding.expected_peer_node_id,
    authenticated_peer_node_id: binding.expected_peer_node_id,
    relay_node_id: binding.relay_node_id,
    relay_stream_id: binding.relay_stream_id,
    direct_route_live: true,
    direct_route_transport: "direct",
    relay_fallback_live: true,
    exact_direct_route_binding_live: true,
    exact_relay_fallback_binding_live: true,
    health_policy_decision: authorizedDecision,
  });
}

function terminalSnapshot(
  outcome: "retired" | "callback_rejected" | "callback_indeterminate",
): VoidUdpSwarmRelayRetirementExecutorSnapshotV1 {
  const executor = new VoidUdpSwarmRelayRetirementExecutorV1(binding);
  const result = executor.execute({
    revalidate,
    retireExactRelayFallback: () => {
      if (outcome === "callback_indeterminate") {
        throw new Error("synthetic ambiguous relay close");
      }
      return outcome === "retired";
    },
  });
  if (outcome === "retired") {
    assert.equal(result.ok, true);
  } else {
    assert.equal(result.ok, false);
  }
  return executor.snapshot();
}

const retiredSnapshot = terminalSnapshot("retired");
const rejectedSnapshot = terminalSnapshot("callback_rejected");
const indeterminateSnapshot = terminalSnapshot("callback_indeterminate");
const pendingSnapshot = new VoidUdpSwarmRelayRetirementExecutorV1(binding).snapshot();

const retiredReceiptResult = buildVoidUdpSwarmRelayRetirementReceiptV1(retiredSnapshot);
assert.equal(retiredReceiptResult.ok, true);
if (!retiredReceiptResult.ok) throw new Error("expected retired receipt");
const retiredReceipt = retiredReceiptResult.receipt;

function state(
  overrides: Partial<VoidUdpSwarmPostRetirementRelayRecoveryStateV1> = {},
): VoidUdpSwarmPostRetirementRelayRecoveryStateV1 {
  return Object.freeze({
    expected_peer_node_id: binding.expected_peer_node_id,
    retirement_executor_snapshot: retiredSnapshot,
    direct_route_live: false,
    normal_peer_route_present: false,
    retained_relay_fallback_present: false,
    retired_relay_stream_live: false,
    replacement_relay_stream_live: false,
    relay_control_peer_live: true,
    relay_control_authenticated_node_id: binding.relay_node_id,
    newer_udp_swarm_session_present: false,
    recovery_in_flight: false,
    node_stopping: false,
    ...overrides,
  });
}

function expectHold(
  overrides: Partial<VoidUdpSwarmPostRetirementRelayRecoveryStateV1>,
  reason: VoidUdpSwarmPostRetirementRelayRecoveryReasonV1,
): void {
  const result = evaluateVoidUdpSwarmPostRetirementRelayRecoveryPolicyV1(
    state(overrides),
  );
  assert.equal(result.action, "hold_recovery");
  assert.equal(result.reason, reason);
  assert.equal(result.fresh_relay_reacquisition_authorized, false);
  assert.equal(result.fresh_relay_stream_required, false);
  assert.equal(result.retired_relay_stream_reuse_allowed, false);
  assert.equal(result.relay_request_performed, false);
  assert.equal(result.relay_stream_mutation_performed, false);
  assert.equal(result.normal_peer_map_mutation_performed, false);
  assert.equal(result.direct_route_reconnect_authorized, false);
  assert.equal(result.verified_direct_evidence_persistence_authorized, false);
  assert.equal(result.verified_direct_evidence_persisted, false);
  assert.equal(result.production_udp_activation_performed, false);
}

assert.deepEqual(
  VOID_P2P_UDP_SWARM_POST_RETIREMENT_RELAY_RECOVERY_POLICY_AUTHORITY_V1,
  {
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
  },
);

{
  const result = evaluateVoidUdpSwarmPostRetirementRelayRecoveryPolicyV1(
    state(),
  );
  assert.deepEqual(result, {
    version: 1,
    action: "authorize_fresh_relay_reacquisition",
    reason: "fresh_relay_reacquisition_may_be_authorized",
    binding: retiredReceipt.binding,
    retirement_receipt_id_sha256: retiredReceipt.receipt_id_sha256,
    fresh_relay_reacquisition_authorized: true,
    fresh_relay_stream_required: true,
    retired_relay_stream_reuse_allowed: false,
    relay_request_performed: false,
    relay_stream_mutation_performed: false,
    normal_peer_map_mutation_performed: false,
    direct_route_reconnect_authorized: false,
    verified_direct_evidence_persistence_authorized: false,
    verified_direct_evidence_persisted: false,
    production_udp_activation_performed: false,
  });
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.binding), true);
}

{
  const malformed = { ...state(), unexpected_field: true };
  const result = evaluateVoidUdpSwarmPostRetirementRelayRecoveryPolicyV1(
    malformed,
  );
  assert.equal(result.action, "hold_recovery");
  assert.equal(result.reason, "invalid_state_shape");
  assert.equal(result.binding, null);
  assert.equal(result.retirement_receipt_id_sha256, null);
}

{
  const malformed = { ...state(), expected_peer_node_id: "not-a-node-id" };
  const result = evaluateVoidUdpSwarmPostRetirementRelayRecoveryPolicyV1(
    malformed,
  );
  assert.equal(result.reason, "invalid_state_shape");
}

expectHold(
  { retirement_executor_snapshot: pendingSnapshot },
  "invalid_retirement_snapshot",
);
expectHold(
  { retirement_executor_snapshot: rejectedSnapshot },
  "relay_not_confirmed_retired",
);
expectHold(
  { retirement_executor_snapshot: indeterminateSnapshot },
  "relay_not_confirmed_retired",
);
expectHold(
  {
    retirement_executor_snapshot: Object.freeze({
      ...retiredSnapshot,
      verified_direct_evidence_persisted: true,
    }),
  },
  "invalid_retirement_snapshot",
);
expectHold(
  { expected_peer_node_id: "33".repeat(16) },
  "receipt_binding_mismatch",
);
expectHold({ node_stopping: true }, "node_stopping");
expectHold(
  { newer_udp_swarm_session_present: true },
  "newer_udp_swarm_session_present",
);
expectHold({ direct_route_live: true }, "direct_route_still_live");
expectHold({ normal_peer_route_present: true }, "normal_peer_route_present");
expectHold(
  { retained_relay_fallback_present: true },
  "retained_relay_fallback_present",
);
expectHold(
  { retired_relay_stream_live: true },
  "retired_relay_stream_still_live",
);
expectHold(
  { replacement_relay_stream_live: true },
  "replacement_relay_stream_already_live",
);
expectHold({ recovery_in_flight: true }, "recovery_already_in_flight");
expectHold({ relay_control_peer_live: false }, "relay_control_peer_not_live");
expectHold(
  { relay_control_authenticated_node_id: null },
  "relay_control_identity_mismatch",
);
expectHold(
  { relay_control_authenticated_node_id: "44".repeat(16) },
  "relay_control_identity_mismatch",
);

{
  const first = evaluateVoidUdpSwarmPostRetirementRelayRecoveryPolicyV1(
    state(),
  );
  const second = evaluateVoidUdpSwarmPostRetirementRelayRecoveryPolicyV1(
    state(),
  );
  assert.equal(
    first.retirement_receipt_id_sha256,
    second.retirement_receipt_id_sha256,
  );
  assert.equal(first.retirement_receipt_id_sha256, retiredReceipt.receipt_id_sha256);
}

console.log(
  "VOID_P2P_UDP_SWARM_POST_RETIREMENT_RELAY_RECOVERY_POLICY_V1_PROOF_GREEN",
);
