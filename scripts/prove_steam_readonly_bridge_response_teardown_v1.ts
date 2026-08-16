import assert from "node:assert/strict";
import {
  executeSteamReadonlyRequest,
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
    async read(): Promise<ReadableStreamReadResult<Uint8Array>> {
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

  return {
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    body: {
      getReader: () => reader,
    },
  } as unknown as Response;
}

let declaredCancelCalls = 0;
const declaredElapsed = await expectCode(
  "response_too_large",
  async () => new Response(
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
  ),
);
assert.equal(declaredCancelCalls, 1);
assert.ok(declaredElapsed < 900, `declared oversize stalled ${declaredElapsed}ms`);

let malformedCancelCalls = 0;
const malformedElapsed = await expectCode(
  "response_content_length_invalid",
  async () => new Response(
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
  ),
);
assert.equal(malformedCancelCalls, 1);
assert.ok(malformedElapsed < 900, `malformed length stalled ${malformedElapsed}ms`);

let streamedCancelCalls = 0;
const streamedElapsed = await expectCode(
  "response_too_large",
  async () => new Response(
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
  ),
);
assert.equal(streamedCancelCalls, 1);
assert.ok(streamedElapsed < 900, `streamed oversize stalled ${streamedElapsed}ms`);

let statusCancelCalls = 0;
const statusElapsed = await expectCode(
  "upstream_http_503",
  async () => new Response(
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
  ),
);
assert.equal(statusCancelCalls, 1);
assert.ok(statusElapsed < 900, `non-2xx teardown stalled ${statusElapsed}ms`);

let contentTypeCancelCalls = 0;
const contentTypeElapsed = await expectCode(
  "upstream_content_type_invalid",
  async () => new Response(
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
  ),
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

const validBody = JSON.stringify({ response: { players: [] } });
const valid = await executeSteamReadonlyRequest(input, {
  env,
  fetch_impl: async () => new Response(validBody, {
    status: 200,
    headers: {
      "content-type": "application/json",
      "content-length": String(Buffer.byteLength(validBody)),
    },
  }),
});
assert.equal(valid.ok, true);
assert.equal(valid.received_bytes, Buffer.byteLength(validBody));

console.log("declared_oversize_cancel_bounded=true");
console.log("malformed_content_length_fail_closed=true");
console.log("streamed_oversize_cancel_bounded=true");
console.log("non_2xx_body_teardown_bounded=true");
console.log("wrong_content_type_body_teardown_bounded=true");
console.log("admitted_read_failure_cancel_bounded=true");
console.log("admitted_read_failure_primary_error_preserved=true");
console.log("deadline_triggered_read_failure_preserved=true");
console.log("primary_rejection_preserved=true");
console.log("VOID_STEAM_READONLY_BRIDGE_RESPONSE_TEARDOWN_V1_GREEN");
