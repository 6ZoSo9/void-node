#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  classifyEpoch2AuthenticatedCredentialPublicEvidenceV2,
  NEXT_ACTION as COMPOSER_NEXT_ACTION,
} from "../../tools/void-buy-void-epoch2-authenticated-credential-public-evidence-v2.mjs";

export const MARKER =
  "VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_LIVE_COMPOSITION_V1";
export const CONFIRM =
  "RUN_AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V1";
export const STATUS =
  "AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_GREEN";
export const NEXT_ACTION =
  "BIND_AUTHENTICATED_EPOCH2_CREDENTIAL_EVIDENCE_IN_DORMANT_CANDIDATE_SUCCESSOR";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const QUALIFIER_REL=
  "ops/precision/void_buy_void_user_manager_credential_query_installed_qualification_v1.py";
const SEALED_REL=
  "scripts/void_buy_void_epoch2_credential_attestation_sealed_v1.mjs";
const QUALIFIER=path.join(ROOT,QUALIFIER_REL);
const SEALED_CONFIRM=
  "probeBuyVoidEpoch2InstalledCredentialSigningCapabilitySealedV1";
const SEALED_BLOB="bb58ec88472b724e23aeccf65f44f4582c4a1440";
const QUALIFIER_BLOB="5dec0f9534c3b2d6c8d4a0647e69d3c89ab91cd6";
const RUNTIME_UID=1000;
const RUNTIME_GID=1000;
const RUNTIME_HOME="/home/zoso";
const GIT="/usr/bin/git";
const PYTHON="/usr/bin/python3";
const NODE="/usr/bin/node";
const SETPRIV="/usr/bin/setpriv";
const MAX_OUTPUT=2*1024*1024;
const SHA40=/^[0-9a-f]{40}$/u;

function sha256(bytes){
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function gitBlobSha1(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes)
    .digest("hex");
}

function canonical(value){
  if(value===null)return "null";
  if(typeof value==="boolean")return value?"true":"false";
  if(typeof value==="string")return JSON.stringify(value);
  if(typeof value==="number"){
    if(!Number.isSafeInteger(value))throw new Error("noncanonical_number");
    return String(value);
  }
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  if(!value||typeof value!=="object")throw new Error("noncanonical_value");
  return "{"+Object.keys(value).sort()
    .map((key)=>JSON.stringify(key)+":"+canonical(value[key])).join(",")+"}";
}

function cleanGitEnv(){
  return {
    PATH:"/usr/bin:/bin",
    HOME:RUNTIME_HOME,
    LANG:"C",
    LC_ALL:"C",
    GIT_OPTIONAL_LOCKS:"0",
    GIT_NO_REPLACE_OBJECTS:"1",
    GIT_CONFIG_NOSYSTEM:"1",
    GIT_CONFIG_GLOBAL:"/dev/null",
    GIT_CONFIG_SYSTEM:"/dev/null",
  };
}

function cleanRootEnv(){
  return {PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"};
}

function safeReason(value){
  const text=String(value??"unknown")
    .replace(/[^A-Za-z0-9_.:-]+/gu,"_")
    .slice(0,240);
  return text||"unknown";
}

function run(command,args,options={}){
  const result=spawnSync(command,args,{
    cwd:options.cwd??ROOT,
    env:options.env??cleanRootEnv(),
    encoding:"utf8",
    input:options.input,
    stdio:["pipe","pipe","pipe"],
    timeout:options.timeout??60_000,
    maxBuffer:MAX_OUTPUT,
  });
  if(result.error)throw new Error("spawn_error:"+safeReason(result.error.message));
  return result;
}

function assertTrustedExecutable(file){
  const real=fs.realpathSync(file);
  const st=fs.lstatSync(real,{bigint:true});
  if(!st.isFile()||st.isSymbolicLink()||st.uid!==0n||
     (st.mode&0o022n)!==0n){
    throw new Error("trusted_executable_invalid:"+path.basename(file));
  }
  return real;
}

function git(args){
  const r=run(GIT,[
    "-c","core.fsmonitor=false",
    "-c","core.hooksPath=/dev/null",
    ...args,
  ],{env:cleanGitEnv(),timeout:15_000});
  if(r.status!==0)throw new Error("git_failed:"+args[0]);
  if(r.stderr!=="")throw new Error("git_unexpected_stderr:"+args[0]);
  return r.stdout;
}

function requireExactCheckout(expectedHead){
  if(!SHA40.test(expectedHead))throw new Error("expected_head_invalid");
  const head=git(["rev-parse","--verify","HEAD"]).trim();
  if(head!==expectedHead)throw new Error("expected_head_mismatch");
  if(git(["branch","--show-current"]).trim()!=="main"){
    throw new Error("branch_not_main");
  }
  if(git(["status","--porcelain=v1","--untracked-files=all"])!==""){
    throw new Error("worktree_not_clean");
  }
  return head;
}

export function parseQualificationStdout(stdout){
  if(typeof stdout!=="string"||stdout.length<1||
     Buffer.byteLength(stdout,"utf8")>MAX_OUTPUT){
    throw new Error("qualification_output_invalid");
  }
  const lines=stdout.split("\n").filter((line)=>line.length>0);
  const matches=lines.filter((line)=>line.startsWith("result_json="));
  if(matches.length!==1)throw new Error("qualification_result_json_cardinality");
  let value;
  try{value=JSON.parse(matches[0].slice("result_json=".length));}
  catch{throw new Error("qualification_result_json_invalid");}
  if(!value||typeof value!=="object"||Array.isArray(value)){
    throw new Error("qualification_result_object_invalid");
  }
  return value;
}

function runQualification(){
  const r=run(PYTHON,["-I","-B",QUALIFIER,"--run"],{
    env:cleanRootEnv(),
    timeout:60_000,
  });
  if(r.status!==0){
    throw new Error("credential_qualification_failed:"+String(r.status));
  }
  if(r.stderr!=="")throw new Error("credential_qualification_unexpected_stderr");
  return parseQualificationStdout(r.stdout);
}

function sealedSource(expectedHead){
  const r=run(GIT,[
    "-c","core.fsmonitor=false",
    "-c","core.hooksPath=/dev/null",
    "show",expectedHead+":"+SEALED_REL,
  ],{env:cleanGitEnv(),timeout:15_000});
  if(r.status!==0||r.stderr!=="")throw new Error("sealed_git_object_unavailable");
  const bytes=Buffer.from(r.stdout,"utf8");
  if(gitBlobSha1(bytes)!==SEALED_BLOB)throw new Error("sealed_git_blob_mismatch");
  return bytes;
}

function runSealedProbe(expectedHead){
  const source=sealedSource(expectedHead);
  try{
    const args=[
      "--no-new-privs",
      "--reuid="+String(RUNTIME_UID),
      "--regid="+String(RUNTIME_GID),
      "--clear-groups",
      NODE,
      "--input-type=module",
      "-",
      "--probe",
      "--confirm",
      SEALED_CONFIRM,
      "--expected-head",
      expectedHead,
    ];
    const r=run(SETPRIV,args,{
      env:cleanGitEnv(),
      input:source,
      timeout:45_000,
    });
    if(r.status!==0){
      let reason="sealed_probe_failed:"+String(r.status);
      try{
        const held=JSON.parse(String(r.stderr||""));
        if(held&&typeof held.reason==="string")reason=held.reason;
      }catch{}
      throw new Error(reason);
    }
    if(r.stderr!=="")throw new Error("sealed_probe_unexpected_stderr");
    let record;
    try{record=JSON.parse(r.stdout);}
    catch{throw new Error("sealed_probe_json_invalid");}
    if(!record||typeof record!=="object"||Array.isArray(record)){
      throw new Error("sealed_probe_record_invalid");
    }
    return record;
  }finally{
    source.fill(0);
  }
}

function stableQualification(before,after){
  return canonical(before)===canonical(after);
}

export function buildReceipt({
  expectedHead,
  qualification,
  sealedRecord,
  composed,
}){
  if(!composed?.ok)throw new Error("composer_not_green");
  const body={
    marker:MARKER,
    version:1,
    status:STATUS,
    source_head:expectedHead,
    sealed_evidence_id:sealedRecord.evidence_id,
    composed_evidence_id:composed.composite_evidence_id,
    credential_lock_id:qualification.credential_lock_id,
    credential_qualification_sha256:
      sha256(Buffer.from(canonical(qualification),"utf8")),
    runtime_uid:qualification.runtime_uid,
    manager_pid:qualification.manager_pid,
    manager_start_ticks:String(qualification.manager_start_ticks),
    main_pid:qualification.main_pid,
    service_start_ticks:String(qualification.service_start_ticks),
    signer_address:composed.signer_address,
    qualification_provenance_authenticated_by_runner:true,
    qualification_stable_before_after_sealed_probe:true,
    authenticated_private_manager_fields_crosschecked:true,
    sealed_public_signature_verified:true,
    credential_content_access_in_sealed_child:true,
    credential_content_access_in_runner_parent:false,
    private_key_material_in_sealed_child:true,
    private_key_output:false,
    nontransaction_signature_performed:true,
    transaction_constructed:false,
    transaction_submitted:false,
    transaction_broadcast:false,
    rpc_call:false,
    filesystem_write:false,
    host_mutation:false,
    service_mutation:false,
    systemd_mutation:false,
    payment_acceptance:false,
    public_presale_activation:false,
    wc_void_market_activation:false,
    funds_movement:false,
    production_host_evidence_authority:false,
    next_action:NEXT_ACTION,
  };
  return Object.freeze({
    ...body,
    receipt_id:
      "voide2livecomp1_"+sha256(Buffer.from(canonical(body),"utf8")),
  });
}

function plan(){
  console.log(MARKER);
  console.log("mode=plan");
  console.log("root_required_for_run=true");
  console.log("runtime_uid="+String(RUNTIME_UID));
  console.log("credential_v6_qualification_required=true");
  console.log("qualification_before_after_sealed_probe_required=true");
  console.log("sealed_git_object_probe_required=true");
  console.log("sealed_probe_runs_as_runtime_uid=true");
  console.log("credential_content_access=false");
  console.log("private_key_access=false");
  console.log("nontransaction_signature=false");
  console.log("transaction=false");
  console.log("rpc_call=false");
  console.log("filesystem_write=false");
  console.log("host_mutation=false");
  console.log("service_mutation=false");
  console.log("systemd_mutation=false");
  console.log("payment_acceptance=false");
  console.log("public_presale_activation=false");
  console.log("wc_void_market_activation=false");
  console.log("funds_movement=false");
  console.log("production_host_evidence_authority=false");
  console.log("next_action=SEPARATELY_AUTHORIZE_AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION");
}

function selfTest(){
  const synthetic={
    marker:"x",
    version:1,
    main_pid:4242,
    nested:{a:true,b:"z"},
  };
  const stdout="marker\nresult_json="+JSON.stringify(synthetic)+"\n";
  const parsed=parseQualificationStdout(stdout);
  if(canonical(parsed)!==canonical(synthetic)){
    throw new Error("qualification_parser_self_test_failed");
  }
  const composed={
    ok:true,
    composite_evidence_id:"voide2authv2_"+"a".repeat(64),
    signer_address:"0x"+"1".repeat(40),
  };
  const q={
    credential_lock_id:"lock",
    runtime_uid:1000,
    manager_pid:2693,
    manager_start_ticks:"1409",
    main_pid:4242,
    service_start_ticks:"998877",
  };
  const sealed={evidence_id:"voide2sealed1_"+"b".repeat(64)};
  const receipt=buildReceipt({
    expectedHead:"c".repeat(40),
    qualification:q,
    sealedRecord:sealed,
    composed,
  });
  if(!/^voide2livecomp1_[0-9a-f]{64}$/u.test(receipt.receipt_id)){
    throw new Error("receipt_id_self_test_failed");
  }
  if(receipt.production_host_evidence_authority!==false||
     receipt.transaction_constructed!==false||
     receipt.funds_movement!==false){
    throw new Error("authority_self_test_failed");
  }
  console.log(MARKER+"_SELF_TEST_GREEN");
  console.log("qualification_parser_closed=true");
  console.log("receipt_content_addressed=true");
  console.log("runner_parent_credential_content_access=false");
  console.log("transaction=false");
  console.log("funds_movement=false");
}

function live(expectedHead,confirm){
  if(confirm!==CONFIRM)throw new Error("explicit_live_confirmation_required");
  if(typeof process.geteuid!=="function"||process.geteuid()!==0){
    throw new Error("root_required_for_live_composition");
  }

  assertTrustedExecutable(GIT);
  assertTrustedExecutable(PYTHON);
  assertTrustedExecutable(NODE);
  assertTrustedExecutable(SETPRIV);
  requireExactCheckout(expectedHead);

  const qualifierBytes=fs.readFileSync(QUALIFIER);
  try{
    if(gitBlobSha1(qualifierBytes)!==QUALIFIER_BLOB){
      throw new Error("qualification_source_blob_mismatch");
    }
  }finally{
    qualifierBytes.fill(0);
  }

  const before=runQualification();
  const sealedRecord=runSealedProbe(expectedHead);
  const after=runQualification();

  if(!stableQualification(before,after)){
    throw new Error("qualification_changed_across_sealed_probe");
  }

  const composed=classifyEpoch2AuthenticatedCredentialPublicEvidenceV2(
    sealedRecord,before
  );
  if(!composed.ok)throw new Error("evidence_composition_hold:"+safeReason(composed.reason));
  if(composed.next_action!==COMPOSER_NEXT_ACTION){
    throw new Error("composer_next_action_mismatch");
  }

  const receipt=buildReceipt({
    expectedHead,
    qualification:before,
    sealedRecord,
    composed,
  });
  console.log(JSON.stringify(receipt,null,2));
}

function main(){
  const args=process.argv.slice(2);
  if(args.length===1&&args[0]==="--self-test"){
    selfTest();
    return;
  }
  if(args.length===1&&args[0]==="--plan"){
    plan();
    return;
  }
  if(args[0]==="--run"){
    const confirmAt=args.indexOf("--confirm");
    const headAt=args.indexOf("--expected-head");
    const confirm=confirmAt>=0?args[confirmAt+1]:"";
    const expectedHead=headAt>=0?args[headAt+1]:"";
    if(!expectedHead)throw new Error("expected_head_required");
    live(expectedHead,confirm);
    return;
  }
  throw new Error("usage: runner --self-test | --plan | --run --confirm <token> --expected-head <sha>");
}

try{
  main();
}catch(error){
  console.error(JSON.stringify({
    marker:MARKER+"_HOLD",
    status:"HOLD",
    reason:safeReason(error?.message||error),
    credential_content_access_state:"unknown_or_partial_if_live_started",
    private_key_output:false,
    transaction_constructed:false,
    transaction_submitted:false,
    transaction_broadcast:false,
    rpc_call:false,
    filesystem_write:false,
    host_mutation:false,
    service_mutation:false,
    systemd_mutation:false,
    payment_acceptance:false,
    public_presale_activation:false,
    wc_void_market_activation:false,
    funds_movement:false,
    production_host_evidence_authority:false,
  },null,2));
  process.exitCode=2;
}
