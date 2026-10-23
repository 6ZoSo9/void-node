#!/usr/bin/env node
// Pure source/candidate proof. Test-only filesystem use is a private scratch
// directory. Never execute custody service or inspect installed host roots.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_CANDIDATE_V3,
  VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_AUTHORITY_V3,
  VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_PREDECESSOR_V2,
  VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_SOURCE_BLOBS_V3,
  VOID_BUY_VOID_CUSTODY_RUNTIME_EXPECTED_FILES_V3,
  VOID_BUY_VOID_CUSTODY_RUNTIME_V3_HOSTED_ID,
  VOID_BUY_VOID_CUSTODY_RUNTIME_V3_HOSTED_SHA256,
  buildVoidBuyVoidCustodyRuntimeBundleCandidateV3,
  verifyVoidBuyVoidCustodyRuntimeBundleCandidateV3,
  canonicalJsonV3,
  testOnlyReadCustodyBundleSourceV3,
} from "../tools/void-buy-allocation-custody-runtime-bundle-candidate-v3.mjs";

const sha1Git = bytes => crypto.createHash("sha1")
  .update(Buffer.from("blob " + bytes.length + "\0","utf8")).update(bytes).digest("hex");
const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const predecessorPins = Object.freeze({
  "tools/void-buy-allocation-custody-runtime-bundle-candidate-v2.mjs":
    "e89de29684b2e26bbfd05e2eed46a56d45c4de43",
  "scripts/prove_void_buy_allocation_custody_runtime_bundle_candidate_v2.mjs":
    "f72dfa6e4345197dcdc97927eaad54feea41f012",
  "docs/architecture/buy-void-allocation-custody-runtime-bundle-candidate-v2.md":
    "0d3aa035204d4cde3c69fb0dbfee79a17dfa142a",
  ".github/workflows/buy-void-allocation-custody-runtime-bundle-candidate-v2.yml":
    "275ed732f861930b896e551782ae4f60009db174",
});
for (const [p, pin] of Object.entries(predecessorPins)) {
  assert.equal(sha1Git(fs.readFileSync(p)),pin,"V2 predecessor bytes must remain exact: "+p);
}
assert.equal(VOID_BUY_VOID_CUSTODY_RUNTIME_V3_HOSTED_ID,
  "UNACCEPTED_PENDING_HOSTED_V3_BUNDLE_ID");
assert.equal(VOID_BUY_VOID_CUSTODY_RUNTIME_V3_HOSTED_SHA256,
  "UNACCEPTED_PENDING_HOSTED_V3_BUNDLE_SHA256");

const v2Source = fs.readFileSync(
  "tools/void-buy-allocation-custody-runtime-bundle-candidate-v2.mjs","utf8");
const sectionStart = v2Source.indexOf(
  "export const VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_SOURCE_BLOBS_V2 =");
const sectionEnd = v2Source.indexOf(
  "export const VOID_BUY_VOID_CUSTODY_RUNTIME_EXPECTED_FILES_V2 =",sectionStart);
assert.ok(sectionStart >= 0 && sectionEnd > sectionStart);
const lines=v2Source.slice(sectionStart,sectionEnd);
const inherited = new Map();
for (const m of lines.matchAll(/"([^"\n]+)":\s*"([0-9a-f]{40})"/gu)) {
  assert.equal(inherited.has(m[1]),false,"duplicate V2 path");
  inherited.set(m[1],m[2]);
}
const now = VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_SOURCE_BLOBS_V3;
assert.equal(inherited.size,19);
assert.deepEqual(Object.keys(now).sort(),[...inherited.keys()].sort());
const delta=Object.keys(now).filter(p=>now[p]!==inherited.get(p)).sort();
assert.deepEqual(delta,[
  "src/economic/buy_void_custody_allocation_roots_observed_read_v1.mjs",
  "src/economic/buy_void_custody_payment_ledgers_observed_read_v1.mjs",
]);
assert.equal(now[delta[0]],"0bfc2e09ee26cbaefb18d3be1a5a65a4afa9dbcb");
assert.equal(now[delta[1]],"e6fbd5b54891ee25daaeb8ae4e6f26073ed71420");
assert.equal(now["src/economic/buy_void_cross_uid_capacity_exclusive_lock_v1.mjs"],
  "94f0a0dd8997e1e2c0fab54044f19d70d983d441");
assert.equal(VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_PREDECESSOR_V2.source_transition_count,2);

const candidate=buildVoidBuyVoidCustodyRuntimeBundleCandidateV3();
assert.equal(verifyVoidBuyVoidCustodyRuntimeBundleCandidateV3(candidate),true);
assert.equal(candidate.marker,VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_CANDIDATE_V3);
assert.equal(candidate.version,3);
assert.equal(candidate.runtime_files.length,10);
assert.equal(candidate.runtime_files.filter(x=>x.runtime_kind==="compiled_typescript").length,6);
assert.deepEqual(candidate.runtime_files.map(x=>x.path).sort(),
  [...VOID_BUY_VOID_CUSTODY_RUNTIME_EXPECTED_FILES_V3].sort());
assert.equal(candidate.predecessor_v2_sources.length,4);
assert.equal(candidate.candidate_accepted,false);
assert.equal(candidate.install_target_selected,false);
assert.equal(candidate.runtime_integration,false);
assert.equal(candidate.funds_movement,false);
for(const key of [
  "claim_reader_fifo_nonblocking_source_bound",
  "allocation_reader_fifo_nonblocking_source_bound",
  "payment_reader_fifo_nonblocking_source_bound",
])assert.equal(VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_AUTHORITY_V3[key],true,key);
for(const key of [
  "candidate_accepted","service_unit_installed","service_started",
  "reserve_method_enabled","recover_method_enabled","payment_acceptance",
  "public_presale_activation","funds_movement",
])assert.equal(VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_AUTHORITY_V3[key],false,key);

const rehash = value => {
  const {candidate_id, ...body} = value;
  return {...body, candidate_id:"voidbuycustodybundle3_"+
    sha256(Buffer.from(canonicalJsonV3(body)+"\n","utf8"))};
};
for(const [name,alter,reason]of [
  ["authority",c=>{c.authority.candidate_accepted=true;},
    /custody_bundle_candidate_authority_invalid/u],
  ["predecessor",c=>{c.predecessor_v2.source_transition_count=0;},
    /custody_bundle_candidate_predecessor_invalid/u],
  ["reader_pin",c=>{const p=c.source_inputs.find(x=>x.path===delta[0]);
    p.git_blob_sha1="0".repeat(40);}, /custody_bundle_candidate_source_pin_invalid/u],
  ["runtime_sha256",c=>{c.runtime_files[0].sha256="0".repeat(64);},
    /custody_bundle_candidate_generated_closure_invalid/u],
  ["runtime_bytes",c=>{c.runtime_files[0].bytes+=1;},
    /custody_bundle_candidate_generated_closure_invalid/u],
  ["runtime_imports",c=>{c.runtime_files[0].imports=[
      ...c.runtime_files[0].imports,"node:assert",
    ];}, /custody_bundle_candidate_generated_closure_invalid/u],
  ["runtime_kind",c=>{c.runtime_files[0].runtime_kind=
      c.runtime_files[0].runtime_kind==="tracked_source"
        ?"compiled_typescript":"tracked_source";},
    /custody_bundle_candidate_generated_closure_invalid/u],
  ["runtime_source_pin",c=>{const p=c.runtime_files.find(
      x=>typeof x.tracked_source_git_blob_sha1==="string");
    assert.ok(p); p.tracked_source_git_blob_sha1="0".repeat(40);},
    /custody_bundle_candidate_generated_closure_invalid/u],
]) {
  const changed=structuredClone(candidate);
  alter(changed);
  assert.throws(()=>verifyVoidBuyVoidCustodyRuntimeBundleCandidateV3(
    rehash(changed)),reason,name);
}

// Real kernel FIFO substitution against the V3 candidate's own checked
// file-open primitive. No hosted root, credentials or economic ledger.
if(process.platform!=="linux")throw Error("linux_test_host_required");
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"void-custody-bundle-v3-source-"));
const src=path.join(temp,"source.candidate");
const displaced=src+".original";
try {
  fs.chmodSync(temp,0o700);
  const bytes=Buffer.from("v3-synthetic-input\n");
  fs.writeFileSync(src,bytes,{mode:0o600});
  assert.deepEqual(testOnlyReadCustodyBundleSourceV3(
    temp,"source.candidate",4096),bytes);
  const original=fs.openSync;
  let calls=0;
  try{
    fs.openSync=function(...args){
      const filepath=String(args[0]);
      if(filepath.endsWith("/source.candidate")){
        const flags=Number(args[1]);
        assert.ok((flags&fs.constants.O_NONBLOCK)!==0,"O_NONBLOCK");
        assert.ok((flags&fs.constants.O_NOFOLLOW)!==0,"O_NOFOLLOW");
        calls++;
        fs.renameSync(src,displaced);
        const fifo=spawnSync("/usr/bin/mkfifo",["-m","600",src],{
          timeout:3000,encoding:"utf8",
          env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"},
        });
        assert.equal(fifo.status,0,"bounded synthetic FIFO create");
      }
      return Reflect.apply(original,fs,args);
    };
    assert.throws(()=>testOnlyReadCustodyBundleSourceV3(
      temp,"source.candidate",4096),
      /custody_bundle_source_(?:open_generation_invalid|file_not_direct_regular_or_size_invalid)/u);
  }finally{fs.openSync=original;}
  assert.equal(calls,1);
  assert.equal(fs.lstatSync(src).isFIFO(),true);
  assert.equal(fs.lstatSync(displaced).isFile(),true);
}finally{fs.rmSync(temp,{force:true,recursive:true});}
console.log("VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_CANDIDATE_V3_SOURCE_PROOF_GREEN");
console.log("predecessor_v2_git_blobs_verified=4");
console.log("exact_source_transitions_from_v2=2");
console.log("three_fifo_safe_readers_bound=true");
console.log("ten_file_package_free_closure_verified=true");
console.log("three_node_byte_equality_required=true");
console.log("real_fifo_swap_rejected_without_blocking=true");
console.log("forged_authority_predecessor_source_pin_rejected=true");
console.log("forged_runtime_record_metadata_rejected=true");
console.log("regenerated_candidate_body_exact_required=true");
console.log("hosted_identity_authenticated=false");
console.log("candidate_accepted=false");
console.log("service_started=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
