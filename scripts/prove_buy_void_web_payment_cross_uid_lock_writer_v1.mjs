#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  proveWebCrossUidWriterCasesV1,
} from "./lib/buy_void_web_payment_cross_uid_lock_writer_proof_cases_v1.mjs";
import {
  createWebCrossUidWriterHarnessV1,
} from "./lib/buy_void_web_payment_cross_uid_lock_writer_proof_harness_v1.mjs";

const facade = fs.readFileSync(
  "src/economic/buy_void_web_payment_cross_uid_lock_writer_v1.mjs",
  "utf8",
);
const validation = fs.readFileSync(
  "src/economic/buy_void_web_payment_cross_uid_lock_validation_v1.mjs",
  "utf8",
);
const implementation = fs.readFileSync(
  "src/economic/buy_void_web_payment_cross_uid_lock_writer_impl_v1.mjs",
  "utf8",
);
assert.match(facade, /buy_void_web_payment_cross_uid_lock_writer_impl_v1\.mjs/u);
assert.match(validation, /planBuyVoidOperatorAllocationDispatchV1/u);
assert.match(validation, /VOID_BUY_VOID_ALLOCATION_LEDGER_ROOT_V1/u);
assert.match(validation, /VOID_BUY_VOID_ALLOCATION_HIGH_WATER_ROOT_V1/u);
assert.match(implementation, /withBuyVoidCrossUidCapacityExclusiveLockV1/u);
assert.match(implementation, /dispatchBuyVoidOperatorEventWithAllocationRequiredV1/u);
assert.doesNotMatch(
  facade + validation + implementation,
  /writeBuyVoidOperatorEventWithCapacityAdmissionV1/u,
);

const harness = createWebCrossUidWriterHarnessV1();
const contract = harness.context.contract;
assert.equal(contract.source_only_unmounted, true);
assert.equal(contract.canonical_allocation_required_dispatch_reused, true);
assert.equal(contract.canonical_dispatch_planner_snapshots_before_lock_wait, true);
assert.equal(contract.payment_verified_legacy_writer_forbidden, true);
assert.equal(contract.payment_acceptance, false);
assert.equal(contract.presale_activation, false);
assert.equal(contract.funds_movement, false);
await proveWebCrossUidWriterCasesV1(harness);

console.log("VOID_BUY_VOID_WEB_PAYMENT_CROSS_UID_LOCK_WRITER_V1_SYNTHETIC_GREEN");
console.log("actual_candidate_modules_evaluated_with_inert_imports=true");
console.log("canonical_allocation_dispatch_planned_before_cross_uid_lock=true");
console.log("canonical_verified_payment_allocation_dispatch_called_inside_cross_uid_lock=true");
console.log("legacy_payment_only_writer_invoked=false");
console.log("server_controlled_allocation_roots_bound=true");
console.log("payment_verified_allocation_handoff_source_bound=true");
console.log("lock_release_after_writer_callback=true");
console.log("uncertain_callback_exception_retains_lock=true");
console.log("immutable_event_and_request_snapshot_before_lock=true");
console.log("deferred_lock_caller_mutation_cannot_redirect_writer=true");
console.log("invalid_identity_status_proxy_accessor_and_cycle_rejected_prelock=true");
console.log("fake_custody_lock_receipt_rejected=true");
console.log("production_dispatch_invoked=false");
console.log("payment_capacity_lock_verified=false");
console.log("allocation_handoff_atomicity_proven=false");
console.log("payment_acceptance=false");
console.log("presale_activation=false");
console.log("funds_movement=false");
