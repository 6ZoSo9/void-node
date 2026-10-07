import crypto from "node:crypto";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_EVENT_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_EVENT_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    pure_anchor_state_machine: true,
    append_only_hash_chain_semantics: true,
    exact_replay_sequence_increment_required: true,
    exact_issue_terminal_alternation_required: true,
    source_hostname_stability_required: true,
    replay_rewind_rejected: true,
    replay_gap_rejected: true,
    same_sequence_divergence_rejected: true,
    canonical_event_serialization_required: true,
    content_addressed_events: true,
    canonical_replay_projection_binding_proven: false,
    live_anchor_storage_proven: false,
    external_anchor_transport_authenticated: false,
    external_anchor_append_performed: false,
    external_anchor_read_performed: false,
    rollback_resistance_proven: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    live_evidence_origin_proven: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    live_remote_read_performed: false,
    runtime_integration: false,
    production_gate_ready: false,
    filesystem_read: false,
    filesystem_write: false,
    network_access: false,
    credential_access: false,
    wallet_or_signer_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    presale_activation: false,
    market_activation: false,
    funds_movement: false,
  });

const EVENT_KEYS = Object.freeze([
  "anchor_sequence",
  "event_sha256",
  "marker",
  "previous_event_sha256",
  "replay_event_count",
  "replay_generation",
  "replay_high_water_sha256",
  "replay_journal_sha256",
  "replay_last_terminal_state",
  "replay_pending",
  "replay_pending_challenge_id",
  "replay_pending_challenge_sha256",
  "replay_pending_expires_at_ms",
  "replay_ready_for_issue",
  "replay_sequence",
  "replay_tip_event_sha256",
  "source_hostname",
  "version",
]);

const PROJECTION_KEYS = Object.freeze([
  "replay_event_count",
  "replay_generation",
  "replay_high_water_sha256",
  "replay_journal_sha256",
  "replay_last_terminal_state",
  "replay_pending",
  "replay_pending_challenge_id",
  "replay_pending_challenge_sha256",
  "replay_pending_expires_at_ms",
  "replay_ready_for_issue",
  "replay_sequence",
  "replay_tip_event_sha256",
  "source_hostname",
]);

const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const CHALLENGE_ID = /^voidwlrc1_[0-9a-f]{64}$/u;
const SAFE_HOSTNAME = /^[A-Za-z0-9._-]{1,255}$/u;
const MAX_ANCHOR_BYTES = 16 * 1024 * 1024;
const MAX_ANCHOR_EVENTS = 8193;

export type BuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorProjectionV1 =
  Readonly<{
    source_hostname: string;
    replay_sequence: number;
    replay_generation: number;
    replay_event_count: number;
    replay_tip_event_sha256: string | null;
    replay_high_water_sha256: string;
    replay_journal_sha256: string;
    replay_pending: boolean;
    replay_pending_challenge_sha256: string | null;
    replay_pending_challenge_id: string | null;
    replay_pending_expires_at_ms: number | null;
    replay_last_terminal_state: "consumed" | "abandoned" | null;
    replay_ready_for_issue: boolean;
  }>;

export type BuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorEventV1 =
  Readonly<
    BuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorProjectionV1 & {
      marker:
        typeof VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_EVENT_V1;
      version: 1;
      anchor_sequence: number;
      previous_event_sha256: string | null;
      event_sha256: string;
    }
  >;

function fail(reason: string): never {
  throw new Error(reason);
}

function held(reason: string) {
  return Object.freeze({
    ok: false as const,
    status: "held" as const,
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_V1,
    version: 1 as const,
    reason,
    operation_performed: false as const,
    authority:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_AUTHORITY_V1,
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
        .map(
          (key) =>
            JSON.stringify(key) + ":" + canonicalJson(record[key]),
        )
        .join(",") +
      "}"
    );
  }
  fail("witness_replay_external_anchor_noncanonical_value");
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
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail(reason);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const own = Reflect.ownKeys(descriptors);
  if (own.some((key) => typeof key !== "string")) fail(reason);
  const actual = (own as string[]).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(reason);
  }
  const out: Record<string, unknown> = Object.create(null);
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail(reason);
    }
    out[key] = descriptor.value;
  }
  return out;
}

function safeInt(
  value: unknown,
  min: number,
  max: number,
  reason: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  ) {
    fail(reason);
  }
  return value;
}

function nullableSha(value: unknown, reason: string): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || !SHA256_ID.test(value)) {
    fail(reason);
  }
  return value;
}

function normalizeProjection(
  input: unknown,
): BuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorProjectionV1 {
  const raw = exactObject(
    input,
    PROJECTION_KEYS,
    "witness_replay_external_anchor_projection_shape_invalid",
  );

  if (
    typeof raw.source_hostname !== "string" ||
    !SAFE_HOSTNAME.test(raw.source_hostname)
  ) {
    fail("witness_replay_external_anchor_hostname_invalid");
  }

  const sequence = safeInt(
    raw.replay_sequence,
    0,
    8192,
    "witness_replay_external_anchor_replay_sequence_invalid",
  );
  const generation = safeInt(
    raw.replay_generation,
    0,
    4096,
    "witness_replay_external_anchor_replay_generation_invalid",
  );
  const eventCount = safeInt(
    raw.replay_event_count,
    0,
    8192,
    "witness_replay_external_anchor_replay_event_count_invalid",
  );
  if (eventCount !== sequence) {
    fail("witness_replay_external_anchor_replay_count_invalid");
  }

  if (
    typeof raw.replay_high_water_sha256 !== "string" ||
    !SHA256_ID.test(raw.replay_high_water_sha256) ||
    typeof raw.replay_journal_sha256 !== "string" ||
    !SHA256_ID.test(raw.replay_journal_sha256)
  ) {
    fail("witness_replay_external_anchor_replay_digest_invalid");
  }

  const tip = nullableSha(
    raw.replay_tip_event_sha256,
    "witness_replay_external_anchor_replay_tip_invalid",
  );
  const pendingChallengeSha = nullableSha(
    raw.replay_pending_challenge_sha256,
    "witness_replay_external_anchor_pending_challenge_invalid",
  );
  let pendingChallengeId: string | null = null;
  if (raw.replay_pending_challenge_id !== null) {
    if (
      typeof raw.replay_pending_challenge_id !== "string" ||
      !CHALLENGE_ID.test(raw.replay_pending_challenge_id)
    ) {
      fail("witness_replay_external_anchor_pending_challenge_invalid");
    }
    pendingChallengeId = raw.replay_pending_challenge_id;
  }
  let pendingExpiresAt: number | null = null;
  if (raw.replay_pending_expires_at_ms !== null) {
    pendingExpiresAt = safeInt(
      raw.replay_pending_expires_at_ms,
      1,
      Number.MAX_SAFE_INTEGER,
      "witness_replay_external_anchor_pending_expiry_invalid",
    );
  }

  if (
    typeof raw.replay_pending !== "boolean" ||
    typeof raw.replay_ready_for_issue !== "boolean" ||
    raw.replay_pending === raw.replay_ready_for_issue
  ) {
    fail("witness_replay_external_anchor_pending_state_invalid");
  }

  let lastTerminal: "consumed" | "abandoned" | null = null;
  if (
    raw.replay_last_terminal_state === "consumed" ||
    raw.replay_last_terminal_state === "abandoned"
  ) {
    lastTerminal = raw.replay_last_terminal_state;
  } else if (raw.replay_last_terminal_state !== null) {
    fail("witness_replay_external_anchor_terminal_state_invalid");
  }

  if (
    raw.replay_pending === true &&
    (
      pendingChallengeSha === null ||
      pendingChallengeId === null ||
      pendingExpiresAt === null
    )
  ) {
    fail("witness_replay_external_anchor_pending_state_invalid");
  }
  if (
    raw.replay_pending === false &&
    (
      pendingChallengeSha !== null ||
      pendingChallengeId !== null ||
      pendingExpiresAt !== null
    )
  ) {
    fail("witness_replay_external_anchor_pending_state_invalid");
  }

  if (
    sequence === 0 &&
    (
      generation !== 0 ||
      tip !== null ||
      raw.replay_pending !== false ||
      raw.replay_ready_for_issue !== true ||
      lastTerminal !== null
    )
  ) {
    fail("witness_replay_external_anchor_genesis_projection_invalid");
  }
  if (
    sequence > 0 &&
    (
      generation < 1 ||
      tip === null
    )
  ) {
    fail("witness_replay_external_anchor_non_genesis_projection_invalid");
  }

  return Object.freeze({
    source_hostname: raw.source_hostname,
    replay_sequence: sequence,
    replay_generation: generation,
    replay_event_count: eventCount,
    replay_tip_event_sha256: tip,
    replay_high_water_sha256: raw.replay_high_water_sha256,
    replay_journal_sha256: raw.replay_journal_sha256,
    replay_pending: raw.replay_pending,
    replay_pending_challenge_sha256: pendingChallengeSha,
    replay_pending_challenge_id: pendingChallengeId,
    replay_pending_expires_at_ms: pendingExpiresAt,
    replay_last_terminal_state: lastTerminal,
    replay_ready_for_issue: raw.replay_ready_for_issue,
  });
}

function eventBody(
  event: Omit<
    BuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorEventV1,
    "event_sha256"
  >,
) {
  return Object.freeze({
    marker: event.marker,
    version: event.version,
    anchor_sequence: event.anchor_sequence,
    previous_event_sha256: event.previous_event_sha256,
    source_hostname: event.source_hostname,
    replay_sequence: event.replay_sequence,
    replay_generation: event.replay_generation,
    replay_event_count: event.replay_event_count,
    replay_tip_event_sha256: event.replay_tip_event_sha256,
    replay_high_water_sha256: event.replay_high_water_sha256,
    replay_journal_sha256: event.replay_journal_sha256,
    replay_pending: event.replay_pending,
    replay_pending_challenge_sha256:
      event.replay_pending_challenge_sha256,
    replay_pending_challenge_id:
      event.replay_pending_challenge_id,
    replay_pending_expires_at_ms:
      event.replay_pending_expires_at_ms,
    replay_last_terminal_state:
      event.replay_last_terminal_state,
    replay_ready_for_issue: event.replay_ready_for_issue,
  });
}

function withEventDigest(
  body: Omit<
    BuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorEventV1,
    "event_sha256"
  >,
): BuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorEventV1 {
  return Object.freeze({
    ...body,
    event_sha256: sha256Id(
      Buffer.from(canonicalJson(eventBody(body)), "utf8"),
    ),
  });
}

function projectionFromEvent(
  event: BuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorEventV1,
): BuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorProjectionV1 {
  return Object.freeze({
    source_hostname: event.source_hostname,
    replay_sequence: event.replay_sequence,
    replay_generation: event.replay_generation,
    replay_event_count: event.replay_event_count,
    replay_tip_event_sha256: event.replay_tip_event_sha256,
    replay_high_water_sha256: event.replay_high_water_sha256,
    replay_journal_sha256: event.replay_journal_sha256,
    replay_pending: event.replay_pending,
    replay_pending_challenge_sha256:
      event.replay_pending_challenge_sha256,
    replay_pending_challenge_id:
      event.replay_pending_challenge_id,
    replay_pending_expires_at_ms:
      event.replay_pending_expires_at_ms,
    replay_last_terminal_state:
      event.replay_last_terminal_state,
    replay_ready_for_issue: event.replay_ready_for_issue,
  });
}

function parseEvent(
  line: string,
): BuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorEventV1 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    fail("witness_replay_external_anchor_event_json_invalid");
  }
  const raw = exactObject(
    parsed,
    EVENT_KEYS,
    "witness_replay_external_anchor_event_shape_invalid",
  );
  if (
    raw.marker !==
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_EVENT_V1 ||
    raw.version !== 1
  ) {
    fail("witness_replay_external_anchor_event_identity_invalid");
  }

  const anchorSequence = safeInt(
    raw.anchor_sequence,
    1,
    MAX_ANCHOR_EVENTS,
    "witness_replay_external_anchor_sequence_invalid",
  );
  const previousEventSha = nullableSha(
    raw.previous_event_sha256,
    "witness_replay_external_anchor_previous_invalid",
  );
  if (
    typeof raw.event_sha256 !== "string" ||
    !SHA256_ID.test(raw.event_sha256)
  ) {
    fail("witness_replay_external_anchor_event_digest_invalid");
  }

  const projection = normalizeProjection({
    source_hostname: raw.source_hostname,
    replay_sequence: raw.replay_sequence,
    replay_generation: raw.replay_generation,
    replay_event_count: raw.replay_event_count,
    replay_tip_event_sha256: raw.replay_tip_event_sha256,
    replay_high_water_sha256: raw.replay_high_water_sha256,
    replay_journal_sha256: raw.replay_journal_sha256,
    replay_pending: raw.replay_pending,
    replay_pending_challenge_sha256:
      raw.replay_pending_challenge_sha256,
    replay_pending_challenge_id:
      raw.replay_pending_challenge_id,
    replay_pending_expires_at_ms:
      raw.replay_pending_expires_at_ms,
    replay_last_terminal_state:
      raw.replay_last_terminal_state,
    replay_ready_for_issue: raw.replay_ready_for_issue,
  });

  const expected = withEventDigest({
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_EVENT_V1,
    version: 1,
    anchor_sequence: anchorSequence,
    previous_event_sha256: previousEventSha,
    ...projection,
  });
  if (expected.event_sha256 !== raw.event_sha256) {
    fail("witness_replay_external_anchor_event_digest_invalid");
  }
  if (canonicalJson(expected) !== line) {
    fail("witness_replay_external_anchor_event_serialization_invalid");
  }
  return expected;
}

function journalBytes(input: string | Buffer): Buffer {
  if (!Buffer.isBuffer(input) && typeof input !== "string") {
    fail("witness_replay_external_anchor_journal_type_invalid");
  }
  const bytes = Buffer.isBuffer(input)
    ? Buffer.from(input)
    : Buffer.from(input, "utf8");
  if (bytes.length > MAX_ANCHOR_BYTES) {
    fail("witness_replay_external_anchor_journal_too_large");
  }
  return bytes;
}

function classifyOrThrow(input: string | Buffer) {
  const bytes = journalBytes(input);
  if (bytes.length === 0) {
    return Object.freeze({
      anchor_sequence: 0,
      event_count: 0,
      tip_event_sha256: null as string | null,
      replay_sequence: null as number | null,
      projection: null as
        | BuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorProjectionV1
        | null,
      journal_sha256: sha256Id(bytes),
    });
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail("witness_replay_external_anchor_journal_utf8_invalid");
  }
  if (!text.endsWith("\n")) {
    fail("witness_replay_external_anchor_journal_newline_invalid");
  }
  const lines = text.slice(0, -1).split("\n");
  if (
    lines.length < 1 ||
    lines.length > MAX_ANCHOR_EVENTS ||
    lines.some((line) => line.length === 0)
  ) {
    fail("witness_replay_external_anchor_journal_lines_invalid");
  }

  let previous:
    | BuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorEventV1
    | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const event = parseEvent(lines[index]);
    if (event.anchor_sequence !== index + 1) {
      fail("witness_replay_external_anchor_sequence_discontinuous");
    }
    if (
      event.previous_event_sha256 !==
      (previous ? previous.event_sha256 : null)
    ) {
      fail("witness_replay_external_anchor_chain_invalid");
    }

    if (!previous) {
      if (
        event.anchor_sequence !== 1 ||
        event.replay_sequence !== 0
      ) {
        fail("witness_replay_external_anchor_genesis_invalid");
      }
    } else {
      if (event.source_hostname !== previous.source_hostname) {
        fail("witness_replay_external_anchor_source_host_drift");
      }
      if (
        event.replay_sequence !== previous.replay_sequence + 1 ||
        event.replay_event_count !== previous.replay_event_count + 1
      ) {
        fail("witness_replay_external_anchor_replay_sequence_discontinuous");
      }
      if (
        event.replay_high_water_sha256 ===
          previous.replay_high_water_sha256 ||
        event.replay_journal_sha256 ===
          previous.replay_journal_sha256 ||
        event.replay_tip_event_sha256 ===
          previous.replay_tip_event_sha256
      ) {
        fail("witness_replay_external_anchor_replay_projection_not_advanced");
      }

      if (previous.replay_pending === false) {
        if (
          event.replay_pending !== true ||
          event.replay_ready_for_issue !== false ||
          event.replay_generation !== previous.replay_generation + 1 ||
          event.replay_last_terminal_state !==
            previous.replay_last_terminal_state
        ) {
          fail("witness_replay_external_anchor_issue_transition_invalid");
        }
      } else if (
        event.replay_pending !== false ||
        event.replay_ready_for_issue !== true ||
        event.replay_generation !== previous.replay_generation ||
        (
          event.replay_last_terminal_state !== "consumed" &&
          event.replay_last_terminal_state !== "abandoned"
        )
      ) {
        fail("witness_replay_external_anchor_terminal_transition_invalid");
      }
    }
    previous = event;
  }

  if (!previous) {
    fail("witness_replay_external_anchor_internal_empty");
  }
  return Object.freeze({
    anchor_sequence: previous.anchor_sequence,
    event_count: lines.length,
    tip_event_sha256: previous.event_sha256,
    replay_sequence: previous.replay_sequence,
    projection: projectionFromEvent(previous),
    journal_sha256: sha256Id(bytes),
  });
}

function sameProjection(
  left: BuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorProjectionV1,
  right: BuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorProjectionV1,
): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

export function classifyBuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorV1(
  anchorJournalJsonl: string | Buffer,
) {
  try {
    const state = classifyOrThrow(anchorJournalJsonl);
    return Object.freeze({
      ok: true as const,
      status:
        state.event_count === 0
          ? ("empty" as const)
          : ("anchored" as const),
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_V1,
      version: 1 as const,
      anchor_sequence: state.anchor_sequence,
      event_count: state.event_count,
      tip_event_sha256: state.tip_event_sha256,
      replay_sequence: state.replay_sequence,
      projection: state.projection,
      journal_sha256: state.journal_sha256,
      operation_performed: false as const,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "witness_replay_external_anchor_invalid",
    );
  }
}

export function planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalAnchorAppendV1(
  input: {
    anchor_journal_jsonl: string | Buffer;
    projection: unknown;
  },
) {
  try {
    const state = classifyOrThrow(input?.anchor_journal_jsonl);
    const projection = normalizeProjection(input?.projection);

    if (state.projection === null) {
      if (projection.replay_sequence !== 0) {
        fail("witness_replay_external_anchor_genesis_required");
      }
    } else {
      if (projection.source_hostname !== state.projection.source_hostname) {
        fail("witness_replay_external_anchor_source_host_drift");
      }
      if (projection.replay_sequence === state.projection.replay_sequence) {
        if (!sameProjection(projection, state.projection)) {
          fail("witness_replay_external_anchor_same_sequence_divergence");
        }
        return Object.freeze({
          ok: true as const,
          status: "already_anchored" as const,
          marker:
            VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_V1,
          version: 1 as const,
          anchor_sequence: state.anchor_sequence,
          replay_sequence: projection.replay_sequence,
          tip_event_sha256: state.tip_event_sha256,
          next_anchor_journal_jsonl:
            Buffer.isBuffer(input.anchor_journal_jsonl)
              ? input.anchor_journal_jsonl.toString("utf8")
              : input.anchor_journal_jsonl,
          operation_performed: false as const,
          authority:
            VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_AUTHORITY_V1,
        });
      }
      if (projection.replay_sequence < state.projection.replay_sequence) {
        fail("witness_replay_external_anchor_replay_rewind");
      }
      if (projection.replay_sequence > state.projection.replay_sequence + 1) {
        fail("witness_replay_external_anchor_replay_gap");
      }
    }

    if (state.event_count >= MAX_ANCHOR_EVENTS) {
      fail("witness_replay_external_anchor_event_limit_reached");
    }

    const event = withEventDigest({
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_EVENT_V1,
      version: 1,
      anchor_sequence: state.anchor_sequence + 1,
      previous_event_sha256: state.tip_event_sha256,
      ...projection,
    });

    const current = journalBytes(input.anchor_journal_jsonl);
    const line = Buffer.from(canonicalJson(event) + "\n", "utf8");
    if (current.length + line.length > MAX_ANCHOR_BYTES) {
      fail("witness_replay_external_anchor_journal_too_large");
    }
    const next = Buffer.concat([current, line]);

    const verified = classifyOrThrow(next);
    if (
      verified.tip_event_sha256 !== event.event_sha256 ||
      verified.replay_sequence !== projection.replay_sequence
    ) {
      fail("witness_replay_external_anchor_postcheck_failed");
    }

    return Object.freeze({
      ok: true as const,
      status: "anchor_append_planned" as const,
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_V1,
      version: 1 as const,
      event,
      event_jsonl_line: line.toString("utf8"),
      anchor_sequence: event.anchor_sequence,
      replay_sequence: projection.replay_sequence,
      tip_event_sha256: event.event_sha256,
      next_anchor_journal_jsonl: next.toString("utf8"),
      operation_performed: false as const,
      canonical_replay_projection_binding_proven: false as const,
      rollback_resistance_proven: false as const,
      protected_high_water_custody_proven: false as const,
      independent_custody_proven: false as const,
      production_gate_ready: false as const,
      funds_movement: false as const,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_ANCHOR_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "witness_replay_external_anchor_append_failed",
    );
  }
}
