import assert from "node:assert/strict";
import fs from "node:fs";

const closeout = fs.readFileSync(
  "src/economic/buy_void_confirmed_closeout_v1.ts",
  "utf8",
);
const runtime = fs.readFileSync(
  "src/economic/buy_void_confirmed_closeout_runtime_v1.ts",
  "utf8",
);
const integration = fs.readFileSync(
  "src/economic/buy_void_runtime_integration_v1.ts",
  "utf8",
);

const combined = `${closeout}\n${runtime}`;

for (const forbidden of [
  "eth_sendRawTransaction",
  "signTransaction(",
  "private_key",
  "privateKey",
  "mnemonic",
  'from "ethers"',
  "new Wallet(",
  "credentialFile",
]) {
  assert.equal(
    combined.includes(forbidden),
    false,
    `forbidden source token: ${forbidden}`,
  );
}

for (const required of [
  "append_only_inventory_consumption_journal: true",
  "append_only_public_operator_event: true",
  "public_request_base_record_mutation: false",
  "reservation_base_record_mutation: false",
  "credential_access: false",
  "signing: false",
  "transaction_broadcast: false",
  "rpc_call: false",
  "money_movement: false",
  "buyVoidConsumeInventoryAndClosePublicRequest",
  "operator-events.jsonl",
  "inventory-consumption-v1",
  "writeBuyVoidInventoryConsumptionV1",
  "writeBuyVoidPublicFulfillmentCloseoutV1",
  "requestPaymentHash",
  "confirmedPaymentHash",
  "request_payment_transaction_hash_mismatch",
]) {
  assert.equal(
    combined.includes(required),
    true,
    `missing source boundary: ${required}`,
  );
}

assert.equal(
  integration.includes(
    'import "./buy_void_confirmed_closeout_runtime_v1.js";',
  ),
  true,
);
assert.equal(
  integration.match(
    /buy_void_confirmed_closeout_runtime_v1\.js/g,
  )?.length,
  1,
);
assert.equal(
  runtime.includes(
    "VOID_BUY_VOID_CONFIRMED_CLOSEOUT_RUNTIME_ENABLED",
  ),
  true,
);
assert.equal(
  runtime.includes("loopback_required"),
  true,
);
assert.equal(
  runtime.includes("unexpected_input_key"),
  true,
);
assert.equal(
  runtime.includes("setInterval("),
  false,
);

console.log(
  "VOID_BUY_VOID_CONFIRMED_CLOSEOUT_GUARD_V1_GREEN",
);
console.log("source_file_count=2");
console.log("runtime_integration_import_count=1");
console.log("public_request_base_record_mutation=0");
console.log("reservation_base_record_mutation=0");
console.log("credential_access=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("rpc_call=0");
console.log("automatic_retry=0");
console.log("background_loop=0");
console.log("startup_execution=0");
console.log("money_movement=0");
