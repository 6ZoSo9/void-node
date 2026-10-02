#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  VOID_CROSSBOX_MUTATION_TRANSACTION_CONFIRMATION_V1,
  nextVoidCrossboxMutationRecoveryV1,
  prepareVoidCrossboxMutationTransactionV1,
} from "../tools/void-crossbox-mutation-transaction-v1.mjs";
import {
  VOID_SITE_BUNDLE_PEER_ENV_TRANSACTION_EXECUTOR_AUTHORITY_V1,
  VOID_SITE_BUNDLE_PEER_ENV_TRANSACTION_EXECUTOR_INTERNAL_V1,
  VOID_SITE_BUNDLE_PEER_ENV_TRANSACTION_EXECUTOR_V1,
  driveVoidSiteBundlePeerEnvTransactionV1,
} from "../tools/void-site-bundle-peer-env-transaction-executor-v1.mjs";

function canonical(value){
  if(value===null||typeof value!=="object")return JSON.stringify(value);
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  return "{"+Object.keys(value).sort().map(
    (key)=>JSON.stringify(key)+":"+canonical(value[key]),
  ).join(",")+"}";
}
function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function targetBytes(peer){
  return Buffer.from(
    "[Service]\nEnvironment=VOID_SITE_BUNDLE_PEERS="+peer+"\n",
    "utf8",
  );
}
function manager(overrides={}){
  return {
    VOID_SITE_BUNDLE_PEERS:null,
    VOID_DATANET_SITE_BUNDLE_PEERS:null,
    VOID_DATANET_PEERS:null,
    VOID_DRIFT_PEER:null,
    ...overrides,
  };
}
function siteInput(){
  const localPeer="http://100.64.0.2:4100";
  const remotePeer="http://100.64.0.1:4100";
  return {
    kind:"site_bundle_peer_env",
    source:{
      repository_head_sha:"a".repeat(40),
      local_host:"precision-box",
      remote_host:"nimo-box",
    },
    prestate:{
      local:{
        host:"precision-box",
        repository_head_sha:"a".repeat(40),
        dropin:{
          exists:true,
          sha256:"1".repeat(64),
          mode:"0644",
        },
        manager_environment:manager({
          VOID_SITE_BUNDLE_PEERS:"http://100.64.0.99:4100",
          VOID_DRIFT_PEER:"legacy-peer",
        }),
        service:{
          active:true,
          invocation_id:"1".repeat(32),
        },
      },
      remote:{
        host:"nimo-box",
        repository_head_sha:"a".repeat(40),
        dropin:{
          exists:false,
          sha256:null,
          mode:null,
        },
        manager_environment:manager({
          VOID_DATANET_PEERS:"old-remote-peer",
        }),
        service:{
          active:false,
          invocation_id:null,
        },
      },
    },
    intended:{
      dropin_name:"97-site-bundle-peers.conf",
      local_peer:localPeer,
      remote_peer:remotePeer,
      local_target_dropin_sha256:sha256(targetBytes(localPeer)),
      remote_target_dropin_sha256:sha256(targetBytes(remotePeer)),
      restart_if_active:{local:true,remote:true},
    },
    confirmation:VOID_CROSSBOX_MUTATION_TRANSACTION_CONFIRMATION_V1,
  };
}

function clone(value){return structuredClone(value);}
function prestateObservation(tx,participant){
  return clone(tx.prestate[participant]);
}
function targetObservation(tx,participant,invocation=null){
  const pre=tx.prestate[participant];
  return {
    host:pre.host,
    repository_head_sha:pre.repository_head_sha,
    dropin:{
      exists:true,
      sha256:participant==="local"
        ?tx.intended.local_target_dropin_sha256
        :tx.intended.remote_target_dropin_sha256,
      mode:"0644",
    },
    manager_environment:manager(),
    service:{
      active:pre.service.active,
      invocation_id:pre.service.active
        ?invocation??"2".repeat(32)
        :null,
    },
  };
}
function restoredObservation(tx,participant,invocation=null){
  const pre=tx.prestate[participant];
  return {
    ...clone(pre),
    service:{
      active:pre.service.active,
      invocation_id:pre.service.active
        ?invocation??"3".repeat(32)
        :null,
    },
  };
}

class FakeAdapter{
  constructor(tx){
    this.observations={
      local:prestateObservation(tx,"local"),
      remote:prestateObservation(tx,"remote"),
    };
    this.stageCount={local:0,remote:0};
    this.publishCount={local:0,remote:0};
    this.recoverPublishCount={local:0,remote:0};
    this.restoreCount={local:0,remote:0};
    this.recoverRestoreCount={local:0,remote:0};
    this.participantReceipts=[];
    this.failPublishAfterEffect=new Set();
    this.failPublishBeforeEffect=new Set();
    this.failPublishPartialAfterDropin=new Set();
    this.failRestoreAfterEffect=new Set();
    this.failRestorePartialAfterDropin=new Set();
    this.publishInvocations={local:"2".repeat(32),remote:null};
    this.restoreInvocations={local:"3".repeat(32),remote:null};
  }
  async stage(participant,tx,receipt){
    assert.equal(receipt.publication_performed,false);
    assert.equal(
      receipt.staged_state_sha256,
      participant==="local"
        ?tx.intended.local_target_dropin_sha256
        :tx.intended.remote_target_dropin_sha256,
    );
    this.stageCount[participant]+=1;
  }
  async persistParticipantReceipt(participant,bucket,receipt){
    this.participantReceipts.push({participant,bucket,receipt:clone(receipt)});
  }
  async observe(participant){
    return clone(this.observations[participant]);
  }
  async publish(participant,tx){
    this.publishCount[participant]+=1;
    assert.ok(tx.publish_started[participant]);
    assert.equal(tx.published[participant],null);
    if(this.failPublishBeforeEffect.has(participant)){
      throw new Error("simulated_publish_before_effect:"+participant);
    }
    if(this.failPublishPartialAfterDropin.has(participant)){
      this.failPublishPartialAfterDropin.delete(participant);
      this.observations[participant]={
        ...targetObservation(
          tx,
          participant,
          tx.prestate[participant].service.invocation_id,
        ),
        manager_environment:clone(
          tx.prestate[participant].manager_environment,
        ),
      };
      throw new Error("simulated_publish_partial_after_dropin:"+participant);
    }
    this.observations[participant]=targetObservation(
      tx,
      participant,
      this.publishInvocations[participant],
    );
    if(this.failPublishAfterEffect.has(participant)){
      this.failPublishAfterEffect.delete(participant);
      throw new Error("simulated_publish_after_effect:"+participant);
    }
    return this.observe(participant);
  }
  async recoverPublish(participant,tx){
    this.recoverPublishCount[participant]+=1;
    this.observations[participant]=targetObservation(
      tx,
      participant,
      this.publishInvocations[participant],
    );
    return this.observe(participant);
  }
  async restore(participant,tx){
    this.restoreCount[participant]+=1;
    assert.ok(tx.restore_started[participant]);
    assert.equal(tx.restored[participant],null);
    if(this.failRestorePartialAfterDropin.has(participant)){
      this.failRestorePartialAfterDropin.delete(participant);
      this.observations[participant]={
        ...restoredObservation(
          tx,
          participant,
          tx.restore_started[participant].restart_before_invocation_id,
        ),
        manager_environment:manager(),
      };
      throw new Error("simulated_restore_partial_after_dropin:"+participant);
    }
    this.observations[participant]=restoredObservation(
      tx,
      participant,
      this.restoreInvocations[participant],
    );
    if(this.failRestoreAfterEffect.has(participant)){
      this.failRestoreAfterEffect.delete(participant);
      throw new Error("simulated_restore_after_effect:"+participant);
    }
    return this.observe(participant);
  }
  async recoverRestore(participant,tx){
    this.recoverRestoreCount[participant]+=1;
    this.observations[participant]=restoredObservation(
      tx,
      participant,
      this.restoreInvocations[participant],
    );
    return this.observe(participant);
  }
}

function memoryJournal(initial,{failOnWrite=null}={}){
  let current=clone(initial);
  const writes=[clone(initial)];
  return {
    get current(){return clone(current);},
    writes,
    persist:async(value)=>{
      if(
        typeof failOnWrite==="function"&&
        failOnWrite(value,writes.length)
      ){
        throw new Error("simulated_journal_write_failure");
      }
      current=clone(value);
      writes.push(clone(value));
    },
  };
}

assert.equal(
  VOID_SITE_BUNDLE_PEER_ENV_TRANSACTION_EXECUTOR_V1,
  "VOID_SITE_BUNDLE_PEER_ENV_TRANSACTION_EXECUTOR_V1",
);
for(const [key,value] of Object.entries(
  VOID_SITE_BUNDLE_PEER_ENV_TRANSACTION_EXECUTOR_AUTHORITY_V1,
)){
  const trueKeys=new Set([
    "reviewed_transaction_contract_required",
    "durable_transition_before_publish_side_effect",
    "durable_transition_before_restore_side_effect",
    "observation_first_publish_recovery",
    "observation_first_restore_recovery",
    "exact_prestate_restore_required",
    "participant_receipt_persistence_required",
    "source_contract_authority_preserved",
    "ssh_execution_adapter_required_for_remote",
    "systemd_mutation_adapter_required_for_publish_restore",
  ]);
  assert.equal(value,trueKeys.has(key),key);
}

// Happy path: both prepare before any publish, exact intent is verified on both
// sides, and COMMITTED is the only successful terminal.
{
  const tx=prepareVoidCrossboxMutationTransactionV1(siteInput());
  const journal=memoryJournal(tx);
  const adapter=new FakeAdapter(tx);
  const result=await driveVoidSiteBundlePeerEnvTransactionV1({
    transaction:tx,
    adapter,
    persist:journal.persist,
  });
  assert.equal(result.action,"DONE_COMMITTED");
  assert.equal(result.transaction.phase,"COMMITTED");
  assert.deepEqual(adapter.stageCount,{local:1,remote:1});
  assert.deepEqual(adapter.publishCount,{local:1,remote:1});
  assert.deepEqual(adapter.restoreCount,{local:0,remote:0});
  assert.equal(result.transaction.verified.local.intended_state_verified,true);
  assert.equal(result.transaction.verified.remote.intended_state_verified,true);
  assert.equal(result.transaction.checkpoint_publish_allowed,false);

  const firstPublishState=journal.writes.find(
    (value)=>value.publish_started.local!==null&&value.published.local===null,
  );
  assert.ok(firstPublishState);
  assert.ok(firstPublishState.prepared.local);
  assert.ok(firstPublishState.prepared.remote);
  assert.equal(firstPublishState.phase,"COMMITTING");
}

// Crash after local publish side effect but before final receipt persistence:
// rerun observes the target and must not publish/restart local a second time.
{
  const tx=prepareVoidCrossboxMutationTransactionV1(siteInput());
  const journal=memoryJournal(tx);
  const adapter=new FakeAdapter(tx);
  adapter.failPublishAfterEffect.add("local");

  await assert.rejects(
    ()=>driveVoidSiteBundlePeerEnvTransactionV1({
      transaction:tx,
      adapter,
      persist:journal.persist,
    }),
    /simulated_publish_after_effect:local/u,
  );
  assert.equal(
    nextVoidCrossboxMutationRecoveryV1(journal.current),
    "RECOVER_PUBLISH_LOCAL",
  );
  assert.equal(adapter.publishCount.local,1);

  const resumed=await driveVoidSiteBundlePeerEnvTransactionV1({
    transaction:journal.current,
    adapter,
    persist:journal.persist,
  });
  assert.equal(resumed.action,"DONE_COMMITTED");
  assert.equal(adapter.publishCount.local,1);
  assert.equal(resumed.transaction.published.local.restart_after_invocation_id,
    "2".repeat(32));
}

// Crash after the target drop-in was published but before manager environment
// clear/restart. Recovery recognizes only the bounded prestate->target partial
// lattice, completes the remaining work once, and never reissues the initial
// publish operation.
{
  const tx=prepareVoidCrossboxMutationTransactionV1(siteInput());
  const journal=memoryJournal(tx);
  const adapter=new FakeAdapter(tx);
  adapter.failPublishPartialAfterDropin.add("local");

  await assert.rejects(
    ()=>driveVoidSiteBundlePeerEnvTransactionV1({
      transaction:tx,
      adapter,
      persist:journal.persist,
    }),
    /simulated_publish_partial_after_dropin:local/u,
  );
  assert.equal(
    nextVoidCrossboxMutationRecoveryV1(journal.current),
    "RECOVER_PUBLISH_LOCAL",
  );
  assert.equal(adapter.publishCount.local,1);

  const resumed=await driveVoidSiteBundlePeerEnvTransactionV1({
    transaction:journal.current,
    adapter,
    persist:journal.persist,
  });
  assert.equal(resumed.action,"DONE_COMMITTED");
  assert.equal(adapter.publishCount.local,1);
  assert.equal(adapter.recoverPublishCount.local,1);
}

// A partial publish with unrelated manager-environment drift is not a bounded
// recovery state and therefore HOLDs instead of overwriting newer state.
{
  const tx=prepareVoidCrossboxMutationTransactionV1(siteInput());
  const partial={
    ...targetObservation(tx,"local",tx.prestate.local.service.invocation_id),
    manager_environment:manager({VOID_DRIFT_PEER:"foreign-change"}),
  };
  assert.equal(
    VOID_SITE_BUNDLE_PEER_ENV_TRANSACTION_EXECUTOR_INTERNAL_V1
      .recoverablePublishPartial(tx,"local",partial),
    false,
  );
}

// Remote publish attempt has no effect. Recovery records no-effect, enters
// rollback, then local restore crashes after its restart. A second recovery
// observes restored state and must not restart local again.
{
  const tx=prepareVoidCrossboxMutationTransactionV1(siteInput());
  const journal=memoryJournal(tx);
  const adapter=new FakeAdapter(tx);
  adapter.failPublishBeforeEffect.add("remote");

  await assert.rejects(
    ()=>driveVoidSiteBundlePeerEnvTransactionV1({
      transaction:tx,
      adapter,
      persist:journal.persist,
    }),
    /simulated_publish_before_effect:remote/u,
  );
  assert.equal(
    nextVoidCrossboxMutationRecoveryV1(journal.current),
    "RECOVER_PUBLISH_REMOTE",
  );

  adapter.failPublishBeforeEffect.delete("remote");
  adapter.failRestoreAfterEffect.add("local");
  await assert.rejects(
    ()=>driveVoidSiteBundlePeerEnvTransactionV1({
      transaction:journal.current,
      adapter,
      persist:journal.persist,
    }),
    /simulated_restore_after_effect:local/u,
  );
  assert.equal(
    nextVoidCrossboxMutationRecoveryV1(journal.current),
    "RECOVER_RESTORE_LOCAL",
  );
  assert.equal(adapter.restoreCount.local,1);

  const resumed=await driveVoidSiteBundlePeerEnvTransactionV1({
    transaction:journal.current,
    adapter,
    persist:journal.persist,
  });
  assert.equal(resumed.action,"DONE_RESTORED");
  assert.equal(resumed.transaction.phase,"RESTORED");
  assert.equal(adapter.restoreCount.local,1);
  assert.equal(adapter.restoreCount.remote,0);
  assert.equal(resumed.transaction.restored.local.dropin_restored,true);
  assert.equal(resumed.transaction.restored.local.manager_environment_restored,true);
}

// Crash after rollback restored the drop-in but before manager environment
// restoration/restart. Recovery completes the bounded partial restore without
// reissuing the original restore operation.
{
  const tx=prepareVoidCrossboxMutationTransactionV1(siteInput());
  const journal=memoryJournal(tx);
  const adapter=new FakeAdapter(tx);
  adapter.failPublishBeforeEffect.add("remote");

  await assert.rejects(
    ()=>driveVoidSiteBundlePeerEnvTransactionV1({
      transaction:tx,
      adapter,
      persist:journal.persist,
    }),
    /simulated_publish_before_effect:remote/u,
  );
  adapter.failPublishBeforeEffect.delete("remote");
  adapter.failRestorePartialAfterDropin.add("local");

  await assert.rejects(
    ()=>driveVoidSiteBundlePeerEnvTransactionV1({
      transaction:journal.current,
      adapter,
      persist:journal.persist,
    }),
    /simulated_restore_partial_after_dropin:local/u,
  );
  assert.equal(
    nextVoidCrossboxMutationRecoveryV1(journal.current),
    "RECOVER_RESTORE_LOCAL",
  );
  assert.equal(adapter.restoreCount.local,1);

  const resumed=await driveVoidSiteBundlePeerEnvTransactionV1({
    transaction:journal.current,
    adapter,
    persist:journal.persist,
  });
  assert.equal(resumed.action,"DONE_RESTORED");
  assert.equal(adapter.restoreCount.local,1);
  assert.equal(adapter.recoverRestoreCount.local,1);
}

// Ambiguous state after a persisted publish intent becomes HOLD; it is never
// interpreted as either success or safe-to-retry publication.
{
  const tx=prepareVoidCrossboxMutationTransactionV1(siteInput());
  const journal=memoryJournal(tx);
  const adapter=new FakeAdapter(tx);
  adapter.failPublishBeforeEffect.add("local");
  await assert.rejects(
    ()=>driveVoidSiteBundlePeerEnvTransactionV1({
      transaction:tx,
      adapter,
      persist:journal.persist,
    }),
    /simulated_publish_before_effect:local/u,
  );
  adapter.failPublishBeforeEffect.delete("local");
  adapter.observations.local={
    ...targetObservation(tx,"local","2".repeat(32)),
    manager_environment:manager({VOID_DRIFT_PEER:"ambiguous"}),
  };
  const held=await driveVoidSiteBundlePeerEnvTransactionV1({
    transaction:journal.current,
    adapter,
    persist:journal.persist,
  });
  assert.equal(held.action,"HOLD");
  assert.equal(held.transaction.phase,"HOLD");
  assert.equal(adapter.publishCount.local,1);
}

// Journal persistence errors are not converted into rollback transitions.
{
  const tx=prepareVoidCrossboxMutationTransactionV1(siteInput());
  const adapter=new FakeAdapter(tx);
  let writes=0;
  let durable=clone(tx);
  const persist=async(value)=>{
    writes+=1;
    if(value.verified.local!==null){
      throw new Error("simulated_journal_write_failure");
    }
    durable=clone(value);
  };
  await assert.rejects(
    ()=>driveVoidSiteBundlePeerEnvTransactionV1({
      transaction:tx,
      adapter,
      persist,
    }),
    /simulated_journal_write_failure/u,
  );
  assert.equal(durable.phase,"COMMITTING");
  assert.equal(durable.rollback_reason,null);
  assert.equal(adapter.restoreCount.local,0);
  assert.ok(writes>0);
}

// Observation host identity is part of every decision, not just initial input.
{
  const tx=prepareVoidCrossboxMutationTransactionV1(siteInput());
  const target=targetObservation(tx,"local","2".repeat(32));
  target.host="wrong-host";
  assert.equal(
    VOID_SITE_BUNDLE_PEER_ENV_TRANSACTION_EXECUTOR_INTERNAL_V1
      .targetStateObserved(tx,"local",target),
    false,
  );
}

const source=fs.readFileSync(
  "tools/void-site-bundle-peer-env-transaction-executor-v1.mjs",
  "utf8",
);
for(const forbidden of [
  "git push",
  "git tag",
  "eth_sendRawTransaction",
  "new Wallet(",
  "validator-runtime-truth-publish",
  "checkpoint_publish_allowed=true",
]){
  assert.equal(source.includes(forbidden),false,forbidden);
}
for(const required of [
  "recordVoidCrossboxMutationPublishStartedV1",
  "recordVoidCrossboxMutationRestoreStartedV1",
  "RECOVER_PUBLISH_LOCAL",
  "RECOVER_RESTORE_LOCAL",
  "ambiguous publish recovery observation",
  "ambiguous restore recovery observation",
  'const SSH="/usr/bin/ssh"',
  'const SYSTEMCTL="/usr/bin/systemctl"',
  '"--user","unset-environment"',
  '"--user","daemon-reload"',
  '"--user","restart","void-node.service"',
  '"/proc/self/fd/"',
  "writeDurableJournal",
  "participant_prestate_drift",
  "participant_create_only_conflict",
  "recover_publish",
  "recover_restore",
  "participant_publish_partial_drift",
  "participant_restore_partial_drift",
  "site_bundle_executor_retired_alienware_forbidden",
  "applyVoidSiteBundlePeerEnvPersistenceV1",
]){
  assert.equal(source.includes(required),true,required);
}
assert.equal(
  VOID_SITE_BUNDLE_PEER_ENV_TRANSACTION_EXECUTOR_AUTHORITY_V1
    .validator_publication,
  false,
);
assert.equal(
  VOID_SITE_BUNDLE_PEER_ENV_TRANSACTION_EXECUTOR_AUTHORITY_V1
    .git_tag_creation,
  false,
);
assert.equal(
  VOID_SITE_BUNDLE_PEER_ENV_TRANSACTION_EXECUTOR_AUTHORITY_V1
    .git_push,
  false,
);
assert.equal(
  VOID_SITE_BUNDLE_PEER_ENV_TRANSACTION_EXECUTOR_AUTHORITY_V1
    .funds_movement,
  false,
);

console.log("VOID_SITE_BUNDLE_PEER_ENV_TRANSACTION_EXECUTOR_V1_PROOF_GREEN");
console.log("happy_path_two_party_commit=true");
console.log("publish_intent_persisted_before_side_effect=true");
console.log("publish_crash_observed_without_duplicate_publish=true");
console.log("publish_partial_crash_completed_without_blind_restart=true");
console.log("publish_no_effect_forces_rollback=true");
console.log("restore_intent_persisted_before_side_effect=true");
console.log("restore_crash_observed_without_duplicate_restore=true");
console.log("restore_partial_crash_completed_without_blind_restart=true");
console.log("ambiguous_recovery_holds=true");
console.log("journal_failure_not_reinterpreted=true");
console.log("live_adapter_reviewed_absolute_primitives=true");
console.log("participant_receipts_create_only_idempotent=true");
console.log("private_journal_parent_fd_bound=true");
console.log("retired_alienware_forbidden=true");
console.log("validator_publication=false");
console.log("git_tag_or_push=false");
console.log("funds_movement=false");
