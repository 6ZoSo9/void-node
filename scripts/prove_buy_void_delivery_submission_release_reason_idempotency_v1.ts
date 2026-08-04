import assert from "node:assert/strict";
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

console.log("release_reason_binding_immutable=true");
console.log("equivalent_release_reason_idempotent=true");
console.log("conflicting_release_reason_rejected=true");
console.log("conflicting_release_reason_journal_unchanged=true");
console.log(
  "VOID_BUY_VOID_DELIVERY_SUBMISSION_RELEASE_REASON_IDEMPOTENCY_V1_GREEN",
);
