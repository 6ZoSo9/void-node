#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  EXPECTED,
  verifyRoleAuthorityCheckpointVerifiedAttestationEvidenceV1,
} from "../tools/chain2050-role-authority-checkpoint-verified-attestation-evidence-v1.mjs";

const evidence = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/chain2050-role-authority-checkpoint-verified-attestation-evidence-v1.json",
    "utf8",
  ),
);

const result =
  verifyRoleAuthorityCheckpointVerifiedAttestationEvidenceV1(evidence);

assert.equal(result.ok, true);
assert.equal(result.verified_attestation_evidence_id, EXPECTED.evidence_id);
assert.equal(result.checkpoint_attestation_id, EXPECTED.checkpoint_attestation_id);
assert.equal(result.envelope_file_sha256, EXPECTED.envelope_file_sha256);
assert.equal(
  result.signer_public_key_der_sha256,
  EXPECTED.signer_public_key_der_sha256,
);
assert.equal(result.checkpoint_height, "37390");
assert.equal(result.confirmation_count, "12");
assert.equal(result.checkpoint_ancestry_exact, true);
assert.equal(result.signature_verified, true);
assert.equal(result.operator_recognized_canonical_checkpoint_verified, true);
assert.equal(result.chain_finality_verified_under_mainnet0_policy, true);
assert.equal(result.protocol_consensus_finality_claimed, false);
assert.equal(result.authority.private_key_access, false);
assert.equal(result.authority.signing, false);
assert.equal(result.authority.transaction_broadcast, false);
assert.equal(result.authority.chain2050_write, false);
assert.equal(result.authority.registry_append, false);
assert.equal(result.authority.funds_action, false);

const source = fs.readFileSync(
  "tools/chain2050-role-authority-checkpoint-verified-attestation-evidence-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "crypto.sign(",
  "createPrivateKey(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "broadcastTransaction(",
  "BEGIN PRIVATE KEY",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log(
  "VOID_CHAIN2050_ROLE_AUTHORITY_CHECKPOINT_VERIFIED_ATTESTATION_EVIDENCE_V1_GREEN",
);
console.log(
  "verified_attestation_evidence_id=" +
    result.verified_attestation_evidence_id,
);
console.log(
  "checkpoint_attestation_id=" +
    result.checkpoint_attestation_id,
);
console.log(
  "envelope_file_sha256=" +
    result.envelope_file_sha256,
);
console.log("confirmation_count=12");
console.log("checkpoint_ancestry_exact=true");
console.log("signature_verified=true");
console.log("operator_recognized_canonical_checkpoint_verified=true");
console.log("chain_finality_verified_under_mainnet0_policy=true");
console.log("protocol_consensus_finality_claimed=false");
console.log("private_key_access=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
