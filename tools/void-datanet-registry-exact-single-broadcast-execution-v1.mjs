#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  validateVoidDatanetRegistrySignedTransactionV1,
} from "./void-datanet-registry-consumed-authorization-signing-v1.mjs";
import {
  validateVoidDatanetRegistryBroadcastRuntimeArtifactsV1,
  validateVoidDatanetRegistryPrebroadcastObservationV1,
} from "./void-datanet-registry-prebroadcast-observer-v1.mjs";
import {
  voidDatanetRegistryBroadcastOperationIdV1,
} from "./void-datanet-registry-single-use-broadcast-authorization-consumption-v1.mjs";

export const VOID_DATANET_REGISTRY_EXACT_SINGLE_BROADCAST_EXECUTION_V1 =
  "VOID_DATANET_REGISTRY_EXACT_SINGLE_BROADCAST_EXECUTION_V1";

const MAX_RECORD_BYTES=512*1024;
const HASH=/^0x[0-9a-f]{64}$/u;
const SIGNED_ID=/^voiddrstx1_[0-9a-f]{64}$/u;
const AUTH_ID=/^voiddrba1_[0-9a-f]{64}$/u;
const REQUEST_ID=/^voiddrbar1_[0-9a-f]{64}$/u;
const OBS_ID=/^voiddrpbo1_[0-9a-f]{64}$/u;
const OP_ID=/^voiddrbo1_[0-9a-f]{64}$/u;
const CONSUMPTION_ID=/^voiddrbac1_[0-9a-f]{64}$/u;

function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function canonical(value){
  if(value===null||typeof value==="string"||typeof value==="boolean") return value;
  if(typeof value==="number"&&Number.isFinite(value)) return value;
  if(Array.isArray(value)) return value.map(canonical);
  if(value&&typeof value==="object"){
    return Object.fromEntries(
      Object.keys(value).sort().map((key)=>[key,canonical(value[key])]),
    );
  }
  throw new Error("unsupported_canonical_value");
}
function canonicalJson(value){
  return JSON.stringify(canonical(value));
}
function safeError(error){
  return {
    error_class:/^[A-Za-z0-9._:-]{1,80}$/u.test(String(error?.name||"Error"))
      ? String(error?.name||"Error")
      : "Error",
    rpc_code:Number.isInteger(error?.code)?error.code:null,
  };
}
function held(reason,extra={}){
  return Object.freeze({
    ok:false,
    marker:VOID_DATANET_REGISTRY_EXACT_SINGLE_BROADCAST_EXECUTION_V1,
    version:1,
    status:"held",
    reason,
    broadcaster_access_performed:false,
    rpc_send_invocation_count:0,
    transaction_submission_performed:false,
    transaction_broadcast_performed:false,
    automatic_retry_performed:false,
    replacement_transaction_created:false,
    ...extra,
  });
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
      throw new Error("registry_broadcast_execution_symlink_ancestor_rejected");
    }
  }
}
function validateStateRoot(raw){
  const supplied=String(raw||"");
  if(!supplied||!path.isAbsolute(supplied)||path.resolve(supplied)!==supplied){
    throw new Error("registry_broadcast_execution_state_root_invalid");
  }
  assertNoSymlinkAncestors(supplied);
  const stat=fs.lstatSync(supplied);
  const big=fs.lstatSync(supplied,{bigint:true});
  if(
    stat.isSymbolicLink()||
    !stat.isDirectory()||
    fs.realpathSync.native(supplied)!==supplied||
    (typeof process.getuid==="function"&&stat.uid!==process.getuid())||
    (stat.mode&0o777)!==0o700
  ){
    throw new Error("registry_broadcast_execution_state_root_policy_invalid");
  }
  return Object.freeze({
    realpath:supplied,
    realpath_sha256:sha256(supplied),
    dev:String(big.dev),
    ino:String(big.ino),
  });
}
function assertStateGeneration(root){
  const big=fs.lstatSync(root.realpath,{bigint:true});
  if(
    fs.realpathSync.native(root.realpath)!==root.realpath||
    String(big.dev)!==root.dev||
    String(big.ino)!==root.ino
  ){
    throw new Error("registry_broadcast_execution_state_generation_changed");
  }
}
function ensurePrivateDir(parent,name){
  const dir=path.join(parent,name);
  try{
    fs.mkdirSync(dir,{mode:0o700});
  }catch(error){
    if(error?.code!=="EEXIST") throw error;
  }
  /*
   * The directory entry itself is part of the single-attempt durability
   * boundary. Persist the parent directory before any intent can authorize
   * broadcaster access. This is deliberately unconditional so an existing
   * directory is harmlessly re-fsynced and a newly-created entry is durable.
   */
  fsyncDir(parent);
  const st=fs.lstatSync(dir);
  if(
    st.isSymbolicLink()||
    !st.isDirectory()||
    fs.realpathSync.native(dir)!==dir||
    (typeof process.getuid==="function"&&st.uid!==process.getuid())||
    (st.mode&0o777)!==0o700
  ){
    throw new Error("registry_broadcast_execution_private_dir_invalid:"+name);
  }
  return dir;
}
function readPrivateJson(file){
  assertNoSymlinkAncestors(file);
  const st=fs.lstatSync(file);
  if(
    st.isSymbolicLink()||
    !st.isFile()||
    fs.realpathSync.native(file)!==file||
    st.nlink!==1||
    (typeof process.getuid==="function"&&st.uid!==process.getuid())||
    (st.mode&0o777)!==0o600||
    st.size<2||
    st.size>MAX_RECORD_BYTES
  ){
    throw new Error("registry_broadcast_execution_private_record_invalid");
  }
  return JSON.parse(fs.readFileSync(file,"utf8"));
}
function fsyncDir(dir){
  const fd=fs.openSync(dir,fs.constants.O_RDONLY|Number(fs.constants.O_DIRECTORY||0));
  try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
}
function atomicCreate(file,value){
  const bytes=Buffer.from(JSON.stringify(value,null,2)+"\n","utf8");
  let fd=-1;
  try{
    fd=fs.openSync(
      file,
      fs.constants.O_WRONLY|
        fs.constants.O_CREAT|
        fs.constants.O_EXCL|
        Number(fs.constants.O_NOFOLLOW||0),
      0o600,
    );
    fs.writeFileSync(fd,bytes);
    fs.fchmodSync(fd,0o600);
    fs.fsyncSync(fd);
  }catch(error){
    if(error?.code==="EEXIST") return "exists";
    throw error;
  }finally{
    bytes.fill(0);
    if(fd>=0) fs.closeSync(fd);
  }
  fsyncDir(path.dirname(file));
  return "created";
}
function validateConsumptionRecord(record,{authorization,observation,root,operationId}){
  if(
    !record||
    record.marker!==
      "VOID_DATANET_REGISTRY_SINGLE_USE_BROADCAST_AUTHORIZATION_CONSUMPTION_V1"||
    record.version!==1||
    record.status!=="BROADCAST_AUTHORIZATION_CONSUMED_BROADCASTER_ACCESS_HOLD"||
    !CONSUMPTION_ID.test(String(record.consumption_record_id||""))||
    record.broadcast_operation_id!==operationId||
    record.broadcast_authorization_id!==authorization.broadcast_authorization_id||
    record.broadcast_authorization_request_id!==
      authorization.broadcast_authorization_request_id||
    record.prebroadcast_observation_id!==observation.prebroadcast_observation_id||
    record.signed_transaction_id!==authorization.signed_transaction_id||
    record.signed_transaction_hash!==
      authorization.transaction_summary.signed_transaction_hash||
    record.candidate_id!==authorization.candidate_id||
    record.transaction_fingerprint_sha256!==
      authorization.transaction_fingerprint_sha256||
    record.authorization_valid_until_utc!==authorization.valid_until_utc||
    record.observation_valid_until_utc!==observation.valid_until_utc||
    record.state_store_realpath_sha256!==root.realpath_sha256||
    record.state_store_root_dev!==root.dev||
    record.state_store_root_ino!==root.ino||
    canonicalJson(record.transaction_summary)!==
      canonicalJson(authorization.transaction_summary)||
    record.consumption?.exact_single_transaction!==true||
    record.consumption?.exact_signed_transaction_only!==true||
    record.consumption?.one_submission_attempt_only!==true||
    record.consumption?.single_use!==true||
    record.consumption?.authorization_consumed!==true||
    record.consumption?.immutable_consumption_record!==true||
    record.consumption?.state_store_generation_bound!==true||
    record.consumption?.consumption_precedes_any_broadcaster_access!==true||
    record.consumption?.signed_transaction_hash_bound!==true||
    record.authority?.transaction_submission_performed!==false||
    record.authority?.transaction_broadcast_performed!==false||
    record.authority?.automatic_retry!==false||
    record.next_gate!==
      "exact_single_attempt_registry_broadcast_execution_after_consumption_v1"
  ){
    throw new Error("registry_broadcast_execution_consumption_binding_invalid");
  }
  const material=structuredClone(record);
  const id=material.consumption_record_id;
  delete material.consumption_record_id;
  if(id!=="voiddrbac1_"+sha256(Buffer.from(canonicalJson(material)))){
    throw new Error("registry_broadcast_execution_consumption_id_invalid");
  }
  return record;
}
function assertRuntimeWindow(authorization,observation,nowMs){
  const authStart=Date.parse(String(authorization.authorized_at_utc||""));
  const authEnd=Date.parse(String(authorization.valid_until_utc||""));
  const obsStart=Date.parse(String(observation.observed_at_utc||""));
  const obsEnd=Date.parse(String(observation.valid_until_utc||""));
  if(
    !Number.isSafeInteger(nowMs)||
    !Number.isFinite(authStart)||
    !Number.isFinite(authEnd)||
    !Number.isFinite(obsStart)||
    !Number.isFinite(obsEnd)||
    nowMs<authStart||
    nowMs>=authEnd||
    nowMs<obsStart||
    nowMs>=obsEnd
  ){
    throw new Error("registry_broadcast_execution_runtime_expired_or_inactive");
  }
}
async function reconcile(rpc,authorization){
  const tx=authorization.transaction_summary;
  const [transaction,receipt,code,pendingNonce]=await Promise.all([
    rpc("eth_getTransactionByHash",[tx.signed_transaction_hash]),
    rpc("eth_getTransactionReceipt",[tx.signed_transaction_hash]),
    rpc("eth_getCode",[tx.predicted_contract_address,"latest"]),
    rpc("eth_getTransactionCount",[authorization.deployer_address,"pending"]),
  ]);
  return Object.freeze({
    transaction_seen:transaction!==null,
    receipt_seen:receipt!==null,
    receipt_status:
      receipt?.status===undefined||receipt?.status===null
        ? null
        : String(receipt.status).toLowerCase(),
    receipt_contract_address:
      receipt?.contractAddress
        ? String(receipt.contractAddress).toLowerCase()
        : null,
    predicted_contract_code_present:
      typeof code==="string"&&!/^0x0*$/u.test(code.toLowerCase()),
    pending_nonce_hex:String(pendingNonce),
  });
}

export async function submitVoidDatanetRegistryExactSingleBroadcastWithDependenciesV1(
  input,
  dependencies,
){
  if(
    !dependencies||
    typeof dependencies.validate_runtime!=="function"||
    typeof dependencies.validate_observation!=="function"||
    typeof dependencies.validate_signed_transaction!=="function"||
    typeof dependencies.rpc!=="function"||
    typeof dependencies.now!=="function"
  ){
    throw new Error("registry_broadcast_execution_dependencies_invalid");
  }

  let runtime;
  let observation;
  let signed;
  try{
    runtime=dependencies.validate_runtime({
      broadcast_request:input?.broadcast_request,
      broadcast_authorization:input?.broadcast_authorization,
    });
    observation=dependencies.validate_observation(
      input?.prebroadcast_observation,
      {
        broadcast_request:runtime.request,
        broadcast_authorization:runtime.authorization,
      },
    );
    signed=dependencies.validate_signed_transaction(input?.signed_transaction);
  }catch(error){
    return held("registry_broadcast_execution_lineage_invalid",{
      error:safeError(error),
    });
  }

  const authorization=runtime.authorization;
  const request=runtime.request;
  const operationId=voidDatanetRegistryBroadcastOperationIdV1(authorization);
  if(
    !AUTH_ID.test(String(authorization.broadcast_authorization_id||""))||
    !REQUEST_ID.test(String(request.broadcast_authorization_request_id||""))||
    !OBS_ID.test(String(observation.prebroadcast_observation_id||""))||
    !SIGNED_ID.test(String(signed.signed_transaction_id||""))||
    !OP_ID.test(operationId)||
    signed.signed_transaction_id!==authorization.signed_transaction_id||
    signed.signed_transaction_hash!==
      authorization.transaction_summary.signed_transaction_hash||
    signed.candidate_id!==authorization.candidate_id||
    signed.transaction_fingerprint_sha256!==
      authorization.transaction_fingerprint_sha256||
    observation.signed_transaction_hash!==
      authorization.transaction_summary.signed_transaction_hash
  ){
    return held("registry_broadcast_execution_exact_binding_mismatch");
  }

  if(
    typeof input?.confirmation!=="string"||
    input.confirmation!==authorization.required_confirmation
  ){
    return held(
      "registry_broadcast_execution_exact_operation_confirmation_required",
      {broadcast_operation_id:operationId},
    );
  }

  let root;
  let consumption;
  try{
    root=validateStateRoot(input?.state_dir);
    assertStateGeneration(root);
    const consumedFile=path.join(
      root.realpath,
      "broadcast-consumed",
      operationId+".json",
    );
    consumption=validateConsumptionRecord(
      readPrivateJson(consumedFile),
      {authorization,observation,root,operationId},
    );
  }catch(error){
    return held("registry_broadcast_execution_verified_consumption_required",{
      error:safeError(error),
      broadcast_operation_id:operationId,
    });
  }

  try{
    assertRuntimeWindow(authorization,observation,dependencies.now());
    assertStateGeneration(root);
  }catch(error){
    return held("registry_broadcast_execution_runtime_preflight_failed",{
      error:safeError(error),
      broadcast_operation_id:operationId,
      consumption_record_id:consumption.consumption_record_id,
    });
  }

  let attempts;
  try{
    attempts=ensurePrivateDir(root.realpath,"broadcast-attempts");
    assertStateGeneration(root);
  }catch(error){
    return held("registry_broadcast_execution_attempt_store_invalid",{
      error:safeError(error),
      broadcast_operation_id:operationId,
    });
  }

  const intentFile=path.join(attempts,operationId+".intent.json");
  const resultFile=path.join(attempts,operationId+".result.json");
  const intentMaterial={
    marker:VOID_DATANET_REGISTRY_EXACT_SINGLE_BROADCAST_EXECUTION_V1,
    version:1,
    status:"SINGLE_BROADCAST_ATTEMPT_INTENT_DURABLE_BEFORE_RPC",
    broadcast_operation_id:operationId,
    consumption_record_id:consumption.consumption_record_id,
    broadcast_authorization_id:authorization.broadcast_authorization_id,
    broadcast_authorization_request_id:
      authorization.broadcast_authorization_request_id,
    prebroadcast_observation_id:observation.prebroadcast_observation_id,
    signed_transaction_id:signed.signed_transaction_id,
    signed_transaction_hash:signed.signed_transaction_hash,
    predicted_contract_address:
      authorization.transaction_summary.predicted_contract_address,
    one_submission_attempt_only:true,
    automatic_retry_authorized:false,
    replacement_transaction_authorized:false,
    created_at_utc:new Date(dependencies.now()).toISOString(),
  };
  const intent={
    ...intentMaterial,
    submission_intent_id:
      "voiddrbei1_"+sha256(Buffer.from(canonicalJson(intentMaterial))),
  };

  let published;
  try{
    published=atomicCreate(intentFile,intent);
  }catch(error){
    return held("registry_broadcast_execution_intent_publication_failed",{
      error:safeError(error),
      broadcast_operation_id:operationId,
    });
  }
  if(published==="exists"){
    return held("registry_broadcast_execution_attempt_already_recorded",{
      broadcast_operation_id:operationId,
    });
  }

  /*
   * The final gate is intentionally separate from the RPC send catch. A stale
   * authorization/observation or moved state-root generation means no
   * broadcaster access occurred and must never be reported as a successful
   * terminal attempt.
   */
  try{
    assertRuntimeWindow(authorization,observation,dependencies.now());
    assertStateGeneration(root);
  }catch(error){
    return held(
      "registry_broadcast_execution_final_pre_send_gate_failed",
      {
        error:safeError(error),
        broadcast_operation_id:operationId,
        consumption_record_id:consumption.consumption_record_id,
        submission_intent_id:intent.submission_intent_id,
        attempt_intent_recorded:true,
      },
    );
  }

  let sendResult=null;
  let sendError=null;
  let sendCount=0;
  try{
    sendCount+=1;
    if(sendCount!==1) throw new Error("registry_broadcast_execution_send_count_invariant");
    sendResult=await dependencies.rpc(
      "eth_sendRawTransaction",
      [signed.signed_serialized_transaction],
    );
  }catch(error){
    sendError=safeError(error);
  }

  let reconciliation=null;
  let reconciliationError=null;
  try{
    reconciliation=await reconcile(dependencies.rpc,authorization);
  }catch(error){
    reconciliationError=safeError(error);
  }

  let classification;
  if(
    reconciliation?.receipt_seen===true&&
    reconciliation.receipt_status==="0x1"&&
    reconciliation.receipt_contract_address===
      authorization.transaction_summary.predicted_contract_address
  ){
    classification="RECEIPT_SUCCESS_RUNTIME_BYTECODE_VERIFICATION_REQUIRED";
  }else if(
    reconciliation?.receipt_seen===true&&
    reconciliation.receipt_status!==null&&
    reconciliation.receipt_status!=="0x1"
  ){
    classification="RECEIPT_FAILURE_AUTHORIZATION_CONSUMED_NO_RETRY";
  }else if(reconciliation?.transaction_seen===true){
    classification="TRANSACTION_SEEN_RECEIPT_PENDING_NO_RETRY_RECONCILE";
  }else if(sendError!==null){
    classification="SEND_ERROR_AMBIGUOUS_OR_REJECTED_AUTHORIZATION_CONSUMED_NO_RETRY";
  }else{
    classification="SUBMISSION_RETURNED_NO_CONFIRMED_RECEIPT_AUTHORIZATION_CONSUMED_NO_RETRY";
  }

  const resultMaterial={
    marker:VOID_DATANET_REGISTRY_EXACT_SINGLE_BROADCAST_EXECUTION_V1,
    version:1,
    status:"SINGLE_BROADCAST_ATTEMPT_TERMINAL_RECORD",
    broadcast_operation_id:operationId,
    submission_intent_id:intent.submission_intent_id,
    consumption_record_id:consumption.consumption_record_id,
    broadcast_authorization_id:authorization.broadcast_authorization_id,
    signed_transaction_id:signed.signed_transaction_id,
    signed_transaction_hash:signed.signed_transaction_hash,
    predicted_contract_address:
      authorization.transaction_summary.predicted_contract_address,
    rpc_send_invocation_count:sendCount,
    rpc_send_result:
      typeof sendResult==="string"?sendResult.toLowerCase():null,
    rpc_send_result_matches_expected_hash:
      typeof sendResult==="string"&&
      sendResult.toLowerCase()===signed.signed_transaction_hash,
    rpc_send_error:sendError,
    immediate_reconciliation:reconciliation,
    reconciliation_error:reconciliationError,
    classification,
    automatic_retry_performed:false,
    replacement_transaction_created:false,
    finished_at_utc:new Date(dependencies.now()).toISOString(),
  };
  const result={
    ...resultMaterial,
    submission_result_id:
      "voiddrber1_"+sha256(Buffer.from(canonicalJson(resultMaterial))),
  };

  try{
    if(atomicCreate(resultFile,result)!=="created"){
      throw new Error("registry_broadcast_execution_result_exists");
    }
  }catch(error){
    return Object.freeze({
      ok:false,
      ...result,
      reason:"registry_broadcast_execution_result_publication_failed_after_attempt",
      error:safeError(error),
      broadcaster_access_performed:sendCount===1,
      transaction_submission_performed:sendCount===1,
      transaction_broadcast_performed:sendCount===1,
    });
  }

  return Object.freeze({
    ok:true,
    ...result,
    broadcaster_access_performed:sendCount===1,
    transaction_submission_performed:sendCount===1,
    transaction_broadcast_performed:sendCount===1,
  });
}

export async function submitVoidDatanetRegistryExactSingleBroadcastV1(input){
  return submitVoidDatanetRegistryExactSingleBroadcastWithDependenciesV1(
    input,
    {
      validate_runtime:validateVoidDatanetRegistryBroadcastRuntimeArtifactsV1,
      validate_observation:validateVoidDatanetRegistryPrebroadcastObservationV1,
      validate_signed_transaction:validateVoidDatanetRegistrySignedTransactionV1,
      rpc:input?.rpc,
      now:input?.now??(()=>Date.now()),
    },
  );
}
