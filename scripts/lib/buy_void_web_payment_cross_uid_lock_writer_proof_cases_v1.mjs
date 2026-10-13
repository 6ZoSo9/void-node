import assert from "node:assert/strict";
import {
  deferredV1,
} from "./buy_void_web_payment_cross_uid_lock_writer_proof_snapshot_v1.mjs";

export async function proveWebCrossUidWriterCasesV1(harness) {
  const normal = harness.input();
  const normalResult = await harness.invoke(normal);
  assert.equal(normalResult.status, "source_candidate_only");
  assert.equal(normalResult.allocation_required_dispatch_source_bound, true);
  assert.equal(normalResult.legacy_payment_only_writer_forbidden, true);
  assert.equal(normalResult.payment_acceptance, false);
  let state = harness.state();
  assert.notEqual(state.last_dispatch_input.event, normal.writer_input.event);
  assert.notEqual(state.last_dispatch_input.request, normal.writer_input.request);
  assert.equal(Object.isFrozen(state.last_dispatch_input.event), true);
  assert.equal(Object.isFrozen(state.last_dispatch_input.request), true);

  const raced = harness.input();
  const eventJson = JSON.stringify(raced.writer_input.event);
  const requestJson = JSON.stringify(raced.writer_input.request);
  const pause = { entered: deferredV1(), release: deferredV1() };
  harness.pauseLock(pause);
  const pending = harness.invoke(raced);
  await pause.entered.promise;
  raced.writer_input.event.operator_status = "reviewed";
  raced.writer_input.event.request_id = "buyvoid_mutated_deadbeef";
  raced.writer_input.request.request_id = "buyvoid_other_feedface";
  raced.writer_input.event.quoted_void = "999.000000";
  raced.writer_input.request.quoted_void = "999.000000";
  raced.writer_input.event.payment_verifier.chain = "ethereum";
  raced.writer_input.event.payment_verifier.receipt.logs[0].topic = "mutated";
  raced.writer_input.event.launch_authority.generation = 999;
  raced.writer_input.request.buyer.wallet =
    "0xdddddddddddddddddddddddddddddddddddddddd";
  raced.writer_input.request.payment_instructions.chain = "ethereum";
  pause.release.resolve();
  await pending;
  state = harness.state();
  assert.equal(JSON.stringify(state.last_dispatch_input.event), eventJson);
  assert.equal(JSON.stringify(state.last_dispatch_input.request), requestJson);
  assert.equal(state.last_dispatch_input.event.operator_status, "payment_verified");
  assert.equal(state.last_dispatch_input.event.payment_verifier.chain, "base");
  assert.equal(state.last_dispatch_input.request.payment_instructions.chain, "base");

  async function rejectsBeforeLock(candidate, label) {
    const before = harness.state();
    await assert.rejects(harness.invoke(candidate), undefined, label);
    const after = harness.state();
    assert.equal(after.lock_count, before.lock_count, label + " lock");
    assert.equal(after.dispatch_count, before.dispatch_count, label + " dispatch");
  }

  let bad = harness.input();
  bad.writer_input.event.operator_status = "reviewed";
  await rejectsBeforeLock(bad, "nonpayment status");
  bad = harness.input();
  bad.extra = true;
  await rejectsBeforeLock(bad, "extra top-level field");
  bad = harness.input();
  bad.capacity_lock.web_uid = 2104;
  await rejectsBeforeLock(bad, "wrong web principal");
  bad = harness.input();
  Object.defineProperty(bad.writer_input.event, "request_id", {
    get() { throw Error("GETTER_MUST_NOT_RUN"); },
    enumerable: true,
    configurable: true,
  });
  await rejectsBeforeLock(bad, "event accessor");
  bad = harness.input();
  bad.writer_input.event.payment_verifier = new Proxy(
    bad.writer_input.event.payment_verifier,
    {},
  );
  await rejectsBeforeLock(bad, "nested proxy");
  bad = harness.input();
  bad.writer_input.event.self = bad.writer_input.event;
  await rejectsBeforeLock(bad, "cycle");
  bad = harness.input();
  bad.writer_input.with_launch_authority_mutation = new Proxy(
    bad.writer_input.with_launch_authority_mutation,
    {},
  );
  await rejectsBeforeLock(bad, "callback proxy");

  harness.setDispatchMode("throw");
  await assert.rejects(
    harness.invoke(harness.input()),
    /cross_uid_capacity_lock_callback_failed_lock_retained/u,
  );
  harness.setDispatchMode("ok");
  harness.setLockMode("fake");
  await assert.rejects(
    harness.invoke(harness.input()),
    /lock_result_unqualified/u,
  );
  harness.setLockMode("ok");

  state = harness.state();
  assert.ok(state.plan_count >= 8);
  assert.ok(state.lock_count >= 4);
  assert.ok(state.dispatch_count >= 3);
}
