#!/usr/bin/env node
// Root live-composition runner V2. Live authority requires entry through the
// separately installed native preentry. Repository modules are not imported.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const MARKER =
  "VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_LIVE_COMPOSITION_V2";
export const CONFIRM =
  "RUN_AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V2";
export const STATUS =
  "AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V2_GREEN";
export const NEXT_ACTION =
  "BIND_PROTECTED_AUTHENTICATED_EPOCH2_CREDENTIAL_EVIDENCE_IN_DORMANT_CANDIDATE_SUCCESSOR";

const ROOT="/home/zoso/dev/void-node";
const QUALIFIER_REL=
  "ops/precision/void_buy_void_user_manager_credential_query_installed_qualification_v1.py";
const SEALED_REL=
  "scripts/void_buy_void_epoch2_credential_attestation_sealed_v2.mjs";
const QUALIFIER_BLOB="8dc5d53dfcc52c261a3da0ee692f3a4fcc0bfc4c";
const SEALED_BLOB="14cbe81e27d04fee77cbe75225ce308bf8561a7b";
const SEALED_CONFIRM=
  "probeBuyVoidEpoch2InstalledCredentialSigningCapabilitySealedV2";
const EXPECTED_CREDENTIAL_ID="buy-void-epoch2-fulfiller-v1";
const EXPECTED_CREDENTIAL_LOCK_ID=
  "voidbuyumqcredelflock1_65a1839c14b692349dda8cccdbe8657a9485754c5d10ffa5b57421ce87e3753c";
const EXPECTED_FULFILLER=
  "0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a";
const QUALIFIER_MARKER=
  "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_INSTALLED_QUALIFICATION_V1";
const QUALIFIER_NEXT_ACTION=
  "BIND_AUTHENTICATED_CREDENTIAL_METADATA_IN_EPOCH2_ATTESTATION_SUCCESSOR";
const SEALED_MARKER=
  "VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_SEALED_V2";
const SEALED_STATUS=
  "EPOCH2_INSTALLED_CREDENTIAL_SIGNING_CAPABILITY_GREEN";
const RUNTIME_UID=1000;
const RUNTIME_GID=1000;
const RUNTIME_HOME="/home/zoso";
const GIT="/usr/bin/git";
const PYTHON="/usr/bin/python3";
const NODE="/usr/bin/node";
const SETPRIV="/usr/bin/setpriv";
const FIXED_RUNNER=
  "/opt/void-buy-void-epoch2-live-composition-v2/void_buy_void_epoch2_authenticated_credential_live_composition_v2.mjs";
const PREENTRY_MARKER=
  "VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_V1";
const PREENTRY_ENV="VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY";
const PREENTRY_RUNNER_FD_ENV="VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_RUNNER_FD";
const MAX_OUTPUT=2*1024*1024;
const SHA40=/^[0-9a-f]{40}$/u;
const HEX64=/^[0-9a-f]{64}$/u;
const SEALED_ID=/^voide2sealed2_[0-9a-f]{64}$/u;

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

function sameFileIdentity(left,right){
  return left.dev===right.dev&&
    left.ino===right.ino&&
    left.uid===right.uid&&
    left.gid===right.gid&&
    left.mode===right.mode&&
    left.nlink===right.nlink&&
    left.size===right.size;
}

function requireNativePreentry(){
  if(process.argv[1]!==FIXED_RUNNER){
    throw new Error("native_preentry_fixed_runner_required");
  }
  if(process.env[PREENTRY_ENV]!==PREENTRY_MARKER){
    throw new Error("native_preentry_marker_required");
  }
  const fdRaw=String(process.env[PREENTRY_RUNNER_FD_ENV]??"");
  if(!/^[0-9]{1,3}$/u.test(fdRaw)){
    throw new Error("native_preentry_runner_fd_invalid");
  }
  const fd=Number(fdRaw);
  if(!Number.isSafeInteger(fd)||fd<3){
    throw new Error("native_preentry_runner_fd_invalid");
  }
  const retained=fs.fstatSync(fd,{bigint:true});
  const visible=fs.lstatSync(FIXED_RUNNER,{bigint:true});
  if(!retained.isFile()||visible.isSymbolicLink()||!visible.isFile()||
     retained.uid!==0n||(retained.mode&0o022n)!==0n||
     !sameFileIdentity(retained,visible)){
    throw new Error("native_preentry_runner_generation_invalid");
  }
  if(fs.realpathSync(process.execPath)!==fs.realpathSync(NODE)){
    throw new Error("native_preentry_node_executable_mismatch");
  }
  for(const name of [
    "NODE_OPTIONS","NODE_PATH","LD_PRELOAD","LD_LIBRARY_PATH","LD_AUDIT",
  ]){
    if(Object.hasOwn(process.env,name)){
      throw new Error("native_preentry_loader_environment_not_clean:"+name);
    }
  }
  return true;
}

function runAsRuntimeUser(command,args,options={}){
  return run(SETPRIV,[
    "--no-new-privs",
    "--reuid="+String(RUNTIME_UID),
    "--regid="+String(RUNTIME_GID),
    "--clear-groups",
    command,
    ...args,
  ],{
    cwd:options.cwd??ROOT,
    env:options.env??cleanGitEnv(),
    input:options.input,
    timeout:options.timeout??60_000,
  });
}

function git(args){
  const r=runAsRuntimeUser(GIT,[
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

function gitObject(expectedHead,relative,expectedBlob){
  const r=runAsRuntimeUser(GIT,[
    "-c","core.fsmonitor=false",
    "-c","core.hooksPath=/dev/null",
    "show",expectedHead+":"+relative,
  ],{env:cleanGitEnv(),timeout:15_000});
  if(r.status!==0||r.stderr!=="")throw new Error("git_object_unavailable:"+relative);
  const bytes=Buffer.from(r.stdout,"utf8");
  if(gitBlobSha1(bytes)!==expectedBlob){
    bytes.fill(0);
    throw new Error("git_object_blob_mismatch:"+relative);
  }
  return bytes;
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

function validateQualification(q){
  for(const [key,want] of Object.entries({
    marker:QUALIFIER_MARKER,
    version:1,
    read_only:true,
    root_execution_required:true,
    credential_lock_id:EXPECTED_CREDENTIAL_LOCK_ID,
    credential_installed_pair_verified:true,
    credential_installed_generation_stable:true,
    credential_query_preexec_path_verified:true,
    double_credential_query_stable:true,
    credential_metadata_same_generation_as_v6_security:true,
    v6_security_qualification_composed:true,
    credential_contents_read:false,
    load_credential_count:1,
    load_credential_id:EXPECTED_CREDENTIAL_ID,
    query_execution:true,
    host_mutation:false,
    filesystem_write:false,
    service_mutation:false,
    systemd_mutation:false,
    external_network_calls:false,
    private_key_access:false,
    wallet_or_signer_access:false,
    request_or_payment_contents_read:false,
    payment_acceptance:false,
    public_presale_activation:false,
    transaction:false,
    funds_movement:false,
    production_host_evidence_authority:false,
    next_action:QUALIFIER_NEXT_ACTION,
  })){
    if(q?.[key]!==want)throw new Error("qualification_field_invalid:"+key);
  }
  if(!Number.isSafeInteger(q.runtime_uid)||q.runtime_uid!==RUNTIME_UID||
     !Number.isSafeInteger(q.main_pid)||q.main_pid<=1||
     !Number.isSafeInteger(q.manager_pid)||q.manager_pid<=1){
    throw new Error("qualification_identity_invalid");
  }
  if(typeof q.credential_source!=="string"||
     !path.posix.isAbsolute(q.credential_source)||
     path.posix.normalize(q.credential_source)!==q.credential_source){
    throw new Error("qualification_credential_source_invalid");
  }
  if(typeof q.native_output_sha256_first!=="string"||
     q.native_output_sha256_first!==q.native_output_sha256_second||
     !/^sha256:[0-9a-f]{64}$/u.test(q.native_output_sha256_first)){
    throw new Error("qualification_native_transcript_invalid");
  }
  if(q.v6_capability_bounding_set!==q.v6_kernel_cap_bnd||
     !/^[0-9a-f]{16}$/u.test(String(q.v6_kernel_cap_bnd||""))){
    throw new Error("qualification_capability_binding_invalid");
  }
}

function pythonBootstrap(source){
  const absolute=path.join(ROOT,QUALIFIER_REL);
  const encoded=source.toString("base64");
  return [
    "import base64,sys",
    "source=base64.b64decode("+JSON.stringify(encoded)+")",
    "path="+JSON.stringify(absolute),
    "sys.argv=[path,'--run']",
    "scope={'__name__':'__main__','__file__':path,'__package__':''}",
    "exec(compile(source,path,'exec',dont_inherit=True),scope)",
    "",
  ].join("\n");
}

function runQualification(expectedHead){
  const source=gitObject(expectedHead,QUALIFIER_REL,QUALIFIER_BLOB);
  try{
    const bootstrap=pythonBootstrap(source);
    const r=run(PYTHON,["-I","-B","-"],{
      env:cleanRootEnv(),
      input:bootstrap,
      timeout:60_000,
    });
    if(r.status!==0)throw new Error("credential_qualification_failed:"+String(r.status));
    if(r.stderr!=="")throw new Error("credential_qualification_unexpected_stderr");
    const parsed=parseQualificationStdout(r.stdout);
    validateQualification(parsed);
    return parsed;
  }finally{
    source.fill(0);
  }
}

function validateSealedRecord(record,expectedHead){
  if(!record||typeof record!=="object"||Array.isArray(record)){
    throw new Error("sealed_record_invalid");
  }
  for(const [key,want] of Object.entries({
    marker:SEALED_MARKER,
    version:2,
    status:SEALED_STATUS,
    source_head:expectedHead,
    source_branch:"main",
    sealed_probe_git_blob:SEALED_BLOB,
    credential_id:EXPECTED_CREDENTIAL_ID,
    immutable_fulfiller:EXPECTED_FULFILLER,
    credential_content_read:true,
    immutable_fulfiller_identity_proven:true,
    active_signing_capability_proven:true,
    privileged_first_entry_authenticated:false,
    credential_generation_retained_through_signing:true,
    credential_generation_revalidated_after_final_observation:true,
    credential_generation_revalidated_immediately_before_close:true,
    root_owned_node_binary_verified:true,
    node_loader_environment_empty:true,
    native_loader_environment_empty:true,
    raw_private_key_output:false,
    private_key_string_materialization:false,
    raw_signed_transaction_output:false,
    rpc_call_performed:false,
    transaction_constructed:false,
    transaction_broadcast_performed:false,
    transaction_submission_performed:false,
    filesystem_write_performed:false,
    runtime_activation_authorized:false,
    public_payment_acceptance_authorized:false,
    presale_activation_authorized:false,
    funds_movement:false,
  })){
    if(record[key]!==want)throw new Error("sealed_field_invalid:"+key);
  }
  if(!SEALED_ID.test(String(record.evidence_id||""))||
     !SHA40.test(String(record.source_tree||""))||
     record.systemd?.service!=="void-node-live.service"||
     !Number.isSafeInteger(record.systemd?.main_pid)||
     record.systemd.main_pid<=1||
     !HEX64.test(String(record.systemd?.loadcredential_binding_sha256||""))||
     !HEX64.test(String(record.systemd?.main_pid_cgroup_sha256||""))){
    throw new Error("sealed_binding_invalid");
  }
  if(record.systemd.process_source_commit!==expectedHead||
     record.systemd.process_source_tree!==record.source_tree||
     record.systemd.process_source_branch!=="main"){
    throw new Error("sealed_process_source_invalid");
  }
}

function runSealedProbe(expectedHead){
  const source=gitObject(expectedHead,SEALED_REL,SEALED_BLOB);
  try{
    const r=runAsRuntimeUser(NODE,[
      "--input-type=module",
      "-",
      "--probe",
      "--confirm",
      SEALED_CONFIRM,
      "--expected-head",
      expectedHead,
    ],{
      env:cleanGitEnv(),
      input:source,
      timeout:45_000,
    });
    if(r.status!==0){
      let reason="sealed_probe_failed:"+String(r.status);
      try{
        const held=JSON.parse(String(r.stderr||""));
        if(held&&typeof held.reason==="string")reason=held.reason;
      }catch(parseError){
        if(parseError instanceof Error)void parseError.message;
      }
      throw new Error(reason);
    }
    if(r.stderr!=="")throw new Error("sealed_probe_unexpected_stderr");
    let record;
    try{record=JSON.parse(r.stdout);}
    catch{throw new Error("sealed_probe_json_invalid");}
    validateSealedRecord(record,expectedHead);
    return record;
  }finally{
    source.fill(0);
  }
}

function crossCheck(record,q){
  if(record.systemd.main_pid!==q.main_pid){
    throw new Error("main_pid_crosscheck_failed");
  }
  const binding=q.load_credential_id+":"+q.credential_source;
  if(sha256(Buffer.from(binding,"utf8"))!==
     record.systemd.loadcredential_binding_sha256){
    throw new Error("loadcredential_binding_crosscheck_failed");
  }
  const cgroup=
    "0::/user.slice/user-"+String(q.runtime_uid)+
    ".slice/user@"+String(q.runtime_uid)+
    ".service/app.slice/void-node-live.service\n";
  if(sha256(Buffer.from(cgroup,"utf8"))!==
     record.systemd.main_pid_cgroup_sha256){
    throw new Error("service_cgroup_hash_crosscheck_failed");
  }
}

export function buildReceipt({
  expectedHead,
  qualification,
  sealedRecord,
}){
  const body={
    marker:MARKER,
    version:2,
    status:STATUS,
    source_head:expectedHead,
    sealed_public_evidence:sealedRecord,
    credential_lock_id:qualification.credential_lock_id,
    credential_qualification_sha256:
      sha256(Buffer.from(canonical(qualification),"utf8")),
    runtime_uid:qualification.runtime_uid,
    manager_pid:qualification.manager_pid,
    manager_start_ticks:String(qualification.manager_start_ticks),
    main_pid:qualification.main_pid,
    service_start_ticks:String(qualification.service_start_ticks),
    signer_address:sealedRecord.immutable_fulfiller,
    qualification_provenance_authenticated_by_runner:true,
    privileged_first_entry_authenticated:true,
    native_preentry_policy_bound:true,
    root_node_descriptor_execution_bound:true,
    runner_retained_descriptor_bound:true,
    stdin_javascript_source_forbidden:true,
    qualification_stable_before_after_sealed_probe:true,
    checkout_revalidated_after_sensitive_sequence:true,
    main_pid_crosscheck:true,
    loadcredential_binding_crosscheck:true,
    service_cgroup_hash_crosscheck:true,
    public_user_bus_sufficient_authority:false,
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
      "voide2livecomp2_"+sha256(Buffer.from(canonical(body),"utf8")),
  });
}

function plan(){
  console.log(MARKER);
  console.log("mode=plan");
  console.log("native_preentry_required_for_live=true");
  console.log("root_owned_fixed_runner_required=true");
  console.log("retained_runner_descriptor_required=true");
  console.log("root_node_descriptor_execution_required=true");
  console.log("stdin_javascript_source_forbidden=true");
  console.log("root_required_for_run=true");
  console.log("runtime_uid="+String(RUNTIME_UID));
  console.log("credential_v6_qualification_required=true");
  console.log("qualification_before_after_sealed_probe_required=true");
  console.log("checkout_revalidation_after_sensitive_sequence_required=true");
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
  const q={
    credential_lock_id:"lock",
    runtime_uid:1000,
    manager_pid:2693,
    manager_start_ticks:"1409",
    main_pid:4242,
    service_start_ticks:"998877",
  };
  const sealed={
    evidence_id:"voide2sealed1_"+"b".repeat(64),
    immutable_fulfiller:EXPECTED_FULFILLER,
  };
  const receipt=buildReceipt({
    expectedHead:"c".repeat(40),
    qualification:q,
    sealedRecord:sealed,
  });
  if(!/^voide2livecomp2_[0-9a-f]{64}$/u.test(receipt.receipt_id)){
    throw new Error("receipt_id_self_test_failed");
  }
  if(receipt.production_host_evidence_authority!==false||
     receipt.transaction_constructed!==false||
     receipt.funds_movement!==false||
     receipt.credential_content_access_in_runner_parent!==false||
     receipt.privileged_first_entry_authenticated!==true||
     receipt.stdin_javascript_source_forbidden!==true){
    throw new Error("authority_self_test_failed");
  }

  let checkoutCount=0;
  const stableSequence=runSensitiveSequence({
    expectedHead:"d".repeat(40),
    checkoutFn:()=>{checkoutCount+=1; return "d".repeat(40);},
    qualificationFn:()=>({...q}),
    sealedFn:()=>({...sealed}),
    crossFn:()=>{},
  });
  if(checkoutCount!==2||
     stableSequence.checkout_revalidated_after_sensitive_sequence!==true){
    throw new Error("final_checkout_revalidation_self_test_failed");
  }

  let driftChecks=0;
  try{
    runSensitiveSequence({
      expectedHead:"e".repeat(40),
      checkoutFn:()=>{
        driftChecks+=1;
        if(driftChecks===2)throw new Error("late_source_drift");
        return "e".repeat(40);
      },
      qualificationFn:()=>({...q}),
      sealedFn:()=>({...sealed}),
      crossFn:()=>{},
    });
  }catch(error){
    if(error?.message!=="late_source_drift")throw error;
  }
  if(driftChecks!==2){
    throw new Error("late_source_drift_not_detected");
  }
  console.log(MARKER+"_SELF_TEST_GREEN");
  console.log("native_preentry_required_for_live=true");
  console.log("qualification_parser_closed=true");
  console.log("receipt_content_addressed=true");
  console.log("final_checkout_revalidation_required=true");
  console.log("late_source_drift_blocks_receipt=true");
  console.log("runner_parent_credential_content_access=false");
  console.log("sealed_child_credential_content_access=true");
  console.log("nontransaction_signature_only=true");
  console.log("transaction=false");
  console.log("funds_movement=false");
}

function runSensitiveSequence({
  expectedHead,
  checkoutFn=requireExactCheckout,
  qualificationFn=runQualification,
  sealedFn=runSealedProbe,
  crossFn=crossCheck,
}){
  checkoutFn(expectedHead);

  const before=qualificationFn(expectedHead);
  const sealedRecord=sealedFn(expectedHead);
  const after=qualificationFn(expectedHead);

  if(canonical(before)!==canonical(after)){
    throw new Error("qualification_changed_across_sealed_probe");
  }
  crossFn(sealedRecord,before);

  // Close the source-generation window after all sensitive observations and
  // before constructing or emitting a receipt.
  checkoutFn(expectedHead);

  return buildReceipt({
    expectedHead,
    qualification:before,
    sealedRecord,
  });
}

function live(expectedHead,confirm){
  if(confirm!==CONFIRM)throw new Error("explicit_live_confirmation_required");
  if(typeof process.geteuid!=="function"||process.geteuid()!==0){
    throw new Error("root_required_for_live_composition");
  }
  requireNativePreentry();

  assertTrustedExecutable(GIT);
  assertTrustedExecutable(PYTHON);
  assertTrustedExecutable(NODE);
  assertTrustedExecutable(SETPRIV);

  const receipt=runSensitiveSequence({expectedHead});
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
  throw new Error(
    "usage: runner --self-test | --plan | --run --confirm <token> --expected-head <sha>"
  );
}

function printHold(error){
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
    privileged_first_entry_authenticated:false,
  },null,2));
}

const directFileExecution=process.argv[1]&&
  path.resolve(process.argv[1])===fileURLToPath(import.meta.url);

if(directFileExecution){
  try{main();}catch(error){printHold(error);process.exitCode=2;}
}
