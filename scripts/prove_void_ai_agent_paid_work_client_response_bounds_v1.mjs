#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  VOID_AI_AGENT_PAID_WORK_CLIENT_V1,
  probeVoidAiAgentPaidWorkV1,
} from "../tools/void-ai-agent-paid-work-client-v1.mjs";

const DISCOVERY_PATH = "/.well-known/void-agent-discovery.json";
const ROUTE_PATH = "/__void/agents/paid-work/submissions/v1";
const encoder = new TextEncoder();

function bytes(text) {
  return encoder.encode(text);
}

function discoveryJson() {
  return JSON.stringify({
    marker: "VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1",
    protocol: "void-agent-discovery-well-known/1",
  });
}

function routeProbeResponse() {
  const payload = JSON.stringify({ error: "method_not_allowed" });
  return new Response(payload, {
    status: 405,
    headers: {
      "content-type": "application/json",
      "content-length": String(bytes(payload).byteLength),
      allow: "POST",
    },
  });
}

function makeFetch(discoveryFactory) {
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    fetch: async (url, options = {}) => {
      calls += 1;
      assert.equal(options.method, "GET");
      assert.equal(options.redirect, "manual");
      assert.ok(options.signal instanceof AbortSignal);
      const parsed = new URL(url);
      if (parsed.pathname === DISCOVERY_PATH) {
        return discoveryFactory(options.signal);
      }
      if (parsed.pathname === ROUTE_PATH) {
        return routeProbeResponse();
      }
      throw new Error(`unexpected URL: ${parsed.href}`);
    },
  };
}

async function expectPrimarySizeError(run, pattern) {
  let error = null;
  try {
    await run();
  } catch (caught) {
    error = caught;
  }
  assert.ok(error instanceof Error, "expected a bounded response error");
  assert.match(error.message, pattern);
  return error;
}

async function capturePrimaryError(run) {
  let error = null;
  try {
    await run();
  } catch (caught) {
    error = caught;
  }
  assert.ok(error instanceof Error, "expected a primary response error");
  return error;
}

function admittedReadFailureResponse(signal, cancelImpl, errorMessage) {
  let reads = 0;
  const reader = {
    async read() {
      reads += 1;
      if (reads === 1) {
        return { done: false, value: bytes("{") };
      }
      return await new Promise((_, reject) => {
        const rejectOnAbort = () =>
          reject(new DOMException(errorMessage, "AbortError"));
        if (signal.aborted) {
          rejectOnAbort();
          return;
        }
        signal.addEventListener("abort", rejectOnAbort, { once: true });
      });
    },
    cancel: cancelImpl,
    releaseLock() {},
  };
  return {
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    body: {
      getReader() {
        return reader;
      },
    },
  };
}

function unreadableBodyResponse(cancelImpl) {
  return {
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    body: {
      cancel: cancelImpl,
    },
  };
}

function signalIgnoringReadResponse({ cancelImpl, releaseImpl, readPromise }) {
  return {
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    body: {
      getReader() {
        return {
          read() {
            return readPromise;
          },
          cancel: cancelImpl,
          releaseLock: releaseImpl,
        };
      },
    },
  };
}

{
  const payload = discoveryJson();
  const fixture = makeFetch(() =>
    new Response(payload, {
      status: 200,
      headers: {
        "content-type": "application/json",
        "content-length": String(bytes(payload).byteLength),
      },
    }),
  );
  const result = await probeVoidAiAgentPaidWorkV1({
    baseUrl: "https://paid-work.example.invalid",
    timeoutMs: 1000,
    maxResponseBytes: 1024,
    fetchImpl: fixture.fetch,
  });
  assert.equal(result.marker, VOID_AI_AGENT_PAID_WORK_CLIENT_V1);
  assert.equal(result.discovery.http_status, 200);
  assert.equal(result.submission_route.http_status, 405);
  assert.equal(fixture.calls, 2);
  assert.equal(result.authority.payment_authorized, false);
  assert.equal(result.authority.work_execution_authorized, false);
  assert.equal(result.authority.wc_award_authorized, false);
  assert.equal(result.authority.wallet_or_signer_access, false);
  assert.equal(result.authority.transaction_broadcast_authority, false);
}

{
  let cancelCalls = 0;
  let abortEvents = 0;
  const fixture = makeFetch((signal) => {
    signal.addEventListener("abort", () => {
      abortEvents += 1;
    }, { once: true });
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(bytes("ignored"));
      },
      cancel() {
        cancelCalls += 1;
      },
    });
    return new Response(stream, {
      status: 200,
      headers: {
        "content-type": "application/json",
        "content-length": "2048",
      },
    });
  });
  await expectPrimarySizeError(
    () => probeVoidAiAgentPaidWorkV1({
      baseUrl: "https://paid-work.example.invalid",
      timeoutMs: 1000,
      maxResponseBytes: 1024,
      fetchImpl: fixture.fetch,
    }),
    /^response_too_large:2048$/,
  );
  assert.equal(fixture.calls, 1);
  assert.equal(cancelCalls, 1);
  assert.equal(abortEvents, 1);
}

{
  let cancelCalls = 0;
  const fixture = makeFetch(() => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(bytes("ignored"));
      },
      cancel() {
        cancelCalls += 1;
      },
    });
    return new Response(stream, {
      status: 200,
      headers: {
        "content-type": "application/json",
        "content-length": "1e6",
      },
    });
  });
  await expectPrimarySizeError(
    () => probeVoidAiAgentPaidWorkV1({
      baseUrl: "https://paid-work.example.invalid",
      timeoutMs: 1000,
      maxResponseBytes: 1024,
      fetchImpl: fixture.fetch,
    }),
    /^response_content_length_invalid:1e6$/,
  );
  assert.equal(cancelCalls, 1);
}

{
  let cancelCalls = 0;
  let abortEvents = 0;
  const fixture = makeFetch((signal) => {
    signal.addEventListener("abort", () => {
      abortEvents += 1;
    }, { once: true });
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(700));
        controller.enqueue(new Uint8Array(700));
      },
      cancel() {
        cancelCalls += 1;
      },
    });
    return new Response(stream, {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  await expectPrimarySizeError(
    () => probeVoidAiAgentPaidWorkV1({
      baseUrl: "https://paid-work.example.invalid",
      timeoutMs: 1000,
      maxResponseBytes: 1024,
      fetchImpl: fixture.fetch,
    }),
    /^response_too_large:1400$/,
  );
  assert.equal(cancelCalls, 1);
  assert.equal(abortEvents, 1);
}

{
  let cancelCalls = 0;
  const fixture = makeFetch(() => {
    const stream = new ReadableStream({
      cancel() {
        cancelCalls += 1;
        return new Promise(() => {});
      },
    });
    return new Response(stream, {
      status: 200,
      headers: {
        "content-type": "application/json",
        "content-length": "2048",
      },
    });
  });
  const started = Date.now();
  await expectPrimarySizeError(
    () => probeVoidAiAgentPaidWorkV1({
      baseUrl: "https://paid-work.example.invalid",
      timeoutMs: 800,
      maxResponseBytes: 1024,
      fetchImpl: fixture.fetch,
    }),
    /^response_too_large:2048$/,
  );
  assert.ok(Date.now() - started < 650, "non-settling cancellation exceeded bounded teardown window");
  assert.equal(cancelCalls, 1);
}

{
  let cancelCalls = 0;
  const fixture = makeFetch(() => {
    const stream = new ReadableStream({
      cancel() {
        cancelCalls += 1;
        return Promise.reject(new Error("synthetic_cancel_failure"));
      },
    });
    return new Response(stream, {
      status: 200,
      headers: {
        "content-type": "application/json",
        "content-length": "2048",
      },
    });
  });
  await expectPrimarySizeError(
    () => probeVoidAiAgentPaidWorkV1({
      baseUrl: "https://paid-work.example.invalid",
      timeoutMs: 1000,
      maxResponseBytes: 1024,
      fetchImpl: fixture.fetch,
    }),
    /^response_too_large:2048$/,
  );
  assert.equal(cancelCalls, 1);
}

{
  let abortEvents = 0;
  const fixture = makeFetch((signal) => {
    let streamController;
    const stream = new ReadableStream({
      start(controller) {
        streamController = controller;
        controller.enqueue(bytes("{"));
      },
    });
    signal.addEventListener("abort", () => {
      abortEvents += 1;
      try {
        streamController.error(new DOMException("aborted", "AbortError"));
      } catch {
        // Stream may already be terminal.
      }
    }, { once: true });
    return new Response(stream, {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  const started = Date.now();
  await assert.rejects(
    () => probeVoidAiAgentPaidWorkV1({
      baseUrl: "https://paid-work.example.invalid",
      timeoutMs: 120,
      maxResponseBytes: 1024,
      fetchImpl: fixture.fetch,
    }),
  );
  assert.ok(Date.now() - started < 600, "stalled body escaped request deadline plus teardown bound");
  assert.equal(abortEvents, 1);
}

{
  let cancelCalls = 0;
  let abortEvents = 0;
  const fixture = makeFetch((signal) => {
    signal.addEventListener("abort", () => {
      abortEvents += 1;
    }, { once: true });
    return admittedReadFailureResponse(
      signal,
      () => {
        cancelCalls += 1;
        return new Promise(() => {});
      },
      "synthetic_admitted_read_timeout",
    );
  });
  const started = Date.now();
  const error = await capturePrimaryError(
    () => probeVoidAiAgentPaidWorkV1({
      baseUrl: "https://paid-work.example.invalid",
      timeoutMs: 120,
      maxResponseBytes: 1024,
      fetchImpl: fixture.fetch,
    }),
  );
  assert.equal(error.name, "AbortError");
  assert.equal(error.message, "response_body_read_timeout");
  assert.ok(Date.now() - started < 650, "admitted read timeout teardown escaped bounded cleanup window");
  assert.equal(cancelCalls, 1);
  assert.equal(abortEvents, 1);
}

{
  let cancelCalls = 0;
  const fixture = makeFetch((signal) =>
    admittedReadFailureResponse(
      signal,
      () => {
        cancelCalls += 1;
        return Promise.reject(new Error("synthetic_admitted_cancel_failure"));
      },
      "synthetic_admitted_read_failure",
    ),
  );
  const error = await capturePrimaryError(
    () => probeVoidAiAgentPaidWorkV1({
      baseUrl: "https://paid-work.example.invalid",
      timeoutMs: 120,
      maxResponseBytes: 1024,
      fetchImpl: fixture.fetch,
    }),
  );
  assert.equal(error.name, "AbortError");
  assert.equal(error.message, "response_body_read_timeout");
  assert.equal(cancelCalls, 1);
}

{
  let cancelCalls = 0;
  let abortEvents = 0;
  const fixture = makeFetch((signal) => {
    signal.addEventListener("abort", () => {
      abortEvents += 1;
    }, { once: true });
    return unreadableBodyResponse(() => {
      cancelCalls += 1;
      return new Promise(() => {});
    });
  });
  const started = Date.now();
  const error = await capturePrimaryError(
    () => probeVoidAiAgentPaidWorkV1({
      baseUrl: "https://paid-work.example.invalid",
      timeoutMs: 800,
      maxResponseBytes: 1024,
      fetchImpl: fixture.fetch,
    }),
  );
  assert.equal(error.message, "response_body_unavailable");
  assert.ok(Date.now() - started < 650, "unreadable body non-settling cleanup escaped bounded teardown window");
  assert.equal(cancelCalls, 1);
  assert.equal(abortEvents, 1);
}

{
  let cancelCalls = 0;
  const fixture = makeFetch(() =>
    unreadableBodyResponse(() => {
      cancelCalls += 1;
      return Promise.reject(new Error("synthetic_unreadable_cancel_failure"));
    }),
  );
  const error = await capturePrimaryError(
    () => probeVoidAiAgentPaidWorkV1({
      baseUrl: "https://paid-work.example.invalid",
      timeoutMs: 1000,
      maxResponseBytes: 1024,
      fetchImpl: fixture.fetch,
    }),
  );
  assert.equal(error.message, "response_body_unavailable");
  assert.equal(cancelCalls, 1);
}

{
  let abortEvents = 0;
  const fixture = makeFetch((signal) => {
    signal.addEventListener("abort", () => {
      abortEvents += 1;
    }, { once: true });
    return {
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      body: null,
    };
  });
  const started = Date.now();
  const error = await capturePrimaryError(
    () => probeVoidAiAgentPaidWorkV1({
      baseUrl: "https://paid-work.example.invalid",
      timeoutMs: 1000,
      maxResponseBytes: 1024,
      fetchImpl: fixture.fetch,
    }),
  );
  assert.equal(error.message, "response_body_unavailable");
  assert.ok(Date.now() - started < 250, "missing body should fail promptly without invented fallback");
  assert.equal(abortEvents, 1);
}

{
  let settleRead;
  let cancelCalls = 0;
  let releaseCalls = 0;
  const readPromise = new Promise((resolve) => {
    settleRead = resolve;
  });
  const fixture = makeFetch(() => signalIgnoringReadResponse({
    readPromise,
    cancelImpl() {
      cancelCalls += 1;
    },
    releaseImpl() {
      releaseCalls += 1;
    },
  }));
  const baseUrl = "https://late-read.example.invalid";
  const started = Date.now();
  const timeout = await capturePrimaryError(
    () => probeVoidAiAgentPaidWorkV1({
      baseUrl,
      timeoutMs: 40,
      maxResponseBytes: 1024,
      fetchImpl: fixture.fetch,
    }),
  );
  assert.equal(timeout.name, "AbortError");
  assert.equal(timeout.message, "response_body_read_timeout");
  assert.ok(Date.now() - started < 500, "signal-ignoring read escaped owned deadline");
  assert.equal(cancelCalls, 1);
  assert.equal(releaseCalls, 0, "pending read lock must remain owned");

  const quarantined = await capturePrimaryError(
    () => probeVoidAiAgentPaidWorkV1({
      baseUrl,
      timeoutMs: 40,
      maxResponseBytes: 1024,
      fetchImpl: fixture.fetch,
    }),
  );
  assert.equal(quarantined.message, "response_body_read_generation_unresolved");
  assert.equal(fixture.calls, 1, "quarantine must prevent replacement fetch generation");

  settleRead({ done: true, value: undefined });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(releaseCalls, 1, "late settlement must release the retained reader lock");

  const recoveredPayload = discoveryJson();
  const recovered = makeFetch(() => new Response(recoveredPayload, {
    status: 200,
    headers: { "content-type": "application/json" },
  }));
  const recoveredResult = await probeVoidAiAgentPaidWorkV1({
    baseUrl,
    timeoutMs: 1000,
    maxResponseBytes: 1024,
    fetchImpl: recovered.fetch,
  });
  assert.equal(recoveredResult.discovery.http_status, 200);
  assert.equal(recovered.calls, 2);
}

// Concurrent same-origin requests must share one read-generation slot from
// the start of fetch, not merely after the first unreadable body times out.
{
  let admitFetch;
  let settleRead;
  let fetchCalls = 0;
  let cancelCalls = 0;
  let releaseCalls = 0;
  const fetchGate = new Promise((resolve) => { admitFetch = resolve; });
  const readPromise = new Promise((resolve) => { settleRead = resolve; });
  const fetchImpl = async () => {
    fetchCalls += 1;
    return fetchGate;
  };
  const baseUrl = "https://parallel-pending-read.example.invalid";
  const run = () => probeVoidAiAgentPaidWorkV1({
    baseUrl,
    timeoutMs: 100,
    maxResponseBytes: 1024,
    fetchImpl,
  });
  const first = capturePrimaryError(run);
  const contenders = Array.from({ length: 12 }, () => capturePrimaryError(run));
  assert.equal(fetchCalls, 1, "only one same-origin fetch may start before the first read");
  const concurrent = await Promise.all(contenders);
  for (const rejected of concurrent) {
    assert.equal(rejected.message, "response_body_read_generation_unresolved");
  }
  assert.equal(fetchCalls, 1, "concurrent requests must not create alternate generations");

  admitFetch(signalIgnoringReadResponse({
    readPromise,
    cancelImpl() { cancelCalls += 1; },
    releaseImpl() { releaseCalls += 1; },
  }));
  const timedOut = await first;
  assert.equal(timedOut.name, "AbortError");
  assert.equal(timedOut.message, "response_body_read_timeout");
  assert.equal(cancelCalls, 1);
  assert.equal(releaseCalls, 0);
  const whilePending = await capturePrimaryError(run);
  assert.equal(whilePending.message, "response_body_read_generation_unresolved");
  assert.equal(fetchCalls, 1);

  settleRead({ done: true, value: undefined });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(releaseCalls, 1, "late read settles and releases the original lock once");
  const recovered = makeFetch(() => new Response(discoveryJson(), {
    status: 200,
    headers: { "content-type": "application/json" },
  }));
  const recoveredResult = await probeVoidAiAgentPaidWorkV1({
    baseUrl,
    timeoutMs: 1000,
    maxResponseBytes: 1024,
    fetchImpl: recovered.fetch,
  });
  assert.equal(recoveredResult.discovery.http_status, 200);
  assert.equal(recovered.calls, 2, "late settlement must reopen the origin");
}

// The body's reader may also own an earlier abort listener installed during
// getReader(). A raced rejection cannot change the deterministic owner error.
{
  let readAbortEvents = 0;
  let cancelCalls = 0;
  let releaseCalls = 0;
  const baseUrl = "https://reader-abort-listener-order.example.invalid";
  const fixture = makeFetch((signal) => {
    let rejectRead;
    const heldRead = new Promise((_, reject) => { rejectRead = reject; });
    return {
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      body: {
        getReader() {
          signal.addEventListener("abort", () => {
            readAbortEvents += 1;
            rejectRead(new Error("reader_abort_listener_won_first"));
          }, { once: true });
          return {
            read() { return heldRead; },
            cancel() { cancelCalls += 1; },
            releaseLock() { releaseCalls += 1; },
          };
        },
      },
    };
  });
  const result = await capturePrimaryError(() => probeVoidAiAgentPaidWorkV1({
    baseUrl, timeoutMs: 45, maxResponseBytes: 1024, fetchImpl: fixture.fetch,
  }));
  assert.equal(result.name, "AbortError");
  assert.equal(result.message, "response_body_read_timeout");
  assert.equal(readAbortEvents, 1);
  assert.equal(cancelCalls, 1);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(releaseCalls, 1, "settled rejected read must release exactly once");
  const recovered = makeFetch(() => new Response(discoveryJson(), {
    status: 200, headers: { "content-type": "application/json" },
  }));
  const ready = await probeVoidAiAgentPaidWorkV1({
    baseUrl, timeoutMs: 1000, maxResponseBytes: 1024, fetchImpl: recovered.fetch,
  });
  assert.equal(ready.discovery.http_status, 200);
  assert.equal(recovered.calls, 2);
}

// A fetch registered before the client deadline listener can reject first
// when AbortSignal fires. The owned timeout still outranks that custom error.
{
  let fetchCalls = 0;
  const baseUrl = "https://abort-listener-order.example.invalid";
  const fetchImpl = (_url, options) => {
    fetchCalls += 1;
    return new Promise((_, reject) => {
      options.signal.addEventListener("abort", () => {
        reject(new Error("synthetic_fetch_abort_listener_won_first"));
      }, { once: true });
    });
  };
  const result = await capturePrimaryError(() => probeVoidAiAgentPaidWorkV1({
    baseUrl, timeoutMs: 45, maxResponseBytes: 1024, fetchImpl,
  }));
  assert.equal(result.name, "AbortError");
  assert.equal(result.message, "response_fetch_timeout",
    "custom fetch abort rejection must not replace the owned timeout");
  assert.equal(fetchCalls, 1);
  await new Promise((resolve) => setImmediate(resolve));
  const recovered = makeFetch(() => new Response(discoveryJson(), {
    status: 200, headers: { "content-type": "application/json" },
  }));
  const ready = await probeVoidAiAgentPaidWorkV1({
    baseUrl, timeoutMs: 1000, maxResponseBytes: 1024, fetchImpl: recovered.fetch,
  });
  assert.equal(ready.discovery.http_status, 200);
  assert.equal(recovered.calls, 2);
}

// Abort-ignoring fetch before response headers must not hang the owner, nor
// allow a new same-origin generation while that original fetch is unresolved.
{
  let fetchCalls = 0;
  const baseUrl = "https://never-settles-before-headers.example.invalid";
  const fetchImpl = () => {
    fetchCalls += 1;
    return new Promise(() => {});
  };
  const run = () => probeVoidAiAgentPaidWorkV1({
    baseUrl, timeoutMs: 40, maxResponseBytes: 1024, fetchImpl,
  });
  const started = Date.now();
  const timedOut = await capturePrimaryError(run);
  assert.equal(timedOut.name, "AbortError");
  assert.equal(timedOut.message, "response_fetch_timeout");
  assert.ok(Date.now() - started < 650, "pre-header fetch exceeded owned deadline");
  for (let i = 0; i < 4; i += 1) {
    const quarantined = await capturePrimaryError(run);
    assert.equal(quarantined.message, "response_body_read_generation_unresolved");
  }
  assert.equal(fetchCalls, 1, "unresolved fetch must prevent replacement origin generations");
}

// A late response may own a body that ignored abort. Retain the same slot
// through body cancellation, then reopen only on successful cleanup.
{
  let releaseFetch;
  let releaseCancel;
  let cancelCalls = 0;
  let fetchCalls = 0;
  const outstanding = new Promise((resolve) => { releaseFetch = resolve; });
  const cancelled = new Promise((resolve) => { releaseCancel = resolve; });
  const baseUrl = "https://late-fetch-cancellation.example.invalid";
  const fetchImpl = () => {
    fetchCalls += 1;
    return outstanding;
  };
  const run = () => probeVoidAiAgentPaidWorkV1({
    baseUrl, timeoutMs: 45, maxResponseBytes: 1024, fetchImpl,
  });
  const timedOut = await capturePrimaryError(run);
  assert.equal(timedOut.name, "AbortError");
  assert.equal(timedOut.message, "response_fetch_timeout");
  assert.equal((await capturePrimaryError(run)).message,
    "response_body_read_generation_unresolved");
  releaseFetch({
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    body: {
      cancel() {
        cancelCalls += 1;
        return cancelled;
      },
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(cancelCalls, 1, "late response body cancellation required once");
  assert.equal((await capturePrimaryError(run)).message,
    "response_body_read_generation_unresolved",
    "unfinished late cancellation must preserve original origin slot");
  assert.equal(fetchCalls, 1);
  releaseCancel();
  await new Promise((resolve) => setImmediate(resolve));
  const recovered = makeFetch(() => new Response(discoveryJson(), {
    status: 200, headers: { "content-type": "application/json" },
  }));
  const ready = await probeVoidAiAgentPaidWorkV1({
    baseUrl, timeoutMs: 1000, maxResponseBytes: 1024, fetchImpl: recovered.fetch,
  });
  assert.equal(ready.discovery.http_status, 200);
  assert.equal(recovered.calls, 2);
}

// A late fetch rejection has no response body and must retire only its own
// generation; it cannot leave the origin quarantined indefinitely.
{
  let rejectFetch;
  const outstanding = new Promise((_, reject) => { rejectFetch = reject; });
  const baseUrl = "https://late-fetch-reject.example.invalid";
  const fetchImpl = () => outstanding;
  const run = () => probeVoidAiAgentPaidWorkV1({
    baseUrl, timeoutMs: 45, maxResponseBytes: 1024, fetchImpl,
  });
  const timeout = await capturePrimaryError(run);
  assert.equal(timeout.name, "AbortError");
  assert.equal(timeout.message, "response_fetch_timeout");
  rejectFetch(new Error("late_fetch_rejection"));
  await new Promise((resolve) => setImmediate(resolve));
  const recovered = makeFetch(() => new Response(discoveryJson(), {
    status: 200, headers: { "content-type": "application/json" },
  }));
  const ready = await probeVoidAiAgentPaidWorkV1({
    baseUrl, timeoutMs: 1000, maxResponseBytes: 1024, fetchImpl: recovered.fetch,
  });
  assert.equal(ready.discovery.http_status, 200);
  assert.equal(recovered.calls, 2);
}

{
  let cancelCalls = 0;
  let releaseCalls = 0;
  const fixture = makeFetch(() => signalIgnoringReadResponse({
    readPromise: new Promise(() => {}),
    cancelImpl() {
      cancelCalls += 1;
      return Promise.reject(new Error("synthetic_signal_ignoring_cancel_failure"));
    },
    releaseImpl() {
      releaseCalls += 1;
    },
  }));
  const baseUrl = "https://quarantined-read.example.invalid";
  const timeout = await capturePrimaryError(
    () => probeVoidAiAgentPaidWorkV1({
      baseUrl,
      timeoutMs: 40,
      maxResponseBytes: 1024,
      fetchImpl: fixture.fetch,
    }),
  );
  assert.equal(timeout.name, "AbortError");
  assert.equal(timeout.message, "response_body_read_timeout");
  assert.equal(cancelCalls, 1);
  assert.equal(releaseCalls, 0);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const quarantined = await capturePrimaryError(
      () => probeVoidAiAgentPaidWorkV1({
        baseUrl,
        timeoutMs: 40,
        maxResponseBytes: 1024,
        fetchImpl: fixture.fetch,
      }),
    );
    assert.equal(quarantined.message, "response_body_read_generation_unresolved");
  }
  assert.equal(fixture.calls, 1, "one unresolved read must not accumulate replacement generations");
  assert.equal(cancelCalls, 1, "unresolved read cancellation must be attempted exactly once");
}

console.log("VOID_AI_AGENT_PAID_WORK_CLIENT_RESPONSE_BOUNDS_V1_PROOF_GREEN");
console.log("declared_response_bound_prebuffer=true");
console.log("streamed_response_bound_prebuffer=true");
console.log("malformed_content_length_fail_closed=true");
console.log("rejection_abort_owned=true");
console.log("rejection_teardown_bounded=true");
console.log("stalled_body_total_deadline=true");
console.log("signal_ignoring_read_deadline=true");
console.log("unresolved_read_generation_quarantined=true");
console.log("concurrent_read_generation_singleflight=true");
console.log("signal_ignoring_fetch_total_deadline=true");
console.log("fetch_abort_rejection_owned_timeout=true");
console.log("reader_abort_rejection_owned_timeout=true");
console.log("late_fetch_cancellation_retains_quarantine=true");
console.log("late_fetch_rejection_recovery=true");
console.log("late_read_settlement_recovery=true");
console.log("admitted_read_failure_teardown_bounded=true");
console.log("admitted_read_failure_primary_error_preserved=true");
console.log("unreadable_body_teardown_bounded=true");
console.log("unreadable_body_primary_error_preserved=true");
console.log("credential_or_token_output=false");
console.log("wallet_or_signer_authority=false");
console.log("work_credit_mutation_authority=false");
console.log("transaction_authority=false");
