#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const CANDIDATE_HEAD="827b94aabbecb915ab2cf22bba8f178b7d0568bc";
const CANDIDATE="ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v4.json";
const CANDIDATE_PROOF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_candidate_v4.mjs";
const CANDIDATE_PROOF_BLOB="3a7401202fee374f2a7da3f5efc0d29976f9792a";
const CANDIDATE_BYTES=17788;
const CANDIDATE_SHA256="fbf3d5fbc1efad92c7bb5bb3fb45f686d1bddb95d4a7c34cadbd862b69318c60";
const CANDIDATE_BLOB="ec00f0c552e600fff38e4998e4beb128c93b481d";
const CANDIDATE_SET="00e8ca31370f9c6c4fa77185ed05a9ed0554e0b2036b6c5f2e937e7839c67b1a";
const CURRENT_PARENT="1b15fcf5070e7b8a8aa4b9348de88cf11be2ef26";
const CURRENT_INVENTORY="c87299b5d3ab7efad7b946ea3cbdc3b01bcae828141e864785743cd3d5f8e21d";
const CURRENT_TOOL="e0a682ea4038ca22e3a3b97da2cac29874096c46";
const PREDECESSOR_TOOL="3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0";
const DISPATCH_V4="scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v4.mjs";
const DISPATCH_V4_BLOB="9de04b5340f904b8886562727d5f9006876b7ec5";
const V3_CANDIDATE="ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v3.json";
const V3_CANDIDATE_BLOB="40c7d21e0f22bc2ffe079f80360af342f4d8a6aa";
const V3_LOCK="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v3.json";
const V3_LOCK_BLOB="f1b9d661eb3363e9bf18dbeb3610c659a54219bb";
const LOCK="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v4-reader-repair-v1.json";
const LOCK_BLOB="c9e50cebb0735981f946a1afbc4de6d692ced347";
const SELF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_lock_v4_reader_repair_v1.mjs";
const DOC="docs/architecture/buy-void-enforcement-final-protected-v7-v2-lock-v4-reader-repair-v1.md";
const WORKFLOW=".github/workflows/buy-void-enforcement-final-protected-v7-v2-lock-v4-reader-repair-v1.yml";
const RUN=40053691462;
const CROSS_JOB=120752978070;
const ARTIFACTS=Object.freeze({22:12544821142,24:12544756476,26:12545000635});
const EXPECTED_DELTA=Object.freeze([LOCK,SELF,DOC,WORKFLOW].sort());
const STAT_FIELDS=Object.freeze(["dev","ino","size","mtimeMs","ctimeMs","nlink","mode"]);
const EXPECTED_LOCK=Object.freeze({"schema":"void_buy_void_enforcement_final_protected_v7_v2_lock_v4_reader_repair_v1","marker":"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V4_READER_REPAIR_V1","version":1,"candidate_version":4,"repository":"6ZoSo9/void-node","candidate_head":"827b94aabbecb915ab2cf22bba8f178b7d0568bc","candidate_hosted_evidence":{"workflow_run":40053691462,"node22_artifact_id":12544821142,"node24_artifact_id":12544756476,"node26_artifact_id":12545000635,"cross_node_job_id":120752978070,"current_dispatch_node22_artifact_id":12545050015,"current_dispatch_node24_artifact_id":12543609325,"current_dispatch_node26_artifact_id":12545025023,"current_dispatch_cross_node_job_id":120752773488,"historical_v3_lock_source_proof_job_id":120756509483,"cross_node_byte_identity_verified":true,"current_dispatch_cross_node_byte_identity_verified":true},"candidate_evidence":{"path":"ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v4.json","derivation_proof_path":"scripts/prove_buy_void_enforcement_final_protected_v7_v2_candidate_v4.mjs","derivation_proof_git_blob_sha1":"3a7401202fee374f2a7da3f5efc0d29976f9792a","bytes":17788,"sha256":"fbf3d5fbc1efad92c7bb5bb3fb45f686d1bddb95d4a7c34cadbd862b69318c60","git_blob_sha1":"ec00f0c552e600fff38e4998e4beb128c93b481d","candidate_enforcement_set_sha256":"00e8ca31370f9c6c4fa77185ed05a9ed0554e0b2036b6c5f2e937e7839c67b1a","current_enforcement_tracked_source_inventory_sha256":"c87299b5d3ab7efad7b946ea3cbdc3b01bcae828141e864785743cd3d5f8e21d"},"predecessor_acceptance":{"candidate_v3_path":"ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v3.json","candidate_v3_git_blob_sha1":"40c7d21e0f22bc2ffe079f80360af342f4d8a6aa","lock_v3_path":"ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v3.json","lock_v3_git_blob_sha1":"f1b9d661eb3363e9bf18dbeb3610c659a54219bb","historical_v3_identity_preserved":true},"reader_repair_successor_evidence":{"current_enforcement_parent":"1b15fcf5070e7b8a8aa4b9348de88cf11be2ef26","dispatch_v4_proof_path":"scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v4.mjs","dispatch_v4_proof_git_blob_sha1":"9de04b5340f904b8886562727d5f9006876b7ec5","current_enforcement_tracked_source_inventory_sha256":"c87299b5d3ab7efad7b946ea3cbdc3b01bcae828141e864785743cd3d5f8e21d","reviewed_protected_drift_count":1,"reviewed_protected_drift":{"path":"ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts","predecessor_git_blob_sha1":"3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0","current_git_blob_sha1":"e0a682ea4038ca22e3a3b97da2cac29874096c46","git_mode":"100644"},"production_tracked_file_nonblocking":true,"production_tracked_file_fifo_swap_rejected":true,"predecessor_candidate_preserved":true,"predecessor_lock_preserved":true,"current_candidate_rederived":true},"audited_package_runtime":{"profile_id":"voidrnpr1_08e05626e80fbd2aecc3018514aaf76e491954f8258fff996f0b2dca1c3055ac","packages_aggregate_sha256":"77622df7d483bc3f73aa39468246f6860237a3f6749a09a0284644493f3990b6","profile_canonical_sha256":"3493638417e2f02a39bb7c48a08935e299754d7474feb71a5c2a48944d3f1757"},"dependency_provider":{"provider_closure_sha256":"3b6be7b9efdc7f70b6f270f77208efab2f7321136a54cc76a7e1d34c57bd4945","provider_closure_semantic_sha256":"95112d913d45b2b03887edb97c8693eef84a72b54b61503ffc66a6a7bce67384"},"complete_executable_closure_verified":true,"current_enforcement_tracked_source_inventory_verified":true,"candidate_enforcement_identity_accepted":false,"independent_review_complete":false,"candidate_acceptance_lifecycle_ready":false,"downstream_candidate_v5_derivation_ready":false,"deployed_artifact_generation_verified":false,"runtime_mount_authority":false,"production_source_finality_authority_ready":false,"public_presale_activation":false,"funds_movement":false,"candidate_identity_lock_evidence_verified":true});

const sha256=b=>crypto.createHash("sha256").update(b).digest("hex");
const gitBlob=b=>crypto.createHash("sha1").update(Buffer.from("blob "+b.length+"\0","utf8")).update(b).digest("hex");
function run(command,args,{timeout=120000}={}){
  const r=spawnSync(command,args,{cwd:ROOT,encoding:null,stdio:["ignore","pipe","pipe"],timeout,maxBuffer:32*1024*1024,
    env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",
      GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",GIT_CONFIG_SYSTEM:"/dev/null",
      GIT_NO_REPLACE_OBJECTS:"1",GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0"}});
  assert.equal(r.error,undefined,String(r.error||""));
  assert.equal(r.status,0,String(r.stderr||r.stdout||""));
  return r;
}
const git=args=>String(run("/usr/bin/git",["--no-replace-objects","-C",ROOT,...args],{timeout:30000}).stdout||"").trim();
function sameStat(a,b,label){for(const k of STAT_FIELDS)assert.equal(a[k],b[k],label+":"+k);}
function readExactAt(root,relative,max=1024*1024,{beforeOpen=null}={}){
  assert.equal(path.isAbsolute(relative),false,"absolute_path:"+relative);
  assert.equal(relative.split("/").some(p=>!p||p==="."||p===".."),false,"unsafe_path:"+relative);
  assert.ok(Number.isSafeInteger(max)&&max>0,"invalid_max:"+relative);
  const absolute=path.join(root,...relative.split("/"));
  const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&before.size>0&&before.size<=max,"invalid_file:"+relative);
  if(beforeOpen!==null)beforeOpen(absolute,before);
  let fd=-1;
  try{
    fd=fs.openSync(absolute,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK);
    const opened=fs.fstatSync(fd);
    assert.ok(opened.isFile()&&opened.nlink===1&&opened.size>0&&opened.size<=max,"invalid_opened_file:"+relative);
    sameStat(opened,before,"open_generation_mismatch:"+relative);
    const chunks=[];const scratch=Buffer.alloc(Math.min(64*1024,max+1));let total=0;
    while(total<=max){const want=Math.min(scratch.length,max+1-total);if(want===0)break;const n=fs.readSync(fd,scratch,0,want,null);if(n===0)break;chunks.push(Buffer.from(scratch.subarray(0,n)));total+=n;}
    assert.ok(total<=max,"size_limit:"+relative);
    assert.equal(total,opened.size,"short_or_grown_read:"+relative);
    sameStat(fs.fstatSync(fd),opened,"descriptor_generation_changed:"+relative);
    sameStat(fs.lstatSync(absolute),opened,"visible_generation_changed:"+relative);
    return Buffer.concat(chunks,total);
  }finally{if(fd>=0)fs.closeSync(fd);}
}
const readExact=(relative,max=1024*1024)=>readExactAt(ROOT,relative,max);
function proveReaderBoundary(){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"void-v4-reader-repair-lock-"));
  try{
    const dep=path.join(temp,"dep");fs.writeFileSync(dep,"good",{mode:0o600});
    assert.equal(readExactAt(temp,"dep",8).toString("utf8"),"good");
    assert.throws(()=>readExactAt(temp,"dep",8,{beforeOpen:absolute=>{fs.renameSync(absolute,absolute+".replace-original");fs.writeFileSync(absolute,"evil",{mode:0o600});}}),/open_generation_mismatch:dep/);
    fs.rmSync(dep,{force:true});fs.renameSync(dep+".replace-original",dep);
    const target=path.join(temp,"target");fs.writeFileSync(target,"good",{mode:0o600});
    assert.throws(()=>readExactAt(temp,"dep",8,{beforeOpen:absolute=>{fs.renameSync(absolute,absolute+".symlink-original");fs.symlinkSync("target",absolute);}}),err=>err&&err.code==="ELOOP");
    fs.rmSync(dep,{force:true});fs.renameSync(dep+".symlink-original",dep);
    assert.throws(()=>readExactAt(temp,"dep",8,{beforeOpen:absolute=>{fs.renameSync(absolute,absolute+".fifo-original");run("/usr/bin/mkfifo",[absolute],{timeout:5000});fs.chmodSync(absolute,0o600);}}),/invalid_opened_file:dep/);
    fs.rmSync(dep,{force:true});fs.renameSync(dep+".fifo-original",dep);
    fs.writeFileSync(dep,"123456789",{mode:0o600});
    assert.throws(()=>readExactAt(temp,"dep",8),/invalid_file:dep/);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
function verifyBranch(){
  git(["merge-base","--is-ancestor",CANDIDATE_HEAD,"HEAD"]);
  assert.equal(git(["merge-base",CANDIDATE_HEAD,"HEAD"]),CANDIDATE_HEAD,"candidate_parent_not_exact_merge_base");
  assert.equal(git(["rev-parse","HEAD:"+CANDIDATE]),CANDIDATE_BLOB,"candidate_blob_drift");
  assert.equal(git(["rev-parse","HEAD:"+CANDIDATE_PROOF]),CANDIDATE_PROOF_BLOB,"candidate_proof_blob_drift");
  assert.equal(git(["rev-parse","HEAD:"+DISPATCH_V4]),DISPATCH_V4_BLOB,"dispatch_v4_blob_drift");
  assert.equal(git(["rev-parse","HEAD:"+V3_CANDIDATE]),V3_CANDIDATE_BLOB,"v3_candidate_drift");
  assert.equal(git(["rev-parse","HEAD:"+V3_LOCK]),V3_LOCK_BLOB,"v3_lock_drift");
  assert.equal(git(["rev-parse","HEAD:"+LOCK]),LOCK_BLOB,"lock_blob_drift");
  const changed=git(["diff","--name-status",CANDIDATE_HEAD,"HEAD","--"]).split("\n").filter(Boolean).sort();
  assert.deepEqual(changed,EXPECTED_DELTA.map(p=>"A\t"+p).sort(),"lock_scope_not_four_add_only");
}
function candidateBytes(){
  const bytes=readExact(CANDIDATE,64*1024);
  assert.equal(bytes.length,CANDIDATE_BYTES,"candidate_bytes");
  assert.equal(sha256(bytes),CANDIDATE_SHA256,"candidate_sha256");
  assert.equal(gitBlob(bytes),CANDIDATE_BLOB,"candidate_git_blob");
  const c=JSON.parse(bytes.toString("utf8"));
  assert.equal(c.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V4");
  assert.equal(c.version,4);assert.equal(c.repository,"6ZoSo9/void-node");
  assert.equal(c.current_enforcement_parent,CURRENT_PARENT);
  assert.equal(c.current_enforcement_tracked_source_inventory_count,49);
  assert.equal(c.current_enforcement_tracked_source_inventory_v1?.length,49);
  assert.equal(c.current_enforcement_tracked_source_inventory_sha256,CURRENT_INVENTORY);
  assert.equal(c.candidate_enforcement_set_sha256,CANDIDATE_SET);
  assert.equal(c.complete_executable_closure_verified,true);
  assert.equal(c.candidate_enforcement_identity_accepted,false);
  assert.equal(c.deployed_artifact_generation_verified,false);
  assert.equal(c.runtime_mount_authority,false);
  assert.equal(c.production_source_finality_authority_ready,false);
  assert.equal(c.public_presale_activation,false);assert.equal(c.funds_movement,false);
  assert.equal(c.successor_transition?.predecessor_candidate_git_blob_sha1,V3_CANDIDATE_BLOB);
  assert.equal(c.successor_transition?.predecessor_lock_git_blob_sha1,V3_LOCK_BLOB);
  assert.equal(c.successor_transition?.current_protected_inventory_sha256,CURRENT_INVENTORY);
  assert.equal(c.successor_transition?.reviewed_protected_drift_count,1);
  assert.equal(c.successor_transition?.predecessor_tool_git_blob_sha1,PREDECESSOR_TOOL);
  assert.equal(c.successor_transition?.current_tool_git_blob_sha1,CURRENT_TOOL);
  assert.equal(c.successor_transition?.production_tracked_file_nonblocking,true);
  assert.equal(c.successor_transition?.production_tracked_file_fifo_swap_rejected,true);
  return c;
}
function expectedBytes(){return Buffer.from(JSON.stringify(EXPECTED_LOCK,null,2)+"\n","utf8");}
function verify(){
  proveReaderBoundary();verifyBranch();candidateBytes();
  const actual=readExact(LOCK,64*1024),expected=expectedBytes();
  assert.equal(gitBlob(actual),LOCK_BLOB,"lock_git_blob");
  assert.ok(actual.equals(expected),"lock_manifest_not_exact");
  const l=JSON.parse(actual.toString("utf8"));
  assert.equal(l.candidate_identity_lock_evidence_verified,true);
  assert.equal(l.candidate_enforcement_identity_accepted,false);
  assert.equal(l.independent_review_complete,false);
  assert.equal(l.candidate_acceptance_lifecycle_ready,false);
  assert.equal(l.downstream_candidate_v5_derivation_ready,false);
  assert.equal(l.deployed_artifact_generation_verified,false);
  assert.equal(l.runtime_mount_authority,false);
  assert.equal(l.production_source_finality_authority_ready,false);
  assert.equal(l.public_presale_activation,false);
  assert.equal(l.funds_movement,false);
  return expected;
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--derive")process.stdout.write(verify());
else if(args.length===0||(args.length===1&&args[0]==="--self-test")){
  const bytes=verify();
  console.log("VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V4_READER_REPAIR_V1_GREEN");
  console.log("candidate_head="+CANDIDATE_HEAD);
  console.log("candidate_workflow_run="+RUN);
  console.log("candidate_node22_artifact_id="+ARTIFACTS[22]);
  console.log("candidate_node24_artifact_id="+ARTIFACTS[24]);
  console.log("candidate_node26_artifact_id="+ARTIFACTS[26]);
  console.log("candidate_cross_node_job_id="+CROSS_JOB);
  console.log("candidate_json_sha256="+CANDIDATE_SHA256);
  console.log("candidate_git_blob_sha1="+CANDIDATE_BLOB);
  console.log("candidate_enforcement_set_sha256="+CANDIDATE_SET);
  console.log("current_enforcement_tracked_source_inventory_sha256="+CURRENT_INVENTORY);
  console.log("descriptor_bounded_read_required=true");
  console.log("nofollow_nonblocking_open_required=true");
  console.log("regular_replacement_generation_rejected=true");
  console.log("symlink_swap_rejected=true");
  console.log("fifo_swap_nonblocking_rejected=true");
  console.log("oversize_input_rejected=true");
  console.log("candidate_identity_lock_evidence_verified=true");
  console.log("candidate_enforcement_identity_accepted=false");
  console.log("independent_review_complete=false");
  console.log("candidate_acceptance_lifecycle_ready=false");
  console.log("downstream_candidate_v5_derivation_ready=false");
  console.log("deployed_artifact_generation_verified=false");
  console.log("runtime_mount_authority=false");
  console.log("production_source_finality_authority_ready=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
  console.log("lock_json_sha256="+sha256(bytes));
}else throw Error("usage: proof [--self-test|--derive]");
