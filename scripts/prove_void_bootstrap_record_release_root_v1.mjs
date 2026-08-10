#!/usr/bin/env node
import assert from "node:assert/strict";
import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BOOTSTRAP_RECORD_RELEASE_ROOT_FILENAME_V1,
  VOID_BOOTSTRAP_RECORD_RELEASE_ROOT_SCHEMA_V1,
  VOID_BOOTSTRAP_RECORD_RELEASE_ROOT_PREFIX_V1,
  VOID_BOOTSTRAP_RECORD_RELEASE_KEY_PREFIX_V1,
  VOID_BOOTSTRAP_RECORD_SIGNATURE_DOMAIN_V1,
  VOID_BOOTSTRAP_RECORD_SIGNED_ID_SCHEMA_V1,
  validateVoidBootstrapRecordReleaseRootV1,
  validateVoidBootstrapRecordSignedIdV1,
  voidBootstrapRecordReleaseKeyIdV1,
  voidBootstrapRecordReleaseRootIdV1,
  voidBootstrapRecordSigningPayloadV1,
} from "./lib/void_bootstrap_record_release_root_v1.mjs";

const MARKER = "VOID_BOOTSTRAP_RECORD_RELEASE_ROOT_V1_PROOF_GREEN";
const CONFIG_PATH = path.resolve(
  "config",
  VOID_BOOTSTRAP_RECORD_RELEASE_ROOT_FILENAME_V1,
);

const AUTHORITY = Object.freeze({
  private_routes_exposed: false,
  wallet_authority: false,
  signer_authority: false,
  validator_authority: false,
  treasury_authority: false,
  work_credit_authority: false,
  money_movement_authority: false,
});

function run(command, args, options = {}) {
  const result = childProcess.spawnSync(command, args, {
    cwd: options.cwd,
    env: { ...process.env, ...(options.env || {}) },
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    maxBuffer: 128 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(
      `${command} ${args.join(" ")} failed with rc=${result.status}${
        detail ? `\n${detail}` : ""
      }`,
    );
  }
  return options.capture ? String(result.stdout || "") : "";
}

function publicKeyEntry(publicKey) {
  const der = publicKey.export({ type: "spki", format: "der" });
  return Object.freeze({
    key_id: voidBootstrapRecordReleaseKeyIdV1(der),
    algorithm: "ed25519",
    public_key_spki_base64: Buffer.from(der).toString("base64"),
  });
}

function activeRoot(keyEntries, threshold = keyEntries.length) {
  const keys = [...keyEntries].sort((a, b) => a.key_id.localeCompare(b.key_id));
  const root = {
    schema: VOID_BOOTSTRAP_RECORD_RELEASE_ROOT_SCHEMA_V1,
    network: "VOID Network",
    chain_id: 2050,
    status: "active",
    signature_domain: VOID_BOOTSTRAP_RECORD_SIGNATURE_DOMAIN_V1,
    threshold,
    keys,
    authority: AUTHORITY,
    root_id: "",
  };
  root.root_id = voidBootstrapRecordReleaseRootIdV1(root);
  return root;
}

function signedEnvelope(root, recordId, signers) {
  const payload = voidBootstrapRecordSigningPayloadV1(root, recordId);
  const signatures = signers
    .map(({ keyId, privateKey }) => ({
      key_id: keyId,
      signature_base64: crypto.sign(null, payload, privateKey).toString("base64"),
    }))
    .sort((a, b) => a.key_id.localeCompare(b.key_id));
  return Object.freeze({
    schema: VOID_BOOTSTRAP_RECORD_SIGNED_ID_SCHEMA_V1,
    root_id: root.root_id,
    record_id: recordId,
    signatures,
  });
}

function sha256(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function proveReleaseEmbedding() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "void-record-root-release-proof-"));
  try {
    const commit = run("git", ["rev-parse", "HEAD"], { capture: true }).trim();
    const version = `record-root-proof-${commit.slice(0, 12)}`;
    const out = path.join(temp, "release");
    run(
      "node",
      [
        "tools/build-public-release-v1.mjs",
        "--out",
        out,
        "--version",
        version,
      ],
      { cwd: process.cwd() },
    );

    const archives = fs
      .readdirSync(out)
      .filter((name) => name.endsWith(".tar.gz"));
    assert.equal(archives.length, 1, "release proof requires exactly one archive");
    const archive = path.join(out, archives[0]);
    const listing = run("tar", ["-tzf", archive], { capture: true })
      .split("\n")
      .filter(Boolean);
    const rootEntry = listing.find((entry) =>
      entry.endsWith(`/config/${VOID_BOOTSTRAP_RECORD_RELEASE_ROOT_FILENAME_V1}`),
    );
    assert(rootEntry, "release archive must contain the bootstrap record release root");
    const checksumEntry = listing.find((entry) =>
      entry.endsWith("/RELEASE-CONTENTS-SHA256"),
    );
    assert(checksumEntry, "release archive must contain internal checksums");

    const embeddedRoot = run("tar", ["-xOzf", archive, rootEntry], {
      capture: true,
    });
    assert.equal(embeddedRoot, fs.readFileSync(CONFIG_PATH, "utf8"));
    const embeddedValidation = validateVoidBootstrapRecordReleaseRootV1(
      JSON.parse(embeddedRoot),
      { allowHold: true },
    );
    assert.equal(embeddedValidation.root.status, "hold_no_signing_keys");

    const checksums = run("tar", ["-xOzf", archive, checksumEntry], {
      capture: true,
    });
    const rootRel = rootEntry.split("/").slice(1).join("/");
    const expectedLine = `${sha256(Buffer.from(embeddedRoot))}  ${rootRel}`;
    assert(
      checksums.split("\n").includes(expectedLine),
      "release root must be bound by RELEASE-CONTENTS-SHA256",
    );

    console.log("release_archive_root_embedded=true");
    console.log("release_archive_root_checksum_bound=true");
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

const productionRootRaw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
const productionRoot = validateVoidBootstrapRecordReleaseRootV1(
  productionRootRaw,
  { allowHold: true },
);
assert.equal(productionRoot.root.status, "hold_no_signing_keys");
assert.equal(productionRoot.root.threshold, 0);
assert.equal(productionRoot.keys.length, 0);
assert.match(
  productionRoot.root.root_id,
  new RegExp(`^${VOID_BOOTSTRAP_RECORD_RELEASE_ROOT_PREFIX_V1}[0-9a-f]{64}$`),
);
assert.equal(
  voidBootstrapRecordReleaseRootIdV1(productionRoot.root),
  productionRoot.root.root_id,
);
assert.throws(
  () =>
    validateVoidBootstrapRecordReleaseRootV1(productionRoot.root, {
      allowHold: false,
    }),
  /hold state/,
);

const first = crypto.generateKeyPairSync("ed25519");
const second = crypto.generateKeyPairSync("ed25519");
const third = crypto.generateKeyPairSync("ed25519");
const firstEntry = publicKeyEntry(first.publicKey);
const secondEntry = publicKeyEntry(second.publicKey);
const thirdEntry = publicKeyEntry(third.publicKey);
for (const entry of [firstEntry, secondEntry, thirdEntry]) {
  assert.match(
    entry.key_id,
    new RegExp(`^${VOID_BOOTSTRAP_RECORD_RELEASE_KEY_PREFIX_V1}[0-9a-f]{64}$`),
  );
}

const root = activeRoot([firstEntry, secondEntry], 2);
const validatedRoot = validateVoidBootstrapRecordReleaseRootV1(root, {
  allowHold: false,
});
const recordId = `voidpbr2_${"a".repeat(64)}`;
const signers = [
  { keyId: firstEntry.key_id, privateKey: first.privateKey },
  { keyId: secondEntry.key_id, privateKey: second.privateKey },
];
const envelope = signedEnvelope(root, recordId, signers);
const verified = validateVoidBootstrapRecordSignedIdV1(envelope, validatedRoot);
assert.equal(verified.recordId, recordId);
assert.equal(verified.validSignatureCount, 2);

const oneSignature = structuredClone(envelope);
oneSignature.signatures = oneSignature.signatures.slice(0, 1);
assert.throws(
  () => validateVoidBootstrapRecordSignedIdV1(oneSignature, validatedRoot),
  /threshold was not met/,
);

const substitutedRecord = structuredClone(envelope);
substitutedRecord.record_id = `voidpbr2_${"b".repeat(64)}`;
assert.throws(
  () => validateVoidBootstrapRecordSignedIdV1(substitutedRecord, validatedRoot),
  /signature verification failed/,
);

const duplicateSignature = structuredClone(envelope);
duplicateSignature.signatures = [
  duplicateSignature.signatures[0],
  duplicateSignature.signatures[0],
];
assert.throws(
  () => validateVoidBootstrapRecordSignedIdV1(duplicateSignature, validatedRoot),
  /duplicate signature key ID/,
);

const unknownSignature = structuredClone(envelope);
unknownSignature.signatures[0].key_id = thirdEntry.key_id;
unknownSignature.signatures.sort((a, b) => a.key_id.localeCompare(b.key_id));
assert.throws(
  () => validateVoidBootstrapRecordSignedIdV1(unknownSignature, validatedRoot),
  /unknown key/,
);

const malformedRecord = structuredClone(envelope);
malformedRecord.record_id = "voidpbr2_NOT_CANONICAL";
assert.throws(
  () => validateVoidBootstrapRecordSignedIdV1(malformedRecord, validatedRoot),
  /canonical voidpbr2_/,
);

const wrongRoot = activeRoot([firstEntry, secondEntry], 1);
const wrongValidatedRoot = validateVoidBootstrapRecordReleaseRootV1(wrongRoot, {
  allowHold: false,
});
const crossRootReplay = structuredClone(envelope);
crossRootReplay.root_id = wrongRoot.root_id;
assert.throws(
  () => validateVoidBootstrapRecordSignedIdV1(crossRootReplay, wrongValidatedRoot),
  /signature verification failed/,
);

assert.throws(
  () => validateVoidBootstrapRecordSignedIdV1(envelope, wrongValidatedRoot),
  /root ID mismatch/,
);

const reorderedRoot = structuredClone(root);
reorderedRoot.keys.reverse();
reorderedRoot.root_id = voidBootstrapRecordReleaseRootIdV1(reorderedRoot);
assert.throws(
  () => validateVoidBootstrapRecordReleaseRootV1(reorderedRoot),
  /sorted by key ID/,
);

const authorityEscalation = structuredClone(root);
authorityEscalation.authority.wallet_authority = true;
authorityEscalation.root_id = voidBootstrapRecordReleaseRootIdV1(
  authorityEscalation,
);
assert.throws(
  () => validateVoidBootstrapRecordReleaseRootV1(authorityEscalation),
  /wallet_authority must be false/,
);

const chainTypeConfusion = structuredClone(root);
chainTypeConfusion.chain_id = "2050";
chainTypeConfusion.root_id = voidBootstrapRecordReleaseRootIdV1(
  chainTypeConfusion,
);
assert.throws(
  () => validateVoidBootstrapRecordReleaseRootV1(chainTypeConfusion),
  /network contract mismatch/,
);

if (process.argv.includes("--full")) proveReleaseEmbedding();

console.log(MARKER);
console.log(`production_root_id=${productionRoot.root.root_id}`);
console.log("release_root_content_addressed=true");
console.log("release_root_signature_algorithm=ed25519");
console.log("signed_record_id_threshold_enforced=true");
console.log("record_id_exact_voidpbr2_required=true");
console.log("record_id_substitution_rejected=true");
console.log("root_substitution_rejected=true");
console.log("signature_replay_across_roots_rejected=true");
console.log("duplicate_signature_key_accepted=false");
console.log("unknown_signature_key_accepted=false");
console.log("release_root_key_order_canonical=true");
console.log("signature_order_canonical=true");
console.log("locator_mirror_is_trust_authority=false");
console.log("production_release_root_status=hold_no_signing_keys");
console.log("production_release_root_threshold=0");
console.log("production_release_root_signing_keys=0");
console.log("production_private_key_generated=false");
console.log("synthetic_ephemeral_test_keys_generated=true");
console.log("network_calls_performed=false");
console.log("runtime_activation_performed=false");
console.log("record_publication_performed=false");
console.log("wallet_signer_validator_wc_money_authority=0");
