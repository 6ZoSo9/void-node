#!/usr/bin/env node
// Candidate bridge ONLY: original frozen V1 contract restored on current main,
// with reviewed V2 source/build/compiled closure still byte-identical.
// No host attestation, acceptance, installation, service or funds authority.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CURRENT_GENERATION = "884edc6e82bd505a83e51a44b38f7e318431f314";
const ORIGINAL_V1_REF = "f627cad6bc07a6ad3ebe7cbd946723316fcd0567";
const ORIGINAL_CONTRACT = "d2e84643c9f4d76c642c7e07d4ea2bf1634035e4";
const REWRITTEN_V1_ALIAS = "d0f80d3b50e3dcc46c1f58dc4bd0a73b7875db56";
const LOCK = "docs/architecture/buy-void-nimo-witness-v2-proposed-lock-v1.json";
const LOCK_GIT_BLOB = "73c7f88348a1d6b208336df8779940657607bd7d";
const SOURCE_CONTRACT =
  "src/economic/buy_void_allocation_custody_witness_runtime_bundle_qualification_v1.ts";
const SOURCE = Object.freeze([
  ["tools/void-buy-allocation-custody-witness-forced-command-v2.mjs",
    "742cf489d8a785aa155a0e1bd12b65e94e07d1f1"],
  ["src/economic/buy_void_allocation_custody_external_witness_v1.ts",
    "5d24f3fb3e94611c653a0e3e1319afa7d0f4db72"],
  ["src/economic/buy_void_allocation_custody_witness_transport_v1.ts",
    "a5163272f08d6d96a9c2387fa6db344018e09694"],
  ["src/economic/buy_void_allocation_reservation_high_water_v1.ts",
    "9383c94cf848efb9a0112f1b741df4e10f790ac6"],
  ["src/economic/buy_void_allocation_reservation_ledger_v1.ts",
    "c3fc204710a9189723651cfeb6ffc52b1aa049db"],
  ["src/economic/buy_void_auto_fulfillment_v1.ts",
    "b7c963b1d55f000d82ad82289b31107b432503de"],
  ["src/economic/buy_void_crash_consistent_saga_server_policy_v1.ts",
    "e284a38a4b7f3d498b07e77c661d6eef3b742e7a"],
  ["src/economic/buy_void_filesystem_bakery_lock_v1.ts",
    "03376ad9853c1ca37c5be4d7f36d9daccab25078"],
]);
const BUILD = Object.freeze([
  ["package.json","f28c3e9446c7623ef203da36a9642d046e5f34ee"],
  ["package-lock.json","b2671f0149f522b2489247016df0a5ec4bb72b8b"],
  ["tsconfig.json","c970faf406a0fa95638ce0b1ac0c63f8d8e96120"],
  ["tsconfig.build.json","d43e7f3fa03d20159f7b92aca4c8a56e738cd2fb"],
  ["scripts/copy_void_runtime_js_v1.mjs","d1c4b3735ca2d3a9aa392ec1173cf7b123e0f9d9"],
  ["scripts/retire_saveblock_periodic_rewriters_v1.mjs","3786dbc03de4be29b6e42059e46dbe1b95d8aa04"],
  ["Dockerfile","2acd9bcf0416eeb0f9fd72c1a556696863ff1607"],
]);
const RUNTIME = Object.freeze([
  ["tools/void-buy-allocation-custody-witness-forced-command-v2.mjs",
    "/usr/local/libexec/void/void-buy-allocation-custody-witness-forced-command-v2.mjs"],
  ["dist/economic/buy_void_allocation_custody_external_witness_v1.js",
    "/usr/local/libexec/dist/economic/buy_void_allocation_custody_external_witness_v1.js"],
  ["dist/economic/buy_void_allocation_custody_witness_transport_v1.js",
    "/usr/local/libexec/dist/economic/buy_void_allocation_custody_witness_transport_v1.js"],
  ["dist/economic/buy_void_allocation_reservation_high_water_v1.js",
    "/usr/local/libexec/dist/economic/buy_void_allocation_reservation_high_water_v1.js"],
  ["dist/economic/buy_void_allocation_reservation_ledger_v1.js",
    "/usr/local/libexec/dist/economic/buy_void_allocation_reservation_ledger_v1.js"],
  ["dist/economic/buy_void_auto_fulfillment_v1.js",
    "/usr/local/libexec/dist/economic/buy_void_auto_fulfillment_v1.js"],
  ["dist/economic/buy_void_crash_consistent_saga_server_policy_v1.js",
    "/usr/local/libexec/dist/economic/buy_void_crash_consistent_saga_server_policy_v1.js"],
  ["dist/economic/buy_void_filesystem_bakery_lock_v1.js",
    "/usr/local/libexec/dist/economic/buy_void_filesystem_bakery_lock_v1.js"],
]);
const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const blob = bytes => crypto.createHash("sha1")
  .update(Buffer.from("blob "+bytes.length+"\0")).update(bytes).digest("hex");
const original = ref => execFileSync("git", ["show", ref+":"+SOURCE_CONTRACT], {
  cwd: ROOT, maxBuffer: 1024*1024, stdio: ["ignore","pipe","pipe"],
});
function same(a,b) {
  return a.dev===b.dev && a.ino===b.ino && a.uid===b.uid &&
    a.gid===b.gid && a.mode===b.mode && a.nlink===b.nlink &&
    a.size===b.size && a.mtimeNs===b.mtimeNs && a.ctimeNs===b.ctimeNs;
}
function bound(file) {
  assert.match(file, /^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/u);
  assert.ok(!file.split("/").some(p=>p==="."||p===".."));
  const full = path.join(ROOT,file);
  const prior=fs.lstatSync(full,{bigint:true});
  assert.ok(prior.isFile() && !prior.isSymbolicLink() &&
    prior.nlink===1n && prior.size>0n && prior.size<=16n*1024n*1024n,
    "invalid candidate leaf: "+file);
  const fd=fs.openSync(full,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
  try {
    const pinned=fs.fstatSync(fd,{bigint:true});
    assert.ok(same(prior,pinned),"changed file before read: "+file);
    const output=Buffer.alloc(Number(prior.size)+1);
    let count=0;
    while(count<output.length) {
      const n=fs.readSync(fd,output,count,output.length-count,count);
      if(!n)break;
      count+=n;
    }
    assert.equal(count,Number(prior.size),"file growth/truncation: "+file);
    assert.ok(same(pinned,fs.fstatSync(fd,{bigint:true})));
    assert.ok(same(pinned,fs.lstatSync(full,{bigint:true})));
    return Buffer.from(output.subarray(0,count));
  } finally { fs.closeSync(fd); }
}
function verifyLock(lock) {
  assert.equal(lock.schema,"void_buy_void_nimo_witness_v2_proposed_lock_v1");
  assert.equal(lock.status,"HOLD_UNACCEPTED_SOURCE_CANDIDATE");
  assert.equal(lock.exact_source_generation_commit,CURRENT_GENERATION);
  assert.equal(lock.historical_v1_original_contract_git_blob_sha1,ORIGINAL_CONTRACT);
  assert.equal(lock.integrated_draft_v1_contract_git_blob_sha1,REWRITTEN_V1_ALIAS);
  assert.equal(lock.historical_v1_manifest_id,
    "voidwfb1_2a729229f63c10a1562050924ddc279d8255a35603542967431a584977f1f6b7");
  assert.equal(lock.candidate_manifest_id,
    "voidwfb2_b1cf93ea36879332d2745294b8aab1b261d5e7c13522af681db8d390254df73d");
  assert.equal(lock.candidate_record_sha256,
    "sha256:84be9d7a3e8ac9b5426dacd324f0d6e1b45eac5ae0fe797b2a072de57180ccf3");
  assert.equal(lock.candidate_v2_auto_fulfillment_sha256,
    "119a08db651cb85091f66ed2c9e475c56a81f21c9084c47c7f8ee083f831a47c");
  assert.equal(lock.historical_v1_installed_auto_fulfillment_sha256,
    "ae15c56f1aa7009955058ca1d454da5e0d55a3e6c2011c54e7316374e33a5cf6");
  assert.equal(lock.runtime_file_count,8);
  assert.ok(Array.isArray(lock.runtime_files) && lock.runtime_files.length===8);
  for(const [i,[file,installed]] of RUNTIME.entries()) {
    assert.equal(lock.runtime_files[i].path,file);
    assert.equal(lock.runtime_files[i].installed_path,installed);
    assert.match(lock.runtime_files[i].sha256,/^[0-9a-f]{64}$/u);
    assert.ok(Number.isSafeInteger(lock.runtime_files[i].bytes) &&
      lock.runtime_files[i].bytes > 0 && lock.runtime_files[i].bytes <= 16*1024*1024);
  }
  assert.equal(lock.runtime_files[5].sha256,lock.candidate_v2_auto_fulfillment_sha256);
  const authority=lock.authority;
  const allowedTrue=new Set(["candidate_v2_compiled_source_reproducible_in_ci_only"]);
  for(const [field,value] of Object.entries(authority)) {
    assert.equal(value,allowedTrue.has(field),
      "unaccepted authority flag: "+field);
  }
  for(const field of [
    "v2_runtime_bundle_identity_accepted","v2_host_installed",
    "v2_host_principal_verified","v2_authenticated_transport_qualified",
    "verified_payment_to_allocation_mounted","presale_activation","funds_moved",
    "historical_v1_installation_confirmed_by_authenticated_attestation"
  ]) assert.equal(authority[field],false);
}
function main() {
  assert.deepEqual(process.argv.slice(2),["--prove"]);
  assert.equal(process.platform,"linux");
  assert.ok([22,24,26].includes(Number(process.versions.node.split(".")[0])));
  const lockBytes=bound(LOCK);
  assert.equal(blob(lockBytes),LOCK_GIT_BLOB,"exact reviewed proposed lock bytes");
  const lock=JSON.parse(lockBytes.toString("utf8"));
  verifyLock(lock);
  const frozen=bound(SOURCE_CONTRACT);
  assert.equal(blob(frozen),ORIGINAL_CONTRACT);
  assert.equal(blob(original(ORIGINAL_V1_REF)),ORIGINAL_CONTRACT);
  assert.equal(blob(original(CURRENT_GENERATION)),REWRITTEN_V1_ALIAS);
  assert.notEqual(ORIGINAL_CONTRACT,REWRITTEN_V1_ALIAS);
  execFileSync("git",["merge-base","--is-ancestor",CURRENT_GENERATION,"HEAD"],
    {cwd:ROOT,stdio:"ignore"});
  const inputFiles=[...SOURCE,...BUILD];
  execFileSync("git",["diff","--quiet",CURRENT_GENERATION,"HEAD","--",
    ...inputFiles.map(q=>q[0])],{cwd:ROOT,stdio:"ignore"});
  for(const [file,wanted] of inputFiles) {
    assert.equal(blob(bound(file)),wanted,"reviewed current input drift:"+file);
  }
  const readRuntime=RUNTIME.map(([file,installed],i)=>{
    const bytes=bound(file), record=lock.runtime_files[i];
    assert.equal(record.path,file);
    assert.equal(record.installed_path,installed);
    assert.equal(record.bytes,bytes.length,"runtime bytes drift:"+file);
    assert.equal(record.sha256,sha256(bytes),"runtime SHA256 drift:"+file);
    return {file,bytes:bytes.length,sha256:record.sha256};
  });
  assert.equal(readRuntime[5].sha256,
    "119a08db651cb85091f66ed2c9e475c56a81f21c9084c47c7f8ee083f831a47c");
  let negatives=0;
  for(const change of [
    l=>{l.historical_v1_manifest_id="voidwfb1_"+"0".repeat(64);},
    l=>{l.runtime_files[5].sha256="0".repeat(64);},
    l=>{l.runtime_file_count=7;},
    l=>{l.authority.v2_host_installed=true;},
    l=>{l.candidate_manifest_id="voidwfb2_"+"0".repeat(64);},
  ]) {
    const clone=JSON.parse(JSON.stringify(lock));change(clone);
    assert.throws(()=>verifyLock(clone));negatives++;
  }
  assert.equal(negatives,5);
  console.log("original_frozen_v1_git_blob_preserved=true");
  console.log("integration_rewritten_v1_alias_not_accepted=true");
  console.log("current_source_and_build_inputs_exact=true");
  console.log("current_v2_eight_compiled_runtime_files_exact=true");
  console.log("malicious_candidate_mutations_held=5");
  console.log("candidate_manifest_id="+lock.candidate_manifest_id);
  console.log("v2_compiled_candidate_only=true");
  console.log("installed_nimo_v2_verified=false");
  console.log("cross_uid_authenticated_custody_ipc=false");
  console.log("production_payment_authority_ready=false");
  console.log("production_allocation_mutation_ready=false");
  console.log("presale_activation=false");
  console.log("funds_moved=false");
  console.log("VOID_BUY_VOID_NIMO_ORIGINAL_V1_CURRENT_V2_BOUNDARY_GREEN");
}
main();
