#!/usr/bin/env node
// Current-generation unprivileged binder for accepted Epoch-2 signer control
// plus the installed protected live-composition V2 child. Live mode never
// accepts caller-supplied child receipt JSON and never streams JavaScript into
// the privileged boundary.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const MARKER =
  "VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_SIGNER_CONTROL_BINDING_V3";
export const CONFIRM =
  "RUN_EPOCH2_AUTHENTICATED_CREDENTIAL_SIGNER_CONTROL_BINDING_V3";
export const STATUS =
  "EPOCH2_AUTHENTICATED_CREDENTIAL_AND_SIGNER_CONTROL_BOUND_REMAINING_GATES_HOLD";
export const NEXT_ACTION =
  "QUALIFY_LIVE_EXACT_CHAIN_RECEIPT_AND_FEE_ENVELOPE";

const ROOT="/home/zoso/dev/void-node";

const CHILD_REL=
  "ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v2.mjs";
const CHILD_BLOB="92e8c8696ea7e2bb81b6ef089db8baa657188935";
const CHILD_CONFIRM=
  "RUN_AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V2";
const CHILD_MARKER=
  "VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_LIVE_COMPOSITION_V2";
const CHILD_STATUS=
  "AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V2_GREEN";
const CHILD_NEXT_ACTION=
  "BIND_PROTECTED_AUTHENTICATED_EPOCH2_CREDENTIAL_EVIDENCE_IN_DORMANT_CANDIDATE_SUCCESSOR";

const NATIVE_REL=
  "ops/precision/void_buy_void_epoch2_live_composition_native_preentry_v1.c";
const NATIVE_BLOB="4aa091e7835b32aa5c4e7b8e4059651c69a64eb3";
const NATIVE_FIXED=
  "/opt/void-buy-void-epoch2-live-composition-v2/void_buy_void_epoch2_live_composition_native_preentry_v1";

const INSTALLER_REL=
  "ops/precision/void_buy_void_epoch2_live_composition_native_protected_install_v1.py";
const INSTALLER_BLOB="f572868ea0edacbb3404771b793c4c60f9471abb";
const INSTALLED_QUALIFIER_REL=
  "ops/precision/void_buy_void_epoch2_live_composition_native_installed_qualification_v1.py";
const INSTALLED_QUALIFIER_BLOB="9722996a3a062fda61d3a35980a2a07242f54dcd";
const NATIVE_LOCK_REL=
  "ops/security/buy-void-epoch2-live-composition-native-candidate-lock-v3.json";
const NATIVE_LOCK_BLOB="57f965a944031eac90d69b4104b0f8f2473e66cc";

const CANDIDATE_REL=
  "ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v4.json";
const CANDIDATE_BLOB="e569c9211e01f14c7c00dd1c5041d4dfb0817609";
const CANDIDATE_PROOF_REL=
  "scripts/prove_buy_void_payment_keyed_epoch2_dormant_candidate_v4.mjs";
const CANDIDATE_PROOF_BLOB="402a5689a5bedfddb1abbcbf7f561ea41c3ec5d6";
const CANDIDATE_MARKER=
  "VOID_BUY_VOID_PAYMENT_KEYED_EPOCH2_DORMANT_CANDIDATE_V4";
const CANDIDATE_STATUS=
  "EPOCH2_SOURCE_CANDIDATE_SIGNER_CONTROL_PROVEN_CREDENTIAL_AND_ACTIVATION_HOLD";
const CANDIDATE_V3_BLOB="04061934a537a1d91213cdd1f9110b46faca4cc7";

const SIGNER_EVIDENCE_REL=
  "ops/mainnet0/evidence/buy-void-epoch2-signer-control-public-evidence-v1.json";
const SIGNER_EVIDENCE_BLOB="361aea8767f8b049fafd28663b71b177f38f180d";
const SIGNER_TOOL_REL=
  "tools/void-buy-void-epoch2-signer-control-public-evidence-v1.mjs";
const SIGNER_TOOL_BLOB="d0f3c575903a44b9a538f0201257584545077be9";
const SIGNER_PROOF_REL=
  "scripts/prove_buy_void_epoch2_signer_control_public_evidence_v1.mjs";
const SIGNER_PROOF_BLOB="8b34c9c43e28122d7509febfb8f5ab9a001a1b43";
const SIGNER_EVIDENCE_MARKER=
  "VOID_BUY_VOID_EPOCH2_SIGNER_CONTROL_PUBLIC_EVIDENCE_V1";
const SIGNER_EVIDENCE_STATUS="SIGNER_OFFCHAIN_CONTROL_PROVEN";
const SIGNER_EVIDENCE_ID=
  "a0228229b4432e54c02f970a5047fc1a16c703e2072057f245624e0d2c3b3d57";
const SIGNER_MESSAGE_SHA=
  "0492a0ae6b2a3fcbd18c907dc2a847b7f16be07ac49840a420182342b4017dad";
const SIGNER_SOURCE_HEAD="5bc76c0c1410f8db2f3e759a94a2a3184ab800de";
const SIGNER_SOURCE_TREE="118fa8680937d88db1e8a83a393408123e01f03c";

const EXPECTED_FULFILLER=
  "0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a";
const EXPECTED_PRESALE=
  "0x530bc90ba74f2539a9e484ccb1be9291c3bc35ce";
const EXPECTED_VOID_TOKEN=
  "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const EXPECTED_SOURCE_BINDING=
  "5fde8cc7fcd0493619c105ac9f367063fbdacd74e8ae50df76454c6d298206f1";
const EXPECTED_CREDENTIAL_LOCK=
  "voidbuyumqcredelflock1_65a1839c14b692349dda8cccdbe8657a9485754c5d10ffa5b57421ce87e3753c";

const RUNTIME_UID=1000;
const RUNTIME_HOME="/home/zoso";
const GIT="/usr/bin/git";
const SUDO="/usr/bin/sudo";
const DEVNULL="/dev/null";
const MAX_OUTPUT=8*1024*1024;
const SHA40=/^[0-9a-f]{40}$/u;
const CHILD_RECEIPT=/^voide2livecomp2_[0-9a-f]{64}$/u;

const EXPECTED_REMAINING_GATES=Object.freeze([
  "qualify_live_exact_chain_receipt_and_either_zero_fee_envelope_or_per_payment_native_gas_funding",
  "complete_current_chain_2050_one_payment_one_fulfillment_canary",
  "coupled_presale_and_wc_void_market_sovereign_activation",
]);

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
  return {
    PATH:"/usr/bin:/bin",
    HOME:"/root",
    LANG:"C",
    LC_ALL:"C",
    TZ:"UTC",
  };
}

function run(command,args,options={}){
  const result=spawnSync(command,args,{
    cwd:options.cwd??ROOT,
    env:options.env??cleanRootEnv(),
    input:options.input,
    encoding:"utf8",
    stdio:options.stdio??["pipe","pipe","pipe"],
    timeout:options.timeout??180_000,
    maxBuffer:MAX_OUTPUT,
  });
  if(result.error)throw new Error("spawn_error:"+safeReason(result.error.message));
  return result;
}

function assertTrustedExecutable(file){
  const real=fs.realpathSync(file);
  const st=fs.lstatSync(real,{bigint:true});
  if(!st.isFile()||st.isSymbolicLink()||st.uid!==0n||
     (st.mode&0o022n)!==0n||(st.mode&0o111n)===0n){
    throw new Error("trusted_executable_invalid:"+path.basename(file));
  }
}

function git(args){
  const r=run(GIT,[
    "--no-replace-objects",
    "-c","core.fsmonitor=false",
    "-c","core.hooksPath=/dev/null",
    ...args,
  ],{env:cleanGitEnv(),timeout:20_000});
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
  const bytes=Buffer.from(
    git(["cat-file","blob",expectedHead+":"+relative]),
    "utf8",
  );
  if(gitBlob(bytes)!==expectedBlob){
    bytes.fill(0);
    throw new Error("git_object_blob_mismatch:"+relative);
  }
  return bytes;
}

function pinSourceObjects(expectedHead){
  for(const [relative,blob] of [
    [CHILD_REL,CHILD_BLOB],
    [NATIVE_REL,NATIVE_BLOB],
    [INSTALLER_REL,INSTALLER_BLOB],
    [INSTALLED_QUALIFIER_REL,INSTALLED_QUALIFIER_BLOB],
    [NATIVE_LOCK_REL,NATIVE_LOCK_BLOB],
    [CANDIDATE_PROOF_REL,CANDIDATE_PROOF_BLOB],
    [SIGNER_TOOL_REL,SIGNER_TOOL_BLOB],
    [SIGNER_PROOF_REL,SIGNER_PROOF_BLOB],
  ]){
    const bytes=gitObject(expectedHead,relative,blob);
    bytes.fill(0);
  }
}

function parseJson(text,reason){
  if(typeof text!=="string"||text.length<2||
     Buffer.byteLength(text,"utf8")>MAX_OUTPUT){
    throw new Error(reason);
  }
  try{
    const value=JSON.parse(text);
    if(!value||typeof value!=="object"||Array.isArray(value))throw new Error();
    return value;
  }catch{
    throw new Error(reason);
  }
}

function exactArray(actual,expected){
  return Array.isArray(actual)&&
    actual.length===expected.length&&
    actual.every((value,index)=>value===expected[index]);
}

function validateCandidate(candidate){
  if(candidate?.marker!==CANDIDATE_MARKER||
     candidate.version!==4||
     candidate.status!==CANDIDATE_STATUS||
     candidate.canonical_chain_id!==2050||
     candidate.execution_epoch!==2||
     candidate.predecessor_candidate_path!==
       "ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v3.json"||
     candidate.predecessor_candidate_git_blob_sha1!==CANDIDATE_V3_BLOB||
     candidate.selected_production_target_path!==
       "ops/mainnet0/production-epoch2-rpc-target-v1.json"||
     candidate.epoch2_presale_contract!==EXPECTED_PRESALE||
     candidate.epoch2_fulfiller_public_address!==EXPECTED_FULFILLER){
    throw new Error("dormant_candidate_v4_header_invalid");
  }

  const config=candidate.candidate_configuration;
  if(!config||typeof config!=="object"||Array.isArray(config)||
     config.VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED!=="0"||
     config.VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED!=="0"||
     config.VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_RPC_URL!==
       "http://127.0.0.1:18553/"||
     config.VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CONTRACT_ADDRESS!==
       EXPECTED_PRESALE||
     config.VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS!==EXPECTED_VOID_TOKEN||
     config.VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS!==EXPECTED_FULFILLER||
     config.VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_BINDING_ID!==
       EXPECTED_SOURCE_BINDING){
    throw new Error("dormant_candidate_v4_configuration_invalid");
  }

  const state=candidate.signer_credential_state;
  if(!state||typeof state!=="object"||Array.isArray(state)||
     state.signer_offchain_control_proven!==true||
     state.signer_control_evidence_path!==SIGNER_EVIDENCE_REL||
     state.signer_control_evidence_id_sha256!==SIGNER_EVIDENCE_ID||
     state.signer_control_message_sha256!==SIGNER_MESSAGE_SHA||
     state.signer_control_source_head!==SIGNER_SOURCE_HEAD||
     state.signer_control_source_tree!==SIGNER_SOURCE_TREE||
     state.systemd_credential_identity_proven!==false||
     state.epoch2_credential_binding_evidence_id!==null||
     state.legacy_wallet_credential_reuse_authorized!==false||
     state.credential_path_selected!==false||
     state.private_key_material_read!==false){
    throw new Error("dormant_candidate_v4_signer_state_invalid");
  }

  if(!exactArray(candidate.explicit_remaining_gates,[
    "independently_attest_systemd_credential_identity_and_active_signing_capability",
    "bind_accepted_epoch2_signer_evidence_to_current_runtime_source_generation",
    ...EXPECTED_REMAINING_GATES,
  ])){
    throw new Error("dormant_candidate_v4_remaining_gates_invalid");
  }

  const authority=candidate.authority;
  if(!authority||typeof authority!=="object"||Array.isArray(authority)||
     authority.candidate_only!==true){
    throw new Error("dormant_candidate_v4_authority_invalid");
  }
  for(const [key,value] of Object.entries(authority)){
    if(key!=="candidate_only"&&value!==false){
      throw new Error("dormant_candidate_v4_authority_overclaim:"+key);
    }
  }
}

function validateSignerEvidence(evidence){
  if(evidence?.marker!==SIGNER_EVIDENCE_MARKER||
     evidence.version!==1||
     evidence.status!==SIGNER_EVIDENCE_STATUS||
     evidence.signing_message_sha256!==SIGNER_MESSAGE_SHA||
     evidence.accepted_source_head!==SIGNER_SOURCE_HEAD||
     evidence.accepted_source_tree!==SIGNER_SOURCE_TREE||
     evidence.immutable_fulfiller!==EXPECTED_FULFILLER||
     sha256(Buffer.from(canonical(evidence),"utf8"))!==SIGNER_EVIDENCE_ID){
    throw new Error("signer_control_evidence_header_invalid");
  }
  const interpretation=evidence.interpretation;
  if(!interpretation||
     interpretation.signer_offchain_control_proven!==true||
     interpretation.systemd_credential_identity_proven!==false||
     interpretation.runtime_source_binding_proven!==false||
     interpretation.runtime_credential_installed_verified!==false||
     interpretation.live_payment_signing_authorized!==false||
     interpretation.transaction_sign_or_broadcast_authorized!==false||
     interpretation.public_presale_activation_authorized!==false||
     interpretation.wc_void_market_activation_authorized!==false||
     interpretation.funds_movement_authorized!==false){
    throw new Error("signer_control_evidence_interpretation_invalid");
  }
  const challenge=evidence.receipt?.challenge;
  if(!challenge||
     challenge.chain_id!==2050||
     challenge.execution_epoch!==2||
     challenge.immutable_fulfiller!==EXPECTED_FULFILLER||
     challenge.presale_contract!==EXPECTED_PRESALE||
     challenge.void_token!==EXPECTED_VOID_TOKEN||
     challenge.production_rpc_url!=="http://127.0.0.1:18553/"||
     challenge.purpose!=="OFFCHAIN_PROOF_OF_CONTROL_ONLY"){
    throw new Error("signer_control_evidence_challenge_invalid");
  }
}

function validateChildReceipt(receipt,expectedHead){
  const required={
    marker:CHILD_MARKER,
    version:2,
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
    if(receipt?.[key]!==want){
      throw new Error("child_live_receipt_field_invalid:"+key);
    }
  }
  if(!CHILD_RECEIPT.test(String(receipt.receipt_id||""))||
     !Number.isSafeInteger(receipt.manager_pid)||receipt.manager_pid<=1||
     !Number.isSafeInteger(receipt.main_pid)||receipt.main_pid<=1||
     typeof receipt.manager_start_ticks!=="string"||
     !/^[1-9][0-9]*$/u.test(receipt.manager_start_ticks)||
     typeof receipt.service_start_ticks!=="string"||
     !/^[1-9][0-9]*$/u.test(receipt.service_start_ticks)){
    throw new Error("child_live_receipt_identity_invalid");
  }
  const sealed=receipt.sealed_public_evidence;
  if(!sealed||typeof sealed!=="object"||Array.isArray(sealed)||
     sealed.version!==2||
     sealed.source_head!==expectedHead||
     sealed.immutable_fulfiller!==EXPECTED_FULFILLER||
     sealed.credential_id!=="buy-void-epoch2-fulfiller-v1"||
     sealed.systemd?.main_pid!==receipt.main_pid||
     sealed.privileged_first_entry_authenticated!==false||
     sealed.credential_generation_retained_through_signing!==true||
     sealed.credential_generation_revalidated_after_final_observation!==true||
     sealed.credential_generation_revalidated_immediately_before_close!==true||
     sealed.transaction_constructed!==false||
     sealed.rpc_call_performed!==false||
     sealed.transaction_broadcast_performed!==false||
     sealed.funds_movement!==false){
    throw new Error("child_sealed_public_evidence_invalid");
  }
}

function loadStaticEvidence(expectedHead){
  pinSourceObjects(expectedHead);
  const candidateRaw=gitObject(expectedHead,CANDIDATE_REL,CANDIDATE_BLOB);
  const evidenceRaw=gitObject(expectedHead,SIGNER_EVIDENCE_REL,SIGNER_EVIDENCE_BLOB);
  try{
    const candidate=parseJson(
      candidateRaw.toString("utf8"),
      "dormant_candidate_v4_json_invalid",
    );
    const evidence=parseJson(
      evidenceRaw.toString("utf8"),
      "signer_control_evidence_json_invalid",
    );
    validateCandidate(candidate);
    validateSignerEvidence(evidence);
    return {candidate,evidence};
  }finally{
    candidateRaw.fill(0);
    evidenceRaw.fill(0);
  }
}

function runProtectedChild(expectedHead){
  pinSourceObjects(expectedHead);
  let nullFd=-1;
  let result;
  try{
    nullFd=fs.openSync(DEVNULL,"r");
    result=spawnSync(SUDO,[
      "-n",
      NATIVE_FIXED,
      "--run",
      "--confirm",
      CHILD_CONFIRM,
      "--expected-head",
      expectedHead,
    ],{
      cwd:ROOT,
      env:cleanRootEnv(),
      encoding:"utf8",
      stdio:[nullFd,"pipe","pipe"],
      timeout:240_000,
      maxBuffer:MAX_OUTPUT,
    });
  }finally{
    if(nullFd>=0)fs.closeSync(nullFd);
  }
  if(result.error){
    throw new Error("protected_child_spawn_error:"+safeReason(result.error.message));
  }
  if(result.status!==0){
    let reason="protected_child_failed:"+String(result.status);
    const stderr=String(result.stderr||"");
    const match=/reason=([A-Za-z0-9_.:-]+)/u.exec(stderr);
    if(match)reason=match[1];
    throw new Error(reason);
  }
  if(result.stderr!==""){
    throw new Error("protected_child_unexpected_stderr");
  }
  const receipt=parseJson(
    result.stdout,
    "protected_child_live_composition_json_invalid",
  );
  validateChildReceipt(receipt,expectedHead);
  return receipt;
}

export function buildReceipt(expectedHead,child,candidate,evidence){
  validateChildReceipt(child,expectedHead);
  validateCandidate(candidate);
  validateSignerEvidence(evidence);

  if(candidate.signer_credential_state.signer_control_evidence_id_sha256!==
     SIGNER_EVIDENCE_ID||
     child.signer_address!==evidence.immutable_fulfiller||
     child.sealed_public_evidence.immutable_fulfiller!==
       candidate.epoch2_fulfiller_public_address){
    throw new Error("evidence_crosscheck_failed");
  }

  const body={
    marker:MARKER,
    version:3,
    status:STATUS,
    source_head:expectedHead,
    dormant_candidate_path:CANDIDATE_REL,
    dormant_candidate_git_blob:CANDIDATE_BLOB,
    dormant_candidate_marker:candidate.marker,
    dormant_candidate_version:candidate.version,
    authenticated_credential_live_receipt:child,
    authenticated_credential_live_receipt_id:child.receipt_id,
    authenticated_credential_live_receipt_sha256:
      sha256(Buffer.from(canonical(child),"utf8")),
    accepted_signer_control_public_evidence:evidence,
    accepted_signer_control_public_evidence_git_blob:SIGNER_EVIDENCE_BLOB,
    accepted_signer_control_evidence_id_sha256:SIGNER_EVIDENCE_ID,
    signer_control_tool_git_blob:SIGNER_TOOL_BLOB,
    signer_control_proof_git_blob:SIGNER_PROOF_BLOB,
    installed_native_qualifier_git_blob:INSTALLED_QUALIFIER_BLOB,
    privileged_first_entry_authenticated:true,
    native_preentry_policy_bound:true,
    root_node_descriptor_execution_bound:true,
    runner_retained_descriptor_bound:true,
    native_parent_retained_for_child_lifetime:true,
    native_parent_process_generation_bound:true,
    native_parent_installed_generation_bound:true,
    native_parent_revalidated_after_sensitive_sequence:true,
    stdin_javascript_source_forbidden:true,
    checkout_revalidated_after_protected_child:true,
    canonical_chain_id:2050,
    execution_epoch:2,
    epoch2_presale_contract:EXPECTED_PRESALE,
    epoch2_fulfiller_public_address:EXPECTED_FULFILLER,
    signer_credential_state:{
      signer_offchain_control_proven:true,
      launch_operator_signer_control_evidence_bound:true,
      systemd_credential_identity_proven:true,
      active_nontransaction_signing_capability_proven:true,
      runtime_source_generation_bound:true,
      protected_native_generation_bound:true,
      authenticated_private_manager_generation_bound:true,
      current_system_credential_matches_immutable_fulfiller:true,
      nontransaction_signature_performed:true,
      transaction_signing_proven:false,
      transaction_broadcast_proven:false,
      private_key_material_output:false,
    },
    explicit_remaining_gates:[...EXPECTED_REMAINING_GATES],
    customer_safe_to_pay:false,
    authority:{
      candidate_only:true,
      operational_configuration_selected:false,
      ongoing_credential_or_wallet_access:false,
      service_mutation:false,
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
    receipt_id:
      "voide2signcred3_"+sha256(Buffer.from(canonical(body),"utf8")),
  });
}

function plan(){
  console.log(MARKER);
  console.log("mode=plan");
  console.log("runtime_uid_required_for_live=true");
  console.log("binder_root_execution_forbidden=true");
  console.log("git_object_stdin_required_for_live=true");
  console.log("fixed_installed_native_preentry_required=true");
  console.log("sudo_cached_or_nopasswd_required=true");
  console.log("child_stdin_devnull_required=true");
  console.log("exact_protected_live_composition_child_required=true");
  console.log("arbitrary_child_receipt_input_accepted=false");
  console.log("exact_dormant_candidate_v4_git_object_required=true");
  console.log("accepted_signer_control_public_evidence_git_object_required=true");
  console.log("current_installed_qualification_source_pinned=true");
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
  console.log("next_action=SEPARATELY_AUTHORIZE_EPOCH2_AUTHENTICATED_CREDENTIAL_SIGNER_CONTROL_BINDING_V3");
}

function syntheticCandidate(){
  return {
    marker:CANDIDATE_MARKER,
    version:4,
    status:CANDIDATE_STATUS,
    canonical_chain_id:2050,
    execution_epoch:2,
    predecessor_candidate_path:
      "ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v3.json",
    predecessor_candidate_git_blob_sha1:CANDIDATE_V3_BLOB,
    selected_production_target_path:
      "ops/mainnet0/production-epoch2-rpc-target-v1.json",
    epoch2_presale_contract:EXPECTED_PRESALE,
    epoch2_fulfiller_public_address:EXPECTED_FULFILLER,
    candidate_configuration:{
      VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED:"0",
      VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED:"0",
      VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_RPC_URL:"http://127.0.0.1:18553/",
      VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CONTRACT_ADDRESS:EXPECTED_PRESALE,
      VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS:EXPECTED_VOID_TOKEN,
      VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS:EXPECTED_FULFILLER,
      VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_BINDING_ID:EXPECTED_SOURCE_BINDING,
    },
    signer_credential_state:{
      signer_offchain_control_proven:true,
      signer_control_evidence_path:SIGNER_EVIDENCE_REL,
      signer_control_evidence_id_sha256:SIGNER_EVIDENCE_ID,
      signer_control_message_sha256:SIGNER_MESSAGE_SHA,
      signer_control_source_head:SIGNER_SOURCE_HEAD,
      signer_control_source_tree:SIGNER_SOURCE_TREE,
      systemd_credential_identity_proven:false,
      epoch2_credential_binding_evidence_id:null,
      legacy_wallet_credential_reuse_authorized:false,
      credential_path_selected:false,
      private_key_material_read:false,
    },
    explicit_remaining_gates:[
      "independently_attest_systemd_credential_identity_and_active_signing_capability",
      "bind_accepted_epoch2_signer_evidence_to_current_runtime_source_generation",
      ...EXPECTED_REMAINING_GATES,
    ],
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
}

function syntheticEvidence(){
  const evidence={
    marker:SIGNER_EVIDENCE_MARKER,
    version:1,
    status:SIGNER_EVIDENCE_STATUS,
    source_bundle_sha256:"6".repeat(64),
    source_receipt_sha256:"7".repeat(64),
    source_verification_sha256:"8".repeat(64),
    signing_message_sha256:SIGNER_MESSAGE_SHA,
    accepted_source_head:SIGNER_SOURCE_HEAD,
    accepted_source_tree:SIGNER_SOURCE_TREE,
    immutable_fulfiller:EXPECTED_FULFILLER,
    receipt:{
      challenge:{
        chain_id:2050,
        execution_epoch:2,
        expires_at_ms:1791866856795,
        immutable_fulfiller:EXPECTED_FULFILLER,
        issued_at_ms:1791866556795,
        marker:"VOID_BUY_VOID_EPOCH2_SIGNER_CONTROL_V1",
        nonce:"0x"+"1".repeat(64),
        presale_contract:EXPECTED_PRESALE,
        production_rpc_url:"http://127.0.0.1:18553/",
        purpose:"OFFCHAIN_PROOF_OF_CONTROL_ONLY",
        source_head:SIGNER_SOURCE_HEAD,
        version:1,
        void_token:EXPECTED_VOID_TOKEN,
      },
      signature:"0x"+"2".repeat(130),
    },
    interpretation:{
      signer_offchain_control_proven:true,
      systemd_credential_identity_proven:false,
      runtime_source_binding_proven:false,
      runtime_credential_installed_verified:false,
      live_payment_signing_authorized:false,
      transaction_sign_or_broadcast_authorized:false,
      public_presale_activation_authorized:false,
      wc_void_market_activation_authorized:false,
      funds_movement_authorized:false,
    },
  };
  return evidence;
}

function syntheticChild(){
  const head="a".repeat(40);
  return {
    marker:CHILD_MARKER,
    version:2,
    status:CHILD_STATUS,
    source_head:head,
    sealed_public_evidence:{
      source_head:head,
      immutable_fulfiller:EXPECTED_FULFILLER,
      credential_id:"buy-void-epoch2-fulfiller-v1",
      systemd:{main_pid:4242},
      version:2,
      privileged_first_entry_authenticated:false,
      credential_generation_retained_through_signing:true,
      credential_generation_revalidated_after_final_observation:true,
      credential_generation_revalidated_immediately_before_close:true,
      transaction_constructed:false,
      rpc_call_performed:false,
      transaction_broadcast_performed:false,
      funds_movement:false,
    },
    credential_lock_id:EXPECTED_CREDENTIAL_LOCK,
    runtime_uid:RUNTIME_UID,
    manager_pid:2693,
    manager_start_ticks:"1409",
    main_pid:4242,
    service_start_ticks:"998877",
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
    receipt_id:"voide2livecomp2_"+"b".repeat(64),
  };
}

function selfTest(){
  const candidate=syntheticCandidate();
  const child=syntheticChild();
  // Use the exact committed public evidence for its content-address check in
  // self-test when available through the current checkout; otherwise the
  // synthetic evidence cannot satisfy the fixed evidence ID by construction.
  const raw=fs.readFileSync(path.join(ROOT,SIGNER_EVIDENCE_REL),"utf8");
  const evidence=JSON.parse(raw);
  validateSignerEvidence(evidence);

  const receipt=buildReceipt("a".repeat(40),child,candidate,evidence);
  if(!/^voide2signcred3_[0-9a-f]{64}$/u.test(receipt.receipt_id)||
     receipt.signer_credential_state.signer_offchain_control_proven!==true||
     receipt.signer_credential_state.systemd_credential_identity_proven!==true||
     receipt.signer_credential_state.active_nontransaction_signing_capability_proven!==true||
     receipt.signer_credential_state.transaction_signing_proven!==false||
     !exactArray(receipt.explicit_remaining_gates,EXPECTED_REMAINING_GATES)||
     receipt.customer_safe_to_pay!==false||
     receipt.authority.transaction_signing!==false||
     receipt.authority.public_presale_activation!==false||
     receipt.authority.funds_movement!==false){
    throw new Error("combined_receipt_self_test_failed");
  }

  const forged=structuredClone(child);
  forged.transaction_constructed=true;
  let rejected=false;
  try{buildReceipt("a".repeat(40),forged,candidate,evidence);}
  catch(error){rejected=true;if(error instanceof Error)void error.message;}
  if(!rejected)throw new Error("forged_child_overclaim_accepted");

  console.log(MARKER+"_SELF_TEST_GREEN");
  console.log("current_dormant_candidate_v4_bound=true");
  console.log("accepted_signer_control_evidence_bound=true");
  console.log("protected_live_composition_v2_required=true");
  console.log("arbitrary_child_receipt_input_accepted=false");
  console.log("signer_offchain_control_proven_on_combined_receipt=true");
  console.log("systemd_credential_identity_proven_on_combined_receipt=true");
  console.log("active_nontransaction_signing_capability_proven_on_combined_receipt=true");
  console.log("remaining_gate_count=3");
  console.log("transaction_signing_proven=false");
  console.log("customer_safe_to_pay=false");
  console.log("transaction=false");
  console.log("payment_acceptance=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}

function live(expectedHead,confirm){
  if(confirm!==CONFIRM)throw new Error("explicit_live_confirmation_required");
  if(typeof process.geteuid!=="function"||process.geteuid()!==RUNTIME_UID){
    throw new Error("runtime_uid_required_for_live_binding");
  }
  if(process.argv[1]!=="-")throw new Error("binder_git_object_stdin_required");

  assertTrustedExecutable(GIT);
  assertTrustedExecutable(SUDO);
  requireExactCheckout(expectedHead);

  const {candidate,evidence}=loadStaticEvidence(expectedHead);
  requireExactCheckout(expectedHead);

  const child=runProtectedChild(expectedHead);
  requireExactCheckout(expectedHead);

  const receipt=buildReceipt(expectedHead,child,candidate,evidence);
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
    binder_root_execution_forbidden:true,
    privileged_first_entry_authenticated:false,
    reason:safeReason(error?.message||error),
    protected_child_state:"not_started_or_unknown_if_live_started",
    credential_content_access_state:"none_or_unknown_if_live_started",
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
  const args=process.argv.slice(2);
  if(args.length===1&&(args[0]==="--self-test"||args[0]==="--plan")){
    try{main();}catch(error){printHold(error);process.exitCode=2;}
  }else{
    printHold(new Error("binder_git_object_stdin_required"));
    process.exitCode=2;
  }
}
