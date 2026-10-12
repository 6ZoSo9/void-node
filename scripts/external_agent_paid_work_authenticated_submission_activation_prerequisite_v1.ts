import {
  chmodSync,
  closeSync,
  constants as fsConstants,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
  type Stats,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_CONFIG_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_CONFIG_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_COMMAND_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_COMMAND_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_RESULT_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_RESULT_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PLAN_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PLAN_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_OPERATOR_DECISION_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_OPERATOR_DECISION_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_EXAMPLE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_EXAMPLE_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_VERSION =
  1 as const;
export const EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_CONFIRMATION =
  "reviewExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteV1" as const;
export const EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_GATE_ID =
  "void.external-agent-paid-work-authenticated-submission-activation-prerequisite.v1" as const;

export const PREPARE_ONLY_HANDOFF_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_SUBMISSION_PREREQUISITE_PREPARE_ONLY_RUNTIME_HANDOFF_V1" as const;
export const PREPARE_ONLY_ADAPTER_ID =
  "void.external-agent-paid-work-submission-prerequisite-prepare-only-runtime-integration.v1" as const;
export const PAID_WORK_SUBMISSION_REQUEST_MARKER =
  "VOID_AGENT_PAID_WORK_SUBMISSION_REQUEST_V1" as const;
export const PAID_WORK_SUBMISSION_PATH =
  "/__void/agents/paid-work/submissions/v1" as const;
export const PAID_WORK_CLIENT_RELATIVE_PATH =
  "tools/void-ai-agent-paid-work-client-v1.mjs" as const;
export const REQUIRED_CONTENT_TYPE = "application/json" as const;

const PLAN_FILE_SUFFIX = "authenticated-submission-activation-plan-v1.json";
const DECISION_FILE_SUFFIX =
  "authenticated-submission-operator-decision-v1.json";
const SHA256 = /^[0-9a-f]{64}$/u;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,179}$/u;
const SCOPE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{2,127}$/u;
const NONCE = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/u;
const WORK_ORDER_ID = /^voidawo1_[0-9a-f]{64}$/u;
const ISO_UTC_SECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;

export interface ExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteConfigV1 {
  marker:
    typeof EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_CONFIG_MARKER;
  version:
    typeof EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_VERSION;
  enabled: boolean;
  allowed_base_origins: string[];
  allowed_endpoint_paths: string[];
  max_handoff_bytes: number;
  max_request_bytes: number;
  max_handoff_age_seconds: number;
  max_activation_ttl_seconds: number;
  min_remaining_work_order_ttl_seconds: number;
  max_clock_skew_seconds: number;
  max_known_replay_keys: number;
}

export interface ExternalAgentPaidWorkCredentialReferenceMetadataV1 {
  mode: "credential_registry" | "single_token_fallback";
  reference_id: string;
  source_locator_sha256: string;
  expected_scope: string;
  registry_id: string | null;
  credential_id: string | null;
  agent_id: string | null;
  not_before_utc: string | null;
  expires_at_utc: string | null;
}

export interface ExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteCommandV1 {
  marker:
    typeof EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_COMMAND_MARKER;
  version:
    typeof EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_VERSION;
  apply: boolean;
  confirmation: string;
  operation_id: string;
  evaluated_at_utc: string;
  activation_expires_at_utc: string;
  handoff_path: string;
  request_path: string;
  output_directory: string;
  expected: {
    base_origin: string;
    endpoint_path: string;
    submission_id: string;
    work_order_id: string;
    payload_sha256: string;
  };
  credential_reference: ExternalAgentPaidWorkCredentialReferenceMetadataV1;
  replay: {
    nonce: string;
    expected_replay_key: string | null;
    known_replay_keys: string[];
  };
  operator_intent: {
    expect_new: boolean;
    live_submission_authorized: false;
  };
}

export interface ExternalAgentPaidWorkAuthenticatedSubmissionActivationPlanV1 {
  marker:
    typeof EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PLAN_MARKER;
  version:
    typeof EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_VERSION;
  gate_id:
    typeof EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_GATE_ID;
  operation_id: string;
  generated_at_utc: string;
  expires_at_utc: string;
  status: "prerequisites_satisfied_separate_live_execution_required";
  bindings: {
    base_origin: string;
    endpoint_path: typeof PAID_WORK_SUBMISSION_PATH;
    method: "POST";
    content_type: typeof REQUIRED_CONTENT_TYPE;
    submission_id: string;
    work_order_id: string;
    payload_sha256: string;
    request_bytes: number;
    handoff_sha256: string;
    replay_key: string;
  };
  credential_reference: ExternalAgentPaidWorkCredentialReferenceMetadataV1;
  freshness: {
    handoff_prepared_at_utc: string;
    work_order_created_at_utc: string;
    work_order_expires_at_utc: string;
    evaluated_at_utc: string;
    activation_expires_at_utc: string;
  };
  replay: {
    nonce: string;
    replay_key: string;
    known_replay_key_count: number;
    collision_detected: false;
    reservation_written: false;
  };
  gates: {
    handoff_integrity: true;
    request_integrity: true;
    endpoint_allowlisted: true;
    content_type_exact: true;
    payload_digest_exact: true;
    submission_identity_exact: true;
    work_order_identity_exact: true;
    handoff_fresh: true;
    work_order_fresh: true;
    activation_window_bounded: true;
    credential_reference_metadata_valid: true;
    credential_valid_for_activation_window: true;
    replay_key_unique_in_supplied_snapshot: true;
    operator_expect_new: boolean;
    operator_live_submission_authorized: false;
  };
  execution_boundary: {
    credential_or_token_read: false;
    authorization_header_materialized: false;
    network_listener_creation: false;
    runtime_mount: false;
    request_sent: false;
    authenticated_submission_post: false;
    live_ticket_issuance: false;
    wc_ledger_write: false;
    wallet_or_signer_access: false;
    separate_live_execution_lane_required: true;
  };
}

export interface ExternalAgentPaidWorkAuthenticatedSubmissionOperatorDecisionV1 {
  marker:
    typeof EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_OPERATOR_DECISION_MARKER;
  version:
    typeof EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_VERSION;
  gate_id:
    typeof EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_GATE_ID;
  operation_id: string;
  decision: "hold_separate_live_execution_required";
  confirmation_verified: true;
  activation_plan_sha256: string;
  activation_plan_path: string;
  credential_reference_id: string;
  replay_key: string;
  authority: ExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteAuthorityV1;
}

export interface ExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteAuthorityV1 {
  local_private_plan_write: boolean;
  local_private_decision_write: boolean;
  credential_or_token_read: false;
  authorization_header_materialized: false;
  network_listener_creation: false;
  runtime_mount: false;
  external_http_submission: false;
  authenticated_submission_post: false;
  provider_selection: false;
  quote_creation: false;
  payment_authorization: false;
  payment_execution: false;
  work_execution_authorization: false;
  work_dispatch: false;
  live_ticket_issuance: false;
  work_credit_write: false;
  wallet_or_signer_access: false;
  signing: false;
  transaction_broadcast: false;
  service_restart: false;
  deployment: false;
  money_movement: false;
}

export interface ExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteResultV1 {
  marker:
    typeof EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_RESULT_MARKER;
  version:
    typeof EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_VERSION;
  gate_id:
    typeof EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_GATE_ID;
  status: "disabled" | "validated_in_memory" | "validated_and_written";
  enabled: boolean;
  apply: boolean;
  operation_id: string | null;
  confirmation_verified: boolean;
  replay_key: string | null;
  plan: ExternalAgentPaidWorkAuthenticatedSubmissionActivationPlanV1 | null;
  artifacts: {
    output_directory: string | null;
    activation_plan_path: string | null;
    operator_decision_path: string | null;
    private_files_written: boolean;
  };
  authority: ExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteAuthorityV1;
}

type PaidWorkRequestInspectionV1 = Readonly<{
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
  ) => PaidWorkRequestInspectionV1;
}>;

export interface ExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteDependenciesV1 {
  repositoryRoot: () => string;
  loadPaidWorkClient: () => Promise<PaidWorkClientModuleV1>;
}

type PrivateJsonFile = Readonly<{
  path: string;
  bytes: Buffer;
  sha256: string;
  value: unknown;
}>;

type ParsedHandoff = Readonly<{
  operationId: string;
  preparedAtUtc: string;
  requestPath: string;
  method: "POST";
  endpointPath: typeof PAID_WORK_SUBMISSION_PATH;
  canonicalBody: string;
  bodyBytes: number;
  payloadSha256: string;
  contentType: typeof REQUIRED_CONTENT_TYPE;
  baseOrigin: string;
  submissionId: string;
  workOrderId: string;
}>;

type ParsedRequest = Readonly<{
  submissionId: string;
  workOrderId: string;
  createdAtUtc: string;
  expiresAtUtc: string;
  nonce: string;
}>;

function fail(message: string): never {
  throw new Error(
    `external-agent authenticated-submission activation prerequisite v1: ${message}`,
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
    value !== null
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
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  assertCondition(
    actual.length === wanted.length
      && actual.every((entry, index) => entry === wanted[index]),
    `${label} keys mismatch; expected=${wanted.join(",")}; actual=${actual.join(",")}`,
  );
}

function requireString(
  value: unknown,
  label: string,
  minimum = 1,
  maximum = 4096,
): string {
  assertCondition(typeof value === "string", `${label} must be a string`);
  assertCondition(
    value.length >= minimum && value.length <= maximum,
    `${label} length must be ${minimum}..${maximum}`,
  );
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
    Number.isInteger(value)
      && Number(value) >= minimum
      && Number(value) <= maximum,
    `${label} must be an integer in ${minimum}..${maximum}`,
  );
  return Number(value);
}

function requireIsoUtc(value: unknown, label: string): string {
  const text = requireString(value, label, 20, 20);
  assertCondition(
    ISO_UTC_SECONDS.test(text)
      && Number.isFinite(Date.parse(text)),
    `${label} must be exact UTC seconds`,
  );
  return text;
}

function requireNullableIsoUtc(
  value: unknown,
  label: string,
): string | null {
  if (value === null) return null;
  return requireIsoUtc(value, label);
}

function requireId(
  value: unknown,
  label: string,
  pattern: RegExp = ID,
): string {
  const text = requireString(value, label, 3, 180);
  assertCondition(pattern.test(text), `${label} has unsupported format`);
  return text;
}

function requireSha256(value: unknown, label: string): string {
  const text = requireString(value, label, 64, 64).toLowerCase();
  assertCondition(SHA256.test(text), `${label} must be lowercase SHA-256`);
  return text;
}

function canonicalJson(value: unknown): string {
  const normalize = (entry: unknown): unknown => {
    if (Array.isArray(entry)) return entry.map(normalize);
    if (isRecord(entry)) {
      return Object.fromEntries(
        Object.keys(entry)
          .sort()
          .map((key) => [key, normalize(entry[key])]),
      );
    }
    assertCondition(
      entry === null
        || typeof entry === "string"
        || typeof entry === "number"
        || typeof entry === "boolean",
      "canonical JSON contains a non-JSON value",
    );
    return entry;
  };
  return JSON.stringify(normalize(value));
}

function sha256Bytes(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeBaseOrigin(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    fail("base origin is not a valid URL");
  }
  assertCondition(
    parsed.protocol === "https:" || parsed.protocol === "http:",
    "base origin protocol must be HTTP or HTTPS",
  );
  assertCondition(
    !parsed.username
      && !parsed.password
      && !parsed.search
      && !parsed.hash
      && (parsed.pathname === "/" || parsed.pathname === ""),
    "base origin must contain no credentials, path, query, or fragment",
  );
  return parsed.origin;
}

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return (
    relative === ""
    || (
      !relative.startsWith(`..${path.sep}`)
      && relative !== ".."
      && !path.isAbsolute(relative)
    )
  );
}

function assertOwnerPrivate(
  pathname: string,
  metadata: Stats,
  label: string,
): void {
  assertCondition(
    !metadata.isSymbolicLink(),
    `${label} must not be a symbolic link`,
  );
  if (process.platform !== "win32") {
    assertCondition(
      (metadata.mode & 0o077) === 0,
      `${label} permissions are too broad`,
    );
    if (typeof process.getuid === "function") {
      assertCondition(
        metadata.uid === process.getuid(),
        `${label} is not owned by the current user`,
      );
    }
  }
  void pathname;
}

function readPrivateJsonFile(
  rawPath: string,
  label: string,
  maximumBytes: number,
): PrivateJsonFile {
  const resolved = path.resolve(rawPath);
  const real = realpathSync(resolved);
  const metadata = lstatSync(real);
  assertCondition(metadata.isFile(), `${label} must be a regular file`);
  assertOwnerPrivate(real, metadata, label);
  assertCondition(
    metadata.size >= 2 && metadata.size <= maximumBytes,
    `${label} size must be 2..${maximumBytes}`,
  );
  const parent = path.dirname(real);
  const parentMetadata = lstatSync(parent);
  assertCondition(parentMetadata.isDirectory(), `${label} parent is not a directory`);
  assertOwnerPrivate(parent, parentMetadata, `${label} parent directory`);
  const bytes = readFileSync(real);
  let value: unknown;
  try {
    value = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    ) as unknown;
  } catch {
    fail(`${label} must contain valid UTF-8 JSON`);
  }
  return {
    path: real,
    bytes,
    sha256: sha256Bytes(bytes),
    value,
  };
}

function assertPrivateDirectory(pathname: string, label: string): void {
  const metadata = lstatSync(pathname);
  assertCondition(metadata.isDirectory(), `${label} must be a directory`);
  assertOwnerPrivate(pathname, metadata, label);
}

function writeExclusivePrivateFile(
  pathname: string,
  body: string,
): void {
  const descriptor = openSync(
    pathname,
    fsConstants.O_CREAT
      | fsConstants.O_EXCL
      | fsConstants.O_WRONLY
      | fsConstants.O_NOFOLLOW,
    0o600,
  );
  try {
    writeFileSync(descriptor, body, "utf8");
  } finally {
    closeSync(descriptor);
  }
  chmodSync(pathname, 0o600);
}

function parseStringArray(
  value: unknown,
  label: string,
  maximumItems: number,
  validator: (entry: unknown, entryLabel: string) => string,
): string[] {
  assertCondition(Array.isArray(value), `${label} must be an array`);
  assertCondition(
    value.length <= maximumItems,
    `${label} exceeds ${maximumItems} entries`,
  );
  const output = value.map((entry, index) =>
    validator(entry, `${label}[${index}]`));
  assertCondition(
    new Set(output).size === output.length,
    `${label} contains duplicates`,
  );
  return output;
}

export function validateExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteConfigV1(
  value: unknown,
): ExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteConfigV1 {
  const record = requireRecord(value, "config");
  requireExactKeys(
    record,
    [
      "marker",
      "version",
      "enabled",
      "allowed_base_origins",
      "allowed_endpoint_paths",
      "max_handoff_bytes",
      "max_request_bytes",
      "max_handoff_age_seconds",
      "max_activation_ttl_seconds",
      "min_remaining_work_order_ttl_seconds",
      "max_clock_skew_seconds",
      "max_known_replay_keys",
    ],
    "config",
  );
  assertCondition(
    record.marker
      === EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_CONFIG_MARKER,
    "config marker mismatch",
  );
  assertCondition(record.version === 1, "config version must be 1");

  const allowedBaseOrigins = parseStringArray(
    record.allowed_base_origins,
    "config.allowed_base_origins",
    32,
    (entry, label) => normalizeBaseOrigin(requireString(entry, label, 8, 2048)),
  );
  assertCondition(
    allowedBaseOrigins.length >= 1,
    "config.allowed_base_origins must not be empty",
  );

  const allowedEndpointPaths = parseStringArray(
    record.allowed_endpoint_paths,
    "config.allowed_endpoint_paths",
    16,
    (entry, label) => {
      const text = requireString(entry, label, 1, 256);
      assertCondition(text.startsWith("/"), `${label} must be absolute`);
      assertCondition(
        !text.includes("?") && !text.includes("#"),
        `${label} must not contain query or fragment`,
      );
      return text;
    },
  );
  assertCondition(
    allowedEndpointPaths.length >= 1,
    "config.allowed_endpoint_paths must not be empty",
  );

  return {
    marker:
      EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_CONFIG_MARKER,
    version: 1,
    enabled: requireBoolean(record.enabled, "config.enabled"),
    allowed_base_origins: allowedBaseOrigins,
    allowed_endpoint_paths: allowedEndpointPaths,
    max_handoff_bytes: requireInteger(
      record.max_handoff_bytes,
      "config.max_handoff_bytes",
      1024,
      4 * 1024 * 1024,
    ),
    max_request_bytes: requireInteger(
      record.max_request_bytes,
      "config.max_request_bytes",
      256,
      1024 * 1024,
    ),
    max_handoff_age_seconds: requireInteger(
      record.max_handoff_age_seconds,
      "config.max_handoff_age_seconds",
      1,
      86_400,
    ),
    max_activation_ttl_seconds: requireInteger(
      record.max_activation_ttl_seconds,
      "config.max_activation_ttl_seconds",
      1,
      86_400,
    ),
    min_remaining_work_order_ttl_seconds: requireInteger(
      record.min_remaining_work_order_ttl_seconds,
      "config.min_remaining_work_order_ttl_seconds",
      1,
      86_400,
    ),
    max_clock_skew_seconds: requireInteger(
      record.max_clock_skew_seconds,
      "config.max_clock_skew_seconds",
      0,
      3600,
    ),
    max_known_replay_keys: requireInteger(
      record.max_known_replay_keys,
      "config.max_known_replay_keys",
      0,
      100_000,
    ),
  };
}

function validateCredentialReference(
  value: unknown,
): ExternalAgentPaidWorkCredentialReferenceMetadataV1 {
  const record = requireRecord(value, "command.credential_reference");
  requireExactKeys(
    record,
    [
      "mode",
      "reference_id",
      "source_locator_sha256",
      "expected_scope",
      "registry_id",
      "credential_id",
      "agent_id",
      "not_before_utc",
      "expires_at_utc",
    ],
    "command.credential_reference",
  );
  assertCondition(
    record.mode === "credential_registry"
      || record.mode === "single_token_fallback",
    "credential reference mode is invalid",
  );
  const referenceId = requireId(
    record.reference_id,
    "command.credential_reference.reference_id",
  );
  assertCondition(
    !referenceId.includes("/")
      && !referenceId.includes("\\")
      && !referenceId.includes(".."),
    "credential reference ID must not disclose a filesystem path",
  );
  const expectedScope = requireString(
    record.expected_scope,
    "command.credential_reference.expected_scope",
    3,
    128,
  );
  assertCondition(
    SCOPE.test(expectedScope),
    "credential expected scope has unsupported format",
  );
  const registryId =
    record.registry_id === null
      ? null
      : requireId(
          record.registry_id,
          "command.credential_reference.registry_id",
        );
  const credentialId =
    record.credential_id === null
      ? null
      : requireId(
          record.credential_id,
          "command.credential_reference.credential_id",
        );
  const agentId =
    record.agent_id === null
      ? null
      : requireId(
          record.agent_id,
          "command.credential_reference.agent_id",
        );
  const notBefore = requireNullableIsoUtc(
    record.not_before_utc,
    "command.credential_reference.not_before_utc",
  );
  const expires = requireNullableIsoUtc(
    record.expires_at_utc,
    "command.credential_reference.expires_at_utc",
  );

  if (record.mode === "credential_registry") {
    assertCondition(
      registryId !== null
        && credentialId !== null
        && agentId !== null
        && notBefore !== null
        && expires !== null,
      "credential-registry metadata must include registry, credential, agent, and validity window",
    );
    assertCondition(
      Date.parse(expires) > Date.parse(notBefore),
      "credential validity window is inverted",
    );
  } else {
    assertCondition(
      registryId === null
        && credentialId === null
        && agentId === null
        && notBefore === null
        && expires === null,
      "single-token fallback metadata must not claim registry identity or validity",
    );
  }

  return {
    mode: record.mode,
    reference_id: referenceId,
    source_locator_sha256: requireSha256(
      record.source_locator_sha256,
      "command.credential_reference.source_locator_sha256",
    ),
    expected_scope: expectedScope,
    registry_id: registryId,
    credential_id: credentialId,
    agent_id: agentId,
    not_before_utc: notBefore,
    expires_at_utc: expires,
  };
}

export function validateExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteCommandV1(
  value: unknown,
  maximumReplayKeys: number,
): ExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteCommandV1 {
  const record = requireRecord(value, "command");
  requireExactKeys(
    record,
    [
      "marker",
      "version",
      "apply",
      "confirmation",
      "operation_id",
      "evaluated_at_utc",
      "activation_expires_at_utc",
      "handoff_path",
      "request_path",
      "output_directory",
      "expected",
      "credential_reference",
      "replay",
      "operator_intent",
    ],
    "command",
  );
  assertCondition(
    record.marker
      === EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_COMMAND_MARKER,
    "command marker mismatch",
  );
  assertCondition(record.version === 1, "command version must be 1");

  const apply = requireBoolean(record.apply, "command.apply");
  const confirmation = requireString(
    record.confirmation,
    "command.confirmation",
    0,
    256,
  );
  if (apply) {
    assertCondition(
      confirmation
        === EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_CONFIRMATION,
      `apply requires exact confirmation ${EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_CONFIRMATION}`,
    );
  } else {
    assertCondition(
      confirmation === "",
      "dry-run confirmation must be empty",
    );
  }

  const expected = requireRecord(record.expected, "command.expected");
  requireExactKeys(
    expected,
    [
      "base_origin",
      "endpoint_path",
      "submission_id",
      "work_order_id",
      "payload_sha256",
    ],
    "command.expected",
  );

  const replay = requireRecord(record.replay, "command.replay");
  requireExactKeys(
    replay,
    ["nonce", "expected_replay_key", "known_replay_keys"],
    "command.replay",
  );
  const nonce = requireString(
    replay.nonce,
    "command.replay.nonce",
    8,
    128,
  );
  assertCondition(NONCE.test(nonce), "command.replay.nonce has unsupported format");
  const knownReplayKeys = parseStringArray(
    replay.known_replay_keys,
    "command.replay.known_replay_keys",
    maximumReplayKeys,
    (entry, label) => requireSha256(entry, label),
  );
  const expectedReplayKey =
    replay.expected_replay_key === null
      ? null
      : requireSha256(
          replay.expected_replay_key,
          "command.replay.expected_replay_key",
        );

  const operatorIntent = requireRecord(
    record.operator_intent,
    "command.operator_intent",
  );
  requireExactKeys(
    operatorIntent,
    ["expect_new", "live_submission_authorized"],
    "command.operator_intent",
  );
  assertCondition(
    operatorIntent.live_submission_authorized === false,
    "activation prerequisite gate forbids live-submission authorization",
  );

  return {
    marker:
      EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_COMMAND_MARKER,
    version: 1,
    apply,
    confirmation,
    operation_id: requireId(record.operation_id, "command.operation_id"),
    evaluated_at_utc: requireIsoUtc(
      record.evaluated_at_utc,
      "command.evaluated_at_utc",
    ),
    activation_expires_at_utc: requireIsoUtc(
      record.activation_expires_at_utc,
      "command.activation_expires_at_utc",
    ),
    handoff_path: path.resolve(
      requireString(record.handoff_path, "command.handoff_path", 1, 4096),
    ),
    request_path: path.resolve(
      requireString(record.request_path, "command.request_path", 1, 4096),
    ),
    output_directory: path.resolve(
      requireString(record.output_directory, "command.output_directory", 1, 4096),
    ),
    expected: {
      base_origin: normalizeBaseOrigin(
        requireString(
          expected.base_origin,
          "command.expected.base_origin",
          8,
          2048,
        ),
      ),
      endpoint_path: requireString(
        expected.endpoint_path,
        "command.expected.endpoint_path",
        1,
        256,
      ),
      submission_id: requireId(
        expected.submission_id,
        "command.expected.submission_id",
      ),
      work_order_id: requireId(
        expected.work_order_id,
        "command.expected.work_order_id",
        WORK_ORDER_ID,
      ),
      payload_sha256: requireSha256(
        expected.payload_sha256,
        "command.expected.payload_sha256",
      ),
    },
    credential_reference: validateCredentialReference(
      record.credential_reference,
    ),
    replay: {
      nonce,
      expected_replay_key: expectedReplayKey,
      known_replay_keys: knownReplayKeys,
    },
    operator_intent: {
      expect_new: requireBoolean(
        operatorIntent.expect_new,
        "command.operator_intent.expect_new",
      ),
      live_submission_authorized: false,
    },
  };
}

function parseHandoff(value: unknown): ParsedHandoff {
  const record = requireRecord(value, "prepare-only handoff");
  requireExactKeys(
    record,
    [
      "marker",
      "version",
      "adapter_id",
      "operation_id",
      "prepared_at_utc",
      "request",
      "paid_work_client",
      "mcp_http_transport",
      "callback_mount_plan",
      "identity",
      "authority",
    ],
    "prepare-only handoff",
  );
  assertCondition(record.marker === PREPARE_ONLY_HANDOFF_MARKER, "handoff marker mismatch");
  assertCondition(record.version === 1, "handoff version must be 1");
  assertCondition(record.adapter_id === PREPARE_ONLY_ADAPTER_ID, "handoff adapter mismatch");

  const request = requireRecord(record.request, "handoff.request");
  requireExactKeys(
    request,
    [
      "method",
      "endpoint_path",
      "canonical_body",
      "body_bytes",
      "payload_sha256",
      "headers_without_authorization",
      "request_path",
    ],
    "handoff.request",
  );
  assertCondition(request.method === "POST", "handoff request method must be POST");
  assertCondition(
    request.endpoint_path === PAID_WORK_SUBMISSION_PATH,
    "handoff endpoint path mismatch",
  );
  const canonicalBody = requireString(
    request.canonical_body,
    "handoff.request.canonical_body",
    2,
    1024 * 1024,
  );
  const bodyBytes = requireInteger(
    request.body_bytes,
    "handoff.request.body_bytes",
    2,
    1024 * 1024,
  );
  const payloadSha256 = requireSha256(
    request.payload_sha256,
    "handoff.request.payload_sha256",
  );
  const requestPath = path.resolve(
    requireString(
      request.request_path,
      "handoff.request.request_path",
      1,
      4096,
    ),
  );
  const headers = requireRecord(
    request.headers_without_authorization,
    "handoff.request.headers_without_authorization",
  );
  requireExactKeys(
    headers,
    ["content-type", "x-void-payload-sha256"],
    "handoff.request.headers_without_authorization",
  );
  assertCondition(
    headers["content-type"] === REQUIRED_CONTENT_TYPE,
    "handoff content type mismatch",
  );
  assertCondition(
    headers["x-void-payload-sha256"] === payloadSha256,
    "handoff digest header mismatch",
  );

  const client = requireRecord(
    record.paid_work_client,
    "handoff.paid_work_client",
  );
  requireExactKeys(
    client,
    [
      "client_relative_path",
      "base_origin",
      "mode_for_later_operator_action",
      "request_path",
      "request_validated_by_existing_client",
      "token_file",
      "authorization_header_materialized",
      "authenticated_submission_performed",
    ],
    "handoff.paid_work_client",
  );
  assertCondition(
    client.client_relative_path === PAID_WORK_CLIENT_RELATIVE_PATH,
    "handoff paid-work client path mismatch",
  );
  assertCondition(
    client.mode_for_later_operator_action === "submit",
    "handoff later-action mode mismatch",
  );
  assertCondition(
    client.request_validated_by_existing_client === true,
    "handoff request was not validated by existing client",
  );
  assertCondition(client.token_file === null, "handoff contains a token file");
  assertCondition(
    client.authorization_header_materialized === false,
    "handoff materialized authorization",
  );
  assertCondition(
    client.authenticated_submission_performed === false,
    "handoff reports authenticated submission",
  );
  assertCondition(
    path.resolve(
      requireString(
        client.request_path,
        "handoff.paid_work_client.request_path",
        1,
        4096,
      ),
    ) === requestPath,
    "handoff paid-work client request path mismatch",
  );

  const mcp = requireRecord(
    record.mcp_http_transport,
    "handoff.mcp_http_transport",
  );
  requireExactKeys(
    mcp,
    [
      "transport_path",
      "host",
      "port",
      "prepare_tool_name",
      "read_only_config_verified",
      "submit_tool_registered",
      "token_configured",
      "listener_started",
      "request_sent",
    ],
    "handoff.mcp_http_transport",
  );
  assertCondition(mcp.read_only_config_verified === true, "MCP read-only config was not verified");
  assertCondition(mcp.submit_tool_registered === false, "MCP submit tool is registered");
  assertCondition(mcp.token_configured === false, "MCP token is configured");
  assertCondition(mcp.listener_started === false, "MCP listener was started");
  assertCondition(mcp.request_sent === false, "MCP request was sent");

  const callback = requireRecord(
    record.callback_mount_plan,
    "handoff.callback_mount_plan",
  );
  requireExactKeys(
    callback,
    ["status_path", "command_path", "mount_invoked", "listener_creation"],
    "handoff.callback_mount_plan",
  );
  assertCondition(callback.mount_invoked === false, "callback mount was invoked");
  assertCondition(callback.listener_creation === false, "callback listener was created");

  const identity = requireRecord(record.identity, "handoff.identity");
  requireExactKeys(
    identity,
    [
      "submission_id",
      "work_order_id",
      "datanet_object_id",
      "datanet_reference",
    ],
    "handoff.identity",
  );

  const authority = requireRecord(record.authority, "handoff.authority");
  assertCondition(
    Object.keys(authority).length > 0
      && Object.values(authority).every((entry) => entry === false),
    "handoff authority must remain all false",
  );

  return {
    operationId: requireId(record.operation_id, "handoff.operation_id"),
    preparedAtUtc: requireIsoUtc(record.prepared_at_utc, "handoff.prepared_at_utc"),
    requestPath,
    method: "POST",
    endpointPath: PAID_WORK_SUBMISSION_PATH,
    canonicalBody,
    bodyBytes,
    payloadSha256,
    contentType: REQUIRED_CONTENT_TYPE,
    baseOrigin: normalizeBaseOrigin(
      requireString(client.base_origin, "handoff.paid_work_client.base_origin", 8, 2048),
    ),
    submissionId: requireId(identity.submission_id, "handoff.identity.submission_id"),
    workOrderId: requireId(
      identity.work_order_id,
      "handoff.identity.work_order_id",
      WORK_ORDER_ID,
    ),
  };
}

function parseRequest(value: unknown): ParsedRequest {
  const request = requireRecord(value, "submission request");
  assertCondition(
    request.marker === PAID_WORK_SUBMISSION_REQUEST_MARKER,
    "submission request marker mismatch",
  );
  assertCondition(request.version === 1, "submission request version must be 1");
  const submissionId = requireId(
    request.submission_id,
    "submission request submission_id",
  );
  const workOrder = requireRecord(
    request.work_order,
    "submission request work_order",
  );
  assertCondition(
    workOrder.marker === "VOID_AGENT_PAID_WORK_ORDER_ENVELOPE_V1",
    "work order marker mismatch",
  );
  assertCondition(workOrder.version === 1, "work order version must be 1");
  return {
    submissionId,
    workOrderId: requireId(
      workOrder.work_order_id,
      "submission request work_order.work_order_id",
      WORK_ORDER_ID,
    ),
    createdAtUtc: requireIsoUtc(
      workOrder.created_at_utc,
      "submission request work_order.created_at_utc",
    ),
    expiresAtUtc: requireIsoUtc(
      workOrder.expires_at_utc,
      "submission request work_order.expires_at_utc",
    ),
    nonce: requireId(
      workOrder.nonce,
      "submission request work_order.nonce",
      NONCE,
    ),
  };
}

function authority(
  localPlanWrite: boolean,
  localDecisionWrite: boolean,
): ExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteAuthorityV1 {
  return Object.freeze({
    local_private_plan_write: localPlanWrite,
    local_private_decision_write: localDecisionWrite,
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
  });
}

function disabledResult(): ExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteResultV1 {
  return {
    marker:
      EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_RESULT_MARKER,
    version: 1,
    gate_id:
      EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_GATE_ID,
    status: "disabled",
    enabled: false,
    apply: false,
    operation_id: null,
    confirmation_verified: false,
    replay_key: null,
    plan: null,
    artifacts: {
      output_directory: null,
      activation_plan_path: null,
      operator_decision_path: null,
      private_files_written: false,
    },
    authority: authority(false, false),
  };
}

async function defaultLoadPaidWorkClient(): Promise<PaidWorkClientModuleV1> {
  const moduleUrl = pathToFileURL(
    path.join(
      defaultRepositoryRoot(),
      PAID_WORK_CLIENT_RELATIVE_PATH,
    ),
  ).href;
  const loaded = await import(moduleUrl) as Record<string, unknown>;
  assertCondition(
    typeof loaded.normalizePaidWorkBaseUrlV1 === "function",
    "existing paid-work client URL normalizer is unavailable",
  );
  assertCondition(
    typeof loaded.readPaidWorkSubmissionRequestV1 === "function",
    "existing paid-work client request parser is unavailable",
  );
  return loaded as unknown as PaidWorkClientModuleV1;
}

function defaultRepositoryRoot(): string {
  return realpathSync(
    path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      "..",
    ),
  );
}

export const EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_DEFAULT_DEPENDENCIES_V1:
  ExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteDependenciesV1 =
    Object.freeze({
      repositoryRoot: defaultRepositoryRoot,
      loadPaidWorkClient: defaultLoadPaidWorkClient,
    });

function deriveReplayKey(
  command: ExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteCommandV1,
  handoff: ParsedHandoff,
): string {
  return sha256Text(
    canonicalJson({
      marker:
        "VOID_EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_REPLAY_KEY_INPUT_V1",
      version: 1,
      base_origin: handoff.baseOrigin,
      endpoint_path: handoff.endpointPath,
      submission_id: handoff.submissionId,
      work_order_id: handoff.workOrderId,
      payload_sha256: handoff.payloadSha256,
      credential_reference_id: command.credential_reference.reference_id,
      credential_source_locator_sha256:
        command.credential_reference.source_locator_sha256,
      nonce: command.replay.nonce,
    }),
  );
}

function validateFreshness(
  config: ExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteConfigV1,
  command: ExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteCommandV1,
  handoff: ParsedHandoff,
  request: ParsedRequest,
): void {
  const evaluated = Date.parse(command.evaluated_at_utc);
  const activationExpires = Date.parse(command.activation_expires_at_utc);
  const handoffPrepared = Date.parse(handoff.preparedAtUtc);
  const workCreated = Date.parse(request.createdAtUtc);
  const workExpires = Date.parse(request.expiresAtUtc);
  const skew = config.max_clock_skew_seconds * 1000;

  assertCondition(
    handoffPrepared <= evaluated + skew,
    "handoff was prepared too far in the future",
  );
  assertCondition(
    evaluated - handoffPrepared
      <= config.max_handoff_age_seconds * 1000,
    "handoff is older than the configured maximum",
  );
  assertCondition(
    workCreated <= evaluated + skew,
    "work order was created too far in the future",
  );
  assertCondition(
    workExpires - evaluated
      >= config.min_remaining_work_order_ttl_seconds * 1000,
    "work order does not retain the required remaining TTL",
  );
  assertCondition(
    activationExpires > evaluated,
    "activation expiry must be later than evaluation",
  );
  assertCondition(
    activationExpires - evaluated
      <= config.max_activation_ttl_seconds * 1000,
    "activation window exceeds configured maximum",
  );
  assertCondition(
    activationExpires <= workExpires,
    "activation window exceeds work-order expiry",
  );

  const credential = command.credential_reference;
  if (
    credential.mode === "credential_registry"
    && credential.not_before_utc !== null
    && credential.expires_at_utc !== null
  ) {
    assertCondition(
      Date.parse(credential.not_before_utc) <= evaluated + skew,
      "credential reference is not yet valid",
    );
    assertCondition(
      Date.parse(credential.expires_at_utc) >= activationExpires,
      "credential reference expires before the activation plan",
    );
  }
}

function buildPlan(
  command: ExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteCommandV1,
  handoffFile: PrivateJsonFile,
  handoff: ParsedHandoff,
  requestInspection: PaidWorkRequestInspectionV1,
  request: ParsedRequest,
  replayKey: string,
): ExternalAgentPaidWorkAuthenticatedSubmissionActivationPlanV1 {
  return {
    marker:
      EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PLAN_MARKER,
    version: 1,
    gate_id:
      EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_GATE_ID,
    operation_id: command.operation_id,
    generated_at_utc: command.evaluated_at_utc,
    expires_at_utc: command.activation_expires_at_utc,
    status: "prerequisites_satisfied_separate_live_execution_required",
    bindings: {
      base_origin: handoff.baseOrigin,
      endpoint_path: PAID_WORK_SUBMISSION_PATH,
      method: "POST",
      content_type: REQUIRED_CONTENT_TYPE,
      submission_id: request.submissionId,
      work_order_id: request.workOrderId,
      payload_sha256: requestInspection.sha256,
      request_bytes: requestInspection.bytes.byteLength,
      handoff_sha256: handoffFile.sha256,
      replay_key: replayKey,
    },
    credential_reference: structuredClone(command.credential_reference),
    freshness: {
      handoff_prepared_at_utc: handoff.preparedAtUtc,
      work_order_created_at_utc: request.createdAtUtc,
      work_order_expires_at_utc: request.expiresAtUtc,
      evaluated_at_utc: command.evaluated_at_utc,
      activation_expires_at_utc: command.activation_expires_at_utc,
    },
    replay: {
      nonce: command.replay.nonce,
      replay_key: replayKey,
      known_replay_key_count: command.replay.known_replay_keys.length,
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
      operator_expect_new: command.operator_intent.expect_new,
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
}

export async function executeExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteV1(
  configValue: unknown,
  commandValue: unknown,
  dependencies:
    ExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteDependenciesV1 =
      EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_DEFAULT_DEPENDENCIES_V1,
): Promise<ExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteResultV1> {
  const config =
    validateExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteConfigV1(
      configValue,
    );
  if (!config.enabled) return disabledResult();

  const command =
    validateExternalAgentPaidWorkAuthenticatedSubmissionActivationPrerequisiteCommandV1(
      commandValue,
      config.max_known_replay_keys,
    );
  assertCondition(
    dependencies
      && typeof dependencies.repositoryRoot === "function"
      && typeof dependencies.loadPaidWorkClient === "function",
    "activation-prerequisite dependencies are incomplete",
  );

  const repositoryRoot = realpathSync(dependencies.repositoryRoot());
  const outputDirectory = path.resolve(command.output_directory);
  assertCondition(
    !isWithin(repositoryRoot, command.handoff_path),
    "handoff must remain outside the repository",
  );
  assertCondition(
    !isWithin(repositoryRoot, command.request_path),
    "prepared request must remain outside the repository",
  );
  assertCondition(
    !isWithin(repositoryRoot, outputDirectory),
    "activation output directory must remain outside the repository",
  );

  const handoffFile = readPrivateJsonFile(
    command.handoff_path,
    "prepare-only handoff",
    config.max_handoff_bytes,
  );
  const handoff = parseHandoff(handoffFile.value);
  assertCondition(
    handoff.operationId !== command.operation_id,
    "activation operation ID must be distinct from the prepare-only operation ID",
  );
  assertCondition(
    realpathSync(command.request_path) === handoff.requestPath,
    "command request path does not match the prepare-only handoff",
  );

  const paidWorkClient = await dependencies.loadPaidWorkClient();
  const normalizedBase = paidWorkClient.normalizePaidWorkBaseUrlV1(
    command.expected.base_origin,
  );
  assertCondition(
    normalizedBase.origin === command.expected.base_origin,
    "paid-work client normalized base origin mismatch",
  );
  const requestInspection =
    paidWorkClient.readPaidWorkSubmissionRequestV1(command.request_path);
  assertCondition(
    requestInspection.bytes.byteLength <= config.max_request_bytes,
    "prepared request exceeds configured maximum",
  );
  const requestText = new TextDecoder("utf-8", { fatal: true })
    .decode(requestInspection.bytes);
  const request = parseRequest(requestInspection.value);

  assertCondition(
    handoff.baseOrigin === command.expected.base_origin,
    "handoff base origin does not match operator expectation",
  );
  assertCondition(
    config.allowed_base_origins.includes(handoff.baseOrigin),
    "handoff base origin is not allowlisted",
  );
  assertCondition(
    handoff.endpointPath === command.expected.endpoint_path,
    "handoff endpoint does not match operator expectation",
  );
  assertCondition(
    handoff.endpointPath === PAID_WORK_SUBMISSION_PATH,
    "handoff endpoint is not the canonical paid-work submission path",
  );
  assertCondition(
    config.allowed_endpoint_paths.includes(handoff.endpointPath),
    "handoff endpoint is not allowlisted",
  );
  assertCondition(
    handoff.canonicalBody === requestText,
    "prepared request bytes do not match handoff canonical body",
  );
  assertCondition(
    handoff.bodyBytes === requestInspection.bytes.byteLength,
    "prepared request byte count does not match handoff",
  );
  assertCondition(
    handoff.payloadSha256 === requestInspection.sha256,
    "prepared request digest does not match handoff",
  );
  assertCondition(
    sha256Text(handoff.canonicalBody) === handoff.payloadSha256,
    "handoff canonical body digest mismatch",
  );
  assertCondition(
    canonicalJson(requestInspection.value) === handoff.canonicalBody,
    "prepared request is not canonical JSON",
  );
  assertCondition(
    request.submissionId === handoff.submissionId
      && request.submissionId === command.expected.submission_id
      && requestInspection.submissionId === request.submissionId,
    "submission identity binding mismatch",
  );
  assertCondition(
    request.workOrderId === handoff.workOrderId
      && request.workOrderId === command.expected.work_order_id
      && requestInspection.workOrderId === request.workOrderId,
    "work-order identity binding mismatch",
  );
  assertCondition(
    requestInspection.sha256 === command.expected.payload_sha256,
    "payload digest does not match operator expectation",
  );
  assertCondition(
    handoff.contentType === REQUIRED_CONTENT_TYPE,
    "handoff content type is not exact JSON",
  );

  validateFreshness(config, command, handoff, request);

  const replayKey = deriveReplayKey(command, handoff);
  assertCondition(
    !command.replay.known_replay_keys.includes(replayKey),
    "derived replay key is already present in the supplied snapshot",
  );
  if (command.apply) {
    assertCondition(
      command.replay.expected_replay_key === replayKey,
      "apply requires the exact derived replay key",
    );
  } else if (command.replay.expected_replay_key !== null) {
    assertCondition(
      command.replay.expected_replay_key === replayKey,
      "dry-run expected replay key mismatch",
    );
  }

  const plan = buildPlan(
    command,
    handoffFile,
    handoff,
    requestInspection,
    request,
    replayKey,
  );

  if (!command.apply) {
    return {
      marker:
        EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_RESULT_MARKER,
      version: 1,
      gate_id:
        EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_GATE_ID,
      status: "validated_in_memory",
      enabled: true,
      apply: false,
      operation_id: command.operation_id,
      confirmation_verified: false,
      replay_key: replayKey,
      plan,
      artifacts: {
        output_directory: null,
        activation_plan_path: null,
        operator_decision_path: null,
        private_files_written: false,
      },
      authority: authority(false, false),
    };
  }

  assertCondition(
    !existsSync(outputDirectory),
    "activation output directory already exists",
  );

  const planPath = path.join(
    outputDirectory,
    `${command.operation_id}-${PLAN_FILE_SUFFIX}`,
  );
  const decisionPath = path.join(
    outputDirectory,
    `${command.operation_id}-${DECISION_FILE_SUFFIX}`,
  );

  let outputCreated = false;
  try {
    mkdirSync(outputDirectory, {
      recursive: false,
      mode: 0o700,
    });
    chmodSync(outputDirectory, 0o700);
    outputCreated = true;
    assertPrivateDirectory(outputDirectory, "activation output directory");

    const planBody = `${JSON.stringify(plan, null, 2)}\n`;
    writeExclusivePrivateFile(planPath, planBody);
    const planSha = sha256Text(planBody);
    const decision:
      ExternalAgentPaidWorkAuthenticatedSubmissionOperatorDecisionV1 = {
        marker:
          EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_OPERATOR_DECISION_MARKER,
        version: 1,
        gate_id:
          EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_GATE_ID,
        operation_id: command.operation_id,
        decision: "hold_separate_live_execution_required",
        confirmation_verified: true,
        activation_plan_sha256: planSha,
        activation_plan_path: planPath,
        credential_reference_id:
          command.credential_reference.reference_id,
        replay_key: replayKey,
        authority: authority(true, true),
      };
    writeExclusivePrivateFile(
      decisionPath,
      `${JSON.stringify(decision, null, 2)}\n`,
    );

    for (const pathname of [planPath, decisionPath]) {
      const metadata = lstatSync(pathname);
      assertCondition(
        metadata.isFile() && !metadata.isSymbolicLink(),
        "activation artifact must be a regular non-symlink file",
      );
      assertOwnerPrivate(pathname, metadata, "activation artifact");
    }

    return {
      marker:
        EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_RESULT_MARKER,
      version: 1,
      gate_id:
        EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_GATE_ID,
      status: "validated_and_written",
      enabled: true,
      apply: true,
      operation_id: command.operation_id,
      confirmation_verified: true,
      replay_key: replayKey,
      plan,
      artifacts: {
        output_directory: outputDirectory,
        activation_plan_path: planPath,
        operator_decision_path: decisionPath,
        private_files_written: true,
      },
      authority: authority(true, true),
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
