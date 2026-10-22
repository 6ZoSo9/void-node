#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import {execFileSync} from "node:child_process";
const MARKER="VOID_V7_V5_STAGE_MANIFEST_CANDIDATE_SOURCE_ACCEPTANCE_V1";
const BASE="05508e433831d16629e989096b9a73d3731ef40c";
const ACCEPTANCE="ops/security/void-v7-v5-stage-manifest-candidate-source-acceptance-v1.json";
const ACCEPTANCE_BLOB="63df08d8574043e07cbbbb0c9a9fe9f0df634af5";
const EXPECTED_ID="voidv7v5stagemanifestcandidateaccept1_d733abecaf02a7e5b072982a170179e9baef24157c4d79e06a7da126a31a9d21";
const LAUNCHER="ops/precision/void_v7_v5_source_receipt_stage_root_launcher_v2.c";
const LAUNCHER_BLOB="2337466b713b6572cc5ec832817899bbcb4e2ac2";
const ADMISSION="ops/security/buy-void-v7-v5-stage-trusted-admission-plan-v2.json";
const ADMISSION_BLOB="c7ff1128ff04f3ce5f995206af52f844564c6b39";
const HISTORICAL_WORKFLOW=".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v2.yml";
const HISTORICAL_WORKFLOW_BLOB="b82f0d1ea2f9c101343c2023bbf88516c948fa67";
function git(args){return execFileSync("/usr/bin/git",["-C",process.cwd(),...args],{encoding:"utf8",env:{
PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",
GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",GIT_CONFIG_SYSTEM:"/dev/null",
GIT_NO_REPLACE_OBJECTS:"1",GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0",GIT_ASKPASS:"/bin/false"}}).trim();}
function canonical(v){if(v===null||typeof v==="boolean"||typeof v==="string")return JSON.stringify(v);
if(typeof v==="number"){assert.ok(Number.isSafeInteger(v));return String(v);}
if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
assert.ok(v&&typeof v==="object"&&!Array.isArray(v));
return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";}
const sha256=s=>crypto.createHash("sha256").update(s).digest("hex");
git(["merge-base","--is-ancestor",BASE,"HEAD"]);
assert.equal(git(["rev-parse","HEAD:"+ACCEPTANCE]),ACCEPTANCE_BLOB);
assert.equal(git(["rev-parse","HEAD:"+LAUNCHER]),LAUNCHER_BLOB);
assert.equal(git(["rev-parse","HEAD:"+ADMISSION]),ADMISSION_BLOB);
assert.equal(git(["rev-parse","HEAD:"+HISTORICAL_WORKFLOW]),HISTORICAL_WORKFLOW_BLOB);
const doc=JSON.parse(fs.readFileSync(ACCEPTANCE,"utf8"));
const {acceptance_id,...b}=doc;
assert.equal(acceptance_id,EXPECTED_ID);
assert.equal(acceptance_id,"voidv7v5stagemanifestcandidateaccept1_"+sha256(canonical(b)));
assert.equal(b.reviewed_launcher_source.production_payload_manifest_lock_bound,false);
assert.equal(b.future_manifest_candidate_contract.required_launcher_receipt_entry_count,22);
assert.equal(b.future_manifest_candidate_contract.static_python_identity_must_be_separately_reviewed,true);
assert.equal(b.future_manifest_candidate_contract.stdlib_identity_must_be_separately_reviewed,true);
assert.equal(b.review_decision.payload_manifest_candidate_generation_authorized,true);
for(const key of ["payload_manifest_accepted","closed_tree_bootstrap_install_authorized","launcher_install_authorized",
"root_execution_authorized","source_stage_apply_authorized","receipt_stage_apply_authorized",
"fixed_source_exchange_authority","fixed_receipt_exchange_authority","transition_journal_mutation",
"consumer_fence_mutation","service_mutation","systemd_mutation","provider_rpc_contact",
"credential_access","private_key_access","wallet_or_signer_access","signing","transaction",
"payment_acceptance","public_presale_activation","wc_void_market_activation","treasury_liquidity_action",
"funds_movement"])assert.equal(b.review_decision[key],false,"authority_overclaim:"+key);
assert.equal(b.next_gate,"DERIVE_HARDENED_V2_CLOSED_TREE_PAYLOAD_MANIFEST_CANDIDATE");
console.log(MARKER+"_GREEN");
console.log("acceptance_id="+EXPECTED_ID);
console.log("payload_manifest_candidate_generation_authorized=true");
console.log("payload_manifest_accepted=false");
console.log("root_execution_authorized=false");
console.log("source_stage_apply_authorized=false");
console.log("receipt_stage_apply_authorized=false");
console.log("fixed_source_exchange_authority=false");
console.log("fixed_receipt_exchange_authority=false");
console.log("service_mutation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
