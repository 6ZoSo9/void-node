#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import {
  canonicalApollyonClaimContractJsonV1,
} from "./apollyon-candidate-training-attempt-claim-contract-v1.mjs";
import {
  validateApollyonTrainingStartConsumptionRecordV1,
} from "./apollyon-training-start-consumption-contract-v1.mjs";

export const VOID_APOLLYON_TRAINING_START_CONSUMPTION_PROTECTED_WRITER_V1 =
  "VOID_APOLLYON_TRAINING_START_CONSUMPTION_PROTECTED_WRITER_V1";

export const VOID_APOLLYON_TRAINING_START_CONSUMPTION_PROTECTED_WRITER_AUTHORITY_V1 =
  Object.freeze({
    source_candidate_only:true,
    linux_required:true,
    caller_retained_directory_fd_required:true,
    owned_directory_fd_duplication_required:true,
    caller_selected_directory_capability:true,
    caller_supplied_store_path_string_supported:false,
    derived_slot_leaf_only:true,
    arbitrary_leaf_name_supported:false,
    read_scope_one_derived_child_of_supplied_directory:true,
    write_scope_one_derived_child_of_supplied_directory:true,
    exact_parent_consumption_record_required:true,
    protected_consumption_store_origin_proven:false,
    unique_authorization_claim_slot_protected_origin_proven:false,
    unique_authorization_claim_slot_revalidation_performed:false,
    current_store_generation_revalidation_performed:false,
    bounded_existing_slot_read:true,
    create_once_final_record_supported:true,
    created_file_descriptor_retained_through_final_reread:true,
    no_overwrite:true,
    no_final_unlink:true,
    no_final_rename:true,
    exact_existing_means_already_consumed:true,
    existing_exact_consumption_reusable_admission:false,
    malformed_or_different_existing_slot_fail_closed:true,
    crash_partial_final_fail_closed:true,
    automatic_retry_authorized:false,
    one_derived_slot_filesystem_mutation_may_occur:true,
    directory_creation:false,
    service_action:false,
    socket_action:false,
    trainer_release_authorized:false,
    trainer_release_performed:false,
    training_execution_authorized:false,
    training_execution_performed:false,
    candidate_weight_mutation_performed:false,
    operator_private_key_access:false,
    production_signing:false,
    wallet_access:false,
    transaction_signing:false,
    transaction_broadcast:false,
    funds_movement:false,
    network_access:false,
  });

const SLOT_ID=/^apollyon_training_start_slot_v1:([0-9a-f]{64})$/u;
const MAX_RECORD_BYTES=64*1024;

function fail(code){throw new Error(code);}
function canonical(value){return canonicalApollyonClaimContractJsonV1(value);}
function requireLinux(){
  if(process.platform!=="linux")fail("apollyon_training_start_writer_linux_required");
}
function currentEuid(){
  if(typeof process.geteuid!=="function"){
    fail("apollyon_training_start_writer_euid_unavailable");
  }
  const value=process.geteuid();
  if(!Number.isSafeInteger(value)||value<0){
    fail("apollyon_training_start_writer_euid_invalid");
  }
  return BigInt(value);
}
function recordBytes(record){
  const bytes=Buffer.from(canonical(record)+"\n","utf8");
  if(bytes.length<2||bytes.length>MAX_RECORD_BYTES){
    fail("apollyon_training_start_writer_record_size_invalid");
  }
  return bytes;
}
function slotDigest(record){
  const match=SLOT_ID.exec(record.training_start_consumption_slot_id);
  if(!match)fail("apollyon_training_start_writer_slot_id_invalid");
  return match[1];
}
export function apollyonTrainingStartConsumptionSlotLeafV1(input){
  const record=validateApollyonTrainingStartConsumptionRecordV1(input);
  return "training-start-consumption-v1-"+slotDigest(record)+".json";
}
function directoryProcPath(directoryFd){
  if(!Number.isSafeInteger(directoryFd)||directoryFd<3){
    fail("apollyon_training_start_writer_directory_fd_invalid");
  }
  return "/proc/self/fd/"+String(directoryFd);
}
function assertDirectoryMetadata(metadata,expected=null){
  if(
    !metadata.isDirectory()||
    metadata.uid!==currentEuid()||
    Number(metadata.mode&0o7777n)!==0o700||
    metadata.nlink<2n
  ){
    fail("apollyon_training_start_writer_directory_policy_invalid");
  }
  if(
    expected&&(
      metadata.dev!==expected.dev||
      metadata.ino!==expected.ino||
      metadata.uid!==expected.uid||
      metadata.gid!==expected.gid||
      metadata.mode!==expected.mode
    )
  ){
    fail("apollyon_training_start_writer_directory_identity_drift");
  }
}
function assertDirectoryFd(directoryFd,expected=null){
  requireLinux();
  let metadata;
  try{metadata=fs.fstatSync(directoryFd,{bigint:true});}
  catch{fail("apollyon_training_start_writer_directory_fd_invalid");}
  assertDirectoryMetadata(metadata,expected);
  return Object.freeze({
    dev:metadata.dev,
    ino:metadata.ino,
    uid:metadata.uid,
    gid:metadata.gid,
    mode:metadata.mode,
  });
}
function openOwnedDirectoryFd(directoryFd){
  const initial=assertDirectoryFd(directoryFd);
  let ownedFd=-1;
  try{
    ownedFd=fs.openSync(
      directoryProcPath(directoryFd),
      fs.constants.O_RDONLY|
        Number(fs.constants.O_DIRECTORY||0)|
        Number(fs.constants.O_CLOEXEC||0),
    );
    const owned=assertDirectoryFd(ownedFd,initial);
    assertDirectoryFd(directoryFd,initial);
    return Object.freeze({fd:ownedFd,identity:owned});
  }catch(error){
    if(ownedFd>=0){
      try{fs.closeSync(ownedFd);}catch(closeError){void closeError;}
    }
    throw error;
  }
}
function sameFileIdentity(a,b){
  return (
    a.dev===b.dev&&a.ino===b.ino&&a.uid===b.uid&&a.gid===b.gid&&
    a.mode===b.mode&&a.nlink===b.nlink&&a.size===b.size&&
    a.mtimeNs===b.mtimeNs&&a.ctimeNs===b.ctimeNs
  );
}
function assertFinalMetadata(metadata,bytesLength){
  if(
    !metadata.isFile()||
    metadata.isSymbolicLink()||
    metadata.uid!==currentEuid()||
    Number(metadata.mode&0o7777n)!==0o600||
    metadata.nlink!==1n||
    metadata.size!==BigInt(bytesLength)
  ){
    fail("apollyon_training_start_writer_final_metadata_invalid");
  }
}
function readExactFinal(directoryFd,record,directoryIdentity){
  const leaf=apollyonTrainingStartConsumptionSlotLeafV1(record);
  const finalPath=path.join(directoryProcPath(directoryFd),leaf);
  const expectedBytes=recordBytes(record);
  let visibleBefore;
  try{
    visibleBefore=fs.lstatSync(finalPath,{bigint:true});
  }catch(error){
    if(error?.code==="ENOENT")return Object.freeze({status:"absent"});
    throw error;
  }
  if(
    visibleBefore.size<2n||
    visibleBefore.size>BigInt(MAX_RECORD_BYTES)
  ){
    fail("apollyon_training_start_writer_existing_record_size_invalid");
  }
  assertFinalMetadata(visibleBefore,Number(visibleBefore.size));
  const fd=fs.openSync(
    finalPath,
    fs.constants.O_RDONLY|
      Number(fs.constants.O_NOFOLLOW||0)|
      Number(fs.constants.O_CLOEXEC||0),
  );
  try{
    const before=fs.fstatSync(fd,{bigint:true});
    assertFinalMetadata(before,Number(before.size));
    const bytes=fs.readFileSync(fd);
    const after=fs.fstatSync(fd,{bigint:true});
    const visibleAfter=fs.lstatSync(finalPath,{bigint:true});
    if(
      !sameFileIdentity(before,after)||
      !sameFileIdentity(after,visibleAfter)||
      BigInt(bytes.length)!==after.size
    ){
      fail("apollyon_training_start_writer_final_identity_drift");
    }
    if(bytes.length<2||bytes.length>MAX_RECORD_BYTES){
      fail("apollyon_training_start_writer_existing_record_size_invalid");
    }
    let parsed;
    try{parsed=JSON.parse(bytes.toString("utf8"));}
    catch{fail("apollyon_training_start_writer_existing_record_invalid");}
    let observed;
    try{observed=validateApollyonTrainingStartConsumptionRecordV1(parsed);}
    catch{fail("apollyon_training_start_writer_existing_record_invalid");}
    if(canonical(observed)+"\n"!==bytes.toString("utf8")){
      fail("apollyon_training_start_writer_existing_record_noncanonical");
    }
    if(!bytes.equals(expectedBytes)){
      fail("apollyon_training_start_writer_existing_slot_collision");
    }
    assertDirectoryFd(directoryFd,directoryIdentity);
    return Object.freeze({
      status:"already_consumed",
      existing_exact_consumption:true,
      training_start_consumption_slot_id:record.training_start_consumption_slot_id,
      training_start_consumption_id:record.training_start_consumption_id,
    });
  }finally{
    fs.closeSync(fd);
  }
}
function writeAll(fd,bytes){
  let offset=0;
  while(offset<bytes.length){
    let written;
    try{written=fs.writeSync(fd,bytes,offset,bytes.length-offset,null);}
    catch(error){
      if(error?.code==="EINTR")continue;
      throw error;
    }
    if(!Number.isSafeInteger(written)||written<=0){
      fail("apollyon_training_start_writer_short_write");
    }
    offset+=written;
  }
}
function createdReceipt(record){
  return Object.freeze({
    marker:VOID_APOLLYON_TRAINING_START_CONSUMPTION_PROTECTED_WRITER_V1,
    version:1,
    status:"training_start_consumption_created_durable",
    training_start_consumption_slot_id:record.training_start_consumption_slot_id,
    training_start_consumption_id:record.training_start_consumption_id,
    created_durable:true,
    existing_exact_consumption:false,
    training_start_admission:false,
    trainer_release_authorized:false,
    trainer_release_performed:false,
    training_execution_authorized:false,
    training_execution_performed:false,
    candidate_weight_mutation_performed:false,
    automatic_retry_authorized:false,
    protected_consumption_store_origin_proven:false,
    unique_authorization_claim_slot_protected_origin_proven:false,
    unique_authorization_claim_slot_revalidation_performed:false,
  });
}
function alreadyReceipt(record){
  return Object.freeze({
    marker:VOID_APOLLYON_TRAINING_START_CONSUMPTION_PROTECTED_WRITER_V1,
    version:1,
    status:"training_start_consumption_already_consumed",
    training_start_consumption_slot_id:record.training_start_consumption_slot_id,
    training_start_consumption_id:record.training_start_consumption_id,
    created_durable:false,
    existing_exact_consumption:true,
    training_start_admission:false,
    trainer_release_authorized:false,
    trainer_release_performed:false,
    training_execution_authorized:false,
    training_execution_performed:false,
    candidate_weight_mutation_performed:false,
    automatic_retry_authorized:false,
    protected_consumption_store_origin_proven:false,
    unique_authorization_claim_slot_protected_origin_proven:false,
    unique_authorization_claim_slot_revalidation_performed:false,
  });
}
export function classifyApollyonTrainingStartConsumptionProtectedSlotV1(input){
  let snapshot;
  try{snapshot=structuredClone(input);}catch{
    fail("apollyon_training_start_writer_input_invalid");
  }
  if(!snapshot||typeof snapshot!=="object"||Array.isArray(snapshot)){
    fail("apollyon_training_start_writer_input_invalid");
  }
  const keys=Object.keys(snapshot).sort();
  if(keys.length!==2||keys[0]!=="directory_fd"||keys[1]!=="expected_consumption_record"){
    fail("apollyon_training_start_writer_input_invalid");
  }
  const record=validateApollyonTrainingStartConsumptionRecordV1(
    snapshot.expected_consumption_record,
  );
  const owned=openOwnedDirectoryFd(snapshot.directory_fd);
  try{
    return readExactFinal(owned.fd,record,owned.identity);
  }finally{
    fs.closeSync(owned.fd);
  }
}
export function publishApollyonTrainingStartConsumptionProtectedV1(input){
  let snapshot;
  try{snapshot=structuredClone(input);}catch{
    fail("apollyon_training_start_writer_input_invalid");
  }
  if(!snapshot||typeof snapshot!=="object"||Array.isArray(snapshot)){
    fail("apollyon_training_start_writer_input_invalid");
  }
  const keys=Object.keys(snapshot).sort();
  if(keys.length!==2||keys[0]!=="consumption_record"||keys[1]!=="directory_fd"){
    fail("apollyon_training_start_writer_input_invalid");
  }
  const record=validateApollyonTrainingStartConsumptionRecordV1(
    snapshot.consumption_record,
  );
  const owned=openOwnedDirectoryFd(snapshot.directory_fd);
  try{
    const existing=readExactFinal(owned.fd,record,owned.identity);
    if(existing.status==="already_consumed")return alreadyReceipt(record);

    const leaf=apollyonTrainingStartConsumptionSlotLeafV1(record);
    const finalPath=path.join(directoryProcPath(owned.fd),leaf);
    const bytes=recordBytes(record);
    let fd;
    try{
      fd=fs.openSync(
        finalPath,
        fs.constants.O_WRONLY|
          fs.constants.O_CREAT|
          fs.constants.O_EXCL|
          Number(fs.constants.O_NOFOLLOW||0)|
          Number(fs.constants.O_CLOEXEC||0),
        0o600,
      );
    }catch(error){
      if(error?.code==="EEXIST"){
        const raced=readExactFinal(owned.fd,record,owned.identity);
        if(raced.status==="already_consumed")return alreadyReceipt(record);
        fail("apollyon_training_start_writer_create_race_invalid");
      }
      throw error;
    }

    try{
      fs.fchmodSync(fd,0o600);
      let metadata=fs.fstatSync(fd,{bigint:true});
      assertFinalMetadata(metadata,0);
      writeAll(fd,bytes);
      metadata=fs.fstatSync(fd,{bigint:true});
      assertFinalMetadata(metadata,bytes.length);
      fs.fsyncSync(fd);
      const createdIdentity=fs.fstatSync(fd,{bigint:true});
      assertFinalMetadata(createdIdentity,bytes.length);

      assertDirectoryFd(owned.fd,owned.identity);
      fs.fsyncSync(owned.fd);
      assertDirectoryFd(owned.fd,owned.identity);
      const final=readExactFinal(owned.fd,record,owned.identity);
      if(final.status!=="already_consumed"){
        fail("apollyon_training_start_writer_final_reread_missing");
      }
      const visibleFinal=fs.lstatSync(finalPath,{bigint:true});
      const retainedCreated=fs.fstatSync(fd,{bigint:true});
      if(
        !sameFileIdentity(createdIdentity,retainedCreated)||
        !sameFileIdentity(createdIdentity,visibleFinal)
      ){
        fail("apollyon_training_start_writer_created_generation_replaced");
      }
      return createdReceipt(record);
    }finally{
      fs.closeSync(fd);
    }
  }finally{
    fs.closeSync(owned.fd);
  }
}
