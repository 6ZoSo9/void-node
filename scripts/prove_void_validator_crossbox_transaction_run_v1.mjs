#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  VOID_VALIDATOR_CROSSBOX_TRANSACTION_RUN_AUTHORITY_V1,
  VOID_VALIDATOR_CROSSBOX_TRANSACTION_RUN_V1,
  driveVoidValidatorCrossboxCoordinatorV1,
  validateVoidValidatorCrossboxCoordinatorStateV1,
} from "../ops/mainnet/void-validator-crossbox-transaction-run-v1.mjs";

import {
  VOID_VALIDATOR_CROSSBOX_TRANSACTION_EXECUTOR_CONFIRMATION_V1,
  replayVoidValidatorCrossboxTransactionExecutorV1,
} from "../tools/void-validator-crossbox-transaction-executor-v1.mjs";

function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return (
    "{" +
    Object.keys(value)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonical(value[key]))
      .join(",") +
    "}"
  );
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function prestateId(value) {
  return "sha256:" + sha256(Buffer.from(canonical(value), "utf8"));
}

const HEAD = "b".repeat(40);
const TARGET = "9".repeat(64);
const TAG = "ckpt-validator127-crossbox-proof";
const PRE_INV = Object.freeze({
  local: "1".repeat(32),
  remote: "2".repeat(32),
});
const PUB_INV = Object.freeze({
  local: "3".repeat(32),
  remote: "4".repeat(32),
});
const RESTORE_INV = Object.freeze({
  local: "5".repeat(32),
  remote: "6".repeat(32),
});

function recoveryDetail(participant, active = true) {
  const host = participant === "local" ? "precision" : "xiphos";
  const verifiedMaterial = {
    exists: true,
    link_target: "published-before-" + participant,
    resolved_target: "/fixture/" + participant + "/published-before",
    manifest_set_sha256: (participant === "local" ? "a" : "c").repeat(64),
  };
  const shadowMaterial = {
    exists: true,
    sha256: (participant === "local" ? "d" : "e").repeat(64),
    mode: "600",
    bytes: 2,
  };
  return {
    host,
    repository_head_sha: HEAD,
    verified_current: {
      ...verifiedMaterial,
      identity_sha256: sha256(
        Buffer.from(canonical(verifiedMaterial), "utf8"),
      ),
    },
    shadow: {
      ...shadowMaterial,
      bytes_base64: "e30=",
      identity_sha256: sha256(
        Buffer.from(canonical(shadowMaterial), "utf8"),
      ),
    },
    service: {
      active,
      invocation_id: active ? PRE_INV[participant] : null,
    },
  };
}

function genericPrestate(detail) {
  return {
    host: detail.host,
    repository_head_sha: detail.repository_head_sha,
    verified_current: {
      exists: detail.verified_current.exists,
      identity_sha256: detail.verified_current.identity_sha256,
    },
    shadow_runtime_identity_sha256: detail.shadow.identity_sha256,
    service: {
      active: detail.service.active,
      invocation_id: detail.service.invocation_id,
    },
  };
}

function makeState({ remoteActive = true } = {}) {
  const recovery = {
    local: recoveryDetail("local", true),
    remote: recoveryDetail("remote", remoteActive),
  };
  const journal = replayVoidValidatorCrossboxTransactionExecutorV1({
    prepare: {
      source: {
        repository_head_sha: HEAD,
        local_host: "precision",
        remote_host: "xiphos",
      },
      prestate: {
        local: genericPrestate(recovery.local),
        remote: genericPrestate(recovery.remote),
      },
      intended: {
        epoch: 127,
        vault_name: "epoch2-qbft",
        manifest_set_sha256: TARGET,
        checkpoint_tag: TAG,
        checkpoint_tag_preexisting: false,
      },
      confirmation:
        VOID_VALIDATOR_CROSSBOX_TRANSACTION_EXECUTOR_CONFIRMATION_V1,
    },
    events: [],
  });

  return {
    marker: VOID_VALIDATOR_CROSSBOX_TRANSACTION_RUN_V1,
    version: 1,
    plan: {
      repository_head_sha: HEAD,
      epoch: 127,
      vault: "epoch2-qbft",
      checkpoint_tag: TAG,
      ssh_target: "Xiphos",
      coordinator_stage_dir: "/fixture/coordinator-stage",
      participants: {
        local: {
          host: "precision",
          service: "void-node-live.service",
          http_base: "http://127.0.0.1:4100",
          refresh_shadow: true,
        },
        remote: {
          host: "xiphos",
          service: "void-node-live.service",
          http_base: "http://127.0.0.1:4102",
          refresh_shadow: false,
        },
      },
    },
    recovery,
    journal,
    checkpoint_authorization: null,
    authority: VOID_VALIDATOR_CROSSBOX_TRANSACTION_RUN_AUTHORITY_V1,
  };
}

function publishReceipt(state, participant, invocation) {
  const pre = state.journal.transaction.prestate[participant];
  const active = pre.service.active;
  return {
    transaction_id: state.journal.transaction.transaction_id,
    participant,
    prestate_id_before_publish: prestateId(pre),
    published_state_sha256: TARGET,
    restart_performed: active,
    restart_before_invocation_id: active ? pre.service.invocation_id : null,
    restart_after_invocation_id: active ? invocation : null,
  };
}

function publishNoEffectReceipt(state, participant) {
  const pre = state.journal.transaction.prestate[participant];
  return {
    transaction_id: state.journal.transaction.transaction_id,
    participant,
    observed_prestate_id: prestateId(pre),
    service_active: pre.service.active,
    service_invocation_id: pre.service.invocation_id,
    publication_performed: false,
    restart_performed: false,
  };
}

function verifyReceipt(state, participant, invocation) {
  const pre = state.journal.transaction.prestate[participant];
  return {
    transaction_id: state.journal.transaction.transaction_id,
    participant,
    observed_state_sha256: TARGET,
    service_active: pre.service.active,
    service_invocation_id: pre.service.active ? invocation : null,
    intended_state_verified: true,
  };
}

function restoreReceipt(state, participant, invocation) {
  const pre = state.journal.transaction.prestate[participant];
  const published = state.journal.transaction.published[participant];
  const restarted = Boolean(published && pre.service.active);
  return {
    transaction_id: state.journal.transaction.transaction_id,
    participant,
    restored_prestate_id: prestateId(pre),
    service_state_restored: true,
    restart_performed: restarted,
    restart_before_invocation_id: restarted
      ? published.restart_after_invocation_id
      : null,
    restart_after_invocation_id: restarted ? invocation : null,
    verified_current_restored: true,
    shadow_runtime_restored: true,
  };
}

function makeAdapter(options = {}) {
  const world = {
    local: {
      phase: "PRESTATE",
      invocation: PRE_INV.local,
      publish_restarts: 0,
      restore_restarts: 0,
    },
    remote: {
      phase: "PRESTATE",
      invocation: options.remoteActive === false ? null : PRE_INV.remote,
      publish_restarts: 0,
      restore_restarts: 0,
    },
  };

  const flags = {
    crashPublishLocal: Boolean(options.crashPublishLocal),
    crashRestoreLocal: Boolean(options.crashRestoreLocal),
    verifyMismatchRemote: Boolean(options.verifyMismatchRemote),
    verifyThrowLocal: Boolean(options.verifyThrowLocal),
  };

  let checkpointChecks = 0;

  function publish(participant, state, recovery) {
    const w = world[participant];
    if (recovery && w.phase === "PRESTATE") {
      return {
        outcome: "NO_EFFECT",
        receipt: publishNoEffectReceipt(state, participant),
      };
    }
    if (w.phase === "PRESTATE") {
      w.phase = "PUBLISHED";
      if (state.journal.transaction.prestate[participant].service.active) {
        w.publish_restarts += 1;
        w.invocation = PUB_INV[participant];
      }
      if (participant === "local" && flags.crashPublishLocal) {
        flags.crashPublishLocal = false;
        throw new Error("fixture_crash_after_publish_side_effect");
      }
    }
    if (w.phase !== "PUBLISHED") {
      return { outcome: "HOLD", reason: "fixture_publish_state_ambiguous" };
    }
    return {
      outcome: "PUBLISHED",
      receipt: publishReceipt(state, participant, w.invocation),
    };
  }

  function restore(participant, state, recovery) {
    const w = world[participant];
    const published = Boolean(state.journal.transaction.published[participant]);
    if (!published && recovery && w.phase === "PRESTATE") {
      return {
        outcome: "RESTORED",
        receipt: restoreReceipt(state, participant, null),
      };
    }
    if (w.phase !== "PRESTATE") {
      w.phase = "PRESTATE";
      if (
        published &&
        state.journal.transaction.prestate[participant].service.active
      ) {
        w.restore_restarts += 1;
        w.invocation = RESTORE_INV[participant];
      } else {
        w.invocation =
          state.journal.transaction.prestate[participant].service.invocation_id;
      }
      if (participant === "local" && flags.crashRestoreLocal) {
        flags.crashRestoreLocal = false;
        throw new Error("fixture_crash_after_restore_side_effect");
      }
    }
    return {
      outcome: "RESTORED",
      receipt: restoreReceipt(
        state,
        participant,
        published &&
          state.journal.transaction.prestate[participant].service.active
          ? w.invocation
          : null,
      ),
    };
  }

  return {
    world,
    async prepare(participant, state) {
      const pre = state.journal.transaction.prestate[participant];
      return {
        transaction_id: state.journal.transaction.transaction_id,
        participant,
        prestate_id: prestateId(pre),
        staged_state_sha256: TARGET,
        publication_performed: false,
      };
    },
    async publish(participant, state) {
      return publish(participant, state, false);
    },
    async recoverPublish(participant, state) {
      return publish(participant, state, true);
    },
    async verify(participant, state) {
      if (participant === "local" && flags.verifyThrowLocal) {
        flags.verifyThrowLocal = false;
        throw new Error("fixture_transport_failure_during_verify");
      }
      if (participant === "remote" && flags.verifyMismatchRemote) {
        flags.verifyMismatchRemote = false;
        return { outcome: "MISMATCH", reason: "fixture remote runtime mismatch" };
      }
      return {
        outcome: "VERIFIED",
        receipt: verifyReceipt(
          state,
          participant,
          world[participant].invocation,
        ),
      };
    },
    async restore(participant, state) {
      return restore(participant, state, false);
    },
    async recoverRestore(participant, state) {
      return restore(participant, state, true);
    },
    async checkpointTagAbsent() {
      checkpointChecks += 1;
      return options.checkpointAbsent !== false;
    },
    checkpointChecks() {
      return checkpointChecks;
    },
  };
}

function recorder(initial) {
  let durable = structuredClone(initial);
  const history = [];
  return {
    async persist(state) {
      durable = structuredClone(state);
      history.push({
        phase: state.journal.transaction.phase,
        next_action: state.journal.next_action,
        event_count: state.journal.events.length,
      });
    },
    durable() {
      return structuredClone(durable);
    },
    history,
  };
}

assert.equal(
  VOID_VALIDATOR_CROSSBOX_TRANSACTION_RUN_AUTHORITY_V1
    .checkpoint_tag_creation,
  false,
);
assert.equal(
  VOID_VALIDATOR_CROSSBOX_TRANSACTION_RUN_AUTHORITY_V1.git_push,
  false,
);
assert.equal(
  VOID_VALIDATOR_CROSSBOX_TRANSACTION_RUN_AUTHORITY_V1.funds_movement,
  false,
);

// Coordinator shape binds exact participant service/endpoints and recovery prestate.
{
  const state = makeState();
  const valid = validateVoidValidatorCrossboxCoordinatorStateV1(state);
  assert.equal(valid.plan.participants.local.service, "void-node-live.service");
  assert.equal(valid.plan.participants.remote.http_base, "http://127.0.0.1:4102");

  const drift = structuredClone(state);
  drift.recovery.remote.service.invocation_id = "f".repeat(32);
  assert.throws(
    () => validateVoidValidatorCrossboxCoordinatorStateV1(drift),
    /validator_live_recovery_prestate_binding_mismatch:remote/u,
  );

  const retired = structuredClone(state);
  retired.plan.ssh_target = "Alienware";
  assert.throws(
    () => validateVoidValidatorCrossboxCoordinatorStateV1(retired),
    /validator_live_retired_alienware_target_forbidden/u,
  );

  const publicBase = structuredClone(state);
  publicBase.plan.participants.remote.http_base = "http://10.0.0.2:4102";
  assert.throws(
    () => validateVoidValidatorCrossboxCoordinatorStateV1(publicBase),
    /validator_live_http_base_must_be_loopback/u,
  );
}

// Crash after local publication: durable PUBLISH_STARTED drives observation-based
// recovery and does not duplicate the service restart.
{
  const state = makeState();
  const adapter = makeAdapter({ crashPublishLocal: true });
  const rec = recorder(state);

  await assert.rejects(
    () =>
      driveVoidValidatorCrossboxCoordinatorV1(
        state,
        adapter,
        rec.persist,
      ),
    /fixture_crash_after_publish_side_effect/u,
  );

  const durable = rec.durable();
  assert.equal(durable.journal.next_action, "RECOVER_PUBLISH_LOCAL");
  assert.equal(adapter.world.local.publish_restarts, 1);

  const final = await driveVoidValidatorCrossboxCoordinatorV1(
    durable,
    adapter,
    rec.persist,
  );
  assert.equal(final.journal.transaction.phase, "COMMITTED");
  assert.equal(final.journal.next_action, "DONE_COMMITTED");
  assert.match(
    final.checkpoint_authorization.authorization_id,
    /^voidvcxa1_[0-9a-f]{64}$/u,
  );
  assert.equal(final.checkpoint_authorization.publication_performed, false);
  assert.equal(adapter.world.local.publish_restarts, 1);
  assert.equal(adapter.world.remote.publish_restarts, 1);
  assert.equal(adapter.checkpointChecks(), 2);
}

// A transport failure during verify leaves VERIFY_LOCAL durable and retryable.
{
  const state = makeState();
  const adapter = makeAdapter({ verifyThrowLocal: true });
  const rec = recorder(state);

  await assert.rejects(
    () =>
      driveVoidValidatorCrossboxCoordinatorV1(
        state,
        adapter,
        rec.persist,
      ),
    /fixture_transport_failure_during_verify/u,
  );
  const durable = rec.durable();
  assert.equal(durable.journal.next_action, "VERIFY_LOCAL");

  const final = await driveVoidValidatorCrossboxCoordinatorV1(
    durable,
    adapter,
    rec.persist,
  );
  assert.equal(final.journal.transaction.phase, "COMMITTED");
  assert.equal(adapter.world.local.publish_restarts, 1);
  assert.equal(adapter.world.remote.publish_restarts, 1);
}

// Runtime mismatch begins rollback. Crash after exact local restoration resumes
// from RECOVER_RESTORE_LOCAL without a second restore restart.
{
  const state = makeState();
  const adapter = makeAdapter({
    verifyMismatchRemote: true,
    crashRestoreLocal: true,
  });
  const rec = recorder(state);

  await assert.rejects(
    () =>
      driveVoidValidatorCrossboxCoordinatorV1(
        state,
        adapter,
        rec.persist,
      ),
    /fixture_crash_after_restore_side_effect/u,
  );

  const durable = rec.durable();
  assert.equal(durable.journal.next_action, "RECOVER_RESTORE_LOCAL");
  assert.equal(adapter.world.local.restore_restarts, 1);

  const final = await driveVoidValidatorCrossboxCoordinatorV1(
    durable,
    adapter,
    rec.persist,
  );
  assert.equal(final.journal.transaction.phase, "RESTORED");
  assert.equal(final.journal.next_action, "DONE_RESTORED");
  assert.equal(final.checkpoint_authorization, null);
  assert.equal(adapter.world.local.publish_restarts, 1);
  assert.equal(adapter.world.remote.publish_restarts, 1);
  assert.equal(adapter.world.local.restore_restarts, 1);
  assert.equal(adapter.world.remote.restore_restarts, 1);
}

// An inactive participant stays inactive and never receives a restart witness.
{
  const state = makeState({ remoteActive: false });
  const adapter = makeAdapter({ remoteActive: false });
  const rec = recorder(state);
  const final = await driveVoidValidatorCrossboxCoordinatorV1(
    state,
    adapter,
    rec.persist,
  );
  assert.equal(final.journal.transaction.phase, "COMMITTED");
  assert.equal(final.journal.transaction.published.remote.restart_performed, false);
  assert.equal(final.journal.transaction.published.remote.restart_after_invocation_id, null);
  assert.equal(adapter.world.remote.publish_restarts, 0);
}

// If the checkpoint tag appears between prepare and finalization, fail closed.
{
  const state = makeState();
  const adapter = makeAdapter({ checkpointAbsent: false });
  const rec = recorder(state);
  const final = await driveVoidValidatorCrossboxCoordinatorV1(
    state,
    adapter,
    rec.persist,
  );
  assert.equal(final.journal.transaction.phase, "HOLD");
  assert.match(
    final.journal.transaction.rollback_reason,
    /checkpoint tag appeared before commit finalization/u,
  );
  assert.equal(final.checkpoint_authorization, null);
}

// Static authority wall: this slice can inspect tag absence but never publishes it.
// The proof imports the engine only; it never invokes CLI run/resume/participant.
{
  const source = fs.readFileSync(
    "ops/mainnet/void-validator-crossbox-transaction-run-v1.mjs",
    "utf8",
  );
  for (const forbidden of [
    '"tag",',
    '"push",',
    "git tag ",
    "git push ",
    "eth_sendRawTransaction",
    "new Wallet(",
    "privateKey",
  ]) {
    assert.equal(
      source.includes(forbidden),
      false,
      "forbidden authority surface: " + forbidden,
    );
  }
  assert.equal(
    source.includes("checkpoint_tag_creation: false"),
    true,
  );
  assert.equal(
    source.includes("coordinator_journal_fsync_before_side_effect_required: true"),
    true,
  );
  assert.equal(
    source.includes("participant_journal_fsync_before_side_effect_required: true"),
    true,
  );
  assert.equal(
    source.includes('["systemctl", "--user", "restart", service]'),
    true,
  );
  assert.equal(
    source.includes('["ssh", "-o", "BatchMode=yes"'),
    true,
  );
}

console.log("VOID_VALIDATOR_CROSSBOX_TRANSACTION_RUN_V1_PROOF_GREEN");
console.log("fixture_only=true");
console.log("live_ssh_execution=false");
console.log("live_systemd_mutation=false");
console.log("live_validator_publication=false");
console.log("publish_crash_recovery_no_duplicate_restart=true");
console.log("restore_crash_recovery_no_duplicate_restart=true");
console.log("verify_transport_retryable=true");
console.log("runtime_mismatch_rolls_back=true");
console.log("inactive_service_preserved=true");
console.log("explicit_participant_service_http_identity=true");
console.log("retired_alienware_rejected=true");
console.log("checkpoint_tag_creation=false");
console.log("git_push=false");
console.log("transaction_broadcast=false");
console.log("funds_movement=false");
