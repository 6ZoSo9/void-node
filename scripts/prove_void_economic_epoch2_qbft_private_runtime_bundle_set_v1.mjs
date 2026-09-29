#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

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
  readVoidEconomicEpoch2PreparedBundleV1,
  verifyVoidEconomicEpoch2QbftPrivateRuntimeBundleSetV1,
} from "../tools/void-economic-epoch2-qbft-private-runtime-bundle-set-v1.mjs";

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

const commonPlanFileSha="c".repeat(64);
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
    private_plan_file_sha256:commonPlanFileSha,
    local_checks:{
      repo_main_clean:true,
      plan_source_head_ancestor:true,
      nodekey_regular_private_mode:true,
      nodekey_content_read:false,
      plugin_sha256_exact:true,
      besu_image_identity_exact:true,
      rootless_docker_verified:true,
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

const result=verifyVoidEconomicEpoch2QbftPrivateRuntimeBundleSetV1({
  plan,
  bundles,
});
assert.equal(
  result.status,
  "THREE_HOST_PREPARED_BUNDLE_SET_GREEN_INSTALL_AND_START_HOLD",
);
assert.match(result.bundle_set_id,/^voide2qbsv1_[0-9a-f]{64}$/u);
assert.equal(result.plan_id,plan.plan_id);
assert.equal(result.validator_count,3);
assert.equal(result.required_quorum,2);
assert.equal(result.common_genesis_sha256,EXPECTED_GENESIS_SHA256_V1);
assert.equal(result.common_private_plan_file_sha256,commonPlanFileSha);
assert.deepEqual(result.roles.map((x)=>x.role),roles);
assert.equal(result.verification.exactly_three_roles,true);
assert.equal(result.verification.unique_materialization_ids,true);
assert.equal(result.verification.common_genesis_exact,true);
assert.equal(result.verification.common_private_plan_bytes_exact,true);
assert.equal(result.verification.role_static_peers_exact,true);
assert.equal(result.verification.role_systemd_unit_hashes_exact,true);
assert.equal(result.verification.all_local_prepare_checks_green,true);
assert.equal(result.verification.service_installation,false);
assert.equal(result.verification.service_start,false);
assert.equal(result.verification.authoritative_chain2050_write,false);
assert.equal(result.verification.funds_movement,false);

{
  const bad={
    ...bundles,
    nimo:{
      ...bundles.nimo,
      materialization:{
        ...bundles.nimo.materialization,
        private_plan_file_sha256:"e".repeat(64),
      },
    },
  };
  assert.throws(
    ()=>verifyVoidEconomicEpoch2QbftPrivateRuntimeBundleSetV1({plan,bundles:bad}),
    /bundle_private_plan_bytes_not_common/u,
  );
}
{
  const bad={...bundles,nimo:{...bundles.nimo}};
  bad.nimo.genesis_raw=Buffer.from(genesisRaw);
  bad.nimo.genesis_raw[bad.nimo.genesis_raw.length-2]^=1;
  assert.throws(
    ()=>verifyVoidEconomicEpoch2QbftPrivateRuntimeBundleSetV1({plan,bundles:bad}),
    /bundle_genesis_sha_mismatch:nimo/u,
  );
}
{
  const bad={
    ...bundles,
    xiphos:{
      ...bundles.xiphos,
      materialization:{
        ...bundles.xiphos.materialization,
        materialization_id:bundles.nimo.materialization.materialization_id,
      },
    },
  };
  assert.throws(
    ()=>verifyVoidEconomicEpoch2QbftPrivateRuntimeBundleSetV1({plan,bundles:bad}),
    /bundle_materialization_id_duplicate/u,
  );
}
{
  const bad={...bundles,precision:{...bundles.precision}};
  bad.precision.systemd_unit_raw=Buffer.concat([
    bundles.precision.systemd_unit_raw,
    Buffer.from("# tamper\n"),
  ]);
  assert.throws(
    ()=>verifyVoidEconomicEpoch2QbftPrivateRuntimeBundleSetV1({plan,bundles:bad}),
    /bundle_unit_sha_mismatch:precision/u,
  );
}
{
  const bad={
    ...bundles,
    precision:{
      ...bundles.precision,
      genesis_evidence:{
        ...bundles.precision.genesis_evidence,
        genesis_file_sha256:"0".repeat(64),
      },
    },
  };
  assert.throws(
    ()=>verifyVoidEconomicEpoch2QbftPrivateRuntimeBundleSetV1({plan,bundles:bad}),
    /bundle_genesis_evidence_mismatch:precision/u,
  );
}
{
  const bad={
    ...bundles,
    nimo:{
      ...bundles.nimo,
      materialization:{
        ...bundles.nimo.materialization,
        preparation_authority:{
          ...bundles.nimo.materialization.preparation_authority,
          service_start:true,
        },
      },
    },
  };
  assert.throws(
    ()=>verifyVoidEconomicEpoch2QbftPrivateRuntimeBundleSetV1({plan,bundles:bad}),
    /bundle_preparation_authority_mismatch:nimo:service_start/u,
  );
}
{
  const bad={...bundles,xiphos:{...bundles.xiphos}};
  const peers=JSON.parse(bundles.xiphos.static_nodes_raw.toString("utf8"));
  peers.reverse();
  bad.xiphos.static_nodes_raw=Buffer.from(JSON.stringify(peers,null,2)+"\n");
  assert.throws(
    ()=>verifyVoidEconomicEpoch2QbftPrivateRuntimeBundleSetV1({plan,bundles:bad}),
    /bundle_static_nodes_sha_mismatch:xiphos/u,
  );
}

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"void-e2-bundle-set-proof-"));
try {
  const role="precision";
  const dir=path.join(tmp,role);
  fs.mkdirSync(dir,{mode:0o700});
  const rendered=renderVoidEconomicEpoch2QbftPrivateRuntimeHostV1({
    plan,role,home:"/home/zoso",docker_bin:"/usr/bin/docker",uid:1000,gid:1000,
  });
  const manifest=bundles[role].materialization;
  fs.writeFileSync(path.join(dir,"genesis.json"),genesisRaw);
  fs.writeFileSync(
    path.join(dir,"genesis-evidence.json"),
    JSON.stringify(genesisEvidence)+"\n",
  );
  fs.writeFileSync(path.join(dir,"materialization.json"),JSON.stringify(manifest)+"\n");
  fs.writeFileSync(path.join(dir,"static-nodes.json"),rendered.static_nodes_json);
  fs.writeFileSync(
    path.join(dir,"void-economic-epoch2-qbft-validator-v1.service"),
    rendered.systemd_unit,
  );
  const read=readVoidEconomicEpoch2PreparedBundleV1(dir);
  assert.equal(sha256(read.genesis_raw),EXPECTED_GENESIS_SHA256_V1);

  fs.rmSync(path.join(dir,"genesis.json"));
  fs.symlinkSync("/etc/passwd",path.join(dir,"genesis.json"));
  assert.throws(
    ()=>readVoidEconomicEpoch2PreparedBundleV1(dir),
    /genesis_not_regular/u,
  );
} finally {
  fs.rmSync(tmp,{recursive:true,force:true});
}

console.log("VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_BUNDLE_SET_V1_PROOF_GREEN");
console.log("three_roles_exact=true");
console.log("common_genesis_exact=true");
console.log("common_private_plan_bytes_exact=true");
console.log("static_peer_sets_exact=true");
console.log("systemd_unit_hashes_exact=true");
console.log("symlink_inputs_rejected=true");
console.log("service_installation=false");
console.log("service_start=false");
console.log("authoritative_chain2050_write=false");
console.log("funds_movement=false");
