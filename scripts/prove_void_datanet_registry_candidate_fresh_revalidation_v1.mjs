#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  buildVoidDatanetRegistryDeployerCredentialBindingV1,
  validateVoidDatanetRegistryDeployerCredentialBindingV1,
} from "../tools/void-datanet-registry-deployer-credential-binding-v1.mjs";
import {
  CANDIDATE_REVALIDATION_MAX_VALIDITY_SECONDS_V1,
  runVoidDatanetRegistryCandidateFreshRevalidationV1,
  validateVoidDatanetRegistryCandidateFreshRevalidationV1,
} from "../tools/void-datanet-registry-candidate-fresh-revalidation-v1.mjs";
import {
  buildVoidDatanetRegistryUnsignedCandidateFixtureV1,
} from "./fixtures/void-datanet-registry-unsigned-candidate-fixture-v1.mjs";

function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function canonical(value){
  if(value===null||typeof value==="string"||typeof value==="boolean") return value;
  if(typeof value==="number"&&Number.isFinite(value)) return value;
  if(Array.isArray(value)) return value.map(canonical);
  return Object.fromEntries(
    Object.keys(value).sort().map((key)=>[key,canonical(value[key])]),
  );
}
function rehashReceipt(value){
  const x=structuredClone(value);
  delete x.candidate_revalidation_id;
  for(const key of [
    "rpc_methods_used",
    "credential_access_performed",
    "private_key_access_performed",
    "transaction_signing_performed",
    "transaction_submission_performed",
    "transaction_broadcast_performed",
    "chain2050_mutation_performed",
    "funds_movement_performed",
  ]){
    delete x[key];
  }
  return "voiddrcfr1_"+sha256(Buffer.from(JSON.stringify(canonical(x))));
}
function feeReplies({
  head=5n,
  hashDigit="8",
  pending="0x0",
  balance="0xde0b6b3a7640000",
  estimate="0x100000",
  priority="0x0",
}={}){
  const headHex="0x"+BigInt(head).toString(16);
  const hash="0x"+String(hashDigit).repeat(64);
  return [
    "0x802",
    headHex,
    {number:headHex,hash,baseFeePerGas:"0x0"},
    pending,
    balance,
    "0x0",
    "0x",
    estimate,
    priority,
    pending,
    {number:headHex,hash,baseFeePerGas:"0x0"},
  ];
}

const fixture=await buildVoidDatanetRegistryUnsignedCandidateFixtureV1();
const candidate=fixture.candidate;
const candidateEvidence=fixture.candidateEvidence;
const goodObservation={
  ok:true,
  marker:"VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_FILE_OBSERVATION_V1",
  version:1,
  status:"credential_identity_observed_without_signer_object",
  credential_id:"datanet-content-commitment-registry-deployer-wallet-v1",
  derived_address:fixture.deployerSelection.deployer_address,
  credential_source:{
    canonical_directory:true,
    directory_private_mode:true,
    regular_file:true,
    symbolic_link:false,
    single_hard_link:true,
    owner_current_user:true,
    mode:"600",
    size_bytes:67,
  },
  credential_content_access_performed:true,
  private_key_access_performed:true,
  raw_private_key_output:false,
  private_key_digest_output:false,
  signer_object_exposed:false,
  transaction_signing_performed:false,
};
const priorBinding=buildVoidDatanetRegistryDeployerCredentialBindingV1({
  deployer_selection:fixture.deployerSelection,
  unsigned_transaction_candidate:candidate,
  candidate_evidence:candidateEvidence,
  credential_observation:goodObservation,
  bound_at_utc:"2030-01-01T00:07:15.000Z",
  bound_on_host:"Nimo",
  observed_repo_head:"a".repeat(40),
});
assert.equal(
  validateVoidDatanetRegistryDeployerCredentialBindingV1(
    priorBinding,
    {
      deployer_selection:fixture.deployerSelection,
      unsigned_transaction_candidate:candidate,
      candidate_evidence:candidateEvidence,
    },
  ),
  priorBinding,
);

async function runWithReplies(replies,observedAt="2030-01-01T00:07:20.000Z"){
  let at=0;
  const result=await runVoidDatanetRegistryCandidateFreshRevalidationV1({
    unsigned_transaction_candidate:candidate,
    candidate_evidence:candidateEvidence,
    prior_credential_binding:priorBinding,
    deployer_selection:fixture.deployerSelection,
    activation_plan:fixture.activationPlan,
    activation_receipt:fixture.activationReceipt,
    resolution_packet:fixture.resolutionPacket,
    deployer_address:fixture.deployerSelection.deployer_address,
    publisher_address:fixture.publisherSelection.publisher_address,
    predecessor_address:fixture.predecessor,
    compiled_identity:fixture.compiledIdentity,
    observed_at_utc:observedAt,
    transport:async()=>replies[at++],
  });
  assert.equal(at,11);
  return result;
}

const green=await runWithReplies(feeReplies());
assert.equal(green.ok,true);
assert.equal(
  green.receipt.status,
  "FRESH_CANDIDATE_STATE_GREEN_CREDENTIAL_REBIND_REQUIRED",
);
assert.match(
  green.receipt.candidate_revalidation_id,
  /^voiddrcfr1_[0-9a-f]{64}$/u,
);
assert.equal(
  validateVoidDatanetRegistryCandidateFreshRevalidationV1(green.receipt),
  green.receipt,
);
assert.equal(green.receipt.candidate_id,candidate.candidate_id);
assert.equal(
  green.receipt.unsigned_transaction_hash,
  candidate.transaction.unsigned_transaction_hash,
);
assert.equal(
  green.receipt.transaction_fingerprint_sha256,
  candidate.transaction_fingerprint_sha256,
);
assert.equal(
  green.receipt.prior_credential_binding_id,
  priorBinding.credential_binding_id,
);
assert.equal(
  green.receipt.fresh_fee_funding_packet_id,
  green.fresh_fee_funding_packet.packet_id,
);
assert.equal(
  green.receipt.maximum_validity_seconds,
  CANDIDATE_REVALIDATION_MAX_VALIDITY_SECONDS_V1,
);
assert.ok(
  Date.parse(green.receipt.valid_until_utc)-
    Date.parse(green.receipt.observed_at_utc)<=
      CANDIDATE_REVALIDATION_MAX_VALIDITY_SECONDS_V1*1000,
);
assert.ok(
  Date.parse(green.receipt.valid_until_utc)<=
    Date.parse(candidate.valid_until_utc),
);
assert.equal(
  green.receipt.continuity.candidate_gas_limit_still_sufficient,
  true,
);
assert.equal(
  green.receipt.continuity.deployer_balance_covers_candidate_maximum_gas_cost,
  true,
);
assert.equal(
  green.receipt.continuity.fresh_credential_rebinding_required,
  true,
);
assert.equal(green.receipt.authority.credential_access,false);
assert.equal(green.receipt.authority.private_key_access,false);
assert.equal(green.receipt.authority.transaction_signing,false);
assert.equal(green.receipt.signing_authorized,false);
assert.equal(
  green.fresh_fee_funding_packet.status,
  "READ_ONLY_DEPLOYMENT_FEE_GAS_FUNDING_GREEN",
);

{
  const candidateGas=BigInt(candidate.transaction.gas_limit);
  const tooLargeEstimate="0x"+candidateGas.toString(16);
  const held=await runWithReplies(feeReplies({
    head:6n,
    hashDigit:"9",
    estimate:tooLargeEstimate,
  }));
  assert.equal(held.ok,false);
  assert.equal(held.reason,"candidate_revalidation_live_candidate_mismatch");
}
{
  const candidateGas=BigInt(candidate.transaction.gas_limit);
  const maxFee=BigInt(candidate.transaction.max_fee_per_gas_wei);
  const candidateCost=candidateGas*maxFee;
  const lowerEstimate=candidateGas/2n;
  const freshProposed=(lowerEstimate*12000n+9999n)/10000n;
  const freshCost=freshProposed*maxFee;
  assert.ok(freshCost<candidateCost);
  const insufficientForCandidate=(freshCost+candidateCost)/2n;
  const held=await runWithReplies(feeReplies({
    head:6n,
    hashDigit:"a",
    estimate:"0x"+lowerEstimate.toString(16),
    balance:"0x"+insufficientForCandidate.toString(16),
  }));
  assert.equal(held.ok,false);
  assert.equal(held.reason,"candidate_revalidation_live_candidate_mismatch");
}
{
  const badBinding=structuredClone(priorBinding);
  badBinding.unsigned_transaction_hash="0x"+"0".repeat(64);
  badBinding.credential_binding_id="voiddrcb1_"+"0".repeat(64);
  const replies=feeReplies();
  let at=0;
  const held=await runVoidDatanetRegistryCandidateFreshRevalidationV1({
    unsigned_transaction_candidate:candidate,
    candidate_evidence:candidateEvidence,
    prior_credential_binding:badBinding,
    deployer_selection:fixture.deployerSelection,
    activation_plan:fixture.activationPlan,
    activation_receipt:fixture.activationReceipt,
    resolution_packet:fixture.resolutionPacket,
    deployer_address:fixture.deployerSelection.deployer_address,
    publisher_address:fixture.publisherSelection.publisher_address,
    predecessor_address:fixture.predecessor,
    compiled_identity:fixture.compiledIdentity,
    observed_at_utc:"2030-01-01T00:07:20.000Z",
    transport:async()=>replies[at++],
  });
  assert.equal(held.ok,false);
  assert.equal(
    held.reason,
    "candidate_revalidation_prior_candidate_or_binding_invalid",
  );
  assert.equal(at,0);
}
{
  const replies=feeReplies();
  let at=0;
  const held=await runVoidDatanetRegistryCandidateFreshRevalidationV1({
    unsigned_transaction_candidate:candidate,
    candidate_evidence:candidateEvidence,
    prior_credential_binding:priorBinding,
    deployer_selection:fixture.deployerSelection,
    activation_plan:fixture.activationPlan,
    activation_receipt:fixture.activationReceipt,
    resolution_packet:fixture.resolutionPacket,
    deployer_address:fixture.deployerSelection.deployer_address,
    publisher_address:fixture.publisherSelection.publisher_address,
    predecessor_address:fixture.predecessor,
    compiled_identity:fixture.compiledIdentity,
    observed_at_utc:"2030-01-01T00:08:10.001Z",
    transport:async()=>replies[at++],
  });
  assert.equal(held.ok,false);
  assert.equal(
    held.reason,
    "candidate_revalidation_candidate_too_close_to_expiry",
  );
  assert.equal(at,0);
}
{
  const bad=structuredClone(green.receipt);
  bad.authority.transaction_signing=true;
  bad.candidate_revalidation_id=rehashReceipt(bad);
  assert.throws(
    ()=>validateVoidDatanetRegistryCandidateFreshRevalidationV1(bad),
    /candidate_fresh_revalidation_authority_mismatch:transaction_signing/u,
  );
}
{
  const bad=structuredClone(green.receipt);
  bad.continuity.fresh_credential_rebinding_required=false;
  bad.candidate_revalidation_id=rehashReceipt(bad);
  assert.throws(
    ()=>validateVoidDatanetRegistryCandidateFreshRevalidationV1(bad),
    /candidate_fresh_revalidation_continuity_mismatch:fresh_credential_rebinding_required/u,
  );
}

const runner=fs.readFileSync(
  "ops/precision/void-datanet-registry-candidate-fresh-revalidation-v1.mjs",
  "utf8",
);
for(const required of [
  "PRIOR_CREDENTIAL_BINDING_JSON",
  "precision_private_qbft_service_not_active",
  "prior_binding_repo_head_not_ancestor",
  "credential_access=false",
  "private_key_access=false",
  "deployer_funding=false",
  "transaction_construction=false",
  "transaction_signing=false",
  "transaction_submission=false",
  "transaction_broadcast=false",
  "chain2050_mutation=false",
  "funds_movement=false",
  "signing_authorized=false",
]){
  assert.ok(runner.includes(required),required);
}
for(const forbidden of [
  "bindDatanetRegistryDeployerCredentialIdentityV1",
  "credentials_directory",
  "SigningKey",
  "Wallet(",
  "privateKey",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "systemctl --user start",
  "systemctl --user restart",
  "docker run",
  "docker start",
  "ssh ",
  "sudo ",
]){
  assert.equal(runner.includes(forbidden),false,forbidden);
}

console.log("VOID_DATANET_REGISTRY_CANDIDATE_FRESH_REVALIDATION_V1_PROOF_GREEN");
console.log("canonical_candidate_fixture_reused=true");
console.log("prior_credential_binding_lineage_only=true");
console.log("second_read_only_fee_observation=true");
console.log("candidate_nonce_exact=true");
console.log("predicted_contract_address_vacant=true");
console.log("candidate_gas_limit_still_sufficient=true");
console.log("candidate_fee_caps_exact=true");
console.log("candidate_maximum_gas_cost_funded=true");
console.log("maximum_validity_seconds=60");
console.log("fresh_credential_rebinding_required=true");
console.log("credential_access=false");
console.log("private_key_access=false");
console.log("wallet_access=false");
console.log("deployer_funding=false");
console.log("transaction_construction=false");
console.log("transaction_signing=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("chain2050_mutation=false");
console.log("funds_movement=false");
console.log("signing_authorized=false");
