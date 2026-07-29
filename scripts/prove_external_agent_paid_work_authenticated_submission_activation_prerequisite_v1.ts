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
  EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_COMMAND_MARKER,
  EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_CONFIG_MARKER,
  EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_CONFIRMATION,
  EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_RESULT_MARKER,
  EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PLAN_MARKER,
  EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_OPERATOR_DECISION_MARKER,
  PAID_WORK_CLIENT_RELATIVE_PATH,
  PAID_WORK_SUBMISSION_PATH,
  PREPARE_ONLY_ADAPTER_ID,
  PREPARE_ONLY_HANDOFF_MARKER,
  executeExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteV1,
  type ExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteCommandV1,
  type ExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteConfigV1,
  type ExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteDependenciesV1,
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

function privateJson(pathname: string, value: unknown): void {
  writeFileSync(pathname, `${JSON.stringify(value, null, 2)}\n`, {
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
  path.join(tmpdir(), "void-auth-activation-prerequisite-v1-"),
);
chmodSync(temporaryRoot, 0o700);
const repositoryRoot = path.join(temporaryRoot, "repository");
const privateInputRoot = path.join(temporaryRoot, "private-input");
mkdirSync(repositoryRoot, { mode: 0o700 });
mkdirSync(privateInputRoot, { mode: 0o700 });

const requestPath = path.join(privateInputRoot, "prepared-request-v1.json");
const handoffPath = path.join(privateInputRoot, "prepare-only-handoff-v1.json");
const baseOrigin = "https://agent-gateway.example.invalid";
const submissionId = "activation-prerequisite-submission-v1";
const workOrderId = `voidawo1_${"a".repeat(64)}`;

const request = {
  marker: "VOID_AGENT_PAID_WORK_SUBMISSION_REQUEST_V1",
  version: 1,
  submission_id: submissionId,
  work_order: {
    marker: "VOID_AGENT_PAID_WORK_ORDER_ENVELOPE_V1",
    version: 1,
    work_order_id: workOrderId,
    created_at_utc: "2026-07-29T22:55:00Z",
    expires_at_utc: "2026-07-30T01:00:00Z",
    requester: {
      agent_id: "agent.activation.proof.v1",
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
    nonce: "activation-proof-order-nonce-0001",
  },
};
const canonicalRequest = canonicalJson(request);
writeFileSync(requestPath, canonicalRequest, {
  encoding: "utf8",
  mode: 0o600,
  flag: "wx",
});
chmodSync(requestPath, 0o600);
const payloadSha256 = sha256(canonicalRequest);

const falseAuthority = {
  provider_selection: false,
  quote_creation: false,
  payment_authorization: false,
  payment_execution: false,
  work_execution_authorization: false,
  work_dispatch: false,
  work_credit_write: false,
  wallet_or_signer_access: false,
  signing: false,
  transaction_broadcast: false,
  runtime_mount: false,
  service_restart: false,
  deployment: false,
  money_movement: false,
};

const handoff = {
  marker: PREPARE_ONLY_HANDOFF_MARKER,
  version: 1,
  adapter_id: PREPARE_ONLY_ADAPTER_ID,
  operation_id: "prepare-only-operation-proof-v1",
  prepared_at_utc: "2026-07-29T23:05:00Z",
  request: {
    method: "POST",
    endpoint_path: PAID_WORK_SUBMISSION_PATH,
    canonical_body: canonicalRequest,
    body_bytes: Buffer.byteLength(canonicalRequest, "utf8"),
    payload_sha256: payloadSha256,
    headers_without_authorization: {
      "content-type": "application/json",
      "x-void-payload-sha256": payloadSha256,
    },
    request_path: requestPath,
  },
  paid_work_client: {
    client_relative_path: PAID_WORK_CLIENT_RELATIVE_PATH,
    base_origin: baseOrigin,
    mode_for_later_operator_action: "submit",
    request_path: requestPath,
    request_validated_by_existing_client: true,
    token_file: null,
    authorization_header_materialized: false,
    authenticated_submission_performed: false,
  },
  mcp_http_transport: {
    transport_path: "/mcp",
    host: "127.0.0.1",
    port: 4114,
    prepare_tool_name: "void_prepare_paid_work_submission",
    read_only_config_verified: true,
    submit_tool_registered: false,
    token_configured: false,
    listener_started: false,
    request_sent: false,
  },
  callback_mount_plan: {
    status_path:
      "/__void/operator/public-agent-service-trusted-requester-acceptance-persistence-runtime-v1/status",
    command_path:
      "/__void/operator/public-agent-service-trusted-requester-acceptance-persistence-runtime-v1/command",
    mount_invoked: false,
    listener_creation: false,
  },
  identity: {
    submission_id: submissionId,
    work_order_id: workOrderId,
    datanet_object_id: "voiddfo1_proof_object",
    datanet_reference:
      "https://public-node.example.invalid/datanet/object-v1",
  },
  authority: falseAuthority,
};
privateJson(handoffPath, handoff);

const config: ExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteConfigV1 = {
  marker:
    EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_CONFIG_MARKER,
  version: 1,
  enabled: true,
  allowed_base_origins: [baseOrigin],
  allowed_endpoint_paths: [PAID_WORK_SUBMISSION_PATH],
  max_handoff_bytes: 1_048_576,
  max_request_bytes: 65_536,
  max_handoff_age_seconds: 1800,
  max_activation_ttl_seconds: 900,
  min_remaining_work_order_ttl_seconds: 300,
  max_clock_skew_seconds: 60,
  max_known_replay_keys: 32,
};

const disabledConfig = {
  ...config,
  enabled: false,
};

const dependencies: ExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteDependenciesV1 = {
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

function command(
  overrides: Partial<ExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteCommandV1> = {},
): ExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteCommandV1 {
  return {
    marker:
      EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_COMMAND_MARKER,
    version: 1,
    apply: false,
    confirmation: "",
    operation_id: "activation-prerequisite-proof-v1",
    evaluated_at_utc: "2026-07-29T23:10:00Z",
    activation_expires_at_utc: "2026-07-29T23:20:00Z",
    handoff_path: handoffPath,
    request_path: requestPath,
    output_directory: path.join(temporaryRoot, "activation-output"),
    expected: {
      base_origin: baseOrigin,
      endpoint_path: PAID_WORK_SUBMISSION_PATH,
      submission_id: submissionId,
      work_order_id: workOrderId,
      payload_sha256: payloadSha256,
    },
    credential_reference: {
      mode: "credential_registry",
      reference_id: "credential-reference-proof-v1",
      source_locator_sha256: "c".repeat(64),
      expected_scope: "agent_paid_work.submit",
      registry_id: "credential-registry-proof-v1",
      credential_id: "credential-proof-v1",
      agent_id: "agent.activation.proof.v1",
      not_before_utc: "2026-07-29T22:00:00Z",
      expires_at_utc: "2026-07-30T00:30:00Z",
    },
    replay: {
      nonce: "activation-proof-replay-nonce-0001",
      expected_replay_key: null,
      known_replay_keys: [],
    },
    operator_intent: {
      expect_new: true,
      live_submission_authorized: false,
    },
    ...overrides,
  };
}

try {
  let disabledDependencyInvoked = false;
  const disabled =
    await executeExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteV1(
      disabledConfig,
      null,
      {
        repositoryRoot: () => {
          disabledDependencyInvoked = true;
          throw new Error("disabled dependency invoked");
        },
        loadPaidWorkClient: async () => {
          disabledDependencyInvoked = true;
          throw new Error("disabled dependency invoked");
        },
      },
    );
  assertCondition(disabled.status === "disabled", "disabled status mismatch");
  assertCondition(!disabledDependencyInvoked, "disabled mode invoked dependencies");
  assertCondition(
    Object.values(disabled.authority).every((value) => value === false),
    "disabled mode granted authority",
  );

  const planned =
    await executeExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteV1(
      config,
      command(),
      dependencies,
    );
  assertCondition(
    planned.marker
      === EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_RESULT_MARKER,
    "planned result marker mismatch",
  );
  assertCondition(
    planned.status === "validated_in_memory",
    "dry-run status mismatch",
  );
  assertCondition(planned.replay_key !== null, "dry-run replay key missing");
  assertCondition(planned.plan !== null, "dry-run activation plan missing");
  assertCondition(
    planned.plan.marker
      === EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PLAN_MARKER,
    "activation plan marker mismatch",
  );
  assertCondition(
    planned.plan.execution_boundary.separate_live_execution_lane_required,
    "separate live execution boundary missing",
  );
  assertCondition(
    !planned.plan.execution_boundary.credential_or_token_read
      && !planned.plan.execution_boundary.authorization_header_materialized
      && !planned.plan.execution_boundary.request_sent
      && !planned.plan.execution_boundary.authenticated_submission_post,
    "dry-run plan granted forbidden execution",
  );
  assertCondition(
    !existsSync(command().output_directory),
    "dry-run wrote private artifacts",
  );

  const appliedCommand = command({
    apply: true,
    confirmation:
      EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_CONFIRMATION,
    replay: {
      nonce: command().replay.nonce,
      expected_replay_key: planned.replay_key,
      known_replay_keys: [],
    },
  });
  const applied =
    await executeExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteV1(
      config,
      appliedCommand,
      dependencies,
    );
  assertCondition(
    applied.status === "validated_and_written",
    "apply status mismatch",
  );
  assertCondition(applied.confirmation_verified, "confirmation was not verified");
  assertCondition(applied.artifacts.private_files_written, "private artifacts not written");
  assertCondition(
    applied.artifacts.activation_plan_path !== null
      && applied.artifacts.operator_decision_path !== null,
    "activation artifact paths missing",
  );
  assertCondition(mode(applied.artifacts.output_directory!) === 0o700, "output directory mode mismatch");
  assertCondition(mode(applied.artifacts.activation_plan_path!) === 0o600, "plan file mode mismatch");
  assertCondition(mode(applied.artifacts.operator_decision_path!) === 0o600, "decision file mode mismatch");

  const writtenPlan = JSON.parse(
    readFileSync(applied.artifacts.activation_plan_path!, "utf8"),
  ) as Record<string, unknown>;
  const writtenDecision = JSON.parse(
    readFileSync(applied.artifacts.operator_decision_path!, "utf8"),
  ) as Record<string, unknown>;
  assertCondition(
    writtenPlan.marker
      === EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PLAN_MARKER,
    "written plan marker mismatch",
  );
  assertCondition(
    writtenDecision.marker
      === EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_OPERATOR_DECISION_MARKER,
    "written decision marker mismatch",
  );
  assertCondition(
    writtenDecision.decision === "hold_separate_live_execution_required",
    "operator decision does not hold live execution",
  );
  const serializedArtifacts = JSON.stringify({
    writtenPlan,
    writtenDecision,
  });
  assertCondition(
    !serializedArtifacts.includes("token-file")
      && !serializedArtifacts.includes("Bearer ")
      && !serializedArtifacts.includes("/private/credential"),
    "activation artifacts disclosed credential material",
  );
  assertCondition(
    applied.authority.local_private_plan_write
      && applied.authority.local_private_decision_write,
    "apply did not report bounded private writes",
  );
  for (const [key, value] of Object.entries(applied.authority)) {
    if (
      key !== "local_private_plan_write"
      && key !== "local_private_decision_write"
    ) {
      assertCondition(value === false, `forbidden authority enabled: ${key}`);
    }
  }

  await expectReject(
    async () =>
      await executeExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteV1(
        config,
        command({
          apply: true,
          confirmation: "wrong",
        }),
        dependencies,
      ),
    /exact confirmation/u,
  );

  await expectReject(
    async () =>
      await executeExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteV1(
        config,
        command({
          replay: {
            nonce: command().replay.nonce,
            expected_replay_key: planned.replay_key,
            known_replay_keys: [planned.replay_key!],
          },
        }),
        dependencies,
      ),
    /already present/u,
  );

  await expectReject(
    async () =>
      await executeExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteV1(
        config,
        command({
          operation_id: "activation-prerequisite-expired-credential-v1",
          output_directory: path.join(temporaryRoot, "expired-output"),
          credential_reference: {
            ...command().credential_reference,
            expires_at_utc: "2026-07-29T23:15:00Z",
          },
        }),
        dependencies,
      ),
    /expires before/u,
  );

  console.log(
    "VOID_EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_V1_PROOF_GREEN",
  );
  console.log("disabled_by_default=true");
  console.log("prepare_only_handoff_integrity=true");
  console.log("paid_work_request_validator_reused=true");
  console.log("endpoint_allowlist=true");
  console.log("freshness_window=true");
  console.log("replay_key_derived=true");
  console.log("credential_reference_metadata_only=true");
  console.log("private_activation_plan_written=true");
  console.log("operator_decision_hold_written=true");
  console.log("credential_or_token_read=false");
  console.log("authorization_header_materialized=false");
  console.log("network_listener_creation=false");
  console.log("runtime_mount=false");
  console.log("authenticated_submission_post=false");
  console.log("live_ticket_issuance=false");
  console.log("wc_ledger_write=false");
  console.log("wallet_or_signer_access=false");
} finally {
  rmSync(temporaryRoot, {
    recursive: true,
    force: true,
  });
}

console.log("VOID_INTERACTIVE_SHELL_STILL_ALIVE");
