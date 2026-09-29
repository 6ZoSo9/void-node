#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  buildVoidEconomicEpoch2QbftLiveTopologyPreflightV1,
  VOID_ECONOMIC_EPOCH2_QBFT_LIVE_TOPOLOGY_EXPECTED_V1,
  BESU_IMAGE_V1 as PREFLIGHT_BESU_IMAGE,
  PLUGIN_SHA256_V1 as PREFLIGHT_PLUGIN_SHA,
} from "../tools/void-economic-epoch2-qbft-live-topology-preflight-v1.mjs";
import {
  BESU_IMAGE_V1,
  EXPECTED_GENESIS_SHA256_V1,
  PLUGIN_SHA256_V1,
  compileVoidEconomicEpoch2QbftPrivateRuntimePlanV1,
} from "../tools/void-economic-epoch2-qbft-private-runtime-plan-v1.mjs";

const topologyHead="a".repeat(40);
const sourceHead="b".repeat(40);
const roles=["precision","nimo","xiphos"];
const ips=["100.64.1.1","100.64.1.2","100.64.1.3"];

const observations=roles.map((role,index)=>({
  role,
  hostname:VOID_ECONOMIC_EPOCH2_QBFT_LIVE_TOPOLOGY_EXPECTED_V1[role].hostname,
  user:"zoso",
  tailscale_ipv4:ips[index],
  repo_branch:"main",
  repo_head:topologyHead,
  repo_dirty_count:0,
  nodekey_present:true,
  nodekey_mode:index===1?"400":"600",
  nodekey_content_read:false,
  plugin_present:true,
  plugin_sha256:PREFLIGHT_PLUGIN_SHA,
  docker_reachable:true,
  besu_image_present:true,
  p2p_port_vacant:true,
  rpc_port_vacant:true,
}));

const receipt={
  ...buildVoidEconomicEpoch2QbftLiveTopologyPreflightV1({
    expected_head:topologyHead,
    observations,
  }),
  observed_at_utc:"2030-01-01T00:00:00.000Z",
  observed_by_host:"zoso-Precision-Tower-7810",
  evidence_file_write_performed:true,
  expected_plugin_sha256:PREFLIGHT_PLUGIN_SHA,
  expected_besu_image:PREFLIGHT_BESU_IMAGE,
};

const plan=compileVoidEconomicEpoch2QbftPrivateRuntimePlanV1({
  topology_receipt:receipt,
  source_head:sourceHead,
});
assert.equal(plan.status,"PRIVATE_QBFT_RUNTIME_PLAN_READY_ACTIVATION_HOLD");
assert.match(plan.plan_id,/^voide2qprp1_[0-9a-f]{64}$/u);
assert.equal(plan.source_head,sourceHead);
assert.equal(plan.topology.topology_preflight_id,receipt.topology_preflight_id);
assert.equal(plan.topology.expected_head,topologyHead);
assert.equal(plan.topology.tailscale_addresses_source_committed,false);
assert.equal(plan.topology.private_plan_contains_live_tailnet_addresses,true);
assert.equal(plan.chain.chain_id,2050);
assert.equal(plan.chain.execution_epoch,2);
assert.equal(plan.chain.consensus,"QBFT");
assert.equal(plan.chain.validator_count,3);
assert.equal(plan.chain.required_quorum,2);
assert.equal(plan.chain.byzantine_fault_tolerance,0);
assert.equal(
  plan.chain.genesis.expected_genesis_sha256,
  EXPECTED_GENESIS_SHA256_V1,
);
assert.equal(plan.runtime.besu_image,BESU_IMAGE_V1);
assert.equal(plan.runtime.plugin_sha256,PLUGIN_SHA256_V1);
assert.equal(plan.runtime.static_nodes_mode,"explicit_static_nodes_file");
assert.equal(plan.runtime.discovery_enabled,false);
assert.equal(plan.runtime.raw_public_rpc_allowed,false);
assert.equal(plan.runtime.public_activation,false);
assert.equal(plan.hosts.length,3);

for(const [index,host] of plan.hosts.entries()) {
  assert.equal(host.role,roles[index]);
  assert.equal(host.tailscale_ipv4,ips[index]);
  assert.equal(host.peer_enodes.length,2);
  assert.equal(host.peer_enodes.includes(host.enode),false);
  assert.equal(host.p2p.host_publish,ips[index]+":30313:30313/tcp");
  assert.equal(host.p2p.advertised_host,ips[index]);
  assert.equal(host.p2p.discovery_enabled,false);
  assert.equal(host.p2p.max_peers,2);
  assert.equal(host.p2p.sync_min_peers,1);
  assert.ok(host.besu_args.includes("--discovery-enabled=false"));
  assert.ok(host.besu_args.includes("--static-nodes-file=/config/static-nodes.json"));
  assert.ok(host.besu_args.includes("--p2p-host="+ips[index]));
  assert.ok(host.besu_args.includes("--p2p-port=30313"));
  assert.ok(host.besu_args.includes("--max-peers=2"));
  assert.ok(host.besu_args.includes("--min-gas-price=0"));
  assert.ok(host.besu_args.includes("--tx-pool-enable-balance-check=false"));
}

assert.equal(plan.hosts[0].rpc.enabled,true);
assert.equal(plan.hosts[0].rpc.loopback_url,"http://127.0.0.1:18553/");
assert.equal(plan.hosts[0].rpc.host_publish,"127.0.0.1:18553:8545/tcp");
assert.deepEqual(plan.hosts[0].rpc.apis,["ETH","NET","WEB3","QBFT"]);
assert.ok(plan.hosts[0].besu_args.includes("--rpc-http-enabled=true"));
assert.ok(
  plan.hosts[0].besu_args.includes("--host-allowlist=127.0.0.1,localhost"),
);
for(const host of plan.hosts.slice(1)) {
  assert.equal(host.rpc.enabled,false);
  assert.equal(host.rpc.host_publish,null);
  assert.equal(host.rpc.loopback_url,null);
  assert.deepEqual(host.rpc.apis,[]);
  assert.ok(host.besu_args.includes("--rpc-http-enabled=false"));
}

assert.equal(plan.activation.authorized,false);
assert.equal(plan.activation.automatic_retry,false);
assert.equal(
  plan.activation.requires_two_of_three_quorum_before_any_transaction_submission,
  true,
);
for(const [key,value] of Object.entries(plan.authority)) {
  if(key==="source_plan_only") assert.equal(value,true,key);
  else assert.equal(value,false,key);
}

const repeat=compileVoidEconomicEpoch2QbftPrivateRuntimePlanV1({
  topology_receipt:structuredClone(receipt),
  source_head:sourceHead,
});
assert.equal(repeat.plan_id,plan.plan_id);

{
  const bad=structuredClone(receipt);
  bad.ready_for_private_successor_runtime_plan=false;
  assert.throws(
    ()=>compileVoidEconomicEpoch2QbftPrivateRuntimePlanV1({
      topology_receipt:bad,source_head:sourceHead,
    }),
    /topology_receipt_contract_mismatch/u,
  );
}
{
  const bad=structuredClone(receipt);
  bad.observations[1].checks.repo_clean=false;
  assert.throws(
    ()=>compileVoidEconomicEpoch2QbftPrivateRuntimePlanV1({
      topology_receipt:bad,source_head:sourceHead,
    }),
    /topology_check_not_green:nimo:repo_clean/u,
  );
}
{
  const bad=structuredClone(receipt);
  bad.observations[2].enode=bad.observations[1].enode;
  assert.throws(
    ()=>compileVoidEconomicEpoch2QbftPrivateRuntimePlanV1({
      topology_receipt:bad,source_head:sourceHead,
    }),
    /topology_enode_invalid:xiphos/u,
  );
}

const runner=fs.readFileSync(
  "ops/precision/void-precision-epoch2-qbft-private-runtime-plan-v1.mjs",
  "utf8",
);
for(const required of [
  "topology_observation_stale",
  "merge-base",
  "--is-ancestor",
  "clean_worktree_required",
  "mode:0o600",
  "service_installation=false",
  "service_start=false",
  "private_key_access=false",
  "authoritative_chain2050_write=false",
]) {
  assert.ok(runner.includes(required),required);
}
for(const forbidden of [
  "systemctl",
  "docker run",
  "docker start",
  "docker stop",
  "ssh ",
  "tailscale ",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "readFileSync(key",
]) {
  assert.equal(runner.includes(forbidden),false,forbidden);
}

console.log("VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_PLAN_V1_PROOF_GREEN");
console.log("topology_receipt_required=true");
console.log("topology_freshness_max_seconds=3600");
console.log("tailscale_addresses_source_committed=false");
console.log("private_plan_contains_live_tailnet_addresses=true");
console.log("besu_static_nodes_file=true");
console.log("discovery_enabled=false");
console.log("precision_loopback_rpc_only=true");
console.log("nimo_rpc_enabled=false");
console.log("xiphos_rpc_enabled=false");
console.log("service_installation=false");
console.log("service_start=false");
console.log("private_key_access=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("authoritative_chain2050_write=false");
console.log("funds_movement=false");
