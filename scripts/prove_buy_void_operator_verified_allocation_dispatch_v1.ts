import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import ts from "typescript";

import {
  VOID_BUY_VOID_ALLOCATION_HIGH_WATER_ROOT_V1,
  VOID_BUY_VOID_ALLOCATION_LEDGER_ROOT_V1,
  VOID_BUY_VOID_OPERATOR_VERIFIED_ALLOCATION_DISPATCH_AUTHORITY_V1,
  planBuyVoidOperatorAllocationDispatchV1,
  dispatchBuyVoidOperatorEventWithAllocationRequiredV1,
} from "../src/economic/buy_void_operator_verified_allocation_dispatch_v1.js";

const IDX_PATH = "src/index.ts";
const DISPATCH_PATH =
  "src/economic/buy_void_operator_verified_allocation_dispatch_v1.ts";
const EXPECTED_DISPATCH_GIT_BLOB =
  "56cc3d4089f870868222328d9b56dd91415974a0";
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
    allocation_ledger_root: VOID_BUY_VOID_ALLOCATION_LEDGER_ROOT_V1,
    allocation_high_water_root: VOID_BUY_VOID_ALLOCATION_HIGH_WATER_ROOT_V1,
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
assert.equal(authority.bounded_plain_data_snapshot_required, true);
assert.equal(authority.pre_serialization_resource_bound_verified, true);
assert.equal(authority.caller_accessor_or_tojson_authority, false);
assert.equal(authority.pre_serialization_plain_data_bound, true);
assert.equal(authority.accessor_or_tojson_input_allowed, false);
assert.equal(authority.proxy_input_allowed, false);

for (const key of [
  "mounted_operator_route_verified",
  "operator_principal_authenticated",
  "private_root_independent_custody_proven",
  "custody_service_composed",
  "direct_web_process_private_root_write_authority",
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
    VOID_BUY_VOID_ALLOCATION_LEDGER_ROOT_V1);
  assert.equal(plan.allocation_high_water_root,
    VOID_BUY_VOID_ALLOCATION_HIGH_WATER_ROOT_V1);
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

for (const status of ["reviewed", "fulfilled", "rejected"] as const) {
  const plan = planBuyVoidOperatorAllocationDispatchV1(input({
    event: {request_id:"synthetic-r1",operator_status:status},
    allocation_ledger_root:undefined,allocation_high_water_root:undefined,
  }));
  assert.equal(plan.kind, "nonpayment_legacy_writer");
  assert.equal(plan.event.operator_status, status);
}

for (const status of [
  "payment_verified ",
  "\tpayment_verified\n",
  "Payment_verified",
  "PAYMENT_VERIFIED",
  " reviewed",
  "reviewed ",
  "unknown",
]) {
  assert.throws(
    () => planBuyVoidOperatorAllocationDispatchV1(input({
      event: {request_id:"synthetic-r1",operator_status:status},
      allocation_ledger_root:undefined,
      allocation_high_water_root:undefined,
    })),
    /buy_void_operator_allocation_dispatch_request_event_identity_status_or_server_callbacks_invalid/u,
    status,
  );
  await assert.rejects(
    () => dispatchBuyVoidOperatorEventWithAllocationRequiredV1(input({
      event: {request_id:"synthetic-r1",operator_status:status},
      allocation_ledger_root:undefined,
      allocation_high_water_root:undefined,
    })),
    /buy_void_operator_allocation_dispatch_request_event_identity_status_or_server_callbacks_invalid/u,
    status,
  );
}

{
  const reads = {
    event: 0,
    request: 0,
    request_dir: 0,
    allocation_ledger_root: 0,
    allocation_high_water_root: 0,
    with_launch_authority_mutation: 0,
    read_sale_state: 0,
  };
  const launchA = async () => ({ marker: "launch-a" });
  const launchB = async () => ({ marker: "launch-b" });
  const saleA = async () => ({ marker: "sale-a" });
  const saleB = async () => ({ marker: "sale-b" });
  const stateful:any = {};
  Object.defineProperties(stateful, {
    event: {
      get() {
        reads.event++;
        return {
          request_id: "synthetic-r1",
          operator_status: "payment_verified",
          payment_verifier: { from_address: "0x" + "1".repeat(40) },
        };
      },
    },
    request: {
      get() {
        reads.request++;
        return {
          request_id: "synthetic-r1",
          delivery_address: "0x" + "1".repeat(40),
          quoted_void: "2",
        };
      },
    },
    request_dir: {
      get() {
        reads.request_dir++;
        return reads.request_dir === 1
          ? "/tmp/void-synthetic-request-root"
          : "/tmp/void-mutated-request-root";
      },
    },
    allocation_ledger_root: {
      get() {
        reads.allocation_ledger_root++;
        return reads.allocation_ledger_root === 1
          ? VOID_BUY_VOID_ALLOCATION_LEDGER_ROOT_V1
          : "/var/lib/void-mutated-ledger";
      },
    },
    allocation_high_water_root: {
      get() {
        reads.allocation_high_water_root++;
        return reads.allocation_high_water_root === 1
          ? VOID_BUY_VOID_ALLOCATION_HIGH_WATER_ROOT_V1
          : "/var/lib/void-mutated-custody";
      },
    },
    with_launch_authority_mutation: {
      get() {
        reads.with_launch_authority_mutation++;
        return reads.with_launch_authority_mutation === 1 ? launchA : launchB;
      },
    },
    read_sale_state: {
      get() {
        reads.read_sale_state++;
        return reads.read_sale_state === 1 ? saleA : saleB;
      },
    },
  });
  const plan = planBuyVoidOperatorAllocationDispatchV1(stateful);
  assert.deepEqual(reads, {
    event: 1,
    request: 1,
    request_dir: 1,
    allocation_ledger_root: 1,
    allocation_high_water_root: 1,
    with_launch_authority_mutation: 1,
    read_sale_state: 1,
  });
  assert.equal(plan.kind, "verified_payment_allocation_handoff");
  if (plan.kind !== "verified_payment_allocation_handoff") {
    throw new Error("expected_verified_payment_allocation_handoff_plan");
  }
  assert.equal(plan.request_dir, "/tmp/void-synthetic-request-root");
  assert.equal(plan.allocation_ledger_root, VOID_BUY_VOID_ALLOCATION_LEDGER_ROOT_V1);
  assert.equal(plan.allocation_high_water_root, VOID_BUY_VOID_ALLOCATION_HIGH_WATER_ROOT_V1);
  assert.equal(plan.with_launch_authority_mutation, launchA);
  assert.equal(plan.read_sale_state, saleA);
}

let serializeCount = 0;
{
  const event = {
    request_id: "synthetic-r1",
    operator_status: "payment_verified",
    toJSON() {
      serializeCount++;
      return {
        request_id: "synthetic-r1",
        operator_status: "payment_verified",
      };
    },
  };
  assert.throws(
    () => planBuyVoidOperatorAllocationDispatchV1(input({event})),
    /buy_void_operator_allocation_dispatch_event_unsupported_value/u,
  );
  assert.equal(serializeCount, 0, "event toJSON must not execute");
}

{
  let getterReads = 0;
  const event:any = {
    request_id: "synthetic-r1",
    operator_status: "payment_verified",
  };
  Object.defineProperty(event, "padding", {
    enumerable: true,
    get() {
      getterReads++;
      return "X".repeat(4 * 1024 * 1024);
    },
  });
  assert.throws(
    () => planBuyVoidOperatorAllocationDispatchV1(input({event})),
    /buy_void_operator_allocation_dispatch_event_accessor_or_nondata_property/u,
  );
  assert.equal(getterReads, 0, "event getter must not execute");
}

{
  let proxyTraps = 0;
  const target = {
    request_id: "synthetic-r1",
    operator_status: "payment_verified",
  };
  const event = new Proxy(target, {
    ownKeys(value) {
      proxyTraps++;
      return Reflect.ownKeys(value);
    },
    getOwnPropertyDescriptor(value, key) {
      proxyTraps++;
      return Reflect.getOwnPropertyDescriptor(value, key);
    },
  });
  assert.throws(
    () => planBuyVoidOperatorAllocationDispatchV1(input({event})),
    /buy_void_operator_allocation_dispatch_event_proxy_forbidden/u,
  );
  assert.equal(proxyTraps, 0, "Proxy trap must not execute");
}

{
  const originalStringify = JSON.stringify;
  let stringifyCalls = 0;
  try {
    JSON.stringify = ((...args: Parameters<typeof JSON.stringify>) => {
      stringifyCalls++;
      return originalStringify(...args);
    }) as typeof JSON.stringify;
    assert.throws(
      () => planBuyVoidOperatorAllocationDispatchV1(input({
        event: {
          request_id: "synthetic-r1",
          operator_status: "payment_verified",
          padding: "Y".repeat(4 * 1024 * 1024),
        },
      })),
      /buy_void_operator_allocation_dispatch_event_text_size_exceeded/u,
    );
  } finally {
    JSON.stringify = originalStringify;
  }
  assert.equal(stringifyCalls, 0,
    "oversize caller data must HOLD before full JSON serialization");
}

{
  const event:any = {
    request_id: "synthetic-r1",
    operator_status: "payment_verified",
  };
  let cursor = event;
  for (let depth = 0; depth < 32; depth++) {
    const child:any = {};
    cursor.nested = child;
    cursor = child;
  }
  assert.throws(
    () => planBuyVoidOperatorAllocationDispatchV1(input({event})),
    /buy_void_operator_allocation_dispatch_event_depth_exceeded/u,
  );
}

{
  const event:any = {
    request_id: "synthetic-r1",
    operator_status: "payment_verified",
  };
  for (let index = 0; index < 5000; index++) {
    event["k" + index] = index;
  }
  const originalStringify = JSON.stringify;
  let stringifyCalls = 0;
  try {
    JSON.stringify = ((...args: Parameters<typeof JSON.stringify>) => {
      stringifyCalls++;
      return originalStringify(...args);
    }) as typeof JSON.stringify;
    assert.throws(
      () => planBuyVoidOperatorAllocationDispatchV1(input({event})),
      /buy_void_operator_allocation_dispatch_event_key_count_exceeded/u,
    );
  } finally {
    JSON.stringify = originalStringify;
  }
  assert.equal(stringifyCalls, 0,
    "excess key count must HOLD before full JSON serialization");
}

{
  const sparse:any[] = [];
  sparse.length = 2;
  sparse[0] = "present";
  assert.throws(
    () => planBuyVoidOperatorAllocationDispatchV1(input({
      event: {
        request_id: "synthetic-r1",
        operator_status: "payment_verified",
        sparse,
      },
    })),
    /buy_void_operator_allocation_dispatch_event_accessor_or_nondata_property/u,
  );
}

{
  const objectToJsonBefore =
    Object.getOwnPropertyDescriptor(Object.prototype, "toJSON");
  const arrayToJsonBefore =
    Object.getOwnPropertyDescriptor(Array.prototype, "toJSON");
  let objectPrototypeToJsonCalls = 0;
  let arrayPrototypeToJsonCalls = 0;
  try {
    Object.defineProperty(Object.prototype, "toJSON", {
      value() {
        objectPrototypeToJsonCalls++;
        return {
          request_id: "synthetic-r1",
          operator_status: "reviewed",
        };
      },
      enumerable: false,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(Array.prototype, "toJSON", {
      value() {
        arrayPrototypeToJsonCalls++;
        return ["mutated"];
      },
      enumerable: false,
      writable: true,
      configurable: true,
    });

    const plan = planBuyVoidOperatorAllocationDispatchV1(input({
      event: {
        request_id: "synthetic-r1",
        operator_status: "payment_verified",
        payment_verifier: {
          from_address: "0x" + "1".repeat(40),
          path: ["safe"],
        },
      },
    }));
    assert.equal(plan.kind, "verified_payment_allocation_handoff");
    assert.equal(plan.event.operator_status, "payment_verified");
    assert.equal(Object.getPrototypeOf(plan.event), null);
    assert.equal(Object.getPrototypeOf(plan.event.payment_verifier), null);
    assert.equal(
      Object.hasOwn(plan.event.payment_verifier.path, "toJSON"),
      true,
    );
    assert.equal(plan.event.payment_verifier.path.toJSON, undefined);
    const encoded = JSON.stringify(plan.event);
    assert.match(encoded, /"operator_status":"payment_verified"/u);
    assert.equal(objectPrototypeToJsonCalls, 0);
    assert.equal(arrayPrototypeToJsonCalls, 0);
  } finally {
    if (objectToJsonBefore) {
      Object.defineProperty(Object.prototype, "toJSON", objectToJsonBefore);
    } else {
      delete (Object.prototype as any).toJSON;
    }
    if (arrayToJsonBefore) {
      Object.defineProperty(Array.prototype, "toJSON", arrayToJsonBefore);
    } else {
      delete (Array.prototype as any).toJSON;
    }
  }
}

for (const [reason, overrides] of [
  ["missing roots", {allocation_ledger_root:undefined}],
  ["empty roots", {allocation_high_water_root:""}],
  ["relative", {allocation_ledger_root:"./ledger"}],
  ["unnormalized", {allocation_ledger_root:"/var/lib/../ledger"}],
  ["filesystem root", {allocation_high_water_root:"/"}],
  ["same roots", {allocation_high_water_root:VOID_BUY_VOID_ALLOCATION_LEDGER_ROOT_V1}],
  ["nested roots", {allocation_high_water_root:"/var/lib/void-synthetic-ledger/child"}],
  ["wrong request id", {request:{request_id:"other"}}],
  ["event request id array", {
    event:{request_id:["synthetic-r1"],operator_status:"payment_verified"},
  }],
  ["request request id array", {
    request:{request_id:["synthetic-r1"]},
  }],
  ["event request id number", {
    event:{request_id:7,operator_status:"payment_verified"},
    request:{request_id:7},
  }],
  ["request request id number", {
    event:{request_id:"7",operator_status:"payment_verified"},
    request:{request_id:7},
  }],
  ["empty status", {event:{request_id:"synthetic-r1",operator_status:""}}],
  ["non-string status", {event:{request_id:"synthetic-r1",operator_status:1}}],
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
    input({event:cyc})), /event_depth_exceeded/u);
}
await assert.rejects(
  () => dispatchBuyVoidOperatorEventWithAllocationRequiredV1(
    input({allocation_high_water_root:undefined})),
  /buy_void_operator_allocation_dispatch_allocation_roots_not_configured/u,
);

const newPath = DISPATCH_PATH;
const dispatchBytes = fs.readFileSync(newPath);
assert.equal(
  gitBlob(dispatchBytes),
  EXPECTED_DISPATCH_GIT_BLOB,
  "exact reviewed dispatcher source drift",
);
const dispatchSource = dispatchBytes.toString("utf8");
const tree = ts.createSourceFile(newPath, dispatchSource,
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const parsed = ts.transpileModule(dispatchSource, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
  },
  reportDiagnostics: true,
});
const parseErrors = (parsed.diagnostics || []).filter(
  (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
);
assert.equal(
  parseErrors.length,
  0,
  parseErrors
    .map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))
    .join("\n"),
);
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
assert.match(full, /with_launch_authority_mutation: plan\.with_launch_authority_mutation/u);
assert.match(full, /read_sale_state: plan\.read_sale_state/u);
assert.doesNotMatch(full, /with_launch_authority_mutation: input\.with_launch_authority_mutation/u);
assert.doesNotMatch(full, /read_sale_state: input\.read_sale_state/u);
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
console.log("reviewed_dispatcher_source_blob=" + EXPECTED_DISPATCH_GIT_BLOB);
console.log("verified_payment_plan_selects_allocation_handoff=true");
console.log("nonpayment_plan_preserves_status_writer=true");
console.log("canonical_operator_status_closed_enum=true");
console.log("payment_verified_whitespace_alias_rejected=true");
console.log("payment_verified_case_alias_rejected=true");
console.log("invalid_status_cannot_reach_legacy_writer=true");
console.log("missing_invalid_or_aliased_private_roots_fail_closed=true");
console.log("exact_canonical_allocation_roots_required=true");
console.log("immutable_event_and_request_snapshots=true");
console.log("pre_serialization_plain_data_bound=true");
console.log("caller_toJSON_rejected_without_invocation=true");
console.log("caller_accessor_rejected_without_invocation=true");
console.log("caller_proxy_rejected_without_traps=true");
console.log("oversize_text_holds_before_full_json_serialization=true");
console.log("deep_nesting_holds_before_json_serialization=true");
console.log("excess_key_count_holds_before_json_serialization=true");
console.log("sparse_array_inherited_lookup_forbidden=true");
console.log("inherited_object_toJSON_cannot_mutate_snapshot=true");
console.log("inherited_array_toJSON_cannot_mutate_snapshot=true");
console.log("request_id_primitive_exact_identity_required=true");
console.log("server_control_properties_read_once=true");
console.log("dispatch_calls_allocation_writer_only_on_verified_branch=true");
console.log("mounted_operator_legacy_payment_only_producer_observed=true");
console.log("mounted_verified_allocation_dispatch=false");
console.log("installed_private_root_custody_verified=false");
console.log("custody_service_composed=false");
console.log("direct_web_process_private_root_write_authority=false");
console.log("payment_or_allocation_append_performed=false");
console.log("runtime_service_mutation=false");
console.log("presale_activation=false");
console.log("funds_moved=false");
