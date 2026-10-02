#!/usr/bin/env node
import crypto from "node:crypto";

import {
  VOID_CROSSBOX_MUTATION_TRANSACTION_AUTHORITY_V1,
  beginVoidCrossboxMutationCommitV1,
  beginVoidCrossboxMutationRollbackV1,
  finalizeVoidCrossboxMutationCommittedV1,
  finalizeVoidCrossboxMutationRestoredV1,
  holdVoidCrossboxMutationTransactionV1,
  nextVoidCrossboxMutationRecoveryV1,
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
    value.host!==undefined&&typeof value.host!=="string"||
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
    "restore",
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
  return Object.freeze({kind:"ambiguous",receipt:null});
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
      current=holdVoidCrossboxMutationTransactionV1(
        current,
        "ambiguous publish recovery observation for "+participant,
      );
      await persistTransition(persist,current);
      continue;
    }

    if(action==="VERIFY_LOCAL"||action==="VERIFY_REMOTE"){
      const participant=participantFromAction(action,"VERIFY");
      let observation;
      try{
        observation=observationShape(
          await io.observe(participant,current),
          participant,
        );
        const receipt=verifyReceipt(current,participant,observation);
        current=recordVoidCrossboxMutationVerifiedV1(current,receipt);
        await persistTransition(persist,current);
        await persistParticipant(io,participant,"verified",receipt,current);
      }catch(error){
        const reason=("verification failed for "+participant+": "+
          (error instanceof Error?error.message:String(error))).slice(0,256);
        current=beginVoidCrossboxMutationRollbackV1(current,reason);
        await persistTransition(persist,current);
      }
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
  });
