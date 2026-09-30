#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  validateVoidDatanetRegistrySingleTransactionSigningAuthorizationV1,
} from "./void-datanet-registry-single-transaction-signing-authorization-v1.mjs";

export const VOID_DATANET_REGISTRY_SINGLE_USE_SIGNING_AUTHORIZATION_CONSUMPTION_V1 =
  "VOID_DATANET_REGISTRY_SINGLE_USE_SIGNING_AUTHORIZATION_CONSUMPTION_V1";

export const VOID_DATANET_REGISTRY_SINGLE_USE_SIGNING_AUTHORIZATION_CONSUMPTION_AUTHORITY_V1 =
  Object.freeze({
    durable_single_use_consumption:true,
    exact_authorization_rebuild_required:true,
    runtime_expiry_recheck_required:true,
    private_existing_state_root_required:true,
    exact_state_store_realpath_scoped_replay_prevention:true,
    immutable_consumption_record:true,
    filesystem_read:true,
    filesystem_mutation_one_consumption_record_may_occur:true,
    credential_access:false,
    private_key_access:false,
    signer_object_exposed:false,
    wallet_access:false,
    transaction_signer_access_authorized_by_this_gate:false,
    transaction_signing_performed:false,
    signed_transaction_export:false,
    transaction_submission:false,
    transaction_broadcast_authorized:false,
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

const AUTH_ID=/^voiddrsa1_[0-9a-f]{64}$/u;
const REQUEST_ID=/^voiddrsr1_[0-9a-f]{64}$/u;
const CANDIDATE_ID=/^voiddrtxc1_[0-9a-f]{64}$/u;
const CONSUMPTION_ID=/^voiddrsac1_[0-9a-f]{64}$/u;
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
function held(reason,options={}){
  return Object.freeze({
    ok:false,
    marker:
      VOID_DATANET_REGISTRY_SINGLE_USE_SIGNING_AUTHORIZATION_CONSUMPTION_V1,
    version:1,
    status:"held",
    reason,
    signing_authorization_id:options.signing_authorization_id??null,
    signing_request_id:options.signing_request_id??null,
    candidate_id:options.candidate_id??null,
    state_store_realpath_sha256:
      options.state_store_realpath_sha256??null,
    authorization_consumed:false,
    signer_object_exposed:false,
    credential_access_performed:false,
    private_key_access_performed:false,
    wallet_access_performed:false,
    transaction_signer_access_performed:false,
    transaction_signing_performed:false,
    signed_transaction_export_performed:false,
    transaction_submission_performed:false,
    transaction_broadcast_performed:false,
    deployment_performed:false,
    chain2050_write_performed:false,
    funds_movement_performed:false,
    authority:
      VOID_DATANET_REGISTRY_SINGLE_USE_SIGNING_AUTHORIZATION_CONSUMPTION_AUTHORITY_V1,
    ...(options.detail?{detail:options.detail}:{}),
  });
}
function safeErrorClass(error){
  const raw=String(error?.name||"Error");
  return /^[A-Za-z0-9._:-]{1,80}$/u.test(raw)?raw:"Error";
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
      throw new Error("registry_signing_consumption_symlink_ancestor_rejected");
    }
  }
}
function validatePrivateStateRoot(raw){
  const supplied=String(raw||"").trim();
  if(!supplied||!path.isAbsolute(supplied)){
    return {ok:false,reason:"registry_signing_consumption_state_root_must_be_absolute"};
  }
  const resolved=path.resolve(supplied);
  try{
    assertNoSymlinkAncestors(resolved);
    const stat=fs.lstatSync(resolved);
    if(!stat.isDirectory()||stat.isSymbolicLink()){
      return {ok:false,reason:"registry_signing_consumption_state_root_not_direct_directory"};
    }
    if(typeof process.getuid==="function"&&stat.uid!==process.getuid()){
      return {ok:false,reason:"registry_signing_consumption_state_root_owner_mismatch"};
    }
    if((stat.mode&0o777)!==0o700){
      return {ok:false,reason:"registry_signing_consumption_state_root_mode_must_be_0700"};
    }
    const real=fs.realpathSync(resolved);
    if(real!==resolved){
      return {ok:false,reason:"registry_signing_consumption_state_root_realpath_mismatch"};
    }
    return {ok:true,realpath:real,realpath_sha256:sha256(real)};
  }catch(error){
    return {
      ok:false,
      reason:"registry_signing_consumption_state_root_invalid",
      detail:{error_class:safeErrorClass(error)},
    };
  }
}
function fsyncDirectory(directory){
  const fd=fs.openSync(directory,"r");
  try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
}
function ensurePrivateConsumedDirectory(root){
  const dir=path.join(root,"consumed");
  try{
    const stat=fs.lstatSync(dir);
    if(!stat.isDirectory()||stat.isSymbolicLink()){
      throw new Error("registry_signing_consumption_consumed_dir_not_direct_directory");
    }
    if(typeof process.getuid==="function"&&stat.uid!==process.getuid()){
      throw new Error("registry_signing_consumption_consumed_dir_owner_mismatch");
    }
    if((stat.mode&0o777)!==0o700){
      throw new Error("registry_signing_consumption_consumed_dir_mode_must_be_0700");
    }
  }catch(error){
    if(error?.code!=="ENOENT") throw error;
    fs.mkdirSync(dir,{recursive:false,mode:0o700});
    fs.chmodSync(dir,0o700);
    fsyncDirectory(root);
  }
  assertNoSymlinkAncestors(dir);
  return dir;
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
    throw new Error("registry_signing_consumption_record_too_large");
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
      if(error?.code==="EEXIST") return "exists";
      throw error;
    }
  }finally{
    try{fs.unlinkSync(temporary);}catch(error){
      if(error?.code!=="ENOENT") throw error;
    }
  }
}
function assertPrivateRecord(file){
  const stat=fs.lstatSync(file);
  if(!stat.isFile()||stat.isSymbolicLink()){
    throw new Error("registry_signing_consumption_record_not_direct_file");
  }
  if(typeof process.getuid==="function"&&stat.uid!==process.getuid()){
    throw new Error("registry_signing_consumption_record_owner_mismatch");
  }
  if((stat.mode&0o777)!==0o600){
    throw new Error("registry_signing_consumption_record_mode_must_be_0600");
  }
  if(stat.size<2||stat.size>MAX_RECORD_BYTES){
    throw new Error("registry_signing_consumption_record_size_invalid");
  }
}

export function consumeVoidDatanetRegistrySigningAuthorizationWithClockV1(
  input,
  nowMs,
){
  let authorization;
  try{
    authorization=
      validateVoidDatanetRegistrySingleTransactionSigningAuthorizationV1(
        input?.signing_authorization,
        {
          signing_request:input?.signing_request,
          signing_request_evidence:input?.signing_request_evidence,
        },
      );
  }catch(error){
    return held("registry_signing_consumption_authorization_invalid",{
      detail:{error_class:safeErrorClass(error)},
    });
  }

  if(
    !AUTH_ID.test(String(authorization.signing_authorization_id||""))||
    !REQUEST_ID.test(String(authorization.signing_request_id||""))||
    !CANDIDATE_ID.test(String(authorization.candidate_id||""))||
    !SHA256.test(String(authorization.transaction_fingerprint_sha256||""))||
    authorization.signing_authorized!==true||
    authorization.signing_performed!==false||
    authorization.authorization_scope?.single_use!==true||
    authorization.authorization_scope?.signing_count_maximum!==1||
    authorization.authorization_scope
      ?.durable_consumption_before_signer_access_required!==true||
    authorization.authorization_scope
      ?.runtime_expiry_recheck_before_signer_access_required!==true||
    authorization.authority?.transaction_broadcast_authorized!==false||
    authorization.authority?.transaction_signing_performed!==false||
    authorization.authority?.private_key_access!==false
  ){
    return held("registry_signing_consumption_authorization_contract_invalid");
  }

  const authorizedMs=Date.parse(String(authorization.authorized_at_utc||""));
  const expiresMs=Date.parse(String(authorization.valid_until_utc||""));
  if(
    !Number.isSafeInteger(nowMs)||
    nowMs<=0||
    !Number.isFinite(authorizedMs)||
    !Number.isFinite(expiresMs)
  ){
    return held("registry_signing_consumption_clock_or_time_invalid",{
      signing_authorization_id:authorization.signing_authorization_id,
      signing_request_id:authorization.signing_request_id,
      candidate_id:authorization.candidate_id,
    });
  }
  if(nowMs<authorizedMs){
    return held("registry_signing_consumption_not_yet_valid",{
      signing_authorization_id:authorization.signing_authorization_id,
      signing_request_id:authorization.signing_request_id,
      candidate_id:authorization.candidate_id,
    });
  }
  if(nowMs>=expiresMs){
    return held("registry_signing_consumption_expired",{
      signing_authorization_id:authorization.signing_authorization_id,
      signing_request_id:authorization.signing_request_id,
      candidate_id:authorization.candidate_id,
    });
  }

  const root=validatePrivateStateRoot(input?.state_dir);
  if(root.ok===false){
    return held(root.reason,{
      signing_authorization_id:authorization.signing_authorization_id,
      signing_request_id:authorization.signing_request_id,
      candidate_id:authorization.candidate_id,
      ...(root.detail?{detail:root.detail}:{}),
    });
  }

  let consumedDir;
  try{
    consumedDir=ensurePrivateConsumedDirectory(root.realpath);
  }catch(error){
    return held("registry_signing_consumption_store_prepare_failed",{
      signing_authorization_id:authorization.signing_authorization_id,
      signing_request_id:authorization.signing_request_id,
      candidate_id:authorization.candidate_id,
      state_store_realpath_sha256:root.realpath_sha256,
      detail:{error_class:safeErrorClass(error)},
    });
  }

  const consumedAt=canonicalUtcFromMs(nowMs);
  const material={
    marker:
      VOID_DATANET_REGISTRY_SINGLE_USE_SIGNING_AUTHORIZATION_CONSUMPTION_V1,
    version:1,
    status:"AUTHORIZATION_CONSUMED_FOR_EXACT_REGISTRY_TRANSACTION_SIGNING",
    signing_authorization_id:authorization.signing_authorization_id,
    signing_request_id:authorization.signing_request_id,
    candidate_id:authorization.candidate_id,
    final_signing_review_id:authorization.final_signing_review_id,
    transaction_fingerprint_sha256:
      authorization.transaction_fingerprint_sha256,
    required_confirmation:authorization.required_confirmation,
    transaction_summary:authorization.transaction_summary,
    authorized_at_utc:authorization.authorized_at_utc,
    valid_until_utc:authorization.valid_until_utc,
    consumed_at_utc:consumedAt,
    state_store_realpath_sha256:root.realpath_sha256,
    consumption:{
      exact_single_transaction:true,
      signing_count_maximum:1,
      single_use:true,
      authorization_consumed:true,
      immutable_consumption_record:true,
      replay_rejected_within_exact_state_store:true,
      replay_prevention_scope:"exact_state_store_realpath",
      global_replay_prevention_claimed:false,
      canonical_state_store_runtime_binding_required:true,
      expiry_rechecked_at_consumption:true,
      consumption_precedes_any_signer_access:true,
    },
    authority:{
      filesystem_mutation_performed:true,
      credential_access_performed:false,
      private_key_access_performed:false,
      signer_object_exposed:false,
      wallet_access_performed:false,
      transaction_signer_access_authorized_by_this_gate:false,
      transaction_signer_access_performed:false,
      transaction_signing_performed:false,
      signed_transaction_export_performed:false,
      transaction_submission_performed:false,
      transaction_broadcast_authorized:false,
      transaction_broadcast_performed:false,
      deployment_authorized:false,
      deployment_performed:false,
      chain2050_write_authorized:false,
      chain2050_write_performed:false,
      validator_mutation_authorized:false,
      token_movement_authorized:false,
      funds_movement_performed:false,
      migration_authorized:false,
      public_activation_authorized:false,
      automatic_retry_authorized:false,
    },
    next_gate:
      "exact_nimo_registry_transaction_signing_from_consumed_authorization_v1",
  };
  const record={
    ...material,
    consumption_record_id:
      "voiddrsac1_"+sha256(Buffer.from(canonicalJson(material))),
  };
  if(!CONSUMPTION_ID.test(record.consumption_record_id)){
    return held("registry_signing_consumption_record_id_invalid",{
      signing_authorization_id:authorization.signing_authorization_id,
      signing_request_id:authorization.signing_request_id,
      candidate_id:authorization.candidate_id,
      state_store_realpath_sha256:root.realpath_sha256,
    });
  }

  const file=path.join(
    consumedDir,
    authorization.signing_authorization_id+".json",
  );
  let outcome;
  try{
    outcome=atomicCreateCanonicalJson(file,record);
  }catch(error){
    return held("registry_signing_consumption_atomic_publish_failed",{
      signing_authorization_id:authorization.signing_authorization_id,
      signing_request_id:authorization.signing_request_id,
      candidate_id:authorization.candidate_id,
      state_store_realpath_sha256:root.realpath_sha256,
      detail:{error_class:safeErrorClass(error)},
    });
  }
  if(outcome==="exists"){
    return held("registry_signing_consumption_already_consumed",{
      signing_authorization_id:authorization.signing_authorization_id,
      signing_request_id:authorization.signing_request_id,
      candidate_id:authorization.candidate_id,
      state_store_realpath_sha256:root.realpath_sha256,
    });
  }

  try{
    assertPrivateRecord(file);
    const stored=JSON.parse(fs.readFileSync(file,"utf8"));
    if(canonicalJson(stored)!==canonicalJson(record)){
      throw new Error("registry_signing_consumption_readback_mismatch");
    }
  }catch(error){
    return held("registry_signing_consumption_readback_failed",{
      signing_authorization_id:authorization.signing_authorization_id,
      signing_request_id:authorization.signing_request_id,
      candidate_id:authorization.candidate_id,
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
    signer_object_exposed:false,
    credential_access_performed:false,
    private_key_access_performed:false,
    wallet_access_performed:false,
    transaction_signer_access_performed:false,
    transaction_signing_performed:false,
    signed_transaction_export_performed:false,
    transaction_submission_performed:false,
    transaction_broadcast_performed:false,
    deployment_performed:false,
    chain2050_write_performed:false,
    funds_movement_performed:false,
    authority_contract:
      VOID_DATANET_REGISTRY_SINGLE_USE_SIGNING_AUTHORIZATION_CONSUMPTION_AUTHORITY_V1,
  });
}

export function consumeVoidDatanetRegistrySigningAuthorizationV1(input){
  return consumeVoidDatanetRegistrySigningAuthorizationWithClockV1(
    input,
    Date.now(),
  );
}
