#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_COUPLED_GENERATION_TRANSITION_AUTHORITY_V1,
  VOID_BUY_COUPLED_GENERATION_TRANSITION_V1,
  applyBuyVoidGenerationTransitionAtPathsV1,
  deriveBuyVoidGenerationTransitionPlanV1,
} from "../tools/void-buy-coupled-generation-transition-v1.mjs";
import {
  classifyBuyLaunchGenerationJournalV1,
} from "../src/economic/buy_void_coupled_launch_gate_v1.mjs";

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-generation-transition-"),
);
fs.chmodSync(root, 0o700);

try {
  const dataDir = path.join(root, "data");
  const economicDir = path.join(dataDir, "economic");
  const authorityDir = path.join(root, "authority");
  fs.mkdirSync(economicDir, { recursive: true, mode: 0o700 });
  fs.mkdirSync(authorityDir, { recursive: true, mode: 0o700 });
  fs.chmodSync(dataDir, 0o700);
  fs.chmodSync(economicDir, 0o700);
  fs.chmodSync(authorityDir, 0o700);

  const journalPath = path.join(
    economicDir,
    "buy-void-coupled-live-generation-v1.jsonl",
  );
  const anchorPath = path.join(
    authorityDir,
    "buy-void-coupled-live-generation-anchor-v1.jsonl",
  );

  const generationA = "0x" + "a".repeat(64);
  const generationB = "0x" + "b".repeat(64);
  const t0 = 1_791_014_400_000;

  const activateA = deriveBuyVoidGenerationTransitionPlanV1({
    current_bytes: null,
    action: "activate",
    generation: generationA,
    occurred_at_ms: t0,
    data_dir: dataDir,
    journal_path: journalPath,
    anchor_path: anchorPath,
  });
  assert.equal(activateA.marker, "VOID_BUY_COUPLED_GENERATION_TRANSITION_PLAN_V1");
  assert.match(activateA.transition_id, /^voidbcgt1_[0-9a-f]{64}$/u);
  assert.equal(activateA.target_ready, true);
  assert.equal(activateA.target_sequence, 1);
  assert.equal(activateA.event.state, "active");
  assert.equal(activateA.event.generation, generationA);
  assert.equal(activateA.expected_prestate_sha256, null);
  assert.equal(activateA.apply_order, "external_anchor_then_runtime_journal");

  const appliedA = applyBuyVoidGenerationTransitionAtPathsV1({
    plan: activateA,
    journal_path: journalPath,
    anchor_path: anchorPath,
  });
  assert.equal(appliedA.marker, VOID_BUY_COUPLED_GENERATION_TRANSITION_V1);
  assert.equal(appliedA.status, "GENERATION_TRANSITION_APPLIED");
  assert.equal(appliedA.target_ready, true);
  assert.equal(appliedA.anchor_published_first, true);
  assert.equal(appliedA.market_activation_authorized, false);
  assert.equal(appliedA.public_presale_activation_authorized, false);
  assert.equal(appliedA.funds_movement_authorized, false);

  const activeBytes = fs.readFileSync(journalPath);
  assert.deepEqual(activeBytes, fs.readFileSync(anchorPath));
  const activeState = classifyBuyLaunchGenerationJournalV1(activeBytes);
  assert.equal(activeState.ready, true);
  assert.equal(activeState.generation, generationA);
  assert.equal(activeState.sequence, 1);

  // Exact retry after both mirrors reached target is idempotent.
  const retryA = applyBuyVoidGenerationTransitionAtPathsV1({
    plan: activateA,
    journal_path: journalPath,
    anchor_path: anchorPath,
  });
  assert.equal(retryA.target_state_sha256, activateA.target_state_sha256);
  assert.deepEqual(fs.readFileSync(journalPath), activeBytes);
  assert.deepEqual(fs.readFileSync(anchorPath), activeBytes);

  const revokeA = deriveBuyVoidGenerationTransitionPlanV1({
    current_bytes: activeBytes,
    action: "revoke",
    generation: generationA,
    occurred_at_ms: t0 + 1,
    data_dir: dataDir,
    journal_path: journalPath,
    anchor_path: anchorPath,
  });
  assert.equal(revokeA.target_ready, false);
  assert.equal(revokeA.target_sequence, 2);
  assert.equal(revokeA.event.state, "revoked");
  assert.equal(revokeA.event.previous_event_sha256, activeState.tip_sha256);

  const revoked = applyBuyVoidGenerationTransitionAtPathsV1({
    plan: revokeA,
    journal_path: journalPath,
    anchor_path: anchorPath,
  });
  assert.equal(revoked.target_ready, false);
  const revokedBytes = fs.readFileSync(journalPath);
  assert.deepEqual(revokedBytes, fs.readFileSync(anchorPath));
  const revokedState = classifyBuyLaunchGenerationJournalV1(revokedBytes);
  assert.equal(revokedState.ready, false);
  assert.equal(revokedState.generation, generationA);
  assert.equal(revokedState.sequence, 2);

  // A previously applied active plan cannot resurrect after revocation.
  assert.throws(
    () =>
      applyBuyVoidGenerationTransitionAtPathsV1({
        plan: activateA,
        journal_path: journalPath,
        anchor_path: anchorPath,
      }),
    /generation_transition_apply_prestate_mismatch/u,
  );

  const activateB = deriveBuyVoidGenerationTransitionPlanV1({
    current_bytes: revokedBytes,
    action: "activate",
    generation: generationB,
    occurred_at_ms: t0 + 2,
    data_dir: dataDir,
    journal_path: journalPath,
    anchor_path: anchorPath,
  });
  assert.equal(activateB.target_sequence, 3);
  assert.equal(activateB.target_ready, true);
  assert.notEqual(activateB.generation, generationA);

  const rotatedTarget = Buffer.concat([
    revokedBytes,
    Buffer.from(JSON.stringify(activateB.event) + "\n", "utf8"),
  ]);

  // Simulate a crash after the external anchor advances but before the runtime
  // journal. Retry must only finish the lagging journal and converge mirrors.
  fs.writeFileSync(anchorPath, rotatedTarget, { mode: 0o600 });
  fs.chmodSync(anchorPath, 0o600);
  assert.deepEqual(fs.readFileSync(journalPath), revokedBytes);
  assert.deepEqual(fs.readFileSync(anchorPath), rotatedTarget);

  const recoveredB = applyBuyVoidGenerationTransitionAtPathsV1({
    plan: activateB,
    journal_path: journalPath,
    anchor_path: anchorPath,
  });
  assert.equal(recoveredB.target_ready, true);
  assert.deepEqual(fs.readFileSync(journalPath), rotatedTarget);
  assert.deepEqual(fs.readFileSync(anchorPath), rotatedTarget);
  const rotatedState = classifyBuyLaunchGenerationJournalV1(rotatedTarget);
  assert.equal(rotatedState.ready, true);
  assert.equal(rotatedState.generation, generationB);
  assert.equal(rotatedState.sequence, 3);

  const revokeB = deriveBuyVoidGenerationTransitionPlanV1({
    current_bytes: rotatedTarget,
    action: "revoke",
    generation: generationB,
    occurred_at_ms: t0 + 3,
    data_dir: dataDir,
    journal_path: journalPath,
    anchor_path: anchorPath,
  });
  const revokeBTarget = Buffer.concat([
    rotatedTarget,
    Buffer.from(JSON.stringify(revokeB.event) + "\n", "utf8"),
  ]);

  // Runtime journal ahead of the external high-water anchor is not a valid
  // partial-apply state because reviewed order is anchor first.
  fs.writeFileSync(journalPath, revokeBTarget, { mode: 0o600 });
  fs.chmodSync(journalPath, 0o600);
  fs.writeFileSync(anchorPath, rotatedTarget, { mode: 0o600 });
  fs.chmodSync(anchorPath, 0o600);
  assert.throws(
    () =>
      applyBuyVoidGenerationTransitionAtPathsV1({
        plan: revokeB,
        journal_path: journalPath,
        anchor_path: anchorPath,
      }),
    /generation_transition_apply_prestate_mismatch/u,
  );

  assert.throws(
    () =>
      deriveBuyVoidGenerationTransitionPlanV1({
        current_bytes: activeBytes,
        action: "activate",
        generation: generationB,
        occurred_at_ms: t0 + 4,
        data_dir: dataDir,
        journal_path: journalPath,
        anchor_path: anchorPath,
      }),
    /generation_transition_activate_prestate_invalid/u,
  );
  assert.throws(
    () =>
      deriveBuyVoidGenerationTransitionPlanV1({
        current_bytes: revokedBytes,
        action: "revoke",
        generation: generationA,
        occurred_at_ms: t0 + 4,
        data_dir: dataDir,
        journal_path: journalPath,
        anchor_path: anchorPath,
      }),
    /generation_transition_revoke_prestate_invalid/u,
  );
  assert.throws(
    () =>
      deriveBuyVoidGenerationTransitionPlanV1({
        current_bytes: null,
        action: "revoke",
        generation: generationA,
        occurred_at_ms: t0,
        data_dir: dataDir,
        journal_path: journalPath,
        anchor_path: anchorPath,
      }),
    /generation_transition_first_action_must_activate/u,
  );

  const tamperedPlan = {
    ...activateB,
    target_state_sha256: "0".repeat(64),
  };
  assert.throws(
    () =>
      applyBuyVoidGenerationTransitionAtPathsV1({
        plan: tamperedPlan,
        journal_path: journalPath,
        anchor_path: anchorPath,
      }),
    /generation_transition_plan_invalid/u,
  );

  assert.deepEqual(
    VOID_BUY_COUPLED_GENERATION_TRANSITION_AUTHORITY_V1,
    {
      explicit_operator_apply_confirmation_required: true,
      runtime_generation_journal_write: true,
      external_high_water_anchor_write: true,
      anchor_written_before_runtime_journal: true,
      partial_apply_fails_closed: true,
      retry_can_finish_anchor_ahead_partial_apply: true,
      environment_mutation: false,
      systemd_or_service_mutation: false,
      receipt_creation: false,
      signature_creation: false,
      private_key_access: false,
      credential_access: false,
      wallet_or_signer_access: false,
      transaction_construction: false,
      transaction_signing: false,
      transaction_broadcast: false,
      chain2050_write: false,
      wc_ledger_write: false,
      inventory_funding: false,
      market_activation: false,
      public_presale_activation: false,
      funds_movement: false,
    },
  );

  const source = fs.readFileSync(
    "tools/void-buy-coupled-generation-transition-v1.mjs",
    "utf8",
  );
  const anchorWrite = source.indexOf('if (anchorClass === "pre")');
  const journalWrite = source.indexOf('if (journalClass === "pre")');
  assert.ok(anchorWrite >= 0 && journalWrite > anchorWrite);
  assert.match(source, /fs\.fsyncSync\(parent\.fd\)/u);
  assert.match(source, /O_EXCL/u);
  assert.match(source, /O_NOFOLLOW/u);
  assert.doesNotMatch(source, /eth_sendRawTransaction/u);
  assert.doesNotMatch(source, /new\s+Wallet/u);
  assert.doesNotMatch(source, /signTypedData/u);
  assert.doesNotMatch(source, /systemctl/u);

  console.log(
    "VOID_BUY_COUPLED_GENERATION_TRANSITION_V1_PROOF_GREEN",
  );
  console.log("initial_activation_transition_green=true");
  console.log("revocation_transition_green=true");
  console.log("rotation_requires_prior_revocation=true");
  console.log("external_anchor_written_first=true");
  console.log("anchor_ahead_partial_apply_recoverable=true");
  console.log("journal_ahead_partial_apply_rejected=true");
  console.log("applied_transition_idempotent=true");
  console.log("old_active_plan_replay_after_revocation=false");
  console.log("atomic_private_replace=true");
  console.log("service_restart=false");
  console.log("signature_creation=false");
  console.log("market_activation_authorized=false");
  console.log("public_presale_activation_authorized=false");
  console.log("funds_movement=false");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
