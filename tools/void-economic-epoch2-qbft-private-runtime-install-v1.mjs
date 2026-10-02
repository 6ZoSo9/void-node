#!/usr/bin/env node
import crypto from "node:crypto";

import {
  EXPECTED_GENESIS_SHA256_V1,
} from "./void-economic-epoch2-qbft-private-runtime-plan-v1.mjs";
import {
  renderVoidEconomicEpoch2QbftPrivateRuntimeHostV1,
  validateVoidEconomicEpoch2QbftPrivateRuntimePlanForMaterializationV1,
} from "./void-economic-epoch2-qbft-private-runtime-materialization-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_INSTALL_V1 =
  "VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_INSTALL_V1";
export const VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_INSTALL_CONFIRMATION_V1 =
  "installPrivateEpoch2QbftBundleV1";

const SHA256=/^[0-9a-f]{64}$/u;
const SHA40=/^[0-9a-f]{40}$/u;
const PLAN_ID=/^voide2qprp1_[0-9a-f]{64}$/u;
const BUNDLE_SET_ID=/^voide2qbsv1_[0-9a-f]{64}$/u;
const MATERIALIZATION_ID=/^voide2qmat1_[0-9a-f]{64}$/u;
const ROLES=["precision","nimo","xiphos"];
const INACTIVE_UNIT_FILE_STATES=new Set(["disabled","not-found","static"]);

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

export function validateVoidEconomicEpoch2QbftPrivateRuntimeBundleSetReceiptV1(
  receipt,
  planInput,
  planFileSha256Input,
) {
  const plan=
    validateVoidEconomicEpoch2QbftPrivateRuntimePlanForMaterializationV1(
      planInput,
    );
  const planFileSha256=String(planFileSha256Input||"");
  if(!SHA256.test(planFileSha256)) {
    throw new Error("plan_file_sha256_invalid");
  }
  if(!receipt||typeof receipt!=="object"||Array.isArray(receipt)) {
    throw new Error("bundle_set_receipt_invalid");
  }

  const material=structuredClone(receipt);
  const observedId=String(material.bundle_set_id||"");
  delete material.bundle_set_id;
  const expectedId=
    "voide2qbsv1_"+sha256(Buffer.from(canonicalJson(material)));
  if(observedId!==expectedId||!BUNDLE_SET_ID.test(observedId)) {
    throw new Error("bundle_set_id_mismatch");
  }

  if(
    receipt.marker!==
      "VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_BUNDLE_SET_V1"||
    receipt.version!==1||
    receipt.status!==
      "THREE_HOST_PREPARED_BUNDLE_SET_GREEN_INSTALL_AND_START_HOLD"||
    receipt.plan_id!==plan.plan_id||
    receipt.source_head!==plan.source_head||
    receipt.validator_count!==3||
    receipt.required_quorum!==2||
    receipt.common_genesis_sha256!==EXPECTED_GENESIS_SHA256_V1||
    receipt.common_private_plan_file_sha256!==planFileSha256||
    receipt.next_gate!==
      "separate_explicit_operator_authorization_for_installation_of_reviewed_host_bundles"
  ) {
    throw new Error("bundle_set_receipt_contract_mismatch");
  }

  const expectedVerification={
    exactly_three_roles:true,
    unique_materialization_ids:true,
    common_genesis_exact:true,
    common_private_plan_bytes_exact:true,
    role_static_peers_exact:true,
    role_systemd_unit_hashes_exact:true,
    all_local_prepare_checks_green:true,
    service_installation:false,
    service_start:false,
    authoritative_chain2050_write:false,
    funds_movement:false,
  };
  exactKeys(
    receipt.verification,
    Object.keys(expectedVerification),
    "bundle_set_verification",
  );
  for(const [key,value] of Object.entries(expectedVerification)) {
    if(receipt.verification[key]!==value) {
      throw new Error("bundle_set_verification_mismatch:"+key);
    }
  }

  if(
    !Array.isArray(receipt.roles)||
    receipt.roles.length!==3||
    JSON.stringify(receipt.roles.map((x)=>x.role))!==JSON.stringify(ROLES)
  ) {
    throw new Error("bundle_set_roles_invalid");
  }
  const seen=new Set();
  for(const row of receipt.roles) {
    if(
      !MATERIALIZATION_ID.test(String(row?.materialization_id||""))||
      !SHA40.test(String(row?.prepared_repo_head||""))||
      row?.genesis_sha256!==EXPECTED_GENESIS_SHA256_V1||
      !SHA256.test(String(row?.static_nodes_sha256||""))||
      !SHA256.test(String(row?.systemd_unit_sha256||""))||
      row?.private_plan_file_sha256!==planFileSha256
    ) {
      throw new Error("bundle_set_role_row_invalid:"+String(row?.role));
    }
    if(seen.has(row.materialization_id)) {
      throw new Error("bundle_set_materialization_id_duplicate");
    }
    seen.add(row.materialization_id);
  }
  return Object.freeze({
    plan,
    receipt,
    plan_file_sha256:planFileSha256,
  });
}

export function validateVoidEconomicEpoch2QbftHostInstallBindingV1(input) {
  const validated=
    validateVoidEconomicEpoch2QbftPrivateRuntimeBundleSetReceiptV1(
      input?.bundle_set_receipt,
      input?.plan,
      input?.plan_file_sha256,
    );
  const role=String(input?.role||"");
  if(!ROLES.includes(role)) throw new Error("install_role_invalid");
  const manifest=input?.materialization;
  const row=validated.receipt.roles.find((x)=>x.role===role);
  const planHost=validated.plan.hosts.find((x)=>x.role===role);
  if(!row||!planHost) throw new Error("install_role_binding_missing");

  const expectedRendered=renderVoidEconomicEpoch2QbftPrivateRuntimeHostV1({
    plan:validated.plan,
    role,
    home:"/home/zoso",
    docker_bin:manifest?.docker_bin,
    uid:manifest?.docker_runtime?.host_uid,
    gid:manifest?.docker_runtime?.host_gid,
  });
  if(
    expectedRendered.manifest.materialization_id!==manifest?.materialization_id||
    expectedRendered.manifest.rendered_unit_sha256!==
      manifest?.rendered_unit_sha256||
    expectedRendered.manifest.files.static_nodes.sha256!==
      manifest?.files?.static_nodes?.sha256||
    expectedRendered.manifest.runtime_root!==manifest?.runtime_root||
    expectedRendered.manifest.unit_install_path!==manifest?.unit_install_path
  ) {
    throw new Error("install_materialization_rebuild_mismatch:"+role);
  }

  if(
    manifest?.marker!==
      "VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_MATERIALIZATION_V1"||
    manifest?.version!==1||
    manifest?.status!=="HOST_RUNTIME_PREPARED_INSTALL_AND_START_HOLD"||
    manifest?.role!==role||
    manifest?.plan_id!==validated.plan.plan_id||
    manifest?.source_head!==validated.plan.source_head||
    manifest?.materialization_id!==row.materialization_id||
    manifest?.private_plan_file_sha256!==validated.plan_file_sha256||
    manifest?.files?.genesis?.expected_sha256!==row.genesis_sha256||
    manifest?.files?.static_nodes?.sha256!==row.static_nodes_sha256||
    manifest?.rendered_unit_sha256!==row.systemd_unit_sha256||
    manifest?.activation?.authorized!==false||
    manifest?.activation?.service_start!==false||
    manifest?.activation?.automatic_retry!==false||
    manifest?.activation?.persistent_restart_policy_promoted!==false||
    manifest?.authority?.service_installation!==false||
    manifest?.authority?.systemd_reload!==false||
    manifest?.authority?.service_enable!==false||
    manifest?.authority?.service_start!==false||
    manifest?.authority?.docker_mutation!==false||
    manifest?.authority?.private_key_access!==false||
    manifest?.authority?.authoritative_chain2050_write!==false||
    manifest?.authority?.funds_movement!==false
  ) {
    throw new Error("install_materialization_binding_mismatch:"+role);
  }

  return Object.freeze({
    plan:validated.plan,
    bundle_set_receipt:validated.receipt,
    role,
    row,
    manifest,
    plan_host:planHost,
  });
}

export function buildVoidEconomicEpoch2QbftHostInstallReceiptV1(input) {
  const binding=validateVoidEconomicEpoch2QbftHostInstallBindingV1(input);
  const installedAt=String(input?.installed_at_utc||"");
  if(
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(installedAt)||
    !Number.isFinite(Date.parse(installedAt))
  ) {
    throw new Error("installed_at_utc_invalid");
  }
  const installedRepoHead=String(input?.installed_repo_head||"");
  if(!SHA40.test(installedRepoHead)) {
    throw new Error("installed_repo_head_invalid");
  }
  const unitFileState=String(input?.unit_file_state||"");
  if(!INACTIVE_UNIT_FILE_STATES.has(unitFileState)) {
    throw new Error("install_unit_file_state_invalid");
  }
  if(input?.direct_enablement_links_absent!==true) {
    throw new Error("install_direct_enablement_links_not_proven_absent");
  }

  const material={
    marker:VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_INSTALL_V1,
    version:1,
    status:"HOST_BUNDLE_INSTALLED_DAEMON_RELOAD_AND_START_HOLD",
    plan_id:binding.plan.plan_id,
    bundle_set_id:binding.bundle_set_receipt.bundle_set_id,
    materialization_id:binding.manifest.materialization_id,
    role:binding.role,
    hostname:binding.manifest.hostname,
    installed_at_utc:installedAt,
    installed_repo_head:installedRepoHead,
    runtime_root:binding.manifest.runtime_root,
    unit_install_path:binding.manifest.unit_install_path,
    installed_hashes:{
      genesis_sha256:binding.row.genesis_sha256,
      static_nodes_sha256:binding.row.static_nodes_sha256,
      systemd_unit_sha256:binding.row.systemd_unit_sha256,
      private_plan_file_sha256:binding.row.private_plan_file_sha256,
    },
    post_install_state:{
      runtime_root_present:true,
      data_directory_empty:true,
      user_unit_file_present:true,
      user_unit_file_mode:"0600",
      unit_file_state:unitFileState,
      direct_enablement_links_absent:true,
      indirect_activation_absence_proven:false,
      unit_active:false,
      daemon_reload_performed:false,
      service_start_performed:false,
      docker_mutation:false,
      nodekey_content_read:false,
      plugin_content_mutated:false,
      authoritative_chain2050_write:false,
      funds_movement:false,
    },
    authority:{
      runtime_root_write:true,
      service_unit_installation:true,
      systemd_reload:false,
      service_enable:false,
      service_start:false,
      docker_mutation:false,
      private_key_access:false,
      credential_content_access:false,
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
    },
    next_gate:
      "fresh_three_host_revalidation_then_separate_explicit_validator_start_authorization",
  };
  return Object.freeze({
    ...material,
    install_receipt_id:
      "voide2qinst1_"+sha256(Buffer.from(canonicalJson(material))),
  });
}
