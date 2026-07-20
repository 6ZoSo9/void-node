import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_AUTHORITY_V1,
  buyVoidDeliverySubmissionGuardPathsV1,
  createBuyVoidDeliverySubmissionGuardV1,
  readBuyVoidDeliverySubmissionGuardJournalV1,
} from "../src/economic/buy_void_delivery_submission_guard_v1.js";
import type {
  BuyVoidDeliverySubmissionBindingV1,
} from "../src/economic/buy_void_delivery_sign_broadcast_adapter_v1.js";

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-delivery-submission-guard-v1-"),
);
let nowMs = 1_701_600_000_000;
const guard = createBuyVoidDeliverySubmissionGuardV1(
  root,
  () => nowMs++,
);

const binding: BuyVoidDeliverySubmissionBindingV1 = {
  marker: "VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_ADAPTER_V1",
  submission_idempotency_key: "1".repeat(64),
  attempt_id: "2".repeat(64),
  expected_transaction_hash: `0x${"3".repeat(64)}`,
  transaction_plan_fingerprint_sha256: "4".repeat(64),
};

assert.equal(
  VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_AUTHORITY_V1
    .append_only_journal,
  true,
);
assert.equal(
  VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_AUTHORITY_V1
    .automatic_stale_lock_removal,
  false,
);
assert.equal(
  VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_AUTHORITY_V1.rpc_call,
  false,
);
assert.equal(
  VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_AUTHORITY_V1.signing,
  false,
);
assert.equal(
  VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_AUTHORITY_V1
    .transaction_broadcast,
  false,
);
assert.equal(
  VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_AUTHORITY_V1.money_movement,
  false,
);

const first = await guard.claim_submission_once(binding);
assert.deepEqual(first, { claimed: true });

const duplicate = await guard.claim_submission_once(binding);
assert.equal(duplicate.claimed, false);
if (duplicate.claimed) throw new Error("expected duplicate hold");
assert.equal(duplicate.reason, "submission_already_claimed");
assert.equal(
  duplicate.existing_transaction_hash,
  binding.expected_transaction_hash,
);

const conflict = await guard.claim_submission_once({
  ...binding,
  expected_transaction_hash: `0x${"5".repeat(64)}`,
});
assert.equal(conflict.claimed, false);
if (conflict.claimed) throw new Error("expected conflict hold");
assert.equal(
  conflict.reason,
  "submission_idempotency_key_conflict",
);

const released = await guard.release_submission_claim(
  binding,
  "broadcast_definitively_not_submitted",
);
assert.deepEqual(released, { released: true });

const duplicateRelease = await guard.release_submission_claim(
  binding,
  "broadcast_definitively_not_submitted",
);
assert.deepEqual(duplicateRelease, { released: true });

const retryClaim = await guard.claim_submission_once(binding);
assert.deepEqual(retryClaim, { claimed: true });

const entries = readBuyVoidDeliverySubmissionGuardJournalV1(root);
assert.equal(entries.length, 3);
assert.deepEqual(
  entries.map((entry) => entry.event),
  ["claim", "release", "claim"],
);
assert.deepEqual(
  entries.map((entry) => entry.sequence),
  [1, 2, 3],
);
assert.equal(
  entries[0].previous_entry_hash_sha256,
  "0".repeat(64),
);
assert.equal(
  entries[1].previous_entry_hash_sha256,
  entries[0].entry_hash_sha256,
);
assert.equal(
  entries[2].previous_entry_hash_sha256,
  entries[1].entry_hash_sha256,
);

const paths = buyVoidDeliverySubmissionGuardPathsV1(root);
assert.equal(fs.statSync(paths.state_dir).mode & 0o777, 0o700);
assert.equal(fs.statSync(paths.journal_file).mode & 0o777, 0o600);
assert.equal(fs.existsSync(paths.lock_file), false);

fs.writeFileSync(paths.lock_file, "operator-lock\n", {
  mode: 0o600,
});
await assert.rejects(
  guard.claim_submission_once({
    ...binding,
    submission_idempotency_key: "6".repeat(64),
  }),
  /submission_guard_lock_exists/,
);
assert.equal(
  fs.readFileSync(paths.lock_file, "utf8"),
  "operator-lock\n",
);
fs.unlinkSync(paths.lock_file);

const journalText = fs.readFileSync(paths.journal_file, "utf8");
for (const forbidden of [
  "private_key",
  "mnemonic",
  "raw_signed_transaction",
  "rpc_url",
]) {
  assert.equal(journalText.includes(forbidden), false);
}

console.log(
  "VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_V1_GREEN",
);
