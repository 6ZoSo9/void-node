import crypto from "node:crypto";

import {
  VOID_BUY_VOID_ALLOCATION_RESERVATION_GENESIS_HASH_V1,
  classifyBuyVoidAllocationReservationLedgerV1,
} from "./buy_void_allocation_reservation_ledger_v1.js";
import {
  VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1,
} from "./buy_void_crash_consistent_saga_server_policy_v1.js";

export const VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_V1 =
  "VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_V1";

export const VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_SCHEMA_V1 =
  "void_buy_void_allocation_reservation_high_water_v1";

export const VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    pure_high_water_binding: true,
    exact_record_count_binding: true,
    exact_tip_hash_binding: true,
    exact_ledger_sha256_binding: true,
    exact_ledger_byte_length_binding: true,
    exact_inventory_state_binding: true,
    monotonic_single_append_validation: true,
    rollback_detection_with_authoritative_high_water: true,
    protected_high_water_storage: false,
    crash_recoverable_publication: false,
    runtime_integration: false,
    filesystem_read: false,
    filesystem_write: false,
    allocation_reservation_write: false,
    high_water_write: false,
    payment_verified_event_write: false,
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
const MAX_LEDGER_BYTES = 64 * 1024 * 1024;
const MAX_LEDGER_RECORDS = 100_000;

const HIGH_WATER_KEYS = Object.freeze([
  "ledger_bytes",
  "ledger_sha256",
  "marker",
  "pool_void_total",
  "record_count",
  "remaining_void",
  "reserved_void_total",
  "schema",
  "tip_hash",
  "version",
]);

export type BuyVoidAllocationReservationHighWaterV1 = {
  schema: typeof VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_SCHEMA_V1;
  marker: typeof VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_V1;
  version: 1;
  record_count: number;
  tip_hash: string;
  ledger_sha256: string;
  ledger_bytes: number;
  pool_void_total: string;
  reserved_void_total: string;
  remaining_void: string;
};

export type BuyVoidAllocationReservationHighWaterHeldV1 = {
  ok: false;
  status: "held";
  marker: typeof VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_V1;
  version: 1;
  reason: string;
  authority:
    typeof VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_AUTHORITY_V1;
};

export type BuyVoidAllocationReservationHighWaterDerivedV1 = {
  ok: true;
  status: "derived";
  marker: typeof VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_V1;
  version: 1;
  operation_performed: false;
  high_water: Readonly<BuyVoidAllocationReservationHighWaterV1>;
  high_water_json: string;
  authority:
    typeof VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_AUTHORITY_V1;
};

export type BuyVoidAllocationReservationHighWaterBindingV1 = {
  ok: true;
  status: "bound";
  marker: typeof VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_V1;
  version: 1;
  rollback_safe_for_presented_authoritative_high_water: true;
  operation_performed: false;
  high_water: Readonly<BuyVoidAllocationReservationHighWaterV1>;
  high_water_json: string;
  authority:
    typeof VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_AUTHORITY_V1;
};

export type BuyVoidAllocationReservationHighWaterAdvanceV1 =
  | BuyVoidAllocationReservationHighWaterHeldV1
  | {
      ok: true;
      status: "planned" | "idempotent";
      marker: typeof VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_V1;
      version: 1;
      idempotent: boolean;
      operation_performed: false;
      current_high_water:
        Readonly<BuyVoidAllocationReservationHighWaterV1>;
      next_high_water:
        Readonly<BuyVoidAllocationReservationHighWaterV1>;
      next_high_water_json: string;
      authority:
        typeof VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_AUTHORITY_V1;
    };

function held(
  reason: string,
): BuyVoidAllocationReservationHighWaterHeldV1 {
  return Object.freeze({
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_V1,
    version: 1,
    reason,
    authority:
      VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_AUTHORITY_V1,
  });
}

function sha256Id(bytes: Buffer): string {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(bytes).digest("hex")
  );
}

function ledgerBytesV1(value: string | Buffer): Buffer {
  const bytes = Buffer.isBuffer(value)
    ? Buffer.from(value)
    : Buffer.from(String(value ?? ""), "utf8");
  if (bytes.length > MAX_LEDGER_BYTES) {
    throw new Error(
      "allocation_reservation_high_water_ledger_too_large",
    );
  }
  return bytes;
}

function canonicalHighWaterJsonV1(
  value: BuyVoidAllocationReservationHighWaterV1,
): string {
  return JSON.stringify({
    schema: value.schema,
    marker: value.marker,
    version: value.version,
    record_count: value.record_count,
    tip_hash: value.tip_hash,
    ledger_sha256: value.ledger_sha256,
    ledger_bytes: value.ledger_bytes,
    pool_void_total: value.pool_void_total,
    reserved_void_total: value.reserved_void_total,
    remaining_void: value.remaining_void,
  }) + "\n";
}

function deriveHighWaterV1(
  ledgerJsonl: string | Buffer,
): {
  high_water: Readonly<BuyVoidAllocationReservationHighWaterV1>;
  high_water_json: string;
} {
  const bytes = ledgerBytesV1(ledgerJsonl);
  const ledger =
    classifyBuyVoidAllocationReservationLedgerV1(bytes);
  if (ledger.ok === false) {
    throw new Error(
      "allocation_reservation_high_water_ledger_" +
        ledger.reason,
    );
  }

  const canonicalPool =
    VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1
      .canonical_presale_max_void;
  const pool =
    ledger.pool_void_total === null
      ? canonicalPool
      : ledger.pool_void_total;
  const remaining =
    ledger.remaining_void === null
      ? canonicalPool
      : ledger.remaining_void;

  if (
    ledger.record_count < 0 ||
    ledger.record_count > MAX_LEDGER_RECORDS ||
    !Number.isSafeInteger(ledger.record_count)
  ) {
    throw new Error(
      "allocation_reservation_high_water_record_count_invalid",
    );
  }
  if (
    !SHA256_ID.test(ledger.tip_hash) ||
    (
      ledger.record_count === 0 &&
      ledger.tip_hash !==
        VOID_BUY_VOID_ALLOCATION_RESERVATION_GENESIS_HASH_V1
    )
  ) {
    throw new Error(
      "allocation_reservation_high_water_tip_invalid",
    );
  }
  if (pool !== canonicalPool) {
    throw new Error(
      "allocation_reservation_high_water_pool_mismatch",
    );
  }

  const highWater =
    Object.freeze<BuyVoidAllocationReservationHighWaterV1>({
      schema:
        VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_SCHEMA_V1,
      marker:
        VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_V1,
      version: 1,
      record_count: ledger.record_count,
      tip_hash: ledger.tip_hash,
      ledger_sha256: sha256Id(bytes),
      ledger_bytes: bytes.length,
      pool_void_total: pool,
      reserved_void_total: ledger.reserved_void_total,
      remaining_void: remaining,
    });

  return {
    high_water: highWater,
    high_water_json: canonicalHighWaterJsonV1(highWater),
  };
}

function parseHighWaterV1(
  highWaterJson: string | Buffer,
): Readonly<BuyVoidAllocationReservationHighWaterV1> {
  const bytes = Buffer.isBuffer(highWaterJson)
    ? Buffer.from(highWaterJson)
    : Buffer.from(String(highWaterJson ?? ""), "utf8");
  if (bytes.length < 2 || bytes.length > 4096) {
    throw new Error(
      "allocation_reservation_high_water_bytes_invalid",
    );
  }
  const text = bytes.toString("utf8");
  if (!text.endsWith("\n")) {
    throw new Error(
      "allocation_reservation_high_water_missing_final_newline",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(0, -1));
  } catch {
    throw new Error(
      "allocation_reservation_high_water_json_invalid",
    );
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    throw new Error(
      "allocation_reservation_high_water_shape_invalid",
    );
  }
  const raw = parsed as Record<string, unknown>;
  if (
    Object.keys(raw).sort().join("\n") !==
    [...HIGH_WATER_KEYS].sort().join("\n")
  ) {
    throw new Error(
      "allocation_reservation_high_water_shape_invalid",
    );
  }
  if (
    raw.schema !==
      VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_SCHEMA_V1 ||
    raw.marker !==
      VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_V1 ||
    raw.version !== 1
  ) {
    throw new Error(
      "allocation_reservation_high_water_identity_invalid",
    );
  }

  const recordCount = Number(raw.record_count);
  const ledgerBytes = Number(raw.ledger_bytes);
  if (
    !Number.isSafeInteger(recordCount) ||
    recordCount < 0 ||
    recordCount > MAX_LEDGER_RECORDS
  ) {
    throw new Error(
      "allocation_reservation_high_water_record_count_invalid",
    );
  }
  if (
    !Number.isSafeInteger(ledgerBytes) ||
    ledgerBytes < 0 ||
    ledgerBytes > MAX_LEDGER_BYTES
  ) {
    throw new Error(
      "allocation_reservation_high_water_ledger_bytes_invalid",
    );
  }

  const value: BuyVoidAllocationReservationHighWaterV1 = {
    schema:
      VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_SCHEMA_V1,
    marker:
      VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_V1,
    version: 1,
    record_count: recordCount,
    tip_hash: String(raw.tip_hash ?? ""),
    ledger_sha256: String(raw.ledger_sha256 ?? ""),
    ledger_bytes: ledgerBytes,
    pool_void_total: String(raw.pool_void_total ?? ""),
    reserved_void_total: String(
      raw.reserved_void_total ?? "",
    ),
    remaining_void: String(raw.remaining_void ?? ""),
  };
  if (
    !SHA256_ID.test(value.tip_hash) ||
    !SHA256_ID.test(value.ledger_sha256)
  ) {
    throw new Error(
      "allocation_reservation_high_water_hash_invalid",
    );
  }

  const canonical = canonicalHighWaterJsonV1(value);
  if (text !== canonical) {
    throw new Error(
      "allocation_reservation_high_water_serialization_noncanonical",
    );
  }
  return Object.freeze(value);
}

export function deriveBuyVoidAllocationReservationHighWaterV1(
  ledgerJsonl: string | Buffer,
):
  | BuyVoidAllocationReservationHighWaterHeldV1
  | BuyVoidAllocationReservationHighWaterDerivedV1 {
  try {
    const derived = deriveHighWaterV1(ledgerJsonl);
    return Object.freeze({
      ok: true,
      status: "derived",
      marker:
        VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_V1,
      version: 1,
      operation_performed: false,
      ...derived,
      authority:
        VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "allocation_reservation_high_water_derive_failed",
    );
  }
}

export function classifyBuyVoidAllocationReservationHighWaterBindingV1(
  input: {
    ledger_jsonl: string | Buffer;
    high_water_json: string | Buffer;
  },
):
  | BuyVoidAllocationReservationHighWaterHeldV1
  | BuyVoidAllocationReservationHighWaterBindingV1 {
  try {
    const observed = parseHighWaterV1(
      input?.high_water_json,
    );
    const expected = deriveHighWaterV1(input?.ledger_jsonl);
    if (
      canonicalHighWaterJsonV1(observed) !==
      expected.high_water_json
    ) {
      throw new Error(
        "allocation_reservation_high_water_binding_mismatch",
      );
    }
    return Object.freeze({
      ok: true,
      status: "bound",
      marker:
        VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_V1,
      version: 1,
      rollback_safe_for_presented_authoritative_high_water:
        true,
      operation_performed: false,
      high_water: observed,
      high_water_json: expected.high_water_json,
      authority:
        VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "allocation_reservation_high_water_binding_failed",
    );
  }
}

export function planBuyVoidAllocationReservationHighWaterAdvanceV1(
  input: {
    current_ledger_jsonl: string | Buffer;
    current_high_water_json: string | Buffer;
    next_ledger_jsonl: string | Buffer;
  },
): BuyVoidAllocationReservationHighWaterAdvanceV1 {
  try {
    const currentBinding =
      classifyBuyVoidAllocationReservationHighWaterBindingV1({
        ledger_jsonl: input?.current_ledger_jsonl,
        high_water_json: input?.current_high_water_json,
      });
    if (currentBinding.ok === false) {
      return currentBinding;
    }

    const currentBytes = ledgerBytesV1(
      input.current_ledger_jsonl,
    );
    const nextBytes = ledgerBytesV1(input.next_ledger_jsonl);
    const next = deriveHighWaterV1(nextBytes);

    if (nextBytes.equals(currentBytes)) {
      if (
        next.high_water_json !==
        currentBinding.high_water_json
      ) {
        throw new Error(
          "allocation_reservation_high_water_idempotent_mismatch",
        );
      }
      return Object.freeze({
        ok: true,
        status: "idempotent",
        marker:
          VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_V1,
        version: 1,
        idempotent: true,
        operation_performed: false,
        current_high_water: currentBinding.high_water,
        next_high_water: next.high_water,
        next_high_water_json: next.high_water_json,
        authority:
          VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_AUTHORITY_V1,
      });
    }

    if (
      nextBytes.length <= currentBytes.length ||
      !nextBytes
        .subarray(0, currentBytes.length)
        .equals(currentBytes)
    ) {
      throw new Error(
        "allocation_reservation_high_water_advance_not_exact_append",
      );
    }
    if (
      next.high_water.record_count !==
      currentBinding.high_water.record_count + 1
    ) {
      throw new Error(
        "allocation_reservation_high_water_advance_record_count_invalid",
      );
    }
    if (
      next.high_water.tip_hash ===
      currentBinding.high_water.tip_hash
    ) {
      throw new Error(
        "allocation_reservation_high_water_advance_tip_not_changed",
      );
    }

    return Object.freeze({
      ok: true,
      status: "planned",
      marker:
        VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_V1,
      version: 1,
      idempotent: false,
      operation_performed: false,
      current_high_water: currentBinding.high_water,
      next_high_water: next.high_water,
      next_high_water_json: next.high_water_json,
      authority:
        VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "allocation_reservation_high_water_advance_failed",
    );
  }
}
