#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { fetchDataNetStatusV1 } from '../public/void-app-wave1-v1/assets/js/data-live.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FOUNDATION_PATH = path.join(ROOT, 'src', 'ui', 'void_app_wave1_foundation_v1.ts');
const ADAPTER_SOURCE_PATH = path.join(ROOT, 'src', 'ui', 'void_app_datanet_readonly_adapter_v1.cts');
const ADAPTER_RUNTIME_PATH = path.join(ROOT, 'dist', 'ui', 'void_app_datanet_readonly_adapter_v1.cjs');
const STATUS_ROUTE = '/public-node/datanet/field-replication-status-card-v1.json';
const HTML_ROUTE = '/public-node/datanet/field-replication-status-card-v1.html';
const INDEX_ROUTE = '/public-node/datanet/index.json';
const EXPECTED_MARKER = 'VOID_APP_DATANET_READONLY_ADAPTER_V1';

const foundationSource = fs.readFileSync(FOUNDATION_PATH, 'utf8');
const adapterSource = fs.readFileSync(ADAPTER_SOURCE_PATH, 'utf8');

assert.equal(
  foundationSource.split('require("./void_app_datanet_readonly_adapter_v1.cjs");').length - 1,
  1,
  'App foundation must load the packaged DataNet adapter exactly once',
);
assert.match(foundationSource, /const ROUTE_PREFIX = "\/app"/);
assert.match(foundationSource, /express\.static\(shellDir/);

for (const route of [STATUS_ROUTE, HTML_ROUTE, INDEX_ROUTE]) {
  assert.equal(adapterSource.includes(JSON.stringify(route)), true, `missing exact adapter route: ${route}`);
}
for (const forbidden of [
  'app.post(',
  'app.put(',
  'app.patch(',
  'app.delete(',
  'writeFileSync',
  'appendFileSync',
  'wallet',
  'signer',
  'transaction',
  'work_credit',
]) {
  assert.equal(adapterSource.includes(forbidden), false, `unexpected adapter authority marker: ${forbidden}`);
}
assert.match(adapterSource, /method !== "GET" && method !== "HEAD"/);
assert.match(adapterSource, /error: "method_not_allowed"/);
assert.match(adapterSource, /read_only: true/);
assert.equal(
  fs.existsSync(ADAPTER_RUNTIME_PATH),
  true,
  'packaged DataNet adapter missing from dist; run npm run build before this proof',
);

const handlers = [];
const previousApp = globalThis.__void_http_app;
globalThis.__void_http_app = {
  use(handler) {
    handlers.push(handler);
  },
};

const require = createRequire(import.meta.url);
const adapter = require(ADAPTER_RUNTIME_PATH);

if (previousApp === undefined) delete globalThis.__void_http_app;
else globalThis.__void_http_app = previousApp;

assert.equal(adapter.ROUTE_MARKER, EXPECTED_MARKER);
assert.equal(adapter.ROUTE_FILES.size, 3);
assert.equal(handlers.length, 1, 'adapter must mount exactly one bounded middleware');
const adapterHandler = handlers[0];

const server = http.createServer((req, res) => {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.type = (contentType) => {
    res.setHeader('Content-Type', contentType);
    return res;
  };
  res.json = (value) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(value));
    return res;
  };
  res.sendFile = (target) => {
    try {
      const bytes = fs.readFileSync(target);
      if (req.method === 'HEAD') res.end();
      else res.end(bytes);
    } catch {
      res.statusCode = 404;
      res.end('not found');
    }
    return res;
  };

  adapterHandler(req, res, () => {
    if (!res.writableEnded) {
      res.statusCode = 404;
      res.end('not found');
    }
  });
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});

try {
  const address = server.address();
  assert(address && typeof address === 'object');
  const origin = `http://127.0.0.1:${address.port}`;

  const localSnapshot = await fetchDataNetStatusV1({ origin });
  assert.equal(localSnapshot.marker, 'VOID_DATANET_FIELD_REPLICATION_STATUS_CARD_V1');
  assert.equal(localSnapshot.status, 'green');
  assert.equal(localSnapshot.safety_boundary.read_only, true);

  const jsonResponse = await fetch(`${origin}${STATUS_ROUTE}`);
  assert.equal(jsonResponse.status, 200);
  assert.equal(jsonResponse.headers.get('x-void-marker'), EXPECTED_MARKER);
  assert.equal((await jsonResponse.json()).marker, 'VOID_DATANET_FIELD_REPLICATION_STATUS_CARD_V1');

  const headResponse = await fetch(`${origin}${STATUS_ROUTE}`, { method: 'HEAD' });
  assert.equal(headResponse.status, 200);
  assert.equal(headResponse.headers.get('x-void-marker'), EXPECTED_MARKER);

  const htmlResponse = await fetch(`${origin}${HTML_ROUTE}`);
  assert.equal(htmlResponse.status, 200);
  assert.match(htmlResponse.headers.get('content-type') || '', /text\/html/);

  const indexResponse = await fetch(`${origin}${INDEX_ROUTE}`);
  assert.equal(indexResponse.status, 200);
  assert.match(indexResponse.headers.get('content-type') || '', /application\/json/);

  const postResponse = await fetch(`${origin}${STATUS_ROUTE}`, { method: 'POST' });
  assert.equal(postResponse.status, 405);
  const postBody = await postResponse.json();
  assert.equal(postBody.error, 'method_not_allowed');
  assert.equal(postBody.read_only, true);
} finally {
  await new Promise((resolve) => server.close(resolve));
}

let outsideStatus = 0;
let outsideBody = null;
const outsideRes = {
  setHeader() {},
  status(code) {
    outsideStatus = code;
    return this;
  },
  json(value) {
    outsideBody = value;
    return this;
  },
};
adapterHandler(
  {
    method: 'GET',
    originalUrl: STATUS_ROUTE,
    socket: { remoteAddress: '203.0.113.8' },
  },
  outsideRes,
  () => assert.fail('matched DataNet route must not fall through'),
);
assert.equal(outsideStatus, 404);
assert.equal(outsideBody?.error, 'not_found');

console.log('VOID_APP_DATANET_LOCAL_ORIGIN_V1_GREEN');
console.log('app_origin_status_card_http=200');
console.log('same_origin_adapter=true');
console.log('packaged_runtime_adapter=true');
console.log('loopback_only=true');
console.log('methods=GET,HEAD');
console.log('public_mutation=false');
console.log('wallet_signer_transaction_authority=false');
