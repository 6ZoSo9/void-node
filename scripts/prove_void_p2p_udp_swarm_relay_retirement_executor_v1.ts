import assert from "node:assert/strict";

import {
  VOID_P2P_UDP_SWARM_RELAY_RETIREMENT_EXECUTOR_AUTHORITY_V1,
  VoidUdpSwarmRelayRetirementExecutorV1,
  type VoidUdpSwarmRelayRetirementBindingV1,
  type VoidUdpSwarmRelayRetirementRevalidationV1,
} from "../src/p2p/udp_swarm_relay_retirement_executor_v1.js";
import type { VoidUdpSwarmDirectRouteHealthPolicyDecisionV1 } from "../src/p2p/udp_swarm_direct_route_health_policy_v1.js";

const binding: VoidUdpSwarmRelayRetirementBindingV1 = Object.freeze({
  session_id: "0123456789abcdef0123456789abcdef",
  expected_peer_node_id: "11".repeat(16),
  relay_node_id: "22".repeat(16),
  relay_stream_id: "stream-retirement-proof-v1",
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

const retainDecision: VoidUdpSwarmDirectRouteHealthPolicyDecisionV1 =
  Object.freeze({
    version: 1,
    action: "retain_relay",
    reason: "last_success_stale",
    relay_retirement_authorized: false,
    relay_retirement_performed: false,
    normal_peer_map_mutation_performed: false,
    direct_route_mutation_performed: false,
    relay_socket_mutation_performed: false,
  });

function current(
  overrides: Partial<VoidUdpSwarmRelayRetirementRevalidationV1> = {},
): VoidUdpSwarmRelayRetirementRevalidationV1 {
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
    ...overrides,
  });
}

function expectRejected(
  overrides: Partial<VoidUdpSwarmRelayRetirementRevalidationV1>,
  expectedError:
    | "binding_changed"
    | "authenticated_identity_mismatch"
    | "promoted_direct_route_not_live"
    | "promoted_route_not_direct"
    | "exact_direct_route_binding_not_live"
    | "relay_fallback_not_live"
    | "exact_relay_fallback_binding_not_live"
    | "health_not_authorized",
): void {
  const executor = new VoidUdpSwarmRelayRetirementExecutorV1(binding);
  let callbackCount = 0;
  const result = executor.execute({
    revalidate: () => current(overrides),
    retireExactRelayFallback: () => {
      callbackCount += 1;
      return true;
    },
  });
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("expected fail-closed rejection");
  assert.equal(result.error, expectedError);
  assert.equal(result.terminal, false);
  assert.equal(result.relay_retirement_performed, false);
  assert.equal(callbackCount, 0);
  assert.deepEqual(executor.snapshot(), {
    version: 1,
    phase: "pending",
    binding,
    retirement_callback_attempted: false,
    relay_retirement_performed: false,
    direct_route_mutation_performed: false,
    verified_direct_evidence_persisted: false,
    production_udp_activation_performed: false,
  });
}

assert.deepEqual(
  VOID_P2P_UDP_SWARM_RELAY_RETIREMENT_EXECUTOR_AUTHORITY_V1,
  {
    consumes_current_health_authorization: true,
    revalidates_exact_runtime_bindings_before_callback: true,
    may_invoke_exact_relay_retirement_callback: true,
    direct_route_mutation_performed: false,
    verified_direct_evidence_persisted: false,
    production_udp_activation_performed: false,
    wallet_signer_validator_wc_money_authority: 0,
  },
);

{
  const executor = new VoidUdpSwarmRelayRetirementExecutorV1(binding);
  assert.equal(Object.isFrozen(executor.snapshot().binding), true);
  assert.deepEqual(executor.snapshot(), {
    version: 1,
    phase: "pending",
    binding,
    retirement_callback_attempted: false,
    relay_retirement_performed: false,
    direct_route_mutation_performed: false,
    verified_direct_evidence_persisted: false,
    production_udp_activation_performed: false,
  });
}

assert.throws(
  () =>
    new VoidUdpSwarmRelayRetirementExecutorV1({
      ...binding,
      session_id: "contains whitespace",
    }),
  /invalid UDP swarm relay-retirement binding/,
);
assert.throws(
  () =>
    new VoidUdpSwarmRelayRetirementExecutorV1({
      ...binding,
      expected_peer_node_id: "not-a-node-id",
    }),
  /invalid UDP swarm relay-retirement binding/,
);
assert.throws(
  () =>
    new VoidUdpSwarmRelayRetirementExecutorV1({
      ...binding,
      relay_stream_id: "",
    }),
  /invalid UDP swarm relay-retirement binding/,
);

expectRejected(
  { session_id: "fedcba9876543210fedcba9876543210" },
  "binding_changed",
);
expectRejected(
  { expected_peer_node_id: "33".repeat(16) },
  "binding_changed",
);
expectRejected({ relay_node_id: "44".repeat(16) }, "binding_changed");
expectRejected({ relay_stream_id: "different-stream" }, "binding_changed");
expectRejected(
  { authenticated_peer_node_id: "55".repeat(16) },
  "authenticated_identity_mismatch",
);
expectRejected(
  { authenticated_peer_node_id: null },
  "authenticated_identity_mismatch",
);
expectRejected(
  { direct_route_live: false },
  "promoted_direct_route_not_live",
);
expectRejected({ direct_route_transport: "relay" }, "promoted_route_not_direct");
expectRejected({ direct_route_transport: null }, "promoted_route_not_direct");
expectRejected(
  { exact_direct_route_binding_live: false },
  "exact_direct_route_binding_not_live",
);
expectRejected({ relay_fallback_live: false }, "relay_fallback_not_live");
expectRejected(
  { exact_relay_fallback_binding_live: false },
  "exact_relay_fallback_binding_not_live",
);
expectRejected(
  { health_policy_decision: retainDecision },
  "health_not_authorized",
);
expectRejected(
  {
    health_policy_decision: Object.freeze({
      ...authorizedDecision,
      action: "retain_relay",
      reason: "relay_retirement_may_be_authorized",
      relay_retirement_authorized: true,
    }),
  },
  "health_not_authorized",
);

{
  const executor = new VoidUdpSwarmRelayRetirementExecutorV1(binding);
  let callbackCount = 0;
  const first = executor.execute({
    revalidate: () => {
      throw new Error("synthetic revalidation failure");
    },
    retireExactRelayFallback: () => {
      callbackCount += 1;
      return true;
    },
  });
  assert.equal(first.ok, false);
  if (first.ok) throw new Error("expected revalidation rejection");
  assert.equal(first.error, "revalidation_failed");
  assert.equal(first.terminal, false);
  assert.equal(callbackCount, 0);

  const second = executor.execute({
    revalidate: () => current(),
    retireExactRelayFallback: (exactBinding) => {
      callbackCount += 1;
      assert.equal(exactBinding, executor.snapshot().binding);
      assert.equal(Object.isFrozen(exactBinding), true);
      assert.deepEqual(exactBinding, binding);
      return true;
    },
  });
  assert.equal(second.ok, true);
  if (!second.ok) throw new Error(`unexpected success rejection: ${second.error}`);
  assert.equal(second.action, "relay_retired");
  assert.equal(second.relay_retirement_performed, true);
  assert.equal(second.direct_route_mutation_performed, false);
  assert.equal(second.verified_direct_evidence_persisted, false);
  assert.equal(second.production_udp_activation_performed, false);
  assert.equal(callbackCount, 1);
  assert.deepEqual(executor.snapshot(), {
    version: 1,
    phase: "retired",
    binding,
    retirement_callback_attempted: true,
    relay_retirement_performed: true,
    direct_route_mutation_performed: false,
    verified_direct_evidence_persisted: false,
    production_udp_activation_performed: false,
  });

  const replay = executor.execute({
    revalidate: () => current(),
    retireExactRelayFallback: () => {
      callbackCount += 1;
      return true;
    },
  });
  assert.equal(replay.ok, false);
  if (replay.ok) throw new Error("expected replay rejection");
  assert.equal(replay.error, "executor_terminal");
  assert.equal(replay.terminal, true);
  assert.equal(replay.relay_retirement_performed, true);
  assert.equal(callbackCount, 1);
}

{
  const executor = new VoidUdpSwarmRelayRetirementExecutorV1(binding);
  let callbackCount = 0;
  const rejected = executor.execute({
    revalidate: () => current(),
    retireExactRelayFallback: () => {
      callbackCount += 1;
      return false;
    },
  });
  assert.equal(rejected.ok, false);
  if (rejected.ok) throw new Error("expected callback rejection");
  assert.equal(rejected.error, "retirement_callback_rejected");
  assert.equal(rejected.terminal, true);
  assert.equal(rejected.relay_retirement_performed, false);
  assert.equal(callbackCount, 1);
  assert.equal(executor.snapshot().phase, "callback_rejected");

  const replay = executor.execute({
    revalidate: () => current(),
    retireExactRelayFallback: () => {
      callbackCount += 1;
      return true;
    },
  });
  assert.equal(replay.ok, false);
  if (replay.ok) throw new Error("expected terminal callback rejection");
  assert.equal(replay.error, "executor_terminal");
  assert.equal(replay.relay_retirement_performed, false);
  assert.equal(callbackCount, 1);
}

{
  const executor = new VoidUdpSwarmRelayRetirementExecutorV1(binding);
  let callbackCount = 0;
  const indeterminate = executor.execute({
    revalidate: () => current(),
    retireExactRelayFallback: () => {
      callbackCount += 1;
      throw new Error("synthetic callback throw");
    },
  });
  assert.equal(indeterminate.ok, false);
  if (indeterminate.ok) throw new Error("expected indeterminate callback result");
  assert.equal(indeterminate.error, "retirement_callback_threw");
  assert.equal(indeterminate.terminal, true);
  assert.equal(indeterminate.relay_retirement_performed, null);
  assert.equal(callbackCount, 1);
  assert.deepEqual(executor.snapshot(), {
    version: 1,
    phase: "callback_indeterminate",
    binding,
    retirement_callback_attempted: true,
    relay_retirement_performed: null,
    direct_route_mutation_performed: false,
    verified_direct_evidence_persisted: false,
    production_udp_activation_performed: false,
  });

  const replay = executor.execute({
    revalidate: () => current(),
    retireExactRelayFallback: () => {
      callbackCount += 1;
      return true;
    },
  });
  assert.equal(replay.ok, false);
  if (replay.ok) throw new Error("expected terminal indeterminate rejection");
  assert.equal(replay.error, "executor_terminal");
  assert.equal(replay.relay_retirement_performed, null);
  assert.equal(callbackCount, 1);
}

console.log("VOID_P2P_UDP_SWARM_RELAY_RETIREMENT_EXECUTOR_V1_PROOF_GREEN");
