#!/usr/bin/env node
// VOID_AGENT_PAID_WORK_CREDENTIALED_EXTERNAL_READINESS_V1_PROOF
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";

import {
  evaluateCredentialRequestGatewayContractV1,
  evaluateOpeningEligibilityContractV1,
  evaluatePublicSubmissionGatewayContractV1,
} from "../tools/void-agent-paid-work-credentialed-external-readiness-v1.mjs";

const TOOL =
  "tools/void-agent-paid-work-credentialed-external-readiness-v1.mjs";
const DOC =
  "docs/operators/agent-paid-work-credentialed-external-readiness-v1.md";
const WORKFLOW =
  ".github/workflows/void-agent-paid-work-credentialed-external-readiness-v1.yml";
const CREDENTIAL_GATEWAY =
  "scripts/agent_paid_work_credential_request_gateway_v1.ts";
const PUBLIC_GATEWAY =
  "ops/void-ai-agent-public-gateway-v1.mjs";
const OPENING_ELIGIBILITY =
  "tools/void-wc-void-opening-participant-provenance-eligibility-v1.mjs";

for (const path of [
  TOOL,
  DOC,
  WORKFLOW,
  CREDENTIAL_GATEWAY,
  PUBLIC_GATEWAY,
  OPENING_ELIGIBILITY,
]) {
  assert.equal(fs.existsSync(path), true, "missing " + path);
}

function runTool() {
  return execFileSync(process.execPath, [TOOL], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

const result = JSON.parse(runTool());

assert.equal(
  result.marker,
  "VOID_AGENT_PAID_WORK_CREDENTIALED_EXTERNAL_READINESS_V1",
);
assert.equal(result.version, 1);
assert.equal(result.issue, 2382);
assert.match(result.repository_head, /^[0-9a-f]{40}$/u);
assert.match(result.repository_tree, /^[0-9a-f]{40}$/u);
assert.equal(result.exact_head_git_object_source_census, true);
assert.equal(result.worktree_component_bytes_match_head, true);

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
  "credential_request_gateway_review_only_issuance",
  "credential_request_review_queue_source_ready",
  "credential_lifecycle_source_ready",
  "credential_wc_account_binding_source_ready",
  "credential_registry_source_ready",
  "authenticated_submission_receiver_source_ready",
  "public_submission_proxy_source_wired",
  "public_submission_proxy_loopback_upstream_only",
  "wc_earning_adapter_source_ready",
  "opening_policy_active_credential_required",
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
  assert.match(result.components[key].git_blob_sha1, /^[0-9a-f]{40}$/u);
  assert.match(result.components[key].sha256, /^[0-9a-f]{64}$/u);
}

const credentialGatewaySource =
  fs.readFileSync(CREDENTIAL_GATEWAY, "utf8");
const gatewayAuthorityFlip = credentialGatewaySource.replace(
  /credential_issuance_authorized:\s*\n\s*false,/u,
  "credential_issuance_authorized:\n              true,",
);
assert.notEqual(gatewayAuthorityFlip, credentialGatewaySource);
assert.ok(gatewayAuthorityFlip.includes("false"));
assert.throws(
  () => evaluateCredentialRequestGatewayContractV1(gatewayAuthorityFlip),
  /credential_request_gateway_credential_issuance_authority_changed/u,
);

const disconnectedCredentialRoute = credentialGatewaySource.replace(
  /pathname\s*!==\s*\n\s*AGENT_PAID_WORK_CREDENTIAL_REQUEST_PATH/u,
  'pathname !==\n          "/__void/agents/paid-work/disconnected"',
);
assert.notEqual(disconnectedCredentialRoute, credentialGatewaySource);
assert.ok(
  disconnectedCredentialRoute.includes(
    '"/__void/agents/paid-work/credential-requests/v1"',
  ),
);
assert.throws(
  () => evaluateCredentialRequestGatewayContractV1(disconnectedCredentialRoute),
  /credential_request_gateway_route_guard_contract_match_count/u,
);

const publicGatewaySource = fs.readFileSync(PUBLIC_GATEWAY, "utf8");
const disconnectedSubmissionRoute = publicGatewaySource.replace(
  /parsed\.pathname\s*===\s*\n\s*AGENT_PAID_WORK_SUBMISSION_RECEIVER_PATH/u,
  'parsed.pathname ===\n    "/__void/agents/paid-work/disconnected"',
);
assert.notEqual(disconnectedSubmissionRoute, publicGatewaySource);
assert.ok(
  disconnectedSubmissionRoute.includes(
    '"/__void/agents/paid-work/submissions/v1"',
  ),
);
assert.ok(
  disconnectedSubmissionRoute.includes(
    "VOID_AGENT_PAID_WORK_SUBMISSION_RECEIVER_UPSTREAM",
  ),
);
assert.throws(
  () => evaluatePublicSubmissionGatewayContractV1(disconnectedSubmissionRoute),
  /public_submission_route_contract_match_count/u,
);

const openingSource = fs.readFileSync(OPENING_ELIGIBILITY, "utf8");
const openingAuthorityFlip = openingSource.replace(
  "active_credential_required: true,",
  "active_credential_required: false,",
);
assert.notEqual(openingAuthorityFlip, openingSource);
assert.ok(openingAuthorityFlip.includes("active_credential_required"));
assert.ok(openingAuthorityFlip.includes("true"));
assert.throws(
  () => evaluateOpeningEligibilityContractV1(openingAuthorityFlip),
  /opening_eligibility_policy_contract_changed/u,
);

{
  const original = fs.readFileSync(CREDENTIAL_GATEWAY);
  const gitEnv = {
    ...process.env,
    GIT_OPTIONAL_LOCKS: "0",
  };
  try {
    const assume = spawnSync(
      "/usr/bin/git",
      ["update-index", "--assume-unchanged", CREDENTIAL_GATEWAY],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: gitEnv,
      },
    );
    assert.equal(assume.status, 0, String(assume.stderr || ""));
    fs.appendFileSync(
      CREDENTIAL_GATEWAY,
      "\n// hidden readiness worktree drift\n",
    );
    const hidden = spawnSync(
      process.execPath,
      [TOOL],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    assert.equal(hidden.status, 2);
    assert.match(
      String(hidden.stderr || ""),
      /worktree_head_blob_mismatch:scripts\/agent_paid_work_credential_request_gateway_v1\.ts/u,
    );
  } finally {
    fs.writeFileSync(CREDENTIAL_GATEWAY, original);
    const restore = spawnSync(
      "/usr/bin/git",
      ["update-index", "--no-assume-unchanged", CREDENTIAL_GATEWAY],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: gitEnv,
      },
    );
    assert.equal(restore.status, 0, String(restore.stderr || ""));
  }
}

const source = fs.readFileSync(TOOL, "utf8");
for (const required of [
  "readHeadComponent",
  "readStableWorktree",
  "worktree_head_blob_mismatch",
  "git_blob_sha1",
  "evaluateCredentialRequestGatewayContractV1",
  "evaluatePublicSubmissionGatewayContractV1",
  "evaluateOpeningEligibilityContractV1",
  "GIT_CONFIG_GLOBAL",
  "GIT_CONFIG_SYSTEM",
  "core.fsmonitor=false",
  "core.hooksPath=/dev/null",
  "--no-replace-objects",
]) {
  assert.ok(source.includes(required), "missing tool contract:" + required);
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
  "exact HEAD Git object",
  "Git blob",
  "worktree",
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
console.log("exact_head_git_object_source_census=true");
console.log("worktree_component_bytes_match_head=true");
console.log("semantic_readiness_contracts_bound=true");
console.log("authority_flip_adversary_rejected=true");
console.log("route_disconnect_adversary_rejected=true");
console.log("hidden_worktree_drift_rejected=true");
console.log("opening_eligibility_policy_changed=false");
console.log("credential_request_public_proxy_wired=false");
console.log("authenticated_submission_proxy_source_wired=true");
console.log("external_canary_authorized=false");
console.log("network_access=false");
console.log("credential_access=false");
console.log("wc_mutation=false");
console.log("funds_movement=false");
