#!/usr/bin/env node
// Synthetic private OS-temp proof. No installed custody root or payment state.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  VOID_BUY_VOID_CUSTODY_LOCKED_ADVANCE_AUTHORITY_V1 as AUTH,
  testOnlyCreateBuyVoidCustodyLockedAdvanceV1 as createTest,
} from "../src/economic/buy_void_custody_locked_advance_v1.mjs";

assert.equal(process.platform, "linux");
assert.ok(typeof process.getuid === "function" && process.getuid() > 0);
assert.equal(AUTH.source_only_unmounted, true);
assert.equal(AUTH.production_allocation_mutation_ready, false);
assert.equal(AUTH.uncertain_release_recovery_qualified, false);

const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-locked-advance-"));
const custody = path.join(root, "custody");
const lockName = ".void-buy-custody-high-water-exclusive-v1.lock";
const lockPath = path.join(custody, lockName);
const config = Object.freeze({
  generation_journal_path: path.join(root, "journal"),
  activation_receipt_path: path.join(root, "receipt"),
  custody_root: custody,
});
const inspection = Object.freeze({
  ok: true, status: "current", operation_performed: false,
});
const stub = (advance) => ({
  inspect() { return inspection; },
  advance,
});
let nestedWriterCalls = 0;
try {
  fs.chmodSync(root, 0o700);
  fs.mkdirSync(custody, { mode: 0o700 });
  fs.chmodSync(custody, 0o700);
  const contender = createTest(config, stub(() => {
    nestedWriterCalls += 1;
    throw new Error("contending writer must never execute");
  }));
  let writerCalls = 0;
  const composed = createTest(config, stub(() => {
    writerCalls += 1;
    assert.equal(fs.statSync(lockPath).isDirectory(), true);
    const collision = contender.advance();
    assert.equal(collision.ok, false);
    assert.equal(collision.status, "held");
    assert.equal(collision.operation_performed, false);
    assert.equal(collision.exclusive_lock_release_fsynced, false);
    return Object.freeze({
      ok: true, status: "advanced", operation_performed: true,
    });
  }));
  assert.equal(composed.inspect(), inspection);
  assert.equal(fs.existsSync(lockPath), false);
  const completed = composed.advance();
  assert.equal(completed.ok, true);
  assert.equal(completed.status, "advanced");
  assert.equal(completed.operation_performed, true);
  assert.equal(completed.exclusive_lock_release_fsynced, true);
  assert.equal(completed.production_allocation_mutation_ready, false);
  assert.equal(writerCalls, 1);
  assert.equal(nestedWriterCalls, 0);
  assert.equal(fs.existsSync(lockPath), false);
  console.log("composed_writer_runs_under_private_exclusion=true");
  console.log("nested_contention_rejected_before_writer=true");

  const rejected = createTest(config, stub(() => Object.freeze({
    ok: false, status: "held", operation_performed: true,
  }))).advance();
  assert.equal(rejected.ok, false);
  assert.equal(rejected.operation_performed, true);
  assert.equal(rejected.mutation_truth_known, true);
  assert.equal(fs.statSync(lockPath).isDirectory(), true);
  assert.equal(composed.inspect(), inspection);
  assert.equal(fs.statSync(lockPath).isDirectory(), true);
  assert.equal(contender.advance().operation_performed, false);
  assert.equal(nestedWriterCalls, 0);
  fs.rmdirSync(lockPath); // Fixture-only recovery, not exposed to production.
  console.log("writer_held_mutation_truth_preserved=true");
  console.log("failed_callback_lock_retained=true");
  console.log("inspect_does_not_reap_stale_lock=true");

  const thrown = createTest(config, stub(() => {
    throw new Error("synthetic uncertain mutation");
  })).advance();
  assert.equal(thrown.ok, false);
  assert.equal(thrown.operation_performed, null);
  assert.equal(thrown.mutation_truth_known, false);
  assert.equal(fs.statSync(lockPath).isDirectory(), true);
  fs.rmdirSync(lockPath); // Fixture-only cleanup.
  console.log("unknown_mutation_never_reported_as_false=true");

  let getterCalls = 0;
  const accessorConfig = {
    activation_receipt_path: config.activation_receipt_path,
    generation_journal_path: config.generation_journal_path,
  };
  Object.defineProperty(accessorConfig, "custody_root", {
    enumerable: true,
    get() { getterCalls += 1; return custody; },
  });
  assert.throws(() => createTest(accessorConfig, stub(() => inspection)),
    /custody_locked_advance_config_invalid/u);
  assert.equal(getterCalls, 0);
  const proxyConfig = new Proxy(config, {
    ownKeys() { getterCalls += 1; throw Error("unexpected trap"); },
  });
  assert.throws(() => createTest(proxyConfig, stub(() => inspection)),
    /custody_locked_advance_config_invalid/u);
  assert.equal(getterCalls, 0);
  console.log("executable_config_surfaces_rejected_without_callbacks=true");

  assert.equal(AUTH.production_uid_path_and_ipc_qualified, false);
  assert.equal(AUTH.payment_allocation_runtime_mounted, false);
  assert.equal(AUTH.presale_activation, false);
  assert.equal(AUTH.funds_movement, false);
  console.log("production_authority_false=true");
  console.log("VOID_BUY_VOID_CUSTODY_LOCKED_ADVANCE_SYNTHETIC_GREEN");
} finally {
  fs.rmSync(root, { recursive: true, force: true }); // OS-temp fixture only
}
