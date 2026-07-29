import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import { isIP } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  canonicalJson,
  validateAgentPaidWorkOrderEnvelope,
  type AgentPaidWorkOrderEnvelope,
} from "./agent_paid_work_order_envelope_v1.js";
import {
  materializeAgentPaidWorkSubmissionAdmissionV1,
  validateAgentPaidWorkSubmissionAdmissionPolicyV1,
  type AgentPaidWorkSubmissionAdmissionPolicyV1,
  type AgentPaidWorkSubmissionAdmissionV1,
} from "./agent_paid_work_submission_admission_v1.js";
import {
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_ADAPTER_ID,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_COMMAND_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_CONFIG_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_RESULT_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_VERSION,
  executePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationV1,
  publicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationExpectedConfirmationsV1,
} from "../src/http/public_agent_service_acceptance_persistence_http_route_server_bootstrap_callsite_integration_v1.js";

export const EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_CONFIG_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_CONFIG_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_COMMAND_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_COMMAND_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_RESULT_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_RESULT_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_EXAMPLE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_EXAMPLE_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_VERSION =
  1 as const;
export const EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_CONFIRMATION =
  "createExternalAgentPaidWorkSubmissionPrerequisitesV1" as const;
export const EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_ADAPTER_ID =
  "void.external-agent-paid-work-submission-prerequisite-creation-gate.v1" as const;

export const EXTERNAL_AGENT_PAID_WORK_SUBMISSION_REQUEST_MARKER =
  "VOID_AGENT_PAID_WORK_SUBMISSION_REQUEST_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_SUBMISSION_REQUEST_PATH =
  "/__void/agents/paid-work/submissions/v1" as const;
export const DATANET_FIELD_OBJECT_CREATE_RESULT_MARKER =
  "VOID_DATANET_FIELD_OBJECT_CREATE_V1_GREEN" as const;
export const EXTERNAL_AGENT_PAID_WORK_SUBMISSION_CALLBACK_STATUS_PATH =
  "/__void/operator/public-agent-service-trusted-requester-acceptance-persistence-runtime-v1/status" as const;
export const EXTERNAL_AGENT_PAID_WORK_SUBMISSION_CALLBACK_COMMAND_PATH =
  "/__void/operator/public-agent-service-trusted-requester-acceptance-persistence-runtime-v1/command" as const;

const MACHINE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const MAX_CAPTURE_OUTPUT_BYTES = 1024 * 1024;
const DATANET_TOOL_TIMEOUT_MS = 20_000;

export interface ExternalAgentPaidWorkSubmissionPrerequisiteCreationGateConfigV1 {
  marker:
    typeof EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_CONFIG_MARKER;
  version:
    typeof EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_VERSION;
  enabled: boolean;
  max_datanet_object_bytes: number;
}

export interface DatanetFieldObjectReceiptV1 {
  marker: typeof DATANET_FIELD_OBJECT_CREATE_RESULT_MARKER;
  created_at: string;
  host: string;
  object_id: string;
  dir_id: string;
  sha256: string;
  bytes: number;
  object_path: string;
  receipt_path: string;
  public_path: string;
  receipt_public_path: string;
  url: string;
  verified_locally: true;
  dangerous_paths_touched: false;
}

export interface ExternalAgentPaidWorkSubmissionPrerequisiteDatanetCommandV1 {
  mode: "create" | "existing";
  public_base_url: string;
  staging_root: string;
  receipt: DatanetFieldObjectReceiptV1 | null;
}

export interface ExternalAgentPaidWorkSubmissionPrerequisiteSubmissionCommandV1 {
  submission_id: string;
  work_order: AgentPaidWorkOrderEnvelope;
  admission_policy: AgentPaidWorkSubmissionAdmissionPolicyV1;
  evaluated_at_utc: string;
}

export interface ExternalAgentPaidWorkSubmissionPrerequisiteCreationGateCommandV1 {
  marker:
    typeof EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_COMMAND_MARKER;
  version:
    typeof EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_VERSION;
  operation: "create_prerequisites" | "prepare_submission";
  apply: boolean;
  confirmation: string;
  operation_id: string;
  datanet: ExternalAgentPaidWorkSubmissionPrerequisiteDatanetCommandV1;
  submission:
    ExternalAgentPaidWorkSubmissionPrerequisiteSubmissionCommandV1
    | null;
}

export interface ExternalAgentPaidWorkPreparedSubmissionV1 {
  marker: "VOID_EXTERNAL_AGENT_PAID_WORK_PREPARED_SUBMISSION_V1";
  version: 1;
  endpoint_path:
    typeof EXTERNAL_AGENT_PAID_WORK_SUBMISSION_REQUEST_PATH;
  method: "POST";
  request: {
    marker:
      typeof EXTERNAL_AGENT_PAID_WORK_SUBMISSION_REQUEST_MARKER;
    version: 1;
    submission_id: string;
    work_order: AgentPaidWorkOrderEnvelope;
  };
  canonical_body: string;
  body_bytes: number;
  payload_sha256: string;
  headers: {
    "content-type": "application/json";
    "x-void-payload-sha256": string;
  };
  authorization_header_present: false;
  token_read: false;
  request_sent: false;
}

export interface ExternalAgentPaidWorkSubmissionPrerequisiteCreationGateResultV1 {
  marker:
    typeof EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_RESULT_MARKER;
  version:
    typeof EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_VERSION;
  adapter_id:
    typeof EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_ADAPTER_ID;
  status:
    | "disabled"
    | "planned"
    | "prerequisites_created"
    | "submission_prepared";
  enabled: boolean;
  apply: boolean;
  operation:
    ExternalAgentPaidWorkSubmissionPrerequisiteCreationGateCommandV1["operation"]
    | null;
  operation_id: string | null;
  confirmation_verified: boolean;
  datanet: {
    mode: "create" | "existing" | null;
    creation_invoked: boolean;
    receipt_validated: boolean;
    receipt: DatanetFieldObjectReceiptV1 | null;
    reference: string | null;
    work_order_reference_bound: boolean;
  };
  callback: {
    invocation_attempted: boolean;
    status: "not_invoked" | "mounted" | "already_mounted";
    status_path:
      typeof EXTERNAL_AGENT_PAID_WORK_SUBMISSION_CALLBACK_STATUS_PATH;
    command_path:
      typeof EXTERNAL_AGENT_PAID_WORK_SUBMISSION_CALLBACK_COMMAND_PATH;
    result_sha256: string | null;
  };
  admission: AgentPaidWorkSubmissionAdmissionV1 | null;
  prepared_submission: ExternalAgentPaidWorkPreparedSubmissionV1 | null;
  authority: {
    local_datanet_staging_write: boolean;
    express_route_mount: boolean;
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
    transaction_broadcast: false;
    service_restart: false;
    deployment: false;
    money_movement: false;
  };
}

export interface ExternalAgentPaidWorkSubmissionPrerequisiteCreationGateDependenciesV1 {
  createDatanetFieldObject: (
    operationId: string,
    stagingRoot: string,
    publicBaseUrl: string,
    maximumObjectBytes: number,
  ) => Promise<DatanetFieldObjectReceiptV1>;
  mountCallbackReceiver: (
    environment: NodeJS.ProcessEnv,
    appProvider: () => unknown,
    trustedContextProvider: () => unknown,
  ) => Promise<unknown>;
}

function fail(message: string): never {
  throw new Error(
    `${EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_MARKER}: ${message}`,
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
    `${label} keys must be exact`,
  );
}

function requireString(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
  pattern?: RegExp,
): string {
  assertCondition(typeof value === "string", `${label} must be string`);
  assertCondition(value === value.trim(), `${label} must not have edge whitespace`);
  assertCondition(
    value.length >= minimum && value.length <= maximum,
    `${label} length is outside the allowed range`,
  );
  if (pattern) {
    assertCondition(pattern.test(value), `${label} format is invalid`);
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
    typeof value === "number" && Number.isSafeInteger(value),
    `${label} must be a safe integer`,
  );
  assertCondition(
    value >= minimum && value <= maximum,
    `${label} is outside the allowed range`,
  );
  return value;
}

function requireIsoUtc(value: unknown, label: string): string {
  const text = requireString(value, label, 20, 32);
  assertCondition(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(text),
    `${label} must be canonical UTC`,
  );
  assertCondition(Number.isFinite(Date.parse(text)), `${label} must be a real date`);
  return text;
}

function sha256Text(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeJson(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    assertCondition(Number.isFinite(value), "JSON number must be finite");
    return value;
  }
  if (Array.isArray(value)) return value.map(normalizeJson);
  const record = requireRecord(value, "JSON object");
  return Object.fromEntries(
    Object.entries(record)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, normalizeJson(child)]),
  );
}

function isLoopbackHost(hostname: string): boolean {
  const value = hostname.toLowerCase();
  return value === "localhost"
    || value === "localhost.localdomain"
    || value.endsWith(".localhost")
    || value === "127.0.0.1"
    || value === "::1";
}

function isPrivateIpLiteral(hostname: string): boolean {
  const version = isIP(hostname);
  if (version === 0) return false;
  if (version === 4) {
    const [a, b] = hostname.split(".").map(Number);
    return a === 10
      || a === 127
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168);
  }
  const value = hostname.toLowerCase();
  return value === "::1"
    || value.startsWith("fc")
    || value.startsWith("fd")
    || value.startsWith("fe8")
    || value.startsWith("fe9")
    || value.startsWith("fea")
    || value.startsWith("feb");
}

function normalizePublicBaseUrl(value: unknown): string {
  const text = requireString(value, "datanet.public_base_url", 9, 2048);
  let parsed: URL;
  try {
    parsed = new URL(text);
  } catch {
    fail("datanet.public_base_url must be an absolute URL");
  }
  assertCondition(parsed.protocol === "https:", "datanet public base must use HTTPS");
  assertCondition(parsed.username === "" && parsed.password === "", "datanet public base must not contain credentials");
  assertCondition(parsed.search === "" && parsed.hash === "", "datanet public base must not contain query or fragment");
  assertCondition(!isLoopbackHost(parsed.hostname), "datanet public base must not be loopback");
  assertCondition(!isPrivateIpLiteral(parsed.hostname), "datanet public base must not be a private IP literal");
  return parsed.toString().replace(/\/+$/u, "");
}

function validateRelativePath(value: unknown, label: string): string {
  const text = requireString(value, label, 1, 4096);
  assertCondition(!path.isAbsolute(text), `${label} must be relative`);
  const normalized = path.normalize(text);
  assertCondition(normalized === text, `${label} must be normalized`);
  assertCondition(normalized !== ".." && !normalized.startsWith(`..${path.sep}`), `${label} must not escape its root`);
  return text;
}

export function validateExternalAgentPaidWorkSubmissionPrerequisiteCreationGateConfigV1(
  value: unknown,
): ExternalAgentPaidWorkSubmissionPrerequisiteCreationGateConfigV1 {
  const root = requireRecord(value, "gate config");
  requireExactKeys(root, "gate config", [
    "marker",
    "version",
    "enabled",
    "max_datanet_object_bytes",
  ]);
  assertCondition(
    root.marker === EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_CONFIG_MARKER,
    "gate config marker mismatch",
  );
  assertCondition(root.version === 1, "gate config version must be 1");
  return {
    marker: EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_CONFIG_MARKER,
    version: 1,
    enabled: requireBoolean(root.enabled, "gate config.enabled"),
    max_datanet_object_bytes: requireInteger(
      root.max_datanet_object_bytes,
      "gate config.max_datanet_object_bytes",
      64,
      1024 * 1024,
    ),
  };
}

function validateDatanetReceiptV1(
  value: unknown,
  publicBaseUrl: string,
  maximumObjectBytes: number,
): DatanetFieldObjectReceiptV1 {
  const root = requireRecord(value, "datanet receipt");
  requireExactKeys(root, "datanet receipt", [
    "marker",
    "created_at",
    "host",
    "object_id",
    "dir_id",
    "sha256",
    "bytes",
    "object_path",
    "receipt_path",
    "public_path",
    "receipt_public_path",
    "url",
    "verified_locally",
    "dangerous_paths_touched",
  ]);
  assertCondition(root.marker === DATANET_FIELD_OBJECT_CREATE_RESULT_MARKER, "datanet receipt marker mismatch");
  const sha = requireString(root.sha256, "datanet receipt.sha256", 64, 64, SHA256);
  const dirId = requireString(root.dir_id, "datanet receipt.dir_id", 71, 71);
  assertCondition(dirId === `sha256-${sha}`, "datanet receipt dir_id mismatch");
  const objectId = requireString(root.object_id, "datanet receipt.object_id", 71, 71);
  assertCondition(objectId === `sha256:${sha}`, "datanet receipt object_id mismatch");
  const bytes = requireInteger(root.bytes, "datanet receipt.bytes", 1, maximumObjectBytes);
  const objectPath = validateRelativePath(root.object_path, "datanet receipt.object_path");
  const receiptPath = validateRelativePath(root.receipt_path, "datanet receipt.receipt_path");
  const expectedObjectPath = `public${path.sep}public-node${path.sep}datanet${path.sep}field-objects${path.sep}${dirId}${path.sep}object.txt`;
  const expectedReceiptPath = `public${path.sep}public-node${path.sep}datanet${path.sep}field-objects${path.sep}${dirId}${path.sep}receipt.json`;
  assertCondition(objectPath === expectedObjectPath, "datanet receipt object_path mismatch");
  assertCondition(receiptPath === expectedReceiptPath, "datanet receipt receipt_path mismatch");
  const publicPath = requireString(root.public_path, "datanet receipt.public_path", 1, 4096);
  const receiptPublicPath = requireString(root.receipt_public_path, "datanet receipt.receipt_public_path", 1, 4096);
  assertCondition(
    publicPath === `/public-node/datanet/field-objects/${dirId}/object.txt`,
    "datanet public_path mismatch",
  );
  assertCondition(
    receiptPublicPath === `/public-node/datanet/field-objects/${dirId}/receipt.json`,
    "datanet receipt_public_path mismatch",
  );
  const url = requireString(root.url, "datanet receipt.url", 1, 4096);
  assertCondition(url === `${publicBaseUrl}${publicPath}`, "datanet receipt URL mismatch");
  assertCondition(root.verified_locally === true, "datanet receipt must be locally verified");
  assertCondition(root.dangerous_paths_touched === false, "datanet receipt touched dangerous paths");
  return {
    marker: DATANET_FIELD_OBJECT_CREATE_RESULT_MARKER,
    created_at: requireIsoUtc(root.created_at, "datanet receipt.created_at"),
    host: requireString(root.host, "datanet receipt.host", 1, 255),
    object_id: objectId,
    dir_id: dirId,
    sha256: sha,
    bytes,
    object_path: objectPath,
    receipt_path: receiptPath,
    public_path: publicPath,
    receipt_public_path: receiptPublicPath,
    url,
    verified_locally: true,
    dangerous_paths_touched: false,
  };
}

export function validateExternalAgentPaidWorkSubmissionPrerequisiteCreationGateCommandV1(
  value: unknown,
  maximumObjectBytes: number,
): ExternalAgentPaidWorkSubmissionPrerequisiteCreationGateCommandV1 {
  const root = requireRecord(value, "gate command");
  requireExactKeys(root, "gate command", [
    "marker",
    "version",
    "operation",
    "apply",
    "confirmation",
    "operation_id",
    "datanet",
    "submission",
  ]);
  assertCondition(
    root.marker === EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_COMMAND_MARKER,
    "gate command marker mismatch",
  );
  assertCondition(root.version === 1, "gate command version must be 1");
  assertCondition(
    root.operation === "create_prerequisites" || root.operation === "prepare_submission",
    "gate command operation mismatch",
  );
  const apply = requireBoolean(root.apply, "gate command.apply");
  const confirmation = requireString(root.confirmation, "gate command.confirmation", 0, 160);
  assertCondition(
    apply
      ? confirmation === EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_CONFIRMATION
      : confirmation === "",
    apply
      ? "applied prerequisite creation requires exact confirmation"
      : "dry-run prerequisite creation confirmation must be empty",
  );
  const operationId = requireString(root.operation_id, "gate command.operation_id", 3, 128, MACHINE_ID);

  const datanetRoot = requireRecord(root.datanet, "gate command.datanet");
  requireExactKeys(datanetRoot, "gate command.datanet", [
    "mode",
    "public_base_url",
    "staging_root",
    "receipt",
  ]);
  assertCondition(
    datanetRoot.mode === "create" || datanetRoot.mode === "existing",
    "datanet mode must be create or existing",
  );
  const publicBaseUrl = normalizePublicBaseUrl(datanetRoot.public_base_url);
  const stagingRoot = requireString(datanetRoot.staging_root, "datanet.staging_root", 0, 4096);
  let receipt: DatanetFieldObjectReceiptV1 | null = null;
  if (datanetRoot.mode === "existing") {
    assertCondition(stagingRoot === "", "existing Datanet mode must not specify a staging root");
    receipt = validateDatanetReceiptV1(datanetRoot.receipt, publicBaseUrl, maximumObjectBytes);
  } else {
    assertCondition(path.isAbsolute(stagingRoot), "create Datanet staging root must be absolute");
    assertCondition(path.normalize(stagingRoot) === stagingRoot, "create Datanet staging root must be normalized");
    assertCondition(datanetRoot.receipt === null, "create Datanet mode must not include an existing receipt");
  }

  let submission: ExternalAgentPaidWorkSubmissionPrerequisiteSubmissionCommandV1 | null = null;
  if (root.submission !== null) {
    const submissionRoot = requireRecord(root.submission, "gate command.submission");
    requireExactKeys(submissionRoot, "gate command.submission", [
      "submission_id",
      "work_order",
      "admission_policy",
      "evaluated_at_utc",
    ]);
    validateAgentPaidWorkOrderEnvelope(submissionRoot.work_order);
    validateAgentPaidWorkSubmissionAdmissionPolicyV1(submissionRoot.admission_policy);
    submission = {
      submission_id: requireString(
        submissionRoot.submission_id,
        "submission.submission_id",
        3,
        128,
        MACHINE_ID,
      ),
      work_order: submissionRoot.work_order,
      admission_policy: submissionRoot.admission_policy,
      evaluated_at_utc: requireIsoUtc(
        submissionRoot.evaluated_at_utc,
        "submission.evaluated_at_utc",
      ),
    };
  }

  if (root.operation === "create_prerequisites") {
    assertCondition(datanetRoot.mode === "create", "create_prerequisites requires Datanet create mode");
    assertCondition(submission === null, "create_prerequisites must not include a submission");
  } else {
    assertCondition(datanetRoot.mode === "existing", "prepare_submission requires Datanet existing mode");
    assertCondition(submission !== null, "prepare_submission requires a submission");
  }

  return {
    marker: EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_COMMAND_MARKER,
    version: 1,
    operation: root.operation,
    apply,
    confirmation,
    operation_id: operationId,
    datanet: {
      mode: datanetRoot.mode,
      public_base_url: publicBaseUrl,
      staging_root: stagingRoot,
      receipt,
    },
    submission,
  };
}

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function assertPrivateDirectory(pathname: string, label: string): void {
  const metadata = lstatSync(pathname);
  assertCondition(metadata.isDirectory(), `${label} must be a directory`);
  assertCondition(!metadata.isSymbolicLink(), `${label} must not be a symlink`);
  assertCondition(metadata.uid === process.getuid?.(), `${label} must be owned by the current user`);
  assertCondition((metadata.mode & 0o077) === 0, `${label} must not grant group or other permissions`);
}

async function runDatanetFieldObjectToolV1(
  operationId: string,
  stagingRoot: string,
  publicBaseUrl: string,
  maximumObjectBytes: number,
): Promise<DatanetFieldObjectReceiptV1> {
  const modulePath = fileURLToPath(import.meta.url);
  const repositoryRoot = realpathSync(path.dirname(path.dirname(modulePath)));
  const toolPath = realpathSync(
    fileURLToPath(new URL("../tools/datanet-field-object-create-v1.mjs", import.meta.url)),
  );
  const normalizedStagingRoot = path.resolve(stagingRoot);
  assertCondition(!isWithin(repositoryRoot, normalizedStagingRoot), "Datanet staging root must remain outside the repository");
  if (!existsSync(normalizedStagingRoot)) {
    mkdirSync(normalizedStagingRoot, { recursive: true, mode: 0o700 });
    chmodSync(normalizedStagingRoot, 0o700);
  }
  assertPrivateDirectory(normalizedStagingRoot, "Datanet staging root");
  const runRoot = path.join(normalizedStagingRoot, operationId);
  assertCondition(!existsSync(runRoot), "Datanet operation directory already exists");
  mkdirSync(runRoot, { mode: 0o700 });
  chmodSync(runRoot, 0o700);

  const output = await new Promise<{ stdout: string; stderr: string }>((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [toolPath], {
      cwd: runRoot,
      env: {
        HOME: process.env.HOME ?? "",
        PATH: process.env.PATH ?? "",
        VOID_FIELD_BASE_URL: publicBaseUrl,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let outputBytes = 0;
    let killedForSize = false;
    const append = (target: "stdout" | "stderr", chunk: Buffer | string): void => {
      const text = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : chunk;
      outputBytes += Buffer.byteLength(text, "utf8");
      if (outputBytes > MAX_CAPTURE_OUTPUT_BYTES) {
        killedForSize = true;
        child.kill("SIGKILL");
        return;
      }
      if (target === "stdout") stdout += text;
      else stderr += text;
    };
    child.stdout.on("data", (chunk) => append("stdout", chunk));
    child.stderr.on("data", (chunk) => append("stderr", chunk));
    const timer = setTimeout(() => child.kill("SIGKILL"), DATANET_TOOL_TIMEOUT_MS);
    timer.unref();
    child.once("error", (error) => {
      clearTimeout(timer);
      rejectPromise(error);
    });
    child.once("close", (code, signal) => {
      clearTimeout(timer);
      if (killedForSize) {
        rejectPromise(new Error("Datanet tool output exceeded the bounded limit"));
        return;
      }
      if (code !== 0) {
        rejectPromise(new Error(`Datanet tool failed code=${String(code)} signal=${String(signal)} stderr=${stderr.slice(0, 2048)}`));
        return;
      }
      resolvePromise({ stdout, stderr });
    });
  });

  assertCondition(
    output.stdout.split(/\r?\n/u).includes(DATANET_FIELD_OBJECT_CREATE_RESULT_MARKER),
    "Datanet tool did not emit its green marker",
  );
  const latestPath = path.join(
    runRoot,
    "public",
    "public-node",
    "datanet",
    "field-objects",
    "latest.json",
  );
  assertCondition(existsSync(latestPath), "Datanet tool did not create latest.json");
  const receipt = validateDatanetReceiptV1(
    JSON.parse(readFileSync(latestPath, "utf8")) as unknown,
    publicBaseUrl,
    maximumObjectBytes,
  );
  const objectPath = path.resolve(runRoot, receipt.object_path);
  const receiptPath = path.resolve(runRoot, receipt.receipt_path);
  assertCondition(isWithin(runRoot, objectPath), "Datanet object path escaped the operation root");
  assertCondition(isWithin(runRoot, receiptPath), "Datanet receipt path escaped the operation root");
  const objectMetadata = lstatSync(objectPath);
  const receiptMetadata = lstatSync(receiptPath);
  assertCondition(objectMetadata.isFile() && !objectMetadata.isSymbolicLink(), "Datanet object must be a regular non-symlink file");
  assertCondition(receiptMetadata.isFile() && !receiptMetadata.isSymbolicLink(), "Datanet receipt must be a regular non-symlink file");
  const objectBytes = readFileSync(objectPath);
  assertCondition(objectBytes.length === receipt.bytes, "Datanet object byte count mismatch");
  assertCondition(sha256Text(objectBytes) === receipt.sha256, "Datanet object SHA mismatch");
  const storedReceipt = validateDatanetReceiptV1(
    JSON.parse(readFileSync(receiptPath, "utf8")) as unknown,
    publicBaseUrl,
    maximumObjectBytes,
  );
  assertCondition(canonicalJson(storedReceipt) === canonicalJson(receipt), "Datanet latest and stored receipts differ");
  return receipt;
}

async function mountCallbackReceiverV1(
  environment: NodeJS.ProcessEnv,
  appProvider: () => unknown,
  trustedContextProvider: () => unknown,
): Promise<unknown> {
  const confirmations =
    publicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationExpectedConfirmationsV1();
  return executePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationV1(
    {
      marker:
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_CONFIG_MARKER,
      version:
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_VERSION,
      enabled: true,
    },
    {
      marker:
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_COMMAND_MARKER,
      version:
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_VERSION,
      apply: true,
      confirmation: confirmations.callsite_confirmation,
      composition_confirmation: confirmations.composition_confirmation,
      registrar_confirmation: confirmations.registrar_confirmation,
      mount_confirmation: confirmations.mount_confirmation,
    },
    environment,
    appProvider,
    trustedContextProvider,
  );
}

export const EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_DEFAULT_DEPENDENCIES_V1:
  ExternalAgentPaidWorkSubmissionPrerequisiteCreationGateDependenciesV1 =
  Object.freeze({
    createDatanetFieldObject: runDatanetFieldObjectToolV1,
    mountCallbackReceiver: mountCallbackReceiverV1,
  });

function validateMountedCallbackResult(value: unknown): {
  status: "mounted" | "already_mounted";
  resultSha256: string;
} {
  const root = requireRecord(value, "callback bootstrap result");
  assertCondition(
    root.marker === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_RESULT_MARKER,
    "callback bootstrap result marker mismatch",
  );
  assertCondition(
    root.version === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_VERSION,
    "callback bootstrap result version mismatch",
  );
  assertCondition(
    root.adapter_id === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_ADAPTER_ID,
    "callback bootstrap adapter mismatch",
  );
  assertCondition(root.status === "mounted" || root.status === "already_mounted", "callback receiver was not mounted");
  assertCondition(root.enabled === true && root.apply === true, "callback bootstrap did not apply");
  assertCondition(root.confirmation_verified === true, "callback bootstrap confirmation was not verified");
  assertCondition(root.composition_module_imported === true, "callback composition module was not imported");
  assertCondition(root.composition_invoked === true, "callback composition was not invoked");
  assertCondition(root.app_provider_forwarded === true, "callback app provider was not forwarded");
  assertCondition(root.trusted_context_provider_forwarded === true, "callback trusted context provider was not forwarded");
  const authority = requireRecord(root.authority, "callback bootstrap authority");
  for (const key of [
    "trusted_context_provider_invocation",
    "network_listener_creation",
    "external_http_submission",
    "production_acceptance_persistence",
    "production_replay_write",
    "payment_authorization",
    "payment_execution",
    "execution_authorization",
    "work_dispatch",
    "production_signing",
    "transaction_broadcast",
    "work_credit_write",
    "money_movement",
  ]) {
    assertCondition(authority[key] === false, `callback bootstrap authority.${key} must be false`);
  }
  return {
    status: root.status,
    resultSha256: sha256Text(JSON.stringify(normalizeJson(root))),
  };
}

function buildPreparedSubmission(
  submission: ExternalAgentPaidWorkSubmissionPrerequisiteSubmissionCommandV1,
  receipt: DatanetFieldObjectReceiptV1,
): {
  admission: AgentPaidWorkSubmissionAdmissionV1;
  prepared: ExternalAgentPaidWorkPreparedSubmissionV1;
  reference: string;
} {
  validateAgentPaidWorkOrderEnvelope(submission.work_order);
  validateAgentPaidWorkSubmissionAdmissionPolicyV1(submission.admission_policy);
  assertCondition(
    submission.work_order.service.capability_id === "datanet.fetch_verify",
    "prepared submission capability must be datanet.fetch_verify",
  );
  const acceptableReferences = [receipt.url, receipt.object_id, receipt.public_path];
  const reference = submission.work_order.service.input_refs.find(
    (entry) => acceptableReferences.includes(entry),
  );
  assertCondition(reference !== undefined, "work order does not bind the validated Datanet object reference");
  const admission = materializeAgentPaidWorkSubmissionAdmissionV1(
    submission.work_order,
    submission.admission_policy,
    submission.evaluated_at_utc,
  );
  assertCondition(admission.decision === "accepted_for_review", `work order was not admitted: ${admission.reason_codes.join(",")}`);
  const request = {
    marker: EXTERNAL_AGENT_PAID_WORK_SUBMISSION_REQUEST_MARKER,
    version: 1 as const,
    submission_id: submission.submission_id,
    work_order: submission.work_order,
  };
  const canonicalBody = canonicalJson(request);
  const payloadSha256 = sha256Text(canonicalBody);
  return {
    admission,
    reference,
    prepared: {
      marker: "VOID_EXTERNAL_AGENT_PAID_WORK_PREPARED_SUBMISSION_V1",
      version: 1,
      endpoint_path: EXTERNAL_AGENT_PAID_WORK_SUBMISSION_REQUEST_PATH,
      method: "POST",
      request,
      canonical_body: canonicalBody,
      body_bytes: Buffer.byteLength(canonicalBody, "utf8"),
      payload_sha256: payloadSha256,
      headers: {
        "content-type": "application/json",
        "x-void-payload-sha256": payloadSha256,
      },
      authorization_header_present: false,
      token_read: false,
      request_sent: false,
    },
  };
}

function authority(
  localDatanetWrite: boolean,
  expressRouteMount: boolean,
): ExternalAgentPaidWorkSubmissionPrerequisiteCreationGateResultV1["authority"] {
  return Object.freeze({
    local_datanet_staging_write: localDatanetWrite,
    express_route_mount: expressRouteMount,
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
    transaction_broadcast: false,
    service_restart: false,
    deployment: false,
    money_movement: false,
  });
}

function disabledResult(): ExternalAgentPaidWorkSubmissionPrerequisiteCreationGateResultV1 {
  return {
    marker: EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_RESULT_MARKER,
    version: 1,
    adapter_id: EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_ADAPTER_ID,
    status: "disabled",
    enabled: false,
    apply: false,
    operation: null,
    operation_id: null,
    confirmation_verified: false,
    datanet: {
      mode: null,
      creation_invoked: false,
      receipt_validated: false,
      receipt: null,
      reference: null,
      work_order_reference_bound: false,
    },
    callback: {
      invocation_attempted: false,
      status: "not_invoked",
      status_path: EXTERNAL_AGENT_PAID_WORK_SUBMISSION_CALLBACK_STATUS_PATH,
      command_path: EXTERNAL_AGENT_PAID_WORK_SUBMISSION_CALLBACK_COMMAND_PATH,
      result_sha256: null,
    },
    admission: null,
    prepared_submission: null,
    authority: authority(false, false),
  };
}

export async function executeExternalAgentPaidWorkSubmissionPrerequisiteCreationGateV1(
  configValue: unknown,
  commandValue: unknown,
  environment: NodeJS.ProcessEnv,
  appProvider?: () => unknown,
  trustedContextProvider?: () => unknown,
  dependencies:
    ExternalAgentPaidWorkSubmissionPrerequisiteCreationGateDependenciesV1 =
      EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_DEFAULT_DEPENDENCIES_V1,
): Promise<ExternalAgentPaidWorkSubmissionPrerequisiteCreationGateResultV1> {
  const config = validateExternalAgentPaidWorkSubmissionPrerequisiteCreationGateConfigV1(configValue);
  if (!config.enabled) return disabledResult();
  const command = validateExternalAgentPaidWorkSubmissionPrerequisiteCreationGateCommandV1(
    commandValue,
    config.max_datanet_object_bytes,
  );

  let receipt = command.datanet.receipt;
  let admission: AgentPaidWorkSubmissionAdmissionV1 | null = null;
  let prepared: ExternalAgentPaidWorkPreparedSubmissionV1 | null = null;
  let reference: string | null = null;
  let workOrderReferenceBound = false;

  if (command.operation === "prepare_submission") {
    assertCondition(receipt !== null, "prepare_submission receipt is unavailable");
    const built = buildPreparedSubmission(command.submission!, receipt);
    admission = built.admission;
    prepared = built.prepared;
    reference = built.reference;
    workOrderReferenceBound = true;
  }

  if (!command.apply) {
    return {
      marker: EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_RESULT_MARKER,
      version: 1,
      adapter_id: EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_ADAPTER_ID,
      status: "planned",
      enabled: true,
      apply: false,
      operation: command.operation,
      operation_id: command.operation_id,
      confirmation_verified: false,
      datanet: {
        mode: command.datanet.mode,
        creation_invoked: false,
        receipt_validated: receipt !== null,
        receipt,
        reference,
        work_order_reference_bound: workOrderReferenceBound,
      },
      callback: {
        invocation_attempted: false,
        status: "not_invoked",
        status_path: EXTERNAL_AGENT_PAID_WORK_SUBMISSION_CALLBACK_STATUS_PATH,
        command_path: EXTERNAL_AGENT_PAID_WORK_SUBMISSION_CALLBACK_COMMAND_PATH,
        result_sha256: null,
      },
      admission,
      prepared_submission: prepared,
      authority: authority(false, false),
    };
  }

  assertCondition(typeof appProvider === "function", "applied prerequisite creation requires an Express app provider");
  assertCondition(typeof trustedContextProvider === "function", "applied prerequisite creation requires a trusted context provider");
  assertCondition(
    dependencies && typeof dependencies.createDatanetFieldObject === "function",
    "Datanet creator dependency is required",
  );
  assertCondition(
    typeof dependencies.mountCallbackReceiver === "function",
    "callback mount dependency is required",
  );

  let datanetCreationInvoked = false;
  if (command.operation === "create_prerequisites") {
    datanetCreationInvoked = true;
    receipt = await dependencies.createDatanetFieldObject(
      command.operation_id,
      command.datanet.staging_root,
      command.datanet.public_base_url,
      config.max_datanet_object_bytes,
    );
    receipt = validateDatanetReceiptV1(
      receipt,
      command.datanet.public_base_url,
      config.max_datanet_object_bytes,
    );
    reference = receipt.url;
  }

  const rawCallbackResult = await dependencies.mountCallbackReceiver(
    environment,
    appProvider,
    trustedContextProvider,
  );
  const callbackResult = validateMountedCallbackResult(rawCallbackResult);

  return {
    marker: EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_RESULT_MARKER,
    version: 1,
    adapter_id: EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_CREATION_GATE_ADAPTER_ID,
    status: command.operation === "create_prerequisites"
      ? "prerequisites_created"
      : "submission_prepared",
    enabled: true,
    apply: true,
    operation: command.operation,
    operation_id: command.operation_id,
    confirmation_verified: true,
    datanet: {
      mode: command.datanet.mode,
      creation_invoked: datanetCreationInvoked,
      receipt_validated: receipt !== null,
      receipt,
      reference,
      work_order_reference_bound: workOrderReferenceBound,
    },
    callback: {
      invocation_attempted: true,
      status: callbackResult.status,
      status_path: EXTERNAL_AGENT_PAID_WORK_SUBMISSION_CALLBACK_STATUS_PATH,
      command_path: EXTERNAL_AGENT_PAID_WORK_SUBMISSION_CALLBACK_COMMAND_PATH,
      result_sha256: callbackResult.resultSha256,
    },
    admission,
    prepared_submission: prepared,
    authority: authority(datanetCreationInvoked, true),
  };
}
