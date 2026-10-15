#!/usr/bin/env node
import crypto from "node:crypto";
import path from "node:path";
import { types as utilTypes } from "node:util";

import {
  VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_AUTHORITY_V1,
  VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_ID_PREFIX_V1,
  VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_SCHEMA_V1,
  VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_V1,
  collectVoidEconomicSponsoredHostTrustedClockBindingV1,
} from "./void-economic-sponsored-host-trusted-clock-binding-v1.mjs";
import {
  VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_STORE_V1,
  createVoidEconomicSystemSponsoredObservationTimeStoreV1,
} from "./void-economic-system-sponsored-observation-time-store-v1.mjs";

export const VOID_ECONOMIC_SPONSORED_HOST_OBSERVATION_TIME_STORE_BINDING_V1 =
  "VOID_ECONOMIC_SPONSORED_HOST_OBSERVATION_TIME_STORE_BINDING_V1";
export const VOID_ECONOMIC_SPONSORED_HOST_OBSERVATION_TIME_STORE_BINDING_SCHEMA_V1 =
  "void_economic_sponsored_host_observation_time_store_binding_v1";
export const VOID_ECONOMIC_SPONSORED_HOST_OBSERVATION_TIME_STORE_BINDING_ID_PREFIX_V1 =
  "voideshotsb1_";

export const
  VOID_ECONOMIC_SPONSORED_HOST_OBSERVATION_TIME_STORE_BINDING_AUTHORITY_V1 =
  Object.freeze({
    source_only_composition: true,
    fixed_host_trusted_clock_collector_wired: true,
    durable_observation_store_reused: true,
    caller_clock_input: false,
    caller_timestamp_input: false,
    caller_prior_receipt_input: false,
    one_host_binding_capture_per_operation: true,
    one_store_clock_read_per_successful_operation: true,
    preview_zero_durable_growth: true,
    durable_result_bound_to_same_host_sample: true,
    production_host_sample_collected_in_ci: false,
    trusted_clock_runtime_authority: false,
    live_durable_receipt_storage_proven: false,
    receipt_store_rollback_resistance_proven: false,
    cross_process_restart_continuity_proven: false,
    cross_boot_restart_continuity_proven: false,
    runtime_route_active: false,
    runtime_enforcement_verified: false,
    replay_consume_performed: false,
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

const BINDING_ID =
  /^voideshtcb1_[0-9a-f]{64}$/u;
const RECEIPT_SHA =
  /^sha256:[0-9a-f]{64}$/u;
const SAMPLE_KEYS = Object.freeze([
  "boot_id",
  "process_start_ticks",
  "wall_time_ms",
  "monotonic_ns",
]);
const HOST_BINDING_KEYS = Object.freeze([
  "marker",
  "schema",
  "version",
  "host_time_sync_evidence_id",
  "boot_id",
  "process_pid",
  "process_start_ticks",
  "wall_time_ms",
  "boot_uptime_before_ns",
  "boot_uptime_after_ns",
  "boot_uptime_midpoint_ns",
  "midpoint_uncertainty_ns",
  "process_stat_source",
  "production_fixed_sources_observed",
  "test_only_injected_dependencies",
  "observation_sample",
  "trusted_clock_runtime_authority",
  "cross_process_restart_continuity_proven",
  "cross_boot_restart_continuity_proven",
  "durable_time_store_mutation",
  "runtime_execution_authorized",
  "gas_sponsorship_performed",
  "transaction_submission",
  "authoritative_chain2050_write",
  "public_presale_activation",
  "funds_movement",
  "binding_id",
  "authority",
]);

function fail(reason) {
  throw new Error(reason);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
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
  const actual = own.slice().sort(compareText);
  const expected = [...keys].sort(compareText);
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
        .sort(compareText)
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
        .join(",") +
      "}"
    );
  }
  fail("sponsored_host_durable_time_noncanonical_value");
}

function sha256Hex(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function compositionId(body) {
  return (
    VOID_ECONOMIC_SPONSORED_HOST_OBSERVATION_TIME_STORE_BINDING_ID_PREFIX_V1 +
    sha256Hex(Buffer.from(canonicalJson(body), "utf8"))
  );
}

function hostBindingId(value) {
  const body = {};
  for (const key of HOST_BINDING_KEYS) {
    if (key !== "binding_id" && key !== "authority") body[key] = value[key];
  }
  return (
    VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_ID_PREFIX_V1 +
    sha256Hex(Buffer.from(canonicalJson(body), "utf8"))
  );
}

function normalizeHostBinding(value, productionExpected) {
  const binding = exactSnapshot(
    value,
    HOST_BINDING_KEYS,
    "SPONSORED_HOST_DURABLE_TIME_HOST_BINDING_INVALID",
  );
  if (
    binding.marker !== VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_V1 ||
    binding.schema !==
      VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_SCHEMA_V1 ||
    binding.version !== 1 ||
    binding.authority !==
      VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_AUTHORITY_V1 ||
    binding.production_fixed_sources_observed !== productionExpected ||
    binding.test_only_injected_dependencies !== !productionExpected ||
    binding.trusted_clock_runtime_authority !== false ||
    binding.cross_process_restart_continuity_proven !== false ||
    binding.cross_boot_restart_continuity_proven !== false ||
    binding.durable_time_store_mutation !== false ||
    binding.runtime_execution_authorized !== false ||
    binding.gas_sponsorship_performed !== false ||
    binding.transaction_submission !== false ||
    binding.authoritative_chain2050_write !== false ||
    binding.public_presale_activation !== false ||
    binding.funds_movement !== false ||
    !Number.isSafeInteger(binding.wall_time_ms) ||
    binding.wall_time_ms <= 0 ||
    !Number.isSafeInteger(binding.process_pid) ||
    binding.process_pid <= 1 ||
    typeof binding.binding_id !== "string" ||
    !BINDING_ID.test(binding.binding_id) ||
    binding.binding_id !== hostBindingId(binding)
  ) {
    fail("SPONSORED_HOST_DURABLE_TIME_HOST_BINDING_INVALID");
  }
  const sample = exactSnapshot(
    binding.observation_sample,
    SAMPLE_KEYS,
    "SPONSORED_HOST_DURABLE_TIME_SAMPLE_INVALID",
  );
  if (
    sample.boot_id !== binding.boot_id ||
    sample.process_start_ticks !== binding.process_start_ticks ||
    sample.wall_time_ms !== binding.wall_time_ms ||
    sample.monotonic_ns !== binding.boot_uptime_midpoint_ns
  ) {
    fail("SPONSORED_HOST_DURABLE_TIME_SAMPLE_INVALID");
  }
  return Object.freeze({
    binding,
    sample: Object.freeze({
      boot_id: sample.boot_id,
      process_start_ticks: sample.process_start_ticks,
      wall_time_ms: sample.wall_time_ms,
      monotonic_ns: sample.monotonic_ns,
    }),
  });
}

function held(reason, {
  productionExpected,
  hostBinding = null,
  storeResult = null,
  clockReads = 0,
} = {}) {
  const durableAdvanced =
    storeResult?.ok === true && storeResult?.status === "source_accepted";
  const committedIdentityAvailable =
    durableAdvanced &&
    RECEIPT_SHA.test(String(storeResult?.head_receipt_sha256 || "")) &&
    typeof storeResult?.generation === "string" &&
    /^(?:0|[1-9][0-9]*)$/u.test(storeResult.generation) &&
    Number.isSafeInteger(storeResult?.durable_receipt_count) &&
    storeResult.durable_receipt_count > 0 &&
    Number.isSafeInteger(storeResult?.accepted_observed_at_ms) &&
    storeResult.accepted_observed_at_ms > 0;
  return Object.freeze({
    ok: false,
    status: "held",
    marker: VOID_ECONOMIC_SPONSORED_HOST_OBSERVATION_TIME_STORE_BINDING_V1,
    version: 1,
    reason,
    host_trusted_clock_binding_id: hostBinding?.binding_id || null,
    host_time_sync_evidence_id:
      hostBinding?.host_time_sync_evidence_id || null,
    production_fixed_sources_observed:
      hostBinding?.production_fixed_sources_observed ?? null,
    test_only_injected_dependencies:
      hostBinding?.test_only_injected_dependencies ?? null,
    host_binding_capture_count: hostBinding === null ? 0 : 1,
    store_clock_read_count: clockReads,
    mutation_performed: storeResult?.mutation_performed === true,
    durable_time_authority_advanced: durableAdvanced,
    committed_durable_receipt_identity_preserved: committedIdentityAvailable,
    durable_head_receipt_sha256:
      committedIdentityAvailable ? storeResult.head_receipt_sha256 : null,
    generation: committedIdentityAvailable ? storeResult.generation : null,
    durable_receipt_count:
      committedIdentityAvailable ? storeResult.durable_receipt_count : null,
    accepted_observed_at_ms:
      committedIdentityAvailable ? storeResult.accepted_observed_at_ms : null,
    trusted_clock_source_proven: false,
    trusted_clock_host_binding_proven: false,
    trusted_clock_runtime_authority: false,
    live_durable_receipt_storage_proven: false,
    receipt_store_rollback_resistance_proven: false,
    cross_process_restart_continuity_proven: false,
    cross_boot_restart_continuity_proven: false,
    runtime_route_active: false,
    runtime_enforcement_verified: false,
    replay_consume_performed: false,
    gas_sponsorship_performed: false,
    transaction_submission: false,
    transaction_broadcast: false,
    public_presale_activation: false,
    market_activation: false,
    funds_movement: false,
    production_operation: productionExpected === true,
    authority:
      VOID_ECONOMIC_SPONSORED_HOST_OBSERVATION_TIME_STORE_BINDING_AUTHORITY_V1,
  });
}

function previewSuccess(binding, result, productionExpected, clockReads) {
  const body = Object.freeze({
    marker: VOID_ECONOMIC_SPONSORED_HOST_OBSERVATION_TIME_STORE_BINDING_V1,
    schema:
      VOID_ECONOMIC_SPONSORED_HOST_OBSERVATION_TIME_STORE_BINDING_SCHEMA_V1,
    version: 1,
    operation: "preview",
    host_trusted_clock_binding_id: binding.binding_id,
    host_time_sync_evidence_id: binding.host_time_sync_evidence_id,
    store_marker: VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_STORE_V1,
    candidate_receipt_sha256: result.candidate_receipt_sha256,
    candidate_generation: result.candidate_generation,
    prior_head_receipt_sha256: result.prior_head_receipt_sha256,
    durable_receipt_count: result.durable_receipt_count,
    accepted_observed_at_ms: result.accepted_observed_at_ms,
    production_fixed_sources_observed: productionExpected,
    test_only_injected_dependencies: !productionExpected,
    host_binding_capture_count: 1,
    store_clock_read_count: clockReads,
    mutation_performed: false,
    durable_time_authority_advanced: false,
    candidate_receipt_persisted: false,
    preview_only: true,
    trusted_clock_source_proven: productionExpected,
    trusted_clock_host_binding_proven: productionExpected,
    trusted_clock_runtime_authority: false,
    live_durable_receipt_storage_proven: false,
    receipt_store_rollback_resistance_proven: false,
    cross_process_restart_continuity_proven: false,
    cross_boot_restart_continuity_proven: false,
    runtime_route_active: false,
    runtime_enforcement_verified: false,
    replay_consume_performed: false,
    gas_sponsorship_performed: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    public_presale_activation: false,
    market_activation: false,
    funds_movement: false,
  });
  return Object.freeze({
    ok: true,
    status: "source_preview_bound",
    ...body,
    composition_receipt_id: compositionId(body),
    authority:
      VOID_ECONOMIC_SPONSORED_HOST_OBSERVATION_TIME_STORE_BINDING_AUTHORITY_V1,
  });
}

function observeSuccess(
  binding,
  observed,
  productionExpected,
  clockReads,
) {
  const body = Object.freeze({
    marker: VOID_ECONOMIC_SPONSORED_HOST_OBSERVATION_TIME_STORE_BINDING_V1,
    schema:
      VOID_ECONOMIC_SPONSORED_HOST_OBSERVATION_TIME_STORE_BINDING_SCHEMA_V1,
    version: 1,
    operation: "observe",
    host_trusted_clock_binding_id: binding.binding_id,
    host_time_sync_evidence_id: binding.host_time_sync_evidence_id,
    store_marker: VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_STORE_V1,
    durable_head_receipt_sha256: observed.head_receipt_sha256,
    generation: observed.generation,
    durable_receipt_count: observed.durable_receipt_count,
    accepted_observed_at_ms: observed.accepted_observed_at_ms,
    production_fixed_sources_observed: productionExpected,
    test_only_injected_dependencies: !productionExpected,
    host_binding_capture_count: 1,
    store_clock_read_count: clockReads,
    mutation_performed: observed.mutation_performed === true,
    durable_time_authority_advanced: true,
    durable_result_bound_to_same_host_sample: true,
    trusted_clock_source_proven: productionExpected,
    trusted_clock_host_binding_proven: productionExpected,
    trusted_clock_runtime_authority: false,
    live_durable_receipt_storage_proven: false,
    receipt_store_rollback_resistance_proven: false,
    cross_process_restart_continuity_proven: false,
    cross_boot_restart_continuity_proven: false,
    runtime_route_active: false,
    runtime_enforcement_verified: false,
    replay_consume_performed: false,
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
  return Object.freeze({
    ok: true,
    status: "source_observed_bound",
    ...body,
    composition_receipt_id: compositionId(body),
    authority:
      VOID_ECONOMIC_SPONSORED_HOST_OBSERVATION_TIME_STORE_BINDING_AUTHORITY_V1,
  });
}

function createBinding({
  root_dir,
  collectBinding,
  createStore,
  productionExpected,
}) {
  if (
    typeof root_dir !== "string" ||
    !path.isAbsolute(root_dir) ||
    path.resolve(root_dir) !== root_dir ||
    root_dir.includes("\0")
  ) {
    fail("SPONSORED_HOST_DURABLE_TIME_ROOT_INVALID");
  }
  if (typeof collectBinding !== "function") {
    fail("SPONSORED_HOST_DURABLE_TIME_COLLECTOR_INVALID");
  }
  if (typeof createStore !== "function") {
    fail("SPONSORED_HOST_DURABLE_TIME_STORE_FACTORY_INVALID");
  }

  function capture() {
    const normalized = normalizeHostBinding(
      collectBinding(),
      productionExpected,
    );
    let clockReads = 0;
    const trustedClock = () => {
      clockReads += 1;
      return normalized.sample;
    };
    const store = createStore({
      root_dir,
      trustedClock,
    });
    return Object.freeze({
      normalized,
      store,
      clockReads: () => clockReads,
    });
  }

  return Object.freeze({
    marker: VOID_ECONOMIC_SPONSORED_HOST_OBSERVATION_TIME_STORE_BINDING_V1,
    version: 1,
    caller_clock_input: false,
    caller_timestamp_input: false,
    caller_prior_receipt_input: false,
    production_fixed_sources_required: productionExpected,

    preview(...args) {
      if (args.length !== 0) {
        return held(
          "SPONSORED_HOST_DURABLE_TIME_REQUEST_INPUT_FORBIDDEN",
          { productionExpected },
        );
      }
      let captured;
      try {
        captured = capture();
        const result = captured.store.preview();
        if (!result.ok) {
          return held(result.reason, {
            productionExpected,
            hostBinding: captured.normalized.binding,
            storeResult: result,
            clockReads: captured.clockReads(),
          });
        }
        if (
          captured.clockReads() !== 1 ||
          result.mutation_performed !== false ||
          result.preview_only !== true ||
          result.durable_time_authority_advanced !== false ||
          result.candidate_receipt_persisted !== false ||
          result.accepted_observed_at_ms !==
            captured.normalized.binding.wall_time_ms ||
          !RECEIPT_SHA.test(String(result.candidate_receipt_sha256 || ""))
        ) {
          return held(
            "SPONSORED_HOST_DURABLE_TIME_PREVIEW_BINDING_MISMATCH",
            {
              productionExpected,
              hostBinding: captured.normalized.binding,
              storeResult: result,
              clockReads: captured.clockReads(),
            },
          );
        }
        return previewSuccess(
          captured.normalized.binding,
          result,
          productionExpected,
          captured.clockReads(),
        );
      } catch (error) {
        return held(
          error instanceof Error
            ? error.message
            : "SPONSORED_HOST_DURABLE_TIME_PREVIEW_FAILED",
          {
            productionExpected,
            hostBinding: captured?.normalized.binding || null,
            clockReads: captured?.clockReads() || 0,
          },
        );
      }
    },

    async observe(...args) {
      if (args.length !== 0) {
        return held(
          "SPONSORED_HOST_DURABLE_TIME_REQUEST_INPUT_FORBIDDEN",
          { productionExpected },
        );
      }
      let captured;
      let observed = null;
      try {
        captured = capture();
        observed = await captured.store.observe();
        if (!observed.ok) {
          return held(observed.reason, {
            productionExpected,
            hostBinding: captured.normalized.binding,
            storeResult: observed,
            clockReads: captured.clockReads(),
          });
        }
        if (
          captured.clockReads() !== 1 ||
          observed.accepted_observed_at_ms !==
            captured.normalized.binding.wall_time_ms ||
          !RECEIPT_SHA.test(String(observed.head_receipt_sha256 || ""))
        ) {
          return held(
            "SPONSORED_HOST_DURABLE_TIME_OBSERVE_BINDING_MISMATCH",
            {
              productionExpected,
              hostBinding: captured.normalized.binding,
              storeResult: observed,
              clockReads: captured.clockReads(),
            },
          );
        }
        return observeSuccess(
          captured.normalized.binding,
          observed,
          productionExpected,
          captured.clockReads(),
        );
      } catch (error) {
        return held(
          error instanceof Error
            ? error.message
            : "SPONSORED_HOST_DURABLE_TIME_OBSERVE_FAILED",
          {
            productionExpected,
            hostBinding: captured?.normalized.binding || null,
            storeResult: observed,
            clockReads: captured?.clockReads() || 0,
          },
        );
      }
    },
  });
}

export function createVoidEconomicSponsoredHostObservationTimeStoreBindingV1(
  input,
) {
  const request = exactSnapshot(
    input,
    ["root_dir"],
    "SPONSORED_HOST_DURABLE_TIME_BINDING_INVALID",
  );
  return createBinding({
    root_dir: request.root_dir,
    collectBinding:
      collectVoidEconomicSponsoredHostTrustedClockBindingV1,
    createStore:
      createVoidEconomicSystemSponsoredObservationTimeStoreV1,
    productionExpected: true,
  });
}

export function testOnlyCreateVoidEconomicSponsoredHostObservationTimeStoreBindingV1(
  input,
) {
  const request = exactSnapshot(
    input,
    ["root_dir", "collectBinding"],
    "SPONSORED_HOST_DURABLE_TIME_TEST_BINDING_INVALID",
  );
  return createBinding({
    root_dir: request.root_dir,
    collectBinding: request.collectBinding,
    createStore:
      createVoidEconomicSystemSponsoredObservationTimeStoreV1,
    productionExpected: false,
  });
}

export function testOnlyCreateVoidEconomicSponsoredHostObservationTimeStoreBindingWithStoreV1(
  input,
) {
  const request = exactSnapshot(
    input,
    ["root_dir", "collectBinding", "createStore"],
    "SPONSORED_HOST_DURABLE_TIME_TEST_BINDING_INVALID",
  );
  return createBinding({
    root_dir: request.root_dir,
    collectBinding: request.collectBinding,
    createStore: request.createStore,
    productionExpected: false,
  });
}
