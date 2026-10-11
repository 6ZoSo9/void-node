#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import vm from "node:vm";
import { types as utilTypes } from "node:util";
import ts from "typescript";

const SOURCE =
  "src/economic/buy_void_web_payment_cross_uid_failure_binding_v1.mjs";
const LOCK_MARKER =
  "VOID_BUY_VOID_CROSS_UID_CAPACITY_EXCLUSIVE_LOCK_V1";
const RECON_MARKER =
  "VOID_BUY_VOID_CROSS_UID_FAILURE_RECONCILIATION_V1";
const CANDIDATE_MARKER =
  "VOID_BUY_VOID_WEB_PAYMENT_CROSS_UID_FAILURE_BINDING_V1";
const HANDOFF_MARKER =
  "VOID_BUY_VOID_VERIFIED_PAYMENT_ALLOCATION_HANDOFF_V1";
const handoffAuthority = Object.freeze({
  source_contract: true,
  durable_payment_verified_before_allocation: true,
  runtime_integration: false,
  production_gate_ready: false,
  funds_movement: false,
});
const LEDGER_ROOT = "/var/lib/void-allocation-ledger-v1";
const HIGH_WATER_ROOT = "/var/lib/void-allocation-custody-v1";
const REQUEST_DIR = "/tmp/void-buy-failure-binding-synthetic";
const REQUEST_ID = "buyvoid_abc_1234abcd";

const sourceText = fs.readFileSync(SOURCE, "utf8");
for (const required of [
  "withBuyVoidCrossUidCapacityExclusiveLockV1",
  "dispatchBuyVoidOperatorEventWithAllocationRequiredV1",
  "classifyBuyVoidCrossUidFailureReconciliationV1",
  "checkedVerifiedPaymentDispatchPlanV1",
  "buy_void_web_cross_uid_dispatch_failed_reconciled_lock_retained",
]) {
  assert.match(sourceText, new RegExp(required, "u"));
}
assert.doesNotMatch(
  sourceText,
  /writeBuyVoidPaymentUnderCrossUidLockCandidateV1/u,
);

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
    .filter((statement) =>
      !ts.isImportDeclaration(statement) &&
      !ts.isExportDeclaration(statement))
    .map((statement) => statement.getText(ast).replace(/^export\s+/u, ""))
    .join("\n");
}

function snapshot(value, ancestors = new WeakSet()) {
  if (value === null || typeof value === "string" ||
      typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw Error("snapshot_number_invalid");
    return value;
  }
  if (!value || typeof value !== "object" || utilTypes.isProxy(value) ||
      ancestors.has(value)) throw Error("snapshot_value_invalid");
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const output = [];
      Object.defineProperty(output, "toJSON", {
        value: undefined,
        enumerable: false,
      });
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor || !Object.hasOwn(descriptor, "value")) {
          throw Error("snapshot_array_invalid");
        }
        Object.defineProperty(output, String(index), {
          value: snapshot(descriptor.value, ancestors),
          enumerable: true,
          writable: false,
          configurable: false,
        });
      }
      return Object.freeze(output);
    }
    const output = Object.create(null);
    for (const key of Object.keys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !Object.hasOwn(descriptor, "value") ||
          key === "toJSON") throw Error("snapshot_record_invalid");
      Object.defineProperty(output, key, {
        value: snapshot(descriptor.value, ancestors),
        enumerable: true,
        writable: false,
        configurable: false,
      });
    }
    return Object.freeze(output);
  } finally {
    ancestors.delete(value);
  }
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

const reconciliationAuthority = Object.freeze({
  source_only_read_classifier: true,
  cross_uid_lock_release_authorized: false,
  custody_recovery_authorized: false,
});

let lockHeld = false;
let lockCount = 0;
let releaseCount = 0;
let retainedCount = 0;
let dispatchCount = 0;
let reconciliationCount = 0;
let dispatchMode = "ok";
let reconciliationMode = "observed_no_target_capacity_effect";
let lockMode = "ok";
let lockPause = null;
let lastDispatchInput = null;
let lastReconciliationInput = null;
let reconciliationObservedLockHeld = false;

function exactRecord(raw, keys, code) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) ||
      utilTypes.isProxy(raw)) throw Error(code);
  const actual = Reflect.ownKeys(raw);
  if (actual.length !== keys.length ||
      actual.some((key) => typeof key !== "string" || !keys.includes(key))) {
    throw Error(code);
  }
  const out = Object.create(null);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(raw, key);
    if (!descriptor || !Object.hasOwn(descriptor, "value") ||
        descriptor.enumerable !== true) throw Error(code);
    out[key] = descriptor.value;
  }
  return Object.freeze(out);
}

function input() {
  return {
    capacity_lock: {
      shared_directory: "/tmp/void-cross-uid-lock-synthetic",
      custody_uid: 2101,
      web_uid: 2102,
      shared_gid: 2103,
      wait_timeout_ms: 2000,
      poll_interval_ms: 20,
    },
    writer_input: {
      event: {
        operator_status: "payment_verified",
        request_id: REQUEST_ID,
        quoted_void: "100.000000",
        payment_verifier: {
          chain: "base",
          receipt: { logs: [{ topic: "payment" }] },
        },
      },
      request: {
        request_id: REQUEST_ID,
        quoted_void: "100.000000",
        buyer: { wallet: "0xcccccccccccccccccccccccccccccccccccccccc" },
      },
      request_dir: REQUEST_DIR,
      with_launch_authority_mutation: async () => ({}),
      read_sale_state: async () => ({}),
    },
  };
}

// Match the canonical current handoff receipt's actual positive shape,
// rather than accepting a fabricated { ok: true } without an allocation.
function durableDispatchResult(input, mode = "ok") {
  const idempotent = mode === "idempotent" || mode === "replay_repaired";
  const allocationIdempotent =
    mode === "idempotent" || mode === "new_payment_existing_allocation";
  const eventSha = "sha256:" + createHash("sha256")
    .update(JSON.stringify(input.event) + "\n", "utf8").digest("hex");
  const allocation = Object.freeze({
    ok: true,
    marker: mode === "wrong_marker" ? "forged_handoff" : HANDOFF_MARKER,
    authority: handoffAuthority,
    allocation_record_id: "voidar1_" + "b".repeat(64),
    payment_verified_event_sha256:
      mode === "wrong_digest" ? "sha256:" + "f".repeat(64) : eventSha,
    idempotent: allocationIdempotent,
    final_record_count: 1,
    allocation_writer_status:
      mode === "wrong_writer_status" ? "unqualified" :
      allocationIdempotent ? "idempotent" : "persisted",
    allocation_writer_operation_performed:
      mode === "wrong_operation" ? false : !allocationIdempotent,
    prior_allocation_recovery_performed:
      mode === "wrong_recovery_type" ? "not_a_boolean" : false,
    final_tip_hash:
      mode === "wrong_tip_hash" ? "sha256:" + "0".repeat(64) :
      "sha256:" + "c".repeat(64),
    runtime_integration: false,
    protected_high_water_custody_proven: false,
    production_gate_ready: false,
    funds_movement: false,
  });
  const result = {
    ok: true,
    allocation,
    payment_event_appended: !idempotent,
    idempotent,
    authority: handoffAuthority,
    runtime_integration: false,
    protected_high_water_custody_proven: false,
    production_gate_ready: false,
    funds_movement: false,
  };
  return mode === "unfrozen" ? result : Object.freeze(result);
}

function reconciliation(status, requestId) {
  const held = status === "held";
  const noEffect = status === "observed_no_target_capacity_effect";
  const missing = status === "verified_allocation_missing";
  const complete = status === "allocation_present";
  return Object.freeze({
    ok: noEffect || complete,
    classified: !held,
    status,
    marker: RECON_MARKER,
    version: 1,
    reason: held ? "synthetic_held" : null,
    request_id: held ? null : requestId,
    payment_verified_event_sha256: missing || complete
      ? "sha256:" + "a".repeat(64)
      : null,
    allocation_record_id: complete ? "voidar1_" + "b".repeat(64) : null,
    verified_request_count: held ? null : 1,
    allocation_record_count: held ? null : (complete ? 1 : 0),
    canonical_replay_call_count: held ? null : 1,
    observed_no_target_capacity_effect: noEffect,
    exclusive_recovery_required: missing,
    durable_handoff_complete: complete,
    external_high_water_witness_verified: false,
    coordinated_storage_rollback_excluded: false,
    cross_uid_lock_release_authorized: false,
    custody_recovery_authorized: false,
    operation_performed: false,
    filesystem_write: false,
    runtime_integration: false,
    payment_acceptance: false,
    presale_activation: false,
    funds_movement: false,
    authority: reconciliationAuthority,
  });
}

const sandbox = {
  console,
  Object,
  Array,
  Error,
  JSON,
  utilTypes,
  createHash,
  VOID_BUY_VOID_VERIFIED_PAYMENT_ALLOCATION_HANDOFF_V1: HANDOFF_MARKER,
  VOID_BUY_VOID_VERIFIED_PAYMENT_ALLOCATION_HANDOFF_AUTHORITY_V1:
    handoffAuthority,
  process: { platform: "linux", getuid: () => 2102 },
  VOID_BUY_VOID_CROSS_UID_CAPACITY_EXCLUSIVE_LOCK_V1: LOCK_MARKER,
  VOID_BUY_VOID_CROSS_UID_FAILURE_RECONCILIATION_V1: RECON_MARKER,
  VOID_BUY_VOID_CROSS_UID_FAILURE_RECONCILIATION_AUTHORITY_V1:
    reconciliationAuthority,
  exactWebCrossUidWriterInputV1(raw) {
    return exactRecord(raw, ["capacity_lock", "writer_input"], "input_invalid");
  },
  checkedWebCrossUidCapacityConfigV1(raw) {
    const value = exactRecord(raw, [
      "shared_directory", "custody_uid", "web_uid", "shared_gid",
      "wait_timeout_ms", "poll_interval_ms",
    ], "config_invalid");
    if (value.web_uid !== 2102 || value.custody_uid !== 2101 ||
        value.shared_gid !== 2103) throw Error("config_invalid");
    return value;
  },
  checkedVerifiedPaymentDispatchPlanV1(raw) {
    const value = exactRecord(raw, [
      "event", "request", "request_dir", "with_launch_authority_mutation",
      "read_sale_state",
    ], "writer_invalid");
    const event = snapshot(value.event);
    const request = snapshot(value.request);
    if (event.operator_status !== "payment_verified" ||
        event.request_id !== request.request_id) throw Error("plan_invalid");
    const dispatchInput = Object.freeze({
      event,
      request,
      request_dir: value.request_dir,
      allocation_ledger_root: LEDGER_ROOT,
      allocation_high_water_root: HIGH_WATER_ROOT,
      with_launch_authority_mutation: value.with_launch_authority_mutation,
      read_sale_state: value.read_sale_state,
    });
    return Object.freeze({
      dispatch_input: dispatchInput,
      event_json: JSON.stringify(event),
      request_json: JSON.stringify(request),
    });
  },
  async dispatchBuyVoidOperatorEventWithAllocationRequiredV1(value) {
    dispatchCount += 1;
    assert.equal(lockHeld, true);
    lastDispatchInput = value;
    if (dispatchMode === "throw") {
      throw Error("synthetic_dispatch_ambiguity");
    }
    if (dispatchMode === "bad") return Object.freeze({ ok: false });
    if (dispatchMode === "bare_success") {
      return Object.freeze({ ok: true });
    }
    return durableDispatchResult(value, dispatchMode);
  },
  classifyBuyVoidCrossUidFailureReconciliationV1(value) {
    reconciliationCount += 1;
    reconciliationObservedLockHeld = lockHeld;
    lastReconciliationInput = value;
    if (reconciliationMode === "throw") {
      throw Error("synthetic_reconciliation_failure");
    }
    if (reconciliationMode === "unqualified") {
      return Object.freeze({ status: "allocation_present" });
    }
    return reconciliation(reconciliationMode, value.request_id);
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
    try {
      const result = await callback();
      lockHeld = false;
      releaseCount += 1;
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
    } catch (cause) {
      lockHeld = false;
      retainedCount += 1;
      throw new Error(
        "cross_uid_capacity_lock_callback_failed_lock_retained",
        { cause },
      );
    }
  },
};

const context = vm.createContext(sandbox);
vm.runInContext(
  executable(SOURCE) +
    "\nthis.invoke = writeBuyVoidPaymentUnderCrossUidLockWithFailureBindingCandidateV1;" +
    "\nthis.contract = VOID_BUY_VOID_WEB_PAYMENT_CROSS_UID_FAILURE_BINDING_AUTHORITY_V1;",
  context,
  { timeout: 1000 },
);

const success = await context.invoke(input());
assert.equal(success.marker, CANDIDATE_MARKER);
assert.equal(success.status, "source_candidate_only");
assert.equal(success.reconciliation_invoked, false);
assert.equal(success.payment_acceptance, false);
assert.equal(reconciliationCount, 0);
assert.equal(releaseCount, 1);
assert.equal(retainedCount, 0);
assert.equal(context.contract.every_reconciliation_outcome_retains_outer_claim, true);
assert.equal(context.contract.cross_uid_lock_release_authorized, false);
assert.equal(
  context.contract.durable_allocation_receipt_required_before_lock_release,
  true,
);

// A complete verified-payment plus durable-allocation receipt qualifies.
// An exact idempotent replay must likewise avoid another payment append.
dispatchMode = "idempotent";
const idempotentSuccess = await context.invoke(input());
assert.equal(idempotentSuccess.writer_result.idempotent, true);
assert.equal(idempotentSuccess.writer_result.payment_event_appended, false);
assert.equal(releaseCount, 2);
// A previously durable payment can legitimately require a first allocation
// write on replay: do not conflate payment and allocation idempotence.
dispatchMode = "replay_repaired";
const repaired = await context.invoke(input());
assert.equal(repaired.writer_result.idempotent, true);
assert.equal(repaired.writer_result.allocation.idempotent, false);
assert.equal(repaired.writer_result.payment_event_appended, false);
assert.equal(releaseCount, 3);
dispatchMode = "ok";


for (const status of [
  "observed_no_target_capacity_effect",
  "verified_allocation_missing",
  "allocation_present",
  "held",
]) {
  dispatchMode = "throw";
  reconciliationMode = status;
  const releasesBefore = releaseCount;
  const retainedBefore = retainedCount;
  await assert.rejects(context.invoke(input()), (error) => {
    assert.equal(
      error.message,
      "cross_uid_capacity_lock_callback_failed_lock_retained",
    );
    const inner = error.cause;
    assert.equal(
      inner.message,
      "buy_void_web_cross_uid_dispatch_failed_reconciled_lock_retained",
    );
    assert.equal(inner.cause.message, "synthetic_dispatch_ambiguity");
    assert.equal(inner.reconciliation.status, status);
    assert.equal(inner.reconciliation.cross_uid_lock_release_authorized, false);
    assert.equal(inner.reconciliation.custody_recovery_authorized, false);
    return true;
  });
  assert.equal(releaseCount, releasesBefore);
  assert.equal(retainedCount, retainedBefore + 1);
  assert.equal(reconciliationObservedLockHeld, true);
  assert.equal(lastReconciliationInput.request_id, REQUEST_ID);
  assert.equal(lastReconciliationInput.request_dir, REQUEST_DIR);
  assert.equal(lastReconciliationInput.allocation_ledger_root, LEDGER_ROOT);
  assert.equal(lastReconciliationInput.allocation_high_water_root, HIGH_WATER_ROOT);
}

// An unqualified successful return is a dispatch failure too, and may never
// bypass the retained-claim reconciliation path.
dispatchMode = "bad";
reconciliationMode = "allocation_present";
await assert.rejects(context.invoke(input()), (error) => {
  assert.equal(error.cause.cause.message,
    "buy_void_web_cross_uid_dispatch_result_unqualified");
  assert.equal(error.cause.reconciliation.status, "allocation_present");
  return true;
});

// The outer claim cannot be released by a success boolean lacking the
// canonical durable payment-to-allocation receipt, or by forged receipt data.
for (const mode of [
  "bare_success", "wrong_digest", "wrong_marker", "unfrozen",
  "wrong_writer_status", "wrong_operation", "wrong_recovery_type",
  "wrong_tip_hash", "new_payment_existing_allocation",
]) {
  dispatchMode = mode;
  reconciliationMode = "allocation_present";
  const priorRelease = releaseCount;
  const priorRetained = retainedCount;
  await assert.rejects(context.invoke(input()), (error) => {
    assert.equal(error.message,
      "cross_uid_capacity_lock_callback_failed_lock_retained");
    assert.equal(error.cause.message,
      "buy_void_web_cross_uid_dispatch_failed_reconciled_lock_retained");
    assert.equal(error.cause.cause.message,
      "buy_void_web_cross_uid_handoff_receipt_unqualified");
    assert.equal(error.cause.reconciliation.status, "allocation_present");
    return true;
  });
  assert.equal(releaseCount, priorRelease);
  assert.equal(retainedCount, priorRetained + 1);
  assert.equal(reconciliationObservedLockHeld, true);
}
dispatchMode = "ok";

// Reconciliation exceptions and malformed classifier results both retain.
dispatchMode = "throw";
reconciliationMode = "throw";
await assert.rejects(context.invoke(input()), (error) => {
  assert.equal(error.cause.message,
    "buy_void_web_cross_uid_reconciliation_failed_lock_retained");
  assert.equal(error.cause.cause.message, "synthetic_dispatch_ambiguity");
  assert.equal(
    error.cause.reconciliation_failure.message,
    "synthetic_reconciliation_failure",
  );
  return true;
});
reconciliationMode = "unqualified";
await assert.rejects(context.invoke(input()), (error) => {
  assert.equal(error.cause.message,
    "buy_void_web_cross_uid_reconciliation_failed_lock_retained");
  assert.equal(
    error.cause.reconciliation_failure.message,
    "buy_void_web_cross_uid_reconciliation_result_unqualified",
  );
  return true;
});

// Caller mutation while lock acquisition is paused cannot redirect either the
// dispatch or the in-lock reconciliation identity.
reconciliationMode = "verified_allocation_missing";
const raced = input();
const eventJson = JSON.stringify(raced.writer_input.event);
const requestJson = JSON.stringify(raced.writer_input.request);
const pause = { entered: deferred(), release: deferred() };
lockPause = pause;
const pending = context.invoke(raced);
await pause.entered.promise;
raced.writer_input.event.request_id = "buyvoid_mutated_deadbeef";
raced.writer_input.request.request_id = "buyvoid_other_feedface";
raced.writer_input.event.operator_status = "reviewed";
raced.writer_input.event.payment_verifier.chain = "ethereum";
raced.writer_input.request.buyer.wallet =
  "0xdddddddddddddddddddddddddddddddddddddddd";
pause.release.resolve();
await assert.rejects(pending, /cross_uid_capacity_lock_callback_failed/u);
assert.equal(JSON.stringify(lastDispatchInput.event), eventJson);
assert.equal(JSON.stringify(lastDispatchInput.request), requestJson);
assert.equal(lastReconciliationInput.request_id, REQUEST_ID);

// Invalid outer input is rejected before lock, dispatch, or reconciliation.
const bad = input();
bad.extra = true;
const counts = { lockCount, dispatchCount, reconciliationCount };
await assert.rejects(context.invoke(bad), /input_invalid/u);
assert.deepEqual(
  { lockCount, dispatchCount, reconciliationCount },
  counts,
);

// A forged custody-role lock receipt cannot be promoted after success.
dispatchMode = "ok";
reconciliationMode = "observed_no_target_capacity_effect";
lockMode = "fake";
await assert.rejects(
  context.invoke(input()),
  /failure_binding_lock_result_unqualified/u,
);
lockMode = "ok";

assert.ok(lockCount >= 10);
assert.ok(dispatchCount >= 9);
assert.ok(reconciliationCount >= 8);
assert.equal(lockHeld, false);

console.log("VOID_BUY_VOID_WEB_PAYMENT_CROSS_UID_FAILURE_BINDING_V1_SYNTHETIC_GREEN");
console.log("actual_candidate_module_evaluated_with_inert_imports=true");
console.log("dispatch_failure_reconciliation_runs_while_lock_held=true");
console.log("planned_snapshot_binds_reconciliation_identity=true");
console.log("all_reconciliation_statuses_retain_outer_claim=true");
console.log("no_reconciliation_outcome_authorizes_release=true");
console.log("reconciliation_failure_retains_outer_claim=true");
console.log("unqualified_reconciliation_retains_outer_claim=true");
console.log("durable_allocation_receipt_checked_inside_lock=true");
console.log("bare_success_cannot_release_outer_claim=true");
console.log("forged_allocation_or_payment_digest_retains_lock=true");
console.log("idempotent_allocation_replay_receipt_accepted=true");
console.log("payment_replay_allocation_repair_accepted=true");
console.log("allocation_writer_status_and_final_tip_bound=true");
console.log("new_payment_existing_allocation_retains_lock=true");
console.log("successful_dispatch_releases_after_callback=true");
console.log("production_dispatch_invoked=false");
console.log("filesystem_write=false");
console.log("runtime_integration=false");
console.log("payment_acceptance=false");
console.log("presale_activation=false");
console.log("funds_movement=false");
