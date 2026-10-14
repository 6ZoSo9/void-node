#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const MARKER="VOID_BUY_VOID_SOURCE_FINALITY_V7_PROTECTED_PRIVILEGED_LAUNCHER_V1";
const NATIVE_MARKER="VOID_BUY_VOID_V7_NATIVE_PREENTRY_V1";
const ROOT=process.cwd();
const LAUNCHER="ops/precision/void_buy_void_source_finality_v7_privileged_launcher_body_v2.bash";
const LEGACY_STUB="ops/precision/void_buy_void_source_finality_v7_privileged_launcher_v1.sh";
const NATIVE="ops/precision/void_buy_void_source_finality_v7_native_preentry_v1.c";
const FIXED_SOURCE_ROOT="/opt/void-buy-void-v7-reviewed-v1";
const FIXED_PREENTRY_DIR="/opt/void-buy-void-v7-preentry-v1";
const FIXED_NATIVE=FIXED_PREENTRY_DIR+"/void_buy_void_source_finality_v7_native_preentry_v1";
const FIXED_LAUNCHER=FIXED_SOURCE_ROOT+"/"+LAUNCHER;
const FIXED_LEGACY_STUB=FIXED_SOURCE_ROOT+"/"+LEGACY_STUB;
const launcher=fs.readFileSync(LAUNCHER,"utf8");
const nativeSource=fs.readFileSync(NATIVE,"utf8");

for(const required of [
  'NATIVE_PREENTRY_MARKER="VOID_BUY_VOID_V7_NATIVE_PREENTRY_V1"',
  'FIXED_SOURCE_ROOT="/opt/void-buy-void-v7-reviewed-v1"',
  'GIT="/usr/bin/git"',
  'NODE="/usr/bin/node"',
  'SETPRIV="/usr/bin/setpriv"',
  'ENV="/usr/bin/env"',
  'GREP="/usr/bin/grep"',
  'PACKAGE_RUNTIME_PROOF_REL="scripts/prove_void_buy_v7_privileged_launcher_package_runtime_v2.mjs"',
  'native_preentry_required',
  'native_preentry_descriptor_required',
  '/proc/self/fd/[0-9]*',
  'canonical-producer-source-custody-v1.cjs',
  'source_branch_not_main',
  'source_tree_dirty',
  'deployment)',
  'provider-pair)',
  'live-process-v2)',
  'void_buy_void_source_finality_live_process_binding_v2_receipt_publish_v1.ts',
  'VOID_BUY_VOID_V7_PROTECTED_DISPATCH=VOID_BUY_VOID_V7_PROTECTED_DISPATCH_V1',
  'VOID_BUY_VOID_V7_PROTECTED_NATIVE_PREENTRY="$NATIVE_PREENTRY_MARKER"',
  'VOID_BUY_VOID_V7_PROTECTED_SOURCE_ROOT="$ROOT"',
  'VOID_BUY_VOID_V7_PROTECTED_SOURCE_COMMIT="$dispatch_head"',
  'VOID_BUY_VOID_V7_PROTECTED_SOURCE_TREE="$dispatch_tree"',
  'VOID_BUY_VOID_V7_PROTECTED_TOOL_PATH="$tool_path"',
  'VOID_BUY_VOID_V7_PROTECTED_TOOL_BLOB_SHA1="$tracked_blob"',
  'protected_dispatch_head_changed',
  'protected_dispatch_tree_changed',
  'protected_dispatch_tree_dirty',
  'native_preentry_verified=true',
  'launcher_descriptor_execution=true',
  'tsx_private_materialization_verified=true',
  'tsx_inert_transform_execution_verified=true',
  'esbuild_runtime_execution_verified=true',
  'privileged_launcher_package_runtime_verified=true',
  'private_temporary_filesystem_write=true',
  'persistent_host_mutation=false',
  'funds_movement_by_launcher=false',
]) assert.equal(launcher.includes(required),true,required);

assert.equal(launcher.startsWith("#!"),false,"launcher body must be shebang-free");
assert.equal(launcher.includes("live-process)"),false,"historical V1 live-process tool must not remain allowlisted");
assert.equal(launcher.includes("live-process-v2)"),true,"V2 live-process publisher must be allowlisted");
assert.equal(launcher.includes("void_buy_void_source_finality_live_process_binding_receipt_install_v1.ts"),false,"historical V1 receipt installer must not be reachable");
assert.equal(fs.statSync(LAUNCHER).mode&0o111,0,"launcher body must not be executable");
assert.ok(
  launcher.indexOf("native_preentry_required") < launcher.indexOf('"$ID" -u'),
  "native marker must be checked before external launcher commands",
);
for(const forbidden of [
  /#!\/usr\/bin\/env bash/u,
  /\beval\b/u,
  /\bsource\s/u,
  /bash\s+-c/u,
  /\bsudo\b/u,
  /\bcurl\b/u,
  /\bwget\b/u,
  /eth_sendRawTransaction/u,
  /eth_sendTransaction/u,
  /PACKAGE_RUNTIME_LOCK_/u,
]) assert.doesNotMatch(launcher,forbidden);

for(const required of [
  '#define MARKER "VOID_BUY_VOID_V7_NATIVE_PREENTRY_V1"',
  '#define FIXED_SELF "/opt/void-buy-void-v7-preentry-v1/void_buy_void_source_finality_v7_native_preentry_v1"',
  '#define FIXED_BASH "/usr/bin/bash"',
  '#define FIXED_LAUNCHER "/opt/void-buy-void-v7-reviewed-v1/ops/precision/void_buy_void_source_finality_v7_privileged_launcher_body_v2.bash"',
  'O_RDONLY | O_NOFOLLOW',
  'fcntl(launcher_fd, F_SETFD, descriptor_flags & ~FD_CLOEXEC)',
  'fexecve(bash_fd, next_argv, envp)',
  '"--noprofile"',
  '"--norc"',
  'PREENTRY_ENV',
  '#define FIXED_LAUNCHER_BYTES 12644U',
  'FIXED_LAUNCHER_SHA256',
  'sha256_fd_matches(launcher_fd)',
  'native_preentry_launcher_digest_mismatch',
  'launcher_direct_exec_mode=false',
  'privileged_receipt_execution_authorized=false',
  'public_presale_activation=false',
  'funds_movement=false',
]) assert.equal(nativeSource.includes(required),true,"native missing "+required);
for(const forbidden of [
  'setuid(', 'seteuid(', 'setresuid(', 'chmod(', 'chown(',
  'system(', 'popen(', 'execvp(', 'execlp(', '/bin/sh',
]) assert.equal(nativeSource.includes(forbidden),false,"native forbidden "+forbidden);

const syntax=spawnSync("/usr/bin/bash",["-n",LAUNCHER],{
  cwd:ROOT,encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:5000,
});
assert.equal(syntax.status,0,syntax.stderr);

function run(command,args,{allow=false,env=process.env,timeout=30000}={}){
  const p=spawnSync(command,args,{
    encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout,
    maxBuffer:4*1024*1024,env,
  });
  assert.equal(p.error,undefined,String(p.error||""));
  if(!allow) assert.equal(p.status,0,p.stderr||p.stdout);
  return p;
}
function sudo(args,{allow=false,env=process.env,timeout=30000}={}){
  return run("/usr/bin/sudo",["-n",...args],{allow,env,timeout});
}
function git(cwd,...args){
  return run("/usr/bin/git",["-C",cwd,...args]).stdout.trim();
}
function argsFor(commit,tree){
  return [
    FIXED_NATIVE,
    "--qualify-only",
    "--runtime-uid",String(process.getuid()),
    "--runtime-gid",String(process.getgid()),
    "--expected-commit",commit,
    "--expected-tree",tree,
  ];
}

assert.notEqual(process.getuid?.(),0,"proof runner must be unprivileged");
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"void-v7-native-preentry-proof-"));
const nativeBinary=path.join(tmp,"void-buy-void-v7-native-preentry");
const systemNode="/usr/bin/node";
let installedSystemNodeFixture=false;
let originalOptMode=null;
let optModeChanged=false;
let proofCompleted=false;
let proofFailure=null;
let cleanupFailure=null;

try{
  if(!fs.existsSync(systemNode)){
    const source=fs.realpathSync.native(process.execPath);
    const st=fs.statSync(source);
    assert.equal(st.isFile(),true);
    assert.notEqual(st.mode&0o111,0);
    sudo([
      "/usr/bin/install","-o","root","-g","root","-m","0755","--",
      source,systemNode,
    ]);
    installedSystemNodeFixture=true;
  }

  run("/usr/bin/cc",[
    "-std=c11","-Wall","-Wextra","-Werror","-O2",
    "-o",nativeBinary,NATIVE,
  ]);
  const selfTest=run(nativeBinary,["--self-test"]);
  assert.match(selfTest.stdout,new RegExp("^"+NATIVE_MARKER+"_SELF_TEST=GREEN$","m"));
  assert.match(selfTest.stdout,/launcher_descriptor_retained=true/u);
  assert.match(selfTest.stdout,/launcher_direct_exec_mode=false/u);
  assert.match(selfTest.stdout,/launcher_exact_sha256_bound=true/u);

  const replica=path.join(tmp,"repo");
  run("/usr/bin/cp",["-a","--",ROOT,replica],{timeout:120000});
  git(replica,"checkout","-B","main","HEAD");
  assert.equal(git(replica,"status","--porcelain=v1","--untracked-files=all"),"");
  const commit=git(replica,"rev-parse","HEAD");
  const tree=git(replica,"rev-parse","HEAD^{tree}");

  sudo(["rm","-rf","--",FIXED_SOURCE_ROOT,FIXED_PREENTRY_DIR],{allow:true});
  const optBefore=fs.lstatSync("/opt");
  assert.equal(optBefore.isDirectory(),true,"native /opt fixture ancestor must be a directory");
  assert.equal(optBefore.isSymbolicLink(),false,"native /opt fixture ancestor must not be a symlink");
  assert.equal(optBefore.uid,0,"native /opt fixture ancestor must be root-owned");
  originalOptMode=optBefore.mode&0o7777;
  if((originalOptMode&0o022)!==0){
    const safeOptMode=originalOptMode&~0o022;
    sudo(["/usr/bin/chmod",safeOptMode.toString(8),"--","/opt"]);
    optModeChanged=true;
  }
  sudo(["mkdir","-p","--",FIXED_PREENTRY_DIR]);
  sudo(["chown","0:0","--",FIXED_PREENTRY_DIR]);
  sudo(["chmod","0755","--",FIXED_PREENTRY_DIR]);
  for(const trustedDir of ["/","/opt",FIXED_PREENTRY_DIR]){
    const st=fs.lstatSync(trustedDir);
    assert.equal(st.isDirectory(),true,"native fixed-path ancestor must be a directory: "+trustedDir);
    assert.equal(st.isSymbolicLink(),false,"native fixed-path ancestor must not be a symlink: "+trustedDir);
    assert.equal(st.uid,0,"native fixed-path ancestor must be root-owned: "+trustedDir);
    assert.equal(st.mode&0o022,0,"native fixed-path ancestor must not be group/world writable: "+trustedDir);
  }
  sudo(["cp","-a","--",replica,FIXED_SOURCE_ROOT],{timeout:120000});
  sudo(["chown","-R","0:0",FIXED_SOURCE_ROOT],{timeout:120000});
  sudo(["chmod","0644",FIXED_LAUNCHER]);
  const legacyMode=fs.statSync(path.join(ROOT,LEGACY_STUB)).mode;
  assert.notEqual(legacyMode&0o111,0,"legacy *.sh refusal stub must remain executable");
  assert.match(fs.readFileSync(path.join(ROOT,LEGACY_STUB),"utf8"),/^#!\/usr\/bin\/bash\n/u);

  sudo([
    "/usr/bin/install","-o","root","-g","root","-m","0755","--",
    nativeBinary,FIXED_NATIVE,
  ]);

  const positive=sudo(argsFor(commit,tree),{timeout:180000});
  assert.match(positive.stdout,new RegExp("^"+MARKER+"$","m"));
  for(const marker of [
    "root_owned_protected_source=true",
    "native_preentry_verified=true",
    "launcher_descriptor_execution=true",
    "source_custody_green=true",
    "tsx_private_materialization_verified=true",
    "tsx_inert_transform_execution_verified=true",
    "esbuild_runtime_execution_verified=true",
    "privileged_launcher_package_runtime_verified=true",
    "tool_execution=false",
    "private_temporary_filesystem_write=true",
    "persistent_host_mutation=false",
    "status=PROTECTED_PRIVILEGED_LAUNCHER_QUALIFICATION_GREEN",
  ]) assert.match(positive.stdout,new RegExp("^"+marker+"$","m"),marker);

  const originalBody=fs.readFileSync(path.join(replica,LAUNCHER));const tamperedBody=Buffer.from(originalBody);tamperedBody[Math.floor(tamperedBody.length/2)]^=1;const tamperedBodyPath=path.join(tmp,"tampered-launcher-body.bash");fs.writeFileSync(tamperedBodyPath,tamperedBody,{mode:0o600});assert.equal(tamperedBody.length,originalBody.length);
  sudo(["/usr/bin/install","-o","root","-g","root","-m","0644","--",tamperedBodyPath,FIXED_LAUNCHER]);const tamperedBodyRun=sudo(argsFor(commit,tree),{allow:true,timeout:180000});assert.equal(tamperedBodyRun.status,2);assert.match(tamperedBodyRun.stderr,/native_preentry_launcher_digest_mismatch/u);assert.doesNotMatch(tamperedBodyRun.stdout,new RegExp("^"+MARKER+"$","m"));sudo(["/usr/bin/install","-o","root","-g","root","-m","0644","--",path.join(replica,LAUNCHER),FIXED_LAUNCHER]);

  const legacyExec=sudo([FIXED_LEGACY_STUB],{allow:true});
  assert.notEqual(legacyExec.status,0);
  assert.match(
    legacyExec.stderr,
    /VOID_BUY_VOID_SOURCE_FINALITY_V7_PRIVILEGED_LAUNCHER_V1_RETIRED_DIRECT_ENTRY_HOLD/u,
  );

  const legacyBash=sudo(["/usr/bin/bash",FIXED_LEGACY_STUB],{allow:true});
  assert.equal(legacyBash.status,2);
  assert.match(
    legacyBash.stderr,
    /privileged_receipt_execution_authorized=false/u,
  );

  const directBody=sudo([
    "/usr/bin/bash",FIXED_LAUNCHER,
    "--qualify-only",
    "--runtime-uid",String(process.getuid()),
    "--runtime-gid",String(process.getgid()),
    "--expected-commit",commit,
    "--expected-tree",tree,
  ],{allow:true});
  assert.equal(directBody.status,2);
  assert.match(directBody.stderr,/native_preentry_required/u);

  const directCheckout=sudo([
    "/usr/bin/bash",path.join(ROOT,LAUNCHER),
    "--qualify-only",
    "--runtime-uid",String(process.getuid()),
    "--runtime-gid",String(process.getgid()),
    "--expected-commit",git(ROOT,"rev-parse","HEAD"),
    "--expected-tree",git(ROOT,"rev-parse","HEAD^{tree}"),
  ],{allow:true});
  assert.equal(directCheckout.status,2);
  assert.match(directCheckout.stderr,/native_preentry_required/u);

  const wrongPath=sudo([
    nativeBinary,
    "--qualify-only",
    "--runtime-uid",String(process.getuid()),
    "--runtime-gid",String(process.getgid()),
    "--expected-commit",commit,
    "--expected-tree",tree,
  ],{allow:true});
  assert.equal(wrongPath.status,2);
  assert.match(wrongPath.stderr,/native_preentry_fixed_path_required/u);

  const wrongCommit=sudo(argsFor("f".repeat(40),tree),{allow:true,timeout:180000});
  assert.equal(wrongCommit.status,2);
  assert.match(wrongCommit.stderr,/expected_commit_mismatch/u);

  const fake=path.join(tmp,"fake-bin");
  fs.mkdirSync(fake);
  const sentinel=path.join(tmp,"fake-git-used");
  fs.writeFileSync(path.join(fake,"git"),
    "#!/bin/sh\nprintf x > "+JSON.stringify(sentinel)+"\nexit 99\n",
    {mode:0o755});
  const hostileEnv={...process.env,PATH:fake};
  const hostile=sudo(argsFor("e".repeat(40),tree),{
    allow:true,env:hostileEnv,timeout:180000,
  });
  assert.equal(hostile.status,2);
  assert.match(hostile.stderr,/expected_commit_mismatch/u);
  assert.equal(fs.existsSync(sentinel),false,"ambient PATH git shim must not execute");

  sudo(["chmod","0777",path.join(FIXED_SOURCE_ROOT,"src")]);
  const writable=sudo(argsFor(commit,tree),{allow:true,timeout:180000});
  assert.equal(writable.status,2);
  assert.match(writable.stderr,/protected_source_custody_failed/u);
  sudo(["chmod","0755",path.join(FIXED_SOURCE_ROOT,"src")]);

  sudo(["sh","-c",
    "printf tamper >> "+JSON.stringify(path.join(FIXED_SOURCE_ROOT,"src/index.ts"))]);
  const dirty=sudo(argsFor(commit,tree),{allow:true,timeout:180000});
  assert.equal(dirty.status,2);
  assert.match(dirty.stderr,/source_tree_dirty/u);

  proofCompleted=true;
}catch(error){
  proofFailure=error;
}finally{
  try{
    sudo(["rm","-rf","--",FIXED_SOURCE_ROOT,FIXED_PREENTRY_DIR]);
    if(originalOptMode!==null){
      if(optModeChanged){
        sudo(["/usr/bin/chmod",originalOptMode.toString(8),"--","/opt"]);
      }
      const restoredOpt=fs.lstatSync("/opt");
      assert.equal(restoredOpt.isDirectory(),true,"restored /opt must remain directory");
      assert.equal(restoredOpt.isSymbolicLink(),false,"restored /opt must not be symlink");
      assert.equal(restoredOpt.uid,0,"restored /opt must remain root-owned");
      assert.equal(
        restoredOpt.mode&0o7777,
        originalOptMode,
        "host /opt mode was not restored exactly",
      );
    }
    if(installedSystemNodeFixture) sudo(["rm","-f","--",systemNode]);
    fs.rmSync(tmp,{recursive:true,force:true});
  }catch(error){
    cleanupFailure=error;
  }
}
if(proofFailure!==null){
  if(cleanupFailure!==null){
    console.error("cleanup_failure="+String(cleanupFailure?.message||cleanupFailure));
  }
  throw proofFailure;
}
if(cleanupFailure!==null)throw cleanupFailure;
assert.equal(proofCompleted,true,"proof body did not complete");
  console.log(MARKER+"_PROOF_GREEN");
  console.log("native_preentry_first_instruction=true");
  console.log("host_opt_fixture_mode_restored=true");
  console.log("native_bash_descriptor_execution=true");
  console.log("native_launcher_descriptor_execution=true");
  console.log("native_launcher_exact_sha256_bound=true");
  console.log("protected_tool_dispatch_context_bound=true");
  console.log("same_size_root_owned_launcher_substitution_rejected=true");
  console.log("direct_shell_privileged_invocation_supported=false");
  console.log("legacy_sh_path_fail_only=true");
  console.log("nonexecutable_launcher_body=true");
  console.log("protected_root_owned_source_positive=true");
  console.log("writable_checkout_rejected=true");
  console.log("dirty_protected_tree_rejected=true");
  console.log("wrong_commit_rejected=true");
  console.log("ambient_path_git_shim_blocked=true");
  console.log("tool_allowlist_exact=true");
  console.log("full_protected_repo_replica_used=true");
  console.log("tsx_private_materialization_verified=true");
  console.log("tsx_inert_transform_execution_verified=true");
  console.log("esbuild_runtime_execution_verified=true");
  console.log("privileged_launcher_package_runtime_verified=true");
  console.log("private_temporary_filesystem_write=true");
  console.log("persistent_host_mutation=false");
  console.log("privileged_tool_execution_performed=false");
  console.log("service_mutation=false");
  console.log("credential_wallet_signer_transaction_authority=false");
  console.log("presale_activation=false");
  console.log("funds_movement=false");
