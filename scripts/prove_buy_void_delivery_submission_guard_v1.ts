import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_AUTHORITY_V1,
  buyVoidDeliverySubmissionGuardPathsV1,
  createBuyVoidDeliverySubmissionGuardV1,
  readBuyVoidDeliverySubmissionGuardJournalV1,
  type BuyVoidDeliverySubmissionBindingV1,
} from "../src/economic/buy_void_delivery_submission_guard_v1.js";

function tempRoot(label: string): string {
  return fs.mkdtempSync(
    path.join(os.tmpdir(), `void-buy-${label}-`),
  );
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

const binding: BuyVoidDeliverySubmissionBindingV1 = {
  marker: "VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_ADAPTER_V1",
  submission_idempotency_key: "1".repeat(64),
  attempt_id: "2".repeat(64),
  expected_transaction_hash: `0x${"3".repeat(64)}`,
  transaction_plan_fingerprint_sha256: "4".repeat(64),
};

assert.equal(
  VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_AUTHORITY_V1
    .attempt_binding_immutable,
  true,
);
assert.equal(
  VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_AUTHORITY_V1
    .alternate_idempotency_key_replay_forbidden,
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

const root = tempRoot("delivery-submission-guard-v1");
let nowMs = 1_701_600_000_000;
const guard = createBuyVoidDeliverySubmissionGuardV1(
  root,
  () => nowMs++,
);

assert.deepEqual(
  await guard.claim_submission_once(binding),
  { claimed: true },
);

const duplicate = await guard.claim_submission_once(binding);
assert.equal(duplicate.claimed, false);
if (!("reason" in duplicate)) throw new Error("expected duplicate hold");
assert.equal(duplicate.reason, "submission_already_claimed");

const alternateKey = await guard.claim_submission_once({
  ...binding,
  submission_idempotency_key: "5".repeat(64),
});
assert.equal(alternateKey.claimed, false);
if (!("reason" in alternateKey)) {
  throw new Error("alternate key reopened the same attempt");
}
assert.equal(
  alternateKey.reason,
  "submission_attempt_binding_conflict",
);
assert.equal(
  alternateKey.existing_transaction_hash,
  binding.expected_transaction_hash,
);

const alteredAttemptBinding = await guard.claim_submission_once({
  ...binding,
  submission_idempotency_key: "6".repeat(64),
  expected_transaction_hash: `0x${"7".repeat(64)}`,
  transaction_plan_fingerprint_sha256: "8".repeat(64),
});
assert.equal(alteredAttemptBinding.claimed, false);
if (!("reason" in alteredAttemptBinding)) {
  throw new Error("altered attempt binding was accepted");
}
assert.equal(
  alteredAttemptBinding.reason,
  "submission_attempt_binding_conflict",
);

const keyReuse = await guard.claim_submission_once({
  ...binding,
  attempt_id: "9".repeat(64),
});
assert.equal(keyReuse.claimed, false);
if (!("reason" in keyReuse)) throw new Error("key reuse was accepted");
assert.equal(
  keyReuse.reason,
  "submission_idempotency_key_conflict",
);

assert.deepEqual(
  await guard.release_submission_claim(
    binding,
    "broadcast_definitively_not_submitted",
  ),
  { released: true },
);
assert.deepEqual(
  await guard.claim_submission_once(binding),
  { claimed: true },
);

const alternateAfterRelease = await guard.claim_submission_once({
  ...binding,
  submission_idempotency_key: "a".repeat(64),
});
assert.equal(alternateAfterRelease.claimed, false);
if (!("reason" in alternateAfterRelease)) {
  throw new Error("alternate key reopened released attempt binding");
}
assert.equal(
  alternateAfterRelease.reason,
  "submission_attempt_binding_conflict",
);

const entries = readBuyVoidDeliverySubmissionGuardJournalV1(root);
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

const otherAdapterRoot = tempRoot("delivery-submission-other-adapter-v1");
const otherAdapterGuard =
  createBuyVoidDeliverySubmissionGuardV1(otherAdapterRoot);
assert.deepEqual(
  await otherAdapterGuard.claim_submission_once(binding),
  { claimed: true },
);
assert.deepEqual(
  await otherAdapterGuard.claim_submission_once({
    ...binding,
    marker:
      "VOID_BUY_VOID_NATIVE_DELIVERY_SIGN_BROADCAST_ADAPTER_V1",
    submission_idempotency_key: "b".repeat(64),
  }),
  { claimed: true },
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
    submission_idempotency_key: "c".repeat(64),
  }),
  /submission_guard_lock_exists/,
);
assert.equal(
  fs.readFileSync(paths.lock_file, "utf8"),
  "operator-lock\n",
);
fs.unlinkSync(paths.lock_file);

const forgedRoot = tempRoot("delivery-submission-forged-v1");
const forgedGuard = createBuyVoidDeliverySubmissionGuardV1(
  forgedRoot,
  () => 1_701_700_000_000,
);
assert.deepEqual(
  await forgedGuard.claim_submission_once(binding),
  { claimed: true },
);
const forgedPaths =
  buyVoidDeliverySubmissionGuardPathsV1(forgedRoot);
const [first] =
  readBuyVoidDeliverySubmissionGuardJournalV1(forgedRoot);
const forgedWithoutHash = {
  schema: "void_buy_void_delivery_submission_guard_claim_v1",
  marker: "VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_V1",
  sequence: 2,
  recorded_at_ms: 1_701_700_000_001,
  previous_entry_hash_sha256: first.entry_hash_sha256,
  event: "claim",
  adapter_marker: binding.marker,
  submission_idempotency_key: "d".repeat(64),
  attempt_id: binding.attempt_id,
  expected_transaction_hash: binding.expected_transaction_hash,
  transaction_plan_fingerprint_sha256:
    binding.transaction_plan_fingerprint_sha256,
};
const forged = {
  ...forgedWithoutHash,
  entry_hash_sha256: sha256(JSON.stringify(forgedWithoutHash)),
};
fs.appendFileSync(
  forgedPaths.journal_file,
  `${JSON.stringify(forged)}\n`,
  "utf8",
);
assert.throws(
  () => readBuyVoidDeliverySubmissionGuardJournalV1(forgedRoot),
  /submission_guard_attempt_binding_mismatch/,
);

const journalText = fs.readFileSync(paths.journal_file, "utf8");
for (const forbidden of [
  "private_key",
  "mnemonic",
  "raw_signed_transaction",
  "rpc_url",
]) {
  assert.equal(journalText.includes(forbidden), false);
}

console.log("attempt_binding_immutable=true");
console.log("alternate_idempotency_key_replay_rejected=true");
console.log("binding_conflicts_rejected=true");
console.log(
  "VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_V1_GREEN",
);
