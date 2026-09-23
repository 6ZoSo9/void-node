import fs from "node:fs";
import path from "node:path";
import {
  canonicalJson,
  sha256,
} from "./datanet-content-commitment-compiler-profile-v1.mjs";

export const VOID_DATANET_CONTENT_COMMITMENT_BROADCASTER_INSPECTION_ACCESS_V1 =
  "VOID_DATANET_CONTENT_COMMITMENT_BROADCASTER_INSPECTION_ACCESS_V1";

export const VOID_DATANET_CONTENT_COMMITMENT_BROADCASTER_INSPECTION_ACCESS_AUTHORITY_V1 = {
  durable_broadcast_consumption_record_readback_required:true,
  canonical_broadcast_state_store_fingerprint_required:true,
  runtime_expiry_recheck_required:true,
  exact_signed_transaction_hash_required:true,
  exact_custody_handle_fingerprint_required:true,
  metadata_only_broadcaster_request:true,
  injected_broadcaster_inspection_only:true,
  broadcaster_inspection_access_allowed:true,
  submit_method_access:false,
  transaction_submission_authorized_by_this_gate:false,
  automatic_resubmission:false,
  raw_signed_transaction_input:false,
  raw_signed_transaction_output:false,
  raw_signed_transaction_access:false,
  opaque_custody_handle_input:false,
  opaque_custody_handle_output:false,
  opaque_custody_handle_access:false,
  read_only_rpc_possible_through_injected_inspector:true,
  filesystem_read:true,
  filesystem_mutation:false,
  sovereign_private_key_access:false,
  wallet_access:false,
  transaction_signing:false,
  transaction_broadcast_performed:false,
  chain2050_write_performed:false,
  validator_mutation:false,
  governance_mutation:false,
  work_credit_mutation:false,
  service_action:false,
  funds_action:false,
  automatic_retry:false,
};

const BROADCAST_AUTHORIZATION_ID=/^voiddccba1_[0-9a-f]{64}$/;
const BROADCAST_AUTHORIZATION_VERIFICATION_ID=/^voiddccbav1_[0-9a-f]{64}$/;
const OPAQUE_RECEIPT_VERIFICATION_ID=/^voiddccosrv1_[0-9a-f]{64}$/;
const OPAQUE_RECEIPT_ID=/^voiddccosr1_[0-9a-f]{64}$/;
const SIGNING_REQUEST_ID=/^voiddccpsreq1_[0-9a-f]{64}$/;
const SIGNING_AUTHORIZATION_ID=/^voiddccsta1_[0-9a-f]{64}$/;
const SIGNING_CONSUMPTION_ID=/^voiddccstac1_[0-9a-f]{64}$/;
const FINAL_REVIEW_ID=/^voiddccfsrp1_[0-9a-f]{64}$/;
const BROADCAST_CONSUMPTION_ID=/^voiddccbac1_[0-9a-f]{64}$/;
const INSPECTION_REQUEST_ID=/^voiddccbair1_[0-9a-f]{64}$/;
const SHA256=/^[0-9a-f]{64}$/;
const HASH=/^0x[0-9a-f]{64}$/;
const ADDRESS=/^0x[0-9a-f]{40}$/;
const SAFE_PROVIDER_ID=/^[A-Za-z0-9._:@/-]{0,200}$/;
const MAX_RECORD_BYTES=128*1024;
const MAX_RESULT_DEPTH=16;

const RECORD_KEYS=[
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
const CONSUMPTION_KEYS=[
  "single_use","authorization_consumed","immutable_consumption_record",
  "replay_rejected_within_exact_state_store","replay_prevention_scope",
  "global_replay_prevention_claimed",
  "canonical_broadcast_state_store_runtime_binding_required",
  "expiry_rechecked_at_consumption",
  "consumption_precedes_any_broadcaster_access",
  "signed_transaction_hash_bound","custody_handle_fingerprint_bound",
  "raw_signed_transaction_remains_inaccessible",
  "broadcaster_access_remains_disabled",
];
const AUTHORITY_KEYS=[
  "filesystem_mutation_performed","sovereign_private_key_access_performed",
  "raw_signed_transaction_accessed","opaque_custody_handle_accessed",
  "broadcaster_access_performed","rpc_call_performed",
  "transaction_broadcast_authorized_by_this_gate",
  "transaction_broadcast_performed","chain2050_write_authorized",
  "chain2050_write_performed","validator_mutation_authorized",
  "governance_mutation_authorized","work_credit_mutation_authorized",
  "service_action_authorized","funds_action_authorized",
  "automatic_retry_authorized",
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
  if(depth>MAX_RESULT_DEPTH)return "__inspection_result_depth_exceeded__";
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
    marker:
      VOID_DATANET_CONTENT_COMMITMENT_BROADCASTER_INSPECTION_ACCESS_V1,
    version:1,
    status:"held",
    reason,
    broadcast_authorization_id:
      options.broadcast_authorization_id??null,
    broadcast_consumption_record_id:
      options.broadcast_consumption_record_id??null,
    inspection_request_id:
      options.inspection_request_id??null,
    broadcaster_access_performed:
      options.broadcaster_access_performed===true,
    inspection_method_invoked:
      options.inspection_method_invoked===true,
    submit_method_invoked:false,
    raw_signed_transaction_accessed:false,
    opaque_custody_handle_accessed:false,
    transaction_broadcast_performed:false,
    chain2050_write_performed:false,
    filesystem_mutation_performed:false,
    authority:
      VOID_DATANET_CONTENT_COMMITMENT_BROADCASTER_INSPECTION_ACCESS_AUTHORITY_V1,
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
      throw new Error("datanet_broadcaster_access_symlink_ancestor_rejected");
    }
  }
}
function validatePrivateStateRoot(raw){
  const supplied=text(raw);
  if(!supplied||!path.isAbsolute(supplied)){
    return {ok:false,reason:"datanet_broadcaster_access_state_root_must_be_absolute"};
  }
  const resolved=path.resolve(supplied);
  try{
    assertNoSymlinkAncestors(resolved);
    const stat=fs.lstatSync(resolved);
    if(!stat.isDirectory()||stat.isSymbolicLink()){
      return {
        ok:false,
        reason:"datanet_broadcaster_access_state_root_not_direct_directory",
      };
    }
    if(typeof process.getuid==="function"&&stat.uid!==process.getuid()){
      return {
        ok:false,
        reason:"datanet_broadcaster_access_state_root_owner_mismatch",
      };
    }
    if((stat.mode&0o777)!==0o700){
      return {
        ok:false,
        reason:"datanet_broadcaster_access_state_root_mode_must_be_0700",
      };
    }
    const real=fs.realpathSync(resolved);
    if(real!==resolved){
      return {
        ok:false,
        reason:"datanet_broadcaster_access_state_root_realpath_mismatch",
      };
    }
    return {ok:true,realpath:real,realpath_sha256:sha256(real)};
  }catch(error){
    return {
      ok:false,
      reason:"datanet_broadcaster_access_state_root_invalid",
      detail:{error_class:safeErrorClass(error)},
    };
  }
}
function assertPrivateDirectory(directory){
  const stat=fs.lstatSync(directory);
  if(
    !stat.isDirectory()||
    stat.isSymbolicLink()||
    (stat.mode&0o777)!==0o700||
    (typeof process.getuid==="function"&&stat.uid!==process.getuid())
  ){
    throw new Error("datanet_broadcaster_access_consumed_dir_invalid");
  }
  assertNoSymlinkAncestors(directory);
}
function assertPrivateRecord(file){
  const stat=fs.lstatSync(file);
  if(
    !stat.isFile()||
    stat.isSymbolicLink()||
    (stat.mode&0o777)!==0o600||
    (typeof process.getuid==="function"&&stat.uid!==process.getuid())||
    stat.size<2||
    stat.size>MAX_RECORD_BYTES
  ){
    throw new Error("datanet_broadcaster_access_record_invalid");
  }
  assertNoSymlinkAncestors(file);
}
function storedMaterial(record){
  const material={...record};
  delete material.broadcast_consumption_record_id;
  return material;
}
function validateStoredRecord(
  record,
  expectedAuthorizationId,
  expectedConsumptionId,
  actualStateHash,
  configuredStateHash,
){
  if(
    !exactKeys(record,RECORD_KEYS)||
    record.marker!==
      "VOID_DATANET_CONTENT_COMMITMENT_BROADCAST_AUTHORIZATION_CONSUMPTION_V1"||
    record.version!==1||
    record.status!=="broadcast_authorization_consumed_before_broadcaster_access"||
    text(record.chain_id)!=="2050"||
    !BROADCAST_AUTHORIZATION_ID.test(text(record.broadcast_authorization_id))||
    !BROADCAST_AUTHORIZATION_VERIFICATION_ID.test(
      text(record.broadcast_authorization_verification_id),
    )||
    !OPAQUE_RECEIPT_VERIFICATION_ID.test(
      text(record.opaque_signed_receipt_verification_id),
    )||
    !OPAQUE_RECEIPT_ID.test(text(record.opaque_signed_receipt_id))||
    !SIGNING_REQUEST_ID.test(text(record.signing_request_id))||
    !SIGNING_AUTHORIZATION_ID.test(text(record.signing_authorization_id))||
    !SIGNING_CONSUMPTION_ID.test(text(record.signing_consumption_record_id))||
    !FINAL_REVIEW_ID.test(text(record.final_signing_review_preflight_id))||
    !SHA256.test(text(record.external_signing_idempotency_key_sha256))||
    !SHA256.test(text(record.unsigned_transaction_candidate_fingerprint_sha256))||
    !ADDRESS.test(text(record.publisher_address))||
    !HASH.test(text(record.signed_transaction_hash))||
    !SHA256.test(text(record.custody_handle_fingerprint_sha256))||
    !SHA256.test(text(record.signer_public_key_der_sha256))||
    !SHA256.test(text(record.state_store_realpath_sha256))||
    !BROADCAST_CONSUMPTION_ID.test(text(record.broadcast_consumption_record_id))||
    record.broadcast_authorization_id!==expectedAuthorizationId||
    record.broadcast_consumption_record_id!==expectedConsumptionId||
    record.state_store_realpath_sha256!==actualStateHash||
    record.state_store_realpath_sha256!==configuredStateHash||
    !exactKeys(record.consumption,CONSUMPTION_KEYS)||
    record.consumption.single_use!==true||
    record.consumption.authorization_consumed!==true||
    record.consumption.immutable_consumption_record!==true||
    record.consumption.replay_rejected_within_exact_state_store!==true||
    record.consumption.replay_prevention_scope!=="exact_state_store_realpath"||
    record.consumption.global_replay_prevention_claimed!==false||
    record.consumption.canonical_broadcast_state_store_runtime_binding_required!==true||
    record.consumption.expiry_rechecked_at_consumption!==true||
    record.consumption.consumption_precedes_any_broadcaster_access!==true||
    record.consumption.signed_transaction_hash_bound!==true||
    record.consumption.custody_handle_fingerprint_bound!==true||
    record.consumption.raw_signed_transaction_remains_inaccessible!==true||
    record.consumption.broadcaster_access_remains_disabled!==true||
    !exactKeys(record.authority,AUTHORITY_KEYS)||
    record.authority.filesystem_mutation_performed!==true||
    record.authority.sovereign_private_key_access_performed!==false||
    record.authority.raw_signed_transaction_accessed!==false||
    record.authority.opaque_custody_handle_accessed!==false||
    record.authority.broadcaster_access_performed!==false||
    record.authority.rpc_call_performed!==false||
    record.authority.transaction_broadcast_authorized_by_this_gate!==false||
    record.authority.transaction_broadcast_performed!==false||
    record.authority.chain2050_write_authorized!==false||
    record.authority.chain2050_write_performed!==false||
    record.authority.validator_mutation_authorized!==false||
    record.authority.governance_mutation_authorized!==false||
    record.authority.work_credit_mutation_authorized!==false||
    record.authority.service_action_authorized!==false||
    record.authority.funds_action_authorized!==false||
    record.authority.automatic_retry_authorized!==false||
    text(record.next_gate)!==
      "exact_broadcaster_access_from_consumed_broadcast_authorization_v1"
  ){
    return {ok:false,reason:"datanet_broadcaster_access_consumption_record_invalid"};
  }
  const expectedId=
    "voiddccbac1_"+sha256(canonicalJson(storedMaterial(record)));
  if(expectedId!==record.broadcast_consumption_record_id){
    return {ok:false,reason:"datanet_broadcaster_access_consumption_record_id_mismatch"};
  }
  const issuedMs=Date.parse(text(record.issued_at_utc));
  const expiresMs=Date.parse(text(record.expires_at_utc));
  const consumedMs=Date.parse(text(record.consumed_at_utc));
  const signedMs=Date.parse(text(record.signed_at_utc));
  if(
    !Number.isFinite(issuedMs)||
    !Number.isFinite(expiresMs)||
    !Number.isFinite(consumedMs)||
    !Number.isFinite(signedMs)||
    expiresMs<=issuedMs||
    expiresMs-issuedMs>300_000||
    issuedMs<signedMs||
    consumedMs<issuedMs||
    consumedMs>=expiresMs
  ){
    return {ok:false,reason:"datanet_broadcaster_access_consumption_time_invalid"};
  }
  return {ok:true,issuedMs,expiresMs,consumedMs};
}
function validateInspectionDecision(value,expectedHash){
  const forbidden=forbiddenResultKey(value);
  if(forbidden){
    return {
      ok:false,
      reason:"datanet_broadcaster_access_secret_response_rejected",
      detail:{forbidden_key:text(forbidden).slice(0,80)},
    };
  }
  if(!plain(value)){
    return {ok:false,reason:"datanet_broadcaster_access_inspection_response_invalid"};
  }
  if(value.ok===false){
    if(
      !exactKeys(value,["ok","status","reason"])||
      value.status!=="held"||
      !/^[a-z][a-z0-9_]{2,159}$/.test(text(value.reason))
    ){
      return {ok:false,reason:"datanet_broadcaster_access_inspection_held_invalid"};
    }
    return {ok:false,reason:"datanet_broadcaster_access_inspection_held:"+text(value.reason)};
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
    !SAFE_PROVIDER_ID.test(text(value.provider_submission_id))
  ){
    return {ok:false,reason:"datanet_broadcaster_access_inspection_response_invalid"};
  }
  const status=text(value.status);
  if(status==="not_submitted"){
    if(
      value.definitive_not_submitted!==true||
      value.submission_may_have_occurred!==false
    ){
      return {ok:false,reason:"datanet_broadcaster_access_not_submitted_invalid"};
    }
  }else if(
    value.definitive_not_submitted!==false||
    value.submission_may_have_occurred!==true
  ){
    return {ok:false,reason:"datanet_broadcaster_access_prior_submission_flags_invalid"};
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

export async function inspectDatanetContentCommitmentBroadcasterAccessWithClockV1(
  input,
  broadcaster,
  nowMs,
){
  const authorizationId=text(input?.broadcast_authorization_id);
  const consumptionId=text(input?.broadcast_consumption_record_id);
  if(!BROADCAST_AUTHORIZATION_ID.test(authorizationId)){
    return held("datanet_broadcaster_access_authorization_id_invalid");
  }
  if(!BROADCAST_CONSUMPTION_ID.test(consumptionId)){
    return held(
      "datanet_broadcaster_access_consumption_id_invalid",
      {broadcast_authorization_id:authorizationId},
    );
  }
  if(!Number.isSafeInteger(nowMs)||nowMs<=0){
    return held(
      "datanet_broadcaster_access_clock_invalid",
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
  const configuredStateHash=
    text(input?.canonical_state_store_realpath_sha256).toLowerCase();
  if(
    !SHA256.test(configuredStateHash)||
    configuredStateHash!==root.realpath_sha256
  ){
    return held(
      "datanet_broadcaster_access_canonical_state_store_mismatch",
      {
        broadcast_authorization_id:authorizationId,
        broadcast_consumption_record_id:consumptionId,
      },
    );
  }

  let record;
  try{
    const consumedDir=path.join(root.realpath,"broadcast-consumed");
    assertPrivateDirectory(consumedDir);
    const file=path.join(consumedDir,authorizationId+".json");
    assertPrivateRecord(file);
    record=JSON.parse(fs.readFileSync(file,"utf8"));
  }catch(error){
    return held(
      "datanet_broadcaster_access_consumption_disk_validation_failed",
      {
        broadcast_authorization_id:authorizationId,
        broadcast_consumption_record_id:consumptionId,
        detail:{error_class:safeErrorClass(error)},
      },
    );
  }

  const validation=validateStoredRecord(
    record,
    authorizationId,
    consumptionId,
    root.realpath_sha256,
    configuredStateHash,
  );
  if(validation.ok===false){
    return held(
      validation.reason,
      {
        broadcast_authorization_id:authorizationId,
        broadcast_consumption_record_id:consumptionId,
      },
    );
  }
  if(nowMs<validation.consumedMs){
    return held(
      "datanet_broadcaster_access_before_consumption_time",
      {
        broadcast_authorization_id:authorizationId,
        broadcast_consumption_record_id:consumptionId,
      },
    );
  }
  if(nowMs>=validation.expiresMs){
    return held(
      "datanet_broadcaster_access_authorization_expired",
      {
        broadcast_authorization_id:authorizationId,
        broadcast_consumption_record_id:consumptionId,
      },
    );
  }
  if(!broadcaster||typeof broadcaster.inspect_submission!=="function"){
    return held(
      "datanet_broadcaster_access_inspector_missing",
      {
        broadcast_authorization_id:authorizationId,
        broadcast_consumption_record_id:consumptionId,
      },
    );
  }

  const requestMaterial={
    marker:
      "VOID_DATANET_CONTENT_COMMITMENT_BROADCASTER_INSPECTION_REQUEST_V1",
    version:1,
    chain_id:"2050",
    broadcast_authorization_id:record.broadcast_authorization_id,
    broadcast_authorization_verification_id:
      record.broadcast_authorization_verification_id,
    broadcast_consumption_record_id:record.broadcast_consumption_record_id,
    opaque_signed_receipt_verification_id:
      record.opaque_signed_receipt_verification_id,
    opaque_signed_receipt_id:record.opaque_signed_receipt_id,
    signing_request_id:record.signing_request_id,
    signing_authorization_id:record.signing_authorization_id,
    signing_consumption_record_id:record.signing_consumption_record_id,
    external_signing_idempotency_key_sha256:
      record.external_signing_idempotency_key_sha256,
    unsigned_transaction_candidate_fingerprint_sha256:
      record.unsigned_transaction_candidate_fingerprint_sha256,
    publisher_address:record.publisher_address,
    signed_transaction_hash:record.signed_transaction_hash,
    custody_handle_fingerprint_sha256:
      record.custody_handle_fingerprint_sha256,
    canonical_state_store_realpath_sha256:root.realpath_sha256,
    inspection_only:true,
    transaction_submission_authorized:false,
  };
  const request={
    ...requestMaterial,
    inspection_request_id:
      "voiddccbair1_"+sha256(canonicalJson(requestMaterial)),
  };
  if(!INSPECTION_REQUEST_ID.test(request.inspection_request_id)){
    return held(
      "datanet_broadcaster_access_inspection_request_id_invalid",
      {
        broadcast_authorization_id:authorizationId,
        broadcast_consumption_record_id:consumptionId,
      },
    );
  }

  let rawDecision;
  try{
    rawDecision=await broadcaster.inspect_submission(request);
  }catch(error){
    return held(
      "datanet_broadcaster_access_inspection_failed",
      {
        broadcast_authorization_id:authorizationId,
        broadcast_consumption_record_id:consumptionId,
        inspection_request_id:request.inspection_request_id,
        broadcaster_access_performed:true,
        inspection_method_invoked:true,
        detail:{error_class:safeErrorClass(error)},
      },
    );
  }
  const decision=validateInspectionDecision(
    rawDecision,
    record.signed_transaction_hash,
  );
  if(decision.ok===false){
    return held(
      decision.reason,
      {
        broadcast_authorization_id:authorizationId,
        broadcast_consumption_record_id:consumptionId,
        inspection_request_id:request.inspection_request_id,
        broadcaster_access_performed:true,
        inspection_method_invoked:true,
        ...(decision.detail?{detail:decision.detail}:{}),
      },
    );
  }

  const reconciliationRequired=decision.status!=="not_submitted";
  return {
    ok:true,
    marker:
      VOID_DATANET_CONTENT_COMMITMENT_BROADCASTER_INSPECTION_ACCESS_V1,
    version:1,
    status:"exact_consumed_broadcast_authorization_inspected_submission_disabled",
    chain_id:"2050",
    broadcast_authorization_id:record.broadcast_authorization_id,
    broadcast_authorization_verification_id:
      record.broadcast_authorization_verification_id,
    broadcast_consumption_record_id:record.broadcast_consumption_record_id,
    opaque_signed_receipt_verification_id:
      record.opaque_signed_receipt_verification_id,
    opaque_signed_receipt_id:record.opaque_signed_receipt_id,
    signing_request_id:record.signing_request_id,
    signing_authorization_id:record.signing_authorization_id,
    signing_consumption_record_id:record.signing_consumption_record_id,
    external_signing_idempotency_key_sha256:
      record.external_signing_idempotency_key_sha256,
    unsigned_transaction_candidate_fingerprint_sha256:
      record.unsigned_transaction_candidate_fingerprint_sha256,
    publisher_address:record.publisher_address,
    signed_transaction_hash:record.signed_transaction_hash,
    custody_handle_fingerprint_sha256:
      record.custody_handle_fingerprint_sha256,
    canonical_state_store_realpath_sha256:root.realpath_sha256,
    issued_at_utc:record.issued_at_utc,
    expires_at_utc:record.expires_at_utc,
    consumed_at_utc:record.consumed_at_utc,
    inspected_at_utc:new Date(nowMs).toISOString(),
    inspection_request_id:request.inspection_request_id,
    inspection:{
      status:decision.status,
      transaction_hash:decision.transaction_hash,
      provider_submission_id:decision.provider_submission_id,
      definitive_not_submitted:decision.definitive_not_submitted,
      submission_may_have_occurred:decision.submission_may_have_occurred,
      reconciliation_required:reconciliationRequired,
      later_single_submission_gate_candidate:
        decision.status==="not_submitted",
    },
    authority:{
      durable_consumption_record_verified:true,
      canonical_state_store_verified:true,
      expiry_rechecked_before_broadcaster_access:true,
      metadata_only_request:true,
      broadcaster_access_performed:true,
      inspection_method_invoked:true,
      submit_method_invoked:false,
      transaction_submission_authorized_by_this_gate:false,
      raw_signed_transaction_accessed:false,
      opaque_custody_handle_accessed:false,
      filesystem_mutation_performed:false,
      sovereign_private_key_access_performed:false,
      wallet_access_performed:false,
      transaction_signing_performed:false,
      transaction_broadcast_performed:false,
      chain2050_write_performed:false,
      automatic_retry_authorized:false,
    },
    next_gate:
      reconciliationRequired
        ?"broadcast_reconciliation_without_resubmission_v1"
        :"exact_single_submission_from_inspected_consumed_broadcast_authorization_v1",
    broadcaster_access_performed:true,
    inspection_method_invoked:true,
    submit_method_invoked:false,
    raw_signed_transaction_accessed:false,
    opaque_custody_handle_accessed:false,
    transaction_broadcast_performed:false,
    chain2050_write_performed:false,
    filesystem_mutation_performed:false,
    authority_contract:
      VOID_DATANET_CONTENT_COMMITMENT_BROADCASTER_INSPECTION_ACCESS_AUTHORITY_V1,
  };
}

export async function inspectDatanetContentCommitmentBroadcasterAccessV1(
  input,
  broadcaster,
){
  return inspectDatanetContentCommitmentBroadcasterAccessWithClockV1(
    input,
    broadcaster,
    Date.now(),
  );
}
