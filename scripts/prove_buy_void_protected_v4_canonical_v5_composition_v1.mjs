#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const MARKER="VOID_BUY_VOID_PROTECTED_V4_CANONICAL_V5_COMPOSITION_V1";
const CURRENT_PARENT="e7ad76967282b342118839cb507414de47051c69";
const PROTECTED_PARENT="895c2bf320defbbca5fba6792e2a75126b2c4d76";
const RANGE_INDEX_BLOB="7df1f21c730b554c414c88c550a4475234485370";
const V4_CANDIDATE_PATH="ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v4.json";
const V4_CANDIDATE_BLOB="5893e300a78dc4ca7729ef47f95a8e3eea2043cf";
const REPAIRED_READER_PATH="ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts";
const REPAIRED_READER_BLOB="e0a682ea4038ca22e3a3b97da2cac29874096c46";
const RUNNER_PATH="ops/run-void-node-live-v1.sh";
const V4_RUNNER_BLOB="6fb040de128ce0df16e848d61ea5f4acb62794da";
const V5_RUNNER_BLOB="d7d7aede7fcd764a6182bd31f12338c5d3674ecb";
const OVERLAY=Object.freeze([
  {
    "path": ".github/workflows/buy-void-delivery-dependency-provider-closure-post2865-lock-v1.yml",
    "sha": "1e1400f9e1b5644b1504863f4ee707b960d38204",
    "mode": "100644"
  },
  {
    "path": ".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v1.yml",
    "sha": "7b351f9fde72ea6a623e6c9e9209b834b2b653db",
    "mode": "100644"
  },
  {
    "path": ".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v2.yml",
    "sha": "4257792e72aab35b07d9f297f4150622b5181325",
    "mode": "100644"
  },
  {
    "path": ".github/workflows/buy-void-enforcement-final-v7-artifact-census-v4.yml",
    "sha": "e435c518c468fa8931042da19f683d5953eaf5b0",
    "mode": "100644"
  },
  {
    "path": ".github/workflows/buy-void-source-finality-v7-deployment-receipt-v3-lock-plan-v1.yml",
    "sha": "e0467b464bcaf118b8ed038618fb8b453a02a8b7",
    "mode": "100644"
  },
  {
    "path": ".github/workflows/buy-void-source-finality-v7-executable-delta-candidate-v1.yml",
    "sha": "35053666b7e521ef37d23eedd928c7bcd54e7811",
    "mode": "100644"
  },
  {
    "path": "docs/architecture/buy-void-enforcement-final-protected-v7-v2-deployment-successor-v4.md",
    "sha": "072712622b1e4719e3a6ca55fca7cda67cfca6d3",
    "mode": "100644"
  },
  {
    "path": "docs/architecture/buy-void-repaired-v7-v2-current-generation-dispatch-v3.md",
    "sha": "7567775b241a798752c1c36091d7059a75299b85",
    "mode": "100644"
  },
  {
    "path": "docs/architecture/buy-void-repaired-v7-v2-current-generation-dispatch-v4.md",
    "sha": "b06867912569d95632299f898e3392e6d7f7e590",
    "mode": "100644"
  },
  {
    "path": "docs/architecture/buy-void-source-finality-v7-deployment-receipt-v3-lock-plan-v1.md",
    "sha": "ab6c5ac65f84ab3c66e6d60972b471e8d9fd14e2",
    "mode": "100644"
  },
  {
    "path": "ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts",
    "sha": "e0a682ea4038ca22e3a3b97da2cac29874096c46",
    "mode": "100644"
  },
  {
    "path": "ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v4.json",
    "sha": "5893e300a78dc4ca7729ef47f95a8e3eea2043cf",
    "mode": "100644"
  },
  {
    "path": "scripts/prove_buy_void_enforcement_final_protected_v7_v2_candidate_v4.mjs",
    "sha": "f33a579e62c8201de24d5076cfcbffab66df8dae",
    "mode": "100644"
  },
  {
    "path": "scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v3.mjs",
    "sha": "fba37e94a90b3d4278fd3fba10fbe6313f2f0625",
    "mode": "100644"
  },
  {
    "path": "scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v4.mjs",
    "sha": "51a51a7f85c8068269bad0e09e3ae872c4323a58",
    "mode": "100644"
  },
  {
    "path": "scripts/prove_buy_void_source_finality_v7_deployment_receipt_install_v1.ts",
    "sha": "e634e666d3a190368ddb031f936ebbb6347b7196",
    "mode": "100644"
  },
  {
    "path": "scripts/prove_buy_void_source_finality_v7_deployment_receipt_v3_lock_plan_v1.mjs",
    "sha": "9298ab67c31b4651795b88cabd9dc549dcffc27e",
    "mode": "100644"
  }
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
    "sha": "79d6bcf030beda490efbfaa37f766b6dbe51f3bd",
    "mode": "100644"
  },
  {
    "path": "ops/run-void-node-live-v1.sh",
    "sha": "d7d7aede7fcd764a6182bd31f12338c5d3674ecb",
    "mode": "100755"
  },
  {
    "path": "runtime/canonical-producer-self-http-guard-v5.cjs",
    "sha": "8f9ab041e23c7519621b4d6a4573c4fa8b302ab6",
    "mode": "100644"
  },
  {
    "path": "scripts/prove_canonical_producer_legacy_self_http_observers_current_v5.mjs",
    "sha": "95687a9691b7eec93c028c82e81000cc214d065e",
    "mode": "100644"
  },
  {
    "path": "scripts/prove_canonical_producer_source_generation_dispatch_v5.mjs",
    "sha": "0ba98fe898624f2d6507787f9aa7a8951828cd5d",
    "mode": "100644"
  }
]);

function git(args,opts={}){
  return execFileSync("/usr/bin/git",args,{
    encoding:"utf8",
    env:{
      PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",
      GIT_CONFIG_GLOBAL:"/dev/null",GIT_CONFIG_SYSTEM:"/dev/null",
      GIT_NO_REPLACE_OBJECTS:"1",GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0",
      GIT_ASKPASS:"/bin/false"
    },
    ...opts,
  }).trim();
}
function blob(ref,path){return git(["rev-parse",ref+":"+path]);}
function mode(ref,path){
  const row=git(["ls-tree",ref,"--",path]);
  const m=row.match(/^(100644|100755) blob [0-9a-f]{40}\t(.+)$/u);
  assert.ok(m,"invalid_tree_entry:"+ref+":"+path);
  assert.equal(m[2],path,"tree_path_mismatch:"+path);
  return m[1];
}
function sha256(bytes){return crypto.createHash("sha256").update(bytes).digest("hex");}

const parents=git(["rev-list","--parents","-n","1","HEAD"]).split(/\s+/u);
assert.equal(parents.length,3,"composition_two_parents_required");
assert.equal(parents[1],CURRENT_PARENT,"current_parent_mismatch");
assert.equal(parents[2],PROTECTED_PARENT,"protected_parent_mismatch");

assert.equal(blob(CURRENT_PARENT,"src/index.ts"),RANGE_INDEX_BLOB);
assert.equal(blob(PROTECTED_PARENT,"src/index.ts"),RANGE_INDEX_BLOB);
assert.equal(blob("HEAD","src/index.ts"),RANGE_INDEX_BLOB);

for(const row of OVERLAY){
  assert.equal(blob(PROTECTED_PARENT,row.path),row.sha,"protected_overlay_parent_drift:"+row.path);
  assert.equal(blob("HEAD",row.path),row.sha,"composition_overlay_drift:"+row.path);
  assert.equal(mode("HEAD",row.path),row.mode,"composition_overlay_mode_drift:"+row.path);
}
for(const row of V5){
  assert.equal(blob(CURRENT_PARENT,row.path),row.sha,"v5_parent_drift:"+row.path);
  assert.equal(blob("HEAD",row.path),row.sha,"composition_v5_drift:"+row.path);
  assert.equal(mode("HEAD",row.path),row.mode,"composition_v5_mode_drift:"+row.path);
}
assert.equal(blob("HEAD",REPAIRED_READER_PATH),REPAIRED_READER_BLOB);
assert.equal(blob("HEAD",RUNNER_PATH),V5_RUNNER_BLOB);
assert.equal(mode("HEAD",RUNNER_PATH),"100755");
assert.equal(blob(PROTECTED_PARENT,RUNNER_PATH),V4_RUNNER_BLOB);
assert.equal(blob("HEAD",V4_CANDIDATE_PATH),V4_CANDIDATE_BLOB);

const candidate=JSON.parse(fs.readFileSync(V4_CANDIDATE_PATH,"utf8"));
assert.equal(candidate.candidate_enforcement_identity_accepted,false);
assert.equal(candidate.deployed_artifact_generation_verified,false);
assert.equal(candidate.runtime_mount_authority,false);
assert.equal(candidate.production_source_finality_authority_ready,false);
assert.equal(candidate.public_presale_activation,false);
assert.equal(candidate.funds_movement,false);
const inventory=candidate.current_enforcement_tracked_source_inventory_v1;
assert.ok(Array.isArray(inventory));
assert.equal(inventory.length,49);
const current=[];
const mismatches=[];
for(const row of inventory){
  assert.ok(row&&typeof row==="object"&&!Array.isArray(row));
  const actualBlob=blob("HEAD",row.path);
  const actualMode=mode("HEAD",row.path);
  const currentRow=Object.freeze({path:row.path,git_blob_sha1:actualBlob,git_mode:actualMode});
  current.push(currentRow);
  if(actualBlob!==row.git_blob_sha1 || actualMode!==row.git_mode){
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
const currentInventorySha256=sha256(Buffer.from(JSON.stringify(current)+"\n","utf8"));

const changed=git(["diff","--name-only",CURRENT_PARENT,"HEAD"]).split(/\n/u).filter(Boolean);
const expected=[...OVERLAY.map(x=>x.path),"docs/architecture/buy-void-protected-v4-canonical-v5-composition-v1.md","scripts/prove_buy_void_protected_v4_canonical_v5_composition_v1.mjs",".github/workflows/buy-void-protected-v4-canonical-v5-composition-v1.yml"].sort();
assert.deepEqual([...changed].sort(),expected,"composition_scope_mismatch");

const receipt=Object.freeze({
  marker:MARKER,
  current_parent:CURRENT_PARENT,
  protected_parent:PROTECTED_PARENT,
  range_index_blob:RANGE_INDEX_BLOB,
  repaired_reader_blob:REPAIRED_READER_BLOB,
  candidate_v4_blob:V4_CANDIDATE_BLOB,
  candidate_v4_mismatch_count:mismatches.length,
  candidate_v4_mismatch_path:mismatches[0].path,
  candidate_v4_runner_blob:mismatches[0].candidate_blob,
  current_v5_runner_blob:mismatches[0].current_blob,
  current_inventory_sha256:currentInventorySha256,
  candidate_v5_required:true,
  candidate_v5_accepted:false,
  deployment_apply:false,
  runtime_mount_authority:false,
  public_presale_activation:false,
  funds_movement:false,
});
console.log(MARKER+"_GREEN");
for(const [k,v] of Object.entries(receipt)) console.log(k+"="+String(v));
console.log("receipt_json="+JSON.stringify(receipt));
