import assert from "node:assert/strict";

import {
  VOID_UI_WAVE2_HOME_SOURCE_MAX_RESPONSE_BYTES_V1,
  VoidUiWave2HomeSnapshotBuildOwnerV1,
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
    deadlineElapsed < 500,
    `teardown exceeded bounded total deadline: ${deadlineElapsed}ms`
  );

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
  console.log("teardown_bounded_by_total_deadline=true");
  console.log("fresh_batch_after_teardown=true");
  console.log("authority_added=false");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
