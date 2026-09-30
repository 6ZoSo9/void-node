#!/usr/bin/env node
import crypto from "node:crypto";

import {
  validateVoidEconomicEpoch2QbftHostPrestartReceiptV1,
} from "./void-economic-epoch2-qbft-private-runtime-prestart-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_START_ADMISSION_V1 =
  "VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_START_ADMISSION_V1";

const ROLES=["precision","nimo","xiphos"];
const SHA40=/^[0-9a-f]{40}$/u;

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
function canonical(value) {
  if(value===null||typeof value==="string"||typeof value==="boolean") return value;
  if(typeof value==="number"&&Number.isFinite(value)) return value;
  if(Array.isArray(value)) return value.map(canonical);
  if(value&&typeof value==="object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key)=>[key,canonical(value[key])]),
    );
  }
  throw new Error("unsupported_canonical_value");
}
function canonicalJson(value) {
  return JSON.stringify(canonical(value));
}
function exactKeys(value,keys,label) {
  if(!value||typeof value!=="object"||Array.isArray(value)) {
    throw new Error(label+"_invalid");
  }
  const a=Object.keys(value).sort();
  const b=[...keys].sort();
  if(JSON.stringify(a)!==JSON.stringify(b)) {
    throw new Error(label+"_keys_invalid");
  }
}

export function buildVoidEconomicEpoch2QbftPrivateRuntimeStartAdmissionV1(input) {
  const evaluatedAt=String(input?.evaluated_at_utc||"");
  const evaluatedMs=Date.parse(evaluatedAt);
  if(
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(evaluatedAt)||
    !Number.isFinite(evaluatedMs)
  ) {
    throw new Error("start_admission_evaluation_time_invalid");
  }

  const receipts=input?.receipts;
  if(!receipts||typeof receipts!=="object"||Array.isArray(receipts)) {
    throw new Error("start_admission_receipts_invalid");
  }
  if(JSON.stringify(Object.keys(receipts).sort())!==JSON.stringify([...ROLES].sort())) {
    throw new Error("start_admission_role_set_invalid");
  }

  const rows=[];
  const planIds=new Set();
  const bundleSetIds=new Set();
  const repoHeads=new Set();
  const installIds=new Set();
  const observedTimes=[];

  for(const role of ROLES) {
    const receipt=validateVoidEconomicEpoch2QbftHostPrestartReceiptV1(
      receipts[role],
    );
    if(receipt.role!==role) throw new Error("start_admission_role_mismatch:"+role);
    const observedMs=Date.parse(receipt.observed_at_utc);
    const validMs=Date.parse(receipt.valid_until_utc);
    if(
      !Number.isFinite(observedMs)||
      !Number.isFinite(validMs)||
      observedMs>evaluatedMs||
      evaluatedMs>validMs
    ) {
      throw new Error("start_admission_receipt_not_fresh:"+role);
    }
    if(!SHA40.test(String(receipt.observed_repo_head||""))) {
      throw new Error("start_admission_repo_head_invalid:"+role);
    }

    const expectedAuthority={
      observation_only:true,
      filesystem_read:true,
      nodekey_content_read_for_identity_revalidation:true,
      nodekey_bytes_emitted:false,
      nodekey_bytes_persisted:false,
      service_action:false,
      systemd_reload:false,
      service_enable:false,
      service_start:false,
      docker_inspection:true,
      docker_mutation:false,
      transaction_construction:false,
      transaction_signing:false,
      transaction_submission:false,
      transaction_broadcast:false,
      authoritative_chain2050_write:false,
      validator_mutation:false,
      token_movement:false,
      funds_movement:false,
      migration_authorized:false,
      public_activation_authorized:false,
    };
    exactKeys(receipt.authority,Object.keys(expectedAuthority),"prestart_authority_"+role);
    for(const [key,value] of Object.entries(expectedAuthority)) {
      if(receipt.authority[key]!==value) {
        throw new Error("start_admission_authority_mismatch:"+role+":"+key);
      }
    }

    if(receipt.start_authorized!==false) {
      throw new Error("start_admission_premature_authority:"+role);
    }

    planIds.add(receipt.plan_id);
    bundleSetIds.add(receipt.bundle_set_id);
    repoHeads.add(receipt.observed_repo_head);
    if(installIds.has(receipt.install_receipt_id)) {
      throw new Error("start_admission_install_receipt_duplicate");
    }
    installIds.add(receipt.install_receipt_id);
    observedTimes.push(observedMs);
    rows.push({
      role,
      hostname:receipt.hostname,
      prestart_receipt_id:receipt.prestart_receipt_id,
      install_receipt_id:receipt.install_receipt_id,
      materialization_id:receipt.materialization_id,
      observed_repo_head:receipt.observed_repo_head,
      observed_at_utc:receipt.observed_at_utc,
      valid_until_utc:receipt.valid_until_utc,
      tailscale_ipv4:receipt.tailscale_ipv4,
      enode:receipt.enode,
      validator_address:receipt.validator_address,
      besu_public_key:receipt.besu_public_key,
    });
  }

  if(planIds.size!==1) throw new Error("start_admission_plan_id_not_common");
  if(bundleSetIds.size!==1) throw new Error("start_admission_bundle_set_id_not_common");
  if(repoHeads.size!==1) throw new Error("start_admission_repo_head_not_common");
  if(Math.max(...observedTimes)-Math.min(...observedTimes)>120000) {
    throw new Error("start_admission_observation_skew_exceeded");
  }

  const material={
    marker:VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_START_ADMISSION_V1,
    version:1,
    status:"THREE_HOST_PRESTART_GREEN_VALIDATOR_START_CONFIRMATION_REQUIRED",
    evaluated_at_utc:evaluatedAt,
    plan_id:[...planIds][0],
    bundle_set_id:[...bundleSetIds][0],
    observed_repo_head:[...repoHeads][0],
    validator_count:3,
    required_quorum:2,
    receipts:rows,
    verification:{
      exactly_three_roles:true,
      unique_install_receipts:true,
      common_plan_id:true,
      common_bundle_set_id:true,
      common_repo_head:true,
      all_receipts_fresh_at_common_evaluation_time:true,
      maximum_observation_skew_seconds:120,
      all_validator_private_keys_revalidated_locally:true,
      nodekey_bytes_emitted:false,
      nodekey_bytes_persisted:false,
      all_services_inactive:true,
      all_services_disabled:true,
      all_candidate_ports_vacant:true,
      service_start:false,
      authoritative_chain2050_write:false,
      transaction_submission:false,
      funds_movement:false,
    },
    start_authorized:false,
    required_start_confirmation:"startPrivateEpoch2QbftSuccessorV1",
    automatic_retry:false,
    next_gate:
      "separate_explicit_operator_authorization_to_start_private_epoch2_qbft_validators",
  };

  return Object.freeze({
    ...material,
    start_admission_id:
      "voide2qsad1_"+sha256(Buffer.from(canonicalJson(material))),
  });
}
