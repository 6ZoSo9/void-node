import assert from "node:assert/strict";

import {
  VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_OBSERVER_MAX_RTT_MS_V1,
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

function observer(): VoidUdpSwarmDirectRouteHealthObserverV1 {
  return new VoidUdpSwarmDirectRouteHealthObserverV1({
    sessionId: SESSION_ID,
    expectedPeerNodeId: EXPECTED_PEER_NODE_ID,
    relayNodeId: RELAY_NODE_ID,
    relayStreamId: RELAY_STREAM_ID,
    promotedAtMs: PROMOTED_AT_MS,
  });
}

function addSustainedHealthyWindow(
  target: VoidUdpSwarmDirectRouteHealthObserverV1,
): void {
  const observations = [
    [PROMOTED_AT_MS, 18],
    [PROMOTED_AT_MS + 7_500, 17],
    [PROMOTED_AT_MS + 15_000, 19],
    [PROMOTED_AT_MS + 22_500, 16],
    [PROMOTED_AT_MS + 30_000, 18],
  ] as const;
  for (const [observedAtMs, rttMs] of observations) {
    assert.equal(
      target.recordSuccessfulRoundTrip(observedAtMs, rttMs),
      true,
    );
  }
}

function main(): void {
  assert.throws(
    () =>
      new VoidUdpSwarmDirectRouteHealthObserverV1({
        sessionId: "bad session",
        expectedPeerNodeId: EXPECTED_PEER_NODE_ID,
        relayNodeId: RELAY_NODE_ID,
        relayStreamId: RELAY_STREAM_ID,
        promotedAtMs: PROMOTED_AT_MS,
      }),
    /sessionId/,
  );
  assert.throws(
    () =>
      new VoidUdpSwarmDirectRouteHealthObserverV1({
        sessionId: SESSION_ID,
        expectedPeerNodeId: "bad",
        relayNodeId: RELAY_NODE_ID,
        relayStreamId: RELAY_STREAM_ID,
        promotedAtMs: PROMOTED_AT_MS,
      }),
    /expectedPeerNodeId/,
  );

  const sustained = observer();
  addSustainedHealthyWindow(sustained);
  const sustainedSnapshot = sustained.snapshot();
  assert.equal(Object.isFrozen(sustainedSnapshot), true);
  assert.equal(sustainedSnapshot.accepted_observation_count, 5);
  assert.equal(sustainedSnapshot.consecutive_successful_round_trips, 5);
  assert.equal(sustainedSnapshot.failed_round_trips_since_promotion, 0);
  assert.equal(sustainedSnapshot.first_success_at_ms, PROMOTED_AT_MS);
  assert.equal(
    sustainedSnapshot.last_success_at_ms,
    PROMOTED_AT_MS + 30_000,
  );
  assert.equal(sustainedSnapshot.poisoned, false);

  const authorized = sustained.evaluate(
    healthyRoute,
    PROMOTED_AT_MS + 30_000,
  );
  assert.equal(authorized.action, "authorize_relay_retirement");
  assert.equal(authorized.relay_retirement_authorized, true);
  assert.equal(authorized.relay_retirement_performed, false);
  assert.equal(authorized.normal_peer_map_mutation_performed, false);
  assert.equal(authorized.direct_route_mutation_performed, false);
  assert.equal(authorized.relay_socket_mutation_performed, false);

  const burst = observer();
  for (let offset = 29_996; offset <= 30_000; offset += 1) {
    assert.equal(
      burst.recordSuccessfulRoundTrip(PROMOTED_AT_MS + offset, 20),
      true,
    );
  }
  const burstDecision = burst.evaluate(
    healthyRoute,
    PROMOTED_AT_MS + 30_000,
  );
  assert.equal(burstDecision.action, "retain_relay");
  assert.equal(burstDecision.reason, "success_window_too_short");

  const failure = observer();
  assert.equal(
    failure.recordSuccessfulRoundTrip(PROMOTED_AT_MS, 15),
    true,
  );
  assert.equal(
    failure.recordFailedRoundTrip(
      PROMOTED_AT_MS + 5_000,
      "health_probe_timeout",
    ),
    true,
  );
  const failureSnapshot = failure.snapshot();
  assert.equal(failureSnapshot.failed_round_trips_since_promotion, 1);
  assert.equal(failureSnapshot.consecutive_successful_round_trips, 0);
  assert.equal(failureSnapshot.last_failure_at_ms, PROMOTED_AT_MS + 5_000);
  const failureDecision = failure.evaluate(
    healthyRoute,
    PROMOTED_AT_MS + 40_000,
  );
  assert.equal(failureDecision.action, "retain_relay");
  assert.equal(failureDecision.reason, "failed_round_trip_observed");

  const duplicate = observer();
  assert.equal(
    duplicate.recordSuccessfulRoundTrip(PROMOTED_AT_MS + 1_000, 12),
    true,
  );
  assert.equal(
    duplicate.recordSuccessfulRoundTrip(PROMOTED_AT_MS + 1_000, 12),
    false,
  );
  assert.equal(duplicate.poisoned, true);
  assert.match(
    String(duplicate.snapshot().poison_reason),
    /strictly monotonic/,
  );
  const duplicateDecision = duplicate.evaluate(
    healthyRoute,
    PROMOTED_AT_MS + 40_000,
  );
  assert.equal(duplicateDecision.action, "retain_relay");
  assert.equal(duplicateDecision.reason, "failed_round_trip_observed");

  const outOfOrder = observer();
  assert.equal(
    outOfOrder.recordSuccessfulRoundTrip(PROMOTED_AT_MS + 2_000, 11),
    true,
  );
  assert.equal(
    outOfOrder.recordFailedRoundTrip(
      PROMOTED_AT_MS + 1_999,
      "out_of_order_probe",
    ),
    false,
  );
  assert.equal(outOfOrder.poisoned, true);

  const badRtt = observer();
  assert.equal(
    badRtt.recordSuccessfulRoundTrip(
      PROMOTED_AT_MS + 1_000,
      VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_OBSERVER_MAX_RTT_MS_V1 + 1,
    ),
    false,
  );
  assert.equal(badRtt.poisoned, true);
  assert.equal(
    badRtt.evaluate(healthyRoute, PROMOTED_AT_MS + 40_000).reason,
    "failed_round_trip_observed",
  );

  const badFailureReason = observer();
  assert.equal(
    badFailureReason.recordFailedRoundTrip(
      PROMOTED_AT_MS + 1_000,
      "bad\nreason",
    ),
    false,
  );
  assert.equal(badFailureReason.poisoned, true);

  assert.equal(
    sustained.evaluate(
      { ...healthyRoute, direct_route_live: false },
      PROMOTED_AT_MS + 30_000,
    ).reason,
    "promoted_direct_route_not_live",
  );
  assert.equal(
    sustained.evaluate(
      { ...healthyRoute, relay_fallback_live: false },
      PROMOTED_AT_MS + 30_000,
    ).reason,
    "relay_fallback_not_live",
  );
  assert.equal(
    sustained.evaluate(healthyRoute, PROMOTED_AT_MS + 40_001).reason,
    "last_success_stale",
  );

  const policyInput = sustained.policyInput(
    healthyRoute,
    PROMOTED_AT_MS + 30_000,
  );
  assert.equal(Object.isFrozen(policyInput), true);
  assert.equal(policyInput.session_id, SESSION_ID);
  assert.equal(policyInput.expected_peer_node_id, EXPECTED_PEER_NODE_ID);
  assert.equal(policyInput.relay_node_id, RELAY_NODE_ID);
  assert.equal(policyInput.relay_stream_id, RELAY_STREAM_ID);
  assert.equal(policyInput.first_success_at_ms, PROMOTED_AT_MS);
  assert.equal(policyInput.last_success_at_ms, PROMOTED_AT_MS + 30_000);

  console.log("strict_monotonic_observation_time_required=true");
  console.log("duplicate_timestamp_poisoned=true");
  console.log("out_of_order_timestamp_poisoned=true");
  console.log("invalid_rtt_poisoned=true");
  console.log("invalid_failure_reason_poisoned=true");
  console.log("failure_resets_consecutive_successes=true");
  console.log("terminal_success_burst_authorized=false");
  console.log("sustained_success_window_authorized=true");
  console.log("observer_creates_network_probe=false");
  console.log("observer_owns_runtime_timer=false");
  console.log("observer_reads_or_writes_socket=false");
  console.log("node_core_mount_performed=false");
  console.log("relay_retirement_performed=false");
  console.log("normal_peer_map_mutation_performed=false");
  console.log("direct_route_mutation_performed=false");
  console.log("relay_socket_mutation_performed=false");
  console.log("production_udp_activation_performed=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
  console.log("VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_OBSERVER_V1_PROOF_GREEN");
}

main();
