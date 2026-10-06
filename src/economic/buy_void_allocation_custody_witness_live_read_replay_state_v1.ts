import crypto from "node:crypto";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_STATE_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_STATE_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EVENT_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EVENT_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    pure_state_machine: true,
    append_only_event_chain_semantics: true,
    exact_generation_increment_required: true,
    challenge_generation_binding_proven: true,
    single_pending_challenge_required: true,
    single_use_terminal_transition_required: true,
    response_replay_rejection_semantics: true,
    supplied_time_ordering_only: true,
    durable_persistence_proven: false,
    rollback_resistance_proven: false,
    protected_high_water_custody_proven: false,
    trusted_verification_clock_proven: false,
    challenge_entropy_proven: false,
    challenge_unpredictability_proven: false,
    live_evidence_origin_proven: false,
    live_sshd_connection_context_proven: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    live_remote_read_performed: false,
    runtime_integration: false,
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
const REQUEST_ID = /^voidwreq1_[0-9a-f]{64}$/u;
const CHALLENGE_ID = /^voidwlrc1_[0-9a-f]{64}$/u;
const EVENT_KEYS = Object.freeze([
  "challenge_id",
  "challenge_sha256",
  "entropy_sha256",
  "event_sha256",
  "expires_at_ms",
  "generation",
  "issued_at_ms",
  "marker",
  "previous_event_sha256",
  "request_id",
  "response_sha256",
  "sequence",
  "state",
  "terminal_at_ms",
  "version",
]);
const MAX_CHALLENGE_TTL_MS = 38_000;
const MAX_JOURNAL_BYTES = 8 * 1024 * 1024;
const MAX_EVENTS = 8192;

type ReplayStateNameV1 = "issued" | "consumed" | "abandoned";

export type WitnessLiveReadReplayEventV1 = Readonly<{
  marker:
    typeof VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EVENT_V1;
  version: 1;
  sequence: number;
  previous_event_sha256: string | null;
  generation: number;
  state: ReplayStateNameV1;
  entropy_sha256: string;
  challenge_sha256: string;
  challenge_id: string;
  issued_at_ms: number;
  expires_at_ms: number;
  request_id: string | null;
  response_sha256: string | null;
  terminal_at_ms: number | null;
  event_sha256: string;
}>;

function held(reason: string) {
  return Object.freeze({
    ok: false as const,
    status: "held" as const,
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_STATE_V1,
    version: 1 as const,
    reason,
    operation_performed: false as const,
    authority:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_AUTHORITY_V1,
  });
}

function fail(reason: string): never {
  throw new Error(reason);
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
  fail("witness_live_read_replay_noncanonical_value");
}

function sha256Hex(value: string | Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256Id(value: string | Buffer): string {
  return "sha256:" + sha256Hex(value);
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

function shaField(value: unknown, reason: string): string {
  if (typeof value !== "string" || !SHA256_ID.test(value)) {
    fail(reason);
  }
  return value;
}

function nullableShaField(value: unknown, reason: string): string | null {
  if (value === null) return null;
  return shaField(value, reason);
}

function requestField(value: unknown, reason: string): string {
  if (typeof value !== "string" || !REQUEST_ID.test(value)) {
    fail(reason);
  }
  return value;
}

function eventBody(
  event: Omit<WitnessLiveReadReplayEventV1, "event_sha256">,
) {
  return Object.freeze({
    marker: event.marker,
    version: event.version,
    sequence: event.sequence,
    previous_event_sha256: event.previous_event_sha256,
    generation: event.generation,
    state: event.state,
    entropy_sha256: event.entropy_sha256,
    challenge_sha256: event.challenge_sha256,
    challenge_id: event.challenge_id,
    issued_at_ms: event.issued_at_ms,
    expires_at_ms: event.expires_at_ms,
    request_id: event.request_id,
    response_sha256: event.response_sha256,
    terminal_at_ms: event.terminal_at_ms,
  });
}

function eventWithDigest(
  body: Omit<WitnessLiveReadReplayEventV1, "event_sha256">,
): WitnessLiveReadReplayEventV1 {
  return Object.freeze({
    ...body,
    event_sha256: sha256Id(
      Buffer.from(canonicalJson(eventBody(body)), "utf8"),
    ),
  });
}

function challengeMaterial(args: {
  generation: number;
  previous_event_sha256: string | null;
  entropy_sha256: string;
  issued_at_ms: number;
  expires_at_ms: number;
}) {
  return Object.freeze({
    domain:
      "void:mainnet-0:buy-void-allocation-custody-witness-live-read-challenge-v1",
    generation: args.generation,
    previous_event_sha256: args.previous_event_sha256,
    entropy_sha256: args.entropy_sha256,
    issued_at_ms: args.issued_at_ms,
    expires_at_ms: args.expires_at_ms,
  });
}

function deriveChallenge(args: {
  generation: number;
  previous_event_sha256: string | null;
  entropy_sha256: string;
  issued_at_ms: number;
  expires_at_ms: number;
}) {
  const digest = sha256Hex(
    Buffer.from(canonicalJson(challengeMaterial(args)), "utf8"),
  );
  return Object.freeze({
    challenge_sha256: "sha256:" + digest,
    challenge_id: "voidwlrc1_" + digest,
  });
}

function bytesFromJournal(input: string | Buffer): Buffer {
  const bytes = Buffer.isBuffer(input)
    ? Buffer.from(input)
    : Buffer.from(String(input ?? ""), "utf8");
  if (bytes.length > MAX_JOURNAL_BYTES) {
    fail("witness_live_read_replay_journal_too_large");
  }
  return bytes;
}

function parseEvent(line: string): WitnessLiveReadReplayEventV1 {
  let raw: unknown;
  try {
    raw = JSON.parse(line);
  } catch {
    fail("witness_live_read_replay_event_json_invalid");
  }
  const record = exactObject(
    raw,
    EVENT_KEYS,
    "witness_live_read_replay_event_shape_invalid",
  );
  if (
    record.marker !==
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EVENT_V1 ||
    record.version !== 1
  ) {
    fail("witness_live_read_replay_event_marker_invalid");
  }
  const sequence = safeInt(
    record.sequence,
    1,
    Number.MAX_SAFE_INTEGER,
    "witness_live_read_replay_sequence_invalid",
  );
  const generation = safeInt(
    record.generation,
    1,
    Number.MAX_SAFE_INTEGER,
    "witness_live_read_replay_generation_invalid",
  );
  if (
    record.state !== "issued" &&
    record.state !== "consumed" &&
    record.state !== "abandoned"
  ) {
    fail("witness_live_read_replay_state_invalid");
  }
  const state = record.state as ReplayStateNameV1;
  const entropySha = shaField(
    record.entropy_sha256,
    "witness_live_read_replay_entropy_invalid",
  );
  const challengeSha = shaField(
    record.challenge_sha256,
    "witness_live_read_replay_challenge_invalid",
  );
  if (
    typeof record.challenge_id !== "string" ||
    !CHALLENGE_ID.test(record.challenge_id)
  ) {
    fail("witness_live_read_replay_challenge_id_invalid");
  }
  const issuedAt = safeInt(
    record.issued_at_ms,
    1,
    Number.MAX_SAFE_INTEGER,
    "witness_live_read_replay_issued_time_invalid",
  );
  const expiresAt = safeInt(
    record.expires_at_ms,
    issuedAt + 1,
    Number.MAX_SAFE_INTEGER,
    "witness_live_read_replay_expiry_invalid",
  );
  if (expiresAt - issuedAt > MAX_CHALLENGE_TTL_MS) {
    fail("witness_live_read_replay_ttl_invalid");
  }
  const previousEventSha = nullableShaField(
    record.previous_event_sha256,
    "witness_live_read_replay_previous_event_invalid",
  );

  let requestId: string | null = null;
  let responseSha: string | null = null;
  let terminalAt: number | null = null;
  if (state === "consumed") {
    requestId = requestField(
      record.request_id,
      "witness_live_read_replay_request_id_invalid",
    );
    responseSha = shaField(
      record.response_sha256,
      "witness_live_read_replay_response_invalid",
    );
    terminalAt = safeInt(
      record.terminal_at_ms,
      issuedAt,
      expiresAt,
      "witness_live_read_replay_terminal_time_invalid",
    );
  } else if (state === "abandoned") {
    if (record.request_id !== null || record.response_sha256 !== null) {
      fail("witness_live_read_replay_abandon_payload_invalid");
    }
    terminalAt = safeInt(
      record.terminal_at_ms,
      issuedAt,
      Number.MAX_SAFE_INTEGER,
      "witness_live_read_replay_terminal_time_invalid",
    );
  } else if (
    record.request_id !== null ||
    record.response_sha256 !== null ||
    record.terminal_at_ms !== null
  ) {
    fail("witness_live_read_replay_issued_payload_invalid");
  }

  const body = Object.freeze({
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EVENT_V1,
    version: 1 as const,
    sequence,
    previous_event_sha256: previousEventSha,
    generation,
    state,
    entropy_sha256: entropySha,
    challenge_sha256: challengeSha,
    challenge_id: record.challenge_id,
    issued_at_ms: issuedAt,
    expires_at_ms: expiresAt,
    request_id: requestId,
    response_sha256: responseSha,
    terminal_at_ms: terminalAt,
  });
  const expected = eventWithDigest(body);
  if (record.event_sha256 !== expected.event_sha256) {
    fail("witness_live_read_replay_event_digest_invalid");
  }
  if (line !== canonicalJson(expected)) {
    fail("witness_live_read_replay_event_serialization_invalid");
  }
  return expected;
}

function classifyOrThrow(input: string | Buffer) {
  const bytes = bytesFromJournal(input);
  if (bytes.length === 0) {
    return Object.freeze({
      sequence: 0,
      generation: 0,
      tip_event_sha256: null as string | null,
      pending: false,
      pending_event: null as WitnessLiveReadReplayEventV1 | null,
      last_terminal_event: null as WitnessLiveReadReplayEventV1 | null,
      ready_for_issue: true,
      event_count: 0,
      journal_sha256: sha256Id(bytes),
    });
  }
  const text = bytes.toString("utf8");
  if (!text.endsWith("\n")) {
    fail("witness_live_read_replay_journal_newline_invalid");
  }
  const lines = text.slice(0, -1).split("\n");
  if (
    lines.length < 1 ||
    lines.length > MAX_EVENTS ||
    lines.some((line) => line.length === 0)
  ) {
    fail("witness_live_read_replay_journal_lines_invalid");
  }

  let previous: WitnessLiveReadReplayEventV1 | null = null;
  let pending: WitnessLiveReadReplayEventV1 | null = null;
  let lastTerminal: WitnessLiveReadReplayEventV1 | null = null;
  const challenges = new Set<string>();

  for (let index = 0; index < lines.length; index += 1) {
    const event = parseEvent(lines[index]);
    if (event.sequence !== index + 1) {
      fail("witness_live_read_replay_sequence_discontinuous");
    }
    if (
      event.previous_event_sha256 !==
      (previous ? previous.event_sha256 : null)
    ) {
      fail("witness_live_read_replay_chain_invalid");
    }

    if (!previous) {
      if (event.state !== "issued" || event.generation !== 1) {
        fail("witness_live_read_replay_genesis_invalid");
      }
    } else if (previous.state === "issued") {
      if (
        event.state === "issued" ||
        event.generation !== previous.generation ||
        event.entropy_sha256 !== previous.entropy_sha256 ||
        event.challenge_sha256 !== previous.challenge_sha256 ||
        event.challenge_id !== previous.challenge_id ||
        event.issued_at_ms !== previous.issued_at_ms ||
        event.expires_at_ms !== previous.expires_at_ms
      ) {
        fail("witness_live_read_replay_terminal_transition_invalid");
      }
    } else {
      if (
        event.state !== "issued" ||
        event.generation !== previous.generation + 1 ||
        event.issued_at_ms <
          (previous.terminal_at_ms ?? previous.issued_at_ms)
      ) {
        fail("witness_live_read_replay_next_issue_invalid");
      }
    }

    if (event.state === "issued") {
      const derived = deriveChallenge({
        generation: event.generation,
        previous_event_sha256: event.previous_event_sha256,
        entropy_sha256: event.entropy_sha256,
        issued_at_ms: event.issued_at_ms,
        expires_at_ms: event.expires_at_ms,
      });
      if (
        event.challenge_sha256 !== derived.challenge_sha256 ||
        event.challenge_id !== derived.challenge_id ||
        challenges.has(event.challenge_sha256)
      ) {
        fail("witness_live_read_replay_challenge_binding_invalid");
      }
      challenges.add(event.challenge_sha256);
      pending = event;
    } else {
      if (
        !pending ||
        pending.generation !== event.generation ||
        pending.challenge_sha256 !== event.challenge_sha256
      ) {
        fail("witness_live_read_replay_terminal_without_pending");
      }
      pending = null;
      lastTerminal = event;
    }
    previous = event;
  }

  return Object.freeze({
    sequence: previous?.sequence ?? 0,
    generation: previous?.generation ?? 0,
    tip_event_sha256: previous?.event_sha256 ?? null,
    pending: Boolean(pending),
    pending_event: pending,
    last_terminal_event: lastTerminal,
    ready_for_issue: !pending,
    event_count: lines.length,
    journal_sha256: sha256Id(bytes),
  });
}

function appendLine(
  journal: string | Buffer,
  event: WitnessLiveReadReplayEventV1,
) {
  const bytes = bytesFromJournal(journal);
  const line = Buffer.from(canonicalJson(event) + "\n", "utf8");
  if (bytes.length + line.length > MAX_JOURNAL_BYTES) {
    fail("witness_live_read_replay_journal_too_large");
  }
  return Object.freeze({
    event,
    event_jsonl_line: line.toString("utf8"),
    next_journal_jsonl: Buffer.concat([bytes, line]).toString("utf8"),
  });
}

export function classifyBuyVoidAllocationCustodyWitnessLiveReadReplayStateV1(
  journalJsonl: string | Buffer,
) {
  try {
    const state = classifyOrThrow(journalJsonl);
    return Object.freeze({
      ok: true as const,
      status: state.pending
        ? ("challenge_pending" as const)
        : ("idle" as const),
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_STATE_V1,
      version: 1 as const,
      sequence: state.sequence,
      generation: state.generation,
      tip_event_sha256: state.tip_event_sha256,
      pending: state.pending,
      pending_challenge_sha256:
        state.pending_event?.challenge_sha256 ?? null,
      pending_challenge_id:
        state.pending_event?.challenge_id ?? null,
      pending_expires_at_ms:
        state.pending_event?.expires_at_ms ?? null,
      last_terminal_state:
        state.last_terminal_event?.state ?? null,
      ready_for_issue: state.ready_for_issue,
      event_count: state.event_count,
      journal_sha256: state.journal_sha256,
      operation_performed: false as const,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "witness_live_read_replay_state_invalid",
    );
  }
}

export function planBuyVoidAllocationCustodyWitnessLiveReadChallengeIssueV1(
  input: {
    journal_jsonl: string | Buffer;
    entropy_sha256: unknown;
    issued_at_ms: unknown;
    expires_at_ms: unknown;
  },
) {
  try {
    const state = classifyOrThrow(input.journal_jsonl);
    if (!state.ready_for_issue) {
      fail("witness_live_read_replay_challenge_already_pending");
    }
    if (state.generation >= Number.MAX_SAFE_INTEGER) {
      fail("witness_live_read_replay_generation_exhausted");
    }
    const entropySha = shaField(
      input.entropy_sha256,
      "witness_live_read_replay_entropy_invalid",
    );
    const issuedAt = safeInt(
      input.issued_at_ms,
      1,
      Number.MAX_SAFE_INTEGER - 1,
      "witness_live_read_replay_issued_time_invalid",
    );
    const expiresAt = safeInt(
      input.expires_at_ms,
      issuedAt + 1,
      Number.MAX_SAFE_INTEGER,
      "witness_live_read_replay_expiry_invalid",
    );
    if (expiresAt - issuedAt > MAX_CHALLENGE_TTL_MS) {
      fail("witness_live_read_replay_ttl_invalid");
    }
    if (
      state.last_terminal_event &&
      issuedAt < state.last_terminal_event.terminal_at_ms!
    ) {
      fail("witness_live_read_replay_time_regression");
    }

    const generation = state.generation + 1;
    const derived = deriveChallenge({
      generation,
      previous_event_sha256: state.tip_event_sha256,
      entropy_sha256: entropySha,
      issued_at_ms: issuedAt,
      expires_at_ms: expiresAt,
    });
    const event = eventWithDigest({
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EVENT_V1,
      version: 1,
      sequence: state.sequence + 1,
      previous_event_sha256: state.tip_event_sha256,
      generation,
      state: "issued",
      entropy_sha256: entropySha,
      challenge_sha256: derived.challenge_sha256,
      challenge_id: derived.challenge_id,
      issued_at_ms: issuedAt,
      expires_at_ms: expiresAt,
      request_id: null,
      response_sha256: null,
      terminal_at_ms: null,
    });
    const appended = appendLine(input.journal_jsonl, event);
    return Object.freeze({
      ok: true as const,
      status: "challenge_issue_planned" as const,
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_STATE_V1,
      version: 1 as const,
      generation,
      challenge_sha256: event.challenge_sha256,
      challenge_id: event.challenge_id,
      event: appended.event,
      event_jsonl_line: appended.event_jsonl_line,
      next_journal_jsonl: appended.next_journal_jsonl,
      operation_performed: false as const,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "witness_live_read_replay_issue_failed",
    );
  }
}

export function planBuyVoidAllocationCustodyWitnessLiveReadChallengeTerminalV1(
  input: {
    journal_jsonl: string | Buffer;
    outcome: unknown;
    request_id?: unknown;
    response_sha256?: unknown;
    terminal_at_ms: unknown;
  },
) {
  try {
    const state = classifyOrThrow(input.journal_jsonl);
    const pending = state.pending_event;
    if (!pending) {
      fail("witness_live_read_replay_no_pending_challenge");
    }
    if (input.outcome !== "consumed" && input.outcome !== "abandoned") {
      fail("witness_live_read_replay_terminal_outcome_invalid");
    }
    const terminalAt = safeInt(
      input.terminal_at_ms,
      pending.issued_at_ms,
      Number.MAX_SAFE_INTEGER,
      "witness_live_read_replay_terminal_time_invalid",
    );
    let requestId: string | null = null;
    let responseSha: string | null = null;
    if (input.outcome === "consumed") {
      if (terminalAt > pending.expires_at_ms) {
        fail("witness_live_read_replay_consume_after_expiry");
      }
      requestId = requestField(
        input.request_id,
        "witness_live_read_replay_request_id_invalid",
      );
      responseSha = shaField(
        input.response_sha256,
        "witness_live_read_replay_response_invalid",
      );
    } else if (
      input.request_id !== undefined ||
      input.response_sha256 !== undefined
    ) {
      fail("witness_live_read_replay_abandon_payload_invalid");
    }

    const event = eventWithDigest({
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EVENT_V1,
      version: 1,
      sequence: state.sequence + 1,
      previous_event_sha256: state.tip_event_sha256,
      generation: pending.generation,
      state: input.outcome,
      entropy_sha256: pending.entropy_sha256,
      challenge_sha256: pending.challenge_sha256,
      challenge_id: pending.challenge_id,
      issued_at_ms: pending.issued_at_ms,
      expires_at_ms: pending.expires_at_ms,
      request_id: requestId,
      response_sha256: responseSha,
      terminal_at_ms: terminalAt,
    });
    const appended = appendLine(input.journal_jsonl, event);
    return Object.freeze({
      ok: true as const,
      status:
        input.outcome === "consumed"
          ? ("challenge_consumption_planned" as const)
          : ("challenge_abandonment_planned" as const),
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_STATE_V1,
      version: 1 as const,
      generation: pending.generation,
      challenge_sha256: pending.challenge_sha256,
      challenge_id: pending.challenge_id,
      event: appended.event,
      event_jsonl_line: appended.event_jsonl_line,
      next_journal_jsonl: appended.next_journal_jsonl,
      operation_performed: false as const,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "witness_live_read_replay_terminal_failed",
    );
  }
}
