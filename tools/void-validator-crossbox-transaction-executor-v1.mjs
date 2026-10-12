#!/usr/bin/env node
import crypto from "node:crypto";

import {
  VOID_CROSSBOX_MUTATION_TRANSACTION_CONFIRMATION_V1,
  beginVoidCrossboxMutationCommitV1,
  beginVoidCrossboxMutationRollbackV1,
  finalizeVoidCrossboxMutationCommittedV1,
  finalizeVoidCrossboxMutationRestoredV1,
  holdVoidCrossboxMutationTransactionV1,
  nextVoidCrossboxMutationRecoveryV1,
  prepareVoidCrossboxMutationTransactionV1,
  recordVoidCrossboxMutationPreparedV1,
  recordVoidCrossboxMutationPublishNoEffectV1,
  recordVoidCrossboxMutationPublishStartedV1,
  recordVoidCrossboxMutationPublishedV1,
  recordVoidCrossboxMutationRestoreStartedV1,
  recordVoidCrossboxMutationRestoredV1,
  recordVoidCrossboxMutationVerifiedV1,
} from "./void-crossbox-mutation-transaction-v1.mjs";

export const VOID_VALIDATOR_CROSSBOX_TRANSACTION_EXECUTOR_V1 =
  "VOID_VALIDATOR_CROSSBOX_TRANSACTION_EXECUTOR_V1";

export const VOID_VALIDATOR_CROSSBOX_TRANSACTION_EXECUTOR_CONFIRMATION_V1 =
  "prepareReviewedValidatorCrossboxTransactionExecutorV1";

export const VOID_VALIDATOR_CROSSBOX_TRANSACTION_EXECUTOR_AUTHORITY_V1 =
  Object.freeze({
    source_journal_executor_only: true,
    generic_transaction_contract_required: true,
    append_only_replay_required: true,
    two_participant_prepare_required: true,
    observation_before_recovery_required: true,
    fresh_checkpoint_tag_absence_required: true,
    checkpoint_after_two_party_commit_only: true,
    ssh_execution: false,
    systemd_mutation: false,
    service_restart: false,
    validator_publication: false,
    git_tag_creation: false,
    git_push: false,
    runtime_mutation: false,
    credential_access: false,
    key_access: false,
    wallet_or_signer_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    work_credit_mutation: false,
    funds_movement: false,
  });

const JOURNAL_ID=/^voidvcxj1_[0-9a-f]{64}$/u;
const AUTHORIZATION_ID=/^voidvcxa1_[0-9a-f]{64}$/u;
const MAX_EVENTS=512;

function fail(code){throw new Error(code);}

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

function deepFreeze(value){
  if(!value||typeof value!=="object"||Object.isFrozen(value))return value;
  for(const child of Object.values(value))deepFreeze(child);
  return Object.freeze(value);
}

function clone(value){return structuredClone(value);}

function exactObject(value,keys,code){
  if(!value||typeof value!=="object"||Array.isArray(value))fail(code);
  const actual=Object.keys(value).sort();
  const expected=[...keys].sort();
  if(
    actual.length!==expected.length||
    actual.some((key,index)=>key!==expected[index])
  )fail(code);
  return value;
}

function normalizeReason(value,code){
  const text=String(value??"").trim();
  if(!text||text.length>256||/[\r\n\0]/u.test(text))fail(code);
  return text;
}

function normalizePrepare(input){
  exactObject(
    input,
    ["source","prestate","intended","confirmation"],
    "validator_executor_prepare_shape",
  );
  if(
    input.confirmation!==
      VOID_VALIDATOR_CROSSBOX_TRANSACTION_EXECUTOR_CONFIRMATION_V1
  )fail("validator_executor_confirmation_required");

  exactObject(
    input.intended,
    [
      "epoch",
      "vault_name",
      "manifest_set_sha256",
      "checkpoint_tag",
      "checkpoint_tag_preexisting",
    ],
    "validator_executor_intended_shape",
  );

  const transaction=prepareVoidCrossboxMutationTransactionV1({
    kind:"validator_truth_closeout",
    source:clone(input.source),
    prestate:clone(input.prestate),
    intended:{
      ...clone(input.intended),
      restart_if_active:{
        local:true,
        remote:true,
      },
    },
    confirmation:VOID_CROSSBOX_MUTATION_TRANSACTION_CONFIRMATION_V1,
  });

  const prepare=deepFreeze({
    source:clone(transaction.source),
    prestate:clone(transaction.prestate),
    intended:{
      epoch:transaction.intended.epoch,
      vault_name:transaction.intended.vault_name,
      manifest_set_sha256:transaction.intended.manifest_set_sha256,
      checkpoint_tag:transaction.intended.checkpoint_tag,
      checkpoint_tag_preexisting:
        transaction.intended.checkpoint_tag_preexisting,
    },
    confirmation:
      VOID_VALIDATOR_CROSSBOX_TRANSACTION_EXECUTOR_CONFIRMATION_V1,
  });

  return {prepare,transaction};
}

function participantFromReceipt(event,code){
  const participant=event.receipt?.participant;
  if(!["local","remote"].includes(participant))fail(code);
  return participant;
}

function applyEvent(transaction,event){
  if(!event||typeof event!=="object"||Array.isArray(event)){
    fail("validator_executor_event_shape");
  }
  const type=String(event.type??"");

  switch(type){
    case "PREPARED":{
      exactObject(event,["type","receipt"],"validator_executor_prepared_event_shape");
      const participant=participantFromReceipt(
        event,
        "validator_executor_prepared_participant",
      );
      const next=recordVoidCrossboxMutationPreparedV1(
        transaction,
        clone(event.receipt),
      );
      return {
        transaction:next,
        event:deepFreeze({
          type,
          receipt:clone(next.prepared[participant]),
        }),
      };
    }

    case "BEGIN_COMMIT":{
      exactObject(event,["type"],"validator_executor_begin_commit_event_shape");
      const next=beginVoidCrossboxMutationCommitV1(transaction);
      return {transaction:next,event:deepFreeze({type})};
    }

    case "PUBLISH_STARTED":{
      exactObject(
        event,
        ["type","receipt"],
        "validator_executor_publish_started_event_shape",
      );
      const participant=participantFromReceipt(
        event,
        "validator_executor_publish_started_participant",
      );
      const next=recordVoidCrossboxMutationPublishStartedV1(
        transaction,
        clone(event.receipt),
      );
      return {
        transaction:next,
        event:deepFreeze({
          type,
          receipt:clone(next.publish_started[participant]),
        }),
      };
    }

    case "PUBLISH_NO_EFFECT":{
      exactObject(
        event,
        ["type","receipt"],
        "validator_executor_publish_no_effect_event_shape",
      );
      const participant=participantFromReceipt(
        event,
        "validator_executor_publish_no_effect_participant",
      );
      const next=recordVoidCrossboxMutationPublishNoEffectV1(
        transaction,
        clone(event.receipt),
      );
      return {
        transaction:next,
        event:deepFreeze({
          type,
          receipt:clone(next.publish_no_effect[participant]),
        }),
      };
    }

    case "PUBLISHED":{
      exactObject(event,["type","receipt"],"validator_executor_published_event_shape");
      const participant=participantFromReceipt(
        event,
        "validator_executor_published_participant",
      );
      const next=recordVoidCrossboxMutationPublishedV1(
        transaction,
        clone(event.receipt),
      );
      return {
        transaction:next,
        event:deepFreeze({
          type,
          receipt:clone(next.published[participant]),
        }),
      };
    }

    case "VERIFIED":{
      exactObject(event,["type","receipt"],"validator_executor_verified_event_shape");
      const participant=participantFromReceipt(
        event,
        "validator_executor_verified_participant",
      );
      const next=recordVoidCrossboxMutationVerifiedV1(
        transaction,
        clone(event.receipt),
      );
      return {
        transaction:next,
        event:deepFreeze({
          type,
          receipt:clone(next.verified[participant]),
        }),
      };
    }

    case "FINALIZE_COMMIT":{
      exactObject(
        event,
        ["type","checkpoint_tag_absent_verified"],
        "validator_executor_finalize_commit_event_shape",
      );
      if(event.checkpoint_tag_absent_verified!==true){
        fail("validator_executor_checkpoint_tag_absence_required");
      }
      const next=finalizeVoidCrossboxMutationCommittedV1(
        transaction,
        {checkpoint_tag_absent_verified:true},
      );
      return {
        transaction:next,
        event:deepFreeze({
          type,
          checkpoint_tag_absent_verified:true,
        }),
      };
    }

    case "BEGIN_ROLLBACK":{
      exactObject(
        event,
        ["type","reason"],
        "validator_executor_begin_rollback_event_shape",
      );
      const reason=normalizeReason(
        event.reason,
        "validator_executor_rollback_reason_invalid",
      );
      if(
        transaction.phase==="ROLLING_BACK"&&
        transaction.rollback_reason!==reason
      )fail("validator_executor_rollback_reason_conflict");
      const next=beginVoidCrossboxMutationRollbackV1(transaction,reason);
      return {
        transaction:next,
        event:deepFreeze({type,reason:next.rollback_reason}),
      };
    }

    case "RESTORE_STARTED":{
      exactObject(
        event,
        ["type","receipt"],
        "validator_executor_restore_started_event_shape",
      );
      const participant=participantFromReceipt(
        event,
        "validator_executor_restore_started_participant",
      );
      const next=recordVoidCrossboxMutationRestoreStartedV1(
        transaction,
        clone(event.receipt),
      );
      return {
        transaction:next,
        event:deepFreeze({
          type,
          receipt:clone(next.restore_started[participant]),
        }),
      };
    }

    case "RESTORED":{
      exactObject(event,["type","receipt"],"validator_executor_restored_event_shape");
      const participant=participantFromReceipt(
        event,
        "validator_executor_restored_participant",
      );
      const next=recordVoidCrossboxMutationRestoredV1(
        transaction,
        clone(event.receipt),
      );
      return {
        transaction:next,
        event:deepFreeze({
          type,
          receipt:clone(next.restored[participant]),
        }),
      };
    }

    case "FINALIZE_RESTORE":{
      exactObject(
        event,
        ["type"],
        "validator_executor_finalize_restore_event_shape",
      );
      const next=finalizeVoidCrossboxMutationRestoredV1(transaction);
      return {transaction:next,event:deepFreeze({type})};
    }

    case "HOLD":{
      exactObject(event,["type","reason"],"validator_executor_hold_event_shape");
      const reason=normalizeReason(
        event.reason,
        "validator_executor_hold_reason_invalid",
      );
      const next=holdVoidCrossboxMutationTransactionV1(transaction,reason);
      return {
        transaction:next,
        event:deepFreeze({type,reason:next.rollback_reason}),
      };
    }

    default:
      fail("validator_executor_event_type_invalid");
  }
}

function journalMaterial(prepare,events){
  return {
    marker:VOID_VALIDATOR_CROSSBOX_TRANSACTION_EXECUTOR_V1,
    version:1,
    prepare,
    events,
  };
}

export function replayVoidValidatorCrossboxTransactionExecutorV1(input){
  exactObject(input,["prepare","events"],"validator_executor_replay_shape");
  if(!Array.isArray(input.events)||input.events.length>MAX_EVENTS){
    fail("validator_executor_events_invalid");
  }

  const normalized=normalizePrepare(input.prepare);
  let transaction=normalized.transaction;
  const events=[];

  for(const rawEvent of input.events){
    const applied=applyEvent(transaction,rawEvent);
    transaction=applied.transaction;
    events.push(applied.event);
  }

  const material=journalMaterial(normalized.prepare,events);
  const journalId=
    "voidvcxj1_"+sha256(Buffer.from(canonical(material),"utf8"));
  const nextAction=nextVoidCrossboxMutationRecoveryV1(transaction);

  return deepFreeze({
    ...material,
    journal_id:journalId,
    transaction:clone(transaction),
    next_action:nextAction,
    checkpoint_publish_allowed:
      transaction.phase==="COMMITTED"&&
      transaction.checkpoint_publish_allowed===true,
    authority:VOID_VALIDATOR_CROSSBOX_TRANSACTION_EXECUTOR_AUTHORITY_V1,
  });
}

export function validateVoidValidatorCrossboxTransactionExecutorJournalV1(
  journal,
){
  exactObject(
    journal,
    [
      "marker",
      "version",
      "prepare",
      "events",
      "journal_id",
      "transaction",
      "next_action",
      "checkpoint_publish_allowed",
      "authority",
    ],
    "validator_executor_journal_shape",
  );
  if(
    journal.marker!==VOID_VALIDATOR_CROSSBOX_TRANSACTION_EXECUTOR_V1||
    journal.version!==1||
    !JOURNAL_ID.test(String(journal.journal_id??""))
  )fail("validator_executor_journal_identity_invalid");
  if(
    canonical(journal.authority)!==
    canonical(VOID_VALIDATOR_CROSSBOX_TRANSACTION_EXECUTOR_AUTHORITY_V1)
  )fail("validator_executor_authority_mismatch");

  const replayed=replayVoidValidatorCrossboxTransactionExecutorV1({
    prepare:journal.prepare,
    events:journal.events,
  });
  if(canonical(replayed)!==canonical(journal)){
    fail("validator_executor_journal_replay_mismatch");
  }
  return replayed;
}

export function appendVoidValidatorCrossboxTransactionExecutorEventV1(
  journal,
  event,
){
  const current=validateVoidValidatorCrossboxTransactionExecutorJournalV1(
    journal,
  );
  if(current.events.length>=MAX_EVENTS)fail("validator_executor_event_limit");
  return replayVoidValidatorCrossboxTransactionExecutorV1({
    prepare:current.prepare,
    events:[...current.events,clone(event)],
  });
}

export function authorizeVoidValidatorCrossboxCheckpointPublicationV1(
  journal,
  observation,
){
  const current=validateVoidValidatorCrossboxTransactionExecutorJournalV1(
    journal,
  );
  exactObject(
    observation,
    [
      "repository_head_sha",
      "checkpoint_tag",
      "checkpoint_tag_absent_verified",
    ],
    "validator_executor_checkpoint_observation_shape",
  );

  if(
    current.transaction.phase!=="COMMITTED"||
    current.next_action!=="DONE_COMMITTED"||
    current.checkpoint_publish_allowed!==true||
    current.transaction.checkpoint_publish_allowed!==true
  )fail("validator_executor_checkpoint_requires_committed_transaction");

  if(
    observation.repository_head_sha!==
      current.transaction.source.repository_head_sha
  )fail("validator_executor_checkpoint_head_mismatch");
  if(
    observation.checkpoint_tag!==current.transaction.intended.checkpoint_tag
  )fail("validator_executor_checkpoint_tag_mismatch");
  if(observation.checkpoint_tag_absent_verified!==true){
    fail("validator_executor_checkpoint_fresh_absence_required");
  }

  const material={
    marker:"VOID_VALIDATOR_CROSSBOX_CHECKPOINT_PUBLICATION_AUTHORIZATION_V1",
    version:1,
    journal_id:current.journal_id,
    transaction_id:current.transaction.transaction_id,
    transaction_state_id:current.transaction.state_id,
    repository_head_sha:current.transaction.source.repository_head_sha,
    checkpoint_tag:current.transaction.intended.checkpoint_tag,
    checkpoint_tag_absent_verified:true,
    publication_performed:false,
    authority:Object.freeze({
      source_authorization_only:true,
      exact_committed_transaction_required:true,
      fresh_tag_absence_required:true,
      git_tag_creation:false,
      git_push:false,
      ssh_execution:false,
      systemd_mutation:false,
      validator_publication:false,
      funds_movement:false,
    }),
  };

  return deepFreeze({
    ...material,
    authorization_id:
      "voidvcxa1_"+sha256(Buffer.from(canonical(material),"utf8")),
  });
}
