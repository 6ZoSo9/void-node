#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  canonicalApollyonOperatorAuthorizationJsonV1,
  verifyApollyonOperatorAuthorizationPacketV1,
} from "../scripts/apollyon_operator_authorization_packet_v1.mjs";

export const VOID_APOLLYON_OPERATOR_AUTHORIZATION_CONSUMPTION_V1 =
  "VOID_APOLLYON_OPERATOR_AUTHORIZATION_CONSUMPTION_V1";

export const VOID_APOLLYON_OPERATOR_AUTHORIZATION_CONSUMPTION_AUTHORITY_V1 =
  Object.freeze({
    durable_consumption_evidence:true,
    exact_signed_authorization_reverification_required:true,
    runtime_expiry_recheck_required:true,
    private_existing_state_root_required:true,
    duplicate_rejected_while_consumption_slot_intact:true,
    same_realpath_replacement_is_new_store_generation:true,
    same_uid_namespace_tamper_resistance_claimed:false,
    single_use_guaranteed_by_this_gate:false,
    global_replay_prevention_claimed:false,
    canonical_state_store_runtime_binding_still_required:true,
    immutable_consumption_record:true,
    filesystem_read:true,
    filesystem_mutation_store_identity_and_one_consumption_record_may_occur:true,
    operator_private_key_access:false,
    production_signing:false,
    attempt_claim_authorized_by_this_gate:false,
    attempt_claimed:false,
    training_execution_authorized_by_this_gate:false,
    training_execution_performed:false,
    candidate_weight_mutation_performed:false,
    generation_execution_performed:false,
    wallet_access:false,
    transaction_signing:false,
    transaction_broadcast:false,
    funds_movement:false,
    repository_merge:false,
    runtime_service_mutation:false,
    network_access:false,
    automatic_retry:false,
  });

const AUTHORIZATION_ID=/^apollyon_authz_v1:([0-9a-f]{64})$/u;
const CONSUMPTION_ID=/^apollyon_authz_consumption_v1:[0-9a-f]{64}$/u;
const STORE_ID=/^apollyon_authz_store_v1:[0-9a-f]{64}$/u;
const STORE_ID_FILE=".apollyon-authorization-consumption-store-v1.json";
const STORE_ID_MARKER="VOID_APOLLYON_AUTHORIZATION_CONSUMPTION_STORE_V1";
const MAX_RECORD_BYTES=64*1024;

function text(value){
  return typeof value==="string"?value:"";
}

function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}

function canonicalUtcFromMs(value){
  if(!Number.isSafeInteger(value)||value<=0)return "";
  return new Date(value).toISOString();
}

function safeErrorClass(error){
  const raw=text(error?.name||"Error");
  return /^[A-Za-z0-9._:-]{1,80}$/u.test(raw)?raw:"Error";
}

function held(reason,options={}){
  return {
    ok:false,
    marker:VOID_APOLLYON_OPERATOR_AUTHORIZATION_CONSUMPTION_V1,
    version:1,
    status:"held",
    reason,
    authorization_id:options.authorization_id??null,
    state_store_realpath_sha256:options.state_store_realpath_sha256??null,
    state_store_generation_id:options.state_store_generation_id??null,
    state_store_generation_sha256:options.state_store_generation_sha256??null,
    authorization_consumed:false,
    attempt_claimed:false,
    training_execution_performed:false,
    candidate_weight_mutation_performed:false,
    generation_execution_performed:false,
    operator_private_key_access_performed:false,
    production_signing_performed:false,
    wallet_access_performed:false,
    transaction_signing_performed:false,
    transaction_broadcast_performed:false,
    funds_movement_performed:false,
    repository_merge_performed:false,
    runtime_service_mutation_performed:false,
    network_access_performed:false,
    authority:
      VOID_APOLLYON_OPERATOR_AUTHORIZATION_CONSUMPTION_AUTHORITY_V1,
    ...(options.detail?{detail:options.detail}:{}),
  };
}

function classifyVerificationError(error){
  const message=text(error?.message);
  if(message==="authorization expired"){
    return "authorization_consumption_expired";
  }
  if(message==="authorization not yet valid"){
    return "authorization_consumption_not_yet_valid";
  }
  return "authorization_consumption_verifier_failed";
}

function assertNoSymlinkAncestors(target){
  const resolved=path.resolve(target);
  const parsed=path.parse(resolved);
  let cursor=parsed.root;
  const relative=resolved.slice(parsed.root.length);
  for(const segment of relative.split(path.sep).filter(Boolean)){
    cursor=path.join(cursor,segment);
    const metadata=fs.lstatSync(cursor);
    if(metadata.isSymbolicLink()){
      throw new Error("authorization_consumption_symlink_ancestor_rejected");
    }
  }
}

function validatePrivateStateRoot(raw){
  const supplied=text(raw);
  if(!supplied||!path.isAbsolute(supplied)){
    return {
      ok:false,
      reason:"authorization_consumption_state_root_must_be_absolute",
    };
  }
  const resolved=path.resolve(supplied);
  try{
    assertNoSymlinkAncestors(resolved);
    const metadata=fs.lstatSync(resolved);
    if(!metadata.isDirectory()||metadata.isSymbolicLink()){
      return {
        ok:false,
        reason:"authorization_consumption_state_root_not_direct_directory",
      };
    }
    if(
      typeof process.getuid==="function" &&
      metadata.uid!==process.getuid()
    ){
      return {
        ok:false,
        reason:"authorization_consumption_state_root_owner_mismatch",
      };
    }
    if((metadata.mode&0o777)!==0o700){
      return {
        ok:false,
        reason:"authorization_consumption_state_root_mode_must_be_0700",
      };
    }
    const real=fs.realpathSync(resolved);
    if(real!==resolved){
      return {
        ok:false,
        reason:"authorization_consumption_state_root_realpath_mismatch",
      };
    }
    return {
      ok:true,
      realpath:real,
      realpath_sha256:sha256(real),
    };
  }catch(error){
    return {
      ok:false,
      reason:"authorization_consumption_state_root_invalid",
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

function ensurePrivateConsumedDirectory(root){
  const directory=path.join(root,"consumed");
  try{
    const metadata=fs.lstatSync(directory);
    if(!metadata.isDirectory()||metadata.isSymbolicLink()){
      throw new Error("authorization_consumption_consumed_dir_not_direct_directory");
    }
    if(
      typeof process.getuid==="function" &&
      metadata.uid!==process.getuid()
    ){
      throw new Error("authorization_consumption_consumed_dir_owner_mismatch");
    }
    if((metadata.mode&0o777)!==0o700){
      throw new Error("authorization_consumption_consumed_dir_mode_must_be_0700");
    }
  }catch(error){
    if(error?.code!=="ENOENT")throw error;
    fs.mkdirSync(directory,{recursive:false,mode:0o700});
    fs.chmodSync(directory,0o700);
    fsyncDirectory(root);
  }
  assertNoSymlinkAncestors(directory);
  return directory;
}

function assertPrivateRecord(file){
  const metadata=fs.lstatSync(file);
  if(!metadata.isFile()||metadata.isSymbolicLink()){
    throw new Error("authorization_consumption_record_not_direct_file");
  }
  if(
    typeof process.getuid==="function" &&
    metadata.uid!==process.getuid()
  ){
    throw new Error("authorization_consumption_record_owner_mismatch");
  }
  if((metadata.mode&0o777)!==0o600){
    throw new Error("authorization_consumption_record_mode_must_be_0600");
  }
  if(metadata.size<2||metadata.size>MAX_RECORD_BYTES){
    throw new Error("authorization_consumption_record_size_invalid");
  }
}

function atomicCreateCanonicalJson(file,value){
  const parent=path.dirname(file);
  const temporary=path.join(
    parent,
    "."+path.basename(file)+".tmp-"+String(process.pid)+"-"+
      crypto.randomBytes(8).toString("hex"),
  );
  const bytes=Buffer.from(
    canonicalApollyonOperatorAuthorizationJsonV1(value)+"\n",
    "utf8",
  );
  if(bytes.length>MAX_RECORD_BYTES){
    throw new Error("authorization_consumption_record_too_large");
  }

  const fd=fs.openSync(temporary,"wx",0o600);
  try{
    fs.fchmodSync(fd,0o600);
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

function sameRecordMeta(a,b){
  return a.dev===b.dev&&a.ino===b.ino&&a.size===b.size&&
    a.mtimeMs===b.mtimeMs&&a.ctimeMs===b.ctimeMs;
}

function readStateStoreGeneration(root){
  const file=path.join(root,STORE_ID_FILE);
  assertPrivateRecord(file);
  const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
  try{
    const before=fs.fstatSync(fd);
    const bytes=fs.readFileSync(fd);
    const after=fs.fstatSync(fd);
    const visible=fs.lstatSync(file);
    if(!sameRecordMeta(before,after)||!sameRecordMeta(after,visible)){
      throw new Error("authorization_consumption_store_identity_changed");
    }
    const value=JSON.parse(bytes.toString("utf8"));
    if(
      !value||typeof value!=="object"||Array.isArray(value)||
      Object.keys(value).sort().join("\n")!=="marker\nstore_id\nversion"||
      value.marker!==STORE_ID_MARKER||
      value.version!==1||
      !STORE_ID.test(value.store_id)||
      canonicalApollyonOperatorAuthorizationJsonV1(value)+"\n"!==bytes.toString("utf8")
    ){
      throw new Error("authorization_consumption_store_identity_invalid");
    }
    return Object.freeze({...value});
  }finally{
    fs.closeSync(fd);
  }
}

function ensureStateStoreGeneration(root){
  try{
    return readStateStoreGeneration(root);
  }catch(error){
    if(error?.code!=="ENOENT")throw error;
  }
  const candidate={
    marker:STORE_ID_MARKER,
    version:1,
    store_id:"apollyon_authz_store_v1:"+crypto.randomBytes(32).toString("hex"),
  };
  const outcome=atomicCreateCanonicalJson(path.join(root,STORE_ID_FILE),candidate);
  if(outcome!=="created"&&outcome!=="exists"){
    throw new Error("authorization_consumption_store_identity_publish_failed");
  }
  return readStateStoreGeneration(root);
}

function readClock(clock){
  const value=clock();
  if(!Number.isSafeInteger(value)||value<=0){
    throw new Error("authorization_consumption_clock_invalid");
  }
  return value;
}

function consumeInternal(
  input,
  expectedOperatorPublicKeyRawSha256,
  operatorPublicKey,
  clock,
){
  let entryNow;
  try{
    entryNow=readClock(clock);
  }catch(error){
    return held(
      "authorization_consumption_clock_invalid",
      {detail:{error_class:safeErrorClass(error)}},
    );
  }

  let verified;
  try{
    verified=verifyApollyonOperatorAuthorizationPacketV1(
      input?.packet,
      {
        expectedOperatorPublicKeyRawSha256,
        operatorPublicKey,
        nowMs:entryNow,
      },
    );
  }catch(error){
    return held(
      classifyVerificationError(error),
      {detail:{error_class:safeErrorClass(error)}},
    );
  }

  const match=AUTHORIZATION_ID.exec(verified.authorization_id);
  if(!match){
    return held("authorization_consumption_authorization_id_invalid");
  }

  const root=validatePrivateStateRoot(input?.state_dir);
  if(root.ok===false){
    return held(
      root.reason,
      {
        authorization_id:verified.authorization_id,
        ...(root.detail?{detail:root.detail}:{}),
      },
    );
  }

  let storeGeneration;
  try{
    storeGeneration=ensureStateStoreGeneration(root.realpath);
  }catch(error){
    return held(
      "authorization_consumption_store_identity_failed",
      {
        authorization_id:verified.authorization_id,
        state_store_realpath_sha256:root.realpath_sha256,
        detail:{error_class:safeErrorClass(error)},
      },
    );
  }
  const storeContext={
    authorization_id:verified.authorization_id,
    state_store_realpath_sha256:root.realpath_sha256,
    state_store_generation_id:storeGeneration.store_id,
    state_store_generation_sha256:
      sha256(root.realpath+"\n"+storeGeneration.store_id),
  };

  let consumedDirectory;
  try{
    consumedDirectory=ensurePrivateConsumedDirectory(root.realpath);
  }catch(error){
    return held(
      "authorization_consumption_store_prepare_failed",
      {
        ...storeContext,
        detail:{error_class:safeErrorClass(error)},
      },
    );
  }

  let consumeNow;
  try{
    consumeNow=readClock(clock);
  }catch(error){
    return held(
      "authorization_consumption_clock_invalid_before_publish",
      {
        ...storeContext,
        detail:{error_class:safeErrorClass(error)},
      },
    );
  }

  const issuedMs=Date.parse(input.packet.payload.issued_at);
  const expiresMs=Date.parse(input.packet.payload.expires_at);
  if(consumeNow<issuedMs){
    return held(
      "authorization_consumption_not_yet_valid_before_publish",
      {
        ...storeContext,
      },
    );
  }
  if(consumeNow>=expiresMs){
    return held(
      "authorization_consumption_expired_before_publish",
      {
        ...storeContext,
      },
    );
  }

  const material={
    marker:VOID_APOLLYON_OPERATOR_AUTHORIZATION_CONSUMPTION_V1,
    version:1,
    status:"operator_authorization_consumption_recorded_for_candidate_training_attempt",
    authorization_id:verified.authorization_id,
    operator_public_key_raw_sha256:
      verified.operator_public_key_raw_sha256,
    target_host:verified.target_host,
    action:verified.action,
    request_sha256:verified.request_sha256,
    canonical_main:verified.canonical_main,
    canonical_tree:verified.canonical_tree,
    corpus_sha256:verified.corpus_sha256,
    parent_adapter_sha256:verified.parent_adapter_sha256,
    issued_at_utc:input.packet.payload.issued_at,
    expires_at_utc:input.packet.payload.expires_at,
    consumed_at_utc:canonicalUtcFromMs(consumeNow),
    state_store_realpath_sha256:root.realpath_sha256,
    state_store_generation_id:storeGeneration.store_id,
    state_store_generation_sha256:storeContext.state_store_generation_sha256,
    consumption:{
      single_use_guaranteed_by_this_gate:false,
      authorization_consumption_recorded:true,
      immutable_consumption_record:true,
      duplicate_rejected_while_consumption_slot_intact:true,
      replay_prevention_scope:"intact_consumption_slot_within_state_store_generation",
      same_realpath_replacement_is_new_store_generation:true,
      same_uid_namespace_tamper_resistance_claimed:false,
      global_replay_prevention_claimed:false,
      canonical_state_store_runtime_binding_required:true,
      signature_reverified_before_consumption:true,
      expiry_rechecked_at_consumption:true,
      consumption_precedes_attempt_claim:true,
      consumption_precedes_training_execution:true,
    },
    authority:{
      filesystem_mutation_performed:true,
      operator_private_key_access_performed:false,
      production_signing_performed:false,
      attempt_claim_authorized_by_this_gate:false,
      attempt_claimed:false,
      training_execution_authorized_by_this_gate:false,
      training_execution_performed:false,
      candidate_weight_mutation_performed:false,
      generation_execution_performed:false,
      wallet_access_performed:false,
      transaction_signing_performed:false,
      transaction_broadcast_performed:false,
      funds_movement_performed:false,
      repository_merge_performed:false,
      runtime_service_mutation_performed:false,
      network_access_performed:false,
      automatic_retry_performed:false,
    },
    next_gate:
      "candidate_training_attempt_claim_from_consumed_authorization_v1",
  };

  const record={
    ...material,
    consumption_record_id:
      "apollyon_authz_consumption_v1:"+
      sha256(canonicalApollyonOperatorAuthorizationJsonV1(material)),
  };
  if(!CONSUMPTION_ID.test(record.consumption_record_id)){
    return held(
      "authorization_consumption_record_id_invalid",
      {
        ...storeContext,
      },
    );
  }

  const file=path.join(consumedDirectory,match[1]+".json");
  let outcome;
  try{
    outcome=atomicCreateCanonicalJson(file,record);
  }catch(error){
    return held(
      "authorization_consumption_atomic_publish_failed",
      {
        ...storeContext,
        detail:{error_class:safeErrorClass(error)},
      },
    );
  }
  if(outcome==="exists"){
    return held(
      "authorization_consumption_already_consumed",
      {
        ...storeContext,
      },
    );
  }

  try{
    assertPrivateRecord(file);
    const stored=JSON.parse(fs.readFileSync(file,"utf8"));
    if(
      canonicalApollyonOperatorAuthorizationJsonV1(stored)!==
      canonicalApollyonOperatorAuthorizationJsonV1(record)
    ){
      throw new Error("authorization_consumption_readback_mismatch");
    }
  }catch(error){
    return held(
      "authorization_consumption_readback_failed",
      {
        ...storeContext,
        detail:{error_class:safeErrorClass(error)},
      },
    );
  }

  return {
    ok:true,
    ...record,
    durable_consumption_record_published:true,
    consumption_record_mode:"0600",
    state_store_directory_mode:"0700",
    authorization_consumption_recorded:true,
    authorization_single_use_guaranteed:false,
    attempt_claimed:false,
    training_execution_performed:false,
    candidate_weight_mutation_performed:false,
    generation_execution_performed:false,
    operator_private_key_access_performed:false,
    production_signing_performed:false,
    wallet_access_performed:false,
    transaction_signing_performed:false,
    transaction_broadcast_performed:false,
    funds_movement_performed:false,
    repository_merge_performed:false,
    runtime_service_mutation_performed:false,
    network_access_performed:false,
    authority_contract:
      VOID_APOLLYON_OPERATOR_AUTHORIZATION_CONSUMPTION_AUTHORITY_V1,
  };
}

export function consumeApollyonOperatorAuthorizationAgainstFingerprintWithClockV1(
  input,
  expectedOperatorPublicKeyRawSha256,
  operatorPublicKey,
  nowMs,
){
  return consumeInternal(
    input,
    expectedOperatorPublicKeyRawSha256,
    operatorPublicKey,
    ()=>nowMs,
  );
}

export function consumeApollyonOperatorAuthorizationV1(
  input,
  expectedOperatorPublicKeyRawSha256,
  operatorPublicKey,
){
  return consumeInternal(
    input,
    expectedOperatorPublicKeyRawSha256,
    operatorPublicKey,
    ()=>Date.now(),
  );
}
