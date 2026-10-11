#!/usr/bin/env node
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import fs from "node:fs";
import vm from "node:vm";
import { types as utilTypes } from "node:util";
import ts from "typescript";

// This test evaluates the ACTUAL proposed module's function declarations
// with inert in-memory lock/payment-writer stand-ins. It never imports the
// real writer, touches a ledger, calls RPC, or provisions a lock directory.
const PATH =
  "src/economic/buy_void_web_payment_cross_uid_lock_writer_v1.mjs";
const code = fs.readFileSync(PATH, "utf8");
const ast = ts.createSourceFile(PATH, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(ast.parseDiagnostics.length, 0);
const statements = ast.statements
  .filter(stmt => !ts.isImportDeclaration(stmt) && !ts.isExportDeclaration(stmt))
  .map(stmt => stmt.getText(ast).replace(/^export\s+/u, ""));
assert.ok(statements.length >= 12);

function deferred() {
  let resolve;
  const promise = new Promise(done => {
    resolve = done;
  });
  return { promise, resolve };
}

const events = [];
const seenWriterInputs = [];
let writerCount = 0;
let lockCount = 0;
let lockPause = null;
const sandbox = {
  Buffer,
  utilTypes,
  process: { platform: "linux", getuid: () => 2102 },
  VOID_BUY_VOID_CROSS_UID_CAPACITY_EXCLUSIVE_LOCK_V1:
    "VOID_BUY_VOID_CROSS_UID_CAPACITY_EXCLUSIVE_LOCK_V1",
  withBuyVoidCrossUidCapacityExclusiveLockV1: async (cfg, fn) => {
    lockCount++;
    events.push("cross_uid_lock_enter");
    assert.equal(cfg.web_uid, 2102);
    assert.equal(cfg.custody_uid, 2101);
    assert.equal(cfg.shared_gid, 2103);
    if (lockPause !== null) {
      const pause = lockPause;
      lockPause = null;
      pause.entered.resolve();
      await pause.release.promise;
    }
    let result;
    try {
      result = await fn();
    } catch (error) {
      events.push("cross_uid_lock_retained_after_callback_exception");
      throw new Error("cross_uid_capacity_lock_callback_failed_lock_retained", {
        cause: error,
      });
    }
    events.push("cross_uid_lock_release_fsynced");
    return Object.freeze({
      marker: sandbox.VOID_BUY_VOID_CROSS_UID_CAPACITY_EXCLUSIVE_LOCK_V1,
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
  writeBuyVoidOperatorEventWithCapacityAdmissionV1: async input => {
    events.push("canonical_durable_payment_writer");
    seenWriterInputs.push(input);
    writerCount++;
    return Object.freeze({
      ok: true,
      idempotent: false,
      marker: "synthetic_writer_only",
    });
  },
};
const ctx = vm.createContext(sandbox);
vm.runInContext(
  statements.join("\n") +
    "\nthis.invoke = writeBuyVoidPaymentUnderCrossUidLockCandidateV1;\n" +
    "this.contract = VOID_BUY_VOID_WEB_PAYMENT_CROSS_UID_LOCK_WRITER_AUTHORITY_V1;",
  ctx,
  { timeout: 1000 },
);
assert.equal(typeof ctx.invoke, "function");
assert.equal(ctx.contract.source_only_unmounted, true);
assert.equal(ctx.contract.event_and_request_detached_before_lock_wait, true);
assert.equal(ctx.contract.admitted_json_bytes_rechecked_inside_lock, true);
assert.equal(ctx.contract.caller_owned_mutation_cannot_redirect_writer, true);
assert.equal(ctx.contract.public_http_handler_installed, false);
assert.equal(ctx.contract.payment_acceptance, false);
assert.equal(ctx.contract.presale_activation, false);
assert.equal(ctx.contract.funds_movement, false);

function cloneInput() {
  return vm.runInContext(`({
    capacity_lock: {
      shared_directory:"/tmp/void-web-custody-cross-uid-test-only",
      custody_uid:2101,web_uid:2102,shared_gid:2103,
      wait_timeout_ms:2000,poll_interval_ms:20
    },
    writer_input: {
      event:{
        operator_status:"payment_verified",
        request_id:"buyvoid_abc_1234abcd",
        tx_hash:"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        quoted_void:"100.000000",
        payment_verifier:{
          chain:"base",
          receipt:{block_number:123,logs:[{topic:"payment",amount:"50.000000"}]}
        },
        launch_authority:{generation:7,activation_receipt_sha256:"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}
      },
      request:{
        request_id:"buyvoid_abc_1234abcd",
        tx_hash:"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        source_chain:"base",
        quoted_void:"100.000000",
        buyer:{wallet:"0xcccccccccccccccccccccccccccccccccccccccc"},
        payment_instructions:{chain:"base",asset:"USDC",amount:"50.000000"}
      },
      request_dir:"/tmp/void-buyer-synthetic-only",
      with_launch_authority_mutation:async()=>{},
      read_sale_state:async()=>{}
    }
  })`, ctx);
}

const good = cloneInput();
const goodEventJson = JSON.stringify(good.writer_input.event);
const goodRequestJson = JSON.stringify(good.writer_input.request);
const outcome = await ctx.invoke(good);
assert.deepEqual(events, [
  "cross_uid_lock_enter",
  "canonical_durable_payment_writer",
  "cross_uid_lock_release_fsynced",
]);
assert.equal(lockCount, 1);
assert.equal(writerCount, 1);
assert.equal(outcome.status, "source_candidate_only");
assert.equal(outcome.web_writer_cross_uid_lock_source_bound, true);
assert.equal(outcome.immutable_writer_input_snapshot, true);
assert.equal(outcome.caller_owned_mutation_after_admission_blocked, true);
for (const key of [
  "custody_service_joint_handoff_proven",
  "payment_capacity_lock_verified",
  "allocation_handoff_atomicity_proven",
  "deployed_artifact_generation_verified",
  "runtime_integration",
  "payment_acceptance",
  "presale_activation",
  "funds_movement",
]) assert.equal(outcome[key], false, key);

const firstSeen = seenWriterInputs[0];
assert.notEqual(firstSeen, good.writer_input);
assert.notEqual(firstSeen.event, good.writer_input.event);
assert.notEqual(firstSeen.request, good.writer_input.request);
assert.equal(Object.isFrozen(firstSeen), true);
assert.equal(Object.isFrozen(firstSeen.event), true);
assert.equal(Object.isFrozen(firstSeen.request), true);
assert.equal(Object.isFrozen(firstSeen.event.payment_verifier), true);
assert.equal(Object.isFrozen(firstSeen.event.payment_verifier.receipt.logs), true);
assert.equal(Object.isFrozen(firstSeen.request.payment_instructions), true);
assert.equal(JSON.stringify(firstSeen.event), goodEventJson);
assert.equal(JSON.stringify(firstSeen.request), goodRequestJson);

// Reproduce the reviewed TOCTOU schedule: wrapper validation and snapshot have
// completed, but a synthetic contended lock pauses before the writer callback.
// Mutating every caller-owned object during that wait must not redirect the
// canonical writer to a reviewed/nonpayment route or a different request.
const raceInput = cloneInput();
const admittedEventJson = JSON.stringify(raceInput.writer_input.event);
const admittedRequestJson = JSON.stringify(raceInput.writer_input.request);
const pause = { entered: deferred(), release: deferred() };
lockPause = pause;
const racePending = ctx.invoke(raceInput);
await pause.entered.promise;
raceInput.writer_input.event.operator_status = "reviewed";
raceInput.writer_input.event.request_id = "buyvoid_mutated_deadbeef";
raceInput.writer_input.request.request_id = "buyvoid_other_feedface";
raceInput.writer_input.event.quoted_void = "999.000000";
raceInput.writer_input.request.quoted_void = "999.000000";
raceInput.writer_input.event.payment_verifier.chain = "ethereum";
raceInput.writer_input.event.payment_verifier.receipt.logs[0].topic = "mutated";
raceInput.writer_input.event.launch_authority.generation = 999;
raceInput.writer_input.request.buyer.wallet =
  "0xdddddddddddddddddddddddddddddddddddddddd";
raceInput.writer_input.request.payment_instructions.chain = "ethereum";
pause.release.resolve();
const raceOutcome = await racePending;
assert.equal(raceOutcome.status, "source_candidate_only");
const raceSeen = seenWriterInputs.at(-1);
assert.equal(raceSeen.event.operator_status, "payment_verified");
assert.equal(raceSeen.event.request_id, "buyvoid_abc_1234abcd");
assert.equal(raceSeen.request.request_id, "buyvoid_abc_1234abcd");
assert.equal(raceSeen.event.payment_verifier.chain, "base");
assert.equal(raceSeen.event.payment_verifier.receipt.logs[0].topic, "payment");
assert.equal(raceSeen.event.launch_authority.generation, 7);
assert.equal(raceSeen.request.payment_instructions.chain, "base");
assert.equal(JSON.stringify(raceSeen.event), admittedEventJson);
assert.equal(JSON.stringify(raceSeen.request), admittedRequestJson);
assert.equal(Object.isFrozen(raceSeen.event.payment_verifier.receipt.logs[0]), true);
assert.notEqual(raceSeen.event, raceInput.writer_input.event);
assert.notEqual(raceSeen.request, raceInput.writer_input.request);

// Wrong trust inputs must reject BEFORE the first lock acquisition or write.
async function mustHold(patch, label) {
  const beforeLocks = lockCount;
  const beforeWrites = writerCount;
  await assert.rejects(ctx.invoke(patch), undefined, label);
  assert.equal(lockCount, beforeLocks, label + " lock not acquired");
  assert.equal(writerCount, beforeWrites, label + " writer not invoked");
}

let bad = cloneInput();
bad.writer_input.event.operator_status = "reviewed";
await mustHold(bad, "reviewed status rejected");
bad = cloneInput();
bad.writer_input.request.request_id = "buyvoid_different_1234abcd";
await mustHold(bad, "request ID mismatch rejected");
bad = cloneInput();
bad.capacity_lock.custody_uid = 2102;
await mustHold(bad, "same UID rejected");
bad = cloneInput();
bad.capacity_lock.web_uid = 2104;
await mustHold(bad, "wrong web principal rejected");
bad = cloneInput();
bad.capacity_lock.shared_directory = "../relative";
await mustHold(bad, "relative lock root rejected");
bad = cloneInput();
bad.extra_param = "operator_unsanctioned";
await mustHold(bad, "extra top-level config rejected");
bad = cloneInput();
Object.defineProperty(bad.capacity_lock, "shared_directory", {
  get() { throw Error("GETTER MUST NOT RUN"); },
  enumerable: true,
  configurable: true,
});
await mustHold(bad, "accessor lock config rejected without invocation");
bad = cloneInput();
Object.defineProperty(bad.writer_input.event, "operator_status", {
  get() { throw Error("GETTER MUST NOT RUN"); },
  enumerable: true,
  configurable: true,
});
await mustHold(bad, "accessor event status rejected");
bad = cloneInput();
Object.defineProperty(bad.writer_input.event.payment_verifier, "chain", {
  get() { throw Error("NESTED GETTER MUST NOT RUN"); },
  enumerable: true,
  configurable: true,
});
await mustHold(bad, "nested accessor rejected");
bad = cloneInput();
bad.capacity_lock = new Proxy(bad.capacity_lock, {
  get(target, key) { return Reflect.get(target, key); },
});
await mustHold(bad, "proxied server config rejected");
bad = cloneInput();
bad.writer_input.event.payment_verifier = new Proxy(
  bad.writer_input.event.payment_verifier,
  { get(target, key) { return Reflect.get(target, key); } },
);
await mustHold(bad, "nested proxied event data rejected");
bad = cloneInput();
bad.writer_input.request_dir = "/tmp/../tmp/alias";
await mustHold(bad, "aliased request root rejected");
bad = cloneInput();
bad.writer_input.event.payment_verifier.self =
  bad.writer_input.event.payment_verifier;
await mustHold(bad, "cyclic event rejected");
bad = cloneInput();
bad.writer_input.event.payment_verifier.receipt.raw = "x".repeat(1024 * 1024 + 1);
await mustHold(bad, "oversized event text rejected");
bad = cloneInput();
bad.writer_input.event.payment_verifier.receipt.logs = new Array(2);
bad.writer_input.event.payment_verifier.receipt.logs[0] = { topic: "only" };
await mustHold(bad, "sparse nested array rejected");
bad = cloneInput();
vm.runInContext(
  `Object.defineProperty(Object.prototype,"toJSON",{
    value:function(){return {forged:true}},configurable:true
  })`,
  ctx,
);
try {
  await mustHold(bad, "inherited toJSON rejected");
} finally {
  vm.runInContext("delete Object.prototype.toJSON", ctx);
}

const originalWriter = sandbox.writeBuyVoidOperatorEventWithCapacityAdmissionV1;
sandbox.writeBuyVoidOperatorEventWithCapacityAdmissionV1 = async () => {
  events.push("synthetic_uncertain_writer_exception");
  throw Error("synthetic_write_ambiguity");
};
const before = events.length;
const writerBeforeUncertain = writerCount;
await assert.rejects(
  ctx.invoke(cloneInput()),
  /cross_uid_capacity_lock_callback_failed_lock_retained/u,
);
assert.deepEqual(events.slice(before), [
  "cross_uid_lock_enter",
  "synthetic_uncertain_writer_exception",
  "cross_uid_lock_retained_after_callback_exception",
]);
assert.equal(writerCount, writerBeforeUncertain, "uncertain write was never reattempted");
sandbox.writeBuyVoidOperatorEventWithCapacityAdmissionV1 = originalWriter;

// A fabricated lock success receipt cannot be promoted as qualified.
const originalLock = sandbox.withBuyVoidCrossUidCapacityExclusiveLockV1;
sandbox.withBuyVoidCrossUidCapacityExclusiveLockV1 = async () => ({
  marker: sandbox.VOID_BUY_VOID_CROSS_UID_CAPACITY_EXCLUSIVE_LOCK_V1,
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
await assert.rejects(ctx.invoke(cloneInput()), /lock_result_unqualified/u);
sandbox.withBuyVoidCrossUidCapacityExclusiveLockV1 = originalLock;

console.log("VOID_BUY_VOID_WEB_PAYMENT_CROSS_UID_LOCK_WRITER_V1_SYNTHETIC_GREEN");
console.log("actual_candidate_module_evaluated_with_inert_imports=true");
console.log("canonical_payment_writer_called_inside_cross_uid_lock=true");
console.log("lock_release_after_writer_callback=true");
console.log("uncertain_callback_exception_retains_lock=true");
console.log("immutable_event_and_request_snapshot_before_lock=true");
console.log("deferred_lock_caller_mutation_cannot_redirect_writer=true");
console.log("nested_proxy_accessor_tojson_cycle_and_size_rejected_prelock=true");
console.log("invalid_identity_status_and_accessor_rejected_prelock=true");
console.log("proxied_server_config_rejected_prelock=true");
console.log("fake_custody_lock_receipt_rejected=true");
console.log("production_writer_invoked=false");
console.log("payment_capacity_lock_verified=false");
console.log("allocation_handoff_atomicity_proven=false");
console.log("payment_acceptance=false");
console.log("presale_activation=false");
console.log("funds_movement=false");
