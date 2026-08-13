#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  dataView,
  fetchDataNetStatusV1,
  loadDataNetViewV1,
  validateDataNetStatusV1,
} from '../public/void-app-wave1-v1/assets/js/data-live.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATUS_PATH = path.join(
  ROOT,
  'public/public-node/datanet/field-replication-status-card-v1.json',
);
const APP_PATH = path.join(
  ROOT,
  'public/void-app-wave1-v1/assets/js/app.js',
);
const DATA_PATH = path.join(
  ROOT,
  'public/void-app-wave1-v1/assets/js/data-live.js',
);

const canonical = JSON.parse(fs.readFileSync(STATUS_PATH, 'utf8'));
const clone = (value) => JSON.parse(JSON.stringify(value));
const encoder = new TextEncoder();

const valid = validateDataNetStatusV1(canonical);
assert.equal(valid.marker, 'VOID_DATANET_FIELD_REPLICATION_STATUS_CARD_V1');
assert.equal(valid.green_marker, 'VOID_DATANET_FIELD_REPLICATION_STATUS_CARD_V1_GREEN');
assert.equal(valid.status, 'green');
assert.equal(valid.field_result.roundtrip_match, true);
assert.equal(valid.safety_boundary.read_only, true);
assert.equal(valid.safety_boundary.no_public_mutation_route, true);
assert.match(valid.field_result.verified_sha256, /^[0-9a-f]{64}$/);

const expectReject = (mutate, pattern) => {
  const candidate = clone(canonical);
  mutate(candidate);
  assert.throws(() => validateDataNetStatusV1(candidate), pattern);
};

expectReject((value) => { value.extra = true; }, /top-level shape/);
expectReject((value) => { value.marker = 'WRONG'; }, /identity/);
expectReject((value) => { value.status = 'hold'; }, /identity/);
expectReject((value) => { value.field_result.extra = true; }, /field result.*shape/);
expectReject(
  (value) => { value.field_result.tailnet_addresses_publicly_redacted = false; },
  /field result is not exact green/,
);
expectReject(
  (value) => { value.field_result.verified_sha256 = '00'; },
  /field result is not exact green/,
);
expectReject(
  (value) => { value.safety_boundary.no_public_mutation_route = false; },
  /safety boundary is not read-only/,
);
expectReject(
  (value) => { value.routes.json = 'https://example.com/status.json'; },
  /routes are not exact public paths/,
);
expectReject(
  (value) => { value.proof_bundle_public_summary_v1.dangerous_authorities_enabled.ledger_write = true; },
  /proof summary is not public-safe/,
);

const makeBody = (chunks, hooks = {}) => ({
  getReader() {
    let index = 0;
    let cancelled = false;
    return {
      async read() {
        hooks.onRead?.(index);
        if (cancelled || index >= chunks.length) return { done: true, value: undefined };
        const value = chunks[index];
        index += 1;
        return { done: false, value };
      },
      async cancel(reason) {
        cancelled = true;
        hooks.onCancel?.(reason);
      },
      releaseLock() {
        hooks.onRelease?.();
      },
    };
  },
});

const makeResponse = ({
  body = JSON.stringify(canonical),
  chunks,
  hooks,
  ok = true,
  status = 200,
  redirected = false,
  url = 'https://void.example/public-node/datanet/field-replication-status-card-v1.json',
  contentLength,
} = {}) => ({
  ok,
  status,
  redirected,
  url,
  headers: {
    get(name) {
      if (String(name).toLowerCase() !== 'content-length') return null;
      return contentLength === undefined ? null : String(contentLength);
    },
  },
  body: makeBody(chunks ?? [encoder.encode(body)], hooks),
});

let request;
const exact = await fetchDataNetStatusV1({
  origin: 'https://void.example',
  fetchImpl: async (url, options) => {
    request = { url, options };
    return makeResponse();
  },
});
assert.equal(exact.status, 'green');
assert.equal(
  request.url,
  'https://void.example/public-node/datanet/field-replication-status-card-v1.json',
);
assert.equal(request.options.method, 'GET');
assert.equal(request.options.cache, 'no-store');
assert.equal(request.options.credentials, 'omit');
assert.equal(request.options.redirect, 'error');
assert.equal(request.options.headers.Accept, 'application/json');

await assert.rejects(
  () => fetchDataNetStatusV1({
    origin: 'https://void.example',
    fetchImpl: async () => makeResponse({ redirected: true }),
  }),
  /redirected/,
);

await assert.rejects(
  () => fetchDataNetStatusV1({
    origin: 'https://void.example',
    fetchImpl: async () => makeResponse({
      url: 'https://other.example/public-node/datanet/field-replication-status-card-v1.json',
    }),
  }),
  /escaped/,
);

await assert.rejects(
  () => fetchDataNetStatusV1({
    origin: 'https://void.example',
    fetchImpl: async () => makeResponse({ contentLength: 200000 }),
  }),
  /size limit/,
);

let streamedReads = 0;
let streamedCancelled = false;
await assert.rejects(
  () => fetchDataNetStatusV1({
    origin: 'https://void.example',
    fetchImpl: async () => makeResponse({
      chunks: [
        new Uint8Array(65536),
        new Uint8Array(65536),
        new Uint8Array(1),
        encoder.encode(JSON.stringify(canonical)),
      ],
      hooks: {
        onRead: () => { streamedReads += 1; },
        onCancel: () => { streamedCancelled = true; },
      },
    }),
  }),
  /size limit/,
);
assert.equal(streamedReads, 3, 'stream must stop immediately after crossing 128 KiB');
assert.equal(streamedCancelled, true, 'over-limit stream must be cancelled');

await assert.rejects(
  () => fetchDataNetStatusV1({
    origin: 'https://void.example',
    fetchImpl: async () => ({
      ...makeResponse(),
      body: null,
    }),
  }),
  /not stream-readable/,
);

const markerMismatch = clone(canonical);
markerMismatch.marker = 'VOID_DATANET_FIELD_REPLICATION_STATUS_CARD_V0';
await assert.rejects(
  () => fetchDataNetStatusV1({
    origin: 'https://void.example',
    fetchImpl: async () => makeResponse({ body: JSON.stringify(markerMismatch) }),
  }),
  /identity/,
);

const html = dataView();
assert.match(html, /data-datanet-view/);
assert.match(html, /Read-only DataNet evidence/);
assert.match(html, /Public mutation<\/span><strong>DISABLED/);
assert.doesNotMatch(html, /type="password"/i);

const appSource = fs.readFileSync(APP_PATH, 'utf8');
assert.match(appSource, /import \{ dataView \} from '\.\/data-live\.js';/);
assert.match(appSource, /route === 'data' \? dataView\(\) : views\[route\]\(\)/);

const dataSource = fs.readFileSync(DATA_PATH, 'utf8');
for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
  assert.doesNotMatch(dataSource, new RegExp(`method:\\s*['"]${method}['"]`));
}
for (const forbidden of [
  'window.ethereum',
  'navigator.credentials',
  'localStorage',
  'sessionStorage',
]) {
  assert.equal(dataSource.includes(forbidden), false, `forbidden browser authority: ${forbidden}`);
}
assert.doesNotMatch(dataSource, /response\.text\(\)/, 'unbounded full-body buffering must remain absent');
assert.match(dataSource, /response\?\.body\?\.getReader\?\.\(\)/);
assert.equal((dataSource.match(/new MutationObserver/g) ?? []).length, 1);
assert.equal((dataSource.match(/observer\.observe\(viewRoot, \{ childList: true \}\)/g) ?? []).length, 1);
assert.doesNotMatch(dataSource, /addEventListener\(['"]hashchange['"]/);
assert.doesNotMatch(dataSource, /setTimeout\(loadDataNet/);

const savedDocument = globalThis.document;
const savedLocation = globalThis.location;
try {
  globalThis.location = { hash: '#/data' };
  globalThis.document = {
    querySelector(selector) {
      return selector === '[data-datanet-view]' ? {} : null;
    },
    querySelectorAll() {
      return [];
    },
  };

  let automaticRequests = 0;
  const loaded = await loadDataNetViewV1({
    origin: 'https://void.example',
    fetchImpl: async () => {
      automaticRequests += 1;
      return makeResponse();
    },
  });
  assert.equal(loaded, true);
  assert.equal(automaticRequests, 1, 'one rendered Data view activation must issue exactly one GET');
} finally {
  if (savedDocument === undefined) delete globalThis.document;
  else globalThis.document = savedDocument;
  if (savedLocation === undefined) delete globalThis.location;
  else globalThis.location = savedLocation;
}

console.log('VOID_APP_DATANET_READONLY_V1_GREEN');
console.log(`verified_bytes=${valid.field_result.verified_bytes}`);
console.log(`proof_markers=${valid.proof_markers.length}`);
console.log('request_method=GET');
console.log('same_origin_only=true');
console.log('credentials=omit');
console.log('redirects=rejected');
console.log('stream_limit_bytes=131072');
console.log('automatic_requests_per_render=1');
console.log('mutation_authority=false');
