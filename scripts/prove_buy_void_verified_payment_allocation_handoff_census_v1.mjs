#!/usr/bin/env node
// Source-only launch gate census. It does NOT read a customer ledger, fsync an
// operator event, write allocation state, or grant presale/payment authority.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const FILES=Object.freeze([
  ["src/economic/buy_void_verified_payment_capacity_admission_v1.ts",
   "617e401c3202e34e8754e988cea66c9caa02f873"],
  ["src/economic/buy_void_allocation_reservation_publication_writer_v1.ts",
   "59b336eb82222bf0f5bcfe37060ec520c54e9b62"],
  ["src/economic/buy_void_verified_allocation_replay_binding_v1.ts",
   "feb1f0e3fea1ff07406cd3b8fcd315c48338596f"]
]);
const MAX_SOURCE_BYTES=128*1024;
function gitBlob(b){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+b.length+"\0","utf8"))
    .update(b).digest("hex");
}
function pinnedRead(relative,expected){
  assert.match(relative,/^src\/economic\/[a-z0-9_]+\.ts$/u);
  const abs=path.join(ROOT,relative);
  const st=fs.lstatSync(abs);
  assert.ok(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1&&
    st.size>0&&st.size<=MAX_SOURCE_BYTES,"unreviewed source file mode/size");
  assert.ok(typeof fs.constants.O_NOFOLLOW==="number"&&
    fs.constants.O_NOFOLLOW>0,"nofollow unavailable");
  let fd;
  try {
    fd=fs.openSync(abs,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
    const before=fs.fstatSync(fd);
    for(const key of ["dev","ino","size","mode","mtimeMs","ctimeMs","nlink"])
      assert.equal(before[key],st[key],"source path/descriptor not bound: "+key);
    const bytes=Buffer.alloc(st.size+1);
    let total=0;
    while(total<bytes.length){
      const n=fs.readSync(fd,bytes,total,bytes.length-total,total);
      if(n===0)break;
      total+=n;
    }
    assert.equal(total,before.size,"source file grew or truncated");
    const after=fs.fstatSync(fd),visible=fs.lstatSync(abs);
    for(const key of ["dev","ino","size","mode","mtimeMs","ctimeMs","nlink"]){
      assert.equal(after[key],before[key],"source descriptor changed: "+key);
      assert.equal(visible[key],after[key],"source path rebound: "+key);
    }
    const captured=bytes.subarray(0,total);
    assert.equal(gitBlob(captured),expected,"source generation changed: "+relative);
    return captured.toString("utf8");
  }finally{if(fd!==undefined)fs.closeSync(fd);}
}
function indexOnly(source){
  const begin="export async function withBuyVoidVerifiedPaymentCapacityAdmissionV1";
  const end="export async function writeBuyVoidOperatorEventWithCapacityAdmissionV1";
  const a=source.indexOf(begin),b=source.indexOf(end,a+begin.length);
  assert.ok(a>=0&&b>a&&source.indexOf(begin,a+1)<0&&
    source.indexOf(end,b+1)<0,"capacity function boundary changed");
  return [source.slice(a,b),source.slice(b)];
}
function qualify(capacity,publication,replay){
  const [locked,write]=indexOnly(capacity);
  const appendA=capacity.indexOf("function appendPaymentVerifiedEventDurableV1(");
  const appendB=capacity.indexOf("function paymentVerifiedSidecarPathV1(",appendA);
  assert.ok(appendA>=0&&appendB>appendA,
    "durable event writer source boundary changed");
  const append=capacity.slice(appendA,appendB);
  assert.match(append,/fs[.]fsyncSync[(]operatorLedger[.]fd[)]/u,
    "durable verified event fd fsync missing");
  assert.match(append,/fs[.]fsyncSync[(]operatorLedger[.]directory[.]fd[)]/u,
    "durable verified event parent directory fsync missing");
  const before=locked.indexOf("if (alreadyVerified) {");
  const after=locked.indexOf("const result = await input.operation({",before);
  assert.ok(before>=0&&after>before,"idempotent branch does not bypass input.operation");
  assert.match(locked.slice(before,after),/idempotent:\s*true/u);
  assert.match(locked.slice(before,after),/operation_performed:\s*false/u);
  assert.match(write,/appendPaymentVerifiedEventDurableV1\(/u);
  assert.match(write,/if\s*\(admission\.idempotent\)\s*\{/u);
  assert.match(write,/recoverPaymentVerifiedSidecarsV1\(/u);
  assert.doesNotMatch(write,/persistBuyVoidAllocationReservationPublicationWriterV1/u,
    "allocation publisher unexpectedly mounted; review new generation");
  assert.doesNotMatch(write,/planBuyVoidAllocationReservationV1/u,
    "allocation planner unexpectedly mounted; review new generation");
  assert.doesNotMatch(locked,/persistBuyVoidAllocationReservationPublicationWriterV1/u);
  const persisted=publication.includes("export function persistBuyVoidAllocationReservationPublicationWriterV1(");
  assert.equal(persisted,true,"allocation publication writer disappeared");
  const authStart=publication.indexOf(
    "export const VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_AUTHORITY_V1 =");
  const authEnd=publication.indexOf("const LEDGER_NAME =",authStart);
  assert.ok(authStart>=0&&authEnd>authStart,"allocation publisher authority block changed");
  const sourceAuthority=publication.slice(authStart,authEnd);
  assert.match(sourceAuthority,/runtime_integration:\s*false/u,
    "runtime_integration authority unexpectedly promoted");
  assert.match(sourceAuthority,/payment_verified_event_write:\s*false/u,
    "payment writer authority unexpectedly promoted");
  assert.match(sourceAuthority,/allocation_ledger_write:\s*true/u,
    "allocation writer source contract changed");
  assert.match(replay,/verified_allocation_requires_protected_recovery/u);
  assert.match(replay,/independently_proven_event_fsync:\s*false/u);
  assert.match(replay,/capacity_lock_held:\s*false/u);
  assert.match(replay,/allocation_write:\s*false/u);
  return Object.freeze({
    marker:"VOID_BUY_VOID_VERIFIED_PAYMENT_TO_ALLOCATION_HANDOFF_CENSUS_V1",
    schema:"void_buy_void_verified_payment_allocation_handoff_census_v1",
    version:1,
    reviewed_source_file_blobs:FILES.map(([p,blob])=>({path:p,git_blob_sha1:blob})),
    durable_payment_verified_event_writer_present:true,
    verified_payment_capacity_serialization_present:true,
    payment_idempotent_return_precedes_mutation_callback:true,
    idempotent_replay_only_recovers_payment_sidecar:true,
    independent_allocation_publication_writer_exists:true,
    allocation_publication_writer_mounted_in_payment_capacity:false,
    allocation_writer_within_capacity_duplicate_lock_proven:false,
    allocation_after_verified_payment_fsync_proven:false,
    verified_payment_idempotent_allocation_recovery_proven:false,
    original_request_deployment_authority_proven:false,
    protected_allocation_high_water_custody_proven:false,
    exactly_once_allocation_production_ready:false,
    operation_performed:false,
    allocation_record_written:false,
    payment_event_written:false,
    presale_activation:false,
    funds_moved:false
  });
}
function selfTest(){
  const [capacity,publication,replay]=FILES.map(([p,sha])=>pinnedRead(p,sha));
  const good=qualify(capacity,publication,replay);
  assert.equal(good.exactly_once_allocation_production_ready,false);
  const mutation=capacity.replace(
    "if (alreadyVerified) {",
    "if (NEEDS_INDEPENDENT_REVIEW) {"
  );
  assert.notEqual(mutation,capacity);
  assert.throws(()=>qualify(mutation,publication,replay),
    /idempotent branch does not bypass input.operation/u);
  assert.throws(()=>qualify(capacity,
    publication.replace("runtime_integration: false","runtime_integration: true"),
    replay),/runtime_integration/u);
  const changedRecovery=capacity.replace(
    "const recovery = recoverPaymentVerifiedSidecarsV1(",
    "const recovery = recoverAllocationAfterFsyncMightBePresent("
  );
  assert.notEqual(changedRecovery,capacity);
  assert.throws(()=>qualify(changedRecovery,publication,replay),
    /recoverPaymentVerifiedSidecarsV1/u);
  const missingFsync=capacity.replace(
    "fs.fsyncSync(operatorLedger.fd);",
    "/* deliberately absent event fsync */"
  );
  assert.notEqual(missingFsync,capacity);
  assert.throws(()=>qualify(missingFsync,publication,replay),
    /durable verified event fd fsync missing/u);
  console.log("VOID_BUY_VOID_ALLOCATION_HANDOFF_GAP_SOURCE_PROOF_GREEN");
  console.log("test_only_in_memory_source_mutations=true");
  console.log("real_request_or_operator_ledger_read=false");
  console.log("allocation_mutation=false");
  console.log("payment_event_mutation=false");
  console.log("exactly_once_allocation_production_ready=false");
  console.log("presale_activation=false");
  console.log("funds_moved=false");
}
const mode=process.argv.slice(2);
if(mode.length===1&&mode[0]==="--self-test")selfTest();
else if(mode.length===1&&mode[0]==="--census"){
  console.log(JSON.stringify(qualify(...FILES.map(([p,b])=>pinnedRead(p,b))),null,2));
}else throw Error("allocation_handoff_source_census_only_no_authority");
