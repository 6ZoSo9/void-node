#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_ECONOMIC_SPONSORED_HOST_TIME_SYNC_EVIDENCE_AUTHORITY_V1,
  VOID_ECONOMIC_SPONSORED_HOST_TIME_SYNC_EVIDENCE_ID_PREFIX_V1,
  VOID_ECONOMIC_SPONSORED_HOST_TIME_SYNC_EVIDENCE_SOURCES_V1,
  VOID_ECONOMIC_SPONSORED_HOST_TIME_SYNC_EVIDENCE_V1,
  testOnlyClassifyVoidEconomicSponsoredHostTimeSyncEvidenceV1,
  collectVoidEconomicSponsoredHostTimeSyncEvidenceV1,
  testOnlyCollectVoidEconomicSponsoredHostTimeSyncEvidenceV1,
} from "../tools/void-economic-sponsored-host-time-sync-evidence-v1.mjs";

const BOOT = "11111111-2222-3333-4444-555555555555";

function ntp(stdout = "yes\n", overrides = {}) {
  return {
    status: 0,
    signal: null,
    stdout,
    stderr: "",
    error: null,
    ...overrides,
  };
}

function capture(overrides = {}) {
  return {
    boot_id_before_text: BOOT + "\n",
    uptime_before_text: "100.100000000 20.00\n",
    ntp_before: ntp(),
    wall_time_ms: 1_800_000_000_000,
    ntp_after: ntp(),
    uptime_after_text: "101.250000000 20.01\n",
    boot_id_after_text: BOOT + "\n",
    ...overrides,
  };
}

const good = testOnlyClassifyVoidEconomicSponsoredHostTimeSyncEvidenceV1(capture());
assert.equal(
  good.marker,
  VOID_ECONOMIC_SPONSORED_HOST_TIME_SYNC_EVIDENCE_V1,
);
assert.match(
  good.evidence_id,
  new RegExp(
    "^" +
      VOID_ECONOMIC_SPONSORED_HOST_TIME_SYNC_EVIDENCE_ID_PREFIX_V1 +
      "[0-9a-f]{64}$",
    "u",
  ),
);
assert.equal(good.boot_id, BOOT);
assert.equal(good.boot_uptime_before_ns, "100100000000");
assert.equal(good.boot_uptime_after_ns, "101250000000");
assert.equal(good.capture_span_ns, "1150000000");
assert.equal(good.wall_time_ms, 1_800_000_000_000);
assert.equal(good.ntp_synchronized_before, true);
assert.equal(good.ntp_synchronized_after, true);
assert.equal(
  good.boot_id_source,
  "/proc/sys/kernel/random/boot_id",
);
assert.equal(good.boot_uptime_source, "/proc/uptime");
assert.equal(good.time_sync_command, "/usr/bin/timedatectl");
assert.deepEqual(good.time_sync_args, [
  "show",
  "--property=NTPSynchronized",
  "--value",
]);
assert.deepEqual(good.time_sync_environment, {
  LANG: "C",
  LC_ALL: "C",
  PATH: "/usr/bin:/bin",
});
assert.equal(good.wall_clock_source, "Date.now");
assert.equal(good.production_fixed_sources_observed, false);
assert.equal(good.test_only_injected_dependencies, true);
assert.equal(good.restart_continuation_authorized, false);
assert.equal(good.cross_boot_continuity_proven, false);
assert.equal(good.trusted_clock_runtime_authority, false);
assert.equal(good.service_mutation, false);
assert.equal(good.clock_mutation, false);
assert.equal(good.runtime_execution_authorized, false);
assert.equal(good.gas_sponsorship_performed, false);
assert.equal(good.transaction_submission, false);
assert.equal(good.authoritative_chain2050_write, false);
assert.equal(good.funds_movement, false);

const same = testOnlyClassifyVoidEconomicSponsoredHostTimeSyncEvidenceV1(capture());
assert.equal(same.evidence_id, good.evidence_id);
const changedWall =
  testOnlyClassifyVoidEconomicSponsoredHostTimeSyncEvidenceV1(
    capture({ wall_time_ms: 1_800_000_000_001 }),
  );
assert.notEqual(changedWall.evidence_id, good.evidence_id);

assert.throws(
  () =>
    testOnlyClassifyVoidEconomicSponsoredHostTimeSyncEvidenceV1({
      ...capture(),
      extra: true,
    }),
  /host_time_sync_capture_invalid/u,
);
assert.throws(
  () =>
    testOnlyClassifyVoidEconomicSponsoredHostTimeSyncEvidenceV1(
      capture({
        boot_id_after_text:
          "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee\n",
      }),
    ),
  /host_time_sync_boot_changed_during_capture/u,
);
assert.throws(
  () =>
    testOnlyClassifyVoidEconomicSponsoredHostTimeSyncEvidenceV1(
      capture({
        boot_id_before_text:
          "AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE\n",
      }),
    ),
  /host_time_sync_boot_id_invalid/u,
);
assert.throws(
  () =>
    testOnlyClassifyVoidEconomicSponsoredHostTimeSyncEvidenceV1(
      capture({
        uptime_after_text: "99.00 20.01\n",
      }),
    ),
  /host_time_sync_uptime_regressed/u,
);
assert.throws(
  () =>
    testOnlyClassifyVoidEconomicSponsoredHostTimeSyncEvidenceV1(
      capture({
        uptime_after_text: "106.00 20.01\n",
      }),
    ),
  /host_time_sync_capture_span_exceeded/u,
);
assert.throws(
  () =>
    testOnlyClassifyVoidEconomicSponsoredHostTimeSyncEvidenceV1(
      capture({
        uptime_before_text: "100.00  20.00\n",
      }),
    ),
  /host_time_sync_uptime_invalid/u,
);
assert.throws(
  () =>
    testOnlyClassifyVoidEconomicSponsoredHostTimeSyncEvidenceV1(
      capture({ ntp_before: ntp("no\n") }),
    ),
  /host_time_sync_not_synchronized_before/u,
);
assert.throws(
  () =>
    testOnlyClassifyVoidEconomicSponsoredHostTimeSyncEvidenceV1(
      capture({ ntp_after: ntp("no\n") }),
    ),
  /host_time_sync_not_synchronized_after/u,
);
assert.throws(
  () =>
    testOnlyClassifyVoidEconomicSponsoredHostTimeSyncEvidenceV1(
      capture({
        ntp_before: ntp("yes\n", { status: 1 }),
      }),
    ),
  /host_time_sync_ntp_query_failed_before/u,
);
assert.throws(
  () =>
    testOnlyClassifyVoidEconomicSponsoredHostTimeSyncEvidenceV1(
      capture({
        ntp_after: ntp("yes\n", { stderr: "warning\n" }),
      }),
    ),
  /host_time_sync_ntp_query_failed_after/u,
);
assert.throws(
  () =>
    testOnlyClassifyVoidEconomicSponsoredHostTimeSyncEvidenceV1(
      capture({ wall_time_ms: 0 }),
    ),
  /host_time_sync_wall_time_invalid/u,
);

const calls = [];
let bootReads = 0;
let uptimeReads = 0;
let ntpReads = 0;
const collected =
  testOnlyCollectVoidEconomicSponsoredHostTimeSyncEvidenceV1({
    readText(file) {
      calls.push(["read", file]);
      if (file === "/proc/sys/kernel/random/boot_id") {
        bootReads += 1;
        return BOOT + "\n";
      }
      if (file === "/proc/uptime") {
        uptimeReads += 1;
        return uptimeReads === 1
          ? "200.000000001 40.0\n"
          : "201.500000001 40.1\n";
      }
      throw new Error("unexpected_file");
    },
    runCommand(file, args) {
      calls.push(["command", file, [...args]]);
      assert.equal(file, "/usr/bin/timedatectl");
      assert.deepEqual(args, [
        "show",
        "--property=NTPSynchronized",
        "--value",
      ]);
      ntpReads += 1;
      return ntp();
    },
    nowMs() {
      calls.push(["wall", "Date.now"]);
      return 1_800_000_010_000;
    },
  });

assert.equal(bootReads, 2);
assert.equal(uptimeReads, 2);
assert.equal(ntpReads, 2);
assert.deepEqual(calls, [
  ["read", "/proc/sys/kernel/random/boot_id"],
  ["read", "/proc/uptime"],
  [
    "command",
    "/usr/bin/timedatectl",
    ["show", "--property=NTPSynchronized", "--value"],
  ],
  ["wall", "Date.now"],
  [
    "command",
    "/usr/bin/timedatectl",
    ["show", "--property=NTPSynchronized", "--value"],
  ],
  ["read", "/proc/uptime"],
  ["read", "/proc/sys/kernel/random/boot_id"],
]);
assert.equal(collected.capture_span_ns, "1500000000");
assert.equal(collected.wall_time_ms, 1_800_000_010_000);
assert.equal(collected.production_fixed_sources_observed, false);
assert.equal(collected.test_only_injected_dependencies, true);

assert.throws(
  () =>
    testOnlyCollectVoidEconomicSponsoredHostTimeSyncEvidenceV1({
      readText() {
        return BOOT + "\n";
      },
      runCommand() {
        return ntp();
      },
      nowMs() {
        return 1;
      },
      extra: true,
    }),
  /host_time_sync_dependencies_invalid/u,
);

assert.throws(
  () => collectVoidEconomicSponsoredHostTimeSyncEvidenceV1({}),
  /host_time_sync_caller_input_forbidden/u,
);

assert.deepEqual(
  VOID_ECONOMIC_SPONSORED_HOST_TIME_SYNC_EVIDENCE_SOURCES_V1,
  {
    boot_id_path: "/proc/sys/kernel/random/boot_id",
    uptime_path: "/proc/uptime",
    timedatectl_path: "/usr/bin/timedatectl",
    timedatectl_args: [
      "show",
      "--property=NTPSynchronized",
      "--value",
    ],
    timedatectl_environment: {
      LANG: "C",
      LC_ALL: "C",
      PATH: "/usr/bin:/bin",
    },
    wall_clock_source: "Date.now",
    max_capture_span_ns: "5000000000",
  },
);

for (const [key, value] of Object.entries(
  VOID_ECONOMIC_SPONSORED_HOST_TIME_SYNC_EVIDENCE_AUTHORITY_V1,
)) {
  const expectedTrue = new Set([
    "source_only_evidence",
    "fixed_boot_id_source",
    "fixed_boot_uptime_source",
    "fixed_time_sync_query",
    "synchronized_wall_bracket_required",
    "boot_identity_stability_required",
    "boot_relative_monotonic_bracket_required",
    "capture_span_bounded",
    "production_evidence_requires_fixed_collector",
    "fixed_source_nofollow_bounded_reads",
    "sanitized_time_sync_environment",
  ]);
  assert.equal(value, expectedTrue.has(key), key);
}

const source = fs.readFileSync(
  "tools/void-economic-sponsored-host-time-sync-evidence-v1.mjs",
  "utf8",
);
assert.match(source, /spawnSync\(file, args/u);
assert.match(
  source,
  /"\/usr\/bin\/timedatectl"/u,
);
assert.match(
  source,
  /"\/proc\/sys\/kernel\/random\/boot_id"/u,
);
assert.match(source, /"\/proc\/uptime"/u);
assert.match(source, /Date\.now\(\)/u);
assert.match(source, /fs\.constants\.O_NOFOLLOW/u);
assert.match(source, /Buffer\.alloc\(MAX_TEXT_BYTES \+ 1\)/u);
assert.match(source, /env: \{ \.\.\.TIMEDATECTL_ENV \}/u);
assert.doesNotMatch(source, /process\.env/u);
assert.match(
  source,
  /collectWithDependencies\(\s*productionDependencies\(\),\s*true,?\s*\)/u,
);
assert.doesNotMatch(
  source,
  /export function classifyVoidEconomicSponsoredHostTimeSyncEvidenceV1/u,
);
assert.doesNotMatch(source, /systemctl/u);
assert.doesNotMatch(source, /set-time/u);
assert.doesNotMatch(source, /chronyc/u);
assert.doesNotMatch(source, /ntpdate/u);
assert.doesNotMatch(
  source,
  /transaction_submission:\s*true/u,
);
assert.doesNotMatch(source, /funds_movement:\s*true/u);

console.log(
  "VOID_ECONOMIC_SPONSORED_HOST_TIME_SYNC_EVIDENCE_V1_PROOF_GREEN",
);
console.log("source_only_evidence=true");
console.log("fixed_boot_id_source=true");
console.log("fixed_boot_uptime_source=true");
console.log("fixed_time_sync_query=true");
console.log("synchronized_wall_bracket_required=true");
console.log("boot_identity_stability_required=true");
console.log("boot_relative_monotonic_bracket_required=true");
console.log("capture_span_bounded=true");
console.log("production_evidence_requires_fixed_collector=true");
console.log("fixed_source_nofollow_bounded_reads=true");
console.log("sanitized_time_sync_environment=true");
console.log("caller_environment_override=false");
console.log("test_evidence_production_fixed_sources_observed=false");
console.log("max_capture_span_ns=5000000000");
console.log("caller_timestamp_input=false");
console.log("caller_path_input=false");
console.log("caller_command_input=false");
console.log("fallback_source=false");
console.log("restart_continuation_authorized=false");
console.log("cross_process_restart_continuity_proven=false");
console.log("cross_boot_restart_continuity_proven=false");
console.log("trusted_clock_runtime_authority=false");
console.log("service_mutation=false");
console.log("clock_mutation=false");
console.log("runtime_execution_authorized=false");
console.log("gas_sponsorship_performed=false");
console.log("transaction_submission=false");
console.log("authoritative_chain2050_write=false");
console.log("funds_movement=false");
