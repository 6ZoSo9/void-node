import crypto from "node:crypto";
import { types as utilTypes } from "node:util";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_CANDIDATE_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_CANDIDATE_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_PLAN_ID_V1 =
  "voidbuycustodychallengeplan1_dd868e3fb6ebdbf894c1170d0ecc153d61e198d9c20279a05c3309957add9006";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_ACCEPTED_ECONOMIC_TREE_V1 =
  "71c67e62a2b21a98f3f5135ee6aa56e0ef97d262";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_AUTHORITY_V1 =
  Object.freeze({
    source_only_candidate: true,
    injected_capabilities_required: true,
    protected_host_adapter_required: true,
    direct_host_filesystem_api_present: false,
    direct_process_api_present: false,
    direct_network_api_present: false,
    controller_installation_authorized: false,
    host_execution_authorized: false,
    filesystem_read_authorized: false,
    filesystem_write_authorized: false,
    storage_mutation_authorized: false,
    rollback_test_authorized: false,
    service_mutation_authorized: false,
    credential_access_authorized: false,
    wallet_or_signer_access_authorized: false,
    signing_authorized: false,
    transaction_submission_authorized: false,
    payment_acceptance_authorized: false,
    public_presale_activation_authorized: false,
    wc_void_market_activation_authorized: false,
    treasury_or_liquidity_action_authorized: false,
    funds_movement: false,
    production_host_evidence_authority: false,
  });

const AUTH_MARKER="VOID_BUY_VOID_CUSTODY_ROLLBACK_CHALLENGE_AUTHORIZATION_V1";
const OP_ID=/^voidbuycustodychallengeop1_[0-9a-f]{64}$/u;
const AUTH_ID=/^voidbuycustodychallengeauth1_[0-9a-f]{64}$/u;
const SHA=/^sha256:[0-9a-f]{64}$/u;
const HEX40=/^[0-9a-f]{40}$/u;
const ORIGIN=/^voidbuycustodychallengeorigin1_[0-9a-f]{64}$/u;
const STORAGE=/^storage:[A-Za-z0-9._:-]{1,96}$/u;
const MAX_SAFE=Number.MAX_SAFE_INTEGER;

const CAPABILITY_KEYS=Object.freeze([
  "generate_challenge_entropy",
  "observe_before",
  "append_journal_canary",
  "advance_high_water",
  "sync_close_reopen",
  "append_external_witness",
  "obtain_second_control_approval",
  "attempt_controlled_journal_rollback",
  "observe_after_rollback",
  "attempt_stale_journal_replay",
  "reobserve_storage_and_policy",
  "authenticate_evidence_origin",
]);

const AUTH_KEYS=Object.freeze([
  "marker","version","authorization_id","plan_id","operation_id",
  "non_customer_canary","allocation_ledger_unchanged_required",
  "customer_request_state_unchanged_required","reviewed_source_tree",
  "exact_current_policy_bound",
]);

function fail(code){ throw new Error(code); }

function dataObject(value,keys,code){
  if(!value||typeof value!=="object"||Array.isArray(value)||utilTypes.isProxy(value))fail(code);
  const proto=Object.getPrototypeOf(value);
  if(proto!==Object.prototype&&proto!==null)fail(code);
  const own=Reflect.ownKeys(value);
  if(own.length!==keys.length||own.some(k=>typeof k!=="string")||
     [...keys].sort().some((k,i)=>k!==[...own].sort()[i]))fail(code);
  const out=Object.create(null);
  for(const key of keys){
    const d=Object.getOwnPropertyDescriptor(value,key);
    if(!d||!("value" in d)||d.get||d.set||d.enumerable!==true)fail(code);
    out[key]=d.value;
  }
  return out;
}
function canonical(v){
  if(v===null||typeof v==="string"||typeof v==="boolean")return JSON.stringify(v);
  if(typeof v==="number"&&Number.isSafeInteger(v))return String(v);
  if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
  if(v&&typeof v==="object"){
    return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
  }
  fail("noncanonical_value");
}
function sha256(value){
  return "sha256:"+crypto.createHash("sha256").update(value).digest("hex");
}
function contentId(prefix,value){
  return prefix+crypto.createHash("sha256").update(canonical(value),"utf8").digest("hex");
}
function safeInt(v,code,min=0){
  if(!Number.isSafeInteger(v)||v<min||v>MAX_SAFE)fail(code);
  return v;
}
function string(v,re,code){
  if(typeof v!=="string"||!re.test(v))fail(code);
  return v;
}
function callSync(fn,args,code){
  if(typeof fn!=="function")fail(code+"_missing");
  let out;
  try{ out=fn(args); }catch(e){ fail(code+"_failed:"+String(e?.message||e||"error")); }
  if(out&&typeof out==="object"&&typeof out.then==="function")fail(code+"_async_forbidden");
  return out;
}

function normalizeAuthorization(value){
  const a=dataObject(value,AUTH_KEYS,"authorization_shape_invalid");
  if(a.marker!==AUTH_MARKER||a.version!==1)fail("authorization_marker_invalid");
  if(a.plan_id!==VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_PLAN_ID_V1)
    fail("authorization_plan_invalid");
  string(a.operation_id,OP_ID,"authorization_operation_id_invalid");
  if(a.non_customer_canary!==true||
     a.allocation_ledger_unchanged_required!==true||
     a.customer_request_state_unchanged_required!==true||
     a.exact_current_policy_bound!==true)fail("authorization_scope_invalid");
  if(a.reviewed_source_tree!==
     VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_ACCEPTED_ECONOMIC_TREE_V1)
    fail("authorization_source_generation_invalid");
  string(a.authorization_id,AUTH_ID,"authorization_id_invalid");
  const body={...a}; delete body.authorization_id;
  if(a.authorization_id!==contentId("voidbuycustodychallengeauth1_",body))
    fail("authorization_id_mismatch");
  return Object.freeze({...a});
}

function normalizeObservation(value,code){
  const keys=[
    "host_id","journal_sequence","journal_tip_sha256","high_water_sequence",
    "high_water_sha256","external_witness_sequence","external_witness_tip_sha256",
    "journal_storage_id","high_water_storage_id","policy_fingerprint_sha256",
    "policy_generation","allocation_ledger_sha256","customer_request_state_sha256",
    "reviewed_source_tree",
  ];
  const o=dataObject(value,keys,code+"_shape");
  if(typeof o.host_id!=="string"||o.host_id.length<1||o.host_id.length>128)fail(code+"_host");
  safeInt(o.journal_sequence,code+"_journal_sequence",0);
  safeInt(o.high_water_sequence,code+"_high_water_sequence",0);
  safeInt(o.external_witness_sequence,code+"_witness_sequence",0);
  string(o.journal_tip_sha256,SHA,code+"_journal_tip");
  string(o.high_water_sha256,SHA,code+"_high_water");
  string(o.external_witness_tip_sha256,SHA,code+"_witness_tip");
  string(o.journal_storage_id,STORAGE,code+"_journal_storage");
  string(o.high_water_storage_id,STORAGE,code+"_high_water_storage");
  if(o.journal_storage_id===o.high_water_storage_id)fail(code+"_storage_domains_not_distinct");
  string(o.policy_fingerprint_sha256,SHA,code+"_policy_fingerprint");
  if(typeof o.policy_generation!=="string"||!/^[1-9][0-9]{0,19}$/u.test(o.policy_generation))
    fail(code+"_policy_generation");
  string(o.allocation_ledger_sha256,SHA,code+"_allocation_ledger");
  string(o.customer_request_state_sha256,SHA,code+"_customer_requests");
  if(o.reviewed_source_tree!==
     VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_ACCEPTED_ECONOMIC_TREE_V1)
    fail(code+"_source_generation");
  return Object.freeze({...o});
}

function exactResult(value,keys,code){
  return dataObject(value,keys,code+"_shape");
}

export function buildBuyVoidAllocationCustodyRollbackChallengeAuthorizationIdV1(input){
  const a=dataObject(input,AUTH_KEYS.filter(k=>k!=="authorization_id"),"authorization_body_invalid");
  return contentId("voidbuycustodychallengeauth1_",a);
}

export function executeBuyVoidAllocationCustodyRollbackControllerCandidateV1(input){
  const top=dataObject(input,["authorization","capabilities"],"controller_input_invalid");
  const authorization=normalizeAuthorization(top.authorization);
  const caps=dataObject(top.capabilities,CAPABILITY_KEYS,"capability_set_invalid");
  for(const key of CAPABILITY_KEYS) if(typeof caps[key]!=="function")fail("capability_not_function:"+key);

  const entropy=callSync(caps.generate_challenge_entropy,
    Object.freeze({operation_id:authorization.operation_id,plan_id:authorization.plan_id}),
    "entropy");
  if(!Buffer.isBuffer(entropy)||entropy.length!==32)fail("challenge_entropy_invalid");
  const challengeId=contentId("voidbuycustodychallenge1_",{
    plan_id:authorization.plan_id,
    authorization_id:authorization.authorization_id,
    operation_id:authorization.operation_id,
    entropy_sha256:sha256(entropy),
  });

  const before=normalizeObservation(callSync(caps.observe_before,
    Object.freeze({challenge_id:challengeId,operation_id:authorization.operation_id}),
    "observe_before"),"before");

  const append=exactResult(callSync(caps.append_journal_canary,
    Object.freeze({challenge_id:challengeId,operation_id:authorization.operation_id,
      before_journal_sequence:before.journal_sequence,
      before_journal_tip_sha256:before.journal_tip_sha256}),
    "append_journal_canary"),
    ["challenge_id","journal_sequence","journal_tip_sha256","event_sha256"],
    "append_journal");
  if(append.challenge_id!==challengeId)fail("append_challenge_mismatch");
  if(append.journal_sequence!==before.journal_sequence+1)fail("journal_sequence_not_advanced");
  string(append.journal_tip_sha256,SHA,"append_journal_tip_invalid");
  string(append.event_sha256,SHA,"append_event_invalid");

  const high=exactResult(callSync(caps.advance_high_water,
    Object.freeze({challenge_id:challengeId,journal_sequence:append.journal_sequence,
      journal_tip_sha256:append.journal_tip_sha256}),
    "advance_high_water"),
    ["challenge_id","high_water_sequence","high_water_sha256"],
    "advance_high_water");
  if(high.challenge_id!==challengeId)fail("high_water_challenge_mismatch");
  if(!Number.isSafeInteger(high.high_water_sequence)||
     high.high_water_sequence<Math.max(before.high_water_sequence+1,append.journal_sequence))
    fail("high_water_not_advanced");
  string(high.high_water_sha256,SHA,"high_water_sha_invalid");

  const reopened=normalizeObservation(callSync(caps.sync_close_reopen,
    Object.freeze({challenge_id:challengeId,journal_sequence:append.journal_sequence,
      journal_tip_sha256:append.journal_tip_sha256,
      high_water_sequence:high.high_water_sequence,
      high_water_sha256:high.high_water_sha256}),
    "sync_close_reopen"),"reopened");
  if(reopened.journal_sequence!==append.journal_sequence||
     reopened.journal_tip_sha256!==append.journal_tip_sha256||
     reopened.high_water_sequence!==high.high_water_sequence||
     reopened.high_water_sha256!==high.high_water_sha256)
    fail("sync_reopen_durability_mismatch");

  const witness=exactResult(callSync(caps.append_external_witness,
    Object.freeze({challenge_id:challengeId,journal_tip_sha256:append.journal_tip_sha256,
      high_water_sha256:high.high_water_sha256}),
    "append_external_witness"),
    ["challenge_id","external_witness_sequence","external_witness_tip_sha256",
     "source_journal_tip_sha256","source_high_water_sha256"],
    "external_witness");
  if(witness.challenge_id!==challengeId||
     witness.external_witness_sequence!==before.external_witness_sequence+1||
     witness.source_journal_tip_sha256!==append.journal_tip_sha256||
     witness.source_high_water_sha256!==high.high_water_sha256)
    fail("external_witness_binding_invalid");
  string(witness.external_witness_tip_sha256,SHA,"external_witness_tip_invalid");

  const approval=exactResult(callSync(caps.obtain_second_control_approval,
    Object.freeze({challenge_id:challengeId,
      rollback_target_journal_tip_sha256:before.journal_tip_sha256,
      protected_high_water_sha256:high.high_water_sha256}),
    "second_control"),
    ["approved","approval_id","challenge_id","rollback_target_journal_tip_sha256",
     "protected_high_water_sha256"],
    "second_control");
  if(approval.approved!==true||approval.challenge_id!==challengeId||
     approval.rollback_target_journal_tip_sha256!==before.journal_tip_sha256||
     approval.protected_high_water_sha256!==high.high_water_sha256)
    fail("second_control_approval_invalid");
  if(typeof approval.approval_id!=="string"||
     !/^voidbuycustodysecondcontrol1_[0-9a-f]{64}$/u.test(approval.approval_id))
    fail("second_control_approval_id_invalid");

  const rollback=exactResult(callSync(caps.attempt_controlled_journal_rollback,
    Object.freeze({challenge_id:challengeId,approval_id:approval.approval_id,
      journal_target_sha256:before.journal_tip_sha256,
      protected_high_water_sha256:high.high_water_sha256}),
    "controlled_rollback"),
    ["attempted","challenge_id","controller_id","journal_target_sha256",
     "protected_high_water_sha256","high_water_mutated"],
    "controlled_rollback");
  if(rollback.attempted!==true||rollback.challenge_id!==challengeId||
     rollback.controller_id!=="void.replay.journal.rollback.controller.v1"||
     rollback.journal_target_sha256!==before.journal_tip_sha256||
     rollback.protected_high_water_sha256!==high.high_water_sha256||
     rollback.high_water_mutated!==false)
    fail("controlled_rollback_result_invalid");

  const after=normalizeObservation(callSync(caps.observe_after_rollback,
    Object.freeze({challenge_id:challengeId}),"observe_after_rollback"),"after");
  if(after.journal_tip_sha256!==before.journal_tip_sha256||
     after.journal_sequence!==before.journal_sequence)
    fail("journal_rollback_target_not_observed");
  if(after.high_water_sequence<high.high_water_sequence||
     after.high_water_sha256!==high.high_water_sha256)
    fail("protected_high_water_decreased");
  if(after.external_witness_sequence<witness.external_witness_sequence||
     after.external_witness_tip_sha256!==witness.external_witness_tip_sha256)
    fail("external_witness_continuity_lost");

  const stale=exactResult(callSync(caps.attempt_stale_journal_replay,
    Object.freeze({challenge_id:challengeId,stale_journal_tip_sha256:before.journal_tip_sha256,
      protected_high_water_sha256:high.high_water_sha256}),
    "stale_replay"),
    ["attempted","challenge_id","refused","reason"],
    "stale_replay");
  if(stale.attempted!==true||stale.challenge_id!==challengeId||
     stale.refused!==true||stale.reason!=="high_water_ahead_of_journal")
    fail("stale_journal_not_refused");

  const terminal=normalizeObservation(callSync(caps.reobserve_storage_and_policy,
    Object.freeze({challenge_id:challengeId}),"terminal_reobservation"),"terminal");
  for(const key of ["host_id","journal_storage_id","high_water_storage_id",
    "policy_fingerprint_sha256","policy_generation","allocation_ledger_sha256",
    "customer_request_state_sha256","reviewed_source_tree"]){
    if(terminal[key]!==before[key])fail("terminal_binding_drift:"+key);
  }
  if(terminal.high_water_sequence<high.high_water_sequence||
     terminal.high_water_sha256!==high.high_water_sha256)
    fail("terminal_high_water_drift");
  if(terminal.external_witness_sequence<witness.external_witness_sequence||
     terminal.external_witness_tip_sha256!==witness.external_witness_tip_sha256)
    fail("terminal_external_witness_drift");

  const origin=exactResult(callSync(caps.authenticate_evidence_origin,
    Object.freeze({challenge_id:challengeId,operation_id:authorization.operation_id,
      authorization_id:authorization.authorization_id}),
    "evidence_origin"),
    ["authenticated","challenge_id","operation_id","origin_id","evidence_sha256"],
    "evidence_origin");
  if(origin.authenticated!==true||origin.challenge_id!==challengeId||
     origin.operation_id!==authorization.operation_id)
    fail("evidence_origin_not_authenticated");
  string(origin.origin_id,ORIGIN,"evidence_origin_id_invalid");
  string(origin.evidence_sha256,SHA,"evidence_origin_sha_invalid");

  return Object.freeze({
    marker:VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_CANDIDATE_V1,
    version:1,
    status:"controller_candidate_sequence_green_host_adapter_required",
    plan_id:authorization.plan_id,
    authorization_id:authorization.authorization_id,
    operation_id:authorization.operation_id,
    challenge_id:challengeId,
    controller_id:"void.replay.journal.rollback.controller.v1",
    non_customer_canary_verified:true,
    operation_bound_authorization_verified:true,
    reviewed_source_generation_bound:true,
    exact_current_policy_bound:true,
    challenge_entropy_generated:true,
    journal_append_sequenced:true,
    high_water_advance_sequenced:true,
    sync_close_reopen_sequenced:true,
    external_witness_continuity_sequenced:true,
    second_control_approval_sequenced:true,
    controlled_journal_rollback_sequenced:true,
    protected_high_water_non_decrease_verified:true,
    stale_journal_refusal_verified:true,
    storage_policy_reobservation_verified:true,
    allocation_ledger_unchanged_verified:true,
    customer_request_state_unchanged_verified:true,
    evidence_origin_authenticated:true,
    live_durable_storage_proven:false,
    rollback_resistance_proven:false,
    protected_high_water_custody_proven:false,
    independent_custody_proven:false,
    production_gate_ready:false,
    protected_host_adapter_required:true,
    host_execution_authorized:false,
    filesystem_read_authorized:false,
    filesystem_write_authorized:false,
    storage_mutation_authorized:false,
    rollback_test_authorized:false,
    service_mutation_authorized:false,
    credential_access_authorized:false,
    wallet_or_signer_access_authorized:false,
    signing_authorized:false,
    transaction_submission_authorized:false,
    payment_acceptance_authorized:false,
    public_presale_activation_authorized:false,
    wc_void_market_activation_authorized:false,
    treasury_or_liquidity_action_authorized:false,
    funds_movement:false,
    production_host_evidence_authority:false,
    next_gate:"BUILD_PROTECTED_HOST_CUSTODY_ROLLBACK_CONTROLLER_ADAPTER_V1",
  });
}
