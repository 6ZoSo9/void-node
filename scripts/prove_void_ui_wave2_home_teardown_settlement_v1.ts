import assert from "node:assert/strict";

import {
  VOID_UI_WAVE2_HOME_SOURCE_MAX_RESPONSE_BYTES_V1,
  VOID_UI_WAVE2_HOME_SOURCE_TEARDOWN_MS_V1,
  VoidUiWave2HomeSnapshotBuildOwnerV1,
  VoidUiWave2HomeSourceAcquisitionOwnerV1,
  fetchVoidUiWave2HomeSourceJsonV1,
  type VoidUiWave2HomeSourceResultV1,
} from "../src/ui/void_app_wave2_home_source_fetch_v1.js";

type Deferred = {
  promise: Promise<void>;
  resolve: () => void;
};

const deferred = (): Deferred => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const oversizeDeclaredResponse = (
  onCancel: () => Promise<void>
): Response =>
  new Response(
    new ReadableStream<Uint8Array>({
      cancel: onCancel,
    }),
    {
      status: 200,
      headers: {
        "content-length": String(
          VOID_UI_WAVE2_HOME_SOURCE_MAX_RESPONSE_BYTES_V1 + 1
        ),
      },
    }
  );

async function main(): Promise<void> {
  const owner =
    new VoidUiWave2HomeSnapshotBuildOwnerV1<VoidUiWave2HomeSourceResultV1>();
  const declaredGate = deferred();
  let declaredCancelStarted = false;
  let declaredCancelFinished = false;
  let declaredSettled = false;

  const first = owner.getOrStart(() =>
    fetchVoidUiWave2HomeSourceJsonV1(
      "http://127.0.0.1:4100",
      "/health",
      {
        timeoutMs: 200,
        fetchImpl: async () =>
          oversizeDeclaredResponse(async () => {
            declaredCancelStarted = true;
            await declaredGate.promise;
            declaredCancelFinished = true;
          }),
      }
    )
  );
  void first.finally(() => {
    declaredSettled = true;
  });

  const overlapping = owner.getOrStart(async () => ({
    ok: true,
    status: 200,
    body: { unexpected_second_batch: true },
  }));
  assert.strictEqual(first, overlapping);

  await sleep(10);
  assert.equal(declaredCancelStarted, true);
  assert.equal(declaredCancelFinished, false);
  assert.equal(declaredSettled, false);
  assert.equal(owner.hasInFlight(), true);

  declaredGate.resolve();
  const declaredResult = await first;
  assert.equal(declaredResult.ok, false);
  assert.equal(declaredResult.error, "source_body_too_large");
  assert.equal(declaredCancelFinished, true);
  assert.equal(owner.hasInFlight(), false);

  const streamedGate = deferred();
  let streamedCancelStarted = false;
  let streamedCancelFinished = false;
  let streamedSettled = false;

  const streamed = fetchVoidUiWave2HomeSourceJsonV1(
    "http://127.0.0.1:4100",
    "/p2p/peers",
    {
      timeoutMs: 200,
      fetchImpl: async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(
                new Uint8Array(
                  VOID_UI_WAVE2_HOME_SOURCE_MAX_RESPONSE_BYTES_V1
                )
              );
              controller.enqueue(new Uint8Array(1));
            },
            async cancel() {
              streamedCancelStarted = true;
              await streamedGate.promise;
              streamedCancelFinished = true;
            },
          }),
          { status: 200 }
        ),
    }
  );
  void streamed.finally(() => {
    streamedSettled = true;
  });

  await sleep(10);
  assert.equal(streamedCancelStarted, true);
  assert.equal(streamedCancelFinished, false);
  assert.equal(streamedSettled, false);

  streamedGate.resolve();
  const streamedResult = await streamed;
  assert.equal(streamedResult.ok, false);
  assert.equal(streamedResult.error, "source_body_too_large");
  assert.equal(streamedCancelFinished, true);

  let boundedCancelStarted = false;
  const keepAlive = setTimeout(() => {}, 250);
  const deadlineStart = Date.now();
  const bounded = await fetchVoidUiWave2HomeSourceJsonV1(
    "http://127.0.0.1:4100",
    "/health",
    {
      timeoutMs: 30,
      fetchImpl: async () =>
        oversizeDeclaredResponse(
          () =>
            new Promise<void>(() => {
              boundedCancelStarted = true;
            })
        ),
    }
  );
  clearTimeout(keepAlive);

  const deadlineElapsed = Date.now() - deadlineStart;
  assert.equal(boundedCancelStarted, true);
  assert.equal(bounded.ok, false);
  assert.equal(bounded.error, "source_body_too_large");
  assert.ok(
    deadlineElapsed <
      30 + VOID_UI_WAVE2_HOME_SOURCE_TEARDOWN_MS_V1 + 250,
    `teardown exceeded separate bounded terminal: ${deadlineElapsed}ms`
  );

  const delayedTerminalOwner =
    new VoidUiWave2HomeSourceAcquisitionOwnerV1();
  const delayedTerminalGate = deferred();
  let delayedTerminalCancelStarted = false;
  const delayedTerminalStart = Date.now();
  const delayedTerminal = await fetchVoidUiWave2HomeSourceJsonV1(
    "http://127.0.0.1:4100",
    "/delayed-terminal",
    {
      timeoutMs: 1000,
      acquisitionOwner: delayedTerminalOwner,
      acquisitionKey: "/delayed-terminal",
      fetchImpl: async () =>
        oversizeDeclaredResponse(async () => {
          delayedTerminalCancelStarted = true;
          await delayedTerminalGate.promise;
        }),
    }
  );
  const delayedTerminalElapsed = Date.now() - delayedTerminalStart;
  assert.equal(delayedTerminalCancelStarted, true);
  assert.equal(delayedTerminal.ok, false);
  assert.equal(delayedTerminal.error, "source_body_too_large");
  assert.ok(
    delayedTerminalElapsed >=
      VOID_UI_WAVE2_HOME_SOURCE_TEARDOWN_MS_V1 - 25,
    `delayed terminal returned before teardown budget: ${delayedTerminalElapsed}ms`,
  );
  assert.equal(
    delayedTerminalOwner.hasPending("/delayed-terminal"),
    true,
  );
  delayedTerminalGate.resolve();
  await sleep(20);
  assert.equal(
    delayedTerminalOwner.hasPending("/delayed-terminal"),
    false,
  );

  let stalledReadStarted = false;
  let stalledCancelAttempts = 0;
  const stalledAcquisitionOwner =
    new VoidUiWave2HomeSourceAcquisitionOwnerV1();
  const stalledKeepAlive = setTimeout(() => {}, 1000);
  const stalledStart = Date.now();
  const stalled = owner.getOrStart(() =>
    fetchVoidUiWave2HomeSourceJsonV1(
      "http://127.0.0.1:4100",
      "/health",
      {
        timeoutMs: 30,
        acquisitionOwner: stalledAcquisitionOwner,
        acquisitionKey: "/health-stalled-body",
        fetchImpl: async () =>
          new Response(
            new ReadableStream<Uint8Array>({
              pull() {
                stalledReadStarted = true;
              },
              cancel() {
                stalledCancelAttempts += 1;
                return new Promise<void>(() => {});
              },
            }),
            { status: 200 }
          ),
      }
    )
  );
  const stalledOverlap = owner.getOrStart(async () => ({
    ok: true,
    status: 200,
    body: { unexpected_stalled_second_batch: true },
  }));
  assert.strictEqual(stalled, stalledOverlap);

  const stalledResult = await stalled;
  clearTimeout(stalledKeepAlive);
  const stalledElapsed = Date.now() - stalledStart;
  assert.equal(stalledReadStarted, true);
  assert.equal(stalledResult.ok, false);
  assert.equal(stalledResult.error, "source_deadline_exceeded");
  assert.equal(stalledCancelAttempts, 1);
  assert.ok(
    stalledElapsed <
      30 + VOID_UI_WAVE2_HOME_SOURCE_TEARDOWN_MS_V1 + 250,
    `stalled read escaped source deadline + teardown bound: ${stalledElapsed}ms`
  );
  assert.equal(owner.hasInFlight(), false);
  assert.equal(
    stalledAcquisitionOwner.hasPending("/health-stalled-body"),
    true,
  );
  assert.equal(stalledAcquisitionOwner.pendingCount(), 1);

  const unrelatedWhileStalled = await fetchVoidUiWave2HomeSourceJsonV1(
    "http://127.0.0.1:4100",
    "/p2p/peers",
    {
      timeoutMs: 100,
      acquisitionOwner: stalledAcquisitionOwner,
      acquisitionKey: "/p2p/peers",
      fetchImpl: async () =>
        new Response('{"ok":true}', { status: 200 }),
    }
  );
  assert.equal(unrelatedWhileStalled.ok, true);
  assert.equal(
    stalledAcquisitionOwner.hasPending("/health-stalled-body"),
    true,
  );
  assert.equal(stalledAcquisitionOwner.hasPending("/p2p/peers"), false);

  const settlingBodyOwner =
    new VoidUiWave2HomeSourceAcquisitionOwnerV1();
  let settlingBodyCancelAttempts = 0;
  const settlingBody = await fetchVoidUiWave2HomeSourceJsonV1(
    "http://127.0.0.1:4100",
    "/__void/ready.json",
    {
      timeoutMs: 20,
      acquisitionOwner: settlingBodyOwner,
      acquisitionKey: "/__void/ready.json",
      fetchImpl: async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            pull() {
              // Remain pending until the source deadline aborts the read.
            },
            cancel() {
              settlingBodyCancelAttempts += 1;
            },
          }),
          { status: 200 }
        ),
    }
  );
  assert.equal(settlingBody.ok, false);
  assert.equal(settlingBody.error, "source_deadline_exceeded");
  assert.equal(settlingBodyCancelAttempts, 1);
  assert.equal(
    settlingBodyOwner.hasPending("/__void/ready.json"),
    false,
  );

  for (const [label, cancel] of [
    [
      "reject",
      () => Promise.reject(new Error("synthetic_cancel_rejection")),
    ],
    [
      "throw",
      () => {
        throw new Error("synthetic_cancel_throw");
      },
    ],
  ] as const) {
    const failedCancelOwner =
      new VoidUiWave2HomeSourceAcquisitionOwnerV1();
    const result = await fetchVoidUiWave2HomeSourceJsonV1(
      "http://127.0.0.1:4100",
      `/cancel-${label}`,
      {
        timeoutMs: 100,
        acquisitionOwner: failedCancelOwner,
        acquisitionKey: `/cancel-${label}`,
        fetchImpl: async () =>
          oversizeDeclaredResponse(cancel as () => Promise<void>),
      }
    );
    assert.equal(result.ok, false);
    assert.equal(result.error, "source_body_too_large");
    assert.equal(
      failedCancelOwner.hasPending(`/cancel-${label}`),
      true,
    );
  }

  const neverAcquisitionOwner =
    new VoidUiWave2HomeSourceAcquisitionOwnerV1();
  let neverResolvingFetchCalls = 0;
  const neverFetchKeepAlive = setTimeout(() => {}, 1000);
  const neverFetchStart = Date.now();
  const neverFetch = owner.getOrStart(() =>
    fetchVoidUiWave2HomeSourceJsonV1(
      "http://127.0.0.1:4100",
      "/health",
      {
        timeoutMs: 30,
        acquisitionOwner: neverAcquisitionOwner,
        acquisitionKey: "/health",
        fetchImpl: async (_input, init) => {
          neverResolvingFetchCalls += 1;
          assert.equal(init?.signal instanceof AbortSignal, true);
          return await new Promise<Response>(() => {});
        },
      }
    )
  );
  const neverFetchOverlap = owner.getOrStart(async () => ({
    ok: true,
    status: 200,
    body: { unexpected_fetch_acquisition_second_batch: true },
  }));
  assert.strictEqual(neverFetch, neverFetchOverlap);

  const neverFetchResult = await neverFetch;
  clearTimeout(neverFetchKeepAlive);
  const neverFetchElapsed = Date.now() - neverFetchStart;
  assert.equal(neverResolvingFetchCalls, 1);
  assert.equal(neverFetchResult.ok, false);
  assert.equal(neverFetchResult.error, "source_deadline_exceeded");
  assert.ok(
    neverFetchElapsed < 30 + 250,
    `fetch acquisition escaped source deadline: ${neverFetchElapsed}ms`
  );
  assert.equal(owner.hasInFlight(), false);
  assert.equal(neverAcquisitionOwner.hasPending("/health"), true);
  assert.equal(neverAcquisitionOwner.pendingCount(), 1);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const quarantined = await fetchVoidUiWave2HomeSourceJsonV1(
      "http://127.0.0.1:4100",
      "/health",
      {
        timeoutMs: 30,
        acquisitionOwner: neverAcquisitionOwner,
        acquisitionKey: "/health",
        fetchImpl: async () => {
          neverResolvingFetchCalls += 1;
          return new Response("{}", { status: 200 });
        },
      }
    );
    assert.equal(quarantined.ok, false);
    assert.equal(quarantined.error, "source_acquisition_quarantined");
  }
  assert.equal(neverResolvingFetchCalls, 1);
  assert.equal(neverAcquisitionOwner.hasPending("/health"), true);
  assert.equal(neverAcquisitionOwner.pendingCount(), 1);

  const lateAcquisitionOwner =
    new VoidUiWave2HomeSourceAcquisitionOwnerV1();
  let resolveLateFetch!: (response: Response) => void;
  let lateFetchCalls = 0;
  let lateCancelAttempts = 0;
  const lateFetchKeepAlive = setTimeout(() => {}, 1000);
  const lateFetchStart = Date.now();
  const lateFetch = owner.getOrStart(() =>
    fetchVoidUiWave2HomeSourceJsonV1(
      "http://127.0.0.1:4100",
      "/health",
      {
        timeoutMs: 30,
        acquisitionOwner: lateAcquisitionOwner,
        acquisitionKey: "/health",
        fetchImpl: async () => {
          lateFetchCalls += 1;
          return await new Promise<Response>((resolve) => {
            resolveLateFetch = resolve;
          });
        },
      }
    )
  );

  const lateFetchResult = await lateFetch;
  const lateFetchElapsed = Date.now() - lateFetchStart;
  assert.equal(lateFetchCalls, 1);
  assert.equal(lateFetchResult.ok, false);
  assert.equal(lateFetchResult.error, "source_deadline_exceeded");
  assert.ok(
    lateFetchElapsed < 30 + 250,
    `late fetch acquisition escaped source deadline: ${lateFetchElapsed}ms`
  );
  assert.equal(owner.hasInFlight(), false);
  assert.equal(lateAcquisitionOwner.hasPending("/health"), true);

  const lateQuarantined = await fetchVoidUiWave2HomeSourceJsonV1(
    "http://127.0.0.1:4100",
    "/health",
    {
      timeoutMs: 30,
      acquisitionOwner: lateAcquisitionOwner,
      acquisitionKey: "/health",
      fetchImpl: async () => {
        lateFetchCalls += 1;
        return new Response("{}", { status: 200 });
      },
    }
  );
  assert.equal(lateQuarantined.ok, false);
  assert.equal(lateQuarantined.error, "source_acquisition_quarantined");
  assert.equal(lateFetchCalls, 1);

  resolveLateFetch(
    new Response(
      new ReadableStream<Uint8Array>({
        cancel() {
          lateCancelAttempts += 1;
          return new Promise<void>(() => {});
        },
      }),
      { status: 200 }
    )
  );

  await sleep(20);
  assert.equal(lateCancelAttempts, 1);
  assert.equal(lateAcquisitionOwner.hasPending("/health"), true);
  await sleep(VOID_UI_WAVE2_HOME_SOURCE_TEARDOWN_MS_V1 + 20);
  clearTimeout(lateFetchKeepAlive);
  assert.equal(lateCancelAttempts, 1);
  assert.equal(lateAcquisitionOwner.hasPending("/health"), true);
  assert.equal(lateAcquisitionOwner.pendingCount(), 1);

  const stillQuarantined = await fetchVoidUiWave2HomeSourceJsonV1(
    "http://127.0.0.1:4100",
    "/health",
    {
      timeoutMs: 100,
      acquisitionOwner: lateAcquisitionOwner,
      acquisitionKey: "/health",
      fetchImpl: async () => {
        lateFetchCalls += 1;
        return new Response('{"ok":true}', { status: 200 });
      },
    }
  );
  assert.equal(stillQuarantined.ok, false);
  assert.equal(stillQuarantined.error, "source_acquisition_quarantined");
  assert.equal(lateFetchCalls, 1);

  const settledLateOwner =
    new VoidUiWave2HomeSourceAcquisitionOwnerV1();
  let resolveSettledLate!: (response: Response) => void;
  let settledLateCancelAttempts = 0;
  const settledLate = await fetchVoidUiWave2HomeSourceJsonV1(
    "http://127.0.0.1:4100",
    "/health",
    {
      timeoutMs: 20,
      acquisitionOwner: settledLateOwner,
      acquisitionKey: "/health",
      fetchImpl: async () =>
        await new Promise<Response>((resolve) => {
          resolveSettledLate = resolve;
        }),
    }
  );
  assert.equal(settledLate.ok, false);
  assert.equal(settledLate.error, "source_deadline_exceeded");
  assert.equal(settledLateOwner.hasPending("/health"), true);
  resolveSettledLate(
    new Response(
      new ReadableStream<Uint8Array>({
        cancel() {
          settledLateCancelAttempts += 1;
        },
      }),
      { status: 200 }
    )
  );
  await sleep(20);
  assert.equal(settledLateCancelAttempts, 1);
  assert.equal(settledLateOwner.hasPending("/health"), false);

  const recovered = await fetchVoidUiWave2HomeSourceJsonV1(
    "http://127.0.0.1:4100",
    "/health",
    {
      timeoutMs: 100,
      acquisitionOwner: settledLateOwner,
      acquisitionKey: "/health",
      fetchImpl: async () =>
        new Response('{"ok":true}', { status: 200 }),
    }
  );
  assert.equal(recovered.ok, true);
  assert.equal(recovered.status, 200);
  assert.deepEqual(recovered.body, { ok: true });

  const tokenOwner = new VoidUiWave2HomeSourceAcquisitionOwnerV1();
  const tokenA = tokenOwner.begin("/token");
  assert.notEqual(tokenA, null);
  assert.equal(tokenOwner.finish("/token", tokenA!), true);
  const tokenB = tokenOwner.begin("/token");
  assert.notEqual(tokenB, null);
  assert.notEqual(tokenA, tokenB);
  assert.equal(tokenOwner.finish("/token", tokenA!), false);
  assert.equal(tokenOwner.hasPending("/token"), true);
  assert.equal(tokenOwner.finish("/token", tokenB!), true);
  assert.equal(tokenOwner.hasPending("/token"), false);

  const fresh = owner.getOrStart(async () => ({
    ok: true,
    status: 200,
    body: { fresh_batch_after_teardown: true },
  }));
  assert.deepEqual(await fresh, {
    ok: true,
    status: 200,
    body: { fresh_batch_after_teardown: true },
  });
  assert.equal(owner.hasInFlight(), false);

  console.log("VOID_UI_WAVE2_HOME_TEARDOWN_SETTLEMENT_V1_PROOF_GREEN");
  console.log("declared_cancel_awaited=true");
  console.log("streamed_cancel_awaited=true");
  console.log("snapshot_owner_retained_through_cancel=true");
  console.log("teardown_has_separate_bounded_terminal=true");
  console.log("late_true_teardown_terminal_releases_exact_token=true");
  console.log("stalled_read_raced_against_source_deadline=true");
  console.log("stalled_read_cancel_attempts=1");
  console.log("stalled_body_source_key_remains_quarantined=true");
  console.log("unrelated_source_key_remains_usable=true");
  console.log("body_deadline_fulfilled_cancel_releases_token=true");
  console.log("cancel_rejection_or_throw_quarantines_token=true");
  console.log("fetch_acquisition_raced_against_source_deadline=true");
  console.log("never_resolving_fetch_persistent_quarantine=true");
  console.log("never_resolving_fetch_repeated_refreshes=3");
  console.log("late_response_cancel_attempts=1");
  console.log("late_response_cleanup_bounded=true");
  console.log("late_response_never_settling_cancel_stays_quarantined=true");
  console.log("late_response_fulfilled_cancel_releases_exact_token=true");
  console.log("late_predecessor_token_cannot_retire_successor=true");
  console.log("fresh_source_generation_after_true_terminal=true");
  console.log("fresh_batch_after_teardown=true");
  console.log("authority_added=false");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
