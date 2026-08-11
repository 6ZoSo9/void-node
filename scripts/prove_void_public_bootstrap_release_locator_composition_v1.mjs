#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  VOID_BOOTSTRAP_RECORD_RELEASE_ROOT_SCHEMA_V1,
  VOID_BOOTSTRAP_RECORD_SIGNATURE_DOMAIN_V1,
  VOID_BOOTSTRAP_RECORD_SIGNED_ID_SCHEMA_V1,
  voidBootstrapRecordReleaseKeyIdV1,
  voidBootstrapRecordReleaseRootIdV1,
  voidBootstrapRecordSigningPayloadV1,
} from "./lib/void_bootstrap_record_release_root_v1.mjs";
import {
  buildBootstrapRecordV2,
} from "./lib/void_public_bootstrap_record_v2_mirror_contract_v1.mjs";
import {
  VOID_PUBLIC_BOOTSTRAP_RELEASE_LOCATOR_COMPOSITION_V1,
  resolveVoidPublicBootstrapFromReleaseRootV1,
} from "./lib/void_public_bootstrap_release_locator_composition_v1.mjs";

const MARKER =
  "VOID_PUBLIC_BOOTSTRAP_RELEASE_LOCATOR_COMPOSITION_V1_PROOF_GREEN";
const NOW = Date.parse("2026-08-11T04:00:00.000Z");
const AUTHORITY = Object.freeze({
  private_routes_exposed: false,
  wallet_authority: false,
  signer_authority: false,
  validator_authority: false,
  treasury_authority: false,
  work_credit_authority: false,
  money_movement_authority: false,
});

function base32NoPadding(bytes) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz234567";
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += alphabet[(value >>> bits) & 31];
      value &= (1 << bits) - 1;
    }
  }
  if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}

function torV3Hostname(label) {
  const publicKey = crypto
    .createHash("sha256")
    .update(`void-bootstrap-release-composition:${label}`)
    .digest()
    .subarray(0, 32);
  const checksum = crypto
    .createHash("sha3-256")
    .update(Buffer.from(".onion checksum", "ascii"))
    .update(publicKey)
    .update(Buffer.from([3]))
    .digest()
    .subarray(0, 2);
  return `${base32NoPadding(Buffer.concat([
    publicKey,
    checksum,
    Buffer.from([3]),
  ]))}.onion`;
}

function publicKeyEntry(publicKey) {
  const der = publicKey.export({ type: "spki", format: "der" });
  return Object.freeze({
    key_id: voidBootstrapRecordReleaseKeyIdV1(der),
    algorithm: "ed25519",
    public_key_spki_base64: Buffer.from(der).toString("base64"),
  });
}

function activeRoot(keyEntries, threshold) {
  const root = {
    schema: VOID_BOOTSTRAP_RECORD_RELEASE_ROOT_SCHEMA_V1,
    network: "VOID Network",
    chain_id: 2050,
    status: "active",
    signature_domain: VOID_BOOTSTRAP_RECORD_SIGNATURE_DOMAIN_V1,
    threshold,
    keys: [...keyEntries].sort((a, b) => a.key_id.localeCompare(b.key_id)),
    authority: AUTHORITY,
    root_id: "",
  };
  root.root_id = voidBootstrapRecordReleaseRootIdV1(root);
  return root;
}

function signedEnvelope(root, recordId, signers) {
  const payload = voidBootstrapRecordSigningPayloadV1(root, recordId);
  return Object.freeze({
    schema: VOID_BOOTSTRAP_RECORD_SIGNED_ID_SCHEMA_V1,
    root_id: root.root_id,
    record_id: recordId,
    signatures: signers
      .map(({ keyId, privateKey }) => ({
        key_id: keyId,
        signature_base64: crypto
          .sign(null, payload, privateKey)
          .toString("base64"),
      }))
      .sort((a, b) => a.key_id.localeCompare(b.key_id)),
  });
}

async function expectReject(run, pattern) {
  let failure;
  try {
    await run();
  } catch (error) {
    failure = error;
  }
  assert(failure, "expected composition to reject");
  assert.match(String(failure.message || failure), pattern);
}

const internalMirrors = [
  {
    transport: "https",
    base_url: "https://manifest-a.example/void/bootstrap/v2",
    failure_domain: "manifest-a",
  },
  {
    transport: "https",
    base_url: "https://manifest-b.example/void/bootstrap/v2",
    failure_domain: "manifest-b",
  },
  {
    transport: "tor_http",
    base_url: `http://${torV3Hostname("manifest-tor")}/void/bootstrap/v2`,
    failure_domain: "manifest-tor",
  },
];
const locatorMirrors = [
  {
    transport: "https",
    base_url: "https://locator-a.example/void/bootstrap/v2",
    failure_domain: "locator-a",
  },
  {
    transport: "https",
    base_url: "https://locator-b.example/void/bootstrap/v2",
    failure_domain: "locator-b",
  },
  {
    transport: "tor_http",
    base_url: `http://${torV3Hostname("locator-tor")}/void/bootstrap/v2`,
    failure_domain: "locator-tor",
  },
];

const manifestBytes = fs.readFileSync("public/bootstrap/v1.json");
const record = buildBootstrapRecordV2({
  manifestBytes,
  mirrors: internalMirrors,
  generatedAt: new Date(NOW - 60_000).toISOString(),
  expiresAt: new Date(NOW + 3 * 60 * 60 * 1000).toISOString(),
});
const alternateRecord = buildBootstrapRecordV2({
  manifestBytes,
  mirrors: internalMirrors,
  generatedAt: new Date(NOW - 120_000).toISOString(),
  expiresAt: new Date(NOW + 4 * 60 * 60 * 1000).toISOString(),
});
assert.notEqual(record.record_id, alternateRecord.record_id);

const first = crypto.generateKeyPairSync("ed25519");
const second = crypto.generateKeyPairSync("ed25519");
const firstEntry = publicKeyEntry(first.publicKey);
const secondEntry = publicKeyEntry(second.publicKey);
const releaseRoot = activeRoot([firstEntry, secondEntry], 2);
const signedRecordId = signedEnvelope(releaseRoot, record.record_id, [
  { keyId: firstEntry.key_id, privateKey: first.privateKey },
  { keyId: secondEntry.key_id, privateKey: second.privateKey },
]);

let recordFetchCount = 0;
let manifestFetchCount = 0;
const resolved = await resolveVoidPublicBootstrapFromReleaseRootV1({
  releaseRoot,
  signedRecordId,
  locatorMirrors,
  nowMs: NOW,
  async fetchRecordBytes({ mirror }) {
    recordFetchCount += 1;
    if (mirror.failure_domain === "locator-a") {
      throw new Error("synthetic locator outage");
    }
    return `${JSON.stringify(record)}\n`;
  },
  async fetchManifestBytes({ mirror }) {
    manifestFetchCount += 1;
    if (mirror.failure_domain === "manifest-a") {
      throw new Error("synthetic manifest mirror outage");
    }
    return manifestBytes;
  },
});

assert.equal(
  resolved.marker,
  VOID_PUBLIC_BOOTSTRAP_RELEASE_LOCATOR_COMPOSITION_V1,
);
assert.equal(resolved.release_root_id, releaseRoot.root_id);
assert.equal(resolved.release_threshold, 2);
assert.equal(resolved.valid_record_id_signature_count, 2);
assert.equal(resolved.record_id, record.record_id);
assert.equal(resolved.manifest_id, record.manifest.manifest_id);
assert.equal(resolved.record_locator.failure_domain, "locator-b");
assert.equal(resolved.manifest_locator.failure_domain, "manifest-b");
assert.equal(recordFetchCount, 2);
assert.equal(manifestFetchCount, 2);
assert.equal(resolved.transport_is_authority, false);
assert.equal(resolved.network_io_implemented, false);
assert.equal(resolved.launcher_activation_performed, false);
assert(Object.isFrozen(resolved));
assert(Object.isFrozen(resolved.manifest));
assert(Object.isFrozen(resolved.manifest.authority));

const productionHoldRoot = JSON.parse(
  fs.readFileSync("config/void-bootstrap-record-release-root-v1.json", "utf8"),
);
let forbiddenFetchCount = 0;
await expectReject(
  () =>
    resolveVoidPublicBootstrapFromReleaseRootV1({
      releaseRoot: productionHoldRoot,
      signedRecordId,
      locatorMirrors,
      nowMs: NOW,
      async fetchRecordBytes() {
        forbiddenFetchCount += 1;
        return JSON.stringify(record);
      },
      async fetchManifestBytes() {
        forbiddenFetchCount += 1;
        return manifestBytes;
      },
    }),
  /hold state/,
);
assert.equal(forbiddenFetchCount, 0);

const tamperedEnvelope = structuredClone(signedRecordId);
tamperedEnvelope.record_id = alternateRecord.record_id;
await expectReject(
  () =>
    resolveVoidPublicBootstrapFromReleaseRootV1({
      releaseRoot,
      signedRecordId: tamperedEnvelope,
      locatorMirrors,
      nowMs: NOW,
      async fetchRecordBytes() {
        forbiddenFetchCount += 1;
        return JSON.stringify(alternateRecord);
      },
      async fetchManifestBytes() {
        forbiddenFetchCount += 1;
        return manifestBytes;
      },
    }),
  /signature verification failed/,
);
assert.equal(forbiddenFetchCount, 0);

const belowThreshold = structuredClone(signedRecordId);
belowThreshold.signatures = belowThreshold.signatures.slice(0, 1);
await expectReject(
  () =>
    resolveVoidPublicBootstrapFromReleaseRootV1({
      releaseRoot,
      signedRecordId: belowThreshold,
      locatorMirrors,
      nowMs: NOW,
      async fetchRecordBytes() {
        forbiddenFetchCount += 1;
        return JSON.stringify(record);
      },
      async fetchManifestBytes() {
        forbiddenFetchCount += 1;
        return manifestBytes;
      },
    }),
  /threshold was not met/,
);
assert.equal(forbiddenFetchCount, 0);

let substitutedRecordFetches = 0;
let substitutedManifestFetches = 0;
await expectReject(
  () =>
    resolveVoidPublicBootstrapFromReleaseRootV1({
      releaseRoot,
      signedRecordId,
      locatorMirrors,
      nowMs: NOW,
      async fetchRecordBytes() {
        substitutedRecordFetches += 1;
        return JSON.stringify(alternateRecord);
      },
      async fetchManifestBytes() {
        substitutedManifestFetches += 1;
        return manifestBytes;
      },
    }),
  /all bootstrap record locator mirrors failed/,
);
assert.equal(substitutedRecordFetches, locatorMirrors.length);
assert.equal(substitutedManifestFetches, 0);

await expectReject(
  () =>
    resolveVoidPublicBootstrapFromReleaseRootV1({
      releaseRoot,
      signedRecordId,
      locatorMirrors,
      nowMs: NOW,
      async fetchRecordBytes() {
        return JSON.stringify(record);
      },
      async fetchManifestBytes() {
        return Buffer.from("{}", "utf8");
      },
    }),
  /all bootstrap record mirrors failed/,
);

console.log(MARKER);
console.log("embedded_release_root_required=true");
console.log("active_release_root_required=true");
console.log("algorithm_tag_bound_by_release_root=true");
console.log("threshold_signed_record_id_required=true");
console.log("release_checks_before_transport=true");
console.log("hold_root_transport_calls=0");
console.log("invalid_signature_transport_calls=0");
console.log("below_threshold_transport_calls=0");
console.log("record_id_substitution_accepted=false");
console.log("manifest_substitution_accepted=false");
console.log("record_locator_failover=true");
console.log("manifest_mirror_failover=true");
console.log("transport_is_authority=false");
console.log("network_calls_performed=false");
console.log("launcher_activation_performed=false");
console.log("production_release_root_status=hold_no_signing_keys");
console.log("quantum_safe_claim=false");
console.log("wallet_signer_validator_wc_money_authority=0");
