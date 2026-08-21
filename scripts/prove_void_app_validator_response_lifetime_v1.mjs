import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import {
  MAX_VALIDATE_RESPONSE_BYTES,
  VALIDATE_MARKER,
  createValidateRequestOwnerV1,
  fetchValidatorReadinessSnapshotV1,
} from '../public/void-app-wave1-v1/assets/js/validate-live.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = JSON.parse(fs.readFileSync(
  path.join(root, 'public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-hold-v1.json'),
  'utf8',
));
const encoded = new TextEncoder().encode(JSON.stringify(fixture));
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const responseFor = (bytes = encoded) => new Response(
  new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  }),
  { headers: { 'content-type': 'application/json' } },
);

async function assertRetriesQuarantined(owner, fetchCallCount, expectedFetchCalls, count = 3) {
  for (let index = 0; index < count; index += 1) {
    await assert.rejects(
      () => fetchCallCount(),
      /previous request still settling/,
    );
    assert.equal(expectedFetchCalls(), 1, 'quarantined retry must not start replacement fetch work');
  }
}

// Deadline during the every-64-read scheduler yield must cancel once and retain the exact
// admitted body generation even when cancellation rejects.
{
  const closedGate = deferred();
  const cancelGate = deferred();
  let fetchCalls = 0;
  let readCalls = 0;
  let cancelCalls = 0;
  let healthy = false;
  let owner;

  const fetchImpl = async () => {
    fetchCalls += 1;
    if (healthy) return responseFor();
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      body: {
        getReader() {
          return {
            closed: closedGate.promise,
            read() {
              readCalls += 1;
              if (readCalls === 64) {
                setTimeout(() => owner.abort(new Error('validator yield deadline fixture')), 0);
              }
              return Promise.resolve({ done: false, value: new Uint8Array([0x20]) });
            },
            cancel() {
              cancelCalls += 1;
              return cancelGate.promise;
            },
            releaseLock() {},
          };
        },
      },
    };
  };

  owner = createValidateRequestOwnerV1({ timeoutMs: 500, teardownMs: 10 });
  const started = performance.now();
  await assert.rejects(
    () => fetchValidatorReadinessSnapshotV1({ fetchImpl, owner }),
    /validator yield deadline fixture/,
  );
  assert.ok(performance.now() - started < 150, 'yield-abort primary terminal must remain bounded');
  assert.equal(readCalls, 64);
  assert.equal(cancelCalls, 1);
  assert.equal(owner.hasActive(), true);

  await assertRetriesQuarantined(
    owner,
    () => fetchValidatorReadinessSnapshotV1({ fetchImpl, owner }),
    () => fetchCalls,
  );
  assert.equal(fetchCalls, 1);

  closedGate.resolve();
  await owner.waitForRelease();
  healthy = true;
  assert.equal((await fetchValidatorReadinessSnapshotV1({ fetchImpl, owner })).marker, VALIDATE_MARKER);
  assert.equal(fetchCalls, 2);
}

// A settled invalid body result followed by rejected cancellation must preserve the
// participant error while keeping the body generation quarantined until reader.closed.
for (const scenario of ['overflow', 'zero_progress']) {
  const closedGate = deferred();
  let fetchCalls = 0;
  let cancelCalls = 0;
  let healthy = false;
  const invalidChunk = scenario === 'overflow'
    ? new Uint8Array(MAX_VALIDATE_RESPONSE_BYTES + 1)
    : new Uint8Array(0);
  const expected = scenario === 'overflow' ? /exceeds byte limit/ : /made no progress/;

  const fetchImpl = async () => {
    fetchCalls += 1;
    if (healthy) return responseFor();
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      body: {
        getReader() {
          let sent = false;
          return {
            closed: closedGate.promise,
            read() {
              if (sent) return Promise.resolve({ done: true, value: undefined });
              sent = true;
              return Promise.resolve({ done: false, value: invalidChunk });
            },
            cancel() {
              cancelCalls += 1;
              if (scenario === 'overflow') {
                return Promise.reject(new Error(`${scenario} cancel rejected`));
              }
              return new Promise(() => {});
            },
            releaseLock() {},
          };
        },
      },
    };
  };

  const owner = createValidateRequestOwnerV1({ timeoutMs: 250, teardownMs: 10 });
  await assert.rejects(
    () => fetchValidatorReadinessSnapshotV1({ fetchImpl, owner }),
    expected,
  );
  assert.equal(cancelCalls, 1);
  assert.equal(owner.hasActive(), true);

  await assertRetriesQuarantined(
    owner,
    () => fetchValidatorReadinessSnapshotV1({ fetchImpl, owner }),
    () => fetchCalls,
  );
  assert.equal(fetchCalls, 1);

  closedGate.resolve();
  await owner.waitForRelease();
  healthy = true;
  assert.equal((await fetchValidatorReadinessSnapshotV1({ fetchImpl, owner })).marker, VALIDATE_MARKER);
  assert.equal(fetchCalls, 2);
}

// A fetch that ignores AbortSignal may resolve after the participant deadline. Its late
// Response body must be consumed by the same generation-lifetime quarantine before retry.
{
  const fetchGate = deferred();
  const closedGate = deferred();
  let fetchCalls = 0;
  let cancelCalls = 0;
  let readCalls = 0;
  let healthy = false;

  const hostileLateResponse = {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    body: {
      getReader() {
        return {
          closed: closedGate.promise,
          read() {
            readCalls += 1;
            return Promise.resolve({ done: false, value: new Uint8Array([0x20]) });
          },
          cancel() {
            cancelCalls += 1;
            return new Promise(() => {});
          },
          releaseLock() {},
        };
      },
    },
  };

  const fetchImpl = () => {
    fetchCalls += 1;
    if (healthy) return Promise.resolve(responseFor());
    return fetchGate.promise;
  };

  const owner = createValidateRequestOwnerV1({ timeoutMs: 35, teardownMs: 10 });
  const started = performance.now();
  await assert.rejects(
    () => fetchValidatorReadinessSnapshotV1({ fetchImpl, owner }),
    /request deadline exceeded/,
  );
  assert.ok(performance.now() - started < 125, 'late-fetch deadline must remain participant bounded');
  assert.equal(owner.hasActive(), true);

  await assertRetriesQuarantined(
    owner,
    () => fetchValidatorReadinessSnapshotV1({ fetchImpl, owner }),
    () => fetchCalls,
    2,
  );
  assert.equal(fetchCalls, 1);

  fetchGate.resolve(hostileLateResponse);
  for (let index = 0; index < 30 && cancelCalls === 0; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
  assert.equal(cancelCalls, 1, 'late response body must receive exactly one cancellation attempt');
  assert.equal(readCalls, 0, 'late response body must not be admitted for normal reads');
  assert.equal(owner.hasActive(), true, 'rejected late cleanup cannot release the body generation');

  await assertRetriesQuarantined(
    owner,
    () => fetchValidatorReadinessSnapshotV1({ fetchImpl, owner }),
    () => fetchCalls,
  );
  assert.equal(fetchCalls, 1);

  closedGate.resolve();
  await owner.waitForRelease();
  healthy = true;
  assert.equal((await fetchValidatorReadinessSnapshotV1({ fetchImpl, owner })).marker, VALIDATE_MARKER);
  assert.equal(fetchCalls, 2);
}

console.log('VOID_APP_VALIDATOR_RESPONSE_LIFETIME_V1_PROOF_GREEN');
console.log('yield_abort_body_quarantined=1');
console.log('settled_rejection_cancel_failure_quarantined=1');
console.log('late_fetch_response_body_quarantined=1');
console.log('retry_replacement_generations=0_before_terminal');
