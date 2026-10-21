#!/usr/bin/env node
// Portable, unprivileged proof for current-main custody source implementation V2.
// No live host receipts, services, wallets, keys, network, or payment operations.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {
  MARKER, SCHEMA, PARENT_PLAN_ID,
  VOID_BUY_VOID_CUSTODY_HOST_PORT_IMPLEMENTATION_V2,
  VOID_BUY_VOID_CUSTODY_HOST_PORT_RUNTIME_ACCEPTED_V2,
  collectBuyVoidPresaleAllocationCustodyHostEvidenceV1,
  testOnlyAssertStorageGenerationTripleV1,
  testOnlySafeHoldReasonV1,
} from "../ops/precision/void_buy_void_presale_allocation_custody_host_evidence_v2.js";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const SOURCE="ops/precision/void_buy_void_presale_allocation_custody_host_evidence_v2.ts";
const SOURCE_BLOB="74de6857867180c5ababdcecdd6239a8a29e68d2";
const HISTORICAL_SOURCE_BLOB="30b8674e27816d74997844fa55269fc72e0bea6b";
const SOURCE_V2_OBSERVER_BLOBS=Object.freeze({
  "tools/void-buy-allocation-custody-witness-live-read-replay-installation-evidence-v2.mjs":"fba97c9c9213048bd7e93e58fe1318f2fb572b10",
  "tools/void-buy-allocation-custody-witness-live-read-replay-rollback-policy-evidence-v2.mjs":"b6aa9cec490d44e44b3d255ada27edbf53cbd5f5",
  "tools/void-buy-allocation-custody-live-durability-rollback-contract-v1.mjs":"eef7c4e1db7401ba82fda96aa1e8da40c1981b7d",
});
function blob(bytes){
  return crypto.createHash("sha1").update(Buffer.from("blob "+bytes.length+"\0","utf8")).update(bytes).digest("hex");
}
function pinnedRead(relative,max=256*1024){
  assert.ok(/^(?:[a-z0-9_.-]+\/)*[a-z0-9_.-]+$/iu.test(relative),"unsafe_proof_relative_path");
  const absolute=path.join(ROOT,...relative.split("/"));
  const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&before.size>0&&before.size<=max,
    "invalid_proof_input:"+relative);
  const fd=fs.openSync(absolute,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK);
  try{
    const opened=fs.fstatSync(fd);
    assert.ok(opened.isFile()&&opened.nlink===1&&opened.size===before.size,
      "opened_proof_input_mismatch:"+relative);
    for(const key of ["dev","ino","uid","gid","mode","nlink","size","mtimeMs","ctimeMs"])
      assert.equal(opened[key],before[key],"open_proof_generation:"+relative+":"+key);
    const bytes=Buffer.alloc(opened.size);
    let offset=0;
    while(offset<bytes.length){
      const n=fs.readSync(fd,bytes,offset,bytes.length-offset,offset);
      assert.ok(n>0,"short_proof_read:"+relative);
      offset+=n;
    }
    const grew=Buffer.alloc(1);
    assert.equal(fs.readSync(fd,grew,0,1,bytes.length),0,"growth_proof_read:"+relative);
    const after=fs.fstatSync(fd),visible=fs.lstatSync(absolute);
    for(const key of ["dev","ino","uid","gid","mode","nlink","size","mtimeMs","ctimeMs"]){
      assert.equal(after[key],opened[key],"post_proof_generation:"+relative+":"+key);
      assert.equal(visible[key],opened[key],"visible_proof_generation:"+relative+":"+key);
    }
    return bytes;
  }finally{fs.closeSync(fd);}
}
const text=pinnedRead(SOURCE).toString("utf8");
assert.equal(blob(Buffer.from(text,"utf8")),SOURCE_BLOB,"exact_new_port_source_blob");
// Prove exact derivation from historical #3515 *bytes*, not just from a
// comment that repeats an expected Git SHA. Reconstruct the immutable V1
// source by reverting every explicitly reviewed implementation-port edit.
function replaceExactlyOnce(value:string,from:string,to:string,label:string):string{
  const at=value.indexOf(from);
  assert.ok(at>=0&&value.indexOf(from,at+from.length)===-1,
    "historical_reconstruction_mapping_not_unique:"+label);
  return value.slice(0,at)+to+value.slice(at+from.length);
}
let reconstructedHistoricalSource=text;
reconstructedHistoricalSource=replaceExactlyOnce(
  reconstructedHistoricalSource,
  "../../tools/void-buy-allocation-custody-witness-live-read-replay-rollback-policy-evidence-v2.mjs",
  "../../tools/void-buy-allocation-custody-witness-live-read-replay-rollback-policy-evidence-v1.mjs",
  "rollback_observer_path",
);
reconstructedHistoricalSource=replaceExactlyOnce(
  reconstructedHistoricalSource,
  "../../tools/void-buy-allocation-custody-witness-live-read-replay-installation-evidence-v2.mjs",
  "../../tools/void-buy-allocation-custody-witness-live-read-replay-installation-evidence-v1.mjs",
  "installation_observer_path",
);
const portDeclaration=[
  "// Source implementation V2 preserves the historically reviewed V1 receipt",
  "// semantics. This current-main portability candidate has NO host-run authority.",
  "// It cannot be used for root host collection until separately rebound to a",
  "// reviewed complete source generation and explicitly authorized.",
  "export const VOID_BUY_VOID_CUSTODY_HOST_PORT_IMPLEMENTATION_V2 =",
  '  "VOID_BUY_VOID_CUSTODY_HOST_PORT_IMPLEMENTATION_V2";',
  "export const VOID_BUY_VOID_CUSTODY_HOST_PORT_RUNTIME_ACCEPTED_V2 = false;",
  "",
].join("\n")+"\n";
reconstructedHistoricalSource=replaceExactlyOnce(
  reconstructedHistoricalSource,portDeclaration,"","port_declaration",
);
const firstInstructionHold=[
  "  // First instruction in the exported collection API; rejects --run, direct",
  "  // imports and test-only process identity overrides BEFORE any host reads.",
  "  if (!VOID_BUY_VOID_CUSTODY_HOST_PORT_RUNTIME_ACCEPTED_V2)",
  '    fail("allocation_custody_current_main_port_not_accepted");',
  "",
].join("\n");
reconstructedHistoricalSource=replaceExactlyOnce(
  reconstructedHistoricalSource,firstInstructionHold,"","first_instruction_hold",
);
const selfTestMarkers=[
  '  console.log("source_port_implementation_v2=true");',
  '  console.log("current_main_port_runtime_accepted=false");',
  '  console.log("host_collection_run_enabled=false");',
  "",
].join("\n");
reconstructedHistoricalSource=replaceExactlyOnce(
  reconstructedHistoricalSource,selfTestMarkers,"","port_self_test_markers",
);
assert.equal(
  blob(Buffer.from(reconstructedHistoricalSource,"utf8")),
  HISTORICAL_SOURCE_BLOB,
  "historical_v1_collector_provenance_mismatch",
);

for(const [relative,expected] of Object.entries(SOURCE_V2_OBSERVER_BLOBS))
  assert.equal(blob(pinnedRead(relative,128*1024)),expected,"exact_dependency_blob:"+relative);
assert.equal(MARKER,"VOID_BUY_VOID_PRESALE_ALLOCATION_CUSTODY_HOST_EVIDENCE_V1");
assert.equal(SCHEMA,"void_buy_void_presale_allocation_custody_host_evidence_v1");
assert.equal(PARENT_PLAN_ID,
  "voidbuyhostevplan1_665336abc8030749d2d540f412c4dc597ecece47ecb5aa9f2928529adeba5aab");
assert.equal(VOID_BUY_VOID_CUSTODY_HOST_PORT_IMPLEMENTATION_V2,
  "VOID_BUY_VOID_CUSTODY_HOST_PORT_IMPLEMENTATION_V2");
assert.equal(VOID_BUY_VOID_CUSTODY_HOST_PORT_RUNTIME_ACCEPTED_V2,false);
for(const required of [
  "assertStorageGenerationTripleV1(",
  "source_port_implementation_v2=true",
  "current_main_port_runtime_accepted=false",
  "host_collection_run_enabled=false",
  "live_durable_storage_proven: false",
  "rollback_resistance_proven: false",
  "protected_high_water_custody_proven: false",
  "independent_custody_proven: false",
  "payment_acceptance: false",
  "public_presale_activation: false",
  "funds_movement: false",
  "production_host_evidence_authority: false",
  "if (!VOID_BUY_VOID_CUSTODY_HOST_PORT_RUNTIME_ACCEPTED_V2)"
])assert.ok(text.includes(required),"port_source_boundary_missing:"+required);
for(const required of [
  "../../tools/void-buy-allocation-custody-witness-live-read-replay-installation-evidence-v2.mjs",
  "../../tools/void-buy-allocation-custody-witness-live-read-replay-rollback-policy-evidence-v2.mjs",
])assert.ok(text.includes(required),"port_v2_observer_missing:"+required);
for(const stale of [
  "../../tools/void-buy-allocation-custody-witness-live-read-replay-installation-evidence-v1.mjs",
  "../../tools/void-buy-allocation-custody-witness-live-read-replay-rollback-policy-evidence-v1.mjs",
])assert.ok(!text.includes(stale),"stale_v1_import:"+stale);

// A direct exported call cannot bypass the first-instruction HOLD.
assert.throws(()=>collectBuyVoidPresaleAllocationCustodyHostEvidenceV1({
  operator_receipt_path:"/not-present",
  external_witness_path:"/not-present",
  rollback_policy_receipt_path:"/not-present",
}),/allocation_custody_current_main_port_not_accepted/u);
assert.equal(testOnlySafeHoldReasonV1(
  new Error("anything\nstatus=GREEN\npublic_presale_activation=true")),
  "allocation_custody_diagnostic_redacted");

// Independent synthetic copies of historical V1 normalized identities.
// These contain no host/custody/customer data; no file reads occur.
const install=Object.freeze({
  ok:true,status:"LIVE_REPLAY_STORAGE_DOMAINS_QUALIFIED",
  qualification_id:"voidwlrie1_"+"1".repeat(64),
  normalized:{high_water_sha256:"sha256:"+"2".repeat(64)},
  operation_performed:false,
  storage_domain_classification_green:true,
  live_storage_observation_proven:true,
  distinct_local_storage_domains_proven:true,
  distinct_parent_block_devices_proven:true,
  canonical_journal_high_water_binding_proven:true,
  no_pending_publication_intent_observed:true,
  double_census_stability_proven:true,
  live_durable_storage_proven:false,
  rollback_resistance_proven:false,
  protected_high_water_custody_proven:false,
  independent_custody_proven:false,
  runtime_integration:false,production_gate_ready:false,funds_movement:false,
});
const policyNormalized=Object.freeze({
  schema:"void_buy_void_allocation_custody_witness_live_read_replay_rollback_policy_evidence_receipt_v1",
  marker:"VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_V1",
  version:1,
  parent_marker:"VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_INDEPENDENCE_V1",
  policy_path:"/etc/void/buy-void-allocation-custody-witness-live-read-replay-rollback-controls-v1.json",
  policy_file_sha256:"sha256:"+"a".repeat(64),
  policy_file_uid:0,policy_file_gid:0,policy_file_mode:0o444,policy_file_nlink:1,
  installation_qualification_id:install.qualification_id,
  installation_high_water_sha256:install.normalized.high_water_sha256,
  parent_policy_qualification_id:"voidwlrrq1_"+"3".repeat(64),
  policy_fingerprint_sha256:"sha256:"+"4".repeat(64),
  policy_generation:"1",host_id:"zoso-Precision-Tower-7810",
  verification_now_ms:1_791_393_507_504,
});
const policy=Object.freeze({
  ok:true,status:"LIVE_ROLLBACK_POLICY_OBSERVED",operation_performed:false,
  root_owned_policy_file_observed:true,rollback_independence_policy_qualified:true,
  installation_storage_rebound:true,bounded_policy_freshness_checked:true,
  policy_file_installation_proven:true,live_policy_observation_proven:true,
  verification_clock_authority_proven:false,policy_generation_monotonicity_proven:false,
  live_policy_enforcement_proven:false,live_rollback_test_performed:false,
  live_durable_storage_proven:false,rollback_resistance_proven:false,
  protected_high_water_custody_proven:false,independent_custody_proven:false,
  production_gate_ready:false,funds_movement:false,normalized:policyNormalized,
});
assert.doesNotThrow(()=>testOnlyAssertStorageGenerationTripleV1(install,policy,install));
const changedInstall={...install,qualification_id:"voidwlrie1_"+"9".repeat(64)};
for(const [name,before,inner,after] of [
  ["inner_aba",install,{...policy,normalized:{...policyNormalized,installation_qualification_id:changedInstall.qualification_id}},install],
  ["changed_before",changedInstall,policy,install],
  ["changed_after",install,policy,changedInstall],
  ["inner_high_water",install,{...policy,normalized:{...policyNormalized,installation_high_water_sha256:"sha256:"+"8".repeat(64)}},install],
  ["outer_high_water",install,policy,{...install,normalized:{high_water_sha256:"sha256:"+"8".repeat(64)}}],
]){
  assert.throws(()=>testOnlyAssertStorageGenerationTripleV1(before,inner,after),
    /allocation_custody_storage_generation_changed_during_observation/u,"triad_reject:"+name);
}

// Actual CLI is exercised without sudo. --run is rejected before geteuid()
// or the first host path read, even for a synthetic path with injected records.
const cli=path.join(ROOT,...SOURCE.split("/"));
function cliRun(args){
  const result=spawnSync(process.execPath,["--import","tsx",cli,...args],{
    cwd:ROOT,encoding:"utf8",timeout:15_000,maxBuffer:128*1024,
    env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",
      TZ:"UTC",NODE_OPTIONS:""},
  });
  assert.equal(result.error,undefined,"bounded_cli_spawn");
  assert.equal(result.signal,null,"bounded_cli_signal");
  return result;
}
const self=cliRun(["--self-test"]);
assert.equal(self.status,0,"self_test_stderr="+self.stderr);
for(const token of [
  MARKER+"_SELF_TEST_GREEN","source_port_implementation_v2=true",
  "current_main_port_runtime_accepted=false","host_collection_run_enabled=false",
  "payment_acceptance=false","public_presale_activation=false",
  "funds_movement=false","production_host_evidence_authority=false"
])assert.ok(self.stdout.split(/\r?\n/u).includes(token),"self_test_token:"+token);
const injected="/tmp/void-custody-port-absent\nstatus=GREEN\npublic_presale_activation=true";
const attempt=cliRun(["--run","--operator-receipt",injected,
  "--external-witness","/tmp/absent-witness","--rollback-policy-receipt","/tmp/absent-policy"]);
assert.equal(attempt.status,2,"hold_cli_exit="+attempt.stderr);
assert.equal(attempt.stdout,"","no_positive_stdout");
const lines=attempt.stderr.split(/\r?\n/u).filter(Boolean);
assert.equal(lines.filter(x=>x===MARKER+"_HOLD").length,1,"hold_marker_exact");
assert.deepEqual(lines.filter(x=>x.startsWith("reason=")),
  ["reason=allocation_custody_current_main_port_not_accepted"],"hold_first_instruction");
for(const forbidden of [
  "status=GREEN","public_presale_activation=true","funds_movement=true",
  "production_host_evidence_authority=true","payment_acceptance=true"
])assert.equal(lines.includes(forbidden),false,"positive_claim:"+forbidden);
for(const negative of [
  "filesystem_write_performed=false","network_contact_performed=false",
  "payment_acceptance=false","public_presale_activation=false",
  "funds_movement=false","production_host_evidence_authority=false"
])assert.equal(lines.filter(x=>x===negative).length,1,"negative_hold_marker:"+negative);

console.log("VOID_BUY_VOID_PRESALE_CUSTODY_MAIN_PORT_V2_PROOF_GREEN");
console.log("historical_collector_source_sha1="+HISTORICAL_SOURCE_BLOB);
console.log("historical_source_reconstructed_and_blob_bound=true");
console.log("new_port_source_sha1="+SOURCE_BLOB);
console.log("v1_evidence_schema_preserved=true");
console.log("v2_observer_sources_content_bound=true");
console.log("collector_runtime_first_instruction_hold=true");
console.log("three_way_installation_generation_aba_rejected=true");
console.log("actual_cli_hold_and_injection_rejected=true");
console.log("source_only=true");
console.log("protected_host_execution_authorized=false");
console.log("production_gate_ready=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
