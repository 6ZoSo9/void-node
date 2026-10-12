// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";

import {
  VOID_P2P_DIRECT_UPGRADE_ATTEMPT_TIMEOUT_MAX_MS_V1,
  VOID_P2P_DIRECT_UPGRADE_MAX_ATTEMPTS_PER_CANDIDATE_V1,
  createVoidP2pDirectUpgradeCandidateV1,
  createVoidP2pDirectUpgradeSessionV1,
  evaluateVoidP2pDirectUpgradeAttemptV1,
  planVoidP2pDirectUpgradeAttemptV1,
  validateVoidP2pDirectUpgradeCandidateV1,
  voidP2pDirectUpgradeCandidateUsableV1,
  voidP2pDirectUpgradeRetryDecisionV1,
} from "./lib/void_p2p_direct_upgrade_contract_v1.mjs";

const MARKER = "VOID_P2P_DIRECT_UPGRADE_CONTRACT_V1_PROOF_GREEN";

const LOCAL = "11".repeat(16);
const REMOTE = "22".repeat(16);
const RELAY_A = "33".repeat(16);
const RELAY_B = "44".repeat(16);
const RELAY_CONN_LOCAL_A = "55".repeat(16);
const RELAY_CONN_REMOTE_A = "66".repeat(16);
const RELAY_CONN_LOCAL_B = "77".repeat(16);
const RELAY_CONN_REMOTE_B = "88".repeat(16);

const NOW = 1_800_000_000_000;

function expectReject(run, pattern, label) {
  let error = null;
  try {
    run();
  } catch (caught) {
    error = caught;
  }
  assert(error, `${label}: expected rejection`);
  assert.match(
    error instanceof Error ? error.message : String(error),
    pattern,
    `${label}: unexpected rejection`,
  );
}

const localA = createVoidP2pDirectUpgradeCandidateV1({
  subjectNodeId: LOCAL,
  observerNodeId: RELAY_A,
  relayConnectionId: RELAY_CONN_LOCAL_A,
  relayLocalPort: 35161,
  observedAddress: "8.8.8.8:41001",
  observedAtMs: NOW,
  ttlMs: 20_000,
});

const remoteA = createVoidP2pDirectUpgradeCandidateV1({
  subjectNodeId: REMOTE,
  observerNodeId: RELAY_A,
  relayConnectionId: RELAY_CONN_REMOTE_A,
  relayLocalPort: 36857,
  observedAddress: "1.1.1.1:42002",
  observedAtMs: NOW,
  ttlMs: 20_000,
});

const localB = createVoidP2pDirectUpgradeCandidateV1({
  subjectNodeId: LOCAL,
  observerNodeId: RELAY_B,
  relayConnectionId: RELAY_CONN_LOCAL_B,
  relayLocalPort: 45161,
  observedAddress: "9.9.9.9:43003",
  observedAtMs: NOW,
  ttlMs: 20_000,
});

const remoteB = createVoidP2pDirectUpgradeCandidateV1({
  subjectNodeId: REMOTE,
  observerNodeId: RELAY_B,
  relayConnectionId: RELAY_CONN_REMOTE_B,
  relayLocalPort: 46857,
  observedAddress: "[2606:4700:4700::1111]:44004",
  observedAtMs: NOW,
  ttlMs: 20_000,
});

assert.equal(
  validateVoidP2pDirectUpgradeCandidateV1(localA, {
    nowMs: NOW + 1,
    expectedSubjectNodeId: LOCAL,
    authenticatedObserverNodeId: RELAY_A,
    expectedRelayConnectionId: RELAY_CONN_LOCAL_A,
    activeRelayLocalPort: 35161,
    relayConnectionActive: true,
  }).candidate_id,
  localA.candidate_id,
);

assert.equal(
  voidP2pDirectUpgradeCandidateUsableV1(localA, {
    nowMs: NOW + 1,
    expectedSubjectNodeId: LOCAL,
    authenticatedObserverNodeId: RELAY_A,
    expectedRelayConnectionId: RELAY_CONN_LOCAL_A,
    activeRelayLocalPort: 35161,
    relayConnectionActive: true,
  }),
  true,
);

assert.equal(
  voidP2pDirectUpgradeCandidateUsableV1(localA, {
    nowMs: NOW + 1,
    authenticatedObserverNodeId: RELAY_A,
    activeRelayLocalPort: 35162,
    relayConnectionActive: true,
  }),
  false,
);

assert.equal(
  voidP2pDirectUpgradeCandidateUsableV1(localA, {
    nowMs: NOW + 1,
    authenticatedObserverNodeId: RELAY_A,
    activeRelayLocalPort: 35161,
    relayConnectionActive: false,
  }),
  false,
);

expectReject(
  () => createVoidP2pDirectUpgradeCandidateV1({
    subjectNodeId: LOCAL,
    observerNodeId: RELAY_A,
    relayConnectionId: RELAY_CONN_LOCAL_A,
    relayLocalPort: 35161,
    observedAddress: "127.0.0.1:41001",
    observedAtMs: NOW,
  }),
  /public IP/,
  "loopback candidate",
);

expectReject(
  () => createVoidP2pDirectUpgradeCandidateV1({
    subjectNodeId: LOCAL,
    observerNodeId: RELAY_A,
    relayConnectionId: RELAY_CONN_LOCAL_A,
    relayLocalPort: 35161,
    observedAddress: "192.168.1.10:41001",
    observedAtMs: NOW,
  }),
  /public IP/,
  "private candidate",
);

expectReject(
  () => createVoidP2pDirectUpgradeCandidateV1({
    subjectNodeId: LOCAL,
    observerNodeId: RELAY_A,
    relayConnectionId: RELAY_CONN_LOCAL_A,
    relayLocalPort: 35161,
    observedAddress: "example.com:41001",
    observedAtMs: NOW,
  }),
  /candidate|host|address/i,
  "DNS candidate",
);

expectReject(
  () => validateVoidP2pDirectUpgradeCandidateV1(localA, {
    nowMs: NOW + 20_001,
    authenticatedObserverNodeId: RELAY_A,
    relayConnectionActive: true,
  }),
  /stale/,
  "stale candidate",
);

expectReject(
  () => validateVoidP2pDirectUpgradeCandidateV1(localA, {
    nowMs: NOW + 1,
    authenticatedObserverNodeId: RELAY_B,
    relayConnectionActive: true,
  }),
  /observer mismatch/,
  "wrong authenticated observer",
);

const sessionA = createVoidP2pDirectUpgradeSessionV1({
  sessionId: "aa".repeat(16),
  coordinationRelayNodeId: RELAY_A,
  localNodeId: LOCAL,
  remoteNodeId: REMOTE,
  localCandidate: localA,
  remoteCandidate: remoteA,
  startDelayMs: 200,
  attemptTimeoutMs: 3_000,
  createdAtMs: NOW + 10,
});

const planA = planVoidP2pDirectUpgradeAttemptV1({
  session: sessionA,
  localCandidate: localA,
  remoteCandidate: remoteA,
  nowMs: NOW + 11,
});

assert.equal(planA.coordination_relay_node_id, RELAY_A);
assert.equal(planA.local_action.bind_local_port, 35161);
assert.equal(planA.local_action.connect_to, remoteA.observed_address);
assert.equal(planA.local_action.expected_remote_node_id, REMOTE);
assert.equal(planA.local_action.keep_relay_connection_open, true);
assert.equal(planA.local_action.persist_observed_candidate, false);
assert.equal(planA.remote_action.bind_local_port, 36857);
assert.equal(planA.remote_action.connect_to, localA.observed_address);
assert.equal(planA.remote_action.expected_remote_node_id, LOCAL);
assert.equal(planA.remote_action.keep_relay_connection_open, true);
assert.equal(planA.barrier.start_after_ms, 200);

expectReject(
  () => createVoidP2pDirectUpgradeSessionV1({
    sessionId: "bb".repeat(16),
    coordinationRelayNodeId: RELAY_A,
    localNodeId: LOCAL,
    remoteNodeId: REMOTE,
    localCandidate: localA,
    remoteCandidate: remoteB,
    createdAtMs: NOW + 10,
  }),
  /observer mismatch/,
  "cross-relay candidate mixing",
);

const unauthenticated = evaluateVoidP2pDirectUpgradeAttemptV1({
  session: sessionA,
  side: "local",
  directSocketConnected: true,
  authCompleted: false,
  authenticatedRemoteNodeId: undefined,
  elapsedMs: 500,
  relayTransportAlive: true,
});
assert.equal(unauthenticated.promote_direct, false);
assert.equal(unauthenticated.keep_relay_peer_stream, true);

const identityMismatch = evaluateVoidP2pDirectUpgradeAttemptV1({
  session: sessionA,
  side: "local",
  directSocketConnected: true,
  authCompleted: true,
  authenticatedRemoteNodeId: "99".repeat(16),
  elapsedMs: 500,
  relayTransportAlive: true,
});
assert.equal(identityMismatch.promote_direct, false);
assert.equal(identityMismatch.identity_match, false);
assert.equal(identityMismatch.keep_relay_peer_stream, true);

const timedOut = evaluateVoidP2pDirectUpgradeAttemptV1({
  session: sessionA,
  side: "local",
  directSocketConnected: true,
  authCompleted: true,
  authenticatedRemoteNodeId: REMOTE,
  elapsedMs: VOID_P2P_DIRECT_UPGRADE_ATTEMPT_TIMEOUT_MAX_MS_V1 + 1,
  relayTransportAlive: true,
});
assert.equal(timedOut.promote_direct, false);
assert.equal(timedOut.within_attempt_deadline, false);
assert.equal(timedOut.keep_relay_peer_stream, true);

const success = evaluateVoidP2pDirectUpgradeAttemptV1({
  session: sessionA,
  side: "local",
  directSocketConnected: true,
  authCompleted: true,
  authenticatedRemoteNodeId: REMOTE,
  elapsedMs: 750,
  relayTransportAlive: true,
});
assert.equal(success.promote_direct, true);
assert.equal(success.reject_direct, false);
assert.equal(success.close_relay_peer_stream_after_direct_auth, true);
assert.equal(success.keep_relay_peer_stream, false);
assert.equal(success.keep_relay_reservation, true);
assert.equal(success.candidate_persisted_to_verified_direct_cache, false);
assert.equal(success.nat_type_inferred, false);
assert.equal(success.relay_required_inferred, false);
assert.equal(success.unreachable_inferred, false);
assert.equal(success.direct_upgrade_proves_external_nat_traversal, false);

const failed = evaluateVoidP2pDirectUpgradeAttemptV1({
  session: sessionA,
  side: "remote",
  directSocketConnected: false,
  authCompleted: false,
  authenticatedRemoteNodeId: undefined,
  elapsedMs: 3_000,
  relayTransportAlive: true,
});
assert.equal(failed.promote_direct, false);
assert.equal(failed.keep_relay_peer_stream, true);
assert.equal(failed.nat_type_inferred, false);
assert.equal(failed.relay_required_inferred, false);
assert.equal(failed.unreachable_inferred, false);

assert.equal(
  voidP2pDirectUpgradeCandidateUsableV1(localA, {
    nowMs: NOW + 500,
    authenticatedObserverNodeId: RELAY_A,
    activeRelayLocalPort: 35161,
    relayConnectionActive: false,
  }),
  false,
);
assert.equal(
  voidP2pDirectUpgradeCandidateUsableV1(localB, {
    nowMs: NOW + 500,
    authenticatedObserverNodeId: RELAY_B,
    activeRelayLocalPort: 45161,
    relayConnectionActive: true,
  }),
  true,
);
assert.equal(
  voidP2pDirectUpgradeCandidateUsableV1(remoteB, {
    nowMs: NOW + 500,
    authenticatedObserverNodeId: RELAY_B,
    activeRelayLocalPort: 46857,
    relayConnectionActive: true,
  }),
  true,
);

const retryWait = voidP2pDirectUpgradeRetryDecisionV1({
  attemptCount: 1,
  lastAttemptAtMs: NOW,
  nowMs: NOW + 1_000,
  candidateExpiresAtMs: NOW + 20_000,
});
assert.equal(retryWait.retry_allowed, true);
assert.equal(retryWait.retry_now, false);

const retryNow = voidP2pDirectUpgradeRetryDecisionV1({
  attemptCount: 1,
  lastAttemptAtMs: NOW,
  nowMs: NOW + 5_000,
  candidateExpiresAtMs: NOW + 20_000,
});
assert.equal(retryNow.retry_now, true);

const retryExhausted = voidP2pDirectUpgradeRetryDecisionV1({
  attemptCount: VOID_P2P_DIRECT_UPGRADE_MAX_ATTEMPTS_PER_CANDIDATE_V1,
  lastAttemptAtMs: NOW,
  nowMs: NOW + 5_000,
  candidateExpiresAtMs: NOW + 20_000,
});
assert.equal(retryExhausted.retry_allowed, false);

console.log("[PASS] relay-observed public endpoints are transport hints, not identity");
console.log("[PASS] candidate use is bound to the authenticated observer relay and active source port");
console.log("[PASS] same-relay candidate pairs produce bounded coordinated direct-dial plans");
console.log("[PASS] cross-relay candidate mixing fails closed");
console.log("[PASS] direct promotion requires successful expected-node VOID authentication");
console.log("[PASS] failed or mismatched direct attempts preserve the relayed path");
console.log("[PASS] successful direct auth may close the relayed peer stream while keeping reservation fallback");
console.log("[PASS] observed punch candidates never become durable verified-direct cache evidence");
console.log("[PASS] failure does not infer NAT type, relay requirement, or unreachable state");
console.log("[PASS] relay-specific candidates fail independently and retry cadence is bounded");

console.log(MARKER);
console.log("active_relay_source_port_reuse_required=true");
console.log("p2p_listener_port_reuse_required=false");
console.log("kernel_simultaneous_open_assumed=false");
console.log("candidate_transport_hint_only=true");
console.log("candidate_requires_authenticated_relay_observer=true");
console.log("candidate_requires_active_relay_source_port_binding=true");
console.log("cross_relay_candidate_mixing_accepted=false");
console.log("direct_promotion_requires_expected_node_auth=true");
console.log("identity_mismatched_direct_promoted=false");
console.log("unauthenticated_direct_promoted=false");
console.log("failed_upgrade_closes_healthy_relay=false");
console.log("successful_direct_keeps_relay_reservation=true");
console.log("punch_candidate_persisted_to_verified_direct_cache=false");
console.log("failed_upgrade_nat_type_inferred=false");
console.log("failed_upgrade_relay_required_inferred=false");
console.log("failed_upgrade_unreachable_inferred=false");
console.log("external_nat_traversal_claimed=false");
console.log("runtime_integration_performed=false");
console.log("network_calls_performed=false");
console.log("firewall_router_interface_mutation=0");
console.log("wallet_signer_validator_wc_money_authority=0");
