#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_AUTHORITY_V2,
  VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_PATH_V2,
  VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_RECEIPT_V2,
  VOID_BUY_VOID_SOURCE_FINALITY_SERVICE_PROCESS_SELECTOR_CONTRACT_ID_V2,
  VOID_BUY_VOID_SOURCE_FINALITY_SERVICE_PROCESS_SELECTION_MODE_V2,
  buildBuyVoidSourceFinalityLiveProcessBindingReceiptV2,
  buyVoidSourceFinalityLiveProcessBindingReceiptIdV2,
  classifyBuyVoidSourceFinalityLiveProcessBindingV2,
  selectBuyVoidSourceFinalityServiceProcessV2,
  testOnlyClassifyBuyVoidLiveProcessKernelGenerationRecheckV2,
} from "../src/economic/buy_void_source_finality_live_process_binding_v2.js";

const sha=(value:string|Buffer)=>crypto.createHash("sha256").update(value).digest("hex");
const uid=1000,gid=1000;
const managerScope="/user.slice/user-1000.slice/user@1000.service/init.scope";
const serviceCgroup="/user.slice/user-1000.slice/user@1000.service/app.slice/void-node-live.service";
const manager={
  pid:2693,ppid:1,start_time_ticks:"1409",uid,gid,
  cgroup_v2_path:managerScope,comm:"systemd",
  executable_realpath:"/usr/lib/systemd/systemd",
  executable_root_owned_nonwritable:true,
  cmdline:["/usr/lib/systemd/systemd","--user"],
} as const;
const service={
  pid:1073664,ppid:2693,start_time_ticks:"5139458",uid,gid,
  cgroup_v2_path:serviceCgroup,comm:"node",
  executable_realpath:"/usr/bin/node",
  executable_root_owned_nonwritable:true,
  cmdline:[
    "/usr/bin/node",
    "--conditions=void-process-source-identity-v1",
    "--conditions=void-process-source-commit-"+"1".repeat(40),
    "--conditions=void-process-source-tree-"+"2".repeat(40),
    "--conditions=void-process-source-branch-main",
    "/opt/void-node-live/releases/"+"1".repeat(40)+"/src/index.ts",
  ],
} as const;
const esbuild={
  ...service,pid:1073858,ppid:service.pid,comm:"esbuild",
  executable_realpath:"/opt/void-node-live/releases/x/node_modules/@esbuild/linux-x64/bin/esbuild",
  cmdline:["/opt/void-node-live/releases/x/node_modules/@esbuild/linux-x64/bin/esbuild","--service=0.25.11","--ping"],
} as const;
const helper={
  ...manager,pid:2700,ppid:2693,comm:"(sd-pam)",
  executable_realpath:"/usr/lib/systemd/systemd-executor",
  cmdline:["(sd-pam)"],
} as const;

const selection=selectBuyVoidSourceFinalityServiceProcessV2({
  runtime_uid:uid,runtime_gid:gid,
  manager_processes:[manager,helper],
  service_processes:[service,esbuild],
});
assert.equal(selection.manager.pid,2693);
assert.equal(selection.service.pid,1073664);
assert.equal(
  selection.service_process_selection_mode,
  "kernel_cgroup_manager_parent_v1",
);
assert.match(
  selection.service_process_selector_contract_id,
  /^voidbsfpsel1_[0-9a-f]{64}$/u,
);
assert.equal(
  selection.service_process_selector_contract_id,
  VOID_BUY_VOID_SOURCE_FINALITY_SERVICE_PROCESS_SELECTOR_CONTRACT_ID_V2,
);

for(const attack of [
  {label:"fake-manager",managers:[manager,{...manager,pid:9999}],services:[service]},
  {label:"service-child-not-manager",managers:[manager],services:[{...service,ppid:8888}]},
  {label:"two-manager-parent-node-candidates",managers:[manager],services:[service,{...service,pid:1075000}]},
  {label:"wrong-manager-exe",managers:[{...manager,executable_realpath:"/tmp/systemd"}],services:[service]},
  {label:"manager-not-pid1-child",managers:[{...manager,ppid:7777}],services:[service]},
  {label:"wrong-service-cgroup",managers:[manager],services:[{...service,cgroup_v2_path:managerScope}]},
]){
  assert.throws(
    ()=>selectBuyVoidSourceFinalityServiceProcessV2({
      runtime_uid:uid,runtime_gid:gid,
      manager_processes:attack.managers,
      service_processes:attack.services,
    }),
    /selector_/u,
    attack.label,
  );
}

const self={
  process_source_identity_marker:"VOID_NODE_PROCESS_SOURCE_IDENTITY_V1",
  process_source_commit:"1".repeat(40),
  process_source_tree:"2".repeat(40),
  process_source_branch:"main",
  service_unit:"void-node-live.service",
  runtime_uid:uid,runtime_gid:gid,
  main_pid:service.pid,
  process_start_time_ticks:service.start_time_ticks,
  systemd_invocation_id:"3".repeat(32),
  cgroup_v2_path:serviceCgroup,
  executable_realpath:"/usr/bin/node",
  cwd_realpath:"/opt/void-node-live/releases/"+"1".repeat(40),
  cmdline_sha256:sha(Buffer.from(service.cmdline.join("\0")+"\0")),
  node_options_sha256:"5".repeat(64),
  canonical_producer_role:true,
  node_path_absent:true,
  ld_preload_absent:true,
  ld_library_path_absent:true,
  capabilities_zero:true,
  no_new_privileges:true,
} as const;

const material={
  marker:VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_RECEIPT_V2,
  version:2,
  deployment_receipt_id:"voidbsfdep1_"+"4".repeat(64),
  service_process_selection_mode:
    VOID_BUY_VOID_SOURCE_FINALITY_SERVICE_PROCESS_SELECTION_MODE_V2,
  service_process_selector_contract_id:
    VOID_BUY_VOID_SOURCE_FINALITY_SERVICE_PROCESS_SELECTOR_CONTRACT_ID_V2,
  manager_pid:manager.pid,
  manager_ppid:1,
  manager_start_time_ticks:manager.start_time_ticks,
  manager_cgroup_v2_path:managerScope,
  manager_executable_realpath:"/usr/lib/systemd/systemd",
  manager_cmdline_sha256:sha(Buffer.from(manager.cmdline.join("\0")+"\0")),
  manager_pidfd_retained_during_collection:true,
  service_pidfd_retained_during_collection:true,
  ...self,
  source_custody_proven:true,
  reviewed_service_contract_proven:true,
  reviewed_launcher_contract_proven:true,
} as const;
const receipt=buildBuyVoidSourceFinalityLiveProcessBindingReceiptV2(material);
assert.match(receipt.receipt_id,/^voidbsflp2_[0-9a-f]{64}$/u);
assert.equal(
  receipt.receipt_id,
  buyVoidSourceFinalityLiveProcessBindingReceiptIdV2(material),
);

const decision=classifyBuyVoidSourceFinalityLiveProcessBindingV2({
  receipt,self_identity:self,self_parent_pid:manager.pid,
  manager_start_time_ticks:manager.start_time_ticks,
  manager_cgroup_v2_path:managerScope,
  manager_cmdline_sha256:receipt.manager_cmdline_sha256,
  deployment_receipt_id:receipt.deployment_receipt_id,
});
assert.equal(decision.ok,true);
if(decision.ok){
  assert.equal(decision.selector_generation_verified,true);
  assert.equal(decision.manager_generation_verified,true);
  assert.equal(decision.direct_parent_binding_proven,true);
  assert.equal(decision.same_live_process_binding_proven,true);
  assert.equal(decision.production_source_finality_authority_ready,false);
}

const v1Like={...receipt,marker:"VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_RECEIPT_V1",version:1,receipt_id:"voidbsflp1_"+"0".repeat(64)};
assert.equal(classifyBuyVoidSourceFinalityLiveProcessBindingV2({
  receipt:v1Like,self_identity:self,self_parent_pid:manager.pid,
  manager_start_time_ticks:manager.start_time_ticks,
  manager_cgroup_v2_path:managerScope,
  manager_cmdline_sha256:receipt.manager_cmdline_sha256,
  deployment_receipt_id:receipt.deployment_receipt_id,
}).ok,false);

for(const attack of [
  {label:"manager-restart",args:{manager_start_time_ticks:"1410"}},
  {label:"manager-cgroup-change",args:{manager_cgroup_v2_path:"/other"}},
  {label:"manager-cmdline-change",args:{manager_cmdline_sha256:"6".repeat(64)}},
  {label:"parent-change",args:{self_parent_pid:9999}},
]){
  const result=classifyBuyVoidSourceFinalityLiveProcessBindingV2({
    receipt,self_identity:self,self_parent_pid:manager.pid,
    manager_start_time_ticks:manager.start_time_ticks,
    manager_cgroup_v2_path:managerScope,
    manager_cmdline_sha256:receipt.manager_cmdline_sha256,
    deployment_receipt_id:receipt.deployment_receipt_id,
    ...attack.args,
  });
  assert.equal(result.ok,false,attack.label);
}

const stableKernelGeneration={
  manager_pid:manager.pid,
  manager_before:{ppid:1,start_time_ticks:manager.start_time_ticks},
  manager_after:{ppid:1,start_time_ticks:manager.start_time_ticks},
  self_before:{ppid:manager.pid,start_time_ticks:service.start_time_ticks},
  self_after:{ppid:manager.pid,start_time_ticks:service.start_time_ticks},
} as const;
assert.deepEqual(
  testOnlyClassifyBuyVoidLiveProcessKernelGenerationRecheckV2(
    stableKernelGeneration,
  ),
  {ok:true,reason:null},
);
for(const attack of [
  {
    label:"service-reparented",
    input:{
      ...stableKernelGeneration,
      self_after:{...stableKernelGeneration.self_after,ppid:1},
    },
    reason:"live_process_v2_self_parent_changed_during_verification",
  },
  {
    label:"service-generation-changed",
    input:{
      ...stableKernelGeneration,
      self_after:{...stableKernelGeneration.self_after,start_time_ticks:"5139459"},
    },
    reason:"live_process_v2_self_generation_changed_during_verification",
  },
  {
    label:"manager-restarted",
    input:{
      ...stableKernelGeneration,
      manager_after:{...stableKernelGeneration.manager_after,start_time_ticks:"1410"},
    },
    reason:"live_process_v2_manager_identity_changed_during_verification",
  },
  {
    label:"manager-reparented",
    input:{
      ...stableKernelGeneration,
      manager_after:{...stableKernelGeneration.manager_after,ppid:77},
    },
    reason:"live_process_v2_manager_not_pid1_child",
  },
]){
  const result=testOnlyClassifyBuyVoidLiveProcessKernelGenerationRecheckV2(
    attack.input,
  );
  assert.equal(result.ok,false,attack.label);
  assert.equal(result.reason,attack.reason,attack.label);
}

assert.equal(
  VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_PATH_V2,
  "/var/lib/void-source-finality-v7/live-process-binding-v2.json",
);
for(const [key,expected] of Object.entries({
  source_only_gate:true,
  v1_receipt_authority_rejected:true,
  root_custodied_v2_receipt_required:true,
  kernel_cgroup_manager_parent_selector_required:true,
  exact_manager_executable_required:true,
  exact_service_parent_relation_required:true,
  manager_and_service_start_ticks_required:true,
  manager_and_service_pidfd_retention_required_at_collection:true,
  self_process_reverification_required:true,
  systemctl_user_selector_authority:false,
  systemd_invocation_metadata_only:true,
  host_mutation:false,
  service_mutation:false,
  credential_access:false,
  wallet_or_signer_access:false,
  rpc_call:false,
  transaction_broadcast:false,
  production_source_finality_authority_ready:false,
  public_presale_activation:false,
  funds_movement:false,
})){
  assert.equal(VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_AUTHORITY_V2[key],expected,key);
}

console.log("VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_V2_PROOF_GREEN");
console.log("precision_topology_fixture_manager_scope_pid_count=2");
console.log("exact_one_manager_shaped_candidate=true");
console.log("manager_ppid_pid1_required=true");
console.log("exact_one_manager_parent_node_candidate=true");
console.log("esbuild_children_not_service_candidate=true");
console.log("selector_contract_content_addressed=true");
console.log("v1_receipt_production_authority_rejected=true");
console.log("manager_restart_rejected=true");
console.log("runtime_service_reparent_during_verification_rejected=true");
console.log("runtime_service_generation_change_during_verification_rejected=true");
console.log("direct_parent_change_rejected=true");
console.log("manager_pidfd_required_at_collection=true");
console.log("service_pidfd_required_at_collection=true");
console.log("systemctl_user_selector_authority=false");
console.log("production_source_finality_authority_ready=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
