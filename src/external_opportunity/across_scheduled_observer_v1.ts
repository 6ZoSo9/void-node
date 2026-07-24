import { createHash } from "node:crypto";

import {
  VOID_ACROSS_QUOTE_INGESTION_RESULT_SCHEMA_V1,
  VOID_EXTERNAL_OPPORTUNITY_ACROSS_QUOTE_INGESTION_V1,
  type AcrossSwapApprovalIngestionResultV1,
} from "./across_swap_api_quote_ingestion_v1.js";

export const VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_V1 =
  "VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_V1" as const;

export const VOID_ACROSS_SCHEDULED_OBSERVER_STATE_SCHEMA_V1 =
  "void-across-scheduled-observer-state-v1" as const;

export const VOID_ACROSS_SCHEDULED_OBSERVER_PLAN_SCHEMA_V1 =
  "void-across-scheduled-observer-plan-v1" as const;

export const VOID_ACROSS_SCHEDULED_OBSERVATION_RECORD_SCHEMA_V1 =
  "void-across-scheduled-observation-record-v1" as const;

export const VOID_ACROSS_SCHEDULED_OBSERVATION_DECISION_SCHEMA_V1 =
  "void-across-scheduled-observation-decision-v1" as const;

export const ACROSS_SCHEDULED_OBSERVER_MIN_CADENCE_SECONDS_V1 =
  900 as const;

export const ACROSS_SCHEDULED_OBSERVER_MAX_AUTHENTICATED_GETS_PER_DAY_V1 =
  96 as const;

export const ACROSS_SCHEDULED_OBSERVER_AUTHENTICATED_GETS_PER_RUN_V1 =
  1 as const;

export const ACROSS_SCHEDULED_OBSERVER_INTERNAL_RETRY_COUNT_V1 =
  0 as const;

const MAX_DEDUPE_ENTRIES = 96;
const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;
const UTC_DAY_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

type RecordValue = Record<string, unknown>;
type JsonPrimitive = null | boolean | number | string;
type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | Readonly<{ [key: string]: JsonValue }>;

export type AcrossScheduledObserverStateV1 = Readonly<{
  schema: typeof VOID_ACROSS_SCHEDULED_OBSERVER_STATE_SCHEMA_V1;
  marker: typeof VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_V1;
  provider: "across";
  phase: "paper_only";
  day_utc: string;
  authenticated_get_count: number;
  last_attempt_started_at: string | null;
  last_recorded_at: string | null;
  record_count: number;
  seen_quote_ids: readonly string[];
  seen_opportunity_ids: readonly string[];
  seen_source_quote_sha256: readonly string[];
  execution_authorized: false;
}>;

export type AcrossScheduledObserverPlanStatusV1 =
  | "ready"
  | "cadence_blocked"
  | "daily_cap_blocked";

export type AcrossScheduledObserverPlanV1 = Readonly<{
  schema: typeof VOID_ACROSS_SCHEDULED_OBSERVER_PLAN_SCHEMA_V1;
  marker: typeof VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_V1;
  provider: "across";
  phase: "paper_only";
  status: AcrossScheduledObserverPlanStatusV1;
  planned_at: string;
  day_utc: string;
  seconds_until_ready: number;
  authenticated_gets_remaining_today: number;
  authenticated_gets_this_run: 0 | 1;
  internal_retry_count: 0;
  state: AcrossScheduledObserverStateV1;
  credential_access_performed: false;
  network_access_performed: false;
  transaction_submission_performed: false;
  execution_authorized: false;
}>;

export type AcrossScheduledObservationRecordV1 = Readonly<{
  schema: typeof VOID_ACROSS_SCHEDULED_OBSERVATION_RECORD_SCHEMA_V1;
  marker: typeof VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_V1;
  provider: "across";
  phase: "paper_only";
  recorded_at: string;
  attempt_started_at: string;
  day_utc: string;
  daily_authenticated_get_ordinal: number;
  quote_id: string;
  opportunity_id: string;
  source_quote_sha256: string;
  source_receipt_sha256: string;
  opportunity_status: "paper_positive" | "paper_negative" | "expired";
  quote_expired: boolean;
  route: AcrossSwapApprovalIngestionResultV1["paper_receipt"]["route"];
  input_amount: string;
  expected_output_amount: string;
  min_output_amount: string;
  expected_fill_time_sec: number;
  total_user_fee_amount: string;
  total_user_fee_usd: string;
  revenue_model:
    AcrossSwapApprovalIngestionResultV1["paper_receipt"]["revenue_model"];
  revenue_evidence_label: string;
  paper_gross_revenue_usd: string;
  paper_costs:
    AcrossSwapApprovalIngestionResultV1["paper_receipt"]["paper_costs"];
  paper_net_profit_usd: string;
  paper_net_profit_bps_of_capital: string;
  source_response_bytes: number;
  credential_retention: false;
  raw_response_retention: false;
  transaction_payload_retention: false;
  network_mutation_performed: false;
  wallet_or_key_access_performed: false;
  transaction_construction_performed: false;
  transaction_submission_performed: false;
  live_execution_authorized: false;
  execution_authorized: false;
  record_sha256: string;
}>;

export type AcrossScheduledObservationDecisionV1 = Readonly<{
  schema: typeof VOID_ACROSS_SCHEDULED_OBSERVATION_DECISION_SCHEMA_V1;
  marker: typeof VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_V1;
  provider: "across";
  phase: "paper_only";
  status: "recorded" | "duplicate";
  completed_at: string;
  duplicate_fields: readonly (
    | "quote_id"
    | "opportunity_id"
    | "source_quote_sha256"
  )[];
  state: AcrossScheduledObserverStateV1;
  record: AcrossScheduledObservationRecordV1 | null;
  append_jsonl: string | null;
  credential_retention: false;
  raw_response_retention: false;
  transaction_payload_retention: false;
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

function canonicalUtcDay(
  value: unknown,
  label: string,
): string {
  const text = boundedString(value, label, 10);

  if (
    !UTC_DAY_PATTERN.test(text) ||
    new Date(`${text}T00:00:00.000Z`)
      .toISOString()
      .slice(0, 10) !== text
  ) {
    hold(`${label} must be a canonical UTC day`);
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

function exactFalse(
  value: unknown,
  label: string,
): false {
  if (value !== false) {
    hold(`${label} must be false`);
  }

  return false;
}

function exactNullOrInstant(
  value: unknown,
  label: string,
): string | null {
  if (value === null) {
    return null;
  }

  return canonicalInstant(value, label);
}

function sha256Hex(
  value: unknown,
  label: string,
): string {
  const text = boundedString(value, label, 64);

  if (!SHA256_HEX_PATTERN.test(text)) {
    hold(`${label} must be lowercase SHA-256 hex`);
  }

  return text;
}

function uniqueStrings(
  value: unknown,
  label: string,
  validator: (entry: unknown, entryLabel: string) => string,
): readonly string[] {
  if (
    !Array.isArray(value) ||
    value.length > MAX_DEDUPE_ENTRIES
  ) {
    hold(`${label} must be a bounded array`);
  }

  const parsed = value.map((entry, index) =>
    validator(entry, `${label}[${index}]`),
  );

  if (new Set(parsed).size !== parsed.length) {
    hold(`${label} contains duplicates`);
  }

  return Object.freeze(parsed);
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

function utcDay(instant: string): string {
  return instant.slice(0, 10);
}

function emptyState(
  now: string,
): AcrossScheduledObserverStateV1 {
  return Object.freeze({
    schema: VOID_ACROSS_SCHEDULED_OBSERVER_STATE_SCHEMA_V1,
    marker:
      VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_V1,
    provider: "across",
    phase: "paper_only",
    day_utc: utcDay(now),
    authenticated_get_count: 0,
    last_attempt_started_at: null,
    last_recorded_at: null,
    record_count: 0,
    seen_quote_ids: Object.freeze([]),
    seen_opportunity_ids: Object.freeze([]),
    seen_source_quote_sha256: Object.freeze([]),
    execution_authorized: false,
  });
}

function parseState(
  value: unknown,
  now: string,
): AcrossScheduledObserverStateV1 {
  if (value === null || value === undefined) {
    return emptyState(now);
  }

  const source = record(value, "scheduled observer state");

  exactKeys(
    source,
    [
      "schema",
      "marker",
      "provider",
      "phase",
      "day_utc",
      "authenticated_get_count",
      "last_attempt_started_at",
      "last_recorded_at",
      "record_count",
      "seen_quote_ids",
      "seen_opportunity_ids",
      "seen_source_quote_sha256",
      "execution_authorized",
    ],
    "scheduled observer state",
  );

  if (
    source.schema !==
      VOID_ACROSS_SCHEDULED_OBSERVER_STATE_SCHEMA_V1 ||
    source.marker !==
      VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_V1 ||
    source.provider !== "across" ||
    source.phase !== "paper_only"
  ) {
    hold("scheduled observer state identity differs");
  }

  const day = canonicalUtcDay(
    source.day_utc,
    "scheduled observer state.day_utc",
  );
  const count = safeInteger(
    source.authenticated_get_count,
    "scheduled observer state.authenticated_get_count",
    0,
    ACROSS_SCHEDULED_OBSERVER_MAX_AUTHENTICATED_GETS_PER_DAY_V1,
  );
  const lastAttempt = exactNullOrInstant(
    source.last_attempt_started_at,
    "scheduled observer state.last_attempt_started_at",
  );
  const lastRecorded = exactNullOrInstant(
    source.last_recorded_at,
    "scheduled observer state.last_recorded_at",
  );
  const recordCount = safeInteger(
    source.record_count,
    "scheduled observer state.record_count",
    0,
    Number.MAX_SAFE_INTEGER,
  );
  const quoteIds = uniqueStrings(
    source.seen_quote_ids,
    "scheduled observer state.seen_quote_ids",
    boundedString,
  );
  const opportunityIds = uniqueStrings(
    source.seen_opportunity_ids,
    "scheduled observer state.seen_opportunity_ids",
    sha256Hex,
  );
  const quoteHashes = uniqueStrings(
    source.seen_source_quote_sha256,
    "scheduled observer state.seen_source_quote_sha256",
    sha256Hex,
  );

  exactFalse(
    source.execution_authorized,
    "scheduled observer state.execution_authorized",
  );

  if (
    quoteIds.length !== opportunityIds.length ||
    quoteIds.length !== quoteHashes.length
  ) {
    hold("scheduled observer state dedupe array lengths differ");
  }

  if (quoteIds.length > recordCount) {
    hold("scheduled observer state dedupe entries exceed record count");
  }

  if (
    lastAttempt !== null &&
    Date.parse(lastAttempt) > Date.parse(now)
  ) {
    hold("scheduled observer state last attempt is in the future");
  }

  if (
    lastRecorded !== null &&
    Date.parse(lastRecorded) > Date.parse(now)
  ) {
    hold("scheduled observer state last record is in the future");
  }

  const currentDay = utcDay(now);

  if (day !== currentDay) {
    return Object.freeze({
      schema: VOID_ACROSS_SCHEDULED_OBSERVER_STATE_SCHEMA_V1,
      marker:
        VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_V1,
      provider: "across",
      phase: "paper_only",
      day_utc: currentDay,
      authenticated_get_count: 0,
      last_attempt_started_at: lastAttempt,
      last_recorded_at: lastRecorded,
      record_count: recordCount,
      seen_quote_ids: Object.freeze([]),
      seen_opportunity_ids: Object.freeze([]),
      seen_source_quote_sha256: Object.freeze([]),
      execution_authorized: false,
    });
  }

  return Object.freeze({
    schema: VOID_ACROSS_SCHEDULED_OBSERVER_STATE_SCHEMA_V1,
    marker:
      VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_V1,
    provider: "across",
    phase: "paper_only",
    day_utc: day,
    authenticated_get_count: count,
    last_attempt_started_at: lastAttempt,
    last_recorded_at: lastRecorded,
    record_count: recordCount,
    seen_quote_ids: quoteIds,
    seen_opportunity_ids: opportunityIds,
    seen_source_quote_sha256: quoteHashes,
    execution_authorized: false,
  });
}

export function createAcrossScheduledObserverStateV1(
  now: string,
): AcrossScheduledObserverStateV1 {
  const instant = canonicalInstant(now, "now");
  return emptyState(instant);
}

export function planAcrossScheduledObservationV1(
  value: unknown,
): AcrossScheduledObserverPlanV1 {
  const source = record(value, "scheduled observation plan input");

  exactKeys(
    source,
    ["now", "state"],
    "scheduled observation plan input",
  );

  const now = canonicalInstant(
    source.now,
    "scheduled observation plan input.now",
  );
  const state = parseState(source.state, now);
  const nowMilliseconds = Date.parse(now);

  let secondsUntilReady = 0;

  if (state.last_attempt_started_at !== null) {
    const elapsedMilliseconds =
      nowMilliseconds -
      Date.parse(state.last_attempt_started_at);

    const cadenceMilliseconds =
      ACROSS_SCHEDULED_OBSERVER_MIN_CADENCE_SECONDS_V1 *
      1_000;

    if (elapsedMilliseconds < cadenceMilliseconds) {
      secondsUntilReady = Math.ceil(
        (cadenceMilliseconds - elapsedMilliseconds) /
          1_000,
      );
    }
  }

  const remaining = Math.max(
    0,
    ACROSS_SCHEDULED_OBSERVER_MAX_AUTHENTICATED_GETS_PER_DAY_V1 -
      state.authenticated_get_count,
  );

  if (secondsUntilReady > 0) {
    return Object.freeze({
      schema: VOID_ACROSS_SCHEDULED_OBSERVER_PLAN_SCHEMA_V1,
      marker:
        VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_V1,
      provider: "across",
      phase: "paper_only",
      status: "cadence_blocked",
      planned_at: now,
      day_utc: state.day_utc,
      seconds_until_ready: secondsUntilReady,
      authenticated_gets_remaining_today: remaining,
      authenticated_gets_this_run: 0,
      internal_retry_count:
        ACROSS_SCHEDULED_OBSERVER_INTERNAL_RETRY_COUNT_V1,
      state,
      credential_access_performed: false,
      network_access_performed: false,
      transaction_submission_performed: false,
      execution_authorized: false,
    });
  }

  if (
    state.authenticated_get_count >=
    ACROSS_SCHEDULED_OBSERVER_MAX_AUTHENTICATED_GETS_PER_DAY_V1
  ) {
    return Object.freeze({
      schema: VOID_ACROSS_SCHEDULED_OBSERVER_PLAN_SCHEMA_V1,
      marker:
        VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_V1,
      provider: "across",
      phase: "paper_only",
      status: "daily_cap_blocked",
      planned_at: now,
      day_utc: state.day_utc,
      seconds_until_ready: 0,
      authenticated_gets_remaining_today: 0,
      authenticated_gets_this_run: 0,
      internal_retry_count:
        ACROSS_SCHEDULED_OBSERVER_INTERNAL_RETRY_COUNT_V1,
      state,
      credential_access_performed: false,
      network_access_performed: false,
      transaction_submission_performed: false,
      execution_authorized: false,
    });
  }

  const nextState: AcrossScheduledObserverStateV1 =
    Object.freeze({
      ...state,
      authenticated_get_count:
        state.authenticated_get_count +
        ACROSS_SCHEDULED_OBSERVER_AUTHENTICATED_GETS_PER_RUN_V1,
      last_attempt_started_at: now,
    });

  return Object.freeze({
    schema: VOID_ACROSS_SCHEDULED_OBSERVER_PLAN_SCHEMA_V1,
    marker:
      VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_V1,
    provider: "across",
    phase: "paper_only",
    status: "ready",
    planned_at: now,
    day_utc: state.day_utc,
    seconds_until_ready: 0,
    authenticated_gets_remaining_today: remaining - 1,
    authenticated_gets_this_run:
      ACROSS_SCHEDULED_OBSERVER_AUTHENTICATED_GETS_PER_RUN_V1,
    internal_retry_count:
      ACROSS_SCHEDULED_OBSERVER_INTERNAL_RETRY_COUNT_V1,
    state: nextState,
    credential_access_performed: false,
    network_access_performed: false,
    transaction_submission_performed: false,
    execution_authorized: false,
  });
}

function parseReadyPlan(
  value: unknown,
): AcrossScheduledObserverPlanV1 {
  const source = record(value, "scheduled observer plan");

  exactKeys(
    source,
    [
      "schema",
      "marker",
      "provider",
      "phase",
      "status",
      "planned_at",
      "day_utc",
      "seconds_until_ready",
      "authenticated_gets_remaining_today",
      "authenticated_gets_this_run",
      "internal_retry_count",
      "state",
      "credential_access_performed",
      "network_access_performed",
      "transaction_submission_performed",
      "execution_authorized",
    ],
    "scheduled observer plan",
  );

  if (
    source.schema !==
      VOID_ACROSS_SCHEDULED_OBSERVER_PLAN_SCHEMA_V1 ||
    source.marker !==
      VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_V1 ||
    source.provider !== "across" ||
    source.phase !== "paper_only" ||
    source.status !== "ready"
  ) {
    hold("scheduled observer plan is not ready");
  }

  const plannedAt = canonicalInstant(
    source.planned_at,
    "scheduled observer plan.planned_at",
  );
  const day = canonicalUtcDay(
    source.day_utc,
    "scheduled observer plan.day_utc",
  );
  const state = parseState(source.state, plannedAt);

  if (
    state.day_utc !== day ||
    state.last_attempt_started_at !== plannedAt
  ) {
    hold("scheduled observer ready plan state differs");
  }

  const remaining = safeInteger(
    source.authenticated_gets_remaining_today,
    "scheduled observer plan.authenticated_gets_remaining_today",
    0,
    95,
  );

  if (
    source.seconds_until_ready !== 0 ||
    source.authenticated_gets_this_run !== 1 ||
    source.internal_retry_count !== 0 ||
    remaining !==
      ACROSS_SCHEDULED_OBSERVER_MAX_AUTHENTICATED_GETS_PER_DAY_V1 -
        state.authenticated_get_count
  ) {
    hold("scheduled observer ready plan policy differs");
  }

  exactFalse(
    source.credential_access_performed,
    "scheduled observer plan.credential_access_performed",
  );
  exactFalse(
    source.network_access_performed,
    "scheduled observer plan.network_access_performed",
  );
  exactFalse(
    source.transaction_submission_performed,
    "scheduled observer plan.transaction_submission_performed",
  );
  exactFalse(
    source.execution_authorized,
    "scheduled observer plan.execution_authorized",
  );

  return Object.freeze({
    schema: VOID_ACROSS_SCHEDULED_OBSERVER_PLAN_SCHEMA_V1,
    marker:
      VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_V1,
    provider: "across",
    phase: "paper_only",
    status: "ready",
    planned_at: plannedAt,
    day_utc: day,
    seconds_until_ready: 0,
    authenticated_gets_remaining_today: remaining,
    authenticated_gets_this_run: 1,
    internal_retry_count: 0,
    state,
    credential_access_performed: false,
    network_access_performed: false,
    transaction_submission_performed: false,
    execution_authorized: false,
  });
}

function validateIngestionResult(
  value: unknown,
): AcrossSwapApprovalIngestionResultV1 {
  const source = record(value, "Across ingestion result");

  if (
    source.schema !==
      VOID_ACROSS_QUOTE_INGESTION_RESULT_SCHEMA_V1 ||
    source.marker !==
      VOID_EXTERNAL_OPPORTUNITY_ACROSS_QUOTE_INGESTION_V1 ||
    source.provider !== "across" ||
    source.endpoint !==
      "https://app.across.to/api/swap/approval" ||
    source.method !== "GET"
  ) {
    hold("Across ingestion result identity differs");
  }

  for (const [key, fieldValue] of [
    ["credential_retention", source.credential_retention],
    ["raw_response_retention", source.raw_response_retention],
    [
      "transaction_payload_retention",
      source.transaction_payload_retention,
    ],
    [
      "network_mutation_performed",
      source.network_mutation_performed,
    ],
    [
      "wallet_or_key_access_performed",
      source.wallet_or_key_access_performed,
    ],
    [
      "transaction_construction_performed",
      source.transaction_construction_performed,
    ],
    [
      "transaction_submission_performed",
      source.transaction_submission_performed,
    ],
    [
      "live_execution_authorized",
      source.live_execution_authorized,
    ],
  ] as const) {
    exactFalse(
      fieldValue,
      `Across ingestion result.${key}`,
    );
  }

  const paper = record(
    source.paper_receipt,
    "Across ingestion result.paper_receipt",
  );

  if (
    paper.provider !== "across" ||
    paper.phase !== "paper_only" ||
    paper.execution_authorized !== false
  ) {
    hold("Across paper receipt safety boundary differs");
  }

  if (
    paper.status !== "paper_positive" &&
    paper.status !== "paper_negative" &&
    paper.status !== "expired"
  ) {
    hold("Across paper receipt status differs");
  }

  if (source.quote_id !== paper.quote_id) {
    hold("Across ingestion and paper quote IDs differ");
  }

  safeInteger(
    source.response_bytes,
    "Across ingestion result.response_bytes",
    2,
    1_048_576,
  );

  return value as AcrossSwapApprovalIngestionResultV1;
}

function recordPayload(
  completedAt: string,
  plan: AcrossScheduledObserverPlanV1,
  result: AcrossSwapApprovalIngestionResultV1,
): Omit<AcrossScheduledObservationRecordV1, "record_sha256"> {
  const paper = result.paper_receipt;

  return Object.freeze({
    schema:
      VOID_ACROSS_SCHEDULED_OBSERVATION_RECORD_SCHEMA_V1,
    marker:
      VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_V1,
    provider: "across",
    phase: "paper_only",
    recorded_at: completedAt,
    attempt_started_at: plan.planned_at,
    day_utc: plan.day_utc,
    daily_authenticated_get_ordinal:
      plan.state.authenticated_get_count,
    quote_id: paper.quote_id,
    opportunity_id: paper.opportunity_id,
    source_quote_sha256: paper.source_quote_sha256,
    source_receipt_sha256: paper.receipt_sha256,
    opportunity_status: paper.status,
    quote_expired: paper.quote_expired,
    route: paper.route,
    input_amount: paper.input_amount,
    expected_output_amount: paper.expected_output_amount,
    min_output_amount: paper.min_output_amount,
    expected_fill_time_sec: paper.expected_fill_time_sec,
    total_user_fee_amount: paper.total_user_fee_amount,
    total_user_fee_usd: paper.total_user_fee_usd,
    revenue_model: paper.revenue_model,
    revenue_evidence_label: paper.revenue_evidence_label,
    paper_gross_revenue_usd:
      paper.paper_gross_revenue_usd,
    paper_costs: paper.paper_costs,
    paper_net_profit_usd: paper.paper_net_profit_usd,
    paper_net_profit_bps_of_capital:
      paper.paper_net_profit_bps_of_capital,
    source_response_bytes: result.response_bytes,
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

export function completeAcrossScheduledObservationV1(
  value: unknown,
): AcrossScheduledObservationDecisionV1 {
  const source = record(
    value,
    "scheduled observation completion input",
  );

  exactKeys(
    source,
    ["completed_at", "plan", "result"],
    "scheduled observation completion input",
  );

  const completedAt = canonicalInstant(
    source.completed_at,
    "scheduled observation completion input.completed_at",
  );
  const plan = parseReadyPlan(source.plan);
  const result = validateIngestionResult(source.result);

  if (
    Date.parse(completedAt) <
    Date.parse(plan.planned_at)
  ) {
    hold("scheduled observation completed before it started");
  }

  if (
    Date.parse(result.observed_at) <
      Date.parse(plan.planned_at) ||
    Date.parse(result.evaluated_at) <
      Date.parse(result.observed_at) ||
    Date.parse(completedAt) <
      Date.parse(result.evaluated_at)
  ) {
    hold("scheduled observation timeline differs");
  }

  const paper = result.paper_receipt;
  const duplicateFields: (
    | "quote_id"
    | "opportunity_id"
    | "source_quote_sha256"
  )[] = [];

  if (plan.state.seen_quote_ids.includes(paper.quote_id)) {
    duplicateFields.push("quote_id");
  }

  if (
    plan.state.seen_opportunity_ids.includes(
      paper.opportunity_id,
    )
  ) {
    duplicateFields.push("opportunity_id");
  }

  if (
    plan.state.seen_source_quote_sha256.includes(
      paper.source_quote_sha256,
    )
  ) {
    duplicateFields.push("source_quote_sha256");
  }

  if (duplicateFields.length > 0) {
    return Object.freeze({
      schema:
        VOID_ACROSS_SCHEDULED_OBSERVATION_DECISION_SCHEMA_V1,
      marker:
        VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_V1,
      provider: "across",
      phase: "paper_only",
      status: "duplicate",
      completed_at: completedAt,
      duplicate_fields: Object.freeze(duplicateFields),
      state: plan.state,
      record: null,
      append_jsonl: null,
      credential_retention: false,
      raw_response_retention: false,
      transaction_payload_retention: false,
      transaction_submission_performed: false,
      live_execution_authorized: false,
      execution_authorized: false,
    });
  }

  if (
    plan.state.seen_quote_ids.length >=
      MAX_DEDUPE_ENTRIES ||
    plan.state.seen_opportunity_ids.length >=
      MAX_DEDUPE_ENTRIES ||
    plan.state.seen_source_quote_sha256.length >=
      MAX_DEDUPE_ENTRIES
  ) {
    hold("scheduled observer dedupe state is full");
  }

  const payload = recordPayload(
    completedAt,
    plan,
    result,
  );
  const recordSha256 = hashCanonical(
    payload as unknown as JsonValue,
  );
  const observationRecord: AcrossScheduledObservationRecordV1 =
    Object.freeze({
      ...payload,
      record_sha256: recordSha256,
    });
  const appendJsonl =
    canonicalJson(
      observationRecord as unknown as JsonValue,
    ) + "\n";

  const nextState: AcrossScheduledObserverStateV1 =
    Object.freeze({
      ...plan.state,
      last_recorded_at: completedAt,
      record_count: plan.state.record_count + 1,
      seen_quote_ids: Object.freeze([
        ...plan.state.seen_quote_ids,
        paper.quote_id,
      ]),
      seen_opportunity_ids: Object.freeze([
        ...plan.state.seen_opportunity_ids,
        paper.opportunity_id,
      ]),
      seen_source_quote_sha256: Object.freeze([
        ...plan.state.seen_source_quote_sha256,
        paper.source_quote_sha256,
      ]),
    });

  return Object.freeze({
    schema:
      VOID_ACROSS_SCHEDULED_OBSERVATION_DECISION_SCHEMA_V1,
    marker:
      VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_V1,
    provider: "across",
    phase: "paper_only",
    status: "recorded",
    completed_at: completedAt,
    duplicate_fields: Object.freeze([]),
    state: nextState,
    record: observationRecord,
    append_jsonl: appendJsonl,
    credential_retention: false,
    raw_response_retention: false,
    transaction_payload_retention: false,
    transaction_submission_performed: false,
    live_execution_authorized: false,
    execution_authorized: false,
  });
}

export function serializeAcrossScheduledObserverStateV1(
  value: AcrossScheduledObserverStateV1,
): string {
  const state = parseState(
    value,
    value.last_recorded_at ??
      value.last_attempt_started_at ??
      `${value.day_utc}T23:59:59.999Z`,
  );

  return (
    canonicalJson(state as unknown as JsonValue) +
    "\n"
  );
}
