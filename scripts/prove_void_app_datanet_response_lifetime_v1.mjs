#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { fetchDataNetStatusV1 } from '../public/void-app-wave1-v1/assets/js/data-live.js';
import { createDataNetRequestOwnerV1 } from '../public/void-app-wave1-v1/assets/js/data-request-owner.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATUS_PATH = path.join(
  ROOT,
  'public/public-node/datanet/field-replication-status-card-v1.json',
);
const canonical = JSON.parse(fs.readFileSync(STATUS_PATH, 'utf8'));
const encoder = new TextEncoder();
const URL = 'https://void.example/public-node/datanet/field-replication-status-card-v1.json';

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

const headers = (contentLength = null) => ({
  get(name) {
    return String(name).toLowerCase() === 'content-length' ? contentLength : null;
  },
});

const finiteBody = (payload = JSON.stringify(canonical)) => {
  const chunks = [encoder.encode(payload)];
  return {
    getReader() {
      let index = 0;
      let cancelled = false;
      return {
        async read() {
          if (cancelled || index >= chunks.length) return { done: true, value: undefined };
          const value = chunks[index++];
          return { done: false, value };
        },
        async cancel() { cancelled = true; },
        releaseLock() {},
      };
    },
    async cancel() {},
  };
};

const finiteResponse = () => ({
  ok: true,
  status: 200,
  redirected: false,
  url: URL,
  headers: headers(null),
  body: finiteBody(),
});

// A signal-ignoring fetch acquisition must remain generation-owned after caller
// timeout. Repeated Refresh-equivalent attempts may HOLD, but cannot start a
// replacement fetch until the exact unresolved acquisition settles and any late
// response body has been cleaned up.
{
  let fetchCalls = 0;
  let outstandingFetches = 0;
  let maxOutstandingFetches = 0;
  let lateCancelCalls = 0;
  const stalledFetch = deferred();

  const lateResponse = {
    ok: true,
    status: 200,
    redirected: false,
    url: URL,
    headers: headers(null),
    body: {
      cancel() {
        lateCancelCalls += 1;
        return Promise.resolve();
      },
    },
  };

  const owner = createDataNetRequestOwnerV1({
    origin: 'https://void.example',
    fetchImpl: () => {
      fetchCalls += 1;
      outstandingFetches += 1;
      maxOutstandingFetches = Math.max(maxOutstandingFetches, outstandingFetches);
      const operation = fetchCalls === 1
        ? stalledFetch.promise
        : Promise.resolve(finiteResponse());
      return operation.finally(() => { outstandingFetches -= 1; });
    },
  });

  const deadline = new AbortController();
  const started = Date.now();
  const first = fetchDataNetStatusV1({
    origin: 'https://void.example',
    fetchImpl: owner.fetch,
    signal: deadline.signal,
  });
  setTimeout(() => deadline.abort(new Error('synthetic fetch acquisition deadline')), 25);
  await assert.rejects(first, /synthetic fetch acquisition deadline/);
  assert.ok(Date.now() - started < 1000, 'fetch acquisition must reject under caller deadline');
  assert.equal(owner.hasQuarantinedGeneration(), true);
  assert.equal(fetchCalls, 1);
  assert.equal(outstandingFetches, 1);
  assert.equal(maxOutstandingFetches, 1);

  for (let retry = 0; retry < 2; retry += 1) {
    const retryStarted = Date.now();
    await assert.rejects(
      () => fetchDataNetStatusV1({
        origin: 'https://void.example',
        fetchImpl: owner.fetch,
      }),
      /prior request generation is still settling/,
    );
    const elapsed = Date.now() - retryStarted;
    assert.ok(elapsed >= 200 && elapsed < 1000, 'unresolved fetch retry HOLD must remain bounded');
    assert.equal(fetchCalls, 1, 'unresolved acquisition must block replacement fetches');
    assert.equal(outstandingFetches, 1);
    assert.equal(maxOutstandingFetches, 1);
  }

  stalledFetch.resolve(lateResponse);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(lateCancelCalls, 1, 'late response must receive exactly one cleanup attempt');
  assert.equal(outstandingFetches, 0);
  assert.equal(owner.hasActiveRequest(), false, 'late response cleanup must release acquisition ownership');

  const recovered = await fetchDataNetStatusV1({
    origin: 'https://void.example',
    fetchImpl: owner.fetch,
  });
  assert.equal(recovered.status, 'green');
  assert.equal(fetchCalls, 2, 'clean recovery may start exactly one new fetch generation');
  assert.equal(maxOutstandingFetches, 1);
}

// A signal-ignoring admitted read must not outlive the caller-visible deadline,
// and repeated Refresh-equivalent attempts must not create replacement body generations.
{
  let fetchCalls = 0;
  let readCalls = 0;
  let outstandingReads = 0;
  let maxOutstandingReads = 0;
  let cancelCalls = 0;
  const stalledRead = deferred();
  const stalledCancel = deferred();

  const hostileResponse = {
    ok: true,
    status: 200,
    redirected: false,
    url: URL,
    headers: headers(null),
    body: {
      getReader() {
        return {
          read() {
            readCalls += 1;
            outstandingReads += 1;
            maxOutstandingReads = Math.max(maxOutstandingReads, outstandingReads);
            return stalledRead.promise.finally(() => { outstandingReads -= 1; });
          },
          cancel() {
            cancelCalls += 1;
            return stalledCancel.promise;
          },
          releaseLock() {},
        };
      },
      cancel() {
        cancelCalls += 1;
        return stalledCancel.promise;
      },
    },
  };

  const owner = createDataNetRequestOwnerV1({
    origin: 'https://void.example',
    fetchImpl: async () => {
      fetchCalls += 1;
      return fetchCalls === 1 ? hostileResponse : finiteResponse();
    },
  });

  const deadline = new AbortController();
  const started = Date.now();
  const first = fetchDataNetStatusV1({
    origin: 'https://void.example',
    fetchImpl: owner.fetch,
    signal: deadline.signal,
  });
  setTimeout(() => deadline.abort(new Error('synthetic participant deadline')), 25);
  await assert.rejects(first, /synthetic participant deadline/);
  assert.ok(Date.now() - started < 1000, 'admitted body read must reject under the owned deadline');
  assert.equal(owner.hasQuarantinedGeneration(), true);
  assert.equal(fetchCalls, 1);
  assert.equal(readCalls, 1);
  assert.equal(maxOutstandingReads, 1);
  assert.equal(cancelCalls, 1, 'timed-out body generation must start cleanup exactly once');

  for (let retry = 0; retry < 2; retry += 1) {
    const retryStarted = Date.now();
    await assert.rejects(
      () => fetchDataNetStatusV1({
        origin: 'https://void.example',
        fetchImpl: owner.fetch,
      }),
      /prior request generation is still settling/,
    );
    const elapsed = Date.now() - retryStarted;
    assert.ok(elapsed >= 200 && elapsed < 1000, 'retry HOLD must remain caller-bounded');
    assert.equal(fetchCalls, 1, 'quarantined body generation must block replacement fetches');
    assert.equal(readCalls, 1, 'quarantined body generation must block replacement reads');
    assert.equal(maxOutstandingReads, 1);
  }

  stalledRead.resolve({ done: true, value: undefined });
  stalledCancel.resolve();
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(owner.hasActiveRequest(), false, 'late settlement must release quarantine exactly once');

  const recovered = await fetchDataNetStatusV1({
    origin: 'https://void.example',
    fetchImpl: owner.fetch,
  });
  assert.equal(recovered.status, 'green');
  assert.equal(fetchCalls, 2, 'clean recovery may start exactly one new generation');
}

// Stream overflow cleanup may return after the teardown terminal, but an unresolved
// underlying cancel must remain quarantine-owned so retries cannot accumulate work.
{
  let fetchCalls = 0;
  let cancelCalls = 0;
  const stalledCancel = deferred();
  const chunks = [new Uint8Array(65536), new Uint8Array(65536), new Uint8Array(1)];
  const response = {
    ok: true,
    status: 200,
    redirected: false,
    url: URL,
    headers: headers(null),
    body: {
      getReader() {
        let index = 0;
        return {
          async read() {
            if (index >= chunks.length) return { done: true, value: undefined };
            return { done: false, value: chunks[index++] };
          },
          cancel() {
            cancelCalls += 1;
            return stalledCancel.promise;
          },
          releaseLock() {},
        };
      },
      cancel() {
        cancelCalls += 1;
        return stalledCancel.promise;
      },
    },
  };
  const owner = createDataNetRequestOwnerV1({
    origin: 'https://void.example',
    fetchImpl: async () => {
      fetchCalls += 1;
      return fetchCalls === 1 ? response : finiteResponse();
    },
  });

  const started = Date.now();
  await assert.rejects(
    () => fetchDataNetStatusV1({ origin: 'https://void.example', fetchImpl: owner.fetch }),
    /size limit/,
  );
  const elapsed = Date.now() - started;
  assert.ok(elapsed >= 200 && elapsed < 1000, 'overflow teardown must use a separate bounded terminal');
  assert.equal(cancelCalls, 1);
  assert.equal(owner.hasQuarantinedGeneration(), false);
  assert.equal(owner.hasActiveRequest(), true);
  await assert.rejects(
    () => fetchDataNetStatusV1({ origin: 'https://void.example', fetchImpl: owner.fetch }),
    /prior request generation is still settling/,
  );
  assert.equal(fetchCalls, 1);

  stalledCancel.resolve();
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(owner.hasActiveRequest(), false);
  const recovered = await fetchDataNetStatusV1({ origin: 'https://void.example', fetchImpl: owner.fetch });
  assert.equal(recovered.status, 'green');
  assert.equal(fetchCalls, 2);
}

// Declared/malformed length rejection must own cleanup even though data-live rejects
// before it would otherwise acquire a body reader.
{
  let fetchCalls = 0;
  let cancelCalls = 0;
  const stalledCancel = deferred();
  const malformed = {
    ok: true,
    status: 200,
    redirected: false,
    url: URL,
    headers: headers('01'),
    body: {
      cancel() {
        cancelCalls += 1;
        return stalledCancel.promise;
      },
    },
  };
  const owner = createDataNetRequestOwnerV1({
    origin: 'https://void.example',
    fetchImpl: async () => {
      fetchCalls += 1;
      return fetchCalls === 1 ? malformed : finiteResponse();
    },
  });

  const started = Date.now();
  await assert.rejects(
    () => fetchDataNetStatusV1({ origin: 'https://void.example', fetchImpl: owner.fetch }),
    /invalid content length/,
  );
  const elapsed = Date.now() - started;
  assert.ok(elapsed >= 200 && elapsed < 1000);
  assert.equal(cancelCalls, 1);
  assert.equal(owner.hasActiveRequest(), true);
  await assert.rejects(
    () => fetchDataNetStatusV1({ origin: 'https://void.example', fetchImpl: owner.fetch }),
    /prior request generation is still settling/,
  );
  assert.equal(fetchCalls, 1);

  stalledCancel.resolve();
  await new Promise((resolve) => setTimeout(resolve, 10));
  const recovered = await fetchDataNetStatusV1({ origin: 'https://void.example', fetchImpl: owner.fetch });
  assert.equal(recovered.status, 'green');
  assert.equal(fetchCalls, 2);
}

console.log('VOID_APP_DATANET_RESPONSE_LIFETIME_V1_GREEN');
console.log('fetch_acquisition_generation_bound=true');
console.log('max_outstanding_fetches=1');
console.log('admitted_body_read_deadline_bound=true');
console.log('max_outstanding_body_reads=1');
console.log('unresolved_cleanup_generation_quarantined=true');
console.log('declared_length_rejection_teardown_owned=true');
console.log('late_settlement_recovery=true');
console.log('mutation_authority=false');
