#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import { types as utilTypes } from "node:util";

import {
  VOID_ECONOMIC_SPONSORED_HOST_TIME_SYNC_EVIDENCE_SCHEMA_V1,
  VOID_ECONOMIC_SPONSORED_HOST_TIME_SYNC_EVIDENCE_V1,
  collectVoidEconomicSponsoredHostTimeSyncEvidenceV1,
  testOnlyCollectVoidEconomicSponsoredHostTimeSyncEvidenceV1,
} from "./void-economic-sponsored-host-time-sync-evidence-v1.mjs";

export const VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_V1 =
  "VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_V1";
export const VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_SCHEMA_V1 =
  "void_economic_sponsored_host_trusted_clock_binding_v1";
export const VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_ID_PREFIX_V1 =
  "voideshtcb1_";

export const VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_AUTHORITY_V1 =
  Object.freeze({
    source_only_contract: true,
    fixed_host_time_sync_collector_required: true,
    fixed_process_stat_source: true,
    process_identity_bracketed_around_host_capture: true,
    boot_relative_uptime_midpoint_sample: true,
    midpoint_uncertainty_bounded: true,
    observation_time_sample_shape_proven: true,
    caller_timestamp_input: false,
    caller_process_identity_input: false,
    caller_path_input: false,
    caller_command_input: false,
    production_host_sample_collected_in_ci: false,
    trusted_clock_runtime_authority: false,
    cross_process_restart_continuity_proven: false,
    cross_boot_restart_continuity_proven: false,
    durable_time_store_mutation: false,
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
    public_presale_activation: false,
    market_activation: false,
    funds_movement: false,
  });

const PROC_SELF_STAT_PATH = "/proc/self/stat";
const MAX_PROC_STAT_BYTES = 4096;
const MAX_BINDING_CAPTURE_SPAN_NS = 2_000_000_000n;
const DECIMAL = /^(?:0|[1-9][0-9]*)$/u;
const HOST_EVIDENCE_ID = /^voideshtse1_[0-9a-f]{64}$/u;
const HOST_EVIDENCE_KEYS = Object.freeze([
  "marker",
  "schema",
  "version",
  "boot_id",
  "boot_uptime_before_ns",
  "boot_uptime_after_ns",
  "capture_span_ns",
  "wall_time_ms",
  "ntp_synchronized_before",
  "ntp_synchronized_after",
  "boot_id_source",
  "boot_uptime_source",
  "time_sync_command",
  "time_sync_args",
  "time_sync_environment",
  "wall_clock_source",
  "production_fixed_sources_observed",
  "test_only_injected_dependencies",
  "restart_continuation_authorized",
  "cross_boot_continuity_proven",
  "trusted_clock_runtime_authority",
  "service_mutation",
  "clock_mutation",
  "runtime_execution_authorized",
  "gas_sponsorship_performed",
  "transaction_submission",
  "authoritative_chain2050_write",
  "funds_movement",
  "evidence_id",
]);

function fail(reason) {
  throw new Error(reason);
}

function exactSnapshot(value, keys, reason) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    utilTypes.isProxy(value)
  ) {
    fail(reason);
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail(reason);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const own = Reflect.ownKeys(descriptors);
  if (own.some((key) => typeof key !== "string")) fail(reason);
  const actual = own.slice().sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(reason);
  }
  const out = Object.create(null);
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
  return Object.freeze(out);
}

function decimal(value, reason, { positive = false } = {}) {
  if (typeof value !== "string" || !DECIMAL.test(value) || value.length > 40) {
    fail(reason);
  }
  const parsed = BigInt(value);
  if (parsed < 0n || (positive && parsed === 0n)) fail(reason);
  return parsed;
}

function canonicalJson(value) {
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
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
        .join(",") +
      "}"
    );
  }
  fail("sponsored_host_trusted_clock_noncanonical_value");
}

function sha256Hex(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function bindingId(body) {
  return (
    VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_ID_PREFIX_V1 +
    sha256Hex(Buffer.from(canonicalJson(body), "utf8"))
  );
}

function parseProcSelfStat(text, expectedPid) {
  if (
    typeof text !== "string" ||
    Buffer.byteLength(text, "utf8") < 8 ||
    Buffer.byteLength(text, "utf8") > MAX_PROC_STAT_BYTES ||
    text.includes("\0")
  ) {
    fail("sponsored_host_trusted_clock_process_stat_invalid");
  }
  const body = text.endsWith("\n") ? text.slice(0, -1) : text;
  if (body.includes("\n") || body.includes("\r")) {
    fail("sponsored_host_trusted_clock_process_stat_invalid");
  }
  const open = body.indexOf("(");
  const close = body.lastIndexOf(")");
  if (open < 2 || close <= open || close + 2 >= body.length) {
    fail("sponsored_host_trusted_clock_process_stat_invalid");
  }
  const pidText = body.slice(0, open).trim();
  if (
    !DECIMAL.test(pidText) ||
    Number(pidText) !== expectedPid ||
    !Number.isSafeInteger(expectedPid) ||
    expectedPid <= 1
  ) {
    fail("sponsored_host_trusted_clock_process_pid_invalid");
  }
  const fields = body.slice(close + 2).trim().split(/\s+/u);
  if (fields.length < 20) {
    fail("sponsored_host_trusted_clock_process_stat_invalid");
  }
  const startTicks = fields[19];
  decimal(
    startTicks,
    "sponsored_host_trusted_clock_process_start_invalid",
    { positive: true },
  );
  return Object.freeze({
    pid: expectedPid,
    process_start_ticks: startTicks,
  });
}

function normalizeHostEvidence(value, productionExpected) {
  const evidence = exactSnapshot(
    value,
    HOST_EVIDENCE_KEYS,
    "sponsored_host_trusted_clock_host_evidence_invalid",
  );
  if (
    evidence.marker !== VOID_ECONOMIC_SPONSORED_HOST_TIME_SYNC_EVIDENCE_V1 ||
    evidence.schema !==
      VOID_ECONOMIC_SPONSORED_HOST_TIME_SYNC_EVIDENCE_SCHEMA_V1 ||
    evidence.version !== 1 ||
    evidence.ntp_synchronized_before !== true ||
    evidence.ntp_synchronized_after !== true ||
    evidence.restart_continuation_authorized !== false ||
    evidence.cross_boot_continuity_proven !== false ||
    evidence.trusted_clock_runtime_authority !== false ||
    evidence.service_mutation !== false ||
    evidence.clock_mutation !== false ||
    evidence.runtime_execution_authorized !== false ||
    evidence.gas_sponsorship_performed !== false ||
    evidence.transaction_submission !== false ||
    evidence.authoritative_chain2050_write !== false ||
    evidence.funds_movement !== false
  ) {
    fail("sponsored_host_trusted_clock_host_evidence_invalid");
  }
  if (
    evidence.production_fixed_sources_observed !== productionExpected ||
    evidence.test_only_injected_dependencies !== !productionExpected
  ) {
    fail("sponsored_host_trusted_clock_collection_mode_invalid");
  }
  if (
    typeof evidence.evidence_id !== "string" ||
    !HOST_EVIDENCE_ID.test(evidence.evidence_id)
  ) {
    fail("sponsored_host_trusted_clock_host_evidence_id_invalid");
  }
  if (
    evidence.boot_id_source !== "/proc/sys/kernel/random/boot_id" ||
    evidence.boot_uptime_source !== "/proc/uptime" ||
    evidence.time_sync_command !== "/usr/bin/timedatectl" ||
    evidence.wall_clock_source !== "Date.now" ||
    !Array.isArray(evidence.time_sync_args) ||
    utilTypes.isProxy(evidence.time_sync_args) ||
    evidence.time_sync_args.length !== 3 ||
    evidence.time_sync_args[0] !== "show" ||
    evidence.time_sync_args[1] !== "--property=NTPSynchronized" ||
    evidence.time_sync_args[2] !== "--value"
  ) {
    fail("sponsored_host_trusted_clock_fixed_source_mismatch");
  }
  const env = exactSnapshot(
    evidence.time_sync_environment,
    ["LANG", "LC_ALL", "PATH"],
    "sponsored_host_trusted_clock_fixed_source_mismatch",
  );
  if (
    env.LANG !== "C" ||
    env.LC_ALL !== "C" ||
    env.PATH !== "/usr/bin:/bin"
  ) {
    fail("sponsored_host_trusted_clock_fixed_source_mismatch");
  }
  if (
    !Number.isSafeInteger(evidence.wall_time_ms) ||
    evidence.wall_time_ms <= 0
  ) {
    fail("sponsored_host_trusted_clock_wall_time_invalid");
  }
  const before = decimal(
    evidence.boot_uptime_before_ns,
    "sponsored_host_trusted_clock_uptime_invalid",
  );
  const after = decimal(
    evidence.boot_uptime_after_ns,
    "sponsored_host_trusted_clock_uptime_invalid",
  );
  const span = decimal(
    evidence.capture_span_ns,
    "sponsored_host_trusted_clock_span_invalid",
  );
  if (
    after < before ||
    after - before !== span ||
    span > MAX_BINDING_CAPTURE_SPAN_NS
  ) {
    fail("sponsored_host_trusted_clock_span_invalid");
  }
  return Object.freeze({ evidence, before, after, span });
}

function buildBinding({
  hostEvidence,
  processStatBeforeText,
  processStatAfterText,
  expectedPid,
  productionExpected,
}) {
  const host = normalizeHostEvidence(hostEvidence, productionExpected);
  const processBefore = parseProcSelfStat(processStatBeforeText, expectedPid);
  const processAfter = parseProcSelfStat(processStatAfterText, expectedPid);
  if (
    processBefore.pid !== processAfter.pid ||
    processBefore.process_start_ticks !== processAfter.process_start_ticks
  ) {
    fail("sponsored_host_trusted_clock_process_generation_changed");
  }

  const midpoint = host.before + host.span / 2n;
  const uncertainty = (host.span + 1n) / 2n;
  const sample = Object.freeze({
    boot_id: host.evidence.boot_id,
    process_start_ticks: processBefore.process_start_ticks,
    wall_time_ms: host.evidence.wall_time_ms,
    monotonic_ns: midpoint.toString(),
  });

  const body = Object.freeze({
    marker: VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_V1,
    schema: VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_SCHEMA_V1,
    version: 1,
    host_time_sync_evidence_id: host.evidence.evidence_id,
    boot_id: host.evidence.boot_id,
    process_pid: processBefore.pid,
    process_start_ticks: processBefore.process_start_ticks,
    wall_time_ms: host.evidence.wall_time_ms,
    boot_uptime_before_ns: host.before.toString(),
    boot_uptime_after_ns: host.after.toString(),
    boot_uptime_midpoint_ns: midpoint.toString(),
    midpoint_uncertainty_ns: uncertainty.toString(),
    process_stat_source: PROC_SELF_STAT_PATH,
    production_fixed_sources_observed: productionExpected,
    test_only_injected_dependencies: !productionExpected,
    observation_sample: sample,
    trusted_clock_runtime_authority: false,
    cross_process_restart_continuity_proven: false,
    cross_boot_restart_continuity_proven: false,
    durable_time_store_mutation: false,
    runtime_execution_authorized: false,
    gas_sponsorship_performed: false,
    transaction_submission: false,
    authoritative_chain2050_write: false,
    public_presale_activation: false,
    funds_movement: false,
  });
  return Object.freeze({
    ...body,
    binding_id: bindingId(body),
    authority: VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_AUTHORITY_V1,
  });
}

function readProcSelfStat() {
  let fd = -1;
  try {
    fd = fs.openSync(
      PROC_SELF_STAT_PATH,
      fs.constants.O_RDONLY |
        Number(fs.constants.O_NOFOLLOW || 0) |
        Number(fs.constants.O_CLOEXEC || 0),
    );
    const buffer = Buffer.alloc(MAX_PROC_STAT_BYTES + 1);
    const count = fs.readSync(fd, buffer, 0, buffer.length, 0);
    if (count < 8 || count > MAX_PROC_STAT_BYTES) {
      fail("sponsored_host_trusted_clock_process_stat_invalid");
    }
    return buffer.subarray(0, count).toString("utf8");
  } finally {
    if (fd >= 0) fs.closeSync(fd);
  }
}

export function collectVoidEconomicSponsoredHostTrustedClockBindingV1() {
  if (arguments.length !== 0) {
    fail("sponsored_host_trusted_clock_caller_input_forbidden");
  }
  const processBefore = readProcSelfStat();
  const hostEvidence =
    collectVoidEconomicSponsoredHostTimeSyncEvidenceV1();
  const processAfter = readProcSelfStat();
  return buildBinding({
    hostEvidence,
    processStatBeforeText: processBefore,
    processStatAfterText: processAfter,
    expectedPid: process.pid,
    productionExpected: true,
  });
}

export function testOnlyCollectVoidEconomicSponsoredHostTrustedClockBindingV1(
  input,
) {
  const request = exactSnapshot(
    input,
    [
      "host_time_sync_dependencies",
      "process_stat_before_text",
      "process_stat_after_text",
      "expected_pid",
    ],
    "sponsored_host_trusted_clock_test_input_invalid",
  );
  if (
    !Number.isSafeInteger(request.expected_pid) ||
    request.expected_pid <= 1
  ) {
    fail("sponsored_host_trusted_clock_process_pid_invalid");
  }
  const hostEvidence =
    testOnlyCollectVoidEconomicSponsoredHostTimeSyncEvidenceV1(
      request.host_time_sync_dependencies,
    );
  return buildBinding({
    hostEvidence,
    processStatBeforeText: request.process_stat_before_text,
    processStatAfterText: request.process_stat_after_text,
    expectedPid: request.expected_pid,
    productionExpected: false,
  });
}

export const VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_SOURCES_V1 =
  Object.freeze({
    process_stat_path: PROC_SELF_STAT_PATH,
    max_process_stat_bytes: MAX_PROC_STAT_BYTES,
    max_binding_capture_span_ns: MAX_BINDING_CAPTURE_SPAN_NS.toString(),
    midpoint_rule: "floor((uptime_before_ns+uptime_after_ns)/2)",
  });
