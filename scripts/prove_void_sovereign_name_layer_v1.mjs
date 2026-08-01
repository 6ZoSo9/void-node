#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  createHash,
  createPublicKey,
  generateKeyPairSync,
  sign,
  webcrypto,
} from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_MAINNET0_NAMESPACE_AUTHORITY_KEY_ID,
  VOID_SOVEREIGN_NAME_RECORD_MARKER,
  VOID_SOVEREIGN_NAME_SCHEMA,
  sovereignNameRecordSha256,
  sovereignNameRecordSigningBytes,
  verifyVoidSovereignNameRecord,
} from "../tools/lib/void-sovereign-name-layer-v1.mjs";

const ROOT = process.cwd();
const MODULE = path.join(
  ROOT,
  "tools/lib/void-sovereign-name-layer-v1.mjs",
);
const SCHEMA = path.join(
  ROOT,
  "schemas/void-sovereign-name-record-v1.schema.json",
);
const DOC = path.join(
  ROOT,
  "docs/public-node/void-sovereign-name-layer-v1.md",
);
const WORKFLOW = path.join(
  ROOT,
  ".github/workflows/void-sovereign-name-layer-v1.yml",
);
const OFFICIAL_AUTHENTICITY = path.join(
  ROOT,
  "public/.well-known/void-network-authenticity.json",
);

const NOW_MS = Date.parse("2026-08-01T19:10:00.000Z");
const ONION = `${"a".repeat(56)}.onion`;

function clone(value) {
  return structuredClone(value);
}

async function rejects(action, pattern) {
  await assert.rejects(action, pattern);
}

function keyProfile() {
  const pair = generateKeyPairSync("ed25519");
  const publicKeyPem = pair.publicKey.export({
    type: "spki",
    format: "pem",
  }).toString();
  const publicKeyDer = pair.publicKey.export({ type: "spki", format: "der" });
  const fingerprint = createHash("sha256").update(publicKeyDer).digest("hex");
  return {
    ...pair,
    publicKeyPem,
    fingerprint,
    keyId: `ed25519:${fingerprint}`,
  };
}

const namespaceKey = keyProfile();
const subjectKey = keyProfile();
const namespaceAuthority = {
  key_id: namespaceKey.keyId,
  public_key_pem: namespaceKey.publicKeyPem,
};

function buildRecord({
  sequence = 1,
  previousRecordSha256 = null,
  transports = [
    {
      kind: "https",
      endpoint: "https://zoso-precision.example",
      priority: 10,
      expires_at: new Date(NOW_MS + 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      kind: "tor-v3",
      endpoint: `http://${ONION}`,
      priority: 20,
      expires_at: new Date(NOW_MS + 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
} = {}) {
  const record = {
    $schema: VOID_SOVEREIGN_NAME_SCHEMA,
    marker: VOID_SOVEREIGN_NAME_RECORD_MARKER,
    version: 1,
    status: "active",
    issued_at: new Date(NOW_MS - 60_000).toISOString(),
    expires_at: new Date(NOW_MS + 7 * 24 * 60 * 60 * 1000).toISOString(),
    sequence,
    previous_record_sha256: previousRecordSha256,
    network: {
      name: "VOID Mainnet-0",
      chain_id: 2050,
      identity: "mainnet0",
      genesis_sha256:
        "22f42ef6cfa8e4ebfbc5ea98cdc536ec04c1bb4ddb15885b45b1ac02d0f122ab",
    },
    namespace: {
      name: "void",
      authority_key_id: namespaceKey.keyId,
    },
    name: {
      labels: ["zoso", "precision"],
      canonical: "void://zoso/precision",
    },
    subject: {
      identity: `voidid:ed25519:${subjectKey.fingerprint}`,
      node_id: createHash("sha256")
        .update("void-sovereign-name-layer-v1-subject")
        .digest("hex")
        .slice(0, 32),
      key_type: "ed25519",
      key_id: subjectKey.keyId,
      public_key_pem: subjectKey.publicKeyPem,
      public_key_fingerprint_sha256: subjectKey.fingerprint,
    },
    transports,
    authority: {
      name_resolution: true,
      source_origin_trusted: false,
      dns_control_required: false,
      transport_provider_authority: false,
      transaction_submission: false,
      payment_authority: false,
      wallet_or_signer_access: false,
      work_credit_write: false,
      void_settlement: false,
      node_runtime_mutation: false,
      operator_control: false,
      governance_mutation: false,
      fund_movement: false,
    },
    signature: {
      domain: VOID_SOVEREIGN_NAME_RECORD_MARKER,
      algorithm: "ed25519",
      encoding: "base64",
      canonicalization: "void-canonical-json-v1",
      key_id: namespaceKey.keyId,
      value: "",
    },
  };
  record.signature.value = sign(
    null,
    Buffer.from(sovereignNameRecordSigningBytes(record)),
    namespaceKey.privateKey,
  ).toString("base64");
  return record;
}

function verificationOptions(overrides = {}) {
  return {
    cryptoImpl: webcrypto,
    nowMs: NOW_MS,
    namespaceAuthority,
    expectedNamespaceAuthorityKeyId: namespaceKey.keyId,
    ...overrides,
  };
}

for (const file of [MODULE, SCHEMA, DOC, WORKFLOW, OFFICIAL_AUTHENTICITY]) {
  assert.ok(fs.statSync(file).isFile(), `missing required file: ${file}`);
}

const schema = JSON.parse(fs.readFileSync(SCHEMA, "utf8"));
assert.equal(schema.$id, VOID_SOVEREIGN_NAME_SCHEMA);
assert.equal(schema.properties?.marker?.const, VOID_SOVEREIGN_NAME_RECORD_MARKER);
assert.equal(schema.properties?.network?.properties?.chain_id?.const, 2050);
assert.equal(schema.properties?.namespace?.properties?.name?.const, "void");
assert.deepEqual(
  schema.properties?.transports?.items?.properties?.kind?.enum,
  ["https", "tor-v3"],
);
for (const key of [
  "source_origin_trusted",
  "dns_control_required",
  "transport_provider_authority",
  "transaction_submission",
  "payment_authority",
  "wallet_or_signer_access",
  "work_credit_write",
  "void_settlement",
  "node_runtime_mutation",
  "operator_control",
  "governance_mutation",
  "fund_movement",
]) {
  assert.equal(
    schema.properties?.authority?.properties?.[key]?.const,
    false,
    `schema authority.${key} must remain false`,
  );
}

const officialAuthenticity = JSON.parse(
  fs.readFileSync(OFFICIAL_AUTHENTICITY, "utf8"),
);
assert.equal(
  officialAuthenticity.verification?.key_id,
  VOID_MAINNET0_NAMESPACE_AUTHORITY_KEY_ID,
  "default namespace authority must be the admitted official network root",
);
const officialRootPublicDer = createPublicKey(
  officialAuthenticity.verification.public_key_pem,
).export({ type: "spki", format: "der" });
assert.equal(
  `ed25519:${createHash("sha256").update(officialRootPublicDer).digest("hex")}`,
  VOID_MAINNET0_NAMESPACE_AUTHORITY_KEY_ID,
  "official namespace root key ID must match its public key",
);

const record1 = buildRecord();
await rejects(
  () => verifyVoidSovereignNameRecord(record1, {
    cryptoImpl: webcrypto,
    nowMs: NOW_MS,
    namespaceAuthority,
  }),
  /namespace authority key mismatch/,
);
const verified1 = await verifyVoidSovereignNameRecord(
  record1,
  verificationOptions({
    expectedCanonicalName: "void://zoso/precision",
    expectedIdentity: record1.subject.identity,
    minimumSequence: 1,
    expectedPreviousRecordSha256: null,
  }),
);
assert.equal(verified1.canonical_name, "void://zoso/precision");
assert.equal(verified1.subject_identity, record1.subject.identity);
assert.equal(verified1.sequence, 1);
assert.equal(verified1.transports.length, 2);
assert.equal(verified1.authority.name_resolution, true);
assert.equal(verified1.authority.source_origin_trusted, false);
assert.equal(verified1.authority.fund_movement, false);

const record1Sha256 = await sovereignNameRecordSha256(record1, {
  cryptoImpl: webcrypto,
});
assert.match(record1Sha256, /^[0-9a-f]{64}$/);

const record2 = buildRecord({
  sequence: 2,
  previousRecordSha256: record1Sha256,
  transports: [
    {
      kind: "https",
      endpoint: "https://replacement-origin.example",
      priority: 10,
      expires_at: new Date(NOW_MS + 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      kind: "tor-v3",
      endpoint: `http://${ONION}`,
      priority: 20,
      expires_at: new Date(NOW_MS + 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
});
const verified2 = await verifyVoidSovereignNameRecord(
  record2,
  verificationOptions({
    expectedIdentity: record1.subject.identity,
    minimumSequence: 2,
    expectedPreviousRecordSha256: record1Sha256,
  }),
);
assert.equal(verified2.subject_identity, verified1.subject_identity);
assert.notEqual(
  verified2.transports[0].endpoint,
  verified1.transports[0].endpoint,
  "transport must rotate without changing sovereign identity",
);

await rejects(
  () => verifyVoidSovereignNameRecord(
    record1,
    verificationOptions({ minimumSequence: 2 }),
  ),
  /sequence rollback rejected/,
);

await rejects(
  () => verifyVoidSovereignNameRecord(
    record2,
    verificationOptions({ expectedPreviousRecordSha256: "f".repeat(64) }),
  ),
  /hash chain mismatch/,
);

const tamperedEndpoint = clone(record2);
tamperedEndpoint.transports[0].endpoint = "https://counterfeit.example";
await rejects(
  () => verifyVoidSovereignNameRecord(tamperedEndpoint, verificationOptions()),
  /signature verification failed/,
);

const elevated = clone(record1);
elevated.authority.payment_authority = true;
await rejects(
  () => verifyVoidSovereignNameRecord(elevated, verificationOptions()),
  /authority.payment_authority mismatch/,
);

const pathEndpoint = clone(record1);
pathEndpoint.transports[0].endpoint = "https://zoso-precision.example/hidden";
await rejects(
  () => verifyVoidSovereignNameRecord(pathEndpoint, verificationOptions()),
  /canonical default-port origin/,
);

const duplicatePriority = clone(record1);
duplicatePriority.transports[1].priority = 10;
await rejects(
  () => verifyVoidSovereignNameRecord(duplicatePriority, verificationOptions()),
  /priorities must be unique and strictly increasing/,
);

const wrongCanonicalName = clone(record1);
wrongCanonicalName.name.canonical = "void://counterfeit/precision";
await rejects(
  () => verifyVoidSovereignNameRecord(wrongCanonicalName, verificationOptions()),
  /canonical name mismatch/,
);

const wrongSubjectIdentity = clone(record1);
wrongSubjectIdentity.subject.identity = `voidid:ed25519:${"f".repeat(64)}`;
await rejects(
  () => verifyVoidSovereignNameRecord(wrongSubjectIdentity, verificationOptions()),
  /self-certifying identity mismatch/,
);

const wrongAuthority = keyProfile();
await rejects(
  () => verifyVoidSovereignNameRecord(record1, {
    ...verificationOptions(),
    namespaceAuthority: {
      key_id: wrongAuthority.keyId,
      public_key_pem: wrongAuthority.publicKeyPem,
    },
  }),
  /namespace authority key mismatch/,
);

const expired = clone(record1);
await rejects(
  () => verifyVoidSovereignNameRecord(
    expired,
    verificationOptions({ nowMs: NOW_MS + 8 * 24 * 60 * 60 * 1000 }),
  ),
  /record is expired/,
);

const unknownField = clone(record1);
unknownField.dns_registration = true;
await rejects(
  () => verifyVoidSovereignNameRecord(unknownField, verificationOptions()),
  /record keys mismatch/,
);

const source = fs.readFileSync(MODULE, "utf8");
for (const forbidden of [
  /\bfetch\s*\(/,
  /XMLHttpRequest/,
  /BEGIN PRIVATE KEY/,
  /mnemonic/i,
  /seed[_-]?phrase/i,
  /systemctl/,
  /child_process/,
]) {
  assert.equal(
    forbidden.test(source),
    false,
    `verifier contains forbidden source pattern: ${forbidden}`,
  );
}

const documentation = fs.readFileSync(DOC, "utf8");
for (const required of [
  "contract-only",
  VOID_SOVEREIGN_NAME_RECORD_MARKER,
  VOID_SOVEREIGN_NAME_SCHEMA,
  "void://zoso/precision",
  "transport is not identity",
  "No private key",
  "no deployment",
  "ZoSo",
]) {
  assert.ok(documentation.includes(required), `documentation missing: ${required}`);
}

console.log("VOID_SOVEREIGN_NAME_LAYER_V1_PROOF_GREEN");
console.log("canonical_name=void://zoso/precision");
console.log(`subject_identity=${verified1.subject_identity}`);
console.log(`record_1_sha256=${record1Sha256}`);
console.log("namespace_authority=official_network_root_default");
console.log("schema_identifier=domain_independent_urn");
console.log("transport_rotation_preserves_identity=true");
console.log("sequence_rollback_rejected=true");
console.log("record_hash_chain_verified=true");
console.log("tampered_transport_rejected=true");
console.log("source_origin_trusted=false");
console.log("dns_control_required=false");
console.log("transport_provider_authority=false");
console.log("live_name_record_created=false");
console.log("private_key_access=false");
console.log("deployment=false");
console.log("runtime_mutation=false");
console.log("payment_authority=false");
console.log("fund_movement=false");
