import {
  VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1,
  VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1,
  decideValidatorSubmitIntentLifecycleV1,
  type ValidatorSubmitIntentLifecycleInputV1,
  type ValidatorSubmitIntentLifecycleReadyStatusV1,
  type ValidatorSubmitIntentRecordV1,
} from "./validator_submit_intent_lifecycle_v1.js";

export const VOID_VALIDATOR_SUBMIT_INTENT_STORE_V1 =
  "VOID_VALIDATOR_SUBMIT_INTENT_STORE_V1";

export const VOID_VALIDATOR_SUBMIT_INTENT_STORE_STORAGE_V1 = {
  process_local_memory: true,
  persistent_storage: false,
  filesystem_write: false,
  multi_process_shared: false,
  survives_process_restart: false,
} as const;

export const VOID_VALIDATOR_SUBMIT_INTENT_STORE_DEFAULT_MAX_RECORDS = 10_000;
export const VOID_VALIDATOR_SUBMIT_INTENT_STORE_MIN_MAX_RECORDS = 1;
export const VOID_VALIDATOR_SUBMIT_INTENT_STORE_MAX_MAX_RECORDS = 100_000;

export type ValidatorSubmitIntentStoreOptionsV1 = {
  max_records?: string | number;
};

export type ValidatorSubmitIntentStoreInputV1 = Omit<
  ValidatorSubmitIntentLifecycleInputV1,
  "prior_record"
> & {
  expected_record_hash?: string | null;
};

export type ValidatorSubmitIntentStoreStatsV1 = {
  marker: typeof VOID_VALIDATOR_SUBMIT_INTENT_STORE_V1;
  lifecycle_marker: typeof VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1;
  store_version: number;
  max_records: number;
  records_total: number;
  pending_records: number;
  committed_records: number;
  released_records: number;
  storage: typeof VOID_VALIDATOR_SUBMIT_INTENT_STORE_STORAGE_V1;
  authority: typeof VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1;
};

export type ValidatorSubmitIntentStoreSnapshotV1 = {
  marker: typeof VOID_VALIDATOR_SUBMIT_INTENT_STORE_V1;
  lifecycle_marker: typeof VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1;
  store_version: number;
  records: ValidatorSubmitIntentRecordV1[];
  storage: typeof VOID_VALIDATOR_SUBMIT_INTENT_STORE_STORAGE_V1;
  authority: typeof VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1;
};

export type ValidatorSubmitIntentStoreDecisionV1 =
  | {
      ok: true;
      marker: typeof VOID_VALIDATOR_SUBMIT_INTENT_STORE_V1;
      lifecycle_marker: typeof VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1;
      status: ValidatorSubmitIntentLifecycleReadyStatusV1;
      duplicate: boolean;
      store_changed: boolean;
      store_version: number;
      store_size: number;
      previous_record_hash: string | null;
      current_record_hash: string | null;
      recovered_from_expired_reservation: boolean;
      record: ValidatorSubmitIntentRecordV1 | null;
      storage: typeof VOID_VALIDATOR_SUBMIT_INTENT_STORE_STORAGE_V1;
      authority: typeof VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1;
    }
  | {
      ok: false;
      marker: typeof VOID_VALIDATOR_SUBMIT_INTENT_STORE_V1;
      lifecycle_marker: typeof VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1;
      status: "held";
      reason: string;
      source: "store" | "lifecycle";
      details?: Record<string, string | number | boolean | null>;
      store_changed: false;
      store_version: number;
      store_size: number;
      current_record_hash: string | null;
      storage: typeof VOID_VALIDATOR_SUBMIT_INTENT_STORE_STORAGE_V1;
      authority: typeof VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1;
    };

const INTENT_ID = /^0x[0-9a-f]{64}$/;
const RECORD_HASH = /^[0-9a-f]{64}$/;
const ACTIONS = new Set(["inspect", "reserve", "commit", "release"]);

function parseBoundedMaxRecords(value: unknown): number {
  const raw = value === undefined
    ? VOID_VALIDATOR_SUBMIT_INTENT_STORE_DEFAULT_MAX_RECORDS
    : value;

  let parsed: number;
  if (typeof raw === "number") {
    parsed = raw;
  } else if (typeof raw === "string" && /^(0|[1-9][0-9]*)$/.test(raw)) {
    parsed = Number(raw);
  } else {
    throw new RangeError("invalid_max_records");
  }

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < VOID_VALIDATOR_SUBMIT_INTENT_STORE_MIN_MAX_RECORDS ||
    parsed > VOID_VALIDATOR_SUBMIT_INTENT_STORE_MAX_MAX_RECORDS
  ) {
    throw new RangeError("invalid_max_records");
  }
  return parsed;
}

function normalizeIntentId(value: unknown): string {
  const normalized = String(value || "").trim().toLowerCase();
  return INTENT_ID.test(normalized) ? normalized : "";
}

function normalizeRecordHash(value: unknown): string {
  const normalized = String(value || "").trim().toLowerCase();
  return RECORD_HASH.test(normalized) ? normalized : "";
}

function cloneRecord(
  record: ValidatorSubmitIntentRecordV1 | null,
): ValidatorSubmitIntentRecordV1 | null {
  return record
    ? (JSON.parse(JSON.stringify(record)) as ValidatorSubmitIntentRecordV1)
    : null;
}

function held(
  reason: string,
  source: "store" | "lifecycle",
  storeVersion: number,
  storeSize: number,
  current: ValidatorSubmitIntentRecordV1 | null,
  details?: Record<string, string | number | boolean | null>,
): ValidatorSubmitIntentStoreDecisionV1 {
  return {
    ok: false,
    marker: VOID_VALIDATOR_SUBMIT_INTENT_STORE_V1,
    lifecycle_marker: VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1,
    status: "held",
    reason,
    source,
    ...(details ? { details } : {}),
    store_changed: false,
    store_version: storeVersion,
    store_size: storeSize,
    current_record_hash: current?.record_hash_sha256 || null,
    storage: VOID_VALIDATOR_SUBMIT_INTENT_STORE_STORAGE_V1,
    authority: VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1,
  };
}

export class ValidatorSubmitIntentStoreV1 {
  readonly #maxRecords: number;
  readonly #records = new Map<string, ValidatorSubmitIntentRecordV1>();
  #version = 0;

  constructor(options: ValidatorSubmitIntentStoreOptionsV1 = {}) {
    this.#maxRecords = parseBoundedMaxRecords(options.max_records);
  }

  get stats(): ValidatorSubmitIntentStoreStatsV1 {
    let pending = 0;
    let committed = 0;
    let released = 0;

    for (const record of this.#records.values()) {
      if (record.state === "pending") pending += 1;
      else if (record.state === "committed") committed += 1;
      else released += 1;
    }

    return {
      marker: VOID_VALIDATOR_SUBMIT_INTENT_STORE_V1,
      lifecycle_marker: VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1,
      store_version: this.#version,
      max_records: this.#maxRecords,
      records_total: this.#records.size,
      pending_records: pending,
      committed_records: committed,
      released_records: released,
      storage: VOID_VALIDATOR_SUBMIT_INTENT_STORE_STORAGE_V1,
      authority: VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1,
    };
  }

  snapshot(): ValidatorSubmitIntentStoreSnapshotV1 {
    const records = [...this.#records.values()]
      .sort((a, b) => a.submit_intent_id.localeCompare(b.submit_intent_id))
      .map((record) => cloneRecord(record) as ValidatorSubmitIntentRecordV1);

    return {
      marker: VOID_VALIDATOR_SUBMIT_INTENT_STORE_V1,
      lifecycle_marker: VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1,
      store_version: this.#version,
      records,
      storage: VOID_VALIDATOR_SUBMIT_INTENT_STORE_STORAGE_V1,
      authority: VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1,
    };
  }

  apply(
    input: ValidatorSubmitIntentStoreInputV1,
  ): ValidatorSubmitIntentStoreDecisionV1 {
    const action = String(input?.action || "");
    if (!ACTIONS.has(action)) {
      return held(
        "invalid_action",
        "lifecycle",
        this.#version,
        this.#records.size,
        null,
      );
    }

    const submitIntentId = normalizeIntentId(input?.submit_intent_id);
    if (!submitIntentId) {
      return held(
        "invalid_submit_intent_id",
        "lifecycle",
        this.#version,
        this.#records.size,
        null,
      );
    }

    const current = this.#records.get(submitIntentId) || null;

    if (action !== "inspect") {
      const hasExpected = Object.prototype.hasOwnProperty.call(
        input,
        "expected_record_hash",
      );
      if (!hasExpected) {
        return held(
          "expected_record_hash_required",
          "store",
          this.#version,
          this.#records.size,
          current,
        );
      }

      const expectedRaw = input.expected_record_hash;
      if (expectedRaw === null) {
        if (current) {
          return held(
            "expected_record_absent_but_present",
            "store",
            this.#version,
            this.#records.size,
            current,
          );
        }
      } else {
        const expected = normalizeRecordHash(expectedRaw);
        if (!expected) {
          return held(
            "invalid_expected_record_hash",
            "store",
            this.#version,
            this.#records.size,
            current,
          );
        }
        if (!current) {
          return held(
            "expected_record_missing",
            "store",
            this.#version,
            this.#records.size,
            null,
            { expected_record_hash: expected },
          );
        }
        if (current.record_hash_sha256 !== expected) {
          return held(
            "expected_record_hash_mismatch",
            "store",
            this.#version,
            this.#records.size,
            current,
            {
              expected_record_hash: expected,
              current_record_hash: current.record_hash_sha256,
            },
          );
        }
      }
    }

    if (
      action === "reserve" &&
      !current &&
      this.#records.size >= this.#maxRecords
    ) {
      return held(
        "store_capacity_reached",
        "store",
        this.#version,
        this.#records.size,
        null,
        { max_records: this.#maxRecords },
      );
    }

    const lifecycle = decideValidatorSubmitIntentLifecycleV1({
      action: action as ValidatorSubmitIntentLifecycleInputV1["action"],
      now_ms: input.now_ms,
      submit_intent_id: submitIntentId,
      ...(input.ttl_ms === undefined ? {} : { ttl_ms: input.ttl_ms }),
      ...(input.transaction_hash === undefined
        ? {}
        : { transaction_hash: input.transaction_hash }),
      ...(input.receipt_status === undefined
        ? {}
        : { receipt_status: input.receipt_status }),
      ...(input.release_reason === undefined
        ? {}
        : { release_reason: input.release_reason }),
      prior_record: cloneRecord(current),
    });

    if (lifecycle.ok === false) {
      return held(
        lifecycle.reason,
        "lifecycle",
        this.#version,
        this.#records.size,
        current,
        lifecycle.details,
      );
    }

    const previousHash = current?.record_hash_sha256 || null;
    let storeChanged = false;

    if (lifecycle.record_changed) {
      if (!lifecycle.record) {
        return held(
          "lifecycle_changed_without_record",
          "store",
          this.#version,
          this.#records.size,
          current,
        );
      }
      this.#records.set(
        submitIntentId,
        cloneRecord(lifecycle.record) as ValidatorSubmitIntentRecordV1,
      );
      this.#version += 1;
      storeChanged = true;
    }

    const stored = this.#records.get(submitIntentId) || null;
    return {
      ok: true,
      marker: VOID_VALIDATOR_SUBMIT_INTENT_STORE_V1,
      lifecycle_marker: VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_V1,
      status: lifecycle.status,
      duplicate: lifecycle.duplicate,
      store_changed: storeChanged,
      store_version: this.#version,
      store_size: this.#records.size,
      previous_record_hash: previousHash,
      current_record_hash: stored?.record_hash_sha256 || null,
      recovered_from_expired_reservation:
        lifecycle.recovered_from_expired_reservation,
      record: cloneRecord(stored),
      storage: VOID_VALIDATOR_SUBMIT_INTENT_STORE_STORAGE_V1,
      authority: VOID_VALIDATOR_SUBMIT_INTENT_LIFECYCLE_AUTHORITY_V1,
    };
  }
}
