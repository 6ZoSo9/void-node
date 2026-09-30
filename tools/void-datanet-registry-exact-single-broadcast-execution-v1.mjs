#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  validateVoidDatanetRegistryBroadcastConsumptionRecordV1,
} from "./void-datanet-registry-single-use-broadcast-authorization-consumption-v1.mjs";
import {
  validateVoidDatanetRegistryBroadcastRuntimeArtifactsV1,
} from "./void-datanet-registry-prebroadcast-observer-v1.mjs";

export const VOID_DATANET_REGISTRY_EXACT_SINGLE_BROADCAST_EXECUTION_V1 =
  "VOID_DATANET_REGISTRY_EXACT_SINGLE_BROADCAST_EXECUTION_V1";

export const VOID_DATANET_REGISTRY_EXACT_SINGLE_BROADCAST_EXECUTION_AUTHORITY_V1 =
  Object.freeze({
    exact_consumed_authorization_required:true,
    exact_broadcast_confirmation_required:true,
    fresh_not_submitted_reinspection_required:true,
    durable_submission_intent_before_signed_bytes_access:true,
    durable_submission_intent_before_submit:true,
    exactly_one_injected_submit_call_site:true,
    automatic_retry:false,
    replacement_transaction_authorized:false,
    dry_run_default:true,
    signed_transaction_bytes_access_only_inside_submit_once:true,
    credential_access:false,
    private_key_access:false,
    wallet_access:false,
    transaction_signing:false,
    service_action:false,
    validator_mutation:false,
    additional_value_transfer:false,
    funds_action_beyond_authorized_gas_fee:false,
  });

const OPERATION_ID=/^voiddrbo1_[0-9a-f]{64}$/u;
const CONSUMPTION_ID=/^voiddrbac1_[0-9a-f]{64}$/u;
const HASH=/^0x[0-9a-f]{64}$/u;
const MAX_RECORD_BYTES=128*1024;

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
function canonicalJson(value){
  return JSON.stringify(canonical(value));
}
function held(reason,detail={}){
  return Object.freeze({
    ok:false,
    marker:VOID_DATANET_REGISTRY_EXACT_SINGLE_BROADCAST_EXECUTION_V1,
    version:1,
    status:"held",
    reason,
    applied:false,
    durable_submission_intent_published:
      detail.durable_submission_intent_published===true,
    signed_transaction_bytes_accessed:
      detail.signed_transaction_bytes_accessed===true,
    submit_method_invoked:detail.submit_method_invoked===true,
    submission_may_have_occurred:
      detail.submission_may_have_occurred===true,
    reconciliation_required:
      detail.reconciliation_required===true,
    automatic_retry_allowed:false,
    transaction_signing_performed:false,
    private_key_access_performed:false,
    ...detail,
  });
}
function safeError(error){
  return {
    error_class:/^[A-Za-z0-9._:-]{1,80}$/u.test(String(error?.name||"Error"))
      ?String(error?.name||"Error")
      :"Error",
    rpc_code:Number.isInteger(error?.code)?error.code:null,
  };
}
function assertNoSymlinkAncestors(target){
  const resolved=path.resolve(target);
  const parsed=path.parse(resolved);
  let cursor=parsed.root;
  for(const segment of resolved.slice(parsed.root.length).split(path.sep).filter(Boolean)){
    cursor=path.join(cursor,segment);
    const stat=fs.lstatSync(cursor);
    if(stat.isSymbolicLink()){
      throw new Error("registry_broadcast_execution_symlink_ancestor_rejected");
    }
  }
}
function validatePrivateStateRoot(raw,record){
  const supplied=String(raw||"");
  if(!supplied||!path.isAbsolute(supplied)||path.resolve(supplied)!==supplied){
    throw new Error("registry_broadcast_execution_state_root_invalid");
  }
  assertNoSymlinkAncestors(supplied);
  const stat=fs.lstatSync(supplied);
  const big=fs.lstatSync(supplied,{bigint:true});
  if(
    !stat.isDirectory()||
    stat.isSymbolicLink()||
    (typeof process.getuid==="function"&&stat.uid!==process.getuid())||
    (stat.mode&0o777)!==0o700||
    fs.realpathSync.native(supplied)!==supplied||
    String(big.dev)!==String(record.state_store_root_dev)||
    String(big.ino)!==String(record.state_store_root_ino)||
    sha256(supplied)!==record.state_store_realpath_sha256
  ){
    throw new Error("registry_broadcast_execution_state_root_binding_invalid");
  }
  return supplied;
}
function ensurePrivateDirectory(parent,name){
  const dir=path.join(parent,name);
  try{
    const stat=fs.lstatSync(dir);
    if(
      !stat.isDirectory()||
      stat.isSymbolicLink()||
      (typeof process.getuid==="function"&&stat.uid!==process.getuid())||
      (stat.mode&0o777)!==0o700
    ){
      throw new Error("registry_broadcast_execution_attempt_dir_invalid");
    }
  }catch(error){
    if(error?.code!=="ENOENT") throw error;
    fs.mkdirSync(dir,{mode:0o700});
    fs.chmodSync(dir,0o700);
    const fd=fs.openSync(parent,"r");
    try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
  }
  return dir;
}
function atomicCreate(file,value){
  const parent=path.dirname(file);
  const temp=path.join(
    parent,
    "."+path.basename(file)+".tmp-"+String(process.pid)+"-"+
      crypto.randomBytes(8).toString("hex"),
  );
  const bytes=Buffer.from(canonicalJson(value)+"\n","utf8");
  if(bytes.length>MAX_RECORD_BYTES){
    throw new Error("registry_broadcast_execution_record_too_large");
  }
  const fd=fs.openSync(temp,"wx",0o600);
  try{
    fs.writeFileSync(fd,bytes);
    fs.fsyncSync(fd);
    fs.fchmodSync(fd,0o600);
  }finally{
    fs.closeSync(fd);
  }
  try{
    try{
      fs.linkSync(temp,file);
      const dirFd=fs.openSync(parent,"r");
      try{fs.fsyncSync(dirFd);}finally{fs.closeSync(dirFd);}
      return "created";
    }catch(error){
      if(error?.code==="EEXIST") return "exists";
      throw error;
    }
  }finally{
    try{fs.unlinkSync(temp);}catch(error){
      if(error?.code!=="ENOENT") throw error;
    }
  }
}
function readCanonicalPrivateJson(file){
  assertNoSymlinkAncestors(file);
  const stat=fs.lstatSync(file);
  if(
    !stat.isFile()||
    stat.isSymbolicLink()||
    (typeof process.getuid==="function"&&stat.uid!==process.getuid())||
    (stat.mode&0o777)!==0o600||
    stat.size<2||
    stat.size>MAX_RECORD_BYTES
  ){
    throw new Error("registry_broadcast_execution_private_record_invalid");
  }
  return JSON.parse(fs.readFileSync(file,"utf8"));
}
function requireConsumptionFile(root,record){
  const file=path.join(
    root,
    "broadcast-consumed",
    record.broadcast_operation_id+".json",
  );
  const stored=readCanonicalPrivateJson(file);
  if(canonicalJson(stored)!==canonicalJson(record)){
    throw new Error("registry_broadcast_execution_consumption_file_mismatch");
  }
  return file;
}

async function executeCore(input,dependencies,clock){
  let record;
  try{
    record=validateVoidDatanetRegistryBroadcastConsumptionRecordV1(
      input?.consumption_record,
      {
        broadcast_request:input?.broadcast_request,
        broadcast_authorization:input?.broadcast_authorization,
        prebroadcast_observation:input?.prebroadcast_observation,
      },
    );
  }catch(error){
    return held("registry_broadcast_execution_consumption_invalid",{
      detail:{error_class:String(error?.name||"Error").slice(0,80)},
    });
  }
  let artifacts;
  try{
    artifacts=validateVoidDatanetRegistryBroadcastRuntimeArtifactsV1({
      broadcast_request:input?.broadcast_request,
      broadcast_authorization:input?.broadcast_authorization,
    });
  }catch(error){
    return held("registry_broadcast_execution_artifacts_invalid");
  }
  const authorization=artifacts.authorization;
  if(
    !OPERATION_ID.test(record.broadcast_operation_id)||
    !CONSUMPTION_ID.test(record.consumption_record_id)||
    !HASH.test(record.signed_transaction_hash)
  ){
    return held("registry_broadcast_execution_consumption_identity_invalid");
  }

  if(!dependencies||
    typeof dependencies.inspect_submission!=="function"||
    typeof dependencies.submit_once!=="function"||
    typeof dependencies.reconcile_submission!=="function"
  ){
    return held("registry_broadcast_execution_dependencies_invalid");
  }

  let nowMs;
  try{nowMs=clock("entry");}catch(error){
    return held("registry_broadcast_execution_clock_invalid");
  }
  if(!Number.isSafeInteger(nowMs)||nowMs<=0){
    return held("registry_broadcast_execution_clock_invalid");
  }
  const authEnd=Date.parse(authorization.valid_until_utc);
  const obsEnd=Date.parse(record.observation_valid_until_utc);
  if(
    !Number.isFinite(authEnd)||
    !Number.isFinite(obsEnd)||
    nowMs>=authEnd||
    nowMs>=obsEnd
  ){
    return held("registry_broadcast_execution_expired");
  }

  let root;
  try{
    root=validatePrivateStateRoot(input?.state_dir,record);
    requireConsumptionFile(root,record);
  }catch(error){
    return held("registry_broadcast_execution_state_or_consumption_file_invalid",{
      detail:{error_class:String(error?.name||"Error").slice(0,80)},
    });
  }

  let inspection;
  try{
    inspection=await dependencies.inspect_submission({
      signed_transaction_id:record.signed_transaction_id,
      signed_transaction_hash:record.signed_transaction_hash,
      deployer_address:record.transaction_summary.from_address,
      nonce:record.transaction_summary.nonce,
      predicted_contract_address:
        record.transaction_summary.predicted_contract_address,
      authorization_id:record.broadcast_authorization_id,
      consumption_record_id:record.consumption_record_id,
    });
  }catch(error){
    return held("registry_broadcast_execution_fresh_inspection_failed",{
      detail:safeError(error),
    });
  }
  if(
    !inspection||
    inspection.ok!==true||
    inspection.status!=="not_submitted"||
    inspection.signed_transaction_hash!==record.signed_transaction_hash||
    inspection.transaction_seen!==false||
    inspection.receipt_seen!==false||
    inspection.pending_nonce!==record.transaction_summary.nonce||
    inspection.predicted_contract_code_present!==false
  ){
    return held("registry_broadcast_execution_fresh_inspection_not_green");
  }

  const apply=input?.apply===true;
  if(!apply){
    return Object.freeze({
      ok:true,
      marker:VOID_DATANET_REGISTRY_EXACT_SINGLE_BROADCAST_EXECUTION_V1,
      version:1,
      status:"DRY_RUN_READY_EXACT_SINGLE_BROADCAST_CONFIRMATION_REQUIRED",
      applied:false,
      broadcast_operation_id:record.broadcast_operation_id,
      consumption_record_id:record.consumption_record_id,
      broadcast_authorization_id:record.broadcast_authorization_id,
      signed_transaction_id:record.signed_transaction_id,
      signed_transaction_hash:record.signed_transaction_hash,
      required_confirmation:authorization.required_confirmation,
      durable_submission_intent_published:false,
      signed_transaction_bytes_accessed:false,
      submit_method_invoked:false,
      submission_may_have_occurred:false,
      reconciliation_required:false,
      transaction_broadcast_performed:false,
      automatic_retry_allowed:false,
    });
  }

  if(input?.confirmation!==authorization.required_confirmation){
    return held("registry_broadcast_execution_confirmation_required");
  }

  const attempts=ensurePrivateDirectory(root,"broadcast-attempts");
  const intentFile=path.join(
    attempts,
    record.broadcast_operation_id+".intent.json",
  );
  const resultFile=path.join(
    attempts,
    record.broadcast_operation_id+".result.json",
  );
  const intentMaterial={
    marker:VOID_DATANET_REGISTRY_EXACT_SINGLE_BROADCAST_EXECUTION_V1,
    version:1,
    status:"SINGLE_BROADCAST_INTENT_DURABLE_BEFORE_SIGNED_BYTES_ACCESS",
    broadcast_operation_id:record.broadcast_operation_id,
    consumption_record_id:record.consumption_record_id,
    broadcast_authorization_id:record.broadcast_authorization_id,
    signed_transaction_id:record.signed_transaction_id,
    signed_transaction_hash:record.signed_transaction_hash,
    candidate_id:record.candidate_id,
    transaction_fingerprint_sha256:record.transaction_fingerprint_sha256,
    required_confirmation:authorization.required_confirmation,
    one_submission_attempt_only:true,
    automatic_retry:false,
    created_at_utc:new Date(nowMs).toISOString(),
  };
  const intent={
    ...intentMaterial,
    submission_intent_id:
      "voiddrbsi1_"+sha256(Buffer.from(canonicalJson(intentMaterial))),
  };
  let published;
  try{
    published=atomicCreate(intentFile,intent);
  }catch(error){
    return held("registry_broadcast_execution_intent_publication_failed");
  }
  if(published==="exists"){
    return held("registry_broadcast_execution_attempt_already_claimed",{
      durable_submission_intent_published:true,
      reconciliation_required:true,
    });
  }

  let preSubmitNowMs;
  try{preSubmitNowMs=clock("presubmit");}catch(error){
    return held("registry_broadcast_execution_clock_invalid_after_intent",{
      durable_submission_intent_published:true,
      reconciliation_required:true,
    });
  }
  if(
    !Number.isSafeInteger(preSubmitNowMs)||
    preSubmitNowMs<=0||
    preSubmitNowMs>=authEnd||
    preSubmitNowMs>=obsEnd
  ){
    return held("registry_broadcast_execution_expired_after_intent_before_send",{
      durable_submission_intent_published:true,
      reconciliation_required:true,
    });
  }

  let submitResult=null;
  let submitError=null;
  let submitCount=0;
  try{
    submitCount+=1;
    if(submitCount!==1){
      throw new Error("registry_broadcast_execution_submit_count_invariant");
    }
    submitResult=await dependencies.submit_once({
      submission_intent_id:intent.submission_intent_id,
      signed_transaction_id:record.signed_transaction_id,
      signed_transaction_hash:record.signed_transaction_hash,
      candidate_id:record.candidate_id,
      transaction_fingerprint_sha256:record.transaction_fingerprint_sha256,
    });
  }catch(error){
    submitError=safeError(error);
  }

  let reconciliation=null;
  let reconciliationError=null;
  try{
    reconciliation=await dependencies.reconcile_submission({
      signed_transaction_hash:record.signed_transaction_hash,
      deployer_address:record.transaction_summary.from_address,
      nonce:record.transaction_summary.nonce,
      predicted_contract_address:
        record.transaction_summary.predicted_contract_address,
    });
  }catch(error){
    reconciliationError=safeError(error);
  }

  let classification;
  if(
    reconciliation?.receipt_seen===true&&
    reconciliation.receipt_status==="0x1"&&
    reconciliation.receipt_contract_address===
      record.transaction_summary.predicted_contract_address
  ){
    classification="RECEIPT_SUCCESS_RUNTIME_BYTECODE_VERIFICATION_REQUIRED";
  }else if(reconciliation?.receipt_seen===true){
    classification="RECEIPT_FAILURE_AUTHORIZATION_CONSUMED_NO_RETRY";
  }else if(reconciliation?.transaction_seen===true){
    classification="TRANSACTION_SEEN_RECEIPT_PENDING_NO_RETRY_RECONCILE";
  }else if(submitError!==null){
    classification=
      "SEND_ERROR_AMBIGUOUS_OR_REJECTED_AUTHORIZATION_CONSUMED_NO_RETRY";
  }else{
    classification=
      "SUBMISSION_RETURNED_NO_CONFIRMED_RECEIPT_AUTHORIZATION_CONSUMED_NO_RETRY";
  }

  const resultMaterial={
    marker:VOID_DATANET_REGISTRY_EXACT_SINGLE_BROADCAST_EXECUTION_V1,
    version:1,
    status:"SINGLE_BROADCAST_ATTEMPT_TERMINAL_RECORD",
    broadcast_operation_id:record.broadcast_operation_id,
    consumption_record_id:record.consumption_record_id,
    broadcast_authorization_id:record.broadcast_authorization_id,
    submission_intent_id:intent.submission_intent_id,
    signed_transaction_id:record.signed_transaction_id,
    signed_transaction_hash:record.signed_transaction_hash,
    rpc_send_invocation_count:submitCount,
    rpc_send_result:
      typeof submitResult?.transaction_hash==="string"
        ?submitResult.transaction_hash.toLowerCase()
        :null,
    rpc_send_result_matches_expected_hash:
      typeof submitResult?.transaction_hash==="string"&&
      submitResult.transaction_hash.toLowerCase()===record.signed_transaction_hash,
    rpc_send_error:submitError,
    immediate_reconciliation:reconciliation,
    reconciliation_error:reconciliationError,
    classification,
    automatic_retry_performed:false,
    replacement_transaction_created:false,
    finished_at_utc:new Date(nowMs).toISOString(),
  };
  const result={
    ...resultMaterial,
    submission_result_id:
      "voiddrbsub1_"+sha256(Buffer.from(canonicalJson(resultMaterial))),
  };
  try{
    const resultPublished=atomicCreate(resultFile,result);
    if(resultPublished!=="created"){
      throw new Error("registry_broadcast_execution_result_exists");
    }
  }catch(error){
    return Object.freeze({
      ok:false,
      ...result,
      reason:"registry_broadcast_execution_result_publication_failed_after_attempt",
      applied:true,
      durable_submission_intent_published:true,
      signed_transaction_bytes_accessed:true,
      submit_method_invoked:true,
      submission_may_have_occurred:true,
      reconciliation_required:true,
      transaction_broadcast_performed:submitCount===1,
      automatic_retry_allowed:false,
    });
  }

  return Object.freeze({
    ok:true,
    ...result,
    applied:true,
    durable_submission_intent_published:true,
    signed_transaction_bytes_accessed:true,
    submit_method_invoked:true,
    submission_may_have_occurred:submitCount===1,
    reconciliation_required:true,
    transaction_broadcast_performed:submitCount===1,
    automatic_retry_allowed:false,
    next_gate:
      "registry_broadcast_reconciliation_and_runtime_bytecode_verification_without_resubmission_v1",
  });
}

export async function executeVoidDatanetRegistryExactSingleBroadcastWithClocksV1(
  input,
  dependencies,
  {entryNowMs,preSubmitNowMs}={},
){
  return await executeCore(
    input,
    dependencies,
    (stage)=>stage==="entry"?entryNowMs:preSubmitNowMs,
  );
}

export async function executeVoidDatanetRegistryExactSingleBroadcastWithClockV1(
  input,
  dependencies,
  nowMs,
){
  return await executeVoidDatanetRegistryExactSingleBroadcastWithClocksV1(
    input,
    dependencies,
    {entryNowMs:nowMs,preSubmitNowMs:nowMs},
  );
}

export async function executeVoidDatanetRegistryExactSingleBroadcastV1(
  input,
  dependencies,
){
  return await executeCore(input,dependencies,()=>Date.now());
}
