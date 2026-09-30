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
} from "../tools/void-economic-epoch2-qbft-private-runtime-plan-v1.mjs";
import {
  renderVoidEconomicEpoch2QbftPrivateRuntimeHostV1,
  validateGeneratedMaterializationHashesV1,
  validateVoidEconomicEpoch2QbftPrivateRuntimePlanForMaterializationV1,
} from "../tools/void-economic-epoch2-qbft-private-runtime-materialization-v1.mjs";

function canonical(value) {
  if(value===null||typeof value==="string"||typeof value==="boolean") return value;
  if(typeof value==="number"&&Number.isFinite(value)) return value;
  if(Array.isArray(value)) return value.map(canonical);
  return Object.fromEntries(
    Object.keys(value).sort().map((key)=>[key,canonical(value[key])]),
  );
}
function rehashPlan(value) {
  const plan=structuredClone(value);
  delete plan.plan_id;
  return "voide2qprp1_"+
    crypto.createHash("sha256").update(JSON.stringify(canonical(plan))).digest("hex");
}

const HEAD="a".repeat(40);
const observations=["precision","nimo","xiphos"].map((role,index)=>({
  role,
  hostname:VOID_ECONOMIC_EPOCH2_QBFT_LIVE_TOPOLOGY_EXPECTED_V1[role].hostname,
  user:"zoso",
  tailscale_ipv4:["100.64.1.1","100.64.1.2","100.64.1.3"][index],
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
assert.equal(
  validateVoidEconomicEpoch2QbftPrivateRuntimePlanForMaterializationV1(plan),
  plan,
);

for(const role of ["precision","nimo","xiphos"]) {
  const rendered=renderVoidEconomicEpoch2QbftPrivateRuntimeHostV1({
    plan,
    role,
    home:"/home/zoso",
    docker_bin:"/usr/bin/docker",
    uid:1000,
    gid:1000,
  });
  assert.equal(validateGeneratedMaterializationHashesV1(rendered),true);
  const manifest=rendered.manifest;
  assert.match(manifest.materialization_id,/^voide2qmat1_[0-9a-f]{64}$/u);
  assert.equal(manifest.status,"HOST_RUNTIME_MATERIAL_READY_INSTALL_AND_START_HOLD");
  assert.equal(manifest.plan_id,plan.plan_id);
  assert.equal(manifest.role,role);
  assert.equal(manifest.service_name,"void-economic-epoch2-qbft-validator-v1.service");
  assert.equal(manifest.files.nodekey.content_read_by_materialization,false);
  assert.deepEqual(manifest.files.nodekey.expected_mode,["400","600"]);
  assert.equal(manifest.p2p.port,30313);
  assert.equal(manifest.p2p.discovery_enabled,false);
  assert.equal(manifest.p2p.static_peer_count,2);
  assert.equal(manifest.activation.authorized,false);
  assert.equal(manifest.activation.service_start,false);
  assert.equal(manifest.activation.automatic_retry,false);
  assert.equal(manifest.activation.persistent_restart_policy_promoted,false);
  assert.equal(
    manifest.activation.rootless_container_root_maps_to_host_operator_required,
    true,
  );
  assert.equal(manifest.activation.boot_enable_supported,false);
  assert.deepEqual(manifest.docker_runtime,{
    rootless_required:true,
    host_uid:1000,
    host_gid:1000,
    container_uid:0,
    container_gid:0,
    docker_host:"unix:///run/user/1000/docker.sock",
  });
  assert.equal(manifest.authority.pure_render,true);
  for(const [key,value] of Object.entries(manifest.authority)) {
    if(key==="pure_render") assert.equal(value,true,key);
    else assert.equal(value,false,key);
  }

  const staticNodes=JSON.parse(rendered.static_nodes_json);
  assert.deepEqual(staticNodes,plan.hosts.find((x)=>x.role===role).peer_enodes);
  assert.equal(staticNodes.length,2);

  const unit=rendered.systemd_unit;
  assert.match(unit,/^Type=simple$/m);
  assert.match(unit,/^Restart=no$/m);
  assert.match(unit,/^NoNewPrivileges=true$/m);
  assert.match(unit,/^UMask=0077$/m);
  assert.equal(unit.includes("[Install]"),false);
  assert.equal(unit.includes("WantedBy=default.target"),false);
  assert.ok(unit.includes(
    "Environment=DOCKER_HOST=unix:///run/user/1000/docker.sock",
  ));
  assert.ok(unit.includes("--user 0:0"));
  assert.ok(unit.includes("--cap-drop=ALL"));
  assert.ok(unit.includes("--security-opt=no-new-privileges:true"));
  assert.ok(unit.includes("--plugins=VoidEpoch2RawTransactionDomainPlugin"));
  assert.ok(unit.includes("--static-nodes-file=/config/static-nodes.json"));
  assert.ok(unit.includes("--discovery-enabled=false"));
  assert.ok(unit.includes("--max-peers=2"));
  assert.ok(unit.includes("--sync-min-peers=1"));
  assert.ok(unit.includes("--min-gas-price=0"));
  assert.ok(unit.includes("--tx-pool-enable-balance-check=false"));
  assert.ok(unit.includes(
    "/home/zoso/.local/share/void/epoch2-qbft-validator-identity-v1/"+role+
    "/nodekey:/key/nodekey:ro",
  ));
  assert.ok(unit.includes(
    "/home/zoso/Downloads/void-epoch2-raw-transaction-domain-plugin-v1.jar:"+
    "/plugins/void-epoch2-raw-transaction-domain-plugin-v1.jar:ro",
  ));

  if(role==="precision") {
    assert.ok(unit.includes("-p 100.64.1.1:30313:30313/tcp"));
    assert.ok(unit.includes("-p 127.0.0.1:18553:8545/tcp"));
    assert.ok(unit.includes("--rpc-http-enabled=true"));
    assert.ok(unit.includes("--host-allowlist=127.0.0.1,localhost"));
  } else {
    const ip=role==="nimo"?"100.64.1.2":"100.64.1.3";
    assert.ok(unit.includes("-p "+ip+":30313:30313/tcp"));
    assert.equal(unit.includes(":18553:8545/tcp"),false);
    assert.ok(unit.includes("--rpc-http-enabled=false"));
  }

  for(const forbidden of [
    "--discovery-enabled=true",
    "--rpc-http-host=127.0.0.1",
    "--host-allowlist=*",
    "eth_sendRawTransaction",
    "eth_sendTransaction",
    "sudo ",
  ]) {
    assert.equal(unit.includes(forbidden),false,role+":"+forbidden);
  }
}

{
  const bad=structuredClone(plan);
  bad.authority.service_start=true;
  bad.plan_id=rehashPlan(bad);
  assert.throws(
    ()=>validateVoidEconomicEpoch2QbftPrivateRuntimePlanForMaterializationV1(bad),
    /plan_authority_mismatch:service_start/u,
  );
}
{
  const bad=structuredClone(plan);
  bad.hosts[1].rpc.enabled=true;
  bad.plan_id=rehashPlan(bad);
  assert.throws(
    ()=>validateVoidEconomicEpoch2QbftPrivateRuntimePlanForMaterializationV1(bad),
    /nimo_rpc_must_be_disabled/u,
  );
}
{
  const bad=structuredClone(plan);
  bad.hosts[0].besu_args=[
    ...bad.hosts[0].besu_args,
    "--host-allowlist=*",
  ];
  bad.plan_id=rehashPlan(bad);
  assert.throws(
    ()=>validateVoidEconomicEpoch2QbftPrivateRuntimePlanForMaterializationV1(bad),
    /plan_host_besu_args_mismatch:precision/u,
  );
}
{
  const bad=structuredClone(plan);
  bad.plan_id="voide2qprp1_"+"0".repeat(64);
  assert.throws(
    ()=>validateVoidEconomicEpoch2QbftPrivateRuntimePlanForMaterializationV1(bad),
    /private_runtime_plan_id_mismatch/u,
  );
}
{
  assert.throws(
    ()=>renderVoidEconomicEpoch2QbftPrivateRuntimeHostV1({
      plan,
      role:"precision",
      home:"/home/zoso",
      docker_bin:"docker",
      uid:1000,
      gid:1000,
    }),
    /docker_bin_invalid/u,
  );
}

const runner=fs.readFileSync(
  "ops/mainnet0/prepare-void-economic-epoch2-qbft-private-runtime-host-v1.mjs",
  "utf8",
);
for(const required of [
  "nodekey_content_read=false",
  "docker_mutation=false",
  "target_runtime_root_write=false",
  "service_unit_installation=false",
  "systemd_reload=false",
  "service_start=false",
  "authoritative_chain2050_write=false",
  "buildEpoch2BesuGenesisCandidate",
  "output_already_exists",
  "docker_path_untrusted",
  "rootless_docker_required",
  "rootless_docker_verified:true",
  "container_root_maps_to_host_operator_required:true",
  "container_uid=0",
  "output_parent_invalid",
  "realpathSync",
  "p2p_port_not_vacant",
  "mkdtempSync",
  "renameSync",
  "rmSync",
  "atomic_bundle_publish=true",
  "partial_bundle_retained_on_failure=false",
]) {
  assert.ok(runner.includes(required),required);
}
for(const forbidden of [
  "systemctl",
  'dockerBin,["run"',
  'dockerBin,["start"',
  'dockerBin,["stop"',
  'dockerBin,["pull"',
  "readFileSync(keyPath",
  "createPrivateKey",
  "Wallet(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
]) {
  assert.equal(runner.includes(forbidden),false,forbidden);
}

console.log("VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_MATERIALIZATION_V1_PROOF_GREEN");
console.log("pure_host_renderer=true");
console.log("static_peer_count=2");
console.log("discovery_enabled=false");
console.log("precision_loopback_rpc_only=true");
console.log("host_prepare_output_only=true");
console.log("nodekey_metadata_only=true");
console.log("nodekey_content_read=false");
console.log("target_runtime_root_write=false");
console.log("service_unit_installation=false");
console.log("systemd_reload=false");
console.log("service_start=false");
console.log("docker_mutation=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("authoritative_chain2050_write=false");
console.log("funds_movement=false");
