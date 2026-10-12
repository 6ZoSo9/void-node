import { createHash } from "node:crypto";
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
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_GATE_ID,
  EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_OPERATOR_DECISION_MARKER,
  EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_PLAN_MARKER,
  LIVE_CANARY_CONFIRMATION,
  LIVE_CANARY_RELATIVE_PATH,
  type ExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateOperatorDecisionV1,
  type ExternalAgentPaidWorkAuthenticatedSubmissionExecutionPlanV1,
} from "./external_agent_paid_work_authenticated_submission_execution_candidate_v1.js";
import {
  PAID_WORK_SUBMISSION_PATH,
  REQUIRED_CONTENT_TYPE,
} from "./external_agent_paid_work_authenticated_submission_activation_prerequisite_v1.js";

export const EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_CONFIG_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_CONFIG_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_COMMAND_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_COMMAND_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_RESULT_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_RESULT_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_PLAN_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_PLAN_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_OPERATOR_DECISION_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_OPERATOR_DECISION_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_ENDPOINT_PREFLIGHT_RECEIPT_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_ENDPOINT_PREFLIGHT_RECEIPT_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_EXAMPLE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_EXAMPLE_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_VERSION =
  1 as const;
export const EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_CONFIRMATION =
  "reviewExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteV1" as const;
export const EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_GATE_ID =
  "void.external-agent-paid-work-operator-controlled-authenticated-submission-live-canary-prerequisite.v1" as const;
export const VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_MARKER =
  "VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1" as const;
export const VOID_AI_AGENT_DISCOVERY_PATH =
  "/.well-known/void-agent-discovery.json" as const;

const PLAN_FILE_SUFFIX =
  "operator-controlled-authenticated-submission-live-canary-prerequisite-plan-v1.json";
const DECISION_FILE_SUFFIX =
  "operator-controlled-authenticated-submission-live-canary-prerequisite-operator-decision-v1.json";
const PAID_WORK_CLIENT_RELATIVE_PATH =
  "tools/void-ai-agent-paid-work-client-v1.mjs" as const;
const SHA256 = /^[0-9a-f]{64}$/u;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,179}$/u;
const NONCE = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/u;
const SCOPE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{2,127}$/u;
const WORK_ORDER_ID = /^voidawo1_[0-9a-f]{64}$/u;
const SAFE_STATE_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]{2,127}\.json$/u;
const ISO_UTC_SECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;

export interface ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteConfigV1 {
  marker:
    typeof EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_CONFIG_MARKER;
  version:
    typeof EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_VERSION;
  enabled: boolean;
  allowed_base_origins: string[];
  allowed_endpoint_paths: string[];
  max_execution_plan_bytes: number;
  max_operator_decision_bytes: number;
  max_request_bytes: number;
  max_prerequisite_ttl_seconds: number;
  min_remaining_execution_candidate_ttl_seconds: number;
  max_clock_skew_seconds: number;
  max_preflight_age_seconds: number;
  max_known_replay_keys: number;
  max_known_lease_ids: number;
  max_credential_file_bytes: number;
  max_http_timeout_ms: number;
  max_response_bytes: number;
}

export interface ExternalAgentPaidWorkAuthenticatedSubmissionEndpointPreflightReceiptV1 {
  marker:
    typeof EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_ENDPOINT_PREFLIGHT_RECEIPT_MARKER;
  version: 1;
  observed_at_utc: string;
  base_origin: string;
  hostname: string;
  dns_resolved: true;
  tls_required: boolean;
  tls_verified: boolean;
  discovery_path: typeof VOID_AI_AGENT_DISCOVERY_PATH;
  discovery_marker: typeof VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_MARKER;
  submission_path: typeof PAID_WORK_SUBMISSION_PATH;
  route_probe_method: "GET";
  route_probe_status: 405;
  authorization_header_present: false;
  request_body_sent: false;
  submission_post_sent: false;
  evidence_nonce: string;
  evidence_sha256: string;
}

export interface ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteCommandV1 {
  marker:
    typeof EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_COMMAND_MARKER;
  version:
    typeof EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_VERSION;
  apply: boolean;
  confirmation: string;
  operation_id: string;
  evaluated_at_utc: string;
  prerequisite_expires_at_utc: string;
  execution_plan_path: string;
  execution_operator_decision_path: string;
  request_path: string;
  credential_source_path: string;
  replay_state_directory: string;
  lease_state_directory: string;
  output_directory: string;
  expected: {
    execution_candidate_operation_id: string;
    execution_candidate_id: string;
    base_origin: string;
    endpoint_path: typeof PAID_WORK_SUBMISSION_PATH;
    submission_id: string;
    work_order_id: string;
    payload_sha256: string;
    replay_key: string;
    credential_reference_id: string;
  };
  credential_source: {
    reference_id: string;
    source_locator_sha256: string;
    expected_scope: string;
    expected_uid: number;
    expected_mode: 384;
    expected_min_bytes: number;
    expected_max_bytes: number;
    inspect_only: true;
  };
  endpoint_preflight:
    ExternalAgentPaidWorkAuthenticatedSubmissionEndpointPreflightReceiptV1;
  replay_staging: {
    expected_replay_key: string;
    known_replay_keys: string[];
    reservation_file_name: string;
    reservation_strategy: "exclusive_create";
    reserve_during_prerequisite: false;
  };
  lease_staging: {
    lease_id: string;
    known_lease_ids: string[];
    lease_file_name: string;
    lease_strategy: "exclusive_create";
    write_during_prerequisite: false;
    maximum_attempt_count: 1;
    automatic_retry: false;
  };
  live_canary_contract: {
    tool_relative_path: typeof LIVE_CANARY_RELATIVE_PATH;
    execute_confirmation: typeof LIVE_CANARY_CONFIRMATION;
    execute_stage_required: true;
    allow_live_submit_flag_required: true;
    same_clean_commit_required: true;
    token_file_owner_private_required: true;
    maximum_attempt_count: 1;
    automatic_retry: false;
    ambiguous_outcome_policy: "hold_manual_reconciliation_no_retry";
  };
  operator_intent: {
    expect_new: boolean;
    confirmation_expires_at_utc: string;
    expected_prerequisite_id: string | null;
    live_canary_authorized: false;
    separate_operator_live_canary_required: true;
  };
}

export interface ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisitePlanV1 {
  marker:
    typeof EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_PLAN_MARKER;
  version: 1;
  gate_id:
    typeof EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_GATE_ID;
  operation_id: string;
  generated_at_utc: string;
  expires_at_utc: string;
  status: "live_canary_prerequisites_validated_hold_execution";
  prerequisite_id: string;
  source_artifacts: {
    execution_plan_path: string;
    execution_plan_sha256: string;
    execution_operator_decision_path: string;
    execution_operator_decision_sha256: string;
    request_path: string;
    request_sha256: string;
  };
  bindings: {
    execution_candidate_operation_id: string;
    execution_candidate_id: string;
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
  credential_source_inspection: {
    reference_id: string;
    source_locator_sha256: string;
    path_sha256: string;
    expected_scope: string;
    owner_uid: number;
    mode_octal: "0600";
    size_bytes: number;
    regular_file: true;
    symlink: false;
    opened: false;
    bytes_read: 0;
  };
  endpoint_preflight:
    ExternalAgentPaidWorkAuthenticatedSubmissionEndpointPreflightReceiptV1;
  replay_staging: {
    state_directory: string;
    reservation_path: string;
    reservation_path_sha256: string;
    replay_key: string;
    strategy: "exclusive_create";
    target_absent: true;
    reservation_written: false;
    reservation_consumed: false;
  };
  one_shot_lease_staging: {
    state_directory: string;
    lease_path: string;
    lease_path_sha256: string;
    lease_id: string;
    strategy: "exclusive_create";
    maximum_attempt_count: 1;
    automatic_retry: false;
    target_absent: true;
    lease_written: false;
    attempt_count: 0;
  };
  operator_control: {
    prerequisite_confirmation:
      typeof EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_CONFIRMATION;
    prerequisite_confirmation_verified: boolean;
    confirmation_expires_at_utc: string;
    live_execute_confirmation: typeof LIVE_CANARY_CONFIRMATION;
    allow_live_submit_flag_required: true;
    live_canary_authorized: false;
    separate_operator_live_canary_required: true;
  };
  live_canary_contract:
    ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteCommandV1["live_canary_contract"];
  terminal_receipt_contract: {
    accepted_new_status: 202;
    accepted_duplicate_status: 200;
    conflicting_duplicate_status: 409;
    require_authorization_verified: true;
    require_accepted_for_review: true;
    require_submission_id_binding: true;
    require_work_order_id_binding: true;
    require_request_sha256_binding: true;
    sanitized_receipt_only: true;
    ambiguous_outcome_policy: "hold_manual_reconciliation_no_retry";
  };
  gates: {
    execution_plan_integrity: true;
    execution_decision_integrity: true;
    execution_decision_is_hold: true;
    request_integrity: true;
    endpoint_allowlisted: true;
    execution_candidate_window_valid: true;
    prerequisite_window_bounded: true;
    credential_source_metadata_exact: true;
    credential_source_not_opened: true;
    endpoint_preflight_evidence_exact: true;
    endpoint_preflight_fresh: true;
    replay_key_exact_and_unique_in_snapshot: true;
    replay_reservation_target_absent: true;
    lease_id_unique_in_snapshot: true;
    one_shot_lease_target_absent: true;
    one_shot_policy_exact: true;
    live_canary_contract_exact: true;
    operator_expect_new: boolean;
    operator_live_canary_authorized: false;
    separate_operator_live_canary_required: true;
  };
  execution_boundary: {
    credential_source_opened: false;
    credential_or_token_read: false;
    authorization_header_materialized: false;
    replay_key_reserved_or_consumed: false;
    one_shot_lease_written: false;
    network_listener_creation: false;
    runtime_mount: false;
    endpoint_preflight_performed_by_gate: false;
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

export interface ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteOperatorDecisionV1 {
  marker:
    typeof EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_OPERATOR_DECISION_MARKER;
  version: 1;
  gate_id:
    typeof EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_GATE_ID;
  operation_id: string;
  decision: "hold_live_canary_not_executed";
  confirmation_verified: true;
  prerequisite_plan_sha256: string;
  prerequisite_plan_path: string;
  prerequisite_id: string;
  execution_candidate_id: string;
  replay_key: string;
  lease_id: string;
  credential_reference_id: string;
  authority:
    ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteAuthorityV1;
}

export interface ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteAuthorityV1 {
  local_private_plan_write: boolean;
  local_private_decision_write: boolean;
  credential_source_open: false;
  credential_or_token_read: false;
  authorization_header_materialized: false;
  replay_key_reservation_or_consumption: false;
  one_shot_lease_write: false;
  network_listener_creation: false;
  runtime_mount: false;
  endpoint_preflight_network_access: false;
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

export interface ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteResultV1 {
  marker:
    typeof EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_RESULT_MARKER;
  version: 1;
  gate_id:
    typeof EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_GATE_ID;
  status: "disabled" | "validated_in_memory" | "validated_and_written";
  enabled: boolean;
  apply: boolean;
  operation_id: string | null;
  confirmation_verified: boolean;
  prerequisite_id: string | null;
  plan:
    ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisitePlanV1 | null;
  artifacts: {
    output_directory: string | null;
    prerequisite_plan_path: string | null;
    operator_decision_path: string | null;
    private_files_written: boolean;
  };
  authority:
    ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteAuthorityV1;
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

export interface ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteDependenciesV1 {
  repositoryRoot: () => string;
  loadPaidWorkClient: () => Promise<PaidWorkClientModuleV1>;
}

type PrivateJsonFile = Readonly<{
  path: string;
  bytes: Buffer;
  sha256: string;
  value: unknown;
}>;

type ParsedExecutionCandidate = Readonly<{
  plan: ExternalAgentPaidWorkAuthenticatedSubmissionExecutionPlanV1;
  decision:
    ExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateOperatorDecisionV1;
}>;

function fail(message: string): never {
  throw new Error(
    `external-agent operator-controlled authenticated-submission live-canary prerequisite v1: ${message}`,
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

function requireScope(value: unknown, label: string): string {
  const output = requireString(value, label, 3, 128);
  assertCondition(SCOPE.test(output), `${label} has unsupported format`);
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
  const output = requireString(raw, label, 1, 256);
  assertCondition(
    output.startsWith("/")
      && !output.startsWith("//")
      && !output.includes("?")
      && !output.includes("#"),
    `${label} must be an absolute same-origin path`,
  );
  return output;
}

function requireSafeStateFileName(raw: unknown, label: string): string {
  const output = requireString(raw, label, 8, 132);
  assertCondition(
    SAFE_STATE_FILE.test(output)
      && path.basename(output) === output,
    `${label} must be a safe JSON basename`,
  );
  return output;
}

function validateCandidateAuthority(
  value: unknown,
  label: string,
): void {
  const record = requireRecord(value, label);
  const localKeys = [
    "local_private_plan_write",
    "local_private_decision_write",
  ] as const;
  requireExactKeys(
    record,
    [
      ...localKeys,
      "credential_provider_invocation",
      "credential_or_token_read",
      "authorization_header_materialized",
      "replay_key_reservation_or_consumption",
      "one_shot_lease_write",
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
    record.local_private_plan_write === true
      && record.local_private_decision_write === true,
    `${label} must record prior private plan and decision writes`,
  );
  for (const [key, valueEntry] of Object.entries(record)) {
    if (!localKeys.includes(key as typeof localKeys[number])) {
      assertCondition(
        valueEntry === false,
        `${label}.${key} must be false`,
      );
    }
  }
}

function parseExecutionPlan(
  value: unknown,
): ExternalAgentPaidWorkAuthenticatedSubmissionExecutionPlanV1 {
  const plan = requireRecord(value, "execution candidate plan");
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
      "execution_candidate_id",
      "source_artifacts",
      "bindings",
      "credential_provider_contract",
      "replay_reservation_contract",
      "one_shot_lease_contract",
      "http_contract",
      "response_contract",
      "gates",
      "execution_boundary",
    ],
    "execution candidate plan",
  );
  assertCondition(
    plan.marker
      === EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_PLAN_MARKER,
    "execution candidate plan marker mismatch",
  );
  assertCondition(plan.version === 1, "execution candidate plan version mismatch");
  assertCondition(
    plan.gate_id
      === EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_GATE_ID,
    "execution candidate plan gate ID mismatch",
  );
  assertCondition(
    plan.status
      === "execution_candidate_validated_separate_operator_canary_required",
    "execution candidate plan is not held for a separate canary",
  );
  requireId(plan.operation_id, "execution candidate operation ID");
  requireIsoUtc(plan.generated_at_utc, "execution candidate generated time");
  requireIsoUtc(plan.expires_at_utc, "execution candidate expiry");
  requireSha256(plan.execution_candidate_id, "execution candidate ID");

  const source = requireRecord(plan.source_artifacts, "execution source artifacts");
  requireExactKeys(
    source,
    [
      "activation_plan_path",
      "activation_plan_sha256",
      "activation_operator_decision_path",
      "activation_operator_decision_sha256",
      "request_path",
      "request_sha256",
    ],
    "execution source artifacts",
  );
  for (const key of [
    "activation_plan_path",
    "activation_operator_decision_path",
    "request_path",
  ]) {
    requireString(source[key], `execution source artifacts.${key}`, 1, 4096);
  }
  for (const key of [
    "activation_plan_sha256",
    "activation_operator_decision_sha256",
    "request_sha256",
  ]) {
    requireSha256(source[key], `execution source artifacts.${key}`);
  }

  const bindings = requireRecord(plan.bindings, "execution bindings");
  requireExactKeys(
    bindings,
    [
      "activation_operation_id",
      "base_origin",
      "endpoint_path",
      "method",
      "content_type",
      "submission_id",
      "work_order_id",
      "payload_sha256",
      "request_bytes",
      "replay_key",
      "credential_reference_id",
    ],
    "execution bindings",
  );
  requireId(bindings.activation_operation_id, "activation operation ID");
  normalizeBaseOrigin(bindings.base_origin, "execution base origin");
  assertCondition(
    bindings.endpoint_path === PAID_WORK_SUBMISSION_PATH,
    "execution endpoint path mismatch",
  );
  assertCondition(bindings.method === "POST", "execution method must be POST");
  assertCondition(
    bindings.content_type === REQUIRED_CONTENT_TYPE,
    "execution content type mismatch",
  );
  requireId(bindings.submission_id, "execution submission ID");
  const workOrderId = requireString(
    bindings.work_order_id,
    "execution work-order ID",
    73,
    73,
  );
  assertCondition(WORK_ORDER_ID.test(workOrderId), "execution work-order ID invalid");
  requireSha256(bindings.payload_sha256, "execution payload SHA-256");
  requireInteger(bindings.request_bytes, "execution request bytes", 2, 1_048_576);
  requireSha256(bindings.replay_key, "execution replay key");
  requireId(bindings.credential_reference_id, "execution credential reference ID");

  const credential = requireRecord(
    plan.credential_provider_contract,
    "execution credential provider contract",
  );
  requireExactKeys(
    credential,
    [
      "mode",
      "reference_id",
      "source_locator_sha256",
      "expected_scope",
      "provider_interface",
      "opened",
      "credential_or_token_read",
      "authorization_header_materialized",
    ],
    "execution credential provider contract",
  );
  assertCondition(
    credential.mode === "credential_registry"
      || credential.mode === "single_token_fallback",
    "execution credential mode mismatch",
  );
  requireId(credential.reference_id, "execution credential reference ID");
  requireSha256(
    credential.source_locator_sha256,
    "execution credential source locator SHA-256",
  );
  requireScope(credential.expected_scope, "execution credential expected scope");
  assertCondition(
    credential.provider_interface
      === "open_once_only_after_live_confirmation_then_zeroize",
    "execution credential provider interface mismatch",
  );
  assertCondition(
    credential.opened === false
      && credential.credential_or_token_read === false
      && credential.authorization_header_materialized === false,
    "execution credential provider contract must remain unopened",
  );

  const replay = requireRecord(
    plan.replay_reservation_contract,
    "execution replay reservation contract",
  );
  requireExactKeys(
    replay,
    [
      "replay_key",
      "strategy",
      "required_before_credential_open",
      "reservation_written",
      "reservation_consumed",
      "terminal_outcomes",
    ],
    "execution replay reservation contract",
  );
  requireSha256(replay.replay_key, "execution replay key");
  assertCondition(
    replay.strategy === "exclusive_create"
      && replay.required_before_credential_open === true
      && replay.reservation_written === false
      && replay.reservation_consumed === false,
    "execution replay contract must remain unreserved",
  );
  assertCondition(
    Array.isArray(replay.terminal_outcomes)
      && canonicalJson(replay.terminal_outcomes)
        === canonicalJson(["accepted", "duplicate", "rejected", "ambiguous_hold"]),
    "execution replay terminal outcomes mismatch",
  );

  const lease = requireRecord(
    plan.one_shot_lease_contract,
    "execution one-shot lease contract",
  );
  requireExactKeys(
    lease,
    [
      "candidate_nonce",
      "strategy",
      "maximum_attempt_count",
      "automatic_retry",
      "lease_written",
      "attempt_count",
      "separate_confirmation",
    ],
    "execution one-shot lease contract",
  );
  requireNonce(lease.candidate_nonce, "execution candidate nonce");
  assertCondition(
    lease.strategy === "exclusive_create"
      && lease.maximum_attempt_count === 1
      && lease.automatic_retry === false
      && lease.lease_written === false
      && lease.attempt_count === 0
      && lease.separate_confirmation === LIVE_CANARY_CONFIRMATION,
    "execution one-shot lease contract mismatch",
  );

  const http = requireRecord(plan.http_contract, "execution HTTP contract");
  requireExactKeys(
    http,
    [
      "origin",
      "path",
      "method",
      "content_type",
      "payload_sha256_header",
      "timeout_ms",
      "max_response_bytes",
      "redirect_mode",
      "credentials_mode",
      "cache_mode",
      "cookies_sent",
      "redirects_followed",
      "automatic_retry",
      "maximum_attempt_count",
      "request_sent",
    ],
    "execution HTTP contract",
  );
  normalizeBaseOrigin(http.origin, "execution HTTP origin");
  assertCondition(
    http.path === PAID_WORK_SUBMISSION_PATH
      && http.method === "POST"
      && http.content_type === REQUIRED_CONTENT_TYPE,
    "execution HTTP route contract mismatch",
  );
  requireSha256(http.payload_sha256_header, "execution HTTP payload header");
  requireInteger(http.timeout_ms, "execution HTTP timeout", 100, 120_000);
  requireInteger(
    http.max_response_bytes,
    "execution HTTP max response bytes",
    1024,
    16_777_216,
  );
  assertCondition(
    http.redirect_mode === "manual"
      && http.credentials_mode === "omit"
      && http.cache_mode === "no-store"
      && http.cookies_sent === false
      && http.redirects_followed === false
      && http.automatic_retry === false
      && http.maximum_attempt_count === 1
      && http.request_sent === false,
    "execution HTTP contract must remain unexecuted",
  );

  const response = requireRecord(
    plan.response_contract,
    "execution response contract",
  );
  requireExactKeys(
    response,
    [
      "accepted_new_status",
      "accepted_duplicate_status",
      "conflicting_duplicate_status",
      "require_authorization_verified",
      "require_accepted_for_review",
      "require_submission_id_binding",
      "require_work_order_id_binding",
      "require_request_sha256_binding",
      "ambiguous_outcome_policy",
      "sanitized_receipt_only",
    ],
    "execution response contract",
  );
  assertCondition(
    response.accepted_new_status === 202
      && response.accepted_duplicate_status === 200
      && response.conflicting_duplicate_status === 409
      && response.require_authorization_verified === true
      && response.require_accepted_for_review === true
      && response.require_submission_id_binding === true
      && response.require_work_order_id_binding === true
      && response.require_request_sha256_binding === true
      && response.ambiguous_outcome_policy
        === "hold_manual_reconciliation_no_retry"
      && response.sanitized_receipt_only === true,
    "execution response contract mismatch",
  );

  const gates = requireRecord(plan.gates, "execution gates");
  requireExactKeys(
    gates,
    [
      "activation_plan_integrity",
      "activation_decision_integrity",
      "activation_decision_is_hold",
      "request_integrity",
      "endpoint_allowlisted",
      "activation_window_valid",
      "candidate_window_bounded",
      "credential_reference_exact",
      "replay_key_exact_and_unique_in_snapshot",
      "execution_candidate_id_unique_in_snapshot",
      "one_shot_policy_exact",
      "http_policy_exact",
      "operator_expect_new",
      "operator_live_submission_authorized",
      "separate_operator_live_canary_required",
    ],
    "execution gates",
  );
  for (const key of Object.keys(gates)) {
    if (key === "operator_expect_new") {
      requireBoolean(gates[key], "execution gates.operator_expect_new");
    } else if (key === "operator_live_submission_authorized") {
      assertCondition(gates[key] === false, "execution live authority must be false");
    } else {
      assertCondition(gates[key] === true, `execution gates.${key} must be true`);
    }
  }

  const boundary = requireRecord(
    plan.execution_boundary,
    "execution boundary",
  );
  requireExactKeys(
    boundary,
    [
      "credential_provider_invoked",
      "credential_or_token_read",
      "authorization_header_materialized",
      "replay_key_reserved_or_consumed",
      "one_shot_lease_written",
      "network_listener_creation",
      "runtime_mount",
      "request_sent",
      "authenticated_submission_post",
      "live_ticket_issuance",
      "wc_ledger_write",
      "wallet_or_signer_access",
      "service_restart",
      "deployment",
      "separate_operator_live_canary_required",
    ],
    "execution boundary",
  );
  for (const key of Object.keys(boundary)) {
    if (key === "separate_operator_live_canary_required") {
      assertCondition(boundary[key] === true, "separate canary must remain required");
    } else {
      assertCondition(boundary[key] === false, `execution boundary.${key} must be false`);
    }
  }

  return plan as unknown as
    ExternalAgentPaidWorkAuthenticatedSubmissionExecutionPlanV1;
}

function parseExecutionDecision(
  value: unknown,
  planFile: PrivateJsonFile,
): ExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateOperatorDecisionV1 {
  const decision = requireRecord(value, "execution candidate decision");
  requireExactKeys(
    decision,
    [
      "marker",
      "version",
      "gate_id",
      "operation_id",
      "decision",
      "confirmation_verified",
      "execution_plan_sha256",
      "execution_plan_path",
      "execution_candidate_id",
      "replay_key",
      "credential_reference_id",
      "authority",
    ],
    "execution candidate decision",
  );
  assertCondition(
    decision.marker
      === EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_OPERATOR_DECISION_MARKER,
    "execution candidate decision marker mismatch",
  );
  assertCondition(decision.version === 1, "execution candidate decision version mismatch");
  assertCondition(
    decision.gate_id
      === EXTERNAL_AGENT_PAID_WORK_AUTHENTICATED_SUBMISSION_EXECUTION_CANDIDATE_GATE_ID,
    "execution candidate decision gate ID mismatch",
  );
  requireId(decision.operation_id, "execution candidate decision operation ID");
  assertCondition(
    decision.decision === "hold_separate_operator_live_canary_required",
    "execution candidate decision is not held",
  );
  assertCondition(
    decision.confirmation_verified === true,
    "execution candidate decision was not confirmed",
  );
  assertCondition(
    requireSha256(
      decision.execution_plan_sha256,
      "execution candidate decision plan SHA-256",
    ) === planFile.sha256,
    "execution candidate plan SHA-256 mismatch",
  );
  assertCondition(
    path.resolve(
      requireString(
        decision.execution_plan_path,
        "execution candidate decision plan path",
      ),
    ) === planFile.path,
    "execution candidate decision plan path mismatch",
  );
  requireSha256(decision.execution_candidate_id, "execution candidate decision ID");
  requireSha256(decision.replay_key, "execution candidate decision replay key");
  requireId(
    decision.credential_reference_id,
    "execution candidate decision credential reference ID",
  );
  validateCandidateAuthority(decision.authority, "execution candidate authority");
  return decision as unknown as
    ExternalAgentPaidWorkAuthenticatedSubmissionExecutionCandidateOperatorDecisionV1;
}

function parseExecutionCandidate(
  planFile: PrivateJsonFile,
  decisionFile: PrivateJsonFile,
): ParsedExecutionCandidate {
  const plan = parseExecutionPlan(planFile.value);
  const decision = parseExecutionDecision(decisionFile.value, planFile);
  assertCondition(
    plan.operation_id === decision.operation_id,
    "execution plan and decision operation IDs differ",
  );
  assertCondition(
    plan.execution_candidate_id === decision.execution_candidate_id,
    "execution plan and decision candidate IDs differ",
  );
  assertCondition(
    plan.bindings.replay_key === decision.replay_key,
    "execution plan and decision replay keys differ",
  );
  assertCondition(
    plan.bindings.credential_reference_id
      === decision.credential_reference_id,
    "execution plan and decision credential references differ",
  );
  return { plan, decision };
}

function authority(
  planWrite: boolean,
  decisionWrite: boolean,
): ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteAuthorityV1 {
  return {
    local_private_plan_write: planWrite,
    local_private_decision_write: decisionWrite,
    credential_source_open: false,
    credential_or_token_read: false,
    authorization_header_materialized: false,
    replay_key_reservation_or_consumption: false,
    one_shot_lease_write: false,
    network_listener_creation: false,
    runtime_mount: false,
    endpoint_preflight_network_access: false,
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

function disabledResult():
  ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteResultV1 {
  return {
    marker:
      EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_RESULT_MARKER,
    version: 1,
    gate_id:
      EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_GATE_ID,
    status: "disabled",
    enabled: false,
    apply: false,
    operation_id: null,
    confirmation_verified: false,
    prerequisite_id: null,
    plan: null,
    artifacts: {
      output_directory: null,
      prerequisite_plan_path: null,
      operator_decision_path: null,
      private_files_written: false,
    },
    authority: authority(false, false),
  };
}

async function defaultLoadPaidWorkClient(): Promise<PaidWorkClientModuleV1> {
  const moduleUrl = new URL(
    `../${PAID_WORK_CLIENT_RELATIVE_PATH}`,
    import.meta.url,
  );
  const loaded = await import(moduleUrl.href) as Partial<PaidWorkClientModuleV1>;
  assertCondition(
    typeof loaded.normalizePaidWorkBaseUrlV1 === "function"
      && typeof loaded.readPaidWorkSubmissionRequestV1 === "function",
    "paid-work client module contract is incomplete",
  );
  return loaded as PaidWorkClientModuleV1;
}

function defaultRepositoryRoot(): string {
  return path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    "..",
  );
}

export const EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_DEFAULT_DEPENDENCIES_V1:
  ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteDependenciesV1 =
  {
    repositoryRoot: defaultRepositoryRoot,
    loadPaidWorkClient: defaultLoadPaidWorkClient,
  };

export function validateExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteConfigV1(
  value: unknown,
): ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteConfigV1 {
  const config = requireRecord(value, "config");
  requireExactKeys(
    config,
    [
      "marker",
      "version",
      "enabled",
      "allowed_base_origins",
      "allowed_endpoint_paths",
      "max_execution_plan_bytes",
      "max_operator_decision_bytes",
      "max_request_bytes",
      "max_prerequisite_ttl_seconds",
      "min_remaining_execution_candidate_ttl_seconds",
      "max_clock_skew_seconds",
      "max_preflight_age_seconds",
      "max_known_replay_keys",
      "max_known_lease_ids",
      "max_credential_file_bytes",
      "max_http_timeout_ms",
      "max_response_bytes",
    ],
    "config",
  );
  assertCondition(
    config.marker
      === EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_CONFIG_MARKER,
    "config marker mismatch",
  );
  assertCondition(config.version === 1, "config version mismatch");
  const allowedBaseOrigins = requireStringArray(
    config.allowed_base_origins,
    "config.allowed_base_origins",
    32,
    normalizeBaseOrigin,
  );
  const allowedEndpointPaths = requireStringArray(
    config.allowed_endpoint_paths,
    "config.allowed_endpoint_paths",
    16,
    normalizeEndpointPath,
  );
  assertCondition(
    allowedEndpointPaths.includes(PAID_WORK_SUBMISSION_PATH),
    "canonical paid-work submission path must be allowlisted",
  );
  return {
    marker:
      EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_CONFIG_MARKER,
    version: 1,
    enabled: requireBoolean(config.enabled, "config.enabled"),
    allowed_base_origins: allowedBaseOrigins,
    allowed_endpoint_paths: allowedEndpointPaths,
    max_execution_plan_bytes: requireInteger(
      config.max_execution_plan_bytes,
      "config.max_execution_plan_bytes",
      1024,
      8_388_608,
    ),
    max_operator_decision_bytes: requireInteger(
      config.max_operator_decision_bytes,
      "config.max_operator_decision_bytes",
      512,
      2_097_152,
    ),
    max_request_bytes: requireInteger(
      config.max_request_bytes,
      "config.max_request_bytes",
      1024,
      1_048_576,
    ),
    max_prerequisite_ttl_seconds: requireInteger(
      config.max_prerequisite_ttl_seconds,
      "config.max_prerequisite_ttl_seconds",
      30,
      3600,
    ),
    min_remaining_execution_candidate_ttl_seconds: requireInteger(
      config.min_remaining_execution_candidate_ttl_seconds,
      "config.min_remaining_execution_candidate_ttl_seconds",
      1,
      3600,
    ),
    max_clock_skew_seconds: requireInteger(
      config.max_clock_skew_seconds,
      "config.max_clock_skew_seconds",
      0,
      300,
    ),
    max_preflight_age_seconds: requireInteger(
      config.max_preflight_age_seconds,
      "config.max_preflight_age_seconds",
      1,
      3600,
    ),
    max_known_replay_keys: requireInteger(
      config.max_known_replay_keys,
      "config.max_known_replay_keys",
      0,
      10000,
    ),
    max_known_lease_ids: requireInteger(
      config.max_known_lease_ids,
      "config.max_known_lease_ids",
      0,
      10000,
    ),
    max_credential_file_bytes: requireInteger(
      config.max_credential_file_bytes,
      "config.max_credential_file_bytes",
      1,
      1_048_576,
    ),
    max_http_timeout_ms: requireInteger(
      config.max_http_timeout_ms,
      "config.max_http_timeout_ms",
      100,
      120_000,
    ),
    max_response_bytes: requireInteger(
      config.max_response_bytes,
      "config.max_response_bytes",
      1024,
      16_777_216,
    ),
  };
}

function validatePreflight(
  value: unknown,
  evaluatedAt: string,
  config:
    ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteConfigV1,
): ExternalAgentPaidWorkAuthenticatedSubmissionEndpointPreflightReceiptV1 {
  const preflight = requireRecord(value, "endpoint preflight");
  requireExactKeys(
    preflight,
    [
      "marker",
      "version",
      "observed_at_utc",
      "base_origin",
      "hostname",
      "dns_resolved",
      "tls_required",
      "tls_verified",
      "discovery_path",
      "discovery_marker",
      "submission_path",
      "route_probe_method",
      "route_probe_status",
      "authorization_header_present",
      "request_body_sent",
      "submission_post_sent",
      "evidence_nonce",
      "evidence_sha256",
    ],
    "endpoint preflight",
  );
  assertCondition(
    preflight.marker
      === EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_ENDPOINT_PREFLIGHT_RECEIPT_MARKER,
    "endpoint preflight marker mismatch",
  );
  assertCondition(preflight.version === 1, "endpoint preflight version mismatch");
  const observedAt = requireIsoUtc(
    preflight.observed_at_utc,
    "endpoint preflight observed time",
  );
  const baseOrigin = normalizeBaseOrigin(
    preflight.base_origin,
    "endpoint preflight base origin",
  );
  const origin = new URL(baseOrigin);
  assertCondition(
    requireString(preflight.hostname, "endpoint preflight hostname", 1, 253)
      === origin.hostname,
    "endpoint preflight hostname mismatch",
  );
  assertCondition(
    preflight.dns_resolved === true,
    "endpoint preflight DNS result must be true",
  );
  const tlsRequired = origin.protocol === "https:";
  assertCondition(
    preflight.tls_required === tlsRequired,
    "endpoint preflight TLS-required flag mismatch",
  );
  assertCondition(
    preflight.tls_verified === tlsRequired,
    "endpoint preflight TLS verification mismatch",
  );
  assertCondition(
    preflight.discovery_path === VOID_AI_AGENT_DISCOVERY_PATH
      && preflight.discovery_marker
        === VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_MARKER,
    "endpoint preflight discovery contract mismatch",
  );
  assertCondition(
    preflight.submission_path === PAID_WORK_SUBMISSION_PATH
      && preflight.route_probe_method === "GET"
      && preflight.route_probe_status === 405,
    "endpoint preflight route probe mismatch",
  );
  assertCondition(
    preflight.authorization_header_present === false
      && preflight.request_body_sent === false
      && preflight.submission_post_sent === false,
    "endpoint preflight must contain no submission authority",
  );
  requireNonce(preflight.evidence_nonce, "endpoint preflight evidence nonce");
  const suppliedHash = requireSha256(
    preflight.evidence_sha256,
    "endpoint preflight evidence SHA-256",
  );
  const { evidence_sha256: _, ...withoutHash } = preflight;
  assertCondition(
    suppliedHash === sha256Text(canonicalJson(withoutHash)),
    "endpoint preflight evidence SHA-256 mismatch",
  );
  const evaluatedMs = Date.parse(evaluatedAt);
  const observedMs = Date.parse(observedAt);
  assertCondition(
    observedMs <= evaluatedMs + config.max_clock_skew_seconds * 1000,
    "endpoint preflight evidence is from the future",
  );
  assertCondition(
    evaluatedMs - observedMs <= config.max_preflight_age_seconds * 1000,
    "endpoint preflight evidence is stale",
  );
  return preflight as unknown as
    ExternalAgentPaidWorkAuthenticatedSubmissionEndpointPreflightReceiptV1;
}

export function validateExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteCommandV1(
  value: unknown,
  config:
    ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteConfigV1,
): ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteCommandV1 {
  const command = requireRecord(value, "command");
  requireExactKeys(
    command,
    [
      "marker",
      "version",
      "apply",
      "confirmation",
      "operation_id",
      "evaluated_at_utc",
      "prerequisite_expires_at_utc",
      "execution_plan_path",
      "execution_operator_decision_path",
      "request_path",
      "credential_source_path",
      "replay_state_directory",
      "lease_state_directory",
      "output_directory",
      "expected",
      "credential_source",
      "endpoint_preflight",
      "replay_staging",
      "lease_staging",
      "live_canary_contract",
      "operator_intent",
    ],
    "command",
  );
  assertCondition(
    command.marker
      === EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_COMMAND_MARKER,
    "command marker mismatch",
  );
  assertCondition(command.version === 1, "command version mismatch");
  const apply = requireBoolean(command.apply, "command.apply");
  const confirmation = requireString(
    command.confirmation,
    "command.confirmation",
    0,
    256,
  );
  if (apply) {
    assertCondition(
      confirmation
        === EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_CONFIRMATION,
      "apply confirmation mismatch",
    );
  } else {
    assertCondition(
      confirmation === "",
      "dry-run confirmation must be empty",
    );
  }
  const operationId = requireId(command.operation_id, "command.operation_id");
  const evaluatedAt = requireIsoUtc(
    command.evaluated_at_utc,
    "command.evaluated_at_utc",
  );
  const expiresAt = requireIsoUtc(
    command.prerequisite_expires_at_utc,
    "command.prerequisite_expires_at_utc",
  );
  const evaluatedMs = Date.parse(evaluatedAt);
  const expiresMs = Date.parse(expiresAt);
  assertCondition(expiresMs > evaluatedMs, "prerequisite expiry must be later");
  assertCondition(
    expiresMs - evaluatedMs <= config.max_prerequisite_ttl_seconds * 1000,
    "prerequisite TTL exceeds configured maximum",
  );

  const expected = requireRecord(command.expected, "command.expected");
  requireExactKeys(
    expected,
    [
      "execution_candidate_operation_id",
      "execution_candidate_id",
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
    "command.expected.work_order_id invalid",
  );

  const credential = requireRecord(
    command.credential_source,
    "command.credential_source",
  );
  requireExactKeys(
    credential,
    [
      "reference_id",
      "source_locator_sha256",
      "expected_scope",
      "expected_uid",
      "expected_mode",
      "expected_min_bytes",
      "expected_max_bytes",
      "inspect_only",
    ],
    "command.credential_source",
  );
  const expectedMinBytes = requireInteger(
    credential.expected_min_bytes,
    "credential expected minimum bytes",
    1,
    config.max_credential_file_bytes,
  );
  const expectedMaxBytes = requireInteger(
    credential.expected_max_bytes,
    "credential expected maximum bytes",
    expectedMinBytes,
    config.max_credential_file_bytes,
  );
  assertCondition(
    credential.expected_mode === 0o600,
    "credential expected mode must be 0600",
  );
  assertCondition(
    credential.inspect_only === true,
    "credential source must remain inspect-only",
  );

  const replay = requireRecord(command.replay_staging, "command.replay_staging");
  requireExactKeys(
    replay,
    [
      "expected_replay_key",
      "known_replay_keys",
      "reservation_file_name",
      "reservation_strategy",
      "reserve_during_prerequisite",
    ],
    "command.replay_staging",
  );
  const knownReplayKeys = requireStringArray(
    replay.known_replay_keys,
    "known replay keys",
    config.max_known_replay_keys,
    requireSha256,
  );
  assertCondition(
    replay.reservation_strategy === "exclusive_create"
      && replay.reserve_during_prerequisite === false,
    "replay prerequisite must not reserve live state",
  );

  const lease = requireRecord(command.lease_staging, "command.lease_staging");
  requireExactKeys(
    lease,
    [
      "lease_id",
      "known_lease_ids",
      "lease_file_name",
      "lease_strategy",
      "write_during_prerequisite",
      "maximum_attempt_count",
      "automatic_retry",
    ],
    "command.lease_staging",
  );
  const knownLeaseIds = requireStringArray(
    lease.known_lease_ids,
    "known lease IDs",
    config.max_known_lease_ids,
    requireId,
  );
  assertCondition(
    lease.lease_strategy === "exclusive_create"
      && lease.write_during_prerequisite === false
      && lease.maximum_attempt_count === 1
      && lease.automatic_retry === false,
    "one-shot lease prerequisite policy mismatch",
  );

  const live = requireRecord(
    command.live_canary_contract,
    "command.live_canary_contract",
  );
  requireExactKeys(
    live,
    [
      "tool_relative_path",
      "execute_confirmation",
      "execute_stage_required",
      "allow_live_submit_flag_required",
      "same_clean_commit_required",
      "token_file_owner_private_required",
      "maximum_attempt_count",
      "automatic_retry",
      "ambiguous_outcome_policy",
    ],
    "command.live_canary_contract",
  );
  assertCondition(
    live.tool_relative_path === LIVE_CANARY_RELATIVE_PATH
      && live.execute_confirmation === LIVE_CANARY_CONFIRMATION
      && live.execute_stage_required === true
      && live.allow_live_submit_flag_required === true
      && live.same_clean_commit_required === true
      && live.token_file_owner_private_required === true
      && live.maximum_attempt_count === 1
      && live.automatic_retry === false
      && live.ambiguous_outcome_policy
        === "hold_manual_reconciliation_no_retry",
    "live-canary contract mismatch",
  );

  const intent = requireRecord(command.operator_intent, "command.operator_intent");
  requireExactKeys(
    intent,
    [
      "expect_new",
      "confirmation_expires_at_utc",
      "expected_prerequisite_id",
      "live_canary_authorized",
      "separate_operator_live_canary_required",
    ],
    "command.operator_intent",
  );
  const confirmationExpiresAt = requireIsoUtc(
    intent.confirmation_expires_at_utc,
    "operator confirmation expiry",
  );
  assertCondition(
    Date.parse(confirmationExpiresAt) >= evaluatedMs
      && Date.parse(confirmationExpiresAt) <= expiresMs,
    "operator confirmation expiry must be within prerequisite window",
  );
  if (intent.expected_prerequisite_id !== null) {
    requireSha256(intent.expected_prerequisite_id, "expected prerequisite ID");
  }
  assertCondition(
    intent.live_canary_authorized === false
      && intent.separate_operator_live_canary_required === true,
    "operator intent must retain a separate held live canary",
  );

  return {
    marker:
      EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_COMMAND_MARKER,
    version: 1,
    apply,
    confirmation,
    operation_id: operationId,
    evaluated_at_utc: evaluatedAt,
    prerequisite_expires_at_utc: expiresAt,
    execution_plan_path: requireString(
      command.execution_plan_path,
      "command.execution_plan_path",
      1,
      4096,
    ),
    execution_operator_decision_path: requireString(
      command.execution_operator_decision_path,
      "command.execution_operator_decision_path",
      1,
      4096,
    ),
    request_path: requireString(command.request_path, "command.request_path", 1, 4096),
    credential_source_path: requireString(
      command.credential_source_path,
      "command.credential_source_path",
      1,
      4096,
    ),
    replay_state_directory: requireString(
      command.replay_state_directory,
      "command.replay_state_directory",
      1,
      4096,
    ),
    lease_state_directory: requireString(
      command.lease_state_directory,
      "command.lease_state_directory",
      1,
      4096,
    ),
    output_directory: requireString(
      command.output_directory,
      "command.output_directory",
      1,
      4096,
    ),
    expected: {
      execution_candidate_operation_id: requireId(
        expected.execution_candidate_operation_id,
        "expected execution candidate operation ID",
      ),
      execution_candidate_id: requireSha256(
        expected.execution_candidate_id,
        "expected execution candidate ID",
      ),
      base_origin: normalizeBaseOrigin(
        expected.base_origin,
        "expected base origin",
      ),
      endpoint_path:
        normalizeEndpointPath(
          expected.endpoint_path,
          "expected endpoint path",
        ) as typeof PAID_WORK_SUBMISSION_PATH,
      submission_id: requireId(expected.submission_id, "expected submission ID"),
      work_order_id: expectedWorkOrderId,
      payload_sha256: requireSha256(
        expected.payload_sha256,
        "expected payload SHA-256",
      ),
      replay_key: requireSha256(expected.replay_key, "expected replay key"),
      credential_reference_id: requireId(
        expected.credential_reference_id,
        "expected credential reference ID",
      ),
    },
    credential_source: {
      reference_id: requireId(
        credential.reference_id,
        "credential reference ID",
      ),
      source_locator_sha256: requireSha256(
        credential.source_locator_sha256,
        "credential source locator SHA-256",
      ),
      expected_scope: requireScope(
        credential.expected_scope,
        "credential expected scope",
      ),
      expected_uid: requireInteger(
        credential.expected_uid,
        "credential expected UID",
        0,
        2_147_483_647,
      ),
      expected_mode: 0o600,
      expected_min_bytes: expectedMinBytes,
      expected_max_bytes: expectedMaxBytes,
      inspect_only: true,
    },
    endpoint_preflight: validatePreflight(
      command.endpoint_preflight,
      evaluatedAt,
      config,
    ),
    replay_staging: {
      expected_replay_key: requireSha256(
        replay.expected_replay_key,
        "replay expected key",
      ),
      known_replay_keys: knownReplayKeys,
      reservation_file_name: requireSafeStateFileName(
        replay.reservation_file_name,
        "replay reservation filename",
      ),
      reservation_strategy: "exclusive_create",
      reserve_during_prerequisite: false,
    },
    lease_staging: {
      lease_id: requireId(lease.lease_id, "lease ID"),
      known_lease_ids: knownLeaseIds,
      lease_file_name: requireSafeStateFileName(
        lease.lease_file_name,
        "lease filename",
      ),
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
      expect_new: requireBoolean(intent.expect_new, "operator expect-new"),
      confirmation_expires_at_utc: confirmationExpiresAt,
      expected_prerequisite_id:
        intent.expected_prerequisite_id === null
          ? null
          : requireSha256(
            intent.expected_prerequisite_id,
            "expected prerequisite ID",
          ),
      live_canary_authorized: false,
      separate_operator_live_canary_required: true,
    },
  };
}

function validateFreshness(
  config:
    ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteConfigV1,
  command:
    ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteCommandV1,
  plan: ExternalAgentPaidWorkAuthenticatedSubmissionExecutionPlanV1,
): void {
  const evaluatedMs = Date.parse(command.evaluated_at_utc);
  const candidateGeneratedMs = Date.parse(plan.generated_at_utc);
  const candidateExpiresMs = Date.parse(plan.expires_at_utc);
  const prerequisiteExpiresMs = Date.parse(command.prerequisite_expires_at_utc);
  assertCondition(
    evaluatedMs >= candidateGeneratedMs - config.max_clock_skew_seconds * 1000,
    "evaluation predates execution candidate",
  );
  assertCondition(
    candidateExpiresMs - evaluatedMs
      >= config.min_remaining_execution_candidate_ttl_seconds * 1000,
    "execution candidate has insufficient remaining TTL",
  );
  assertCondition(
    prerequisiteExpiresMs <= candidateExpiresMs,
    "prerequisite expiry exceeds execution candidate expiry",
  );
}

function derivePrerequisiteId(
  command:
    ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteCommandV1,
  executionPlanFile: PrivateJsonFile,
  executionDecisionFile: PrivateJsonFile,
  requestSha256: string,
  credentialPathSha256: string,
  replayReservationPath: string,
  leasePath: string,
): string {
  return sha256Text(
    canonicalJson({
      marker:
        EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_MARKER,
      operation_id: command.operation_id,
      evaluated_at_utc: command.evaluated_at_utc,
      prerequisite_expires_at_utc: command.prerequisite_expires_at_utc,
      execution_plan_sha256: executionPlanFile.sha256,
      execution_decision_sha256: executionDecisionFile.sha256,
      request_sha256: requestSha256,
      credential_path_sha256: credentialPathSha256,
      preflight_evidence_sha256:
        command.endpoint_preflight.evidence_sha256,
      replay_key: command.replay_staging.expected_replay_key,
      replay_reservation_path_sha256: sha256Text(replayReservationPath),
      lease_id: command.lease_staging.lease_id,
      lease_path_sha256: sha256Text(leasePath),
      live_canary_confirmation:
        command.live_canary_contract.execute_confirmation,
    }),
  );
}

function buildPlan(
  command:
    ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteCommandV1,
  executionPlanFile: PrivateJsonFile,
  executionDecisionFile: PrivateJsonFile,
  candidate: ParsedExecutionCandidate,
  requestInspection: PaidWorkRequestInspectionV1,
  prerequisiteId: string,
  credentialMetadata: Stats,
  credentialPath: string,
  replayDirectory: string,
  replayReservationPath: string,
  leaseDirectory: string,
  leasePath: string,
): ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisitePlanV1 {
  return {
    marker:
      EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_PLAN_MARKER,
    version: 1,
    gate_id:
      EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_GATE_ID,
    operation_id: command.operation_id,
    generated_at_utc: command.evaluated_at_utc,
    expires_at_utc: command.prerequisite_expires_at_utc,
    status: "live_canary_prerequisites_validated_hold_execution",
    prerequisite_id: prerequisiteId,
    source_artifacts: {
      execution_plan_path: executionPlanFile.path,
      execution_plan_sha256: executionPlanFile.sha256,
      execution_operator_decision_path: executionDecisionFile.path,
      execution_operator_decision_sha256: executionDecisionFile.sha256,
      request_path: path.resolve(command.request_path),
      request_sha256: requestInspection.sha256,
    },
    bindings: {
      execution_candidate_operation_id: candidate.plan.operation_id,
      execution_candidate_id: candidate.plan.execution_candidate_id,
      base_origin: candidate.plan.bindings.base_origin,
      endpoint_path: PAID_WORK_SUBMISSION_PATH,
      method: "POST",
      content_type: REQUIRED_CONTENT_TYPE,
      submission_id: candidate.plan.bindings.submission_id,
      work_order_id: candidate.plan.bindings.work_order_id,
      payload_sha256: candidate.plan.bindings.payload_sha256,
      request_bytes: requestInspection.bytes.byteLength,
      replay_key: candidate.plan.bindings.replay_key,
      credential_reference_id:
        candidate.plan.bindings.credential_reference_id,
    },
    credential_source_inspection: {
      reference_id: command.credential_source.reference_id,
      source_locator_sha256:
        command.credential_source.source_locator_sha256,
      path_sha256: sha256Text(credentialPath),
      expected_scope: command.credential_source.expected_scope,
      owner_uid: credentialMetadata.uid,
      mode_octal: "0600",
      size_bytes: credentialMetadata.size,
      regular_file: true,
      symlink: false,
      opened: false,
      bytes_read: 0,
    },
    endpoint_preflight: command.endpoint_preflight,
    replay_staging: {
      state_directory: replayDirectory,
      reservation_path: replayReservationPath,
      reservation_path_sha256: sha256Text(replayReservationPath),
      replay_key: command.replay_staging.expected_replay_key,
      strategy: "exclusive_create",
      target_absent: true,
      reservation_written: false,
      reservation_consumed: false,
    },
    one_shot_lease_staging: {
      state_directory: leaseDirectory,
      lease_path: leasePath,
      lease_path_sha256: sha256Text(leasePath),
      lease_id: command.lease_staging.lease_id,
      strategy: "exclusive_create",
      maximum_attempt_count: 1,
      automatic_retry: false,
      target_absent: true,
      lease_written: false,
      attempt_count: 0,
    },
    operator_control: {
      prerequisite_confirmation:
        EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_CONFIRMATION,
      prerequisite_confirmation_verified: command.apply,
      confirmation_expires_at_utc:
        command.operator_intent.confirmation_expires_at_utc,
      live_execute_confirmation: LIVE_CANARY_CONFIRMATION,
      allow_live_submit_flag_required: true,
      live_canary_authorized: false,
      separate_operator_live_canary_required: true,
    },
    live_canary_contract: command.live_canary_contract,
    terminal_receipt_contract: {
      accepted_new_status: 202,
      accepted_duplicate_status: 200,
      conflicting_duplicate_status: 409,
      require_authorization_verified: true,
      require_accepted_for_review: true,
      require_submission_id_binding: true,
      require_work_order_id_binding: true,
      require_request_sha256_binding: true,
      sanitized_receipt_only: true,
      ambiguous_outcome_policy: "hold_manual_reconciliation_no_retry",
    },
    gates: {
      execution_plan_integrity: true,
      execution_decision_integrity: true,
      execution_decision_is_hold: true,
      request_integrity: true,
      endpoint_allowlisted: true,
      execution_candidate_window_valid: true,
      prerequisite_window_bounded: true,
      credential_source_metadata_exact: true,
      credential_source_not_opened: true,
      endpoint_preflight_evidence_exact: true,
      endpoint_preflight_fresh: true,
      replay_key_exact_and_unique_in_snapshot: true,
      replay_reservation_target_absent: true,
      lease_id_unique_in_snapshot: true,
      one_shot_lease_target_absent: true,
      one_shot_policy_exact: true,
      live_canary_contract_exact: true,
      operator_expect_new: command.operator_intent.expect_new,
      operator_live_canary_authorized: false,
      separate_operator_live_canary_required: true,
    },
    execution_boundary: {
      credential_source_opened: false,
      credential_or_token_read: false,
      authorization_header_materialized: false,
      replay_key_reserved_or_consumed: false,
      one_shot_lease_written: false,
      network_listener_creation: false,
      runtime_mount: false,
      endpoint_preflight_performed_by_gate: false,
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

export async function executeExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteV1(
  configValue: unknown,
  commandValue: unknown,
  dependencies:
    ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteDependenciesV1 =
      EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_DEFAULT_DEPENDENCIES_V1,
): Promise<
  ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteResultV1
> {
  const config =
    validateExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteConfigV1(
      configValue,
    );
  if (!config.enabled) return disabledResult();

  const command =
    validateExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteCommandV1(
      commandValue,
      config,
    );
  assertCondition(
    dependencies
      && typeof dependencies.repositoryRoot === "function"
      && typeof dependencies.loadPaidWorkClient === "function",
    "live-canary prerequisite dependencies are incomplete",
  );

  const repositoryRoot = realpathSync(dependencies.repositoryRoot());
  const outputDirectory = path.resolve(command.output_directory);
  for (const [label, pathname] of [
    ["execution plan", command.execution_plan_path],
    ["execution operator decision", command.execution_operator_decision_path],
    ["prepared request", command.request_path],
    ["credential source", command.credential_source_path],
    ["replay state directory", command.replay_state_directory],
    ["lease state directory", command.lease_state_directory],
    ["prerequisite output directory", outputDirectory],
  ] as const) {
    assertCondition(
      !isWithin(repositoryRoot, pathname),
      `${label} must remain outside the repository`,
    );
  }

  const executionPlanFile = readPrivateJsonFile(
    command.execution_plan_path,
    "execution candidate plan",
    config.max_execution_plan_bytes,
  );
  const executionDecisionFile = readPrivateJsonFile(
    command.execution_operator_decision_path,
    "execution candidate decision",
    config.max_operator_decision_bytes,
  );
  const candidate = parseExecutionCandidate(
    executionPlanFile,
    executionDecisionFile,
  );

  assertCondition(
    candidate.plan.operation_id
      === command.expected.execution_candidate_operation_id,
    "execution candidate operation ID does not match expectation",
  );
  assertCondition(
    candidate.plan.execution_candidate_id
      === command.expected.execution_candidate_id,
    "execution candidate ID does not match expectation",
  );
  assertCondition(
    candidate.plan.bindings.base_origin === command.expected.base_origin,
    "execution candidate base origin does not match expectation",
  );
  assertCondition(
    config.allowed_base_origins.includes(
      candidate.plan.bindings.base_origin,
    ),
    "execution candidate base origin is not allowlisted",
  );
  assertCondition(
    candidate.plan.bindings.endpoint_path
      === command.expected.endpoint_path
      && command.expected.endpoint_path === PAID_WORK_SUBMISSION_PATH,
    "execution candidate endpoint path does not match expectation",
  );
  assertCondition(
    config.allowed_endpoint_paths.includes(
      candidate.plan.bindings.endpoint_path,
    ),
    "execution candidate endpoint path is not allowlisted",
  );
  assertCondition(
    candidate.plan.bindings.submission_id
      === command.expected.submission_id,
    "execution candidate submission ID does not match expectation",
  );
  assertCondition(
    candidate.plan.bindings.work_order_id
      === command.expected.work_order_id,
    "execution candidate work-order ID does not match expectation",
  );
  assertCondition(
    candidate.plan.bindings.payload_sha256
      === command.expected.payload_sha256,
    "execution candidate payload SHA-256 does not match expectation",
  );
  assertCondition(
    candidate.plan.bindings.replay_key
      === command.expected.replay_key
      && command.replay_staging.expected_replay_key
        === command.expected.replay_key,
    "execution candidate replay key does not match expectation",
  );
  assertCondition(
    candidate.plan.bindings.credential_reference_id
      === command.expected.credential_reference_id,
    "execution candidate credential reference does not match expectation",
  );
  assertCondition(
    candidate.plan.credential_provider_contract.reference_id
      === command.credential_source.reference_id
      && candidate.plan.credential_provider_contract.source_locator_sha256
        === command.credential_source.source_locator_sha256
      && candidate.plan.credential_provider_contract.expected_scope
        === command.credential_source.expected_scope,
    "credential-source metadata does not match execution candidate",
  );
  assertCondition(
    command.endpoint_preflight.base_origin
      === command.expected.base_origin
      && command.endpoint_preflight.submission_path
        === command.expected.endpoint_path,
    "endpoint preflight does not match expected route",
  );

  validateFreshness(config, command, candidate.plan);

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
        === candidate.plan.bindings.payload_sha256
      && requestInspection.sha256
        === candidate.plan.source_artifacts.request_sha256,
    "prepared request digest mismatch",
  );
  assertCondition(
    requestInspection.submissionId === command.expected.submission_id
      && requestInspection.submissionId
        === candidate.plan.bindings.submission_id,
    "prepared request submission ID mismatch",
  );
  assertCondition(
    requestInspection.workOrderId === command.expected.work_order_id
      && requestInspection.workOrderId
        === candidate.plan.bindings.work_order_id,
    "prepared request work-order ID mismatch",
  );
  assertCondition(
    requestInspection.bytes.byteLength
      === candidate.plan.bindings.request_bytes,
    "prepared request byte count mismatch",
  );

  const credentialPath = path.resolve(command.credential_source_path);
  const credentialMetadata = lstatSync(credentialPath);
  assertCondition(
    credentialMetadata.isFile() && !credentialMetadata.isSymbolicLink(),
    "credential source must be a regular non-symlink file",
  );
  assertOwnerPrivate(
    credentialPath,
    credentialMetadata,
    "credential source",
  );
  assertCondition(
    (credentialMetadata.mode & 0o777) === command.credential_source.expected_mode,
    "credential source mode mismatch",
  );
  assertCondition(
    credentialMetadata.uid === command.credential_source.expected_uid,
    "credential source owner UID mismatch",
  );
  assertCondition(
    credentialMetadata.size
      >= command.credential_source.expected_min_bytes
      && credentialMetadata.size
        <= command.credential_source.expected_max_bytes,
    "credential source size outside expected bounds",
  );
  assertCondition(
    credentialMetadata.size <= config.max_credential_file_bytes,
    "credential source exceeds configured maximum",
  );
  const credentialPathSha256 = sha256Text(credentialPath);
  assertCondition(
    credentialPathSha256
      === command.credential_source.source_locator_sha256,
    "credential source path SHA-256 does not match source locator",
  );

  const replayDirectory = realpathSync(
    path.resolve(command.replay_state_directory),
  );
  const leaseDirectory = realpathSync(
    path.resolve(command.lease_state_directory),
  );
  assertPrivateDirectory(replayDirectory, "replay state directory");
  assertPrivateDirectory(leaseDirectory, "lease state directory");
  const replayReservationPath = path.join(
    replayDirectory,
    command.replay_staging.reservation_file_name,
  );
  const leasePath = path.join(
    leaseDirectory,
    command.lease_staging.lease_file_name,
  );
  assertCondition(
    replayReservationPath !== leasePath,
    "replay reservation and lease targets must differ",
  );
  assertCondition(
    !existsSync(replayReservationPath),
    "replay reservation target already exists",
  );
  assertCondition(
    !existsSync(leasePath),
    "one-shot lease target already exists",
  );
  assertCondition(
    !command.replay_staging.known_replay_keys.includes(
      command.replay_staging.expected_replay_key,
    ),
    "replay key is already present in supplied snapshot",
  );
  assertCondition(
    !command.lease_staging.known_lease_ids.includes(
      command.lease_staging.lease_id,
    ),
    "lease ID is already present in supplied snapshot",
  );

  const prerequisiteId = derivePrerequisiteId(
    command,
    executionPlanFile,
    executionDecisionFile,
    requestInspection.sha256,
    credentialPathSha256,
    replayReservationPath,
    leasePath,
  );
  if (command.operator_intent.expected_prerequisite_id !== null) {
    assertCondition(
      command.operator_intent.expected_prerequisite_id === prerequisiteId,
      "expected prerequisite ID mismatch",
    );
  }

  const plan = buildPlan(
    command,
    executionPlanFile,
    executionDecisionFile,
    candidate,
    requestInspection,
    prerequisiteId,
    credentialMetadata,
    credentialPath,
    replayDirectory,
    replayReservationPath,
    leaseDirectory,
    leasePath,
  );

  if (!command.apply) {
    return {
      marker:
        EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_RESULT_MARKER,
      version: 1,
      gate_id:
        EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_GATE_ID,
      status: "validated_in_memory",
      enabled: true,
      apply: false,
      operation_id: command.operation_id,
      confirmation_verified: false,
      prerequisite_id: prerequisiteId,
      plan,
      artifacts: {
        output_directory: null,
        prerequisite_plan_path: null,
        operator_decision_path: null,
        private_files_written: false,
      },
      authority: authority(false, false),
    };
  }

  assertCondition(
    command.operator_intent.expected_prerequisite_id === prerequisiteId,
    "apply requires the exact prerequisite ID",
  );
  assertCondition(
    !existsSync(outputDirectory),
    "prerequisite output directory already exists",
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
    assertPrivateDirectory(
      outputDirectory,
      "prerequisite output directory",
    );

    const planBody = `${JSON.stringify(plan, null, 2)}\n`;
    writeExclusivePrivateFile(planPath, planBody);
    const planSha256 = sha256Text(planBody);
    const decision:
      ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteOperatorDecisionV1 =
      {
        marker:
          EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_OPERATOR_DECISION_MARKER,
        version: 1,
        gate_id:
          EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_GATE_ID,
        operation_id: command.operation_id,
        decision: "hold_live_canary_not_executed",
        confirmation_verified: true,
        prerequisite_plan_sha256: planSha256,
        prerequisite_plan_path: planPath,
        prerequisite_id: prerequisiteId,
        execution_candidate_id: candidate.plan.execution_candidate_id,
        replay_key: command.replay_staging.expected_replay_key,
        lease_id: command.lease_staging.lease_id,
        credential_reference_id:
          command.credential_source.reference_id,
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
        "prerequisite artifact must be a regular non-symlink file",
      );
      assertOwnerPrivate(pathname, metadata, "prerequisite artifact");
    }

    return {
      marker:
        EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_RESULT_MARKER,
      version: 1,
      gate_id:
        EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_GATE_ID,
      status: "validated_and_written",
      enabled: true,
      apply: true,
      operation_id: command.operation_id,
      confirmation_verified: true,
      prerequisite_id: prerequisiteId,
      plan,
      artifacts: {
        output_directory: outputDirectory,
        prerequisite_plan_path: planPath,
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
