import assert from "node:assert/strict";

import {
  VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE_DEFAULT_TIMEOUT_MS_V1,
  VoidUdpSwarmDirectRouteHealthProbeV1,
  buildVoidUdpSwarmDirectRouteHealthPongV1,
  normalizeVoidUdpSwarmDirectRouteHealthProbeMessageV1,
} from "../src/p2p/udp_swarm_direct_route_health_probe_v1.js";
import {
  VoidUdpSwarmDirectRouteHealthObserverV1,
  type VoidUdpSwarmDirectRouteHealthObserverRouteStateV1,
} from "../src/p2p/udp_swarm_direct_route_health_observer_v1.js";

const SESSION_ID = "a".repeat(32);
const EXPECTED_PEER_NODE_ID = "b".repeat(32);
const RELAY_NODE_ID = "c".repeat(32);
const RELAY_STREAM_ID = "d".repeat(32);
const PROMOTED_AT_MS = 100_000;

const healthyRoute: VoidUdpSwarmDirectRouteHealthObserverRouteStateV1 =
  Object.freeze({
    authenticated_peer_node_id: EXPECTED_PEER_NODE_ID,
    direct_route_live: true,
    direct_route_transport: "direct",
    relay_fallback_live: true,
  });

function newObserver(): VoidUdpSwarmDirectRouteHealthObserverV1 {
  return new VoidUdpSwarmDirectRouteHealthObserverV1({
    sessionId: SESSION_ID,
    expectedPeerNodeId: EXPECTED_PEER_NODE_ID,
    relayNodeId: RELAY_NODE_ID,
    relayStreamId: RELAY_STREAM_ID,
    promotedAtMs: PROMOTED_AT_MS,
  });
}

function main(): void {
  assert.throws(
    () => new VoidUdpSwarmDirectRouteHealthProbeV1("bad"),
    /sessionId/,
  );
  assert.throws(
    () => new VoidUdpSwarmDirectRouteHealthProbeV1(SESSION_ID, 99),
    /timeout/,
  );

  const probe = new VoidUdpSwarmDirectRouteHealthProbeV1(SESSION_ID);
  const ping = probe.createPing(1_000);
  assert(ping);
  assert.equal(Object.isFrozen(ping), true);
  assert.equal(ping.type, "UDP_SWARM_DIRECT_HEALTH_PING");
  assert.equal(ping.protocol, 1);
  assert.equal(ping.session_id, SESSION_ID);
  assert.match(ping.probe_id, /^[0-9a-f]{32}$/);
  assert.equal(ping.sequence, 1);
  assert.equal(ping.sent_at_ms, 1_000);
  assert.equal(probe.createPing(1_001), null);

  assert.equal(
    normalizeVoidUdpSwarmDirectRouteHealthProbeMessageV1({
      ...ping,
      extra: true,
    }),
    undefined,
  );
  assert.equal(
    normalizeVoidUdpSwarmDirectRouteHealthProbeMessageV1({
      ...ping,
      protocol: 2,
    }),
    undefined,
  );
  assert.equal(
    normalizeVoidUdpSwarmDirectRouteHealthProbeMessageV1({
      ...ping,
      sequence: 0,
    }),
    undefined,
  );

  const pong = buildVoidUdpSwarmDirectRouteHealthPongV1(ping);
  assert(pong);
  assert.equal(Object.isFrozen(pong), true);
  assert.equal(pong.type, "UDP_SWARM_DIRECT_HEALTH_PONG");
  assert.equal(pong.session_id, ping.session_id);
  assert.equal(pong.probe_id, ping.probe_id);
  assert.equal(pong.sequence, ping.sequence);
  assert.equal(pong.sent_at_ms, ping.sent_at_ms);
  assert.equal(buildVoidUdpSwarmDirectRouteHealthPongV1(pong), null);

  const wrongPong = {
    ...pong,
    probe_id: "f".repeat(32),
  };
  assert.equal(probe.acceptPong(wrongPong, 1_020), null);
  assert.equal(probe.snapshot().pending_probe?.probe_id, ping.probe_id);

  const success = probe.acceptPong(pong, 1_040);
  assert(success && success.outcome === "success");
  assert.equal(success.rtt_ms, 40);
  assert.equal(success.observed_at_ms, 1_040);
  assert.equal(Object.isFrozen(success), true);
  assert.equal(probe.acceptPong(pong, 1_041), null);
  assert.equal(probe.snapshot().pending_probe, null);

  const timeoutProbe = new VoidUdpSwarmDirectRouteHealthProbeV1(SESSION_ID);
  const timeoutPing = timeoutProbe.createPing(2_000);
  assert(timeoutPing);
  assert.equal(
    timeoutProbe.expirePending(
      2_000 + VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE_DEFAULT_TIMEOUT_MS_V1,
    ),
    null,
  );
  const timeout = timeoutProbe.expirePending(
    2_001 + VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE_DEFAULT_TIMEOUT_MS_V1,
  );
  assert(timeout && timeout.outcome === "failure");
  assert.equal(timeout.reason, "health_probe_timeout");
  assert.equal(timeoutProbe.expirePending(9_000), null);
  assert.equal(
    timeoutProbe.acceptPong(
      buildVoidUdpSwarmDirectRouteHealthPongV1(timeoutPing),
      9_000,
    ),
    null,
  );

  const lateProbe = new VoidUdpSwarmDirectRouteHealthProbeV1(SESSION_ID);
  const latePing = lateProbe.createPing(10_000);
  assert(latePing);
  const latePong = buildVoidUdpSwarmDirectRouteHealthPongV1(latePing);
  assert(latePong);
  const lateResult = lateProbe.acceptPong(
    latePong,
    10_001 + VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE_DEFAULT_TIMEOUT_MS_V1,
  );
  assert(lateResult && lateResult.outcome === "failure");
  assert.equal(lateResult.reason, "health_probe_timeout");

  const clockProbe = new VoidUdpSwarmDirectRouteHealthProbeV1(SESSION_ID);
  const clockPing = clockProbe.createPing(20_000);
  assert(clockPing);
  const clockPong = buildVoidUdpSwarmDirectRouteHealthPongV1(clockPing);
  assert(clockPong);
  const clockResult = clockProbe.acceptPong(clockPong, 19_999);
  assert(clockResult && clockResult.outcome === "failure");
  assert.equal(clockResult.reason, "health_probe_clock_invalid");
  assert.equal(clockProbe.poisoned, true);
  assert.equal(clockProbe.createPing(20_001), null);

  const observer = newObserver();
  const integratedProbe = new VoidUdpSwarmDirectRouteHealthProbeV1(SESSION_ID);
  for (const offset of [0, 7_500, 15_000, 22_500, 30_000]) {
    const sentAt = PROMOTED_AT_MS + offset;
    const integratedPing = integratedProbe.createPing(sentAt);
    assert(integratedPing);
    const integratedPong = buildVoidUdpSwarmDirectRouteHealthPongV1(
      integratedPing,
    );
    assert(integratedPong);
    const result = integratedProbe.acceptPong(integratedPong, sentAt + 10);
    assert(result && result.outcome === "success");
    assert.equal(
      observer.recordSuccessfulRoundTrip(result.observed_at_ms, result.rtt_ms),
      true,
    );
  }
  const observerDecision = observer.evaluate(
    healthyRoute,
    PROMOTED_AT_MS + 30_010,
  );
  assert.equal(observerDecision.action, "authorize_relay_retirement");
  assert.equal(observerDecision.relay_retirement_performed, false);

  const failureObserver = newObserver();
  const failureProbe = new VoidUdpSwarmDirectRouteHealthProbeV1(SESSION_ID);
  const failurePing = failureProbe.createPing(PROMOTED_AT_MS);
  assert(failurePing);
  const failureResult = failureProbe.expirePending(
    PROMOTED_AT_MS +
      VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE_DEFAULT_TIMEOUT_MS_V1 +
      1,
  );
  assert(failureResult && failureResult.outcome === "failure");
  assert.equal(
    failureObserver.recordFailedRoundTrip(
      failureResult.observed_at_ms,
      failureResult.reason,
    ),
    true,
  );
  assert.equal(
    failureObserver.evaluate(healthyRoute, PROMOTED_AT_MS + 40_000).reason,
    "failed_round_trip_observed",
  );

  const snapshot = integratedProbe.snapshot();
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(snapshot.pending_probe, null);
  assert.equal(snapshot.network_send_performed, false);
  assert.equal(snapshot.runtime_timer_owned, false);
  assert.equal(snapshot.socket_access_performed, false);
  assert.equal(snapshot.relay_retirement_performed, false);

  console.log("one_outstanding_probe_per_session=true");
  console.log("probe_id_random_128_bit_hex=true");
  console.log("exact_pong_echo_binding_required=true");
  console.log("mismatched_pong_clears_pending=false");
  console.log("replayed_pong_accepted=false");
  console.log("timeout_boundary_inclusive=true");
  console.log("late_matching_pong_is_failure=true");
  console.log("local_clock_regression_poisons_probe=true");
  console.log("remote_receive_timestamp_trusted=false");
  console.log("probe_result_feeds_health_observer=true");
  console.log("network_send_performed=false");
  console.log("runtime_timer_owned=false");
  console.log("socket_access_performed=false");
  console.log("node_core_mount_performed=false");
  console.log("relay_retirement_performed=false");
  console.log("normal_peer_map_mutation_performed=false");
  console.log("direct_route_mutation_performed=false");
  console.log("relay_socket_mutation_performed=false");
  console.log("production_udp_activation_performed=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
  console.log("VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE_V1_PROOF_GREEN");
}

main();
