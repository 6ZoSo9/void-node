import crypto from "node:crypto";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_SCHEMA_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1,
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1,
} from "./buy_void_allocation_custody_witness_live_read_replay_high_water_v1.js";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_EVENT_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_EVENT_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    pure_validation_and_planning: true,
    canonical_replay_high_water_required: true,
    exact_historical_journal_prefix_rebinding: true,
    append_only_hash_chain: true,
    one_witness_event_per_replay_sequence: true,
    exact_next_sequence_planning: true,
    rollback_regression_detection: false,
    mixed_history_conflict_rejection: true,
    source_storage_identity_invariant: true,
    witness_host_identity_invariant: true,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    live_remote_read_performed: false,
    live_remote_append_performed: false,
    runtime_integration: false,
    live_durable_storage_proven: false,
    rollback_resistance_proven: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    production_gate_ready: false,
    filesystem_read: false,
    filesystem_write: false,
    network_access: false,
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
const SAFE_TEXT = /^[A-Za-z0-9._:@/+~-]{1,300}$/u;
const MAX_WITNESS_EVENTS = 8193;
const MAX_REPLAY_EVENTS = 8192;
const MAX_WITNESS_EVENT_BYTES = 4 * 1024;
const MAX_WITNESS_BYTES =
  MAX_WITNESS_EVENTS * MAX_WITNESS_EVENT_BYTES;

const IDENTITY_KEYS = Object.freeze([
  "source_hostname",
  "source_journal_root",
  "source_high_water_root",
  "source_journal_disk_wwn",
  "source_high_water_disk_wwn",
  "witness_hostname",
  "witness_machine_id_sha256",
  "witness_root_disk_serial",
  "witness_root_disk_wwn",
]);

const EVENT_KEYS = Object.freeze([
  "event_sha256",
  "event_count",
  "generation",
  "high_water_sha256",
  "journal_bytes",
  "journal_sha256",
  "last_terminal_state",
  "marker",
  "pending",
  "pending_challenge_id",
  "pending_challenge_sha256",
  "pending_expires_at_ms",
  "previous_event_sha256",
  "ready_for_issue",
  "replay_sequence",
  "sequence",
  "source_high_water_disk_wwn",
  "source_high_water_root",
  "source_hostname",
  "source_journal_disk_wwn",
  "source_journal_root",
  "tip_event_sha256",
  "version",
  "witness_hostname",
  "witness_machine_id_sha256",
  "witness_root_disk_serial",
  "witness_root_disk_wwn",
]);

const BODY_KEYS = Object.freeze(
  EVENT_KEYS.filter((key) => key !== "event_sha256"),
);

export type BuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessIdentityV1 =
  Readonly<{
    source_hostname: string;
    source_journal_root: string;
    source_high_water_root: string;
    source_journal_disk_wwn: string;
    source_high_water_disk_wwn: string;
    witness_hostname: string;
    witness_machine_id_sha256: string;
    witness_root_disk_serial: string;
    witness_root_disk_wwn: string;
  }>;

export type BuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessEventV1 =
  Readonly<{
    marker:
      typeof VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_EVENT_V1;
    version: 1;
    sequence: number;
    previous_event_sha256: string | null;
    replay_sequence: number;
    generation: number;
    event_count: number;
    tip_event_sha256: string | null;
    journal_sha256: string;
    journal_bytes: number;
    high_water_sha256: string;
    pending: boolean;
    pending_challenge_sha256: string | null;
    pending_challenge_id: string | null;
    pending_expires_at_ms: number | null;
    last_terminal_state: "consumed" | "abandoned" | null;
    ready_for_issue: boolean;
    source_hostname: string;
    source_journal_root: string;
    source_high_water_root: string;
    source_journal_disk_wwn: string;
    source_high_water_disk_wwn: string;
    witness_hostname: string;
    witness_machine_id_sha256: string;
    witness_root_disk_serial: string;
    witness_root_disk_wwn: string;
    event_sha256: string;
  }>;

function fail(reason: string): never {
  throw new Error(reason);
}

function held(reason: string, rollback = false) {
  return Object.freeze({
    ok: false as const,
    status: "held" as const,
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_V1,
    version: 1 as const,
    reason,
    rollback_regression_detected: rollback,
    operation_performed: false as const,
    external_transport_authenticated: false as const,
    external_witness_storage_proven: false as const,
    production_gate_ready: false as const,
    funds_movement: false as const,
    authority:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_AUTHORITY_V1,
  });
}

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
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
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(record[key]))
        .join(",") +
      "}"
    );
  }
  fail("witness_replay_external_witness_noncanonical_value");
}

function sha256Id(value: string | Buffer): string {
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

function safeInt(
  value: unknown,
  minimum: number,
  maximum: number,
  reason: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    fail(reason);
  }
  return value;
}

function safeText(
  value: unknown,
  reason: string,
): string {
  const text = String(value ?? "");
  if (!SAFE_TEXT.test(text)) fail(reason);
  return text;
}

function shaField(
  value: unknown,
  reason: string,
): string {
  if (typeof value !== "string" || !SHA256_ID.test(value)) {
    fail(reason);
  }
  return value;
}

function nullableSha(
  value: unknown,
  reason: string,
): string | null {
  if (value === null) return null;
  return shaField(value, reason);
}

function nullableChallengeId(
  value: unknown,
  reason: string,
): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || !CHALLENGE_ID.test(value)) {
    fail(reason);
  }
  return value;
}

function normalizeIdentity(
  input: unknown,
): BuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessIdentityV1 {
  const raw = exactObject(
    input,
    IDENTITY_KEYS,
    "witness_replay_external_witness_identity_shape_invalid",
  );
  const identity = Object.freeze({
    source_hostname: safeText(
      raw.source_hostname,
      "witness_replay_external_witness_source_identity_invalid",
    ),
    source_journal_root: safeText(
      raw.source_journal_root,
      "witness_replay_external_witness_source_identity_invalid",
    ),
    source_high_water_root: safeText(
      raw.source_high_water_root,
      "witness_replay_external_witness_source_identity_invalid",
    ),
    source_journal_disk_wwn: safeText(
      raw.source_journal_disk_wwn,
      "witness_replay_external_witness_source_identity_invalid",
    ),
    source_high_water_disk_wwn: safeText(
      raw.source_high_water_disk_wwn,
      "witness_replay_external_witness_source_identity_invalid",
    ),
    witness_hostname: safeText(
      raw.witness_hostname,
      "witness_replay_external_witness_witness_identity_invalid",
    ),
    witness_machine_id_sha256: shaField(
      raw.witness_machine_id_sha256,
      "witness_replay_external_witness_witness_identity_invalid",
    ),
    witness_root_disk_serial: safeText(
      raw.witness_root_disk_serial,
      "witness_replay_external_witness_witness_identity_invalid",
    ),
    witness_root_disk_wwn: safeText(
      raw.witness_root_disk_wwn,
      "witness_replay_external_witness_witness_identity_invalid",
    ),
  });
  if (
    identity.source_journal_root === identity.source_high_water_root ||
    identity.source_journal_disk_wwn ===
      identity.source_high_water_disk_wwn
  ) {
    fail("witness_replay_external_witness_source_separation_invalid");
  }
  return identity;
}

function parseEvent(
  rawValue: unknown,
): BuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessEventV1 {
  const raw = exactObject(
    rawValue,
    EVENT_KEYS,
    "witness_replay_external_witness_event_shape_invalid",
  );
  if (
    raw.marker !==
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_EVENT_V1 ||
    raw.version !== 1
  ) {
    fail("witness_replay_external_witness_event_identity_invalid");
  }
  const sequence = safeInt(
    raw.sequence,
    1,
    MAX_WITNESS_EVENTS,
    "witness_replay_external_witness_sequence_invalid",
  );
  const replaySequence = safeInt(
    raw.replay_sequence,
    0,
    MAX_REPLAY_EVENTS,
    "witness_replay_external_witness_replay_sequence_invalid",
  );
  const generation = safeInt(
    raw.generation,
    0,
    Number.MAX_SAFE_INTEGER,
    "witness_replay_external_witness_generation_invalid",
  );
  const eventCount = safeInt(
    raw.event_count,
    0,
    MAX_REPLAY_EVENTS,
    "witness_replay_external_witness_event_count_invalid",
  );
  const journalBytes = safeInt(
    raw.journal_bytes,
    0,
    8 * 1024 * 1024,
    "witness_replay_external_witness_journal_size_invalid",
  );
  const pending =
    typeof raw.pending === "boolean"
      ? raw.pending
      : fail("witness_replay_external_witness_pending_invalid");
  const readyForIssue =
    typeof raw.ready_for_issue === "boolean"
      ? raw.ready_for_issue
      : fail("witness_replay_external_witness_pending_invalid");
  const pendingChallengeSha = nullableSha(
    raw.pending_challenge_sha256,
    "witness_replay_external_witness_pending_invalid",
  );
  const pendingChallengeId = nullableChallengeId(
    raw.pending_challenge_id,
    "witness_replay_external_witness_pending_invalid",
  );
  const pendingExpires =
    raw.pending_expires_at_ms === null
      ? null
      : safeInt(
          raw.pending_expires_at_ms,
          1,
          Number.MAX_SAFE_INTEGER,
          "witness_replay_external_witness_pending_invalid",
        );
  const lastTerminalRaw = raw.last_terminal_state;
  let lastTerminal: "consumed" | "abandoned" | null;
  if (lastTerminalRaw === null) {
    lastTerminal = null;
  } else if (lastTerminalRaw === "consumed") {
    lastTerminal = "consumed";
  } else if (lastTerminalRaw === "abandoned") {
    lastTerminal = "abandoned";
  } else {
    fail("witness_replay_external_witness_terminal_invalid");
  }

  if (
    sequence !== replaySequence + 1 ||
    eventCount !== replaySequence ||
    pending === readyForIssue ||
    (
      pending &&
      (
        pendingChallengeSha === null ||
        pendingChallengeId === null ||
        pendingExpires === null ||
        pendingChallengeId !==
          "voidwlrc1_" +
            pendingChallengeSha.slice("sha256:".length)
      )
    ) ||
    (
      !pending &&
      (
        pendingChallengeSha !== null ||
        pendingChallengeId !== null ||
        pendingExpires !== null
      )
    )
  ) {
    fail("witness_replay_external_witness_state_invalid");
  }

  const event =
    Object.freeze({
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_EVENT_V1,
      version: 1 as const,
      sequence,
      previous_event_sha256: nullableSha(
        raw.previous_event_sha256,
        "witness_replay_external_witness_previous_invalid",
      ),
      replay_sequence: replaySequence,
      generation,
      event_count: eventCount,
      tip_event_sha256: nullableSha(
        raw.tip_event_sha256,
        "witness_replay_external_witness_tip_invalid",
      ),
      journal_sha256: shaField(
        raw.journal_sha256,
        "witness_replay_external_witness_hash_invalid",
      ),
      journal_bytes: journalBytes,
      high_water_sha256: shaField(
        raw.high_water_sha256,
        "witness_replay_external_witness_hash_invalid",
      ),
      pending,
      pending_challenge_sha256: pendingChallengeSha,
      pending_challenge_id: pendingChallengeId,
      pending_expires_at_ms: pendingExpires,
      last_terminal_state: lastTerminal,
      ready_for_issue: readyForIssue,
      source_hostname: safeText(
        raw.source_hostname,
        "witness_replay_external_witness_source_identity_invalid",
      ),
      source_journal_root: safeText(
        raw.source_journal_root,
        "witness_replay_external_witness_source_identity_invalid",
      ),
      source_high_water_root: safeText(
        raw.source_high_water_root,
        "witness_replay_external_witness_source_identity_invalid",
      ),
      source_journal_disk_wwn: safeText(
        raw.source_journal_disk_wwn,
        "witness_replay_external_witness_source_identity_invalid",
      ),
      source_high_water_disk_wwn: safeText(
        raw.source_high_water_disk_wwn,
        "witness_replay_external_witness_source_identity_invalid",
      ),
      witness_hostname: safeText(
        raw.witness_hostname,
        "witness_replay_external_witness_witness_identity_invalid",
      ),
      witness_machine_id_sha256: shaField(
        raw.witness_machine_id_sha256,
        "witness_replay_external_witness_witness_identity_invalid",
      ),
      witness_root_disk_serial: safeText(
        raw.witness_root_disk_serial,
        "witness_replay_external_witness_witness_identity_invalid",
      ),
      witness_root_disk_wwn: safeText(
        raw.witness_root_disk_wwn,
        "witness_replay_external_witness_witness_identity_invalid",
      ),
      event_sha256: shaField(
        raw.event_sha256,
        "witness_replay_external_witness_hash_invalid",
      ),
    }) satisfies BuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessEventV1;

  const body = Object.fromEntries(
    BODY_KEYS.map((key) => [
      key,
      event[key as keyof typeof event],
    ]),
  );
  if (event.event_sha256 !== sha256Id(canonicalJson(body))) {
    fail("witness_replay_external_witness_event_hash_mismatch");
  }
  if (
    event.replay_sequence === 0 &&
    (
      event.generation !== 0 ||
      event.event_count !== 0 ||
      event.tip_event_sha256 !== null ||
      event.pending !== false ||
      event.last_terminal_state !== null ||
      event.ready_for_issue !== true
    )
  ) {
    fail("witness_replay_external_witness_genesis_invalid");
  }
  if (
    event.replay_sequence > 0 &&
    event.tip_event_sha256 === null
  ) {
    fail("witness_replay_external_witness_state_invalid");
  }

  return event;
}

function invariantTuple(
  event: BuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessEventV1,
): readonly unknown[] {
  return Object.freeze([
    event.source_hostname,
    event.source_journal_root,
    event.source_high_water_root,
    event.source_journal_disk_wwn,
    event.source_high_water_disk_wwn,
    event.witness_hostname,
    event.witness_machine_id_sha256,
    event.witness_root_disk_serial,
    event.witness_root_disk_wwn,
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

export function parseBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessJournalV1(
  input: string | Buffer,
) {
  const bytes = Buffer.isBuffer(input)
    ? Buffer.from(input)
    : Buffer.from(String(input ?? ""), "utf8");
  if (
    bytes.length < 2 ||
    bytes.length > MAX_WITNESS_BYTES ||
    bytes.at(-1) !== 0x0a
  ) {
    fail("witness_replay_external_witness_bytes_invalid");
  }
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail("witness_replay_external_witness_utf8_invalid");
  }
  const lines = text.slice(0, -1).split("\n");
  if (
    lines.length < 1 ||
    lines.length > MAX_WITNESS_EVENTS ||
    lines.some(
      (line) =>
        line.length === 0 ||
        Buffer.byteLength(line, "utf8") + 1 >
          MAX_WITNESS_EVENT_BYTES,
    )
  ) {
    fail("witness_replay_external_witness_lines_invalid");
  }

  const events:
    BuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessEventV1[] =
    [];
  let invariant: readonly unknown[] | null = null;
  for (let index = 0; index < lines.length; index += 1) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(lines[index]);
    } catch {
      fail("witness_replay_external_witness_json_invalid");
    }
    const event = parseEvent(parsed);
    if (lines[index] !== canonicalJson(event)) {
      fail("witness_replay_external_witness_line_noncanonical");
    }
    const previous = events.at(-1) ?? null;
    if (
      event.sequence !== index + 1 ||
      event.replay_sequence !== index ||
      event.previous_event_sha256 !==
        (previous ? previous.event_sha256 : null)
    ) {
      fail("witness_replay_external_witness_chain_invalid");
    }
    const tuple = invariantTuple(event);
    if (invariant === null) invariant = tuple;
    else if (!sameTuple(tuple, invariant)) {
      fail("witness_replay_external_witness_identity_drift");
    }
    if (
      previous &&
      (
        event.high_water_sha256 === previous.high_water_sha256 ||
        event.journal_sha256 === previous.journal_sha256
      )
    ) {
      fail("witness_replay_external_witness_advance_invalid");
    }
    events.push(event);
  }
  const tip = events.at(-1);
  if (!tip) fail("witness_replay_external_witness_empty");
  return Object.freeze({
    event_count: events.length,
    tip,
    events: Object.freeze(events),
    witness_sha256: sha256Id(bytes),
  });
}

function localJournalBytes(
  journal: string | Buffer,
): Buffer {
  const bytes = Buffer.isBuffer(journal)
    ? Buffer.from(journal)
    : Buffer.from(String(journal ?? ""), "utf8");
  if (bytes.length > 8 * 1024 * 1024) {
    fail("witness_replay_external_witness_local_journal_bytes_invalid");
  }
  return bytes;
}

function canonicalReplayHighWaterJson(
  value: {
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
  },
): string {
  return (
    JSON.stringify({
      schema:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_SCHEMA_V1,
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1,
      version: 1,
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

function genesisReplayHighWaterProjection() {
  const journalSha256 = sha256Id(Buffer.alloc(0));
  const highWater = Object.freeze({
    sequence: 0,
    generation: 0,
    event_count: 0,
    tip_event_sha256: null,
    journal_sha256: journalSha256,
    journal_bytes: 0,
    pending: false,
    pending_challenge_sha256: null,
    pending_challenge_id: null,
    pending_expires_at_ms: null,
    last_terminal_state: null,
    ready_for_issue: true,
  });
  return Object.freeze({
    high_water: highWater,
    high_water_sha256: sha256Id(
      Buffer.from(canonicalReplayHighWaterJson(highWater), "utf8"),
    ),
  });
}

type ReplayPrefixProjectionV1 = Readonly<{
  high_water: {
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
  };
  high_water_sha256: string;
}>;


function eventMatchesHighWater(
  event: BuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessEventV1,
  highWater: any,
  highWaterSha256: string,
): boolean {
  return (
    event.replay_sequence === highWater.sequence &&
    event.generation === highWater.generation &&
    event.event_count === highWater.event_count &&
    event.tip_event_sha256 === highWater.tip_event_sha256 &&
    event.journal_sha256 === highWater.journal_sha256 &&
    event.journal_bytes === highWater.journal_bytes &&
    event.high_water_sha256 === highWaterSha256 &&
    event.pending === highWater.pending &&
    event.pending_challenge_sha256 ===
      highWater.pending_challenge_sha256 &&
    event.pending_challenge_id === highWater.pending_challenge_id &&
    event.pending_expires_at_ms === highWater.pending_expires_at_ms &&
    event.last_terminal_state === highWater.last_terminal_state &&
    event.ready_for_issue === highWater.ready_for_issue
  );
}

function eventIdentityMatches(
  event: BuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessEventV1,
  identity: BuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessIdentityV1,
): boolean {
  return (
    event.source_hostname === identity.source_hostname &&
    event.source_journal_root === identity.source_journal_root &&
    event.source_high_water_root === identity.source_high_water_root &&
    event.source_journal_disk_wwn ===
      identity.source_journal_disk_wwn &&
    event.source_high_water_disk_wwn ===
      identity.source_high_water_disk_wwn &&
    event.witness_hostname === identity.witness_hostname &&
    event.witness_machine_id_sha256 ===
      identity.witness_machine_id_sha256 &&
    event.witness_root_disk_serial ===
      identity.witness_root_disk_serial &&
    event.witness_root_disk_wwn ===
      identity.witness_root_disk_wwn
  );
}

function eventFromHighWater(
  sequence: number,
  previousEventSha256: string | null,
  identity:
    BuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessIdentityV1,
  highWater: any,
  highWaterSha256: string,
) {
  const body = Object.freeze({
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_EVENT_V1,
    version: 1 as const,
    sequence,
    previous_event_sha256: previousEventSha256,
    replay_sequence: highWater.sequence,
    generation: highWater.generation,
    event_count: highWater.event_count,
    tip_event_sha256: highWater.tip_event_sha256,
    journal_sha256: highWater.journal_sha256,
    journal_bytes: highWater.journal_bytes,
    high_water_sha256: highWaterSha256,
    pending: highWater.pending,
    pending_challenge_sha256: highWater.pending_challenge_sha256,
    pending_challenge_id: highWater.pending_challenge_id,
    pending_expires_at_ms: highWater.pending_expires_at_ms,
    last_terminal_state: highWater.last_terminal_state,
    ready_for_issue: highWater.ready_for_issue,
    ...identity,
  });
  return Object.freeze({
    ...body,
    event_sha256: sha256Id(canonicalJson(body)),
  });
}

function rebindWitnessHistory(
  witness: ReturnType<
    typeof parseBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessJournalV1
  >,
  journal: string | Buffer,
  captureReplaySequence: number | null = null,
): ReplayPrefixProjectionV1 | null {
  const genesis = genesisReplayHighWaterProjection();
  const genesisEvent = witness.events[0];
  if (
    genesisEvent &&
    !eventMatchesHighWater(
      genesisEvent,
      genesis.high_water,
      genesis.high_water_sha256,
    )
  ) {
    fail("witness_replay_external_witness_local_history_conflict");
  }
  if (captureReplaySequence === 0) return genesis;

  const bytes = localJournalBytes(journal);
  if (bytes.length === 0) return null;

  const targetSequence = Math.max(
    Math.min(witness.tip.replay_sequence, MAX_REPLAY_EVENTS),
    captureReplaySequence ?? 0,
  );
  if (targetSequence <= 0) return null;

  const journalHash = crypto.createHash("sha256");
  let start = 0;
  let sequence = 0;
  let lastTerminalState: "consumed" | "abandoned" | null = null;
  let captured: ReplayPrefixProjectionV1 | null = null;

  while (start < bytes.length && sequence < targetSequence) {
    const newline = bytes.indexOf(0x0a, start);
    if (newline < 0) {
      fail("witness_replay_external_witness_local_journal_newline_invalid");
    }
    const end = newline + 1;
    const lineBytes = bytes.subarray(start, end);
    journalHash.update(lineBytes);
    sequence += 1;

    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(
          bytes.subarray(start, newline),
        ),
      ) as Record<string, unknown>;
    } catch {
      fail("witness_replay_external_witness_local_journal_invalid");
    }

    const state = raw.state;
    if (state === "consumed" || state === "abandoned") {
      lastTerminalState = state;
    }
    const pending = state === "issued";
    const highWater = Object.freeze({
      sequence,
      generation: Number(raw.generation),
      event_count: sequence,
      tip_event_sha256: String(raw.event_sha256 ?? ""),
      journal_sha256:
        "sha256:" + journalHash.copy().digest("hex"),
      journal_bytes: end,
      pending,
      pending_challenge_sha256:
        pending ? String(raw.challenge_sha256 ?? "") : null,
      pending_challenge_id:
        pending ? String(raw.challenge_id ?? "") : null,
      pending_expires_at_ms:
        pending ? Number(raw.expires_at_ms) : null,
      last_terminal_state: lastTerminalState,
      ready_for_issue: !pending,
    });
    const projection = Object.freeze({
      high_water: highWater,
      high_water_sha256: sha256Id(
        Buffer.from(canonicalReplayHighWaterJson(highWater), "utf8"),
      ),
    });

    const witnessEvent = witness.events[sequence];
    if (
      witnessEvent &&
      !eventMatchesHighWater(
        witnessEvent,
        projection.high_water,
        projection.high_water_sha256,
      )
    ) {
      fail("witness_replay_external_witness_local_history_conflict");
    }
    if (captureReplaySequence === sequence) {
      captured = projection;
    }
    start = end;
  }

  if (
    captureReplaySequence !== null &&
    captureReplaySequence > sequence
  ) {
    return null;
  }
  return captured;
}


export function classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessV1(
  input: {
    witness_jsonl: string | Buffer;
    current_journal_jsonl: string | Buffer;
    current_high_water_json: string | Buffer;
    identity: unknown;
  },
) {
  try {
    const identity = normalizeIdentity(input?.identity);
    const witness =
      parseBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessJournalV1(
        input?.witness_jsonl,
      );
    if (!eventIdentityMatches(witness.tip, identity)) {
      fail("witness_replay_external_witness_identity_mismatch");
    }
    const current =
      classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1({
        journal_jsonl: input?.current_journal_jsonl,
        high_water_json: input?.current_high_water_json,
      });
    if (current.ok !== true) {
      fail(
        "witness_replay_external_witness_current_" +
          String(current.reason || "invalid"),
      );
    }

    rebindWitnessHistory(
      witness,
      input.current_journal_jsonl,
    );

    if (current.high_water.sequence < witness.tip.replay_sequence) {
      return held(
        "witness_replay_external_witness_ahead_unverified",
        false,
      );
    }

    if (current.high_water.sequence > witness.tip.replay_sequence) {
      return Object.freeze({
        ok: true as const,
        status: "external_witness_update_required" as const,
        marker:
          VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_V1,
        version: 1 as const,
        witness_event_count: witness.event_count,
        witnessed_replay_sequence: witness.tip.replay_sequence,
        local_replay_sequence: current.high_water.sequence,
        witness_sha256: witness.witness_sha256,
        witness_tip_event_sha256: witness.tip.event_sha256,
        exact_live_match: false as const,
        rollback_regression_detected: false as const,
        operation_performed: false as const,
        external_transport_authenticated: false as const,
        external_witness_storage_proven: false as const,
        production_gate_ready: false as const,
        funds_movement: false as const,
        authority:
          VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_AUTHORITY_V1,
      });
    }

    if (
      !eventMatchesHighWater(
        witness.tip,
        current.high_water,
        current.high_water_sha256,
      )
    ) {
      fail("witness_replay_external_witness_current_state_conflict");
    }

    return Object.freeze({
      ok: true as const,
      status: "matched" as const,
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_V1,
      version: 1 as const,
      witness_event_count: witness.event_count,
      witnessed_replay_sequence: witness.tip.replay_sequence,
      local_replay_sequence: current.high_water.sequence,
      witness_sha256: witness.witness_sha256,
      witness_tip_event_sha256: witness.tip.event_sha256,
      exact_live_match: true as const,
      rollback_regression_detected: false as const,
      operation_performed: false as const,
      external_transport_authenticated: false as const,
      external_witness_storage_proven: false as const,
      production_gate_ready: false as const,
      funds_movement: false as const,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "witness_replay_external_witness_classification_failed",
    );
  }
}

export function planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessAdvanceV1(
  input: {
    witness_jsonl: string | Buffer;
    current_journal_jsonl: string | Buffer;
    current_high_water_json: string | Buffer;
    identity: unknown;
  },
) {
  try {
    const identity = normalizeIdentity(input?.identity);
    const current =
      classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1({
        journal_jsonl: input?.current_journal_jsonl,
        high_water_json: input?.current_high_water_json,
      });
    if (current.ok !== true) {
      fail(
        "witness_replay_external_witness_current_" +
          String(current.reason || "invalid"),
      );
    }
    const witnessBytes = Buffer.isBuffer(input?.witness_jsonl)
      ? Buffer.from(input.witness_jsonl)
      : Buffer.from(String(input?.witness_jsonl ?? ""), "utf8");

    if (witnessBytes.length === 0) {
      if (current.high_water.sequence !== 0) {
        fail("witness_replay_external_witness_genesis_required");
      }
      const event = eventFromHighWater(
        1,
        null,
        identity,
        current.high_water,
        current.high_water_sha256,
      );
      const line = canonicalJson(event) + "\n";
      return Object.freeze({
        ok: true as const,
        status: "planned_genesis" as const,
        marker:
          VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_V1,
        version: 1 as const,
        next_event: event,
        event_jsonl_line: line,
        next_witness_jsonl: line,
        operation_performed: false as const,
        authority:
          VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_AUTHORITY_V1,
      });
    }

    const witness =
      parseBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessJournalV1(
        witnessBytes,
      );
    if (!eventIdentityMatches(witness.tip, identity)) {
      fail("witness_replay_external_witness_identity_mismatch");
    }
    const nextReplaySequence = witness.tip.replay_sequence + 1;
    const nextProjection = rebindWitnessHistory(
      witness,
      input.current_journal_jsonl,
      nextReplaySequence,
    );
    if (current.high_water.sequence < witness.tip.replay_sequence) {
      return held(
        "witness_replay_external_witness_ahead_unverified",
        false,
      );
    }

    if (current.high_water.sequence === witness.tip.replay_sequence) {
      if (
        !eventMatchesHighWater(
          witness.tip,
          current.high_water,
          current.high_water_sha256,
        )
      ) {
        fail("witness_replay_external_witness_current_state_conflict");
      }
      return Object.freeze({
        ok: true as const,
        status: "idempotent" as const,
        marker:
          VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_V1,
        version: 1 as const,
        next_event: null,
        event_jsonl_line: null,
        next_witness_jsonl: witnessBytes.toString("utf8"),
        operation_performed: false as const,
        authority:
          VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_AUTHORITY_V1,
      });
    }

    if (!nextProjection) {
      fail("witness_replay_external_witness_next_prefix_missing");
    }
    if (
      nextProjection.high_water.sequence !== nextReplaySequence
    ) {
      fail("witness_replay_external_witness_next_sequence_invalid");
    }

    const event = eventFromHighWater(
      witness.tip.sequence + 1,
      witness.tip.event_sha256,
      identity,
      nextProjection.high_water,
      nextProjection.high_water_sha256,
    );
    const line = canonicalJson(event) + "\n";
    const nextWitness = Buffer.concat([
      witnessBytes,
      Buffer.from(line, "utf8"),
    ]);
    if (
      nextWitness.length > MAX_WITNESS_BYTES ||
      witness.event_count + 1 > MAX_WITNESS_EVENTS
    ) {
      fail("witness_replay_external_witness_capacity_exhausted");
    }

    const parsed =
      parseBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessJournalV1(
        nextWitness,
      );
    if (parsed.tip.event_sha256 !== event.event_sha256) {
      fail("witness_replay_external_witness_postplan_invalid");
    }

    return Object.freeze({
      ok: true as const,
      status: "planned" as const,
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_V1,
      version: 1 as const,
      next_event: event,
      event_jsonl_line: line,
      next_witness_jsonl: nextWitness.toString("utf8"),
      operation_performed: false as const,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_WITNESS_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "witness_replay_external_witness_planning_failed",
    );
  }
}