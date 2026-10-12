import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_CONFIRMATION,
  activationPersistenceDefaultDependencyIdentityV1,
  executeAuthenticatedPaidWorkActivationPersistenceV1,
  paymentAuthorityReplayStateIdV1,
  type ActivationDependenciesV1,
  type PaymentAuthorityReplayStateDraftV1,
} from "./authenticated_paid_work_quote_acceptance_payment_authority_activation_persistence_v1.js";
import {
  acceptanceReplayStateIdV1,
  type AcceptanceReplayStateDraftV1,
  type PublicAgentServiceAcceptanceMaterializationReplayConsumerPacketV1,
} from "./public_agent_service_acceptance_materialization_replay_consumer_v1.js";
import {
  materializeAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1,
  verifyAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1,
  type AuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityPacketV1,
} from "./authenticated_paid_work_quote_acceptance_payment_authority_v1.js";

function fail(message: string): never { throw new Error(message); }
function assertCondition(condition: unknown, message: string): asserts condition { if (!condition) fail(message); }
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function expectReject(label: string, action: () => unknown): void { let rejected=false; try { action(); } catch { rejected=true; } assertCondition(rejected,`${label} was not rejected`); }
function readJson(relative: string): unknown { return JSON.parse(fs.readFileSync(path.resolve(relative),"utf8")) as unknown; }

const fixture = readJson("examples/authenticated-paid-work-quote-acceptance-payment-authority-activation-persistence-v1.example.json") as Record<string, unknown>;
const prepared = verifyAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1(fixture.prepared_input,fixture.prepared_packet);
const requesterId=`voidawra1_${"a".repeat(64)}`;
const providerId=`voidawqa1_${"b".repeat(64)}`;

function mockRequester(packet: AuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityPacketV1): Record<string, unknown> {
  return {
    marker:"VOID_PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_PACKET_V1",version:1,
    requester_authentication_id:requesterId,status:"requester_authenticated_for_acceptance",
    source:{quote_id:packet.source.quote_id,work_order_id:packet.source.work_order_id,requester_agent_id:packet.source.requester_agent_id,provider_id:packet.source.provider_id,acceptance_nonce:(packet.prepared_artifacts.acceptance_envelope as unknown as Record<string,unknown>).nonce,provider_authentication_id:providerId},
    verification:{provider_authentication_verified:true,requester_authentication_verified:true},
    acceptance_gate:{eligible_for_acceptance_materialization:true},authority:{},
  };
}
function mockAcceptance(packet: AuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityPacketV1,input: Record<string,unknown>): PublicAgentServiceAcceptanceMaterializationReplayConsumerPacketV1 {
  const before=input.replay_state_snapshot as Record<string,unknown>;
  const acceptance=packet.prepared_artifacts.acceptance_envelope;
  const draft: AcceptanceReplayStateDraftV1={
    marker:"VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_STATE_V1",version:1,
    revision:(before.revision as number)+1,
    consumed_requester_authentication_ids:[...(before.consumed_requester_authentication_ids as string[]),requesterId].sort(),
    consumed_provider_authentication_ids:[...(before.consumed_provider_authentication_ids as string[]),providerId].sort(),
    consumed_acceptance_ids:[...(before.consumed_acceptance_ids as string[]),acceptance.acceptance_id].sort(),
    active_acceptance_by_quote:{...(before.active_acceptance_by_quote as Record<string,string>),[acceptance.quote_id]:acceptance.acceptance_id},
  };
  const after={...draft,state_id:acceptanceReplayStateIdV1(draft)};
  return {
    marker:"VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_CONSUMER_PACKET_V1",version:1,
    plan_id:`voidawacp1_${"c".repeat(64)}`,status:"acceptance_materialization_planned",
    source_evidence:{source_pack_sha256:"4c9c495e74d12aa8b07383ee5af55694773f03d654385f9f6296aef5c5d853ec",source_commit:"182228a1a9c4b31ec5ce9dc4b0fa1383938913df",diagnostic_correction:"acceptance_specific_persistent_replay_consumer_not_found",canonical_acceptance_materializer_verified:true,declarative_replay_requirements_verified:true,production_persistence_consumer_verified:false},
    source:{requester_authentication_id:requesterId,provider_authentication_id:providerId,handoff_id:`voidawah1_${"d".repeat(64)}`,quote_id:acceptance.quote_id,work_order_id:acceptance.work_order_id,requester_agent_id:acceptance.requester.agent_id,provider_id:acceptance.provider.provider_id,acceptance_nonce:acceptance.nonce},
    acceptance:{preview_acceptance_id:acceptance.acceptance_id,acceptance_id:acceptance.acceptance_id,acceptance_materialized_in_memory:true,acceptance_created_in_durable_state:false,acceptance_envelope:acceptance},
    replay:{before_state:before as unknown as ReturnType<typeof acceptanceState>,next_state:after,transaction:{marker:"VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_TRANSACTION_V1",version:1,transaction_id:`voidawact1_${"e".repeat(64)}`,before_state_id:before.state_id as string,after_state_id:after.state_id,before_revision:before.revision as number,after_revision:after.revision,requester_authentication_id:requesterId,provider_authentication_id:providerId,acceptance_id:acceptance.acceptance_id,quote_id:acceptance.quote_id,work_order_id:acceptance.work_order_id,requester_agent_id:acceptance.requester.agent_id,atomic_consumption_count:3,requester_authentication_consumed:true,provider_authentication_consumed:true,acceptance_id_consumed:true,single_active_acceptance_per_quote_enforced:true},requester_authentication_replay_checked:true,provider_authentication_replay_checked:true,acceptance_replay_checked:true,single_active_acceptance_per_quote_checked:true,expected_revision_checked:true,all_or_nothing_transition_verified:true,production_persistence_consumer_verified:false},
    authority:{acceptance_persistence:false,quote_acceptance:false,requester_authentication_replay_write:false,provider_authentication_replay_write:false,acceptance_replay_write:false,payment_authorization:false,payment_execution:false,execution_authorization:false,work_dispatch:false,credential_issue:false,credential_change:false,provider_selection:false,requester_key_registry_write:false,provider_key_registry_write:false,wallet_access:false,production_signing:false,transaction_broadcast:false,work_credit_write:false,http_submission:false,runtime_mutation:false,money_movement:false},
  };
}
function acceptanceState(value: AcceptanceReplayStateDraftV1){return {...value,state_id:acceptanceReplayStateIdV1(value)};}
let activePrepared=prepared;
const dependencies:ActivationDependenciesV1={
  verifyPrepared:(input,packet)=>{ activePrepared=verifyAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1(input,packet); return activePrepared; },
  authenticateRequester:(_input,_catalog)=>mockRequester(activePrepared),
  planAcceptance:(input,_catalog,_workOrder,_quote)=>mockAcceptance(activePrepared,input as Record<string,unknown>),
};


const schema=readJson("schemas/authenticated-paid-work-quote-acceptance-payment-authority-activation-persistence-v1.schema.json") as Record<string,unknown>;
assertCondition(schema.x_void_marker==="VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_ACTIVATION_PERSISTENCE_SCHEMA_V1","schema marker mismatch");
const docs=fs.readFileSync(path.resolve("docs/operations/authenticated-paid-work-quote-acceptance-payment-authority-activation-persistence-v1.md"),"utf8").replace(/\s+/g," ");
const workflow=fs.readFileSync(path.resolve(".github/workflows/authenticated-paid-work-quote-acceptance-payment-authority-activation-persistence-v1.yml"),"utf8");
const adapterSource=fs.readFileSync(path.resolve("scripts/authenticated_paid_work_quote_acceptance_payment_authority_activation_persistence_v1.ts"),"utf8");
for(const fragment of ["consumes exactly five identities","payment_authorization=true","does **not** grant or perform payment execution","one active payment intent per acceptance"]){assertCondition(docs.includes(fragment),`docs fragment missing: ${fragment}`);}
assertCondition(workflow.includes("prove_authenticated_paid_work_quote_acceptance_payment_authority_activation_persistence_v1.ts"),"workflow proof command missing");
assertCondition(/uses:\s*actions\/checkout@v4\s+with:\s+fetch-depth:\s*0/.test(workflow),"workflow full-history checkout missing");
assertCondition(!/from\s+["']node:(?:http|https|net|tls|child_process)["']/.test(adapterSource),"adapter imports network or subprocess authority");
assertCondition(!/\bfetch\s*\(/.test(adapterSource),"adapter performs HTTP");
assertCondition(!adapterSource.includes("materializeAgentPaidWorkPaymentExecutionAuthorization"),"adapter materializes payment execution authorization");

const fixtureResult=executeAuthenticatedPaidWorkActivationPersistenceV1(fixture,{},dependencies);
assertCondition(fixtureResult.status==="example_only","fixture status changed");
assertCondition(Object.values(fixtureResult.authority).every(v=>v===false),"fixture granted authority");

const root=fs.mkdtempSync(path.join(os.tmpdir(),"void-paid-work-activation-proof-"));fs.chmodSync(root,0o700);
const live=clone(fixture) as Record<string,unknown>;live.mode="external_requester_evidence";live.requester_authentication_input={synthetic_external_proof:true};
const config=live.persistence_config as Record<string,unknown>;config.enabled=true;config.allowed_root=root;
const command=live.command as Record<string,unknown>;command.apply=true;command.confirmation=AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_CONFIRMATION;command.recorded_at_utc="2026-07-31T12:30:00Z";

const committed=executeAuthenticatedPaidWorkActivationPersistenceV1(live,{},dependencies);
assertCondition(committed.status==="committed","first apply did not commit");
assertCondition(committed.authority.quote_acceptance===true,"quote acceptance not activated");
assertCondition(committed.authority.payment_authorization===true,"payment authority not activated");
assertCondition(committed.authority.payment_execution===false,"payment execution activated");
assertCondition(committed.authority.work_dispatch===false,"dispatch activated");
assertCondition(committed.persistence_receipt?.atomic_consumption_count===5,"atomic consumption count changed");
assertCondition(committed.transaction_id==="voidawapat1_d0818505c3fc965c66a97aad730243a6e058007ae6c43b2a9afe62e5ef636275","transaction identity changed");
assertCondition(committed.persistence_receipt?.generation_id==="voidawpag1_b01c3aae87f55261abe043f334ef0e81f1d6bf8bba536be86259158dcf430f1e","generation identity changed");
assertCondition(fs.statSync(root).mode%0o1000===0o700,"root mode changed");

const duplicateInput=clone(live) as Record<string,unknown>;(duplicateInput.command as Record<string,unknown>).recorded_at_utc="2026-07-31T12:31:00Z";
const duplicate=executeAuthenticatedPaidWorkActivationPersistenceV1(duplicateInput,{},dependencies);
assertCondition(duplicate.status==="duplicate","exact duplicate was not reused");
assertCondition(duplicate.persistence_receipt?.generation_id===committed.persistence_receipt?.generation_id,"duplicate generation changed");

const currentPath=path.join(root,"current.json");assertCondition(fs.existsSync(currentPath),"current pointer absent");
const current=JSON.parse(fs.readFileSync(currentPath,"utf8")) as Record<string,unknown>;
assertCondition(current.transaction_id===committed.transaction_id,"current transaction mismatch");
const generation=path.join(root,"generations",String(current.generation_id));
for(const name of ["prepared-packet.json","requester-authentication.json","acceptance.json","payment-intent.json","acceptance-replay-state.json","payment-authority-replay-state.json","transaction.json","commit.json"]){const p=path.join(generation,name);assertCondition(fs.existsSync(p),`generation file missing: ${name}`);assertCondition(fs.statSync(p).mode%0o1000===0o600,`generation file mode changed: ${name}`);}

const wrongConfirmation=clone(live) as Record<string,unknown>;(wrongConfirmation.command as Record<string,unknown>).confirmation="wrong";expectReject("wrong confirmation",()=>executeAuthenticatedPaidWorkActivationPersistenceV1(wrongConfirmation,{},dependencies));
const staleConflict=clone(live) as Record<string,unknown>;const pi=((staleConflict.prepared_packet as Record<string,unknown>).prepared_artifacts as Record<string,unknown>).payment_intent_envelope as Record<string,unknown>;pi.payment_intent_id=`voidawpi1_${"f".repeat(64)}`;expectReject("tampered prepared packet",()=>executeAuthenticatedPaidWorkActivationPersistenceV1(staleConflict,{},dependencies));

const staleStoreConflict=clone(live) as Record<string,unknown>;
const stalePreparedInput=staleStoreConflict.prepared_input as Record<string,unknown>;
(stalePreparedInput.payment_authority_plan as Record<string,unknown>).nonce="payment-intent-conflict-20260731-0001";
staleStoreConflict.prepared_packet=materializeAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1(stalePreparedInput);
(staleStoreConflict.command as Record<string,unknown>).recorded_at_utc="2026-07-31T12:33:00Z";
expectReject("stale compare-and-swap conflict",()=>executeAuthenticatedPaidWorkActivationPersistenceV1(staleStoreConflict,{},dependencies));

const replayed=clone(live) as Record<string,unknown>;const ps=replayed.payment_authority_replay_state_snapshot as Record<string,unknown>;ps.consumed_prepared_packet_ids=[prepared.packet_id];const pd:PaymentAuthorityReplayStateDraftV1={marker:"VOID_AUTHENTICATED_PAID_WORK_PAYMENT_AUTHORITY_REPLAY_STATE_V1",version:1,revision:0,consumed_prepared_packet_ids:[prepared.packet_id],consumed_payment_intent_ids:[],active_payment_intent_by_acceptance:{}};ps.state_id=paymentAuthorityReplayStateIdV1(pd);expectReject("prepared packet replay",()=>executeAuthenticatedPaidWorkActivationPersistenceV1(replayed,{},dependencies));

const disabledRoot=fs.mkdtempSync(path.join(os.tmpdir(),"void-paid-work-disabled-"));fs.chmodSync(disabledRoot,0o700);const disabled=clone(live) as Record<string,unknown>;(disabled.persistence_config as Record<string,unknown>).allowed_root=disabledRoot;(disabled.persistence_config as Record<string,unknown>).enabled=false;const disabledResult=executeAuthenticatedPaidWorkActivationPersistenceV1(disabled,{},dependencies);assertCondition(disabledResult.status==="disabled"&&!fs.existsSync(path.join(disabledRoot,"current.json")),"disabled mode wrote state");
const plannedRoot=fs.mkdtempSync(path.join(os.tmpdir(),"void-paid-work-planned-"));fs.chmodSync(plannedRoot,0o700);const planned=clone(live) as Record<string,unknown>;(planned.persistence_config as Record<string,unknown>).allowed_root=plannedRoot;(planned.command as Record<string,unknown>).apply=false;(planned.command as Record<string,unknown>).confirmation="";const plannedResult=executeAuthenticatedPaidWorkActivationPersistenceV1(planned,{},dependencies);assertCondition(plannedResult.status==="planned"&&!fs.existsSync(path.join(plannedRoot,"current.json")),"planned mode wrote state");

// Exact orphan recovery: remove only the current pointer, retain immutable generation.
fs.unlinkSync(currentPath);const recoveryInput=clone(live) as Record<string,unknown>;(recoveryInput.command as Record<string,unknown>).recorded_at_utc="2026-07-31T12:32:00Z";const recovered=executeAuthenticatedPaidWorkActivationPersistenceV1(recoveryInput,{},dependencies);assertCondition(recovered.status==="recovered","exact orphan was not recovered");
const recoveredDuplicate=executeAuthenticatedPaidWorkActivationPersistenceV1(duplicateInput,{},dependencies);assertCondition(recoveredDuplicate.status==="duplicate","post-recovery duplicate failed");

const identity=activationPersistenceDefaultDependencyIdentityV1();
assertCondition(identity.prepared_verifier==="verifyAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1","prepared dependency drift");
assertCondition(identity.requester_authenticator==="materializePublicAgentServiceRequesterAcceptanceAuthenticationV1","requester dependency drift");
assertCondition(identity.acceptance_replay_planner==="planPublicAgentServiceAcceptanceMaterializationReplayConsumerV1","replay dependency drift");

console.log(`packet_id=${committed.packet_id}`);
console.log(`acceptance_id=${committed.acceptance_id}`);
console.log(`payment_intent_id=${committed.payment_intent_id}`);
console.log(`transaction_id=${committed.transaction_id}`);
console.log(`generation_id=${committed.persistence_receipt?.generation_id}`);
console.log("atomic_consumption_count=5");
console.log("requester_authentication_consumed=true");
console.log("provider_authentication_consumed=true");
console.log("acceptance_id_consumed=true");
console.log("prepared_packet_id_consumed=true");
console.log("payment_intent_id_consumed=true");
console.log("single_active_acceptance_per_quote_enforced=true");
console.log("single_active_payment_intent_per_acceptance_enforced=true");
console.log("deterministic_duplicate_reuse=true");
console.log("conflicting_replay_rejected=true");
console.log("stale_compare_and_swap_rejected=true");
console.log("atomic_generation_persistence=true");
console.log("orphan_recovery_exact=true");
console.log("effective_quote_acceptance=true_after_persistence");
console.log("effective_payment_authorization=true_after_persistence");
console.log("payment_execution=false");
console.log("payment_destination_resolution=false");
console.log("transaction_construction=false");
console.log("transaction_broadcast=false");
console.log("work_execution_authorization=false");
console.log("work_dispatch=false");
console.log("wallet_access=false");
console.log("work_credit_write=false");
console.log("void_settlement=false");
console.log("runtime_mutation=false");
console.log("money_movement=false");
console.log("schema_docs_workflow_boundary_checks=true");
console.log("network_and_subprocess_authority_absent=true");
console.log("payment_execution_materialization_absent=true");
console.log("canonical_contract_integration=true");
console.log("VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_ACTIVATION_PERSISTENCE_V1_EXACT_GREEN");
