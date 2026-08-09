import assert from "node:assert/strict";

import {
  VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE_INTERVAL_MS_V1,
  VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE_TIMEOUT_MS_V1,
  VoidUdpSwarmDirectRouteHealthObservationV1,
  normalizeVoidUdpSwarmDirectRouteHealthMessageV1,
} from "../src/p2p/udp_swarm_direct_route_health_observation_v1.js";
import {
  VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_MIN_WINDOW_MS_V1,
  evaluateVoidUdpSwarmDirectRouteHealthPolicyV1,
} from "../src/p2p/udp_swarm_direct_route_health_policy_v1.js";

const LOCAL = "1".repeat(32);
const PEER = "2".repeat(32);
const RELAY = "3".repeat(32);
const OTHER = "4".repeat(32);
const SESSION = "session-direct-health-observation-v1";
const STREAM = "relay-stream-direct-health-observation-v1";
const PROMOTED_AT = 1_000_000;

function idFactory(ids: string[]): () => string {
  let index = 0;
  return () => ids[index++] ?? "f".repeat(32);
}

function observer(
  localNodeId: string,
  expectedPeerNodeId: string,
  ids: string[] = [],
): VoidUdpSwarmDirectRouteHealthObservationV1 {
  return new VoidUdpSwarmDirectRouteHealthObservationV1({
    session_id: SESSION,
    local_node_id: localNodeId,
    expected_peer_node_id: expectedPeerNodeId,
    relay_node_id: RELAY,
    relay_stream_id: STREAM,
    promoted_at_ms: PROMOTED_AT,
    new_probe_id: ids.length ? idFactory(ids) : undefined,
  });
}

function mustIssue(
  runtime: VoidUdpSwarmDirectRouteHealthObservationV1,
  nowMs: number,
) {
  const result = runtime.issueProbeV1(nowMs);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.error);
  return result;
}

function mustAck(
  runtime: VoidUdpSwarmDirectRouteHealthObservationV1,
  authenticatedPeerNodeId: string,
  raw: unknown,
) {
  const result = runtime.buildAckForAuthenticatedProbeV1(
    authenticatedPeerNodeId,
    raw,
  );
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.error);
  return result;
}

function main(): void {
  assert.throws(
    () =>
      new VoidUdpSwarmDirectRouteHealthObservationV1({
        session_id: SESSION,
        local_node_id: LOCAL,
        expected_peer_node_id: LOCAL,
        relay_node_id: RELAY,
        relay_stream_id: STREAM,
        promoted_at_ms: PROMOTED_AT,
      }),
    /invalid UDP swarm direct-route health observation config/,
  );

  assert.equal(
    normalizeVoidUdpSwarmDirectRouteHealthMessageV1({
      type: "UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE",
      protocol: 1,
      session_id: SESSION,
      probe_id: "a".repeat(32),
      sender_node_id: LOCAL,
      recipient_node_id: PEER,
      extra: true,
    }),
    null,
  );

  const healthy = observer(
    LOCAL,
    PEER,
    ["a", "b", "c", "d", "e"].map((value) => value.repeat(32)),
  );
  const reciprocal = observer(PEER, LOCAL);

  let lastAck: unknown = null;
  for (let index = 0; index < 5; index += 1) {
    const sentAt =
      PROMOTED_AT +
      index * VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE_INTERVAL_MS_V1;
    const issued = mustIssue(healthy, sentAt);
    assert.deepEqual(
      normalizeVoidUdpSwarmDirectRouteHealthMessageV1(issued.message),
      issued.message,
    );

    const duplicateWhileOutstanding = healthy.issueProbeV1(sentAt);
    assert.deepEqual(duplicateWhileOutstanding, {
      ok: false,
      error: "probe_outstanding",
    });

    const ack = mustAck(reciprocal, LOCAL, issued.message);
    lastAck = ack.message;
    const accepted = healthy.ingestAuthenticatedAckV1(
      PEER,
      ack.message,
      sentAt + 1,
    );
    assert.deepEqual(accepted, { ok: true, round_trip_ms: 1 });
  }

  assert.deepEqual(
    healthy.ingestAuthenticatedAckV1(
      PEER,
      lastAck,
      PROMOTED_AT +
        4 * VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE_INTERVAL_MS_V1 +
        2,
    ),
    { ok: false, error: "probe_not_outstanding" },
  );

  const healthyEvidence = healthy.evidenceV1();
  assert.equal(healthyEvidence.consecutive_successful_round_trips, 5);
  assert.equal(healthyEvidence.failed_round_trips_since_promotion, 0);
  assert.equal(
    (healthyEvidence.last_success_at_ms ?? 0) -
      (healthyEvidence.first_success_at_ms ?? 0),
    VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_MIN_WINDOW_MS_V1,
  );

  const policyDecision = evaluateVoidUdpSwarmDirectRouteHealthPolicyV1({
    ...healthyEvidence,
    authenticated_peer_node_id: PEER,
    direct_route_live: true,
    direct_route_transport: "direct",
    relay_fallback_live: true,
    now_ms: healthyEvidence.last_success_at_ms ?? 0,
  });
  assert.equal(policyDecision.action, "authorize_relay_retirement");
  assert.equal(policyDecision.relay_retirement_authorized, true);

  const wrongPeer = observer(LOCAL, PEER, ["6".repeat(32)]);
  const wrongPeerProbe = mustIssue(wrongPeer, PROMOTED_AT);
  const wrongPeerAck = mustAck(reciprocal, LOCAL, wrongPeerProbe.message);
  assert.deepEqual(
    wrongPeer.ingestAuthenticatedAckV1(
      OTHER,
      wrongPeerAck.message,
      PROMOTED_AT + 1,
    ),
    { ok: false, error: "authenticated_peer_mismatch" },
  );
  assert.equal(wrongPeer.evidenceV1().consecutive_successful_round_trips, 0);

  const wrongSessionAck = {
    ...wrongPeerAck.message,
    session_id: "detached-session",
  };
  assert.deepEqual(
    wrongPeer.ingestAuthenticatedAckV1(
      PEER,
      wrongSessionAck,
      PROMOTED_AT + 2,
    ),
    { ok: false, error: "ack_binding_mismatch" },
  );
  assert.equal(wrongPeer.snapshotV1().outstanding_probe?.probe_id, "6".repeat(32));

  const exactDeadline = observer(LOCAL, PEER, ["7".repeat(32)]);
  const exactDeadlineProbe = mustIssue(exactDeadline, PROMOTED_AT);
  const exactDeadlineAck = mustAck(reciprocal, LOCAL, exactDeadlineProbe.message);
  assert.equal(
    exactDeadline.ingestAuthenticatedAckV1(
      PEER,
      exactDeadlineAck.message,
      PROMOTED_AT + VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE_TIMEOUT_MS_V1,
    ).ok,
    true,
  );
  assert.equal(exactDeadline.evidenceV1().failed_round_trips_since_promotion, 0);

  const timeout = observer(LOCAL, PEER, ["8".repeat(32)]);
  const timeoutProbe = mustIssue(timeout, PROMOTED_AT);
  const timeoutAck = mustAck(reciprocal, LOCAL, timeoutProbe.message);
  assert.deepEqual(
    timeout.advanceV1(
      PROMOTED_AT +
        VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE_TIMEOUT_MS_V1 +
        1,
    ),
    { timed_out: true, probe_id: "8".repeat(32) },
  );
  assert.equal(timeout.evidenceV1().failed_round_trips_since_promotion, 1);
  assert.equal(timeout.evidenceV1().consecutive_successful_round_trips, 0);
  assert.deepEqual(
    timeout.ingestAuthenticatedAckV1(
      PEER,
      timeoutAck.message,
      PROMOTED_AT +
        VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE_TIMEOUT_MS_V1 +
        2,
    ),
    { ok: false, error: "probe_not_outstanding" },
  );

  const mismatchedProbeId = observer(LOCAL, PEER, ["9".repeat(32)]);
  const matchingProbe = mustIssue(mismatchedProbeId, PROMOTED_AT);
  const matchingAck = mustAck(reciprocal, LOCAL, matchingProbe.message);
  assert.deepEqual(
    mismatchedProbeId.ingestAuthenticatedAckV1(
      PEER,
      { ...matchingAck.message, probe_id: "a".repeat(32) },
      PROMOTED_AT + 1,
    ),
    { ok: false, error: "probe_id_mismatch" },
  );
  assert.equal(mismatchedProbeId.evidenceV1().consecutive_successful_round_trips, 0);

  const reusedId = observer(
    LOCAL,
    PEER,
    ["b".repeat(32), "b".repeat(32)],
  );
  const reusedFirst = mustIssue(reusedId, PROMOTED_AT);
  const reusedAck = mustAck(reciprocal, LOCAL, reusedFirst.message);
  assert.equal(
    reusedId.ingestAuthenticatedAckV1(PEER, reusedAck.message, PROMOTED_AT + 1).ok,
    true,
  );
  assert.deepEqual(
    reusedId.issueProbeV1(
      PROMOTED_AT + VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE_INTERVAL_MS_V1,
    ),
    { ok: false, error: "probe_id_reused" },
  );

  const invalidId = observer(LOCAL, PEER, ["not-a-probe-id"]);
  assert.deepEqual(invalidId.issueProbeV1(PROMOTED_AT), {
    ok: false,
    error: "probe_id_invalid",
  });

  const snapshot = healthy.snapshotV1();
  assert.equal(snapshot.network_transmission_performed, false);
  assert.equal(snapshot.relay_retirement_authorized, false);
  assert.equal(snapshot.relay_retirement_performed, false);

  console.log(`probe_interval_ms=${VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE_INTERVAL_MS_V1}`);
  console.log(`probe_timeout_ms=${VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_PROBE_TIMEOUT_MS_V1}`);
  console.log("authenticated_peer_binding_required=true");
  console.log("session_and_probe_id_binding_required=true");
  console.log("remote_timestamps_trusted=false");
  console.log("duplicate_or_detached_ack_health_credit=false");
  console.log("timeout_records_failure=true");
  console.log("health_evidence_composes_with_direct_route_policy=true");
  console.log("network_transmission_performed=false");
  console.log("relay_retirement_authorized=false");
  console.log("relay_retirement_performed=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
  console.log("VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_OBSERVATION_V1_PROOF_GREEN");
}

main();
