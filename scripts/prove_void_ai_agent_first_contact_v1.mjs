#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";

const ROOT = process.cwd();
const ORIGINAL_BOUNDARY = [
  ".github/workflows/void-ai-agent-first-contact-v1.yml",
  "docs/public/ai-agent-first-contact-v1.md",
  "public/public-node/agents/first-contact-v1.json",
  "public/public-node/agents/join-v1.html",
  "scripts/prove_void_ai_agent_first_contact_v1.mjs",
  "tools/void-ai-agent-first-contact-v1.mjs"
];
const COMPOSITION_BOUNDARY = [
  ".github/workflows/void-ai-agent-first-contact-v1.yml",
  ".github/workflows/void-ai-agent-public-utility-v1.yml",
  "config/void-tor-agent-discovery-parity-v1.json",
  "docs/public/ai-agent-first-contact-v1.md",
  "docs/public/ai-agent-public-utility-v1.md",
  "public/public-node/agents/first-contact-v1.json",
  "public/public-node/agents/public-utility-v1.json",
  "scripts/prove_void_ai_agent_first_contact_v1.mjs",
  "scripts/prove_void_ai_agent_first_contact_runtime_control_flow_repair_v1.mjs",
  "scripts/prove_void_ai_agent_first_contact_runtime_v1.mjs",
  "scripts/prove_void_ai_agent_public_utility_v1.mjs",
  "tools/void-ai-agent-first-contact-v1.mjs",
];
const NETWORK_BINDING_REPAIR_BOUNDARY = [
  "docs/public/ai-agent-first-contact-v1.md",
  "scripts/prove_void_ai_agent_first_contact_v1.mjs",
  "tools/void-ai-agent-first-contact-v1.mjs",
];
const COMPOSITION_PROOF_REPAIR_BOUNDARY = [
  "scripts/prove_void_ai_agent_first_contact_v1.mjs",
];
const PUBLIC_UTILITY_RESOURCE_OBSERVATION_REPAIR_BOUNDARY = [
  "docs/public/ai-agent-first-contact-v1.md",
  "docs/public/ai-agent-public-utility-v1.md",
  "public/public-node/agents/public-utility-v1.json",
  "scripts/prove_void_ai_agent_first_contact_v1.mjs",
  "scripts/prove_void_ai_agent_public_utility_v1.mjs",
  "tools/void-ai-agent-first-contact-v1.mjs",
];
const POST_MERGE_CONTRACT_INTEGRITY_REPAIR_BOUNDARY = [
  "public/public-node/agents/first-contact-v1.json",
  "scripts/prove_void_ai_agent_first_contact_v1.mjs",
  "scripts/prove_void_ai_agent_first_contact_runtime_control_flow_repair_v1.mjs",
  "scripts/prove_void_ai_agent_first_contact_runtime_v1.mjs",
  "scripts/prove_void_ai_agent_public_utility_v1.mjs",
  "tools/void-ai-agent-first-contact-v1.mjs",
];
const FIRST_CONTACT_MANIFEST_INTEGRITY_REPAIR_BOUNDARY = [
  "public/public-node/agents/first-contact-v1.json",
  "scripts/prove_void_ai_agent_first_contact_v1.mjs",
  "scripts/prove_void_ai_agent_first_contact_runtime_control_flow_repair_v1.mjs",
  "scripts/prove_void_ai_agent_first_contact_runtime_v1.mjs",
  "tools/void-ai-agent-first-contact-v1.mjs",
];
const PUBLIC_UTILITY_PROVENANCE_BOUNDARY = [
  "public/public-node/agents/public-utility-v1.json",
  "scripts/prove_void_ai_agent_first_contact_v1.mjs",
  "scripts/prove_void_ai_agent_public_utility_v1.mjs",
  "tools/void-ai-agent-first-contact-v1.mjs",
];
const PUBLIC_UTILITY_CANONICALIZATION_BOUNDARY = [
  "scripts/prove_void_ai_agent_first_contact_v1.mjs",
  "tools/void-ai-agent-first-contact-v1.mjs",
];
const ALLOWED_BOUNDARY = [
  ...new Set([...ORIGINAL_BOUNDARY, ...COMPOSITION_BOUNDARY]),
];
const AUTHENTICITY_ROUTE = "/.well-known/void-network-authenticity.json";
const MANIFEST_PATH = join(
  ROOT,
  "public/public-node/agents/first-contact-v1.json",
);
const JOIN_PATH = join(
  ROOT,
  "public/public-node/agents/join-v1.html",
);
const CLIENT_PATH = join(
  ROOT,
  "tools/void-ai-agent-first-contact-v1.mjs",
);
const PUBLIC_UTILITY_PATH = join(
  ROOT,
  "public/public-node/agents/public-utility-v1.json",
);

const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
const publicUtility = JSON.parse(
  await readFile(PUBLIC_UTILITY_PATH, "utf8"),
);
const capabilitiesCatalog = JSON.parse(
  await readFile(
    join(ROOT, "public/public-node/agents/capabilities-v1.json"),
    "utf8",
  ),
);
const agentIntakeCapability = JSON.parse(
  await readFile(
    join(
      ROOT,
      "fixtures/external-opportunity/agent-intake-capability-v1.example.json",
    ),
    "utf8",
  ),
);

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function intakeFingerprint(value) {
  const { manifest_fingerprint_sha256: _ignored, ...withoutFingerprint } =
    value;
  return createHash("sha256")
    .update(canonicalJson(withoutFingerprint), "utf8")
    .digest("hex");
}

function canonicalSha256(value) {
  return createHash("sha256")
    .update(canonicalJson(value), "utf8")
    .digest("hex");
}

const REVIEWED_FIRST_CONTACT_MANIFEST_FINGERPRINT_SHA256 =
  "ed56951c1bc043911ede167dc2cddbab38af62f069d07638dc1825d7e936f413";
const REVIEWED_PUBLIC_UTILITY_CATALOG_SHA256 =
  "b67fe641d7ccebdb3e4626245b2895d75dd640789d29aca2544855f3d646daa2";
const COLD_START_CURL_COMMAND =
  "test -n \"$VOID_PUBLIC_ORIGIN\" && curl --disable --noproxy '*' --disallow-username-in-url --proto '=https' --max-redirs 0 --fail --silent --show-error --max-time 8 --max-filesize 65536 --header 'Accept: application/json' \"${VOID_PUBLIC_ORIGIN%/}/public-node/agents/first-contact-v1.json\"";

assert.equal(
  intakeFingerprint(manifest),
  REVIEWED_FIRST_CONTACT_MANIFEST_FINGERPRINT_SHA256,
);
assert.equal(
  manifest.manifest_fingerprint_sha256,
  REVIEWED_FIRST_CONTACT_MANIFEST_FINGERPRINT_SHA256,
);

assert.equal(
  intakeFingerprint(agentIntakeCapability),
  agentIntakeCapability.manifest_fingerprint_sha256,
);
const datanetReceipt = JSON.parse(
  await readFile(
    join(
      ROOT,
      "public/public-node/datanet/field-replication-status-card-v1.json",
    ),
    "utf8",
  ),
);
assert.equal(
  canonicalSha256(publicUtility),
  REVIEWED_PUBLIC_UTILITY_CATALOG_SHA256,
);
for (const entry of publicUtility.entries) {
  assert.match(entry.canonical_sha256, /^[0-9a-f]{64}$/);
  const source = JSON.parse(
    await readFile(join(ROOT, entry.repository_path), "utf8"),
  );
  assert.equal(canonicalSha256(source), entry.canonical_sha256);
}
assert.equal(manifest.marker, "VOID_AI_AGENT_FIRST_CONTACT_V1");
assert.equal(manifest.protocol, "void-ai-agent-first-contact");
assert.equal(manifest.version, "1");
assert.equal(manifest.status, "public_read_only");
assert.equal(manifest.network.name, "VOID Mainnet-0");
assert.equal(manifest.network.chain_id, 2050);
assert.equal(manifest.connection_mode, "read_only");
assert.equal(manifest.entrypoints.official_authenticity, AUTHENTICITY_ROUTE);
assert.equal(
  manifest.entrypoints.public_utility,
  "/public-node/agents/public-utility-v1.json",
);
assert.equal(
  manifest.verification.required_checks.includes(
    "public_utility_catalog_loaded",
  ),
  true,
);
assert.equal(
  manifest.verification.required_checks.includes(
    "public_utility_resources_observed",
  ),
  true,
);
assert.equal(manifest.honesty.paid_work_promised, false);
assert.equal(manifest.honesty.work_credit_earning_promised, false);
assert.equal(manifest.honesty.mutation_authority_granted, false);
assert.deepEqual(manifest.client.http_methods, ["GET"]);
assert.equal(manifest.client.cold_start_curl_command, COLD_START_CURL_COMMAND);
assert.equal(
  COLD_START_CURL_COMMAND.includes(
    "&& curl --disable --noproxy '*' --disallow-username-in-url --proto '=https'",
  ),
  true,
  "curl must disable ambient config, proxy routing, and URL userinfo before transport options",
);
assert.equal(
  COLD_START_CURL_COMMAND.split("--noproxy '*'").length - 1,
  1,
  "cold start must bypass every ambient proxy exactly once",
);
assert.equal(
  COLD_START_CURL_COMMAND.split("--disallow-username-in-url").length - 1,
  1,
  "cold start must reject URL-embedded credentials exactly once",
);
assert.doesNotMatch(
  COLD_START_CURL_COMMAND,
  /(?:^|\s)--config(?:\s|=|$)/,
  "cold start must not load an explicit curl config",
);

const clientSource = await readFile(CLIENT_PATH, "utf8");
for (const forbidden of [
  'method: "POST"',
  'method: "PUT"',
  'method: "PATCH"',
  'method: "DELETE"',
  "writeFile",
  "appendFile",
  "createWriteStream",
  "privateKey",
]) {
  assert.equal(
    clientSource.includes(forbidden),
    false,
    `client contains forbidden token: ${forbidden}`,
  );
}

const joinHtml = await readFile(JOIN_PATH, "utf8");
for (const required of [
  "VOID AI Agent First Contact",
  manifest.entrypoints.first_contact,
  manifest.entrypoints.well_known_discovery,
  manifest.entrypoints.authentication,
  manifest.entrypoints.capabilities,
  manifest.entrypoints.agent_intake,
]) {
  assert.equal(
    joinHtml.includes(required),
    true,
    `join page missing: ${required}`,
  );
}
assert.equal(
  /<script|<img|<link[^>]+href=["']https?:/i.test(joinHtml),
  false,
  "join page must not load active external resources",
);

const fixtures = new Map([
  [manifest.entrypoints.first_contact, manifest],
  [manifest.entrypoints.public_utility, publicUtility],
  [
    manifest.entrypoints.well_known_discovery,
    {
      marker: "VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1",
      protocol: "void-agent-discovery-well-known/1",
      network: {
        name: "VOID Mainnet-0",
        chain_id: 2050,
      },
      canonical_discovery: "/public-node/agents/discovery-v1.json",
      network_authenticity:
        manifest.entrypoints.official_authenticity,
      authority: {
        default: "read_only",
        mutation_authority_granted: false,
        credentials_required: false,
      },
      safety: {
        same_origin_only: true,
        follow_redirects: false,
      },
    },
  ],
  [
    manifest.entrypoints.official_authenticity,
    {
      marker: "VOID_OFFICIAL_NETWORK_AUTHENTICITY_WELL_KNOWN_V1",
      protocol: "void-network-authenticity/1",
      status: "public_verification_available",
      network: {
        name: "VOID Mainnet-0",
        chain_id: 2050,
      },
      authority: {
        verification_only: true,
        mutation_authority_granted: false,
        runtime_authority_granted: false,
        economic_authority_granted: false,
      },
      safety: {
        credentials_required: false,
        follow_redirects: false,
      },
    },
  ],
  [
    manifest.entrypoints.authentication,
    {
      marker: "VOID_AI_AGENT_AUTHENTICATION_WELL_KNOWN_V1",
      protocol: "void-agent-authentication-well-known/1",
      contract_published: true,
      canonical_authentication_contract:
        "/public-node/agents/authentication-v1.json",
      network: {
        name: "VOID Mainnet-0",
        chain_id: 2050,
      },
      authenticated_routes_active: false,
      verifier_runtime_active: false,
      mutation_authority_granted: false,
      safety: {
        same_origin_only: true,
        follow_redirects: false,
        send_credentials_now: false,
        send_signed_envelopes_now: false,
        treat_unknown_as: "not_granted",
      },
    },
  ],
  [manifest.entrypoints.capabilities, capabilitiesCatalog],
  [publicUtility.entries[2].path, datanetReceipt],
  [manifest.entrypoints.agent_intake, agentIntakeCapability],
]);

const OPEN_SCHEMA_FIRST_CONTACT_PATH =
  "/public-node/agents/first-contact-open-schema-v1.json";
fixtures.set(OPEN_SCHEMA_FIRST_CONTACT_PATH, {
  ...manifest,
  unreviewed_extension: true,
});

const ELEVATED_FIRST_CONTACT_PATH =
  "/public-node/agents/first-contact-elevated-authority-v1.json";
fixtures.set(ELEVATED_FIRST_CONTACT_PATH, {
  ...manifest,
  honesty: {
    ...manifest.honesty,
    mutation_authority_granted: true,
  },
});

const RECOMPUTED_FORGED_FIRST_CONTACT_PATH =
  "/public-node/agents/first-contact-recomputed-forgery-v1.json";
const recomputedForgedFirstContact = {
  ...manifest,
  purpose: "Unreviewed replacement First Contact policy.",
};
recomputedForgedFirstContact.manifest_fingerprint_sha256 =
  intakeFingerprint(recomputedForgedFirstContact);
assert.notEqual(
  recomputedForgedFirstContact.manifest_fingerprint_sha256,
  REVIEWED_FIRST_CONTACT_MANIFEST_FINGERPRINT_SHA256,
);
fixtures.set(
  RECOMPUTED_FORGED_FIRST_CONTACT_PATH,
  recomputedForgedFirstContact,
);

const CROSS_ORIGIN_MANIFEST_PATH =
  "/public-node/agents/first-contact-cross-origin-fixture-v1.json";
fixtures.set(CROSS_ORIGIN_MANIFEST_PATH, {
  ...manifest,
  entrypoints: {
    ...manifest.entrypoints,
    public_utility: "//127.0.0.1:9/cross-origin.json",
  },
});

const OVERSIZED_MANIFEST_PATH =
  "/public-node/agents/first-contact-oversized-fixture-v1.json";
const OVERSIZED_UTILITY_PATH =
  "/public-node/agents/public-utility-oversized-fixture-v1.json";
fixtures.set(OVERSIZED_MANIFEST_PATH, {
  ...manifest,
  entrypoints: {
    ...manifest.entrypoints,
    public_utility: OVERSIZED_UTILITY_PATH,
  },
});
fixtures.set(OVERSIZED_UTILITY_PATH, {
  marker: "VOID_AI_AGENT_PUBLIC_UTILITY_V1",
  padding: "x".repeat(65_536),
});

const NORMALIZED_PATH_MANIFEST_PATH =
  "/public-node/agents/first-contact-normalized-path-fixture-v1.json";
fixtures.set(NORMALIZED_PATH_MANIFEST_PATH, {
  ...manifest,
  entrypoints: {
    ...manifest.entrypoints,
    public_utility: "/public-node/%2e%2e/private.json",
  },
});

const OPEN_SCHEMA_MANIFEST_PATH =
  "/public-node/agents/first-contact-open-schema-fixture-v1.json";
const OPEN_SCHEMA_UTILITY_PATH =
  "/public-node/agents/public-utility-open-schema-fixture-v1.json";
fixtures.set(OPEN_SCHEMA_MANIFEST_PATH, {
  ...manifest,
  entrypoints: {
    ...manifest.entrypoints,
    public_utility: OPEN_SCHEMA_UTILITY_PATH,
  },
});
fixtures.set(OPEN_SCHEMA_UTILITY_PATH, {
  ...publicUtility,
  unreviewed_extension: true,
});

const DUPLICATE_ID_MANIFEST_PATH =
  "/public-node/agents/first-contact-duplicate-id-fixture-v1.json";
const DUPLICATE_ID_UTILITY_PATH =
  "/public-node/agents/public-utility-duplicate-id-fixture-v1.json";
fixtures.set(DUPLICATE_ID_MANIFEST_PATH, {
  ...manifest,
  entrypoints: {
    ...manifest.entrypoints,
    public_utility: DUPLICATE_ID_UTILITY_PATH,
  },
});
fixtures.set(DUPLICATE_ID_UTILITY_PATH, {
  ...publicUtility,
  entries: [
    ...publicUtility.entries,
    {
      ...publicUtility.entries[0],
      path: "/public-node/agents/duplicate-first-contact-v1.json",
      repository_path:
        "public/public-node/agents/duplicate-first-contact-v1.json",
    },
  ],
});

const DECOY_BINDING_MANIFEST_PATH =
  "/public-node/agents/first-contact-decoy-binding-fixture-v1.json";
const DECOY_DISCOVERY_PATH =
  "/public-node/agents/decoy-discovery-fixture-v1.json";
const DECOY_AUTHENTICITY_PATH =
  "/public-node/agents/decoy-authenticity-fixture-v1.json";
fixtures.set(DECOY_BINDING_MANIFEST_PATH, {
  ...manifest,
  entrypoints: {
    ...manifest.entrypoints,
    well_known_discovery: DECOY_DISCOVERY_PATH,
    official_authenticity: DECOY_AUTHENTICITY_PATH,
  },
});
fixtures.set(DECOY_DISCOVERY_PATH, {
  notice: "VOID Mainnet-0 mainnet0 chain 2050",
});
fixtures.set(DECOY_AUTHENTICITY_PATH, {
  notice: "VOID Mainnet-0 mainnet0 chain 2050",
});

const DECOY_CONTRACT_MANIFEST_PATH =
  "/public-node/agents/first-contact-decoy-contract-fixture-v1.json";
const DECOY_AUTHENTICATION_PATH =
  "/public-node/agents/decoy-authentication-fixture-v1.json";
const DECOY_CAPABILITIES_PATH =
  "/public-node/agents/decoy-capabilities-fixture-v1.json";
fixtures.set(DECOY_CONTRACT_MANIFEST_PATH, {
  ...manifest,
  entrypoints: {
    ...manifest.entrypoints,
    authentication: DECOY_AUTHENTICATION_PATH,
    capabilities: DECOY_CAPABILITIES_PATH,
  },
});
fixtures.set(DECOY_AUTHENTICATION_PATH, {
  notice: "VOID authentication is ready read only",
});
fixtures.set(DECOY_CAPABILITIES_PATH, {
  notice: "VOID public discovery and capability negotiation are live",
  paid_work_enabled: true,
  work_credit_earning_enabled: true,
});

const DECOY_INTAKE_MANIFEST_PATH =
  "/public-node/agents/first-contact-decoy-intake-fixture-v1.json";
const DECOY_INTAKE_PATH =
  "/public-node/agents/decoy-intake-fixture-v1.json";
const DECOY_INTAKE_UTILITY_PATH =
  "/public-node/agents/public-utility-decoy-intake-fixture-v1.json";
fixtures.set(DECOY_INTAKE_MANIFEST_PATH, {
  ...manifest,
  entrypoints: {
    ...manifest.entrypoints,
    first_contact: DECOY_INTAKE_MANIFEST_PATH,
    agent_intake: DECOY_INTAKE_PATH,
    public_utility: DECOY_INTAKE_UTILITY_PATH,
  },
});
fixtures.set(DECOY_INTAKE_UTILITY_PATH, {
  ...publicUtility,
  integration: {
    ...publicUtility.integration,
    first_contact_manifest: DECOY_INTAKE_MANIFEST_PATH,
  },
  entries: publicUtility.entries.map((entry, index) =>
    index === 0
      ? {
          ...entry,
          path: DECOY_INTAKE_MANIFEST_PATH,
          repository_path: `public${DECOY_INTAKE_MANIFEST_PATH}`,
        }
      : entry,
  ),
});
fixtures.set(DECOY_INTAKE_PATH, {
  ...agentIntakeCapability,
  availability: "live",
  authority: {
    ...agentIntakeCapability.authority,
    paid_work_submission: true,
  },
});

const TAMPERED_INTAKE_MANIFEST_PATH =
  "/public-node/agents/first-contact-tampered-intake-fixture-v1.json";
const TAMPERED_INTAKE_PATH =
  "/public-node/agents/tampered-intake-fixture-v1.json";
const TAMPERED_INTAKE_UTILITY_PATH =
  "/public-node/agents/public-utility-tampered-intake-fixture-v1.json";
fixtures.set(TAMPERED_INTAKE_MANIFEST_PATH, {
  ...manifest,
  entrypoints: {
    ...manifest.entrypoints,
    first_contact: TAMPERED_INTAKE_MANIFEST_PATH,
    agent_intake: TAMPERED_INTAKE_PATH,
    public_utility: TAMPERED_INTAKE_UTILITY_PATH,
  },
});
fixtures.set(TAMPERED_INTAKE_UTILITY_PATH, {
  ...publicUtility,
  integration: {
    ...publicUtility.integration,
    first_contact_manifest: TAMPERED_INTAKE_MANIFEST_PATH,
  },
  entries: publicUtility.entries.map((entry, index) =>
    index === 0
      ? {
          ...entry,
          path: TAMPERED_INTAKE_MANIFEST_PATH,
          repository_path: `public${TAMPERED_INTAKE_MANIFEST_PATH}`,
        }
      : entry,
  ),
});
const tamperedIntakeCapability = {
  ...agentIntakeCapability,
  transport: {
    ...agentIntakeCapability.transport,
    invocation: "unreviewed-agent-intake-command",
  },
};
assert.notEqual(
  intakeFingerprint(tamperedIntakeCapability),
  tamperedIntakeCapability.manifest_fingerprint_sha256,
);
fixtures.set(TAMPERED_INTAKE_PATH, tamperedIntakeCapability);

const WRONG_RESOURCE_MARKER_MANIFEST_PATH =
  "/public-node/agents/first-contact-wrong-resource-marker-fixture-v1.json";
const WRONG_RESOURCE_MARKER_UTILITY_PATH =
  "/public-node/agents/public-utility-wrong-resource-marker-fixture-v1.json";
const WRONG_RESOURCE_MARKER_DATA_PATH =
  "/public-node/datanet/wrong-resource-marker-fixture-v1.json";
fixtures.set(WRONG_RESOURCE_MARKER_MANIFEST_PATH, {
  ...manifest,
  entrypoints: {
    ...manifest.entrypoints,
    first_contact: WRONG_RESOURCE_MARKER_MANIFEST_PATH,
    public_utility: WRONG_RESOURCE_MARKER_UTILITY_PATH,
  },
});
fixtures.set(WRONG_RESOURCE_MARKER_UTILITY_PATH, {
  ...publicUtility,
  integration: {
    ...publicUtility.integration,
    first_contact_manifest: WRONG_RESOURCE_MARKER_MANIFEST_PATH,
  },
  entries: publicUtility.entries.map((entry, index) =>
    index === 0
      ? {
          ...entry,
          path: WRONG_RESOURCE_MARKER_MANIFEST_PATH,
          repository_path: `public${WRONG_RESOURCE_MARKER_MANIFEST_PATH}`,
        }
      : index === 2
      ? {
          ...entry,
          path: WRONG_RESOURCE_MARKER_DATA_PATH,
          repository_path: `public${WRONG_RESOURCE_MARKER_DATA_PATH}`,
        }
      : entry,
  ),
});
fixtures.set(WRONG_RESOURCE_MARKER_DATA_PATH, {
  marker: "VOID_DATANET_FIELD_REPLICATION_STATUS_CARD_V1_DECOY",
});

const BUDGET_EXHAUSTION_MANIFEST_PATH =
  "/public-node/agents/first-contact-budget-exhaustion-fixture-v1.json";
fixtures.set(BUDGET_EXHAUSTION_MANIFEST_PATH, manifest);

const RAW_JSON_FIXTURE = Symbol("raw-json-fixture");
function rawJsonFixture(body) {
  return { [RAW_JSON_FIXTURE]: body };
}

let fixtureOverrides = new Map();
const server = createServer((request, response) => {
  if (request.method !== "GET") {
    response.writeHead(405, {
      "content-type": "application/json; charset=utf-8",
      allow: "GET",
    });
    response.end(JSON.stringify({ error: "method_not_allowed" }));
    return;
  }
  const route = new URL(
    request.url ?? "/",
    "http://127.0.0.1",
  ).pathname;
  const fixture = fixtureOverrides.has(route)
    ? fixtureOverrides.get(route)
    : fixtures.get(route);
  if (!fixture) {
    response.writeHead(404, {
      "content-type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify({ error: "not_found" }));
    return;
  }
  const body = Object.hasOwn(fixture, RAW_JSON_FIXTURE)
    ? fixture[RAW_JSON_FIXTURE]
    : `${JSON.stringify(fixture)}\n`;
  response.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
  });
  response.end(body);
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});

async function runClient(args, overrides = []) {
  fixtureOverrides = new Map(overrides);
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [CLIENT_PATH, ...args],
      {
        cwd: ROOT,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", (error) => {
      fixtureOverrides = new Map();
      reject(error);
    });
    child.once("close", (code) => {
      fixtureOverrides = new Map();
      resolve({ code, stdout, stderr });
    });
  });
}

try {
  const address = server.address();
  assert.equal(typeof address, "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const result = await runClient(["--base-url", baseUrl]);

  assert.equal(result.code, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(
    report.marker,
    "VOID_AI_AGENT_FIRST_CONTACT_CLIENT_V1",
  );
  assert.equal(report.status, "ready_read_only");
  assert.equal(report.connection_mode, "read_only");
  assert.equal(report.official_network_verified, true);
  assert.equal(Object.values(report.checks).every(Boolean), true);
  for (const requiredCheck of manifest.verification.required_checks) {
    assert.equal(
      report.checks[requiredCheck],
      true,
      `published required check not satisfied: ${requiredCheck}`,
    );
  }
  assert.equal(report.checks.public_utility_catalog_loaded, true);
  assert.equal(report.checks.public_utility_resources_observed, true);
  assert.equal(report.useful_public_resources.length, 3);
  assert.deepEqual(
    report.useful_public_resources.map((entry) => entry.id),
    [
      "first_contact",
      "capability_honesty",
      "datanet_replication_receipt",
    ],
  );
  assert.equal(
    report.useful_public_resources.every(
      (entry) =>
        entry.catalog_observed_by_client === true &&
        entry.canonical_sha256_verified === true &&
        entry.observed_canonical_sha256 === entry.canonical_sha256 &&
        entry.runtime_observed === true &&
        entry.document !== null,
    ),
    true,
  );
  assert.equal(
    report.useful_public_resources[2].document.green_marker,
    "VOID_DATANET_FIELD_REPLICATION_STATUS_CARD_V1_GREEN",
  );
  assert.deepEqual(report.responses.public_utility_resources, {
    advertised: 3,
    observed: 3,
    reused_responses: 2,
    additional_network_requests: 1,
    total_network_requests: 8,
    maximum_total_network_requests: 8,
  });
  assert.equal(report.responses.public_utility.status, 200);
  assert.equal(report.authority.mutation_authority_granted, false);
  assert.equal(report.authority.wallet_accessed, false);
  assert.equal(report.authority.credentials_accessed, false);
  assert.equal(report.authority.transaction_submitted, false);
  assert.equal(report.authority.paid_work_submitted, false);
  assert.equal(report.authority.work_credits_earned, false);
  assert.equal(
    report.next_actions.some((action) =>
      action.id.includes("paid_work"),
    ),
    false,
  );
  assert.equal(
    report.next_actions.some((action) =>
      action.id.includes("work_credit"),
    ),
    false,
  );
  assert.equal(
    report.next_actions.some(
      (action) => action.id === "inspect_public_utility",
    ),
    true,
  );

  for (const manifestPath of [
    OPEN_SCHEMA_FIRST_CONTACT_PATH,
    ELEVATED_FIRST_CONTACT_PATH,
    RECOMPUTED_FORGED_FIRST_CONTACT_PATH,
  ]) {
    const invalidFirstContact = await runClient([
      "--base-url",
      baseUrl,
      "--manifest-path",
      manifestPath,
    ]);
    assert.equal(
      invalidFirstContact.code,
      2,
      invalidFirstContact.stderr,
    );
    const invalidFirstContactReport = JSON.parse(
      invalidFirstContact.stdout,
    );
    assert.equal(
      invalidFirstContactReport.checks.first_contact_manifest_reachable,
      false,
    );
    assert.equal(invalidFirstContactReport.status, "partial_read_only");
    assert.equal(invalidFirstContactReport.network, null);
    assert.equal(invalidFirstContactReport.verification_semantics, null);
    assert.deepEqual(invalidFirstContactReport.next_actions, []);
    assert.equal(
      invalidFirstContactReport.responses.public_utility_resources
        .total_network_requests,
      1,
    );
  }

  const wrongResourceMarker = await runClient(
    ["--base-url", baseUrl],
    [
      [
        manifest.entrypoints.public_utility,
        {
          ...fixtures.get(WRONG_RESOURCE_MARKER_UTILITY_PATH),
          integration: {
            ...fixtures.get(WRONG_RESOURCE_MARKER_UTILITY_PATH)
              .integration,
            first_contact_manifest: manifest.entrypoints.first_contact,
          },
          entries: fixtures
            .get(WRONG_RESOURCE_MARKER_UTILITY_PATH)
            .entries.map((entry, index) =>
              index === 0
                ? {
                    ...entry,
                    path: manifest.entrypoints.first_contact,
                    repository_path:
                      "public/public-node/agents/first-contact-v1.json",
                  }
                : entry,
            ),
        },
      ],
      [
        WRONG_RESOURCE_MARKER_DATA_PATH,
        fixtures.get(WRONG_RESOURCE_MARKER_DATA_PATH),
      ],
    ],
  );
  assert.equal(wrongResourceMarker.code, 2, wrongResourceMarker.stderr);
  const wrongResourceMarkerReport = JSON.parse(
    wrongResourceMarker.stdout,
  );
  assert.equal(
    wrongResourceMarkerReport.checks.public_utility_catalog_loaded,
    false,
  );
  assert.equal(
    wrongResourceMarkerReport.checks.public_utility_resources_observed,
    false,
  );
  assert.equal(wrongResourceMarkerReport.status, "partial_read_only");
  assert.deepEqual(wrongResourceMarkerReport.useful_public_resources, []);

  const tamperedReceipt = await runClient(
    ["--base-url", baseUrl],
    [
      [
        publicUtility.entries[2].path,
        { ...datanetReceipt, unreviewed_extension: true },
      ],
    ],
  );
  assert.equal(tamperedReceipt.code, 2, tamperedReceipt.stderr);
  const tamperedReceiptReport = JSON.parse(tamperedReceipt.stdout);
  assert.equal(
    tamperedReceiptReport.checks.public_utility_catalog_loaded,
    true,
  );
  assert.equal(
    tamperedReceiptReport.checks.public_utility_resources_observed,
    false,
  );
  const digestRejectedReceipt =
    tamperedReceiptReport.useful_public_resources.find(
      (resource) => resource.id === "datanet_replication_receipt",
    );
  assert.equal(digestRejectedReceipt.runtime_observed, false);
  assert.equal(digestRejectedReceipt.canonical_sha256_verified, false);
  assert.equal(digestRejectedReceipt.document, null);
  assert.equal(
    digestRejectedReceipt.observation_error,
    "canonical_sha256_mismatch",
  );

  const deeplyNestedReceiptBody =
    `{"green_marker":"VOID_DATANET_FIELD_REPLICATION_STATUS_CARD_V1_GREEN","nested":` +
    "[".repeat(4_000) +
    "0" +
    "]".repeat(4_000) +
    "}";
  assert.ok(
    Buffer.byteLength(deeplyNestedReceiptBody) < 65_536,
    "adversarial fixture must remain inside the response byte limit",
  );
  const deeplyNestedReceipt = await runClient(
    ["--base-url", baseUrl],
    [
      [
        publicUtility.entries[2].path,
        rawJsonFixture(deeplyNestedReceiptBody),
      ],
    ],
  );
  assert.equal(deeplyNestedReceipt.code, 2, deeplyNestedReceipt.stderr);
  assert.equal(deeplyNestedReceipt.stderr, "");
  const deeplyNestedReceiptReport = JSON.parse(
    deeplyNestedReceipt.stdout,
  );
  assert.equal(deeplyNestedReceiptReport.status, "partial_read_only");
  const deeplyNestedRejectedResource =
    deeplyNestedReceiptReport.useful_public_resources.find(
      (resource) => resource.id === "datanet_replication_receipt",
    );
  assert.equal(deeplyNestedRejectedResource.runtime_observed, false);
  assert.equal(
    deeplyNestedRejectedResource.canonical_sha256_verified,
    false,
  );
  assert.equal(
    deeplyNestedRejectedResource.observed_canonical_sha256,
    null,
  );
  assert.equal(deeplyNestedRejectedResource.document, null);
  assert.equal(
    deeplyNestedRejectedResource.observation_error,
    "canonical_sha256_unavailable",
  );

  const forgedReceipt = {
    ...datanetReceipt,
    unreviewed_extension: true,
  };
  const forgedCatalog = structuredClone(publicUtility);
  forgedCatalog.entries[2].canonical_sha256 =
    canonicalSha256(forgedReceipt);
  const forgedCatalogAndReceipt = await runClient(
    ["--base-url", baseUrl],
    [
      [manifest.entrypoints.public_utility, forgedCatalog],
      [publicUtility.entries[2].path, forgedReceipt],
    ],
  );
  assert.equal(
    forgedCatalogAndReceipt.code,
    2,
    forgedCatalogAndReceipt.stderr,
  );
  const forgedCatalogAndReceiptReport =
    JSON.parse(forgedCatalogAndReceipt.stdout);
  assert.equal(
    forgedCatalogAndReceiptReport.checks.public_utility_catalog_loaded,
    false,
  );
  assert.equal(
    forgedCatalogAndReceiptReport.checks.public_utility_resources_observed,
    false,
  );
  assert.deepEqual(
    forgedCatalogAndReceiptReport.useful_public_resources,
    [],
  );

  const exhaustedBudget = await runClient([
    "--base-url",
    baseUrl,
    "--manifest-path",
    BUDGET_EXHAUSTION_MANIFEST_PATH,
  ]);
  assert.equal(exhaustedBudget.code, 2, exhaustedBudget.stderr);
  const exhaustedBudgetReport = JSON.parse(exhaustedBudget.stdout);
  assert.equal(exhaustedBudgetReport.status, "partial_read_only");
  assert.deepEqual(exhaustedBudgetReport.responses.public_utility_resources, {
    advertised: 3,
    observed: 2,
    reused_responses: 1,
    additional_network_requests: 1,
    total_network_requests: 8,
    maximum_total_network_requests: 8,
  });
  assert.equal(
    exhaustedBudgetReport.useful_public_resources.filter(
      (resource) =>
        resource.observation_error ===
        "cold_start_request_budget_exhausted",
    ).length,
    1,
  );

  const decoyBinding = await runClient(
    ["--base-url", baseUrl],
    [
      [
        manifest.entrypoints.well_known_discovery,
        fixtures.get(DECOY_DISCOVERY_PATH),
      ],
      [
        manifest.entrypoints.official_authenticity,
        fixtures.get(DECOY_AUTHENTICITY_PATH),
      ],
    ],
  );
  assert.equal(decoyBinding.code, 2, decoyBinding.stderr);
  const decoyBindingReport = JSON.parse(decoyBinding.stdout);
  assert.equal(decoyBindingReport.official_network_verified, false);
  assert.equal(
    decoyBindingReport.checks.network_binding_consistent,
    false,
  );

  const decoyContracts = await runClient(
    ["--base-url", baseUrl],
    [
      [
        manifest.entrypoints.authentication,
        fixtures.get(DECOY_AUTHENTICATION_PATH),
      ],
      [
        manifest.entrypoints.capabilities,
        fixtures.get(DECOY_CAPABILITIES_PATH),
      ],
    ],
  );
  assert.equal(decoyContracts.code, 2, decoyContracts.stderr);
  const decoyContractsReport = JSON.parse(decoyContracts.stdout);
  assert.equal(decoyContractsReport.status, "partial_read_only");
  assert.equal(
    decoyContractsReport.checks.authentication_contract_found,
    false,
  );
  assert.equal(decoyContractsReport.checks.capabilities_loaded, false);
  assert.deepEqual(decoyContractsReport.observed_capabilities, {
    paid_work_observed: false,
    work_credit_earning_observed: false,
  });
  assert.equal(
    decoyContractsReport.next_actions.some(
      (action) => action.id === "inspect_authentication",
    ),
    false,
  );
  assert.equal(
    decoyContractsReport.next_actions.some(
      (action) => action.id === "inspect_capabilities",
    ),
    false,
  );

  const unverifiedCommercialSignals = structuredClone(capabilitiesCatalog);
  unverifiedCommercialSignals.unreviewed_signals = {
    paid_work_enabled: true,
    work_credit_earning_enabled: "live",
    nested: {
      capability: "paid_work",
      status: "available",
    },
  };
  const unverifiedCommercialSignalsResult = await runClient(
    ["--base-url", baseUrl],
    [
      [
        manifest.entrypoints.capabilities,
        unverifiedCommercialSignals,
      ],
    ],
  );
  assert.equal(
    unverifiedCommercialSignalsResult.code,
    2,
    unverifiedCommercialSignalsResult.stderr,
  );
  const unverifiedCommercialSignalsReport = JSON.parse(
    unverifiedCommercialSignalsResult.stdout,
  );
  assert.equal(
    unverifiedCommercialSignalsReport.checks.capabilities_loaded,
    true,
  );
  assert.deepEqual(
    unverifiedCommercialSignalsReport.observed_capabilities,
    {
      paid_work_observed: false,
      work_credit_earning_observed: false,
    },
  );
  assert.equal(
    unverifiedCommercialSignalsReport.next_actions.some(
      (action) =>
        action.id === "review_observed_paid_work_capability" ||
        action.id === "review_observed_work_credit_capability",
    ),
    false,
  );

  const decoyIntake = await runClient(
    ["--base-url", baseUrl],
    [[manifest.entrypoints.agent_intake, fixtures.get(DECOY_INTAKE_PATH)]],
  );
  assert.equal(decoyIntake.code, 0, decoyIntake.stderr);
  const decoyIntakeReport = JSON.parse(decoyIntake.stdout);
  assert.equal(decoyIntakeReport.status, "ready_read_only");
  assert.equal(decoyIntakeReport.checks.agent_intake_reachable, false);
  assert.equal(
    decoyIntakeReport.next_actions.some(
      (action) => action.id === "inspect_agent_intake",
    ),
    false,
  );

  const tamperedIntake = await runClient(
    ["--base-url", baseUrl],
    [[manifest.entrypoints.agent_intake, fixtures.get(TAMPERED_INTAKE_PATH)]],
  );
  assert.equal(tamperedIntake.code, 0, tamperedIntake.stderr);
  const tamperedIntakeReport = JSON.parse(tamperedIntake.stdout);
  assert.equal(tamperedIntakeReport.status, "ready_read_only");
  assert.equal(tamperedIntakeReport.checks.agent_intake_reachable, false);
  assert.equal(
    tamperedIntakeReport.next_actions.some(
      (action) => action.id === "inspect_agent_intake",
    ),
    false,
  );

  const crossOrigin = await runClient([
    "--base-url",
    baseUrl,
    "--manifest-path",
    CROSS_ORIGIN_MANIFEST_PATH,
  ]);
  assert.equal(crossOrigin.code, 2, crossOrigin.stderr);
  const crossOriginReport = JSON.parse(crossOrigin.stdout);
  assert.equal(
    crossOriginReport.checks.public_utility_catalog_loaded,
    false,
  );
  assert.equal(
    crossOriginReport.checks.first_contact_manifest_reachable,
    false,
  );
  assert.match(
    crossOriginReport.responses.public_utility.error,
    /manifest entrypoint missing/,
  );

  const oversized = await runClient(
    ["--base-url", baseUrl],
    [
      [
        manifest.entrypoints.public_utility,
        fixtures.get(OVERSIZED_UTILITY_PATH),
      ],
    ],
  );
  assert.equal(oversized.code, 2, oversized.stderr);
  const oversizedReport = JSON.parse(oversized.stdout);
  assert.equal(
    oversizedReport.checks.public_utility_catalog_loaded,
    false,
  );
  assert.match(
    oversizedReport.responses.public_utility.error,
    /response exceeds 65536 bytes/,
  );

  const normalizedPath = await runClient([
    "--base-url",
    baseUrl,
    "--manifest-path",
    NORMALIZED_PATH_MANIFEST_PATH,
  ]);
  assert.equal(normalizedPath.code, 2, normalizedPath.stderr);
  const normalizedPathReport = JSON.parse(normalizedPath.stdout);
  assert.equal(
    normalizedPathReport.checks.public_utility_catalog_loaded,
    false,
  );
  assert.equal(
    normalizedPathReport.checks.first_contact_manifest_reachable,
    false,
  );
  assert.match(
    normalizedPathReport.responses.public_utility.error,
    /manifest entrypoint missing/,
  );

  for (const utilityPath of [
    OPEN_SCHEMA_UTILITY_PATH,
    DUPLICATE_ID_UTILITY_PATH,
  ]) {
    const invalidSchema = await runClient(
      ["--base-url", baseUrl],
      [
        [
          manifest.entrypoints.public_utility,
          fixtures.get(utilityPath),
        ],
      ],
    );
    assert.equal(invalidSchema.code, 2, invalidSchema.stderr);
    const invalidSchemaReport = JSON.parse(invalidSchema.stdout);
    assert.equal(
      invalidSchemaReport.checks.public_utility_catalog_loaded,
      false,
    );
    assert.deepEqual(invalidSchemaReport.useful_public_resources, []);
  }

  const unsafeBaseUrl = await runClient([
    "--base-url",
    "http://example.invalid",
  ]);
  assert.equal(unsafeBaseUrl.code, 78, unsafeBaseUrl.stderr);
  assert.match(
    unsafeBaseUrl.stderr,
    /HTTPS or loopback HTTP/,
  );
} finally {
  await new Promise((resolve) => server.close(resolve));
}

async function gitLines(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "git",
      args,
      {
        cwd: ROOT,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr));
        return;
      }
      resolve(
        stdout
          .replace(/\n$/, "")
          .split("\n")
          .filter((line) => line.length > 0),
      );
    });
  });
}

const workingBoundary = [
  ...new Set(
    (
      await gitLines([
        "status",
        "--porcelain=v1",
        "--untracked-files=all",
      ])
    ).map((line) => line.slice(3)),
  ),
].sort();
const outsideBoundary = workingBoundary.filter(
  (path) => !ALLOWED_BOUNDARY.includes(path),
);
assert.deepEqual(
  outsideBoundary,
  [],
  "working tree contains a change outside the composition lane",
);

let boundaryVerificationMode = "clean_checkout_composition_commit";

if (workingBoundary.length > 0) {
  const recognizedRepairBoundary = [
    NETWORK_BINDING_REPAIR_BOUNDARY,
    COMPOSITION_PROOF_REPAIR_BOUNDARY,
    PUBLIC_UTILITY_RESOURCE_OBSERVATION_REPAIR_BOUNDARY,
    POST_MERGE_CONTRACT_INTEGRITY_REPAIR_BOUNDARY,
    FIRST_CONTACT_MANIFEST_INTEGRITY_REPAIR_BOUNDARY,
    PUBLIC_UTILITY_PROVENANCE_BOUNDARY,
    PUBLIC_UTILITY_CANONICALIZATION_BOUNDARY,
  ].some(
    (boundary) =>
      JSON.stringify(workingBoundary) ===
      JSON.stringify([...boundary].sort()),
  );
  assert.equal(
    recognizedRepairBoundary,
    true,
    "working tree does not match a recognized exact repair boundary",
  );
  boundaryVerificationMode = "in_boundary_repair_plus_composition_commit";
}

const compositionCandidates = await gitLines([
  "log",
  "--first-parent",
  "--format=%H",
  "--",
  "public/public-node/agents/first-contact-v1.json",
  "public/public-node/agents/public-utility-v1.json",
]);
let boundaryCompositionCommit = null;
for (const candidate of compositionCandidates) {
  const parents = await gitLines([
    "show",
    "--no-patch",
    "--format=%P",
    candidate,
  ]);
  const firstParent = parents[0]?.split(" ")[0];
  if (!firstParent) continue;
  const changedBoundary = [
    ...new Set(
      await gitLines([
        "diff",
        "--name-only",
        firstParent,
        candidate,
      ]),
    ),
  ].sort();
  if (
    JSON.stringify(changedBoundary) ===
    JSON.stringify([...COMPOSITION_BOUNDARY].sort())
  ) {
    boundaryCompositionCommit = candidate;
    break;
  }
}
assert.notEqual(
  boundaryCompositionCommit,
  null,
  "exact first-contact/public-utility composition commit was not found",
);

console.log(
  `boundary_verification_mode=${boundaryVerificationMode}`,
);
console.log(`boundary_composition_commit=${boundaryCompositionCommit}`);

console.log("first_contact_marker=VOID_AI_AGENT_FIRST_CONTACT_V1");
console.log("client_marker=VOID_AI_AGENT_FIRST_CONTACT_CLIENT_V1");
console.log("official_network_verified=true");
console.log("connection_mode=read_only");
console.log("get_only_client=true");
console.log("paid_work_promised=false");
console.log("work_credit_earning_promised=false");
console.log("mutation_authority_granted=false");
console.log("public_utility_catalog_loaded=true");
console.log("useful_public_resource_count=3");
console.log("composition_boundary_file_count=12");
console.log("VOID_AI_AGENT_FIRST_CONTACT_KIT_V1_PROOF_EXACT_GREEN");
