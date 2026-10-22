#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const MARKER="VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V5";
const CANDIDATE_HEAD="2e2688b3883ca7ef718526a0202b75554145554a";
const CANDIDATE_TREE="6432d15f25e83d57fd0eefc065ffb467663cdcdb";
const CANDIDATE="ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v5.json";
const CANDIDATE_PROOF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_candidate_v5.mjs";
const CANDIDATE_PROOF_BLOB="a0c34ad442d0bac812af67861617cb25c6321ada";
const CANDIDATE_DOC="docs/architecture/buy-void-enforcement-final-protected-v7-v2-candidate-v5.md";
const CANDIDATE_DOC_BLOB="0efa268b23b7076370a69161723beeedd9815bbb";
const CANDIDATE_WORKFLOW=".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v5.yml";
const CANDIDATE_WORKFLOW_BLOB="f58b7314797d32f30c17841b703a2f19c63b03a6";
const CANDIDATE_BYTES=13881;
const CANDIDATE_SHA256="d3ab6682dec3bdac01cb5fbbd6b7912a2461d92c3fdaf48909bf89995cc483da";
const CANDIDATE_BLOB="46e3774ca442cf593d25b6062ab5538d5ac43611";
const CANDIDATE_SET="e72f512b0006eef7cec7325f39c56823eb3c878d7f8452a08c717478b7c8ac45";
const INVENTORY_SHA256="7f9bf2134ba33ddf52d6a2b9cf6fa1ba4b8ad437d71f2a5c2b1814f25f98d74f";
const PREDECESSOR_LOCK="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v4.json";
const PREDECESSOR_LOCK_BLOB="854b9e39772e1e930c63b71e1099509df0f2dbf8";
const LOCK="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v5.json";
const LOCK_BLOB="bc1b2f4095315861db7a257d4cc3c80a9f112530";
const SELF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_lock_v5.mjs";
const EXPECTED_DELTA=Object.freeze([["A",".github/workflows/buy-void-enforcement-final-protected-v7-v2-lock-v5.yml"],["A","docs/architecture/buy-void-enforcement-final-protected-v7-v2-lock-v5.md"],["A","ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v5.json"],["A","ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v5.json"],["A","scripts/prove_buy_void_enforcement_final_protected_v7_v2_lock_v5.mjs"]]);
const EXPECTED_LOCK=Object.freeze({"schema":"void_buy_void_enforcement_final_protected_v7_v2_lock_v5","marker":"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V5","version":5,"repository":"6ZoSo9/void-node","candidate_head":"2e2688b3883ca7ef718526a0202b75554145554a","candidate_tree":"6432d15f25e83d57fd0eefc065ffb467663cdcdb","candidate_hosted_evidence":{"workflow_run":39788884247,"node22_job_id":119859269924,"node24_job_id":119859269275,"node26_job_id":119859270048,"cross_node_job_id":119859577338,"node22_artifact_id":12429234085,"node24_artifact_id":12431116097,"node26_artifact_id":12430581057,"candidate_cross_node_byte_identity_verified":true,"independent_node24_rederivation_verified":true,"exact_candidate_head_verified":true},"candidate_evidence":{"path":"ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v5.json","derivation_proof_path":"scripts/prove_buy_void_enforcement_final_protected_v7_v2_candidate_v5.mjs","derivation_proof_git_blob_sha1":"a0c34ad442d0bac812af67861617cb25c6321ada","document_path":"docs/architecture/buy-void-enforcement-final-protected-v7-v2-candidate-v5.md","document_git_blob_sha1":"0efa268b23b7076370a69161723beeedd9815bbb","workflow_path":".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v5.yml","workflow_git_blob_sha1":"f58b7314797d32f30c17841b703a2f19c63b03a6","bytes":13881,"sha256":"d3ab6682dec3bdac01cb5fbbd6b7912a2461d92c3fdaf48909bf89995cc483da","git_blob_sha1":"46e3774ca442cf593d25b6062ab5538d5ac43611","candidate_enforcement_set_sha256":"e72f512b0006eef7cec7325f39c56823eb3c878d7f8452a08c717478b7c8ac45"},"predecessor_lock":{"path":"ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v4.json","git_blob_sha1":"854b9e39772e1e930c63b71e1099509df0f2dbf8","accepted_candidate_enforcement_set_sha256":"ff084a754e7eb6bef08ec1b1079a17a6110b4333876f0231e46395eed63042d2","candidate_enforcement_identity_accepted":true,"historical_identity_preserved":true},"protected_successor_evidence":{"composition_parent":"0527288a18ebb16161579089427a70d6fa402368","composition_proof_git_blob_sha1":"21d2e830c915e1a92daa6e837169b05bd75805d3","current_protected_inventory_sha256":"7f9bf2134ba33ddf52d6a2b9cf6fa1ba4b8ad437d71f2a5c2b1814f25f98d74f","reviewed_protected_drift_count":1,"reviewed_runner_successor_bound":true,"predecessor_runner_git_blob_sha1":"6fb040de128ce0df16e848d61ea5f4acb62794da","current_runner_git_blob_sha1":"d7d7aede7fcd764a6182bd31f12338c5d3674ecb","runner_git_mode":"100755","range_index_git_blob_sha1":"7df1f21c730b554c414c88c550a4475234485370","canonical_v5_semantics_requalified":true,"candidate_v4_preserved":true,"lock_v4_preserved":true,"current_candidate_rederived":true},"current_enforcement_tracked_source_inventory_sha256":"7f9bf2134ba33ddf52d6a2b9cf6fa1ba4b8ad437d71f2a5c2b1814f25f98d74f","complete_executable_closure_verified":true,"current_enforcement_tracked_source_inventory_verified":true,"candidate_enforcement_identity_accepted":true,"deployed_artifact_generation_verified":false,"runtime_mount_authority":false,"production_source_finality_authority_ready":false,"deployment_receipt_reissue_required":true,"public_presale_activation":false,"funds_movement":false});

const sha256=b=>crypto.createHash("sha256").update(b).digest("hex");
const gitBlob=b=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+b.length+"\0","utf8")).update(b).digest("hex");
function run(command,args,{timeout=120000}={}){
  const r=spawnSync(command,args,{cwd:ROOT,encoding:null,stdio:["ignore","pipe","pipe"],timeout,maxBuffer:32*1024*1024,
    env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",NODE_ENV:"test",NODE_OPTIONS:"",
      GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",GIT_CONFIG_SYSTEM:"/dev/null",
      GIT_NO_REPLACE_OBJECTS:"1",GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0",GIT_ASKPASS:"/bin/false"}});
  assert.equal(r.error,undefined,String(r.error||""));
  assert.equal(r.status,0,String(r.stderr||r.stdout||""));
  return r;
}
const git=args=>String(run("/usr/bin/git",["--no-replace-objects","-c","core.hooksPath=/dev/null","-c","core.fsmonitor=false","-C",ROOT,...args],{timeout:30000}).stdout||"").trim();
function readExact(relative,max=1024*1024){
  const absolute=path.join(ROOT,...relative.split("/"));
  const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&before.size>0&&before.size<=max,"invalid_file:"+relative);
  const fd=fs.openSync(absolute,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK);
  try{
    const opened=fs.fstatSync(fd);
    assert.ok(opened.isFile()&&opened.nlink===1&&opened.size===before.size,"invalid_opened_file:"+relative);
    assert.equal(opened.dev,before.dev);assert.equal(opened.ino,before.ino);
    const bytes=fs.readFileSync(fd);
    const after=fs.fstatSync(fd);
    assert.equal(after.dev,opened.dev);assert.equal(after.ino,opened.ino);assert.equal(after.size,opened.size);
    assert.equal(bytes.length,opened.size);
    const visible=fs.lstatSync(absolute);
    assert.equal(visible.dev,opened.dev);assert.equal(visible.ino,opened.ino);assert.equal(visible.size,opened.size);
    return bytes;
  }finally{fs.closeSync(fd);}
}
function readerSelfTest(){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"void-v5-lock-reader-"));
  try{
    const p=path.join(temp,"x");fs.writeFileSync(p,"good",{mode:0o600});
    assert.equal(readExactAt(temp,"x",8).toString(),"good");
    fs.renameSync(p,p+".old");run("/usr/bin/mkfifo",[p],{timeout:5000});
    assert.throws(()=>readExactAt(temp,"x",8),/invalid_file:x/);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
function readExactAt(root,relative,max){
  const absolute=path.join(root,...relative.split("/"));
  const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&before.size>0&&before.size<=max,"invalid_file:"+relative);
  const fd=fs.openSync(absolute,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK);
  try{
    const opened=fs.fstatSync(fd);
    assert.ok(opened.isFile()&&opened.nlink===1&&opened.size===before.size,"invalid_opened_file:"+relative);
    return fs.readFileSync(fd);
  }finally{fs.closeSync(fd);}
}
function verifyBranch(){
  git(["merge-base","--is-ancestor",CANDIDATE_HEAD,"HEAD"]);
  assert.equal(git(["merge-base",CANDIDATE_HEAD,"HEAD"]),CANDIDATE_HEAD);
  const rows=git(["diff","--name-status",CANDIDATE_HEAD,"HEAD","--"]).split("\n").filter(Boolean)
    .map(line=>{const [status,...rest]=line.split("\t");return [status,rest.join("\t")];})
    .sort((a,b)=>a[1].localeCompare(b[1]));
  assert.deepEqual(rows,[...EXPECTED_DELTA].sort((a,b)=>a[1].localeCompare(b[1])));
  assert.equal(git(["rev-parse","HEAD:"+CANDIDATE]),CANDIDATE_BLOB);
  assert.equal(git(["rev-parse","HEAD:"+CANDIDATE_PROOF]),CANDIDATE_PROOF_BLOB);
  assert.equal(git(["rev-parse","HEAD:"+CANDIDATE_DOC]),CANDIDATE_DOC_BLOB);
  assert.equal(git(["rev-parse","HEAD:"+CANDIDATE_WORKFLOW]),CANDIDATE_WORKFLOW_BLOB);
  assert.equal(git(["rev-parse","HEAD:"+PREDECESSOR_LOCK]),PREDECESSOR_LOCK_BLOB);
  assert.equal(git(["rev-parse","HEAD:"+LOCK]),LOCK_BLOB);
}
function candidate(){
  const bytes=readExact(CANDIDATE,128*1024);
  assert.equal(bytes.length,CANDIDATE_BYTES);
  assert.equal(sha256(bytes),CANDIDATE_SHA256);
  assert.equal(gitBlob(bytes),CANDIDATE_BLOB);
  const c=JSON.parse(bytes.toString("utf8"));
  assert.equal(c.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V5");
  assert.equal(c.version,5);assert.equal(c.repository_head_sha,CANDIDATE_HEAD);assert.equal(c.repository_tree_sha,CANDIDATE_TREE);
  assert.equal(c.current_enforcement_tracked_source_inventory_count,49);
  assert.equal(c.current_enforcement_tracked_source_inventory_sha256,INVENTORY_SHA256);
  assert.equal(c.candidate_enforcement_set_sha256,CANDIDATE_SET);
  assert.equal(c.executable_closure_transition?.protected_source_delta_count,1);
  assert.deepEqual(c.executable_closure_transition?.changed_protected_paths,["ops/run-void-node-live-v1.sh"]);
  assert.equal(c.complete_executable_closure_verified,true);
  assert.equal(c.candidate_enforcement_identity_accepted,false);
  assert.equal(c.deployed_artifact_generation_verified,false);
  assert.equal(c.runtime_mount_authority,false);
  assert.equal(c.production_source_finality_authority_ready,false);
  assert.equal(c.deployment_receipt_reissue_required,true);
  assert.equal(c.public_presale_activation,false);assert.equal(c.funds_movement,false);
}
function expectedBytes(){return Buffer.from(JSON.stringify(EXPECTED_LOCK,null,2)+"\n","utf8");}
function verify(){
  verifyBranch();readerSelfTest();candidate();
  const bytes=readExact(LOCK,128*1024);
  assert.ok(bytes.equals(expectedBytes()),"lock_bytes");
  assert.equal(gitBlob(bytes),LOCK_BLOB);
  const v=JSON.parse(bytes.toString("utf8"));
  assert.equal(v.candidate_enforcement_identity_accepted,true);
  assert.equal(v.deployed_artifact_generation_verified,false);
  assert.equal(v.runtime_mount_authority,false);
  assert.equal(v.production_source_finality_authority_ready,false);
  assert.equal(v.deployment_receipt_reissue_required,true);
  assert.equal(v.public_presale_activation,false);assert.equal(v.funds_movement,false);
  return v;
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--derive")process.stdout.write(expectedBytes());
else if(args.length===1&&args[0]==="--reader-self-test"){readerSelfTest();console.log("VOID_BUY_VOID_V5_LOCK_READER_SELF_TEST_GREEN");}
else if(args.length===0||(args.length===1&&args[0]==="--self-test")){
  const v=verify();console.log(MARKER+"_GREEN");
  console.log("candidate_enforcement_set_sha256="+v.candidate_evidence.candidate_enforcement_set_sha256);
  console.log("candidate_enforcement_identity_accepted=true");
  console.log("deployed_artifact_generation_verified=false");
  console.log("runtime_mount_authority=false");
  console.log("production_source_finality_authority_ready=false");
  console.log("deployment_receipt_reissue_required=true");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}else throw Error("usage: "+SELF+" [--derive|--reader-self-test|--self-test]");
