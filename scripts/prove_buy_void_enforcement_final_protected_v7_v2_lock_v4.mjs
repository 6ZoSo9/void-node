#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
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
const DISPATCH="scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v4.mjs";
const DISPATCH_BLOB="9de04b5340f904b8886562727d5f9006876b7ec5";
const EVIDENCE_LOCK_HEAD="df847b817b9e8a839ffe008bbfa6a87f10e2ccd9";
const EVIDENCE_LOCK="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v4-reader-repair-v1.json";
const EVIDENCE_LOCK_BLOB="c9e50cebb0735981f946a1afbc4de6d692ced347";
const EVIDENCE_PROOF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_lock_v4_reader_repair_v1.mjs";
const EVIDENCE_PROOF_BLOB="025e2905e0a9d56cde7a2954f4c47ff4b33d0c37";
const EVIDENCE_LOCK_SHA256="8dda1fbde5414efd2bbc59f5bda5dc23551e81bca9e75e00ea1dcd2e56042abf";
const LOCK="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v4.json";
const LOCK_BLOB="4de9c2185a1359d2877b17958666f91497a91179";
const SELF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_lock_v4.mjs";
const DOC="docs/architecture/buy-void-enforcement-final-protected-v7-v2-lock-v4.md";
const WORKFLOW=".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v2.yml";
const EXPECTED_DELTA=Object.freeze([["M",".github/workflows/buy-void-delivery-dependency-provider-closure-post2865-lock-v1.yml"],["M",".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v2.yml"],["M",".github/workflows/buy-void-enforcement-final-v7-artifact-census-v4.yml"],["M",".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v1.yml"],["M",".github/workflows/buy-void-source-finality-v7-executable-delta-candidate-v1.yml"],["A","docs/architecture/buy-void-enforcement-final-protected-v7-v2-lock-v4.md"],["A","ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v4.json"],["A","scripts/prove_buy_void_enforcement_final_protected_v7_v2_lock_v4.mjs"]]);
const EXPECTED_LOCK=Object.freeze({"schema":"void_buy_void_enforcement_final_protected_v7_v2_lock_v4","marker":"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V4","version":4,"repository":"6ZoSo9/void-node","candidate_head":"827b94aabbecb915ab2cf22bba8f178b7d0568bc","candidate_hosted_evidence":{"workflow_run":40053691462,"node22_artifact_id":12544821142,"node24_artifact_id":12544756476,"node26_artifact_id":12545000635,"cross_node_job_id":120752978070,"dispatch_cross_node_job_id":120752773488,"candidate_cross_node_byte_identity_verified":true,"dispatch_cross_node_byte_identity_verified":true,"exact_candidate_head_verified":true},"candidate_evidence":{"path":"ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v4.json","derivation_proof_path":"scripts/prove_buy_void_enforcement_final_protected_v7_v2_candidate_v4.mjs","derivation_proof_git_blob_sha1":"3a7401202fee374f2a7da3f5efc0d29976f9792a","bytes":17788,"sha256":"fbf3d5fbc1efad92c7bb5bb3fb45f686d1bddb95d4a7c34cadbd862b69318c60","git_blob_sha1":"ec00f0c552e600fff38e4998e4beb128c93b481d","candidate_enforcement_set_sha256":"00e8ca31370f9c6c4fa77185ed05a9ed0554e0b2036b6c5f2e937e7839c67b1a"},"dispatch_evidence":{"path":"scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v4.mjs","git_blob_sha1":"9de04b5340f904b8886562727d5f9006876b7ec5","receipt_sha256":"f174c630b119f4083e7f4431f59ad50581a01be28cfdde5733174fe5994ea382","cross_node_byte_identity_verified":true},"reader_repair_evidence_lock":{"source_head":"df847b817b9e8a839ffe008bbfa6a87f10e2ccd9","path":"ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v4-reader-repair-v1.json","git_blob_sha1":"c9e50cebb0735981f946a1afbc4de6d692ced347","proof_path":"scripts/prove_buy_void_enforcement_final_protected_v7_v2_lock_v4_reader_repair_v1.mjs","proof_git_blob_sha1":"025e2905e0a9d56cde7a2954f4c47ff4b33d0c37","lock_json_sha256":"8dda1fbde5414efd2bbc59f5bda5dc23551e81bca9e75e00ea1dcd2e56042abf","candidate_identity_lock_evidence_verified":true,"candidate_enforcement_identity_accepted":false,"independent_review_complete":false,"candidate_acceptance_lifecycle_ready":false,"downstream_candidate_v5_derivation_ready":false},"protected_successor_evidence":{"current_enforcement_parent":"1b15fcf5070e7b8a8aa4b9348de88cf11be2ef26","predecessor_candidate_git_blob_sha1":"40c7d21e0f22bc2ffe079f80360af342f4d8a6aa","predecessor_lock_git_blob_sha1":"f1b9d661eb3363e9bf18dbeb3610c659a54219bb","dispatch_v3_proof_git_blob_sha1":"2dd9e7024eaafe4641c0d3ac7d10f542a441bb92","frozen_protected_inventory_sha256":"65880eb31fd75bc07b8c568ada5a4903a2c178108408e2a8390c15b3cafb7589","current_protected_inventory_sha256":"c87299b5d3ab7efad7b946ea3cbdc3b01bcae828141e864785743cd3d5f8e21d","reviewed_protected_drift_count":1,"reviewed_deployment_reader_successor_bound":true,"workflow_dispatch_contracts_bound":true,"production_tracked_file_nonblocking":true,"production_tracked_file_fifo_swap_rejected":true,"frozen_v4_census_proof_preserved":true,"nonprotected_economic_drift_count":3,"predecessor_tool_git_blob_sha1":"3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0","current_tool_git_blob_sha1":"e0a682ea4038ca22e3a3b97da2cac29874096c46","predecessor_candidate_preserved":true,"predecessor_lock_preserved":true,"current_candidate_rederived":true},"audited_package_runtime":{"profile_id":"voidrnpr1_08e05626e80fbd2aecc3018514aaf76e491954f8258fff996f0b2dca1c3055ac","packages_aggregate_sha256":"77622df7d483bc3f73aa39468246f6860237a3f6749a09a0284644493f3990b6","profile_canonical_sha256":"3493638417e2f02a39bb7c48a08935e299754d7474feb71a5c2a48944d3f1757"},"dependency_provider":{"provider_closure_sha256":"3b6be7b9efdc7f70b6f270f77208efab2f7321136a54cc76a7e1d34c57bd4945","provider_closure_semantic_sha256":"95112d913d45b2b03887edb97c8693eef84a72b54b61503ffc66a6a7bce67384"},"v7_executable_delta_candidate_generation_sha256":"5c5637207d5970d2ca793cf431726ff8d86db370b3e69e9ff1e5caa25d9b5224","current_enforcement_tracked_source_inventory_sha256":"c87299b5d3ab7efad7b946ea3cbdc3b01bcae828141e864785743cd3d5f8e21d","complete_executable_closure_verified":true,"current_enforcement_tracked_source_inventory_verified":true,"reader_repair_evidence_lock_consumed":true,"candidate_enforcement_identity_accepted":true,"deployed_artifact_generation_verified":false,"runtime_mount_authority":false,"production_source_finality_authority_ready":false,"public_presale_activation":false,"funds_movement":false});
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
  git(["merge-base","--is-ancestor",CANDIDATE_HEAD,"HEAD"]);
  git(["merge-base","--is-ancestor",EVIDENCE_LOCK_HEAD,"HEAD"]);
  assert.equal(git(["merge-base",EVIDENCE_LOCK_HEAD,"HEAD"]),EVIDENCE_LOCK_HEAD,"evidence_lock_merge_base");
  const rows=git(["diff","--name-status",EVIDENCE_LOCK_HEAD,"HEAD","--"]).split("\n").filter(Boolean).map(line=>{const [status,...rest]=line.split("\t");return [status,rest.join("\t")];}).sort((a,b)=>a[1].localeCompare(b[1]));
  assert.deepEqual(rows,[...EXPECTED_DELTA].sort((a,b)=>a[1].localeCompare(b[1])),"lock_scope");
  assert.equal(git(["rev-parse","HEAD:"+CANDIDATE]),CANDIDATE_BLOB);
  assert.equal(git(["rev-parse","HEAD:"+CANDIDATE_PROOF]),CANDIDATE_PROOF_BLOB);
  assert.equal(git(["rev-parse","HEAD:"+DISPATCH]),DISPATCH_BLOB);
  assert.equal(git(["rev-parse","HEAD:"+EVIDENCE_LOCK]),EVIDENCE_LOCK_BLOB);
  assert.equal(git(["rev-parse","HEAD:"+EVIDENCE_PROOF]),EVIDENCE_PROOF_BLOB);
  assert.equal(git(["rev-parse","HEAD:"+LOCK]),LOCK_BLOB);
}
function evidenceLock(){
  const bytes=read(EVIDENCE_LOCK,128*1024);
  assert.equal(sha256(bytes),EVIDENCE_LOCK_SHA256,"evidence_lock_sha256");
  assert.equal(gitBlob(bytes),EVIDENCE_LOCK_BLOB,"evidence_lock_blob");
  const value=JSON.parse(bytes.toString("utf8"));
  assert.equal(value.candidate_head,CANDIDATE_HEAD);
  assert.equal(value.candidate_identity_lock_evidence_verified,true);
  assert.equal(value.candidate_enforcement_identity_accepted,false);
  assert.equal(value.independent_review_complete,false);
  assert.equal(value.candidate_acceptance_lifecycle_ready,false);
  assert.equal(value.downstream_candidate_v5_derivation_ready,false);
  assert.equal(value.deployed_artifact_generation_verified,false);
  assert.equal(value.runtime_mount_authority,false);
  assert.equal(value.production_source_finality_authority_ready,false);
  assert.equal(value.public_presale_activation,false);
  assert.equal(value.funds_movement,false);
  return value;
}
function candidate(){
  const bytes=read(CANDIDATE,128*1024);assert.equal(bytes.length,CANDIDATE_BYTES);assert.equal(sha256(bytes),CANDIDATE_SHA256);assert.equal(gitBlob(bytes),CANDIDATE_BLOB);const c=JSON.parse(bytes.toString("utf8"));
  assert.equal(c.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V4");assert.equal(c.version,4);assert.equal(c.current_enforcement_parent,"1b15fcf5070e7b8a8aa4b9348de88cf11be2ef26");assert.equal(c.current_enforcement_tracked_source_inventory_count,49);assert.equal(c.current_enforcement_tracked_source_inventory_sha256,"c87299b5d3ab7efad7b946ea3cbdc3b01bcae828141e864785743cd3d5f8e21d");assert.equal(c.candidate_enforcement_set_sha256,CANDIDATE_SET);assert.equal(c.successor_transition?.predecessor_tool_git_blob_sha1,"3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0");assert.equal(c.successor_transition?.current_tool_git_blob_sha1,"e0a682ea4038ca22e3a3b97da2cac29874096c46");assert.equal(c.successor_transition?.reviewed_protected_drift_count,1);assert.equal(c.candidate_enforcement_identity_accepted,false);assert.equal(c.production_source_finality_authority_ready,false);assert.equal(c.public_presale_activation,false);assert.equal(c.funds_movement,false);return c;
}
function expectedBytes(){return Buffer.from(JSON.stringify(EXPECTED_LOCK,null,2)+"\n");}
function verifyPrerequisites(){verifyBranch();proveReader();evidenceLock();candidate();}
function proveStandaloneDeriveFailClosed(){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"void-v4-lock-standalone-"));
  try{
    const scripts=path.join(temp,"scripts");fs.mkdirSync(scripts,{recursive:true});
    const copy=path.join(scripts,path.basename(SELF));
    fs.copyFileSync(path.join(ROOT,SELF),copy);
    const r=spawnSync(process.execPath,[copy,"--derive"],{
      cwd:temp,encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:30000,maxBuffer:8*1024*1024,
      env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",
        NODE_ENV:"test",GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",
        GIT_CONFIG_SYSTEM:"/dev/null",GIT_NO_REPLACE_OBJECTS:"1",GIT_OPTIONAL_LOCKS:"0",
        GIT_TERMINAL_PROMPT:"0"}
    });
    assert.equal(r.error,undefined,String(r.error||""));
    assert.notEqual(r.status,0,"standalone_derive_must_fail_closed");
    assert.equal(String(r.stdout||"").trim(),"","standalone_derive_emitted_accepted_bytes");
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
function verify(){verifyPrerequisites();const bytes=read(LOCK,128*1024);assert.ok(bytes.equals(expectedBytes()),"lock_bytes");assert.equal(gitBlob(bytes),LOCK_BLOB);const value=JSON.parse(bytes);assert.equal(value.candidate_enforcement_identity_accepted,true);assert.equal(value.deployed_artifact_generation_verified,false);assert.equal(value.runtime_mount_authority,false);assert.equal(value.production_source_finality_authority_ready,false);assert.equal(value.public_presale_activation,false);assert.equal(value.funds_movement,false);return value;}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--derive"){verifyPrerequisites();process.stdout.write(expectedBytes());}
else if(args.length===1&&args[0]==="--reader-self-test"){proveReader();console.log("VOID_BUY_VOID_V4_LOCK_READER_SELF_TEST_GREEN");}
else if(args.length===0||(args.length===1&&args[0]==="--self-test")){const value=verify();proveStandaloneDeriveFailClosed();console.log("VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V4_GREEN");console.log("standalone_derive_requires_predecessor_evidence=true");console.log("candidate_enforcement_identity_accepted="+value.candidate_enforcement_identity_accepted);console.log("production_source_finality_authority_ready=false");console.log("public_presale_activation=false");console.log("funds_movement=false");}
else throw new Error("usage: "+SELF+" [--derive|--reader-self-test|--self-test]");
