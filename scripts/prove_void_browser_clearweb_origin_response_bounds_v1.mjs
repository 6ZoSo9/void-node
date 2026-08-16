#!/usr/bin/env node

import assert from "node:assert/strict";

import {
  collectRouteEvidence,
} from "../ops/mainnet0/survey_void_browser_clearweb_origin_readiness_v1.mjs";

const ORIGIN = "https://node.example";
const MAXIMUM = 8;

function headerBag(values = {}) {
  const entries = new Map(
    Object.entries(values).map(([key, value]) => [key.toLowerCase(), String(value)]),
  );
  return Object.freeze({
    get(name) {
      return entries.get(String(name).toLowerCase()) ?? null;
    },
    has(name) {
      return entries.has(String(name).toLowerCase());
    },
  });
}

function response(url, options = {}) {
  const chunks = (options.chunks ?? []).map((chunk) =>
    chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk),
  );
  const stats = {
    read_calls: 0,
    cancel_calls: 0,
    body_cancel_calls: 0,
  };
  let index = 0;
  const reader = {
    read() {
      stats.read_calls += 1;
      if (options.stallRead) return new Promise(() => {});
      if (options.readReject) return Promise.reject(options.readReject);
      if (index >= chunks.length) return Promise.resolve({ done: true, value: undefined });
      return Promise.resolve({ done: false, value: chunks[index++] });
    },
    cancel() {
      stats.cancel_calls += 1;
      if (options.cancelReject) return Promise.reject(new Error("synthetic cancel rejection"));
      if (options.cancelNeverSettles) return new Promise(() => {});
      return Promise.resolve();
    },
  };
  const body = options.bodyMissing
    ? null
    : {
        getReader() {
          return reader;
        },
        cancel() {
          stats.body_cancel_calls += 1;
          if (options.cancelReject) return Promise.reject(new Error("synthetic cancel rejection"));
          if (options.cancelNeverSettles) return new Promise(() => {});
          return Promise.resolve();
        },
      };
  return {
    response: {
      status: options.status ?? 200,
      url,
      headers: headerBag({
        "content-type": "application/json",
        ...(options.headers ?? {}),
      }),
      body,
    },
    stats,
  };
}

async function expectFirstGetHold(candidate, options, pattern) {
  let calls = 0;
  const fetchImpl = async (url) => {
    calls += 1;
    if (calls !== 1) throw new Error("unexpected second request after terminal HOLD");
    return candidate.response;
  };
  const started = Date.now();
  await assert.rejects(
    () => collectRouteEvidence(ORIGIN, {
      fetchImpl,
      maximum: options.maximum ?? MAXIMUM,
      timeoutMs: options.timeoutMs ?? 1_000,
    }),
    pattern,
  );
  return { calls, elapsed_ms: Date.now() - started };
}

{
  const declared = response(`${ORIGIN}/.well-known/void-agent-discovery.json`, {
    headers: { "content-length": String(MAXIMUM + 1) },
    chunks: [new Uint8Array([1])],
  });
  const result = await expectFirstGetHold(
    declared,
    {},
    /exceeds maximum response size/,
  );
  assert.equal(result.calls, 1);
  assert.equal(declared.stats.body_cancel_calls, 1);
  assert.equal(declared.stats.read_calls, 0);
}

{
  const malformed = response(`${ORIGIN}/.well-known/void-agent-discovery.json`, {
    headers: { "content-length": "01" },
    chunks: [new Uint8Array([1])],
  });
  await expectFirstGetHold(malformed, {}, /invalid Content-Length/);
  assert.equal(malformed.stats.body_cancel_calls, 1);
  assert.equal(malformed.stats.read_calls, 0);
}

{
  const streamed = response(`${ORIGIN}/.well-known/void-agent-discovery.json`, {
    chunks: [
      new Uint8Array([1, 2, 3, 4]),
      new Uint8Array([5, 6, 7, 8, 9]),
    ],
  });
  await expectFirstGetHold(streamed, {}, /exceeds maximum response size/);
  assert.equal(streamed.stats.cancel_calls, 1);
}

{
  const rejectingCancel = response(`${ORIGIN}/.well-known/void-agent-discovery.json`, {
    chunks: [new Uint8Array(MAXIMUM + 1)],
    cancelReject: true,
  });
  await expectFirstGetHold(
    rejectingCancel,
    {},
    /exceeds maximum response size/,
  );
  assert.equal(rejectingCancel.stats.cancel_calls, 1);
}

{
  const neverSettlingCancel = response(
    `${ORIGIN}/.well-known/void-agent-discovery.json`,
    {
      chunks: [new Uint8Array(MAXIMUM + 1)],
      cancelNeverSettles: true,
    },
  );
  const result = await expectFirstGetHold(
    neverSettlingCancel,
    { timeoutMs: 1_000 },
    /exceeds maximum response size/,
  );
  assert.equal(neverSettlingCancel.stats.cancel_calls, 1);
  assert.ok(result.elapsed_ms < 750, `teardown was not bounded: ${result.elapsed_ms}ms`);
}

{
  const stalled = response(`${ORIGIN}/.well-known/void-agent-discovery.json`, {
    stallRead: true,
  });
  const result = await expectFirstGetHold(
    stalled,
    { timeoutMs: 40 },
    /request deadline exceeded/,
  );
  assert.equal(stalled.stats.cancel_calls, 1);
  assert.ok(result.elapsed_ms < 500, `stalled read escaped deadline: ${result.elapsed_ms}ms`);
}

{
  const unreadable = response(`${ORIGIN}/.well-known/void-agent-discovery.json`, {
    bodyMissing: true,
  });
  await expectFirstGetHold(unreadable, {}, /body is not stream-readable/);
}

{
  let calls = 0;
  const fetchImpl = async (url, init) => {
    calls += 1;
    const isHead = init.method === "HEAD";
    const isBinding = url.endsWith("/.well-known/void-browser-clearweb-origin-binding-v1.json");
    const candidate = response(url, {
      status: isBinding ? 404 : 200,
      chunks: isHead ? [] : [new Uint8Array([123, 125])],
      headers: isHead ? { "content-length": "2" } : {},
    });
    return candidate.response;
  };
  const evidence = await collectRouteEvidence(ORIGIN, {
    fetchImpl,
    maximum: MAXIMUM,
    timeoutMs: 1_000,
  });
  assert.equal(calls, 8);
  assert.equal(evidence.routes.well_known.get.body.toString("utf8"), "{}");
  assert.equal(evidence.routes.well_known.head.body.length, 0);
  assert.equal(evidence.bindingPath.get.status, 404);
}

console.log("VOID_BROWSER_CLEARWEB_ORIGIN_RESPONSE_BOUNDS_V1_PROOF_GREEN");
console.log("declared_body_ceiling=true");
console.log("streamed_body_ceiling=true");
console.log("stalled_body_deadline=true");
console.log("bounded_rejected_body_teardown=true");
console.log("cleanup_failure_does_not_replace_primary_hold=true");
console.log("small_response_contract_preserved=true");
console.log("live_survey_performed=false");
console.log("browser_activation=false");
console.log("credential_access=false");
console.log("fund_movement=false");
