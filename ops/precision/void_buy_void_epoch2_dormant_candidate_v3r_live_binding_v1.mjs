#!/usr/bin/env node
// Current-generation dormant-candidate credential binding.
// Live authority requires this reviewed Git object on stdin.
// Caller-supplied live receipts are never accepted.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const MARKER =
  "VOID_BUY_VOID_EPOCH2_DORMANT_CANDIDATE_V3R_LIVE_BINDING_V1";
export const CONFIRM =
  "RUN_EPOCH2_DORMANT_CANDIDATE_V3R_LIVE_BINDING_V1";
export const STATUS =
  "EPOCH2_SIGNER_CONTROL_AND_AUTHENTICATED_CREDENTIAL_PROVEN_REMAINING_GATES_HOLD";
export const NEXT_ACTION =
  "QUALIFY_LIVE_ZERO_FEE_ENVELOPE_AND_EXACT_CHAIN_RECEIPT_OR_PROVE_PER_PAYMENT_NATIVE_GAS_FUNDING";

const ROOT="/home/zoso/dev/void-node";
const QUALIFIER_REL=
  "ops/precision/void_buy_void_epoch2_live_composition_native_installed_qualification_v4.py";
const QUALIFIER_BLOB="767e088d1383a8cecf4d5daa7bf6779f368db56e";
const CANDIDATE_REL=
  "ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v3.json";
const CANDIDATE_BLOB="04061934a537a1d91213cdd1f9110b46faca4cc7";

const FIXED_NATIVE=
  "/opt/void-buy-void-epoch2-live-composition-v3/"+
  "void_buy_void_epoch2_live_composition_native_preentry_v3";
const NATIVE_CONFIRM=
  "RUN_AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V3";

const QUALIFIER_MARKER=
  "VOID_BUY_VOID_EPOCH2_NATIVE_INSTALLED_QUALIFICATION_V4";
const QUALIFIER_NEXT_ACTION=
  "SEPARATELY_AUTHORIZE_EPOCH2_V6R2_NATIVE_LIVE_COMPOSITION_V3";
const V6R2_LOCK=
  "voidbuye2nativecandlock6r2_"+
  "ab95f15c8f2731adf6bfd97dfd5467495c90bdb5ee267948efc6a522be74b417";
const V6R2_CANDIDATE=
  "voidbuye2nativecand6r2_"+
  "5d643422fb1c53686edd9386d6a65f000d9f399538bf94cca98b232fdfb15e8d";
const V6R2_NATIVE_SHA=
  "85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8";
const V6R2_RUNNER_SHA=
  "7d67e3490b7066c089418eb1da9412570a39db2b422cdc1c62afb2482bf2bd94";

const CHILD_MARKER=
  "VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_LIVE_COMPOSITION_V3";
const CHILD_STATUS=
  "AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V3_GREEN";
const CHILD_NEXT_ACTION=
  "BIND_V3R_AUTHENTICATED_EPOCH2_CREDENTIAL_EVIDENCE_IN_DORMANT_CANDIDATE_SUCCESSOR";
const CHILD_RECEIPT=/^voide2livecomp3_[0-9a-f]{64}$/u;
const SEALED_MARKER=
  "VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_SEALED_V2";
const SEALED_ID=/^voide2sealed2_[0-9a-f]{64}$/u;

const CANDIDATE_MARKER=
  "VOID_BUY_VOID_PAYMENT_KEYED_EPOCH2_DORMANT_CANDIDATE_V3";
const CANDIDATE_STATUS=
  "EPOCH2_SOURCE_CANDIDATE_SIGNER_CONTROL_PROVEN_CREDENTIAL_AND_ACTIVATION_HOLD";
const EXPECTED_FULFILLER=
  "0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a";
const EXPECTED_PRESALE=
  "0x530bc90ba74f2539a9e484ccb1be9291c3bc35ce";
const EXPECTED_CREDENTIAL_ID="buy-void-epoch2-fulfiller-v1";
const EXPECTED_CREDENTIAL_LOCK=
  "voidbuyumqcredelflock3r_"+
  "8b064214e22ce54ac193b426f38b9d6a7ea4cee07b38b68c8d1eeb6c51de6f34";
const EXPECTED_SOURCE_BINDING=
  "5fde8cc7fcd0493619c105ac9f367063fbdacd74e8ae50df76454c6d298206f1";

const RUNTIME_UID=1000;
const RUNTIME_HOME="/home/zoso";
const GIT="/usr/bin/git";
const PYTHON="/usr/bin/python3";
const SETPRIV="/usr/bin/setpriv";
const MAX_OUTPUT=8*1024*1024;
const SHA40=/^[0-9a-f]{40}$/u;
const HEX64=/^[0-9a-f]{64}$/u;

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
    .replace(/[^A-Za-z0-9_.:-]+/gu,"_").slice(0,240);
  return text||"unknown";
}
function cleanGitEnv(){
  return {
    PATH:"/usr/bin:/bin",HOME:RUNTIME_HOME,LANG:"C",LC_ALL:"C",
    GIT_OPTIONAL_LOCKS:"0",GIT_NO_REPLACE_OBJECTS:"1",
    GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",
    GIT_CONFIG_SYSTEM:"/dev/null",
  };
}
function cleanRootEnv(){
  return {PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C",TZ:"UTC"};
}
function run(command,args,options={}){
  const r=spawnSync(command,args,{
    cwd:options.cwd??ROOT,
    env:options.env??cleanRootEnv(),
    input:options.input,
    encoding:"utf8",
    stdio:[options.stdinIgnore===true?"ignore":"pipe","pipe","pipe"],
    timeout:options.timeout??120_000,
    maxBuffer:MAX_OUTPUT,
  });
  if(r.error)throw new Error("spawn_error:"+safeReason(r.error.message));
  return r;
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
    "--regid="+String(RUNTIME_UID),
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
  if(r.status!==0)throw new Error("git_failed:"+String(args[0]));
  if(r.stderr!=="")throw new Error("git_unexpected_stderr:"+String(args[0]));
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
  const raw=Buffer.from(
    git(["cat-file","blob",expectedHead+":"+relative]),
    "utf8"
  );
  if(gitBlob(raw)!==expectedBlob){
    raw.fill(0);
    throw new Error("git_object_blob_mismatch:"+relative);
  }
  return raw;
}
function parseResultJson(stdout,reason){
  if(typeof stdout!=="string"||stdout.length<1||
     Buffer.byteLength(stdout,"utf8")>MAX_OUTPUT){
    throw new Error(reason);
  }
  const lines=stdout.split("\n").filter(Boolean);
  const rows=lines.filter((line)=>line.startsWith("result_json="));
  if(rows.length!==1)throw new Error(reason+"_cardinality");
  let value;
  try{value=JSON.parse(rows[0].slice("result_json=".length));}
  catch{throw new Error(reason+"_json");}
  if(!value||typeof value!=="object"||Array.isArray(value)){
    throw new Error(reason+"_shape");
  }
  return value;
}
function pythonBootstrap(source){
  const absolute=path.join(ROOT,QUALIFIER_REL);
  const encoded=source.toString("base64");
  return [
    "import base64,sys",
    "source=base64.b64decode("+JSON.stringify(encoded)+")",
    "path="+JSON.stringify(absolute),
    "sys.argv=[path,'--run','--expected-head',"+JSON.stringify(globalThis.__voidExpectedHead||"")+"]",
    "scope={'__name__':'__main__','__file__':path,'__package__':''}",
    "exec(compile(source,path,'exec',dont_inherit=True),scope)",
    "",
  ].join("\n");
}
function validateQualification(q,expectedHead){
  const required={
    marker:QUALIFIER_MARKER,
    version:4,
    read_only:true,
    root_execution_required:true,
    accepted_lock_id:V6R2_LOCK,
    candidate_id:V6R2_CANDIDATE,
    expected_head:expectedHead,
    protected_upgrade_verified:true,
    installed_generation_stable:true,
    predecessor_generation_retained:true,
    predecessor_generation_stable:true,
    node_generation_bound:true,
    checkout_generation_bound:true,
    git_generation_bound:true,
    setpriv_generation_bound:true,
    native_self_test_execution:true,
    native_self_test_descriptor_bound:true,
    native_self_test_stable:true,
    native_sha256:V6R2_NATIVE_SHA,
    native_bytes:726976,
    runner_sha256:V6R2_RUNNER_SHA,
    runner_bytes:45147,
    predecessor_native_sha256:
      "09f2afc921d9d7a5282372151005eab4a3d5bcc520b8359588eb0038351702c4",
    predecessor_native_bytes:722880,
    predecessor_runner_sha256:
      "f6a75184dcc63989328c351fc93e140e6dac103f682f5c58c9f76bccd359a889",
    predecessor_runner_bytes:40616,
    predecessor_policy_sha256:
      "d410bd2ec83daca5f7ba6e45e03afda0606b2bf6ea62cbabb9a700caa141adcc",
    predecessor_policy_bytes:305,
    runner_execution:false,
    live_composition_execution:false,
    credential_access:false,
    private_key_access:false,
    signing:false,
    transaction:false,
    payment_acceptance:false,
    public_presale_activation:false,
    wc_void_market_activation:false,
    treasury_liquidity_action:false,
    funds_movement:false,
    production_host_evidence_authority:false,
    next_action:QUALIFIER_NEXT_ACTION,
  };
  for(const [key,want] of Object.entries(required)){
    if(q?.[key]!==want)throw new Error("qualification_field_invalid:"+key);
  }
  if(!/^sha256:[0-9a-f]{64}$/u.test(String(q.native_self_test_sha256||""))||
     !HEX64.test(String(q.policy_sha256||""))||
     !HEX64.test(String(q.node_sha256||""))||
     !Number.isSafeInteger(q.node_bytes)||q.node_bytes<1){
    throw new Error("qualification_identity_invalid");
  }
}
function runQualification(expectedHead){
  const source=gitObject(expectedHead,QUALIFIER_REL,QUALIFIER_BLOB);
  try{
    const absolute=path.join(ROOT,QUALIFIER_REL);
    const encoded=source.toString("base64");
    const bootstrap=[
      "import base64,sys",
      "source=base64.b64decode("+JSON.stringify(encoded)+")",
      "path="+JSON.stringify(absolute),
      "sys.argv=[path,'--run','--expected-head',"+JSON.stringify(expectedHead)+"]",
      "scope={'__name__':'__main__','__file__':path,'__package__':''}",
      "exec(compile(source,path,'exec',dont_inherit=True),scope)",
      "",
    ].join("\n");
    const r=run(PYTHON,["-I","-B","-"],{
      env:cleanRootEnv(),input:bootstrap,timeout:60_000
    });
    if(r.status!==0)throw new Error("installed_qualification_failed:"+String(r.status));
    if(r.stderr!=="")throw new Error("installed_qualification_unexpected_stderr");
    const q=parseResultJson(r.stdout,"installed_qualification_result");
    validateQualification(q,expectedHead);
    return q;
  }finally{source.fill(0);}
}
function validateChildReceipt(receipt,expectedHead){
  const required={
    marker:CHILD_MARKER,
    version:3,
    status:CHILD_STATUS,
    source_head:expectedHead,
    credential_lock_id:EXPECTED_CREDENTIAL_LOCK,
    runtime_uid:RUNTIME_UID,
    signer_address:EXPECTED_FULFILLER,
    qualification_provenance_authenticated_by_runner:true,
    privileged_first_entry_authenticated:true,
    native_preentry_policy_bound:true,
    root_node_descriptor_execution_bound:true,
    runner_retained_descriptor_bound:true,
    native_parent_retained_for_child_lifetime:true,
    native_parent_process_generation_bound:true,
    native_parent_installed_generation_bound:true,
    native_parent_revalidated_after_sensitive_sequence:true,
    stdin_javascript_source_forbidden:true,
    qualification_stable_before_after_sealed_probe:true,
    checkout_revalidated_after_sensitive_sequence:true,
    complete_dropin_set_bound_across_signing_window:true,
    complete_credential_set_bound_across_signing_window:true,
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
    if(receipt?.[key]!==want)throw new Error("child_receipt_field_invalid:"+key);
  }
  if(!CHILD_RECEIPT.test(String(receipt.receipt_id||""))||
     !Number.isSafeInteger(receipt.manager_pid)||receipt.manager_pid<=1||
     !Number.isSafeInteger(receipt.main_pid)||receipt.main_pid<=1||
     typeof receipt.manager_start_ticks!=="string"||
     !/^[1-9][0-9]*$/u.test(receipt.manager_start_ticks)||
     typeof receipt.service_start_ticks!=="string"||
     !/^[1-9][0-9]*$/u.test(receipt.service_start_ticks)||
     !HEX64.test(String(receipt.credential_complete_dropin_set_sha256||""))||
     !HEX64.test(String(receipt.credential_complete_credential_set_sha256||""))||
     receipt.credential_epoch2_target_match_count!==1){
    throw new Error("child_receipt_identity_invalid");
  }
  const sealed=receipt.sealed_public_evidence;
  if(!sealed||typeof sealed!=="object"||Array.isArray(sealed)||
     sealed.marker!==SEALED_MARKER||sealed.version!==2||
     !SEALED_ID.test(String(sealed.evidence_id||""))||
     sealed.source_head!==expectedHead||
     sealed.immutable_fulfiller!==EXPECTED_FULFILLER||
     sealed.credential_id!==EXPECTED_CREDENTIAL_ID||
     sealed.systemd?.main_pid!==receipt.main_pid||
     sealed.transaction_constructed!==false||
     sealed.rpc_call_performed!==false||
     sealed.transaction_broadcast_performed!==false||
     sealed.funds_movement!==false){
    throw new Error("child_sealed_evidence_invalid");
  }
  const copy={...receipt};
  delete copy.receipt_id;
  const expected="voide2livecomp3_"+
    sha256(Buffer.from(canonical(copy),"utf8"));
  if(receipt.receipt_id!==expected){
    throw new Error("child_receipt_id_mismatch");
  }
}
function runNativeLive(expectedHead){
  const r=run(FIXED_NATIVE,[
    "--run","--confirm",NATIVE_CONFIRM,"--expected-head",expectedHead,
  ],{
    env:cleanRootEnv(),
    stdinIgnore:true,
    timeout:120_000,
  });
  if(r.status!==0){
    throw new Error("native_live_composition_failed:"+String(r.status));
  }
  if(r.stderr!=="")throw new Error("native_live_composition_unexpected_stderr");
  let receipt;
  try{receipt=JSON.parse(r.stdout);}
  catch{throw new Error("native_live_composition_json_invalid");}
  validateChildReceipt(receipt,expectedHead);
  return receipt;
}
function loadCandidate(expectedHead){
  const raw=gitObject(expectedHead,CANDIDATE_REL,CANDIDATE_BLOB);
  try{
    let candidate;
    try{candidate=JSON.parse(raw.toString("utf8"));}
    catch{throw new Error("dormant_candidate_json_invalid");}
    validateCandidate(candidate);
    return candidate;
  }finally{raw.fill(0);}
}
function validateCandidate(c){
  if(c?.marker!==CANDIDATE_MARKER||c.version!==3||
     c.status!==CANDIDATE_STATUS||c.canonical_chain_id!==2050||
     c.execution_epoch!==2||c.epoch2_presale_contract!==EXPECTED_PRESALE||
     c.epoch2_fulfiller_public_address!==EXPECTED_FULFILLER){
    throw new Error("dormant_candidate_header_invalid");
  }
  const cfg=c.candidate_configuration;
  if(!cfg||cfg.VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED!=="0"||
     cfg.VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED!=="0"||
     cfg.VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CONTRACT_ADDRESS!==EXPECTED_PRESALE||
     cfg.VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS!==EXPECTED_FULFILLER||
     cfg.VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_BINDING_ID!==EXPECTED_SOURCE_BINDING){
    throw new Error("dormant_candidate_configuration_invalid");
  }
  const s=c.signer_credential_state;
  if(!s||s.signer_offchain_control_proven!==true||
     !HEX64.test(String(s.signer_control_evidence_id_sha256||""))||
     !HEX64.test(String(s.signer_control_message_sha256||""))||
     !SHA40.test(String(s.signer_control_source_head||""))||
     !SHA40.test(String(s.signer_control_source_tree||""))||
     s.systemd_credential_identity_proven!==false||
     s.epoch2_credential_binding_evidence_id!==null||
     s.legacy_wallet_credential_reuse_authorized!==false||
     s.credential_path_selected!==false||
     s.private_key_material_read!==false){
    throw new Error("dormant_candidate_signer_state_invalid");
  }
  const expectedGates=[
    "independently_attest_systemd_credential_identity_and_active_signing_capability",
    "bind_accepted_epoch2_signer_evidence_to_current_runtime_source_generation",
    "qualify_live_zero_fee_envelope_and_exact_chain_receipt_or_prove_per_payment_native_gas_funding",
    "complete_current_chain_2050_one_payment_one_fulfillment_canary",
    "coupled_presale_and_wc_void_market_sovereign_activation",
  ];
  if(canonical(c.explicit_remaining_gates)!==canonical(expectedGates)){
    throw new Error("dormant_candidate_remaining_gates_invalid");
  }
  const authority=c.authority;
  if(!authority||authority.candidate_only!==true){
    throw new Error("dormant_candidate_authority_invalid");
  }
  for(const [key,value] of Object.entries(authority)){
    if(key!=="candidate_only"&&value!==false){
      throw new Error("dormant_candidate_authority_overclaim:"+key);
    }
  }
}
function buildBindingReceipt(expectedHead,candidate,qualification,child){
  validateCandidate(candidate);
  validateQualification(qualification,expectedHead);
  validateChildReceipt(child,expectedHead);
  const remainingGates=[
    "qualify_live_zero_fee_envelope_and_exact_chain_receipt_or_prove_per_payment_native_gas_funding",
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
    signer_control_evidence_id_sha256:
      candidate.signer_credential_state.signer_control_evidence_id_sha256,
    signer_control_message_sha256:
      candidate.signer_credential_state.signer_control_message_sha256,
    signer_control_source_head:
      candidate.signer_credential_state.signer_control_source_head,
    installed_qualification_sha256:
      sha256(Buffer.from(canonical(qualification),"utf8")),
    authenticated_credential_live_receipt:child,
    authenticated_credential_live_receipt_id:child.receipt_id,
    authenticated_credential_live_receipt_sha256:
      sha256(Buffer.from(canonical(child),"utf8")),
    canonical_chain_id:2050,
    execution_epoch:2,
    epoch2_presale_contract:EXPECTED_PRESALE,
    epoch2_fulfiller_public_address:EXPECTED_FULFILLER,
    signer_credential_state:{
      signer_offchain_control_proven:true,
      systemd_credential_identity_proven:true,
      active_signing_capability_proven:true,
      runtime_source_generation_bound:true,
      authenticated_private_manager_generation_bound:true,
      protected_v6r2_generation_verified:true,
      retained_v4_predecessor_verified:true,
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
      "voide2candbind3r1_"+sha256(Buffer.from(canonical(body),"utf8")),
  });
}
function plan(){
  console.log(MARKER);
  console.log("mode=plan");
  console.log("git_object_stdin_required_for_live=true");
  console.log("root_required_for_run=true");
  console.log("exact_dormant_candidate_v3_git_object_required=true");
  console.log("v6r2_installed_qualification_before_after_required=true");
  console.log("fixed_native_v3_live_composition_required=true");
  console.log("arbitrary_live_receipt_input_accepted=false");
  console.log("signer_control_predecessor_evidence_required=true");
  console.log("credential_content_access=false");
  console.log("private_key_access=false");
  console.log("signing=false");
  console.log("transaction=false");
  console.log("payment_acceptance=false");
  console.log("customer_safe_to_pay=false");
  console.log("public_presale_activation=false");
  console.log("wc_void_market_activation=false");
  console.log("funds_movement=false");
  console.log("production_host_evidence_authority=false");
  console.log("next_action=SEPARATELY_AUTHORIZE_EPOCH2_V3R_DORMANT_CANDIDATE_LIVE_BINDING");
}
function selfTest(){
  const head="a".repeat(40);
  const q={
    marker:QUALIFIER_MARKER,version:4,read_only:true,
    root_execution_required:true,accepted_lock_id:V6R2_LOCK,
    candidate_id:V6R2_CANDIDATE,expected_head:head,
    protected_upgrade_verified:true,installed_generation_stable:true,
    predecessor_generation_retained:true,predecessor_generation_stable:true,
    node_generation_bound:true,checkout_generation_bound:true,
    git_generation_bound:true,setpriv_generation_bound:true,
    native_self_test_execution:true,native_self_test_descriptor_bound:true,
    native_self_test_stable:true,native_self_test_sha256:"sha256:"+"1".repeat(64),
    native_sha256:V6R2_NATIVE_SHA,native_bytes:726976,
    runner_sha256:V6R2_RUNNER_SHA,runner_bytes:45147,
    policy_sha256:"2".repeat(64),
    predecessor_native_sha256:
      "09f2afc921d9d7a5282372151005eab4a3d5bcc520b8359588eb0038351702c4",
    predecessor_native_bytes:722880,
    predecessor_runner_sha256:
      "f6a75184dcc63989328c351fc93e140e6dac103f682f5c58c9f76bccd359a889",
    predecessor_runner_bytes:40616,
    predecessor_policy_sha256:
      "d410bd2ec83daca5f7ba6e45e03afda0606b2bf6ea62cbabb9a700caa141adcc",
    predecessor_policy_bytes:305,node_sha256:"3".repeat(64),node_bytes:123456,
    runner_execution:false,live_composition_execution:false,
    credential_access:false,private_key_access:false,signing:false,
    transaction:false,payment_acceptance:false,public_presale_activation:false,
    wc_void_market_activation:false,treasury_liquidity_action:false,
    funds_movement:false,production_host_evidence_authority:false,
    next_action:QUALIFIER_NEXT_ACTION,
  };
  const candidate={
    marker:CANDIDATE_MARKER,version:3,status:CANDIDATE_STATUS,
    canonical_chain_id:2050,execution_epoch:2,
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
      signer_offchain_control_proven:true,
      signer_control_evidence_id_sha256:"4".repeat(64),
      signer_control_message_sha256:"5".repeat(64),
      signer_control_source_head:"6".repeat(40),
      signer_control_source_tree:"7".repeat(40),
      systemd_credential_identity_proven:false,
      epoch2_credential_binding_evidence_id:null,
      legacy_wallet_credential_reuse_authorized:false,
      credential_path_selected:false,
      private_key_material_read:false,
    },
    explicit_remaining_gates:[
      "independently_attest_systemd_credential_identity_and_active_signing_capability",
      "bind_accepted_epoch2_signer_evidence_to_current_runtime_source_generation",
      "qualify_live_zero_fee_envelope_and_exact_chain_receipt_or_prove_per_payment_native_gas_funding",
      "complete_current_chain_2050_one_payment_one_fulfillment_canary",
      "coupled_presale_and_wc_void_market_sovereign_activation",
    ],
    authority:{
      candidate_only:true,operational_configuration_selected:false,
      credential_or_wallet_access:false,service_mutation:false,
      signer_access:false,transaction_signing:false,transaction_broadcast:false,
      public_presale_activation:false,wc_void_market_activation:false,
      funds_movement:false,automatic_retry:false,
    },
  };
  const sealed={
    marker:SEALED_MARKER,version:2,evidence_id:"voide2sealed2_"+"8".repeat(64),
    source_head:head,immutable_fulfiller:EXPECTED_FULFILLER,
    credential_id:EXPECTED_CREDENTIAL_ID,systemd:{main_pid:4242},
    transaction_constructed:false,rpc_call_performed:false,
    transaction_broadcast_performed:false,funds_movement:false,
  };
  const childBody={
    marker:CHILD_MARKER,version:3,status:CHILD_STATUS,source_head:head,
    sealed_public_evidence:sealed,credential_lock_id:EXPECTED_CREDENTIAL_LOCK,
    credential_qualification_sha256:"9".repeat(64),
    credential_complete_dropin_set_sha256:"a".repeat(64),
    credential_complete_dropin_set_count:2,
    credential_complete_credential_set_sha256:"b".repeat(64),
    credential_complete_credential_set_count:4,
    credential_epoch2_target_match_count:1,runtime_uid:1000,
    manager_pid:2693,manager_start_ticks:"1409",main_pid:4242,
    service_start_ticks:"998877",signer_address:EXPECTED_FULFILLER,
    qualification_provenance_authenticated_by_runner:true,
    privileged_first_entry_authenticated:true,native_preentry_policy_bound:true,
    root_node_descriptor_execution_bound:true,runner_retained_descriptor_bound:true,
    native_parent_retained_for_child_lifetime:true,
    native_parent_process_generation_bound:true,
    native_parent_installed_generation_bound:true,
    native_parent_revalidated_after_sensitive_sequence:true,
    stdin_javascript_source_forbidden:true,
    qualification_stable_before_after_sealed_probe:true,
    checkout_revalidated_after_sensitive_sequence:true,
    complete_dropin_set_bound_across_signing_window:true,
    complete_credential_set_bound_across_signing_window:true,
    main_pid_crosscheck:true,loadcredential_binding_crosscheck:true,
    service_cgroup_hash_crosscheck:true,public_user_bus_sufficient_authority:false,
    credential_content_access_in_sealed_child:true,
    credential_content_access_in_runner_parent:false,
    private_key_material_in_sealed_child:true,private_key_output:false,
    nontransaction_signature_performed:true,transaction_constructed:false,
    transaction_submitted:false,transaction_broadcast:false,rpc_call:false,
    filesystem_write:false,host_mutation:false,service_mutation:false,
    systemd_mutation:false,payment_acceptance:false,public_presale_activation:false,
    wc_void_market_activation:false,funds_movement:false,
    production_host_evidence_authority:false,next_action:CHILD_NEXT_ACTION,
  };
  const child={...childBody,receipt_id:
    "voide2livecomp3_"+sha256(Buffer.from(canonical(childBody),"utf8"))};
  validateChildReceipt(child,head);
  const receipt=buildBindingReceipt(head,candidate,q,child);
  if(!/^voide2candbind3r1_[0-9a-f]{64}$/u.test(receipt.binding_receipt_id)||
     receipt.signer_credential_state.signer_offchain_control_proven!==true||
     receipt.signer_credential_state.systemd_credential_identity_proven!==true||
     receipt.signer_credential_state.active_signing_capability_proven!==true||
     receipt.explicit_remaining_gates.length!==3||
     receipt.customer_safe_to_pay!==false||
     receipt.authority.transaction_signing!==false||
     receipt.authority.public_presale_activation!==false||
     receipt.authority.funds_movement!==false){
    throw new Error("binding_receipt_self_test_failed");
  }
  console.log(MARKER+"_SELF_TEST_GREEN");
  console.log("candidate_v3_signer_control_preserved=true");
  console.log("v6r2_installed_qualification_required=true");
  console.log("fixed_native_v3_live_composition_required=true");
  console.log("arbitrary_live_receipt_input_accepted=false");
  console.log("systemd_credential_identity_promoted_only_from_native_live_receipt=true");
  console.log("active_signing_capability_promoted_only_from_native_live_receipt=true");
  console.log("runtime_source_generation_bound=true");
  console.log("remaining_gate_count=3");
  console.log("customer_safe_to_pay=false");
  console.log("transaction=false");
  console.log("public_presale_activation=false");
  console.log("wc_void_market_activation=false");
  console.log("funds_movement=false");
}
function live(expectedHead,confirm){
  if(confirm!==CONFIRM)throw new Error("explicit_live_confirmation_required");
  if(typeof process.geteuid!=="function"||process.geteuid()!==0){
    throw new Error("root_required_for_live_binding");
  }
  if(process.argv[1]!=="-")throw new Error("binder_git_object_stdin_required");
  assertTrustedExecutable(GIT);
  assertTrustedExecutable(PYTHON);
  assertTrustedExecutable(SETPRIV);
  assertTrustedExecutable(FIXED_NATIVE);
  requireExactCheckout(expectedHead);

  const candidate=loadCandidate(expectedHead);
  const before=runQualification(expectedHead);
  const child=runNativeLive(expectedHead);
  const after=runQualification(expectedHead);
  if(canonical(before)!==canonical(after)){
    throw new Error("installed_qualification_changed_across_live_composition");
  }
  requireExactCheckout(expectedHead);
  const receipt=buildBindingReceipt(expectedHead,candidate,before,child);
  console.log(JSON.stringify(receipt,null,2));
}
function main(){
  const args=process.argv.slice(2);
  if(args.length===1&&args[0]==="--self-test"){selfTest();return;}
  if(args.length===1&&args[0]==="--plan"){plan();return;}
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
    marker:MARKER+"_HOLD",status:"HOLD",reason:safeReason(error?.message||error),
    live_composition_state:"unknown_or_partial_if_live_started",
    credential_content_access_state:"unknown_or_partial_if_live_started",
    private_key_output:false,transaction_constructed:false,
    transaction_submitted:false,transaction_broadcast:false,
    filesystem_write:false,host_mutation:false,service_mutation:false,
    systemd_mutation:false,payment_acceptance:false,customer_safe_to_pay:false,
    public_presale_activation:false,wc_void_market_activation:false,
    funds_movement:false,production_host_evidence_authority:false,
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
