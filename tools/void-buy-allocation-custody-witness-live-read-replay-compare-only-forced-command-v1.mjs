#!/usr/bin/env node
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { addAbortSignal } from "node:stream";
import path from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPARE_ONLY_FORCED_COMMAND_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPARE_ONLY_FORCED_COMMAND_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPARE_ONLY_FORCED_COMMAND_AUTHORITY_V1 =
  Object.freeze({
    source_only_forced_command: true,
    only_compare_operation_allowed: true,
    append_operation_forbidden: true,
    read_operation_forbidden: true,
    canonical_request_required: true,
    original_remote_command_forbidden: true,
    no_caller_selected_paths_or_command: true,
    fixed_child_handler_and_config: true,
    fixed_child_environment: true,
    fixed_ssh_user_identity_required: true,
    bounded_stdin_stdout_and_child_duration: true,
    child_response_rebound_to_request: true,
    no_ssh_shell_or_subsystem: true,
    no_wallet_or_signer_capability: true,
    source_filesystem_write: false,
    generic_witness_write: false,
    replay_mutation: false,
    key_provisioning: false,
    authorized_keys_mutation: false,
    sshd_mutation: false,
    live_nimo_installed: false,
    server_compare_only_authorization_proven: false,
    trusted_transport_authenticated: false,
    runtime_guard_integration: false,
    unguarded_entrypoints_retired: false,
    rollback_resistance_proven: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    production_gate_ready: false,
    funds_movement: false,
  });

const WRAPPER_MARKER = "VOID_BUY_VOID_REPLAY_COMPARE_ONLY_FORCED_COMMAND_V1";
const CHILD_MARKER = "VOID_BUY_VOID_REPLAY_EXTERNAL_WITNESS_FORCED_COMMAND_V1";
const CHILD_BINARY = "/usr/bin/node";
const CHILD_HANDLER =
  "/usr/local/libexec/void-replay-witness-v1/void/void-buy-allocation-custody-witness-live-read-replay-external-forced-command-v1.mjs";
const CHILD_CONFIG =
  "/etc/void/buy-void-allocation-custody-witness-live-read-replay-external-forced-command-v1.json";
const REQUEST_SCHEMA =
  "void_buy_void_allocation_custody_witness_live_read_replay_external_forced_command_request_v1";
const REQUEST_MARKER =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_FORCED_COMMAND_REQUEST_V1";
const RESPONSE_SCHEMA =
  "void_buy_void_allocation_custody_witness_live_read_replay_external_forced_command_compare_response_v1";
const RESPONSE_MARKER =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_FORCED_COMMAND_COMPARE_RESPONSE_V1";

const MAX_REQUEST_BYTES = 12 * 1024 * 1024;
const MAX_JOURNAL_BYTES = 8 * 1024 * 1024;
const MAX_HIGH_WATER_BYTES = 16 * 1024;
const MAX_RESPONSE_BYTES = 64 * 1024;
const CHILD_TIMEOUT_MS = 10_000;
// Total ingress deadline: the child timeout starts only after SSH stdin closes.
const MAX_REQUEST_READ_MS = 20_000;
const NIMO_UID = 997;
const NIMO_GID = 984;
const REQUEST_ID = /^voidwlrwreq1_[0-9a-f]{64}$/u;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u;

const REQUEST_KEYS = Object.freeze([
  "schema", "marker", "version", "operation", "request_id",
  "source_journal_json_base64", "source_high_water_json_base64",
]);
const RESPONSE_KEYS = Object.freeze([
  "schema", "marker", "version", "request_id", "comparison_status",
  "initialized", "witness_sha256", "witness_bytes", "event_count",
  "tip_event_sha256", "witnessed_replay_sequence", "local_replay_sequence",
  "exact_live_match", "external_witness_update_required",
  "rollback_regression_candidate", "rollback_regression_detected",
  "mutation_admission_allowed", "operation_performed", "recovered_intent",
  "server_controlled_witness_observed", "external_transport_authenticated",
  "external_witness_storage_proven", "production_gate_ready", "funds_movement",
]);

function fail(code) {
  throw new Error("witness_replay_compare_only_forced_command_" + code);
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort()
      .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
      .join(",") + "}";
  }
  fail("noncanonical_value");
}

function exactObject(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) fail(code);
  return value;
}

function canonicalLine(raw, maxBytes, code) {
  if (!Buffer.isBuffer(raw) || raw.length < 2 || raw.length > maxBytes) {
    fail(code);
  }
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(raw);
  } catch {
    fail(code);
  }
  if (!text.endsWith("\n") || text.slice(0, -1).includes("\n")) fail(code);
  let parsed;
  try {
    parsed = JSON.parse(text.slice(0, -1));
  } catch {
    fail(code);
  }
  if (canonicalJson(parsed) + "\n" !== text) fail(code);
  return parsed;
}

function decodedBase64(value, maxBytes, allowEmpty, code) {
  if (
    typeof value !== "string" ||
    value.length > 4 * Math.ceil(maxBytes / 3) ||
    !BASE64.test(value)
  ) fail(code);
  const bytes = Buffer.from(value, "base64");
  if (
    bytes.length > maxBytes ||
    (!allowEmpty && bytes.length === 0) ||
    bytes.toString("base64") !== value
  ) fail(code);
  return bytes;
}

function positiveInt(value, min, max, code) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min || value > max
  ) fail(code);
  return value;
}

function parseCompareRequest(input) {
  const raw = exactObject(
    canonicalLine(input, MAX_REQUEST_BYTES, "request_invalid"),
    REQUEST_KEYS,
    "request_shape_invalid",
  );
  if (
    raw.schema !== REQUEST_SCHEMA ||
    raw.marker !== REQUEST_MARKER ||
    raw.version !== 1 ||
    typeof raw.request_id !== "string" ||
    !REQUEST_ID.test(raw.request_id)
  ) fail("request_identity_invalid");
  // This check is performed before invoking the append-capable child.
  if (raw.operation !== "compare") fail("noncompare_operation_forbidden");
  decodedBase64(
    raw.source_journal_json_base64, MAX_JOURNAL_BYTES, true,
    "journal_payload_invalid",
  );
  decodedBase64(
    raw.source_high_water_json_base64, MAX_HIGH_WATER_BYTES, false,
    "high_water_payload_invalid",
  );
  return Object.freeze({
    request_id: raw.request_id,
  });
}

function verifyCompareResponse(bytes, requestId) {
  const raw = exactObject(
    canonicalLine(bytes, MAX_RESPONSE_BYTES, "response_invalid"),
    RESPONSE_KEYS,
    "response_shape_invalid",
  );
  if (
    raw.schema !== RESPONSE_SCHEMA ||
    raw.marker !== RESPONSE_MARKER ||
    raw.version !== 1 ||
    raw.request_id !== requestId ||
    raw.initialized !== true ||
    typeof raw.witness_sha256 !== "string" ||
    !SHA256_ID.test(raw.witness_sha256) ||
    typeof raw.tip_event_sha256 !== "string" ||
    !SHA256_ID.test(raw.tip_event_sha256) ||
    raw.server_controlled_witness_observed !== true ||
    raw.operation_performed !== false ||
    raw.recovered_intent !== false ||
    raw.external_transport_authenticated !== false ||
    raw.external_witness_storage_proven !== false ||
    raw.production_gate_ready !== false ||
    raw.funds_movement !== false
  ) fail("response_boundary_invalid");

  const sequence = positiveInt(
    raw.witnessed_replay_sequence, 0, Number.MAX_SAFE_INTEGER - 1,
    "witness_sequence_invalid",
  );
  const localSequence = positiveInt(
    raw.local_replay_sequence, 0, Number.MAX_SAFE_INTEGER - 1,
    "local_sequence_invalid",
  );
  const count = positiveInt(
    raw.event_count, 1, 8193, "witness_event_count_invalid",
  );
  positiveInt(raw.witness_bytes, count, 8193 * 4096, "witness_size_invalid");
  if (sequence + 1 !== count) fail("witness_history_invalid");
  if (
    raw.comparison_status === "matched" &&
    sequence === localSequence &&
    raw.exact_live_match === true &&
    raw.external_witness_update_required === false &&
    raw.rollback_regression_candidate === false &&
    raw.rollback_regression_detected === false &&
    raw.mutation_admission_allowed === true
  ) return raw;
  if (
    raw.comparison_status === "local_ahead" &&
    sequence < localSequence &&
    raw.exact_live_match === false &&
    raw.external_witness_update_required === true &&
    raw.rollback_regression_candidate === false &&
    raw.rollback_regression_detected === false &&
    raw.mutation_admission_allowed === false
  ) return raw;
  if (
    raw.comparison_status === "witness_ahead" &&
    sequence > localSequence &&
    raw.exact_live_match === false &&
    raw.external_witness_update_required === false &&
    raw.rollback_regression_candidate === true &&
    raw.rollback_regression_detected === false &&
    raw.mutation_admission_allowed === false
  ) return raw;
  fail("response_status_invalid");
}

function requireForcedCommandContext(input) {
  if (
    input.marker !== "1" ||
    input.original_command !== "" ||
    input.argv.length !== 0 ||
    input.uid !== NIMO_UID ||
    input.gid !== NIMO_GID
  ) fail("execution_identity_invalid");
}

function childArguments() {
  return Object.freeze([
    CHILD_HANDLER,
    "--config=" + CHILD_CONFIG,
  ]);
}

function childOptions(request) {
  return Object.freeze({
    input: Buffer.from(request),
    timeout: CHILD_TIMEOUT_MS,
    maxBuffer: MAX_RESPONSE_BYTES,
    encoding: null,
    windowsHide: true,
    env: Object.freeze({
      PATH: "/usr/bin:/bin",
      LANG: "C",
      LC_ALL: "C",
      HOME: "/var/lib/voidwitness",
      [CHILD_MARKER]: "1",
      SSH_ORIGINAL_COMMAND: "",
    }),
  });
}

function compareOnlyUnderMockableRunner(input, runner) {
  const request = Buffer.isBuffer(input) ? Buffer.from(input) : null;
  const checked = parseCompareRequest(request);
  const result = runner(CHILD_BINARY, [...childArguments()], childOptions(request));
  if (
    !result ||
    result.error ||
    result.signal !== null ||
    result.status !== 0 ||
    !Buffer.isBuffer(result.stdout) ||
    !Buffer.isBuffer(result.stderr) ||
    result.stderr.length !== 0
  ) fail("child_execution_failed");

  const response = Buffer.from(result.stdout);
  verifyCompareResponse(response, checked.request_id);
  return Object.freeze({
    response_json: response,
    operation_performed: false,
    replay_mutation: false,
    witness_mutation: false,
    funds_movement: false,
  });
}

/**
 * Source-only seam for the synthetic proof. A mock runner confers no SSH
 * authentication, witness authority or production enforcement.
 */
export function testOnlyHandleBuyVoidReplayCompareOnlyForcedCommandV1(input, runner) {
  return compareOnlyUnderMockableRunner(input, runner);
}

export function testOnlyAssertBuyVoidReplayCompareOnlyForcedCommandContextV1(input) {
  requireForcedCommandContext(input);
  return true;
}

async function readOneRequest(stream, readTimeoutMs = MAX_REQUEST_READ_MS) {
  if (
    !stream ||
    typeof stream[Symbol.asyncIterator] !== "function" ||
    !Number.isSafeInteger(readTimeoutMs) ||
    readTimeoutMs < 1 ||
    readTimeoutMs > MAX_REQUEST_READ_MS
  ) fail("request_reader_invalid");

  // The child execution timeout alone does not constrain a client that
  // never sends EOF. Abort destroys the Readable and wakes a pending read.
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), readTimeoutMs);
  try {
    addAbortSignal(controller.signal, stream);
    const chunks = [];
    let total = 0;
    try {
      for await (const chunk of stream) {
        const bytes = Buffer.from(chunk);
        total += bytes.length;
        if (total > MAX_REQUEST_BYTES) fail("request_too_large");
        chunks.push(bytes);
      }
    } catch (error) {
      if (controller.signal.aborted) fail("request_read_timeout");
      throw error;
    }
    if (controller.signal.aborted) fail("request_read_timeout");
    return Buffer.concat(chunks);
  } finally {
    clearTimeout(deadline);
  }
}

async function compareOnlyFromStream(
  stream, runner, readTimeoutMs = MAX_REQUEST_READ_MS,
) {
  const input = await readOneRequest(stream, readTimeoutMs);
  return compareOnlyUnderMockableRunner(input, runner);
}

/** Source-only stream seam for slow/no-EOF adversarial proofs. */
export async function testOnlyHandleBuyVoidReplayCompareOnlyForcedCommandStreamV1(
  stream, runner, readTimeoutMs,
) {
  return compareOnlyFromStream(stream, runner, readTimeoutMs);
}

async function main() {
  requireForcedCommandContext({
    marker: process.env[WRAPPER_MARKER],
    original_command: String(process.env.SSH_ORIGINAL_COMMAND ?? ""),
    argv: process.argv.slice(2),
    uid: typeof process.geteuid === "function" ? process.geteuid() : -1,
    gid: typeof process.getegid === "function" ? process.getegid() : -1,
  });
  const result = await compareOnlyFromStream(
    process.stdin,
    (command, args, options) => spawnSync(command, args, options),
  );
  process.stdout.write(result.response_json);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main().catch((error) => {
    process.stderr.write(
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPARE_ONLY_FORCED_COMMAND_V1 +
      "_HOLD " + String(error?.message || error) + "\n",
    );
    process.exitCode = 3;
  });
}
