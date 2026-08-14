#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createDataNetRequestOwnerV1,
  installDataNetRequestOwnerV1,
  reconcileDataNetRequestOwnerWithViewV1,
} from '../public/void-app-wave1-v1/assets/js/data-request-owner.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP_PATH = path.join(ROOT, 'public/void-app-wave1-v1/assets/js/app.js');
const OWNER_PATH = path.join(
  ROOT,
  'public/void-app-wave1-v1/assets/js/data-request-owner.js',
);
const DATANET_URL =
  'https://void.example/public-node/datanet/field-replication-status-card-v1.json';

function pendingFetchHarness() {
  let active = 0;
  let maxActive = 0;
  const records = [];

  const fetchImpl = (input, init = {}) => new Promise((resolve, reject) => {
    active += 1;
    maxActive = Math.max(maxActive, active);

    const record = {
      input: String(input),
      signal: init.signal,
      aborted: false,
      settled: false,
      resolve(value = { ok: true }) {
        if (record.settled) return;
        record.settled = true;
        active -= 1;
        init.signal?.removeEventListener?.('abort', onAbort);
        resolve(value);
      },
    };

    const onAbort = () => {
      if (record.settled) return;
      record.aborted = true;
      record.settled = true;
      active -= 1;
      reject(
        init.signal?.reason instanceof Error
          ? init.signal.reason
          : new Error('request aborted'),
      );
    };

    if (init.signal?.aborted) onAbort();
    else init.signal?.addEventListener?.('abort', onAbort, { once: true });
    records.push(record);
  });

  return {
    fetchImpl,
    records,
    active: () => active,
    maxActive: () => maxActive,
  };
}

const overlap = pendingFetchHarness();
const owner = createDataNetRequestOwnerV1({
  fetchImpl: overlap.fetchImpl,
  origin: 'https://void.example',
});

const first = owner.fetch(DATANET_URL);
void first.catch(() => {});
await Promise.resolve();
assert.equal(overlap.records.length, 1);
assert.equal(overlap.active(), 1);
assert.equal(owner.hasActiveRequest(), true);

const second = owner.fetch(DATANET_URL);
void second.catch(() => {});
await Promise.resolve();
assert.equal(overlap.records.length, 2);
assert.equal(overlap.records[0].aborted, true, 'superseded request must abort immediately');
assert.equal(overlap.active(), 1, 'only the replacement request may remain active');
assert.equal(overlap.maxActive(), 1, 'concurrent DataNet requests must never exceed one');
assert.equal(owner.hasActiveRequest(), true);

overlap.records[1].resolve({ request: 2 });
assert.deepEqual(await second, { request: 2 });
await assert.rejects(first, /superseded/);
assert.equal(owner.hasActiveRequest(), false);

const deadlineHarness = pendingFetchHarness();
const deadlineOwner = createDataNetRequestOwnerV1({
  fetchImpl: deadlineHarness.fetchImpl,
  origin: 'https://void.example',
});
const deadline = new AbortController();
const deadlineRequest = deadlineOwner.fetch(DATANET_URL, { signal: deadline.signal });
void deadlineRequest.catch(() => {});
await Promise.resolve();
deadline.abort(new Error('caller total deadline'));
await assert.rejects(deadlineRequest, /caller total deadline/);
assert.equal(deadlineHarness.records[0].aborted, true);
assert.equal(
  deadlineHarness.records[0].signal === deadline.signal,
  false,
  'request owner must preserve caller deadline through a linked signal',
);
assert.equal(deadlineOwner.hasActiveRequest(), false);

const unmountHarness = pendingFetchHarness();
const unmountOwner = createDataNetRequestOwnerV1({
  fetchImpl: unmountHarness.fetchImpl,
  origin: 'https://void.example',
});
const mountedRequest = unmountOwner.fetch(DATANET_URL);
void mountedRequest.catch(() => {});
await Promise.resolve();
assert.equal(
  reconcileDataNetRequestOwnerWithViewV1(unmountOwner, {
    route: 'data',
    viewPresent: true,
  }),
  true,
);
assert.equal(unmountOwner.hasActiveRequest(), true);
assert.equal(
  reconcileDataNetRequestOwnerWithViewV1(unmountOwner, {
    route: 'home',
    viewPresent: false,
  }),
  false,
);
await assert.rejects(mountedRequest, /unmounted/);
assert.equal(unmountHarness.records[0].aborted, true);
assert.equal(unmountOwner.hasActiveRequest(), false);

const passThroughHarness = pendingFetchHarness();
const passThroughOwner = createDataNetRequestOwnerV1({
  fetchImpl: passThroughHarness.fetchImpl,
  origin: 'https://void.example',
});
const externalSignal = new AbortController();
const healthRequest = passThroughOwner.fetch('https://void.example/health', {
  signal: externalSignal.signal,
});
await Promise.resolve();
assert.equal(passThroughHarness.records.length, 1);
assert.equal(passThroughHarness.records[0].signal, externalSignal.signal);
assert.equal(passThroughOwner.hasActiveRequest(), false);
passThroughHarness.records[0].resolve({ health: true });
assert.deepEqual(await healthRequest, { health: true });

const saved = {
  fetch: globalThis.fetch,
  document: globalThis.document,
  window: globalThis.window,
  location: globalThis.location,
  MutationObserver: globalThis.MutationObserver,
};
try {
  const runtimeHarness = pendingFetchHarness();
  const windowListeners = new Map();
  let observerCallback = null;
  let viewPresent = true;

  globalThis.location = {
    origin: 'https://void.example',
    hash: '#/data',
  };
  globalThis.document = {
    querySelector(selector) {
      if (selector === '[data-datanet-view]' && viewPresent) return {};
      return null;
    },
    getElementById(id) {
      return id === 'view-root' ? {} : null;
    },
  };
  globalThis.window = {
    addEventListener(name, callback) {
      windowListeners.set(name, callback);
    },
  };
  globalThis.MutationObserver = class {
    constructor(callback) {
      observerCallback = callback;
    }
    observe() {}
  };

  const runtimeOwner = installDataNetRequestOwnerV1({
    fetchImpl: runtimeHarness.fetchImpl,
    origin: 'https://void.example',
  });
  assert.equal(typeof globalThis.fetch, 'function');
  assert.equal(typeof windowListeners.get('hashchange'), 'function');
  assert.equal(typeof observerCallback, 'function');

  const runtimeRequest = globalThis.fetch(DATANET_URL);
  void runtimeRequest.catch(() => {});
  await Promise.resolve();
  assert.equal(runtimeOwner.hasActiveRequest(), true);

  globalThis.location.hash = '#/home';
  viewPresent = false;
  windowListeners.get('hashchange')();
  await assert.rejects(runtimeRequest, /unmounted/);
  assert.equal(runtimeHarness.records[0].aborted, true);
  assert.equal(runtimeOwner.hasActiveRequest(), false);

  globalThis.location.hash = '#/data';
  viewPresent = true;
  const mutationRequest = globalThis.fetch(DATANET_URL);
  void mutationRequest.catch(() => {});
  await Promise.resolve();
  viewPresent = false;
  observerCallback();
  await assert.rejects(mutationRequest, /unmounted/);
  assert.equal(runtimeHarness.records[1].aborted, true);
} finally {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete globalThis[key];
    else globalThis[key] = value;
  }
}

const appSource = fs.readFileSync(APP_PATH, 'utf8');
const ownerSource = fs.readFileSync(OWNER_PATH, 'utf8');
const ownerImport = "import './data-request-owner.js';";
const dataImport = "import { dataView } from './data-live.js';";
assert.ok(appSource.includes(ownerImport));
assert.ok(appSource.includes(dataImport));
assert.ok(
  appSource.indexOf(ownerImport) < appSource.indexOf(dataImport),
  'request owner must install before data-live browser listeners are evaluated',
);
assert.match(ownerSource, /abort\('DataNet request superseded'\)/);
assert.match(ownerSource, /sourceSignal\.addEventListener\('abort'/);
assert.match(ownerSource, /window\.addEventListener\('hashchange', reconcileView\)/);
assert.match(ownerSource, /new MutationObserver\(reconcileView\)/);
assert.doesNotMatch(ownerSource, /POST|PUT|PATCH|DELETE/);
assert.doesNotMatch(ownerSource, /credentials|wallet|signer|Work Credit|transaction/i);

console.log('VOID_APP_DATANET_REQUEST_OWNER_V1_GREEN');
console.log('max_concurrent_datanet_requests=1');
console.log('superseded_request_aborted=true');
console.log('caller_deadline_signal_preserved=true');
console.log('route_unmount_aborts=true');
console.log('non_datanet_fetch_passthrough=true');
console.log('mutation_authority=false');
