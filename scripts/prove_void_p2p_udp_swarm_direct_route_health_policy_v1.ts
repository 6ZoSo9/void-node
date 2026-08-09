import assert from "node:assert/strict";

import {
  VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_MAX_LAST_SUCCESS_AGE_MS_V1,
  VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_MIN_CONSECUTIVE_ROUND_TRIPS_V1,
  VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_MIN_WINDOW_MS_V1,
  evaluateVoidUdpSwarmDirectRouteHealthPolicyV1,
  type VoidUdpSwarmDirectRouteHealthPolicyInputV1,
} from "../src/p2p/udp_swarm_direct_route_health_policy_v1.js";

const PEER = "1".repeat(32);
const RELAY = "2".repeat(32);
const PROMOTED_AT = 1_000_000;
const NOW = PROMOTED_AT + VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_MIN_WINDOW_MS_V1;

function healthyInput(
  overrides: Partial<VoidUdpSwarmDirectRouteHealthPolicyInputV1> = {},
): VoidUdpSwarmDirectRouteHealthPolicyInputV1 {
  return {
    session_id: "session-direct-health-v1",
    expected_peer_node_id: PEER,
    authenticated_peer_node_id: PEER,
    relay_node_id: RELAY,
    relay_stream_id: "relay-stream-direct-health-v1",
    direct_route_live: true,
    direct_route_transport: "direct",
    relay_fallback_live: true,
    promoted_at_ms: PROMOTED_AT,
    now_ms: NOW,
    consecutive_successful_round_trips:
      VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_MIN_CONSECUTIVE_ROUND_TRIPS_V1,
    failed_round_trips_since_promotion: 0,
    last_success_at_ms: NOW,
    ...overrides,
  };
}

function expectRetain(
  overrides: Partial<VoidUdpSwarmDirectRouteHealthPolicyInputV1>,
  reason: ReturnType<typeof evaluateVoidUdpSwarmDirectRouteHealthPolicyV1>["reason"],
): void {
  const result = evaluateVoidUdpSwarmDirectRouteHealthPolicyV1(
    healthyInput(overrides),
  );
  assert.equal(result.action, "retain_relay");
  assert.equal(result.reason, reason);
  assert.equal(result.relay_retirement_authorized, false);
  assert.equal(result.relay_retirement_performed, false);
  assert.equal(result.normal_peer_map_mutation_performed, false);
  assert.equal(result.direct_route_mutation_performed, false);
  assert.equal(result.relay_socket_mutation_performed, false);
}

function main(): void {
  expectRetain({ session_id: "bad session" }, "binding_invalid");
  expectRetain(
    { authenticated_peer_node_id: null },
    "authenticated_identity_missing_or_invalid",
  );
  expectRetain(
    { authenticated_peer_node_id: "3".repeat(32) },
    "authenticated_identity_mismatch",
  );
  expectRetain(
    { direct_route_live: false },
    "promoted_direct_route_not_live",
  );
  expectRetain(
    { direct_route_transport: "relay" },
    "promoted_route_not_direct",
  );
  expectRetain({ relay_fallback_live: false }, "relay_fallback_not_live");
  expectRetain({ now_ms: PROMOTED_AT - 1 }, "clock_invalid");
  expectRetain(
    {
      now_ms:
        PROMOTED_AT +
        VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_MIN_WINDOW_MS_V1 -
        1,
      last_success_at_ms:
        PROMOTED_AT +
        VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_MIN_WINDOW_MS_V1 -
        1,
    },
    "health_window_too_short",
  );
  expectRetain(
    { failed_round_trips_since_promotion: 1 },
    "failed_round_trip_observed",
  );
  expectRetain(
    {
      consecutive_successful_round_trips:
        VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_MIN_CONSECUTIVE_ROUND_TRIPS_V1 -
        1,
    },
    "insufficient_consecutive_successes",
  );
  expectRetain(
    { last_success_at_ms: null },
    "last_success_missing_or_invalid",
  );
  expectRetain(
    {
      now_ms:
        NOW + VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_MAX_LAST_SUCCESS_AGE_MS_V1,
      last_success_at_ms: NOW - 1,
    },
    "last_success_stale",
  );

  const authorized = evaluateVoidUdpSwarmDirectRouteHealthPolicyV1(
    healthyInput(),
  );
  assert.deepEqual(authorized, {
    version: 1,
    action: "authorize_relay_retirement",
    reason: "relay_retirement_may_be_authorized",
    relay_retirement_authorized: true,
    relay_retirement_performed: false,
    normal_peer_map_mutation_performed: false,
    direct_route_mutation_performed: false,
    relay_socket_mutation_performed: false,
  });

  const exactFreshnessBoundary = evaluateVoidUdpSwarmDirectRouteHealthPolicyV1(
    healthyInput({
      now_ms:
        NOW + VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_MAX_LAST_SUCCESS_AGE_MS_V1,
      last_success_at_ms: NOW,
    }),
  );
  assert.equal(exactFreshnessBoundary.action, "authorize_relay_retirement");

  console.log(`minimum_health_window_ms=${VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_MIN_WINDOW_MS_V1}`);
  console.log(`minimum_consecutive_round_trips=${VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_MIN_CONSECUTIVE_ROUND_TRIPS_V1}`);
  console.log(`maximum_last_success_age_ms=${VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_MAX_LAST_SUCCESS_AGE_MS_V1}`);
  console.log("exact_identity_required=true");
  console.log("live_promoted_direct_route_required=true");
  console.log("live_relay_fallback_required_before_authorization=true");
  console.log("zero_failed_round_trips_required=true");
  console.log("relay_retirement_authorization_may_be_returned=true");
  console.log("relay_retirement_performed=false");
  console.log("normal_peer_map_mutation_performed=false");
  console.log("relay_socket_mutation_performed=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
  console.log("VOID_P2P_UDP_SWARM_DIRECT_ROUTE_HEALTH_POLICY_V1_PROOF_GREEN");
}

main();
