import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type {
  AcceptanceReplayStateV1,
  AcceptanceReplayTransactionV1,
  PublicAgentServiceAcceptanceMaterializationReplayConsumerPacketV1,
} from "./public_agent_service_acceptance_materialization_replay_consumer_v1.js";

export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_ADAPTER_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_ADAPTER_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_REQUEST_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_REQUEST_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RECEIPT_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RECEIPT_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_CURRENT_POINTER_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_CURRENT_POINTER_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_GENERATION_COMMIT_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_GENERATION_COMMIT_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_VERSION = 1 as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_CONFIRMATION =
  "persistVerifiedAcceptanceReplayTransitionV1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_GENERATION_ID_PREFIX =
  "voidawpg1_" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_POINTER_ID_PREFIX =
  "voidawpp1_" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_OPERATION_ID_PREFIX =
  "voidawpo1_" as const;

const CONSUMER_PACKET_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_CONSUMER_PACKET_V1";
const REPLAY_STATE_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_STATE_V1";
const REPLAY_TRANSACTION_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_TRANSACTION_V1";
const ACCEPTANCE_MARKER =
  "VOID_AGENT_PAID_WORK_ACCEPTANCE_ENVELOPE_V1";
const SOURCE_PACK_SHA256 =
  "4c9c495e74d12aa8b07383ee5af55694773f03d654385f9f6296aef5c5d853ec";
const SOURCE_COMMIT =
  "182228a1a9c4b31ec5ce9dc4b0fa1383938913df";
const DIAGNOSTIC_CORRECTION =
  "acceptance_specific_persistent_replay_consumer_not_found";
const LOCK_FILENAME =
  "acceptance-persistence-v1.lock";
const CURRENT_FILENAME = "current.json";
const GENERATIONS_DIRECTORY = "generations";
const STAGING_DIRECTORY = ".staging";
const ACCEPTANCE_FILENAME = "acceptance.json";
const REPLAY_STATE_FILENAME = "replay-state.json";
const TRANSACTION_FILENAME = "transaction.json";
const COMMIT_FILENAME = "commit.json";

const REQUESTER_AUTHENTICATION_ID_PATTERN = /^voidawra1_[0-9a-f]{64}$/;
const PROVIDER_AUTHENTICATION_ID_PATTERN = /^voidawqa1_[0-9a-f]{64}$/;
const ACCEPTANCE_ID_PATTERN = /^voidawa1_[0-9a-f]{64}$/;
const QUOTE_ID_PATTERN = /^voidawq1_[0-9a-f]{64}$/;
const WORK_ORDER_ID_PATTERN = /^voidawo1_[0-9a-f]{64}$/;
const REPLAY_STATE_ID_PATTERN = /^voidawrs1_[0-9a-f]{64}$/;
const REPLAY_TRANSACTION_ID_PATTERN = /^voidawact1_[0-9a-f]{64}$/;
const PLAN_ID_PATTERN = /^voidawacp1_[0-9a-f]{64}$/;
const GENERATION_ID_PATTERN = /^voidawpg1_[0-9a-f]{64}$/;
const POINTER_ID_PATTERN = /^voidawpp1_[0-9a-f]{64}$/;

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface PublicAgentServiceAcceptancePersistenceConfigV1 {
  marker: typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_ADAPTER_MARKER;
  version: typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_VERSION;
  allowed_root: string;
  max_pointer_bytes: number;
  max_generation_file_bytes: number;
  max_generation_count: number;
  recover_exact_orphaned_generation: boolean;
}

export interface PublicAgentServiceAcceptancePersistenceRequestV1 {
  marker: typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_REQUEST_MARKER;
  version: typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_VERSION;
  recorded_at_utc: string;
  confirmation: string;
}

export interface PublicAgentServiceAcceptancePersistenceTestHooksV1 {
  after_generation_published?: (
    generationDirectory: string,
  ) => void;
}

type AcceptanceEnvelopeV1 = Record<string, unknown> & {
  marker: typeof ACCEPTANCE_MARKER;
  version: 1;
  acceptance_id: string;
  work_order_id: string;
  quote_id: string;
  created_at_utc: string;
  expires_at_utc: string;
  requester: { agent_id: string };
  provider: {
    provider_id: string;
    capability_id: string;
  };
  commercial: {
    quote_asset: string;
    total: string;
    payment_rail_id: string;
  };
  terms: {
    quote_terms_accepted: true;
    requester_authentication_required: true;
    provider_authentication_required: true;
    separate_payment_authorization_required: true;
    separate_execution_authorization_required: true;
    acceptance_is_not_payment_instruction: true;
    acceptance_is_not_execution_instruction: true;
    acceptance_replay_protection_required: true;
    single_active_acceptance_per_quote_required: true;
    acceptance_is_not_funds_reservation: true;
    payment_authorization_granted: false;
    execution_authorization_granted: false;
  };
  nonce: string;
};

type GenerationCommitDraftV1 = {
  marker: typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_GENERATION_COMMIT_MARKER;
  version: typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_VERSION;
  parent_generation_id: string | null;
  transaction_id: string;
  acceptance_id: string;
  quote_id: string;
  before_state_id: string;
  after_state_id: string;
  before_revision: number;
  after_revision: number;
  acceptance_sha256: string;
  replay_state_sha256: string;
  transaction_sha256: string;
  recorded_at_utc: string;
};

type GenerationCommitV1 = GenerationCommitDraftV1 & {
  generation_id: string;
};

type CurrentPointerDraftV1 = {
  marker: typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_CURRENT_POINTER_MARKER;
  version: typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_VERSION;
  generation_id: string;
  transaction_id: string;
  acceptance_id: string;
  state_id: string;
  revision: number;
  generation_commit_sha256: string;
};

type CurrentPointerV1 = CurrentPointerDraftV1 & {
  pointer_id: string;
};

type VerifiedPacketV1 = {
  packet: PublicAgentServiceAcceptanceMaterializationReplayConsumerPacketV1;
  acceptance: AcceptanceEnvelopeV1;
  beforeState: AcceptanceReplayStateV1;
  nextState: AcceptanceReplayStateV1;
  transaction: AcceptanceReplayTransactionV1;
};

type LoadedGenerationV1 = {
  pointer: CurrentPointerV1;
  commit: GenerationCommitV1;
  acceptance: AcceptanceEnvelopeV1;
  replayState: AcceptanceReplayStateV1;
  transaction: AcceptanceReplayTransactionV1;
  generationDirectory: string;
};

export interface PublicAgentServiceAcceptancePersistenceReceiptV1 {
  marker: typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RECEIPT_MARKER;
  version: typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_VERSION;
  status: "committed" | "duplicate" | "recovered";
  operation_id: string;
  allowed_root_realpath: string;
  generation_id: string;
  parent_generation_id: string | null;
  pointer_id: string;
  transaction_id: string;
  acceptance_id: string;
  quote_id: string;
  before_state_id: string;
  after_state_id: string;
  before_revision: number;
  after_revision: number;
  atomic_consumption_count: 3;
  acceptance_persisted: true;
  requester_authentication_replay_persisted: true;
  provider_authentication_replay_persisted: true;
  acceptance_replay_persisted: true;
  single_active_acceptance_per_quote_enforced: true;
  immutable_generation_published: true;
  current_pointer_published: true;
  generation_recovered: boolean;
  exact_duplicate: boolean;
  lock_acquired: true;
  lock_released: true;
  generation_files_mode: "0600";
  store_directories_mode: "0700";
  generation_directory_fsync: true;
  generations_parent_fsync: true;
  current_pointer_fsync: true;
  root_directory_fsync: true;
  authority: {
    acceptance_persistence: true;
    quote_acceptance_recorded: true;
    requester_authentication_replay_write: true;
    provider_authentication_replay_write: true;
    acceptance_replay_write: true;
    payment_authorization: false;
    payment_execution: false;
    execution_authorization: false;
    work_dispatch: false;
    credential_issue: false;
    credential_change: false;
    provider_selection: false;
    requester_key_registry_write: false;
    provider_key_registry_write: false;
    wallet_access: false;
    production_signing: false;
    transaction_broadcast: false;
    work_credit_write: false;
    http_submission: false;
    runtime_mutation: false;
    money_movement: false;
  };
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

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
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
    JSON.stringify(actual) === JSON.stringify(expected),
    `${label} must contain exactly: ${expected.join(", ")}`,
  );
}

function requireString(
  value: unknown,
  label: string,
  minLength: number,
  maxLength: number,
): string {
  assertCondition(typeof value === "string", `${label} must be a string`);
  assertCondition(value === value.trim(), `${label} must be trimmed`);
  assertCondition(
    value.length >= minLength && value.length <= maxLength,
    `${label} length must be ${minLength}..${maxLength}`,
  );
  return value;
}

function requirePattern(
  value: unknown,
  label: string,
  pattern: RegExp,
  length: number,
): string {
  const text = requireString(value, label, length, length);
  assertCondition(pattern.test(text), `${label} has invalid format`);
  return text;
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
    `${label} must be an integer in ${minimum}..${maximum}`,
  );
  return value;
}

function requireBoolean(
  value: unknown,
  label: string,
): boolean {
  assertCondition(typeof value === "boolean", `${label} must be boolean`);
  return value;
}

function parseUtcSeconds(
  value: unknown,
  label: string,
): string {
  const text = requireString(value, label, 20, 20);
  assertCondition(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(text),
    `${label} must be second-precision UTC`,
  );
  const milliseconds = Date.parse(text);
  assertCondition(Number.isFinite(milliseconds), `${label} is invalid`);
  assertCondition(
    new Date(milliseconds).toISOString() === text.replace("Z", ".000Z"),
    `${label} is not canonical UTC`,
  );
  return text;
}

function canonicalize(value: unknown): JsonValue {
  if (
    value === null
    || typeof value === "string"
    || typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    assertCondition(
      Number.isFinite(value) && Number.isSafeInteger(value),
      "canonical JSON numbers must be finite safe integers",
    );
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  const record = requireRecord(value, "canonical JSON value");
  const result: { [key: string]: JsonValue } = {};
  for (const key of Object.keys(record).sort()) {
    assertCondition(record[key] !== undefined, "canonical JSON rejects undefined");
    result[key] = canonicalize(record[key]);
  }
  return result;
}

export function canonicalJsonV1(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function sha256Hex(value: string | Buffer): string {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

function compactJsonBytes(value: unknown): Buffer {
  return Buffer.from(`${canonicalJsonV1(value)}\n`, "utf8");
}

function appendSortedUnique(
  before: string[],
  value: string,
  label: string,
): string[] {
  assertCondition(!before.includes(value), `${label} replay detected`);
  return [...before, value].sort();
}

function validateSortedUniquePatterns(
  value: unknown,
  label: string,
  pattern: RegExp,
  length: number,
): string[] {
  assertCondition(Array.isArray(value), `${label} must be an array`);
  const normalized = value.map((item, index) =>
    requirePattern(item, `${label}[${index}]`, pattern, length),
  );
  assertCondition(
    JSON.stringify(normalized) === JSON.stringify([...normalized].sort()),
    `${label} must be sorted`,
  );
  assertCondition(
    new Set(normalized).size === normalized.length,
    `${label} must be unique`,
  );
  return normalized;
}

function replayStateIdV1(
  draft: Omit<AcceptanceReplayStateV1, "state_id">,
): string {
  return `voidawrs1_${sha256Hex(canonicalJsonV1(draft))}`;
}

function transactionIdV1(
  draft: Omit<AcceptanceReplayTransactionV1, "transaction_id">,
): string {
  return `voidawact1_${sha256Hex(canonicalJsonV1(draft))}`;
}

function acceptanceIdV1(
  envelope: AcceptanceEnvelopeV1,
): string {
  const { acceptance_id: _acceptanceId, ...draft } = envelope;
  return `voidawa1_${sha256Hex(canonicalJsonV1(draft))}`;
}

function planIdV1(
  requesterAuthenticationId: string,
  providerAuthenticationId: string,
  acceptanceId: string,
  replayStateId: string,
  expectedStateRevision: number,
): string {
  const draft = {
    marker:
      "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_PLAN_V1",
    version: 1,
    mode: "external_requester_evidence",
    requester_authentication_id: requesterAuthenticationId,
    provider_authentication_id: providerAuthenticationId,
    acceptance_id: acceptanceId,
    replay_state_id: replayStateId,
    expected_state_revision: expectedStateRevision,
  };
  return `voidawacp1_${sha256Hex(canonicalJsonV1(draft))}`;
}

function validateReplayStateV1(
  value: unknown,
  label: string,
): AcceptanceReplayStateV1 {
  const root = requireRecord(value, label);
  requireExactKeys(root, label, [
    "marker",
    "version",
    "revision",
    "consumed_requester_authentication_ids",
    "consumed_provider_authentication_ids",
    "consumed_acceptance_ids",
    "active_acceptance_by_quote",
    "state_id",
  ]);
  assertCondition(root.marker === REPLAY_STATE_MARKER, `${label} marker mismatch`);
  assertCondition(root.version === 1, `${label} version mismatch`);
  const revision = requireInteger(root.revision, `${label}.revision`, 0, 1_000_000);
  const requesterIds = validateSortedUniquePatterns(
    root.consumed_requester_authentication_ids,
    `${label}.consumed_requester_authentication_ids`,
    REQUESTER_AUTHENTICATION_ID_PATTERN,
    74,
  );
  const providerIds = validateSortedUniquePatterns(
    root.consumed_provider_authentication_ids,
    `${label}.consumed_provider_authentication_ids`,
    PROVIDER_AUTHENTICATION_ID_PATTERN,
    74,
  );
  const acceptanceIds = validateSortedUniquePatterns(
    root.consumed_acceptance_ids,
    `${label}.consumed_acceptance_ids`,
    ACCEPTANCE_ID_PATTERN,
    73,
  );
  const activeRoot = requireRecord(
    root.active_acceptance_by_quote,
    `${label}.active_acceptance_by_quote`,
  );
  const active: Record<string, string> = {};
  for (const quoteId of Object.keys(activeRoot).sort()) {
    requirePattern(quoteId, `${label}.quote_id`, QUOTE_ID_PATTERN, 73);
    active[quoteId] = requirePattern(
      activeRoot[quoteId],
      `${label}.active_acceptance_by_quote.${quoteId}`,
      ACCEPTANCE_ID_PATTERN,
      73,
    );
  }
  assertCondition(
    JSON.stringify(Object.keys(activeRoot)) === JSON.stringify(Object.keys(active)),
    `${label}.active_acceptance_by_quote keys must be sorted`,
  );
  const stateId = requirePattern(
    root.state_id,
    `${label}.state_id`,
    REPLAY_STATE_ID_PATTERN,
    74,
  );
  const draft = {
    marker: REPLAY_STATE_MARKER,
    version: 1 as const,
    revision,
    consumed_requester_authentication_ids: requesterIds,
    consumed_provider_authentication_ids: providerIds,
    consumed_acceptance_ids: acceptanceIds,
    active_acceptance_by_quote: active,
  };
  assertCondition(stateId === replayStateIdV1(draft), `${label}.state_id mismatch`);
  return { ...draft, state_id: stateId } as AcceptanceReplayStateV1;
}

function validateAcceptanceEnvelopeV1(
  value: unknown,
): AcceptanceEnvelopeV1 {
  const root = requireRecord(value, "acceptance envelope");
  requireExactKeys(root, "acceptance envelope", [
    "marker",
    "version",
    "work_order_id",
    "quote_id",
    "created_at_utc",
    "expires_at_utc",
    "requester",
    "provider",
    "commercial",
    "terms",
    "nonce",
    "acceptance_id",
  ]);
  assertCondition(root.marker === ACCEPTANCE_MARKER, "acceptance marker mismatch");
  assertCondition(root.version === 1, "acceptance version mismatch");
  requirePattern(root.work_order_id, "acceptance.work_order_id", WORK_ORDER_ID_PATTERN, 73);
  requirePattern(root.quote_id, "acceptance.quote_id", QUOTE_ID_PATTERN, 73);
  parseUtcSeconds(root.created_at_utc, "acceptance.created_at_utc");
  parseUtcSeconds(root.expires_at_utc, "acceptance.expires_at_utc");
  const requester = requireRecord(root.requester, "acceptance.requester");
  requireExactKeys(requester, "acceptance.requester", ["agent_id"]);
  requireString(requester.agent_id, "acceptance.requester.agent_id", 3, 128);
  const provider = requireRecord(root.provider, "acceptance.provider");
  requireExactKeys(provider, "acceptance.provider", ["provider_id", "capability_id"]);
  requireString(provider.provider_id, "acceptance.provider.provider_id", 3, 128);
  requireString(provider.capability_id, "acceptance.provider.capability_id", 3, 128);
  const commercial = requireRecord(root.commercial, "acceptance.commercial");
  requireExactKeys(commercial, "acceptance.commercial", [
    "quote_asset",
    "total",
    "payment_rail_id",
  ]);
  requireString(commercial.quote_asset, "acceptance.commercial.quote_asset", 1, 32);
  requireString(commercial.total, "acceptance.commercial.total", 1, 51);
  requireString(commercial.payment_rail_id, "acceptance.commercial.payment_rail_id", 3, 128);
  const terms = requireRecord(root.terms, "acceptance.terms");
  requireExactKeys(terms, "acceptance.terms", [
    "quote_terms_accepted",
    "requester_authentication_required",
    "provider_authentication_required",
    "separate_payment_authorization_required",
    "separate_execution_authorization_required",
    "acceptance_is_not_payment_instruction",
    "acceptance_is_not_execution_instruction",
    "acceptance_replay_protection_required",
    "single_active_acceptance_per_quote_required",
    "acceptance_is_not_funds_reservation",
    "payment_authorization_granted",
    "execution_authorization_granted",
  ]);
  for (const key of [
    "quote_terms_accepted",
    "requester_authentication_required",
    "provider_authentication_required",
    "separate_payment_authorization_required",
    "separate_execution_authorization_required",
    "acceptance_is_not_payment_instruction",
    "acceptance_is_not_execution_instruction",
    "acceptance_replay_protection_required",
    "single_active_acceptance_per_quote_required",
    "acceptance_is_not_funds_reservation",
  ]) {
    assertCondition(terms[key] === true, `acceptance.terms.${key} must be true`);
  }
  assertCondition(
    terms.payment_authorization_granted === false,
    "acceptance must not grant payment authorization",
  );
  assertCondition(
    terms.execution_authorization_granted === false,
    "acceptance must not grant execution authorization",
  );
  requireString(root.nonce, "acceptance.nonce", 16, 128);
  const acceptanceId = requirePattern(
    root.acceptance_id,
    "acceptance.acceptance_id",
    ACCEPTANCE_ID_PATTERN,
    73,
  );
  const envelope = root as AcceptanceEnvelopeV1;
  assertCondition(
    acceptanceId === acceptanceIdV1(envelope),
    "acceptance_id does not match canonical envelope",
  );
  return envelope;
}

function validateTransactionV1(
  value: unknown,
): AcceptanceReplayTransactionV1 {
  const root = requireRecord(value, "replay transaction");
  requireExactKeys(root, "replay transaction", [
    "marker",
    "version",
    "transaction_id",
    "before_state_id",
    "after_state_id",
    "before_revision",
    "after_revision",
    "requester_authentication_id",
    "provider_authentication_id",
    "acceptance_id",
    "quote_id",
    "work_order_id",
    "requester_agent_id",
    "atomic_consumption_count",
    "requester_authentication_consumed",
    "provider_authentication_consumed",
    "acceptance_id_consumed",
    "single_active_acceptance_per_quote_enforced",
  ]);
  assertCondition(root.marker === REPLAY_TRANSACTION_MARKER, "transaction marker mismatch");
  assertCondition(root.version === 1, "transaction version mismatch");
  const transactionId = requirePattern(
    root.transaction_id,
    "transaction.transaction_id",
    REPLAY_TRANSACTION_ID_PATTERN,
    75,
  );
  const transaction = {
    marker: REPLAY_TRANSACTION_MARKER,
    version: 1 as const,
    transaction_id: transactionId,
    before_state_id: requirePattern(root.before_state_id, "transaction.before_state_id", REPLAY_STATE_ID_PATTERN, 74),
    after_state_id: requirePattern(root.after_state_id, "transaction.after_state_id", REPLAY_STATE_ID_PATTERN, 74),
    before_revision: requireInteger(root.before_revision, "transaction.before_revision", 0, 1_000_000),
    after_revision: requireInteger(root.after_revision, "transaction.after_revision", 1, 1_000_001),
    requester_authentication_id: requirePattern(root.requester_authentication_id, "transaction.requester_authentication_id", REQUESTER_AUTHENTICATION_ID_PATTERN, 74),
    provider_authentication_id: requirePattern(root.provider_authentication_id, "transaction.provider_authentication_id", PROVIDER_AUTHENTICATION_ID_PATTERN, 74),
    acceptance_id: requirePattern(root.acceptance_id, "transaction.acceptance_id", ACCEPTANCE_ID_PATTERN, 73),
    quote_id: requirePattern(root.quote_id, "transaction.quote_id", QUOTE_ID_PATTERN, 73),
    work_order_id: requirePattern(root.work_order_id, "transaction.work_order_id", WORK_ORDER_ID_PATTERN, 73),
    requester_agent_id: requireString(root.requester_agent_id, "transaction.requester_agent_id", 3, 128),
    atomic_consumption_count: root.atomic_consumption_count,
    requester_authentication_consumed: root.requester_authentication_consumed,
    provider_authentication_consumed: root.provider_authentication_consumed,
    acceptance_id_consumed: root.acceptance_id_consumed,
    single_active_acceptance_per_quote_enforced: root.single_active_acceptance_per_quote_enforced,
  };
  assertCondition(transaction.atomic_consumption_count === 3, "transaction must consume three identities");
  assertCondition(transaction.requester_authentication_consumed === true, "requester authentication was not consumed");
  assertCondition(transaction.provider_authentication_consumed === true, "provider authentication was not consumed");
  assertCondition(transaction.acceptance_id_consumed === true, "acceptance ID was not consumed");
  assertCondition(transaction.single_active_acceptance_per_quote_enforced === true, "single-active acceptance was not enforced");
  assertCondition(
    transaction.after_revision === transaction.before_revision + 1,
    "transaction revision must advance exactly once",
  );
  const { transaction_id: _transactionId, ...draft } = transaction;
  assertCondition(
    transactionId === transactionIdV1(draft as Omit<AcceptanceReplayTransactionV1, "transaction_id">),
    "transaction_id mismatch",
  );
  return transaction as AcceptanceReplayTransactionV1;
}

export function validateVerifiedAcceptanceReplayConsumerPacketV1(
  value: unknown,
): VerifiedPacketV1 {
  const root = requireRecord(value, "verified consumer packet");
  requireExactKeys(root, "verified consumer packet", [
    "marker",
    "version",
    "plan_id",
    "status",
    "source_evidence",
    "source",
    "acceptance",
    "replay",
    "authority",
  ]);
  assertCondition(root.marker === CONSUMER_PACKET_MARKER, "consumer packet marker mismatch");
  assertCondition(root.version === 1, "consumer packet version mismatch");
  assertCondition(root.status === "acceptance_materialization_planned", "consumer packet is not persistence-eligible");
  const planId = requirePattern(root.plan_id, "consumer packet plan_id", PLAN_ID_PATTERN, 75);

  const sourceEvidence = requireRecord(root.source_evidence, "consumer packet source_evidence");
  requireExactKeys(sourceEvidence, "consumer packet source_evidence", [
    "source_pack_sha256",
    "source_commit",
    "diagnostic_correction",
    "canonical_acceptance_materializer_verified",
    "declarative_replay_requirements_verified",
    "production_persistence_consumer_verified",
  ]);
  assertCondition(sourceEvidence.source_pack_sha256 === SOURCE_PACK_SHA256, "source pack SHA mismatch");
  assertCondition(sourceEvidence.source_commit === SOURCE_COMMIT, "source commit mismatch");
  assertCondition(sourceEvidence.diagnostic_correction === DIAGNOSTIC_CORRECTION, "diagnostic correction mismatch");
  assertCondition(sourceEvidence.canonical_acceptance_materializer_verified === true, "canonical materializer not verified");
  assertCondition(sourceEvidence.declarative_replay_requirements_verified === true, "replay requirements not verified");
  assertCondition(sourceEvidence.production_persistence_consumer_verified === false, "upstream packet must not claim persistence");

  const source = requireRecord(root.source, "consumer packet source");
  requireExactKeys(source, "consumer packet source", [
    "requester_authentication_id",
    "provider_authentication_id",
    "handoff_id",
    "quote_id",
    "work_order_id",
    "requester_agent_id",
    "provider_id",
    "acceptance_nonce",
  ]);
  const requesterAuthenticationId = requirePattern(source.requester_authentication_id, "source.requester_authentication_id", REQUESTER_AUTHENTICATION_ID_PATTERN, 74);
  const providerAuthenticationId = requirePattern(source.provider_authentication_id, "source.provider_authentication_id", PROVIDER_AUTHENTICATION_ID_PATTERN, 74);
  const quoteId = requirePattern(source.quote_id, "source.quote_id", QUOTE_ID_PATTERN, 73);
  const workOrderId = requirePattern(source.work_order_id, "source.work_order_id", WORK_ORDER_ID_PATTERN, 73);
  const requesterAgentId = requireString(source.requester_agent_id, "source.requester_agent_id", 3, 128);
  const providerId = requireString(source.provider_id, "source.provider_id", 3, 128);
  const acceptanceNonce = requireString(source.acceptance_nonce, "source.acceptance_nonce", 16, 128);
  requireString(source.handoff_id, "source.handoff_id", 16, 128);

  const acceptanceRoot = requireRecord(root.acceptance, "consumer packet acceptance");
  requireExactKeys(acceptanceRoot, "consumer packet acceptance", [
    "preview_acceptance_id",
    "acceptance_id",
    "acceptance_materialized_in_memory",
    "acceptance_created_in_durable_state",
    "acceptance_envelope",
  ]);
  const previewAcceptanceId = requirePattern(acceptanceRoot.preview_acceptance_id, "acceptance.preview_acceptance_id", ACCEPTANCE_ID_PATTERN, 73);
  const acceptanceId = requirePattern(acceptanceRoot.acceptance_id, "acceptance.acceptance_id", ACCEPTANCE_ID_PATTERN, 73);
  assertCondition(previewAcceptanceId === acceptanceId, "acceptance preview and authoritative IDs differ");
  assertCondition(acceptanceRoot.acceptance_materialized_in_memory === true, "acceptance was not materialized in memory");
  assertCondition(acceptanceRoot.acceptance_created_in_durable_state === false, "upstream packet already claims durable acceptance");
  const acceptance = validateAcceptanceEnvelopeV1(acceptanceRoot.acceptance_envelope);

  const replayRoot = requireRecord(root.replay, "consumer packet replay");
  requireExactKeys(replayRoot, "consumer packet replay", [
    "before_state",
    "next_state",
    "transaction",
    "requester_authentication_replay_checked",
    "provider_authentication_replay_checked",
    "acceptance_replay_checked",
    "single_active_acceptance_per_quote_checked",
    "expected_revision_checked",
    "all_or_nothing_transition_verified",
    "production_persistence_consumer_verified",
  ]);
  const beforeState = validateReplayStateV1(replayRoot.before_state, "replay.before_state");
  const nextState = validateReplayStateV1(replayRoot.next_state, "replay.next_state");
  const transaction = validateTransactionV1(replayRoot.transaction);
  for (const key of [
    "requester_authentication_replay_checked",
    "provider_authentication_replay_checked",
    "acceptance_replay_checked",
    "single_active_acceptance_per_quote_checked",
    "expected_revision_checked",
    "all_or_nothing_transition_verified",
  ]) {
    assertCondition(replayRoot[key] === true, `replay.${key} must be true`);
  }
  assertCondition(replayRoot.production_persistence_consumer_verified === false, "upstream replay unexpectedly claims persistence");

  const authority = requireRecord(root.authority, "consumer packet authority");
  requireExactKeys(authority, "consumer packet authority", [
    "acceptance_persistence",
    "quote_acceptance",
    "requester_authentication_replay_write",
    "provider_authentication_replay_write",
    "acceptance_replay_write",
    "payment_authorization",
    "payment_execution",
    "execution_authorization",
    "work_dispatch",
    "credential_issue",
    "credential_change",
    "provider_selection",
    "requester_key_registry_write",
    "provider_key_registry_write",
    "wallet_access",
    "production_signing",
    "transaction_broadcast",
    "work_credit_write",
    "http_submission",
    "runtime_mutation",
    "money_movement",
  ]);
  assertCondition(
    Object.values(authority).every((item) => item === false),
    "upstream consumer packet gained authority",
  );

  assertCondition(acceptance.acceptance_id === acceptanceId, "acceptance envelope ID mismatch");
  assertCondition(acceptance.quote_id === quoteId, "acceptance quote mismatch");
  assertCondition(acceptance.work_order_id === workOrderId, "acceptance work-order mismatch");
  assertCondition(acceptance.requester.agent_id === requesterAgentId, "acceptance requester mismatch");
  assertCondition(acceptance.provider.provider_id === providerId, "acceptance provider mismatch");
  assertCondition(acceptance.nonce === acceptanceNonce, "acceptance nonce mismatch");

  assertCondition(transaction.requester_authentication_id === requesterAuthenticationId, "transaction requester-authentication mismatch");
  assertCondition(transaction.provider_authentication_id === providerAuthenticationId, "transaction provider-authentication mismatch");
  assertCondition(transaction.acceptance_id === acceptanceId, "transaction acceptance mismatch");
  assertCondition(transaction.quote_id === quoteId, "transaction quote mismatch");
  assertCondition(transaction.work_order_id === workOrderId, "transaction work-order mismatch");
  assertCondition(transaction.requester_agent_id === requesterAgentId, "transaction requester mismatch");
  assertCondition(transaction.before_state_id === beforeState.state_id, "transaction before-state mismatch");
  assertCondition(transaction.after_state_id === nextState.state_id, "transaction after-state mismatch");
  assertCondition(transaction.before_revision === beforeState.revision, "transaction before revision mismatch");
  assertCondition(transaction.after_revision === nextState.revision, "transaction after revision mismatch");

  assertCondition(
    JSON.stringify(nextState.consumed_requester_authentication_ids)
      === JSON.stringify(appendSortedUnique(beforeState.consumed_requester_authentication_ids, requesterAuthenticationId, "requester authentication")),
    "next state requester-authentication consumption mismatch",
  );
  assertCondition(
    JSON.stringify(nextState.consumed_provider_authentication_ids)
      === JSON.stringify(appendSortedUnique(beforeState.consumed_provider_authentication_ids, providerAuthenticationId, "provider authentication")),
    "next state provider-authentication consumption mismatch",
  );
  assertCondition(
    JSON.stringify(nextState.consumed_acceptance_ids)
      === JSON.stringify(appendSortedUnique(beforeState.consumed_acceptance_ids, acceptanceId, "acceptance")),
    "next state acceptance consumption mismatch",
  );
  assertCondition(
    beforeState.active_acceptance_by_quote[quoteId] === undefined,
    "quote already has an active acceptance in before state",
  );
  assertCondition(
    nextState.active_acceptance_by_quote[quoteId] === acceptanceId,
    "next state lacks the active acceptance",
  );
  const expectedActive = {
    ...beforeState.active_acceptance_by_quote,
    [quoteId]: acceptanceId,
  };
  assertCondition(
    canonicalJsonV1(nextState.active_acceptance_by_quote) === canonicalJsonV1(expectedActive),
    "next state active-acceptance map changed beyond one quote",
  );
  assertCondition(nextState.revision === beforeState.revision + 1, "next state revision must advance exactly once");
  assertCondition(
    planId === planIdV1(
      requesterAuthenticationId,
      providerAuthenticationId,
      acceptanceId,
      beforeState.state_id,
      beforeState.revision,
    ),
    "consumer plan_id mismatch",
  );

  return {
    packet: root as unknown as PublicAgentServiceAcceptanceMaterializationReplayConsumerPacketV1,
    acceptance,
    beforeState,
    nextState,
    transaction,
  };
}

export function validatePublicAgentServiceAcceptancePersistenceConfigV1(
  value: unknown,
): PublicAgentServiceAcceptancePersistenceConfigV1 {
  const root = requireRecord(value, "persistence config");
  requireExactKeys(root, "persistence config", [
    "marker",
    "version",
    "allowed_root",
    "max_pointer_bytes",
    "max_generation_file_bytes",
    "max_generation_count",
    "recover_exact_orphaned_generation",
  ]);
  assertCondition(root.marker === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_ADAPTER_MARKER, "persistence config marker mismatch");
  assertCondition(root.version === 1, "persistence config version mismatch");
  const allowedRoot = requireString(root.allowed_root, "allowed_root", 1, 4096);
  assertCondition(path.isAbsolute(allowedRoot), "allowed_root must be absolute");
  return {
    marker: PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_ADAPTER_MARKER,
    version: PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_VERSION,
    allowed_root: allowedRoot,
    max_pointer_bytes: requireInteger(root.max_pointer_bytes, "max_pointer_bytes", 1024, 1024 * 1024),
    max_generation_file_bytes: requireInteger(root.max_generation_file_bytes, "max_generation_file_bytes", 4096, 32 * 1024 * 1024),
    max_generation_count: requireInteger(root.max_generation_count, "max_generation_count", 1, 1_000_000),
    recover_exact_orphaned_generation: requireBoolean(root.recover_exact_orphaned_generation, "recover_exact_orphaned_generation"),
  };
}

function validateRequestV1(
  value: unknown,
): PublicAgentServiceAcceptancePersistenceRequestV1 {
  const root = requireRecord(value, "persistence request");
  requireExactKeys(root, "persistence request", [
    "marker",
    "version",
    "recorded_at_utc",
    "confirmation",
  ]);
  assertCondition(root.marker === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_REQUEST_MARKER, "persistence request marker mismatch");
  assertCondition(root.version === 1, "persistence request version mismatch");
  const confirmation = requireString(root.confirmation, "confirmation", 1, 128);
  assertCondition(
    confirmation === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_CONFIRMATION,
    `confirmation must be ${PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_CONFIRMATION}`,
  );
  return {
    marker: PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_REQUEST_MARKER,
    version: PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_VERSION,
    recorded_at_utc: parseUtcSeconds(root.recorded_at_utc, "recorded_at_utc"),
    confirmation,
  };
}

function modeBits(stat: fs.Stats): number {
  return stat.mode & 0o777;
}

function assertMode(
  stat: fs.Stats,
  expected: number,
  label: string,
): void {
  assertCondition(modeBits(stat) === expected, `${label} mode must be ${expected.toString(8).padStart(4, "0")}`);
}

function assertRegularFile(
  file: string,
  label: string,
  expectedMode = 0o600,
): fs.Stats {
  const stat = fs.lstatSync(file);
  assertCondition(!stat.isSymbolicLink(), `${label} must not be a symlink`);
  assertCondition(stat.isFile(), `${label} must be a regular file`);
  assertMode(stat, expectedMode, label);
  return stat;
}

function assertDirectory(
  directory: string,
  label: string,
  expectedMode?: number,
): fs.Stats {
  const stat = fs.lstatSync(directory);
  assertCondition(!stat.isSymbolicLink(), `${label} must not be a symlink`);
  assertCondition(stat.isDirectory(), `${label} must be a directory`);
  if (expectedMode !== undefined) assertMode(stat, expectedMode, label);
  return stat;
}

function assertSameFilesystemIdentity(
  target: string,
  expected: fs.Stats,
  label: string,
): void {
  const current = fs.lstatSync(target);
  assertCondition(
    current.dev === expected.dev
      && current.ino === expected.ino,
    `${label} filesystem identity changed`,
  );
}

function containedPath(
  rootRealpath: string,
  ...parts: string[]
): string {
  const candidate = path.resolve(rootRealpath, ...parts);
  const relative = path.relative(rootRealpath, candidate);
  assertCondition(
    relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative),
    "resolved persistence path escapes allowed_root",
  );
  return candidate;
}

function fsyncDirectory(directory: string): void {
  const fd = fs.openSync(directory, fs.constants.O_RDONLY);
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function ensurePrivateDirectory(
  directory: string,
  parent: string,
): void {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { mode: 0o700 });
    fsyncDirectory(parent);
  }
  assertDirectory(directory, directory, 0o700);
}

function noFollowFlag(): number {
  return typeof fs.constants.O_NOFOLLOW === "number"
    ? fs.constants.O_NOFOLLOW
    : 0;
}

function writeExclusiveJsonFile(
  file: string,
  value: unknown,
): Buffer {
  const bytes = compactJsonBytes(value);
  const fd = fs.openSync(
    file,
    fs.constants.O_CREAT
      | fs.constants.O_EXCL
      | fs.constants.O_WRONLY
      | noFollowFlag(),
    0o600,
  );
  try {
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  assertRegularFile(file, file, 0o600);
  return bytes;
}

function boundedReadJson(
  file: string,
  maxBytes: number,
  label: string,
): unknown {
  const stat = assertRegularFile(file, label, 0o600);
  assertCondition(stat.size > 0 && stat.size <= maxBytes, `${label} exceeds bounded size`);
  const bytes = fs.readFileSync(file);
  assertCondition(bytes[bytes.length - 1] === 0x0a, `${label} must end in one complete newline`);
  const text = bytes.toString("utf8");
  assertCondition(!text.slice(0, -1).includes("\n"), `${label} must contain one compact JSON document`);
  return JSON.parse(text) as unknown;
}

function acquireLock(
  rootRealpath: string,
  operationId: string,
  recordedAtUtc: string,
): { file: string; stat: fs.Stats } {
  const file = containedPath(rootRealpath, LOCK_FILENAME);
  if (fs.existsSync(file)) {
    const existing = fs.lstatSync(file);
    assertCondition(!existing.isSymbolicLink(), "lock path must not be a symlink");
    assertCondition(existing.isFile(), "lock path must be a regular file");
    fail("lock_busy");
  }
  writeExclusiveJsonFile(file, {
    marker: "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_LOCK_V1",
    version: 1,
    operation_id: operationId,
    recorded_at_utc: recordedAtUtc,
    pid: process.pid,
  });
  fsyncDirectory(rootRealpath);
  return { file, stat: assertRegularFile(file, "persistence lock", 0o600) };
}

function releaseLock(
  rootRealpath: string,
  lock: { file: string; stat: fs.Stats },
): void {
  const current = assertRegularFile(lock.file, "persistence lock", 0o600);
  assertCondition(
    current.ino === lock.stat.ino && current.dev === lock.stat.dev,
    "persistence lock identity changed",
  );
  fs.unlinkSync(lock.file);
  fsyncDirectory(rootRealpath);
}

function validateCurrentPointerV1(
  value: unknown,
): CurrentPointerV1 {
  const root = requireRecord(value, "current pointer");
  requireExactKeys(root, "current pointer", [
    "marker",
    "version",
    "generation_id",
    "transaction_id",
    "acceptance_id",
    "state_id",
    "revision",
    "generation_commit_sha256",
    "pointer_id",
  ]);
  assertCondition(root.marker === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_CURRENT_POINTER_MARKER, "current pointer marker mismatch");
  assertCondition(root.version === 1, "current pointer version mismatch");
  const pointerId = requirePattern(root.pointer_id, "current pointer pointer_id", POINTER_ID_PATTERN, 74);
  const draft: CurrentPointerDraftV1 = {
    marker: PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_CURRENT_POINTER_MARKER,
    version: PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_VERSION,
    generation_id: requirePattern(root.generation_id, "current pointer generation_id", GENERATION_ID_PATTERN, 74),
    transaction_id: requirePattern(root.transaction_id, "current pointer transaction_id", REPLAY_TRANSACTION_ID_PATTERN, 75),
    acceptance_id: requirePattern(root.acceptance_id, "current pointer acceptance_id", ACCEPTANCE_ID_PATTERN, 73),
    state_id: requirePattern(root.state_id, "current pointer state_id", REPLAY_STATE_ID_PATTERN, 74),
    revision: requireInteger(root.revision, "current pointer revision", 1, 1_000_000),
    generation_commit_sha256: requirePattern(root.generation_commit_sha256, "current pointer generation_commit_sha256", /^[0-9a-f]{64}$/, 64),
  };
  assertCondition(
    pointerId === `${PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_POINTER_ID_PREFIX}${sha256Hex(canonicalJsonV1(draft))}`,
    "current pointer pointer_id mismatch",
  );
  return { ...draft, pointer_id: pointerId };
}

function validateGenerationCommitV1(
  value: unknown,
): GenerationCommitV1 {
  const root = requireRecord(value, "generation commit");
  requireExactKeys(root, "generation commit", [
    "marker",
    "version",
    "parent_generation_id",
    "transaction_id",
    "acceptance_id",
    "quote_id",
    "before_state_id",
    "after_state_id",
    "before_revision",
    "after_revision",
    "acceptance_sha256",
    "replay_state_sha256",
    "transaction_sha256",
    "recorded_at_utc",
    "generation_id",
  ]);
  assertCondition(root.marker === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_GENERATION_COMMIT_MARKER, "generation commit marker mismatch");
  assertCondition(root.version === 1, "generation commit version mismatch");
  const parentGenerationId = root.parent_generation_id === null
    ? null
    : requirePattern(root.parent_generation_id, "generation commit parent_generation_id", GENERATION_ID_PATTERN, 74);
  const generationId = requirePattern(root.generation_id, "generation commit generation_id", GENERATION_ID_PATTERN, 74);
  const draft: GenerationCommitDraftV1 = {
    marker: PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_GENERATION_COMMIT_MARKER,
    version: PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_VERSION,
    parent_generation_id: parentGenerationId,
    transaction_id: requirePattern(root.transaction_id, "generation commit transaction_id", REPLAY_TRANSACTION_ID_PATTERN, 75),
    acceptance_id: requirePattern(root.acceptance_id, "generation commit acceptance_id", ACCEPTANCE_ID_PATTERN, 73),
    quote_id: requirePattern(root.quote_id, "generation commit quote_id", QUOTE_ID_PATTERN, 73),
    before_state_id: requirePattern(root.before_state_id, "generation commit before_state_id", REPLAY_STATE_ID_PATTERN, 74),
    after_state_id: requirePattern(root.after_state_id, "generation commit after_state_id", REPLAY_STATE_ID_PATTERN, 74),
    before_revision: requireInteger(root.before_revision, "generation commit before_revision", 0, 1_000_000),
    after_revision: requireInteger(root.after_revision, "generation commit after_revision", 1, 1_000_001),
    acceptance_sha256: requirePattern(root.acceptance_sha256, "generation commit acceptance_sha256", /^[0-9a-f]{64}$/, 64),
    replay_state_sha256: requirePattern(root.replay_state_sha256, "generation commit replay_state_sha256", /^[0-9a-f]{64}$/, 64),
    transaction_sha256: requirePattern(root.transaction_sha256, "generation commit transaction_sha256", /^[0-9a-f]{64}$/, 64),
    recorded_at_utc: parseUtcSeconds(root.recorded_at_utc, "generation commit recorded_at_utc"),
  };
  const identityDraft = {
    marker: PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_GENERATION_COMMIT_MARKER,
    version: PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_VERSION,
    parent_generation_id: draft.parent_generation_id,
    transaction_id: draft.transaction_id,
    acceptance_id: draft.acceptance_id,
    quote_id: draft.quote_id,
    before_state_id: draft.before_state_id,
    after_state_id: draft.after_state_id,
    before_revision: draft.before_revision,
    after_revision: draft.after_revision,
    acceptance_sha256: draft.acceptance_sha256,
    replay_state_sha256: draft.replay_state_sha256,
    transaction_sha256: draft.transaction_sha256,
  };
  assertCondition(
    generationId === `${PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_GENERATION_ID_PREFIX}${sha256Hex(canonicalJsonV1(identityDraft))}`,
    "generation_id mismatch",
  );
  return { ...draft, generation_id: generationId };
}

function generationIdentityV1(
  parentGenerationId: string | null,
  verified: VerifiedPacketV1,
): {
  generationId: string;
  acceptanceBytes: Buffer;
  replayBytes: Buffer;
  transactionBytes: Buffer;
  identityDraft: Omit<GenerationCommitDraftV1, "recorded_at_utc">;
} {
  const acceptanceBytes = compactJsonBytes(verified.acceptance);
  const replayBytes = compactJsonBytes(verified.nextState);
  const transactionBytes = compactJsonBytes(verified.transaction);
  const identityDraft = {
    marker: PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_GENERATION_COMMIT_MARKER,
    version: PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_VERSION,
    parent_generation_id: parentGenerationId,
    transaction_id: verified.transaction.transaction_id,
    acceptance_id: verified.acceptance.acceptance_id,
    quote_id: verified.acceptance.quote_id,
    before_state_id: verified.beforeState.state_id,
    after_state_id: verified.nextState.state_id,
    before_revision: verified.beforeState.revision,
    after_revision: verified.nextState.revision,
    acceptance_sha256: sha256Hex(acceptanceBytes),
    replay_state_sha256: sha256Hex(replayBytes),
    transaction_sha256: sha256Hex(transactionBytes),
  };
  return {
    generationId: `${PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_GENERATION_ID_PREFIX}${sha256Hex(canonicalJsonV1(identityDraft))}`,
    acceptanceBytes,
    replayBytes,
    transactionBytes,
    identityDraft,
  };
}

function loadGenerationV1(
  rootRealpath: string,
  config: PublicAgentServiceAcceptancePersistenceConfigV1,
  pointer: CurrentPointerV1,
): LoadedGenerationV1 {
  const generationsDirectory = containedPath(rootRealpath, GENERATIONS_DIRECTORY);
  assertDirectory(generationsDirectory, "generations directory", 0o700);
  const generationDirectory = containedPath(generationsDirectory, pointer.generation_id);
  assertDirectory(generationDirectory, "current generation directory", 0o700);
  const acceptanceFile = containedPath(generationDirectory, ACCEPTANCE_FILENAME);
  const replayFile = containedPath(generationDirectory, REPLAY_STATE_FILENAME);
  const transactionFile = containedPath(generationDirectory, TRANSACTION_FILENAME);
  const commitFile = containedPath(generationDirectory, COMMIT_FILENAME);
  const acceptance = validateAcceptanceEnvelopeV1(
    boundedReadJson(acceptanceFile, config.max_generation_file_bytes, "persisted acceptance"),
  );
  const replayState = validateReplayStateV1(
    boundedReadJson(replayFile, config.max_generation_file_bytes, "persisted replay state"),
    "persisted replay state",
  );
  const transaction = validateTransactionV1(
    boundedReadJson(transactionFile, config.max_generation_file_bytes, "persisted transaction"),
  );
  const commitBytes = fs.readFileSync(commitFile);
  const commit = validateGenerationCommitV1(
    boundedReadJson(commitFile, config.max_generation_file_bytes, "generation commit"),
  );
  assertCondition(sha256Hex(commitBytes) === pointer.generation_commit_sha256, "current pointer commit SHA mismatch");
  assertCondition(commit.generation_id === pointer.generation_id, "current pointer generation mismatch");
  assertCondition(commit.transaction_id === pointer.transaction_id, "current pointer transaction mismatch");
  assertCondition(commit.acceptance_id === pointer.acceptance_id, "current pointer acceptance mismatch");
  assertCondition(commit.after_state_id === pointer.state_id, "current pointer state mismatch");
  assertCondition(commit.after_revision === pointer.revision, "current pointer revision mismatch");
  assertCondition(sha256Hex(fs.readFileSync(acceptanceFile)) === commit.acceptance_sha256, "persisted acceptance SHA mismatch");
  assertCondition(sha256Hex(fs.readFileSync(replayFile)) === commit.replay_state_sha256, "persisted replay-state SHA mismatch");
  assertCondition(sha256Hex(fs.readFileSync(transactionFile)) === commit.transaction_sha256, "persisted transaction SHA mismatch");
  assertCondition(acceptance.acceptance_id === commit.acceptance_id, "persisted acceptance does not match commit");
  assertCondition(replayState.state_id === commit.after_state_id, "persisted replay state does not match commit");
  assertCondition(transaction.transaction_id === commit.transaction_id, "persisted transaction does not match commit");
  return { pointer, commit, acceptance, replayState, transaction, generationDirectory };
}

export function inspectPublicAgentServiceAcceptancePersistenceStoreV1(
  configValue: unknown,
): {
  root_realpath: string;
  current: LoadedGenerationV1 | null;
  generation_count: number;
} {
  const config = validatePublicAgentServiceAcceptancePersistenceConfigV1(configValue);
  const rootStat = assertDirectory(config.allowed_root, "allowed_root");
  assertCondition(!rootStat.isSymbolicLink(), "allowed_root must not be a symlink");
  const rootRealpath = fs.realpathSync(config.allowed_root);
  assertCondition(rootRealpath === path.resolve(config.allowed_root), "allowed_root must already be canonical");
  const generationsDirectory = containedPath(rootRealpath, GENERATIONS_DIRECTORY);
  const stagingDirectory = containedPath(rootRealpath, STAGING_DIRECTORY);
  const generationCount = fs.existsSync(generationsDirectory)
    ? (assertDirectory(generationsDirectory, "generations directory", 0o700), fs.readdirSync(generationsDirectory).length)
    : 0;
  assertCondition(generationCount <= config.max_generation_count, "generation count exceeds configured bound");
  if (fs.existsSync(stagingDirectory)) {
    assertDirectory(stagingDirectory, "staging directory", 0o700);
    const stagingEntries = fs.readdirSync(stagingDirectory);
    assertCondition(stagingEntries.length === 0, "unresolved staging directory requires operator review");
  }
  const currentFile = containedPath(rootRealpath, CURRENT_FILENAME);
  if (!fs.existsSync(currentFile)) {
    return { root_realpath: rootRealpath, current: null, generation_count: generationCount };
  }
  const pointer = validateCurrentPointerV1(
    boundedReadJson(currentFile, config.max_pointer_bytes, "current pointer"),
  );
  return {
    root_realpath: rootRealpath,
    current: loadGenerationV1(rootRealpath, config, pointer),
    generation_count: generationCount,
  };
}

function compareStateExact(
  actual: AcceptanceReplayStateV1,
  expected: AcceptanceReplayStateV1,
  label: string,
): void {
  assertCondition(
    canonicalJsonV1(actual) === canonicalJsonV1(expected),
    `${label} replay state mismatch`,
  );
}

function validateExistingGenerationAgainstExpected(
  generationDirectory: string,
  config: PublicAgentServiceAcceptancePersistenceConfigV1,
  expectedGenerationId: string,
  expectedParentGenerationId: string | null,
  verified: VerifiedPacketV1,
): GenerationCommitV1 {
  assertDirectory(generationDirectory, "existing generation directory", 0o700);
  const commit = validateGenerationCommitV1(
    boundedReadJson(
      containedPath(generationDirectory, COMMIT_FILENAME),
      config.max_generation_file_bytes,
      "existing generation commit",
    ),
  );
  assertCondition(commit.generation_id === expectedGenerationId, "existing generation ID mismatch");
  assertCondition(commit.parent_generation_id === expectedParentGenerationId, "existing generation parent mismatch");
  assertCondition(commit.transaction_id === verified.transaction.transaction_id, "existing generation transaction mismatch");
  assertCondition(commit.acceptance_id === verified.acceptance.acceptance_id, "existing generation acceptance mismatch");
  const identity = generationIdentityV1(expectedParentGenerationId, verified);
  assertCondition(commit.acceptance_sha256 === sha256Hex(identity.acceptanceBytes), "existing generation acceptance SHA mismatch");
  assertCondition(commit.replay_state_sha256 === sha256Hex(identity.replayBytes), "existing generation replay SHA mismatch");
  assertCondition(commit.transaction_sha256 === sha256Hex(identity.transactionBytes), "existing generation transaction SHA mismatch");
  const acceptanceFile = containedPath(generationDirectory, ACCEPTANCE_FILENAME);
  const replayFile = containedPath(generationDirectory, REPLAY_STATE_FILENAME);
  const transactionFile = containedPath(generationDirectory, TRANSACTION_FILENAME);
  validateAcceptanceEnvelopeV1(
    boundedReadJson(acceptanceFile, config.max_generation_file_bytes, "existing generation acceptance"),
  );
  validateReplayStateV1(
    boundedReadJson(replayFile, config.max_generation_file_bytes, "existing generation replay state"),
    "existing generation replay state",
  );
  validateTransactionV1(
    boundedReadJson(transactionFile, config.max_generation_file_bytes, "existing generation transaction"),
  );
  const acceptanceBytes = fs.readFileSync(acceptanceFile);
  const replayBytes = fs.readFileSync(replayFile);
  const transactionBytes = fs.readFileSync(transactionFile);
  assertCondition(sha256Hex(acceptanceBytes) === commit.acceptance_sha256, "existing generation acceptance file changed");
  assertCondition(sha256Hex(replayBytes) === commit.replay_state_sha256, "existing generation replay file changed");
  assertCondition(sha256Hex(transactionBytes) === commit.transaction_sha256, "existing generation transaction file changed");
  return commit;
}

function operationIdV1(
  generationId: string,
  recordedAtUtc: string,
): string {
  const draft = {
    marker: "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_OPERATION_V1",
    version: 1,
    generation_id: generationId,
    recorded_at_utc: recordedAtUtc,
  };
  return `${PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_OPERATION_ID_PREFIX}${sha256Hex(canonicalJsonV1(draft))}`;
}

function publishCurrentPointer(
  rootRealpath: string,
  operationId: string,
  generationId: string,
  commit: GenerationCommitV1,
  commitBytes: Buffer,
  expectedCurrentPointerId: string | null,
  maxPointerBytes: number,
): CurrentPointerV1 {
  const draft: CurrentPointerDraftV1 = {
    marker: PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_CURRENT_POINTER_MARKER,
    version: PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_VERSION,
    generation_id: generationId,
    transaction_id: commit.transaction_id,
    acceptance_id: commit.acceptance_id,
    state_id: commit.after_state_id,
    revision: commit.after_revision,
    generation_commit_sha256: sha256Hex(commitBytes),
  };
  const pointer: CurrentPointerV1 = {
    ...draft,
    pointer_id: `${PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_POINTER_ID_PREFIX}${sha256Hex(canonicalJsonV1(draft))}`,
  };
  const temporary = containedPath(rootRealpath, `.current.${operationId}.tmp`);
  const current = containedPath(rootRealpath, CURRENT_FILENAME);
  assertCondition(!fs.existsSync(temporary), "current pointer temporary path already exists");
  if (expectedCurrentPointerId === null) {
    assertCondition(!fs.existsSync(current), "current pointer unexpectedly appeared before publish");
  } else {
    assertCondition(fs.existsSync(current), "current pointer disappeared before publish");
    const currentBeforePublish = validateCurrentPointerV1(
      boundedReadJson(current, maxPointerBytes, "current pointer before publish"),
    );
    assertCondition(
      currentBeforePublish.pointer_id === expectedCurrentPointerId,
      "current pointer changed before atomic publish",
    );
  }
  writeExclusiveJsonFile(temporary, pointer);
  fs.renameSync(temporary, current);
  fsyncDirectory(rootRealpath);
  return pointer;
}

function receiptV1(
  status: PublicAgentServiceAcceptancePersistenceReceiptV1["status"],
  operationId: string,
  rootRealpath: string,
  generationId: string,
  parentGenerationId: string | null,
  pointer: CurrentPointerV1,
  verified: VerifiedPacketV1,
): PublicAgentServiceAcceptancePersistenceReceiptV1 {
  return {
    marker: PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RECEIPT_MARKER,
    version: PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_VERSION,
    status,
    operation_id: operationId,
    allowed_root_realpath: rootRealpath,
    generation_id: generationId,
    parent_generation_id: parentGenerationId,
    pointer_id: pointer.pointer_id,
    transaction_id: verified.transaction.transaction_id,
    acceptance_id: verified.acceptance.acceptance_id,
    quote_id: verified.acceptance.quote_id,
    before_state_id: verified.beforeState.state_id,
    after_state_id: verified.nextState.state_id,
    before_revision: verified.beforeState.revision,
    after_revision: verified.nextState.revision,
    atomic_consumption_count: 3,
    acceptance_persisted: true,
    requester_authentication_replay_persisted: true,
    provider_authentication_replay_persisted: true,
    acceptance_replay_persisted: true,
    single_active_acceptance_per_quote_enforced: true,
    immutable_generation_published: true,
    current_pointer_published: true,
    generation_recovered: status === "recovered",
    exact_duplicate: status === "duplicate",
    lock_acquired: true,
    lock_released: true,
    generation_files_mode: "0600",
    store_directories_mode: "0700",
    generation_directory_fsync: true,
    generations_parent_fsync: true,
    current_pointer_fsync: true,
    root_directory_fsync: true,
    authority: {
      acceptance_persistence: true,
      quote_acceptance_recorded: true,
      requester_authentication_replay_write: true,
      provider_authentication_replay_write: true,
      acceptance_replay_write: true,
      payment_authorization: false,
      payment_execution: false,
      execution_authorization: false,
      work_dispatch: false,
      credential_issue: false,
      credential_change: false,
      provider_selection: false,
      requester_key_registry_write: false,
      provider_key_registry_write: false,
      wallet_access: false,
      production_signing: false,
      transaction_broadcast: false,
      work_credit_write: false,
      http_submission: false,
      runtime_mutation: false,
      money_movement: false,
    },
  };
}

export function persistVerifiedPublicAgentServiceAcceptanceV1(
  configValue: unknown,
  requestValue: unknown,
  verifiedPacketProvider: () => unknown,
  testHooks: PublicAgentServiceAcceptancePersistenceTestHooksV1 = {},
): PublicAgentServiceAcceptancePersistenceReceiptV1 {
  const request = validateRequestV1(requestValue);
  const config = validatePublicAgentServiceAcceptancePersistenceConfigV1(configValue);
  assertCondition(typeof verifiedPacketProvider === "function", "verified packet provider is required");
  const verified = validateVerifiedAcceptanceReplayConsumerPacketV1(
    verifiedPacketProvider(),
  );

  const rootStat = assertDirectory(config.allowed_root, "allowed_root");
  assertCondition(!rootStat.isSymbolicLink(), "allowed_root must not be a symlink");
  const rootRealpath = fs.realpathSync(config.allowed_root);
  assertCondition(rootRealpath === path.resolve(config.allowed_root), "allowed_root must already be canonical");
  const rootIdentity = assertDirectory(rootRealpath, "allowed_root canonical directory");

  const generationsDirectory = containedPath(rootRealpath, GENERATIONS_DIRECTORY);
  const stagingDirectory = containedPath(rootRealpath, STAGING_DIRECTORY);
  ensurePrivateDirectory(generationsDirectory, rootRealpath);
  ensurePrivateDirectory(stagingDirectory, rootRealpath);
  assertCondition(fs.readdirSync(stagingDirectory).length === 0, "unresolved staging directory requires operator review");
  assertCondition(
    fs.readdirSync(generationsDirectory).length <= config.max_generation_count,
    "generation count exceeds configured bound",
  );

  const initialInspection = inspectPublicAgentServiceAcceptancePersistenceStoreV1(config);
  const initialDuplicate =
    initialInspection.current?.pointer.transaction_id
      === verified.transaction.transaction_id;
  const parentGenerationId = initialDuplicate
    ? initialInspection.current?.commit.parent_generation_id ?? null
    : initialInspection.current?.pointer.generation_id ?? null;
  const identity = generationIdentityV1(parentGenerationId, verified);
  if (initialDuplicate) {
    assertCondition(
      initialInspection.current?.pointer.generation_id === identity.generationId,
      "existing duplicate generation identity mismatch",
    );
  }
  const operationId = operationIdV1(identity.generationId, request.recorded_at_utc);
  const lock = acquireLock(rootRealpath, operationId, request.recorded_at_utc);
  let released = false;

  try {
    const inspection = inspectPublicAgentServiceAcceptancePersistenceStoreV1(config);
    const current = inspection.current;

    if (current?.pointer.transaction_id === verified.transaction.transaction_id) {
      assertCondition(current.pointer.generation_id === identity.generationId, "duplicate transaction points to another generation");
      assertCondition(current.pointer.acceptance_id === verified.acceptance.acceptance_id, "duplicate transaction acceptance mismatch");
      compareStateExact(current.replayState, verified.nextState, "duplicate committed");
      releaseLock(rootRealpath, lock);
      released = true;
      return receiptV1(
        "duplicate",
        operationId,
        rootRealpath,
        identity.generationId,
        parentGenerationId,
        current.pointer,
        verified,
      );
    }

    if (current === null) {
      assertCondition(verified.beforeState.revision === 0, "empty store requires replay revision zero");
      assertCondition(verified.beforeState.consumed_requester_authentication_ids.length === 0, "empty store requires no requester replay history");
      assertCondition(verified.beforeState.consumed_provider_authentication_ids.length === 0, "empty store requires no provider replay history");
      assertCondition(verified.beforeState.consumed_acceptance_ids.length === 0, "empty store requires no acceptance replay history");
      assertCondition(Object.keys(verified.beforeState.active_acceptance_by_quote).length === 0, "empty store requires no active acceptance");
    } else {
      compareStateExact(current.replayState, verified.beforeState, "compare-and-swap before");
    }

    const actualParent = current?.pointer.generation_id ?? null;
    assertCondition(actualParent === parentGenerationId, "persistence parent changed after lock acquisition");
    const recalculated = generationIdentityV1(actualParent, verified);
    assertCondition(recalculated.generationId === identity.generationId, "generation identity changed after lock acquisition");

    const finalGenerationDirectory = containedPath(generationsDirectory, identity.generationId);
    let generationRecovered = false;
    let commit: GenerationCommitV1;
    let commitBytes: Buffer;

    if (fs.existsSync(finalGenerationDirectory)) {
      assertCondition(config.recover_exact_orphaned_generation, "exact orphaned-generation recovery is disabled");
      commit = validateExistingGenerationAgainstExpected(
        finalGenerationDirectory,
        config,
        identity.generationId,
        actualParent,
        verified,
      );
      commitBytes = fs.readFileSync(containedPath(finalGenerationDirectory, COMMIT_FILENAME));
      generationRecovered = true;
    } else {
      assertCondition(
        fs.readdirSync(generationsDirectory).length < config.max_generation_count,
        "generation count reached configured bound",
      );
      const stageDirectory = containedPath(stagingDirectory, `${identity.generationId}.${operationId}`);
      assertCondition(!fs.existsSync(stageDirectory), "staging operation already exists");
      fs.mkdirSync(stageDirectory, { mode: 0o700 });
      assertDirectory(stageDirectory, "stage directory", 0o700);
      try {
        writeExclusiveJsonFile(containedPath(stageDirectory, ACCEPTANCE_FILENAME), verified.acceptance);
        writeExclusiveJsonFile(containedPath(stageDirectory, REPLAY_STATE_FILENAME), verified.nextState);
        writeExclusiveJsonFile(containedPath(stageDirectory, TRANSACTION_FILENAME), verified.transaction);
        const commitDraft: GenerationCommitDraftV1 = {
          ...identity.identityDraft,
          recorded_at_utc: request.recorded_at_utc,
        };
        commit = {
          ...commitDraft,
          generation_id: identity.generationId,
        };
        commitBytes = writeExclusiveJsonFile(containedPath(stageDirectory, COMMIT_FILENAME), commit);
        fsyncDirectory(stageDirectory);
        fs.renameSync(stageDirectory, finalGenerationDirectory);
        fsyncDirectory(generationsDirectory);
      } catch (error) {
        if (fs.existsSync(stageDirectory)) fs.rmSync(stageDirectory, { recursive: true, force: true });
        throw error;
      }
      if (testHooks.after_generation_published) {
        testHooks.after_generation_published(finalGenerationDirectory);
      }
    }

    assertSameFilesystemIdentity(
      rootRealpath,
      rootIdentity,
      "allowed_root",
    );
    const pointer = publishCurrentPointer(
      rootRealpath,
      operationId,
      identity.generationId,
      commit,
      commitBytes,
      current?.pointer.pointer_id ?? null,
      config.max_pointer_bytes,
    );
    const finalInspection = inspectPublicAgentServiceAcceptancePersistenceStoreV1(config);
    assertCondition(finalInspection.current !== null, "current generation missing after publish");
    assertCondition(finalInspection.current.pointer.pointer_id === pointer.pointer_id, "published pointer changed after verification");
    compareStateExact(finalInspection.current.replayState, verified.nextState, "published current");
    assertSameFilesystemIdentity(
      rootRealpath,
      rootIdentity,
      "allowed_root",
    );

    releaseLock(rootRealpath, lock);
    released = true;
    return receiptV1(
      generationRecovered ? "recovered" : "committed",
      operationId,
      rootRealpath,
      identity.generationId,
      actualParent,
      pointer,
      verified,
    );
  } finally {
    if (!released && fs.existsSync(lock.file)) {
      releaseLock(rootRealpath, lock);
    }
  }
}
