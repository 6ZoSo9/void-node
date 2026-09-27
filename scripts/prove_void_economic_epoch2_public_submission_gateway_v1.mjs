#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { Wallet } from "ethers";

import {
  VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_GATEWAY_ID_V1,
  VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_TYPES_V1,
  buildVoidEconomicEpoch2SignedSubmissionIntentV1,
  voidEconomicEpoch2SignedSubmissionTypedDataV1,
} from "../tools/void-economic-epoch2-signed-submission-intent-v1.mjs";

import {
  VOID_ECONOMIC_EPOCH2_PUBLIC_SUBMISSION_GATEWAY_AUTHORITY_V1,
  VOID_ECONOMIC_EPOCH2_PUBLIC_SUBMISSION_GATEWAY_CORE_V1,
  VoidEconomicEpoch2PublicSubmissionGatewayHoldV1,
  admitVoidEconomicEpoch2PublicSubmissionGatewayV1,
} from "../tools/void-economic-epoch2-public-submission-gateway-v1.mjs";

function replayStore({ staleHas = false } = {}) {
  const consumed = new Set();
  return {
    has(digest) {
      return staleHas ? false : consumed.has(digest);
    },
    async consumeIfFresh(digest) {
      if (consumed.has(digest)) {
        return {
          consumed: false,
          already_consumed: true,
          atomic: true,
        };
      }
      consumed.add(digest);
      await Promise.resolve();
      return {
        consumed: true,
        already_consumed: false,
        atomic: true,
      };
    },
  };
}

function trustedClock(...values) {
  assert(values.length > 0);
  let index = 0;
  return {
    nowUnix() {
      const selected = values[Math.min(index, values.length - 1)];
      index += 1;
      return String(selected);
    },
    monotonicNowMs() {
      return 0;
    },
  };
}

function trustedClockWithMonotonic(unixValues, monotonicValues) {
  assert(unixValues.length > 0);
  assert(monotonicValues.length > 0);
  let unixIndex = 0;
  let monotonicIndex = 0;
  return {
    nowUnix() {
      const selected =
        unixValues[Math.min(unixIndex, unixValues.length - 1)];
      unixIndex += 1;
      return String(selected);
    },
    monotonicNowMs() {
      const selected =
        monotonicValues[
          Math.min(monotonicIndex, monotonicValues.length - 1)
        ];
      monotonicIndex += 1;
      return selected;
    },
  };
}

async function expectGatewayHold(run, reason) {
  let thrown = null;
  try {
    await run();
  } catch (error) {
    thrown = error;
  }
  assert(thrown, "expected gateway hold: " + reason);
  assert(
    thrown instanceof VoidEconomicEpoch2PublicSubmissionGatewayHoldV1,
    "wrong gateway error: " + String(thrown),
  );
  assert.equal(thrown.reason, reason);
}

const wallet = Wallet.createRandom();
const signer = wallet.address.toLowerCase();
const target = "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const calldata =
  "0xa9059cbb" +
  "0000000000000000000000000000000000000000000000000000000000000001" +
  "0000000000000000000000000000000000000000000000000000000000000001";
const now = 2_000_000_000n;

const intent = buildVoidEconomicEpoch2SignedSubmissionIntentV1({
  signer,
  nonce: "42",
  issuedAtUnix: String(now - 10n),
  expiresAtUnix: String(now + 110n),
  target,
  gasLimit: "100000",
  calldata,
});
const typed = voidEconomicEpoch2SignedSubmissionTypedDataV1(intent);
const signature = await wallet.signTypedData(
  typed.domain,
  VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_TYPES_V1,
  typed.value,
);

const store = replayStore();
const admitted = await admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
  intent,
  calldata,
  signature,
  trustedClock: trustedClock(now, now),
  replayConsumeTimeoutMs: 100,
  allowedTargets: [target],
  replayStore: store,
});

assert.equal(
  admitted.marker,
  VOID_ECONOMIC_EPOCH2_PUBLIC_SUBMISSION_GATEWAY_CORE_V1,
);
assert.equal(admitted.ok, true);
assert.equal(admitted.status, "SOURCE_GATEWAY_ADMISSION_REPLAY_CONSUMED");
assert.equal(admitted.chain_id, 2050);
assert.equal(admitted.execution_epoch, 2);
assert.equal(
  admitted.gateway_id,
  VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_GATEWAY_ID_V1,
);
assert.equal(admitted.signer, signer);
assert.equal(admitted.nonce, "42");
assert.equal(admitted.target, target);
assert.equal(admitted.signed_submission_source_primitive_proven, true);
assert.equal(admitted.signed_intent_exact_data_snapshot_verified, true);
assert.equal(admitted.execution_epoch_bound_in_public_gateway, true);
assert.equal(admitted.atomic_replay_digest_consumed, true);
assert.equal(admitted.external_replay_precheck_used, false);
assert.equal(admitted.atomic_consume_is_sole_replay_authority, true);
assert.equal(admitted.expiry_rechecked_after_replay_consume, true);
assert.equal(admitted.requested_replay_consume_timeout_ms, 100);
assert.equal(admitted.effective_replay_consume_timeout_ms, 100);
assert.equal(admitted.replay_consume_timeout_bounded_by_intent_expiry, true);
assert.equal(admitted.replay_consume_deadline_enforced, true);
assert.equal(admitted.replay_consume_monotonic_elapsed_checked, true);
assert.equal(admitted.replay_result_inspection_included_in_deadline, true);
assert.equal(admitted.replay_consume_elapsed_ms, 0);
assert.equal(admitted.replay_consume_abort_signal_supplied, false);
assert.equal(admitted.replay_adapter_cancellation_callback_exposed, false);
assert.equal(admitted.durable_replay_store_verified, false);
assert.equal(
  admitted.privileged_signer_nonce_or_key_replay_fence_proven,
  false,
);
assert.equal(admitted.pending_legacy_signed_transaction_census_complete, false);
assert.equal(admitted.cross_epoch_replay_protection_proven, false);
assert.equal(admitted.runtime_route_active, false);
assert.equal(admitted.public_submission_open, false);
assert.equal(admitted.transaction_submission, false);
assert.equal(admitted.transaction_broadcast, false);
assert.equal(admitted.authoritative_chain2050_write, false);
assert.equal(admitted.migration_authorized, false);
assert.equal(admitted.public_activation, false);
assert.equal(admitted.funds_movement, false);

{
  let getterCalls = 0;
  const accessorIntent = { ...intent };
  Object.defineProperty(accessorIntent, "expires_at_unix", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return intent.expires_at_unix;
    },
  });
  await expectGatewayHold(
    () =>
      admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
        intent: accessorIntent,
        calldata,
        signature,
        trustedClock: trustedClock(now, now),
        replayConsumeTimeoutMs: 100,
        allowedTargets: [target],
        replayStore: replayStore(),
      }),
    "signed_intent_snapshot_invalid",
  );
  assert.equal(getterCalls, 0);
}

{
  const revocable = Proxy.revocable({ ...intent }, {});
  revocable.revoke();
  await expectGatewayHold(
    () =>
      admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
        intent: revocable.proxy,
        calldata,
        signature,
        trustedClock: trustedClock(now, now),
        replayConsumeTimeoutMs: 100,
        allowedTargets: [target],
        replayStore: replayStore(),
      }),
    "signed_intent_snapshot_invalid",
  );
}

{
  const revocable = Proxy.revocable(trustedClock(now, now), {});
  revocable.revoke();
  await expectGatewayHold(
    () =>
      admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
        intent,
        calldata,
        signature,
        trustedClock: revocable.proxy,
        replayConsumeTimeoutMs: 100,
        allowedTargets: [target],
        replayStore: replayStore(),
      }),
    "trusted_clock_required",
  );
}

{
  const thrown = Proxy.revocable({}, {});
  thrown.revoke();
  const trappingClock = new Proxy({}, {
    getPrototypeOf() {
      throw thrown.proxy;
    },
  });
  await expectGatewayHold(
    () =>
      admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
        intent,
        calldata,
        signature,
        trustedClock: trappingClock,
        replayConsumeTimeoutMs: 100,
        allowedTargets: [target],
        replayStore: replayStore(),
      }),
    "trusted_clock_required",
  );
}

{
  const thrown = Proxy.revocable({}, {});
  thrown.revoke();
  const trappingStore = new Proxy({}, {
    getPrototypeOf() {
      throw thrown.proxy;
    },
  });
  await expectGatewayHold(
    () =>
      admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
        intent,
        calldata,
        signature,
        trustedClock: trustedClock(now, now),
        replayConsumeTimeoutMs: 100,
        allowedTargets: [target],
        replayStore: trappingStore,
      }),
    "atomic_replay_store_required",
  );
}

{
  const result = Proxy.revocable(
    { consumed: true, already_consumed: false, atomic: true },
    {},
  );
  result.revoke();
  await expectGatewayHold(
    () =>
      admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
        intent,
        calldata,
        signature,
        trustedClock: trustedClock(now, now),
        replayConsumeTimeoutMs: 100,
        allowedTargets: [target],
        replayStore: {
          async consumeIfFresh() {
            return result.proxy;
          },
        },
      }),
    "atomic_replay_consume_failed",
  );
}

{
  const thrown = Proxy.revocable({}, {});
  thrown.revoke();
  const trappingResult = new Proxy({}, {
    getPrototypeOf() {
      throw thrown.proxy;
    },
  });
  await expectGatewayHold(
    () =>
      admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
        intent,
        calldata,
        signature,
        trustedClock: trustedClock(now, now),
        replayConsumeTimeoutMs: 100,
        allowedTargets: [target],
        replayStore: {
          async consumeIfFresh() {
            return trappingResult;
          },
        },
      }),
    "atomic_replay_consume_result_invalid",
  );
}

{
  let thrown = null;
  try {
    await admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
      intent,
      calldata,
      signature,
      trustedClock: trustedClock(now, now),
      replayConsumeTimeoutMs: 100,
      allowedTargets: [target],
      replayStore: store,
    });
  } catch (error) {
    thrown = error;
  }
  assert(thrown);
  assert.equal(thrown.reason, "intent_replay_detected_at_atomic_consume");
}

{
  const raceStore = replayStore({ staleHas: true });
  const results = await Promise.allSettled([
    admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
      intent,
      calldata,
      signature,
      trustedClock: trustedClock(now, now),
      replayConsumeTimeoutMs: 100,
      allowedTargets: [target],
      replayStore: raceStore,
    }),
    admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
      intent,
      calldata,
      signature,
      trustedClock: trustedClock(now, now),
      replayConsumeTimeoutMs: 100,
      allowedTargets: [target],
      replayStore: raceStore,
    }),
  ]);
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  const rejected = results.find((result) => result.status === "rejected");
  assert(rejected);
  assert(
    rejected.reason instanceof VoidEconomicEpoch2PublicSubmissionGatewayHoldV1,
  );
  assert.equal(
    rejected.reason.reason,
    "intent_replay_detected_at_atomic_consume",
  );
}

await expectGatewayHold(
  () =>
    admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
      intent,
      calldata,
      signature,
      trustedClock: trustedClock(now, now),
      replayConsumeTimeoutMs: 100,
      allowedTargets: new Array(257).fill(target),
      replayStore: replayStore(),
    }),
  "target_allowlist_invalid",
);

{
  let ownKeysCalls = 0;
  const oversized = new Proxy(new Array(257).fill(target), {
    ownKeys() {
      ownKeysCalls += 1;
      throw new Error("descriptor expansion must not run");
    },
  });
  await expectGatewayHold(
    () =>
      admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
        intent,
        calldata,
        signature,
        trustedClock: trustedClock(now, now),
        replayConsumeTimeoutMs: 100,
        allowedTargets: oversized,
        replayStore: replayStore(),
      }),
    "target_allowlist_invalid",
  );
  assert.equal(ownKeysCalls, 0);
}

await expectGatewayHold(
  () =>
    admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
      intent,
      calldata: "0x" + "00".repeat(744_751),
      signature,
      trustedClock: trustedClock(now, now),
      replayConsumeTimeoutMs: 100,
      allowedTargets: [target],
      replayStore: replayStore(),
    }),
  "calldata_above_gateway_bound",
);

await expectGatewayHold(
  () =>
    admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
      intent,
      calldata,
      signature,
      trustedClock: trustedClock(now, now),
      replayConsumeTimeoutMs: 100,
      allowedTargets: [target],
      replayStore: {
        has() {
          return false;
        },
        async consumeIfFresh() {
          return {
            consumed: true,
            already_consumed: false,
            atomic: false,
          };
        },
      },
    }),
  "atomic_replay_consume_result_invalid",
);

{
  let nonceSeed = 100n;
  for (const contradictory of [
    { consumed: true, already_consumed: true, atomic: true },
    { consumed: false, already_consumed: false, atomic: true },
    { consumed: true, already_consumed: false, atomic: false },
    { consumed: false, already_consumed: true, atomic: false },
  ]) {
    const tupleIntent = buildVoidEconomicEpoch2SignedSubmissionIntentV1({
      signer,
      nonce: String(nonceSeed),
      issuedAtUnix: String(now - 10n),
      expiresAtUnix: String(now + 110n),
      target,
      gasLimit: "100000",
      calldata,
    });
    nonceSeed += 1n;
    const tupleTyped =
      voidEconomicEpoch2SignedSubmissionTypedDataV1(tupleIntent);
    const tupleSignature = await wallet.signTypedData(
      tupleTyped.domain,
      VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_TYPES_V1,
      tupleTyped.value,
    );
    await expectGatewayHold(
      () =>
        admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
          intent: tupleIntent,
          calldata,
          signature: tupleSignature,
          trustedClock: trustedClock(now, now),
          replayConsumeTimeoutMs: 100,
          allowedTargets: [target],
          replayStore: {
            async consumeIfFresh() {
              return contradictory;
            },
          },
        }),
      "atomic_replay_consume_result_invalid",
    );
  }
}

{
  await expectGatewayHold(
    () =>
      admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
        intent,
        calldata,
        signature,
        trustedClock: {
          nowUnix() {
            return Promise.reject(new Error("clock backend rejected"));
          },
          monotonicNowMs() {
            return 0;
          },
        },
        replayConsumeTimeoutMs: 100,
        allowedTargets: [target],
        replayStore: replayStore(),
      }),
    "trusted_clock_async_provider_forbidden",
  );
  await Promise.resolve();
}

{
  const thenable = {};
  Object.defineProperty(thenable, "then", {
    get() {
      throw new Error("then getter failed");
    },
  });
  await expectGatewayHold(
    () =>
      admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
        intent,
        calldata,
        signature,
        trustedClock: {
          nowUnix() {
            return thenable;
          },
          monotonicNowMs() {
            return 0;
          },
        },
        replayConsumeTimeoutMs: 100,
        allowedTargets: [target],
        replayStore: replayStore(),
      }),
    "trusted_clock_read_failed",
  );
}

{
  await expectGatewayHold(
    () =>
      admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
        intent,
        calldata,
        signature,
        trustedClock: {
          nowUnix() {
            return String(now);
          },
          monotonicNowMs() {
            return Promise.reject(new Error("monotonic backend rejected"));
          },
        },
        replayConsumeTimeoutMs: 100,
        allowedTargets: [target],
        replayStore: replayStore(),
      }),
    "trusted_monotonic_clock_async_provider_forbidden",
  );
  await Promise.resolve();
}

{
  await expectGatewayHold(
    () =>
      admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
        intent,
        calldata,
        signature,
        trustedClock: trustedClockWithMonotonic(
          [now, now],
          [1_000, 1_101],
        ),
        replayConsumeTimeoutMs: 100,
        allowedTargets: [target],
        replayStore: replayStore(),
      }),
    "atomic_replay_consume_timeout",
  );
}

{
  await expectGatewayHold(
    () =>
      admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
        intent,
        calldata,
        signature,
        trustedClock: trustedClockWithMonotonic(
          [now, now],
          [2_000, 2_101],
        ),
        replayConsumeTimeoutMs: 100,
        allowedTargets: [target],
        replayStore: {
          async consumeIfFresh() {
            return {
              consumed: false,
              already_consumed: true,
              atomic: true,
            };
          },
        },
      }),
    "atomic_replay_consume_timeout",
  );
}

{
  await expectGatewayHold(
    () =>
      admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
        intent,
        calldata,
        signature,
        trustedClock: trustedClockWithMonotonic(
          [now, now],
          [3_000, 3_101],
        ),
        replayConsumeTimeoutMs: 100,
        allowedTargets: [target],
        replayStore: {
          async consumeIfFresh() {
            return {
              consumed: true,
              already_consumed: true,
              atomic: true,
            };
          },
        },
      }),
    "atomic_replay_consume_timeout",
  );
}

{
  await expectGatewayHold(
    () =>
      admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
        intent,
        calldata,
        signature,
        trustedClock: trustedClockWithMonotonic(
          [now, now],
          [4_000, 4_101],
        ),
        replayConsumeTimeoutMs: 100,
        allowedTargets: [target],
        replayStore: {
          async consumeIfFresh() {
            throw new Error("blocking adapter failure");
          },
        },
      }),
    "atomic_replay_consume_timeout",
  );
}

{
  const trappingResult = new Proxy(
    {
      consumed: true,
      already_consumed: false,
      atomic: true,
    },
    {
      getPrototypeOf() {
        throw new Error("inspection failed after deadline");
      },
    },
  );
  await expectGatewayHold(
    () =>
      admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
        intent,
        calldata,
        signature,
        trustedClock: trustedClockWithMonotonic(
          [now, now],
          [4_500, 4_501, 4_601],
        ),
        replayConsumeTimeoutMs: 100,
        allowedTargets: [target],
        replayStore: {
          async consumeIfFresh() {
            return trappingResult;
          },
        },
      }),
    "atomic_replay_consume_timeout",
  );
}

{
  const structurallyValidProxy = new Proxy(
    {
      consumed: true,
      already_consumed: false,
      atomic: true,
    },
    {
      getPrototypeOf() {
        return Object.prototype;
      },
      ownKeys(target) {
        return Reflect.ownKeys(target);
      },
      getOwnPropertyDescriptor(target, key) {
        return Object.getOwnPropertyDescriptor(target, key);
      },
    },
  );
  await expectGatewayHold(
    () =>
      admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
        intent,
        calldata,
        signature,
        trustedClock: trustedClockWithMonotonic(
          [now, now],
          [5_000, 5_001, 5_101],
        ),
        replayConsumeTimeoutMs: 100,
        allowedTargets: [target],
        replayStore: {
          async consumeIfFresh() {
            return structurallyValidProxy;
          },
        },
      }),
    "atomic_replay_consume_timeout",
  );
}

{
  await expectGatewayHold(
    () =>
      admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
        intent,
        calldata,
        signature,
        trustedClock: trustedClockWithMonotonic(
          [now, now],
          [1_001, 1_000],
        ),
        replayConsumeTimeoutMs: 100,
        allowedTargets: [target],
        replayStore: replayStore(),
      }),
    "trusted_monotonic_clock_nonmonotonic",
  );
}

{
  await expectGatewayHold(
    () =>
      admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
        intent,
        calldata,
        signature,
        trustedClock: trustedClock(now, now - 1n),
        replayConsumeTimeoutMs: 100,
        allowedTargets: [target],
        replayStore: replayStore(),
      }),
    "trusted_clock_nonmonotonic",
  );
}

{
  let externalPrecheckCalls = 0;
  const noPrecheckStore = {
    has() {
      externalPrecheckCalls += 1;
      return Promise.reject(new Error("must never be observed"));
    },
    async consumeIfFresh() {
      return {
        consumed: true,
        already_consumed: false,
        atomic: true,
      };
    },
  };
  const noPrecheckIntent = buildVoidEconomicEpoch2SignedSubmissionIntentV1({
    signer,
    nonce: "43",
    issuedAtUnix: String(now - 10n),
    expiresAtUnix: String(now + 110n),
    target,
    gasLimit: "100000",
    calldata,
  });
  const noPrecheckTyped =
    voidEconomicEpoch2SignedSubmissionTypedDataV1(noPrecheckIntent);
  const noPrecheckSignature = await wallet.signTypedData(
    noPrecheckTyped.domain,
    VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_TYPES_V1,
    noPrecheckTyped.value,
  );
  const result = await admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
    intent: noPrecheckIntent,
    calldata,
    signature: noPrecheckSignature,
    trustedClock: trustedClock(now, now),
    replayConsumeTimeoutMs: 100,
    allowedTargets: [target],
    replayStore: noPrecheckStore,
  });
  assert.equal(result.ok, true);
  assert.equal(result.external_replay_precheck_used, false);
  assert.equal(result.atomic_consume_is_sole_replay_authority, true);
  assert.equal(externalPrecheckCalls, 0);
}

{
  const expiringStore = replayStore();
  await expectGatewayHold(
    () =>
      admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
        intent,
        calldata,
        signature,
        trustedClock: trustedClock(now, intent.expires_at_unix),
        replayConsumeTimeoutMs: 100,
        allowedTargets: [target],
        replayStore: expiringStore,
      }),
    "intent_expired_after_replay_consume",
  );
}

{
  let optionsObserved = null;
  await expectGatewayHold(
    () =>
      admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
        intent,
        calldata,
        signature,
        trustedClock: trustedClock(now, now),
        replayConsumeTimeoutMs: 20,
        allowedTargets: [target],
        replayStore: {
          async consumeIfFresh(_digest, _metadata, options) {
            optionsObserved = options;
            return await new Promise(() => {});
          },
        },
      }),
    "atomic_replay_consume_timeout",
  );
  assert.deepEqual(optionsObserved, { timeout_ms: 20 });
  assert.equal(Object.hasOwn(optionsObserved, "signal"), false);
}

{
  const trappingResult = new Proxy(
    {
      consumed: true,
      already_consumed: false,
      atomic: true,
    },
    {
      getPrototypeOf() {
        throw new Error("prototype trap");
      },
    },
  );
  await expectGatewayHold(
    () =>
      admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
        intent,
        calldata,
        signature,
        trustedClock: trustedClock(now, now),
        replayConsumeTimeoutMs: 100,
        allowedTargets: [target],
        replayStore: {
          async consumeIfFresh() {
            return trappingResult;
          },
        },
      }),
    "atomic_replay_consume_result_invalid",
  );
}

{
  const { proxy, revoke } = Proxy.revocable(
    {
      async consumeIfFresh() {
        return {
          consumed: true,
          already_consumed: false,
          atomic: true,
        };
      },
    },
    {},
  );
  revoke();
  await expectGatewayHold(
    () =>
      admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
        intent,
        calldata,
        signature,
        trustedClock: trustedClock(now, now),
        replayConsumeTimeoutMs: 100,
        allowedTargets: [target],
        replayStore: proxy,
      }),
    "atomic_replay_store_required",
  );
}

await expectGatewayHold(
  () =>
    admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
      intent,
      calldata,
      signature,
      trustedClock: trustedClock(now, now),
      replayConsumeTimeoutMs: 5001,
      allowedTargets: [target],
      replayStore: replayStore(),
    }),
  "replay_consume_timeout_ms_invalid",
);

for (const [key, value] of Object.entries(
  VOID_ECONOMIC_EPOCH2_PUBLIC_SUBMISSION_GATEWAY_AUTHORITY_V1,
)) {
  assert.equal(
    key === "source_only" ||
      key === "signed_intent_verification" ||
      key === "atomic_replay_consume_required"
      ? value
      : !value,
    true,
    key,
  );
}

const source = fs.readFileSync(
  "tools/void-economic-epoch2-public-submission-gateway-v1.mjs",
  "utf8",
);
assert.doesNotMatch(source, /eth_sendRawTransaction|eth_sendTransaction/);
assert.doesNotMatch(source, /broadcastTransaction\s*\(/);
assert.doesNotMatch(source, /new\s+Wallet\s*\(/);
assert.doesNotMatch(
  source,
  /mnemonic|PRIVATE_KEY\s*=|process\.env\.[A-Z0-9_]*PRIVATE_KEY|new\s+Wallet\s*\(|fromPhrase\s*\(|fromMnemonic\s*\(/i,
);
assert.match(source, /execution_epoch_bound_in_public_gateway: true/);
assert(
  source.indexOf('Object.getOwnPropertyDescriptor(value, "length")') <
    source.indexOf("Object.getOwnPropertyDescriptors(value)"),
  "allowlist length must be bounded before descriptor expansion",
);
assert.match(source, /signed_intent_exact_data_snapshot_verified: true/);
assert.match(source, /signed_intent_snapshot_invalid/);
assert.doesNotMatch(source, /error instanceof VoidEconomicEpoch2PublicSubmissionGatewayHoldV1/);
assert.match(source, /expiry_rechecked_after_replay_consume: true/);
assert.match(source, /trusted_clock_async_provider_forbidden/);
assert.match(source, /Promise\.resolve\(observed\)\.catch/);
assert.match(source, /replay_consume_deadline_enforced: true/);
assert.match(source, /replay_consume_monotonic_elapsed_checked: true/);
assert.match(source, /replay_result_inspection_included_in_deadline: true/);
assert.match(
  source,
  /consumeTimedOut \|\|\s*consumeReturnedAtMs - consumeStartedAtMs >= consumeTimeoutMs/,
);
assert.match(source, /consumeElapsedMs >= consumeTimeoutMs/);
assert(
  source.indexOf("consumeReturnedAtMs - consumeStartedAtMs") <
    source.indexOf("if (consumeFailed)"),
  "return-time timeout must precede consume failure classification",
);
assert(
  source.indexOf("consumeElapsedMs >= consumeTimeoutMs") <
    source.indexOf("if (consumeResultInvalid"),
  "post-inspection timeout must precede invalid-result classification",
);
assert(
  source.indexOf("consumeElapsedMs >= consumeTimeoutMs") <
    source.indexOf("if (replayConsume)"),
  "post-inspection timeout must precede replay classification",
);
assert.match(source, /external_replay_precheck_used: false/);
assert.match(source, /atomic_consume_is_sole_replay_authority: true/);
assert.match(source, /const freshConsume/);
assert.match(source, /const replayConsume/);
assert.doesNotMatch(source, /controller\.abort\(\)/);
assert.match(source, /replay_adapter_cancellation_callback_exposed: false/);
assert.match(source, /atomic_replay_consume_result_invalid/);
assert(
  source.indexOf("value.length > MAX_CALLDATA_TEXT_LENGTH") <
    source.indexOf("!/^0x(?:[0-9a-f]{2})*$/.test(value)"),
  "calldata length bound must run before canonical-hex regex",
);
assert.match(source, /runtime_route_active: false/);
assert.match(source, /transaction_submission: false/);
assert.match(source, /transaction_broadcast: false/);

console.log("VOID_ECONOMIC_EPOCH2_PUBLIC_SUBMISSION_GATEWAY_CORE_V1_GREEN");
console.log("signed_submission_source_primitive_proven=true");
console.log("signed_intent_exact_data_snapshot_verified=true");
console.log("intent_accessor_not_executed=true");
console.log("revoked_intent_proxy_mapped_to_hold=true");
console.log("trapping_clock_structure_mapped_to_hold=true");
console.log("trapping_replay_store_structure_mapped_to_hold=true");
console.log("trapping_replay_result_structure_mapped_to_hold=true");
console.log("execution_epoch_bound_in_public_gateway=true");
console.log("atomic_replay_consume_required=true");
console.log("same_digest_concurrent_admission_exactly_one=true");
console.log("calldata_length_rejected_before_regex=true");
console.log("allowlist_length_rejected_before_descriptor_expansion=true");
console.log("replay_consume_deadline_enforced=true");
console.log("replay_consume_monotonic_elapsed_checked=true");
console.log("replay_result_inspection_included_in_deadline=true");
console.log("invalid_replay_result_deadline_precedence=true");
console.log("blocking_consume_deadline_backstop=true");
console.log("replay_consume_timeout_precedes_error_classification=true");
console.log("replay_consume_timeout_precedes_replay_classification=true");
console.log("replay_consume_timeout_precedes_invalid_tuple_classification=true");
console.log("trusted_monotonic_clock_sync_only=true");
console.log("replay_consume_timeout_bounded_by_intent_expiry=true");
console.log("trusted_clock_monotonicity_enforced=true");
console.log("trusted_clock_sync_only=true");
console.log("trusted_clock_rejected_promises_quenched=true");
console.log("replay_consume_abort_signal_supplied=false");
console.log("replay_adapter_cancellation_callback_exposed=false");
console.log("trapping_replay_result_normalized_to_hold=true");
console.log("external_replay_precheck_used=false");
console.log("atomic_consume_is_sole_replay_authority=true");
console.log("replay_consume_allowed_tuple_count=2");
console.log("contradictory_replay_consume_tuples_rejected=true");
console.log("expiry_rechecked_after_replay_consume=true");
console.log("durable_replay_store_verified=false");
console.log("privileged_signer_nonce_or_key_replay_fence_proven=false");
console.log("pending_legacy_signed_transaction_census_complete=false");
console.log("cross_epoch_replay_protection_proven=false");
console.log("runtime_route_active=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("authoritative_chain2050_write=false");
console.log("migration_authorized=false");
console.log("public_activation=false");
console.log("funds_movement=false");
