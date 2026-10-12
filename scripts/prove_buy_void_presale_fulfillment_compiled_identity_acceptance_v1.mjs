#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  EXPECTED,
  VOID_BUY_VOID_PRESALE_FULFILLMENT_COMPILED_IDENTITY_ACCEPTANCE_AUTHORITY_V1,
  VOID_BUY_VOID_PRESALE_FULFILLMENT_COMPILED_IDENTITY_ACCEPTANCE_V1,
  verifyBuyVoidPresaleFulfillmentCompiledIdentityV1,
} from "../tools/buy-void-presale-fulfillment-compiled-identity-acceptance-v1.mjs";

const ROOT = process.cwd();
const ARTIFACT_PATH =
  "ops/mainnet0/buy-void-presale-fulfillment-compiled-identity-v1.json";
const CONTRACT_PATH =
  "contracts/mainnet/BuyVoidPresaleFulfillmentV1.sol";

function sha256(value) {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

const artifactBytes = fs.readFileSync(
  path.join(ROOT, ARTIFACT_PATH),
);
assert.equal(
  artifactBytes.length,
  EXPECTED.identity_json_bytes,
);
assert.equal(
  sha256(artifactBytes),
  EXPECTED.identity_json_sha256,
);

const artifact = JSON.parse(
  artifactBytes.toString("utf8"),
);
assert.equal(
  artifact.identity_id,
  EXPECTED.identity_id,
);
assert.equal(
  artifact.source.source_commit,
  EXPECTED.source_commit,
);
assert.equal(
  artifact.source.source_ref,
  "main",
);

const contractBytes = fs.readFileSync(
  path.join(ROOT, CONTRACT_PATH),
);
assert.equal(
  sha256(contractBytes),
  EXPECTED.contract_source_sha256,
);

const decision =
  verifyBuyVoidPresaleFulfillmentCompiledIdentityV1(
    artifact,
  );
assert.equal(decision.ok, true);
if (decision.ok === false) {
  throw new Error(decision.reason);
}
assert.equal(
  decision.status,
  "compiled_identity_accepted_held_on_chain2050_deployment_attestation",
);
assert.equal(
  decision.marker,
  VOID_BUY_VOID_PRESALE_FULFILLMENT_COMPILED_IDENTITY_ACCEPTANCE_V1,
);
assert.equal(
  decision.identity_id,
  EXPECTED.identity_id,
);
assert.equal(
  decision.identity_json_sha256,
  EXPECTED.identity_json_sha256,
);
assert.equal(
  decision.identity_json_bytes,
  EXPECTED.identity_json_bytes,
);
assert.equal(
  decision.compiled_identity_accepted,
  true,
);
assert.equal(
  decision.deployment_attested,
  false,
);
assert.equal(
  decision.predecessor_lineage_attested,
  false,
);
assert.equal(
  decision.inventory_funding_verified,
  false,
);
assert.equal(
  decision.runtime_activation_authorized,
  false,
);
assert.equal(
  decision.public_activation_authorized,
  false,
);
assert.equal(
  decision.next_gate,
  "exact_chain2050_fulfillment_deployment_and_predecessor_lineage_attestation",
);

assert.equal(
  artifact.artifacts.creation_bytecode_sha256,
  EXPECTED.creation_bytecode_sha256,
);
assert.equal(
  artifact.artifacts.creation_bytecode_keccak256,
  EXPECTED.creation_bytecode_keccak256,
);
assert.equal(
  artifact.artifacts.runtime_template_sha256,
  EXPECTED.runtime_template_sha256,
);
assert.equal(
  artifact.artifacts.runtime_template_keccak256,
  EXPECTED.runtime_template_keccak256,
);
assert.equal(
  artifact.artifacts.immutable_layout_sha256,
  EXPECTED.immutable_layout_sha256,
);

for (const name of [
  "token",
  "fulfiller",
  "predecessor",
]) {
  assert.deepEqual(
    artifact.artifacts.immutable_layout[name].references,
    EXPECTED.immutable_layout[name].references,
  );
}

for (const [key, value] of Object.entries(
  VOID_BUY_VOID_PRESALE_FULFILLMENT_COMPILED_IDENTITY_ACCEPTANCE_AUTHORITY_V1,
)) {
  if (key === "pure_artifact_validation_only") {
    assert.equal(value, true);
  } else {
    assert.equal(value, false, key);
  }
}

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
    "forbidden identity material " + forbidden,
  );
}

console.log(
  "VOID_BUY_VOID_PRESALE_FULFILLMENT_COMPILED_IDENTITY_ACCEPTANCE_V1_PROOF_GREEN",
);
console.log(
  "identity_id=" + EXPECTED.identity_id,
);
console.log(
  "identity_json_sha256=" +
    EXPECTED.identity_json_sha256,
);
console.log(
  "identity_json_bytes=" +
    EXPECTED.identity_json_bytes,
);
console.log(
  "source_commit=" +
    EXPECTED.source_commit,
);
console.log(
  "compiled_identity_accepted=true",
);
console.log(
  "deployment_attested=false",
);
console.log(
  "predecessor_lineage_attested=false",
);
console.log(
  "inventory_funding_verified=false",
);
console.log(
  "runtime_activation_authorized=false",
);
console.log(
  "public_activation_authorized=false",
);
console.log(
  "next_gate=exact_chain2050_fulfillment_deployment_and_predecessor_lineage_attestation",
);
