#!/usr/bin/env node
// Live dormant-candidate credential binding runner.
// Live authority requires this reviewed Git object on stdin.
// It executes the exact authenticated credential live-composition runner as a
// root child from its reviewed Git object; arbitrary receipt JSON is not accepted.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const MARKER =
  "VOID_BUY_VOID_EPOCH2_DORMANT_CANDIDATE_LIVE_BINDING_V1";
export const CONFIRM =
  "RUN_EPOCH2_DORMANT_CANDIDATE_LIVE_BINDING_V1";
export const STATUS =
  "EPOCH2_AUTHENTICATED_CREDENTIAL_BOUND_REMAINING_GATES_HOLD";
export const NEXT_ACTION =
  "PROVE_LAUNCH_OPERATOR_SIGNER_CONTROLS_EXACT_IMMUTABLE_EPOCH2_FULFILLER";

const ROOT="/home/zoso/dev/void-node";
const CHILD_REL=
  "ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v1.mjs";
const CHILD_BLOB="28d718eb4155e47dbe8d476a4cf45f2d3871e4db";
const CHILD_CONFIRM=
  "RUN_AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V1";
const CHILD_MARKER=
  "VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_LIVE_COMPOSITION_V1";
const CHILD_STATUS=
  "AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_GREEN";
const CHILD_NEXT_ACTION=
  "BIND_AUTHENTICATED_EPOCH2_CREDENTIAL_EVIDENCE_IN_DORMANT_CANDIDATE_SUCCESSOR";

const CANDIDATE_REL=
  "ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v1.json";
const CANDIDATE_BLOB="2c861c021192c034c98404989cd25b26788cd0f0";
const CANDIDATE_MARKER=
  "VOID_BUY_VOID_PAYMENT_KEYED_EPOCH2_DORMANT_CANDIDATE_V1";
const CANDIDATE_STATUS=
  "EPOCH2_SOURCE_CANDIDATE_SIGNER_CREDENTIAL_AND_ACTIVATION_HOLD";

const EXPECTED_FULFILLER=
  "0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a";
const EXPECTED_PRESALE=
  "0x530bc90ba74f2539a9e484ccb1be9291c3bc35ce";
const EXPECTED_SOURCE_BINDING=
  "5fde8cc7fcd0493619c105ac9f367063fbdacd74e8ae50df76454c6d298206f1";
const EXPECTED_CREDENTIAL_LOCK=
  "voidbuyumqcredelflock1_65a1839c14b692349dda8cccdbe8657a9485754c5d10ffa5b57421ce87e3753c";

const RUNTIME_UID=1000;
const RUNTIME_GID=1000;
const RUNTIME_HOME="/home/zoso";
const GIT="/usr/bin/git";
const NODE="/usr/bin/node";
const SETPRIV="/usr/bin/setpriv";
const MAX_OUTPUT=4*1024*1024;
const SHA40=/^[0-9a-f]{40}$/u;
const CHILD_RECEIPT=/^voide2livecomp1_[0-9a-f]{64}$/u;

function sha256(bytes){
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function gitBlob(bytes){
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

function safeReason(value){
  const text=String(value??"unknown")
    .replace(/[^A-Za-z0-9_.:-]+/gu,"_")
    .slice(0,240);
  return text||"unknown";
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

function run(command,args,options={}){
  const result=spawnSync(command,args,{
    cwd:options.cwd??ROOT,
    env:options.env??cleanRootEnv(),
    input:options.input,
    encoding:"utf8",
    stdio:["pipe","pipe","pipe"],
    timeout:options.timeout??90_000,
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
    timeout:options.timeout??30_000,
  });
}

function git(args){
  const r=runAsRuntimeUser(GIT,[
    "--no-replace-objects",
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
  if(git(["rev-parse","--verify","HEAD"]).trim()!==expectedHead){
    throw new Error("expected_head_mismatch");
  }
  if(git(["branch","--show-current"]).trim()!=="main"){
    throw new Error("branch_not_main");
  }
  if(git(["status","--porcelain=v1","--untracked-files=all"])!==""){
    throw new Error("worktree_not_clean");
  }
}

function gitObject(expectedHead,relative,expectedBlob){
  const bytes=Buffer.from(git(["cat-file","blob",expectedHead+":"+relative]),"utf8");
  if(gitBlob(bytes)!==expectedBlob){
    bytes.fill(0);
    throw new Error("git_object_blob_mismatch:"+relative);
  }
  return bytes;
}

function parseJson(text,reason){
  if(typeof text!=="string"||text.length<2||
     Buffer.byteLength(text,"utf8")>MAX_OUTPUT){
    throw new Error(reason);
  }
  let value;
  try{value=JSON.parse(text);}
  catch(parseError){
    if(parseError instanceof Error)void parseError.message;
    throw new Error(reason);
  }
  if(!value||typeof value!=="object"||Array.isArray(value)){
    throw new Error(reason);
  }
  return value;
}

function validateCandidate(candidate){
  if(candidate.marker!==CANDIDATE_MARKER||
     candidate.version!==1||
     candidate.status!==CANDIDATE_STATUS||
     candidate.canonical_chain_id!==2050||
     candidate.execution_epoch!==2||
     candidate.epoch2_presale_contract!==EXPECTED_PRESALE||
     candidate.epoch2_fulfiller_public_address!==EXPECTED_FULFILLER){
    throw new Error("dormant_candidate_header_invalid");
  }
  const config=candidate.candidate_configuration;
  if(!config||typeof config!=="object"||Array.isArray(config)||
     config.VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED!=="0"||
     config.VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED!=="0"||
     config.VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CONTRACT_ADDRESS!==
       EXPECTED_PRESALE||
     config.VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS!==
       EXPECTED_FULFILLER||
     config.VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_BINDING_ID!==
       EXPECTED_SOURCE_BINDING){
    throw new Error("dormant_candidate_configuration_invalid");
  }
  const state=candidate.signer_credential_state;
  if(!state||typeof state!=="object"||Array.isArray(state)||
     state.signer_offchain_control_proven!==false||
     state.systemd_credential_identity_proven!==false||
     state.epoch2_credential_binding_evidence_id!==null||
     state.legacy_wallet_credential_reuse_authorized!==false||
     state.credential_path_selected!==false||
     state.private_key_material_read!==false){
    throw new Error("dormant_candidate_pre_evidence_state_invalid");
  }
  const authority=candidate.authority;
  if(!authority||typeof authority!=="object"||Array.isArray(authority)||
     authority.candidate_only!==true){
    throw new Error("dormant_candidate_authority_invalid");
  }
  for(const [key,value] of Object.entries(authority)){
    if(key!=="candidate_only"&&value!==false){
      throw new Error("dormant_candidate_authority_overclaim:"+key);
    }
  }
}

function validateChildReceipt(receipt,expectedHead){
  const required={
    marker:CHILD_MARKER,
    version:1,
    status:CHILD_STATUS,
    source_head:expectedHead,
    credential_lock_id:EXPECTED_CREDENTIAL_LOCK,
    runtime_uid:RUNTIME_UID,
    signer_address:EXPECTED_FULFILLER,
    qualification_provenance_authenticated_by_runner:true,
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
    next_action:CHILD_NEXT_ACTION,
  };
  for(const [key,want] of Object.entries(required)){
    if(receipt[key]!==want)throw new Error("child_receipt_field_invalid:"+key);
  }
  if(!CHILD_RECEIPT.test(String(receipt.receipt_id||""))||
     !Number.isSafeInteger(receipt.manager_pid)||receipt.manager_pid<=1||
     !Number.isSafeInteger(receipt.main_pid)||receipt.main_pid<=1||
     typeof receipt.manager_start_ticks!=="string"||
     !/^[1-9][0-9]*$/u.test(receipt.manager_start_ticks)||
     typeof receipt.service_start_ticks!=="string"||
     !/^[1-9][0-9]*$/u.test(receipt.service_start_ticks)){
    throw new Error("child_receipt_identity_invalid");
  }
  const sealed=receipt.sealed_public_evidence;
  if(!sealed||typeof sealed!=="object"||Array.isArray(sealed)||
     sealed.source_head!==expectedHead||
     sealed.immutable_fulfiller!==EXPECTED_FULFILLER||
     sealed.credential_id!=="buy-void-epoch2-fulfiller-v1"||
     sealed.systemd?.main_pid!==receipt.main_pid||
     sealed.transaction_constructed!==false||
     sealed.rpc_call_performed!==false||
     sealed.transaction_broadcast_performed!==false||
     sealed.funds_movement!==false){
    throw new Error("child_sealed_public_evidence_invalid");
  }
}

function runChild(expectedHead){
  const source=gitObject(expectedHead,CHILD_REL,CHILD_BLOB);
  try{
    const r=run(NODE,[
      "--input-type=module",
      "-",
      "--run",
      "--confirm",
      CHILD_CONFIRM,
      "--expected-head",
      expectedHead,
    ],{
      env:cleanRootEnv(),
      input:source,
      timeout:120_000,
    });
    if(r.status!==0){
      let reason="child_live_composition_failed:"+String(r.status);
      try{
        const held=JSON.parse(String(r.stderr||""));
        if(held&&typeof held.reason==="string")reason=held.reason;
      }catch(parseError){
        if(parseError instanceof Error)void parseError.message;
      }
      throw new Error(reason);
    }
    if(r.stderr!=="")throw new Error("child_live_composition_unexpected_stderr");
    const receipt=parseJson(r.stdout,"child_live_composition_json_invalid");
    validateChildReceipt(receipt,expectedHead);
    return receipt;
  }finally{
    source.fill(0);
  }
}

function loadCandidate(expectedHead){
  const raw=gitObject(expectedHead,CANDIDATE_REL,CANDIDATE_BLOB);
  try{
    const candidate=parseJson(raw.toString("utf8"),"dormant_candidate_json_invalid");
    validateCandidate(candidate);
    return candidate;
  }finally{
    raw.fill(0);
  }
}

export function buildBindingReceipt(expectedHead,candidate,child){
  validateCandidate(candidate);
  validateChildReceipt(child,expectedHead);

  const remainingGates=[
    "prove_launch_operator_signer_controls_exact_immutable_epoch2_fulfiller",
    "qualify_live_zero_fee_or_nonzero_fee_envelope_and_exact_chain_receipt",
    "complete_current_chain_2050_one_payment_one_fulfillment_canary",
    "coupled_presale_and_wc_void_market_sovereign_activation",
  ];

  const body={
    marker:MARKER,
    version:1,
    status:STATUS,
    source_head:expectedHead,
    source_candidate_path:CANDIDATE_REL,
    source_candidate_git_blob:CANDIDATE_BLOB,
    source_candidate_marker:candidate.marker,
    authenticated_credential_live_receipt:child,
    authenticated_credential_live_receipt_id:child.receipt_id,
    authenticated_credential_live_receipt_sha256:
      sha256(Buffer.from(canonical(child),"utf8")),
    checkout_revalidated_after_child:true,
    canonical_chain_id:2050,
    execution_epoch:2,
    epoch2_presale_contract:EXPECTED_PRESALE,
    epoch2_fulfiller_public_address:EXPECTED_FULFILLER,
    signer_credential_state:{
      signer_offchain_control_proven:false,
      systemd_credential_identity_proven:true,
      active_signing_capability_proven:true,
      runtime_source_generation_bound:true,
      authenticated_private_manager_generation_bound:true,
      epoch2_authenticated_credential_receipt_id:child.receipt_id,
      legacy_wallet_credential_reuse_authorized:false,
      private_key_material_read_in_sealed_child:true,
      private_key_material_output:false,
      transaction_signing_proven:false,
    },
    explicit_remaining_gates:remainingGates,
    customer_safe_to_pay:false,
    authority:{
      candidate_only:true,
      operational_configuration_selected:false,
      credential_or_wallet_access:false,
      service_mutation:false,
      signer_access:false,
      transaction_signing:false,
      transaction_broadcast:false,
      public_presale_activation:false,
      wc_void_market_activation:false,
      funds_movement:false,
      automatic_retry:false,
    },
    production_host_evidence_authority:false,
    next_action:NEXT_ACTION,
  };
  return Object.freeze({
    ...body,
    binding_receipt_id:
      "voide2candbind1_"+sha256(Buffer.from(canonical(body),"utf8")),
  });
}

function plan(){
  console.log(MARKER);
  console.log("mode=plan");
  console.log("git_object_stdin_required_for_live=true");
  console.log("root_required_for_run=true");
  console.log("exact_child_live_composition_required=true");
  console.log("arbitrary_child_receipt_input_accepted=false");
  console.log("exact_dormant_candidate_git_object_required=true");
  console.log("closing_checkout_revalidation_required=true");
  console.log("credential_content_access=false");
  console.log("private_key_access=false");
  console.log("nontransaction_signature=false");
  console.log("transaction=false");
  console.log("filesystem_write=false");
  console.log("host_mutation=false");
  console.log("service_mutation=false");
  console.log("systemd_mutation=false");
  console.log("payment_acceptance=false");
  console.log("customer_safe_to_pay=false");
  console.log("public_presale_activation=false");
  console.log("wc_void_market_activation=false");
  console.log("funds_movement=false");
  console.log("production_host_evidence_authority=false");
  console.log("next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_CANDIDATE_LIVE_BINDING");
}

function selfTest(){
  const candidate={
    marker:CANDIDATE_MARKER,
    version:1,
    status:CANDIDATE_STATUS,
    canonical_chain_id:2050,
    execution_epoch:2,
    epoch2_presale_contract:EXPECTED_PRESALE,
    epoch2_fulfiller_public_address:EXPECTED_FULFILLER,
    candidate_configuration:{
      VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED:"0",
      VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED:"0",
      VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CONTRACT_ADDRESS:EXPECTED_PRESALE,
      VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS:EXPECTED_FULFILLER,
      VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_BINDING_ID:EXPECTED_SOURCE_BINDING,
    },
    signer_credential_state:{
      signer_offchain_control_proven:false,
      systemd_credential_identity_proven:false,
      epoch2_credential_binding_evidence_id:null,
      legacy_wallet_credential_reuse_authorized:false,
      credential_path_selected:false,
      private_key_material_read:false,
    },
    authority:{
      candidate_only:true,
      operational_configuration_selected:false,
      credential_or_wallet_access:false,
      service_mutation:false,
      signer_access:false,
      transaction_signing:false,
      transaction_broadcast:false,
      public_presale_activation:false,
      wc_void_market_activation:false,
      funds_movement:false,
      automatic_retry:false,
    },
  };
  const child={
    marker:CHILD_MARKER,
    version:1,
    status:CHILD_STATUS,
    source_head:"a".repeat(40),
    sealed_public_evidence:{
      source_head:"a".repeat(40),
      immutable_fulfiller:EXPECTED_FULFILLER,
      credential_id:"buy-void-epoch2-fulfiller-v1",
      systemd:{main_pid:4242},
      transaction_constructed:false,
      rpc_call_performed:false,
      transaction_broadcast_performed:false,
      funds_movement:false,
    },
    credential_lock_id:EXPECTED_CREDENTIAL_LOCK,
    runtime_uid:1000,
    manager_pid:2693,
    manager_start_ticks:"1409",
    main_pid:4242,
    service_start_ticks:"998877",
    signer_address:EXPECTED_FULFILLER,
    qualification_provenance_authenticated_by_runner:true,
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
    next_action:CHILD_NEXT_ACTION,
    receipt_id:"voide2livecomp1_"+"b".repeat(64),
  };
  const receipt=buildBindingReceipt("a".repeat(40),candidate,child);
  if(!/^voide2candbind1_[0-9a-f]{64}$/u.test(receipt.binding_receipt_id)||
     receipt.signer_credential_state.systemd_credential_identity_proven!==true||
     receipt.signer_credential_state.active_signing_capability_proven!==true||
     receipt.signer_credential_state.signer_offchain_control_proven!==false||
     receipt.authenticated_credential_live_receipt?.receipt_id!==child.receipt_id||
     receipt.checkout_revalidated_after_child!==true||
     receipt.customer_safe_to_pay!==false||
     receipt.authority.transaction_signing!==false||
     receipt.authority.public_presale_activation!==false||
     receipt.authority.funds_movement!==false){
    throw new Error("binding_receipt_self_test_failed");
  }
  const forged=structuredClone(child);
  forged.payment_acceptance=true;
  let forgedRejected=false;
  try{
    buildBindingReceipt("a".repeat(40),candidate,forged);
  }catch(error){
    forgedRejected=true;
    if(error instanceof Error)void error.message;
  }
  if(!forgedRejected){
    throw new Error("authority_overclaimed_child_receipt_accepted");
  }
  console.log(MARKER+"_SELF_TEST_GREEN");
  console.log("arbitrary_child_receipt_input_accepted=false");
  console.log("exact_child_live_composition_required=true");
  console.log("systemd_credential_identity_proven_on_bound_receipt=true");
  console.log("active_signing_capability_proven_on_bound_receipt=true");
  console.log("full_public_child_receipt_retained=true");
  console.log("closing_checkout_revalidation_before_receipt=true");
  console.log("launch_operator_signer_control_still_required=true");
  console.log("customer_safe_to_pay=false");
  console.log("transaction=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}

function live(expectedHead,confirm){
  if(confirm!==CONFIRM)throw new Error("explicit_live_confirmation_required");
  if(typeof process.geteuid!=="function"||process.geteuid()!==0){
    throw new Error("root_required_for_live_binding");
  }
  if(process.argv[1]!=="-")throw new Error("binder_git_object_stdin_required");

  assertTrustedExecutable(GIT);
  assertTrustedExecutable(NODE);
  assertTrustedExecutable(SETPRIV);
  requireExactCheckout(expectedHead);

  const candidate=loadCandidate(expectedHead);
  const child=runChild(expectedHead);
  requireExactCheckout(expectedHead);
  const receipt=buildBindingReceipt(expectedHead,candidate,child);
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
    "usage: binder --self-test | --plan | --run --confirm <token> --expected-head <sha>"
  );
}

function printHold(error){
  console.error(JSON.stringify({
    marker:MARKER+"_HOLD",
    status:"HOLD",
    reason:safeReason(error?.message||error),
    child_live_composition_state:"unknown_or_partial_if_live_started",
    credential_content_access_state:"unknown_or_partial_in_child_if_live_started",
    private_key_output:false,
    transaction_constructed:false,
    transaction_submitted:false,
    transaction_broadcast:false,
    filesystem_write:false,
    host_mutation:false,
    service_mutation:false,
    systemd_mutation:false,
    payment_acceptance:false,
    customer_safe_to_pay:false,
    public_presale_activation:false,
    wc_void_market_activation:false,
    funds_movement:false,
    production_host_evidence_authority:false,
  },null,2));
}

const directFileExecution=process.argv[1]&&process.argv[1]!=="-"&&
  path.resolve(process.argv[1])===fileURLToPath(import.meta.url);

if(process.argv[1]==="-"){
  try{main();}catch(error){printHold(error);process.exitCode=2;}
}else if(directFileExecution){
  printHold(new Error("binder_git_object_stdin_required"));
  process.exitCode=2;
}
