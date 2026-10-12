#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Qualification is for the root-owned Git packaged on the GitHub Ubuntu 24
// Linux runner. Do not claim this authenticates an arbitrary operator host.
// Neither PATH nor ambient GIT_*/LD_* settings authorize an executable.
export const REVIEWED_GIT_BINARY_V1 = "/usr/bin/git";
export const REVIEWED_GIT_ENV_V1 = Object.freeze({
  PATH: "/usr/bin:/bin",
  HOME: "/nonexistent",
  LANG: "C",
  LC_ALL: "C",
  TZ: "UTC",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_COUNT: "0",
  GIT_NO_REPLACE_OBJECTS: "1",
  GIT_OPTIONAL_LOCKS: "0",
  GIT_TERMINAL_PROMPT: "0",
});

export function runReviewedGitV1(args,cwd) {
  assert.equal(process.platform,"linux","reviewed_git_linux_runner_required");
  assert.ok(Array.isArray(args)&&args.every(x=>typeof x==="string"),
    "reviewed_git_arguments_required");
  assert.ok(typeof cwd==="string"&&path.isAbsolute(cwd),
    "reviewed_git_absolute_workdir_required");
  const binary=fs.lstatSync(REVIEWED_GIT_BINARY_V1);
  assert.ok(binary.isFile()&&!binary.isSymbolicLink()&&binary.uid===0 &&
    (binary.mode&0o022)===0&&(binary.mode&0o111)!==0,
    "reviewed_git_root_owned_system_binary_required");
  return execFileSync(REVIEWED_GIT_BINARY_V1,[
    "-c","core.fsmonitor=false",
    "-c","core.hooksPath=/dev/null",
    "-c","diff.external=",
    ...args
  ],{
    cwd,env:REVIEWED_GIT_ENV_V1,encoding:"utf8",
    stdio:["ignore","pipe","pipe"],timeout:10000,maxBuffer:4096
  });
}

export function proveReviewedGitV1Synthetic() {
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"void-qualified-git-"));
  const repo=path.join(temp,"repository"),fakeDir=path.join(temp,"fakebin");
  const fakeGit=path.join(fakeDir,"git");
  const marker=path.join(temp,"forged-git-executed");
  const keys=[
    "PATH","HOME","LD_PRELOAD","GIT_CONFIG_COUNT","GIT_CONFIG_KEY_0",
    "GIT_CONFIG_VALUE_0","GIT_EXEC_PATH","GIT_EXTERNAL_DIFF",
    "GIT_CONFIG_GLOBAL","GIT_CONFIG_NOSYSTEM"
  ];
  const before=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  try {
    fs.mkdirSync(repo);fs.mkdirSync(fakeDir);
    fs.writeFileSync(fakeGit,
      "#!/bin/sh\nprintf forged > "+JSON.stringify(marker)+"\nexit 0\n",
      {mode:0o700});
    Object.assign(process.env,{
      PATH:fakeDir+":/usr/bin:/bin",
      HOME:fakeDir,
      LD_PRELOAD:path.join(fakeDir,"forged-preload.so"),
      GIT_CONFIG_COUNT:"1",
      GIT_CONFIG_KEY_0:"core.fsmonitor",
      GIT_CONFIG_VALUE_0:fakeGit,
      GIT_EXEC_PATH:fakeDir,
      GIT_EXTERNAL_DIFF:fakeGit,
      GIT_CONFIG_GLOBAL:fakeGit,
      GIT_CONFIG_NOSYSTEM:"0"
    });
    assert.match(runReviewedGitV1(["--version"],repo),/^git version /u);
    runReviewedGitV1(["init","--quiet"],repo);
    fs.mkdirSync(path.join(repo,"src"));
    const sample=path.join(repo,"src","fixture.txt");
    const commitArgs=["-c","user.name=VOID Source Proof",
      "-c","user.email=void-proof@example.invalid","commit","--quiet","-m"];
    fs.writeFileSync(sample,"first\n",{mode:0o600});
    runReviewedGitV1(["add","--","src/fixture.txt"],repo);
    runReviewedGitV1([...commitArgs,"first"],repo);
    const old=runReviewedGitV1(["rev-parse","HEAD"],repo).trim();
    fs.writeFileSync(sample,"second\n",{mode:0o600});
    runReviewedGitV1(["add","--","src/fixture.txt"],repo);
    runReviewedGitV1([...commitArgs,"second"],repo);
    const current=runReviewedGitV1(["rev-parse","HEAD"],repo).trim();
    assert.match(old,/^[0-9a-f]{40}$/u);
    assert.match(current,/^[0-9a-f]{40}$/u);
    assert.notEqual(old,current);
    runReviewedGitV1(["merge-base","--is-ancestor",old,current],repo);
    assert.throws(()=>runReviewedGitV1(
      ["merge-base","--is-ancestor",current,old],repo),
      undefined,"invalid ancestry must HOLD");
    assert.throws(()=>runReviewedGitV1(
      ["diff","--quiet","--no-ext-diff","--no-textconv",old,current,
        "--","src/fixture.txt"],repo),
      undefined,"changed committed source must HOLD");
    runReviewedGitV1(["diff","--quiet","--no-ext-diff","--no-textconv",
      old,current,"--","unrelated.txt"],repo);
    assert.equal(fs.existsSync(marker),false,"PATH-controlled Git shim ran");
    console.log("VOID_BUY_VOID_REVIEWED_GIT_EXECUTION_V1_SYNTHETIC_GREEN");
    console.log("root_owned_absolute_git_used=true");
    console.log("unreviewed_PATH_git_shim_executed=false");
    console.log("ambient_GIT_LD_config_excluded=true");
    console.log("valid_source_ancestry_passed=true");
    console.log("invalid_source_ancestry_rejected=true");
    console.log("changed_committed_source_rejected=true");
    console.log("candidate_identity_accepted=false");
    console.log("production_source_finality_authority_ready=false");
  } finally {
    for(const key of keys) {
      if(before[key]===undefined)delete process.env[key];
      else process.env[key]=before[key];
    }
    fs.rmSync(temp,{recursive:true,force:true});
  }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  assert.deepEqual(process.argv.slice(2),["--self-test"],
    "source_git_qualification_self_test_only");
  proveReviewedGitV1Synthetic();
}
