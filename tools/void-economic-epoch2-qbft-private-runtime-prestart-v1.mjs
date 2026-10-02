#!/usr/bin/env node
import crypto from "node:crypto";

import {
  buildVoidEconomicEpoch2QbftHostInstallReceiptV1,
  validateVoidEconomicEpoch2QbftHostInstallBindingV1,
} from "./void-economic-epoch2-qbft-private-runtime-install-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_PRESTART_V1 =
  "VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_PRESTART_V1";

const SHA256=/^[0-9a-f]{64}$/u;
const SHA40=/^[0-9a-f]{40}$/u;
const PRESTART_ID=/^voide2qpre1_[0-9a-f]{64}$/u;
const INSTALL_ID=/^voide2qinst1_[0-9a-f]{64}$/u;
const PLAN_ID=/^voide2qprp1_[0-9a-f]{64}$/u;
const BUNDLE_SET_ID=/^voide2qbsv1_[0-9a-f]{64}$/u;
const MATERIALIZATION_ID=/^voide2qmat1_[0-9a-f]{64}$/u;
const SHA40_ID=/^[0-9a-f]{40}$/u;
const ADDRESS=/^0x[0-9a-f]{40}$/u;
const PUBLIC_KEY=/^0x04[0-9a-f]{128}$/u;
const ENODE=/^enode:\/\/[0-9a-f]{128}@[0-9.]+:30313$/u;
const ROLES=["precision","nimo","xiphos"];

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

export function validateVoidEconomicEpoch2QbftInstallReceiptV1(input) {
  const binding=validateVoidEconomicEpoch2QbftHostInstallBindingV1({
    plan:input?.plan,
    plan_file_sha256:input?.plan_file_sha256,
    bundle_set_receipt:input?.bundle_set_receipt,
    role:input?.role,
    materialization:input?.materialization,
  });
  const receipt=input?.install_receipt;
  if(!receipt||typeof receipt!=="object"||Array.isArray(receipt)) {
    throw new Error("install_receipt_invalid");
  }
  if(!INSTALL_ID.test(String(receipt.install_receipt_id||""))) {
    throw new Error("install_receipt_id_shape_invalid");
  }
  const rebuilt=buildVoidEconomicEpoch2QbftHostInstallReceiptV1({
    plan:input.plan,
    plan_file_sha256:input.plan_file_sha256,
    bundle_set_receipt:input.bundle_set_receipt,
    role:input.role,
    materialization:input.materialization,
    receipt_basis:receipt.receipt_basis,
    observed_at_utc:receipt.observed_at_utc,
    observed_repo_head:receipt.observed_repo_head,
    unit_file_state:receipt.post_install_state?.unit_file_state,
    operator_user_unit_dir_direct_enablement_links_absent:
      receipt.post_install_state?.operator_user_unit_dir_direct_enablement_links_absent,
  });
  if(canonicalJson(rebuilt)!==canonicalJson(receipt)) {
    throw new Error("install_receipt_rebuild_mismatch:"+input.role);
  }
  return Object.freeze({binding,receipt});
}

export function buildVoidEconomicEpoch2QbftHostPrestartReceiptV1(input) {
  const validated=validateVoidEconomicEpoch2QbftInstallReceiptV1(input);
  const role=String(input?.role||"");
  if(!ROLES.includes(role)) throw new Error("prestart_role_invalid");

  const observedAt=String(input?.observed_at_utc||"");
  const validUntil=String(input?.valid_until_utc||"");
  const observedMs=Date.parse(observedAt);
  const validMs=Date.parse(validUntil);
  if(
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(observedAt)||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(validUntil)||
    !Number.isFinite(observedMs)||
    !Number.isFinite(validMs)||
    validMs<=observedMs||
    validMs-observedMs>10*60*1000
  ) {
    throw new Error("prestart_freshness_window_invalid");
  }

  const head=String(input?.observed_repo_head||"");
  if(!SHA40.test(head)) throw new Error("observed_repo_head_invalid");

  const planHost=validated.binding.plan_host;
  const unitFileState=String(input?.facts?.unit_file_state||"");
  if(unitFileState!=="static") {
    throw new Error("prestart_unit_file_state_not_static:"+role);
  }
  const expectedFacts={
    repo_main_clean:true,
    final_revalidation_green:true,
    install_receipt_observed_repo_head_ancestor:true,
    current_tailnet_ipv4_exact:true,
    current_enode_exact:true,
    installed_genesis_sha256_exact:true,
    installed_genesis_evidence_bound:true,
    installed_bundle_set_bytes_exact:true,
    installed_static_nodes_sha256_exact:true,
    installed_systemd_unit_sha256_exact:true,
    installed_data_directory_empty:true,
    service_inactive:true,
    unit_file_state:unitFileState,
    operator_user_unit_dir_direct_enablement_links_absent:true,
    indirect_activation_absence_proven:false,
    plugin_sha256_exact:true,
    besu_image_identity_exact:true,
    rootless_docker_verified:true,
    p2p_port_vacant:true,
    precision_rpc_port_vacant:role==="precision"?true:null,
    nodekey_regular_private_mode:true,
    nodekey_path_canonical:true,
    nodekey_single_link:true,
    nodekey_public_key_exact:true,
    nodekey_validator_address_exact:true,
    nodekey_bytes_emitted:false,
    nodekey_bytes_persisted:false,
  };
  exactKeys(input?.facts,Object.keys(expectedFacts),"prestart_facts");
  for(const [key,value] of Object.entries(expectedFacts)) {
    if(input.facts[key]!==value) {
      throw new Error("prestart_fact_mismatch:"+role+":"+key);
    }
  }

  const material={
    marker:VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_PRESTART_V1,
    version:1,
    status:"HOST_PRESTART_GREEN_VALIDATOR_START_HOLD",
    role,
    hostname:validated.binding.manifest.hostname,
    plan_id:validated.binding.plan.plan_id,
    bundle_set_id:validated.binding.bundle_set_receipt.bundle_set_id,
    materialization_id:validated.binding.manifest.materialization_id,
    install_receipt_id:validated.receipt.install_receipt_id,
    install_receipt_basis:validated.receipt.receipt_basis,
    install_receipt_observed_repo_head:
      validated.receipt.observed_repo_head,
    install_receipt_observed_at_utc:
      validated.receipt.observed_at_utc,
    observed_repo_head:head,
    observed_at_utc:observedAt,
    valid_until_utc:validUntil,
    tailscale_ipv4:planHost.tailscale_ipv4,
    enode:planHost.enode,
    validator_address:planHost.validator_address,
    besu_public_key:planHost.besu_public_key,
    installed_hashes:validated.receipt.installed_hashes,
    facts:input.facts,
    authority:{
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
    },
    start_authorized:false,
    required_start_confirmation:"startPrivateEpoch2QbftSuccessorV1",
  };
  return Object.freeze({
    ...material,
    prestart_receipt_id:
      "voide2qpre1_"+sha256(Buffer.from(canonicalJson(material))),
  });
}

export function validateVoidEconomicEpoch2QbftHostPrestartReceiptV1(receipt) {
  if(!receipt||typeof receipt!=="object"||Array.isArray(receipt)) {
    throw new Error("prestart_receipt_invalid");
  }
  const material=structuredClone(receipt);
  const id=String(material.prestart_receipt_id||"");
  delete material.prestart_receipt_id;
  const expected="voide2qpre1_"+sha256(Buffer.from(canonicalJson(material)));
  if(id!==expected||!PRESTART_ID.test(id)) {
    throw new Error("prestart_receipt_id_mismatch");
  }
  if(
    receipt.marker!==VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_PRESTART_V1||
    receipt.version!==1||
    receipt.status!=="HOST_PRESTART_GREEN_VALIDATOR_START_HOLD"||
    !ROLES.includes(receipt.role)||
    !PLAN_ID.test(String(receipt.plan_id||""))||
    !BUNDLE_SET_ID.test(String(receipt.bundle_set_id||""))||
    !MATERIALIZATION_ID.test(String(receipt.materialization_id||""))||
    !INSTALL_ID.test(String(receipt.install_receipt_id||""))||
    ![
      "fresh_install",
      "existing_runtime_read_only_reattestation",
    ].includes(String(receipt.install_receipt_basis||""))||
    !SHA40_ID.test(String(receipt.install_receipt_observed_repo_head||""))||
    !SHA40_ID.test(String(receipt.observed_repo_head||""))||
    !ADDRESS.test(String(receipt.validator_address||""))||
    !PUBLIC_KEY.test(String(receipt.besu_public_key||""))||
    !ENODE.test(String(receipt.enode||""))||
    receipt.start_authorized!==false||
    receipt.required_start_confirmation!=="startPrivateEpoch2QbftSuccessorV1"
  ) {
    throw new Error("prestart_receipt_contract_mismatch");
  }

  const installObservedMs=
    Date.parse(String(receipt.install_receipt_observed_at_utc||""));
  const observedMs=Date.parse(String(receipt.observed_at_utc||""));
  const validMs=Date.parse(String(receipt.valid_until_utc||""));
  if(
    !Number.isFinite(installObservedMs)||
    !Number.isFinite(observedMs)||
    !Number.isFinite(validMs)||
    installObservedMs>observedMs||
    validMs<=observedMs||
    validMs-observedMs>10*60*1000
  ) {
    throw new Error("prestart_receipt_freshness_invalid");
  }

  const unitFileState=String(receipt?.facts?.unit_file_state||"");
  if(unitFileState!=="static") {
    throw new Error("prestart_receipt_unit_file_state_not_static:"+receipt.role);
  }
  const expectedFacts={
    repo_main_clean:true,
    final_revalidation_green:true,
    install_receipt_observed_repo_head_ancestor:true,
    current_tailnet_ipv4_exact:true,
    current_enode_exact:true,
    installed_genesis_sha256_exact:true,
    installed_genesis_evidence_bound:true,
    installed_bundle_set_bytes_exact:true,
    installed_static_nodes_sha256_exact:true,
    installed_systemd_unit_sha256_exact:true,
    installed_data_directory_empty:true,
    service_inactive:true,
    unit_file_state:unitFileState,
    operator_user_unit_dir_direct_enablement_links_absent:true,
    indirect_activation_absence_proven:false,
    plugin_sha256_exact:true,
    besu_image_identity_exact:true,
    rootless_docker_verified:true,
    p2p_port_vacant:true,
    precision_rpc_port_vacant:receipt.role==="precision"?true:null,
    nodekey_regular_private_mode:true,
    nodekey_path_canonical:true,
    nodekey_single_link:true,
    nodekey_public_key_exact:true,
    nodekey_validator_address_exact:true,
    nodekey_bytes_emitted:false,
    nodekey_bytes_persisted:false,
  };
  exactKeys(receipt.facts,Object.keys(expectedFacts),"prestart_receipt_facts");
  for(const [key,value] of Object.entries(expectedFacts)) {
    if(receipt.facts[key]!==value) {
      throw new Error("prestart_receipt_fact_mismatch:"+receipt.role+":"+key);
    }
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
  exactKeys(
    receipt.authority,
    Object.keys(expectedAuthority),
    "prestart_receipt_authority",
  );
  for(const [key,value] of Object.entries(expectedAuthority)) {
    if(receipt.authority[key]!==value) {
      throw new Error(
        "prestart_receipt_authority_mismatch:"+receipt.role+":"+key,
      );
    }
  }

  const expectedInstalledKeys=[
    "genesis_sha256",
    "static_nodes_sha256",
    "systemd_unit_sha256",
    "private_plan_file_sha256",
  ];
  exactKeys(
    receipt.installed_hashes,
    expectedInstalledKeys,
    "prestart_receipt_installed_hashes",
  );
  for(const key of expectedInstalledKeys) {
    if(!SHA256.test(String(receipt.installed_hashes[key]||""))) {
      throw new Error("prestart_receipt_installed_hash_invalid:"+key);
    }
  }
  return receipt;
}
