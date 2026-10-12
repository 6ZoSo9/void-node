import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  persistTerminalCloseoutPlanV1,
  readTerminalCloseoutPlanV1,
} from "../src/economic/buy_void_saga_terminal_closeout_artifacts_v1.js";

const MARKER = "VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_PATH_SAFETY_V1_GREEN";
const MANAGED_ROOT = "buy-void-saga-terminal-closeout-v1";
const ATTEMPT_ID = "a".repeat(64);

const base = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-terminal-closeout-path-safety-v1-"),
);

try {
  const readRoot = path.join(base, "read-root");
  fs.mkdirSync(readRoot, { mode: 0o700 });
  const missing = readTerminalCloseoutPlanV1({
    root_dir: readRoot,
    attempt_id: ATTEMPT_ID,
  });
  assert.equal(missing, null);
  assert.equal(fs.existsSync(path.join(readRoot, MANAGED_ROOT)), false);

  const unsafeRoot = path.join(base, "unsafe-root");
  const unsafeManaged = path.join(unsafeRoot, MANAGED_ROOT);
  fs.mkdirSync(unsafeManaged, { recursive: true, mode: 0o700 });
  fs.chmodSync(unsafeManaged, 0o755);
  assert.throws(
    () => readTerminalCloseoutPlanV1({
      root_dir: unsafeRoot,
      attempt_id: ATTEMPT_ID,
    }),
    /terminal_closeout_root_must_be_private/,
  );
  assert.equal(fs.lstatSync(unsafeManaged).mode & 0o777, 0o755);
  assert.equal(fs.existsSync(path.join(unsafeManaged, "attempts")), false);

  const outside = path.join(base, "outside");
  const linkedRoot = path.join(base, "linked-root");
  fs.mkdirSync(outside, { mode: 0o700 });
  fs.symlinkSync(outside, linkedRoot, "dir");

  const fakePlan = {
    attempt_id: ATTEMPT_ID,
    closeout_id: "b".repeat(64),
    plan_fingerprint_sha256: "c".repeat(64),
    canonical_confirmed_state_id: "d".repeat(64),
    canonical_confirmed_state_fingerprint: "e".repeat(64),
  } as any;

  assert.throws(
    () => persistTerminalCloseoutPlanV1(linkedRoot, fakePlan),
    /terminal_closeout_directory_symlink_component_forbidden/,
  );
  assert.equal(fs.existsSync(path.join(outside, MANAGED_ROOT)), false);

  process.stdout.write(`${MARKER}\n`);
  process.stdout.write("missing_plan_read_created_directory=false\n");
  process.stdout.write("unsafe_plan_read_permission_repair=false\n");
  process.stdout.write("symlink_root_write_escape=false\n");
  process.stdout.write("wallet_signer_transaction_money_authority=0\n");
} finally {
  fs.rmSync(base, { recursive: true, force: true });
}
