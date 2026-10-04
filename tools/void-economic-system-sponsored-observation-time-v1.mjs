import crypto from "node:crypto";

export const VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_V1 =
  "VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_V1";

export const VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_RECEIPT_V1 =
  "VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_RECEIPT_V1";

export const VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_AUTHORITY_V1 =
  Object.freeze({
    source_only_contract: true,
    injected_clock_dependency: true,
    request_timestamp_input: false,
    clock_read_exactly_once_per_observation: true,
    content_addressed_receipt_chain: true,
    same_process_monotonicity_enforced: true,
    wall_monotonic_skew_bounded: true,
    cumulative_baseline_skew_enforced: true,
    wall_time_non_regression_enforced: true,
    process_instance_change_holds: true,
    boot_change_holds: true,
    trusted_clock_source_proven: false,
    trusted_clock_host_binding_proven: false,
    cross_process_restart_continuity_proven: false,
    cross_boot_restart_continuity_proven: false,
    durable_receipt_storage_proven: false,
    filesystem_read: false,
    filesystem_write: false,
    wall_clock_read_by_contract: false,
    monotonic_clock_read_by_contract: false,
    runtime_route_mount: false,
    runtime_enforcement_verified: false,
    gas_sponsorship_performed: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    public_presale_activation: false,
    market_activation: false,
    funds_movement: false,
  });

const RECEIPT_SCHEMA =
  "void.economic-system-sponsored-observation-time-receipt.v1";
const RECEIPT_KEYS = Object.freeze([
  "schema",
  "marker",
  "version",
  "generation",
  "previous_receipt_sha256",
  "boot_id",
  "process_start_ticks",
  "baseline_wall_time_ms",
  "baseline_monotonic_ns",
  "observed_at_ms",
  "monotonic_ns",
  "wall_monotonic_skew_allowance_ms",
  "receipt_sha256",
]);
const SAMPLE_KEYS = Object.freeze([
  "boot_id",
  "process_start_ticks",
  "wall_time_ms",
  "monotonic_ns",
]);
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const DECIMAL = /^(0|[1-9][0-9]*)$/u;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const MAX_UINT64 = (1n << 64n) - 1n;
const NS_PER_MS = 1_000_000n;

export const VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_MAX_SKEW_MS_V1 =
  5_000;

function fail(code) {
  throw new Error(code);
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
    const record = value;
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
  fail("sponsored_observation_time_noncanonical_value");
}

function sha256Id(value) {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(value).digest("hex")
  );
}

function exactSnapshot(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(code);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail(code);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const own = Reflect.ownKeys(descriptors);
  if (own.some((key) => typeof key !== "string")) fail(code);
  const actual = own.slice().sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
  const out = Object.create(null);
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail(code);
    }
    out[key] = descriptor.value;
  }
  return Object.freeze(out);
}

function decimal(value, code, maximum = MAX_UINT64) {
  if (typeof value !== "string") fail(code);
  const text = value;
  if (!DECIMAL.test(text) || text.length > 24) fail(code);
  const parsed = BigInt(text);
  if (parsed < 0n || parsed > maximum) fail(code);
  return Object.freeze({ text, value: parsed });
}

function safeMs(value, code) {
  if (!Number.isSafeInteger(value) || value < 0) fail(code);
  return value;
}

function parseSample(value) {
  const raw = exactSnapshot(
    value,
    SAMPLE_KEYS,
    "sponsored_observation_time_sample_invalid",
  );
  if (typeof raw.boot_id !== "string") {
    fail("sponsored_observation_time_boot_id_invalid");
  }
  const bootId = raw.boot_id.toLowerCase();
  if (!UUID.test(bootId)) {
    fail("sponsored_observation_time_boot_id_invalid");
  }
  const processStart = decimal(
    raw.process_start_ticks,
    "sponsored_observation_time_process_start_invalid",
  );
  if (processStart.value < 1n) {
    fail("sponsored_observation_time_process_start_invalid");
  }
  const wallMs = safeMs(
    raw.wall_time_ms,
    "sponsored_observation_time_wall_ms_invalid",
  );
  const monotonic = decimal(
    raw.monotonic_ns,
    "sponsored_observation_time_monotonic_ns_invalid",
    (1n << 127n) - 1n,
  );
  return Object.freeze({
    boot_id: bootId,
    process_start_ticks: processStart.text,
    wall_time_ms: wallMs,
    monotonic_ns: monotonic.text,
  });
}

function receiptBody(value) {
  return Object.freeze({
    schema: RECEIPT_SCHEMA,
    marker:
      VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_RECEIPT_V1,
    version: 1,
    generation: value.generation,
    previous_receipt_sha256: value.previous_receipt_sha256,
    boot_id: value.boot_id,
    process_start_ticks: value.process_start_ticks,
    baseline_wall_time_ms: value.baseline_wall_time_ms,
    baseline_monotonic_ns: value.baseline_monotonic_ns,
    observed_at_ms: value.observed_at_ms,
    monotonic_ns: value.monotonic_ns,
    wall_monotonic_skew_allowance_ms:
      VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_MAX_SKEW_MS_V1,
  });
}

function buildReceipt(value) {
  const body = receiptBody(value);
  return Object.freeze({
    ...body,
    receipt_sha256: sha256Id(canonicalJson(body)),
  });
}

function parseReceipt(value) {
  const raw = exactSnapshot(
    value,
    RECEIPT_KEYS,
    "sponsored_observation_time_prior_receipt_invalid",
  );
  if (
    raw.schema !== RECEIPT_SCHEMA ||
    raw.marker !==
      VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_RECEIPT_V1 ||
    raw.version !== 1 ||
    raw.wall_monotonic_skew_allowance_ms !==
      VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_MAX_SKEW_MS_V1
  ) {
    fail("sponsored_observation_time_prior_receipt_invalid");
  }
  const generation = decimal(
    raw.generation,
    "sponsored_observation_time_prior_receipt_invalid",
  );
  const previous =
    raw.previous_receipt_sha256 === null
      ? null
      : typeof raw.previous_receipt_sha256 === "string"
        ? raw.previous_receipt_sha256
        : fail("sponsored_observation_time_prior_receipt_invalid");
  if (
    (generation.value === 0n && previous !== null) ||
    (generation.value > 0n && !SHA256_ID.test(previous))
  ) {
    fail("sponsored_observation_time_prior_receipt_invalid");
  }
  if (typeof raw.boot_id !== "string") {
    fail("sponsored_observation_time_prior_receipt_invalid");
  }
  const bootId = raw.boot_id.toLowerCase();
  if (!UUID.test(bootId)) {
    fail("sponsored_observation_time_prior_receipt_invalid");
  }
  const processStart = decimal(
    raw.process_start_ticks,
    "sponsored_observation_time_prior_receipt_invalid",
  );
  if (processStart.value < 1n) {
    fail("sponsored_observation_time_prior_receipt_invalid");
  }
  const baselineWall = safeMs(
    raw.baseline_wall_time_ms,
    "sponsored_observation_time_prior_receipt_invalid",
  );
  const baselineMonotonic = decimal(
    raw.baseline_monotonic_ns,
    "sponsored_observation_time_prior_receipt_invalid",
    (1n << 127n) - 1n,
  );
  const observedAt = safeMs(
    raw.observed_at_ms,
    "sponsored_observation_time_prior_receipt_invalid",
  );
  const monotonic = decimal(
    raw.monotonic_ns,
    "sponsored_observation_time_prior_receipt_invalid",
    (1n << 127n) - 1n,
  );
  if (
    baselineWall > observedAt ||
    baselineMonotonic.value > monotonic.value ||
    (
      generation.value === 0n &&
      (
        baselineWall !== observedAt ||
        baselineMonotonic.value !== monotonic.value
      )
    ) ||
    (
      generation.value > 0n &&
      monotonic.value <= baselineMonotonic.value
    )
  ) {
    fail("sponsored_observation_time_prior_receipt_invalid");
  }
  const priorMonotonicElapsedMs =
    (monotonic.value - baselineMonotonic.value) / NS_PER_MS;
  const priorWallElapsedMs =
    BigInt(observedAt) - BigInt(baselineWall);
  const priorDifference =
    priorWallElapsedMs >= priorMonotonicElapsedMs
      ? priorWallElapsedMs - priorMonotonicElapsedMs
      : priorMonotonicElapsedMs - priorWallElapsedMs;
  if (
    priorDifference >
    BigInt(
      VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_MAX_SKEW_MS_V1,
    )
  ) {
    fail("sponsored_observation_time_prior_receipt_invalid");
  }
  const receipt = Object.freeze({
    schema: RECEIPT_SCHEMA,
    marker:
      VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_RECEIPT_V1,
    version: 1,
    generation: generation.text,
    previous_receipt_sha256: previous,
    boot_id: bootId,
    process_start_ticks: processStart.text,
    baseline_wall_time_ms: baselineWall,
    baseline_monotonic_ns: baselineMonotonic.text,
    observed_at_ms: observedAt,
    monotonic_ns: monotonic.text,
    wall_monotonic_skew_allowance_ms:
      VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_MAX_SKEW_MS_V1,
    receipt_sha256:
      typeof raw.receipt_sha256 === "string"
        ? raw.receipt_sha256
        : fail("sponsored_observation_time_prior_receipt_invalid"),
  });
  if (
    !SHA256_ID.test(receipt.receipt_sha256) ||
    receipt.receipt_sha256 !==
      sha256Id(canonicalJson(receiptBody(receipt)))
  ) {
    fail("sponsored_observation_time_prior_receipt_invalid");
  }
  return receipt;
}

function held(reason, observationPerformed = false) {
  return Object.freeze({
    ok: false,
    status: "held",
    marker: VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_V1,
    version: 1,
    reason,
    observation_performed: observationPerformed,
    accepted_observed_at_ms: null,
    receipt: null,
    trusted_clock_source_proven: false,
    cross_process_restart_continuity_proven: false,
    cross_boot_restart_continuity_proven: false,
    runtime_enforcement_verified: false,
    gas_sponsorship_performed: false,
    transaction_submission: false,
    funds_movement: false,
    authority:
      VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_AUTHORITY_V1,
  });
}

function success(receipt) {
  return Object.freeze({
    ok: true,
    status: "source_accepted",
    marker: VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_V1,
    version: 1,
    observation_performed: true,
    accepted_observed_at_ms: receipt.observed_at_ms,
    receipt,
    trusted_clock_source_proven: false,
    cross_process_restart_continuity_proven: false,
    cross_boot_restart_continuity_proven: false,
    runtime_enforcement_verified: false,
    gas_sponsorship_performed: false,
    transaction_submission: false,
    funds_movement: false,
    authority:
      VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_AUTHORITY_V1,
  });
}

function compareForwardSample(prior, sample) {
  if (sample.boot_id !== prior.boot_id) {
    fail("sponsored_observation_time_boot_changed");
  }
  if (sample.process_start_ticks !== prior.process_start_ticks) {
    fail("sponsored_observation_time_process_instance_changed");
  }
  const priorMono = BigInt(prior.monotonic_ns);
  const nextMono = BigInt(sample.monotonic_ns);
  if (nextMono <= priorMono) {
    fail("sponsored_observation_time_monotonic_not_forward");
  }
  if (sample.wall_time_ms < prior.observed_at_ms) {
    fail("sponsored_observation_time_wall_regressed");
  }
  const baselineMono = BigInt(prior.baseline_monotonic_ns);
  const monotonicElapsedMs = (nextMono - baselineMono) / NS_PER_MS;
  const wallElapsedMs =
    BigInt(sample.wall_time_ms) -
    BigInt(prior.baseline_wall_time_ms);
  const difference =
    wallElapsedMs >= monotonicElapsedMs
      ? wallElapsedMs - monotonicElapsedMs
      : monotonicElapsedMs - wallElapsedMs;
  if (
    difference >
    BigInt(
      VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_MAX_SKEW_MS_V1,
    )
  ) {
    fail("sponsored_observation_time_wall_monotonic_skew_exceeded");
  }
}

export function createVoidEconomicSystemSponsoredObservationTimeV1(
  input,
) {
  const binding = exactSnapshot(
    input,
    ["trustedClock"],
    "sponsored_observation_time_binding_invalid",
  );
  if (typeof binding.trustedClock !== "function") {
    fail("sponsored_observation_time_clock_invalid");
  }
  const clock = binding.trustedClock;

  return Object.freeze({
    marker: VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_V1,
    version: 1,
    request_timestamp_input: false,
    trusted_clock_dependency_injected: true,
    runtime_enforcement_verified: false,

    observe(input = { prior_receipt: null }) {
      let observationPerformed = false;
      try {
        const request = exactSnapshot(
          input,
          ["prior_receipt"],
          "sponsored_observation_time_request_invalid",
        );
        const prior =
          request.prior_receipt === null
            ? null
            : parseReceipt(request.prior_receipt);

        observationPerformed = true;
        let rawSample;
        try {
          rawSample = clock();
        } catch {
          fail("sponsored_observation_time_clock_read_failed");
        }
        const sample = parseSample(rawSample);

        if (prior === null) {
          const receipt = buildReceipt({
            generation: "0",
            previous_receipt_sha256: null,
            boot_id: sample.boot_id,
            process_start_ticks: sample.process_start_ticks,
            baseline_wall_time_ms: sample.wall_time_ms,
            baseline_monotonic_ns: sample.monotonic_ns,
            observed_at_ms: sample.wall_time_ms,
            monotonic_ns: sample.monotonic_ns,
          });
          return success(receipt);
        }

        compareForwardSample(prior, sample);
        const generation = BigInt(prior.generation);
        if (generation >= MAX_UINT64) {
          fail("sponsored_observation_time_generation_exhausted");
        }
        const receipt = buildReceipt({
          generation: (generation + 1n).toString(),
          previous_receipt_sha256: prior.receipt_sha256,
          boot_id: sample.boot_id,
          process_start_ticks: sample.process_start_ticks,
          baseline_wall_time_ms: prior.baseline_wall_time_ms,
          baseline_monotonic_ns: prior.baseline_monotonic_ns,
          observed_at_ms: sample.wall_time_ms,
          monotonic_ns: sample.monotonic_ns,
        });
        return success(receipt);
      } catch (error) {
        return held(
          error instanceof Error
            ? error.message
            : "sponsored_observation_time_failed",
          observationPerformed,
        );
      }
    },
  });
}
