import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  verifyDatanetContentCommitmentSovereignBroadcastAuthorizationAgainstFingerprintV1,
  verifyDatanetContentCommitmentSovereignBroadcastAuthorizationV1,
} from "./datanet-content-commitment-sovereign-broadcast-authorization-v1.mjs";
import {
  canonicalJson,
  sha256,
} from "./datanet-content-commitment-compiler-profile-v1.mjs";

export const VOID_DATANET_CONTENT_COMMITMENT_BROADCAST_AUTHORIZATION_CONSUMPTION_V1 =
  "VOID_DATANET_CONTENT_COMMITMENT_BROADCAST_AUTHORIZATION_CONSUMPTION_V1";

export const VOID_DATANET_CONTENT_COMMITMENT_BROADCAST_AUTHORIZATION_CONSUMPTION_AUTHORITY_V1 = {
  durable_single_use_broadcast_authorization_consumption:true,
  exact_broadcast_authorization_verification_required:true,
  runtime_expiry_recheck_required:true,
  private_existing_state_root_required:true,
  exact_state_store_realpath_scoped_replay_prevention:true,
  global_replay_prevention_claimed:false,
  canonical_broadcast_state_store_runtime_binding_still_required:true,
  immutable_consumption_record:true,
  filesystem_read:true,
  filesystem_mutation_one_consumption_record_may_occur:true,
  sovereign_private_key_access:false,
  raw_signed_transaction_access:false,
  opaque_custody_handle_access:false,
  broadcaster_access:false,
  rpc_call:false,
  transaction_broadcast_authorized_by_this_gate:false,
  transaction_broadcast_performed:false,
  chain2050_write_authorized:false,
  chain2050_write_performed:false,
  validator_mutation:false,
  governance_mutation:false,
  work_credit_mutation:false,
  service_action:false,
  funds_action:false,
  automatic_retry:false,
};

const BROADCAST_AUTHORIZATION_ID=/^voiddccba1_[0-9a-f]{64}$/;
const BROADCAST_AUTHORIZATION_VERIFICATION_ID=/^voiddccbav1_[0-9a-f]{64}$/;
const OPAQUE_RECEIPT_VERIFICATION_ID=/^voiddccosrv1_[0-9a-f]{64}$/;
const OPAQUE_RECEIPT_ID=/^voiddccosr1_[0-9a-f]{64}$/;
const SIGNING_REQUEST_ID=/^voiddccpsreq1_[0-9a-f]{64}$/;
const SIGNING_AUTHORIZATION_ID=/^voiddccsta1_[0-9a-f]{64}$/;
const SIGNING_CONSUMPTION_ID=/^voiddccstac1_[0-9a-f]{64}$/;
const FINAL_REVIEW_ID=/^voiddccfsrp1_[0-9a-f]{64}$/;
const BROADCAST_CONSUMPTION_ID=/^voiddccbac1_[0-9a-f]{64}$/;
const SHA256=/^[0-9a-f]{64}$/;
const HASH=/^0x[0-9a-f]{64}$/;
const ADDRESS=/^0x[0-9a-f]{40}$/;
const MAX_RECORD_BYTES=64*1024;

function text(value){
  return typeof value==="string"?value.trim():"";
}
function plain(value){
  return value!==null&&typeof value==="object"&&!Array.isArray(value);
}
function held(reason,options={}){
  return {
    ok:false,
    marker:
      VOID_DATANET_CONTENT_COMMITMENT_BROADCAST_AUTHORIZATION_CONSUMPTION_V1,
    version:1,
    status:"held",
    reason,
    broadcast_authorization_id:
      options.broadcast_authorization_id??null,
    broadcast_authorization_verification_id:
      options.broadcast_authorization_verification_id??null,
    state_store_realpath_sha256:
      options.state_store_realpath_sha256??null,
    broadcast_authorization_consumed:false,
    sovereign_private_key_access_performed:false,
    raw_signed_transaction_accessed:false,
    opaque_custody_handle_accessed:false,
    broadcaster_access_performed:false,
    rpc_call_performed:false,
    transaction_broadcast_performed:false,
    chain2050_write_performed:false,
    authority:
      VOID_DATANET_CONTENT_COMMITMENT_BROADCAST_AUTHORIZATION_CONSUMPTION_AUTHORITY_V1,
    ...(options.detail?{detail:options.detail}:{}),
  };
}
function safeErrorClass(error){
  const raw=text(error?.name||"Error");
  return /^[A-Za-z0-9._:-]{1,80}$/.test(raw)?raw:"Error";
}
function canonicalUtcFromMs(value){
  if(!Number.isSafeInteger(value)||value<=0)return "";
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
      throw new Error("broadcast_authorization_consumption_symlink_ancestor_rejected");
    }
  }
}
function validatePrivateStateRoot(raw){
  const supplied=text(raw);
  if(!supplied||!path.isAbsolute(supplied)){
    return {
      ok:false,
      reason:"broadcast_authorization_consumption_state_root_must_be_absolute",
    };
  }
  const resolved=path.resolve(supplied);
  try{
    assertNoSymlinkAncestors(resolved);
    const stat=fs.lstatSync(resolved);
    if(!stat.isDirectory()||stat.isSymbolicLink()){
      return {
        ok:false,
        reason:"broadcast_authorization_consumption_state_root_not_direct_directory",
      };
    }
    if(typeof process.getuid==="function"&&stat.uid!==process.getuid()){
      return {
        ok:false,
        reason:"broadcast_authorization_consumption_state_root_owner_mismatch",
      };
    }
    if((stat.mode&0o777)!==0o700){
      return {
        ok:false,
        reason:"broadcast_authorization_consumption_state_root_mode_must_be_0700",
      };
    }
    const real=fs.realpathSync(resolved);
    if(real!==resolved){
      return {
        ok:false,
        reason:"broadcast_authorization_consumption_state_root_realpath_mismatch",
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
      reason:"broadcast_authorization_consumption_state_root_invalid",
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
  const dir=path.join(root,"broadcast-consumed");
  try{
    const stat=fs.lstatSync(dir);
    if(!stat.isDirectory()||stat.isSymbolicLink()){
      throw new Error(
        "broadcast_authorization_consumption_consumed_dir_not_direct_directory",
      );
    }
    if(typeof process.getuid==="function"&&stat.uid!==process.getuid()){
      throw new Error(
        "broadcast_authorization_consumption_consumed_dir_owner_mismatch",
      );
    }
    if((stat.mode&0o777)!==0o700){
      throw new Error(
        "broadcast_authorization_consumption_consumed_dir_mode_must_be_0700",
      );
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
function assertPrivateRecord(file){
  const stat=fs.lstatSync(file);
  if(!stat.isFile()||stat.isSymbolicLink()){
    throw new Error(
      "broadcast_authorization_consumption_record_not_direct_file",
    );
  }
  if(typeof process.getuid==="function"&&stat.uid!==process.getuid()){
    throw new Error(
      "broadcast_authorization_consumption_record_owner_mismatch",
    );
  }
  if((stat.mode&0o777)!==0o600){
    throw new Error(
      "broadcast_authorization_consumption_record_mode_must_be_0600",
    );
  }
  if(stat.size<2||stat.size>MAX_RECORD_BYTES){
    throw new Error(
      "broadcast_authorization_consumption_record_size_invalid",
    );
  }
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
    throw new Error(
      "broadcast_authorization_consumption_record_too_large",
    );
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
function validateVerifiedAuthorization(value){
  if(
    !plain(value)||
    value.ok!==true||
    value.marker!==
      "VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_BROADCAST_AUTHORIZATION_V1"||
    value.version!==1||
    value.status!==
      "exact_signed_transaction_broadcast_authorization_verified_unconsumed"||
    text(value.chain_id)!=="2050"||
    !BROADCAST_AUTHORIZATION_ID.test(text(value.broadcast_authorization_id))||
    !BROADCAST_AUTHORIZATION_VERIFICATION_ID.test(
      text(value.broadcast_authorization_verification_id),
    )||
    !OPAQUE_RECEIPT_VERIFICATION_ID.test(
      text(value.opaque_signed_receipt_verification_id),
    )||
    !OPAQUE_RECEIPT_ID.test(text(value.opaque_signed_receipt_id))||
    !SIGNING_REQUEST_ID.test(text(value.signing_request_id))||
    !SIGNING_AUTHORIZATION_ID.test(text(value.signing_authorization_id))||
    !SIGNING_CONSUMPTION_ID.test(text(value.consumption_record_id))||
    !FINAL_REVIEW_ID.test(text(value.final_signing_review_preflight_id))||
    !SHA256.test(text(value.external_signing_idempotency_key_sha256))||
    !SHA256.test(text(value.unsigned_transaction_candidate_fingerprint_sha256))||
    !ADDRESS.test(text(value.publisher_address))||
    !HASH.test(text(value.signed_transaction_hash))||
    !SHA256.test(text(value.custody_handle_fingerprint_sha256))||
    !SHA256.test(text(value.signer_public_key_der_sha256))||
    value.authorization?.sovereign_signature_verified!==true||
    value.authorization?.exact_signed_transaction_broadcast_approved!==true||
    value.authorization?.single_use!==true||
    value.authorization?.authorization_consumed!==false||
    value.authorization?.consumption_record_present!==false||
    value.authorization?.durable_consumption_before_broadcaster_access_required!==true||
    value.authorization?.runtime_expiry_recheck_before_broadcast_required!==true||
    value.authorization?.replay_prevention_enforced_by_this_verifier!==false||
    value.authority?.authorization_evidence_only!==true||
    value.authority?.exact_signed_transaction_broadcast_permitted_by_sovereign!==true||
    value.authority?.sovereign_private_key_access_performed!==false||
    value.authority?.raw_signed_transaction_accessed!==false||
    value.authority?.broadcaster_access_performed!==false||
    value.authority?.transaction_broadcast_performed!==false||
    value.authority?.chain2050_write_performed!==false||
    value.authority?.filesystem_mutation_performed!==false||
    value.exact_signed_transaction_broadcast_authorization_verified!==true||
    value.sovereign_private_key_access_performed!==false||
    value.raw_signed_transaction_accessed!==false||
    value.broadcaster_access_performed!==false||
    value.transaction_broadcast_performed!==false||
    value.chain2050_write_performed!==false||
    value.filesystem_mutation_performed!==false||
    text(value.next_gate)!==
      "durable_single_use_broadcast_authorization_consumption_before_broadcaster_access_v1"
  ){
    return {
      ok:false,
      reason:"broadcast_authorization_consumption_verified_authorization_invalid",
    };
  }
  const issuedMs=Date.parse(text(value.issued_at_utc));
  const expiresMs=Date.parse(text(value.expires_at_utc));
  if(
    !Number.isFinite(issuedMs)||
    !Number.isFinite(expiresMs)||
    expiresMs<=issuedMs||
    expiresMs-issuedMs>300_000
  ){
    return {
      ok:false,
      reason:"broadcast_authorization_consumption_verified_time_window_invalid",
    };
  }
  return {
    ok:true,
    broadcast_authorization_id:text(value.broadcast_authorization_id),
    broadcast_authorization_verification_id:
      text(value.broadcast_authorization_verification_id),
    opaque_signed_receipt_verification_id:
      text(value.opaque_signed_receipt_verification_id),
    opaque_signed_receipt_id:text(value.opaque_signed_receipt_id),
    signing_request_id:text(value.signing_request_id),
    signing_authorization_id:text(value.signing_authorization_id),
    signing_consumption_record_id:text(value.consumption_record_id),
    final_signing_review_preflight_id:
      text(value.final_signing_review_preflight_id),
    external_signing_idempotency_key_sha256:
      text(value.external_signing_idempotency_key_sha256),
    unsigned_transaction_candidate_fingerprint_sha256:
      text(value.unsigned_transaction_candidate_fingerprint_sha256),
    publisher_address:text(value.publisher_address),
    signed_transaction_hash:text(value.signed_transaction_hash),
    custody_handle_fingerprint_sha256:
      text(value.custody_handle_fingerprint_sha256),
    signed_at_utc:text(value.signed_at_utc),
    signer_public_key_der_sha256:
      text(value.signer_public_key_der_sha256),
    issued_at_utc:text(value.issued_at_utc),
    expires_at_utc:text(value.expires_at_utc),
    issued_ms:issuedMs,
    expires_ms:expiresMs,
  };
}

export function consumeDatanetContentCommitmentBroadcastAuthorizationAgainstFingerprintWithClockV1(
  input,
  expectedSovereignFingerprint,
  nowMs,
){
  let verifiedRaw;
  try{
    verifiedRaw=
      verifyDatanetContentCommitmentSovereignBroadcastAuthorizationAgainstFingerprintV1(
        {
          signing_request:input?.signing_request,
          opaque_signed_receipt:input?.opaque_signed_receipt,
          authorization_envelope:input?.authorization_envelope,
        },
        expectedSovereignFingerprint,
      );
  }catch(error){
    return held(
      "broadcast_authorization_consumption_verifier_failed",
      {detail:{error_class:safeErrorClass(error)}},
    );
  }
  if(verifiedRaw?.ok===false){
    return held(
      "broadcast_authorization_consumption_authorization_held:"+
        text(verifiedRaw.reason),
    );
  }
  const verified=validateVerifiedAuthorization(verifiedRaw);
  if(verified.ok===false)return held(verified.reason);

  if(!Number.isSafeInteger(nowMs)||nowMs<=0){
    return held(
      "broadcast_authorization_consumption_clock_invalid",
      {
        broadcast_authorization_id:
          verified.broadcast_authorization_id,
        broadcast_authorization_verification_id:
          verified.broadcast_authorization_verification_id,
      },
    );
  }
  if(nowMs<verified.issued_ms){
    return held(
      "broadcast_authorization_consumption_not_yet_valid",
      {
        broadcast_authorization_id:
          verified.broadcast_authorization_id,
        broadcast_authorization_verification_id:
          verified.broadcast_authorization_verification_id,
      },
    );
  }
  if(nowMs>=verified.expires_ms){
    return held(
      "broadcast_authorization_consumption_expired",
      {
        broadcast_authorization_id:
          verified.broadcast_authorization_id,
        broadcast_authorization_verification_id:
          verified.broadcast_authorization_verification_id,
      },
    );
  }

  const root=validatePrivateStateRoot(input?.state_dir);
  if(root.ok===false){
    return held(
      root.reason,
      {
        broadcast_authorization_id:
          verified.broadcast_authorization_id,
        broadcast_authorization_verification_id:
          verified.broadcast_authorization_verification_id,
        ...(root.detail?{detail:root.detail}:{}),
      },
    );
  }

  let consumedDir;
  try{
    consumedDir=ensurePrivateConsumedDirectory(root.realpath);
  }catch(error){
    return held(
      "broadcast_authorization_consumption_store_prepare_failed",
      {
        broadcast_authorization_id:
          verified.broadcast_authorization_id,
        broadcast_authorization_verification_id:
          verified.broadcast_authorization_verification_id,
        state_store_realpath_sha256:root.realpath_sha256,
        detail:{error_class:safeErrorClass(error)},
      },
    );
  }

  const material={
    marker:
      VOID_DATANET_CONTENT_COMMITMENT_BROADCAST_AUTHORIZATION_CONSUMPTION_V1,
    version:1,
    status:"broadcast_authorization_consumed_before_broadcaster_access",
    chain_id:"2050",
    broadcast_authorization_id:
      verified.broadcast_authorization_id,
    broadcast_authorization_verification_id:
      verified.broadcast_authorization_verification_id,
    opaque_signed_receipt_verification_id:
      verified.opaque_signed_receipt_verification_id,
    opaque_signed_receipt_id:
      verified.opaque_signed_receipt_id,
    signing_request_id:
      verified.signing_request_id,
    signing_authorization_id:
      verified.signing_authorization_id,
    signing_consumption_record_id:
      verified.signing_consumption_record_id,
    final_signing_review_preflight_id:
      verified.final_signing_review_preflight_id,
    external_signing_idempotency_key_sha256:
      verified.external_signing_idempotency_key_sha256,
    unsigned_transaction_candidate_fingerprint_sha256:
      verified.unsigned_transaction_candidate_fingerprint_sha256,
    publisher_address:
      verified.publisher_address,
    signed_transaction_hash:
      verified.signed_transaction_hash,
    custody_handle_fingerprint_sha256:
      verified.custody_handle_fingerprint_sha256,
    signed_at_utc:
      verified.signed_at_utc,
    signer_public_key_der_sha256:
      verified.signer_public_key_der_sha256,
    issued_at_utc:
      verified.issued_at_utc,
    expires_at_utc:
      verified.expires_at_utc,
    consumed_at_utc:
      canonicalUtcFromMs(nowMs),
    state_store_realpath_sha256:
      root.realpath_sha256,
    consumption:{
      single_use:true,
      authorization_consumed:true,
      immutable_consumption_record:true,
      replay_rejected_within_exact_state_store:true,
      replay_prevention_scope:"exact_state_store_realpath",
      global_replay_prevention_claimed:false,
      canonical_broadcast_state_store_runtime_binding_required:true,
      expiry_rechecked_at_consumption:true,
      consumption_precedes_any_broadcaster_access:true,
      signed_transaction_hash_bound:true,
      custody_handle_fingerprint_bound:true,
      raw_signed_transaction_remains_inaccessible:true,
      broadcaster_access_remains_disabled:true,
    },
    authority:{
      filesystem_mutation_performed:true,
      sovereign_private_key_access_performed:false,
      raw_signed_transaction_accessed:false,
      opaque_custody_handle_accessed:false,
      broadcaster_access_performed:false,
      rpc_call_performed:false,
      transaction_broadcast_authorized_by_this_gate:false,
      transaction_broadcast_performed:false,
      chain2050_write_authorized:false,
      chain2050_write_performed:false,
      validator_mutation_authorized:false,
      governance_mutation_authorized:false,
      work_credit_mutation_authorized:false,
      service_action_authorized:false,
      funds_action_authorized:false,
      automatic_retry_authorized:false,
    },
    next_gate:
      "exact_broadcaster_access_from_consumed_broadcast_authorization_v1",
  };
  const record={
    ...material,
    broadcast_consumption_record_id:
      "voiddccbac1_"+sha256(canonicalJson(material)),
  };
  if(
    !BROADCAST_CONSUMPTION_ID.test(
      record.broadcast_consumption_record_id,
    )
  ){
    return held(
      "broadcast_authorization_consumption_record_id_invalid",
      {
        broadcast_authorization_id:
          verified.broadcast_authorization_id,
        broadcast_authorization_verification_id:
          verified.broadcast_authorization_verification_id,
        state_store_realpath_sha256:root.realpath_sha256,
      },
    );
  }

  const file=path.join(
    consumedDir,
    verified.broadcast_authorization_id+".json",
  );
  let outcome;
  try{
    outcome=atomicCreateCanonicalJson(file,record);
  }catch(error){
    return held(
      "broadcast_authorization_consumption_atomic_publish_failed",
      {
        broadcast_authorization_id:
          verified.broadcast_authorization_id,
        broadcast_authorization_verification_id:
          verified.broadcast_authorization_verification_id,
        state_store_realpath_sha256:root.realpath_sha256,
        detail:{error_class:safeErrorClass(error)},
      },
    );
  }
  if(outcome==="exists"){
    return held(
      "broadcast_authorization_consumption_already_consumed",
      {
        broadcast_authorization_id:
          verified.broadcast_authorization_id,
        broadcast_authorization_verification_id:
          verified.broadcast_authorization_verification_id,
        state_store_realpath_sha256:root.realpath_sha256,
      },
    );
  }

  try{
    assertPrivateRecord(file);
    const stored=JSON.parse(fs.readFileSync(file,"utf8"));
    if(canonicalJson(stored)!==canonicalJson(record)){
      throw new Error(
        "broadcast_authorization_consumption_readback_mismatch",
      );
    }
  }catch(error){
    return held(
      "broadcast_authorization_consumption_readback_failed",
      {
        broadcast_authorization_id:
          verified.broadcast_authorization_id,
        broadcast_authorization_verification_id:
          verified.broadcast_authorization_verification_id,
        state_store_realpath_sha256:root.realpath_sha256,
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
    sovereign_private_key_access_performed:false,
    raw_signed_transaction_accessed:false,
    opaque_custody_handle_accessed:false,
    broadcaster_access_performed:false,
    rpc_call_performed:false,
    transaction_broadcast_performed:false,
    chain2050_write_performed:false,
    authority_contract:
      VOID_DATANET_CONTENT_COMMITMENT_BROADCAST_AUTHORIZATION_CONSUMPTION_AUTHORITY_V1,
  };
}

export function consumeDatanetContentCommitmentBroadcastAuthorizationWithClockV1(
  input,
  nowMs,
){
  let verifiedRaw;
  try{
    verifiedRaw=
      verifyDatanetContentCommitmentSovereignBroadcastAuthorizationV1({
        signing_request:input?.signing_request,
        opaque_signed_receipt:input?.opaque_signed_receipt,
        authorization_envelope:input?.authorization_envelope,
      });
  }catch(error){
    return held(
      "broadcast_authorization_consumption_verifier_failed",
      {detail:{error_class:safeErrorClass(error)}},
    );
  }
  if(verifiedRaw?.ok===false){
    return held(
      "broadcast_authorization_consumption_authorization_held:"+
        text(verifiedRaw.reason),
    );
  }
  return consumeDatanetContentCommitmentBroadcastAuthorizationAgainstFingerprintWithClockV1(
    input,
    verifiedRaw.signer_public_key_der_sha256,
    nowMs,
  );
}

export function consumeDatanetContentCommitmentBroadcastAuthorizationV1(input){
  return consumeDatanetContentCommitmentBroadcastAuthorizationWithClockV1(
    input,
    Date.now(),
  );
}
