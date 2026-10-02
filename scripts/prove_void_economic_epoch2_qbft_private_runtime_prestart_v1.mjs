#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  buildVoidEconomicEpoch2QbftLiveTopologyPreflightV1,
  VOID_ECONOMIC_EPOCH2_QBFT_LIVE_TOPOLOGY_EXPECTED_V1,
  PLUGIN_SHA256_V1 as PREFLIGHT_PLUGIN_SHA,
} from "../tools/void-economic-epoch2-qbft-live-topology-preflight-v1.mjs";
import {
  compileVoidEconomicEpoch2QbftPrivateRuntimePlanV1,
  EXPECTED_GENESIS_SHA256_V1,
} from "../tools/void-economic-epoch2-qbft-private-runtime-plan-v1.mjs";
import {
  renderVoidEconomicEpoch2QbftPrivateRuntimeHostV1,
} from "../tools/void-economic-epoch2-qbft-private-runtime-materialization-v1.mjs";
import {
  buildVoidEconomicEpoch2QbftHostInstallReceiptV1,
} from "../tools/void-economic-epoch2-qbft-private-runtime-install-v1.mjs";
import {
  buildVoidEconomicEpoch2QbftHostPrestartReceiptV1,
  validateVoidEconomicEpoch2QbftHostPrestartReceiptV1,
} from "../tools/void-economic-epoch2-qbft-private-runtime-prestart-v1.mjs";
import {
  buildVoidEconomicEpoch2QbftPrivateRuntimeStartAdmissionV1,
} from "../tools/void-economic-epoch2-qbft-private-runtime-start-admission-v1.mjs";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
function canonical(value) {
  if(value===null||typeof value==="string"||typeof value==="boolean") return value;
  if(typeof value==="number"&&Number.isFinite(value)) return value;
  if(Array.isArray(value)) return value.map(canonical);
  return Object.fromEntries(
    Object.keys(value).sort().map((key)=>[key,canonical(value[key])]),
  );
}
function withBundleSetId(material) {
  return {
    ...material,
    bundle_set_id:
      "voide2qbsv1_"+sha256(Buffer.from(JSON.stringify(canonical(material)))),
  };
}

const HEAD="a".repeat(40);
const PREP_HEAD="b".repeat(40);
const INSTALL_HEAD="c".repeat(40);
const roles=["precision","nimo","xiphos"];
const ips=["100.64.1.1","100.64.1.2","100.64.1.3"];

const observations=roles.map((role,index)=>({
  role,
  hostname:VOID_ECONOMIC_EPOCH2_QBFT_LIVE_TOPOLOGY_EXPECTED_V1[role].hostname,
  user:"zoso",
  tailscale_ipv4:ips[index],
  repo_branch:"main",
  repo_head:HEAD,
  repo_dirty_count:0,
  nodekey_present:true,
  nodekey_mode:"600",
  nodekey_content_read:false,
  plugin_present:true,
  plugin_sha256:PREFLIGHT_PLUGIN_SHA,
  docker_reachable:true,
  besu_image_present:true,
  p2p_port_vacant:true,
  rpc_port_vacant:true,
}));

const topology={
  ...buildVoidEconomicEpoch2QbftLiveTopologyPreflightV1({
    expected_head:HEAD,
    observations,
  }),
  observed_at_utc:"2030-01-01T00:00:00.000Z",
  observed_by_host:"zoso-Precision-Tower-7810",
  evidence_file_write_performed:true,
  expected_plugin_sha256:PREFLIGHT_PLUGIN_SHA,
  expected_besu_image:
    "hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042",
};
const plan=compileVoidEconomicEpoch2QbftPrivateRuntimePlanV1({
  topology_receipt:topology,
  source_head:HEAD,
});
const planRaw=Buffer.from(JSON.stringify(plan,null,2)+"\n");
const planFileSha=sha256(planRaw);

const materializations={};
const rows=[];
for(const role of roles) {
  const rendered=renderVoidEconomicEpoch2QbftPrivateRuntimeHostV1({
    plan,
    role,
    home:"/home/zoso",
    docker_bin:"/usr/bin/docker",
    uid:1000,
    gid:1000,
  });
  const manifest={
    ...rendered.manifest,
    status:"HOST_RUNTIME_PREPARED_INSTALL_AND_START_HOLD",
    prepared_at_utc:"2030-01-01T00:01:00.000Z",
    prepared_on_host:
      VOID_ECONOMIC_EPOCH2_QBFT_LIVE_TOPOLOGY_EXPECTED_V1[role].hostname,
    prepared_repo_head:PREP_HEAD,
    private_plan_file_sha256:planFileSha,
    local_checks:{
      repo_main_clean:true,
      plan_source_head_ancestor:true,
      nodekey_regular_private_mode:true,
      nodekey_path_canonical:true,
      nodekey_single_link:true,
      nodekey_content_read:false,
      plugin_sha256_exact:true,
      besu_image_identity_exact:true,
      rootless_docker_verified:true,
      rootless_docker_socket_exact:true,
      rootless_docker_socket_owner_exact:true,
      container_root_maps_to_host_operator_required:true,
      p2p_port_vacant:true,
      precision_rpc_port_vacant:role==="precision"?true:null,
      genesis_sha256_exact:true,
      static_nodes_sha256_exact:true,
      rendered_unit_sha256_exact:true,
    },
    preparation_authority:{
      local_output_directory_write:true,
      target_runtime_root_write:false,
      service_unit_installation:false,
      systemd_reload:false,
      service_enable:false,
      service_start:false,
      docker_inspection:true,
      rootless_docker_required:true,
      docker_mutation:false,
      nodekey_metadata_read:true,
      nodekey_content_read:false,
      private_key_access:false,
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
  };
  materializations[role]=manifest;
  rows.push({
    role,
    hostname:manifest.hostname,
    materialization_id:manifest.materialization_id,
    prepared_repo_head:PREP_HEAD,
    genesis_sha256:EXPECTED_GENESIS_SHA256_V1,
    static_nodes_sha256:manifest.files.static_nodes.sha256,
    systemd_unit_sha256:manifest.rendered_unit_sha256,
    private_plan_file_sha256:planFileSha,
  });
}

const bundleSetMaterial={
  marker:"VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_BUNDLE_SET_V1",
  version:1,
  status:"THREE_HOST_PREPARED_BUNDLE_SET_GREEN_INSTALL_AND_START_HOLD",
  plan_id:plan.plan_id,
  source_head:plan.source_head,
  validator_count:3,
  required_quorum:2,
  common_genesis_sha256:EXPECTED_GENESIS_SHA256_V1,
  common_private_plan_file_sha256:planFileSha,
  roles:rows,
  verification:{
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
  },
  next_gate:
    "separate_explicit_operator_authorization_for_installation_of_reviewed_host_bundles",
};
const bundleSet=withBundleSetId(bundleSetMaterial);

const installReceipts={};
const prestartReceipts={};
for(const [index,role] of roles.entries()) {
  installReceipts[role]=buildVoidEconomicEpoch2QbftHostInstallReceiptV1({
    plan,
    plan_file_sha256:planFileSha,
    bundle_set_receipt:bundleSet,
    role,
    materialization:materializations[role],
    installed_at_utc:"2030-01-01T00:02:00.000Z",
    installed_repo_head:INSTALL_HEAD,
  });

  const facts={
    repo_main_clean:true,
    final_revalidation_green:true,
    installed_repo_head_ancestor:true,
    current_tailnet_ipv4_exact:true,
    current_enode_exact:true,
    installed_genesis_sha256_exact:true,
    installed_genesis_evidence_bound:true,
    installed_bundle_set_bytes_exact:true,
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
  const observedMs=Date.parse("2030-01-01T00:03:00.000Z")+index*20_000;
  prestartReceipts[role]=buildVoidEconomicEpoch2QbftHostPrestartReceiptV1({
    plan,
    plan_file_sha256:planFileSha,
    bundle_set_receipt:bundleSet,
    role,
    materialization:materializations[role],
    install_receipt:installReceipts[role],
    observed_repo_head:INSTALL_HEAD,
    observed_at_utc:new Date(observedMs).toISOString(),
    valid_until_utc:new Date(observedMs+5*60_000).toISOString(),
    facts,
  });
  assert.equal(
    validateVoidEconomicEpoch2QbftHostPrestartReceiptV1(prestartReceipts[role]),
    prestartReceipts[role],
  );
  assert.equal(prestartReceipts[role].start_authorized,false);
  assert.equal(
    prestartReceipts[role].authority.nodekey_content_read_for_identity_revalidation,
    true,
  );
  assert.equal(prestartReceipts[role].authority.nodekey_bytes_emitted,false);
  assert.equal(prestartReceipts[role].authority.nodekey_bytes_persisted,false);
}

const admission=buildVoidEconomicEpoch2QbftPrivateRuntimeStartAdmissionV1({
  plan,
  plan_file_sha256:planFileSha,
  bundle_set_receipt:bundleSet,
  evaluated_at_utc:"2030-01-01T00:04:00.000Z",
  receipts:prestartReceipts,
});
assert.equal(
  admission.status,
  "THREE_HOST_PRESTART_GREEN_VALIDATOR_START_CONFIRMATION_REQUIRED",
);
assert.match(admission.start_admission_id,/^voide2qsad1_[0-9a-f]{64}$/u);
assert.equal(admission.plan_id,plan.plan_id);
assert.equal(admission.bundle_set_id,bundleSet.bundle_set_id);
assert.equal(admission.observed_repo_head,INSTALL_HEAD);
assert.equal(admission.validator_count,3);
assert.equal(admission.required_quorum,2);
assert.equal(admission.receipts.length,3);
assert.equal(admission.verification.exactly_three_roles,true);
assert.equal(admission.verification.unique_install_receipts,true);
assert.equal(admission.verification.common_repo_head,true);
assert.equal(
  admission.verification.all_receipts_fresh_at_common_evaluation_time,
  true,
);
assert.equal(
  admission.verification.all_validator_private_keys_revalidated_locally,
  true,
);
assert.equal(admission.verification.nodekey_bytes_emitted,false);
assert.equal(admission.verification.nodekey_bytes_persisted,false);
assert.equal(admission.verification.service_start,false);
assert.equal(admission.verification.authoritative_chain2050_write,false);
assert.equal(admission.verification.transaction_submission,false);
assert.equal(admission.verification.funds_movement,false);
assert.equal(admission.start_authorized,false);
assert.equal(admission.automatic_retry,false);
assert.equal(
  admission.required_start_confirmation,
  "startPrivateEpoch2QbftSuccessorV1",
);

{
  const bad=structuredClone(prestartReceipts);
  assert.throws(
    ()=>buildVoidEconomicEpoch2QbftPrivateRuntimeStartAdmissionV1({
      plan,
      plan_file_sha256:planFileSha,
      bundle_set_receipt:bundleSet,
      evaluated_at_utc:"2030-01-01T00:20:00.000Z",
      receipts:bad,
    }),
    /start_admission_receipt_not_fresh:precision/u,
  );
}
{
  const bad=structuredClone(prestartReceipts);
  bad.precision.validator_address="0x"+"1".repeat(40);
  const material=structuredClone(bad.precision);
  delete material.prestart_receipt_id;
  bad.precision.prestart_receipt_id=
    "voide2qpre1_"+sha256(Buffer.from(JSON.stringify(canonical(material))));
  assert.throws(
    ()=>buildVoidEconomicEpoch2QbftPrivateRuntimeStartAdmissionV1({
      plan,
      plan_file_sha256:planFileSha,
      bundle_set_receipt:bundleSet,
      evaluated_at_utc:"2030-01-01T00:04:00.000Z",
      receipts:bad,
    }),
    /start_admission_identity_or_hash_binding_mismatch:precision/u,
  );
}
{
  const bad=structuredClone(prestartReceipts);
  bad.xiphos.facts.nodekey_validator_address_exact=false;
  const material=structuredClone(bad.xiphos);
  delete material.prestart_receipt_id;
  bad.xiphos.prestart_receipt_id=
    "voide2qpre1_"+sha256(Buffer.from(JSON.stringify(canonical(material))));
  assert.throws(
    ()=>buildVoidEconomicEpoch2QbftPrivateRuntimeStartAdmissionV1({
      plan,
      plan_file_sha256:planFileSha,
      bundle_set_receipt:bundleSet,
      evaluated_at_utc:"2030-01-01T00:04:00.000Z",
      receipts:bad,
    }),
    /prestart_receipt_fact_mismatch:xiphos:nodekey_validator_address_exact/u,
  );
}
{
  const bad=structuredClone(prestartReceipts);
  bad.nimo.authority.service_start=true;
  const material=structuredClone(bad.nimo);
  delete material.prestart_receipt_id;
  bad.nimo.prestart_receipt_id=
    "voide2qpre1_"+sha256(Buffer.from(JSON.stringify(canonical(material))));
  assert.throws(
    ()=>buildVoidEconomicEpoch2QbftPrivateRuntimeStartAdmissionV1({
      plan,
      plan_file_sha256:planFileSha,
      bundle_set_receipt:bundleSet,
      evaluated_at_utc:"2030-01-01T00:04:00.000Z",
      receipts:bad,
    }),
    /prestart_receipt_authority_mismatch:nimo:service_start/u,
  );
}
{
  const bad=structuredClone(prestartReceipts);
  const x=Date.parse("2030-01-01T00:08:00.000Z");
  bad.xiphos.observed_at_utc=new Date(x).toISOString();
  bad.xiphos.valid_until_utc=new Date(x+5*60_000).toISOString();
  const material=structuredClone(bad.xiphos);
  delete material.prestart_receipt_id;
  bad.xiphos.prestart_receipt_id=
    "voide2qpre1_"+sha256(Buffer.from(JSON.stringify(canonical(material))));
  assert.throws(
    ()=>buildVoidEconomicEpoch2QbftPrivateRuntimeStartAdmissionV1({
      plan,
      plan_file_sha256:planFileSha,
      bundle_set_receipt:bundleSet,
      evaluated_at_utc:"2030-01-01T00:08:30.000Z",
      receipts:bad,
    }),
    /start_admission_receipt_not_fresh:precision|start_admission_observation_skew_exceeded/u,
  );
}
{
  const badFacts={
    ...prestartReceipts.precision.facts,
    nodekey_public_key_exact:false,
  };
  assert.throws(
    ()=>buildVoidEconomicEpoch2QbftHostPrestartReceiptV1({
      plan,
      plan_file_sha256:planFileSha,
      bundle_set_receipt:bundleSet,
      role:"precision",
      materialization:materializations.precision,
      install_receipt:installReceipts.precision,
      observed_repo_head:INSTALL_HEAD,
      observed_at_utc:"2030-01-01T00:03:00.000Z",
      valid_until_utc:"2030-01-01T00:08:00.000Z",
      facts:badFacts,
    }),
    /prestart_fact_mismatch:precision:nodekey_public_key_exact/u,
  );
}

const hostRunner=fs.readFileSync(
  "ops/mainnet0/observe-void-economic-epoch2-qbft-private-runtime-prestart-host-v1.mjs",
  "utf8",
);
for(const required of [
  'import {SigningKey,computeAddress} from "ethers"',
  "nodekey_public_key_mismatch",
  "nodekey_validator_address_mismatch",
  "nodekey_bytes_emitted=false",
  "nodekey_bytes_persisted=false",
  "tailscale_ipv4_drift",
  "repo_head_changed_during_observation",
  "repo_became_dirty_during_observation",
  "tailscale_ipv4_changed_during_observation",
  "p2p_port_changed_during_observation",
  "installed_data_changed_during_observation",
  "installed_genesis_evidence_mismatch",
  "installed_bundle_set_bytes_mismatch",
  "installed_data_not_empty",
  "service_state_not_clean_inactive",
  "service_enable_state_not_clean",
  '["disabled","not-found","static"]',
  "requireNoInstallSection",
  "installed_unit_install_section_forbidden",
  "service_dependency_dir_symlink_forbidden",
  "service_dependency_dir_not_directory",
  "service_unit_file_state=",
  "rootless_docker_required",
  "p2p_port_not_vacant",
  "start_authorized=false",
]) {
  assert.ok(hostRunner.includes(required),required);
}
for(const forbidden of [
  '"daemon-reload"',
  '["start"',
  '["enable"',
  "docker run",
  "docker start",
  "docker pull",
  "console.log(raw",
  "console.log(rawText",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "sudo ",
]) {
  assert.equal(hostRunner.includes(forbidden),false,forbidden);
}

const admissionRunner=fs.readFileSync(
  "ops/precision/void-precision-epoch2-qbft-private-runtime-start-admission-v1.mjs",
  "utf8",
);
for(const required of [
  "PLAN_JSON BUNDLE_SET_JSON",
  "plan_file_sha256:planFileSha256",
  "bundle_set_receipt:bundleSet",
]) {
  assert.ok(admissionRunner.includes(required),required);
}
for(const forbidden of [
  "ssh ",
  "systemctl",
  "docker ",
  "tailscale ",
  "SigningKey",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
]) {
  assert.equal(admissionRunner.includes(forbidden),false,forbidden);
}

console.log("VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_PRESTART_V1_PROOF_GREEN");
console.log("three_host_common_freshness=true");
console.log("maximum_observation_skew_seconds=120");
console.log("validator_private_identity_revalidation_required=true");
console.log("nodekey_bytes_emitted=false");
console.log("nodekey_bytes_persisted=false");
console.log("all_services_inactive=true");
console.log("static_unit_state_requires_exact_no_install_unit=true");
console.log("dependency_directory_symlink_rejected=true");
console.log("all_services_activation_inert=true");
console.log("service_start=false");
console.log("systemd_reload=false");
console.log("docker_mutation=false");
console.log("transaction_signing=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("authoritative_chain2050_write=false");
console.log("funds_movement=false");
console.log("start_authorized=false");
