#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const MARKER="VOID_BUY_VOID_V7_PROTECTED_SOURCE_RECEIPT_EXCHANGE_PLAN_V1";
const PARENT="be2fbe41aaba291d3f874b9de52bcb87336307f5";
const PLAN="ops/security/buy-void-v7-protected-source-receipt-exchange-plan-v1.json";
const PLAN_BLOB="22b94916ab3e93c8f594c3d25b70ee6f9a483375";
const SELF="scripts/prove_buy_void_v7_protected_source_receipt_exchange_plan_v1.mjs";
const DOC="docs/architecture/buy-void-v7-protected-source-receipt-exchange-plan-v1.md";
const WORKFLOW=".github/workflows/buy-void-v7-protected-source-receipt-exchange-plan-v1.yml";
const EXPECTED_PLAN_ID="voidv7srcrecexchange1_bc6417cd5a3d40961ce49f45a38943732b9e7e401dc731724fb86821fdfed2c8";
const LOCK="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v5.json";
const LOCK_BLOB="bc1b2f4095315861db7a257d4cc3c80a9f112530";
const CANDIDATE="ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v5.json";
const CANDIDATE_BLOB="46e3774ca442cf593d25b6062ab5538d5ac43611";

const FIXED=Object.freeze([
  ["ops/precision/void_buy_void_source_finality_v7_native_preentry_v1.c","14fbb6759589ca2719da6a52d058891d987b2db9"],
  ["ops/precision/void_buy_void_source_finality_v7_privileged_launcher_body_v2.bash","ef0dc3b74e850d84569aab2ed2156b5cafdfeac4"],
  ["ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts","e0a682ea4038ca22e3a3b97da2cac29874096c46"],
  ["ops/precision/void_buy_void_source_finality_provider_pair_binding_receipt_install_v1.ts","6617fc49a01c3fca0bbc0629111e9bac78b5824f"],
  ["ops/precision/void_buy_void_source_finality_live_process_binding_v2_receipt_publish_v1.ts","a334ab29477dec3e36862a512191b9701debb73e"],
]);
const ATOMIC=Object.freeze([
  ["ops/precision/void_buy_void_epoch2_live_composition_native_protected_install_v5.py","fd7a06490ccf6fb14831d8b0372a892e2764c9dc"],
  ["scripts/prove_buy_void_epoch2_live_composition_native_protected_install_v5.py","938ae777b1a441a77314778eb4ea750596615b8c"],
  ["ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_bootstrap_atomic_upgrade_v1.py","3fe1158a0fdf19fa4307c2a8122314b75ee36345"],
  ["scripts/prove_buy_void_epoch2_dormant_first_entry_protected_bootstrap_atomic_upgrade_v1.py","ca96e713cbe91d69161b04dd1508137a69b37cd3"],
]);
const OWNED=Object.freeze([WORKFLOW,DOC,PLAN,SELF].sort());

function run(args){
  return execFileSync("/usr/bin/git",args,{
    cwd:ROOT,encoding:"utf8",
    env:{
      PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",
      GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",GIT_NO_REPLACE_OBJECTS:"1",
      GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0",GIT_ASKPASS:"/bin/false",
    },
  }).trim();
}
const git=args=>run(["--no-replace-objects","-c","core.hooksPath=/dev/null","-c","core.fsmonitor=false","-C",ROOT,...args]);
const sha256=b=>crypto.createHash("sha256").update(b).digest("hex");
function canonical(v){
  if(v===null||typeof v==="boolean"||typeof v==="string")return JSON.stringify(v);
  if(typeof v==="number"){assert.ok(Number.isSafeInteger(v));return String(v);}
  if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
  assert.ok(v&&typeof v==="object"&&!Array.isArray(v));
  return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
}
function pin(relative,blob){
  const actual=git(["rev-parse","HEAD:"+relative]);
  assert.equal(actual,blob,"blob_drift:"+relative);
  return fs.readFileSync(path.join(ROOT,relative),"utf8");
}
function verifyScope(){
  git(["merge-base","--is-ancestor",PARENT,"HEAD"]);
  assert.equal(git(["merge-base",PARENT,"HEAD"]),PARENT);
  const rows=git(["diff","--name-status",PARENT,"HEAD"]).split(/\n/u).filter(Boolean);
  assert.equal(rows.length,4,"plan_scope_count");
  const actual=rows.map(row=>{
    const m=row.match(/^A\t(.+)$/u);
    assert.ok(m,"plan_scope_not_add_only:"+row);
    return m[1];
  }).sort();
  assert.deepEqual(actual,OWNED,"plan_scope_paths");
  git(["diff","--check",PARENT,"HEAD"]);
}
function verifyFixedPathFacts(){
  for(const [relative,blob] of FIXED)pin(relative,blob);
  const native=fs.readFileSync(path.join(ROOT,FIXED[0][0]),"utf8");
  assert.ok(native.includes('/opt/void-buy-void-v7-reviewed-v1/ops/precision/void_buy_void_source_finality_v7_privileged_launcher_body_v2.bash'));
  const launcher=fs.readFileSync(path.join(ROOT,FIXED[1][0]),"utf8");
  assert.ok(launcher.includes('FIXED_SOURCE_ROOT="/opt/void-buy-void-v7-reviewed-v1"'));
  const deployment=fs.readFileSync(path.join(ROOT,FIXED[2][0]),"utf8");
  assert.ok(deployment.includes('PROTECTED_SOURCE_ROOT_V1="/opt/void-buy-void-v7-reviewed-v1"'));
  assert.ok(deployment.includes('"/var/lib/void-source-finality-v7/deployment-receipt.json"'));
  assert.ok(deployment.includes('"production_receipt_path_must_be_default"'));
  const provider=fs.readFileSync(path.join(ROOT,FIXED[3][0]),"utf8");
  assert.ok(provider.includes('PROTECTED_SOURCE_ROOT_V1="/opt/void-buy-void-v7-reviewed-v1"'));
  const live=fs.readFileSync(path.join(ROOT,FIXED[4][0]),"utf8");
  assert.ok(live.includes('PROTECTED_SOURCE_ROOT_V1="/opt/void-buy-void-v7-reviewed-v1"'));
}
function verifyAtomicPrecedent(){
  for(const [relative,blob] of ATOMIC)pin(relative,blob);
  const upgrade=fs.readFileSync(path.join(ROOT,ATOMIC[0][0]),"utf8");
  for(const token of [
    "RENAME_EXCHANGE = 2",
    "atomic_root_exchange_required",
    "predecessor_retention_required",
    "automatic_rollback_required",
    "publication_state",
    "rollback_final_state_verified",
  ])assert.ok(upgrade.includes(token),"atomic_precedent_missing:"+token);
  const dormant=fs.readFileSync(path.join(ROOT,ATOMIC[2][0]),"utf8");
  for(const token of ["RENAME_EXCHANGE","predecessor_retained=true","rollback_available=true"]){
    assert.ok(dormant.includes(token),"dormant_atomic_precedent_missing:"+token);
  }
}
function verifyPlan(){
  const raw=pin(PLAN,PLAN_BLOB);
  const value=JSON.parse(raw);
  const {plan_id,...body}=value;
  assert.equal(plan_id,EXPECTED_PLAN_ID);
  assert.equal(
    plan_id,
    "voidv7srcrecexchange1_"+sha256(Buffer.from(canonical(body),"utf8")),
    "plan_id_mismatch",
  );
  assert.equal(body.v5_enforcement.lock_head,PARENT);
  assert.equal(body.v5_enforcement.lock_git_blob_sha1,LOCK_BLOB);
  assert.equal(body.v5_enforcement.candidate_git_blob_sha1,CANDIDATE_BLOB);
  assert.equal(body.v5_enforcement.exact_head_ci_required_before_implementation,true);
  assert.equal(body.current_precision_generation.source_commit,"75927cae2c7ed0b4273e6218937dedf69824f64c");
  assert.equal(body.current_precision_generation.deployment_generation_verified,true);
  assert.equal(body.fixed_path_contract.deployment_apply_requires_default_receipt_path,true);
  assert.equal(body.future_exchange_contract.atomic_source_root_exchange_required,true);
  assert.equal(body.future_exchange_contract.atomic_deployment_receipt_exchange_required,true);
  assert.equal(body.future_exchange_contract.pair_exchange_single_syscall_possible,false);
  assert.equal(body.future_exchange_contract.intermediate_pair_mismatch_must_fail_closed,true);
  assert.equal(body.future_exchange_contract.predecessor_cleanup_in_same_operation,false);
  assert.equal(body.future_exchange_contract.automatic_rollback_if_pair_not_terminal_green_required,true);
  assert.equal(body.future_stage_contract.source_stage_build_authority,false);
  assert.equal(body.future_stage_contract.receipt_stage_build_authority,false);
  assert.equal(body.success_qualification_contract.runtime_cutover_authority,false);
  for(const [key,val] of Object.entries(body.authority)){
    if(key==="plan_only")assert.equal(val,true);
    else assert.equal(val,false,"authority_overclaim:"+key);
  }
  assert.equal(
    body.next_gate,
    "IMPLEMENT_TRUSTED_V7_PROTECTED_SOURCE_RECEIPT_EXCHANGE_CANDIDATE_AFTER_V5_LOCK_CI_AND_STAGE_PROVENANCE",
  );
}
verifyScope();
pin(LOCK,LOCK_BLOB);
pin(CANDIDATE,CANDIDATE_BLOB);
verifyFixedPathFacts();
verifyAtomicPrecedent();
verifyPlan();
console.log(MARKER+"_PROOF_GREEN");
console.log("plan_id="+EXPECTED_PLAN_ID);
console.log("fixed_protected_source_path_proven=true");
console.log("fixed_deployment_receipt_path_proven=true");
console.log("production_receipt_alternate_apply_rejected=true");
console.log("reviewed_atomic_exchange_precedent_bound=true");
console.log("source_and_receipt_pair_exchange_required=true");
console.log("predecessor_retention_required=true");
console.log("automatic_rollback_required=true");
console.log("stage_build_authority=false");
console.log("host_read=false");
console.log("host_write=false");
console.log("root_execution=false");
console.log("service_mutation=false");
console.log("runtime_cutover_authority=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
