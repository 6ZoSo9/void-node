#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_WC_VOID_COUPLED_LAUNCH_DIGEST_HEX_V1,
  VOID_WC_VOID_COUPLED_LAUNCH_IDENTITY_RECONCILIATION_AUTHORITY_V1,
  VOID_WC_VOID_COUPLED_LAUNCH_IDENTITY_RECONCILIATION_V1,
  VOID_WC_VOID_COUPLED_LAUNCH_OPENING_ID_V1,
  VOID_WC_VOID_COUPLED_LAUNCH_RECONCILIATION_EXPECTED_BLOBS_V1,
  VOID_WC_VOID_COUPLED_LAUNCH_VAULT_BYTES32_V1,
  VOID_WC_VOID_RECONCILED_OPENING_STATE_ID_V1,
  VOID_WC_VOID_RECONCILED_SHARED_STATE_ID_V1,
  deriveWcVoidCoupledLaunchIdentityV1,
  prepareWcVoidCoupledLaunchIdentityReconciliationV1,
} from "../tools/void-wc-void-coupled-launch-identity-reconciliation-v1.mjs";

const result=await prepareWcVoidCoupledLaunchIdentityReconciliationV1();
const artifact=result.artifact;
const proposed=result.proposed_candidate;

assert.equal(
  artifact.marker,
  VOID_WC_VOID_COUPLED_LAUNCH_IDENTITY_RECONCILIATION_V1,
);
assert.equal(artifact.version,1);
assert.equal(
  artifact.status,
  "ATOMIC_SOURCE_RECONCILIATION_PREPARED_APPLICATION_REQUIRED",
);
assert.match(artifact.reconciliation_plan_id,/^voidwclir1_[0-9a-f]{64}$/u);

assert.equal(
  artifact.launch_identity.digest_hex,
  VOID_WC_VOID_COUPLED_LAUNCH_DIGEST_HEX_V1,
);
assert.equal(
  artifact.launch_identity.opening_domain_id,
  VOID_WC_VOID_COUPLED_LAUNCH_OPENING_ID_V1,
);
assert.equal(
  artifact.launch_identity.vault_bytes32_id,
  VOID_WC_VOID_COUPLED_LAUNCH_VAULT_BYTES32_V1,
);
assert.equal(artifact.launch_identity.encoding_bridge_lossless,true);
assert.equal(
  artifact.launch_identity.opening_domain_id.slice(7),
  artifact.launch_identity.vault_bytes32_id.slice(2),
);
assert.equal(artifact.launch_identity.digest_hex.length,64);
assert.equal(
  Buffer.from(artifact.launch_identity.digest_hex,"hex").length,
  32,
);

assert.equal(
  artifact.current_source_fixture.opening_domain_id,
  "sha256:"+"a".repeat(64),
);
assert.equal(
  artifact.current_source_fixture.reconciliation_id,
  "sha256:3c543d4b6e0d30e5c65e3a6a9588a71fc0929692cf3278e43933e14f134853c5",
);
assert.equal(
  artifact.current_source_fixture.wc_opening_state_id,
  "sha256:93ec2dd83d6b1d57c93c0456056ad0c5fa85f2d7d1188ad1b26aad604d24c88d",
);

const proposedShared=artifact.proposed_shared_post_discovery_reconciliation;
assert.equal(
  proposedShared.coupled_launch_id,
  VOID_WC_VOID_COUPLED_LAUNCH_OPENING_ID_V1,
);
assert.equal(
  proposedShared.reconciliation_id,
  VOID_WC_VOID_RECONCILED_SHARED_STATE_ID_V1,
);
assert.equal(
  proposedShared.wc_opening_state_id,
  VOID_WC_VOID_RECONCILED_OPENING_STATE_ID_V1,
);
assert.notEqual(
  proposedShared.reconciliation_id,
  artifact.current_source_fixture.reconciliation_id,
);
assert.notEqual(
  proposedShared.wc_opening_state_id,
  artifact.current_source_fixture.wc_opening_state_id,
);
assert.equal(proposedShared.source_model_fixture,true);
assert.equal(proposedShared.runtime_or_launch_evidence,false);
assert.equal(proposedShared.shared_post_discovery_model_reconciled,true);
assert.equal(proposedShared.market_activation_authority,false);
assert.equal(proposedShared.public_presale_activation_authority,false);
assert.equal(proposedShared.inventory_funding_authority,false);
assert.equal(proposedShared.funds_movement_authority,false);

assert.deepEqual(
  proposed.shared_post_discovery_reconciliation,
  proposedShared,
);
assert.equal(proposed.gates.bounded_canary_green,false);
assert.equal(proposed.gates.coupled_activation_ready,false);
assert.equal(proposed.authority.market_activation,false);
assert.equal(proposed.authority.public_presale_activation,false);
assert.equal(proposed.authority.funds_movement,false);
assert.equal(Object.isFrozen(proposed),true);
assert.equal(Object.isFrozen(proposed.gates),true);
assert.equal(
  Object.isFrozen(proposed.shared_post_discovery_reconciliation),
  true,
);
assert.throws(
  ()=>{ proposed.gates.bounded_canary_green=true; },
  TypeError,
);
assert.throws(
  ()=>{
    proposed.shared_post_discovery_reconciliation.coupled_launch_id=
      "sha256:"+"f".repeat(64);
  },
  TypeError,
);

assert.deepEqual(
  artifact.required_atomic_source_updates.map((item)=>item.path),
  [
    "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json",
    "tools/void-coupled-economic-successor-gate-v1.mjs",
    "scripts/prove_void_coupled_economic_successor_gate_v1.mjs",
    "docs/operators/coupled-economic-successor-gate-v1.md",
  ],
);
assert.deepEqual(
  artifact.downstream_real_evidence_blocked_until_application,
  [
    "opening_ledger_custody_evidence",
    "opening_claim_replay_evidence",
    "bounded_canary_evidence",
    "market_vault_role_authorization",
    "market_vault_deployment_attestation",
    "final_coupled_activation",
  ],
);

for(const [path,sha] of Object.entries(
  VOID_WC_VOID_COUPLED_LAUNCH_RECONCILIATION_EXPECTED_BLOBS_V1,
)) {
  assert.equal(artifact.reviewed_source_blobs[path],sha);
  assert.match(sha,/^[0-9a-f]{40}$/u);
}

for(const key of [
  "reviewed_source_blobs_verified",
  "repository_clean",
  "current_fixture_rederived",
  "commitment_digest_rederived",
  "opening_and_vault_encodings_lossless",
  "reconciled_shared_state_rederived",
  "exact_reconciled_reconciliation_id_verified",
  "exact_reconciled_opening_state_id_verified",
  "reconciliation_id_rotated",
  "wc_opening_state_id_rotated",
  "proposed_candidate_change_scope_shared_reconciliation_only",
  "current_classifier_source_fixture_verified",
  "candidate_classifier_atomic_source_update_required",
  "source_application_required",
]) {
  assert.equal(artifact.verification[key],true,key);
}
assert.equal(artifact.verification.classifier_execution_performed,false);
assert.equal(artifact.verification.canonical_candidate_file_updated,false);
assert.equal(artifact.verification.classifier_source_updated,false);

const mutatedCommitment=structuredClone(
  artifact.reviewed_coupled_launch_commitment,
);
mutatedCommitment.wc_void.opening_price_source="mutated";
const mutatedIdentity=deriveWcVoidCoupledLaunchIdentityV1(mutatedCommitment);
assert.notEqual(
  mutatedIdentity.digest_hex,
  VOID_WC_VOID_COUPLED_LAUNCH_DIGEST_HEX_V1,
);
assert.equal(
  mutatedIdentity.opening_domain_id.slice(7),
  mutatedIdentity.vault_bytes32_id.slice(2),
);

const expectedTrue=new Set([
  "source_reconciliation_plan_only",
  "canonical_source_read",
  "git_repository_identity_read",
  "derived_candidate_copy",
]);
for(const [key,value] of Object.entries(
  VOID_WC_VOID_COUPLED_LAUNCH_IDENTITY_RECONCILIATION_AUTHORITY_V1,
)) {
  assert.equal(expectedTrue.has(key)?value:!value,true,key);
}

const source=fs.readFileSync(
  "tools/void-wc-void-coupled-launch-identity-reconciliation-v1.mjs",
  "utf8",
);
assert.doesNotMatch(source,/\bfetch\s*\(/u);
assert.doesNotMatch(source,/\bcurl\b|\bssh\b/u);
assert.doesNotMatch(source,/eth_sendRawTransaction|eth_sendTransaction/u);
assert.doesNotMatch(source,/new\s+Wallet\s*\(/u);
assert.doesNotMatch(source,/git\s+(?:add|commit|push|merge|checkout|reset)/u);
assert.match(source,/reviewed_blob=/u);
assert.match(source,/current_classifier_source_fixture_verified:true/u);
assert.match(source,/candidate_classifier_atomic_source_update_required:true/u);
assert.match(source,/classifier_execution_performed:false/u);
assert.doesNotMatch(
  source,
  /classifyVoidCoupledEconomicSuccessorGateFromDecisionV1/u,
);
assert.match(source,/canonical_candidate_file_updated:false/u);
assert.match(source,/classifier_source_updated:false/u);

console.log(
  "VOID_WC_VOID_COUPLED_LAUNCH_IDENTITY_RECONCILIATION_V1_PROOF_GREEN",
);
console.log(
  "digest_hex="+VOID_WC_VOID_COUPLED_LAUNCH_DIGEST_HEX_V1,
);
console.log(
  "opening_domain_id="+VOID_WC_VOID_COUPLED_LAUNCH_OPENING_ID_V1,
);
console.log(
  "vault_bytes32_id="+VOID_WC_VOID_COUPLED_LAUNCH_VAULT_BYTES32_V1,
);
console.log("encoding_bridge_lossless=true");
console.log(
  "reconciled_reconciliation_id="+VOID_WC_VOID_RECONCILED_SHARED_STATE_ID_V1,
);
console.log(
  "reconciled_opening_state_id="+VOID_WC_VOID_RECONCILED_OPENING_STATE_ID_V1,
);
console.log("reconciliation_id_rotated=true");
console.log("wc_opening_state_id_rotated=true");
console.log("derived_candidate_deep_frozen=true");
console.log("classifier_execution_performed=false");
console.log("atomic_candidate_classifier_proof_doc_update_required=true");
console.log("canonical_candidate_file_updated=false");
console.log("classifier_source_updated=false");
console.log("deployment=false");
console.log("role_authorization=false");
console.log("funds_movement=false");
