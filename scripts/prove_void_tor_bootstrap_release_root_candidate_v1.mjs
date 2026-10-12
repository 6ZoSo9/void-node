#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import {
  buildVoidTorBootstrapReleaseRootCandidateV1,
} from "../tools/void-tor-bootstrap-release-root-candidate-v1.mjs";
import {
  validateTorBootstrapReleaseRoot,
} from "./lib/void_tor_bootstrap_release_root_v1.mjs";

const MARKER = "VOID_TOR_BOOTSTRAP_RELEASE_ROOT_CANDIDATE_V1_PROOF_GREEN";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = path.join(ROOT, "tools/void-tor-bootstrap-release-root-candidate-v1.mjs");

function publicSpkiBase64(type = "ed25519") {
  const pair = crypto.generateKeyPairSync(type);
  return Buffer.from(pair.publicKey.export({ type: "spki", format: "der" })).toString("base64");
}

const keyA = publicSpkiBase64();
const keyB = publicSpkiBase64();
const keyC = publicSpkiBase64();
const root = buildVoidTorBootstrapReleaseRootCandidateV1({
  threshold: 2,
  publicKeySpkiBase64: [keyC, keyA, keyB],
});
const validated = validateTorBootstrapReleaseRoot(root, { allowHold: false });
assert.equal(validated.root.status, "active");
assert.equal(validated.root.threshold, 2);
assert.equal(validated.root.keys.length, 3);
assert.deepEqual(
  validated.root.keys.map((entry) => entry.key_id),
  [...validated.root.keys.map((entry) => entry.key_id)].sort(),
);
assert.equal(new Set(validated.root.keys.map((entry) => entry.key_id)).size, 3);
for (const value of Object.values(validated.root.authority)) assert.equal(value, false);

assert.throws(
  () => buildVoidTorBootstrapReleaseRootCandidateV1({
    threshold: 0,
    publicKeySpkiBase64: [keyA],
  }),
  /positive integer/,
);
assert.throws(
  () => buildVoidTorBootstrapReleaseRootCandidateV1({
    threshold: 2,
    publicKeySpkiBase64: [keyA],
  }),
  /cannot exceed/,
);
assert.throws(
  () => buildVoidTorBootstrapReleaseRootCandidateV1({
    threshold: 1,
    publicKeySpkiBase64: [keyA, keyA],
  }),
  /duplicate public keys/,
);
assert.throws(
  () => buildVoidTorBootstrapReleaseRootCandidateV1({
    threshold: 1,
    publicKeySpkiBase64: ["NOT_BASE64"],
  }),
  /canonical base64/,
);
assert.throws(
  () => buildVoidTorBootstrapReleaseRootCandidateV1({
    threshold: 1,
    publicKeySpkiBase64: [publicSpkiBase64("x25519")],
  }),
  /must be Ed25519/,
);

const source = fs.readFileSync(TOOL, "utf8");
for (const forbidden of [
  "generateKeyPairSync",
  "generateKeyPair(",
  "createPrivateKey",
  "readFileSync",
  "readFile(",
]) {
  assert.equal(source.includes(forbidden), false, `tool must not contain ${forbidden}`);
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "void-tor-release-root-candidate-v1-"));
try {
  const output = path.join(temp, "candidate.json");
  const first = spawnSync(
    process.execPath,
    [
      TOOL,
      "--threshold", "2",
      "--spki-base64", keyA,
      "--spki-base64", keyB,
      "--spki-base64", keyC,
      "--output", output,
    ],
    { encoding: "utf8" },
  );
  assert.equal(first.status, 0, first.stderr || first.stdout);
  assert.match(first.stdout, /VOID_TOR_BOOTSTRAP_RELEASE_ROOT_CANDIDATE_V1/);
  assert.match(first.stdout, /private_key_file_read=false/);
  assert.match(first.stdout, /signature_generated=false/);
  assert.match(first.stdout, /publication_performed=false/);
  const diskRoot = JSON.parse(fs.readFileSync(output, "utf8"));
  const diskValidated = validateTorBootstrapReleaseRoot(diskRoot, { allowHold: false });
  assert.equal(diskValidated.root.root_id, root.root_id);

  const second = spawnSync(
    process.execPath,
    [
      TOOL,
      "--threshold", "2",
      "--spki-base64", keyA,
      "--spki-base64", keyB,
      "--output", output,
    ],
    { encoding: "utf8" },
  );
  assert.notEqual(second.status, 0);
  assert.match(second.stderr, /REFUSE:/);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log(MARKER);
console.log("active_release_root_candidate_constructed=true");
console.log("canonical_key_sorting_enforced=true");
console.log("duplicate_public_key_rejected=true");
console.log("threshold_bounds_enforced=true");
console.log("non_ed25519_public_key_rejected=true");
console.log("private_key_input_surface=false");
console.log("private_key_file_read=false");
console.log("signature_generated=false");
console.log("publication_performed=false");
console.log("runtime_activation_performed=false");
console.log("network_calls_performed=false");
