#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  validateVoidDatanetRegistryBroadcastRuntimeArtifactsV1,
  validateVoidDatanetRegistryPrebroadcastObservationV1,
} from "./void-datanet-registry-prebroadcast-observer-v1.mjs";

export const VOID_DATANET_REGISTRY_SINGLE_USE_BROADCAST_AUTHORIZATION_CONSUMPTION_V1 =
  "VOID_DATANET_REGISTRY_SINGLE_USE_BROADCAST_AUTHORIZATION_CONSUMPTION_V1";

export const VOID_DATANET_REGISTRY_SINGLE_USE_BROADCAST_AUTHORIZATION_CONSUMPTION_AUTHORITY_V1 =
  Object.freeze({
    durable_single_use_consumption:true,
    exact_authorization_rebuild_required:true,
    fresh_prebroadcast_observation_required:true,
    runtime_expiry_recheck_required:true,
    private_existing_state_root_required:true,
    state_store_generation_binding_required:true,
    stable_broadcast_operation_slot_required:true,
    descriptor_relative_publication:true,
    immutable_consumption_record:true,
    filesystem_read:true,
    filesystem_mutation_one_consumption_record_may_occur:true,
    signed_transaction_bytes_access:false,
    credential_access:false,
    private_key_access:false,
    broadcaster_access_authorized_by_this_gate:false,
    broadcaster_access_performed:false,
    rpc_call:false,
    transaction_submission_authorized_by_this_gate:false,
    transaction_submission_performed:false,
    transaction_broadcast_authorized_by_this_gate:false,
    transaction_broadcast_performed:false,
    deployment_authorized:false,
    deployment_performed:false,
    chain2050_write_authorized:false,
    chain2050_write_performed:false,
    validator_mutation:false,
    token_movement:false,
    funds_movement:false,
    migration_authorized:false,
    public_activation_authorized:false,
    automatic_retry:false,
  });

const AUTH_ID=/^voiddrba1_[0-9a-f]{64}$/u;
const SIGNED_ID=/^voiddrstx1_[0-9a-f]{64}$/u;
const PREBROADCAST_ID=/^voiddrpbo1_[0-9a-f]{64}$/u;
const CONSUMPTION_ID=/^voiddrbac1_[0-9a-f]{64}$/u;
const OPERATION_ID=/^voiddrbo1_[0-9a-f]{64}$/u;
const HASH=/^0x[0-9a-f]{64}$/u;
const SHA256=/^[0-9a-f]{64}$/u;
const MAX_RECORD_BYTES=128*1024;

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
function safeErrorClass(error){
  const raw=String(error?.name||"Error");
  return /^[A-Za-z0-9._:-]{1,80}$/u.test(raw)?raw:"Error";
}
function held(reason,options={}){
  return Object.freeze({
    ok:false,
    marker:
      VOID_DATANET_REGISTRY_SINGLE_USE_BROADCAST_AUTHORIZATION_CONSUMPTION_V1,
    version:1,
    status:"held",
    reason,
    broadcast_authorization_id:
      options.broadcast_authorization_id??null,
    prebroadcast_observation_id:
      options.prebroadcast_observation_id??null,
    signed_transaction_id:options.signed_transaction_id??null,
    broadcast_operation_id:options.broadcast_operation_id??null,
    state_store_realpath_sha256:
      options.state_store_realpath_sha256??null,
    authorization_consumed:false,
    signed_transaction_bytes_accessed:false,
    broadcaster_access_performed:false,
    rpc_call_performed:false,
    transaction_submission_performed:false,
    transaction_broadcast_performed:false,
    deployment_performed:false,
    chain2050_write_performed:false,
    funds_movement_performed:false,
    authority:
      VOID_DATANET_REGISTRY_SINGLE_USE_BROADCAST_AUTHORIZATION_CONSUMPTION_AUTHORITY_V1,
    ...(options.detail?{detail:options.detail}:{}),
  });
}
function canonicalUtcFromMs(value){
  if(!Number.isSafeInteger(value)||value<=0) return "";
  return new Date(value).toISOString();
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
      throw new Error("registry_broadcast_consumption_symlink_ancestor_rejected");
    }
  }
}
function validateStateRoot(raw){
  const supplied=String(raw||"");
  if(
    !supplied||
    !path.isAbsolute(supplied)||
    path.resolve(supplied)!==supplied
  ){
    return {
      ok:false,
      reason:"registry_broadcast_consumption_state_root_must_be_absolute_canonical",
    };
  }
  try{
    assertNoSymlinkAncestors(supplied);
    const stat=fs.lstatSync(supplied);
    const big=fs.lstatSync(supplied,{bigint:true});
    if(!stat.isDirectory()||stat.isSymbolicLink()){
      return {
        ok:false,
        reason:"registry_broadcast_consumption_state_root_not_direct_directory",
      };
    }
    if(typeof process.getuid==="function"&&stat.uid!==process.getuid()){
      return {
        ok:false,
        reason:"registry_broadcast_consumption_state_root_owner_mismatch",
      };
    }
    if((stat.mode&0o777)!==0o700){
      return {
        ok:false,
        reason:"registry_broadcast_consumption_state_root_mode_must_be_0700",
      };
    }
    const real=fs.realpathSync.native(supplied);
    if(real!==supplied){
      return {
        ok:false,
        reason:"registry_broadcast_consumption_state_root_realpath_mismatch",
      };
    }
    return {
      ok:true,
      realpath:real,
      realpath_sha256:sha256(real),
      dev:String(big.dev),
      ino:String(big.ino),
    };
  }catch(error){
    return {
      ok:false,
      reason:"registry_broadcast_consumption_state_root_invalid",
      detail:{error_class:safeErrorClass(error)},
    };
  }
}
function assertRootGeneration(root){
  const big=fs.lstatSync(root.realpath,{bigint:true});
  if(
    !big.isDirectory()||
    String(big.dev)!==root.dev||
    String(big.ino)!==root.ino
  ){
    throw new Error("registry_broadcast_consumption_state_root_generation_changed");
  }
}
function openPinnedRoot(root){
  const flags=
    fs.constants.O_RDONLY|
    Number(fs.constants.O_DIRECTORY||0)|
    Number(fs.constants.O_NOFOLLOW||0);
  const fd=fs.openSync(root.realpath,flags);
  const stat=fs.fstatSync(fd,{bigint:true});
  if(
    !stat.isDirectory()||
    String(stat.dev)!==root.dev||
    String(stat.ino)!==root.ino
  ){
    fs.closeSync(fd);
    throw new Error("registry_broadcast_consumption_state_root_generation_changed");
  }
  return fd;
}
function fdPath(fd,child){
  return "/proc/self/fd/"+String(fd)+"/"+child;
}
function ensureConsumedDir(rootFd){
  const dir=fdPath(rootFd,"broadcast-consumed");
  try{
    const stat=fs.lstatSync(dir);
    if(!stat.isDirectory()||stat.isSymbolicLink()){
      throw new Error("registry_broadcast_consumption_dir_invalid");
    }
    if((stat.mode&0o777)!==0o700){
      throw new Error("registry_broadcast_consumption_dir_mode_must_be_0700");
    }
    if(typeof process.getuid==="function"&&stat.uid!==process.getuid()){
      throw new Error("registry_broadcast_consumption_dir_owner_mismatch");
    }
  }catch(error){
    if(error?.code!=="ENOENT") throw error;
    fs.mkdirSync(dir,{recursive:false,mode:0o700});
    fs.chmodSync(dir,0o700);
    fs.fsyncSync(rootFd);
  }
  const flags=
    fs.constants.O_RDONLY|
    Number(fs.constants.O_DIRECTORY||0)|
    Number(fs.constants.O_NOFOLLOW||0);
  return fs.openSync(dir,flags);
}
function atomicCreate(parentFd,fileName,value){
  const parent="/proc/self/fd/"+String(parentFd);
  const final=path.join(parent,fileName);
  const temp=path.join(
    parent,
    "."+fileName+".tmp-"+String(process.pid)+"-"+
      crypto.randomBytes(8).toString("hex"),
  );
  const bytes=Buffer.from(canonicalJson(value)+"\n","utf8");
  if(bytes.length>MAX_RECORD_BYTES){
    throw new Error("registry_broadcast_consumption_record_too_large");
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
      fs.linkSync(temp,final);
      fs.fsyncSync(parentFd);
      return {outcome:"created",file:final};
    }catch(error){
      if(error?.code==="EEXIST"){
        return {outcome:"exists",file:final};
      }
      throw error;
    }
  }finally{
    try{fs.unlinkSync(temp);}catch(error){
      if(error?.code!=="ENOENT") throw error;
    }
  }
}
function assertPrivateRecord(file){
  const stat=fs.lstatSync(file);
  if(!stat.isFile()||stat.isSymbolicLink()){
    throw new Error("registry_broadcast_consumption_record_not_direct_file");
  }
  if((stat.mode&0o777)!==0o600){
    throw new Error("registry_broadcast_consumption_record_mode_must_be_0600");
  }
  if(typeof process.getuid==="function"&&stat.uid!==process.getuid()){
    throw new Error("registry_broadcast_consumption_record_owner_mismatch");
  }
  if(stat.size<2||stat.size>MAX_RECORD_BYTES){
    throw new Error("registry_broadcast_consumption_record_size_invalid");
  }
}

export function voidDatanetRegistryBroadcastOperationIdV1(authorization){
  const signedId=String(authorization?.signed_transaction_id||"");
  const signedHash=String(
    authorization?.transaction_summary?.signed_transaction_hash||"",
  );
  const fingerprint=String(
    authorization?.transaction_fingerprint_sha256||"",
  );
  if(
    !SIGNED_ID.test(signedId)||
    !HASH.test(signedHash)||
    !SHA256.test(fingerprint)
  ){
    throw new Error("registry_broadcast_consumption_operation_identity_invalid");
  }
  const material={
    marker:"VOID_DATANET_REGISTRY_BROADCAST_OPERATION_V1",
    signed_transaction_id:signedId,
    signed_transaction_hash:signedHash,
    transaction_fingerprint_sha256:fingerprint,
  };
  return "voiddrbo1_"+sha256(Buffer.from(canonicalJson(material)));
}

function consumeCore(input,clock){
  let authorization;
  try{
    authorization=
      validateVoidDatanetRegistryBroadcastRuntimeArtifactsV1({
        broadcast_request:input?.broadcast_request,
        broadcast_authorization:input?.broadcast_authorization,
      }).authorization;
  }catch(error){
    return held("registry_broadcast_consumption_authorization_invalid",{
      detail:{error_class:safeErrorClass(error)},
    });
  }

  let observation;
  try{
    observation=validateVoidDatanetRegistryPrebroadcastObservationV1(
      input?.prebroadcast_observation,
      {
        broadcast_request:input?.broadcast_request,
        broadcast_authorization:input?.broadcast_authorization,
      },
    );
  }catch(error){
    return held("registry_broadcast_consumption_prebroadcast_invalid",{
      broadcast_authorization_id:authorization.broadcast_authorization_id,
      signed_transaction_id:authorization.signed_transaction_id,
      detail:{error_class:safeErrorClass(error)},
    });
  }

  if(
    observation.broadcast_authorization_id!==
      authorization.broadcast_authorization_id||
    observation.signed_transaction_id!==authorization.signed_transaction_id||
    observation.signed_transaction_hash!==
      authorization.transaction_summary.signed_transaction_hash
  ){
    return held("registry_broadcast_consumption_lineage_mismatch",{
      broadcast_authorization_id:authorization.broadcast_authorization_id,
      prebroadcast_observation_id:observation.prebroadcast_observation_id,
      signed_transaction_id:authorization.signed_transaction_id,
    });
  }

  let operationId;
  try{
    operationId=voidDatanetRegistryBroadcastOperationIdV1(authorization);
  }catch(error){
    return held("registry_broadcast_consumption_operation_identity_invalid",{
      broadcast_authorization_id:authorization.broadcast_authorization_id,
      prebroadcast_observation_id:observation.prebroadcast_observation_id,
      signed_transaction_id:authorization.signed_transaction_id,
    });
  }
  if(!OPERATION_ID.test(operationId)){
    return held("registry_broadcast_consumption_operation_identity_invalid");
  }

  const authStart=Date.parse(String(authorization.authorized_at_utc||""));
  const authEnd=Date.parse(String(authorization.valid_until_utc||""));
  const obsStart=Date.parse(String(observation.observed_at_utc||""));
  const obsEnd=Date.parse(String(observation.valid_until_utc||""));

  let entryNow;
  try{entryNow=clock("entry");}catch(error){
    return held("registry_broadcast_consumption_clock_invalid",{
      broadcast_authorization_id:authorization.broadcast_authorization_id,
      prebroadcast_observation_id:observation.prebroadcast_observation_id,
      signed_transaction_id:authorization.signed_transaction_id,
      broadcast_operation_id:operationId,
      detail:{error_class:safeErrorClass(error)},
    });
  }
  if(!Number.isSafeInteger(entryNow)||entryNow<=0){
    return held("registry_broadcast_consumption_clock_invalid");
  }
  if(
    !Number.isFinite(authStart)||
    !Number.isFinite(authEnd)||
    entryNow<authStart||
    entryNow>=authEnd
  ){
    return held("registry_broadcast_consumption_authorization_expired_or_inactive",{
      broadcast_authorization_id:authorization.broadcast_authorization_id,
      prebroadcast_observation_id:observation.prebroadcast_observation_id,
      signed_transaction_id:authorization.signed_transaction_id,
      broadcast_operation_id:operationId,
    });
  }
  if(
    !Number.isFinite(obsStart)||
    !Number.isFinite(obsEnd)||
    entryNow<obsStart||
    entryNow>=obsEnd
  ){
    return held("registry_broadcast_consumption_prebroadcast_expired_or_inactive",{
      broadcast_authorization_id:authorization.broadcast_authorization_id,
      prebroadcast_observation_id:observation.prebroadcast_observation_id,
      signed_transaction_id:authorization.signed_transaction_id,
      broadcast_operation_id:operationId,
    });
  }

  const root=validateStateRoot(input?.state_dir);
  if(root.ok===false){
    return held(root.reason,{
      broadcast_authorization_id:authorization.broadcast_authorization_id,
      prebroadcast_observation_id:observation.prebroadcast_observation_id,
      signed_transaction_id:authorization.signed_transaction_id,
      broadcast_operation_id:operationId,
      ...(root.detail?{detail:root.detail}:{}),
    });
  }

  let rootFd=-1;
  let consumedFd=-1;
  try{
    try{
      rootFd=openPinnedRoot(root);
      consumedFd=ensureConsumedDir(rootFd);
      assertRootGeneration(root);
    }catch(error){
      return held("registry_broadcast_consumption_store_prepare_failed",{
        broadcast_authorization_id:authorization.broadcast_authorization_id,
        prebroadcast_observation_id:observation.prebroadcast_observation_id,
        signed_transaction_id:authorization.signed_transaction_id,
        broadcast_operation_id:operationId,
        state_store_realpath_sha256:root.realpath_sha256,
        detail:{error_class:safeErrorClass(error)},
      });
    }

    let publishNow;
    try{publishNow=clock("prepublish");}catch(error){
      return held("registry_broadcast_consumption_clock_invalid",{
        broadcast_authorization_id:authorization.broadcast_authorization_id,
        prebroadcast_observation_id:observation.prebroadcast_observation_id,
        signed_transaction_id:authorization.signed_transaction_id,
        broadcast_operation_id:operationId,
        state_store_realpath_sha256:root.realpath_sha256,
      });
    }
    if(
      !Number.isSafeInteger(publishNow)||
      publishNow<=0||
      publishNow<authStart||
      publishNow>=authEnd||
      publishNow<obsStart||
      publishNow>=obsEnd
    ){
      return held("registry_broadcast_consumption_expired_before_publication",{
        broadcast_authorization_id:authorization.broadcast_authorization_id,
        prebroadcast_observation_id:observation.prebroadcast_observation_id,
        signed_transaction_id:authorization.signed_transaction_id,
        broadcast_operation_id:operationId,
        state_store_realpath_sha256:root.realpath_sha256,
      });
    }
    try{assertRootGeneration(root);}catch(error){
      return held("registry_broadcast_consumption_state_root_generation_changed",{
        broadcast_authorization_id:authorization.broadcast_authorization_id,
        prebroadcast_observation_id:observation.prebroadcast_observation_id,
        signed_transaction_id:authorization.signed_transaction_id,
        broadcast_operation_id:operationId,
        state_store_realpath_sha256:root.realpath_sha256,
      });
    }

    const material={
      marker:
        VOID_DATANET_REGISTRY_SINGLE_USE_BROADCAST_AUTHORIZATION_CONSUMPTION_V1,
      version:1,
      status:"BROADCAST_AUTHORIZATION_CONSUMED_BROADCASTER_ACCESS_HOLD",
      broadcast_operation_id:operationId,
      broadcast_authorization_id:authorization.broadcast_authorization_id,
      broadcast_authorization_request_id:
        authorization.broadcast_authorization_request_id,
      prebroadcast_observation_id:observation.prebroadcast_observation_id,
      signed_transaction_id:authorization.signed_transaction_id,
      signed_transaction_hash:
        authorization.transaction_summary.signed_transaction_hash,
      candidate_id:authorization.candidate_id,
      transaction_fingerprint_sha256:
        authorization.transaction_fingerprint_sha256,
      authorized_at_utc:authorization.authorized_at_utc,
      authorization_valid_until_utc:authorization.valid_until_utc,
      observed_at_utc:observation.observed_at_utc,
      observation_valid_until_utc:observation.valid_until_utc,
      consumed_at_utc:canonicalUtcFromMs(publishNow),
      state_store_realpath_sha256:root.realpath_sha256,
      state_store_root_dev:root.dev,
      state_store_root_ino:root.ino,
      transaction_summary:authorization.transaction_summary,
      consumption:{
        exact_single_transaction:true,
        exact_signed_transaction_only:true,
        one_submission_attempt_only:true,
        single_use:true,
        authorization_consumed:true,
        immutable_consumption_record:true,
        stable_broadcast_operation_slot:true,
        state_store_generation_bound:true,
        descriptor_relative_publication:true,
        replay_rejected_within_exact_state_store_generation:true,
        replay_prevention_scope:
          "exact_state_store_generation_and_broadcast_operation",
        global_replay_prevention_claimed:false,
        authorization_expiry_rechecked_at_entry:true,
        authorization_expiry_rechecked_before_publication:true,
        prebroadcast_freshness_rechecked_at_entry:true,
        prebroadcast_freshness_rechecked_before_publication:true,
        consumption_precedes_any_broadcaster_access:true,
        signed_transaction_hash_bound:true,
      },
      authority:{
        filesystem_mutation_performed:true,
        signed_transaction_bytes_accessed:false,
        credential_access_performed:false,
        private_key_access_performed:false,
        broadcaster_access_authorized_by_this_gate:false,
        broadcaster_access_performed:false,
        rpc_call_performed:false,
        transaction_submission_authorized_by_this_gate:false,
        transaction_submission_performed:false,
        transaction_broadcast_authorized_by_this_gate:false,
        transaction_broadcast_performed:false,
        deployment_authorized:false,
        deployment_performed:false,
        chain2050_write_authorized:false,
        chain2050_write_performed:false,
        validator_mutation:false,
        token_movement:false,
        funds_movement:false,
        migration_authorized:false,
        public_activation_authorized:false,
        automatic_retry:false,
      },
      next_gate:
        "exact_single_attempt_registry_broadcast_execution_after_consumption_v1",
    };
    const record={
      ...material,
      consumption_record_id:
        "voiddrbac1_"+sha256(Buffer.from(canonicalJson(material))),
    };
    if(!CONSUMPTION_ID.test(record.consumption_record_id)){
      return held("registry_broadcast_consumption_record_id_invalid");
    }
    const published=atomicCreate(
      consumedFd,
      operationId+".json",
      record,
    );
    if(published.outcome==="exists"){
      return held("registry_broadcast_consumption_already_consumed",{
        broadcast_authorization_id:authorization.broadcast_authorization_id,
        prebroadcast_observation_id:observation.prebroadcast_observation_id,
        signed_transaction_id:authorization.signed_transaction_id,
        broadcast_operation_id:operationId,
        state_store_realpath_sha256:root.realpath_sha256,
      });
    }
    try{
      assertPrivateRecord(published.file);
      const stored=JSON.parse(fs.readFileSync(published.file,"utf8"));
      if(canonicalJson(stored)!==canonicalJson(record)){
        throw new Error("registry_broadcast_consumption_readback_mismatch");
      }
    }catch(error){
      return held("registry_broadcast_consumption_readback_failed",{
        broadcast_authorization_id:authorization.broadcast_authorization_id,
        prebroadcast_observation_id:observation.prebroadcast_observation_id,
        signed_transaction_id:authorization.signed_transaction_id,
        broadcast_operation_id:operationId,
        state_store_realpath_sha256:root.realpath_sha256,
        detail:{error_class:safeErrorClass(error)},
      });
    }

    return Object.freeze({
      ok:true,
      ...record,
      durable_consumption_record_published:true,
      consumption_record_mode:"0600",
      state_store_directory_mode:"0700",
      signed_transaction_bytes_accessed:false,
      credential_access_performed:false,
      private_key_access_performed:false,
      broadcaster_access_performed:false,
      rpc_call_performed:false,
      transaction_submission_performed:false,
      transaction_broadcast_performed:false,
      deployment_performed:false,
      chain2050_write_performed:false,
      funds_movement_performed:false,
      authority_contract:
        VOID_DATANET_REGISTRY_SINGLE_USE_BROADCAST_AUTHORIZATION_CONSUMPTION_AUTHORITY_V1,
    });
  }finally{
    if(consumedFd>=0){
      try{fs.closeSync(consumedFd);}catch(error){void error;}
    }
    if(rootFd>=0){
      try{fs.closeSync(rootFd);}catch(error){void error;}
    }
  }
}

export function validateVoidDatanetRegistryBroadcastConsumptionRecordV1(
  record,
  evidence,
){
  if(
    !record||
    record.ok!==true||
    record.marker!==
      VOID_DATANET_REGISTRY_SINGLE_USE_BROADCAST_AUTHORIZATION_CONSUMPTION_V1||
    record.version!==1||
    record.status!=="BROADCAST_AUTHORIZATION_CONSUMED_BROADCASTER_ACCESS_HOLD"||
    !CONSUMPTION_ID.test(String(record.consumption_record_id||""))||
    !OPERATION_ID.test(String(record.broadcast_operation_id||""))||
    !AUTH_ID.test(String(record.broadcast_authorization_id||""))||
    !PREBROADCAST_ID.test(String(record.prebroadcast_observation_id||""))||
    !SIGNED_ID.test(String(record.signed_transaction_id||""))||
    !HASH.test(String(record.signed_transaction_hash||""))||
    !SHA256.test(String(record.transaction_fingerprint_sha256||""))||
    record.durable_consumption_record_published!==true||
    record.consumption_record_mode!=="0600"||
    record.state_store_directory_mode!=="0700"||
    record.signed_transaction_bytes_accessed!==false||
    record.credential_access_performed!==false||
    record.private_key_access_performed!==false||
    record.broadcaster_access_performed!==false||
    record.rpc_call_performed!==false||
    record.transaction_submission_performed!==false||
    record.transaction_broadcast_performed!==false||
    record.deployment_performed!==false||
    record.chain2050_write_performed!==false||
    record.funds_movement_performed!==false||
    record.next_gate!==
      "exact_single_attempt_registry_broadcast_execution_after_consumption_v1"
  ){
    throw new Error("registry_broadcast_consumption_record_contract_invalid");
  }

  const material=structuredClone(record);
  const id=material.consumption_record_id;
  for(const key of [
    "consumption_record_id",
    "ok",
    "durable_consumption_record_published",
    "consumption_record_mode",
    "state_store_directory_mode",
    "signed_transaction_bytes_accessed",
    "credential_access_performed",
    "private_key_access_performed",
    "broadcaster_access_performed",
    "rpc_call_performed",
    "transaction_submission_performed",
    "transaction_broadcast_performed",
    "deployment_performed",
    "chain2050_write_performed",
    "funds_movement_performed",
    "authority_contract",
  ]){
    delete material[key];
  }
  const expectedId=
    "voiddrbac1_"+sha256(Buffer.from(canonicalJson(material)));
  if(id!==expectedId){
    throw new Error("registry_broadcast_consumption_record_id_mismatch");
  }

  const expectedConsumption={
    exact_single_transaction:true,
    exact_signed_transaction_only:true,
    one_submission_attempt_only:true,
    single_use:true,
    authorization_consumed:true,
    immutable_consumption_record:true,
    stable_broadcast_operation_slot:true,
    state_store_generation_bound:true,
    descriptor_relative_publication:true,
    replay_rejected_within_exact_state_store_generation:true,
    replay_prevention_scope:
      "exact_state_store_generation_and_broadcast_operation",
    global_replay_prevention_claimed:false,
    authorization_expiry_rechecked_at_entry:true,
    authorization_expiry_rechecked_before_publication:true,
    prebroadcast_freshness_rechecked_at_entry:true,
    prebroadcast_freshness_rechecked_before_publication:true,
    consumption_precedes_any_broadcaster_access:true,
    signed_transaction_hash_bound:true,
  };
  if(
    JSON.stringify(Object.keys(record.consumption).sort())!==
      JSON.stringify(Object.keys(expectedConsumption).sort())
  ){
    throw new Error("registry_broadcast_consumption_record_scope_keys_invalid");
  }
  for(const [key,value] of Object.entries(expectedConsumption)){
    if(record.consumption[key]!==value){
      throw new Error("registry_broadcast_consumption_record_scope_mismatch:"+key);
    }
  }

  const expectedAuthority={
    filesystem_mutation_performed:true,
    signed_transaction_bytes_accessed:false,
    credential_access_performed:false,
    private_key_access_performed:false,
    broadcaster_access_authorized_by_this_gate:false,
    broadcaster_access_performed:false,
    rpc_call_performed:false,
    transaction_submission_authorized_by_this_gate:false,
    transaction_submission_performed:false,
    transaction_broadcast_authorized_by_this_gate:false,
    transaction_broadcast_performed:false,
    deployment_authorized:false,
    deployment_performed:false,
    chain2050_write_authorized:false,
    chain2050_write_performed:false,
    validator_mutation:false,
    token_movement:false,
    funds_movement:false,
    migration_authorized:false,
    public_activation_authorized:false,
    automatic_retry:false,
  };
  if(
    JSON.stringify(Object.keys(record.authority).sort())!==
      JSON.stringify(Object.keys(expectedAuthority).sort())
  ){
    throw new Error("registry_broadcast_consumption_record_authority_keys_invalid");
  }
  for(const [key,value] of Object.entries(expectedAuthority)){
    if(record.authority[key]!==value){
      throw new Error("registry_broadcast_consumption_record_authority_mismatch:"+key);
    }
  }

  const artifacts=validateVoidDatanetRegistryBroadcastRuntimeArtifactsV1({
    broadcast_request:evidence?.broadcast_request,
    broadcast_authorization:evidence?.broadcast_authorization,
  });
  const observation=validateVoidDatanetRegistryPrebroadcastObservationV1(
    evidence?.prebroadcast_observation,
    {
      broadcast_request:evidence?.broadcast_request,
      broadcast_authorization:evidence?.broadcast_authorization,
    },
  );
  const authorization=artifacts.authorization;
  const operationId=voidDatanetRegistryBroadcastOperationIdV1(authorization);
  if(
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
    record.authorized_at_utc!==authorization.authorized_at_utc||
    record.authorization_valid_until_utc!==authorization.valid_until_utc||
    record.observed_at_utc!==observation.observed_at_utc||
    record.observation_valid_until_utc!==observation.valid_until_utc||
    canonicalJson(record.transaction_summary)!==
      canonicalJson(authorization.transaction_summary)
  ){
    throw new Error("registry_broadcast_consumption_record_lineage_mismatch");
  }

  if(
    !/^[0-9a-f]{64}$/u.test(String(record.state_store_realpath_sha256||""))||
    !/^(0|[1-9][0-9]*)$/u.test(String(record.state_store_root_dev||""))||
    !/^(0|[1-9][0-9]*)$/u.test(String(record.state_store_root_ino||""))||
    !Number.isFinite(Date.parse(String(record.consumed_at_utc||"")))
  ){
    throw new Error("registry_broadcast_consumption_record_state_binding_invalid");
  }
  return record;
}

export function consumeVoidDatanetRegistryBroadcastAuthorizationWithClocksV1(
  input,
  {entryNowMs,prepublishNowMs}={},
){
  return consumeCore(
    input,
    (stage)=>stage==="entry"?entryNowMs:prepublishNowMs,
  );
}
export function consumeVoidDatanetRegistryBroadcastAuthorizationWithClockV1(
  input,
  nowMs,
){
  return consumeVoidDatanetRegistryBroadcastAuthorizationWithClocksV1(
    input,
    {entryNowMs:nowMs,prepublishNowMs:nowMs},
  );
}
export function consumeVoidDatanetRegistryBroadcastAuthorizationV1(input){
  return consumeCore(input,()=>Date.now());
}
