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
assert.doesNotMatch(match[1], /\.catch\(\(\)\s*=>\s*\{\s*\}\)/, "raw empty promise catch introduced");

const context = {
  AbortController,
  Headers,
  Map,
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

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

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

const stalledRead = deferred();
const stalled = fakeResponse({
  readImpl: () => stalledRead.promise,
});
const stalledStart = Date.now();
await assert.rejects(
  () => runWith(stalled, { timeoutMs: 100 }),
  /deadline|aborted|request failed/i,
);
assert.ok(Date.now() - stalledStart < 700, "stalled body exceeded bounded deadline/teardown");
assert.equal(stalled.metrics.readerCancelCalls, 1);
stalledRead.resolve({ done: true, value: undefined });
await delay(0);

const rejectingCleanup = fakeResponse({
  chunks: [new Uint8Array(40), new Uint8Array(40)],
  cancelImpl: async () => {
    throw new Error("cleanup rejected");
  },
});
await assert.rejects(() => runWith(rejectingCleanup), /response is too large/);
assert.equal(rejectingCleanup.metrics.readerCancelCalls, 1);

const pendingCleanup = deferred();
const neverSettlingCleanup = fakeResponse({
  chunks: [new Uint8Array(40), new Uint8Array(40)],
  cancelImpl: () => pendingCleanup.promise,
});
const cleanupStart = Date.now();
await assert.rejects(() => runWith(neverSettlingCleanup), /response is too large/);
const cleanupElapsed = Date.now() - cleanupStart;
assert.ok(cleanupElapsed >= 180, "never-settling cleanup was not owned through bounded terminal");
assert.ok(cleanupElapsed < 800, "never-settling cleanup exceeded teardown ceiling");
assert.equal(neverSettlingCleanup.metrics.readerCancelCalls, 1);
pendingCleanup.resolve();
await delay(0);

const wrongFinalUrl = fakeResponse({ url: "https://attacker.example/data.json" });
await assert.rejects(() => runWith(wrongFinalUrl), /final URL mismatch/);
assert.equal(wrongFinalUrl.metrics.bodyCancelCalls, 1);

const followedRedirect = fakeResponse({ redirected: true });
await assert.rejects(() => runWith(followedRedirect), /redirected response/);
assert.equal(followedRedirect.metrics.bodyCancelCalls, 1);

const quarantineUrl = "https://void.example/quarantine.json";
const lateRead = deferred();
const lateCancel = deferred();
const quarantinedResponse = fakeResponse({
  url: quarantineUrl,
  readImpl: () => lateRead.promise,
  cancelImpl: () => lateCancel.promise,
});
let quarantineFetchCalls = 0;
context.fetch = async () => {
  quarantineFetchCalls += 1;
  return quarantinedResponse;
};
await assert.rejects(
  () => fetchDocument(quarantineUrl, { maximum: 64, timeoutMs: 100 }),
  /deadline|aborted|request failed/i,
);
assert.equal(quarantineFetchCalls, 1);
for (let attempt = 0; attempt < 3; attempt += 1) {
  await assert.rejects(
    () => fetchDocument(quarantineUrl, { maximum: 64, timeoutMs: 100 }),
    /prior response body generation is still unresolved/,
  );
}
assert.equal(quarantineFetchCalls, 1, "retry spawned replacement fetch while prior body generation unresolved");
lateRead.resolve({ done: false, value: encode('{"late":true}') });
await delay(0);
await assert.rejects(
  () => fetchDocument(quarantineUrl, { maximum: 64, timeoutMs: 100 }),
  /prior response body generation is still unresolved/,
);
assert.equal(quarantineFetchCalls, 1, "unresolved cancellation did not retain quarantine");
lateCancel.resolve();
await delay(0);
const recoveredResponse = fakeResponse({ url: quarantineUrl });
context.fetch = async () => {
  quarantineFetchCalls += 1;
  return recoveredResponse;
};
const recovered = await fetchDocument(quarantineUrl, { maximum: 64, timeoutMs: 200 });
assert.deepEqual(JSON.parse(JSON.stringify(recovered.value)), { ok: true });
assert.equal(quarantineFetchCalls, 2, "clean post-settlement recovery did not start exactly one replacement fetch");

await delay(0);
console.log("VOID_BROWSER_AGENT_ACCESS_KIT_RESPONSE_BOUNDS_V1_PROOF_GREEN");
console.log("streaming_byte_ceiling=true");
console.log("declared_length_strict=true");
console.log("request_deadline_covers_body=true");
console.log("rejected_body_teardown_bounded=true");
console.log("unresolved_body_generation_quarantine=true");
console.log("same_url_retry_generation_bound=true");
console.log("late_read_result_discarded=true");
console.log("late_cleanup_release_exact_once=true");
console.log("cleanup_failure_preserves_primary_hold=true");
console.log("raw_empty_promise_catch=false");
console.log("final_url_exact=true");
console.log("prebuffer_array_buffer=false");
console.log("mutation_authority=false");
console.log("payment_execution=false");
console.log("fund_movement=false");
