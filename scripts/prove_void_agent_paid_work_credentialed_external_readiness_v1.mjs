#!/usr/bin/env node
// VOID_AGENT_PAID_WORK_CREDENTIALED_EXTERNAL_READINESS_V1_PROOF
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const TOOL =
  "tools/void-agent-paid-work-credentialed-external-readiness-v1.mjs";
const DOC =
  "docs/operators/agent-paid-work-credentialed-external-readiness-v1.md";
const WORKFLOW =
  ".github/workflows/void-agent-paid-work-credentialed-external-readiness-v1.yml";

for (const path of [TOOL, DOC, WORKFLOW]) {
  assert.equal(fs.existsSync(path), true, "missing " + path);
}

const stdout = execFileSync(process.execPath, [TOOL], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
const result = JSON.parse(stdout);

assert.equal(
  result.marker,
  "VOID_AGENT_PAID_WORK_CREDENTIALED_EXTERNAL_READINESS_V1",
);
assert.equal(result.version, 1);
assert.equal(result.issue, 2382);
assert.match(result.repository_head, /^[0-9a-f]{40}$/u);

for (const [key, expected] of Object.entries({
  read_only_source_census: true,
  network_access: false,
  credential_or_token_read: false,
  private_key_access: false,
  runtime_or_service_mutation: false,
  wc_mutation: false,
  chain2050_mutation: false,
  funds_movement: false,
  ready_for_external_opening_eligible_canary: false,
})) {
  assert.equal(result[key], expected, key);
}

assert.equal(
  result.decision,
  "HOLD_CREDENTIALED_EXTERNAL_PAID_WORK_RUNTIME_REQUALIFICATION_REQUIRED",
);

const lineage = result.source_lineage;
for (const key of [
  "credential_request_gateway_source_ready",
  "credential_request_gateway_loopback_only",
  "credential_request_review_queue_source_ready",
  "credential_lifecycle_source_ready",
  "credential_wc_account_binding_source_ready",
  "credential_registry_source_ready",
  "authenticated_submission_receiver_source_ready",
  "public_submission_proxy_source_wired",
  "wc_earning_adapter_source_ready",
]) {
  assert.equal(lineage[key], true, key);
}
assert.equal(
  lineage.opening_policy_compatible_identity_source,
  "active_paid_work_credential_wc_account_binding_v1",
);
assert.equal(
  lineage.opening_policy_compatible_earning_source,
  "agent_paid_work_wc_earning_adapter_receipt_v1",
);

assert.equal(
  result.public_ingress
    .credential_request_proxy_wired_in_canonical_public_gateway,
  false,
);
assert.equal(
  result.public_ingress.submission_proxy_source_wired,
  true,
);
assert.equal(
  result.public_ingress.submission_proxy_activation_default_off,
  true,
);

assert.equal(
  result.stale_discovery_snapshot
    .external_agent_runtime_onboarding_available,
  false,
);
assert.equal(
  result.stale_discovery_snapshot
    .external_agent_paid_work_execution_available,
  false,
);
assert.equal(
  result.stale_discovery_snapshot.source_commit_differs_from_head,
  true,
);

assert.equal(
  result.historical_credential_request_packet
    .endpoint_is_tailnet_specific,
  true,
);
assert.equal(
  result.historical_credential_request_packet.credential_created,
  false,
);
assert.equal(
  result.historical_credential_request_packet
    .work_execution_authorized,
  false,
);
assert.equal(
  result.historical_credential_request_packet.wc_award_authorized,
  false,
);

assert.ok(
  result.blockers.includes(
    "canonical_public_https_credential_request_proxy_missing",
  ),
);
assert.ok(
  result.blockers.includes(
    "fresh_external_credential_review_and_issue_runtime_evidence_required",
  ),
);
assert.ok(
  result.blockers.includes(
    "wc_earning_adapter_and_canonical_3_wc_acceptance_canary_required",
  ),
);

const componentKeys = Object.keys(result.components);
assert.equal(componentKeys.length, 11);
for (const key of componentKeys) {
  assert.equal(typeof result.components[key].path, "string");
  assert.match(result.components[key].sha256, /^[0-9a-f]{64}$/u);
}

const doc = fs.readFileSync(DOC, "utf8");
for (const required of [
  "VOID_AGENT_PAID_WORK_CREDENTIALED_EXTERNAL_READINESS_V1",
  "#2382",
  "#2376",
  "active_paid_work_credential_wc_account_binding_v1",
  "agent_paid_work_wc_earning_adapter_receipt_v1",
  "HOLD_CREDENTIALED_EXTERNAL_PAID_WORK_RUNTIME_REQUALIFICATION_REQUIRED",
  "ready_for_external_opening_eligible_canary=false",
  "does not currently contain the credential",
  "A ZoSo-controlled second account or host is not independence evidence.",
]) {
  assert.ok(doc.includes(required), "missing doc:" + required);
}

for (const forbidden of [
  "external_agent_runtime_onboarding_available=true",
  "external_agent_paid_work_execution_available=true",
  "ready_for_external_opening_eligible_canary=true",
]) {
  assert.equal(doc.includes(forbidden), false, "forbidden doc:" + forbidden);
}

const workflow = fs.readFileSync(WORKFLOW, "utf8");
for (const required of [
  "node: [22, 24, 26]",
  "void-agent-paid-work-credentialed-external-readiness-v1.mjs",
  "scripts/agent_paid_work_credential_registry_v1.ts",
  "git diff --check",
]) {
  assert.ok(workflow.includes(required), "missing workflow:" + required);
}

console.log(
  "VOID_AGENT_PAID_WORK_CREDENTIALED_EXTERNAL_READINESS_V1_PROOF_GREEN",
);
console.log("source_lineage_reobserved=true");
console.log("opening_eligibility_policy_changed=false");
console.log("credential_request_public_proxy_wired=false");
console.log("authenticated_submission_proxy_source_wired=true");
console.log("external_canary_authorized=false");
console.log("network_access=false");
console.log("credential_access=false");
console.log("wc_mutation=false");
console.log("funds_movement=false");
