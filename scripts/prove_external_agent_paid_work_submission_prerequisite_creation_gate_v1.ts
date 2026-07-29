import { createHash } from "node:crypto";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_ADAPTER_ID,
  EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_COMMAND_MARKER,
  EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_CONFIG_MARKER,
  EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_CONFIRMATION,
  EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_DEFAULT_DEPENDENCIES_V1,
  EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_RESULT_MARKER,
  EXTERNAL_AGENT_PAID_WORK_SUBMISSION_REQUEST_MARKER,
  executeExternalAgentPaidWorkSubmissionPrerequisiteCreationGateV1,
  type DatanetFieldObjectReceiptV1,
  type ExternalAgentPaidWorkSubmissionPrerequisiteCreationGateCommandV1,
  type ExternalAgentPaidWorkSubmissionPrerequisiteCreationGateDependenciesV1,
} from "./external_agent_paid_work_submission_prerequisite_creation_gate_v1.js";
import {
  AGENT_PAID_WORK_SUBMISSION_ADMISSION_POLICY_MARKER,
  type AgentPaidWorkSubmissionAdmissionPolicyV1,
} from "./agent_paid_work_submission_admission_v1.js";
import {
  canonicalJson,
  materializeAgentPaidWorkOrder,
  type AgentPaidWorkOrderDraft,
} from "./agent_paid_work_order_envelope_v1.js";
import {
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_ADAPTER_ID,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_RESULT_MARKER,
} from "../src/http/public_agent_service_acceptance_persistence_http_route_server_bootstrap_callsite_integration_v1.js";

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function mountedCallbackResult(): unknown {
  return {
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_RESULT_MARKER,
    version: 1,
    adapter_id:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_ADAPTER_ID,
    status: "mounted",
    enabled: true,
    apply: true,
    confirmation_verified: true,
    composition_module_url: "file:///proof/composition.ts",
    composition_module_imported: true,
    composition_invoked: true,
    app_provider_forwarded: true,
    trusted_context_provider_forwarded: true,
    app_provider_invoked: true,
    composition_status: "mounted",
    composition_result: { status: "mounted" },
    authority: {
      composition_module_import: true,
      composition_execution: true,
      express_app_provider_forwarding: true,
      trusted_context_provider_forwarding: true,
      trusted_context_provider_invocation: false,
      network_listener_creation: false,
      external_http_submission: false,
      production_acceptance_persistence: false,
      production_replay_write: false,
      payment_authorization: false,
      payment_execution: false,
      execution_authorization: false,
      work_dispatch: false,
      production_signing: false,
      transaction_broadcast: false,
      work_credit_write: false,
      money_movement: false,
    },
  };
}

const config = {
  marker:
    EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_CONFIG_MARKER,
  version: 1 as const,
  enabled: true,
  max_datanet_object_bytes: 4096,
};

const policy: AgentPaidWorkSubmissionAdmissionPolicyV1 = {
  marker: AGENT_PAID_WORK_SUBMISSION_ADMISSION_POLICY_MARKER,
  version: 1,
  policy_id: "void.policy.external-agent-prerequisite-proof.v1",
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

const temporaryRoot = mkdtempSync(
  path.join(tmpdir(), "void-prerequisite-gate-v1-"),
);
let callbackInvocationCount = 0;
const dependencies: ExternalAgentPaidWorkSubmissionPrerequisiteCreationGateDependenciesV1 = {
  ...EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_DEFAULT_DEPENDENCIES_V1,
  mountCallbackReceiver: async (_environment, appProvider, trustedContextProvider) => {
    callbackInvocationCount += 1;
    assertCondition(typeof appProvider === "function", "app provider was not forwarded");
    assertCondition(typeof trustedContextProvider === "function", "trusted context provider was not forwarded");
    return mountedCallbackResult();
  },
};

try {
  const createResult = await executeExternalAgentPaidWorkSubmissionPrerequisiteCreationGateV1(
    config,
    {
      marker:
        EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_COMMAND_MARKER,
      version: 1,
      operation: "create_prerequisites",
      apply: true,
      confirmation:
        EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_CONFIRMATION,
      operation_id: "external-agent-prerequisite-proof-v1",
      datanet: {
        mode: "create",
        public_base_url: "https://agent.example.invalid",
        staging_root: temporaryRoot,
        receipt: null,
      },
      submission: null,
    },
    {},
    () => ({ use() {} }),
    () => ({ trusted: true }),
    dependencies,
  );

  assertCondition(
    createResult.marker ===
      EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_RESULT_MARKER,
    "create result marker mismatch",
  );
  assertCondition(
    createResult.adapter_id ===
      EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_ADAPTER_ID,
    "create result adapter mismatch",
  );
  assertCondition(createResult.status === "prerequisites_created", "prerequisites were not created");
  assertCondition(createResult.datanet.creation_invoked, "Datanet creator was not invoked");
  assertCondition(createResult.datanet.receipt !== null, "Datanet receipt missing");
  assertCondition(createResult.callback.status === "mounted", "callback route was not mounted");
  assertCondition(createResult.prepared_submission === null, "create phase unexpectedly prepared a submission");
  assertCondition(createResult.authority.local_datanet_staging_write, "create phase did not report its local write");
  assertCondition(createResult.authority.express_route_mount, "create phase did not report route mounting");
  assertCondition(!createResult.authority.authenticated_submission_post, "create phase posted a submission");

  const receipt = createResult.datanet.receipt as DatanetFieldObjectReceiptV1;
  const orderExample = JSON.parse(
    readFileSync(
      "examples/agent-paid-work-order-envelope-v1.example.json",
      "utf8",
    ),
  ) as Record<string, unknown>;
  const { work_order_id: _workOrderId, ...draftValue } = orderExample;
  const draft = draftValue as AgentPaidWorkOrderDraft;
  draft.service.input_refs = [receipt.url];
  const workOrder = materializeAgentPaidWorkOrder(draft);

  const prepareCommand: ExternalAgentPaidWorkSubmissionPrerequisiteCreationGateCommandV1 = {
    marker:
      EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_COMMAND_MARKER,
    version: 1 as const,
    operation: "prepare_submission" as const,
    apply: true,
    confirmation:
      EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_CONFIRMATION,
    operation_id: "external-agent-submission-prepare-proof-v1",
    datanet: {
      mode: "existing" as const,
      public_base_url: "https://agent.example.invalid",
      staging_root: "",
      receipt,
    },
    submission: {
      submission_id: "external-agent-submission-proof-v1",
      work_order: workOrder,
      admission_policy: policy,
      evaluated_at_utc: "2026-07-25T23:00:00Z",
    },
  };

  const preparedResult = await executeExternalAgentPaidWorkSubmissionPrerequisiteCreationGateV1(
    config,
    prepareCommand,
    {},
    () => ({ use() {} }),
    () => ({ trusted: true }),
    dependencies,
  );
  assertCondition(preparedResult.status === "submission_prepared", "submission was not prepared");
  assertCondition(preparedResult.admission?.decision === "accepted_for_review", "prepared work order was not admitted");
  assertCondition(preparedResult.datanet.work_order_reference_bound, "prepared work order did not bind Datanet reference");
  assertCondition(preparedResult.prepared_submission !== null, "prepared request missing");
  assertCondition(
    preparedResult.prepared_submission.request.marker ===
      EXTERNAL_AGENT_PAID_WORK_SUBMISSION_REQUEST_MARKER,
    "prepared request marker mismatch",
  );
  assertCondition(!preparedResult.prepared_submission.authorization_header_present, "prepared request contains authorization");
  assertCondition(!preparedResult.prepared_submission.token_read, "prepared request read a token");
  assertCondition(!preparedResult.prepared_submission.request_sent, "prepared request was sent");
  assertCondition(
    preparedResult.prepared_submission.payload_sha256 ===
      createHash("sha256")
        .update(preparedResult.prepared_submission.canonical_body)
        .digest("hex"),
    "prepared payload SHA mismatch",
  );
  assertCondition(
    preparedResult.prepared_submission.canonical_body ===
      canonicalJson(preparedResult.prepared_submission.request),
    "prepared canonical body does not match the request",
  );

  let dryDependencyInvoked = false;
  const dryDependencies: ExternalAgentPaidWorkSubmissionPrerequisiteCreationGateDependenciesV1 = {
    createDatanetFieldObject: async () => {
      dryDependencyInvoked = true;
      throw new Error("dry-run Datanet dependency invoked");
    },
    mountCallbackReceiver: async () => {
      dryDependencyInvoked = true;
      throw new Error("dry-run callback dependency invoked");
    },
  };
  const dryCommand = clone(prepareCommand);
  dryCommand.apply = false;
  dryCommand.confirmation = "";
  const dryResult = await executeExternalAgentPaidWorkSubmissionPrerequisiteCreationGateV1(
    config,
    dryCommand,
    {},
    undefined,
    undefined,
    dryDependencies,
  );
  assertCondition(dryResult.status === "planned", "dry-run status mismatch");
  assertCondition(dryResult.prepared_submission !== null, "dry-run did not prepare the request artifact");
  assertCondition(!dryDependencyInvoked, "dry-run invoked a side-effect dependency");
  assertCondition(Object.values(dryResult.authority).every((value) => value === false), "dry-run granted authority");

  {
    const invalid = clone(prepareCommand);
    assertCondition(invalid.submission !== null, "invalid proof submission missing");
    invalid.submission.work_order.service.input_refs = ["https://agent.example.invalid/wrong-object"];
    let rejected = false;
    try {
      await executeExternalAgentPaidWorkSubmissionPrerequisiteCreationGateV1(
        config,
        invalid,
        {},
        () => ({ use() {} }),
        () => ({ trusted: true }),
        dependencies,
      );
    } catch {
      rejected = true;
    }
    assertCondition(rejected, "unbound Datanet object reference was accepted");
  }

  {
    const invalid = clone(prepareCommand);
    invalid.confirmation = "wrong";
    let rejected = false;
    try {
      await executeExternalAgentPaidWorkSubmissionPrerequisiteCreationGateV1(
        config,
        invalid,
        {},
        () => ({ use() {} }),
        () => ({ trusted: true }),
        dependencies,
      );
    } catch {
      rejected = true;
    }
    assertCondition(rejected, "wrong apply confirmation was accepted");
  }

  const disabled = await executeExternalAgentPaidWorkSubmissionPrerequisiteCreationGateV1(
    { ...config, enabled: false },
    undefined,
    {},
  );
  assertCondition(disabled.status === "disabled", "disabled gate did not short-circuit");

  const source = readFileSync(
    "scripts/external_agent_paid_work_submission_prerequisite_creation_gate_v1.ts",
    "utf8",
  );
  for (const forbidden of [
    "node:http",
    "node:https",
    "fetch(",
    ".request(",
    "Bearer ",
    "agent_paid_work_submission_receiver_v1",
  ]) {
    assertCondition(!source.includes(forbidden), `gate source contains forbidden submission primitive: ${forbidden}`);
  }
  const workflowText = readFileSync(
    ".github/workflows/external-agent-paid-work-submission-prerequisite-creation-gate-v1.yml",
    "utf8",
  );
  const documentationText = readFileSync(
    "docs/public-agent/external-agent-paid-work-submission-prerequisite-creation-gate-v1.md",
    "utf8",
  );
  const exampleValue = JSON.parse(
    readFileSync(
      "examples/external-agent-paid-work-submission-prerequisite-creation-gate-v1.example.json",
      "utf8",
    ),
  ) as Record<string, unknown>;
  const schemaValue = JSON.parse(
    readFileSync(
      "schemas/external-agent-paid-work-submission-prerequisite-creation-gate-v1.schema.json",
      "utf8",
    ),
  ) as Record<string, unknown>;
  assertCondition(
    workflowText.includes(
      "prove_external_agent_paid_work_submission_prerequisite_creation_gate_v1.ts",
    ),
    "workflow does not run the focused proof",
  );
  assertCondition(
    documentationText.includes(
      "VOID_EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_V1",
    ),
    "documentation marker missing",
  );
  assertCondition(
    exampleValue.marker ===
      "VOID_EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_EXAMPLE_V1",
    "example marker mismatch",
  );
  assertCondition(
    schemaValue.title ===
      "VOID External Agent Paid Work Submission Prerequisite Creation Gate V1 Result",
    "schema title mismatch",
  );
  assertCondition(callbackInvocationCount === 2, "callback dependency invocation count mismatch");

  console.log("VOID_EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_V1_PROOF_GREEN");
  console.log("create_prerequisites=true");
  console.log("prepare_submission=true");
  console.log("datanet_object_created_in_private_staging=true");
  console.log("callback_route_mount_reused=true");
  console.log("admission_accepted_for_review=true");
  console.log("authorization_header_present=false");
  console.log("token_read=false");
  console.log("authenticated_submission_post=false");
  console.log("network_listener_creation=false");
  console.log("wc_ledger_write=false");
  console.log("wallet_or_signer_access=false");
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
