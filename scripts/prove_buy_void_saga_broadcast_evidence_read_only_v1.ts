import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  readBuyVoidSagaBroadcastEvidenceStateV1,
} from "../src/economic/buy_void_saga_broadcast_evidence_journal_v1.js";

const ATTEMPT_ID = "a".repeat(64);
const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-broadcast-evidence-read-only-v1-"),
);
const evidenceRoot = path.join(
  root,
  "buy-void-saga-broadcast-evidence-v1",
);
const events = path.join(
  evidenceRoot,
  "attempts",
  ATTEMPT_ID,
  "events",
);

try {
  assert.equal(fs.existsSync(evidenceRoot), false);
  assert.equal(
    readBuyVoidSagaBroadcastEvidenceStateV1({
      root_dir: root,
      attempt_id: ATTEMPT_ID,
    }),
    null,
  );
  assert.equal(
    fs.existsSync(evidenceRoot),
    false,
    "read of missing evidence must not create evidence directories",
  );

  fs.mkdirSync(events, { recursive: true, mode: 0o700 });
  const modeBefore = fs.statSync(events).mode & 0o777;
  assert.equal(modeBefore, 0o700);
  assert.equal(
    readBuyVoidSagaBroadcastEvidenceStateV1({
      root_dir: root,
      attempt_id: ATTEMPT_ID,
    }),
    null,
  );
  assert.equal(
    fs.statSync(events).mode & 0o777,
    modeBefore,
    "read of valid evidence directories must not chmod them",
  );

  fs.chmodSync(events, 0o755);
  assert.throws(
    () =>
      readBuyVoidSagaBroadcastEvidenceStateV1({
        root_dir: root,
        attempt_id: ATTEMPT_ID,
      }),
    /broadcast_evidence_directory_must_be_private/,
  );
  assert.equal(
    fs.statSync(events).mode & 0o777,
    0o755,
    "read must fail closed instead of repairing unsafe permissions",
  );

  console.log("VOID_BUY_VOID_SAGA_BROADCAST_EVIDENCE_READ_ONLY_V1_GREEN");
  console.log("missing_read_created_directory=false");
  console.log("existing_read_chmod_performed=false");
  console.log("unsafe_directory_repaired_by_read=false");
  console.log("wallet_signer_transaction_money_authority=0");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
