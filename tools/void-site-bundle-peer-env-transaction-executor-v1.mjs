#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import {
  VOID_CROSSBOX_MUTATION_TRANSACTION_AUTHORITY_V1,
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

export const VOID_SITE_BUNDLE_PEER_ENV_TRANSACTION_EXECUTOR_V1 =
  "VOID_SITE_BUNDLE_PEER_ENV_TRANSACTION_EXECUTOR_V1";

export const VOID_SITE_BUNDLE_PEER_ENV_TRANSACTION_EXECUTOR_AUTHORITY_V1 =
  Object.freeze({
    reviewed_transaction_contract_required: true,
    durable_transition_before_publish_side_effect: true,
    durable_transition_before_restore_side_effect: true,
    observation_first_publish_recovery: true,
    observation_first_restore_recovery: true,
    exact_prestate_restore_required: true,
    participant_receipt_persistence_required: true,
    source_contract_authority_preserved: true,
    ssh_execution_adapter_required_for_remote: true,
    systemd_mutation_adapter_required_for_publish_restore: true,
    validator_publication: false,
    git_tag_creation: false,
    git_push: false,
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

const TX=/^voidxmtx1_[0-9a-f]{64}$/u;
const STATE=/^voidxms1_[0-9a-f]{64}$/u;
const INVOCATION=/^[0-9a-f]{32}$/u;
const SHA256=/^[0-9a-f]{64}$/u;
const PARTICIPANTS=Object.freeze(["local","remote"]);
const MANAGER_KEYS=Object.freeze([
  "VOID_SITE_BUNDLE_PEERS",
  "VOID_DATANET_SITE_BUNDLE_PEERS",
  "VOID_DATANET_PEERS",
  "VOID_DRIFT_PEER",
]);

function fail(code){throw new Error(code);}

function plain(value){
  return value!==null&&typeof value==="object"&&!Array.isArray(value);
}

function canonical(value){
  if(value===null||typeof value!=="object")return JSON.stringify(value);
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  return "{"+Object.keys(value).sort().map(
    (key)=>JSON.stringify(key)+":"+canonical(value[key]),
  ).join(",")+"}";
}

function sha256(bytes){
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function gitBlobSha1(value){
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(value);
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+String(bytes.length)+"\0","utf8"))
    .update(bytes)
    .digest("hex");
}

function same(left,right){
  return canonical(left)===canonical(right);
}

function exactManagerEnvironment(value){
  if(!plain(value))return false;
  const keys=Object.keys(value).sort();
  const expected=[...MANAGER_KEYS].sort();
  return (
    keys.length===expected.length&&
    keys.every((key,index)=>key===expected[index])&&
    expected.every((key)=>
      value[key]===null||(
        typeof value[key]==="string"&&!/[\r\n\0]/u.test(value[key])
      )
    )
  );
}

function validateTransaction(transaction){
  if(
    !plain(transaction)||
    transaction.marker!=="VOID_CROSSBOX_MUTATION_TRANSACTION_V1"||
    transaction.version!==1||
    transaction.kind!=="site_bundle_peer_env"||
    !TX.test(String(transaction.transaction_id||""))||
    !STATE.test(String(transaction.state_id||""))||
    !plain(transaction.prestate)||
    !plain(transaction.intended)||
    !plain(transaction.source)||
    canonical(transaction.authority)!==
      canonical(VOID_CROSSBOX_MUTATION_TRANSACTION_AUTHORITY_V1)
  ){
    fail("site_bundle_executor_transaction_invalid");
  }
  for(const participant of PARTICIPANTS){
    const prestate=transaction.prestate[participant];
    if(
      !plain(prestate)||
      !plain(prestate.dropin)||
      !plain(prestate.service)||
      !exactManagerEnvironment(prestate.manager_environment)
    ){
      fail("site_bundle_executor_prestate_invalid:"+participant);
    }
  }
  // nextVoidCrossboxMutationRecoveryV1 revalidates the full stored contract.
  nextVoidCrossboxMutationRecoveryV1(transaction);
  return transaction;
}

function participantPrestateId(transaction,participant){
  return "sha256:"+sha256(
    Buffer.from(canonical(transaction.prestate[participant]),"utf8"),
  );
}

function targetSha(transaction,participant){
  return participant==="local"
    ?transaction.intended.local_target_dropin_sha256
    :transaction.intended.remote_target_dropin_sha256;
}

function restartExpected(transaction,participant){
  return (
    transaction.intended.restart_if_active[participant]===true&&
    transaction.prestate[participant].service.active===true
  );
}

function managerCleared(value){
  return exactManagerEnvironment(value)&&
    MANAGER_KEYS.every((key)=>value[key]===null);
}

function observationShape(value,participant){
  if(
    !plain(value)||
    typeof value.host!=="string"||
    typeof value.repository_head_sha!=="string"||
    !plain(value.dropin)||
    typeof value.dropin.exists!=="boolean"||
    !plain(value.service)||
    typeof value.service.active!=="boolean"||
    !exactManagerEnvironment(value.manager_environment)
  ){
    fail("site_bundle_executor_observation_invalid:"+participant);
  }
  if(value.dropin.exists){
    if(
      !SHA256.test(String(value.dropin.sha256||""))||
      !/^[0-7]{3,4}$/u.test(String(value.dropin.mode||""))
    ){
      fail("site_bundle_executor_observation_dropin_invalid:"+participant);
    }
  }else if(value.dropin.sha256!==null||value.dropin.mode!==null){
    fail("site_bundle_executor_observation_dropin_invalid:"+participant);
  }
  if(value.service.active){
    if(
      !INVOCATION.test(String(value.service.invocation_id||""))||
      /^0{32}$/u.test(String(value.service.invocation_id||""))
    ){
      fail("site_bundle_executor_observation_invocation_invalid:"+participant);
    }
  }else if(value.service.invocation_id!==null){
    fail("site_bundle_executor_observation_invocation_invalid:"+participant);
  }
  return value;
}

function samePrestateExact(transaction,participant,observation){
  observationShape(observation,participant);
  return same(observation,transaction.prestate[participant]);
}

function sameDropin(left,right){
  return (
    left.exists===right.exists&&
    left.sha256===right.sha256&&
    left.mode===right.mode
  );
}

function targetStateObserved(transaction,participant,observation){
  observationShape(observation,participant);
  const prestate=transaction.prestate[participant];
  const expectedRestart=restartExpected(transaction,participant);
  if(
    observation.host!==transaction.prestate[participant].host||
    observation.repository_head_sha!==transaction.source.repository_head_sha||
    observation.dropin.exists!==true||
    observation.dropin.sha256!==targetSha(transaction,participant)||
    observation.dropin.mode!=="0644"||
    !managerCleared(observation.manager_environment)||
    observation.service.active!==prestate.service.active
  ){
    return false;
  }
  if(!prestate.service.active){
    return observation.service.invocation_id===null;
  }
  if(expectedRestart){
    return (
      INVOCATION.test(String(observation.service.invocation_id||""))&&
      observation.service.invocation_id!==prestate.service.invocation_id
    );
  }
  return observation.service.invocation_id===prestate.service.invocation_id;
}

function restoredStateObserved(
  transaction,
  participant,
  observation,
  {restartBefore=null}={},
){
  observationShape(observation,participant);
  const prestate=transaction.prestate[participant];
  if(
    observation.host!==prestate.host||
    observation.repository_head_sha!==transaction.source.repository_head_sha||
    !sameDropin(observation.dropin,prestate.dropin)||
    !same(observation.manager_environment,prestate.manager_environment)||
    observation.service.active!==prestate.service.active
  ){
    return false;
  }
  if(!prestate.service.active)return observation.service.invocation_id===null;
  if(restartBefore!==null){
    return (
      INVOCATION.test(String(observation.service.invocation_id||""))&&
      observation.service.invocation_id!==restartBefore
    );
  }
  return observation.service.invocation_id===prestate.service.invocation_id;
}

function preparedReceipt(transaction,participant){
  return Object.freeze({
    transaction_id:transaction.transaction_id,
    participant,
    prestate_id:participantPrestateId(transaction,participant),
    staged_state_sha256:targetSha(transaction,participant),
    publication_performed:false,
  });
}

function publishStartedReceipt(transaction,participant){
  const restart=restartExpected(transaction,participant);
  return Object.freeze({
    transaction_id:transaction.transaction_id,
    participant,
    prestate_id_before_publish:participantPrestateId(transaction,participant),
    published_state_sha256:targetSha(transaction,participant),
    restart_expected:restart,
    restart_before_invocation_id:restart
      ?transaction.prestate[participant].service.invocation_id
      :null,
    publication_performed:false,
  });
}

function publishReceipt(transaction,participant,observation){
  if(!targetStateObserved(transaction,participant,observation)){
    fail("site_bundle_executor_publish_observation_invalid:"+participant);
  }
  const restart=restartExpected(transaction,participant);
  return Object.freeze({
    transaction_id:transaction.transaction_id,
    participant,
    prestate_id_before_publish:participantPrestateId(transaction,participant),
    published_state_sha256:targetSha(transaction,participant),
    restart_performed:restart,
    restart_before_invocation_id:restart
      ?transaction.prestate[participant].service.invocation_id
      :null,
    restart_after_invocation_id:restart
      ?observation.service.invocation_id
      :null,
  });
}

function publishNoEffectReceipt(transaction,participant,observation){
  if(!samePrestateExact(transaction,participant,observation)){
    fail("site_bundle_executor_publish_no_effect_observation_invalid:"+participant);
  }
  const active=transaction.prestate[participant].service.active;
  return Object.freeze({
    transaction_id:transaction.transaction_id,
    participant,
    observed_prestate_id:participantPrestateId(transaction,participant),
    service_active:active,
    service_invocation_id:active
      ?transaction.prestate[participant].service.invocation_id
      :null,
    publication_performed:false,
    restart_performed:false,
  });
}

function verifyReceipt(transaction,participant,observation){
  if(!targetStateObserved(transaction,participant,observation)){
    fail("site_bundle_executor_verify_observation_invalid:"+participant);
  }
  return Object.freeze({
    transaction_id:transaction.transaction_id,
    participant,
    observed_state_sha256:targetSha(transaction,participant),
    service_active:observation.service.active,
    service_invocation_id:observation.service.invocation_id,
    intended_state_verified:true,
  });
}

function restoreStartedReceipt(transaction,participant){
  const published=transaction.published[participant];
  const restart=Boolean(
    published&&
    transaction.intended.restart_if_active[participant]===true&&
    transaction.prestate[participant].service.active===true
  );
  return Object.freeze({
    transaction_id:transaction.transaction_id,
    participant,
    restored_prestate_id:participantPrestateId(transaction,participant),
    restart_expected:restart,
    restart_before_invocation_id:restart
      ?published.restart_after_invocation_id
      :null,
    restoration_performed:false,
  });
}

function restoreReceipt(transaction,participant,observation){
  const started=transaction.restore_started[participant];
  if(!started)fail("site_bundle_executor_restore_started_missing:"+participant);
  if(
    !restoredStateObserved(
      transaction,
      participant,
      observation,
      {restartBefore:started.restart_expected
        ?started.restart_before_invocation_id
        :null},
    )
  ){
    fail("site_bundle_executor_restore_observation_invalid:"+participant);
  }
  return Object.freeze({
    transaction_id:transaction.transaction_id,
    participant,
    restored_prestate_id:participantPrestateId(transaction,participant),
    service_state_restored:true,
    restart_performed:started.restart_expected,
    restart_before_invocation_id:started.restart_expected
      ?started.restart_before_invocation_id
      :null,
    restart_after_invocation_id:started.restart_expected
      ?observation.service.invocation_id
      :null,
    dropin_restored:true,
    manager_environment_restored:true,
  });
}

function requireAdapter(adapter){
  if(!plain(adapter))fail("site_bundle_executor_adapter_invalid");
  for(const name of [
    "stage",
    "persistParticipantReceipt",
    "observe",
    "publish",
    "recoverPublish",
    "restore",
    "recoverRestore",
  ]){
    if(typeof adapter[name]!=="function"){
      fail("site_bundle_executor_adapter_missing:"+name);
    }
  }
  return adapter;
}

async function persistTransition(persist,transaction){
  if(typeof persist!=="function")fail("site_bundle_executor_persist_invalid");
  await persist(transaction);
  return transaction;
}

async function persistParticipant(adapter,participant,bucket,receipt,transaction){
  await adapter.persistParticipantReceipt(
    participant,
    bucket,
    receipt,
    transaction,
  );
}

function participantFromAction(action,suffix){
  if(action===suffix+"_LOCAL")return "local";
  if(action===suffix+"_REMOTE")return "remote";
  fail("site_bundle_executor_action_participant_invalid:"+action);
}

function recoverablePublishPartial(transaction,participant,observation){
  observationShape(observation,participant);
  const prestate=transaction.prestate[participant];
  if(
    observation.host!==prestate.host||
    observation.repository_head_sha!==transaction.source.repository_head_sha||
    observation.service.active!==prestate.service.active
  ) return false;

  const targetDropin=(
    observation.dropin.exists===true&&
    observation.dropin.sha256===targetSha(transaction,participant)&&
    observation.dropin.mode==="0644"
  );
  const prestateDropin=sameDropin(observation.dropin,prestate.dropin);
  const clearedManager=managerCleared(observation.manager_environment);
  const prestateManager=same(
    observation.manager_environment,
    prestate.manager_environment,
  );
  if(
    (!targetDropin&&!prestateDropin)||
    (!clearedManager&&!prestateManager)
  ) return false;

  if(!prestate.service.active){
    return observation.service.invocation_id===null;
  }
  const invocation=observation.service.invocation_id;
  if(!INVOCATION.test(String(invocation||"")))return false;
  if(!restartExpected(transaction,participant)){
    return invocation===prestate.service.invocation_id;
  }
  if(invocation===prestate.service.invocation_id)return true;
  // An advanced invocation is accepted as a recoverable publish generation
  // only after the full static target state is already visible. Otherwise an
  // unrelated service restart is indistinguishable from transaction progress.
  return targetDropin&&clearedManager;
}

function recoveryPublishClassification(transaction,participant,observation){
  if(targetStateObserved(transaction,participant,observation)){
    return Object.freeze({
      kind:"published",
      receipt:publishReceipt(transaction,participant,observation),
    });
  }
  if(samePrestateExact(transaction,participant,observation)){
    return Object.freeze({
      kind:"no_effect",
      receipt:publishNoEffectReceipt(transaction,participant,observation),
    });
  }
  if(recoverablePublishPartial(transaction,participant,observation)){
    return Object.freeze({kind:"recoverable_partial",receipt:null});
  }
  return Object.freeze({kind:"ambiguous",receipt:null});
}

function recoverableRestorePartial(transaction,participant,observation){
  observationShape(observation,participant);
  const prestate=transaction.prestate[participant];
  const published=transaction.published[participant];
  const started=transaction.restore_started[participant];
  if(
    !published||
    !started||
    observation.host!==prestate.host||
    observation.repository_head_sha!==transaction.source.repository_head_sha||
    observation.service.active!==prestate.service.active
  ) return false;

  const targetDropin=(
    observation.dropin.exists===true&&
    observation.dropin.sha256===targetSha(transaction,participant)&&
    observation.dropin.mode==="0644"
  );
  const prestateDropin=sameDropin(observation.dropin,prestate.dropin);
  const clearedManager=managerCleared(observation.manager_environment);
  const prestateManager=same(
    observation.manager_environment,
    prestate.manager_environment,
  );
  if(
    (!targetDropin&&!prestateDropin)||
    (!clearedManager&&!prestateManager)
  ) return false;

  if(!prestate.service.active){
    return observation.service.invocation_id===null;
  }
  const invocation=observation.service.invocation_id;
  if(!INVOCATION.test(String(invocation||"")))return false;
  if(!started.restart_expected){
    return invocation===prestate.service.invocation_id;
  }
  if(invocation===started.restart_before_invocation_id)return true;
  // Once rollback restart advanced, exact prestate bytes/environment must
  // already be restored. This avoids treating an unrelated restart during a
  // partially restored state as transaction progress.
  return prestateDropin&&prestateManager;
}

function recoveryRestoreClassification(transaction,participant,observation){
  const started=transaction.restore_started[participant];
  if(!started)fail("site_bundle_executor_restore_started_missing:"+participant);
  if(
    restoredStateObserved(
      transaction,
      participant,
      observation,
      {restartBefore:started.restart_expected
        ?started.restart_before_invocation_id
        :null},
    )
  ){
    return "restored";
  }
  if(transaction.published[participant]&&targetStateObserved(
    transaction,
    participant,
    observation,
  )){
    if(
      started.restart_expected&&
      observation.service.invocation_id!==started.restart_before_invocation_id
    ){
      return "ambiguous";
    }
    return "needs_restore";
  }
  if(!transaction.published[participant]&&samePrestateExact(
    transaction,
    participant,
    observation,
  )){
    return "restored";
  }
  if(recoverableRestorePartial(transaction,participant,observation)){
    return "recoverable_partial";
  }
  return "ambiguous";
}

export async function driveVoidSiteBundlePeerEnvTransactionV1({
  transaction,
  adapter,
  persist,
  max_steps=64,
}){
  let current=validateTransaction(transaction);
  const io=requireAdapter(adapter);
  if(!Number.isSafeInteger(max_steps)||max_steps<1||max_steps>256){
    fail("site_bundle_executor_max_steps_invalid");
  }

  for(let step=0;step<max_steps;step+=1){
    const action=nextVoidCrossboxMutationRecoveryV1(current);

    if(action==="DONE_COMMITTED"||action==="DONE_RESTORED"||action==="HOLD"){
      return Object.freeze({transaction:current,action,steps:step});
    }

    if(action==="PREPARE_LOCAL"||action==="PREPARE_REMOTE"){
      const participant=participantFromAction(action,"PREPARE");
      const receipt=preparedReceipt(current,participant);
      await io.stage(participant,current,receipt);
      current=recordVoidCrossboxMutationPreparedV1(current,receipt);
      await persistTransition(persist,current);
      await persistParticipant(io,participant,"prepared",receipt,current);
      continue;
    }

    if(action==="BEGIN_COMMIT"){
      current=beginVoidCrossboxMutationCommitV1(current);
      await persistTransition(persist,current);
      continue;
    }

    if(action==="BEGIN_PUBLISH_LOCAL"||action==="BEGIN_PUBLISH_REMOTE"){
      const participant=participantFromAction(action,"BEGIN_PUBLISH");
      const started=publishStartedReceipt(current,participant);
      current=recordVoidCrossboxMutationPublishStartedV1(current,started);
      await persistTransition(persist,current);
      await persistParticipant(io,participant,"publish_started",started,current);
      // Publication is intentionally outside a try/catch. If it succeeds and
      // the process dies before the final receipt, the durable state remains
      // RECOVER_PUBLISH_* and the next run must observe before acting.
      const observation=observationShape(
        await io.publish(participant,current),
        participant,
      );
      const receipt=publishReceipt(current,participant,observation);
      current=recordVoidCrossboxMutationPublishedV1(current,receipt);
      await persistTransition(persist,current);
      await persistParticipant(io,participant,"published",receipt,current);
      continue;
    }

    if(action==="RECOVER_PUBLISH_LOCAL"||action==="RECOVER_PUBLISH_REMOTE"){
      const participant=participantFromAction(action,"RECOVER_PUBLISH");
      const observation=observationShape(
        await io.observe(participant,current),
        participant,
      );
      const recovered=recoveryPublishClassification(
        current,
        participant,
        observation,
      );
      if(recovered.kind==="published"){
        current=recordVoidCrossboxMutationPublishedV1(
          current,
          recovered.receipt,
        );
        await persistTransition(persist,current);
        await persistParticipant(
          io,
          participant,
          "published",
          recovered.receipt,
          current,
        );
        continue;
      }
      if(recovered.kind==="no_effect"){
        current=recordVoidCrossboxMutationPublishNoEffectV1(
          current,
          recovered.receipt,
        );
        await persistTransition(persist,current);
        await persistParticipant(
          io,
          participant,
          "publish_no_effect",
          recovered.receipt,
          current,
        );
        continue;
      }
      if(recovered.kind==="recoverable_partial"){
        const completed=observationShape(
          await io.recoverPublish(participant,current,observation),
          participant,
        );
        const receipt=publishReceipt(current,participant,completed);
        current=recordVoidCrossboxMutationPublishedV1(current,receipt);
        await persistTransition(persist,current);
        await persistParticipant(
          io,
          participant,
          "published",
          receipt,
          current,
        );
        continue;
      }
      current=holdVoidCrossboxMutationTransactionV1(
        current,
        "ambiguous publish recovery observation for "+participant,
      );
      await persistTransition(persist,current);
      continue;
    }

    if(action==="VERIFY_LOCAL"||action==="VERIFY_REMOTE"){
      const participant=participantFromAction(action,"VERIFY");
      let receipt;
      try{
        const observation=observationShape(
          await io.observe(participant,current),
          participant,
        );
        receipt=verifyReceipt(current,participant,observation);
      }catch(error){
        const reason=("verification failed for "+participant+": "+
          (error instanceof Error?error.message:String(error))).slice(0,256);
        current=beginVoidCrossboxMutationRollbackV1(current,reason);
        await persistTransition(persist,current);
        continue;
      }
      current=recordVoidCrossboxMutationVerifiedV1(current,receipt);
      await persistTransition(persist,current);
      await persistParticipant(io,participant,"verified",receipt,current);
      continue;
    }

    if(action==="FINALIZE_COMMIT"){
      current=finalizeVoidCrossboxMutationCommittedV1(current);
      await persistTransition(persist,current);
      continue;
    }

    if(action==="BEGIN_ROLLBACK"){
      current=beginVoidCrossboxMutationRollbackV1(
        current,
        "publish attempt proven to have no effect",
      );
      await persistTransition(persist,current);
      continue;
    }

    if(action==="BEGIN_RESTORE_LOCAL"||action==="BEGIN_RESTORE_REMOTE"){
      const participant=participantFromAction(action,"BEGIN_RESTORE");
      const started=restoreStartedReceipt(current,participant);
      current=recordVoidCrossboxMutationRestoreStartedV1(current,started);
      await persistTransition(persist,current);
      await persistParticipant(io,participant,"restore_started",started,current);

      let observation;
      if(current.published[participant]){
        observation=observationShape(
          await io.restore(participant,current),
          participant,
        );
      }else{
        observation=observationShape(
          await io.observe(participant,current),
          participant,
        );
      }
      const receipt=restoreReceipt(current,participant,observation);
      current=recordVoidCrossboxMutationRestoredV1(current,receipt);
      await persistTransition(persist,current);
      await persistParticipant(io,participant,"restored",receipt,current);
      continue;
    }

    if(action==="RECOVER_RESTORE_LOCAL"||action==="RECOVER_RESTORE_REMOTE"){
      const participant=participantFromAction(action,"RECOVER_RESTORE");
      let observation=observationShape(
        await io.observe(participant,current),
        participant,
      );
      const classification=recoveryRestoreClassification(
        current,
        participant,
        observation,
      );
      if(classification==="ambiguous"){
        current=holdVoidCrossboxMutationTransactionV1(
          current,
          "ambiguous restore recovery observation for "+participant,
        );
        await persistTransition(persist,current);
        continue;
      }
      if(classification==="needs_restore"){
        observation=observationShape(
          await io.restore(participant,current),
          participant,
        );
      }else if(classification==="recoverable_partial"){
        observation=observationShape(
          await io.recoverRestore(participant,current,observation),
          participant,
        );
      }
      const receipt=restoreReceipt(current,participant,observation);
      current=recordVoidCrossboxMutationRestoredV1(current,receipt);
      await persistTransition(persist,current);
      await persistParticipant(io,participant,"restored",receipt,current);
      continue;
    }

    if(action==="FINALIZE_RESTORE"){
      current=finalizeVoidCrossboxMutationRestoredV1(current);
      await persistTransition(persist,current);
      continue;
    }

    fail("site_bundle_executor_unhandled_action:"+action);
  }

  fail("site_bundle_executor_step_limit_exceeded");
}

export const VOID_SITE_BUNDLE_PEER_ENV_TRANSACTION_EXECUTOR_INTERNAL_V1 =
  Object.freeze({
    participantPrestateId,
    targetSha,
    restartExpected,
    targetStateObserved,
    restoredStateObserved,
    preparedReceipt,
    publishStartedReceipt,
    publishReceipt,
    publishNoEffectReceipt,
    verifyReceipt,
    restoreStartedReceipt,
    restoreReceipt,
    recoverablePublishPartial,
    recoverableRestorePartial,
    canonicalReadyBase,
    desiredIntent,
    journalPath,
    coordinatorSourceIdentity,
  });


const APPLY_CONFIRMATION="applyVoidSiteBundlePeerEnvPersistenceV1";
const SSH="/usr/bin/ssh";
const NODE=fs.realpathSync.native(process.execPath);
const LIVE_SERVICE="void-node-live.service";
const TOOL_REL="tools/void-site-bundle-peer-env-transaction-executor-v1.mjs";
const TX_CONTRACT_REL="tools/void-crossbox-mutation-transaction-v1.mjs";
const CANONICAL_REMOTE="https://github.com/6ZoSo9/void-node.git";
const REMOTE_PINNED_NODE_REL=
  ".runtime/clone-run-v1/node-v24.18.0-linux-x64/bin/node";
const SAFE_PEER=
  /^https?:\/\/[A-Za-z0-9][A-Za-z0-9._-]*:(?:4100|4101|4102)$/u;
const SAFE_READY_BASE=/^http:\/\/127\.0\.0\.1:(?:4100|4101|4102)$/u;
const SAFE_DROPIN=/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const SAFE_SSH=/^([A-Za-z0-9][A-Za-z0-9._-]*@)?[A-Za-z0-9][A-Za-z0-9._-]*$/u;

function canonicalReadyBase(value,label){
  const text=String(value||"").trim();
  if(!SAFE_READY_BASE.test(text)){
    fail("site_bundle_executor_"+label+"_ready_base_invalid");
  }
  return text;
}
function targetDropinBytes(peer){
  if(!SAFE_PEER.test(peer))fail("site_bundle_executor_peer_invalid");
  return Buffer.from(
    "[Service]\nEnvironment=VOID_SITE_BUNDLE_PEERS="+peer+"\n",
    "utf8",
  );
}
function minimalChildEnv(extra={}){
  return {
    PATH:"/usr/bin:/bin",
    HOME:process.env.HOME||"",
    XDG_CONFIG_HOME:"/nonexistent",
    LANG:"C",
    LC_ALL:"C",
    GIT_CONFIG_GLOBAL:"/dev/null",
    GIT_CONFIG_SYSTEM:"/dev/null",
    GIT_CONFIG_NOSYSTEM:"1",
    GIT_ATTR_NOSYSTEM:"1",
    GIT_NO_REPLACE_OBJECTS:"1",
    GIT_OPTIONAL_LOCKS:"0",
    GIT_TERMINAL_PROMPT:"0",
    ...extra,
  };
}
function coordinatorGit(args,code,{cwd=process.cwd()}={}){
  const result=spawnSync(
    "/usr/bin/git",
    [
      "--no-replace-objects",
      "-c","core.hooksPath=/dev/null",
      "-c","core.attributesFile=/dev/null",
      "-c","core.fsmonitor=false",
      "-c","core.untrackedCache=false",
      "-c","core.preloadIndex=false",
      "-c","submodule.recurse=false",
      "-C",cwd,
      ...args,
    ],
    {
      env:minimalChildEnv(),
      encoding:"utf8",
      stdio:["ignore","pipe","pipe"],
      maxBuffer:8*1024*1024,
      timeout:30_000,
    },
  );
  if(result.error)throw result.error;
  if(result.status!==0)fail(code);
  return String(result.stdout||"").trim();
}
function coordinatorSourceIdentity(){
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
  const status=coordinatorGit(
    ["status","--porcelain=v1","--untracked-files=all"],
    "site_bundle_executor_coordinator_status_unavailable",
    {cwd:root},
  );
  if(status!=="")fail("site_bundle_executor_coordinator_repository_dirty");
  const head=coordinatorGit(
    ["rev-parse","HEAD"],
    "site_bundle_executor_coordinator_head_unavailable",
    {cwd:root},
  );
  const branch=coordinatorGit(
    ["branch","--show-current"],
    "site_bundle_executor_coordinator_branch_unavailable",
    {cwd:root},
  );
  const origin=coordinatorGit(
    ["config","--local","--no-includes","--get","remote.origin.url"],
    "site_bundle_executor_coordinator_origin_unavailable",
    {cwd:root},
  );
  if(
    !/^[0-9a-f]{40}$/u.test(head)||
    branch!=="main"||
    !new Set([
      "https://github.com/6ZoSo9/void-node",
      CANONICAL_REMOTE,
      "git@github.com:6ZoSo9/void-node.git",
      "ssh://git@github.com/6ZoSo9/void-node.git",
    ]).has(origin)
  ){
    fail("site_bundle_executor_coordinator_repository_identity_invalid");
  }
  for(const rel of [TOOL_REL,TX_CONTRACT_REL]){
    const blob=coordinatorGit(
      ["rev-parse",head+":"+rel],
      "site_bundle_executor_coordinator_blob_unavailable:"+rel,
      {cwd:root},
    );
    const bytes=fs.readFileSync(path.join(root,rel));
    if(!/^[0-9a-f]{40}$/u.test(blob)||gitBlobSha1(bytes)!==blob){
      fail("site_bundle_executor_coordinator_worktree_drift:"+rel);
    }
  }
  const remote=spawnSync(
    "/usr/bin/git",
    [
      "--no-replace-objects",
      "-c","http.sslVerify=true",
      "-c","core.hooksPath=/dev/null",
      "-c","core.attributesFile=/dev/null",
      "-c","core.fsmonitor=false",
      "-c","core.untrackedCache=false",
      "-c","core.preloadIndex=false",
      "-c","submodule.recurse=false",
      "ls-remote",CANONICAL_REMOTE,"refs/heads/main",
    ],
    {
      cwd:"/",
      env:minimalChildEnv(),
      encoding:"utf8",
      stdio:["ignore","pipe","pipe"],
      timeout:15_000,
      maxBuffer:1024*1024,
    },
  );
  if(remote.error||remote.status!==0){
    fail("site_bundle_executor_canonical_main_unavailable");
  }
  const match=String(remote.stdout||"").trim()
    .match(/^([0-9a-f]{40})\s+refs\/heads\/main$/u);
  if(!match||match[1]!==head){
    fail("site_bundle_executor_coordinator_not_canonical_main");
  }
  return Object.freeze({root,head,branch,origin,remote_main_sha:match[1]});
}
function validateRemoteTarget(target){
  if(typeof target!=="string"||!SAFE_SSH.test(target)){
    fail("site_bundle_executor_remote_target_invalid");
  }
  const lowered=target.toLowerCase();
  if(
    lowered.includes("100.122.79.39")||
    lowered.includes("zoso-alienware-aurora-r7.taila47fd.ts.net")||
    lowered.includes("alienware")
  ){
    fail("site_bundle_executor_retired_alienware_forbidden");
  }
  return target;
}

const PARTICIPANT_HELPER_SOURCE="\nimport crypto from \"node:crypto\";\nimport fs from \"node:fs\";\nimport os from \"node:os\";\nimport path from \"node:path\";\nimport { spawnSync } from \"node:child_process\";\n\nconst req=JSON.parse(\n  Buffer.from(process.env.VOID_REQUEST_B64||\"\",\"base64\").toString(\"utf8\"),\n);\nconst GIT=\"/usr/bin/git\";\nconst SYSTEMCTL=\"/usr/bin/systemctl\";\nconst CURL=\"/usr/bin/curl\";\nconst SLEEP=\"/usr/bin/sleep\";\nconst SERVICE=\"void-node-live.service\";\nconst READY=/^http:\\/\\/127\\.0\\.0\\.1:(?:4100|4101|4102)$/u;\nconst READY_BASE=String(req.ready_base||\"\").trim();\nif(!READY.test(READY_BASE))throw new Error(\"participant_ready_base_invalid\");\nconst HOME=process.env.HOME||\"\";\nconst REPO=path.join(HOME,\"dev/void-node\");\nconst MANAGER_KEYS=[\n  \"VOID_SITE_BUNDLE_PEERS\",\n  \"VOID_DATANET_SITE_BUNDLE_PEERS\",\n  \"VOID_DATANET_PEERS\",\n  \"VOID_DRIFT_PEER\",\n];\nconst ORIGINS=new Set([\n  \"https://github.com/6ZoSo9/void-node\",\n  \"https://github.com/6ZoSo9/void-node.git\",\n  \"git@github.com:6ZoSo9/void-node.git\",\n  \"ssh://git@github.com/6ZoSo9/void-node.git\",\n]);\nconst TX=/^voidxmtx1_[0-9a-f]{64}$/u;\nconst DROPIN=/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;\nconst BUCKET=/^[a-z][a-z0-9_]{0,63}$/u;\n\nfunction fail(code){throw new Error(code);}\nfunction canonical(v){\n  if(v===null||typeof v!==\"object\")return JSON.stringify(v);\n  if(Array.isArray(v))return \"[\"+v.map(canonical).join(\",\")+\"]\";\n  return \"{\"+Object.keys(v).sort().map(k=>JSON.stringify(k)+\":\"+canonical(v[k])).join(\",\")+\"}\";\n}\nfunction same(a,b){return canonical(a)===canonical(b);}\nfunction sha(bytes){return crypto.createHash(\"sha256\").update(bytes).digest(\"hex\");}\nfunction run(file,args,{input=null,timeout=10000,allowFail=false}={}){\n  const result=spawnSync(file,args,{\n    env:{PATH:\"/usr/bin:/bin\",HOME,XDG_CONFIG_HOME:\"/nonexistent\",LANG:\"C\",LC_ALL:\"C\",GIT_CONFIG_GLOBAL:\"/dev/null\",GIT_CONFIG_SYSTEM:\"/dev/null\",GIT_CONFIG_NOSYSTEM:\"1\",GIT_ATTR_NOSYSTEM:\"1\",GIT_NO_REPLACE_OBJECTS:\"1\",GIT_OPTIONAL_LOCKS:\"0\",GIT_TERMINAL_PROMPT:\"0\"},\n    input,\n    encoding:\"utf8\",\n    stdio:[\"pipe\",\"pipe\",\"pipe\"],\n    timeout,\n    maxBuffer:8*1024*1024,\n  });\n  if(result.error)throw result.error;\n  if(result.status!==0&&!allowFail){\n    fail(\"participant_command_failed:\"+path.basename(file)+\":\"+\n      String(result.stderr||\"\").trim().slice(0,180));\n  }\n  return result;\n}\nfunction git(args){\n  return run(\n    GIT,\n    [\n      \"--no-replace-objects\",\n      \"-c\",\"core.hooksPath=/dev/null\",\n      \"-c\",\"core.attributesFile=/dev/null\",\n      \"-c\",\"core.fsmonitor=false\",\n      \"-c\",\"core.untrackedCache=false\",\n      \"-c\",\"core.preloadIndex=false\",\n      \"-c\",\"submodule.recurse=false\",\n      \"-C\",REPO,\n      ...args,\n    ],\n  ).stdout.trim();\n}\nfunction ensureRepo(){\n  if(git([\"status\",\"--porcelain=v1\",\"--untracked-files=all\"])!==\"\"){\n    fail(\"participant_repository_dirty\");\n  }\n  const head=git([\"rev-parse\",\"HEAD\"]);\n  const branch=git([\"branch\",\"--show-current\"]);\n  const origin=git([\"config\",\"--local\",\"--no-includes\",\"--get\",\"remote.origin.url\"]);\n  if(!/^[0-9a-f]{40}$/u.test(head)||branch!==\"main\"||!ORIGINS.has(origin)){\n    fail(\"participant_repository_identity_invalid\");\n  }\n  return head;\n}\nfunction directDir(dir,{privateMode=false}={}){\n  fs.mkdirSync(dir,{recursive:true,mode:privateMode?0o700:0o755});\n  const real=fs.realpathSync.native(dir);\n  if(real!==dir)fail(\"participant_directory_alias:\"+dir);\n  const st=fs.lstatSync(dir);\n  if(!st.isDirectory()||st.isSymbolicLink())fail(\"participant_directory_invalid:\"+dir);\n  if(typeof process.getuid===\"function\"&&st.uid!==process.getuid()){\n    fail(\"participant_directory_owner_invalid:\"+dir);\n  }\n  if((st.mode&0o022)!==0)fail(\"participant_directory_writable_by_other:\"+dir);\n  return st;\n}\nfunction readDirectFile(file){\n  const fd=fs.openSync(file,fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0));\n  try{\n    const before=fs.fstatSync(fd);\n    if(!before.isFile()||before.nlink!==1)fail(\"participant_file_invalid:\"+file);\n    const bytes=Buffer.alloc(before.size);\n    let off=0;\n    while(off<bytes.length){\n      const n=fs.readSync(fd,bytes,off,bytes.length-off,off);\n      if(n<=0)fail(\"participant_file_short_read:\"+file);\n      off+=n;\n    }\n    const after=fs.fstatSync(fd);\n    for(const key of [\"dev\",\"ino\",\"size\",\"mtimeMs\",\"ctimeMs\"]){\n      if(before[key]!==after[key])fail(\"participant_file_changed:\"+file);\n    }\n    return {bytes,stat:after};\n  }finally{fs.closeSync(fd);}\n}\nfunction openBoundDir(dir){\n  const pathStat=directDir(dir);\n  const fd=fs.openSync(\n    dir,\n    fs.constants.O_RDONLY|\n      Number(fs.constants.O_DIRECTORY||0)|\n      Number(fs.constants.O_NOFOLLOW||0),\n  );\n  const fdStat=fs.fstatSync(fd);\n  if(!fdStat.isDirectory()||fdStat.dev!==pathStat.dev||fdStat.ino!==pathStat.ino){\n    fs.closeSync(fd);\n    fail(\"participant_directory_descriptor_mismatch:\"+dir);\n  }\n  return {fd,stat:fdStat};\n}\nfunction createOnly(dir,basename,bytes,mode){\n  const bound=openBoundDir(dir);\n  const proc=\"/proc/self/fd/\"+String(bound.fd)+\"/\"+basename;\n  let fd;\n  try{\n    fd=fs.openSync(\n      proc,\n      fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|\n        Number(fs.constants.O_NOFOLLOW||0),\n      mode,\n    );\n    fs.writeFileSync(fd,bytes);\n    fs.fchmodSync(fd,mode);\n    fs.fsyncSync(fd);\n    fs.fsyncSync(bound.fd);\n  }finally{\n    if(fd!==undefined)fs.closeSync(fd);\n    fs.closeSync(bound.fd);\n  }\n}\nfunction replaceBound(dir,basename,bytes,mode){\n  const bound=openBoundDir(dir);\n  const tmp=\".void-xbox-\"+String(process.pid)+\"-\"+crypto.randomBytes(6).toString(\"hex\");\n  const procBase=\"/proc/self/fd/\"+String(bound.fd)+\"/\";\n  const tmpFile=procBase+tmp;\n  const finalFile=procBase+basename;\n  let fd;\n  try{\n    fd=fs.openSync(\n      tmpFile,\n      fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|\n        Number(fs.constants.O_NOFOLLOW||0),\n      mode,\n    );\n    fs.writeFileSync(fd,bytes);\n    fs.fchmodSync(fd,mode);\n    fs.fsyncSync(fd);\n    fs.closeSync(fd);fd=undefined;\n    fs.renameSync(tmpFile,finalFile);\n    fs.fsyncSync(bound.fd);\n    const after=fs.lstatSync(dir);\n    if(after.dev!==bound.stat.dev||after.ino!==bound.stat.ino){\n      fail(\"participant_directory_changed_during_write:\"+dir);\n    }\n  }finally{\n    if(fd!==undefined)fs.closeSync(fd);\n    try{fs.unlinkSync(tmpFile);}catch(error){\n      if(error?.code!==\"ENOENT\")throw error;\n    }\n    fs.closeSync(bound.fd);\n  }\n}\nfunction ensureCreateOnlyFile(dir,basename,bytes,mode){\n  const file=path.join(dir,basename);\n  try{\n    createOnly(dir,basename,bytes,mode);\n    return;\n  }catch(error){\n    if(error?.code!==\"EEXIST\")throw error;\n  }\n  const existing=readDirectFile(file).bytes;\n  if(!existing.equals(bytes))fail(\"participant_create_only_conflict:\"+basename);\n}\nfunction durableReceipt(dir,bucket,value){\n  if(!BUCKET.test(bucket))fail(\"participant_receipt_bucket_invalid\");\n  const bytes=Buffer.from(JSON.stringify(value,null,2)+\"\\n\",\"utf8\");\n  ensureCreateOnlyFile(dir,bucket+\".json\",bytes,0o600);\n}\nfunction dropinPath(){\n  if(!DROPIN.test(String(req.dropin_name||\"\")))fail(\"participant_dropin_name_invalid\");\n  return path.join(HOME,\".config/systemd/user/\"+SERVICE+\".d\",req.dropin_name);\n}\nfunction dropinState(){\n  const file=dropinPath();\n  try{\n    const st=fs.lstatSync(file);\n    if(st.isSymbolicLink()||!st.isFile()||st.nlink!==1){\n      fail(\"participant_dropin_file_invalid\");\n    }\n    const {bytes,stat}=readDirectFile(file);\n    return {\n      exists:true,\n      sha256:sha(bytes),\n      mode:(stat.mode&0o7777).toString(8).padStart(4,\"0\"),\n    };\n  }catch(error){\n    if(error?.code===\"ENOENT\")return {exists:false,sha256:null,mode:null};\n    throw error;\n  }\n}\nfunction managerEnvironment(){\n  const out=Object.fromEntries(MANAGER_KEYS.map(k=>[k,null]));\n  const result=run(SYSTEMCTL,[\"--user\",\"show-environment\"]);\n  for(const line of result.stdout.split(\"\\n\")){\n    const at=line.indexOf(\"=\");\n    if(at<=0)continue;\n    const key=line.slice(0,at);\n    if(MANAGER_KEYS.includes(key))out[key]=line.slice(at+1);\n  }\n  return out;\n}\nfunction managerCleared(value){\n  return MANAGER_KEYS.every((key)=>value[key]===null);\n}\nfunction serviceState(){\n  const result=run(\n    SYSTEMCTL,\n    [\"--user\",\"show\",SERVICE,\"--no-pager\",\n      \"-p\",\"ActiveState\",\"-p\",\"InvocationID\"],\n  );\n  const map={};\n  for(const line of result.stdout.trim().split(\"\\n\")){\n    const at=line.indexOf(\"=\");\n    if(at>0)map[line.slice(0,at)]=line.slice(at+1);\n  }\n  const state=String(map.ActiveState||\"\");\n  if(![\"active\",\"inactive\"].includes(state)){\n    fail(\"participant_service_transitional:\"+state);\n  }\n  const active=state===\"active\";\n  const invocation=String(map.InvocationID||\"\").toLowerCase();\n  if(active&&!/^[0-9a-f]{32}$/u.test(invocation)){\n    fail(\"participant_service_invocation_invalid\");\n  }\n  return {active,invocation_id:active?invocation:null};\n}\nfunction observation(){\n  return {\n    host:os.hostname().toLowerCase(),\n    repository_head_sha:ensureRepo(),\n    dropin:dropinState(),\n    manager_environment:managerEnvironment(),\n    service:serviceState(),\n  };\n}\nfunction txDir(){\n  if(!TX.test(String(req.transaction_id||\"\")))fail(\"participant_transaction_id_invalid\");\n  if(![\"local\",\"remote\"].includes(req.participant))fail(\"participant_role_invalid\");\n  const dir=path.join(\n    HOME,\n    \".local/state/void/crossbox-mutation-v1\",\n    req.transaction_id,\n    req.participant,\n  );\n  directDir(dir,{privateMode:true});\n  fs.chmodSync(dir,0o700);\n  return dir;\n}\nfunction assertCommon(current){\n  if(\n    current.host!==req.prestate.host||\n    current.repository_head_sha!==req.prestate.repository_head_sha||\n    current.service.active!==req.prestate.service.active\n  ){\n    fail(\"participant_common_precondition_drift\");\n  }\n}\nfunction assertPrestate(){\n  const current=observation();\n  if(!same(current,req.prestate))fail(\"participant_prestate_drift\");\n  return current;\n}\nfunction stagedTarget(){\n  const bytes=readDirectFile(path.join(txDir(),\"dropin.target\")).bytes;\n  if(sha(bytes)!==req.target_sha256)fail(\"participant_staged_target_sha_mismatch\");\n  return bytes;\n}\nfunction targetDropin(current){\n  return (\n    current.dropin.exists===true&&\n    current.dropin.sha256===req.target_sha256&&\n    current.dropin.mode===\"0644\"\n  );\n}\nfunction prestateDropin(current){\n  return same(current.dropin,req.prestate.dropin);\n}\nfunction publishPartialAllowed(current){\n  assertCommon(current);\n  const dropinOk=targetDropin(current)||prestateDropin(current);\n  const managerOk=\n    managerCleared(current.manager_environment)||\n    same(current.manager_environment,req.prestate.manager_environment);\n  if(!dropinOk||!managerOk)fail(\"participant_publish_partial_drift\");\n  if(!req.prestate.service.active){\n    if(current.service.invocation_id!==null)fail(\"participant_publish_invocation_drift\");\n    return;\n  }\n  if(!req.restart_expected){\n    if(current.service.invocation_id!==req.prestate.service.invocation_id){\n      fail(\"participant_publish_invocation_drift\");\n    }\n    return;\n  }\n  if(current.service.invocation_id===req.prestate.service.invocation_id)return;\n  if(!(targetDropin(current)&&managerCleared(current.manager_environment))){\n    fail(\"participant_publish_advanced_invocation_without_target_state\");\n  }\n}\nfunction restorePartialAllowed(current){\n  assertCommon(current);\n  const dropinOk=targetDropin(current)||prestateDropin(current);\n  const managerOk=\n    managerCleared(current.manager_environment)||\n    same(current.manager_environment,req.prestate.manager_environment);\n  if(!dropinOk||!managerOk)fail(\"participant_restore_partial_drift\");\n  if(!req.prestate.service.active){\n    if(current.service.invocation_id!==null)fail(\"participant_restore_invocation_drift\");\n    return;\n  }\n  if(!req.restart_expected){\n    if(current.service.invocation_id!==req.prestate.service.invocation_id){\n      fail(\"participant_restore_invocation_drift\");\n    }\n    return;\n  }\n  if(current.service.invocation_id===req.restart_before_invocation_id)return;\n  if(!(prestateDropin(current)&&same(\n    current.manager_environment,\n    req.prestate.manager_environment,\n  ))){\n    fail(\"participant_restore_advanced_invocation_without_prestate\");\n  }\n}\nfunction stage(){\n  const current=assertPrestate();\n  const dir=txDir();\n  if(req.prestate.dropin.exists){\n    const source=readDirectFile(dropinPath()).bytes;\n    if(sha(source)!==req.prestate.dropin.sha256){\n      fail(\"participant_prestate_backup_sha_mismatch\");\n    }\n    ensureCreateOnlyFile(dir,\"dropin.prestate\",source,0o600);\n  }\n  const target=Buffer.from(req.target_bytes_base64,\"base64\");\n  if(target.length<1||sha(target)!==req.target_sha256){\n    fail(\"participant_target_bytes_invalid\");\n  }\n  ensureCreateOnlyFile(dir,\"dropin.target\",target,0o600);\n  return current;\n}\nfunction clearManager(){\n  run(SYSTEMCTL,[\"--user\",\"unset-environment\",...MANAGER_KEYS]);\n}\nfunction restoreManager(values){\n  clearManager();\n  for(const key of MANAGER_KEYS){\n    const value=values[key];\n    if(value!==null){\n      run(SYSTEMCTL,[\"--user\",\"set-environment\",key+\"=\"+value]);\n    }\n  }\n}\nfunction waitReady(){\n  for(let i=0;i<25;i+=1){\n    const result=run(\n      CURL,\n      [\"-fsS\",\"--max-time\",\"3\",READY_BASE+\"/__void/ready.json\"],\n      {allowFail:true,timeout:5000},\n    );\n    if(result.status===0){\n      try{\n        const j=JSON.parse(result.stdout);\n        if(j?.ready===true&&Number(j?.gap)===0&&Number(j?.txroot_live)===1){\n          return;\n        }\n      }catch(error){\n        if(!(error instanceof SyntaxError))throw error;\n      }\n    }\n    run(SLEEP,[\"1\"],{timeout:2000});\n  }\n  fail(\"participant_service_readiness_timeout\");\n}\nfunction completePublish({initial=false}={}){\n  let current=initial?assertPrestate():observation();\n  if(!initial)publishPartialAllowed(current);\n  const staged=stagedTarget();\n  const final=dropinPath();\n  const parent=path.dirname(final);\n  directDir(parent);\n\n  if(!targetDropin(current)){\n    if(!prestateDropin(current))fail(\"participant_publish_dropin_drift\");\n    replaceBound(parent,path.basename(final),staged,0o644);\n    current=observation();\n    publishPartialAllowed(current);\n  }\n  if(!managerCleared(current.manager_environment)){\n    if(!same(current.manager_environment,req.prestate.manager_environment)){\n      fail(\"participant_publish_manager_drift\");\n    }\n    clearManager();\n    current=observation();\n    publishPartialAllowed(current);\n  }\n\n  run(SYSTEMCTL,[\"--user\",\"daemon-reload\"]);\n  current=observation();\n  publishPartialAllowed(current);\n\n  if(req.restart_expected){\n    if(current.service.invocation_id===req.prestate.service.invocation_id){\n      run(SYSTEMCTL,[\"--user\",\"restart\",SERVICE],{timeout:30000});\n      waitReady();\n    }else{\n      waitReady();\n    }\n  }\n  const finalObservation=observation();\n  if(!targetDropin(finalObservation)||!managerCleared(finalObservation.manager_environment)){\n    fail(\"participant_publish_target_not_observed\");\n  }\n  return finalObservation;\n}\nfunction restoreDropin(){\n  const dir=txDir();\n  const final=dropinPath();\n  const parent=path.dirname(final);\n  directDir(parent);\n  if(req.prestate.dropin.exists){\n    const backup=readDirectFile(path.join(dir,\"dropin.prestate\")).bytes;\n    if(sha(backup)!==req.prestate.dropin.sha256){\n      fail(\"participant_restore_backup_sha_mismatch\");\n    }\n    replaceBound(\n      parent,\n      path.basename(final),\n      backup,\n      Number.parseInt(req.prestate.dropin.mode,8),\n    );\n  }else{\n    const bound=openBoundDir(parent);\n    const proc=\"/proc/self/fd/\"+String(bound.fd)+\"/\"+path.basename(final);\n    try{\n      try{\n        const st=fs.lstatSync(proc);\n        if(st.isSymbolicLink()||!st.isFile())fail(\"participant_restore_target_invalid\");\n        fs.unlinkSync(proc);\n        fs.fsyncSync(bound.fd);\n      }catch(error){\n        if(error?.code!==\"ENOENT\")throw error;\n      }\n    }finally{fs.closeSync(bound.fd);}\n  }\n}\nfunction completeRestore(){\n  let current=observation();\n  restorePartialAllowed(current);\n\n  if(!prestateDropin(current)){\n    restoreDropin();\n    current=observation();\n    restorePartialAllowed(current);\n  }\n  if(!same(current.manager_environment,req.prestate.manager_environment)){\n    if(!managerCleared(current.manager_environment)){\n      fail(\"participant_restore_manager_drift\");\n    }\n    restoreManager(req.prestate.manager_environment);\n    current=observation();\n    restorePartialAllowed(current);\n  }\n\n  run(SYSTEMCTL,[\"--user\",\"daemon-reload\"]);\n  current=observation();\n  restorePartialAllowed(current);\n\n  if(req.restart_expected){\n    if(current.service.invocation_id===req.restart_before_invocation_id){\n      run(SYSTEMCTL,[\"--user\",\"restart\",SERVICE],{timeout:30000});\n      waitReady();\n    }else{\n      waitReady();\n    }\n  }\n  const finalObservation=observation();\n  if(\n    !prestateDropin(finalObservation)||\n    !same(finalObservation.manager_environment,req.prestate.manager_environment)\n  ){\n    fail(\"participant_restore_prestate_not_observed\");\n  }\n  return finalObservation;\n}\n\nlet result;\nif(req.action===\"facts\")result=observation();\nelse if(req.action===\"stage\")result=stage();\nelse if(req.action===\"persist_receipt\"){\n  durableReceipt(txDir(),req.bucket,req.receipt);\n  result={persisted:true};\n}\nelse if(req.action===\"publish\")result=completePublish({initial:true});\nelse if(req.action===\"recover_publish\")result=completePublish({initial:false});\nelse if(req.action===\"restore\"||req.action===\"recover_restore\")result=completeRestore();\nelse fail(\"participant_action_invalid\");\nprocess.stdout.write(JSON.stringify({ok:true,result,error:null}));\n";

function participantRequest(remoteTarget,participant,request){
  const encoded=Buffer.from(JSON.stringify(request),"utf8").toString("base64");
  let result;
  if(participant==="local"){
    result=spawnSync(
      NODE,
      ["--input-type=module"],
      {
        env:minimalChildEnv({VOID_REQUEST_B64:encoded}),
        input:PARTICIPANT_HELPER_SOURCE,
        encoding:"utf8",
        stdio:["pipe","pipe","pipe"],
        timeout:120_000,
        maxBuffer:16*1024*1024,
      },
    );
  }else{
    result=spawnSync(
      SSH,
      [
        "-o","BatchMode=yes",
        "-o","ConnectTimeout=6",
        remoteTarget,
        "env",
        "VOID_REQUEST_B64="+encoded,
        "bash",
        "-lc",
        [
          'set -euo pipefail',
          'repo="$HOME/dev/void-node"',
          'node_bin=""',
          'if command -v node >/dev/null 2>&1; then',
          '  major="$(node -p \'process.versions.node.split(\".\")[0]\')"',
          '  case "$major" in 22|24|26) node_bin="$(command -v node)";; esac',
          'fi',
          'if [ -z "$node_bin" ]; then',
          '  node_bin="$repo/'+REMOTE_PINNED_NODE_REL+'"',
          '  test -x "$node_bin"',
          '  test "$("$node_bin" --version)" = "v24.18.0"',
          'fi',
          'exec "$node_bin" --input-type=module',
        ].join("; "),
      ],
      {
        env:minimalChildEnv(),
        input:PARTICIPANT_HELPER_SOURCE,
        encoding:"utf8",
        stdio:["pipe","pipe","pipe"],
        timeout:120_000,
        maxBuffer:16*1024*1024,
      },
    );
  }
  if(result.error)throw result.error;
  if(result.status!==0){
    fail(
      "site_bundle_executor_participant_request_failed:"+participant+":"+
      String(result.stderr||"").trim().slice(0,240),
    );
  }
  let envelope;
  try{envelope=JSON.parse(String(result.stdout||""));}
  catch{fail("site_bundle_executor_participant_output_invalid:"+participant);}
  if(envelope?.ok!==true||!Object.hasOwn(envelope,"result")){
    fail(
      "site_bundle_executor_participant_hold:"+participant+":"+
      String(envelope?.error||"unknown"),
    );
  }
  return envelope.result;
}

function targetFor(transaction,participant){
  return participant==="local"
    ?targetDropinBytes(transaction.intended.local_peer)
    :targetDropinBytes(transaction.intended.remote_peer);
}
function makeLiveAdapter(remoteTarget,topology){
  const readyBaseFor=(participant)=>
    participant==="local"?topology.local_ready_base:topology.remote_ready_base;
  const requestBase=(participant,transaction)=>({
    participant,
    transaction_id:transaction.transaction_id,
    dropin_name:transaction.intended.dropin_name,
    ready_base:readyBaseFor(participant),
    prestate:transaction.prestate[participant],
    target_sha256:targetSha(transaction,participant),
    restart_expected:restartExpected(transaction,participant),
  });
  return Object.freeze({
    async observe(participant,transaction){
      return participantRequest(remoteTarget,participant,{
        action:"facts",
        participant,
        transaction_id:transaction.transaction_id,
        dropin_name:transaction.intended.dropin_name,
        ready_base:readyBaseFor(participant),
      });
    },
    async stage(participant,transaction){
      const target=targetFor(transaction,participant);
      return participantRequest(remoteTarget,participant,{
        ...requestBase(participant,transaction),
        action:"stage",
        target_bytes_base64:target.toString("base64"),
      });
    },
    async persistParticipantReceipt(participant,bucket,receipt,transaction){
      participantRequest(remoteTarget,participant,{
        action:"persist_receipt",
        participant,
        transaction_id:transaction.transaction_id,
        dropin_name:transaction.intended.dropin_name,
        ready_base:readyBaseFor(participant),
        bucket,
        receipt,
      });
    },
    async publish(participant,transaction){
      return participantRequest(remoteTarget,participant,{
        ...requestBase(participant,transaction),
        action:"publish",
      });
    },
    async recoverPublish(participant,transaction){
      return participantRequest(remoteTarget,participant,{
        ...requestBase(participant,transaction),
        action:"recover_publish",
      });
    },
    async restore(participant,transaction){
      const started=transaction.restore_started[participant];
      if(!started)fail("site_bundle_executor_restore_start_missing:"+participant);
      return participantRequest(remoteTarget,participant,{
        ...requestBase(participant,transaction),
        action:"restore",
        restart_expected:started.restart_expected,
        restart_before_invocation_id:started.restart_before_invocation_id,
      });
    },
    async recoverRestore(participant,transaction){
      const started=transaction.restore_started[participant];
      if(!started)fail("site_bundle_executor_restore_start_missing:"+participant);
      return participantRequest(remoteTarget,participant,{
        ...requestBase(participant,transaction),
        action:"recover_restore",
        restart_expected:started.restart_expected,
        restart_before_invocation_id:started.restart_before_invocation_id,
      });
    },
  });
}

function ensurePrivateStateRoot(root){
  if(process.platform!=="linux")fail("site_bundle_executor_linux_required");
  if(!path.isAbsolute(root)||path.resolve(root)!==root){
    fail("site_bundle_executor_state_root_invalid");
  }
  fs.mkdirSync(root,{recursive:true,mode:0o700});
  const real=fs.realpathSync.native(root);
  if(real!==root)fail("site_bundle_executor_state_root_alias");
  const st=fs.lstatSync(root);
  if(
    !st.isDirectory()||
    st.isSymbolicLink()||
    (st.mode&0o077)!==0||
    (typeof process.getuid==="function"&&st.uid!==process.getuid())
  ){
    fail("site_bundle_executor_state_root_unsafe");
  }
  return st;
}
function journalPath(stateRoot,intent){
  const id=sha256(Buffer.from(canonical(intent),"utf8"));
  return path.join(stateRoot,"site-bundle-"+id+".json");
}
function assertNoCompetingLiveJournal(stateRoot,currentFile){
  for(const name of fs.readdirSync(stateRoot)){
    if(!/^site-bundle-[0-9a-f]{64}\.json$/u.test(name))continue;
    const file=path.join(stateRoot,name);
    if(file===currentFile)continue;
    const candidate=readStableJournal(file);
    const phase=String(candidate?.phase||"");
    if(!["COMMITTED","RESTORED"].includes(phase)){
      fail(
        "site_bundle_executor_competing_nonterminal_journal:"+
        name+":"+phase,
      );
    }
  }
}
function readStableJournal(file){
  const fd=fs.openSync(
    file,
    fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0),
  );
  try{
    const before=fs.fstatSync(fd);
    if(!before.isFile()||before.nlink!==1||before.size<2||before.size>8*1024*1024){
      fail("site_bundle_executor_journal_invalid");
    }
    const bytes=Buffer.alloc(before.size);
    let off=0;
    while(off<bytes.length){
      const n=fs.readSync(fd,bytes,off,bytes.length-off,off);
      if(n<=0)fail("site_bundle_executor_journal_short_read");
      off+=n;
    }
    const after=fs.fstatSync(fd);
    for(const key of ["dev","ino","size","mtimeMs","ctimeMs"]){
      if(before[key]!==after[key])fail("site_bundle_executor_journal_changed");
    }
    return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
  }finally{fs.closeSync(fd);}
}
function writeDurableJournal(file,value){
  const parent=path.dirname(file);
  const parentPath=ensurePrivateStateRoot(parent);
  const parentFd=fs.openSync(
    parent,
    fs.constants.O_RDONLY|
      Number(fs.constants.O_DIRECTORY||0)|
      Number(fs.constants.O_NOFOLLOW||0),
  );
  const parentStat=fs.fstatSync(parentFd);
  if(parentStat.dev!==parentPath.dev||parentStat.ino!==parentPath.ino){
    fs.closeSync(parentFd);
    fail("site_bundle_executor_journal_parent_mismatch");
  }
  const bytes=Buffer.from(JSON.stringify(value,null,2)+"\n","utf8");
  const basename=path.basename(file);
  const tmp=basename+".tmp-"+String(process.pid)+"-"+crypto.randomBytes(6).toString("hex");
  const procBase="/proc/self/fd/"+String(parentFd)+"/";
  let fd;
  try{
    fd=fs.openSync(
      procBase+tmp,
      fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|
        Number(fs.constants.O_NOFOLLOW||0),
      0o600,
    );
    fs.writeFileSync(fd,bytes);
    fs.fchmodSync(fd,0o600);
    fs.fsyncSync(fd);
    fs.closeSync(fd);fd=undefined;
    fs.renameSync(procBase+tmp,procBase+basename);
    fs.fsyncSync(parentFd);
  }finally{
    if(fd!==undefined)fs.closeSync(fd);
    try{fs.unlinkSync(procBase+tmp);}catch(error){
      if(error?.code!=="ENOENT")throw error;
    }
    fs.closeSync(parentFd);
  }
  const persisted=readStableJournal(file);
  if(canonical(persisted)!==canonical(value)){
    fail("site_bundle_executor_journal_persist_mismatch");
  }
}
function desiredIntent({
  remoteTarget,
  localPeer,
  remotePeer,
  dropinName,
  localReadyBase,
  remoteReadyBase,
}){
  return Object.freeze({
    remote_target:remoteTarget,
    local_peer:localPeer,
    remote_peer:remotePeer,
    dropin_name:dropinName,
    service_unit:LIVE_SERVICE,
    local_ready_base:localReadyBase,
    remote_ready_base:remoteReadyBase,
  });
}
function assertResumeMatches(transaction,{localFacts,remoteFacts,localPeer,remotePeer,dropinName}){
  if(
    transaction.kind!=="site_bundle_peer_env"||
    transaction.intended.local_peer!==localPeer||
    transaction.intended.remote_peer!==remotePeer||
    transaction.intended.dropin_name!==dropinName||
    transaction.source.repository_head_sha!==localFacts.repository_head_sha||
    transaction.source.repository_head_sha!==remoteFacts.repository_head_sha||
    transaction.source.local_host!==localFacts.host||
    transaction.source.remote_host!==remoteFacts.host
  ){
    fail("site_bundle_executor_resume_intent_or_source_mismatch");
  }
}
async function directMain(){
  const {values}=parseArgs({
    options:{
      remote:{type:"string"},
      "local-peer":{type:"string"},
      "remote-peer":{type:"string"},
      "local-ready-base":{type:"string"},
      "remote-ready-base":{type:"string"},
      "dropin-name":{type:"string",default:"97-site-bundle-peers.conf"},
      confirmation:{type:"string"},
      "state-root":{type:"string"},
    },
    strict:true,
  });
  const remoteTarget=validateRemoteTarget(String(values.remote||""));
  const localPeer=String(values["local-peer"]||"");
  const remotePeer=String(values["remote-peer"]||"");
  const localReadyBase=canonicalReadyBase(
    values["local-ready-base"],
    "local",
  );
  const remoteReadyBase=canonicalReadyBase(
    values["remote-ready-base"],
    "remote",
  );
  const dropinName=String(values["dropin-name"]||"");
  if(!SAFE_PEER.test(localPeer)||!SAFE_PEER.test(remotePeer)){
    fail("site_bundle_executor_peer_invalid");
  }
  if(!SAFE_DROPIN.test(dropinName)){
    fail("site_bundle_executor_dropin_name_invalid");
  }
  if(values.confirmation!==APPLY_CONFIRMATION){
    fail("site_bundle_executor_confirmation_required");
  }

  const coordinator=coordinatorSourceIdentity();

  const stateRoot=values["state-root"]
    ?path.resolve(values["state-root"])
    :path.join(os.homedir(),".local/state/void/crossbox-mutation-v1");
  ensurePrivateStateRoot(stateRoot);

  const provisionalId="voidxmtx1_"+"0".repeat(64);
  const factsRequest=(participant)=>participantRequest(
    remoteTarget,
    participant,
    {
      action:"facts",
      participant,
      transaction_id:provisionalId,
      dropin_name:dropinName,
      ready_base:
        participant==="local"?localReadyBase:remoteReadyBase,
    },
  );
  const localFacts=factsRequest("local");
  const remoteFacts=factsRequest("remote");
  if(
    localFacts.repository_head_sha!==remoteFacts.repository_head_sha||
    localFacts.repository_head_sha!==coordinator.head||
    localFacts.host===remoteFacts.host
  ){
    fail("site_bundle_executor_crossbox_source_parity_failed");
  }

  const intent=desiredIntent({
    remoteTarget,
    localPeer,
    remotePeer,
    dropinName,
    localReadyBase,
    remoteReadyBase,
  });
  const journal=journalPath(stateRoot,intent);
  assertNoCompetingLiveJournal(stateRoot,journal);
  let transaction;
  if(fs.existsSync(journal)){
    transaction=readStableJournal(journal);
    assertResumeMatches(
      transaction,
      {localFacts,remoteFacts,localPeer,remotePeer,dropinName},
    );
  }else{
    const localTarget=targetDropinBytes(localPeer);
    const remoteTargetBytes=targetDropinBytes(remotePeer);
    transaction=prepareVoidCrossboxMutationTransactionV1({
      kind:"site_bundle_peer_env",
      source:{
        repository_head_sha:localFacts.repository_head_sha,
        local_host:localFacts.host,
        remote_host:remoteFacts.host,
      },
      prestate:{local:localFacts,remote:remoteFacts},
      intended:{
        dropin_name:dropinName,
        local_peer:localPeer,
        remote_peer:remotePeer,
        local_target_dropin_sha256:sha256(localTarget),
        remote_target_dropin_sha256:sha256(remoteTargetBytes),
        restart_if_active:{local:true,remote:true},
      },
      confirmation:VOID_CROSSBOX_MUTATION_TRANSACTION_CONFIRMATION_V1,
    });
    writeDurableJournal(journal,transaction);
  }

  const adapter=makeLiveAdapter(
    remoteTarget,
    Object.freeze({local_ready_base:localReadyBase,remote_ready_base:remoteReadyBase}),
  );
  const persist=async(value)=>writeDurableJournal(journal,value);
  let result;
  try{
    result=await driveVoidSiteBundlePeerEnvTransactionV1({
      transaction,
      adapter,
      persist,
    });
  }catch(error){
    let action="UNKNOWN";
    try{action=nextVoidCrossboxMutationRecoveryV1(readStableJournal(journal));}
    catch(recoveryError){
      if(!(recoveryError instanceof Error))throw recoveryError;
    }
    console.error(VOID_SITE_BUNDLE_PEER_ENV_TRANSACTION_EXECUTOR_V1+" HOLD");
    console.error("reason="+(error instanceof Error?error.message:String(error)));
    console.error("journal="+journal);
    console.error("recovery_action="+action);
    process.exitCode=2;
    return;
  }

  console.log(VOID_SITE_BUNDLE_PEER_ENV_TRANSACTION_EXECUTOR_V1);
  console.log("transaction_id="+result.transaction.transaction_id);
  console.log("state_id="+result.transaction.state_id);
  console.log("phase="+result.transaction.phase);
  console.log("terminal_action="+result.action);
  console.log("journal="+journal);
  console.log("validator_publication=false");
  console.log("git_tag_or_push=false");
  console.log("funds_movement=false");

  if(result.action==="DONE_COMMITTED")process.exitCode=0;
  else if(result.action==="DONE_RESTORED")process.exitCode=3;
  else process.exitCode=2;
}
const direct=
  process.argv[1]&&
  import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href;
if(direct){
  directMain().catch((error)=>{
    console.error(VOID_SITE_BUNDLE_PEER_ENV_TRANSACTION_EXECUTOR_V1+" HOLD");
    console.error("reason="+(error instanceof Error?error.message:String(error)));
    process.exitCode=2;
  });
}
