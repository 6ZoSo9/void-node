#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

export const VOID_ECONOMIC_SPONSORED_HOST_TIME_SYNC_EVIDENCE_V1 =
  "VOID_ECONOMIC_SPONSORED_HOST_TIME_SYNC_EVIDENCE_V1";
export const VOID_ECONOMIC_SPONSORED_HOST_TIME_SYNC_EVIDENCE_SCHEMA_V1 =
  "void_economic_sponsored_host_time_sync_evidence_v1";
export const VOID_ECONOMIC_SPONSORED_HOST_TIME_SYNC_EVIDENCE_ID_PREFIX_V1 =
  "voideshtse1_";

export const VOID_ECONOMIC_SPONSORED_HOST_TIME_SYNC_EVIDENCE_AUTHORITY_V1 =
  Object.freeze({
    source_only_evidence: true,
    fixed_boot_id_source: true,
    fixed_boot_uptime_source: true,
    fixed_time_sync_query: true,
    synchronized_wall_bracket_required: true,
    boot_identity_stability_required: true,
    boot_relative_monotonic_bracket_required: true,
    capture_span_bounded: true,
    production_evidence_requires_fixed_collector: true,
    fixed_source_nofollow_bounded_reads: true,
    sanitized_time_sync_environment: true,
    caller_timestamp_input: false,
    caller_environment_override: false,
    caller_path_input: false,
    caller_command_input: false,
    fallback_source: false,
    service_mutation: false,
    clock_mutation: false,
    restart_continuation_authorized: false,
    cross_process_restart_continuity_proven: false,
    cross_boot_restart_continuity_proven: false,
    trusted_clock_runtime_authority: false,
    runtime_route_active: false,
    runtime_enforcement_verified: false,
    gas_sponsorship_performed: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    market_activation: false,
    public_presale_activation: false,
    inventory_mutation: false,
    treasury_or_liquidity_movement: false,
    funds_movement: false,
  });

const BOOT_ID_PATH = "/proc/sys/kernel/random/boot_id";
const UPTIME_PATH = "/proc/uptime";
const TIMEDATECTL_PATH = "/usr/bin/timedatectl";
const TIMEDATECTL_ARGS = Object.freeze([
  "show",
  "--property=NTPSynchronized",
  "--value",
]);
const WALL_CLOCK_SOURCE = "Date.now";
const TIMEDATECTL_ENV = Object.freeze({
  LANG: "C",
  LC_ALL: "C",
  PATH: "/usr/bin:/bin",
});
const MAX_TEXT_BYTES = 256;
const MAX_CAPTURE_SPAN_NS = 5_000_000_000n;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const DECIMAL_SECONDS_RE = /^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,9})?$/u;

function fail(reason) {
  throw new Error(reason);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function exactObject(value, keys, reason) {
  if (!isPlainObject(value)) fail(reason);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(reason);
  }
  return value;
}

function boundedText(value, reason) {
  if (typeof value !== "string") fail(reason);
  const bytes = Buffer.byteLength(value, "utf8");
  if (bytes < 1 || bytes > MAX_TEXT_BYTES || value.includes("\0")) {
    fail(reason);
  }
  return value;
}

function oneLine(value, reason) {
  const text = boundedText(value, reason);
  const body = text.endsWith("\n") ? text.slice(0, -1) : text;
  if (
    body.length < 1 ||
    body.includes("\n") ||
    body.includes("\r") ||
    /[\u0000-\u001f\u007f]/u.test(body)
  ) {
    fail(reason);
  }
  return body;
}

function parseBootId(value) {
  const bootId = oneLine(value, "host_time_sync_boot_id_invalid");
  if (!UUID_RE.test(bootId)) fail("host_time_sync_boot_id_invalid");
  return bootId;
}

function decimalSecondsToNs(value) {
  if (!DECIMAL_SECONDS_RE.test(value)) {
    fail("host_time_sync_uptime_invalid");
  }
  const [whole, fraction = ""] = value.split(".");
  return (
    BigInt(whole) * 1_000_000_000n +
    BigInt((fraction + "000000000").slice(0, 9))
  );
}

function parseUptime(value) {
  const line = oneLine(value, "host_time_sync_uptime_invalid");
  const fields = line.split(" ");
  if (
    fields.length !== 2 ||
    !DECIMAL_SECONDS_RE.test(fields[0]) ||
    !DECIMAL_SECONDS_RE.test(fields[1])
  ) {
    fail("host_time_sync_uptime_invalid");
  }
  return decimalSecondsToNs(fields[0]);
}

function parseNtpQuery(value, phase) {
  const record = exactObject(
    value,
    ["status", "signal", "stdout", "stderr", "error"],
    "host_time_sync_ntp_query_invalid",
  );
  if (
    record.status !== 0 ||
    record.signal !== null ||
    record.error !== null ||
    record.stderr !== ""
  ) {
    fail("host_time_sync_ntp_query_failed_" + phase);
  }
  const state = oneLine(
    record.stdout,
    "host_time_sync_ntp_state_invalid_" + phase,
  );
  if (state !== "yes") {
    fail("host_time_sync_not_synchronized_" + phase);
  }
  return true;
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      fail("host_time_sync_noncanonical_number");
    }
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (isPlainObject(value)) {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key) + ":" + canonicalJson(value[key]),
        )
        .join(",") +
      "}"
    );
  }
  fail("host_time_sync_noncanonical_value");
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function evidenceId(body) {
  return (
    VOID_ECONOMIC_SPONSORED_HOST_TIME_SYNC_EVIDENCE_ID_PREFIX_V1 +
    sha256Hex(Buffer.from(canonicalJson(body), "utf8"))
  );
}

const CAPTURE_KEYS = Object.freeze([
  "boot_id_before_text",
  "uptime_before_text",
  "ntp_before",
  "wall_time_ms",
  "ntp_after",
  "uptime_after_text",
  "boot_id_after_text",
]);

function classifyCaptureV1(
  rawCapture,
  productionFixedSourcesObserved,
) {
  if (typeof productionFixedSourcesObserved !== "boolean") {
    fail("host_time_sync_collection_mode_invalid");
  }
  const capture = exactObject(
    rawCapture,
    CAPTURE_KEYS,
    "host_time_sync_capture_invalid",
  );
  const bootBefore = parseBootId(capture.boot_id_before_text);
  const bootAfter = parseBootId(capture.boot_id_after_text);
  if (bootBefore !== bootAfter) {
    fail("host_time_sync_boot_changed_during_capture");
  }

  const uptimeBeforeNs = parseUptime(capture.uptime_before_text);
  const uptimeAfterNs = parseUptime(capture.uptime_after_text);
  if (uptimeAfterNs < uptimeBeforeNs) {
    fail("host_time_sync_uptime_regressed");
  }
  const spanNs = uptimeAfterNs - uptimeBeforeNs;
  if (spanNs > MAX_CAPTURE_SPAN_NS) {
    fail("host_time_sync_capture_span_exceeded");
  }

  parseNtpQuery(capture.ntp_before, "before");
  if (
    !Number.isSafeInteger(capture.wall_time_ms) ||
    capture.wall_time_ms <= 0
  ) {
    fail("host_time_sync_wall_time_invalid");
  }
  parseNtpQuery(capture.ntp_after, "after");

  const body = Object.freeze({
    marker: VOID_ECONOMIC_SPONSORED_HOST_TIME_SYNC_EVIDENCE_V1,
    schema: VOID_ECONOMIC_SPONSORED_HOST_TIME_SYNC_EVIDENCE_SCHEMA_V1,
    version: 1,
    boot_id: bootBefore,
    boot_uptime_before_ns: uptimeBeforeNs.toString(),
    boot_uptime_after_ns: uptimeAfterNs.toString(),
    capture_span_ns: spanNs.toString(),
    wall_time_ms: capture.wall_time_ms,
    ntp_synchronized_before: true,
    ntp_synchronized_after: true,
    boot_id_source: BOOT_ID_PATH,
    boot_uptime_source: UPTIME_PATH,
    time_sync_command: TIMEDATECTL_PATH,
    time_sync_args: [...TIMEDATECTL_ARGS],
    time_sync_environment: { ...TIMEDATECTL_ENV },
    wall_clock_source: WALL_CLOCK_SOURCE,
    production_fixed_sources_observed:
      productionFixedSourcesObserved,
    test_only_injected_dependencies:
      !productionFixedSourcesObserved,
    restart_continuation_authorized: false,
    cross_boot_continuity_proven: false,
    trusted_clock_runtime_authority: false,
    service_mutation: false,
    clock_mutation: false,
    runtime_execution_authorized: false,
    gas_sponsorship_performed: false,
    transaction_submission: false,
    authoritative_chain2050_write: false,
    funds_movement: false,
  });

  return Object.freeze({
    ...body,
    evidence_id: evidenceId(body),
  });
}

function readBoundedFixedText(file) {
  let fd = -1;
  try {
    fd = fs.openSync(
      file,
      fs.constants.O_RDONLY |
        Number(fs.constants.O_NOFOLLOW || 0) |
        Number(fs.constants.O_CLOEXEC || 0),
    );
    const buffer = Buffer.alloc(MAX_TEXT_BYTES + 1);
    const count = fs.readSync(
      fd,
      buffer,
      0,
      buffer.length,
      null,
    );
    if (count < 1 || count > MAX_TEXT_BYTES) {
      fail("host_time_sync_fixed_source_size_invalid");
    }
    return buffer.subarray(0, count).toString("utf8");
  } finally {
    if (fd >= 0) fs.closeSync(fd);
  }
}

function productionDependencies() {
  return Object.freeze({
    readText(file) {
      return readBoundedFixedText(file);
    },
    runCommand(file, args) {
      const result = spawnSync(file, args, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 2_000,
        maxBuffer: 4_096,
        windowsHide: true,
        env: { ...TIMEDATECTL_ENV },
      });
      return {
        status: result.status,
        signal: result.signal,
        stdout: result.stdout ?? "",
        stderr: result.stderr ?? "",
        error:
          result.error instanceof Error
            ? result.error.message
            : null,
      };
    },
    nowMs() {
      return Date.now();
    },
  });
}

function exactDependencies(value) {
  const deps = exactObject(
    value,
    ["readText", "runCommand", "nowMs"],
    "host_time_sync_dependencies_invalid",
  );
  for (const key of ["readText", "runCommand", "nowMs"]) {
    if (typeof deps[key] !== "function") {
      fail("host_time_sync_dependencies_invalid");
    }
  }
  return deps;
}

function collectWithDependencies(
  dependencies,
  productionFixedSourcesObserved,
) {
  const deps = exactDependencies(dependencies);
  if (typeof productionFixedSourcesObserved !== "boolean") {
    fail("host_time_sync_collection_mode_invalid");
  }

  const bootIdBefore = deps.readText(BOOT_ID_PATH);
  const uptimeBefore = deps.readText(UPTIME_PATH);
  const ntpBefore = deps.runCommand(
    TIMEDATECTL_PATH,
    [...TIMEDATECTL_ARGS],
  );
  const wallTimeMs = deps.nowMs();
  const ntpAfter = deps.runCommand(
    TIMEDATECTL_PATH,
    [...TIMEDATECTL_ARGS],
  );
  const uptimeAfter = deps.readText(UPTIME_PATH);
  const bootIdAfter = deps.readText(BOOT_ID_PATH);

  return classifyCaptureV1({
    boot_id_before_text: bootIdBefore,
    uptime_before_text: uptimeBefore,
    ntp_before: ntpBefore,
    wall_time_ms: wallTimeMs,
    ntp_after: ntpAfter,
    uptime_after_text: uptimeAfter,
    boot_id_after_text: bootIdAfter,
  }, productionFixedSourcesObserved);
}

export function collectVoidEconomicSponsoredHostTimeSyncEvidenceV1() {
  if (arguments.length !== 0) {
    fail("host_time_sync_caller_input_forbidden");
  }
  return collectWithDependencies(
    productionDependencies(),
    true,
  );
}

export function testOnlyCollectVoidEconomicSponsoredHostTimeSyncEvidenceV1(
  dependencies,
) {
  return collectWithDependencies(dependencies, false);
}

export function testOnlyClassifyVoidEconomicSponsoredHostTimeSyncEvidenceV1(
  rawCapture,
) {
  return classifyCaptureV1(rawCapture, false);
}

export const VOID_ECONOMIC_SPONSORED_HOST_TIME_SYNC_EVIDENCE_SOURCES_V1 =
  Object.freeze({
    boot_id_path: BOOT_ID_PATH,
    uptime_path: UPTIME_PATH,
    timedatectl_path: TIMEDATECTL_PATH,
    timedatectl_args: TIMEDATECTL_ARGS,
    timedatectl_environment: TIMEDATECTL_ENV,
    wall_clock_source: WALL_CLOCK_SOURCE,
    max_capture_span_ns: MAX_CAPTURE_SPAN_NS.toString(),
  });
