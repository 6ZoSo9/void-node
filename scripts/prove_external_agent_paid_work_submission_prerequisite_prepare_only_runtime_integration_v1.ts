import {
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  AGENT_PAID_WORK_SUBMISSION_ADMISSION_POLICY_MARKER,
  type AgentPaidWorkSubmissionAdmissionPolicyV1,
} from "./agent_paid_work_submission_admission_v1.js";
import {
  type AgentPaidWorkOrderDraft,
} from "./agent_paid_work_order_envelope_v1.js";
import {
  EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_ADAPTER_ID,
  EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_CONFIRMATION,
  EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_DEFAULT_DEPENDENCIES_V1,
  EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_EXAMPLE_MARKER,
  EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_HANDOFF_MARKER,
  EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_INTEGRATION_COMMAND_MARKER,
  EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_INTEGRATION_CONFIG_MARKER,
  EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_INTEGRATION_RESULT_MARKER,
  VOID_AI_AGENT_PAID_WORK_CLIENT_RELATIVE_PATH,
  VOID_MCP_HTTP_TRANSPORT_PATH,
  VOID_MCP_PREPARE_TOOL_NAME,
  executeExternalAgentPaidWorkSubmissionPrerequisitePrepareOnlyRuntimeIntegrationV1,
  type ExternalAgentPaidWorkSubmissionPrerequisitePrepareOnlyRuntimeCommandV1,
} from "./external_agent_paid_work_submission_prerequisite_prepare_only_runtime_integration_v1.js";

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}

async function expectReject(
  callback: () => Promise<unknown>,
  pattern: RegExp,
): Promise<void> {
  try {
    await callback();
  } catch (error) {
    assertCondition(
      pattern.test(String(error)),
      `unexpected rejection: ${String(error)}`,
    );
    return;
  }
  throw new Error(`expected rejection matching ${pattern}`);
}

function mode(pathname: string): number {
  return statSync(pathname).mode & 0o777;
}

const config = {
  marker:
    EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_INTEGRATION_CONFIG_MARKER,
  version: 1 as const,
  enabled: true,
  max_datanet_object_bytes: 4096,
  max_prepared_request_bytes: 65_536,
};

const disabledConfig = {
  ...config,
  enabled: false,
};

const policy: AgentPaidWorkSubmissionAdmissionPolicyV1 = {
  marker: AGENT_PAID_WORK_SUBMISSION_ADMISSION_POLICY_MARKER,
  version: 1,
  policy_id: "void.policy.prepare-only-runtime-proof.v1",
  allowed_capability_ids: ["datanet.fetch_verify"],
  max_total_by_asset: { USD: "10.00" },
  max_runtime_seconds: 600,
  max_output_bytes: 2_097_152,
  max_input_refs: 8,
  max_expected_outputs: 8,
  max_ttl_seconds: 172800,
  require_https_callback: true,
  callback_policy: {
    forbid_credentials: true,
    forbid_fragment: true,
    forbid_loopback: true,
    forbid_private_ip_literals: true,
  },
  authority: {
    provider_selection_authorized: false,
    quote_creation_authorized: false,
    payment_authorized: false,
    work_execution_authorized: false,
    work_dispatch_authorized: false,
    wc_award_authorized: false,
    wc_ledger_write_authorized: false,
    wallet_or_signer_access_authorized: false,
    buy_void_fulfillment_authorized: false,
  },
};

const orderExample = JSON.parse(
  readFileSync(
    "examples/agent-paid-work-order-envelope-v1.example.json",
    "utf8",
  ),
) as Record<string, unknown>;
const { work_order_id: _workOrderId, ...draftValue } = orderExample;
const workOrderDraft = draftValue as unknown as AgentPaidWorkOrderDraft;
(
  workOrderDraft.service as unknown as Record<string, unknown>
).input_refs = [];

const temporaryRoot = mkdtempSync(
  path.join(tmpdir(), "void-prepare-only-runtime-v1-"),
);
const stagingRoot = path.join(temporaryRoot, "staging");
const outputDirectory = path.join(temporaryRoot, "handoff");
const publicBaseUrl = "https://agent.example.invalid";
const paidWorkBaseUrl = "http://127.0.0.1:4112";

function command(
  overrides: Partial<ExternalAgentPaidWorkSubmissionPrerequisitePrepareOnlyRuntimeCommandV1> = {},
): ExternalAgentPaidWorkSubmissionPrerequisitePrepareOnlyRuntimeCommandV1 {
  return {
    marker:
      EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_INTEGRATION_COMMAND_MARKER,
    version: 1,
    apply: true,
    confirmation:
      EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_CONFIRMATION,
    operation_id: "prepare-only-runtime-proof-v1",
    paid_work_base_url: paidWorkBaseUrl,
    output_directory: outputDirectory,
    datanet: {
      mode: "create",
      public_base_url: publicBaseUrl,
      staging_root: stagingRoot,
      receipt: null,
    },
    submission: {
      submission_id: "prepare-only-runtime-submission-proof-v1",
      work_order_draft: structuredClone(workOrderDraft),
      admission_policy: structuredClone(policy),
      evaluated_at_utc: "2026-07-25T23:00:00Z",
    },
    ...overrides,
  };
}

try {
  let disabledDependencyInvoked = false;
  const disabled = await executeExternalAgentPaidWorkSubmissionPrerequisitePrepareOnlyRuntimeIntegrationV1(
    disabledConfig,
    null,
    {
      ...EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_DEFAULT_DEPENDENCIES_V1,
      repositoryRoot: () => {
        disabledDependencyInvoked = true;
        throw new Error("disabled dependency invoked");
      },
    },
  );
  assertCondition(disabled.status === "disabled", "disabled status mismatch");
  assertCondition(!disabledDependencyInvoked, "disabled mode invoked a dependency");
  assertCondition(
    Object.values(disabled.authority).every((value) => value === false),
    "disabled mode granted authority",
  );

  const planned = await executeExternalAgentPaidWorkSubmissionPrerequisitePrepareOnlyRuntimeIntegrationV1(
    config,
    command({
      apply: false,
      confirmation: "",
    }),
  );
  assertCondition(planned.status === "planned", "create dry-run status mismatch");
  assertCondition(
    planned.datanet.private_staging_creation_invoked === false,
    "create dry-run wrote Datanet staging",
  );
  assertCondition(planned.prepared_submission === null, "create dry-run prepared a request");
  assertCondition(planned.artifacts.private_files_written === false, "create dry-run wrote artifacts");
  assertCondition(planned.authority.callback_mount_plan_creation, "create dry-run omitted callback plan");
  assertCondition(!planned.authority.express_route_mount, "create dry-run mounted a route");
  assertCondition(!planned.authority.network_listener_creation, "create dry-run started a listener");

  const applied = await executeExternalAgentPaidWorkSubmissionPrerequisitePrepareOnlyRuntimeIntegrationV1(
    config,
    command(),
  );
  assertCondition(
    applied.marker
      === EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_INTEGRATION_RESULT_MARKER,
    "applied result marker mismatch",
  );
  assertCondition(
    applied.adapter_id
      === EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_ADAPTER_ID,
    "applied adapter mismatch",
  );
  assertCondition(
    applied.status === "prepared_and_written",
    "applied status mismatch",
  );
  assertCondition(applied.confirmation_verified, "apply confirmation was not verified");
  assertCondition(
    applied.datanet.private_staging_creation_invoked,
    "applied mode did not create Datanet staging",
  );
  assertCondition(applied.datanet.receipt !== null, "applied Datanet receipt missing");
  assertCondition(
    applied.gate_result?.status === "planned",
    "merged prerequisite gate did not remain dry-run",
  );
  assertCondition(
    applied.gate_result?.callback.invocation_attempted === false,
    "callback mount was invoked",
  );
  assertCondition(
    applied.gate_result?.admission?.decision === "accepted_for_review",
    "submission was not admitted",
  );
  assertCondition(
    applied.prepared_submission?.request_sent === false,
    "prepared submission was sent",
  );
  assertCondition(
    applied.prepared_submission?.token_read === false,
    "prepared submission read a token",
  );
  assertCondition(
    applied.prepared_submission?.authorization_header_present === false,
    "prepared submission contains authorization",
  );
  assertCondition(applied.handoff !== null, "handoff missing");
  assertCondition(
    applied.handoff.marker
      === EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_HANDOFF_MARKER,
    "handoff marker mismatch",
  );
  assertCondition(
    applied.handoff.paid_work_client.client_relative_path
      === VOID_AI_AGENT_PAID_WORK_CLIENT_RELATIVE_PATH,
    "paid-work client handoff path mismatch",
  );
  assertCondition(
    applied.handoff.paid_work_client.request_validated_by_existing_client,
    "existing paid-work client did not validate request",
  );
  assertCondition(
    applied.handoff.paid_work_client.token_file === null,
    "handoff unexpectedly contains a token file",
  );
  assertCondition(
    applied.handoff.mcp_http_transport.transport_path
      === VOID_MCP_HTTP_TRANSPORT_PATH,
    "MCP transport path mismatch",
  );
  assertCondition(
    applied.handoff.mcp_http_transport.prepare_tool_name
      === VOID_MCP_PREPARE_TOOL_NAME,
    "MCP prepare tool mismatch",
  );
  assertCondition(
    applied.handoff.mcp_http_transport.read_only_config_verified,
    "MCP read-only config was not verified",
  );
  assertCondition(
    !applied.handoff.mcp_http_transport.submit_tool_registered,
    "MCP submit tool was registered",
  );
  assertCondition(
    !applied.handoff.mcp_http_transport.listener_started,
    "MCP listener was started",
  );
  assertCondition(
    !applied.handoff.mcp_http_transport.request_sent,
    "MCP request was sent",
  );
  assertCondition(
    applied.artifacts.private_files_written,
    "private handoff artifacts were not written",
  );
  assertCondition(applied.artifacts.request_path !== null, "request path missing");
  assertCondition(applied.artifacts.handoff_path !== null, "handoff path missing");
  if (process.platform !== "win32") {
    assertCondition(mode(outputDirectory) === 0o700, "output directory mode mismatch");
    assertCondition(mode(applied.artifacts.request_path) === 0o600, "request file mode mismatch");
    assertCondition(mode(applied.artifacts.handoff_path) === 0o600, "handoff file mode mismatch");
  }

  const requestBytes = readFileSync(applied.artifacts.request_path);
  assertCondition(
    requestBytes.toString("utf8")
      === applied.prepared_submission?.canonical_body,
    "request artifact bytes mismatch",
  );
  const handoffFile = JSON.parse(
    readFileSync(applied.artifacts.handoff_path, "utf8"),
  ) as Record<string, unknown>;
  assertCondition(
    handoffFile.marker
      === EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_HANDOFF_MARKER,
    "handoff artifact marker mismatch",
  );

  const dryExistingOutput = path.join(temporaryRoot, "dry-existing-output");
  const dryExisting = await executeExternalAgentPaidWorkSubmissionPrerequisitePrepareOnlyRuntimeIntegrationV1(
    config,
    command({
      apply: false,
      confirmation: "",
      operation_id: "prepare-only-runtime-existing-proof-v1",
      output_directory: dryExistingOutput,
      datanet: {
        mode: "existing",
        public_base_url: publicBaseUrl,
        staging_root: "",
        receipt: applied.datanet.receipt,
      },
    }),
  );
  assertCondition(
    dryExisting.status === "prepared_in_memory",
    "existing dry-run did not prepare in memory",
  );
  assertCondition(
    dryExisting.datanet.private_staging_creation_invoked === false,
    "existing dry-run invoked Datanet creation",
  );
  assertCondition(
    dryExisting.prepared_submission !== null,
    "existing dry-run prepared request missing",
  );
  assertCondition(
    dryExisting.handoff?.paid_work_client.request_path === null,
    "existing dry-run materialized a request path",
  );
  assertCondition(
    dryExisting.handoff?.mcp_http_transport.read_only_config_verified === false,
    "existing dry-run unexpectedly loaded MCP runtime config",
  );
  assertCondition(
    dryExisting.artifacts.private_files_written === false,
    "existing dry-run wrote files",
  );

  await expectReject(
    async () =>
      await executeExternalAgentPaidWorkSubmissionPrerequisitePrepareOnlyRuntimeIntegrationV1(
        config,
        command({
          operation_id: "prepare-only-runtime-bad-confirmation-v1",
          confirmation: "wrong",
          output_directory: path.join(temporaryRoot, "bad-confirmation"),
        }),
      ),
    /exact confirmation/u,
  );

  const source = readFileSync(
    "scripts/external_agent_paid_work_submission_prerequisite_prepare_only_runtime_integration_v1.ts",
    "utf8",
  );
  for (const forbidden of [
    "submitVoidAiAgentPaidWorkV1(",
    "readPaidWorkTokenFileV1(",
    "createVoidMcpHttpServer(",
    ".listen(",
    "globalThis.fetch",
    "fetch(",
    "Bearer ",
    'VOID_MCP_ALLOW_SUBMIT: "1"',
  ]) {
    assertCondition(
      !source.includes(forbidden),
      `prepare-only source contains forbidden primitive: ${forbidden}`,
    );
  }
  for (const required of [
    "readPaidWorkSubmissionRequestV1",
    "loadReadOnlyMcpHttpConfig",
    "executePrerequisiteGate",
    "apply: false",
    "listener_started: false",
    "token_or_credential_read: false",
    "authenticated_submission_post: false",
    "runtime_mount: false",
  ]) {
    assertCondition(
      source.includes(required),
      `prepare-only source lacks required boundary: ${required}`,
    );
  }

  const example = JSON.parse(
    readFileSync(
      "examples/external-agent-paid-work-submission-prerequisite-prepare-only-runtime-integration-v1.example.json",
      "utf8",
    ),
  ) as Record<string, unknown>;
  assertCondition(
    example.marker
      === EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_EXAMPLE_MARKER,
    "example marker mismatch",
  );

  const schema = JSON.parse(
    readFileSync(
      "schemas/external-agent-paid-work-submission-prerequisite-prepare-only-runtime-integration-v1.schema.json",
      "utf8",
    ),
  ) as Record<string, unknown>;
  assertCondition(
    schema.title
      === "VOID External Agent Paid Work Submission Prerequisite Prepare-Only Runtime Integration V1",
    "schema title mismatch",
  );

  const workflow = readFileSync(
    ".github/workflows/external-agent-paid-work-submission-prerequisite-prepare-only-runtime-integration-v1.yml",
    "utf8",
  );
  assertCondition(
    workflow.includes(
      "VOID_EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_V1_PROOF_GREEN",
    ),
    "workflow proof marker missing",
  );
  assertCondition(
    workflow.includes("node node_modules/typescript/bin/tsc"),
    "workflow does not use direct TypeScript compiler",
  );

  console.log(
    "VOID_EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_V1_PROOF_GREEN",
  );
  console.log("disabled_by_default=true");
  console.log("datanet_private_staging_created=true");
  console.log("merged_prerequisite_gate_reused=true");
  console.log("paid_work_client_request_validator_reused=true");
  console.log("mcp_http_read_only_config_reused=true");
  console.log("callback_mount_plan_created=true");
  console.log("private_handoff_written=true");
  console.log("network_listener_creation=false");
  console.log("runtime_mount=false");
  console.log("token_read=false");
  console.log("authorization_header_materialized=false");
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
