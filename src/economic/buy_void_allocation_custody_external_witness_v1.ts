import crypto from "node:crypto";

import {
  VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_SCHEMA_V1,
  VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_V1,
  classifyBuyVoidAllocationReservationHighWaterBindingV1,
  deriveBuyVoidAllocationReservationHighWaterV1,
} from "./buy_void_allocation_reservation_high_water_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_RESERVATION_GENESIS_HASH_V1,
  classifyBuyVoidAllocationReservationLedgerV1,
} from "./buy_void_allocation_reservation_ledger_v1.js";
import {
  VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1,
} from "./buy_void_crash_consistent_saga_server_policy_v1.js";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_EXTERNAL_WITNESS_EVENT_V1 =
  "VOID_BUY_ALLOCATION_CUSTODY_HIGH_WATER_WITNESS_EVENT_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_EXTERNAL_WITNESS_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_EXTERNAL_WITNESS_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_EXTERNAL_WITNESS_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    pure_validation: true,
    exact_event_shape: true,
    canonical_event_hash: true,
    append_only_hash_chain: true,
    exact_single_record_advance: true,
    same_epoch_conflict_rejection: true,
    rollback_regression_detection: true,
    unanchored_local_advance_hold: true,
    source_host_invariant_binding: true,
    witness_host_invariant_binding: true,
    inventory_monotonicity: true,
    micro_void_inventory_arithmetic: true,
    canonical_local_ledger_high_water_binding: true,
    exact_witnessed_ledger_prefix_binding: true,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    live_remote_read_performed: false,
    filesystem_read: false,
    filesystem_write: false,
    network_access: false,
    runtime_integration: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    production_gate_ready: false,
    payment_acceptance: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    presale_activation: false,
    market_activation: false,
    funds_movement: false,
  });

const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const SHA1 = /^[0-9a-f]{40}$/u;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const SAFE_TEXT = /^[A-Za-z0-9._:@/-]{1,256}$/u;
const AMOUNT = /^(0|[1-9][0-9]*)(?:\.([0-9]{1,6}))?$/u;
const MICRO = 1_000_000n;
const MAX_WITNESS_BYTES = 16 * 1024 * 1024;
const MAX_WITNESS_EVENTS = 100_001;

const EVENT_KEYS = Object.freeze([
  "allocation_tip_sha256",
  "custody_uuid",
  "deployment_head",
  "event_sha256",
  "high_water_bytes",
  "high_water_sha256",
  "ledger_bytes",
  "ledger_sha256",
  "marker",
  "pool_void_total",
  "previous_event_sha256",
  "record_count",
  "remaining_void",
  "reserved_void_total",
  "sequence",
  "service_source_sha256",
  "source_custody_disk_wwn",
  "source_hostname",
  "source_ledger_disk_wwn",
  "source_machine_id_sha256",
  "version",
  "witness_hostname",
  "witness_machine_id_sha256",
  "witness_root_disk_serial",
  "witness_root_disk_wwn",
  "writer_source_blob_sha1",
] as const);

const BODY_KEYS = Object.freeze(
  EVENT_KEYS.filter((key) => key !== "event_sha256"),
);

const CURRENT_KEYS = Object.freeze([
  "allocation_tip_sha256",
  "custody_uuid",
  "deployment_head",
  "high_water_bytes",
  "high_water_sha256",
  "ledger_bytes",
  "ledger_sha256",
  "pool_void_total",
  "record_count",
  "remaining_void",
  "reserved_void_total",
  "service_source_sha256",
  "source_custody_disk_wwn",
  "source_hostname",
  "source_ledger_disk_wwn",
  "source_machine_id_sha256",
  "witness_hostname",
  "witness_machine_id_sha256",
  "witness_root_disk_serial",
  "witness_root_disk_wwn",
  "writer_source_blob_sha1",
] as const);

type EventKey = (typeof EVENT_KEYS)[number];
type CurrentKey = (typeof CURRENT_KEYS)[number];

export type BuyVoidAllocationCustodyExternalWitnessEventV1 = Readonly<{
  allocation_tip_sha256: string;
  custody_uuid: string;
  deployment_head: string;
  event_sha256: string;
  high_water_bytes: number;
  high_water_sha256: string;
  ledger_bytes: number;
  ledger_sha256: string;
  marker:
    typeof VOID_BUY_VOID_ALLOCATION_CUSTODY_EXTERNAL_WITNESS_EVENT_V1;
  pool_void_total: string;
  previous_event_sha256: string | null;
  record_count: number;
  remaining_void: string;
  reserved_void_total: string;
  sequence: number;
  service_source_sha256: string;
  source_custody_disk_wwn: string;
  source_hostname: string;
  source_ledger_disk_wwn: string;
  source_machine_id_sha256: string;
  version: 1;
  witness_hostname: string;
  witness_machine_id_sha256: string;
  witness_root_disk_serial: string;
  witness_root_disk_wwn: string;
  writer_source_blob_sha1: string;
}>;

export type BuyVoidAllocationCustodyExternalWitnessCurrentV1 = Readonly<{
  allocation_tip_sha256: string;
  custody_uuid: string;
  deployment_head: string;
  high_water_bytes: number;
  high_water_sha256: string;
  ledger_bytes: number;
  ledger_sha256: string;
  pool_void_total: string;
  record_count: number;
  remaining_void: string;
  reserved_void_total: string;
  service_source_sha256: string;
  source_custody_disk_wwn: string;
  source_hostname: string;
  source_ledger_disk_wwn: string;
  source_machine_id_sha256: string;
  witness_hostname: string;
  witness_machine_id_sha256: string;
  witness_root_disk_serial: string;
  witness_root_disk_wwn: string;
  writer_source_blob_sha1: string;
}>;

function fail(reason: string): never {
  throw new Error(reason);
}

function held(reason: string) {
  return Object.freeze({
    ok: false as const,
    status: "held" as const,
    marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_EXTERNAL_WITNESS_V1,
    version: 1 as const,
    reason,
    event_count: null,
    witness_tip_sha256: null,
    witness_record_count: null,
    local_record_count: null,
    rollback_regression_detected: false,
    exact_live_match: false,
    operation_performed: false,
    authority:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_EXTERNAL_WITNESS_AUTHORITY_V1,
  });
}

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (
    typeof value === "number" &&
    Number.isSafeInteger(value)
  ) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(record)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key) + ":" + canonicalJson(record[key]),
        )
        .join(",") +
      "}"
    );
  }
  fail("allocation_custody_witness_noncanonical_value");
}

function sha256Id(value: Buffer | string): string {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(value).digest("hex")
  );
}

function exactObject(
  value: unknown,
  keys: readonly string[],
  reason: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(reason);
  }
  const record = value as Record<string, unknown>;
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(reason);
  }
  return record;
}

function safeText(value: unknown, regex: RegExp, reason: string): string {
  const text = String(value ?? "");
  if (!regex.test(text)) fail(reason);
  return text;
}

function safeInt(
  value: unknown,
  minimum: number,
  maximum: number,
  reason: string,
): number {
  const parsed = Number(value);
  if (
    !Number.isSafeInteger(parsed) ||
    parsed < minimum ||
    parsed > maximum
  ) {
    fail(reason);
  }
  return parsed;
}

function amountMicro(value: unknown, reason: string): bigint {
  const text = String(value ?? "");
  if (text.length < 1 || text.length > 32) fail(reason);
  const match = AMOUNT.exec(text);
  if (!match) fail(reason);
  const fractionRaw = match[2] || "";
  const micro =
    BigInt(match[1]) * MICRO +
    BigInt(fractionRaw.padEnd(6, "0") || "0");
  const whole = micro / MICRO;
  const fraction = (micro % MICRO)
    .toString()
    .padStart(6, "0")
    .replace(/0+$/u, "");
  const canonical =
    fraction.length > 0
      ? whole.toString() + "." + fraction
      : whole.toString();
  if (canonical !== text) fail(reason);
  return micro;
}

function decimal(value: unknown, reason: string): string {
  const text = String(value ?? "");
  amountMicro(text, reason);
  return text;
}

function parseEvent(
  rawValue: unknown,
): Readonly<BuyVoidAllocationCustodyExternalWitnessEventV1> {
  const raw = exactObject(
    rawValue,
    EVENT_KEYS,
    "allocation_custody_witness_event_shape_invalid",
  );
  if (
    raw.marker !==
      VOID_BUY_VOID_ALLOCATION_CUSTODY_EXTERNAL_WITNESS_EVENT_V1 ||
    raw.version !== 1
  ) {
    fail("allocation_custody_witness_event_identity_invalid");
  }

  const event: BuyVoidAllocationCustodyExternalWitnessEventV1 = {
    allocation_tip_sha256: safeText(
      raw.allocation_tip_sha256,
      SHA256_ID,
      "allocation_custody_witness_event_hash_invalid",
    ),
    custody_uuid: safeText(
      raw.custody_uuid,
      UUID,
      "allocation_custody_witness_event_uuid_invalid",
    ),
    deployment_head: safeText(
      raw.deployment_head,
      SHA1,
      "allocation_custody_witness_event_source_invalid",
    ),
    event_sha256: safeText(
      raw.event_sha256,
      SHA256_ID,
      "allocation_custody_witness_event_hash_invalid",
    ),
    high_water_bytes: safeInt(
      raw.high_water_bytes,
      1,
      4096,
      "allocation_custody_witness_event_size_invalid",
    ),
    high_water_sha256: safeText(
      raw.high_water_sha256,
      SHA256_ID,
      "allocation_custody_witness_event_hash_invalid",
    ),
    ledger_bytes: safeInt(
      raw.ledger_bytes,
      0,
      64 * 1024 * 1024,
      "allocation_custody_witness_event_size_invalid",
    ),
    ledger_sha256: safeText(
      raw.ledger_sha256,
      SHA256_ID,
      "allocation_custody_witness_event_hash_invalid",
    ),
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_EXTERNAL_WITNESS_EVENT_V1,
    pool_void_total: decimal(
      raw.pool_void_total,
      "allocation_custody_witness_event_inventory_invalid",
    ),
    previous_event_sha256:
      raw.previous_event_sha256 === null
        ? null
        : safeText(
            raw.previous_event_sha256,
            SHA256_ID,
            "allocation_custody_witness_event_hash_invalid",
          ),
    record_count: safeInt(
      raw.record_count,
      0,
      100_000,
      "allocation_custody_witness_event_record_count_invalid",
    ),
    remaining_void: decimal(
      raw.remaining_void,
      "allocation_custody_witness_event_inventory_invalid",
    ),
    reserved_void_total: decimal(
      raw.reserved_void_total,
      "allocation_custody_witness_event_inventory_invalid",
    ),
    sequence: safeInt(
      raw.sequence,
      1,
      MAX_WITNESS_EVENTS,
      "allocation_custody_witness_event_sequence_invalid",
    ),
    service_source_sha256: safeText(
      raw.service_source_sha256,
      SHA256_ID,
      "allocation_custody_witness_event_source_invalid",
    ),
    source_custody_disk_wwn: safeText(
      raw.source_custody_disk_wwn,
      SAFE_TEXT,
      "allocation_custody_witness_event_host_invalid",
    ),
    source_hostname: safeText(
      raw.source_hostname,
      SAFE_TEXT,
      "allocation_custody_witness_event_host_invalid",
    ),
    source_ledger_disk_wwn: safeText(
      raw.source_ledger_disk_wwn,
      SAFE_TEXT,
      "allocation_custody_witness_event_host_invalid",
    ),
    source_machine_id_sha256: safeText(
      raw.source_machine_id_sha256,
      SHA256_ID,
      "allocation_custody_witness_event_host_invalid",
    ),
    version: 1,
    witness_hostname: safeText(
      raw.witness_hostname,
      SAFE_TEXT,
      "allocation_custody_witness_event_host_invalid",
    ),
    witness_machine_id_sha256: safeText(
      raw.witness_machine_id_sha256,
      SHA256_ID,
      "allocation_custody_witness_event_host_invalid",
    ),
    witness_root_disk_serial: safeText(
      raw.witness_root_disk_serial,
      SAFE_TEXT,
      "allocation_custody_witness_event_host_invalid",
    ),
    witness_root_disk_wwn: safeText(
      raw.witness_root_disk_wwn,
      SAFE_TEXT,
      "allocation_custody_witness_event_host_invalid",
    ),
    writer_source_blob_sha1: safeText(
      raw.writer_source_blob_sha1,
      SHA1,
      "allocation_custody_witness_event_source_invalid",
    ),
  };

  const body = Object.fromEntries(
    BODY_KEYS.map((key) => [key, event[key as EventKey]]),
  );
  if (event.event_sha256 !== sha256Id(canonicalJson(body))) {
    fail("allocation_custody_witness_event_hash_mismatch");
  }

  const pool = amountMicro(
    event.pool_void_total,
    "allocation_custody_witness_event_inventory_invalid",
  );
  const reserved = amountMicro(
    event.reserved_void_total,
    "allocation_custody_witness_event_inventory_invalid",
  );
  const remaining = amountMicro(
    event.remaining_void,
    "allocation_custody_witness_event_inventory_invalid",
  );
  if (
    pool <= 0n ||
    reserved < 0n ||
    remaining < 0n ||
    reserved + remaining !== pool
  ) {
    fail("allocation_custody_witness_event_inventory_invalid");
  }

  if (
    event.source_machine_id_sha256 ===
      event.witness_machine_id_sha256 ||
    event.source_ledger_disk_wwn ===
      event.source_custody_disk_wwn
  ) {
    fail("allocation_custody_witness_event_separation_invalid");
  }

  return Object.freeze(event);
}

function invariantTuple(
  event: BuyVoidAllocationCustodyExternalWitnessEventV1,
): readonly unknown[] {
  return Object.freeze([
    event.source_hostname,
    event.source_machine_id_sha256,
    event.source_ledger_disk_wwn,
    event.source_custody_disk_wwn,
    event.custody_uuid,
    event.deployment_head,
    event.writer_source_blob_sha1,
    event.service_source_sha256,
    event.witness_hostname,
    event.witness_machine_id_sha256,
    event.witness_root_disk_serial,
    event.witness_root_disk_wwn,
    event.pool_void_total,
  ]);
}

function sameTuple(
  left: readonly unknown[],
  right: readonly unknown[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

export function parseBuyVoidAllocationCustodyExternalWitnessJournalV1(
  input: string | Buffer,
): Readonly<{
  event_count: number;
  tip: Readonly<BuyVoidAllocationCustodyExternalWitnessEventV1>;
  events: readonly Readonly<BuyVoidAllocationCustodyExternalWitnessEventV1>[];
  witness_sha256: string;
}> {
  const bytes = Buffer.isBuffer(input)
    ? Buffer.from(input)
    : Buffer.from(String(input ?? ""), "utf8");
  if (
    bytes.length < 2 ||
    bytes.length > MAX_WITNESS_BYTES ||
    bytes.at(-1) !== 0x0a
  ) {
    fail("allocation_custody_witness_bytes_invalid");
  }

  const lines = bytes
    .subarray(0, bytes.length - 1)
    .toString("utf8")
    .split("\n");
  if (
    lines.length < 1 ||
    lines.length > MAX_WITNESS_EVENTS ||
    lines.some((line) => line.length === 0)
  ) {
    fail("allocation_custody_witness_lines_invalid");
  }

  const events: BuyVoidAllocationCustodyExternalWitnessEventV1[] = [];
  let invariant: readonly unknown[] | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(lines[index]);
    } catch {
      fail("allocation_custody_witness_json_invalid");
    }

    const event = parseEvent(parsed);
    if (lines[index] !== canonicalJson(event)) {
      fail("allocation_custody_witness_line_noncanonical");
    }
    const previous = events.at(-1) ?? null;

    if (
      event.sequence !== index + 1 ||
      event.previous_event_sha256 !==
        (previous ? previous.event_sha256 : null)
    ) {
      fail("allocation_custody_witness_chain_invalid");
    }

    const tuple = invariantTuple(event);
    if (invariant === null) {
      invariant = tuple;
    } else if (!sameTuple(tuple, invariant)) {
      fail("allocation_custody_witness_invariant_drift");
    }

    if (previous === null) {
      if (
        event.sequence !== 1 ||
        event.record_count !== 0 ||
        event.ledger_bytes !== 0 ||
        event.previous_event_sha256 !== null ||
        event.reserved_void_total !== "0" ||
        event.remaining_void !== event.pool_void_total ||
        event.allocation_tip_sha256 !==
          "sha256:" + "0".repeat(64) ||
        event.ledger_sha256 !==
          "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
      ) {
        fail("allocation_custody_witness_genesis_invalid");
      }
      const genesisHighWater =
        deriveBuyVoidAllocationReservationHighWaterV1("");
      if (genesisHighWater.ok === false) {
        fail("allocation_custody_witness_genesis_high_water_invalid");
      }
      const genesisHighWaterBytes = Buffer.from(
        genesisHighWater.high_water_json,
        "utf8",
      );
      if (
        event.high_water_bytes !== genesisHighWaterBytes.length ||
        event.high_water_sha256 !== sha256Id(genesisHighWaterBytes) ||
        event.record_count !== genesisHighWater.high_water.record_count ||
        event.allocation_tip_sha256 !==
          genesisHighWater.high_water.tip_hash ||
        event.pool_void_total !==
          genesisHighWater.high_water.pool_void_total ||
        event.reserved_void_total !==
          genesisHighWater.high_water.reserved_void_total ||
        event.remaining_void !==
          genesisHighWater.high_water.remaining_void
      ) {
        fail("allocation_custody_witness_genesis_high_water_invalid");
      }
    } else {
      if (
        event.record_count !== previous.record_count + 1 ||
        event.ledger_bytes <= previous.ledger_bytes ||
        event.allocation_tip_sha256 ===
          previous.allocation_tip_sha256 ||
        amountMicro(
    event.reserved_void_total,
    "allocation_custody_witness_event_inventory_invalid",
  ) <=
          amountMicro(
          previous.reserved_void_total,
          "allocation_custody_witness_event_inventory_invalid",
        ) ||
        amountMicro(
    event.remaining_void,
    "allocation_custody_witness_event_inventory_invalid",
  ) >=
          amountMicro(
          previous.remaining_void,
          "allocation_custody_witness_event_inventory_invalid",
        )
      ) {
        fail("allocation_custody_witness_advance_invalid");
      }
    }

    events.push(event);
  }

  const tip = events.at(-1);
  if (!tip) fail("allocation_custody_witness_empty");

  return Object.freeze({
    event_count: events.length,
    tip,
    events: Object.freeze(events),
    witness_sha256: sha256Id(bytes),
  });
}

function parseCurrent(
  value: unknown,
): Readonly<BuyVoidAllocationCustodyExternalWitnessCurrentV1> {
  const raw = exactObject(
    value,
    CURRENT_KEYS,
    "allocation_custody_witness_current_shape_invalid",
  );

  const current: BuyVoidAllocationCustodyExternalWitnessCurrentV1 = {
    allocation_tip_sha256: safeText(
      raw.allocation_tip_sha256,
      SHA256_ID,
      "allocation_custody_witness_current_invalid",
    ),
    custody_uuid: safeText(
      raw.custody_uuid,
      UUID,
      "allocation_custody_witness_current_invalid",
    ),
    deployment_head: safeText(
      raw.deployment_head,
      SHA1,
      "allocation_custody_witness_current_invalid",
    ),
    high_water_bytes: safeInt(
      raw.high_water_bytes,
      1,
      4096,
      "allocation_custody_witness_current_invalid",
    ),
    high_water_sha256: safeText(
      raw.high_water_sha256,
      SHA256_ID,
      "allocation_custody_witness_current_invalid",
    ),
    ledger_bytes: safeInt(
      raw.ledger_bytes,
      0,
      64 * 1024 * 1024,
      "allocation_custody_witness_current_invalid",
    ),
    ledger_sha256: safeText(
      raw.ledger_sha256,
      SHA256_ID,
      "allocation_custody_witness_current_invalid",
    ),
    pool_void_total: decimal(
      raw.pool_void_total,
      "allocation_custody_witness_current_invalid",
    ),
    record_count: safeInt(
      raw.record_count,
      0,
      100_000,
      "allocation_custody_witness_current_invalid",
    ),
    remaining_void: decimal(
      raw.remaining_void,
      "allocation_custody_witness_current_invalid",
    ),
    reserved_void_total: decimal(
      raw.reserved_void_total,
      "allocation_custody_witness_current_invalid",
    ),
    service_source_sha256: safeText(
      raw.service_source_sha256,
      SHA256_ID,
      "allocation_custody_witness_current_invalid",
    ),
    source_custody_disk_wwn: safeText(
      raw.source_custody_disk_wwn,
      SAFE_TEXT,
      "allocation_custody_witness_current_invalid",
    ),
    source_hostname: safeText(
      raw.source_hostname,
      SAFE_TEXT,
      "allocation_custody_witness_current_invalid",
    ),
    source_ledger_disk_wwn: safeText(
      raw.source_ledger_disk_wwn,
      SAFE_TEXT,
      "allocation_custody_witness_current_invalid",
    ),
    source_machine_id_sha256: safeText(
      raw.source_machine_id_sha256,
      SHA256_ID,
      "allocation_custody_witness_current_invalid",
    ),
    witness_hostname: safeText(
      raw.witness_hostname,
      SAFE_TEXT,
      "allocation_custody_witness_current_invalid",
    ),
    witness_machine_id_sha256: safeText(
      raw.witness_machine_id_sha256,
      SHA256_ID,
      "allocation_custody_witness_current_invalid",
    ),
    witness_root_disk_serial: safeText(
      raw.witness_root_disk_serial,
      SAFE_TEXT,
      "allocation_custody_witness_current_invalid",
    ),
    witness_root_disk_wwn: safeText(
      raw.witness_root_disk_wwn,
      SAFE_TEXT,
      "allocation_custody_witness_current_invalid",
    ),
    writer_source_blob_sha1: safeText(
      raw.writer_source_blob_sha1,
      SHA1,
      "allocation_custody_witness_current_invalid",
    ),
  };

  const pool = amountMicro(
    current.pool_void_total,
    "allocation_custody_witness_current_invalid",
  );
  const reserved = amountMicro(
    current.reserved_void_total,
    "allocation_custody_witness_current_invalid",
  );
  const remaining = amountMicro(
    current.remaining_void,
    "allocation_custody_witness_current_invalid",
  );
  if (
    pool <= 0n ||
    reserved < 0n ||
    remaining < 0n ||
    reserved + remaining !== pool ||
    current.source_machine_id_sha256 ===
      current.witness_machine_id_sha256 ||
    current.source_ledger_disk_wwn ===
      current.source_custody_disk_wwn
  ) {
    fail("allocation_custody_witness_current_invalid");
  }

  return Object.freeze(current);
}

function bindCanonicalCurrentState(
  current: BuyVoidAllocationCustodyExternalWitnessCurrentV1,
  ledgerInput: string | Buffer,
  highWaterInput: string | Buffer,
): Readonly<{
  ledger_bytes: Buffer;
  high_water_bytes: Buffer;
}> {
  const ledgerBytes = Buffer.isBuffer(ledgerInput)
    ? Buffer.from(ledgerInput)
    : Buffer.from(String(ledgerInput ?? ""), "utf8");
  const highWaterBytes = Buffer.isBuffer(highWaterInput)
    ? Buffer.from(highWaterInput)
    : Buffer.from(String(highWaterInput ?? ""), "utf8");
  if (ledgerBytes.length > 64 * 1024 * 1024) {
    fail("allocation_custody_witness_current_ledger_too_large");
  }
  if (
    highWaterBytes.length < 2 ||
    highWaterBytes.length > 4096
  ) {
    fail("allocation_custody_witness_current_high_water_invalid");
  }

  const binding =
    classifyBuyVoidAllocationReservationHighWaterBindingV1({
      ledger_jsonl: ledgerBytes,
      high_water_json: highWaterBytes,
    });
  if (binding.ok === false) {
    fail(
      "allocation_custody_witness_current_authority_" +
        binding.reason,
    );
  }

  const canonical = binding.high_water;
  if (
    current.record_count !== canonical.record_count ||
    current.allocation_tip_sha256 !== canonical.tip_hash ||
    current.ledger_bytes !== ledgerBytes.length ||
    current.ledger_sha256 !== sha256Id(ledgerBytes) ||
    current.high_water_bytes !== highWaterBytes.length ||
    current.high_water_sha256 !== sha256Id(highWaterBytes) ||
    current.pool_void_total !== canonical.pool_void_total ||
    current.reserved_void_total !== canonical.reserved_void_total ||
    current.remaining_void !== canonical.remaining_void
  ) {
    fail("allocation_custody_witness_current_authority_mismatch");
  }

  return Object.freeze({
    ledger_bytes: ledgerBytes,
    high_water_bytes: highWaterBytes,
  });
}

function witnessedPrefixMatches(
  tip: BuyVoidAllocationCustodyExternalWitnessEventV1,
  currentLedgerBytes: Buffer,
): boolean {
  if (
    tip.ledger_bytes < 0 ||
    tip.ledger_bytes > currentLedgerBytes.length
  ) {
    return false;
  }
  const prefix = currentLedgerBytes.subarray(0, tip.ledger_bytes);
  return (
    prefix.length === tip.ledger_bytes &&
    sha256Id(prefix) === tip.ledger_sha256
  );
}

function witnessedCanonicalPrefixMatches(
  tip: BuyVoidAllocationCustodyExternalWitnessEventV1,
  currentLedgerBytes: Buffer,
): boolean {
  if (!witnessedPrefixMatches(tip, currentLedgerBytes)) {
    return false;
  }
  const prefix = currentLedgerBytes.subarray(0, tip.ledger_bytes);
  const highWater =
    deriveBuyVoidAllocationReservationHighWaterV1(prefix);
  if (highWater.ok === false) {
    return false;
  }
  const highWaterBytes = Buffer.from(
    highWater.high_water_json,
    "utf8",
  );
  return (
    tip.record_count === highWater.high_water.record_count &&
    tip.allocation_tip_sha256 === highWater.high_water.tip_hash &&
    tip.high_water_bytes === highWaterBytes.length &&
    tip.high_water_sha256 === sha256Id(highWaterBytes) &&
    tip.pool_void_total === highWater.high_water.pool_void_total &&
    tip.reserved_void_total ===
      highWater.high_water.reserved_void_total &&
    tip.remaining_void === highWater.high_water.remaining_void
  );
}

function witnessHistoryMatchesCanonicalCurrentLedger(
  events: readonly Readonly<BuyVoidAllocationCustodyExternalWitnessEventV1>[],
  currentLedgerBytes: Buffer,
): boolean {
  const ledger =
    classifyBuyVoidAllocationReservationLedgerV1(currentLedgerBytes);
  if (ledger.ok === false || events.length < 1) {
    return false;
  }
  const tip = events.at(-1);
  if (!tip || ledger.record_count < tip.record_count) {
    return false;
  }

  const pool: string =
    VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1
      .canonical_presale_max_void;
  const rolling = crypto.createHash("sha256");
  let prefixBytes = 0;

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    let tipHash =
      VOID_BUY_VOID_ALLOCATION_RESERVATION_GENESIS_HASH_V1;
    let reserved = "0";
    let remaining = pool;

    if (index > 0) {
      const record = ledger.records[index - 1];
      if (!record) return false;
      const line = Buffer.from(JSON.stringify(record) + "\n", "utf8");
      rolling.update(line);
      prefixBytes += line.length;
      tipHash = record.allocation_record_hash;
      reserved = record.reserved_void_total_after;
      remaining = record.remaining_void_after;
    }

    const ledgerSha256 =
      "sha256:" + rolling.copy().digest("hex");
    const highWaterJson =
      JSON.stringify({
        schema:
          VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_SCHEMA_V1,
        marker:
          VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_V1,
        version: 1,
        record_count: index,
        tip_hash: tipHash,
        ledger_sha256: ledgerSha256,
        ledger_bytes: prefixBytes,
        pool_void_total: pool,
        reserved_void_total: reserved,
        remaining_void: remaining,
      }) + "\n";
    const highWaterBytes = Buffer.from(highWaterJson, "utf8");

    if (
      event.record_count !== index ||
      event.ledger_bytes !== prefixBytes ||
      event.ledger_sha256 !== ledgerSha256 ||
      event.allocation_tip_sha256 !== tipHash ||
      event.high_water_bytes !== highWaterBytes.length ||
      event.high_water_sha256 !== sha256Id(highWaterBytes) ||
      event.pool_void_total !== pool ||
      event.reserved_void_total !== reserved ||
      event.remaining_void !== remaining
    ) {
      return false;
    }
  }

  return true;
}

function currentInvariantTuple(
  current: BuyVoidAllocationCustodyExternalWitnessCurrentV1,
): readonly unknown[] {
  return Object.freeze([
    current.source_hostname,
    current.source_machine_id_sha256,
    current.source_ledger_disk_wwn,
    current.source_custody_disk_wwn,
    current.custody_uuid,
    current.deployment_head,
    current.writer_source_blob_sha1,
    current.service_source_sha256,
    current.witness_hostname,
    current.witness_machine_id_sha256,
    current.witness_root_disk_serial,
    current.witness_root_disk_wwn,
    current.pool_void_total,
  ]);
}

function dynamicMatch(
  current: BuyVoidAllocationCustodyExternalWitnessCurrentV1,
  tip: BuyVoidAllocationCustodyExternalWitnessEventV1,
): boolean {
  return (
    current.ledger_sha256 === tip.ledger_sha256 &&
    current.ledger_bytes === tip.ledger_bytes &&
    current.high_water_sha256 === tip.high_water_sha256 &&
    current.high_water_bytes === tip.high_water_bytes &&
    current.allocation_tip_sha256 === tip.allocation_tip_sha256 &&
    current.pool_void_total === tip.pool_void_total &&
    current.reserved_void_total === tip.reserved_void_total &&
    current.remaining_void === tip.remaining_void
  );
}

export function classifyBuyVoidAllocationCustodyExternalWitnessV1(
  input: {
    witness_jsonl: string | Buffer;
    current_state: unknown;
    current_ledger_jsonl: string | Buffer;
    current_high_water_json: string | Buffer;
  },
) {
  try {
    const journal =
      parseBuyVoidAllocationCustodyExternalWitnessJournalV1(
        input?.witness_jsonl,
      );
    const current = parseCurrent(input?.current_state);
    const canonical = bindCanonicalCurrentState(
      current,
      input?.current_ledger_jsonl,
      input?.current_high_water_json,
    );

    if (
      !sameTuple(
        currentInvariantTuple(current),
        invariantTuple(journal.tip),
      )
    ) {
      fail("allocation_custody_witness_current_policy_mismatch");
    }

    if (current.record_count < journal.tip.record_count) {
      return Object.freeze({
        ...held("allocation_custody_witness_local_rollback_detected"),
        event_count: journal.event_count,
        witness_tip_sha256: journal.tip.event_sha256,
        witness_record_count: journal.tip.record_count,
        local_record_count: current.record_count,
        rollback_regression_detected: true,
      });
    }

    if (
      !witnessHistoryMatchesCanonicalCurrentLedger(
        journal.events,
        canonical.ledger_bytes,
      )
    ) {
      return Object.freeze({
        ...held("allocation_custody_witness_local_history_conflict"),
        event_count: journal.event_count,
        witness_tip_sha256: journal.tip.event_sha256,
        witness_record_count: journal.tip.record_count,
        local_record_count: current.record_count,
      });
    }

    if (current.record_count > journal.tip.record_count) {
      if (
        !witnessedCanonicalPrefixMatches(
          journal.tip,
          canonical.ledger_bytes,
        )
      ) {
        return Object.freeze({
          ...held("allocation_custody_witness_local_history_conflict"),
          event_count: journal.event_count,
          witness_tip_sha256: journal.tip.event_sha256,
          witness_record_count: journal.tip.record_count,
          local_record_count: current.record_count,
        });
      }
      return Object.freeze({
        ...held("allocation_custody_witness_update_required"),
        event_count: journal.event_count,
        witness_tip_sha256: journal.tip.event_sha256,
        witness_record_count: journal.tip.record_count,
        local_record_count: current.record_count,
      });
    }

    if (!dynamicMatch(current, journal.tip)) {
      return Object.freeze({
        ...held("allocation_custody_witness_same_epoch_conflict"),
        event_count: journal.event_count,
        witness_tip_sha256: journal.tip.event_sha256,
        witness_record_count: journal.tip.record_count,
        local_record_count: current.record_count,
      });
    }

    return Object.freeze({
      ok: true as const,
      status: "matched" as const,
      marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_EXTERNAL_WITNESS_V1,
      version: 1 as const,
      event_count: journal.event_count,
      witness_sha256: journal.witness_sha256,
      witness_tip_sha256: journal.tip.event_sha256,
      witness_record_count: journal.tip.record_count,
      local_record_count: current.record_count,
      exact_live_match: true as const,
      rollback_regression_detected: false as const,
      operation_performed: false as const,
      external_transport_authenticated: false as const,
      external_witness_storage_proven: false as const,
      protected_high_water_custody_proven: false as const,
      independent_custody_proven: false as const,
      production_gate_ready: false as const,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_EXTERNAL_WITNESS_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "allocation_custody_witness_validation_failed",
    );
  }
}

export function planBuyVoidAllocationCustodyExternalWitnessAdvanceV1(
  input: {
    witness_jsonl: string | Buffer;
    current_state: unknown;
    current_ledger_jsonl: string | Buffer;
    current_high_water_json: string | Buffer;
  },
) {
  try {
    const journal =
      parseBuyVoidAllocationCustodyExternalWitnessJournalV1(
        input?.witness_jsonl,
      );
    const current = parseCurrent(input?.current_state);
    const canonical = bindCanonicalCurrentState(
      current,
      input?.current_ledger_jsonl,
      input?.current_high_water_json,
    );
    const tip = journal.tip;

    if (
      !sameTuple(
        currentInvariantTuple(current),
        invariantTuple(tip),
      )
    ) {
      fail("allocation_custody_witness_current_policy_mismatch");
    }

    if (
      !witnessHistoryMatchesCanonicalCurrentLedger(
        journal.events,
        canonical.ledger_bytes,
      )
    ) {
      fail("allocation_custody_witness_historical_history_conflict");
    }

    if (current.record_count === tip.record_count) {
      if (!dynamicMatch(current, tip)) {
        fail("allocation_custody_witness_same_epoch_conflict");
      }
      return Object.freeze({
        ok: true as const,
        status: "idempotent" as const,
        marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_EXTERNAL_WITNESS_V1,
        version: 1 as const,
        event_count: journal.event_count,
        next_event: null,
        next_line: null,
        next_witness_jsonl: Buffer.isBuffer(input.witness_jsonl)
          ? Buffer.from(input.witness_jsonl)
          : Buffer.from(String(input.witness_jsonl ?? ""), "utf8"),
        operation_performed: false as const,
        authority:
          VOID_BUY_VOID_ALLOCATION_CUSTODY_EXTERNAL_WITNESS_AUTHORITY_V1,
      });
    }

    if (
      current.record_count !== tip.record_count + 1 ||
      !witnessedCanonicalPrefixMatches(
        tip,
        canonical.ledger_bytes,
      ) ||
      current.ledger_bytes <= tip.ledger_bytes ||
      current.allocation_tip_sha256 === tip.allocation_tip_sha256 ||
      amountMicro(
    current.reserved_void_total,
    "allocation_custody_witness_current_invalid",
  ) <=
        amountMicro(
        tip.reserved_void_total,
        "allocation_custody_witness_event_inventory_invalid",
      ) ||
      amountMicro(
    current.remaining_void,
    "allocation_custody_witness_current_invalid",
  ) >= amountMicro(
        tip.remaining_void,
        "allocation_custody_witness_event_inventory_invalid",
      )
    ) {
      fail("allocation_custody_witness_advance_invalid");
    }

    const body = Object.freeze({
      allocation_tip_sha256: current.allocation_tip_sha256,
      custody_uuid: current.custody_uuid,
      deployment_head: current.deployment_head,
      high_water_bytes: current.high_water_bytes,
      high_water_sha256: current.high_water_sha256,
      ledger_bytes: current.ledger_bytes,
      ledger_sha256: current.ledger_sha256,
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_EXTERNAL_WITNESS_EVENT_V1,
      pool_void_total: current.pool_void_total,
      previous_event_sha256: tip.event_sha256,
      record_count: current.record_count,
      remaining_void: current.remaining_void,
      reserved_void_total: current.reserved_void_total,
      sequence: tip.sequence + 1,
      service_source_sha256: current.service_source_sha256,
      source_custody_disk_wwn: current.source_custody_disk_wwn,
      source_hostname: current.source_hostname,
      source_ledger_disk_wwn: current.source_ledger_disk_wwn,
      source_machine_id_sha256: current.source_machine_id_sha256,
      version: 1 as const,
      witness_hostname: current.witness_hostname,
      witness_machine_id_sha256: current.witness_machine_id_sha256,
      witness_root_disk_serial: current.witness_root_disk_serial,
      witness_root_disk_wwn: current.witness_root_disk_wwn,
      writer_source_blob_sha1: current.writer_source_blob_sha1,
    });
    const event = Object.freeze({
      ...body,
      event_sha256: sha256Id(canonicalJson(body)),
    });
    const nextLine =
      canonicalJson(event) + "\n";
    const priorBytes = Buffer.isBuffer(input.witness_jsonl)
      ? Buffer.from(input.witness_jsonl)
      : Buffer.from(String(input.witness_jsonl ?? ""), "utf8");
    const nextBytes = Buffer.concat([
      priorBytes,
      Buffer.from(nextLine, "utf8"),
    ]);

    const verified =
      parseBuyVoidAllocationCustodyExternalWitnessJournalV1(
        nextBytes,
      );
    if (
      verified.tip.event_sha256 !== event.event_sha256 ||
      verified.tip.sequence !== event.sequence ||
      verified.tip.record_count !== current.record_count
    ) {
      fail("allocation_custody_witness_advance_postcheck_failed");
    }

    return Object.freeze({
      ok: true as const,
      status: "planned" as const,
      marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_EXTERNAL_WITNESS_V1,
      version: 1 as const,
      event_count: verified.event_count,
      next_event: event,
      next_line: nextLine,
      next_witness_jsonl: nextBytes,
      operation_performed: false as const,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_EXTERNAL_WITNESS_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "allocation_custody_witness_advance_failed",
    );
  }
}
