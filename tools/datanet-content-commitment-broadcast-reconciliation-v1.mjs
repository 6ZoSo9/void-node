import fs from "node:fs";
import path from "node:path";
import {
  canonicalJson,
  sha256,
} from "./datanet-content-commitment-compiler-profile-v1.mjs";

export const VOID_DATANET_CONTENT_COMMITMENT_BROADCAST_RECONCILIATION_V1 =
  "VOID_DATANET_CONTENT_COMMITMENT_BROADCAST_RECONCILIATION_V1";

export const VOID_DATANET_CONTENT_COMMITMENT_BROADCAST_RECONCILIATION_AUTHORITY_V1 = {
  source_only_reconciliation:true,
  durable_consumption_record_readback_required:true,
  durable_submission_intent_readback_required:true,
  canonical_state_store_fingerprint_required:true,
  post_attempt_reconciliation_allowed_after_authorization_expiry:true,
  authorization_expiry_does_not_grant_resubmission:true,
  injected_inspection_only:true,
  submit_method_access:false,
  automatic_resubmission:false,
  metadata_only_inspection_request:true,
  exact_signed_transaction_hash_required:true,
  exact_custody_handle_fingerprint_required:true,
  raw_signed_transaction_input:false,
  raw_signed_transaction_output:false,
  raw_signed_transaction_access:false,
  opaque_custody_handle_input:false,
  opaque_custody_handle_output:false,
  opaque_custody_handle_access:false,
  filesystem_read:true,
  filesystem_mutation:false,
  sovereign_private_key_access:false,
  wallet_access:false,
  transaction_signing:false,
  direct_rpc_transport:false,
  direct_network_transport:false,
  production_broadcaster_activation:false,
  runtime_route_mount:false,
  service_action:false,
  chain2050_write_direct:false,
  validator_mutation:false,
  governance_mutation:false,
  work_credit_mutation:false,
  funds_action_direct:false,
  automatic_retry:false,
};

const AUTHORIZATION_ID=/^voiddccba1_[0-9a-f]{64}$/;
const CONSUMPTION_ID=/^voiddccbac1_[0-9a-f]{64}$/;
const INSPECTION_ID=/^voiddccbair1_[0-9a-f]{64}$/;
const INTENT_ID=/^voiddccbasi1_[0-9a-f]{64}$/;
const SHA256=/^[0-9a-f]{64}$/;
const HASH=/^0x[0-9a-f]{64}$/;
const ADDRESS=/^0x[0-9a-f]{40}$/;
const SAFE_PROVIDER_ID=/^[A-Za-z0-9._:@/-]{0,200}$/;
const MAX_RECORD_BYTES=128*1024;
const MAX_RESULT_DEPTH=16;
const SUBMISSION_DOMAIN=
  "void.datanet.content-commitment.exact-single-submission.v1";

const CONSUMPTION_KEYS=[
  "marker","version","status","chain_id",
  "broadcast_authorization_id","broadcast_authorization_verification_id",
  "opaque_signed_receipt_verification_id","opaque_signed_receipt_id",
  "signing_request_id","signing_authorization_id",
  "signing_consumption_record_id","final_signing_review_preflight_id",
  "external_signing_idempotency_key_sha256",
  "unsigned_transaction_candidate_fingerprint_sha256","publisher_address",
  "signed_transaction_hash","custody_handle_fingerprint_sha256",
  "signed_at_utc","signer_public_key_der_sha256",
  "issued_at_utc","expires_at_utc","consumed_at_utc",
  "state_store_realpath_sha256","consumption","authority","next_gate",
  "broadcast_consumption_record_id",
];
const INTENT_KEYS=[
  "marker","version","status","chain_id","domain",
  "broadcast_authorization_id","broadcast_authorization_verification_id",
  "broadcast_consumption_record_id","inspection_request_id",
  "opaque_signed_receipt_verification_id","opaque_signed_receipt_id",
  "signing_request_id","signing_authorization_id",
  "signing_consumption_record_id",
  "external_signing_idempotency_key_sha256",
  "unsigned_transaction_candidate_fingerprint_sha256","publisher_address",
  "signed_transaction_hash","custody_handle_fingerprint_sha256",
  "canonical_state_store_realpath_sha256",
  "submission_idempotency_key_sha256","claimed_at_utc",
  "automatic_retry_authorized","submission_intent_id",
];
const FORBIDDEN_RESULT_KEYS=new Set([
  "privatekey","private_key","mnemonic","seed","seedphrase","seed_phrase",
  "keystore","password","secret","custodyhandle","custody_handle",
  "rawtransaction","raw_transaction","rawsignedtransaction",
  "raw_signed_transaction","signedtransaction","signed_transaction",
  "signedpayload","signed_payload",
]);

function text(value){
  return typeof value==="string"?value.trim():"";
}
function plain(value){
  return value!==null&&typeof value==="object"&&!Array.isArray(value);
}
function exactKeys(value,expected){
  return plain(value)&&
    JSON.stringify(Object.keys(value).sort())===
      JSON.stringify([...expected].sort());
}
function normalizedKey(value){
  return text(value).toLowerCase().replace(/[^a-z0-9_]/g,"");
}
function forbiddenResultKey(value,depth=0){
  if(!value||typeof value!=="object")return null;
  if(depth>MAX_RESULT_DEPTH)return "__reconciliation_result_depth_exceeded__";
  if(Array.isArray(value)){
    for(const item of value){
      const found=forbiddenResultKey(item,depth+1);
      if(found)return found;
    }
    return null;
  }
  for(const [key,child] of Object.entries(value)){
    if(FORBIDDEN_RESULT_KEYS.has(normalizedKey(key)))return key;
    const found=forbiddenResultKey(child,depth+1);
    if(found)return found;
  }
  return null;
}
function safeErrorClass(error){
  const raw=text(error?.name||"Error");
  return /^[A-Za-z0-9._:-]{1,80}$/.test(raw)?raw:"Error";
}
function held(reason,options={}){
  return {
    ok:false,
    marker:VOID_DATANET_CONTENT_COMMITMENT_BROADCAST_RECONCILIATION_V1,
    version:1,
    status:"held",
    reason,
    broadcast_authorization_id:
      options.broadcast_authorization_id??null,
    broadcast_consumption_record_id:
      options.broadcast_consumption_record_id??null,
    submission_intent_id:
      options.submission_intent_id??null,
    inspection_method_invoked:
      options.inspection_method_invoked===true,
    submit_method_invoked:false,
    reconciliation_required:true,
    automatic_retry_allowed:false,
    raw_signed_transaction_accessed:false,
    opaque_custody_handle_accessed:false,
    sovereign_private_key_access_performed:false,
    wallet_access_performed:false,
    transaction_signing_performed:false,
    direct_rpc_call_performed:false,
    direct_network_call_performed:false,
    chain2050_write_direct_performed:false,
    filesystem_mutation_performed:false,
    authority:
      VOID_DATANET_CONTENT_COMMITMENT_BROADCAST_RECONCILIATION_AUTHORITY_V1,
    ...(options.detail?{detail:options.detail}:{}),
  };
}
function assertNoSymlinkAncestors(target){
  const resolved=path.resolve(target);
  const parsed=path.parse(resolved);
  let cursor=parsed.root;
  const relative=resolved.slice(parsed.root.length);
  for(const segment of relative.split(path.sep).filter(Boolean)){
    cursor=path.join(cursor,segment);
    const stat=fs.lstatSync(cursor);
    if(stat.isSymbolicLink()){
      throw new Error("datanet_reconciliation_symlink_ancestor_rejected");
    }
  }
}
function validatePrivateStateRoot(raw){
  const supplied=text(raw);
  if(!supplied||!path.isAbsolute(supplied)){
    return {ok:false,reason:"datanet_reconciliation_state_root_must_be_absolute"};
  }
  const resolved=path.resolve(supplied);
  try{
    assertNoSymlinkAncestors(resolved);
    const stat=fs.lstatSync(resolved);
    if(
      !stat.isDirectory()||
      stat.isSymbolicLink()||
      (stat.mode&0o777)!==0o700||
      (typeof process.getuid==="function"&&stat.uid!==process.getuid())
    ){
      return {ok:false,reason:"datanet_reconciliation_state_root_invalid"};
    }
    const real=fs.realpathSync(resolved);
    if(real!==resolved){
      return {ok:false,reason:"datanet_reconciliation_state_root_realpath_mismatch"};
    }
    return {ok:true,realpath:real,realpath_sha256:sha256(real)};
  }catch(error){
    return {
      ok:false,
      reason:"datanet_reconciliation_state_root_invalid",
      detail:{error_class:safeErrorClass(error)},
    };
  }
}
function assertPrivateDirectory(directory,label){
  const stat=fs.lstatSync(directory);
  if(
    !stat.isDirectory()||
    stat.isSymbolicLink()||
    (stat.mode&0o777)!==0o700||
    (typeof process.getuid==="function"&&stat.uid!==process.getuid())
  ){
    throw new Error(label+"_invalid");
  }
  assertNoSymlinkAncestors(directory);
}
function readPrivateJson(file,label){
  const stat=fs.lstatSync(file);
  if(
    !stat.isFile()||
    stat.isSymbolicLink()||
    (stat.mode&0o777)!==0o600||
    (typeof process.getuid==="function"&&stat.uid!==process.getuid())||
    stat.size<2||
    stat.size>MAX_RECORD_BYTES
  ){
    throw new Error(label+"_invalid");
  }
  assertNoSymlinkAncestors(file);
  return JSON.parse(fs.readFileSync(file,"utf8"));
}
function consumptionMaterial(record){
  const material={...record};
  delete material.broadcast_consumption_record_id;
  return material;
}
function intentMaterial(record){
  const material={...record};
  delete material.submission_intent_id;
  return material;
}
function validateConsumption(record,authorizationId,consumptionId,stateHash){
  if(
    !exactKeys(record,CONSUMPTION_KEYS)||
    record.marker!==
      "VOID_DATANET_CONTENT_COMMITMENT_BROADCAST_AUTHORIZATION_CONSUMPTION_V1"||
    record.version!==1||
    record.status!=="broadcast_authorization_consumed_before_broadcaster_access"||
    text(record.chain_id)!=="2050"||
    record.broadcast_authorization_id!==authorizationId||
    record.broadcast_consumption_record_id!==consumptionId||
    !HASH.test(text(record.signed_transaction_hash))||
    !SHA256.test(text(record.custody_handle_fingerprint_sha256))||
    !SHA256.test(text(record.unsigned_transaction_candidate_fingerprint_sha256))||
    !ADDRESS.test(text(record.publisher_address))||
    record.state_store_realpath_sha256!==stateHash||
    record.consumption?.authorization_consumed!==true||
    record.consumption?.immutable_consumption_record!==true||
    record.consumption?.replay_rejected_within_exact_state_store!==true||
    record.consumption?.canonical_broadcast_state_store_runtime_binding_required!==true||
    record.consumption?.signed_transaction_hash_bound!==true||
    record.consumption?.custody_handle_fingerprint_bound!==true||
    record.authority?.transaction_broadcast_performed!==false||
    record.authority?.chain2050_write_performed!==false||
    text(record.next_gate)!==
      "exact_broadcaster_access_from_consumed_broadcast_authorization_v1"
  ){
    return {ok:false,reason:"datanet_reconciliation_consumption_record_invalid"};
  }
  const expected=
    "voiddccbac1_"+sha256(canonicalJson(consumptionMaterial(record)));
  if(expected!==consumptionId){
    return {ok:false,reason:"datanet_reconciliation_consumption_id_mismatch"};
  }
  const expiresMs=Date.parse(text(record.expires_at_utc));
  const consumedMs=Date.parse(text(record.consumed_at_utc));
  if(!Number.isFinite(expiresMs)||!Number.isFinite(consumedMs)||consumedMs>=expiresMs){
    return {ok:false,reason:"datanet_reconciliation_consumption_time_invalid"};
  }
  return {ok:true,expiresMs,consumedMs};
}
function validateIntent(intent,consumption,stateHash){
  if(
    !exactKeys(intent,INTENT_KEYS)||
    intent.marker!==
      "VOID_DATANET_CONTENT_COMMITMENT_EXACT_SINGLE_SUBMISSION_INTENT_V1"||
    intent.version!==1||
    intent.status!=="claimed_before_exact_single_submit"||
    text(intent.chain_id)!=="2050"||
    intent.domain!==SUBMISSION_DOMAIN||
    intent.broadcast_authorization_id!==consumption.broadcast_authorization_id||
    intent.broadcast_authorization_verification_id!==
      consumption.broadcast_authorization_verification_id||
    intent.broadcast_consumption_record_id!==
      consumption.broadcast_consumption_record_id||
    !INSPECTION_ID.test(text(intent.inspection_request_id))||
    intent.opaque_signed_receipt_verification_id!==
      consumption.opaque_signed_receipt_verification_id||
    intent.opaque_signed_receipt_id!==consumption.opaque_signed_receipt_id||
    intent.signing_request_id!==consumption.signing_request_id||
    intent.signing_authorization_id!==consumption.signing_authorization_id||
    intent.signing_consumption_record_id!==
      consumption.signing_consumption_record_id||
    intent.external_signing_idempotency_key_sha256!==
      consumption.external_signing_idempotency_key_sha256||
    intent.unsigned_transaction_candidate_fingerprint_sha256!==
      consumption.unsigned_transaction_candidate_fingerprint_sha256||
    intent.publisher_address!==consumption.publisher_address||
    intent.signed_transaction_hash!==consumption.signed_transaction_hash||
    intent.custody_handle_fingerprint_sha256!==
      consumption.custody_handle_fingerprint_sha256||
    intent.canonical_state_store_realpath_sha256!==stateHash||
    !SHA256.test(text(intent.submission_idempotency_key_sha256))||
    !INTENT_ID.test(text(intent.submission_intent_id))||
    intent.automatic_retry_authorized!==false
  ){
    return {ok:false,reason:"datanet_reconciliation_submission_intent_invalid"};
  }
  const expectedIntent=
    "voiddccbasi1_"+sha256(canonicalJson(intentMaterial(intent)));
  if(expectedIntent!==intent.submission_intent_id){
    return {ok:false,reason:"datanet_reconciliation_submission_intent_id_mismatch"};
  }
  const expectedKey=sha256(
    canonicalJson({
      domain:SUBMISSION_DOMAIN,
      broadcast_authorization_id:intent.broadcast_authorization_id,
      broadcast_consumption_record_id:intent.broadcast_consumption_record_id,
      inspection_request_id:intent.inspection_request_id,
      signed_transaction_hash:intent.signed_transaction_hash,
      custody_handle_fingerprint_sha256:
        intent.custody_handle_fingerprint_sha256,
      canonical_state_store_realpath_sha256:
        intent.canonical_state_store_realpath_sha256,
    }),
  );
  if(expectedKey!==intent.submission_idempotency_key_sha256){
    return {ok:false,reason:"datanet_reconciliation_submission_key_mismatch"};
  }
  const claimedMs=Date.parse(text(intent.claimed_at_utc));
  const expiresMs=Date.parse(text(consumption.expires_at_utc));
  if(
    !Number.isFinite(claimedMs)||
    !Number.isFinite(expiresMs)||
    claimedMs>=expiresMs
  ){
    return {ok:false,reason:"datanet_reconciliation_submission_intent_time_invalid"};
  }
  return {ok:true,claimedMs,expiresMs};
}
function validateDecision(value,expectedHash){
  const forbidden=forbiddenResultKey(value);
  if(forbidden){
    return {
      ok:false,
      reason:"datanet_reconciliation_secret_response_rejected",
      detail:{forbidden_key:text(forbidden).slice(0,80)},
    };
  }
  if(!plain(value)){
    return {ok:false,reason:"datanet_reconciliation_inspection_response_invalid"};
  }
  if(value.ok===false){
    if(
      !exactKeys(value,["ok","status","reason"])||
      value.status!=="held"||
      !/^[a-z][a-z0-9_]{2,159}$/.test(text(value.reason))
    ){
      return {ok:false,reason:"datanet_reconciliation_inspection_held_invalid"};
    }
    return {
      ok:false,
      reason:"datanet_reconciliation_inspector_held:"+text(value.reason),
    };
  }
  if(
    !exactKeys(
      value,
      [
        "ok","status","transaction_hash","provider_submission_id",
        "definitive_not_submitted","submission_may_have_occurred",
      ],
    )||
    value.ok!==true||
    !["not_submitted","unknown","accepted","confirmed","reverted"].includes(
      text(value.status),
    )||
    text(value.transaction_hash).toLowerCase()!==expectedHash||
    !SAFE_PROVIDER_ID.test(text(value.provider_submission_id))||
    typeof value.definitive_not_submitted!=="boolean"||
    typeof value.submission_may_have_occurred!=="boolean"
  ){
    return {ok:false,reason:"datanet_reconciliation_inspection_response_invalid"};
  }
  const status=text(value.status);
  if(status==="not_submitted"){
    if(
      value.definitive_not_submitted!==true||
      value.submission_may_have_occurred!==false
    ){
      return {ok:false,reason:"datanet_reconciliation_not_submitted_invalid"};
    }
  }else if(
    value.definitive_not_submitted!==false||
    value.submission_may_have_occurred!==true
  ){
    return {ok:false,reason:"datanet_reconciliation_submission_flags_invalid"};
  }
  return {
    ok:true,
    status,
    transaction_hash:expectedHash,
    provider_submission_id:text(value.provider_submission_id),
    definitive_not_submitted:value.definitive_not_submitted,
    submission_may_have_occurred:value.submission_may_have_occurred,
  };
}

export async function reconcileDatanetContentCommitmentBroadcastWithoutResubmissionWithClockV1(
  input,
  inspector,
  nowMs,
){
  const authorizationId=text(input?.broadcast_authorization_id);
  const consumptionId=text(input?.broadcast_consumption_record_id);
  if(!AUTHORIZATION_ID.test(authorizationId)){
    return held("datanet_reconciliation_authorization_id_invalid");
  }
  if(!CONSUMPTION_ID.test(consumptionId)){
    return held(
      "datanet_reconciliation_consumption_id_invalid",
      {broadcast_authorization_id:authorizationId},
    );
  }
  if(!Number.isSafeInteger(nowMs)||nowMs<=0){
    return held(
      "datanet_reconciliation_clock_invalid",
      {
        broadcast_authorization_id:authorizationId,
        broadcast_consumption_record_id:consumptionId,
      },
    );
  }

  const root=validatePrivateStateRoot(input?.state_dir);
  if(root.ok===false){
    return held(
      root.reason,
      {
        broadcast_authorization_id:authorizationId,
        broadcast_consumption_record_id:consumptionId,
        ...(root.detail?{detail:root.detail}:{}),
      },
    );
  }
  const configuredHash=
    text(input?.canonical_state_store_realpath_sha256).toLowerCase();
  if(!SHA256.test(configuredHash)||configuredHash!==root.realpath_sha256){
    return held(
      "datanet_reconciliation_canonical_state_store_mismatch",
      {
        broadcast_authorization_id:authorizationId,
        broadcast_consumption_record_id:consumptionId,
      },
    );
  }

  let consumption;
  let intent;
  try{
    const consumedDir=path.join(root.realpath,"broadcast-consumed");
    const intentsDir=path.join(root.realpath,"broadcast-submission-intents");
    assertPrivateDirectory(consumedDir,"datanet_reconciliation_consumed_dir");
    assertPrivateDirectory(intentsDir,"datanet_reconciliation_intents_dir");
    consumption=readPrivateJson(
      path.join(consumedDir,authorizationId+".json"),
      "datanet_reconciliation_consumption_record",
    );
    intent=readPrivateJson(
      path.join(intentsDir,authorizationId+".json"),
      "datanet_reconciliation_submission_intent",
    );
  }catch(error){
    return held(
      "datanet_reconciliation_durable_state_read_failed",
      {
        broadcast_authorization_id:authorizationId,
        broadcast_consumption_record_id:consumptionId,
        detail:{error_class:safeErrorClass(error)},
      },
    );
  }
  const consumptionValidation=validateConsumption(
    consumption,
    authorizationId,
    consumptionId,
    root.realpath_sha256,
  );
  if(consumptionValidation.ok===false){
    return held(
      consumptionValidation.reason,
      {
        broadcast_authorization_id:authorizationId,
        broadcast_consumption_record_id:consumptionId,
      },
    );
  }
  const intentValidation=validateIntent(
    intent,
    consumption,
    root.realpath_sha256,
  );
  if(intentValidation.ok===false){
    return held(
      intentValidation.reason,
      {
        broadcast_authorization_id:authorizationId,
        broadcast_consumption_record_id:consumptionId,
        submission_intent_id:text(intent?.submission_intent_id)||null,
      },
    );
  }
  if(nowMs<intentValidation.claimedMs){
    return held(
      "datanet_reconciliation_before_submission_intent_time",
      {
        broadcast_authorization_id:authorizationId,
        broadcast_consumption_record_id:consumptionId,
        submission_intent_id:intent.submission_intent_id,
      },
    );
  }
  if(!inspector||typeof inspector.inspect_submission!=="function"){
    return held(
      "datanet_reconciliation_inspector_missing",
      {
        broadcast_authorization_id:authorizationId,
        broadcast_consumption_record_id:consumptionId,
        submission_intent_id:intent.submission_intent_id,
      },
    );
  }

  const request={
    marker:"VOID_DATANET_CONTENT_COMMITMENT_BROADCAST_RECONCILIATION_REQUEST_V1",
    version:1,
    chain_id:"2050",
    broadcast_authorization_id:authorizationId,
    broadcast_consumption_record_id:consumptionId,
    inspection_request_id:intent.inspection_request_id,
    submission_intent_id:intent.submission_intent_id,
    submission_idempotency_key_sha256:
      intent.submission_idempotency_key_sha256,
    unsigned_transaction_candidate_fingerprint_sha256:
      intent.unsigned_transaction_candidate_fingerprint_sha256,
    publisher_address:intent.publisher_address,
    signed_transaction_hash:intent.signed_transaction_hash,
    custody_handle_fingerprint_sha256:
      intent.custody_handle_fingerprint_sha256,
    canonical_state_store_realpath_sha256:root.realpath_sha256,
    reconciliation_only:true,
    transaction_submission_authorized:false,
    automatic_retry_authorized:false,
  };

  let rawDecision;
  try{
    rawDecision=await inspector.inspect_submission(request);
  }catch(error){
    return held(
      "datanet_reconciliation_inspection_failed",
      {
        broadcast_authorization_id:authorizationId,
        broadcast_consumption_record_id:consumptionId,
        submission_intent_id:intent.submission_intent_id,
        inspection_method_invoked:true,
        detail:{error_class:safeErrorClass(error)},
      },
    );
  }
  const decision=validateDecision(
    rawDecision,
    intent.signed_transaction_hash,
  );
  if(decision.ok===false){
    return held(
      decision.reason,
      {
        broadcast_authorization_id:authorizationId,
        broadcast_consumption_record_id:consumptionId,
        submission_intent_id:intent.submission_intent_id,
        inspection_method_invoked:true,
        ...(decision.detail?{detail:decision.detail}:{}),
      },
    );
  }

  const authorizationExpiredAtReconciliation=
    nowMs>=intentValidation.expiresMs;
  let nextGate;
  if(decision.status==="not_submitted"){
    nextGate=
      "explicit_submission_claim_release_after_definitive_not_submitted_v1";
  }else if(
    decision.status==="confirmed"||
    decision.status==="reverted"
  ){
    nextGate="reconciled_broadcast_receipt_verification_v1";
  }else{
    nextGate="broadcast_reconciliation_without_resubmission_v1";
  }

  return {
    ok:true,
    marker:VOID_DATANET_CONTENT_COMMITMENT_BROADCAST_RECONCILIATION_V1,
    version:1,
    status:"broadcast_reconciled_without_resubmission",
    chain_id:"2050",
    broadcast_authorization_id:authorizationId,
    broadcast_consumption_record_id:consumptionId,
    submission_intent_id:intent.submission_intent_id,
    submission_idempotency_key_sha256:
      intent.submission_idempotency_key_sha256,
    signed_transaction_hash:intent.signed_transaction_hash,
    custody_handle_fingerprint_sha256:
      intent.custody_handle_fingerprint_sha256,
    canonical_state_store_realpath_sha256:root.realpath_sha256,
    authorization_expired_at_reconciliation:
      authorizationExpiredAtReconciliation,
    reconciled_at_utc:new Date(nowMs).toISOString(),
    inspection:{
      status:decision.status,
      transaction_hash:decision.transaction_hash,
      provider_submission_id:decision.provider_submission_id,
      definitive_not_submitted:decision.definitive_not_submitted,
      submission_may_have_occurred:decision.submission_may_have_occurred,
    },
    authority:{
      durable_consumption_record_verified:true,
      durable_submission_intent_verified:true,
      canonical_state_store_verified:true,
      post_attempt_reconciliation_allowed_after_authorization_expiry:true,
      metadata_only_request:true,
      inspection_method_invoked:true,
      submit_method_invoked:false,
      transaction_submission_authorized:false,
      automatic_retry_authorized:false,
      raw_signed_transaction_accessed:false,
      opaque_custody_handle_accessed:false,
      filesystem_mutation_performed:false,
      sovereign_private_key_access_performed:false,
      wallet_access_performed:false,
      transaction_signing_performed:false,
      direct_rpc_call_performed:false,
      direct_network_call_performed:false,
      chain2050_write_direct_performed:false,
    },
    next_gate:nextGate,
    inspection_method_invoked:true,
    submit_method_invoked:false,
    reconciliation_required:
      decision.status==="unknown"||decision.status==="accepted",
    automatic_retry_allowed:false,
    raw_signed_transaction_accessed:false,
    opaque_custody_handle_accessed:false,
    filesystem_mutation_performed:false,
    sovereign_private_key_access_performed:false,
    wallet_access_performed:false,
    transaction_signing_performed:false,
    direct_rpc_call_performed:false,
    direct_network_call_performed:false,
    chain2050_write_direct_performed:false,
    authority_contract:
      VOID_DATANET_CONTENT_COMMITMENT_BROADCAST_RECONCILIATION_AUTHORITY_V1,
  };
}

export async function reconcileDatanetContentCommitmentBroadcastWithoutResubmissionV1(
  input,
  inspector,
){
  return reconcileDatanetContentCommitmentBroadcastWithoutResubmissionWithClockV1(
    input,
    inspector,
    Date.now(),
  );
}
