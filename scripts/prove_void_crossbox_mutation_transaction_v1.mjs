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
  recordVoidCrossboxMutationPublishedV1,
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
assert.equal(nextVoidCrossboxMutationRecoveryV1(site),"PUBLISH_LOCAL");

const sitePublishLocal=publishReceipt(site,"local");
site=recordVoidCrossboxMutationPublishedV1(site,sitePublishLocal);
assert.equal(nextVoidCrossboxMutationRecoveryV1(site),"PUBLISH_REMOTE");

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
const rollbackPublishLocal=publishReceipt(rollback,"local");
rollback=recordVoidCrossboxMutationPublishedV1(
  rollback,
  rollbackPublishLocal,
);
rollback=beginVoidCrossboxMutationRollbackV1(
  rollback,
  "remote publication failed",
);
assert.equal(nextVoidCrossboxMutationRecoveryV1(rollback),"RESTORE_LOCAL");
const restoreLocal=restoreReceipt(rollback,"local");
assert.equal(restoreLocal.restart_performed,true);
rollback=recordVoidCrossboxMutationRestoredV1(rollback,restoreLocal);
assert.equal(nextVoidCrossboxMutationRecoveryV1(rollback),"RESTORE_REMOTE");
const duplicateRestore=recordVoidCrossboxMutationRestoredV1(
  rollback,
  restoreLocal,
);
assert.equal(duplicateRestore.state_id,rollback.state_id);

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

// A restart for a previously active service must advance InvocationID.
{
  let tx=prepareVoidCrossboxMutationTransactionV1(siteInput());
  tx=recordVoidCrossboxMutationPreparedV1(tx,prepareReceipt(tx,"local"));
  tx=recordVoidCrossboxMutationPreparedV1(tx,prepareReceipt(tx,"remote"));
  tx=beginVoidCrossboxMutationCommitV1(tx);
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

const validatorPublishLocal=publishReceipt(validator,"local");
assert.equal(validatorPublishLocal.restart_performed,false);
validator=recordVoidCrossboxMutationPublishedV1(
  validator,
  validatorPublishLocal,
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
console.log("validator_checkpoint_after_two_party_commit_only=true");
console.log("ssh_execution=false");
console.log("systemd_mutation=false");
console.log("validator_publication=false");
console.log("git_tag_or_push=false");
console.log("funds_movement=false");
