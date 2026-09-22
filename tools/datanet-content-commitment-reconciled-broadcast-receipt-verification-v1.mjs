import fs from "node:fs";
import path from "node:path";
import {
  canonicalJson,
  sha256,
} from "./datanet-content-commitment-compiler-profile-v1.mjs";

export const VOID_DATANET_CONTENT_COMMITMENT_RECONCILED_BROADCAST_RECEIPT_VERIFICATION_V1 =
  "VOID_DATANET_CONTENT_COMMITMENT_RECONCILED_BROADCAST_RECEIPT_VERIFICATION_V1";

export const VOID_DATANET_CONTENT_COMMITMENT_RECONCILED_BROADCAST_RECEIPT_VERIFICATION_AUTHORITY_V1 = {
  source_only_receipt_verification:true,
  terminal_reconciliation_required:true,
  durable_consumption_record_readback_required:true,
  durable_submission_intent_readback_required:true,
  canonical_state_store_fingerprint_required:true,
  injected_receipt_observer_only:true,
  metadata_only_receipt_request:true,
  exact_transaction_hash_required:true,
  exact_publisher_required:true,
  receipt_status_consistency_required:true,
  receipt_block_hash_required:true,
  confirmation_arithmetic_verified:true,
  confirmation_threshold_applied:false,
  accepted_checkpoint_membership_verified:false,
  chain_finality_claimed:false,
  submit_method_access:false,
  transaction_submission_authorized:false,
  automatic_resubmission:false,
  raw_signed_transaction_input:false,
  raw_signed_transaction_output:false,
  raw_signed_transaction_access:false,
  opaque_custody_handle_input:false,
  opaque_custody_handle_output:false,
  opaque_custody_handle_access:false,
  filesystem_read:true,
  filesystem_mutation:false,
  sovereign_private_key_access:false,
  wallet_access:false,
  transaction_signing:false,
  direct_rpc_transport:false,
  direct_network_transport:false,
  chain2050_write_direct:false,
  validator_mutation:false,
  governance_mutation:false,
  work_credit_mutation:false,
  funds_action_direct:false,
  automatic_retry:false,
};

const AUTHORIZATION_ID=/^voiddccba1_[0-9a-f]{64}$/;
const CONSUMPTION_ID=/^voiddccbac1_[0-9a-f]{64}$/;
const INTENT_ID=/^voiddccbasi1_[0-9a-f]{64}$/;
const SHA256=/^[0-9a-f]{64}$/;
const HASH=/^0x[0-9a-f]{64}$/;
const ADDRESS=/^0x[0-9a-f]{40}$/;
const DECIMAL=/^(0|[1-9][0-9]*)$/;
const SAFE_PROVIDER_ID=/^[A-Za-z0-9._:@/-]{0,200}$/;
const MAX_RECORD_BYTES=128*1024;
const SUBMISSION_DOMAIN=
  "void.datanet.content-commitment.exact-single-submission.v1";

const CONSUMPTION_KEYS=[
  "marker","version","status","chain_id",
  "broadcast_authorization_id","broadcast_authorization_verification_id",
  "opaque_signed_receipt_verification_id","opaque_signed_receipt_id",
  "signing_request_id","signing_authorization_id",
  "signing_consumption_record_id","final_signing_review_preflight_id",
  "external_signing_idempotency_key_sha256",
  "unsigned_transaction_candidate_fingerprint_sha256","publisher_address",
  "signed_transaction_hash","custody_handle_fingerprint_sha256",
  "signed_at_utc","signer_public_key_der_sha256",
  "issued_at_utc","expires_at_utc","consumed_at_utc",
  "state_store_realpath_sha256","consumption","authority","next_gate",
  "broadcast_consumption_record_id",
];
const INTENT_KEYS=[
  "marker","version","status","chain_id","domain",
  "broadcast_authorization_id","broadcast_authorization_verification_id",
  "broadcast_consumption_record_id","inspection_request_id",
  "opaque_signed_receipt_verification_id","opaque_signed_receipt_id",
  "signing_request_id","signing_authorization_id",
  "signing_consumption_record_id",
  "external_signing_idempotency_key_sha256",
  "unsigned_transaction_candidate_fingerprint_sha256","publisher_address",
  "signed_transaction_hash","custody_handle_fingerprint_sha256",
  "canonical_state_store_realpath_sha256",
  "submission_idempotency_key_sha256","claimed_at_utc",
  "automatic_retry_authorized","submission_intent_id",
];

function text(value){
  return typeof value==="string"?value.trim():"";
}
function plain(value){
  return value!==null&&typeof value==="object"&&!Array.isArray(value);
}
function exactKeys(value,expected){
  return plain(value)&&
    JSON.stringify(Object.keys(value).sort())===
      JSON.stringify([...expected].sort());
}
function safeErrorClass(error){
  const raw=text(error?.name||"Error");
  return /^[A-Za-z0-9._:-]{1,80}$/.test(raw)?raw:"Error";
}
function held(reason,options={}){
  return {
    ok:false,
    marker:
      VOID_DATANET_CONTENT_COMMITMENT_RECONCILED_BROADCAST_RECEIPT_VERIFICATION_V1,
    version:1,
    status:"held",
    reason,
    broadcast_authorization_id:
      options.broadcast_authorization_id??null,
    broadcast_consumption_record_id:
      options.broadcast_consumption_record_id??null,
    submission_intent_id:
      options.submission_intent_id??null,
    receipt_observer_invoked:
      options.receipt_observer_invoked===true,
    submit_method_invoked:false,
    transaction_submission_authorized:false,
    automatic_retry_allowed:false,
    receipt_verified:false,
    finality_verified:false,
    raw_signed_transaction_accessed:false,
    opaque_custody_handle_accessed:false,
    filesystem_mutation_performed:false,
    sovereign_private_key_access_performed:false,
    wallet_access_performed:false,
    transaction_signing_performed:false,
    direct_rpc_call_performed:false,
    direct_network_call_performed:false,
    chain2050_write_direct_performed:false,
    authority:
      VOID_DATANET_CONTENT_COMMITMENT_RECONCILED_BROADCAST_RECEIPT_VERIFICATION_AUTHORITY_V1,
    ...(options.detail?{detail:options.detail}:{}),
  };
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
      throw new Error("datanet_receipt_verification_symlink_ancestor_rejected");
    }
  }
}
function validatePrivateStateRoot(raw){
  const supplied=text(raw);
  if(!supplied||!path.isAbsolute(supplied)){
    return {ok:false,reason:"datanet_receipt_verification_state_root_must_be_absolute"};
  }
  const resolved=path.resolve(supplied);
  try{
    assertNoSymlinkAncestors(resolved);
    const stat=fs.lstatSync(resolved);
    if(
      !stat.isDirectory()||
      stat.isSymbolicLink()||
      (stat.mode&0o777)!==0o700||
      (typeof process.getuid==="function"&&stat.uid!==process.getuid())
    ){
      return {ok:false,reason:"datanet_receipt_verification_state_root_invalid"};
    }
    const real=fs.realpathSync(resolved);
    if(real!==resolved){
      return {ok:false,reason:"datanet_receipt_verification_state_root_realpath_mismatch"};
    }
    return {ok:true,realpath:real,realpath_sha256:sha256(real)};
  }catch(error){
    return {
      ok:false,
      reason:"datanet_receipt_verification_state_root_invalid",
      detail:{error_class:safeErrorClass(error)},
    };
  }
}
function assertPrivateDirectory(directory,label){
  const stat=fs.lstatSync(directory);
  if(
    !stat.isDirectory()||
    stat.isSymbolicLink()||
    (stat.mode&0o777)!==0o700||
    (typeof process.getuid==="function"&&stat.uid!==process.getuid())
  ){
    throw new Error(label+"_invalid");
  }
  assertNoSymlinkAncestors(directory);
}
function readPrivateJson(file,label){
  const stat=fs.lstatSync(file);
  if(
    !stat.isFile()||
    stat.isSymbolicLink()||
    (stat.mode&0o777)!==0o600||
    (typeof process.getuid==="function"&&stat.uid!==process.getuid())||
    stat.size<2||
    stat.size>MAX_RECORD_BYTES
  ){
    throw new Error(label+"_invalid");
  }
  assertNoSymlinkAncestors(file);
  return JSON.parse(fs.readFileSync(file,"utf8"));
}
function withoutId(record,key){
  const material={...record};
  delete material[key];
  return material;
}
function validateReconciliation(value,stateHash){
  if(
    !plain(value)||
    value.ok!==true||
    value.marker!==
      "VOID_DATANET_CONTENT_COMMITMENT_BROADCAST_RECONCILIATION_V1"||
    value.version!==1||
    value.status!=="broadcast_reconciled_without_resubmission"||
    text(value.chain_id)!=="2050"||
    !AUTHORIZATION_ID.test(text(value.broadcast_authorization_id))||
    !CONSUMPTION_ID.test(text(value.broadcast_consumption_record_id))||
    !INTENT_ID.test(text(value.submission_intent_id))||
    !SHA256.test(text(value.submission_idempotency_key_sha256))||
    !HASH.test(text(value.signed_transaction_hash))||
    !SHA256.test(text(value.custody_handle_fingerprint_sha256))||
    value.canonical_state_store_realpath_sha256!==stateHash||
    !["confirmed","reverted"].includes(text(value.inspection?.status))||
    value.inspection?.transaction_hash!==value.signed_transaction_hash||
    !SAFE_PROVIDER_ID.test(text(value.inspection?.provider_submission_id))||
    value.inspection?.definitive_not_submitted!==false||
    value.inspection?.submission_may_have_occurred!==true||
    value.authority?.durable_consumption_record_verified!==true||
    value.authority?.durable_submission_intent_verified!==true||
    value.authority?.canonical_state_store_verified!==true||
    value.authority?.metadata_only_request!==true||
    value.authority?.inspection_method_invoked!==true||
    value.authority?.submit_method_invoked!==false||
    value.authority?.transaction_submission_authorized!==false||
    value.authority?.automatic_retry_authorized!==false||
    value.authority?.filesystem_mutation_performed!==false||
    value.submit_method_invoked!==false||
    value.reconciliation_required!==false||
    value.automatic_retry_allowed!==false||
    value.raw_signed_transaction_accessed!==false||
    value.opaque_custody_handle_accessed!==false||
    value.filesystem_mutation_performed!==false||
    value.sovereign_private_key_access_performed!==false||
    value.wallet_access_performed!==false||
    value.transaction_signing_performed!==false||
    value.direct_rpc_call_performed!==false||
    value.direct_network_call_performed!==false||
    value.chain2050_write_direct_performed!==false||
    text(value.next_gate)!=="reconciled_broadcast_receipt_verification_v1"
  ){
    return {ok:false,reason:"datanet_receipt_verification_reconciliation_invalid"};
  }
  const reconciledMs=Date.parse(text(value.reconciled_at_utc));
  if(!Number.isFinite(reconciledMs)){
    return {ok:false,reason:"datanet_receipt_verification_reconciliation_time_invalid"};
  }
  return {ok:true,reconciledMs};
}
function validateConsumption(record,reconciliation,stateHash){
  if(
    !exactKeys(record,CONSUMPTION_KEYS)||
    record.marker!==
      "VOID_DATANET_CONTENT_COMMITMENT_BROADCAST_AUTHORIZATION_CONSUMPTION_V1"||
    record.version!==1||
    record.status!=="broadcast_authorization_consumed_before_broadcaster_access"||
    text(record.chain_id)!=="2050"||
    record.broadcast_authorization_id!==reconciliation.broadcast_authorization_id||
    record.broadcast_consumption_record_id!==
      reconciliation.broadcast_consumption_record_id||
    record.signed_transaction_hash!==reconciliation.signed_transaction_hash||
    record.custody_handle_fingerprint_sha256!==
      reconciliation.custody_handle_fingerprint_sha256||
    record.state_store_realpath_sha256!==stateHash||
    !ADDRESS.test(text(record.publisher_address))||
    !SHA256.test(text(record.unsigned_transaction_candidate_fingerprint_sha256))||
    record.consumption?.authorization_consumed!==true||
    record.consumption?.immutable_consumption_record!==true||
    record.authority?.transaction_broadcast_performed!==false||
    record.authority?.chain2050_write_performed!==false
  ){
    return {ok:false,reason:"datanet_receipt_verification_consumption_invalid"};
  }
  const expected=
    "voiddccbac1_"+
    sha256(canonicalJson(withoutId(record,"broadcast_consumption_record_id")));
  if(expected!==record.broadcast_consumption_record_id){
    return {ok:false,reason:"datanet_receipt_verification_consumption_id_mismatch"};
  }
  return {ok:true};
}
function validateIntent(intent,reconciliation,consumption,stateHash){
  if(
    !exactKeys(intent,INTENT_KEYS)||
    intent.marker!==
      "VOID_DATANET_CONTENT_COMMITMENT_EXACT_SINGLE_SUBMISSION_INTENT_V1"||
    intent.version!==1||
    intent.status!=="claimed_before_exact_single_submit"||
    text(intent.chain_id)!=="2050"||
    intent.domain!==SUBMISSION_DOMAIN||
    intent.broadcast_authorization_id!==reconciliation.broadcast_authorization_id||
    intent.broadcast_consumption_record_id!==
      reconciliation.broadcast_consumption_record_id||
    intent.submission_intent_id!==reconciliation.submission_intent_id||
    intent.submission_idempotency_key_sha256!==
      reconciliation.submission_idempotency_key_sha256||
    intent.signed_transaction_hash!==reconciliation.signed_transaction_hash||
    intent.custody_handle_fingerprint_sha256!==
      reconciliation.custody_handle_fingerprint_sha256||
    intent.canonical_state_store_realpath_sha256!==stateHash||
    intent.publisher_address!==consumption.publisher_address||
    intent.unsigned_transaction_candidate_fingerprint_sha256!==
      consumption.unsigned_transaction_candidate_fingerprint_sha256||
    intent.automatic_retry_authorized!==false
  ){
    return {ok:false,reason:"datanet_receipt_verification_intent_invalid"};
  }
  const expectedIntent=
    "voiddccbasi1_"+sha256(canonicalJson(withoutId(intent,"submission_intent_id")));
  if(expectedIntent!==intent.submission_intent_id){
    return {ok:false,reason:"datanet_receipt_verification_intent_id_mismatch"};
  }
  const expectedKey=sha256(
    canonicalJson({
      domain:SUBMISSION_DOMAIN,
      broadcast_authorization_id:intent.broadcast_authorization_id,
      broadcast_consumption_record_id:intent.broadcast_consumption_record_id,
      inspection_request_id:intent.inspection_request_id,
      signed_transaction_hash:intent.signed_transaction_hash,
      custody_handle_fingerprint_sha256:
        intent.custody_handle_fingerprint_sha256,
      canonical_state_store_realpath_sha256:
        intent.canonical_state_store_realpath_sha256,
    }),
  );
  if(expectedKey!==intent.submission_idempotency_key_sha256){
    return {ok:false,reason:"datanet_receipt_verification_submission_key_mismatch"};
  }
  return {ok:true};
}
function validateReceipt(value,reconciliation,publisher){
  if(!plain(value)){
    return {ok:false,reason:"datanet_receipt_verification_receipt_invalid"};
  }
  if(value.ok===false){
    if(
      !exactKeys(value,["ok","status","reason"])||
      value.status!=="held"||
      !/^[a-z][a-z0-9_]{2,159}$/.test(text(value.reason))
    ){
      return {ok:false,reason:"datanet_receipt_verification_observer_held_invalid"};
    }
    return {
      ok:false,
      reason:"datanet_receipt_verification_observer_held:"+text(value.reason),
    };
  }
  if(
    !exactKeys(
      value,
      [
        "ok","status","chain_id","transaction_hash","transaction_status",
        "block_number","block_hash","current_block_number",
        "confirmation_count","from_address","provider_observation_id",
      ],
    )||
    value.ok!==true||
    !["confirmed","reverted"].includes(text(value.status))||
    text(value.status)!==text(reconciliation.inspection.status)||
    text(value.chain_id)!=="2050"||
    text(value.transaction_hash).toLowerCase()!==reconciliation.signed_transaction_hash||
    !["0","1"].includes(text(value.transaction_status))||
    (text(value.status)==="confirmed"&&text(value.transaction_status)!=="1")||
    (text(value.status)==="reverted"&&text(value.transaction_status)!=="0")||
    !DECIMAL.test(text(value.block_number))||
    BigInt(text(value.block_number))<=0n||
    !HASH.test(text(value.block_hash).toLowerCase())||
    !DECIMAL.test(text(value.current_block_number))||
    BigInt(text(value.current_block_number))<BigInt(text(value.block_number))||
    !DECIMAL.test(text(value.confirmation_count))||
    !ADDRESS.test(text(value.from_address).toLowerCase())||
    text(value.from_address).toLowerCase()!==publisher||
    !SAFE_PROVIDER_ID.test(text(value.provider_observation_id))
  ){
    return {ok:false,reason:"datanet_receipt_verification_receipt_invalid"};
  }
  const observed=
    BigInt(text(value.current_block_number))-
    BigInt(text(value.block_number))+
    1n;
  if(observed.toString()!==text(value.confirmation_count)||observed<=0n){
    return {
      ok:false,
      reason:"datanet_receipt_verification_confirmation_count_invalid",
    };
  }
  return {
    ok:true,
    status:text(value.status),
    transaction_status:text(value.transaction_status),
    transaction_hash:text(value.transaction_hash).toLowerCase(),
    block_number:text(value.block_number),
    block_hash:text(value.block_hash).toLowerCase(),
    current_block_number:text(value.current_block_number),
    confirmation_count:text(value.confirmation_count),
    from_address:text(value.from_address).toLowerCase(),
    provider_observation_id:text(value.provider_observation_id),
  };
}

export async function verifyDatanetContentCommitmentReconciledBroadcastReceiptWithClockV1(
  input,
  observer,
  nowMs,
){
  if(!Number.isSafeInteger(nowMs)||nowMs<=0){
    return held("datanet_receipt_verification_clock_invalid");
  }
  const root=validatePrivateStateRoot(input?.state_dir);
  if(root.ok===false)return held(root.reason,{...(root.detail?{detail:root.detail}:{})});

  const configuredHash=
    text(input?.canonical_state_store_realpath_sha256).toLowerCase();
  if(!SHA256.test(configuredHash)||configuredHash!==root.realpath_sha256){
    return held("datanet_receipt_verification_canonical_state_store_mismatch");
  }

  const reconciliationValidation=
    validateReconciliation(input?.reconciliation,root.realpath_sha256);
  if(reconciliationValidation.ok===false){
    return held(reconciliationValidation.reason);
  }
  const reconciliation=input.reconciliation;

  let consumption;
  let intent;
  try{
    const consumedDir=path.join(root.realpath,"broadcast-consumed");
    const intentsDir=path.join(root.realpath,"broadcast-submission-intents");
    assertPrivateDirectory(consumedDir,"datanet_receipt_verification_consumed_dir");
    assertPrivateDirectory(intentsDir,"datanet_receipt_verification_intents_dir");
    consumption=readPrivateJson(
      path.join(consumedDir,reconciliation.broadcast_authorization_id+".json"),
      "datanet_receipt_verification_consumption_record",
    );
    intent=readPrivateJson(
      path.join(intentsDir,reconciliation.broadcast_authorization_id+".json"),
      "datanet_receipt_verification_submission_intent",
    );
  }catch(error){
    return held(
      "datanet_receipt_verification_durable_state_read_failed",
      {
        broadcast_authorization_id:
          reconciliation.broadcast_authorization_id,
        broadcast_consumption_record_id:
          reconciliation.broadcast_consumption_record_id,
        submission_intent_id:reconciliation.submission_intent_id,
        detail:{error_class:safeErrorClass(error)},
      },
    );
  }

  const consumptionValidation=
    validateConsumption(consumption,reconciliation,root.realpath_sha256);
  if(consumptionValidation.ok===false){
    return held(
      consumptionValidation.reason,
      {
        broadcast_authorization_id:
          reconciliation.broadcast_authorization_id,
        broadcast_consumption_record_id:
          reconciliation.broadcast_consumption_record_id,
        submission_intent_id:reconciliation.submission_intent_id,
      },
    );
  }
  const intentValidation=
    validateIntent(intent,reconciliation,consumption,root.realpath_sha256);
  if(intentValidation.ok===false){
    return held(
      intentValidation.reason,
      {
        broadcast_authorization_id:
          reconciliation.broadcast_authorization_id,
        broadcast_consumption_record_id:
          reconciliation.broadcast_consumption_record_id,
        submission_intent_id:reconciliation.submission_intent_id,
      },
    );
  }
  if(nowMs<reconciliationValidation.reconciledMs){
    return held(
      "datanet_receipt_verification_before_reconciliation_time",
      {
        broadcast_authorization_id:
          reconciliation.broadcast_authorization_id,
        broadcast_consumption_record_id:
          reconciliation.broadcast_consumption_record_id,
        submission_intent_id:reconciliation.submission_intent_id,
      },
    );
  }
  if(!observer||typeof observer.observe_receipt!=="function"){
    return held(
      "datanet_receipt_verification_observer_missing",
      {
        broadcast_authorization_id:
          reconciliation.broadcast_authorization_id,
        broadcast_consumption_record_id:
          reconciliation.broadcast_consumption_record_id,
        submission_intent_id:reconciliation.submission_intent_id,
      },
    );
  }

  const request={
    marker:
      "VOID_DATANET_CONTENT_COMMITMENT_RECONCILED_BROADCAST_RECEIPT_REQUEST_V1",
    version:1,
    chain_id:"2050",
    broadcast_authorization_id:reconciliation.broadcast_authorization_id,
    broadcast_consumption_record_id:
      reconciliation.broadcast_consumption_record_id,
    submission_intent_id:reconciliation.submission_intent_id,
    submission_idempotency_key_sha256:
      reconciliation.submission_idempotency_key_sha256,
    signed_transaction_hash:reconciliation.signed_transaction_hash,
    publisher_address:consumption.publisher_address,
    canonical_state_store_realpath_sha256:root.realpath_sha256,
    expected_terminal_status:reconciliation.inspection.status,
    receipt_observation_only:true,
    transaction_submission_authorized:false,
    automatic_retry_authorized:false,
  };

  let rawReceipt;
  try{
    rawReceipt=await observer.observe_receipt(request);
  }catch(error){
    return held(
      "datanet_receipt_verification_observer_failed",
      {
        broadcast_authorization_id:
          reconciliation.broadcast_authorization_id,
        broadcast_consumption_record_id:
          reconciliation.broadcast_consumption_record_id,
        submission_intent_id:reconciliation.submission_intent_id,
        receipt_observer_invoked:true,
        detail:{error_class:safeErrorClass(error)},
      },
    );
  }
  const receipt=validateReceipt(
    rawReceipt,
    reconciliation,
    consumption.publisher_address,
  );
  if(receipt.ok===false){
    return held(
      receipt.reason,
      {
        broadcast_authorization_id:
          reconciliation.broadcast_authorization_id,
        broadcast_consumption_record_id:
          reconciliation.broadcast_consumption_record_id,
        submission_intent_id:reconciliation.submission_intent_id,
        receipt_observer_invoked:true,
      },
    );
  }

  return {
    ok:true,
    marker:
      VOID_DATANET_CONTENT_COMMITMENT_RECONCILED_BROADCAST_RECEIPT_VERIFICATION_V1,
    version:1,
    status:"reconciled_broadcast_receipt_verified_finality_pending",
    chain_id:"2050",
    broadcast_authorization_id:
      reconciliation.broadcast_authorization_id,
    broadcast_consumption_record_id:
      reconciliation.broadcast_consumption_record_id,
    submission_intent_id:reconciliation.submission_intent_id,
    submission_idempotency_key_sha256:
      reconciliation.submission_idempotency_key_sha256,
    signed_transaction_hash:reconciliation.signed_transaction_hash,
    publisher_address:consumption.publisher_address,
    unsigned_transaction_candidate_fingerprint_sha256:
      consumption.unsigned_transaction_candidate_fingerprint_sha256,
    canonical_state_store_realpath_sha256:root.realpath_sha256,
    reconciliation_status:reconciliation.inspection.status,
    reconciled_at_utc:reconciliation.reconciled_at_utc,
    receipt_observed_at_utc:new Date(nowMs).toISOString(),
    receipt:{
      status:receipt.status,
      transaction_status:receipt.transaction_status,
      transaction_hash:receipt.transaction_hash,
      block_number:receipt.block_number,
      block_hash:receipt.block_hash,
      current_block_number:receipt.current_block_number,
      confirmation_count:receipt.confirmation_count,
      from_address:receipt.from_address,
      provider_observation_id:receipt.provider_observation_id,
    },
    verification:{
      exact_transaction_hash_verified:true,
      exact_publisher_verified:true,
      terminal_status_consistent:true,
      receipt_block_hash_present:true,
      confirmation_arithmetic_verified:true,
      minimum_confirmation_threshold_applied:false,
      accepted_checkpoint_membership_verified:false,
      chain_finality_verified:false,
    },
    authority:{
      terminal_reconciliation_verified:true,
      durable_consumption_record_verified:true,
      durable_submission_intent_verified:true,
      canonical_state_store_verified:true,
      metadata_only_receipt_request:true,
      receipt_observer_invoked:true,
      submit_method_invoked:false,
      transaction_submission_authorized:false,
      automatic_retry_authorized:false,
      filesystem_mutation_performed:false,
      sovereign_private_key_access_performed:false,
      wallet_access_performed:false,
      transaction_signing_performed:false,
      direct_rpc_call_performed:false,
      direct_network_call_performed:false,
      chain2050_write_direct_performed:false,
    },
    next_gate:"chain2050_reconciled_receipt_finality_v1",
    receipt_observer_invoked:true,
    submit_method_invoked:false,
    transaction_submission_authorized:false,
    automatic_retry_allowed:false,
    receipt_verified:true,
    finality_verified:false,
    raw_signed_transaction_accessed:false,
    opaque_custody_handle_accessed:false,
    filesystem_mutation_performed:false,
    sovereign_private_key_access_performed:false,
    wallet_access_performed:false,
    transaction_signing_performed:false,
    direct_rpc_call_performed:false,
    direct_network_call_performed:false,
    chain2050_write_direct_performed:false,
    authority_contract:
      VOID_DATANET_CONTENT_COMMITMENT_RECONCILED_BROADCAST_RECEIPT_VERIFICATION_AUTHORITY_V1,
  };
}

export async function verifyDatanetContentCommitmentReconciledBroadcastReceiptV1(
  input,
  observer,
){
  return verifyDatanetContentCommitmentReconciledBroadcastReceiptWithClockV1(
    input,
    observer,
    Date.now(),
  );
}
