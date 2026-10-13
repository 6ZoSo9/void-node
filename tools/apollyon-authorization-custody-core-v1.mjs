#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  canonicalApollyonOperatorAuthorizationJsonV1,
  verifyApollyonOperatorAuthorizationPacketV1,
} from "../scripts/apollyon_operator_authorization_packet_v1.mjs";

export const VOID_APOLLYON_AUTHORIZATION_CUSTODY_CORE_V1 =
  "VOID_APOLLYON_AUTHORIZATION_CUSTODY_CORE_V1";

export const VOID_APOLLYON_AUTHORIZATION_CUSTODY_CORE_AUTHORITY_V1 =
  Object.freeze({
    source_only_core:true,
    intended_for_dedicated_custody_uid:true,
    retained_root_descriptor:true,
    retained_consumed_descriptor:true,
    visible_path_identity_rechecked_each_operation:true,
    exact_v78_signature_reverification:true,
    create_only_authorization_record:true,
    duplicate_rejected_while_record_present:true,
    custody_uid_leaf_unlink_resistance_claimed:false,
    single_use_guaranteed_by_core:false,
    arbitrary_path_write:false,
    arbitrary_bytes_write:false,
    caller_selected_record_name:false,
    operator_private_key_access:false,
    production_signing:false,
    training_execution:false,
    attempt_claim:false,
    candidate_weight_mutation:false,
    generation_execution:false,
    wallet_access:false,
    transaction_signing:false,
    transaction_broadcast:false,
    funds_movement:false,
    network_access:false,
    service_started_by_import:false,
    af_unix_service_wrapper_required:true,
    host_cross_uid_qualification_required:true,
    host_cross_uid_qualification_performed:false,
    independent_custody_proven:false,
    production_gate_ready:false,
  });

const HASH64=/^[0-9a-f]{64}$/u;
const AUTHORIZATION_ID=/^apollyon_authz_v1:([0-9a-f]{64})$/u;
const GENERATION_ID=/^apollyon_custody_generation_v1:[0-9a-f]{64}$/u;
const RECORD_MARKER="VOID_APOLLYON_AUTHORIZATION_CUSTODY_RECORD_V1";
const MAX_RECORD_BYTES=64*1024;

function fail(code){
  throw new Error(code);
}

function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}

function canonical(value){
  return canonicalApollyonOperatorAuthorizationJsonV1(value);
}

function safeErrorClass(error){
  const value=String(error?.name||"Error");
  return /^[A-Za-z0-9._:-]{1,80}$/u.test(value)?value:"Error";
}

function canonicalAbsolutePath(value,code){
  if(typeof value!=="string"||!path.isAbsolute(value)||value.includes("\0")){
    fail(code);
  }
  const resolved=path.resolve(value);
  if(resolved!==value||resolved===path.parse(resolved).root){
    fail(code);
  }
  return resolved;
}

function sameDirectoryIdentity(a,b){
  return (
    a.dev===b.dev&&
    a.ino===b.ino&&
    a.uid===b.uid&&
    a.gid===b.gid&&
    a.mode===b.mode&&
    a.nlink===b.nlink
  );
}

function assertNoSymlinkAncestors(target,code){
  const parsed=path.parse(target);
  let cursor=parsed.root;
  for(const segment of target.slice(parsed.root.length).split(path.sep).filter(Boolean)){
    cursor=path.join(cursor,segment);
    const metadata=fs.lstatSync(cursor,{bigint:true});
    if(metadata.isSymbolicLink()) fail(code);
  }
}

function openPinnedDirectory(directory,mode,code){
  assertNoSymlinkAncestors(directory,code);
  const visible=fs.lstatSync(directory,{bigint:true});
  if(
    !visible.isDirectory()||
    visible.isSymbolicLink()||
    fs.realpathSync.native(directory)!==directory||
    (typeof process.getuid==="function"&&visible.uid!==BigInt(process.getuid()))||
    Number(visible.mode&0o777n)!==mode
  ){
    fail(code);
  }

  const fd=fs.openSync(
    directory,
    fs.constants.O_RDONLY|
      Number(fs.constants.O_DIRECTORY||0)|
      Number(fs.constants.O_NOFOLLOW||0),
  );
  try{
    const opened=fs.fstatSync(fd,{bigint:true});
    if(!opened.isDirectory()||!sameDirectoryIdentity(opened,visible)){
      fail(code);
    }
    return Object.freeze({
      fd,
      path:directory,
      proc_path:"/proc/self/fd/"+String(fd),
      identity:Object.freeze({
        dev:String(opened.dev),
        ino:String(opened.ino),
        uid:String(opened.uid),
        gid:String(opened.gid),
        mode:Number(opened.mode&0o777n),
        nlink:String(opened.nlink),
      }),
    });
  }catch(error){
    fs.closeSync(fd);
    throw error;
  }
}

function closePinnedDirectory(pinned){
  if(!pinned)return;
  try{
    fs.closeSync(pinned.fd);
  }catch(error){
    void error;
  }
}

function visibleDirectoryMatches(pinned,code){
  const visible=fs.lstatSync(pinned.path,{bigint:true});
  const opened=fs.fstatSync(pinned.fd,{bigint:true});
  if(
    !visible.isDirectory()||
    visible.isSymbolicLink()||
    fs.realpathSync.native(pinned.path)!==pinned.path||
    !sameDirectoryIdentity(opened,visible)
  ){
    fail(code);
  }
}

function fsyncDirectoryFd(fd){
  fs.fsyncSync(fd);
}

function recordFileName(authorizationId){
  const match=AUTHORIZATION_ID.exec(authorizationId);
  if(!match)fail("apollyon_custody_authorization_id_invalid");
  return match[1]+".json";
}

function recordProcPath(consumed,authorizationId){
  return path.join(consumed.proc_path,recordFileName(authorizationId));
}

function assertRecordFile(file){
  const metadata=fs.lstatSync(file,{bigint:true});
  if(
    !metadata.isFile()||
    metadata.isSymbolicLink()||
    metadata.nlink!==1n||
    (typeof process.getuid==="function"&&metadata.uid!==BigInt(process.getuid()))||
    Number(metadata.mode&0o777n)!==0o600||
    metadata.size<2n||
    metadata.size>BigInt(MAX_RECORD_BYTES)
  ){
    fail("apollyon_custody_record_metadata_invalid");
  }
}

function createCanonicalRecord(consumed,authorizationId,record){
  const file=recordProcPath(consumed,authorizationId);
  const bytes=Buffer.from(canonical(record)+"\n","utf8");
  if(bytes.length>MAX_RECORD_BYTES)fail("apollyon_custody_record_too_large");

  let fd;
  try{
    fd=fs.openSync(
      file,
      fs.constants.O_WRONLY|
        fs.constants.O_CREAT|
        fs.constants.O_EXCL|
        Number(fs.constants.O_NOFOLLOW||0),
      0o600,
    );
  }catch(error){
    if(error?.code==="EEXIST")return "exists";
    throw error;
  }

  try{
    fs.fchmodSync(fd,0o600);
    fs.writeFileSync(fd,bytes);
    fs.fsyncSync(fd);
  }finally{
    fs.closeSync(fd);
  }
  fsyncDirectoryFd(consumed.fd);
  assertRecordFile(file);
  return "created";
}

function readCanonicalRecord(consumed,authorizationId){
  const file=recordProcPath(consumed,authorizationId);
  assertRecordFile(file);
  const fd=fs.openSync(
    file,
    fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0),
  );
  try{
    const before=fs.fstatSync(fd,{bigint:true});
    const bytes=fs.readFileSync(fd);
    const after=fs.fstatSync(fd,{bigint:true});
    const visible=fs.lstatSync(file,{bigint:true});
    if(
      before.dev!==after.dev||
      before.ino!==after.ino||
      before.size!==after.size||
      before.mtimeNs!==after.mtimeNs||
      before.ctimeNs!==after.ctimeNs||
      after.dev!==visible.dev||
      after.ino!==visible.ino||
      after.size!==visible.size||
      after.mtimeNs!==visible.mtimeNs||
      after.ctimeNs!==visible.ctimeNs||
      BigInt(bytes.length)!==after.size
    ){
      fail("apollyon_custody_record_changed_during_read");
    }
    const text=bytes.toString("utf8");
    const value=JSON.parse(text);
    if(canonical(value)+"\n"!==text){
      fail("apollyon_custody_record_not_canonical");
    }
    return Object.freeze(value);
  }finally{
    fs.closeSync(fd);
  }
}

function held(reason,context={},error=null){
  return Object.freeze({
    ok:false,
    marker:VOID_APOLLYON_AUTHORIZATION_CUSTODY_CORE_V1,
    version:1,
    status:"held",
    reason,
    custody_generation_id:context.custody_generation_id??null,
    authorization_id:context.authorization_id??null,
    record_sha256:context.record_sha256??null,
    authorization_custodied:false,
    attempt_claimed:false,
    training_execution_performed:false,
    candidate_weight_mutation_performed:false,
    generation_execution_performed:false,
    wallet_access_performed:false,
    transaction_signing_performed:false,
    transaction_broadcast_performed:false,
    funds_movement_performed:false,
    ...(error?{detail:{error_class:safeErrorClass(error)}}:{}),
  });
}

function exactRecordShape(record){
  if(
    !record||
    typeof record!=="object"||
    Array.isArray(record)||
    Object.keys(record).sort().join("\n")!==
      [
        "action",
        "authorization_id",
        "canonical_main",
        "canonical_tree",
        "corpus_sha256",
        "custody_generation_id",
        "custody_policy",
        "marker",
        "operator_public_key_raw_sha256",
        "parent_adapter_sha256",
        "request_sha256",
        "target_host",
        "version",
      ].sort().join("\n")||
    record.marker!==RECORD_MARKER||
    record.version!==1||
    !AUTHORIZATION_ID.test(record.authorization_id)||
    !GENERATION_ID.test(record.custody_generation_id)||
    !HASH64.test(record.operator_public_key_raw_sha256)||
    !HASH64.test(record.request_sha256)||
    !/^[0-9a-f]{40}$/u.test(record.canonical_main)||
    !/^[0-9a-f]{40}$/u.test(record.canonical_tree)||
    !HASH64.test(record.corpus_sha256)||
    !HASH64.test(record.parent_adapter_sha256)||
    record.target_host!=="Xiphos"||
    record.action!=="candidate_training_attempt_v1"||
    record.custody_policy?.one_authorization_record_only!==true||
    record.custody_policy?.automatic_retry_authorized!==false||
    record.custody_policy?.attempt_claimed!==false||
    record.custody_policy?.training_execution_performed!==false
  ){
    fail("apollyon_custody_record_invalid");
  }
  return record;
}

export function createApollyonAuthorizationCustodyCoreV1(options){
  const stateRoot=canonicalAbsolutePath(
    options?.state_root,
    "apollyon_custody_state_root_invalid",
  );
  const expectedFingerprint=String(
    options?.expected_operator_public_key_raw_sha256??"",
  );
  if(!HASH64.test(expectedFingerprint)){
    fail("apollyon_custody_operator_fingerprint_invalid");
  }
  if(!options?.operator_public_key){
    fail("apollyon_custody_operator_public_key_missing");
  }

  const root=openPinnedDirectory(
    stateRoot,
    0o700,
    "apollyon_custody_state_root_invalid",
  );
  let consumed=null;
  try{
    const consumedPath=path.join(root.proc_path,"consumed");
    const visibleConsumedPath=path.join(stateRoot,"consumed");
    const visible=fs.lstatSync(visibleConsumedPath,{bigint:true});
    if(
      !visible.isDirectory()||
      visible.isSymbolicLink()||
      (typeof process.getuid==="function"&&visible.uid!==BigInt(process.getuid()))||
      Number(visible.mode&0o777n)!==0o700
    ){
      fail("apollyon_custody_consumed_directory_invalid");
    }
    const fd=fs.openSync(
      consumedPath,
      fs.constants.O_RDONLY|
        Number(fs.constants.O_DIRECTORY||0)|
        Number(fs.constants.O_NOFOLLOW||0),
    );
    const opened=fs.fstatSync(fd,{bigint:true});
    if(!opened.isDirectory()||!sameDirectoryIdentity(opened,visible)){
      fs.closeSync(fd);
      fail("apollyon_custody_consumed_directory_not_bound");
    }
    consumed=Object.freeze({
      fd,
      path:visibleConsumedPath,
      proc_path:"/proc/self/fd/"+String(fd),
      identity:Object.freeze({
        dev:String(opened.dev),
        ino:String(opened.ino),
        uid:String(opened.uid),
        gid:String(opened.gid),
        mode:Number(opened.mode&0o777n),
        nlink:String(opened.nlink),
      }),
    });

    const generationMaterial={
      marker:"VOID_APOLLYON_AUTHORIZATION_CUSTODY_GENERATION_V1",
      version:1,
      state_root:{
        dev:root.identity.dev,
        ino:root.identity.ino,
        uid:root.identity.uid,
        gid:root.identity.gid,
      },
      consumed_directory:{
        dev:consumed.identity.dev,
        ino:consumed.identity.ino,
        uid:consumed.identity.uid,
        gid:consumed.identity.gid,
      },
    };
    const custodyGenerationId=
      "apollyon_custody_generation_v1:"+sha256(canonical(generationMaterial));

    let closed=false;

    function assertOpen(){
      if(closed)fail("apollyon_custody_core_closed");
    }

    function assertStable(){
      assertOpen();
      visibleDirectoryMatches(root,"apollyon_custody_visible_root_drift");
      visibleDirectoryMatches(
        consumed,
        "apollyon_custody_visible_consumed_directory_drift",
      );
    }

    function consume(packet){
      const nowMs=Date.now();
      let verified;
      try{
        assertStable();
        verified=verifyApollyonOperatorAuthorizationPacketV1(
          packet,
          {
            expectedOperatorPublicKeyRawSha256:expectedFingerprint,
            operatorPublicKey:options.operator_public_key,
            nowMs,
          },
        );
        assertStable();
      }catch(error){
        return held(
          String(error?.message||"apollyon_custody_verification_failed"),
          {custody_generation_id:custodyGenerationId},
          error,
        );
      }

      const context={
        custody_generation_id:custodyGenerationId,
        authorization_id:verified.authorization_id,
      };

      const record=Object.freeze({
        marker:RECORD_MARKER,
        version:1,
        custody_generation_id:custodyGenerationId,
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
        custody_policy:Object.freeze({
          one_authorization_record_only:true,
          automatic_retry_authorized:false,
          attempt_claimed:false,
          training_execution_performed:false,
        }),
      });
      exactRecordShape(record);
      const recordSha256=sha256(canonical(record)+"\n");
      context.record_sha256=recordSha256;

      let outcome;
      try{
        assertStable();
        outcome=createCanonicalRecord(consumed,verified.authorization_id,record);
        assertStable();
      }catch(error){
        return held(
          "apollyon_custody_record_publish_failed",
          context,
          error,
        );
      }

      if(outcome==="exists"){
        let existing;
        try{
          existing=exactRecordShape(
            readCanonicalRecord(consumed,verified.authorization_id),
          );
        }catch(error){
          return held(
            "apollyon_custody_existing_record_invalid",
            context,
            error,
          );
        }
        const existingSha256=sha256(canonical(existing)+"\n");
        return Object.freeze({
          ok:false,
          marker:VOID_APOLLYON_AUTHORIZATION_CUSTODY_CORE_V1,
          version:1,
          status:"exists",
          reason:"apollyon_custody_authorization_already_recorded",
          custody_generation_id:custodyGenerationId,
          authorization_id:verified.authorization_id,
          record_sha256:existingSha256,
          exact_existing_record_matches:existingSha256===recordSha256,
          authorization_custodied:true,
          attempt_claimed:false,
          training_execution_performed:false,
          candidate_weight_mutation_performed:false,
          generation_execution_performed:false,
          wallet_access_performed:false,
          transaction_signing_performed:false,
          transaction_broadcast_performed:false,
          funds_movement_performed:false,
        });
      }

      return Object.freeze({
        ok:true,
        marker:VOID_APOLLYON_AUTHORIZATION_CUSTODY_CORE_V1,
        version:1,
        status:"authorization_custodied",
        custody_generation_id:custodyGenerationId,
        authorization_id:verified.authorization_id,
        record_sha256:recordSha256,
        authorization_custodied:true,
        duplicate_rejected_while_record_present:true,
        custody_uid_leaf_unlink_resistance_claimed:false,
        single_use_guaranteed_by_core:false,
        attempt_claimed:false,
        training_execution_performed:false,
        candidate_weight_mutation_performed:false,
        generation_execution_performed:false,
        wallet_access_performed:false,
        transaction_signing_performed:false,
        transaction_broadcast_performed:false,
        funds_movement_performed:false,
      });
    }

    function assertConsumed(authorizationId){
      try{
        assertStable();
        const record=exactRecordShape(
          readCanonicalRecord(consumed,authorizationId),
        );
        if(record.custody_generation_id!==custodyGenerationId){
          fail("apollyon_custody_record_generation_mismatch");
        }
        assertStable();
        return Object.freeze({
          ok:true,
          marker:VOID_APOLLYON_AUTHORIZATION_CUSTODY_CORE_V1,
          version:1,
          status:"authorization_custody_asserted",
          custody_generation_id:custodyGenerationId,
          authorization_id:record.authorization_id,
          record_sha256:sha256(canonical(record)+"\n"),
          authorization_custodied:true,
          attempt_claimed:false,
          training_execution_performed:false,
        });
      }catch(error){
        return held(
          String(error?.message||"apollyon_custody_assert_failed"),
          {
            custody_generation_id:custodyGenerationId,
            authorization_id:authorizationId,
          },
          error,
        );
      }
    }

    function close(){
      if(closed)return;
      closed=true;
      closePinnedDirectory(consumed);
      closePinnedDirectory(root);
    }

    return Object.freeze({
      marker:VOID_APOLLYON_AUTHORIZATION_CUSTODY_CORE_V1,
      version:1,
      custody_generation_id:custodyGenerationId,
      consume,
      assertConsumed,
      close,
      authority:VOID_APOLLYON_AUTHORIZATION_CUSTODY_CORE_AUTHORITY_V1,
    });
  }catch(error){
    closePinnedDirectory(consumed);
    closePinnedDirectory(root);
    throw error;
  }
}
