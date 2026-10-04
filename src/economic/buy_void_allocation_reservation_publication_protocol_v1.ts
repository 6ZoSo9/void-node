import crypto from "node:crypto";

import {
  classifyBuyVoidAllocationReservationLedgerV1,
} from "./buy_void_allocation_reservation_ledger_v1.js";
import {
  classifyBuyVoidAllocationReservationHighWaterBindingV1,
  planBuyVoidAllocationReservationHighWaterAdvanceV1,
} from "./buy_void_allocation_reservation_high_water_v1.js";

export const VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_PROTOCOL_V1 =
  "VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_PROTOCOL_V1";

export const VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_INTENT_V1 =
  "VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_INTENT_V1";

export const VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_INTENT_SCHEMA_V1 =
  "void_buy_void_allocation_reservation_publication_intent_v1";

export const VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    pure_publication_intent: true,
    pure_recovery_classification: true,
    exact_prior_state_binding: true,
    exact_next_state_binding: true,
    single_append_publication: true,
    recoverable_intent_only_phase: true,
    recoverable_ledger_committed_phase: true,
    recoverable_complete_phase: true,
    high_water_ahead_rejected: true,
    unknown_mixed_state_rejected: true,
    runtime_integration: false,
    protected_high_water_storage: false,
    filesystem_read: false,
    filesystem_write: false,
    allocation_reservation_write: false,
    high_water_write: false,
    publication_intent_write: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    market_activation: false,
    public_presale_activation: false,
    production_gate_ready: false,
    funds_movement: false,
  });

const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const RECORD_ID = /^voidalloc1_[0-9a-f]{64}$/u;
const MAX_LEDGER_BYTES = 64 * 1024 * 1024;
const MAX_APPEND_BYTES = 64 * 1024;
const MAX_HIGH_WATER_BYTES = 4096;
const MAX_INTENT_BYTES = 256 * 1024;

const INTENT_KEYS = Object.freeze([
  "append_bytes_base64",
  "append_sha256",
  "marker",
  "next_high_water_bytes",
  "next_high_water_bytes_base64",
  "next_high_water_sha256",
  "next_ledger_bytes",
  "next_ledger_sha256",
  "next_record_count",
  "next_tip_hash",
  "prior_high_water_bytes",
  "prior_high_water_sha256",
  "prior_ledger_bytes",
  "prior_ledger_sha256",
  "prior_record_count",
  "prior_tip_hash",
  "record_hash",
  "record_id",
  "schema",
  "version",
]);

type PublicationIntentBodyV1 = {
  schema: typeof VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_INTENT_SCHEMA_V1;
  marker: typeof VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_INTENT_V1;
  version: 1;
  record_id: string;
  record_hash: string;
  prior_record_count: number;
  prior_tip_hash: string;
  prior_ledger_sha256: string;
  prior_ledger_bytes: number;
  prior_high_water_sha256: string;
  prior_high_water_bytes: number;
  next_record_count: number;
  next_tip_hash: string;
  next_ledger_sha256: string;
  next_ledger_bytes: number;
  next_high_water_sha256: string;
  next_high_water_bytes: number;
  append_sha256: string;
  append_bytes_base64: string;
  next_high_water_bytes_base64: string;
};

export type BuyVoidAllocationReservationPublicationHeldV1 = {
  ok: false;
  status: "held";
  marker: typeof VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_PROTOCOL_V1;
  version: 1;
  reason: string;
  authority:
    typeof VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_AUTHORITY_V1;
};

export type BuyVoidAllocationReservationPublicationIntentBuiltV1 = {
  ok: true;
  status: "intent_built";
  marker: typeof VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_PROTOCOL_V1;
  version: 1;
  operation_performed: false;
  intent_json: string;
  intent_sha256: string;
  record_id: string;
  record_hash: string;
  authority:
    typeof VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_AUTHORITY_V1;
};

export type BuyVoidAllocationReservationPublicationRecoveryV1 = {
  ok: true;
  status: "recoverable";
  marker: typeof VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_PROTOCOL_V1;
  version: 1;
  phase: "intent_only" | "ledger_committed" | "complete";
  operation_performed: false;
  record_id: string;
  record_hash: string;
  write_ledger_append_required: boolean;
  write_high_water_required: boolean;
  remove_intent_after_postcheck: true;
  append_sha256: string;
  append_bytes_base64: string;
  next_high_water_sha256: string;
  next_high_water_json: string;
  authority:
    typeof VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_AUTHORITY_V1;
};

function held(
  reason: string,
): BuyVoidAllocationReservationPublicationHeldV1 {
  return Object.freeze({
    ok: false,
    status: "held",
    marker:
      VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_PROTOCOL_V1,
    version: 1,
    reason,
    authority:
      VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_AUTHORITY_V1,
  });
}

function sha256Id(bytes: Buffer): string {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(bytes).digest("hex")
  );
}

function bytesV1(
  value: string | Buffer,
  maxBytes: number,
  code: string,
): Buffer {
  const bytes = Buffer.isBuffer(value)
    ? Buffer.from(value)
    : Buffer.from(String(value ?? ""), "utf8");
  if (bytes.length > maxBytes) throw new Error(code);
  return bytes;
}

function ledgerFingerprintV1(ledgerBytes: Buffer) {
  const ledger =
    classifyBuyVoidAllocationReservationLedgerV1(ledgerBytes);
  if (ledger.ok === false) {
    throw new Error(
      "allocation_reservation_publication_ledger_" +
        ledger.reason,
    );
  }
  return Object.freeze({
    record_count: ledger.record_count,
    tip_hash: ledger.tip_hash,
    ledger_sha256: sha256Id(ledgerBytes),
    ledger_bytes: ledgerBytes.length,
    records: ledger.records,
  });
}

function canonicalIntentJsonV1(
  body: PublicationIntentBodyV1,
): string {
  return (
    JSON.stringify({
      schema: body.schema,
      marker: body.marker,
      version: body.version,
      record_id: body.record_id,
      record_hash: body.record_hash,
      prior_record_count: body.prior_record_count,
      prior_tip_hash: body.prior_tip_hash,
      prior_ledger_sha256: body.prior_ledger_sha256,
      prior_ledger_bytes: body.prior_ledger_bytes,
      prior_high_water_sha256: body.prior_high_water_sha256,
      prior_high_water_bytes: body.prior_high_water_bytes,
      next_record_count: body.next_record_count,
      next_tip_hash: body.next_tip_hash,
      next_ledger_sha256: body.next_ledger_sha256,
      next_ledger_bytes: body.next_ledger_bytes,
      next_high_water_sha256: body.next_high_water_sha256,
      next_high_water_bytes: body.next_high_water_bytes,
      append_sha256: body.append_sha256,
      append_bytes_base64: body.append_bytes_base64,
      next_high_water_bytes_base64:
        body.next_high_water_bytes_base64,
    }) + "\n"
  );
}

function integerFieldV1(
  value: unknown,
  max: number,
  code: string,
): number {
  const parsed = Number(value);
  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 0 ||
    parsed > max
  ) {
    throw new Error(code);
  }
  return parsed;
}

function parseIntentV1(
  intentBytesInput: string | Buffer,
): {
  body: Readonly<PublicationIntentBodyV1>;
  append_bytes: Buffer;
  next_high_water_bytes: Buffer;
} {
  const bytes = bytesV1(
    intentBytesInput,
    MAX_INTENT_BYTES,
    "allocation_reservation_publication_intent_too_large",
  );
  if (bytes.length < 2) {
    throw new Error(
      "allocation_reservation_publication_intent_empty",
    );
  }
  const text = bytes.toString("utf8");
  if (!text.endsWith("\n")) {
    throw new Error(
      "allocation_reservation_publication_intent_missing_final_newline",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(0, -1));
  } catch {
    throw new Error(
      "allocation_reservation_publication_intent_json_invalid",
    );
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    throw new Error(
      "allocation_reservation_publication_intent_shape_invalid",
    );
  }
  const raw = parsed as Record<string, unknown>;
  if (
    Object.keys(raw).sort().join("\n") !==
    [...INTENT_KEYS].sort().join("\n")
  ) {
    throw new Error(
      "allocation_reservation_publication_intent_shape_invalid",
    );
  }
  if (
    raw.schema !==
      VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_INTENT_SCHEMA_V1 ||
    raw.marker !==
      VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_INTENT_V1 ||
    raw.version !== 1
  ) {
    throw new Error(
      "allocation_reservation_publication_intent_identity_invalid",
    );
  }

  const priorRecordCount = integerFieldV1(
    raw.prior_record_count,
    100_000,
    "allocation_reservation_publication_prior_record_count_invalid",
  );
  const nextRecordCount = integerFieldV1(
    raw.next_record_count,
    100_000,
    "allocation_reservation_publication_next_record_count_invalid",
  );
  if (nextRecordCount !== priorRecordCount + 1) {
    throw new Error(
      "allocation_reservation_publication_record_count_transition_invalid",
    );
  }
  const priorLedgerBytes = integerFieldV1(
    raw.prior_ledger_bytes,
    MAX_LEDGER_BYTES,
    "allocation_reservation_publication_prior_ledger_bytes_invalid",
  );
  const nextLedgerBytes = integerFieldV1(
    raw.next_ledger_bytes,
    MAX_LEDGER_BYTES,
    "allocation_reservation_publication_next_ledger_bytes_invalid",
  );
  const priorHighWaterBytes = integerFieldV1(
    raw.prior_high_water_bytes,
    MAX_HIGH_WATER_BYTES,
    "allocation_reservation_publication_prior_high_water_bytes_invalid",
  );
  const nextHighWaterBytes = integerFieldV1(
    raw.next_high_water_bytes,
    MAX_HIGH_WATER_BYTES,
    "allocation_reservation_publication_next_high_water_bytes_invalid",
  );

  const recordId = String(raw.record_id ?? "");
  const recordHash = String(raw.record_hash ?? "");
  const priorTip = String(raw.prior_tip_hash ?? "");
  const nextTip = String(raw.next_tip_hash ?? "");
  const priorLedgerSha = String(raw.prior_ledger_sha256 ?? "");
  const nextLedgerSha = String(raw.next_ledger_sha256 ?? "");
  const priorHighWaterSha = String(
    raw.prior_high_water_sha256 ?? "",
  );
  const nextHighWaterSha = String(
    raw.next_high_water_sha256 ?? "",
  );
  const appendSha = String(raw.append_sha256 ?? "");
  if (
    !RECORD_ID.test(recordId) ||
    !SHA256_ID.test(recordHash) ||
    !SHA256_ID.test(priorTip) ||
    !SHA256_ID.test(nextTip) ||
    !SHA256_ID.test(priorLedgerSha) ||
    !SHA256_ID.test(nextLedgerSha) ||
    !SHA256_ID.test(priorHighWaterSha) ||
    !SHA256_ID.test(nextHighWaterSha) ||
    !SHA256_ID.test(appendSha) ||
    nextTip === priorTip
  ) {
    throw new Error(
      "allocation_reservation_publication_intent_hash_invalid",
    );
  }

  const appendText = String(raw.append_bytes_base64 ?? "");
  const nextHighWaterText = String(
    raw.next_high_water_bytes_base64 ?? "",
  );
  const appendBytes = Buffer.from(appendText, "base64");
  const highWaterBytes = Buffer.from(
    nextHighWaterText,
    "base64",
  );
  if (
    appendBytes.length < 1 ||
    appendBytes.length > MAX_APPEND_BYTES ||
    appendBytes.toString("base64") !== appendText ||
    !appendBytes.toString("utf8").endsWith("\n") ||
    sha256Id(appendBytes) !== appendSha ||
    nextLedgerBytes !== priorLedgerBytes + appendBytes.length ||
    highWaterBytes.length < 2 ||
    highWaterBytes.length !== nextHighWaterBytes ||
    highWaterBytes.toString("base64") !== nextHighWaterText ||
    sha256Id(highWaterBytes) !== nextHighWaterSha
  ) {
    throw new Error(
      "allocation_reservation_publication_intent_payload_invalid",
    );
  }

  let appendRecord: unknown;
  try {
    appendRecord = JSON.parse(
      appendBytes.toString("utf8").slice(0, -1),
    );
  } catch {
    throw new Error(
      "allocation_reservation_publication_append_record_invalid",
    );
  }
  if (
    !appendRecord ||
    typeof appendRecord !== "object" ||
    Array.isArray(appendRecord)
  ) {
    throw new Error(
      "allocation_reservation_publication_append_record_invalid",
    );
  }
  const appendRow = appendRecord as Record<string, unknown>;
  if (
    String(appendRow.record_id || "") !== recordId ||
    String(appendRow.allocation_record_hash || "") !== recordHash ||
    String(appendRow.previous_record_hash || "") !== priorTip ||
    recordHash !== nextTip
  ) {
    throw new Error(
      "allocation_reservation_publication_append_record_binding_invalid",
    );
  }

  const body: PublicationIntentBodyV1 = {
    schema:
      VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_INTENT_SCHEMA_V1,
    marker:
      VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_INTENT_V1,
    version: 1,
    record_id: recordId,
    record_hash: recordHash,
    prior_record_count: priorRecordCount,
    prior_tip_hash: priorTip,
    prior_ledger_sha256: priorLedgerSha,
    prior_ledger_bytes: priorLedgerBytes,
    prior_high_water_sha256: priorHighWaterSha,
    prior_high_water_bytes: priorHighWaterBytes,
    next_record_count: nextRecordCount,
    next_tip_hash: nextTip,
    next_ledger_sha256: nextLedgerSha,
    next_ledger_bytes: nextLedgerBytes,
    next_high_water_sha256: nextHighWaterSha,
    next_high_water_bytes: nextHighWaterBytes,
    append_sha256: appendSha,
    append_bytes_base64: appendText,
    next_high_water_bytes_base64: nextHighWaterText,
  };
  if (canonicalIntentJsonV1(body) !== text) {
    throw new Error(
      "allocation_reservation_publication_intent_serialization_noncanonical",
    );
  }

  return {
    body: Object.freeze(body),
    append_bytes: appendBytes,
    next_high_water_bytes: highWaterBytes,
  };
}

export function buildBuyVoidAllocationReservationPublicationIntentV1(
  input: {
    current_ledger_jsonl: string | Buffer;
    current_high_water_json: string | Buffer;
    next_ledger_jsonl: string | Buffer;
  },
):
  | BuyVoidAllocationReservationPublicationHeldV1
  | BuyVoidAllocationReservationPublicationIntentBuiltV1 {
  try {
    const currentLedger = bytesV1(
      input?.current_ledger_jsonl,
      MAX_LEDGER_BYTES,
      "allocation_reservation_publication_current_ledger_too_large",
    );
    const currentHighWater = bytesV1(
      input?.current_high_water_json,
      MAX_HIGH_WATER_BYTES,
      "allocation_reservation_publication_current_high_water_too_large",
    );
    const nextLedger = bytesV1(
      input?.next_ledger_jsonl,
      MAX_LEDGER_BYTES,
      "allocation_reservation_publication_next_ledger_too_large",
    );

    const currentBinding =
      classifyBuyVoidAllocationReservationHighWaterBindingV1({
        ledger_jsonl: currentLedger,
        high_water_json: currentHighWater,
      });
    if (currentBinding.ok === false) {
      throw new Error(
        "allocation_reservation_publication_current_" +
          currentBinding.reason,
      );
    }

    const advance =
      planBuyVoidAllocationReservationHighWaterAdvanceV1({
        current_ledger_jsonl: currentLedger,
        current_high_water_json: currentHighWater,
        next_ledger_jsonl: nextLedger,
      });
    if (advance.ok === false) {
      throw new Error(
        "allocation_reservation_publication_advance_" +
          advance.reason,
      );
    }
    if (advance.status !== "planned" || advance.idempotent) {
      throw new Error(
        "allocation_reservation_publication_intent_not_required",
      );
    }

    const prior = ledgerFingerprintV1(currentLedger);
    const next = ledgerFingerprintV1(nextLedger);
    const appendBytes = nextLedger.subarray(currentLedger.length);
    if (
      appendBytes.length < 1 ||
      appendBytes.length > MAX_APPEND_BYTES ||
      next.record_count !== prior.record_count + 1 ||
      next.records.length < 1
    ) {
      throw new Error(
        "allocation_reservation_publication_append_invalid",
      );
    }
    const record = next.records[next.records.length - 1];
    if (
      record.allocation_record_hash !== next.tip_hash ||
      !RECORD_ID.test(record.record_id)
    ) {
      throw new Error(
        "allocation_reservation_publication_record_binding_invalid",
      );
    }

    const nextHighWater = Buffer.from(
      advance.next_high_water_json,
      "utf8",
    );
    if (
      nextHighWater.length < 2 ||
      nextHighWater.length > MAX_HIGH_WATER_BYTES
    ) {
      throw new Error(
        "allocation_reservation_publication_next_high_water_invalid",
      );
    }

    const body: PublicationIntentBodyV1 = {
      schema:
        VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_INTENT_SCHEMA_V1,
      marker:
        VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_INTENT_V1,
      version: 1,
      record_id: record.record_id,
      record_hash: record.allocation_record_hash,
      prior_record_count: prior.record_count,
      prior_tip_hash: prior.tip_hash,
      prior_ledger_sha256: prior.ledger_sha256,
      prior_ledger_bytes: prior.ledger_bytes,
      prior_high_water_sha256: sha256Id(currentHighWater),
      prior_high_water_bytes: currentHighWater.length,
      next_record_count: next.record_count,
      next_tip_hash: next.tip_hash,
      next_ledger_sha256: next.ledger_sha256,
      next_ledger_bytes: next.ledger_bytes,
      next_high_water_sha256: sha256Id(nextHighWater),
      next_high_water_bytes: nextHighWater.length,
      append_sha256: sha256Id(appendBytes),
      append_bytes_base64: appendBytes.toString("base64"),
      next_high_water_bytes_base64:
        nextHighWater.toString("base64"),
    };
    const intentBytes = Buffer.from(
      canonicalIntentJsonV1(body),
      "utf8",
    );
    if (intentBytes.length > MAX_INTENT_BYTES) {
      throw new Error(
        "allocation_reservation_publication_intent_too_large",
      );
    }

    parseIntentV1(intentBytes);
    return Object.freeze({
      ok: true,
      status: "intent_built",
      marker:
        VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_PROTOCOL_V1,
      version: 1,
      operation_performed: false,
      intent_json: intentBytes.toString("utf8"),
      intent_sha256: sha256Id(intentBytes),
      record_id: body.record_id,
      record_hash: body.record_hash,
      authority:
        VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "allocation_reservation_publication_intent_build_failed",
    );
  }
}

function fingerprintMatchesV1(
  fingerprint: {
    record_count: number;
    tip_hash: string;
    ledger_sha256: string;
    ledger_bytes: number;
  },
  body: PublicationIntentBodyV1,
  which: "prior" | "next",
): boolean {
  const expected =
    which === "prior"
      ? {
          record_count: body.prior_record_count,
          tip_hash: body.prior_tip_hash,
          ledger_sha256: body.prior_ledger_sha256,
          ledger_bytes: body.prior_ledger_bytes,
        }
      : {
          record_count: body.next_record_count,
          tip_hash: body.next_tip_hash,
          ledger_sha256: body.next_ledger_sha256,
          ledger_bytes: body.next_ledger_bytes,
        };
  return (
    fingerprint.record_count === expected.record_count &&
    fingerprint.tip_hash === expected.tip_hash &&
    fingerprint.ledger_sha256 === expected.ledger_sha256 &&
    fingerprint.ledger_bytes === expected.ledger_bytes
  );
}

export function classifyBuyVoidAllocationReservationPublicationRecoveryV1(
  input: {
    intent_bytes: string | Buffer;
    observed_ledger_jsonl: string | Buffer;
    observed_high_water_json: string | Buffer;
  },
):
  | BuyVoidAllocationReservationPublicationHeldV1
  | BuyVoidAllocationReservationPublicationRecoveryV1 {
  try {
    const parsed = parseIntentV1(input?.intent_bytes);
    const body = parsed.body;
    const observedLedger = bytesV1(
      input?.observed_ledger_jsonl,
      MAX_LEDGER_BYTES,
      "allocation_reservation_publication_observed_ledger_too_large",
    );
    const observedHighWater = bytesV1(
      input?.observed_high_water_json,
      MAX_HIGH_WATER_BYTES,
      "allocation_reservation_publication_observed_high_water_too_large",
    );
    const observed = ledgerFingerprintV1(observedLedger);

    const ledgerIsPrior = fingerprintMatchesV1(
      observed,
      body,
      "prior",
    );
    const ledgerIsNext = fingerprintMatchesV1(
      observed,
      body,
      "next",
    );
    if (!ledgerIsPrior && !ledgerIsNext) {
      throw new Error(
        "allocation_reservation_publication_observed_ledger_unknown",
      );
    }

    const observedHighWaterSha = sha256Id(observedHighWater);
    const highWaterIsPrior =
      observedHighWater.length === body.prior_high_water_bytes &&
      observedHighWaterSha === body.prior_high_water_sha256;
    const highWaterIsNext =
      observedHighWater.length === body.next_high_water_bytes &&
      observedHighWaterSha === body.next_high_water_sha256;
    if (!highWaterIsPrior && !highWaterIsNext) {
      throw new Error(
        "allocation_reservation_publication_observed_high_water_unknown",
      );
    }

    if (ledgerIsPrior) {
      if (highWaterIsNext) {
        throw new Error(
          "allocation_reservation_publication_high_water_ahead",
        );
      }
      const priorBinding =
        classifyBuyVoidAllocationReservationHighWaterBindingV1({
          ledger_jsonl: observedLedger,
          high_water_json: observedHighWater,
        });
      if (priorBinding.ok === false) {
        throw new Error(
          "allocation_reservation_publication_prior_binding_" +
            priorBinding.reason,
        );
      }

      const reconstructedNext = Buffer.concat([
        observedLedger,
        parsed.append_bytes,
      ]);
      const reconstructed = ledgerFingerprintV1(
        reconstructedNext,
      );
      if (!fingerprintMatchesV1(reconstructed, body, "next")) {
        throw new Error(
          "allocation_reservation_publication_reconstructed_next_mismatch",
        );
      }
      const nextBinding =
        classifyBuyVoidAllocationReservationHighWaterBindingV1({
          ledger_jsonl: reconstructedNext,
          high_water_json: parsed.next_high_water_bytes,
        });
      if (nextBinding.ok === false) {
        throw new Error(
          "allocation_reservation_publication_next_binding_" +
            nextBinding.reason,
        );
      }

      return Object.freeze({
        ok: true,
        status: "recoverable",
        marker:
          VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_PROTOCOL_V1,
        version: 1,
        phase: "intent_only",
        operation_performed: false,
        record_id: body.record_id,
        record_hash: body.record_hash,
        write_ledger_append_required: true,
        write_high_water_required: true,
        remove_intent_after_postcheck: true,
        append_sha256: body.append_sha256,
        append_bytes_base64: body.append_bytes_base64,
        next_high_water_sha256: body.next_high_water_sha256,
        next_high_water_json:
          parsed.next_high_water_bytes.toString("utf8"),
        authority:
          VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_AUTHORITY_V1,
      });
    }

    const priorPrefix = observedLedger.subarray(
      0,
      body.prior_ledger_bytes,
    );
    const observedAppend = observedLedger.subarray(
      body.prior_ledger_bytes,
    );
    if (
      sha256Id(priorPrefix) !== body.prior_ledger_sha256 ||
      !observedAppend.equals(parsed.append_bytes)
    ) {
      throw new Error(
        "allocation_reservation_publication_next_prefix_mismatch",
      );
    }
    const priorFingerprint = ledgerFingerprintV1(priorPrefix);
    if (!fingerprintMatchesV1(priorFingerprint, body, "prior")) {
      throw new Error(
        "allocation_reservation_publication_prior_prefix_mismatch",
      );
    }

    if (highWaterIsPrior) {
      const priorBinding =
        classifyBuyVoidAllocationReservationHighWaterBindingV1({
          ledger_jsonl: priorPrefix,
          high_water_json: observedHighWater,
        });
      if (priorBinding.ok === false) {
        throw new Error(
          "allocation_reservation_publication_prior_binding_" +
            priorBinding.reason,
        );
      }
      return Object.freeze({
        ok: true,
        status: "recoverable",
        marker:
          VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_PROTOCOL_V1,
        version: 1,
        phase: "ledger_committed",
        operation_performed: false,
        record_id: body.record_id,
        record_hash: body.record_hash,
        write_ledger_append_required: false,
        write_high_water_required: true,
        remove_intent_after_postcheck: true,
        append_sha256: body.append_sha256,
        append_bytes_base64: body.append_bytes_base64,
        next_high_water_sha256: body.next_high_water_sha256,
        next_high_water_json:
          parsed.next_high_water_bytes.toString("utf8"),
        authority:
          VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_AUTHORITY_V1,
      });
    }

    const nextBinding =
      classifyBuyVoidAllocationReservationHighWaterBindingV1({
        ledger_jsonl: observedLedger,
        high_water_json: observedHighWater,
      });
    if (nextBinding.ok === false) {
      throw new Error(
        "allocation_reservation_publication_next_binding_" +
          nextBinding.reason,
      );
    }

    return Object.freeze({
      ok: true,
      status: "recoverable",
      marker:
        VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_PROTOCOL_V1,
      version: 1,
      phase: "complete",
      operation_performed: false,
      record_id: body.record_id,
      record_hash: body.record_hash,
      write_ledger_append_required: false,
      write_high_water_required: false,
      remove_intent_after_postcheck: true,
      append_sha256: body.append_sha256,
      append_bytes_base64: body.append_bytes_base64,
      next_high_water_sha256: body.next_high_water_sha256,
      next_high_water_json:
        parsed.next_high_water_bytes.toString("utf8"),
      authority:
        VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "allocation_reservation_publication_recovery_failed",
    );
  }
}

export function buyVoidAllocationReservationPublicationRetryMatchesV1(
  input: {
    intent_bytes: string | Buffer;
    record_id: unknown;
    record_hash: unknown;
  },
): boolean {
  try {
    const parsed = parseIntentV1(input?.intent_bytes);
    return (
      parsed.body.record_id === String(input?.record_id ?? "") &&
      parsed.body.record_hash === String(input?.record_hash ?? "")
    );
  } catch {
    return false;
  }
}
