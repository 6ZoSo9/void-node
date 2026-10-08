import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import ts from "typescript";

import {
  VOID_BUY_VOID_OPERATOR_VERIFIED_ALLOCATION_DISPATCH_AUTHORITY_V1,
  planBuyVoidOperatorAllocationDispatchV1,
  dispatchBuyVoidOperatorEventWithAllocationRequiredV1,
} from "../src/economic/buy_void_operator_verified_allocation_dispatch_v1.js";

const IDX_PATH = "src/index.ts";
const FROZEN_ROUTER_GIT_BLOB = "f0c1292f26cbe3f9c6bc64dfc824cd616a9a7048";
const REQUIRED_WRITER_SOURCE_GIT_BLOB =
  "496715e7ae2941663908976a4a3f4efd7c6199cf";

function gitBlob(bytes: Buffer): string {
  return crypto.createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0", "utf8"))
    .update(bytes).digest("hex");
}
function input(overrides: Record<string, any> = {}): any {
  return {
    event: {
      request_id: "synthetic-r1",
      operator_status: "payment_verified",
      payment_verifier: { from_address: "0x" + "1".repeat(40) },
    },
    request: {
      request_id: "synthetic-r1",
      delivery_address: "0x" + "1".repeat(40),
      quoted_void: "2",
    },
    request_dir: "/tmp/void-synthetic-request-root",
    allocation_ledger_root: "/var/lib/void-synthetic-ledger",
    allocation_high_water_root: "/var/lib/void-synthetic-custody",
    with_launch_authority_mutation: async () => {
      assert.fail("source-only route classification must not call launch authority");
    },
    read_sale_state: async () => {
      assert.fail("source-only route classification must not call sale state");
    },
    ...overrides,
  };
}

const authority =
  VOID_BUY_VOID_OPERATOR_VERIFIED_ALLOCATION_DISPATCH_AUTHORITY_V1;
for (const key of [
  "mounted_operator_route_verified",
  "operator_principal_authenticated",
  "private_root_independent_custody_proven",
  "deployed_artifact_generation_verified",
  "production_gate_ready",
  "signing",
  "transaction_broadcast",
  "funds_movement",
] as const) assert.equal(authority[key], false, key);

{
  const args = input();
  const plan = planBuyVoidOperatorAllocationDispatchV1(args);
  assert.equal(plan.kind, "verified_payment_allocation_handoff");
  assert.equal(plan.allocation_ledger_root,
    "/var/lib/void-synthetic-ledger");
  assert.equal(plan.allocation_high_water_root,
    "/var/lib/void-synthetic-custody");
  assert.equal(Object.isFrozen(plan.event), true);
  assert.equal(Object.isFrozen(plan.event.payment_verifier), true);
  assert.equal(Object.isFrozen(plan.request), true);
  args.event.payment_verifier.from_address = "0x" + "9".repeat(40);
  args.request.delivery_address = "0x" + "9".repeat(40);
  assert.equal(plan.event.payment_verifier.from_address,
    "0x" + "1".repeat(40));
  assert.equal(plan.request.delivery_address,
    "0x" + "1".repeat(40));
}

{
  const plan = planBuyVoidOperatorAllocationDispatchV1(input({
    event: {request_id:"synthetic-r1",operator_status:"reviewed"},
    allocation_ledger_root:undefined,allocation_high_water_root:undefined,
  }));
  assert.equal(plan.kind, "nonpayment_legacy_writer");
}

let serializeCount = 0;
{
  const event = {
    toJSON() {
      serializeCount++;
      return {
        request_id: "synthetic-r1",
        operator_status: serializeCount === 1 ? "payment_verified" : "reviewed",
      };
    },
  };
  const plan = planBuyVoidOperatorAllocationDispatchV1(input({event}));
  assert.equal(serializeCount, 1);
  assert.equal(plan.kind, "verified_payment_allocation_handoff");
}

for (const [reason, overrides] of [
  ["missing roots", {allocation_ledger_root:undefined}],
  ["empty roots", {allocation_high_water_root:""}],
  ["relative", {allocation_ledger_root:"./ledger"}],
  ["unnormalized", {allocation_ledger_root:"/var/lib/../ledger"}],
  ["filesystem root", {allocation_high_water_root:"/"}],
  ["same roots", {allocation_high_water_root:"/var/lib/void-synthetic-ledger"}],
  ["nested roots", {allocation_high_water_root:"/var/lib/void-synthetic-ledger/child"}],
  ["wrong request id", {request:{request_id:"other"}}],
  ["empty status", {event:{request_id:"synthetic-r1",operator_status:""}}],
  ["invalid server callback", {read_sale_state:null}],
] as const) {
  assert.throws(() =>
    planBuyVoidOperatorAllocationDispatchV1(input(overrides)),
    /buy_void_operator_allocation_dispatch_/u, reason);
}
{
  const cyc:any = {request_id:"synthetic-r1",operator_status:"payment_verified"};
  cyc.self = cyc;
  assert.throws(() => planBuyVoidOperatorAllocationDispatchV1(
    input({event:cyc})), /serialization_failed/u);
}
await assert.rejects(
  () => dispatchBuyVoidOperatorEventWithAllocationRequiredV1(
    input({allocation_high_water_root:undefined})),
  /buy_void_operator_allocation_dispatch_allocation_roots_not_configured/u,
);

const newPath = "src/economic/buy_void_operator_verified_allocation_dispatch_v1.ts";
const dispatchSource = fs.readFileSync(newPath, "utf8");
const tree = ts.createSourceFile(newPath, dispatchSource,
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
assert.equal(tree.parseDiagnostics.length, 0);
const handler = tree.statements.find((s) =>
  ts.isFunctionDeclaration(s) &&
  s.name?.text === "dispatchBuyVoidOperatorEventWithAllocationRequiredV1");
assert.ok(handler && ts.isFunctionDeclaration(handler));
const conditional = handler.body?.statements.filter(ts.isIfStatement) || [];
assert.equal(conditional.length, 1, "one verification dispatch switch");
const branch = conditional[0];
assert.match(branch.expression.getText(tree),
  /plan\.kind === "verified_payment_allocation_handoff"/u);
assert.match(branch.thenStatement.getText(tree),
  /writeBuyVoidVerifiedPaymentAllocationHandoffV1/u);
assert.doesNotMatch(branch.thenStatement.getText(tree),
  /writeBuyVoidOperatorEventWithCapacityAdmissionV1/u);
const full = handler.getText(tree);
assert.equal(
  (full.match(/writeBuyVoidVerifiedPaymentAllocationHandoffV1/g)||[]).length, 1);
assert.equal(
  (full.match(/writeBuyVoidOperatorEventWithCapacityAdmissionV1/g)||[]).length, 1);
assert.ok(full.indexOf("writeBuyVoidVerifiedPaymentAllocationHandoffV1") <
  full.indexOf("writeBuyVoidOperatorEventWithCapacityAdmissionV1"));

const routerBytes = fs.readFileSync(IDX_PATH);
const writerBytes = fs.readFileSync(
  "src/economic/buy_void_verified_payment_capacity_admission_v1.ts");
assert.equal(gitBlob(routerBytes), FROZEN_ROUTER_GIT_BLOB,
  "mounted router generation drift");
assert.equal(gitBlob(writerBytes), REQUIRED_WRITER_SOURCE_GIT_BLOB,
  "payment/allocation writer source generation drift");
const router = routerBytes.toString("utf8");
const start = router.indexOf(
  "async function __voidWriteBuyVoidOperatorEventV1(e:any,r:any)");
const end = router.indexOf(
  "// VOID_BUY_VOID_OPERATOR_QUEUE_APPLY_EVENTS_V1", start);
assert.ok(start > 0 && end > start && end - start < 2000);
const mounted = router.slice(start,end);
assert.match(router,/app\.post\("\/__void\/buy-void\/operator\/verify-payment[.]json"/u);
assert.match(router,/app\.post\("\/__void\/buy-void\/operator\/mark[.]json"/u);
assert.match(router,/__voidBuyVoidOperatorMutationIntentV1/u);
assert.match(mounted,/writeBuyVoidOperatorEventWithCapacityAdmissionV1/u);
assert.doesNotMatch(mounted,/writeBuyVoidVerifiedPaymentAllocationHandoffV1/u);
assert.doesNotMatch(mounted,/dispatchBuyVoidOperatorEventWithAllocationRequiredV1/u);
assert.match(writerBytes.toString("utf8"),
  /export async function writeBuyVoidVerifiedPaymentAllocationHandoffV1/u);

console.log("VOID_BUY_VOID_OPERATOR_ALLOCATION_DISPATCH_SOURCE_CANDIDATE_GREEN");
console.log("verified_payment_plan_selects_allocation_handoff=true");
console.log("nonpayment_plan_preserves_status_writer=true");
console.log("missing_invalid_or_aliased_private_roots_fail_closed=true");
console.log("immutable_event_and_request_snapshots=true");
console.log("stateful_event_toJSON_read_once=true");
console.log("dispatch_calls_allocation_writer_only_on_verified_branch=true");
console.log("mounted_operator_legacy_payment_only_producer_observed=true");
console.log("mounted_verified_allocation_dispatch=false");
console.log("installed_private_root_custody_verified=false");
console.log("payment_or_allocation_append_performed=false");
console.log("runtime_service_mutation=false");
console.log("presale_activation=false");
console.log("funds_moved=false");
