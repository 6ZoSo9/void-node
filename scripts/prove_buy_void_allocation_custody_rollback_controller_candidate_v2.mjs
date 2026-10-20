import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_PLAN_ID_V1 as LEGACY_PLAN_ID,
  buildBuyVoidAllocationCustodyRollbackChallengeAuthorizationIdV1 as legacyAuthorizationId,
  executeBuyVoidAllocationCustodyRollbackControllerCandidateV1 as legacyController,
} from "../tools/void-buy-allocation-custody-rollback-controller-candidate-v1.mjs";
import fs from "node:fs";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_AUTHORITY_V2,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_CANDIDATE_V2,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_PLAN_ID_V2,
  buildBuyVoidAllocationCustodyRollbackChallengeAuthorizationIdV2,
  executeBuyVoidAllocationCustodyRollbackControllerCandidateV2,
  buildBuyVoidAllocationCustodySecondControlApprovalIdV2,
} from "../tools/void-buy-allocation-custody-rollback-controller-candidate-v2.mjs";

const ROOT=new URL("../",import.meta.url);
const SOURCE_REL="tools/void-buy-allocation-custody-rollback-controller-candidate-v2.mjs";
const SOURCE_BLOB="7a42e1863f3f4d842dd59060b366901adb402848";
const PLAN_REL="ops/security/buy-void-presale-custody-durability-rollback-challenge-plan-v2.json";
const PLAN_BLOB="1cdecf34117e4e890f67e62b412419d32870dfa0";
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
pin("tools/void-buy-allocation-custody-rollback-controller-candidate-v1.mjs",
    "96d4ac3499d222841f1f7a3c53e14900b68ae8cf");
const plan=JSON.parse(pin(PLAN_REL,PLAN_BLOB).toString("utf8"));
pin(CONTRACT_REL,CONTRACT_BLOB);
assert.equal(plan.plan_id,VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_PLAN_ID_V2);
assert.equal(plan.plan_id,"voidbuycustodychallengeplan2_622c5cab506b8424860a484e6675f73031a26635c0ef29a80aee2281f53f0844");
assert.equal(plan.schema,"void_buy_void_presale_custody_durability_rollback_challenge_plan_v2");
assert.equal(plan.version,2);
const EVIDENCE_MARKER_V2="VOID_BUY_VOID_CUSTODY_ROLLBACK_CHALLENGE_EVIDENCE_TRANSCRIPT_V2";
assert.equal(sourceCheckMarkerPreflightV2(),true);
function sourceCheckMarkerPreflightV2(){
  const text=pin(SOURCE_REL,SOURCE_BLOB).toString("utf8");
  return text.includes('marker:"'+EVIDENCE_MARKER_V2+'",') &&
    !text.includes('marker:"VOID_BUY_VOID_CUSTODY_ROLLBACK_CHALLENGE_EVIDENCE_TRANSCRIPT_V1",') &&
    text.includes('voidbuycustodysecondcontrol2_');
}
assert.equal(Object.keys(plan.historical_live_evidence_required).length,20);
assert.equal(plan.historical_live_evidence_required.reviewed_rollback_controller_required,true);
assert.equal(Object.keys(plan.v2_controller_upgrade_required).length,9);
for(const v of Object.values(plan.historical_live_evidence_required))assert.equal(v,true);
for(const v of Object.values(plan.v2_controller_upgrade_required))assert.equal(v,true);
assert.equal(plan.controller_candidate.git_blob_sha1,"96d4ac3499d222841f1f7a3c53e14900b68ae8cf");
for(const value of Object.values(plan.authority)) assert.equal(value,false);

for(const [key,value] of Object.entries(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_AUTHORITY_V2
)){
  if(key==="source_only_candidate"||key==="injected_capabilities_required"||
     key==="protected_host_adapter_required"||
     key==="authorization_one_time_claim_required"||
     key==="authorization_claim_post_rollback_revalidation_required"||
     key==="operation_wide_exclusive_lease_required"||
     key==="operation_lease_terminal_revalidation_required"||
     key==="evidence_transcript_digest_binding_required")
    assert.equal(value,true,key);
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
const op="voidbuycustodychallengeop2_"+"1".repeat(64);
const authBody={
  marker:"VOID_BUY_VOID_CUSTODY_ROLLBACK_CHALLENGE_AUTHORIZATION_V2",
  version:2,
  plan_id:"voidbuycustodychallengeplan2_622c5cab506b8424860a484e6675f73031a26635c0ef29a80aee2281f53f0844",
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
  authorization_id:buildBuyVoidAllocationCustodyRollbackChallengeAuthorizationIdV2(authBody),
};

function makeHarness(mutator=()=>{},authorizationClaims=new Set()){
  const order=[];
  const leaseId="voidbuycustodyoperationlease2_"+"5".repeat(64);
  const before={
    operation_lease_id:leaseId,
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
  const state={before,authorizationClaims,leaseId};
  const caps={
    generate_challenge_entropy(){order.push("entropy");return Buffer.alloc(32,0x5a);},
    acquire_operation_lease({
      authorization_id,operation_id,challenge_id,reject_previously_claimed_authorization,
    }){
      order.push("lease");challenge=challenge_id;
      assert.equal(reject_previously_claimed_authorization,true);
      state.attemptedLeaseChallengeId=challenge_id;
      // In a real adapter this decision must be atomic with durable lease
      // acquisition; an untrusted callback's assertion is not proof.
      if(authorizationClaims.has(authorization_id)){
        return {
          acquired:false,exclusive:false,authorization_id,operation_id,
          challenge_id,lease_id:leaseId,authorization_previously_claimed:true,
        };
      }
      state.lease={
        acquired:true,exclusive:true,authorization_id,operation_id,
        challenge_id,lease_id:leaseId,authorization_previously_claimed:false,
      };
      return state.lease;
    },
    observe_before({challenge_id,operation_lease_id}){
      order.push("before");challenge=challenge_id;assert.equal(operation_lease_id,leaseId);return before;
    },
    claim_operation_authorization_once({authorization_id,operation_id,challenge_id,operation_lease_id}){
      order.push("claim");assert.equal(operation_lease_id,leaseId);
      const already=authorizationClaims.has(authorization_id);
      if(!already) authorizationClaims.add(authorization_id);
      state.claim={
        claimed:!already,
        already_claimed:already,
        authorization_id,
        operation_id,
        challenge_id,
        claim_id:"voidbuycustodychallengeclaim2_"+"4".repeat(64),
        operation_lease_id:leaseId,
      };
      return state.claim;
    },
    append_journal_canary({challenge_id,canary_domain_id,operation_lease_id}){
      order.push("append");assert.equal(operation_lease_id,leaseId);
      assert.equal(challenge_id,challenge);
      assert.equal(canary_domain_id,"void.buyvoid.presale.noncustomer.canary.v1");
      state.append={
        challenge_id,
        canary_domain_id,
        journal_sequence:8,
        journal_tip_sha256:sha("journal-canary"),
        event_sha256:sha("event"),
        operation_lease_id:leaseId,
      };
      return state.append;
    },
    advance_high_water({challenge_id,operation_lease_id}){
      order.push("high");assert.equal(operation_lease_id,leaseId);
      state.high={challenge_id,high_water_sequence:8,high_water_sha256:sha("high-after"),operation_lease_id:leaseId};
      return state.high;
    },
    sync_close_reopen({operation_lease_id}){order.push("reopen");assert.equal(operation_lease_id,leaseId);return {...before,
      journal_sequence:8,journal_tip_sha256:state.append.journal_tip_sha256,
      high_water_sequence:8,high_water_sha256:state.high.high_water_sha256};},
    append_external_witness({challenge_id,operation_lease_id}){
      order.push("witness");assert.equal(operation_lease_id,leaseId);
      state.witness={challenge_id,external_witness_sequence:12,
        external_witness_tip_sha256:sha("witness-after"),
        source_journal_tip_sha256:state.append.journal_tip_sha256,
        source_high_water_sha256:state.high.high_water_sha256,
        operation_lease_id:leaseId};
      return state.witness;
    },
    obtain_second_control_approval(body){
      order.push("second");assert.equal(body.operation_lease_id,leaseId);
      assert.equal(body.marker,"VOID_BUY_VOID_CUSTODY_SECOND_CONTROL_APPROVAL_V2");
      assert.equal(body.version,2);
      assert.equal(body.plan_id,authBody.plan_id);
      assert.equal(body.authorization_id,authorization.authorization_id);
      assert.equal(body.operation_id,authorization.operation_id);
      assert.equal(body.authorization_claim_id,state.claim.claim_id);
      assert.equal(body.rollback_target_journal_tip_sha256,before.journal_tip_sha256);
      assert.equal(body.protected_high_water_sha256,state.high.high_water_sha256);
      assert.equal(body.external_witness_sequence,state.witness.external_witness_sequence);
      assert.equal(body.external_witness_tip_sha256,state.witness.external_witness_tip_sha256);
      assert.equal(body.host_id,before.host_id);
      state.secondControlBody=body;
      state.secondControlId=buildBuyVoidAllocationCustodySecondControlApprovalIdV2(body);
      return {
        approved:true,approval_id:state.secondControlId,
        challenge_id:body.challenge_id,
        rollback_target_journal_tip_sha256:body.rollback_target_journal_tip_sha256,
        protected_high_water_sha256:body.protected_high_water_sha256,
        operation_lease_id:body.operation_lease_id,
      };
    },
    attempt_controlled_journal_rollback({challenge_id,authorization_claim_id,operation_lease_id}){
      order.push("rollback");assert.equal(operation_lease_id,leaseId);
      assert.equal(authorization_claim_id,state.claim.claim_id);
      return {attempted:true,challenge_id,controller_id:"void.replay.journal.rollback.controller.v2",
        journal_target_sha256:before.journal_tip_sha256,
        protected_high_water_sha256:state.high.high_water_sha256,high_water_mutated:false,
        authorization_claim_mutated:false,operation_lease_id:leaseId};
    },
    observe_after_rollback({operation_lease_id}){order.push("after");assert.equal(operation_lease_id,leaseId);return {...before,
      high_water_sequence:8,high_water_sha256:state.high.high_water_sha256,
      external_witness_sequence:12,external_witness_tip_sha256:state.witness.external_witness_tip_sha256};},
    attempt_stale_journal_replay({challenge_id,operation_lease_id}){order.push("stale");assert.equal(operation_lease_id,leaseId);
      return {attempted:true,challenge_id,refused:true,reason:"high_water_ahead_of_journal",operation_lease_id:leaseId};},
    reobserve_storage_and_policy({operation_lease_id}){order.push("terminal");assert.equal(operation_lease_id,leaseId);return {...before,
      high_water_sequence:8,high_water_sha256:state.high.high_water_sha256,
      external_witness_sequence:12,external_witness_tip_sha256:state.witness.external_witness_tip_sha256};},
    revalidate_operation_authorization_claim({
      authorization_id,operation_id,challenge_id,claim_id,operation_lease_id,
    }){
      order.push("claim-revalidate");assert.equal(operation_lease_id,leaseId);
      return {
        present:authorizationClaims.has(authorization_id),
        authorization_id,operation_id,challenge_id,claim_id,operation_lease_id:leaseId,
      };
    },
    revalidate_operation_lease({authorization_id,operation_id,challenge_id,lease_id}){
      order.push("lease-revalidate");
      return {present:true,exclusive:true,authorization_id,operation_id,challenge_id,lease_id};
    },
    authenticate_evidence_origin({challenge_id,operation_id,authorization_claim_id,operation_lease_id,evidence_sha256}){order.push("origin");
      assert.equal(operation_lease_id,leaseId);
      assert.equal(authorization_claim_id,state.claim.claim_id);
      assert.match(evidence_sha256,/^sha256:[0-9a-f]{64}$/u);
      state.originEvidenceSha256=evidence_sha256;
      return {authenticated:true,challenge_id,operation_id,authorization_claim_id,
        operation_lease_id:leaseId,
        origin_id:"voidbuycustodychallengeorigin2_"+"3".repeat(64),
        evidence_sha256};},
  };
  mutator(caps,state,before,order);
  return {caps,order,state};
}

const expectedOrder=["entropy","lease","before","claim","append","high","reopen","witness","second","rollback","after","stale","terminal","claim-revalidate","lease-revalidate","origin"];
{
  const h=makeHarness();
  const result=executeBuyVoidAllocationCustodyRollbackControllerCandidateV2({
    authorization,capabilities:h.caps,
  });
  assert.equal(result.marker,VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_CANDIDATE_V2);
  assert.equal(result.status,"controller_candidate_sequence_green_host_adapter_required");
  assert.deepEqual(h.order,expectedOrder);
  assert.equal(result.authorization_record_validated,true);
  assert.match(result.authorization_claim_id,/^voidbuycustodychallengeclaim2_[0-9a-f]{64}$/u);
  assert.equal(result.authorization_claim_contract_validated,true);
  assert.equal(result.authorization_claim_one_time_required,true);
  assert.equal(result.authorization_replay_rejection_contract_validated,true);
  assert.equal(result.authorization_claim_post_rollback_revalidated,true);
  assert.equal(result.authorization_claim_rollback_mutation_forbidden,true);
  assert.equal(result.authorization_claim_authenticated,false);
  assert.match(result.operation_lease_id,/^voidbuycustodyoperationlease2_[0-9a-f]{64}$/u);
  assert.equal(result.operation_wide_exclusive_lease_required,true);
  assert.equal(result.operation_lease_contract_validated,true);
  assert.equal(result.operation_lease_terminal_revalidated,true);
  assert.equal(result.operation_lease_bound_to_evidence_origin,true);
  assert.equal(result.operation_lease_authenticated,false);
  assert.equal(result.operation_lease_exclusivity_proven,false);
  assert.equal(result.operation_bound_authorization_authenticated,false);
  assert.equal(result.authorization_claim_bound_to_evidence_origin,true);
  assert.equal(
    result.next_gate,
    "DISTINCT_REVIEW_V2_PLAN_AND_CONTROLLER_V2_THEN_PROTECTED_ADAPTER",
  );
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
  assert.match(result.controller_evidence_sha256,/^sha256:[0-9a-f]{64}$/u);
  assert.equal(result.evidence_transcript_digest_binding_required,true);
  assert.equal(result.evidence_origin_digest_matches_controller_transcript,true);
  assert.equal(h.state.originEvidenceSha256,result.controller_evidence_sha256);
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
  const firstResult=executeBuyVoidAllocationCustodyRollbackControllerCandidateV2({
    authorization,capabilities:first.caps,
  });
  assert.deepEqual(first.order,expectedOrder);
  const second=makeHarness((c,s,b,order)=>{
    c.generate_challenge_entropy=()=>{
      order.push("entropy");
      return Buffer.alloc(32,0x6b);
    };
  },claims);
  assert.throws(()=>executeBuyVoidAllocationCustodyRollbackControllerCandidateV2({
    authorization,capabilities:second.caps,
  }),/operation_lease_replay_precondition_failed/);
  assert.deepEqual(second.order,["entropy","lease"]);
  assert.equal(Object.hasOwn(second.state,"lease"),false);
  assert.equal(Object.hasOwn(second.state,"claim"),false);
  assert.notEqual(firstResult.challenge_id,second.state.attemptedLeaseChallengeId);
  assert.equal(second.order.includes("append"),false);
}

function mustFail(label,mutator,pattern){
  const h=makeHarness(mutator);
  assert.throws(()=>executeBuyVoidAllocationCustodyRollbackControllerCandidateV2({
    authorization,capabilities:h.caps,
  }),pattern,label);
}
function mustFailAtPhase(label,mutator,pattern,terminalPhase){
  const h=makeHarness(mutator);
  assert.throws(()=>executeBuyVoidAllocationCustodyRollbackControllerCandidateV2({
    authorization,capabilities:h.caps,
  }),pattern,label);
  const last=expectedOrder.indexOf(terminalPhase);
  assert.ok(last>=0,terminalPhase);
  assert.deepEqual(h.order,expectedOrder.slice(0,last+1),label+": no subsequent callbacks");
}
// The protected-high-water index must match the journal index at the
// starting observation. A stale journal or lagging high-water must not
// mutate a new one-time authorization claim or append a new canary.
mustFailAtPhase("initial stale journal refused before claim",(c)=>{
  const original=c.observe_before;
  c.observe_before=(args)=>({
    ...original(args),high_water_sequence:8,
  });
},/initial_journal_high_water_checkpoint_mismatch/,"before");
mustFailAtPhase("initial lagging high-water refused before claim",(c)=>{
  const original=c.observe_before;
  c.observe_before=(args)=>({
    ...original(args),journal_sequence:8,
  });
},/initial_journal_high_water_checkpoint_mismatch/,"before");
mustFailAtPhase("journal append sequence+1 unchanged tip",(c,s,b)=>{
  const original=c.append_journal_canary;
  c.append_journal_canary=(args)=>({
    ...original(args),journal_tip_sha256:b.journal_tip_sha256,
  });
},/journal_append_tip_not_advanced/,"append");
mustFailAtPhase("high-water sequence advance unchanged tip",(c,s,b)=>{
  const original=c.advance_high_water;
  c.advance_high_water=(args)=>({
    ...original(args),high_water_sha256:b.high_water_sha256,
  });
},/high_water_tip_not_advanced/,"high");
mustFailAtPhase("high-water unjustified skip with fresh tip",(c)=>{
  const original=c.advance_high_water;
  c.advance_high_water=(args)=>({
    ...original(args),
    high_water_sequence:9,
    // The fixture's original "high-after" digest is already fresh.
    // A fresh digest alone cannot justify an unobserved skipped sequence.
  });
},/high_water_unproven_sequence_skip/,"high");
mustFailAtPhase("external witness sequence advance unchanged tip",(c,s,b)=>{
  const original=c.append_external_witness;
  c.append_external_witness=(args)=>({
    ...original(args),external_witness_tip_sha256:b.external_witness_tip_sha256,
  });
},/external_witness_tip_not_advanced/,"witness");
mustFail("bad entropy",(c)=>{c.generate_challenge_entropy=()=>Buffer.alloc(31);},/challenge_entropy_invalid/);
mustFail("operation lease acquisition refused",(c)=>{c.acquire_operation_lease=({
  authorization_id,operation_id,challenge_id,
})=>({acquired:false,exclusive:false,authorization_id,operation_id,challenge_id,
  lease_id:"voidbuycustodyoperationlease2_"+"5".repeat(64),
  authorization_previously_claimed:false});},/operation_lease_acquisition_failed/);
mustFail("lease replay assertion rejected",(c)=>{
  c.acquire_operation_lease=({
    authorization_id,operation_id,challenge_id,reject_previously_claimed_authorization,
  })=>{
    assert.equal(reject_previously_claimed_authorization,true);
    return {
      acquired:false,exclusive:false,authorization_id,operation_id,challenge_id,
      lease_id:"voidbuycustodyoperationlease2_"+"5".repeat(64),
      authorization_previously_claimed:true,
    };
  };
},/operation_lease_replay_precondition_failed/);
mustFail("missing lease replay precondition field rejected",(c)=>{
  const original=c.acquire_operation_lease;
  c.acquire_operation_lease=(args)=>{
    const response=original(args);
    const {authorization_previously_claimed,...without}=response;
    void authorization_previously_claimed;
    return without;
  };
},/operation_lease_shape/);
mustFail("operation lease substitution",(c,s)=>{
  const original=c.append_journal_canary;
  c.append_journal_canary=(args)=>({...original(args),
    operation_lease_id:"voidbuycustodyoperationlease2_"+"6".repeat(64)});
},/append_challenge_mismatch/);
mustFail("legacy V1 second-control approval ID rejected",(c)=>{
  const original=c.obtain_second_control_approval;
  c.obtain_second_control_approval=(args)=>({
    ...original(args),approval_id:"voidbuycustodysecondcontrol1_"+"2".repeat(64),
  });
},/second_control_approval_id_invalid/);

// A syntactically valid V2 approval ID must not denote a different
// challenge, authorization claim, lease, target, witness or host identity.
// These synthetic substitutions preserve the callback's claimed fields but
// must be rejected before the controlled-rollback capability is invoked.
for(const [field,forged] of [
  ["operation_id","voidbuycustodychallengeop2_"+"e".repeat(64)],
  ["authorization_id","voidbuycustodychallengeauth2_"+"f".repeat(64)],
  ["authorization_claim_id","voidbuycustodychallengeclaim2_"+"e".repeat(64)],
  ["challenge_id","voidbuycustodychallenge2_"+"e".repeat(64)],
  ["operation_lease_id","voidbuycustodyoperationlease2_"+"e".repeat(64)],
  ["host_id","other-host-fixture"],
  ["rollback_target_journal_tip_sha256",sha("other-rollback-target")],
  ["protected_high_water_sha256",sha("other-protected-high-water")],
  ["external_witness_sequence",13],
  ["external_witness_tip_sha256",sha("other-external-witness")],
]){
  mustFailAtPhase("V2 approval ID foreign context: "+field,(c)=>{
    const original=c.obtain_second_control_approval;
    c.obtain_second_control_approval=(body)=>{
      const approval=original(body);
      const foreignId=buildBuyVoidAllocationCustodySecondControlApprovalIdV2({
        ...body,[field]:forged,
      });
      assert.notEqual(foreignId,approval.approval_id,field);
      return {...approval,approval_id:foreignId};
    };
  },/second_control_approval_context_digest_mismatch/,"second");
}

mustFail("operation lease lost before origin",(c)=>{
  c.revalidate_operation_lease=({authorization_id,operation_id,challenge_id,lease_id})=>({
    present:false,exclusive:false,authorization_id,operation_id,challenge_id,lease_id,
  });
},/operation_lease_not_persistent/);

{
  const {proxy,revoke}=Proxy.revocable({},Object.create(null));
  revoke();
  assert.throws(
    ()=>executeBuyVoidAllocationCustodyRollbackControllerCandidateV2(proxy),
    /controller_input_invalid/,
  );
}
{
  const {proxy,revoke}=Proxy.revocable([],Object.create(null));
  revoke();
  assert.throws(
    ()=>executeBuyVoidAllocationCustodyRollbackControllerCandidateV2(proxy),
    /controller_input_invalid/,
  );
}

for(const [field,pattern] of [
  ["journal_sequence",/journal_sequence_headroom_exhausted/],
  ["high_water_sequence",/high_water_sequence_headroom_exhausted/],
  ["external_witness_sequence",/external_witness_sequence_headroom_exhausted/],
]){
  const h=makeHarness((c,s,b)=>{ b[field]=Number.MAX_SAFE_INTEGER; });
  assert.throws(()=>executeBuyVoidAllocationCustodyRollbackControllerCandidateV2({
    authorization,capabilities:h.caps,
  }),pattern,field);
  assert.deepEqual(h.order,["entropy","lease","before"],field);
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
  assert.throws(()=>executeBuyVoidAllocationCustodyRollbackControllerCandidateV2({
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
  assert.throws(()=>executeBuyVoidAllocationCustodyRollbackControllerCandidateV2({
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
  assert.throws(()=>executeBuyVoidAllocationCustodyRollbackControllerCandidateV2({
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
  assert.throws(()=>executeBuyVoidAllocationCustodyRollbackControllerCandidateV2({
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
  assert.throws(()=>executeBuyVoidAllocationCustodyRollbackControllerCandidateV2({
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
  assert.throws(()=>executeBuyVoidAllocationCustodyRollbackControllerCandidateV2({
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
  attempted:true,challenge_id,controller_id:"void.replay.journal.rollback.controller.v2",
  journal_target_sha256:b.journal_tip_sha256,protected_high_water_sha256:s.high.high_water_sha256,
  high_water_mutated:true,authorization_claim_mutated:false,
  operation_lease_id:s.leaseId,
});},/controlled_rollback_result_invalid/);
mustFail("rollback reports claim mutation",(c,s,b)=>{c.attempt_controlled_journal_rollback=({challenge_id})=>({
  attempted:true,challenge_id,controller_id:"void.replay.journal.rollback.controller.v2",
  journal_target_sha256:b.journal_tip_sha256,protected_high_water_sha256:s.high.high_water_sha256,
  high_water_mutated:false,authorization_claim_mutated:true,
  operation_lease_id:s.leaseId,
});},/controlled_rollback_result_invalid/);
mustFail("claim lost during rollback",(c,s)=>{
  const original=c.attempt_controlled_journal_rollback;
  c.attempt_controlled_journal_rollback=(args)=>{
    const out=original(args);
    s.authorizationClaims.delete(authorization.authorization_id);
    return out;
  };
},/authorization_claim_not_persistent/);
mustFail("high water decrease",(c,s,b)=>{c.observe_after_rollback=()=>({...b,
  high_water_sequence:7,high_water_sha256:b.high_water_sha256,
  external_witness_sequence:12,external_witness_tip_sha256:s.witness.external_witness_tip_sha256,
});},/protected_high_water_decreased/);
// An observed sequence+1 paired with the prior exact tip digest is an
// unproven new checkpoint generation, not valid monotonic evidence. Until a
// future independently authenticated append-lineage proof exists, the
// exclusive-lease challenge requires the exact observed generation.
mustFail("post rollback high-water sequence+1 stale digest",(c)=>{
  const prior=c.observe_after_rollback;
  c.observe_after_rollback=(args)=>({
    ...prior(args),high_water_sequence:9,
  });
},/post_rollback_high_water_unproven_advance/);
mustFail("post rollback witness sequence+1 stale digest",(c)=>{
  const prior=c.observe_after_rollback;
  c.observe_after_rollback=(args)=>({
    ...prior(args),external_witness_sequence:13,
  });
},/post_rollback_witness_unproven_advance/);
mustFail("terminal high-water sequence+1 stale digest",(c)=>{
  const prior=c.reobserve_storage_and_policy;
  c.reobserve_storage_and_policy=(args)=>({
    ...prior(args),high_water_sequence:9,
  });
},/terminal_high_water_unproven_advance/);
mustFail("terminal witness sequence+1 stale digest",(c)=>{
  const prior=c.reobserve_storage_and_policy;
  c.reobserve_storage_and_policy=(args)=>({
    ...prior(args),external_witness_sequence:13,
  });
},/terminal_witness_unproven_advance/);
mustFail("stale replay accepted",(c,s)=>{c.attempt_stale_journal_replay=({challenge_id})=>({
  attempted:true,challenge_id,refused:false,reason:"accepted",operation_lease_id:s.leaseId,
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
mustFail("origin unauthenticated",(c,s)=>{c.authenticate_evidence_origin=({
  challenge_id,operation_id,authorization_claim_id,evidence_sha256,
})=>({
  authenticated:false,challenge_id,operation_id,authorization_claim_id,
  operation_lease_id:s.leaseId,
  origin_id:"voidbuycustodychallengeorigin2_"+"3".repeat(64),evidence_sha256,
});},/evidence_origin_not_authenticated/);
mustFail("origin digest mismatch",(c,s)=>{c.authenticate_evidence_origin=({
  challenge_id,operation_id,authorization_claim_id,
})=>({
  authenticated:true,challenge_id,operation_id,authorization_claim_id,
  operation_lease_id:s.leaseId,
  origin_id:"voidbuycustodychallengeorigin2_"+"3".repeat(64),
  evidence_sha256:sha("different-controller-evidence"),
});},/evidence_origin_digest_mismatch/);

const maxU64Body={...authBody,expected_policy_generation:"18446744073709551615"};
const maxU64Authorization={
  ...maxU64Body,
  authorization_id:buildBuyVoidAllocationCustodyRollbackChallengeAuthorizationIdV2(maxU64Body),
};
{
  const h=makeHarness((c,s,b)=>{ b.policy_generation="18446744073709551615"; });
  const result=executeBuyVoidAllocationCustodyRollbackControllerCandidateV2({
    authorization:maxU64Authorization,capabilities:h.caps,
  });
  assert.equal(result.status,"controller_candidate_sequence_green_host_adapter_required");
}
const overU64Body={...authBody,expected_policy_generation:"18446744073709551616"};
const overU64Authorization={
  ...overU64Body,
  authorization_id:buildBuyVoidAllocationCustodyRollbackChallengeAuthorizationIdV2(overU64Body),
};
assert.throws(()=>executeBuyVoidAllocationCustodyRollbackControllerCandidateV2({
  authorization:overU64Authorization,capabilities:makeHarness().caps,
}),/authorization_policy_generation_invalid/);
mustFail("observation policy generation above u64",(c,s,b)=>{
  b.policy_generation="18446744073709551616";
},/before_policy_generation/);

const wrongPolicyBody={...authBody,expected_policy_fingerprint_sha256:sha("wrong-policy")};
const wrongPolicy={
  ...wrongPolicyBody,
  authorization_id:buildBuyVoidAllocationCustodyRollbackChallengeAuthorizationIdV2(wrongPolicyBody),
};
assert.throws(()=>executeBuyVoidAllocationCustodyRollbackControllerCandidateV2({
  authorization:wrongPolicy,capabilities:makeHarness().caps,
}),/authorization_policy_observation_mismatch/);

const wrongCanaryBody={...authBody,canary_domain_id:"void.buyvoid.presale.customer.invalid"};
const wrongCanary={
  ...wrongCanaryBody,
  authorization_id:buildBuyVoidAllocationCustodyRollbackChallengeAuthorizationIdV2(wrongCanaryBody),
};
assert.throws(()=>executeBuyVoidAllocationCustodyRollbackControllerCandidateV2({
  authorization:wrongCanary,capabilities:makeHarness().caps,
}),/authorization_scope_invalid/);

const wrong={...authorization,plan_id:"voidbuycustodychallengeplan1_"+"0".repeat(64)};
assert.throws(()=>executeBuyVoidAllocationCustodyRollbackControllerCandidateV2({
  authorization:wrong,capabilities:makeHarness().caps,
}),/authorization_plan_invalid/);

// Cross-generation authorization must fail before any injected callback.
const forbiddenCapabilities=new Proxy(Object.create(null),{
  ownKeys(){throw new Error("capability_probe_forbidden");},
  get(){throw new Error("capability_probe_forbidden");},
  getOwnPropertyDescriptor(){throw new Error("capability_probe_forbidden");},
});
const legacyBody={
  ...authBody,
  marker:"VOID_BUY_VOID_CUSTODY_ROLLBACK_CHALLENGE_AUTHORIZATION_V1",
  version:1,plan_id:LEGACY_PLAN_ID,
  operation_id:"voidbuycustodychallengeop1_"+"1".repeat(64),
};
const legacyAuthorization={...legacyBody,authorization_id:legacyAuthorizationId(legacyBody)};
assert.throws(
  ()=>executeBuyVoidAllocationCustodyRollbackControllerCandidateV2({authorization:legacyAuthorization,capabilities:forbiddenCapabilities}),
  /authorization_marker_invalid/,
);
assert.throws(
  ()=>legacyController({authorization,capabilities:forbiddenCapabilities}),
  /authorization_marker_invalid/,
);
assert.throws(
  ()=>executeBuyVoidAllocationCustodyRollbackControllerCandidateV2({
    authorization:{...legacyAuthorization,plan_id:VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_PLAN_ID_V2},
    capabilities:forbiddenCapabilities,
  }),/authorization_marker_invalid/,
);
assert.throws(
  ()=>executeBuyVoidAllocationCustodyRollbackControllerCandidateV2({
    authorization:{...authorization,plan_id:LEGACY_PLAN_ID},
    capabilities:forbiddenCapabilities,
  }),/authorization_plan_invalid/,
);
console.log("v1_v2_authorization_namespace_replay_rejected=true");
console.log("v1_second_control_approval_id_rejected=true");
console.log("v2_second_control_approval_id_content_bound=true");
console.log("foreign_approval_context_rejected_before_rollback=true");
console.log("foreign_approval_context_adversary_count=10");
console.log("v2_evidence_transcript_marker_distinct=true");
console.log("cross_generation_capability_probe_not_invoked=true");

console.log("VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_CANDIDATE_V2_PROOF_GREEN");
console.log("plan_id=voidbuycustodychallengeplan2_622c5cab506b8424860a484e6675f73031a26635c0ef29a80aee2281f53f0844");
console.log("challenge_requirement_count=20");
console.log("v2_controller_upgrade_requirement_count=9");
console.log("deterministic_controller_sequence=true");
console.log("sequence_headroom_preflighted_before_mutation=true");
console.log("policy_generation_u64_bounded=true");
console.log("operation_bound_authorization_required=true");
console.log("authorization_claim_once_required=true");
console.log("same_authorization_replay_rejected_before_mutation=true");
console.log("lease_replay_precondition_bound_before_observation=true");
console.log("fixture_replay_creates_no_lease_or_claim=true");
console.log("lease_previously_claimed_false_required=true");
console.log("authorization_claim_bound_to_evidence_origin=true");
console.log("authorization_claim_post_rollback_revalidation_required=true");
console.log("authorization_claim_post_rollback_revalidated=true");
console.log("authorization_claim_rollback_mutation_forbidden=true");
console.log("claim_loss_during_rollback_rejected=true");
console.log("operation_wide_exclusive_lease_required=true");
console.log("operation_lease_acquired_before_observation=true");
console.log("operation_lease_id_bound_to_all_callbacks=true");
console.log("operation_lease_terminal_revalidation_required=true");
console.log("operation_lease_terminal_revalidated=true");
console.log("operation_lease_substitution_rejected=true");
console.log("operation_lease_loss_rejected=true");
console.log("operation_lease_authenticated=false");
console.log("operation_lease_exclusivity_proven=false");
console.log("challenge_plan_successor_required_before_host_adapter=true");
console.log("operation_bound_authorization_authenticated=false");
console.log("non_customer_canary_domain_bound=true");
console.log("non_customer_canary_isolation_proven=false");
console.log("expected_policy_record_matched=true");
console.log("exact_current_policy_authenticated=false");
console.log("challenge_entropy_capability_invoked=true");
console.log("challenge_unpredictability_proven=false");
console.log("second_control_precedes_rollback=true");
console.log("protected_high_water_non_decrease_required=true");
console.log("journal_append_fresh_tip_required=true");
console.log("high_water_advance_fresh_tip_required=true");
console.log("high_water_minimal_required_sequence_enforced=true");
console.log("initial_journal_high_water_coherence_required=true");
console.log("stale_or_lagging_start_refused_before_claim=true");
console.log("high_water_skip_rejected_before_downstream_callbacks=true");
console.log("external_witness_append_fresh_tip_required=true");
console.log("unchanged_tip_rejected_before_downstream_callbacks=true");
console.log("post_rollback_high_water_exact_checkpoint_required=true");
console.log("post_rollback_external_witness_exact_checkpoint_required=true");
console.log("terminal_high_water_exact_checkpoint_required=true");
console.log("terminal_external_witness_exact_checkpoint_required=true");
console.log("stale_journal_refusal_required=true");
console.log("terminal_journal_predecessor_revalidation_required=true");
console.log("durability_checkpoint_binding_stability_required=true");
console.log("post_rollback_binding_stability_required=true");
console.log("allocation_ledger_unchanged_required=true");
console.log("customer_request_state_unchanged_required=true");
console.log("evidence_origin_authentication_required=true");
console.log("controller_evidence_digest_bound_to_origin=true");
console.log("mismatched_evidence_origin_digest_rejected=true");
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
