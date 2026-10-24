#!/usr/bin/env node
import assert from "node:assert/strict";import crypto from "node:crypto";import {spawnSync} from "node:child_process";import fs from "node:fs";import path from "node:path";import {fileURLToPath} from "node:url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),".."),BASE="9d1fba7fc676f3f5592eb7a4dff971cd7045e1b5",SELF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_candidate_v3.mjs",CANDIDATE="ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v3.json",DOC="docs/architecture/buy-void-enforcement-final-protected-v7-v2-deployment-successor-v3.md",WORKFLOW=".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v2.yml";
const V2="ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v2.json",V2_BLOB="4e23ecbb64eb26c14f5ab15af85eb86d59c3a718",LOCK2="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v2.json",LOCK2_BLOB="589845615654da8b688764377b34296267ac0063",DISPATCH="scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v2.mjs",DISPATCH_BLOB="5f5e76a594c358639571a190dc48fc9e11fc8b01",INSTALLER="ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts",INSTALLER_BLOB="3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0",OLD_INDEX="123ec1792a027f93d4c9030749a0e7e136a75a44",NEW_INDEX="a09661797aa4295371c036be36d82995e5233269";
const INV="65880eb31fd75bc07b8c568ada5a4903a2c178108408e2a8390c15b3cafb7589",SET="4d06da56a3fa3fa7891c64a0c7191756c344effb62b330a1b003bd4952dc0223",CANDIDATE_SHA="7f9c032bb3685d0d45f439123878af0ba366bd587e29a98df3270f0f13808c96",CANDIDATE_BLOB="40c7d21e0f22bc2ffe079f80360af342f4d8a6aa",DELTA=Object.freeze([CANDIDATE,SELF,DOC,WORKFLOW].sort());
const sha=b=>crypto.createHash("sha256").update(b).digest("hex"),blob=b=>crypto.createHash("sha1").update(Buffer.from("blob "+b.length+"\0")).update(b).digest("hex");
function canonical(v){if(v===null||typeof v==="boolean"||typeof v==="string")return JSON.stringify(v);if(typeof v==="number"){assert.ok(Number.isSafeInteger(v));return String(v);}if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";}
function run(c,a){const r=spawnSync(c,a,{cwd:ROOT,encoding:null,stdio:["ignore","pipe","pipe"],timeout:180000,maxBuffer:16*1024*1024,env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",NODE_ENV:"test",GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",GIT_CONFIG_SYSTEM:"/dev/null",GIT_NO_REPLACE_OBJECTS:"1",GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0"}});assert.equal(r.error,undefined,String(r.error||""));assert.equal(r.status,0,String(r.stderr||r.stdout||""));return r;}
const git=a=>String(run("/usr/bin/git",["--no-replace-objects","-C",ROOT,...a]).stdout||"").trim();
function readStable(p,max=256*1024){const a=path.join(ROOT,...p.split("/")),s=fs.lstatSync(a);assert.ok(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1&&s.size>0&&s.size<=max);const b=fs.readFileSync(a),t=fs.lstatSync(a);for(const k of ["dev","ino","size","mtimeMs","ctimeMs","nlink","mode"])assert.equal(t[k],s[k],"file_changed:"+p+":"+k);return {bytes:b,stat:t};}
function read(p,max=256*1024){return readStable(p,max).bytes;}
function pin(p,h,m){const b=read(p,m);assert.equal(blob(b),h);assert.equal(git(["rev-parse","HEAD:"+p]),h);return b;}
function currentRows(oldRows){
  assert.ok(Array.isArray(oldRows));assert.equal(oldRows.length,49);
  return oldRows.map(old=>{
    assert.ok(old&&typeof old==="object"&&!Array.isArray(old));
    assert.equal(typeof old.path,"string");assert.match(old.path,/^[A-Za-z0-9._/-]+$/u);
    const observed=readStable(old.path,4*1024*1024),b=observed.bytes,visible=blob(b),head=git(["rev-parse","HEAD:"+old.path]);
    assert.equal(visible,head,"worktree_head_blob_mismatch:"+old.path);
    const entry=git(["ls-tree","HEAD","--",old.path]);
    const m=entry.match(/^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/u);
    assert.ok(m,"tree_entry_invalid:"+old.path);assert.equal(m[2],head);assert.equal(m[3],old.path);
    const visibleMode=(observed.stat.mode&0o111)!==0?"100755":"100644";
    assert.equal(visibleMode,m[1],"worktree_tree_mode_mismatch:"+old.path);
    return {path:old.path,git_blob_sha1:head,git_mode:visibleMode};
  });
}
function derive(){git(["merge-base","--is-ancestor",BASE,"HEAD"]);assert.deepEqual(git(["diff","--name-only",BASE,"HEAD","--"]).split("\n").filter(Boolean).sort(),DELTA);
 pin(INSTALLER,INSTALLER_BLOB,256*1024);const v2=JSON.parse(pin(V2,V2_BLOB,64*1024)),l2=JSON.parse(pin(LOCK2,LOCK2_BLOB,64*1024));assert.equal(l2.candidate_enforcement_identity_accepted,true);
 const dispatchSource=pin(DISPATCH,DISPATCH_BLOB,256*1024).toString("utf8");
 const dispatchTokens=[
  'path:"src/index.ts"',
  'frozen_blob:"123ec1792a027f93d4c9030749a0e7e136a75a44"',
  'current_blob:"a09661797aa4295371c036be36d82995e5233269"',
  'mode:"100644"',
  'assert.equal(reviewedProtectedDriftCount,1,"reviewed_protected_drift_count")',
  'protected_path_identity_preserved:false',
  'frozen_protected_inventory_preserved:true',
  'reviewed_range_index_successor_bound:true',
  'frozen_candidate_rederived_on_current_head:false',
  'current_built_census_identity_matches_frozen_v4:true',
  'provider_source_identity_preserved:true',
  'current_generation_integration_verified:true',
  'deployed_artifact_generation_verified:false',
  'runtime_mount_authority:false',
  'production_source_finality_authority_ready:false',
  'public_presale_activation:false',
  'funds_movement:false',
 ];
 for(const token of dispatchTokens)assert.ok(dispatchSource.includes(token),"dispatch_v2_contract_token_missing:"+token);
 assert.ok(!dispatchSource.includes('current_blob:"123ec1792a027f93d4c9030749a0e7e136a75a44"'),"dispatch_v2_current_index_regressed");
 const old=v2.current_enforcement_tracked_source_inventory_v1,rows=currentRows(old);let drift=0;for(let i=0;i<rows.length;i++){assert.equal(rows[i].path,old[i].path);assert.equal(rows[i].git_mode,old[i].git_mode);if(rows[i].git_blob_sha1!==old[i].git_blob_sha1){drift++;assert.equal(rows[i].path,"src/index.ts");assert.equal(old[i].git_blob_sha1,OLD_INDEX);assert.equal(rows[i].git_blob_sha1,NEW_INDEX);}}assert.equal(drift,1);assert.equal(sha(Buffer.from(canonical(rows))),INV);
 const tr={predecessor_candidate_path:V2,predecessor_candidate_git_blob_sha1:V2_BLOB,predecessor_lock_path:LOCK2,predecessor_lock_git_blob_sha1:LOCK2_BLOB,dispatch_v2_proof_path:DISPATCH,dispatch_v2_proof_git_blob_sha1:DISPATCH_BLOB,frozen_protected_inventory_sha256:v2.current_enforcement_tracked_source_inventory_sha256,reviewed_protected_drift_count:1,reviewed_range_index_successor_bound:true,predecessor_index_git_blob_sha1:OLD_INDEX,current_index_git_blob_sha1:NEW_INDEX,predecessor_candidate_preserved:true,current_candidate_rederived:true};
 const b={...v2,schema:"void_buy_void_enforcement_final_protected_v7_v2_candidate_v3",marker:"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V3",version:3,current_enforcement_parent:BASE,current_enforcement_tracked_source_inventory_v1:rows,current_enforcement_tracked_source_inventory_count:49,current_enforcement_tracked_source_inventory_sha256:INV,current_enforcement_tracked_source_inventory_verified:true,current_enforcement_parent_path_identity_preserved:true,candidate_enforcement_identity_accepted:false,deployed_artifact_generation_verified:false,runtime_mount_authority:false,production_source_finality_authority_ready:false,public_presale_activation:false,funds_movement:false,successor_transition:tr};delete b.candidate_enforcement_set_sha256;return {...b,candidate_enforcement_set_sha256:sha(Buffer.from(canonical(b)))};
}
function exact(){const c=derive(),b=Buffer.from(JSON.stringify(c,null,2)+"\n");assert.equal(sha(b),CANDIDATE_SHA);assert.equal(blob(b),CANDIDATE_BLOB);assert.equal(c.candidate_enforcement_set_sha256,SET);return b;}
if(process.argv[2]==="--derive")process.stdout.write(exact());else{const b=exact();assert.ok(read(CANDIDATE,64*1024).equals(b));const c=JSON.parse(b);assert.equal(c.candidate_enforcement_identity_accepted,false);assert.equal(c.production_source_finality_authority_ready,false);assert.equal(c.public_presale_activation,false);assert.equal(c.funds_movement,false);console.log("VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V3_GREEN");console.log("reviewed_protected_drift_count=1");console.log("candidate_enforcement_set_sha256="+SET);console.log("candidate_enforcement_identity_accepted=false");console.log("funds_movement=false");}
