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
  VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_ACTIVATION_CONFIRMATION_V1,
  VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_ACTIVATION_V1,
  buildVoidEconomicEpoch2QbftPrivateRuntimeActivationReceiptV1,
  compileVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1,
  validateVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1,
} from "../tools/void-economic-epoch2-qbft-private-runtime-activation-v1.mjs";

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
function rehashActivationPlan(value) {
  const plan=structuredClone(value);
  delete plan.activation_plan_id;
  return "voide2qactp1_"+
    sha256(Buffer.from(JSON.stringify(canonical(plan))));
}
function rehashInstallReceipt(value) {
  const receipt=structuredClone(value);
  delete receipt.install_receipt_id;
  return "voide2qinst1_"+
    sha256(Buffer.from(JSON.stringify(canonical(receipt))));
}
function rehashStartAdmission(value) {
  const receipt=structuredClone(value);
  delete receipt.start_admission_id;
  return "voide2qsad1_"+
    sha256(Buffer.from(JSON.stringify(canonical(receipt))));
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

const installReceipts={};
for(const role of roles) {
  installReceipts[role]=buildVoidEconomicEpoch2QbftHostInstallReceiptV1({
    plan,
    plan_file_sha256:planFileSha,
    bundle_set_receipt:bundleSet,
    role,
    materialization:bundles[role].materialization,
    receipt_basis:"fresh_install",
    observed_at_utc:"2030-01-01T00:02:00.000Z",
    observed_repo_head:"e".repeat(40),
    unit_file_state:"static",
    operator_user_unit_dir_direct_enablement_links_absent:true,
  });
}

const prestartReceipts={};
for(const [index,role] of roles.entries()) {
  const facts={
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
const startAdmission=
  buildVoidEconomicEpoch2QbftPrivateRuntimeStartAdmissionV1({
    plan,
    plan_file_sha256:planFileSha,
    bundle_set_receipt:bundleSet,
    evaluated_at_utc:"2030-01-01T00:04:00.000Z",
    receipts:prestartReceipts,
  });
const ACTIVATION_COMPILED_AT="2030-01-01T00:04:30.000Z";

const activationPlan=compileVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1({
  plan,
  plan_file_sha256:planFileSha,
  bundle_set_receipt:bundleSet,
  install_receipts:installReceipts,
  start_admission_receipt:startAdmission,
  compiled_at_utc:ACTIVATION_COMPILED_AT,
});

assert.equal(
  activationPlan.marker,
  VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_ACTIVATION_V1,
);
assert.equal(
  activationPlan.status,
  "THREE_HOST_PRESTART_ADMISSION_BOUND_VALIDATOR_START_HOLD",
);
assert.match(activationPlan.activation_plan_id,/^voide2qactp1_[0-9a-f]{64}$/u);
assert.equal(activationPlan.plan_id,plan.plan_id);
assert.equal(activationPlan.bundle_set_id,bundleSet.bundle_set_id);
assert.equal(activationPlan.plan_file_sha256,planFileSha);
assert.equal(activationPlan.start_admission_id,startAdmission.start_admission_id);
assert.equal(
  activationPlan.start_admission_evaluated_at_utc,
  startAdmission.evaluated_at_utc,
);
assert.equal(
  activationPlan.start_admission_valid_until_utc,
  "2030-01-01T00:08:00.000Z",
);
assert.equal(
  activationPlan.start_admission_observed_repo_head,
  "f".repeat(40),
);
assert.equal(activationPlan.compiled_at_utc,ACTIVATION_COMPILED_AT);
assert.equal(activationPlan.chain.chain_id,2050);
assert.equal(activationPlan.chain.chain_id_hex,"0x802");
assert.equal(activationPlan.chain.execution_epoch,2);
assert.equal(activationPlan.chain.consensus,"QBFT");
assert.equal(activationPlan.chain.validator_count,3);
assert.equal(activationPlan.chain.required_quorum,2);
assert.deepEqual(activationPlan.chain.expected_validators,EXPECTED_VALIDATORS_V1);
assert.equal(activationPlan.rpc.url,"http://127.0.0.1:18553/");
assert.deepEqual(
  activationPlan.rpc.allowed_observation_methods,
  [
    "eth_chainId",
    "eth_blockNumber",
    "net_peerCount",
    "qbft_getValidatorsByBlockNumber",
  ],
);
assert.equal(activationPlan.rpc.transaction_methods_forbidden,true);
assert.deepEqual(
  activationPlan.start_sequence.map((x)=>x.role),
  ["precision","nimo","xiphos"],
);
assert.equal(activationPlan.start_sequence[0].quorum_after_start,false);
assert.equal(activationPlan.start_sequence[1].quorum_after_start,true);
assert.equal(activationPlan.start_sequence[2].quorum_after_start,true);
assert.equal(
  activationPlan.activation.required_confirmation,
  "startPrivateEpoch2QbftSuccessorV1",
);
assert.equal(
  activationPlan.activation.first_possible_authoritative_block_production_step,
  2,
);
assert.equal(activationPlan.activation.service_enable,false);
assert.equal(activationPlan.activation.service_restart,false);
assert.equal(activationPlan.activation.automatic_retry,false);
assert.equal(
  activationPlan.pre_start_revalidation.unit_file_state_observation_required,
  true,
);
assert.equal(
  activationPlan.pre_start_revalidation.operator_user_unit_dir_direct_enablement_links_absent_required,
  true,
);
assert.equal(
  activationPlan.pre_start_revalidation.indirect_activation_absence_proven,
  false,
);
for(const row of activationPlan.install_receipts) {
  assert.equal(row.receipt_basis,"fresh_install");
  assert.equal(
    row.install_receipt_observed_at_utc,
    "2030-01-01T00:02:00.000Z",
  );
  assert.equal(row.install_receipt_observed_repo_head,"e".repeat(40));
  assert.equal(Object.hasOwn(row,"installed_repo_head"),false);
  assert.equal(row.unit_file_state,"static");
  assert.equal(row.operator_user_unit_dir_direct_enablement_links_absent,true);
  assert.equal(row.indirect_activation_absence_proven,false);
}
{
  const reattestedInstallReceipts={
    ...installReceipts,
    nimo:buildVoidEconomicEpoch2QbftHostInstallReceiptV1({
      plan,
      plan_file_sha256:planFileSha,
      bundle_set_receipt:bundleSet,
      role:"nimo",
      materialization:bundles.nimo.materialization,
      receipt_basis:"existing_runtime_read_only_reattestation",
      observed_at_utc:"2030-01-01T00:02:30.000Z",
      observed_repo_head:"e".repeat(40),
      unit_file_state:"static",
      operator_user_unit_dir_direct_enablement_links_absent:true,
    }),
  };
  assert.equal(
    reattestedInstallReceipts.nimo.authority.runtime_root_write,
    false,
  );
  assert.equal(
    reattestedInstallReceipts.nimo.authority.service_unit_installation,
    false,
  );

  const reattestedPrestartReceipts={
    ...prestartReceipts,
    nimo:buildVoidEconomicEpoch2QbftHostPrestartReceiptV1({
      plan,
      plan_file_sha256:planFileSha,
      bundle_set_receipt:bundleSet,
      role:"nimo",
      materialization:bundles.nimo.materialization,
      install_receipt:reattestedInstallReceipts.nimo,
      observed_repo_head:prestartReceipts.nimo.observed_repo_head,
      observed_at_utc:prestartReceipts.nimo.observed_at_utc,
      valid_until_utc:prestartReceipts.nimo.valid_until_utc,
      facts:prestartReceipts.nimo.facts,
    }),
  };
  assert.equal(
    reattestedPrestartReceipts.nimo.install_receipt_basis,
    "existing_runtime_read_only_reattestation",
  );

  const reattestedStartAdmission=
    buildVoidEconomicEpoch2QbftPrivateRuntimeStartAdmissionV1({
      plan,
      plan_file_sha256:planFileSha,
      bundle_set_receipt:bundleSet,
      evaluated_at_utc:"2030-01-01T00:04:00.000Z",
      receipts:reattestedPrestartReceipts,
    });

  const reattestedActivationPlan=
    compileVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1({
      plan,
      plan_file_sha256:planFileSha,
      bundle_set_receipt:bundleSet,
      install_receipts:reattestedInstallReceipts,
      start_admission_receipt:reattestedStartAdmission,
      compiled_at_utc:ACTIVATION_COMPILED_AT,
    });
  assert.equal(
    validateVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1(
      reattestedActivationPlan,
    ),
    reattestedActivationPlan,
  );
  const nimoRow=reattestedActivationPlan.install_receipts.find(
    (row)=>row.role==="nimo",
  );
  assert.equal(
    nimoRow.receipt_basis,
    "existing_runtime_read_only_reattestation",
  );
  assert.equal(
    nimoRow.install_receipt_observed_at_utc,
    "2030-01-01T00:02:30.000Z",
  );
  assert.equal(
    nimoRow.install_receipt_observed_repo_head,
    "e".repeat(40),
  );
}

assert.equal(
  activationPlan.activation.rollback_stop_all_started_on_any_failure,
  true,
);
assert.equal(activationPlan.authority.source_plan_only,true);
for(const [key,value] of Object.entries(activationPlan.authority)) {
  if(key==="source_plan_only") assert.equal(value,true,key);
  else assert.equal(value,false,key);
}
assert.equal(
  validateVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1(activationPlan),
  activationPlan,
);

const receipt=buildVoidEconomicEpoch2QbftPrivateRuntimeActivationReceiptV1({
  activation_plan:activationPlan,
  activated_at_utc:"2030-01-01T00:03:00.000Z",
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
  receipt.status,
  "PRIVATE_QBFT_RUNTIME_ACTIVE_TRANSACTION_AND_MIGRATION_HOLD",
);
assert.match(receipt.activation_receipt_id,/^voide2qactr1_[0-9a-f]{64}$/u);
assert.equal(receipt.start_admission_id,startAdmission.start_admission_id);
assert.equal(receipt.byzantine_fault_tolerance,0);
assert.equal(receipt.observations.two_of_three_quorum_proven,true);
assert.equal(receipt.observations.all_three_validator_services_active,true);
assert.equal(receipt.authority.systemd_reload,true);
assert.equal(receipt.authority.service_start,true);
assert.equal(receipt.authority.docker_mutation,true);
assert.equal(receipt.authority.private_key_access,true);
assert.equal(receipt.authority.private_key_content_exported,false);
assert.equal(receipt.authority.private_key_stdout,false);
assert.equal(receipt.authority.authoritative_chain2050_write,true);
for(const key of [
  "service_enable",
  "transaction_construction",
  "transaction_signing",
  "transaction_submission",
  "transaction_broadcast",
  "validator_set_mutation",
  "token_movement",
  "funds_movement",
  "migration_authorized",
  "public_activation_authorized",
]) {
  assert.equal(receipt.authority[key],false,key);
}

{
  const bad=structuredClone(activationPlan);
  bad.rpc.transaction_methods_forbidden=false;
  bad.activation_plan_id=rehashActivationPlan(bad);
  assert.throws(
    ()=>validateVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1(bad),
    /activation_plan_contract_mismatch/u,
  );
}
{
  const bad=structuredClone(activationPlan);
  bad.install_receipts[0].unit_file_state="disabled";
  bad.activation_plan_id=rehashActivationPlan(bad);
  assert.throws(
    ()=>validateVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1(bad),
    /activation_plan_install_row_invalid:precision/u,
  );
}
{
  const bad=structuredClone(activationPlan);
  bad.pre_start_revalidation.indirect_activation_absence_proven=true;
  bad.activation_plan_id=rehashActivationPlan(bad);
  assert.throws(
    ()=>validateVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1(bad),
    /activation_plan_prestart_revalidation_mismatch:indirect_activation_absence_proven/u,
  );
}

{
  const bad=structuredClone(installReceipts.nimo);
  bad.authority.service_start=true;
  bad.install_receipt_id=rehashInstallReceipt(bad);
  assert.throws(
    ()=>compileVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1({
      plan,
      plan_file_sha256:planFileSha,
      bundle_set_receipt:bundleSet,
      install_receipts:{...installReceipts,nimo:bad},
      start_admission_receipt:startAdmission,
      compiled_at_utc:ACTIVATION_COMPILED_AT,
    }),
    /install_authority_mismatch:nimo:service_start/u,
  );
}
{
  const bad=structuredClone(startAdmission);
  bad.verification.service_start=true;
  bad.start_admission_id=rehashStartAdmission(bad);
  assert.throws(
    ()=>compileVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1({
      plan,
      plan_file_sha256:planFileSha,
      bundle_set_receipt:bundleSet,
      install_receipts:installReceipts,
      start_admission_receipt:bad,
      compiled_at_utc:ACTIVATION_COMPILED_AT,
    }),
    /start_admission_verification_mismatch:service_start/u,
  );
}
{
  assert.throws(
    ()=>compileVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1({
      plan,
      plan_file_sha256:planFileSha,
      bundle_set_receipt:bundleSet,
      install_receipts:installReceipts,
      start_admission_receipt:startAdmission,
      compiled_at_utc:"2030-01-01T00:09:00.000Z",
    }),
    /start_admission_expired_at_activation_compile/u,
  );
}
{
  const bad=structuredClone(startAdmission);
  bad.receipts[0].install_receipt_id=installReceipts.nimo.install_receipt_id;
  bad.start_admission_id=rehashStartAdmission(bad);
  assert.throws(
    ()=>compileVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1({
      plan,
      plan_file_sha256:planFileSha,
      bundle_set_receipt:bundleSet,
      install_receipts:installReceipts,
      start_admission_receipt:bad,
      compiled_at_utc:ACTIVATION_COMPILED_AT,
    }),
    /start_admission_role_row_mismatch:precision/u,
  );
}
{
  assert.throws(
    ()=>buildVoidEconomicEpoch2QbftPrivateRuntimeActivationReceiptV1({
      activation_plan:activationPlan,
      activated_at_utc:"2030-01-01T00:03:00.000Z",
      observed:{
        validators:[
          EXPECTED_VALIDATORS_V1[0],
          EXPECTED_VALIDATORS_V1[1],
          "0x0000000000000000000000000000000000000001",
        ],
        precision_only_block_number:"0",
        after_nimo_block_number:"1",
        after_nimo_peer_count:1,
        after_xiphos_block_number:"2",
        after_xiphos_peer_count:2,
        chain_id_hex:"0x802",
        started_roles:["precision","nimo","xiphos"],
      },
    }),
    /activation_validator_set_mismatch/u,
  );
}
{
  assert.throws(
    ()=>buildVoidEconomicEpoch2QbftPrivateRuntimeActivationReceiptV1({
      activation_plan:activationPlan,
      activated_at_utc:"2030-01-01T00:03:00.000Z",
      observed:{
        validators:[...EXPECTED_VALIDATORS_V1],
        precision_only_block_number:"1",
        after_nimo_block_number:"2",
        after_nimo_peer_count:1,
        after_xiphos_block_number:"3",
        after_xiphos_peer_count:2,
        chain_id_hex:"0x802",
        started_roles:["precision","nimo","xiphos"],
      },
    }),
    /precision_only_unexpected_block_progress/u,
  );
}
{
  assert.throws(
    ()=>buildVoidEconomicEpoch2QbftPrivateRuntimeActivationReceiptV1({
      activation_plan:activationPlan,
      activated_at_utc:"2030-01-01T00:03:00.000Z",
      observed:{
        validators:[...EXPECTED_VALIDATORS_V1],
        precision_only_block_number:"0",
        after_nimo_block_number:"1",
        after_nimo_peer_count:1,
        after_xiphos_block_number:"1",
        after_xiphos_peer_count:2,
        chain_id_hex:"0x802",
        started_roles:["precision","nimo","xiphos"],
      },
    }),
    /three_validator_progress_not_proven/u,
  );
}

assert.equal(
  VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_ACTIVATION_CONFIRMATION_V1,
  "startPrivateEpoch2QbftSuccessorV1",
);

const controller=fs.readFileSync(
  "ops/precision/void-precision-epoch2-qbft-private-runtime-activate-v1.mjs",
  "utf8",
);
for(const required of [
  "activation_plan_required_for_apply",
  "--start-admission",
  "start_admission_expired_before_activation",
  "compileFreshPlan(args,activationPlan.compiled_at_utc)",
  "start_admission_repo_head_not_ancestor",
  "explicit_confirmation_required",
  "confirm_plan_id_mismatch",
  "activation_plan_not_freshly_reproducible",
  "ControlMaster=yes",
  "NumberOfPasswordPrompts=1",
  "VOID_EPOCH2_QBFT_PRESTART_REVALIDATION_GREEN",
  "nodekey_public_identity_verified=true",
  "nodekey_content_exported=false",
  "nodekey_stdout=false",
  "rootless_docker_required",
  "service_not_clean_inactive",
  "service_unit_file_state_not_clean",
  "service_unit_file_state_drift",
  "service_unit_file_state_not_static_before_explicit_start",
  "service_unit_file_state_changed_during_daemon_reload",
  "service_enablement_directory_symlink_at_start_boundary",
  "service_enablement_directory_not_directory_at_start_boundary",
  "service_direct_enablement_link_present_at_start_boundary",
  "check_direct_links",
  "service_already_active_before_explicit_start",
  "service_started_during_daemon_reload",
  "service_enablement_directory_symlink",
  "service_direct_enablement_link_present",
  "operator_user_unit_dir_direct_enablement_links_absent=true",
  "indirect_activation_absence_proven=false",
  "p2p_port_not_vacant",
  "precision_rpc_port_not_vacant",
  'rpcCall("eth_chainId",[])',
  'rpcCall("eth_blockNumber",[])',
  'rpcCall("net_peerCount",[])',
  'rpcCall("qbft_getValidatorsByBlockNumber",["latest"])',
  "precision_only_block_progressed",
  "two_validator_quorum_not_proven",
  "three_validator_progress_not_proven",
  "[...started].reverse()",
  "systemctl --user daemon-reload",
  'systemctl --user start "$service"',
  'systemctl --user stop "$service"',
  "docker_mutation=true",
  "private_key_access=true",
  "authoritative_chain2050_write=true",
]) {
  assert.ok(controller.includes(required),required);
}
for(const forbidden of [
  "systemctl --user enable",
  "systemctl --user restart",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "personal_",
  "wallet_",
  "debug_",
  "admin_",
  "sudo ",
  "automatic_retry=true",
]) {
  assert.equal(controller.includes(forbidden),false,forbidden);
}

assert.equal(
  controller.includes('].join("\\\\n");'),
  false,
  "generated shell scripts must use real newline separators",
);
assert.equal(
  controller.includes('bashLiteral(SERVICE)+"\\\\n";'),
  false,
  "activeScript must terminate with a real newline",
);

assert.ok(
  controller.includes('\'cd "$repo"\''),
  "remote activation preflight must enter repo before inline Node dependency resolution",
);
assert.ok(
  controller.indexOf('\'cd "$repo"\'')<
  controller.indexOf('node --input-type=module - "$key"'),
  "repo cwd must be established before inline ethers identity derivation",
);

assert.ok(
  controller.indexOf("if(!args.apply)")<
  controller.indexOf("const remote=new RemoteLane()"),
  "plan-only path must terminate before any SSH/live host action",
);
assert.ok(
  controller.indexOf('remote.exec("precision",startScript()')<
  controller.indexOf('remote.exec("nimo",startScript()'),
);
assert.ok(
  controller.indexOf('remote.exec("nimo",startScript()')<
  controller.indexOf('remote.exec("xiphos",startScript()'),
);

console.log("VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_ACTIVATION_V1_PROOF_GREEN");
console.log("install_receipt_lineage_exact=true");
console.log("start_admission_lineage_exact=true");
console.log("start_admission_expiry_bound=true");
console.log("activation_plan_content_addressed=true");
console.log("start_order_precision_nimo_xiphos=true");
console.log("precision_only_height_zero_required=true");
console.log("two_validator_quorum_progress_required=true");
console.log("three_validator_two_peer_progress_required=true");
console.log("byzantine_fault_tolerance=0");
console.log("single_attempt=true");
console.log("rollback_stop_started_reverse_order=true");
console.log("service_enable=false");
console.log("service_restart=false");
console.log("transaction_construction=false");
console.log("transaction_signing=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("funds_movement=false");
