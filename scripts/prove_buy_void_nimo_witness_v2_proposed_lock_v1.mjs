#!/usr/bin/env node
// Candidate ONLY: exact reproducible CI witness V2 bytes, never host acceptance.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCK = path.join(ROOT,
  "docs/architecture/buy-void-nimo-witness-v2-proposed-lock-v1.json");
const DERIVER = path.join(ROOT,
  "scripts/prove_buy_void_witness_runtime_bundle_v2_candidate.mjs");
const CONTRACT =
  "src/economic/buy_void_allocation_custody_witness_runtime_bundle_qualification_v1.ts";
const ORIGINAL_CONTRACT_BLOB = "d2e84643c9f4d76c642c7e07d4ea2bf1634035e4";
const INTEGRATED_CONTRACT_BLOB = "d0f80d3b50e3dcc46c1f58dc4bd0a73b7875db56";
const EXPECTED_DERIVER_BLOB = "3c25a46818eace3f989b75466013cc7c4cec1362";
const AUTO = "dist/economic/buy_void_auto_fulfillment_v1.js";
const FLAGS = Object.freeze([
  "historical_v1_installation_confirmed_by_authenticated_attestation",
  "operator_readonly_census_treated_as_attestation",
  "v2_runtime_bundle_identity_accepted", "v2_host_installed",
  "v2_host_principal_verified", "v2_authenticated_transport_qualified",
  "verified_payment_to_allocation_mounted", "presale_activation", "funds_moved",
]);
const V2_FLAGS = Object.freeze([
  "runtime_bundle_identity_accepted",
  "historical_v1_qualified_for_current_source",
  "deployed_bundle_verified", "installed_nimo_witness_verified",
  "external_transport_authenticated", "production_payment_authority_ready",
  "production_allocation_mutation_ready", "presale_activation", "funds_movement",
]);
const sha256 = b => "sha256:" +
  crypto.createHash("sha256").update(b).digest("hex");
function gitBlob(b) {
  return crypto.createHash("sha1")
    .update(Buffer.from("blob " + b.length + "\0")).update(b).digest("hex");
}
function canonical(value) {
  if (value === null) return "null";
  if (typeof value === "boolean" || typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "number") {
    assert.ok(Number.isSafeInteger(value));
    return String(value);
  }
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  assert.ok(value && typeof value === "object");
  return "{" + Object.keys(value).sort()
    .map(key => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
}
function requireValue(actual, expected, label) {
  assert.deepEqual(actual, expected, label);
}
function validate(candidate, lock, raw) {
  requireValue(lock.schema,
    "void_buy_void_nimo_witness_v2_proposed_lock_v1", "proposed lock schema");
  requireValue(lock.status, "HOLD_UNACCEPTED_SOURCE_CANDIDATE", "HOLD status");
  requireValue(lock.candidate_proof_parent_head,
    "d68058d8513b79b98788b7fd3334b377df0fc25b", "exact candidate parent");
  requireValue(lock.exact_source_generation_commit,
    "884edc6e82bd505a83e51a44b38f7e318431f314", "current source");
  requireValue(lock.historical_v1_original_contract_git_blob_sha1,
    ORIGINAL_CONTRACT_BLOB, "immutable historical V1");
  requireValue(lock.integrated_draft_v1_contract_git_blob_sha1,
    INTEGRATED_CONTRACT_BLOB, "inconsistent integrated draft V1");
  requireValue(lock.candidate_deriver_git_blob_sha1,
    EXPECTED_DERIVER_BLOB, "candidate deriver source");
  requireValue(lock.historical_v1_original_contract_ref,
    "f627cad6bc07a6ad3ebe7cbd946723316fcd0567",
    "original contract ref");
  requireValue(lock.historical_v1_contract_source_commit,
    "e390424c1d31cd87dcf3551cc0d2d610a24e12f8", "original source census");
  requireValue(lock.historical_v1_manifest_id,
    "voidwfb1_2a729229f63c10a1562050924ddc279d8255a35603542967431a584977f1f6b7",
    "historical manifest ID");
  requireValue(lock.historical_v1_manifest_sha256,
    "sha256:2190e7ab944436200b03e46285fa5ba4cda1b90d915cfda05b320d1b1dc7ebe2",
    "historical manifest bytes SHA");
  requireValue(lock.typescript_version, "5.9.3", "exact TS compiler");
  requireValue(candidate.compiler.typescript_version,
    lock.typescript_version, "derived compiler");
  requireValue(candidate.schema,
    "void_buy_void_witness_runtime_bundle_v2_candidate", "candidate schema");
  requireValue(candidate.exact_source_generation_commit,
    lock.exact_source_generation_commit, "candidate source ancestry");
  requireValue(candidate.historical_predecessor.source_commit,
    lock.historical_v1_contract_source_commit, "historical census ancestry");
  requireValue(candidate.historical_predecessor.manifest_id,
    lock.historical_v1_manifest_id, "frozen V1 ID");
  requireValue(candidate.historical_predecessor.manifest_sha256,
    lock.historical_v1_manifest_sha256, "frozen V1 digest");
  // This value deliberately describes the current integration's changed V1
  // source. It is NOT the true historical contract, and is never accepted.
  requireValue(candidate.historical_predecessor.contract_git_blob_sha1,
    INTEGRATED_CONTRACT_BLOB, "integration draft variant documented");
  requireValue(candidate.candidate_manifest_id,
    lock.candidate_manifest_id, "exact V2 candidate ID");
  requireValue(candidate.source_file_count, 8, "source closure size");
  requireValue(candidate.runtime_file_count, 8, "runtime closure size");
  requireValue(candidate.runtime_edge_count, 11, "static runtime closure edges");
  requireValue(candidate.unchanged_historical_source_count, 7, "seven original sources");
  requireValue(candidate.changed_source_count, 1, "one changed source");
  requireValue(candidate.source_files.filter(x=>!x.unchanged_since_historical_v1)
    .map(x=>x.path), ["src/economic/buy_void_auto_fulfillment_v1.ts"],
    "only hardened auto-fulfillment changed");
  requireValue(candidate.source_files.find(x =>
    x.path === "src/economic/buy_void_auto_fulfillment_v1.ts").git_blob_sha1,
    "b7c963b1d55f000d82ad82289b31107b432503de",
    "actual current auto-fulfillment source blob");
  requireValue(lock.runtime_file_count,8,"proposed runtime count");
  requireValue(lock.runtime_files.length,8,"proposed row count");
  requireValue(candidate.runtime_files, lock.runtime_files,
    "all eight installed paths, byte lengths and compiled hashes");
  const oldAuto = lock.historical_v1_installed_auto_fulfillment_sha256;
  const newAuto = lock.candidate_v2_auto_fulfillment_sha256;
  requireValue(oldAuto,
    "ae15c56f1aa7009955058ca1d454da5e0d55a3e6c2011c54e7316374e33a5cf6",
    "historical installed V1 hash");
  requireValue(newAuto,
    "119a08db651cb85091f66ed2c9e475c56a81f21c9084c47c7f8ee083f831a47c",
    "current V2 compiled hash");
  assert.notEqual(oldAuto, newAuto, "historical V1 does not become V2");
  requireValue(candidate.runtime_files.find(x=>x.path===AUTO).sha256,
    newAuto, "V2 proposal not a V1 overwrite");
  for (const flag of FLAGS) {
    requireValue(lock.authority[flag], false, "proposed lock hard HOLD: " + flag);
  }
  requireValue(lock.authority.candidate_v2_compiled_source_reproducible_in_ci_only,
    true, "scope is CI only");
  for (const flag of V2_FLAGS)
    requireValue(candidate[flag], false, "derived candidate hard HOLD: " + flag);
  const body = {...candidate}; delete body.candidate_manifest_id;
  requireValue(candidate.candidate_manifest_id,
    "voidwfb2_" + sha256(Buffer.from(canonical(body))).slice(7),
    "candidate ID recomputes over canonical content");
  requireValue(sha256(raw), lock.candidate_record_sha256, "exact CI JSON receipt hash");
  requireValue(raw.length, lock.candidate_record_bytes, "exact CI receipt length");
}
function gitShow(ref, filename) {
  return execFileSync("git",["show",ref+":"+filename],
    {cwd:ROOT,maxBuffer:1024*1024,stdio:["ignore","pipe","pipe"]});
}
function verifyHistoricalContract() {
  const original = gitShow(
    "f627cad6bc07a6ad3ebe7cbd946723316fcd0567", CONTRACT);
  const integrated = gitShow(
    "884edc6e82bd505a83e51a44b38f7e318431f314", CONTRACT);
  assert.equal(gitBlob(original), ORIGINAL_CONTRACT_BLOB);
  assert.equal(gitBlob(integrated), INTEGRATED_CONTRACT_BLOB);
  assert.notDeepEqual(original,integrated);
  const a=original.toString("utf8").split("\n"),
    b=integrated.toString("utf8").split("\n");
  assert.equal(a.length,b.length);
  const changed=[];
  for(let i=0;i<a.length;i++) if(a[i]!==b[i]) changed.push(i+1);
  requireValue(changed,[13,57],"two changed V1 contract fields");
  assert.ok(a[12].includes("e390424c1d31cd87dcf3551cc0d2d610a24e12f8"));
  assert.ok(b[12].includes("f627cad6bc07a6ad3ebe7cbd946723316fcd0567"));
  assert.ok(a[56].includes("ae15c56f1aa7009955058ca1d454da5e0d55a3e6c2011c54e7316374e33a5cf6"));
  assert.ok(b[56].includes("119a08db651cb85091f66ed2c9e475c56a81f21c9084c47c7f8ee083f831a47c"));
  for (const src of [a,b]){
    assert.ok(src.join("\n").includes(
      "voidwfb1_2a729229f63c10a1562050924ddc279d8255a35603542967431a584977f1f6b7"));
    assert.ok(src.join("\n").includes(
      "sha256:2190e7ab944436200b03e46285fa5ba4cda1b90d915cfda05b320d1b1dc7ebe2"));
  }
}
function main() {
  requireValue(process.argv.slice(2), ["--prove"],
    "source-only candidate proof; --install/--apply forbidden");
  assert.ok([22,24,26].includes(Number(process.versions.node.split(".")[0])));
  const sourceBytes=fs.readFileSync(DERIVER);
  requireValue(gitBlob(sourceBytes), EXPECTED_DERIVER_BLOB,"deriver identity");
  const lock=JSON.parse(fs.readFileSync(LOCK,"utf8"));
  verifyHistoricalContract();
  const raw=execFileSync(process.execPath,[DERIVER,"--derive"],
    {cwd:ROOT,maxBuffer:3*1024*1024,stdio:["ignore","pipe","pipe"],
     env:{...process.env,VOID_BUY_ACCEPT_PRODUCTION:"false"}});
  const candidate=JSON.parse(raw.toString("utf8"));
  validate(candidate,lock,raw);
  // Pure negative mutations: never touch downloaded artifact, checkout or disk.
  let negatives=0;
  for(const malicious of [
    c=>{c.candidate_manifest_id="voidwfb2_"+"0".repeat(64);},
    c=>{c.runtime_files[5].sha256="0".repeat(64);},
    c=>{c.runtime_file_count=7;},
    c=>{c.runtime_bundle_identity_accepted=true;},
    c=>{c.historical_predecessor.manifest_id="forged-v1";},
  ]) {
    const copy=JSON.parse(JSON.stringify(candidate));
    malicious(copy);
    assert.throws(()=>validate(copy,lock,raw));
    negatives++;
  }
  assert.equal(negatives,5);
  console.log("original_v1_contract_git_blob_verified=true");
  console.log("integrated_draft_v1_identity_conflict_disclosed=true");
  console.log("current_v2_exact_eight_runtime_hashes_verified=true");
  console.log("candidate_canonical_content_id_verified=true");
  console.log("v2_candidate_record_sha256_verified=true");
  console.log("negative_identity_and_runtime_mutations_rejected=5");
  console.log("operator_host_census_treated_as_authority=false");
  console.log("installed_v2_host_qualified=false");
  console.log("runtime_bundle_identity_accepted=false");
  console.log("production_payment_authority_ready=false");
  console.log("production_allocation_mutation_ready=false");
  console.log("presale_activation=false");
  console.log("funds_moved=false");
  console.log("VOID_BUY_VOID_NIMO_WITNESS_V2_PROPOSED_LOCK_V1_GREEN");
}
main();
