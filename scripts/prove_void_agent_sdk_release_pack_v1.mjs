import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import {
  discoverVoidAgentV1,
  verifyVoidAgentReportV1,
} from "../integrations/agents/void-agent-sdk-v1/index.mjs";
import {
  runVoidAgentCliV1,
} from "../integrations/agents/void-agent-sdk-v1/cli.mjs";

function assertCondition(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectReject(label, operation, expectedFragment) {
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
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(root, "integrations/agents/void-agent-sdk-v1");
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

function jsonResponse(value, options = {}) {
  const body = typeof value === "string" ? value : JSON.stringify(value);
  return new Response(body, {
    status: options.status ?? 200,
    headers: {
      "content-type": options.contentType ?? "application/json; charset=utf-8",
      ...(options.headers ?? {}),
    },
  });
}

function makeFetch(documents, requests = []) {
  return async (url, init) => {
    const resolved = new URL(url);
    requests.push({
      url: resolved.toString(),
      method: init.method,
      redirect: init.redirect,
      credentials: init.credentials,
      headers: { ...init.headers },
    });
    const value = documents.get(resolved.pathname);
    if (value instanceof Response) return value;
    if (value === undefined) return jsonResponse({}, { status: 404 });
    return jsonResponse(value);
  };
}

function documents(overrides = {}) {
  return new Map([
    [wellKnownPath, overrides.wellKnown ?? wellKnown],
    [canonicalPath, overrides.canonical ?? canonical],
    [catalogPath, overrides.catalog ?? catalog],
  ]);
}

const requests = [];
const report = await discoverVoidAgentV1({
  baseUrl: "https://node.example",
  wanted: [
    "public_discovery",
    "capability_negotiation",
    "unknown_future_capability",
  ],
  fetchImpl: makeFetch(documents(), requests),
});
verifyVoidAgentReportV1(report);

assertCondition(report.status === "ready_read_only", "report status mismatch");
assertCondition(report.network.chain_id === 2050, "chain ID mismatch");
assertCondition(report.negotiation.granted.length === 2, "granted count mismatch");
assertCondition(
  report.negotiation.not_granted.length === 1 &&
    report.negotiation.not_granted[0].reason === "unknown_capability",
  "unknown capability did not fail closed",
);
assertCondition(
  Object.values(report.authority).every((value) => value === false),
  "report exceeded authority boundary",
);
assertCondition(requests.length === 3, "unexpected request count");
for (const request of requests) {
  assertCondition(request.method === "GET", "non-GET request emitted");
  assertCondition(request.redirect === "manual", "redirect mode changed");
  assertCondition(request.credentials === "omit", "credentials were not omitted");
  assertCondition(
    !Object.keys(request.headers).some(
      (key) => key.toLowerCase() === "authorization",
    ),
    "authorization header emitted",
  );
}

const cliOutput = [];
const cliResult = await runVoidAgentCliV1(
  [
    "--base",
    "https://node.example",
    "--want",
    "public_discovery,capability_negotiation",
    "--pretty",
  ],
  {
    fetchImpl: makeFetch(documents()),
    stdout: { write: (text) => cliOutput.push(text) },
  },
);
assertCondition(cliResult.exitCode === 0, "CLI exit code mismatch");
assertCondition(cliOutput.length === 1, "CLI output missing");
assertCondition(
  JSON.parse(cliOutput[0]).report_id === cliResult.report.report_id,
  "CLI report mismatch",
);

const crossOrigin = clone(wellKnown);
crossOrigin.canonical_discovery = "https://attacker.invalid/discovery.json";
await expectReject(
  "cross-origin canonical discovery",
  () =>
    discoverVoidAgentV1({
      baseUrl: "https://node.example",
      fetchImpl: makeFetch(documents({ wellKnown: crossOrigin })),
    }),
  "canonical_discovery_must_be_same_origin_absolute_path",
);

await expectReject(
  "redirect",
  () =>
    discoverVoidAgentV1({
      baseUrl: "https://node.example",
      fetchImpl: makeFetch(
        new Map([
          [
            wellKnownPath,
            jsonResponse("", {
              status: 302,
              headers: { location: "https://attacker.invalid/" },
            }),
          ],
        ]),
      ),
    }),
  "redirect_rejected",
);

const unsafeCatalog = clone(catalog);
unsafeCatalog.capabilities[0].http_methods = ["POST"];
await expectReject(
  "unsafe method",
  () =>
    discoverVoidAgentV1({
      baseUrl: "https://node.example",
      fetchImpl: makeFetch(documents({ catalog: unsafeCatalog })),
    }),
  "capability_unsafe_method",
);

const mutationCatalog = clone(catalog);
mutationCatalog.authority.mutation_authority_granted = true;
await expectReject(
  "mutation claim",
  () =>
    discoverVoidAgentV1({
      baseUrl: "https://node.example",
      fetchImpl: makeFetch(documents({ catalog: mutationCatalog })),
    }),
  "capability_authority_mutation_authority_granted_rejected",
);

await expectReject(
  "cleartext clearweb",
  () =>
    discoverVoidAgentV1({
      baseUrl: "http://node.example",
      fetchImpl: makeFetch(documents()),
    }),
  "base_url_requires_https",
);

await expectReject(
  "embedded credentials",
  () =>
    discoverVoidAgentV1({
      baseUrl: "https://user:pass@node.example",
      fetchImpl: makeFetch(documents()),
    }),
  "base_url_credentials_rejected",
);

await expectReject(
  "duplicate wanted",
  () =>
    discoverVoidAgentV1({
      baseUrl: "https://node.example",
      wanted: ["public_discovery", "public_discovery"],
      fetchImpl: makeFetch(documents()),
    }),
  "duplicate_wanted_capability",
);

await expectReject(
  "oversized body",
  () =>
    discoverVoidAgentV1({
      baseUrl: "https://node.example",
      maxResponseBytes: 1024,
      fetchImpl: makeFetch(
        new Map([
          [
            wellKnownPath,
            jsonResponse(wellKnown, {
              headers: { "content-length": "2048" },
            }),
          ],
        ]),
      ),
    }),
  "body_too_large",
);

const tampered = clone(report);
tampered.origin = "https://tampered.invalid";
await expectReject(
  "tampered report",
  () => Promise.resolve(verifyVoidAgentReportV1(tampered)),
  "report_id_mismatch",
);

const manifest = JSON.parse(
  fs.readFileSync(path.join(packageRoot, "integrity.json"), "utf8"),
);
assertCondition(
  manifest.marker === "VOID_AGENT_SDK_RELEASE_MANIFEST_V1",
  "integrity marker mismatch",
);
for (const [relative, expected] of Object.entries(manifest.files)) {
  const bytes = fs.readFileSync(path.join(packageRoot, relative));
  assertCondition(bytes.length === expected.bytes, `byte mismatch: ${relative}`);
  assertCondition(
    createHash("sha256").update(bytes).digest("hex") === expected.sha256,
    `SHA-256 mismatch: ${relative}`,
  );
}
assertCondition(
  Object.values(manifest.authority).every((value) => value === false),
  "integrity manifest exceeded authority boundary",
);

const packageJson = JSON.parse(
  fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"),
);
assertCondition(packageJson.engines.node === ">=22 <23", "Node engine mismatch");
assertCondition(packageJson.dependencies === undefined, "runtime dependencies added");
assertCondition(packageJson.devDependencies === undefined, "dev dependencies added");

for (const relative of ["index.mjs", "cli.mjs"]) {
  const source = fs.readFileSync(path.join(packageRoot, relative), "utf8");
  for (const forbidden of [
    "node:child_process",
    "crypto.sign(",
    "createPrivateKey(",
    "Authorization:",
    'method: "POST"',
    'method: "PUT"',
    'method: "PATCH"',
    'method: "DELETE"',
  ]) {
    assertCondition(
      !source.includes(forbidden),
      `${relative} contains forbidden authority: ${forbidden}`,
    );
  }
}

console.log(`report_id=${report.report_id}`);
console.log(`granted_capabilities=${report.negotiation.granted.length}`);
console.log(`not_granted_capabilities=${report.negotiation.not_granted.length}`);
console.log(`integrity_files=${Object.keys(manifest.files).length}`);
console.log("zero_dependencies=true");
console.log("same_origin_only=true");
console.log("redirects_rejected=true");
console.log("credentials_sent=false");
console.log("mutation_authority_granted=false");
console.log("payment_submission=false");
console.log("work_credit_write=false");
console.log("wallet_or_signer_access=false");
console.log("deployment=false");
console.log("money_movement=false");
console.log("VOID_AGENT_SDK_RELEASE_PACK_V1_PROOF_GREEN=true");
