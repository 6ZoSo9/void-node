#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VOID_EXTERNAL_PAID_WORK_OPENING_LINEAGE_AUTHORITY_V1,
  VOID_EXTERNAL_PAID_WORK_OPENING_LINEAGE_ROUTES_V1,
  VOID_EXTERNAL_PAID_WORK_OPENING_LINEAGE_SOURCE_BLOBS_V1,
  buildVoidExternalPaidWorkOpeningLineageV1,
} from "../tools/void-external-paid-work-opening-lineage-v1.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function gitBlobSha1(bytes) {
  return crypto
    .createHash("sha1")
    .update(
      Buffer.from(
        `blob ${bytes.length}\0`,
        "ascii",
      ),
    )
    .update(bytes)
    .digest("hex");
}

function source(relative) {
  return fs.readFileSync(
    path.join(ROOT, relative),
    "utf8",
  );
}

function requireIncludes(text, values, label) {
  for (const value of values) {
    assert.equal(
      text.includes(value),
      true,
      `${label}: missing ${value}`,
    );
  }
}

function requireExcludes(text, values, label) {
  for (const value of values) {
    assert.equal(
      text.includes(value),
      false,
      `${label}: unexpected ${value}`,
    );
  }
}

for (
  const [relative, expected] of
  Object.entries(
    VOID_EXTERNAL_PAID_WORK_OPENING_LINEAGE_SOURCE_BLOBS_V1,
  )
) {
  const bytes = fs.readFileSync(
    path.join(ROOT, relative),
  );
  assert.equal(
    gitBlobSha1(bytes),
    expected,
    relative,
  );
}

assert.equal(
  Object.keys(
    VOID_EXTERNAL_PAID_WORK_OPENING_LINEAGE_SOURCE_BLOBS_V1,
  ).length,
  20,
);

const credentialIntake = source(
  "scripts/agent_paid_work_credential_request_intake_v1.ts",
);
requireIncludes(
  credentialIntake,
  [
    '"agent_paid_work_submit" as const',
    '"accepted_for_review"',
    "AGENT_PAID_WORK_CREDENTIAL_REQUEST_INTAKE_V1_ACCEPTED_FOR_REVIEW",
  ],
  "credential intake",
);

const reviewQueue = source(
  "scripts/agent_paid_work_credential_request_review_queue_v1.ts",
);
requireIncludes(
  reviewQueue,
  [
    'requested_scope: "agent_paid_work_submit"',
    'allowed_scopes: ["agent_paid_work_submit"]',
    "credential_issuance_authorized: false",
    "credential_registry_mutation_authorized: false",
    '"approved_for_issuance_preparation"',
  ],
  "credential review",
);

const issuance = source(
  "scripts/agent_paid_work_canonical_remote_credential_issuance_v1.mjs",
);
requireIncludes(
  issuance,
  [
    '"approve-agent-paid-work-canonical-remote-credential-v1"',
    "request.scopes.length === 1",
    "request.scopes[0] === AGENT_PAID_WORK_SUBMIT_SCOPE",
    "credential_registry_write: false",
  ],
  "credential issuance",
);

const registry = source(
  "scripts/agent_paid_work_credential_registry_v1.ts",
);
requireIncludes(
  registry,
  [
    "AGENT_PAID_WORK_SUBMIT_SCOPE",
    "credential_revoked",
    "scope_not_granted",
    "matched.scopes.includes(",
  ],
  "credential registry",
);

const binding = source(
  "scripts/agent_paid_work_credential_wc_account_binding_lifecycle_v1.mjs",
);
requireIncludes(
  binding,
  [
    "VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_V1",
    'status: "active"',
    "credential already has an active WC-account binding",
    "destination WC account already has an active credential binding",
    "binding registry SHA changed after staging",
  ],
  "credential WC binding",
);

const cloudflareSource = source(
  "tools/void-cloudflare-origin-proxy-v2-source-v1.mjs",
);
requireIncludes(
  cloudflareSource,
  [
    VOID_EXTERNAL_PAID_WORK_OPENING_LINEAGE_ROUTES_V1
      .credential_request,
    "/wc/public-earning-pilot-v1/claim-ticket",
    "/wc/public-earning-pilot-v1/submit-result",
  ],
  "Cloudflare sensitive ingress",
);
requireExcludes(
  cloudflareSource,
  [
    VOID_EXTERNAL_PAID_WORK_OPENING_LINEAGE_ROUTES_V1
      .authenticated_submission,
  ],
  "Cloudflare sensitive ingress",
);

const frontdoor = source(
  "ops/public/void-public-frontdoor-v1.mjs",
);
requireIncludes(
  frontdoor,
  [
    "const SENSITIVE_EDGE_PATHS = Object.freeze([",
    VOID_EXTERNAL_PAID_WORK_OPENING_LINEAGE_ROUTES_V1
      .credential_request,
    "req.pipe(upstream);",
  ],
  "frontdoor",
);
requireExcludes(
  frontdoor,
  [
    VOID_EXTERNAL_PAID_WORK_OPENING_LINEAGE_ROUTES_V1
      .authenticated_submission,
  ],
  "frontdoor sensitive set",
);

const composition = source(
  "ops/public/void-public-app-composition-gateway-v1.mjs",
);
requireIncludes(
  composition,
  [
    'const AGENT_PAID_WORK_SUBMISSION_PATH =',
    VOID_EXTERNAL_PAID_WORK_OPENING_LINEAGE_ROUTES_V1
      .authenticated_submission,
    "if (pathname === AGENT_PAID_WORK_SUBMISSION_PATH)",
    "agents_namespace_fail_closed",
    "${AGENT_PAID_WORK_GATEWAY_UPSTREAM}${AGENT_PAID_WORK_SUBMISSION_PATH}",
    "headers.authorization = authorization",
    'headers["x-void-payload-sha256"] = bodySha',
  ],
  "composition paid-work edge",
);
const exactSubmissionRoute = composition.indexOf(
  "if (pathname === AGENT_PAID_WORK_SUBMISSION_PATH)",
);
const namespaceFailClosed = composition.indexOf(
  "agents_namespace_fail_closed",
);
assert.ok(
  exactSubmissionRoute >= 0 &&
  namespaceFailClosed > exactSubmissionRoute,
  "exact submission route must precede agents namespace fail-closed wall",
);

const publicGateway = source(
  "ops/void-ai-agent-public-gateway-v1.mjs",
);
requireIncludes(
  publicGateway,
  [
    VOID_EXTERNAL_PAID_WORK_OPENING_LINEAGE_ROUTES_V1
      .authenticated_submission,
    "async function proxyAgentPaidWorkSubmission(",
    "AGENT_PAID_WORK_SUBMISSION_MAX_BODY_BYTES",
    "bearer_authorization_required",
    "X-Void-Agent-Paid-Work-Submission-Route",
    "accepted_for_review_only: true",
    "wc_award_authority: false",
  ],
  "public paid-work gateway",
);

const receiver = source(
  "scripts/agent_paid_work_submission_receiver_v1.ts",
);
requireIncludes(
  receiver,
  [
    VOID_EXTERNAL_PAID_WORK_OPENING_LINEAGE_ROUTES_V1
      .authenticated_submission,
    "AGENT_PAID_WORK_SUBMIT_SCOPE",
    "authenticateAgentPaidWorkCredentialV1(",
    "wc_award_authorized: false",
  ],
  "paid-work receiver",
);

const canaryTransport = source(
  "scripts/external_agent_paid_work_fresh_canary_credential_live_transport_adapters_v1.ts",
);
requireIncludes(
  canaryTransport,
  [
    "VOID_EXTERNAL_AGENT_PAID_WORK_FRESH_CANARY_CREDENTIAL_LIVE_TRANSPORT_PROFILE_V1",
    "['request','review','activate','bind','duplicate_probe']",
    "requested_scopes:['submit']",
  ],
  "fresh canary transport",
);

const stageCommands = source(
  "scripts/external_agent_paid_work_fresh_canary_credential_live_stage_commands_v1.ts",
);
requireIncludes(
  stageCommands,
  [
    "VOID_EXTERNAL_AGENT_PAID_WORK_FRESH_CANARY_CREDENTIAL",
    "confirmFreshCanaryCredential",
  ],
  "fresh canary stage commands",
);

const canaryLifecycle = source(
  "scripts/external_agent_paid_work_fulfillment_fresh_canary_credential_lifecycle_and_wc_binding_v1.ts",
);
requireIncludes(
  canaryLifecycle,
  [
    "VOID_EXTERNAL_AGENT_PAID_WORK_FRESH_CANARY_CREDENTIAL_BINDING_MANIFEST_V1",
    'requested_scopes: ["submit"]',
    'result.review_decision !== "approved"',
    'result.scope !== "submit"',
    "destination_wc_account",
  ],
  "fresh canary lifecycle",
);

const orchestrator = source(
  "scripts/external_agent_paid_work_fulfillment_orchestrator_v1.ts",
);
requireIncludes(
  orchestrator,
  [
    "VOID_EXTERNAL_AGENT_PAID_WORK",
    "fixed_award_wc",
  ],
  "fulfillment orchestrator",
);

const executor = source(
  "scripts/external_agent_paid_work_fulfillment_executor_receive_and_run_v1.ts",
);
requireIncludes(
  executor,
  [
    "VOID_EXTERNAL_AGENT_PAID_WORK",
    "participant",
    "receipt",
  ],
  "fulfillment executor",
);

const finalizer = source(
  "scripts/external_agent_paid_work_fulfillment_return_package_acceptance_and_adapter_finalize_v1.ts",
);
requireIncludes(
  finalizer,
  [
    "VOID_AGENT_PAID_WORK_WC_EARNING_ADAPTER_RECEIPT_V1",
    "adapter-execution-receipt-v1.json",
    "fixed_award_wc",
    "finalization profile fixed award must be 3 WC",
    "adapter_duplicate_probe: true",
  ],
  "return acceptance finalizer",
);

const adapterCli = source(
  "scripts/agent_paid_work_wc_earning_adapter_cli_v1.ts",
);
requireIncludes(
  adapterCli,
  [
    "agent_paid_work_wc_earning_adapter_v1",
    "adapter",
  ],
  "earning adapter CLI",
);

const adapterCore = source(
  "src/economic/agent_paid_work_wc_earning_adapter_v1.ts",
);
requireIncludes(
  adapterCore,
  [
    "AGENT_PAID_WORK_WC_EARNING_ADAPTER_FIXED_AWARD_WC = 3",
    "validateAgentPaidWorkWcEarningAdapterReceiptV1",
    "VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_REGISTRY_V1",
    "active credential binding cardinality mismatch",
  ],
  "earning adapter core",
);

const openingCensus = source(
  "scripts/void_wc_void_opening_production_wc_capacity_census_v1.ts",
);
requireIncludes(
  openingCensus,
  [
    "validateAgentPaidWorkWcEarningAdapterReceiptV1",
    'const RECEIPT_BASENAME = "adapter-execution-receipt-v1.json"',
    "adapter_receipt_cross_binding_invalid",
    "current_credential_binding_revalidation_performed: false",
  ],
  "opening capacity census",
);

const discovery = JSON.parse(
  source(
    "public/public-node/agents/paid-work-v1.json",
  ),
);
assert.equal(
  discovery.runtime_capabilities.live_work_order_submission,
  "unavailable",
);
assert.equal(
  discovery.runtime_capabilities.live_work_dispatch,
  "unavailable",
);
assert.equal(
  discovery.runtime_capabilities.live_wc_award_authorization,
  "unavailable",
);
assert.equal(
  discovery.runtime_capabilities.live_wc_ledger_write,
  "unavailable",
);

const lineage =
  buildVoidExternalPaidWorkOpeningLineageV1();
const lineageAgain =
  buildVoidExternalPaidWorkOpeningLineageV1();
assert.deepEqual(lineage, lineageAgain);
assert.match(
  lineage.lineage_id,
  /^voidapwopeninglineage1_[0-9a-f]{64}$/,
);
assert.equal(
  lineage.status,
  "SOURCE_LINEAGE_QUALIFIED_NOT_LIVE",
);
assert.equal(
  lineage.credential_scope,
  "agent_paid_work_submit",
);
assert.equal(lineage.fixed_award_wc, 3);
assert.equal(
  lineage.ingress.credential_request.transport,
  "cloudflare_source_authenticated_sensitive_route",
);
assert.equal(
  lineage.ingress.authenticated_submission
    .composition_route_exact,
  true,
);
assert.equal(
  lineage.ingress.authenticated_submission
    .sibling_agents_namespace_routes_fail_closed,
  true,
);
assert.equal(
  lineage.ingress.authenticated_submission
    .generic_agents_namespace_proxy_authorized,
  false,
);

for (const [key, expected] of Object.entries({
  source_contract: true,
  source_lineage_bound: true,
  opening_eligibility_policy_changed: false,
  credential_request_operator_review_required: true,
  credential_scope_agent_paid_work_submit_required: true,
  credential_request_source_authenticated_ingress_bound: true,
  authenticated_submission_exact_ingress_bound: true,
  authenticated_submission_bearer_credential_required: true,
  authenticated_submission_payload_digest_required: true,
  outer_frontdoor_transport_generic: true,
  generic_agents_namespace_proxy_authorized: false,
  agents_namespace_siblings_fail_closed: true,
  submission_transport_source_identity_required: false,
  fixed_award_wc: 3,
  live_runtime_observed: false,
  public_readiness_verified: false,
  external_agent_runtime_onboarding_available: false,
  external_agent_paid_work_execution_available: false,
  credential_issuance: false,
  credential_registry_mutation: false,
  work_dispatch: false,
  work_execution: false,
  wc_award_authorized: false,
  wc_ledger_write: false,
  wallet_or_signer_access: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_broadcast: false,
  public_presale_activation: false,
  wc_void_market_activation: false,
  funds_movement: false,
})) {
  assert.equal(
    VOID_EXTERNAL_PAID_WORK_OPENING_LINEAGE_AUTHORITY_V1[key],
    expected,
    key,
  );
}

console.log(
  "VOID_EXTERNAL_PAID_WORK_OPENING_LINEAGE_V1_GREEN",
);
console.log("source_blob_count=20");
console.log(
  "credential_request_source_authenticated_ingress_bound=true",
);
console.log(
  "authenticated_submission_exact_ingress_bound=true",
);
console.log(
  "agents_namespace_siblings_fail_closed=true",
);
console.log(
  "generic_agents_namespace_proxy_authorized=false",
);
console.log("credential_scope=agent_paid_work_submit");
console.log("fixed_award_wc=3");
console.log("opening_eligibility_policy_changed=false");
console.log(
  "external_agent_runtime_onboarding_available=false",
);
console.log(
  "external_agent_paid_work_execution_available=false",
);
console.log("live_runtime_observed=false");
console.log("work_dispatch=false");
console.log("wc_ledger_write=false");
console.log("funds_movement=false");
