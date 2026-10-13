import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { types as utilTypes } from "node:util";
import ts from "typescript";
import {
  immutableJsonSnapshotV1,
} from "./buy_void_web_payment_cross_uid_lock_writer_proof_snapshot_v1.mjs";
import {
  createWebCrossUidWriterInputV1,
} from "./buy_void_web_payment_cross_uid_lock_writer_proof_input_v1.mjs";

const VALIDATION =
  "src/economic/buy_void_web_payment_cross_uid_lock_validation_v1.mjs";
const IMPL =
  "src/economic/buy_void_web_payment_cross_uid_lock_writer_impl_v1.mjs";
const LOCK_MARKER =
  "VOID_BUY_VOID_CROSS_UID_CAPACITY_EXCLUSIVE_LOCK_V1";
const LEDGER_ROOT = "/var/lib/void-allocation-ledger-v1";
const HIGH_WATER_ROOT = "/var/lib/void-allocation-custody-v1";

function executable(path) {
  const code = fs.readFileSync(path, "utf8");
  const ast = ts.createSourceFile(
    path,
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  assert.equal(ast.parseDiagnostics.length, 0);
  return ast.statements
    .filter(statement =>
      !ts.isImportDeclaration(statement) &&
      !ts.isExportDeclaration(statement))
    .map(statement => statement.getText(ast).replace(/^export\s+/u, ""))
    .join("\n");
}

export function createWebCrossUidWriterHarnessV1() {
  let lockHeld = false;
  let lockCount = 0;
  let planCount = 0;
  let dispatchCount = 0;
  let dispatchMode = "ok";
  let lockMode = "ok";
  let lockPause = null;
  let lastDispatchInput = null;

  const sandbox = {
    console,
    utilTypes,
    process: { platform: "linux", getuid: () => 2102 },
    VOID_BUY_VOID_CROSS_UID_CAPACITY_EXCLUSIVE_LOCK_V1: LOCK_MARKER,
    VOID_BUY_VOID_ALLOCATION_LEDGER_ROOT_V1: LEDGER_ROOT,
    VOID_BUY_VOID_ALLOCATION_HIGH_WATER_ROOT_V1: HIGH_WATER_ROOT,
    planBuyVoidOperatorAllocationDispatchV1(input) {
      planCount += 1;
      assert.equal(lockHeld, false, "planner must run before lock wait");
      assert.equal(input.allocation_ledger_root, LEDGER_ROOT);
      assert.equal(input.allocation_high_water_root, HIGH_WATER_ROOT);
      const event = immutableJsonSnapshotV1(input.event);
      const request = immutableJsonSnapshotV1(input.request);
      if (event.operator_status !== "payment_verified" ||
          event.request_id !== request.request_id) {
        throw Error("dispatch_plan_not_verified_payment");
      }
      return Object.freeze({
        kind: "verified_payment_allocation_handoff",
        event,
        request,
        request_dir: input.request_dir,
        allocation_ledger_root: LEDGER_ROOT,
        allocation_high_water_root: HIGH_WATER_ROOT,
        with_launch_authority_mutation: input.with_launch_authority_mutation,
        read_sale_state: input.read_sale_state,
      });
    },
    async dispatchBuyVoidOperatorEventWithAllocationRequiredV1(input) {
      dispatchCount += 1;
      assert.equal(lockHeld, true, "dispatch must run while lock held");
      assert.equal(input.allocation_ledger_root, LEDGER_ROOT);
      assert.equal(input.allocation_high_water_root, HIGH_WATER_ROOT);
      lastDispatchInput = input;
      if (dispatchMode === "throw") throw Error("synthetic_dispatch_ambiguity");
      return Object.freeze({ ok: true, marker: "synthetic_allocation_handoff" });
    },
    async withBuyVoidCrossUidCapacityExclusiveLockV1(config, callback) {
      lockCount += 1;
      assert.equal(config.web_uid, 2102);
      if (lockPause) {
        const pause = lockPause;
        lockPause = null;
        pause.entered.resolve();
        await pause.release.promise;
      }
      if (lockMode === "fake") {
        return Object.freeze({
          marker: LOCK_MARKER,
          ok: true,
          status: "completed",
          participant_role: "custody",
          participant_uid: 2101,
          web_uid: 2102,
          custody_uid: 2101,
          shared_gid: 2103,
          exclusive_critical_section_completed: true,
          lock_release_fsynced: true,
          callback_failure_retains_lock: true,
          result: { ok: true },
        });
      }
      lockHeld = true;
      let result;
      try {
        result = await callback();
      } catch (cause) {
        lockHeld = false;
        throw new Error(
          "cross_uid_capacity_lock_callback_failed_lock_retained",
          { cause },
        );
      }
      lockHeld = false;
      return Object.freeze({
        marker: LOCK_MARKER,
        ok: true,
        status: "completed",
        participant_role: "web",
        participant_uid: 2102,
        web_uid: 2102,
        custody_uid: 2101,
        shared_gid: 2103,
        exclusive_critical_section_completed: true,
        lock_release_fsynced: true,
        callback_failure_retains_lock: true,
        result,
      });
    },
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(
    executable(VALIDATION) + "\n" + executable(IMPL) +
      "\nthis.invoke = writeBuyVoidPaymentUnderCrossUidLockCandidateV1;" +
      "\nthis.contract = VOID_BUY_VOID_WEB_PAYMENT_CROSS_UID_LOCK_WRITER_AUTHORITY_V1;",
    context,
    { timeout: 1000 },
  );


  return Object.freeze({
    context,
    input: () => createWebCrossUidWriterInputV1(context),
    invoke: value => context.invoke(value),
    pauseLock: pause => { lockPause = pause; },
    setDispatchMode: mode => { dispatchMode = mode; },
    setLockMode: mode => { lockMode = mode; },
    state: () => Object.freeze({
      lock_count: lockCount,
      plan_count: planCount,
      dispatch_count: dispatchCount,
      last_dispatch_input: lastDispatchInput,
    }),
  });
}
