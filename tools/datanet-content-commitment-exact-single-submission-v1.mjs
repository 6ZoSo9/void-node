import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  inspectDatanetContentCommitmentBroadcasterAccessWithClockV1,
} from "./datanet-content-commitment-broadcaster-inspection-access-v1.mjs";
import {
  canonicalJson,
  sha256,
} from "./datanet-content-commitment-compiler-profile-v1.mjs";

export const VOID_DATANET_CONTENT_COMMITMENT_EXACT_SINGLE_SUBMISSION_V1 =
  "VOID_DATANET_CONTENT_COMMITMENT_EXACT_SINGLE_SUBMISSION_V1";

export const VOID_DATANET_CONTENT_COMMITMENT_EXACT_SINGLE_SUBMISSION_CONFIRMATION_V1 =
  "datanetSubmitExactConsumedBroadcastAuthorizationOnceV1";

export const VOID_DATANET_CONTENT_COMMITMENT_EXACT_SINGLE_SUBMISSION_AUTHORITY_V1 = {
  source_only_gate:true,
  explicit_apply_required:true,
  exact_confirmation_required:true,
  fresh_not_submitted_reinspection_required:true,
  durable_intent_before_submit_required:true,
  immutable_submission_intent:true,
  exact_state_store_realpath_scoped_submission_claim:true,
  exact_signed_transaction_hash_required:true,
  exact_custody_handle_fingerprint_required:true,
  deterministic_submission_idempotency_key:true,
  injected_submit_once_only:true,
  at_most_one_submit_method_invocation_per_claim:true,
  duplicate_claim_requires_reconciliation:true,
  submit_exception_requires_reconciliation:true,
  ambiguous_result_requires_reconciliation:true,
  definitive_not_submitted_after_submit_still_requires_reconciliation:true,
  automatic_resubmission:false,
  raw_signed_transaction_input:false,
  raw_signed_transaction_output:false,
  raw_signed_transaction_access:false,
  opaque_custody_handle_input:false,
  opaque_custody_handle_output:false,
  opaque_custody_handle_access:false,
  filesystem_read:true,
  filesystem_mutation_one_submission_intent_may_occur:true,
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
const MAX_RECORD_BYTES=64*1024;
const MAX_RESULT_DEPTH=16;
const DOMAIN=
  "void.datanet.content-commitment.exact-single-submission.v1";

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
  if(depth>MAX_RESULT_DEPTH)return "__submission_result_depth_exceeded__";
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
    marker:VOID_DATANET_CONTENT_COMMITMENT_EXACT_SINGLE_SUBMISSION_V1,
    version:1,
    status:"held",
    reason,
    applied:options.applied===true,
    broadcast_authorization_id:
      options.broadcast_authorization_id??null,
    broadcast_consumption_record_id:
      options.broadcast_consumption_record_id??null,
    inspection_request_id:
      options.inspection_request_id??null,
    submission_intent_id:
      options.submission_intent_id??null,
    submission_idempotency_key_sha256:
      options.submission_idempotency_key_sha256??null,
    durable_submission_intent_published:
      options.durable_submission_intent_published===true,
    inspection_method_invoked:
      options.inspection_method_invoked===true,
    submit_method_invoked:
      options.submit_method_invoked===true,
    submission_may_have_occurred:
      options.submission_may_have_occurred===true,
    reconciliation_required:
      options.reconciliation_required===true,
    automatic_retry_allowed:false,
    raw_signed_transaction_accessed:false,
    opaque_custody_handle_accessed:false,
    sovereign_private_key_access_performed:false,
    wallet_access_performed:false,
    transaction_signing_performed:false,
    direct_rpc_call_performed:false,
    direct_network_call_performed:false,
    chain2050_write_direct_performed:false,
    authority:
      VOID_DATANET_CONTENT_COMMITMENT_EXACT_SINGLE_SUBMISSION_AUTHORITY_V1,
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
      throw new Error("datanet_single_submission_symlink_ancestor_rejected");
    }
  }
}
function validatePrivateStateRoot(raw){
  const supplied=text(raw);
  if(!supplied||!path.isAbsolute(supplied)){
    return {ok:false,reason:"datanet_single_submission_state_root_must_be_absolute"};
  }
  const resolved=path.resolve(supplied);
  try{
    assertNoSymlinkAncestors(resolved);
    const stat=fs.lstatSync(resolved);
    if(!stat.isDirectory()||stat.isSymbolicLink()){
      return {
        ok:false,
        reason:"datanet_single_submission_state_root_not_direct_directory",
      };
    }
    if(typeof process.getuid==="function"&&stat.uid!==process.getuid()){
      return {
        ok:false,
        reason:"datanet_single_submission_state_root_owner_mismatch",
      };
    }
    if((stat.mode&0o777)!==0o700){
      return {
        ok:false,
        reason:"datanet_single_submission_state_root_mode_must_be_0700",
      };
    }
    const real=fs.realpathSync(resolved);
    if(real!==resolved){
      return {
        ok:false,
        reason:"datanet_single_submission_state_root_realpath_mismatch",
      };
    }
    return {ok:true,realpath:real,realpath_sha256:sha256(real)};
  }catch(error){
    return {
      ok:false,
      reason:"datanet_single_submission_state_root_invalid",
      detail:{error_class:safeErrorClass(error)},
    };
  }
}
function fsyncDirectory(directory){
  const fd=fs.openSync(directory,"r");
  try{
    fs.fsyncSync(fd);
  }finally{
    fs.closeSync(fd);
  }
}
function ensureIntentDirectory(root){
  const dir=path.join(root,"broadcast-submission-intents");
  try{
    const stat=fs.lstatSync(dir);
    if(
      !stat.isDirectory()||
      stat.isSymbolicLink()||
      (stat.mode&0o777)!==0o700||
      (typeof process.getuid==="function"&&stat.uid!==process.getuid())
    ){
      throw new Error("datanet_single_submission_intent_dir_invalid");
    }
  }catch(error){
    if(error?.code!=="ENOENT")throw error;
    fs.mkdirSync(dir,{recursive:false,mode:0o700});
    fs.chmodSync(dir,0o700);
    fsyncDirectory(root);
  }
  assertNoSymlinkAncestors(dir);
  return dir;
}
function intentFile(root,authorizationId){
  return path.join(
    root,
    "broadcast-submission-intents",
    authorizationId+".json",
  );
}
function assertPrivateIntent(file){
  const stat=fs.lstatSync(file);
  if(
    !stat.isFile()||
    stat.isSymbolicLink()||
    (stat.mode&0o777)!==0o600||
    (typeof process.getuid==="function"&&stat.uid!==process.getuid())||
    stat.size<2||
    stat.size>MAX_RECORD_BYTES
  ){
    throw new Error("datanet_single_submission_intent_record_invalid");
  }
  assertNoSymlinkAncestors(file);
}
function atomicCreateCanonicalJson(file,value){
  const parent=path.dirname(file);
  const temporary=path.join(
    parent,
    "."+path.basename(file)+".tmp-"+String(process.pid)+"-"+
      crypto.randomBytes(8).toString("hex"),
  );
  const bytes=Buffer.from(canonicalJson(value)+"\n","utf8");
  if(bytes.length>MAX_RECORD_BYTES){
    throw new Error("datanet_single_submission_intent_too_large");
  }
  const fd=fs.openSync(temporary,"wx",0o600);
  try{
    fs.writeFileSync(fd,bytes);
    fs.fsyncSync(fd);
  }finally{
    fs.closeSync(fd);
  }
  try{
    try{
      fs.linkSync(temporary,file);
      fsyncDirectory(parent);
      return "created";
    }catch(error){
      if(error?.code==="EEXIST")return "exists";
      throw error;
    }
  }finally{
    try{
      fs.unlinkSync(temporary);
    }catch(error){
      if(error?.code!=="ENOENT")throw error;
    }
  }
}
function validateInspection(value,input,rootHash){
  if(
    !plain(value)||
    value.ok!==true||
    value.marker!==
      "VOID_DATANET_CONTENT_COMMITMENT_BROADCASTER_INSPECTION_ACCESS_V1"||
    value.version!==1||
    value.status!==
      "exact_consumed_broadcast_authorization_inspected_submission_disabled"||
    text(value.chain_id)!=="2050"||
    value.broadcast_authorization_id!==input.broadcast_authorization_id||
    value.broadcast_consumption_record_id!==input.broadcast_consumption_record_id||
    !INSPECTION_ID.test(text(value.inspection_request_id))||
    value.canonical_state_store_realpath_sha256!==rootHash||
    !HASH.test(text(value.signed_transaction_hash))||
    !SHA256.test(text(value.custody_handle_fingerprint_sha256))||
    !SHA256.test(text(value.unsigned_transaction_candidate_fingerprint_sha256))||
    !ADDRESS.test(text(value.publisher_address))||
    value.inspection?.status!=="not_submitted"||
    value.inspection?.definitive_not_submitted!==true||
    value.inspection?.submission_may_have_occurred!==false||
    value.inspection?.reconciliation_required!==false||
    value.inspection?.later_single_submission_gate_candidate!==true||
    value.authority?.durable_consumption_record_verified!==true||
    value.authority?.canonical_state_store_verified!==true||
    value.authority?.expiry_rechecked_before_broadcaster_access!==true||
    value.authority?.metadata_only_request!==true||
    value.authority?.broadcaster_access_performed!==true||
    value.authority?.inspection_method_invoked!==true||
    value.authority?.submit_method_invoked!==false||
    value.authority?.transaction_submission_authorized_by_this_gate!==false||
    value.authority?.raw_signed_transaction_accessed!==false||
    value.authority?.opaque_custody_handle_accessed!==false||
    value.authority?.filesystem_mutation_performed!==false||
    value.authority?.transaction_broadcast_performed!==false||
    value.authority?.chain2050_write_performed!==false||
    value.submit_method_invoked!==false||
    value.raw_signed_transaction_accessed!==false||
    value.opaque_custody_handle_accessed!==false||
    value.transaction_broadcast_performed!==false||
    value.chain2050_write_performed!==false||
    value.filesystem_mutation_performed!==false||
    text(value.next_gate)!==
      "exact_single_submission_from_inspected_consumed_broadcast_authorization_v1"
  ){
    return {ok:false,reason:"datanet_single_submission_inspection_invalid"};
  }
  return {ok:true};
}
function submissionKey(inspection){
  return sha256(
    canonicalJson({
      domain:DOMAIN,
      broadcast_authorization_id:inspection.broadcast_authorization_id,
      broadcast_consumption_record_id:
        inspection.broadcast_consumption_record_id,
      inspection_request_id:inspection.inspection_request_id,
      signed_transaction_hash:inspection.signed_transaction_hash,
      custody_handle_fingerprint_sha256:
        inspection.custody_handle_fingerprint_sha256,
      canonical_state_store_realpath_sha256:
        inspection.canonical_state_store_realpath_sha256,
    }),
  );
}
function validateSubmitDecision(value,expectedHash){
  const forbidden=forbiddenResultKey(value);
  if(forbidden){
    return {
      ok:false,
      reason:"datanet_single_submission_secret_response_rejected",
      detail:{forbidden_key:text(forbidden).slice(0,80)},
    };
  }
  if(!plain(value)){
    return {ok:false,reason:"datanet_single_submission_response_invalid"};
  }
  if(value.ok===false){
    if(
      !exactKeys(value,["ok","status","reason"])||
      value.status!=="held"||
      !/^[a-z][a-z0-9_]{2,159}$/.test(text(value.reason))
    ){
      return {ok:false,reason:"datanet_single_submission_held_response_invalid"};
    }
    return {
      ok:false,
      reason:"datanet_single_submission_broadcaster_held:"+text(value.reason),
    };
  }
  if(
    !exactKeys(
      value,
      [
        "ok","status","transaction_hash","provider_submission_id",
        "definitive_not_submitted","submission_call_performed",
        "submission_may_have_occurred",
      ],
    )||
    value.ok!==true||
    !["not_submitted","unknown","accepted"].includes(text(value.status))||
    text(value.transaction_hash).toLowerCase()!==expectedHash||
    !SAFE_PROVIDER_ID.test(text(value.provider_submission_id))||
    typeof value.submission_call_performed!=="boolean"||
    typeof value.submission_may_have_occurred!=="boolean"||
    typeof value.definitive_not_submitted!=="boolean"
  ){
    return {ok:false,reason:"datanet_single_submission_response_invalid"};
  }
  const status=text(value.status);
  if(status==="not_submitted"){
    if(
      value.definitive_not_submitted!==true||
      value.submission_may_have_occurred!==false
    ){
      return {ok:false,reason:"datanet_single_submission_not_submitted_invalid"};
    }
  }else if(
    value.definitive_not_submitted!==false||
    value.submission_call_performed!==true||
    value.submission_may_have_occurred!==true
  ){
    return {ok:false,reason:"datanet_single_submission_possible_submission_flags_invalid"};
  }
  return {
    ok:true,
    status,
    transaction_hash:expectedHash,
    provider_submission_id:text(value.provider_submission_id),
    definitive_not_submitted:value.definitive_not_submitted,
    submission_call_performed:value.submission_call_performed,
    submission_may_have_occurred:value.submission_may_have_occurred,
  };
}

export async function submitDatanetContentCommitmentExactSingleSubmissionWithClockV1(
  input,
  broadcaster,
  nowMs,
){
  const applied=input?.apply===true;
  const authorizationId=text(input?.broadcast_authorization_id);
  const consumptionId=text(input?.broadcast_consumption_record_id);
  if(!AUTHORIZATION_ID.test(authorizationId)){
    return held("datanet_single_submission_authorization_id_invalid",{applied});
  }
  if(!CONSUMPTION_ID.test(consumptionId)){
    return held(
      "datanet_single_submission_consumption_id_invalid",
      {applied,broadcast_authorization_id:authorizationId},
    );
  }
  if(!Number.isSafeInteger(nowMs)||nowMs<=0){
    return held(
      "datanet_single_submission_clock_invalid",
      {
        applied,
        broadcast_authorization_id:authorizationId,
        broadcast_consumption_record_id:consumptionId,
      },
    );
  }
  if(
    applied&&
    text(input?.confirmation)!==
      VOID_DATANET_CONTENT_COMMITMENT_EXACT_SINGLE_SUBMISSION_CONFIRMATION_V1
  ){
    return held(
      "datanet_single_submission_confirmation_required",
      {
        applied,
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
        applied,
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
      "datanet_single_submission_canonical_state_store_mismatch",
      {
        applied,
        broadcast_authorization_id:authorizationId,
        broadcast_consumption_record_id:consumptionId,
      },
    );
  }

  const existingIntentPath=intentFile(root.realpath,authorizationId);
  try{
    const stat=fs.lstatSync(existingIntentPath);
    if(stat){
      assertPrivateIntent(existingIntentPath);
      return held(
        "datanet_single_submission_already_claimed_reconciliation_required",
        {
          applied,
          broadcast_authorization_id:authorizationId,
          broadcast_consumption_record_id:consumptionId,
          durable_submission_intent_published:true,
          reconciliation_required:true,
        },
      );
    }
  }catch(error){
    if(error?.code!=="ENOENT"){
      return held(
        "datanet_single_submission_existing_intent_invalid",
        {
          applied,
          broadcast_authorization_id:authorizationId,
          broadcast_consumption_record_id:consumptionId,
          reconciliation_required:true,
          detail:{error_class:safeErrorClass(error)},
        },
      );
    }
  }

  const inspection=
    await inspectDatanetContentCommitmentBroadcasterAccessWithClockV1(
      {
        state_dir:root.realpath,
        canonical_state_store_realpath_sha256:configuredHash,
        broadcast_authorization_id:authorizationId,
        broadcast_consumption_record_id:consumptionId,
      },
      broadcaster,
      nowMs,
    );
  if(inspection?.ok!==true){
    return held(
      "datanet_single_submission_fresh_inspection_held:"+
        text(inspection?.reason||"unknown"),
      {
        applied,
        broadcast_authorization_id:authorizationId,
        broadcast_consumption_record_id:consumptionId,
        inspection_request_id:
          text(inspection?.inspection_request_id)||null,
        inspection_method_invoked:
          inspection?.inspection_method_invoked===true,
        reconciliation_required:
          inspection?.broadcaster_access_performed===true,
      },
    );
  }
  const inspectionValidation=validateInspection(
    inspection,
    {
      broadcast_authorization_id:authorizationId,
      broadcast_consumption_record_id:consumptionId,
    },
    root.realpath_sha256,
  );
  if(inspectionValidation.ok===false){
    return held(
      inspectionValidation.reason,
      {
        applied,
        broadcast_authorization_id:authorizationId,
        broadcast_consumption_record_id:consumptionId,
        inspection_request_id:
          text(inspection.inspection_request_id)||null,
        inspection_method_invoked:true,
        reconciliation_required:true,
      },
    );
  }

  const key=submissionKey(inspection);
  const intentMaterial={
    marker:"VOID_DATANET_CONTENT_COMMITMENT_EXACT_SINGLE_SUBMISSION_INTENT_V1",
    version:1,
    status:"claimed_before_exact_single_submit",
    chain_id:"2050",
    domain:DOMAIN,
    broadcast_authorization_id:authorizationId,
    broadcast_authorization_verification_id:
      inspection.broadcast_authorization_verification_id,
    broadcast_consumption_record_id:consumptionId,
    inspection_request_id:inspection.inspection_request_id,
    opaque_signed_receipt_verification_id:
      inspection.opaque_signed_receipt_verification_id,
    opaque_signed_receipt_id:inspection.opaque_signed_receipt_id,
    signing_request_id:inspection.signing_request_id,
    signing_authorization_id:inspection.signing_authorization_id,
    signing_consumption_record_id:
      inspection.signing_consumption_record_id,
    external_signing_idempotency_key_sha256:
      inspection.external_signing_idempotency_key_sha256,
    unsigned_transaction_candidate_fingerprint_sha256:
      inspection.unsigned_transaction_candidate_fingerprint_sha256,
    publisher_address:inspection.publisher_address,
    signed_transaction_hash:inspection.signed_transaction_hash,
    custody_handle_fingerprint_sha256:
      inspection.custody_handle_fingerprint_sha256,
    canonical_state_store_realpath_sha256:root.realpath_sha256,
    submission_idempotency_key_sha256:key,
    claimed_at_utc:new Date(nowMs).toISOString(),
    automatic_retry_authorized:false,
  };
  const intentRecord={
    ...intentMaterial,
    submission_intent_id:
      "voiddccbasi1_"+sha256(canonicalJson(intentMaterial)),
  };
  if(!INTENT_ID.test(intentRecord.submission_intent_id)){
    return held(
      "datanet_single_submission_intent_id_invalid",
      {
        applied,
        broadcast_authorization_id:authorizationId,
        broadcast_consumption_record_id:consumptionId,
        inspection_request_id:inspection.inspection_request_id,
        submission_idempotency_key_sha256:key,
        inspection_method_invoked:true,
      },
    );
  }

  if(!applied){
    return {
      ok:true,
      marker:VOID_DATANET_CONTENT_COMMITMENT_EXACT_SINGLE_SUBMISSION_V1,
      version:1,
      status:"dry_run_ready_for_exact_single_submission",
      applied:false,
      chain_id:"2050",
      broadcast_authorization_id:authorizationId,
      broadcast_consumption_record_id:consumptionId,
      inspection_request_id:inspection.inspection_request_id,
      submission_intent_id:intentRecord.submission_intent_id,
      submission_idempotency_key_sha256:key,
      signed_transaction_hash:inspection.signed_transaction_hash,
      custody_handle_fingerprint_sha256:
        inspection.custody_handle_fingerprint_sha256,
      canonical_state_store_realpath_sha256:root.realpath_sha256,
      required_confirmation:
        VOID_DATANET_CONTENT_COMMITMENT_EXACT_SINGLE_SUBMISSION_CONFIRMATION_V1,
      durable_submission_intent_published:false,
      inspection_method_invoked:true,
      submit_method_invoked:false,
      submission_may_have_occurred:false,
      reconciliation_required:false,
      automatic_retry_allowed:false,
      raw_signed_transaction_accessed:false,
      opaque_custody_handle_accessed:false,
      sovereign_private_key_access_performed:false,
      wallet_access_performed:false,
      transaction_signing_performed:false,
      direct_rpc_call_performed:false,
      direct_network_call_performed:false,
      chain2050_write_direct_performed:false,
      authority_contract:
        VOID_DATANET_CONTENT_COMMITMENT_EXACT_SINGLE_SUBMISSION_AUTHORITY_V1,
    };
  }

  if(!broadcaster||typeof broadcaster.submit_once!=="function"){
    return held(
      "datanet_single_submission_submitter_missing",
      {
        applied:true,
        broadcast_authorization_id:authorizationId,
        broadcast_consumption_record_id:consumptionId,
        inspection_request_id:inspection.inspection_request_id,
        submission_intent_id:intentRecord.submission_intent_id,
        submission_idempotency_key_sha256:key,
        inspection_method_invoked:true,
      },
    );
  }

  let intentsDir;
  try{
    intentsDir=ensureIntentDirectory(root.realpath);
  }catch(error){
    return held(
      "datanet_single_submission_intent_store_prepare_failed",
      {
        applied:true,
        broadcast_authorization_id:authorizationId,
        broadcast_consumption_record_id:consumptionId,
        inspection_request_id:inspection.inspection_request_id,
        submission_intent_id:intentRecord.submission_intent_id,
        submission_idempotency_key_sha256:key,
        inspection_method_invoked:true,
        detail:{error_class:safeErrorClass(error)},
      },
    );
  }
  const finalIntent=path.join(intentsDir,authorizationId+".json");
  let outcome;
  try{
    outcome=atomicCreateCanonicalJson(finalIntent,intentRecord);
  }catch(error){
    return held(
      "datanet_single_submission_intent_publish_failed",
      {
        applied:true,
        broadcast_authorization_id:authorizationId,
        broadcast_consumption_record_id:consumptionId,
        inspection_request_id:inspection.inspection_request_id,
        submission_intent_id:intentRecord.submission_intent_id,
        submission_idempotency_key_sha256:key,
        inspection_method_invoked:true,
        reconciliation_required:true,
        detail:{error_class:safeErrorClass(error)},
      },
    );
  }
  if(outcome==="exists"){
    return held(
      "datanet_single_submission_already_claimed_reconciliation_required",
      {
        applied:true,
        broadcast_authorization_id:authorizationId,
        broadcast_consumption_record_id:consumptionId,
        inspection_request_id:inspection.inspection_request_id,
        submission_intent_id:intentRecord.submission_intent_id,
        submission_idempotency_key_sha256:key,
        durable_submission_intent_published:true,
        inspection_method_invoked:true,
        reconciliation_required:true,
      },
    );
  }
  try{
    assertPrivateIntent(finalIntent);
    const stored=JSON.parse(fs.readFileSync(finalIntent,"utf8"));
    if(canonicalJson(stored)!==canonicalJson(intentRecord)){
      throw new Error("datanet_single_submission_intent_readback_mismatch");
    }
  }catch(error){
    return held(
      "datanet_single_submission_intent_readback_failed",
      {
        applied:true,
        broadcast_authorization_id:authorizationId,
        broadcast_consumption_record_id:consumptionId,
        inspection_request_id:inspection.inspection_request_id,
        submission_intent_id:intentRecord.submission_intent_id,
        submission_idempotency_key_sha256:key,
        durable_submission_intent_published:true,
        inspection_method_invoked:true,
        reconciliation_required:true,
        detail:{error_class:safeErrorClass(error)},
      },
    );
  }

  const request={
    marker:"VOID_DATANET_CONTENT_COMMITMENT_EXACT_SINGLE_SUBMISSION_REQUEST_V1",
    version:1,
    chain_id:"2050",
    broadcast_authorization_id:authorizationId,
    broadcast_consumption_record_id:consumptionId,
    inspection_request_id:inspection.inspection_request_id,
    submission_intent_id:intentRecord.submission_intent_id,
    submission_idempotency_key_sha256:key,
    unsigned_transaction_candidate_fingerprint_sha256:
      inspection.unsigned_transaction_candidate_fingerprint_sha256,
    publisher_address:inspection.publisher_address,
    signed_transaction_hash:inspection.signed_transaction_hash,
    custody_handle_fingerprint_sha256:
      inspection.custody_handle_fingerprint_sha256,
    canonical_state_store_realpath_sha256:root.realpath_sha256,
    exact_single_submission:true,
    automatic_retry_authorized:false,
  };

  let rawDecision;
  try{
    rawDecision=await broadcaster.submit_once(request);
  }catch(error){
    return held(
      "datanet_single_submission_submit_exception_unknown",
      {
        applied:true,
        broadcast_authorization_id:authorizationId,
        broadcast_consumption_record_id:consumptionId,
        inspection_request_id:inspection.inspection_request_id,
        submission_intent_id:intentRecord.submission_intent_id,
        submission_idempotency_key_sha256:key,
        durable_submission_intent_published:true,
        inspection_method_invoked:true,
        submit_method_invoked:true,
        submission_may_have_occurred:true,
        reconciliation_required:true,
        detail:{error_class:safeErrorClass(error)},
      },
    );
  }

  const decision=validateSubmitDecision(
    rawDecision,
    inspection.signed_transaction_hash,
  );
  if(decision.ok===false){
    return held(
      decision.reason,
      {
        applied:true,
        broadcast_authorization_id:authorizationId,
        broadcast_consumption_record_id:consumptionId,
        inspection_request_id:inspection.inspection_request_id,
        submission_intent_id:intentRecord.submission_intent_id,
        submission_idempotency_key_sha256:key,
        durable_submission_intent_published:true,
        inspection_method_invoked:true,
        submit_method_invoked:true,
        submission_may_have_occurred:true,
        reconciliation_required:true,
        ...(decision.detail?{detail:decision.detail}:{}),
      },
    );
  }

  return {
    ok:true,
    marker:VOID_DATANET_CONTENT_COMMITMENT_EXACT_SINGLE_SUBMISSION_V1,
    version:1,
    status:"exact_single_submission_attempted_reconciliation_required",
    applied:true,
    chain_id:"2050",
    broadcast_authorization_id:authorizationId,
    broadcast_consumption_record_id:consumptionId,
    inspection_request_id:inspection.inspection_request_id,
    submission_intent_id:intentRecord.submission_intent_id,
    submission_idempotency_key_sha256:key,
    signed_transaction_hash:inspection.signed_transaction_hash,
    custody_handle_fingerprint_sha256:
      inspection.custody_handle_fingerprint_sha256,
    canonical_state_store_realpath_sha256:root.realpath_sha256,
    provider_submission_id:decision.provider_submission_id,
    submission_result_status:decision.status,
    definitive_not_submitted:decision.definitive_not_submitted,
    submission_call_performed:
      decision.submission_call_performed,
    submission_may_have_occurred:
      decision.submission_may_have_occurred,
    durable_submission_intent_published:true,
    inspection_method_invoked:true,
    submit_method_invoked:true,
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
    next_gate:"broadcast_reconciliation_without_resubmission_v1",
    authority_contract:
      VOID_DATANET_CONTENT_COMMITMENT_EXACT_SINGLE_SUBMISSION_AUTHORITY_V1,
  };
}

export async function submitDatanetContentCommitmentExactSingleSubmissionV1(
  input,
  broadcaster,
){
  return submitDatanetContentCommitmentExactSingleSubmissionWithClockV1(
    input,
    broadcaster,
    Date.now(),
  );
}
