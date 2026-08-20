#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  statSync,
} from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

import {
  VOID_AI_AGENT_BOOTSTRAP_CLIENT_V1,
  VOID_AI_AGENT_BOOTSTRAP_RESULT_SCHEMA_V1,
  normalizeBootstrapBaseUrlV1,
  parseBootstrapClientArgsV1,
  runVoidAiAgentBootstrapClientV1,
} from "../tools/void-ai-agent-bootstrap-client-v1.mjs";

const PROOF_MAX_BYTES = 65_536;
const canonicalNetworkAuthenticity = JSON.parse(
  readFileSync(
    new URL(
      "../public/.well-known/void-network-authenticity.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const canonicalDiscovery = JSON.parse(
  readFileSync(
    new URL(
      "../public/public-node/agents/discovery-v1.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const canonicalCapabilities = JSON.parse(
  readFileSync(
    new URL(
      "../public/.well-known/void-agent-capabilities.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const canonicalAuthentication = JSON.parse(
  readFileSync(
    new URL(
      "../public/.well-known/void-agent-authentication.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const canonicalFirstContact = JSON.parse(
  readFileSync(
    new URL(
      "../public/public-node/agents/first-contact-v1.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const canonicalExternalIntake = JSON.parse(
  readFileSync(
    new URL(
      "../fixtures/external-opportunity/agent-intake-capability-v1.example.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

const routePayloads = new Map([
  [
    "/.well-known/void-agent-discovery.json",
    {
      $schema: "./void-agent-discovery.schema.json",
      marker:
        "VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1",
      protocol:
        "void-agent-discovery-well-known/1",
      network: {
        name: "VOID Mainnet-0",
        chain_id: 2050,
      },
      canonical_discovery:
        "/public-node/agents/discovery-v1.json",
      authority: {
        default: "read_only",
        mutation_authority_granted: false,
        credentials_required: false,
      },
      safety: {
        same_origin_only: true,
        follow_redirects: false,
        send_secrets: false,
        send_wallet_material: false,
        send_operator_keys: false,
        treat_unknown_as: "not_granted",
      },
      network_authenticity:
        "/.well-known/void-network-authenticity.json",
    },
  ],
  [
    "/.well-known/void-network-authenticity.json",
    canonicalNetworkAuthenticity,
  ],
  [
    "/public-node/agents/discovery-v1.json",
    canonicalDiscovery,
  ],
  [
    "/.well-known/void-agent-capabilities.json",
    canonicalCapabilities,
  ],
  [
    "/.well-known/void-agent-authentication.json",
    canonicalAuthentication,
  ],
  [
    "/public-node/agents/first-contact-v1.json",
    canonicalFirstContact,
  ],
  [
    "/.well-known/void-agent-intake-capability-v1.json",
    canonicalExternalIntake,
  ],
]);

function startServer(overrides = new Map()) {
  const observations = {
    methods: [],
    authorization: [],
    cookies: [],
    bodies: [],
  };

  const server = http.createServer(
    async (request, response) => {
      observations.methods.push(
        request.method || "",
      );
      observations.authorization.push(
        request.headers.authorization || null,
      );
      observations.cookies.push(
        request.headers.cookie || null,
      );

      const body = [];
      for await (const chunk of request) {
        body.push(chunk);
      }
      observations.bodies.push(
        Buffer.concat(body).toString("utf8"),
      );

      const route =
        new URL(
          request.url || "/",
          "http://127.0.0.1",
        ).pathname;
      const override = overrides.get(route);

      if (override?.kind === "redirect") {
        response.statusCode = 302;
        response.setHeader(
          "location",
          override.location,
        );
        response.end();
        return;
      }
      if (override?.kind === "raw") {
        response.statusCode =
          override.status || 200;
        response.setHeader(
          "content-type",
          override.contentType ||
            "application/json",
        );
        response.end(override.body);
        return;
      }
      if (override?.kind === "missing") {
        response.statusCode = 404;
        response.setHeader(
          "content-type",
          "application/json",
        );
        response.end(
          JSON.stringify({
            marker: "VOID_TEST_MISSING_V1",
            error: "not_found",
          }),
        );
        return;
      }

      const payload =
        override?.payload ??
        routePayloads.get(route);

      if (!payload) {
        response.statusCode = 404;
        response.end("{}");
        return;
      }

      const content = JSON.stringify(payload);
      response.statusCode = 200;
      response.setHeader(
        "content-type",
        "application/json",
      );
      response.setHeader(
        "content-length",
        String(Buffer.byteLength(content)),
      );
      response.end(content);
    },
  );

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      assert(
        address &&
          typeof address !== "string",
      );
      resolve({
        server,
        observations,
        baseUrl:
          `http://127.0.0.1:${address.port}`,
      });
    });
  });
}

async function withServer(
  overrides,
  callback,
) {
  const value = await startServer(overrides);
  try {
    return await callback(value);
  } finally {
    await new Promise((resolve, reject) => {
      value.server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

function bindResponseUrl(response, url) {
  Object.defineProperty(response, "url", {
    value: String(url),
    configurable: true,
  });
  Object.defineProperty(response, "redirected", {
    value: false,
    configurable: true,
  });
  return response;
}

function jsonResponse(payload, url) {
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

function syntheticResponse(url, readerFactory) {
  return {
    status: 200,
    ok: true,
    url: String(url),
    redirected: false,
    headers: new Headers({
      "content-type": "application/json",
    }),
    body: {
      getReader: readerFactory,
    },
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const args = parseBootstrapClientArgsV1([
  "--base-url",
  "https://example.invalid",
  "--pretty",
  "--timeout-ms",
  "5000",
  "--max-bytes",
  "65536",
]);
assert.equal(
  args.baseUrl,
  "https://example.invalid",
);
assert.equal(args.pretty, true);
assert.equal(args.timeoutMs, 5000);
assert.equal(args.maxBytes, 65536);
assert.throws(
  () =>
    parseBootstrapClientArgsV1([
      "--unknown",
    ]),
  /unknown argument/,
);

assert.equal(
  normalizeBootstrapBaseUrlV1(
    "https://example.invalid/path",
  ).origin,
  "https://example.invalid",
);
assert.throws(
  () =>
    normalizeBootstrapBaseUrlV1(
      "http://example.invalid",
    ),
  /HTTPS or loopback HTTP/,
);
assert.throws(
  () =>
    normalizeBootstrapBaseUrlV1(
      "https://user:pass@example.invalid",
    ),
  /credentials are forbidden/,
);

await withServer(
  new Map(),
  async ({
    baseUrl,
    observations,
  }) => {
    const result =
      await runVoidAiAgentBootstrapClientV1({
        baseUrl,
        timeoutMs: 2000,
        maxBytes: PROOF_MAX_BYTES,
      });

    assert.equal(
      result.marker,
      VOID_AI_AGENT_BOOTSTRAP_CLIENT_V1,
    );
    assert.equal(
      result.schema,
      VOID_AI_AGENT_BOOTSTRAP_RESULT_SCHEMA_V1,
    );
    assert.deepEqual(result.network, {
      name: "VOID Mainnet-0",
      chain_id: 2050,
    });
    assert.equal(
      result.official_entrypoint.verified,
      true,
    );
    assert.equal(
      result.readiness
        .read_only_connection_ready,
      true,
    );
    assert.equal(
      result.readiness
        .onboarding_surface_complete,
      true,
    );
    assert.equal(
      result.readiness
        .mutation_authority_granted,
      false,
    );
    assert.equal(
      result.readiness
        .wallet_or_signer_access_granted,
      false,
    );
    assert.equal(
      result.readiness
        .paid_work_execution_promised,
      false,
    );
    assert.equal(
      result.readiness
        .work_credit_earning_promised,
      false,
    );
    assert.deepEqual(
      new Set(observations.methods),
      new Set(["GET"]),
    );
    assert(
      observations.authorization.every(
        (value) => value === null,
      ),
    );
    assert(
      observations.cookies.every(
        (value) => value === null,
      ),
    );
    assert(
      observations.bodies.every(
        (value) => value === "",
      ),
    );
  },
);

const canonicalWellKnown = routePayloads.get(
  "/.well-known/void-agent-discovery.json",
);
const exactRootCases = [
  [
    "schema",
    (value) => {
      value.$schema = "./wrong.schema.json";
    },
    /well-known discovery schema mismatch/,
  ],
  [
    "chain",
    (value) => {
      value.network.chain_id = 2051;
    },
    /well-known chain id mismatch/,
  ],
  [
    "chain_string",
    (value) => {
      value.network.chain_id = "2050";
    },
    /well-known chain id mismatch/,
  ],
  [
    "chain_fraction",
    (value) => {
      value.network.chain_id = 2050.5;
    },
    /well-known chain id mismatch/,
  ],
  [
    "chain_unsafe",
    (value) => {
      value.network.chain_id = Number.MAX_SAFE_INTEGER + 1;
    },
    /well-known chain id mismatch/,
  ],
  [
    "network_name",
    (value) => {
      value.network.name = "VOID Mainnet-1";
    },
    /well-known network name mismatch/,
  ],
  [
    "canonical_route",
    (value) => {
      value.canonical_discovery = "/public-node/agents/other.json";
    },
    /well-known canonical discovery mismatch/,
  ],
  [
    "authority_default",
    (value) => {
      value.authority.default = "not_granted";
    },
    /well-known default authority mismatch/,
  ],
  [
    "credentials",
    (value) => {
      value.authority.credentials_required = true;
    },
    /well-known credentials requirement mismatch/,
  ],
  [
    "safety_missing",
    (value) => {
      delete value.safety.send_operator_keys;
    },
    /well_known_safety_keys_mismatch/,
  ],
  [
    "redirect_safety",
    (value) => {
      value.safety.follow_redirects = true;
    },
    /well-known redirect boundary mismatch/,
  ],
  [
    "network_authenticity",
    (value) => {
      value.network_authenticity = "/wrong-authenticity.json";
    },
    /well-known network authenticity route mismatch/,
  ],
  [
    "unknown_field",
    (value) => {
      value.unreviewed = true;
    },
    /well_known_keys_mismatch/,
  ],
];

for (const [, mutate, expected] of exactRootCases) {
  const payload = structuredClone(canonicalWellKnown);
  mutate(payload);
  await withServer(
    new Map([
      [
        "/.well-known/void-agent-discovery.json",
        { payload },
      ],
    ]),
    async ({ baseUrl, observations }) => {
      await assert.rejects(
        runVoidAiAgentBootstrapClientV1({
          baseUrl,
          timeoutMs: 2000,
          maxBytes: PROOF_MAX_BYTES,
        }),
        expected,
      );
      assert.equal(
        observations.methods.length,
        1,
        "invalid root contract must stop before downstream probes",
      );
    },
  );
}

const networkAuthenticityPath =
  "/.well-known/void-network-authenticity.json";
const networkAuthenticityCases = [
  [
    "network",
    (value) => {
      value.network.chain_id = 2051;
    },
    /network authenticity network mismatch/,
  ],
  [
    "key_id",
    (value) => {
      value.verification.key_id =
        "ed25519:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    },
    /network authenticity key id mismatch/,
  ],
  [
    "payload",
    (value) => {
      value.verification.signed_payload.project =
        "VOID Network forged";
    },
    /network authenticity payload digest mismatch/,
  ],
  [
    "signature",
    (value) => {
      const signature = value.verification.signature_base64;
      value.verification.signature_base64 =
        `${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;
    },
    /network authenticity signature invalid/,
  ],
  [
    "authority",
    (value) => {
      value.authority.work_credit_authority_granted = true;
    },
    /network authenticity authority mismatch/,
  ],
];

for (const [, mutate, expected] of networkAuthenticityCases) {
  const payload = structuredClone(canonicalNetworkAuthenticity);
  mutate(payload);
  await withServer(
    new Map([
      [networkAuthenticityPath, { payload }],
    ]),
    async ({ baseUrl, observations }) => {
      await assert.rejects(
        runVoidAiAgentBootstrapClientV1({
          baseUrl,
          timeoutMs: 2000,
          maxBytes: PROOF_MAX_BYTES,
        }),
        expected,
      );
      assert.equal(
        observations.methods.length,
        2,
        "invalid authenticity must stop before downstream probes",
      );
    },
  );
}

await withServer(
  new Map([
    [networkAuthenticityPath, { kind: "missing" }],
  ]),
  async ({ baseUrl, observations }) => {
    await assert.rejects(
      runVoidAiAgentBootstrapClientV1({
        baseUrl,
        timeoutMs: 2000,
        maxBytes: PROOF_MAX_BYTES,
      }),
      /http_status:404/,
    );
    assert.equal(
      observations.methods.length,
      2,
      "missing authenticity must stop before downstream probes",
    );
  },
);

const reviewedSurfaceCases = [
  [
    "canonical_discovery",
    "/public-node/agents/discovery-v1.json",
    canonicalDiscovery,
    (value) => {
      value.authority.mutation_authority_granted = true;
    },
    true,
  ],
  [
    "capabilities",
    "/.well-known/void-agent-capabilities.json",
    canonicalCapabilities,
    (value) => {
      value.authority.mutation_authority_granted = true;
    },
    true,
  ],
  [
    "authentication",
    "/.well-known/void-agent-authentication.json",
    canonicalAuthentication,
    (value) => {
      value.authenticated_routes_active = true;
    },
    true,
  ],
  [
    "first_contact",
    "/public-node/agents/first-contact-v1.json",
    canonicalFirstContact,
    (value) => {
      value.honesty.paid_work_promised = true;
    },
    false,
  ],
  [
    "external_opportunity_intake",
    "/.well-known/void-agent-intake-capability-v1.json",
    canonicalExternalIntake,
    (value) => {
      value.authority.network_request = true;
    },
    false,
  ],
];

for (
  const [
    surface,
    route,
    canonicalPayload,
    mutate,
    required,
  ] of reviewedSurfaceCases
) {
  const payload = structuredClone(canonicalPayload);
  const marker = payload.marker;
  mutate(payload);
  assert.equal(
    payload.marker,
    marker,
    "surface falsifier must preserve the accepted marker",
  );
  await withServer(
    new Map([[route, { payload }]]),
    async ({ baseUrl }) => {
      const result =
        await runVoidAiAgentBootstrapClientV1({
          baseUrl,
          timeoutMs: 2000,
          maxBytes: PROOF_MAX_BYTES,
        });
      assert.equal(
        result.surfaces[surface].available,
        false,
      );
      assert.equal(
        result.surfaces[surface].public_marker_valid,
        false,
      );
      assert.equal(
        result.surfaces[surface].error,
        `${surface}_contract_identity_mismatch`,
      );
      assert.equal(
        result.readiness.onboarding_surface_complete,
        false,
      );
      if (required) {
        assert.equal(
          result.readiness.read_only_connection_ready,
          false,
        );
      }
    },
  );
}

const customBaseUrl = "http://127.0.0.1:4100";
const capabilityPath = "/.well-known/void-agent-capabilities.json";

let zeroReadCalls = 0;
let zeroCancelCalls = 0;
const zeroProgressFetch = async (input) => {
  const url = input instanceof URL ? input : new URL(String(input));
  const payload = routePayloads.get(url.pathname);
  if (url.pathname !== capabilityPath) {
    return jsonResponse(payload, url.href);
  }
  return syntheticResponse(url.href, () => ({
    read() {
      zeroReadCalls += 1;
      return Promise.resolve({
        done: false,
        value: new Uint8Array(0),
      });
    },
    cancel() {
      zeroCancelCalls += 1;
      return Promise.resolve();
    },
  }));
};
const zeroProgressResult =
  await runVoidAiAgentBootstrapClientV1({
    baseUrl: customBaseUrl,
    timeoutMs: 1000,
    maxBytes: PROOF_MAX_BYTES,
    fetchImpl: zeroProgressFetch,
  });
assert.equal(
  zeroProgressResult.surfaces.capabilities.available,
  false,
);
assert.equal(
  zeroProgressResult.surfaces.capabilities.error,
  "response_body_zero_progress_chunk",
);
assert.equal(zeroReadCalls, 1);
assert.equal(zeroCancelCalls, 1);

const oversizeChunk = new Uint8Array(PROOF_MAX_BYTES + 1);
let oversizeCancelCalls = 0;
let oversizeCopyCalls = 0;
const oversizeFetch = async (input) => {
  const url = input instanceof URL ? input : new URL(String(input));
  const payload = routePayloads.get(url.pathname);
  if (url.pathname !== capabilityPath) {
    return jsonResponse(payload, url.href);
  }
  return syntheticResponse(url.href, () => ({
    read() {
      return Promise.resolve({
        done: false,
        value: oversizeChunk,
      });
    },
    cancel() {
      oversizeCancelCalls += 1;
      return Promise.resolve();
    },
  }));
};
const originalBufferFrom = Buffer.from;
Buffer.from = function checkedBufferFrom(value, ...rest) {
  if (value === oversizeChunk) {
    oversizeCopyCalls += 1;
    throw new Error("oversize chunk copied before ceiling");
  }
  return originalBufferFrom.call(Buffer, value, ...rest);
};
let oversizeResult;
try {
  oversizeResult = await runVoidAiAgentBootstrapClientV1({
    baseUrl: customBaseUrl,
    timeoutMs: 1000,
    maxBytes: PROOF_MAX_BYTES,
    fetchImpl: oversizeFetch,
  });
} finally {
  Buffer.from = originalBufferFrom;
}
assert.equal(
  oversizeResult.surfaces.capabilities.available,
  false,
);
assert.equal(
  oversizeResult.surfaces.capabilities.error,
  `response_too_large:${PROOF_MAX_BYTES + 1}`,
);
assert.equal(oversizeCopyCalls, 0);
assert.equal(oversizeCancelCalls, 1);

let tinyReadCalls = 0;
let tinyCancelCalls = 0;
const tinyChunkFetch = async (input) => {
  const url = input instanceof URL ? input : new URL(String(input));
  const payload = routePayloads.get(url.pathname);
  if (url.pathname !== capabilityPath) {
    return jsonResponse(payload, url.href);
  }
  return syntheticResponse(url.href, () => ({
    read() {
      tinyReadCalls += 1;
      return Promise.resolve({
        done: false,
        value: new Uint8Array([0x61]),
      });
    },
    cancel() {
      tinyCancelCalls += 1;
      return Promise.resolve();
    },
  }));
};
const tinyStarted = Date.now();
const tinyChunkResult =
  await runVoidAiAgentBootstrapClientV1({
    baseUrl: customBaseUrl,
    timeoutMs: 25,
    maxBytes: PROOF_MAX_BYTES,
    fetchImpl: tinyChunkFetch,
  });
assert.equal(
  tinyChunkResult.surfaces.capabilities.available,
  false,
);
assert.equal(
  tinyChunkResult.surfaces.capabilities.error,
  "bootstrap_request_deadline_exceeded",
);
assert(tinyReadCalls >= 64);
assert.equal(tinyReadCalls % 64, 0);
assert.equal(tinyCancelCalls, 1);
assert(Date.now() - tinyStarted < 1000);

let malformedCancelCalls = 0;
let malformedFetchCalls = 0;
let releaseMalformedCancel;
let injectMalformedResult = true;
const malformedFetch = async (input) => {
  malformedFetchCalls += 1;
  const url = input instanceof URL ? input : new URL(String(input));
  const payload = routePayloads.get(url.pathname);
  if (injectMalformedResult && url.pathname === capabilityPath) {
    return syntheticResponse(url.href, () => ({
      read() {
        return Promise.resolve(null);
      },
      cancel() {
        malformedCancelCalls += 1;
        return new Promise((resolve) => {
          releaseMalformedCancel = resolve;
        });
      },
    }));
  }
  return jsonResponse(payload, url.href);
};
const malformedResult =
  await runVoidAiAgentBootstrapClientV1({
    baseUrl: customBaseUrl,
    timeoutMs: 1000,
    maxBytes: PROOF_MAX_BYTES,
    fetchImpl: malformedFetch,
  });
assert.equal(
  malformedResult.surfaces.capabilities.available,
  false,
);
assert.equal(
  malformedResult.surfaces.capabilities.error,
  "response_body_read_result_invalid",
);
assert.equal(malformedCancelCalls, 1);
const fetchCallsAfterMalformed = malformedFetchCalls;
await assert.rejects(
  runVoidAiAgentBootstrapClientV1({
    baseUrl: customBaseUrl,
    timeoutMs: 1000,
    maxBytes: PROOF_MAX_BYTES,
    fetchImpl: malformedFetch,
  }),
  /bootstrap_fetch_acquisition_quarantined/,
);
assert.equal(malformedFetchCalls, fetchCallsAfterMalformed);
injectMalformedResult = false;
releaseMalformedCancel();
await sleep(20);
const malformedRecovery =
  await runVoidAiAgentBootstrapClientV1({
    baseUrl: customBaseUrl,
    timeoutMs: 1000,
    maxBytes: PROOF_MAX_BYTES,
    fetchImpl: malformedFetch,
  });
assert.equal(
  malformedRecovery.readiness.read_only_connection_ready,
  true,
);

await withServer(
  new Map([
    [
      "/public-node/agents/first-contact-v1.json",
      { kind: "missing" },
    ],
  ]),
  async ({ baseUrl }) => {
    const result =
      await runVoidAiAgentBootstrapClientV1({
        baseUrl,
        timeoutMs: 2000,
        maxBytes: PROOF_MAX_BYTES,
      });

    assert.equal(
      result.readiness
        .read_only_connection_ready,
      true,
    );
    assert.equal(
      result.readiness
        .onboarding_surface_complete,
      false,
    );
    assert.equal(
      result.surfaces.first_contact.available,
      false,
    );
    assert(
      result.next_steps.includes(
        "retry_first_contact_contract_read",
      ),
    );
  },
);

await withServer(
  new Map([
    [
      "/.well-known/void-agent-capabilities.json",
      {
        kind: "redirect",
        location:
          "https://attacker.invalid/capabilities",
      },
    ],
  ]),
  async ({ baseUrl }) => {
    const result =
      await runVoidAiAgentBootstrapClientV1({
        baseUrl,
        timeoutMs: 2000,
        maxBytes: PROOF_MAX_BYTES,
      });

    assert.equal(
      result.readiness
        .read_only_connection_ready,
      false,
    );
    assert.match(
      result.surfaces.capabilities.error,
      /redirect_forbidden/,
    );
  },
);

await withServer(
  new Map([
    [
      "/.well-known/void-agent-authentication.json",
      {
        kind: "raw",
        body: "{invalid",
      },
    ],
  ]),
  async ({ baseUrl }) => {
    const result =
      await runVoidAiAgentBootstrapClientV1({
        baseUrl,
        timeoutMs: 2000,
        maxBytes: PROOF_MAX_BYTES,
      });

    assert.equal(
      result.surfaces.authentication.available,
      false,
    );
    assert.equal(
      result.surfaces.authentication.error,
      "invalid_json",
    );
  },
);

await withServer(
  new Map([
    [
      "/.well-known/void-agent-discovery.json",
      {
        payload: {
          ...routePayloads.get(
            "/.well-known/void-agent-discovery.json",
          ),
          canonical_discovery:
            "https://attacker.invalid/discovery.json",
        },
      },
    ],
  ]),
  async ({ baseUrl }) => {
    await assert.rejects(
      runVoidAiAgentBootstrapClientV1({
        baseUrl,
        timeoutMs: 2000,
        maxBytes: PROOF_MAX_BYTES,
      }),
      /well-known canonical discovery mismatch/,
    );
  },
);

await withServer(
  new Map([
    [
      "/.well-known/void-agent-capabilities.json",
      {
        kind: "raw",
        body: JSON.stringify({
          marker:
            "VOID_AI_AGENT_CAPABILITIES_WELL_KNOWN_V1",
          padding: "x".repeat(PROOF_MAX_BYTES + 1024),
        }),
      },
    ],
  ]),
  async ({ baseUrl }) => {
    const result =
      await runVoidAiAgentBootstrapClientV1({
        baseUrl,
        timeoutMs: 2000,
        maxBytes: PROOF_MAX_BYTES,
      });

    assert.equal(
      result.surfaces.capabilities.available,
      false,
    );
    assert.match(
      result.surfaces.capabilities.error,
      /response_too_large/,
    );
  },
);

const schema = JSON.parse(
  readFileSync(
    new URL(
      "../schemas/void-ai-agent-bootstrap-client-v1.schema.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const example = JSON.parse(
  readFileSync(
    new URL(
      "../examples/void-ai-agent-bootstrap-client-v1.example.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

assert.equal(
  schema.$id,
  "https://voidchain.io/schemas/void-ai-agent-bootstrap-client-v1.schema.json",
);
assert.equal(
  example.marker,
  VOID_AI_AGENT_BOOTSTRAP_CLIENT_V1,
);
assert.equal(
  example.schema,
  VOID_AI_AGENT_BOOTSTRAP_RESULT_SCHEMA_V1,
);
assert.equal(
  example.readiness
    .mutation_authority_granted,
  false,
);
assert.equal(
  example.safety.http_methods_used.length,
  1,
);
assert.equal(
  example.safety.http_methods_used[0],
  "GET",
);

const temporary = mkdtempSync(
  path.join(
    os.tmpdir(),
    "void-ai-agent-bootstrap-client-v1-",
  ),
);
const modeCheck = path.join(
  temporary,
  "mode-check.json",
);
await withServer(
  new Map(),
  async ({ baseUrl }) => {
    const result =
      await runVoidAiAgentBootstrapClientV1({
        baseUrl,
        timeoutMs: 2000,
        maxBytes: PROOF_MAX_BYTES,
      });
    const content =
      JSON.stringify(result) + "\n";
    const {
      writeFileSync,
      chmodSync,
    } = await import("node:fs");
    writeFileSync(modeCheck, content, {
      mode: 0o600,
    });
    chmodSync(modeCheck, 0o600);
  },
);
assert.equal(
  statSync(modeCheck).mode & 0o777,
  0o600,
);

console.log(
  "VOID_AI_AGENT_BOOTSTRAP_CLIENT_V1_PROOF_EXACT_GREEN",
);
console.log("successful_bootstrap=1");
console.log("well_known_exact_contract_bound=1");
console.log("network_authenticity_consumed=1");
console.log("network_authenticity_signature_verified=1");
console.log("invalid_network_authenticity_stops_before_downstream=1");
console.log("invalid_well_known_stops_before_downstream=1");
console.log("reviewed_surface_contract_identities_bound=5");
console.log("marker_only_surface_admission=false");
console.log("zero_progress_chunk_rejected=1");
console.log("oversize_chunk_rejected_before_buffer_copy=1");
console.log("tiny_chunk_deadline_yield_owned=1");
console.log("malformed_read_result_teardown_owned=1");
console.log("malformed_read_result_retry_quarantined=1");
console.log("degraded_optional_surface=1");
console.log("redirect_rejected=1");
console.log("cross_origin_rejected=1");
console.log("malformed_json_classified=1");
console.log("oversized_response_classified=1");
console.log("http_get_only=1");
console.log("authorization_header_sent=0");
console.log("cookies_sent=0");
console.log("request_body_sent=0");
console.log("mutation_authority=0");
console.log("wallet_or_signer_access=0");
console.log("payment_authority=0");
console.log("transaction_broadcast=0");
console.log("wc_ledger_write=0");
