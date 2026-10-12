#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  EXPECTED,
  VOID_DATANET_CONTENT_COMMITMENT_COMPILED_IDENTITY_ACCEPTANCE_AUTHORITY_V1,
  VOID_DATANET_CONTENT_COMMITMENT_COMPILED_IDENTITY_ACCEPTANCE_V1,
  verifyDatanetContentCommitmentCompiledIdentityV1,
} from "../tools/datanet-content-commitment-compiled-identity-acceptance-v1.mjs";

const ROOT=process.cwd();
const ARTIFACT_PATH=
  "ops/mainnet0/datanet-content-commitment-compiled-identity-v1.json";
const CONTRACT_PATH=
  "contracts/mainnet/DatanetContentCommitmentRegistryV1.sol";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

const artifactBytes=fs.readFileSync(path.join(ROOT,ARTIFACT_PATH));
assert.equal(artifactBytes.length,EXPECTED.identity_json_bytes);
assert.equal(sha256(artifactBytes),EXPECTED.identity_json_sha256);

const artifact=JSON.parse(artifactBytes.toString("utf8"));
assert.equal(artifact.identity_id,EXPECTED.identity_id);
assert.equal(artifact.source.source_commit,EXPECTED.source_commit);
assert.equal(artifact.source.source_ref,"main");

execFileSync(
  "git",
  ["merge-base","--is-ancestor",EXPECTED.source_commit,"HEAD"],
  {stdio:"pipe"},
);

const sourceAtIdentity=execFileSync(
  "git",
  ["show",EXPECTED.source_commit+":"+CONTRACT_PATH],
);
assert.equal(sha256(sourceAtIdentity),EXPECTED.contract_source_sha256);

const currentContract=fs.readFileSync(path.join(ROOT,CONTRACT_PATH));
assert.equal(sha256(currentContract),EXPECTED.contract_source_sha256);

const decision=verifyDatanetContentCommitmentCompiledIdentityV1(artifact);
assert.equal(decision.ok,true);
if(decision.ok===false) throw new Error(decision.reason);
assert.equal(
  decision.status,
  "compiled_identity_accepted_held_on_chain2050_registry_deployment_lineage_attestation",
);
assert.equal(
  decision.marker,
  VOID_DATANET_CONTENT_COMMITMENT_COMPILED_IDENTITY_ACCEPTANCE_V1,
);
assert.equal(decision.identity_id,EXPECTED.identity_id);
assert.equal(decision.identity_json_sha256,EXPECTED.identity_json_sha256);
assert.equal(decision.identity_json_bytes,EXPECTED.identity_json_bytes);
assert.equal(decision.compiled_identity_accepted,true);
assert.equal(decision.deployment_attested,false);
assert.equal(decision.predecessor_lineage_attested,false);
assert.equal(decision.object_uncommitted_preflight_verified,false);
assert.equal(decision.transaction_construction_authorized,false);
assert.equal(decision.transaction_signing_authorized,false);
assert.equal(decision.transaction_broadcast_authorized,false);
assert.equal(decision.chain2050_write_authorized,false);
assert.equal(
  decision.next_gate,
  "exact_chain2050_registry_deployment_and_predecessor_lineage_attestation",
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
for(const name of ["publisher","predecessor"]){
  assert.deepEqual(
    artifact.artifacts.immutable_layout[name].references,
    EXPECTED.immutable_layout[name].references,
  );
}

for(const [key,value] of Object.entries(
  VOID_DATANET_CONTENT_COMMITMENT_COMPILED_IDENTITY_ACCEPTANCE_AUTHORITY_V1,
)){
  if(key==="pure_artifact_validation_only") assert.equal(value,true,key);
  else assert.equal(value,false,key);
}

const serialized=JSON.stringify(artifact);
for(const forbidden of [
  "private_key","privateKey","mnemonic","seed_phrase","password","authorization:",
]){
  assert.equal(serialized.includes(forbidden),false,"forbidden material "+forbidden);
}

const mutated=structuredClone(artifact);
mutated.artifacts.runtime_template_hex=
  mutated.artifacts.runtime_template_hex.slice(0,-2)+"00";
const held=verifyDatanetContentCommitmentCompiledIdentityV1(mutated);
assert.equal(held.ok,false);
assert.equal(held.compiled_identity_accepted,false);
assert.equal(held.deployment_attested,false);
assert.equal(held.chain2050_write_authorized,false);

console.log(
  "VOID_DATANET_CONTENT_COMMITMENT_COMPILED_IDENTITY_ACCEPTANCE_V1_PROOF_GREEN",
);
console.log("identity_id="+EXPECTED.identity_id);
console.log("identity_json_sha256="+EXPECTED.identity_json_sha256);
console.log("identity_json_bytes="+String(EXPECTED.identity_json_bytes));
console.log("source_commit="+EXPECTED.source_commit);
console.log("source_ref=main");
console.log("compiled_identity_accepted=true");
console.log("deployment_attested=false");
console.log("predecessor_lineage_attested=false");
console.log("object_uncommitted_preflight_verified=false");
console.log("transaction_construction_authorized=false");
console.log("transaction_signing_authorized=false");
console.log("transaction_broadcast_authorized=false");
console.log("chain2050_write_authorized=false");
console.log(
  "next_gate=exact_chain2050_registry_deployment_and_predecessor_lineage_attestation",
);
