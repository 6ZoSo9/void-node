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

function delayedAbortFetchHarness() {
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
      settleAbort() {
        if (!record.aborted || record.settled) return;
        record.settled = true;
        active -= 1;
        init.signal?.removeEventListener?.('abort', onAbort);
        reject(
          init.signal?.reason instanceof Error
            ? init.signal.reason
            : new Error('request aborted'),
        );
      },
    };

    const onAbort = () => {
      if (record.settled) return;
      record.aborted = true;
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

function trackedSignalHarness() {
  const listeners = new Set();
  let added = 0;
  let removed = 0;
  return {
    signal: {
      aborted: false,
      reason: undefined,
      addEventListener(name, listener) {
        if (name !== 'abort') return;
        added += 1;
        listeners.add(listener);
      },
      removeEventListener(name, listener) {
        if (name !== 'abort') return;
        if (listeners.delete(listener)) removed += 1;
      },
    },
    added: () => added,
    removed: () => removed,
    active: () => listeners.size,
  };
}

const rejectingResponse = (overrides = {}) => {
  let cancelCalls = 0;
  const response = {
    ok: true,
    status: 200,
    redirected: false,
    url: DATANET_URL,
    headers: { get: () => null },
    body: {
      async cancel() {
        cancelCalls += 1;
      },
    },
    ...overrides,
  };
  return { response, cancelCalls: () => cancelCalls };
};

async function drainUntil(predicate, message, turns = 64) {
  for (let turn = 0; turn < turns; turn += 1) {
    if (predicate()) return;
    await Promise.resolve();
  }
  assert.equal(predicate(), true, message);
}

const overlap = pendingFetchHarness();
const owner = createDataNetRequestOwnerV1({
  fetchImpl: overlap.fetchImpl,
  origin: 'https://void.example',
});

const first = owner.fetch(DATANET_URL);
void first.catch(() => {});
await drainUntil(
  () => overlap.records.length === 1,
  'initial DataNet request must start within the bounded microtask drain',
);
assert.equal(overlap.active(), 1);
assert.equal(owner.hasActiveRequest(), true);

const second = owner.fetch(DATANET_URL);
void second.catch(() => {});
await drainUntil(
  () => overlap.records.length === 2,
  'single replacement DataNet request must start after prior release',
);
assert.equal(overlap.records[0].aborted, true, 'superseded request must abort immediately');
assert.equal(overlap.active(), 1, 'only the replacement request may remain active');
assert.equal(overlap.maxActive(), 1, 'concurrent DataNet requests must never exceed one');
assert.equal(owner.hasActiveRequest(), true);

overlap.records[1].resolve({ request: 2 });
assert.deepEqual(await second, { request: 2 });
await assert.rejects(first, /superseded/);
assert.equal(
  owner.hasActiveRequest(),
  true,
  'ownership must survive response headers so a still-streaming body stays cancellable',
);
assert.equal(owner.abort('test cleanup after response'), true);
assert.equal(owner.hasActiveRequest(), false);

const provenanceCases = [
  (() => {
    const fixture = rejectingResponse();
    delete fixture.response.url;
    return fixture;
  })(),
  rejectingResponse({ url: '' }),
  rejectingResponse({ url: 42 }),
  rejectingResponse({ url: 'not a url' }),
  rejectingResponse({ url: `${DATANET_URL}?shadow=1` }),
  rejectingResponse({ url: `${DATANET_URL}#shadow` }),
  rejectingResponse({ url: 'https://void.example/public-node/datanet/other.json' }),
  rejectingResponse({ url: 'https://other.example/public-node/datanet/field-replication-status-card-v1.json' }),
];
let provenanceIndex = 0;
const provenanceOwner = createDataNetRequestOwnerV1({
  fetchImpl: async () => provenanceCases[provenanceIndex++].response,
  origin: 'https://void.example',
});
for (let index = 0; index < provenanceCases.length; index += 1) {
  await assert.rejects(
    () => provenanceOwner.fetch(DATANET_URL),
    /escaped/,
    `invalid final URL case ${index} must fail closed`,
  );
  assert.equal(
    provenanceCases[index].cancelCalls(),
    1,
    `invalid final URL case ${index} must own one response cancellation`,
  );
  assert.equal(provenanceOwner.hasActiveRequest(), false);
}

const trackedSource = trackedSignalHarness();
const listenerOwner = createDataNetRequestOwnerV1({
  fetchImpl: async () => ({ phase: 'listener-cleanup' }),
  origin: 'https://void.example',
});
const listenerRequest = listenerOwner.fetch(DATANET_URL, { signal: trackedSource.signal });
assert.deepEqual(await listenerRequest, { phase: 'listener-cleanup' });
assert.equal(trackedSource.active(), 1, 'only the owned forward-abort listener may remain after start race');
assert.equal(listenerOwner.abort('listener cleanup'), true);
await drainUntil(
  () => listenerOwner.hasActiveRequest() === false,
  'listener cleanup generation must release',
);
assert.equal(trackedSource.active(), 0, 'all source-signal listeners must detach after release');
assert.equal(trackedSource.added(), 2, 'start race plus forward-abort must each attach once');
assert.equal(trackedSource.removed(), 2, 'both attached source-signal listeners must be detached');

const queuedHarness = delayedAbortFetchHarness();
const queuedOwner = createDataNetRequestOwnerV1({
  fetchImpl: queuedHarness.fetchImpl,
  origin: 'https://void.example',
});
const queuedFirst = queuedOwner.fetch(DATANET_URL);
void queuedFirst.catch(() => {});
await drainUntil(
  () => queuedHarness.records.length === 1,
  'initial queued-generation fetch must start',
);

const queuedSecond = queuedOwner.fetch(DATANET_URL);
void queuedSecond.catch(() => {});
await drainUntil(
  () => queuedHarness.records[0].aborted === true,
  'first queued superseder must abort the active generation before waiting for release',
);
assert.equal(
  queuedHarness.records.length,
  1,
  'no replacement transport may start while the active generation is still settling',
);

const queuedBurst = Array.from({ length: 15 }, () => queuedOwner.fetch(DATANET_URL));
for (const request of queuedBurst) void request.catch(() => {});
const queuedSuperseders = [queuedSecond, ...queuedBurst];
assert.equal(queuedHarness.records.length, 1);
assert.equal(queuedHarness.maxActive(), 1);

queuedHarness.records[0].settleAbort();
await drainUntil(
  () => queuedHarness.records.length === 2,
  'only the latest queued superseder may start after the predecessor releases',
);
const staleQueued = await Promise.allSettled(queuedSuperseders.slice(0, -1));
for (const result of staleQueued) {
  assert.equal(result.status, 'rejected', 'obsolete queued superseders must reject before transport start');
  assert.match(String(result.reason?.message), /superseded/);
}
assert.equal(
  queuedHarness.records.length,
  2,
  'a burst of obsolete queued superseders must collapse to one replacement transport generation',
);
assert.equal(queuedHarness.records[1].aborted, false);
assert.equal(queuedHarness.active(), 1);
assert.equal(
  queuedHarness.maxActive(),
  1,
  'latest-wins supersession must preserve the one-active-transport invariant',
);
queuedHarness.records[1].resolve({ request: 'queued-final' });
assert.deepEqual(await queuedSuperseders.at(-1), { request: 'queued-final' });
await assert.rejects(queuedFirst, /superseded/);
assert.equal(queuedOwner.abort('queued superseder test cleanup'), true);
assert.equal(queuedOwner.hasActiveRequest(), false);

const queuedUnmountHarness = delayedAbortFetchHarness();
const queuedUnmountOwner = createDataNetRequestOwnerV1({
  fetchImpl: queuedUnmountHarness.fetchImpl,
  origin: 'https://void.example',
});
const queuedUnmountActive = queuedUnmountOwner.fetch(DATANET_URL);
void queuedUnmountActive.catch(() => {});
await drainUntil(
  () => queuedUnmountHarness.records.length === 1,
  'queued-unmount active generation must start',
);
const queuedUnmountReplacement = queuedUnmountOwner.fetch(DATANET_URL);
void queuedUnmountReplacement.catch(() => {});
await drainUntil(
  () => queuedUnmountHarness.records[0].aborted === true,
  'queued-unmount replacement must enter the predecessor-release wait',
);
assert.equal(queuedUnmountHarness.records.length, 1);
assert.equal(
  reconcileDataNetRequestOwnerWithViewV1(queuedUnmountOwner, {
    route: 'home',
    viewPresent: false,
  }),
  false,
);
queuedUnmountHarness.records[0].settleAbort();
await assert.rejects(queuedUnmountActive, /superseded/);
await assert.rejects(queuedUnmountReplacement, /superseded/);
await drainUntil(
  () => queuedUnmountOwner.hasActiveRequest() === false,
  'unmount must release the old generation without starting queued transport work',
);
assert.equal(
  queuedUnmountHarness.records.length,
  1,
  'route unmount must invalidate queued starts before fetchImpl is invoked',
);

const bodyPhaseHarness = pendingFetchHarness();
const bodyPhaseOwner = createDataNetRequestOwnerV1({
  fetchImpl: bodyPhaseHarness.fetchImpl,
  origin: 'https://void.example',
});
const headersOnly = bodyPhaseOwner.fetch(DATANET_URL);
await drainUntil(
  () => bodyPhaseHarness.records.length === 1,
  'body-phase request must start',
);
bodyPhaseHarness.records[0].resolve({ phase: 'headers-returned-body-not-consumed' });
assert.deepEqual(await headersOnly, { phase: 'headers-returned-body-not-consumed' });
assert.equal(bodyPhaseOwner.hasActiveRequest(), true);
const bodyPhaseSignal = bodyPhaseHarness.records[0].signal;
const bodyReplacement = bodyPhaseOwner.fetch(DATANET_URL);
void bodyReplacement.catch(() => {});
await drainUntil(
  () => bodyPhaseHarness.records.length === 2 && bodyPhaseSignal.aborted === true,
  'body-phase replacement must abort and release before starting',
);
assert.equal(
  bodyPhaseSignal.aborted,
  true,
  'replacement must abort the prior request even after its response headers resolved',
);
bodyPhaseHarness.records[1].resolve({ request: 'replacement' });
assert.deepEqual(await bodyReplacement, { request: 'replacement' });
assert.equal(bodyPhaseOwner.abort('test cleanup after body-phase replacement'), true);

const deadlineHarness = pendingFetchHarness();
const deadlineOwner = createDataNetRequestOwnerV1({
  fetchImpl: deadlineHarness.fetchImpl,
  origin: 'https://void.example',
});
const deadline = new AbortController();
const deadlineRequest = deadlineOwner.fetch(DATANET_URL, { signal: deadline.signal });
await drainUntil(
  () => deadlineHarness.records.length === 1,
  'deadline-bound DataNet request must start',
);
deadlineHarness.records[0].resolve({ phase: 'headers-returned' });
assert.deepEqual(await deadlineRequest, { phase: 'headers-returned' });
assert.equal(deadlineOwner.hasActiveRequest(), true);
deadline.abort(new Error('caller total deadline'));
await drainUntil(
  () => deadlineOwner.hasActiveRequest() === false,
  'caller deadline must release a bodyless response generation',
);
assert.equal(
  deadlineHarness.records[0].signal.aborted,
  true,
  'caller deadline must continue forwarding after response headers resolve',
);
assert.match(String(deadlineHarness.records[0].signal.reason?.message), /caller total deadline/);
assert.equal(deadlineOwner.hasActiveRequest(), false);
assert.equal(
  deadlineOwner.abort('deadline cleanup'),
  false,
  'bodyless response ownership should already be released after caller abort cleanup',
);

const unmountHarness = pendingFetchHarness();
const unmountOwner = createDataNetRequestOwnerV1({
  fetchImpl: unmountHarness.fetchImpl,
  origin: 'https://void.example',
});
const mountedRequest = unmountOwner.fetch(DATANET_URL);
void mountedRequest.catch(() => {});
await drainUntil(
  () => unmountHarness.records.length === 1,
  'mounted DataNet request must start',
);
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
await drainUntil(
  () => passThroughHarness.records.length === 1,
  'non-DataNet pass-through request must start',
);
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
  await drainUntil(
    () => runtimeHarness.records.length === 1,
    'installed owner must start the DataNet request',
  );
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
  await drainUntil(
    () => runtimeHarness.records.length === 2,
    'installed owner must start a new generation after unmount cleanup',
  );
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
assert.match(ownerSource, /acquireStartSlot/);
assert.match(ownerSource, /latestStartSerial/);
assert.match(ownerSource, /assertLatestStart\(startSerial\)/);
assert.match(ownerSource, /latestStartSerial \+= 1/);
assert.match(ownerSource, /abortRequest\(priorRequest, 'DataNet request superseded'\)/);
assert.match(ownerSource, /sourceSignal\.addEventListener\('abort'/);
assert.match(ownerSource, /Promise\.race\(\[promise, aborted\]\)\.finally/);
assert.match(ownerSource, /signal\.removeEventListener\('abort', onAbort\)/);
assert.match(ownerSource, /typeof response\.url !== 'string' \|\| response\.url\.length === 0/);
assert.match(ownerSource, /window\.addEventListener\('hashchange', reconcileView\)/);
assert.match(ownerSource, /new MutationObserver\(reconcileView\)/);
assert.doesNotMatch(ownerSource, /POST|PUT|PATCH|DELETE/);
assert.doesNotMatch(ownerSource, /credentials|wallet|signer|Work Credit|transaction/i);

console.log('VOID_APP_DATANET_REQUEST_OWNER_V1_GREEN');
console.log('max_concurrent_datanet_requests=1');
console.log('superseded_request_aborted=true');
console.log('queued_superseders_latest_wins=true');
console.log('queued_superseder_transport_starts=2');
console.log('queued_superseder_max_concurrent_datanet_requests=1');
console.log('queued_starts_invalidated_on_unmount=true');
console.log('body_phase_supersession_aborted=true');
console.log('caller_deadline_signal_preserved=true');
console.log('final_url_identity_required=true');
console.log('abort_race_listener_detached=true');
console.log('route_unmount_aborts=true');
console.log('non_datanet_fetch_passthrough=true');
console.log('mutation_authority=false');
