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
  buildDatanetContentCommitmentUnsignedCallPlanAgainstFingerprintV1,
} from "../tools/datanet-content-commitment-unsigned-call-plan-v1.mjs";
import {
  VOID_DATANET_CONTENT_COMMITMENT_PRE_SIGN_REVALIDATION_AUTHORITY_V1,
  runDatanetContentCommitmentPreSignRevalidationAgainstFingerprintV1,
  runDatanetContentCommitmentPreSignRevalidationV1,
} from "../tools/datanet-content-commitment-pre-sign-revalidation-v1.mjs";
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


const oldObservation={
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

function evidence(overrides={}){
  return {
    preparation_intent:intent,
    assembly_manifest:manifest,
    promotion_candidate:candidate,
    sovereign_review_chain:reviewChain,
    deployment_attestation:deployment,
    observation:oldObservation,
    ...overrides,
  };
}

const unsignedPlan=
  buildDatanetContentCommitmentUnsignedCallPlanAgainstFingerprintV1(
    evidence(),
    sovereignFingerprint,
  );
assert.equal(unsignedPlan.ok,true);
if(unsignedPlan.ok===false)throw new Error(unsignedPlan.reason);

const RPC_VIEWS=new Interface([
  "function registryVersion() view returns (uint256)",
  "function maxObjectBytes() view returns (uint64)",
  "function publisher() view returns (address)",
  "function predecessor() view returns (address)",
  "function isCommitted(bytes32 objectIdSha256) view returns (bool)",
]);

function encodeResult(name,values){
  return RPC_VIEWS.encodeFunctionResult(name,values);
}

function transportFixture(options={}){
  const calls=[];
  let blockReads=0;
  let committedReads=0;
  let nonceReads=0;
  const transport=async(call)=>{
    calls.push(structuredClone(call));
    switch(call.method){
      case "eth_chainId":
        return "0x802";
      case "eth_blockNumber":
        return "0x6f";
      case "eth_getBlockByNumber":
        blockReads+=1;
        return {number:"0x6f",hash:HEAD_HASH};
      case "eth_getCode":
        return runtime.runtime_code;
      case "eth_call":{
        const data=String(call.params?.[0]?.data||"").toLowerCase();
        for(const name of [
          "registryVersion",
          "maxObjectBytes",
          "publisher",
          "predecessor",
          "isCommitted",
        ]){
          if(data.startsWith(RPC_VIEWS.getFunction(name).selector.toLowerCase())){
            if(name==="registryVersion")return encodeResult(name,[1n]);
            if(name==="maxObjectBytes")return encodeResult(name,[268435456n]);
            if(name==="publisher")return encodeResult(name,[PUBLISHER]);
            if(name==="predecessor")return encodeResult(name,[PREDECESSOR]);
            if(name==="isCommitted"){
              committedReads+=1;
              return encodeResult(name,[
                options.committedSecondPass===true&&committedReads>2,
              ]);
            }
          }
        }
        throw new Error("unexpected_eth_call");
      }
      case "eth_getTransactionCount":
        nonceReads+=1;
        return options.nonceDrift===true&&nonceReads>1?"0x8":"0x7";
      case "eth_gasPrice":
        return "0x3b9aca00";
      case "eth_estimateGas":
        return options.gasTooHigh===true?"0x989680":"0xc350";
      case "eth_getBalance":
        return options.lowBalance===true?"0x1":"0xde0b6b3a7640000";
      default:
        throw new Error("unexpected_rpc_method:"+call.method);
    }
  };
  return {calls,transport};
}

function policy(overrides={}){
  return {
    enabled:true,
    chain_id:"2050",
    rpc_url:"http://127.0.0.1:18545/",
    gas_limit_multiplier_bps:"12000",
    max_gas_limit:"100000",
    fee_multiplier_bps:"20000",
    max_fee_per_gas_wei:"3000000000",
    max_priority_fee_per_gas_wei:"1000000000",
    max_total_gas_cost_wei:"300000000000000",
    request_timeout_ms:5000,
    max_response_bytes:65536,
    ...overrides,
  };
}

function preSignInput(transport,overrides={}){
  return {
    ...evidence(),
    compiled_identity:identity,
    unsigned_call_plan:unsignedPlan,
    policy:policy(),
    transport,
    ...overrides,
  };
}

{
  const f=transportFixture();
  const result=
    await runDatanetContentCommitmentPreSignRevalidationAgainstFingerprintV1(
      preSignInput(f.transport),
      sovereignFingerprint,
    );
  if(result.ok===false){
    throw new Error("base_green_failed:"+result.reason);
  }
  assert.equal(result.ok,true);
  assert.equal(
    result.status,
    "fresh_pre_sign_revalidation_green_unsigned_transaction_candidate",
  );
  assert.match(result.pre_sign_revalidation_id,/^voiddccpsr1_[0-9a-f]{64}$/);
  assert.equal(result.nonce_stable_across_revalidation,true);
  assert.equal(result.first_pending_nonce,"7");
  assert.equal(result.final_pending_nonce,"7");
  assert.equal(result.unsigned_transaction_candidate.transaction_type,2);
  assert.equal(result.unsigned_transaction_candidate.chain_id,"2050");
  assert.equal(result.unsigned_transaction_candidate.nonce,"7");
  assert.equal(result.unsigned_transaction_candidate.from_address,PUBLISHER);
  assert.equal(result.unsigned_transaction_candidate.to_address,CONTRACT);
  assert.equal(result.unsigned_transaction_candidate.value_wei,"0");
  assert.equal(
    result.unsigned_transaction_candidate.calldata,
    unsignedPlan.unsigned_call.calldata,
  );
  assert.equal(result.unsigned_transaction_candidate.gas_limit,"60000");
  assert.equal(
    result.unsigned_transaction_candidate.max_fee_per_gas_wei,
    "2000000000",
  );
  assert.equal(
    result.unsigned_transaction_candidate.max_priority_fee_per_gas_wei,
    "1000000000",
  );
  assert.equal(result.authority.signer_identity_bound,false);
  assert.equal(result.authority.signer_access_authorized,false);
  assert.equal(result.authority.transaction_signing_authorized,false);
  assert.equal(result.authority.transaction_broadcast_authorized,false);
  assert.equal(result.authority.chain2050_write_authorized,false);
  assert.equal(result.signing_performed,false);
  assert.equal(result.signer_access_performed,false);
  assert.equal(result.wallet_access_performed,false);
  assert.equal(result.transaction_broadcast_performed,false);
  assert.equal(result.chain2050_mutation_performed,false);
  assert.equal(result.funds_action_performed,false);
  assert.equal(
    f.calls.filter(x=>x.method==="eth_getTransactionCount").length,
    2,
  );
  assert.equal(
    f.calls.filter(x=>x.method==="eth_estimateGas").length,
    2,
  );
  for(const call of f.calls.filter(x=>x.method==="eth_estimateGas")){
    assert.deepEqual(call.params,[{
      from:PUBLISHER,
      to:CONTRACT,
      value:"0x0",
      data:unsignedPlan.unsigned_call.calldata,
    },"pending"]);
  }
}

{
  const f=transportFixture({nonceDrift:true});
  const result=
    await runDatanetContentCommitmentPreSignRevalidationAgainstFingerprintV1(
      preSignInput(f.transport),
      sovereignFingerprint,
    );
  assert.equal(result.ok,false);
  assert.equal(
    result.reason,
    "datanet_pre_sign_pending_nonce_changed_during_revalidation",
  );
}

{
  const f=transportFixture({committedSecondPass:true});
  const result=
    await runDatanetContentCommitmentPreSignRevalidationAgainstFingerprintV1(
      preSignInput(f.transport),
      sovereignFingerprint,
    );
  assert.equal(result.ok,false);
  assert.match(result.reason,/datanet_pre_sign_second_preflight_held:/);
}

{
  const f=transportFixture({gasTooHigh:true});
  const result=
    await runDatanetContentCommitmentPreSignRevalidationAgainstFingerprintV1(
      preSignInput(f.transport),
      sovereignFingerprint,
    );
  assert.equal(result.ok,false);
  assert.equal(result.reason,"datanet_pre_sign_gas_limit_exceeds_policy");
}

{
  const f=transportFixture({lowBalance:true});
  const result=
    await runDatanetContentCommitmentPreSignRevalidationAgainstFingerprintV1(
      preSignInput(f.transport),
      sovereignFingerprint,
    );
  assert.equal(result.ok,false);
  assert.equal(
    result.reason,
    "datanet_pre_sign_native_gas_balance_or_cost_cap_failed",
  );
}

{
  const f=transportFixture();
  const forged=structuredClone(unsignedPlan);
  forged.unsigned_call.calldata=
    forged.unsigned_call.calldata.slice(0,-2)+"00";
  const result=
    await runDatanetContentCommitmentPreSignRevalidationAgainstFingerprintV1(
      preSignInput(f.transport,{unsigned_call_plan:forged}),
      sovereignFingerprint,
    );
  assert.equal(result.ok,false);
  assert.equal(result.reason,"datanet_pre_sign_unsigned_plan_mismatch");
  assert.equal(f.calls.length,0);
}

{
  const f=transportFixture();
  const production=
    await runDatanetContentCommitmentPreSignRevalidationV1(
      preSignInput(f.transport),
    );
  assert.equal(production.ok,false);
  assert.match(production.reason,/datanet_pre_sign_unsigned_plan_rebuild_held:/);
  assert.equal(f.calls.length,0);
}

{
  const f=transportFixture();
  const result=
    await runDatanetContentCommitmentPreSignRevalidationAgainstFingerprintV1(
      preSignInput(f.transport,{
        policy:policy({max_fee_per_gas_wei:"1500000000"}),
      }),
      sovereignFingerprint,
    );
  assert.equal(result.ok,false);
  assert.equal(result.reason,"datanet_pre_sign_fee_exceeds_policy");
}

{
  const f=transportFixture();
  const result=
    await runDatanetContentCommitmentPreSignRevalidationAgainstFingerprintV1(
      preSignInput(f.transport,{
        policy:policy({rpc_url:"https://example.com/"}),
      }),
      sovereignFingerprint,
    );
  assert.equal(result.ok,false);
  assert.equal(result.reason,"datanet_pre_sign_policy_invalid");
  assert.equal(f.calls.length,0);
}

for(const [key,expected] of Object.entries({
  source_only_dynamic_binding:true,
  exact_unsigned_call_plan_required:true,
  two_fresh_object_preflights_required:true,
  pending_nonce_stability_required:true,
  pending_gas_estimate_required:true,
  pending_native_balance_required:true,
  explicit_bounded_fee_policy_required:true,
  unsigned_transaction_candidate_may_be_materialized:true,
  signing_authorized:false,
  signer_access:false,
  wallet_access:false,
  credential_access:false,
  transaction_broadcast:false,
  chain2050_mutation:false,
  automatic_retry:false,
  funds_action:false,
})){
  assert.equal(
    VOID_DATANET_CONTENT_COMMITMENT_PRE_SIGN_REVALIDATION_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source=fs.readFileSync(
  path.join(
    ROOT,
    "tools/datanet-content-commitment-pre-sign-revalidation-v1.mjs",
  ),
  "utf8",
);
for(const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "personal_",
  "admin_",
  "debug_",
  "Wallet(",
  "createPrivateKey",
  "privateKey",
  "NODE_PRIVKEY",
  "mnemonic",
  "broadcastTransaction",
  "sendTransaction",
]){
  assert.equal(source.includes(forbidden),false,"source contains "+forbidden);
}

console.log(
  "VOID_DATANET_CONTENT_COMMITMENT_PRE_SIGN_REVALIDATION_V1_PROOF_GREEN",
);
console.log("exact_unsigned_call_plan_rebuilt=true");
console.log("hardened_preflight_before_dynamic_binding=true");
console.log("hardened_preflight_after_dynamic_binding=true");
console.log("object_uncommitted_after_dynamic_binding=true");
console.log("pending_nonce_stable_across_revalidation=true");
console.log("exact_pending_gas_estimate_bound=true");
console.log("explicit_bounded_fee_policy=true");
console.log("publisher_pending_native_balance_verified=true");
console.log("nonce_drift_rejected=true");
console.log("second_pass_commit_race_rejected=true");
console.log("gas_cap_failure_rejected=true");
console.log("balance_or_cost_cap_failure_rejected=true");
console.log("tampered_unsigned_plan_rejected_before_rpc=true");
console.log("production_non_sovereign_test_key_rejected_before_rpc=true");
console.log("remote_rpc_rejected_before_rpc=true");
console.log("unsigned_transaction_candidate_materialized=true");
console.log("signer_identity_bound=false");
console.log("signer_access=false");
console.log("wallet_access=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("chain2050_mutation=false");
