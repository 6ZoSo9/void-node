#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";

import {
  parseBootstrapClientArgsV1,
  runVoidAiAgentBootstrapClientV1,
  writeBootstrapOutputFileV1,
} from "../tools/void-ai-agent-bootstrap-client-v1.mjs";

const MAX_TIMEOUT_MS = 30_000;
const MAX_ALLOWED_BYTES = 4_194_304;
const BASE_URL = "http://127.0.0.1:4100";
const WELL_KNOWN_URL = `${BASE_URL}/.well-known/void-agent-discovery.json`;

const WELL_KNOWN = {
  marker: "VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1",
  protocol: "void-agent-discovery-well-known/1",
  network: {
    name: "VOID Mainnet-0",
    chain_id: 2050,
  },
  canonical_discovery: "/public-node/agents/discovery-v1.json",
  authority: {
    default: "read_only",
    mutation_authority_granted: false,
    credentials_required: false,
  },
};

const PAYLOADS = new Map([
  ["/.well-known/void-agent-discovery.json", WELL_KNOWN],
  [
    "/public-node/agents/discovery-v1.json",
    { marker: "VOID_AI_AGENT_DISCOVERY_V1", status: "available" },
  ],
  [
    "/.well-known/void-agent-capabilities.json",
    {
      marker: "VOID_AI_AGENT_CAPABILITIES_WELL_KNOWN_V1",
      status: "available",
    },
  ],
  [
    "/.well-known/void-agent-authentication.json",
    {
      marker: "VOID_AI_AGENT_AUTHENTICATION_WELL_KNOWN_V1",
      status: "available",
    },
  ],
  [
    "/public-node/agents/first-contact-v1.json",
    { marker: "VOID_AI_AGENT_FIRST_CONTACT_V1", connection_mode: "read_only" },
  ],
  [
    "/.well-known/void-agent-intake-capability-v1.json",
    {
      marker: "VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_V1",
      status: "available",
    },
  ],
]);

function bytes(value) {
  return new TextEncoder().encode(value);
}

function bindResponseUrl(response, url, redirected = false) {
  Object.defineProperty(response, "url", {
    value: String(url),
    configurable: true,
  });
  Object.defineProperty(response, "redirected", {
    value: redirected,
    configurable: true,
  });
  return response;
}

function jsonResponse(payload, url = WELL_KNOWN_URL) {
  const content = JSON.stringify(payload);
  return bindResponseUrl(
    new Response(content, {
      status: 200,
      headers: {
        "content-type": "application/json",
        "content-length": String(Buffer.byteLength(content)),
      },
    }),
    url,
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function neverSettlingCancellationStream(chunks = []) {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
    },
    cancel() {
      return new Promise(() => {});
    },
  });
}

let stalledBodyCancelCalls = 0;

function fetchForMode(mode) {
  return async (input, init = {}) => {
    const url = input instanceof URL ? input : new URL(String(input));
    const payload = PAYLOADS.get(url.pathname);
    if (!payload) {
      return bindResponseUrl(
        new Response("{}", { status: 404 }),
        url.href,
      );
    }

    if (url.pathname !== "/.well-known/void-agent-capabilities.json") {
      return jsonResponse(payload, url.href);
    }

    if (mode === "redirect_cancel_never") {
      return bindResponseUrl(
        new Response(
          neverSettlingCancellationStream([
            bytes('{"redirect":"body"}'),
          ]),
          {
            status: 302,
            headers: {
              "content-type": "application/json",
              location: "/redirect-target",
            },
          },
        ),
        url.href,
      );
    }

    if (mode === "declared_oversize_cancel_never") {
      return bindResponseUrl(
        new Response(neverSettlingCancellationStream(), {
          status: 200,
          headers: {
            "content-type": "application/json",
            "content-length": "2048",
          },
        }),
        url.href,
      );
    }

    if (mode === "streamed_oversize_cancel_never") {
      return bindResponseUrl(
        new Response(
          neverSettlingCancellationStream([
            new Uint8Array(700).fill(0x61),
            new Uint8Array(700).fill(0x62),
          ]),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        ),
        url.href,
      );
    }

    if (mode === "invalid_content_length") {
      return bindResponseUrl(
        new Response(neverSettlingCancellationStream(), {
          status: 200,
          headers: {
            "content-type": "application/json",
            "content-length": "12x",
          },
        }),
        url.href,
      );
    }

    if (mode === "stalled_body") {
      const signal = init.signal;
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(bytes("{"));
          signal?.addEventListener(
            "abort",
            () => {
              controller.error(signal.reason ?? new Error("aborted"));
            },
            { once: true },
          );
        },
        cancel() {
          return Promise.resolve();
        },
      });
      return bindResponseUrl(
        new Response(stream, {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
        url.href,
      );
    }

    if (mode === "stalled_body_ignores_abort") {
      return {
        status: 200,
        ok: true,
        url: url.href,
        redirected: false,
        headers: new Headers({
          "content-type": "application/json",
        }),
        body: {
          getReader() {
            return {
              read() {
                return new Promise(() => {});
              },
              cancel() {
                stalledBodyCancelCalls += 1;
                return Promise.resolve();
              },
            };
          },
          cancel() {
            throw new Error("reader should own cancellation");
          },
        },
      };
    }

    if (mode === "prelocked_body") {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(bytes(JSON.stringify(payload)));
          controller.close();
        },
      });
      const response = bindResponseUrl(
        new Response(stream, {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
        url.href,
      );
      const proofReader = response.body.getReader();
      Object.defineProperty(response, "__voidProofLockedReader", {
        value: proofReader,
      });
      return response;
    }

    return jsonResponse(payload, url.href);
  };
}

async function runMode(mode, { timeoutMs = 1000 } = {}) {
  const started = performance.now();
  const result = await runVoidAiAgentBootstrapClientV1({
    baseUrl: BASE_URL,
    timeoutMs,
    maxBytes: 1024,
    fetchImpl: fetchForMode(mode),
  });
  return {
    result,
    elapsedMs: performance.now() - started,
  };
}

async function runFinalUrlCase(mode) {
  let readerAcquisitions = 0;
  let bodyCancelCalls = 0;

  const fetchImpl = async (input) => {
    const requested = input instanceof URL ? input : new URL(String(input));
    const payload = PAYLOADS.get(requested.pathname);
    if (!payload) {
      return bindResponseUrl(
        new Response("{}", { status: 404 }),
        requested.href,
      );
    }

    if (requested.pathname !== "/.well-known/void-agent-capabilities.json") {
      return jsonResponse(payload, requested.href);
    }

    let finalUrl = requested.href;
    let redirected = false;
    if (mode === "missing") finalUrl = "";
    if (mode === "malformed") finalUrl = "not a url";
    if (mode === "wrong_path") {
      finalUrl = new URL("/wrong-path", requested).href;
    }
    if (mode === "wrong_query") {
      finalUrl = new URL(`${requested.pathname}?wrong=1`, requested).href;
    }
    if (mode === "wrong_fragment") {
      finalUrl = new URL(`${requested.pathname}#wrong`, requested).href;
    }
    if (mode === "cross_origin") {
      finalUrl = `https://wrong-origin.invalid${requested.pathname}`;
    }
    if (mode === "followed_redirect") {
      redirected = true;
    }

    return {
      status: 200,
      ok: true,
      url: finalUrl,
      redirected,
      headers: new Headers({
        "content-type": "application/json",
      }),
      body: {
        getReader() {
          readerAcquisitions += 1;
          throw new Error("provenance rejection must precede body admission");
        },
        cancel() {
          bodyCancelCalls += 1;
          return Promise.resolve();
        },
      },
    };
  };

  const result = await runVoidAiAgentBootstrapClientV1({
    baseUrl: BASE_URL,
    timeoutMs: 1000,
    maxBytes: 1024,
    fetchImpl,
  });

  return {
    result,
    readerAcquisitions,
    bodyCancelCalls,
  };
}

const parsedMinimumBounds = parseBootstrapClientArgsV1([
  "--base-url",
  BASE_URL,
  "--timeout-ms",
  "1",
  "--max-bytes",
  "1",
]);
assert.equal(parsedMinimumBounds.timeoutMs, 1);
assert.equal(parsedMinimumBounds.maxBytes, 1);

const parsedMaximumBounds = parseBootstrapClientArgsV1([
  "--base-url",
  BASE_URL,
  "--timeout-ms",
  String(MAX_TIMEOUT_MS),
  "--max-bytes",
  String(MAX_ALLOWED_BYTES),
]);
assert.equal(parsedMaximumBounds.timeoutMs, MAX_TIMEOUT_MS);
assert.equal(parsedMaximumBounds.maxBytes, MAX_ALLOWED_BYTES);

for (const token of [
  "5000ms",
  "1e3",
  "01",
  "+1",
  "1.0",
  "0",
  "-1",
  "30001",
  " 1",
]) {
  assert.throws(
    () =>
      parseBootstrapClientArgsV1([
        "--base-url",
        BASE_URL,
        "--timeout-ms",
        token,
      ]),
    /timeout-ms must be an integer from 1 through 30000/,
  );
}

for (const token of [
  "1024junk",
  "1e3",
  "01",
  "+1",
  "1.0",
  "0",
  "-1",
  "4194305",
  " 1",
]) {
  assert.throws(
    () =>
      parseBootstrapClientArgsV1([
        "--base-url",
        BASE_URL,
        "--max-bytes",
        token,
      ]),
    /max-bytes must be an integer from 1 through 4194304/,
  );
}

const invalidTimeoutValues = [
  NaN,
  Infinity,
  -Infinity,
  true,
  false,
  [],
  {},
  "1000",
  1.5,
  0,
  -1,
  Number.MAX_SAFE_INTEGER + 1,
  MAX_TIMEOUT_MS + 1,
];
for (const timeoutMs of invalidTimeoutValues) {
  let fetchCalls = 0;
  await assert.rejects(
    runVoidAiAgentBootstrapClientV1({
      baseUrl: BASE_URL,
      timeoutMs,
      maxBytes: 1024,
      fetchImpl: () => {
        fetchCalls += 1;
        return Promise.resolve(jsonResponse(WELL_KNOWN));
      },
    }),
    /timeoutMs must be an integer from 1 through 30000/,
  );
  assert.equal(fetchCalls, 0);
}

const invalidMaxByteValues = [
  NaN,
  Infinity,
  -Infinity,
  true,
  false,
  [],
  {},
  "1024",
  1.5,
  0,
  -1,
  Number.MAX_SAFE_INTEGER + 1,
  MAX_ALLOWED_BYTES + 1,
];
for (const maxBytes of invalidMaxByteValues) {
  let fetchCalls = 0;
  await assert.rejects(
    runVoidAiAgentBootstrapClientV1({
      baseUrl: BASE_URL,
      timeoutMs: 1000,
      maxBytes,
      fetchImpl: () => {
        fetchCalls += 1;
        return Promise.resolve(jsonResponse(WELL_KNOWN));
      },
    }),
    /maxBytes must be an integer from 1 through 4194304/,
  );
  assert.equal(fetchCalls, 0);
}

let minimumTimeoutFetchCalls = 0;
await assert.rejects(
  runVoidAiAgentBootstrapClientV1({
    baseUrl: BASE_URL,
    timeoutMs: 1,
    maxBytes: 1024,
    fetchImpl: () => {
      minimumTimeoutFetchCalls += 1;
      return new Promise(() => {});
    },
  }),
  /bootstrap_request_deadline_exceeded/,
);
assert.equal(minimumTimeoutFetchCalls, 1);

let minimumByteFetchCalls = 0;
await assert.rejects(
  runVoidAiAgentBootstrapClientV1({
    baseUrl: BASE_URL,
    timeoutMs: 1000,
    maxBytes: 1,
    fetchImpl: (input) => {
      minimumByteFetchCalls += 1;
      const url = input instanceof URL ? input : new URL(String(input));
      return Promise.resolve(jsonResponse(WELL_KNOWN, url.href));
    },
  }),
  /^Error: response_too_large:/,
);
assert.equal(minimumByteFetchCalls, 1);

const maximumBoundsResult = await runVoidAiAgentBootstrapClientV1({
  baseUrl: BASE_URL,
  timeoutMs: MAX_TIMEOUT_MS,
  maxBytes: MAX_ALLOWED_BYTES,
  fetchImpl: fetchForMode("small"),
});
assert.equal(maximumBoundsResult.readiness.read_only_connection_ready, true);
assert.equal(maximumBoundsResult.readiness.onboarding_surface_complete, true);

const small = await runMode("small");
assert.equal(small.result.readiness.read_only_connection_ready, true);
assert.equal(small.result.surfaces.capabilities.available, true);

for (const [mode, expectedError] of [
  ["missing", "response_final_url_missing"],
  ["malformed", "response_final_url_invalid"],
  ["wrong_path", "response_final_url_mismatch"],
  ["wrong_query", "response_final_url_mismatch"],
  ["wrong_fragment", "response_final_url_mismatch"],
  ["cross_origin", "response_final_url_mismatch"],
  ["followed_redirect", "response_redirected_forbidden"],
]) {
  const provenance = await runFinalUrlCase(mode);
  assert.equal(provenance.result.surfaces.capabilities.available, false);
  assert.equal(provenance.result.surfaces.capabilities.error, expectedError);
  assert.equal(provenance.readerAcquisitions, 0);
  assert.equal(provenance.bodyCancelCalls, 1);
}

const redirect = await runMode("redirect_cancel_never");
assert.equal(redirect.result.surfaces.capabilities.available, false);
assert.equal(
  redirect.result.surfaces.capabilities.error,
  "redirect_forbidden:302",
);
assert(
  redirect.elapsedMs < 1200,
  `redirect rejection waited on non-settling cancellation: ${redirect.elapsedMs.toFixed(1)}ms`,
);

const declared = await runMode("declared_oversize_cancel_never");
assert.equal(declared.result.surfaces.capabilities.available, false);
assert.match(
  declared.result.surfaces.capabilities.error,
  /^response_too_large:2048$/,
);
assert(
  declared.elapsedMs < 1200,
  `declared oversize waited on non-settling cancellation: ${declared.elapsedMs.toFixed(1)}ms`,
);

const streamed = await runMode("streamed_oversize_cancel_never");
assert.equal(streamed.result.surfaces.capabilities.available, false);
assert.match(
  streamed.result.surfaces.capabilities.error,
  /^response_too_large:1400$/,
);
assert(
  streamed.elapsedMs < 1200,
  `streamed oversize waited on non-settling cancellation: ${streamed.elapsedMs.toFixed(1)}ms`,
);

const invalidLength = await runMode("invalid_content_length");
assert.equal(invalidLength.result.surfaces.capabilities.available, false);
assert.equal(
  invalidLength.result.surfaces.capabilities.error,
  "response_invalid_content_length:12x",
);
assert(
  invalidLength.elapsedMs < 1200,
  `invalid declared length waited on non-settling cancellation: ${invalidLength.elapsedMs.toFixed(1)}ms`,
);

const stalled = await runMode("stalled_body", { timeoutMs: 120 });
assert.equal(stalled.result.surfaces.capabilities.available, false);
assert(
  stalled.elapsedMs < 1200,
  `stalled admitted body escaped total deadline: ${stalled.elapsedMs.toFixed(1)}ms`,
);

stalledBodyCancelCalls = 0;
const stalledIgnoringAbort = await runMode(
  "stalled_body_ignores_abort",
  { timeoutMs: 120 },
);
assert.equal(
  stalledIgnoringAbort.result.surfaces.capabilities.available,
  false,
);
assert.equal(
  stalledIgnoringAbort.result.surfaces.capabilities.error,
  "bootstrap_request_deadline_exceeded",
);
assert.equal(stalledBodyCancelCalls, 1);
assert(
  stalledIgnoringAbort.elapsedMs < 1200,
  `signal-ignoring reader escaped owned deadline: ${stalledIgnoringAbort.elapsedMs.toFixed(1)}ms`,
);

const prelocked = await runMode("prelocked_body");
assert.equal(prelocked.result.surfaces.capabilities.available, false);
assert.equal(
  prelocked.result.surfaces.capabilities.error,
  "response_body_reader_unavailable",
);
assert(
  prelocked.elapsedMs < 1200,
  `prelocked reader acquisition escaped teardown ownership: ${prelocked.elapsedMs.toFixed(1)}ms`,
);

let neverFetchCalls = 0;
const neverFetch = () => {
  neverFetchCalls += 1;
  return new Promise(() => {});
};
const neverStarted = performance.now();
await assert.rejects(
  runVoidAiAgentBootstrapClientV1({
    baseUrl: BASE_URL,
    timeoutMs: 90,
    maxBytes: 1024,
    fetchImpl: neverFetch,
  }),
  /bootstrap_request_deadline_exceeded/,
);
assert(
  performance.now() - neverStarted < 700,
  "never-settling fetch acquisition escaped the request deadline",
);
const quarantineStarted = performance.now();
await assert.rejects(
  runVoidAiAgentBootstrapClientV1({
    baseUrl: BASE_URL,
    timeoutMs: 90,
    maxBytes: 1024,
    fetchImpl: neverFetch,
  }),
  /bootstrap_fetch_acquisition_quarantined/,
);
assert.equal(neverFetchCalls, 1);
assert(
  performance.now() - quarantineStarted < 300,
  "quarantined unresolved acquisition did not fail fast",
);

let resolveLateFetch;
let lateFetchCalls = 0;
let lateCleanupCalls = 0;
const lateFetch = (input) => {
  lateFetchCalls += 1;
  if (lateFetchCalls === 1) {
    return new Promise((resolve) => {
      resolveLateFetch = resolve;
    });
  }
  const url = input instanceof URL ? input : new URL(String(input));
  return Promise.resolve(jsonResponse(PAYLOADS.get(url.pathname), url.href));
};
const lateFirst = runVoidAiAgentBootstrapClientV1({
  baseUrl: BASE_URL,
  timeoutMs: 90,
  maxBytes: 1024,
  fetchImpl: lateFetch,
});
await assert.rejects(lateFirst, /bootstrap_request_deadline_exceeded/);
await assert.rejects(
  runVoidAiAgentBootstrapClientV1({
    baseUrl: BASE_URL,
    timeoutMs: 90,
    maxBytes: 1024,
    fetchImpl: lateFetch,
  }),
  /bootstrap_fetch_acquisition_quarantined/,
);
assert.equal(lateFetchCalls, 1);
resolveLateFetch({
  body: {
    cancel() {
      lateCleanupCalls += 1;
      return Promise.resolve();
    },
  },
});
await sleep(20);
assert.equal(lateCleanupCalls, 1);
const recovered = await runVoidAiAgentBootstrapClientV1({
  baseUrl: BASE_URL,
  timeoutMs: 1000,
  maxBytes: 1024,
  fetchImpl: lateFetch,
});
assert.equal(recovered.readiness.read_only_connection_ready, true);
assert.equal(recovered.readiness.onboarding_surface_complete, true);
assert.equal(lateCleanupCalls, 1);
assert.equal(lateFetchCalls, 7);

let stalledGenerationFetchCalls = 0;
let stalledGenerationReadCalls = 0;
let stalledGenerationOutstandingReads = 0;
let stalledGenerationMaxOutstandingReads = 0;
let stalledGenerationCancelCalls = 0;
let resolveStalledGenerationRead;
const stalledGenerationFetch = (input) => {
  stalledGenerationFetchCalls += 1;
  const url = input instanceof URL ? input : new URL(String(input));
  const payload = PAYLOADS.get(url.pathname);

  if (stalledGenerationFetchCalls === 1) {
    return Promise.resolve({
      status: 200,
      ok: true,
      url: url.href,
      redirected: false,
      headers: new Headers({
        "content-type": "application/json",
      }),
      body: {
        getReader() {
          return {
            read() {
              stalledGenerationReadCalls += 1;
              stalledGenerationOutstandingReads += 1;
              stalledGenerationMaxOutstandingReads = Math.max(
                stalledGenerationMaxOutstandingReads,
                stalledGenerationOutstandingReads,
              );
              return new Promise((resolve) => {
                resolveStalledGenerationRead = (value) => {
                  stalledGenerationOutstandingReads -= 1;
                  resolve(value);
                };
              });
            },
            cancel() {
              stalledGenerationCancelCalls += 1;
              return Promise.resolve();
            },
          };
        },
      },
    });
  }

  return Promise.resolve(jsonResponse(payload, url.href));
};

await assert.rejects(
  runVoidAiAgentBootstrapClientV1({
    baseUrl: BASE_URL,
    timeoutMs: 90,
    maxBytes: 1024,
    fetchImpl: stalledGenerationFetch,
  }),
  /bootstrap_request_deadline_exceeded/,
);
assert.equal(stalledGenerationFetchCalls, 1);
assert.equal(stalledGenerationReadCalls, 1);
assert.equal(stalledGenerationOutstandingReads, 1);
assert.equal(stalledGenerationMaxOutstandingReads, 1);
assert.equal(stalledGenerationCancelCalls, 1);

for (let retry = 0; retry < 3; retry += 1) {
  await assert.rejects(
    runVoidAiAgentBootstrapClientV1({
      baseUrl: BASE_URL,
      timeoutMs: 90,
      maxBytes: 1024,
      fetchImpl: stalledGenerationFetch,
    }),
    /bootstrap_fetch_acquisition_quarantined/,
  );
}
assert.equal(stalledGenerationFetchCalls, 1);
assert.equal(stalledGenerationReadCalls, 1);
assert.equal(stalledGenerationOutstandingReads, 1);
assert.equal(stalledGenerationMaxOutstandingReads, 1);

resolveStalledGenerationRead({ done: true, value: undefined });
await sleep(20);
assert.equal(stalledGenerationOutstandingReads, 0);

const stalledGenerationRecovered = await runVoidAiAgentBootstrapClientV1({
  baseUrl: BASE_URL,
  timeoutMs: 1000,
  maxBytes: 1024,
  fetchImpl: stalledGenerationFetch,
});
assert.equal(
  stalledGenerationRecovered.readiness.read_only_connection_ready,
  true,
);
assert.equal(
  stalledGenerationRecovered.readiness.onboarding_surface_complete,
  true,
);
assert.equal(stalledGenerationFetchCalls, 7);
assert.equal(stalledGenerationReadCalls, 1);
assert.equal(stalledGenerationCancelCalls, 1);
assert.equal(stalledGenerationMaxOutstandingReads, 1);

let resolveNeverCancelFetch;
let resolveNeverCancelCleanup;
let neverCancelFetchCalls = 0;
let neverCancelCleanupCalls = 0;
const lateNeverCancelFetch = (input) => {
  neverCancelFetchCalls += 1;
  if (neverCancelFetchCalls === 1) {
    return new Promise((resolve) => {
      resolveNeverCancelFetch = resolve;
    });
  }
  const url = input instanceof URL ? input : new URL(String(input));
  return Promise.resolve(jsonResponse(PAYLOADS.get(url.pathname), url.href));
};
const lateNeverCancelFirst = runVoidAiAgentBootstrapClientV1({
  baseUrl: BASE_URL,
  timeoutMs: 90,
  maxBytes: 1024,
  fetchImpl: lateNeverCancelFetch,
});
await assert.rejects(
  lateNeverCancelFirst,
  /bootstrap_request_deadline_exceeded/,
);
resolveNeverCancelFetch({
  body: {
    cancel() {
      neverCancelCleanupCalls += 1;
      return new Promise((resolve) => {
        resolveNeverCancelCleanup = resolve;
      });
    },
  },
});
await sleep(320);
assert.equal(neverCancelCleanupCalls, 1);
await assert.rejects(
  runVoidAiAgentBootstrapClientV1({
    baseUrl: BASE_URL,
    timeoutMs: 90,
    maxBytes: 1024,
    fetchImpl: lateNeverCancelFetch,
  }),
  /bootstrap_fetch_acquisition_quarantined/,
);
assert.equal(neverCancelFetchCalls, 1);
resolveNeverCancelCleanup();
await sleep(20);
const lateNeverCancelRecovered = await runVoidAiAgentBootstrapClientV1({
  baseUrl: BASE_URL,
  timeoutMs: 1000,
  maxBytes: 1024,
  fetchImpl: lateNeverCancelFetch,
});
assert.equal(
  lateNeverCancelRecovered.readiness.read_only_connection_ready,
  true,
);
assert.equal(neverCancelFetchCalls, 7);
assert.equal(neverCancelCleanupCalls, 1);

const outputDirectory = mkdtempSync(
  path.join(os.tmpdir(), "void-bootstrap-output-v1-"),
);
const outputPath = path.join(outputDirectory, "bootstrap.json");
const outputContent = '{"marker":"VOID_BOOTSTRAP_OUTPUT_PROOF_V1"}\n';
assert.equal(
  writeBootstrapOutputFileV1(outputPath, outputContent),
  outputPath,
);
assert.equal(readFileSync(outputPath, "utf8"), outputContent);
assert.equal(statSync(outputPath).mode & 0o777, 0o600);

const existingOutputPath = path.join(outputDirectory, "existing.json");
writeFileSync(existingOutputPath, "existing-sentinel\n", "utf8");
assert.throws(
  () => writeBootstrapOutputFileV1(existingOutputPath, "replacement\n"),
  /output path already exists/,
);
assert.equal(
  readFileSync(existingOutputPath, "utf8"),
  "existing-sentinel\n",
);

const symlinkTargetPath = path.join(outputDirectory, "symlink-target.json");
const symlinkOutputPath = path.join(outputDirectory, "symlink-output.json");
writeFileSync(symlinkTargetPath, "symlink-target-sentinel\n", "utf8");
symlinkSync(symlinkTargetPath, symlinkOutputPath);
assert.throws(
  () => writeBootstrapOutputFileV1(symlinkOutputPath, "replacement\n"),
  /output path already exists/,
);
assert.equal(
  readFileSync(symlinkTargetPath, "utf8"),
  "symlink-target-sentinel\n",
);

const clientSource = readFileSync(
  new URL("../tools/void-ai-agent-bootstrap-client-v1.mjs", import.meta.url),
  "utf8",
);
assert.match(clientSource, /openSync\(resolved, "wx", 0o600\)/);
assert.match(clientSource, /writeFileSync\(descriptor, content/);
assert.match(clientSource, /fsyncSync\(descriptor\)/);
assert.doesNotMatch(clientSource, /writeFileSync\(resolved, content/);
assert.doesNotMatch(clientSource, /chmodSync\(resolved/);

for (const result of [
  maximumBoundsResult,
  small.result,
  redirect.result,
  declared.result,
  streamed.result,
  invalidLength.result,
  stalled.result,
  stalledIgnoringAbort.result,
  prelocked.result,
  recovered,
  stalledGenerationRecovered,
  lateNeverCancelRecovered,
]) {
  assert.equal(result.readiness.mutation_authority_granted, false);
  assert.equal(result.readiness.wallet_or_signer_access_granted, false);
  assert.equal(result.readiness.payment_authority_granted, false);
  assert.equal(result.safety.http_methods_used.length, 1);
  assert.equal(result.safety.http_methods_used[0], "GET");
  assert.equal(result.safety.redirects_followed, false);
  assert.equal(result.safety.credentials_sent, false);
  assert.equal(result.safety.request_body_sent, false);
  assert.equal(result.safety.transaction_broadcast_performed, false);
  assert.equal(result.safety.wc_ledger_write_performed, false);
}

console.log("VOID_AI_AGENT_BOOTSTRAP_RESPONSE_BOUNDS_V1_PROOF_GREEN");
console.log("bound_controls_strictly_typed=true");
console.log("cli_bound_tokens_canonical_decimal=true");
console.log("invalid_bound_controls_zero_fetch=true");
console.log("minimum_and_maximum_bounds_accepted=true");
console.log("exact_final_url_provenance_required=true");
console.log("followed_redirect_report_rejected=true");
console.log("provenance_rejected_before_body_admission=true");
console.log("redirect_rejection_teardown_bounded=true");
console.log("declared_oversize_prebuffer_rejected=true");
console.log("streamed_oversize_prebuffer_rejected=true");
console.log("invalid_content_length_rejected=true");
console.log("nonsettling_cancel_bounded=true");
console.log("stalled_body_deadline_retained=true");
console.log("signal_ignoring_body_read_deadline_owned=true");
console.log("body_reader_acquisition_teardown_owned=true");
console.log("fetch_acquisition_deadline_owned=true");
console.log("unresolved_fetch_generation_quarantined=true");
console.log("late_fetch_response_cleanup_owned=true");
console.log("timed_out_body_generation_quarantined=true");
console.log("max_outstanding_body_reads=1");
console.log("body_generation_recovery=true");
console.log("late_response_cancel_generation_quarantined=true");
console.log("output_publication_production_writer=true");
console.log("output_existing_file_not_truncated=true");
console.log("output_symlink_not_followed=true");
console.log("output_descriptor_bound=true");
console.log("output_mode_0600=true");
console.log("http_get_only=true");
console.log("credentials_sent=false");
console.log("wallet_or_signer_access=false");
console.log("transaction_broadcast=false");
console.log("work_credit_mutation=false");
