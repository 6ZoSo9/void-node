#!/usr/bin/env node
import crypto from "node:crypto";

export const VOID_CROSSBOX_MUTATION_TRANSACTION_V1 =
  "VOID_CROSSBOX_MUTATION_TRANSACTION_V1";

export const VOID_CROSSBOX_MUTATION_TRANSACTION_CONFIRMATION_V1 =
  "prepareReviewedCrossboxMutationTransactionV1";

export const VOID_CROSSBOX_MUTATION_TRANSACTION_AUTHORITY_V1 =
  Object.freeze({
    source_contract_only: true,
    two_participant_transaction_required: true,
    exact_prestate_restoration_required: true,
    idempotent_recovery_required: true,
    partial_state_green_forbidden: true,
    checkpoint_publish_after_two_party_commit_only: true,
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

const TX_ID=/^voidxmtx1_[0-9a-f]{64}$/u;
const STATE_ID=/^voidxms1_[0-9a-f]{64}$/u;
const SHA256=/^[0-9a-f]{64}$/u;
const GIT_HEAD=/^[0-9a-f]{40}$/u;
const INVOCATION=/^[0-9a-f]{32}$/u;
const HOST=/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const DROPIN=/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const VAULT=/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u;
const TAG=/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const PEER=/^https?:\/\/[A-Za-z0-9][A-Za-z0-9._-]*:4100$/u;
const MANAGER_ENV_KEYS=Object.freeze([
  "VOID_SITE_BUNDLE_PEERS",
  "VOID_DATANET_SITE_BUNDLE_PEERS",
  "VOID_DATANET_PEERS",
  "VOID_DRIFT_PEER",
]);

const PHASES=new Set([
  "PREPARING",
  "PREPARED",
  "COMMITTING",
  "COMMITTED",
  "ROLLING_BACK",
  "RESTORED",
  "HOLD",
]);

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

function deepClone(value){return structuredClone(value);}

function deepFreeze(value){
  if(!value||typeof value!=="object"||Object.isFrozen(value))return value;
  for(const child of Object.values(value))deepFreeze(child);
  return Object.freeze(value);
}

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

function bool(value,code){if(typeof value!=="boolean")fail(code);return value;}

function validSha(value,code){
  const text=String(value||"");
  if(!SHA256.test(text))fail(code);
  return text;
}

function validHead(value,code){
  const text=String(value||"");
  if(!GIT_HEAD.test(text))fail(code);
  return text;
}

function validHost(value,code){
  const text=String(value||"").toLowerCase();
  if(!HOST.test(text))fail(code);
  return text;
}

function validInvocation(value,active,code){
  if(active){
    const text=String(value||"").toLowerCase();
    if(!INVOCATION.test(text)||/^0{32}$/u.test(text))fail(code);
    return text;
  }
  if(value!==null)fail(code);
  return null;
}

function service(value,code){
  exactObject(value,["active","invocation_id"],code+"_shape");
  const active=bool(value.active,code+"_active");
  return Object.freeze({
    active,
    invocation_id:validInvocation(value.invocation_id,active,code+"_invocation"),
  });
}

function managerEnvironment(value,code){
  exactObject(value,MANAGER_ENV_KEYS,code+"_shape");
  const out={};
  for(const key of MANAGER_ENV_KEYS){
    const v=value[key];
    if(v!==null&&typeof v!=="string")fail(code+"_value");
    if(typeof v==="string"&&/[\r\n\0]/u.test(v))fail(code+"_value");
    out[key]=v;
  }
  return Object.freeze(out);
}

function siteParticipant(value,participant){
  exactObject(
    value,
    ["host","repository_head_sha","dropin","manager_environment","service"],
    "site_"+participant+"_prestate_shape",
  );
  exactObject(value.dropin,["exists","sha256","mode"],"site_"+participant+"_dropin_shape");
  const exists=bool(value.dropin.exists,"site_"+participant+"_dropin_exists");
  const digest=exists
    ?validSha(value.dropin.sha256,"site_"+participant+"_dropin_sha")
    :null;
  if(!exists&&value.dropin.sha256!==null)fail("site_"+participant+"_dropin_sha");
  const mode=exists?String(value.dropin.mode||"") : null;
  if(exists&&!/^[0-7]{3,4}$/u.test(mode))fail("site_"+participant+"_dropin_mode");
  if(!exists&&value.dropin.mode!==null)fail("site_"+participant+"_dropin_mode");
  return Object.freeze({
    host:validHost(value.host,"site_"+participant+"_host"),
    repository_head_sha:validHead(
      value.repository_head_sha,
      "site_"+participant+"_head",
    ),
    dropin:Object.freeze({exists,sha256:digest,mode}),
    manager_environment:managerEnvironment(
      value.manager_environment,
      "site_"+participant+"_manager_environment",
    ),
    service:service(value.service,"site_"+participant+"_service"),
  });
}

function validatorParticipant(value,participant){
  exactObject(
    value,
    [
      "host",
      "repository_head_sha",
      "verified_current",
      "shadow_runtime_identity_sha256",
      "service",
    ],
    "validator_"+participant+"_prestate_shape",
  );
  exactObject(
    value.verified_current,
    ["exists","identity_sha256"],
    "validator_"+participant+"_verified_current_shape",
  );
  const exists=bool(
    value.verified_current.exists,
    "validator_"+participant+"_verified_current_exists",
  );
  const identity=exists
    ?validSha(
      value.verified_current.identity_sha256,
      "validator_"+participant+"_verified_current_identity",
    )
    :null;
  if(!exists&&value.verified_current.identity_sha256!==null){
    fail("validator_"+participant+"_verified_current_identity");
  }
  return Object.freeze({
    host:validHost(value.host,"validator_"+participant+"_host"),
    repository_head_sha:validHead(
      value.repository_head_sha,
      "validator_"+participant+"_head",
    ),
    verified_current:Object.freeze({exists,identity_sha256:identity}),
    shadow_runtime_identity_sha256:validSha(
      value.shadow_runtime_identity_sha256,
      "validator_"+participant+"_shadow_identity",
    ),
    service:service(value.service,"validator_"+participant+"_service"),
  });
}

function sourceBinding(value){
  exactObject(
    value,
    ["repository_head_sha","local_host","remote_host"],
    "source_binding_shape",
  );
  const head=validHead(value.repository_head_sha,"source_head");
  const local=validHost(value.local_host,"source_local_host");
  const remote=validHost(value.remote_host,"source_remote_host");
  if(local===remote)fail("source_hosts_must_be_distinct");
  return Object.freeze({
    repository_head_sha:head,
    local_host:local,
    remote_host:remote,
  });
}

function siteIntended(value){
  exactObject(
    value,
    [
      "dropin_name",
      "local_peer",
      "remote_peer",
      "local_target_dropin_sha256",
      "remote_target_dropin_sha256",
      "restart_if_active",
    ],
    "site_intended_shape",
  );
  const dropin=String(value.dropin_name||"");
  if(!DROPIN.test(dropin))fail("site_dropin_name_invalid");
  const localPeer=String(value.local_peer||"");
  const remotePeer=String(value.remote_peer||"");
  if(!PEER.test(localPeer)||!PEER.test(remotePeer))fail("site_peer_invalid");
  exactObject(
    value.restart_if_active,
    ["local","remote"],
    "site_restart_policy_shape",
  );
  return Object.freeze({
    dropin_name:dropin,
    local_peer:localPeer,
    remote_peer:remotePeer,
    local_target_dropin_sha256:validSha(
      value.local_target_dropin_sha256,
      "site_local_target_sha",
    ),
    remote_target_dropin_sha256:validSha(
      value.remote_target_dropin_sha256,
      "site_remote_target_sha",
    ),
    restart_if_active:Object.freeze({
      local:bool(value.restart_if_active.local,"site_restart_local"),
      remote:bool(value.restart_if_active.remote,"site_restart_remote"),
    }),
  });
}

function validatorIntended(value){
  exactObject(
    value,
    [
      "epoch",
      "vault_name",
      "manifest_set_sha256",
      "checkpoint_tag",
      "checkpoint_tag_preexisting",
      "restart_if_active",
    ],
    "validator_intended_shape",
  );
  if(!Number.isSafeInteger(value.epoch)||value.epoch<1||value.epoch>999999){
    fail("validator_epoch_invalid");
  }
  const vault=String(value.vault_name||"");
  const tag=String(value.checkpoint_tag||"");
  if(!VAULT.test(vault))fail("validator_vault_invalid");
  if(!TAG.test(tag))fail("validator_checkpoint_tag_invalid");
  if(value.checkpoint_tag_preexisting!==false){
    fail("validator_checkpoint_tag_must_be_absent");
  }
  exactObject(
    value.restart_if_active,
    ["local","remote"],
    "validator_restart_policy_shape",
  );
  return Object.freeze({
    epoch:value.epoch,
    vault_name:vault,
    manifest_set_sha256:validSha(
      value.manifest_set_sha256,
      "validator_manifest_set_sha",
    ),
    checkpoint_tag:tag,
    checkpoint_tag_preexisting:false,
    restart_if_active:Object.freeze({
      local:bool(value.restart_if_active.local,"validator_restart_local"),
      remote:bool(value.restart_if_active.remote,"validator_restart_remote"),
    }),
  });
}

function normalizePrestate(kind,value,source){
  exactObject(value,["local","remote"],"prestate_shape");
  const local=kind==="site_bundle_peer_env"
    ?siteParticipant(value.local,"local")
    :validatorParticipant(value.local,"local");
  const remote=kind==="site_bundle_peer_env"
    ?siteParticipant(value.remote,"remote")
    :validatorParticipant(value.remote,"remote");
  if(local.host!==source.local_host||remote.host!==source.remote_host){
    fail("prestate_host_binding_mismatch");
  }
  if(
    local.repository_head_sha!==source.repository_head_sha||
    remote.repository_head_sha!==source.repository_head_sha
  )fail("prestate_source_head_mismatch");
  return Object.freeze({local,remote});
}

function prestateId(value){
  return "sha256:"+sha256(Buffer.from(canonical(value),"utf8"));
}

function stagedStateSha(transaction,participant){
  if(transaction.kind==="site_bundle_peer_env"){
    return participant==="local"
      ?transaction.intended.local_target_dropin_sha256
      :transaction.intended.remote_target_dropin_sha256;
  }
  return transaction.intended.manifest_set_sha256;
}

function restartExpected(transaction,participant){
  return (
    transaction.intended.restart_if_active[participant]===true&&
    transaction.prestate[participant].service.active===true
  );
}

function stateMaterial(transaction){
  const copy=deepClone(transaction);
  delete copy.state_id;
  return copy;
}

function seal(transaction){
  const material=stateMaterial(transaction);
  return deepFreeze({
    ...material,
    state_id:"voidxms1_"+sha256(Buffer.from(canonical(material),"utf8")),
  });
}

function validateStoredReceipt(
  transaction,
  bucket,
  participant,
  normalizer,
){
  const value=transaction[bucket][participant];
  if(value===null)return null;
  const normalized=normalizer(transaction,value);
  if(canonical(normalized)!==canonical(value)){
    fail(bucket+"_receipt_not_canonical:"+participant);
  }
  return normalized;
}

function validateBaseTransaction(transaction){
  exactObject(
    transaction,
    [
      "marker",
      "version",
      "kind",
      "source",
      "prestate",
      "intended",
      "transaction_id",
      "phase",
      "prepared",
      "publish_started",
      "publish_no_effect",
      "published",
      "verified",
      "restore_started",
      "restored",
      "rollback_reason",
      "checkpoint_publish_allowed",
      "authority",
      "state_id",
    ],
    "transaction_shape_invalid",
  );
  if(transaction.marker!==VOID_CROSSBOX_MUTATION_TRANSACTION_V1){
    fail("transaction_marker_invalid");
  }
  if(
    transaction.version!==1||
    !["site_bundle_peer_env","validator_truth_closeout"].includes(transaction.kind)
  ){
    fail("transaction_identity_invalid");
  }
  if(!PHASES.has(transaction.phase)||!STATE_ID.test(String(transaction.state_id||""))){
    fail("transaction_state_invalid");
  }

  const source=sourceBinding(transaction.source);
  const prestate=normalizePrestate(transaction.kind,transaction.prestate,source);
  const intended=transaction.kind==="site_bundle_peer_env"
    ?siteIntended(transaction.intended)
    :validatorIntended(transaction.intended);
  if(
    canonical(source)!==canonical(transaction.source)||
    canonical(prestate)!==canonical(transaction.prestate)||
    canonical(intended)!==canonical(transaction.intended)
  ){
    fail("transaction_intent_not_canonical");
  }
  const intentMaterial={
    marker:VOID_CROSSBOX_MUTATION_TRANSACTION_V1,
    version:1,
    kind:transaction.kind,
    source,
    prestate,
    intended,
  };
  const expectedTransactionId=
    "voidxmtx1_"+sha256(Buffer.from(canonical(intentMaterial),"utf8"));
  if(
    !TX_ID.test(String(transaction.transaction_id||""))||
    transaction.transaction_id!==expectedTransactionId
  ){
    fail("transaction_id_mismatch");
  }

  if(
    canonical(transaction.authority)!==
      canonical(VOID_CROSSBOX_MUTATION_TRANSACTION_AUTHORITY_V1)
  ){
    fail("transaction_authority_mismatch");
  }
  if(typeof transaction.checkpoint_publish_allowed!=="boolean"){
    fail("transaction_checkpoint_flag_invalid");
  }
  if(
    transaction.rollback_reason!==null&&
    (
      typeof transaction.rollback_reason!=="string"||
      !transaction.rollback_reason||
      transaction.rollback_reason.length>256||
      /[\r\n\0]/u.test(transaction.rollback_reason)
    )
  ){
    fail("transaction_rollback_reason_invalid");
  }

  for(const bucket of [
    "prepared",
    "publish_started",
    "publish_no_effect",
    "published",
    "verified",
    "restore_started",
    "restored",
  ]){
    exactObject(
      transaction[bucket],
      ["local","remote"],
      "transaction_"+bucket+"_shape",
    );
  }
  const prepared={
    local:validateStoredReceipt(
      transaction,"prepared","local",normalizedPrepareReceipt,
    ),
    remote:validateStoredReceipt(
      transaction,"prepared","remote",normalizedPrepareReceipt,
    ),
  };
  const publishStarted={
    local:validateStoredReceipt(
      transaction,"publish_started","local",normalizedPublishStartedReceipt,
    ),
    remote:validateStoredReceipt(
      transaction,"publish_started","remote",normalizedPublishStartedReceipt,
    ),
  };
  const publishNoEffect={
    local:validateStoredReceipt(
      transaction,"publish_no_effect","local",normalizedPublishNoEffectReceipt,
    ),
    remote:validateStoredReceipt(
      transaction,"publish_no_effect","remote",normalizedPublishNoEffectReceipt,
    ),
  };
  const published={
    local:validateStoredReceipt(
      transaction,"published","local",normalizedPublishReceipt,
    ),
    remote:validateStoredReceipt(
      transaction,"published","remote",normalizedPublishReceipt,
    ),
  };
  const verified={
    local:validateStoredReceipt(
      transaction,"verified","local",normalizedVerifyReceipt,
    ),
    remote:validateStoredReceipt(
      transaction,"verified","remote",normalizedVerifyReceipt,
    ),
  };
  const restoreStarted={
    local:validateStoredReceipt(
      transaction,"restore_started","local",normalizedRestoreStartedReceipt,
    ),
    remote:validateStoredReceipt(
      transaction,"restore_started","remote",normalizedRestoreStartedReceipt,
    ),
  };
  const restored={
    local:validateStoredReceipt(
      transaction,"restored","local",normalizedRestoreReceipt,
    ),
    remote:validateStoredReceipt(
      transaction,"restored","remote",normalizedRestoreReceipt,
    ),
  };

  const unresolvedPublish={local:false,remote:false};
  for(const participant of ["local","remote"]){
    if(publishStarted[participant]&&!prepared[participant]){
      fail("transaction_publish_start_without_prepare:"+participant);
    }
    if(publishNoEffect[participant]&&!publishStarted[participant]){
      fail("transaction_publish_no_effect_without_start:"+participant);
    }
    if(published[participant]&&!publishStarted[participant]){
      fail("transaction_publish_without_start:"+participant);
    }
    if(publishNoEffect[participant]&&published[participant]){
      fail("transaction_publish_effect_conflict:"+participant);
    }
    if(verified[participant]&&!published[participant]){
      fail("transaction_verify_without_publish:"+participant);
    }
    if(restored[participant]&&!restoreStarted[participant]){
      fail("transaction_restore_without_start:"+participant);
    }
    unresolvedPublish[participant]=Boolean(
      publishStarted[participant]&&
      !publishNoEffect[participant]&&
      !published[participant]
    );
  }

  const bothPrepared=Boolean(prepared.local&&prepared.remote);
  const bothPublished=Boolean(published.local&&published.remote);
  const bothVerified=Boolean(verified.local&&verified.remote);
  const bothRestoreStarted=Boolean(restoreStarted.local&&restoreStarted.remote);
  const bothRestored=Boolean(restored.local&&restored.remote);
  const anyPublishStarted=Boolean(publishStarted.local||publishStarted.remote);
  const anyPublishNoEffect=Boolean(publishNoEffect.local||publishNoEffect.remote);
  const anyPublished=Boolean(published.local||published.remote);
  const anyVerified=Boolean(verified.local||verified.remote);
  const anyRestoreStarted=Boolean(restoreStarted.local||restoreStarted.remote);
  const anyRestored=Boolean(restored.local||restored.remote);
  const anyUnresolvedPublish=Boolean(
    unresolvedPublish.local||unresolvedPublish.remote
  );

  switch(transaction.phase){
    case "PREPARING":
      if(
        bothPrepared||anyPublishStarted||anyPublishNoEffect||
        anyPublished||anyVerified||anyRestoreStarted||anyRestored||
        transaction.rollback_reason!==null||
        transaction.checkpoint_publish_allowed!==false
      )fail("transaction_preparing_state_invalid");
      break;
    case "PREPARED":
      if(
        !bothPrepared||anyPublishStarted||anyPublishNoEffect||
        anyPublished||anyVerified||anyRestoreStarted||anyRestored||
        transaction.rollback_reason!==null||
        transaction.checkpoint_publish_allowed!==false
      )fail("transaction_prepared_state_invalid");
      break;
    case "COMMITTING":
      if(
        !bothPrepared||anyRestoreStarted||anyRestored||
        transaction.rollback_reason!==null||
        transaction.checkpoint_publish_allowed!==false
      )fail("transaction_committing_state_invalid");
      break;
    case "COMMITTED":
      if(
        !bothPrepared||!bothPublished||!bothVerified||
        anyPublishNoEffect||anyRestoreStarted||anyRestored||
        transaction.rollback_reason!==null||
        transaction.checkpoint_publish_allowed!==
          (transaction.kind==="validator_truth_closeout")
      )fail("transaction_committed_state_invalid");
      break;
    case "ROLLING_BACK":
      if(
        transaction.rollback_reason===null||anyUnresolvedPublish||
        transaction.checkpoint_publish_allowed!==false
      )fail("transaction_rolling_back_state_invalid");
      break;
    case "RESTORED":
      if(
        transaction.rollback_reason===null||anyUnresolvedPublish||
        !bothRestoreStarted||!bothRestored||
        transaction.checkpoint_publish_allowed!==false
      )fail("transaction_restored_state_invalid");
      break;
    case "HOLD":
      if(
        transaction.rollback_reason===null||
        transaction.checkpoint_publish_allowed!==false
      )fail("transaction_hold_state_invalid");
      break;
    default:
      fail("transaction_phase_invalid");
  }

  const expected="voidxms1_"+sha256(
    Buffer.from(canonical(stateMaterial(transaction)),"utf8"),
  );
  if(transaction.state_id!==expected)fail("transaction_state_id_mismatch");
  return transaction;
}

function receiptSame(a,b){return canonical(a)===canonical(b);}

function setParticipantReceipt(transaction,bucket,participant,receipt){
  const existing=transaction[bucket][participant];
  if(existing){
    if(receiptSame(existing,receipt))return transaction;
    fail(bucket+"_conflicting_duplicate:"+participant);
  }
  const next=deepClone(transaction);
  next[bucket][participant]=receipt;
  return next;
}

function normalizedPrepareReceipt(transaction,value){
  exactObject(
    value,
    [
      "transaction_id",
      "participant",
      "prestate_id",
      "staged_state_sha256",
      "publication_performed",
    ],
    "prepare_receipt_shape",
  );
  if(value.transaction_id!==transaction.transaction_id){
    fail("prepare_transaction_id_mismatch");
  }
  if(!["local","remote"].includes(value.participant)){
    fail("prepare_participant_invalid");
  }
  const participant=value.participant;
  if(value.prestate_id!==prestateId(transaction.prestate[participant])){
    fail("prepare_prestate_id_mismatch");
  }
  if(value.staged_state_sha256!==stagedStateSha(transaction,participant)){
    fail("prepare_staged_state_mismatch");
  }
  if(value.publication_performed!==false){
    fail("prepare_must_not_publish");
  }
  return Object.freeze({...value});
}

function normalizedPublishStartedReceipt(transaction,value){
  exactObject(
    value,
    [
      "transaction_id",
      "participant",
      "prestate_id_before_publish",
      "published_state_sha256",
      "restart_expected",
      "restart_before_invocation_id",
      "publication_performed",
    ],
    "publish_started_receipt_shape",
  );
  if(value.transaction_id!==transaction.transaction_id){
    fail("publish_started_transaction_id_mismatch");
  }
  if(!["local","remote"].includes(value.participant)){
    fail("publish_started_participant_invalid");
  }
  const participant=value.participant;
  if(value.prestate_id_before_publish!==prestateId(transaction.prestate[participant])){
    fail("publish_started_prestate_mismatch");
  }
  if(value.published_state_sha256!==stagedStateSha(transaction,participant)){
    fail("publish_started_state_mismatch");
  }
  if(value.publication_performed!==false){
    fail("publish_started_must_precede_publication");
  }
  const expectedRestart=restartExpected(transaction,participant);
  if(value.restart_expected!==expectedRestart){
    fail("publish_started_restart_policy_mismatch");
  }
  if(expectedRestart){
    const before=validInvocation(
      value.restart_before_invocation_id,
      true,
      "publish_started_restart_before_invalid",
    );
    if(before!==transaction.prestate[participant].service.invocation_id){
      fail("publish_started_restart_before_prestate_mismatch");
    }
    return Object.freeze({...value,restart_before_invocation_id:before});
  }
  if(value.restart_before_invocation_id!==null){
    fail("publish_started_unexpected_restart_witness");
  }
  return Object.freeze({...value});
}

function normalizedPublishNoEffectReceipt(transaction,value){
  exactObject(
    value,
    [
      "transaction_id",
      "participant",
      "observed_prestate_id",
      "service_active",
      "service_invocation_id",
      "publication_performed",
      "restart_performed",
    ],
    "publish_no_effect_receipt_shape",
  );
  if(value.transaction_id!==transaction.transaction_id){
    fail("publish_no_effect_transaction_id_mismatch");
  }
  if(!["local","remote"].includes(value.participant)){
    fail("publish_no_effect_participant_invalid");
  }
  const participant=value.participant;
  if(!transaction.publish_started[participant]){
    fail("publish_no_effect_requires_start");
  }
  if(value.observed_prestate_id!==prestateId(transaction.prestate[participant])){
    fail("publish_no_effect_prestate_mismatch");
  }
  if(value.publication_performed!==false||value.restart_performed!==false){
    fail("publish_no_effect_side_effect_claim_invalid");
  }
  const active=transaction.prestate[participant].service.active;
  if(value.service_active!==active){
    fail("publish_no_effect_service_state_mismatch");
  }
  if(active){
    const invocation=validInvocation(
      value.service_invocation_id,
      true,
      "publish_no_effect_invocation_invalid",
    );
    if(invocation!==transaction.prestate[participant].service.invocation_id){
      fail("publish_no_effect_invocation_changed");
    }
    return Object.freeze({...value,service_invocation_id:invocation});
  }
  if(value.service_invocation_id!==null){
    fail("publish_no_effect_inactive_invocation_invalid");
  }
  return Object.freeze({...value});
}

function normalizedPublishReceipt(transaction,value){
  exactObject(
    value,
    [
      "transaction_id",
      "participant",
      "prestate_id_before_publish",
      "published_state_sha256",
      "restart_performed",
      "restart_before_invocation_id",
      "restart_after_invocation_id",
    ],
    "publish_receipt_shape",
  );
  if(value.transaction_id!==transaction.transaction_id){
    fail("publish_transaction_id_mismatch");
  }
  if(!["local","remote"].includes(value.participant)){
    fail("publish_participant_invalid");
  }
  const participant=value.participant;
  const started=transaction.publish_started[participant];
  if(!started)fail("publish_requires_started_witness");
  if(transaction.publish_no_effect[participant]){
    fail("publish_after_no_effect_forbidden");
  }
  if(value.prestate_id_before_publish!==started.prestate_id_before_publish){
    fail("publish_prestate_drift");
  }
  if(value.published_state_sha256!==started.published_state_sha256){
    fail("publish_state_mismatch");
  }
  const expectedRestart=started.restart_expected;
  if(value.restart_performed!==expectedRestart){
    fail("publish_restart_policy_mismatch");
  }
  if(expectedRestart){
    const before=validInvocation(
      value.restart_before_invocation_id,
      true,
      "publish_restart_before_invalid",
    );
    const after=validInvocation(
      value.restart_after_invocation_id,
      true,
      "publish_restart_after_invalid",
    );
    if(
      before!==started.restart_before_invocation_id||
      before!==transaction.prestate[participant].service.invocation_id
    ){
      fail("publish_restart_before_prestate_mismatch");
    }
    if(after===before)fail("publish_restart_invocation_not_advanced");
    return Object.freeze({...value,restart_before_invocation_id:before,restart_after_invocation_id:after});
  }
  if(
    value.restart_before_invocation_id!==null||
    value.restart_after_invocation_id!==null
  )fail("publish_unexpected_restart_witness");
  return Object.freeze({...value});
}

function normalizedVerifyReceipt(transaction,value){
  exactObject(
    value,
    [
      "transaction_id",
      "participant",
      "observed_state_sha256",
      "service_active",
      "service_invocation_id",
      "intended_state_verified",
    ],
    "verify_receipt_shape",
  );
  if(value.transaction_id!==transaction.transaction_id){
    fail("verify_transaction_id_mismatch");
  }
  if(!["local","remote"].includes(value.participant)){
    fail("verify_participant_invalid");
  }
  const participant=value.participant;
  if(value.observed_state_sha256!==stagedStateSha(transaction,participant)){
    fail("verify_state_mismatch");
  }
  if(value.intended_state_verified!==true)fail("verify_intended_state_required");
  const expectedRestart=restartExpected(transaction,participant);
  const expectedActive=transaction.prestate[participant].service.active;
  if(value.service_active!==expectedActive){
    fail("verify_service_state_not_preserved");
  }
  if(expectedActive){
    const invocation=validInvocation(
      value.service_invocation_id,
      true,
      "verify_invocation_invalid",
    );
    if(expectedRestart){
      const published=transaction.published[participant];
      if(!published||invocation!==published.restart_after_invocation_id){
        fail("verify_invocation_not_bound_to_publish");
      }
    }else if(
      invocation!==transaction.prestate[participant].service.invocation_id
    ){
      fail("verify_unexpected_invocation_change");
    }
    return Object.freeze({...value,service_invocation_id:invocation});
  }
  if(value.service_invocation_id!==null)fail("verify_inactive_invocation_invalid");
  return Object.freeze({...value});
}

function normalizedRestoreStartedReceipt(transaction,value){
  exactObject(
    value,
    [
      "transaction_id",
      "participant",
      "restored_prestate_id",
      "restart_expected",
      "restart_before_invocation_id",
      "restoration_performed",
    ],
    "restore_started_receipt_shape",
  );
  if(value.transaction_id!==transaction.transaction_id){
    fail("restore_started_transaction_id_mismatch");
  }
  if(!["local","remote"].includes(value.participant)){
    fail("restore_started_participant_invalid");
  }
  const participant=value.participant;
  if(value.restored_prestate_id!==prestateId(transaction.prestate[participant])){
    fail("restore_started_prestate_id_mismatch");
  }
  if(value.restoration_performed!==false){
    fail("restore_started_must_precede_restoration");
  }
  const published=transaction.published[participant];
  const expectedRestart=Boolean(
    published&&
    transaction.intended.restart_if_active[participant]===true&&
    transaction.prestate[participant].service.active===true
  );
  if(value.restart_expected!==expectedRestart){
    fail("restore_started_restart_policy_mismatch");
  }
  if(expectedRestart){
    const before=validInvocation(
      value.restart_before_invocation_id,
      true,
      "restore_started_restart_before_invalid",
    );
    if(!published||before!==published.restart_after_invocation_id){
      fail("restore_started_restart_before_publish_mismatch");
    }
    return Object.freeze({...value,restart_before_invocation_id:before});
  }
  if(value.restart_before_invocation_id!==null){
    fail("restore_started_unexpected_restart_witness");
  }
  return Object.freeze({...value});
}

function normalizedRestoreReceipt(transaction,value){
  const common=[
    "transaction_id",
    "participant",
    "restored_prestate_id",
    "service_state_restored",
    "restart_performed",
    "restart_before_invocation_id",
    "restart_after_invocation_id",
  ];
  const specific=transaction.kind==="site_bundle_peer_env"
    ?["dropin_restored","manager_environment_restored"]
    :["verified_current_restored","shadow_runtime_restored"];
  exactObject(value,[...common,...specific],"restore_receipt_shape");
  if(value.transaction_id!==transaction.transaction_id){
    fail("restore_transaction_id_mismatch");
  }
  if(!["local","remote"].includes(value.participant)){
    fail("restore_participant_invalid");
  }
  const participant=value.participant;
  const started=transaction.restore_started[participant];
  if(!started)fail("restore_requires_started_witness");
  if(value.restored_prestate_id!==started.restored_prestate_id){
    fail("restore_prestate_id_mismatch");
  }
  if(value.service_state_restored!==true)fail("restore_service_state_required");
  if(transaction.kind==="site_bundle_peer_env"){
    if(value.dropin_restored!==true||value.manager_environment_restored!==true){
      fail("restore_site_state_incomplete");
    }
  }else if(
    value.verified_current_restored!==true||
    value.shadow_runtime_restored!==true
  ){
    fail("restore_validator_state_incomplete");
  }
  const expectedRestart=started.restart_expected;
  if(value.restart_performed!==expectedRestart){
    fail("restore_restart_policy_mismatch");
  }
  if(expectedRestart){
    const before=validInvocation(
      value.restart_before_invocation_id,
      true,
      "restore_restart_before_invalid",
    );
    const after=validInvocation(
      value.restart_after_invocation_id,
      true,
      "restore_restart_after_invalid",
    );
    const published=transaction.published[participant];
    if(
      !published||
      before!==started.restart_before_invocation_id||
      before!==published.restart_after_invocation_id
    ){
      fail("restore_restart_before_publish_mismatch");
    }
    if(after===before)fail("restore_restart_invocation_not_advanced");
    return Object.freeze({...value,restart_before_invocation_id:before,restart_after_invocation_id:after});
  }
  if(
    value.restart_before_invocation_id!==null||
    value.restart_after_invocation_id!==null
  )fail("restore_unexpected_restart_witness");
  return Object.freeze({...value});
}

export function prepareVoidCrossboxMutationTransactionV1(input){
  exactObject(
    input,
    ["kind","source","prestate","intended","confirmation"],
    "prepare_input_shape",
  );
  if(
    input.confirmation!==
      VOID_CROSSBOX_MUTATION_TRANSACTION_CONFIRMATION_V1
  )fail("prepare_confirmation_required");
  if(!["site_bundle_peer_env","validator_truth_closeout"].includes(input.kind)){
    fail("transaction_kind_invalid");
  }
  const source=sourceBinding(input.source);
  const prestate=normalizePrestate(input.kind,input.prestate,source);
  const intended=input.kind==="site_bundle_peer_env"
    ?siteIntended(input.intended)
    :validatorIntended(input.intended);
  const intentMaterial=Object.freeze({
    marker:VOID_CROSSBOX_MUTATION_TRANSACTION_V1,
    version:1,
    kind:input.kind,
    source,
    prestate,
    intended,
  });
  const transactionId=
    "voidxmtx1_"+sha256(Buffer.from(canonical(intentMaterial),"utf8"));
  const transaction={
    ...intentMaterial,
    transaction_id:transactionId,
    phase:"PREPARING",
    prepared:{local:null,remote:null},
    publish_started:{local:null,remote:null},
    publish_no_effect:{local:null,remote:null},
    published:{local:null,remote:null},
    verified:{local:null,remote:null},
    restore_started:{local:null,remote:null},
    restored:{local:null,remote:null},
    rollback_reason:null,
    checkpoint_publish_allowed:false,
    authority:VOID_CROSSBOX_MUTATION_TRANSACTION_AUTHORITY_V1,
  };
  return seal(transaction);
}

export function recordVoidCrossboxMutationPreparedV1(transaction,value){
  validateBaseTransaction(transaction);
  if(!["PREPARING","PREPARED"].includes(transaction.phase)){
    fail("prepare_receipt_phase_invalid");
  }
  const receipt=normalizedPrepareReceipt(transaction,value);
  let next=setParticipantReceipt(
    transaction,
    "prepared",
    receipt.participant,
    receipt,
  );
  if(next.prepared.local&&next.prepared.remote&&next.phase!=="PREPARED"){
    next=deepClone(next);
    next.phase="PREPARED";
  }
  return seal(next);
}

export function beginVoidCrossboxMutationCommitV1(transaction){
  validateBaseTransaction(transaction);
  if(transaction.phase==="COMMITTING")return transaction;
  if(transaction.phase!=="PREPARED")fail("commit_begin_phase_invalid");
  if(!transaction.prepared.local||!transaction.prepared.remote){
    fail("commit_requires_two_prepared_participants");
  }
  const next=deepClone(transaction);
  next.phase="COMMITTING";
  return seal(next);
}

export function recordVoidCrossboxMutationPublishStartedV1(transaction,value){
  validateBaseTransaction(transaction);
  if(transaction.phase!=="COMMITTING")fail("publish_started_phase_invalid");
  const receipt=normalizedPublishStartedReceipt(transaction,value);
  if(!transaction.prepared[receipt.participant]){
    fail("publish_started_requires_prepare_receipt");
  }
  if(
    transaction.published[receipt.participant]||
    transaction.publish_no_effect[receipt.participant]
  ){
    fail("publish_started_after_terminal_outcome");
  }
  return seal(
    setParticipantReceipt(
      transaction,
      "publish_started",
      receipt.participant,
      receipt,
    ),
  );
}

export function recordVoidCrossboxMutationPublishNoEffectV1(transaction,value){
  validateBaseTransaction(transaction);
  if(transaction.phase!=="COMMITTING")fail("publish_no_effect_phase_invalid");
  const receipt=normalizedPublishNoEffectReceipt(transaction,value);
  if(transaction.published[receipt.participant]){
    fail("publish_no_effect_after_publish_forbidden");
  }
  return seal(
    setParticipantReceipt(
      transaction,
      "publish_no_effect",
      receipt.participant,
      receipt,
    ),
  );
}

export function recordVoidCrossboxMutationPublishedV1(transaction,value){
  validateBaseTransaction(transaction);
  if(transaction.phase!=="COMMITTING")fail("publish_phase_invalid");
  const receipt=normalizedPublishReceipt(transaction,value);
  if(!transaction.prepared[receipt.participant]){
    fail("publish_requires_prepare_receipt");
  }
  if(!transaction.publish_started[receipt.participant]){
    fail("publish_requires_started_witness");
  }
  if(transaction.publish_no_effect[receipt.participant]){
    fail("publish_after_no_effect_forbidden");
  }
  return seal(
    setParticipantReceipt(transaction,"published",receipt.participant,receipt),
  );
}

export function recordVoidCrossboxMutationVerifiedV1(transaction,value){
  validateBaseTransaction(transaction);
  if(transaction.phase!=="COMMITTING")fail("verify_phase_invalid");
  const receipt=normalizedVerifyReceipt(transaction,value);
  if(!transaction.published[receipt.participant]){
    fail("verify_requires_publish_receipt");
  }
  return seal(
    setParticipantReceipt(transaction,"verified",receipt.participant,receipt),
  );
}

export function finalizeVoidCrossboxMutationCommittedV1(
  transaction,
  options={},
){
  validateBaseTransaction(transaction);
  if(transaction.phase==="COMMITTED")return transaction;
  if(transaction.phase!=="COMMITTING")fail("commit_finalize_phase_invalid");
  if(!transaction.verified.local||!transaction.verified.remote){
    fail("commit_requires_two_verified_participants");
  }
  if(transaction.kind==="validator_truth_closeout"){
    exactObject(
      options,
      ["checkpoint_tag_absent_verified"],
      "validator_commit_options_shape",
    );
    if(options.checkpoint_tag_absent_verified!==true){
      fail("validator_checkpoint_tag_absence_recheck_required");
    }
  }else{
    exactObject(options,[],"site_commit_options_shape");
  }
  const next=deepClone(transaction);
  next.phase="COMMITTED";
  next.checkpoint_publish_allowed=
    transaction.kind==="validator_truth_closeout";
  return seal(next);
}

export function beginVoidCrossboxMutationRollbackV1(transaction,reason){
  validateBaseTransaction(transaction);
  if(transaction.phase==="ROLLING_BACK")return transaction;
  if(["COMMITTED","RESTORED","HOLD"].includes(transaction.phase)){
    fail("rollback_terminal_phase_invalid");
  }
  for(const participant of ["local","remote"]){
    if(
      transaction.publish_started[participant]&&
      !transaction.published[participant]&&
      !transaction.publish_no_effect[participant]
    ){
      fail("rollback_publish_start_unresolved:"+participant);
    }
  }
  const text=String(reason||"").trim();
  if(!text||text.length>256||/[\r\n\0]/u.test(text)){
    fail("rollback_reason_invalid");
  }
  const next=deepClone(transaction);
  next.phase="ROLLING_BACK";
  next.rollback_reason=text;
  next.checkpoint_publish_allowed=false;
  return seal(next);
}

export function recordVoidCrossboxMutationRestoreStartedV1(transaction,value){
  validateBaseTransaction(transaction);
  if(transaction.phase!=="ROLLING_BACK")fail("restore_started_phase_invalid");
  const receipt=normalizedRestoreStartedReceipt(transaction,value);
  if(transaction.restored[receipt.participant]){
    fail("restore_started_after_restore");
  }
  return seal(
    setParticipantReceipt(
      transaction,
      "restore_started",
      receipt.participant,
      receipt,
    ),
  );
}

export function recordVoidCrossboxMutationRestoredV1(transaction,value){
  validateBaseTransaction(transaction);
  if(transaction.phase!=="ROLLING_BACK")fail("restore_phase_invalid");
  const receipt=normalizedRestoreReceipt(transaction,value);
  if(!transaction.restore_started[receipt.participant]){
    fail("restore_requires_started_witness");
  }
  return seal(
    setParticipantReceipt(transaction,"restored",receipt.participant,receipt),
  );
}

export function finalizeVoidCrossboxMutationRestoredV1(transaction){
  validateBaseTransaction(transaction);
  if(transaction.phase==="RESTORED")return transaction;
  if(transaction.phase!=="ROLLING_BACK")fail("restore_finalize_phase_invalid");
  if(!transaction.restored.local||!transaction.restored.remote){
    fail("restore_requires_two_participants");
  }
  const next=deepClone(transaction);
  next.phase="RESTORED";
  next.checkpoint_publish_allowed=false;
  return seal(next);
}

export function holdVoidCrossboxMutationTransactionV1(transaction,reason){
  validateBaseTransaction(transaction);
  if(["COMMITTED","RESTORED"].includes(transaction.phase)){
    fail("hold_terminal_success_forbidden");
  }
  const text=String(reason||"").trim();
  if(!text||text.length>256||/[\r\n\0]/u.test(text))fail("hold_reason_invalid");
  if(transaction.phase==="HOLD"){
    if(transaction.rollback_reason===text)return transaction;
    fail("hold_reason_conflict");
  }
  const next=deepClone(transaction);
  next.phase="HOLD";
  next.rollback_reason=text;
  next.checkpoint_publish_allowed=false;
  return seal(next);
}

export function nextVoidCrossboxMutationRecoveryV1(transaction){
  validateBaseTransaction(transaction);
  if(transaction.phase==="HOLD")return "HOLD";
  if(transaction.phase==="COMMITTED")return "DONE_COMMITTED";
  if(transaction.phase==="RESTORED")return "DONE_RESTORED";
  if(transaction.phase==="PREPARING"){
    if(!transaction.prepared.local)return "PREPARE_LOCAL";
    if(!transaction.prepared.remote)return "PREPARE_REMOTE";
    fail("preparing_phase_receipts_inconsistent");
  }
  if(transaction.phase==="PREPARED")return "BEGIN_COMMIT";
  if(transaction.phase==="COMMITTING"){
    if(!transaction.published.local){
      if(transaction.publish_no_effect.local)return "BEGIN_ROLLBACK";
      if(!transaction.publish_started.local)return "BEGIN_PUBLISH_LOCAL";
      return "RECOVER_PUBLISH_LOCAL";
    }
    if(!transaction.published.remote){
      if(transaction.publish_no_effect.remote)return "BEGIN_ROLLBACK";
      if(!transaction.publish_started.remote)return "BEGIN_PUBLISH_REMOTE";
      return "RECOVER_PUBLISH_REMOTE";
    }
    if(!transaction.verified.local)return "VERIFY_LOCAL";
    if(!transaction.verified.remote)return "VERIFY_REMOTE";
    return "FINALIZE_COMMIT";
  }
  if(transaction.phase==="ROLLING_BACK"){
    if(!transaction.restored.local){
      if(!transaction.restore_started.local)return "BEGIN_RESTORE_LOCAL";
      return "RECOVER_RESTORE_LOCAL";
    }
    if(!transaction.restored.remote){
      if(!transaction.restore_started.remote)return "BEGIN_RESTORE_REMOTE";
      return "RECOVER_RESTORE_REMOTE";
    }
    return "FINALIZE_RESTORE";
  }
  fail("transaction_recovery_state_invalid");
}
