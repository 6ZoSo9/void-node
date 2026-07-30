import { createHash } from "node:crypto";
import {
  chmodSync,
  closeSync,
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
  EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_GATE_ID,
  EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_OPERATOR_DECISION_MARKER,
  EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_PLAN_MARKER,
  type ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteOperatorDecisionV1,
  type ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisitePlanV1,
} from "./external_agent_paid_work_operator_controlled_authenticated_submission_live_canary_prerequisite_v1.js";
import {
  LIVE_CANARY_CONFIRMATION,
  LIVE_CANARY_RELATIVE_PATH,
} from "./external_agent_paid_work_authenticated_submission_execution_candidate_v1.js";
import {
  PAID_WORK_SUBMISSION_PATH,
  REQUIRED_CONTENT_TYPE,
} from "./external_agent_paid_work_authenticated_submission_activation_prerequisite_v1.js";

export const EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_CONFIG_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_CONFIG_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_COMMAND_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_COMMAND_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_RESULT_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_RESULT_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_INTENT_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_INTENT_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_TERMINAL_RECEIPT_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_TERMINAL_RECEIPT_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_ATTEMPT_BEGIN_RECEIPT_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_ATTEMPT_BEGIN_RECEIPT_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_ATTEMPT_FINALIZATION_RECEIPT_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_ATTEMPT_FINALIZATION_RECEIPT_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_CREDENTIAL_SESSION_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_CREDENTIAL_SESSION_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_CREDENTIAL_CLOSE_RECEIPT_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_CREDENTIAL_CLOSE_RECEIPT_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_TRANSPORT_RESPONSE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_TRANSPORT_RESPONSE_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_EXAMPLE_MARKER =
  "VOID_EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_EXAMPLE_V1" as const;
export const EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_VERSION =
  1 as const;
export const EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_GATE_ID =
  "void.external-agent-paid-work-operator-controlled-authenticated-submission-live-canary.v1" as const;
export const EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_CONFIRMATION =
  LIVE_CANARY_CONFIRMATION;

const PAID_WORK_CLIENT_RELATIVE_PATH =
  "tools/void-ai-agent-paid-work-client-v1.mjs" as const;
const INTENT_FILE_SUFFIX = "operator-controlled-authenticated-submission-live-canary-intent-v1.json";
const TERMINAL_RECEIPT_FILE_SUFFIX = "operator-controlled-authenticated-submission-live-canary-terminal-receipt-v1.json";
const SHA256 = /^[0-9a-f]{64}$/u;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,179}$/u;
const ISO_UTC_SECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;
const RECEIPT_ID = /^voidawsi1_[0-9a-f]{64}$/u;

export interface ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryConfigV1 {
  marker: typeof EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_CONFIG_MARKER;
  version: typeof EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_VERSION;
  enabled: boolean;
  live_execution_enabled: boolean;
  allowed_base_origins: string[];
  allowed_endpoint_paths: string[];
  max_prerequisite_plan_bytes: number;
  max_operator_decision_bytes: number;
  max_request_bytes: number;
  max_execution_window_seconds: number;
  min_remaining_prerequisite_ttl_seconds: number;
  max_clock_skew_seconds: number;
  max_credential_file_bytes: number;
  max_http_timeout_ms: number;
  max_response_bytes: number;
}

export interface ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryCommandV1 {
  marker: typeof EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_COMMAND_MARKER;
  version: typeof EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_VERSION;
  execute: boolean;
  allow_live_submit: boolean;
  confirmation: string;
  operation_id: string;
  evaluated_at_utc: string;
  execution_expires_at_utc: string;
  prerequisite_plan_path: string;
  prerequisite_operator_decision_path: string;
  request_path: string;
  credential_source_path: string;
  output_directory: string;
  expected: {
    prerequisite_operation_id: string;
    prerequisite_id: string;
    execution_candidate_id: string;
    base_origin: string;
    endpoint_path: typeof PAID_WORK_SUBMISSION_PATH;
    submission_id: string;
    work_order_id: string;
    payload_sha256: string;
    replay_key: string;
    lease_id: string;
    credential_reference_id: string;
  };
  operator_intent: {
    expect_new: true;
    expected_live_canary_id: string | null;
    confirmation_expires_at_utc: string;
    maximum_attempt_count: 1;
    automatic_retry: false;
    no_automatic_retry_after_ambiguous_outcome: true;
  };
}

export type ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryTerminalOutcomeV1 =
  | "accepted_new"
  | "accepted_duplicate"
  | "rejected_conflicting_duplicate"
  | "rejected_unauthorized"
  | "rejected_http"
  | "held_pre_submit_failure"
  | "held_ambiguous_manual_reconciliation";

export interface ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryAttemptBeginReceiptV1 {
  marker: typeof EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_ATTEMPT_BEGIN_RECEIPT_MARKER;
  version: 1;
  attempt_id: string;
  live_canary_id: string;
  replay_key: string;
  replay_reservation_path: string;
  lease_id: string;
  lease_path: string;
  acquired_at_utc: string;
  replay_reserved: true;
  lease_written: true;
  exclusive_create: true;
  attempt_count: 1;
  automatic_retry: false;
}

export interface ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryAttemptFinalizationReceiptV1 {
  marker: typeof EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_ATTEMPT_FINALIZATION_RECEIPT_MARKER;
  version: 1;
  attempt_id: string;
  live_canary_id: string;
  outcome: "accepted" | "duplicate" | "rejected" | "ambiguous_hold";
  finalized_at_utc: string;
  replay_state_terminal: true;
  lease_state_terminal: true;
  automatic_retry: false;
}

export interface ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryCredentialSessionV1 {
  marker: typeof EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_CREDENTIAL_SESSION_MARKER;
  version: 1;
  handle_id: string;
  reference_id: string;
  scope: string;
  source_locator_sha256: string;
  opened_at_utc: string;
  credential_read: true;
  secret_material_exposed_to_runner: false;
}

export interface ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryCredentialCloseReceiptV1 {
  marker: typeof EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_CREDENTIAL_CLOSE_RECEIPT_MARKER;
  version: 1;
  handle_id: string;
  closed_at_utc: string;
  closed: true;
  zeroized: true;
}

export interface ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryTransportResponseV1 {
  marker: typeof EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_TRANSPORT_RESPONSE_MARKER;
  version: 1;
  attempt_id: string;
  request_sent: true;
  response_received: boolean;
  ambiguous_outcome: boolean;
  http_status: number | null;
  route_header: string | null;
  response_body: unknown | null;
  response_bytes: number;
  credential_read: true;
  authorization_header_materialized: true;
  redirects_followed: false;
  automatic_retry: false;
  attempt_count: 1;
  completed_at_utc: string;
}

export interface ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryDependenciesV1 {
  repositoryRoot: () => string;
  loadPaidWorkClient: () => Promise<{
    normalizePaidWorkBaseUrlV1: (raw: string) => URL;
    readPaidWorkSubmissionRequestV1: (rawPath: string) => {
      bytes: Uint8Array;
      value: unknown;
      submissionId: string;
      workOrderId: string;
      sha256: string;
    };
  }>;
  beginAttempt: (input: {
    live_canary_id: string;
    operation_id: string;
    replay_key: string;
    replay_reservation_path: string;
    lease_id: string;
    lease_path: string;
    evaluated_at_utc: string;
    expires_at_utc: string;
  }) => Promise<ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryAttemptBeginReceiptV1>;
  finalizeAttempt: (input: {
    begin_receipt: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryAttemptBeginReceiptV1;
    outcome: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryAttemptFinalizationReceiptV1["outcome"];
    terminal_receipt_sha256: string | null;
  }) => Promise<ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryAttemptFinalizationReceiptV1>;
  openCredentialOnce: (input: {
    live_canary_id: string;
    reference_id: string;
    source_path: string;
    source_locator_sha256: string;
    expected_scope: string;
  }) => Promise<ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryCredentialSessionV1>;
  closeCredential: (session: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryCredentialSessionV1) => Promise<ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryCredentialCloseReceiptV1>;
  submitOnce: (input: {
    live_canary_id: string;
    attempt_id: string;
    base_origin: string;
    endpoint_path: typeof PAID_WORK_SUBMISSION_PATH;
    method: "POST";
    content_type: typeof REQUIRED_CONTENT_TYPE;
    request_bytes: Uint8Array;
    payload_sha256: string;
    submission_id: string;
    work_order_id: string;
    credential_handle_id: string;
    timeout_ms: number;
    max_response_bytes: number;
    redirect_mode: "manual";
    automatic_retry: false;
    maximum_attempt_count: 1;
  }) => Promise<ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryTransportResponseV1>;
}

export interface ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryAuthorityV1 {
  local_private_intent_write: boolean;
  local_private_terminal_receipt_write: boolean;
  credential_provider_invocation: boolean;
  credential_or_token_read: boolean;
  authorization_header_materialized: boolean;
  replay_key_reservation_or_consumption: boolean;
  one_shot_lease_write: boolean;
  external_http_submission: boolean;
  authenticated_submission_post: boolean;
  network_listener_creation: false;
  runtime_mount: false;
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

export interface ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryIntentV1 {
  marker: typeof EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_INTENT_MARKER;
  version: 1;
  gate_id: typeof EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_GATE_ID;
  operation_id: string;
  live_canary_id: string;
  generated_at_utc: string;
  expires_at_utc: string;
  prerequisite_id: string;
  execution_candidate_id: string;
  bindings: {
    base_origin: string;
    endpoint_path: typeof PAID_WORK_SUBMISSION_PATH;
    method: "POST";
    content_type: typeof REQUIRED_CONTENT_TYPE;
    submission_id: string;
    work_order_id: string;
    payload_sha256: string;
    request_bytes: number;
    replay_key: string;
    lease_id: string;
    credential_reference_id: string;
    credential_scope: string;
    credential_source_locator_sha256: string;
  };
  state_contract: {
    replay_reservation_path_sha256: string;
    lease_path_sha256: string;
    exclusive_create: true;
    maximum_attempt_count: 1;
    automatic_retry: false;
  };
  http_contract: {
    timeout_ms: number;
    max_response_bytes: number;
    redirect_mode: "manual";
    automatic_retry: false;
    maximum_attempt_count: 1;
    ambiguous_outcome_policy: "hold_manual_reconciliation_no_retry";
  };
  safety: {
    credential_path_disclosed: false;
    token_or_credential_bytes_in_artifact: false;
    cookies_sent: false;
    redirects_followed: false;
    automatic_retry: false;
  };
}

export interface ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryTerminalReceiptV1 {
  marker: typeof EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_TERMINAL_RECEIPT_MARKER;
  version: 1;
  gate_id: typeof EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_GATE_ID;
  operation_id: string;
  live_canary_id: string;
  outcome: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryTerminalOutcomeV1;
  completed_at_utc: string;
  prerequisite_id: string;
  execution_candidate_id: string;
  submission_id: string;
  work_order_id: string;
  request_sha256: string;
  replay_key: string;
  lease_id: string;
  credential_reference_id: string;
  attempt_id: string | null;
  http_status: number | null;
  receipt_id: string | null;
  duplicate: boolean;
  accepted_for_review: boolean;
  successful_authentication: boolean;
  response_received: boolean;
  ambiguous_outcome: boolean;
  sanitized_reason_code: string | null;
  maximum_attempt_count: 1;
  submission_attempt_count: 0 | 1;
  automatic_retry: false;
  manual_reconciliation_required: boolean;
  state_finalized: boolean;
  credential_closed_and_zeroized: boolean;
  payment_executed: false;
  paid_work_execution_started: false;
  work_dispatched: false;
  work_credit_awarded: false;
  work_credit_ledger_written: false;
  void_settled: false;
  wallet_or_signer_access: false;
  transaction_broadcast: false;
  runtime_mutation: false;
  deployment: false;
  authority: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryAuthorityV1;
}

export interface ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryResultV1 {
  marker: typeof EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_RESULT_MARKER;
  version: 1;
  gate_id: typeof EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_GATE_ID;
  status:
    | "disabled"
    | "validated_in_memory"
    | "accepted_new"
    | "accepted_duplicate"
    | "held_rejected"
    | "held_ambiguous";
  enabled: boolean;
  live_execution_enabled: boolean;
  execute: boolean;
  operation_id: string | null;
  live_canary_id: string | null;
  confirmation_verified: boolean;
  terminal_receipt: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryTerminalReceiptV1 | null;
  artifacts: {
    output_directory: string | null;
    intent_path: string | null;
    terminal_receipt_path: string | null;
    private_files_written: boolean;
  };
  authority: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryAuthorityV1;
}

type PrivateJsonFile = Readonly<{
  path: string;
  bytes: Buffer;
  sha256: string;
  value: unknown;
}>;

type RequestInspection = Readonly<{
  bytes: Uint8Array;
  value: unknown;
  submissionId: string;
  workOrderId: string;
  sha256: string;
}>;

type ParsedPrerequisite = Readonly<{
  planFile: PrivateJsonFile;
  decisionFile: PrivateJsonFile;
  plan: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisitePlanV1;
  decision: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteOperatorDecisionV1;
}>;

function fail(message: string): never {
  throw new Error(message);
}

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  assertCondition(isRecord(value), `${label} must be an object`);
  return value;
}

function requireExactKeys(record: Record<string, unknown>, keys: readonly string[], label: string): void {
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  assertCondition(JSON.stringify(actual) === JSON.stringify(expected), `${label} keys mismatch`);
}

function requireString(value: unknown, label: string, minimum = 1, maximum = 4096): string {
  assertCondition(typeof value === "string", `${label} must be a string`);
  assertCondition(value === value.trim(), `${label} must be trimmed`);
  assertCondition(value.length >= minimum && value.length <= maximum, `${label} length is invalid`);
  return value;
}

function requireBoolean(value: unknown, label: string): boolean {
  assertCondition(typeof value === "boolean", `${label} must be boolean`);
  return value;
}

function requireInteger(value: unknown, label: string, minimum: number, maximum: number): number {
  assertCondition(Number.isInteger(value), `${label} must be an integer`);
  const output = value as number;
  assertCondition(output >= minimum && output <= maximum, `${label} is outside range`);
  return output;
}

function requireId(value: unknown, label: string): string {
  const output = requireString(value, label, 3, 180);
  assertCondition(ID.test(output), `${label} contains unsupported characters`);
  return output;
}

function requireSha256(value: unknown, label: string): string {
  const output = requireString(value, label, 64, 64);
  assertCondition(SHA256.test(output), `${label} must be lowercase SHA-256`);
  return output;
}

function requireIsoUtc(value: unknown, label: string): string {
  const output = requireString(value, label, 20, 20);
  assertCondition(ISO_UTC_SECONDS.test(output) && Number.isFinite(Date.parse(output)), `${label} must be UTC seconds`);
  return output;
}

function requireStringArray(value: unknown, label: string, maximum: number): string[] {
  assertCondition(Array.isArray(value), `${label} must be an array`);
  assertCondition(value.length >= 1 && value.length <= maximum, `${label} item count is invalid`);
  const output = value.map((entry, index) => requireString(entry, `${label}[${index}]`, 1, 2048));
  assertCondition(new Set(output).size === output.length, `${label} must contain unique values`);
  return output;
}

function canonicalJson(value: unknown): string {
  const normalize = (entry: unknown): unknown => {
    if (Array.isArray(entry)) return entry.map(normalize);
    if (isRecord(entry)) {
      return Object.fromEntries(Object.keys(entry).sort().map((key) => [key, normalize(entry[key])]));
    }
    assertCondition(entry === null || ["string", "number", "boolean"].includes(typeof entry), "non-JSON value");
    return entry;
  };
  return JSON.stringify(normalize(value));
}

function sha256(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function isWithin(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function assertOwnerPrivate(pathname: string, metadata: Stats, label: string): void {
  if (process.platform !== "win32") {
    assertCondition((metadata.mode & 0o077) === 0, `${label} must not grant group or other permissions: ${pathname}`);
  }
}

function assertPrivateDirectory(pathname: string, label: string): void {
  const metadata = lstatSync(pathname);
  assertCondition(metadata.isDirectory() && !metadata.isSymbolicLink(), `${label} must be a non-symlink directory`);
  assertOwnerPrivate(pathname, metadata, label);
}

function readPrivateJsonFile(rawPath: string, label: string, maximumBytes: number): PrivateJsonFile {
  const resolved = path.resolve(rawPath);
  const metadata = lstatSync(resolved);
  assertCondition(metadata.isFile() && !metadata.isSymbolicLink(), `${label} must be a regular non-symlink file`);
  assertCondition(metadata.size >= 2 && metadata.size <= maximumBytes, `${label} size is invalid`);
  assertOwnerPrivate(resolved, metadata, label);
  const bytes = readFileSync(resolved);
  let value: unknown;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail(`${label} must contain valid JSON`);
  }
  return { path: resolved, bytes, sha256: sha256(bytes), value };
}

function writeExclusivePrivateFile(pathname: string, body: string): void {
  const descriptor = openSync(pathname, "wx", 0o600);
  try {
    writeFileSync(descriptor, body, { encoding: "utf8" });
  } finally {
    closeSync(descriptor);
  }
  chmodSync(pathname, 0o600);
}

function normalizeBaseOrigin(raw: unknown, label: string): string {
  const value = new URL(requireString(raw, label, 8, 2048));
  assertCondition(!value.username && !value.password && !value.search && !value.hash, `${label} credentials/query/fragment are forbidden`);
  const loopback = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(value.hostname.toLowerCase());
  assertCondition(value.protocol === "https:" || (value.protocol === "http:" && loopback), `${label} must use HTTPS or loopback HTTP`);
  return value.origin;
}

function normalizeEndpointPath(raw: unknown, label: string): typeof PAID_WORK_SUBMISSION_PATH {
  const value = requireString(raw, label, 1, 512);
  assertCondition(value === PAID_WORK_SUBMISSION_PATH, `${label} must be ${PAID_WORK_SUBMISSION_PATH}`);
  return PAID_WORK_SUBMISSION_PATH;
}

function allValuesBoolean(record: Record<string, unknown>): boolean {
  return Object.keys(record).length > 0 && Object.values(record).every((value) => typeof value === "boolean");
}

function requireAllTrue(record: Record<string, unknown>, label: string): void {
  assertCondition(allValuesBoolean(record), `${label} must contain booleans`);
  for (const [key, value] of Object.entries(record)) {
    assertCondition(value === true, `${label}.${key} must be true`);
  }
}

function requireAllFalseExceptLocalWrites(record: Record<string, unknown>, label: string): void {
  assertCondition(allValuesBoolean(record), `${label} must contain booleans`);
  for (const [key, value] of Object.entries(record)) {
    if (key === "local_private_plan_write" || key === "local_private_decision_write") {
      assertCondition(value === true, `${label}.${key} must be true`);
    } else {
      assertCondition(value === false, `${label}.${key} must be false`);
    }
  }
}

function requireAllFalse(record: Record<string, unknown>, label: string): void {
  assertCondition(allValuesBoolean(record), `${label} must contain booleans`);
  for (const [key, value] of Object.entries(record)) {
    assertCondition(value === false, `${label}.${key} must be false`);
  }
}

function parsePrerequisite(planFile: PrivateJsonFile, decisionFile: PrivateJsonFile): ParsedPrerequisite {
  const plan = requireRecord(planFile.value, "prerequisite plan");
  assertCondition(plan.marker === EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_PLAN_MARKER, "prerequisite plan marker mismatch");
  assertCondition(plan.version === 1, "prerequisite plan version mismatch");
  assertCondition(plan.gate_id === EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_GATE_ID, "prerequisite plan gate mismatch");
  assertCondition(plan.status === "live_canary_prerequisites_validated_hold_execution", "prerequisite plan status mismatch");

  const sourceArtifacts = requireRecord(plan.source_artifacts, "prerequisite source artifacts");
  const bindings = requireRecord(plan.bindings, "prerequisite bindings");
  const credential = requireRecord(plan.credential_source_inspection, "credential inspection");
  const replay = requireRecord(plan.replay_staging, "replay staging");
  const lease = requireRecord(plan.one_shot_lease_staging, "lease staging");
  const operator = requireRecord(plan.operator_control, "operator control");
  const canary = requireRecord(plan.live_canary_contract, "live canary contract");
  const response = requireRecord(plan.terminal_receipt_contract, "terminal receipt contract");
  const gates = requireRecord(plan.gates, "prerequisite gates");
  const boundary = requireRecord(plan.execution_boundary, "prerequisite execution boundary");

  requireAllTrue(Object.fromEntries(Object.entries(gates).filter(([key]) => !["operator_expect_new", "operator_live_canary_authorized"].includes(key))), "prerequisite gates");
  assertCondition(gates.operator_expect_new === true, "prerequisite must expect a new submission");
  assertCondition(gates.operator_live_canary_authorized === false, "prerequisite must not authorize live canary");
  requireAllFalse(Object.fromEntries(Object.entries(boundary).filter(([key]) => key !== "separate_operator_live_canary_required")), "prerequisite execution boundary");
  assertCondition(boundary.separate_operator_live_canary_required === true, "separate live canary boundary is required");

  assertCondition(credential.regular_file === true && credential.symlink === false, "credential metadata boundary mismatch");
  assertCondition(credential.opened === false && credential.bytes_read === 0, "prerequisite opened credential source");
  assertCondition(replay.strategy === "exclusive_create" && replay.target_absent === true && replay.reservation_written === false && replay.reservation_consumed === false, "replay staging contract mismatch");
  assertCondition(lease.strategy === "exclusive_create" && lease.maximum_attempt_count === 1 && lease.automatic_retry === false && lease.target_absent === true && lease.lease_written === false && lease.attempt_count === 0, "lease staging contract mismatch");
  assertCondition(operator.live_execute_confirmation === LIVE_CANARY_CONFIRMATION && operator.allow_live_submit_flag_required === true && operator.live_canary_authorized === false && operator.separate_operator_live_canary_required === true, "operator control contract mismatch");
  assertCondition(canary.tool_relative_path === LIVE_CANARY_RELATIVE_PATH && canary.execute_confirmation === LIVE_CANARY_CONFIRMATION && canary.maximum_attempt_count === 1 && canary.automatic_retry === false && canary.ambiguous_outcome_policy === "hold_manual_reconciliation_no_retry", "live canary contract mismatch");
  assertCondition(response.accepted_new_status === 202 && response.accepted_duplicate_status === 200 && response.conflicting_duplicate_status === 409 && response.require_authorization_verified === true && response.require_accepted_for_review === true && response.require_submission_id_binding === true && response.require_work_order_id_binding === true && response.require_request_sha256_binding === true && response.sanitized_receipt_only === true && response.ambiguous_outcome_policy === "hold_manual_reconciliation_no_retry", "terminal receipt contract mismatch");
  assertCondition(bindings.method === "POST" && bindings.content_type === REQUIRED_CONTENT_TYPE && bindings.endpoint_path === PAID_WORK_SUBMISSION_PATH, "prerequisite HTTP binding mismatch");
  assertCondition(sourceArtifacts.request_sha256 === bindings.payload_sha256, "prerequisite request digest binding mismatch");

  const decision = requireRecord(decisionFile.value, "prerequisite decision");
  assertCondition(decision.marker === EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_OPERATOR_DECISION_MARKER, "prerequisite decision marker mismatch");
  assertCondition(decision.version === 1 && decision.gate_id === EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PREREQUISITE_GATE_ID, "prerequisite decision identity mismatch");
  assertCondition(decision.decision === "hold_live_canary_not_executed" && decision.confirmation_verified === true, "prerequisite decision must remain hold");
  assertCondition(decision.prerequisite_plan_sha256 === planFile.sha256 && path.resolve(requireString(decision.prerequisite_plan_path, "decision plan path")) === planFile.path, "prerequisite decision plan binding mismatch");
  assertCondition(decision.operation_id === plan.operation_id && decision.prerequisite_id === plan.prerequisite_id && decision.execution_candidate_id === bindings.execution_candidate_id && decision.replay_key === bindings.replay_key && decision.lease_id === lease.lease_id && decision.credential_reference_id === bindings.credential_reference_id, "prerequisite decision binding mismatch");
  requireAllFalseExceptLocalWrites(requireRecord(decision.authority, "prerequisite decision authority"), "prerequisite decision authority");

  return {
    planFile,
    decisionFile,
    plan: plan as unknown as ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisitePlanV1,
    decision: decision as unknown as ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisiteOperatorDecisionV1,
  };
}

function authority(values: Partial<ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryAuthorityV1> = {}): ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryAuthorityV1 {
  return {
    local_private_intent_write: false,
    local_private_terminal_receipt_write: false,
    credential_provider_invocation: false,
    credential_or_token_read: false,
    authorization_header_materialized: false,
    replay_key_reservation_or_consumption: false,
    one_shot_lease_write: false,
    external_http_submission: false,
    authenticated_submission_post: false,
    network_listener_creation: false,
    runtime_mount: false,
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
    ...values,
  };
}

function safeReason(error: unknown): string {
  if (isRecord(error) && typeof error.code === "string" && ID.test(error.code)) return error.code;
  if (error instanceof Error) {
    const normalized = error.message.toLowerCase();
    if (normalized.includes("credential")) return "credential_provider_failure";
    if (normalized.includes("replay") || normalized.includes("lease") || normalized.includes("attempt")) return "attempt_state_failure";
    if (normalized.includes("timeout") || normalized.includes("abort")) return "transport_timeout_or_abort";
    if (normalized.includes("redirect")) return "redirect_forbidden";
    if (normalized.includes("unauthorized")) return "unauthorized";
    if (normalized.includes("response")) return "response_validation_failure";
  }
  return "live_canary_dependency_failure";
}

function validateConfig(raw: unknown): ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryConfigV1 {
  const value = requireRecord(raw, "config");
  requireExactKeys(value, [
    "marker", "version", "enabled", "live_execution_enabled", "allowed_base_origins", "allowed_endpoint_paths",
    "max_prerequisite_plan_bytes", "max_operator_decision_bytes", "max_request_bytes", "max_execution_window_seconds",
    "min_remaining_prerequisite_ttl_seconds", "max_clock_skew_seconds", "max_credential_file_bytes", "max_http_timeout_ms",
    "max_response_bytes",
  ], "config");
  assertCondition(value.marker === EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_CONFIG_MARKER, "config marker mismatch");
  assertCondition(value.version === 1, "config version mismatch");
  const origins = requireStringArray(value.allowed_base_origins, "allowed base origins", 32).map((entry) => normalizeBaseOrigin(entry, "allowed base origin"));
  const endpoints = requireStringArray(value.allowed_endpoint_paths, "allowed endpoint paths", 16).map((entry) => normalizeEndpointPath(entry, "allowed endpoint path"));
  return {
    marker: EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_CONFIG_MARKER,
    version: 1,
    enabled: requireBoolean(value.enabled, "config.enabled"),
    live_execution_enabled: requireBoolean(value.live_execution_enabled, "config.live_execution_enabled"),
    allowed_base_origins: origins,
    allowed_endpoint_paths: endpoints,
    max_prerequisite_plan_bytes: requireInteger(value.max_prerequisite_plan_bytes, "max_prerequisite_plan_bytes", 1024, 16_777_216),
    max_operator_decision_bytes: requireInteger(value.max_operator_decision_bytes, "max_operator_decision_bytes", 512, 4_194_304),
    max_request_bytes: requireInteger(value.max_request_bytes, "max_request_bytes", 1024, 1_048_576),
    max_execution_window_seconds: requireInteger(value.max_execution_window_seconds, "max_execution_window_seconds", 30, 3600),
    min_remaining_prerequisite_ttl_seconds: requireInteger(value.min_remaining_prerequisite_ttl_seconds, "min_remaining_prerequisite_ttl_seconds", 1, 3600),
    max_clock_skew_seconds: requireInteger(value.max_clock_skew_seconds, "max_clock_skew_seconds", 0, 300),
    max_credential_file_bytes: requireInteger(value.max_credential_file_bytes, "max_credential_file_bytes", 8, 65_536),
    max_http_timeout_ms: requireInteger(value.max_http_timeout_ms, "max_http_timeout_ms", 100, 120_000),
    max_response_bytes: requireInteger(value.max_response_bytes, "max_response_bytes", 1024, 4_194_304),
  };
}

function validateCommand(raw: unknown): ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryCommandV1 {
  const value = requireRecord(raw, "command");
  requireExactKeys(value, [
    "marker", "version", "execute", "allow_live_submit", "confirmation", "operation_id", "evaluated_at_utc",
    "execution_expires_at_utc", "prerequisite_plan_path", "prerequisite_operator_decision_path", "request_path",
    "credential_source_path", "output_directory", "expected", "operator_intent",
  ], "command");
  assertCondition(value.marker === EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_COMMAND_MARKER, "command marker mismatch");
  assertCondition(value.version === 1, "command version mismatch");
  const expected = requireRecord(value.expected, "command.expected");
  requireExactKeys(expected, [
    "prerequisite_operation_id", "prerequisite_id", "execution_candidate_id", "base_origin", "endpoint_path", "submission_id",
    "work_order_id", "payload_sha256", "replay_key", "lease_id", "credential_reference_id",
  ], "command.expected");
  const intent = requireRecord(value.operator_intent, "command.operator_intent");
  requireExactKeys(intent, [
    "expect_new", "expected_live_canary_id", "confirmation_expires_at_utc", "maximum_attempt_count", "automatic_retry",
    "no_automatic_retry_after_ambiguous_outcome",
  ], "command.operator_intent");
  assertCondition(intent.expect_new === true, "live canary requires expect_new=true");
  assertCondition(intent.maximum_attempt_count === 1 && intent.automatic_retry === false && intent.no_automatic_retry_after_ambiguous_outcome === true, "one-shot operator policy mismatch");
  const expectedLiveCanaryId = intent.expected_live_canary_id === null ? null : requireSha256(intent.expected_live_canary_id, "expected live canary ID");
  return {
    marker: EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_COMMAND_MARKER,
    version: 1,
    execute: requireBoolean(value.execute, "command.execute"),
    allow_live_submit: requireBoolean(value.allow_live_submit, "command.allow_live_submit"),
    confirmation: requireString(value.confirmation, "command.confirmation", 0, 256),
    operation_id: requireId(value.operation_id, "command.operation_id"),
    evaluated_at_utc: requireIsoUtc(value.evaluated_at_utc, "command.evaluated_at_utc"),
    execution_expires_at_utc: requireIsoUtc(value.execution_expires_at_utc, "command.execution_expires_at_utc"),
    prerequisite_plan_path: requireString(value.prerequisite_plan_path, "prerequisite_plan_path", 1, 4096),
    prerequisite_operator_decision_path: requireString(value.prerequisite_operator_decision_path, "prerequisite_operator_decision_path", 1, 4096),
    request_path: requireString(value.request_path, "request_path", 1, 4096),
    credential_source_path: requireString(value.credential_source_path, "credential_source_path", 1, 4096),
    output_directory: requireString(value.output_directory, "output_directory", 1, 4096),
    expected: {
      prerequisite_operation_id: requireId(expected.prerequisite_operation_id, "expected prerequisite operation ID"),
      prerequisite_id: requireSha256(expected.prerequisite_id, "expected prerequisite ID"),
      execution_candidate_id: requireSha256(expected.execution_candidate_id, "expected execution candidate ID"),
      base_origin: normalizeBaseOrigin(expected.base_origin, "expected base origin"),
      endpoint_path: normalizeEndpointPath(expected.endpoint_path, "expected endpoint path"),
      submission_id: requireId(expected.submission_id, "expected submission ID"),
      work_order_id: requireString(expected.work_order_id, "expected work-order ID", 73, 73),
      payload_sha256: requireSha256(expected.payload_sha256, "expected payload SHA-256"),
      replay_key: requireSha256(expected.replay_key, "expected replay key"),
      lease_id: requireId(expected.lease_id, "expected lease ID"),
      credential_reference_id: requireId(expected.credential_reference_id, "expected credential reference ID"),
    },
    operator_intent: {
      expect_new: true,
      expected_live_canary_id: expectedLiveCanaryId,
      confirmation_expires_at_utc: requireIsoUtc(intent.confirmation_expires_at_utc, "confirmation_expires_at_utc"),
      maximum_attempt_count: 1,
      automatic_retry: false,
      no_automatic_retry_after_ambiguous_outcome: true,
    },
  };
}

function deriveLiveCanaryId(command: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryCommandV1, plan: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisitePlanV1, requestSha256: string): string {
  return sha256(canonicalJson({
    marker: EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_MARKER,
    version: 1,
    operation_id: command.operation_id,
    prerequisite_id: plan.prerequisite_id,
    execution_candidate_id: plan.bindings.execution_candidate_id,
    submission_id: plan.bindings.submission_id,
    work_order_id: plan.bindings.work_order_id,
    payload_sha256: requestSha256,
    replay_key: plan.bindings.replay_key,
    lease_id: plan.one_shot_lease_staging.lease_id,
    credential_reference_id: plan.bindings.credential_reference_id,
    confirmation_expires_at_utc: command.operator_intent.confirmation_expires_at_utc,
  }));
}

function validateFreshness(config: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryConfigV1, command: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryCommandV1, plan: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisitePlanV1): void {
  const evaluated = Date.parse(command.evaluated_at_utc);
  const executionExpires = Date.parse(command.execution_expires_at_utc);
  const confirmationExpires = Date.parse(command.operator_intent.confirmation_expires_at_utc);
  const prerequisiteGenerated = Date.parse(plan.generated_at_utc);
  const prerequisiteExpires = Date.parse(plan.expires_at_utc);
  const skew = config.max_clock_skew_seconds * 1000;
  assertCondition(prerequisiteGenerated <= evaluated + skew, "prerequisite generated_at is too far in the future");
  assertCondition(prerequisiteExpires >= evaluated + config.min_remaining_prerequisite_ttl_seconds * 1000, "prerequisite does not retain enough TTL");
  assertCondition(executionExpires > evaluated && executionExpires <= evaluated + config.max_execution_window_seconds * 1000, "execution window is invalid");
  assertCondition(executionExpires <= prerequisiteExpires, "execution exceeds prerequisite expiry");
  assertCondition(confirmationExpires >= executionExpires && confirmationExpires <= prerequisiteExpires, "confirmation expiry must cover execution and remain within prerequisite expiry");
}

function validateBeginReceipt(receipt: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryAttemptBeginReceiptV1, liveCanaryId: string, plan: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisitePlanV1): void {
  assertCondition(receipt.marker === EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_ATTEMPT_BEGIN_RECEIPT_MARKER && receipt.version === 1, "attempt begin receipt identity mismatch");
  requireId(receipt.attempt_id, "attempt ID");
  assertCondition(receipt.live_canary_id === liveCanaryId && receipt.replay_key === plan.bindings.replay_key && path.resolve(receipt.replay_reservation_path) === path.resolve(plan.replay_staging.reservation_path) && receipt.lease_id === plan.one_shot_lease_staging.lease_id && path.resolve(receipt.lease_path) === path.resolve(plan.one_shot_lease_staging.lease_path), "attempt begin receipt binding mismatch");
  requireIsoUtc(receipt.acquired_at_utc, "attempt acquired_at_utc");
  assertCondition(receipt.replay_reserved === true && receipt.lease_written === true && receipt.exclusive_create === true && receipt.attempt_count === 1 && receipt.automatic_retry === false, "attempt begin receipt policy mismatch");
  for (const [pathname, label] of [[receipt.replay_reservation_path, "replay reservation"], [receipt.lease_path, "one-shot lease"]] as const) {
    const metadata = lstatSync(path.resolve(pathname));
    assertCondition(metadata.isFile() && !metadata.isSymbolicLink(), `${label} must be a regular non-symlink file`);
    assertOwnerPrivate(path.resolve(pathname), metadata, label);
  }
}

function validateCredentialSession(session: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryCredentialSessionV1, plan: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisitePlanV1): void {
  assertCondition(session.marker === EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_CREDENTIAL_SESSION_MARKER && session.version === 1, "credential session identity mismatch");
  requireId(session.handle_id, "credential handle ID");
  assertCondition(session.reference_id === plan.bindings.credential_reference_id && session.scope === plan.credential_source_inspection.expected_scope && session.source_locator_sha256 === plan.credential_source_inspection.source_locator_sha256, "credential session binding mismatch");
  requireIsoUtc(session.opened_at_utc, "credential opened_at_utc");
  assertCondition(session.credential_read === true && session.secret_material_exposed_to_runner === false, "credential session safety mismatch");
}

function validateCredentialClose(receipt: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryCredentialCloseReceiptV1, handleId: string): void {
  assertCondition(receipt.marker === EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_CREDENTIAL_CLOSE_RECEIPT_MARKER && receipt.version === 1 && receipt.handle_id === handleId, "credential close receipt mismatch");
  requireIsoUtc(receipt.closed_at_utc, "credential closed_at_utc");
  assertCondition(receipt.closed === true && receipt.zeroized === true, "credential was not closed and zeroized");
}

function validateFinalization(receipt: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryAttemptFinalizationReceiptV1, begin: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryAttemptBeginReceiptV1, liveCanaryId: string, outcome: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryAttemptFinalizationReceiptV1["outcome"]): void {
  assertCondition(receipt.marker === EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_ATTEMPT_FINALIZATION_RECEIPT_MARKER && receipt.version === 1, "attempt finalization receipt identity mismatch");
  assertCondition(receipt.attempt_id === begin.attempt_id && receipt.live_canary_id === liveCanaryId && receipt.outcome === outcome, "attempt finalization binding mismatch");
  requireIsoUtc(receipt.finalized_at_utc, "attempt finalized_at_utc");
  assertCondition(receipt.replay_state_terminal === true && receipt.lease_state_terminal === true && receipt.automatic_retry === false, "attempt finalization policy mismatch");
}

function responseAuthorityAllFalse(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const authority = value.authority;
  return isRecord(authority) && Object.keys(authority).length > 0 && Object.values(authority).every((entry) => entry === false);
}

function interpretTransportResponse(response: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryTransportResponseV1, liveCanaryId: string, attemptId: string, request: RequestInspection, expectNew: true): {
  outcome: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryTerminalOutcomeV1;
  finalizationOutcome: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryAttemptFinalizationReceiptV1["outcome"];
  httpStatus: number | null;
  receiptId: string | null;
  duplicate: boolean;
  accepted: boolean;
  successfulAuthentication: boolean;
  ambiguous: boolean;
  reason: string | null;
} {
  assertCondition(response.marker === EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_TRANSPORT_RESPONSE_MARKER && response.version === 1, "transport response identity mismatch");
  assertCondition(response.attempt_id === attemptId && response.request_sent === true && response.credential_read === true && response.authorization_header_materialized === true && response.redirects_followed === false && response.automatic_retry === false && response.attempt_count === 1, "transport response policy mismatch");
  requireIsoUtc(response.completed_at_utc, "transport completed_at_utc");
  assertCondition(response.response_bytes >= 0, "transport response byte count is invalid");
  if (response.ambiguous_outcome || !response.response_received || response.http_status === null) {
    return { outcome: "held_ambiguous_manual_reconciliation", finalizationOutcome: "ambiguous_hold", httpStatus: response.http_status, receiptId: null, duplicate: false, accepted: false, successfulAuthentication: false, ambiguous: true, reason: "transport_outcome_ambiguous" };
  }
  assertCondition(response.route_header === "v1", "paid-work route header mismatch");
  const body = requireRecord(response.response_body, "submission response body");
  if (response.http_status === 202 || response.http_status === 200) {
    assertCondition(body.ok === true && typeof body.duplicate === "boolean", "accepted response shape mismatch");
    const duplicate = response.http_status === 200;
    assertCondition(body.duplicate === duplicate, "duplicate status/body mismatch");
    if (expectNew) assertCondition(!duplicate, "expected a new submission but server returned duplicate");
    const receipt = requireRecord(body.receipt, "accepted submission receipt");
    assertCondition(receipt.marker === "VOID_AGENT_PAID_WORK_SUBMISSION_INTAKE_RECEIPT_V1" && receipt.version === 1, "submission receipt identity mismatch");
    const receiptId = requireString(receipt.receipt_id, "receipt ID", 74, 74);
    assertCondition(RECEIPT_ID.test(receiptId), "receipt ID format mismatch");
    assertCondition(receipt.authorization_verified === true && receipt.loopback_source === true, "receipt authentication boundary mismatch");
    assertCondition(receipt.submission_id === request.submissionId && receipt.work_order_id === request.workOrderId && receipt.request_payload_sha256 === request.sha256, "receipt request binding mismatch");
    const admission = requireRecord(receipt.admission, "receipt admission");
    assertCondition(admission.decision === "accepted_for_review", "receipt was not accepted for review");
    assertCondition(responseAuthorityAllFalse(receipt), "receipt granted forbidden authority");
    return { outcome: duplicate ? "accepted_duplicate" : "accepted_new", finalizationOutcome: duplicate ? "duplicate" : "accepted", httpStatus: response.http_status, receiptId, duplicate, accepted: true, successfulAuthentication: true, ambiguous: false, reason: null };
  }
  if (response.http_status === 409) {
    assertCondition(body.error === "conflicting_duplicate_submission", "conflict response shape mismatch");
    return { outcome: "rejected_conflicting_duplicate", finalizationOutcome: "rejected", httpStatus: 409, receiptId: null, duplicate: false, accepted: false, successfulAuthentication: true, ambiguous: false, reason: "conflicting_duplicate_submission" };
  }
  if (response.http_status === 401) {
    return { outcome: "rejected_unauthorized", finalizationOutcome: "rejected", httpStatus: 401, receiptId: null, duplicate: false, accepted: false, successfulAuthentication: false, ambiguous: false, reason: "unauthorized" };
  }
  return { outcome: "rejected_http", finalizationOutcome: "rejected", httpStatus: response.http_status, receiptId: null, duplicate: false, accepted: false, successfulAuthentication: response.http_status !== 401, ambiguous: false, reason: `unexpected_http_status_${response.http_status}` };
}

function buildIntent(command: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryCommandV1, plan: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisitePlanV1, liveCanaryId: string): ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryIntentV1 {
  return {
    marker: EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_INTENT_MARKER,
    version: 1,
    gate_id: EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_GATE_ID,
    operation_id: command.operation_id,
    live_canary_id: liveCanaryId,
    generated_at_utc: command.evaluated_at_utc,
    expires_at_utc: command.execution_expires_at_utc,
    prerequisite_id: plan.prerequisite_id,
    execution_candidate_id: plan.bindings.execution_candidate_id,
    bindings: {
      base_origin: plan.bindings.base_origin,
      endpoint_path: PAID_WORK_SUBMISSION_PATH,
      method: "POST",
      content_type: REQUIRED_CONTENT_TYPE,
      submission_id: plan.bindings.submission_id,
      work_order_id: plan.bindings.work_order_id,
      payload_sha256: plan.bindings.payload_sha256,
      request_bytes: plan.bindings.request_bytes,
      replay_key: plan.bindings.replay_key,
      lease_id: plan.one_shot_lease_staging.lease_id,
      credential_reference_id: plan.bindings.credential_reference_id,
      credential_scope: plan.credential_source_inspection.expected_scope,
      credential_source_locator_sha256: plan.credential_source_inspection.source_locator_sha256,
    },
    state_contract: {
      replay_reservation_path_sha256: plan.replay_staging.reservation_path_sha256,
      lease_path_sha256: plan.one_shot_lease_staging.lease_path_sha256,
      exclusive_create: true,
      maximum_attempt_count: 1,
      automatic_retry: false,
    },
    http_contract: {
      timeout_ms: plan.live_canary_contract.maximum_attempt_count === 1 ? 30_000 : 30_000,
      max_response_bytes: 1_048_576,
      redirect_mode: "manual",
      automatic_retry: false,
      maximum_attempt_count: 1,
      ambiguous_outcome_policy: "hold_manual_reconciliation_no_retry",
    },
    safety: {
      credential_path_disclosed: false,
      token_or_credential_bytes_in_artifact: false,
      cookies_sent: false,
      redirects_followed: false,
      automatic_retry: false,
    },
  };
}

function createTerminalReceipt(input: {
  command: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryCommandV1;
  plan: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryPrerequisitePlanV1;
  liveCanaryId: string;
  outcome: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryTerminalOutcomeV1;
  completedAtUtc: string;
  attemptId: string | null;
  httpStatus: number | null;
  receiptId: string | null;
  duplicate: boolean;
  accepted: boolean;
  successfulAuthentication: boolean;
  responseReceived: boolean;
  ambiguous: boolean;
  reason: string | null;
  submissionAttemptCount: 0 | 1;
  stateFinalized: boolean;
  credentialClosed: boolean;
  authorityValue: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryAuthorityV1;
}): ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryTerminalReceiptV1 {
  return {
    marker: EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_TERMINAL_RECEIPT_MARKER,
    version: 1,
    gate_id: EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_GATE_ID,
    operation_id: input.command.operation_id,
    live_canary_id: input.liveCanaryId,
    outcome: input.outcome,
    completed_at_utc: input.completedAtUtc,
    prerequisite_id: input.plan.prerequisite_id,
    execution_candidate_id: input.plan.bindings.execution_candidate_id,
    submission_id: input.plan.bindings.submission_id,
    work_order_id: input.plan.bindings.work_order_id,
    request_sha256: input.plan.bindings.payload_sha256,
    replay_key: input.plan.bindings.replay_key,
    lease_id: input.plan.one_shot_lease_staging.lease_id,
    credential_reference_id: input.plan.bindings.credential_reference_id,
    attempt_id: input.attemptId,
    http_status: input.httpStatus,
    receipt_id: input.receiptId,
    duplicate: input.duplicate,
    accepted_for_review: input.accepted,
    successful_authentication: input.successfulAuthentication,
    response_received: input.responseReceived,
    ambiguous_outcome: input.ambiguous,
    sanitized_reason_code: input.reason,
    maximum_attempt_count: 1,
    submission_attempt_count: input.submissionAttemptCount,
    automatic_retry: false,
    manual_reconciliation_required: input.ambiguous,
    state_finalized: input.stateFinalized,
    credential_closed_and_zeroized: input.credentialClosed,
    payment_executed: false,
    paid_work_execution_started: false,
    work_dispatched: false,
    work_credit_awarded: false,
    work_credit_ledger_written: false,
    void_settled: false,
    wallet_or_signer_access: false,
    transaction_broadcast: false,
    runtime_mutation: false,
    deployment: false,
    authority: input.authorityValue,
  };
}

const unavailable = async (): Promise<never> => fail("live canary dependency is not wired");

export const EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_DEFAULT_DEPENDENCIES_V1: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryDependenciesV1 = {
  repositoryRoot: () => process.cwd(),
  loadPaidWorkClient: async () => {
    const repositoryRoot = realpathSync(process.cwd());
    const moduleUrl = pathToFileURL(path.join(repositoryRoot, PAID_WORK_CLIENT_RELATIVE_PATH)).href;
    const loaded = await import(moduleUrl) as {
      normalizePaidWorkBaseUrlV1: (raw: string) => URL;
      readPaidWorkSubmissionRequestV1: (rawPath: string) => RequestInspection;
    };
    return loaded;
  },
  beginAttempt: unavailable,
  finalizeAttempt: unavailable,
  openCredentialOnce: unavailable,
  closeCredential: unavailable,
  submitOnce: unavailable,
};

export async function executeExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryV1(
  rawConfig: unknown,
  rawCommand: unknown,
  dependencies: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryDependenciesV1 = EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_DEFAULT_DEPENDENCIES_V1,
): Promise<ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryResultV1> {
  const config = validateConfig(rawConfig);
  if (!config.enabled) {
    return {
      marker: EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_RESULT_MARKER,
      version: 1,
      gate_id: EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_GATE_ID,
      status: "disabled",
      enabled: false,
      live_execution_enabled: false,
      execute: false,
      operation_id: null,
      live_canary_id: null,
      confirmation_verified: false,
      terminal_receipt: null,
      artifacts: { output_directory: null, intent_path: null, terminal_receipt_path: null, private_files_written: false },
      authority: authority(),
    };
  }

  const command = validateCommand(rawCommand);
  const planFile = readPrivateJsonFile(command.prerequisite_plan_path, "prerequisite plan", config.max_prerequisite_plan_bytes);
  const decisionFile = readPrivateJsonFile(command.prerequisite_operator_decision_path, "prerequisite operator decision", config.max_operator_decision_bytes);
  const parsed = parsePrerequisite(planFile, decisionFile);
  const plan = parsed.plan;

  assertCondition(command.expected.prerequisite_operation_id === plan.operation_id && command.expected.prerequisite_id === plan.prerequisite_id && command.expected.execution_candidate_id === plan.bindings.execution_candidate_id, "expected prerequisite identity mismatch");
  assertCondition(command.expected.base_origin === plan.bindings.base_origin && command.expected.endpoint_path === plan.bindings.endpoint_path && command.expected.submission_id === plan.bindings.submission_id && command.expected.work_order_id === plan.bindings.work_order_id && command.expected.payload_sha256 === plan.bindings.payload_sha256 && command.expected.replay_key === plan.bindings.replay_key && command.expected.lease_id === plan.one_shot_lease_staging.lease_id && command.expected.credential_reference_id === plan.bindings.credential_reference_id, "expected prerequisite binding mismatch");
  assertCondition(config.allowed_base_origins.includes(plan.bindings.base_origin), "base origin is not allowlisted");
  assertCondition(config.allowed_endpoint_paths.includes(plan.bindings.endpoint_path), "endpoint path is not allowlisted");
  assertCondition(plan.bindings.request_bytes <= config.max_request_bytes, "request exceeds configured maximum");
  assertCondition(plan.live_canary_contract.maximum_attempt_count === 1 && plan.live_canary_contract.automatic_retry === false && plan.live_canary_contract.execute_confirmation === LIVE_CANARY_CONFIRMATION && plan.live_canary_contract.tool_relative_path === LIVE_CANARY_RELATIVE_PATH, "live canary contract mismatch");
  validateFreshness(config, command, plan);

  const paidWorkClient = await dependencies.loadPaidWorkClient();
  const normalizedBase = paidWorkClient.normalizePaidWorkBaseUrlV1(plan.bindings.base_origin);
  assertCondition(normalizedBase.origin === plan.bindings.base_origin, "paid-work client base origin mismatch");
  const request = paidWorkClient.readPaidWorkSubmissionRequestV1(command.request_path);
  assertCondition(request.bytes.byteLength <= config.max_request_bytes && request.bytes.byteLength === plan.bindings.request_bytes, "request byte count mismatch");
  assertCondition(request.sha256 === plan.bindings.payload_sha256 && request.sha256 === plan.source_artifacts.request_sha256 && path.resolve(command.request_path) === path.resolve(plan.source_artifacts.request_path), "request digest/path mismatch");
  assertCondition(request.submissionId === plan.bindings.submission_id && request.workOrderId === plan.bindings.work_order_id, "request identity mismatch");

  const credentialPath = path.resolve(command.credential_source_path);
  const credentialMetadata = lstatSync(credentialPath);
  assertCondition(credentialMetadata.isFile() && !credentialMetadata.isSymbolicLink(), "credential source must be a regular non-symlink file");
  assertOwnerPrivate(credentialPath, credentialMetadata, "credential source");
  assertCondition(credentialMetadata.size >= 1 && credentialMetadata.size <= config.max_credential_file_bytes, "credential source size is invalid");
  assertCondition(sha256(credentialPath) === plan.credential_source_inspection.source_locator_sha256 && sha256(credentialPath) === plan.credential_source_inspection.path_sha256, "credential source path hash mismatch");
  assertCondition((credentialMetadata.mode & 0o777).toString(8).padStart(4, "0") === plan.credential_source_inspection.mode_octal && credentialMetadata.uid === plan.credential_source_inspection.owner_uid && credentialMetadata.size === plan.credential_source_inspection.size_bytes, "credential source metadata changed after prerequisite");

  const replayPath = path.resolve(plan.replay_staging.reservation_path);
  const leasePath = path.resolve(plan.one_shot_lease_staging.lease_path);
  assertCondition(!existsSync(replayPath), "replay reservation target already exists");
  assertCondition(!existsSync(leasePath), "one-shot lease target already exists");
  assertPrivateDirectory(realpathSync(plan.replay_staging.state_directory), "replay state directory");
  assertPrivateDirectory(realpathSync(plan.one_shot_lease_staging.state_directory), "lease state directory");
  assertCondition(isWithin(realpathSync(plan.replay_staging.state_directory), replayPath) && isWithin(realpathSync(plan.one_shot_lease_staging.state_directory), leasePath), "state target escapes private directory");

  const liveCanaryId = deriveLiveCanaryId(command, plan, request.sha256);
  if (command.operator_intent.expected_live_canary_id !== null) {
    assertCondition(command.operator_intent.expected_live_canary_id === liveCanaryId, "expected live canary ID mismatch");
  }

  if (!command.execute) {
    assertCondition(command.allow_live_submit === false && command.confirmation === "", "validation-only mode forbids live confirmation and allow flag");
    return {
      marker: EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_RESULT_MARKER,
      version: 1,
      gate_id: EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_GATE_ID,
      status: "validated_in_memory",
      enabled: true,
      live_execution_enabled: config.live_execution_enabled,
      execute: false,
      operation_id: command.operation_id,
      live_canary_id: liveCanaryId,
      confirmation_verified: false,
      terminal_receipt: null,
      artifacts: { output_directory: null, intent_path: null, terminal_receipt_path: null, private_files_written: false },
      authority: authority(),
    };
  }

  assertCondition(config.live_execution_enabled === true, "live execution is disabled by configuration");
  assertCondition(command.allow_live_submit === true, "live submission requires allow_live_submit=true");
  assertCondition(command.confirmation === EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_CONFIRMATION, `confirmation must be exactly ${EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_CONFIRMATION}`);
  assertCondition(Date.parse(command.operator_intent.confirmation_expires_at_utc) >= Date.parse(command.evaluated_at_utc), "operator confirmation is expired");
  assertCondition(command.operator_intent.expected_live_canary_id === liveCanaryId, "execute requires the exact live canary ID");

  const outputDirectory = path.resolve(command.output_directory);
  assertCondition(!existsSync(outputDirectory), "live canary output directory already exists");
  const outputParent = realpathSync(path.dirname(outputDirectory));
  assertPrivateDirectory(outputParent, "live canary output parent");
  assertCondition(isWithin(outputParent, outputDirectory), "live canary output escapes private parent");
  mkdirSync(outputDirectory, { recursive: false, mode: 0o700 });
  chmodSync(outputDirectory, 0o700);
  assertPrivateDirectory(outputDirectory, "live canary output directory");

  const intent = buildIntent(command, plan, liveCanaryId);
  intent.http_contract.timeout_ms = Math.min(config.max_http_timeout_ms, 30_000);
  intent.http_contract.max_response_bytes = config.max_response_bytes;
  const intentPath = path.join(outputDirectory, `${command.operation_id}-${INTENT_FILE_SUFFIX}`);
  const terminalPath = path.join(outputDirectory, `${command.operation_id}-${TERMINAL_RECEIPT_FILE_SUFFIX}`);
  writeExclusivePrivateFile(intentPath, `${JSON.stringify(intent, null, 2)}\n`);

  let beginReceipt: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryAttemptBeginReceiptV1 | null = null;
  let credentialSession: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryCredentialSessionV1 | null = null;
  let credentialClosed = false;
  let stateFinalized = false;
  let transportInvoked = false;
  let transportResponse: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryTransportResponseV1 | null = null;
  let interpreted: ReturnType<typeof interpretTransportResponse> | null = null;
  let caught: unknown = null;

  try {
    beginReceipt = await dependencies.beginAttempt({
      live_canary_id: liveCanaryId,
      operation_id: command.operation_id,
      replay_key: plan.bindings.replay_key,
      replay_reservation_path: replayPath,
      lease_id: plan.one_shot_lease_staging.lease_id,
      lease_path: leasePath,
      evaluated_at_utc: command.evaluated_at_utc,
      expires_at_utc: command.execution_expires_at_utc,
    });
    validateBeginReceipt(beginReceipt, liveCanaryId, plan);

    credentialSession = await dependencies.openCredentialOnce({
      live_canary_id: liveCanaryId,
      reference_id: plan.bindings.credential_reference_id,
      source_path: credentialPath,
      source_locator_sha256: plan.credential_source_inspection.source_locator_sha256,
      expected_scope: plan.credential_source_inspection.expected_scope,
    });
    validateCredentialSession(credentialSession, plan);

    transportInvoked = true;
    transportResponse = await dependencies.submitOnce({
      live_canary_id: liveCanaryId,
      attempt_id: beginReceipt.attempt_id,
      base_origin: plan.bindings.base_origin,
      endpoint_path: PAID_WORK_SUBMISSION_PATH,
      method: "POST",
      content_type: REQUIRED_CONTENT_TYPE,
      request_bytes: request.bytes,
      payload_sha256: request.sha256,
      submission_id: request.submissionId,
      work_order_id: request.workOrderId,
      credential_handle_id: credentialSession.handle_id,
      timeout_ms: intent.http_contract.timeout_ms,
      max_response_bytes: intent.http_contract.max_response_bytes,
      redirect_mode: "manual",
      automatic_retry: false,
      maximum_attempt_count: 1,
    });
    assertCondition(transportResponse.response_bytes <= config.max_response_bytes, "transport response exceeds configured maximum");
    interpreted = interpretTransportResponse(transportResponse, liveCanaryId, beginReceipt.attempt_id, request, true);
  } catch (error) {
    caught = error;
  }

  if (credentialSession !== null) {
    try {
      const closed = await dependencies.closeCredential(credentialSession);
      validateCredentialClose(closed, credentialSession.handle_id);
      credentialClosed = true;
    } catch (error) {
      caught ??= error;
    }
  }

  let terminalOutcome: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryTerminalOutcomeV1;
  let finalizationOutcome: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryAttemptFinalizationReceiptV1["outcome"];
  let httpStatus: number | null = transportResponse?.http_status ?? null;
  let receiptId: string | null = null;
  let duplicate = false;
  let accepted = false;
  let successfulAuthentication = false;
  let responseReceived = transportResponse?.response_received ?? false;
  let ambiguous = false;
  let reason: string | null = null;

  if (caught !== null) {
    if (transportResponse?.response_received === true) {
      terminalOutcome = "rejected_http";
      finalizationOutcome = "rejected";
      responseReceived = true;
      successfulAuthentication = transportResponse.http_status !== 401;
      reason = safeReason(caught);
    } else if (transportInvoked) {
      terminalOutcome = "held_ambiguous_manual_reconciliation";
      finalizationOutcome = "ambiguous_hold";
      ambiguous = true;
      reason = safeReason(caught);
    } else {
      terminalOutcome = "held_pre_submit_failure";
      finalizationOutcome = "rejected";
      reason = safeReason(caught);
    }
  } else {
    assertCondition(interpreted !== null, "transport interpretation is unavailable");
    terminalOutcome = interpreted.outcome;
    finalizationOutcome = interpreted.finalizationOutcome;
    httpStatus = interpreted.httpStatus;
    receiptId = interpreted.receiptId;
    duplicate = interpreted.duplicate;
    accepted = interpreted.accepted;
    successfulAuthentication = interpreted.successfulAuthentication;
    responseReceived = transportResponse?.response_received ?? false;
    ambiguous = interpreted.ambiguous;
    reason = interpreted.reason;
  }

  const preFinalAuthority = authority({
    local_private_intent_write: true,
    local_private_terminal_receipt_write: true,
    credential_provider_invocation: credentialSession !== null,
    credential_or_token_read: credentialSession?.credential_read === true,
    authorization_header_materialized: transportResponse?.authorization_header_materialized === true || transportInvoked,
    replay_key_reservation_or_consumption: beginReceipt?.replay_reserved === true,
    one_shot_lease_write: beginReceipt?.lease_written === true,
    external_http_submission: transportInvoked,
    authenticated_submission_post: transportResponse?.request_sent === true || transportInvoked,
  });

  let terminalReceipt = createTerminalReceipt({
    command,
    plan,
    liveCanaryId,
    outcome: terminalOutcome,
    completedAtUtc: command.evaluated_at_utc,
    attemptId: beginReceipt?.attempt_id ?? null,
    httpStatus,
    receiptId,
    duplicate,
    accepted,
    successfulAuthentication,
    responseReceived,
    ambiguous,
    reason,
    submissionAttemptCount: transportInvoked ? 1 : 0,
    stateFinalized: false,
    credentialClosed,
    authorityValue: preFinalAuthority,
  });

  if (beginReceipt !== null) {
    try {
      const finalization = await dependencies.finalizeAttempt({
        begin_receipt: beginReceipt,
        outcome: finalizationOutcome,
        terminal_receipt_sha256: sha256(`${JSON.stringify(terminalReceipt, null, 2)}\n`),
      });
      validateFinalization(finalization, beginReceipt, liveCanaryId, finalizationOutcome);
      stateFinalized = true;
    } catch (error) {
      terminalOutcome = "held_ambiguous_manual_reconciliation";
      ambiguous = true;
      reason = safeReason(error);
    }
  }

  terminalReceipt = createTerminalReceipt({
    command,
    plan,
    liveCanaryId,
    outcome: terminalOutcome,
    completedAtUtc: command.evaluated_at_utc,
    attemptId: beginReceipt?.attempt_id ?? null,
    httpStatus,
    receiptId,
    duplicate,
    accepted: terminalOutcome === "accepted_new" || terminalOutcome === "accepted_duplicate",
    successfulAuthentication,
    responseReceived,
    ambiguous,
    reason,
    submissionAttemptCount: transportInvoked ? 1 : 0,
    stateFinalized,
    credentialClosed,
    authorityValue: preFinalAuthority,
  });
  const serializedReceipt = `${JSON.stringify(terminalReceipt, null, 2)}\n`;
  assertCondition(!serializedReceipt.includes(credentialPath), "terminal receipt disclosed credential path");
  writeExclusivePrivateFile(terminalPath, serializedReceipt);

  for (const pathname of [intentPath, terminalPath]) {
    const metadata = lstatSync(pathname);
    assertCondition(metadata.isFile() && !metadata.isSymbolicLink(), "live canary artifact must be a regular non-symlink file");
    assertOwnerPrivate(pathname, metadata, "live canary artifact");
  }

  const status: ExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryResultV1["status"] =
    terminalOutcome === "accepted_new" ? "accepted_new"
      : terminalOutcome === "accepted_duplicate" ? "accepted_duplicate"
        : terminalOutcome === "held_ambiguous_manual_reconciliation" ? "held_ambiguous"
          : "held_rejected";

  return {
    marker: EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_RESULT_MARKER,
    version: 1,
    gate_id: EXTERNAL_AGENT_PAID_WORK_OPERATOR_CONTROLLED_AUTHENTICATED_SUBMISSION_LIVE_CANARY_GATE_ID,
    status,
    enabled: true,
    live_execution_enabled: true,
    execute: true,
    operation_id: command.operation_id,
    live_canary_id: liveCanaryId,
    confirmation_verified: true,
    terminal_receipt: terminalReceipt,
    artifacts: { output_directory: outputDirectory, intent_path: intentPath, terminal_receipt_path: terminalPath, private_files_written: true },
    authority: preFinalAuthority,
  };
}

function cliUsage(): string {
  return [
    "VOID operator-controlled authenticated-submission live canary V1",
    "",
    "This repository CLI validates only. Live dependency wiring is intentionally unavailable.",
    "",
    "  node --import tsx scripts/external_agent_paid_work_operator_controlled_authenticated_submission_live_canary_v1.ts --input /private/input.json",
  ].join("\n");
}

async function runCli(argv: string[]): Promise<number> {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(`${cliUsage()}\n`);
    return 0;
  }
  const inputIndex = argv.indexOf("--input");
  assertCondition(inputIndex >= 0 && typeof argv[inputIndex + 1] === "string", "--input is required");
  const input = readPrivateJsonFile(argv[inputIndex + 1]!, "CLI input", 4_194_304).value;
  const record = requireRecord(input, "CLI input");
  requireExactKeys(record, ["config", "command"], "CLI input");
  const result = await executeExternalAgentPaidWorkOperatorControlledAuthenticatedSubmissionLiveCanaryV1(record.config, record.command);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result.status === "held_rejected" || result.status === "held_ambiguous" ? 2 : 0;
}

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (invoked === import.meta.url) {
  runCli(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  }).catch((error) => {
    process.stderr.write(`HOLD: ${safeReason(error)}\n`);
    process.exitCode = 2;
  });
}
