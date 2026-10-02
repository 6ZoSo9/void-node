#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  buildVoidEconomicEpoch2BesuGenesisV1,
} from "../tools/void-economic-epoch2-besu-genesis-builder-v1.mjs";
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
  verifyVoidEconomicEpoch2QbftPrivateRuntimeBundleSetV1,
} from "../tools/void-economic-epoch2-qbft-private-runtime-bundle-set-v1.mjs";
import {
  VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_INSTALL_CONFIRMATION_V1,
  VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_INSTALL_V1,
  buildVoidEconomicEpoch2QbftHostInstallReceiptV1,
  validateVoidEconomicEpoch2QbftHostInstallBindingV1,
  validateVoidEconomicEpoch2QbftPrivateRuntimeBundleSetReceiptV1,
} from "../tools/void-economic-epoch2-qbft-private-runtime-install-v1.mjs";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

const HEAD="a".repeat(40);
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
  source_head:"b".repeat(40),
});
const planRaw=Buffer.from(JSON.stringify(plan,null,2)+"\n");
const planFileSha=sha256(planRaw);

const state=JSON.parse(fs.readFileSync(
  "public/public-node/evidence/economic-epoch2-client-neutral-state-manifest-v1.json",
  "utf8",
));
const candidate=JSON.parse(fs.readFileSync(
  "ops/mainnet0/economic-epoch2-production-client-candidate-v1.json",
  "utf8",
));
const nonce=JSON.parse(fs.readFileSync(
  "ops/mainnet0/economic-epoch2-account-nonce-continuity-candidate-v1.json",
  "utf8",
));
const qbft=JSON.parse(fs.readFileSync(
  "ops/mainnet0/economic-epoch2-qbft-production-extra-data-v1.json",
  "utf8",
));
const built=buildVoidEconomicEpoch2BesuGenesisV1({
  stateManifest:state,
  clientCandidate:candidate,
  nonceContinuity:nonce,
  productionQbftExtraDataEvidence:qbft,
});
const genesisRaw=Buffer.from(JSON.stringify(built.genesis,null,2)+"\n");
assert.equal(sha256(genesisRaw),EXPECTED_GENESIS_SHA256_V1);
const genesisEvidence={
  ...built.evidence,
  genesis_file_sha256:EXPECTED_GENESIS_SHA256_V1,
};

const bundles={};
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
    prepared_repo_head:"d".repeat(40),
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
  bundles[role]={
    materialization:manifest,
    genesis_evidence:genesisEvidence,
    genesis_raw:genesisRaw,
    static_nodes_raw:Buffer.from(rendered.static_nodes_json),
    systemd_unit_raw:Buffer.from(rendered.systemd_unit),
  };
}

const bundleSet=verifyVoidEconomicEpoch2QbftPrivateRuntimeBundleSetV1({
  plan,
  plan_file_sha256:planFileSha,
  bundles,
});

const validated=
  validateVoidEconomicEpoch2QbftPrivateRuntimeBundleSetReceiptV1(
    bundleSet,
    plan,
    planFileSha,
  );
assert.equal(validated.plan.plan_id,plan.plan_id);
assert.equal(validated.receipt.bundle_set_id,bundleSet.bundle_set_id);
assert.equal(validated.plan_file_sha256,planFileSha);

for(const role of roles) {
  const binding=validateVoidEconomicEpoch2QbftHostInstallBindingV1({
    plan,
    plan_file_sha256:planFileSha,
    bundle_set_receipt:bundleSet,
    role,
    materialization:bundles[role].materialization,
  });
  assert.equal(binding.role,role);
  assert.equal(binding.row.materialization_id,bundles[role].materialization.materialization_id);

  const receipt=buildVoidEconomicEpoch2QbftHostInstallReceiptV1({
    plan,
    plan_file_sha256:planFileSha,
    bundle_set_receipt:bundleSet,
    role,
    materialization:bundles[role].materialization,
    installed_at_utc:"2030-01-01T00:02:00.000Z",
    installed_repo_head:"e".repeat(40),
  });
  assert.equal(receipt.marker,VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_INSTALL_V1);
  assert.equal(receipt.status,"HOST_BUNDLE_INSTALLED_DAEMON_RELOAD_AND_START_HOLD");
  assert.match(receipt.install_receipt_id,/^voide2qinst1_[0-9a-f]{64}$/u);
  assert.equal(receipt.plan_id,plan.plan_id);
  assert.equal(receipt.bundle_set_id,bundleSet.bundle_set_id);
  assert.equal(receipt.materialization_id,binding.row.materialization_id);
  assert.equal(receipt.post_install_state.unit_enabled,false);
  assert.equal(receipt.post_install_state.unit_active,false);
  assert.equal(receipt.post_install_state.daemon_reload_performed,false);
  assert.equal(receipt.post_install_state.service_start_performed,false);
  assert.equal(receipt.post_install_state.docker_mutation,false);
  assert.equal(receipt.post_install_state.nodekey_content_read,false);
  assert.equal(receipt.authority.runtime_root_write,true);
  assert.equal(receipt.authority.service_unit_installation,true);
  for(const key of [
    "systemd_reload","service_enable","service_start","docker_mutation",
    "private_key_access","credential_content_access","transaction_construction",
    "transaction_signing","transaction_submission","transaction_broadcast",
    "authoritative_chain2050_write","validator_mutation","token_movement",
    "funds_movement","migration_authorized","public_activation_authorized",
  ]) {
    assert.equal(receipt.authority[key],false,key);
  }
}

{
  const bad=structuredClone(bundleSet);
  bad.bundle_set_id="voide2qbsv1_"+"0".repeat(64);
  assert.throws(
    ()=>validateVoidEconomicEpoch2QbftPrivateRuntimeBundleSetReceiptV1(
      bad,plan,planFileSha,
    ),
    /bundle_set_id_mismatch/u,
  );
}
{
  const bad=structuredClone(bundleSet);
  bad.verification.service_start=true;
  const material=structuredClone(bad);
  delete material.bundle_set_id;
  function canonical(value) {
    if(value===null||typeof value==="string"||typeof value==="boolean") return value;
    if(typeof value==="number") return value;
    if(Array.isArray(value)) return value.map(canonical);
    return Object.fromEntries(
      Object.keys(value).sort().map((key)=>[key,canonical(value[key])]),
    );
  }
  bad.bundle_set_id="voide2qbsv1_"+
    sha256(Buffer.from(JSON.stringify(canonical(material))));
  assert.throws(
    ()=>validateVoidEconomicEpoch2QbftPrivateRuntimeBundleSetReceiptV1(
      bad,plan,planFileSha,
    ),
    /bundle_set_verification_mismatch:service_start/u,
  );
}
{
  const bad=structuredClone(bundles.precision.materialization);
  bad.materialization_id=bundles.nimo.materialization.materialization_id;
  assert.throws(
    ()=>validateVoidEconomicEpoch2QbftHostInstallBindingV1({
      plan,
      plan_file_sha256:planFileSha,
      bundle_set_receipt:bundleSet,
      role:"precision",
      materialization:bad,
    }),
    /install_materialization_rebuild_mismatch:precision/u,
  );
}

assert.equal(
  VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_INSTALL_CONFIRMATION_V1,
  "installPrivateEpoch2QbftBundleV1",
);

const runner=fs.readFileSync(
  "ops/mainnet0/install-void-economic-epoch2-qbft-private-runtime-host-v1.mjs",
  "utf8",
);
for(const required of [
  "explicit_confirmation_required",
  "requireInactiveDisabled",
  "service_state_not_clean_inactive",
  "service_enable_state_not_clean",
  '["inactive","unknown"]',
  '["disabled","not-found","static"]',
  "requireNoEnableLinks",
  "service_autostart_link_present",
  "runtime_root_already_exists",
  "void_state_base_invalid",
  "runtime_parent_scope_invalid",
  "unit_path_already_exists",
  "fs.renameSync(runtimeStage,runtimeRoot)",
  "fs.renameSync(unitStage,unitPath)",
  "daemon_reload=false",
  "service_enable=false",
  "service_start=false",
  "docker_mutation=false",
  "nodekey_content_read=false",
  "authoritative_chain2050_write=false",
  "funds_movement=false",
]) {
  assert.ok(runner.includes(required),required);
}
for(const forbidden of [
  '"daemon-reload"',
  '["start"',
  '["enable"',
  "docker run",
  "docker start",
  "docker pull",
  "readFileSync(key",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "sudo ",
]) {
  assert.equal(runner.includes(forbidden),false,forbidden);
}

console.log("VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_INSTALL_V1_PROOF_GREEN");
console.log("bundle_set_id_recomputed=true");
console.log("exact_role_materialization_binding=true");
console.log("inactive_precondition_required=true");
console.log("autostart_link_absence_required=true");
console.log("atomic_runtime_and_unit_publish_with_rollback=true");
console.log("daemon_reload=false");
console.log("service_enable=false");
console.log("service_start=false");
console.log("docker_mutation=false");
console.log("nodekey_content_read=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("authoritative_chain2050_write=false");
console.log("funds_movement=false");
