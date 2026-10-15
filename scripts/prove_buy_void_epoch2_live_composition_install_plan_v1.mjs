#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  MARKER,
  LOCK_REL,
  LOCK_BLOB,
  LOCK_ID,
  RUNNER_REL,
  RUNNER_BLOB,
  RUNNER_SHA256,
  RUNNER_BYTES,
  NATIVE_SHA256,
  NATIVE_BYTES,
  INSTALL_ROOT,
  FIXED_NATIVE,
  FIXED_RUNNER,
  FIXED_POLICY,
  FIXED_NODE,
  POLICY_SCHEMA,
  acceptedLock,
  inspectNativeCandidate,
  inspectRunner,
  buildPolicy,
  buildInstallPlan,
  canonical,
  sha256,
} from "../ops/precision/void_buy_void_epoch2_live_composition_install_plan_v1.mjs";

const ROOT=process.cwd();
const PLAN_SOURCE=
  "ops/precision/void_buy_void_epoch2_live_composition_install_plan_v1.mjs";
const PLAN_SOURCE_BLOB="966dfd11718266140c222aa92c1ba9f2192fa35c";
const LOCK_PARENT="4d588626386a4409b04d534af8fa24e4e88ce62b";
const NATIVE_SOURCE=
  "ops/precision/void_buy_void_epoch2_live_composition_native_preentry_v1.c";
const CC="/usr/bin/cc";
const STRIP="/usr/bin/strip";

function run(command,args,options={}){
  return spawnSync(command,args,{
    cwd:options.cwd||ROOT,
    env:options.env||{
      PATH:"/usr/bin:/bin",
      HOME:String(process.env.HOME||""),
      LANG:"C",
      LC_ALL:"C",
      SOURCE_DATE_EPOCH:"0",
    },
    encoding:"utf8",
    timeout:options.timeout||60_000,
    maxBuffer:2*1024*1024,
  });
}

function git(args){
  const r=run("/usr/bin/git",[
    "-c","core.fsmonitor=false",
    "-c","core.hooksPath=/dev/null",
    ...args,
  ],{
    env:{
      PATH:"/usr/bin:/bin",
      HOME:String(process.env.HOME||""),
      LANG:"C",
      LC_ALL:"C",
      GIT_OPTIONAL_LOCKS:"0",
      GIT_NO_REPLACE_OBJECTS:"1",
      GIT_CONFIG_NOSYSTEM:"1",
      GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",
    },
  });
  assert.equal(r.status,0,r.stderr);
  return r.stdout.trim();
}

assert.equal(git(["status","--porcelain=v1"]),"");
assert.equal(git(["rev-parse","HEAD:"+PLAN_SOURCE]),PLAN_SOURCE_BLOB);
assert.equal(git(["rev-parse","HEAD:"+LOCK_REL]),LOCK_BLOB);
assert.equal(git(["rev-parse","HEAD:"+RUNNER_REL]),RUNNER_BLOB);
assert.equal(run("/usr/bin/git",["merge-base","--is-ancestor",LOCK_PARENT,"HEAD"]).status,0);

const source=fs.readFileSync(PLAN_SOURCE,"utf8");
for(const forbidden of [
  "writeFileSync(",
  "appendFileSync(",
  "renameSync(",
  "mkdirSync(",
  "chmodSync(",
  "chownSync(",
  "unlinkSync(",
  "rmSync(",
]){
  assert.equal(source.includes(forbidden),false,"plan compiler write primitive: "+forbidden);
}
for(const required of [
  'export const FIXED_NODE = "/usr/bin/node"',
  "O_RDONLY|noFollow",
  "pinned_file_changed_after_read",
  "accepted_lock_blob_mismatch",
  "repository_branch_not_main",
  "repository_not_clean",
  "native_candidate_source_path",
  "policy_sha256",
  "protected_install_authorized:false",
  "protected_install_performed:false",
  "filesystem_write:false",
]){
  assert.equal(source.includes(required),true,"missing plan source contract: "+required);
}

const lock=acceptedLock(ROOT);
assert.equal(lock.lock_id,LOCK_ID);
assert.equal(lock.candidate_accepted,true);
assert.equal(lock.install_authorized,false);
assert.equal(lock.live_execution_authorized,false);

const runner=inspectRunner(ROOT);
assert.equal(runner.sha256,RUNNER_SHA256);
assert.equal(runner.size,RUNNER_BYTES);

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"void-e2-install-plan-v1-"));
try{
  const native=path.join(temp,"epoch2-native");
  const compile=run(CC,[
    "-std=c11","-Wall","-Wextra","-Werror","-O2","-fno-ident",
    "-static","-fno-pie","-no-pie","-Wl,--build-id=none",
    "-o",native,NATIVE_SOURCE,
  ]);
  assert.equal(compile.status,0,compile.stderr);
  const strip=run(STRIP,["--strip-all",native]);
  assert.equal(strip.status,0,strip.stderr);

  const candidate=inspectNativeCandidate(native);
  assert.equal(candidate.sha256,NATIVE_SHA256);
  assert.equal(candidate.size,NATIVE_BYTES);
  assert.equal(candidate.path,native);

  const node={
    sha256:"a".repeat(64),
    size:1234567,
  };
  const expectedHead="b".repeat(40);
  const plan=buildInstallPlan({expectedHead,native:candidate,node});
  assert.match(plan.plan_id,/^voide2installplan1_[0-9a-f]{64}$/u);
  assert.equal(plan.expected_repository_head,expectedHead);
  assert.equal(plan.accepted_lock_id,LOCK_ID);
  assert.equal(plan.accepted_lock_git_blob_sha1,LOCK_BLOB);
  assert.equal(plan.install_root,INSTALL_ROOT);
  assert.equal(plan.native_target,FIXED_NATIVE);
  assert.equal(plan.native_sha256,NATIVE_SHA256);
  assert.equal(plan.native_bytes,NATIVE_BYTES);
  assert.equal(plan.native_mode,"0555");
  assert.equal(plan.runner_target,FIXED_RUNNER);
  assert.equal(plan.runner_git_blob_sha1,RUNNER_BLOB);
  assert.equal(plan.runner_sha256,RUNNER_SHA256);
  assert.equal(plan.runner_bytes,RUNNER_BYTES);
  assert.equal(plan.runner_mode,"0444");
  assert.equal(plan.policy_target,FIXED_POLICY);
  assert.equal(plan.policy_schema,POLICY_SCHEMA);
  assert.equal(plan.policy_mode,"0444");
  assert.equal(plan.node_path,FIXED_NODE);
  assert.equal(plan.node_sha256,node.sha256);
  assert.equal(plan.node_bytes,node.size);
  assert.equal(plan.native_candidate_source_path,native);
  assert.equal(plan.native_candidate_dev,candidate.dev);
  assert.equal(plan.native_candidate_ino,candidate.ino);

  const policy=buildPolicy({
    expectedHead,
    nodeSha256:node.sha256,
    nodeBytes:node.size,
  });
  assert.equal(plan.policy_text,policy);
  assert.equal(plan.policy_sha256,sha256(Buffer.from(policy,"utf8")));
  assert.equal(plan.policy_bytes,Buffer.byteLength(policy,"utf8"));

  const body={...plan};
  delete body.plan_id;
  delete body.policy_text;
  assert.equal(
    plan.plan_id,
    "voide2installplan1_"+sha256(Buffer.from(canonical(body),"utf8")),
  );

  for(const field of [
    "filesystem_write",
    "protected_install_authorized",
    "protected_install_performed",
    "live_execution_authorized",
    "credential_access",
    "private_key_access",
    "signing",
    "transaction",
    "rpc_call",
    "payment_acceptance",
    "public_presale_activation",
    "wc_void_market_activation",
    "funds_movement",
  ]){
    assert.equal(plan[field],false,field);
  }

  assert.throws(
    ()=>buildInstallPlan({
      expectedHead,
      native:{...candidate,sha256:"0".repeat(64)},
      node,
    }),
    /native_plan_identity_invalid/u,
  );
  assert.throws(
    ()=>buildInstallPlan({
      expectedHead,
      native:candidate,
      node:{sha256:"not-a-digest",size:node.size},
    }),
    /node_plan_identity_invalid/u,
  );

  const self=run(process.execPath,[PLAN_SOURCE,"--self-test"]);
  assert.equal(self.status,0,self.stderr);
  assert.match(self.stdout,new RegExp(MARKER+"_SELF_TEST_GREEN","u"));

  const featurePlan=run(process.execPath,[
    PLAN_SOURCE,
    "--plan",
    "--native-candidate",
    native,
  ]);
  assert.equal(featurePlan.status,2);
  assert.match(
    featurePlan.stderr,
    /repository_branch_not_main/u,
    "feature-branch production plan must HOLD before host publication",
  );
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}

assert.equal(git(["status","--porcelain=v1"]),"");

console.log("VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_INSTALL_PLAN_V1_PROOF_GREEN");
console.log("accepted_candidate_lock_bound=true");
console.log("native_candidate_rederived=true");
console.log("runner_identity_bound=true");
console.log("native_candidate_path_generation_bound=true");
console.log("current_main_required_for_production_plan=true");
console.log("fixed_root_node_policy_identity_required=true");
console.log("policy_content_addressed=true");
console.log("plan_content_addressed=true");
console.log("plan_compiler_filesystem_write=false");
console.log("feature_branch_production_plan_holds=true");
console.log("protected_install_authorized=false");
console.log("protected_install_performed=false");
console.log("live_execution_authorized=false");
console.log("credential_access=false");
console.log("transaction=false");
console.log("public_presale_activation=false");
console.log("wc_void_market_activation=false");
console.log("funds_movement=false");
