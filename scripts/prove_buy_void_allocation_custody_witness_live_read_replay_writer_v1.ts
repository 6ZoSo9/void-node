#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_V1,
  buildBuyVoidAllocationCustodyWitnessLiveReadReplayGenesisHighWaterV1,
  inspectBuyVoidAllocationCustodyWitnessLiveReadReplayWriterV1,
  persistBuyVoidAllocationCustodyWitnessLiveReadReplayIssueV1,
  persistBuyVoidAllocationCustodyWitnessLiveReadReplayTerminalV1,
  testOnlyInspectBuyVoidAllocationCustodyWitnessLiveReadReplayWriterSnapshotV1,
  testOnlyPersistBuyVoidAllocationCustodyWitnessLiveReadReplayIssueCrashV1,
  testOnlyPersistBuyVoidAllocationCustodyWitnessLiveReadReplayIssueFinalSnapshotV1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_writer_v1.js";
import {
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1,
  deriveBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_high_water_v1.js";

const JOURNAL_NAME = "live-read-replay-v1.jsonl";
const HIGH_WATER_NAME = "live-read-replay-high-water-v1.json";
const INTENT_NAME = "live-read-replay-publication-intent-v1.json";

const sha = (hex: string): string =>
  "sha256:" + hex.repeat(64);

function requireWriterOk<T extends { ok: boolean }>(
  value: T,
  label: string,
): asserts value is Extract<T, { ok: true }> {
  const runtime = value as T & { reason?: string };
  if (runtime.ok !== true) {
    throw new Error(
      label + ": " + (runtime.reason ?? "unexpected_writer_hold"),
    );
  }
}
const requestId = (hex: string): string =>
  "voidwreq1_" + hex.repeat(64);

{
  const writerGenesis =
    buildBuyVoidAllocationCustodyWitnessLiveReadReplayGenesisHighWaterV1();
  const canonicalGenesis =
    deriveBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1(
      Buffer.alloc(0),
    );
  if (canonicalGenesis.ok !== true) {
    throw new Error(
      "canonical replay high-water genesis held: " +
        canonicalGenesis.reason,
    );
  }
  assert.equal(
    writerGenesis.high_water_bytes.toString("utf8"),
    canonicalGenesis.high_water_json,
  );
  assert.equal(
    writerGenesis.high_water_sha256,
    canonicalGenesis.high_water_sha256,
  );
  assert.deepEqual(
    writerGenesis.high_water,
    canonicalGenesis.high_water,
  );
}

function fixture() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-live-read-replay-writer-v1-"),
  );
  const journalRoot = path.join(root, "journal");
  const highWaterRoot = path.join(root, "high-water");
  fs.mkdirSync(journalRoot, { mode: 0o700 });
  fs.mkdirSync(highWaterRoot, { mode: 0o700 });
  fs.chmodSync(journalRoot, 0o700);
  fs.chmodSync(highWaterRoot, 0o700);

  const genesis =
    buildBuyVoidAllocationCustodyWitnessLiveReadReplayGenesisHighWaterV1();
  fs.writeFileSync(
    path.join(journalRoot, JOURNAL_NAME),
    genesis.journal_bytes,
    { mode: 0o600 },
  );
  fs.writeFileSync(
    path.join(highWaterRoot, HIGH_WATER_NAME),
    genesis.high_water_bytes,
    { mode: 0o600 },
  );
  fs.chmodSync(path.join(journalRoot, JOURNAL_NAME), 0o600);
  fs.chmodSync(path.join(highWaterRoot, HIGH_WATER_NAME), 0o600);

  return Object.freeze({
    root,
    journalRoot,
    highWaterRoot,
    genesisJournal: Buffer.from(genesis.journal_bytes),
    genesisHighWater: Buffer.from(genesis.high_water_bytes),
  });
}

function cleanup(f: ReturnType<typeof fixture>) {
  fs.rmSync(f.root, { recursive: true, force: true });
}

function replaceVisibleRoot(
  f: ReturnType<typeof fixture>,
  which: "journal" | "high-water",
  label: string,
): void {
  const visible =
    which === "journal" ? f.journalRoot : f.highWaterRoot;
  const detached = path.join(f.root, label + "-detached");
  fs.renameSync(visible, detached);
  fs.mkdirSync(visible, { mode: 0o700 });
  fs.chmodSync(visible, 0o700);
  const name =
    which === "journal" ? JOURNAL_NAME : HIGH_WATER_NAME;
  fs.copyFileSync(
    path.join(detached, name),
    path.join(visible, name),
  );
  fs.chmodSync(path.join(visible, name), 0o600);
}

function issue(f: ReturnType<typeof fixture>) {
  return persistBuyVoidAllocationCustodyWitnessLiveReadReplayIssueV1({
    journal_root: f.journalRoot,
    high_water_root: f.highWaterRoot,
    entropy_sha256: sha("1"),
    issued_at_ms: 1_000,
    expires_at_ms: 39_000,
  });
}

{
  const f = fixture();
  try {
    const inspected =
      inspectBuyVoidAllocationCustodyWitnessLiveReadReplayWriterV1({
        journal_root: f.journalRoot,
        high_water_root: f.highWaterRoot,
      });
    assert.equal(inspected.ok, true);
    if (!inspected.ok) throw new Error("genesis inspect held");
    assert.equal(inspected.status, "inspected");
    assert.equal(inspected.generation, 0);
    assert.equal(inspected.sequence, 0);
    assert.equal(inspected.event_count, 0);
    assert.equal(inspected.pending, false);
    assert.equal(inspected.operation_performed, false);
    assert.equal(inspected.recovery_performed, false);

    const issued = issue(f);
    assert.equal(issued.ok, true);
    if (!issued.ok) throw new Error("issue held");
    assert.equal(issued.status, "persisted_issue");
    assert.equal(issued.generation, 1);
    assert.equal(issued.sequence, 1);
    assert.equal(issued.event_count, 1);
    assert.equal(issued.pending, true);
    assert.match(
      String(issued.pending_challenge_sha256),
      /^sha256:[0-9a-f]{64}$/u,
    );
    assert.equal(issued.operation_performed, true);
    assert.equal(issued.recovery_performed, false);
    const issuedJournal = fs.readFileSync(
      path.join(f.journalRoot, JOURNAL_NAME),
    );
    const issuedHighWater = fs.readFileSync(
      path.join(f.highWaterRoot, HIGH_WATER_NAME),
    );
    const issuedCanonical =
      classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1(
        {
          journal_jsonl: issuedJournal,
          high_water_json: issuedHighWater,
        },
      );
    if (issuedCanonical.ok !== true) {
      throw new Error(
        "issued canonical high-water binding held: " +
          issuedCanonical.reason,
      );
    }
    assert.equal(
      issued.high_water_sha256,
      issuedCanonical.high_water_sha256,
    );
    assert.equal(
      issued.pending_challenge_id,
      issuedCanonical.high_water.pending_challenge_id,
    );
    assert.equal(
      issued.pending_expires_at_ms,
      issuedCanonical.high_water.pending_expires_at_ms,
    );
    assert.equal(issued.ready_for_issue, false);
    assert.equal(
      fs.existsSync(path.join(f.journalRoot, INTENT_NAME)),
      false,
    );
    assert.equal(
      fs.existsSync(path.join(f.highWaterRoot, INTENT_NAME)),
      false,
    );

    const consumed =
      persistBuyVoidAllocationCustodyWitnessLiveReadReplayTerminalV1({
        journal_root: f.journalRoot,
        high_water_root: f.highWaterRoot,
        outcome: "consumed",
        request_id: requestId("a"),
        response_sha256: sha("b"),
        terminal_at_ms: 2_000,
      });
    assert.equal(consumed.ok, true);
    if (!consumed.ok) throw new Error("consume held");
    assert.equal(consumed.status, "persisted_consumed");
    assert.equal(consumed.generation, 1);
    assert.equal(consumed.sequence, 2);
    assert.equal(consumed.event_count, 2);
    assert.equal(consumed.pending, false);
    const consumedCanonical =
      classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1(
        {
          journal_jsonl: fs.readFileSync(
            path.join(f.journalRoot, JOURNAL_NAME),
          ),
          high_water_json: fs.readFileSync(
            path.join(f.highWaterRoot, HIGH_WATER_NAME),
          ),
        },
      );
    if (consumedCanonical.ok !== true) {
      throw new Error(
        "consumed canonical high-water binding held: " +
          consumedCanonical.reason,
      );
    }
    assert.equal(
      consumed.high_water_sha256,
      consumedCanonical.high_water_sha256,
    );
    assert.equal(consumed.last_terminal_state, "consumed");
    assert.equal(consumed.ready_for_issue, true);

    const duplicate =
      persistBuyVoidAllocationCustodyWitnessLiveReadReplayTerminalV1({
        journal_root: f.journalRoot,
        high_water_root: f.highWaterRoot,
        outcome: "consumed",
        request_id: requestId("a"),
        response_sha256: sha("b"),
        terminal_at_ms: 2_001,
      });
    assert.equal(duplicate.ok, false);
    if (duplicate.ok) {
      throw new Error("duplicate consume unexpectedly persisted");
    }
    assert.match(
      duplicate.reason,
      /witness_live_read_replay_writer_plan_witness_live_read_replay_no_pending_challenge/u,
    );

    const finalInspect =
      inspectBuyVoidAllocationCustodyWitnessLiveReadReplayWriterV1({
        journal_root: f.journalRoot,
        high_water_root: f.highWaterRoot,
      });
    assert.equal(finalInspect.ok, true);
    if (!finalInspect.ok) throw new Error("final inspect held");
    assert.equal(finalInspect.status, "inspected");
    assert.equal(finalInspect.generation, 1);
    assert.equal(finalInspect.sequence, 2);
    assert.equal(finalInspect.pending, false);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const issued = issue(f);
    assert.equal(issued.ok, true);
    if (!issued.ok) throw new Error("rollback fixture issue held");

    fs.writeFileSync(
      path.join(f.journalRoot, JOURNAL_NAME),
      f.genesisJournal,
      { mode: 0o600 },
    );
    const rolledJournal =
      inspectBuyVoidAllocationCustodyWitnessLiveReadReplayWriterV1({
        journal_root: f.journalRoot,
        high_water_root: f.highWaterRoot,
      });
    assert.equal(rolledJournal.ok, false);
    if (rolledJournal.ok) {
      throw new Error("journal rollback unexpectedly accepted");
    }
    assert.match(
      rolledJournal.reason,
      /witness_live_read_replay_high_water_binding_mismatch/u,
    );
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const issued = issue(f);
    assert.equal(issued.ok, true);
    if (!issued.ok) throw new Error("high-water rollback fixture issue held");

    fs.writeFileSync(
      path.join(f.highWaterRoot, HIGH_WATER_NAME),
      f.genesisHighWater,
      { mode: 0o600 },
    );
    const rolledHighWater =
      inspectBuyVoidAllocationCustodyWitnessLiveReadReplayWriterV1({
        journal_root: f.journalRoot,
        high_water_root: f.highWaterRoot,
      });
    assert.equal(rolledHighWater.ok, false);
    if (rolledHighWater.ok) {
      throw new Error("high-water rollback unexpectedly accepted");
    }
    assert.match(
      rolledHighWater.reason,
      /witness_live_read_replay_high_water_binding_mismatch/u,
    );
  } finally {
    cleanup(f);
  }
}

for (const replaceRoot of ["journal", "high-water"] as const) {
  const f = fixture();
  try {
    let injected = false;
    const result =
      testOnlyInspectBuyVoidAllocationCustodyWitnessLiveReadReplayWriterSnapshotV1(
        {
          journal_root: f.journalRoot,
          high_water_root: f.highWaterRoot,
        },
        () => {
          injected = true;
          replaceVisibleRoot(
            f,
            replaceRoot,
            "inspect-" + replaceRoot,
          );
        },
      );
    assert.equal(injected, true, replaceRoot);
    assert.equal(result.ok, false, replaceRoot);
    if (result.ok) {
      throw new Error("root-swap inspect unexpectedly succeeded");
    }
    assert.match(result.reason, /_root_changed$/u, replaceRoot);
  } finally {
    cleanup(f);
  }
}

for (const replaceRoot of ["journal", "high-water"] as const) {
  const f = fixture();
  try {
    const crashed =
      testOnlyPersistBuyVoidAllocationCustodyWitnessLiveReadReplayIssueCrashV1(
        {
          journal_root: f.journalRoot,
          high_water_root: f.highWaterRoot,
          entropy_sha256: sha("4"),
          issued_at_ms: 20_000,
          expires_at_ms: 58_000,
        },
        "after_intents",
      );
    assert.equal(crashed.ok, false, replaceRoot);

    let injected = false;
    const recovered =
      testOnlyInspectBuyVoidAllocationCustodyWitnessLiveReadReplayWriterSnapshotV1(
        {
          journal_root: f.journalRoot,
          high_water_root: f.highWaterRoot,
        },
        () => {
          injected = true;
          replaceVisibleRoot(
            f,
            replaceRoot,
            "recovery-" + replaceRoot,
          );
        },
      );
    assert.equal(injected, true, replaceRoot);
    assert.equal(recovered.ok, false, replaceRoot);
    if (recovered.ok) {
      throw new Error("root-swap recovery unexpectedly succeeded");
    }
    assert.match(recovered.reason, /_root_changed$/u, replaceRoot);
  } finally {
    cleanup(f);
  }
}

for (const replaceRoot of ["journal", "high-water"] as const) {
  const f = fixture();
  try {
    let injected = false;
    const persisted =
      testOnlyPersistBuyVoidAllocationCustodyWitnessLiveReadReplayIssueFinalSnapshotV1(
        {
          journal_root: f.journalRoot,
          high_water_root: f.highWaterRoot,
          entropy_sha256: sha("5"),
          issued_at_ms: 30_000,
          expires_at_ms: 68_000,
        },
        () => {
          injected = true;
          replaceVisibleRoot(
            f,
            replaceRoot,
            "persist-" + replaceRoot,
          );
        },
      );
    assert.equal(injected, true, replaceRoot);
    assert.equal(persisted.ok, false, replaceRoot);
    if (persisted.ok) {
      throw new Error("root-swap persistence unexpectedly succeeded");
    }
    assert.match(persisted.reason, /_root_changed$/u, replaceRoot);
  } finally {
    cleanup(f);
  }
}

for (const phase of [
  "after_journal_intent",
  "after_intents",
  "after_journal",
  "after_high_water",
] as const) {
  const f = fixture();
  try {
    const crashed =
      testOnlyPersistBuyVoidAllocationCustodyWitnessLiveReadReplayIssueCrashV1(
        {
          journal_root: f.journalRoot,
          high_water_root: f.highWaterRoot,
          entropy_sha256: sha("2"),
          issued_at_ms: 5_000,
          expires_at_ms: 43_000,
        },
        phase,
      );
    assert.equal(crashed.ok, false, phase);
    if (crashed.ok) throw new Error("crash injection unexpectedly green");
    assert.match(
      crashed.reason,
      new RegExp("test_crash_" + phase, "u"),
      phase,
    );

    const recovered =
      inspectBuyVoidAllocationCustodyWitnessLiveReadReplayWriterV1({
        journal_root: f.journalRoot,
        high_water_root: f.highWaterRoot,
      });
    requireWriterOk(recovered, "crash recovery held: " + phase);
    assert.equal(recovered.ok, true, phase);
    assert.equal(recovered.status, "recovered", phase);
    assert.equal(recovered.recovery_performed, true, phase);
    assert.equal(recovered.generation, 1, phase);
    assert.equal(recovered.sequence, 1, phase);
    assert.equal(recovered.pending, true, phase);
    assert.equal(
      fs.existsSync(path.join(f.journalRoot, INTENT_NAME)),
      false,
      phase,
    );
    assert.equal(
      fs.existsSync(path.join(f.highWaterRoot, INTENT_NAME)),
      false,
      phase,
    );
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const crashed =
      testOnlyPersistBuyVoidAllocationCustodyWitnessLiveReadReplayIssueCrashV1(
        {
          journal_root: f.journalRoot,
          high_water_root: f.highWaterRoot,
          entropy_sha256: sha("6"),
          issued_at_ms: 40_000,
          expires_at_ms: 78_000,
        },
        "after_intents",
      );
    assert.equal(crashed.ok, false);

    const intent = JSON.parse(
      fs.readFileSync(
        path.join(f.highWaterRoot, INTENT_NAME),
        "utf8",
      ),
    );
    assert.equal(typeof intent.after_high_water_json, "string");
    fs.writeFileSync(
      path.join(f.highWaterRoot, HIGH_WATER_NAME),
      intent.after_high_water_json,
      { mode: 0o600 },
    );

    const recovered =
      inspectBuyVoidAllocationCustodyWitnessLiveReadReplayWriterV1({
        journal_root: f.journalRoot,
        high_water_root: f.highWaterRoot,
      });
    requireWriterOk(
      recovered,
      "high-water-committed recovery held",
    );
    assert.equal(recovered.ok, true);
    assert.equal(recovered.status, "recovered");
    assert.equal(recovered.recovery_performed, true);
    assert.equal(recovered.generation, 1);
    assert.equal(recovered.sequence, 1);
    assert.equal(recovered.pending, true);
    assert.equal(
      fs.existsSync(path.join(f.journalRoot, INTENT_NAME)),
      false,
    );
    assert.equal(
      fs.existsSync(path.join(f.highWaterRoot, INTENT_NAME)),
      false,
    );
    const rebound =
      classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1(
        {
          journal_jsonl: fs.readFileSync(
            path.join(f.journalRoot, JOURNAL_NAME),
          ),
          high_water_json: fs.readFileSync(
            path.join(f.highWaterRoot, HIGH_WATER_NAME),
          ),
        },
      );
    assert.equal(rebound.ok, true);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const same =
      inspectBuyVoidAllocationCustodyWitnessLiveReadReplayWriterV1({
        journal_root: f.journalRoot,
        high_water_root: f.journalRoot,
      });
    assert.equal(same.ok, false);
    if (same.ok) throw new Error("same root unexpectedly accepted");
    assert.equal(
      same.reason,
      "witness_live_read_replay_writer_storage_roots_not_distinct",
    );
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const linked = path.join(f.root, "journal-link");
    fs.symlinkSync(f.journalRoot, linked);
    const result =
      inspectBuyVoidAllocationCustodyWitnessLiveReadReplayWriterV1({
        journal_root: linked,
        high_water_root: f.highWaterRoot,
      });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("symlink root unexpectedly accepted");
    assert.match(
      result.reason,
      /witness_live_read_replay_writer_journal_root_/u,
    );
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const crashed =
      testOnlyPersistBuyVoidAllocationCustodyWitnessLiveReadReplayIssueCrashV1(
        {
          journal_root: f.journalRoot,
          high_water_root: f.highWaterRoot,
          entropy_sha256: sha("3"),
          issued_at_ms: 10_000,
          expires_at_ms: 48_000,
        },
        "after_intents",
      );
    assert.equal(crashed.ok, false);

    const journalIntent = path.join(f.journalRoot, INTENT_NAME);
    const highWaterIntent = path.join(f.highWaterRoot, INTENT_NAME);
    const tampered = JSON.parse(fs.readFileSync(highWaterIntent, "utf8"));
    tampered.intent_id =
      "voidwlri1_" +
      crypto.createHash("sha256").update("tampered").digest("hex");
    fs.writeFileSync(
      highWaterIntent,
      JSON.stringify(tampered) + "\n",
      { mode: 0o600 },
    );

    const recovery =
      inspectBuyVoidAllocationCustodyWitnessLiveReadReplayWriterV1({
        journal_root: f.journalRoot,
        high_water_root: f.highWaterRoot,
      });
    assert.equal(recovery.ok, false);
    if (recovery.ok) throw new Error("tampered intent unexpectedly recovered");
    assert.match(
      recovery.reason,
      /witness_live_read_replay_writer_intent_/u,
    );
    assert.equal(fs.existsSync(journalIntent), true);
  } finally {
    cleanup(f);
  }
}

for (const key of [
  "validated_packet_binding_proven",
  "live_durable_storage_proven",
  "rollback_resistance_proven",
  "protected_high_water_custody_proven",
  "trusted_verification_clock_proven",
  "challenge_entropy_proven",
  "challenge_unpredictability_proven",
  "live_evidence_origin_proven",
  "live_sshd_connection_context_proven",
  "external_transport_authenticated",
  "external_witness_storage_proven",
  "live_remote_read_performed",
  "runtime_integration",
  "independent_custody_proven",
  "production_gate_ready",
  "payment_acceptance",
  "wallet_or_signer_access",
  "private_key_access",
  "transaction_construction",
  "transaction_signing",
  "transaction_broadcast",
  "chain2050_write",
  "presale_activation",
  "market_activation",
  "funds_movement",
] as const) {
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_AUTHORITY_V1[
      key
    ],
    false,
    key,
  );
}

for (const key of [
  "descriptor_bound_reads",
  "nofollow_ancestor_walk",
  "distinct_storage_roots_required",
  "dual_root_serialization_lock",
  "redundant_transaction_intent",
  "canonical_replay_planner_required",
  "canonical_replay_high_water_required",
  "journal_first_publication_order",
  "atomic_journal_publication",
  "atomic_high_water_publication",
  "file_fsync",
  "directory_fsync",
  "crash_recovery",
  "exact_postcheck",
  "cross_root_rollback_detection_semantics",
] as const) {
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_AUTHORITY_V1[
      key
    ],
    true,
    key,
  );
}

const source = fs.readFileSync(
  "src/economic/buy_void_allocation_custody_witness_live_read_replay_writer_v1.ts",
  "utf8",
);
assert.match(source, /withBuyVoidFilesystemBakeryLockV1/u);
assert.match(source, /O_NOFOLLOW/u);
assert.match(source, /O_DIRECTORY/u);
assert.match(source, /fs\.fsyncSync/u);
assert.match(
  source,
  /planBuyVoidAllocationCustodyWitnessLiveReadChallengeIssueV1/u,
);
assert.match(
  source,
  /planBuyVoidAllocationCustodyWitnessLiveReadChallengeTerminalV1/u,
);
assert.match(
  source,
  /deriveBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1/u,
);
assert.match(
  source,
  /classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1/u,
);
assert.match(source, /canonical_replay_high_water_required:\s*true/u);
assert.match(source, /before_high_water_json/u);
assert.match(source, /after_high_water_json/u);
assert.doesNotMatch(source, /const HIGH_WATER_SCHEMA/u);
assert.doesNotMatch(source, /const HIGH_WATER_MARKER/u);
assert.doesNotMatch(source, /voidwlrhw1_/u);
assert.match(source, /redundant_transaction_intent:\s*true/u);
assert.match(source, /journal_first_publication_order:\s*true/u);
assert.match(source, /function assertPinnedRootsVisible\(/u);
assert.match(
  source,
  /assertPinnedRootsVisible\(journalDirectory, highWaterDirectory\);/u,
);

assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_V1,
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_V1",
);

console.log(
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_V1_GREEN",
);
console.log("preprovisioned_storage_required=true");
console.log("dual_root_serialization=true");
console.log("redundant_transaction_intent=true");
console.log("canonical_replay_planner_composed=true");
console.log("canonical_replay_high_water_composed=true");
console.log("private_high_water_schema_fork=false");
console.log("journal_first_publication=true");
console.log("atomic_journal_publication=true");
console.log("atomic_high_water_publication=true");
console.log("file_fsync=true");
console.log("directory_fsync=true");
console.log("crash_recovery_all_cutpoints=true");
console.log("high_water_committed_recovery=true");
console.log("single_root_rollback_detected=true");
console.log("terminal_paired_root_revalidation=true");
console.log("inspect_root_swap_after_journal_snapshot_holds=true");
console.log("recovery_root_swap_after_journal_snapshot_holds=true");
console.log("persist_root_swap_after_journal_snapshot_holds=true");
console.log("tampered_intent_rejected=true");
console.log("symlink_root_rejected=true");
console.log("live_durable_storage_proven=false");
console.log("rollback_resistance_proven=false");
console.log("validated_packet_binding_proven=false");
console.log("external_transport_authenticated=false");
console.log("external_witness_storage_proven=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");