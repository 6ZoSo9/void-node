// POSITIVE REGRESSION against the fixed read-only inspector. The earlier
// sibling #2710 remains immutable negative evidence for the unfixed bytes.
// This test uses ONLY OS-temp fixtures and the same real writer methods.
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
  "8d44f6651b9210f7cb1a5ac3f895ce18d0890fb5";
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


// The inspector must not unlink an unrelated, possibly in-flight temp,
 // regardless of its correct private canonical name and mode.
{
  const f=makeFixture("inspect-temp-mutation");
  try {
    const tempName="."+HIGH_WATER_NAME+".tmp-"+process.pid+"-"+
      crypto.randomBytes(8).toString("hex");
    const tempPath=path.join(f.custodyRoot,tempName);
    privateFile(tempPath,HIGH2);
    assert.equal(fs.existsSync(tempPath),true);
    const reader=testOnlyCreateBuyVoidCustodyLaunchHighWaterWriterV1(
      f.options,fixtureClassifier
    );
    // Fail immediately if a supposedly read-only call attempts a filesystem
    // delete or fsync (including harmless-looking directory cleanup).
    const originalUnlink=fs.unlinkSync,originalFsync=fs.fsyncSync;
    let decision;
    try {
      fs.unlinkSync=()=>{throw Error("inspect_attempted_unlink");};
      fs.fsyncSync=()=>{throw Error("inspect_attempted_fsync");};
      decision=reader.inspect();
    } finally {
      fs.unlinkSync=originalUnlink;
      fs.fsyncSync=originalFsync;
    }
    assert.equal(decision.ok,true);
    assert.equal(decision.status,"current");
    assert.equal(decision.operation_performed,false);
    assert.equal(decision.high_water_advance_performed,false);
    assert.equal(fs.existsSync(tempPath),true,
      "inspection must not delete another writer's private temp");
    assert.equal(fs.readFileSync(tempPath).equals(HIGH2),true);
    assert.equal(readHigh(f).equals(HIGH1),true);
    console.log("READ_ONLY_INSPECT_RETAINS_PRIVATE_TEMP_POSITIVE_GREEN");
    console.log("inspect_unlink_and_fsync_forbidden=true");
  } finally {cleanup(f);}
}
// Interleave a second inspect after the first writer has revalidated
// authority but before renaming its fsynced temp. It MUST NOT interrupt
// the owning writer. Also preserve a separate unrelated private orphan.
{
  const f=makeFixture("interleaved-inspect", {journal:JOURNAL2});
  const originalRename=fs.renameSync;
  let injected=false,observed=null,preservedBeforeRename=false;
  try {
    const unrelatedName="."+HIGH_WATER_NAME+".tmp-"+process.pid+"-"+
      crypto.randomBytes(8).toString("hex");
    const unrelated=path.join(f.custodyRoot,unrelatedName);
    privateFile(unrelated,HIGH2);
    const inspectWriter=testOnlyCreateBuyVoidCustodyLaunchHighWaterWriterV1(
      f.options,fixtureClassifier
    );
    const advancingWriter=testOnlyCreateBuyVoidCustodyLaunchHighWaterWriterV1(
      f.options,fixtureClassifier
    );
    fs.renameSync=function(source,destination,...args){
      const from=String(source),to=String(destination);
      if(!injected &&
         from.includes("/."+HIGH_WATER_NAME+".tmp-") &&
         to.endsWith("/"+HIGH_WATER_NAME)) {
        injected=true;
        assert.equal(fs.existsSync(from),true);
        observed=inspectWriter.inspect();
        preservedBeforeRename=fs.existsSync(from);
        assert.equal(fs.readFileSync(from).equals(HIGH2),true);
      }
      return originalRename.call(fs,source,destination,...args);
    };
    const advance=advancingWriter.advance();
    assert.equal(injected,true);
    assert.equal(observed?.ok,false);
    assert.equal(observed?.operation_performed,false);
    assert.equal(observed?.high_water_advance_performed,false);
    assert.equal(preservedBeforeRename,true);
    assert.equal(advance.ok,true);
    assert.equal(advance.status,"advanced");
    assert.equal(advance.operation_performed,true);
    assert.equal(readHigh(f).equals(HIGH2),true);
    assert.equal(fs.existsSync(unrelated),true);
    assert.equal(fs.readFileSync(unrelated).equals(HIGH2),true);
    console.log("INSPECT_DOES_NOT_INTERRUPT_ACTIVE_WRITER_POSITIVE_GREEN");
    console.log("injected_after_pre_replace_revalidation=true");
    console.log("inspector_claimed_mutation_false=true");
    console.log("inspector_preserved_fsynced_active_temp=true");
    console.log("advance_persisted_high_water=true");
    console.log("unowned_temp_survives_advance=true");
  } finally {
    fs.renameSync=originalRename;
    cleanup(f);
  }
}
console.log("VOID_BUY_VOID_CUSTODY_INSPECT_NONMUTATING_V1_GREEN");
console.log("cross_process_exclusive_writer_fence_verified=false");
console.log("real_customer_or_custody_data_touched=false");
console.log("mounted_runtime_or_signer_used=false");
console.log("production_allocation_mutation_ready=false");
console.log("funds_moved=false");
