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
    "/public-node/agents/discovery-v1.json",
    {
      marker: "VOID_AI_AGENT_DISCOVERY_V1",
      status: "available",
    },
  ],
  [
    "/.well-known/void-agent-capabilities.json",
    {
      marker:
        "VOID_AI_AGENT_CAPABILITIES_WELL_KNOWN_V1",
      status: "available",
    },
  ],
  [
    "/.well-known/void-agent-authentication.json",
    {
      marker:
        "VOID_AI_AGENT_AUTHENTICATION_WELL_KNOWN_V1",
      status: "available",
    },
  ],
  [
    "/public-node/agents/first-contact-v1.json",
    {
      marker: "VOID_AI_AGENT_FIRST_CONTACT_V1",
      connection_mode: "read_only",
    },
  ],
  [
    "/.well-known/void-agent-intake-capability-v1.json",
    {
      marker:
        "VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_V1",
      status: "available",
    },
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
        maxBytes: 65536,
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
          maxBytes: 65536,
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
        maxBytes: 65536,
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
        maxBytes: 65536,
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
        maxBytes: 65536,
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
        maxBytes: 65536,
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
          padding: "x".repeat(2048),
        }),
      },
    ],
  ]),
  async ({ baseUrl }) => {
    const result =
      await runVoidAiAgentBootstrapClientV1({
        baseUrl,
        timeoutMs: 2000,
        maxBytes: 1024,
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
        maxBytes: 65536,
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
console.log("invalid_well_known_stops_before_downstream=1");
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
