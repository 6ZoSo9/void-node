#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import {types} from "node:util";

import {
  canonicalApollyonClaimContractJsonV1,
} from "./apollyon-candidate-training-attempt-claim-contract-v1.mjs";
import {
  parseApollyonDurableAttemptClaimPublishRequestBytesV2,
  validateApollyonDurableAttemptClaimRecordEnvelopeV2,
} from "./apollyon-durable-attempt-claim-request-envelope-v2.mjs";
import {
  deriveApollyonDurableAttemptClaimAuthorizationSlotIdV1,
  validateApollyonDurableAttemptClaimAuthorizationSlotRecordV1,
} from "./apollyon-durable-attempt-claim-authorization-slot-v1.mjs";
import {
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_GENERATION_RECORD_KEYS_V2,
  qualifyApollyonDurableAttemptClaimStorePolicyV2,
  qualifyApollyonDurableAttemptClaimSuccessResponseShapeV2,
} from "./apollyon-durable-attempt-claim-store-contract-v2.mjs";

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_SERVICE_SOURCE_IMPLEMENTATION_V2 =
  "VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_SERVICE_SOURCE_IMPLEMENTATION_V2";
export const VOID_APOLLYON_AUTHORIZATION_WINNER_OBSERVATION_V1 =
  "VOID_APOLLYON_AUTHORIZATION_WINNER_OBSERVATION_V1";

export const PARENT_AUTHORIZATION_SLOT_BLOB_SHA1 =
  "c2ff992a09fe916a5016b5a6c4ceced4ab1d2fa8";
export const REQUEST_ENVELOPE_BLOB_SHA1 =
  "339916ce4a6216af9a73476ad5b78e2d7a300f73";
export const STORE_CONTRACT_BLOB_SHA1 =
  "6e3e5a80b3f481f98aced9b33e3f2ec66ec96bbe";
export const STORE_SERVICE_CANDIDATE_BLOB_SHA1 =
  "87019ae1245a2054407dd47835b0b7a891d4d9a2";
export const NATIVE_PEER_INTEGRATION_BLOB_SHA1 =
  "5532d18603ab9b4f400082c6fac265c58672ed85";

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
    publisher_forward_bytes_privately_owned:true,
    fixed_physical_namespace_defined:true,
    non_root_claim_identity_required:true,
    create_only_slot_publication_implemented:true,
    create_only_claim_publication_implemented:true,
    private_pending_fsync_publication_implemented:true,
    directory_fsync_implemented:true,
    exact_reread_implemented:true,
    descriptor_bound_record_reads_implemented:true,
    transaction_namespace_revalidation_implemented:true,
    operation_owned_root_descriptor_implemented:true,
    readonly_authorization_winner_observation_implemented:true,
    crash_recovery_exact_pending_link_cleanup_implemented:true,
    stale_unlinked_pending_recovery_implemented:true,
    transaction_lease_acquired_before_core_mutation:true,
    transaction_body_private:true,
    transaction_reentry_guard_implemented:true,
    transaction_release_synchronous_required:true,
    cleanup_failures_reported:true,
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
const O_NONBLOCK=fs.constants.O_NONBLOCK??0;
const O_CLOEXEC=fs.constants.O_CLOEXEC??0;
const COPY_BYTES=Buffer.prototype.copy;
const ALLOC_BYTES=Buffer.alloc;
const APPLY=Reflect.apply;
const PROMISE_THEN=Promise.prototype.then;
const CLEANUP_RECORDS=new WeakMap();

function storeError(code,cause){
  const error=new Error(code,cause===undefined?undefined:{cause});
  error.code=code;
  return error;
}
function fail(code){throw storeError(code);}
function errorField(error,key){
  if(!error||(typeof error!=="object"&&typeof error!=="function")||types.isProxy(error)){
    return undefined;
  }
  const descriptor=Object.getOwnPropertyDescriptor(error,key);
  return descriptor&&Object.hasOwn(descriptor,"value")?descriptor.value:undefined;
}
function observeRejectedPromise(value,code){
  if(!types.isPromise(value))return;
  // Observe native rejection without dispatching a caller-supplied .then method.
  try{APPLY(PROMISE_THEN,value,[undefined,()=>undefined]);}
  catch(error){throw storeError(code,error);}
}
function withCleanup(operation,cleanups,code){
  let result,primaryError;
  let failed=false;
  try{result=operation();}
  catch(error){failed=true;primaryError=error;}
  const failures=[];
  let firstCleanupError;
  for(let index=cleanups.length-1;index>=0;index-=1){
    const cleanup=cleanups[index];
    try{cleanup.run();}
    catch(error){
      if(failures.length===0)firstCleanupError=error;
      const candidateCode=errorField(error,"code");
      const errorCode=typeof candidateCode==="string"&&
        /^(?:E[A-Z0-9_]{1,31}|apollyon_claim_store_impl_v2_[a-z0-9_]{1,96})$/u.test(candidateCode)
        ?candidateCode:null;
      failures.push(Object.freeze({code:cleanup.code,role:cleanup.role,error_code:errorCode}));
    }
  }
  if(failures.length===0){
    if(failed)throw primaryError;
    return result;
  }
  const candidateMessage=errorField(primaryError,"message");
  const primaryMessage=typeof candidateMessage==="string"
    ?candidateMessage:"apollyon_claim_store_impl_v2_operation_failed";
  const error=storeError(failed?primaryMessage:code,failed?primaryError:firstCleanupError);
  const primaryCode=errorField(primaryError,"code");
  if(failed&&typeof primaryCode==="string")error.code=primaryCode;
  error.cleanup_errors=Object.freeze([
    ...(CLEANUP_RECORDS.get(primaryError)??[]),
    ...failures,
  ]);
  CLEANUP_RECORDS.set(error,error.cleanup_errors);
  throw error;
}
function closeCleanup(fd,role){
  return {
    code:"apollyon_claim_store_impl_v2_descriptor_close_failed",
    role,
    // Never retry close: an error does not establish that the FD is still owned.
    run(){fs.closeSync(fd);},
  };
}
function freezePlainTree(value){
  if(value&&typeof value==="object"){
    for(const child of Object.values(value))freezePlainTree(child);
    Object.freeze(value);
  }
  return value;
}
function validateTransactionLease(lease){
  const code="apollyon_claim_store_impl_v2_transaction_lease_invalid";
  if(!lease||typeof lease!=="object"||types.isProxy(lease))fail(code);
  if(types.isPromise(lease)){
    observeRejectedPromise(
      lease,"apollyon_claim_store_impl_v2_async_transaction_acquisition_forbidden"
    );
    fail("apollyon_claim_store_impl_v2_async_transaction_acquisition_forbidden");
  }
  const proto=Object.getPrototypeOf(lease);
  if(proto!==Object.prototype&&proto!==null)fail(code);
  const keys=Reflect.ownKeys(lease);
  if(keys.length!==1||keys[0]!=="release")fail(code);
  const descriptor=Object.getOwnPropertyDescriptor(lease,"release");
  if(!descriptor?.enumerable||!Object.hasOwn(descriptor,"value"))fail(code);
  const release=descriptor.value;
  if(typeof release!=="function"||types.isProxy(release)||
     types.isAsyncFunction(release)||types.isGeneratorFunction(release))fail(code);
  return {lease,release};
}
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
function exactDataInput(input,keys,code){
  if(!input||typeof input!=="object"||types.isProxy(input)||Array.isArray(input))fail(code);
  const proto=Object.getPrototypeOf(input);
  if(proto!==Object.prototype&&proto!==null)fail(code);
  const descriptors=Object.getOwnPropertyDescriptors(input);
  if(Reflect.ownKeys(descriptors).length!==keys.length)fail(code);
  const snapshot={};
  for(const key of keys){
    const descriptor=descriptors[key];
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,"value"))fail(code);
    snapshot[key]=descriptor.value;
  }
  return snapshot;
}
function copyRequestBytes(input,code){
  if(types.isProxy(input)||!Buffer.isBuffer(input))fail(code);
  const bytes=ALLOC_BYTES(input.length);
  APPLY(COPY_BYTES,input,[bytes]);
  return bytes;
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
function requireBackend(){
  if(process.platform!=="linux"||O_DIRECTORY===0||O_NOFOLLOW===0||O_NONBLOCK===0){
    fail("apollyon_claim_store_impl_v2_backend_unsupported");
  }
}
function modeBits(st){return Number(st.mode&0o7777n);}
function identity(st){
  // Preserve the persisted v1 root scheme; transient timestamps are kept separately.
  // BigInt stat prevents loss of inode/device identity before decimal serialization.
  for(const key of ["dev","ino","mode","uid","gid","nlink","size"]){
    if(typeof st[key]!=="bigint"){
      fail("apollyon_claim_store_impl_v2_stat_identity_invalid");
    }
  }
  for(const key of ["uid","gid","nlink","size"]){
    if(st[key]<0n||st[key]>BigInt(Number.MAX_SAFE_INTEGER)){
      fail("apollyon_claim_store_impl_v2_stat_identity_invalid");
    }
  }
  return Object.freeze({
    dev:String(st.dev),ino:String(st.ino),mode:modeBits(st),
    uid:Number(st.uid),gid:Number(st.gid),nlink:Number(st.nlink),size:Number(st.size),
  });
}
function transientIdentity(st){
  if(typeof st.mtimeNs!=="bigint"||typeof st.ctimeNs!=="bigint"){
    fail("apollyon_claim_store_impl_v2_stat_identity_invalid");
  }
  return Object.freeze({
    ...identity(st),mtime_ns:String(st.mtimeNs),ctime_ns:String(st.ctimeNs),
  });
}
function sameIdentity(a,b){
  return a.dev===b.dev&&a.ino===b.ino&&a.mode===b.mode&&
    a.uid===b.uid&&a.gid===b.gid&&a.nlink===b.nlink&&a.size===b.size;
}
function sameTransientIdentity(a,b){
  return sameIdentity(a,b)&&a.mtime_ns===b.mtime_ns&&a.ctime_ns===b.ctime_ns;
}
function sameDirectoryIdentity(a,b){
  // Publication changes child-directory length and timestamps, but never its binding.
  return a.dev===b.dev&&a.ino===b.ino&&a.mode===b.mode&&
    a.uid===b.uid&&a.gid===b.gid&&a.nlink===b.nlink;
}
function directoryIdentity(st,uid,gid,mode,code){
  if(!st.isDirectory()||st.uid!==BigInt(uid)||st.gid!==BigInt(gid)||
     modeBits(st)!==mode)fail(code);
  return transientIdentity(st);
}
function directoryFdIdentity(fd,uid,gid,mode,code){
  let st;
  try{st=fs.fstatSync(fd,{bigint:true});}
  catch{fail(code);}
  return directoryIdentity(st,uid,gid,mode,code);
}
function requireDirectoryFd(fd,uid,gid,mode,code){
  const {mtime_ns,ctime_ns,...persisted}=directoryFdIdentity(fd,uid,gid,mode,code);
  return Object.freeze(persisted);
}
function requireDirectoryBinding(observation,strict){
  const {fd,parentFd,leaf,uid,gid,mode,code,snapshot}=observation;
  const current=directoryFdIdentity(fd,uid,gid,mode,code);
  if(!(strict?sameTransientIdentity(current,snapshot):sameDirectoryIdentity(current,snapshot))){
    fail(code);
  }
  if(parentFd!==null){
    let visible;
    try{visible=fs.lstatSync(procFdPath(parentFd,leaf),{bigint:true});}
    catch{fail(code);}
    if(!sameTransientIdentity(current,directoryIdentity(visible,uid,gid,mode,code))){
      fail(code);
    }
    if(!sameTransientIdentity(current,directoryFdIdentity(fd,uid,gid,mode,code))){
      fail(code);
    }
  }
}
function openDirectoryAt(parentFd,name,uid,gid,mode,code,bindingCode){
  const path=procFdPath(parentFd,name);
  let fd=-1;
  try{
    fd=fs.openSync(path,fs.constants.O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC);
    const snapshot=directoryFdIdentity(fd,uid,gid,mode,code);
    const observation={fd,parentFd,leaf:name,uid,gid,mode,code:bindingCode,snapshot};
    requireDirectoryBinding(observation,true);
    return observation;
  }catch(error){
    const message=errorField(error,"message");
    const primary=message===code||message===bindingCode?error:storeError(code,error);
    return withCleanup(
      ()=>{throw primary;},
      fd>=0?[closeCleanup(fd,"rejected_directory")]:[],
      "apollyon_claim_store_impl_v2_descriptor_cleanup_failed",
    );
  }
}
function ownRootDirectory(config,retainedIdentity,cleanups,role){
  const code="apollyon_claim_store_impl_v2_root_duplication_failed";
  const before=directoryFdIdentity(
    config.root_fd,config.claim_uid,config.claim_gid,ROOT_MODE,
    "apollyon_claim_store_impl_v2_root_invalid",
  );
  if(!sameIdentity(before,retainedIdentity)){
    fail("apollyon_claim_store_impl_v2_root_generation_changed");
  }
  let fd;
  try{
    // This is the one intentional procfs FD dereference, never a caller pathname.
    fd=fs.openSync(procFdPath(config.root_fd),fs.constants.O_RDONLY|O_DIRECTORY|O_CLOEXEC);
  }catch(error){throw storeError(code,error);}
  cleanups.push(closeCleanup(fd,role));
  const snapshot=directoryFdIdentity(fd,config.claim_uid,config.claim_gid,ROOT_MODE,code);
  const after=directoryFdIdentity(
    config.root_fd,config.claim_uid,config.claim_gid,ROOT_MODE,code,
  );
  if(!sameTransientIdentity(before,snapshot)||!sameTransientIdentity(before,after))fail(code);
  return {
    fd,parentFd:null,leaf:null,uid:config.claim_uid,gid:config.claim_gid,mode:ROOT_MODE,
    code:"apollyon_claim_store_impl_v2_root_directory_binding_changed",snapshot,
  };
}
function fsyncDirectory(fd,code){
  try{fs.fsyncSync(fd);}
  catch{fail(code);}
}
function stableReadFd(fd,maxBytes,code,expectedIdentity){
  let before,after,bytes;
  try{
    before=fs.fstatSync(fd,{bigint:true});
    if(!before.isFile()||before.size<3n||before.size>BigInt(maxBytes)||
       !sameTransientIdentity(expectedIdentity,transientIdentity(before)))fail(code);
    bytes=ALLOC_BYTES(Number(before.size));
    let offset=0;
    while(offset<bytes.length){
      const got=fs.readSync(fd,bytes,offset,bytes.length-offset,offset);
      if(got<=0)fail(code);
      offset+=got;
    }
    // A length-limited successful read alone is not proof that the file ended there.
    const eofProbe=ALLOC_BYTES(1);
    if(fs.readSync(fd,eofProbe,0,1,bytes.length)!==0)fail(code);
    after=fs.fstatSync(fd,{bigint:true});
  }catch(error){
    if(errorField(error,"message")===code)throw error;
    throw storeError(code,error);
  }
  if(!after.isFile()||!sameTransientIdentity(expectedIdentity,transientIdentity(after))||
     BigInt(bytes.length)!==before.size){
    fail(code);
  }
  return bytes;
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
function recordIdentity(st,uid,gid,mode,code,links=1n){
  if(!st.isFile()||st.uid!==BigInt(uid)||st.gid!==BigInt(gid)||
     modeBits(st)!==mode||st.nlink!==links||st.size<3n||st.size>BigInt(MAX_RECORD_BYTES)){
    fail(code);
  }
  return transientIdentity(st);
}
function requireRecordBinding(observation){
  const {fd,dirFd,leaf,uid,gid,mode,code,snapshot}=observation;
  try{
    const held=recordIdentity(fs.fstatSync(fd,{bigint:true}),uid,gid,mode,code);
    const visible=recordIdentity(
      fs.lstatSync(procFdPath(dirFd,leaf),{bigint:true}),uid,gid,mode,code,
    );
    const after=recordIdentity(fs.fstatSync(fd,{bigint:true}),uid,gid,mode,code);
    if(!sameTransientIdentity(snapshot,held)||!sameTransientIdentity(snapshot,visible)||
       !sameTransientIdentity(snapshot,after))fail(code);
  }catch(error){
    if(errorField(error,"message")===code)throw error;
    throw storeError(code,error);
  }
}
function holdRecordAt(dirFd,leaf,uid,gid,mode,code,cleanups,{allowMissing=false}={}){
  const path=procFdPath(dirFd,leaf);
  let fd=-1;
  try{
    // Nonblocking open lets metadata validation reject a FIFO without waiting for a writer.
    fd=fs.openSync(path,fs.constants.O_RDONLY|O_NOFOLLOW|O_NONBLOCK|O_CLOEXEC);
  }catch(error){
    if(allowMissing&&error?.code==="ENOENT")return null;
    fail(code);
  }
  cleanups.push(closeCleanup(fd,"record"));
  let snapshot;
  try{snapshot=recordIdentity(fs.fstatSync(fd,{bigint:true}),uid,gid,mode,code);}
  catch(error){throw storeError(code,error);}
  const observation={fd,dirFd,leaf,uid,gid,mode,code,snapshot};
  const bytes=stableReadFd(fd,MAX_RECORD_BYTES,code,snapshot);
  requireRecordBinding(observation);
  return {...observation,bytes,value:parseCanonicalRecordBytes(bytes,code),identity:snapshot};
}
function rereadHeldRecord(observation){
  const bytes=stableReadFd(
    observation.fd,MAX_RECORD_BYTES,observation.code,observation.snapshot,
  );
  if(!bytes.equals(observation.bytes))fail(observation.code);
  requireRecordBinding(observation);
}
function readRecordAt(dirFd,leaf,uid,gid,mode,code,options={}){
  const cleanups=[];
  return withCleanup(()=>{
    const observation=holdRecordAt(dirFd,leaf,uid,gid,mode,code,cleanups,options);
    return observation===null?null:Object.freeze({
      value:observation.value,bytes:observation.bytes,identity:observation.identity,
    });
  },cleanups,"apollyon_claim_store_impl_v2_descriptor_cleanup_failed");
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
  try{finalSt=fs.lstatSync(finalPath,{bigint:true});}
  catch(error){
    if(error?.code==="ENOENT")return false;
    fail("apollyon_claim_store_impl_v2_final_stat_failed");
  }
  if(!finalSt.isFile()||finalSt.isSymbolicLink()||
     finalSt.uid!==BigInt(uid)||finalSt.gid!==BigInt(gid)||
     modeBits(finalSt)!==RECORD_MODE||finalSt.nlink<1n||finalSt.nlink>2n){
    fail("apollyon_claim_store_impl_v2_final_metadata_invalid");
  }
  if(finalSt.nlink===1n)return true;

  const prefix=pendingPrefix(kind,digest);
  let matches=[];
  for(const name of fs.readdirSync(procFdPath(pendingDirFd))){
    if(!name.startsWith(prefix))continue;
    const leaf=safeLeaf(name,"apollyon_claim_store_impl_v2_pending_entry_invalid");
    const path=procFdPath(pendingDirFd,leaf);
    const st=fs.lstatSync(path,{bigint:true});
    if(st.dev===finalSt.dev&&st.ino===finalSt.ino){
      if(!st.isFile()||st.isSymbolicLink()||st.uid!==BigInt(uid)||st.gid!==BigInt(gid)||
         modeBits(st)!==RECORD_MODE||st.nlink!==2n){
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
  finalSt=fs.lstatSync(finalPath,{bigint:true});
  if(finalSt.nlink!==1n){
    fail("apollyon_claim_store_impl_v2_pending_recovery_incomplete");
  }
  return true;
}

function cleanupUnlinkedPending(
  pendingDirFd,kind,digest,expectedBytes,uid,gid
){
  const prefix=pendingPrefix(kind,digest);
  const matches=fs.readdirSync(procFdPath(pendingDirFd))
    .filter(name=>name.startsWith(prefix));
  if(matches.length>32){
    fail("apollyon_claim_store_impl_v2_stale_pending_excessive");
  }
  let removed=0;
  for(const name of matches){
    const leaf=safeLeaf(
      name,"apollyon_claim_store_impl_v2_stale_pending_entry_invalid"
    );
    const pathname=procFdPath(pendingDirFd,leaf);
    const cleanups=[];
    withCleanup(()=>{
      const st=fs.lstatSync(pathname,{bigint:true});
      if(
        !st.isFile()||st.isSymbolicLink()||
        st.uid!==BigInt(uid)||st.gid!==BigInt(gid)||
        modeBits(st)!==RECORD_MODE||st.nlink!==1n||
        st.size!==BigInt(expectedBytes.length)
      ){
        fail("apollyon_claim_store_impl_v2_stale_pending_metadata_invalid");
      }
      const snapshot=transientIdentity(st);
      const fd=fs.openSync(pathname,fs.constants.O_RDONLY|O_NOFOLLOW|O_NONBLOCK|O_CLOEXEC);
      cleanups.push(closeCleanup(fd,"stale_pending"));
      const observed=stableReadFd(
        fd,MAX_RECORD_BYTES,
        "apollyon_claim_store_impl_v2_stale_pending_reread_failed",snapshot,
      );
      if(!observed.equals(expectedBytes)){
        fail("apollyon_claim_store_impl_v2_stale_pending_bytes_mismatch");
      }
      requireRecordBinding({
        fd,dirFd:pendingDirFd,leaf,uid,gid,mode:RECORD_MODE,snapshot,
        code:"apollyon_claim_store_impl_v2_stale_pending_reread_failed",
      });
    },cleanups,"apollyon_claim_store_impl_v2_descriptor_cleanup_failed");
    fs.unlinkSync(pathname);
    removed+=1;
  }
  if(removed>0){
    fsyncDirectory(
      pendingDirFd,
      "apollyon_claim_store_impl_v2_stale_pending_cleanup_fsync_failed"
    );
  }
  return removed;
}
function recoverExactRecord(targetDirFd,finalLeaf,bytes,uid,gid){
  const cleanups=[];
  return withCleanup(()=>{
    const row=holdRecordAt(
      targetDirFd,finalLeaf,uid,gid,RECORD_MODE,
      "apollyon_claim_store_impl_v2_existing_record_invalid",cleanups,
    );
    if(!row.bytes.equals(bytes))fail("apollyon_claim_store_impl_v2_existing_record_collision");
    // Existing bytes alone do not establish that this inode/name was made durable.
    // In particular, a previously refused publication may have left a substituted leaf.
    try{fs.fsyncSync(row.fd);}
    catch(error){throw storeError("apollyon_claim_store_impl_v2_existing_record_fsync_failed",error);}
    fsyncDirectory(targetDirFd,"apollyon_claim_store_impl_v2_target_fsync_failed");
    rereadHeldRecord(row);
    return Object.freeze({outcome:"existing_exact",bytes:row.bytes,identity:row.identity});
  },cleanups,"apollyon_claim_store_impl_v2_descriptor_cleanup_failed");
}
function requirePublishedRecordBinding(fd,targetDirFd,finalLeaf,fsynced,uid,gid,links){
  const code="apollyon_claim_store_impl_v2_published_record_binding_changed";
  try{
    const held=recordIdentity(fs.fstatSync(fd,{bigint:true}),uid,gid,RECORD_MODE,code,links);
    // Link/unlink changes nlink and ctime; it cannot replace the inode or file data.
    if(!sameIdentity({...fsynced,nlink:Number(links)},held)||fsynced.mtime_ns!==held.mtime_ns){
      fail(code);
    }
    const visible=recordIdentity(
      fs.lstatSync(procFdPath(targetDirFd,finalLeaf),{bigint:true}),
      uid,gid,RECORD_MODE,code,links,
    );
    const after=recordIdentity(fs.fstatSync(fd,{bigint:true}),uid,gid,RECORD_MODE,code,links);
    if(!sameTransientIdentity(held,visible)||!sameTransientIdentity(held,after))fail(code);
    return held;
  }catch(error){
    if(errorField(error,"message")===code)throw error;
    throw storeError(code,error);
  }
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
    return recoverExactRecord(targetDirFd,finalLeaf,bytes,uid,gid);
  }

  cleanupUnlinkedPending(
    pendingDirFd,kind,digest,bytes,uid,gid
  );

  const pending=pendingLeaf(kind,digest);
  const pendingPath=procFdPath(pendingDirFd,pending);
  const finalPath=procFdPath(targetDirFd,finalLeaf);
  let pendingFd=-1;
  let linked=false;
  let fsynced;
  const cleanups=[];
  return withCleanup(()=>{
    try{
      pendingFd=fs.openSync(
        pendingPath,
        fs.constants.O_RDWR|fs.constants.O_CREAT|fs.constants.O_EXCL|
          O_NOFOLLOW|O_CLOEXEC,
        RECORD_MODE,
      );
      cleanups.push(closeCleanup(pendingFd,"pending_record"));
      fs.fchmodSync(pendingFd,RECORD_MODE);
      const st=fs.fstatSync(pendingFd,{bigint:true});
      if(!st.isFile()||st.uid!==BigInt(uid)||st.gid!==BigInt(gid)||
         modeBits(st)!==RECORD_MODE||st.nlink!==1n||st.size!==0n){
        fail("apollyon_claim_store_impl_v2_pending_metadata_invalid");
      }
      let offset=0;
      while(offset<bytes.length){
        const written=fs.writeSync(pendingFd,bytes,offset,bytes.length-offset,offset);
        if(written<=0)fail("apollyon_claim_store_impl_v2_pending_write_failed");
        offset+=written;
      }
      fs.fsyncSync(pendingFd);
      const snapshot=recordIdentity(
        fs.fstatSync(pendingFd,{bigint:true}),uid,gid,RECORD_MODE,
        "apollyon_claim_store_impl_v2_pending_reread_failed",
      );
      if(snapshot.dev!==String(st.dev)||snapshot.ino!==String(st.ino)){
        fail("apollyon_claim_store_impl_v2_pending_reread_failed");
      }
      fsynced=snapshot;
      const reread=stableReadFd(pendingFd,MAX_RECORD_BYTES,
        "apollyon_claim_store_impl_v2_pending_reread_failed",snapshot);
      if(!reread.equals(bytes)){
        fail("apollyon_claim_store_impl_v2_pending_bytes_mismatch");
      }
      requireRecordBinding({
        fd:pendingFd,dirFd:pendingDirFd,leaf:pending,uid,gid,mode:RECORD_MODE,snapshot,
        code:"apollyon_claim_store_impl_v2_pending_reread_failed",
      });
      try{
        fs.linkSync(pendingPath,finalPath);
        linked=true;
      }catch(error){
        if(classifyLinkError(error)!=="exists")throw error;
      }
      if(linked){
        requirePublishedRecordBinding(
          pendingFd,targetDirFd,finalLeaf,fsynced,uid,gid,2n,
        );
        fsyncDirectory(targetDirFd,"apollyon_claim_store_impl_v2_target_fsync_failed");
      }
    }catch(error){
      if(error?.message?.startsWith("apollyon_claim_store_impl_v2_"))throw error;
      if(linked){
        fail("apollyon_claim_store_impl_v2_indeterminate_after_publication");
      }
      fail("apollyon_claim_store_impl_v2_publication_failed");
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
    if(!linked)return recoverExactRecord(targetDirFd,finalLeaf,bytes,uid,gid);
    const row=readRecordAt(
      targetDirFd,finalLeaf,uid,gid,RECORD_MODE,
      "apollyon_claim_store_impl_v2_final_record_invalid",
    );
    if(!row.bytes.equals(bytes))fail("apollyon_claim_store_impl_v2_final_record_collision");
    const published=requirePublishedRecordBinding(
      pendingFd,targetDirFd,finalLeaf,fsynced,uid,gid,1n,
    );
    if(!sameTransientIdentity(row.identity,published)){
      fail("apollyon_claim_store_impl_v2_published_record_binding_changed");
    }
    return Object.freeze({outcome:"created",bytes:row.bytes,identity:published});
  },cleanups,"apollyon_claim_store_impl_v2_descriptor_cleanup_failed");
}
function holdCurrentGeneration(rootFd,generationDirFd,uid,gid,expected,cleanups){
  const expectedValue=validateStoreGenerationRecordV2(expected);
  const active=holdRecordAt(
    rootFd,
    VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.active_generation_leaf,
    uid,gid,RECORD_MODE,
    "apollyon_claim_store_impl_v2_active_generation_invalid",cleanups,
  );
  const activeValue=validateStoreGenerationRecordV2(active.value);
  if(canonical(activeValue)!==canonical(expectedValue)){
    fail("apollyon_claim_store_impl_v2_active_generation_drift");
  }
  const immutable=holdRecordAt(
    generationDirFd,generationLeaf(expectedValue.store_generation_id),
    uid,gid,RECORD_MODE,
    "apollyon_claim_store_impl_v2_generation_record_invalid",cleanups,
  );
  const immutableValue=validateStoreGenerationRecordV2(immutable.value);
  if(!immutable.bytes.equals(active.bytes)||
     canonical(immutableValue)!==canonical(expectedValue)){
    fail("apollyon_claim_store_impl_v2_generation_record_drift");
  }
  return [active,immutable];
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
function generationBracket(config,stage,context,verifyStore){
  verifyStore();
  callRevalidator(config,stage,context);
  verifyStore();
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
  // Separate allocations also isolate the entire ArrayBuffer exposed by a copy.
  const frameLength=input.length;
  const bytes=ALLOC_BYTES(frameLength);
  APPLY(COPY_BYTES,input,[bytes]);
  const parsed=parseApollyonDurableAttemptClaimPublishRequestBytesV2(bytes);
  return Object.freeze({
    marker:"VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_PUBLISHER_FORWARD_V2",
    version:2,
    status:"exact_validated_request_bytes_ready_for_forward",
    publish_request_sha256:parsed.publish_request_sha256,
    request:freezePlainTree(parsed.request),
    get exact_request_bytes(){
      const copy=ALLOC_BYTES(frameLength);
      APPLY(COPY_BYTES,bytes,[copy]);
      return copy;
    },
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
  const configCode="apollyon_claim_store_impl_v2_config_invalid";
  if(!config||typeof config!=="object"||types.isProxy(config))fail(configCode);
  const descriptors=Object.getOwnPropertyDescriptors(config);
  if(Object.hasOwn(descriptors,"withExclusiveStoreTransaction")){
    fail("apollyon_claim_store_impl_v2_legacy_transaction_wrapper_forbidden");
  }
  const configKeys=[
    "root_fd","claim_uid","claim_gid","session_binding_id",
    "acquireExclusiveStoreTransaction","revalidate",
  ];
  if(Reflect.ownKeys(descriptors).length!==configKeys.length)fail(configCode);
  for(const key of configKeys){
    if(!descriptors[key]||!Object.hasOwn(descriptors[key],"value"))fail(configCode);
  }
  const cfg=Object.freeze(Object.fromEntries(
    configKeys.map(key=>[key,descriptors[key].value])
  ));
  if(
    !Number.isSafeInteger(cfg.root_fd)||cfg.root_fd<0||
    !Number.isSafeInteger(cfg.claim_uid)||cfg.claim_uid<1||cfg.claim_uid>65533||
    !Number.isSafeInteger(cfg.claim_gid)||cfg.claim_gid<1||cfg.claim_gid>65533||
    typeof cfg.session_binding_id!=="string"||!SESSION_BINDING_ID.test(cfg.session_binding_id)||
    typeof cfg.acquireExclusiveStoreTransaction!=="function"||
    types.isProxy(cfg.acquireExclusiveStoreTransaction)||
    typeof cfg.revalidate!=="function"||types.isProxy(cfg.revalidate)
  )fail(configCode);

  requireBackend();
  const rootIdentity=requireDirectoryFd(
    cfg.root_fd,cfg.claim_uid,cfg.claim_gid,ROOT_MODE,
    "apollyon_claim_store_impl_v2_root_invalid",
  );
  const rootIdentitySha256=sha256(
    Buffer.from(canonical(rootIdentity),"utf8")
  );

  let operationActive=false;
  let coreUnusable=false;

  function parseRequestAndGeneration(snapshot){
    const requestBytes=copyRequestBytes(
      snapshot.request_bytes,"apollyon_claim_store_impl_v2_request_bytes_invalid",
    );
    const parsed=parseApollyonDurableAttemptClaimPublishRequestBytesV2(requestBytes);
    const record=validateApollyonDurableAttemptClaimRecordEnvelopeV2(parsed.request.claim_record);
    const generation=validateStoreGenerationRecordV2(snapshot.expected_store_generation_record);
    if(generation.store_generation_id!==record.store_generation_id||
       generation.store_policy_id!==record.store_policy_id||
       generation.root_identity_sha256!==rootIdentitySha256){
      fail("apollyon_claim_store_impl_v2_generation_request_cross_binding_invalid");
    }
    return {parsed,record,generation};
  }
  function acquisitionContext(generation,slotId,record,publishRequestSha){
    return Object.freeze({
      root_identity_sha256:rootIdentitySha256,
      session_binding_id:cfg.session_binding_id,
      store_generation_id:generation.store_generation_id,
      store_generation_record_id:generation.store_generation_record_id,
      authorization_slot_id:slotId,
      claim_record_id:record.claim_record_id,
      publish_request_sha256:publishRequestSha,
    });
  }
  function withStoreLease(context,operation,mutationMayHaveOccurred){
    let acquired;
    try{acquired=cfg.acquireExclusiveStoreTransaction(context);}
    catch(error){
      coreUnusable=true;
      throw storeError("apollyon_claim_store_impl_v2_transaction_acquisition_failed",error);
    }
    let lease,release;
    try{({lease,release}=validateTransactionLease(acquired));}
    catch(error){coreUnusable=true;throw error;}
    const releaseCleanup={
      code:"apollyon_claim_store_impl_v2_transaction_release_failed",
      role:"transaction_release",
      run(){
        let result;
        try{result=APPLY(release,lease,[]);}
        catch(error){
          throw storeError("apollyon_claim_store_impl_v2_transaction_release_failed",error);
        }
        if(result!==undefined){
          observeRejectedPromise(
            result,"apollyon_claim_store_impl_v2_transaction_release_result_invalid",
          );
          fail("apollyon_claim_store_impl_v2_transaction_release_result_invalid");
        }
      },
    };
    try{
      return withCleanup(
        operation,[releaseCleanup],
        "apollyon_claim_store_impl_v2_transaction_cleanup_indeterminate",
      );
    }catch(error){
      const cleanupRecords=CLEANUP_RECORDS.get(error);
      if(cleanupRecords?.length>0){
        coreUnusable=true;
        const diagnosed=storeError(errorField(error,"message"),error);
        diagnosed.code=errorField(error,"code");
        diagnosed.cleanup_errors=cleanupRecords;
        CLEANUP_RECORDS.set(diagnosed,cleanupRecords);
        // The observer issues no mutation syscalls; failed publisher cleanup is not rollback.
        diagnosed.core_store_mutation_may_have_occurred=mutationMayHaveOccurred;
        throw diagnosed;
      }
      throw error;
    }
  }
  function withStoreDescriptors(generation,readOnly,operation){
    const cleanups=[];
    return withCleanup(()=>{
      const root=ownRootDirectory(
        cfg,rootIdentity,cleanups,readOnly?"observation_root":"transaction_root",
      );
      const layout=VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2;
      const specs=[
        ["generation",layout.generation_directory,"generation"],
        ["slot",layout.authorization_slot_directory,"authorization_slot"],
        ["claim",layout.claim_directory,"claim"],
      ];
      if(!readOnly)specs.push(["pending",layout.pending_directory,"pending"]);
      const directories={};
      for(const [key,leaf,bindingLabel] of specs){
        const directory=openDirectoryAt(
          root.fd,leaf,cfg.claim_uid,cfg.claim_gid,DIRECTORY_MODE,
          "apollyon_claim_store_impl_v2_"+key+"_directory_invalid",
          "apollyon_claim_store_impl_v2_"+bindingLabel+"_directory_binding_changed",
        );
        cleanups.push(closeCleanup(
          directory.fd,readOnly?"observation_directory":"transaction_directory",
        ));
        directories[key]=directory;
      }
      const records=holdCurrentGeneration(
        root.fd,directories.generation.fd,cfg.claim_uid,cfg.claim_gid,generation,cleanups,
      );
      function verifyNamespace(){
        requireDirectoryBinding(root,true);
        for(const directory of Object.values(directories)){
          requireDirectoryBinding(directory,readOnly);
        }
      }
      function verifyStore(){
        verifyNamespace();
        for(const observation of records)rereadHeldRecord(observation);
        verifyNamespace();
        for(const observation of records)requireRecordBinding(observation);
        requireDirectoryBinding(root,true);
      }
      function holdRecord(directoryKey,leaf,code){
        const observation=holdRecordAt(
          directories[directoryKey].fd,leaf,cfg.claim_uid,cfg.claim_gid,RECORD_MODE,
          code,cleanups,
        );
        records.push(observation);
        return observation;
      }
      verifyStore();
      return operation({directories,holdRecord,verifyStore});
    },cleanups,"apollyon_claim_store_impl_v2_descriptor_cleanup_failed");
  }
  function publishClaimWithinGuard(input){
    const snapshot=exactDataInput(input,[
      "authorization_slot_record","expected_store_generation_record","request_bytes",
    ],"apollyon_claim_store_impl_v2_publish_input_invalid");
    if(types.isProxy(snapshot.request_bytes)||!Buffer.isBuffer(snapshot.request_bytes)){
      fail("apollyon_claim_store_impl_v2_publish_input_invalid");
    }
    const {parsed,record,generation}=parseRequestAndGeneration(snapshot);
    const slot=validateApollyonDurableAttemptClaimAuthorizationSlotRecordV1(
      snapshot.authorization_slot_record,
    );
    requireSlotMatchesRequest(slot,record,parsed.publish_request_sha256);
    const context=acquisitionContext(
      generation,slot.authorization_slot_id,record,parsed.publish_request_sha256,
    );
    return withStoreLease(context,()=>withStoreDescriptors(generation,false,store=>{
      const slotDirFd=store.directories.slot.fd;
      const claimDirFd=store.directories.claim.fd;
      const pendingDirFd=store.directories.pending.fd;
      const revalidationContext={
        publish_request_sha256:parsed.publish_request_sha256,generation,slot,record,
      };
      const slotFinal=slotLeaf(slot.authorization_slot_id);
      const claimFinal=claimLeaf(record.claim_record_id);
      const slotDigest=idDigest(
        slot.authorization_slot_id,SLOT_ID,"apollyon_claim_store_impl_v2_slot_id_invalid",
      );
      const claimDigest=idDigest(
        record.claim_record_id,CLAIM_RECORD_ID,"apollyon_claim_store_impl_v2_claim_id_invalid",
      );

      generationBracket(cfg,"before_slot_publication",revalidationContext,store.verifyStore);
      reconcilePendingLink(
        slotDirFd,pendingDirFd,slotFinal,"slot",slotDigest,cfg.claim_uid,cfg.claim_gid,
      );
      reconcilePendingLink(
        claimDirFd,pendingDirFd,claimFinal,"claim",claimDigest,cfg.claim_uid,cfg.claim_gid,
      );
      const preClaim=readRecordAt(
        claimDirFd,claimFinal,cfg.claim_uid,cfg.claim_gid,RECORD_MODE,
        "apollyon_claim_store_impl_v2_preexisting_claim_invalid",{allowMissing:true},
      );
      const preSlot=readRecordAt(
        slotDirFd,slotFinal,cfg.claim_uid,cfg.claim_gid,RECORD_MODE,
        "apollyon_claim_store_impl_v2_preexisting_slot_invalid",{allowMissing:true},
      );
      if(preClaim!==null&&preSlot===null){
        fail("apollyon_claim_store_impl_v2_orphan_claim_without_slot");
      }
      const slotPublication=publishExactRecord({
        targetDirFd:slotDirFd,pendingDirFd,finalLeaf:slotFinal,kind:"slot",digest:slotDigest,
        bytes:recordBytes(slot),uid:cfg.claim_uid,gid:cfg.claim_gid,
      });
      const persistedSlot=store.holdRecord(
        "slot",slotFinal,"apollyon_claim_store_impl_v2_persisted_slot_invalid",
      );
      if(!sameTransientIdentity(slotPublication.identity,persistedSlot.identity)){
        fail("apollyon_claim_store_impl_v2_published_record_binding_changed");
      }
      const persistedSlotValue=validateApollyonDurableAttemptClaimAuthorizationSlotRecordV1(
        persistedSlot.value,
      );
      requireSlotMatchesRequest(persistedSlotValue,record,parsed.publish_request_sha256);
      generationBracket(cfg,"after_slot_before_claim",revalidationContext,store.verifyStore);

      const claimPublication=publishExactRecord({
        targetDirFd:claimDirFd,pendingDirFd,finalLeaf:claimFinal,kind:"claim",digest:claimDigest,
        bytes:recordBytes(record),uid:cfg.claim_uid,gid:cfg.claim_gid,
      });
      const persistedClaim=store.holdRecord(
        "claim",claimFinal,"apollyon_claim_store_impl_v2_persisted_claim_invalid",
      );
      if(!sameTransientIdentity(claimPublication.identity,persistedClaim.identity)){
        fail("apollyon_claim_store_impl_v2_published_record_binding_changed");
      }
      const persistedRecord=validateApollyonDurableAttemptClaimRecordEnvelopeV2(
        persistedClaim.value,
      );
      if(canonical(persistedRecord)!==canonical(record)){
        fail("apollyon_claim_store_impl_v2_persisted_claim_mismatch");
      }
      // The held generation, slot and claim are checked after the last callback as well.
      generationBracket(cfg,"before_success_ack",revalidationContext,store.verifyStore);
      const outcome=claimPublication.outcome==="created"
        ?"created_durable":"recovered_existing_exact_durable";
      const success=createSuccessResponse(record,parsed.publish_request_sha256,outcome);
      return Object.freeze({
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
    }),true);
  }
  function observeAuthorizationWinnerWithinGuard(input){
    const snapshot=exactDataInput(input,[
      "authorization_id","expected_store_generation_record","request_bytes",
    ],"apollyon_claim_store_impl_v2_observation_input_invalid");
    if(types.isProxy(snapshot.request_bytes)||!Buffer.isBuffer(snapshot.request_bytes)){
      fail("apollyon_claim_store_impl_v2_observation_input_invalid");
    }
    const {parsed,record,generation}=parseRequestAndGeneration(snapshot);
    if(typeof snapshot.authorization_id!=="string"||snapshot.authorization_id!==record.authorization_id){
      fail("apollyon_claim_store_impl_v2_observation_request_cross_binding_invalid");
    }
    const derivedSlotId=deriveApollyonDurableAttemptClaimAuthorizationSlotIdV1({
      authorization_id:snapshot.authorization_id,attempt_limit:1,automatic_retry_authorized:false,
    });
    const context=acquisitionContext(generation,derivedSlotId,record,parsed.publish_request_sha256);
    return withStoreLease(context,()=>withStoreDescriptors(generation,true,store=>{
      const persistedSlot=store.holdRecord(
        "slot",slotLeaf(derivedSlotId),"apollyon_claim_store_impl_v2_persisted_slot_invalid",
      );
      const slot=validateApollyonDurableAttemptClaimAuthorizationSlotRecordV1(persistedSlot.value);
      if(slot.authorization_slot_id!==derivedSlotId){
        fail("apollyon_claim_store_impl_v2_observation_request_cross_binding_invalid");
      }
      requireSlotMatchesRequest(slot,record,parsed.publish_request_sha256);
      const persistedClaim=store.holdRecord(
        "claim",claimLeaf(slot.claim_record_id),"apollyon_claim_store_impl_v2_persisted_claim_invalid",
      );
      const claim=validateApollyonDurableAttemptClaimRecordEnvelopeV2(persistedClaim.value);
      if(!persistedClaim.bytes.equals(recordBytes(record))||
         sha256(persistedClaim.bytes)!==slot.claim_record_sha256){
        fail("apollyon_claim_store_impl_v2_observation_claim_mismatch");
      }
      store.verifyStore();
      return freezePlainTree({
        marker:VOID_APOLLYON_AUTHORIZATION_WINNER_OBSERVATION_V1,
        version:1,
        status:"authorization_winner_observed_source_only",
        authorization_id:slot.authorization_id,
        authorization_slot_id:slot.authorization_slot_id,
        authorization_slot_record_id:slot.authorization_slot_record_id,
        authorization_slot_record_sha256:sha256(persistedSlot.bytes),
        claim_record_id:claim.claim_record_id,
        claim_record_sha256:sha256(persistedClaim.bytes),
        publish_request_sha256:parsed.publish_request_sha256,
        store_generation_id:generation.store_generation_id,
        store_generation_record_id:generation.store_generation_record_id,
        root_identity_sha256:rootIdentitySha256,
        authorization_slot_record:slot,
        claim_record:claim,
        store_generation_record:generation,
        descriptor_stable_reread_performed:true,
        visible_namespace_rebind_performed:true,
        source_filesystem_read_performed:true,
        source_core_filesystem_mutation_performed:false,
        protected_store_origin_proven:false,
        privileged_terminal_receipt_revalidation_performed:false,
        activation_capability_issuance_authorized:false,
        training_start_admission:false,
        training_execution_authorized:false,
      });
    }),false);
  }
  function withinOperationGuard(operation,input){
    if(operationActive)fail("apollyon_claim_store_impl_v2_transaction_reentry");
    if(coreUnusable)fail("apollyon_claim_store_impl_v2_transaction_core_unusable");
    requireBackend();
    operationActive=true;
    try{return operation(input);}
    finally{operationActive=false;}
  }
  function publishClaim(input){return withinOperationGuard(publishClaimWithinGuard,input);}
  function observeAuthorizationWinner(input){
    return withinOperationGuard(observeAuthorizationWinnerWithinGuard,input);
  }

  return Object.freeze({
    marker:VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_SERVICE_SOURCE_IMPLEMENTATION_V2,
    version:2,
    status:"store_service_core_source_ready_host_integration_unproven",
    root_identity:rootIdentity,
    root_identity_sha256:rootIdentitySha256,
    root_identity_scheme:"canonical_dev_ino_mode_uid_gid_nlink_size_v1",
    physical_layout:VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2,
    publishClaim,
    observeAuthorizationWinner,
    host_provenance_performed:false,
    native_peer_runtime_integration_present:false,
    authority:
      VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_SERVICE_SOURCE_IMPLEMENTATION_AUTHORITY_V2,
  });
}
