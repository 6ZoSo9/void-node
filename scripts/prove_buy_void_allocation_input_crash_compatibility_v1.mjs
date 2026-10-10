#!/usr/bin/env node
// Source-only compatibility edition for #2720. The frozen V1 file stays intact
// and must still reject this ledger. Reuse its authenticated scenario bytes,
// not another copied crash suite or a caller-selected test/source generation.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FROZEN_PATH = "scripts/prove_buy_void_payment_allocation_hypothetical_crash_matrix_v1.mjs";
const FROZEN_BLOB = "1a8db260a134ad438366d5b7660f926768c98a79";
const LEDGER_PATH = "src/economic/buy_void_allocation_reservation_ledger_v1.ts";
const OLD_LEDGER = "c3fc204710a9189723651cfeb6ffc52b1aa049db";
const CURRENT_LEDGER = "66617a89d5ad9f81b5a21d98cca55fcda6902a80";
const MARKER = "VOID_BUY_VOID_ALLOCATION_INPUT_CRASH_COMPATIBILITY_V1";
const DERIVED_BLOB = "5c0fec10d2aa7cbdebd88eb25106a13311d6858a";
const SOURCE_BLOBS = Object.freeze({
  [LEDGER_PATH]: CURRENT_LEDGER,
  "src/economic/buy_void_verified_allocation_replay_binding_v1.ts":
    "970e686cd96b43d496c44acb4ff343a5e61e26c5",
  "src/economic/buy_void_allocation_reservation_high_water_v1.ts":
    "9383c94cf848efb9a0112f1b741df4e10f790ac6",
  "src/economic/buy_void_allocation_reservation_publication_protocol_v1.ts":
    "b0fe98427a7bdf1c39c41fb64e94f3f142d6636b",
});
const FALSE_FIELDS = Object.freeze([
  "proposed_allocation_mutated", "actual_durable_payment_fsync_verified",
  "verified_capacity_and_request_locks_held", "independently_proven_original_request",
  "protected_high_water_custody_verified", "allocation_publication_integrated",
  "exactly_once_allocation_production_ready", "signer_or_wallet_access",
  "production_source_finality_authority_ready", "presale_activation", "funds_moved",
]);
function blob(bytes) {
  return crypto.createHash("sha1")
    .update("blob " + bytes.length + "\0").update(bytes).digest("hex");
}
function readSource(relative) {
  // This is a CI checkout reader, not an installed-host attestation primitive.
  const fd = fs.openSync(path.join(ROOT, relative), fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const before = fs.fstatSync(fd);
    assert.ok(before.isFile() && before.size > 0 && before.size < 128 * 1024,
      "source_size_or_type:" + relative);
    const bytes = Buffer.alloc(before.size + 1);
    let length = 0;
    while (length < bytes.length) {
      const n = fs.readSync(fd, bytes, length, bytes.length - length, length);
      if (n === 0) break;
      length += n;
    }
    assert.equal(length, before.size, "source_changed_during_read:" + relative);
    return bytes.subarray(0, length);
  } finally {
    fs.closeSync(fd);
  }
}
function replaceOnce(source, oldText, newText) {
  assert.equal(source.split(oldText).length, 2, "compatibility_edit_cardinality");
  return source.replace(oldText, newText);
}
function run(bytes) {
  // Node stdin ESM resolves relative imports and import.meta.url from scripts/.
  // Execute retained bytes, not a verified pathname reopened for execution.
  const result = spawnSync(process.execPath, ["--input-type=module"], {
    input: bytes, cwd: path.join(ROOT, "scripts"), encoding: "utf8",
    env: { LANG: "C.UTF-8", TZ: "UTC" },
    timeout: 15000, killSignal: "SIGKILL", maxBuffer: 256 * 1024,
  });
  assert.equal(result.error, undefined, "compatibility_child_execution_failed");
  assert.equal(result.signal, null, "compatibility_child_interrupted");
  return result;
}

assert.equal(process.argv.length, 2, "no_caller_selected_generation_or_mode");
const frozenBytes = readSource(FROZEN_PATH);
assert.equal(blob(frozenBytes), FROZEN_BLOB, "frozen_v1_proof_changed");
for (const [relative, expected] of Object.entries(SOURCE_BLOBS)) {
  assert.equal(blob(readSource(relative)), expected, "current_source_drift:" + relative);
}
const historical = run(frozenBytes);
assert.equal(historical.status, 1, "frozen_v1_must_refuse_current_ledger");
assert.equal(historical.stdout, "", "frozen_v1_must_not_emit_success_report");
assert.ok(historical.stderr.includes("AssertionError [ERR_ASSERTION]: reviewed_source_blob_drift:" + LEDGER_PATH),
  "unexpected_historical_failure");
assert.ok(historical.stderr.includes("+ '" + CURRENT_LEDGER + "'") &&
  historical.stderr.includes("- '" + OLD_LEDGER + "'"), "wrong_historical_generation_pair");

// Exactly four compatibility edits. No original behavioral assertion is removed.
// The old sell-out fixture misspelled a field: with the closed input schema that
// would HOLD for malformed input, not insufficient inventory. Correct it and
// require the exact inventory error. All other fixtures and assertions survive.
let edition = replaceOnce(frozenBytes.toString("utf8"), OLD_LEDGER, CURRENT_LEDGER);
edition = replaceOnce(edition,
  "VOID_BUY_VOID_PAYMENT_ALLOCATION_HYPOTHETICAL_CRASH_MATRIX_V1", MARKER);
edition = replaceOnce(edition,
  'payment_verified_receipt_ref:receipt("5")', 'verified_payment_receipt_ref:receipt("5")');
edition = replaceOnce(edition, 'assert.equal(excess.status,"held");',
  'assert.equal(excess.status,"held");\n' +
  'assert.equal(excess.reason,"allocation_reservation_remaining_inventory_insufficient");');
const editionBytes = Buffer.from(edition, "utf8");
assert.equal(blob(editionBytes), DERIVED_BLOB, "compatibility_edition_bytes_changed");
const current = run(editionBytes);
assert.equal(current.status, 0, "current_crash_compatibility_failed:\n" + current.stderr);
const report = JSON.parse(current.stdout);
assert.equal(report.marker, MARKER);
assert.equal(report.source_only, true);
assert.deepEqual(report.observed_publication_phases, ["intent_only", "ledger_committed", "complete"]);
assert.equal(report.next_allocation_record_count, 1);
assert.equal(report.inventory_units_after_first, "9999994");
assert.equal(report.inventory_units_after_synthetic_sellout, "0");
for (const key of ["exact_replay_idempotent", "conflicting_identity_rejected", "malformed_or_orphan_history_rejected"]) {
  assert.equal(report[key], true, key);
}
for (const key of FALSE_FIELDS) assert.equal(report[key], false, key);
// A distinct receipt binds this compatibility edition, not the archived V1 ID.
process.stdout.write(JSON.stringify({
  ...report,
  historical_v1_proof_git_blob: FROZEN_BLOB,
  historical_v1_refused_current_ledger: true,
  compatibility_edition_git_blob: DERIVED_BLOB,
  current_allocation_source_git_blob: CURRENT_LEDGER,
  insufficient_inventory_reason_checked: true,
}, null, 2) + "\n");
