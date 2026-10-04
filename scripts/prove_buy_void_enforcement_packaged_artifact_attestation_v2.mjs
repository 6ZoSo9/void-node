#!/usr/bin/env node
import assert from "node:assert/strict";
import path from "node:path";

import {
  derive as deriveEnforcementCandidateV1,
  verify as verifyEnforcementCandidateV1,
} from "./prove_buy_void_enforcement_artifact_attestation_v1.mjs";
import {
  deriveBuyVoidEnforcementArtifactAttestationV2,
  verifyBuyVoidEnforcementArtifactAttestationV2,
} from "./prove_buy_void_enforcement_artifact_attestation_v2.mjs";

const args = process.argv.slice(2);
assert.equal(
  args.length === 2 && args[0] === "--packaged-root",
  true,
  "usage:--packaged-root <root>",
);
const packagedRoot = path.resolve(args[1]);
const successor = verifyBuyVoidEnforcementArtifactAttestationV2();
const expectedCandidate = deriveEnforcementCandidateV1();
verifyEnforcementCandidateV1(packagedRoot, expectedCandidate);
assert.equal(
  expectedCandidate.enforcement_artifact_set_sha256,
  successor.current_derivation.enforcement_artifact_set_sha256,
);
assert.deepEqual(
  deriveBuyVoidEnforcementArtifactAttestationV2(),
  successor,
);

console.log("VOID_BUY_VOID_ENFORCEMENT_PACKAGED_ARTIFACT_ATTESTATION_V2_GREEN");
console.log(
  "successor_enforcement_generation_sha256=" +
    successor.successor_enforcement_generation_sha256,
);
console.log(
  "packaged_enforcement_artifact_set_sha256=" +
    expectedCandidate.enforcement_artifact_set_sha256,
);
console.log("container_started=false");
console.log("deployed_artifact_generation_verified=false");
console.log("runtime_mount_authority=false");
console.log("production_source_finality_authority_ready=false");
console.log("funds_movement_authority=false");
