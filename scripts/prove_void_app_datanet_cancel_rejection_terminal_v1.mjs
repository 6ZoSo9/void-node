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
          return { done: false, value: chunks[index++] };
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

const waitUntil = async (predicate, message, turns = 100) => {
  for (let turn = 0; turn < turns; turn += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  assert.fail(message);
};

const makeCancelFailureBody = ({ mode, chunks = [] }) => {
  const terminal = deferred();
  let cancelCalls = 0;
  let readCalls = 0;
  let readerCalls = 0;

  const failCancel = () => {
    cancelCalls += 1;
    if (mode === 'throw') {
      throw new Error('synthetic DataNet cancel throw');
    }
    return Promise.reject(new Error('synthetic DataNet cancel rejection'));
  };

  const makeReader = () => {
    let index = 0;
    return {
      closed: terminal.promise,
      async read() {
        readCalls += 1;
        if (index >= chunks.length) return { done: true, value: undefined };
        return { done: false, value: chunks[index++] };
      },
      cancel: failCancel,
      releaseLock() {},
    };
  };

  return {
    body: {
      cancel: failCancel,
      getReader() {
        readerCalls += 1;
        return makeReader();
      },
    },
    terminal,
    cancelCalls: () => cancelCalls,
    readCalls: () => readCalls,
    readerCalls: () => readerCalls,
  };
};

const proveRetriesStayQuarantined = async ({ owner, fetchCalls }) => {
  for (let retry = 0; retry < 3; retry += 1) {
    const started = Date.now();
    await assert.rejects(
      () => fetchDataNetStatusV1({ origin: 'https://void.example', fetchImpl: owner.fetch }),
      /prior request generation is still settling/,
    );
    const elapsed = Date.now() - started;
    assert.ok(elapsed >= 200 && elapsed < 1000, 'quarantined retry HOLD must remain bounded');
    assert.equal(fetchCalls(), 1, 'cancel failure must not permit a replacement fetch generation');
  }
};

for (const mode of ['throw', 'reject']) {
  // Early response admission rejection: a failed body.cancel() cannot itself be
  // treated as proof that the rejected body/resource reached a terminal state.
  {
    const hostile = makeCancelFailureBody({ mode });
    let calls = 0;
    const owner = createDataNetRequestOwnerV1({
      origin: 'https://void.example',
      fetchImpl: async () => {
        calls += 1;
        if (calls === 1) {
          return {
            ok: true,
            status: 200,
            redirected: true,
            url: URL,
            headers: headers(null),
            body: hostile.body,
          };
        }
        return finiteResponse();
      },
    });

    const started = Date.now();
    await assert.rejects(
      () => fetchDataNetStatusV1({ origin: 'https://void.example', fetchImpl: owner.fetch }),
      /redirected/,
    );
    assert.ok(Date.now() - started < 1000, 'primary admission HOLD must not wait for a terminal witness');
    assert.equal(hostile.cancelCalls(), 1, 'early rejected response must attempt cancellation exactly once');
    assert.equal(hostile.readerCalls(), 1, 'cancel failure must install exactly one independent terminal observer');
    assert.equal(hostile.readCalls(), 0, 'terminal observer must not consume rejected response bytes');
    assert.equal(owner.hasActiveRequest(), true, 'cancel failure must retain exact generation ownership');

    await proveRetriesStayQuarantined({ owner, fetchCalls: () => calls });
    assert.equal(hostile.cancelCalls(), 1, 'quarantined retries must not repeat cancellation');

    hostile.terminal.resolve();
    await waitUntil(() => owner.hasActiveRequest() === false, 'late response-body closure must release ownership');

    const recovered = await fetchDataNetStatusV1({ origin: 'https://void.example', fetchImpl: owner.fetch });
    assert.equal(recovered.status, 'green');
    assert.equal(calls, 2, 'clean recovery may start exactly one replacement generation');
  }

  // Admitted reader overflow: the overflow read is not a terminal witness. If
  // reader.cancel() fails, the generation must remain owned until reader.closed
  // proves an independent terminal state.
  {
    const hostile = makeCancelFailureBody({
      mode,
      chunks: [new Uint8Array(65536), new Uint8Array(65536), new Uint8Array(1)],
    });
    let calls = 0;
    const owner = createDataNetRequestOwnerV1({
      origin: 'https://void.example',
      fetchImpl: async () => {
        calls += 1;
        if (calls === 1) {
          return {
            ok: true,
            status: 200,
            redirected: false,
            url: URL,
            headers: headers(null),
            body: hostile.body,
          };
        }
        return finiteResponse();
      },
    });

    const started = Date.now();
    await assert.rejects(
      () => fetchDataNetStatusV1({ origin: 'https://void.example', fetchImpl: owner.fetch }),
      /size limit/,
    );
    assert.ok(Date.now() - started < 1000, 'primary size HOLD must not wait for a terminal witness');
    assert.equal(hostile.readerCalls(), 1);
    assert.equal(hostile.readCalls(), 3);
    assert.equal(hostile.cancelCalls(), 1, 'overflow must attempt reader cancellation exactly once');
    assert.equal(owner.hasActiveRequest(), true, 'failed reader cancellation must retain generation ownership');

    await proveRetriesStayQuarantined({ owner, fetchCalls: () => calls });
    assert.equal(hostile.cancelCalls(), 1, 'quarantined retries must not duplicate reader cancellation');
    assert.equal(hostile.readCalls(), 3, 'quarantined retries must not consume more hostile bytes');

    hostile.terminal.resolve();
    await waitUntil(() => owner.hasActiveRequest() === false, 'late reader closure must release ownership');

    const recovered = await fetchDataNetStatusV1({ origin: 'https://void.example', fetchImpl: owner.fetch });
    assert.equal(recovered.status, 'green');
    assert.equal(calls, 2, 'clean recovery may start exactly one new generation');
  }
}

console.log('VOID_APP_DATANET_CANCEL_REJECTION_TERMINAL_V1_GREEN');
console.log('cancel_rejection_not_terminal=true');
console.log('sync_throw_cancel_quarantined=true');
console.log('rejected_cancel_quarantined=true');
console.log('late_closed_witness_releases=true');
console.log('replacement_generation_bound=true');
console.log('mutation_authority=false');
