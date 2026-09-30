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
    installed_at_utc:receipt.installed_at_utc,
    installed_repo_head:receipt.installed_repo_head,
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
  const expectedFacts={
    repo_main_clean:true,
    installed_repo_head_ancestor:true,
    current_tailnet_ipv4_exact:true,
    current_enode_exact:true,
    installed_genesis_sha256_exact:true,
    installed_static_nodes_sha256_exact:true,
    installed_systemd_unit_sha256_exact:true,
    installed_data_directory_empty:true,
    service_inactive:true,
    service_disabled:true,
    autostart_links_absent:true,
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
    receipt.start_authorized!==false||
    receipt.required_start_confirmation!=="startPrivateEpoch2QbftSuccessorV1"
  ) {
    throw new Error("prestart_receipt_contract_mismatch");
  }
  return receipt;
}
