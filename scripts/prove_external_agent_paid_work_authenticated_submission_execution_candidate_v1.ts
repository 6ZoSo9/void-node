import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_COMMAND_MARKER,
  EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_CONFIG_MARKER,
  EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_CONFIRMATION,
  EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_OPERATOR_DECISION_MARKER,
  EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_RESULT_MARKER,
  EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_PLAN_MARKER,
  LIVE_CANARY_CONFIRMATION,
  executeExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateV1,
  type ExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateCommandV1,
  type ExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateConfigV1,
  type ExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateDependenciesV1,
} from "./external_agent_paid_work_authenticated_submission_execution_candidate_v1.js";

import {
  EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PLAN_MARKER,
  EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_GATE_ID,
  EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_OPERATOR_DECISION_MARKER,
  PAID_WORK_SUBMISSION_PATH,
  REQUIRED_CONTENT_TYPE,
} from "./external_agent_paid_work_authenticated_submission_activation_prerequisite_v1.js";

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}

async function expectReject(
  action: () => Promise<unknown>,
  pattern: RegExp,
): Promise<void> {
  let error: unknown = null;
  try {
    await action();
  } catch (caught) {
    error = caught;
  }
  assertCondition(error instanceof Error, "expected action to reject");
  assertCondition(
    pattern.test(error.message),
    `unexpected rejection: ${error.message}`,
  );
}

function canonicalJson(value: unknown): string {
  const normalize = (entry: unknown): unknown => {
    if (Array.isArray(entry)) return entry.map(normalize);
    if (
      entry !== null
      && typeof entry === "object"
      && !Array.isArray(entry)
    ) {
      const record = entry as Record<string, unknown>;
      return Object.fromEntries(
        Object.keys(record)
          .sort()
          .map((key) => [key, normalize(record[key])]),
      );
    }
    return entry;
  };
  return JSON.stringify(normalize(value));
}

function sha256(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function writePrivateJson(pathname: string, value: unknown): void {
  writeFileSync(pathname, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  });
  chmodSync(pathname, 0o600);
}

function writePrivateCanonicalJson(pathname: string, value: unknown): void {
  writeFileSync(pathname, canonicalJson(value), {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  });
  chmodSync(pathname, 0o600);
}

function mode(pathname: string): number {
  return lstatSync(pathname).mode & 0o777;
}

const temporaryRoot = mkdtempSync(
  path.join(tmpdir(), "void-auth-submission-exec-candidate-v1-"),
);
chmodSync(temporaryRoot, 0o700);

const repositoryRoot = path.join(temporaryRoot, "repository");
const privateInputRoot = path.join(temporaryRoot, "private-input");
mkdirSync(repositoryRoot, { mode: 0o700 });
mkdirSync(privateInputRoot, { mode: 0o700 });

const requestPath = path.join(privateInputRoot, "prepared-request-v1.json");
const activationPlanPath = path.join(
  privateInputRoot,
  "activation-plan-v1.json",
);
const activationDecisionPath = path.join(
  privateInputRoot,
  "activation-decision-v1.json",
);

const baseOrigin = "https://agent-gateway.example.invalid";
const submissionId = "execution-candidate-submission-v1";
const workOrderId = `voidawo1_${"a".repeat(64)}`;
const replayKey = "b".repeat(64);
const credentialReferenceId = "credential-reference-execution-candidate-v1";
const credentialLocatorSha256 = "c".repeat(64);

const request = {
  marker: "VOID_AGENT_PAID_WORK_SUBMISSION_REQUEST_V1",
  version: 1,
  submission_id: submissionId,
  work_order: {
    marker: "VOID_AGENT_PAID_WORK_ORDER_ENVELOPE_V1",
    version: 1,
    work_order_id: workOrderId,
    created_at_utc: "2026-07-29T23:00:00Z",
    expires_at_utc: "2026-07-30T01:00:00Z",
    requester: {
      agent_id: "agent.execution.candidate.proof.v1",
      callback_uri: "https://agent.example.invalid/callback",
    },
    service: {
      capability_id: "datanet.fetch_verify",
      objective: "Verify the staged object.",
      input_refs: ["https://public-node.example.invalid/datanet/object-v1"],
      expected_outputs: ["verification-result.json"],
    },
    commercial: {
      quote_asset: "USD",
      max_total: "5.00",
      payment_required_before_execution: true,
    },
    execution_limits: {
      max_runtime_seconds: 300,
      max_output_bytes: 1048576,
      external_side_effects_allowed: false,
      wallet_access_allowed: false,
      money_movement_allowed: false,
    },
    nonce: "execution-candidate-order-nonce-0001",
  },
};
const canonicalRequest = canonicalJson(request);
writePrivateCanonicalJson(requestPath, request);
const requestBytes = readFileSync(requestPath);
const requestSha256 = sha256(requestBytes);

const activationPlan = {
  marker:
    EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PLAN_MARKER,
  version: 1,
  gate_id:
    EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_GATE_ID,
  operation_id: "activation-prerequisite-operation-proof-v1",
  generated_at_utc: "2026-07-29T23:10:00Z",
  expires_at_utc: "2026-07-29T23:50:00Z",
  status: "prerequisites_satisfied_separate_live_execution_required",
  bindings: {
    base_origin: baseOrigin,
    endpoint_path: PAID_WORK_SUBMISSION_PATH,
    method: "POST",
    content_type: REQUIRED_CONTENT_TYPE,
    submission_id: submissionId,
    work_order_id: workOrderId,
    payload_sha256: requestSha256,
    request_bytes: requestBytes.byteLength,
    handoff_sha256: "d".repeat(64),
    replay_key: replayKey,
  },
  credential_reference: {
    mode: "credential_registry",
    reference_id: credentialReferenceId,
    source_locator_sha256: credentialLocatorSha256,
    expected_scope: "agent_paid_work.submit",
    registry_id: "credential-registry-proof-v1",
    credential_id: "credential-proof-v1",
    agent_id: "agent.execution.candidate.proof.v1",
    not_before_utc: "2026-07-29T22:00:00Z",
    expires_at_utc: "2026-07-30T00:30:00Z",
  },
  freshness: {
    handoff_prepared_at_utc: "2026-07-29T23:05:00Z",
    work_order_created_at_utc: "2026-07-29T23:00:00Z",
    work_order_expires_at_utc: "2026-07-30T01:00:00Z",
    evaluated_at_utc: "2026-07-29T23:10:00Z",
    activation_expires_at_utc: "2026-07-29T23:50:00Z",
  },
  replay: {
    nonce: "activation-proof-replay-nonce-0001",
    replay_key: replayKey,
    known_replay_key_count: 0,
    collision_detected: false,
    reservation_written: false,
  },
  gates: {
    handoff_integrity: true,
    request_integrity: true,
    endpoint_allowlisted: true,
    content_type_exact: true,
    payload_digest_exact: true,
    submission_identity_exact: true,
    work_order_identity_exact: true,
    handoff_fresh: true,
    work_order_fresh: true,
    activation_window_bounded: true,
    credential_reference_metadata_valid: true,
    credential_valid_for_activation_window: true,
    replay_key_unique_in_supplied_snapshot: true,
    operator_expect_new: true,
    operator_live_submission_authorized: false,
  },
  execution_boundary: {
    credential_or_token_read: false,
    authorization_header_materialized: false,
    network_listener_creation: false,
    runtime_mount: false,
    request_sent: false,
    authenticated_submission_post: false,
    live_ticket_issuance: false,
    wc_ledger_write: false,
    wallet_or_signer_access: false,
    separate_live_execution_lane_required: true,
  },
};
writePrivateJson(activationPlanPath, activationPlan);
const activationPlanSha256 = sha256(readFileSync(activationPlanPath));

const activationDecision = {
  marker:
    EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_OPERATOR_DECISION_MARKER,
  version: 1,
  gate_id:
    EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_GATE_ID,
  operation_id: activationPlan.operation_id,
  decision: "hold_separate_live_execution_required",
  confirmation_verified: true,
  activation_plan_sha256: activationPlanSha256,
  activation_plan_path: activationPlanPath,
  credential_reference_id: credentialReferenceId,
  replay_key: replayKey,
  authority: {
    local_private_plan_write: true,
    local_private_decision_write: true,
    credential_or_token_read: false,
    authorization_header_materialized: false,
    network_listener_creation: false,
    runtime_mount: false,
    external_http_submission: false,
    authenticated_submission_post: false,
    provider_selection: false,
    quote_creation: false,
    payment_authorization: false,
    payment_execution: false,
    work_execution_authorization: false,
    work_dispatch: false,
    live_ticket_issuance: false,
    work_credit_write: false,
    wallet_or_signer_access: false,
    signing: false,
    transaction_broadcast: false,
    service_restart: false,
    deployment: false,
    money_movement: false,
  },
};
writePrivateJson(activationDecisionPath, activationDecision);

const config:
  ExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateConfigV1 = {
    marker:
      EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_CONFIG_MARKER,
    version: 1,
    enabled: true,
    allowed_base_origins: [baseOrigin],
    allowed_endpoint_paths: [PAID_WORK_SUBMISSION_PATH],
    max_activation_plan_bytes: 1_048_576,
    max_operator_decision_bytes: 262_144,
    max_request_bytes: 65_536,
    max_candidate_ttl_seconds: 600,
    min_remaining_activation_ttl_seconds: 120,
    max_clock_skew_seconds: 60,
    max_known_execution_candidate_ids: 32,
    max_known_replay_keys: 32,
    max_http_timeout_ms: 30_000,
    max_response_bytes: 1_048_576,
  };

const dependencies:
  ExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateDependenciesV1 =
    {
      repositoryRoot: () => repositoryRoot,
      loadPaidWorkClient: async () => ({
        normalizePaidWorkBaseUrlV1: (raw: string) => new URL(raw),
        readPaidWorkSubmissionRequestV1: (rawPath: string) => {
          const bytes = readFileSync(rawPath);
          const value = JSON.parse(bytes.toString("utf8")) as {
            submission_id: string;
            work_order: { work_order_id: string };
          };
          return {
            bytes,
            value,
            submissionId: value.submission_id,
            workOrderId: value.work_order.work_order_id,
            sha256: sha256(bytes),
          };
        },
      }),
    };

const commandTemplate:
  ExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateCommandV1 = {
    marker:
      EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_COMMAND_MARKER,
    version: 1,
    apply: false,
    confirmation: "",
    operation_id: "execution-candidate-operation-proof-v1",
    evaluated_at_utc: "2026-07-29T23:20:00Z",
    candidate_expires_at_utc: "2026-07-29T23:30:00Z",
    activation_plan_path: activationPlanPath,
    activation_operator_decision_path: activationDecisionPath,
    request_path: requestPath,
    output_directory: path.join(
      temporaryRoot,
      "execution-candidate-output-dry-run",
    ),
    expected: {
      activation_operation_id: activationPlan.operation_id,
      base_origin: baseOrigin,
      endpoint_path: PAID_WORK_SUBMISSION_PATH,
      submission_id: submissionId,
      work_order_id: workOrderId,
      payload_sha256: requestSha256,
      replay_key: replayKey,
      credential_reference_id: credentialReferenceId,
    },
    credential_provider: {
      mode: "credential_registry",
      reference_id: credentialReferenceId,
      source_locator_sha256: credentialLocatorSha256,
      expected_scope: "agent_paid_work.submit",
      open_during_candidate: false,
    },
    replay: {
      expected_replay_key: replayKey,
      known_replay_keys: [],
      reservation_strategy: "exclusive_create",
      reserve_during_candidate: false,
    },
    one_shot: {
      candidate_nonce: "execution-candidate-proof-nonce-0001",
      expected_execution_candidate_id: null,
      known_execution_candidate_ids: [],
      lease_strategy: "exclusive_create",
      maximum_attempt_count: 1,
      automatic_retry: false,
    },
    http_policy: {
      method: "POST",
      content_type: REQUIRED_CONTENT_TYPE,
      timeout_ms: 10_000,
      max_response_bytes: 1_048_576,
      redirect_mode: "manual",
      credentials_mode: "omit",
      cache_mode: "no-store",
      accepted_new_status: 202,
      accepted_duplicate_status: 200,
      conflicting_duplicate_status: 409,
      ambiguous_outcome_policy: "hold_manual_reconciliation_no_retry",
    },
    operator_intent: {
      expect_new: true,
      live_submission_authorized: false,
      separate_operator_live_canary_required: true,
    },
  };

const disabled = await executeExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateV1(
  { ...config, enabled: false },
  commandTemplate,
  dependencies,
);
assertCondition(disabled.status === "disabled", "disabled result mismatch");
assertCondition(
  disabled.authority.credential_or_token_read === false
    && disabled.authority.authenticated_submission_post === false,
  "disabled result granted authority",
);

const dryRun = await executeExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateV1(
  config,
  commandTemplate,
  dependencies,
);
assertCondition(
  dryRun.marker
    === EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_RESULT_MARKER,
  "result marker mismatch",
);
assertCondition(
  dryRun.status === "validated_in_memory"
    && dryRun.plan?.marker
      === EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_PLAN_MARKER,
  "dry-run plan mismatch",
);
assertCondition(
  dryRun.execution_candidate_id !== null,
  "execution candidate ID missing",
);
assertCondition(
  dryRun.plan.execution_boundary.credential_provider_invoked === false
    && dryRun.plan.execution_boundary.credential_or_token_read === false
    && dryRun.plan.execution_boundary.authorization_header_materialized
      === false
    && dryRun.plan.execution_boundary.replay_key_reserved_or_consumed
      === false
    && dryRun.plan.execution_boundary.one_shot_lease_written === false
    && dryRun.plan.execution_boundary.request_sent === false
    && dryRun.plan.execution_boundary.authenticated_submission_post === false,
  "dry-run execution boundary mismatch",
);
assertCondition(
  dryRun.plan.one_shot_lease_contract.separate_confirmation
    === LIVE_CANARY_CONFIRMATION,
  "live-canary confirmation binding mismatch",
);
assertCondition(
  !existsSync(commandTemplate.output_directory),
  "dry run wrote private artifacts",
);

const applyOutput = path.join(
  temporaryRoot,
  "execution-candidate-output-apply",
);
const applyCommand = {
  ...commandTemplate,
  apply: true,
  confirmation:
    EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_CONFIRMATION,
  output_directory: applyOutput,
  one_shot: {
    ...commandTemplate.one_shot,
    expected_execution_candidate_id: dryRun.execution_candidate_id,
  },
};

const applied = await executeExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateV1(
  config,
  applyCommand,
  dependencies,
);
assertCondition(
  applied.status === "validated_and_written"
    && applied.confirmation_verified === true,
  "apply result mismatch",
);
assertCondition(
  applied.artifacts.private_files_written === true
    && applied.artifacts.execution_plan_path !== null
    && applied.artifacts.operator_decision_path !== null,
  "apply artifacts missing",
);
assertCondition(mode(applyOutput) === 0o700, "output mode mismatch");
assertCondition(
  mode(applied.artifacts.execution_plan_path) === 0o600
    && mode(applied.artifacts.operator_decision_path) === 0o600,
  "artifact modes mismatch",
);

const storedDecision = JSON.parse(
  readFileSync(
    applied.artifacts.operator_decision_path,
    "utf8",
  ),
) as {
  marker: string;
  decision: string;
  authority: Record<string, boolean>;
};
assertCondition(
  storedDecision.marker
    === EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_OPERATOR_DECISION_MARKER,
  "stored decision marker mismatch",
);
assertCondition(
  storedDecision.decision
    === "hold_separate_operator_live_canary_required",
  "stored decision did not retain hold",
);
for (const [key, value] of Object.entries(storedDecision.authority)) {
  if (
    key === "local_private_plan_write"
    || key === "local_private_decision_write"
  ) {
    assertCondition(value === true, `${key} should be true`);
  } else {
    assertCondition(value === false, `${key} should remain false`);
  }
}

const serializedArtifacts = [
  readFileSync(applied.artifacts.execution_plan_path, "utf8"),
  readFileSync(applied.artifacts.operator_decision_path, "utf8"),
].join("\n");
assertCondition(
  !serializedArtifacts.includes("Bearer ")
    && !serializedArtifacts.includes("token-value")
    && !serializedArtifacts.includes("private-key"),
  "candidate artifacts contain secret-like material",
);

await expectReject(
  () =>
    executeExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateV1(
      config,
      {
        ...applyCommand,
        confirmation: "",
        output_directory: path.join(temporaryRoot, "bad-confirmation"),
      },
      dependencies,
    ),
  /exact execution-candidate confirmation/u,
);

await expectReject(
  () =>
    executeExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateV1(
      { ...config, max_candidate_ttl_seconds: 3600 },
      {
        ...commandTemplate,
        candidate_expires_at_utc: "2026-07-30T00:00:00Z",
      },
      dependencies,
    ),
  /candidate expiry exceeds activation-plan expiry/u,
);

await expectReject(
  () =>
    executeExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateV1(
      config,
      {
        ...commandTemplate,
        replay: {
          ...commandTemplate.replay,
          known_replay_keys: [replayKey],
        },
      },
      dependencies,
    ),
  /replay key is already present/u,
);

await expectReject(
  () =>
    executeExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateV1(
      config,
      {
        ...commandTemplate,
        one_shot: {
          ...commandTemplate.one_shot,
          automatic_retry: true,
        },
      },
      dependencies,
    ),
  /automatic retry must be false/u,
);

await expectReject(
  () =>
    executeExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateV1(
      config,
      {
        ...commandTemplate,
        operator_intent: {
          ...commandTemplate.operator_intent,
          live_submission_authorized: true,
        },
      },
      dependencies,
    ),
  /must not authorize live submission/u,
);

await expectReject(
  () =>
    executeExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateV1(
      config,
      {
        ...commandTemplate,
        credential_provider: {
          ...commandTemplate.credential_provider,
          open_during_candidate: true,
        },
      },
      dependencies,
    ),
  /credential provider must remain closed/u,
);

const tamperedDecisionPath = path.join(
  privateInputRoot,
  "tampered-activation-decision-v1.json",
);
writePrivateJson(tamperedDecisionPath, {
  ...activationDecision,
  activation_plan_sha256: "e".repeat(64),
});
await expectReject(
  () =>
    executeExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateV1(
      config,
      {
        ...commandTemplate,
        activation_operator_decision_path: tamperedDecisionPath,
      },
      dependencies,
    ),
  /does not bind exact activation-plan bytes/u,
);

rmSync(temporaryRoot, { recursive: true, force: true });

console.log(
  "VOID_EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_V1_PROOF_GREEN",
);
console.log("disabled_by_default=true");
console.log("activation_plan_and_hold_decision_reused=true");
console.log("paid_work_request_validator_reused=true");
console.log("credential_provider_contract_only=true");
console.log("replay_reservation_contract_only=true");
console.log("one_shot_lease_contract_only=true");
console.log("http_no_redirect_no_retry_contract=true");
console.log("private_execution_plan_written=true");
console.log("operator_decision_hold_written=true");
console.log("credential_provider_invoked=false");
console.log("credential_or_token_read=false");
console.log("authorization_header_materialized=false");
console.log("replay_key_reserved_or_consumed=false");
console.log("one_shot_lease_written=false");
console.log("network_listener_creation=false");
console.log("runtime_mount=false");
console.log("authenticated_submission_post=false");
console.log("live_ticket_issuance=false");
console.log("wc_ledger_write=false");
console.log("wallet_or_signer_access=false");
console.log("VOID_INTERACTIVE_SHELL_STILL_ALIVE");
