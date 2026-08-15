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

function nonStreamReadableResponse() {
  let textCalls = 0;
  return {
    response: {
      status: 200,
      ok: true,
      headers: new Headers({
        "content-type": "application/json; charset=utf-8",
      }),
      body: null,
      text() {
        textCalls += 1;
        return new Promise(() => {});
      },
    },
    textCalls: () => textCalls,
  };
}

const stalledCancel = oversizedResponse(() => new Promise(() => {}));
await expectRejectWithin(
  "oversized streamed body with non-settling cancellation",
  () =>
    discoverVoidAgentV1({
      baseUrl: "https://node.example",
      maxResponseBytes: 1024,
      timeoutMs: 100,
      fetchImpl: async () => stalledCancel.response,
    }),
  "well_known_discovery_body_too_large",
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
await expectRejectWithin(
  "declared oversized body with non-settling cancellation",
  () =>
    discoverVoidAgentV1({
      baseUrl: "https://node.example",
      maxResponseBytes: 1024,
      timeoutMs: 100,
      fetchImpl: async () => declaredStalledCancel.response,
    }),
  "well_known_discovery_body_too_large",
);
assertCondition(
  declaredStalledCancel.cancelCalls() === 1,
  `expected one declared-size cancellation attempt, got ${declaredStalledCancel.cancelCalls()}`,
);

const nonStream = nonStreamReadableResponse();
await expectAnyRejectBeforeDeadline(
  "non-stream-readable custom fetch response",
  () =>
    discoverVoidAgentV1({
      baseUrl: "https://node.example",
      maxResponseBytes: 1024,
      timeoutMs: 100,
      fetchImpl: async () => nonStream.response,
    }),
);
assertCondition(
  nonStream.textCalls() === 0,
  `bounded SDK must reject before unbounded response.text(); text_calls=${nonStream.textCalls()}`,
);

console.log("stream_oversize_primary_error_preserved=true");
console.log("declared_oversize_primary_error_preserved=true");
console.log("non_stream_response_text_fallback_forbidden=true");
console.log("oversize_cancel_attempts=3");
console.log("VOID_AGENT_SDK_STREAM_CANCEL_LIVENESS_V1_PROOF_GREEN=true");
