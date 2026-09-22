import fs from "node:fs";
import path from "node:path";
import {
  getAddress,
} from "ethers";
import {
  verifyDatanetContentCommitmentSovereignSingleTransactionAuthorizationAgainstFingerprintV1,
  verifyDatanetContentCommitmentSovereignSingleTransactionAuthorizationV1,
} from "./datanet-content-commitment-sovereign-single-transaction-authorization-v1.mjs";
import {
  canonicalJson,
  sha256,
} from "./datanet-content-commitment-compiler-profile-v1.mjs";

export const VOID_DATANET_CONTENT_COMMITMENT_EXACT_PUBLISHER_SIGNING_REQUEST_V1 =
  "VOID_DATANET_CONTENT_COMMITMENT_EXACT_PUBLISHER_SIGNING_REQUEST_V1";

export const VOID_DATANET_CONTENT_COMMITMENT_EXACT_PUBLISHER_SIGNING_REQUEST_AUTHORITY_V1 = {
  source_only_request_construction:true,
  sovereign_authorization_reverified:true,
  durable_consumption_record_readback_required:true,
  canonical_state_store_fingerprint_required:true,
  runtime_expiry_recheck_required:true,
  exact_unsigned_transaction_fingerprint_rederived:true,
  exact_transaction_summary_rederived:true,
  deterministic_external_signing_idempotency_key:true,
  external_signer_prepare_once_required:true,
  external_signer_inspection_required:true,
  external_opaque_custody_required:true,
  external_signer_address_must_equal_publisher:true,
  external_signer_runtime_expiry_recheck_required:true,
  raw_signed_transaction_application_input:false,
  raw_signed_transaction_application_output:false,
  raw_signed_transaction_application_persistence:false,
  filesystem_mutation:false,
  sovereign_private_key_access:false,
  transaction_signer_access:false,
  wallet_access:false,
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

const SIGNING_REQUEST_DOMAIN=
  "void.datanet.content-commitment.exact-publisher-signing-request.v1";
const ADDRESS=/^0x[0-9a-f]{40}$/;
const SHA256=/^[0-9a-f]{64}$/;
const AUTHORIZATION_ID=/^voiddccsta1_[0-9a-f]{64}$/;
const AUTHORIZATION_VERIFICATION_ID=/^voiddccstav1_[0-9a-f]{64}$/;
const FINAL_REVIEW_ID=/^voiddccfsrp1_[0-9a-f]{64}$/;
const CONSUMPTION_ID=/^voiddccstac1_[0-9a-f]{64}$/;
const REQUEST_ID=/^voiddccpsreq1_[0-9a-f]{64}$/;
const MAX_RECORD_BYTES=128*1024;

function plain(value){
  return value!==null&&typeof value==="object"&&!Array.isArray(value);
}
function text(value){
  return typeof value==="string"?value.trim():"";
}
function address(value){
  const raw=text(value);
  if(!/^0x[0-9a-fA-F]{40}$/.test(raw))return "";
  try{
    const normalized=getAddress(raw).toLowerCase();
    return ADDRESS.test(normalized)?normalized:"";
  }catch{
    return "";
  }
}
function safeErrorClass(error){
  const raw=text(error?.name||"Error");
  return /^[A-Za-z0-9._:-]{1,80}$/.test(raw)?raw:"Error";
}
function held(reason,options={}){
  return {
    ok:false,
    marker:VOID_DATANET_CONTENT_COMMITMENT_EXACT_PUBLISHER_SIGNING_REQUEST_V1,
    version:1,
    status:"held",
    reason,
    authorization_id:options.authorization_id??null,
    consumption_record_id:options.consumption_record_id??null,
    signing_request_constructed:false,
    filesystem_mutation_performed:false,
    sovereign_private_key_access_performed:false,
    transaction_signer_access_performed:false,
    wallet_access_performed:false,
    transaction_signing_performed:false,
    transaction_broadcast_performed:false,
    chain2050_write_performed:false,
    authority:
      VOID_DATANET_CONTENT_COMMITMENT_EXACT_PUBLISHER_SIGNING_REQUEST_AUTHORITY_V1,
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
      throw new Error("datanet_signing_request_symlink_ancestor_rejected");
    }
  }
}
function validatePrivateStateRoot(raw){
  const supplied=text(raw);
  if(!supplied||!path.isAbsolute(supplied)){
    return {ok:false,reason:"datanet_signing_request_state_root_must_be_absolute"};
  }
  const resolved=path.resolve(supplied);
  try{
    assertNoSymlinkAncestors(resolved);
    const stat=fs.lstatSync(resolved);
    if(!stat.isDirectory()||stat.isSymbolicLink()){
      return {
        ok:false,
        reason:"datanet_signing_request_state_root_not_direct_directory",
      };
    }
    if(typeof process.getuid==="function"&&stat.uid!==process.getuid()){
      return {
        ok:false,
        reason:"datanet_signing_request_state_root_owner_mismatch",
      };
    }
    if((stat.mode&0o777)!==0o700){
      return {
        ok:false,
        reason:"datanet_signing_request_state_root_mode_must_be_0700",
      };
    }
    const real=fs.realpathSync(resolved);
    if(real!==resolved){
      return {
        ok:false,
        reason:"datanet_signing_request_state_root_realpath_mismatch",
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
      reason:"datanet_signing_request_state_root_invalid",
      detail:{error_class:safeErrorClass(error)},
    };
  }
}
function assertPrivateRecord(file){
  const stat=fs.lstatSync(file);
  if(!stat.isFile()||stat.isSymbolicLink()){
    throw new Error("datanet_signing_request_record_not_direct_file");
  }
  if(typeof process.getuid==="function"&&stat.uid!==process.getuid()){
    throw new Error("datanet_signing_request_record_owner_mismatch");
  }
  if((stat.mode&0o777)!==0o600){
    throw new Error("datanet_signing_request_record_mode_must_be_0600");
  }
  if(stat.size<2||stat.size>MAX_RECORD_BYTES){
    throw new Error("datanet_signing_request_record_size_invalid");
  }
}
function transactionSummary(candidate){
  if(!plain(candidate))return null;
  const from=address(candidate.from_address);
  const to=address(candidate.to_address);
  const calldata=text(candidate.calldata);
  const nonce=text(candidate.nonce);
  const gasLimit=text(candidate.gas_limit);
  const maxFee=text(candidate.max_fee_per_gas_wei);
  const priority=text(candidate.max_priority_fee_per_gas_wei);
  if(
    candidate.transaction_type!==2||
    text(candidate.chain_id)!=="2050"||
    !from||
    !to||
    from===to||
    text(candidate.value_wei)!=="0"||
    !/^(0|[1-9][0-9]*)$/.test(nonce)||
    !/^[1-9][0-9]*$/.test(gasLimit)||
    !/^[1-9][0-9]*$/.test(maxFee)||
    !/^(0|[1-9][0-9]*)$/.test(priority)||
    BigInt(priority)>BigInt(maxFee)||
    !/^0x(?:[0-9a-f]{2})+$/.test(calldata)
  )return null;
  return {
    transaction_type:2,
    chain_id:"2050",
    nonce,
    from_address:from,
    to_address:to,
    value_wei:"0",
    gas_limit:gasLimit,
    max_fee_per_gas_wei:maxFee,
    max_priority_fee_per_gas_wei:priority,
    calldata_sha256:sha256(Buffer.from(calldata.slice(2),"hex")),
  };
}
function normalizedCandidate(candidate){
  const summary=transactionSummary(candidate);
  if(!summary)return null;
  return {
    transaction_type:2,
    chain_id:"2050",
    nonce:summary.nonce,
    from_address:summary.from_address,
    to_address:summary.to_address,
    value_wei:"0",
    calldata:text(candidate.calldata),
    gas_limit:summary.gas_limit,
    max_fee_per_gas_wei:summary.max_fee_per_gas_wei,
    max_priority_fee_per_gas_wei:summary.max_priority_fee_per_gas_wei,
  };
}
function consumptionStoredRecordFromReceipt(receipt){
  if(!plain(receipt))return null;
  const material={
    marker:receipt.marker,
    version:receipt.version,
    status:receipt.status,
    chain_id:receipt.chain_id,
    authorization_id:receipt.authorization_id,
    authorization_verification_id:receipt.authorization_verification_id,
    final_signing_review_preflight_id:
      receipt.final_signing_review_preflight_id,
    fresh_pre_sign_revalidation_id:receipt.fresh_pre_sign_revalidation_id,
    fresh_credential_binding_id:receipt.fresh_credential_binding_id,
    unsigned_transaction_candidate_fingerprint_sha256:
      receipt.unsigned_transaction_candidate_fingerprint_sha256,
    publisher_address:receipt.publisher_address,
    transaction_summary:receipt.transaction_summary,
    issued_at_utc:receipt.issued_at_utc,
    expires_at_utc:receipt.expires_at_utc,
    consumed_at_utc:receipt.consumed_at_utc,
    state_store_realpath_sha256:receipt.state_store_realpath_sha256,
    consumption:receipt.consumption,
    authority:receipt.authority,
    next_gate:receipt.next_gate,
  };
  return {
    ...material,
    consumption_record_id:
      "voiddccstac1_"+sha256(canonicalJson(material)),
  };
}
function validateConsumptionReceipt(
  receipt,
  verifiedAuthorization,
  finalReview,
  actualStateHash,
  configuredStateHash,
){
  if(
    !plain(receipt)||
    receipt.ok!==true||
    receipt.marker!==
      "VOID_DATANET_CONTENT_COMMITMENT_SINGLE_USE_AUTHORIZATION_CONSUMPTION_V1"||
    receipt.version!==1||
    receipt.status!=="authorization_consumed_for_exact_transaction_signing"||
    text(receipt.chain_id)!=="2050"||
    !AUTHORIZATION_ID.test(text(receipt.authorization_id))||
    !AUTHORIZATION_VERIFICATION_ID.test(
      text(receipt.authorization_verification_id),
    )||
    !FINAL_REVIEW_ID.test(text(receipt.final_signing_review_preflight_id))||
    !CONSUMPTION_ID.test(text(receipt.consumption_record_id))||
    receipt.authorization_id!==verifiedAuthorization.authorization_id||
    receipt.authorization_verification_id!==
      verifiedAuthorization.authorization_verification_id||
    receipt.final_signing_review_preflight_id!==
      verifiedAuthorization.final_signing_review_preflight_id||
    receipt.unsigned_transaction_candidate_fingerprint_sha256!==
      verifiedAuthorization.unsigned_transaction_candidate_fingerprint_sha256||
    receipt.publisher_address!==verifiedAuthorization.publisher_address||
    canonicalJson(receipt.transaction_summary)!==
      canonicalJson(verifiedAuthorization.transaction_summary)||
    receipt.issued_at_utc!==verifiedAuthorization.issued_at_utc||
    receipt.expires_at_utc!==verifiedAuthorization.expires_at_utc||
    !SHA256.test(text(receipt.state_store_realpath_sha256))||
    receipt.state_store_realpath_sha256!==actualStateHash||
    receipt.state_store_realpath_sha256!==configuredStateHash||
    receipt.consumption?.single_use!==true||
    receipt.consumption?.authorization_consumed!==true||
    receipt.consumption?.immutable_consumption_record!==true||
    receipt.consumption?.replay_rejected_within_exact_state_store!==true||
    receipt.consumption?.replay_prevention_scope!=="exact_state_store_realpath"||
    receipt.consumption?.global_replay_prevention_claimed!==false||
    receipt.consumption?.canonical_state_store_runtime_binding_required!==true||
    receipt.consumption?.expiry_rechecked_at_consumption!==true||
    receipt.consumption?.consumption_precedes_any_signer_access!==true||
    receipt.authority?.filesystem_mutation_performed!==true||
    receipt.authority?.signer_object_exposed!==false||
    receipt.authority?.transaction_signer_access_performed!==false||
    receipt.authority?.wallet_access_performed!==false||
    receipt.authority?.transaction_signing_authorized_by_this_gate!==false||
    receipt.authority?.transaction_signing_performed!==false||
    receipt.authority?.transaction_broadcast_authorized!==false||
    receipt.authority?.transaction_broadcast_performed!==false||
    receipt.authority?.chain2050_write_authorized!==false||
    receipt.authority?.chain2050_write_performed!==false||
    receipt.durable_consumption_record_published!==true||
    receipt.consumption_record_mode!=="0600"||
    receipt.state_store_directory_mode!=="0700"||
    receipt.signer_object_exposed!==false||
    receipt.transaction_signer_access_performed!==false||
    receipt.wallet_access_performed!==false||
    receipt.transaction_signing_performed!==false||
    receipt.transaction_broadcast_performed!==false||
    receipt.chain2050_write_performed!==false||
    text(receipt.next_gate)!==
      "exact_publisher_transaction_signing_from_consumed_authorization_v1"
  ){
    return {
      ok:false,
      reason:"datanet_signing_request_consumption_receipt_invalid",
    };
  }
  const stored=consumptionStoredRecordFromReceipt(receipt);
  if(
    !stored||
    stored.consumption_record_id!==receipt.consumption_record_id
  ){
    return {
      ok:false,
      reason:"datanet_signing_request_consumption_record_id_mismatch",
    };
  }
  const candidate=normalizedCandidate(finalReview?.unsigned_transaction_candidate);
  if(!candidate){
    return {ok:false,reason:"datanet_signing_request_candidate_invalid"};
  }
  const candidateFingerprint=sha256(canonicalJson(candidate));
  const summary=transactionSummary(candidate);
  if(
    candidateFingerprint!==
      receipt.unsigned_transaction_candidate_fingerprint_sha256||
    canonicalJson(summary)!==canonicalJson(receipt.transaction_summary)
  ){
    return {
      ok:false,
      reason:"datanet_signing_request_candidate_binding_mismatch",
    };
  }
  const issuedMs=Date.parse(text(receipt.issued_at_utc));
  const expiresMs=Date.parse(text(receipt.expires_at_utc));
  const consumedMs=Date.parse(text(receipt.consumed_at_utc));
  if(
    !Number.isFinite(issuedMs)||
    !Number.isFinite(expiresMs)||
    !Number.isFinite(consumedMs)||
    consumedMs<issuedMs||
    consumedMs>=expiresMs
  ){
    return {
      ok:false,
      reason:"datanet_signing_request_consumption_time_invalid",
    };
  }
  return {
    ok:true,
    stored,
    candidate,
    candidate_fingerprint:candidateFingerprint,
    summary,
    issued_ms:issuedMs,
    expires_ms:expiresMs,
    consumed_ms:consumedMs,
  };
}
function validateConsumptionDisk(root,receipt,storedExpected){
  const consumedDir=path.join(root,"consumed");
  const dirStat=fs.lstatSync(consumedDir);
  if(
    !dirStat.isDirectory()||
    dirStat.isSymbolicLink()||
    (dirStat.mode&0o777)!==0o700||
    (typeof process.getuid==="function"&&dirStat.uid!==process.getuid())
  ){
    throw new Error("datanet_signing_request_consumed_dir_invalid");
  }
  assertNoSymlinkAncestors(consumedDir);
  const file=path.join(consumedDir,receipt.authorization_id+".json");
  assertPrivateRecord(file);
  const stored=JSON.parse(fs.readFileSync(file,"utf8"));
  if(canonicalJson(stored)!==canonicalJson(storedExpected)){
    throw new Error(
      "datanet_signing_request_consumption_record_readback_mismatch",
    );
  }
}
function externalSigningIdempotencyKey(receipt,candidateFingerprint){
  return sha256(
    canonicalJson({
      domain:SIGNING_REQUEST_DOMAIN,
      authorization_id:receipt.authorization_id,
      authorization_verification_id:receipt.authorization_verification_id,
      consumption_record_id:receipt.consumption_record_id,
      final_signing_review_preflight_id:
        receipt.final_signing_review_preflight_id,
      unsigned_transaction_candidate_fingerprint_sha256:candidateFingerprint,
      publisher_address:receipt.publisher_address,
    }),
  );
}

export function buildDatanetContentCommitmentExactPublisherSigningRequestAgainstFingerprintWithClockV1(
  input,
  expectedSovereignFingerprint,
  nowMs,
){
  let verified;
  try{
    verified=
      verifyDatanetContentCommitmentSovereignSingleTransactionAuthorizationAgainstFingerprintV1(
        {
          final_signing_review:input?.final_signing_review,
          authorization_envelope:input?.authorization_envelope,
        },
        expectedSovereignFingerprint,
      );
  }catch(error){
    return held(
      "datanet_signing_request_sovereign_verifier_failed",
      {detail:{error_class:safeErrorClass(error)}},
    );
  }
  if(verified?.ok===false){
    return held(
      "datanet_signing_request_authorization_held:"+text(verified.reason),
    );
  }
  if(!Number.isSafeInteger(nowMs)||nowMs<=0){
    return held("datanet_signing_request_clock_invalid",{
      authorization_id:verified.authorization_id,
    });
  }
  const issuedMs=Date.parse(text(verified.issued_at_utc));
  const expiresMs=Date.parse(text(verified.expires_at_utc));
  if(
    !Number.isFinite(issuedMs)||
    !Number.isFinite(expiresMs)||
    nowMs<issuedMs
  ){
    return held("datanet_signing_request_authorization_not_yet_valid",{
      authorization_id:verified.authorization_id,
    });
  }
  if(nowMs>=expiresMs){
    return held("datanet_signing_request_authorization_expired",{
      authorization_id:verified.authorization_id,
    });
  }

  const root=validatePrivateStateRoot(input?.state_dir);
  if(root.ok===false){
    return held(root.reason,{
      authorization_id:verified.authorization_id,
      ...(root.detail?{detail:root.detail}:{}),
    });
  }
  const configuredStateHash=
    text(input?.canonical_state_store_realpath_sha256).toLowerCase();
  if(
    !SHA256.test(configuredStateHash)||
    configuredStateHash!==root.realpath_sha256
  ){
    return held("datanet_signing_request_canonical_state_store_mismatch",{
      authorization_id:verified.authorization_id,
    });
  }

  const receiptValidation=validateConsumptionReceipt(
    input?.consumption_receipt,
    verified,
    input?.final_signing_review,
    root.realpath_sha256,
    configuredStateHash,
  );
  if(receiptValidation.ok===false){
    return held(receiptValidation.reason,{
      authorization_id:verified.authorization_id,
    });
  }
  if(nowMs<receiptValidation.consumed_ms){
    return held("datanet_signing_request_before_consumption_time",{
      authorization_id:verified.authorization_id,
      consumption_record_id:input?.consumption_receipt?.consumption_record_id,
    });
  }
  if(nowMs>=receiptValidation.expires_ms){
    return held("datanet_signing_request_authorization_expired",{
      authorization_id:verified.authorization_id,
      consumption_record_id:input?.consumption_receipt?.consumption_record_id,
    });
  }

  try{
    validateConsumptionDisk(
      root.realpath,
      input.consumption_receipt,
      receiptValidation.stored,
    );
  }catch(error){
    return held("datanet_signing_request_consumption_disk_validation_failed",{
      authorization_id:verified.authorization_id,
      consumption_record_id:input?.consumption_receipt?.consumption_record_id,
      detail:{message:text(error?.message||error).slice(0,240)},
    });
  }

  const idempotencyKey=externalSigningIdempotencyKey(
    input.consumption_receipt,
    receiptValidation.candidate_fingerprint,
  );
  const material={
    marker:
      VOID_DATANET_CONTENT_COMMITMENT_EXACT_PUBLISHER_SIGNING_REQUEST_V1,
    version:1,
    status:"exact_consumed_transaction_ready_for_external_signing_request",
    chain_id:"2050",
    authorization_id:verified.authorization_id,
    authorization_verification_id:verified.authorization_verification_id,
    consumption_record_id:input.consumption_receipt.consumption_record_id,
    final_signing_review_preflight_id:
      verified.final_signing_review_preflight_id,
    unsigned_transaction_candidate_fingerprint_sha256:
      receiptValidation.candidate_fingerprint,
    publisher_address:receiptValidation.candidate.from_address,
    unsigned_transaction_candidate:receiptValidation.candidate,
    transaction_summary:receiptValidation.summary,
    canonical_state_store_realpath_sha256:root.realpath_sha256,
    external_signing_idempotency_key_sha256:idempotencyKey,
    issued_at_utc:verified.issued_at_utc,
    expires_at_utc:verified.expires_at_utc,
    request_constructed_at_utc:new Date(nowMs).toISOString(),
    external_signer_contract:{
      prepare_once_required:true,
      inspect_prepared_required:true,
      signer_address_must_equal_publisher:true,
      exact_unsigned_transaction_fingerprint_required:true,
      external_runtime_expiry_recheck_required:true,
      opaque_custody_required:true,
      raw_signed_transaction_application_input:false,
      raw_signed_transaction_application_output:false,
      raw_signed_transaction_application_persistence:false,
      signed_transaction_hash_output_permitted:true,
      custody_handle_fingerprint_output_permitted:true,
      transaction_broadcast_authorized:false,
    },
    authority:{
      signing_request_only:true,
      sovereign_exact_transaction_signing_authorization_verified:true,
      durable_authorization_consumption_verified:true,
      application_private_key_access_performed:false,
      application_wallet_access_performed:false,
      transaction_signer_access_performed:false,
      transaction_signing_performed:false,
      transaction_broadcast_authorized:false,
      transaction_broadcast_performed:false,
      chain2050_write_authorized:false,
      chain2050_write_performed:false,
      filesystem_mutation_performed:false,
      validator_mutation_authorized:false,
      governance_mutation_authorized:false,
      work_credit_mutation_authorized:false,
      service_action_authorized:false,
      funds_action_authorized:false,
      automatic_retry_authorized:false,
    },
    next_gate:
      "external_opaque_signer_execution_and_signed_receipt_verification_outside_application_v1",
  };

  const requestId=
    "voiddccpsreq1_"+sha256(canonicalJson(material));
  if(!REQUEST_ID.test(requestId)){
    return held("datanet_signing_request_id_invalid",{
      authorization_id:verified.authorization_id,
      consumption_record_id:input.consumption_receipt.consumption_record_id,
    });
  }

  return {
    ok:true,
    ...material,
    signing_request_id:requestId,
    signing_request_constructed:true,
    filesystem_mutation_performed:false,
    sovereign_private_key_access_performed:false,
    transaction_signer_access_performed:false,
    wallet_access_performed:false,
    transaction_signing_performed:false,
    transaction_broadcast_performed:false,
    chain2050_write_performed:false,
    authority_contract:
      VOID_DATANET_CONTENT_COMMITMENT_EXACT_PUBLISHER_SIGNING_REQUEST_AUTHORITY_V1,
  };
}

export function buildDatanetContentCommitmentExactPublisherSigningRequestWithClockV1(
  input,
  nowMs,
){
  let verified;
  try{
    verified=
      verifyDatanetContentCommitmentSovereignSingleTransactionAuthorizationV1({
        final_signing_review:input?.final_signing_review,
        authorization_envelope:input?.authorization_envelope,
      });
  }catch(error){
    return held(
      "datanet_signing_request_sovereign_verifier_failed",
      {detail:{error_class:safeErrorClass(error)}},
    );
  }
  if(verified?.ok===false){
    return held(
      "datanet_signing_request_authorization_held:"+text(verified.reason),
    );
  }
  return buildDatanetContentCommitmentExactPublisherSigningRequestAgainstFingerprintWithClockV1(
    input,
    verified.signer_public_key_der_sha256,
    nowMs,
  );
}

export function buildDatanetContentCommitmentExactPublisherSigningRequestV1(
  input,
){
  return buildDatanetContentCommitmentExactPublisherSigningRequestWithClockV1(
    input,
    Date.now(),
  );
}
