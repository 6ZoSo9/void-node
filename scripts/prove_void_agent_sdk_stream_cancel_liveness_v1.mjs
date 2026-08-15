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

console.log("stream_oversize_primary_error_preserved=true");
console.log("stream_cancel_attempts=2");
console.log("VOID_AGENT_SDK_STREAM_CANCEL_LIVENESS_V1_PROOF_GREEN=true");
