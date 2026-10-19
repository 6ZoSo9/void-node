import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_CANDIDATE_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_PLAN_ID_V1,
  buildBuyVoidAllocationCustodyRollbackChallengeAuthorizationIdV1,
  executeBuyVoidAllocationCustodyRollbackControllerCandidateV1,
} from "../tools/void-buy-allocation-custody-rollback-controller-candidate-v1.mjs";

const ROOT=new URL("../",import.meta.url);
const SOURCE_REL="tools/void-buy-allocation-custody-rollback-controller-candidate-v1.mjs";
const SOURCE_BLOB="0a390288fcfc9f37e6b05958759fc3599fdf1ba3";
const PLAN_REL="ops/security/buy-void-presale-custody-durability-rollback-challenge-plan-v1.json";
const PLAN_BLOB="5face2022dc2cbc573e32e99f88623f381a8a174";
const CONTRACT_REL="tools/void-buy-allocation-custody-live-durability-rollback-contract-v1.mjs";
const CONTRACT_BLOB="eef7c4e1db7401ba82fda96aa1e8da40c1981b7d";

function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes).digest("hex");
}
function pin(relative,expected){
  const bytes=fs.readFileSync(new URL(relative,ROOT));
  assert.equal(gitBlob(bytes),expected,relative);
  return bytes;
}
pin(SOURCE_REL,SOURCE_BLOB);
const plan=JSON.parse(pin(PLAN_REL,PLAN_BLOB).toString("utf8"));
pin(CONTRACT_REL,CONTRACT_BLOB);
assert.equal(plan.plan_id,VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_PLAN_ID_V1);
assert.equal(plan.plan_id,"voidbuycustodychallengeplan1_dd868e3fb6ebdbf894c1170d0ecc153d61e198d9c20279a05c3309957add9006");
assert.equal(Object.keys(plan.durability_contract.required_future_evidence).length,20);
assert.equal(plan.durability_contract.required_future_evidence.reviewed_rollback_controller_required,true);
for(const value of Object.values(plan.authority)) assert.equal(value,false);

for(const [key,value] of Object.entries(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_AUTHORITY_V1
)){
  if(key==="source_only_candidate"||key==="injected_capabilities_required"||
     key==="protected_host_adapter_required"||
     key==="authorization_one_time_claim_required") assert.equal(value,true,key);
  else assert.equal(value,false,key);
}

const source=pin(SOURCE_REL,SOURCE_BLOB).toString("utf8");
for(const forbidden of [
  'from "node:fs"','from "node:child_process"','from "node:net"',
  'from "node:http"','from "node:https"','/var/lib/','/opt/','/proc/',
  'spawn(','spawnSync(','execFile(','systemctl','sudo ',
]){
  assert.equal(source.includes(forbidden),false,forbidden);
}

const sha=(x)=>"sha256:"+crypto.createHash("sha256").update(String(x)).digest("hex");
const storage=(x)=>"storage:"+x;
const op="voidbuycustodychallengeop1_"+"1".repeat(64);
const authBody={
  marker:"VOID_BUY_VOID_CUSTODY_ROLLBACK_CHALLENGE_AUTHORIZATION_V1",
  version:1,
  plan_id:"voidbuycustodychallengeplan1_dd868e3fb6ebdbf894c1170d0ecc153d61e198d9c20279a05c3309957add9006",
  operation_id:op,
  non_customer_canary:true,
  canary_domain_id:"void.buyvoid.presale.noncustomer.canary.v1",
  allocation_ledger_unchanged_required:true,
  customer_request_state_unchanged_required:true,
  reviewed_source_tree:"71c67e62a2b21a98f3f5135ee6aa56e0ef97d262",
  exact_current_policy_bound:true,
  expected_policy_fingerprint_sha256:sha("policy"),
  expected_policy_generation:"9",
};
const authorization={
  ...authBody,
  authorization_id:buildBuyVoidAllocationCustodyRollbackChallengeAuthorizationIdV1(authBody),
};

function makeHarness(mutator=()=>{},authorizationClaims=new Set()){
  const order=[];
  const before={
    host_id:"precision-fixture",
    journal_sequence:7,
    journal_tip_sha256:sha("journal-before"),
    high_water_sequence:7,
    high_water_sha256:sha("high-before"),
    external_witness_sequence:11,
    external_witness_tip_sha256:sha("witness-before"),
    journal_storage_id:storage("journal-disk-A"),
    high_water_storage_id:storage("high-water-disk-B"),
    policy_fingerprint_sha256:sha("policy"),
    policy_generation:"9",
    allocation_ledger_sha256:sha("ledger"),
    customer_request_state_sha256:sha("requests"),
    reviewed_source_tree:"71c67e62a2b21a98f3f5135ee6aa56e0ef97d262",
  };
  let challenge="";
  const state={before};
  const caps={
    generate_challenge_entropy(){order.push("entropy");return Buffer.alloc(32,0x5a);},
    observe_before({challenge_id}){order.push("before");challenge=challenge_id;return before;},
    claim_operation_authorization_once({authorization_id,operation_id,challenge_id}){
      order.push("claim");
      const already=authorizationClaims.has(authorization_id);
      if(!already) authorizationClaims.add(authorization_id);
      state.claim={
        claimed:!already,
        already_claimed:already,
        authorization_id,
        operation_id,
        challenge_id,
        claim_id:"voidbuycustodychallengeclaim1_"+"4".repeat(64),
      };
      return state.claim;
    },
    append_journal_canary({challenge_id,canary_domain_id}){
      order.push("append");
      assert.equal(challenge_id,challenge);
      assert.equal(canary_domain_id,"void.buyvoid.presale.noncustomer.canary.v1");
      state.append={
        challenge_id,
        canary_domain_id,
        journal_sequence:8,
        journal_tip_sha256:sha("journal-canary"),
        event_sha256:sha("event"),
      };
      return state.append;
    },
    advance_high_water({challenge_id}){
      order.push("high");
      state.high={challenge_id,high_water_sequence:8,high_water_sha256:sha("high-after")};
      return state.high;
    },
    sync_close_reopen(){order.push("reopen");return {...before,
      journal_sequence:8,journal_tip_sha256:state.append.journal_tip_sha256,
      high_water_sequence:8,high_water_sha256:state.high.high_water_sha256};},
    append_external_witness({challenge_id}){
      order.push("witness");
      state.witness={challenge_id,external_witness_sequence:12,
        external_witness_tip_sha256:sha("witness-after"),
        source_journal_tip_sha256:state.append.journal_tip_sha256,
        source_high_water_sha256:state.high.high_water_sha256};
      return state.witness;
    },
    obtain_second_control_approval({challenge_id}){
      order.push("second");
      return {approved:true,approval_id:"voidbuycustodysecondcontrol1_"+"2".repeat(64),
        challenge_id,rollback_target_journal_tip_sha256:before.journal_tip_sha256,
        protected_high_water_sha256:state.high.high_water_sha256};
    },
    attempt_controlled_journal_rollback({challenge_id}){
      order.push("rollback");
      return {attempted:true,challenge_id,controller_id:"void.replay.journal.rollback.controller.v1",
        journal_target_sha256:before.journal_tip_sha256,
        protected_high_water_sha256:state.high.high_water_sha256,high_water_mutated:false};
    },
    observe_after_rollback(){order.push("after");return {...before,
      high_water_sequence:8,high_water_sha256:state.high.high_water_sha256,
      external_witness_sequence:12,external_witness_tip_sha256:state.witness.external_witness_tip_sha256};},
    attempt_stale_journal_replay({challenge_id}){order.push("stale");
      return {attempted:true,challenge_id,refused:true,reason:"high_water_ahead_of_journal"};},
    reobserve_storage_and_policy(){order.push("terminal");return {...before,
      high_water_sequence:8,high_water_sha256:state.high.high_water_sha256,
      external_witness_sequence:12,external_witness_tip_sha256:state.witness.external_witness_tip_sha256};},
    authenticate_evidence_origin({challenge_id,operation_id,authorization_claim_id}){order.push("origin");
      assert.equal(authorization_claim_id,state.claim.claim_id);
      return {authenticated:true,challenge_id,operation_id,authorization_claim_id,
        origin_id:"voidbuycustodychallengeorigin1_"+"3".repeat(64),
        evidence_sha256:sha("evidence")};},
  };
  mutator(caps,state,before,order);
  return {caps,order,state};
}

const expectedOrder=["entropy","before","claim","append","high","reopen","witness","second","rollback","after","stale","terminal","origin"];
{
  const h=makeHarness();
  const result=executeBuyVoidAllocationCustodyRollbackControllerCandidateV1({
    authorization,capabilities:h.caps,
  });
  assert.equal(result.marker,VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_CANDIDATE_V1);
  assert.equal(result.status,"controller_candidate_sequence_green_host_adapter_required");
  assert.deepEqual(h.order,expectedOrder);
  assert.equal(result.authorization_record_validated,true);
  assert.match(result.authorization_claim_id,/^voidbuycustodychallengeclaim1_[0-9a-f]{64}$/u);
  assert.equal(result.authorization_claim_contract_validated,true);
  assert.equal(result.authorization_claim_one_time_required,true);
  assert.equal(result.authorization_replay_rejection_contract_validated,true);
  assert.equal(result.authorization_claim_authenticated,false);
  assert.equal(result.operation_bound_authorization_authenticated,false);
  assert.equal(result.authorization_claim_bound_to_evidence_origin,true);
  assert.equal(result.non_customer_canary_domain_bound,true);
  assert.equal(result.non_customer_canary_isolation_proven,false);
  assert.equal(result.reviewed_source_generation_requirement_bound,true);
  assert.equal(result.exact_current_policy_requirement_bound,true);
  assert.equal(result.expected_policy_record_matched,true);
  assert.equal(result.exact_current_policy_authenticated,false);
  assert.equal(result.challenge_entropy_capability_invoked,true);
  assert.equal(result.challenge_unpredictability_proven,false);
  assert.equal(result.protected_high_water_non_decrease_contract_validated,true);
  assert.equal(result.stale_journal_refusal_contract_validated,true);
  assert.equal(result.terminal_journal_predecessor_revalidated,true);
  assert.equal(result.allocation_ledger_unchanged_contract_validated,true);
  assert.equal(result.customer_request_state_unchanged_contract_validated,true);
  assert.equal(result.evidence_origin_capability_report_validated,true);
  assert.equal(result.evidence_origin_authenticated,false);
  assert.equal(result.injected_capabilities_authenticated,false);
  for(const key of [
    "live_durable_storage_proven","rollback_resistance_proven",
    "protected_high_water_custody_proven","independent_custody_proven",
    "production_gate_ready","host_execution_authorized","filesystem_write_authorized",
    "storage_mutation_authorized","rollback_test_authorized","payment_acceptance_authorized",
    "public_presale_activation_authorized","wc_void_market_activation_authorized",
    "funds_movement","production_host_evidence_authority",
  ]) assert.equal(result[key],false,key);
}


{
  const claims=new Set();
  const first=makeHarness(()=>{},claims);
  const firstResult=executeBuyVoidAllocationCustodyRollbackControllerCandidateV1({
    authorization,capabilities:first.caps,
  });
  assert.deepEqual(first.order,expectedOrder);
  const second=makeHarness((c,s,b,order)=>{
    c.generate_challenge_entropy=()=>{
      order.push("entropy");
      return Buffer.alloc(32,0x6b);
    };
  },claims);
  assert.throws(()=>executeBuyVoidAllocationCustodyRollbackControllerCandidateV1({
    authorization,capabilities:second.caps,
  }),/authorization_replay_or_claim_failed/);
  assert.deepEqual(second.order,["entropy","before","claim"]);
  assert.notEqual(firstResult.challenge_id,second.state.claim.challenge_id);
  assert.equal(second.order.includes("append"),false);
}

function mustFail(label,mutator,pattern){
  const h=makeHarness(mutator);
  assert.throws(()=>executeBuyVoidAllocationCustodyRollbackControllerCandidateV1({
    authorization,capabilities:h.caps,
  }),pattern,label);
}
mustFail("bad entropy",(c)=>{c.generate_challenge_entropy=()=>Buffer.alloc(31);},/challenge_entropy_invalid/);

{
  const {proxy,revoke}=Proxy.revocable({},Object.create(null));
  revoke();
  assert.throws(
    ()=>executeBuyVoidAllocationCustodyRollbackControllerCandidateV1(proxy),
    /controller_input_invalid/,
  );
}
{
  const {proxy,revoke}=Proxy.revocable([],Object.create(null));
  revoke();
  assert.throws(
    ()=>executeBuyVoidAllocationCustodyRollbackControllerCandidateV1(proxy),
    /controller_input_invalid/,
  );
}

for(const [field,pattern] of [
  ["journal_sequence",/journal_sequence_headroom_exhausted/],
  ["high_water_sequence",/high_water_sequence_headroom_exhausted/],
  ["external_witness_sequence",/external_witness_sequence_headroom_exhausted/],
]){
  const h=makeHarness((c,s,b)=>{ b[field]=Number.MAX_SAFE_INTEGER; });
  assert.throws(()=>executeBuyVoidAllocationCustodyRollbackControllerCandidateV1({
    authorization,capabilities:h.caps,
  }),pattern,field);
  assert.deepEqual(h.order,["entropy","before"],field);
}
{
  let entropyInvoked=false;
  let asyncBodyInvoked=false;
  const h=makeHarness((c)=>{
    c.generate_challenge_entropy=()=>{
      entropyInvoked=true;
      return Buffer.alloc(32,0x11);
    };
    c.observe_before=async()=>{
      asyncBodyInvoked=true;
      return {};
    };
  });
  assert.throws(()=>executeBuyVoidAllocationCustodyRollbackControllerCandidateV1({
    authorization,capabilities:h.caps,
  }),/capability_async_forbidden:observe_before/);
  assert.equal(entropyInvoked,false);
  assert.equal(asyncBodyInvoked,false);
}
{
  let proxyApplyInvoked=false;
  const h=makeHarness((c)=>{
    const target=function(){ proxyApplyInvoked=true; return {}; };
    c.append_journal_canary=new Proxy(target,{
      apply(){ proxyApplyInvoked=true; return {}; },
    });
  });
  assert.throws(()=>executeBuyVoidAllocationCustodyRollbackControllerCandidateV1({
    authorization,capabilities:h.caps,
  }),/capability_proxy_forbidden:append_journal_canary/);
  assert.equal(proxyApplyInvoked,false);
}
{
  let generatorBodyInvoked=false;
  const h=makeHarness((c)=>{
    c.advance_high_water=function*(){
      generatorBodyInvoked=true;
      yield 1;
    };
  });
  assert.throws(()=>executeBuyVoidAllocationCustodyRollbackControllerCandidateV1({
    authorization,capabilities:h.caps,
  }),/capability_generator_forbidden:advance_high_water/);
  assert.equal(generatorBodyInvoked,false);
}
{
  let boundAsyncBodyInvoked=false;
  const h=makeHarness((c)=>{
    async function boundAsyncCapability(){
      boundAsyncBodyInvoked=true;
      return {};
    }
    c.sync_close_reopen=boundAsyncCapability.bind(null);
  });
  assert.throws(()=>executeBuyVoidAllocationCustodyRollbackControllerCandidateV1({
    authorization,capabilities:h.caps,
  }),/capability_native_or_bound_forbidden:sync_close_reopen/);
  assert.equal(boundAsyncBodyInvoked,false);
}
{
  let boundGeneratorBodyInvoked=false;
  const h=makeHarness((c)=>{
    function* boundGeneratorCapability(){
      boundGeneratorBodyInvoked=true;
      yield 1;
    }
    c.append_external_witness=boundGeneratorCapability.bind(null);
  });
  assert.throws(()=>executeBuyVoidAllocationCustodyRollbackControllerCandidateV1({
    authorization,capabilities:h.caps,
  }),/capability_native_or_bound_forbidden:append_external_witness/);
  assert.equal(boundGeneratorBodyInvoked,false);
}
{
  let thenGetterInvoked=false;
  const h=makeHarness((c)=>{
    c.observe_before=()=>{
      const proto={};
      Object.defineProperty(proto,"then",{
        configurable:true,
        get(){
          thenGetterInvoked=true;
          return ()=>{};
        },
      });
      return Object.create(proto);
    };
  });
  assert.throws(()=>executeBuyVoidAllocationCustodyRollbackControllerCandidateV1({
    authorization,capabilities:h.caps,
  }),/observe_before_then_accessor_forbidden/);
  assert.equal(thenGetterInvoked,false);
}
mustFail("reopen policy drift",(c,s,b)=>{c.sync_close_reopen=()=>({...b,
  journal_sequence:8,journal_tip_sha256:s.append.journal_tip_sha256,
  high_water_sequence:8,high_water_sha256:s.high.high_water_sha256,
  policy_fingerprint_sha256:sha("other-policy"),
});},/sync_reopen_binding_drift:policy_fingerprint_sha256/);
mustFail("reopen witness drift",(c,s,b)=>{c.sync_close_reopen=()=>({...b,
  journal_sequence:8,journal_tip_sha256:s.append.journal_tip_sha256,
  high_water_sequence:8,high_water_sha256:s.high.high_water_sha256,
  external_witness_sequence:b.external_witness_sequence+1,
  external_witness_tip_sha256:sha("premature-witness"),
});},/sync_reopen_external_witness_drift/);
mustFail("post rollback customer drift",(c,s,b)=>{c.observe_after_rollback=()=>({...b,
  high_water_sequence:8,high_water_sha256:s.high.high_water_sha256,
  external_witness_sequence:12,external_witness_tip_sha256:s.witness.external_witness_tip_sha256,
  customer_request_state_sha256:sha("changed-requests"),
});},/post_rollback_binding_drift:customer_request_state_sha256/);
mustFail("high water mutation",(c,s,b)=>{c.attempt_controlled_journal_rollback=({challenge_id})=>({
  attempted:true,challenge_id,controller_id:"void.replay.journal.rollback.controller.v1",
  journal_target_sha256:b.journal_tip_sha256,protected_high_water_sha256:s.high.high_water_sha256,
  high_water_mutated:true,
});},/controlled_rollback_result_invalid/);
mustFail("high water decrease",(c,s,b)=>{c.observe_after_rollback=()=>({...b,
  high_water_sequence:7,high_water_sha256:b.high_water_sha256,
  external_witness_sequence:12,external_witness_tip_sha256:s.witness.external_witness_tip_sha256,
});},/protected_high_water_decreased/);
mustFail("stale replay accepted",(c)=>{c.attempt_stale_journal_replay=({challenge_id})=>({
  attempted:true,challenge_id,refused:false,reason:"accepted",
});},/stale_journal_not_refused/);
mustFail("terminal journal drift",(c,s,b)=>{c.reobserve_storage_and_policy=()=>({...b,
  journal_sequence:8,journal_tip_sha256:s.append.journal_tip_sha256,
  high_water_sequence:8,high_water_sha256:s.high.high_water_sha256,
  external_witness_sequence:12,external_witness_tip_sha256:s.witness.external_witness_tip_sha256,
});},/terminal_journal_drift/);
mustFail("ledger drift",(c,s,b)=>{c.reobserve_storage_and_policy=()=>({...b,
  high_water_sequence:8,high_water_sha256:s.high.high_water_sha256,
  external_witness_sequence:12,external_witness_tip_sha256:s.witness.external_witness_tip_sha256,
  allocation_ledger_sha256:sha("changed-ledger"),
});},/terminal_binding_drift:allocation_ledger_sha256/);
mustFail("collapsed storage",(c,s,b)=>{c.observe_before=()=>({...b,high_water_storage_id:b.journal_storage_id});},
  /before_storage_domains_not_distinct/);
mustFail("origin unauthenticated",(c)=>{c.authenticate_evidence_origin=({
  challenge_id,operation_id,authorization_claim_id,
})=>({
  authenticated:false,challenge_id,operation_id,authorization_claim_id,
  origin_id:"voidbuycustodychallengeorigin1_"+"3".repeat(64),evidence_sha256:sha("evidence"),
});},/evidence_origin_not_authenticated/);

const maxU64Body={...authBody,expected_policy_generation:"18446744073709551615"};
const maxU64Authorization={
  ...maxU64Body,
  authorization_id:buildBuyVoidAllocationCustodyRollbackChallengeAuthorizationIdV1(maxU64Body),
};
{
  const h=makeHarness((c,s,b)=>{ b.policy_generation="18446744073709551615"; });
  const result=executeBuyVoidAllocationCustodyRollbackControllerCandidateV1({
    authorization:maxU64Authorization,capabilities:h.caps,
  });
  assert.equal(result.status,"controller_candidate_sequence_green_host_adapter_required");
}
const overU64Body={...authBody,expected_policy_generation:"18446744073709551616"};
const overU64Authorization={
  ...overU64Body,
  authorization_id:buildBuyVoidAllocationCustodyRollbackChallengeAuthorizationIdV1(overU64Body),
};
assert.throws(()=>executeBuyVoidAllocationCustodyRollbackControllerCandidateV1({
  authorization:overU64Authorization,capabilities:makeHarness().caps,
}),/authorization_policy_generation_invalid/);
mustFail("observation policy generation above u64",(c,s,b)=>{
  b.policy_generation="18446744073709551616";
},/before_policy_generation/);

const wrongPolicyBody={...authBody,expected_policy_fingerprint_sha256:sha("wrong-policy")};
const wrongPolicy={
  ...wrongPolicyBody,
  authorization_id:buildBuyVoidAllocationCustodyRollbackChallengeAuthorizationIdV1(wrongPolicyBody),
};
assert.throws(()=>executeBuyVoidAllocationCustodyRollbackControllerCandidateV1({
  authorization:wrongPolicy,capabilities:makeHarness().caps,
}),/authorization_policy_observation_mismatch/);

const wrongCanaryBody={...authBody,canary_domain_id:"void.buyvoid.presale.customer.invalid"};
const wrongCanary={
  ...wrongCanaryBody,
  authorization_id:buildBuyVoidAllocationCustodyRollbackChallengeAuthorizationIdV1(wrongCanaryBody),
};
assert.throws(()=>executeBuyVoidAllocationCustodyRollbackControllerCandidateV1({
  authorization:wrongCanary,capabilities:makeHarness().caps,
}),/authorization_scope_invalid/);

const wrong={...authorization,plan_id:"voidbuycustodychallengeplan1_"+"0".repeat(64)};
assert.throws(()=>executeBuyVoidAllocationCustodyRollbackControllerCandidateV1({
  authorization:wrong,capabilities:makeHarness().caps,
}),/authorization_plan_invalid/);

console.log("VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_CANDIDATE_V1_PROOF_GREEN");
console.log("plan_id=voidbuycustodychallengeplan1_dd868e3fb6ebdbf894c1170d0ecc153d61e198d9c20279a05c3309957add9006");
console.log("challenge_requirement_count=20");
console.log("deterministic_controller_sequence=true");
console.log("sequence_headroom_preflighted_before_mutation=true");
console.log("policy_generation_u64_bounded=true");
console.log("operation_bound_authorization_required=true");
console.log("authorization_claim_once_required=true");
console.log("same_authorization_replay_rejected_before_mutation=true");
console.log("authorization_claim_bound_to_evidence_origin=true");
console.log("operation_bound_authorization_authenticated=false");
console.log("non_customer_canary_domain_bound=true");
console.log("non_customer_canary_isolation_proven=false");
console.log("expected_policy_record_matched=true");
console.log("exact_current_policy_authenticated=false");
console.log("challenge_entropy_capability_invoked=true");
console.log("challenge_unpredictability_proven=false");
console.log("second_control_precedes_rollback=true");
console.log("protected_high_water_non_decrease_required=true");
console.log("stale_journal_refusal_required=true");
console.log("terminal_journal_predecessor_revalidation_required=true");
console.log("durability_checkpoint_binding_stability_required=true");
console.log("post_rollback_binding_stability_required=true");
console.log("allocation_ledger_unchanged_required=true");
console.log("customer_request_state_unchanged_required=true");
console.log("evidence_origin_authentication_required=true");
console.log("evidence_origin_authenticated=false");
console.log("injected_capabilities_authenticated=false");
console.log("all_capabilities_preflighted_before_invocation=true");
console.log("revoked_object_proxy_namespaced_rejection=true");
console.log("revoked_array_proxy_namespaced_rejection=true");
console.log("async_capability_body_not_invoked=true");
console.log("proxy_capability_apply_trap_not_invoked=true");
console.log("generator_capability_body_not_invoked=true");
console.log("bound_async_capability_body_not_invoked=true");
console.log("bound_generator_capability_body_not_invoked=true");
console.log("then_getter_not_invoked=true");
console.log("direct_host_filesystem_api_present=false");
console.log("direct_process_api_present=false");
console.log("direct_network_api_present=false");
console.log("protected_host_adapter_required=true");
console.log("host_execution_authorized=false");
console.log("storage_mutation_authorized=false");
console.log("rollback_test_authorized=false");
console.log("payment_acceptance_authorized=false");
console.log("public_presale_activation_authorized=false");
console.log("funds_movement=false");
