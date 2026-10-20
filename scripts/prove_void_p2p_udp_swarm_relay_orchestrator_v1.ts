// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";

import {
  VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_RETRY_MS_V1,
  VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_V1,
  VoidUdpSwarmRelayOrchestratorV1,
  parseVoidUdpSwarmRelayOrchestrationRoutesV1,
  type VoidUdpSwarmRelayOrchestrationNodeV1,
} from "../src/p2p/udp_swarm_relay_orchestrator_v1.js";

const relayNodeId = "a".repeat(32);
const targetNodeId = "b".repeat(32);
const localNodeId = "c".repeat(32);
const streamId = "d".repeat(32);

const parsed = parseVoidUdpSwarmRelayOrchestrationRoutesV1(
  `${relayNodeId}/${targetNodeId}`,
);
assert.deepEqual(parsed, [{
  relay_node_id: relayNodeId,
  target_node_id: targetNodeId,
}]);
assert.throws(
  () => parseVoidUdpSwarmRelayOrchestrationRoutesV1(
    `${relayNodeId}/${relayNodeId}`,
  ),
  /invalid/,
);
assert.throws(
  () => parseVoidUdpSwarmRelayOrchestrationRoutesV1(
    `${relayNodeId}/${targetNodeId},${relayNodeId}/${targetNodeId}`,
  ),
  /unique/,
);
assert.throws(
  () => parseVoidUdpSwarmRelayOrchestrationRoutesV1(
    ` ${relayNodeId}/${targetNodeId}`,
  ),
  /whitespace/,
);

let reservations: Array<{ relay_node_id: string; expires_at_ms: number }> = [];
let streams: Array<{
  relay_node_id: string;
  remote_node_id: string;
  stream_id: string;
  outgoing: boolean;
  started: boolean;
}> = [];
let pendingRequests: Array<{
  relay_node_id: string;
  target_node_id: string;
  stream_id: string;
}> = [];
let activeRoutes: Array<{
  relay_node_id: string;
  peer_node_id: string;
  stream_id: string;
}> = [];
const reservationCalls: Array<{ relay: string; ttl: number }> = [];
const connectCalls: Array<{ relay: string; target: string }> = [];
const upgradeCalls: Array<{ relay: string; target: string; stream: string }> = [];
let rejectUpgrade = false;

const node: VoidUdpSwarmRelayOrchestrationNodeV1 = {
  id: localNodeId,
  relaySnapshot: () => ({
    client_reservations: reservations,
    streams,
  }),
  udpSwarmControlSnapshot: () => ({
    pending_requests: pendingRequests,
    active_routes: activeRoutes,
  }),
  requestRelayReservation: (relay, ttl = 0) => {
    reservationCalls.push({ relay, ttl });
    return "1".repeat(32);
  },
  connectViaRelay: (relay, target) => {
    connectCalls.push({ relay, target });
    return "2".repeat(32);
  },
  requestUdpSwarmUpgradeV1: (relay, target, stream) => {
    upgradeCalls.push({ relay, target, stream });
    return rejectUpgrade
      ? { ok: false as const, error: "proof rejection" }
      : { ok: true as const, request_id: "3".repeat(32) };
  },
};

assert.throws(
  () => new VoidUdpSwarmRelayOrchestratorV1(node, {
    enabled: false,
    routes: parsed,
  }),
  /require exact opt-in/,
);
assert.throws(
  () => new VoidUdpSwarmRelayOrchestratorV1(node, {
    enabled: true,
    routes: [{ relay_node_id: localNodeId, target_node_id: targetNodeId }],
  }),
  /invalid for this node/,
);

const orchestrator = new VoidUdpSwarmRelayOrchestratorV1(node, {
  enabled: true,
  routes: parsed,
});

orchestrator.runOnce(0);
assert.deepEqual(reservationCalls, [{ relay: relayNodeId, ttl: 120_000 }]);
assert.equal(connectCalls.length, 0);
assert.equal(upgradeCalls.length, 0);

orchestrator.runOnce(1_000);
assert.equal(reservationCalls.length, 1);

reservations = [{ relay_node_id: relayNodeId, expires_at_ms: 120_000 }];
orchestrator.runOnce(2_000);
assert.deepEqual(connectCalls, [{ relay: relayNodeId, target: targetNodeId }]);

streams = [{
  relay_node_id: relayNodeId,
  remote_node_id: targetNodeId,
  stream_id: streamId,
  outgoing: true,
  started: false,
}];
orchestrator.runOnce(3_000);
assert.equal(upgradeCalls.length, 0);

streams = [{ ...streams[0]!, started: true }];
orchestrator.runOnce(4_000);
assert.deepEqual(upgradeCalls, [{
  relay: relayNodeId,
  target: targetNodeId,
  stream: streamId,
}]);

pendingRequests = [{
  relay_node_id: relayNodeId,
  target_node_id: targetNodeId,
  stream_id: streamId,
}];
orchestrator.runOnce(4_000 + VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_RETRY_MS_V1);
assert.equal(upgradeCalls.length, 1);

pendingRequests = [];
activeRoutes = [{
  relay_node_id: relayNodeId,
  peer_node_id: targetNodeId,
  stream_id: streamId,
}];
orchestrator.runOnce(35_000);
assert.equal(upgradeCalls.length, 1);

activeRoutes = [];
rejectUpgrade = true;
orchestrator.runOnce(36_000);
assert.equal(upgradeCalls.length, 2);
orchestrator.runOnce(37_000);
assert.equal(upgradeCalls.length, 2);
orchestrator.runOnce(
  36_000 + VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_RETRY_MS_V1,
);
assert.equal(upgradeCalls.length, 3);

streams = [{ ...streams[0]!, outgoing: false }];
orchestrator.runOnce(70_000);
assert.equal(upgradeCalls.length, 3);

reservations = [{ relay_node_id: relayNodeId, expires_at_ms: 100_000 }];
orchestrator.runOnce(71_000);
assert.equal(reservationCalls.length, 2);

const status = orchestrator.status();
assert.equal(status.marker, VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_V1);
assert.equal(status.enabled, true);
assert.equal(status.route_count, 1);
const statusText = JSON.stringify(status);
assert.equal(statusText.includes(relayNodeId), false);
assert.equal(statusText.includes(targetNodeId), false);
assert.equal(statusText.includes(streamId), false);

orchestrator.stop();
orchestrator.runOnce(90_000);
assert.equal(reservationCalls.length, 2);

const failingRelayNodeId = "e".repeat(32);
const healthyRelayNodeId = "f".repeat(32);
const isolatedReservationCalls: string[] = [];
const syntheticReservationEmissions: string[] = [];
const failureIsolationNode: VoidUdpSwarmRelayOrchestrationNodeV1 = {
  ...node,
  relaySnapshot: () => ({
    client_reservations: [],
    streams: [],
  }),
  udpSwarmControlSnapshot: () => ({
    pending_requests: [],
    active_routes: [],
  }),
  requestRelayReservation: (relay) => {
    isolatedReservationCalls.push(relay);
    if (relay === failingRelayNodeId) {
      syntheticReservationEmissions.push(relay);
      throw new Error("synthetic post-emission reservation exception");
    }
    return "4".repeat(32);
  },
};
const failureIsolation = new VoidUdpSwarmRelayOrchestratorV1(
  failureIsolationNode,
  {
    enabled: true,
    routes: [
      {
        relay_node_id: failingRelayNodeId,
        target_node_id: targetNodeId,
      },
      {
        relay_node_id: healthyRelayNodeId,
        target_node_id: relayNodeId,
      },
    ],
  },
);
assert.doesNotThrow(() => failureIsolation.runOnce(0));
assert.deepEqual(isolatedReservationCalls, [
  failingRelayNodeId,
  healthyRelayNodeId,
]);
const failureIsolationStatus = failureIsolation.status();
assert.equal(
  (failureIsolationStatus.counters as Record<string, number>).sweep_failures,
  1,
);
assert.equal(
  (failureIsolationStatus.counters as Record<string, number>)
    .reservation_attempts,
  2,
);
assert.equal(
  (failureIsolationStatus.counters as Record<string, number>)
    .reservation_requests,
  1,
);
failureIsolation.runOnce(1_000);
failureIsolation.runOnce(2_000);
assert.deepEqual(isolatedReservationCalls, [
  failingRelayNodeId,
  healthyRelayNodeId,
]);
assert.deepEqual(syntheticReservationEmissions, [failingRelayNodeId]);
failureIsolation.runOnce(
  VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_RETRY_MS_V1,
);
assert.deepEqual(isolatedReservationCalls, [
  failingRelayNodeId,
  healthyRelayNodeId,
  failingRelayNodeId,
  healthyRelayNodeId,
]);
assert.deepEqual(syntheticReservationEmissions, [
  failingRelayNodeId,
  failingRelayNodeId,
]);
failureIsolation.stop();

// Only a nonthrowing, explicit no-request result is allowed a fast retry.
const noSendReservationCalls: string[] = [];
const explicitNoSendReservation = new VoidUdpSwarmRelayOrchestratorV1(
  {
    ...failureIsolationNode,
    requestRelayReservation: (relay) => {
      noSendReservationCalls.push(relay);
      return relay === failingRelayNodeId ? undefined : "4".repeat(32);
    },
  },
  {
    enabled: true,
    routes: [
      { relay_node_id: failingRelayNodeId, target_node_id: targetNodeId },
      { relay_node_id: healthyRelayNodeId, target_node_id: relayNodeId },
    ],
  },
);
explicitNoSendReservation.runOnce(0);
explicitNoSendReservation.runOnce(1_000);
assert.deepEqual(noSendReservationCalls, [
  failingRelayNodeId,
  healthyRelayNodeId,
  failingRelayNodeId,
]);
explicitNoSendReservation.stop();

// A thrown connect may follow emission: keep its 15-second fence while
// allowing the later independent route to progress.
const isolatedConnectCalls: string[] = [];
const syntheticConnectEmissions: string[] = [];
const connectFailureIsolationNode: VoidUdpSwarmRelayOrchestrationNodeV1 = {
  ...node,
  relaySnapshot: () => ({
    client_reservations: [
      { relay_node_id: failingRelayNodeId, expires_at_ms: 120_000 },
      { relay_node_id: healthyRelayNodeId, expires_at_ms: 120_000 },
    ],
    streams: [],
  }),
  udpSwarmControlSnapshot: () => ({
    pending_requests: [],
    active_routes: [],
  }),
  connectViaRelay: (relay) => {
    isolatedConnectCalls.push(relay);
    if (relay === failingRelayNodeId) {
      syntheticConnectEmissions.push(relay);
      throw new Error("synthetic post-emission connect exception");
    }
    return "8".repeat(32);
  },
};
const connectFailureIsolation = new VoidUdpSwarmRelayOrchestratorV1(
  connectFailureIsolationNode,
  {
    enabled: true,
    routes: [
      {
        relay_node_id: failingRelayNodeId,
        target_node_id: targetNodeId,
      },
      {
        relay_node_id: healthyRelayNodeId,
        target_node_id: relayNodeId,
      },
    ],
  },
);
assert.doesNotThrow(() => connectFailureIsolation.runOnce(0));
assert.deepEqual(isolatedConnectCalls, [
  failingRelayNodeId,
  healthyRelayNodeId,
]);
const connectFailureStatus = connectFailureIsolation.status();
assert.equal(
  (connectFailureStatus.counters as Record<string, number>).sweep_failures,
  1,
);
assert.equal(
  (connectFailureStatus.counters as Record<string, number>).connect_attempts,
  2,
);
assert.equal(
  (connectFailureStatus.counters as Record<string, number>).connect_requests,
  1,
);
connectFailureIsolation.runOnce(1_000);
connectFailureIsolation.runOnce(2_000);
assert.deepEqual(isolatedConnectCalls, [
  failingRelayNodeId,
  healthyRelayNodeId,
]);
assert.deepEqual(syntheticConnectEmissions, [failingRelayNodeId]);
connectFailureIsolation.runOnce(
  VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_RETRY_MS_V1,
);
assert.deepEqual(isolatedConnectCalls, [
  failingRelayNodeId,
  healthyRelayNodeId,
  failingRelayNodeId,
  healthyRelayNodeId,
]);
assert.deepEqual(syntheticConnectEmissions, [
  failingRelayNodeId,
  failingRelayNodeId,
]);
connectFailureIsolation.stop();

// The production connect adapter uses undefined to report no dispatch.
const noSendConnectCalls: string[] = [];
const explicitNoSendConnect = new VoidUdpSwarmRelayOrchestratorV1(
  {
    ...connectFailureIsolationNode,
    connectViaRelay: (relay) => {
      noSendConnectCalls.push(relay);
      return relay === failingRelayNodeId ? undefined : "8".repeat(32);
    },
  },
  {
    enabled: true,
    routes: [
      { relay_node_id: failingRelayNodeId, target_node_id: targetNodeId },
      { relay_node_id: healthyRelayNodeId, target_node_id: relayNodeId },
    ],
  },
);
explicitNoSendConnect.runOnce(0);
explicitNoSendConnect.runOnce(1_000);
assert.deepEqual(noSendConnectCalls, [
  failingRelayNodeId,
  healthyRelayNodeId,
  failingRelayNodeId,
]);
explicitNoSendConnect.stop();

const failingUpgradeStreamId = "5".repeat(32);
const healthyUpgradeStreamId = "6".repeat(32);
const isolatedUpgradeCalls: string[] = [];
const syntheticUpgradeEmissions: string[] = [];
const upgradeFailureIsolationNode: VoidUdpSwarmRelayOrchestrationNodeV1 = {
  ...node,
  relaySnapshot: () => ({
    client_reservations: [
      { relay_node_id: failingRelayNodeId, expires_at_ms: 120_000 },
      { relay_node_id: healthyRelayNodeId, expires_at_ms: 120_000 },
    ],
    streams: [
      {
        relay_node_id: failingRelayNodeId,
        remote_node_id: targetNodeId,
        stream_id: failingUpgradeStreamId,
        outgoing: true,
        started: true,
      },
      {
        relay_node_id: healthyRelayNodeId,
        remote_node_id: relayNodeId,
        stream_id: healthyUpgradeStreamId,
        outgoing: true,
        started: true,
      },
    ],
  }),
  udpSwarmControlSnapshot: () => ({
    pending_requests: [],
    active_routes: [],
  }),
  requestUdpSwarmUpgradeV1: (relay) => {
    isolatedUpgradeCalls.push(relay);
    if (relay === failingRelayNodeId) {
      syntheticUpgradeEmissions.push(relay);
      throw new Error("synthetic post-emission upgrade exception");
    }
    return { ok: true as const, request_id: "7".repeat(32) };
  },
};
const upgradeFailureIsolation = new VoidUdpSwarmRelayOrchestratorV1(
  upgradeFailureIsolationNode,
  {
    enabled: true,
    routes: [
      {
        relay_node_id: failingRelayNodeId,
        target_node_id: targetNodeId,
      },
      {
        relay_node_id: healthyRelayNodeId,
        target_node_id: relayNodeId,
      },
    ],
  },
);
assert.doesNotThrow(() => upgradeFailureIsolation.runOnce(0));
assert.deepEqual(isolatedUpgradeCalls, [
  failingRelayNodeId,
  healthyRelayNodeId,
]);
upgradeFailureIsolation.runOnce(1_000);
upgradeFailureIsolation.runOnce(2_000);
assert.deepEqual(isolatedUpgradeCalls, [
  failingRelayNodeId,
  healthyRelayNodeId,
]);
assert.deepEqual(syntheticUpgradeEmissions, [failingRelayNodeId]);
upgradeFailureIsolation.runOnce(
  VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_RETRY_MS_V1,
);
assert.deepEqual(isolatedUpgradeCalls, [
  failingRelayNodeId,
  healthyRelayNodeId,
  failingRelayNodeId,
  healthyRelayNodeId,
]);
assert.deepEqual(syntheticUpgradeEmissions, [
  failingRelayNodeId,
  failingRelayNodeId,
]);
upgradeFailureIsolation.stop();


const reentrantStopCalls: string[] = [];
let stoppedInsideReservationAdapter: VoidUdpSwarmRelayOrchestratorV1;
const reentrantStopNode: VoidUdpSwarmRelayOrchestrationNodeV1 = {
  ...failureIsolationNode,
  requestRelayReservation: (relay) => {
    reentrantStopCalls.push(relay);
    stoppedInsideReservationAdapter.stop();
    return "8".repeat(32);
  },
};
stoppedInsideReservationAdapter = new VoidUdpSwarmRelayOrchestratorV1(
  reentrantStopNode,
  {
    enabled: true,
    routes: [
      { relay_node_id: failingRelayNodeId, target_node_id: targetNodeId },
      { relay_node_id: healthyRelayNodeId, target_node_id: relayNodeId },
    ],
  },
);
assert.doesNotThrow(() => stoppedInsideReservationAdapter.runOnce(0));
assert.equal(stoppedInsideReservationAdapter.status().stopped, true);
assert.deepEqual(reentrantStopCalls, [failingRelayNodeId]);
stoppedInsideReservationAdapter.runOnce(1_000);
assert.deepEqual(reentrantStopCalls, [failingRelayNodeId]);

// A synchronous discovery replacement must invalidate the stale route array
// before either the current route upgrades or a later revoked route starts.
const freshRelayNodeId = "9".repeat(32);
const reentrantReplacementCalls: string[] = [];
let replacementInsideReservationAdapter: VoidUdpSwarmRelayOrchestratorV1;
const reentrantReplacementNode: VoidUdpSwarmRelayOrchestrationNodeV1 = {
  ...upgradeFailureIsolationNode,
  requestRelayReservation: (relay) => {
    reentrantReplacementCalls.push(`reservation:${relay}`);
    if (relay === failingRelayNodeId) {
      replacementInsideReservationAdapter.replaceVerifiedDiscoveryRoutesV1([
        { relay_node_id: freshRelayNodeId, target_node_id: targetNodeId },
      ]);
    }
    return "8".repeat(32);
  },
  requestUdpSwarmUpgradeV1: (relay) => {
    reentrantReplacementCalls.push(`upgrade:${relay}`);
    return { ok: true as const, request_id: "7".repeat(32) };
  },
};
replacementInsideReservationAdapter = new VoidUdpSwarmRelayOrchestratorV1(
  reentrantReplacementNode,
  {
    enabled: true,
    routes: [
      { relay_node_id: failingRelayNodeId, target_node_id: targetNodeId },
      { relay_node_id: healthyRelayNodeId, target_node_id: relayNodeId },
    ],
  },
);
assert.doesNotThrow(() => replacementInsideReservationAdapter.runOnce(95_000));
assert.deepEqual(reentrantReplacementCalls, [
  `reservation:${failingRelayNodeId}`,
]);
assert.equal(
  replacementInsideReservationAdapter.status().route_source,
  "verified_discovery",
);
assert.equal(replacementInsideReservationAdapter.status().route_count, 1);
replacementInsideReservationAdapter.runOnce(95_001);
assert.deepEqual(reentrantReplacementCalls, [
  `reservation:${failingRelayNodeId}`,
  `reservation:${freshRelayNodeId}`,
]);
replacementInsideReservationAdapter.stop();


const originalSetInterval = globalThis.setInterval;
const originalClearInterval = globalThis.clearInterval;
const scheduledIntervals: Array<ReturnType<typeof setInterval>> = [];
const clearedIntervals: Array<ReturnType<typeof setInterval>> = [];
try {
  // Disposable scheduler doubles let the proof count every handle without
  // waiting for wall-clock ticks or leaking a real interval on regression.
  globalThis.setInterval = ((..._args: Parameters<typeof setInterval>) => {
    const handle = { unref() { return this; } } as unknown as ReturnType<
      typeof setInterval
    >;
    scheduledIntervals.push(handle);
    return handle;
  }) as typeof setInterval;
  globalThis.clearInterval = ((handle: ReturnType<typeof setInterval>) => {
    clearedIntervals.push(handle);
  }) as typeof clearInterval;

  const startedRouteCalls: string[] = [];
  let startedReplacementOrchestrator: VoidUdpSwarmRelayOrchestratorV1;
  const startedReplacementNode: VoidUdpSwarmRelayOrchestrationNodeV1 = {
    ...failureIsolationNode,
    requestRelayReservation: (relay) => {
      startedRouteCalls.push(relay);
      if (relay === failingRelayNodeId) {
        startedReplacementOrchestrator.replaceVerifiedDiscoveryRoutesV1([
          { relay_node_id: freshRelayNodeId, target_node_id: targetNodeId },
        ]);
      }
      return "8".repeat(32);
    },
  };
  startedReplacementOrchestrator = new VoidUdpSwarmRelayOrchestratorV1(
    startedReplacementNode,
    {
      enabled: true,
      routes: [
        { relay_node_id: failingRelayNodeId, target_node_id: targetNodeId },
        { relay_node_id: healthyRelayNodeId, target_node_id: relayNodeId },
      ],
    },
  );
  assert.doesNotThrow(() => startedReplacementOrchestrator.start());
  assert.equal(scheduledIntervals.length, 1);
  assert.deepEqual(startedRouteCalls, [failingRelayNodeId]);
  assert.equal(
    (startedReplacementOrchestrator.status().counters as Record<string, number>)
      .sweep_count,
    1,
  );
  assert.equal(startedReplacementOrchestrator.status().route_count, 1);
  assert.equal(
    startedReplacementOrchestrator.status().route_source,
    "verified_discovery",
  );
  startedReplacementOrchestrator.runOnce(Date.now() + 1_000);
  assert.deepEqual(startedRouteCalls, [
    failingRelayNodeId,
    freshRelayNodeId,
  ]);
  startedReplacementOrchestrator.stop();
  assert.deepEqual(clearedIntervals, scheduledIntervals);
} finally {
  globalThis.setInterval = originalSetInterval;
  globalThis.clearInterval = originalClearInterval;
}

console.log(JSON.stringify({
  marker: "VOID_P2P_UDP_SWARM_RELAY_ORCHESTRATOR_V1_PROOF",
  status: "green",
  checks: {
    exact_opt_in: true,
    exact_route_validation: true,
    bounded_reservation_retry: true,
    reservation_before_connect: true,
    started_outgoing_stream_before_upgrade: true,
    pending_and_active_upgrade_suppression: true,
    bounded_upgrade_retry: true,
    route_local_adapter_failure_isolated: true,
    throwing_connect_route_isolated: true,
    reentrant_stop_is_terminal_in_same_sweep: true,
    reentrant_discovery_replacement_fences_stale_routes: true,
    started_reentrant_discovery_single_scheduler: true,
    later_routes_advance_after_failure: true,
    thrown_reservation_uses_bounded_backoff: true,
    thrown_connect_uses_bounded_backoff: true,
    thrown_upgrade_uses_bounded_backoff: true,
    explicit_no_request_retries_next_sweep: true,
    returned_upgrade_uses_bounded_backoff: true,
    incoming_stream_not_initiated: true,
    sanitized_status: true,
    stop_is_terminal: true,
  },
}, null, 2));
