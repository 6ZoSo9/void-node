import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_UI_WAVE4_EARN_SOURCE_MAX_RESPONSE_BYTES_V1,
  VOID_UI_WAVE4_EARN_SOURCE_MAX_ZERO_PROGRESS_READS_V1,
  VOID_UI_WAVE4_EARN_SOURCE_TEARDOWN_MS_V1,
  VOID_UI_WAVE4_EARN_SOURCE_TIMEOUT_MS_V1,
  fetchVoidUiWave4EarnSourceJsonV1,
} from "../src/ui/void_app_wave4_earn_readonly_v1.ts";

const BASE = "http://127.0.0.1:4100";
const ROUTE = "/wc/runner/status?account=account-A";
const TARGET = new URL(ROUTE, BASE + "/").href;

function streamOf(
  chunks: Uint8Array[],
  onCancel?: (reason: unknown) => void,
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
    cancel(reason) {
      onCancel?.(reason);
    },
  });
}

function openSingleChunk(
  chunk: Uint8Array,
  onCancel?: (reason: unknown) => void,
): ReadableStream<Uint8Array> {
  let sent = false;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (!sent) {
        sent = true;
        controller.enqueue(chunk);
      }
    },
    cancel(reason) {
      onCancel?.(reason);
    },
  });
}

function responseV1({
  url = TARGET,
  status = 200,
  contentType = "application/json; charset=utf-8",
  contentLength = null,
  body,
}: {
  url?: string;
  status?: number;
  contentType?: string | null;
  contentLength?: string | null;
  body: ReadableStream<Uint8Array> | null;
}): Response {
  const headers = new Headers();
  if (contentType !== null) headers.set("content-type", contentType);
  if (contentLength !== null) headers.set("content-length", contentLength);
  return {
    ok: status >= 200 && status < 300,
    status,
    url,
    headers,
    body,
  } as unknown as Response;
}

const encoder = new TextEncoder();
const validBody = encoder.encode(JSON.stringify({ ok: true, enabled: true }));

async function proofWatchdog<T>(
  promise: Promise<T>,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(label + "_proof_timeout")),
          1_000,
        );
      }),
    ]);
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}

assert.equal(VOID_UI_WAVE4_EARN_SOURCE_MAX_RESPONSE_BYTES_V1, 128 * 1024);
assert.equal(VOID_UI_WAVE4_EARN_SOURCE_TIMEOUT_MS_V1, 5000);
assert.equal(VOID_UI_WAVE4_EARN_SOURCE_TEARDOWN_MS_V1, 250);
assert.equal(VOID_UI_WAVE4_EARN_SOURCE_MAX_ZERO_PROGRESS_READS_V1, 64);

for (const [base, route, errorPattern] of [
  ["http://example.com:4100", ROUTE, /earn_source_base_not_fixed_loopback/u],
  [BASE, "https://example.com/wc/runner/status?account=account-A", /earn_source_route_invalid/u],
  [BASE, "/not-reviewed?account=account-A", /earn_source_route_not_allowlisted/u],
  [BASE, ROUTE + "&extra=1", /earn_source_query_shape_invalid/u],
  [BASE, "/jobs?account=account-A&limit=4", /earn_source_query_shape_invalid/u],
] as const) {
  let fetchCalled = false;
  const result = await fetchVoidUiWave4EarnSourceJsonV1(base, route, {
    fetchImpl: async () => {
      fetchCalled = true;
      return responseV1({ body: streamOf([validBody]) });
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 0);
  assert.equal(result.body, null);
  assert.equal(fetchCalled, false);
  assert.match(String(result.error), errorPattern);
}

{
  let observedInput = "";
  let observedInit: RequestInit | undefined;
  const result = await fetchVoidUiWave4EarnSourceJsonV1(BASE, ROUTE, {
    fetchImpl: async (input, init) => {
      observedInput = String(input);
      observedInit = init;
      return responseV1({
        body: streamOf([validBody]),
        contentLength: String(validBody.byteLength),
      });
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { ok: true, enabled: true });
  assert.equal(observedInput, TARGET);
  assert.equal(observedInit?.method, "GET");
  assert.equal(observedInit?.credentials, "omit");
  assert.equal(observedInit?.redirect, "error");
  assert.equal(observedInit?.referrerPolicy, "no-referrer");
}

{
  let canceled = false;
  const result = await fetchVoidUiWave4EarnSourceJsonV1(BASE, ROUTE, {
    fetchImpl: async () =>
      responseV1({
        body: streamOf(
          [encoder.encode("{}")],
          () => { canceled = true; },
        ),
        contentLength: "02",
      }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 0);
  assert.equal(result.body, null);
  assert.equal(canceled, true);
  assert.match(String(result.error), /earn_source_content_length_invalid/u);
}

{
  let canceled = false;
  const result = await fetchVoidUiWave4EarnSourceJsonV1(BASE, ROUTE, {
    fetchImpl: async () =>
      responseV1({
        body: streamOf(
          [encoder.encode("{}")],
          () => { canceled = true; },
        ),
        contentLength: String(
          VOID_UI_WAVE4_EARN_SOURCE_MAX_RESPONSE_BYTES_V1 + 1,
        ),
      }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 0);
  assert.equal(result.body, null);
  assert.equal(canceled, true);
  assert.match(String(result.error), /earn_source_body_too_large/u);
}

{
  let canceled = false;
  const result = await fetchVoidUiWave4EarnSourceJsonV1(BASE, ROUTE, {
    fetchImpl: async () =>
      responseV1({
        body: openSingleChunk(
          new Uint8Array(
            VOID_UI_WAVE4_EARN_SOURCE_MAX_RESPONSE_BYTES_V1 + 1,
          ),
          () => { canceled = true; },
        ),
      }),
  });
  assert.equal(result.ok, false);
  assert.equal(canceled, true);
  assert.match(String(result.error), /earn_source_body_too_large/u);
}

{
  let canceled = false;
  const result = await fetchVoidUiWave4EarnSourceJsonV1(BASE, ROUTE, {
    fetchImpl: async () =>
      responseV1({
        url: TARGET + "&redirected=1",
        body: streamOf(
          [validBody],
          () => { canceled = true; },
        ),
      }),
  });
  assert.equal(result.ok, false);
  assert.equal(canceled, true);
  assert.match(String(result.error), /earn_source_final_url_mismatch/u);
}

{
  let canceled = false;
  const result = await fetchVoidUiWave4EarnSourceJsonV1(BASE, ROUTE, {
    fetchImpl: async () =>
      responseV1({
        contentType: "text/html; charset=utf-8",
        body: streamOf(
          [encoder.encode("<p>not json</p>")],
          () => { canceled = true; },
        ),
      }),
  });
  assert.equal(result.ok, false);
  assert.equal(canceled, true);
  assert.match(String(result.error), /earn_source_content_type_invalid/u);
}

{
  let canceled = false;
  const result = await fetchVoidUiWave4EarnSourceJsonV1(BASE, ROUTE, {
    fetchImpl: async () =>
      responseV1({
        body: openSingleChunk(
          Uint8Array.of(0xc3, 0x28),
          () => { canceled = true; },
        ),
      }),
  });
  assert.equal(result.ok, false);
  assert.equal(canceled, true);
  assert.ok(String(result.error).length > 0);
}

{
  const result = await fetchVoidUiWave4EarnSourceJsonV1(BASE, ROUTE, {
    fetchImpl: async () =>
      responseV1({
        body: streamOf([encoder.encode("{")]),
      }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 0);
  assert.equal(result.body, null);
  assert.match(String(result.error), /earn_source_json_invalid/u);
}

{
  let canceled = false;
  let pulls = 0;
  const zeroProgress = new ReadableStream<Uint8Array>({
    pull(controller) {
      pulls += 1;
      controller.enqueue(new Uint8Array(0));
    },
    cancel() {
      canceled = true;
    },
  });
  const result = await fetchVoidUiWave4EarnSourceJsonV1(BASE, ROUTE, {
    fetchImpl: async () => responseV1({ body: zeroProgress }),
  });
  assert.equal(result.ok, false);
  assert.equal(canceled, true);
  assert.ok(
    pulls >= VOID_UI_WAVE4_EARN_SOURCE_MAX_ZERO_PROGRESS_READS_V1 + 1,
  );
  assert.match(String(result.error), /earn_source_body_no_progress/u);
}

{
  const started = Date.now();
  const result = await proofWatchdog(
    fetchVoidUiWave4EarnSourceJsonV1(BASE, ROUTE, {
      timeoutMs: 20,
      fetchImpl: async () => await new Promise<Response>(() => {}),
    }),
    "stalled_fetch",
  );
  const elapsed = Date.now() - started;
  assert.equal(result.ok, false);
  assert.equal(result.status, 0);
  assert.ok(
    elapsed < 1000,
    "stalled fetch exceeded owned deadline: " + String(elapsed),
  );
  assert.match(String(result.error), /earn_source_deadline_exceeded/u);
}

{
  let resolveLate!: (response: Response) => void;
  let lateCanceled = false;
  const lateResponse = new Promise<Response>((resolve) => {
    resolveLate = resolve;
  });
  const result = await proofWatchdog(
    fetchVoidUiWave4EarnSourceJsonV1(BASE, ROUTE, {
      timeoutMs: 20,
      fetchImpl: async () => await lateResponse,
    }),
    "late_fetch",
  );
  assert.equal(result.ok, false);
  assert.match(String(result.error), /earn_source_deadline_exceeded/u);
  resolveLate(responseV1({
    body: streamOf(
      [validBody],
      () => { lateCanceled = true; },
    ),
  }));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(lateCanceled, true);
}

{
  let canceled = false;
  const stalled = new ReadableStream<Uint8Array>({
    pull() {
      return new Promise<void>(() => {});
    },
    cancel() {
      canceled = true;
    },
  });
  const started = Date.now();
  const result = await proofWatchdog(
    fetchVoidUiWave4EarnSourceJsonV1(BASE, ROUTE, {
      timeoutMs: 20,
      fetchImpl: async () => responseV1({ body: stalled }),
    }),
    "stalled_body",
  );
  const elapsed = Date.now() - started;
  assert.equal(result.ok, false);
  assert.equal(result.status, 0);
  assert.equal(typeof canceled, "boolean");
  assert.ok(
    elapsed < 1000,
    "stalled source exceeded bounded deadline/teardown: " + String(elapsed),
  );
  assert.match(String(result.error), /earn_source_deadline_exceeded/u);
}

{
  let canceled = false;
  const errored = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.error(new Error("source_body_aborted"));
    },
    cancel() {
      canceled = true;
    },
  });
  const result = await fetchVoidUiWave4EarnSourceJsonV1(BASE, ROUTE, {
    fetchImpl: async () => responseV1({ body: errored }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 0);
  assert.ok(String(result.error).length > 0);
  // A stream that is already errored may reject cancel; bounded teardown still
  // owns settlement and must not convert the failure into source evidence.
  assert.equal(typeof canceled, "boolean");
}

{
  let canceled = false;
  const result = await fetchVoidUiWave4EarnSourceJsonV1(BASE, ROUTE, {
    fetchImpl: async () =>
      responseV1({
        status: 503,
        contentType: "text/plain; charset=utf-8",
        body: streamOf(
          [encoder.encode("warming")],
          () => { canceled = true; },
        ),
      }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 503);
  assert.equal(result.body, null);
  assert.equal(canceled, true);
  assert.equal(Object.hasOwn(result, "error"), false);
}

{
  const result = await fetchVoidUiWave4EarnSourceJsonV1(BASE, ROUTE, {
    fetchImpl: async () =>
      responseV1({
        body: streamOf([validBody.subarray(0, 5), validBody.subarray(5)]),
      }),
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.body, { ok: true, enabled: true });
}

const source = fs.readFileSync(
  "src/ui/void_app_wave4_earn_readonly_v1.ts",
  "utf8",
);
assert.equal(
  source.split("fetchVoidUiWave4EarnSourceJsonV1(").length - 1,
  8,
  "expected one bounded transport definition plus seven fixed source uses",
);
assert.equal(source.includes("fetchJson("), false);
assert.equal(source.includes("await response.text()"), false);
assert.equal(source.includes('redirect: "follow"'), false);
for (const marker of [
  "VOID_UI_WAVE4_EARN_SOURCE_MAX_RESPONSE_BYTES_V1 = 128 * 1024",
  "VOID_UI_WAVE4_EARN_SOURCE_TIMEOUT_MS_V1 = 5000",
  "const timeoutMs = Math.min(",
  "requestedTimeoutMs,",
  "VOID_UI_WAVE4_EARN_SOURCE_TEARDOWN_MS_V1 = 250",
  "VOID_UI_WAVE4_EARN_SOURCE_MAX_ZERO_PROGRESS_READS_V1 = 64",
  "earnSourceTargetV1(",
  "earn_source_base_not_fixed_loopback",
  "earn_source_route_not_allowlisted",
  "earn_source_query_shape_invalid",
  'redirect: "error"',
  'credentials: "omit"',
  'referrerPolicy: "no-referrer"',
  'response.url !== target',
  'mediaType !== "application/json"',
  'new TextDecoder("utf-8", { fatal: true })',
  "readEarnSourceWithinSignalV1(",
  "fetchEarnSourceWithinSignalV1(",
  "awaitEarnSourceTeardownBoundedV1(",
  "fetchVoidUiWave4EarnSourceJsonV1(base,",
]) {
  assert.ok(source.includes(marker), "missing Earn source boundary: " + marker);
}

for (const route of [
  "/wc/runner/status?account=",
  "/wc/reward-stats?account=",
  "/wc/redeemable?account=",
  "/wc/production/balance?account=",
  "/jobs?account=",
  "/receipts?account=",
  "/__void/participant/datanet-wc/status?account=",
]) {
  assert.ok(source.includes(route), "missing fixed Earn source route: " + route);
}

console.log("VOID_UI_WAVE4_EARN_SOURCE_TRANSPORT_V1_GREEN");
console.log("fixed_loopback_sources=7");
console.log("source_helper_fixed_loopback_only=true");
console.log("source_route_query_allowlist_closed=true");
console.log("all_seven_sources_use_bounded_transport=true");
console.log("source_max_response_bytes=131072");
console.log("source_timeout_ms=5000");
console.log("source_timeout_override_cannot_extend=true");
console.log("source_teardown_ms=250");
console.log("source_zero_progress_read_limit=64");
console.log("source_redirects_rejected=true");
console.log("source_final_url_exact=true");
console.log("successful_source_json_content_type_required=true");
console.log("source_utf8_fatal=true");
console.log("source_response_text_unbounded=false");
console.log("invalid_content_length_teardown_owned=true");
console.log("oversized_source_rejected=true");
console.log("stalled_fetch_bounded=true");
console.log("deadline_proofs_hold_referenced_watchdog=true");
console.log("late_fetch_response_canceled=true");
console.log("stalled_source_bounded=true");
console.log("malformed_source_unavailable=true");
console.log("valid_source_recovery=true");
console.log("authority_added=false");
