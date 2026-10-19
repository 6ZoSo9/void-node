#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  canonicalApollyonClaimContractJsonV1,
} from "../tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs";
import {
  qualifyApollyonDurableAttemptClaimStoreServiceSourceCandidateV2,
} from "../tools/apollyon-durable-attempt-claim-store-service-source-candidate-v2.mjs";
import {
  ACCEPTED_STORE_POLICY_ID,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_AUTHORIZATION_SLOT_AUTHORITY_V1,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_AUTHORIZATION_SLOT_RECORD_KEYS_V1,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_AUTHORIZATION_SLOT_REQUIREMENTS_V1,
  classifyApollyonDurableAttemptClaimAuthorizationSlotRecoveryV1,
  deriveApollyonDurableAttemptClaimAuthorizationSlotIdV1,
  qualifyApollyonDurableAttemptClaimAuthorizationSlotContractV1,
  qualifyApollyonDurableAttemptClaimAuthorizationSlotPolicyV1,
  qualifyApollyonDurableAttemptClaimAuthorizationSlotRecordV1,
  qualifyApollyonDurableAttemptClaimAuthorizationSlotSetV1,
  qualifyApollyonDurableAttemptClaimAuthorizationSlotMigrationV1,
  validateApollyonDurableAttemptClaimAuthorizationSlotRecordV1,
} from "../tools/apollyon-durable-attempt-claim-authorization-slot-v1.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const WORKFLOW=path.join(
  ROOT,
  ".github/workflows/apollyon-durable-attempt-claim-authorization-slot-v1.yml",
);
function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","ascii"))
    .update(bytes).digest("hex");
}
for(const [relative,expected] of Object.entries({
  "tools/apollyon-durable-attempt-claim-authorization-slot-v1.mjs":
    "c2ff992a09fe916a5016b5a6c4ceced4ab1d2fa8",
  "tools/apollyon-durable-attempt-claim-store-service-source-candidate-v2.mjs":
    "87019ae1245a2054407dd47835b0b7a891d4d9a2",
  "tools/apollyon-durable-attempt-claim-store-contract-v2.mjs":
    "6e3e5a80b3f481f98aced9b33e3f2ec66ec96bbe",
  "tools/apollyon-live-source-session-terminal-receipt-v2.mjs":
    "e27f0ebb968f4611bfc069670325c3f5e6df1c65",
  "tools/apollyon-live-custody-service-source-session-binding-v2.mjs":
    "981935515e08634be96446e58922c16be56d33ad",
  "tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs":
    "f97fafb0148527ae3a954e2752faef8c7fc9e88e",
})){
  assert.equal(gitBlob(fs.readFileSync(path.join(ROOT,relative))),expected,relative);
}

const workflow=fs.readFileSync(WORKFLOW,"utf8");
const expectedTriggerPaths=[
  "tools/apollyon-durable-attempt-claim-authorization-slot-v1.mjs",
  "scripts/prove_apollyon_durable_attempt_claim_authorization_slot_v1.mjs",
  "docs/security/apollyon-durable-attempt-claim-authorization-slot-v1.md",
  ".github/workflows/apollyon-durable-attempt-claim-authorization-slot-v1.yml",
  "tools/apollyon-durable-attempt-claim-store-service-source-candidate-v2.mjs",
  "tools/apollyon-durable-attempt-claim-store-contract-v2.mjs",
  "tools/apollyon-live-source-session-terminal-receipt-v2.mjs",
  "tools/apollyon-live-custody-service-source-session-binding-v2.mjs",
  "tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs",
];
function eventTriggerPaths(yaml,eventName,nextEventName){
  const lines=yaml.split("\n");
  const start=lines.indexOf("  "+eventName+":");
  const end=lines.indexOf("  "+nextEventName+":",start+1);
  assert.notEqual(start,-1,"missing event "+eventName);
  assert.notEqual(end,-1,"missing next event "+nextEventName);
  const block=lines.slice(start+1,end);
  const indexes=block.map((line,i)=>line==="    paths:"?i:-1).filter(i=>i>=0);
  assert.equal(indexes.length,1,eventName+" paths subsection count");
  const out=[];
  for(let i=indexes[0]+1;i<block.length;i++){
    const line=block[i];
    const match=/^      - "([^"]+)"$/u.exec(line);
    if(match){out.push(match[1]);continue;}
    if(/^\s*$/u.test(line))continue;
    if(!line.startsWith("      "))break;
    assert.fail(eventName+" malformed paths entry: "+line);
  }
  return out;
}
for(const [event,next] of [["pull_request","push"],["push","workflow_dispatch"]]){
  const actual=eventTriggerPaths(workflow,event,next);
  assert.equal(actual.length,expectedTriggerPaths.length,event+" path count");
  assert.equal(new Set(actual).size,actual.length,event+" duplicate path");
  assert.deepEqual([...actual].sort(),[...expectedTriggerPaths].sort(),event+" closure");
}
assert.equal(workflow.includes("PUSH_BEFORE:"),true);
assert.equal(workflow.includes("github.event.before"),true);

const candidate=qualifyApollyonDurableAttemptClaimStoreServiceSourceCandidateV2();
assert.equal(candidate.store_policy_id,ACCEPTED_STORE_POLICY_ID);
assert.equal(candidate.service_implementation_present,false);
assert.equal(candidate.durable_attempt_claim_performed,false);

const policy=qualifyApollyonDurableAttemptClaimAuthorizationSlotPolicyV1();
assert.equal(policy.store_policy_id,ACCEPTED_STORE_POLICY_ID);
assert.match(
  policy.authorization_slot_policy_id,
  /^apollyon_attempt_claim_auth_slot_policy_v1:[0-9a-f]{64}$/u,
);

const AUTH_A="apollyon_authz_v1:"+"1".repeat(64);
const AUTH_B="apollyon_authz_v1:"+"2".repeat(64);
function slotId(auth){
  return deriveApollyonDurableAttemptClaimAuthorizationSlotIdV1({
    authorization_id:auth,
    attempt_limit:1,
    automatic_retry_authorized:false,
  });
}
assert.equal(slotId(AUTH_A),slotId(AUTH_A));
assert.notEqual(slotId(AUTH_A),slotId(AUTH_B));

assert.throws(
  ()=>deriveApollyonDurableAttemptClaimAuthorizationSlotIdV1({
    store_policy_id:ACCEPTED_STORE_POLICY_ID,
    authorization_id:AUTH_A,
    attempt_limit:1,
    automatic_retry_authorized:false,
  }),
  /id_input_invalid/u,
);


function record(overrides={}){
  return qualifyApollyonDurableAttemptClaimAuthorizationSlotRecordV1({
    store_policy_id:ACCEPTED_STORE_POLICY_ID,
    authorization_id:AUTH_A,
    store_contract_id:"apollyon_claim_store_contract_v2:"+"3".repeat(64),
    store_generation_id:"apollyon_claim_store_generation_v2:"+"4".repeat(64),
    terminal_receipt_id:"apollyon_terminal_receipt_v2:"+"5".repeat(64),
    claim_record_id:"apollyon_attempt_claim_record_v2:"+"6".repeat(64),
    claim_record_sha256:"7".repeat(64),
    publish_request_sha256:"8".repeat(64),
    attempt_limit:1,
    automatic_retry_authorized:false,
    ...overrides,
  });
}

const first=record();
const second=record({
  store_contract_id:"apollyon_claim_store_contract_v2:"+"9".repeat(64),
  store_generation_id:"apollyon_claim_store_generation_v2:"+"a".repeat(64),
  terminal_receipt_id:"apollyon_terminal_receipt_v2:"+"b".repeat(64),
  claim_record_id:"apollyon_attempt_claim_record_v2:"+"c".repeat(64),
  claim_record_sha256:"d".repeat(64),
  publish_request_sha256:"e".repeat(64),
});
assert.equal(first.authorization_id,second.authorization_id);
assert.equal(first.authorization_slot_id,second.authorization_slot_id);
assert.notEqual(first.authorization_slot_record_id,second.authorization_slot_record_id);
assert.notEqual(first.claim_record_id,second.claim_record_id);
assert.deepEqual(
  Object.keys(first).sort(),
  [...VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_AUTHORIZATION_SLOT_RECORD_KEYS_V1].sort(),
);
assert.deepEqual(
  validateApollyonDurableAttemptClaimAuthorizationSlotRecordV1(first),
  first,
);

const empty=classifyApollyonDurableAttemptClaimAuthorizationSlotRecoveryV1({
  authorization_slot_id:first.authorization_slot_id,
  expected_slot_record:first,
  observed_slot_record:null,
});
assert.equal(empty.status,"authorization_slot_unreserved_shape");
assert.equal(empty.reservation_candidate,true);
assert.equal(empty.reservation_authorized,false);
assert.equal(empty.durable_claim_success_authorized,false);

const same=classifyApollyonDurableAttemptClaimAuthorizationSlotRecoveryV1({
  authorization_slot_id:first.authorization_slot_id,
  expected_slot_record:first,
  observed_slot_record:structuredClone(first),
});
assert.equal(same.status,"authorization_slot_exact_claim_already_reserved_shape");
assert.equal(same.exact_same_claim_recovery,true);
assert.equal(same.durable_claim_success_authorized,false);

assert.throws(
  ()=>classifyApollyonDurableAttemptClaimAuthorizationSlotRecoveryV1({
    authorization_slot_id:first.authorization_slot_id,
    expected_slot_record:second,
    observed_slot_record:first,
  }),
  /existing_different_claim_collision/u,
);

{
  const bad=structuredClone(first);
  bad.authorization_id=AUTH_B;
  assert.throws(
    ()=>validateApollyonDurableAttemptClaimAuthorizationSlotRecordV1(bad),
    /record_invalid/u,
  );
}
for(const mutate of [
  x=>{x.attempt_limit=2;},
  x=>{x.automatic_retry_authorized=true;},
]){
  const input={
    authorization_id:AUTH_A,
    attempt_limit:1,
    automatic_retry_authorized:false,
  };
  mutate(input);
  assert.throws(
    ()=>deriveApollyonDurableAttemptClaimAuthorizationSlotIdV1(input),
    /authority_invalid|id_input_invalid/u,
  );
}


const authBRecord=record({
  authorization_id:AUTH_B,
  store_contract_id:"apollyon_claim_store_contract_v2:"+"a".repeat(64),
  store_generation_id:"apollyon_claim_store_generation_v2:"+"b".repeat(64),
  terminal_receipt_id:"apollyon_terminal_receipt_v2:"+"c".repeat(64),
  claim_record_id:"apollyon_attempt_claim_record_v2:"+"d".repeat(64),
  claim_record_sha256:"e".repeat(64),
  publish_request_sha256:"f".repeat(64),
});
const slotSet=qualifyApollyonDurableAttemptClaimAuthorizationSlotSetV1({
  authorization_slot_records:[authBRecord,first],
});
const slotSetReordered=qualifyApollyonDurableAttemptClaimAuthorizationSlotSetV1({
  authorization_slot_records:[first,authBRecord],
});
assert.deepEqual(slotSetReordered,slotSet);
assert.equal(slotSet.authorization_slot_count,2);
assert.match(
  slotSet.authorization_slot_set_id,
  /^apollyon_attempt_claim_auth_slot_set_v1:[0-9a-f]{64}$/u,
);

const migration=qualifyApollyonDurableAttemptClaimAuthorizationSlotMigrationV1({
  old_store_generation_id:"apollyon_claim_store_generation_v2:"+"1".repeat(64),
  new_store_generation_id:"apollyon_claim_store_generation_v2:"+"2".repeat(64),
  parent_store_continuity_receipt_id:
    "apollyon_claim_store_continuity_v2:"+"3".repeat(64),
  old_authorization_slot_records:[first,authBRecord],
  new_authorization_slot_records:[authBRecord,first],
});
assert.equal(migration.authorization_slot_set_preserved,true);
assert.equal(migration.authorization_slot_records_byte_identical,true);
assert.equal(migration.authorization_slot_count,2);
assert.equal(
  migration.authorization_slot_set_sha256,
  slotSet.authorization_slot_set_sha256,
);
assert.equal(migration.parent_store_continuity_receipt_revalidation_required,true);
assert.equal(migration.parent_store_continuity_receipt_revalidation_performed,false);
assert.equal(migration.protected_old_slot_set_origin_proven,false);
assert.equal(migration.protected_new_slot_set_origin_proven,false);
assert.match(
  migration.authorization_slot_migration_id,
  /^apollyon_attempt_claim_auth_slot_migration_v1:[0-9a-f]{64}$/u,
);

assert.throws(
  ()=>qualifyApollyonDurableAttemptClaimAuthorizationSlotMigrationV1({
    old_store_generation_id:"apollyon_claim_store_generation_v2:"+"1".repeat(64),
    new_store_generation_id:"apollyon_claim_store_generation_v2:"+"2".repeat(64),
    parent_store_continuity_receipt_id:
      "apollyon_claim_store_continuity_v2:"+"3".repeat(64),
    old_authorization_slot_records:[first,authBRecord],
    new_authorization_slot_records:[first],
  }),
  /migration_slot_set_changed/u,
);
const rewrittenAuthB=record({
  authorization_id:AUTH_B,
  store_contract_id:"apollyon_claim_store_contract_v2:"+"4".repeat(64),
  store_generation_id:"apollyon_claim_store_generation_v2:"+"5".repeat(64),
  terminal_receipt_id:"apollyon_terminal_receipt_v2:"+"6".repeat(64),
  claim_record_id:"apollyon_attempt_claim_record_v2:"+"7".repeat(64),
  claim_record_sha256:"8".repeat(64),
  publish_request_sha256:"9".repeat(64),
});
assert.equal(rewrittenAuthB.authorization_slot_id,authBRecord.authorization_slot_id);
assert.throws(
  ()=>qualifyApollyonDurableAttemptClaimAuthorizationSlotMigrationV1({
    old_store_generation_id:"apollyon_claim_store_generation_v2:"+"1".repeat(64),
    new_store_generation_id:"apollyon_claim_store_generation_v2:"+"2".repeat(64),
    parent_store_continuity_receipt_id:
      "apollyon_claim_store_continuity_v2:"+"3".repeat(64),
    old_authorization_slot_records:[first,authBRecord],
    new_authorization_slot_records:[first,rewrittenAuthB],
  }),
  /migration_slot_set_changed/u,
);
assert.throws(
  ()=>qualifyApollyonDurableAttemptClaimAuthorizationSlotSetV1({
    authorization_slot_records:[first,structuredClone(first)],
  }),
  /set_duplicate_authorization/u,
);

const contract=qualifyApollyonDurableAttemptClaimAuthorizationSlotContractV1();
assert.equal(
  contract.status,
  "atomic_authorization_claim_slot_source_contract_defined_unimplemented",
);
assert.equal(contract.store_policy_id,ACCEPTED_STORE_POLICY_ID);
assert.equal(contract.claim_state_root,"/var/lib/void-apollyon-attempt-claim-v2");
assert.equal(contract.claim_service_user,"voidapollyonclaim");
assert.equal(contract.claim_publisher_user,"voidapollyonclaimpub");
assert.equal(contract.protected_authorization_slot_store_proven,false);
assert.equal(contract.same_protected_claim_root_binding_performed,false);
assert.equal(contract.claim_service_only_slot_writer_proven,false);
assert.equal(contract.claim_record_semantic_revalidation_performed,false);
assert.equal(contract.terminal_receipt_revalidation_performed,false);
assert.equal(contract.publish_request_revalidation_performed,false);
assert.equal(contract.authorization_slot_publication_performed,false);
assert.equal(contract.durable_attempt_claim_performed,false);
assert.equal(contract.attempt_claim_authorized,false);
assert.equal(contract.attempt_claimed,false);
assert.equal(contract.training_start_admission,false);
assert.equal(contract.training_execution_authorized,false);
assert.equal(contract.training_execution_performed,false);
assert.equal(contract.candidate_weight_mutation_performed,false);
assert.equal(
  contract.next_gate,
  "apollyon_durable_attempt_claim_store_service_source_implementation_v2",
);
assert.match(
  contract.authorization_slot_contract_id,
  /^apollyon_attempt_claim_auth_slot_contract_v1:[0-9a-f]{64}$/u,
);

for(const [key,expected] of Object.entries({
  authorization_slot_store_policy_independent_required:true,
  authorization_slot_terminal_independent_required:true,
  authorization_slot_store_contract_independent_required:true,
  authorization_slot_store_generation_independent_required:true,
  authorization_slot_claim_record_independent_required:true,
  authorization_slot_publish_request_independent_required:true,
  protected_namespace_create_once_by_authorization_slot_required:true,
  authorization_slot_namespace_same_protected_claim_root_required:true,
  authorization_slot_claim_service_only_writer_required:true,
  authorization_slot_publisher_write_rename_unlink_denied_required:true,
  authorization_slot_training_write_rename_unlink_denied_required:true,
  authorization_slot_custody_write_rename_unlink_denied_required:true,
  authorization_slot_private_pending_publication_required:true,
  authorization_slot_final_not_written_directly_required:true,
  authorization_slot_create_only_atomic_publication_required:true,
  authorization_slot_crash_state_classification_required:true,
  authorization_slot_and_claim_same_generation_serialization_required:true,
  store_migration_excluded_during_slot_claim_transaction_required:true,
  exact_claim_revalidation_repeated_after_slot_durable_before_claim_publication_required:true,
  current_store_generation_revalidated_after_slot_durable_before_claim_publication_required:true,
  exact_claim_record_semantic_revalidation_before_slot_reservation_required:true,
  exact_terminal_receipt_revalidation_before_slot_reservation_required:true,
  exact_publish_request_revalidation_before_slot_reservation_required:true,
  authorization_slot_reservation_precedes_claim_success_required:true,
  exact_same_claim_slot_recovery_required:true,
  different_claim_in_occupied_slot_rejected_required:true,
  concurrent_same_authorization_different_terminal_at_most_one_success_required:true,
  migration_preserves_authorization_slots_required:true,
  authorization_slot_identity_stable_across_store_generation_migration_required:true,
  authorization_slot_identity_stable_across_store_policy_upgrade_required:true,
  migration_authorization_slot_records_byte_identical_required:true,
  migration_authorization_slot_set_commitment_required:true,
  migration_authorization_slot_set_count_required:true,
  migration_authorization_slot_set_sha256_required:true,
  migration_authorization_slot_drop_or_rewrite_rejected_required:true,
  migration_unresolved_slot_without_exact_durable_claim_forbidden_required:true,
  migration_authorization_slot_claim_set_cross_binding_required:true,
  migration_parent_store_continuity_receipt_revalidation_required:true,
  training_start_consumption_must_revalidate_unique_authorization_claim_required:true,
})){
  assert.equal(
    VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_AUTHORIZATION_SLOT_REQUIREMENTS_V1[key],
    expected,key,
  );
}
for(const [key,expected] of Object.entries({
  source_only_contract:true,
  protected_authorization_slot_store_proven:false,
  same_protected_claim_root_binding_performed:false,
  claim_service_only_slot_writer_proven:false,
  protected_claim_record_origin_proven:false,
  claim_record_semantic_revalidation_performed:false,
  terminal_receipt_revalidation_performed:false,
  publish_request_revalidation_performed:false,
  store_generation_revalidation_performed:false,
  parent_store_continuity_receipt_revalidation_performed:false,
  authorization_slot_set_migration_continuity_performed:false,
  authorization_slot_publication_performed:false,
  durable_attempt_claim_performed:false,
  attempt_claim_authorized:false,
  attempt_claimed:false,
  training_start_admission:false,
  training_execution_authorized:false,
  training_execution_performed:false,
  candidate_weight_mutation_performed:false,
  filesystem_read:false,filesystem_write:false,network_access:false,
  service_action:false,socket_action:false,operator_private_key_access:false,
  production_signing:false,wallet_access:false,transaction_signing:false,
  transaction_broadcast:false,funds_movement:false,
})){
  assert.equal(
    VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_AUTHORIZATION_SLOT_AUTHORITY_V1[key],
    expected,key,
  );
}

const source=fs.readFileSync(
  path.join(ROOT,"tools/apollyon-durable-attempt-claim-authorization-slot-v1.mjs"),
  "utf8",
);
for(const required of [
  "authorization_slot_store_policy_independent_required:true",
  "authorization_slot_terminal_independent_required:true",
  "authorization_slot_store_generation_independent_required:true",
  "protected_namespace_create_once_by_authorization_slot_required:true",
  "authorization_slot_namespace_same_protected_claim_root_required:true",
  "authorization_slot_private_pending_publication_required:true",
  "authorization_slot_and_claim_same_generation_serialization_required:true",
  "migration_unresolved_slot_without_exact_durable_claim_forbidden_required:true",
  "exact_claim_record_semantic_revalidation_before_slot_reservation_required:true",
  "exact_terminal_receipt_revalidation_before_slot_reservation_required:true",
  "exact_publish_request_revalidation_before_slot_reservation_required:true",
  "concurrent_same_authorization_different_terminal_at_most_one_success_required:true",
  "training_start_consumption_must_revalidate_unique_authorization_claim_required:true",
  'next_gate:"apollyon_durable_attempt_claim_store_service_source_implementation_v2"',
])assert.equal(source.includes(required),true,required);
for(const forbidden of [
  'from "node:fs"','from "node:net"','from "node:child_process"',
  "writeFile","appendFile","systemctl","spawn(","execFile(","fetch(",
  "createPrivateKey","crypto.sign(","authorization_slot_publication_performed:true",
  "durable_attempt_claim_performed:true","attempt_claim_authorized:true",
  "attempt_claimed:true","training_start_admission:true",
  "training_execution_authorized:true","training_execution_performed:true",
  "candidate_weight_mutation_performed:true","filesystem_write:true",
  "service_action:true","socket_action:true","funds_movement:true",
])assert.equal(source.includes(forbidden),false,forbidden);

console.log("VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_AUTHORIZATION_SLOT_V1_PROOF_GREEN");
console.log("same_authorization_different_claim_same_slot=true");
console.log("different_claim_in_occupied_slot_rejected=true");
console.log("authorization_slot_store_policy_independent=true");
console.log("authorization_slot_store_generation_independent=true");
console.log("same_protected_claim_root_binding_required=true");
console.log("authorization_slot_private_pending_publication_required=true");
console.log("slot_claim_same_generation_serialization_required=true");
console.log("claim_record_semantic_revalidation_performed=false");
console.log("terminal_receipt_revalidation_performed=false");
console.log("publish_request_revalidation_performed=false");
console.log("migration_preserves_authorization_slots_required=true");
console.log("migration_authorization_slot_set_commitment_proven=true");
console.log("migration_slot_drop_or_rewrite_rejected=true");
console.log("authorization_slot_publication_performed=false");
console.log("durable_attempt_claim_performed=false");
console.log("training_execution=false");
