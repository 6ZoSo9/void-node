#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";

import {
  FALSE_AUTHORITY,
  PLAN_PREFIX,
  buildAuthenticatedPaidWorkCanonicalIssuancePlanBindingV1,
  buildSanitizedCanonicalRemoteCredentialRequestFromPlanV1,
  canonicalJson,
  computeCanonicalIssuancePlanIdV1,
  validateAuthenticatedPaidWorkCanonicalIssuancePlanBindingV1,
  validatePrivateRuntimeRevalidationReconciliationV1,
} from "../integrations/agents/authenticated-paid-work-canonical-issuance-plan-binding-v1/index.mjs";

const readJson = (path) => JSON.parse(fs.readFileSync(path, "utf8"));
const fixture = readJson(
  "fixtures/agents/authenticated-paid-work-canonical-issuance-plan-binding-v1.example.json",
);
const recovery = readJson(
  "fixtures/agents/authenticated-paid-work-post-expiry-recovery-preparation-v1.example.json",
);
const reconciliation = readJson(
  "config/activation-candidates/authenticated-paid-work-private-runtime-revalidation-current-main-reconciliation-v1.json",
);

function clone(value) {
  return structuredClone(value);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function resealPlan(value) {
  const next = clone(value);
  next.plan_id = computeCanonicalIssuancePlanIdV1(next);
  return next;
}

function resealReconciliation(value) {
  const next = clone(value);
  const body = clone(next);
  delete body.reconciliation_id;
  next.reconciliation_id = `voidapwprmr1_${sha256(canonicalJson(body))}`;
  return next;
}

function expectThrow(fn, pattern, label) {
  let thrown = null;
  try {
    fn();
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown, `${label} did not throw`);
  assert.match(String(thrown.message || thrown), pattern, `${label} wrong error`);
}

const built = buildAuthenticatedPaidWorkCanonicalIssuancePlanBindingV1({
  postExpiryRecoveryPacket: recovery,
  privateRuntimeReconciliation: reconciliation,
});
assert.equal(canonicalJson(built), canonicalJson(fixture));
assert.equal(validateAuthenticatedPaidWorkCanonicalIssuancePlanBindingV1(fixture).plan_id, fixture.plan_id);
assert.match(fixture.plan_id, /^voidapwnlp1_[a-f0-9]{64}$/);
assert.notEqual(fixture.plan_id, recovery.rotation.rotation_plan_id);
assert.equal(validatePrivateRuntimeRevalidationReconciliationV1(reconciliation).reconciliation_id, reconciliation.reconciliation_id);

const request = buildSanitizedCanonicalRemoteCredentialRequestFromPlanV1({
  plan: fixture,
  postExpiryRecoveryPacket: recovery,
  privateRuntimeReconciliation: reconciliation,
  evaluatedAtUtc: "2026-08-05T02:00:00Z",
});
assert.equal(request.plan_id, fixture.plan_id);
assert.equal(request.agent_id, fixture.request_contract.agent_id);
assert.equal(request.destination_wc_account, fixture.request_contract.destination_wc_account);
assert.deepEqual(request.scopes, ["agent_paid_work_submit"]);
assert.equal(request.expires_at_utc, "2026-08-12T02:00:00Z");
assert.equal(request.raw_token_generation_authorized, false);
assert.equal("credential_id" in request, false);
assert.equal("token_sha256" in request, false);
assert.equal(Object.isFrozen(request), true);
assert.equal(Object.isFrozen(request.authority), true);
for (const value of Object.values(request.authority)) assert.equal(value, false);
for (const value of Object.values(FALSE_AUTHORITY)) assert.equal(value, false);

const wrongPacketId = clone(recovery);
wrongPacketId.packet_id = `voidapwperp1_${"1".repeat(64)}`;
expectThrow(
  () => buildAuthenticatedPaidWorkCanonicalIssuancePlanBindingV1({
    postExpiryRecoveryPacket: wrongPacketId,
    privateRuntimeReconciliation: reconciliation,
  }),
  /packet_id_derivation_mismatch|packet_id_mismatch/,
  "wrong recovery packet ID",
);

const runtimeClaim = clone(recovery);
runtimeClaim.evidence_gap.current_runtime_state_established = true;
expectThrow(
  () => buildAuthenticatedPaidWorkCanonicalIssuancePlanBindingV1({
    postExpiryRecoveryPacket: runtimeClaim,
    privateRuntimeReconciliation: reconciliation,
  }),
  /current_runtime_state_established_must_be_false|runtime_or_authentication_claim/,
  "current runtime claim",
);

const semanticBypass = clone(reconciliation);
semanticBypass.semantic_reconciliation.rotation_plan_id_accepted_as_canonical_issuance_plan = true;
const resealedSemanticBypass = resealReconciliation(semanticBypass);
expectThrow(
  () => buildAuthenticatedPaidWorkCanonicalIssuancePlanBindingV1({
    postExpiryRecoveryPacket: recovery,
    privateRuntimeReconciliation: resealedSemanticBypass,
  }),
  /rotation_plan_id_accepted_as_canonical_issuance_plan_mismatch|reconciliation_id_mismatch/,
  "rotation protocol substitution",
);

const inventedPlan = clone(fixture);
inventedPlan.plan_id = `${PLAN_PREFIX}${"a".repeat(64)}`;
expectThrow(
  () => validateAuthenticatedPaidWorkCanonicalIssuancePlanBindingV1(inventedPlan),
  /plan_id_derivation_mismatch/,
  "invented syntactically valid plan ID",
);

const wrongAgent = resealPlan({
  ...clone(fixture),
  request_contract: {
    ...clone(fixture.request_contract),
    agent_id: "void-substituted-agent-v1",
  },
});
expectThrow(
  () => validateAuthenticatedPaidWorkCanonicalIssuancePlanBindingV1(wrongAgent),
  /request_contract_mismatch/,
  "agent substitution",
);

const wrongScope = resealPlan({
  ...clone(fixture),
  request_contract: {
    ...clone(fixture.request_contract),
    scopes: ["agent_paid_work_admin"],
  },
});
expectThrow(
  () => validateAuthenticatedPaidWorkCanonicalIssuancePlanBindingV1(wrongScope),
  /request_contract_mismatch/,
  "scope substitution",
);

const authorityGrant = resealPlan({
  ...clone(fixture),
  authority: {
    ...clone(fixture.authority),
    private_material_generation_authorized: true,
  },
});
expectThrow(
  () => validateAuthenticatedPaidWorkCanonicalIssuancePlanBindingV1(authorityGrant),
  /authority_private_material_generation_authorized_mismatch/,
  "authority grant",
);

expectThrow(
  () => buildSanitizedCanonicalRemoteCredentialRequestFromPlanV1({
    plan: fixture,
    postExpiryRecoveryPacket: recovery,
    privateRuntimeReconciliation: reconciliation,
    evaluatedAtUtc: "2026-08-05T01:59:59Z",
  }),
  /precedes_not_before/,
  "request before not-before boundary",
);
expectThrow(
  () => buildSanitizedCanonicalRemoteCredentialRequestFromPlanV1({
    plan: fixture,
    postExpiryRecoveryPacket: recovery,
    privateRuntimeReconciliation: reconciliation,
    evaluatedAtUtc: "2026-08-12T02:00:00Z",
  }),
  /at_or_after_expiration/,
  "request at expiration boundary",
);

let proxyTraps = 0;
const proxy = new Proxy(recovery, {
  ownKeys() { proxyTraps += 1; return []; },
  getOwnPropertyDescriptor() { proxyTraps += 1; return undefined; },
  get() { proxyTraps += 1; return undefined; },
});
expectThrow(
  () => buildAuthenticatedPaidWorkCanonicalIssuancePlanBindingV1({
    postExpiryRecoveryPacket: proxy,
    privateRuntimeReconciliation: reconciliation,
  }),
  /proxy_forbidden/,
  "root proxy",
);
assert.equal(proxyTraps, 0);

let getterExecutions = 0;
const accessor = clone(reconciliation);
Object.defineProperty(accessor, "decision", {
  enumerable: true,
  get() { getterExecutions += 1; return reconciliation.decision; },
});
expectThrow(
  () => validatePrivateRuntimeRevalidationReconciliationV1(accessor),
  /accessor_forbidden/,
  "accessor input",
);
assert.equal(getterExecutions, 0);

assert.equal(
  JSON.stringify(fixture).includes("voidapwc1."),
  false,
  "fixture contains raw credential",
);
assert.equal(fixture.decision.execution_authorized, false);
assert.equal(fixture.decision.sanitized_request_materialized, false);

console.log(JSON.stringify({
  marker: fixture.marker,
  plan_id: fixture.plan_id,
  post_expiry_recovery_packet_id: fixture.evidence.post_expiry_recovery_packet_id,
  private_runtime_reconciliation_id: fixture.evidence.private_runtime_reconciliation_id,
  source_request_contract_ready: true,
  sanitized_request_materialized: false,
  private_credential_material_generated: false,
  credential_registry_write_completed: false,
  receiver_revalidated: false,
  old_binding_retired: false,
  replacement_binding_applied: false,
  execution_authorized: false,
  decision: fixture.decision.status,
  status: "GREEN",
}, null, 2));
console.log("VOID_AUTHENTICATED_PAID_WORK_CANONICAL_ISSUANCE_PLAN_BINDING_V1_PROOF_GREEN");
