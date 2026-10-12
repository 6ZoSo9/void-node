#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  buildVoidSovereignNameSigningRequest,
  verifyVoidSovereignNameSigningRequest,
} from "../tools/void-sovereign-name-signing-request-v1.mjs";
import {
  sovereignNameRecordSigningBytes,
  verifyVoidSovereignNameRecord,
} from "../tools/lib/void-sovereign-name-layer-v1.mjs";

const ROOT = process.cwd();
const TOOL = path.join(ROOT, "tools/void-sovereign-name-signing-request-v1.mjs");
const OFFICIAL_AUTHORITY_PATH = path.join(
  ROOT,
  "config/official-network-authenticity-root-v2-1/official-network-authenticity-root-v2.json",
);
const PRECISION_BINDING_PATH = path.join(
  ROOT,
  "public/public-node/evidence/void-node-onion-binding-v1-nimo-verified.json",
);

function clone(value) {
  return structuredClone(value);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function keyIdentity(publicKey) {
  const public_key_pem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const der = publicKey.export({ type: "spki", format: "der" });
  const fingerprint = sha256(der);
  return { public_key_pem, fingerprint, key_id: `ed25519:${fingerprint}` };
}

function throwsHold(callback, pattern) {
  assert.throws(callback, pattern);
}

const authorityArtifact = JSON.parse(await readFile(OFFICIAL_AUTHORITY_PATH, "utf8"));
const precisionBinding = JSON.parse(await readFile(PRECISION_BINDING_PATH, "utf8"));
const fixedIssuedAt = "2026-08-01T20:00:00.000Z";
const fixedExpiresAt = "2027-01-26T08:39:09.089Z";
const precisionInput = {
  name: "void://zoso/precision",
  sequence: 1,
  previous_record_sha256: null,
  issued_at: fixedIssuedAt,
  expires_at: fixedExpiresAt,
  subject: {
    node_id: precisionBinding.node.node_id,
    public_key_pem: precisionBinding.node.public_key_pem,
  },
  transports: [
    {
      kind: "https",
      endpoint: "https://zoso-precision-tower-7810.taila47fd.ts.net",
      priority: 0,
      expires_at: fixedExpiresAt,
    },
    {
      kind: "tor-v3",
      endpoint: precisionBinding.transport.uri,
      priority: 10,
      expires_at: fixedExpiresAt,
    },
  ],
  namespace_authority: {
    key_id: authorityArtifact.key_id,
    public_key_pem: authorityArtifact.public_key_pem,
  },
};

const work = await mkdtemp(path.join(tmpdir(), "void-sovereign-name-signing-request-v1-"));
const inputPath = path.join(work, "precision-input.json");
const outputOne = path.join(work, "precision-request-one.json");
const outputTwo = path.join(work, "precision-request-two.json");
await writeFile(inputPath, `${JSON.stringify(precisionInput, null, 2)}\n`, "utf8");

const firstBuild = spawnSync(process.execPath, [TOOL, "build", inputPath, outputOne], {
  cwd: ROOT,
  encoding: "utf8",
});
assert.equal(firstBuild.status, 0, firstBuild.stderr);
assert.match(firstBuild.stdout, /^VOID_SOVEREIGN_NAME_SIGNING_REQUEST_V1$/m);
assert.match(firstBuild.stdout, /^canonical_name=void:\/\/zoso\/precision$/m);
assert.match(firstBuild.stdout, /^private_key_access=false$/m);
assert.match(firstBuild.stdout, /^signature_created=false$/m);

const secondBuild = spawnSync(process.execPath, [TOOL, "build", inputPath, outputTwo], {
  cwd: ROOT,
  encoding: "utf8",
});
assert.equal(secondBuild.status, 0, secondBuild.stderr);
assert.equal(await readFile(outputOne, "utf8"), await readFile(outputTwo, "utf8"));

const verifyCli = spawnSync(process.execPath, [TOOL, "verify", outputOne], {
  cwd: ROOT,
  encoding: "utf8",
});
assert.equal(verifyCli.status, 0, verifyCli.stderr);
assert.match(verifyCli.stdout, /^VOID_SOVEREIGN_NAME_SIGNING_REQUEST_V1_VERIFIED$/m);
assert.match(verifyCli.stdout, /^transport_count=2$/m);

const overwrite = spawnSync(process.execPath, [TOOL, "build", inputPath, outputOne], {
  cwd: ROOT,
  encoding: "utf8",
});
assert.notEqual(overwrite.status, 0);
assert.match(overwrite.stderr, /refusing to overwrite existing output/);

const precisionRequest = JSON.parse(await readFile(outputOne, "utf8"));
const precisionSummary = verifyVoidSovereignNameSigningRequest(precisionRequest);
assert.equal(precisionSummary.canonical_name, "void://zoso/precision");
assert.equal(precisionSummary.subject_node_id, "9d89483769e469e0473b489dc50dba96");
assert.equal(
  precisionSummary.subject_identity,
  "voidid:ed25519:2f52b928cb00bf309510d1edef299554277fba6d52bfd1ddb52b9b015397c50b",
);
assert.equal(precisionSummary.namespace_authority_key_id, authorityArtifact.key_id);
assert.equal(precisionSummary.transport_count, 2);
assert.equal(precisionRequest.unsigned_record.signature.value, null);
assert.ok(!JSON.stringify(precisionRequest).includes("BEGIN PRIVATE KEY"));
const precisionPayload = Buffer.from(precisionRequest.signing.payload_base64, "base64");
assert.equal(sha256(precisionPayload), precisionRequest.signing.payload_sha256);
assert.deepEqual(
  precisionPayload,
  Buffer.from(sovereignNameRecordSigningBytes(precisionRequest.unsigned_record)),
);
assert.equal(
  precisionPayload.subarray(0, "VOID_SOVEREIGN_NAME_RECORD_V1\0".length).toString(),
  "VOID_SOVEREIGN_NAME_RECORD_V1\0",
);

const tamperedEndpoint = clone(precisionRequest);
tamperedEndpoint.unsigned_record.transports[0].endpoint = "https://attacker.example";
throwsHold(
  () => verifyVoidSovereignNameSigningRequest(tamperedEndpoint),
  /deterministic signing payload/,
);

const tamperedPayload = clone(precisionRequest);
tamperedPayload.signing.payload_base64 = Buffer.from("counterfeit").toString("base64");
throwsHold(
  () => verifyVoidSovereignNameSigningRequest(tamperedPayload),
  /deterministic signing payload/,
);

const tamperedRequestId = clone(precisionRequest);
tamperedRequestId.request_id = `voidsnsr1_${"0".repeat(64)}`;
throwsHold(
  () => verifyVoidSovereignNameSigningRequest(tamperedRequestId),
  /deterministic signing payload/,
);

const secretlySigned = clone(precisionRequest);
secretlySigned.unsigned_record.signature.value = "not-allowed";
throwsHold(
  () => verifyVoidSovereignNameSigningRequest(secretlySigned),
  /must not contain a signature value/,
);

const escalated = clone(precisionRequest);
escalated.authority.wallet_or_signer_access = true;
throwsHold(
  () => verifyVoidSovereignNameSigningRequest(escalated),
  /authority\.wallet_or_signer_access mismatch/,
);

const privateInput = clone(precisionInput);
privateInput.private_key_pem = "forbidden";
throwsHold(
  () => buildVoidSovereignNameSigningRequest(privateInput),
  /input keys mismatch/,
);

const nonCanonicalOrigin = clone(precisionInput);
nonCanonicalOrigin.transports[0].endpoint =
  "https://zoso-precision-tower-7810.taila47fd.ts.net/";
throwsHold(
  () => buildVoidSovereignNameSigningRequest(nonCanonicalOrigin),
  /canonical default-port origin/,
);

const duplicatePriority = clone(precisionInput);
duplicatePriority.transports[1].priority = 0;
throwsHold(
  () => buildVoidSovereignNameSigningRequest(duplicatePriority),
  /priorities must be unique and strictly increasing/,
);

const namespacePair = generateKeyPairSync("ed25519");
const subjectPair = generateKeyPairSync("ed25519");
const namespaceIdentity = keyIdentity(namespacePair.publicKey);
const subjectIdentity = keyIdentity(subjectPair.publicKey);
const ephemeralInput = {
  name: "void://proof/ephemeral",
  sequence: 1,
  previous_record_sha256: null,
  issued_at: "2026-08-01T20:00:00.000Z",
  expires_at: "2026-08-02T20:00:00.000Z",
  subject: {
    node_id: sha256(subjectPair.publicKey.export({ type: "spki", format: "der" })).slice(0, 32),
    public_key_pem: subjectIdentity.public_key_pem,
  },
  transports: [
    {
      kind: "https",
      endpoint: "https://proof.example",
      priority: 0,
      expires_at: "2026-08-02T20:00:00.000Z",
    },
  ],
  namespace_authority: {
    key_id: namespaceIdentity.key_id,
    public_key_pem: namespaceIdentity.public_key_pem,
  },
};
const ephemeralOptions = {
  expectedNamespaceAuthorityKeyId: namespaceIdentity.key_id,
};
const ephemeralRequest = buildVoidSovereignNameSigningRequest(
  ephemeralInput,
  ephemeralOptions,
);
verifyVoidSovereignNameSigningRequest(ephemeralRequest, ephemeralOptions);
const signature = sign(
  null,
  Buffer.from(ephemeralRequest.signing.payload_base64, "base64"),
  namespacePair.privateKey,
).toString("base64");
const completedRecord = clone(ephemeralRequest.unsigned_record);
completedRecord.signature.value = signature;
const completed = await verifyVoidSovereignNameRecord(completedRecord, {
  namespaceAuthority: ephemeralInput.namespace_authority,
  expectedNamespaceAuthorityKeyId: namespaceIdentity.key_id,
  expectedCanonicalName: ephemeralInput.name,
  expectedIdentity: `voidid:ed25519:${subjectIdentity.fingerprint}`,
  nowMs: Date.parse("2026-08-01T21:00:00.000Z"),
});
assert.equal(completed.canonical_name, ephemeralInput.name);

console.log("VOID_SOVEREIGN_NAME_SIGNING_REQUEST_V1_PROOF_GREEN");
console.log(`request_id=${precisionSummary.request_id}`);
console.log(`canonical_name=${precisionSummary.canonical_name}`);
console.log(`subject_identity=${precisionSummary.subject_identity}`);
console.log(`namespace_authority_key_id=${precisionSummary.namespace_authority_key_id}`);
console.log(`transport_count=${precisionSummary.transport_count}`);
console.log(`payload_sha256=${precisionSummary.payload_sha256}`);
console.log("deterministic_output=true");
console.log("tampered_payload_rejected=true");
console.log("tampered_transport_rejected=true");
console.log("authority_escalation_rejected=true");
console.log("completed_signature_verifies=true");
console.log("private_key_access=false");
console.log("signature_created_for_live_record=false");
console.log("live_name_record_created=false");
console.log("publication=false");
console.log("deployment=false");
console.log("runtime_mutation=false");
console.log("payment_authority=false");
console.log("fund_movement=false");
