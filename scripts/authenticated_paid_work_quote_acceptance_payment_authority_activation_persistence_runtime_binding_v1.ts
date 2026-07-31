import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { canonicalJson } from "./agent_paid_work_order_envelope_v1.js";
import {
  AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_COMMAND_MARKER,
  AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_CONFIG_MARKER,
  AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_CONFIRMATION,
  AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_MARKER,
  executeAuthenticatedPaidWorkActivationPersistenceV1,
  paymentAuthorityReplayStateIdV1,
  type ActivationPersistenceConfigV1,
  type ActivationPersistenceResultV1,
  type PaymentAuthorityReplayStateDraftV1,
  type PaymentAuthorityReplayStateV1,
} from "./authenticated_paid_work_quote_acceptance_payment_authority_activation_persistence_v1.js";
import {
  acceptanceReplayStateIdV1,
  type AcceptanceReplayStateDraftV1,
  type AcceptanceReplayStateV1,
} from "./public_agent_service_acceptance_materialization_replay_consumer_v1.js";

export const AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_BINDING_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_ACTIVATION_PERSISTENCE_RUNTIME_BINDING_V1" as const;
export const AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_CONFIG_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_ACTIVATION_PERSISTENCE_RUNTIME_CONFIG_V1" as const;
export const AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_COMMAND_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_ACTIVATION_PERSISTENCE_RUNTIME_COMMAND_V1" as const;
export const AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_RESULT_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_ACTIVATION_PERSISTENCE_RUNTIME_RESULT_V1" as const;
export const AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_VERSION =
  1 as const;
export const AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_CONFIRMATION =
  "activateAndPersistAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityRuntimeV1" as const;

export const AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_ENABLED_ENV =
  "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_ENABLED" as const;
export const AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_ROOT_ENV =
  "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_ROOT" as const;
export const AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_MAX_POINTER_BYTES_ENV =
  "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_MAX_POINTER_BYTES" as const;
export const AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_MAX_GENERATION_FILE_BYTES_ENV =
  "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_MAX_GENERATION_FILE_BYTES" as const;
export const AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_MAX_GENERATION_COUNT_ENV =
  "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_MAX_GENERATION_COUNT" as const;
export const AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_RECOVER_ORPHAN_ENV =
  "VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_RECOVER_EXACT_ORPHANED_GENERATION" as const;

const CURRENT_FILENAME = "current.json";
const GENERATIONS_DIRECTORY = "generations";
const STAGING_DIRECTORY = ".staging";
const ACCEPTANCE_STATE_FILENAME = "acceptance-replay-state.json";
const PAYMENT_STATE_FILENAME = "payment-authority-replay-state.json";
const TRANSACTION_FILENAME = "transaction.json";
const COMMIT_FILENAME = "commit.json";
const MAX_COMMAND_JSON_BYTES = 32 * 1024 * 1024;
const MAX_PATH_BYTES = 4096;
const MAX_SAFE_INTEGER_TEXT = /^[1-9][0-9]*$/;
const ACCEPTANCE_STATE_ID = /^voidawrs1_[0-9a-f]{64}$/;
const PAYMENT_STATE_ID = /^voidawpars1_[0-9a-f]{64}$/;
const GENERATION_ID = /^voidawpag1_[0-9a-f]{64}$/;
const TRANSACTION_ID = /^voidawapat1_[0-9a-f]{64}$/;
const PACKET_ID = /^voidawqapa1_[0-9a-f]{64}$/;
const ACCEPTANCE_ID = /^voidawa1_[0-9a-f]{64}$/;
const PAYMENT_INTENT_ID = /^voidawpi1_[0-9a-f]{64}$/;
const POINTER_ID = /^voidawpap1_[0-9a-f]{64}$/;

type JsonRecord = Record<string, unknown>;

export interface AuthenticatedPaidWorkActivationPersistenceRuntimeConfigV1 {
  marker:
    typeof AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_CONFIG_MARKER;
  version:
    typeof AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_VERSION;
  enabled: boolean;
  persistence_config: ActivationPersistenceConfigV1 | null;
}

export interface AuthenticatedPaidWorkActivationPersistenceRuntimeCommandV1 {
  marker:
    typeof AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_COMMAND_MARKER;
  version:
    typeof AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_VERSION;
  apply: boolean;
  confirmation: string;
  recorded_at_utc: string;
  prepared_input: unknown;
  prepared_packet: unknown;
  requester_authentication_input: unknown;
}

export interface AuthenticatedPaidWorkActivationPersistenceRuntimeTrustedContextV1 {
  catalog: unknown;
  work_order: unknown;
  quote: unknown;
}

export interface AuthenticatedPaidWorkActivationPersistenceRuntimeDependenciesV1 {
  executeActivationPersistence: (
    input: unknown,
    catalog: unknown,
  ) => ActivationPersistenceResultV1;
}

export interface AuthenticatedPaidWorkActivationPersistenceStoreInspectionV1 {
  root_realpath: string;
  current_present: boolean;
  generation_count: number;
  current_generation_id: string | null;
  current_parent_generation_id: string | null;
  current_transaction_id: string | null;
  current_packet_id: string | null;
  current_acceptance_id: string | null;
  current_payment_intent_id: string | null;
  acceptance_state: AcceptanceReplayStateV1;
  payment_state: PaymentAuthorityReplayStateV1;
  duplicate_before_acceptance_state: AcceptanceReplayStateV1;
  duplicate_before_payment_state: PaymentAuthorityReplayStateV1;
}

export interface AuthenticatedPaidWorkActivationPersistenceRuntimeAuthorityV1 {
  quote_acceptance: boolean;
  acceptance_persistence: boolean;
  requester_authentication_replay_write: boolean;
  provider_authentication_replay_write: boolean;
  acceptance_replay_write: boolean;
  prepared_packet_replay_write: boolean;
  payment_intent_replay_write: boolean;
  payment_authorization: boolean;
  payment_execution: false;
  payment_destination_resolution: false;
  transaction_construction: false;
  transaction_broadcast: false;
  payment_receipt_creation: false;
  work_execution_authorization: false;
  work_dispatch: false;
  wallet_access: false;
  production_signing: false;
  work_credit_write: false;
  void_settlement: false;
  http_submission: false;
  runtime_mutation: false;
  service_restart: false;
  deployment: false;
  money_movement: false;
}

export interface AuthenticatedPaidWorkActivationPersistenceRuntimeResultV1 {
  marker:
    typeof AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_RESULT_MARKER;
  version:
    typeof AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_VERSION;
  status:
    | "disabled"
    | "planned"
    | "committed"
    | "duplicate"
    | "recovered";
  enabled: boolean;
  apply: boolean;
  confirmation_verified: boolean;
  trusted_context_loaded: boolean;
  trusted_context_provider_calls: 0 | 1;
  trusted_work_order_bound: boolean;
  trusted_quote_bound: boolean;
  store_inspected: boolean;
  current_generation_id_before: string | null;
  current_parent_generation_id_before: string | null;
  current_transaction_id_before: string | null;
  generation_count_before: number | null;
  exact_current_identity_detected: boolean;
  transition_uses_parent_replay_state: boolean;
  acceptance_revision_before: number | null;
  payment_revision_before: number | null;
  persistence_attempted: boolean;
  persistence_status: null | "committed" | "duplicate" | "recovered";
  packet_id: string | null;
  acceptance_id: string | null;
  payment_intent_id: string | null;
  transaction_id: string | null;
  generation_id: string | null;
  acceptance_state_id_before: string | null;
  acceptance_state_id_after: string | null;
  payment_state_id_before: string | null;
  payment_state_id_after: string | null;
  activation_persistence_result: ActivationPersistenceResultV1 | null;
  authority: AuthenticatedPaidWorkActivationPersistenceRuntimeAuthorityV1;
}

interface CurrentPointerV1 {
  marker:
    "VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_ACTIVATION_CURRENT_POINTER_V1";
  version: 1;
  pointer_id: string;
  generation_id: string;
  transaction_id: string;
  packet_id: string;
  acceptance_id: string;
  payment_intent_id: string;
  acceptance_state_id: string;
  payment_state_id: string;
  acceptance_revision: number;
  payment_revision: number;
  generation_commit_sha256: string;
}

interface GenerationCommitV1 {
  marker:
    "VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_ACTIVATION_GENERATION_COMMIT_V1";
  version: 1;
  generation_id: string;
  parent_generation_id: string | null;
  transaction_id: string;
  packet_id: string;
  acceptance_id: string;
  payment_intent_id: string;
  prepared_packet_sha256: string;
  requester_authentication_sha256: string;
  acceptance_sha256: string;
  payment_intent_sha256: string;
  acceptance_state_sha256: string;
  payment_state_sha256: string;
  transaction_sha256: string;
  recorded_at_utc: string;
}

interface StoredTransactionV1 {
  transaction_id: string;
  prepared_packet_id: string;
  acceptance_id: string;
  payment_intent_id: string;
  before_acceptance_state_id: string;
  after_acceptance_state_id: string;
  before_payment_state_id: string;
  after_payment_state_id: string;
}

function fail(message: string): never {
  throw new Error(message);
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) fail(message);
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(
    value
      && typeof value === "object"
      && !Array.isArray(value),
  );
}

function requireRecord(value: unknown, label: string): JsonRecord {
  assertCondition(isRecord(value), `${label} must be an object`);
  return value;
}

function requireExactKeys(
  value: JsonRecord,
  label: string,
  expected: readonly string[],
): void {
  const actualKeys = Object.keys(value).sort();
  const expectedKeys = [...expected].sort();
  assertCondition(
    actualKeys.length === expectedKeys.length
      && actualKeys.every(
        (entry, index) => entry === expectedKeys[index],
      ),
    `${label} keys must be exact`,
  );
}

function requireString(
  value: unknown,
  label: string,
  minimumBytes = 1,
  maximumBytes = MAX_PATH_BYTES,
): string {
  assertCondition(typeof value === "string", `${label} must be a string`);
  const bytes = Buffer.byteLength(value, "utf8");
  assertCondition(
    bytes >= minimumBytes && bytes <= maximumBytes,
    `${label} length is invalid`,
  );
  return value;
}

function requireBoolean(value: unknown, label: string): boolean {
  assertCondition(typeof value === "boolean", `${label} must be boolean`);
  return value;
}

function requireSafeInteger(
  value: unknown,
  label: string,
  minimum = 0,
): number {
  assertCondition(
    typeof value === "number"
      && Number.isSafeInteger(value)
      && value >= minimum,
    `${label} must be a safe integer >= ${minimum}`,
  );
  return value;
}

function requireUtcSeconds(value: unknown, label: string): string {
  const text = requireString(value, label, 20, 20);
  assertCondition(
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/.test(
      text,
    ),
    `${label} must use UTC whole-second format`,
  );
  assertCondition(
    Number.isFinite(Date.parse(text)),
    `${label} must be a valid UTC timestamp`,
  );
  return text;
}

function requireIdentifier(
  value: unknown,
  label: string,
  pattern: RegExp,
): string {
  const text = requireString(value, label, 1, 256);
  assertCondition(text === text.trim(), `${label} must be trimmed`);
  assertCondition(pattern.test(text), `${label} has invalid format`);
  return text;
}

function requireStringArray(
  value: unknown,
  label: string,
  pattern: RegExp,
): string[] {
  assertCondition(Array.isArray(value), `${label} must be an array`);
  const strings = value.map((entry, index) =>
    requireIdentifier(entry, `${label}[${index}]`, pattern),
  );
  const sorted = [...strings].sort();
  assertCondition(
    JSON.stringify(strings) === JSON.stringify(sorted),
    `${label} must be sorted`,
  );
  assertCondition(
    new Set(strings).size === strings.length,
    `${label} must be unique`,
  );
  return strings;
}

function requireAbsoluteNormalizedPath(
  value: unknown,
  label: string,
): string {
  const pathname = requireString(value, label, 1, MAX_PATH_BYTES);
  assertCondition(path.isAbsolute(pathname), `${label} must be absolute`);
  assertCondition(
    path.normalize(pathname) === pathname,
    `${label} must be normalized`,
  );
  return pathname;
}

function parseEnvironmentFlag(
  value: string | undefined,
  label: string,
  fallback: boolean,
): boolean {
  if (value === undefined || value === "") return fallback;
  assertCondition(value === "0" || value === "1", `${label} must be 0 or 1`);
  return value === "1";
}

function parsePositiveIntegerEnvironment(
  value: string | undefined,
  label: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (value === undefined || value === "") return fallback;
  assertCondition(
    MAX_SAFE_INTEGER_TEXT.test(value),
    `${label} must be a positive base-10 integer`,
  );
  const parsed = Number(value);
  assertCondition(
    Number.isSafeInteger(parsed)
      && parsed >= minimum
      && parsed <= maximum,
    `${label} is outside the allowed range`,
  );
  return parsed;
}

function compareCanonical(
  left: unknown,
  right: unknown,
  label: string,
): void {
  assertCondition(
    canonicalJson(left) === canonicalJson(right),
    `${label} mismatch`,
  );
}

function sha256CanonicalLine(value: unknown): string {
  return crypto
    .createHash("sha256")
    .update(`${canonicalJson(value)}\n`, "utf8")
    .digest("hex");
}

function requireSha256(value: unknown, label: string): string {
  const text = requireString(value, label, 64, 64);
  assertCondition(/^[0-9a-f]{64}$/.test(text), `${label} must be SHA-256 hex`);
  return text;
}

function contained(root: string, ...segments: string[]): string {
  const candidate = path.resolve(root, ...segments);
  assertCondition(
    candidate === root || candidate.startsWith(`${root}${path.sep}`),
    "path escapes persistence root",
  );
  return candidate;
}

function requireDirectory(
  pathname: string,
  label: string,
  expectedMode: number,
): void {
  const metadata = fs.lstatSync(pathname);
  assertCondition(
    metadata.isDirectory() && !metadata.isSymbolicLink(),
    `${label} must be a real directory`,
  );
  assertCondition(
    (metadata.mode & 0o777) === expectedMode,
    `${label} mode must be ${expectedMode.toString(8).padStart(4, "0")}`,
  );
}

function readBoundedJson(
  pathname: string,
  label: string,
  maximumBytes: number,
): unknown {
  const metadata = fs.lstatSync(pathname);
  assertCondition(
    metadata.isFile() && !metadata.isSymbolicLink(),
    `${label} must be a regular non-symlink file`,
  );
  assertCondition(
    (metadata.mode & 0o777) === 0o600,
    `${label} mode must be 0600`,
  );
  assertCondition(metadata.size <= maximumBytes, `${label} is too large`);
  return JSON.parse(fs.readFileSync(pathname, "utf8")) as unknown;
}

function emptyAcceptanceStateV1(): AcceptanceReplayStateV1 {
  const draft: AcceptanceReplayStateDraftV1 = {
    marker: "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_STATE_V1",
    version: 1,
    revision: 0,
    consumed_requester_authentication_ids: [],
    consumed_provider_authentication_ids: [],
    consumed_acceptance_ids: [],
    active_acceptance_by_quote: {},
  };
  return {
    ...draft,
    state_id: acceptanceReplayStateIdV1(draft),
  };
}

function emptyPaymentStateV1(): PaymentAuthorityReplayStateV1 {
  const draft: PaymentAuthorityReplayStateDraftV1 = {
    marker: "VOID_AUTHENTICATED_PAID_WORK_PAYMENT_AUTHORITY_REPLAY_STATE_V1",
    version: 1,
    revision: 0,
    consumed_prepared_packet_ids: [],
    consumed_payment_intent_ids: [],
    active_payment_intent_by_acceptance: {},
  };
  return {
    ...draft,
    state_id: paymentAuthorityReplayStateIdV1(draft),
  };
}

function validateAcceptanceStateV1(value: unknown): AcceptanceReplayStateV1 {
  const root = requireRecord(value, "acceptance replay state");
  requireExactKeys(
    root,
    "acceptance replay state",
    [
      "marker",
      "version",
      "revision",
      "consumed_requester_authentication_ids",
      "consumed_provider_authentication_ids",
      "consumed_acceptance_ids",
      "active_acceptance_by_quote",
      "state_id",
    ],
  );
  assertCondition(
    root.marker === "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_STATE_V1",
    "acceptance replay state marker mismatch",
  );
  assertCondition(root.version === 1, "acceptance replay state version mismatch");
  const activeRaw = requireRecord(
    root.active_acceptance_by_quote,
    "active_acceptance_by_quote",
  );
  const active: Record<string, string> = {};
  for (const quoteId of Object.keys(activeRaw).sort()) {
    active[quoteId] = requireIdentifier(
      activeRaw[quoteId],
      `active acceptance for ${quoteId}`,
      ACCEPTANCE_ID,
    );
  }
  const draft: AcceptanceReplayStateDraftV1 = {
    marker: "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_STATE_V1",
    version: 1,
    revision: requireSafeInteger(root.revision, "acceptance revision"),
    consumed_requester_authentication_ids: requireStringArray(
      root.consumed_requester_authentication_ids,
      "consumed requester authentication IDs",
      /^voidawra1_[0-9a-f]{64}$/,
    ),
    consumed_provider_authentication_ids: requireStringArray(
      root.consumed_provider_authentication_ids,
      "consumed provider authentication IDs",
      /^voidawqa1_[0-9a-f]{64}$/,
    ),
    consumed_acceptance_ids: requireStringArray(
      root.consumed_acceptance_ids,
      "consumed acceptance IDs",
      ACCEPTANCE_ID,
    ),
    active_acceptance_by_quote: active,
  };
  const stateId = requireIdentifier(
    root.state_id,
    "acceptance state_id",
    ACCEPTANCE_STATE_ID,
  );
  assertCondition(
    stateId === acceptanceReplayStateIdV1(draft),
    "acceptance replay state_id mismatch",
  );
  return {
    ...draft,
    state_id: stateId,
  };
}

function validatePaymentStateV1(value: unknown): PaymentAuthorityReplayStateV1 {
  const root = requireRecord(value, "payment authority replay state");
  requireExactKeys(
    root,
    "payment authority replay state",
    [
      "marker",
      "version",
      "revision",
      "consumed_prepared_packet_ids",
      "consumed_payment_intent_ids",
      "active_payment_intent_by_acceptance",
      "state_id",
    ],
  );
  assertCondition(
    root.marker === "VOID_AUTHENTICATED_PAID_WORK_PAYMENT_AUTHORITY_REPLAY_STATE_V1",
    "payment authority replay state marker mismatch",
  );
  assertCondition(
    root.version === 1,
    "payment authority replay state version mismatch",
  );
  const activeRaw = requireRecord(
    root.active_payment_intent_by_acceptance,
    "active_payment_intent_by_acceptance",
  );
  const active: Record<string, string> = {};
  for (const acceptanceId of Object.keys(activeRaw).sort()) {
    requireIdentifier(
      acceptanceId,
      "active payment acceptance ID",
      ACCEPTANCE_ID,
    );
    active[acceptanceId] = requireIdentifier(
      activeRaw[acceptanceId],
      `active payment intent for ${acceptanceId}`,
      PAYMENT_INTENT_ID,
    );
  }
  const draft: PaymentAuthorityReplayStateDraftV1 = {
    marker: "VOID_AUTHENTICATED_PAID_WORK_PAYMENT_AUTHORITY_REPLAY_STATE_V1",
    version: 1,
    revision: requireSafeInteger(root.revision, "payment revision"),
    consumed_prepared_packet_ids: requireStringArray(
      root.consumed_prepared_packet_ids,
      "consumed prepared packet IDs",
      PACKET_ID,
    ),
    consumed_payment_intent_ids: requireStringArray(
      root.consumed_payment_intent_ids,
      "consumed payment intent IDs",
      PAYMENT_INTENT_ID,
    ),
    active_payment_intent_by_acceptance: active,
  };
  const stateId = requireIdentifier(
    root.state_id,
    "payment state_id",
    PAYMENT_STATE_ID,
  );
  assertCondition(
    stateId === paymentAuthorityReplayStateIdV1(draft),
    "payment authority replay state_id mismatch",
  );
  return {
    ...draft,
    state_id: stateId,
  };
}

function validateCurrentPointerV1(value: unknown): CurrentPointerV1 {
  const root = requireRecord(value, "activation current pointer");
  requireExactKeys(
    root,
    "activation current pointer",
    [
      "marker",
      "version",
      "pointer_id",
      "generation_id",
      "transaction_id",
      "packet_id",
      "acceptance_id",
      "payment_intent_id",
      "acceptance_state_id",
      "payment_state_id",
      "acceptance_revision",
      "payment_revision",
      "generation_commit_sha256",
    ],
  );
  assertCondition(
    root.marker
      === "VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_ACTIVATION_CURRENT_POINTER_V1",
    "activation current pointer marker mismatch",
  );
  assertCondition(root.version === 1, "activation current pointer version mismatch");
  return {
    marker:
      "VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_ACTIVATION_CURRENT_POINTER_V1",
    version: 1,
    pointer_id: requireIdentifier(
      root.pointer_id,
      "current pointer_id",
      POINTER_ID,
    ),
    generation_id: requireIdentifier(
      root.generation_id,
      "current generation_id",
      GENERATION_ID,
    ),
    transaction_id: requireIdentifier(
      root.transaction_id,
      "current transaction_id",
      TRANSACTION_ID,
    ),
    packet_id: requireIdentifier(root.packet_id, "current packet_id", PACKET_ID),
    acceptance_id: requireIdentifier(
      root.acceptance_id,
      "current acceptance_id",
      ACCEPTANCE_ID,
    ),
    payment_intent_id: requireIdentifier(
      root.payment_intent_id,
      "current payment_intent_id",
      PAYMENT_INTENT_ID,
    ),
    acceptance_state_id: requireIdentifier(
      root.acceptance_state_id,
      "current acceptance_state_id",
      ACCEPTANCE_STATE_ID,
    ),
    payment_state_id: requireIdentifier(
      root.payment_state_id,
      "current payment_state_id",
      PAYMENT_STATE_ID,
    ),
    acceptance_revision: requireSafeInteger(
      root.acceptance_revision,
      "current acceptance_revision",
    ),
    payment_revision: requireSafeInteger(
      root.payment_revision,
      "current payment_revision",
    ),
    generation_commit_sha256: requireSha256(
      root.generation_commit_sha256,
      "current generation_commit_sha256",
    ),
  };
}

function validateGenerationCommitV1(value: unknown): GenerationCommitV1 {
  const root = requireRecord(value, "activation generation commit");
  requireExactKeys(
    root,
    "activation generation commit",
    [
      "marker",
      "version",
      "generation_id",
      "parent_generation_id",
      "transaction_id",
      "packet_id",
      "acceptance_id",
      "payment_intent_id",
      "prepared_packet_sha256",
      "requester_authentication_sha256",
      "acceptance_sha256",
      "payment_intent_sha256",
      "acceptance_state_sha256",
      "payment_state_sha256",
      "transaction_sha256",
      "recorded_at_utc",
    ],
  );
  assertCondition(
    root.marker
      === "VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_ACTIVATION_GENERATION_COMMIT_V1",
    "activation generation commit marker mismatch",
  );
  assertCondition(root.version === 1, "activation generation commit version mismatch");
  const parent = root.parent_generation_id;
  assertCondition(
    parent === null
      || (typeof parent === "string" && GENERATION_ID.test(parent)),
    "activation generation commit parent_generation_id invalid",
  );
  return {
    marker:
      "VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_ACTIVATION_GENERATION_COMMIT_V1",
    version: 1,
    generation_id: requireIdentifier(root.generation_id, "commit generation_id", GENERATION_ID),
    parent_generation_id: parent as string | null,
    transaction_id: requireIdentifier(root.transaction_id, "commit transaction_id", TRANSACTION_ID),
    packet_id: requireIdentifier(root.packet_id, "commit packet_id", PACKET_ID),
    acceptance_id: requireIdentifier(root.acceptance_id, "commit acceptance_id", ACCEPTANCE_ID),
    payment_intent_id: requireIdentifier(root.payment_intent_id, "commit payment_intent_id", PAYMENT_INTENT_ID),
    prepared_packet_sha256: requireSha256(root.prepared_packet_sha256, "prepared_packet_sha256"),
    requester_authentication_sha256: requireSha256(root.requester_authentication_sha256, "requester_authentication_sha256"),
    acceptance_sha256: requireSha256(root.acceptance_sha256, "acceptance_sha256"),
    payment_intent_sha256: requireSha256(root.payment_intent_sha256, "payment_intent_sha256"),
    acceptance_state_sha256: requireSha256(root.acceptance_state_sha256, "acceptance_state_sha256"),
    payment_state_sha256: requireSha256(root.payment_state_sha256, "payment_state_sha256"),
    transaction_sha256: requireSha256(root.transaction_sha256, "transaction_sha256"),
    recorded_at_utc: requireUtcSeconds(root.recorded_at_utc, "commit recorded_at_utc"),
  };
}

function validateStoredTransactionV1(value: unknown): StoredTransactionV1 {
  const root = requireRecord(value, "stored activation transaction");
  assertCondition(
    root.marker
      === "VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_ACTIVATION_TRANSACTION_V1",
    "stored activation transaction marker mismatch",
  );
  assertCondition(root.version === 1, "stored activation transaction version mismatch");
  return {
    transaction_id: requireIdentifier(root.transaction_id, "stored transaction_id", TRANSACTION_ID),
    prepared_packet_id: requireIdentifier(root.prepared_packet_id, "stored prepared_packet_id", PACKET_ID),
    acceptance_id: requireIdentifier(root.acceptance_id, "stored acceptance_id", ACCEPTANCE_ID),
    payment_intent_id: requireIdentifier(root.payment_intent_id, "stored payment_intent_id", PAYMENT_INTENT_ID),
    before_acceptance_state_id: requireIdentifier(root.before_acceptance_state_id, "stored before_acceptance_state_id", ACCEPTANCE_STATE_ID),
    after_acceptance_state_id: requireIdentifier(root.after_acceptance_state_id, "stored after_acceptance_state_id", ACCEPTANCE_STATE_ID),
    before_payment_state_id: requireIdentifier(root.before_payment_state_id, "stored before_payment_state_id", PAYMENT_STATE_ID),
    after_payment_state_id: requireIdentifier(root.after_payment_state_id, "stored after_payment_state_id", PAYMENT_STATE_ID),
  };
}

function validatePersistenceConfigV1(
  value: unknown,
): ActivationPersistenceConfigV1 {
  const root = requireRecord(value, "activation persistence config");
  requireExactKeys(
    root,
    "activation persistence config",
    [
      "marker",
      "version",
      "enabled",
      "allowed_root",
      "max_pointer_bytes",
      "max_generation_file_bytes",
      "max_generation_count",
      "recover_exact_orphaned_generation",
    ],
  );
  assertCondition(
    root.marker === AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_CONFIG_MARKER,
    "activation persistence config marker mismatch",
  );
  assertCondition(root.version === 1, "activation persistence config version mismatch");
  assertCondition(
    root.enabled === true,
    "runtime-enabled persistence config must be enabled",
  );
  return {
    marker: AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_CONFIG_MARKER,
    version: 1,
    enabled: true,
    allowed_root: requireAbsoluteNormalizedPath(
      root.allowed_root,
      "allowed_root",
    ),
    max_pointer_bytes: requireSafeInteger(
      root.max_pointer_bytes,
      "max_pointer_bytes",
      512,
    ),
    max_generation_file_bytes: requireSafeInteger(
      root.max_generation_file_bytes,
      "max_generation_file_bytes",
      1024,
    ),
    max_generation_count: requireSafeInteger(
      root.max_generation_count,
      "max_generation_count",
      1,
    ),
    recover_exact_orphaned_generation: requireBoolean(
      root.recover_exact_orphaned_generation,
      "recover_exact_orphaned_generation",
    ),
  };
}

export function validateAuthenticatedPaidWorkActivationPersistenceRuntimeConfigV1(
  value: unknown,
): AuthenticatedPaidWorkActivationPersistenceRuntimeConfigV1 {
  const root = requireRecord(value, "activation persistence runtime config");
  requireExactKeys(
    root,
    "activation persistence runtime config",
    ["marker", "version", "enabled", "persistence_config"],
  );
  assertCondition(
    root.marker
      === AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_CONFIG_MARKER,
    "activation persistence runtime config marker mismatch",
  );
  assertCondition(
    root.version
      === AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_VERSION,
    "activation persistence runtime config version mismatch",
  );
  const enabled = requireBoolean(root.enabled, "enabled");
  if (!enabled) {
    assertCondition(
      root.persistence_config === null,
      "disabled runtime persistence_config must be null",
    );
    return {
      marker:
        AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_CONFIG_MARKER,
      version:
        AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_VERSION,
      enabled: false,
      persistence_config: null,
    };
  }
  return {
    marker:
      AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_CONFIG_MARKER,
    version:
      AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_VERSION,
    enabled: true,
    persistence_config: validatePersistenceConfigV1(root.persistence_config),
  };
}

export function loadAuthenticatedPaidWorkActivationPersistenceRuntimeConfigFromEnvironmentV1(
  environment: NodeJS.ProcessEnv,
): AuthenticatedPaidWorkActivationPersistenceRuntimeConfigV1 {
  const enabled = parseEnvironmentFlag(
    environment[
      AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_ENABLED_ENV
    ],
    AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_ENABLED_ENV,
    false,
  );
  if (!enabled) {
    return {
      marker:
        AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_CONFIG_MARKER,
      version:
        AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_VERSION,
      enabled: false,
      persistence_config: null,
    };
  }

  const allowedRoot = requireAbsoluteNormalizedPath(
    environment[
      AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_ROOT_ENV
    ],
    AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_ROOT_ENV,
  );
  return validateAuthenticatedPaidWorkActivationPersistenceRuntimeConfigV1({
    marker:
      AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_CONFIG_MARKER,
    version:
      AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_VERSION,
    enabled: true,
    persistence_config: {
      marker: AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_CONFIG_MARKER,
      version: 1,
      enabled: true,
      allowed_root: allowedRoot,
      max_pointer_bytes: parsePositiveIntegerEnvironment(
        environment[
          AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_MAX_POINTER_BYTES_ENV
        ],
        AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_MAX_POINTER_BYTES_ENV,
        65_536,
        512,
        1_048_576,
      ),
      max_generation_file_bytes: parsePositiveIntegerEnvironment(
        environment[
          AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_MAX_GENERATION_FILE_BYTES_ENV
        ],
        AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_MAX_GENERATION_FILE_BYTES_ENV,
        4_194_304,
        1024,
        33_554_432,
      ),
      max_generation_count: parsePositiveIntegerEnvironment(
        environment[
          AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_MAX_GENERATION_COUNT_ENV
        ],
        AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_MAX_GENERATION_COUNT_ENV,
        10_000,
        1,
        1_000_000,
      ),
      recover_exact_orphaned_generation: parseEnvironmentFlag(
        environment[
          AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_RECOVER_ORPHAN_ENV
        ],
        AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_RECOVER_ORPHAN_ENV,
        true,
      ),
    },
  });
}

function validateCommandV1(
  value: unknown,
): AuthenticatedPaidWorkActivationPersistenceRuntimeCommandV1 {
  const root = requireRecord(value, "activation persistence runtime command");
  requireExactKeys(
    root,
    "activation persistence runtime command",
    [
      "marker",
      "version",
      "apply",
      "confirmation",
      "recorded_at_utc",
      "prepared_input",
      "prepared_packet",
      "requester_authentication_input",
    ],
  );
  assertCondition(
    root.marker
      === AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_COMMAND_MARKER,
    "activation persistence runtime command marker mismatch",
  );
  assertCondition(
    root.version
      === AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_VERSION,
    "activation persistence runtime command version mismatch",
  );
  const apply = requireBoolean(root.apply, "apply");
  const confirmation = requireString(root.confirmation, "confirmation", 0, 160);
  if (apply) {
    assertCondition(
      confirmation
        === AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_CONFIRMATION,
      `confirmation must be ${AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_CONFIRMATION}`,
    );
  } else {
    assertCondition(
      confirmation === "",
      "dry-run confirmation must be empty",
    );
  }
  const command: AuthenticatedPaidWorkActivationPersistenceRuntimeCommandV1 = {
    marker:
      AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_COMMAND_MARKER,
    version:
      AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_VERSION,
    apply,
    confirmation,
    recorded_at_utc: requireUtcSeconds(
      root.recorded_at_utc,
      "recorded_at_utc",
    ),
    prepared_input: root.prepared_input,
    prepared_packet: root.prepared_packet,
    requester_authentication_input: root.requester_authentication_input,
  };
  assertCondition(
    Buffer.byteLength(JSON.stringify(command), "utf8")
      <= MAX_COMMAND_JSON_BYTES,
    "activation persistence runtime command is too large",
  );
  return command;
}

interface PreparedCandidateIdentifiersV1 {
  packet_id: string;
  acceptance_id: string;
  payment_intent_id: string;
}

function preparedCandidateIdentifiersV1(
  value: unknown,
): PreparedCandidateIdentifiersV1 {
  const packet = requireRecord(value, "prepared_packet");
  const artifacts = requireRecord(
    packet.prepared_artifacts,
    "prepared_packet.prepared_artifacts",
  );
  const acceptance = requireRecord(
    artifacts.acceptance_envelope,
    "prepared acceptance envelope",
  );
  const paymentIntent = requireRecord(
    artifacts.payment_intent_envelope,
    "prepared payment intent envelope",
  );
  return {
    packet_id: requireIdentifier(packet.packet_id, "prepared packet_id", PACKET_ID),
    acceptance_id: requireIdentifier(
      acceptance.acceptance_id,
      "prepared acceptance_id",
      ACCEPTANCE_ID,
    ),
    payment_intent_id: requireIdentifier(
      paymentIntent.payment_intent_id,
      "prepared payment_intent_id",
      PAYMENT_INTENT_ID,
    ),
  };
}

function validateTrustedContextV1(
  value: unknown,
): AuthenticatedPaidWorkActivationPersistenceRuntimeTrustedContextV1 {
  const root = requireRecord(value, "trusted activation context");
  requireExactKeys(
    root,
    "trusted activation context",
    ["catalog", "work_order", "quote"],
  );
  return {
    catalog: root.catalog,
    work_order: root.work_order,
    quote: root.quote,
  };
}

export function inspectAuthenticatedPaidWorkActivationPersistenceStoreV1(
  configValue: unknown,
): AuthenticatedPaidWorkActivationPersistenceStoreInspectionV1 {
  const config = validatePersistenceConfigV1(configValue);
  requireDirectory(config.allowed_root, "allowed_root", 0o700);
  const rootRealpath = fs.realpathSync(config.allowed_root);
  assertCondition(
    rootRealpath === config.allowed_root,
    "allowed_root must be canonical and symlink-free",
  );

  const generationsPath = contained(rootRealpath, GENERATIONS_DIRECTORY);
  let generationCount = 0;
  if (fs.existsSync(generationsPath)) {
    requireDirectory(generationsPath, "generations directory", 0o700);
    const entries = fs.readdirSync(generationsPath, { withFileTypes: true });
    for (const entry of entries) {
      assertCondition(
        entry.isDirectory() && !entry.isSymbolicLink(),
        "generations directory contains a non-directory entry",
      );
      assertCondition(
        GENERATION_ID.test(entry.name),
        "generations directory contains an invalid generation ID",
      );
    }
    generationCount = entries.length;
  }
  assertCondition(
    generationCount <= config.max_generation_count,
    "generation count exceeds configured bound",
  );

  const stagingPath = contained(rootRealpath, STAGING_DIRECTORY);
  if (fs.existsSync(stagingPath)) {
    requireDirectory(stagingPath, "staging directory", 0o700);
    assertCondition(
      fs.readdirSync(stagingPath).length === 0,
      "unresolved staging requires operator review",
    );
  }

  const emptyAcceptance = emptyAcceptanceStateV1();
  const emptyPayment = emptyPaymentStateV1();
  const currentPath = contained(rootRealpath, CURRENT_FILENAME);
  if (!fs.existsSync(currentPath)) {
    return {
      root_realpath: rootRealpath,
      current_present: false,
      generation_count: generationCount,
      current_generation_id: null,
      current_parent_generation_id: null,
      current_transaction_id: null,
      current_packet_id: null,
      current_acceptance_id: null,
      current_payment_intent_id: null,
      acceptance_state: emptyAcceptance,
      payment_state: emptyPayment,
      duplicate_before_acceptance_state: emptyAcceptance,
      duplicate_before_payment_state: emptyPayment,
    };
  }

  const pointer = validateCurrentPointerV1(
    readBoundedJson(
      currentPath,
      "activation current pointer",
      config.max_pointer_bytes,
    ),
  );
  const generationPath = contained(generationsPath, pointer.generation_id);
  requireDirectory(generationPath, "current generation directory", 0o700);
  const commit = validateGenerationCommitV1(
    readBoundedJson(
      contained(generationPath, COMMIT_FILENAME),
      "activation generation commit",
      config.max_generation_file_bytes,
    ),
  );
  assertCondition(
    commit.generation_id === pointer.generation_id
      && commit.transaction_id === pointer.transaction_id
      && commit.packet_id === pointer.packet_id
      && commit.acceptance_id === pointer.acceptance_id
      && commit.payment_intent_id === pointer.payment_intent_id,
    "current pointer and generation commit identity mismatch",
  );
  assertCondition(
    sha256CanonicalLine(commit) === pointer.generation_commit_sha256,
    "current pointer generation commit SHA mismatch",
  );

  const acceptanceState = validateAcceptanceStateV1(
    readBoundedJson(
      contained(generationPath, ACCEPTANCE_STATE_FILENAME),
      "stored acceptance replay state",
      config.max_generation_file_bytes,
    ),
  );
  const paymentState = validatePaymentStateV1(
    readBoundedJson(
      contained(generationPath, PAYMENT_STATE_FILENAME),
      "stored payment authority replay state",
      config.max_generation_file_bytes,
    ),
  );
  const transaction = validateStoredTransactionV1(
    readBoundedJson(
      contained(generationPath, TRANSACTION_FILENAME),
      "stored activation transaction",
      config.max_generation_file_bytes,
    ),
  );
  assertCondition(
    pointer.acceptance_state_id === acceptanceState.state_id
      && pointer.acceptance_revision === acceptanceState.revision,
    "current pointer acceptance state mismatch",
  );
  assertCondition(
    pointer.payment_state_id === paymentState.state_id
      && pointer.payment_revision === paymentState.revision,
    "current pointer payment state mismatch",
  );
  assertCondition(
    transaction.transaction_id === pointer.transaction_id
      && transaction.prepared_packet_id === pointer.packet_id
      && transaction.acceptance_id === pointer.acceptance_id
      && transaction.payment_intent_id === pointer.payment_intent_id
      && transaction.after_acceptance_state_id === acceptanceState.state_id
      && transaction.after_payment_state_id === paymentState.state_id,
    "stored transaction and current pointer mismatch",
  );

  let duplicateBeforeAcceptance = emptyAcceptance;
  let duplicateBeforePayment = emptyPayment;
  if (commit.parent_generation_id !== null) {
    const parentPath = contained(generationsPath, commit.parent_generation_id);
    requireDirectory(parentPath, "parent generation directory", 0o700);
    duplicateBeforeAcceptance = validateAcceptanceStateV1(
      readBoundedJson(
        contained(parentPath, ACCEPTANCE_STATE_FILENAME),
        "parent acceptance replay state",
        config.max_generation_file_bytes,
      ),
    );
    duplicateBeforePayment = validatePaymentStateV1(
      readBoundedJson(
        contained(parentPath, PAYMENT_STATE_FILENAME),
        "parent payment authority replay state",
        config.max_generation_file_bytes,
      ),
    );
  }
  assertCondition(
    transaction.before_acceptance_state_id
      === duplicateBeforeAcceptance.state_id,
    "stored transaction before acceptance state mismatch",
  );
  assertCondition(
    transaction.before_payment_state_id === duplicateBeforePayment.state_id,
    "stored transaction before payment state mismatch",
  );

  return {
    root_realpath: rootRealpath,
    current_present: true,
    generation_count: generationCount,
    current_generation_id: pointer.generation_id,
    current_parent_generation_id: commit.parent_generation_id,
    current_transaction_id: pointer.transaction_id,
    current_packet_id: pointer.packet_id,
    current_acceptance_id: pointer.acceptance_id,
    current_payment_intent_id: pointer.payment_intent_id,
    acceptance_state: acceptanceState,
    payment_state: paymentState,
    duplicate_before_acceptance_state: duplicateBeforeAcceptance,
    duplicate_before_payment_state: duplicateBeforePayment,
  };
}

function disabledAuthorityV1(): AuthenticatedPaidWorkActivationPersistenceRuntimeAuthorityV1 {
  return {
    quote_acceptance: false,
    acceptance_persistence: false,
    requester_authentication_replay_write: false,
    provider_authentication_replay_write: false,
    acceptance_replay_write: false,
    prepared_packet_replay_write: false,
    payment_intent_replay_write: false,
    payment_authorization: false,
    payment_execution: false,
    payment_destination_resolution: false,
    transaction_construction: false,
    transaction_broadcast: false,
    payment_receipt_creation: false,
    work_execution_authorization: false,
    work_dispatch: false,
    wallet_access: false,
    production_signing: false,
    work_credit_write: false,
    void_settlement: false,
    http_submission: false,
    runtime_mutation: false,
    service_restart: false,
    deployment: false,
    money_movement: false,
  };
}

function authorityFromActivationResultV1(
  result: ActivationPersistenceResultV1,
): AuthenticatedPaidWorkActivationPersistenceRuntimeAuthorityV1 {
  const authority = result.authority;
  assertCondition(
    authority.payment_execution === false
      && authority.payment_destination_resolution === false
      && authority.transaction_construction === false
      && authority.transaction_broadcast === false
      && authority.payment_receipt_creation === false
      && authority.work_execution_authorization === false
      && authority.work_dispatch === false
      && authority.wallet_access === false
      && authority.production_signing === false
      && authority.work_credit_write === false
      && authority.void_settlement === false
      && authority.http_submission === false
      && authority.runtime_mutation === false
      && authority.service_restart === false
      && authority.deployment === false
      && authority.money_movement === false,
    "underlying activation result exceeded runtime authority boundary",
  );
  return {
    quote_acceptance: authority.quote_acceptance,
    acceptance_persistence: authority.acceptance_persistence,
    requester_authentication_replay_write:
      authority.requester_authentication_replay_write,
    provider_authentication_replay_write:
      authority.provider_authentication_replay_write,
    acceptance_replay_write: authority.acceptance_replay_write,
    prepared_packet_replay_write: authority.prepared_packet_replay_write,
    payment_intent_replay_write: authority.payment_intent_replay_write,
    payment_authorization: authority.payment_authorization,
    payment_execution: false,
    payment_destination_resolution: false,
    transaction_construction: false,
    transaction_broadcast: false,
    payment_receipt_creation: false,
    work_execution_authorization: false,
    work_dispatch: false,
    wallet_access: false,
    production_signing: false,
    work_credit_write: false,
    void_settlement: false,
    http_submission: false,
    runtime_mutation: false,
    service_restart: false,
    deployment: false,
    money_movement: false,
  };
}

function disabledResultV1(): AuthenticatedPaidWorkActivationPersistenceRuntimeResultV1 {
  return {
    marker:
      AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_RESULT_MARKER,
    version:
      AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_VERSION,
    status: "disabled",
    enabled: false,
    apply: false,
    confirmation_verified: false,
    trusted_context_loaded: false,
    trusted_context_provider_calls: 0,
    trusted_work_order_bound: false,
    trusted_quote_bound: false,
    store_inspected: false,
    current_generation_id_before: null,
    current_parent_generation_id_before: null,
    current_transaction_id_before: null,
    generation_count_before: null,
    exact_current_identity_detected: false,
    transition_uses_parent_replay_state: false,
    acceptance_revision_before: null,
    payment_revision_before: null,
    persistence_attempted: false,
    persistence_status: null,
    packet_id: null,
    acceptance_id: null,
    payment_intent_id: null,
    transaction_id: null,
    generation_id: null,
    acceptance_state_id_before: null,
    acceptance_state_id_after: null,
    payment_state_id_before: null,
    payment_state_id_after: null,
    activation_persistence_result: null,
    authority: disabledAuthorityV1(),
  };
}

export const AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_DEFAULT_DEPENDENCIES_V1:
  AuthenticatedPaidWorkActivationPersistenceRuntimeDependenciesV1 = Object.freeze({
    executeActivationPersistence:
      executeAuthenticatedPaidWorkActivationPersistenceV1,
  });

export function authenticatedPaidWorkActivationPersistenceRuntimeDefaultDependencyIdentityV1(): {
  execute_activation_persistence_exact: true;
} {
  assertCondition(
    AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_DEFAULT_DEPENDENCIES_V1
      .executeActivationPersistence
      === executeAuthenticatedPaidWorkActivationPersistenceV1,
    "default activation persistence dependency changed",
  );
  return {
    execute_activation_persistence_exact: true,
  };
}

export function executeAuthenticatedPaidWorkActivationPersistenceRuntimeBindingV1(
  configValue: unknown,
  commandValue: unknown,
  trustedContextProvider: () => unknown,
  dependencies:
    AuthenticatedPaidWorkActivationPersistenceRuntimeDependenciesV1 =
      AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_DEFAULT_DEPENDENCIES_V1,
): AuthenticatedPaidWorkActivationPersistenceRuntimeResultV1 {
  const config =
    validateAuthenticatedPaidWorkActivationPersistenceRuntimeConfigV1(
      configValue,
    );
  if (!config.enabled) {
    return disabledResultV1();
  }

  // Confirmation and command shape are validated before provider invocation or
  // any persistence-store read.
  const command = validateCommandV1(commandValue);
  assertCondition(
    typeof trustedContextProvider === "function",
    "trusted context provider is required",
  );

  let providerCalls = 0;
  const trustedContext = validateTrustedContextV1((() => {
    providerCalls += 1;
    return trustedContextProvider();
  })());
  assertCondition(
    providerCalls === 1,
    "trusted context provider must be called exactly once",
  );

  const preparedInput = requireRecord(
    command.prepared_input,
    "prepared_input",
  );
  compareCanonical(
    preparedInput.work_order,
    trustedContext.work_order,
    "trusted work order binding",
  );
  compareCanonical(
    preparedInput.quote,
    trustedContext.quote,
    "trusted quote binding",
  );

  assertCondition(
    config.persistence_config !== null,
    "enabled runtime requires persistence_config",
  );
  const inspection = inspectAuthenticatedPaidWorkActivationPersistenceStoreV1(
    config.persistence_config,
  );
  const candidateIdentifiers = preparedCandidateIdentifiersV1(
    command.prepared_packet,
  );
  const exactCurrentIdentity = Boolean(
    inspection.current_present
      && candidateIdentifiers.packet_id === inspection.current_packet_id
      && candidateIdentifiers.acceptance_id === inspection.current_acceptance_id
      && candidateIdentifiers.payment_intent_id
        === inspection.current_payment_intent_id,
  );
  const selectedAcceptanceState = exactCurrentIdentity
    ? inspection.duplicate_before_acceptance_state
    : inspection.acceptance_state;
  const selectedPaymentState = exactCurrentIdentity
    ? inspection.duplicate_before_payment_state
    : inspection.payment_state;

  const activationInput = {
    marker: AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_MARKER,
    version: 1 as const,
    mode: "external_requester_evidence" as const,
    prepared_input: command.prepared_input,
    prepared_packet: command.prepared_packet,
    requester_authentication_input: command.requester_authentication_input,
    acceptance_replay_state_snapshot: selectedAcceptanceState,
    payment_authority_replay_state_snapshot: selectedPaymentState,
    expected_acceptance_revision: selectedAcceptanceState.revision,
    expected_payment_authority_revision: selectedPaymentState.revision,
    persistence_config: config.persistence_config,
    command: {
      marker: AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_COMMAND_MARKER,
      version: 1 as const,
      apply: command.apply,
      confirmation: command.apply
        ? AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_CONFIRMATION
        : "",
      recorded_at_utc: command.recorded_at_utc,
    },
  };

  const activationResult = dependencies.executeActivationPersistence(
    activationInput,
    trustedContext.catalog,
  );
  assertCondition(
    activationResult.status === "planned"
      || activationResult.status === "committed"
      || activationResult.status === "duplicate"
      || activationResult.status === "recovered",
    "runtime binding received an unsupported activation status",
  );
  assertCondition(
    activationResult.mode === "external_requester_evidence",
    "runtime binding requires external requester evidence mode",
  );
  assertCondition(
    activationResult.enabled === true,
    "runtime binding requires an enabled activation result",
  );
  assertCondition(
    activationResult.apply === command.apply,
    "activation result apply flag mismatch",
  );
  if (!command.apply) {
    assertCondition(
      activationResult.status === "planned"
        && activationResult.persistence_attempted === false
        && activationResult.persistence_receipt === null,
      "dry-run activation unexpectedly persisted",
    );
  } else {
    assertCondition(
      activationResult.confirmation_verified === true
        && activationResult.persistence_attempted === true
        && activationResult.persistence_receipt !== null,
      "apply activation did not produce a persistence receipt",
    );
  }

  const receipt = activationResult.persistence_receipt;
  const authority = authorityFromActivationResultV1(activationResult);
  if (command.apply) {
    assertCondition(
      authority.quote_acceptance
        && authority.acceptance_persistence
        && authority.payment_authorization,
      "apply result did not activate the bounded acceptance/payment authority",
    );
  } else {
    assertCondition(
      Object.values(authority).every((value) => value === false),
      "dry-run result granted authority",
    );
  }

  return {
    marker:
      AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_RESULT_MARKER,
    version:
      AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_VERSION,
    status: activationResult.status,
    enabled: true,
    apply: command.apply,
    confirmation_verified: command.apply,
    trusted_context_loaded: true,
    trusted_context_provider_calls: 1,
    trusted_work_order_bound: true,
    trusted_quote_bound: true,
    store_inspected: true,
    current_generation_id_before: inspection.current_generation_id,
    current_parent_generation_id_before:
      inspection.current_parent_generation_id,
    current_transaction_id_before: inspection.current_transaction_id,
    generation_count_before: inspection.generation_count,
    exact_current_identity_detected: exactCurrentIdentity,
    transition_uses_parent_replay_state: exactCurrentIdentity,
    acceptance_revision_before: inspection.acceptance_state.revision,
    payment_revision_before: inspection.payment_state.revision,
    persistence_attempted: activationResult.persistence_attempted,
    persistence_status: receipt?.status ?? null,
    packet_id: activationResult.packet_id,
    acceptance_id: activationResult.acceptance_id,
    payment_intent_id: activationResult.payment_intent_id,
    transaction_id: activationResult.transaction_id,
    generation_id: receipt?.generation_id ?? null,
    acceptance_state_id_before: activationResult.before_acceptance_state_id,
    acceptance_state_id_after: activationResult.after_acceptance_state_id,
    payment_state_id_before: activationResult.before_payment_state_id,
    payment_state_id_after: activationResult.after_payment_state_id,
    activation_persistence_result: activationResult,
    authority,
  };
}

function readJsonFile(pathname: string): unknown {
  const resolved = path.resolve(pathname);
  const metadata = fs.lstatSync(resolved);
  assertCondition(
    metadata.isFile() && !metadata.isSymbolicLink(),
    "CLI JSON input must be a regular non-symlink file",
  );
  assertCondition(
    metadata.size <= MAX_COMMAND_JSON_BYTES,
    "CLI JSON input is too large",
  );
  return JSON.parse(fs.readFileSync(resolved, "utf8")) as unknown;
}

function usage(): never {
  return fail([
    "usage:",
    "  tsx scripts/authenticated_paid_work_quote_acceptance_payment_authority_activation_persistence_runtime_binding_v1.ts execute <config.json> <command.json> <trusted-context.json>",
  ].join("\n"));
}

function main(): void {
  const [mode, configPath, commandPath, trustedContextPath, ...extra] =
    process.argv.slice(2);
  assertCondition(extra.length === 0, "unexpected arguments");
  if (
    mode !== "execute"
      || !configPath
      || !commandPath
      || !trustedContextPath
  ) {
    usage();
  }
  const trustedContext = readJsonFile(trustedContextPath);
  const result = executeAuthenticatedPaidWorkActivationPersistenceRuntimeBindingV1(
    readJsonFile(configPath),
    readJsonFile(commandPath),
    () => trustedContext,
  );
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
