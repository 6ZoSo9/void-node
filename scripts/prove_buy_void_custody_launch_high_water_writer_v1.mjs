#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildBuyVoidCustodyLaunchHighWaterV2,
} from "../src/economic/buy_void_custody_launch_authority_v2.mjs";
import {
  VOID_BUY_VOID_CUSTODY_LAUNCH_HIGH_WATER_WRITER_AUTHORITY_V1,
  createBuyVoidCustodyLaunchHighWaterWriterV1,
  testOnlyCreateBuyVoidCustodyLaunchHighWaterWriterV1,
} from "../src/economic/buy_void_custody_launch_high_water_writer_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WRITER =
  "src/economic/buy_void_custody_launch_high_water_writer_v1.mjs";
const CLASSIFIER =
  "src/economic/buy_void_custody_launch_authority_v2.mjs";
const EXPECTED_WRITER_BLOB =
  "77b1c10c70bd668d8c1bc950d47bfe12b4c9cef0";
const EXPECTED_CLASSIFIER_BLOB =
  "223ebdb8317009228094b8ebecef19dc37d87a91";
const HIGH_WATER_NAME =
  "buy-void-custody-launch-high-water-v2.json";

function gitBlob(bytes) {
  return crypto.createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0", "utf8"))
    .update(bytes)
    .digest("hex");
}
function sha256Id(bytes) {
  return "sha256:" +
    crypto.createHash("sha256").update(bytes).digest("hex");
}
function readSource(relative) {
  return fs.readFileSync(path.join(ROOT, relative));
}

assert.equal(gitBlob(readSource(WRITER)), EXPECTED_WRITER_BLOB);
assert.equal(gitBlob(readSource(CLASSIFIER)), EXPECTED_CLASSIFIER_BLOB);

const SOURCE_COMPOSITION = "sha256:" + "11".repeat(32);
const GEN1 = "0x" + "22".repeat(32);
const TIP1 = "sha256:" + "33".repeat(32);
const PREFIX1 = "sha256:" + "44".repeat(32);
const GEN2 = "0x" + "55".repeat(32);
const TIP2 = "sha256:" + "66".repeat(32);
const PREFIX2 = "sha256:" + "77".repeat(32);

const HIGH1 = buildBuyVoidCustodyLaunchHighWaterV2({
  source_composition_id: SOURCE_COMPOSITION,
  sequence: 1,
  generation: GEN1,
  tip_sha256: TIP1,
  journal_prefix_sha256: PREFIX1,
});
const HIGH2 = buildBuyVoidCustodyLaunchHighWaterV2({
  source_composition_id: SOURCE_COMPOSITION,
  sequence: 3,
  generation: GEN2,
  tip_sha256: TIP2,
  journal_prefix_sha256: PREFIX2,
});
const JOURNAL1 = Buffer.from("synthetic-journal-generation-1\n", "utf8");
const JOURNAL2 = Buffer.from("synthetic-journal-generation-2\n", "utf8");
const JOURNAL3 = Buffer.from("synthetic-journal-generation-3\n", "utf8");
const RECEIPT = Buffer.from("synthetic-receipt\n", "utf8");

function ready(sequence, generation, tip, highWater) {
  return Object.freeze({
    ready: true,
    reason: null,
    sequence,
    generation,
    tip_sha256: tip,
    high_water_matches_current: true,
    high_water_advance_required: false,
    candidate_high_water_json: highWater.toString("utf8"),
    candidate_high_water_sha256: sha256Id(highWater),
  });
}
function held(reason, sequence, generation, tip, candidate) {
  return Object.freeze({
    ready: false,
    reason,
    sequence,
    generation,
    tip_sha256: tip,
    high_water_matches_current: false,
    high_water_advance_required: true,
    candidate_high_water_json:
      candidate === null ? null : candidate.toString("utf8"),
    candidate_high_water_sha256:
      candidate === null ? null : sha256Id(candidate),
  });
}
function fixtureClassifier(observed) {
  const journal = observed.generation_journal_bytes;
  const high = observed.custody_high_water_bytes;
  if (high === null) {
    return held(
      "custody_launch_high_water_bootstrap_required",
      1,
      GEN1,
      TIP1,
      HIGH1,
    );
  }
  if (journal.equals(JOURNAL1) && high.equals(HIGH1)) {
    return ready(1, GEN1, TIP1, HIGH1);
  }
  if (journal.equals(JOURNAL2) && high.equals(HIGH1)) {
    return held(
      "custody_launch_high_water_advance_required",
      3,
      GEN2,
      TIP2,
      HIGH2,
    );
  }
  if (journal.equals(JOURNAL2) && high.equals(HIGH2)) {
    return ready(3, GEN2, TIP2, HIGH2);
  }
  return held("synthetic_authority_mismatch", null, null, null, null);
}

function privateDir(directory) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
}
function privateFile(file, bytes) {
  fs.writeFileSync(file, bytes, { mode: 0o600 });
  fs.chmodSync(file, 0o600);
}
function makeFixture(name, {
  journal = JOURNAL1,
  highWater = HIGH1,
  receipt = RECEIPT,
} = {}) {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-custody-launch-writer-" + name + "-"),
  );
  fs.chmodSync(root, 0o700);
  const journalDir = path.join(root, "journal");
  const receiptDir = path.join(root, "receipt");
  const custodyRoot = path.join(root, "custody");
  privateDir(journalDir);
  privateDir(receiptDir);
  privateDir(custodyRoot);
  const journalPath = path.join(journalDir, "generation.jsonl");
  const receiptPath = path.join(receiptDir, "activation.json");
  privateFile(journalPath, journal);
  privateFile(receiptPath, receipt);
  if (highWater !== null) {
    privateFile(path.join(custodyRoot, HIGH_WATER_NAME), highWater);
  }
  return {
    root,
    journalPath,
    receiptPath,
    custodyRoot,
    options: {
      generation_journal_path: journalPath,
      activation_receipt_path: receiptPath,
      custody_root: custodyRoot,
    },
  };
}
function cleanup(fixture) {
  fs.rmSync(fixture.root, { recursive: true, force: true });
}
function readHigh(fixture) {
  return fs.readFileSync(path.join(fixture.custodyRoot, HIGH_WATER_NAME));
}

// Exact-current state is idempotent and performs no mutation.
{
  const f = makeFixture("current");
  try {
    const writer =
      testOnlyCreateBuyVoidCustodyLaunchHighWaterWriterV1(
        f.options,
        fixtureClassifier,
      );
    const result = writer.inspect();
    assert.equal(result.ok, true);
    assert.equal(result.status, "current");
    assert.equal(result.operation_performed, false);
    assert.equal(readHigh(f).equals(HIGH1), true);
  } finally {
    cleanup(f);
  }
}

// A valid later generation advances exactly the fixed custody high-water.
{
  const f = makeFixture("advance", { journal: JOURNAL2 });
  try {
    const writer =
      testOnlyCreateBuyVoidCustodyLaunchHighWaterWriterV1(
        f.options,
        fixtureClassifier,
      );
    const advanced = writer.advance();
    assert.equal(advanced.ok, true);
    assert.equal(advanced.status, "advanced");
    assert.equal(advanced.operation_performed, true);
    assert.equal(advanced.bootstrap_write_performed, false);
    assert.equal(readHigh(f).equals(HIGH2), true);

    const replay = writer.advance();
    assert.equal(replay.ok, true);
    assert.equal(replay.status, "current");
    assert.equal(replay.operation_performed, false);
    assert.equal(readHigh(f).equals(HIGH2), true);
  } finally {
    cleanup(f);
  }
}

// Missing high-water remains a separate bootstrap qualification gate.
{
  const f = makeFixture("bootstrap", { highWater: null });
  try {
    const writer =
      testOnlyCreateBuyVoidCustodyLaunchHighWaterWriterV1(
        f.options,
        fixtureClassifier,
      );
    const result = writer.advance();
    assert.equal(result.ok, false);
    assert.equal(result.reason, "bootstrap_requires_separate_qualification");
    assert.equal(result.operation_performed, false);
    assert.equal(
      fs.existsSync(path.join(f.custodyRoot, HIGH_WATER_NAME)),
      false,
    );
  } finally {
    cleanup(f);
  }
}

// Candidate JSON cannot smuggle unreviewed fields even with a matching digest.
{
  const f = makeFixture("candidate-shape", { journal: JOURNAL2 });
  try {
    const malicious = Buffer.from(
      JSON.stringify(
        { ...JSON.parse(HIGH2.toString("utf8")), extra_authority: true },
        null,
        2,
      ) + "\n",
      "utf8",
    );
    const classifier = (observed) => {
      if (observed.custody_high_water_bytes?.equals(HIGH1)) {
        return Object.freeze({
          ready: false,
          reason: "custody_launch_high_water_advance_required",
          high_water_matches_current: false,
          high_water_advance_required: true,
          candidate_high_water_json: malicious.toString("utf8"),
          candidate_high_water_sha256: sha256Id(malicious),
        });
      }
      return fixtureClassifier(observed);
    };
    const result =
      testOnlyCreateBuyVoidCustodyLaunchHighWaterWriterV1(
        f.options,
        classifier,
      ).advance();
    assert.equal(result.ok, false);
    assert.equal(result.reason, "advance_candidate_shape_invalid");
    assert.equal(result.operation_performed, false);
    assert.equal(readHigh(f).equals(HIGH1), true);
  } finally {
    cleanup(f);
  }
}

// Authority bytes changing after candidate derivation HOLD before rename.
{
  const f = makeFixture("authority-race", { journal: JOURNAL2 });
  try {
    const writer =
      testOnlyCreateBuyVoidCustodyLaunchHighWaterWriterV1(
        f.options,
        fixtureClassifier,
        () => privateFile(f.journalPath, JOURNAL3),
      );
    const result = writer.advance();
    assert.equal(result.ok, false);
    assert.equal(result.reason, "authority_changed_before_replace");
    assert.equal(result.operation_performed, false);
    assert.equal(readHigh(f).equals(HIGH1), true);
  } finally {
    cleanup(f);
  }
}

// Replacing the visible custody root cannot redirect the pinned publication.
{
  const f = makeFixture("root-race", { journal: JOURNAL2 });
  const moved = f.custodyRoot + "-moved";
  try {
    const writer =
      testOnlyCreateBuyVoidCustodyLaunchHighWaterWriterV1(
        f.options,
        fixtureClassifier,
        () => {
          fs.renameSync(f.custodyRoot, moved);
          privateDir(f.custodyRoot);
          privateFile(
            path.join(f.custodyRoot, HIGH_WATER_NAME),
            HIGH1,
          );
        },
      );
    const result = writer.advance();
    assert.equal(result.ok, false);
    assert.equal(result.operation_performed, false);
    assert.equal(readHigh(f).equals(HIGH1), true);
  } finally {
    fs.rmSync(moved, { recursive: true, force: true });
    cleanup(f);
  }
}

// A symlink custody root is never admitted.
{
  const f = makeFixture("symlink");
  try {
    const real = f.custodyRoot + "-real";
    fs.renameSync(f.custodyRoot, real);
    fs.symlinkSync(real, f.custodyRoot);
    const result =
      testOnlyCreateBuyVoidCustodyLaunchHighWaterWriterV1(
        f.options,
        fixtureClassifier,
      ).inspect();
    assert.equal(result.ok, false);
    assert.equal(result.operation_performed, false);
  } finally {
    cleanup(f);
  }
}

// If post-rename classification fails, the response must still disclose
// that the authoritative high-water changed.
{
  const f = makeFixture("post-hold", { journal: JOURNAL2 });
  try {
    const classifier = (observed) => {
      if (observed.custody_high_water_bytes?.equals(HIGH2)) {
        return held("synthetic_post_hold", 3, GEN2, TIP2, HIGH2);
      }
      return fixtureClassifier(observed);
    };
    const result =
      testOnlyCreateBuyVoidCustodyLaunchHighWaterWriterV1(
        f.options,
        classifier,
      ).advance();
    assert.equal(result.ok, false);
    assert.equal(result.reason, "post_advance_authority_not_ready");
    assert.equal(result.operation_performed, true);
    assert.equal(result.high_water_advance_performed, true);
    assert.equal(readHigh(f).equals(HIGH2), true);
  } finally {
    cleanup(f);
  }
}

// The production classifier is still fail-closed on this source generation;
// synthetic fixture authority cannot make production mutation ready.
{
  const f = makeFixture("production");
  try {
    const before = readHigh(f);
    const writer = createBuyVoidCustodyLaunchHighWaterWriterV1(f.options);
    const result = writer.advance();
    assert.equal(result.ok, false);
    assert.equal(result.operation_performed, false);
    assert.equal(readHigh(f).equals(before), true);
  } finally {
    cleanup(f);
  }
}

assert.equal(
  VOID_BUY_VOID_CUSTODY_LAUNCH_HIGH_WATER_WRITER_AUTHORITY_V1
    .bootstrap_write_enabled,
  false,
);
assert.equal(
  VOID_BUY_VOID_CUSTODY_LAUNCH_HIGH_WATER_WRITER_AUTHORITY_V1
    .runtime_integration,
  false,
);
assert.equal(
  VOID_BUY_VOID_CUSTODY_LAUNCH_HIGH_WATER_WRITER_AUTHORITY_V1
    .custody_reserve_method_enabled,
  false,
);
assert.equal(
  VOID_BUY_VOID_CUSTODY_LAUNCH_HIGH_WATER_WRITER_AUTHORITY_V1
    .custody_recover_method_enabled,
  false,
);
assert.equal(
  VOID_BUY_VOID_CUSTODY_LAUNCH_HIGH_WATER_WRITER_AUTHORITY_V1
    .production_allocation_mutation_ready,
  false,
);
assert.equal(
  VOID_BUY_VOID_CUSTODY_LAUNCH_HIGH_WATER_WRITER_AUTHORITY_V1
    .funds_movement,
  false,
);

console.log("VOID_BUY_VOID_CUSTODY_LAUNCH_HIGH_WATER_WRITER_V1_GREEN");
console.log("writer_source_blob=" + EXPECTED_WRITER_BLOB);
console.log("classifier_source_blob=" + EXPECTED_CLASSIFIER_BLOB);
console.log("current_idempotent=true");
console.log("advance_persisted=true");
console.log("advance_replay_idempotent=true");
console.log("bootstrap_write_performed=false");
console.log("malformed_candidate_rejected=true");
console.log("authority_change_before_replace_rejected=true");
console.log("root_replacement_rejected=true");
console.log("symlink_custody_root_rejected=true");
console.log("post_rename_failure_reports_mutation=true");
console.log("production_source_gate_HOLD=true");
console.log("runtime_integration=false");
console.log("custody_reserve_method_enabled=false");
console.log("custody_recover_method_enabled=false");
console.log("production_allocation_mutation_ready=false");
console.log("funds_moved=false");
