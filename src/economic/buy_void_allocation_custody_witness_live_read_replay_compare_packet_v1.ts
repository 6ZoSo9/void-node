import {
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1,
} from "./buy_void_allocation_custody_witness_live_read_replay_high_water_v1.js";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPARE_PACKET_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPARE_PACKET_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPARE_PACKET_AUTHORITY_V1 =
  Object.freeze({
    source_only_packet_classifier: true,
    exact_request_response_schema_required: true,
    canonical_single_line_json_required: true,
    request_id_binding_required: true,
    exact_local_journal_high_water_bytes_required: true,
    canonical_local_high_water_binding_required: true,
    canonical_remote_compare_response_required: true,
    matched_only_eligible: true,
    witness_ahead_must_hold: true,
    local_ahead_must_hold: true,
    no_mutation_result_required: true,
    no_intent_recovery_result_required: true,
    protected_writer_guard_eligibility: true,
    authenticated_transport_proven: false,
    trusted_compare_implementation_proven: false,
    host_key_pin_enforced: false,
    actual_mutation_path_exclusivity_proven: false,
    runtime_integration: false,
    rollback_resistance_proven: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    production_gate_ready: false,
    funds_movement: false,
  });

const REQUEST_SCHEMA =
  "void_buy_void_allocation_custody_witness_live_read_replay_external_forced_command_request_v1";
const REQUEST_MARKER =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_FORCED_COMMAND_REQUEST_V1";
const RESPONSE_SCHEMA =
  "void_buy_void_allocation_custody_witness_live_read_replay_external_forced_command_compare_response_v1";
const RESPONSE_MARKER =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_FORCED_COMMAND_COMPARE_RESPONSE_V1";
const REQUEST_ID = /^voidwlrwreq1_[0-9a-f]{64}$/u;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;

function hold(reason: string) {
  return Object.freeze({
    ok: false as const,
    status: "held" as const,
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPARE_PACKET_V1,
    version: 1 as const,
    reason,
    packet_eligible: false as const,
    authenticated_transport_proven: false as const,
    protected_replay_mutation_admitted: false as const,
    production_gate_ready: false as const,
    funds_movement: false as const,
    authority:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPARE_PACKET_AUTHORITY_V1,
  });
}

function fail(reason: string): never {
  throw new Error(reason);
}

function json(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(json).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(obj)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + json(obj[key]))
        .join(",") +
      "}"
    );
  }
  fail("witness_replay_compare_packet_noncanonical_value");
}

function exact(
  input: unknown,
  keys: readonly string[],
  reason: string,
): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    fail(reason);
  }
  const obj = input as Record<string, unknown>;
  const actual = Object.keys(obj).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, i) => key !== expected[i])
  ) {
    fail(reason);
  }
  return obj;
}

function bytes(value: string | Buffer, max: number, reason: string): Buffer {
  if (typeof value !== "string" && !Buffer.isBuffer(value)) fail(reason);
  const b = Buffer.isBuffer(value) ? Buffer.from(value) : Buffer.from(value, "utf8");
  if (b.length < 1 || b.length > max) fail(reason);
  return b;
}

function parseLine(value: string | Buffer, max: number, reason: string) {
  const b = bytes(value, max, reason);
  let line: string;
  try {
    line = new TextDecoder("utf-8", { fatal: true }).decode(b);
  } catch {
    fail(reason);
  }
  if (!line.endsWith("\n") || line.slice(0, -1).includes("\n")) {
    fail(reason);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(line.slice(0, -1));
  } catch {
    fail(reason);
  }
  if (json(parsed) + "\n" !== line) fail(reason);
  return parsed;
}

function base64(value: unknown, max: number, reason: string): Buffer {
  if (
    typeof value !== "string" ||
    value.length > Math.ceil(max / 3) * 4 + 4 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)
  ) {
    fail(reason);
  }
  const decoded = Buffer.from(value, "base64");
  if (decoded.length > max || decoded.toString("base64") !== value) {
    fail(reason);
  }
  return decoded;
}

function num(value: unknown, min: number, max: number, reason: string): number {
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

export function classifyBuyVoidAllocationCustodyWitnessLiveReadReplayComparePacketV1(
  input: {
    current_journal_jsonl: string | Buffer;
    current_high_water_json: string | Buffer;
    request_json: string | Buffer;
    response_json: string | Buffer;
  },
) {
  try {
    const local =
      classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1({
        journal_jsonl: input.current_journal_jsonl,
        high_water_json: input.current_high_water_json,
      });
    if (local.ok !== true) {
      fail("witness_replay_compare_packet_local_" + String(local.reason || "invalid"));
    }

    const j = Buffer.isBuffer(input.current_journal_jsonl)
      ? Buffer.from(input.current_journal_jsonl)
      : Buffer.from(input.current_journal_jsonl, "utf8");
    const h = Buffer.isBuffer(input.current_high_water_json)
      ? Buffer.from(input.current_high_water_json)
      : Buffer.from(input.current_high_water_json, "utf8");

    const request = exact(
      parseLine(input.request_json, 12 * 1024 * 1024, "witness_replay_compare_packet_request_invalid"),
      [
        "schema", "marker", "version", "operation", "request_id",
        "source_journal_json_base64", "source_high_water_json_base64",
      ],
      "witness_replay_compare_packet_request_shape_invalid",
    );
    if (
      request.schema !== REQUEST_SCHEMA ||
      request.marker !== REQUEST_MARKER ||
      request.version !== 1 ||
      request.operation !== "compare" ||
      typeof request.request_id !== "string" ||
      !REQUEST_ID.test(request.request_id)
    ) {
      fail("witness_replay_compare_packet_request_identity_invalid");
    }

    const decodedJ = base64(
      request.source_journal_json_base64, 8 * 1024 * 1024,
      "witness_replay_compare_packet_journal_base64_invalid",
    );
    const decodedH = base64(
      request.source_high_water_json_base64, 16 * 1024,
      "witness_replay_compare_packet_high_water_base64_invalid",
    );
    if (!decodedJ.equals(j) || !decodedH.equals(h)) {
      fail("witness_replay_compare_packet_request_not_current_state");
    }

    const response = exact(
      parseLine(input.response_json, 64 * 1024, "witness_replay_compare_packet_response_invalid"),
      [
        "schema", "marker", "version", "request_id", "comparison_status",
        "initialized", "witness_sha256", "witness_bytes", "event_count",
        "tip_event_sha256", "witnessed_replay_sequence", "local_replay_sequence",
        "exact_live_match", "external_witness_update_required",
        "rollback_regression_candidate", "rollback_regression_detected",
        "mutation_admission_allowed", "operation_performed", "recovered_intent",
        "server_controlled_witness_observed", "external_transport_authenticated",
        "external_witness_storage_proven", "production_gate_ready", "funds_movement",
      ],
      "witness_replay_compare_packet_response_shape_invalid",
    );

    if (
      response.schema !== RESPONSE_SCHEMA ||
      response.marker !== RESPONSE_MARKER ||
      response.version !== 1 ||
      response.request_id !== request.request_id ||
      response.initialized !== true ||
      typeof response.witness_sha256 !== "string" ||
      !SHA256_ID.test(response.witness_sha256) ||
      typeof response.tip_event_sha256 !== "string" ||
      !SHA256_ID.test(response.tip_event_sha256) ||
      response.server_controlled_witness_observed !== true ||
      response.operation_performed !== false ||
      response.recovered_intent !== false ||
      response.external_transport_authenticated !== false ||
      response.external_witness_storage_proven !== false ||
      response.production_gate_ready !== false ||
      response.funds_movement !== false
    ) {
      fail("witness_replay_compare_packet_response_boundary_invalid");
    }

    const seq = num(
      response.witnessed_replay_sequence,
      0, Number.MAX_SAFE_INTEGER - 1,
      "witness_replay_compare_packet_sequence_invalid",
    );
    const count = num(
      response.event_count,
      1, 8193,
      "witness_replay_compare_packet_event_count_invalid",
    );
    num(
      response.witness_bytes,
      count, 8193 * 4096,
      "witness_replay_compare_packet_witness_size_invalid",
    );
    num(
      response.local_replay_sequence,
      0, Number.MAX_SAFE_INTEGER - 1,
      "witness_replay_compare_packet_local_sequence_invalid",
    );

    if (
      seq + 1 !== count ||
      response.local_replay_sequence !== local.high_water.sequence
    ) {
      fail("witness_replay_compare_packet_replay_lineage_invalid");
    }
    if (
      response.comparison_status !== "matched" ||
      response.exact_live_match !== true ||
      response.mutation_admission_allowed !== true ||
      response.external_witness_update_required !== false ||
      response.rollback_regression_candidate !== false ||
      response.rollback_regression_detected !== false ||
      seq !== local.high_water.sequence
    ) {
      fail("witness_replay_compare_packet_not_exact_match");
    }

    return Object.freeze({
      ok: true as const,
      status: "source_compare_packet_eligible" as const,
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPARE_PACKET_V1,
      version: 1 as const,
      request_id: request.request_id,
      local_replay_sequence: local.high_water.sequence,
      high_water_sha256: local.high_water_sha256,
      witness_sha256: response.witness_sha256,
      witness_tip_event_sha256: response.tip_event_sha256,
      witness_event_count: count,
      packet_eligible: true as const,
      authenticated_transport_proven: false as const,
      protected_replay_mutation_admitted: false as const,
      production_gate_ready: false as const,
      funds_movement: false as const,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPARE_PACKET_AUTHORITY_V1,
    });
  } catch (error) {
    return hold(
      error instanceof Error
        ? error.message
        : "witness_replay_compare_packet_classification_failed",
    );
  }
}
