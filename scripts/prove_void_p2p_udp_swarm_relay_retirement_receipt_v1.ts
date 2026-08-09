import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import {
  VOID_P2P_UDP_SWARM_RELAY_RETIREMENT_RECEIPT_AUTHORITY_V1,
  buildVoidUdpSwarmRelayRetirementReceiptV1,
  type VoidUdpSwarmRelayRetirementReceiptErrorV1,
  type VoidUdpSwarmRelayRetirementReceiptV1,
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
  relay_stream_id: "stream-retirement-receipt-proof-v1",
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

function current(): VoidUdpSwarmRelayRetirementRevalidationV1 {
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
  behavior: "retired" | "rejected" | "indeterminate",
): VoidUdpSwarmRelayRetirementExecutorSnapshotV1 {
  const executor = new VoidUdpSwarmRelayRetirementExecutorV1(binding);
  const result = executor.execute({
    revalidate: () => current(),
    retireExactRelayFallback: () => {
      if (behavior === "retired") return true;
      if (behavior === "rejected") return false;
      throw new Error("synthetic retirement callback ambiguity");
    },
  });
  if (behavior === "retired") {
    assert.equal(result.ok, true);
  } else {
    assert.equal(result.ok, false);
  }
  return executor.snapshot();
}

function expectReceipt(
  snapshot: VoidUdpSwarmRelayRetirementExecutorSnapshotV1,
): VoidUdpSwarmRelayRetirementReceiptV1 {
  const result = buildVoidUdpSwarmRelayRetirementReceiptV1(snapshot);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(`unexpected receipt failure: ${result.error}`);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.receipt), true);
  assert.equal(Object.isFrozen(result.receipt.binding), true);
  assert.match(result.receipt.receipt_id_sha256, /^[0-9a-f]{64}$/);
  assert.equal(result.receipt.relay_mutation_performed, false);
  assert.equal(result.receipt.direct_route_mutation_performed, false);
  assert.equal(result.receipt.verified_direct_evidence_persisted, false);
  assert.equal(result.receipt.production_udp_activation_performed, false);

  const { receipt_id_sha256, ...material } = result.receipt;
  const recomputed = createHash("sha256")
    .update(JSON.stringify(material), "utf8")
    .digest("hex");
  assert.equal(receipt_id_sha256, recomputed);
  return result.receipt;
}

function expectFailure(
  snapshot: VoidUdpSwarmRelayRetirementExecutorSnapshotV1,
  error: VoidUdpSwarmRelayRetirementReceiptErrorV1,
): void {
  const result = buildVoidUdpSwarmRelayRetirementReceiptV1(snapshot);
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("expected fail-closed receipt rejection");
  assert.equal(result.error, error);
  assert.deepEqual(result, {
    ok: false,
    error,
    receipt_created: false,
    relay_mutation_performed: false,
    direct_route_mutation_performed: false,
    verified_direct_evidence_persisted: false,
    production_udp_activation_performed: false,
  });
  assert.equal(Object.isFrozen(result), true);
}

assert.deepEqual(
  VOID_P2P_UDP_SWARM_RELAY_RETIREMENT_RECEIPT_AUTHORITY_V1,
  {
    consumes_terminal_executor_snapshot: true,
    content_addressed_receipt: true,
    relay_mutation_performed: false,
    direct_route_mutation_performed: false,
    verified_direct_evidence_persisted: false,
    production_udp_activation_performed: false,
    wallet_signer_validator_wc_money_authority: 0,
  },
);

const retired = terminalSnapshot("retired");
const retiredReceipt = expectReceipt(retired);
assert.equal(retiredReceipt.executor_phase, "retired");
assert.equal(retiredReceipt.disposition, "relay_retired");
assert.equal(retiredReceipt.retirement_callback_attempted, true);
assert.equal(retiredReceipt.relay_retirement_performed, true);
assert.deepEqual(retiredReceipt.binding, binding);

const retiredAgain = expectReceipt(retired);
assert.equal(retiredAgain.receipt_id_sha256, retiredReceipt.receipt_id_sha256);
assert.deepEqual(retiredAgain, retiredReceipt);

const clonedRetired = JSON.parse(JSON.stringify(retired)) as
  VoidUdpSwarmRelayRetirementExecutorSnapshotV1;
const clonedReceipt = expectReceipt(clonedRetired);
assert.equal(clonedReceipt.receipt_id_sha256, retiredReceipt.receipt_id_sha256);
assert.notStrictEqual(clonedReceipt.binding, retired.binding);

const rejected = terminalSnapshot("rejected");
const rejectedReceipt = expectReceipt(rejected);
assert.equal(rejectedReceipt.executor_phase, "callback_rejected");
assert.equal(rejectedReceipt.disposition, "retirement_callback_rejected");
assert.equal(rejectedReceipt.relay_retirement_performed, false);
assert.notEqual(rejectedReceipt.receipt_id_sha256, retiredReceipt.receipt_id_sha256);

const indeterminate = terminalSnapshot("indeterminate");
const indeterminateReceipt = expectReceipt(indeterminate);
assert.equal(indeterminateReceipt.executor_phase, "callback_indeterminate");
assert.equal(
  indeterminateReceipt.disposition,
  "retirement_callback_indeterminate",
);
assert.equal(indeterminateReceipt.relay_retirement_performed, null);
assert.notEqual(
  indeterminateReceipt.receipt_id_sha256,
  retiredReceipt.receipt_id_sha256,
);
assert.notEqual(
  indeterminateReceipt.receipt_id_sha256,
  rejectedReceipt.receipt_id_sha256,
);

const pending = new VoidUdpSwarmRelayRetirementExecutorV1(binding).snapshot();
expectFailure(pending, "snapshot_not_terminal");

expectFailure(
  {
    ...retired,
    retirement_callback_attempted: false,
  } as unknown as VoidUdpSwarmRelayRetirementExecutorSnapshotV1,
  "snapshot_inconsistent",
);
expectFailure(
  {
    ...retired,
    relay_retirement_performed: false,
  } as unknown as VoidUdpSwarmRelayRetirementExecutorSnapshotV1,
  "snapshot_inconsistent",
);
expectFailure(
  {
    ...rejected,
    relay_retirement_performed: true,
  } as unknown as VoidUdpSwarmRelayRetirementExecutorSnapshotV1,
  "snapshot_inconsistent",
);
expectFailure(
  {
    ...indeterminate,
    relay_retirement_performed: false,
  } as unknown as VoidUdpSwarmRelayRetirementExecutorSnapshotV1,
  "snapshot_inconsistent",
);

expectFailure(
  {
    ...retired,
    direct_route_mutation_performed: true,
  } as unknown as VoidUdpSwarmRelayRetirementExecutorSnapshotV1,
  "authority_boundary_violated",
);
expectFailure(
  {
    ...retired,
    verified_direct_evidence_persisted: true,
  } as unknown as VoidUdpSwarmRelayRetirementExecutorSnapshotV1,
  "authority_boundary_violated",
);
expectFailure(
  {
    ...retired,
    production_udp_activation_performed: true,
  } as unknown as VoidUdpSwarmRelayRetirementExecutorSnapshotV1,
  "authority_boundary_violated",
);

expectFailure(
  {
    ...retired,
    binding: {
      ...retired.binding,
      session_id: "contains whitespace",
    },
  } as unknown as VoidUdpSwarmRelayRetirementExecutorSnapshotV1,
  "invalid_binding",
);
expectFailure(
  {
    ...retired,
    binding: {
      ...retired.binding,
      unexpected: "field",
    },
  } as unknown as VoidUdpSwarmRelayRetirementExecutorSnapshotV1,
  "invalid_binding",
);
expectFailure(
  {
    ...retired,
    unexpected: "field",
  } as unknown as VoidUdpSwarmRelayRetirementExecutorSnapshotV1,
  "invalid_snapshot_shape",
);
expectFailure(
  {
    ...retired,
    version: 2,
  } as unknown as VoidUdpSwarmRelayRetirementExecutorSnapshotV1,
  "invalid_snapshot_shape",
);
expectFailure(
  {
    ...retired,
    phase: "unknown",
  } as unknown as VoidUdpSwarmRelayRetirementExecutorSnapshotV1,
  "invalid_snapshot_shape",
);

const alternateBindingSnapshot = {
  ...retired,
  binding: {
    ...retired.binding,
    session_id: "fedcba9876543210fedcba9876543210",
  },
} as VoidUdpSwarmRelayRetirementExecutorSnapshotV1;
const alternateReceipt = expectReceipt(alternateBindingSnapshot);
assert.notEqual(
  alternateReceipt.receipt_id_sha256,
  retiredReceipt.receipt_id_sha256,
);

console.log("terminal_receipt_states_proven=3");
console.log("pending_snapshot_receipt_created=false");
console.log("verified_direct_evidence_persisted=false");
console.log("relay_mutation_performed=false");
console.log("VOID_P2P_UDP_SWARM_RELAY_RETIREMENT_RECEIPT_V1_PROOF_GREEN");
