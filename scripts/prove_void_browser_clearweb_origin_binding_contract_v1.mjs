#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  createHash,
  generateKeyPairSync,
  sign,
  webcrypto,
} from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  CLEARWEB_ORIGIN_BINDING_MARKER,
  CLEARWEB_ORIGIN_BINDING_PATH,
  clearwebOriginBindingSigningBytes,
  verifySignedClearwebOriginBinding,
} from "../integrations/browser/void-browser-agent-access-kit-v1/clearweb-origin-binding-v1.mjs";

const ROOT = process.cwd();
const MODULE = path.join(
  ROOT,
  "integrations/browser/void-browser-agent-access-kit-v1/clearweb-origin-binding-v1.mjs",
);
const MANIFEST = path.join(
  ROOT,
  "integrations/browser/void-browser-agent-access-kit-v1/manifest.json",
);
const CORE = path.join(
  ROOT,
  "integrations/browser/void-browser-agent-access-kit-v1/core.mjs",
);
const SCHEMA = path.join(
  ROOT,
  "schemas/void-browser-clearweb-origin-binding-v1.schema.json",
);
const DOC = path.join(
  ROOT,
  "docs/public-node/void-browser-clearweb-origin-binding-contract-v1.md",
);
const WORKFLOW = path.join(
  ROOT,
  ".github/workflows/void-browser-clearweb-origin-binding-contract-v1.yml",
);

function clone(value) {
  return structuredClone(value);
}

async function rejects(action, pattern) {
  await assert.rejects(action, pattern);
}

function fixture(nowMs) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey.export({
    type: "spki",
    format: "pem",
  }).toString();
  const publicKeyDer = publicKey.export({ type: "spki", format: "der" });
  const fingerprint = createHash("sha256").update(publicKeyDer).digest("hex");
  const nodeId = createHash("sha256")
    .update("void-browser-clearweb-origin-binding-contract-v1")
    .digest("hex")
    .slice(0, 32);
  const onionHostname = `${"a".repeat(56)}.onion`;
  const onionBindingSha256 = createHash("sha256")
    .update("reviewed-onion-binding-fixture")
    .digest("hex");
  const onionBindingExpiresAt = new Date(
    nowMs + 24 * 60 * 60 * 1000,
  ).toISOString();
  const binding = {
    $schema:
      "https://voidchain.io/schemas/void-browser-clearweb-origin-binding-v1.schema.json",
    marker: CLEARWEB_ORIGIN_BINDING_MARKER,
    version: 1,
    status: "active",
    issued_at: new Date(nowMs - 60_000).toISOString(),
    expires_at: new Date(nowMs + 60 * 60 * 1000).toISOString(),
    network: {
      name: "VOID Mainnet-0",
      chain_id: 2050,
      identity: "mainnet0",
    },
    origin: {
      value: "https://node.example",
      scheme: "https",
      host: "node.example",
      port: 443,
    },
    node: {
      node_id: nodeId,
      key_type: "ed25519",
      public_key_pem: publicKeyPem,
      public_key_fingerprint_sha256: fingerprint,
    },
    onion_identity: {
      onion_hostname: onionHostname,
      binding_sha256: onionBindingSha256,
      binding_expires_at: onionBindingExpiresAt,
    },
    surface: {
      binding_path: CLEARWEB_ORIGIN_BINDING_PATH,
      well_known_discovery_path: "/.well-known/void-agent-discovery.json",
      canonical_discovery_path: "/public-node/agents/discovery-v1.json",
      capability_negotiation_path: "/public-node/agents/capabilities-v1.json",
      methods: ["GET", "HEAD"],
      same_origin_only: true,
    },
    authority: {
      read_only: true,
      transaction_submission: false,
      payment_authority: false,
      wallet_or_signer_access: false,
      work_credit_write: false,
      void_settlement: false,
      node_runtime_mutation: false,
      operator_control: false,
    },
    signature: {
      domain: CLEARWEB_ORIGIN_BINDING_MARKER,
      algorithm: "ed25519",
      encoding: "base64",
      canonicalization: "void-canonical-json-v1",
      key_id: `ed25519:${fingerprint}`,
      value: "",
    },
  };
  binding.signature.value = sign(
    null,
    Buffer.from(clearwebOriginBindingSigningBytes(binding)),
    privateKey,
  ).toString("base64");
  const trustPins = {
    marker: "VOID_BROWSER_AGENT_TRUST_PINS_V1",
    version: 1,
    network: { chain_id: 2050, identity: "mainnet0" },
    source: {
      repository: "6ZoSo9/void-node",
      base_commit: "1".repeat(40),
      profile_path: "config/void-tor-agent-access-client-v1.json",
    },
    trust: {
      onion_hostname: onionHostname,
      node_id: nodeId,
      public_key_fingerprint_sha256: fingerprint,
      binding_sha256: onionBindingSha256,
      binding_expires_at: onionBindingExpiresAt,
    },
  };
  return { binding, privateKey, trustPins };
}

for (const file of [MODULE, MANIFEST, CORE, SCHEMA, DOC, WORKFLOW]) {
  assert.ok(fs.statSync(file).isFile(), `missing required file: ${file}`);
}

const schema = JSON.parse(fs.readFileSync(SCHEMA, "utf8"));
assert.equal(
  schema.$id,
  "https://voidchain.io/schemas/void-browser-clearweb-origin-binding-v1.schema.json",
);
assert.equal(schema.properties?.marker?.const, CLEARWEB_ORIGIN_BINDING_MARKER);
assert.equal(schema.properties?.network?.properties?.chain_id?.const, 2050);
assert.equal(schema.properties?.origin?.properties?.scheme?.const, "https");
assert.deepEqual(
  schema.properties?.surface?.properties?.methods?.const,
  ["GET", "HEAD"],
);
for (const key of [
  "transaction_submission",
  "payment_authority",
  "wallet_or_signer_access",
  "work_credit_write",
  "void_settlement",
  "node_runtime_mutation",
  "operator_control",
]) {
  assert.equal(
    schema.properties?.authority?.properties?.[key]?.const,
    false,
    `schema authority.${key} must remain false`,
  );
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
assert.deepEqual(manifest.optional_host_permissions, ["http://*.onion/*"]);
const coreSource = fs.readFileSync(CORE, "utf8");
assert.match(coreSource, /signed onion identity requires a direct onion endpoint/);
assert.doesNotMatch(coreSource, /clearweb-origin-binding-v1/);

const nowMs = Date.parse("2026-08-01T17:30:00.000Z");
const { binding, privateKey, trustPins } = fixture(nowMs);
const verified = await verifySignedClearwebOriginBinding(
  binding,
  "https://node.example/",
  { cryptoImpl: webcrypto, nowMs, trustPins },
);
assert.equal(verified.origin, "https://node.example");
assert.equal(verified.node_id, trustPins.trust.node_id);
assert.equal(
  verified.public_key_fingerprint_sha256,
  trustPins.trust.public_key_fingerprint_sha256,
);
assert.equal(verified.onion_hostname, trustPins.trust.onion_hostname);
assert.equal(verified.onion_binding_sha256, trustPins.trust.binding_sha256);
assert.equal(verified.authority.read_only, true);
assert.equal(verified.authority.payment_authority, false);
assert.equal(verified.authority.operator_control, false);

await rejects(
  () => verifySignedClearwebOriginBinding(
    binding,
    "https://counterfeit.example",
    { cryptoImpl: webcrypto, nowMs, trustPins },
  ),
  /does not match the signed clearweb origin/,
);
await rejects(
  () => verifySignedClearwebOriginBinding(
    binding,
    "https://node.example/hidden",
    { cryptoImpl: webcrypto, nowMs, trustPins },
  ),
  /without credentials or a path/,
);
await rejects(
  () => verifySignedClearwebOriginBinding(
    binding,
    "http://node.example",
    { cryptoImpl: webcrypto, nowMs, trustPins },
  ),
  /default-port HTTPS origin/,
);

const elevated = clone(binding);
elevated.authority.payment_authority = true;
await rejects(
  () => verifySignedClearwebOriginBinding(
    elevated,
    elevated.origin.value,
    { cryptoImpl: webcrypto, nowMs, trustPins },
  ),
  /authority.payment_authority/,
);

const crossOriginDiscovery = clone(binding);
crossOriginDiscovery.surface.well_known_discovery_path =
  "//counterfeit.example/discovery.json";
await rejects(
  () => verifySignedClearwebOriginBinding(
    crossOriginDiscovery,
    crossOriginDiscovery.origin.value,
    { cryptoImpl: webcrypto, nowMs, trustPins },
  ),
  /canonical same-origin path/,
);

const wrongPins = clone(trustPins);
wrongPins.trust.binding_sha256 = "f".repeat(64);
await rejects(
  () => verifySignedClearwebOriginBinding(
    binding,
    binding.origin.value,
    { cryptoImpl: webcrypto, nowMs, trustPins: wrongPins },
  ),
  /canonical VOID trust pins/,
);

const tamperedOrigin = clone(binding);
tamperedOrigin.origin.value = "https://tampered.example";
tamperedOrigin.origin.host = "tampered.example";
await rejects(
  () => verifySignedClearwebOriginBinding(
    tamperedOrigin,
    tamperedOrigin.origin.value,
    { cryptoImpl: webcrypto, nowMs, trustPins },
  ),
  /signature verification failed/,
);

const expired = clone(binding);
await rejects(
  () => verifySignedClearwebOriginBinding(
    expired,
    expired.origin.value,
    { cryptoImpl: webcrypto, nowMs: nowMs + 2 * 60 * 60 * 1000, trustPins },
  ),
  /binding is expired/,
);

const outlivesOnion = clone(binding);
outlivesOnion.expires_at = new Date(nowMs + 48 * 60 * 60 * 1000).toISOString();
outlivesOnion.signature.value = sign(
  null,
  Buffer.from(clearwebOriginBindingSigningBytes(outlivesOnion)),
  privateKey,
).toString("base64");
await rejects(
  () => verifySignedClearwebOriginBinding(
    outlivesOnion,
    outlivesOnion.origin.value,
    { cryptoImpl: webcrypto, nowMs, trustPins },
  ),
  /outlives the pinned onion identity/,
);

const unknownField = clone(binding);
unknownField.activation = true;
await rejects(
  () => verifySignedClearwebOriginBinding(
    unknownField,
    unknownField.origin.value,
    { cryptoImpl: webcrypto, nowMs, trustPins },
  ),
  /binding keys mismatch/,
);

const moduleSource = fs.readFileSync(MODULE, "utf8");
for (const forbidden of [
  /\bfetch\s*\(/,
  /XMLHttpRequest/,
  /storage\.local/,
  /permissions\.request/,
  /BEGIN PRIVATE KEY/,
  /mnemonic/i,
  /seed[_-]?phrase/i,
]) {
  assert.equal(
    forbidden.test(moduleSource),
    false,
    `verifier contains forbidden source pattern: ${forbidden}`,
  );
}

const documentation = fs.readFileSync(DOC, "utf8");
for (const required of [
  "contract-only",
  CLEARWEB_ORIGIN_BINDING_MARKER,
  CLEARWEB_ORIGIN_BINDING_PATH,
  "does not activate clearweb access",
  "existing VOID node identity",
  "No private key",
  "no deployment",
]) {
  assert.ok(documentation.includes(required), `documentation missing: ${required}`);
}

console.log("VOID_BROWSER_CLEARWEB_ORIGIN_BINDING_CONTRACT_V1_PROOF_GREEN");
console.log("schema_exact=true");
console.log("ed25519_signature_verified=true");
console.log("exact_https_origin_bound=true");
console.log("clearweb_replay_rejected=true");
console.log("onion_identity_cross_bound=true");
console.log("discovery_paths_same_origin=true");
console.log("current_extension_onion_only=true");
console.log("live_binding_created=false");
console.log("private_key_access=false");
console.log("deployment=false");
console.log("mutation=false");
console.log("payment_authority=false");
console.log("fund_movement=false");
