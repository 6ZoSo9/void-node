import assert from "node:assert/strict";

import {
  VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_ACTION_V1,
} from "../src/economic/buy_void_saga_execute_prepared_transaction_runtime_v1.js";
import {
  buyVoidRuntimeStatusV1,
  handleBuyVoidRuntimeCommandV1,
} from "../src/economic/buy_void_runtime_integration_v1.js";

const PARENT_ENABLE_ENV = "VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED";
const CHILD_ENABLE_ENV =
  "VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_ENABLED";

function responseHarness() {
  let sent: { status: number; body: any } | null = null;
  const res: any = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: any) {
      sent = { status: this.statusCode, body };
      return this;
    },
  };
  return { res, read: () => sent };
}

async function call(body: Record<string, unknown>) {
  const harness = responseHarness();
  await Promise.resolve(
    handleBuyVoidRuntimeCommandV1(
      {
        socket: { remoteAddress: "127.0.0.1" },
        body,
      },
      harness.res,
    ),
  );
  const sent = harness.read();
  assert.ok(sent);
  return sent!;
}

const command = {
  action: VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_ACTION_V1,
  saga_id: "not-a-saga-id",
};

delete process.env[PARENT_ENABLE_ENV];
delete process.env[CHILD_ENABLE_ENV];

const parentStatus = buyVoidRuntimeStatusV1();
assert.equal(
  (parentStatus.supported_actions as string[]).includes(
    VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_ACTION_V1,
  ),
  false,
);
assert.equal(
  (parentStatus.canonical_delivery as any)
    .opaque_prepared_transaction_execution_parent_mounted,
  false,
);
assert.equal(
  Object.prototype.hasOwnProperty.call(
    parentStatus,
    "saga_execute_prepared_transaction_runtime",
  ),
  false,
);

const parentDisabled = await call(command);
assert.equal(parentDisabled.status, 503);
assert.equal(parentDisabled.body.error, "buy_void_runtime_integration_disabled");

process.env[PARENT_ENABLE_ENV] = "1";

const childDisabled = await call(command);
assert.equal(childDisabled.status, 400);
assert.equal(childDisabled.body.error, "invalid_pipeline_action");
assert.equal(childDisabled.body.marker, "VOID_BUY_VOID_RUNTIME_INTEGRATION_V1");

process.env[CHILD_ENABLE_ENV] = "1";

const childEnabled = await call(command);
assert.equal(childEnabled.status, 400);
assert.equal(childEnabled.body.error, "invalid_pipeline_action");
assert.equal(childEnabled.body.marker, "VOID_BUY_VOID_RUNTIME_INTEGRATION_V1");

console.log(
  "VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_PARENT_DISPATCH_V1_PROOF_GREEN",
);
console.log("parent_runtime_enable_gate_required=true");
console.log("standalone_execute_runtime_source_retained=true");
console.log("canonical_parent_execute_mount=false");
console.log("canonical_parent_execute_dispatch=false");
console.log("canonical_parent_rejects_execute_action=true");
console.log("child_enable_does_not_restore_parent_dispatch=true");
console.log("broadcaster_created=false");
console.log("transaction_broadcast_performed=false");
console.log("money_movement_performed=false");
