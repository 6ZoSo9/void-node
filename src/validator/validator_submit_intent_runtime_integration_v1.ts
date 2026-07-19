import crypto from "node:crypto";
import {
  VOID_VALIDATOR_SUBMIT_INTENT_DEFAULT_TTL_MS,
  VOID_VALIDATOR_SUBMIT_INTENT_MAX_TTL_MS,
  VOID_VALIDATOR_SUBMIT_INTENT_MIN_TTL_MS,
  decideValidatorSubmitIntentLifecycleV1,
  type ValidatorSubmitIntentRecordV1,
} from "./validator_submit_intent_lifecycle_v1.js";
import {
  type ValidatorSubmitIntentJournalAppendInputV1,
  type ValidatorSubmitIntentJournalIntentStateV1,
} from "./validator_submit_intent_journal_v1.js";
import {
  ValidatorSubmitIntentJournalFileAdapterV1,
  type ValidatorSubmitIntentJournalFileAdapterOptionsV1,
  type ValidatorSubmitIntentJournalFileLoadReadyV1,
} from "./validator_submit_intent_journal_file_adapter_v1.js";

export const VOID_VALIDATOR_SUBMIT_INTENT_RUNTIME_INTEGRATION_V1 =
  "VOID_VALIDATOR_SUBMIT_INTENT_RUNTIME_INTEGRATION_V1";

export const VOID_VALIDATOR_SUBMIT_INTENT_RUNTIME_INTEGRATION_AUTHORITY_V1 = {
  filesystem_read: true,
  filesystem_write: true,
  append_only_journal: true,
  explicit_operator_path_required: true,
  runtime_route_mount: false,
  rpc_call: false,
  wallet_access: false,
  signer_access: false,
  transaction_signing: false,
  transaction_broadcast: false,
  automatic_rebroadcast: false,
  validator_registration: false,
  validator_admission: false,
  active_validator_set_mutation: false,
  money_movement: false,
} as const;

export type ValidatorSubmitIntentRuntimeIntegrationOptionsV1 =
  ValidatorSubmitIntentJournalFileAdapterOptionsV1 & {
    ttl_ms?: string | number;
  };

export type ValidatorSubmitIntentRuntimeIntegrationInputV1 = {
  now_ms: string | number;
  submit_intent_id: string;
};

export type ValidatorSubmitIntentRuntimeIntegrationBroadcastInputV1 =
  ValidatorSubmitIntentRuntimeIntegrationInputV1 & {
    broadcast_id?: string;
  };

export type ValidatorSubmitIntentRuntimeIntegrationTransactionInputV1 =
  ValidatorSubmitIntentRuntimeIntegrationInputV1 & {
    broadcast_id: string;
    transaction_hash: string;
  };

export type ValidatorSubmitIntentRuntimeIntegrationReceiptInputV1 =
  ValidatorSubmitIntentRuntimeIntegrationTransactionInputV1 & {
    receipt_status: string | number;
  };

export type ValidatorSubmitIntentRuntimeIntegrationReleaseInputV1 =
  ValidatorSubmitIntentRuntimeIntegrationInputV1 & {
    release_reason: string;
  };

export type ValidatorSubmitIntentRuntimeIntegrationReadyV1 = {
  ok: true;
  marker: typeof VOID_VALIDATOR_SUBMIT_INTENT_RUNTIME_INTEGRATION_V1;
  status:
    | "available"
    | "reserved"
    | "released"
    | "broadcast_started"
    | "transaction_observed"
    | "receipt_observed"
    | "committed";
  submit_intent_id: string;
  write_performed: boolean;
  automatic_rebroadcast_allowed: false;
  broadcast_id: string | null;
  transaction_hash: string | null;
  receipt_status: number | null;
  record: ValidatorSubmitIntentRecordV1 | null;
  intent_state: ValidatorSubmitIntentJournalIntentStateV1 | null;
  journal_entries_total: number;
  journal_head_hash_sha256: string;
  authority: typeof VOID_VALIDATOR_SUBMIT_INTENT_RUNTIME_INTEGRATION_AUTHORITY_V1;
};

export type ValidatorSubmitIntentRuntimeIntegrationHeldV1 = {
  ok: false;
  marker: typeof VOID_VALIDATOR_SUBMIT_INTENT_RUNTIME_INTEGRATION_V1;
  status: "held";
  reason: string;
  source: "input" | "journal" | "lifecycle" | "runtime_integration";
  submit_intent_id: string;
  write_performed: boolean;
  replay_required: boolean;
  requires_operator_reconciliation: boolean;
  automatic_rebroadcast_allowed: false;
  crash_state: string | null;
  details?: Record<string, string | number | boolean | null>;
  authority: typeof VOID_VALIDATOR_SUBMIT_INTENT_RUNTIME_INTEGRATION_AUTHORITY_V1;
};

export type ValidatorSubmitIntentRuntimeIntegrationDecisionV1 =
  | ValidatorSubmitIntentRuntimeIntegrationReadyV1
  | ValidatorSubmitIntentRuntimeIntegrationHeldV1;

const INTENT_ID = /^0x[0-9a-f]{64}$/;
const HEX_ID = /^0x[0-9a-f]{64}$/;
const RELEASE_REASON = /^[a-z0-9][a-z0-9_.:-]{0,127}$/;

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

function normalizeHexId(value: unknown): string {
  const normalized = String(value || "").trim().toLowerCase();
  return HEX_ID.test(normalized) ? normalized : "";
}

function normalizeReleaseReason(value: unknown): string {
  const normalized = String(value || "").trim().toLowerCase();
  return RELEASE_REASON.test(normalized) ? normalized : "";
}

function parseTtl(value: unknown): number {
  const parsed = value === undefined
    ? VOID_VALIDATOR_SUBMIT_INTENT_DEFAULT_TTL_MS
    : parseSafeInteger(value);
  if (
    parsed === null ||
    parsed < VOID_VALIDATOR_SUBMIT_INTENT_MIN_TTL_MS ||
    parsed > VOID_VALIDATOR_SUBMIT_INTENT_MAX_TTL_MS
  ) {
    throw new RangeError("invalid_ttl_ms");
  }
  return parsed;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function recordFor(
  loaded: ValidatorSubmitIntentJournalFileLoadReadyV1,
  submitIntentId: string,
): ValidatorSubmitIntentRecordV1 | null {
  return loaded.replay.reconstructed_records.find(
    (record) => record.submit_intent_id === submitIntentId,
  ) || null;
}

function stateFor(
  loaded: ValidatorSubmitIntentJournalFileLoadReadyV1,
  submitIntentId: string,
): ValidatorSubmitIntentJournalIntentStateV1 | null {
  return loaded.replay.intent_states.find(
    (state) => state.submit_intent_id === submitIntentId,
  ) || null;
}

function held(
  reason: string,
  source: ValidatorSubmitIntentRuntimeIntegrationHeldV1["source"],
  submitIntentId: string,
  options: {
    writePerformed?: boolean;
    replayRequired?: boolean;
    state?: ValidatorSubmitIntentJournalIntentStateV1 | null;
    details?: Record<string, string | number | boolean | null>;
  } = {},
): ValidatorSubmitIntentRuntimeIntegrationHeldV1 {
  const state = options.state || null;
  return {
    ok: false,
    marker: VOID_VALIDATOR_SUBMIT_INTENT_RUNTIME_INTEGRATION_V1,
    status: "held",
    reason,
    source,
    submit_intent_id: submitIntentId,
    write_performed: options.writePerformed === true,
    replay_required: options.replayRequired === true,
    requires_operator_reconciliation:
      state?.requires_operator_reconciliation === true ||
      options.replayRequired === true ||
      options.writePerformed === true,
    automatic_rebroadcast_allowed: false,
    crash_state: state?.crash_state || null,
    ...(options.details ? { details: options.details } : {}),
    authority: VOID_VALIDATOR_SUBMIT_INTENT_RUNTIME_INTEGRATION_AUTHORITY_V1,
  };
}

function ready(
  status: ValidatorSubmitIntentRuntimeIntegrationReadyV1["status"],
  submitIntentId: string,
  loaded: ValidatorSubmitIntentJournalFileLoadReadyV1,
  options: {
    writePerformed?: boolean;
    broadcastId?: string | null;
    transactionHash?: string | null;
    receiptStatus?: number | null;
    record?: ValidatorSubmitIntentRecordV1 | null;
    state?: ValidatorSubmitIntentJournalIntentStateV1 | null;
  } = {},
): ValidatorSubmitIntentRuntimeIntegrationReadyV1 {
  const state = options.state === undefined
    ? stateFor(loaded, submitIntentId)
    : options.state;
  const record = options.record === undefined
    ? recordFor(loaded, submitIntentId)
    : options.record;
  return {
    ok: true,
    marker: VOID_VALIDATOR_SUBMIT_INTENT_RUNTIME_INTEGRATION_V1,
    status,
    submit_intent_id: submitIntentId,
    write_performed: options.writePerformed === true,
    automatic_rebroadcast_allowed: false,
    broadcast_id: options.broadcastId === undefined
      ? state?.broadcast_id || null
      : options.broadcastId,
    transaction_hash: options.transactionHash === undefined
      ? state?.transaction_hash || null
      : options.transactionHash,
    receipt_status: options.receiptStatus === undefined
      ? state?.receipt_status ?? null
      : options.receiptStatus,
    record: record ? clone(record) : null,
    intent_state: state ? clone(state) : null,
    journal_entries_total: loaded.entries_total,
    journal_head_hash_sha256: loaded.journal_head_hash_sha256,
    authority: VOID_VALIDATOR_SUBMIT_INTENT_RUNTIME_INTEGRATION_AUTHORITY_V1,
  };
}

export class ValidatorSubmitIntentRuntimeIntegrationV1 {
  readonly #adapter: ValidatorSubmitIntentJournalFileAdapterV1;
  readonly #ttlMs: number;

  constructor(options: ValidatorSubmitIntentRuntimeIntegrationOptionsV1) {
    this.#ttlMs = parseTtl(options?.ttl_ms);
    this.#adapter = new ValidatorSubmitIntentJournalFileAdapterV1(options);
  }

  get journal_path(): string {
    return this.#adapter.journal_path;
  }

  inspect(
    input: ValidatorSubmitIntentRuntimeIntegrationInputV1,
  ): ValidatorSubmitIntentRuntimeIntegrationDecisionV1 {
    const parsed = this.#parseInput(input);
    if (parsed.ok === false) return parsed.decision;
    const loaded = this.#load(parsed.nowMs, parsed.submitIntentId);
    if (loaded.ok === false) return loaded.decision;
    return ready("available", parsed.submitIntentId, loaded.loaded);
  }

  reserve(
    input: ValidatorSubmitIntentRuntimeIntegrationInputV1,
  ): ValidatorSubmitIntentRuntimeIntegrationDecisionV1 {
    const parsed = this.#parseInput(input);
    if (parsed.ok === false) return parsed.decision;
    const { nowMs, submitIntentId } = parsed;

    let loadedDecision = this.#load(nowMs, submitIntentId);
    if (loadedDecision.ok === false) return loadedDecision.decision;
    let loaded = loadedDecision.loaded;
    let state = stateFor(loaded, submitIntentId);

    if (state && state.new_reservation_allowed_by_journal !== true) {
      return held(
        `journal_state_${state.crash_state}`,
        "runtime_integration",
        submitIntentId,
        { state },
      );
    }

    if (state?.crash_state === "reservation_expired_requires_new_reservation") {
      const prior = recordFor(loaded, submitIntentId);
      if (!prior) {
        return held("expired_reservation_record_missing", "journal", submitIntentId, { state });
      }
      const expired = decideValidatorSubmitIntentLifecycleV1({
        action: "inspect",
        now_ms: nowMs,
        submit_intent_id: submitIntentId,
        prior_record: prior,
      });
      if (expired.ok === false || !expired.record || expired.record.state !== "released") {
        return held(
          expired.ok === false ? expired.reason : "expired_reservation_release_not_ready",
          "lifecycle",
          submitIntentId,
          { state },
        );
      }
      const appendedRelease = this.#append(
        loaded,
        nowMs,
        submitIntentId,
        { event_kind: "record_released", record: expired.record },
      );
      if (appendedRelease.ok === false) return appendedRelease.decision;
      loadedDecision = this.#load(nowMs, submitIntentId);
      if (loadedDecision.ok === false) return loadedDecision.decision;
      loaded = loadedDecision.loaded;
      state = stateFor(loaded, submitIntentId);
    }

    const prior = recordFor(loaded, submitIntentId);
    const lifecycle = decideValidatorSubmitIntentLifecycleV1({
      action: "reserve",
      now_ms: nowMs,
      ttl_ms: this.#ttlMs,
      submit_intent_id: submitIntentId,
      prior_record: prior,
    });
    if (lifecycle.ok === false) {
      return held(lifecycle.reason, "lifecycle", submitIntentId, {
        state,
        details: lifecycle.details,
      });
    }
    if (
      lifecycle.duplicate ||
      lifecycle.status !== "reserved" ||
      lifecycle.record_changed !== true ||
      !lifecycle.record
    ) {
      return held(`reserve_${lifecycle.status}`, "runtime_integration", submitIntentId, {
        state,
      });
    }

    const appended = this.#append(
      loaded,
      nowMs,
      submitIntentId,
      { event_kind: "record_reserved", record: lifecycle.record },
    );
    if (appended.ok === false) return appended.decision;
    return ready("reserved", submitIntentId, appended.loaded, {
      writePerformed: true,
      record: lifecycle.record,
    });
  }

  releaseBeforeBroadcast(
    input: ValidatorSubmitIntentRuntimeIntegrationReleaseInputV1,
  ): ValidatorSubmitIntentRuntimeIntegrationDecisionV1 {
    const parsed = this.#parseInput(input);
    if (parsed.ok === false) return parsed.decision;
    const reason = normalizeReleaseReason(input.release_reason);
    if (!reason) return held("invalid_release_reason", "input", parsed.submitIntentId);

    const loadedDecision = this.#load(parsed.nowMs, parsed.submitIntentId);
    if (loadedDecision.ok === false) return loadedDecision.decision;
    const loaded = loadedDecision.loaded;
    const state = stateFor(loaded, parsed.submitIntentId);
    if (
      !state ||
      ![
        "reserved_not_broadcast",
        "reservation_expired_requires_new_reservation",
      ].includes(state.crash_state)
    ) {
      return held("release_requires_prebroadcast_reservation", "runtime_integration", parsed.submitIntentId, { state });
    }
    return this.#releaseRecord(loaded, parsed.nowMs, parsed.submitIntentId, reason, state);
  }

  beginBroadcast(
    input: ValidatorSubmitIntentRuntimeIntegrationBroadcastInputV1,
  ): ValidatorSubmitIntentRuntimeIntegrationDecisionV1 {
    const parsed = this.#parseInput(input);
    if (parsed.ok === false) return parsed.decision;
    const loadedDecision = this.#load(parsed.nowMs, parsed.submitIntentId);
    if (loadedDecision.ok === false) return loadedDecision.decision;
    const loaded = loadedDecision.loaded;
    const state = stateFor(loaded, parsed.submitIntentId);
    if (!state || state.crash_state !== "reserved_not_broadcast") {
      return held("broadcast_requires_live_reservation", "runtime_integration", parsed.submitIntentId, { state });
    }
    const broadcastId = input.broadcast_id === undefined
      ? `0x${crypto.randomBytes(32).toString("hex")}`
      : normalizeHexId(input.broadcast_id);
    if (!broadcastId) return held("invalid_broadcast_id", "input", parsed.submitIntentId, { state });

    const appended = this.#append(loaded, parsed.nowMs, parsed.submitIntentId, {
      event_kind: "broadcast_started",
      event_at_ms: parsed.nowMs,
      submit_intent_id: parsed.submitIntentId,
      attempt: state.attempt,
      record_hash_sha256: state.record_hash_sha256,
      broadcast_id: broadcastId,
    });
    if (appended.ok === false) return appended.decision;
    return ready("broadcast_started", parsed.submitIntentId, appended.loaded, {
      writePerformed: true,
      broadcastId,
    });
  }

  observeTransaction(
    input: ValidatorSubmitIntentRuntimeIntegrationTransactionInputV1,
  ): ValidatorSubmitIntentRuntimeIntegrationDecisionV1 {
    const parsed = this.#parseInput(input);
    if (parsed.ok === false) return parsed.decision;
    const broadcastId = normalizeHexId(input.broadcast_id);
    const transactionHash = normalizeHexId(input.transaction_hash);
    if (!broadcastId) return held("invalid_broadcast_id", "input", parsed.submitIntentId);
    if (!transactionHash) return held("invalid_transaction_hash", "input", parsed.submitIntentId);

    const loadedDecision = this.#load(parsed.nowMs, parsed.submitIntentId);
    if (loadedDecision.ok === false) return loadedDecision.decision;
    const loaded = loadedDecision.loaded;
    const state = stateFor(loaded, parsed.submitIntentId);
    if (!state || state.crash_state !== "broadcast_outcome_unknown_reconcile_only") {
      return held("transaction_observation_requires_broadcast_started", "runtime_integration", parsed.submitIntentId, { state });
    }
    if (state.broadcast_id !== broadcastId) {
      return held("broadcast_id_mismatch", "runtime_integration", parsed.submitIntentId, { state });
    }

    const appended = this.#append(loaded, parsed.nowMs, parsed.submitIntentId, {
      event_kind: "transaction_observed",
      event_at_ms: parsed.nowMs,
      submit_intent_id: parsed.submitIntentId,
      attempt: state.attempt,
      record_hash_sha256: state.record_hash_sha256,
      broadcast_id: broadcastId,
      transaction_hash: transactionHash,
    });
    if (appended.ok === false) return appended.decision;
    return ready("transaction_observed", parsed.submitIntentId, appended.loaded, {
      writePerformed: true,
      broadcastId,
      transactionHash,
    });
  }

  observeReceipt(
    input: ValidatorSubmitIntentRuntimeIntegrationReceiptInputV1,
  ): ValidatorSubmitIntentRuntimeIntegrationDecisionV1 {
    const parsed = this.#parseInput(input);
    if (parsed.ok === false) return parsed.decision;
    const broadcastId = normalizeHexId(input.broadcast_id);
    const transactionHash = normalizeHexId(input.transaction_hash);
    const receiptStatus = parseSafeInteger(input.receipt_status);
    if (!broadcastId) return held("invalid_broadcast_id", "input", parsed.submitIntentId);
    if (!transactionHash) return held("invalid_transaction_hash", "input", parsed.submitIntentId);
    if (receiptStatus !== 0 && receiptStatus !== 1) {
      return held("invalid_receipt_status", "input", parsed.submitIntentId);
    }

    const loadedDecision = this.#load(parsed.nowMs, parsed.submitIntentId);
    if (loadedDecision.ok === false) return loadedDecision.decision;
    const loaded = loadedDecision.loaded;
    const state = stateFor(loaded, parsed.submitIntentId);
    if (!state || state.crash_state !== "transaction_receipt_unknown_reconcile_only") {
      return held("receipt_observation_requires_transaction", "runtime_integration", parsed.submitIntentId, { state });
    }
    if (state.broadcast_id !== broadcastId || state.transaction_hash !== transactionHash) {
      return held("receipt_binding_mismatch", "runtime_integration", parsed.submitIntentId, { state });
    }

    const appended = this.#append(loaded, parsed.nowMs, parsed.submitIntentId, {
      event_kind: "receipt_observed",
      event_at_ms: parsed.nowMs,
      submit_intent_id: parsed.submitIntentId,
      attempt: state.attempt,
      record_hash_sha256: state.record_hash_sha256,
      broadcast_id: broadcastId,
      transaction_hash: transactionHash,
      receipt_status: receiptStatus,
    });
    if (appended.ok === false) return appended.decision;
    return ready("receipt_observed", parsed.submitIntentId, appended.loaded, {
      writePerformed: true,
      broadcastId,
      transactionHash,
      receiptStatus,
    });
  }

  releaseFailedReceipt(
    input: ValidatorSubmitIntentRuntimeIntegrationReleaseInputV1,
  ): ValidatorSubmitIntentRuntimeIntegrationDecisionV1 {
    const parsed = this.#parseInput(input);
    if (parsed.ok === false) return parsed.decision;
    const reason = normalizeReleaseReason(input.release_reason);
    if (!reason) return held("invalid_release_reason", "input", parsed.submitIntentId);

    const loadedDecision = this.#load(parsed.nowMs, parsed.submitIntentId);
    if (loadedDecision.ok === false) return loadedDecision.decision;
    const loaded = loadedDecision.loaded;
    const state = stateFor(loaded, parsed.submitIntentId);
    if (!state || state.crash_state !== "receipt_failed_release_required") {
      return held("failed_receipt_release_not_ready", "runtime_integration", parsed.submitIntentId, { state });
    }
    return this.#releaseRecord(loaded, parsed.nowMs, parsed.submitIntentId, reason, state);
  }

  commitSuccessfulReceipt(
    input: ValidatorSubmitIntentRuntimeIntegrationInputV1,
  ): ValidatorSubmitIntentRuntimeIntegrationDecisionV1 {
    const parsed = this.#parseInput(input);
    if (parsed.ok === false) return parsed.decision;
    const loadedDecision = this.#load(parsed.nowMs, parsed.submitIntentId);
    if (loadedDecision.ok === false) return loadedDecision.decision;
    const loaded = loadedDecision.loaded;
    const state = stateFor(loaded, parsed.submitIntentId);
    if (
      !state ||
      state.crash_state !== "receipt_success_commit_required" ||
      !state.transaction_hash ||
      state.receipt_status !== 1
    ) {
      return held("successful_receipt_commit_not_ready", "runtime_integration", parsed.submitIntentId, { state });
    }

    const lifecycle = decideValidatorSubmitIntentLifecycleV1({
      action: "commit",
      now_ms: parsed.nowMs,
      submit_intent_id: parsed.submitIntentId,
      transaction_hash: state.transaction_hash,
      receipt_status: 1,
      prior_record: state.record,
    });
    if (lifecycle.ok === false || !lifecycle.record || lifecycle.record.state !== "committed") {
      return held(
        lifecycle.ok === false ? lifecycle.reason : "commit_record_not_ready",
        "lifecycle",
        parsed.submitIntentId,
        { state, details: lifecycle.ok === false ? lifecycle.details : undefined },
      );
    }

    const appended = this.#append(loaded, parsed.nowMs, parsed.submitIntentId, {
      event_kind: "record_committed",
      record: lifecycle.record,
    });
    if (appended.ok === false) return appended.decision;
    return ready("committed", parsed.submitIntentId, appended.loaded, {
      writePerformed: true,
      transactionHash: state.transaction_hash,
      receiptStatus: 1,
      record: lifecycle.record,
    });
  }

  #releaseRecord(
    loaded: ValidatorSubmitIntentJournalFileLoadReadyV1,
    nowMs: number,
    submitIntentId: string,
    reason: string,
    state: ValidatorSubmitIntentJournalIntentStateV1,
  ): ValidatorSubmitIntentRuntimeIntegrationDecisionV1 {
    const lifecycle = decideValidatorSubmitIntentLifecycleV1({
      action: "release",
      now_ms: nowMs,
      submit_intent_id: submitIntentId,
      release_reason: reason,
      prior_record: state.record,
    });
    if (lifecycle.ok === false || !lifecycle.record || lifecycle.record.state !== "released") {
      return held(
        lifecycle.ok === false ? lifecycle.reason : "release_record_not_ready",
        "lifecycle",
        submitIntentId,
        { state, details: lifecycle.ok === false ? lifecycle.details : undefined },
      );
    }
    const appended = this.#append(loaded, nowMs, submitIntentId, {
      event_kind: "record_released",
      record: lifecycle.record,
    });
    if (appended.ok === false) return appended.decision;
    return ready("released", submitIntentId, appended.loaded, {
      writePerformed: true,
      record: lifecycle.record,
    });
  }

  #append(
    loaded: ValidatorSubmitIntentJournalFileLoadReadyV1,
    nowMs: number,
    submitIntentId: string,
    event: ValidatorSubmitIntentJournalAppendInputV1,
  ):
    | { ok: true; loaded: ValidatorSubmitIntentJournalFileLoadReadyV1 }
    | { ok: false; decision: ValidatorSubmitIntentRuntimeIntegrationHeldV1 } {
    const appended = this.#adapter.append({
      now_ms: nowMs,
      expected_entries_total: loaded.entries_total,
      expected_head_hash_sha256: loaded.journal_head_hash_sha256,
      event,
    });
    if (appended.ok === false) {
      return {
        ok: false,
        decision: held(appended.reason, "journal", submitIntentId, {
          writePerformed: appended.write_performed,
          replayRequired: appended.replay_required,
          state: stateFor(loaded, submitIntentId),
          details: {
            journal_source: appended.source,
            write_performed: appended.write_performed,
            replay_required: appended.replay_required,
          },
        }),
      };
    }
    const next = this.#adapter.load(nowMs);
    if (next.ok === false) {
      return {
        ok: false,
        decision: held("journal_reload_failed_after_append", "journal", submitIntentId, {
          writePerformed: true,
          replayRequired: true,
          details: { journal_reason: next.reason, journal_source: next.source },
        }),
      };
    }
    return { ok: true, loaded: next };
  }

  #load(
    nowMs: number,
    submitIntentId: string,
  ):
    | { ok: true; loaded: ValidatorSubmitIntentJournalFileLoadReadyV1 }
    | { ok: false; decision: ValidatorSubmitIntentRuntimeIntegrationHeldV1 } {
    const loaded = this.#adapter.load(nowMs);
    if (loaded.ok === false) {
      return {
        ok: false,
        decision: held(loaded.reason, "journal", submitIntentId, {
          details: { journal_source: loaded.source },
        }),
      };
    }
    return { ok: true, loaded };
  }

  #parseInput(
    input: ValidatorSubmitIntentRuntimeIntegrationInputV1,
  ):
    | { ok: true; nowMs: number; submitIntentId: string }
    | { ok: false; decision: ValidatorSubmitIntentRuntimeIntegrationHeldV1 } {
    const nowMs = parseSafeInteger(input?.now_ms);
    const submitIntentId = normalizeIntentId(input?.submit_intent_id);
    if (nowMs === null) {
      return { ok: false, decision: held("invalid_now_ms", "input", submitIntentId) };
    }
    if (!submitIntentId) {
      return { ok: false, decision: held("invalid_submit_intent_id", "input", "") };
    }
    return { ok: true, nowMs, submitIntentId };
  }
}
