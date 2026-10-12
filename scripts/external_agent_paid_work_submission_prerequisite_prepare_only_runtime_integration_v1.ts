import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  closeSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  materializeAgentPaidWorkOrder,
  validateAgentPaidWorkOrderEnvelope,
  type AgentPaidWorkOrderDraft,
  type AgentPaidWorkOrderEnvelope,
} from "./agent_paid_work_order_envelope_v1.js";
import {
  validateAgentPaidWorkSubmissionAdmissionPolicyV1,
  type AgentPaidWorkSubmissionAdmissionPolicyV1,
} from "./agent_paid_work_submission_admission_v1.js";
import {
  DATANET_FIELD_OBJECT_CREATE_RESULT_MARKER,
  EXTERNAL_AGENT_PAID_WORK_SUBMISSION_CALLBACK_COMMAND_PATH,
  EXTERNAL_AGENT_PAID_WORK_SUBMISSION_CALLBACK_STATUS_PATH,
  EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_COMMAND_MARKER,
  EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_CONFIG_MARKER,
  EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_DEFAULT_DEPENDENCIES_V1,
  EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_RESULT_MARKER,
  executeExternalAgentPaidWorkSubmissionPrerequisiteCreationGateV1,
  validateExternalAgentPaidWorkSubmissionPrerequisiteCreationGateCommandV1,
  validateExternalAgentPaidWorkSubmissionPrerequisiteCreationGateConfigV1,
  type DatanetFieldObjectReceiptV1,
  type ExternalAgentPaidWorkPreparedSubmissionV1,
  type ExternalAgentPaidWorkSubmissionPrerequisiteCreationGateCommandV1,
  type ExternalAgentPaidWorkSubmissionPrerequisiteCreationGateResultV1,
} from "./external_agent_paid_work_submission_prerequisite_creation_gate_v1.js";
import {
  loadVoidMcpHttpConfig,
  type VoidMcpHttpConfig,
} from "../integrations/mcp/src/http-config.js";

export const EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_INTEGRATION_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_INTEGRATION_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_INTEGRATION_CONFIG_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_INTEGRATION_CONFIG_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_INTEGRATION_COMMAND_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_INTEGRATION_COMMAND_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_INTEGRATION_RESULT_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_INTEGRATION_RESULT_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_HANDOFF_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_HANDOFF_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_EXAMPLE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_EXAMPLE_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_VERSION =
  1 as const;
export const EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_CONFIRMATION =
  "prepareExternalAgentPaidWorkSubmissionPrerequisiteRuntimeV1" as const;
export const EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_ADAPTER_ID =
  "void.external-agent-paid-work-submission-prerequisite-prepare-only-runtime-integration.v1" as const;

export const VOID_AI_AGENT_PAID_WORK_CLIENT_RELATIVE_PATH =
  "tools/void-ai-agent-paid-work-client-v1.mjs" as const;
export const VOID_MCP_HTTP_TRANSPORT_PATH = "/mcp" as const;
export const VOID_MCP_PREPARE_TOOL_NAME =
  "void_prepare_paid_work_submission" as const;

const MACHINE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/u;
const MAX_PATH_BYTES = 4096;
const PREPARED_REQUEST_FILE_SUFFIX = "submission-request-v1.json";
const HANDOFF_FILE_SUFFIX = "prepare-only-handoff-v1.json";
const PREFLIGHT_REFERENCE =
  "https://preflight.example.invalid/public-node/datanet/field-objects/sha256-0000000000000000000000000000000000000000000000000000000000000000/object.txt";

export interface ExternalAgentPaidWorkSubmissionPrerequisitePrepareOnlyRuntimeConfigV1 {
  marker:
    typeof EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_INTEGRATION_CONFIG_MARKER;
  version:
    typeof EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_VERSION;
  enabled: boolean;
  max_datanet_object_bytes: number;
  max_prepared_request_bytes: number;
}

export interface ExternalAgentPaidWorkSubmissionPrerequisitePrepareOnlyRuntimeSubmissionV1 {
  submission_id: string;
  work_order_draft: AgentPaidWorkOrderDraft;
  admission_policy: AgentPaidWorkSubmissionAdmissionPolicyV1;
  evaluated_at_utc: string;
}

export interface ExternalAgentPaidWorkSubmissionPrerequisitePrepareOnlyRuntimeCommandV1 {
  marker:
    typeof EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_INTEGRATION_COMMAND_MARKER;
  version:
    typeof EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_VERSION;
  apply: boolean;
  confirmation: string;
  operation_id: string;
  paid_work_base_url: string;
  output_directory: string;
  datanet: {
    mode: "create" | "existing";
    public_base_url: string;
    staging_root: string;
    receipt: DatanetFieldObjectReceiptV1 | null;
  };
  submission: ExternalAgentPaidWorkSubmissionPrerequisitePrepareOnlyRuntimeSubmissionV1;
}

export interface ExternalAgentPaidWorkSubmissionPrerequisitePrepareOnlyRuntimeHandoffV1 {
  marker:
    typeof EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_HANDOFF_MARKER;
  version:
    typeof EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_VERSION;
  adapter_id:
    typeof EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_ADAPTER_ID;
  operation_id: string;
  prepared_at_utc: string;
  request: {
    method: "POST";
    endpoint_path: string;
    canonical_body: string;
    body_bytes: number;
    payload_sha256: string;
    headers_without_authorization: {
      "content-type": "application/json";
      "x-void-payload-sha256": string;
    };
    request_path: string | null;
  };
  paid_work_client: {
    client_relative_path:
      typeof VOID_AI_AGENT_PAID_WORK_CLIENT_RELATIVE_PATH;
    base_origin: string;
    mode_for_later_operator_action: "submit";
    request_path: string | null;
    request_validated_by_existing_client: boolean;
    token_file: null;
    authorization_header_materialized: false;
    authenticated_submission_performed: false;
  };
  mcp_http_transport: {
    transport_path: typeof VOID_MCP_HTTP_TRANSPORT_PATH;
    host: "127.0.0.1";
    port: number;
    prepare_tool_name: typeof VOID_MCP_PREPARE_TOOL_NAME;
    read_only_config_verified: boolean;
    submit_tool_registered: false;
    token_configured: false;
    listener_started: false;
    request_sent: false;
  };
  callback_mount_plan: {
    status_path:
      typeof EXTERNAL_AGENT_PAID_WORK_SUBMISSION_CALLBACK_STATUS_PATH;
    command_path:
      typeof EXTERNAL_AGENT_PAID_WORK_SUBMISSION_CALLBACK_COMMAND_PATH;
    mount_invoked: false;
    listener_creation: false;
  };
  identity: {
    submission_id: string;
    work_order_id: string;
    datanet_object_id: string;
    datanet_reference: string;
  };
  authority: {
    provider_selection: false;
    quote_creation: false;
    payment_authorization: false;
    payment_execution: false;
    work_execution_authorization: false;
    work_dispatch: false;
    work_credit_write: false;
    wallet_or_signer_access: false;
    signing: false;
    transaction_broadcast: false;
    runtime_mount: false;
    service_restart: false;
    deployment: false;
    money_movement: false;
  };
}

export interface ExternalAgentPaidWorkSubmissionPrerequisitePrepareOnlyRuntimeResultV1 {
  marker:
    typeof EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_INTEGRATION_RESULT_MARKER;
  version:
    typeof EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_VERSION;
  adapter_id:
    typeof EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_ADAPTER_ID;
  status: "disabled" | "planned" | "prepared_in_memory" | "prepared_and_written";
  enabled: boolean;
  apply: boolean;
  operation_id: string | null;
  confirmation_verified: boolean;
  datanet: {
    mode: "create" | "existing" | null;
    private_staging_creation_invoked: boolean;
    receipt: DatanetFieldObjectReceiptV1 | null;
  };
  gate_result:
    ExternalAgentPaidWorkSubmissionPrerequisiteCreationGateResultV1
    | null;
  prepared_submission: ExternalAgentPaidWorkPreparedSubmissionV1 | null;
  handoff:
    ExternalAgentPaidWorkSubmissionPrerequisitePrepareOnlyRuntimeHandoffV1
    | null;
  artifacts: {
    output_directory: string | null;
    request_path: string | null;
    handoff_path: string | null;
    private_files_written: boolean;
  };
  authority: {
    local_datanet_staging_write: boolean;
    local_private_handoff_write: boolean;
    callback_mount_plan_creation: boolean;
    express_route_mount: false;
    network_listener_creation: false;
    token_or_credential_read: false;
    authorization_header_creation: false;
    authenticated_submission_post: false;
    external_http_submission: false;
    provider_selection: false;
    quote_creation: false;
    payment_authorization: false;
    payment_execution: false;
    work_execution_authorization: false;
    work_dispatch: false;
    work_credit_write: false;
    wallet_or_signer_access: false;
    signing: false;
    transaction_broadcast: false;
    service_restart: false;
    deployment: false;
    money_movement: false;
  };
}

type PaidWorkClientRequestInspectionV1 = Readonly<{
  bytes: Uint8Array;
  value: unknown;
  submissionId: string;
  workOrderId: string;
  sha256: string;
}>;

type PaidWorkClientModuleV1 = Readonly<{
  normalizePaidWorkBaseUrlV1: (raw: string) => URL;
  readPaidWorkSubmissionRequestV1: (
    rawPath: string,
  ) => PaidWorkClientRequestInspectionV1;
}>;

export interface ExternalAgentPaidWorkSubmissionPrerequisitePrepareOnlyRuntimeDependenciesV1 {
  repositoryRoot: () => string;
  createDatanetFieldObject: (
    operationId: string,
    stagingRoot: string,
    publicBaseUrl: string,
    maximumObjectBytes: number,
  ) => Promise<DatanetFieldObjectReceiptV1>;
  executePrerequisiteGate: (
    config: unknown,
    command: unknown,
  ) => Promise<ExternalAgentPaidWorkSubmissionPrerequisiteCreationGateResultV1>;
  loadPaidWorkClient: () => Promise<PaidWorkClientModuleV1>;
  loadReadOnlyMcpHttpConfig: (
    env: NodeJS.ProcessEnv,
  ) => Promise<VoidMcpHttpConfig>;
}

function fail(message: string): never {
  throw new Error(
    `${EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_INTEGRATION_MARKER}: ${message}`,
  );
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) fail(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(
    value
      && typeof value === "object"
      && !Array.isArray(value),
  );
}

function requireRecord(
  value: unknown,
  label: string,
): Record<string, unknown> {
  assertCondition(isRecord(value), `${label} must be an object`);
  return value;
}

function requireExactKeys(
  value: Record<string, unknown>,
  label: string,
  keys: readonly string[],
): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  assertCondition(
    actual.length === expected.length
      && actual.every((entry, index) => entry === expected[index]),
    `${label} keys mismatch`,
  );
}

function requireString(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
  pattern?: RegExp,
): string {
  assertCondition(typeof value === "string", `${label} must be a string`);
  assertCondition(
    value.length >= minimum && value.length <= maximum,
    `${label} length must be ${minimum}..${maximum}`,
  );
  if (pattern) {
    assertCondition(pattern.test(value), `${label} format mismatch`);
  }
  return value;
}

function requireBoolean(value: unknown, label: string): boolean {
  assertCondition(typeof value === "boolean", `${label} must be boolean`);
  return value;
}

function requireInteger(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): number {
  assertCondition(
    typeof value === "number"
      && Number.isSafeInteger(value)
      && value >= minimum
      && value <= maximum,
    `${label} must be an integer ${minimum}..${maximum}`,
  );
  return value;
}

function requireIsoUtc(value: unknown, label: string): string {
  const text = requireString(value, label, 20, 40);
  assertCondition(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(text),
    `${label} must be UTC ISO-8601`,
  );
  assertCondition(Number.isFinite(Date.parse(text)), `${label} is invalid`);
  return text;
}

function requireNormalizedAbsolutePath(
  value: unknown,
  label: string,
): string {
  const text = requireString(value, label, 1, MAX_PATH_BYTES);
  assertCondition(path.isAbsolute(text), `${label} must be absolute`);
  assertCondition(path.normalize(text) === text, `${label} must be normalized`);
  return text;
}

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function canonicalJson(value: unknown): string {
  const normalize = (entry: unknown): unknown => {
    if (Array.isArray(entry)) return entry.map(normalize);
    if (isRecord(entry)) {
      const output: Record<string, unknown> = {};
      for (const key of Object.keys(entry).sort()) {
        output[key] = normalize(entry[key]);
      }
      return output;
    }
    return entry;
  };
  return JSON.stringify(normalize(value));
}

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return (
    relative === ""
    || (
      relative !== ".."
      && !relative.startsWith(`..${path.sep}`)
      && !path.isAbsolute(relative)
    )
  );
}

function assertPrivateDirectory(pathname: string, label: string): void {
  const metadata = lstatSync(pathname);
  assertCondition(metadata.isDirectory(), `${label} must be a directory`);
  assertCondition(!metadata.isSymbolicLink(), `${label} must not be a symlink`);
  if (process.platform !== "win32") {
    assertCondition(
      metadata.uid === process.getuid?.(),
      `${label} must be owned by the current user`,
    );
    assertCondition(
      (metadata.mode & 0o077) === 0,
      `${label} must not grant group or other permissions`,
    );
  }
}

function writeExclusivePrivateFile(
  pathname: string,
  content: string,
): void {
  const descriptor = openSync(pathname, "wx", 0o600);
  try {
    writeFileSync(descriptor, content, {
      encoding: "utf8",
    });
  } finally {
    closeSync(descriptor);
  }
  chmodSync(pathname, 0o600);
}

function defaultRepositoryRoot(): string {
  return realpathSync(
    path.dirname(path.dirname(fileURLToPath(import.meta.url))),
  );
}

async function defaultLoadPaidWorkClient(): Promise<PaidWorkClientModuleV1> {
  const moduleUrl = pathToFileURL(
    realpathSync(
      fileURLToPath(
        new URL(
          `../${VOID_AI_AGENT_PAID_WORK_CLIENT_RELATIVE_PATH}`,
          import.meta.url,
        ),
      ),
    ),
  ).href;
  const loaded = await import(moduleUrl) as Record<string, unknown>;
  assertCondition(
    typeof loaded.normalizePaidWorkBaseUrlV1 === "function",
    "existing paid-work client normalize function is unavailable",
  );
  assertCondition(
    typeof loaded.readPaidWorkSubmissionRequestV1 === "function",
    "existing paid-work client request validator is unavailable",
  );
  return loaded as unknown as PaidWorkClientModuleV1;
}

export const EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_DEFAULT_DEPENDENCIES_V1:
  ExternalAgentPaidWorkSubmissionPrerequisitePrepareOnlyRuntimeDependenciesV1 =
  Object.freeze({
    repositoryRoot: defaultRepositoryRoot,
    createDatanetFieldObject:
      EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_DEFAULT_DEPENDENCIES_V1
        .createDatanetFieldObject,
    executePrerequisiteGate: async (
      config: unknown,
      command: unknown,
    ) =>
      await executeExternalAgentPaidWorkSubmissionPrerequisiteCreationGateV1(
        config,
        command,
        {},
      ),
    loadPaidWorkClient: defaultLoadPaidWorkClient,
    loadReadOnlyMcpHttpConfig: loadVoidMcpHttpConfig,
  });

export function validateExternalAgentPaidWorkSubmissionPrerequisitePrepareOnlyRuntimeConfigV1(
  value: unknown,
): ExternalAgentPaidWorkSubmissionPrerequisitePrepareOnlyRuntimeConfigV1 {
  const root = requireRecord(value, "prepare-only config");
  requireExactKeys(root, "prepare-only config", [
    "marker",
    "version",
    "enabled",
    "max_datanet_object_bytes",
    "max_prepared_request_bytes",
  ]);
  assertCondition(
    root.marker
      === EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_INTEGRATION_CONFIG_MARKER,
    "prepare-only config marker mismatch",
  );
  assertCondition(root.version === 1, "prepare-only config version must be 1");
  const maximumDatanetBytes = requireInteger(
    root.max_datanet_object_bytes,
    "prepare-only config.max_datanet_object_bytes",
    64,
    1024 * 1024,
  );
  const maximumRequestBytes = requireInteger(
    root.max_prepared_request_bytes,
    "prepare-only config.max_prepared_request_bytes",
    512,
    65_536,
  );
  validateExternalAgentPaidWorkSubmissionPrerequisiteCreationGateConfigV1({
    marker:
      EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_CONFIG_MARKER,
    version: 1,
    enabled: true,
    max_datanet_object_bytes: maximumDatanetBytes,
  });
  return {
    marker:
      EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_INTEGRATION_CONFIG_MARKER,
    version: 1,
    enabled: requireBoolean(root.enabled, "prepare-only config.enabled"),
    max_datanet_object_bytes: maximumDatanetBytes,
    max_prepared_request_bytes: maximumRequestBytes,
  };
}

function preflightWorkOrderDraft(
  value: unknown,
): AgentPaidWorkOrderDraft {
  const draft = structuredClone(
    requireRecord(value, "submission.work_order_draft"),
  ) as unknown as AgentPaidWorkOrderDraft;
  const service = requireRecord(
    (draft as unknown as Record<string, unknown>).service,
    "submission.work_order_draft.service",
  );
  assertCondition(
    Array.isArray(service.input_refs)
      && service.input_refs.length === 0,
    "submission.work_order_draft.service.input_refs must be an empty array",
  );
  service.input_refs = [PREFLIGHT_REFERENCE];
  materializeAgentPaidWorkOrder(draft);
  return structuredClone(
    requireRecord(value, "submission.work_order_draft"),
  ) as unknown as AgentPaidWorkOrderDraft;
}

export function validateExternalAgentPaidWorkSubmissionPrerequisitePrepareOnlyRuntimeCommandV1(
  value: unknown,
  maximumObjectBytes: number,
): ExternalAgentPaidWorkSubmissionPrerequisitePrepareOnlyRuntimeCommandV1 {
  const root = requireRecord(value, "prepare-only command");
  requireExactKeys(root, "prepare-only command", [
    "marker",
    "version",
    "apply",
    "confirmation",
    "operation_id",
    "paid_work_base_url",
    "output_directory",
    "datanet",
    "submission",
  ]);
  assertCondition(
    root.marker
      === EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_INTEGRATION_COMMAND_MARKER,
    "prepare-only command marker mismatch",
  );
  assertCondition(root.version === 1, "prepare-only command version must be 1");
  const apply = requireBoolean(root.apply, "prepare-only command.apply");
  const confirmation = requireString(
    root.confirmation,
    "prepare-only command.confirmation",
    0,
    160,
  );
  assertCondition(
    apply
      ? confirmation
        === EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_CONFIRMATION
      : confirmation === "",
    apply
      ? "prepare-only apply requires exact confirmation"
      : "prepare-only dry-run confirmation must be empty",
  );
  const operationId = requireString(
    root.operation_id,
    "prepare-only command.operation_id",
    3,
    128,
    MACHINE_ID,
  );
  const paidWorkBaseUrl = requireString(
    root.paid_work_base_url,
    "prepare-only command.paid_work_base_url",
    1,
    4096,
  );
  const outputDirectory = requireNormalizedAbsolutePath(
    root.output_directory,
    "prepare-only command.output_directory",
  );

  const datanetRoot = requireRecord(
    root.datanet,
    "prepare-only command.datanet",
  );
  requireExactKeys(datanetRoot, "prepare-only command.datanet", [
    "mode",
    "public_base_url",
    "staging_root",
    "receipt",
  ]);
  assertCondition(
    datanetRoot.mode === "create" || datanetRoot.mode === "existing",
    "prepare-only Datanet mode must be create or existing",
  );

  const submissionRoot = requireRecord(
    root.submission,
    "prepare-only command.submission",
  );
  requireExactKeys(submissionRoot, "prepare-only command.submission", [
    "submission_id",
    "work_order_draft",
    "admission_policy",
    "evaluated_at_utc",
  ]);
  const workOrderDraft = preflightWorkOrderDraft(
    submissionRoot.work_order_draft,
  );
  validateAgentPaidWorkSubmissionAdmissionPolicyV1(
    submissionRoot.admission_policy,
  );
  const submission = {
    submission_id: requireString(
      submissionRoot.submission_id,
      "prepare-only command.submission.submission_id",
      3,
      128,
      MACHINE_ID,
    ),
    work_order_draft: workOrderDraft,
    admission_policy:
      submissionRoot.admission_policy as AgentPaidWorkSubmissionAdmissionPolicyV1,
    evaluated_at_utc: requireIsoUtc(
      submissionRoot.evaluated_at_utc,
      "prepare-only command.submission.evaluated_at_utc",
    ),
  };

  let normalizedDatanet:
    ExternalAgentPaidWorkSubmissionPrerequisitePrepareOnlyRuntimeCommandV1["datanet"];

  if (datanetRoot.mode === "create") {
    const normalized = validateExternalAgentPaidWorkSubmissionPrerequisiteCreationGateCommandV1(
      {
        marker:
          EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_COMMAND_MARKER,
        version: 1,
        operation: "create_prerequisites",
        apply: false,
        confirmation: "",
        operation_id: operationId,
        datanet: datanetRoot,
        submission: null,
      },
      maximumObjectBytes,
    );
    normalizedDatanet = {
      mode: "create",
      public_base_url: normalized.datanet.public_base_url,
      staging_root: normalized.datanet.staging_root,
      receipt: null,
    };
  } else {
    const draftWithReference = structuredClone(workOrderDraft);
    const draftService = requireRecord(
      (draftWithReference as unknown as Record<string, unknown>).service,
      "submission.work_order_draft.service",
    );
    const receiptRoot = requireRecord(
      datanetRoot.receipt,
      "prepare-only command.datanet.receipt",
    );
    draftService.input_refs = [
      requireString(
        receiptRoot.url,
        "prepare-only command.datanet.receipt.url",
        1,
        4096,
      ),
    ];
    const workOrder = materializeAgentPaidWorkOrder(draftWithReference);
    const normalized = validateExternalAgentPaidWorkSubmissionPrerequisiteCreationGateCommandV1(
      {
        marker:
          EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_COMMAND_MARKER,
        version: 1,
        operation: "prepare_submission",
        apply: false,
        confirmation: "",
        operation_id: operationId,
        datanet: datanetRoot,
        submission: {
          submission_id: submission.submission_id,
          work_order: workOrder,
          admission_policy: submission.admission_policy,
          evaluated_at_utc: submission.evaluated_at_utc,
        },
      },
      maximumObjectBytes,
    );
    normalizedDatanet = {
      mode: "existing",
      public_base_url: normalized.datanet.public_base_url,
      staging_root: "",
      receipt: normalized.datanet.receipt,
    };
  }

  return {
    marker:
      EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_INTEGRATION_COMMAND_MARKER,
    version: 1,
    apply,
    confirmation,
    operation_id: operationId,
    paid_work_base_url: paidWorkBaseUrl,
    output_directory: outputDirectory,
    datanet: normalizedDatanet,
    submission,
  };
}

function authority(
  localDatanetWrite: boolean,
  localHandoffWrite: boolean,
  callbackPlan: boolean,
): ExternalAgentPaidWorkSubmissionPrerequisitePrepareOnlyRuntimeResultV1["authority"] {
  return Object.freeze({
    local_datanet_staging_write: localDatanetWrite,
    local_private_handoff_write: localHandoffWrite,
    callback_mount_plan_creation: callbackPlan,
    express_route_mount: false,
    network_listener_creation: false,
    token_or_credential_read: false,
    authorization_header_creation: false,
    authenticated_submission_post: false,
    external_http_submission: false,
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
    service_restart: false,
    deployment: false,
    money_movement: false,
  });
}

function disabledResult(): ExternalAgentPaidWorkSubmissionPrerequisitePrepareOnlyRuntimeResultV1 {
  return {
    marker:
      EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_INTEGRATION_RESULT_MARKER,
    version: 1,
    adapter_id:
      EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_ADAPTER_ID,
    status: "disabled",
    enabled: false,
    apply: false,
    operation_id: null,
    confirmation_verified: false,
    datanet: {
      mode: null,
      private_staging_creation_invoked: false,
      receipt: null,
    },
    gate_result: null,
    prepared_submission: null,
    handoff: null,
    artifacts: {
      output_directory: null,
      request_path: null,
      handoff_path: null,
      private_files_written: false,
    },
    authority: authority(false, false, false),
  };
}

function materializeWorkOrder(
  draft: AgentPaidWorkOrderDraft,
  receipt: DatanetFieldObjectReceiptV1,
): AgentPaidWorkOrderEnvelope {
  const withReference = structuredClone(draft);
  const service = requireRecord(
    (withReference as unknown as Record<string, unknown>).service,
    "work_order_draft.service",
  );
  service.input_refs = [receipt.url];
  const workOrder = materializeAgentPaidWorkOrder(withReference);
  validateAgentPaidWorkOrderEnvelope(workOrder);
  return workOrder;
}

function assertPreparedGateResult(
  result: ExternalAgentPaidWorkSubmissionPrerequisiteCreationGateResultV1,
): ExternalAgentPaidWorkPreparedSubmissionV1 {
  assertCondition(
    result.marker
      === EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_RESULT_MARKER,
    "prerequisite gate result marker mismatch",
  );
  assertCondition(result.status === "planned", "prerequisite gate must remain dry-run");
  assertCondition(result.apply === false, "prerequisite gate unexpectedly applied");
  assertCondition(
    result.callback.invocation_attempted === false,
    "callback mount was unexpectedly invoked",
  );
  assertCondition(
    result.callback.status === "not_invoked",
    "callback mount status must remain not_invoked",
  );
  assertCondition(
    result.authority.express_route_mount === false,
    "prerequisite gate mounted an Express route",
  );
  assertCondition(
    result.authority.network_listener_creation === false,
    "prerequisite gate created a network listener",
  );
  assertCondition(
    result.authority.token_or_credential_read === false,
    "prerequisite gate read a token or credential",
  );
  assertCondition(
    result.authority.authenticated_submission_post === false,
    "prerequisite gate sent an authenticated submission",
  );
  assertCondition(
    result.admission?.decision === "accepted_for_review",
    `submission was not admitted: ${result.admission?.reason_codes.join(",") ?? "missing_admission"}`,
  );
  assertCondition(
    result.prepared_submission !== null,
    "prerequisite gate did not prepare a submission",
  );
  assertCondition(
    result.prepared_submission.authorization_header_present === false,
    "prepared submission contains authorization",
  );
  assertCondition(
    result.prepared_submission.token_read === false,
    "prepared submission read a token",
  );
  assertCondition(
    result.prepared_submission.request_sent === false,
    "prepared submission was sent",
  );
  return result.prepared_submission;
}

function buildHandoff(
  operationId: string,
  evaluatedAtUtc: string,
  receipt: DatanetFieldObjectReceiptV1,
  prepared: ExternalAgentPaidWorkPreparedSubmissionV1,
  baseOrigin: string,
  mcpConfig: VoidMcpHttpConfig | null,
  requestPath: string | null,
  requestValidated: boolean,
): ExternalAgentPaidWorkSubmissionPrerequisitePrepareOnlyRuntimeHandoffV1 {
  const workOrderId = prepared.request.work_order.work_order_id;
  assertCondition(
    typeof workOrderId === "string" && workOrderId.length > 0,
    "prepared work order ID is unavailable",
  );
  return {
    marker:
      EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_HANDOFF_MARKER,
    version: 1,
    adapter_id:
      EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_ADAPTER_ID,
    operation_id: operationId,
    prepared_at_utc: evaluatedAtUtc,
    request: {
      method: prepared.method,
      endpoint_path: prepared.endpoint_path,
      canonical_body: prepared.canonical_body,
      body_bytes: prepared.body_bytes,
      payload_sha256: prepared.payload_sha256,
      headers_without_authorization: prepared.headers,
      request_path: requestPath,
    },
    paid_work_client: {
      client_relative_path: VOID_AI_AGENT_PAID_WORK_CLIENT_RELATIVE_PATH,
      base_origin: baseOrigin,
      mode_for_later_operator_action: "submit",
      request_path: requestPath,
      request_validated_by_existing_client: requestValidated,
      token_file: null,
      authorization_header_materialized: false,
      authenticated_submission_performed: false,
    },
    mcp_http_transport: {
      transport_path: VOID_MCP_HTTP_TRANSPORT_PATH,
      host: "127.0.0.1",
      port: mcpConfig?.port ?? 4114,
      prepare_tool_name: VOID_MCP_PREPARE_TOOL_NAME,
      read_only_config_verified: mcpConfig !== null,
      submit_tool_registered: false,
      token_configured: false,
      listener_started: false,
      request_sent: false,
    },
    callback_mount_plan: {
      status_path: EXTERNAL_AGENT_PAID_WORK_SUBMISSION_CALLBACK_STATUS_PATH,
      command_path: EXTERNAL_AGENT_PAID_WORK_SUBMISSION_CALLBACK_COMMAND_PATH,
      mount_invoked: false,
      listener_creation: false,
    },
    identity: {
      submission_id: prepared.request.submission_id,
      work_order_id: workOrderId,
      datanet_object_id: receipt.object_id,
      datanet_reference: receipt.url,
    },
    authority: {
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
    },
  };
}

export async function executeExternalAgentPaidWorkSubmissionPrerequisitePrepareOnlyRuntimeIntegrationV1(
  configValue: unknown,
  commandValue: unknown,
  dependencies:
    ExternalAgentPaidWorkSubmissionPrerequisitePrepareOnlyRuntimeDependenciesV1 =
      EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_DEFAULT_DEPENDENCIES_V1,
): Promise<ExternalAgentPaidWorkSubmissionPrerequisitePrepareOnlyRuntimeResultV1> {
  const config =
    validateExternalAgentPaidWorkSubmissionPrerequisitePrepareOnlyRuntimeConfigV1(
      configValue,
    );
  if (!config.enabled) return disabledResult();

  const command =
    validateExternalAgentPaidWorkSubmissionPrerequisitePrepareOnlyRuntimeCommandV1(
      commandValue,
      config.max_datanet_object_bytes,
    );

  assertCondition(
    dependencies
      && typeof dependencies.repositoryRoot === "function"
      && typeof dependencies.createDatanetFieldObject === "function"
      && typeof dependencies.executePrerequisiteGate === "function"
      && typeof dependencies.loadPaidWorkClient === "function"
      && typeof dependencies.loadReadOnlyMcpHttpConfig === "function",
    "prepare-only runtime dependencies are incomplete",
  );

  const repositoryRoot = realpathSync(dependencies.repositoryRoot());
  const outputDirectory = path.resolve(command.output_directory);
  assertCondition(
    !isWithin(repositoryRoot, outputDirectory),
    "private handoff output directory must remain outside the repository",
  );
  if (command.datanet.mode === "create") {
    const stagingRoot = path.resolve(command.datanet.staging_root);
    assertCondition(
      !isWithin(repositoryRoot, stagingRoot),
      "Datanet staging root must remain outside the repository",
    );
  }

  const paidWorkClient = await dependencies.loadPaidWorkClient();
  const normalizedBase =
    paidWorkClient.normalizePaidWorkBaseUrlV1(
      command.paid_work_base_url,
    );

  if (!command.apply && command.datanet.mode === "create") {
    const gateResult = await dependencies.executePrerequisiteGate(
      {
        marker:
          EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_CONFIG_MARKER,
        version: 1,
        enabled: true,
        max_datanet_object_bytes: config.max_datanet_object_bytes,
      },
      {
        marker:
          EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_COMMAND_MARKER,
        version: 1,
        operation: "create_prerequisites",
        apply: false,
        confirmation: "",
        operation_id: command.operation_id,
        datanet: command.datanet,
        submission: null,
      },
    );
    assertCondition(gateResult.status === "planned", "create plan status mismatch");
    return {
      marker:
        EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_INTEGRATION_RESULT_MARKER,
      version: 1,
      adapter_id:
        EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_ADAPTER_ID,
      status: "planned",
      enabled: true,
      apply: false,
      operation_id: command.operation_id,
      confirmation_verified: false,
      datanet: {
        mode: "create",
        private_staging_creation_invoked: false,
        receipt: null,
      },
      gate_result: gateResult,
      prepared_submission: null,
      handoff: null,
      artifacts: {
        output_directory: null,
        request_path: null,
        handoff_path: null,
        private_files_written: false,
      },
      authority: authority(false, false, true),
    };
  }

  let receipt = command.datanet.receipt;
  let datanetCreationInvoked = false;
  if (command.datanet.mode === "create") {
    datanetCreationInvoked = true;
    receipt = await dependencies.createDatanetFieldObject(
      command.operation_id,
      command.datanet.staging_root,
      command.datanet.public_base_url,
      config.max_datanet_object_bytes,
    );
  }
  assertCondition(receipt !== null, "Datanet receipt is unavailable");

  const workOrder = materializeWorkOrder(
    command.submission.work_order_draft,
    receipt,
  );
  const gateCommand:
    ExternalAgentPaidWorkSubmissionPrerequisiteCreationGateCommandV1 = {
      marker:
        EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_COMMAND_MARKER,
      version: 1,
      operation: "prepare_submission",
      apply: false,
      confirmation: "",
      operation_id: command.operation_id,
      datanet: {
        mode: "existing",
        public_base_url: command.datanet.public_base_url,
        staging_root: "",
        receipt,
      },
      submission: {
        submission_id: command.submission.submission_id,
        work_order: workOrder,
        admission_policy: command.submission.admission_policy,
        evaluated_at_utc: command.submission.evaluated_at_utc,
      },
    };

  const gateResult = await dependencies.executePrerequisiteGate(
    {
      marker:
        EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_CONFIG_MARKER,
      version: 1,
      enabled: true,
      max_datanet_object_bytes: config.max_datanet_object_bytes,
    },
    gateCommand,
  );
  const prepared = assertPreparedGateResult(gateResult);
  assertCondition(
    prepared.body_bytes <= config.max_prepared_request_bytes,
    "prepared request exceeds configured maximum",
  );
  assertCondition(
    Buffer.byteLength(prepared.canonical_body, "utf8")
      === prepared.body_bytes,
    "prepared request byte count mismatch",
  );
  assertCondition(
    sha256Text(prepared.canonical_body) === prepared.payload_sha256,
    "prepared request digest mismatch",
  );
  assertCondition(
    canonicalJson(prepared.request) === prepared.canonical_body,
    "prepared request canonical body mismatch",
  );

  if (!command.apply) {
    const handoff = buildHandoff(
      command.operation_id,
      command.submission.evaluated_at_utc,
      receipt,
      prepared,
      normalizedBase.origin,
      null,
      null,
      false,
    );
    return {
      marker:
        EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_INTEGRATION_RESULT_MARKER,
      version: 1,
      adapter_id:
        EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_ADAPTER_ID,
      status: "prepared_in_memory",
      enabled: true,
      apply: false,
      operation_id: command.operation_id,
      confirmation_verified: false,
      datanet: {
        mode: command.datanet.mode,
        private_staging_creation_invoked: datanetCreationInvoked,
        receipt,
      },
      gate_result: gateResult,
      prepared_submission: prepared,
      handoff,
      artifacts: {
        output_directory: null,
        request_path: null,
        handoff_path: null,
        private_files_written: false,
      },
      authority: authority(datanetCreationInvoked, false, true),
    };
  }

  assertCondition(
    !existsSync(outputDirectory),
    "private handoff output directory already exists",
  );

  const mcpConfig = await dependencies.loadReadOnlyMcpHttpConfig({
    VOID_MCP_REPO_ROOT: repositoryRoot,
    VOID_MCP_BASE_URL: normalizedBase.href,
    VOID_MCP_ALLOW_SUBMIT: "0",
    VOID_MCP_HTTP_HOST: "127.0.0.1",
  });
  assertCondition(
    mcpConfig.host === "127.0.0.1",
    "MCP HTTP transport host is not exact loopback",
  );
  assertCondition(
    mcpConfig.path === VOID_MCP_HTTP_TRANSPORT_PATH,
    "MCP HTTP transport path mismatch",
  );
  assertCondition(
    mcpConfig.bridge.allowSubmit === false,
    "MCP HTTP transport unexpectedly enables submission",
  );
  assertCondition(
    mcpConfig.bridge.tokenFile === null,
    "MCP HTTP transport unexpectedly configured a token",
  );

  let outputCreated = false;
  const requestPath = path.join(
    outputDirectory,
    `${command.operation_id}-${PREPARED_REQUEST_FILE_SUFFIX}`,
  );
  const handoffPath = path.join(
    outputDirectory,
    `${command.operation_id}-${HANDOFF_FILE_SUFFIX}`,
  );

  try {
    mkdirSync(outputDirectory, {
      recursive: false,
      mode: 0o700,
    });
    chmodSync(outputDirectory, 0o700);
    outputCreated = true;
    assertPrivateDirectory(outputDirectory, "private handoff output directory");

    writeExclusivePrivateFile(
      requestPath,
      prepared.canonical_body,
    );
    const inspected =
      paidWorkClient.readPaidWorkSubmissionRequestV1(requestPath);
    assertCondition(
      inspected.sha256 === prepared.payload_sha256,
      "existing paid-work client request digest mismatch",
    );
    assertCondition(
      inspected.submissionId
        === prepared.request.submission_id,
      "existing paid-work client submission ID mismatch",
    );
    assertCondition(
      inspected.workOrderId
        === prepared.request.work_order.work_order_id,
      "existing paid-work client work-order ID mismatch",
    );
    assertCondition(
      inspected.bytes.byteLength === prepared.body_bytes,
      "existing paid-work client request byte count mismatch",
    );

    const handoff = buildHandoff(
      command.operation_id,
      command.submission.evaluated_at_utc,
      receipt,
      prepared,
      normalizedBase.origin,
      mcpConfig,
      requestPath,
      true,
    );
    writeExclusivePrivateFile(
      handoffPath,
      `${JSON.stringify(handoff, null, 2)}\n`,
    );

    for (const pathname of [requestPath, handoffPath]) {
      const metadata = lstatSync(pathname);
      assertCondition(
        metadata.isFile() && !metadata.isSymbolicLink(),
        "private handoff artifact must be a regular non-symlink file",
      );
      if (process.platform !== "win32") {
        assertCondition(
          (metadata.mode & 0o077) === 0,
          "private handoff artifact permissions are too broad",
        );
      }
    }

    return {
      marker:
        EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_INTEGRATION_RESULT_MARKER,
      version: 1,
      adapter_id:
        EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_ADAPTER_ID,
      status: "prepared_and_written",
      enabled: true,
      apply: true,
      operation_id: command.operation_id,
      confirmation_verified: true,
      datanet: {
        mode: command.datanet.mode,
        private_staging_creation_invoked: datanetCreationInvoked,
        receipt,
      },
      gate_result: gateResult,
      prepared_submission: prepared,
      handoff,
      artifacts: {
        output_directory: outputDirectory,
        request_path: requestPath,
        handoff_path: handoffPath,
        private_files_written: true,
      },
      authority: authority(datanetCreationInvoked, true, true),
    };
  } catch (error) {
    if (outputCreated) {
      rmSync(outputDirectory, {
        recursive: true,
        force: true,
      });
    }
    throw error;
  }
}
