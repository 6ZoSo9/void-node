#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";

import {
  canonicalApollyonClaimContractJsonV1,
} from "./apollyon-candidate-training-attempt-claim-contract-v1.mjs";
import {
  parseApollyonDurableAttemptClaimPublishRequestBytesV2,
  validateApollyonDurableAttemptClaimRecordEnvelopeV2,
} from "./apollyon-durable-attempt-claim-request-envelope-v2.mjs";
import {
  validateApollyonDurableAttemptClaimAuthorizationSlotRecordV1,
} from "./apollyon-durable-attempt-claim-authorization-slot-v1.mjs";
import {
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_GENERATION_RECORD_KEYS_V2,
  qualifyApollyonDurableAttemptClaimStorePolicyV2,
  qualifyApollyonDurableAttemptClaimSuccessResponseShapeV2,
} from "./apollyon-durable-attempt-claim-store-contract-v2.mjs";

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_SERVICE_SOURCE_IMPLEMENTATION_V2 =
  "VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_SERVICE_SOURCE_IMPLEMENTATION_V2";

export const PARENT_AUTHORIZATION_SLOT_BLOB_SHA1 =
  "93582c324ca85aeff56eb61f82b32f1e4c18dfe9";
export const REQUEST_ENVELOPE_BLOB_SHA1 =
  "d1726e3be042549769d2fe554371facd2ed60553";
export const STORE_CONTRACT_BLOB_SHA1 =
  "6e3e5a80b3f481f98aced9b33e3f2ec66ec96bbe";
export const STORE_SERVICE_CANDIDATE_BLOB_SHA1 =
  "d67ef39c4cd034844fb0862e180de46ed4cd0c88";
export const NATIVE_PEER_INTEGRATION_BLOB_SHA1 =
  "394b9dbaebbdbb561be6119f5be8b60d59fb367d";

export const VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2 = Object.freeze({
  fixed_claim_state_root:"/var/lib/void-apollyon-attempt-claim-v2",
  active_generation_leaf:"active-generation-v2.json",
  generation_directory:"store-generations-v2",
  authorization_slot_directory:"authorization-slots-v1",
  claim_directory:"claims-v2",
  pending_directory:".pending-v2",
  training_start_consumption_directory:"training-start-consumption-v1",
});

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_SERVICE_SOURCE_IMPLEMENTATION_AUTHORITY_V2 =
  Object.freeze({
    source_implementation_present:true,
    store_core_implementation_present:true,
    publisher_exact_forward_implementation_present:true,
    fixed_physical_namespace_defined:true,
    create_only_slot_publication_implemented:true,
    create_only_claim_publication_implemented:true,
    private_pending_fsync_publication_implemented:true,
    directory_fsync_implemented:true,
    exact_reread_implemented:true,
    crash_recovery_exact_pending_link_cleanup_implemented:true,
    exact_same_claim_recovery_implemented:true,
    different_claim_in_occupied_slot_rejected_implemented:true,
    slot_before_claim_order_implemented:true,
    injected_exclusive_transaction_required:true,
    injected_prepublication_revalidator_required:true,
    caller_supplied_exclusive_transaction_is_host_proof:false,
    caller_supplied_revalidator_is_host_proof:false,
    native_peer_runtime_integration_present:false,
    af_unix_listener_implementation_present:false,
    privileged_revalidator_runtime_integration_present:false,
    publisher_runtime_process_integration_present:false,
    installed_source_custody_proven:false,
    protected_store_origin_proven:false,
    cross_uid_host_qualification_performed:false,
    kernel_peer_authentication_performed:false,
    direct_parent_lineage_proven:false,
    privileged_revalidation_performed:false,
    challenge_exchange_performed:false,
    xiphos_execution_performed:false,
    production_claim_store_mutation_performed:false,
    production_durable_attempt_claim_performed:false,
    attempt_claim_authorized:false,
    training_start_admission:false,
    training_execution_authorized:false,
    training_execution_performed:false,
    candidate_weight_mutation_performed:false,
    operator_private_key_access:false,
    signing:false,
    wallet_access:false,
    transaction:false,
    funds_movement:false,
  });

const HASH64=/^[0-9a-f]{64}$/u;
const STORE_POLICY_ID=/^apollyon_claim_store_policy_v2:[0-9a-f]{64}$/u;
const STORE_GENERATION_ID=/^apollyon_claim_store_generation_v2:[0-9a-f]{64}$/u;
const STORE_GENERATION_RECORD_ID=
  /^apollyon_claim_store_generation_record_v2:[0-9a-f]{64}$/u;
const CONTINUITY_RECEIPT_ID=
  /^apollyon_claim_store_continuity_v2:[0-9a-f]{64}$/u;
const CLAIM_RECORD_ID=/^apollyon_attempt_claim_record_v2:([0-9a-f]{64})$/u;
const SLOT_ID=/^apollyon_attempt_claim_auth_slot_v1:([0-9a-f]{64})$/u;
const SLOT_RECORD_ID=
  /^apollyon_attempt_claim_auth_slot_record_v1:[0-9a-f]{64}$/u;
const SESSION_BINDING_ID=/^apollyon_claim_source_session_v2:[0-9a-f]{64}$/u;
const MAX_RECORD_BYTES=256*1024;
const ROOT_MODE=0o700;
const DIRECTORY_MODE=0o700;
const RECORD_MODE=0o600;
const O_DIRECTORY=fs.constants.O_DIRECTORY??0;
const O_NOFOLLOW=fs.constants.O_NOFOLLOW??0;
const O_CLOEXEC=fs.constants.O_CLOEXEC??0;

function fail(code){throw new Error(code);}
function canonical(value){return canonicalApollyonClaimContractJsonV1(value);}
function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}
function exactOwnKeys(value,expected,code){
  if(!value||typeof value!=="object"||Array.isArray(value))fail(code);
  const actual=Object.keys(value).sort();
  const wanted=[...expected].sort();
  if(actual.length!==wanted.length||actual.some((key,index)=>key!==wanted[index])){
    fail(code);
  }
}
function clonePlain(value,code){
  let copy;
  try{copy=structuredClone(value);}catch{fail(code);}
  if(!copy||typeof copy!=="object"||Array.isArray(copy))fail(code);
  const proto=Object.getPrototypeOf(copy);
  if(proto!==Object.prototype&&proto!==null)fail(code);
  return copy;
}
function recordBytes(value){
  return Buffer.from(canonical(value)+"\n","utf8");
}
function idDigest(value,pattern,code){
  const match=pattern.exec(value);
  if(!match)fail(code);
  return match[1];
}
function safeLeaf(value,code){
  if(typeof value!=="string"||!/^[A-Za-z0-9._-]{1,180}$/u.test(value)||
     value==="."||value===".."||value.includes("/")){
    fail(code);
  }
  return value;
}
function procFdPath(fd,leaf=null){
  if(!Number.isSafeInteger(fd)||fd<0)fail("apollyon_claim_store_impl_v2_fd_invalid");
  const base="/proc/self/fd/"+String(fd);
  return leaf===null?base:base+"/"+safeLeaf(leaf,"apollyon_claim_store_impl_v2_leaf_invalid");
}
function modeBits(st){return st.mode&0o7777;}
function identity(st){
  return Object.freeze({
    dev:String(st.dev),ino:String(st.ino),mode:modeBits(st),
    uid:st.uid,gid:st.gid,nlink:st.nlink,size:st.size,
  });
}
function sameIdentity(a,b){
  return a.dev===b.dev&&a.ino===b.ino&&a.mode===b.mode&&
    a.uid===b.uid&&a.gid===b.gid&&a.nlink===b.nlink&&a.size===b.size;
}
function requireDirectoryFd(fd,uid,gid,mode,code){
  let st;
  try{st=fs.fstatSync(fd);}
  catch{fail(code);}
  if(!st.isDirectory()||st.isSymbolicLink?.()||
     st.uid!==uid||st.gid!==gid||modeBits(st)!==mode){
    fail(code);
  }
  return identity(st);
}
function openDirectoryAt(parentFd,name,uid,gid,mode,code){
  const path=procFdPath(parentFd,name);
  let fd=-1;
  try{
    fd=fs.openSync(path,fs.constants.O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC);
    requireDirectoryFd(fd,uid,gid,mode,code);
    return fd;
  }catch(error){
    if(fd>=0)try{fs.closeSync(fd);}catch{}
    if(error?.message===code)throw error;
    fail(code);
  }
}
function fsyncDirectory(fd,code){
  try{fs.fsyncSync(fd);}
  catch{fail(code);}
}
function stableReadFd(fd,maxBytes,code){
  let before,after,bytes;
  try{
    before=fs.fstatSync(fd);
    if(!before.isFile()||before.isSymbolicLink?.()||
       before.size<2||before.size>maxBytes)fail(code);
    bytes=fs.readFileSync(fd);
    after=fs.fstatSync(fd);
  }catch(error){
    if(error?.message===code)throw error;
    fail(code);
  }
  if(!sameIdentity(identity(before),identity(after))||bytes.length!==before.size){
    fail(code);
  }
  return Buffer.from(bytes);
}
function parseCanonicalRecordBytes(bytes,code){
  if(!Buffer.isBuffer(bytes)||bytes.length<3||bytes.length>MAX_RECORD_BYTES)fail(code);
  let text;
  try{text=new TextDecoder("utf-8",{fatal:true}).decode(bytes);}
  catch{fail(code);}
  if(!text.endsWith("\n")||text.slice(0,-1).includes("\n"))fail(code);
  let value;
  try{value=JSON.parse(text.slice(0,-1));}
  catch{fail(code);}
  const clone=clonePlain(value,code);
  if(!bytes.equals(recordBytes(clone)))fail(code);
  return clone;
}
function readRecordAt(dirFd,leaf,uid,gid,mode,code,{allowMissing=false}={}){
  const path=procFdPath(dirFd,leaf);
  let fd=-1;
  try{
    fd=fs.openSync(path,fs.constants.O_RDONLY|O_NOFOLLOW|O_CLOEXEC);
  }catch(error){
    if(allowMissing&&error?.code==="ENOENT")return null;
    fail(code);
  }
  try{
    const st=fs.fstatSync(fd);
    if(!st.isFile()||st.uid!==uid||st.gid!==gid||
       modeBits(st)!==mode||st.nlink!==1||st.size<3||st.size>MAX_RECORD_BYTES){
      fail(code);
    }
    const bytes=stableReadFd(fd,MAX_RECORD_BYTES,code);
    return Object.freeze({value:parseCanonicalRecordBytes(bytes,code),bytes,identity:identity(st)});
  }finally{
    try{fs.closeSync(fd);}catch{}
  }
}
function validateStoreGenerationRecordV2(input){
  const value=clonePlain(input,"apollyon_claim_store_impl_v2_generation_invalid");
  exactOwnKeys(
    value,
    VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_GENERATION_RECORD_KEYS_V2,
    "apollyon_claim_store_impl_v2_generation_invalid",
  );
  const policy=qualifyApollyonDurableAttemptClaimStorePolicyV2();
  if(
    value.marker!=="VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_GENERATION_V2"||
    value.version!==2||
    value.status!=="durable_attempt_claim_store_generation_v2"||
    value.store_policy_id!==policy.store_policy_id||
    !STORE_POLICY_ID.test(value.store_policy_id)||
    !STORE_GENERATION_ID.test(value.store_generation_id)||
    !HASH64.test(value.root_identity_sha256)||
    typeof value.genesis!=="boolean"||
    !Number.isSafeInteger(value.claim_history_count)||value.claim_history_count<0||
    !HASH64.test(value.claim_history_sha256)||
    !Number.isSafeInteger(value.generation_lineage_count)||
    value.generation_lineage_count<1||
    !HASH64.test(value.generation_lineage_sha256)||
    !CONTINUITY_RECEIPT_ID.test(value.continuity_receipt_id)||
    !STORE_GENERATION_RECORD_ID.test(value.store_generation_record_id)
  )fail("apollyon_claim_store_impl_v2_generation_invalid");
  if(value.genesis){
    if(value.predecessor_store_generation_id!==null){
      fail("apollyon_claim_store_impl_v2_generation_invalid");
    }
  }else if(!STORE_GENERATION_ID.test(value.predecessor_store_generation_id)){
    fail("apollyon_claim_store_impl_v2_generation_invalid");
  }
  const material=structuredClone(value);
  delete material.store_generation_record_id;
  const expected="apollyon_claim_store_generation_record_v2:"+
    sha256(Buffer.from(canonical(material),"utf8"));
  if(value.store_generation_record_id!==expected){
    fail("apollyon_claim_store_impl_v2_generation_id_invalid");
  }
  return Object.freeze(value);
}
function generationLeaf(generationId){
  const digest=idDigest(
    generationId,
    /^apollyon_claim_store_generation_v2:([0-9a-f]{64})$/u,
    "apollyon_claim_store_impl_v2_generation_id_invalid",
  );
  return "store-generation-v2-"+digest+".json";
}
function slotLeaf(slotId){
  return "authorization-slot-v1-"+
    idDigest(slotId,SLOT_ID,"apollyon_claim_store_impl_v2_slot_id_invalid")+
    ".json";
}
function claimLeaf(claimId){
  return "claim-v2-"+
    idDigest(claimId,CLAIM_RECORD_ID,"apollyon_claim_store_impl_v2_claim_id_invalid")+
    ".json";
}
function pendingPrefix(kind,digest){
  return "pending-"+safeLeaf(kind,"apollyon_claim_store_impl_v2_pending_kind_invalid")+
    "-"+safeLeaf(digest,"apollyon_claim_store_impl_v2_pending_digest_invalid")+"-";
}
function pendingLeaf(kind,digest){
  return pendingPrefix(kind,digest)+crypto.randomBytes(16).toString("hex")+".json";
}
function classifyLinkError(error){
  return error?.code==="EEXIST"?"exists":"error";
}
function reconcilePendingLink(targetDirFd,pendingDirFd,finalLeaf,kind,digest,uid,gid){
  const finalPath=procFdPath(targetDirFd,finalLeaf);
  let finalSt;
  try{finalSt=fs.lstatSync(finalPath);}
  catch(error){
    if(error?.code==="ENOENT")return false;
    fail("apollyon_claim_store_impl_v2_final_stat_failed");
  }
  if(!finalSt.isFile()||finalSt.isSymbolicLink()||
     finalSt.uid!==uid||finalSt.gid!==gid||
     modeBits(finalSt)!==RECORD_MODE||finalSt.nlink<1||finalSt.nlink>2){
    fail("apollyon_claim_store_impl_v2_final_metadata_invalid");
  }
  if(finalSt.nlink===1)return true;

  const prefix=pendingPrefix(kind,digest);
  let matches=[];
  for(const name of fs.readdirSync(procFdPath(pendingDirFd))){
    if(!name.startsWith(prefix))continue;
    const leaf=safeLeaf(name,"apollyon_claim_store_impl_v2_pending_entry_invalid");
    const path=procFdPath(pendingDirFd,leaf);
    const st=fs.lstatSync(path);
    if(st.dev===finalSt.dev&&st.ino===finalSt.ino){
      if(!st.isFile()||st.isSymbolicLink()||st.uid!==uid||st.gid!==gid||
         modeBits(st)!==RECORD_MODE||st.nlink!==2){
        fail("apollyon_claim_store_impl_v2_pending_metadata_invalid");
      }
      matches.push(leaf);
    }
  }
  if(matches.length!==1){
    fail("apollyon_claim_store_impl_v2_pending_recovery_ambiguous");
  }
  fs.unlinkSync(procFdPath(pendingDirFd,matches[0]));
  fsyncDirectory(pendingDirFd,"apollyon_claim_store_impl_v2_pending_cleanup_fsync_failed");
  finalSt=fs.lstatSync(finalPath);
  if(finalSt.nlink!==1){
    fail("apollyon_claim_store_impl_v2_pending_recovery_incomplete");
  }
  return true;
}
function publishExactRecord({
  targetDirFd,pendingDirFd,finalLeaf,kind,digest,bytes,uid,gid,
}){
  if(!Buffer.isBuffer(bytes)||bytes.length<3||bytes.length>MAX_RECORD_BYTES){
    fail("apollyon_claim_store_impl_v2_publish_bytes_invalid");
  }
  const existing=reconcilePendingLink(
    targetDirFd,pendingDirFd,finalLeaf,kind,digest,uid,gid
  );
  if(existing){
    const row=readRecordAt(
      targetDirFd,finalLeaf,uid,gid,RECORD_MODE,
      "apollyon_claim_store_impl_v2_existing_record_invalid"
    );
    if(!row.bytes.equals(bytes)){
      fail("apollyon_claim_store_impl_v2_existing_record_collision");
    }
    return Object.freeze({outcome:"existing_exact",bytes:row.bytes});
  }

  const pending=pendingLeaf(kind,digest);
  const pendingPath=procFdPath(pendingDirFd,pending);
  const finalPath=procFdPath(targetDirFd,finalLeaf);
  let pendingFd=-1;
  let linked=false;
  try{
    pendingFd=fs.openSync(
      pendingPath,
      fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|
        O_NOFOLLOW|O_CLOEXEC,
      RECORD_MODE,
    );
    fs.fchmodSync(pendingFd,RECORD_MODE);
    const st=fs.fstatSync(pendingFd);
    if(!st.isFile()||st.uid!==uid||st.gid!==gid||
       modeBits(st)!==RECORD_MODE||st.nlink!==1){
      fail("apollyon_claim_store_impl_v2_pending_metadata_invalid");
    }
    let offset=0;
    while(offset<bytes.length){
      const written=fs.writeSync(pendingFd,bytes,offset,bytes.length-offset,offset);
      if(written<=0)fail("apollyon_claim_store_impl_v2_pending_write_failed");
      offset+=written;
    }
    fs.fsyncSync(pendingFd);
    const reread=stableReadFd(pendingFd,MAX_RECORD_BYTES,
      "apollyon_claim_store_impl_v2_pending_reread_failed");
    if(!reread.equals(bytes)){
      fail("apollyon_claim_store_impl_v2_pending_bytes_mismatch");
    }
    try{
      fs.linkSync(pendingPath,finalPath);
      linked=true;
    }catch(error){
      if(classifyLinkError(error)!=="exists")throw error;
    }
    if(linked){
      fsyncDirectory(targetDirFd,"apollyon_claim_store_impl_v2_target_fsync_failed");
    }
  }catch(error){
    if(error?.message?.startsWith("apollyon_claim_store_impl_v2_"))throw error;
    if(linked){
      fail("apollyon_claim_store_impl_v2_indeterminate_after_publication");
    }
    fail("apollyon_claim_store_impl_v2_publication_failed");
  }finally{
    if(pendingFd>=0)try{fs.closeSync(pendingFd);}catch{}
  }

  try{
    fs.unlinkSync(pendingPath);
    fsyncDirectory(pendingDirFd,"apollyon_claim_store_impl_v2_pending_cleanup_fsync_failed");
  }catch(error){
    if(error?.code!=="ENOENT"){
      if(linked)fail("apollyon_claim_store_impl_v2_indeterminate_after_publication");
      fail("apollyon_claim_store_impl_v2_pending_cleanup_failed");
    }
  }

  const row=readRecordAt(
    targetDirFd,finalLeaf,uid,gid,RECORD_MODE,
    "apollyon_claim_store_impl_v2_final_record_invalid"
  );
  if(!row.bytes.equals(bytes)){
    fail("apollyon_claim_store_impl_v2_final_record_collision");
  }
  return Object.freeze({outcome:linked?"created":"existing_exact",bytes:row.bytes});
}
function readAndValidateCurrentGeneration(rootFd,generationDirFd,uid,gid,expected){
  const expectedValue=validateStoreGenerationRecordV2(expected);
  const active=readRecordAt(
    rootFd,
    VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.active_generation_leaf,
    uid,gid,RECORD_MODE,
    "apollyon_claim_store_impl_v2_active_generation_invalid",
  );
  const activeValue=validateStoreGenerationRecordV2(active.value);
  if(canonical(activeValue)!==canonical(expectedValue)){
    fail("apollyon_claim_store_impl_v2_active_generation_drift");
  }
  const immutable=readRecordAt(
    generationDirFd,generationLeaf(expectedValue.store_generation_id),
    uid,gid,RECORD_MODE,
    "apollyon_claim_store_impl_v2_generation_record_invalid",
  );
  const immutableValue=validateStoreGenerationRecordV2(immutable.value);
  if(!immutable.bytes.equals(active.bytes)||
     canonical(immutableValue)!==canonical(expectedValue)){
    fail("apollyon_claim_store_impl_v2_generation_record_drift");
  }
  return expectedValue;
}
function requireSlotMatchesRequest(slot,record,publishRequestSha){
  if(
    slot.store_policy_id!==record.store_policy_id||
    slot.authorization_id!==record.authorization_id||
    slot.store_contract_id!==record.store_contract_id||
    slot.store_generation_id!==record.store_generation_id||
    slot.terminal_receipt_id!==record.terminal_receipt_id||
    slot.claim_record_id!==record.claim_record_id||
    slot.claim_record_sha256!==sha256(recordBytes(record))||
    slot.publish_request_sha256!==publishRequestSha||
    slot.attempt_limit!==1||
    slot.automatic_retry_authorized!==false
  ){
    fail("apollyon_claim_store_impl_v2_slot_request_cross_binding_invalid");
  }
}
function revalidationExpected(stage,sessionBindingId,publishRequestSha,generation,slot,record){
  return Object.freeze({
    marker:"VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_LOCAL_REVALIDATION_V2",
    version:2,
    stage,
    session_binding_id:sessionBindingId,
    publish_request_sha256:publishRequestSha,
    store_generation_record_id:generation.store_generation_record_id,
    store_generation_id:generation.store_generation_id,
    authorization_slot_id:slot.authorization_slot_id,
    authorization_slot_record_id:slot.authorization_slot_record_id,
    claim_record_id:record.claim_record_id,
    local_revalidation_passed:true,
    source_contract_only:true,
    host_proven:false,
  });
}
function validateRevalidationReceipt(value,expected){
  const copy=clonePlain(value,"apollyon_claim_store_impl_v2_revalidation_receipt_invalid");
  exactOwnKeys(
    copy,Object.keys(expected),
    "apollyon_claim_store_impl_v2_revalidation_receipt_invalid"
  );
  if(!SESSION_BINDING_ID.test(copy.session_binding_id)||
     canonical(copy)!==canonical(expected)){
    fail("apollyon_claim_store_impl_v2_revalidation_receipt_invalid");
  }
  return Object.freeze(copy);
}
function callRevalidator(config,stage,context){
  let result;
  try{result=config.revalidate(stage,Object.freeze(structuredClone(context)));}
  catch(error){
    throw new Error(
      "apollyon_claim_store_impl_v2_revalidation_failed:"+stage+
      ":"+String(error?.message||error)
    );
  }
  if(result&&typeof result.then==="function"){
    fail("apollyon_claim_store_impl_v2_async_revalidator_forbidden");
  }
  return validateRevalidationReceipt(
    result,
    revalidationExpected(
      stage,config.session_binding_id,context.publish_request_sha256,
      context.generation,context.slot,context.record,
    ),
  );
}
function generationBracket(config,stage,context,rootFd,generationDirFd,uid,gid){
  readAndValidateCurrentGeneration(
    rootFd,generationDirFd,uid,gid,context.generation
  );
  callRevalidator(config,stage,context);
  readAndValidateCurrentGeneration(
    rootFd,generationDirFd,uid,gid,context.generation
  );
}
function createSuccessResponse(record,publishRequestSha,outcome){
  const response={
    marker:"VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_RESPONSE_V2",
    version:2,
    status:"durable_claim_success_v2",
    outcome,
    store_contract_id:record.store_contract_id,
    store_policy_id:record.store_policy_id,
    store_generation_id:record.store_generation_id,
    terminal_receipt_id:record.terminal_receipt_id,
    authorization_id:record.authorization_id,
    custody_generation_id:record.custody_generation_id,
    claim_record_id:record.claim_record_id,
    claim_record_sha256:sha256(recordBytes(record)),
    publish_request_sha256:publishRequestSha,
    durability_proven:true,
    final_visible_record_revalidated:true,
    training_start_admission:false,
    training_start_consumption_required:true,
    training_start_consumption_performed:false,
    next_gate:"apollyon_training_start_consumption_v1",
  };
  return qualifyApollyonDurableAttemptClaimSuccessResponseShapeV2({
    claim_record:record,
    publish_request_sha256:publishRequestSha,
    success_response:response,
  });
}

export function prepareApollyonDurableAttemptClaimPublisherForwardV2(input){
  if(!Buffer.isBuffer(input)){
    fail("apollyon_claim_store_impl_v2_publisher_input_invalid");
  }
  const bytes=Buffer.from(input);
  const parsed=parseApollyonDurableAttemptClaimPublishRequestBytesV2(bytes);
  return Object.freeze({
    marker:"VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_PUBLISHER_FORWARD_V2",
    version:2,
    status:"exact_validated_request_bytes_ready_for_forward",
    publish_request_sha256:parsed.publish_request_sha256,
    request:parsed.request,
    exact_request_bytes:Buffer.from(bytes),
    request_reconstructed:false,
    request_recanonicalized:false,
    argv_request_source:false,
    environment_request_source:false,
    stdin_request_source:false,
    filesystem_request_source:false,
    network_request_source:false,
  });
}

export function createApollyonDurableAttemptClaimStoreServiceCoreV2(config){
  const cfg=clonePlain(
    {
      root_fd:config?.root_fd,
      claim_uid:config?.claim_uid,
      claim_gid:config?.claim_gid,
      session_binding_id:config?.session_binding_id,
    },
    "apollyon_claim_store_impl_v2_config_invalid",
  );
  if(
    !Number.isSafeInteger(cfg.root_fd)||cfg.root_fd<0||
    !Number.isSafeInteger(cfg.claim_uid)||cfg.claim_uid<0||
    !Number.isSafeInteger(cfg.claim_gid)||cfg.claim_gid<0||
    !SESSION_BINDING_ID.test(cfg.session_binding_id)||
    typeof config?.withExclusiveStoreTransaction!=="function"||
    typeof config?.revalidate!=="function"
  )fail("apollyon_claim_store_impl_v2_config_invalid");

  const rootIdentity=requireDirectoryFd(
    cfg.root_fd,cfg.claim_uid,cfg.claim_gid,ROOT_MODE,
    "apollyon_claim_store_impl_v2_root_invalid",
  );

  function publishClaim(input){
    const snapshot=clonePlain(
      input,"apollyon_claim_store_impl_v2_publish_input_invalid"
    );
    exactOwnKeys(
      snapshot,
      ["authorization_slot_record","expected_store_generation_record","request_bytes"],
      "apollyon_claim_store_impl_v2_publish_input_invalid",
    );
    if(!Buffer.isBuffer(input.request_bytes)){
      fail("apollyon_claim_store_impl_v2_publish_input_invalid");
    }
    const requestBytes=Buffer.from(input.request_bytes);
    const parsed=parseApollyonDurableAttemptClaimPublishRequestBytesV2(requestBytes);
    const record=validateApollyonDurableAttemptClaimRecordEnvelopeV2(
      parsed.request.claim_record
    );
    const slot=validateApollyonDurableAttemptClaimAuthorizationSlotRecordV1(
      snapshot.authorization_slot_record
    );
    const generation=validateStoreGenerationRecordV2(
      snapshot.expected_store_generation_record
    );
    requireSlotMatchesRequest(slot,record,parsed.publish_request_sha256);
    if(
      generation.store_generation_id!==record.store_generation_id||
      generation.store_policy_id!==record.store_policy_id
    )fail("apollyon_claim_store_impl_v2_generation_request_cross_binding_invalid");

    let entered=0;
    const transaction=()=>{
      entered+=1;
      if(entered!==1)fail("apollyon_claim_store_impl_v2_transaction_reentry");
      const currentRoot=requireDirectoryFd(
        cfg.root_fd,cfg.claim_uid,cfg.claim_gid,ROOT_MODE,
        "apollyon_claim_store_impl_v2_root_invalid",
      );
      if(!sameIdentity(rootIdentity,currentRoot)){
        fail("apollyon_claim_store_impl_v2_root_generation_changed");
      }

      const generationDirFd=openDirectoryAt(
        cfg.root_fd,VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.generation_directory,
        cfg.claim_uid,cfg.claim_gid,DIRECTORY_MODE,
        "apollyon_claim_store_impl_v2_generation_directory_invalid",
      );
      const slotDirFd=openDirectoryAt(
        cfg.root_fd,VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.authorization_slot_directory,
        cfg.claim_uid,cfg.claim_gid,DIRECTORY_MODE,
        "apollyon_claim_store_impl_v2_slot_directory_invalid",
      );
      const claimDirFd=openDirectoryAt(
        cfg.root_fd,VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.claim_directory,
        cfg.claim_uid,cfg.claim_gid,DIRECTORY_MODE,
        "apollyon_claim_store_impl_v2_claim_directory_invalid",
      );
      const pendingDirFd=openDirectoryAt(
        cfg.root_fd,VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.pending_directory,
        cfg.claim_uid,cfg.claim_gid,DIRECTORY_MODE,
        "apollyon_claim_store_impl_v2_pending_directory_invalid",
      );
      let result;
      try{
        const context={
          publish_request_sha256:parsed.publish_request_sha256,
          generation,slot,record,
        };
        readAndValidateCurrentGeneration(
          cfg.root_fd,generationDirFd,cfg.claim_uid,cfg.claim_gid,generation
        );

        const slotFinal=slotLeaf(slot.authorization_slot_id);
        const claimFinal=claimLeaf(record.claim_record_id);
        const slotDigest=idDigest(
          slot.authorization_slot_id,SLOT_ID,
          "apollyon_claim_store_impl_v2_slot_id_invalid"
        );
        const claimDigest=idDigest(
          record.claim_record_id,CLAIM_RECORD_ID,
          "apollyon_claim_store_impl_v2_claim_id_invalid"
        );

        const preClaim=readRecordAt(
          claimDirFd,claimFinal,cfg.claim_uid,cfg.claim_gid,RECORD_MODE,
          "apollyon_claim_store_impl_v2_preexisting_claim_invalid",
          {allowMissing:true},
        );
        const preSlot=readRecordAt(
          slotDirFd,slotFinal,cfg.claim_uid,cfg.claim_gid,RECORD_MODE,
          "apollyon_claim_store_impl_v2_preexisting_slot_invalid",
          {allowMissing:true},
        );
        if(preClaim!==null&&preSlot===null){
          fail("apollyon_claim_store_impl_v2_orphan_claim_without_slot");
        }

        generationBracket(
          config,"before_slot_publication",context,
          cfg.root_fd,generationDirFd,cfg.claim_uid,cfg.claim_gid
        );

        const slotPublication=publishExactRecord({
          targetDirFd:slotDirFd,pendingDirFd,
          finalLeaf:slotFinal,kind:"slot",digest:slotDigest,
          bytes:recordBytes(slot),uid:cfg.claim_uid,gid:cfg.claim_gid,
        });
        const persistedSlot=readRecordAt(
          slotDirFd,slotFinal,cfg.claim_uid,cfg.claim_gid,RECORD_MODE,
          "apollyon_claim_store_impl_v2_persisted_slot_invalid"
        );
        const persistedSlotValue=
          validateApollyonDurableAttemptClaimAuthorizationSlotRecordV1(
            persistedSlot.value
          );
        requireSlotMatchesRequest(
          persistedSlotValue,record,parsed.publish_request_sha256
        );

        generationBracket(
          config,"after_slot_before_claim",context,
          cfg.root_fd,generationDirFd,cfg.claim_uid,cfg.claim_gid
        );

        const claimPublication=publishExactRecord({
          targetDirFd:claimDirFd,pendingDirFd,
          finalLeaf:claimFinal,kind:"claim",digest:claimDigest,
          bytes:recordBytes(record),uid:cfg.claim_uid,gid:cfg.claim_gid,
        });
        const persistedClaim=readRecordAt(
          claimDirFd,claimFinal,cfg.claim_uid,cfg.claim_gid,RECORD_MODE,
          "apollyon_claim_store_impl_v2_persisted_claim_invalid"
        );
        const persistedRecord=validateApollyonDurableAttemptClaimRecordEnvelopeV2(
          persistedClaim.value
        );
        if(canonical(persistedRecord)!==canonical(record)){
          fail("apollyon_claim_store_impl_v2_persisted_claim_mismatch");
        }

        generationBracket(
          config,"before_success_ack",context,
          cfg.root_fd,generationDirFd,cfg.claim_uid,cfg.claim_gid
        );

        const outcome=claimPublication.outcome==="created"
          ?"created_durable"
          :"recovered_existing_exact_durable";
        const success=createSuccessResponse(
          record,parsed.publish_request_sha256,outcome
        );
        result=Object.freeze({
          marker:VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_SERVICE_SOURCE_IMPLEMENTATION_V2,
          version:2,
          status:"store_core_transaction_complete_source_only",
          physical_layout:VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2,
          slot_publication_outcome:slotPublication.outcome,
          claim_publication_outcome:claimPublication.outcome,
          success_response:success,
          source_core_filesystem_mutation_performed:true,
          production_claim_store_mutation_performed:false,
          production_durable_attempt_claim_performed:false,
          host_provenance_performed:false,
          kernel_peer_authentication_performed:false,
          next_gate:"apollyon_durable_attempt_claim_store_service_runtime_integration_v2",
          authority:
            VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_SERVICE_SOURCE_IMPLEMENTATION_AUTHORITY_V2,
        });
      }finally{
        for(const fd of [pendingDirFd,claimDirFd,slotDirFd,generationDirFd]){
          try{fs.closeSync(fd);}catch{}
        }
      }
      return result;
    };

    let result;
    try{result=config.withExclusiveStoreTransaction(transaction);}
    catch(error){
      if(error?.message?.startsWith("apollyon_claim_store_impl_v2_"))throw error;
      throw new Error(
        "apollyon_claim_store_impl_v2_transaction_wrapper_failed:"+
        String(error?.message||error)
      );
    }
    if(result&&typeof result.then==="function"){
      fail("apollyon_claim_store_impl_v2_async_transaction_forbidden");
    }
    if(entered!==1){
      fail("apollyon_claim_store_impl_v2_transaction_not_exactly_once");
    }
    return result;
  }

  return Object.freeze({
    marker:VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_SERVICE_SOURCE_IMPLEMENTATION_V2,
    version:2,
    status:"store_service_core_source_ready_host_integration_unproven",
    root_identity:rootIdentity,
    physical_layout:VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2,
    publishClaim,
    host_provenance_performed:false,
    native_peer_runtime_integration_present:false,
    authority:
      VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_SERVICE_SOURCE_IMPLEMENTATION_AUTHORITY_V2,
  });
}
