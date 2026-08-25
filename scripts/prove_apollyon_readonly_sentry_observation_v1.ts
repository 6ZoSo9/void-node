import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
  type Chain2050RoleAuthorityTransitionV1,
} from "../src/security/chain2050_role_authority_record_v1.js";
import {
  VOID_CHAIN2050_ROLE_AUTHORITY_READ_ADAPTER_V1_SCHEMA,
  type Chain2050RoleAuthorityReadViewV1,
} from "../src/security/chain2050_role_authority_read_adapter_v1.js";
import {
  VOID_APOLLYON_AUTHORITY_CHECK_V1_SCHEMA,
  VOID_APOLLYON_NODE_HEALTH_EVIDENCE_V1_SCHEMA,
  VOID_APOLLYON_READONLY_SENTRY_OBSERVATION_V1_SCHEMA,
  buildApollyonReadonlySentryObservationV1,
  canonicalApollyonReadonlySentryJsonV1,
  type ApollyonAuthorityCheckV1,
  type ApollyonNodeHealthEvidenceV1,
  type ApollyonReadonlySentryInputV1,
} from "../src/security/apollyon_readonly_sentry_observation_v1.js";

const MARKER = "VOID_APOLLYON_READONLY_SENTRY_OBSERVATION_V1_PROOF_GREEN";

function sha(label: string): string {
  return createHash("sha256").update(label, "utf8").digest("hex");
}

function view(
  identityId: string,
  generation: string,
  status: "active" | "revoked" = "active",
  transition: Chain2050RoleAuthorityTransitionV1 = "genesis_grant",
): Chain2050RoleAuthorityReadViewV1 {
  return {
    schema: VOID_CHAIN2050_ROLE_AUTHORITY_READ_ADAPTER_V1_SCHEMA,
    chain_id: VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
    identity_id: identityId,
    role: identityId.includes("sovereign") ? "SOVEREIGN" : "AGENT",
    authority_status: status,
    role_authority_generation: generation,
    role_record_sha256: sha(`record:${identityId}:${generation}:${status}`),
    subject_binding_sha256: sha(`subject:${identityId}`),
    authority_policy_sha256: sha("policy:v1"),
    predecessor_role_record_sha256: generation === "0" ? null : sha(`previous:${identityId}:${generation}`),
    transition,
  };
}

function checkOk(identityId: string, authorityView: Chain2050RoleAuthorityReadViewV1): ApollyonAuthorityCheckV1 {
  return {
    schema: VOID_APOLLYON_AUTHORITY_CHECK_V1_SCHEMA,
    identity_id: identityId,
    ok: true,
    reason: null,
    view: authorityView,
  };
}

function checkFailed(identityId: string, reason = "role_authority_source_read_failed"): ApollyonAuthorityCheckV1 {
  return {
    schema: VOID_APOLLYON_AUTHORITY_CHECK_V1_SCHEMA,
    identity_id: identityId,
    ok: false,
    reason,
    view: null,
  };
}

function node(overrides: Partial<ApollyonNodeHealthEvidenceV1> = {}): ApollyonNodeHealthEvidenceV1 {
  return {
    schema: VOID_APOLLYON_NODE_HEALTH_EVIDENCE_V1_SCHEMA,
    chain_id: VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
    health_ok: true,
    ready: true,
    gap: 0,
    txroot_live: 1,
    latest_head: "1951058",
    connected_peer_count: 2,
    verified_peer_count: 1,
    health_sha256: sha("health"),
    ready_sha256: sha("ready"),
    head_sha256: sha("head"),
    peers_sha256: sha("peers"),
    ...overrides,
  };
}

function input(
  nodeEvidence: ApollyonNodeHealthEvidenceV1 = node(),
  authorityChecks: ApollyonAuthorityCheckV1[] = [
    checkOk("agent.apollyon", view("agent.apollyon", "0")),
    checkOk("sovereign.zoso", view("sovereign.zoso", "0")),
  ],
): ApollyonReadonlySentryInputV1 {
  return {
    schema: VOID_APOLLYON_READONLY_SENTRY_OBSERVATION_V1_SCHEMA,
    node: nodeEvidence,
    authority_checks: authorityChecks,
  };
}

function mustBuild(value: unknown) {
  const result = buildApollyonReadonlySentryObservationV1(value);
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) throw new Error(result.reason);
  return result.observation;
}

function mustReject(value: unknown, reason = "sentry_input_invalid") {
  const result = buildApollyonReadonlySentryObservationV1(value);
  assert.deepEqual(result, { ok: false, reason });
}

const healthyInput = input();
const healthy = mustBuild(healthyInput);
assert.equal(healthy.sentry_status, "green");
assert.equal(healthy.escalation_required, false);
assert.deepEqual(healthy.findings, []);
assert.match(healthy.observation_sha256, /^[a-f0-9]{64}$/);
assert.equal(healthy.model_execution_authorized, false);
assert.equal(healthy.mutation_authority_granted, false);
assert.equal(healthy.service_restart_authorized, false);
assert.equal(healthy.transaction_authority_granted, false);
assert.equal(Object.isFrozen(healthy), true);
assert.equal(Object.isFrozen(healthy.node), true);
assert.equal(Object.isFrozen(healthy.authority_checks), true);
console.log("[PASS] healthy node plus active authority produces frozen zero-action GREEN observation");

const sameHealthy = mustBuild(structuredClone(healthyInput));
assert.equal(sameHealthy.observation_sha256, healthy.observation_sha256);
assert.equal(
  canonicalApollyonReadonlySentryJsonV1(sameHealthy),
  canonicalApollyonReadonlySentryJsonV1(healthy),
);
console.log("[PASS] observation content addressing is deterministic");

const mutableInput = input();
const isolated = mustBuild(mutableInput);
mutableInput.node.health_ok = false;
mutableInput.authority_checks[0]!.identity_id = "agent.changed";
assert.equal(isolated.node.health_ok, true);
assert.equal(isolated.authority_checks[0]!.identity_id, "agent.apollyon");
console.log("[PASS] observation is isolated from later caller mutation");

const noVerified = mustBuild(input(node({ verified_peer_count: 0 })));
assert.equal(noVerified.sentry_status, "attention");
assert.equal(noVerified.escalation_required, false);
assert.deepEqual(noVerified.findings.map((x) => x.code), ["no_verified_peers"]);
console.log("[PASS] notice-only peer verification degradation is ATTENTION without escalation");

const noPeers = mustBuild(input(node({ connected_peer_count: 0, verified_peer_count: 0 })));
assert.equal(noPeers.sentry_status, "hold");
assert.equal(noPeers.escalation_required, true);
assert.deepEqual(noPeers.findings.map((x) => x.code), ["no_connected_peers", "no_verified_peers"]);
console.log("[PASS] zero connected peers becomes deterministic HOLD");

const gapped = mustBuild(input(node({ gap: 7 })));
assert.equal(gapped.sentry_status, "hold");
assert.equal(gapped.findings.some((x) => x.code === "chain_gap_nonzero" && x.observed === "7"), true);

const notReady = mustBuild(input(node({ health_ok: false, ready: false, txroot_live: 0 })));
assert.equal(notReady.sentry_status, "hold");
assert.deepEqual(
  notReady.findings.map((x) => x.code),
  ["node_health_unhealthy", "node_not_ready", "txroot_not_live"],
);

const zeroHead = mustBuild(input(node({ latest_head: "0" })));
assert.equal(zeroHead.findings.some((x) => x.code === "latest_head_zero"), true);
console.log("[PASS] node health/readiness/gap/txroot/head anomalies fail closed as findings");

const failedAuthority = mustBuild(
  input(node(), [
    checkFailed("agent.apollyon"),
    checkOk("sovereign.zoso", view("sovereign.zoso", "0")),
  ]),
);
assert.equal(failedAuthority.sentry_status, "hold");
assert.equal(failedAuthority.escalation_required, true);
assert.equal(
  failedAuthority.findings.some(
    (x) => x.code === "authority_read_failed" && x.identity_id === "agent.apollyon",
  ),
  true,
);

const revokedAuthority = mustBuild(
  input(node(), [
    checkOk("agent.apollyon", view("agent.apollyon", "2", "revoked", "revoke")),
    checkOk("sovereign.zoso", view("sovereign.zoso", "0")),
  ]),
);
assert.equal(revokedAuthority.sentry_status, "hold");
assert.equal(
  revokedAuthority.findings.some(
    (x) => x.code === "authority_revoked" && x.identity_id === "agent.apollyon" && x.observed === "2",
  ),
  true,
);
console.log("[PASS] unreadable and revoked Chain-2050 authority produce escalation-required HOLD");

const digestChanged = mustBuild(input(node({ health_sha256: sha("health:changed") })));
assert.notEqual(digestChanged.observation_sha256, healthy.observation_sha256);
console.log("[PASS] source-evidence digest changes alter the observation identity");

const duplicateChecks = input();
duplicateChecks.authority_checks = [
  checkOk("agent.apollyon", view("agent.apollyon", "0")),
  checkOk("agent.apollyon", view("agent.apollyon", "0")),
];
mustReject(duplicateChecks);

const unsortedChecks = input();
unsortedChecks.authority_checks = [
  checkOk("sovereign.zoso", view("sovereign.zoso", "0")),
  checkOk("agent.apollyon", view("agent.apollyon", "0")),
];
mustReject(unsortedChecks);

const wrongNodeChain = structuredClone(input()) as Record<string, any>;
wrongNodeChain.node.chain_id = 1;
mustReject(wrongNodeChain);

const nonCanonicalHead = structuredClone(input()) as Record<string, any>;
nonCanonicalHead.node.latest_head = "01951058";
mustReject(nonCanonicalHead);

const impossiblePeers = structuredClone(input()) as Record<string, any>;
impossiblePeers.node.verified_peer_count = 3;
impossiblePeers.node.connected_peer_count = 2;
mustReject(impossiblePeers);

for (const target of ["top", "node", "check", "view"] as const) {
  const candidate = structuredClone(input()) as Record<string, any>;
  if (target === "top") candidate.unknown = true;
  if (target === "node") candidate.node.unknown = true;
  if (target === "check") candidate.authority_checks[0].unknown = true;
  if (target === "view") candidate.authority_checks[0].view.unknown = true;
  mustReject(candidate);
}

const identityMismatch = structuredClone(input()) as Record<string, any>;
identityMismatch.authority_checks[0].view.identity_id = "agent.other";
mustReject(identityMismatch);

const badFailureShape = structuredClone(input()) as Record<string, any>;
badFailureShape.authority_checks[0] = {
  schema: VOID_APOLLYON_AUTHORITY_CHECK_V1_SCHEMA,
  identity_id: "agent.apollyon",
  ok: false,
  reason: "contains spaces",
  view: null,
};
mustReject(badFailureShape);
console.log("[PASS] duplicate/unsorted/malformed/wrong-chain evidence is rejected before observation");

console.log(MARKER);
console.log("model_invoked=false");
console.log("provider_invoked=false");
console.log("mutation_authority_granted=false");
console.log("service_restart_authorized=false");
console.log("transaction_authority_granted=false");
console.log("capability_promoted=false");
console.log("office_designated=false");
