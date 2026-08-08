#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  classifyReachability,
  createReachabilityObservation,
  validateReachabilityRecord,
} from "./lib/void_p2p_reachability_classification_contract_v1.mjs";
import {
  buildVoidP2PTransportFailoverPlanV1,
  nextVoidP2PTransportCandidateV1,
  validateVoidP2PTransportFailoverPlanV1,
} from "./lib/void_p2p_transport_ranked_failover_v1.mjs";

const MARKER = "VOID_P2P_TRANSPORT_RANKED_FAILOVER_V1_PROOF_GREEN";
const NOW = Date.parse("2026-08-07T13:00:00.000Z");
const RELAY_EXPIRES_AT_MS = NOW + 2 * 60 * 1000;

const SUBJECT = "a".repeat(32);
const OBSERVER_A = "b".repeat(32);
const OBSERVER_B = "c".repeat(32);
const OBSERVER_C = "d".repeat(32);

function observation({
  observer,
  domain,
  address,
  kind = "authenticated_dialback",
  outcome = "success",
  latency = 15,
}) {
  return createReachabilityObservation({
    subjectNodeId: SUBJECT,
    observerNodeId: observer,
    observerFailureDomain: domain,
    observedAt: new Date(NOW - 30_000).toISOString(),
    kind,
    candidateAddress: address,
    outcome,
    authenticatedSubjectId: outcome === "success" ? SUBJECT : null,
    latencyMs: outcome === "success" ? latency : null,
  });
}

function classify(entries) {
  return classifyReachability(entries, {
    nowMs: NOW,
    maxAgeMs: 15 * 60 * 1000,
    recordValidityMs: 10 * 60 * 1000,
  });
}

const ipv6Confirmed = classify([
  observation({
    observer: OBSERVER_A,
    domain: "observer-a",
    address: "[2606:4700:4700::1111]:4700",
    latency: 10,
  }),
  observation({
    observer: OBSERVER_B,
    domain: "observer-b",
    address: "[2606:4700:4700::1111]:4700",
    latency: 12,
  }),
]);
assert.equal(ipv6Confirmed.classification, "direct_confirmed");

const ipv4Confirmed = classify([
  observation({
    observer: OBSERVER_A,
    domain: "observer-a",
    address: "8.8.8.8:4700",
    latency: 14,
  }),
  observation({
    observer: OBSERVER_C,
    domain: "observer-c",
    address: "8.8.8.8:4700",
    latency: 18,
  }),
]);
assert.equal(ipv4Confirmed.classification, "direct_confirmed");

const ipv6Unconfirmed = classify([
  observation({
    observer: OBSERVER_A,
    domain: "observer-a",
    address: "[2606:4700:4700::1001]:4700",
  }),
]);
assert.equal(ipv6Unconfirmed.classification, "direct_observed_unconfirmed");

const ipv4Unconfirmed = classify([
  observation({
    observer: OBSERVER_A,
    domain: "observer-a",
    address: "1.1.1.1:4700",
  }),
]);
assert.equal(ipv4Unconfirmed.classification, "direct_observed_unconfirmed");

const outboundOnly = classify([
  observation({
    observer: OBSERVER_A,
    domain: "observer-a",
    address: "9.9.9.9:4700",
    kind: "authenticated_outbound_seen",
    outcome: "success",
  }),
]);
assert.equal(outboundOnly.classification, "outbound_observed");

const unknown = classify([
  observation({
    observer: OBSERVER_A,
    domain: "observer-a",
    address: "208.67.222.222:4700",
    kind: "authenticated_dialback",
    outcome: "failure",
  }),
]);
assert.equal(unknown.classification, "unknown");
assert.equal(unknown.invariants.nat_type_inferred, false);
assert.equal(unknown.invariants.relay_required_inferred, false);

const relayA = {
  subject_node_id: SUBJECT,
  relay_node_id: "e".repeat(32),
  relay_peer_state: "authenticated_direct_peer_v1",
  failure_domain: "relay-a",
  reservation_id: "1".repeat(32),
  reservation_expires_at_ms: RELAY_EXPIRES_AT_MS,
};
const relayB = {
  subject_node_id: SUBJECT,
  relay_node_id: "f".repeat(32),
  relay_peer_state: "authenticated_direct_peer_v1",
  failure_domain: "relay-b",
  reservation_id: "2".repeat(32),
  reservation_expires_at_ms: RELAY_EXPIRES_AT_MS,
};
const unauthenticatedRelay = {
  subject_node_id: SUBJECT,
  relay_node_id: "0".repeat(32),
  relay_peer_state: "unverified_peer",
  failure_domain: "relay-unverified",
  reservation_id: "3".repeat(32),
  reservation_expires_at_ms: RELAY_EXPIRES_AT_MS,
};

const plan = buildVoidP2PTransportFailoverPlanV1({
  subjectNodeId: SUBJECT,
  reachabilityRecords: [
    ipv4Unconfirmed,
    outboundOnly,
    ipv6Confirmed,
    unknown,
    ipv6Unconfirmed,
    ipv4Confirmed,
  ],
  relayReservations: [relayB, relayA],
  nowMs: NOW,
  validityMs: 5 * 60 * 1000,
});

assert.deepEqual(
  plan.candidates.map((candidate) => [
    candidate.transport,
    candidate.rank,
    candidate.transport === "direct_tcp_v1"
      ? candidate.address
      : candidate.failure_domain,
  ]),
  [
    ["direct_tcp_v1", 10, "[2606:4700:4700::1111]:4700"],
    ["direct_tcp_v1", 11, "8.8.8.8:4700"],
    ["direct_tcp_v1", 20, "[2606:4700:4700::1001]:4700"],
    ["direct_tcp_v1", 21, "1.1.1.1:4700"],
    ["relay_v1", 100, "relay-a"],
    ["relay_v1", 100, "relay-b"],
  ],
);

assert.equal(
  plan.candidates.some(
    (candidate) =>
      candidate.transport === "direct_tcp_v1" &&
      candidate.address === "9.9.9.9:4700",
  ),
  false,
);
assert.equal(
  plan.candidates.some(
    (candidate) =>
      candidate.transport === "direct_tcp_v1" &&
      candidate.address === "208.67.222.222:4700",
  ),
  false,
);

assert.throws(
  () =>
    buildVoidP2PTransportFailoverPlanV1({
      subjectNodeId: SUBJECT,
      reachabilityRecords: [ipv6Confirmed],
      relayReservations: [unauthenticatedRelay],
      nowMs: NOW,
    }),
  /authenticated direct relay peer/,
);
assert.throws(
  () =>
    buildVoidP2PTransportFailoverPlanV1({
      subjectNodeId: SUBJECT,
      reachabilityRecords: [ipv6Confirmed],
      relayReservations: [
        {
          ...relayA,
          reservation_expires_at_ms: NOW,
        },
      ],
      nowMs: NOW,
    }),
  /reservation must be active/,
);

assert.equal(plan.invariants.direct_transport_preferred, true);
assert.equal(
  plan.invariants.relay_transport_can_define_endpoint_identity,
  false,
);
assert.equal(
  plan.invariants.relay_success_promotes_direct_reachability,
  false,
);
assert.equal(
  plan.invariants.failed_candidate_changes_reachability_record,
  false,
);
assert.equal(plan.invariants.failed_candidate_infers_nat_type, false);
assert.equal(plan.invariants.failed_candidate_infers_relay_required, false);

const verifiedPlan = validateVoidP2PTransportFailoverPlanV1(plan, {
  nowMs: NOW,
});
assert.equal(verifiedPlan.plan_id, plan.plan_id);

const reorderedPlan = buildVoidP2PTransportFailoverPlanV1({
  subjectNodeId: SUBJECT,
  reachabilityRecords: [
    ipv6Unconfirmed,
    ipv4Confirmed,
    unknown,
    ipv6Confirmed,
    outboundOnly,
    ipv4Unconfirmed,
  ],
  relayReservations: [relayA, relayB],
  nowMs: NOW,
  validityMs: 5 * 60 * 1000,
});
assert.equal(reorderedPlan.plan_id, plan.plan_id);

const failed = [];
for (const expected of plan.candidates) {
  const next = nextVoidP2PTransportCandidateV1(plan, failed, {
    nowMs: NOW,
  });
  assert(next);
  assert.equal(next.candidate_id, expected.candidate_id);
  failed.push(next.candidate_id);
}
assert.equal(
  nextVoidP2PTransportCandidateV1(plan, failed, { nowMs: NOW }),
  null,
);

for (let removed = 0; removed < plan.candidates.length; removed += 1) {
  const failedOne = [plan.candidates[removed].candidate_id];
  const next = nextVoidP2PTransportCandidateV1(plan, failedOne, {
    nowMs: NOW,
  });
  if (plan.candidates.length > 1) assert(next);
}

const failedDirect = plan.candidates
  .filter((candidate) => candidate.transport === "direct_tcp_v1")
  .map((candidate) => candidate.candidate_id);
assert.equal(
  nextVoidP2PTransportCandidateV1(plan, failedDirect, {
    nowMs: RELAY_EXPIRES_AT_MS + 1,
  }),
  null,
);

const originalUnknown = structuredClone(unknown);
void nextVoidP2PTransportCandidateV1(
  plan,
  [plan.candidates[0].candidate_id],
  { nowMs: NOW },
);
assert.deepEqual(unknown, originalUnknown);
assert.equal(
  validateReachabilityRecord(unknown, { nowMs: NOW }).record_id,
  unknown.record_id,
);

const tamperedReachability = structuredClone(ipv6Confirmed);
tamperedReachability.classification = "unknown";
assert.throws(
  () =>
    buildVoidP2PTransportFailoverPlanV1({
      subjectNodeId: SUBJECT,
      reachabilityRecords: [tamperedReachability],
      relayReservations: [relayA],
      nowMs: NOW,
    }),
  /classification does not match|ID does not match/,
);

assert.throws(
  () =>
    buildVoidP2PTransportFailoverPlanV1({
      subjectNodeId: SUBJECT,
      reachabilityRecords: [ipv6Confirmed, ipv6Confirmed],
      relayReservations: [relayA],
      nowMs: NOW,
    }),
  /duplicate/,
);

assert.throws(
  () =>
    buildVoidP2PTransportFailoverPlanV1({
      subjectNodeId: SUBJECT,
      reachabilityRecords: [outboundOnly, unknown],
      relayReservations: [],
      nowMs: NOW,
    }),
  /no eligible candidates/,
);

assert.throws(
  () =>
    buildVoidP2PTransportFailoverPlanV1({
      subjectNodeId: SUBJECT,
      reachabilityRecords: [ipv6Confirmed],
      relayReservations: [
        {
          ...relayA,
          subject_node_id: "9".repeat(32),
        },
      ],
      nowMs: NOW,
    }),
  /subject does not match/,
);

assert.throws(
  () =>
    buildVoidP2PTransportFailoverPlanV1({
      subjectNodeId: SUBJECT,
      reachabilityRecords: [ipv6Confirmed],
      relayReservations: [
        relayA,
        {
          ...relayB,
          failure_domain: relayA.failure_domain,
        },
      ],
      nowMs: NOW,
    }),
  /relay failure domains must be distinct/,
);

const relayCandidate = plan.candidates.find(
  (candidate) => candidate.transport === "relay_v1",
);
assert(relayCandidate);
assert.equal(relayCandidate.subject_node_id, SUBJECT);
assert.notEqual(relayCandidate.relay_node_id, SUBJECT);
assert.equal(relayCandidate.direct_identity_evidence, false);
assert.equal(
  relayCandidate.relay_peer_state,
  "authenticated_direct_peer_v1",
);
assert.equal(relayCandidate.reservation_expires_at_ms, RELAY_EXPIRES_AT_MS);

console.log(MARKER);
console.log("direct_confirmed_ipv6_rank=10");
console.log("direct_confirmed_ipv4_rank=11");
console.log("direct_unconfirmed_ipv6_rank=20");
console.log("direct_unconfirmed_ipv4_rank=21");
console.log("relay_active_rank=100");
console.log("outbound_observed_direct_dial_eligible=false");
console.log("unknown_direct_dial_eligible=false");
console.log("unauthenticated_relay_eligible=false");
console.log("relay_reservation_live_required=true");
console.log("expired_relay_candidate_selected=false");
console.log("relay_failure_domains_distinct=true");
console.log("direct_transport_preferred=true");
console.log("relay_transport_can_define_endpoint_identity=false");
console.log("relay_success_promotes_direct_reachability=false");
console.log("failed_candidate_changes_reachability_record=false");
console.log("failed_candidate_infers_nat_type=false");
console.log("failed_candidate_infers_relay_required=false");
console.log("candidate_input_order_changes_plan=false");
console.log("candidate_failure_advances_plan=true");
console.log("n_minus_one_each_candidate=true");
console.log("all_candidates_failed_returns_null=true");
console.log("runtime_integration_performed=false");
console.log("network_calls_performed=false");
console.log("wallet_signer_validator_wc_money_authority=0");
