#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  classifyReachability,
  contentId,
  createReachabilityObservation,
  parseCanonicalIpPeerAddress,
  validateReachabilityObservation,
  validateReachabilityRecord,
} from "./lib/void_p2p_reachability_classification_contract_v1.mjs";

const NOW = Date.parse("2026-08-07T05:00:00.000Z");
const SUBJECT = "a".repeat(64);
const OBSERVER_A = "b".repeat(64);
const OBSERVER_B = "c".repeat(64);
const OBSERVER_C = "d".repeat(64);
const V4 = "1.1.1.1:4700";
const V6 = "[2606:4700:4700::1111]:4700";
const PRIVATE = "10.0.0.5:4700";

function obs({ observer = OBSERVER_A, domain = "isp-a", at = NOW - 60_000, kind = "authenticated_dialback", address = V4, outcome = "success", authenticated = SUBJECT, latency = 12 } = {}) {
  return createReachabilityObservation({
    subjectNodeId: SUBJECT,
    observerNodeId: observer,
    observerFailureDomain: domain,
    observedAt: new Date(at).toISOString(),
    kind,
    candidateAddress: address,
    outcome,
    authenticatedSubjectId: outcome === "success" ? authenticated : null,
    latencyMs: outcome === "success" ? latency : null,
  });
}

function mustThrow(fn, pattern) {
  assert.throws(fn, pattern);
}

parseCanonicalIpPeerAddress(V4);
parseCanonicalIpPeerAddress(V6);
mustThrow(() => parseCanonicalIpPeerAddress("2606:4700:4700::1111:4700"), /brackets/);
mustThrow(() => parseCanonicalIpPeerAddress("[fe80::1%eth0]:4700"), /zone identifiers/);
mustThrow(() => parseCanonicalIpPeerAddress("1.1.1.1:0"), /invalid|range/);

const direct = classifyReachability([
  obs({ observer: OBSERVER_A, domain: "isp-a" }),
  obs({ observer: OBSERVER_B, domain: "isp-b", at: NOW - 45_000 }),
  obs({ observer: OBSERVER_C, domain: "isp-c", kind: "authenticated_outbound_seen", at: NOW - 30_000 }),
], { nowMs: NOW });
assert.equal(direct.classification, "direct_confirmed");
assert.equal(direct.counts.independent_success_domains, 2);
assert.equal(direct.counts.independent_success_observers, 2);
assert.equal(direct.invariants.nat_type_inferred, false);
validateReachabilityRecord(direct, { nowMs: NOW });

const oneObserver = classifyReachability([
  obs({ observer: OBSERVER_A, domain: "isp-a" }),
], { nowMs: NOW });
assert.equal(oneObserver.classification, "direct_observed_unconfirmed");

const sameDomain = classifyReachability([
  obs({ observer: OBSERVER_A, domain: "isp-shared" }),
  obs({ observer: OBSERVER_B, domain: "isp-shared", at: NOW - 40_000 }),
], { nowMs: NOW });
assert.equal(sameDomain.classification, "direct_observed_unconfirmed");

const sameObserverDifferentDomains = classifyReachability([
  obs({ observer: OBSERVER_A, domain: "isp-a" }),
  obs({ observer: OBSERVER_A, domain: "isp-b", at: NOW - 40_000 }),
], { nowMs: NOW });
assert.equal(sameObserverDifferentDomains.classification, "direct_observed_unconfirmed");

const outboundOnly = classifyReachability([
  obs({ observer: OBSERVER_A, domain: "isp-a", kind: "authenticated_outbound_seen" }),
  obs({ observer: OBSERVER_B, domain: "isp-b", kind: "authenticated_dialback", outcome: "failure", at: NOW - 40_000 }),
  obs({ observer: OBSERVER_C, domain: "isp-c", kind: "authenticated_dialback", outcome: "failure", at: NOW - 30_000 }),
], { nowMs: NOW });
assert.equal(outboundOnly.classification, "outbound_observed");
assert.equal(outboundOnly.invariants.nat_type_inferred, false);
assert.equal(outboundOnly.invariants.relay_required_inferred, false);
assert.equal(outboundOnly.invariants.single_failed_dialback_proves_unreachable, false);

const onlyFailures = classifyReachability([
  obs({ observer: OBSERVER_A, domain: "isp-a", outcome: "failure" }),
  obs({ observer: OBSERVER_B, domain: "isp-b", outcome: "failure", at: NOW - 30_000 }),
], { nowMs: NOW });
assert.equal(onlyFailures.classification, "unknown");

const privateAddress = classifyReachability([
  obs({ observer: OBSERVER_A, domain: "isp-a", address: PRIVATE }),
  obs({ observer: OBSERVER_B, domain: "isp-b", address: PRIVATE, at: NOW - 30_000 }),
], { nowMs: NOW });
assert.equal(privateAddress.classification, "non_public_address");

const stale = classifyReachability([
  obs({ observer: OBSERVER_A, domain: "isp-a", at: NOW - 20 * 60_000 }),
], { nowMs: NOW, maxAgeMs: 15 * 60_000 });
assert.equal(stale.classification, "unknown");
assert.equal(stale.counts.fresh_observations, 0);

const identityMismatchBody = {
  ...obs({ observer: OBSERVER_A, domain: "isp-a" }),
  authenticated_subject_id: "f".repeat(64),
};
identityMismatchBody.observation_id = contentId("voidpro1_", identityMismatchBody, "observation_id");
mustThrow(() => validateReachabilityObservation(identityMismatchBody, { nowMs: NOW }), /exact subject node ID/);

const future = obs({ observer: OBSERVER_A, domain: "isp-a", at: NOW + 10 * 60_000 });
mustThrow(() => validateReachabilityObservation(future, { nowMs: NOW }), /future/);

const tampered = structuredClone(obs({ observer: OBSERVER_A, domain: "isp-a" }));
tampered.observer_failure_domain = "isp-z";
mustThrow(() => validateReachabilityObservation(tampered, { nowMs: NOW }), /ID does not match/);

const unknownField = structuredClone(obs({ observer: OBSERVER_A, domain: "isp-a" }));
unknownField.extra = false;
unknownField.observation_id = contentId("voidpro1_", unknownField, "observation_id");
mustThrow(() => validateReachabilityObservation(unknownField, { nowMs: NOW }), /keys mismatch/);

const duplicate = obs({ observer: OBSERVER_A, domain: "isp-a" });
mustThrow(() => classifyReachability([duplicate, duplicate], { nowMs: NOW }), /duplicate observation ID/);

const recordTamper = structuredClone(direct);
recordTamper.classification = "unknown";
mustThrow(() => validateReachabilityRecord(recordTamper, { nowMs: NOW }), /classification does not match|ID does not match/);

const resealedSemanticLie = structuredClone(direct);
resealedSemanticLie.classification = "unknown";
resealedSemanticLie.record_id = contentId("voidprc1_", resealedSemanticLie, "record_id");
mustThrow(() => validateReachabilityRecord(resealedSemanticLie, { nowMs: NOW }), /classification does not match/);

const nonCanonicalV6 = `[2606:4700:4700:0:0:0:0:1111]:4700`;
mustThrow(() => parseCanonicalIpPeerAddress(nonCanonicalV6), /not canonical/);

console.log("VOID_P2P_REACHABILITY_CLASSIFICATION_CONTRACT_V1_PROOF_GREEN");
console.log("independent_authenticated_dialback_required=true");
console.log("single_observer_direct_confirmed=false");
console.log("same_failure_domain_direct_confirmed=false");
console.log("same_observer_multiple_domains_direct_confirmed=false");
console.log("failed_dialback_nat_type_inferred=false");
console.log("failed_dialback_relay_requirement_inferred=false");
console.log("outbound_only_classified_without_unreachable_claim=true");
console.log("non_public_direct_confirmed=false");
console.log("identity_mismatched_dialback_accepted=false");
console.log("resealed_semantic_lie_accepted=false");
console.log("noncanonical_ipv6_accepted=false");
console.log("stale_observation_counted=false");
console.log("ipv4_literal_contract=true");
console.log("ipv6_literal_contract=true");
console.log("runtime_integration_performed=false");
console.log("network_calls_performed=false");
console.log("wallet_signer_validator_wc_money_authority=0");
