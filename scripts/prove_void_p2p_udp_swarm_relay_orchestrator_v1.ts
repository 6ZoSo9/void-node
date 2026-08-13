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
    incoming_stream_not_initiated: true,
    sanitized_status: true,
    stop_is_terminal: true,
  },
}, null, 2));
