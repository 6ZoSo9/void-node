#!/usr/bin/env node
// VOID_AGENT_PAID_WORK_CREDENTIALED_EXTERNAL_READINESS_V1
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

export const VOID_AGENT_PAID_WORK_CREDENTIALED_EXTERNAL_READINESS_V1 =
  "VOID_AGENT_PAID_WORK_CREDENTIALED_EXTERNAL_READINESS_V1";

const MARKER = VOID_AGENT_PAID_WORK_CREDENTIALED_EXTERNAL_READINESS_V1;
const ISSUE = 2382;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GIT = "/usr/bin/git";
const HEX40 = /^[0-9a-f]{40}$/u;
const MAX_SOURCE_BYTES = 16 * 1024 * 1024;

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

const GIT_SAFETY_ARGS = Object.freeze([
  "-c", "core.hooksPath=/dev/null",
  "-c", "core.attributesFile=/dev/null",
  "-c", "core.fsmonitor=false",
  "-c", "core.untrackedCache=false",
  "-c", "core.preloadIndex=false",
  "-c", "submodule.recurse=false",
]);

function fail(message) {
  throw new Error(message);
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function gitBlobSha1(bytes) {
  return crypto
    .createHash("sha1")
    .update(Buffer.from("blob " + String(bytes.length) + "\0", "utf8"))
    .update(bytes)
    .digest("hex");
}

function gitEnv() {
  return {
    PATH: "/usr/bin:/bin",
    HOME: "/nonexistent",
    XDG_CONFIG_HOME: "/nonexistent",
    LANG: "C",
    LC_ALL: "C",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_ATTR_NOSYSTEM: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_NO_LAZY_FETCH: "1",
    GIT_TERMINAL_PROMPT: "0",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_ASKPASS: "/bin/false",
  };
}

function gitRun(args, code, { encoding = "utf8" } = {}) {
  const result = spawnSync(
    GIT,
    ["--no-replace-objects", ...GIT_SAFETY_ARGS, "-C", ROOT, ...args],
    {
      encoding,
      env: gitEnv(),
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: MAX_SOURCE_BYTES * 4,
      timeout: 60_000,
    },
  );
  if (result.error || result.status !== 0) {
    fail(code);
  }
  return result.stdout;
}

function gitText(args, code) {
  return String(gitRun(args, code) || "").trim();
}

function repositoryIdentity() {
  const head = gitText(
    ["rev-parse", "HEAD"],
    "repository_head_unavailable",
  );
  const tree = gitText(
    ["rev-parse", "HEAD^{tree}"],
    "repository_tree_unavailable",
  );
  if (!HEX40.test(head) || !HEX40.test(tree)) {
    fail("repository_identity_invalid");
  }
  return Object.freeze({ head, tree });
}

function readStableWorktree(relativePath, expectedBlob) {
  const file = path.join(ROOT, relativePath);
  const fd = fs.openSync(
    file,
    fs.constants.O_RDONLY | Number(fs.constants.O_NOFOLLOW || 0),
  );
  try {
    const before = fs.fstatSync(fd);
    if (
      !before.isFile() ||
      before.nlink !== 1 ||
      before.size < 1 ||
      before.size > MAX_SOURCE_BYTES
    ) {
      fail("invalid_source_file:" + relativePath);
    }
    const bytes = Buffer.alloc(before.size);
    let offset = 0;
    while (offset < bytes.length) {
      const count = fs.readSync(
        fd,
        bytes,
        offset,
        bytes.length - offset,
        offset,
      );
      if (count <= 0) fail("short_source_read:" + relativePath);
      offset += count;
    }
    const after = fs.fstatSync(fd);
    for (const key of ["dev", "ino", "size", "mtimeMs", "ctimeMs"]) {
      if (before[key] !== after[key]) {
        fail("source_changed_during_read:" + relativePath);
      }
    }
    if (gitBlobSha1(bytes) !== expectedBlob) {
      fail("worktree_head_blob_mismatch:" + relativePath);
    }
    return bytes;
  } finally {
    fs.closeSync(fd);
  }
}

function readHeadComponent(repository, relativePath) {
  const bytes = Buffer.from(
    gitRun(
      ["show", repository.head + ":" + relativePath],
      "head_source_unavailable:" + relativePath,
      { encoding: null },
    ) || Buffer.alloc(0),
  );
  if (bytes.length < 1 || bytes.length > MAX_SOURCE_BYTES) {
    fail("head_source_size_invalid:" + relativePath);
  }
  const blob = gitText(
    ["rev-parse", repository.head + ":" + relativePath],
    "head_blob_unavailable:" + relativePath,
  );
  if (!HEX40.test(blob) || gitBlobSha1(bytes) !== blob) {
    fail("head_blob_identity_invalid:" + relativePath);
  }
  readStableWorktree(relativePath, blob);
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail("source_utf8_invalid:" + relativePath);
  }
  return Object.freeze({
    path: relativePath,
    text,
    sha256: sha256(bytes),
    git_blob_sha1: blob,
  });
}

function assertRepositoryStable(repository) {
  const after = repositoryIdentity();
  if (after.head !== repository.head || after.tree !== repository.tree) {
    fail("repository_changed_during_census");
  }
}

function stripComments(source) {
  let output = "";
  let state = "code";
  let quote = "";
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1] || "";
    if (state === "line") {
      if (char === "\n") {
        state = "code";
        output += "\n";
      } else {
        output += " ";
      }
      continue;
    }
    if (state === "block") {
      if (char === "*" && next === "/") {
        output += "  ";
        index += 1;
        state = "code";
      } else {
        output += char === "\n" ? "\n" : " ";
      }
      continue;
    }
    if (state === "string") {
      output += char;
      if (char === "\\") {
        if (index + 1 < source.length) {
          output += source[index + 1];
          index += 1;
        }
        continue;
      }
      if (char === quote) {
        state = "code";
        quote = "";
      }
      continue;
    }
    if (char === "/" && next === "/") {
      output += "  ";
      index += 1;
      state = "line";
      continue;
    }
    if (char === "/" && next === "*") {
      output += "  ";
      index += 1;
      state = "block";
      continue;
    }
    if (char === "'" || char === '"' || char.charCodeAt(0) === 96) {
      output += char;
      state = "string";
      quote = char;
      continue;
    }
    output += char;
  }
  return output;
}

function matchExactlyOne(source, regex, label) {
  const matches = [...source.matchAll(regex)];
  if (matches.length !== 1) {
    fail(label + "_contract_match_count:" + String(matches.length));
  }
  return matches[0];
}

function requireCodeTokens(source, tokens, label) {
  const code = stripComments(source);
  for (const token of tokens) {
    if (!code.includes(token)) {
      fail("missing_" + label + "_code_token:" + token);
    }
  }
}

function allBooleanProperties(source, property, expected, label) {
  const regex = new RegExp(
    "\\b" + property + "\\s*:\\s*(true|false)\\b",
    "gu",
  );
  const values = [...source.matchAll(regex)].map((match) => match[1]);
  if (values.length < 1 || values.some((value) => value !== expected)) {
    fail(label + "_authority_changed");
  }
  return values.length;
}

export function evaluateCredentialRequestGatewayContractV1(source) {
  const code = stripComments(source);
  const pathMatch = matchExactlyOne(
    code,
    /export\s+const\s+AGENT_PAID_WORK_CREDENTIAL_REQUEST_PATH\s*=\s*"([^"]+)"\s+as\s+const\s*;/gu,
    "credential_request_gateway_path",
  );
  if (pathMatch[1] !== "/__void/agents/paid-work/credential-requests/v1") {
    fail("credential_request_gateway_path_changed");
  }

  matchExactlyOne(
    code,
    /value\.listen_host\s*===\s*"127\.0\.0\.1"/gu,
    "credential_request_gateway_loopback",
  );
  matchExactlyOne(
    code,
    /pathname\s*!==\s*AGENT_PAID_WORK_CREDENTIAL_REQUEST_PATH/gu,
    "credential_request_gateway_route_guard",
  );
  matchExactlyOne(
    code,
    /\breceiveAgentPaidWorkCredentialRequestV1\s*\(\s*\{/gu,
    "credential_request_gateway_intake_call",
  );

  const issuanceChecks = allBooleanProperties(
    code,
    "credential_issuance_authorized",
    "false",
    "credential_request_gateway_credential_issuance",
  );
  allBooleanProperties(
    code,
    "credential_registry_mutation_authorized",
    "false",
    "credential_request_gateway_registry_mutation",
  );
  allBooleanProperties(
    code,
    "receiver_restart_authorized",
    "false",
    "credential_request_gateway_receiver_restart",
  );

  return Object.freeze({
    request_path: pathMatch[1],
    source_ready: true,
    loopback_only: true,
    review_only_issuance_authority: true,
    credential_issuance_false_witness_count: issuanceChecks,
  });
}

export function evaluatePublicSubmissionGatewayContractV1(source) {
  const code = stripComments(source);

  matchExactlyOne(
    code,
    /const\s+AGENT_PAID_WORK_SUBMISSION_RECEIVER_UPSTREAM_RAW\s*=\s*String\(\s*process\.env\.VOID_AGENT_PAID_WORK_SUBMISSION_RECEIVER_UPSTREAM\s*\|\|\s*""\s*,?\s*\)\.trim\(\)\s*;/gu,
    "public_submission_upstream_default",
  );
  const pathMatch = matchExactlyOne(
    code,
    /const\s+AGENT_PAID_WORK_SUBMISSION_RECEIVER_PATH\s*=\s*"([^"]+)"\s*;/gu,
    "public_submission_path",
  );
  if (pathMatch[1] !== "/__void/agents/paid-work/submissions/v1") {
    fail("public_submission_path_changed");
  }

  matchExactlyOne(
    code,
    /const\s+AGENT_PAID_WORK_SUBMISSION_RECEIVER_UPSTREAM\s*=\s*parseReviewedLoopbackUpstream\(\s*AGENT_PAID_WORK_SUBMISSION_RECEIVER_UPSTREAM_RAW\s*,\s*"VOID_AGENT_PAID_WORK_SUBMISSION_RECEIVER_UPSTREAM"\s*,?\s*\)\s*;/gu,
    "public_submission_loopback_binding",
  );
  matchExactlyOne(
    code,
    /parsed\.hostname\s*!==\s*"127\.0\.0\.1"/gu,
    "public_submission_loopback_parser",
  );
  matchExactlyOne(
    code,
    /parsed\.pathname\s*===\s*AGENT_PAID_WORK_SUBMISSION_RECEIVER_PATH/gu,
    "public_submission_route",
  );
  matchExactlyOne(
    code,
    /await\s+proxyAgentPaidWorkSubmission\s*\(\s*request\s*,\s*response\s*,\s*parsed\s*,?\s*\)/gu,
    "public_submission_route_handler",
  );
  matchExactlyOne(
    code,
    /if\s*\(\s*!AGENT_PAID_WORK_SUBMISSION_RECEIVER_UPSTREAM\s*\)/gu,
    "public_submission_default_off_guard",
  );
  matchExactlyOne(
    code,
    /url\.pathname\s*!==\s*AGENT_PAID_WORK_SUBMISSION_RECEIVER_PATH/gu,
    "public_submission_proxy_path_guard",
  );
  matchExactlyOne(
    code,
    /\x60\$\{AGENT_PAID_WORK_SUBMISSION_RECEIVER_UPSTREAM\}\$\{AGENT_PAID_WORK_SUBMISSION_RECEIVER_PATH\}\x60/gu,
    "public_submission_exact_upstream_target",
  );

  return Object.freeze({
    submission_path: pathMatch[1],
    source_wired: true,
    activation_default_off: true,
    loopback_upstream_only: true,
  });
}

function frozenObjectBody(source, declaration, label) {
  const code = stripComments(source);
  const startToken = "const " + declaration + " = Object.freeze({";
  const start = code.indexOf(startToken);
  if (start < 0 || code.indexOf(startToken, start + 1) >= 0) {
    fail(label + "_object_declaration_invalid");
  }
  const bodyStart = start + startToken.length;
  const end = code.indexOf("\n});", bodyStart);
  if (end < 0) fail(label + "_object_end_missing");
  return code.slice(bodyStart, end);
}

function exactStringProperty(body, property, label) {
  const match = matchExactlyOne(
    body,
    new RegExp("\\b" + property + "\\s*:\\s*\"([^\"]+)\"\\s*,", "gu"),
    label + "_" + property,
  );
  return match[1];
}

function exactBooleanProperty(body, property, label) {
  const match = matchExactlyOne(
    body,
    new RegExp("\\b" + property + "\\s*:\\s*(true|false)\\s*,", "gu"),
    label + "_" + property,
  );
  return match[1] === "true";
}

export function evaluateOpeningEligibilityContractV1(source) {
  const body = frozenObjectBody(
    source,
    "POLICY_PAYLOAD",
    "opening_eligibility_policy",
  );
  const identitySource = exactStringProperty(
    body,
    "identity_source",
    "opening_eligibility_policy",
  );
  const earningSource = exactStringProperty(
    body,
    "earning_source",
    "opening_eligibility_policy",
  );
  const activeCredentialRequired = exactBooleanProperty(
    body,
    "active_credential_required",
    "opening_eligibility_policy",
  );
  if (
    identitySource !== "active_paid_work_credential_wc_account_binding_v1" ||
    earningSource !== "agent_paid_work_wc_earning_adapter_receipt_v1" ||
    activeCredentialRequired !== true
  ) {
    fail("opening_eligibility_policy_contract_changed");
  }
  return Object.freeze({
    identity_source: identitySource,
    earning_source: earningSource,
    active_credential_required: activeCredentialRequired,
  });
}

export function detectPublicCredentialRequestProxyV1(source) {
  const code = stripComments(source);
  const pathToken = "/__void/agents/paid-work/credential-requests/v1";
  if (!code.includes(pathToken)) return false;
  return (
    /VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_[A-Z0-9_]*UPSTREAM/u.test(code) &&
    /proxyAgentPaidWorkCredentialRequest/u.test(code) &&
    /parsed\.pathname\s*===\s*[A-Z0-9_]*CREDENTIAL_REQUEST[A-Z0-9_]*PATH/u.test(code)
  );
}

export function buildVoidAgentPaidWorkCredentialedExternalReadinessV1() {
  const repository = repositoryIdentity();
  const components = Object.fromEntries(
    Object.entries(FILES).map(([key, relativePath]) => [
      key,
      readHeadComponent(repository, relativePath),
    ]),
  );
  const sources = Object.fromEntries(
    Object.entries(components).map(([key, value]) => [key, value.text]),
  );

  const credentialGateway =
    evaluateCredentialRequestGatewayContractV1(
      sources.credential_request_gateway,
    );
  const publicSubmission =
    evaluatePublicSubmissionGatewayContractV1(sources.public_gateway);
  const openingPolicy =
    evaluateOpeningEligibilityContractV1(sources.opening_eligibility);

  requireCodeTokens(
    sources.credential_request_review_queue,
    ["agent_paid_work_submit", "decision"],
    "credential_request_review_queue",
  );
  requireCodeTokens(
    sources.credential_lifecycle,
    ["stage-issue", "apply-agent-paid-work-credential-lifecycle-v1"],
    "credential_lifecycle",
  );
  requireCodeTokens(
    sources.credential_wc_binding,
    [
      "VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_LIFECYCLE_V1",
      "VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_REGISTRY_V1",
    ],
    "credential_wc_binding",
  );
  requireCodeTokens(
    sources.credential_registry,
    [
      "AGENT_PAID_WORK_CREDENTIAL_REGISTRY_MARKER",
      "AGENT_PAID_WORK_SUBMIT_SCOPE",
      '"agent_paid_work_submit" as const',
      "authenticateAgentPaidWorkCredentialV1",
    ],
    "credential_registry",
  );
  requireCodeTokens(
    sources.submission_receiver,
    [
      "VOID_AGENT_PAID_WORK_SUBMISSION",
      "AGENT_PAID_WORK_SUBMIT_SCOPE",
      "authenticateAgentPaidWorkCredentialV1",
      "parseAgentPaidWorkCredentialRegistryV1",
    ],
    "submission_receiver",
  );
  requireCodeTokens(
    sources.wc_earning_adapter,
    [
      "VOID_AGENT_PAID_WORK_WC_EARNING_ADAPTER_RECEIPT_V1",
      "voidapwear1_",
    ],
    "wc_earning_adapter",
  );

  let discovery;
  let historicalPacket;
  try {
    discovery = JSON.parse(sources.public_discovery);
    historicalPacket = JSON.parse(sources.historical_credential_packet);
  } catch {
    fail("readiness_json_source_invalid");
  }

  const credentialRequestPath = credentialGateway.request_path;
  const submissionPath = publicSubmission.submission_path;
  const publicCredentialRequestProxyWired =
    detectPublicCredentialRequestProxyV1(sources.public_gateway);

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
    Object.entries(components).map(([key, value]) => [
      key,
      {
        path: value.path,
        git_blob_sha1: value.git_blob_sha1,
        sha256: value.sha256,
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

  assertRepositoryStable(repository);

  return Object.freeze({
    marker: MARKER,
    version: 1,
    issue: ISSUE,
    repository_head: repository.head,
    repository_tree: repository.tree,
    exact_head_git_object_source_census: true,
    worktree_component_bytes_match_head: true,
    read_only_source_census: true,
    network_access: false,
    credential_or_token_read: false,
    private_key_access: false,
    runtime_or_service_mutation: false,
    wc_mutation: false,
    chain2050_mutation: false,
    funds_movement: false,
    source_lineage: Object.freeze({
      credential_request_gateway_source_ready:
        credentialGateway.source_ready,
      credential_request_gateway_loopback_only:
        credentialGateway.loopback_only,
      credential_request_gateway_review_only_issuance:
        credentialGateway.review_only_issuance_authority,
      credential_request_review_queue_source_ready: true,
      credential_lifecycle_source_ready: true,
      credential_wc_account_binding_source_ready: true,
      credential_registry_source_ready: true,
      authenticated_submission_receiver_source_ready: true,
      public_submission_proxy_source_wired:
        publicSubmission.source_wired,
      public_submission_proxy_loopback_upstream_only:
        publicSubmission.loopback_upstream_only,
      wc_earning_adapter_source_ready: true,
      opening_policy_compatible_identity_source:
        openingPolicy.identity_source,
      opening_policy_compatible_earning_source:
        openingPolicy.earning_source,
      opening_policy_active_credential_required:
        openingPolicy.active_credential_required,
    }),
    public_ingress: Object.freeze({
      credential_request_path: credentialRequestPath,
      credential_request_proxy_wired_in_canonical_public_gateway:
        publicCredentialRequestProxyWired,
      submission_path: submissionPath,
      submission_proxy_source_wired: publicSubmission.source_wired,
      submission_proxy_activation_default_off:
        publicSubmission.activation_default_off,
    }),
    stale_discovery_snapshot: Object.freeze({
      discovery_source_commit: String(
        discovery?.repository?.source_commit || "",
      ),
      current_repository_head: repository.head,
      source_commit_differs_from_head:
        String(discovery?.repository?.source_commit || "") !== repository.head,
      external_agent_runtime_onboarding_available:
        discoveryRuntimeOnboarding,
      external_agent_paid_work_execution_available:
        discoveryPaidWorkExecution,
    }),
    historical_credential_request_packet: Object.freeze({
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
    }),
    decision:
      "HOLD_CREDENTIALED_EXTERNAL_PAID_WORK_RUNTIME_REQUALIFICATION_REQUIRED",
    ready_for_external_opening_eligible_canary: false,
    blockers: Object.freeze(blockers),
    components: Object.freeze(componentHashes),
  });
}

const direct =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (direct) {
  try {
    process.stdout.write(
      JSON.stringify(
        buildVoidAgentPaidWorkCredentialedExternalReadinessV1(),
        null,
        2,
      ) + "\n",
    );
  } catch (error) {
    process.stderr.write(
      "VOID_AGENT_PAID_WORK_CREDENTIALED_EXTERNAL_READINESS_V1_HOLD\n",
    );
    process.stderr.write(
      "reason=" +
        (error instanceof Error ? error.message : String(error)) +
        "\n",
    );
    process.exitCode = 2;
  }
}
