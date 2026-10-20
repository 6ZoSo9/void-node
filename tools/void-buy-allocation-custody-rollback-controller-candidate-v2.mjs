// V2 content-namespace controller candidate: injected synchronous capabilities
// only; no host adapter, storage mutation, payment or rollback authorization.
// The V1 controller and its authorization domain remain intact and distinct.
import crypto from "node:crypto";
import { types as utilTypes } from "node:util";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_CANDIDATE_V2 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_CANDIDATE_V2";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_PLAN_ID_V2 =
  "voidbuycustodychallengeplan2_622c5cab506b8424860a484e6675f73031a26635c0ef29a80aee2281f53f0844";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_ACCEPTED_ECONOMIC_TREE_V2 =
  "71c67e62a2b21a98f3f5135ee6aa56e0ef97d262";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_AUTHORITY_V2 =
  Object.freeze({
    source_only_candidate: true,
    injected_capabilities_required: true,
    protected_host_adapter_required: true,
    authorization_one_time_claim_required: true,
    authorization_claim_post_rollback_revalidation_required: true,
    operation_wide_exclusive_lease_required: true,
    operation_lease_terminal_revalidation_required: true,
    evidence_transcript_digest_binding_required: true,
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
    operation_lease_authenticated: false,
    operation_lease_exclusivity_proven: false,
    production_host_evidence_authority: false,
  });

const AUTH_MARKER="VOID_BUY_VOID_CUSTODY_ROLLBACK_CHALLENGE_AUTHORIZATION_V2";
const CANARY_DOMAIN="void.buyvoid.presale.noncustomer.canary.v1";
const OP_ID=/^voidbuycustodychallengeop2_[0-9a-f]{64}$/u;
const AUTH_ID=/^voidbuycustodychallengeauth2_[0-9a-f]{64}$/u;
const CLAIM_ID=/^voidbuycustodychallengeclaim2_[0-9a-f]{64}$/u;
const LEASE_ID=/^voidbuycustodyoperationlease2_[0-9a-f]{64}$/u;
const SHA=/^sha256:[0-9a-f]{64}$/u;
const HEX40=/^[0-9a-f]{40}$/u;
const ORIGIN=/^voidbuycustodychallengeorigin2_[0-9a-f]{64}$/u;
const STORAGE=/^storage:[A-Za-z0-9._:-]{1,96}$/u;
const MAX_SAFE=Number.MAX_SAFE_INTEGER;
const U64_MAX=18446744073709551615n;

const CAPABILITY_KEYS=Object.freeze([
  "generate_challenge_entropy",
  "acquire_operation_lease",
  "observe_before",
  "claim_operation_authorization_once",
  "append_journal_canary",
  "advance_high_water",
  "sync_close_reopen",
  "append_external_witness",
  "obtain_second_control_approval",
  "attempt_controlled_journal_rollback",
  "observe_after_rollback",
  "attempt_stale_journal_replay",
  "reobserve_storage_and_policy",
  "revalidate_operation_authorization_claim",
  "revalidate_operation_lease",
  "authenticate_evidence_origin",
]);

const AUTH_KEYS=Object.freeze([
  "marker","version","authorization_id","plan_id","operation_id",
  "non_customer_canary","canary_domain_id","allocation_ledger_unchanged_required",
  "customer_request_state_unchanged_required","reviewed_source_tree",
  "exact_current_policy_bound","expected_policy_fingerprint_sha256",
  "expected_policy_generation",
]);

const STABLE_CONTEXT_KEYS=Object.freeze([
  "operation_lease_id",
  "host_id",
  "journal_storage_id",
  "high_water_storage_id",
  "policy_fingerprint_sha256",
  "policy_generation",
  "allocation_ledger_sha256",
  "customer_request_state_sha256",
  "reviewed_source_tree",
]);

function fail(code){ throw new Error(code); }

function dataObject(value,keys,code){
  if(!value||typeof value!=="object"||utilTypes.isProxy(value)||Array.isArray(value))fail(code);
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
function policyGeneration(v,code){
  if(typeof v!=="string"||!/^[1-9][0-9]{0,19}$/u.test(v))fail(code);
  let parsed;
  try{ parsed=BigInt(v); }catch{ fail(code); }
  if(parsed<1n||parsed>U64_MAX)fail(code);
  return v;
}
function string(v,re,code){
  if(typeof v!=="string"||!re.test(v))fail(code);
  return v;
}
function preflightCapability(fn,key){
  if(typeof fn!=="function")fail("capability_not_function:"+key);
  if(utilTypes.isProxy(fn))fail("capability_proxy_forbidden:"+key);
  if(utilTypes.isAsyncFunction(fn))fail("capability_async_forbidden:"+key);
  if(utilTypes.isGeneratorFunction(fn))fail("capability_generator_forbidden:"+key);
  let source;
  try{ source=Function.prototype.toString.call(fn); }
  catch{ fail("capability_source_unavailable:"+key); }
  if(source.includes("[native code]"))fail("capability_native_or_bound_forbidden:"+key);
}
function rejectAsyncResult(value,code){
  if(value===null||(typeof value!=="object"&&typeof value!=="function"))return;
  if(utilTypes.isProxy(value))fail(code+"_proxy_result_forbidden");
  if(utilTypes.isPromise(value))fail(code+"_async_forbidden");
  let current=value;
  while(current!==null){
    if(utilTypes.isProxy(current))fail(code+"_proxy_result_forbidden");
    const descriptor=Object.getOwnPropertyDescriptor(current,"then");
    if(descriptor){
      if(!("value" in descriptor)||descriptor.get||descriptor.set)
        fail(code+"_then_accessor_forbidden");
      if(typeof descriptor.value==="function")fail(code+"_async_forbidden");
      break;
    }
    current=Object.getPrototypeOf(current);
  }
}
function callSync(fn,args,code){
  preflightCapability(fn,code);
  let out;
  try{ out=fn(args); }catch(e){ fail(code+"_failed:"+String(e?.message||e||"error")); }
  rejectAsyncResult(out,code);
  return out;
}

function normalizeAuthorization(value){
  const a=dataObject(value,AUTH_KEYS,"authorization_shape_invalid");
  if(a.marker!==AUTH_MARKER||a.version!==2)fail("authorization_marker_invalid");
  if(a.plan_id!==VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_PLAN_ID_V2)
    fail("authorization_plan_invalid");
  string(a.operation_id,OP_ID,"authorization_operation_id_invalid");
  if(a.non_customer_canary!==true||a.canary_domain_id!==CANARY_DOMAIN||
     a.allocation_ledger_unchanged_required!==true||
     a.customer_request_state_unchanged_required!==true||
     a.exact_current_policy_bound!==true)fail("authorization_scope_invalid");
  if(a.reviewed_source_tree!==
     VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_ACCEPTED_ECONOMIC_TREE_V2)
    fail("authorization_source_generation_invalid");
  string(
    a.expected_policy_fingerprint_sha256,
    SHA,
    "authorization_policy_fingerprint_invalid",
  );
  policyGeneration(
    a.expected_policy_generation,
    "authorization_policy_generation_invalid",
  );
  string(a.authorization_id,AUTH_ID,"authorization_id_invalid");
  const body={...a}; delete body.authorization_id;
  if(a.authorization_id!==contentId("voidbuycustodychallengeauth2_",body))
    fail("authorization_id_mismatch");
  return Object.freeze({...a});
}

function normalizeObservation(value,code){
  const keys=[
    "operation_lease_id","host_id","journal_sequence","journal_tip_sha256","high_water_sequence",
    "high_water_sha256","external_witness_sequence","external_witness_tip_sha256",
    "journal_storage_id","high_water_storage_id","policy_fingerprint_sha256",
    "policy_generation","allocation_ledger_sha256","customer_request_state_sha256",
    "reviewed_source_tree",
  ];
  const o=dataObject(value,keys,code+"_shape");
  string(o.operation_lease_id,LEASE_ID,code+"_operation_lease_id");
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
  policyGeneration(o.policy_generation,code+"_policy_generation");
  string(o.allocation_ledger_sha256,SHA,code+"_allocation_ledger");
  string(o.customer_request_state_sha256,SHA,code+"_customer_requests");
  if(o.reviewed_source_tree!==
     VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_ACCEPTED_ECONOMIC_TREE_V2)
    fail(code+"_source_generation");
  return Object.freeze({...o});
}

function exactResult(value,keys,code){
  return dataObject(value,keys,code+"_shape");
}

function assertStableContext(reference,observed,code){
  for(const key of STABLE_CONTEXT_KEYS){
    if(observed[key]!==reference[key])fail(code+":"+key);
  }
}

export function buildBuyVoidAllocationCustodyRollbackChallengeAuthorizationIdV2(input){
  const a=dataObject(input,AUTH_KEYS.filter(k=>k!=="authorization_id"),"authorization_body_invalid");
  return contentId("voidbuycustodychallengeauth2_",a);
}

export function executeBuyVoidAllocationCustodyRollbackControllerCandidateV2(input){
  const top=dataObject(input,["authorization","capabilities"],"controller_input_invalid");
  const authorization=normalizeAuthorization(top.authorization);
  const caps=dataObject(top.capabilities,CAPABILITY_KEYS,"capability_set_invalid");
  for(const key of CAPABILITY_KEYS) preflightCapability(caps[key],key);

  const entropy=callSync(caps.generate_challenge_entropy,
    Object.freeze({operation_id:authorization.operation_id,plan_id:authorization.plan_id}),
    "entropy");
  if(!Buffer.isBuffer(entropy)||entropy.length!==32)fail("challenge_entropy_invalid");
  const challengeId=contentId("voidbuycustodychallenge2_",{
    plan_id:authorization.plan_id,
    authorization_id:authorization.authorization_id,
    operation_id:authorization.operation_id,
    entropy_sha256:sha256(entropy),
  });

  const lease=exactResult(callSync(caps.acquire_operation_lease,
    Object.freeze({
      authorization_id:authorization.authorization_id,
      operation_id:authorization.operation_id,
      challenge_id:challengeId,
      plan_id:authorization.plan_id,
      expected_policy_fingerprint_sha256:authorization.expected_policy_fingerprint_sha256,
      expected_policy_generation:authorization.expected_policy_generation,
      reviewed_source_tree:authorization.reviewed_source_tree,
      // A protected lease adapter MUST check the durable prior-claim store
      // atomically with lease creation. A read-only precheck alone races.
      reject_previously_claimed_authorization:true,
    }),
    "operation_lease"),
    ["acquired","exclusive","authorization_id","operation_id","challenge_id","lease_id",
     "authorization_previously_claimed"],
    "operation_lease");
  // A replay cannot be allowed to reach observe_before or the later claim
  // callback. The source candidate cannot authenticate this callback: only a
  // future reviewed protected adapter can prove atomic no-write refusal.
  if(lease.authorization_previously_claimed!==false)
    fail("operation_lease_replay_precondition_failed");
  if(lease.acquired!==true||lease.exclusive!==true||
     lease.authorization_id!==authorization.authorization_id||
     lease.operation_id!==authorization.operation_id||
     lease.challenge_id!==challengeId)
    fail("operation_lease_acquisition_failed");
  string(lease.lease_id,LEASE_ID,"operation_lease_id_invalid");

  const before=normalizeObservation(callSync(caps.observe_before,
    Object.freeze({challenge_id:challengeId,operation_id:authorization.operation_id,
      operation_lease_id:lease.lease_id}),
    "observe_before"),"before");
  if(before.operation_lease_id!==lease.lease_id)fail("before_operation_lease_mismatch");
  if(
    before.policy_fingerprint_sha256!==authorization.expected_policy_fingerprint_sha256||
    before.policy_generation!==authorization.expected_policy_generation
  )fail("authorization_policy_observation_mismatch");
  if(before.journal_sequence>=MAX_SAFE)fail("journal_sequence_headroom_exhausted");
  if(before.high_water_sequence>=MAX_SAFE)fail("high_water_sequence_headroom_exhausted");
  if(before.external_witness_sequence>=MAX_SAFE)
    fail("external_witness_sequence_headroom_exhausted");

  const claim=exactResult(callSync(caps.claim_operation_authorization_once,
    Object.freeze({
      authorization_id:authorization.authorization_id,
      operation_id:authorization.operation_id,
      challenge_id:challengeId,
      plan_id:authorization.plan_id,
      expected_policy_fingerprint_sha256:authorization.expected_policy_fingerprint_sha256,
      expected_policy_generation:authorization.expected_policy_generation,
      reviewed_source_tree:authorization.reviewed_source_tree,
      operation_lease_id:lease.lease_id,
    }),
    "authorization_claim"),
    ["claimed","already_claimed","authorization_id","operation_id","challenge_id","claim_id","operation_lease_id"],
    "authorization_claim");
  if(claim.claimed!==true||claim.already_claimed!==false||
     claim.authorization_id!==authorization.authorization_id||
     claim.operation_id!==authorization.operation_id||
     claim.challenge_id!==challengeId||
     claim.operation_lease_id!==lease.lease_id)
    fail("authorization_replay_or_claim_failed");
  string(claim.claim_id,CLAIM_ID,"authorization_claim_id_invalid");

  const append=exactResult(callSync(caps.append_journal_canary,
    Object.freeze({challenge_id:challengeId,operation_id:authorization.operation_id,
      canary_domain_id:authorization.canary_domain_id,
      before_journal_sequence:before.journal_sequence,
      before_journal_tip_sha256:before.journal_tip_sha256,
      operation_lease_id:lease.lease_id}),
    "append_journal_canary"),
    ["challenge_id","canary_domain_id","journal_sequence","journal_tip_sha256","event_sha256","operation_lease_id"],
    "append_journal");
  if(
    append.challenge_id!==challengeId||
    append.canary_domain_id!==authorization.canary_domain_id||
    append.operation_lease_id!==lease.lease_id
  )fail("append_challenge_mismatch");
  safeInt(append.journal_sequence,"append_journal_sequence_invalid",0);
  if(append.journal_sequence!==before.journal_sequence+1)fail("journal_sequence_not_advanced");
  string(append.journal_tip_sha256,SHA,"append_journal_tip_invalid");
  if(append.journal_tip_sha256===before.journal_tip_sha256)
    fail("journal_append_tip_not_advanced");
  string(append.event_sha256,SHA,"append_event_invalid");

  const high=exactResult(callSync(caps.advance_high_water,
    Object.freeze({challenge_id:challengeId,journal_sequence:append.journal_sequence,
      journal_tip_sha256:append.journal_tip_sha256,
      operation_lease_id:lease.lease_id}),
    "advance_high_water"),
    ["challenge_id","high_water_sequence","high_water_sha256","operation_lease_id"],
    "advance_high_water");
  if(high.challenge_id!==challengeId||high.operation_lease_id!==lease.lease_id)
    fail("high_water_challenge_mismatch");
  if(!Number.isSafeInteger(high.high_water_sequence)||
     high.high_water_sequence<Math.max(before.high_water_sequence+1,append.journal_sequence))
    fail("high_water_not_advanced");
  string(high.high_water_sha256,SHA,"high_water_sha_invalid");
  if(high.high_water_sha256===before.high_water_sha256)
    fail("high_water_tip_not_advanced");

  const reopened=normalizeObservation(callSync(caps.sync_close_reopen,
    Object.freeze({challenge_id:challengeId,journal_sequence:append.journal_sequence,
      journal_tip_sha256:append.journal_tip_sha256,
      high_water_sequence:high.high_water_sequence,
      high_water_sha256:high.high_water_sha256,
      operation_lease_id:lease.lease_id}),
    "sync_close_reopen"),"reopened");
  if(reopened.operation_lease_id!==lease.lease_id)fail("sync_reopen_operation_lease_mismatch");
  if(reopened.journal_sequence!==append.journal_sequence||
     reopened.journal_tip_sha256!==append.journal_tip_sha256||
     reopened.high_water_sequence!==high.high_water_sequence||
     reopened.high_water_sha256!==high.high_water_sha256)
    fail("sync_reopen_durability_mismatch");
  assertStableContext(before,reopened,"sync_reopen_binding_drift");
  if(
    reopened.external_witness_sequence!==before.external_witness_sequence||
    reopened.external_witness_tip_sha256!==before.external_witness_tip_sha256
  )fail("sync_reopen_external_witness_drift");

  const witness=exactResult(callSync(caps.append_external_witness,
    Object.freeze({challenge_id:challengeId,journal_tip_sha256:append.journal_tip_sha256,
      high_water_sha256:high.high_water_sha256,operation_lease_id:lease.lease_id}),
    "append_external_witness"),
    ["challenge_id","external_witness_sequence","external_witness_tip_sha256",
     "source_journal_tip_sha256","source_high_water_sha256","operation_lease_id"],
    "external_witness");
  safeInt(witness.external_witness_sequence,"external_witness_sequence_invalid",0);
  if(witness.challenge_id!==challengeId||witness.operation_lease_id!==lease.lease_id||
     witness.external_witness_sequence!==before.external_witness_sequence+1||
     witness.source_journal_tip_sha256!==append.journal_tip_sha256||
     witness.source_high_water_sha256!==high.high_water_sha256)
    fail("external_witness_binding_invalid");
  string(witness.external_witness_tip_sha256,SHA,"external_witness_tip_invalid");
  if(witness.external_witness_tip_sha256===before.external_witness_tip_sha256)
    fail("external_witness_tip_not_advanced");

  const approval=exactResult(callSync(caps.obtain_second_control_approval,
    Object.freeze({challenge_id:challengeId,
      rollback_target_journal_tip_sha256:before.journal_tip_sha256,
      protected_high_water_sha256:high.high_water_sha256,
      operation_lease_id:lease.lease_id}),
    "second_control"),
    ["approved","approval_id","challenge_id","rollback_target_journal_tip_sha256",
     "protected_high_water_sha256","operation_lease_id"],
    "second_control");
  if(approval.approved!==true||approval.challenge_id!==challengeId||
     approval.operation_lease_id!==lease.lease_id||
     approval.rollback_target_journal_tip_sha256!==before.journal_tip_sha256||
     approval.protected_high_water_sha256!==high.high_water_sha256)
    fail("second_control_approval_invalid");
  if(typeof approval.approval_id!=="string"||
     !/^voidbuycustodysecondcontrol2_[0-9a-f]{64}$/u.test(approval.approval_id))
    fail("second_control_approval_id_invalid");

  const rollback=exactResult(callSync(caps.attempt_controlled_journal_rollback,
    Object.freeze({challenge_id:challengeId,approval_id:approval.approval_id,
      journal_target_sha256:before.journal_tip_sha256,
      protected_high_water_sha256:high.high_water_sha256,
      authorization_claim_id:claim.claim_id,
      operation_lease_id:lease.lease_id}),
    "controlled_rollback"),
    ["attempted","challenge_id","controller_id","journal_target_sha256",
     "protected_high_water_sha256","high_water_mutated","authorization_claim_mutated","operation_lease_id"],
    "controlled_rollback");
  if(rollback.attempted!==true||rollback.challenge_id!==challengeId||
     rollback.operation_lease_id!==lease.lease_id||
     rollback.controller_id!=="void.replay.journal.rollback.controller.v2"||
     rollback.journal_target_sha256!==before.journal_tip_sha256||
     rollback.protected_high_water_sha256!==high.high_water_sha256||
     rollback.high_water_mutated!==false||
     rollback.authorization_claim_mutated!==false)
    fail("controlled_rollback_result_invalid");

  const after=normalizeObservation(callSync(caps.observe_after_rollback,
    Object.freeze({challenge_id:challengeId,operation_lease_id:lease.lease_id}),
    "observe_after_rollback"),"after");
  if(after.operation_lease_id!==lease.lease_id)fail("post_rollback_operation_lease_mismatch");
  if(after.journal_tip_sha256!==before.journal_tip_sha256||
     after.journal_sequence!==before.journal_sequence)
    fail("journal_rollback_target_not_observed");
  if(after.high_water_sequence<high.high_water_sequence||
     after.high_water_sha256!==high.high_water_sha256)
    fail("protected_high_water_decreased");
  if(after.high_water_sequence!==high.high_water_sequence)
    fail("post_rollback_high_water_unproven_advance");
  if(after.external_witness_sequence<witness.external_witness_sequence||
     after.external_witness_tip_sha256!==witness.external_witness_tip_sha256)
    fail("external_witness_continuity_lost");
  if(after.external_witness_sequence!==witness.external_witness_sequence)
    fail("post_rollback_witness_unproven_advance");
  assertStableContext(before,after,"post_rollback_binding_drift");

  const stale=exactResult(callSync(caps.attempt_stale_journal_replay,
    Object.freeze({challenge_id:challengeId,stale_journal_tip_sha256:before.journal_tip_sha256,
      protected_high_water_sha256:high.high_water_sha256,
      operation_lease_id:lease.lease_id}),
    "stale_replay"),
    ["attempted","challenge_id","refused","reason","operation_lease_id"],
    "stale_replay");
  if(stale.attempted!==true||stale.challenge_id!==challengeId||
     stale.operation_lease_id!==lease.lease_id||
     stale.refused!==true||stale.reason!=="high_water_ahead_of_journal")
    fail("stale_journal_not_refused");

  const terminal=normalizeObservation(callSync(caps.reobserve_storage_and_policy,
    Object.freeze({challenge_id:challengeId,operation_lease_id:lease.lease_id}),
    "terminal_reobservation"),"terminal");
  if(terminal.operation_lease_id!==lease.lease_id)fail("terminal_operation_lease_mismatch");
  assertStableContext(before,terminal,"terminal_binding_drift");
  if(
    terminal.journal_sequence!==before.journal_sequence||
    terminal.journal_tip_sha256!==before.journal_tip_sha256
  )fail("terminal_journal_drift");
  if(terminal.high_water_sequence<high.high_water_sequence||
     terminal.high_water_sha256!==high.high_water_sha256)
    fail("terminal_high_water_drift");
  if(terminal.high_water_sequence!==high.high_water_sequence)
    fail("terminal_high_water_unproven_advance");
  if(terminal.external_witness_sequence<witness.external_witness_sequence||
     terminal.external_witness_tip_sha256!==witness.external_witness_tip_sha256)
    fail("terminal_external_witness_drift");
  if(terminal.external_witness_sequence!==witness.external_witness_sequence)
    fail("terminal_witness_unproven_advance");

  const claimAfter=exactResult(callSync(caps.revalidate_operation_authorization_claim,
    Object.freeze({
      authorization_id:authorization.authorization_id,
      operation_id:authorization.operation_id,
      challenge_id:challengeId,
      claim_id:claim.claim_id,
      operation_lease_id:lease.lease_id,
    }),
    "authorization_claim_revalidation"),
    ["present","authorization_id","operation_id","challenge_id","claim_id","operation_lease_id"],
    "authorization_claim_revalidation");
  if(claimAfter.present!==true||
     claimAfter.authorization_id!==authorization.authorization_id||
     claimAfter.operation_id!==authorization.operation_id||
     claimAfter.challenge_id!==challengeId||
     claimAfter.claim_id!==claim.claim_id||
     claimAfter.operation_lease_id!==lease.lease_id)
    fail("authorization_claim_not_persistent");

  const leaseAfter=exactResult(callSync(caps.revalidate_operation_lease,
    Object.freeze({
      authorization_id:authorization.authorization_id,
      operation_id:authorization.operation_id,
      challenge_id:challengeId,
      lease_id:lease.lease_id,
    }),
    "operation_lease_revalidation"),
    ["present","exclusive","authorization_id","operation_id","challenge_id","lease_id"],
    "operation_lease_revalidation");
  if(leaseAfter.present!==true||leaseAfter.exclusive!==true||
     leaseAfter.authorization_id!==authorization.authorization_id||
     leaseAfter.operation_id!==authorization.operation_id||
     leaseAfter.challenge_id!==challengeId||
     leaseAfter.lease_id!==lease.lease_id)
    fail("operation_lease_not_persistent");

  const evidenceTranscript=Object.freeze({
    marker:"VOID_BUY_VOID_CUSTODY_ROLLBACK_CHALLENGE_EVIDENCE_TRANSCRIPT_V2",
    version:2,
    authorization,
    challenge_id:challengeId,
    authorization_claim_id:claim.claim_id,
    operation_lease_id:lease.lease_id,
    operation_lease:lease,
    before,
    authorization_claim:claim,
    journal_append:append,
    high_water:high,
    durability_reopen:reopened,
    external_witness:witness,
    second_control_approval:approval,
    controlled_rollback:rollback,
    post_rollback:after,
    stale_replay:stale,
    terminal_reobservation:terminal,
    authorization_claim_revalidation:claimAfter,
    operation_lease_revalidation:leaseAfter,
  });
  const controllerEvidenceSha256=sha256(canonical(evidenceTranscript));

  const origin=exactResult(callSync(caps.authenticate_evidence_origin,
    Object.freeze({challenge_id:challengeId,operation_id:authorization.operation_id,
      authorization_id:authorization.authorization_id,
      authorization_claim_id:claim.claim_id,
      operation_lease_id:lease.lease_id,
      evidence_sha256:controllerEvidenceSha256}),
    "evidence_origin"),
    ["authenticated","challenge_id","operation_id","authorization_claim_id","operation_lease_id","origin_id","evidence_sha256"],
    "evidence_origin");
  if(origin.authenticated!==true||origin.challenge_id!==challengeId||
     origin.operation_id!==authorization.operation_id||
     origin.authorization_claim_id!==claim.claim_id||
     origin.operation_lease_id!==lease.lease_id)
    fail("evidence_origin_not_authenticated");
  string(origin.origin_id,ORIGIN,"evidence_origin_id_invalid");
  string(origin.evidence_sha256,SHA,"evidence_origin_sha_invalid");
  if(origin.evidence_sha256!==controllerEvidenceSha256)
    fail("evidence_origin_digest_mismatch");

  return Object.freeze({
    marker:VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_CANDIDATE_V2,
    version:2,
    status:"controller_candidate_sequence_green_host_adapter_required",
    plan_id:authorization.plan_id,
    authorization_id:authorization.authorization_id,
    operation_id:authorization.operation_id,
    challenge_id:challengeId,
    authorization_claim_id:claim.claim_id,
    operation_lease_id:lease.lease_id,
    controller_id:"void.replay.journal.rollback.controller.v2",
    authorization_record_validated:true,
    authorization_claim_contract_validated:true,
    authorization_claim_one_time_required:true,
    authorization_replay_rejection_contract_validated:true,
    authorization_claim_post_rollback_revalidated:true,
    authorization_claim_rollback_mutation_forbidden:true,
    authorization_claim_authenticated:false,
    operation_wide_exclusive_lease_required:true,
    operation_lease_contract_validated:true,
    operation_lease_terminal_revalidated:true,
    operation_lease_bound_to_evidence_origin:true,
    operation_lease_authenticated:false,
    operation_lease_exclusivity_proven:false,
    operation_bound_authorization_authenticated:false,
    non_customer_canary_domain_bound:true,
    non_customer_canary_isolation_proven:false,
    reviewed_source_generation_requirement_bound:true,
    exact_current_policy_requirement_bound:true,
    expected_policy_record_matched:true,
    exact_current_policy_authenticated:false,
    challenge_entropy_capability_invoked:true,
    challenge_unpredictability_proven:false,
    journal_append_sequence_contract_validated:true,
    high_water_advance_sequence_contract_validated:true,
    sync_close_reopen_contract_validated:true,
    external_witness_continuity_contract_validated:true,
    second_control_approval_contract_validated:true,
    controlled_journal_rollback_contract_validated:true,
    protected_high_water_non_decrease_contract_validated:true,
    stale_journal_refusal_contract_validated:true,
    terminal_journal_predecessor_revalidated:true,
    storage_policy_reobservation_contract_validated:true,
    allocation_ledger_unchanged_contract_validated:true,
    customer_request_state_unchanged_contract_validated:true,
    controller_evidence_sha256:controllerEvidenceSha256,
    evidence_transcript_digest_binding_required:true,
    evidence_origin_digest_matches_controller_transcript:true,
    evidence_origin_capability_report_validated:true,
    authorization_claim_bound_to_evidence_origin:true,
    evidence_origin_authenticated:false,
    injected_capabilities_authenticated:false,
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
    next_gate:"DISTINCT_REVIEW_V2_PLAN_AND_CONTROLLER_V2_THEN_PROTECTED_ADAPTER",
  });
}
