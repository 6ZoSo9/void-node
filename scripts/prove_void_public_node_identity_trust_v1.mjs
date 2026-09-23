#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MARKER = "VOID_PUBLIC_NODE_IDENTITY_TRUST_V1_PROOF_GREEN";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REGISTRY_PATH = resolve(ROOT, "config/void-public-node-identity-trust-v1.json");
const SCHEMA_PATH = resolve(ROOT, "schemas/void-public-node-identity-trust-v1.schema.json");
const TOR_CLIENT_PATH = resolve(ROOT, "config/void-tor-agent-access-client-v1.json");
const SOVEREIGN_POLICY_PATH = resolve(
  ROOT,
  "ops/mainnet0/chain2050-role-authority-sovereign-policy-v1.json",
);
const ONION_EVIDENCE_PATH = resolve(
  ROOT,
  "public/public-node/evidence/void-node-onion-binding-v1-nimo-verified.json",
);
const EXPECTED_REGISTRY_SHA256 =
  "49f285908fa70c72ce036b44d9ead41e11fc1bd40092384636a2c0cc3a0d3790";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function gitBlobSha1(bytes) {
  return createHash("sha1")
    .update(Buffer.from(`blob ${bytes.length}\0`, "utf8"))
    .update(bytes)
    .digest("hex");
}

const registryBytes = readFileSync(REGISTRY_PATH);
assert.equal(
  createHash("sha256").update(registryBytes).digest("hex"),
  EXPECTED_REGISTRY_SHA256,
  "reviewed trust registry bytes changed without updating the explicit pin",
);
const registry = JSON.parse(registryBytes.toString("utf8"));
assert.equal(registry.marker, "VOID_PUBLIC_NODE_IDENTITY_TRUST_V1");
assert.equal(registry.version, 1);
assert.equal(registry.status, "reviewed");
assert.deepEqual(registry.network, {
  name: "VOID Mainnet-0",
  identity: "mainnet0",
  chain_id: 2050,
});
assert.equal(registry.entries.length, 1);

const [entry] = registry.entries;
assert.equal(entry.status, "trusted");
assert.equal(entry.key_type, "ed25519");
assert.match(entry.node_id, /^[0-9a-f]{32}$/u);
assert.match(entry.public_key_fingerprint_sha256, /^[0-9a-f]{64}$/u);
assert.equal(entry.trust_basis.kind, "existing_main_void_node_identity_key");
assert.deepEqual(
  entry.trust_basis.corroborating_paths,
  [
    "config/void-tor-agent-access-client-v1.json",
    "ops/mainnet0/chain2050-role-authority-sovereign-policy-v1.json",
    "public/public-node/evidence/void-node-onion-binding-v1-nimo-verified.json",
  ],
);

assert.deepEqual(registry.authority, {
  verification_only: true,
  mutation_authority_granted: false,
  work_credit_authority_granted: false,
  wallet_or_signer_access: false,
  transaction_authority_granted: false,
  validator_authority_granted: false,
  treasury_or_liquidity_authority_granted: false,
  funds_movement_authority_granted: false,
});

const torClient = readJson(TOR_CLIENT_PATH);
assert.equal(torClient.trust.node_id, entry.node_id);
assert.equal(
  torClient.trust.public_key_fingerprint_sha256,
  entry.public_key_fingerprint_sha256,
);

const sovereignPolicy = readJson(SOVEREIGN_POLICY_PATH);
assert.equal(
  sovereignPolicy.policy_body.ordinary_authentication.expected_node_id,
  entry.node_id,
);
assert.equal(
  sovereignPolicy.policy_body.ordinary_authentication.expected_public_key_der_sha256,
  entry.public_key_fingerprint_sha256,
);

const onionEvidenceBytes = readFileSync(ONION_EVIDENCE_PATH);
const onionEvidence = JSON.parse(onionEvidenceBytes.toString("utf8"));
assert.equal(onionEvidence.status, "active");
assert.equal(onionEvidence.node.node_id, entry.node_id);
assert.equal(
  onionEvidence.node.public_key_fingerprint_sha256,
  entry.public_key_fingerprint_sha256,
);
assert.equal(
  gitBlobSha1(onionEvidenceBytes),
  entry.trust_basis.onion_binding_evidence_blob_sha,
  "corroborating signed node-binding evidence blob changed",
);

const schema = readJson(SCHEMA_PATH);
assert.equal(
  schema.properties.marker.const,
  "VOID_PUBLIC_NODE_IDENTITY_TRUST_V1",
);
assert.equal(schema.properties.network.properties.chain_id.const, 2050);
assert.equal(
  schema.properties.authority.properties.work_credit_authority_granted.const,
  false,
);
assert.equal(
  schema.properties.authority.properties.funds_movement_authority_granted.const,
  false,
);

console.log(MARKER);
console.log(`registry_sha256=${EXPECTED_REGISTRY_SHA256}`);
console.log(`trusted_node_id=${entry.node_id}`);
console.log(
  `trusted_public_key_fingerprint_sha256=${entry.public_key_fingerprint_sha256}`,
);
console.log("corroborating_current_main_sources=3");
console.log("transport_neutral_trust_root=true");
console.log("caller_selectable_trust_root=false");
console.log("verification_only=true");
console.log("work_credit_mutation=false");
console.log("wallet_or_signer_access=false");
console.log("transaction_authority=false");
console.log("validator_authority=false");
console.log("treasury_or_liquidity_authority=false");
console.log("funds_movement=false");
