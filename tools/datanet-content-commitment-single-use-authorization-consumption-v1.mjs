import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  verifyDatanetContentCommitmentSovereignSingleTransactionAuthorizationAgainstFingerprintV1,
  verifyDatanetContentCommitmentSovereignSingleTransactionAuthorizationV1,
} from "./datanet-content-commitment-sovereign-single-transaction-authorization-v1.mjs";
import {
  canonicalJson,
  sha256,
} from "./datanet-content-commitment-compiler-profile-v1.mjs";

export const VOID_DATANET_CONTENT_COMMITMENT_SINGLE_USE_AUTHORIZATION_CONSUMPTION_V1 =
  "VOID_DATANET_CONTENT_COMMITMENT_SINGLE_USE_AUTHORIZATION_CONSUMPTION_V1";

export const VOID_DATANET_CONTENT_COMMITMENT_SINGLE_USE_AUTHORIZATION_CONSUMPTION_AUTHORITY_V1 = {
  durable_single_use_consumption:true,
  exact_authorization_verification_required:true,
  runtime_expiry_recheck_required:true,
  private_existing_state_root_required:true,
  exact_state_store_realpath_scoped_replay_prevention:true,
  global_replay_prevention_claimed:false,
  canonical_state_store_runtime_binding_still_required:true,
  immutable_consumption_record:true,
  filesystem_read:true,
  filesystem_mutation_one_consumption_record_may_occur:true,
  sovereign_private_key_access:false,
  transaction_signer_access:false,
  signer_object_exposed:false,
  wallet_access:false,
  transaction_signing_authorized_by_this_gate:false,
  transaction_signing_performed:false,
  transaction_broadcast_authorized:false,
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

const AUTHORIZATION_ID=/^voiddccsta1_[0-9a-f]{64}$/;
const AUTHORIZATION_VERIFICATION_ID=/^voiddccstav1_[0-9a-f]{64}$/;
const FINAL_REVIEW_ID=/^voiddccfsrp1_[0-9a-f]{64}$/;
const PRE_SIGN_ID=/^voiddccpsr1_[0-9a-f]{64}$/;
const CREDENTIAL_BINDING_ID=/^voiddccpcb1_[0-9a-f]{64}$/;
const CONSUMPTION_ID=/^voiddccstac1_[0-9a-f]{64}$/;
const SHA256=/^[0-9a-f]{64}$/;
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
    marker:VOID_DATANET_CONTENT_COMMITMENT_SINGLE_USE_AUTHORIZATION_CONSUMPTION_V1,
    version:1,
    status:"held",
    reason,
    authorization_id:options.authorization_id??null,
    authorization_verification_id:options.authorization_verification_id??null,
    state_store_realpath_sha256:options.state_store_realpath_sha256??null,
    authorization_consumed:false,
    signer_object_exposed:false,
    transaction_signer_access_performed:false,
    wallet_access_performed:false,
    transaction_signing_performed:false,
    transaction_broadcast_performed:false,
    chain2050_write_performed:false,
    authority:
      VOID_DATANET_CONTENT_COMMITMENT_SINGLE_USE_AUTHORIZATION_CONSUMPTION_AUTHORITY_V1,
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
      throw new Error("authorization_consumption_symlink_ancestor_rejected");
    }
  }
}
function validatePrivateStateRoot(raw){
  const supplied=text(raw);
  if(!supplied||!path.isAbsolute(supplied)){
    return {ok:false,reason:"authorization_consumption_state_root_must_be_absolute"};
  }
  const resolved=path.resolve(supplied);
  try{
    assertNoSymlinkAncestors(resolved);
    const stat=fs.lstatSync(resolved);
    if(!stat.isDirectory()||stat.isSymbolicLink()){
      return {ok:false,reason:"authorization_consumption_state_root_not_direct_directory"};
    }
    if(typeof process.getuid==="function"&&stat.uid!==process.getuid()){
      return {ok:false,reason:"authorization_consumption_state_root_owner_mismatch"};
    }
    if((stat.mode&0o777)!==0o700){
      return {
        ok:false,
        reason:"authorization_consumption_state_root_mode_must_be_0700",
      };
    }
    const real=fs.realpathSync(resolved);
    if(real!==resolved){
      return {ok:false,reason:"authorization_consumption_state_root_realpath_mismatch"};
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
  const dir=path.join(root,"consumed");
  try{
    const stat=fs.lstatSync(dir);
    if(!stat.isDirectory()||stat.isSymbolicLink()){
      throw new Error("authorization_consumption_consumed_dir_not_direct_directory");
    }
    if(typeof process.getuid==="function"&&stat.uid!==process.getuid()){
      throw new Error("authorization_consumption_consumed_dir_owner_mismatch");
    }
    if((stat.mode&0o777)!==0o700){
      throw new Error("authorization_consumption_consumed_dir_mode_must_be_0700");
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
    throw new Error("authorization_consumption_record_not_direct_file");
  }
  if(typeof process.getuid==="function"&&stat.uid!==process.getuid()){
    throw new Error("authorization_consumption_record_owner_mismatch");
  }
  if((stat.mode&0o777)!==0o600){
    throw new Error("authorization_consumption_record_mode_must_be_0600");
  }
  if(stat.size<2||stat.size>MAX_RECORD_BYTES){
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
  const bytes=Buffer.from(canonicalJson(value)+"\n","utf8");
  if(bytes.length>MAX_RECORD_BYTES){
    throw new Error("authorization_consumption_record_too_large");
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
      "VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_SINGLE_TRANSACTION_AUTHORIZATION_V1"||
    value.version!==1||
    value.status!==
      "exact_single_transaction_sovereign_authorization_verified_unconsumed"||
    text(value.chain_id)!=="2050"||
    !AUTHORIZATION_ID.test(text(value.authorization_id))||
    !AUTHORIZATION_VERIFICATION_ID.test(text(value.authorization_verification_id))||
    !FINAL_REVIEW_ID.test(text(value.final_signing_review_preflight_id))||
    !PRE_SIGN_ID.test(text(value.fresh_pre_sign_revalidation_id))||
    !CREDENTIAL_BINDING_ID.test(text(value.fresh_credential_binding_id))||
    !SHA256.test(text(value.unsigned_transaction_candidate_fingerprint_sha256))||
    value.authorization?.sovereign_signature_verified!==true||
    value.authorization?.exact_single_transaction_signing_approved!==true||
    value.authorization?.single_use!==true||
    value.authorization?.authorization_consumed!==false||
    value.authorization?.consumption_record_present!==false||
    value.authorization?.durable_consumption_before_signing_required!==true||
    value.authorization?.runtime_expiry_recheck_before_signing_required!==true||
    value.authorization?.replay_prevention_enforced_by_this_verifier!==false||
    value.authority?.authorization_evidence_only!==true||
    value.authority?.exact_transaction_signing_permitted_by_sovereign!==true||
    value.authority?.sovereign_private_key_access_performed!==false||
    value.authority?.signer_object_exposed!==false||
    value.authority?.signer_access_performed!==false||
    value.authority?.wallet_access_performed!==false||
    value.authority?.transaction_signing_performed!==false||
    value.authority?.transaction_broadcast_authorized!==false||
    value.authority?.transaction_broadcast_performed!==false||
    value.authority?.chain2050_write_authorized!==false||
    value.authority?.chain2050_write_performed!==false||
    value.sovereign_private_key_access_performed!==false||
    value.signer_object_exposed!==false||
    value.signer_access_performed!==false||
    value.wallet_access_performed!==false||
    value.transaction_signing_performed!==false||
    value.transaction_broadcast_performed!==false||
    value.chain2050_write_performed!==false||
    text(value.next_gate)!==
      "durable_single_use_authorization_consumption_before_exact_transaction_signing_v1"
  ){
    return {ok:false,reason:"authorization_consumption_verified_authorization_invalid"};
  }
  const issuedMs=Date.parse(text(value.issued_at_utc));
  const expiresMs=Date.parse(text(value.expires_at_utc));
  if(
    !Number.isFinite(issuedMs)||
    !Number.isFinite(expiresMs)||
    expiresMs<=issuedMs||
    expiresMs-issuedMs>600_000
  ){
    return {ok:false,reason:"authorization_consumption_verified_time_window_invalid"};
  }
  return {
    ok:true,
    authorization_id:text(value.authorization_id),
    authorization_verification_id:text(value.authorization_verification_id),
    final_signing_review_preflight_id:
      text(value.final_signing_review_preflight_id),
    fresh_pre_sign_revalidation_id:text(value.fresh_pre_sign_revalidation_id),
    fresh_credential_binding_id:text(value.fresh_credential_binding_id),
    transaction_fingerprint:
      text(value.unsigned_transaction_candidate_fingerprint_sha256),
    publisher_address:text(value.publisher_address),
    transaction_summary:value.transaction_summary,
    issued_at_utc:text(value.issued_at_utc),
    expires_at_utc:text(value.expires_at_utc),
    issued_ms:issuedMs,
    expires_ms:expiresMs,
  };
}

export function consumeDatanetContentCommitmentSingleUseAuthorizationAgainstFingerprintWithClockV1(
  input,
  expectedSovereignFingerprint,
  nowMs,
){
  let verifiedRaw;
  try{
    verifiedRaw=
      verifyDatanetContentCommitmentSovereignSingleTransactionAuthorizationAgainstFingerprintV1(
        {
          final_signing_review:input?.final_signing_review,
          authorization_envelope:input?.authorization_envelope,
        },
        expectedSovereignFingerprint,
      );
  }catch(error){
    return held(
      "authorization_consumption_verifier_failed",
      {detail:{error_class:safeErrorClass(error)}},
    );
  }
  if(verifiedRaw?.ok===false){
    return held(
      "authorization_consumption_authorization_held:"+text(verifiedRaw.reason),
    );
  }
  const verified=validateVerifiedAuthorization(verifiedRaw);
  if(verified.ok===false)return held(verified.reason);

  if(!Number.isSafeInteger(nowMs)||nowMs<=0){
    return held(
      "authorization_consumption_clock_invalid",
      {
        authorization_id:verified.authorization_id,
        authorization_verification_id:verified.authorization_verification_id,
      },
    );
  }
  if(nowMs<verified.issued_ms){
    return held(
      "authorization_consumption_not_yet_valid",
      {
        authorization_id:verified.authorization_id,
        authorization_verification_id:verified.authorization_verification_id,
      },
    );
  }
  if(nowMs>=verified.expires_ms){
    return held(
      "authorization_consumption_expired",
      {
        authorization_id:verified.authorization_id,
        authorization_verification_id:verified.authorization_verification_id,
      },
    );
  }

  const root=validatePrivateStateRoot(input?.state_dir);
  if(root.ok===false){
    return held(
      root.reason,
      {
        authorization_id:verified.authorization_id,
        authorization_verification_id:verified.authorization_verification_id,
        ...(root.detail?{detail:root.detail}:{}),
      },
    );
  }

  let consumedDir;
  try{
    consumedDir=ensurePrivateConsumedDirectory(root.realpath);
  }catch(error){
    return held(
      "authorization_consumption_store_prepare_failed",
      {
        authorization_id:verified.authorization_id,
        authorization_verification_id:verified.authorization_verification_id,
        state_store_realpath_sha256:root.realpath_sha256,
        detail:{error_class:safeErrorClass(error)},
      },
    );
  }

  const consumedAt=canonicalUtcFromMs(nowMs);
  const material={
    marker:VOID_DATANET_CONTENT_COMMITMENT_SINGLE_USE_AUTHORIZATION_CONSUMPTION_V1,
    version:1,
    status:"authorization_consumed_for_exact_transaction_signing",
    chain_id:"2050",
    authorization_id:verified.authorization_id,
    authorization_verification_id:verified.authorization_verification_id,
    final_signing_review_preflight_id:
      verified.final_signing_review_preflight_id,
    fresh_pre_sign_revalidation_id:verified.fresh_pre_sign_revalidation_id,
    fresh_credential_binding_id:verified.fresh_credential_binding_id,
    unsigned_transaction_candidate_fingerprint_sha256:
      verified.transaction_fingerprint,
    publisher_address:verified.publisher_address,
    transaction_summary:verified.transaction_summary,
    issued_at_utc:verified.issued_at_utc,
    expires_at_utc:verified.expires_at_utc,
    consumed_at_utc:consumedAt,
    state_store_realpath_sha256:root.realpath_sha256,
    consumption:{
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
      signer_object_exposed:false,
      transaction_signer_access_performed:false,
      wallet_access_performed:false,
      transaction_signing_authorized_by_this_gate:false,
      transaction_signing_performed:false,
      transaction_broadcast_authorized:false,
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
      "exact_publisher_transaction_signing_from_consumed_authorization_v1",
  };
  const record={
    ...material,
    consumption_record_id:
      "voiddccstac1_"+sha256(canonicalJson(material)),
  };
  if(!CONSUMPTION_ID.test(record.consumption_record_id)){
    return held(
      "authorization_consumption_record_id_invalid",
      {
        authorization_id:verified.authorization_id,
        authorization_verification_id:verified.authorization_verification_id,
        state_store_realpath_sha256:root.realpath_sha256,
      },
    );
  }

  const file=path.join(consumedDir,verified.authorization_id+".json");
  let outcome;
  try{
    outcome=atomicCreateCanonicalJson(file,record);
  }catch(error){
    return held(
      "authorization_consumption_atomic_publish_failed",
      {
        authorization_id:verified.authorization_id,
        authorization_verification_id:verified.authorization_verification_id,
        state_store_realpath_sha256:root.realpath_sha256,
        detail:{error_class:safeErrorClass(error)},
      },
    );
  }
  if(outcome==="exists"){
    return held(
      "authorization_consumption_already_consumed",
      {
        authorization_id:verified.authorization_id,
        authorization_verification_id:verified.authorization_verification_id,
        state_store_realpath_sha256:root.realpath_sha256,
      },
    );
  }

  try{
    assertPrivateRecord(file);
    const stored=JSON.parse(fs.readFileSync(file,"utf8"));
    if(canonicalJson(stored)!==canonicalJson(record)){
      throw new Error("authorization_consumption_readback_mismatch");
    }
  }catch(error){
    return held(
      "authorization_consumption_readback_failed",
      {
        authorization_id:verified.authorization_id,
        authorization_verification_id:verified.authorization_verification_id,
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
    signer_object_exposed:false,
    transaction_signer_access_performed:false,
    wallet_access_performed:false,
    transaction_signing_performed:false,
    transaction_broadcast_performed:false,
    chain2050_write_performed:false,
    authority_contract:
      VOID_DATANET_CONTENT_COMMITMENT_SINGLE_USE_AUTHORIZATION_CONSUMPTION_AUTHORITY_V1,
  };
}

export function consumeDatanetContentCommitmentSingleUseAuthorizationWithClockV1(
  input,
  nowMs,
){
  let verifiedRaw;
  try{
    verifiedRaw=
      verifyDatanetContentCommitmentSovereignSingleTransactionAuthorizationV1({
        final_signing_review:input?.final_signing_review,
        authorization_envelope:input?.authorization_envelope,
      });
  }catch(error){
    return held(
      "authorization_consumption_verifier_failed",
      {detail:{error_class:safeErrorClass(error)}},
    );
  }
  if(verifiedRaw?.ok===false){
    return held(
      "authorization_consumption_authorization_held:"+text(verifiedRaw.reason),
    );
  }
  return consumeDatanetContentCommitmentSingleUseAuthorizationAgainstFingerprintWithClockV1(
    input,
    verifiedRaw.signer_public_key_der_sha256,
    nowMs,
  );
}

export function consumeDatanetContentCommitmentSingleUseAuthorizationV1(input){
  return consumeDatanetContentCommitmentSingleUseAuthorizationWithClockV1(
    input,
    Date.now(),
  );
}
