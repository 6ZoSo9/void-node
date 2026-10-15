#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const QUERY="ops/precision/void_buy_void_user_manager_private_unit_query_v1.c";
const QUERY_BLOB="a493a557305d5193d2b1d38b6070a8e826c1d43a";
const V2_CANDIDATE="ops/security/buy-void-user-manager-query-elf-candidate-v2.json";
const V2_CANDIDATE_BLOB="57026c4d8ca6cc9a40a3fa61f8cf4ee2c9df47be";
const V2_LOCK="ops/security/buy-void-user-manager-query-elf-lock-v2.json";
const V2_LOCK_BLOB="347951dbaa2d9bb5c31c8b718d9965ab3fdf7301";
const V2_PROOF="scripts/prove_void_buy_user_manager_query_elf_lock_v2.mjs";
const V2_PROOF_BLOB="148433d64d4c25d1383abe2534f081b0de542017";

const sha256=b=>crypto.createHash("sha256").update(b).digest("hex");
const gitBlob=b=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+b.length+"\0","utf8")).update(b).digest("hex");

function read(relative,max=2*1024*1024){
  const absolute=path.join(ROOT,...relative.split("/"));
  const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&
    before.size>0&&before.size<=max,"invalid_file:"+relative);
  const bytes=fs.readFileSync(absolute);
  const after=fs.lstatSync(absolute);
  for(const key of ["dev","ino","size","mtimeMs","ctimeMs"]){
    assert.equal(after[key],before[key],"file_changed:"+relative+":"+key);
  }
  return bytes;
}
function pin(relative,blob,max){
  const bytes=read(relative,max);
  assert.equal(gitBlob(bytes),blob,"git_blob_drift:"+relative);
  return bytes;
}
function run(command,args,{cwd=ROOT,env=null,timeout=120000}={}){
  const r=spawnSync(command,args,{
    cwd,encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout,maxBuffer:8*1024*1024,
    env:env||{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC"},
  });
  assert.equal(r.error,undefined,String(r.error||""));
  assert.equal(r.status,0,String(r.stderr||r.stdout||""));
  return String(r.stdout||"");
}

const sourceBytes=pin(QUERY,QUERY_BLOB,512*1024);
const source=sourceBytes.toString("utf8");
pin(V2_CANDIDATE,V2_CANDIDATE_BLOB,16*1024);
pin(V2_LOCK,V2_LOCK_BLOB,16*1024);
pin(V2_PROOF,V2_PROOF_BLOB,64*1024);

assert.doesNotMatch(source,/obs->capability_bounding_set\s*!=\s*0/u);
assert.match(source,/obs->ambient_capabilities\s*!=\s*0/u);
assert.match(source,/security->cap_bnd\s*!=\s*obs->capability_bounding_set/u);
assert.match(source,/security->cap_inh\s*!=\s*0/u);
assert.match(source,/security->cap_prm\s*!=\s*0/u);
assert.match(source,/security->cap_eff\s*!=\s*0/u);
assert.match(source,/security->cap_amb\s*!=\s*0/u);
assert.match(source,/security->no_new_privs\s*!=\s*1/u);
assert.match(source,/read_proc_security\(service\.pid,&security_after\)/u);
assert.match(source,/same_process_security\(&security,&security_after\)/u);
assert.match(source,/CapabilityBoundingSet=%016" PRIx64/u);
assert.match(source,/KernelCapBnd=%016" PRIx64/u);
assert.match(source,/KernelNoNewPrivs=%d/u);
assert.match(source,/capability_bounding_set_kernel_match=true/u);
assert.match(source,/process_nonbounding_capabilities_zero=true/u);
assert.doesNotMatch(source,/printf\("CapabilityBoundingSet=\\n"\)/u);

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"void-umq-kernel-cap-v3-"));
try{
  const binary=path.join(tmp,"query");
  run("/usr/bin/cc",[
    "-std=c11","-Wall","-Wextra","-Werror","-O2","-fno-ident",
    "-Wl,--build-id=none","-o",binary,path.join(ROOT,QUERY),"-ldl",
  ],{env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C",SOURCE_DATE_EPOCH:"0"}});
  const out=run(binary,["--self-test"],{env:{
    PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C",
    VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_SANITIZED_V1:"1",
  }});
  assert.match(out,/VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_V1_SELF_TEST_GREEN/u);
  assert.match(out,/kernel_capability_status_parser_verified=true/u);
  assert.match(out,/nonbounding_process_capabilities_zero_required=true/u);
  assert.match(out,/systemd_kernel_bounding_set_match_required=true/u);
  assert.match(out,/kernel_no_new_privileges_required=true/u);
}finally{
  fs.rmSync(tmp,{recursive:true,force:true});
}

console.log("VOID_BUY_VOID_USER_MANAGER_QUERY_KERNEL_CAPABILITY_BINDING_V3_GREEN");
console.log("query_source_git_blob_sha1="+QUERY_BLOB);
console.log("systemd_no_new_privileges_required=true");
console.log("configured_ambient_capabilities_zero_required=true");
console.log("configured_bounding_set_may_be_nonzero=true");
console.log("kernel_cap_inh_zero_required=true");
console.log("kernel_cap_prm_zero_required=true");
console.log("kernel_cap_eff_zero_required=true");
console.log("kernel_cap_amb_zero_required=true");
console.log("kernel_cap_bnd_must_match_systemd_mask=true");
console.log("kernel_no_new_privileges_required=true");
console.log("capability_state_rechecked_after_query=true");
console.log("historical_v2_candidate_preserved=true");
console.log("historical_v2_lock_preserved=true");
console.log("install_authorized=false");
console.log("host_mutation=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
