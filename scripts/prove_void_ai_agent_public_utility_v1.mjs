#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const CATALOG_PATH = "public/public-node/agents/public-utility-v1.json";
const PROVENANCE_WORKFLOW_PATHS = [
  ".github/workflows/void-ai-agent-first-contact-v1.yml",
  ".github/workflows/void-ai-agent-public-utility-v1.yml",
];
const UNFILTERED_PROVENANCE_WORKFLOW_PATH =
  ".github/workflows/void-ai-agent-provenance-unfiltered-v1.yml";
const REVIEWED_PUBLIC_UTILITY_CATALOG_SHA256 =
  "b67fe641d7ccebdb3e4626245b2895d75dd640789d29aca2544855f3d646daa2";
const catalogOnly = process.argv.includes("--catalog-only");
const TOP_LEVEL_KEYS = [
  "contract",
  "controls",
  "entries",
  "integration",
  "limits",
  "marker",
  "network",
  "purpose",
  "status",
];
const INTEGRATION_KEYS = [
  "activation_requires",
  "advertised_from_first_contact",
  "first_contact_manifest",
  "runtime_observed",
];
const LIMIT_KEYS = [
  "max_catalog_bytes",
  "max_entries",
  "max_requests_per_cold_start",
  "minimum_poll_interval_ms",
];
const CONTROL_KEYS = [
  "anonymous_read_allowed",
  "captcha_required",
  "credential_required",
  "earning_advertised",
  "human_chat_required",
  "mutation_authority_granted",
  "paid_work_advertised",
  "polling_rewarded",
  "registration_required",
  "traffic_rewarded",
  "wallet_required",
  "work_credit_award_active",
];
const ENTRY_KEYS = [
  "access",
  "authority",
  "canonical_sha256",
  "http_method",
  "id",
  "kind",
  "media_type",
  "path",
  "purpose",
  "repository_path",
  "required_marker",
  "runtime_observed",
  "same_origin",
  "source_present",
];

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, `file://${ROOT}/`), "utf8"));
}

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function canonicalSha256(value) {
  return createHash("sha256")
    .update(canonicalJson(value), "utf8")
    .digest("hex");
}

function markerPresent(document, marker) {
  return document.marker === marker || document.green_marker === marker;
}

function exactKeys(value, expected, label) {
  assert.equal(
    value !== null && typeof value === "object" && !Array.isArray(value),
    true,
    `${label} must be an object`,
  );
  assert.deepEqual(
    Object.keys(value).sort(),
    [...expected].sort(),
    `${label} keys`,
  );
}

function validatePublicJsonPath(path) {
  assert.equal(typeof path, "string", "entry path must be a string");
  assert.match(path, /^\/public-node\/[A-Za-z0-9._/-]+\.json$/);
  assert.equal(path.startsWith("//"), false, "entry path must be same-origin");
  assert.equal(
    path.split("/").some((segment) => segment === "." || segment === ".."),
    false,
    "entry path must not contain traversal segments",
  );
}

const raw = await readFile(new URL(CATALOG_PATH, `file://${ROOT}/`), "utf8");
const catalog = JSON.parse(raw);
assert.equal(
  canonicalSha256(catalog),
  REVIEWED_PUBLIC_UTILITY_CATALOG_SHA256,
  "reviewed catalog digest mismatch",
);

exactKeys(catalog, TOP_LEVEL_KEYS, "catalog");
assert.equal(catalog.contract, "void-ai-agent-first-contact-public-utility/1");
assert.equal(catalog.marker, "VOID_AI_AGENT_PUBLIC_UTILITY_V1");
assert.equal(catalog.status, "source_only_advertised_not_observed");
assert.deepEqual(catalog.network, {
  chain_id: 2050,
  identity: "mainnet0",
  name: "VOID Mainnet-0"
});

exactKeys(catalog.integration, INTEGRATION_KEYS, "integration");
assert.equal(catalog.integration.first_contact_manifest, "/public-node/agents/first-contact-v1.json");
assert.equal(catalog.integration.advertised_from_first_contact, true);
assert.equal(catalog.integration.runtime_observed, false);
assert.deepEqual(catalog.integration.activation_requires, [
  "independent_http_observation"
]);

exactKeys(catalog.limits, LIMIT_KEYS, "limits");
assert.ok(Buffer.byteLength(raw) <= catalog.limits.max_catalog_bytes);
assert.equal(catalog.limits.max_catalog_bytes, 65536);
assert.equal(catalog.limits.max_entries, 8);
assert.equal(catalog.limits.max_requests_per_cold_start, 8);
assert.ok(catalog.limits.minimum_poll_interval_ms >= 60000);
assert.ok(catalog.entries.length > 0 && catalog.entries.length <= catalog.limits.max_entries);
assert.ok(catalog.entries.length <= catalog.limits.max_requests_per_cold_start);

exactKeys(catalog.controls, CONTROL_KEYS, "controls");
assert.deepEqual(catalog.controls, {
  anonymous_read_allowed: true,
  captcha_required: false,
  credential_required: false,
  earning_advertised: false,
  human_chat_required: false,
  mutation_authority_granted: false,
  paid_work_advertised: false,
  polling_rewarded: false,
  registration_required: false,
  traffic_rewarded: false,
  wallet_required: false,
  work_credit_award_active: false
});

for (const workflowPath of PROVENANCE_WORKFLOW_PATHS) {
  const workflow = await readFile(
    new URL(workflowPath, `file://${ROOT}/`),
    "utf8",
  );
  for (const entry of catalog.entries) {
    assert.equal(
      workflow.split(`"${entry.repository_path}"`).length - 1,
      2,
      `${workflowPath} must trigger on ${entry.repository_path} for pull requests and main pushes`,
    );
  }
}

const unfilteredProvenanceWorkflow = await readFile(
  new URL(UNFILTERED_PROVENANCE_WORKFLOW_PATH, `file://${ROOT}/`),
  "utf8",
);
assert.match(unfilteredProvenanceWorkflow, /^  pull_request:\s*$/m);
assert.match(unfilteredProvenanceWorkflow, /^  push:\s*$/m);
assert.match(unfilteredProvenanceWorkflow, /^      - main\s*$/m);
assert.equal(
  /^\s+paths(?:-ignore)?:\s*$/m.test(unfilteredProvenanceWorkflow),
  false,
  "unfiltered provenance workflow must not use paths or paths-ignore",
);
for (const proofPath of [
  "scripts/prove_void_ai_agent_first_contact_v1.mjs",
  "scripts/prove_void_ai_agent_public_utility_v1.mjs",
]) {
  assert.equal(
    unfilteredProvenanceWorkflow.split(`node ${proofPath}`).length - 1,
    1,
    `unfiltered provenance workflow must invoke ${proofPath} exactly once`,
  );
}

const ids = new Set();
const paths = new Set();
for (const entry of catalog.entries) {
  exactKeys(entry, ENTRY_KEYS, `entry ${entry.id ?? "<missing>"}`);
  assert.equal(ids.has(entry.id), false, `duplicate id: ${entry.id}`);
  assert.equal(paths.has(entry.path), false, `duplicate path: ${entry.path}`);
  ids.add(entry.id);
  paths.add(entry.path);

  assert.match(entry.id, /^[a-z0-9]+(?:_[a-z0-9]+)*$/);
  assert.match(entry.kind, /^[a-z0-9]+(?:_[a-z0-9]+)*$/);
  assert.equal(typeof entry.purpose, "string");
  assert.ok(entry.purpose.length > 0 && entry.purpose.length <= 256);
  assert.match(entry.required_marker, /^[A-Z0-9_]+$/);
  assert.match(entry.canonical_sha256, /^[0-9a-f]{64}$/);
  validatePublicJsonPath(entry.path);
  assert.equal(entry.repository_path, `public${entry.path}`);
  assert.equal(entry.media_type, "application/json");
  assert.equal(entry.http_method, "GET");
  assert.equal(entry.access, "anonymous");
  assert.equal(entry.authority, "read_only");
  assert.equal(entry.same_origin, true);
  assert.equal(entry.source_present, true);
  assert.equal(entry.runtime_observed, false);

  if (!catalogOnly) {
    const source = await readJson(entry.repository_path);
    assert.equal(markerPresent(source, entry.required_marker), true, `marker missing for ${entry.id}`);
    assert.equal(
      canonicalSha256(source),
      entry.canonical_sha256,
      `canonical source digest mismatch for ${entry.id}`,
    );
  }
}

for (const path of [
  "/public-node/agents/../secret.json",
  "/public-node/./agents/secret.json",
  "/other/agents/secret.json",
  "//public-node/agents/secret.json",
]) {
  assert.throws(
    () => validatePublicJsonPath(path),
    undefined,
    `unsafe path accepted: ${path}`,
  );
}

if (!catalogOnly) {
  const firstContact = await readJson("public/public-node/agents/first-contact-v1.json");
  assert.equal(
    firstContact.entrypoints.public_utility,
    "/public-node/agents/public-utility-v1.json",
  );
  assert.equal(
    firstContact.verification.required_checks.includes(
      "public_utility_catalog_loaded",
    ),
    true,
  );
}

process.stdout.write(`${JSON.stringify({
  marker: "VOID_AI_AGENT_PUBLIC_UTILITY_V1_GREEN",
  status: "green",
  catalog_status: catalog.status,
  entries_verified: catalog.entries.length,
  source_markers_verified: !catalogOnly,
  runtime_observed: catalog.integration.runtime_observed,
  advertised_from_first_contact: catalog.integration.advertised_from_first_contact,
  mutation_authority_granted: catalog.controls.mutation_authority_granted,
  earning_advertised: catalog.controls.earning_advertised
})}\n`);
