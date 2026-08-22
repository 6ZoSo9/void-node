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
    new ReadableStream<Uint8Array>({ cancel: onCancel }),
    {
      status: 200,
      headers: {
        "content-length": String(
          VOID_UI_WAVE2_HOME_SOURCE_MAX_RESPONSE_BYTES_V1 + 1
        ),
      },
    }
  );

const assertQuarantinedRetries = async (input: {
  owner: VoidUiWave2HomeSourceAcquisitionOwnerV1;
  key: string;
  attempts: number;
  onUnexpectedFetch: () => void;
}): Promise<void> => {
  for (let attempt = 0; attempt < input.attempts; attempt += 1) {
    const result = await fetchVoidUiWave2HomeSourceJsonV1(
      "http://127.0.0.1:4100",
      "/health",
      {
        timeoutMs: 30,
        acquisitionOwner: input.owner,
        acquisitionKey: input.key,
        fetchImpl: async () => {
          input.onUnexpectedFetch();
          return new Response('{"ok":true}', { status: 200 });
        },
      }
    );
    assert.equal(result.ok, false);
    assert.equal(result.error, "source_acquisition_quarantined");
  }
};

async function main(): Promise<void> {
  const proofKeepAlive = setTimeout(() => {}, 10_000);
  try {
    const snapshotOwner =
      new VoidUiWave2HomeSnapshotBuildOwnerV1<VoidUiWave2HomeSourceResultV1>();

    const declaredGate = deferred();
    let declaredCancelStarted = false;
    let declaredCancelFinished = false;
    let declaredSettled = false;
    const declared = snapshotOwner.getOrStart(() =>
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
    void declared.finally(() => {
      declaredSettled = true;
    });
    const overlap = snapshotOwner.getOrStart(async () => ({
      ok: true,
      status: 200,
      body: { unexpected_second_batch: true },
    }));
    assert.strictEqual(declared, overlap);

    await sleep(10);
    assert.equal(declaredCancelStarted, true);
    assert.equal(declaredCancelFinished, false);
    assert.equal(declaredSettled, false);
    assert.equal(snapshotOwner.hasInFlight(), true);
    declaredGate.resolve();
    const declaredResult = await declared;
    assert.equal(declaredResult.ok, false);
    assert.equal(declaredResult.error, "source_body_too_large");
    assert.equal(declaredCancelFinished, true);
    assert.equal(snapshotOwner.hasInFlight(), false);

    const streamedGate = deferred();
    let streamedCancelStarted = false;
    let streamedCancelFinished = false;
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
    await sleep(10);
    assert.equal(streamedCancelStarted, true);
    assert.equal(streamedCancelFinished, false);
    streamedGate.resolve();
    const streamedResult = await streamed;
    assert.equal(streamedResult.ok, false);
    assert.equal(streamedResult.error, "source_body_too_large");
    assert.equal(streamedCancelFinished, true);

    const stalledOwner = new VoidUiWave2HomeSourceAcquisitionOwnerV1();
    const stalledGate = deferred();
    let stalledFetchCalls = 0;
    let stalledReadStarted = false;
    let stalledCancelAttempts = 0;
    const stalledStart = Date.now();
    const stalled = await fetchVoidUiWave2HomeSourceJsonV1(
      "http://127.0.0.1:4100",
      "/health",
      {
        timeoutMs: 30,
        acquisitionOwner: stalledOwner,
        acquisitionKey: "/health",
        fetchImpl: async () => {
          stalledFetchCalls += 1;
          return new Response(
            new ReadableStream<Uint8Array>({
              pull() {
                stalledReadStarted = true;
              },
              async cancel() {
                stalledCancelAttempts += 1;
                await stalledGate.promise;
              },
            }),
            { status: 200 }
          );
        },
      }
    );
    const stalledElapsed = Date.now() - stalledStart;
    assert.equal(stalledReadStarted, true);
    assert.equal(stalled.ok, false);
    assert.equal(stalled.error, "source_deadline_exceeded");
    assert.equal(stalledCancelAttempts, 1);
    assert.ok(
      stalledElapsed <
        30 + VOID_UI_WAVE2_HOME_SOURCE_TEARDOWN_MS_V1 + 250,
      `stalled body escaped deadline + teardown bound: ${stalledElapsed}ms`
    );
    assert.equal(stalledOwner.hasPending("/health"), true);
    await assertQuarantinedRetries({
      owner: stalledOwner,
      key: "/health",
      attempts: 3,
      onUnexpectedFetch: () => {
        stalledFetchCalls += 1;
      },
    });
    assert.equal(stalledFetchCalls, 1);
    assert.equal(stalledOwner.pendingCount(), 1);

    stalledGate.resolve();
    await sleep(20);
    assert.equal(stalledOwner.hasPending("/health"), false);
    const stalledRecovered = await fetchVoidUiWave2HomeSourceJsonV1(
      "http://127.0.0.1:4100",
      "/health",
      {
        timeoutMs: 100,
        acquisitionOwner: stalledOwner,
        acquisitionKey: "/health",
        fetchImpl: async () => {
          stalledFetchCalls += 1;
          return new Response('{"ok":true}', { status: 200 });
        },
      }
    );
    assert.equal(stalledRecovered.ok, true);
    assert.equal(stalledFetchCalls, 2);

    const neverOwner = new VoidUiWave2HomeSourceAcquisitionOwnerV1();
    let neverFetchCalls = 0;
    const neverStart = Date.now();
    const never = await fetchVoidUiWave2HomeSourceJsonV1(
      "http://127.0.0.1:4100",
      "/health",
      {
        timeoutMs: 30,
        acquisitionOwner: neverOwner,
        acquisitionKey: "/health",
        fetchImpl: async (_input, init) => {
          neverFetchCalls += 1;
          assert.equal(init?.signal instanceof AbortSignal, true);
          return await new Promise<Response>(() => {});
        },
      }
    );
    const neverElapsed = Date.now() - neverStart;
    assert.equal(never.ok, false);
    assert.equal(never.error, "source_deadline_exceeded");
    assert.ok(
      neverElapsed < 30 + 250,
      `fetch acquisition escaped source deadline: ${neverElapsed}ms`
    );
    assert.equal(neverOwner.hasPending("/health"), true);
    await assertQuarantinedRetries({
      owner: neverOwner,
      key: "/health",
      attempts: 3,
      onUnexpectedFetch: () => {
        neverFetchCalls += 1;
      },
    });
    assert.equal(neverFetchCalls, 1);

    const lateOwner = new VoidUiWave2HomeSourceAcquisitionOwnerV1();
    const lateGate = deferred();
    let resolveLateFetch!: (response: Response) => void;
    let lateFetchCalls = 0;
    let lateCancelAttempts = 0;
    const lateStart = Date.now();
    const latePromise = fetchVoidUiWave2HomeSourceJsonV1(
      "http://127.0.0.1:4100",
      "/health",
      {
        timeoutMs: 30,
        acquisitionOwner: lateOwner,
        acquisitionKey: "/health",
        fetchImpl: async () => {
          lateFetchCalls += 1;
          return await new Promise<Response>((resolve) => {
            resolveLateFetch = resolve;
          });
        },
      }
    );
    const late = await latePromise;
    const lateElapsed = Date.now() - lateStart;
    assert.equal(late.ok, false);
    assert.equal(late.error, "source_deadline_exceeded");
    assert.ok(lateElapsed < 30 + 250);
    assert.equal(lateOwner.hasPending("/health"), true);

    resolveLateFetch(
      new Response(
        new ReadableStream<Uint8Array>({
          async cancel() {
            lateCancelAttempts += 1;
            await lateGate.promise;
          },
        }),
        { status: 200 }
      )
    );
    await sleep(20);
    assert.equal(lateCancelAttempts, 1);
    await sleep(VOID_UI_WAVE2_HOME_SOURCE_TEARDOWN_MS_V1 + 20);
    assert.equal(lateOwner.hasPending("/health"), true);
    await assertQuarantinedRetries({
      owner: lateOwner,
      key: "/health",
      attempts: 3,
      onUnexpectedFetch: () => {
        lateFetchCalls += 1;
      },
    });
    assert.equal(lateFetchCalls, 1);

    const unrelated = await fetchVoidUiWave2HomeSourceJsonV1(
      "http://127.0.0.1:4100",
      "/p2p/peers",
      {
        timeoutMs: 100,
        acquisitionOwner: lateOwner,
        acquisitionKey: "/p2p/peers",
        fetchImpl: async () => new Response("{}", { status: 200 }),
      }
    );
    assert.equal(unrelated.ok, true);

    lateGate.resolve();
    await sleep(20);
    assert.equal(lateOwner.hasPending("/health"), false);
    const lateRecovered = await fetchVoidUiWave2HomeSourceJsonV1(
      "http://127.0.0.1:4100",
      "/health",
      {
        timeoutMs: 100,
        acquisitionOwner: lateOwner,
        acquisitionKey: "/health",
        fetchImpl: async () => {
          lateFetchCalls += 1;
          return new Response('{"ok":true}', { status: 200 });
        },
      }
    );
    assert.equal(lateRecovered.ok, true);
    assert.equal(lateFetchCalls, 2);

    const rejectedOwner = new VoidUiWave2HomeSourceAcquisitionOwnerV1();
    let resolveRejectedFetch!: (response: Response) => void;
    let rejectedFetchCalls = 0;
    let rejectedCancelAttempts = 0;
    const rejectedPromise = fetchVoidUiWave2HomeSourceJsonV1(
      "http://127.0.0.1:4100",
      "/health",
      {
        timeoutMs: 30,
        acquisitionOwner: rejectedOwner,
        acquisitionKey: "/health",
        fetchImpl: async () => {
          rejectedFetchCalls += 1;
          return await new Promise<Response>((resolve) => {
            resolveRejectedFetch = resolve;
          });
        },
      }
    );
    assert.equal((await rejectedPromise).error, "source_deadline_exceeded");
    resolveRejectedFetch(
      new Response(
        new ReadableStream<Uint8Array>({
          cancel() {
            rejectedCancelAttempts += 1;
            return Promise.reject(new Error("late_cancel_rejected"));
          },
        }),
        { status: 200 }
      )
    );
    await sleep(20);
    assert.equal(rejectedCancelAttempts, 1);
    assert.equal(rejectedOwner.hasPending("/health"), true);
    await assertQuarantinedRetries({
      owner: rejectedOwner,
      key: "/health",
      attempts: 3,
      onUnexpectedFetch: () => {
        rejectedFetchCalls += 1;
      },
    });
    assert.equal(rejectedFetchCalls, 1);

    const throwingOwner = new VoidUiWave2HomeSourceAcquisitionOwnerV1();
    let resolveThrowingFetch!: (response: Response) => void;
    let throwingFetchCalls = 0;
    let throwingCancelAttempts = 0;
    const throwingPromise = fetchVoidUiWave2HomeSourceJsonV1(
      "http://127.0.0.1:4100",
      "/health",
      {
        timeoutMs: 30,
        acquisitionOwner: throwingOwner,
        acquisitionKey: "/health",
        fetchImpl: async () => {
          throwingFetchCalls += 1;
          return await new Promise<Response>((resolve) => {
            resolveThrowingFetch = resolve;
          });
        },
      }
    );
    assert.equal((await throwingPromise).error, "source_deadline_exceeded");
    resolveThrowingFetch({
      body: {
        cancel() {
          throwingCancelAttempts += 1;
          throw new Error("late_cancel_threw");
        },
      },
    } as unknown as Response);
    await sleep(20);
    assert.equal(throwingCancelAttempts, 1);
    assert.equal(throwingOwner.hasPending("/health"), true);
    await assertQuarantinedRetries({
      owner: throwingOwner,
      key: "/health",
      attempts: 3,
      onUnexpectedFetch: () => {
        throwingFetchCalls += 1;
      },
    });
    assert.equal(throwingFetchCalls, 1);

    console.log("VOID_UI_WAVE2_HOME_TEARDOWN_SETTLEMENT_V1_PROOF_GREEN");
    console.log("declared_cancel_awaited=true");
    console.log("streamed_cancel_awaited=true");
    console.log("snapshot_owner_retained_through_cancel=true");
    console.log("caller_teardown_terminal_bounded=true");
    console.log("on_time_body_generation_quarantined_until_terminal=true");
    console.log("on_time_body_repeated_refreshes=3");
    console.log("never_resolving_fetch_persistent_quarantine=true");
    console.log("never_resolving_fetch_repeated_refreshes=3");
    console.log("late_response_quarantine_retained_without_terminal=true");
    console.log("late_response_repeated_refreshes=3");
    console.log("late_response_rejected_cancel_quarantined=true");
    console.log("late_response_throwing_cancel_quarantined=true");
    console.log("unrelated_source_key_remains_usable=true");
    console.log("late_successful_terminal_releases_exact_key=true");
    console.log("authority_added=false");
  } finally {
    clearTimeout(proofKeepAlive);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
