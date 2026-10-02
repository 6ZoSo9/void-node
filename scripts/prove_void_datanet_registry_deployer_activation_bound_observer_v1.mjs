#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import {getCreateAddress} from "ethers";

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
  buildVoidEconomicEpoch2QbftHostInstallReceiptV1,
} from "../tools/void-economic-epoch2-qbft-private-runtime-install-v1.mjs";
import {
  buildVoidEconomicEpoch2QbftHostPrestartReceiptV1,
} from "../tools/void-economic-epoch2-qbft-private-runtime-prestart-v1.mjs";
import {
  buildVoidEconomicEpoch2QbftPrivateRuntimeStartAdmissionV1,
} from "../tools/void-economic-epoch2-qbft-private-runtime-start-admission-v1.mjs";
import {
  EXPECTED_VALIDATORS_V1,
  buildVoidEconomicEpoch2QbftPrivateRuntimeActivationReceiptV1,
  compileVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1,
} from "../tools/void-economic-epoch2-qbft-private-runtime-activation-v1.mjs";
import {
  observeDatanetRegistryDeployerResolutionV1,
} from "../tools/datanet-content-commitment-registry-deployer-resolution-observer-v1.mjs";
import {
  PRIVATE_SUCCESSOR_RPC_V1,
  buildVoidDatanetActivationBoundDeployerObserverInputV1,
  buildVoidDatanetActivationBoundResolutionPacketV1,
  validateVoidEconomicEpoch2PrivateActivationReceiptForDatanetV1,
} from "../tools/void-datanet-registry-deployer-activation-bound-observer-v1.mjs";

function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function canonical(value){
  if(value===null||typeof value==="string"||typeof value==="boolean") return value;
  if(typeof value==="number"&&Number.isFinite(value)) return value;
  if(Array.isArray(value)) return value.map(canonical);
  return Object.fromEntries(
    Object.keys(value).sort().map((key)=>[key,canonical(value[key])]),
  );
}
function rehashActivationReceipt(value){
  const x=structuredClone(value);
  delete x.activation_receipt_id;
  return "voide2qactr1_"+sha256(Buffer.from(JSON.stringify(canonical(x))));
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

const bundles={};
for(const role of roles){
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
    genesis_evidence:{
      marker:"VOID_ECONOMIC_EPOCH2_BESU_GENESIS_BUILDER_V1",
      status:"BESU_PRODUCTION_GENESIS_CANDIDATE_BUILT_VALIDATOR_RUNTIME_HOLD",
      genesis_file_sha256:EXPECTED_GENESIS_SHA256_V1,
      gates:{
        production_qbft_extra_data_bound_into_genesis:true,
        production_validator_set_bound:false,
        migration_authorized:false,
        public_activation_authorized:false,
      },
    },
    genesis_raw:Buffer.from("fixture-genesis-not-used-by-this-proof"),
    static_nodes_raw:Buffer.from(rendered.static_nodes_json),
    systemd_unit_raw:Buffer.from(rendered.systemd_unit),
  };
}

/*
 * The activation builders require a bundle-set receipt, but this proof does not
 * need to re-prove genesis generation. Bind rows directly to the canonical
 * materialization identities and exact known genesis hash.
 */
const rows=roles.map((role)=>({
  role,
  hostname:bundles[role].materialization.hostname,
  materialization_id:bundles[role].materialization.materialization_id,
  prepared_repo_head:"d".repeat(40),
  genesis_sha256:EXPECTED_GENESIS_SHA256_V1,
  static_nodes_sha256:bundles[role].materialization.files.static_nodes.sha256,
  systemd_unit_sha256:bundles[role].materialization.rendered_unit_sha256,
  private_plan_file_sha256:planFileSha,
}));
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
const bundleSet={
  ...bundleSetMaterial,
  bundle_set_id:
    "voide2qbsv1_"+sha256(Buffer.from(JSON.stringify(canonical(bundleSetMaterial)))),
};

const installReceipts={};
for(const role of roles){
  installReceipts[role]=buildVoidEconomicEpoch2QbftHostInstallReceiptV1({
    plan,
    plan_file_sha256:planFileSha,
    bundle_set_receipt:bundleSet,
    role,
    materialization:bundles[role].materialization,
    installed_at_utc:"2030-01-01T00:02:00.000Z",
    installed_repo_head:"e".repeat(40),
    unit_file_state:"static",
    operator_user_unit_dir_direct_enablement_links_absent:true,
  });
}

const prestartReceipts={};
for(const [index,role] of roles.entries()){
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
    unit_file_state:"static",
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
  const observedMs=Date.parse("2030-01-01T00:03:00.000Z")+index*20_000;
  prestartReceipts[role]=buildVoidEconomicEpoch2QbftHostPrestartReceiptV1({
    plan,
    plan_file_sha256:planFileSha,
    bundle_set_receipt:bundleSet,
    role,
    materialization:bundles[role].materialization,
    install_receipt:installReceipts[role],
    observed_repo_head:"f".repeat(40),
    observed_at_utc:new Date(observedMs).toISOString(),
    valid_until_utc:new Date(observedMs+5*60_000).toISOString(),
    facts,
  });
}
const startAdmission=buildVoidEconomicEpoch2QbftPrivateRuntimeStartAdmissionV1({
  plan,
  plan_file_sha256:planFileSha,
  bundle_set_receipt:bundleSet,
  evaluated_at_utc:"2030-01-01T00:04:00.000Z",
  receipts:prestartReceipts,
});
const activationPlan=compileVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1({
  plan,
  plan_file_sha256:planFileSha,
  bundle_set_receipt:bundleSet,
  install_receipts:installReceipts,
  start_admission_receipt:startAdmission,
  compiled_at_utc:"2030-01-01T00:04:30.000Z",
});
const activationReceipt=buildVoidEconomicEpoch2QbftPrivateRuntimeActivationReceiptV1({
  activation_plan:activationPlan,
  activated_at_utc:"2030-01-01T00:05:00.000Z",
  observed:{
    validators:[...EXPECTED_VALIDATORS_V1],
    precision_only_block_number:"0",
    after_nimo_block_number:"1",
    after_nimo_peer_count:1,
    after_xiphos_block_number:"2",
    after_xiphos_peer_count:2,
    chain_id_hex:"0x802",
    started_roles:["precision","nimo","xiphos"],
  },
});

assert.equal(
  validateVoidEconomicEpoch2PrivateActivationReceiptForDatanetV1(
    activationPlan,
    activationReceipt,
  ).activation_receipt,
  activationReceipt,
);

const identity=JSON.parse(fs.readFileSync(
  "ops/mainnet0/datanet-content-commitment-compiled-identity-v1.json",
  "utf8",
));
const publisher=JSON.parse(fs.readFileSync(
  "ops/mainnet0/datanet-content-commitment-publisher-selection-v1.json",
  "utf8",
));
const deployer=JSON.parse(fs.readFileSync(
  "ops/mainnet0/datanet-content-commitment-registry-deployer-selection-v1.json",
  "utf8",
));

const binding=buildVoidDatanetActivationBoundDeployerObserverInputV1({
  activation_plan:activationPlan,
  activation_receipt:activationReceipt,
  deployer_address:deployer.deployer_address,
  publisher_address:publisher.publisher_address,
  predecessor_address:"0x0000000000000000000000000000000000000000",
  compiled_identity:identity,
});
assert.equal(binding.rpc_url,PRIVATE_SUCCESSOR_RPC_V1);
assert.equal(
  binding.rpc_url_fingerprint_sha256,
  sha256(PRIVATE_SUCCESSOR_RPC_V1),
);
assert.equal(binding.authority.loopback_rpc_read,true);
for(const key of [
  "filesystem_secret_read","credential_access","wallet_access","private_key_access",
  "deployer_funding","transaction_construction","transaction_signing",
  "transaction_submission","transaction_broadcast","deployment",
  "chain2050_mutation","funds_action","migration_authorized",
  "public_activation_authorized","automatic_retry",
]){
  assert.equal(binding.authority[key],false,key);
}

const pendingNonce=0n;
const predicted=getCreateAddress({
  from:deployer.deployer_address,
  nonce:pendingNonce,
}).toLowerCase();
const blockHash="0x"+"1".repeat(64);
const replies=[
  "0x802",
  "0x2",
  {number:"0x2",hash:blockHash},
  "0x0",
  "0x0",
  "0x0",
  "0x0",
  "0x",
  "0x0",
  {number:"0x2",hash:blockHash},
];
let at=0;
const observer=await observeDatanetRegistryDeployerResolutionV1({
  rpc_url:binding.rpc_url,
  deployer_address:binding.deployer_address,
  publisher_address:binding.publisher_address,
  predecessor_address:binding.predecessor_address,
  compiled_identity:identity,
  request_timeout_ms:5000,
  max_response_bytes:65536,
  transport:async()=>replies[at++],
});
assert.equal(at,replies.length);
assert.equal(observer.ok,true);
assert.equal(observer.ready_for_source_evidence_binding,true);
assert.equal(
  observer.observation.predicted_registry_contract_address,
  predicted,
);
assert.equal(observer.observation.predicted_registry_address_vacant,true);
assert.equal(observer.transaction_construction_performed,false);
assert.equal(observer.transaction_submission_performed,false);
assert.equal(observer.transaction_broadcast_performed,false);
assert.equal(observer.chain2050_mutation_performed,false);

const packet=buildVoidDatanetActivationBoundResolutionPacketV1({
  activation_plan:activationPlan,
  activation_receipt:activationReceipt,
  deployer_address:binding.deployer_address,
  publisher_address:binding.publisher_address,
  predecessor_address:binding.predecessor_address,
  compiled_identity:identity,
  observer_result:observer,
});
assert.match(packet.packet_id,/^voiddrrab1_[0-9a-f]{64}$/u);
assert.equal(
  packet.status,
  "PRIVATE_SUCCESSOR_READ_ONLY_DEPLOYER_RESOLUTION_GREEN",
);
assert.equal(
  packet.decision,
  "GREEN_READY_TO_BIND_EXACT_READ_ONLY_DEPLOYER_RESOLUTION_EVIDENCE",
);
assert.equal(packet.activation_plan_id,activationPlan.activation_plan_id);
assert.equal(
  packet.activation_receipt_id,
  activationReceipt.activation_receipt_id,
);
assert.equal(packet.activation_block_floor,"2");
assert.equal(packet.observation_block_number,"2");
assert.equal(packet.activation_height_continuity_verified,true);
assert.equal(packet.observer.rpc_methods_used.length,10);

{
  const bad=structuredClone(activationReceipt);
  bad.authority.transaction_submission=true;
  bad.activation_receipt_id=rehashActivationReceipt(bad);
  assert.throws(
    ()=>validateVoidEconomicEpoch2PrivateActivationReceiptForDatanetV1(
      activationPlan,
      bad,
    ),
    /activation_receipt_rebuild_mismatch/u,
  );
}
{
  const bad=structuredClone(observer);
  bad.observation.observation_block_number="1";
  assert.throws(
    ()=>buildVoidDatanetActivationBoundResolutionPacketV1({
      activation_plan:activationPlan,
      activation_receipt:activationReceipt,
      deployer_address:binding.deployer_address,
      publisher_address:binding.publisher_address,
      predecessor_address:binding.predecessor_address,
      compiled_identity:identity,
      observer_result:bad,
    }),
    /datanet_activation_bound_observation_head_below_activation/u,
  );
}
{
  const bad=structuredClone(observer);
  bad.observation.rpc_url_fingerprint_sha256="0".repeat(64);
  assert.throws(
    ()=>buildVoidDatanetActivationBoundResolutionPacketV1({
      activation_plan:activationPlan,
      activation_receipt:activationReceipt,
      deployer_address:binding.deployer_address,
      publisher_address:binding.publisher_address,
      predecessor_address:binding.predecessor_address,
      compiled_identity:identity,
      observer_result:bad,
    }),
    /datanet_activation_bound_observer_result_contract_mismatch/u,
  );
}

const bindingTool=fs.readFileSync(
  "tools/void-datanet-registry-deployer-activation-bound-observer-v1.mjs",
  "utf8",
);
assert.ok(bindingTool.includes('PRIVATE_SUCCESSOR_RPC_V1="http://127.0.0.1:18553/"'));

const runner=fs.readFileSync(
  "ops/precision/void-datanet-registry-deployer-resolution-activation-bound-v1.mjs",
  "utf8",
);
for(const required of [
  "rpc_url:binding.rpc_url",
  "precision_private_qbft_service_not_active",
  "activation_plan_file_sha256",
  "activation_receipt_file_sha256",
  "transaction_construction=false",
  "transaction_signing=false",
  "transaction_submission=false",
  "transaction_broadcast=false",
  "deployment=false",
  "chain2050_mutation=false",
  "funds_action=false",
]){
  assert.ok(runner.includes(required),required);
}
for(const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "personal_",
  "wallet_get",
  "wallet_send",
  "wallet_sign",
  "systemctl --user start",
  "systemctl --user restart",
  "docker run",
  "docker start",
  "ssh ",
  "sudo ",
]){
  assert.equal(runner.includes(forbidden),false,forbidden);
}

console.log("VOID_DATANET_REGISTRY_DEPLOYER_ACTIVATION_BOUND_OBSERVER_V1_PROOF_GREEN");
console.log("activation_receipt_rebuilt=true");
console.log("private_successor_rpc_bound=http://127.0.0.1:18553/");
console.log("read_only_rpc_method_count=10");
console.log("deployer_nonce_observed=true");
console.log("deployer_balance_observed=true");
console.log("predicted_create_address_derived=true");
console.log("predicted_create_address_vacancy_observed=true");
console.log("activation_height_continuity_verified=true");
console.log("filesystem_secret_read=false");
console.log("credential_access=false");
console.log("wallet_access=false");
console.log("private_key_access=false");
console.log("transaction_construction=false");
console.log("transaction_signing=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("chain2050_mutation=false");
console.log("funds_action=false");
