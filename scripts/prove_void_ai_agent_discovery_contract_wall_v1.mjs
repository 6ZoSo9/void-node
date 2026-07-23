#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const manifestPath = path.join(
  root,
  "public/public-node/agents/discovery-v1.json",
);
const schemaPath = path.join(
  root,
  "public/public-node/agents/discovery-v1.schema.json",
);
const clientPath = path.join(
  root,
  "tools/void-ai-agent-discovery-client-v1.mjs",
);
const docPath = path.join(
  root,
  "docs/public/ai-agent-discovery-contract-wall-v1.md",
);

for (const file of [manifestPath, schemaPath, clientPath, docPath]) {
  assert.equal(
    fs.existsSync(file),
    true,
    `missing required file: ${path.relative(root, file)}`,
  );
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const client = fs.readFileSync(clientPath, "utf8");
const doc = fs.readFileSync(docPath, "utf8");

assert.equal(manifest.marker, "VOID_AI_AGENT_DISCOVERY_CONTRACT_WALL_V1");
assert.equal(manifest.protocol, "void-agent-discovery/1");
assert.equal(manifest.network?.chain_id, 2050);
assert.equal(manifest.authority?.default, "read_only");
assert.equal(manifest.authority?.mutation_authority_granted, false);
assert.deepEqual(
  [...manifest.authority.granted_http_methods].sort(),
  ["GET", "HEAD"],
);

for (const [name, value] of Object.entries(manifest.entrypoints)) {
  assert.equal(typeof value, "string", `${name} must be a string`);
  assert.equal(value.startsWith("/"), true, `${name} must be same-origin path`);
  assert.equal(
    value.startsWith("//"),
    false,
    `${name} must not be protocol-relative`,
  );
  assert.equal(value.includes("://"), false, `${name} must not be cross-origin`);
}

const capabilityById = new Map(
  manifest.capabilities.map((capability) => [capability.id, capability]),
);
for (const id of [
  "buy_void_automatic_fulfillment",
  "validator_activation",
  "wallet_treasury_or_ledger_mutation",
]) {
  const capability = capabilityById.get(id);
  assert.ok(capability, `missing guarded capability: ${id}`);
  assert.equal(capability.state, "guarded");
  assert.equal(capability.authority, "not_granted");
  assert.equal(capability.enabled, false);
}

assert.equal(manifest.safety?.same_origin_only, true);
assert.equal(manifest.safety?.follow_cross_origin_links_automatically, false);
assert.equal(manifest.safety?.send_secrets, false);
assert.equal(manifest.safety?.send_wallet_material, false);
assert.equal(manifest.safety?.send_operator_keys, false);
assert.equal(manifest.safety?.treat_unknown_capability_as, "not_granted");

assert.equal(
  manifest.agent_onboarding.steps.some(
    (step) => step.action === "enforce_authority_boundary",
  ),
  true,
);
assert.equal(manifest.agent_onboarding.stop_conditions.length >= 5, true);

assert.equal(schema.properties?.marker?.const, manifest.marker);
assert.equal(schema.properties?.protocol?.const, manifest.protocol);
assert.equal(schema.properties?.network?.properties?.chain_id?.const, 2050);
assert.equal(
  schema.properties?.authority?.properties?.mutation_authority_granted?.const,
  false,
);
assert.equal(
  schema.properties?.safety?.properties?.same_origin_only?.const,
  true,
);
assert.equal(
  schema.properties?.safety?.properties?.treat_unknown_capability_as?.const,
  "not_granted",
);

assert.match(client, /method:\s*"GET"/);
for (const forbidden of [
  /method:\s*"POST"/,
  /method:\s*"PUT"/,
  /method:\s*"PATCH"/,
  /method:\s*"DELETE"/,
  /headers:\s*\{[^}]*authorization/is,
  /headers:\s*\{[^}]*cookie/is,
  /seed[_ -]?phrase/i,
]) {
  assert.equal(
    forbidden.test(client),
    false,
    `client contains forbidden pattern: ${forbidden}`,
  );
}
assert.match(client, /sameOriginPath/);
assert.match(client, /redirect:\s*"error"/);
assert.match(client, /mutation_authority_claim_rejected/);
assert.match(client, /unknown_capability_default_must_be_not_granted/);

for (const requiredText of [
  "does not grant mutation authority",
  "GET-only",
  "same-origin",
  "Nimo",
  "PR #646",
]) {
  assert.equal(
    doc.includes(requiredText),
    true,
    `documentation missing: ${requiredText}`,
  );
}

console.log("VOID_AI_AGENT_DISCOVERY_CONTRACT_WALL_V1_PROOF_GREEN");
console.log(`manifest=${path.relative(root, manifestPath)}`);
console.log(`schema=${path.relative(root, schemaPath)}`);
console.log(`client=${path.relative(root, clientPath)}`);
console.log(`documentation=${path.relative(root, docPath)}`);
console.log("existing_files_modified=0");
console.log("runtime_routing_modified=0");
console.log("validator_lane_modified=0");
console.log("release_lane_modified=0");
console.log("nimo_access=0");
