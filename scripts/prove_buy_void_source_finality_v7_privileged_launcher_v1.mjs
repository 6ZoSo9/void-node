#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const MARKER="VOID_BUY_VOID_SOURCE_FINALITY_V7_PROTECTED_PRIVILEGED_LAUNCHER_V1";
const ROOT=process.cwd();
const LAUNCHER="ops/precision/void_buy_void_source_finality_v7_privileged_launcher_v1.sh";
const launcher=fs.readFileSync(LAUNCHER,"utf8");

for(const required of [
  'GIT="/usr/bin/git"',
  'NODE="/usr/bin/node"',
  'SETPRIV="/usr/bin/setpriv"',
  "GIT_CONFIG_NOSYSTEM=1",
  "GIT_NO_REPLACE_OBJECTS=1",
  "GIT_OPTIONAL_LOCKS=0",
  "--clear-groups",
  "--no-new-privs",
  "canonical-producer-source-custody-v1.cjs",
  "source_branch_not_main",
  "source_tree_dirty",
  "deployment)",
  "provider-pair)",
  "live-process)",
  "env -i",
  "ambient_git_environment_inherited=false",
  "ambient_node_environment_inherited=false",
  "funds_movement_by_launcher=false",
]) assert.equal(launcher.includes(required),true,required);

for(const forbidden of [
  /\beval\b/u,
  /\bsource\s/u,
  /bash\s+-c/u,
  /\bsudo\b/u,
  /\bcurl\b/u,
  /\bwget\b/u,
  /eth_sendRawTransaction/u,
  /eth_sendTransaction/u,
]) assert.doesNotMatch(launcher,forbidden);

const syntax=spawnSync("/usr/bin/bash",["-n",LAUNCHER],{
  cwd:ROOT,encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:5000,
});
assert.equal(syntax.status,0,syntax.stderr);

function run(command,args,{allow=false,env=process.env}={}){
  const p=spawnSync(command,args,{encoding:"utf8",stdio:["ignore","pipe","pipe"],
    timeout:30000,maxBuffer:1024*1024,env});
  if(!allow)assert.equal(p.status,0,p.stderr);
  return p;
}
function sudo(args,{allow=false,env=process.env}={}){
  return run("/usr/bin/sudo",["-n",...args],{allow,env});
}
function git(cwd,...args){
  return run("/usr/bin/git",["-C",cwd,...args]).stdout.trim();
}

assert.notEqual(process.getuid?.(),0,"proof runner must be unprivileged");
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"void-v7-protected-launcher-src-"));
const fixture="/var/lib/void-v7-protected-launcher-proof-"+
  String(process.pid)+"-"+String(process.getuid());
const runtimeUid=String(process.getuid());
const runtimeGid=String(process.getgid());

const dirs=[
  "src","ops","ops/precision","runtime","node_modules","node_modules/tsx",
  "node_modules/tsx/dist","ops/security",
];
const files=[
  "src/index.ts",
  "ops/run-void-node-live-v1.sh",
  "runtime/canonical-producer-self-http-guard-v1.cjs",
  "runtime/canonical-producer-self-http-guard-v2.cjs",
  "runtime/canonical-producer-self-http-guard-v3.cjs",
  "node_modules/tsx/dist/preflight.cjs",
  "node_modules/tsx/dist/loader.mjs",
  "node_modules/tsx/dist/cli.mjs",
  "ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts",
  "ops/precision/void_buy_void_source_finality_provider_pair_binding_receipt_install_v1.ts",
  "ops/precision/void_buy_void_source_finality_live_process_binding_receipt_install_v1.ts",
  "ops/security/buy-void-enforcement-post2933-lock-v2.json",
];

function launcherArgs(commit,tree){
  return [
    path.join(fixture,LAUNCHER),
    "--qualify-only",
    "--runtime-uid",runtimeUid,
    "--runtime-gid",runtimeGid,
    "--expected-commit",commit,
    "--expected-tree",tree,
  ];
}
try{
  git(tmp,"init","-b","main");
  git(tmp,"config","user.name","VOID Launcher Proof");
  git(tmp,"config","user.email","void-launcher-proof@example.invalid");
  for(const d of dirs)fs.mkdirSync(path.join(tmp,d),{recursive:true,mode:0o755});
  for(const f of files){
    fs.mkdirSync(path.dirname(path.join(tmp,f)),{recursive:true,mode:0o755});
    fs.writeFileSync(path.join(tmp,f),"reviewed fixture\n",{mode:0o644});
  }
  fs.copyFileSync("runtime/canonical-producer-source-custody-v1.cjs",
    path.join(tmp,"runtime/canonical-producer-source-custody-v1.cjs"));
  fs.copyFileSync(LAUNCHER,path.join(tmp,LAUNCHER));
  fs.chmodSync(path.join(tmp,LAUNCHER),0o755);
  git(tmp,"add","--",".");
  git(tmp,"commit","-m","protected launcher fixture");
  const commit=git(tmp,"rev-parse","HEAD");
  const tree=git(tmp,"rev-parse","HEAD^{tree}");

  sudo(["rm","-rf","--",fixture],{allow:true});
  sudo(["cp","-a","--",tmp,fixture]);
  sudo(["chown","-R","0:0",fixture]);

  const positive=sudo(launcherArgs(commit,tree));
  assert.match(positive.stdout,
    new RegExp("^"+MARKER+"$","m"));
  assert.match(positive.stdout,/root_owned_protected_source=true/u);
  assert.match(positive.stdout,/source_custody_green=true/u);
  assert.match(positive.stdout,/tool_execution=false/u);
  assert.match(positive.stdout,/host_mutation=false/u);
  assert.match(positive.stdout,/status=PROTECTED_PRIVILEGED_LAUNCHER_QUALIFICATION_GREEN/u);

  const wrong=sudo(launcherArgs("f".repeat(40),tree),{allow:true});
  assert.equal(wrong.status,2);
  assert.match(wrong.stderr,/expected_commit_mismatch/u);

  sudo(["chmod","0777",path.join(fixture,"src")]);
  const writable=sudo(launcherArgs(commit,tree),{allow:true});
  assert.equal(writable.status,2);
  assert.match(writable.stderr,/protected_source_custody_failed/u);
  sudo(["chmod","0755",path.join(fixture,"src")]);

  sudo(["sh","-c",
    "printf tamper >> "+JSON.stringify(path.join(fixture,"src/index.ts"))]);
  const dirty=sudo(launcherArgs(commit,tree),{allow:true});
  assert.equal(dirty.status,2);
  assert.match(dirty.stderr,/source_tree_dirty/u);

  const mutableCheckout=sudo([
    "/usr/bin/bash",path.join(ROOT,LAUNCHER),
    "--qualify-only",
    "--runtime-uid",runtimeUid,
    "--runtime-gid",runtimeGid,
    "--expected-commit",git(ROOT,"rev-parse","HEAD"),
    "--expected-tree",git(ROOT,"rev-parse","HEAD^{tree}"),
  ],{allow:true});
  assert.equal(mutableCheckout.status,2);
  assert.match(mutableCheckout.stderr,/protected_source_custody_failed/u);

  const fake=path.join(tmp,"fake-bin");
  fs.mkdirSync(fake);
  const sentinel=path.join(tmp,"fake-git-used");
  fs.writeFileSync(path.join(fake,"git"),
    "#!/bin/sh\nprintf x > "+JSON.stringify(sentinel)+"\nexit 99\n",
    {mode:0o755});
  const hostileEnv={...process.env,PATH:fake};
  const wrongAgain=sudo(launcherArgs("e".repeat(40),tree),{allow:true,env:hostileEnv});
  assert.equal(wrongAgain.status,2);
  assert.equal(fs.existsSync(sentinel),false,"ambient PATH git shim must not execute");

  console.log(MARKER+"_PROOF_GREEN");
  console.log("protected_root_owned_source_positive=true");
  console.log("writable_checkout_rejected=true");
  console.log("dirty_protected_tree_rejected=true");
  console.log("wrong_commit_rejected=true");
  console.log("ambient_path_git_shim_blocked=true");
  console.log("tool_allowlist_exact=true");
  console.log("privileged_tool_execution_performed=false");
  console.log("service_mutation=false");
  console.log("credential_wallet_signer_transaction_authority=false");
  console.log("presale_activation=false");
  console.log("funds_movement=false");
} finally {
  sudo(["rm","-rf","--",fixture],{allow:true});
  fs.rmSync(tmp,{recursive:true,force:true});
}
