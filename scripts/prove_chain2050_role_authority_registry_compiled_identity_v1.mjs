#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import {
  AUTHORITY,
  EXPECTED,
  verifyChain2050RoleAuthorityRegistryCompiledIdentityV1,
} from "../tools/chain2050-role-authority-registry-compiled-identity-v1.mjs";

const ROOT = process.cwd();
const ARTIFACT =
  "ops/mainnet0/chain2050-role-authority-registry-compiled-identity-v1.json";
const CONTRACT =
  "contracts/mainnet0/VoidChain2050RoleAuthorityRegistryV1.sol";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

const artifactBytes = fs.readFileSync(path.join(ROOT, ARTIFACT));
assert.equal(artifactBytes.length, EXPECTED.identity_json_bytes);
assert.equal(
  sha256(artifactBytes),
  EXPECTED.identity_json_sha256,
);

const artifact = JSON.parse(artifactBytes.toString("utf8"));
assert.equal(artifact.identity_id, EXPECTED.identity_id);

for (const commit of [
  EXPECTED.compiler_evidence_source_commit,
  EXPECTED.merged_main_commit,
]) {
  execFileSync(
    "git",
    ["merge-base", "--is-ancestor", commit, "HEAD"],
    { stdio: "pipe" },
  );
}

const sourceAtEvidence = execFileSync(
  "git",
  [
    "show",
    EXPECTED.compiler_evidence_source_commit + ":" + CONTRACT,
  ],
);
assert.equal(
  sha256(sourceAtEvidence),
  EXPECTED.contract_source_sha256,
);

const currentSource = fs.readFileSync(path.join(ROOT, CONTRACT));
assert.equal(
  sha256(currentSource),
  EXPECTED.contract_source_sha256,
  "current contract source drifted from measured compiler generation",
);

const decision =
  verifyChain2050RoleAuthorityRegistryCompiledIdentityV1(artifact);
assert.equal(decision.ok, true);
if (decision.ok === false) throw new Error(decision.reason);
assert.equal(decision.measured_compiled_identity_recorded, true);
assert.equal(decision.sovereign_bytecode_acceptance, false);
assert.equal(decision.owner_binding_resolved, false);
assert.equal(decision.deployer_binding_resolved, false);
assert.equal(decision.unsigned_transaction_constructed, false);
assert.equal(decision.deployment_authorized, false);
assert.equal(decision.transaction_broadcast_authorized, false);
assert.equal(decision.production_activation_authorized, false);

for (const [key, value] of Object.entries(AUTHORITY)) {
  if (key === "pure_artifact_validation_only") {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

function rejected(mutator, expectedReason) {
  const value = structuredClone(artifact);
  mutator(value);
  const result =
    verifyChain2050RoleAuthorityRegistryCompiledIdentityV1(value);
  assert.equal(result.ok, false);
  assert.equal(result.reason, expectedReason);
  assert.equal(result.sovereign_bytecode_acceptance, false);
  assert.equal(result.deployment_authorized, false);
  assert.equal(result.transaction_broadcast_authorized, false);
}

rejected(
  (value) => {
    value.artifacts.expected_deployed_runtime_sha256 =
      "00".repeat(32);
  },
  "compiled_identity_record_artifact_mismatch",
);

rejected(
  (value) => {
    value.unresolved.sovereign_bytecode_acceptance = true;
  },
  "compiled_identity_record_unresolved_boundary_drift",
);

rejected(
  (value) => {
    value.unresolved.owner_address =
      "0x1111111111111111111111111111111111111111";
  },
  "compiled_identity_record_unresolved_boundary_drift",
);

rejected(
  (value) => {
    value.decision.deployment_authorized = true;
  },
  "compiled_identity_record_decision_drift",
);

const serialized = JSON.stringify(artifact);
for (const forbidden of [
  "private_key",
  "privateKey",
  "mnemonic",
  "seed_phrase",
  "password",
  "authorization:",
]) {
  assert.equal(
    serialized.includes(forbidden),
    false,
    "forbidden material " + forbidden,
  );
}

console.log(
  "VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_COMPILED_IDENTITY_V1_PROOF_GREEN",
);
console.log("identity_id=" + EXPECTED.identity_id);
console.log(
  "identity_json_sha256=" + EXPECTED.identity_json_sha256,
);
console.log(
  "identity_json_bytes=" + String(EXPECTED.identity_json_bytes),
);
console.log(
  "creation_bytecode_sha256=" +
    EXPECTED.creation_bytecode_sha256,
);
console.log(
  "expected_deployed_runtime_sha256=" +
    EXPECTED.expected_deployed_runtime_sha256,
);
console.log("measured_compiled_identity_recorded=true");
console.log("sovereign_bytecode_acceptance=false");
console.log("owner_binding_resolved=false");
console.log("deployer_binding_resolved=false");
console.log("unsigned_transaction_constructed=false");
console.log("deployment_authorized=false");
console.log("transaction_broadcast_authorized=false");
console.log("production_activation_authorized=false");
