#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";

const MARKER="VOID_V7_V5_STAGE_MANIFEST_CANDIDATE_SOURCE_ACCEPTANCE_V1";
const BASE="a672d6be15815a008bbf664ba099fc9ce72bfc92";
const ACCEPTANCE="ops/security/void-v7-v5-stage-manifest-candidate-source-acceptance-v1.json";
const ACCEPTANCE_BLOB="75d30f839a4752eb3a3877e15e55a4576ad0d72f";
const EXPECTED_ID="voidv7v5stagemanifestcandidateaccept1_d3b7f15b65a2d91dbf64b0d5c093612ae8092669a480e80d25c174d31d22bf0b";

const LAUNCHER="ops/precision/void_v7_v5_source_receipt_stage_root_launcher_v2.c";
const LAUNCHER_BLOB="2337466b713b6572cc5ec832817899bbcb4e2ac2";
const ADMISSION="ops/security/buy-void-v7-v5-stage-trusted-admission-plan-v2.json";
const ADMISSION_BLOB="c7ff1128ff04f3ce5f995206af52f844564c6b39";
const HISTORICAL_WORKFLOW=".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v2.yml";
const HISTORICAL_WORKFLOW_BLOB="b82f0d1ea2f9c101343c2023bbf88516c948fa67";
const QUALIFIER="ops/precision/void_v7_v5_source_receipt_stage_pair_qualifier_v2.py";
const QUALIFIER_BLOB="661fa682fab32704f9596d7984b8899f968d5649";
const QUALIFIER_PROOF="scripts/prove_void_v7_v5_stage_static_launcher_qualifier_v2.py";
const QUALIFIER_PROOF_BLOB="89b7e89a69a08e0218a2bfa4a8bc0a1e6df44d60";
const QUALIFIER_WORKFLOW=".github/workflows/void-v7-v5-stage-static-launcher-qualifier-v2.yml";
const QUALIFIER_WORKFLOW_BLOB="27570b2658be891ecb5c17157cb4d2c37b9ffb06";

const SELF="scripts/prove_void_v7_v5_stage_manifest_candidate_source_acceptance_v1.mjs";
const DOC="docs/security/void-v7-v5-stage-manifest-candidate-source-acceptance-v1.md";
const WORKFLOW=".github/workflows/void-v7-v5-stage-manifest-candidate-source-acceptance-v1.yml";
const OWNED=Object.freeze([WORKFLOW,DOC,ACCEPTANCE,SELF].sort());
const MAX_ACCEPTANCE_BYTES=256*1024;
const FLAGS=fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK;
const decoder=new TextDecoder("utf-8",{fatal:true});

function git(args){
  return execFileSync("/usr/bin/git",[
    "--no-replace-objects",
    "-c","core.hooksPath=/dev/null",
    "-c","core.fsmonitor=false",
    "-C",process.cwd(),
    ...args,
  ],{
    encoding:"utf8",
    env:{
      PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",
      GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",GIT_NO_REPLACE_OBJECTS:"1",
      GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0",GIT_ASKPASS:"/bin/false",
    },
  }).trim();
}
function canonical(v){
  if(v===null||typeof v==="boolean"||typeof v==="string")return JSON.stringify(v);
  if(typeof v==="number"){
    assert.ok(Number.isSafeInteger(v),"non_canonical_number");
    return String(v);
  }
  if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
  assert.ok(v&&typeof v==="object"&&!Array.isArray(v),"non_canonical_value");
  return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
}
const sha256=s=>crypto.createHash("sha256").update(s).digest("hex");
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+String(bytes.length)+"\0","utf8"))
    .update(bytes).digest("hex");
}
function sameGeneration(a,b,label){
  for(const key of ["dev","ino","uid","gid","mode","nlink","size","mtimeMs","ctimeMs"]){
    assert.equal(a[key],b[key],label+"_generation_changed:"+key);
  }
}
function readPinnedBytesAtPath(file,expectedBlob,maxBytes,options={}){
  assert.ok(Number.isSafeInteger(maxBytes)&&maxBytes>0,"pinned_max_invalid");
  const before=fs.lstatSync(file);
  assert.ok(
    before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&
    before.size>0&&before.size<=maxBytes,
    "pinned_preopen_shape_invalid",
  );
  let fd=-1;
  try{
    const opener=options.openImpl??((name,flags)=>fs.openSync(name,flags));
    fd=opener(file,FLAGS);
    const opened=fs.fstatSync(fd);
    assert.ok(opened.isFile()&&opened.nlink===1,"pinned_open_shape_invalid");
    sameGeneration(before,opened,"pinned_open");

    const bytes=Buffer.alloc(opened.size);
    let off=0;
    while(off<bytes.length){
      const got=fs.readSync(fd,bytes,off,bytes.length-off,null);
      assert.ok(got>0,"pinned_short_read");
      off+=got;
    }
    options.afterRead?.({fd,file,bytes});
    const extra=Buffer.alloc(1);
    assert.equal(fs.readSync(fd,extra,0,1,null),0,"pinned_growth_detected");

    const after=fs.fstatSync(fd);
    const visible=fs.lstatSync(file);
    assert.ok(visible.isFile()&&!visible.isSymbolicLink()&&visible.nlink===1,
      "pinned_visible_shape_invalid");
    sameGeneration(opened,after,"pinned_postread");
    sameGeneration(after,visible,"pinned_visible");
    assert.equal(gitBlob(bytes),expectedBlob,"pinned_read_blob_mismatch");
    return bytes;
  }finally{
    if(fd>=0)fs.closeSync(fd);
  }
}
function readAcceptance(){
  assert.equal(git(["rev-parse","HEAD:"+ACCEPTANCE]),ACCEPTANCE_BLOB,
    "acceptance_tree_blob_mismatch");
  return readPinnedBytesAtPath(
    path.join(process.cwd(),ACCEPTANCE),
    ACCEPTANCE_BLOB,
    MAX_ACCEPTANCE_BYTES,
  );
}
function verifyScope(){
  git(["merge-base","--is-ancestor",BASE,"HEAD"]);
  assert.equal(git(["merge-base",BASE,"HEAD"]),BASE,"base_mismatch");
  const rows=git(["diff","--name-status",BASE,"HEAD","--"]).split(/\n/u).filter(Boolean);
  assert.equal(rows.length,OWNED.length,"acceptance_scope_count");
  const actual=rows.map(row=>{
    const m=row.match(/^M\t(.+)$/u);
    assert.ok(m,"acceptance_scope_not_modify_only:"+row);
    return m[1];
  }).sort();
  assert.deepEqual(actual,OWNED,"acceptance_scope_paths");
  git(["diff","--check",BASE,"HEAD"]);
}
function pin(relative,blob){
  assert.equal(git(["rev-parse","HEAD:"+relative]),blob,"dependency_blob_drift:"+relative);
}
function validateDecision(doc){
  assert.equal(doc.reviewed_launcher_source.launcher_source_identity_bound_for_manifest_candidate_derivation,true);
  assert.equal(doc.reviewed_launcher_source.p1_manifest_root_of_trust_binding_gap_unresolved,true);
  assert.equal(doc.reviewed_launcher_source.launcher_source_review_accepted,false);
  assert.equal(doc.reviewed_staging_pair_qualifier_repair.head,BASE);
  assert.equal(doc.reviewed_staging_pair_qualifier_repair.qualifier_git_blob_sha1,QUALIFIER_BLOB);
  assert.equal(doc.reviewed_staging_pair_qualifier_repair.focused_workflow_success,true);
  assert.equal(doc.reviewed_staging_pair_qualifier_repair.single_receipt_generation_bound,true);
  assert.equal(doc.reviewed_staging_pair_qualifier_repair.recursive_source_custody_bound,true);

  const d=doc.review_decision;
  assert.equal(d.launcher_source_identity_bound_for_manifest_candidate_derivation,true);
  if(d.hardened_launcher_source_review_accepted!==false){
    throw new Error("launcher_review_overclaim");
  }
  assert.equal(d.staging_pair_qualifier_exact_head_ci_green,true);
  assert.equal(d.payload_manifest_candidate_generation_authorized,true);
  assert.equal(d.payload_manifest_candidate_is_repair_input,true);
  assert.equal(doc.future_manifest_candidate_contract.candidate_is_repair_input_not_launcher_acceptance,true);
  assert.equal(doc.future_manifest_candidate_contract.static_runtime_identity_currently_accepted,false);
  assert.equal(doc.known_holds.launcher_p1_manifest_root_of_trust_binding_gap,true);
  assert.equal(doc.known_holds.static_python_identity_not_accepted,true);
  assert.equal(doc.known_holds.stdlib_identity_not_accepted,true);

  for(const key of [
    "payload_manifest_accepted","closed_tree_bootstrap_install_authorized",
    "launcher_install_authorized","root_execution_authorized",
    "source_stage_apply_authorized","receipt_stage_apply_authorized",
    "fixed_source_exchange_authority","fixed_receipt_exchange_authority",
    "transition_journal_mutation","consumer_fence_mutation","service_mutation",
    "systemd_mutation","provider_rpc_contact","credential_access",
    "private_key_access","wallet_or_signer_access","signing","transaction",
    "payment_acceptance","public_presale_activation","wc_void_market_activation",
    "treasury_liquidity_action","funds_movement",
  ])assert.equal(d[key],false,"authority_overclaim:"+key);
}
function readerSelfTest(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"void-v7-manifest-acceptance-read-"));
  const file=path.join(dir,"acceptance");
  const backup=path.join(dir,"backup");
  const accepted=Buffer.from("REVIEWED!","utf8");
  const attacker=Buffer.from("ATTACKER!","utf8");
  assert.equal(accepted.length,attacker.length);
  try{
    fs.writeFileSync(file,accepted,{mode:0o600});
    const expected=gitBlob(accepted);
    assert.deepEqual(readPinnedBytesAtPath(file,expected,1024),accepted);
    assert.throws(()=>readPinnedBytesAtPath(file,expected,4),/pinned_preopen_shape_invalid/u);

    assert.throws(()=>readPinnedBytesAtPath(file,expected,1024,{
      openImpl(name,flags){
        assert.ok((flags&fs.constants.O_NOFOLLOW)!==0,"nofollow_missing");
        assert.ok((flags&fs.constants.O_NONBLOCK)!==0,"nonblock_missing");
        fs.renameSync(name,backup);
        fs.writeFileSync(name,attacker,{mode:0o600});
        return fs.openSync(name,flags);
      },
    }),/pinned_open_generation_changed/u);
    fs.rmSync(file,{force:true});
    fs.renameSync(backup,file);

    assert.throws(()=>readPinnedBytesAtPath(file,expected,1024,{
      openImpl(name,flags){
        assert.ok((flags&fs.constants.O_NOFOLLOW)!==0,"nofollow_missing");
        fs.renameSync(name,backup);
        fs.symlinkSync(backup,name);
        return fs.openSync(name,flags);
      },
    }));
    fs.rmSync(file,{force:true});
    fs.renameSync(backup,file);

    assert.throws(()=>readPinnedBytesAtPath(file,expected,1024,{
      openImpl(name,flags){
        assert.ok((flags&fs.constants.O_NOFOLLOW)!==0,"nofollow_missing");
        assert.ok((flags&fs.constants.O_NONBLOCK)!==0,"nonblock_missing");
        fs.renameSync(name,backup);
        execFileSync("/usr/bin/mkfifo",[name],{
          stdio:"ignore",
          env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC"},
        });
        fs.chmodSync(name,0o600);
        return fs.openSync(name,flags);
      },
    }),/pinned_open_shape_invalid/u);
    fs.rmSync(file,{force:true});
    fs.renameSync(backup,file);

    assert.throws(()=>readPinnedBytesAtPath(file,expected,1024,{
      afterRead(){fs.appendFileSync(file,"X");},
    }),/pinned_growth_detected|generation_changed/u);
  }finally{
    fs.rmSync(dir,{recursive:true,force:true});
  }
}

verifyScope();
pin(LAUNCHER,LAUNCHER_BLOB);
pin(ADMISSION,ADMISSION_BLOB);
pin(HISTORICAL_WORKFLOW,HISTORICAL_WORKFLOW_BLOB);
pin(QUALIFIER,QUALIFIER_BLOB);
pin(QUALIFIER_PROOF,QUALIFIER_PROOF_BLOB);
pin(QUALIFIER_WORKFLOW,QUALIFIER_WORKFLOW_BLOB);
readerSelfTest();

const bytes=readAcceptance();
const doc=JSON.parse(decoder.decode(bytes));
const {acceptance_id,...body}=doc;
assert.equal(acceptance_id,EXPECTED_ID);
assert.equal(
  acceptance_id,
  "voidv7v5stagemanifestcandidateaccept1_"+sha256(canonical(body)),
  "acceptance_content_address_mismatch",
);
validateDecision(doc);

const overclaim=structuredClone(doc);
overclaim.review_decision.hardened_launcher_source_review_accepted=true;
assert.throws(()=>validateDecision(overclaim),/launcher_review_overclaim/u);

assert.equal(doc.future_manifest_candidate_contract.required_launcher_receipt_entry_count,22);
assert.equal(doc.future_manifest_candidate_contract.static_python_identity_must_be_separately_reviewed,true);
assert.equal(doc.future_manifest_candidate_contract.stdlib_identity_must_be_separately_reviewed,true);
assert.equal(
  doc.next_gate,
  "QUALIFY_STATIC_PYTHON_STDLIB_IDENTITIES_THEN_DERIVE_HARDENED_V2_CLOSED_TREE_PAYLOAD_MANIFEST_CANDIDATE",
);

console.log(MARKER+"_GREEN");
console.log("acceptance_id="+EXPECTED_ID);
console.log("acceptance_read_descriptor_bound=true");
console.log("acceptance_read_git_blob_bytes_authenticated=true");
console.log("acceptance_fifo_substitution_nonblocking_rejected=true");
console.log("acceptance_same_length_swap_rejected=true");
console.log("acceptance_symlink_substitution_rejected=true");
console.log("acceptance_oversized_and_growth_reads_rejected=true");
console.log("launcher_source_identity_bound_for_manifest_candidate_derivation=true");
console.log("hardened_launcher_source_review_accepted=false");
console.log("launcher_p1_manifest_root_of_trust_binding_gap=true");
console.log("staging_pair_qualifier_exact_head_ci_green=true");
console.log("payload_manifest_candidate_generation_authorized=true");
console.log("payload_manifest_candidate_is_repair_input=true");
console.log("static_runtime_identity_currently_accepted=false");
console.log("payload_manifest_accepted=false");
console.log("root_execution_authorized=false");
console.log("source_stage_apply_authorized=false");
console.log("receipt_stage_apply_authorized=false");
console.log("fixed_source_exchange_authority=false");
console.log("fixed_receipt_exchange_authority=false");
console.log("service_mutation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");