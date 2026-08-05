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

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-release-reason-idempotency-v1-"),
);
const binding: BuyVoidDeliverySubmissionBindingV1 = {
  marker: "VOID_BUY_VOID_NATIVE_DELIVERY_SIGN_BROADCAST_ADAPTER_V1",
  submission_idempotency_key: "1".repeat(64),
  attempt_id: "2".repeat(64),
  expected_transaction_hash: `0x${"3".repeat(64)}`,
  transaction_plan_fingerprint_sha256: "4".repeat(64),
};
const guard = createBuyVoidDeliverySubmissionGuardV1(
  root,
  () => 1_701_900_000_000,
);

assert.equal(
  VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_AUTHORITY_V1
    .release_reason_binding_immutable,
  true,
);
assert.equal(
  VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_AUTHORITY_V1
    .retry_safe_release_allowlist,
  true,
);
assert.equal(
  VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_AUTHORITY_V1
    .terminal_release_reclaim_forbidden,
  true,
);
assert.deepEqual(
  await guard.claim_submission_once(binding),
  { claimed: true },
);
assert.deepEqual(
  await guard.release_submission_claim(
    binding,
    "broadcast_definitively_not_submitted",
  ),
  { released: true },
);

const paths = buyVoidDeliverySubmissionGuardPathsV1(root);
const exactJournal = fs.readFileSync(paths.journal_file, "utf8");

assert.deepEqual(
  await guard.release_submission_claim(
    binding,
    " Broadcast Definitively Not Submitted ",
  ),
  { released: true },
);
assert.equal(
  fs.readFileSync(paths.journal_file, "utf8"),
  exactJournal,
  "an equivalent normalized reason must remain idempotent without appending",
);

const conflicting = await guard.release_submission_claim(
  binding,
  "operator_manual_reconciliation",
);
assert.deepEqual(conflicting, {
  released: false,
  reason: "submission_release_reason_conflict",
});
assert.equal(
  fs.readFileSync(paths.journal_file, "utf8"),
  exactJournal,
  "a conflicting reason must not mutate the durable journal",
);

const entries = readBuyVoidDeliverySubmissionGuardJournalV1(root);
assert.deepEqual(
  entries.map((entry) => entry.event),
  ["claim", "release"],
);
assert.equal(entries[1].event, "release");
if (entries[1].event !== "release") {
  throw new Error("expected release entry");
}
assert.equal(
  entries[1].release_reason,
  "broadcast_definitively_not_submitted",
);
assert.equal(fs.existsSync(paths.lock_file), false);

assert.deepEqual(
  await guard.claim_submission_once(binding),
  { claimed: true },
  "a closed retry-safe reason must permit only the exact binding to reclaim",
);

const terminalRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-terminal-release-v1-"),
);
const terminalBinding: BuyVoidDeliverySubmissionBindingV1 = {
  marker: "VOID_BUY_VOID_NATIVE_DELIVERY_SIGN_BROADCAST_ADAPTER_V1",
  submission_idempotency_key: "5".repeat(64),
  attempt_id: "6".repeat(64),
  expected_transaction_hash: `0x${"7".repeat(64)}`,
  transaction_plan_fingerprint_sha256: "8".repeat(64),
};
const terminalGuard = createBuyVoidDeliverySubmissionGuardV1(
  terminalRoot,
  () => 1_701_900_000_001,
);
assert.deepEqual(
  await terminalGuard.claim_submission_once(terminalBinding),
  { claimed: true },
);
assert.deepEqual(
  await terminalGuard.release_submission_claim(
    terminalBinding,
    "operator_manual_reconciliation",
  ),
  { released: true },
);

const terminalPaths =
  buyVoidDeliverySubmissionGuardPathsV1(terminalRoot);
const terminalJournal = fs.readFileSync(
  terminalPaths.journal_file,
  "utf8",
);
assert.deepEqual(
  await terminalGuard.claim_submission_once(terminalBinding),
  {
    claimed: false,
    reason: "submission_release_not_retry_safe",
    existing_transaction_hash:
      terminalBinding.expected_transaction_hash,
  },
);
assert.equal(
  fs.readFileSync(terminalPaths.journal_file, "utf8"),
  terminalJournal,
  "a terminal release must remain held without journal mutation",
);
assert.equal(fs.existsSync(terminalPaths.lock_file), false);

const terminalEntries =
  readBuyVoidDeliverySubmissionGuardJournalV1(terminalRoot);
const terminalLatest = terminalEntries.at(-1);
assert.ok(terminalLatest);
const forgedClaimWithoutHash = {
  schema: "void_buy_void_delivery_submission_guard_claim_v1",
  marker: "VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_V1",
  sequence: terminalEntries.length + 1,
  recorded_at_ms: terminalLatest.recorded_at_ms,
  previous_entry_hash_sha256:
    terminalLatest.entry_hash_sha256,
  event: "claim",
  adapter_marker: terminalBinding.marker,
  submission_idempotency_key:
    terminalBinding.submission_idempotency_key,
  attempt_id: terminalBinding.attempt_id,
  expected_transaction_hash:
    terminalBinding.expected_transaction_hash,
  transaction_plan_fingerprint_sha256:
    terminalBinding.transaction_plan_fingerprint_sha256,
};
const forgedClaim = {
  ...forgedClaimWithoutHash,
  entry_hash_sha256: crypto
    .createHash("sha256")
    .update(JSON.stringify(forgedClaimWithoutHash))
    .digest("hex"),
};
fs.appendFileSync(
  terminalPaths.journal_file,
  `${JSON.stringify(forgedClaim)}\n`,
  "utf8",
);
assert.throws(
  () =>
    readBuyVoidDeliverySubmissionGuardJournalV1(terminalRoot),
  /submission_guard_non_retryable_release_reclaimed/,
);

console.log("release_reason_binding_immutable=true");
console.log("equivalent_release_reason_idempotent=true");
console.log("conflicting_release_reason_rejected=true");
console.log("conflicting_release_reason_journal_unchanged=true");
console.log("retry_safe_release_reclaim_allowed=true");
console.log("terminal_release_reclaim_rejected=true");
console.log("terminal_release_journal_unchanged=true");
console.log("terminal_release_replay_rejected=true");
console.log(
  "VOID_BUY_VOID_DELIVERY_SUBMISSION_RELEASE_REASON_IDEMPOTENCY_V1_GREEN",
);
