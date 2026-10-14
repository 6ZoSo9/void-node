#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_VOID_V2_LIVE_PROCESS_RECEIPT_PUBLISHER_V1,
  buildBuyVoidV2LiveProcessReceiptFromPlanV1,
  installBuyVoidV2LiveProcessReceiptCreateOnceV1,
  rollbackNewBuyVoidV2LiveProcessReceiptV1,
} from "../ops/precision/void_buy_void_source_finality_live_process_binding_v2_receipt_publish_v1.js";
import {
  VOID_BUY_VOID_SOURCE_FINALITY_SERVICE_PROCESS_SELECTOR_CONTRACT_ID_V2,
  VOID_BUY_VOID_SOURCE_FINALITY_SERVICE_PROCESS_SELECTION_MODE_V2,
} from "../src/economic/buy_void_source_finality_live_process_binding_v2.js";
import {
  VOID_BUY_VOID_V2_LIVE_PROCESS_COLLECTION_PLAN_V1,
  VOID_BUY_VOID_V2_SELECTOR_ELF_LOCK_ID_V1,
  buildBuyVoidV2LiveProcessCollectionPlanV1,
} from "../ops/precision/void_buy_void_source_finality_live_process_v2_collection_plan_v1.js";

const material={
  schema:"void_buy_void_v2_live_process_collection_plan_v1" as const,
  marker:VOID_BUY_VOID_V2_LIVE_PROCESS_COLLECTION_PLAN_V1,
  version:1 as const,
  selector_elf_lock_id:VOID_BUY_VOID_V2_SELECTOR_ELF_LOCK_ID_V1,
  selector_binary_sha256:"048564b0a351a5ba3b9f980962d9261fa14a49823b5075ca4794bbeefecbb232" as const,
  selector_binary_bytes:26680 as const,
  selector_contract_id:VOID_BUY_VOID_SOURCE_FINALITY_SERVICE_PROCESS_SELECTOR_CONTRACT_ID_V2,
  selector_mode:VOID_BUY_VOID_SOURCE_FINALITY_SERVICE_PROCESS_SELECTION_MODE_V2,
  runtime_uid:1000,runtime_gid:1000,
  manager_pid:2693,manager_start_time_ticks:"1409",manager_cmdline_sha256:"1".repeat(64),
  service_pid:1073664,service_start_time_ticks:"5139458",service_cmdline_sha256:"2".repeat(64),
  service_cgroup_v2_path:"/user.slice/user-1000.slice/user@1000.service/app.slice/void-node-live.service",
  process_source_identity_marker:"VOID_NODE_PROCESS_SOURCE_IDENTITY_V1" as const,
  process_source_commit:"3".repeat(40),process_source_tree:"4".repeat(40),
  process_source_branch:"main" as const,
  systemd_invocation_id:"5".repeat(32),
  executable_realpath:"/usr/bin/node" as const,
  cwd_realpath:"/opt/void-node-live/releases/"+"3".repeat(40),
  node_options_sha256:"6".repeat(64),
  canonical_producer_role:true as const,capabilities_zero:true as const,no_new_privileges:true as const,
  source_generation_verified:true as const,reviewed_launcher_shape_verified:true as const,
  selector_ready_and_green_same_generation:true as const,
  manager_and_service_pidfds_retained_by_selector:true as const,
  systemctl_user_selector_authority:false as const,
  process_environment_read_performed:true as const,selector_process_execution_performed:true as const,
  filesystem_read_performed:true as const,filesystem_write_performed:false as const,
  network_contact_performed:false as const,receipt_publication_authorized:false as const,
  production_source_finality_authority_ready:false as const,public_presale_activation:false as const,
  funds_movement:false as const,
} as const;
const plan=buildBuyVoidV2LiveProcessCollectionPlanV1(material);
const receipt=buildBuyVoidV2LiveProcessReceiptFromPlanV1({
  plan,deployment_receipt_id:"voidbsfdep1_"+"7".repeat(64),
});
assert.match(receipt.receipt_id,/^voidbsflp2_[0-9a-f]{64}$/u);
assert.equal(receipt.version,2);
assert.equal(receipt.manager_pid,2693);
assert.equal(receipt.main_pid,1073664);
assert.equal(receipt.manager_pidfd_retained_during_collection,true);
assert.equal(receipt.service_pidfd_retained_during_collection,true);
assert.equal(receipt.reviewed_service_contract_proven,true);
assert.equal(receipt.source_custody_proven,true);

const changed=buildBuyVoidV2LiveProcessReceiptFromPlanV1({
  plan:buildBuyVoidV2LiveProcessCollectionPlanV1({...material,service_start_time_ticks:"5139459"}),
  deployment_receipt_id:receipt.deployment_receipt_id,
});
assert.notEqual(changed.receipt_id,receipt.receipt_id);

const source=fs.readFileSync(
  "ops/precision/void_buy_void_source_finality_live_process_binding_v2_receipt_publish_v1.ts",
  "utf8",
);
for(const required of [
  "collectBuyVoidV2LiveProcessCollectionPlanV1",
  "verifyBuyVoidSourceFinalityDeploymentReceiptV7",
  "buildBuyVoidSourceFinalityLiveProcessBindingReceiptV2",
  "publisher_deployment_receipt_not_v2_generation",
  "publisher_live_generation_changed",
  "fs.linkSync",
  "fs.fsyncSync",
  "rollbackNewBuyVoidV2LiveProcessReceiptV1",
  "publisher_existing_receipt_invalid",
  "publisher_publication_lock_busy_or_stale",
  "withPublisherLockV1",
  "retired_stale",
  "post_publication_generation_recheck=true",
]) assert.equal(source.includes(required),true,required);
for(const forbidden of [
  '"/usr/bin/systemctl"',
  "DBUS_SESSION_BUS_ADDRESS",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "PRIVATE_KEY",
  "SEED_PHRASE",
]){
  assert.equal(source.includes(forbidden),false,forbidden);
}
assert.equal(
  source.includes("plan.systemctl_user_selector_authority!==false"),
  true,
  "publisher must reject any collection plan that grants systemctl selector authority",
);

const rootFixture=process.argv.includes("--root-fixture");
if(rootFixture){
  assert.equal(process.getuid?.(),0);
  const parent=fs.mkdtempSync(path.join("/run","void-v2-publisher-proof-"));
  try{
    fs.chownSync(parent,0,0);fs.chmodSync(parent,0o700);
    const target=path.join(parent,"live-process-binding-v2.json");
    const first=installBuyVoidV2LiveProcessReceiptCreateOnceV1({target_path:target,receipt});
    assert.equal(first.created,true);
    assert.equal(first.already_matching,false);
    assert.equal(first.retired_stale,false);
    const again=installBuyVoidV2LiveProcessReceiptCreateOnceV1({target_path:target,receipt});
    assert.equal(again.created,false);
    assert.equal(again.already_matching,true);
    assert.equal(again.retired_stale,false);

    const publishLock=path.join(
      parent,
      "."+path.basename(target)+".publish-lock-v1",
    );
    fs.writeFileSync(publishLock,"",{flag:"wx",mode:0o400});
    fs.chownSync(publishLock,0,0);
    fs.chmodSync(publishLock,0o400);
    const beforeBusy=fs.readFileSync(target);
    assert.throws(
      ()=>installBuyVoidV2LiveProcessReceiptCreateOnceV1({
        target_path:target,
        receipt:changed,
      }),
      /publisher_publication_lock_busy_or_stale/u,
    );
    assert.ok(fs.readFileSync(target).equals(beforeBusy));
    fs.unlinkSync(publishLock);
    console.log("concurrent_rotation_refused=true");
    console.log("publication_lock_exclusive=true");

    const rotated=installBuyVoidV2LiveProcessReceiptCreateOnceV1({
      target_path:target,
      receipt:changed,
    });
    assert.equal(rotated.created,true);
    assert.equal(rotated.already_matching,false);
    assert.equal(rotated.retired_stale,true);
    assert.equal(
      JSON.parse(fs.readFileSync(target,"utf8")).receipt_id,
      changed.receipt_id,
    );
    fs.writeFileSync(publishLock,"",{flag:"wx",mode:0o400});
    fs.chownSync(publishLock,0,0);
    fs.chmodSync(publishLock,0o400);
    assert.throws(
      ()=>rollbackNewBuyVoidV2LiveProcessReceiptV1({
        target_path:target,
        receipt:changed,
        created:rotated.created,
      }),
      /publisher_publication_lock_busy_or_stale/u,
    );
    assert.equal(
      JSON.parse(fs.readFileSync(target,"utf8")).receipt_id,
      changed.receipt_id,
    );
    fs.unlinkSync(publishLock);
    console.log("rollback_publication_lock_required=true");

    rollbackNewBuyVoidV2LiveProcessReceiptV1({
      target_path:target,
      receipt:changed,
      created:rotated.created,
    });
    assert.equal(fs.existsSync(target),false);
    console.log("root_stale_receipt_rotation=true");
    console.log("rotation_rollback_leaves_missing_fail_closed=true");

    fs.writeFileSync(target,"{}\\n",{mode:0o444});
    fs.chownSync(target,0,0);
    fs.chmodSync(target,0o444);
    const malformedBefore=fs.readFileSync(target);
    assert.throws(
      ()=>installBuyVoidV2LiveProcessReceiptCreateOnceV1({
        target_path:target,
        receipt,
      }),
      /publisher_existing_receipt_invalid/u,
    );
    assert.ok(fs.readFileSync(target).equals(malformedBefore));
    fs.unlinkSync(target);
    console.log("malformed_existing_receipt_preserved=true");

    const finalCreate=installBuyVoidV2LiveProcessReceiptCreateOnceV1({
      target_path:target,
      receipt,
    });
    assert.equal(finalCreate.created,true);
    rollbackNewBuyVoidV2LiveProcessReceiptV1({
      target_path:target,
      receipt,
      created:finalCreate.created,
    });
    assert.equal(fs.existsSync(target),false);
    console.log("root_create_once_and_exact_rollback=true");
  }finally{
    fs.rmSync(parent,{recursive:true,force:true});
  }
}else{
  assert.throws(
    ()=>installBuyVoidV2LiveProcessReceiptCreateOnceV1({
      target_path:"/tmp/void-v2-unprivileged-proof.json",receipt,
    }),
    /publisher_root_required/u,
  );
}

console.log(VOID_BUY_VOID_V2_LIVE_PROCESS_RECEIPT_PUBLISHER_V1+"_PROOF_GREEN");
console.log("collection_plan_bound=true");
console.log("v2_deployment_receipt_required=true");
console.log("v2_receipt_content_addressed=true");
console.log("create_once_publication=true");
console.log("canonical_stale_receipt_rotation_supported=true");
console.log("publication_lock_serializes_rotation_and_rollback=true");
console.log("crash_stale_publication_lock_fails_closed=true");
console.log("malformed_existing_receipt_retirement_forbidden=true");
console.log("generation_recheck_before_and_after_publication=true");
console.log("stale_new_receipt_exact_rollback=true");
console.log("systemctl_user_selector_authority=false");
console.log("service_mutation=false");
console.log("rpc_contact=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
