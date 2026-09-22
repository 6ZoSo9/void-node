#!/usr/bin/env node
import crypto from "node:crypto";
import {
  Interface,
  getAddress,
} from "ethers";
import {
  VOID_DATANET_CONTENT_COMMITMENT_DEPLOYMENT_ATTESTATION_V1,
} from "./datanet-content-commitment-deployment-attestation-v1.mjs";
import {
  EXPECTED as ACCEPTED_COMPILER_IDENTITY,
} from "./datanet-content-commitment-compiled-identity-acceptance-v1.mjs";
import {
  canonicalJson,
  sha256,
} from "./datanet-content-commitment-compiler-profile-v1.mjs";

export const VOID_DATANET_CONTENT_COMMITMENT_OBJECT_PREFLIGHT_V1 =
  "VOID_DATANET_CONTENT_COMMITMENT_OBJECT_PREFLIGHT_V1";

export const VOID_DATANET_PHASE0_SOVEREIGN_PRIMARY_DER_SHA256_V1 =
  "23e2d92ebeb1d4b025eeb2a76f65b7f8ff6e6cc091f542e202569c9d5abbbd30";

export const VOID_DATANET_CONTENT_COMMITMENT_OBJECT_PREFLIGHT_AUTHORITY_V1 = {
  pure_observation_validation_only: true,
  approved_preparation_intent_required: true,
  sovereign_signed_review_chain_required: true,
  exact_approved_packet_binding_required: true,
  production_sovereign_fingerprint_pinned: true,
  exact_deployment_attestation_required: true,
  exact_commitment_tuple_required: true,
  fixed_block_observation_required: true,
  repeated_is_committed_observation_required: true,
  block_hash_revalidation_required: true,
  ready_for_separate_unsigned_transaction_plan_may_be_true: true,
  rpc_call: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  commit_calldata_construction: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_broadcast: false,
  chain2050_mutation: false,
  validator_mutation: false,
  governance_mutation: false,
  runtime_service_action: false,
  work_credit_award: false,
  funds_action: false,
};

const HASH=/^0x[0-9a-f]{64}$/;
const SHA256=/^[0-9a-f]{64}$/;
const ADDRESS=/^0x[0-9a-f]{40}$/;
const PREFLIGHT_ID=/^voiddccop1_[0-9a-f]{64}$/;
const ASSEMBLY_ID=/^voiddppa1_[0-9a-f]{64}$/;
const CANDIDATE_ID=/^voiddcp1_[0-9a-f]{32}$/;
const DECISION_ID=/^voiddpsr1_[0-9a-f]{64}$/;
const REVIEW_DOMAIN="void.datanet.phase0.sovereign-review-decision.v1";
const REVIEW_ROLE="sovereign_primary_governance_attestation";
const ZERO_SHA256="0".repeat(64);
const MAX_REVIEW_DECISIONS=32;

const DECISION_KEYS=[
  "marker","version","chain_id","phase","authority_mode",
  "assembly_id","assembly_manifest_sha256","candidate_id",
  "promotion_candidate_sha256","sequence","previous_decision_sha256",
  "decision","reason_code","review_evidence_sha256","decided_at_utc",
  "signer_role","signer_public_key_der_sha256","signature_algorithm",
  "signature_domain","preparation_boundary","signature_base64","decision_id",
];
const PREPARATION_BOUNDARY_KEYS=[
  "separate_canonical_preparation_eligible",
  "chain2050_write_authorized",
  "transaction_construction_authorized",
  "transaction_signing_authorized",
  "transaction_broadcast_authorized",
  "validator_authority_granted",
  "governance_mutation_authorized",
  "automatic_promotion",
  "runtime_service_action",
  "funds_action",
];
const HOLD_REASONS=new Set([
  "MORE_EVIDENCE_REQUIRED",
  "REVIEW_DEFERRED",
  "POLICY_REVIEW_REQUIRED",
  "CONFLICT_REQUIRES_REVIEW",
]);

const VIEWS=new Interface([
  "function registryVersion() view returns (uint256)",
  "function maxObjectBytes() view returns (uint64)",
  "function publisher() view returns (address)",
  "function predecessor() view returns (address)",
  "function isCommitted(bytes32 objectIdSha256) view returns (bool)",
]);

function text(value){
  return typeof value==="string"?value.trim():String(value??"").trim();
}
function plain(value){
  return value!==null&&typeof value==="object"&&!Array.isArray(value);
}
function exactKeys(value,expected){
  if(!plain(value)) return false;
  return JSON.stringify(Object.keys(value).sort())===
    JSON.stringify([...expected].sort());
}
function address(value){
  const raw=text(value);
  if(!/^0x[0-9a-fA-F]{40}$/.test(raw)) return "";
  try{
    const normalized=getAddress(raw).toLowerCase();
    return ADDRESS.test(normalized)?normalized:"";
  }catch(error){
    return "";
  }
}
function hash(value){
  const raw=text(value).toLowerCase();
  return HASH.test(raw)?raw:"";
}
function sha(value){
  const raw=text(value).toLowerCase();
  return SHA256.test(raw)?raw:"";
}
function decimal(value,{positive=false}={}){
  try{
    const raw=text(value);
    if(!/^(0|[1-9][0-9]{0,77})$/.test(raw)) return null;
    const parsed=BigInt(raw);
    if(parsed<0n||(positive&&parsed===0n)) return null;
    return parsed;
  }catch(error){
    return null;
  }
}
function canonicalUint64(value){
  try{
    const raw=text(value);
    if(!/^(0|[1-9][0-9]{0,19})$/.test(raw)) return null;
    const parsed=BigInt(raw);
    if(parsed>18446744073709551615n) return null;
    return parsed;
  }catch(error){
    return null;
  }
}
function canonicalUtc(value){
  if(typeof value!=="string") return "";
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)) return "";
  const parsed=Date.parse(value);
  if(!Number.isFinite(parsed)) return "";
  return new Date(parsed).toISOString()===value.replace("Z",".000Z")?value:"";
}
function fail(reason,detail=undefined){
  return {
    ok:false,
    status:"held",
    marker:VOID_DATANET_CONTENT_COMMITMENT_OBJECT_PREFLIGHT_V1,
    version:1,
    reason,
    ...(detail===undefined?{}:{detail}),
    object_uncommitted_preflight_verified:false,
    ready_for_separate_unsigned_transaction_plan:false,
    commit_calldata_construction_authorized:false,
    transaction_construction_authorized:false,
    transaction_signing_authorized:false,
    transaction_broadcast_authorized:false,
    chain2050_write_authorized:false,
    authority:VOID_DATANET_CONTENT_COMMITMENT_OBJECT_PREFLIGHT_AUTHORITY_V1,
  };
}

function validatePreparationIntent(value){
  if(!plain(value)) return {ok:false,reason:"preparation_intent_invalid"};
  if(
    value.marker!=="VOID_DATANET_PHASE0_CANONICAL_PREPARATION_INTENT_V1"||
    value.version!==1||
    value.status!=="PREPARATION_INTENT_ONLY"||
    value.chain_id!==2050||
    value.phase!==0||
    value.authority_mode!=="PHASE0_OPERATOR_ROOTED"||
    typeof value.preparation_intent_id!=="string"||
    !/^voiddcpi1_[0-9a-f]{64}$/.test(value.preparation_intent_id)
  ){
    return {ok:false,reason:"preparation_intent_contract_mismatch"};
  }
  const {preparation_intent_id:id,...body}=value;
  if(id!=="voiddcpi1_"+sha256(canonicalJson(body))){
    return {ok:false,reason:"preparation_intent_id_mismatch"};
  }
  if(
    value.target_contract_source?.contract_name!=="DatanetContentCommitmentRegistryV1"||
    value.target_contract_source?.source_path!==
      "contracts/mainnet/DatanetContentCommitmentRegistryV1.sol"||
    value.target_contract_source?.source_sha256!==
      ACCEPTED_COMPILER_IDENTITY.contract_source_sha256||
    value.target_contract_source?.function_signature!==
      "commit(bytes32,bytes32,uint64)"||
    value.sovereign_review?.decision!==
      "APPROVE_FOR_SEPARATE_CANONICAL_PREPARATION"||
    value.sovereign_review?.separate_canonical_preparation_eligible!==true||
    value.deployment_binding?.status!=="UNBOUND_REQUIRED"||
    value.required_preflight?.fresh_read_only_is_committed_check_required!==true||
    value.authority?.preparation_intent_only!==true||
    value.authority?.transaction_construction_authorized!==false||
    value.authority?.calldata_construction_authorized!==false||
    value.authority?.transaction_signing_authorized!==false||
    value.authority?.transaction_broadcast_authorized!==false||
    value.authority?.chain2050_write_authorized!==false
  ){
    return {ok:false,reason:"preparation_intent_boundary_mismatch"};
  }
  const object=value.commitment;
  if(
    !plain(object)||
    !sha(object.object_id_sha256)||
    !sha(object.content_sha256)||
    decimal(object.byte_length,{positive:true})===null
  ){
    return {ok:false,reason:"preparation_intent_commitment_invalid"};
  }
  return {
    ok:true,
    preparation_intent_id:id,
    object_id_sha256:object.object_id_sha256,
    content_sha256:object.content_sha256,
    byte_length:String(object.byte_length),
  };
}

function validateApprovedPacketBinding(intent,manifest,candidate){
  if(!plain(manifest)||!plain(candidate)){
    return {ok:false,reason:"approved_packet_evidence_invalid"};
  }
  if(
    manifest.marker!=="VOID_DATANET_PROMOTION_PACKET_ASSEMBLY_V1"||
    manifest.version!==1||
    candidate.marker!=="VOID_DATANET_CHAIN_PROMOTION_CANDIDATE_V1"
  ){
    return {ok:false,reason:"approved_packet_contract_mismatch"};
  }

  const assemblyId=text(manifest.assembly_id);
  if(!ASSEMBLY_ID.test(assemblyId)){
    return {ok:false,reason:"approved_packet_assembly_id_invalid"};
  }
  const {assembly_id:_assemblyId,...manifestBody}=manifest;
  if(assemblyId!=="voiddppa1_"+sha256(canonicalJson(manifestBody))){
    return {ok:false,reason:"approved_packet_assembly_id_mismatch"};
  }
  const manifestSha=sha256(canonicalJson(manifest));
  const candidateSha=sha256(canonicalJson(candidate));

  const candidateObject=candidate.candidate;
  const manifestObject=manifest.object;
  const candidateId=text(candidateObject?.candidate_id);
  if(
    !CANDIDATE_ID.test(candidateId)||
    !plain(manifestObject)||
    !plain(candidateObject)
  ){
    return {ok:false,reason:"approved_packet_object_invalid"};
  }

  if(
    intent.assembly?.assembly_id!==assemblyId||
    intent.assembly?.assembly_manifest_sha256!==manifestSha||
    intent.assembly?.candidate_id!==candidateId||
    intent.assembly?.promotion_candidate_sha256!==candidateSha||
    manifest.evidence?.candidate_id!==candidateId||
    manifest.evidence?.promotion_candidate_sha256!==candidateSha
  ){
    return {ok:false,reason:"preparation_intent_packet_hash_binding_mismatch"};
  }

  const objectId=sha(intent.commitment?.object_id_sha256);
  const contentSha=sha(intent.commitment?.content_sha256);
  const byteLength=decimal(intent.commitment?.byte_length,{positive:true});
  if(
    !objectId||!contentSha||byteLength===null||
    manifestObject.object_id_sha256!==objectId||
    manifestObject.content_sha256!==contentSha||
    String(manifestObject.byte_length)!==byteLength.toString()||
    candidateObject.object_id_sha256!==objectId||
    candidateObject.content_sha256!==contentSha||
    String(candidateObject.byte_length)!==byteLength.toString()
  ){
    return {ok:false,reason:"preparation_intent_packet_commitment_binding_mismatch"};
  }

  if(
    manifest.phase_context?.phase!==0||
    manifest.phase_context?.authority_mode!=="PHASE0_OPERATOR_ROOTED"||
    manifest.phase_context?.validator_admission_authority_active!==false||
    manifest.admission?.disposition!=="PHASE0_OPERATOR_REVIEW_ONLY"||
    manifest.admission?.operator_review_required!==true||
    manifest.admission?.canonical_write_authorized!==false||
    manifest.admission?.automatic_promotion!==false||
    candidate.phase_context?.phase!==0||
    candidate.phase_context?.authority_mode!=="PHASE0_OPERATOR_ROOTED"||
    candidate.admission?.disposition!=="PHASE0_OPERATOR_REVIEW_ONLY"||
    candidate.admission?.canonical_write_authorized!==false||
    candidate.admission?.automatic_promotion!==false
  ){
    return {ok:false,reason:"approved_packet_phase_boundary_mismatch"};
  }

  const manifestAuthority=manifest.authority;
  if(
    !plain(manifestAuthority)||
    manifestAuthority.evidence_only!==true||
    Object.entries(manifestAuthority).some(
      ([key,value])=>key!=="evidence_only"&&value!==false,
    )
  ){
    return {ok:false,reason:"approved_packet_authority_mismatch"};
  }

  const assembledAt=canonicalUtc(manifest.assembled_at_utc);
  if(!assembledAt){
    return {ok:false,reason:"approved_packet_assembled_at_invalid"};
  }

  return {
    ok:true,
    assembly_id:assemblyId,
    assembly_manifest_sha256:manifestSha,
    candidate_id:candidateId,
    promotion_candidate_sha256:candidateSha,
    assembled_at_utc:assembledAt,
  };
}

function publicKeyInfo(pem,expectedFingerprint){
  if(typeof pem!=="string"||!SHA256.test(expectedFingerprint)){
    return {ok:false,reason:"sovereign_review_public_key_invalid"};
  }
  try{
    const key=crypto.createPublicKey({key:pem,type:"spki",format:"pem"});
    if(key.asymmetricKeyType!=="ed25519"){
      return {ok:false,reason:"sovereign_review_public_key_not_ed25519"};
    }
    const canonical=key.export({type:"spki",format:"pem"}).toString();
    if(canonical!==pem){
      return {ok:false,reason:"sovereign_review_public_key_not_canonical"};
    }
    const der=key.export({type:"spki",format:"der"});
    const fingerprint=crypto.createHash("sha256").update(der).digest("hex");
    if(fingerprint!==expectedFingerprint){
      return {ok:false,reason:"sovereign_review_signer_fingerprint_mismatch"};
    }
    return {ok:true,key,fingerprint};
  }catch(error){
    return {ok:false,reason:"sovereign_review_public_key_invalid"};
  }
}

function decisionWithoutId(decision){
  const copy={...decision};
  delete copy.decision_id;
  return copy;
}
function decisionSigningBody(decision){
  const copy={...decision};
  delete copy.signature_base64;
  delete copy.decision_id;
  return copy;
}
function decisionHash(decision){
  return sha256(canonicalJson(decision));
}
function decisionSigningBytes(decision){
  return Buffer.from(
    REVIEW_DOMAIN+"\n"+canonicalJson(decisionSigningBody(decision)),
    "utf8",
  );
}
function validSignatureBase64(value){
  if(typeof value!=="string"||!/^[A-Za-z0-9+/]{86}==$/.test(value)) return null;
  const bytes=Buffer.from(value,"base64");
  if(bytes.length!==64||bytes.toString("base64")!==value) return null;
  return bytes;
}
function validPreparationBoundary(boundary,approved){
  if(!exactKeys(boundary,PREPARATION_BOUNDARY_KEYS)) return false;
  if(
    boundary.separate_canonical_preparation_eligible!==approved
  ) return false;
  return PREPARATION_BOUNDARY_KEYS.every((key)=>{
    if(key==="separate_canonical_preparation_eligible") return true;
    return boundary[key]===false;
  });
}

function validateSovereignReviewChain(
  intent,
  packet,
  chain,
  expectedFingerprint,
){
  if(
    !plain(chain)||
    !exactKeys(chain,["public_key_pem","decisions"])||
    !Array.isArray(chain.decisions)||
    chain.decisions.length<1||
    chain.decisions.length>MAX_REVIEW_DECISIONS
  ){
    return {ok:false,reason:"sovereign_review_chain_invalid"};
  }
  const keyInfo=publicKeyInfo(chain.public_key_pem,expectedFingerprint);
  if(keyInfo.ok===false) return keyInfo;

  let previousHash=ZERO_SHA256;
  let previousTime=packet.assembled_at_utc;
  let last=null;
  for(let index=0;index<chain.decisions.length;index+=1){
    const decision=chain.decisions[index];
    if(!exactKeys(decision,DECISION_KEYS)){
      return {ok:false,reason:"sovereign_review_decision_shape_invalid"};
    }
    const isLast=index===chain.decisions.length-1;
    const expectedDecision=isLast
      ?"APPROVE_FOR_SEPARATE_CANONICAL_PREPARATION"
      :"HOLD";
    if(decision.decision!==expectedDecision){
      return {ok:false,reason:"sovereign_review_chain_terminal_order_invalid"};
    }
    if(
      decision.marker!=="VOID_DATANET_PHASE0_SOVEREIGN_REVIEW_DECISION_V1"||
      decision.version!==1||
      decision.chain_id!==2050||
      decision.phase!==0||
      decision.authority_mode!=="PHASE0_OPERATOR_ROOTED"||
      decision.assembly_id!==packet.assembly_id||
      decision.assembly_manifest_sha256!==packet.assembly_manifest_sha256||
      decision.candidate_id!==packet.candidate_id||
      decision.promotion_candidate_sha256!==packet.promotion_candidate_sha256
    ){
      return {ok:false,reason:"sovereign_review_decision_packet_binding_mismatch"};
    }

    const sequence=canonicalUint64(decision.sequence);
    if(sequence===null||sequence!==BigInt(index)){
      return {ok:false,reason:"sovereign_review_decision_sequence_mismatch"};
    }
    if(decision.previous_decision_sha256!==previousHash){
      return {ok:false,reason:"sovereign_review_decision_predecessor_mismatch"};
    }

    if(
      expectedDecision==="HOLD"
        ?!HOLD_REASONS.has(decision.reason_code)
        :decision.reason_code!=="SOVEREIGN_REVIEW_ACCEPTED"
    ){
      return {ok:false,reason:"sovereign_review_decision_reason_invalid"};
    }
    if(
      !sha(decision.review_evidence_sha256)||
      decision.review_evidence_sha256===ZERO_SHA256
    ){
      return {ok:false,reason:"sovereign_review_evidence_hash_invalid"};
    }
    const decidedAt=canonicalUtc(decision.decided_at_utc);
    if(
      !decidedAt||
      Date.parse(decidedAt)<Date.parse(packet.assembled_at_utc)||
      Date.parse(decidedAt)<Date.parse(previousTime)
    ){
      return {ok:false,reason:"sovereign_review_decision_time_invalid"};
    }
    previousTime=decidedAt;

    if(
      decision.signer_role!==REVIEW_ROLE||
      decision.signer_public_key_der_sha256!==expectedFingerprint||
      decision.signature_algorithm!=="Ed25519"||
      decision.signature_domain!==REVIEW_DOMAIN||
      !validPreparationBoundary(
        decision.preparation_boundary,
        expectedDecision==="APPROVE_FOR_SEPARATE_CANONICAL_PREPARATION",
      )
    ){
      return {ok:false,reason:"sovereign_review_decision_authority_mismatch"};
    }

    const signature=validSignatureBase64(decision.signature_base64);
    if(!signature){
      return {ok:false,reason:"sovereign_review_signature_invalid"};
    }
    const id=text(decision.decision_id);
    if(
      !DECISION_ID.test(id)||
      id!=="voiddpsr1_"+sha256(canonicalJson(decisionWithoutId(decision)))
    ){
      return {ok:false,reason:"sovereign_review_decision_id_mismatch"};
    }
    if(
      !crypto.verify(
        null,
        decisionSigningBytes(decision),
        keyInfo.key,
        signature,
      )
    ){
      return {ok:false,reason:"sovereign_review_signature_invalid"};
    }

    previousHash=decisionHash(decision);
    last=decision;
  }

  if(!last){
    return {ok:false,reason:"sovereign_review_chain_invalid"};
  }
  if(
    intent.sovereign_review?.decision_id!==last.decision_id||
    intent.sovereign_review?.decision_sha256!==decisionHash(last)||
    String(intent.sovereign_review?.sequence)!==String(last.sequence)||
    intent.sovereign_review?.signer_role!==REVIEW_ROLE||
    intent.sovereign_review?.signer_public_key_der_sha256!==expectedFingerprint||
    intent.sovereign_review?.decision!==
      "APPROVE_FOR_SEPARATE_CANONICAL_PREPARATION"||
    intent.sovereign_review?.separate_canonical_preparation_eligible!==true
  ){
    return {ok:false,reason:"preparation_intent_sovereign_review_binding_mismatch"};
  }

  return {
    ok:true,
    final_decision_id:last.decision_id,
    final_decision_sha256:decisionHash(last),
    final_sequence:String(last.sequence),
    sovereign_signer_der_sha256:expectedFingerprint,
    review_chain_length:chain.decisions.length,
  };
}

export function verifyDatanetContentCommitmentPreparationAuthorityAgainstFingerprintV1(
  input,
  expectedFingerprint,
){
  if(!plain(input)){
    return fail("object_preflight_input_invalid");
  }
  const preparation=validatePreparationIntent(input.preparation_intent);
  if(preparation.ok===false){
    return fail(preparation.reason);
  }
  const packet=validateApprovedPacketBinding(
    input.preparation_intent,
    input.assembly_manifest,
    input.promotion_candidate,
  );
  if(packet.ok===false){
    return fail(packet.reason);
  }
  const review=validateSovereignReviewChain(
    input.preparation_intent,
    packet,
    input.sovereign_review_chain,
    expectedFingerprint,
  );
  if(review.ok===false){
    return fail(review.reason);
  }
  return {
    ok:true,
    preparation,
    packet,
    review,
  };
}

export function verifyDatanetContentCommitmentPreparationAuthorityV1(input){
  return verifyDatanetContentCommitmentPreparationAuthorityAgainstFingerprintV1(
    input,
    VOID_DATANET_PHASE0_SOVEREIGN_PRIMARY_DER_SHA256_V1,
  );
}

function validateDeployment(value){
  if(!plain(value)) return {ok:false,reason:"deployment_attestation_invalid"};
  if(
    value.marker!==VOID_DATANET_CONTENT_COMMITMENT_DEPLOYMENT_ATTESTATION_V1||
    value.version!==1||
    value.ok!==true||
    value.status!==
      "deployment_attested_genesis_lineage_held_on_fresh_object_uncommitted_preflight"||
    value.deployment_attested!==true||
    value.predecessor_lineage_attested!==true||
    value.genesis_predecessor!==true||
    value.object_uncommitted_preflight_verified!==false||
    value.transaction_construction_authorized!==false||
    value.transaction_signing_authorized!==false||
    value.transaction_broadcast_authorized!==false||
    value.chain2050_write_authorized!==false||
    typeof value.deployment_attestation_id!=="string"||
    !/^voiddccda1_[0-9a-f]{64}$/.test(value.deployment_attestation_id)
  ){
    return {ok:false,reason:"deployment_attestation_contract_mismatch"};
  }
  const registry=address(value.registry_contract_address);
  const publisher=address(value.publisher_address);
  const predecessor=address(value.predecessor_address);
  const runtimeSha=sha(value.deployed_runtime_sha256);
  const compiledIdentityId=text(value.compiled_identity_id);
  const normalizedEvidence={
    chain_id:text(value.chain_id),
    observation_block_number:text(value.observation_block_number),
    observation_block_hash:text(value.observation_block_hash).toLowerCase(),
    registry_contract_address:registry,
    publisher_address:publisher,
    predecessor_address:predecessor,
    registry_version:text(value.registry_version),
    max_object_bytes:text(value.max_object_bytes),
    deployment_transaction_hash:text(value.deployment_transaction_hash).toLowerCase(),
    deployment_from_address:address(value.deployment_from_address),
    deployment_nonce:text(value.deployment_nonce),
    deployment_block_number:text(value.deployment_block_number),
    deployment_block_hash:text(value.deployment_block_hash).toLowerCase(),
    observed_confirmation_count:text(value.observed_confirmation_count),
    minimum_confirmation_count:text(value.minimum_confirmation_count),
    deployment_data_keccak256:text(value.deployment_data_keccak256).toLowerCase(),
    deployed_runtime_sha256:runtimeSha,
    deployed_runtime_keccak256:text(value.deployed_runtime_keccak256).toLowerCase(),
    compiled_identity_id:compiledIdentityId,
  };
  if(
    !registry||!publisher||!predecessor||
    normalizedEvidence.chain_id!=="2050"||
    normalizedEvidence.registry_version!=="1"||
    normalizedEvidence.max_object_bytes!=="268435456"||
    !runtimeSha||
    !hash(normalizedEvidence.observation_block_hash)||
    !hash(normalizedEvidence.deployment_transaction_hash)||
    !normalizedEvidence.deployment_from_address||
    !hash(normalizedEvidence.deployment_block_hash)||
    !/^0x[0-9a-f]{64}$/.test(normalizedEvidence.deployment_data_keccak256)||
    !/^0x[0-9a-f]{64}$/.test(normalizedEvidence.deployed_runtime_keccak256)||
    compiledIdentityId!==ACCEPTED_COMPILER_IDENTITY.identity_id
  ){
    return {ok:false,reason:"deployment_attestation_binding_invalid"};
  }
  const expectedDeploymentId=
    "voiddccda1_"+sha256(canonicalJson(normalizedEvidence));
  if(value.deployment_attestation_id!==expectedDeploymentId){
    return {ok:false,reason:"deployment_attestation_id_mismatch"};
  }
  return {
    ok:true,
    deployment_attestation_id:value.deployment_attestation_id,
    registry_contract_address:registry,
    publisher_address:publisher,
    predecessor_address:predecessor,
    deployed_runtime_sha256:runtimeSha,
    compiled_identity_id:compiledIdentityId,
  };
}

export function verifyDatanetContentCommitmentObjectPreflightAgainstFingerprintV1(
  input,
  expectedFingerprint,
){
  if(!plain(input)||!plain(input.observation)){
    return fail("object_preflight_input_invalid");
  }

  const authority=
    verifyDatanetContentCommitmentPreparationAuthorityAgainstFingerprintV1(
      input,
      expectedFingerprint,
    );
  if(authority.ok===false){
    return authority;
  }
  const preparation=authority.preparation;

  const deployment=validateDeployment(input.deployment_attestation);
  if(deployment.ok===false){
    return fail(deployment.reason);
  }

  const observation=input.observation;
  const registry=address(observation.registry_contract_address);
  const blockNumber=decimal(observation.observation_block_number,{positive:true});
  const blockHashA=hash(observation.observation_block_hash_before);
  const blockHashB=hash(observation.observation_block_hash_after);
  const runtimeSha=sha(observation.deployed_runtime_sha256);
  const publisher=address(observation.views?.publisher_address);
  const predecessor=address(observation.views?.predecessor_address);
  const registryVersion=decimal(observation.views?.registry_version,{positive:true});
  const maxObjectBytes=decimal(observation.views?.max_object_bytes,{positive:true});
  const objectId=sha(observation.object_id_sha256);

  if(
    observation.chain_id!=="2050"||
    registry!==deployment.registry_contract_address||
    blockNumber===null||
    !blockHashA||
    blockHashB!==blockHashA||
    runtimeSha!==deployment.deployed_runtime_sha256||
    publisher!==deployment.publisher_address||
    predecessor!==deployment.predecessor_address||
    registryVersion!==1n||
    maxObjectBytes!==268435456n||
    objectId!==preparation.object_id_sha256
  ){
    return fail("object_preflight_observation_binding_mismatch");
  }

  if(
    observation.is_committed_before!==false||
    observation.is_committed_after!==false
  ){
    return fail("object_preflight_object_already_committed");
  }
  if(
    observation.same_block_tag_for_all_reads!==true||
    observation.block_hash_revalidated!==true||
    observation.runtime_code_reverified!==true||
    observation.registry_views_reverified!==true||
    observation.is_committed_repeated!==true
  ){
    return fail("object_preflight_revalidation_incomplete");
  }

  const evidence={
    chain_id:"2050",
    preparation_intent_id:preparation.preparation_intent_id,
    sovereign_review_decision_id:authority.review.final_decision_id,
    sovereign_review_decision_sha256:authority.review.final_decision_sha256,
    sovereign_signer_der_sha256:authority.review.sovereign_signer_der_sha256,
    deployment_attestation_id:deployment.deployment_attestation_id,
    compiled_identity_id:deployment.compiled_identity_id,
    registry_contract_address:registry,
    observation_block_number:blockNumber.toString(),
    observation_block_hash:blockHashA,
    object_id_sha256:preparation.object_id_sha256,
    content_sha256:preparation.content_sha256,
    byte_length:preparation.byte_length,
    deployed_runtime_sha256:runtimeSha,
    publisher_address:publisher,
    predecessor_address:predecessor,
    registry_version:"1",
    max_object_bytes:"268435456",
  };
  const preflightId="voiddccop1_"+sha256(canonicalJson(evidence));
  if(!PREFLIGHT_ID.test(preflightId)){
    return fail("object_preflight_id_invalid");
  }

  return {
    ok:true,
    status:"object_uncommitted_verified_ready_for_separate_unsigned_transaction_plan",
    marker:VOID_DATANET_CONTENT_COMMITMENT_OBJECT_PREFLIGHT_V1,
    version:1,
    object_preflight_id:preflightId,
    ...evidence,
    sovereign_review_chain_verified:true,
    approved_packet_commitment_verified:true,
    object_uncommitted_preflight_verified:true,
    ready_for_separate_unsigned_transaction_plan:true,
    commit_calldata_construction_authorized:false,
    transaction_construction_authorized:false,
    transaction_signing_authorized:false,
    transaction_broadcast_authorized:false,
    chain2050_write_authorized:false,
    next_gate:
      "separate_unsigned_commit_transaction_plan_with_fresh_pre_sign_revalidation",
    authority:VOID_DATANET_CONTENT_COMMITMENT_OBJECT_PREFLIGHT_AUTHORITY_V1,
  };
}

export function verifyDatanetContentCommitmentObjectPreflightV1(input){
  return verifyDatanetContentCommitmentObjectPreflightAgainstFingerprintV1(
    input,
    VOID_DATANET_PHASE0_SOVEREIGN_PRIMARY_DER_SHA256_V1,
  );
}

export const DATANET_CONTENT_COMMITMENT_READ_INTERFACE_V1=VIEWS;
