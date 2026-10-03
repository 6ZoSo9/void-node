#!/usr/bin/env node
// VOID_AGENT_PAID_WORK_CREDENTIALED_EXTERNAL_READINESS_V1
import crypto from "node:crypto";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const MARKER = "VOID_AGENT_PAID_WORK_CREDENTIALED_EXTERNAL_READINESS_V1";
const ISSUE = 2382;

const FILES = Object.freeze({
  credential_request_gateway:
    "scripts/agent_paid_work_credential_request_gateway_v1.ts",
  credential_request_review_queue:
    "scripts/agent_paid_work_credential_request_review_queue_v1.ts",
  credential_lifecycle:
    "scripts/agent_paid_work_credential_lifecycle_cli_v1.ts",
  credential_wc_binding:
    "scripts/agent_paid_work_credential_wc_account_binding_lifecycle_v1.mjs",
  credential_registry:
    "scripts/agent_paid_work_credential_registry_v1.ts",
  submission_receiver:
    "scripts/agent_paid_work_submission_receiver_v1.ts",
  public_gateway:
    "ops/void-ai-agent-public-gateway-v1.mjs",
  wc_earning_adapter:
    "src/economic/agent_paid_work_wc_earning_adapter_v1.ts",
  opening_eligibility:
    "tools/void-wc-void-opening-participant-provenance-eligibility-v1.mjs",
  public_discovery:
    "docs/public/agent-paid-work-public-discovery-v1.json",
  historical_credential_packet:
    "public/agent-paid-work/credential-request/v1/manifest-v1.json",
});

function fail(message) {
  throw new Error(message);
}

function read(path) {
  if (!fs.existsSync(path)) fail("missing_source:" + path);
  const stat = fs.lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    fail("invalid_source_file:" + path);
  }
  return fs.readFileSync(path, "utf8");
}

function sha256(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function requireTokens(source, tokens, label) {
  for (const token of tokens) {
    if (!source.includes(token)) {
      fail("missing_" + label + "_token:" + token);
    }
  }
}

function gitHead() {
  return execFileSync(
    "/usr/bin/git",
    ["--no-replace-objects", "rev-parse", "HEAD"],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        PATH: "/usr/bin:/bin",
        HOME: process.env.HOME || "/tmp",
        LANG: "C",
        LC_ALL: "C",
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_OPTIONAL_LOCKS: "0",
      },
    },
  ).trim();
}

const sources = Object.fromEntries(
  Object.entries(FILES).map(([key, path]) => [key, read(path)]),
);

requireTokens(
  sources.credential_request_gateway,
  [
    '"/__void/agents/paid-work/credential-requests/v1"',
    'listen_host: "127.0.0.1"',
    "credential_issuance_authorized:",
    "false",
  ],
  "credential_request_gateway",
);
requireTokens(
  sources.credential_request_review_queue,
  [
    "agent_paid_work_submit",
    "decision",
  ],
  "credential_request_review_queue",
);
requireTokens(
  sources.credential_lifecycle,
  [
    "stage-issue",
    "apply-agent-paid-work-credential-lifecycle-v1",
  ],
  "credential_lifecycle",
);
requireTokens(
  sources.credential_wc_binding,
  [
    "VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_LIFECYCLE_V1",
    "VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_REGISTRY_V1",
  ],
  "credential_wc_binding",
);
requireTokens(
  sources.credential_registry,
  [
    "AGENT_PAID_WORK_CREDENTIAL_REGISTRY_MARKER",
    "AGENT_PAID_WORK_SUBMIT_SCOPE",
    '"agent_paid_work_submit" as const',
    "authenticateAgentPaidWorkCredentialV1",
  ],
  "credential_registry",
);
requireTokens(
  sources.submission_receiver,
  [
    "VOID_AGENT_PAID_WORK_SUBMISSION",
    "AGENT_PAID_WORK_SUBMIT_SCOPE",
    "authenticateAgentPaidWorkCredentialV1",
    "parseAgentPaidWorkCredentialRegistryV1",
  ],
  "submission_receiver",
);
requireTokens(
  sources.public_gateway,
  [
    "VOID_AGENT_PAID_WORK_SUBMISSION_RECEIVER_UPSTREAM",
    '"/__void/agents/paid-work/submissions/v1"',
  ],
  "public_gateway_submission",
);
requireTokens(
  sources.wc_earning_adapter,
  [
    "VOID_AGENT_PAID_WORK_WC_EARNING_ADAPTER_RECEIPT_V1",
    "voidapwear1_",
  ],
  "wc_earning_adapter",
);
requireTokens(
  sources.opening_eligibility,
  [
    'identity_source: "active_paid_work_credential_wc_account_binding_v1"',
    'earning_source: "agent_paid_work_wc_earning_adapter_receipt_v1"',
    "active_credential_required: true",
  ],
  "opening_eligibility",
);

const discovery = JSON.parse(sources.public_discovery);
const historicalPacket = JSON.parse(sources.historical_credential_packet);
const head = gitHead();

const credentialRequestPath =
  "/__void/agents/paid-work/credential-requests/v1";
const submissionPath =
  "/__void/agents/paid-work/submissions/v1";

const publicCredentialRequestProxyWired =
  sources.public_gateway.includes(credentialRequestPath);
const publicSubmissionProxySourceWired =
  sources.public_gateway.includes(submissionPath) &&
  sources.public_gateway.includes(
    "VOID_AGENT_PAID_WORK_SUBMISSION_RECEIVER_UPSTREAM",
  );

const discoveryRuntimeOnboarding =
  discovery?.operational_status?.external_agent_runtime_onboarding_available;
const discoveryPaidWorkExecution =
  discovery?.operational_status?.external_agent_paid_work_execution_available;

if (discoveryRuntimeOnboarding !== false) {
  fail("discovery_runtime_onboarding_boundary_changed");
}
if (discoveryPaidWorkExecution !== false) {
  fail("discovery_paid_work_execution_boundary_changed");
}

const componentHashes = Object.fromEntries(
  Object.entries(FILES).map(([key, path]) => [
    key,
    {
      path,
      sha256: sha256(sources[key]),
    },
  ]),
);

const blockers = [];
if (!publicCredentialRequestProxyWired) {
  blockers.push("canonical_public_https_credential_request_proxy_missing");
}
blockers.push(
  "fresh_external_credential_review_and_issue_runtime_evidence_required",
  "fresh_external_credential_wc_account_binding_runtime_evidence_required",
  "authenticated_submission_receiver_runtime_revalidation_required",
  "bounded_paid_work_execution_and_completion_verification_required",
  "wc_earning_adapter_and_canonical_3_wc_acceptance_canary_required",
  "public_discovery_runtime_truth_refresh_required",
);

const output = {
  marker: MARKER,
  version: 1,
  issue: ISSUE,
  repository_head: head,
  read_only_source_census: true,
  network_access: false,
  credential_or_token_read: false,
  private_key_access: false,
  runtime_or_service_mutation: false,
  wc_mutation: false,
  chain2050_mutation: false,
  funds_movement: false,
  source_lineage: {
    credential_request_gateway_source_ready: true,
    credential_request_gateway_loopback_only: true,
    credential_request_review_queue_source_ready: true,
    credential_lifecycle_source_ready: true,
    credential_wc_account_binding_source_ready: true,
    credential_registry_source_ready: true,
    authenticated_submission_receiver_source_ready: true,
    public_submission_proxy_source_wired: publicSubmissionProxySourceWired,
    wc_earning_adapter_source_ready: true,
    opening_policy_compatible_identity_source:
      "active_paid_work_credential_wc_account_binding_v1",
    opening_policy_compatible_earning_source:
      "agent_paid_work_wc_earning_adapter_receipt_v1",
  },
  public_ingress: {
    credential_request_path: credentialRequestPath,
    credential_request_proxy_wired_in_canonical_public_gateway:
      publicCredentialRequestProxyWired,
    submission_path: submissionPath,
    submission_proxy_source_wired: publicSubmissionProxySourceWired,
    submission_proxy_activation_default_off:
      sources.public_gateway.includes(
        'process.env.VOID_AGENT_PAID_WORK_SUBMISSION_RECEIVER_UPSTREAM || ""',
      ),
  },
  stale_discovery_snapshot: {
    discovery_source_commit: String(
      discovery?.repository?.source_commit || "",
    ),
    current_repository_head: head,
    source_commit_differs_from_head:
      String(discovery?.repository?.source_commit || "") !== head,
    external_agent_runtime_onboarding_available:
      discoveryRuntimeOnboarding,
    external_agent_paid_work_execution_available:
      discoveryPaidWorkExecution,
  },
  historical_credential_request_packet: {
    activation_state:
      String(historicalPacket?.activation_state || ""),
    public_deployment_tag_present:
      typeof historicalPacket?.public_deployment_tag === "string" &&
      historicalPacket.public_deployment_tag.length > 0,
    endpoint_is_tailnet_specific:
      String(historicalPacket?.submission_endpoint || "").includes(
        ".taila47fd.ts.net",
      ),
    credential_created:
      historicalPacket?.credential_created === true,
    work_execution_authorized:
      historicalPacket?.work_execution_authorized === true,
    wc_award_authorized:
      historicalPacket?.wc_award_authorized === true,
  },
  decision:
    "HOLD_CREDENTIALED_EXTERNAL_PAID_WORK_RUNTIME_REQUALIFICATION_REQUIRED",
  ready_for_external_opening_eligible_canary: false,
  blockers,
  components: componentHashes,
};

process.stdout.write(JSON.stringify(output, null, 2) + "\n");
