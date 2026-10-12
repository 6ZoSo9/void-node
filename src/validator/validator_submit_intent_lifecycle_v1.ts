import crypto from "node:crypto";

export const VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1 =
  "VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1";

export const VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1 = {
  rpc_call: false,
  wallet_access: false,
  signer_access: false,
  transaction_signing: false,
  transaction_broadcast: false,
  filesystem_write: false,
  runtime_route_mount: false,
  validator_registration: false,
  validator_admission: false,
  active_validator_set_mutation: false,
  money_movement: false,
} as const;

export const VOID_VALIDATOR_SUBMIT_INTENT_DEFAULT_TTL_MS = 300_000;
export const VOID_VALIDATOR_SUBMIT_INTENT_MIN_TTL_MS = 1_000;
export const VOID_VALIDATOR_SUBMIT_INTENT_MAX_TTL_MS = 1_800_000;

export type ValidatorSubmitIntentLifecycleActionV1 =
  | "inspect"
  | "reserve"
  | "commit"
  | "release";

export type ValidatorSubmitIntentLifecycleStateV1 =
  | "pending"
  | "committed"
  | "released";

export type ValidatorSubmitIntentRecordV1 = {
  schema: "void_validator_submit_intent_record_v1";
  marker: typeof VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1;
  submit_intent_id: string;
  state: ValidatorSubmitIntentLifecycleStateV1;
  attempt: number;
  reserved_at_ms: number;
  expires_at_ms: number;
  committed_at_ms: number | null;
  released_at_ms: number | null;
  transaction_hash: string | null;
  release_reason: string | null;
  authority: typeof VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1;
  record_hash_sha256: string;
};

export type ValidatorSubmitIntentLifecycleInputV1 = {
  action: ValidatorSubmitIntentLifecycleActionV1;
  now_ms: string | number;
  submit_intent_id: string;
  ttl_ms?: string | number;
  transaction_hash?: string;
  receipt_status?: string | number;
  release_reason?: string;
  prior_record?: ValidatorSubmitIntentRecordV1 | null;
};

export type ValidatorSubmitIntentLifecycleReadyStatusV1 =
  | "available"
  | "available_after_expiry"
  | "reserved"
  | "duplicate_pending"
  | "committed"
  | "duplicate_committed"
  | "released"
  | "duplicate_released";

export type ValidatorSubmitIntentLifecycleDecisionV1 =
  | {
      ok: true;
      marker: typeof VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1;
      status: ValidatorSubmitIntentLifecycleReadyStatusV1;
      duplicate: boolean;
      record_changed: boolean;
      recovered_from_expired_reservation: boolean;
      record: ValidatorSubmitIntentRecordV1 | null;
      authority: typeof VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1;
    }
  | {
      ok: false;
      marker: typeof VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1;
      status: "held";
      reason: string;
      details?: Record<string, string | number | boolean | null>;
      authority: typeof VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1;
    };

const INTENT_ID = /^0x[0-9a-f]{64}$/;
const TX_HASH = /^0x[0-9a-f]{64}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const RELEASE_REASON = /^[a-z0-9][a-z0-9_.:-]{0,127}$/;

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

function normalizeTransactionHash(value: unknown): string {
  const normalized = String(value || "").trim().toLowerCase();
  return TX_HASH.test(normalized) ? normalized : "";
}

function normalizeReleaseReason(value: unknown): string {
  const normalized = String(value || "").trim().toLowerCase();
  return RELEASE_REASON.test(normalized) ? normalized : "";
}

function held(
  reason: string,
  details?: Record<string, string | number | boolean | null>,
): ValidatorSubmitIntentLifecycleDecisionV1 {
  return {
    ok: false,
    marker: VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1,
    status: "held",
    reason,
    ...(details ? { details } : {}),
    authority: VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1,
  };
}

function recordBody(
  record: Omit<ValidatorSubmitIntentRecordV1, "record_hash_sha256">,
) {
  return {
    schema: record.schema,
    marker: record.marker,
    submit_intent_id: record.submit_intent_id,
    state: record.state,
    attempt: record.attempt,
    reserved_at_ms: record.reserved_at_ms,
    expires_at_ms: record.expires_at_ms,
    committed_at_ms: record.committed_at_ms,
    released_at_ms: record.released_at_ms,
    transaction_hash: record.transaction_hash,
    release_reason: record.release_reason,
    authority: record.authority,
  };
}

function finalizeRecord(
  record: Omit<ValidatorSubmitIntentRecordV1, "record_hash_sha256">,
): ValidatorSubmitIntentRecordV1 {
  return {
    ...record,
    record_hash_sha256: sha256Hex(JSON.stringify(recordBody(record))),
  };
}

function pendingRecord(
  submitIntentId: string,
  attempt: number,
  nowMs: number,
  ttlMs: number,
): ValidatorSubmitIntentRecordV1 {
  return finalizeRecord({
    schema: "void_validator_submit_intent_record_v1",
    marker: VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1,
    submit_intent_id: submitIntentId,
    state: "pending",
    attempt,
    reserved_at_ms: nowMs,
    expires_at_ms: nowMs + ttlMs,
    committed_at_ms: null,
    released_at_ms: null,
    transaction_hash: null,
    release_reason: null,
    authority: VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1,
  });
}

function releasedRecord(
  prior: ValidatorSubmitIntentRecordV1,
  nowMs: number,
  reason: string,
): ValidatorSubmitIntentRecordV1 {
  return finalizeRecord({
    schema: prior.schema,
    marker: prior.marker,
    submit_intent_id: prior.submit_intent_id,
    state: "released",
    attempt: prior.attempt,
    reserved_at_ms: prior.reserved_at_ms,
    expires_at_ms: prior.expires_at_ms,
    committed_at_ms: null,
    released_at_ms: nowMs,
    transaction_hash: null,
    release_reason: reason,
    authority: VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1,
  });
}

function committedRecord(
  prior: ValidatorSubmitIntentRecordV1,
  nowMs: number,
  transactionHash: string,
): ValidatorSubmitIntentRecordV1 {
  return finalizeRecord({
    schema: prior.schema,
    marker: prior.marker,
    submit_intent_id: prior.submit_intent_id,
    state: "committed",
    attempt: prior.attempt,
    reserved_at_ms: prior.reserved_at_ms,
    expires_at_ms: prior.expires_at_ms,
    committed_at_ms: nowMs,
    released_at_ms: null,
    transaction_hash: transactionHash,
    release_reason: null,
    authority: VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1,
  });
}

function allAuthorityFalse(
  authority: ValidatorSubmitIntentRecordV1["authority"],
): boolean {
  return Object.values(authority || {}).every((value) => value === false);
}

function validatePriorRecord(
  prior: ValidatorSubmitIntentRecordV1,
  submitIntentId: string,
): string | null {
  if (
    prior.schema !== "void_validator_submit_intent_record_v1" ||
    prior.marker !== VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1
  ) {
    return "prior_record_schema_or_marker_mismatch";
  }
  if (
    normalizeIntentId(prior.submit_intent_id) !== submitIntentId ||
    prior.submit_intent_id !== submitIntentId
  ) {
    return "prior_record_submit_intent_mismatch";
  }
  if (
    !Number.isSafeInteger(prior.attempt) ||
    prior.attempt < 1 ||
    !Number.isSafeInteger(prior.reserved_at_ms) ||
    prior.reserved_at_ms < 0 ||
    !Number.isSafeInteger(prior.expires_at_ms) ||
    prior.expires_at_ms <= prior.reserved_at_ms
  ) {
    return "prior_record_time_or_attempt_invalid";
  }
  if (!allAuthorityFalse(prior.authority)) {
    return "prior_record_authority_not_false";
  }
  if (!SHA256.test(String(prior.record_hash_sha256 || ""))) {
    return "prior_record_hash_invalid";
  }

  const expectedHash = sha256Hex(
    JSON.stringify(
      recordBody({
        schema: prior.schema,
        marker: prior.marker,
        submit_intent_id: prior.submit_intent_id,
        state: prior.state,
        attempt: prior.attempt,
        reserved_at_ms: prior.reserved_at_ms,
        expires_at_ms: prior.expires_at_ms,
        committed_at_ms: prior.committed_at_ms,
        released_at_ms: prior.released_at_ms,
        transaction_hash: prior.transaction_hash,
        release_reason: prior.release_reason,
        authority: prior.authority,
      }),
    ),
  );
  if (prior.record_hash_sha256 !== expectedHash) {
    return "prior_record_hash_mismatch";
  }

  if (prior.state === "pending") {
    return prior.committed_at_ms === null &&
      prior.released_at_ms === null &&
      prior.transaction_hash === null &&
      prior.release_reason === null
      ? null
      : "prior_pending_record_fields_invalid";
  }

  if (prior.state === "committed") {
    return Number.isSafeInteger(prior.committed_at_ms) &&
      Number(prior.committed_at_ms) >= prior.reserved_at_ms &&
      prior.released_at_ms === null &&
      !!normalizeTransactionHash(prior.transaction_hash) &&
      prior.transaction_hash === normalizeTransactionHash(prior.transaction_hash) &&
      prior.release_reason === null
      ? null
      : "prior_committed_record_fields_invalid";
  }

  if (prior.state === "released") {
    return prior.committed_at_ms === null &&
      Number.isSafeInteger(prior.released_at_ms) &&
      Number(prior.released_at_ms) >= prior.reserved_at_ms &&
      prior.transaction_hash === null &&
      !!normalizeReleaseReason(prior.release_reason) &&
      prior.release_reason === normalizeReleaseReason(prior.release_reason)
      ? null
      : "prior_released_record_fields_invalid";
  }

  return "prior_record_state_invalid";
}

function ready(
  status: ValidatorSubmitIntentLifecycleReadyStatusV1,
  record: ValidatorSubmitIntentRecordV1 | null,
  options?: {
    duplicate?: boolean;
    recordChanged?: boolean;
    recoveredFromExpiredReservation?: boolean;
  },
): ValidatorSubmitIntentLifecycleDecisionV1 {
  return {
    ok: true,
    marker: VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1,
    status,
    duplicate: options?.duplicate === true,
    record_changed: options?.recordChanged === true,
    recovered_from_expired_reservation:
      options?.recoveredFromExpiredReservation === true,
    record,
    authority: VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1,
  };
}

export function decideValidatorSubmitIntentLifecycleV1(
  input: ValidatorSubmitIntentLifecycleInputV1,
): ValidatorSubmitIntentLifecycleDecisionV1 {
  const action = String(input?.action || "") as ValidatorSubmitIntentLifecycleActionV1;
  if (!["inspect", "reserve", "commit", "release"].includes(action)) {
    return held("invalid_action");
  }

  const nowMs = parseSafeInteger(input?.now_ms);
  if (nowMs === null) return held("invalid_now_ms");

  const submitIntentId = normalizeIntentId(input?.submit_intent_id);
  if (!submitIntentId) return held("invalid_submit_intent_id");

  const prior = input?.prior_record || null;
  if (prior) {
    const priorError = validatePriorRecord(prior, submitIntentId);
    if (priorError) return held(priorError);
  }

  if (action === "inspect") {
    if (!prior) return ready("available", null);
    if (prior.state === "pending" && nowMs >= prior.expires_at_ms) {
      return ready(
        "available_after_expiry",
        releasedRecord(prior, nowMs, "reservation_expired"),
        { recordChanged: true, recoveredFromExpiredReservation: true },
      );
    }
    if (prior.state === "pending") {
      return ready("duplicate_pending", prior, { duplicate: true });
    }
    if (prior.state === "committed") {
      return ready("duplicate_committed", prior, { duplicate: true });
    }
    return ready("duplicate_released", prior, { duplicate: true });
  }

  if (action === "reserve") {
    const ttlMs =
      input.ttl_ms === undefined
        ? VOID_VALIDATOR_SUBMIT_INTENT_DEFAULT_TTL_MS
        : parseSafeInteger(input.ttl_ms);
    if (
      ttlMs === null ||
      ttlMs < VOID_VALIDATOR_SUBMIT_INTENT_MIN_TTL_MS ||
      ttlMs > VOID_VALIDATOR_SUBMIT_INTENT_MAX_TTL_MS
    ) {
      return held("invalid_ttl_ms", {
        min_ttl_ms: VOID_VALIDATOR_SUBMIT_INTENT_MIN_TTL_MS,
        max_ttl_ms: VOID_VALIDATOR_SUBMIT_INTENT_MAX_TTL_MS,
      });
    }

    if (!prior) {
      return ready("reserved", pendingRecord(submitIntentId, 1, nowMs, ttlMs), {
        recordChanged: true,
      });
    }
    if (prior.state === "committed") {
      return ready("duplicate_committed", prior, { duplicate: true });
    }
    if (prior.state === "pending" && nowMs < prior.expires_at_ms) {
      return ready("duplicate_pending", prior, { duplicate: true });
    }

    return ready(
      "reserved",
      pendingRecord(submitIntentId, prior.attempt + 1, nowMs, ttlMs),
      {
        recordChanged: true,
        recoveredFromExpiredReservation:
          prior.state === "pending" && nowMs >= prior.expires_at_ms,
      },
    );
  }

  if (action === "commit") {
    const transactionHash = normalizeTransactionHash(input?.transaction_hash);
    if (!transactionHash) return held("invalid_transaction_hash");

    const receiptStatus = parseSafeInteger(input?.receipt_status);
    if (receiptStatus !== 1) {
      return held("receipt_status_not_success", {
        receipt_status: receiptStatus,
      });
    }
    if (!prior) return held("missing_reservation");
    if (prior.state === "released") {
      return held("reservation_released", {
        release_reason: prior.release_reason,
      });
    }
    if (prior.state === "committed") {
      return prior.transaction_hash === transactionHash
        ? ready("duplicate_committed", prior, { duplicate: true })
        : held("committed_transaction_conflict", {
            committed_transaction_hash: prior.transaction_hash,
            attempted_transaction_hash: transactionHash,
          });
    }
    if (nowMs >= prior.expires_at_ms) {
      return held("reservation_expired", {
        expires_at_ms: prior.expires_at_ms,
        now_ms: nowMs,
      });
    }

    return ready("committed", committedRecord(prior, nowMs, transactionHash), {
      recordChanged: true,
    });
  }

  const releaseReason = normalizeReleaseReason(input?.release_reason);
  if (!releaseReason) return held("invalid_release_reason");
  if (!prior) return held("missing_reservation");
  if (prior.state === "committed") {
    return held("committed_reservation_cannot_release", {
      transaction_hash: prior.transaction_hash,
    });
  }
  if (prior.state === "released") {
    return prior.release_reason === releaseReason
      ? ready("duplicate_released", prior, { duplicate: true })
      : held("released_reason_conflict", {
          existing_release_reason: prior.release_reason,
          attempted_release_reason: releaseReason,
        });
  }

  return ready("released", releasedRecord(prior, nowMs, releaseReason), {
    recordChanged: true,
  });
}
