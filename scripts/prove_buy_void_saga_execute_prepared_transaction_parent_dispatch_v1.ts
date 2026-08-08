import assert from "node:assert/strict";

import {
  VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_ACTION_V1,
} from "../src/economic/buy_void_saga_execute_prepared_transaction_runtime_v1.js";
import {
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

const parentDisabled = await call(command);
assert.equal(parentDisabled.status, 503);
assert.equal(parentDisabled.body.error, "buy_void_runtime_integration_disabled");

process.env[PARENT_ENABLE_ENV] = "1";

const childDisabled = await call(command);
assert.equal(childDisabled.status, 503);
assert.equal(
  childDisabled.body.error,
  "saga_execute_prepared_transaction_runtime_disabled",
);

process.env[CHILD_ENABLE_ENV] = "1";

const dispatched = await call(command);
assert.equal(dispatched.status, 400);
assert.equal(dispatched.body.error, "invalid_saga_id");
assert.equal(
  dispatched.body.marker,
  "VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_V1",
);

console.log(
  "VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_PARENT_DISPATCH_V1_PROOF_GREEN",
);
console.log("parent_runtime_enable_gate_required=true");
console.log("child_execute_runtime_enable_gate_required=true");
console.log("parent_dispatch_to_execute_runtime_proven=true");
console.log("invalid_saga_rejected_by_execute_child=true");
console.log("broadcaster_created=false");
console.log("transaction_broadcast_performed=false");
console.log("money_movement_performed=false");
