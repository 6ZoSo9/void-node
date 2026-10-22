#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const CANDIDATE_HEAD="895c2bf320defbbca5fba6792e2a75126b2c4d76";
const CANDIDATE="ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v4.json";
const CANDIDATE_PROOF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_candidate_v4.mjs";
const CANDIDATE_PROOF_BLOB="f33a579e62c8201de24d5076cfcbffab66df8dae";
const CANDIDATE_BYTES=17788;
const CANDIDATE_SHA256="bf360784af7a6ddf908812b9c335e8e52d4410ba249c5ea1988b97d9cfd5a72c";
const CANDIDATE_BLOB="5893e300a78dc4ca7729ef47f95a8e3eea2043cf";
const CANDIDATE_SET="ff084a754e7eb6bef08ec1b1079a17a6110b4333876f0231e46395eed63042d2";
const DISPATCH="scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v4.mjs";
const DISPATCH_BLOB="51a51a7f85c8068269bad0e09e3ae872c4323a58";
const LOCK="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v4.json";
const LOCK_BLOB="854b9e39772e1e930c63b71e1099509df0f2dbf8";
const SELF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_lock_v4.mjs";
const DOC="docs/architecture/buy-void-enforcement-final-protected-v7-v2-lock-v4.md";
const WORKFLOW=".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v2.yml";
const EXPECTED_DELTA=Object.freeze([["M",".github/workflows/buy-void-delivery-dependency-provider-closure-post2865-lock-v1.yml"],["M",".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v2.yml"],["M",".github/workflows/buy-void-enforcement-final-v7-artifact-census-v4.yml"],["M",".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v1.yml"],["M",".github/workflows/buy-void-source-finality-v7-executable-delta-candidate-v1.yml"],["A","docs/architecture/buy-void-enforcement-final-protected-v7-v2-lock-v4.md"],["A","ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v4.json"],["A","scripts/prove_buy_void_enforcement_final_protected_v7_v2_lock_v4.mjs"]]);
const EXPECTED_LOCK=Object.freeze({"schema":"void_buy_void_enforcement_final_protected_v7_v2_lock_v4","marker":"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V4","version":4,"repository":"6ZoSo9/void-node","candidate_head":"895c2bf320defbbca5fba6792e2a75126b2c4d76","candidate_hosted_evidence":{"workflow_run":39665164718,"node22_artifact_id":12376738282,"node24_artifact_id":12377278277,"node26_artifact_id":12377118279,"cross_node_job_id":119449789170,"dispatch_cross_node_job_id":119450541241,"candidate_cross_node_byte_identity_verified":true,"dispatch_cross_node_byte_identity_verified":true,"exact_candidate_head_verified":true},"candidate_evidence":{"path":"ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v4.json","derivation_proof_path":"scripts/prove_buy_void_enforcement_final_protected_v7_v2_candidate_v4.mjs","derivation_proof_git_blob_sha1":"f33a579e62c8201de24d5076cfcbffab66df8dae","bytes":17788,"sha256":"bf360784af7a6ddf908812b9c335e8e52d4410ba249c5ea1988b97d9cfd5a72c","git_blob_sha1":"5893e300a78dc4ca7729ef47f95a8e3eea2043cf","candidate_enforcement_set_sha256":"ff084a754e7eb6bef08ec1b1079a17a6110b4333876f0231e46395eed63042d2"},"dispatch_evidence":{"path":"scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v4.mjs","git_blob_sha1":"51a51a7f85c8068269bad0e09e3ae872c4323a58","receipt_sha256":"cdf9c1daf864deaf49d909412fe4960e8af7af16dc9fa609282caae19f5efe4e","cross_node_byte_identity_verified":true},"protected_successor_evidence":{"current_enforcement_parent":"0344d7dab153be75716646d5c6f5162f926f25ee","predecessor_candidate_git_blob_sha1":"79998af4763b6afca84ffe4e8d14d9a6ff535dfd","predecessor_lock_git_blob_sha1":"245ce93ebfb53478211fab765489e88d8fa23c4a","dispatch_v3_proof_git_blob_sha1":"fba37e94a90b3d4278fd3fba10fbe6313f2f0625","frozen_protected_inventory_sha256":"c0a56b378215feafacc089e9f59a9f966d57f11e5582e4a13afcd6351d2447bb","current_protected_inventory_sha256":"8485ef25c236b8798bed3a67b9308ef7dcd383aedca1486f4f488d043d7efbe0","reviewed_protected_drift_count":1,"reviewed_deployment_reader_successor_bound":true,"workflow_dispatch_contracts_bound":true,"production_tracked_file_nonblocking":true,"production_tracked_file_fifo_swap_rejected":true,"frozen_v4_census_proof_preserved":true,"nonprotected_economic_drift_count":3,"predecessor_tool_git_blob_sha1":"3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0","current_tool_git_blob_sha1":"e0a682ea4038ca22e3a3b97da2cac29874096c46","predecessor_candidate_preserved":true,"predecessor_lock_preserved":true,"current_candidate_rederived":true},"audited_package_runtime":{"profile_id":"voidrnpr1_08e05626e80fbd2aecc3018514aaf76e491954f8258fff996f0b2dca1c3055ac","packages_aggregate_sha256":"77622df7d483bc3f73aa39468246f6860237a3f6749a09a0284644493f3990b6","profile_canonical_sha256":"3493638417e2f02a39bb7c48a08935e299754d7474feb71a5c2a48944d3f1757"},"dependency_provider":{"provider_closure_sha256":"3b6be7b9efdc7f70b6f270f77208efab2f7321136a54cc76a7e1d34c57bd4945","provider_closure_semantic_sha256":"95112d913d45b2b03887edb97c8693eef84a72b54b61503ffc66a6a7bce67384"},"v7_executable_delta_candidate_generation_sha256":"5c5637207d5970d2ca793cf431726ff8d86db370b3e69e9ff1e5caa25d9b5224","current_enforcement_tracked_source_inventory_sha256":"8485ef25c236b8798bed3a67b9308ef7dcd383aedca1486f4f488d043d7efbe0","complete_executable_closure_verified":true,"current_enforcement_tracked_source_inventory_verified":true,"candidate_enforcement_identity_accepted":true,"deployed_artifact_generation_verified":false,"runtime_mount_authority":false,"production_source_finality_authority_ready":false,"public_presale_activation":false,"funds_movement":false});
const sha256=b=>crypto.createHash("sha256").update(b).digest("hex");
const gitBlob=b=>crypto.createHash("sha1").update(Buffer.from("blob "+b.length+"\0")).update(b).digest("hex");
function run(command,args,{timeout=120000}={}){
  const r=spawnSync(command,args,{cwd:ROOT,encoding:null,stdio:["ignore","pipe","pipe"],timeout,maxBuffer:32*1024*1024,
    env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",NODE_ENV:"test",GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",GIT_CONFIG_SYSTEM:"/dev/null",GIT_NO_REPLACE_OBJECTS:"1",GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0"}});
  assert.equal(r.error,undefined,String(r.error||""));assert.equal(r.status,0,String(r.stderr||r.stdout||""));return r;
}
const git=args=>String(run("/usr/bin/git",["--no-replace-objects","-C",ROOT,...args],{timeout:30000}).stdout||"").trim();
const FIELDS=Object.freeze(["dev","ino","mode","nlink","uid","gid","rdev","size","mtimeMs","ctimeMs"]);
function same(actual,expected,label){for(const key of FIELDS)assert.equal(actual[key],expected[key],label+":"+key);}
function readExactAt(root,relative,max=1024*1024,{beforeOpen=null,afterOpen=null}={}){
  assert.equal(path.isAbsolute(relative),false,"absolute_path:"+relative);
  assert.equal(relative.split("/").some(part=>!part||part==="."||part===".."),false,"unsafe_path:"+relative);
  assert.ok(Number.isSafeInteger(max)&&max>0,"invalid_max:"+relative);
  const absolute=path.join(root,...relative.split("/"));const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&before.size>0&&before.size<=max,"invalid_file:"+relative);
  if(beforeOpen)beforeOpen(absolute,before);let fd=-1;
  try{
    fd=fs.openSync(absolute,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK);
    const opened=fs.fstatSync(fd);assert.ok(opened.isFile()&&opened.nlink===1&&opened.size>0&&opened.size<=max,"invalid_opened_file:"+relative);same(opened,before,"open_generation:"+relative);
    if(afterOpen)afterOpen(absolute,opened,fd);
    const chunks=[];const scratch=Buffer.alloc(Math.min(64*1024,max+1));let total=0;
    while(total<=max){const want=Math.min(scratch.length,max+1-total);if(!want)break;const n=fs.readSync(fd,scratch,0,want,null);if(!n)break;chunks.push(Buffer.from(scratch.subarray(0,n)));total+=n;}
    assert.ok(total<=max,"file_size_limit:"+relative);assert.equal(total,opened.size,"short_or_grown_read:"+relative);same(fs.fstatSync(fd),opened,"descriptor_generation:"+relative);same(fs.lstatSync(absolute),opened,"visible_generation:"+relative);return Buffer.concat(chunks,total);
  }finally{if(fd>=0)fs.closeSync(fd);}
}
const read=(relative,max=1024*1024)=>readExactAt(ROOT,relative,max);
function proveReader(){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"void-v4-lock-reader-"));
  try{
    const dep=path.join(temp,"dep"),target=path.join(temp,"target");fs.writeFileSync(dep,"good",{mode:0o600});assert.equal(readExactAt(temp,"dep",8).toString(),"good");
    assert.throws(()=>readExactAt(temp,"dep",8,{beforeOpen:absolute=>{fs.renameSync(absolute,absolute+".old");fs.writeFileSync(absolute,"evil",{mode:0o600});}}),/open_generation:dep/);
    fs.rmSync(dep,{force:true});fs.writeFileSync(target,"good",{mode:0o600});fs.symlinkSync("target",dep);assert.throws(()=>readExactAt(temp,"dep",8),/invalid_file:dep/);
    fs.rmSync(dep,{force:true});fs.writeFileSync(dep,"good",{mode:0o600});assert.throws(()=>readExactAt(temp,"dep",8,{beforeOpen:absolute=>{fs.renameSync(absolute,absolute+".link-old");fs.symlinkSync("target",absolute);}}),err=>err&&err.code==="ELOOP");
    fs.rmSync(dep,{force:true});fs.writeFileSync(dep,"good",{mode:0o600});assert.throws(()=>readExactAt(temp,"dep",8,{beforeOpen:absolute=>{fs.renameSync(absolute,absolute+".fifo-old");run("/usr/bin/mkfifo",[absolute],{timeout:5000});}}),/invalid_opened_file:dep/);
    fs.rmSync(dep,{force:true});fs.writeFileSync(dep,"good",{mode:0o600});assert.throws(()=>readExactAt(temp,"dep",8,{afterOpen:absolute=>fs.appendFileSync(absolute,"x")}),/short_or_grown_read:dep/);
    fs.rmSync(dep,{force:true});fs.writeFileSync(dep,"good",{mode:0o600});assert.throws(()=>readExactAt(temp,"dep",8,{afterOpen:absolute=>fs.appendFileSync(absolute,"growth")}),/file_size_limit:dep/);
    fs.rmSync(dep,{force:true});fs.writeFileSync(dep,"123456789",{mode:0o600});assert.throws(()=>readExactAt(temp,"dep",8),/invalid_file:dep/);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
function verifyBranch(){
  git(["merge-base","--is-ancestor",CANDIDATE_HEAD,"HEAD"]);assert.equal(git(["merge-base",CANDIDATE_HEAD,"HEAD"]),CANDIDATE_HEAD,"candidate_merge_base");
  const rows=git(["diff","--name-status",CANDIDATE_HEAD,"HEAD","--"]).split("\n").filter(Boolean).map(line=>{const [status,...rest]=line.split("\t");return [status,rest.join("\t")];}).sort((a,b)=>a[1].localeCompare(b[1]));
  assert.deepEqual(rows,[...EXPECTED_DELTA].sort((a,b)=>a[1].localeCompare(b[1])),"lock_scope");
  assert.equal(git(["rev-parse","HEAD:"+CANDIDATE]),CANDIDATE_BLOB);assert.equal(git(["rev-parse","HEAD:"+CANDIDATE_PROOF]),CANDIDATE_PROOF_BLOB);assert.equal(git(["rev-parse","HEAD:"+DISPATCH]),DISPATCH_BLOB);assert.equal(git(["rev-parse","HEAD:"+LOCK]),LOCK_BLOB);
}
function candidate(){
  const bytes=read(CANDIDATE,128*1024);assert.equal(bytes.length,CANDIDATE_BYTES);assert.equal(sha256(bytes),CANDIDATE_SHA256);assert.equal(gitBlob(bytes),CANDIDATE_BLOB);const c=JSON.parse(bytes.toString("utf8"));
  assert.equal(c.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V4");assert.equal(c.version,4);assert.equal(c.current_enforcement_parent,"0344d7dab153be75716646d5c6f5162f926f25ee");assert.equal(c.current_enforcement_tracked_source_inventory_count,49);assert.equal(c.current_enforcement_tracked_source_inventory_sha256,"8485ef25c236b8798bed3a67b9308ef7dcd383aedca1486f4f488d043d7efbe0");assert.equal(c.candidate_enforcement_set_sha256,CANDIDATE_SET);assert.equal(c.successor_transition?.predecessor_tool_git_blob_sha1,"3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0");assert.equal(c.successor_transition?.current_tool_git_blob_sha1,"e0a682ea4038ca22e3a3b97da2cac29874096c46");assert.equal(c.successor_transition?.reviewed_protected_drift_count,1);assert.equal(c.candidate_enforcement_identity_accepted,false);assert.equal(c.production_source_finality_authority_ready,false);assert.equal(c.public_presale_activation,false);assert.equal(c.funds_movement,false);return c;
}
function expectedBytes(){return Buffer.from(JSON.stringify(EXPECTED_LOCK,null,2)+"\n");}
function verify(){verifyBranch();proveReader();candidate();const bytes=read(LOCK,128*1024);assert.ok(bytes.equals(expectedBytes()),"lock_bytes");assert.equal(gitBlob(bytes),LOCK_BLOB);const value=JSON.parse(bytes);assert.equal(value.candidate_enforcement_identity_accepted,true);assert.equal(value.deployed_artifact_generation_verified,false);assert.equal(value.runtime_mount_authority,false);assert.equal(value.production_source_finality_authority_ready,false);assert.equal(value.public_presale_activation,false);assert.equal(value.funds_movement,false);return value;}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--derive")process.stdout.write(expectedBytes());
else if(args.length===1&&args[0]==="--reader-self-test"){proveReader();console.log("VOID_BUY_VOID_V4_LOCK_READER_SELF_TEST_GREEN");}
else if(args.length===0||(args.length===1&&args[0]==="--self-test")){const value=verify();console.log("VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V4_GREEN");console.log("candidate_enforcement_identity_accepted="+value.candidate_enforcement_identity_accepted);console.log("production_source_finality_authority_ready=false");console.log("public_presale_activation=false");console.log("funds_movement=false");}
else throw new Error("usage: "+SELF+" [--derive|--reader-self-test|--self-test]");
