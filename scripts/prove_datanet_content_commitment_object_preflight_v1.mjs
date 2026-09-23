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
  VOID_DATANET_CONTENT_COMMITMENT_OBJECT_PREFLIGHT_OBSERVER_AUTHORITY_V1,
  observeDatanetContentCommitmentObjectPreflightAgainstFingerprintV1,
  observeDatanetContentCommitmentObjectPreflightV1,
} from "../tools/datanet-content-commitment-object-preflight-observer-v1.mjs";
import {
  VOID_DATANET_PHASE0_SOVEREIGN_PRIMARY_DER_SHA256_V1,
} from "../tools/datanet-content-commitment-object-preflight-v1.mjs";
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
function signedDecision({
  sequence,
  previous,
  decision,
  reason,
  decidedAt,
}){
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
    review_evidence_sha256:sha256(
      "review-evidence:"+sequence+":"+decision,
    ),
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
  const signature=crypto.sign(
    null,
    signingBytes(body),
    sovereign.privateKey,
  ).toString("base64");
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
const reviewChain={
  public_key_pem:sovereignPem,
  decisions:[hold,approve],
};

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

const VIEWS=new Interface([
  "function registryVersion() view returns (uint256)",
  "function maxObjectBytes() view returns (uint64)",
  "function publisher() view returns (address)",
  "function predecessor() view returns (address)",
  "function isCommitted(bytes32 objectIdSha256) view returns (bool)",
]);
function encodeResult(name,values){
  return VIEWS.encodeFunctionResult(name,values);
}
function fixture(options={}){
  const calls=[];
  let blockReads=0;
  let committedReads=0;
  const transport=async(call)=>{
    calls.push(structuredClone(call));
    switch(call.method){
      case "eth_chainId":
        return options.wrongChain?"0x1":"0x802";
      case "eth_blockNumber":
        return "0x6f";
      case "eth_getBlockByNumber":
        blockReads+=1;
        return {
          number:"0x6f",
          hash:options.reorg&&blockReads>1
            ?"0x"+"7".repeat(64)
            :HEAD_HASH,
        };
      case "eth_getCode":
        return options.codeTamper
          ?runtime.runtime_code.slice(0,-2)+"01"
          :runtime.runtime_code;
      case "eth_call":{
        const data=String(call.params?.[0]?.data||"").toLowerCase();
        for(const name of [
          "registryVersion","maxObjectBytes","publisher","predecessor","isCommitted",
        ]){
          if(data.startsWith(VIEWS.getFunction(name).selector.toLowerCase())){
            if(name==="registryVersion")return encodeResult(name,[1n]);
            if(name==="maxObjectBytes")return encodeResult(name,[268435456n]);
            if(name==="publisher")return encodeResult(name,[PUBLISHER]);
            if(name==="predecessor")return encodeResult(name,[PREDECESSOR]);
            if(name==="isCommitted"){
              committedReads+=1;
              return encodeResult(name,[
                options.committed===true||
                (options.commitDrift===true&&committedReads>1),
              ]);
            }
          }
        }
        throw new Error("unexpected_eth_call");
      }
      default:
        throw new Error("unexpected_rpc_method:"+call.method);
    }
  };
  return {calls,transport};
}
function input(transport,override={}){
  return {
    rpc_url:"http://127.0.0.1:18545/",
    request_timeout_ms:5000,
    max_response_bytes:65536,
    compiled_identity:identity,
    deployment_attestation:deployment,
    preparation_intent:intent,
    assembly_manifest:manifest,
    promotion_candidate:candidate,
    sovereign_review_chain:reviewChain,
    transport,
    ...override,
  };
}

{
  const f=fixture();
  const result=
    await observeDatanetContentCommitmentObjectPreflightAgainstFingerprintV1(
      input(f.transport),
      sovereignFingerprint,
    );
  assert.equal(result.ok,true);
  if(result.ok===false)throw new Error(result.reason);
  assert.equal(result.preflight.sovereign_review_chain_verified,true);
  assert.equal(result.preflight.approved_packet_commitment_verified,true);
  assert.equal(result.preflight.object_uncommitted_preflight_verified,true);
  assert.equal(result.preflight.ready_for_separate_unsigned_transaction_plan,true);
  assert.equal(result.preflight.commit_calldata_construction_authorized,false);
  assert.equal(result.preflight.transaction_construction_authorized,false);
  assert.equal(result.preflight.transaction_signing_authorized,false);
  assert.equal(result.preflight.transaction_broadcast_authorized,false);
  assert.equal(result.preflight.chain2050_write_authorized,false);
  assert.equal(result.fixed_block_observation,true);
  assert.equal(result.block_hash_revalidated,true);
  assert.equal(result.repeated_is_committed_verified,true);
  assert.deepEqual(
    [...new Set(f.calls.map(x=>x.method))].sort(),
    ["eth_blockNumber","eth_call","eth_chainId","eth_getBlockByNumber","eth_getCode"].sort(),
  );
}

{
  const f=fixture();
  const result=await observeDatanetContentCommitmentObjectPreflightV1(
    input(f.transport),
  );
  assert.equal(result.ok,false);
  assert.match(result.reason,/sovereign_review_signer_fingerprint_mismatch/);
  assert.equal(f.calls.length,0);
}

{
  const f=fixture();
  const forgedBody=structuredClone(intentBody);
  forgedBody.commitment.object_id_sha256="aa".repeat(32);
  const forged={
    ...forgedBody,
    preparation_intent_id:"voiddcpi1_"+sha256(canonicalJson(forgedBody)),
  };
  const result=
    await observeDatanetContentCommitmentObjectPreflightAgainstFingerprintV1(
      input(f.transport,{preparation_intent:forged}),
      sovereignFingerprint,
    );
  assert.equal(result.ok,false);
  assert.match(result.reason,/packet_commitment_binding_mismatch/);
  assert.equal(f.calls.length,0);
}

{
  const f=fixture();
  const tamperedReview=structuredClone(reviewChain);
  const bytes=Buffer.from(tamperedReview.decisions[1].signature_base64,"base64");
  bytes[0]^=1;
  tamperedReview.decisions[1].signature_base64=bytes.toString("base64");
  tamperedReview.decisions[1].decision_id=
    "voiddpsr1_"+sha256(canonicalJson(
      Object.fromEntries(
        Object.entries(tamperedReview.decisions[1]).filter(([key])=>key!=="decision_id"),
      ),
    ));
  const result=
    await observeDatanetContentCommitmentObjectPreflightAgainstFingerprintV1(
      input(f.transport,{sovereign_review_chain:tamperedReview}),
      sovereignFingerprint,
    );
  assert.equal(result.ok,false);
  assert.match(result.reason,/sovereign_review_signature_invalid/);
  assert.equal(f.calls.length,0);
}

{
  const f=fixture();
  const brokenChain=structuredClone(reviewChain);
  brokenChain.decisions[1].previous_decision_sha256="f".repeat(64);
  const unsigned={...brokenChain.decisions[1]};
  delete unsigned.signature_base64;
  delete unsigned.decision_id;
  brokenChain.decisions[1].signature_base64=crypto.sign(
    null,
    Buffer.from(REVIEW_DOMAIN+"\n"+canonicalJson(unsigned),"utf8"),
    sovereign.privateKey,
  ).toString("base64");
  brokenChain.decisions[1].decision_id=
    "voiddpsr1_"+sha256(canonicalJson(
      Object.fromEntries(
        Object.entries(brokenChain.decisions[1]).filter(([key])=>key!=="decision_id"),
      ),
    ));
  const result=
    await observeDatanetContentCommitmentObjectPreflightAgainstFingerprintV1(
      input(f.transport,{sovereign_review_chain:brokenChain}),
      sovereignFingerprint,
    );
  assert.equal(result.ok,false);
  assert.match(result.reason,/predecessor_mismatch/);
  assert.equal(f.calls.length,0);
}

{
  const f=fixture();
  const tamperedDeployment={
    ...deployment,
    deployment_attestation_id:"voiddccda1_"+"f".repeat(64),
  };
  const result=
    await observeDatanetContentCommitmentObjectPreflightAgainstFingerprintV1(
      input(f.transport,{deployment_attestation:tamperedDeployment}),
      sovereignFingerprint,
    );
  assert.equal(result.ok,false);
  assert.match(result.reason,/deployment_attestation_id_mismatch/);
}
{
  const f=fixture({committed:true});
  const result=
    await observeDatanetContentCommitmentObjectPreflightAgainstFingerprintV1(
      input(f.transport),
      sovereignFingerprint,
    );
  assert.equal(result.ok,false);
  assert.match(result.reason,/object_already_committed/);
}
{
  const f=fixture({commitDrift:true});
  const result=
    await observeDatanetContentCommitmentObjectPreflightAgainstFingerprintV1(
      input(f.transport),
      sovereignFingerprint,
    );
  assert.equal(result.ok,false);
  assert.match(result.reason,/object_already_committed/);
}
{
  const f=fixture({reorg:true});
  const result=
    await observeDatanetContentCommitmentObjectPreflightAgainstFingerprintV1(
      input(f.transport),
      sovereignFingerprint,
    );
  assert.equal(result.ok,false);
  assert.equal(result.reason,"object_preflight_observer_block_revalidation_mismatch");
}
{
  const f=fixture({codeTamper:true});
  const result=
    await observeDatanetContentCommitmentObjectPreflightAgainstFingerprintV1(
      input(f.transport),
      sovereignFingerprint,
    );
  assert.equal(result.ok,false);
  assert.equal(result.reason,"object_preflight_observer_runtime_mismatch");
}
{
  const f=fixture({wrongChain:true});
  const result=
    await observeDatanetContentCommitmentObjectPreflightAgainstFingerprintV1(
      input(f.transport),
      sovereignFingerprint,
    );
  assert.equal(result.ok,false);
  assert.equal(result.reason,"object_preflight_observer_chain_id_mismatch");
}
{
  const f=fixture();
  const result=
    await observeDatanetContentCommitmentObjectPreflightAgainstFingerprintV1(
      input(f.transport,{rpc_url:"https://example.com/"}),
      sovereignFingerprint,
    );
  assert.equal(result.ok,false);
  assert.equal(result.reason,"object_preflight_observer_input_invalid");
  assert.equal(f.calls.length,0);
}

const keyRegistry=JSON.parse(fs.readFileSync(
  path.join(ROOT,"fixtures/governance/void-sovereign-key-role-registry-v1.json"),
  "utf8",
));
assert.equal(
  keyRegistry.roles.sovereign_primary_governance_attestation.public_key_der_sha256,
  VOID_DATANET_PHASE0_SOVEREIGN_PRIMARY_DER_SHA256_V1,
);

for(const [key,expected] of Object.entries({
  canonical_chain_id:"2050",
  loopback_http_only:true,
  fixed_block_observation:true,
  block_hash_revalidation_required:true,
  repeated_is_committed_required:true,
  rpc_mutation:false,
  filesystem_read:false,
  filesystem_write:false,
  credential_access:false,
  wallet_access:false,
  signing:false,
  commit_calldata_construction:false,
  transaction_construction:false,
  transaction_signing:false,
  transaction_broadcast:false,
  deployment:false,
  chain2050_mutation:false,
  automatic_retry:false,
  funds_action:false,
})){
  assert.equal(
    VOID_DATANET_CONTENT_COMMITMENT_OBJECT_PREFLIGHT_OBSERVER_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const observerSource=fs.readFileSync(
  path.join(ROOT,"tools/datanet-content-commitment-object-preflight-observer-v1.mjs"),
  "utf8",
);
for(const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "personal_",
  "admin_",
  "debug_",
  "JsonRpcProvider",
  "Wallet(",
  "private_key",
  "mnemonic",
  "broadcastTransaction",
  "sendTransaction",
]){
  assert.equal(observerSource.includes(forbidden),false,"observer contains "+forbidden);
}

console.log("VOID_DATANET_CONTENT_COMMITMENT_OBJECT_PREFLIGHT_OBSERVER_V1_PROOF_GREEN");
console.log("approved_preparation_intent_bound=true");
console.log("approved_packet_manifest_bound=true");
console.log("approved_promotion_candidate_bound=true");
console.log("sovereign_review_chain_verified=true");
console.log("sovereign_ed25519_signature_verified=true");
console.log("sovereign_review_predecessor_chain_verified=true");
console.log("forged_self_hashed_intent_rejected_before_rpc=true");
console.log("bad_sovereign_signature_rejected_before_rpc=true");
console.log("production_non_sovereign_test_key_rejected_before_rpc=true");
console.log("deployment_attestation_bound=true");
console.log("deployment_attestation_id_recomputed=true");
console.log("accepted_compiler_identity_bound=true");
console.log("loopback_http_only=true");
console.log("fixed_block_observation=true");
console.log("block_hash_revalidated=true");
console.log("runtime_code_reverified=true");
console.log("registry_views_reverified=true");
console.log("is_committed_repeated=true");
console.log("object_uncommitted_preflight_verified=true");
console.log("ready_for_separate_unsigned_transaction_plan=true");
console.log("commit_calldata_constructed=false");
console.log("transaction_constructed=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("chain2050_mutation=false");
