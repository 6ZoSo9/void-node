import {
  discoverVoidAgentV1,
} from "../integrations/agents/void-agent-sdk-v1/index.mjs";

function assertCondition(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectRejectWithin(label, operation, expectedFragment, timeoutMs = 750) {
  let timer;
  try {
    await Promise.race([
      (async () => {
        try {
          await operation();
        } catch (error) {
          const message = String(error?.message ?? error);
          assertCondition(
            message.includes(expectedFragment),
            `${label} rejected for wrong reason: ${message}`,
          );
          return;
        }
        throw new Error(`expected rejection: ${label}`);
      })(),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label}_deadline_exceeded`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function expectRejectTiming(
  label,
  operation,
  expectedFragment,
  { minimumMs = 0, maximumMs = 750 } = {},
) {
  const startedAt = Date.now();
  await expectRejectWithin(label, operation, expectedFragment, maximumMs + 250);
  const elapsedMs = Date.now() - startedAt;
  assertCondition(
    elapsedMs >= minimumMs,
    `${label} released ownership too early: ${elapsedMs}ms < ${minimumMs}ms`,
  );
  assertCondition(
    elapsedMs <= maximumMs,
    `${label} exceeded bounded terminal: ${elapsedMs}ms > ${maximumMs}ms`,
  );
  return elapsedMs;
}

async function expectAnyRejectBeforeDeadline(label, operation, timeoutMs = 250) {
  let timer;
  const result = await Promise.race([
    Promise.resolve()
      .then(operation)
      .then(
        () => ({ kind: "resolved" }),
        (error) => ({ kind: "rejected", error }),
      ),
    new Promise((resolve) => {
      timer = setTimeout(() => resolve({ kind: "timeout" }), timeoutMs);
    }),
  ]);
  clearTimeout(timer);
  assertCondition(
    result.kind === "rejected",
    `${label} did not fail closed before deadline: ${result.kind}`,
  );
  return result.error;
}

function oversizedResponse(cancelImpl) {
  let cancelCalls = 0;
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(1025));
    },
    cancel() {
      cancelCalls += 1;
      return cancelImpl();
    },
  });
  return {
    response: new Response(body, {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    }),
    cancelCalls: () => cancelCalls,
  };
}

function declaredOversizedResponse(cancelImpl) {
  let cancelCalls = 0;
  const body = new ReadableStream({
    cancel() {
      cancelCalls += 1;
      return cancelImpl();
    },
  });
  return {
    response: new Response(body, {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-length": "2048",
      },
    }),
    cancelCalls: () => cancelCalls,
  };
}

function nonStreamReadableResponse(cancelImpl = () => Promise.resolve()) {
  let textCalls = 0;
  let cancelCalls = 0;
  const body = {
    cancel() {
      cancelCalls += 1;
      return cancelImpl();
    },
  };
  return {
    response: {
      status: 200,
      ok: true,
      headers: new Headers({
        "content-type": "application/json; charset=utf-8",
      }),
      body,
      text() {
        textCalls += 1;
        return new Promise(() => {});
      },
    },
    textCalls: () => textCalls,
    cancelCalls: () => cancelCalls,
  };
}

function stalledReadableResponse(cancelImpl = () => new Promise(() => {})) {
  let cancelCalls = 0;
  let releaseCalls = 0;
  const reader = {
    read() {
      return new Promise(() => {});
    },
    cancel() {
      cancelCalls += 1;
      return cancelImpl();
    },
    releaseLock() {
      releaseCalls += 1;
    },
  };
  return {
    response: {
      status: 200,
      ok: true,
      headers: new Headers({
        "content-type": "application/json; charset=utf-8",
      }),
      body: {
        getReader() {
          return reader;
        },
      },
    },
    cancelCalls: () => cancelCalls,
    releaseCalls: () => releaseCalls,
  };
}

const stalledCancel = oversizedResponse(() => new Promise(() => {}));
await expectRejectTiming(
  "oversized streamed body with non-settling cancellation",
  () =>
    discoverVoidAgentV1({
      baseUrl: "https://node.example",
      maxResponseBytes: 1024,
      timeoutMs: 100,
      fetchImpl: async () => stalledCancel.response,
    }),
  "well_known_discovery_body_too_large",
  { minimumMs: 50, maximumMs: 400 },
);
assertCondition(
  stalledCancel.cancelCalls() === 1,
  `expected one stalled cancellation attempt, got ${stalledCancel.cancelCalls()}`,
);

const rejectingCancel = oversizedResponse(
  () => Promise.reject(new Error("synthetic_cancel_failure")),
);
await expectRejectWithin(
  "oversized streamed body with rejecting cancellation",
  () =>
    discoverVoidAgentV1({
      baseUrl: "https://node.example",
      maxResponseBytes: 1024,
      timeoutMs: 100,
      fetchImpl: async () => rejectingCancel.response,
    }),
  "well_known_discovery_body_too_large",
);
assertCondition(
  rejectingCancel.cancelCalls() === 1,
  `expected one rejecting cancellation attempt, got ${rejectingCancel.cancelCalls()}`,
);

const declaredStalledCancel = declaredOversizedResponse(
  () => new Promise(() => {}),
);
await expectRejectTiming(
  "declared oversized body with non-settling cancellation",
  () =>
    discoverVoidAgentV1({
      baseUrl: "https://node.example",
      maxResponseBytes: 1024,
      timeoutMs: 100,
      fetchImpl: async () => declaredStalledCancel.response,
    }),
  "well_known_discovery_body_too_large",
  { minimumMs: 50, maximumMs: 400 },
);
assertCondition(
  declaredStalledCancel.cancelCalls() === 1,
  `expected one declared-size cancellation attempt, got ${declaredStalledCancel.cancelCalls()}`,
);

const declaredRejectingCancel = declaredOversizedResponse(
  () => Promise.reject(new Error("declared_cancel_failure")),
);
await expectRejectWithin(
  "declared oversized body with rejecting cancellation",
  () =>
    discoverVoidAgentV1({
      baseUrl: "https://node.example",
      maxResponseBytes: 1024,
      timeoutMs: 100,
      fetchImpl: async () => declaredRejectingCancel.response,
    }),
  "well_known_discovery_body_too_large",
);
assertCondition(
  declaredRejectingCancel.cancelCalls() === 1,
  `expected one declared rejecting cancellation attempt, got ${declaredRejectingCancel.cancelCalls()}`,
);

const nonStream = nonStreamReadableResponse(() => new Promise(() => {}));
await expectRejectTiming(
  "non-stream-readable custom fetch response",
  () =>
    discoverVoidAgentV1({
      baseUrl: "https://node.example",
      maxResponseBytes: 1024,
      timeoutMs: 100,
      fetchImpl: async () => nonStream.response,
    }),
  "well_known_discovery_body_stream_unavailable",
  { minimumMs: 50, maximumMs: 400 },
);
assertCondition(
  nonStream.textCalls() === 0,
  `bounded SDK must reject before unbounded response.text(); text_calls=${nonStream.textCalls()}`,
);
assertCondition(
  nonStream.cancelCalls() === 1,
  `expected one non-stream body cancellation attempt, got ${nonStream.cancelCalls()}`,
);

const stalledReader = stalledReadableResponse();
await expectRejectTiming(
  "admitted body read ignores abort",
  () =>
    discoverVoidAgentV1({
      baseUrl: "https://node.example",
      maxResponseBytes: 1024,
      timeoutMs: 100,
      fetchImpl: async () => stalledReader.response,
    }),
  "well_known_discovery_body_deadline_exceeded",
  { minimumMs: 50, maximumMs: 400 },
);
assertCondition(
  stalledReader.cancelCalls() === 1,
  `expected one stalled reader cancellation attempt, got ${stalledReader.cancelCalls()}`,
);
assertCondition(
  stalledReader.releaseCalls() === 1,
  `expected one reader release attempt, got ${stalledReader.releaseCalls()}`,
);

const neverFetchError = await expectAnyRejectBeforeDeadline(
  "custom fetch implementation ignores abort",
  () =>
    discoverVoidAgentV1({
      baseUrl: "https://node.example",
      maxResponseBytes: 1024,
      timeoutMs: 100,
      fetchImpl: () => new Promise(() => {}),
    }),
  400,
);
assertCondition(
  neverFetchError?.name === "TimeoutError",
  `expected TimeoutError for stalled custom fetch, got ${neverFetchError?.name}`,
);

let repeatedCancelCalls = 0;
const repeatedStartedAt = Date.now();
for (let index = 0; index < 3; index += 1) {
  const response = declaredOversizedResponse(() => {
    repeatedCancelCalls += 1;
    return new Promise(() => {});
  });
  await expectRejectTiming(
    `repeated hostile declared oversize ${index + 1}`,
    () =>
      discoverVoidAgentV1({
        baseUrl: "https://node.example",
        maxResponseBytes: 1024,
        timeoutMs: 100,
        fetchImpl: async () => response.response,
      }),
    "well_known_discovery_body_too_large",
    { minimumMs: 50, maximumMs: 400 },
  );
}
const repeatedElapsedMs = Date.now() - repeatedStartedAt;
assertCondition(
  repeatedCancelCalls === 3,
  `expected exactly three repeated teardown attempts, got ${repeatedCancelCalls}`,
);
assertCondition(
  repeatedElapsedMs < 1_200,
  `repeated teardown terminals were not bounded: ${repeatedElapsedMs}ms`,
);

console.log("stream_oversize_primary_error_preserved=true");
console.log("declared_oversize_primary_error_preserved=true");
console.log("response_teardown_owned_until_bounded_terminal=true");
console.log("non_stream_response_text_fallback_forbidden=true");
console.log("stalled_reader_total_deadline_enforced=true");
console.log("custom_fetch_total_deadline_enforced=true");
console.log("repeated_hostile_teardown_terminals_bounded=true");
console.log("VOID_AGENT_SDK_STREAM_CANCEL_LIVENESS_V1_PROOF_GREEN=true");
