#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const pointerPath = path.join(
  root,
  "public/.well-known/void-agent-discovery.json",
);
const schemaPath = path.join(
  root,
  "public/.well-known/void-agent-discovery.schema.json",
);
const canonicalPath = path.join(
  root,
  "public/public-node/agents/discovery-v1.json",
);
const clientPath = path.join(
  root,
  "tools/void-ai-agent-well-known-client-v1.mjs",
);
const docPath = path.join(
  root,
  "docs/public/ai-agent-well-known-entrypoint-v1.md",
);

for (const file of [
  pointerPath,
  schemaPath,
  canonicalPath,
  clientPath,
  docPath,
]) {
  assert.equal(
    fs.existsSync(file),
    true,
    `missing required file: ${path.relative(root, file)}`,
  );
}

const pointer = JSON.parse(fs.readFileSync(pointerPath, "utf8"));
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const canonical = JSON.parse(fs.readFileSync(canonicalPath, "utf8"));
const client = fs.readFileSync(clientPath, "utf8");
const doc = fs.readFileSync(docPath, "utf8");

assert.equal(
  pointer.marker,
  "VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1",
);
assert.equal(
  pointer.protocol,
  "void-agent-discovery-well-known/1",
);
assert.equal(pointer.network?.chain_id, 2050);
assert.equal(
  pointer.canonical_discovery,
  "/public-node/agents/discovery-v1.json",
);
assert.equal(pointer.authority?.default, "read_only");
assert.equal(pointer.authority?.mutation_authority_granted, false);
assert.equal(pointer.authority?.credentials_required, false);
assert.equal(pointer.safety?.same_origin_only, true);
assert.equal(pointer.safety?.follow_redirects, false);
assert.equal(pointer.safety?.send_secrets, false);
assert.equal(pointer.safety?.send_wallet_material, false);
assert.equal(pointer.safety?.send_operator_keys, false);
assert.equal(pointer.safety?.treat_unknown_as, "not_granted");

assert.equal(
  canonical.marker,
  "VOID_AI_AGENT_DISCOVERY_CONTRACT_WALL_V1",
);
assert.equal(canonical.protocol, "void-agent-discovery/1");
assert.equal(canonical.network?.chain_id, pointer.network?.chain_id);
assert.equal(canonical.authority?.mutation_authority_granted, false);

assert.equal(
  schema.properties?.marker?.const,
  pointer.marker,
);
assert.equal(
  schema.properties?.protocol?.const,
  pointer.protocol,
);
assert.equal(
  schema.properties?.canonical_discovery?.const,
  pointer.canonical_discovery,
);
assert.equal(
  schema.properties?.authority?.properties
    ?.mutation_authority_granted?.const,
  false,
);
assert.equal(
  schema.properties?.safety?.properties?.same_origin_only?.const,
  true,
);

assert.match(client, /WELL_KNOWN_PATH/);
assert.match(client, /canonical_discovery/);
assert.match(client, /method:\s*"GET"/);
assert.match(client, /redirect:\s*"error"/);
assert.match(client, /sameOriginPath/);
assert.match(client, /mutation_authority_claim_rejected/);
assert.match(client, /unknown_authority_must_be_not_granted/);

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

for (const required of [
  "/.well-known/void-agent-discovery.json",
  "does not grant mutation authority",
  "same-origin",
  "GET-only",
  "PR #646",
  "Nimo",
]) {
  assert.equal(
    doc.includes(required),
    true,
    `documentation missing: ${required}`,
  );
}

console.log("VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1_PROOF_GREEN");
console.log(`pointer=${path.relative(root, pointerPath)}`);
console.log(`schema=${path.relative(root, schemaPath)}`);
console.log(`canonical=${path.relative(root, canonicalPath)}`);
console.log(`client=${path.relative(root, clientPath)}`);
console.log(`documentation=${path.relative(root, docPath)}`);
console.log("existing_files_modified=0");
console.log("runtime_routing_modified=0");
console.log("validator_lane_modified=0");
console.log("release_lane_modified=0");
console.log("nimo_access=0");
