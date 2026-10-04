#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_AUTHORITY_V1,
  VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_MAX_SKEW_MS_V1,
  VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_RECEIPT_V1,
  VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_V1,
  createVoidEconomicSystemSponsoredObservationTimeV1,
} from "../tools/void-economic-system-sponsored-observation-time-v1.mjs";

const BOOT_A = "11111111-1111-1111-1111-111111111111";
const BOOT_B = "22222222-2222-2222-2222-222222222222";
const BASE_WALL = 1_800_000_000_000;
const BASE_MONO = 9_000_000_000_000n;

function sample({
  boot = BOOT_A,
  start = "123456",
  wall = BASE_WALL,
  mono = BASE_MONO,
} = {}) {
  return {
    boot_id: boot,
    process_start_ticks: start,
    wall_time_ms: wall,
    monotonic_ns: mono.toString(),
  };
}

function canonicalJsonProof(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key) + ":" + canonicalJsonProof(value[key]),
        )
        .join(",") +
      "}"
    );
  }
  throw new Error("proof_noncanonical_value");
}

function rehashReceiptProof(receipt) {
  const body = { ...receipt };
  delete body.receipt_sha256;
  return {
    ...receipt,
    receipt_sha256:
      "sha256:" +
      crypto
        .createHash("sha256")
        .update(canonicalJsonProof(body))
        .digest("hex"),
  };
}

function clockQueue(values) {
  let calls = 0;
  const queue = [...values];
  return {
    clock() {
      calls += 1;
      if (queue.length < 1) {
        throw new Error("proof_clock_exhausted");
      }
      return queue.shift();
    },
    calls() {
      return calls;
    },
  };
}

function requireOk(value) {
  assert.equal(value.ok, true, JSON.stringify(value));
  assert.equal(value.status, "source_accepted");
  assert.equal(value.observation_performed, true);
  assert.equal(value.trusted_clock_source_proven, false);
  assert.equal(value.cross_process_restart_continuity_proven, false);
  assert.equal(value.cross_boot_restart_continuity_proven, false);
  assert.equal(value.runtime_enforcement_verified, false);
  assert.equal(value.gas_sponsorship_performed, false);
  assert.equal(value.transaction_submission, false);
  assert.equal(value.funds_movement, false);
  return value;
}

function expectHeld(value, reason, observationPerformed) {
  assert.equal(value.ok, false, JSON.stringify(value));
  assert.equal(value.status, "held");
  assert.equal(value.reason, reason);
  assert.equal(value.observation_performed, observationPerformed);
  assert.equal(value.accepted_observed_at_ms, null);
  assert.equal(value.receipt, null);
  assert.equal(value.trusted_clock_source_proven, false);
  assert.equal(value.cross_process_restart_continuity_proven, false);
  assert.equal(value.cross_boot_restart_continuity_proven, false);
  assert.equal(value.runtime_enforcement_verified, false);
  assert.equal(value.gas_sponsorship_performed, false);
  assert.equal(value.transaction_submission, false);
  assert.equal(value.funds_movement, false);
}

for (const [key, value] of Object.entries(
  VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_AUTHORITY_V1,
)) {
  const trueKeys = new Set([
    "source_only_contract",
    "injected_clock_dependency",
    "clock_read_exactly_once_per_observation",
    "content_addressed_receipt_chain",
    "same_process_monotonicity_enforced",
    "wall_monotonic_skew_bounded",
    "cumulative_baseline_skew_enforced",
    "wall_time_non_regression_enforced",
    "process_instance_change_holds",
    "boot_change_holds",
  ]);
  assert.equal(value, trueKeys.has(key), key);
}

assert.equal(
  VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_MAX_SKEW_MS_V1,
  5000,
);

const firstClock = clockQueue([sample()]);
const firstBinding =
  createVoidEconomicSystemSponsoredObservationTimeV1({
    trustedClock: firstClock.clock,
  });
assert.equal(firstBinding.request_timestamp_input, false);
assert.equal(firstBinding.trusted_clock_dependency_injected, true);
assert.equal(firstBinding.runtime_enforcement_verified, false);

const first = requireOk(
  firstBinding.observe({ prior_receipt: null }),
);
assert.equal(firstClock.calls(), 1);
assert.equal(first.receipt.generation, "0");
assert.equal(first.receipt.previous_receipt_sha256, null);
assert.equal(first.receipt.boot_id, BOOT_A);
assert.equal(first.receipt.process_start_ticks, "123456");
assert.equal(first.receipt.baseline_wall_time_ms, BASE_WALL);
assert.equal(first.receipt.baseline_monotonic_ns, BASE_MONO.toString());
assert.equal(first.receipt.observed_at_ms, BASE_WALL);
assert.equal(first.receipt.monotonic_ns, BASE_MONO.toString());
assert.equal(
  first.receipt.wall_monotonic_skew_allowance_ms,
  5000,
);
assert.equal(
  first.receipt.marker,
  VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_RECEIPT_V1,
);

const secondClock = clockQueue([
  sample({
    wall: BASE_WALL + 1000,
    mono: BASE_MONO + 1_000_000_000n,
  }),
]);
const second = requireOk(
  createVoidEconomicSystemSponsoredObservationTimeV1({
    trustedClock: secondClock.clock,
  }).observe({ prior_receipt: first.receipt }),
);
assert.equal(secondClock.calls(), 1);
assert.equal(second.receipt.generation, "1");
assert.equal(
  second.receipt.previous_receipt_sha256,
  first.receipt.receipt_sha256,
);
assert.equal(second.accepted_observed_at_ms, BASE_WALL + 1000);
assert.equal(second.receipt.baseline_wall_time_ms, BASE_WALL);
assert.equal(second.receipt.baseline_monotonic_ns, BASE_MONO.toString());

const deterministicClock = clockQueue([sample()]);
const deterministic = requireOk(
  createVoidEconomicSystemSponsoredObservationTimeV1({
    trustedClock: deterministicClock.clock,
  }).observe({ prior_receipt: null }),
);
assert.equal(
  deterministic.receipt.receipt_sha256,
  first.receipt.receipt_sha256,
);

const reversedPrior = Object.fromEntries(
  Object.entries(first.receipt).reverse(),
);
const reorderedClock = clockQueue([
  sample({
    wall: BASE_WALL + 500,
    mono: BASE_MONO + 500_000_000n,
  }),
]);
const reordered = requireOk(
  createVoidEconomicSystemSponsoredObservationTimeV1({
    trustedClock: reorderedClock.clock,
  }).observe({ prior_receipt: reversedPrior }),
);
assert.equal(reordered.receipt.generation, "1");

{
  let requestGetterReads = 0;
  const request = {};
  Object.defineProperty(request, "prior_receipt", {
    enumerable: true,
    get() {
      requestGetterReads += 1;
      return null;
    },
  });
  const clock = clockQueue([sample()]);
  const held =
    createVoidEconomicSystemSponsoredObservationTimeV1({
      trustedClock: clock.clock,
    }).observe(request);
  expectHeld(
    held,
    "sponsored_observation_time_request_invalid",
    false,
  );
  assert.equal(requestGetterReads, 0);
  assert.equal(clock.calls(), 0);
}

{
  let sampleGetterReads = 0;
  const badSample = {
    process_start_ticks: "123456",
    wall_time_ms: BASE_WALL,
    monotonic_ns: BASE_MONO.toString(),
  };
  Object.defineProperty(badSample, "boot_id", {
    enumerable: true,
    get() {
      sampleGetterReads += 1;
      return BOOT_A;
    },
  });
  const clock = clockQueue([badSample]);
  const held =
    createVoidEconomicSystemSponsoredObservationTimeV1({
      trustedClock: clock.clock,
    }).observe({ prior_receipt: null });
  expectHeld(
    held,
    "sponsored_observation_time_sample_invalid",
    true,
  );
  assert.equal(sampleGetterReads, 0);
  assert.equal(clock.calls(), 1);
}

{
  const tampered = {
    ...first.receipt,
    observed_at_ms: first.receipt.observed_at_ms + 1,
  };
  const clock = clockQueue([sample()]);
  expectHeld(
    createVoidEconomicSystemSponsoredObservationTimeV1({
      trustedClock: clock.clock,
    }).observe({ prior_receipt: tampered }),
    "sponsored_observation_time_prior_receipt_invalid",
    false,
  );
  assert.equal(clock.calls(), 0);
}

{
  const forgedZeroProcessStart = rehashReceiptProof({
    ...first.receipt,
    process_start_ticks: "0",
  });
  const clock = clockQueue([sample()]);
  expectHeld(
    createVoidEconomicSystemSponsoredObservationTimeV1({
      trustedClock: clock.clock,
    }).observe({ prior_receipt: forgedZeroProcessStart }),
    "sponsored_observation_time_prior_receipt_invalid",
    false,
  );
  assert.equal(clock.calls(), 0);
}

{
  const forgedSkewedPrior = rehashReceiptProof({
    ...second.receipt,
    observed_at_ms: BASE_WALL + 7_000,
    monotonic_ns: (BASE_MONO + 1_000_000_000n).toString(),
  });
  const clock = clockQueue([
    sample({
      wall: BASE_WALL + 7_000,
      mono: BASE_MONO + 2_000_000_000n,
    }),
  ]);
  expectHeld(
    createVoidEconomicSystemSponsoredObservationTimeV1({
      trustedClock: clock.clock,
    }).observe({ prior_receipt: forgedSkewedPrior }),
    "sponsored_observation_time_prior_receipt_invalid",
    false,
  );
  assert.equal(clock.calls(), 0);
}

{
  const forgedNonForwardPrior = rehashReceiptProof({
    ...second.receipt,
    observed_at_ms: BASE_WALL,
    monotonic_ns: BASE_MONO.toString(),
  });
  const clock = clockQueue([
    sample({
      wall: BASE_WALL + 1,
      mono: BASE_MONO + 1_000_000n,
    }),
  ]);
  expectHeld(
    createVoidEconomicSystemSponsoredObservationTimeV1({
      trustedClock: clock.clock,
    }).observe({ prior_receipt: forgedNonForwardPrior }),
    "sponsored_observation_time_prior_receipt_invalid",
    false,
  );
  assert.equal(clock.calls(), 0);
}

{
  const clock = clockQueue([
    sample({
      wall: BASE_WALL - 1,
      mono: BASE_MONO + 1_000_000_000n,
    }),
  ]);
  expectHeld(
    createVoidEconomicSystemSponsoredObservationTimeV1({
      trustedClock: clock.clock,
    }).observe({ prior_receipt: first.receipt }),
    "sponsored_observation_time_wall_regressed",
    true,
  );
  assert.equal(clock.calls(), 1);
}

for (const mono of [BASE_MONO, BASE_MONO - 1n]) {
  const clock = clockQueue([
    sample({
      wall: BASE_WALL + 1,
      mono,
    }),
  ]);
  expectHeld(
    createVoidEconomicSystemSponsoredObservationTimeV1({
      trustedClock: clock.clock,
    }).observe({ prior_receipt: first.receipt }),
    "sponsored_observation_time_monotonic_not_forward",
    true,
  );
}

{
  const clock = clockQueue([
    sample({
      wall: BASE_WALL + 7001,
      mono: BASE_MONO + 1_000_000_000n,
    }),
  ]);
  expectHeld(
    createVoidEconomicSystemSponsoredObservationTimeV1({
      trustedClock: clock.clock,
    }).observe({ prior_receipt: first.receipt }),
    "sponsored_observation_time_wall_monotonic_skew_exceeded",
    true,
  );
}

{
  const clock = clockQueue([
    sample({
      wall: BASE_WALL + 6000,
      mono: BASE_MONO + 1_000_000_000n,
    }),
  ]);
  const edge = requireOk(
    createVoidEconomicSystemSponsoredObservationTimeV1({
      trustedClock: clock.clock,
    }).observe({ prior_receipt: first.receipt }),
  );
  assert.equal(edge.accepted_observed_at_ms, BASE_WALL + 6000);

  const ratchetClock = clockQueue([
    sample({
      wall: BASE_WALL + 11000,
      mono: BASE_MONO + 2_000_000_000n,
    }),
  ]);
  expectHeld(
    createVoidEconomicSystemSponsoredObservationTimeV1({
      trustedClock: ratchetClock.clock,
    }).observe({ prior_receipt: edge.receipt }),
    "sponsored_observation_time_wall_monotonic_skew_exceeded",
    true,
  );
  assert.equal(ratchetClock.calls(), 1);
}

{
  const clock = clockQueue([
    sample({
      boot: BOOT_B,
      wall: BASE_WALL + 1000,
      mono: BASE_MONO + 1_000_000_000n,
    }),
  ]);
  expectHeld(
    createVoidEconomicSystemSponsoredObservationTimeV1({
      trustedClock: clock.clock,
    }).observe({ prior_receipt: first.receipt }),
    "sponsored_observation_time_boot_changed",
    true,
  );
}

{
  const clock = clockQueue([
    sample({
      start: "123457",
      wall: BASE_WALL + 1000,
      mono: BASE_MONO + 1_000_000_000n,
    }),
  ]);
  expectHeld(
    createVoidEconomicSystemSponsoredObservationTimeV1({
      trustedClock: clock.clock,
    }).observe({ prior_receipt: first.receipt }),
    "sponsored_observation_time_process_instance_changed",
    true,
  );
}

{
  let clockRef = () =>
    sample({
      wall: BASE_WALL + 1000,
      mono: BASE_MONO + 1_000_000_000n,
    });
  let originalCalls = 0;
  const original = clockRef;
  const binding =
    createVoidEconomicSystemSponsoredObservationTimeV1({
      trustedClock() {
        originalCalls += 1;
        return original();
      },
    });
  clockRef = () => {
    throw new Error("replacement_clock_must_not_be_used");
  };
  const accepted = requireOk(
    binding.observe({ prior_receipt: first.receipt }),
  );
  assert.equal(accepted.receipt.generation, "1");
  assert.equal(originalCalls, 1);
}

{
  const clock = clockQueue([sample()]);
  expectHeld(
    createVoidEconomicSystemSponsoredObservationTimeV1({
      trustedClock: clock.clock,
    }).observe({
      prior_receipt: null,
      observed_at_ms: BASE_WALL,
    }),
    "sponsored_observation_time_request_invalid",
    false,
  );
  assert.equal(clock.calls(), 0);
}

{
  let bindingGetterReads = 0;
  const bindingInput = {};
  Object.defineProperty(bindingInput, "trustedClock", {
    enumerable: true,
    get() {
      bindingGetterReads += 1;
      return () => sample();
    },
  });
  assert.throws(
    () =>
      createVoidEconomicSystemSponsoredObservationTimeV1(
        bindingInput,
      ),
    /sponsored_observation_time_binding_invalid/u,
  );
  assert.equal(bindingGetterReads, 0);
}

{
  let calls = 0;
  const binding =
    createVoidEconomicSystemSponsoredObservationTimeV1({
      trustedClock() {
        calls += 1;
        throw new Error("secret-clock-provider-detail");
      },
    });
  const held = binding.observe({ prior_receipt: null });
  expectHeld(
    held,
    "sponsored_observation_time_clock_read_failed",
    true,
  );
  assert.equal(calls, 1);
  assert.equal(
    JSON.stringify(held).includes("secret-clock-provider-detail"),
    false,
  );
}

assert.throws(
  () =>
    createVoidEconomicSystemSponsoredObservationTimeV1({
      trustedClock: null,
    }),
  /sponsored_observation_time_clock_invalid/u,
);

const source = fs.readFileSync(
  "tools/void-economic-system-sponsored-observation-time-v1.mjs",
  "utf8",
);
assert.doesNotMatch(source, /Date\.now\s*\(/u);
assert.doesNotMatch(source, /process\.hrtime/u);
assert.doesNotMatch(source, /node:fs|from ["']fs["']/u);
assert.doesNotMatch(
  source,
  /eth_sendRawTransaction|eth_sendTransaction|systemctl|mount\s|chown/u,
);

console.log(
  "VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_V1_PROOF_GREEN",
);
console.log("injected_clock_dependency=true");
console.log("request_timestamp_input=false");
console.log("clock_read_exactly_once_per_observation=true");
console.log("content_addressed_receipt_chain=true");
console.log("same_process_monotonicity_enforced=true");
console.log("wall_time_non_regression_enforced=true");
console.log("wall_monotonic_skew_bounded=true");
console.log("cumulative_baseline_skew_enforced=true");
console.log("per_step_clock_ratchet_rejected=true");
console.log("prior_receipt_process_start_positive_revalidated=true");
console.log("self_consistent_invalid_prior_skew_rejected=true");
console.log("self_consistent_nonforward_prior_rejected=true");
console.log("boot_change_holds=true");
console.log("process_instance_change_holds=true");
console.log("accessor_request_rejected_without_getter_read=true");
console.log("accessor_clock_sample_rejected_without_getter_read=true");
console.log("accessor_clock_binding_rejected_without_getter_read=true");
console.log("clock_exception_detail_not_exposed=true");
console.log("trusted_clock_source_proven=false");
console.log("cross_process_restart_continuity_proven=false");
console.log("cross_boot_restart_continuity_proven=false");
console.log("durable_receipt_storage_proven=false");
console.log("runtime_enforcement_verified=false");
console.log("gas_sponsorship_performed=false");
console.log("funds_movement=false");
console.log(
  "marker=" +
    VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_V1,
);
