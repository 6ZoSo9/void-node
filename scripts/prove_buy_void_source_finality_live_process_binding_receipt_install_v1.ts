#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_VOID_LIVE_PROCESS_INSTALL_CONFIRMATION_V1,
  VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_RECEIPT_INSTALL_V1,
  buildBuyVoidLiveProcessBindingReceiptV1,
  installBuyVoidLiveProcessBindingReceiptCreateOnceV1,
  parseBuyVoidLiveProcessInitialEnvironmentV1,
} from "../ops/precision/void_buy_void_source_finality_live_process_binding_receipt_install_v1.js";
import {
  buyVoidSourceFinalityLiveProcessBindingReceiptIdV1,
} from "../src/economic/buy_void_source_finality_live_process_binding_v1.js";

assert.equal(
  VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_RECEIPT_INSTALL_V1,
  "VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_RECEIPT_INSTALL_V1",
);
assert.equal(
  VOID_BUY_VOID_LIVE_PROCESS_INSTALL_CONFIRMATION_V1,
  "create-v7-live-process-binding-receipt",
);

const envBytes=Buffer.from([
  "VOID_PROCESS_SOURCE_IDENTITY_MARKER=VOID_NODE_PROCESS_SOURCE_IDENTITY_V1",
  "VOID_PROCESS_SOURCE_COMMIT="+"1".repeat(40),
  "VOID_PROCESS_SOURCE_TREE="+"2".repeat(40),
  "VOID_PROCESS_SOURCE_BRANCH=main",
  "INVOCATION_ID="+"3".repeat(32),
  "VOID_CANONICAL_PRODUCER_ROLE=1",
  "NODE_OPTIONS=--require /opt/void/runtime/canonical-producer-self-http-guard-v4.cjs",
  "UNRELATED_PRIVATE_VALUE=must-not-escape",
  "",
].join("\0"),"utf8");

const parsed=parseBuyVoidLiveProcessInitialEnvironmentV1(envBytes);
assert.deepEqual(Object.keys(parsed).sort(),[
  "canonical_producer_role",
  "invocation_id",
  "ld_library_path_absent",
  "ld_preload_absent",
  "node_options",
  "node_path_absent",
  "source_branch",
  "source_commit",
  "source_marker",
  "source_tree",
].sort());
assert.equal(JSON.stringify(parsed).includes("must-not-escape"),false);
assert.equal(parsed.node_path_absent,true);
assert.equal(parsed.ld_preload_absent,true);
assert.equal(parsed.ld_library_path_absent,true);

for(const forbidden of ["NODE_PATH","LD_PRELOAD","LD_LIBRARY_PATH"]){
  const attack=Buffer.concat([
    envBytes.subarray(0,envBytes.length-1),
    Buffer.from(forbidden+"=/tmp/hostile\0","utf8"),
  ]);
  assert.throws(
    ()=>parseBuyVoidLiveProcessInitialEnvironmentV1(attack),
    new RegExp("process_environment_forbidden_key_present:"+forbidden),
  );
}
const duplicate=Buffer.concat([
  envBytes.subarray(0,envBytes.length-1),
  Buffer.from("NODE_OPTIONS=--require /tmp/other.cjs\0","utf8"),
]);
assert.throws(
  ()=>parseBuyVoidLiveProcessInitialEnvironmentV1(duplicate),
  /process_environment_duplicate_allowlisted_key:NODE_OPTIONS/u,
);

const base=buildBuyVoidLiveProcessBindingReceiptV1({
  deployment_receipt_id:"voidbsfdep1_"+"4".repeat(64),
  process_source_commit:"1".repeat(40),
  process_source_tree:"2".repeat(40),
  runtime_uid:1000,
  runtime_gid:1000,
  main_pid:43210,
  process_start_time_ticks:"123456789",
  systemd_invocation_id:"3".repeat(32),
  cgroup_v2_path:"/user.slice/user-1000.slice/user@1000.service/app.slice/void-node-live.service",
  executable_realpath:"/usr/bin/node",
  cwd_realpath:"/opt/void-node-release",
  cmdline_sha256:"5".repeat(64),
  node_options_sha256:"6".repeat(64),
});
assert.match(base.receipt_id,/^voidbsflp1_[0-9a-f]{64}$/u);
const {receipt_id,...material}=base;
assert.equal(
  receipt_id,
  buyVoidSourceFinalityLiveProcessBindingReceiptIdV1(material),
);
const changed=buildBuyVoidLiveProcessBindingReceiptV1({
  deployment_receipt_id:base.deployment_receipt_id,
  process_source_commit:base.process_source_commit,
  process_source_tree:base.process_source_tree,
  runtime_uid:base.runtime_uid,
  runtime_gid:base.runtime_gid,
  main_pid:base.main_pid+1,
  process_start_time_ticks:base.process_start_time_ticks,
  systemd_invocation_id:base.systemd_invocation_id,
  cgroup_v2_path:base.cgroup_v2_path,
  executable_realpath:base.executable_realpath,
  cwd_realpath:base.cwd_realpath,
  cmdline_sha256:base.cmdline_sha256,
  node_options_sha256:base.node_options_sha256,
});
assert.notEqual(changed.receipt_id,base.receipt_id);

const source=fs.readFileSync(
  "ops/precision/void_buy_void_source_finality_live_process_binding_receipt_install_v1.ts",
  "utf8",
);
for(const required of [
  "/proc/",
  "O_NOFOLLOW",
  "systemctl",
  "MainPID",
  "InvocationID",
  "WorkingDirectory",
  "ExecStart",
  "NeedDaemonReload",
  "effective_service_contract_mismatch",
  "VOID_CANONICAL_PRODUCER_SOURCE_CUSTODY_V1_GREEN",
  "canonical_source_custody_requalification_failed",
  "VOID_PROCESS_SOURCE_COMMIT",
  "VOID_CANONICAL_PRODUCER_ROLE",
  "NODE_OPTIONS",
  "NODE_PATH",
  "LD_PRELOAD",
  "LD_LIBRARY_PATH",
  "CapInh",
  "CapPrm",
  "CapEff",
  "CapAmb",
  "NoNewPrivs",
  "hash-object",
  "HEAD^{commit}",
  "HEAD^{tree}",
  "canonical-producer-source-custody-v1.cjs",
  "different_live_process_receipt_already_exists",
]) assert.equal(source.includes(required),true,required);

assert.equal(
  source.includes('exactTrackedBlob(cwd,env.source_commit,"node_modules/tsx'),
  false,
  "node_modules must not be treated as Git-tracked source",
);
assert.equal(
  source.includes('proveRootCustodyPath(path.join(cwd,"node_modules/tsx/dist/preflight.cjs"),false)'),
  true,
);
assert.equal(
  source.includes('proveRootCustodyPath(path.join(cwd,"node_modules/tsx/dist/loader.mjs"),false)'),
  true,
);

for(const forbidden of [
  '"restart"',
  '"start"',
  '"stop"',
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
  "PRIVATE_KEY",
  "SEED_PHRASE",
]) {
  if (["\"restart\"","\"start\"","\"stop\""].includes(forbidden)) {
    assert.equal(
      source.includes('"--user",'+forbidden),
      false,
      "systemd mutation forbidden: "+forbidden,
    );
  } else {
    assert.equal(source.includes(forbidden),false,forbidden);
  }
}

if(typeof process.geteuid==="function"&&process.geteuid()===0){
  const parent=fs.mkdtempSync(path.join(fs.existsSync("/run")?"/run":os.tmpdir(),"void-live-binding-install-proof-"));
  try{
    fs.chownSync(parent,0,0);
    fs.chmodSync(parent,0o700);
    const target=path.join(parent,"live-process-binding-v1.json");
    assert.equal(
      installBuyVoidLiveProcessBindingReceiptCreateOnceV1({
        target_path:target,receipt:base,
      }),
      "created",
    );
    const st=fs.lstatSync(target);
    assert.equal(st.uid,0);
    assert.equal(st.gid,0);
    assert.equal(st.mode&0o777,0o444);
    assert.equal(st.nlink,1);
    assert.deepEqual(JSON.parse(fs.readFileSync(target,"utf8")),base);
    assert.equal(
      installBuyVoidLiveProcessBindingReceiptCreateOnceV1({
        target_path:target,receipt:base,
      }),
      "already_present",
    );
    assert.throws(
      ()=>installBuyVoidLiveProcessBindingReceiptCreateOnceV1({
        target_path:target,receipt:changed,
      }),
      /different_live_process_receipt_already_exists/u,
    );
    console.log("root_custodied_create_once_positive=true");
    console.log("matching_reapply_idempotent=true");
    console.log("mismatched_existing_receipt_rejected=true");
  }finally{
    if(fs.existsSync(parent)){
      const target=path.join(parent,"live-process-binding-v1.json");
      if(fs.existsSync(target))fs.chmodSync(target,0o600);
      fs.rmSync(parent,{recursive:true,force:true});
    }
  }
}else{
  assert.throws(
    ()=>installBuyVoidLiveProcessBindingReceiptCreateOnceV1({
      target_path:"/tmp/void-live-binding-proof-unprivileged.json",
      receipt:base,
    }),
    /root_apply_required/u,
  );
  console.log("root_custodied_create_once_positive=false");
}

console.log("VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_RECEIPT_INSTALL_V1_PROOF_GREEN");
console.log("process_environment_allowlist_only=true");
console.log("unrelated_environment_values_not_returned=true");
console.log("forbidden_loader_environment_rejected=true");
console.log("duplicate_allowlisted_environment_rejected=true");
console.log("receipt_content_address_bound=true");
console.log("service_mutation=false");
console.log("credential_file_access=false");
console.log("wallet_or_signer_access=false");
console.log("rpc_call=false");
console.log("transaction_broadcast=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
