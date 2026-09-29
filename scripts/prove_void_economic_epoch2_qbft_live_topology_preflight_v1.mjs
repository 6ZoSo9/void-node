#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  BESU_IMAGE_V1,
  PLUGIN_SHA256_V1,
  P2P_PORT_V1,
  RPC_PORT_V1,
  buildVoidEconomicEpoch2QbftLiveTopologyPreflightV1,
} from "../tools/void-economic-epoch2-qbft-live-topology-preflight-v1.mjs";

const HEAD="a".repeat(40);
const observations=[
  {
    role:"precision",
    hostname:"zoso-Precision-Tower-7810",
    user:"zoso",
    tailscale_ipv4:"100.64.1.1",
    repo_branch:"main",
    repo_head:HEAD,
    repo_dirty_count:0,
    nodekey_present:true,
    nodekey_mode:"600",
    nodekey_content_read:false,
    plugin_present:true,
    plugin_sha256:PLUGIN_SHA256_V1,
    docker_reachable:true,
    besu_image_present:true,
    p2p_port_vacant:true,
    rpc_port_vacant:true,
  },
  {
    role:"nimo",
    hostname:"Nimo",
    user:"zoso",
    tailscale_ipv4:"100.64.1.2",
    repo_branch:"main",
    repo_head:HEAD,
    repo_dirty_count:0,
    nodekey_present:true,
    nodekey_mode:"400",
    nodekey_content_read:false,
    plugin_present:true,
    plugin_sha256:PLUGIN_SHA256_V1,
    docker_reachable:true,
    besu_image_present:true,
    p2p_port_vacant:true,
    rpc_port_vacant:true,
  },
  {
    role:"xiphos",
    hostname:"Xiphos",
    user:"zoso",
    tailscale_ipv4:"100.64.1.3",
    repo_branch:"main",
    repo_head:HEAD,
    repo_dirty_count:0,
    nodekey_present:true,
    nodekey_mode:"600",
    nodekey_content_read:false,
    plugin_present:true,
    plugin_sha256:PLUGIN_SHA256_V1,
    docker_reachable:true,
    besu_image_present:true,
    p2p_port_vacant:true,
    rpc_port_vacant:true,
  },
];

const result=buildVoidEconomicEpoch2QbftLiveTopologyPreflightV1({
  expected_head:HEAD,
  observations,
});
assert.equal(result.ready_for_private_successor_runtime_plan,true);
assert.deepEqual(result.hold_reasons,[]);
assert.equal(result.chain_id,2050);
assert.equal(result.execution_epoch,2);
assert.equal(result.consensus,"QBFT");
assert.equal(result.validator_count,3);
assert.equal(result.required_quorum,2);
assert.equal(result.p2p_port,P2P_PORT_V1);
assert.equal(result.precision_loopback_rpc_port,RPC_PORT_V1);
assert.equal(result.besu_image,BESU_IMAGE_V1);
assert.equal(result.plugin_sha256,PLUGIN_SHA256_V1);
assert.match(result.topology_preflight_id,/^voide2qltp1_[0-9a-f]{64}$/u);
for(const row of result.observations) {
  assert.match(row.tailscale_ipv4,/^100\.64\.1\.[123]$/u);
  assert.match(row.enode,/^enode:\/\/[0-9a-f]{128}@100\.64\.1\.[123]:30313$/u);
  assert.equal(row.checks.hostname_exact,true);
  assert.equal(row.checks.user_exact,true);
  assert.equal(row.checks.nodekey_present,true);
  assert.equal(row.checks.nodekey_mode_private,true);
  assert.equal(row.checks.nodekey_content_not_read,true);
  assert.equal(row.checks.plugin_sha256_exact,true);
  assert.equal(row.checks.docker_reachable,true);
  assert.equal(row.checks.besu_image_present,true);
  assert.equal(row.checks.p2p_port_vacant,true);
  assert.equal(row.checks.rpc_port_vacant,true);
  assert.equal(row.checks.repo_head_exact,true);
}
assert.equal(result.authority.observation_only,true);
for(const key of [
  "nodekey_content_read","private_key_access","service_action","docker_mutation",
  "p2p_listener_creation","rpc_listener_creation","validator_mutation",
  "transaction_construction","transaction_signing","transaction_submission",
  "transaction_broadcast","authoritative_chain2050_write","token_movement",
  "funds_movement","migration_authorized","public_activation_authorized",
]) {
  assert.equal(result.authority[key],false,key);
}

{
  const bad=structuredClone(observations);
  bad[2].tailscale_ipv4=bad[1].tailscale_ipv4;
  const held=buildVoidEconomicEpoch2QbftLiveTopologyPreflightV1({
    expected_head:HEAD,observations:bad,
  });
  assert.equal(held.ready_for_private_successor_runtime_plan,false);
  assert.ok(held.hold_reasons.includes("xiphos:tailscale_ipv4_duplicate"));
}
{
  const bad=structuredClone(observations);
  bad[1].repo_head="b".repeat(40);
  const held=buildVoidEconomicEpoch2QbftLiveTopologyPreflightV1({
    expected_head:HEAD,observations:bad,
  });
  assert.equal(held.ready_for_private_successor_runtime_plan,false);
  assert.ok(held.hold_reasons.includes("nimo:repo_head_exact"));
}
{
  const bad=structuredClone(observations);
  bad[2].plugin_present=false;
  bad[2].plugin_sha256="";
  const held=buildVoidEconomicEpoch2QbftLiveTopologyPreflightV1({
    expected_head:HEAD,observations:bad,
  });
  assert.equal(held.ready_for_private_successor_runtime_plan,false);
  assert.ok(held.hold_reasons.includes("xiphos:plugin_present"));
  assert.ok(held.hold_reasons.includes("xiphos:plugin_sha256_exact"));
}
{
  const bad=structuredClone(observations);
  bad[0].p2p_port_vacant=false;
  const held=buildVoidEconomicEpoch2QbftLiveTopologyPreflightV1({
    expected_head:HEAD,observations:bad,
  });
  assert.equal(held.ready_for_private_successor_runtime_plan,false);
  assert.ok(held.hold_reasons.includes("precision:p2p_port_vacant"));
}
{
  const bad=structuredClone(observations);
  bad[0].tailscale_ipv4="192.168.1.10";
  const held=buildVoidEconomicEpoch2QbftLiveTopologyPreflightV1({
    expected_head:HEAD,observations:bad,
  });
  assert.equal(held.ready_for_private_successor_runtime_plan,false);
  assert.ok(held.hold_reasons.includes("precision:tailscale_ipv4_invalid"));
}

const runner=fs.readFileSync(
  "ops/precision/void-precision-epoch2-qbft-live-topology-preflight-v1.mjs",
  "utf8",
);
for(const required of [
  "BatchMode=yes",
  "BatchMode=no",
  "NumberOfPasswordPrompts=1",
  "runInteractiveCapture",
  "the preflight does not read or store the credential",
  "ConnectTimeout=8",
  'VOID_NIMO_SSH_TARGET||"Nimo"',
  'VOID_XIPHOS_SSH_TARGET||"xiphos"',
  "tailscale ip -4",
  "nodekey_content_read=false",
  "private_key_bytes_emitted=false",
  "docker_mutation=false",
  "sport = :30313",
  "sport = :18553",
]) {
  assert.ok(runner.includes(required),required);
}
for(const forbidden of [
  'cat "$key"',
  'sha256sum "$key"',
  "SSH_ASKPASS",
  "sshpass",
  "password=",
  "systemctl",
  "docker pull",
  "docker run",
  "docker create",
  "docker start",
  "docker stop",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
]) {
  assert.equal(runner.includes(forbidden),false,forbidden);
}

console.log("VOID_ECONOMIC_EPOCH2_QBFT_LIVE_TOPOLOGY_PREFLIGHT_V1_PROOF_GREEN");
console.log("three_host_observation_shape=true");
console.log("tailscale_cgnat_validation=true");
console.log("nodekey_presence_mode_only=true");
console.log("nodekey_content_read=false");
console.log("plugin_sha256_required=true");
console.log("docker_mutation=false");
console.log("candidate_p2p_port=30313");
console.log("candidate_precision_rpc_port=18553");
console.log("service_action=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("authoritative_chain2050_write=false");
console.log("funds_movement=false");
