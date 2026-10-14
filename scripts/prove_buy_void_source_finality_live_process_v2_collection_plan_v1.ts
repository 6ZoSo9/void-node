#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_BUY_VOID_V2_LIVE_PROCESS_COLLECTION_PLAN_V1,
  VOID_BUY_VOID_V2_SELECTOR_ELF_LOCK_ID_V1,
  VOID_BUY_VOID_V2_SELECTOR_INSTALLED_PATH_V1,
  buildBuyVoidV2LiveProcessCollectionPlanV1,
  parseBuyVoidV2SelectorLineV1,
  testOnlyClassifyBuyVoidV2ReviewedNodeOptionsV1,
} from "../ops/precision/void_buy_void_source_finality_live_process_v2_collection_plan_v1.js";
import {
  VOID_BUY_VOID_SOURCE_FINALITY_SERVICE_PROCESS_SELECTOR_CONTRACT_ID_V2,
  VOID_BUY_VOID_SOURCE_FINALITY_SERVICE_PROCESS_SELECTION_MODE_V2,
} from "../src/economic/buy_void_source_finality_live_process_binding_v2.js";

const ready="VOID_BUY_VOID_V2_NATIVE_SELECTOR_GUARD_V1_READY manager_pid=2693 manager_start_ticks=1409 manager_cmdline_sha256="+"1".repeat(64)+" service_pid=1073664 service_start_ticks=5139458 service_cmdline_sha256="+"2".repeat(64);
const parsed=parseBuyVoidV2SelectorLineV1(ready,"VOID_BUY_VOID_V2_NATIVE_SELECTOR_GUARD_V1_READY");
assert.equal(parsed.manager_pid,2693);
assert.equal(parsed.service_pid,1073664);
assert.throws(()=>parseBuyVoidV2SelectorLineV1(ready+" extra=x","VOID_BUY_VOID_V2_NATIVE_SELECTOR_GUARD_V1_READY"),/selector_line_shape_invalid/u);
assert.throws(()=>parseBuyVoidV2SelectorLineV1(ready.replace("manager_pid=2693 ",""),"VOID_BUY_VOID_V2_NATIVE_SELECTOR_GUARD_V1_READY"),/selector_line_shape_invalid/u);

const material={
  schema:"void_buy_void_v2_live_process_collection_plan_v1",
  marker:VOID_BUY_VOID_V2_LIVE_PROCESS_COLLECTION_PLAN_V1,
  version:1,
  selector_elf_lock_id:VOID_BUY_VOID_V2_SELECTOR_ELF_LOCK_ID_V1,
  selector_binary_sha256:"048564b0a351a5ba3b9f980962d9261fa14a49823b5075ca4794bbeefecbb232",
  selector_binary_bytes:26680,
  selector_contract_id:VOID_BUY_VOID_SOURCE_FINALITY_SERVICE_PROCESS_SELECTOR_CONTRACT_ID_V2,
  selector_mode:VOID_BUY_VOID_SOURCE_FINALITY_SERVICE_PROCESS_SELECTION_MODE_V2,
  runtime_uid:1000,runtime_gid:1000,
  manager_pid:2693,manager_start_time_ticks:"1409",manager_cmdline_sha256:"1".repeat(64),
  service_pid:1073664,service_start_time_ticks:"5139458",service_cmdline_sha256:"2".repeat(64),
  service_cgroup_v2_path:"/user.slice/user-1000.slice/user@1000.service/app.slice/void-node-live.service",
  process_source_identity_marker:"VOID_NODE_PROCESS_SOURCE_IDENTITY_V1",
  process_source_commit:"3".repeat(40),process_source_tree:"4".repeat(40),
  process_source_branch:"main",
  systemd_invocation_id:"5".repeat(32),
  executable_realpath:"/usr/bin/node",
  cwd_realpath:"/opt/void-node-live/releases/"+"3".repeat(40),
  node_options_sha256:"6".repeat(64),
  canonical_producer_role:true,capabilities_zero:true,no_new_privileges:true,
  source_generation_verified:true,reviewed_launcher_shape_verified:true,
  selector_ready_and_green_same_generation:true,
  manager_and_service_pidfds_retained_by_selector:true,
  systemctl_user_selector_authority:false,
  process_environment_read_performed:true,selector_process_execution_performed:true,
  filesystem_read_performed:true,filesystem_write_performed:false,
  network_contact_performed:false,receipt_publication_authorized:false,
  production_source_finality_authority_ready:false,public_presale_activation:false,
  funds_movement:false,
} as const;
const plan=buildBuyVoidV2LiveProcessCollectionPlanV1(material);
assert.match(plan.plan_id,/^voidbsv2colplan1_[0-9a-f]{64}$/u);
const changed=buildBuyVoidV2LiveProcessCollectionPlanV1({...material,service_start_time_ticks:"5139459"});
assert.notEqual(changed.plan_id,plan.plan_id);
assert.equal(VOID_BUY_VOID_V2_SELECTOR_INSTALLED_PATH_V1,
  "/opt/void-buy-void-v7-selector-v1/void_buy_void_source_finality_live_process_v2_selector_guard_v1");

const releaseRoot="/opt/void-node-live/releases/"+"3".repeat(40);
const reviewedNodeOptions="--require "+
  releaseRoot+"/runtime/canonical-producer-self-http-guard-v4.cjs";
assert.deepEqual(
  testOnlyClassifyBuyVoidV2ReviewedNodeOptionsV1({
    cwd:releaseRoot,
    index_git_blob_sha1:"123ec1792a027f93d4c9030749a0e7e136a75a44",
    node_options:reviewedNodeOptions,
  }),
  {
    ok:true,
    reason:null,
    guard_relative_path:"runtime/canonical-producer-self-http-guard-v4.cjs",
  },
);
const maliciousNodeOptions=testOnlyClassifyBuyVoidV2ReviewedNodeOptionsV1({
  cwd:releaseRoot,
  index_git_blob_sha1:"123ec1792a027f93d4c9030749a0e7e136a75a44",
  node_options:reviewedNodeOptions+" --require /tmp/evil.cjs",
});
assert.equal(maliciousNodeOptions.ok,false);
assert.equal(
  maliciousNodeOptions.reason,
  "reviewed_node_options_exact_value_mismatch",
);
const unknownGeneration=testOnlyClassifyBuyVoidV2ReviewedNodeOptionsV1({
  cwd:releaseRoot,
  index_git_blob_sha1:"f".repeat(40),
  node_options:reviewedNodeOptions,
});
assert.equal(unknownGeneration.ok,false);
assert.equal(
  unknownGeneration.reason,
  "reviewed_node_options_index_generation_unknown",
);

const source=fs.readFileSync("ops/precision/void_buy_void_source_finality_live_process_v2_collection_plan_v1.ts","utf8");
for(const required of [
  "VOID_BUY_VOID_V2_SELECTOR_INSTALLED_PATH_V1",
  "VOID_BUY_VOID_V2_SELECTOR_ELF_LOCK_ID_V1",
  "EXPECTED_SELECTOR_SHA",
  "EXPECTED_SELECTOR_BYTES",
  'child.stdin.write("VERIFY\\n")',
  "selector_ready_green_generation_mismatch",
  "source_generation_verified:true",
  "reviewed_launcher_shape_verified:true",
  "REVIEWED_SELF_HTTP_GUARD_BY_INDEX_BLOB",
  "reviewed_node_options_exact_value_mismatch",
  "canonical-producer-self-http-guard-v4.cjs",
  "service_release_path_invalid",
  "service_launcher_shape_invalid",
  "process_environment_read_performed:true",
  "selector_process_execution_performed:true",
  "filesystem_write_performed:false",
  "network_contact_performed:false",
  "receipt_publication_authorized:false",
  "systemctl_user_selector_authority:false",
  'child.on("error",persistent_error_listener)',
  "selector_process_spawn_error:",
  "--test-only-selector-spawn-error",
]) assert.equal(source.includes(required),true,required);
for(const forbidden of [
  "systemctl --user","DBUS_SESSION_BUS_ADDRESS","eth_sendRawTransaction",
  "eth_sendTransaction","PRIVATE_KEY","SEED_PHRASE",
]) assert.equal(source.includes(forbidden),false,forbidden);

const cli=spawnSync(
  process.execPath,
  [
    path.join("node_modules","tsx","dist","cli.mjs"),
    "ops/precision/void_buy_void_source_finality_live_process_v2_collection_plan_v1.ts",
    "--test-only-selector-spawn-error",
  ],
  {
    cwd:process.cwd(),
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
    timeout:10_000,
    env:{
      PATH:"/usr/bin:/bin",
      HOME:"/nonexistent",
      LANG:"C",
      LC_ALL:"C",
      TZ:"UTC",
    },
  },
);
assert.equal(cli.error,undefined,String(cli.error||""));
assert.equal(cli.signal,null,"selector_spawn_error_regression_signal");
assert.equal(cli.status,2,String(cli.stderr||cli.stdout||""));
assert.match(
  String(cli.stderr||""),
  /VOID_BUY_VOID_V2_LIVE_PROCESS_COLLECTION_PLAN_V1_HOLD/u,
);
assert.match(
  String(cli.stderr||""),
  /reason=selector_process_spawn_error:ENOENT/u,
);

console.log("VOID_BUY_VOID_V2_LIVE_PROCESS_COLLECTION_PLAN_V1_PROOF_GREEN");
console.log("selector_elf_lock_bound=true");
console.log("selector_pidfd_handshake_required=true");
console.log("selector_spawn_error_machine_readable_hold=true");
console.log("selector_ready_green_same_generation_required=true");
console.log("process_source_generation_verified=true");
console.log("reviewed_launcher_shape_verified=true");
console.log("reviewed_node_options_exact=true");
console.log("malicious_node_options_preload_rejected=true");
console.log("source_custody_overclaim=false");
console.log("process_environment_read_performed=true");
console.log("selector_process_execution_performed=true");
console.log("filesystem_write_performed=false");
console.log("network_contact_performed=false");
console.log("receipt_publication_authorized=false");
console.log("production_source_finality_authority_ready=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
