#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  Transaction,
  SigningKey,
  computeAddress,
  getCreateAddress,
  keccak256,
} from "ethers";

import {
  validateVoidDatanetRegistryUnsignedTransactionCandidateV1,
} from "./void-datanet-registry-unsigned-transaction-candidate-v1.mjs";
import {
  validateVoidDatanetRegistrySingleTransactionSigningAuthorizationV1,
} from "./void-datanet-registry-single-transaction-signing-authorization-v1.mjs";
import {
  VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_ID_V1,
  VOID_DATANET_REGISTRY_DEPLOYER_ADDRESS_V1,
  validateVoidDatanetRegistryDeployerSelectionV1,
} from "./void-datanet-registry-deployer-credential-binding-v1.mjs";

export const VOID_DATANET_REGISTRY_EXACT_NIMO_SIGNING_V1 =
  "VOID_DATANET_REGISTRY_EXACT_NIMO_SIGNING_V1";
export const VOID_DATANET_REGISTRY_SIGNING_CLAIM_V1 =
  "VOID_DATANET_REGISTRY_SIGNING_CLAIM_V1";
export const VOID_DATANET_REGISTRY_SIGNED_TRANSACTION_V1 =
  "VOID_DATANET_REGISTRY_SIGNED_TRANSACTION_V1";

const AUTH_ID=/^voiddrsa1_[0-9a-f]{64}$/u;
const REQUEST_ID=/^voiddrsr1_[0-9a-f]{64}$/u;
const CANDIDATE_ID=/^voiddrtxc1_[0-9a-f]{64}$/u;
const REVIEW_ID=/^voiddrfsr1_[0-9a-f]{64}$/u;
const CONSUMPTION_ID=/^voiddrsac1_[0-9a-f]{64}$/u;
const CLAIM_ID=/^voiddrsc1_[0-9a-f]{64}$/u;
const SIGNED_ID=/^voiddrstx1_[0-9a-f]{64}$/u;
const SHA256=/^[0-9a-f]{64}$/u;
const HASH=/^0x[0-9a-f]{64}$/u;
const ADDRESS=/^0x[0-9a-f]{40}$/u;
const HEX_BYTES=/^0x(?:[0-9a-f]{2})+$/u;
const MAX_STATE_RECORD_BYTES=2*1024*1024;
const MAX_CREDENTIAL_BYTES=128;

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
function exactKeys(value,keys,label){
  if(!value||typeof value!=="object"||Array.isArray(value)){
    throw new Error(label+"_invalid");
  }
  const actual=Object.keys(value).sort();
  const expected=[...keys].sort();
  if(JSON.stringify(actual)!==JSON.stringify(expected)){
    throw new Error(label+"_keys_invalid");
  }
}
function canonicalUtc(value,label){
  const raw=String(value||"");
  const ms=Date.parse(raw);
  if(
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(raw)||
    !Number.isFinite(ms)||
    new Date(ms).toISOString()!==raw
  ){
    throw new Error(label+"_invalid");
  }
  return {raw,ms};
}
function held(reason,options={}){
  return Object.freeze({
    ok:false,
    marker:VOID_DATANET_REGISTRY_EXACT_NIMO_SIGNING_V1,
    version:1,
    status:"held",
    reason,
    signing_authorization_id:options.signing_authorization_id??null,
    consumption_record_id:options.consumption_record_id??null,
    signing_claim_id:options.signing_claim_id??null,
    candidate_id:options.candidate_id??null,
    signing_claim_published:options.signing_claim_published===true,
    credential_access_performed:options.credential_access_performed===true,
    private_key_access_performed:options.private_key_access_performed===true,
    transaction_signing_performed:options.transaction_signing_performed===true,
    signed_transaction_state_record_published:
      options.signed_transaction_state_record_published===true,
    signed_transaction_export_performed:false,
    transaction_submission_performed:false,
    transaction_broadcast_performed:false,
    deployment_performed:false,
    chain2050_write_performed:false,
    funds_movement_performed:false,
    automatic_retry_allowed:false,
    ...(options.detail?{detail:options.detail}:{}),
  });
}
function safeErrorClass(error){
  const raw=String(error?.name||"Error");
  return /^[A-Za-z0-9._:-]{1,80}$/u.test(raw)?raw:"Error";
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
      throw new Error("registry_signing_symlink_ancestor_rejected");
    }
  }
}
function validatePrivateStateRoot(raw){
  const supplied=String(raw||"").trim();
  if(!supplied||!path.isAbsolute(supplied)){
    throw new Error("registry_signing_state_root_must_be_absolute");
  }
  const resolved=path.resolve(supplied);
  assertNoSymlinkAncestors(resolved);
  const stat=fs.lstatSync(resolved);
  if(
    !stat.isDirectory()||
    stat.isSymbolicLink()||
    (typeof process.getuid==="function"&&stat.uid!==process.getuid())||
    (stat.mode&0o777)!==0o700||
    fs.realpathSync(resolved)!==resolved
  ){
    throw new Error("registry_signing_state_root_out_of_policy");
  }
  return Object.freeze({
    realpath:resolved,
    realpath_sha256:sha256(resolved),
  });
}
function ensurePrivateDirectory(root,name){
  const dir=path.join(root,name);
  try{
    const stat=fs.lstatSync(dir);
    if(
      !stat.isDirectory()||
      stat.isSymbolicLink()||
      (typeof process.getuid==="function"&&stat.uid!==process.getuid())||
      (stat.mode&0o777)!==0o700
    ){
      throw new Error("registry_signing_private_directory_out_of_policy:"+name);
    }
  }catch(error){
    if(error?.code!=="ENOENT") throw error;
    fs.mkdirSync(dir,{recursive:false,mode:0o700});
    fs.chmodSync(dir,0o700);
    fsyncDirectory(root);
  }
  assertNoSymlinkAncestors(dir);
  if(fs.realpathSync(dir)!==dir){
    throw new Error("registry_signing_private_directory_realpath_mismatch:"+name);
  }
  return dir;
}
function fsyncDirectory(directory){
  const fd=fs.openSync(directory,"r");
  try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
}
function atomicCreateCanonicalJson(file,value){
  const parent=path.dirname(file);
  const temporary=path.join(
    parent,
    "."+path.basename(file)+".tmp-"+String(process.pid)+"-"+
      crypto.randomBytes(8).toString("hex"),
  );
  const bytes=Buffer.from(canonicalJson(value)+"\n","utf8");
  if(bytes.length<2||bytes.length>MAX_STATE_RECORD_BYTES){
    throw new Error("registry_signing_state_record_size_invalid");
  }
  const fd=fs.openSync(temporary,"wx",0o600);
  try{
    fs.fchmodSync(fd,0o600);
    fs.writeFileSync(fd,bytes);
    fs.fsyncSync(fd);
  }finally{
    fs.closeSync(fd);
  }
  let linked=false;
  try{
    fs.linkSync(temporary,file);
    linked=true;
    fsyncDirectory(parent);
    return "created";
  }catch(error){
    if(error?.code==="EEXIST") return "exists";
    throw error;
  }finally{
    try{fs.unlinkSync(temporary);}catch(error){
      if(error?.code!=="ENOENT"&&!linked) throw error;
    }
  }
}
function assertPrivateStateFile(file,maxBytes=MAX_STATE_RECORD_BYTES){
  assertNoSymlinkAncestors(file);
  const stat=fs.lstatSync(file);
  if(
    !stat.isFile()||
    stat.isSymbolicLink()||
    stat.nlink!==1||
    (typeof process.getuid==="function"&&stat.uid!==process.getuid())||
    (stat.mode&0o777)!==0o600||
    stat.size<2||
    stat.size>maxBytes||
    fs.realpathSync(file)!==file
  ){
    throw new Error("registry_signing_state_file_out_of_policy");
  }
}
function readCanonicalJsonFile(file,maxBytes=MAX_STATE_RECORD_BYTES){
  assertPrivateStateFile(file,maxBytes);
  const raw=fs.readFileSync(file,"utf8");
  return JSON.parse(raw);
}

const EXPECTED_CONSUMPTION=Object.freeze({
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
});
const EXPECTED_CONSUMPTION_AUTHORITY=Object.freeze({
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
});

export function validateVoidDatanetRegistrySigningConsumptionRecordV1(
  record,
  context,
){
  if(
    !record||
    typeof record!=="object"||
    Array.isArray(record)||
    record.marker!=="VOID_DATANET_REGISTRY_SINGLE_USE_SIGNING_AUTHORIZATION_CONSUMPTION_V1"||
    record.version!==1||
    record.status!=="AUTHORIZATION_CONSUMED_FOR_EXACT_REGISTRY_TRANSACTION_SIGNING"||
    !CONSUMPTION_ID.test(String(record.consumption_record_id||""))
  ){
    throw new Error("registry_signing_consumption_record_contract_invalid");
  }
  const material=structuredClone(record);
  const id=material.consumption_record_id;
  delete material.consumption_record_id;
  const expectedId="voiddrsac1_"+sha256(Buffer.from(canonicalJson(material)));
  if(id!==expectedId){
    throw new Error("registry_signing_consumption_record_id_mismatch");
  }

  const authorization=context?.authorization;
  const stateRoot=context?.state_root;
  if(
    !authorization||
    !stateRoot||
    record.signing_authorization_id!==authorization.signing_authorization_id||
    record.signing_request_id!==authorization.signing_request_id||
    record.candidate_id!==authorization.candidate_id||
    record.final_signing_review_id!==authorization.final_signing_review_id||
    record.transaction_fingerprint_sha256!==
      authorization.transaction_fingerprint_sha256||
    record.required_confirmation!==authorization.required_confirmation||
    canonicalJson(record.transaction_summary)!==
      canonicalJson(authorization.transaction_summary)||
    record.authorized_at_utc!==authorization.authorized_at_utc||
    record.valid_until_utc!==authorization.valid_until_utc||
    record.state_store_realpath_sha256!==stateRoot.realpath_sha256||
    record.next_gate!==
      "exact_nimo_registry_transaction_signing_from_consumed_authorization_v1"
  ){
    throw new Error("registry_signing_consumption_record_binding_mismatch");
  }

  exactKeys(
    record.consumption,
    Object.keys(EXPECTED_CONSUMPTION),
    "registry_signing_consumption_record_consumption",
  );
  for(const [key,value] of Object.entries(EXPECTED_CONSUMPTION)){
    if(record.consumption[key]!==value){
      throw new Error("registry_signing_consumption_record_consumption_mismatch:"+key);
    }
  }
  exactKeys(
    record.authority,
    Object.keys(EXPECTED_CONSUMPTION_AUTHORITY),
    "registry_signing_consumption_record_authority",
  );
  for(const [key,value] of Object.entries(EXPECTED_CONSUMPTION_AUTHORITY)){
    if(record.authority[key]!==value){
      throw new Error("registry_signing_consumption_record_authority_mismatch:"+key);
    }
  }

  const authorized=canonicalUtc(
    record.authorized_at_utc,
    "registry_signing_consumption_record_authorized_at",
  );
  const expires=canonicalUtc(
    record.valid_until_utc,
    "registry_signing_consumption_record_valid_until",
  );
  const consumed=canonicalUtc(
    record.consumed_at_utc,
    "registry_signing_consumption_record_consumed_at",
  );
  if(
    consumed.ms<authorized.ms||
    consumed.ms>=expires.ms
  ){
    throw new Error("registry_signing_consumption_record_time_invalid");
  }
  return record;
}

function defaultValidators(){
  return Object.freeze({
    validate_candidate:
      validateVoidDatanetRegistryUnsignedTransactionCandidateV1,
    validate_authorization:
      validateVoidDatanetRegistrySingleTransactionSigningAuthorizationV1,
    validate_selection:
      validateVoidDatanetRegistryDeployerSelectionV1,
  });
}

export function validateVoidDatanetRegistryExactSigningContextV1(
  input,
  dependencies=defaultValidators(),
){
  const candidate=dependencies.validate_candidate(
    input?.unsigned_transaction_candidate,
    input?.candidate_evidence,
  );
  const authorization=dependencies.validate_authorization(
    input?.signing_authorization,
    {
      signing_request:input?.signing_request,
      signing_request_evidence:input?.signing_request_evidence,
    },
  );
  const selection=dependencies.validate_selection(input?.deployer_selection);

  if(
    !candidate||
    !authorization||
    !selection||
    !CANDIDATE_ID.test(String(candidate.candidate_id||""))||
    !AUTH_ID.test(String(authorization.signing_authorization_id||""))||
    !REQUEST_ID.test(String(authorization.signing_request_id||""))||
    !REVIEW_ID.test(String(authorization.final_signing_review_id||""))||
    candidate.candidate_id!==authorization.candidate_id||
    String(candidate.transaction?.from_address||"").toLowerCase()!==
      String(selection.deployer_address||"").toLowerCase()||
    String(selection.deployer_address||"").toLowerCase()!==
      VOID_DATANET_REGISTRY_DEPLOYER_ADDRESS_V1||
    selection.credential_id!==VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_ID_V1||
    input?.confirmation!==authorization.required_confirmation
  ){
    throw new Error("registry_signing_execution_context_mismatch");
  }

  const tx=candidate.transaction;
  if(
    tx?.transaction_type!==2||
    tx?.chain_id!=="2050"||
    tx?.to_address!==null||
    tx?.value_wei!=="0"||
    !ADDRESS.test(String(tx?.from_address||""))||
    !ADDRESS.test(String(tx?.predicted_contract_address||""))||
    !HASH.test(String(tx?.unsigned_transaction_hash||""))||
    !HEX_BYTES.test(String(tx?.unsigned_serialized_transaction||""))
  ){
    throw new Error("registry_signing_execution_candidate_shape_invalid");
  }

  const parsed=Transaction.from(tx.unsigned_serialized_transaction);
  if(
    parsed.signature!==null||
    parsed.type!==2||
    parsed.chainId!==2050n||
    parsed.unsignedHash.toLowerCase()!==tx.unsigned_transaction_hash
  ){
    throw new Error("registry_signing_execution_candidate_parse_mismatch");
  }

  const stateRoot=validatePrivateStateRoot(input?.state_dir);
  const consumedFile=path.join(
    stateRoot.realpath,
    "consumed",
    authorization.signing_authorization_id+".json",
  );
  const consumptionRecord=readCanonicalJsonFile(consumedFile);
  validateVoidDatanetRegistrySigningConsumptionRecordV1(
    consumptionRecord,
    {
      authorization,
      state_root:stateRoot,
    },
  );

  return Object.freeze({
    candidate,
    authorization,
    selection,
    state_root:stateRoot,
    consumption_record:consumptionRecord,
    consumed_file:consumedFile,
  });
}

function runtimeAuthorizationWindow(context,nowMs,label){
  if(!Number.isSafeInteger(nowMs)||nowMs<=0){
    throw new Error(label+"_clock_invalid");
  }
  const authorized=Date.parse(context.authorization.authorized_at_utc);
  const expires=Date.parse(context.authorization.valid_until_utc);
  const consumed=Date.parse(context.consumption_record.consumed_at_utc);
  if(
    !Number.isFinite(authorized)||
    !Number.isFinite(expires)||
    !Number.isFinite(consumed)||
    nowMs<authorized||
    nowMs<consumed||
    nowMs>=expires
  ){
    throw new Error(label+"_authorization_not_current");
  }
  return Object.freeze({
    now_ms:nowMs,
    now_utc:new Date(nowMs).toISOString(),
    expires_ms:expires,
  });
}

function buildSigningClaim(context,claimedAt){
  const material={
    marker:VOID_DATANET_REGISTRY_SIGNING_CLAIM_V1,
    version:1,
    status:"EXACT_SIGNING_ATTEMPT_CLAIMED_PRIVATE_KEY_ACCESS_HOLD",
    signing_authorization_id:
      context.authorization.signing_authorization_id,
    signing_request_id:context.authorization.signing_request_id,
    candidate_id:context.candidate.candidate_id,
    final_signing_review_id:
      context.authorization.final_signing_review_id,
    consumption_record_id:
      context.consumption_record.consumption_record_id,
    transaction_fingerprint_sha256:
      context.authorization.transaction_fingerprint_sha256,
    required_confirmation:
      context.authorization.required_confirmation,
    claimed_at_utc:claimedAt,
    state_store_realpath_sha256:
      context.state_root.realpath_sha256,
    claim:{
      exact_single_attempt:true,
      claim_precedes_private_key_access:true,
      retry_after_claim_allowed:false,
      signer_access_claimed:true,
    },
    authority:{
      filesystem_mutation_performed:true,
      credential_access_performed:false,
      private_key_access_performed:false,
      signer_object_exposed:false,
      transaction_signing_performed:false,
      signed_transaction_export_performed:false,
      transaction_submission_performed:false,
      transaction_broadcast_authorized:false,
      transaction_broadcast_performed:false,
      deployment_performed:false,
      chain2050_write_performed:false,
      funds_movement_performed:false,
      automatic_retry_authorized:false,
    },
    next_gate:"private_key_access_and_exact_single_transaction_signing_v1",
  };
  return Object.freeze({
    ...material,
    signing_claim_id:
      "voiddrsc1_"+sha256(Buffer.from(canonicalJson(material))),
  });
}

function claimSigningAttempt(context,nowMs){
  const window=runtimeAuthorizationWindow(
    context,
    nowMs,
    "registry_signing_claim",
  );
  const signedDir=ensurePrivateDirectory(
    context.state_root.realpath,
    "signed",
  );
  const signedFile=path.join(
    signedDir,
    context.authorization.signing_authorization_id+".json",
  );
  try{
    fs.lstatSync(signedFile);
    return Object.freeze({
      ok:false,
      reason:"registry_signing_already_signed",
    });
  }catch(error){
    if(error?.code!=="ENOENT") throw error;
  }

  const claimDir=ensurePrivateDirectory(
    context.state_root.realpath,
    "signing-claims",
  );
  const claim=buildSigningClaim(context,window.now_utc);
  const claimFile=path.join(
    claimDir,
    context.authorization.signing_authorization_id+".json",
  );
  const outcome=atomicCreateCanonicalJson(claimFile,claim);
  if(outcome==="exists"){
    return Object.freeze({
      ok:false,
      reason:"registry_signing_attempt_already_claimed",
    });
  }
  assertPrivateStateFile(claimFile);
  const stored=readCanonicalJsonFile(claimFile);
  if(canonicalJson(stored)!==canonicalJson(claim)){
    throw new Error("registry_signing_claim_readback_mismatch");
  }
  return Object.freeze({
    ok:true,
    claim,
    claim_file:claimFile,
    signed_file:signedFile,
  });
}

function asciiWhitespace(byte){
  return byte===0x09||byte===0x0a||byte===0x0d||byte===0x20;
}
function hexNibble(byte){
  if(byte>=0x30&&byte<=0x39) return byte-0x30;
  if(byte>=0x41&&byte<=0x46) return byte-0x41+10;
  if(byte>=0x61&&byte<=0x66) return byte-0x61+10;
  return -1;
}
function decodePrivateKeyBytes(fileBytes){
  let start=0;
  let end=fileBytes.length;
  while(start<end&&asciiWhitespace(fileBytes[start])) start+=1;
  while(end>start&&asciiWhitespace(fileBytes[end-1])) end-=1;
  if(
    end-start===66&&
    fileBytes[start]===0x30&&
    (fileBytes[start+1]===0x78||fileBytes[start+1]===0x58)
  ){
    start+=2;
  }
  if(end-start!==64){
    throw new Error("registry_signing_private_key_shape_invalid");
  }
  const key=Buffer.alloc(32);
  for(let i=0;i<32;i+=1){
    const hi=hexNibble(fileBytes[start+i*2]);
    const lo=hexNibble(fileBytes[start+i*2+1]);
    if(hi<0||lo<0){
      key.fill(0);
      throw new Error("registry_signing_private_key_hex_invalid");
    }
    key[i]=(hi<<4)|lo;
  }
  return key;
}

function validateCredentialsDirectory(raw){
  const supplied=String(raw||"");
  if(!supplied||!path.isAbsolute(supplied)){
    throw new Error("registry_signing_credentials_directory_must_be_absolute");
  }
  const resolved=path.resolve(supplied);
  assertNoSymlinkAncestors(resolved);
  const stat=fs.lstatSync(resolved);
  if(
    !stat.isDirectory()||
    stat.isSymbolicLink()||
    fs.realpathSync(resolved)!==resolved||
    (typeof process.getuid==="function"&&stat.uid!==process.getuid())||
    (stat.mode&0o077)!==0
  ){
    throw new Error("registry_signing_credentials_directory_out_of_policy");
  }
  return resolved;
}

function signExactCandidateFromCredentialV1(context,credentialsDirectory){
  const directory=validateCredentialsDirectory(credentialsDirectory);
  const credentialPath=path.join(
    directory,
    VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_ID_V1,
  );
  if(path.dirname(credentialPath)!==directory){
    throw new Error("registry_signing_credential_path_escape");
  }

  let fd=-1;
  let fileBytes=null;
  let keyBytes=null;
  let signingKey=null;
  try{
    fd=fs.openSync(
      credentialPath,
      fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW,
    );
    const stat=fs.fstatSync(fd);
    if(
      !stat.isFile()||
      stat.nlink!==1||
      (typeof process.getuid==="function"&&stat.uid!==process.getuid())||
      ![0o400,0o600].includes(stat.mode&0o777)||
      stat.size<=0||
      stat.size>MAX_CREDENTIAL_BYTES
    ){
      throw new Error("registry_signing_credential_file_out_of_policy");
    }
    const pathStat=fs.lstatSync(credentialPath);
    if(
      pathStat.isSymbolicLink()||
      pathStat.dev!==stat.dev||
      pathStat.ino!==stat.ino||
      fs.realpathSync(credentialPath)!==credentialPath
    ){
      throw new Error("registry_signing_credential_file_identity_changed");
    }

    fileBytes=Buffer.alloc(stat.size);
    const read=fs.readSync(fd,fileBytes,0,fileBytes.length,0);
    if(read!==fileBytes.length){
      throw new Error("registry_signing_credential_short_read");
    }
    keyBytes=decodePrivateKeyBytes(fileBytes);
    signingKey=new SigningKey(keyBytes);
    const derived=computeAddress(signingKey.publicKey).toLowerCase();
    const expected=
      String(context.selection.deployer_address||"").toLowerCase();
    if(derived!==expected){
      throw new Error("registry_signing_credential_address_mismatch");
    }

    const unsigned=Transaction.from(
      context.candidate.transaction.unsigned_serialized_transaction,
    );
    if(
      unsigned.signature!==null||
      unsigned.unsignedHash.toLowerCase()!==
        context.candidate.transaction.unsigned_transaction_hash
    ){
      throw new Error("registry_signing_unsigned_transaction_mismatch");
    }

    const signature=signingKey.sign(unsigned.unsignedHash);
    unsigned.signature=signature;
    const serialized=unsigned.serialized.toLowerCase();
    const parsed=Transaction.from(serialized);
    const from=String(parsed.from||"").toLowerCase();
    if(
      !HEX_BYTES.test(serialized)||
      parsed.signature===null||
      parsed.type!==2||
      parsed.chainId!==2050n||
      parsed.unsignedHash.toLowerCase()!==
        context.candidate.transaction.unsigned_transaction_hash||
      from!==expected||
      parsed.to!==null||
      parsed.value!==0n||
      parsed.data.toLowerCase()!==
        Transaction.from(
          context.candidate.transaction.unsigned_serialized_transaction,
        ).data.toLowerCase()
    ){
      throw new Error("registry_signing_signed_transaction_parse_mismatch");
    }
    const predicted=getCreateAddress({
      from:expected,
      nonce:BigInt(context.candidate.transaction.nonce),
    }).toLowerCase();
    if(
      predicted!==
        String(
          context.candidate.transaction.predicted_contract_address||"",
        ).toLowerCase()
    ){
      throw new Error("registry_signing_predicted_address_mismatch");
    }
    const signedHash=String(parsed.hash||"").toLowerCase();
    if(!HASH.test(signedHash)||keccak256(serialized).toLowerCase()!==signedHash){
      throw new Error("registry_signing_signed_hash_mismatch");
    }

    return Object.freeze({
      signed_serialized_transaction:serialized,
      signed_transaction_hash:signedHash,
      signed_serialized_transaction_sha256:
        sha256(Buffer.from(serialized.slice(2),"hex")),
      signer_address:from,
      signature:Object.freeze({
        r:parsed.signature.r.toLowerCase(),
        s:parsed.signature.s.toLowerCase(),
        y_parity:parsed.signature.yParity,
      }),
    });
  }finally{
    if(keyBytes) keyBytes.fill(0);
    if(fileBytes) fileBytes.fill(0);
    signingKey=null;
    if(fd>=0){
      try{fs.closeSync(fd);}catch(closeError){void closeError;}
    }
  }
}

function buildSignedArtifact(context,claim,signatureResult,signedAt){
  const material={
    marker:VOID_DATANET_REGISTRY_SIGNED_TRANSACTION_V1,
    version:1,
    status:"SIGNED_EXACT_REGISTRY_TRANSACTION_BROADCAST_HOLD",
    signed_at_utc:signedAt,
    signing_authorization_id:
      context.authorization.signing_authorization_id,
    signing_request_id:
      context.authorization.signing_request_id,
    candidate_id:context.candidate.candidate_id,
    final_signing_review_id:
      context.authorization.final_signing_review_id,
    consumption_record_id:
      context.consumption_record.consumption_record_id,
    signing_claim_id:claim.signing_claim_id,
    transaction_fingerprint_sha256:
      context.authorization.transaction_fingerprint_sha256,
    required_confirmation:
      context.authorization.required_confirmation,
    deployer_address:
      String(context.selection.deployer_address).toLowerCase(),
    credential_id:context.selection.credential_id,
    predicted_contract_address:
      String(
        context.candidate.transaction.predicted_contract_address,
      ).toLowerCase(),
    unsigned_transaction_hash:
      context.candidate.transaction.unsigned_transaction_hash,
    transaction_summary:
      context.authorization.transaction_summary,
    signed_transaction:{
      signed_transaction_hash:
        signatureResult.signed_transaction_hash,
      signed_serialized_transaction:
        signatureResult.signed_serialized_transaction,
      signed_serialized_transaction_sha256:
        signatureResult.signed_serialized_transaction_sha256,
      signature:signatureResult.signature,
    },
    signing:{
      exact_single_transaction:true,
      signing_count:1,
      authorization_consumed_before_signing:true,
      signing_claim_published_before_private_key_access:true,
      runtime_expiry_rechecked_before_private_key_access:true,
      runtime_expiry_rechecked_before_signing:true,
      credential_address_rederived:true,
      signed_transaction_reparsed:true,
      credential_file_buffer_zeroed_after_use:true,
      decoded_private_key_buffer_zeroed_after_use:true,
      library_internal_key_memory_zeroization_claimed:false,
    },
    authority:{
      filesystem_mutation_performed:true,
      credential_access_performed:true,
      private_key_access_performed:true,
      signer_object_exposed:false,
      wallet_access_performed:false,
      transaction_signer_access_performed:true,
      transaction_signing_authorized:true,
      transaction_signing_performed:true,
      signed_transaction_export_authorized:true,
      signed_transaction_state_record_published:true,
      transaction_submission_authorized:false,
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
      "separate_exact_signed_transaction_broadcast_authorization_v1",
  };
  return Object.freeze({
    ...material,
    signed_transaction_artifact_id:
      "voiddrstx1_"+sha256(Buffer.from(canonicalJson(material))),
  });
}

export function validateVoidDatanetRegistrySignedTransactionArtifactV1(
  artifact,
  context,
){
  if(
    !artifact||
    typeof artifact!=="object"||
    Array.isArray(artifact)||
    artifact.marker!==VOID_DATANET_REGISTRY_SIGNED_TRANSACTION_V1||
    artifact.version!==1||
    artifact.status!=="SIGNED_EXACT_REGISTRY_TRANSACTION_BROADCAST_HOLD"||
    !SIGNED_ID.test(String(artifact.signed_transaction_artifact_id||""))
  ){
    throw new Error("registry_signed_transaction_artifact_contract_invalid");
  }
  const material=structuredClone(artifact);
  const id=material.signed_transaction_artifact_id;
  delete material.signed_transaction_artifact_id;
  const expected="voiddrstx1_"+sha256(Buffer.from(canonicalJson(material)));
  if(id!==expected){
    throw new Error("registry_signed_transaction_artifact_id_mismatch");
  }
  if(
    artifact.signing_authorization_id!==
      context.authorization.signing_authorization_id||
    artifact.signing_request_id!==
      context.authorization.signing_request_id||
    artifact.candidate_id!==context.candidate.candidate_id||
    artifact.consumption_record_id!==
      context.consumption_record.consumption_record_id||
    artifact.transaction_fingerprint_sha256!==
      context.authorization.transaction_fingerprint_sha256||
    artifact.required_confirmation!==
      context.authorization.required_confirmation||
    artifact.unsigned_transaction_hash!==
      context.candidate.transaction.unsigned_transaction_hash||
    canonicalJson(artifact.transaction_summary)!==
      canonicalJson(context.authorization.transaction_summary)
  ){
    throw new Error("registry_signed_transaction_artifact_binding_mismatch");
  }

  const signed=artifact.signed_transaction;
  if(
    !HASH.test(String(signed?.signed_transaction_hash||""))||
    !HEX_BYTES.test(String(signed?.signed_serialized_transaction||""))||
    !SHA256.test(String(signed?.signed_serialized_transaction_sha256||""))
  ){
    throw new Error("registry_signed_transaction_artifact_signed_shape_invalid");
  }
  if(
    sha256(Buffer.from(
      signed.signed_serialized_transaction.slice(2),
      "hex",
    ))!==signed.signed_serialized_transaction_sha256||
    keccak256(signed.signed_serialized_transaction).toLowerCase()!==
      signed.signed_transaction_hash
  ){
    throw new Error("registry_signed_transaction_artifact_digest_mismatch");
  }

  const parsed=Transaction.from(signed.signed_serialized_transaction);
  const unsigned=Transaction.from(
    context.candidate.transaction.unsigned_serialized_transaction,
  );
  if(
    parsed.signature===null||
    parsed.hash?.toLowerCase()!==signed.signed_transaction_hash||
    parsed.unsignedHash.toLowerCase()!==
      context.candidate.transaction.unsigned_transaction_hash||
    String(parsed.from||"").toLowerCase()!==
      String(context.selection.deployer_address).toLowerCase()||
    parsed.type!==unsigned.type||
    parsed.chainId!==unsigned.chainId||
    parsed.nonce!==unsigned.nonce||
    parsed.gasLimit!==unsigned.gasLimit||
    parsed.maxFeePerGas!==unsigned.maxFeePerGas||
    parsed.maxPriorityFeePerGas!==unsigned.maxPriorityFeePerGas||
    parsed.to!==unsigned.to||
    parsed.value!==unsigned.value||
    parsed.data.toLowerCase()!==unsigned.data.toLowerCase()
  ){
    throw new Error("registry_signed_transaction_artifact_parse_mismatch");
  }

  if(
    artifact.authority?.transaction_broadcast_authorized!==false||
    artifact.authority?.transaction_submission_authorized!==false||
    artifact.authority?.chain2050_write_authorized!==false||
    artifact.authority?.funds_movement_performed!==false||
    artifact.next_gate!==
      "separate_exact_signed_transaction_broadcast_authorization_v1"
  ){
    throw new Error("registry_signed_transaction_artifact_authority_mismatch");
  }
  return artifact;
}

export function runVoidDatanetRegistryExactNimoSigningWithClockAndDependenciesV1(
  input,
  dependencies,
  clock,
){
  let context;
  try{
    context=validateVoidDatanetRegistryExactSigningContextV1(
      input,
      dependencies,
    );
  }catch(error){
    return held("registry_signing_context_invalid",{
      detail:{error_class:safeErrorClass(error)},
    });
  }

  const identity={
    signing_authorization_id:
      context.authorization.signing_authorization_id,
    consumption_record_id:
      context.consumption_record.consumption_record_id,
    candidate_id:context.candidate.candidate_id,
  };

  let beforeClaim;
  try{
    beforeClaim=runtimeAuthorizationWindow(
      context,
      Number(clock()),
      "registry_signing_before_claim",
    );
  }catch(error){
    return held("registry_signing_authorization_not_current",{
      ...identity,
      detail:{error_class:safeErrorClass(error)},
    });
  }

  let claimResult;
  try{
    claimResult=claimSigningAttempt(context,beforeClaim.now_ms);
  }catch(error){
    return held("registry_signing_claim_failed",{
      ...identity,
      detail:{error_class:safeErrorClass(error)},
    });
  }
  if(claimResult.ok!==true){
    return held(claimResult.reason,{
      ...identity,
    });
  }
  const claim=claimResult.claim;
  const claimedIdentity={
    ...identity,
    signing_claim_id:claim.signing_claim_id,
    signing_claim_published:true,
  };

  try{
    runtimeAuthorizationWindow(
      context,
      Number(clock()),
      "registry_signing_before_private_key_access",
    );
  }catch(error){
    return held("registry_signing_expired_after_claim",{
      ...claimedIdentity,
      detail:{error_class:safeErrorClass(error)},
    });
  }

  let signatureResult;
  try{
    signatureResult=signExactCandidateFromCredentialV1(
      context,
      input?.credentials_directory,
    );
  }catch(error){
    return held("registry_signing_private_key_or_signing_failed",{
      ...claimedIdentity,
      credential_access_performed:true,
      private_key_access_performed:true,
      detail:{error_class:safeErrorClass(error)},
    });
  }

  try{
    runtimeAuthorizationWindow(
      context,
      Number(clock()),
      "registry_signing_after_signature_before_publication",
    );
  }catch(error){
    return held("registry_signing_expired_after_signature",{
      ...claimedIdentity,
      credential_access_performed:true,
      private_key_access_performed:true,
      transaction_signing_performed:true,
      detail:{error_class:safeErrorClass(error)},
    });
  }

  const signedAt=new Date(Number(clock())).toISOString();
  let artifact;
  try{
    artifact=buildSignedArtifact(
      context,
      claim,
      signatureResult,
      signedAt,
    );
    validateVoidDatanetRegistrySignedTransactionArtifactV1(
      artifact,
      context,
    );
  }catch(error){
    return held("registry_signing_signed_artifact_invalid",{
      ...claimedIdentity,
      credential_access_performed:true,
      private_key_access_performed:true,
      transaction_signing_performed:true,
      detail:{error_class:safeErrorClass(error)},
    });
  }

  let outcome;
  try{
    outcome=atomicCreateCanonicalJson(
      claimResult.signed_file,
      artifact,
    );
  }catch(error){
    return held("registry_signing_signed_state_publish_failed",{
      ...claimedIdentity,
      credential_access_performed:true,
      private_key_access_performed:true,
      transaction_signing_performed:true,
      detail:{error_class:safeErrorClass(error)},
    });
  }
  if(outcome==="exists"){
    return held("registry_signing_signed_state_already_exists",{
      ...claimedIdentity,
      credential_access_performed:true,
      private_key_access_performed:true,
      transaction_signing_performed:true,
    });
  }

  try{
    assertPrivateStateFile(claimResult.signed_file);
    const stored=readCanonicalJsonFile(claimResult.signed_file);
    if(canonicalJson(stored)!==canonicalJson(artifact)){
      throw new Error("registry_signing_signed_state_readback_mismatch");
    }
  }catch(error){
    return held("registry_signing_signed_state_readback_failed",{
      ...claimedIdentity,
      credential_access_performed:true,
      private_key_access_performed:true,
      transaction_signing_performed:true,
      signed_transaction_state_record_published:true,
      detail:{error_class:safeErrorClass(error)},
    });
  }

  return Object.freeze({
    ok:true,
    ...artifact,
    signing_claim_published:true,
    signed_transaction_state_record_published:true,
    signed_state_file_realpath_sha256:
      sha256(claimResult.signed_file),
    credential_access_performed:true,
    private_key_access_performed:true,
    signer_object_exposed:false,
    wallet_access_performed:false,
    transaction_signer_access_performed:true,
    transaction_signing_performed:true,
    signed_transaction_export_performed:false,
    transaction_submission_performed:false,
    transaction_broadcast_performed:false,
    deployment_performed:false,
    chain2050_write_performed:false,
    funds_movement_performed:false,
    automatic_retry_allowed:false,
  });
}

export function runVoidDatanetRegistryExactNimoSigningV1(input){
  return runVoidDatanetRegistryExactNimoSigningWithClockAndDependenciesV1(
    input,
    defaultValidators(),
    ()=>Date.now(),
  );
}
