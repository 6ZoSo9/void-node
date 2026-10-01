#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  VOID_CROSSBOX_MUTATION_TRANSACTION_AUTHORITY_V1,
  VOID_CROSSBOX_MUTATION_TRANSACTION_CONFIRMATION_V1,
  VOID_CROSSBOX_MUTATION_TRANSACTION_V1,
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
} from "../tools/void-crossbox-mutation-transaction-v1.mjs";

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

function forgeStoredState(transaction,mutator){
  const copy=structuredClone(transaction);
  mutator(copy);
  delete copy.state_id;
  copy.state_id=
    "voidxms1_"+sha256(Buffer.from(canonical(copy),"utf8"));
  return copy;
}

function managerEnv(overrides={}){
  return {
    VOID_SITE_BUNDLE_PEERS:null,
    VOID_DATANET_SITE_BUNDLE_PEERS:null,
    VOID_DATANET_PEERS:null,
    VOID_DRIFT_PEER:null,
    ...overrides,
  };
}

function siteInput(){
  return {
    kind:"site_bundle_peer_env",
    source:{
      repository_head_sha:"a".repeat(40),
      local_host:"Precision-Box",
      remote_host:"Nimo-Box",
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
        manager_environment:managerEnv({
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
        manager_environment:managerEnv({
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
      local_peer:"http://100.64.0.2:4100",
      remote_peer:"http://100.64.0.1:4100",
      local_target_dropin_sha256:"3".repeat(64),
      remote_target_dropin_sha256:"4".repeat(64),
      restart_if_active:{
        local:true,
        remote:true,
      },
    },
    confirmation:
      VOID_CROSSBOX_MUTATION_TRANSACTION_CONFIRMATION_V1,
  };
}

function validatorInput(){
  return {
    kind:"validator_truth_closeout",
    source:{
      repository_head_sha:"b".repeat(40),
      local_host:"precision",
      remote_host:"xiphos",
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
      restart_if_active:{
        local:false,
        remote:true,
      },
    },
    confirmation:
      VOID_CROSSBOX_MUTATION_TRANSACTION_CONFIRMATION_V1,
  };
}

function prepareReceipt(transaction,participant){
  return {
    transaction_id:transaction.transaction_id,
    participant,
    prestate_id:prestateId(transaction,participant),
    staged_state_sha256:
      transaction.kind==="site_bundle_peer_env"
        ?participant==="local"
          ?transaction.intended.local_target_dropin_sha256
          :transaction.intended.remote_target_dropin_sha256
        :transaction.intended.manifest_set_sha256,
    publication_performed:false,
  };
}

function publishStartedReceipt(transaction,participant,overrides={}){
  const restart=(
    transaction.intended.restart_if_active[participant]===true&&
    transaction.prestate[participant].service.active===true
  );
  return {
    transaction_id:transaction.transaction_id,
    participant,
    prestate_id_before_publish:prestateId(transaction,participant),
    published_state_sha256:
      transaction.kind==="site_bundle_peer_env"
        ?participant==="local"
          ?transaction.intended.local_target_dropin_sha256
          :transaction.intended.remote_target_dropin_sha256
        :transaction.intended.manifest_set_sha256,
    restart_expected:restart,
    restart_before_invocation_id:restart
      ?transaction.prestate[participant].service.invocation_id
      :null,
    publication_performed:false,
    ...overrides,
  };
}

function publishNoEffectReceipt(transaction,participant,overrides={}){
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
    ...overrides,
  };
}

function publishReceipt(transaction,participant,overrides={}){
  const restart=(
    transaction.intended.restart_if_active[participant]===true&&
    transaction.prestate[participant].service.active===true
  );
  return {
    transaction_id:transaction.transaction_id,
    participant,
    prestate_id_before_publish:prestateId(transaction,participant),
    published_state_sha256:
      transaction.kind==="site_bundle_peer_env"
        ?participant==="local"
          ?transaction.intended.local_target_dropin_sha256
          :transaction.intended.remote_target_dropin_sha256
        :transaction.intended.manifest_set_sha256,
    restart_performed:restart,
    restart_before_invocation_id:restart
      ?transaction.prestate[participant].service.invocation_id
      :null,
    restart_after_invocation_id:restart
      ?participant==="local"
        ?"2".repeat(32)
        :"c".repeat(32)
      :null,
    ...overrides,
  };
}

function verifyReceipt(transaction,participant,published){
  return {
    transaction_id:transaction.transaction_id,
    participant,
    observed_state_sha256:
      transaction.kind==="site_bundle_peer_env"
        ?participant==="local"
          ?transaction.intended.local_target_dropin_sha256
          :transaction.intended.remote_target_dropin_sha256
        :transaction.intended.manifest_set_sha256,
    service_active:transaction.prestate[participant].service.active,
    service_invocation_id:
      transaction.prestate[participant].service.active
        ?published.restart_performed
          ?published.restart_after_invocation_id
          :transaction.prestate[participant].service.invocation_id
        :null,
    intended_state_verified:true,
  };
}

function restoreStartedReceipt(transaction,participant,overrides={}){
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
    ...overrides,
  };
}

function restoreReceipt(transaction,participant,overrides={}){
  const published=transaction.published[participant];
  const restart=Boolean(
    published&&
    transaction.intended.restart_if_active[participant]===true&&
    transaction.prestate[participant].service.active===true
  );
  const common={
    transaction_id:transaction.transaction_id,
    participant,
    restored_prestate_id:prestateId(transaction,participant),
    service_state_restored:true,
    restart_performed:restart,
    restart_before_invocation_id:restart
      ?published.restart_after_invocation_id
      :null,
    restart_after_invocation_id:restart
      ?"d".repeat(32)
      :null,
  };
  if(transaction.kind==="site_bundle_peer_env"){
    return {
      ...common,
      dropin_restored:true,
      manager_environment_restored:true,
      ...overrides,
    };
  }
  return {
    ...common,
    verified_current_restored:true,
    shadow_runtime_restored:true,
    ...overrides,
  };
}

assert.equal(
  VOID_CROSSBOX_MUTATION_TRANSACTION_V1,
  "VOID_CROSSBOX_MUTATION_TRANSACTION_V1",
);
const authorityTrue=new Set([
  "source_contract_only",
  "two_participant_transaction_required",
  "exact_prestate_restoration_required",
  "idempotent_recovery_required",
  "partial_state_green_forbidden",
  "checkpoint_publish_after_two_party_commit_only",
]);
for(const [key,value] of Object.entries(
  VOID_CROSSBOX_MUTATION_TRANSACTION_AUTHORITY_V1,
)){
  assert.equal(value,authorityTrue.has(key),key);
}

// Site-bundle happy path: both participants must prepare, publish, verify, then
// and only then can the transaction be committed.
let site=prepareVoidCrossboxMutationTransactionV1(siteInput());
assert.match(site.transaction_id,/^voidxmtx1_[0-9a-f]{64}$/u);
assert.match(site.state_id,/^voidxms1_[0-9a-f]{64}$/u);
assert.equal(site.source.local_host,"precision-box");
assert.equal(site.source.remote_host,"nimo-box");
assert.equal(nextVoidCrossboxMutationRecoveryV1(site),"PREPARE_LOCAL");
assert.equal(site.checkpoint_publish_allowed,false);

const sitePrepareLocal=prepareReceipt(site,"local");
site=recordVoidCrossboxMutationPreparedV1(site,sitePrepareLocal);
assert.equal(nextVoidCrossboxMutationRecoveryV1(site),"PREPARE_REMOTE");
const duplicatePrepare=recordVoidCrossboxMutationPreparedV1(
  site,
  sitePrepareLocal,
);
assert.equal(duplicatePrepare.state_id,site.state_id);

const sitePrepareRemote=prepareReceipt(site,"remote");
site=recordVoidCrossboxMutationPreparedV1(site,sitePrepareRemote);
assert.equal(site.phase,"PREPARED");
assert.equal(nextVoidCrossboxMutationRecoveryV1(site),"BEGIN_COMMIT");
assert.throws(
  ()=>finalizeVoidCrossboxMutationCommittedV1(site),
  /commit_finalize_phase_invalid/u,
);

site=beginVoidCrossboxMutationCommitV1(site);
assert.equal(nextVoidCrossboxMutationRecoveryV1(site),"BEGIN_PUBLISH_LOCAL");
site=recordVoidCrossboxMutationPublishStartedV1(
  site,
  publishStartedReceipt(site,"local"),
);
assert.equal(nextVoidCrossboxMutationRecoveryV1(site),"RECOVER_PUBLISH_LOCAL");

const sitePublishLocal=publishReceipt(site,"local");
site=recordVoidCrossboxMutationPublishedV1(site,sitePublishLocal);
assert.equal(nextVoidCrossboxMutationRecoveryV1(site),"BEGIN_PUBLISH_REMOTE");
site=recordVoidCrossboxMutationPublishStartedV1(
  site,
  publishStartedReceipt(site,"remote"),
);
assert.equal(nextVoidCrossboxMutationRecoveryV1(site),"RECOVER_PUBLISH_REMOTE");

const sitePublishRemote=publishReceipt(site,"remote");
assert.equal(sitePublishRemote.restart_performed,false);
site=recordVoidCrossboxMutationPublishedV1(site,sitePublishRemote);
assert.equal(nextVoidCrossboxMutationRecoveryV1(site),"VERIFY_LOCAL");

site=recordVoidCrossboxMutationVerifiedV1(
  site,
  verifyReceipt(site,"local",sitePublishLocal),
);
assert.equal(nextVoidCrossboxMutationRecoveryV1(site),"VERIFY_REMOTE");
assert.throws(
  ()=>finalizeVoidCrossboxMutationCommittedV1(site),
  /commit_requires_two_verified_participants/u,
);

site=recordVoidCrossboxMutationVerifiedV1(
  site,
  verifyReceipt(site,"remote",sitePublishRemote),
);
assert.equal(nextVoidCrossboxMutationRecoveryV1(site),"FINALIZE_COMMIT");
site=finalizeVoidCrossboxMutationCommittedV1(site);
assert.equal(site.phase,"COMMITTED");
assert.equal(site.checkpoint_publish_allowed,false);
assert.equal(nextVoidCrossboxMutationRecoveryV1(site),"DONE_COMMITTED");
assert.equal(
  finalizeVoidCrossboxMutationCommittedV1(site).state_id,
  site.state_id,
);
assert.throws(
  ()=>holdVoidCrossboxMutationTransactionV1(site,"late hold"),
  /hold_terminal_success_forbidden/u,
);

// One-sided site mutation fails before remote publication. Recovery requires
// explicit confirmation that both participants match their exact pre-state;
// only the mutated active local service needs a recovery restart.
let rollback=prepareVoidCrossboxMutationTransactionV1(siteInput());
rollback=recordVoidCrossboxMutationPreparedV1(
  rollback,
  prepareReceipt(rollback,"local"),
);
rollback=recordVoidCrossboxMutationPreparedV1(
  rollback,
  prepareReceipt(rollback,"remote"),
);
rollback=beginVoidCrossboxMutationCommitV1(rollback);
rollback=recordVoidCrossboxMutationPublishStartedV1(
  rollback,
  publishStartedReceipt(rollback,"local"),
);
const rollbackPublishLocal=publishReceipt(rollback,"local");
rollback=recordVoidCrossboxMutationPublishedV1(
  rollback,
  rollbackPublishLocal,
);
rollback=beginVoidCrossboxMutationRollbackV1(
  rollback,
  "remote publication failed",
);
assert.equal(nextVoidCrossboxMutationRecoveryV1(rollback),"BEGIN_RESTORE_LOCAL");
rollback=recordVoidCrossboxMutationRestoreStartedV1(
  rollback,
  restoreStartedReceipt(rollback,"local"),
);
assert.equal(nextVoidCrossboxMutationRecoveryV1(rollback),"RECOVER_RESTORE_LOCAL");
assert.throws(
  ()=>recordVoidCrossboxMutationRestoredV1(
    rollback,
    restoreReceipt(rollback,"local",{
      restart_before_invocation_id:"e".repeat(32),
    }),
  ),
  /restore_restart_before_publish_mismatch/u,
);
// Simulate a successful rollback restart followed by process/power loss before
// the final restore receipt is persisted. The durable start must cause recovery
// to observe first instead of issuing a blind second restart.
assert.equal(nextVoidCrossboxMutationRecoveryV1(rollback),"RECOVER_RESTORE_LOCAL");
const restoreLocal=restoreReceipt(rollback,"local",{
  restart_after_invocation_id:"f".repeat(32),
});
assert.equal(restoreLocal.restart_performed,true);
assert.equal(
  restoreLocal.restart_before_invocation_id,
  rollbackPublishLocal.restart_after_invocation_id,
);
rollback=recordVoidCrossboxMutationRestoredV1(rollback,restoreLocal);
assert.equal(nextVoidCrossboxMutationRecoveryV1(rollback),"BEGIN_RESTORE_REMOTE");
const duplicateRestore=recordVoidCrossboxMutationRestoredV1(
  rollback,
  restoreLocal,
);
assert.equal(duplicateRestore.state_id,rollback.state_id);

rollback=recordVoidCrossboxMutationRestoreStartedV1(
  rollback,
  restoreStartedReceipt(rollback,"remote"),
);
assert.equal(nextVoidCrossboxMutationRecoveryV1(rollback),"RECOVER_RESTORE_REMOTE");
const restoreRemote=restoreReceipt(rollback,"remote");
assert.equal(restoreRemote.restart_performed,false);
rollback=recordVoidCrossboxMutationRestoredV1(rollback,restoreRemote);
assert.equal(nextVoidCrossboxMutationRecoveryV1(rollback),"FINALIZE_RESTORE");
rollback=finalizeVoidCrossboxMutationRestoredV1(rollback);
assert.equal(rollback.phase,"RESTORED");
assert.equal(rollback.checkpoint_publish_allowed,false);
assert.equal(nextVoidCrossboxMutationRecoveryV1(rollback),"DONE_RESTORED");
assert.equal(
  finalizeVoidCrossboxMutationRestoredV1(rollback).state_id,
  rollback.state_id,
);

// Prestate must be re-observed immediately before publication so a stale
// PREPARED receipt cannot overwrite concurrent operator changes.
{
  let tx=prepareVoidCrossboxMutationTransactionV1(siteInput());
  tx=recordVoidCrossboxMutationPreparedV1(tx,prepareReceipt(tx,"local"));
  tx=recordVoidCrossboxMutationPreparedV1(tx,prepareReceipt(tx,"remote"));
  tx=beginVoidCrossboxMutationCommitV1(tx);
  tx=recordVoidCrossboxMutationPublishStartedV1(
    tx,
    publishStartedReceipt(tx,"local"),
  );
  assert.throws(
    ()=>recordVoidCrossboxMutationPublishedV1(
      tx,
      publishReceipt(tx,"local",{
        prestate_id_before_publish:"sha256:"+"0".repeat(64),
      }),
    ),
    /publish_prestate_drift/u,
  );
}

// Durable journals must exist before authority-bearing publish/restore effects.
{
  const transactionSource=fs.readFileSync(
    "tools/void-crossbox-mutation-transaction-v1.mjs",
    "utf8",
  );
  for(const required of [
    "publish_started",
    "publish_no_effect",
    "restore_started",
    "rollback_publish_start_unresolved",
    "RECOVER_PUBLISH_LOCAL",
    "RECOVER_RESTORE_LOCAL",
    "restore_restart_before_publish_mismatch",
  ]){
    assert(transactionSource.includes(required),required);
  }
}

// A restart for a previously active service must advance InvocationID.
{
  let tx=prepareVoidCrossboxMutationTransactionV1(siteInput());
  tx=recordVoidCrossboxMutationPreparedV1(tx,prepareReceipt(tx,"local"));
  tx=recordVoidCrossboxMutationPreparedV1(tx,prepareReceipt(tx,"remote"));
  tx=beginVoidCrossboxMutationCommitV1(tx);
  tx=recordVoidCrossboxMutationPublishStartedV1(
    tx,
    publishStartedReceipt(tx,"local"),
  );
  assert.throws(
    ()=>recordVoidCrossboxMutationPublishedV1(
      tx,
      publishReceipt(tx,"local",{
        restart_after_invocation_id:"1".repeat(32),
      }),
    ),
    /publish_restart_invocation_not_advanced/u,
  );
}

// A durable publish-start witness closes the side-effect/receipt crash window.
// Recovery observes first; rollback is forbidden while the publish outcome is
// still ambiguous.
{
  let tx=prepareVoidCrossboxMutationTransactionV1(siteInput());
  tx=recordVoidCrossboxMutationPreparedV1(tx,prepareReceipt(tx,"local"));
  tx=recordVoidCrossboxMutationPreparedV1(tx,prepareReceipt(tx,"remote"));
  tx=beginVoidCrossboxMutationCommitV1(tx);
  tx=recordVoidCrossboxMutationPublishStartedV1(
    tx,
    publishStartedReceipt(tx,"local"),
  );
  assert.equal(nextVoidCrossboxMutationRecoveryV1(tx),"RECOVER_PUBLISH_LOCAL");
  assert.throws(
    ()=>beginVoidCrossboxMutationRollbackV1(
      tx,
      "crash after publish side effect before receipt",
    ),
    /rollback_publish_start_unresolved:local/u,
  );

  // Simulate recovery observing that publish+restart completed before the
  // crash. Persisting the final receipt completes the outcome without another
  // publish-start/restart.
  tx=recordVoidCrossboxMutationPublishedV1(
    tx,
    publishReceipt(tx,"local",{
      restart_after_invocation_id:"e".repeat(32),
    }),
  );
  assert.equal(nextVoidCrossboxMutationRecoveryV1(tx),"BEGIN_PUBLISH_REMOTE");
}

// If recovery proves the original prestate/invocation is still exact, it can
// close a started publish as no-effect and force rollback instead of retry.
{
  let tx=prepareVoidCrossboxMutationTransactionV1(siteInput());
  tx=recordVoidCrossboxMutationPreparedV1(tx,prepareReceipt(tx,"local"));
  tx=recordVoidCrossboxMutationPreparedV1(tx,prepareReceipt(tx,"remote"));
  tx=beginVoidCrossboxMutationCommitV1(tx);
  tx=recordVoidCrossboxMutationPublishStartedV1(
    tx,
    publishStartedReceipt(tx,"local"),
  );
  tx=recordVoidCrossboxMutationPublishNoEffectV1(
    tx,
    publishNoEffectReceipt(tx,"local"),
  );
  assert.equal(nextVoidCrossboxMutationRecoveryV1(tx),"BEGIN_ROLLBACK");
  tx=beginVoidCrossboxMutationRollbackV1(tx,"publish observed no-effect");
  assert.equal(tx.phase,"ROLLING_BACK");
  assert.equal(nextVoidCrossboxMutationRecoveryV1(tx),"BEGIN_RESTORE_LOCAL");
}

// Conflicting duplicate receipts fail closed.
{
  let tx=prepareVoidCrossboxMutationTransactionV1(siteInput());
  const first=prepareReceipt(tx,"local");
  tx=recordVoidCrossboxMutationPreparedV1(tx,first);
  assert.throws(
    ()=>recordVoidCrossboxMutationPreparedV1(tx,{
      ...first,
      staged_state_sha256:"f".repeat(64),
    }),
    /prepare_staged_state_mismatch|prepared_conflicting_duplicate/u,
  );
}

// Recomputing the outer state ID cannot authorize immutable-intent drift.
{
  const tx=prepareVoidCrossboxMutationTransactionV1(siteInput());
  const forged=forgeStoredState(tx,(value)=>{
    value.intended.local_target_dropin_sha256="e".repeat(64);
  });
  assert.throws(
    ()=>nextVoidCrossboxMutationRecoveryV1(forged),
    /transaction_id_mismatch/u,
  );
}

// Recomputing state ID cannot widen the source-only authority object.
{
  const tx=prepareVoidCrossboxMutationTransactionV1(siteInput());
  const forged=forgeStoredState(tx,(value)=>{
    value.authority.systemd_mutation=true;
  });
  assert.throws(
    ()=>nextVoidCrossboxMutationRecoveryV1(forged),
    /transaction_authority_mismatch/u,
  );
}

// Stored receipt semantics are re-derived on every transition/recovery read.
{
  let tx=prepareVoidCrossboxMutationTransactionV1(siteInput());
  tx=recordVoidCrossboxMutationPreparedV1(tx,prepareReceipt(tx,"local"));
  const forged=forgeStoredState(tx,(value)=>{
    value.prepared.local.staged_state_sha256="f".repeat(64);
  });
  assert.throws(
    ()=>nextVoidCrossboxMutationRecoveryV1(forged),
    /prepare_staged_state_mismatch/u,
  );
}

// A forged phase cannot turn an empty transaction into a terminal GREEN state.
{
  const tx=prepareVoidCrossboxMutationTransactionV1(siteInput());
  const forged=forgeStoredState(tx,(value)=>{
    value.phase="COMMITTED";
  });
  assert.throws(
    ()=>nextVoidCrossboxMutationRecoveryV1(forged),
    /transaction_committed_state_invalid/u,
  );
}

// Participant host identity is canonicalized and cannot differ only by case.
{
  const bad=siteInput();
  bad.source.local_host="SameHost";
  bad.source.remote_host="samehost";
  bad.prestate.local.host="samehost";
  bad.prestate.remote.host="samehost";
  assert.throws(
    ()=>prepareVoidCrossboxMutationTransactionV1(bad),
    /source_hosts_must_be_distinct/u,
  );
}

// Manager environment is part of the exact pre-state contract.
{
  const bad=siteInput();
  bad.prestate.local.manager_environment.EXTRA="forbidden";
  assert.throws(
    ()=>prepareVoidCrossboxMutationTransactionV1(bad),
    /site_local_manager_environment_shape/u,
  );
}

// Validator commit: checkpoint/tag authority stays false until both
// participants have published and independently verified the same manifest set.
let validator=prepareVoidCrossboxMutationTransactionV1(validatorInput());
validator=recordVoidCrossboxMutationPreparedV1(
  validator,
  prepareReceipt(validator,"local"),
);
validator=recordVoidCrossboxMutationPreparedV1(
  validator,
  prepareReceipt(validator,"remote"),
);
validator=beginVoidCrossboxMutationCommitV1(validator);
assert.equal(validator.checkpoint_publish_allowed,false);

validator=recordVoidCrossboxMutationPublishStartedV1(
  validator,
  publishStartedReceipt(validator,"local"),
);
const validatorPublishLocal=publishReceipt(validator,"local");
assert.equal(validatorPublishLocal.restart_performed,false);
validator=recordVoidCrossboxMutationPublishedV1(
  validator,
  validatorPublishLocal,
);
validator=recordVoidCrossboxMutationPublishStartedV1(
  validator,
  publishStartedReceipt(validator,"remote"),
);
const validatorPublishRemote=publishReceipt(validator,"remote");
assert.equal(validatorPublishRemote.restart_performed,true);
validator=recordVoidCrossboxMutationPublishedV1(
  validator,
  validatorPublishRemote,
);
validator=recordVoidCrossboxMutationVerifiedV1(
  validator,
  verifyReceipt(validator,"local",validatorPublishLocal),
);
validator=recordVoidCrossboxMutationVerifiedV1(
  validator,
  verifyReceipt(validator,"remote",validatorPublishRemote),
);
assert.equal(validator.checkpoint_publish_allowed,false);
assert.throws(
  ()=>finalizeVoidCrossboxMutationCommittedV1(validator),
  /validator_commit_options_shape|validator_checkpoint_tag_absence_recheck_required/u,
);
validator=finalizeVoidCrossboxMutationCommittedV1(
  validator,
  {checkpoint_tag_absent_verified:true},
);
assert.equal(validator.phase,"COMMITTED");
assert.equal(validator.checkpoint_publish_allowed,true);
assert.equal(nextVoidCrossboxMutationRecoveryV1(validator),"DONE_COMMITTED");

// A pre-existing checkpoint tag is never admissible as a fresh transaction.
{
  const bad=validatorInput();
  bad.intended.checkpoint_tag_preexisting=true;
  assert.throws(
    ()=>prepareVoidCrossboxMutationTransactionV1(bad),
    /validator_checkpoint_tag_must_be_absent/u,
  );
}

// Partial transactions cannot be declared green, and HOLD is explicit.
{
  let tx=prepareVoidCrossboxMutationTransactionV1(siteInput());
  assert.throws(
    ()=>finalizeVoidCrossboxMutationCommittedV1(tx),
    /commit_finalize_phase_invalid/u,
  );
  tx=holdVoidCrossboxMutationTransactionV1(
    tx,
    "unrecognized durable participant state",
  );
  assert.equal(tx.phase,"HOLD");
  assert.equal(tx.checkpoint_publish_allowed,false);
  assert.equal(nextVoidCrossboxMutationRecoveryV1(tx),"HOLD");
  assert.equal(
    holdVoidCrossboxMutationTransactionV1(
      tx,
      "unrecognized durable participant state",
    ).state_id,
    tx.state_id,
  );
  assert.throws(
    ()=>holdVoidCrossboxMutationTransactionV1(tx,"different reason"),
    /hold_reason_conflict/u,
  );
}

// The contract itself remains hermetic/source-only.
const source=fs.readFileSync(
  "tools/void-crossbox-mutation-transaction-v1.mjs",
  "utf8",
);
for(const forbidden of [
  "child_process",
  "spawnSync(",
  "execFile",
  "systemctl",
  "ssh ",
  "git push",
  "git tag",
  "fetch(",
  "eth_sendRawTransaction",
  "new Wallet(",
]){
  assert.equal(source.includes(forbidden),false,forbidden);
}

console.log("VOID_CROSSBOX_MUTATION_TRANSACTION_V1_PROOF_GREEN");
console.log("two_participant_prepare_required=true");
console.log("partial_state_green_forbidden=true");
console.log("site_manager_environment_in_prestate=true");
console.log("active_service_invocation_must_advance=true");
console.log("rollback_exact_prestate_receipts_required=true");
console.log("duplicate_recovery_idempotent=true");
console.log("publish_side_effect_intent_durable=true");
console.log("publish_crash_requires_observation_before_retry=true");
console.log("restore_side_effect_intent_durable=true");
console.log("restore_restart_crash_recovers_without_blind_second_restart=true");
console.log("stored_transaction_intent_rederived=true");
console.log("stored_receipts_rederived=true");
console.log("forged_state_id_cannot_widen_authority=true");
console.log("validator_checkpoint_after_two_party_commit_only=true");
console.log("ssh_execution=false");
console.log("systemd_mutation=false");
console.log("validator_publication=false");
console.log("git_tag_or_push=false");
console.log("funds_movement=false");
