import { createHash } from "node:crypto";

import {
  type AcrossSwapApprovalIngestionResultV1,
} from "./across_swap_api_quote_ingestion_v1.js";

import {
  VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_V1,
  completeAcrossScheduledObservationV1,
  planAcrossScheduledObservationV1,
  ACROSS_SCHEDULED_OBSERVER_MAX_AUTHENTICATED_GETS_PER_DAY_V1,
  type AcrossScheduledObservationDecisionV1,
  type AcrossScheduledObserverPlanV1,
  type AcrossScheduledObserverStateV1,
} from "./across_scheduled_observer_v1.js";

export const VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_RUNTIME_V1 =
  "VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_RUNTIME_V1" as const;

export const VOID_ACROSS_SCHEDULED_OBSERVER_PENDING_SCHEMA_V1 =
  "void-across-scheduled-observer-pending-v1" as const;

export const VOID_ACROSS_SCHEDULED_OBSERVER_RUNTIME_RESULT_SCHEMA_V1 =
  "void-across-scheduled-observer-runtime-result-v1" as const;

const MAX_STATE_BYTES = 1_048_576;
const MAX_PENDING_BYTES = 2_097_152;
const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;

type RecordValue = Record<string, unknown>;
type JsonPrimitive = null | boolean | number | string;
type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | Readonly<{ [key: string]: JsonValue }>;

export type AcrossScheduledObserverPendingV1 = Readonly<{
  schema: typeof VOID_ACROSS_SCHEDULED_OBSERVER_PENDING_SCHEMA_V1;
  marker: typeof VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_RUNTIME_V1;
  scheduler_marker: typeof VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_V1;
  provider: "across";
  phase: "paper_only";
  created_at: string;
  decision_status: "recorded" | "duplicate";
  record_day_utc: string | null;
  record_sha256: string | null;
  append_jsonl: string | null;
  final_state: AcrossScheduledObserverStateV1;
  credential_retention: false;
  raw_response_retention: false;
  transaction_payload_retention: false;
  transaction_submission_performed: false;
  live_execution_authorized: false;
  execution_authorized: false;
  pending_sha256: string;
}>;

export type AcrossScheduledObserverRuntimePortsV1 = Readonly<{
  now: () => string;
  load_state_text: () => Promise<string | null>;
  persist_state_atomic: (serialized: string) => Promise<void>;
  load_pending_text: () => Promise<string | null>;
  persist_pending_atomic: (serialized: string) => Promise<void>;
  remove_pending: () => Promise<void>;
  append_record_idempotent: (
    dayUtc: string,
    recordSha256: string,
    appendJsonl: string,
  ) => Promise<"appended" | "already_present">;
  read_api_key: () => Promise<string>;
  ingest: (
    apiKey: string,
  ) => Promise<AcrossSwapApprovalIngestionResultV1>;
}>;

export type AcrossScheduledObserverRuntimeStatusV1 =
  | "cadence_blocked"
  | "daily_cap_blocked"
  | "recorded"
  | "duplicate"
  | "recovered_recorded"
  | "recovered_duplicate";

export type AcrossScheduledObserverRuntimeResultV1 = Readonly<{
  schema: typeof VOID_ACROSS_SCHEDULED_OBSERVER_RUNTIME_RESULT_SCHEMA_V1;
  marker: typeof VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_RUNTIME_V1;
  scheduler_marker: typeof VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_V1;
  provider: "across";
  phase: "paper_only";
  status: AcrossScheduledObserverRuntimeStatusV1;
  completed_at: string;
  day_utc: string;
  seconds_until_ready: number;
  authenticated_get_count: number;
  authenticated_gets_remaining_today: number;
  record_count: number;
  quote_id: string | null;
  opportunity_id: string | null;
  record_sha256: string | null;
  duplicate_fields: readonly (
    | "quote_id"
    | "opportunity_id"
    | "source_quote_sha256"
  )[];
  recovered_pending: boolean;
  record_append_status:
    | "not_applicable"
    | "appended"
    | "already_present";
  credential_access_performed: boolean;
  authenticated_get_performed: boolean;
  internal_retry_count: 0;
  credential_retention: false;
  raw_response_retention: false;
  transaction_payload_retention: false;
  network_mutation_performed: false;
  wallet_or_key_access_performed: false;
  transaction_construction_performed: false;
  transaction_submission_performed: false;
  live_execution_authorized: false;
  execution_authorized: false;
}>;

function hold(message: string): never {
  throw new Error(`HOLD: ${message}`);
}

function record(value: unknown, label: string): RecordValue {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    hold(`${label} must be an object`);
  }

  return value as RecordValue;
}

function exactKeys(
  value: RecordValue,
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();

  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    hold(`${label} keys differ`);
  }
}

function boundedString(
  value: unknown,
  label: string,
  maximumLength = 512,
): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > maximumLength ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    hold(`${label} must be a bounded printable string`);
  }

  return value;
}

function canonicalInstant(
  value: unknown,
  label: string,
): string {
  const text = boundedString(value, label, 64);
  const milliseconds = Date.parse(text);

  if (
    !Number.isFinite(milliseconds) ||
    new Date(milliseconds).toISOString() !== text
  ) {
    hold(`${label} must be a canonical UTC instant`);
  }

  return text;
}

function canonicalDay(value: unknown, label: string): string {
  const text = boundedString(value, label, 10);

  if (
    !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(text) ||
    new Date(`${text}T00:00:00.000Z`)
      .toISOString()
      .slice(0, 10) !== text
  ) {
    hold(`${label} must be a canonical UTC day`);
  }

  return text;
}

function sha256Hex(value: unknown, label: string): string {
  const text = boundedString(value, label, 64);

  if (!SHA256_HEX_PATTERN.test(text)) {
    hold(`${label} must be lowercase SHA-256 hex`);
  }

  return text;
}

function safeInteger(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    hold(`${label} must be a safe integer in range`);
  }

  return value;
}

function exactFalse(value: unknown, label: string): false {
  if (value !== false) {
    hold(`${label} must be false`);
  }

  return false;
}

function canonicalJson(value: JsonValue): string {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value
      .map((entry) => canonicalJson(entry))
      .join(",")}]`;
  }

  const objectValue =
    value as Readonly<{ [key: string]: JsonValue }>;
  const entries = Object.keys(objectValue)
    .sort()
    .map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(objectValue[key] as JsonValue)}`,
    );

  return `{${entries.join(",")}}`;
}

function hashCanonical(value: JsonValue): string {
  return createHash("sha256")
    .update(canonicalJson(value), "utf8")
    .digest("hex");
}

function serializeValidatedState(
  value: AcrossScheduledObserverStateV1,
): string {
  return canonicalJson(value as unknown as JsonValue) + "\n";
}

function parseJsonText(
  text: string,
  label: string,
  maximumBytes: number,
): unknown {
  if (
    typeof text !== "string" ||
    Buffer.byteLength(text, "utf8") > maximumBytes
  ) {
    hold(`${label} byte boundary differs`);
  }

  let value: unknown;

  try {
    value = JSON.parse(text) as unknown;
  } catch {
    hold(`${label} is not valid JSON`);
  }

  return value;
}

function pendingPayload(
  createdAt: string,
  decision: AcrossScheduledObservationDecisionV1,
): Omit<AcrossScheduledObserverPendingV1, "pending_sha256"> {
  return Object.freeze({
    schema: VOID_ACROSS_SCHEDULED_OBSERVER_PENDING_SCHEMA_V1,
    marker:
      VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_RUNTIME_V1,
    scheduler_marker:
      VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_V1,
    provider: "across",
    phase: "paper_only",
    created_at: createdAt,
    decision_status: decision.status,
    record_day_utc:
      decision.record === null
        ? null
        : decision.record.day_utc,
    record_sha256:
      decision.record === null
        ? null
        : decision.record.record_sha256,
    append_jsonl: decision.append_jsonl,
    final_state: decision.state,
    credential_retention: false,
    raw_response_retention: false,
    transaction_payload_retention: false,
    transaction_submission_performed: false,
    live_execution_authorized: false,
    execution_authorized: false,
  });
}

export function createAcrossScheduledObserverPendingV1(
  value: unknown,
): AcrossScheduledObserverPendingV1 {
  const source = record(value, "pending creation input");

  exactKeys(
    source,
    ["created_at", "decision"],
    "pending creation input",
  );

  const createdAt = canonicalInstant(
    source.created_at,
    "pending creation input.created_at",
  );
  const decision = source.decision as AcrossScheduledObservationDecisionV1;
  const decisionRecord = record(
    decision,
    "pending creation input.decision",
  );

  if (
    decisionRecord.schema !==
      "void-across-scheduled-observation-decision-v1" ||
    decisionRecord.marker !==
      VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_V1 ||
    decisionRecord.provider !== "across" ||
    decisionRecord.phase !== "paper_only" ||
    (decisionRecord.status !== "recorded" &&
      decisionRecord.status !== "duplicate")
  ) {
    hold("pending decision identity differs");
  }

  for (const [key, fieldValue] of [
    ["credential_retention", decisionRecord.credential_retention],
    ["raw_response_retention", decisionRecord.raw_response_retention],
    [
      "transaction_payload_retention",
      decisionRecord.transaction_payload_retention,
    ],
    [
      "transaction_submission_performed",
      decisionRecord.transaction_submission_performed,
    ],
    [
      "live_execution_authorized",
      decisionRecord.live_execution_authorized,
    ],
    ["execution_authorized", decisionRecord.execution_authorized],
  ] as const) {
    exactFalse(fieldValue, `pending decision.${key}`);
  }

  const payload = pendingPayload(createdAt, decision);
  const pendingSha256 = hashCanonical(
    payload as unknown as JsonValue,
  );

  return Object.freeze({
    ...payload,
    pending_sha256: pendingSha256,
  });
}

export function serializeAcrossScheduledObserverPendingV1(
  value: AcrossScheduledObserverPendingV1,
): string {
  const parsed = parseAcrossScheduledObserverPendingV1(
    canonicalJson(value as unknown as JsonValue),
  );

  return canonicalJson(parsed as unknown as JsonValue) + "\n";
}

export function parseAcrossScheduledObserverPendingV1(
  text: string,
): AcrossScheduledObserverPendingV1 {
  const source = record(
    parseJsonText(text, "pending journal", MAX_PENDING_BYTES),
    "pending journal",
  );

  exactKeys(
    source,
    [
      "schema",
      "marker",
      "scheduler_marker",
      "provider",
      "phase",
      "created_at",
      "decision_status",
      "record_day_utc",
      "record_sha256",
      "append_jsonl",
      "final_state",
      "credential_retention",
      "raw_response_retention",
      "transaction_payload_retention",
      "transaction_submission_performed",
      "live_execution_authorized",
      "execution_authorized",
      "pending_sha256",
    ],
    "pending journal",
  );

  if (
    source.schema !==
      VOID_ACROSS_SCHEDULED_OBSERVER_PENDING_SCHEMA_V1 ||
    source.marker !==
      VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_RUNTIME_V1 ||
    source.scheduler_marker !==
      VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_V1 ||
    source.provider !== "across" ||
    source.phase !== "paper_only" ||
    (source.decision_status !== "recorded" &&
      source.decision_status !== "duplicate")
  ) {
    hold("pending journal identity differs");
  }

  const createdAt = canonicalInstant(
    source.created_at,
    "pending journal.created_at",
  );
  const rawFinalState = record(
    source.final_state,
    "pending journal.final_state",
  );
  const lastAttempt = canonicalInstant(
    rawFinalState.last_attempt_started_at,
    "pending journal.final_state.last_attempt_started_at",
  );
  const lastRecorded =
    rawFinalState.last_recorded_at === null
      ? null
      : canonicalInstant(
          rawFinalState.last_recorded_at,
          "pending journal.final_state.last_recorded_at",
        );
  const validationNow =
    lastRecorded !== null &&
    Date.parse(lastRecorded) > Date.parse(lastAttempt)
      ? lastRecorded
      : lastAttempt;
  const normalizedState = planAcrossScheduledObservationV1({
    now: validationNow,
    state: rawFinalState,
  }).state;

  if (
    canonicalJson(normalizedState as unknown as JsonValue) !==
    canonicalJson(rawFinalState as unknown as JsonValue)
  ) {
    hold("pending journal final state differs");
  }

  const decisionStatus = source.decision_status;
  let recordDayUtc: string | null = null;
  let recordSha256: string | null = null;
  let appendJsonl: string | null = null;

  if (decisionStatus === "recorded") {
    recordDayUtc = canonicalDay(
      source.record_day_utc,
      "pending journal.record_day_utc",
    );
    recordSha256 = sha256Hex(
      source.record_sha256,
      "pending journal.record_sha256",
    );

    if (
      typeof source.append_jsonl !== "string" ||
      !source.append_jsonl.endsWith("\n") ||
      source.append_jsonl.endsWith("\n\n") ||
      Buffer.byteLength(source.append_jsonl, "utf8") >
        MAX_PENDING_BYTES
    ) {
      hold("pending journal append JSONL boundary differs");
    }

    const recordValue = record(
      parseJsonText(
        source.append_jsonl,
        "pending journal append JSONL",
        MAX_PENDING_BYTES,
      ),
      "pending journal append record",
    );

    if (
      recordValue.record_sha256 !== recordSha256 ||
      recordValue.day_utc !== recordDayUtc ||
      recordValue.execution_authorized !== false ||
      recordValue.live_execution_authorized !== false ||
      recordValue.transaction_submission_performed !== false
    ) {
      hold("pending journal append record boundary differs");
    }

    appendJsonl = source.append_jsonl;
  } else if (
    source.record_day_utc !== null ||
    source.record_sha256 !== null ||
    source.append_jsonl !== null
  ) {
    hold("duplicate pending journal contains record data");
  }

  for (const [key, fieldValue] of [
    ["credential_retention", source.credential_retention],
    ["raw_response_retention", source.raw_response_retention],
    [
      "transaction_payload_retention",
      source.transaction_payload_retention,
    ],
    [
      "transaction_submission_performed",
      source.transaction_submission_performed,
    ],
    [
      "live_execution_authorized",
      source.live_execution_authorized,
    ],
    ["execution_authorized", source.execution_authorized],
  ] as const) {
    exactFalse(fieldValue, `pending journal.${key}`);
  }

  const pendingSha256 = sha256Hex(
    source.pending_sha256,
    "pending journal.pending_sha256",
  );
  const payload: Omit<AcrossScheduledObserverPendingV1, "pending_sha256"> =
    Object.freeze({
      schema: VOID_ACROSS_SCHEDULED_OBSERVER_PENDING_SCHEMA_V1,
      marker:
        VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_RUNTIME_V1,
      scheduler_marker:
        VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_V1,
      provider: "across",
      phase: "paper_only",
      created_at: createdAt,
      decision_status: decisionStatus,
      record_day_utc: recordDayUtc,
      record_sha256: recordSha256,
      append_jsonl: appendJsonl,
      final_state: normalizedState,
      credential_retention: false,
      raw_response_retention: false,
      transaction_payload_retention: false,
      transaction_submission_performed: false,
      live_execution_authorized: false,
      execution_authorized: false,
    });

  if (
    hashCanonical(payload as unknown as JsonValue) !==
    pendingSha256
  ) {
    hold("pending journal SHA-256 differs");
  }

  return Object.freeze({
    ...payload,
    pending_sha256: pendingSha256,
  });
}

function runtimeResult(
  value: {
    status: AcrossScheduledObserverRuntimeStatusV1;
    completedAt: string;
    state: AcrossScheduledObserverStateV1;
    secondsUntilReady: number;
    authenticatedGetsRemainingToday: number;
    quoteId: string | null;
    opportunityId: string | null;
    recordSha256: string | null;
    duplicateFields: readonly (
      | "quote_id"
      | "opportunity_id"
      | "source_quote_sha256"
    )[];
    recoveredPending: boolean;
    recordAppendStatus:
      | "not_applicable"
      | "appended"
      | "already_present";
    credentialAccessPerformed: boolean;
    authenticatedGetPerformed: boolean;
  },
): AcrossScheduledObserverRuntimeResultV1 {
  return Object.freeze({
    schema:
      VOID_ACROSS_SCHEDULED_OBSERVER_RUNTIME_RESULT_SCHEMA_V1,
    marker:
      VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_RUNTIME_V1,
    scheduler_marker:
      VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_V1,
    provider: "across",
    phase: "paper_only",
    status: value.status,
    completed_at: value.completedAt,
    day_utc: value.state.day_utc,
    seconds_until_ready: value.secondsUntilReady,
    authenticated_get_count:
      value.state.authenticated_get_count,
    authenticated_gets_remaining_today:
      value.authenticatedGetsRemainingToday,
    record_count: value.state.record_count,
    quote_id: value.quoteId,
    opportunity_id: value.opportunityId,
    record_sha256: value.recordSha256,
    duplicate_fields: Object.freeze([...value.duplicateFields]),
    recovered_pending: value.recoveredPending,
    record_append_status: value.recordAppendStatus,
    credential_access_performed:
      value.credentialAccessPerformed,
    authenticated_get_performed:
      value.authenticatedGetPerformed,
    internal_retry_count: 0,
    credential_retention: false,
    raw_response_retention: false,
    transaction_payload_retention: false,
    network_mutation_performed: false,
    wallet_or_key_access_performed: false,
    transaction_construction_performed: false,
    transaction_submission_performed: false,
    live_execution_authorized: false,
    execution_authorized: false,
  });
}

async function recoverPending(
  pending: AcrossScheduledObserverPendingV1,
  ports: AcrossScheduledObserverRuntimePortsV1,
  completedAt: string,
): Promise<AcrossScheduledObserverRuntimeResultV1> {
  let appendStatus: "not_applicable" | "appended" | "already_present" =
    "not_applicable";

  if (
    pending.record_day_utc !== null &&
    pending.record_sha256 !== null &&
    pending.append_jsonl !== null
  ) {
    appendStatus = await ports.append_record_idempotent(
      pending.record_day_utc,
      pending.record_sha256,
      pending.append_jsonl,
    );
  }

  await ports.persist_state_atomic(
    serializeValidatedState(pending.final_state),
  );
  await ports.remove_pending();

  return runtimeResult({
    status:
      pending.decision_status === "recorded"
        ? "recovered_recorded"
        : "recovered_duplicate",
    completedAt,
    state: pending.final_state,
    secondsUntilReady: 0,
    authenticatedGetsRemainingToday:
      ACROSS_SCHEDULED_OBSERVER_MAX_AUTHENTICATED_GETS_PER_DAY_V1 -
      pending.final_state.authenticated_get_count,
    quoteId: null,
    opportunityId: null,
    recordSha256: pending.record_sha256,
    duplicateFields: Object.freeze([]),
    recoveredPending: true,
    recordAppendStatus: appendStatus,
    credentialAccessPerformed: false,
    authenticatedGetPerformed: false,
  });
}

export async function executeAcrossScheduledObserverRuntimeV1(
  ports: AcrossScheduledObserverRuntimePortsV1,
): Promise<AcrossScheduledObserverRuntimeResultV1> {
  const pendingText = await ports.load_pending_text();
  const startedAt = canonicalInstant(
    ports.now(),
    "runtime started_at",
  );

  if (pendingText !== null) {
    return recoverPending(
      parseAcrossScheduledObserverPendingV1(pendingText),
      ports,
      startedAt,
    );
  }

  const stateText = await ports.load_state_text();
  const stateValue =
    stateText === null
      ? null
      : parseJsonText(
          stateText,
          "runtime state",
          MAX_STATE_BYTES,
        );
  const plan: AcrossScheduledObserverPlanV1 =
    planAcrossScheduledObservationV1({
      now: startedAt,
      state: stateValue,
    });
  const serializedPlanState =
    serializeValidatedState(plan.state);

  if (plan.status !== "ready") {
    if (stateText !== serializedPlanState) {
      await ports.persist_state_atomic(serializedPlanState);
    }

    return runtimeResult({
      status: plan.status,
      completedAt: startedAt,
      state: plan.state,
      secondsUntilReady: plan.seconds_until_ready,
      authenticatedGetsRemainingToday:
        plan.authenticated_gets_remaining_today,
      quoteId: null,
      opportunityId: null,
      recordSha256: null,
      duplicateFields: Object.freeze([]),
      recoveredPending: false,
      recordAppendStatus: "not_applicable",
      credentialAccessPerformed: false,
      authenticatedGetPerformed: false,
    });
  }

  await ports.persist_state_atomic(serializedPlanState);

  let apiKey = await ports.read_api_key();
  let result: AcrossSwapApprovalIngestionResultV1;

  try {
    result = await ports.ingest(apiKey);
  } finally {
    apiKey = "";
  }

  const completedAt = canonicalInstant(
    ports.now(),
    "runtime completed_at",
  );
  const decision = completeAcrossScheduledObservationV1({
    completed_at: completedAt,
    plan,
    result,
  });
  const pending = createAcrossScheduledObserverPendingV1({
    created_at: completedAt,
    decision,
  });

  await ports.persist_pending_atomic(
    serializeAcrossScheduledObserverPendingV1(pending),
  );

  let appendStatus: "not_applicable" | "appended" | "already_present" =
    "not_applicable";

  if (
    pending.record_day_utc !== null &&
    pending.record_sha256 !== null &&
    pending.append_jsonl !== null
  ) {
    appendStatus = await ports.append_record_idempotent(
      pending.record_day_utc,
      pending.record_sha256,
      pending.append_jsonl,
    );
  }

  await ports.persist_state_atomic(
    serializeValidatedState(decision.state),
  );
  await ports.remove_pending();

  return runtimeResult({
    status: decision.status,
    completedAt,
    state: decision.state,
    secondsUntilReady: 0,
    authenticatedGetsRemainingToday:
      plan.authenticated_gets_remaining_today,
    quoteId:
      decision.record === null
        ? result.quote_id
        : decision.record.quote_id,
    opportunityId:
      decision.record === null
        ? result.paper_receipt.opportunity_id
        : decision.record.opportunity_id,
    recordSha256:
      decision.record === null
        ? null
        : decision.record.record_sha256,
    duplicateFields: decision.duplicate_fields,
    recoveredPending: false,
    recordAppendStatus: appendStatus,
    credentialAccessPerformed: true,
    authenticatedGetPerformed: true,
  });
}
