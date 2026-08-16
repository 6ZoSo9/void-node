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
  assert.ok(Date.now() - started < 600, "stalled body escaped request deadline");
  assert.equal(abortEvents, 1);
}

console.log("VOID_AI_AGENT_PAID_WORK_CLIENT_RESPONSE_BOUNDS_V1_PROOF_GREEN");
console.log("declared_response_bound_prebuffer=true");
console.log("streamed_response_bound_prebuffer=true");
console.log("malformed_content_length_fail_closed=true");
console.log("rejection_abort_owned=true");
console.log("rejection_teardown_bounded=true");
console.log("stalled_body_total_deadline=true");
console.log("credential_or_token_output=false");
console.log("wallet_or_signer_authority=false");
console.log("work_credit_mutation_authority=false");
console.log("transaction_authority=false");
