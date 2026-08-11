#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const CATALOG_PATH = "public/public-node/agents/public-utility-v1.json";
const catalogOnly = process.argv.includes("--catalog-only");

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, `file://${ROOT}/`), "utf8"));
}

function markerPresent(document, marker) {
  return document.marker === marker || document.green_marker === marker;
}

const raw = await readFile(new URL(CATALOG_PATH, `file://${ROOT}/`), "utf8");
const catalog = JSON.parse(raw);

assert.equal(catalog.contract, "void-ai-agent-first-contact-public-utility/1");
assert.equal(catalog.marker, "VOID_AI_AGENT_PUBLIC_UTILITY_V1");
assert.equal(catalog.status, "source_only_not_advertised");
assert.deepEqual(catalog.network, {
  chain_id: 2050,
  identity: "mainnet0",
  name: "VOID Mainnet-0"
});

assert.equal(catalog.integration.first_contact_manifest, "/public-node/agents/first-contact-v1.json");
assert.equal(catalog.integration.advertised_from_first_contact, false);
assert.equal(catalog.integration.runtime_observed, false);
assert.deepEqual(catalog.integration.activation_requires, [
  "first_contact_entrypoint_added",
  "independent_http_observation"
]);

assert.ok(Buffer.byteLength(raw) <= catalog.limits.max_catalog_bytes);
assert.equal(catalog.limits.max_catalog_bytes, 65536);
assert.equal(catalog.limits.max_entries, 8);
assert.equal(catalog.limits.max_requests_per_cold_start, 4);
assert.ok(catalog.limits.minimum_poll_interval_ms >= 60000);
assert.ok(catalog.entries.length > 0 && catalog.entries.length <= catalog.limits.max_entries);
assert.ok(catalog.entries.length <= catalog.limits.max_requests_per_cold_start);

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

const ids = new Set();
const paths = new Set();
for (const entry of catalog.entries) {
  assert.equal(ids.has(entry.id), false, `duplicate id: ${entry.id}`);
  assert.equal(paths.has(entry.path), false, `duplicate path: ${entry.path}`);
  ids.add(entry.id);
  paths.add(entry.path);

  assert.match(entry.path, /^\/[A-Za-z0-9._/-]+\.json$/);
  assert.equal(entry.path.startsWith("//"), false);
  assert.equal(entry.repository_path, `public${entry.path}`);
  assert.equal(entry.media_type, "application/json");
  assert.equal(entry.http_method, "GET");
  assert.equal(entry.access, "anonymous");
  assert.equal(entry.authority, "read_only");
  assert.equal(entry.source_present, true);
  assert.equal(entry.runtime_observed, false);

  if (!catalogOnly) {
    const source = await readJson(entry.repository_path);
    assert.equal(markerPresent(source, entry.required_marker), true, `marker missing for ${entry.id}`);
  }
}

if (!catalogOnly) {
  const firstContact = await readJson("public/public-node/agents/first-contact-v1.json");
  assert.equal(Object.values(firstContact.entrypoints).includes("/public-node/agents/public-utility-v1.json"), false);
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
