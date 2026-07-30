import { createHash } from "node:crypto";
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
import { tmpdir } from "node:os";
import path from "node:path";

import {
  EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_ENDPOINT_PREFLIGHT_RECEIPT_MARKER,
  EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_COMMAND_MARKER,
  EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_CONFIG_MARKER,
  EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_CONFIRMATION,
  EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_OPERATOR_DECISION_MARKER,
  EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_PLAN_MARKER,
  VOID_AI_AGENT_DISCOVERY_PATH,
  VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_MARKER,
  executeExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteV1,
  type ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteCommandV1,
  type ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteConfigV1,
  type ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteDependenciesV1,
} from "./external_agent_paid_work_operator_controlled_authenticated_submission_live_canary_prerequisite_v1.js";

import {
  EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_GATE_ID,
  EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_OPERATOR_DECISION_MARKER,
  EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_PLAN_MARKER,
  LIVE_CANARY_CONFIRMATION,
  LIVE_CANARY_RELATIVE_PATH,
} from "./external_agent_paid_work_authenticated_submission_execution_candidate_v1.js";
import {
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

function candidateAuthority(): Record<string, boolean> {
  return {
    local_private_plan_write: true,
    local_private_decision_write: true,
    credential_provider_invocation: false,
    credential_or_token_read: false,
    authorization_header_materialized: false,
    replay_key_reservation_or_consumption: false,
    one_shot_lease_write: false,
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
  };
}

const temporaryRoot = mkdtempSync(
  path.join(tmpdir(), "void-live-canary-prerequisite-v1-"),
);
chmodSync(temporaryRoot, 0o700);

const repositoryRoot = path.join(temporaryRoot, "repository");
const privateInputRoot = path.join(temporaryRoot, "private-input");
const replayStateDirectory = path.join(temporaryRoot, "replay-state");
const leaseStateDirectory = path.join(temporaryRoot, "lease-state");
for (const directory of [
  repositoryRoot,
  privateInputRoot,
  replayStateDirectory,
  leaseStateDirectory,
]) {
  mkdirSync(directory, { mode: 0o700 });
  chmodSync(directory, 0o700);
}

const requestPath = path.join(privateInputRoot, "prepared-request-v1.json");
const executionPlanPath = path.join(
  privateInputRoot,
  "execution-candidate-plan-v1.json",
);
const executionDecisionPath = path.join(
  privateInputRoot,
  "execution-candidate-decision-v1.json",
);
const credentialSourcePath = path.join(
  privateInputRoot,
  "credential-source-v1.token",
);
writeFileSync(credentialSourcePath, "proof-token-never-opened-by-gate\n", {
  encoding: "utf8",
  mode: 0o600,
  flag: "wx",
});
chmodSync(credentialSourcePath, 0o600);
const credentialBefore = readFileSync(credentialSourcePath, "utf8");

const baseOrigin = "https://agent-gateway.example.invalid";
const submissionId = "live-canary-prerequisite-submission-v1";
const workOrderId = `voidawo1_${"a".repeat(64)}`;
const replayKey = "b".repeat(64);
const executionCandidateId = "c".repeat(64);
const credentialReferenceId = "credential-reference-live-canary-proof-v1";
const credentialLocatorSha256 = sha256(path.resolve(credentialSourcePath));
const leaseId = "live-canary-lease-proof-v1";

const request = {
  marker: "VOID_AGENT_PAID_WORK_SUBMISSION_REQUEST_V1",
  version: 1,
  submission_id: submissionId,
  work_order: {
    marker: "VOID_AGENT_PAID_WORK_ORDER_ENVELOPE_V1",
    version: 1,
    work_order_id: workOrderId,
    created_at_utc: "2026-07-30T02:00:00Z",
    expires_at_utc: "2026-07-30T04:00:00Z",
    requester: {
      agent_id: "agent.live.canary.prerequisite.proof.v1",
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
    nonce: "live-canary-prerequisite-order-nonce-0001",
  },
};
writePrivateCanonicalJson(requestPath, request);
const requestBytes = readFileSync(requestPath);
const requestSha256 = sha256(requestBytes);

const executionPlan = {
  marker:
    EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_PLAN_MARKER,
  version: 1,
  gate_id:
    EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_GATE_ID,
  operation_id: "execution-candidate-operation-proof-v1",
  generated_at_utc: "2026-07-30T02:10:00Z",
  expires_at_utc: "2026-07-30T03:00:00Z",
  status: "execution_candidate_validated_separate_operator_canary_required",
  execution_candidate_id: executionCandidateId,
  source_artifacts: {
    activation_plan_path: "/private/activation-plan.json",
    activation_plan_sha256: "d".repeat(64),
    activation_operator_decision_path: "/private/activation-decision.json",
    activation_operator_decision_sha256: "e".repeat(64),
    request_path: requestPath,
    request_sha256: requestSha256,
  },
  bindings: {
    activation_operation_id: "activation-operation-proof-v1",
    base_origin: baseOrigin,
    endpoint_path: PAID_WORK_SUBMISSION_PATH,
    method: "POST",
    content_type: REQUIRED_CONTENT_TYPE,
    submission_id: submissionId,
    work_order_id: workOrderId,
    payload_sha256: requestSha256,
    request_bytes: requestBytes.byteLength,
    replay_key: replayKey,
    credential_reference_id: credentialReferenceId,
  },
  credential_provider_contract: {
    mode: "credential_registry",
    reference_id: credentialReferenceId,
    source_locator_sha256: credentialLocatorSha256,
    expected_scope: "agent_paid_work.submit",
    provider_interface: "open_once_only_after_live_confirmation_then_zeroize",
    opened: false,
    credential_or_token_read: false,
    authorization_header_materialized: false,
  },
  replay_reservation_contract: {
    replay_key: replayKey,
    strategy: "exclusive_create",
    required_before_credential_open: true,
    reservation_written: false,
    reservation_consumed: false,
    terminal_outcomes: [
      "accepted",
      "duplicate",
      "rejected",
      "ambiguous_hold",
    ],
  },
  one_shot_lease_contract: {
    candidate_nonce: "execution-candidate-proof-nonce-0001",
    strategy: "exclusive_create",
    maximum_attempt_count: 1,
    automatic_retry: false,
    lease_written: false,
    attempt_count: 0,
    separate_confirmation: LIVE_CANARY_CONFIRMATION,
  },
  http_contract: {
    origin: baseOrigin,
    path: PAID_WORK_SUBMISSION_PATH,
    method: "POST",
    content_type: REQUIRED_CONTENT_TYPE,
    payload_sha256_header: requestSha256,
    timeout_ms: 15000,
    max_response_bytes: 1048576,
    redirect_mode: "manual",
    credentials_mode: "omit",
    cache_mode: "no-store",
    cookies_sent: false,
    redirects_followed: false,
    automatic_retry: false,
    maximum_attempt_count: 1,
    request_sent: false,
  },
  response_contract: {
    accepted_new_status: 202,
    accepted_duplicate_status: 200,
    conflicting_duplicate_status: 409,
    require_authorization_verified: true,
    require_accepted_for_review: true,
    require_submission_id_binding: true,
    require_work_order_id_binding: true,
    require_request_sha256_binding: true,
    ambiguous_outcome_policy: "hold_manual_reconciliation_no_retry",
    sanitized_receipt_only: true,
  },
  gates: {
    activation_plan_integrity: true,
    activation_decision_integrity: true,
    activation_decision_is_hold: true,
    request_integrity: true,
    endpoint_allowlisted: true,
    activation_window_valid: true,
    candidate_window_bounded: true,
    credential_reference_exact: true,
    replay_key_exact_and_unique_in_snapshot: true,
    execution_candidate_id_unique_in_snapshot: true,
    one_shot_policy_exact: true,
    http_policy_exact: true,
    operator_expect_new: true,
    operator_live_submission_authorized: false,
    separate_operator_live_canary_required: true,
  },
  execution_boundary: {
    credential_provider_invoked: false,
    credential_or_token_read: false,
    authorization_header_materialized: false,
    replay_key_reserved_or_consumed: false,
    one_shot_lease_written: false,
    network_listener_creation: false,
    runtime_mount: false,
    request_sent: false,
    authenticated_submission_post: false,
    live_ticket_issuance: false,
    wc_ledger_write: false,
    wallet_or_signer_access: false,
    service_restart: false,
    deployment: false,
    separate_operator_live_canary_required: true,
  },
};
writePrivateJson(executionPlanPath, executionPlan);
const executionPlanSha256 = sha256(readFileSync(executionPlanPath));

const executionDecision = {
  marker:
    EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_OPERATOR_DECISION_MARKER,
  version: 1,
  gate_id:
    EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_GATE_ID,
  operation_id: executionPlan.operation_id,
  decision: "hold_separate_operator_live_canary_required",
  confirmation_verified: true,
  execution_plan_sha256: executionPlanSha256,
  execution_plan_path: executionPlanPath,
  execution_candidate_id: executionCandidateId,
  replay_key: replayKey,
  credential_reference_id: credentialReferenceId,
  authority: candidateAuthority(),
};
writePrivateJson(executionDecisionPath, executionDecision);

const preflightWithoutHash = {
  marker:
    EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_ENDPOINT_PREFLIGHT_RECEIPT_MARKER,
  version: 1 as const,
  observed_at_utc: "2026-07-30T02:19:30Z",
  base_origin: baseOrigin,
  hostname: "agent-gateway.example.invalid",
  dns_resolved: true,
  tls_required: true,
  tls_verified: true,
  discovery_path: VOID_AI_AGENT_DISCOVERY_PATH,
  discovery_marker: VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_MARKER,
  submission_path: PAID_WORK_SUBMISSION_PATH,
  route_probe_method: "GET",
  route_probe_status: 405,
  authorization_header_present: false,
  request_body_sent: false,
  submission_post_sent: false,
  evidence_nonce: "preflight-evidence-proof-nonce-0001",
} as const;
const endpointPreflight = {
  ...preflightWithoutHash,
  evidence_sha256: sha256(canonicalJson(preflightWithoutHash)),
};

const currentUid = process.getuid?.() ?? lstatSync(credentialSourcePath).uid;

const config:
  ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteConfigV1 =
    {
      marker:
        EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_CONFIG_MARKER,
      version: 1,
      enabled: true,
      allowed_base_origins: [baseOrigin],
      allowed_endpoint_paths: [PAID_WORK_SUBMISSION_PATH],
      max_execution_plan_bytes: 2_097_152,
      max_operator_decision_bytes: 262_144,
      max_request_bytes: 65_536,
      max_prerequisite_ttl_seconds: 600,
      min_remaining_execution_candidate_ttl_seconds: 300,
      max_clock_skew_seconds: 60,
      max_preflight_age_seconds: 120,
      max_known_replay_keys: 32,
      max_known_lease_ids: 32,
      max_credential_file_bytes: 4096,
      max_http_timeout_ms: 30_000,
      max_response_bytes: 1_048_576,
    };

const dependencies:
  ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteDependenciesV1 =
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
  ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteCommandV1 =
    {
      marker:
        EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_COMMAND_MARKER,
      version: 1,
      apply: false,
      confirmation: "",
      operation_id: "live-canary-prerequisite-operation-proof-v1",
      evaluated_at_utc: "2026-07-30T02:20:00Z",
      prerequisite_expires_at_utc: "2026-07-30T02:30:00Z",
      execution_plan_path: executionPlanPath,
      execution_operator_decision_path: executionDecisionPath,
      request_path: requestPath,
      credential_source_path: credentialSourcePath,
      replay_state_directory: replayStateDirectory,
      lease_state_directory: leaseStateDirectory,
      output_directory: path.join(
        temporaryRoot,
        "live-canary-prerequisite-output-dry-run",
      ),
      expected: {
        execution_candidate_operation_id: executionPlan.operation_id,
        execution_candidate_id: executionCandidateId,
        base_origin: baseOrigin,
        endpoint_path: PAID_WORK_SUBMISSION_PATH,
        submission_id: submissionId,
        work_order_id: workOrderId,
        payload_sha256: requestSha256,
        replay_key: replayKey,
        credential_reference_id: credentialReferenceId,
      },
      credential_source: {
        reference_id: credentialReferenceId,
        source_locator_sha256: credentialLocatorSha256,
        expected_scope: "agent_paid_work.submit",
        expected_uid: currentUid,
        expected_mode: 0o600,
        expected_min_bytes: 8,
        expected_max_bytes: 4096,
        inspect_only: true,
      },
      endpoint_preflight: endpointPreflight,
      replay_staging: {
        expected_replay_key: replayKey,
        known_replay_keys: [],
        reservation_file_name: "replay-reservation-proof-v1.json",
        reservation_strategy: "exclusive_create",
        reserve_during_prerequisite: false,
      },
      lease_staging: {
        lease_id: leaseId,
        known_lease_ids: [],
        lease_file_name: "one-shot-lease-proof-v1.json",
        lease_strategy: "exclusive_create",
        write_during_prerequisite: false,
        maximum_attempt_count: 1,
        automatic_retry: false,
      },
      live_canary_contract: {
        tool_relative_path: LIVE_CANARY_RELATIVE_PATH,
        execute_confirmation: LIVE_CANARY_CONFIRMATION,
        execute_stage_required: true,
        allow_live_submit_flag_required: true,
        same_clean_commit_required: true,
        token_file_owner_private_required: true,
        maximum_attempt_count: 1,
        automatic_retry: false,
        ambiguous_outcome_policy: "hold_manual_reconciliation_no_retry",
      },
      operator_intent: {
        expect_new: true,
        confirmation_expires_at_utc: "2026-07-30T02:25:00Z",
        expected_prerequisite_id: null,
        live_canary_authorized: false,
        separate_operator_live_canary_required: true,
      },
    };

try {
  const disabled = await executeExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteV1(
    { ...config, enabled: false },
    commandTemplate,
    dependencies,
  );
  assertCondition(disabled.status === "disabled", "disabled result mismatch");

  const dryRun = await executeExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteV1(
    config,
    commandTemplate,
    dependencies,
  );
  assertCondition(
    dryRun.status === "validated_in_memory"
      && dryRun.prerequisite_id !== null
      && dryRun.plan?.status
        === "live_canary_prerequisites_validated_hold_execution",
    "dry-run result mismatch",
  );
  assertCondition(
    dryRun.plan.credential_source_inspection.opened === false
      && dryRun.plan.credential_source_inspection.bytes_read === 0,
    "credential source was not inspection-only",
  );

  const applyOutput = path.join(
    temporaryRoot,
    "live-canary-prerequisite-output-apply",
  );
  const applied = await executeExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteV1(
    config,
    {
      ...commandTemplate,
      apply: true,
      confirmation:
        EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_CONFIRMATION,
      output_directory: applyOutput,
      operator_intent: {
        ...commandTemplate.operator_intent,
        expected_prerequisite_id: dryRun.prerequisite_id,
      },
    },
    dependencies,
  );
  assertCondition(
    applied.status === "validated_and_written"
      && applied.confirmation_verified
      && applied.artifacts.private_files_written,
    "apply result mismatch",
  );
  assertCondition(mode(applyOutput) === 0o700, "output directory mode mismatch");
  assertCondition(
    applied.artifacts.prerequisite_plan_path !== null
      && applied.artifacts.operator_decision_path !== null
      && mode(applied.artifacts.prerequisite_plan_path) === 0o600
      && mode(applied.artifacts.operator_decision_path) === 0o600,
    "private artifact modes mismatch",
  );
  const writtenPlan = JSON.parse(
    readFileSync(
      applied.artifacts.prerequisite_plan_path,
      "utf8",
    ),
  ) as { marker: string; execution_boundary: Record<string, unknown> };
  const writtenDecision = JSON.parse(
    readFileSync(
      applied.artifacts.operator_decision_path,
      "utf8",
    ),
  ) as { marker: string; decision: string };
  assertCondition(
    writtenPlan.marker
      === EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_PLAN_MARKER,
    "written plan marker mismatch",
  );
  assertCondition(
    writtenDecision.marker
      === EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_OPERATOR_DECISION_MARKER
      && writtenDecision.decision === "hold_live_canary_not_executed",
    "written hold decision mismatch",
  );
  assertCondition(
    Object.entries(writtenPlan.execution_boundary)
      .every(([key, value]) =>
        key === "separate_operator_live_canary_required"
          ? value === true
          : value === false
      ),
    "written execution boundary granted authority",
  );
  assertCondition(
    readFileSync(credentialSourcePath, "utf8") === credentialBefore,
    "credential source content changed",
  );
  assertCondition(
    !existsSync(
      path.join(
        replayStateDirectory,
        commandTemplate.replay_staging.reservation_file_name,
      ),
    )
      && !existsSync(
        path.join(
          leaseStateDirectory,
          commandTemplate.lease_staging.lease_file_name,
        ),
      ),
    "replay or lease state was written",
  );

  await expectReject(
    () =>
      executeExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteV1(
        config,
        {
          ...commandTemplate,
          endpoint_preflight: {
            ...commandTemplate.endpoint_preflight,
            observed_at_utc: "2026-07-30T02:00:00Z",
          },
        },
        dependencies,
      ),
    /evidence SHA-256 mismatch|stale/u,
  );

  await expectReject(
    () =>
      executeExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteV1(
        config,
        {
          ...commandTemplate,
          replay_staging: {
            ...commandTemplate.replay_staging,
            known_replay_keys: [replayKey],
          },
        },
        dependencies,
      ),
    /replay key is already present/u,
  );

  await expectReject(
    () =>
      executeExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteV1(
        config,
        {
          ...commandTemplate,
          lease_staging: {
            ...commandTemplate.lease_staging,
            known_lease_ids: [leaseId],
          },
        },
        dependencies,
      ),
    /lease ID is already present/u,
  );

  chmodSync(credentialSourcePath, 0o644);
  await expectReject(
    () =>
      executeExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteV1(
        config,
        commandTemplate,
        dependencies,
      ),
    /credential source.*permissions|credential source mode mismatch/u,
  );
  chmodSync(credentialSourcePath, 0o600);

  const reservationPath = path.join(
    replayStateDirectory,
    commandTemplate.replay_staging.reservation_file_name,
  );
  writePrivateJson(reservationPath, { reserved: true });
  await expectReject(
    () =>
      executeExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteV1(
        config,
        commandTemplate,
        dependencies,
      ),
    /replay reservation target already exists/u,
  );
  rmSync(reservationPath);

  await expectReject(
    () =>
      executeExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteV1(
        config,
        {
          ...commandTemplate,
          apply: true,
          confirmation: "wrong-confirmation",
        },
        dependencies,
      ),
    /apply confirmation mismatch/u,
  );

  await expectReject(
    () =>
      executeExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteV1(
        config,
        {
          ...commandTemplate,
          operator_intent: {
            ...commandTemplate.operator_intent,
            live_canary_authorized: true,
          },
        },
        dependencies,
      ),
    /operator intent must retain/u,
  );

  const tamperedDecisionPath = path.join(
    privateInputRoot,
    "execution-candidate-decision-tampered-v1.json",
  );
  writePrivateJson(tamperedDecisionPath, {
    ...executionDecision,
    decision: "execute_now",
  });
  await expectReject(
    () =>
      executeExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteV1(
        config,
        {
          ...commandTemplate,
          execution_operator_decision_path: tamperedDecisionPath,
        },
        dependencies,
      ),
    /decision is not held/u,
  );

  process.stdout.write(
    [
      "VOID_EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_V1_PROOF_GREEN",
      "disabled_by_default=true",
      "execution_plan_and_hold_decision_reused=true",
      "paid_work_request_validator_reused=true",
      "credential_source_metadata_inspected=true",
      "credential_source_opened=false",
      "endpoint_preflight_receipt_validated=true",
      "replay_reservation_target_absent=true",
      "one_shot_lease_target_absent=true",
      "private_prerequisite_plan_written=true",
      "operator_decision_hold_written=true",
      "credential_or_token_read=false",
      "authorization_header_materialized=false",
      "replay_key_reserved_or_consumed=false",
      "one_shot_lease_written=false",
      "network_listener_creation=false",
      "runtime_mount=false",
      "authenticated_submission_post=false",
      "live_ticket_issuance=false",
      "wc_ledger_write=false",
      "wallet_or_signer_access=false",
      "VOID_INTERACTIVE_SHELL_STILL_ALIVE",
      "",
    ].join("\n"),
  );
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
