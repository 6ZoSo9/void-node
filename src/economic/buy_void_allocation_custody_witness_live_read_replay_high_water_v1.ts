import crypto from "node:crypto";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_STATE_V1,
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayStateV1,
} from "./buy_void_allocation_custody_witness_live_read_replay_state_v1.js";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_SCHEMA_V1 =
  "void_buy_void_allocation_custody_witness_live_read_replay_high_water_v1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    pure_high_water_binding: true,
    exact_journal_sha256_binding: true,
    exact_journal_byte_length_binding: true,
    exact_sequence_binding: true,
    exact_generation_binding: true,
    exact_tip_binding: true,
    exact_pending_challenge_binding: true,
    exact_terminal_state_binding: true,
    monotonic_single_event_advance_validation: true,
    rollback_detection_with_presented_authoritative_high_water: true,
    content_addressed_projection: true,
    filesystem_read: false,
    filesystem_write: false,
    high_water_write: false,
    replay_journal_write: false,
    durable_persistence_proven: false,
    rollback_resistance_proven: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    trusted_verification_clock_proven: false,
    challenge_entropy_proven: false,
    challenge_unpredictability_proven: false,
    live_evidence_origin_proven: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    live_remote_read_performed: false,
    runtime_integration: false,
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
const CHALLENGE_ID = /^voidwlrc1_[0-9a-f]{64}$/u;
const MAX_JOURNAL_BYTES = 8 * 1024 * 1024;
const MAX_HIGH_WATER_BYTES = 16 * 1024;

const HIGH_WATER_KEYS = Object.freeze([
  "event_count",
  "generation",
  "journal_bytes",
  "journal_sha256",
  "last_terminal_state",
  "marker",
  "pending",
  "pending_challenge_id",
  "pending_challenge_sha256",
  "pending_expires_at_ms",
  "ready_for_issue",
  "schema",
  "sequence",
  "tip_event_sha256",
  "version",
]);

export type BuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1 =
  Readonly<{
    schema:
      typeof VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_SCHEMA_V1;
    marker:
      typeof VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1;
    version: 1;
    sequence: number;
    generation: number;
    event_count: number;
    tip_event_sha256: string | null;
    journal_sha256: string;
    journal_bytes: number;
    pending: boolean;
    pending_challenge_sha256: string | null;
    pending_challenge_id: string | null;
    pending_expires_at_ms: number | null;
    last_terminal_state: "consumed" | "abandoned" | null;
    ready_for_issue: boolean;
  }>;

type HeldV1 = Readonly<{
  ok: false;
  status: "held";
  marker:
    typeof VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1;
  version: 1;
  reason: string;
  authority:
    typeof VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_AUTHORITY_V1;
}>;

function held(reason: string): HeldV1 {
  return Object.freeze({
    ok: false,
    status: "held",
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1,
    version: 1,
    reason,
    authority:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_AUTHORITY_V1,
  });
}

function fail(reason: string): never {
  throw new Error(reason);
}

function sha256Id(value: string | Buffer): string {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(value).digest("hex")
  );
}

function journalBytesV1(value: string | Buffer): Buffer {
  if (!Buffer.isBuffer(value) && typeof value !== "string") {
    fail("witness_live_read_replay_high_water_journal_type_invalid");
  }
  const bytes = Buffer.isBuffer(value)
    ? Buffer.from(value)
    : Buffer.from(value, "utf8");
  if (bytes.length > MAX_JOURNAL_BYTES) {
    fail("witness_live_read_replay_high_water_journal_too_large");
  }
  return bytes;
}

function canonicalHighWaterJsonV1(
  value: BuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1,
): string {
  return (
    JSON.stringify({
      schema: value.schema,
      marker: value.marker,
      version: value.version,
      sequence: value.sequence,
      generation: value.generation,
      event_count: value.event_count,
      tip_event_sha256: value.tip_event_sha256,
      journal_sha256: value.journal_sha256,
      journal_bytes: value.journal_bytes,
      pending: value.pending,
      pending_challenge_sha256: value.pending_challenge_sha256,
      pending_challenge_id: value.pending_challenge_id,
      pending_expires_at_ms: value.pending_expires_at_ms,
      last_terminal_state: value.last_terminal_state,
      ready_for_issue: value.ready_for_issue,
    }) + "\n"
  );
}

function deriveHighWaterV1(
  journalJsonl: string | Buffer,
): {
  high_water: BuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1;
  high_water_json: string;
  high_water_sha256: string;
} {
  const bytes = journalBytesV1(journalJsonl);
  const replay =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayStateV1(bytes);
  if (replay.ok === false) {
    fail(
      "witness_live_read_replay_high_water_replay_" +
        replay.reason,
    );
  }
  if (
    replay.marker !==
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_STATE_V1 ||
    replay.version !== 1 ||
    replay.sequence !== replay.event_count ||
    !Number.isSafeInteger(replay.sequence) ||
    replay.sequence < 0 ||
    !Number.isSafeInteger(replay.generation) ||
    replay.generation < 0 ||
    !Number.isSafeInteger(replay.event_count) ||
    replay.event_count < 0 ||
    replay.event_count > 8192 ||
    !SHA256_ID.test(replay.journal_sha256)
  ) {
    fail("witness_live_read_replay_high_water_state_invalid");
  }
  if (
    (replay.tip_event_sha256 !== null &&
      !SHA256_ID.test(replay.tip_event_sha256)) ||
    (replay.pending_challenge_sha256 !== null &&
      !SHA256_ID.test(replay.pending_challenge_sha256)) ||
    (replay.pending_challenge_id !== null &&
      !CHALLENGE_ID.test(replay.pending_challenge_id)) ||
    (replay.pending_expires_at_ms !== null &&
      (!Number.isSafeInteger(replay.pending_expires_at_ms) ||
        replay.pending_expires_at_ms < 1)) ||
    (replay.last_terminal_state !== null &&
      replay.last_terminal_state !== "consumed" &&
      replay.last_terminal_state !== "abandoned")
  ) {
    fail("witness_live_read_replay_high_water_state_invalid");
  }
  if (
    replay.pending !== !replay.ready_for_issue ||
    (replay.pending &&
      (replay.pending_challenge_sha256 === null ||
        replay.pending_challenge_id === null ||
        replay.pending_expires_at_ms === null)) ||
    (!replay.pending &&
      (replay.pending_challenge_sha256 !== null ||
        replay.pending_challenge_id !== null ||
        replay.pending_expires_at_ms !== null))
  ) {
    fail("witness_live_read_replay_high_water_pending_state_invalid");
  }

  const highWater =
    Object.freeze({
      schema:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_SCHEMA_V1,
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1,
      version: 1 as const,
      sequence: replay.sequence,
      generation: replay.generation,
      event_count: replay.event_count,
      tip_event_sha256: replay.tip_event_sha256,
      journal_sha256: sha256Id(bytes),
      journal_bytes: bytes.length,
      pending: replay.pending,
      pending_challenge_sha256: replay.pending_challenge_sha256,
      pending_challenge_id: replay.pending_challenge_id,
      pending_expires_at_ms: replay.pending_expires_at_ms,
      last_terminal_state: replay.last_terminal_state,
      ready_for_issue: replay.ready_for_issue,
    }) satisfies BuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1;

  if (highWater.journal_sha256 !== replay.journal_sha256) {
    fail("witness_live_read_replay_high_water_journal_digest_mismatch");
  }

  const highWaterJson = canonicalHighWaterJsonV1(highWater);
  return Object.freeze({
    high_water: highWater,
    high_water_json: highWaterJson,
    high_water_sha256: sha256Id(
      Buffer.from(highWaterJson, "utf8"),
    ),
  });
}

function parseHighWaterV1(
  input: string | Buffer,
): BuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1 {
  const bytes = Buffer.isBuffer(input)
    ? Buffer.from(input)
    : typeof input === "string"
      ? Buffer.from(input, "utf8")
      : fail("witness_live_read_replay_high_water_type_invalid");
  if (
    bytes.length < 2 ||
    bytes.length > MAX_HIGH_WATER_BYTES ||
    bytes.at(-1) !== 0x0a
  ) {
    fail("witness_live_read_replay_high_water_bytes_invalid");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString("utf8").slice(0, -1));
  } catch {
    fail("witness_live_read_replay_high_water_json_invalid");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    fail("witness_live_read_replay_high_water_shape_invalid");
  }
  const raw = parsed as Record<string, unknown>;
  const actual = Object.keys(raw).sort();
  const expected = [...HIGH_WATER_KEYS].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail("witness_live_read_replay_high_water_shape_invalid");
  }
  if (
    raw.schema !==
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_SCHEMA_V1 ||
    raw.marker !==
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1 ||
    raw.version !== 1
  ) {
    fail("witness_live_read_replay_high_water_identity_invalid");
  }

  const sequence = Number(raw.sequence);
  const generation = Number(raw.generation);
  const eventCount = Number(raw.event_count);
  const journalBytes = Number(raw.journal_bytes);
  const pendingExpires =
    raw.pending_expires_at_ms === null
      ? null
      : Number(raw.pending_expires_at_ms);
  if (
    !Number.isSafeInteger(sequence) ||
    sequence < 0 ||
    !Number.isSafeInteger(generation) ||
    generation < 0 ||
    !Number.isSafeInteger(eventCount) ||
    eventCount < 0 ||
    eventCount > 8192 ||
    eventCount !== sequence ||
    !Number.isSafeInteger(journalBytes) ||
    journalBytes < 0 ||
    journalBytes > MAX_JOURNAL_BYTES ||
    (pendingExpires !== null &&
      (!Number.isSafeInteger(pendingExpires) || pendingExpires < 1))
  ) {
    fail("witness_live_read_replay_high_water_numeric_invalid");
  }

  const value =
    Object.freeze({
      schema:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_SCHEMA_V1,
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1,
      version: 1 as const,
      sequence,
      generation,
      event_count: eventCount,
      tip_event_sha256:
        raw.tip_event_sha256 === null
          ? null
          : String(raw.tip_event_sha256),
      journal_sha256: String(raw.journal_sha256 ?? ""),
      journal_bytes: journalBytes,
      pending: raw.pending,
      pending_challenge_sha256:
        raw.pending_challenge_sha256 === null
          ? null
          : String(raw.pending_challenge_sha256),
      pending_challenge_id:
        raw.pending_challenge_id === null
          ? null
          : String(raw.pending_challenge_id),
      pending_expires_at_ms: pendingExpires,
      last_terminal_state:
        raw.last_terminal_state === null
          ? null
          : raw.last_terminal_state,
      ready_for_issue: raw.ready_for_issue,
    }) as BuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1;

  if (
    !SHA256_ID.test(value.journal_sha256) ||
    (value.tip_event_sha256 !== null &&
      !SHA256_ID.test(value.tip_event_sha256)) ||
    (value.pending_challenge_sha256 !== null &&
      !SHA256_ID.test(value.pending_challenge_sha256)) ||
    (value.pending_challenge_id !== null &&
      !CHALLENGE_ID.test(value.pending_challenge_id)) ||
    typeof value.pending !== "boolean" ||
    typeof value.ready_for_issue !== "boolean" ||
    value.pending === value.ready_for_issue ||
    (value.last_terminal_state !== null &&
      value.last_terminal_state !== "consumed" &&
      value.last_terminal_state !== "abandoned") ||
    (value.pending &&
      (value.pending_challenge_sha256 === null ||
        value.pending_challenge_id === null ||
        value.pending_expires_at_ms === null)) ||
    (!value.pending &&
      (value.pending_challenge_sha256 !== null ||
        value.pending_challenge_id !== null ||
        value.pending_expires_at_ms !== null))
  ) {
    fail("witness_live_read_replay_high_water_state_invalid");
  }
  if (
    canonicalHighWaterJsonV1(value) !== bytes.toString("utf8")
  ) {
    fail("witness_live_read_replay_high_water_serialization_noncanonical");
  }
  return value;
}

export function deriveBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1(
  journalJsonl: string | Buffer,
) {
  try {
    const derived = deriveHighWaterV1(journalJsonl);
    return Object.freeze({
      ok: true as const,
      status: "derived" as const,
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1,
      version: 1 as const,
      operation_performed: false as const,
      ...derived,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "witness_live_read_replay_high_water_derive_failed",
    );
  }
}

export function classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1(
  input: {
    journal_jsonl: string | Buffer;
    high_water_json: string | Buffer;
  },
) {
  try {
    const observed = parseHighWaterV1(input?.high_water_json);
    const expected = deriveHighWaterV1(input?.journal_jsonl);
    if (
      canonicalHighWaterJsonV1(observed) !==
        expected.high_water_json
    ) {
      fail("witness_live_read_replay_high_water_binding_mismatch");
    }
    return Object.freeze({
      ok: true as const,
      status: "bound" as const,
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1,
      version: 1 as const,
      rollback_safe_for_presented_authoritative_high_water:
        true as const,
      operation_performed: false as const,
      high_water: observed,
      high_water_json: expected.high_water_json,
      high_water_sha256: expected.high_water_sha256,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "witness_live_read_replay_high_water_binding_failed",
    );
  }
}

export function planBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterAdvanceV1(
  input: {
    current_journal_jsonl: string | Buffer;
    current_high_water_json: string | Buffer;
    next_journal_jsonl: string | Buffer;
  },
) {
  try {
    const current =
      classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1({
        journal_jsonl: input?.current_journal_jsonl,
        high_water_json: input?.current_high_water_json,
      });
    if (current.ok === false) return current;

    const currentBytes = journalBytesV1(input.current_journal_jsonl);
    const nextBytes = journalBytesV1(input.next_journal_jsonl);
    const next = deriveHighWaterV1(nextBytes);

    if (nextBytes.equals(currentBytes)) {
      if (next.high_water_json !== current.high_water_json) {
        fail("witness_live_read_replay_high_water_idempotent_mismatch");
      }
      return Object.freeze({
        ok: true as const,
        status: "idempotent" as const,
        marker:
          VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1,
        version: 1 as const,
        idempotent: true as const,
        operation_performed: false as const,
        current_high_water: current.high_water,
        next_high_water: next.high_water,
        next_high_water_json: next.high_water_json,
        next_high_water_sha256: next.high_water_sha256,
        authority:
          VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_AUTHORITY_V1,
      });
    }

    if (
      nextBytes.length <= currentBytes.length ||
      !nextBytes.subarray(0, currentBytes.length).equals(currentBytes)
    ) {
      fail("witness_live_read_replay_high_water_advance_not_exact_append");
    }
    if (
      next.high_water.event_count !==
        current.high_water.event_count + 1 ||
      next.high_water.sequence !==
        current.high_water.sequence + 1 ||
      next.high_water.tip_event_sha256 ===
        current.high_water.tip_event_sha256
    ) {
      fail("witness_live_read_replay_high_water_advance_event_invalid");
    }

    if (current.high_water.pending) {
      if (
        next.high_water.pending ||
        next.high_water.generation !==
          current.high_water.generation ||
        next.high_water.ready_for_issue !== true
      ) {
        fail("witness_live_read_replay_high_water_terminal_advance_invalid");
      }
    } else if (
      !next.high_water.pending ||
      next.high_water.generation !==
        current.high_water.generation + 1 ||
      next.high_water.ready_for_issue !== false
    ) {
      fail("witness_live_read_replay_high_water_issue_advance_invalid");
    }

    return Object.freeze({
      ok: true as const,
      status: "planned" as const,
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1,
      version: 1 as const,
      idempotent: false as const,
      operation_performed: false as const,
      current_high_water: current.high_water,
      next_high_water: next.high_water,
      next_high_water_json: next.high_water_json,
      next_high_water_sha256: next.high_water_sha256,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "witness_live_read_replay_high_water_advance_failed",
    );
  }
}
