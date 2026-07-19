import crypto from "node:crypto";
import {
  VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1,
  VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1,
  decideValidatorSubmitIntentLifecycleV1,
  type ValidatorSubmitIntentRecordV1,
} from "./validator_submit_intent_lifecycle_v1.js";
import {
  VOID_VALIDATOR_SUBMIT_INTENT_STORE_V1,
} from "./validator_submit_intent_store_v1.js";

export const VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_V1 =
  "VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_V1";

export const VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_STORAGE_V1 = {
  serializable_event_contract: true,
  hash_chained: true,
  replayable: true,
  filesystem_write: false,
  persistent_storage_implementation: false,
  rpc_call: false,
  wallet_access: false,
  signer_access: false,
  transaction_signing: false,
  transaction_broadcast: false,
  runtime_route_mount: false,
  validator_registration: false,
  validator_admission: false,
  active_validator_set_mutation: false,
  money_movement: false,
} as const;

export type ValidatorSubmitIntentJournalEventKindV1 =
  | "record_reserved"
  | "broadcast_started"
  | "transaction_observed"
  | "receipt_observed"
  | "record_released"
  | "record_committed";

export type ValidatorSubmitIntentCrashStateV1 =
  | "reserved_not_broadcast"
  | "reservation_expired_requires_new_reservation"
  | "broadcast_outcome_unknown_reconcile_only"
  | "transaction_receipt_unknown_reconcile_only"
  | "receipt_failed_release_required"
  | "receipt_success_commit_required"
  | "released_requires_new_reservation"
  | "committed_terminal";

export type ValidatorSubmitIntentJournalEntryV1 = {
  schema: "void_validator_submit_intent_journal_entry_v1";
  marker: typeof VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_V1;
  lifecycle_marker: typeof VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1;
  store_marker: typeof VOID_VALIDATOR_SUBMIT_INTENT_STORE_V1;
  sequence: number;
  previous_entry_hash_sha256: string;
  event_kind: ValidatorSubmitIntentJournalEventKindV1;
  event_at_ms: number;
  submit_intent_id: string;
  attempt: number;
  record_hash_sha256: string;
  record: ValidatorSubmitIntentRecordV1 | null;
  broadcast_id: string | null;
  transaction_hash: string | null;
  receipt_status: number | null;
  entry_hash_sha256: string;
  authority: typeof VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1;
};

export type ValidatorSubmitIntentJournalAppendInputV1 =
  | {
      event_kind: "record_reserved" | "record_released" | "record_committed";
      record: ValidatorSubmitIntentRecordV1;
    }
  | {
      event_kind: "broadcast_started";
      event_at_ms: string | number;
      submit_intent_id: string;
      attempt: string | number;
      record_hash_sha256: string;
      broadcast_id: string;
    }
  | {
      event_kind: "transaction_observed";
      event_at_ms: string | number;
      submit_intent_id: string;
      attempt: string | number;
      record_hash_sha256: string;
      broadcast_id: string;
      transaction_hash: string;
    }
  | {
      event_kind: "receipt_observed";
      event_at_ms: string | number;
      submit_intent_id: string;
      attempt: string | number;
      record_hash_sha256: string;
      broadcast_id: string;
      transaction_hash: string;
      receipt_status: string | number;
    };

export type ValidatorSubmitIntentJournalIntentStateV1 = {
  submit_intent_id: string;
  attempt: number;
  crash_state: ValidatorSubmitIntentCrashStateV1;
  automatic_rebroadcast_allowed: false;
  new_reservation_allowed_by_journal: boolean;
  requires_operator_reconciliation: boolean;
  requires_release_before_new_reservation: boolean;
  requires_commit_recovery: boolean;
  terminal: boolean;
  record: ValidatorSubmitIntentRecordV1;
  record_hash_sha256: string;
  broadcast_id: string | null;
  transaction_hash: string | null;
  receipt_status: number | null;
};

export type ValidatorSubmitIntentJournalReplayV1 =
  | {
      ok: true;
      marker: typeof VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_V1;
      lifecycle_marker: typeof VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1;
      store_marker: typeof VOID_VALIDATOR_SUBMIT_INTENT_STORE_V1;
      entries_total: number;
      journal_head_hash_sha256: string;
      reconstructed_records: ValidatorSubmitIntentRecordV1[];
      intent_states: ValidatorSubmitIntentJournalIntentStateV1[];
      storage: typeof VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_STORAGE_V1;
      authority: typeof VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1;
    }
  | {
      ok: false;
      marker: typeof VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_V1;
      lifecycle_marker: typeof VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1;
      store_marker: typeof VOID_VALIDATOR_SUBMIT_INTENT_STORE_V1;
      status: "held";
      reason: string;
      entry_index: number | null;
      details?: Record<string, string | number | boolean | null>;
      storage: typeof VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_STORAGE_V1;
      authority: typeof VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1;
    };

export type ValidatorSubmitIntentJournalAppendDecisionV1 =
  | {
      ok: true;
      marker: typeof VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_V1;
      status: "appended";
      entry: ValidatorSubmitIntentJournalEntryV1;
      entries: ValidatorSubmitIntentJournalEntryV1[];
      replay: Extract<ValidatorSubmitIntentJournalReplayV1, { ok: true }>;
      storage: typeof VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_STORAGE_V1;
      authority: typeof VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1;
    }
  | {
      ok: false;
      marker: typeof VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_V1;
      status: "held";
      reason: string;
      details?: Record<string, string | number | boolean | null>;
      storage: typeof VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_STORAGE_V1;
      authority: typeof VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1;
    };

type AttemptProgressV1 = {
  record: ValidatorSubmitIntentRecordV1;
  last_event_at_ms: number;
  broadcast_id: string | null;
  broadcast_started_at_ms: number | null;
  transaction_hash: string | null;
  transaction_observed_at_ms: number | null;
  receipt_status: number | null;
  receipt_observed_at_ms: number | null;
};

const ZERO_HASH = "0".repeat(64);
const INTENT_ID = /^0x[0-9a-f]{64}$/;
const HASH = /^[0-9a-f]{64}$/;
const HEX_ID = /^0x[0-9a-f]{64}$/;
const EVENT_KINDS = new Set<ValidatorSubmitIntentJournalEventKindV1>([
  "record_reserved",
  "broadcast_started",
  "transaction_observed",
  "receipt_observed",
  "record_released",
  "record_committed",
]);

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function parseSafeInteger(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  }
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function normalizeIntentId(value: unknown): string {
  const normalized = String(value || "").trim().toLowerCase();
  return INTENT_ID.test(normalized) ? normalized : "";
}

function normalizeHash(value: unknown): string {
  const normalized = String(value || "").trim().toLowerCase();
  return HASH.test(normalized) ? normalized : "";
}

function normalizeHexId(value: unknown): string {
  const normalized = String(value || "").trim().toLowerCase();
  return HEX_ID.test(normalized) ? normalized : "";
}

function cloneRecord(record: ValidatorSubmitIntentRecordV1): ValidatorSubmitIntentRecordV1 {
  return JSON.parse(JSON.stringify(record)) as ValidatorSubmitIntentRecordV1;
}

function cloneEntry(entry: ValidatorSubmitIntentJournalEntryV1): ValidatorSubmitIntentJournalEntryV1 {
  return JSON.parse(JSON.stringify(entry)) as ValidatorSubmitIntentJournalEntryV1;
}

function allAuthorityFalse(
  authority: typeof VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1,
): boolean {
  return Object.values(authority || {}).every((value) => value === false);
}

function heldReplay(
  reason: string,
  entryIndex: number | null,
  details?: Record<string, string | number | boolean | null>,
): ValidatorSubmitIntentJournalReplayV1 {
  return {
    ok: false,
    marker: VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_V1,
    lifecycle_marker: VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1,
    store_marker: VOID_VALIDATOR_SUBMIT_INTENT_STORE_V1,
    status: "held",
    reason,
    entry_index: entryIndex,
    ...(details ? { details } : {}),
    storage: VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_STORAGE_V1,
    authority: VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1,
  };
}

type ValidatorSubmitIntentJournalAppendHeldV1 = Extract<
  ValidatorSubmitIntentJournalAppendDecisionV1,
  { ok: false }
>;

function heldAppend(
  reason: string,
  details?: Record<string, string | number | boolean | null>,
): ValidatorSubmitIntentJournalAppendHeldV1 {
  return {
    ok: false,
    marker: VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_V1,
    status: "held",
    reason,
    ...(details ? { details } : {}),
    storage: VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_STORAGE_V1,
    authority: VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1,
  };
}

function entryBody(
  entry: Omit<ValidatorSubmitIntentJournalEntryV1, "entry_hash_sha256">,
) {
  return {
    schema: entry.schema,
    marker: entry.marker,
    lifecycle_marker: entry.lifecycle_marker,
    store_marker: entry.store_marker,
    sequence: entry.sequence,
    previous_entry_hash_sha256: entry.previous_entry_hash_sha256,
    event_kind: entry.event_kind,
    event_at_ms: entry.event_at_ms,
    submit_intent_id: entry.submit_intent_id,
    attempt: entry.attempt,
    record_hash_sha256: entry.record_hash_sha256,
    record: entry.record,
    broadcast_id: entry.broadcast_id,
    transaction_hash: entry.transaction_hash,
    receipt_status: entry.receipt_status,
    authority: entry.authority,
  };
}

function finalizeEntry(
  entry: Omit<ValidatorSubmitIntentJournalEntryV1, "entry_hash_sha256">,
): ValidatorSubmitIntentJournalEntryV1 {
  return {
    ...entry,
    entry_hash_sha256: sha256Hex(JSON.stringify(entryBody(entry))),
  };
}

function validateRecord(
  record: ValidatorSubmitIntentRecordV1,
): string | null {
  const nowMs = record.reserved_at_ms;
  const decision = decideValidatorSubmitIntentLifecycleV1({
    action: "inspect",
    now_ms: nowMs,
    submit_intent_id: record.submit_intent_id,
    prior_record: cloneRecord(record),
  });
  if (decision.ok === false) return decision.reason;
  if (!decision.record || decision.record.record_hash_sha256 !== record.record_hash_sha256) {
    return "record_validation_changed_record";
  }
  return null;
}

function compareTransitionRecord(
  expected: ValidatorSubmitIntentRecordV1 | null,
  actual: ValidatorSubmitIntentRecordV1,
): boolean {
  return !!expected &&
    expected.record_hash_sha256 === actual.record_hash_sha256 &&
    JSON.stringify(expected) === JSON.stringify(actual);
}

function validateRecordTransition(
  eventKind: "record_reserved" | "record_released" | "record_committed",
  prior: ValidatorSubmitIntentRecordV1 | null,
  record: ValidatorSubmitIntentRecordV1,
  progress: AttemptProgressV1 | null,
): string | null {
  const recordError = validateRecord(record);
  if (recordError) return `record_invalid:${recordError}`;

  if (eventKind === "record_reserved") {
    if (record.state !== "pending") return "reserved_event_requires_pending_record";
    const ttlMs = record.expires_at_ms - record.reserved_at_ms;
    const decision = decideValidatorSubmitIntentLifecycleV1({
      action: "reserve",
      now_ms: record.reserved_at_ms,
      ttl_ms: ttlMs,
      submit_intent_id: record.submit_intent_id,
      prior_record: prior ? cloneRecord(prior) : null,
    });
    if (decision.ok === false) return `reserve_transition_held:${decision.reason}`;
    if (!decision.record_changed || !compareTransitionRecord(decision.record, record)) {
      return "reserved_record_transition_mismatch";
    }
    return null;
  }

  if (!prior) return "record_transition_missing_prior_record";

  if (eventKind === "record_released") {
    if (record.state !== "released") return "released_event_requires_released_record";
    if (
      progress?.broadcast_id &&
      progress.receipt_status !== 0
    ) {
      return "release_after_broadcast_requires_failed_receipt";
    }
    const decision = decideValidatorSubmitIntentLifecycleV1({
      action: "release",
      now_ms: record.released_at_ms ?? 0,
      submit_intent_id: record.submit_intent_id,
      release_reason: record.release_reason || "",
      prior_record: cloneRecord(prior),
    });
    if (decision.ok === false) return `release_transition_held:${decision.reason}`;
    if (!decision.record_changed || !compareTransitionRecord(decision.record, record)) {
      return "released_record_transition_mismatch";
    }
    return null;
  }

  if (record.state !== "committed") return "committed_event_requires_committed_record";
  if (
    !progress?.transaction_hash ||
    progress.receipt_status !== 1 ||
    progress.transaction_hash !== record.transaction_hash
  ) {
    return "commit_requires_matching_success_receipt";
  }
  const decision = decideValidatorSubmitIntentLifecycleV1({
    action: "commit",
    now_ms: record.committed_at_ms ?? 0,
    submit_intent_id: record.submit_intent_id,
    transaction_hash: record.transaction_hash || "",
    receipt_status: 1,
    prior_record: cloneRecord(prior),
  });
  if (decision.ok === false) return `commit_transition_held:${decision.reason}`;
  if (!decision.record_changed || !compareTransitionRecord(decision.record, record)) {
    return "committed_record_transition_mismatch";
  }
  return null;
}

function validateEntryShape(
  entry: ValidatorSubmitIntentJournalEntryV1,
  expectedSequence: number,
  expectedPreviousHash: string,
): string | null {
  if (
    entry.schema !== "void_validator_submit_intent_journal_entry_v1" ||
    entry.marker !== VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_V1 ||
    entry.lifecycle_marker !== VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1 ||
    entry.store_marker !== VOID_VALIDATOR_SUBMIT_INTENT_STORE_V1
  ) {
    return "entry_schema_or_marker_mismatch";
  }
  if (entry.sequence !== expectedSequence) return "entry_sequence_mismatch";
  if (
    entry.previous_entry_hash_sha256 !== expectedPreviousHash ||
    !HASH.test(entry.previous_entry_hash_sha256)
  ) {
    return "entry_previous_hash_mismatch";
  }
  if (!EVENT_KINDS.has(entry.event_kind)) return "entry_event_kind_invalid";
  if (!Number.isSafeInteger(entry.event_at_ms) || entry.event_at_ms < 0) {
    return "entry_event_time_invalid";
  }
  if (
    normalizeIntentId(entry.submit_intent_id) !== entry.submit_intent_id ||
    !Number.isSafeInteger(entry.attempt) ||
    entry.attempt < 1 ||
    normalizeHash(entry.record_hash_sha256) !== entry.record_hash_sha256
  ) {
    return "entry_intent_attempt_or_record_hash_invalid";
  }
  if (!allAuthorityFalse(entry.authority)) return "entry_authority_not_false";
  if (
    normalizeHash(entry.entry_hash_sha256) !== entry.entry_hash_sha256 ||
    entry.entry_hash_sha256 !== sha256Hex(JSON.stringify(entryBody({
      schema: entry.schema,
      marker: entry.marker,
      lifecycle_marker: entry.lifecycle_marker,
      store_marker: entry.store_marker,
      sequence: entry.sequence,
      previous_entry_hash_sha256: entry.previous_entry_hash_sha256,
      event_kind: entry.event_kind,
      event_at_ms: entry.event_at_ms,
      submit_intent_id: entry.submit_intent_id,
      attempt: entry.attempt,
      record_hash_sha256: entry.record_hash_sha256,
      record: entry.record,
      broadcast_id: entry.broadcast_id,
      transaction_hash: entry.transaction_hash,
      receipt_status: entry.receipt_status,
      authority: entry.authority,
    })))
  ) {
    return "entry_hash_mismatch";
  }
  return null;
}

function classifyIntent(
  progress: AttemptProgressV1,
  nowMs: number,
): ValidatorSubmitIntentJournalIntentStateV1 {
  const record = cloneRecord(progress.record);
  let crashState: ValidatorSubmitIntentCrashStateV1;
  let newReservationAllowed = false;
  let requiresOperatorReconciliation = false;
  let requiresReleaseBeforeNewReservation = false;
  let requiresCommitRecovery = false;
  let terminal = false;

  if (record.state === "committed") {
    crashState = "committed_terminal";
    terminal = true;
  } else if (record.state === "released") {
    crashState = "released_requires_new_reservation";
    newReservationAllowed = true;
  } else if (progress.receipt_status === 1) {
    crashState = "receipt_success_commit_required";
    requiresOperatorReconciliation = true;
    requiresCommitRecovery = true;
  } else if (progress.receipt_status === 0) {
    crashState = "receipt_failed_release_required";
    requiresReleaseBeforeNewReservation = true;
  } else if (progress.transaction_hash) {
    crashState = "transaction_receipt_unknown_reconcile_only";
    requiresOperatorReconciliation = true;
  } else if (progress.broadcast_id) {
    crashState = "broadcast_outcome_unknown_reconcile_only";
    requiresOperatorReconciliation = true;
  } else if (nowMs >= record.expires_at_ms) {
    crashState = "reservation_expired_requires_new_reservation";
    newReservationAllowed = true;
  } else {
    crashState = "reserved_not_broadcast";
  }

  return {
    submit_intent_id: record.submit_intent_id,
    attempt: record.attempt,
    crash_state: crashState,
    automatic_rebroadcast_allowed: false,
    new_reservation_allowed_by_journal: newReservationAllowed,
    requires_operator_reconciliation: requiresOperatorReconciliation,
    requires_release_before_new_reservation: requiresReleaseBeforeNewReservation,
    requires_commit_recovery: requiresCommitRecovery,
    terminal,
    record,
    record_hash_sha256: record.record_hash_sha256,
    broadcast_id: progress.broadcast_id,
    transaction_hash: progress.transaction_hash,
    receipt_status: progress.receipt_status,
  };
}

function replayInternal(
  entries: readonly ValidatorSubmitIntentJournalEntryV1[],
  nowMs: number,
): ValidatorSubmitIntentJournalReplayV1 {
  const progressByIntent = new Map<string, AttemptProgressV1>();
  let previousHash = ZERO_HASH;

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const shapeError = validateEntryShape(entry, index + 1, previousHash);
    if (shapeError) return heldReplay(shapeError, index);

    const current = progressByIntent.get(entry.submit_intent_id) || null;
    const currentRecord = current?.record || null;

    if (current && entry.event_at_ms < current.last_event_at_ms) {
      return heldReplay("entry_time_before_prior_intent_event", index);
    }

    if (
      entry.event_kind === "record_reserved" ||
      entry.event_kind === "record_released" ||
      entry.event_kind === "record_committed"
    ) {
      if (!entry.record) return heldReplay("record_event_missing_record", index);
      if (
        entry.broadcast_id !== null ||
        entry.transaction_hash !== null ||
        entry.receipt_status !== null
      ) {
        return heldReplay("record_event_nonrecord_fields_present", index);
      }
      if (
        entry.record.submit_intent_id !== entry.submit_intent_id ||
        entry.record.attempt !== entry.attempt ||
        entry.record.record_hash_sha256 !== entry.record_hash_sha256
      ) {
        return heldReplay("record_event_binding_mismatch", index);
      }
      const expectedEventAt =
        entry.event_kind === "record_reserved"
          ? entry.record.reserved_at_ms
          : entry.event_kind === "record_released"
            ? entry.record.released_at_ms
            : entry.record.committed_at_ms;
      if (entry.event_at_ms !== expectedEventAt) {
        return heldReplay("record_event_time_mismatch", index);
      }

      const transitionError = validateRecordTransition(
        entry.event_kind,
        currentRecord,
        entry.record,
        current,
      );
      if (transitionError) return heldReplay(transitionError, index);

      progressByIntent.set(entry.submit_intent_id, {
        record: cloneRecord(entry.record),
        last_event_at_ms: entry.event_at_ms,
        broadcast_id: null,
        broadcast_started_at_ms: null,
        transaction_hash: null,
        transaction_observed_at_ms: null,
        receipt_status: null,
        receipt_observed_at_ms: null,
      });
    } else {
      if (entry.record !== null) {
        return heldReplay("nonrecord_event_contains_record", index);
      }
      if (!current || current.record.state !== "pending") {
        return heldReplay("nonrecord_event_requires_pending_record", index);
      }
      if (
        current.record.attempt !== entry.attempt ||
        current.record.record_hash_sha256 !== entry.record_hash_sha256
      ) {
        return heldReplay("nonrecord_event_record_binding_mismatch", index);
      }

      if (entry.event_kind === "broadcast_started") {
        if (
          !entry.broadcast_id ||
          normalizeHexId(entry.broadcast_id) !== entry.broadcast_id ||
          entry.transaction_hash !== null ||
          entry.receipt_status !== null
        ) {
          return heldReplay("broadcast_started_fields_invalid", index);
        }
        if (current.broadcast_id) {
          return heldReplay("broadcast_already_started_for_attempt", index);
        }
        if (entry.event_at_ms >= current.record.expires_at_ms) {
          return heldReplay("broadcast_started_after_reservation_expiry", index);
        }
        current.broadcast_id = entry.broadcast_id;
        current.broadcast_started_at_ms = entry.event_at_ms;
      } else if (entry.event_kind === "transaction_observed") {
        if (
          !current.broadcast_id ||
          entry.broadcast_id !== current.broadcast_id ||
          !entry.transaction_hash ||
          normalizeHexId(entry.transaction_hash) !== entry.transaction_hash ||
          entry.receipt_status !== null
        ) {
          return heldReplay("transaction_observed_fields_invalid", index);
        }
        if (current.transaction_hash) {
          return heldReplay("transaction_already_observed_for_attempt", index);
        }
        if (
          current.broadcast_started_at_ms === null ||
          entry.event_at_ms < current.broadcast_started_at_ms
        ) {
          return heldReplay("transaction_observed_time_invalid", index);
        }
        current.transaction_hash = entry.transaction_hash;
        current.transaction_observed_at_ms = entry.event_at_ms;
      } else {
        const receiptStatus = entry.receipt_status;
        if (
          !current.broadcast_id ||
          !current.transaction_hash ||
          entry.broadcast_id !== current.broadcast_id ||
          entry.transaction_hash !== current.transaction_hash ||
          (receiptStatus !== 0 && receiptStatus !== 1)
        ) {
          return heldReplay("receipt_observed_fields_invalid", index);
        }
        if (current.receipt_status !== null) {
          return heldReplay("receipt_already_observed_for_attempt", index);
        }
        if (
          current.transaction_observed_at_ms === null ||
          entry.event_at_ms < current.transaction_observed_at_ms
        ) {
          return heldReplay("receipt_observed_time_invalid", index);
        }
        current.receipt_status = receiptStatus;
        current.receipt_observed_at_ms = entry.event_at_ms;
      }
      current.last_event_at_ms = entry.event_at_ms;
    }

    previousHash = entry.entry_hash_sha256;
  }

  const progress = [...progressByIntent.values()]
    .sort((a, b) => a.record.submit_intent_id.localeCompare(b.record.submit_intent_id));
  const intentStates = progress.map((item) => classifyIntent(item, nowMs));

  return {
    ok: true,
    marker: VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_V1,
    lifecycle_marker: VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1,
    store_marker: VOID_VALIDATOR_SUBMIT_INTENT_STORE_V1,
    entries_total: entries.length,
    journal_head_hash_sha256: previousHash,
    reconstructed_records: progress.map((item) => cloneRecord(item.record)),
    intent_states: intentStates,
    storage: VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_STORAGE_V1,
    authority: VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1,
  };
}

export function replayValidatorSubmitIntentJournalV1(
  entries: readonly ValidatorSubmitIntentJournalEntryV1[],
  now_ms: string | number,
): ValidatorSubmitIntentJournalReplayV1 {
  const nowMs = parseSafeInteger(now_ms);
  if (nowMs === null) return heldReplay("invalid_now_ms", null);
  if (!Array.isArray(entries)) return heldReplay("entries_not_array", null);
  return replayInternal(entries.map((entry) => cloneEntry(entry)), nowMs);
}

function buildEntry(
  entries: readonly ValidatorSubmitIntentJournalEntryV1[],
  input: ValidatorSubmitIntentJournalAppendInputV1,
): ValidatorSubmitIntentJournalEntryV1 | ValidatorSubmitIntentJournalAppendHeldV1 {
  const eventKind = String(input?.event_kind || "") as ValidatorSubmitIntentJournalEventKindV1;
  if (!EVENT_KINDS.has(eventKind)) return heldAppend("invalid_event_kind");

  let eventAtMs: number | null = null;
  let submitIntentId = "";
  let attempt: number | null = null;
  let recordHash = "";
  let record: ValidatorSubmitIntentRecordV1 | null = null;
  let broadcastId: string | null = null;
  let transactionHash: string | null = null;
  let receiptStatus: number | null = null;

  if (
    eventKind === "record_reserved" ||
    eventKind === "record_released" ||
    eventKind === "record_committed"
  ) {
    const recordInput = (input as Extract<
      ValidatorSubmitIntentJournalAppendInputV1,
      { event_kind: "record_reserved" | "record_released" | "record_committed" }
    >).record;
    if (!recordInput || typeof recordInput !== "object") {
      return heldAppend("record_event_missing_record");
    }
    record = cloneRecord(recordInput);
    submitIntentId = normalizeIntentId(record.submit_intent_id);
    attempt = record.attempt;
    recordHash = normalizeHash(record.record_hash_sha256);
    eventAtMs =
      eventKind === "record_reserved"
        ? record.reserved_at_ms
        : eventKind === "record_released"
          ? record.released_at_ms
          : record.committed_at_ms;
  } else if (eventKind === "broadcast_started") {
    const event = input as Extract<
      ValidatorSubmitIntentJournalAppendInputV1,
      { event_kind: "broadcast_started" }
    >;
    eventAtMs = parseSafeInteger(event.event_at_ms);
    submitIntentId = normalizeIntentId(event.submit_intent_id);
    attempt = parseSafeInteger(event.attempt);
    recordHash = normalizeHash(event.record_hash_sha256);
    broadcastId = normalizeHexId(event.broadcast_id);
  } else if (eventKind === "transaction_observed") {
    const event = input as Extract<
      ValidatorSubmitIntentJournalAppendInputV1,
      { event_kind: "transaction_observed" }
    >;
    eventAtMs = parseSafeInteger(event.event_at_ms);
    submitIntentId = normalizeIntentId(event.submit_intent_id);
    attempt = parseSafeInteger(event.attempt);
    recordHash = normalizeHash(event.record_hash_sha256);
    broadcastId = normalizeHexId(event.broadcast_id);
    transactionHash = normalizeHexId(event.transaction_hash);
  } else {
    const event = input as Extract<
      ValidatorSubmitIntentJournalAppendInputV1,
      { event_kind: "receipt_observed" }
    >;
    eventAtMs = parseSafeInteger(event.event_at_ms);
    submitIntentId = normalizeIntentId(event.submit_intent_id);
    attempt = parseSafeInteger(event.attempt);
    recordHash = normalizeHash(event.record_hash_sha256);
    broadcastId = normalizeHexId(event.broadcast_id);
    transactionHash = normalizeHexId(event.transaction_hash);
    receiptStatus = parseSafeInteger(event.receipt_status);
  }

  if (
    eventAtMs === null ||
    !submitIntentId ||
    attempt === null ||
    attempt < 1 ||
    !recordHash
  ) {
    return heldAppend("event_binding_invalid");
  }
  if (
    (eventKind === "broadcast_started" && !broadcastId) ||
    (eventKind === "transaction_observed" && (!broadcastId || !transactionHash)) ||
    (eventKind === "receipt_observed" &&
      (!broadcastId || !transactionHash || (receiptStatus !== 0 && receiptStatus !== 1)))
  ) {
    return heldAppend("event_specific_fields_invalid");
  }

  return finalizeEntry({
    schema: "void_validator_submit_intent_journal_entry_v1",
    marker: VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_V1,
    lifecycle_marker: VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1,
    store_marker: VOID_VALIDATOR_SUBMIT_INTENT_STORE_V1,
    sequence: entries.length + 1,
    previous_entry_hash_sha256:
      entries.length === 0
        ? ZERO_HASH
        : entries[entries.length - 1].entry_hash_sha256,
    event_kind: eventKind,
    event_at_ms: eventAtMs,
    submit_intent_id: submitIntentId,
    attempt,
    record_hash_sha256: recordHash,
    record,
    broadcast_id: broadcastId,
    transaction_hash: transactionHash,
    receipt_status: receiptStatus,
    authority: VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1,
  });
}

export function appendValidatorSubmitIntentJournalEntryV1(
  entries: readonly ValidatorSubmitIntentJournalEntryV1[],
  input: ValidatorSubmitIntentJournalAppendInputV1,
): ValidatorSubmitIntentJournalAppendDecisionV1 {
  if (!Array.isArray(entries)) return heldAppend("entries_not_array");

  const existing = entries.map((entry) => cloneEntry(entry));
  const existingReplay = replayInternal(existing, 0);
  if (existingReplay.ok === false) {
    return heldAppend("existing_journal_invalid", {
      existing_reason: existingReplay.reason,
      existing_entry_index: existingReplay.entry_index,
    });
  }

  const built = buildEntry(existing, input);
  if ("ok" in built) return built;

  const entry = built;
  const nextEntries = [...existing, entry];
  const replay = replayInternal(nextEntries, entry.event_at_ms);
  if (replay.ok === false) {
    return heldAppend(replay.reason, {
      replay_entry_index: replay.entry_index,
    });
  }

  return {
    ok: true,
    marker: VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_V1,
    status: "appended",
    entry: cloneEntry(entry),
    entries: nextEntries.map((item) => cloneEntry(item)),
    replay,
    storage: VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_STORAGE_V1,
    authority: VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1,
  };
}
