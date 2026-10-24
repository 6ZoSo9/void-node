#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";

const MARKER="VOID_BUY_VOID_PROTECTED_V4_LOCK_CANONICAL_V5_COMPOSITION_V2";
const COMPOSITION_PREDECESSOR="c1b00b856fb996cad5d5a1d1f84c1bce27a2878c";
const PRIOR_COMPOSITION_PARENT="94a07497a1583ec990ac0ca665604bebf570b5e7";
const ACCEPTED_LOCK_PARENT="f504843c457403b95b4e9887a190f0677f820c31";
const V5_SOURCE_HEAD="c6f31c19ef3def20902b2c2b735de0803b2a2ab0";
const RANGE_INDEX_BLOB="a09661797aa4295371c036be36d82995e5233269";
const CANDIDATE_PATH="ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v4.json";
const CANDIDATE_BLOB="ec00f0c552e600fff38e4998e4beb128c93b481d";
const LOCK_PATH="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v4.json";
const LOCK_BLOB="4de9c2185a1359d2877b17958666f91497a91179";
const LOCK_PROOF_PATH="scripts/prove_buy_void_enforcement_final_protected_v7_v2_lock_v4.mjs";
const LOCK_PROOF_BLOB="15c33b8c88db7d31af96bbd50ed4940425ff7417";
const LOCK_DOC_PATH="docs/architecture/buy-void-enforcement-final-protected-v7-v2-lock-v4.md";
const LOCK_DOC_BLOB="2ef2554fdc0cba8f194c74b2f7c53bf1377e3814";
const LOCK_WORKFLOW_PATH=".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v2.yml";
const LOCK_WORKFLOW_BLOB="bf4d059202ed62449fbc6cfe62402aaa73b22682";
const RUNNER_PATH="ops/run-void-node-live-v1.sh";
const V4_RUNNER_BLOB="6fb040de128ce0df16e848d61ea5f4acb62794da";
const V5_RUNNER_BLOB="bc6a17ccdf389299fb139db37e742f0b1ad9dc4e";
const EXPECTED_V5_INVENTORY="7b56a1e130f2a2caa7ca29c6319dbe8823bc2147931ee2d7c7ba6f077a2d18c3";
const OLD_COMPOSITION_PATHS=Object.freeze([
  "scripts/prove_buy_void_protected_v4_canonical_v5_composition_v1.mjs",
  "docs/architecture/buy-void-protected-v4-canonical-v5-composition-v1.md",
  ".github/workflows/buy-void-protected-v4-canonical-v5-composition-v1.yml",
]);
const V5=Object.freeze([
  {
    "path": ".github/workflows/canonical-producer-legacy-self-http-observers-v1.yml",
    "sha": "6ca515aac5a1fdc42e38aeb59b4b2f0638b679a7",
    "mode": "100644"
  },
  {
    "path": ".github/workflows/void-live-agent-jsonl-runtime-wedge-v1.yml",
    "sha": "05f264e1d2590b3f448adc63c6a4acb5703f7847",
    "mode": "100644"
  },
  {
    "path": "docs/operations/canonical-producer-source-custody-v1.md",
    "sha": "3585e8abc0fefdf854e8ecad232af031573934b7",
    "mode": "100644"
  },
  {
    "path": "ops/run-void-node-live-v1.sh",
    "sha": "bc6a17ccdf389299fb139db37e742f0b1ad9dc4e",
    "mode": "100755"
  },
  {
    "path": "runtime/canonical-producer-self-http-guard-v5.cjs",
    "sha": "72a84059b2558092fe853b6305493257fca4c76c",
    "mode": "100644"
  },
  {
    "path": "scripts/prove_canonical_producer_legacy_self_http_observers_current_v5.mjs",
    "sha": "871d3663628edcf767a77a1d0ee1f60dd5b59ad7",
    "mode": "100644"
  },
  {
    "path": "scripts/prove_canonical_producer_source_generation_dispatch_v5.mjs",
    "sha": "a9b8a5cc8d330feb2e0772042a641eb9b9a787a1",
    "mode": "100644"
  }
]);
const EXPECTED_STATUS=Object.freeze({
  ".github/workflows/buy-void-protected-v4-lock-canonical-v5-composition-v2.yml": "A",
  ".github/workflows/canonical-producer-legacy-self-http-observers-v1.yml": "M",
  ".github/workflows/void-live-agent-jsonl-runtime-wedge-v1.yml": "M",
  "docs/architecture/buy-void-protected-v4-lock-canonical-v5-composition-v2.md": "A",
  "docs/operations/canonical-producer-source-custody-v1.md": "M",
  "ops/run-void-node-live-v1.sh": "M",
  "runtime/canonical-producer-self-http-guard-v5.cjs": "A",
  "scripts/prove_buy_void_protected_v4_lock_canonical_v5_composition_v2.mjs": "A",
  "scripts/prove_canonical_producer_legacy_self_http_observers_current_v5.mjs": "A",
  "scripts/prove_canonical_producer_source_generation_dispatch_v5.mjs": "A"
});

function git(args){
  return execFileSync("/usr/bin/git",args,{
    encoding:"utf8",
    env:{
      PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",
      GIT_CONFIG_GLOBAL:"/dev/null",GIT_CONFIG_SYSTEM:"/dev/null",
      GIT_NO_REPLACE_OBJECTS:"1",GIT_OPTIONAL_LOCKS:"0",
      GIT_TERMINAL_PROMPT:"0",GIT_ASKPASS:"/bin/false",
    },
  }).trim();
}
function blob(ref,path){return git(["rev-parse",ref+":"+path]);}
function mode(ref,path){
  const row=git(["ls-tree",ref,"--",path]);
  const match=row.match(/^(100644|100755) blob [0-9a-f]{40}\t(.+)$/u);
  assert.ok(match,"invalid_tree_entry:"+ref+":"+path);
  assert.equal(match[2],path,"tree_path_mismatch:"+path);
  return match[1];
}
function absent(ref,path){
  const result=spawnSync("/usr/bin/git",["cat-file","-e",ref+":"+path],{
    stdio:"ignore",
    env:{
      PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",
      GIT_CONFIG_GLOBAL:"/dev/null",GIT_CONFIG_SYSTEM:"/dev/null",
      GIT_NO_REPLACE_OBJECTS:"1",GIT_OPTIONAL_LOCKS:"0",
      GIT_TERMINAL_PROMPT:"0",GIT_ASKPASS:"/bin/false",
    },
  });
  return result.status!==0;
}
const sha256=bytes=>crypto.createHash("sha256").update(bytes).digest("hex");

const repairParents=git(["rev-list","--parents","-n","1","HEAD"]).split(/\s+/u);
assert.equal(repairParents.length,2,"composition_repair_single_parent_required");
assert.equal(repairParents[1],COMPOSITION_PREDECESSOR,"composition_repair_parent_mismatch");
const predecessorParents=git(["rev-list","--parents","-n","1",COMPOSITION_PREDECESSOR]).split(/\s+/u);
assert.equal(predecessorParents.length,3,"composition_predecessor_two_parents_required");
assert.equal(predecessorParents[1],PRIOR_COMPOSITION_PARENT,"prior_composition_parent_mismatch");
assert.equal(predecessorParents[2],ACCEPTED_LOCK_PARENT,"accepted_lock_parent_mismatch");
const repairRows=git(["diff","--name-status",COMPOSITION_PREDECESSOR,"HEAD"])
  .split(/\n/u).filter(Boolean).sort();
assert.deepEqual(repairRows,[
  "M\t.github/workflows/buy-void-protected-v4-lock-canonical-v5-composition-v2.yml",
  "M\tdocs/architecture/buy-void-protected-v4-lock-canonical-v5-composition-v2.md",
  "M\tscripts/prove_buy_void_protected_v4_lock_canonical_v5_composition_v2.mjs",
].sort(),"composition_repair_scope_mismatch");

assert.equal(blob("HEAD","src/index.ts"),RANGE_INDEX_BLOB);
assert.equal(blob(ACCEPTED_LOCK_PARENT,"src/index.ts"),RANGE_INDEX_BLOB);
assert.equal(blob(V5_SOURCE_HEAD,"src/index.ts"),RANGE_INDEX_BLOB);

for(const row of V5){
  assert.equal(blob(V5_SOURCE_HEAD,row.path),row.sha,"v5_source_drift:"+row.path);
  assert.equal(blob("HEAD",row.path),row.sha,"composition_v5_drift:"+row.path);
  assert.equal(mode("HEAD",row.path),row.mode,"composition_v5_mode_drift:"+row.path);
}
for(const path of OLD_COMPOSITION_PATHS){
  assert.equal(absent("HEAD",path),true,"superseded_v1_path_present:"+path);
}
for(const row of [
  [CANDIDATE_PATH,CANDIDATE_BLOB],
  [LOCK_PATH,LOCK_BLOB],
  [LOCK_PROOF_PATH,LOCK_PROOF_BLOB],
  [LOCK_DOC_PATH,LOCK_DOC_BLOB],
  [LOCK_WORKFLOW_PATH,LOCK_WORKFLOW_BLOB],
]){
  assert.equal(blob(ACCEPTED_LOCK_PARENT,row[0]),row[1],"accepted_parent_drift:"+row[0]);
  assert.equal(blob("HEAD",row[0]),row[1],"accepted_lock_composition_drift:"+row[0]);
}

const candidate=JSON.parse(fs.readFileSync(CANDIDATE_PATH,"utf8"));
assert.equal(candidate.candidate_enforcement_identity_accepted,false);
assert.equal(candidate.deployed_artifact_generation_verified,false);
assert.equal(candidate.runtime_mount_authority,false);
assert.equal(candidate.production_source_finality_authority_ready,false);
assert.equal(candidate.public_presale_activation,false);
assert.equal(candidate.funds_movement,false);

const lock=JSON.parse(fs.readFileSync(LOCK_PATH,"utf8"));
assert.equal(lock.candidate_head,"827b94aabbecb915ab2cf22bba8f178b7d0568bc");
assert.equal(lock.candidate_evidence?.git_blob_sha1,CANDIDATE_BLOB);
assert.equal(
  lock.candidate_evidence?.candidate_enforcement_set_sha256,
  "00e8ca31370f9c6c4fa77185ed05a9ed0554e0b2036b6c5f2e937e7839c67b1a",
);
assert.equal(lock.candidate_enforcement_identity_accepted,true);
assert.equal(lock.complete_executable_closure_verified,true);
assert.equal(lock.deployed_artifact_generation_verified,false);
assert.equal(lock.runtime_mount_authority,false);
assert.equal(lock.production_source_finality_authority_ready,false);
assert.equal(lock.public_presale_activation,false);
assert.equal(lock.funds_movement,false);

const inventory=candidate.current_enforcement_tracked_source_inventory_v1;
assert.ok(Array.isArray(inventory));
assert.equal(inventory.length,49);
const current=[];
const mismatches=[];
for(const row of inventory){
  const actualBlob=blob("HEAD",row.path);
  const actualMode=mode("HEAD",row.path);
  const currentRow=Object.freeze({
    path:row.path,git_blob_sha1:actualBlob,git_mode:actualMode,
  });
  current.push(currentRow);
  if(actualBlob!==row.git_blob_sha1||actualMode!==row.git_mode){
    mismatches.push(Object.freeze({
      path:row.path,
      candidate_blob:row.git_blob_sha1,
      candidate_mode:row.git_mode,
      current_blob:actualBlob,
      current_mode:actualMode,
    }));
  }
}
assert.equal(mismatches.length,1,"candidate_v4_mismatch_count");
assert.deepEqual(mismatches[0],{
  path:RUNNER_PATH,
  candidate_blob:V4_RUNNER_BLOB,
  candidate_mode:"100755",
  current_blob:V5_RUNNER_BLOB,
  current_mode:"100755",
});
const currentInventorySha256=sha256(
  Buffer.from(JSON.stringify(current)+"\n","utf8"),
);
assert.equal(currentInventorySha256,EXPECTED_V5_INVENTORY,"current_v5_inventory_digest");

const statusRows=git(["diff","--name-status",ACCEPTED_LOCK_PARENT,"HEAD"])
  .split(/\n/u).filter(Boolean);
const actualStatus={};
for(const row of statusRows){
  const match=row.match(/^([AM])\t(.+)$/u);
  assert.ok(match,"composition_status_invalid:"+row);
  actualStatus[match[2]]=match[1];
}
assert.deepEqual(actualStatus,EXPECTED_STATUS,"composition_scope_mismatch");
git(["diff","--check",ACCEPTED_LOCK_PARENT,"HEAD"]);

const v5=spawnSync(
  process.execPath,
  ["scripts/prove_canonical_producer_source_generation_dispatch_v5.mjs"],
  {encoding:"utf8",stdio:["ignore","pipe","pipe"]},
);
assert.equal(v5.error,undefined,String(v5.error||""));
assert.equal(v5.signal,null,"v5_dispatch_signal");
assert.equal(v5.status,0,String(v5.stderr||v5.stdout||""));
assert.match(
  String(v5.stdout||""),
  /VOID_CANONICAL_PRODUCER_SOURCE_GENERATION_DISPATCH_V5_GREEN/u,
);

const receipt=Object.freeze({
  marker:MARKER,
  composition_predecessor:COMPOSITION_PREDECESSOR,
  prior_composition_parent:PRIOR_COMPOSITION_PARENT,
  accepted_lock_parent:ACCEPTED_LOCK_PARENT,
  provenance_repair_scope_verified:true,
  v5_source_head:V5_SOURCE_HEAD,
  range_index_blob:RANGE_INDEX_BLOB,
  candidate_v4_blob:CANDIDATE_BLOB,
  lock_v4_blob:LOCK_BLOB,
  accepted_v4_lock_preserved:true,
  accepted_v4_candidate_preserved:true,
  accepted_v4_candidate_source_identity:true,
  candidate_v4_mismatch_count:mismatches.length,
  candidate_v4_mismatch_path:mismatches[0].path,
  candidate_v4_runner_blob:mismatches[0].candidate_blob,
  current_v5_runner_blob:mismatches[0].current_blob,
  current_inventory_sha256:currentInventorySha256,
  prior_composition_v1_retained_in_history:true,
  prior_composition_v1_present_in_current_tree:false,
  candidate_v5_required:true,
  candidate_v5_created:false,
  candidate_v5_accepted:false,
  deployment_receipt_reissue_required:true,
  runtime_cutover_authorized:false,
  service_mutation:false,
  credential_wallet_signer_transaction_authority:false,
  public_presale_activation:false,
  funds_movement:false,
});
if(process.argv.includes("--receipt")){
  process.stdout.write(JSON.stringify(receipt)+"\n");
}else{
  console.log(MARKER+"_GREEN");
  for(const [key,value] of Object.entries(receipt)){
    console.log(key+"="+String(value));
  }
  console.log("receipt_json="+JSON.stringify(receipt));
}
