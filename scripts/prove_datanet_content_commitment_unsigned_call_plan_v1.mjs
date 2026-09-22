#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  Interface,
  getCreateAddress,
} from "ethers";
import {
  buildDatanetContentCommitmentDeploymentDataV1,
  reconstructDatanetContentCommitmentRuntimeV1,
  verifyDatanetContentCommitmentDeploymentObservationV1,
} from "../tools/datanet-content-commitment-deployment-attestation-v1.mjs";
import {
  VOID_DATANET_PHASE0_SOVEREIGN_PRIMARY_DER_SHA256_V1,
} from "../tools/datanet-content-commitment-object-preflight-v1.mjs";
import {
  DATANET_CONTENT_COMMITMENT_CALL_INTERFACE_V1,
  VOID_DATANET_CONTENT_COMMITMENT_UNSIGNED_CALL_PLAN_AUTHORITY_V1,
  buildDatanetContentCommitmentUnsignedCallPlanAgainstFingerprintV1,
  buildDatanetContentCommitmentUnsignedCallPlanV1,
} from "../tools/datanet-content-commitment-unsigned-call-plan-v1.mjs";
import {
  canonicalJson,
  sha256,
} from "../tools/datanet-content-commitment-compiler-profile-v1.mjs";

const ROOT=process.cwd();
const identity=JSON.parse(fs.readFileSync(
  path.join(ROOT,"ops/mainnet0/datanet-content-commitment-compiled-identity-v1.json"),
  "utf8",
));

const OBJECT_ID="11".repeat(32);
const CONTENT_SHA="22".repeat(32);
const BYTE_LENGTH=128;
const ASSEMBLED_AT="2026-09-22T00:30:00Z";
const REVIEW_DOMAIN="void.datanet.phase0.sovereign-review-decision.v1";
const REVIEW_ROLE="sovereign_primary_governance_attestation";

const candidate={
  marker:"VOID_DATANET_CHAIN_PROMOTION_CANDIDATE_V1",
  version:1,
  candidate:{
    candidate_id:"voiddcp1_"+"5".repeat(32),
    object_id_sha256:OBJECT_ID,
    content_sha256:CONTENT_SHA,
    byte_length:BYTE_LENGTH,
  },
  phase_context:{
    phase:0,
    authority_mode:"PHASE0_OPERATOR_ROOTED",
    validator_admission_authority_active:false,
  },
  admission:{
    disposition:"PHASE0_OPERATOR_REVIEW_ONLY",
    canonical_write_authorized:false,
    automatic_promotion:false,
  },
  authority:{
    source_only:true,
    candidate_only:true,
    chain2050_write_authorized:false,
  },
};
const candidateSha=sha256(canonicalJson(candidate));

const manifestBody={
  marker:"VOID_DATANET_PROMOTION_PACKET_ASSEMBLY_V1",
  version:1,
  assembled_at_utc:ASSEMBLED_AT,
  object:{
    object_id_sha256:OBJECT_ID,
    content_sha256:CONTENT_SHA,
    byte_length:BYTE_LENGTH,
  },
  input_commitments:{
    local_receipt_sha256:"4".repeat(64),
    publisher_provenance_sha256:"5".repeat(64),
    provider_trust_snapshot_sha256:"6".repeat(64),
    attestation_set_sha256:"7".repeat(64),
  },
  publisher:{
    publisher_provenance_id:"voiddppp1_"+"8".repeat(64),
    publisher_key_id:"ed25519:"+"9".repeat(64),
  },
  external_attestation:{
    attestation_set_id:"voiddpias1_"+"a".repeat(64),
    trust_snapshot_id:"voidapts1_"+"b".repeat(64),
    external_evidence_sha256:"c".repeat(64),
  },
  evidence:{
    source_bundle_sha256:"d".repeat(64),
    evidence_map_sha256:"e".repeat(64),
    promotion_candidate_sha256:candidateSha,
    candidate_id:candidate.candidate.candidate_id,
  },
  phase_context:{
    phase:0,
    authority_mode:"PHASE0_OPERATOR_ROOTED",
    validator_admission_authority_active:false,
  },
  admission:{
    disposition:"PHASE0_OPERATOR_REVIEW_ONLY",
    operator_review_required:true,
    canonical_write_authorized:false,
    automatic_promotion:false,
  },
  authority:{
    evidence_only:true,
    datanet_mutation_authorized:false,
    chain2050_write_authorized:false,
    validator_authority_granted:false,
    governance_mutation_authorized:false,
    signer_or_wallet_access:false,
    work_credit_award_authorized:false,
    runtime_service_action:false,
    funds_action:false,
  },
};
const manifest={
  ...manifestBody,
  assembly_id:"voiddppa1_"+sha256(canonicalJson(manifestBody)),
};
const manifestSha=sha256(canonicalJson(manifest));

const sovereign=crypto.generateKeyPairSync("ed25519");
const sovereignPem=sovereign.publicKey.export({type:"spki",format:"pem"}).toString();
const sovereignDer=sovereign.publicKey.export({type:"spki",format:"der"});
const sovereignFingerprint=crypto.createHash("sha256").update(sovereignDer).digest("hex");

function signingBody(decision){
  const copy={...decision};
  delete copy.signature_base64;
  delete copy.decision_id;
  return copy;
}
function signingBytes(decision){
  return Buffer.from(
    REVIEW_DOMAIN+"\n"+canonicalJson(signingBody(decision)),
    "utf8",
  );
}
function signedDecision({sequence,previous,decision,reason,decidedAt}){
  const body={
    marker:"VOID_DATANET_PHASE0_SOVEREIGN_REVIEW_DECISION_V1",
    version:1,
    chain_id:2050,
    phase:0,
    authority_mode:"PHASE0_OPERATOR_ROOTED",
    assembly_id:manifest.assembly_id,
    assembly_manifest_sha256:manifestSha,
    candidate_id:candidate.candidate.candidate_id,
    promotion_candidate_sha256:candidateSha,
    sequence,
    previous_decision_sha256:previous,
    decision,
    reason_code:reason,
    review_evidence_sha256:sha256("review-evidence:"+sequence+":"+decision),
    decided_at_utc:decidedAt,
    signer_role:REVIEW_ROLE,
    signer_public_key_der_sha256:sovereignFingerprint,
    signature_algorithm:"Ed25519",
    signature_domain:REVIEW_DOMAIN,
    preparation_boundary:{
      separate_canonical_preparation_eligible:
        decision==="APPROVE_FOR_SEPARATE_CANONICAL_PREPARATION",
      chain2050_write_authorized:false,
      transaction_construction_authorized:false,
      transaction_signing_authorized:false,
      transaction_broadcast_authorized:false,
      validator_authority_granted:false,
      governance_mutation_authorized:false,
      automatic_promotion:false,
      runtime_service_action:false,
      funds_action:false,
    },
  };
  const signature=crypto.sign(null,signingBytes(body),sovereign.privateKey)
    .toString("base64");
  const withoutId={...body,signature_base64:signature};
  return {
    ...withoutId,
    decision_id:"voiddpsr1_"+sha256(canonicalJson(withoutId)),
  };
}
const hold=signedDecision({
  sequence:"0",
  previous:"0".repeat(64),
  decision:"HOLD",
  reason:"MORE_EVIDENCE_REQUIRED",
  decidedAt:"2026-09-22T00:31:00Z",
});
const approve=signedDecision({
  sequence:"1",
  previous:sha256(canonicalJson(hold)),
  decision:"APPROVE_FOR_SEPARATE_CANONICAL_PREPARATION",
  reason:"SOVEREIGN_REVIEW_ACCEPTED",
  decidedAt:"2026-09-22T00:32:00Z",
});
const reviewChain={public_key_pem:sovereignPem,decisions:[hold,approve]};

const intentBody={
  marker:"VOID_DATANET_PHASE0_CANONICAL_PREPARATION_INTENT_V1",
  version:1,
  status:"PREPARATION_INTENT_ONLY",
  chain_id:2050,
  phase:0,
  authority_mode:"PHASE0_OPERATOR_ROOTED",
  assembly:{
    assembly_id:manifest.assembly_id,
    assembly_manifest_sha256:manifestSha,
    candidate_id:candidate.candidate.candidate_id,
    promotion_candidate_sha256:candidateSha,
  },
  sovereign_review:{
    decision_id:approve.decision_id,
    decision_sha256:sha256(canonicalJson(approve)),
    sequence:approve.sequence,
    signer_role:REVIEW_ROLE,
    signer_public_key_der_sha256:sovereignFingerprint,
    decision:"APPROVE_FOR_SEPARATE_CANONICAL_PREPARATION",
    separate_canonical_preparation_eligible:true,
  },
  target_contract_source:{
    contract_name:"DatanetContentCommitmentRegistryV1",
    source_path:"contracts/mainnet/DatanetContentCommitmentRegistryV1.sol",
    source_sha256:identity.source.contract_source_sha256,
    source_bytes:identity.source.contract_source_bytes,
    registry_version:1,
    max_object_bytes:268435456,
    function_signature:"commit(bytes32,bytes32,uint64)",
  },
  commitment:{
    object_id_sha256:OBJECT_ID,
    content_sha256:CONTENT_SHA,
    byte_length:BYTE_LENGTH,
  },
  deployment_binding:{
    status:"UNBOUND_REQUIRED",
    registry_address:null,
    publisher_address:null,
    predecessor_address:null,
  },
  required_preflight:{
    exact_chain_id_verified:false,
    registry_deployment_verified:false,
    deployed_code_matches_reviewed_source:false,
    publisher_binding_verified:false,
    predecessor_lineage_verified:false,
    object_uncommitted_verified:false,
    fresh_read_only_is_committed_check_required:true,
  },
  post_commit_requirements:{
    content_committed_event_receipt_membership_required:true,
    receipt_revalidation_required:true,
    canonical_block_binding_required:true,
    accepted_checkpoint_membership_required:true,
    chain_finality_required:true,
  },
  authority:{
    preparation_intent_only:true,
    deployment_authorized:false,
    contract_selection_authorized:false,
    registry_address_selection_authorized:false,
    publisher_selection_authorized:false,
    predecessor_selection_authorized:false,
    transaction_construction_authorized:false,
    calldata_construction_authorized:false,
    transaction_signing_authorized:false,
    transaction_broadcast_authorized:false,
    chain2050_write_authorized:false,
    validator_authority_granted:false,
    governance_mutation_authorized:false,
    runtime_service_action:false,
    wallet_or_signer_access:false,
    work_credit_award_authorized:false,
    funds_action:false,
    automatic_promotion:false,
  },
  next_gate:"REVIEWED_DEPLOYMENT_AND_LINEAGE_BINDING_REQUIRED",
};
const intent={
  ...intentBody,
  preparation_intent_id:"voiddcpi1_"+sha256(canonicalJson(intentBody)),
};

const PUBLISHER="0x1111111111111111111111111111111111111111";
const PREDECESSOR="0x0000000000000000000000000000000000000000";
const DEPLOYER="0x3333333333333333333333333333333333333333";
const NONCE=7;
const CONTRACT=getCreateAddress({from:DEPLOYER,nonce:NONCE}).toLowerCase();
const TX_HASH="0x"+"4".repeat(64);
const DEPLOYMENT_BLOCK_HASH="0x"+"5".repeat(64);
const HEAD_HASH="0x"+"6".repeat(64);

const deploymentData=buildDatanetContentCommitmentDeploymentDataV1({
  compiled_identity:identity,
  publisher_address:PUBLISHER,
  predecessor_address:PREDECESSOR,
});
const runtime=reconstructDatanetContentCommitmentRuntimeV1({
  compiled_identity:identity,
  publisher_address:PUBLISHER,
  predecessor_address:PREDECESSOR,
});
const deployment=verifyDatanetContentCommitmentDeploymentObservationV1({
  compiled_identity:identity,
  policy:{
    chain_id:"2050",
    registry_contract_address:CONTRACT,
    publisher_address:PUBLISHER,
    predecessor_address:PREDECESSOR,
    min_confirmations:"12",
  },
  observation:{
    chain_id:"2050",
    observation_block_number:"111",
    observation_block_hash:HEAD_HASH,
    contract_address:CONTRACT,
    deployment_transaction:{
      hash:TX_HASH,
      from:DEPLOYER,
      to:null,
      nonce:NONCE,
      input:deploymentData.deployment_data,
      value_wei:"0",
      chain_id:"2050",
    },
    deployment_receipt:{
      transaction_hash:TX_HASH,
      status:"1",
      block_number:"100",
      block_hash:DEPLOYMENT_BLOCK_HASH,
      contract_address:CONTRACT,
    },
    runtime_code:runtime.runtime_code,
    views:{
      registry_version:"1",
      max_object_bytes:"268435456",
      publisher_address:PUBLISHER,
      predecessor_address:PREDECESSOR,
    },
  },
});
assert.equal(deployment.ok,true);

const observation={
  chain_id:"2050",
  registry_contract_address:CONTRACT,
  observation_block_number:"111",
  observation_block_hash_before:HEAD_HASH,
  observation_block_hash_after:HEAD_HASH,
  deployed_runtime_sha256:runtime.runtime_sha256,
  views:{
    registry_version:"1",
    max_object_bytes:"268435456",
    publisher_address:PUBLISHER,
    predecessor_address:PREDECESSOR,
  },
  object_id_sha256:OBJECT_ID,
  is_committed_before:false,
  is_committed_after:false,
  same_block_tag_for_all_reads:true,
  block_hash_revalidated:true,
  runtime_code_reverified:true,
  registry_views_reverified:true,
  is_committed_repeated:true,
};

function preflightInput(overrides={}){
  return {
    preparation_intent:intent,
    assembly_manifest:manifest,
    promotion_candidate:candidate,
    sovereign_review_chain:reviewChain,
    deployment_attestation:deployment,
    observation,
    ...overrides,
  };
}

const plan=
  buildDatanetContentCommitmentUnsignedCallPlanAgainstFingerprintV1(
    preflightInput(),
    sovereignFingerprint,
  );
assert.equal(plan.ok,true);
if(plan.ok===false)throw new Error(plan.reason);
assert.equal(
  plan.status,
  "unsigned_call_plan_ready_for_fresh_pre_sign_revalidation",
);
assert.match(plan.unsigned_call_plan_id,/^voiddccup1_[0-9a-f]{64}$/);
assert.equal(plan.object_preflight_id.startsWith("voiddccop1_"),true);
assert.equal(plan.unsigned_call.from_address,PUBLISHER);
assert.equal(plan.unsigned_call.to_address,CONTRACT);
assert.equal(plan.unsigned_call.value_wei,"0");
assert.equal(
  plan.unsigned_call.function_signature,
  "commit(bytes32,bytes32,uint64)",
);
assert.match(plan.unsigned_call.calldata_sha256,/^[0-9a-f]{64}$/);
const decoded=
  DATANET_CONTENT_COMMITMENT_CALL_INTERFACE_V1.decodeFunctionData(
    "commit",
    plan.unsigned_call.calldata,
  );
assert.equal(String(decoded[0]).toLowerCase(),"0x"+OBJECT_ID);
assert.equal(String(decoded[1]).toLowerCase(),"0x"+CONTENT_SHA);
assert.equal(BigInt(decoded[2]),BigInt(BYTE_LENGTH));
assert.deepEqual(plan.unbound_transaction_fields,{
  transaction_type:null,
  nonce:null,
  gas_limit:null,
  max_fee_per_gas_wei:null,
  max_priority_fee_per_gas_wei:null,
});
assert.equal(plan.materialization.commit_calldata_constructed,true);
assert.equal(plan.materialization.unsigned_call_plan_constructed,true);
assert.equal(plan.materialization.signable_transaction_constructed,false);
assert.equal(
  plan.required_fresh_pre_sign_revalidation
    .object_is_committed_false_twice_required,
  true,
);
assert.equal(
  plan.required_fresh_pre_sign_revalidation
    .prior_observation_never_authorizes_signing,
  true,
);
assert.equal(plan.authority.wallet_access_authorized,false);
assert.equal(plan.authority.signable_transaction_construction_authorized,false);
assert.equal(plan.authority.transaction_signing_authorized,false);
assert.equal(plan.authority.transaction_broadcast_authorized,false);
assert.equal(plan.authority.chain2050_write_authorized,false);

{
  const forgedIntent=structuredClone(intent);
  forgedIntent.commitment.content_sha256="f".repeat(64);
  const {preparation_intent_id:_,...body}=forgedIntent;
  forgedIntent.preparation_intent_id="voiddcpi1_"+sha256(canonicalJson(body));
  const result=
    buildDatanetContentCommitmentUnsignedCallPlanAgainstFingerprintV1(
      preflightInput({preparation_intent:forgedIntent}),
      sovereignFingerprint,
    );
  assert.equal(result.ok,false);
  assert.match(result.reason,/preflight_held:/);
  assert.equal(result.commit_calldata_constructed,false);
}
{
  const badReview=structuredClone(reviewChain);
  const bytes=Buffer.from(badReview.decisions[1].signature_base64,"base64");
  bytes[0]^=1;
  badReview.decisions[1].signature_base64=bytes.toString("base64");
  const withoutId={...badReview.decisions[1]};
  delete withoutId.decision_id;
  badReview.decisions[1].decision_id=
    "voiddpsr1_"+sha256(canonicalJson(withoutId));
  const result=
    buildDatanetContentCommitmentUnsignedCallPlanAgainstFingerprintV1(
      preflightInput({sovereign_review_chain:badReview}),
      sovereignFingerprint,
    );
  assert.equal(result.ok,false);
  assert.match(result.reason,/sovereign_review_signature_invalid/);
  assert.equal(result.commit_calldata_constructed,false);
}
{
  const committed=structuredClone(observation);
  committed.is_committed_before=true;
  committed.is_committed_after=true;
  const result=
    buildDatanetContentCommitmentUnsignedCallPlanAgainstFingerprintV1(
      preflightInput({observation:committed}),
      sovereignFingerprint,
    );
  assert.equal(result.ok,false);
  assert.match(result.reason,/object_preflight_object_already_committed/);
  assert.equal(result.commit_calldata_constructed,false);
}
{
  const production=
    buildDatanetContentCommitmentUnsignedCallPlanV1(preflightInput());
  assert.equal(production.ok,false);
  assert.match(production.reason,/sovereign_review_signer_fingerprint_mismatch/);
  assert.equal(resultOrFalse(production,"commit_calldata_constructed"),false);
}

function resultOrFalse(value,key){
  return value&&Object.prototype.hasOwnProperty.call(value,key)
    ?value[key]
    :false;
}

for(const [key,expected] of Object.entries({
  source_only_plan:true,
  exact_hardened_object_preflight_required:true,
  exact_commit_calldata_materialization_only:true,
  no_dynamic_transaction_fields_bound:true,
  fresh_pre_sign_revalidation_required:true,
  rpc_call:false,
  filesystem_read:false,
  filesystem_write:false,
  credential_access:false,
  wallet_access:false,
  signing:false,
  signable_transaction_construction:false,
  nonce_selection:false,
  gas_limit_selection:false,
  fee_selection:false,
  transaction_broadcast:false,
  chain2050_mutation:false,
  funds_action:false,
})){
  assert.equal(
    VOID_DATANET_CONTENT_COMMITMENT_UNSIGNED_CALL_PLAN_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source=fs.readFileSync(
  path.join(ROOT,"tools/datanet-content-commitment-unsigned-call-plan-v1.mjs"),
  "utf8",
);
for(const forbidden of [
  "http.request",
  "JsonRpcProvider",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "broadcastTransaction",
  "sendTransaction",
  "Wallet(",
  "private_key",
  "mnemonic",
]){
  assert.equal(source.includes(forbidden),false,"planner contains "+forbidden);
}

assert.notEqual(
  sovereignFingerprint,
  VOID_DATANET_PHASE0_SOVEREIGN_PRIMARY_DER_SHA256_V1,
);

console.log("VOID_DATANET_CONTENT_COMMITMENT_UNSIGNED_CALL_PLAN_V1_PROOF_GREEN");
console.log("hardened_object_preflight_reverified=true");
console.log("approved_packet_and_sovereign_chain_reverified=true");
console.log("forged_intent_rejected_before_calldata=true");
console.log("bad_sovereign_signature_rejected_before_calldata=true");
console.log("already_committed_rejected_before_calldata=true");
console.log("production_non_sovereign_test_key_rejected=true");
console.log("exact_commit_calldata_constructed=true");
console.log("unsigned_call_plan_constructed=true");
console.log("from_address_bound_to_publisher=true");
console.log("to_address_bound_to_registry=true");
console.log("transaction_value_wei=0");
console.log("dynamic_transaction_fields_bound=false");
console.log("fresh_pre_sign_revalidation_required=true");
console.log("signable_transaction_constructed=false");
console.log("wallet_access=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("chain2050_mutation=false");
