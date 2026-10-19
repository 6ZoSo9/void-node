#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

import {
  buildVoidBuyVoidLegacyHistoryNimoRuntimeBundleCandidateV1,
  canonicalLegacyHistoryNimoRuntimeBundleJsonV1,
  verifyVoidBuyVoidLegacyHistoryNimoRuntimeBundleCandidateV1,
} from "../tools/void-buy-legacy-request-history-nimo-runtime-bundle-candidate-v1.mjs";

const SOURCE_MAIN_MERGE="357a406c5a5a6075937d8801ebd76d47205e48d8";
const SOURCE_CANDIDATE_HEAD="f5b801e094b4ad1fc0e49e211aebe987391ec9eb";
const PARENT_HEAD="a89523ac7f6e6d013a86054e998fcb51f051ec51";
const LOCK="ops/security/buy-void-legacy-history-nimo-runtime-bundle-lock-v1.json";
const PROOF="scripts/prove_void_buy_legacy_history_nimo_runtime_bundle_lock_v1.mjs";
const DOC="docs/operators/buy-void-legacy-history-nimo-runtime-bundle-lock-v1.md";
const WORKFLOW=".github/workflows/buy-void-legacy-history-nimo-runtime-bundle-lock-v1.yml";
const EXPECTED_SCOPE=[LOCK,PROOF,DOC,WORKFLOW].sort();

const CANDIDATE_ID=
  "voidblrhnrb1_f68df654aee9f534a0cecee80444c55ec70ef8cd1914b9eef4e09f6020b438e4";
const CANDIDATE_BYTES=12369;
const CANDIDATE_SHA256=
  "b082a0262cf7db5d49f000642913ddcd2914c59c5faae7878005cfa30e2981c7";
const LOCK_ID=
  "voidblrhnrblock1_9b48f82fdc5dce5cf7baa792d2b999333aecfc33b76991ddfb6081dc3700f863";

const DEPENDENCY_BLOBS=Object.freeze({
  "tools/void-buy-legacy-request-history-nimo-runtime-bundle-candidate-v1.mjs":
    "8ffdf3f3e1fe797a72f2af27a7a481b757b6d2af",
  "scripts/prove_void_buy_legacy_request_history_nimo_runtime_bundle_candidate_v1.mjs":
    "873c444bbfd94b43da581ab9403fd15fe8a438f0",
  ".github/workflows/buy-void-legacy-request-history-nimo-runtime-bundle-candidate-v1.yml":
    "c8959f0865c787281d6e6da36464323533629b12",
  "tools/void-buy-legacy-request-history-nimo-install-plan-v1.mjs":
    "3d41834140eaaca46fb9f5a771278bed49384c65",
});

function sha256(bytes){
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function canonical(value){
  return canonicalLegacyHistoryNimoRuntimeBundleJsonV1(value);
}

function git(args){
  const r=spawnSync("/usr/bin/git",args,{
    encoding:"utf8",
    env:{
      PATH:"/usr/bin:/bin",
      HOME:"/tmp",
      LANG:"C",
      LC_ALL:"C",
      GIT_CONFIG_NOSYSTEM:"1",
      GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",
      GIT_NO_REPLACE_OBJECTS:"1",
      GIT_OPTIONAL_LOCKS:"0",
    },
    maxBuffer:8*1024*1024,
  });
  assert.equal(r.status,0,String(r.stderr||r.stdout||""));
  return String(r.stdout||"").trim();
}

function lockBody(){
  return {
    schema:"void_buy_void_legacy_history_nimo_runtime_bundle_lock_v1",
    marker:"VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_BUNDLE_LOCK_V1",
    version:1,
    repository:"6ZoSo9/void-node",
    source_main_merge:SOURCE_MAIN_MERGE,
    source_candidate_head:SOURCE_CANDIDATE_HEAD,
    candidate_evidence:{
      workflow_run:38842429738,
      candidate_id:CANDIDATE_ID,
      candidate_bytes:CANDIDATE_BYTES,
      candidate_sha256:CANDIDATE_SHA256,
      three_node_byte_identity_verified:true,
      candidate_tool_git_blob_sha1:
        "8ffdf3f3e1fe797a72f2af27a7a481b757b6d2af",
      candidate_proof_git_blob_sha1:
        "873c444bbfd94b43da581ab9403fd15fe8a438f0",
      candidate_workflow_git_blob_sha1:
        "c8959f0865c787281d6e6da36464323533629b12",
      parent_install_plan_git_blob_sha1:
        "3d41834140eaaca46fb9f5a771278bed49384c65",
      exact_parent_head:PARENT_HEAD,
      artifacts:[
        {
          node:22,
          artifact_id:12021374767,
          artifact_name:"legacy-history-nimo-bundle-22",
          archive_digest:
            "sha256:9ad1842851947b8237ee1f732e953904ccd2c83068f0ab2fabb7c8e7712972d8",
        },
        {
          node:24,
          artifact_id:12021791725,
          artifact_name:"legacy-history-nimo-bundle-24",
          archive_digest:
            "sha256:077b6ee092f3be9d1a9f1cd3aab079838a3575927d535f1d034c9e7dec3cd29d",
        },
        {
          node:26,
          artifact_id:12021703515,
          artifact_name:"legacy-history-nimo-bundle-26",
          archive_digest:
            "sha256:6a3ee243ecc2a3e303ff97443426ecc518e8e15d4334ab788e96604f80971f4d",
        },
      ],
    },
    runtime_contract:{
      runtime_file_count:14,
      compiled_runtime_file_count:9,
      tracked_runtime_source_file_count:5,
      typescript_version:"5.9.3",
      third_party_runtime_packages:0,
      node_modules_runtime_files:0,
      actual_runtime_bytes_rederived:true,
      actual_compiler_bytes_rederived:true,
    },
    candidate_accepted:true,
    runtime_bundle_lock_created:true,
    protected_runtime_install_authorized:false,
    live_nimo_installed:false,
    authorized_keys_mutation_authorized:false,
    public_key_selected:false,
    private_key_access:false,
    external_transport_authenticated:false,
    witness_read_performed:false,
    witness_append_performed:false,
    sovereign_signing:false,
    payment_acceptance:false,
    transaction:false,
    public_presale_activation:false,
    wc_void_market_activation:false,
    funds_movement:false,
    next_gate:"void_buy_void_legacy_history_nimo_protected_runtime_install_plan_v1",
  };
}

function withLockId(body){
  return {
    ...body,
    lock_id:"voidblrhnrblock1_"+sha256(Buffer.from(canonical(body),"utf8")),
  };
}

function validateLock(value,expectedCandidateBytes){
  const expected=withLockId(lockBody());
  assert.equal(value.lock_id,LOCK_ID);
  assert.equal(canonical(value),canonical(expected));
  const {lock_id:ignored,...body}=value;
  assert.equal(
    lock_idRecomputed(body),
    value.lock_id,
  );
  assert.equal(value.candidate_evidence.candidate_sha256,sha256(expectedCandidateBytes));
  assert.equal(value.candidate_evidence.candidate_bytes,expectedCandidateBytes.length);
  assert.equal(value.candidate_evidence.candidate_id,CANDIDATE_ID);
  return true;
}

function lock_idRecomputed(body){
  return "voidblrhnrblock1_"+sha256(Buffer.from(canonical(body),"utf8"));
}

git(["merge-base","--is-ancestor",SOURCE_MAIN_MERGE,"HEAD"]);
git(["merge-base","--is-ancestor",SOURCE_CANDIDATE_HEAD,"HEAD"]);

for(const [relative,expected] of Object.entries(DEPENDENCY_BLOBS)){
  assert.equal(git(["rev-parse","HEAD:"+relative]),expected,"dependency drift: "+relative);
}

const scope=git(["diff","--name-only",SOURCE_MAIN_MERGE,"HEAD","--"])
  .split("\n").filter(Boolean).sort();
assert.deepEqual(scope,EXPECTED_SCOPE,"runtime-bundle lock branch scope drift");

const candidate=buildVoidBuyVoidLegacyHistoryNimoRuntimeBundleCandidateV1();
assert.equal(
  verifyVoidBuyVoidLegacyHistoryNimoRuntimeBundleCandidateV1(candidate),
  true,
);
const candidateBytes=Buffer.from(canonical(candidate)+"\n","utf8");
assert.equal(candidate.candidate_id,CANDIDATE_ID);
assert.equal(candidateBytes.length,CANDIDATE_BYTES);
assert.equal(sha256(candidateBytes),CANDIDATE_SHA256);
assert.equal(candidate.parent_plan.exact_parent_head,PARENT_HEAD);
assert.equal(candidate.runtime_files.length,14);
assert.equal(
  candidate.runtime_files.filter(x=>x.runtime_kind==="compiled_typescript").length,
  9,
);
assert.equal(
  candidate.runtime_files.filter(x=>x.runtime_kind==="tracked_source").length,
  5,
);
assert.equal(candidate.compiler.typescript_version,"5.9.3");
assert.equal(candidate.third_party_runtime_packages.length,0);
assert.equal(candidate.node_modules_runtime_files.length,0);
assert.equal(candidate.runtime_bundle_candidate_accepted,false);
assert.equal(candidate.protected_runtime_install_authorized,false);
assert.equal(candidate.live_nimo_installed,false);
assert.equal(candidate.funds_movement,false);

const body=lockBody();
const expectedLock=withLockId(body);
assert.equal(expectedLock.lock_id,LOCK_ID);

const committedBytes=fs.readFileSync(LOCK);
const expectedBytes=Buffer.from(canonical(expectedLock)+"\n","utf8");
assert.equal(committedBytes.equals(expectedBytes),true,"committed lock bytes mismatch");
const committed=JSON.parse(committedBytes.toString("utf8"));
assert.equal(validateLock(committed,candidateBytes),true);

// Self-consistent lock-ID tamper must still fail because the lock contract is
// bound to the independently rederived candidate bytes, not only its own ID.
{
  const tampered=structuredClone(committed);
  tampered.candidate_evidence.candidate_sha256="0".repeat(64);
  const {lock_id:ignored,...tamperedBody}=tampered;
  tampered.lock_id=lock_idRecomputed(tamperedBody);
  assert.throws(
    ()=>validateLock(tampered,candidateBytes),
    /Expected values to be strictly equal/u,
  );
}

for(const key of [
  "protected_runtime_install_authorized",
  "live_nimo_installed",
  "authorized_keys_mutation_authorized",
  "public_key_selected",
  "private_key_access",
  "external_transport_authenticated",
  "witness_read_performed",
  "witness_append_performed",
  "sovereign_signing",
  "payment_acceptance",
  "transaction",
  "public_presale_activation",
  "wc_void_market_activation",
  "funds_movement",
]){
  assert.equal(committed[key],false,key);
}
assert.equal(committed.candidate_accepted,true);
assert.equal(committed.runtime_bundle_lock_created,true);

console.log("VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_BUNDLE_LOCK_V1_PROOF_GREEN");
console.log("candidate_id="+CANDIDATE_ID);
console.log("candidate_bytes="+String(CANDIDATE_BYTES));
console.log("candidate_sha256="+CANDIDATE_SHA256);
console.log("lock_id="+LOCK_ID);
console.log("three_node_byte_identity_verified=true");
console.log("actual_runtime_bytes_rederived=true");
console.log("actual_compiler_bytes_rederived=true");
console.log("resealed_candidate_sha_tamper_rejected=true");
console.log("candidate_accepted=true");
console.log("runtime_bundle_lock_created=true");
console.log("protected_runtime_install_authorized=false");
console.log("live_nimo_installed=false");
console.log("authorized_keys_mutation_authorized=false");
console.log("external_transport_authenticated=false");
console.log("witness_read_performed=false");
console.log("witness_append_performed=false");
console.log("sovereign_signing=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("wc_void_market_activation=false");
console.log("funds_movement=false");
