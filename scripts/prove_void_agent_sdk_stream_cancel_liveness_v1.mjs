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

const WELL_KNOWN_URL = "https://node.example/.well-known/void-agent-discovery.json";

function bindResponseUrl(response, url = WELL_KNOWN_URL, redirected = false) {
  Object.defineProperty(response, "url", { value: url, configurable: true });
  Object.defineProperty(response, "redirected", { value: redirected, configurable: true });
  return response;
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
    response: bindResponseUrl(new Response(body, {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    })),
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
    response: bindResponseUrl(new Response(body, {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-length": "2048",
      },
    })),
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
      url: WELL_KNOWN_URL,
      redirected: false,
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
      url: WELL_KNOWN_URL,
      redirected: false,
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

function malformedChunkResponse(cancelImpl = () => new Promise(() => {})) {
  let cancelCalls = 0;
  let releaseCalls = 0;
  let textCalls = 0;
  const reader = {
    read() {
      return Promise.resolve({ done: false, value: {} });
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
      url: WELL_KNOWN_URL,
      redirected: false,
      headers: new Headers({
        "content-type": "application/json; charset=utf-8",
      }),
      body: {
        getReader() {
          return reader;
        },
      },
      text() {
        textCalls += 1;
        return new Promise(() => {});
      },
    },
    cancelCalls: () => cancelCalls,
    releaseCalls: () => releaseCalls,
    textCalls: () => textCalls,
  };
}

function lockedReadableResponse() {
  let bodyCancelCalls = 0;
  let textCalls = 0;
  const response = bindResponseUrl(new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array([123]));
    },
  }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  }));
  const heldReader = response.body.getReader();
  const originalCancel = response.body.cancel.bind(response.body);
  response.body.cancel = (...args) => {
    bodyCancelCalls += 1;
    return originalCancel(...args);
  };
  const originalText = response.text.bind(response);
  response.text = (...args) => {
    textCalls += 1;
    return originalText(...args);
  };
  return {
    response,
    heldReader,
    bodyCancelCalls: () => bodyCancelCalls,
    textCalls: () => textCalls,
  };
}

function lateResolvedResponse(cancelImpl = () => new Promise(() => {})) {
  let cancelCalls = 0;
  let readCalls = 0;
  return {
    response: {
      status: 200,
      ok: true,
      url: WELL_KNOWN_URL,
      redirected: false,
      headers: new Headers({
        "content-type": "application/json; charset=utf-8",
      }),
      body: {
        cancel() {
          cancelCalls += 1;
          return cancelImpl();
        },
        getReader() {
          readCalls += 1;
          throw new Error("late response body must not be read");
        },
      },
    },
    cancelCalls: () => cancelCalls,
    readCalls: () => readCalls,
  };
}

function finalUrlEvidenceResponse(urlValue, { redirected = false } = {}) {
  let cancelCalls = 0;
  let readCalls = 0;
  const reader = {
    read() {
      readCalls += 1;
      return Promise.resolve({ done: true, value: undefined });
    },
    cancel() {
      cancelCalls += 1;
      return Promise.resolve();
    },
    releaseLock() {},
  };
  const response = {
    status: 200,
    ok: true,
    redirected,
    headers: new Headers({
      "content-type": "application/json; charset=utf-8",
    }),
    body: {
      cancel() {
        cancelCalls += 1;
        return Promise.resolve();
      },
      getReader() {
        return reader;
      },
    },
  };
  if (urlValue !== undefined) response.url = urlValue;
  return {
    response,
    cancelCalls: () => cancelCalls,
    readCalls: () => readCalls,
  };
}

const mismatchedFinalUrl = finalUrlEvidenceResponse(
  "https://attacker.invalid/.well-known/void-agent-discovery.json",
);
await expectRejectWithin(
  "custom fetch final URL mismatch",
  () =>
    discoverVoidAgentV1({
      baseUrl: "https://node.example",
      maxResponseBytes: 1024,
      timeoutMs: 100,
      fetchImpl: async () => mismatchedFinalUrl.response,
    }),
  "well_known_discovery_final_url_mismatch",
);
assertCondition(
  mismatchedFinalUrl.cancelCalls() === 1,
  `expected one final-URL mismatch cancellation, got ${mismatchedFinalUrl.cancelCalls()}`,
);
assertCondition(
  mismatchedFinalUrl.readCalls() === 0,
  `final-URL mismatch must reject before body read; read_calls=${mismatchedFinalUrl.readCalls()}`,
);

const mutatedRequestUrl = "https://node.example/adapter-mutated-discovery.json";
const mutatedRequestAlias = finalUrlEvidenceResponse(mutatedRequestUrl);
let customFetchRequestType = null;
await expectRejectWithin(
  "custom fetch cannot mutate requested URL identity",
  () =>
    discoverVoidAgentV1({
      baseUrl: "https://node.example",
      maxResponseBytes: 1024,
      timeoutMs: 100,
      fetchImpl: async (requestedUrl) => {
        customFetchRequestType = typeof requestedUrl;
        if (requestedUrl instanceof URL) requestedUrl.href = mutatedRequestUrl;
        return mutatedRequestAlias.response;
      },
    }),
  "well_known_discovery_final_url_mismatch",
);
assertCondition(
  customFetchRequestType === "string",
  `custom fetch must receive immutable href string; type=${customFetchRequestType}`,
);
assertCondition(
  mutatedRequestAlias.cancelCalls() === 1,
  `expected one mutated-request cancellation, got ${mutatedRequestAlias.cancelCalls()}`,
);
assertCondition(
  mutatedRequestAlias.readCalls() === 0,
  `mutated request must HOLD before body read; read_calls=${mutatedRequestAlias.readCalls()}`,
);

const missingFinalUrl = finalUrlEvidenceResponse(undefined);
await expectRejectWithin(
  "custom fetch missing final URL",
  () =>
    discoverVoidAgentV1({
      baseUrl: "https://node.example",
      maxResponseBytes: 1024,
      timeoutMs: 100,
      fetchImpl: async () => missingFinalUrl.response,
    }),
  "well_known_discovery_final_url_missing",
);
assertCondition(missingFinalUrl.cancelCalls() === 1, "missing final URL teardown missing");
assertCondition(missingFinalUrl.readCalls() === 0, "missing final URL read body");

const malformedFinalUrl = finalUrlEvidenceResponse("not a URL");
await expectRejectWithin(
  "custom fetch malformed final URL",
  () =>
    discoverVoidAgentV1({
      baseUrl: "https://node.example",
      maxResponseBytes: 1024,
      timeoutMs: 100,
      fetchImpl: async () => malformedFinalUrl.response,
    }),
  "well_known_discovery_final_url_invalid",
);
assertCondition(malformedFinalUrl.cancelCalls() === 1, "malformed final URL teardown missing");
assertCondition(malformedFinalUrl.readCalls() === 0, "malformed final URL read body");

const followedRedirect = finalUrlEvidenceResponse(WELL_KNOWN_URL, { redirected: true });
await expectRejectWithin(
  "custom fetch reports followed redirect",
  () =>
    discoverVoidAgentV1({
      baseUrl: "https://node.example",
      maxResponseBytes: 1024,
      timeoutMs: 100,
      fetchImpl: async () => followedRedirect.response,
    }),
  "well_known_discovery_redirected_response_rejected",
);
assertCondition(followedRedirect.cancelCalls() === 1, "redirected response teardown missing");
assertCondition(followedRedirect.readCalls() === 0, "redirected response read body");

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
const stalledReaderElapsedMs = await expectRejectTiming(
  "admitted body read ignores abort",
  () =>
    discoverVoidAgentV1({
      baseUrl: "https://node.example",
      maxResponseBytes: 1024,
      timeoutMs: 100,
      fetchImpl: async () => stalledReader.response,
    }),
  "well_known_discovery_body_deadline_exceeded",
  { minimumMs: 300, maximumMs: 650 },
);
assertCondition(
  stalledReader.cancelCalls() === 1,
  `expected one stalled reader cancellation attempt, got ${stalledReader.cancelCalls()}`,
);
assertCondition(
  stalledReader.releaseCalls() === 1,
  `expected one reader release attempt, got ${stalledReader.releaseCalls()}`,
);
assertCondition(
  stalledReaderElapsedMs >= 300,
  `stalled reader must retain a post-deadline teardown terminal; elapsed=${stalledReaderElapsedMs}`,
);

const malformedChunk = malformedChunkResponse();
await expectRejectTiming(
  "malformed successful stream chunk",
  () =>
    discoverVoidAgentV1({
      baseUrl: "https://node.example",
      maxResponseBytes: 1024,
      timeoutMs: 100,
      fetchImpl: async () => malformedChunk.response,
    }),
  "well_known_discovery_body_chunk_invalid",
  { minimumMs: 50, maximumMs: 400 },
);
assertCondition(
  malformedChunk.cancelCalls() === 1,
  `expected one malformed-chunk cancellation attempt, got ${malformedChunk.cancelCalls()}`,
);
assertCondition(
  malformedChunk.releaseCalls() === 1,
  `expected one malformed-chunk release attempt, got ${malformedChunk.releaseCalls()}`,
);
assertCondition(
  malformedChunk.textCalls() === 0,
  `malformed chunk must not fall back to response.text(); text_calls=${malformedChunk.textCalls()}`,
);

const lockedBody = lockedReadableResponse();
let lockedFetchSignal = null;
try {
  await expectRejectWithin(
    "locked response body reader acquisition",
    () =>
      discoverVoidAgentV1({
        baseUrl: "https://node.example",
        maxResponseBytes: 1024,
        timeoutMs: 100,
        fetchImpl: async (_url, init) => {
          lockedFetchSignal = init.signal;
          return lockedBody.response;
        },
      }),
    "well_known_discovery_body_reader_unavailable",
  );
  assertCondition(
    lockedFetchSignal?.aborted === true,
    "locked response body must abort the owned request",
  );
  assertCondition(
    lockedBody.bodyCancelCalls() === 1,
    `expected one locked-body cancellation attempt, got ${lockedBody.bodyCancelCalls()}`,
  );
  assertCondition(
    lockedBody.textCalls() === 0,
    `locked body must not fall back to response.text(); text_calls=${lockedBody.textCalls()}`,
  );
} finally {
  lockedBody.heldReader.releaseLock();
}

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

const lateFetch = lateResolvedResponse();
let lateFetchSignal = null;
const lateFetchStartedAt = Date.now();
const lateFetchError = await expectAnyRejectBeforeDeadline(
  "custom fetch resolves after request deadline",
  () =>
    discoverVoidAgentV1({
      baseUrl: "https://node.example",
      maxResponseBytes: 1024,
      timeoutMs: 100,
      fetchImpl: (_url, init) => {
        lateFetchSignal = init.signal;
        return new Promise((resolve) => {
          setTimeout(() => resolve(lateFetch.response), 160);
        });
      },
    }),
  400,
);
const lateFetchElapsedMs = Date.now() - lateFetchStartedAt;
assertCondition(
  lateFetchError?.name === "TimeoutError" &&
    lateFetchError?.message === "well_known_discovery_fetch_deadline_exceeded",
  `expected deterministic late-fetch TimeoutError, got ${lateFetchError?.name}:${lateFetchError?.message}`,
);
assertCondition(
  lateFetchElapsedMs < 250,
  `late fetch must not hold participant response until late cleanup: ${lateFetchElapsedMs}ms`,
);
assertCondition(
  lateFetchSignal?.aborted === true,
  "late custom fetch must observe the owned request as aborted",
);
await new Promise((resolve) => setTimeout(resolve, 400));
assertCondition(
  lateFetch.cancelCalls() === 1,
  `expected exactly one late-response cancellation attempt, got ${lateFetch.cancelCalls()}`,
);
assertCondition(
  lateFetch.readCalls() === 0,
  `late response must be torn down without body consumption; read_calls=${lateFetch.readCalls()}`,
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

function healthyResponse(url) {
  const wellKnownPath = "/.well-known/void-agent-discovery.json";
  const canonicalPath = "/public-node/agents/discovery-v1.json";
  const catalogPath = "/public-node/agents/capability-negotiation-v1.json";
const wellKnown = {
  marker: "VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1",
  version: 1,
  network: { name: "VOID Mainnet-0", chain_id: 2050 },
  canonical_discovery: canonicalPath,
  authority: {
    mutation_authority_granted: false,
    credentials_required: false,
  },
  safety: {
    same_origin_only: true,
    follow_redirects: false,
  },
};

const canonical = {
  marker: "VOID_AI_AGENT_DISCOVERY_CONTRACT_WALL_V1",
  protocol: "void-agent-discovery/1",
  version: 1,
  network: { name: "VOID Mainnet-0", chain_id: 2050 },
  entrypoints: { capability_negotiation: catalogPath },
  capabilities: [
    {
      id: "capability_negotiation",
      state: "live",
      authority: "read_only",
      discovery: catalogPath,
    },
  ],
  authority: { mutation_authority_granted: false },
};

const catalog = {
  marker: "VOID_AI_AGENT_CAPABILITY_NEGOTIATION_V1",
  protocol: "void-agent-capability-negotiation/1",
  version: 1,
  network: { name: "VOID Mainnet-0", chain_id: 2050 },
  negotiation: {
    mode: "client_side_intersection",
    request_submission_enabled: false,
    default_result: "not_granted",
  },
  authority: {
    mutation_authority_granted: false,
    authentication_active: false,
    signed_request_envelopes_active: false,
    payment_submission_active: false,
    work_credit_awards_active: false,
    buy_void_automatic_fulfillment_active: false,
  },
  safety: {
    same_origin_only: true,
    follow_redirects: false,
    send_credentials: false,
    unknown_capability_result: "not_granted",
    ambiguous_capability_result: "not_granted",
  },
  capabilities: [
    {
      id: "public_discovery",
      state: "live",
      enabled: true,
      access: "anonymous",
      authority: "read_only",
      http_methods: ["GET", "HEAD"],
      paths: [wellKnownPath, canonicalPath],
    },
    {
      id: "capability_negotiation",
      state: "live",
      enabled: true,
      access: "anonymous",
      authority: "read_only",
      http_methods: ["GET"],
      paths: [catalogPath],
    },
  ],
};

  const document = new Map([[wellKnownPath, wellKnown], [canonicalPath, canonical], [catalogPath, catalog]]).get(new URL(url).pathname);
  assertCondition(document !== undefined, `unexpected healthy request ${url}`);
  return bindResponseUrl(new Response(JSON.stringify(document), {
    headers: { "content-type": "application/json" },
  }), url);
}
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
}
async function drainObservers() { await new Promise(resolve => setImmediate(resolve)); }

const unhandled = [];
const recordUnhandled = error => unhandled.push(error);
process.on("unhandledRejection", recordUnhandled);
let metadataCases = 0;
let lifetimeCases = 0;
const metadataMutants = [
  ["500_true", { status: 500, ok: true }, "response_ok_status_mismatch"],
  ["200_false", { status: 200, ok: false }, "response_ok_status_mismatch"],
  ...["200", NaN, Infinity, -Infinity, 200.5, 0, 99, 600, null, true, {}, new Number(200)].map((status, i) =>
    [`status_${i}`, { status, ok: true }, "response_status_invalid"]),
  ...["true", 1, null, undefined, {}, new Boolean(true)].map((ok, i) =>
    [`ok_${i}`, { status: 200, ok }, "response_ok_status_mismatch"]),
  ["http_500", { status: 500, ok: false }, "http_500"],
  ["redirect", { status: 302, ok: false }, "redirect_rejected"],
  ...["status", "ok", "url", "redirected", "headers"].map(field =>
    [`throws_${field}`, field, "response_metadata_unavailable"]),
];
// Bad metadata at every discovery stage must reject before that body's first read.
for (const stage of [0, 1, 2]) {
  for (const [name, mutation, reason] of metadataMutants) {
    let fetches = 0;
    let reads = 0;
    let cancels = 0;
    let acquisitions = 0;
    const fetchImpl = async url => {
      const current = fetches++;
      if (current !== stage) return healthyResponse(url);
      const response = {
        status: 200, ok: true, url, redirected: false,
        headers: new Headers({ "content-type": "application/json" }),
        body: {
          getReader() { acquisitions++; return { read() { reads++; return Promise.resolve({ done: true }); } }; },
          cancel() { cancels++; return Promise.resolve(); },
        },
      };
      if (typeof mutation === "string") {
        Object.defineProperty(response, mutation, { get() { throw new Error(`hostile_${mutation}`); } });
      } else Object.assign(response, mutation);
      return response;
    };
    await expectRejectWithin(`${stage}/${name}`, () => discoverVoidAgentV1({
      baseUrl: "https://metadata.example", timeoutMs: 100, fetchImpl,
    }), reason);
    assertCondition(fetches === stage + 1 && acquisitions === 0 && reads === 0 && cancels === 1,
      `${stage}/${name}: metadata crossed body authority or skipped teardown`);
    metadataCases++;
  }
}
// Getter values are admitted once; a later contradictory read cannot change truth.
let statusReads = 0;
let okReads = 0;
const snapshotReport = await discoverVoidAgentV1({
  baseUrl: "https://snapshot.example",
  fetchImpl: async url => {
    const response = healthyResponse(url);
    Object.defineProperty(response, "status", { get() { statusReads++; return 200; } });
    Object.defineProperty(response, "ok", { get() { okReads++; return true; } });
    return response;
  },
});
assertCondition(snapshotReport.status === "ready_read_only" && statusReads === 3 && okReads === 3,
  "metadata was not snapshotted exactly once per response");

for (const cancelKind of ["resolve", "reject", "pending"]) {
  for (const lateKind of ["eof", "reject", "chunk", "invalid"]) {
    const pendingRead = deferred();
    const pendingCancel = deferred();
    let fetches = 0;
    let reads = 0;
    let outstanding = 0;
    let maximum = 0;
    let cancels = 0;
    let healthy = false;
    const fetchImpl = async url => {
      fetches++;
      if (healthy || new URL(url).hostname === "healthy.example") return healthyResponse(url);
      return {
        status: 200, ok: true, url, redirected: false,
        headers: new Headers({ "content-type": "application/json" }),
        body: { getReader() { return {
          read() {
            reads++; outstanding++; maximum = Math.max(maximum, outstanding);
            return pendingRead.promise.finally(() => { outstanding--; });
          },
          cancel() {
            cancels++;
            if (cancelKind === "resolve") return Promise.resolve();
            if (cancelKind === "reject") return Promise.reject(new Error("cancel_rejected"));
            return pendingCancel.promise;
          },
          releaseLock() {},
        }; } },
      };
    };
    const options = { baseUrl: "https://lifetime.example", timeoutMs: 100, fetchImpl };
    await expectRejectWithin(`${cancelKind}/${lateKind}:initial`, () => discoverVoidAgentV1(options),
      "well_known_discovery_body_deadline_exceeded");
    for (let retry = 0; retry < 3; retry++) {
      await expectRejectWithin(`${cancelKind}/${lateKind}:retry`, () => discoverVoidAgentV1(options),
        "transport_generation_unsettled");
    }
    assertCondition(fetches === 1 && reads === 1 && outstanding === 1 && maximum === 1 && cancels === 1,
      `${cancelKind}/${lateKind}: unresolved read generations accumulated`);
    const otherOrigin = await discoverVoidAgentV1({ ...options, baseUrl: "https://healthy.example" });
    assertCondition(otherOrigin.status === "ready_read_only", "one quarantined origin blocked another");
    healthy = true;
    if (lateKind === "reject") pendingRead.reject(new Error("late_read_rejected"));
    else if (lateKind === "eof") pendingRead.resolve({ done: true });
    else if (lateKind === "chunk") pendingRead.resolve({ done: false, value: new Uint8Array([123]) });
    else pendingRead.resolve({ done: "false" });
    await drainObservers();
    assertCondition(outstanding === 0, "late read was not observed");
    if (cancelKind === "pending") {
      await expectRejectWithin("pending cancellation retains generation", () => discoverVoidAgentV1(options),
        "transport_generation_unsettled");
      pendingCancel.resolve();
      await drainObservers();
    }
    if (cancelKind === "reject" && ["chunk", "invalid"].includes(lateKind)) {
      await expectRejectWithin("nonterminal late bytes preserve quarantine", () => discoverVoidAgentV1(options),
        "transport_generation_unsettled");
    } else {
      const recovery = await discoverVoidAgentV1(options);
      assertCondition(recovery.status === "ready_read_only", "late terminal did not permit clean recovery");
      assertCondition(Object.values(recovery.authority).every(v => v === false), "recovery gained authority");
    }
    assertCondition(reads === 1 && cancels === 1 && maximum === 1, "late outcome reused hostile bytes or cleanup");
    lifetimeCases++;
  }
}

// Fetch itself and detached late cancellation retain the same transport lease.
for (const lateKind of ["response", "rejection"]) {
  const pendingFetch = deferred();
  const pendingCancel = deferred();
  let fetches = 0;
  let cancels = 0;
  let healthy = false;
  const fetchImpl = async url => {
    fetches++;
    return healthy ? healthyResponse(url) : pendingFetch.promise;
  };
  const options = { baseUrl: "https://fetch-owner.example", timeoutMs: 100, fetchImpl };
  await expectRejectWithin("fetch lifetime", () => discoverVoidAgentV1(options), "fetch_deadline_exceeded");
  for (let retry = 0; retry < 3; retry++) {
    await expectRejectWithin("fetch retries quarantined", () => discoverVoidAgentV1(options), "transport_generation_unsettled");
  }
  assertCondition(fetches === 1, "unresolved fetch generations accumulated");
  healthy = true;
  if (lateKind === "response") {
    pendingFetch.resolve({ body: { cancel() { cancels++; return pendingCancel.promise; } } });
    await drainObservers();
    for (let retry = 0; retry < 3; retry++) {
      await expectRejectWithin("late cancellation retains origin", () => discoverVoidAgentV1(options), "transport_generation_unsettled");
    }
    assertCondition(cancels === 1 && fetches === 1, "late response cleanup leaked generations");
    pendingCancel.resolve();
  } else pendingFetch.reject(new Error("late_fetch_rejected"));
  await drainObservers();
  const recovered = await discoverVoidAgentV1(options);
  assertCondition(recovered.status === "ready_read_only" && fetches === 4, "late fetch did not release exactly once");
  lifetimeCases++;
}

// Real stream-error termination recovers even when native cancellation rejects.
let nativeHealthy = false;
const nativeFetch = async url => {
  if (nativeHealthy) return healthyResponse(url);
  return bindResponseUrl(new Response(new ReadableStream({
    pull(controller) { controller.error(new Error("native_read_error")); },
  }), { headers: { "content-type": "application/json" } }), url);
};
await expectRejectWithin("native read error", () => discoverVoidAgentV1({ baseUrl: "https://native.example", fetchImpl: nativeFetch }), "native_read_error");
nativeHealthy = true;
assertCondition((await discoverVoidAgentV1({ baseUrl: "https://native.example", fetchImpl: nativeFetch })).status === "ready_read_only",
  "native errored body permanently quarantined the origin");
await drainObservers();
process.removeListener("unhandledRejection", recordUnhandled);
assertCondition(unhandled.length === 0, `unhandled late rejections: ${unhandled.length}`);
console.log(`exact_response_metadata_cases=${metadataCases}`);
console.log(`transport_generation_cases=${lifetimeCases + 1}`);
console.log("max_unresolved_reads_per_transport_origin=1");
console.log("cancel_success_does_not_retire_unresolved_read=true");
console.log("late_read_and_cleanup_generation_observed=true");
console.log("quarantine_isolated_by_transport_and_origin=true");
console.log("native_body_error_recovery=true");
console.log("response_metadata_rejected_before_body_admission=true");
console.log("unhandled_late_rejections=0");

console.log("stream_oversize_primary_error_preserved=true");
console.log("declared_oversize_primary_error_preserved=true");
console.log("response_teardown_owned_until_bounded_terminal=true");
console.log("non_stream_response_text_fallback_forbidden=true");
console.log("stalled_reader_total_deadline_enforced=true");
console.log("stalled_reader_separate_teardown_terminal=true");
console.log("custom_fetch_total_deadline_enforced=true");
console.log("late_fetch_response_teardown_owned=true");
console.log("custom_fetch_final_url_identity_bound=true");
console.log("custom_fetch_request_url_snapshot_immutable=true");
console.log("repeated_hostile_teardown_terminals_bounded=true");
console.log("malformed_stream_chunk_teardown_owned=true");
console.log("locked_stream_reader_acquisition_teardown_owned=true");
console.log("VOID_AGENT_SDK_STREAM_CANCEL_LIVENESS_V1_PROOF_GREEN=true");
