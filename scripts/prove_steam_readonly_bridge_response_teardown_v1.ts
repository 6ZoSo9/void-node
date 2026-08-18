import assert from "node:assert/strict";
import {
  executeSteamReadonlyRequest,
  prepareSteamReadonlyRequest,
  SteamReadonlyBridgeError,
} from "../src/integrations/steam_readonly_bridge_v1.js";

const env = {
  VOID_STEAM_READONLY_BRIDGE_ENABLED: "1",
  VOID_STEAM_WEB_API_KEY: "proof-only-secret",
  VOID_STEAM_READONLY_TIMEOUT_MS: "1000",
  VOID_STEAM_READONLY_MAX_RESPONSE_BYTES: "16384",
};

const input = {
  operation: "player_summaries" as const,
  steamids: ["76561198000000000"],
};

const expectedUrl = prepareSteamReadonlyRequest(input, env).url.href;

function withProvenance<T extends Response>(
  response: T,
  url = expectedUrl,
  redirected = false,
): T {
  Object.defineProperties(response, {
    url: { value: url },
    redirected: { value: redirected },
  });
  return response;
}

async function expectCode(
  code: string,
  fetch_impl: typeof fetch,
  test_env = env,
): Promise<number> {
  const started = Date.now();
  await assert.rejects(
    () => executeSteamReadonlyRequest(input, { env: test_env, fetch_impl }),
    (error: unknown) => {
      assert.ok(error instanceof SteamReadonlyBridgeError);
      assert.equal(error.code, code);
      return true;
    },
  );
  return Date.now() - started;
}

function bodyWithCancel(
  options: {
    chunk_bytes?: number;
    cancel: () => Promise<void> | void;
  },
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      if (options.chunk_bytes) {
        controller.enqueue(new Uint8Array(options.chunk_bytes));
      }
    },
    cancel() {
      return options.cancel();
    },
  });
}

function responseWithReaderFailure(options: {
  fail_delay_ms?: number;
  cancel: () => Promise<void> | void;
}): Response {
  const prefix = new TextEncoder().encode('{"response":');
  let readCalls = 0;
  const reader = {
    async read() {
      readCalls += 1;
      if (readCalls === 1) {
        return { done: false, value: prefix };
      }
      if (options.fail_delay_ms) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, options.fail_delay_ms);
        });
      }
      throw new Error("synthetic admitted response read failure");
    },
    cancel() {
      return options.cancel();
    },
  } as unknown as ReadableStreamDefaultReader<Uint8Array>;

  return withProvenance({
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    body: {
      getReader: () => reader,
    },
  } as unknown as Response);
}

async function expectProvenanceRejected(options: {
  url?: unknown;
  redirected?: unknown;
}): Promise<void> {
  let bodyReadCalls = 0;
  let cancelCalls = 0;
  const response = {
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    url: options.url,
    redirected: options.redirected,
    body: {
      getReader() {
        bodyReadCalls += 1;
        throw new Error("provenance rejection must precede body evidence");
      },
      cancel() {
        cancelCalls += 1;
        return new Promise<void>(() => undefined);
      },
    },
  } as unknown as Response;

  const elapsed = await expectCode(
    "upstream_response_provenance_invalid",
    async () => response,
  );
  assert.equal(bodyReadCalls, 0);
  assert.equal(cancelCalls, 1);
  assert.ok(elapsed < 900, `provenance teardown stalled ${elapsed}ms`);
}

await expectProvenanceRejected({
  url: "https://example.invalid/ISteamUser/GetPlayerSummaries/v2/?steamids=76561198000000000",
  redirected: false,
});
await expectProvenanceRejected({
  url: "https://partner.steam-api.com/ISteamUser/GetPlayerSummaries/v1/?steamids=76561198000000000",
  redirected: false,
});
await expectProvenanceRejected({
  url: "https://partner.steam-api.com/ISteamUser/GetPlayerSummaries/v2/?steamids=76561198000000001",
  redirected: false,
});
await expectProvenanceRejected({ url: "", redirected: false });
await expectProvenanceRejected({ url: "not a url", redirected: false });
await expectProvenanceRejected({ url: expectedUrl, redirected: true });

const unreachableElapsed = await expectCode(
  "upstream_unreachable",
  async () => {
    throw new Error("synthetic pre-deadline fetch failure");
  },
);
assert.ok(
  unreachableElapsed < 900,
  `ordinary fetch rejection stalled ${unreachableElapsed}ms`,
);

let neverSettlingFetchCalls = 0;
const neverSettlingFetchElapsed = await expectCode(
  "upstream_timeout",
  async () => {
    neverSettlingFetchCalls += 1;
    return await new Promise<Response>(() => undefined);
  },
  {
    ...env,
    VOID_STEAM_READONLY_TIMEOUT_MS: "500",
  },
);
assert.equal(neverSettlingFetchCalls, 1);
assert.ok(
  neverSettlingFetchElapsed >= 450 && neverSettlingFetchElapsed < 1500,
  `never-settling fetch escaped deadline ${neverSettlingFetchElapsed}ms`,
);

let lateFetchResolveCalls = 0;
let lateFetchCancelCalls = 0;
const lateFetchResponse = withProvenance({
  ok: true,
  status: 200,
  headers: new Headers({ "content-type": "application/json" }),
  body: {
    cancel() {
      lateFetchCancelCalls += 1;
      return new Promise<void>(() => undefined);
    },
  },
} as unknown as Response);
const lateFetchElapsed = await expectCode(
  "upstream_timeout",
  async () => {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 1200);
    });
    lateFetchResolveCalls += 1;
    return lateFetchResponse;
  },
  {
    ...env,
    VOID_STEAM_READONLY_TIMEOUT_MS: "500",
  },
);
assert.ok(
  lateFetchElapsed >= 450 && lateFetchElapsed < 1000,
  `late fetch response replaced timeout truth ${lateFetchElapsed}ms`,
);
await new Promise<void>((resolve) => {
  setTimeout(resolve, 1000);
});
assert.equal(lateFetchResolveCalls, 1);
assert.equal(lateFetchCancelCalls, 1);
await new Promise<void>((resolve) => {
  setTimeout(resolve, 300);
});
assert.equal(lateFetchCancelCalls, 1);

let declaredCancelCalls = 0;
const declaredElapsed = await expectCode(
  "response_too_large",
  async () => withProvenance(new Response(
    bodyWithCancel({
      cancel: () => {
        declaredCancelCalls += 1;
        return new Promise<void>(() => undefined);
      },
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
        "content-length": "17000",
      },
    },
  )),
);
assert.equal(declaredCancelCalls, 1);
assert.ok(declaredElapsed < 900, `declared oversize stalled ${declaredElapsed}ms`);

let malformedCancelCalls = 0;
const malformedElapsed = await expectCode(
  "response_content_length_invalid",
  async () => withProvenance(new Response(
    bodyWithCancel({
      cancel: () => {
        malformedCancelCalls += 1;
        return Promise.reject(new Error("synthetic cancel failure"));
      },
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
        "content-length": "not-a-byte-count",
      },
    },
  )),
);
assert.equal(malformedCancelCalls, 1);
assert.ok(malformedElapsed < 900, `malformed length stalled ${malformedElapsed}ms`);

let streamedCancelCalls = 0;
const streamedElapsed = await expectCode(
  "response_too_large",
  async () => withProvenance(new Response(
    bodyWithCancel({
      chunk_bytes: 17000,
      cancel: () => {
        streamedCancelCalls += 1;
        return new Promise<void>(() => undefined);
      },
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    },
  )),
);
assert.equal(streamedCancelCalls, 1);
assert.ok(streamedElapsed < 900, `streamed oversize stalled ${streamedElapsed}ms`);

let statusCancelCalls = 0;
const statusElapsed = await expectCode(
  "upstream_http_503",
  async () => withProvenance(new Response(
    bodyWithCancel({
      cancel: () => {
        statusCancelCalls += 1;
        return new Promise<void>(() => undefined);
      },
    }),
    {
      status: 503,
      headers: { "content-type": "application/json" },
    },
  )),
);
assert.equal(statusCancelCalls, 1);
assert.ok(statusElapsed < 900, `non-2xx teardown stalled ${statusElapsed}ms`);

let contentTypeCancelCalls = 0;
const contentTypeElapsed = await expectCode(
  "upstream_content_type_invalid",
  async () => withProvenance(new Response(
    bodyWithCancel({
      cancel: () => {
        contentTypeCancelCalls += 1;
        return Promise.reject(new Error("synthetic content-type cleanup failure"));
      },
    }),
    {
      status: 200,
      headers: { "content-type": "text/plain" },
    },
  )),
);
assert.equal(contentTypeCancelCalls, 1);
assert.ok(contentTypeElapsed < 900, `content-type teardown stalled ${contentTypeElapsed}ms`);

let admittedNeverCancelCalls = 0;
const admittedNeverElapsed = await expectCode(
  "upstream_unreachable",
  async () => responseWithReaderFailure({
    cancel: () => {
      admittedNeverCancelCalls += 1;
      return new Promise<void>(() => undefined);
    },
  }),
);
assert.equal(admittedNeverCancelCalls, 1);
assert.ok(
  admittedNeverElapsed < 900,
  `admitted read failure stalled ${admittedNeverElapsed}ms`,
);

let admittedRejectCancelCalls = 0;
const admittedRejectElapsed = await expectCode(
  "upstream_unreachable",
  async () => responseWithReaderFailure({
    cancel: () => {
      admittedRejectCancelCalls += 1;
      return Promise.reject(new Error("synthetic admitted cleanup failure"));
    },
  }),
);
assert.equal(admittedRejectCancelCalls, 1);
assert.ok(
  admittedRejectElapsed < 900,
  `admitted rejecting cleanup stalled ${admittedRejectElapsed}ms`,
);

let timeoutReadCancelCalls = 0;
const timeoutReadElapsed = await expectCode(
  "upstream_timeout",
  async () => responseWithReaderFailure({
    fail_delay_ms: 550,
    cancel: () => {
      timeoutReadCancelCalls += 1;
      return new Promise<void>(() => undefined);
    },
  }),
  {
    ...env,
    VOID_STEAM_READONLY_TIMEOUT_MS: "500",
  },
);
assert.equal(timeoutReadCancelCalls, 1);
assert.ok(
  timeoutReadElapsed < 2000,
  `deadline-triggered read failure stalled ${timeoutReadElapsed}ms`,
);

let neverSettlingReadCalls = 0;
let neverSettlingCancelCalls = 0;
const neverSettlingReader = {
  async read() {
    neverSettlingReadCalls += 1;
    return await new Promise<never>(() => undefined);
  },
  cancel() {
    neverSettlingCancelCalls += 1;
    return new Promise<void>(() => undefined);
  },
} as unknown as ReadableStreamDefaultReader<Uint8Array>;
const neverSettlingResponse = withProvenance({
  ok: true,
  status: 200,
  headers: new Headers({ "content-type": "application/json" }),
  body: {
    getReader: () => neverSettlingReader,
  },
} as unknown as Response);
const neverSettlingElapsed = await expectCode(
  "upstream_timeout",
  async () => neverSettlingResponse,
  {
    ...env,
    VOID_STEAM_READONLY_TIMEOUT_MS: "500",
  },
);
assert.equal(neverSettlingReadCalls, 1);
assert.equal(neverSettlingCancelCalls, 1);
assert.ok(
  neverSettlingElapsed >= 450 && neverSettlingElapsed < 1500,
  `never-settling admitted read escaped deadline ${neverSettlingElapsed}ms`,
);

const validBody = JSON.stringify({ response: { players: [] } });
const valid = await executeSteamReadonlyRequest(input, {
  env,
  fetch_impl: async () => withProvenance(new Response(validBody, {
    status: 200,
    headers: {
      "content-type": "application/json",
      "content-length": String(Buffer.byteLength(validBody)),
    },
  })),
});
assert.equal(valid.ok, true);
assert.equal(valid.received_bytes, Buffer.byteLength(validBody));

console.log("custom_fetch_final_url_exact_match_required=true");
console.log("custom_fetch_redirected_response_rejected=true");
console.log("custom_fetch_provenance_rejection_precedes_body_read=true");
console.log("custom_fetch_provenance_cleanup_bounded=true");
console.log("ordinary_fetch_rejection_preserved=true");
console.log("deadline_terminates_never_settling_fetch=true");
console.log("late_fetch_response_timeout_truth_preserved=true");
console.log("late_fetch_response_cleanup_bounded=true");
console.log("late_fetch_response_cleanup_exactly_once=true");
console.log("declared_oversize_cancel_bounded=true");
console.log("malformed_content_length_fail_closed=true");
console.log("streamed_oversize_cancel_bounded=true");
console.log("non_2xx_body_teardown_bounded=true");
console.log("wrong_content_type_body_teardown_bounded=true");
console.log("admitted_read_failure_cancel_bounded=true");
console.log("admitted_read_failure_primary_error_preserved=true");
console.log("deadline_triggered_read_failure_preserved=true");
console.log("deadline_terminates_never_settling_admitted_read=true");
console.log("never_settling_admitted_read_cleanup_bounded=true");
console.log("primary_rejection_preserved=true");
console.log("VOID_STEAM_READONLY_BRIDGE_RESPONSE_TEARDOWN_V1_GREEN");