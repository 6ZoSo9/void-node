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

import {
  EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PLAN_MARKER,
  EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_GATE_ID,
  EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_OPERATOR_DECISION_MARKER,
  PAID_WORK_SUBMISSION_PATH,
  REQUIRED_CONTENT_TYPE,
  type ExternalAgentPaidWorkAuthenticatedSubmissionActivationPlanV1,
  type ExternalAgentPaidWorkAuthenticatedSubmissionOperatorDecisionV1,
} from "./external_agent_paid_work_authenticated_submission_activation_prerequisite_v1.js";

export const EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_CONFIG_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_CONFIG_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_COMMAND_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_COMMAND_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_RESULT_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_RESULT_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_PLAN_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_PLAN_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_OPERATOR_DECISION_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_OPERATOR_DECISION_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_EXAMPLE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_EXAMPLE_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_VERSION =
  1 as const;
export const EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_CONFIRMATION =
  "reviewExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateV1" as const;
export const EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_GATE_ID =
  "void.external-agent-paid-work-authenticated-submission-execution-candidate.v1" as const;
export const PAID_WORK_CLIENT_RELATIVE_PATH =
  "tools/void-ai-agent-paid-work-client-v1.mjs" as const;
export const LIVE_CANARY_RELATIVE_PATH =
  "tools/void-agent-mcp-authenticated-submission-live-canary-v1.mjs" as const;
export const LIVE_CANARY_CONFIRMATION =
  "confirmVoidAgentMcpAuthenticatedSubmissionLiveCanaryV1" as const;

const PLAN_FILE_SUFFIX =
  "authenticated-submission-execution-candidate-plan-v1.json";
const DECISION_FILE_SUFFIX =
  "authenticated-submission-execution-candidate-operator-decision-v1.json";
const SHA256 = /^[0-9a-f]{64}$/u;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,179}$/u;
const NONCE = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/u;
const SCOPE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{2,127}$/u;
const WORK_ORDER_ID = /^voidawo1_[0-9a-f]{64}$/u;
const ISO_UTC_SECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;

export interface ExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateConfigV1 {
  marker:
    typeof EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_CONFIG_MARKER;
  version:
    typeof EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_VERSION;
  enabled: boolean;
  allowed_base_origins: string[];
  allowed_endpoint_paths: string[];
  max_activation_plan_bytes: number;
  max_operator_decision_bytes: number;
  max_request_bytes: number;
  max_candidate_ttl_seconds: number;
  min_remaining_activation_ttl_seconds: number;
  max_clock_skew_seconds: number;
  max_known_execution_candidate_ids: number;
  max_known_replay_keys: number;
  max_http_timeout_ms: number;
  max_response_bytes: number;
}

export interface ExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateCommandV1 {
  marker:
    typeof EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_COMMAND_MARKER;
  version:
    typeof EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_VERSION;
  apply: boolean;
  confirmation: string;
  operation_id: string;
  evaluated_at_utc: string;
  candidate_expires_at_utc: string;
  activation_plan_path: string;
  activation_operator_decision_path: string;
  request_path: string;
  output_directory: string;
  expected: {
    activation_operation_id: string;
    base_origin: string;
    endpoint_path: string;
    submission_id: string;
    work_order_id: string;
    payload_sha256: string;
    replay_key: string;
    credential_reference_id: string;
  };
  credential_provider: {
    mode: "credential_registry" | "single_token_fallback";
    reference_id: string;
    source_locator_sha256: string;
    expected_scope: string;
    open_during_candidate: false;
  };
  replay: {
    expected_replay_key: string;
    known_replay_keys: string[];
    reservation_strategy: "exclusive_create";
    reserve_during_candidate: false;
  };
  one_shot: {
    candidate_nonce: string;
    expected_execution_candidate_id: string | null;
    known_execution_candidate_ids: string[];
    lease_strategy: "exclusive_create";
    maximum_attempt_count: 1;
    automatic_retry: false;
  };
  http_policy: {
    method: "POST";
    content_type: typeof REQUIRED_CONTENT_TYPE;
    timeout_ms: number;
    max_response_bytes: number;
    redirect_mode: "manual";
    credentials_mode: "omit";
    cache_mode: "no-store";
    accepted_new_status: 202;
    accepted_duplicate_status: 200;
    conflicting_duplicate_status: 409;
    ambiguous_outcome_policy: "hold_manual_reconciliation_no_retry";
  };
  operator_intent: {
    expect_new: boolean;
    live_submission_authorized: false;
    separate_operator_live_canary_required: true;
  };
}

export interface ExternalAgentPaidWorkAuthenticatedSubmissionExecutionPlanV1 {
  marker:
    typeof EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_PLAN_MARKER;
  version:
    typeof EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_VERSION;
  gate_id:
    typeof EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_GATE_ID;
  operation_id: string;
  generated_at_utc: string;
  expires_at_utc: string;
  status: "execution_candidate_validated_separate_operator_canary_required";
  execution_candidate_id: string;
  source_artifacts: {
    activation_plan_path: string;
    activation_plan_sha256: string;
    activation_operator_decision_path: string;
    activation_operator_decision_sha256: string;
    request_path: string;
    request_sha256: string;
  };
  bindings: {
    activation_operation_id: string;
    base_origin: string;
    endpoint_path: typeof PAID_WORK_SUBMISSION_PATH;
    method: "POST";
    content_type: typeof REQUIRED_CONTENT_TYPE;
    submission_id: string;
    work_order_id: string;
    payload_sha256: string;
    request_bytes: number;
    replay_key: string;
    credential_reference_id: string;
  };
  credential_provider_contract: {
    mode: "credential_registry" | "single_token_fallback";
    reference_id: string;
    source_locator_sha256: string;
    expected_scope: string;
    provider_interface:
      "open_once_only_after_live_confirmation_then_zeroize";
    opened: false;
    credential_or_token_read: false;
    authorization_header_materialized: false;
  };
  replay_reservation_contract: {
    replay_key: string;
    strategy: "exclusive_create";
    required_before_credential_open: true;
    reservation_written: false;
    reservation_consumed: false;
    terminal_outcomes: [
      "accepted",
      "duplicate",
      "rejected",
      "ambiguous_hold",
    ];
  };
  one_shot_lease_contract: {
    candidate_nonce: string;
    strategy: "exclusive_create";
    maximum_attempt_count: 1;
    automatic_retry: false;
    lease_written: false;
    attempt_count: 0;
    separate_confirmation:
      typeof LIVE_CANARY_CONFIRMATION;
  };
  http_contract: {
    origin: string;
    path: typeof PAID_WORK_SUBMISSION_PATH;
    method: "POST";
    content_type: typeof REQUIRED_CONTENT_TYPE;
    payload_sha256_header: string;
    timeout_ms: number;
    max_response_bytes: number;
    redirect_mode: "manual";
    credentials_mode: "omit";
    cache_mode: "no-store";
    cookies_sent: false;
    redirects_followed: false;
    automatic_retry: false;
    maximum_attempt_count: 1;
    request_sent: false;
  };
  response_contract: {
    accepted_new_status: 202;
    accepted_duplicate_status: 200;
    conflicting_duplicate_status: 409;
    require_authorization_verified: true;
    require_accepted_for_review: true;
    require_submission_id_binding: true;
    require_work_order_id_binding: true;
    require_request_sha256_binding: true;
    ambiguous_outcome_policy: "hold_manual_reconciliation_no_retry";
    sanitized_receipt_only: true;
  };
  gates: {
    activation_plan_integrity: true;
    activation_decision_integrity: true;
    activation_decision_is_hold: true;
    request_integrity: true;
    endpoint_allowlisted: true;
    activation_window_valid: true;
    candidate_window_bounded: true;
    credential_reference_exact: true;
    replay_key_exact_and_unique_in_snapshot: true;
    execution_candidate_id_unique_in_snapshot: true;
    one_shot_policy_exact: true;
    http_policy_exact: true;
    operator_expect_new: boolean;
    operator_live_submission_authorized: false;
    separate_operator_live_canary_required: true;
  };
  execution_boundary: {
    credential_provider_invoked: false;
    credential_or_token_read: false;
    authorization_header_materialized: false;
    replay_key_reserved_or_consumed: false;
    one_shot_lease_written: false;
    network_listener_creation: false;
    runtime_mount: false;
    request_sent: false;
    authenticated_submission_post: false;
    live_ticket_issuance: false;
    wc_ledger_write: false;
    wallet_or_signer_access: false;
    service_restart: false;
    deployment: false;
    separate_operator_live_canary_required: true;
  };
}

export interface ExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateOperatorDecisionV1 {
  marker:
    typeof EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_OPERATOR_DECISION_MARKER;
  version:
    typeof EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_VERSION;
  gate_id:
    typeof EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_GATE_ID;
  operation_id: string;
  decision: "hold_separate_operator_live_canary_required";
  confirmation_verified: true;
  execution_plan_sha256: string;
  execution_plan_path: string;
  execution_candidate_id: string;
  replay_key: string;
  credential_reference_id: string;
  authority: ExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateAuthorityV1;
}

export interface ExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateAuthorityV1 {
  local_private_plan_write: boolean;
  local_private_decision_write: boolean;
  credential_provider_invocation: false;
  credential_or_token_read: false;
  authorization_header_materialized: false;
  replay_key_reservation_or_consumption: false;
  one_shot_lease_write: false;
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

export interface ExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateResultV1 {
  marker:
    typeof EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_RESULT_MARKER;
  version:
    typeof EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_VERSION;
  gate_id:
    typeof EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_GATE_ID;
  status: "disabled" | "validated_in_memory" | "validated_and_written";
  enabled: boolean;
  apply: boolean;
  operation_id: string | null;
  confirmation_verified: boolean;
  execution_candidate_id: string | null;
  plan: ExternalAgentPaidWorkAuthenticatedSubmissionExecutionPlanV1 | null;
  artifacts: {
    output_directory: string | null;
    execution_plan_path: string | null;
    operator_decision_path: string | null;
    private_files_written: boolean;
  };
  authority: ExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateAuthorityV1;
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

export interface ExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateDependenciesV1 {
  repositoryRoot: () => string;
  loadPaidWorkClient: () => Promise<PaidWorkClientModuleV1>;
}

type PrivateJsonFile = Readonly<{
  path: string;
  bytes: Buffer;
  sha256: string;
  value: unknown;
}>;

type ParsedActivation = Readonly<{
  plan: ExternalAgentPaidWorkAuthenticatedSubmissionActivationPlanV1;
  decision: ExternalAgentPaidWorkAuthenticatedSubmissionOperatorDecisionV1;
}>;

function fail(message: string): never {
  throw new Error(
    `external-agent authenticated-submission execution candidate v1: ${message}`,
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
  assertCondition(value === value.trim(), `${label} must be trimmed`);
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

function requireId(value: unknown, label: string): string {
  const output = requireString(value, label, 3, 180);
  assertCondition(ID.test(output), `${label} has unsupported format`);
  return output;
}

function requireSha256(value: unknown, label: string): string {
  const output = requireString(value, label, 64, 64);
  assertCondition(SHA256.test(output), `${label} must be lowercase SHA-256`);
  return output;
}

function requireNonce(value: unknown, label: string): string {
  const output = requireString(value, label, 8, 128);
  assertCondition(NONCE.test(output), `${label} has unsupported format`);
  return output;
}

function requireIsoUtc(value: unknown, label: string): string {
  const output = requireString(value, label, 20, 20);
  assertCondition(
    ISO_UTC_SECONDS.test(output) && Number.isFinite(Date.parse(output)),
    `${label} must be UTC ISO-8601 seconds`,
  );
  return output;
}

function requireStringArray(
  value: unknown,
  label: string,
  maximumItems: number,
  validator: (entry: unknown, itemLabel: string) => string,
): string[] {
  assertCondition(Array.isArray(value), `${label} must be an array`);
  assertCondition(
    value.length <= maximumItems,
    `${label} exceeds ${maximumItems} entries`,
  );
  const output = value.map((entry, index) =>
    validator(entry, `${label}[${index}]`)
  );
  assertCondition(
    new Set(output).size === output.length,
    `${label} must be unique`,
  );
  return output;
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
      "non-JSON value encountered",
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

function isWithin(root: string, target: string): boolean {
  const relative = path.relative(root, path.resolve(target));
  return relative === ""
    || (!relative.startsWith(`..${path.sep}`) && relative !== "..");
}

function assertOwnerPrivate(
  pathname: string,
  metadata: Stats,
  label: string,
): void {
  if (process.platform === "win32") return;
  assertCondition(
    (metadata.mode & 0o077) === 0,
    `${label} must not grant group or other permissions: ${pathname}`,
  );
}

function assertPrivateDirectory(pathname: string, label: string): void {
  const metadata = lstatSync(pathname);
  assertCondition(
    metadata.isDirectory() && !metadata.isSymbolicLink(),
    `${label} must be a non-symlink directory`,
  );
  assertOwnerPrivate(pathname, metadata, label);
}

function readPrivateJsonFile(
  rawPath: string,
  label: string,
  maximumBytes: number,
): PrivateJsonFile {
  const resolved = realpathSync(path.resolve(rawPath));
  const metadata = lstatSync(resolved);
  assertCondition(
    metadata.isFile() && !metadata.isSymbolicLink(),
    `${label} must be a regular non-symlink file`,
  );
  assertCondition(
    metadata.size >= 2 && metadata.size <= maximumBytes,
    `${label} size is invalid`,
  );
  assertOwnerPrivate(resolved, metadata, label);
  const bytes = readFileSync(resolved);
  let value: unknown;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail(`${label} must contain valid JSON`);
  }
  return {
    path: resolved,
    bytes,
    sha256: sha256Bytes(bytes),
    value,
  };
}

function writeExclusivePrivateFile(pathname: string, body: string): void {
  const descriptor = openSync(
    pathname,
    fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY,
    0o600,
  );
  try {
    writeFileSync(descriptor, body, { encoding: "utf8" });
  } finally {
    closeSync(descriptor);
  }
  chmodSync(pathname, 0o600);
}

function normalizeBaseOrigin(raw: unknown, label: string): string {
  const input = requireString(raw, label, 8, 2048);
  const parsed = new URL(input);
  assertCondition(
    parsed.protocol === "https:"
      || (
        parsed.protocol === "http:"
        && ["localhost", "127.0.0.1", "::1", "[::1]"]
          .includes(parsed.hostname.toLowerCase())
      ),
    `${label} must use HTTPS or loopback HTTP`,
  );
  assertCondition(
    !parsed.username
      && !parsed.password
      && !parsed.search
      && !parsed.hash
      && (parsed.pathname === "/" || parsed.pathname === ""),
    `${label} must contain only an origin`,
  );
  return parsed.origin;
}

function normalizeEndpointPath(raw: unknown, label: string): string {
  const value = requireString(raw, label, 1, 256);
  assertCondition(
    value.startsWith("/")
      && !value.startsWith("//")
      && !value.includes("?")
      && !value.includes("#"),
    `${label} must be an absolute same-origin path`,
  );
  return value;
}

function validateAuthority(
  value: unknown,
  label: string,
  localWritesExpected: boolean,
): void {
  const record = requireRecord(value, label);
  requireExactKeys(
    record,
    [
      "local_private_plan_write",
      "local_private_decision_write",
      "credential_or_token_read",
      "authorization_header_materialized",
      "network_listener_creation",
      "runtime_mount",
      "external_http_submission",
      "authenticated_submission_post",
      "provider_selection",
      "quote_creation",
      "payment_authorization",
      "payment_execution",
      "work_execution_authorization",
      "work_dispatch",
      "live_ticket_issuance",
      "work_credit_write",
      "wallet_or_signer_access",
      "signing",
      "transaction_broadcast",
      "service_restart",
      "deployment",
      "money_movement",
    ],
    label,
  );
  assertCondition(
    record.local_private_plan_write === localWritesExpected
      && record.local_private_decision_write === localWritesExpected,
    `${label} local-write authority mismatch`,
  );
  for (const key of Object.keys(record)) {
    if (
      key !== "local_private_plan_write"
      && key !== "local_private_decision_write"
    ) {
      assertCondition(record[key] === false, `${label}.${key} must be false`);
    }
  }
}

function parseActivationPlan(
  value: unknown,
): ExternalAgentPaidWorkAuthenticatedSubmissionActivationPlanV1 {
  const plan = requireRecord(value, "activation plan");
  requireExactKeys(
    plan,
    [
      "marker",
      "version",
      "gate_id",
      "operation_id",
      "generated_at_utc",
      "expires_at_utc",
      "status",
      "bindings",
      "credential_reference",
      "freshness",
      "replay",
      "gates",
      "execution_boundary",
    ],
    "activation plan",
  );
  assertCondition(
    plan.marker
      === EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PLAN_MARKER,
    "activation plan marker mismatch",
  );
  assertCondition(plan.version === 1, "activation plan version mismatch");
  assertCondition(
    plan.gate_id
      === EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_GATE_ID,
    "activation plan gate ID mismatch",
  );
  assertCondition(
    plan.status
      === "prerequisites_satisfied_separate_live_execution_required",
    "activation plan status is not execution-held",
  );
  requireId(plan.operation_id, "activation operation ID");
  requireIsoUtc(plan.generated_at_utc, "activation generated time");
  requireIsoUtc(plan.expires_at_utc, "activation expiry");

  const bindings = requireRecord(plan.bindings, "activation plan bindings");
  requireExactKeys(
    bindings,
    [
      "base_origin",
      "endpoint_path",
      "method",
      "content_type",
      "submission_id",
      "work_order_id",
      "payload_sha256",
      "request_bytes",
      "handoff_sha256",
      "replay_key",
    ],
    "activation plan bindings",
  );
  assertCondition(bindings.method === "POST", "activation method must be POST");
  assertCondition(
    bindings.endpoint_path === PAID_WORK_SUBMISSION_PATH,
    "activation endpoint path mismatch",
  );
  assertCondition(
    bindings.content_type === REQUIRED_CONTENT_TYPE,
    "activation content type mismatch",
  );
  requireId(bindings.submission_id, "activation submission ID");
  const workOrderId = requireString(
    bindings.work_order_id,
    "activation work-order ID",
    73,
    73,
  );
  assertCondition(
    WORK_ORDER_ID.test(workOrderId),
    "activation work-order ID format mismatch",
  );
  requireSha256(bindings.payload_sha256, "activation payload SHA-256");
  requireSha256(bindings.handoff_sha256, "activation handoff SHA-256");
  requireSha256(bindings.replay_key, "activation replay key");
  requireInteger(
    bindings.request_bytes,
    "activation request bytes",
    2,
    1_048_576,
  );
  normalizeBaseOrigin(bindings.base_origin, "activation base origin");

  const credential = requireRecord(
    plan.credential_reference,
    "activation credential reference",
  );
  requireExactKeys(
    credential,
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
    "activation credential reference",
  );
  assertCondition(
    credential.mode === "credential_registry"
      || credential.mode === "single_token_fallback",
    "activation credential-reference mode mismatch",
  );
  requireId(credential.reference_id, "activation credential reference ID");
  requireSha256(
    credential.source_locator_sha256,
    "activation credential source locator SHA-256",
  );
  const expectedScope = requireString(
    credential.expected_scope,
    "activation credential expected scope",
    3,
    128,
  );
  assertCondition(
    SCOPE.test(expectedScope),
    "activation credential expected scope format mismatch",
  );
  if (credential.mode === "credential_registry") {
    requireId(credential.registry_id, "activation credential registry ID");
    requireId(credential.credential_id, "activation credential ID");
    requireId(credential.agent_id, "activation credential agent ID");
    const notBefore = requireIsoUtc(
      credential.not_before_utc,
      "activation credential not-before",
    );
    const expires = requireIsoUtc(
      credential.expires_at_utc,
      "activation credential expiry",
    );
    assertCondition(
      Date.parse(expires) > Date.parse(notBefore),
      "activation credential validity window is inverted",
    );
  } else {
    assertCondition(
      credential.registry_id === null
        && credential.credential_id === null
        && credential.agent_id === null
        && credential.not_before_utc === null
        && credential.expires_at_utc === null,
      "single-token fallback metadata must keep registry fields null",
    );
  }

  const freshness = requireRecord(
    plan.freshness,
    "activation freshness",
  );
  requireExactKeys(
    freshness,
    [
      "handoff_prepared_at_utc",
      "work_order_created_at_utc",
      "work_order_expires_at_utc",
      "evaluated_at_utc",
      "activation_expires_at_utc",
    ],
    "activation freshness",
  );
  for (const key of [
    "handoff_prepared_at_utc",
    "work_order_created_at_utc",
    "work_order_expires_at_utc",
    "evaluated_at_utc",
    "activation_expires_at_utc",
  ]) {
    requireIsoUtc(freshness[key], `activation freshness.${key}`);
  }
  assertCondition(
    freshness.activation_expires_at_utc === plan.expires_at_utc,
    "activation freshness expiry does not match plan expiry",
  );

  const replay = requireRecord(plan.replay, "activation replay");
  requireExactKeys(
    replay,
    [
      "nonce",
      "replay_key",
      "known_replay_key_count",
      "collision_detected",
      "reservation_written",
    ],
    "activation replay",
  );
  requireNonce(replay.nonce, "activation replay nonce");
  requireSha256(replay.replay_key, "activation replay key");
  requireInteger(
    replay.known_replay_key_count,
    "activation known replay-key count",
    0,
    100_000,
  );
  assertCondition(
    replay.collision_detected === false
      && replay.reservation_written === false,
    "activation replay state is not unreserved and collision-free",
  );

  const gates = requireRecord(plan.gates, "activation gates");
  requireExactKeys(
    gates,
    [
      "handoff_integrity",
      "request_integrity",
      "endpoint_allowlisted",
      "content_type_exact",
      "payload_digest_exact",
      "submission_identity_exact",
      "work_order_identity_exact",
      "handoff_fresh",
      "work_order_fresh",
      "activation_window_bounded",
      "credential_reference_metadata_valid",
      "credential_valid_for_activation_window",
      "replay_key_unique_in_supplied_snapshot",
      "operator_expect_new",
      "operator_live_submission_authorized",
    ],
    "activation gates",
  );
  for (const [key, gateValue] of Object.entries(gates)) {
    if (key === "operator_expect_new") {
      assertCondition(
        typeof gateValue === "boolean",
        "activation operator_expect_new must be boolean",
      );
    } else if (key === "operator_live_submission_authorized") {
      assertCondition(
        gateValue === false,
        "activation plan must not authorize live submission",
      );
    } else {
      assertCondition(gateValue === true, `activation gate ${key} is not true`);
    }
  }

  const boundary = requireRecord(
    plan.execution_boundary,
    "activation execution boundary",
  );
  requireExactKeys(
    boundary,
    [
      "credential_or_token_read",
      "authorization_header_materialized",
      "network_listener_creation",
      "runtime_mount",
      "request_sent",
      "authenticated_submission_post",
      "live_ticket_issuance",
      "wc_ledger_write",
      "wallet_or_signer_access",
      "separate_live_execution_lane_required",
    ],
    "activation execution boundary",
  );
  for (const [key, boundaryValue] of Object.entries(boundary)) {
    if (key === "separate_live_execution_lane_required") {
      assertCondition(
        boundaryValue === true,
        "activation plan must require a separate live lane",
      );
    } else {
      assertCondition(
        boundaryValue === false,
        `activation boundary ${key} must be false`,
      );
    }
  }

  return value as ExternalAgentPaidWorkAuthenticatedSubmissionActivationPlanV1;
}

function parseActivationDecision(
  value: unknown,
): ExternalAgentPaidWorkAuthenticatedSubmissionOperatorDecisionV1 {
  const decision = requireRecord(value, "activation operator decision");
  requireExactKeys(
    decision,
    [
      "marker",
      "version",
      "gate_id",
      "operation_id",
      "decision",
      "confirmation_verified",
      "activation_plan_sha256",
      "activation_plan_path",
      "credential_reference_id",
      "replay_key",
      "authority",
    ],
    "activation operator decision",
  );
  assertCondition(
    decision.marker
      === EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_OPERATOR_DECISION_MARKER,
    "activation decision marker mismatch",
  );
  assertCondition(decision.version === 1, "activation decision version mismatch");
  assertCondition(
    decision.gate_id
      === EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_ACTIVATION_PREREQUISITE_GATE_ID,
    "activation decision gate ID mismatch",
  );
  assertCondition(
    decision.decision === "hold_separate_live_execution_required",
    "activation decision does not retain the live-execution hold",
  );
  assertCondition(
    decision.confirmation_verified === true,
    "activation decision confirmation is not verified",
  );
  requireSha256(
    decision.activation_plan_sha256,
    "activation decision plan SHA-256",
  );
  requireString(
    decision.activation_plan_path,
    "activation decision plan path",
    1,
    4096,
  );
  requireId(decision.operation_id, "activation decision operation ID");
  requireId(
    decision.credential_reference_id,
    "activation decision credential reference ID",
  );
  requireSha256(decision.replay_key, "activation decision replay key");
  validateAuthority(decision.authority, "activation decision authority", true);
  return value as ExternalAgentPaidWorkAuthenticatedSubmissionOperatorDecisionV1;
}

function parseActivation(
  planFile: PrivateJsonFile,
  decisionFile: PrivateJsonFile,
): ParsedActivation {
  const plan = parseActivationPlan(planFile.value);
  const decision = parseActivationDecision(decisionFile.value);
  assertCondition(
    decision.activation_plan_sha256 === planFile.sha256,
    "activation decision does not bind exact activation-plan bytes",
  );
  assertCondition(
    realpathSync(decision.activation_plan_path) === planFile.path,
    "activation decision plan path mismatch",
  );
  assertCondition(
    decision.operation_id === plan.operation_id,
    "activation operation identity mismatch",
  );
  assertCondition(
    decision.credential_reference_id
      === plan.credential_reference.reference_id,
    "activation credential-reference identity mismatch",
  );
  assertCondition(
    decision.replay_key === plan.replay.replay_key
      && decision.replay_key === plan.bindings.replay_key,
    "activation replay-key identity mismatch",
  );
  return { plan, decision };
}

export function validateExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateConfigV1(
  value: unknown,
): ExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateConfigV1 {
  const record = requireRecord(value, "config");
  requireExactKeys(
    record,
    [
      "marker",
      "version",
      "enabled",
      "allowed_base_origins",
      "allowed_endpoint_paths",
      "max_activation_plan_bytes",
      "max_operator_decision_bytes",
      "max_request_bytes",
      "max_candidate_ttl_seconds",
      "min_remaining_activation_ttl_seconds",
      "max_clock_skew_seconds",
      "max_known_execution_candidate_ids",
      "max_known_replay_keys",
      "max_http_timeout_ms",
      "max_response_bytes",
    ],
    "config",
  );
  assertCondition(
    record.marker
      === EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_CONFIG_MARKER,
    "config marker mismatch",
  );
  assertCondition(record.version === 1, "config version must be 1");
  const allowedBaseOrigins = requireStringArray(
    record.allowed_base_origins,
    "config.allowed_base_origins",
    32,
    normalizeBaseOrigin,
  );
  const allowedEndpointPaths = requireStringArray(
    record.allowed_endpoint_paths,
    "config.allowed_endpoint_paths",
    16,
    normalizeEndpointPath,
  );
  return {
    marker:
      EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_CONFIG_MARKER,
    version: 1,
    enabled: requireBoolean(record.enabled, "config.enabled"),
    allowed_base_origins: allowedBaseOrigins,
    allowed_endpoint_paths: allowedEndpointPaths,
    max_activation_plan_bytes: requireInteger(
      record.max_activation_plan_bytes,
      "config.max_activation_plan_bytes",
      1024,
      4_194_304,
    ),
    max_operator_decision_bytes: requireInteger(
      record.max_operator_decision_bytes,
      "config.max_operator_decision_bytes",
      512,
      1_048_576,
    ),
    max_request_bytes: requireInteger(
      record.max_request_bytes,
      "config.max_request_bytes",
      256,
      1_048_576,
    ),
    max_candidate_ttl_seconds: requireInteger(
      record.max_candidate_ttl_seconds,
      "config.max_candidate_ttl_seconds",
      1,
      3600,
    ),
    min_remaining_activation_ttl_seconds: requireInteger(
      record.min_remaining_activation_ttl_seconds,
      "config.min_remaining_activation_ttl_seconds",
      1,
      3600,
    ),
    max_clock_skew_seconds: requireInteger(
      record.max_clock_skew_seconds,
      "config.max_clock_skew_seconds",
      0,
      3600,
    ),
    max_known_execution_candidate_ids: requireInteger(
      record.max_known_execution_candidate_ids,
      "config.max_known_execution_candidate_ids",
      0,
      100_000,
    ),
    max_known_replay_keys: requireInteger(
      record.max_known_replay_keys,
      "config.max_known_replay_keys",
      0,
      100_000,
    ),
    max_http_timeout_ms: requireInteger(
      record.max_http_timeout_ms,
      "config.max_http_timeout_ms",
      1,
      120_000,
    ),
    max_response_bytes: requireInteger(
      record.max_response_bytes,
      "config.max_response_bytes",
      256,
      16_777_216,
    ),
  };
}

export function validateExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateCommandV1(
  value: unknown,
  config: ExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateConfigV1,
): ExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateCommandV1 {
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
      "candidate_expires_at_utc",
      "activation_plan_path",
      "activation_operator_decision_path",
      "request_path",
      "output_directory",
      "expected",
      "credential_provider",
      "replay",
      "one_shot",
      "http_policy",
      "operator_intent",
    ],
    "command",
  );
  assertCondition(
    record.marker
      === EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_COMMAND_MARKER,
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
        === EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_CONFIRMATION,
      "apply requires the exact execution-candidate confirmation",
    );
  } else {
    assertCondition(
      confirmation === "",
      "dry run requires an empty confirmation",
    );
  }

  const expected = requireRecord(record.expected, "command.expected");
  requireExactKeys(
    expected,
    [
      "activation_operation_id",
      "base_origin",
      "endpoint_path",
      "submission_id",
      "work_order_id",
      "payload_sha256",
      "replay_key",
      "credential_reference_id",
    ],
    "command.expected",
  );
  const expectedWorkOrderId = requireString(
    expected.work_order_id,
    "command.expected.work_order_id",
    73,
    73,
  );
  assertCondition(
    WORK_ORDER_ID.test(expectedWorkOrderId),
    "command expected work-order ID format mismatch",
  );

  const credentialProvider = requireRecord(
    record.credential_provider,
    "command.credential_provider",
  );
  requireExactKeys(
    credentialProvider,
    [
      "mode",
      "reference_id",
      "source_locator_sha256",
      "expected_scope",
      "open_during_candidate",
    ],
    "command.credential_provider",
  );
  assertCondition(
    credentialProvider.mode === "credential_registry"
      || credentialProvider.mode === "single_token_fallback",
    "credential-provider mode is invalid",
  );
  assertCondition(
    credentialProvider.open_during_candidate === false,
    "credential provider must remain closed during candidate validation",
  );

  const replay = requireRecord(record.replay, "command.replay");
  requireExactKeys(
    replay,
    [
      "expected_replay_key",
      "known_replay_keys",
      "reservation_strategy",
      "reserve_during_candidate",
    ],
    "command.replay",
  );
  assertCondition(
    replay.reservation_strategy === "exclusive_create",
    "replay reservation strategy must be exclusive_create",
  );
  assertCondition(
    replay.reserve_during_candidate === false,
    "candidate validation must not reserve a replay key",
  );
  const knownReplayKeys = requireStringArray(
    replay.known_replay_keys,
    "command.replay.known_replay_keys",
    config.max_known_replay_keys,
    requireSha256,
  );

  const oneShot = requireRecord(record.one_shot, "command.one_shot");
  requireExactKeys(
    oneShot,
    [
      "candidate_nonce",
      "expected_execution_candidate_id",
      "known_execution_candidate_ids",
      "lease_strategy",
      "maximum_attempt_count",
      "automatic_retry",
    ],
    "command.one_shot",
  );
  assertCondition(
    oneShot.lease_strategy === "exclusive_create",
    "one-shot lease strategy must be exclusive_create",
  );
  assertCondition(
    oneShot.maximum_attempt_count === 1,
    "maximum attempt count must be exactly one",
  );
  assertCondition(
    oneShot.automatic_retry === false,
    "automatic retry must be false",
  );
  const knownCandidateIds = requireStringArray(
    oneShot.known_execution_candidate_ids,
    "command.one_shot.known_execution_candidate_ids",
    config.max_known_execution_candidate_ids,
    requireSha256,
  );

  const httpPolicy = requireRecord(record.http_policy, "command.http_policy");
  requireExactKeys(
    httpPolicy,
    [
      "method",
      "content_type",
      "timeout_ms",
      "max_response_bytes",
      "redirect_mode",
      "credentials_mode",
      "cache_mode",
      "accepted_new_status",
      "accepted_duplicate_status",
      "conflicting_duplicate_status",
      "ambiguous_outcome_policy",
    ],
    "command.http_policy",
  );
  assertCondition(httpPolicy.method === "POST", "HTTP method must be POST");
  assertCondition(
    httpPolicy.content_type === REQUIRED_CONTENT_TYPE,
    "HTTP content type must be application/json",
  );
  assertCondition(
    httpPolicy.redirect_mode === "manual",
    "redirect mode must be manual",
  );
  assertCondition(
    httpPolicy.credentials_mode === "omit",
    "credentials mode must be omit before explicit Authorization",
  );
  assertCondition(
    httpPolicy.cache_mode === "no-store",
    "cache mode must be no-store",
  );
  assertCondition(
    httpPolicy.accepted_new_status === 202
      && httpPolicy.accepted_duplicate_status === 200
      && httpPolicy.conflicting_duplicate_status === 409,
    "HTTP status contract mismatch",
  );
  assertCondition(
    httpPolicy.ambiguous_outcome_policy
      === "hold_manual_reconciliation_no_retry",
    "ambiguous-outcome policy mismatch",
  );

  const operatorIntent = requireRecord(
    record.operator_intent,
    "command.operator_intent",
  );
  requireExactKeys(
    operatorIntent,
    [
      "expect_new",
      "live_submission_authorized",
      "separate_operator_live_canary_required",
    ],
    "command.operator_intent",
  );
  assertCondition(
    typeof operatorIntent.expect_new === "boolean",
    "operator expect_new must be boolean",
  );
  assertCondition(
    operatorIntent.live_submission_authorized === false,
    "candidate command must not authorize live submission",
  );
  assertCondition(
    operatorIntent.separate_operator_live_canary_required === true,
    "candidate command must require a separate operator live canary",
  );

  return {
    marker:
      EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_COMMAND_MARKER,
    version: 1,
    apply,
    confirmation,
    operation_id: requireId(record.operation_id, "command.operation_id"),
    evaluated_at_utc: requireIsoUtc(
      record.evaluated_at_utc,
      "command.evaluated_at_utc",
    ),
    candidate_expires_at_utc: requireIsoUtc(
      record.candidate_expires_at_utc,
      "command.candidate_expires_at_utc",
    ),
    activation_plan_path: path.resolve(
      requireString(
        record.activation_plan_path,
        "command.activation_plan_path",
      ),
    ),
    activation_operator_decision_path: path.resolve(
      requireString(
        record.activation_operator_decision_path,
        "command.activation_operator_decision_path",
      ),
    ),
    request_path: path.resolve(
      requireString(record.request_path, "command.request_path"),
    ),
    output_directory: path.resolve(
      requireString(record.output_directory, "command.output_directory"),
    ),
    expected: {
      activation_operation_id: requireId(
        expected.activation_operation_id,
        "command.expected.activation_operation_id",
      ),
      base_origin: normalizeBaseOrigin(
        expected.base_origin,
        "command.expected.base_origin",
      ),
      endpoint_path: normalizeEndpointPath(
        expected.endpoint_path,
        "command.expected.endpoint_path",
      ),
      submission_id: requireId(
        expected.submission_id,
        "command.expected.submission_id",
      ),
      work_order_id: expectedWorkOrderId,
      payload_sha256: requireSha256(
        expected.payload_sha256,
        "command.expected.payload_sha256",
      ),
      replay_key: requireSha256(
        expected.replay_key,
        "command.expected.replay_key",
      ),
      credential_reference_id: requireId(
        expected.credential_reference_id,
        "command.expected.credential_reference_id",
      ),
    },
    credential_provider: {
      mode: credentialProvider.mode,
      reference_id: requireId(
        credentialProvider.reference_id,
        "command.credential_provider.reference_id",
      ),
      source_locator_sha256: requireSha256(
        credentialProvider.source_locator_sha256,
        "command.credential_provider.source_locator_sha256",
      ),
      expected_scope: requireString(
        credentialProvider.expected_scope,
        "command.credential_provider.expected_scope",
        3,
        128,
      ),
      open_during_candidate: false,
    },
    replay: {
      expected_replay_key: requireSha256(
        replay.expected_replay_key,
        "command.replay.expected_replay_key",
      ),
      known_replay_keys: knownReplayKeys,
      reservation_strategy: "exclusive_create",
      reserve_during_candidate: false,
    },
    one_shot: {
      candidate_nonce: requireNonce(
        oneShot.candidate_nonce,
        "command.one_shot.candidate_nonce",
      ),
      expected_execution_candidate_id:
        oneShot.expected_execution_candidate_id === null
          ? null
          : requireSha256(
              oneShot.expected_execution_candidate_id,
              "command.one_shot.expected_execution_candidate_id",
            ),
      known_execution_candidate_ids: knownCandidateIds,
      lease_strategy: "exclusive_create",
      maximum_attempt_count: 1,
      automatic_retry: false,
    },
    http_policy: {
      method: "POST",
      content_type: REQUIRED_CONTENT_TYPE,
      timeout_ms: requireInteger(
        httpPolicy.timeout_ms,
        "command.http_policy.timeout_ms",
        1,
        config.max_http_timeout_ms,
      ),
      max_response_bytes: requireInteger(
        httpPolicy.max_response_bytes,
        "command.http_policy.max_response_bytes",
        256,
        config.max_response_bytes,
      ),
      redirect_mode: "manual",
      credentials_mode: "omit",
      cache_mode: "no-store",
      accepted_new_status: 202,
      accepted_duplicate_status: 200,
      conflicting_duplicate_status: 409,
      ambiguous_outcome_policy: "hold_manual_reconciliation_no_retry",
    },
    operator_intent: {
      expect_new: operatorIntent.expect_new,
      live_submission_authorized: false,
      separate_operator_live_canary_required: true,
    },
  };
}

function authority(
  localPrivatePlanWrite: boolean,
  localPrivateDecisionWrite: boolean,
): ExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateAuthorityV1 {
  return Object.freeze({
    local_private_plan_write: localPrivatePlanWrite,
    local_private_decision_write: localPrivateDecisionWrite,
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
  });
}

function disabledResult(): ExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateResultV1 {
  return {
    marker:
      EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_RESULT_MARKER,
    version: 1,
    gate_id:
      EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_GATE_ID,
    status: "disabled",
    enabled: false,
    apply: false,
    operation_id: null,
    confirmation_verified: false,
    execution_candidate_id: null,
    plan: null,
    artifacts: {
      output_directory: null,
      execution_plan_path: null,
      operator_decision_path: null,
      private_files_written: false,
    },
    authority: authority(false, false),
  };
}

async function defaultLoadPaidWorkClient(): Promise<PaidWorkClientModuleV1> {
  const moduleUrl = pathToFileURL(
    path.join(defaultRepositoryRoot(), PAID_WORK_CLIENT_RELATIVE_PATH),
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
    path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."),
  );
}

export const EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_DEFAULT_DEPENDENCIES_V1:
  ExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateDependenciesV1 =
    Object.freeze({
      repositoryRoot: defaultRepositoryRoot,
      loadPaidWorkClient: defaultLoadPaidWorkClient,
    });

function deriveExecutionCandidateId(
  command: ExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateCommandV1,
  activationPlanFile: PrivateJsonFile,
  activationDecisionFile: PrivateJsonFile,
  requestSha256: string,
): string {
  return sha256Text(
    canonicalJson({
      marker:
        "VOID_EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_ID_INPUT_V1",
      version: 1,
      activation_plan_sha256: activationPlanFile.sha256,
      activation_operator_decision_sha256: activationDecisionFile.sha256,
      request_sha256: requestSha256,
      replay_key: command.replay.expected_replay_key,
      credential_reference_id: command.credential_provider.reference_id,
      credential_source_locator_sha256:
        command.credential_provider.source_locator_sha256,
      candidate_nonce: command.one_shot.candidate_nonce,
      timeout_ms: command.http_policy.timeout_ms,
      max_response_bytes: command.http_policy.max_response_bytes,
      expect_new: command.operator_intent.expect_new,
    }),
  );
}

function validateFreshness(
  config: ExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateConfigV1,
  command: ExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateCommandV1,
  activationPlan: ExternalAgentPaidWorkAuthenticatedSubmissionActivationPlanV1,
): void {
  const evaluated = Date.parse(command.evaluated_at_utc);
  const candidateExpires = Date.parse(command.candidate_expires_at_utc);
  const activationGenerated = Date.parse(activationPlan.generated_at_utc);
  const activationExpires = Date.parse(activationPlan.expires_at_utc);
  const skew = config.max_clock_skew_seconds * 1000;

  assertCondition(
    activationGenerated <= evaluated + skew,
    "activation plan was generated too far in the future",
  );
  assertCondition(
    activationExpires - evaluated
      >= config.min_remaining_activation_ttl_seconds * 1000,
    "activation plan lacks required remaining TTL",
  );
  assertCondition(
    candidateExpires > evaluated,
    "candidate expiry must be later than evaluation",
  );
  assertCondition(
    candidateExpires - evaluated
      <= config.max_candidate_ttl_seconds * 1000,
    "candidate TTL exceeds configured maximum",
  );
  assertCondition(
    candidateExpires <= activationExpires,
    "candidate expiry exceeds activation-plan expiry",
  );

  const credential = activationPlan.credential_reference;
  if (
    credential.mode === "credential_registry"
    && credential.not_before_utc !== null
    && credential.expires_at_utc !== null
  ) {
    assertCondition(
      Date.parse(credential.not_before_utc) <= evaluated + skew,
      "credential metadata is not yet valid",
    );
    assertCondition(
      Date.parse(credential.expires_at_utc) >= candidateExpires,
      "credential metadata expires before candidate expiry",
    );
  }
}

function buildPlan(
  command: ExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateCommandV1,
  activationPlanFile: PrivateJsonFile,
  activationDecisionFile: PrivateJsonFile,
  activation: ParsedActivation,
  requestInspection: PaidWorkRequestInspectionV1,
  executionCandidateId: string,
): ExternalAgentPaidWorkAuthenticatedSubmissionExecutionPlanV1 {
  return {
    marker:
      EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_PLAN_MARKER,
    version: 1,
    gate_id:
      EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_GATE_ID,
    operation_id: command.operation_id,
    generated_at_utc: command.evaluated_at_utc,
    expires_at_utc: command.candidate_expires_at_utc,
    status: "execution_candidate_validated_separate_operator_canary_required",
    execution_candidate_id: executionCandidateId,
    source_artifacts: {
      activation_plan_path: activationPlanFile.path,
      activation_plan_sha256: activationPlanFile.sha256,
      activation_operator_decision_path: activationDecisionFile.path,
      activation_operator_decision_sha256: activationDecisionFile.sha256,
      request_path: realpathSync(command.request_path),
      request_sha256: requestInspection.sha256,
    },
    bindings: {
      activation_operation_id: activation.plan.operation_id,
      base_origin: activation.plan.bindings.base_origin,
      endpoint_path: PAID_WORK_SUBMISSION_PATH,
      method: "POST",
      content_type: REQUIRED_CONTENT_TYPE,
      submission_id: activation.plan.bindings.submission_id,
      work_order_id: activation.plan.bindings.work_order_id,
      payload_sha256: activation.plan.bindings.payload_sha256,
      request_bytes: requestInspection.bytes.byteLength,
      replay_key: activation.plan.bindings.replay_key,
      credential_reference_id:
        activation.plan.credential_reference.reference_id,
    },
    credential_provider_contract: {
      mode: command.credential_provider.mode,
      reference_id: command.credential_provider.reference_id,
      source_locator_sha256:
        command.credential_provider.source_locator_sha256,
      expected_scope: command.credential_provider.expected_scope,
      provider_interface:
        "open_once_only_after_live_confirmation_then_zeroize",
      opened: false,
      credential_or_token_read: false,
      authorization_header_materialized: false,
    },
    replay_reservation_contract: {
      replay_key: command.replay.expected_replay_key,
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
      candidate_nonce: command.one_shot.candidate_nonce,
      strategy: "exclusive_create",
      maximum_attempt_count: 1,
      automatic_retry: false,
      lease_written: false,
      attempt_count: 0,
      separate_confirmation: LIVE_CANARY_CONFIRMATION,
    },
    http_contract: {
      origin: activation.plan.bindings.base_origin,
      path: PAID_WORK_SUBMISSION_PATH,
      method: "POST",
      content_type: REQUIRED_CONTENT_TYPE,
      payload_sha256_header: activation.plan.bindings.payload_sha256,
      timeout_ms: command.http_policy.timeout_ms,
      max_response_bytes: command.http_policy.max_response_bytes,
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
      operator_expect_new: command.operator_intent.expect_new,
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
}

export async function executeExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateV1(
  configValue: unknown,
  commandValue: unknown,
  dependencies:
    ExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateDependenciesV1 =
      EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_DEFAULT_DEPENDENCIES_V1,
): Promise<ExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateResultV1> {
  const config =
    validateExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateConfigV1(
      configValue,
    );
  if (!config.enabled) return disabledResult();

  const command =
    validateExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateCommandV1(
      commandValue,
      config,
    );
  assertCondition(
    dependencies
      && typeof dependencies.repositoryRoot === "function"
      && typeof dependencies.loadPaidWorkClient === "function",
    "execution-candidate dependencies are incomplete",
  );

  const repositoryRoot = realpathSync(dependencies.repositoryRoot());
  const outputDirectory = path.resolve(command.output_directory);
  for (const [label, pathname] of [
    ["activation plan", command.activation_plan_path],
    ["activation operator decision", command.activation_operator_decision_path],
    ["prepared request", command.request_path],
    ["candidate output directory", outputDirectory],
  ] as const) {
    assertCondition(
      !isWithin(repositoryRoot, pathname),
      `${label} must remain outside the repository`,
    );
  }

  const activationPlanFile = readPrivateJsonFile(
    command.activation_plan_path,
    "activation plan",
    config.max_activation_plan_bytes,
  );
  const activationDecisionFile = readPrivateJsonFile(
    command.activation_operator_decision_path,
    "activation operator decision",
    config.max_operator_decision_bytes,
  );
  const activation = parseActivation(
    activationPlanFile,
    activationDecisionFile,
  );

  assertCondition(
    activation.plan.operation_id
      === command.expected.activation_operation_id,
    "activation operation ID does not match expectation",
  );
  assertCondition(
    activation.plan.bindings.base_origin === command.expected.base_origin,
    "activation base origin does not match expectation",
  );
  assertCondition(
    config.allowed_base_origins.includes(
      activation.plan.bindings.base_origin,
    ),
    "activation base origin is not allowlisted",
  );
  assertCondition(
    activation.plan.bindings.endpoint_path
      === command.expected.endpoint_path
      && command.expected.endpoint_path === PAID_WORK_SUBMISSION_PATH,
    "activation endpoint path does not match canonical expectation",
  );
  assertCondition(
    config.allowed_endpoint_paths.includes(
      activation.plan.bindings.endpoint_path,
    ),
    "activation endpoint path is not allowlisted",
  );
  assertCondition(
    activation.plan.bindings.submission_id
      === command.expected.submission_id,
    "activation submission ID does not match expectation",
  );
  assertCondition(
    activation.plan.bindings.work_order_id
      === command.expected.work_order_id,
    "activation work-order ID does not match expectation",
  );
  assertCondition(
    activation.plan.bindings.payload_sha256
      === command.expected.payload_sha256,
    "activation payload SHA-256 does not match expectation",
  );
  assertCondition(
    activation.plan.bindings.replay_key
      === command.expected.replay_key
      && command.replay.expected_replay_key
        === command.expected.replay_key,
    "activation replay key does not match expectation",
  );
  assertCondition(
    activation.plan.credential_reference.reference_id
      === command.expected.credential_reference_id,
    "activation credential-reference ID does not match expectation",
  );
  assertCondition(
    activation.plan.credential_reference.mode
      === command.credential_provider.mode
      && activation.plan.credential_reference.reference_id
        === command.credential_provider.reference_id
      && activation.plan.credential_reference.source_locator_sha256
        === command.credential_provider.source_locator_sha256
      && activation.plan.credential_reference.expected_scope
        === command.credential_provider.expected_scope,
    "credential-provider metadata does not match activation plan",
  );
  assertCondition(
    !command.replay.known_replay_keys.includes(
      command.replay.expected_replay_key,
    ),
    "replay key is already present in supplied snapshot",
  );

  validateFreshness(config, command, activation.plan);

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
  assertCondition(
    requestInspection.sha256 === command.expected.payload_sha256
      && requestInspection.sha256
        === activation.plan.bindings.payload_sha256,
    "prepared request digest mismatch",
  );
  assertCondition(
    requestInspection.submissionId === command.expected.submission_id
      && requestInspection.submissionId
        === activation.plan.bindings.submission_id,
    "prepared request submission ID mismatch",
  );
  assertCondition(
    requestInspection.workOrderId === command.expected.work_order_id
      && requestInspection.workOrderId
        === activation.plan.bindings.work_order_id,
    "prepared request work-order ID mismatch",
  );
  assertCondition(
    requestInspection.bytes.byteLength
      === activation.plan.bindings.request_bytes,
    "prepared request byte count mismatch",
  );
  const executionCandidateId = deriveExecutionCandidateId(
    command,
    activationPlanFile,
    activationDecisionFile,
    requestInspection.sha256,
  );
  assertCondition(
    !command.one_shot.known_execution_candidate_ids.includes(
      executionCandidateId,
    ),
    "execution candidate ID is already present in supplied snapshot",
  );
  if (command.one_shot.expected_execution_candidate_id !== null) {
    assertCondition(
      command.one_shot.expected_execution_candidate_id
        === executionCandidateId,
      "expected execution candidate ID mismatch",
    );
  }

  const plan = buildPlan(
    command,
    activationPlanFile,
    activationDecisionFile,
    activation,
    requestInspection,
    executionCandidateId,
  );

  if (!command.apply) {
    return {
      marker:
        EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_RESULT_MARKER,
      version: 1,
      gate_id:
        EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_GATE_ID,
      status: "validated_in_memory",
      enabled: true,
      apply: false,
      operation_id: command.operation_id,
      confirmation_verified: false,
      execution_candidate_id: executionCandidateId,
      plan,
      artifacts: {
        output_directory: null,
        execution_plan_path: null,
        operator_decision_path: null,
        private_files_written: false,
      },
      authority: authority(false, false),
    };
  }

  assertCondition(
    command.one_shot.expected_execution_candidate_id
      === executionCandidateId,
    "apply requires the exact execution candidate ID",
  );
  assertCondition(
    !existsSync(outputDirectory),
    "candidate output directory already exists",
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
    mkdirSync(outputDirectory, { recursive: false, mode: 0o700 });
    chmodSync(outputDirectory, 0o700);
    outputCreated = true;
    assertPrivateDirectory(outputDirectory, "candidate output directory");

    const planBody = `${JSON.stringify(plan, null, 2)}\n`;
    writeExclusivePrivateFile(planPath, planBody);
    const planSha = sha256Text(planBody);
    const decision:
      ExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateOperatorDecisionV1 =
      {
        marker:
          EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_OPERATOR_DECISION_MARKER,
        version: 1,
        gate_id:
          EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_GATE_ID,
        operation_id: command.operation_id,
        decision: "hold_separate_operator_live_canary_required",
        confirmation_verified: true,
        execution_plan_sha256: planSha,
        execution_plan_path: planPath,
        execution_candidate_id: executionCandidateId,
        replay_key: command.replay.expected_replay_key,
        credential_reference_id:
          command.credential_provider.reference_id,
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
        "candidate artifact must be a regular non-symlink file",
      );
      assertOwnerPrivate(pathname, metadata, "candidate artifact");
    }

    return {
      marker:
        EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_RESULT_MARKER,
      version: 1,
      gate_id:
        EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_GATE_ID,
      status: "validated_and_written",
      enabled: true,
      apply: true,
      operation_id: command.operation_id,
      confirmation_verified: true,
      execution_candidate_id: executionCandidateId,
      plan,
      artifacts: {
        output_directory: outputDirectory,
        execution_plan_path: planPath,
        operator_decision_path: decisionPath,
        private_files_written: true,
      },
      authority: authority(true, true),
    };
  } catch (error) {
    if (outputCreated) {
      rmSync(outputDirectory, { recursive: true, force: true });
    }
    throw error;
  }
}
