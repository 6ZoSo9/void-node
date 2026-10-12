#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  VOID_VALIDATOR_CROSSBOX_TRANSACTION_EXECUTOR_AUTHORITY_V1,
  VOID_VALIDATOR_CROSSBOX_TRANSACTION_EXECUTOR_CONFIRMATION_V1,
  VOID_VALIDATOR_CROSSBOX_TRANSACTION_EXECUTOR_V1,
  appendVoidValidatorCrossboxTransactionExecutorEventV1,
  authorizeVoidValidatorCrossboxCheckpointPublicationV1,
  replayVoidValidatorCrossboxTransactionExecutorV1,
  validateVoidValidatorCrossboxTransactionExecutorJournalV1,
} from "../tools/void-validator-crossbox-transaction-executor-v1.mjs";

function canonical(value){
  if(value===null||typeof value!=="object")return JSON.stringify(value);
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  return "{"+Object.keys(value).sort().map(
    key=>JSON.stringify(key)+":"+canonical(value[key]),
  ).join(",")+"}";
}

function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}

function prestateId(transaction,participant){
  return "sha256:"+sha256(
    Buffer.from(canonical(transaction.prestate[participant]),"utf8"),
  );
}

function validatorInput(){
  return {
    source:{
      repository_head_sha:"b".repeat(40),
      local_host:"Precision",
      remote_host:"Xiphos",
    },
    prestate:{
      local:{
        host:"precision",
        repository_head_sha:"b".repeat(40),
        verified_current:{
          exists:true,
          identity_sha256:"5".repeat(64),
        },
        shadow_runtime_identity_sha256:"6".repeat(64),
        service:{
          active:true,
          invocation_id:"a".repeat(32),
        },
      },
      remote:{
        host:"xiphos",
        repository_head_sha:"b".repeat(40),
        verified_current:{
          exists:true,
          identity_sha256:"7".repeat(64),
        },
        shadow_runtime_identity_sha256:"8".repeat(64),
        service:{
          active:true,
          invocation_id:"b".repeat(32),
        },
      },
    },
    intended:{
      epoch:127,
      vault_name:"epoch2-qbft",
      manifest_set_sha256:"9".repeat(64),
      checkpoint_tag:"ckpt-validator127-crossbox-green",
      checkpoint_tag_preexisting:false,
    },
    confirmation:
      VOID_VALIDATOR_CROSSBOX_TRANSACTION_EXECUTOR_CONFIRMATION_V1,
  };
}

function prepareReceipt(transaction,participant){
  return {
    transaction_id:transaction.transaction_id,
    participant,
    prestate_id:prestateId(transaction,participant),
    staged_state_sha256:transaction.intended.manifest_set_sha256,
    publication_performed:false,
  };
}

function publishStartedReceipt(transaction,participant){
  const restart=(
    transaction.intended.restart_if_active[participant]===true&&
    transaction.prestate[participant].service.active===true
  );
  return {
    transaction_id:transaction.transaction_id,
    participant,
    prestate_id_before_publish:prestateId(transaction,participant),
    published_state_sha256:transaction.intended.manifest_set_sha256,
    restart_expected:restart,
    restart_before_invocation_id:restart
      ?transaction.prestate[participant].service.invocation_id
      :null,
    publication_performed:false,
  };
}

function publishNoEffectReceipt(transaction,participant){
  const active=transaction.prestate[participant].service.active;
  return {
    transaction_id:transaction.transaction_id,
    participant,
    observed_prestate_id:prestateId(transaction,participant),
    service_active:active,
    service_invocation_id:active
      ?transaction.prestate[participant].service.invocation_id
      :null,
    publication_performed:false,
    restart_performed:false,
  };
}

function publishReceipt(transaction,participant,after){
  const restart=(
    transaction.intended.restart_if_active[participant]===true&&
    transaction.prestate[participant].service.active===true
  );
  return {
    transaction_id:transaction.transaction_id,
    participant,
    prestate_id_before_publish:prestateId(transaction,participant),
    published_state_sha256:transaction.intended.manifest_set_sha256,
    restart_performed:restart,
    restart_before_invocation_id:restart
      ?transaction.prestate[participant].service.invocation_id
      :null,
    restart_after_invocation_id:restart?after:null,
  };
}

function verifyReceipt(transaction,participant){
  const active=transaction.prestate[participant].service.active;
  const restart=(
    transaction.intended.restart_if_active[participant]===true&&
    active
  );
  return {
    transaction_id:transaction.transaction_id,
    participant,
    observed_state_sha256:transaction.intended.manifest_set_sha256,
    service_active:active,
    service_invocation_id:active
      ?restart
        ?transaction.published[participant].restart_after_invocation_id
        :transaction.prestate[participant].service.invocation_id
      :null,
    intended_state_verified:true,
  };
}

function restoreStartedReceipt(transaction,participant){
  const published=transaction.published[participant];
  const restart=Boolean(
    published&&
    transaction.intended.restart_if_active[participant]===true&&
    transaction.prestate[participant].service.active===true
  );
  return {
    transaction_id:transaction.transaction_id,
    participant,
    restored_prestate_id:prestateId(transaction,participant),
    restart_expected:restart,
    restart_before_invocation_id:restart
      ?published.restart_after_invocation_id
      :null,
    restoration_performed:false,
  };
}

function restoreReceipt(transaction,participant,after){
  const published=transaction.published[participant];
  const restart=Boolean(
    published&&
    transaction.intended.restart_if_active[participant]===true&&
    transaction.prestate[participant].service.active===true
  );
  return {
    transaction_id:transaction.transaction_id,
    participant,
    restored_prestate_id:prestateId(transaction,participant),
    service_state_restored:true,
    restart_performed:restart,
    restart_before_invocation_id:restart
      ?published.restart_after_invocation_id
      :null,
    restart_after_invocation_id:restart?after:null,
    verified_current_restored:true,
    shadow_runtime_restored:true,
  };
}

function append(journal,event){
  return appendVoidValidatorCrossboxTransactionExecutorEventV1(
    journal,
    event,
  );
}

function preparedJournal(input=validatorInput()){
  let journal=replayVoidValidatorCrossboxTransactionExecutorV1({
    prepare:input,
    events:[],
  });
  journal=append(journal,{
    type:"PREPARED",
    receipt:prepareReceipt(journal.transaction,"local"),
  });
  journal=append(journal,{
    type:"PREPARED",
    receipt:prepareReceipt(journal.transaction,"remote"),
  });
  return journal;
}

function committingJournal(input=validatorInput()){
  return append(preparedJournal(input),{type:"BEGIN_COMMIT"});
}

assert.equal(
  VOID_VALIDATOR_CROSSBOX_TRANSACTION_EXECUTOR_V1,
  "VOID_VALIDATOR_CROSSBOX_TRANSACTION_EXECUTOR_V1",
);
assert.equal(
  VOID_VALIDATOR_CROSSBOX_TRANSACTION_EXECUTOR_AUTHORITY_V1
    .source_journal_executor_only,
  true,
);
assert.equal(
  VOID_VALIDATOR_CROSSBOX_TRANSACTION_EXECUTOR_AUTHORITY_V1
    .validator_publication,
  false,
);
assert.equal(
  VOID_VALIDATOR_CROSSBOX_TRANSACTION_EXECUTOR_AUTHORITY_V1.funds_movement,
  false,
);

// Initial prepare is normalized through the generic reviewed contract.
{
  const journal=replayVoidValidatorCrossboxTransactionExecutorV1({
    prepare:validatorInput(),
    events:[],
  });
  assert.match(journal.journal_id,/^voidvcxj1_[0-9a-f]{64}$/u);
  assert.equal(journal.prepare.source.local_host,"precision");
  assert.equal(journal.prepare.source.remote_host,"xiphos");
  assert.equal(journal.transaction.kind,"validator_truth_closeout");
  assert.equal(journal.transaction.intended.restart_if_active.local,true);
  assert.equal(journal.transaction.intended.restart_if_active.remote,true);
  assert.equal(journal.next_action,"PREPARE_LOCAL");
  assert.equal(journal.checkpoint_publish_allowed,false);
  assert.equal(
    validateVoidValidatorCrossboxTransactionExecutorJournalV1(journal)
      .journal_id,
    journal.journal_id,
  );
}

// Exact duplicate prepare receipts are idempotent before commit; conflicts fail.
{
  let journal=replayVoidValidatorCrossboxTransactionExecutorV1({
    prepare:validatorInput(),
    events:[],
  });
  const receipt=prepareReceipt(journal.transaction,"local");
  journal=append(journal,{type:"PREPARED",receipt});
  const duplicate=append(journal,{type:"PREPARED",receipt});
  assert.equal(
    duplicate.transaction.prepared.local.prestate_id,
    journal.transaction.prepared.local.prestate_id,
  );
  const conflict=structuredClone(receipt);
  conflict.prestate_id="sha256:"+"0".repeat(64);
  assert.throws(
    ()=>append(journal,{type:"PREPARED",receipt:conflict}),
    /(prepare_prestate_id_mismatch|prepared_receipt_conflict)/u,
  );
}

// Full two-party commit remains checkpoint-ineligible until both verify.
let committed;
{
  let journal=committingJournal();
  assert.equal(journal.next_action,"BEGIN_PUBLISH_LOCAL");

  assert.throws(
    ()=>authorizeVoidValidatorCrossboxCheckpointPublicationV1(
      journal,
      {
        repository_head_sha:"b".repeat(40),
        checkpoint_tag:"ckpt-validator127-crossbox-green",
        checkpoint_tag_absent_verified:true,
      },
    ),
    /validator_executor_checkpoint_requires_committed_transaction/u,
  );

  journal=append(journal,{
    type:"PUBLISH_STARTED",
    receipt:publishStartedReceipt(journal.transaction,"local"),
  });
  assert.equal(journal.next_action,"RECOVER_PUBLISH_LOCAL");

  journal=append(journal,{
    type:"PUBLISHED",
    receipt:publishReceipt(journal.transaction,"local","c".repeat(32)),
  });
  journal=append(journal,{
    type:"VERIFIED",
    receipt:verifyReceipt(journal.transaction,"local"),
  });
  assert.equal(journal.next_action,"BEGIN_PUBLISH_REMOTE");

  journal=append(journal,{
    type:"PUBLISH_STARTED",
    receipt:publishStartedReceipt(journal.transaction,"remote"),
  });
  journal=append(journal,{
    type:"PUBLISHED",
    receipt:publishReceipt(journal.transaction,"remote","d".repeat(32)),
  });

  assert.throws(
    ()=>append(journal,{
      type:"FINALIZE_COMMIT",
      checkpoint_tag_absent_verified:true,
    }),
    /commit_requires_two_verified_participants/u,
  );

  journal=append(journal,{
    type:"VERIFIED",
    receipt:verifyReceipt(journal.transaction,"remote"),
  });
  assert.equal(journal.next_action,"FINALIZE_COMMIT");

  journal=append(journal,{
    type:"FINALIZE_COMMIT",
    checkpoint_tag_absent_verified:true,
  });
  assert.equal(journal.transaction.phase,"COMMITTED");
  assert.equal(journal.next_action,"DONE_COMMITTED");
  assert.equal(journal.checkpoint_publish_allowed,true);

  const auth=authorizeVoidValidatorCrossboxCheckpointPublicationV1(
    journal,
    {
      repository_head_sha:"b".repeat(40),
      checkpoint_tag:"ckpt-validator127-crossbox-green",
      checkpoint_tag_absent_verified:true,
    },
  );
  assert.match(auth.authorization_id,/^voidvcxa1_[0-9a-f]{64}$/u);
  assert.equal(auth.publication_performed,false);
  assert.equal(auth.authority.git_tag_creation,false);
  assert.equal(auth.authority.git_push,false);

  assert.throws(
    ()=>authorizeVoidValidatorCrossboxCheckpointPublicationV1(
      journal,
      {
        repository_head_sha:"a".repeat(40),
        checkpoint_tag:"ckpt-validator127-crossbox-green",
        checkpoint_tag_absent_verified:true,
      },
    ),
    /validator_executor_checkpoint_head_mismatch/u,
  );
  assert.throws(
    ()=>authorizeVoidValidatorCrossboxCheckpointPublicationV1(
      journal,
      {
        repository_head_sha:"b".repeat(40),
        checkpoint_tag:"wrong-tag",
        checkpoint_tag_absent_verified:true,
      },
    ),
    /validator_executor_checkpoint_tag_mismatch/u,
  );
  assert.throws(
    ()=>authorizeVoidValidatorCrossboxCheckpointPublicationV1(
      journal,
      {
        repository_head_sha:"b".repeat(40),
        checkpoint_tag:"ckpt-validator127-crossbox-green",
        checkpoint_tag_absent_verified:false,
      },
    ),
    /validator_executor_checkpoint_fresh_absence_required/u,
  );

  committed=journal;
}

// Replay is deterministic and derived fields cannot be forged independently.
{
  const replayed=replayVoidValidatorCrossboxTransactionExecutorV1({
    prepare:committed.prepare,
    events:committed.events,
  });
  assert.equal(replayed.journal_id,committed.journal_id);
  assert.equal(replayed.transaction.state_id,committed.transaction.state_id);

  const forged=structuredClone(committed);
  forged.transaction.phase="HOLD";
  assert.throws(
    ()=>validateVoidValidatorCrossboxTransactionExecutorJournalV1(forged),
    /validator_executor_journal_replay_mismatch/u,
  );

  const tampered=structuredClone(committed);
  tampered.events[0].receipt.staged_state_sha256="0".repeat(64);
  assert.throws(
    ()=>validateVoidValidatorCrossboxTransactionExecutorJournalV1(tampered),
    /prepare_staged_state_mismatch/u,
  );
}

// Crash seam: once publication intent is durable, recovery observes before retry.
{
  let journal=committingJournal();
  journal=append(journal,{
    type:"PUBLISH_STARTED",
    receipt:publishStartedReceipt(journal.transaction,"local"),
  });
  assert.equal(journal.next_action,"RECOVER_PUBLISH_LOCAL");

  journal=append(journal,{
    type:"PUBLISH_NO_EFFECT",
    receipt:publishNoEffectReceipt(journal.transaction,"local"),
  });
  assert.equal(journal.next_action,"BEGIN_ROLLBACK");

  journal=append(journal,{
    type:"BEGIN_ROLLBACK",
    reason:"local publication was proven to have no effect",
  });
  assert.equal(journal.next_action,"BEGIN_RESTORE_LOCAL");

  journal=append(journal,{
    type:"RESTORE_STARTED",
    receipt:restoreStartedReceipt(journal.transaction,"local"),
  });
  assert.equal(journal.next_action,"RECOVER_RESTORE_LOCAL");

  journal=append(journal,{
    type:"RESTORED",
    receipt:restoreReceipt(journal.transaction,"local",null),
  });
  journal=append(journal,{
    type:"RESTORE_STARTED",
    receipt:restoreStartedReceipt(journal.transaction,"remote"),
  });
  journal=append(journal,{
    type:"RESTORED",
    receipt:restoreReceipt(journal.transaction,"remote",null),
  });
  assert.equal(journal.next_action,"FINALIZE_RESTORE");

  journal=append(journal,{type:"FINALIZE_RESTORE"});
  assert.equal(journal.transaction.phase,"RESTORED");
  assert.equal(journal.next_action,"DONE_RESTORED");
  assert.equal(journal.checkpoint_publish_allowed,false);
}

// An inactive participant remains inactive even though restart-if-active is true.
{
  const input=validatorInput();
  input.prestate.remote.service={
    active:false,
    invocation_id:null,
  };
  let journal=committingJournal(input);
  journal=append(journal,{
    type:"PUBLISH_STARTED",
    receipt:publishStartedReceipt(journal.transaction,"local"),
  });
  journal=append(journal,{
    type:"PUBLISHED",
    receipt:publishReceipt(journal.transaction,"local","c".repeat(32)),
  });
  journal=append(journal,{
    type:"VERIFIED",
    receipt:verifyReceipt(journal.transaction,"local"),
  });
  journal=append(journal,{
    type:"PUBLISH_STARTED",
    receipt:publishStartedReceipt(journal.transaction,"remote"),
  });
  assert.equal(
    journal.transaction.publish_started.remote.restart_expected,
    false,
  );
  assert.equal(
    journal.transaction.publish_started.remote.restart_before_invocation_id,
    null,
  );
}

// Initial checkpoint-tag existence fails closed before a journal exists.
{
  const bad=validatorInput();
  bad.intended.checkpoint_tag_preexisting=true;
  assert.throws(
    ()=>replayVoidValidatorCrossboxTransactionExecutorV1({
      prepare:bad,
      events:[],
    }),
    /validator_checkpoint_tag_must_be_absent/u,
  );
}

// Executor confirmation, event type, event limit, and rollback reason are bounded.
{
  const bad=validatorInput();
  bad.confirmation="wrong";
  assert.throws(
    ()=>replayVoidValidatorCrossboxTransactionExecutorV1({
      prepare:bad,
      events:[],
    }),
    /validator_executor_confirmation_required/u,
  );

  const journal=replayVoidValidatorCrossboxTransactionExecutorV1({
    prepare:validatorInput(),
    events:[],
  });
  assert.throws(
    ()=>append(journal,{type:"UNKNOWN"}),
    /validator_executor_event_type_invalid/u,
  );

  const rolling=append(journal,{
    type:"BEGIN_ROLLBACK",
    reason:"operator cancelled before publication",
  });
  assert.throws(
    ()=>append(rolling,{
      type:"BEGIN_ROLLBACK",
      reason:"different reason",
    }),
    /validator_executor_rollback_reason_conflict/u,
  );
}

// The controller remains hermetic: it journals/replays authority but executes none.
const source=fs.readFileSync(
  "tools/void-validator-crossbox-transaction-executor-v1.mjs",
  "utf8",
);
for(const forbidden of [
  "child_process",
  "spawn(",
  "spawnSync(",
  "execFile(",
  "systemctl ",
  "ssh ",
  "git push",
  "git tag ",
  "fetch(",
  "eth_sendRawTransaction",
  "new Wallet(",
]){
  assert.equal(source.includes(forbidden),false,forbidden);
}

console.log("VOID_VALIDATOR_CROSSBOX_TRANSACTION_EXECUTOR_V1_PROOF_GREEN");
console.log("stacked_generic_transaction_contract=true");
console.log("append_only_semantic_replay=true");
console.log("two_party_prepare_required=true");
console.log("publish_crash_observation_before_retry=true");
console.log("rollback_exact_prestate_receipts_required=true");
console.log("inactive_service_preserved=true");
console.log("checkpoint_requires_two_party_commit=true");
console.log("checkpoint_requires_fresh_tag_absence=true");
console.log("checkpoint_authorization_executes_git=false");
console.log("ssh_execution=false");
console.log("systemd_mutation=false");
console.log("validator_publication=false");
console.log("funds_movement=false");
