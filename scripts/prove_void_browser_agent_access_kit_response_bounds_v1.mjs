#!/usr/bin/env node

import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import fs from "node:fs";
import vm from "node:vm";

const POPUP = "integrations/browser/void-browser-agent-access-kit-v1/popup.mjs";
const source = fs.readFileSync(POPUP, "utf8");
const match = source.match(
  /\/\/ VOID_BROWSER_AGENT_RESPONSE_BOUNDS_V1_BEGIN\n([\s\S]*?)\/\/ VOID_BROWSER_AGENT_RESPONSE_BOUNDS_V1_END/,
);
assert.ok(match, "bounded response implementation block missing");

const context = {
  AbortController,
  Headers,
  Promise,
  TextDecoder,
  TextEncoder,
  Uint8Array,
  URL,
  clearTimeout,
  crypto: webcrypto,
  fetch: null,
  setTimeout,
};
vm.createContext(context);
vm.runInContext(match[1], context, { filename: POPUP });
const fetchDocument = context.fetchBoundedJsonDocumentV1;
assert.equal(typeof fetchDocument, "function");

const encode = (value) => new TextEncoder().encode(value);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function fakeResponse({
  url = "https://void.example/data.json",
  redirected = false,
  headers = { "content-type": "application/json" },
  chunks = [encode('{"ok":true}')],
  readImpl = null,
  cancelImpl = async () => {},
  bodyCancelImpl = async () => {},
} = {}) {
  let readIndex = 0;
  let readCalls = 0;
  let readerCancelCalls = 0;
  let bodyCancelCalls = 0;
  const reader = {
    async read() {
      readCalls += 1;
      if (readImpl) return readImpl(readCalls);
      if (readIndex >= chunks.length) return { done: true, value: undefined };
      return { done: false, value: chunks[readIndex++] };
    },
    async cancel(reason) {
      readerCancelCalls += 1;
      return cancelImpl(reason);
    },
  };
  const body = {
    getReader() {
      return reader;
    },
    async cancel(reason) {
      bodyCancelCalls += 1;
      return bodyCancelImpl(reason);
    },
  };
  return {
    ok: true,
    status: 200,
    redirected,
    url,
    headers: new Headers(headers),
    body,
    async arrayBuffer() {
      throw new Error("arrayBuffer prebuffer path must not be used");
    },
    metrics: {
      get readCalls() { return readCalls; },
      get readerCancelCalls() { return readerCancelCalls; },
      get bodyCancelCalls() { return bodyCancelCalls; },
    },
  };
}

async function runWith(response, options = {}) {
  context.fetch = async () => response;
  return fetchDocument("https://void.example/data.json", {
    maximum: 64,
    timeoutMs: 200,
    ...options,
  });
}

const small = fakeResponse();
const smallResult = await runWith(small);
assert.deepEqual(JSON.parse(JSON.stringify(smallResult.value)), { ok: true });
assert.equal(smallResult.byte_length, encode('{"ok":true}').byteLength);
assert.equal(small.metrics.readerCancelCalls, 0);

const declaredOversize = fakeResponse({
  headers: {
    "content-type": "application/json",
    "content-length": "65",
  },
});
await assert.rejects(() => runWith(declaredOversize), /response is too large/);
assert.equal(declaredOversize.metrics.readCalls, 0);
assert.equal(declaredOversize.metrics.bodyCancelCalls, 1);

const malformedLength = fakeResponse({
  headers: {
    "content-type": "application/json",
    "content-length": "01",
  },
});
await assert.rejects(() => runWith(malformedLength), /content-length is invalid/);
assert.equal(malformedLength.metrics.readCalls, 0);
assert.equal(malformedLength.metrics.bodyCancelCalls, 1);

const streamedOverflow = fakeResponse({
  chunks: [new Uint8Array(40), new Uint8Array(40)],
});
await assert.rejects(() => runWith(streamedOverflow), /response is too large/);
assert.equal(streamedOverflow.metrics.readCalls, 2);
assert.equal(streamedOverflow.metrics.readerCancelCalls, 1);

const stalled = fakeResponse({
  readImpl: () => new Promise(() => {}),
});
const stalledStart = Date.now();
await assert.rejects(
  () => runWith(stalled, { timeoutMs: 100 }),
  /deadline|aborted|request failed/i,
);
assert.ok(Date.now() - stalledStart < 700, "stalled body exceeded bounded deadline/teardown");
assert.equal(stalled.metrics.readerCancelCalls, 1);

const rejectingCleanup = fakeResponse({
  chunks: [new Uint8Array(40), new Uint8Array(40)],
  cancelImpl: async () => {
    throw new Error("cleanup rejected");
  },
});
await assert.rejects(() => runWith(rejectingCleanup), /response is too large/);
assert.equal(rejectingCleanup.metrics.readerCancelCalls, 1);

const neverSettlingCleanup = fakeResponse({
  chunks: [new Uint8Array(40), new Uint8Array(40)],
  cancelImpl: () => new Promise(() => {}),
});
const cleanupStart = Date.now();
await assert.rejects(() => runWith(neverSettlingCleanup), /response is too large/);
const cleanupElapsed = Date.now() - cleanupStart;
assert.ok(cleanupElapsed >= 180, "never-settling cleanup was not owned through bounded terminal");
assert.ok(cleanupElapsed < 800, "never-settling cleanup exceeded teardown ceiling");
assert.equal(neverSettlingCleanup.metrics.readerCancelCalls, 1);

const wrongFinalUrl = fakeResponse({ url: "https://attacker.example/data.json" });
await assert.rejects(() => runWith(wrongFinalUrl), /final URL mismatch/);
assert.equal(wrongFinalUrl.metrics.bodyCancelCalls, 1);

const followedRedirect = fakeResponse({ redirected: true });
await assert.rejects(() => runWith(followedRedirect), /redirected response/);
assert.equal(followedRedirect.metrics.bodyCancelCalls, 1);

await delay(0);
console.log("VOID_BROWSER_AGENT_ACCESS_KIT_RESPONSE_BOUNDS_V1_PROOF_GREEN");
console.log("streaming_byte_ceiling=true");
console.log("declared_length_strict=true");
console.log("request_deadline_covers_body=true");
console.log("rejected_body_teardown_bounded=true");
console.log("cleanup_failure_preserves_primary_hold=true");
console.log("final_url_exact=true");
console.log("prebuffer_array_buffer=false");
console.log("mutation_authority=false");
console.log("payment_execution=false");
console.log("fund_movement=false");
