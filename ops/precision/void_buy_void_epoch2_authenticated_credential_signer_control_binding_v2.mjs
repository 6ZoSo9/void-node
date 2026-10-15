#!/usr/bin/env node
// Unprivileged live composition of protected authenticated credential evidence
// with the already accepted Epoch-2 signer-control public evidence.
// The reviewed runner may execute from a Git object on stdin; only its nested
// V2 binder/native-preentry chain crosses into root.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const MARKER =
  "VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_SIGNER_CONTROL_BINDING_V2";
export const CONFIRM =
  "RUN_EPOCH2_AUTHENTICATED_CREDENTIAL_SIGNER_CONTROL_BINDING_V2";
export const STATUS =
  "EPOCH2_AUTHENTICATED_CREDENTIAL_AND_SIGNER_CONTROL_BOUND_REMAINING_GATES_HOLD";
export const NEXT_ACTION =
  "QUALIFY_LIVE_FEE_ENVELOPE_AND_EXACT_CHAIN_RECEIPT";

const ROOT="/home/zoso/dev/void-node";

const CHILD_REL=
  "ops/precision/void_buy_void_epoch2_dormant_candidate_live_binding_v2.mjs";
const CHILD_BLOB="20105c8ff7ac35aac0f0f2fcbe8884ba441f5870";
const CHILD_CONFIRM=
  "RUN_EPOCH2_DORMANT_CANDIDATE_LIVE_BINDING_V2";
const CHILD_MARKER=
  "VOID_BUY_VOID_EPOCH2_DORMANT_CANDIDATE_LIVE_BINDING_V2";
const CHILD_STATUS=
  "EPOCH2_AUTHENTICATED_CREDENTIAL_BOUND_REMAINING_GATES_HOLD";
const CHILD_NEXT_ACTION=
  "BIND_ACCEPTED_EPOCH2_SIGNER_CONTROL_EVIDENCE_TO_AUTHENTICATED_CREDENTIAL_RECEIPT";

const CANDIDATE_V2_REL=
  "ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v2.json";
const CANDIDATE_V2_BLOB="6a0159e516d30ca8a4b9af4dcace79a4fcddfbb1";
const CANDIDATE_V2_PROOF_REL=
  "scripts/prove_buy_void_payment_keyed_epoch2_dormant_candidate_v2.mjs";
const CANDIDATE_V2_PROOF_BLOB="863ea6fcef568314e43ea8994bf495e126b5a434";
const CANDIDATE_V1_BLOB="2c861c021192c034c98404989cd25b26788cd0f0";
const CANDIDATE_V2_MARKER=
  "VOID_BUY_VOID_PAYMENT_KEYED_EPOCH2_DORMANT_CANDIDATE_V2";
const CANDIDATE_V2_STATUS=
  "EPOCH2_SOURCE_CANDIDATE_SIGNER_CONTROL_PROVEN_CREDENTIAL_AND_ACTIVATION_HOLD";

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
const EXPECTED_CREDENTIAL_RECEIPT=/^voide2candbind2_[0-9a-f]{64}$/u;

const RUNTIME_UID=1000;
const RUNTIME_GID=1000;
const RUNTIME_HOME="/home/zoso";
const GIT="/usr/bin/git";
const NODE="/usr/bin/node";
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
    timeout:options.timeout??150_000,
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

function validateChild(child,expectedHead){
  const required={
    marker:CHILD_MARKER,
    version:2,
    status:CHILD_STATUS,
    source_head:expectedHead,
    source_candidate_git_blob:CANDIDATE_V1_BLOB,
    canonical_chain_id:2050,
    execution_epoch:2,
    epoch2_presale_contract:EXPECTED_PRESALE,
    epoch2_fulfiller_public_address:EXPECTED_FULFILLER,
    checkout_revalidated_after_child:true,
    privileged_first_entry_authenticated:true,
    native_preentry_policy_bound:true,
    root_node_descriptor_execution_bound:true,
    runner_retained_descriptor_bound:true,
    stdin_javascript_source_forbidden:true,
    customer_safe_to_pay:false,
    production_host_evidence_authority:false,
    next_action:CHILD_NEXT_ACTION,
  };
  for(const [key,want] of Object.entries(required)){
    if(child?.[key]!==want)throw new Error("child_binding_field_invalid:"+key);
  }
  if(!EXPECTED_CREDENTIAL_RECEIPT.test(String(child.binding_receipt_id||""))||
     child.signer_credential_state?.signer_offchain_control_proven!==false||
     child.signer_credential_state?.systemd_credential_identity_proven!==true||
     child.signer_credential_state?.active_signing_capability_proven!==true||
     child.signer_credential_state?.runtime_source_generation_bound!==true||
     child.signer_credential_state?.authenticated_private_manager_generation_bound!==true||
     child.signer_credential_state?.transaction_signing_proven!==false){
    throw new Error("child_binding_state_invalid");
  }
  const authority=child.authority;
  if(!authority||authority.candidate_only!==true){
    throw new Error("child_authority_invalid");
  }
  for(const [key,value] of Object.entries(authority)){
    if(key!=="candidate_only"&&value!==false){
      throw new Error("child_authority_overclaim:"+key);
    }
  }
}

function validateCandidateV2(candidate){
  if(candidate?.marker!==CANDIDATE_V2_MARKER||
     candidate.version!==2||
     candidate.status!==CANDIDATE_V2_STATUS||
     candidate.canonical_chain_id!==2050||
     candidate.execution_epoch!==2||
     candidate.predecessor_candidate_git_blob_sha1!==CANDIDATE_V1_BLOB||
     candidate.epoch2_presale_contract!==EXPECTED_PRESALE||
     candidate.epoch2_fulfiller_public_address!==EXPECTED_FULFILLER){
    throw new Error("signer_control_candidate_header_invalid");
  }
  const state=candidate.signer_credential_state;
  if(!state||
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
    throw new Error("signer_control_candidate_state_invalid");
  }
  const authority=candidate.authority;
  if(!authority||authority.candidate_only!==true){
    throw new Error("signer_control_candidate_authority_invalid");
  }
  for(const [key,value] of Object.entries(authority)){
    if(key!=="candidate_only"&&value!==false){
      throw new Error("signer_control_candidate_authority_overclaim:"+key);
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
     evidence.immutable_fulfiller!==EXPECTED_FULFILLER){
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
  if(evidence.receipt?.challenge?.chain_id!==2050||
     evidence.receipt?.challenge?.execution_epoch!==2||
     evidence.receipt?.challenge?.immutable_fulfiller!==EXPECTED_FULFILLER||
     evidence.receipt?.challenge?.presale_contract!==EXPECTED_PRESALE||
     evidence.receipt?.challenge?.purpose!=="OFFCHAIN_PROOF_OF_CONTROL_ONLY"){
    throw new Error("signer_control_evidence_challenge_invalid");
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
      env:cleanGitEnv(),
      input:source,
      timeout:240_000,
    });
    if(r.status!==0){
      let reason="credential_binding_child_failed:"+String(r.status);
      try{
        const held=JSON.parse(String(r.stderr||""));
        if(held&&typeof held.reason==="string")reason=held.reason;
      }catch(parseError){
        if(parseError instanceof Error)void parseError.message;
      }
      throw new Error(reason);
    }
    if(r.stderr!=="")throw new Error("credential_binding_child_unexpected_stderr");
    const child=parseJson(r.stdout,"credential_binding_child_json_invalid");
    validateChild(child,expectedHead);
    return child;
  }finally{
    source.fill(0);
  }
}

function loadStaticEvidence(expectedHead){
  const candidateRaw=gitObject(
    expectedHead,CANDIDATE_V2_REL,CANDIDATE_V2_BLOB
  );
  const evidenceRaw=gitObject(
    expectedHead,SIGNER_EVIDENCE_REL,SIGNER_EVIDENCE_BLOB
  );
  try{
    // Pin proof/tool objects as accepted source evidence even though live mode
    // does not execute mutable repository modules or node_modules.
    const candidateProof=gitObject(
      expectedHead,CANDIDATE_V2_PROOF_REL,CANDIDATE_V2_PROOF_BLOB
    );
    const signerTool=gitObject(
      expectedHead,SIGNER_TOOL_REL,SIGNER_TOOL_BLOB
    );
    const signerProof=gitObject(
      expectedHead,SIGNER_PROOF_REL,SIGNER_PROOF_BLOB
    );
    try{
      const candidate=parseJson(
        candidateRaw.toString("utf8"),
        "signer_control_candidate_json_invalid",
      );
      const evidence=parseJson(
        evidenceRaw.toString("utf8"),
        "signer_control_evidence_json_invalid",
      );
      validateCandidateV2(candidate);
      validateSignerEvidence(evidence);
      return {candidate,evidence};
    }finally{
      candidateProof.fill(0);
      signerTool.fill(0);
      signerProof.fill(0);
    }
  }finally{
    candidateRaw.fill(0);
    evidenceRaw.fill(0);
  }
}

export function buildReceipt(expectedHead,child,candidate,evidence){
  validateChild(child,expectedHead);
  validateCandidateV2(candidate);
  validateSignerEvidence(evidence);

  if(child.source_candidate_git_blob!==
     candidate.predecessor_candidate_git_blob_sha1){
    throw new Error("candidate_lineage_crosscheck_failed");
  }
  if(child.epoch2_fulfiller_public_address!==evidence.immutable_fulfiller){
    throw new Error("fulfiller_crosscheck_failed");
  }

  const body={
    marker:MARKER,
    version:2,
    status:STATUS,
    source_head:expectedHead,
    authenticated_credential_binding_receipt:child,
    authenticated_credential_binding_receipt_id:child.binding_receipt_id,
    privileged_first_entry_authenticated:child.privileged_first_entry_authenticated,
    native_preentry_policy_bound:child.native_preentry_policy_bound,
    root_node_descriptor_execution_bound:child.root_node_descriptor_execution_bound,
    runner_retained_descriptor_bound:child.runner_retained_descriptor_bound,
    stdin_javascript_source_forbidden:child.stdin_javascript_source_forbidden,
    authenticated_credential_binding_receipt_sha256:
      sha256(Buffer.from(canonical(child),"utf8")),
    accepted_signer_control_candidate_path:CANDIDATE_V2_REL,
    accepted_signer_control_candidate_git_blob:CANDIDATE_V2_BLOB,
    accepted_signer_control_public_evidence:evidence,
    accepted_signer_control_public_evidence_git_blob:SIGNER_EVIDENCE_BLOB,
    accepted_signer_control_evidence_id_sha256:SIGNER_EVIDENCE_ID,
    canonical_chain_id:2050,
    execution_epoch:2,
    epoch2_presale_contract:EXPECTED_PRESALE,
    epoch2_fulfiller_public_address:EXPECTED_FULFILLER,
    candidate_lineage_crosscheck:true,
    closing_checkout_revalidated_before_receipt:true,
    signer_credential_state:{
      signer_offchain_control_proven:true,
      launch_operator_signer_control_evidence_bound:true,
      systemd_credential_identity_proven:true,
      active_signing_capability_proven:true,
      runtime_source_generation_bound:true,
      authenticated_private_manager_generation_bound:true,
      current_system_credential_matches_immutable_fulfiller:true,
      transaction_signing_proven:false,
      transaction_broadcast_proven:false,
      private_key_material_output:false,
    },
    explicit_remaining_gates:[
      "qualify_live_zero_fee_or_nonzero_fee_envelope_and_exact_chain_receipt",
      "complete_current_chain_2050_one_payment_one_fulfillment_canary",
      "coupled_presale_and_wc_void_market_sovereign_activation",
    ],
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
    receipt_id:
      "voide2signcred2_"+sha256(Buffer.from(canonical(body),"utf8")),
  });
}

function plan(){
  console.log(MARKER);
  console.log("mode=plan");
  console.log("git_object_stdin_required_for_live=true");
  console.log("runtime_uid_required_for_run=true");
  console.log("runner_root_execution_forbidden=true");
  console.log("protected_v2_binder_child_required=true");
  console.log("exact_authenticated_credential_binding_child_required=true");
  console.log("arbitrary_credential_binding_receipt_input_accepted=false");
  console.log("accepted_signer_control_candidate_git_object_required=true");
  console.log("accepted_signer_control_public_evidence_git_object_required=true");
  console.log("accepted_signer_control_tool_and_proofs_pinned=true");
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
  console.log("next_action=SEPARATELY_AUTHORIZE_EPOCH2_AUTHENTICATED_CREDENTIAL_SIGNER_CONTROL_BINDING");
}

function selfTest(){
  const child={
    marker:CHILD_MARKER,
    version:2,
    status:CHILD_STATUS,
    source_head:"a".repeat(40),
    source_candidate_git_blob:CANDIDATE_V1_BLOB,
    canonical_chain_id:2050,
    execution_epoch:2,
    epoch2_presale_contract:EXPECTED_PRESALE,
    epoch2_fulfiller_public_address:EXPECTED_FULFILLER,
    checkout_revalidated_after_child:true,
    privileged_first_entry_authenticated:true,
    native_preentry_policy_bound:true,
    root_node_descriptor_execution_bound:true,
    runner_retained_descriptor_bound:true,
    stdin_javascript_source_forbidden:true,
    signer_credential_state:{
      signer_offchain_control_proven:false,
      systemd_credential_identity_proven:true,
      active_signing_capability_proven:true,
      runtime_source_generation_bound:true,
      authenticated_private_manager_generation_bound:true,
      transaction_signing_proven:false,
    },
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
    next_action:CHILD_NEXT_ACTION,
    binding_receipt_id:"voide2candbind2_"+"b".repeat(64),
  };

  const candidate={
    marker:CANDIDATE_V2_MARKER,
    version:2,
    status:CANDIDATE_V2_STATUS,
    canonical_chain_id:2050,
    execution_epoch:2,
    predecessor_candidate_git_blob_sha1:CANDIDATE_V1_BLOB,
    epoch2_presale_contract:EXPECTED_PRESALE,
    epoch2_fulfiller_public_address:EXPECTED_FULFILLER,
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

  const evidence={
    marker:SIGNER_EVIDENCE_MARKER,
    version:1,
    status:SIGNER_EVIDENCE_STATUS,
    signing_message_sha256:SIGNER_MESSAGE_SHA,
    accepted_source_head:SIGNER_SOURCE_HEAD,
    accepted_source_tree:SIGNER_SOURCE_TREE,
    immutable_fulfiller:EXPECTED_FULFILLER,
    receipt:{
      challenge:{
        chain_id:2050,
        execution_epoch:2,
        immutable_fulfiller:EXPECTED_FULFILLER,
        presale_contract:EXPECTED_PRESALE,
        purpose:"OFFCHAIN_PROOF_OF_CONTROL_ONLY",
      },
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

  const receipt=buildReceipt("a".repeat(40),child,candidate,evidence);
  if(!/^voide2signcred2_[0-9a-f]{64}$/u.test(receipt.receipt_id)||
     receipt.signer_credential_state.signer_offchain_control_proven!==true||
     receipt.signer_credential_state.systemd_credential_identity_proven!==true||
     receipt.signer_credential_state.active_signing_capability_proven!==true||
     receipt.signer_credential_state.transaction_signing_proven!==false||
     receipt.customer_safe_to_pay!==false||
     receipt.authority.transaction_signing!==false||
     receipt.authority.public_presale_activation!==false||
     receipt.authority.funds_movement!==false){
    throw new Error("combined_receipt_self_test_failed");
  }

  const forged=structuredClone(child);
  forged.source_candidate_git_blob="f".repeat(40);
  let rejected=false;
  try{buildReceipt("a".repeat(40),forged,candidate,evidence);}
  catch(error){rejected=true;if(error instanceof Error)void error.message;}
  if(!rejected)throw new Error("forged_child_lineage_accepted");

  console.log(MARKER+"_SELF_TEST_GREEN");
  console.log("arbitrary_credential_binding_receipt_input_accepted=false");
  console.log("accepted_signer_control_evidence_bound=true");
  console.log("candidate_lineage_crosscheck=true");
  console.log("signer_offchain_control_proven_on_combined_receipt=true");
  console.log("systemd_credential_identity_proven_on_combined_receipt=true");
  console.log("active_signing_capability_proven_on_combined_receipt=true");
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
  if(process.argv[1]!=="-")throw new Error("runner_git_object_stdin_required");

  assertTrustedExecutable(GIT);
  assertTrustedExecutable(NODE);
  requireExactCheckout(expectedHead);

  const child=runChild(expectedHead);
  requireExactCheckout(expectedHead);

  const {candidate,evidence}=loadStaticEvidence(expectedHead);
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
    "usage: runner --self-test | --plan | --run --confirm <token> --expected-head <sha>"
  );
}

function printHold(error){
  console.error(JSON.stringify({
    marker:MARKER+"_HOLD",
    status:"HOLD",
    runner_root_execution_forbidden:true,
    privileged_first_entry_authenticated:false,
    reason:safeReason(error?.message||error),
    child_binding_state:"unknown_or_partial_if_live_started",
    credential_content_access_state:"unknown_or_partial_in_descendant_if_live_started",
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
  printHold(new Error("runner_git_object_stdin_required"));
  process.exitCode=2;
}
