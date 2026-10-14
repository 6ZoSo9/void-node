#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const SOURCE="ops/precision/void_buy_void_source_finality_live_process_v2_selector_guard.c";
const CANDIDATE="ops/security/buy-void-v7-live-process-v2-selector-elf-candidate-v1.json";
const LOCK="ops/security/buy-void-v7-live-process-v2-selector-elf-lock-v1.json";
const EXPECTED_SOURCE_BLOB="b7aad6ecea7afa5b7f931b50b4b463e992b19748";
const EXPECTED_SHA="048564b0a351a5ba3b9f980962d9261fa14a49823b5075ca4794bbeefecbb232";
const EXPECTED_BYTES=26680;
const EXPECTED_CC="1b99826121ae6682a634e5efe09bd3e3df58ce58e0b28f849114ab5b89139c26";
const EXPECTED_STRIP="0d980587ada7ab12193f39271f060d5663aa2f289b0e80d2a0274ce7306e4e42";
const FLAGS=["-std=c11","-Wall","-Wextra","-Werror","-O2","-fno-ident","-Wl,--build-id=none"];
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const run=(cmd,args,options={})=>{
  const p=spawnSync(cmd,args,{encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:30_000,...options});
  assert.equal(p.error,undefined,String(p.error||""));
  assert.equal(p.status,0,p.stderr||p.stdout);
  return p.stdout.trim();
};

const candidate=JSON.parse(fs.readFileSync(CANDIDATE,"utf8"));
const lock=JSON.parse(fs.readFileSync(LOCK,"utf8"));
assert.deepEqual(candidate,{
  schema:"void_buy_void_v2_selector_elf_candidate_v1",
  marker:"VOID_BUY_VOID_V2_SELECTOR_ELF_CANDIDATE_V1",
  version:1,
  source_pr_head:"8da9cde16351e93ac267e214f90228bd02f50537",
  source_git_blob_sha1:EXPECTED_SOURCE_BLOB,
  binary_sha256:EXPECTED_SHA,
  binary_bytes:EXPECTED_BYTES,
  cc_sha256:EXPECTED_CC,
  strip_sha256:EXPECTED_STRIP,
  compile_flags:FLAGS,
  stripped:true,
  cross_job_run_id:38622183894,
  cross_job_byte_identity_verified:true,
  install_authorized:false,
  receipt_publication:false,
  production_source_finality_authority_ready:false,
  public_presale_activation:false,
  funds_movement:false,
});
assert.deepEqual(lock,{
  schema:"void_buy_void_v2_selector_elf_lock_v1",
  marker:"VOID_BUY_VOID_V2_SELECTOR_ELF_LOCK_V1",
  version:1,
  lock_id:"voidbsv2elflock1_"+EXPECTED_SHA,
  accepted_source_git_blob_sha1:EXPECTED_SOURCE_BLOB,
  accepted_binary_sha256:EXPECTED_SHA,
  accepted_binary_bytes:EXPECTED_BYTES,
  accepted_cc_sha256:EXPECTED_CC,
  accepted_strip_sha256:EXPECTED_STRIP,
  accepted_compile_flags:FLAGS,
  selector_elf_identity_accepted:true,
  install_authorized:false,
  receipt_publication:false,
  production_source_finality_authority_ready:false,
  public_presale_activation:false,
  funds_movement:false,
});
assert.equal(run("/usr/bin/git",["hash-object",SOURCE]),EXPECTED_SOURCE_BLOB);
assert.equal(sha(fs.readFileSync("/usr/bin/cc")),EXPECTED_CC);
assert.equal(sha(fs.readFileSync("/usr/bin/strip")),EXPECTED_STRIP);

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"void-selector-elf-lock-"));
try{
  const out=path.join(tmp,"selector");
  run("/usr/bin/cc",[...FLAGS.slice(0,6),"-Wl,--build-id=none","-o",out,SOURCE],{
    env:{...process.env,SOURCE_DATE_EPOCH:"0"},
  });
  run("/usr/bin/strip",["--strip-all",out]);
  fs.chmodSync(out,0o555);
  const bytes=fs.readFileSync(out);
  assert.equal(bytes.length,EXPECTED_BYTES);
  assert.equal(sha(bytes),EXPECTED_SHA);
  const self=run(out,["--self-test"]);
  assert.match(self,/^VOID_BUY_VOID_V2_NATIVE_SELECTOR_GUARD_V1_SELF_TEST_GREEN$/m);
}finally{
  fs.rmSync(tmp,{recursive:true,force:true});
}
console.log("VOID_BUY_VOID_V2_SELECTOR_ELF_LOCK_V1_PROOF_GREEN");
console.log("selector_elf_identity_accepted=true");
console.log("selector_binary_sha256="+EXPECTED_SHA);
console.log("selector_binary_bytes="+EXPECTED_BYTES);
console.log("install_authorized=false");
console.log("receipt_publication=false");
console.log("production_source_finality_authority_ready=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
