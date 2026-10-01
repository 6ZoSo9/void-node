#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  VOID_PRECISION_WEB_RECOVERY_AUTHORITY_V1,
  VOID_PRECISION_WEB_RECOVERY_EVIDENCE_V1,
  prepareVoidPrecisionWebRecoveryPlanV1,
  verifyVoidPrecisionWebRecoveryEvidenceV1,
} from "../tools/void-precision-web-recovery-evidence-v1.mjs";

function canonicalize(value){
  if(Array.isArray(value)) return value.map(canonicalize);
  if(value&&typeof value==="object"){
    return Object.fromEntries(
      Object.keys(value).sort().map((key)=>[key,canonicalize(value[key])]),
    );
  }
  return value;
}
function canonicalJson(value){return JSON.stringify(canonicalize(value));}
function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}

function evidenceFor(plan,overrides={}){
  const hashes=plan.source_file_sha256;
  const hardening={
    no_new_privileges:true,
    restrict_suid_sgid:true,
    lock_personality:true,
    private_tmp:false,
    protect_home:false,
    protect_system:false,
  };
  const body={
    marker:VOID_PRECISION_WEB_RECOVERY_EVIDENCE_V1,
    version:1,
    status:"PRECISION_WEB_RECOVERY_LOCALLY_VERIFIED_ROUTING_UNCHANGED",
    plan_id:plan.plan_id,
    source_head_sha:plan.source_head_sha,
    source_tree_sha:plan.source_tree_sha,
    host_role:"precision_public_origin",
    adapter:{
      active:true,
      listener:"127.0.0.1:8080",
      marker:"void_public_seed_adapter",
      source_file_sha256:
        hashes["ops/public/public-seed-adapter-v1.mjs"],
    },
    composition:{
      active:true,
      listener:"127.0.0.1:8082",
      marker:"VOID_PUBLIC_APP_COMPOSITION_GATEWAY_V1",
      runtime_truth_marker:"VOID_PUBLIC_APP_RUNTIME_TRUTH_WALL_V1",
      strict_ready:true,
      network_name:"Mainnet-0",
      node_label:"Precision public seed",
      source_file_sha256:
        hashes["ops/public/void-public-app-composition-gateway-v1.mjs"],
    },
    frontdoor:{
      active:true,
      listener:"127.0.0.1:8083",
      marker:"VOID_PUBLIC_FRONTDOOR_V1",
      ready:true,
      upstream_strict_ready:true,
      upstream_marker:"VOID_PUBLIC_APP_COMPOSITION_GATEWAY_V1",
      upstream_runtime_truth_marker:"VOID_PUBLIC_APP_RUNTIME_TRUTH_WALL_V1",
      source_file_sha256:
        hashes["ops/public/void-public-frontdoor-v1.mjs"],
    },
    service_hardening:{
      adapter:{...hardening},
      composition:{...hardening},
      frontdoor:{...hardening},
    },
    node_service_restart_performed:false,
    tailscale_routing_mutated:false,
    dns_mutated:false,
    funnel_mutated:false,
    wallet_or_signer_accessed:false,
    transaction_performed:false,
    funds_moved:false,
    observed_at_utc:"2030-01-01T00:00:00Z",
    ...overrides,
  };
  const digest=sha256(Buffer.from(canonicalJson(body),"utf8"));
  return {...body,evidence_id:"voidpwre1_"+digest};
}

function reId(value){
  const body=Object.fromEntries(
    Object.entries(value).filter(([key])=>key!=="evidence_id"),
  );
  return {
    ...value,
    evidence_id:"voidpwre1_"+sha256(Buffer.from(canonicalJson(body),"utf8")),
  };
}

const plan=prepareVoidPrecisionWebRecoveryPlanV1();

assert.equal(plan.marker,VOID_PRECISION_WEB_RECOVERY_EVIDENCE_V1);
assert.equal(plan.version,1);
assert.equal(
  plan.status,
  "PRECISION_WEB_RECOVERY_SOURCE_PLAN_READY_HOST_ACCEPTANCE_REQUIRED",
);
assert.match(plan.plan_id,/^voidpwrp1_[0-9a-f]{64}$/u);
assert.match(plan.source_head_sha,/^[0-9a-f]{40}$/u);
assert.match(plan.source_tree_sha,/^[0-9a-f]{40}$/u);
assert.match(plan.tool_git_blob_sha1,/^[0-9a-f]{40}$/u);

assert.equal(plan.topology.adapter.listener,"127.0.0.1:8080");
assert.equal(plan.topology.adapter.upstream,"http://127.0.0.1:4100");
assert.equal(plan.topology.composition.listener,"127.0.0.1:8082");
assert.equal(
  plan.topology.composition.public_gateway_upstream,
  "http://127.0.0.1:8080",
);
assert.equal(plan.topology.composition.node_upstream,"http://127.0.0.1:4100");
assert.equal(plan.topology.composition.node_label,"Precision public seed");
assert.equal(plan.topology.frontdoor.listener,"127.0.0.1:8083");
assert.equal(plan.topology.frontdoor.upstream_port,8082);
assert.equal(
  plan.runtime_expectations.local_chain,
  "127.0.0.1:8080 -> 127.0.0.1:8082 -> 127.0.0.1:8083",
);
assert.equal(plan.runtime_expectations.live_node_restart_permitted,false);
assert.equal(plan.runtime_expectations.routing_change_permitted,false);
assert.equal(plan.runtime_expectations.dns_change_permitted,false);
assert.equal(plan.runtime_expectations.funnel_change_permitted,false);

for(const name of ["adapter","composition","frontdoor"]){
  const profile=plan.service_profile[name];
  assert.equal(profile.no_new_privileges,true,name);
  assert.equal(profile.restrict_suid_sgid,true,name);
  assert.equal(profile.lock_personality,true,name);
  assert.equal(profile.private_tmp,false,name);
  assert.equal(profile.protect_home,false,name);
  assert.equal(profile.protect_system,false,name);
}
assert.equal(
  plan.service_profile.precision_descriptor_walk_compatibility_required,
  true,
);
assert.equal(
  plan.service_profile.generic_example_mount_namespace_profile_adopted,
  false,
);

for(const [path,digest] of Object.entries(plan.source_file_sha256)){
  assert.match(digest,/^[0-9a-f]{64}$/u,path);
}
for(const [path,blob] of Object.entries(plan.source_blobs)){
  assert.match(blob,/^[0-9a-f]{40}$/u,path);
}

const evidence=evidenceFor(plan);
const verified=verifyVoidPrecisionWebRecoveryEvidenceV1({plan,evidence});
assert.equal(verified.ok,true);
assert.equal(
  verified.status,
  "PRECISION_WEB_RECOVERY_OBSERVATION_CONTRACT_VERIFIED_ACCEPTANCE_REQUIRED",
);
assert.equal(verified.observation_claims_consistent,true);
assert.equal(verified.adapter_8080_claim_bound,true);
assert.equal(verified.composition_8082_strict_ready_claim_bound,true);
assert.equal(verified.frontdoor_8083_strict_ready_claim_bound,true);
assert.equal(
  verified.precision_descriptor_walk_compatible_unit_profile_bound,
  true,
);
assert.equal(verified.routing_unchanged_claim_bound,true);
assert.equal(verified.live_host_observation_performed_by_this_verifier,false);
assert.equal(verified.independent_host_acceptance_required,true);
assert.equal(verified.installation_authorized,false);
assert.equal(verified.independent_acceptance,false);

{
  const bad=structuredClone(evidence);
  bad.service_hardening.adapter.private_tmp=true;
  assert.throws(
    ()=>verifyVoidPrecisionWebRecoveryEvidenceV1({plan,evidence:reId(bad)}),
    /precision_web_hardening_profile_mismatch/u,
  );
}
{
  const bad=structuredClone(evidence);
  bad.service_hardening.composition.protect_system=true;
  assert.throws(
    ()=>verifyVoidPrecisionWebRecoveryEvidenceV1({plan,evidence:reId(bad)}),
    /precision_web_hardening_profile_mismatch/u,
  );
}
{
  const bad=structuredClone(evidence);
  bad.composition.node_label="Alienware public seed";
  assert.throws(
    ()=>verifyVoidPrecisionWebRecoveryEvidenceV1({plan,evidence:reId(bad)}),
    /precision_web_composition_evidence_mismatch/u,
  );
}
{
  const bad=structuredClone(evidence);
  bad.frontdoor.upstream_strict_ready=false;
  assert.throws(
    ()=>verifyVoidPrecisionWebRecoveryEvidenceV1({plan,evidence:reId(bad)}),
    /precision_web_frontdoor_evidence_mismatch/u,
  );
}
{
  const bad=structuredClone(evidence);
  bad.node_service_restart_performed=true;
  assert.throws(
    ()=>verifyVoidPrecisionWebRecoveryEvidenceV1({plan,evidence:reId(bad)}),
    /precision_web_forbidden_action_observed:node_service_restart_performed/u,
  );
}
{
  const bad=structuredClone(evidence);
  bad.adapter.source_file_sha256="f".repeat(64);
  assert.throws(
    ()=>verifyVoidPrecisionWebRecoveryEvidenceV1({plan,evidence:reId(bad)}),
    /precision_web_adapter_evidence_mismatch/u,
  );
}
{
  const bad=structuredClone(evidence);
  bad.evidence_id="voidpwre1_"+"f".repeat(64);
  assert.throws(
    ()=>verifyVoidPrecisionWebRecoveryEvidenceV1({plan,evidence:bad}),
    /precision_web_evidence_content_id_mismatch/u,
  );
}
{
  const bad=structuredClone(plan);
  bad.source_head_sha="f".repeat(40);
  assert.throws(
    ()=>verifyVoidPrecisionWebRecoveryEvidenceV1({plan:bad,evidence}),
    /precision_web_plan_not_current/u,
  );
}

for(const [key,value] of Object.entries(VOID_PRECISION_WEB_RECOVERY_AUTHORITY_V1)){
  const allowed=new Set([
    "source_only_plan",
    "external_observation_verification",
    "clean_repository_required",
    "exact_source_blobs_required",
  ]);
  assert.equal(value,allowed.has(key),key);
}

const source=fs.readFileSync(
  "tools/void-precision-web-recovery-evidence-v1.mjs",
  "utf8",
);
for(const forbidden of [
  "systemctl --user",
  "tailscale funnel",
  "writeFileSync",
  "execFileSync",
  "transaction_broadcast:true",
  "installation_authorized:true",
  "independent_acceptance:true",
  "buildVoidPrecisionWebRecoveryEvidenceFixtureV1",
]){
  assert.equal(source.includes(forbidden),false,forbidden);
}
for(const required of [
  "PrivateTmp=true",
  "ProtectSystem=strict",
  "ProtectHome=read-only",
  "private_tmp:false",
  "protect_home:false",
  "protect_system:false",
  '"Precision public seed"',
  '"127.0.0.1:8080"',
  '"127.0.0.1:8082"',
  '"127.0.0.1:8083"',
]){
  assert.equal(source.includes(required),true,required);
}

console.log("VOID_PRECISION_WEB_RECOVERY_EVIDENCE_V1_PROOF_GREEN");
console.log("current_source_generation_bound=true");
console.log("adapter_8080_recovery_override_bound=true");
console.log("composition_8082_strict_ready_contract_bound=true");
console.log("frontdoor_8083_upstream_strict_ready_contract_bound=true");
console.log("precision_private_tmp_incompatibility_recorded=true");
console.log("generic_mount_namespace_profile_not_adopted=true");
console.log("source_only_observation_contract=true");
console.log("live_host_observation_performed=false");
console.log("installation_authorized=false");
console.log("independent_acceptance=false");
