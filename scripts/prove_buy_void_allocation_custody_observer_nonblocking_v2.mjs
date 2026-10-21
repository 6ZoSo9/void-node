#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_V2,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_AUTHORITY_V2,
  testOnlyReadPinnedFileV2,
} from "../tools/void-buy-allocation-custody-witness-live-read-replay-installation-evidence-v2.mjs";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_V2,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_AUTHORITY_V2,
  testOnlyReadRootOwnedPolicyFileV2,
} from "../tools/void-buy-allocation-custody-witness-live-read-replay-rollback-policy-evidence-v2.mjs";

const SELF=fileURLToPath(import.meta.url);
const V1_INSTALLATION_BLOB="c0c86bc1687fc9a3cb9313b5a68029c35c6a9a63";
const V1_ROLLBACK_BLOB="cf40d9d4a19d138d74aee849a6c02f96ee362dbb";
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+String(bytes.length)+"\0","utf8"))
    .update(bytes).digest("hex");
}
function fifo(pathname, mode){
  execFileSync("/usr/bin/mkfifo",[pathname],{stdio:"ignore"});
  fs.chmodSync(pathname,mode);
}
function installationChild(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"void-observer-v2-install-"));
  fs.chmodSync(root,0o700);
  const name="journal.json";
  const visible=path.join(root,name);
  try{
    fs.writeFileSync(visible,"x\n",{mode:0o600});
    assert.throws(
      ()=>testOnlyReadPinnedFileV2({
        root_path:root,name,max_bytes:1024,allow_empty:false,
        before_open:({visible_path})=>{
          fs.renameSync(visible_path,visible_path+".original");
          fifo(visible_path,0o600);
        },
      }),
      /witness_replay_installation_evidence_test_file_invalid/u,
    );
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}
function policyChild(){
  assert.equal(process.getuid?.(),0,"policy FIFO fixture requires root");
  const root=fs.mkdtempSync("/root/void-observer-v2-policy-");
  fs.chmodSync(root,0o700);
  const policy=path.join(root,"policy.json");
  try{
    fs.writeFileSync(policy,"{}\n",{mode:0o444});
    fs.chownSync(policy,0,0);
    fs.chmodSync(policy,0o444);
    assert.throws(
      ()=>testOnlyReadRootOwnedPolicyFileV2({
        policy_path:policy,
        before_open:({policy_path})=>{
          fs.renameSync(policy_path,policy_path+".original");
          fifo(policy_path,0o444);
        },
      }),
      /witness_replay_rollback_policy_evidence_policy_file_changed/u,
    );
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}
if(process.argv[2]==="--fifo-installation-child"){installationChild();process.exit(0);}
if(process.argv[2]==="--fifo-policy-child"){policyChild();process.exit(0);}

assert.equal(gitBlob(fs.readFileSync("tools/void-buy-allocation-custody-witness-live-read-replay-installation-evidence-v1.mjs")),V1_INSTALLATION_BLOB);
assert.equal(gitBlob(fs.readFileSync("tools/void-buy-allocation-custody-witness-live-read-replay-rollback-policy-evidence-v1.mjs")),V1_ROLLBACK_BLOB);

const installSource=fs.readFileSync("tools/void-buy-allocation-custody-witness-live-read-replay-installation-evidence-v2.mjs","utf8");
const rollbackSource=fs.readFileSync("tools/void-buy-allocation-custody-witness-live-read-replay-rollback-policy-evidence-v2.mjs","utf8");
assert.match(installSource,/O_RDONLY \| O_NOFOLLOW \| O_NONBLOCK/u);
assert.match(rollbackSource,/O_RDONLY \| O_NOFOLLOW \| O_NONBLOCK/u);
assert.match(rollbackSource,/installation-evidence-v2[.]mjs/u);
assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_V2,
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_V2",
);
assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_V2,
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_V2",
);
assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_AUTHORITY_V2.nonblocking_regular_file_open_required,
  true,
);
assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_AUTHORITY_V2.transitive_installation_observer_v2_required,
  true,
);
for(const mode of ["--fifo-installation-child","--fifo-policy-child"]){
  const child=spawnSync(process.execPath,[SELF,mode],{
    encoding:"utf8",
    timeout:3000,
    env:{...process.env,HOME:"/root"},
  });
  assert.equal(child.error?.code,undefined,mode+" timed out or failed to spawn");
  assert.equal(child.signal,null,mode+" signal");
  assert.equal(child.status,0,mode+" stderr="+child.stderr);
}
for(const authority of [
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_AUTHORITY_V2,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_AUTHORITY_V2,
]){
  assert.equal(authority.filesystem_write,false);
  assert.equal(authority.storage_bootstrap,false);
  assert.equal(authority.runtime_integration,false);
  assert.equal(authority.production_gate_ready,false);
  assert.equal(authority.funds_movement,false);
}
console.log("VOID_BUY_VOID_ALLOCATION_CUSTODY_OBSERVER_NONBLOCKING_V2_PROOF_GREEN");
console.log("historical_v1_observer_blobs_unchanged=true");
console.log("installation_regular_file_open_nonblocking=true");
console.log("rollback_policy_regular_file_open_nonblocking=true");
console.log("rollback_policy_uses_installation_observer_v2=true");
console.log("fifo_swap_fixtures_timeout_bounded=true");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
