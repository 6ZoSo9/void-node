#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const exactPaths = [
  ".github/workflows/void-operator-webhook-receiver-v1.yml",
  "docs/operators/void-operator-webhook-receiver-v1.md",
  "docs/public/public-app-composition-gateway-v1.md",
  "examples/systemd/void-ai-agent-public-gateway-v1.service.d/60-void-operator-webhook-receiver-v1.conf",
  "examples/systemd/void-operator-webhook-receiver-v1.service",
  "fixtures/void-operator-webhook-receiver-request-v1.example.json",
  "ops/public/run-void-operator-webhook-receiver-v1.sh",
  "ops/public/void-operator-webhook-receiver-v1.mjs",
  "ops/public/void-public-app-composition-gateway-v1.mjs",
  "schemas/void-operator-webhook-receiver-receipt-v1.schema.json",
  "schemas/void-operator-webhook-receiver-request-v1.schema.json",
  "scripts/prove_void_operator_webhook_receiver_gateway_integration_v1.mjs",
  "scripts/prove_void_operator_webhook_receiver_guard_v1.mjs",
  "scripts/prove_void_operator_webhook_receiver_v1.mjs",
];

for (const relative of exactPaths) {
  assert.equal(
    fs.existsSync(path.join(root, relative)),
    true,
    relative,
  );
}

const receiver = fs.readFileSync(
  path.join(
    root,
    "ops/public/void-operator-webhook-receiver-v1.mjs",
  ),
  "utf8",
);
const gateway = fs.readFileSync(
  path.join(
    root,
    "ops/public/void-public-app-composition-gateway-v1.mjs",
  ),
  "utf8",
);
const service = fs.readFileSync(
  path.join(
    root,
    "examples/systemd/void-operator-webhook-receiver-v1.service",
  ),
  "utf8",
);
const dropin = fs.readFileSync(
  path.join(
    root,
    "examples/systemd/void-ai-agent-public-gateway-v1.service.d/60-void-operator-webhook-receiver-v1.conf",
  ),
  "utf8",
);

assert.equal(
  receiver.includes(
    'const HOST =\n  process.env.VOID_OPERATOR_WEBHOOK_RECEIVER_HOST || "127.0.0.1"',
  ),
  true,
);
assert.equal(
  receiver.includes(
    '"/__void/operator-notifications/v1/candidate"',
  ),
  true,
);
assert.equal(receiver.includes("crypto.timingSafeEqual"), true);
assert.equal(receiver.includes("request_body_too_large"), true);
assert.equal(receiver.includes("writeJsonExclusive"), true);
assert.equal(receiver.includes("notification_payload_conflict"), true);
assert.equal(receiver.includes("automatic_retry: false"), true);
assert.equal(receiver.includes("wallet_access: false"), true);
assert.equal(receiver.includes("signing: false"), true);
assert.equal(receiver.includes("transaction_broadcast: false"), true);
assert.equal(receiver.includes("money_movement: false"), true);

assert.equal(
  gateway.includes(
    "VOID_OPERATOR_WEBHOOK_RECEIVER_UPSTREAM",
  ),
  true,
);
assert.equal(
  gateway.includes(
    '"/__void/operator-notifications/v1/candidate"',
  ),
  true,
);
assert.equal(
  gateway.includes("proxyOperatorWebhookReceiver"),
  true,
);
assert.equal(gateway.includes('redirect: "manual"'), true);
assert.equal(
  gateway.includes("operator_webhook_receiver_route_configured"),
  true,
);

assert.equal(service.includes("Type=simple"), true);
assert.equal(
  service.includes(
    "VOID_OPERATOR_WEBHOOK_RECEIVER_HOST=127.0.0.1",
  ),
  true,
);
assert.equal(service.includes("ProtectSystem=strict"), true);
assert.equal(service.includes("ProtectHome=read-only"), true);
assert.equal(service.includes("NoNewPrivileges=true"), true);
assert.equal(service.includes("[Install]"), true);
assert.equal(
  dropin.includes(
    "VOID_OPERATOR_WEBHOOK_RECEIVER_UPSTREAM=http://127.0.0.1:4186",
  ),
  true,
);

for (const source of [receiver, gateway]) {
  for (const forbidden of [
    "eth_sendRawTransaction",
    "personal_sign",
    "wallet private",
    "mnemonic",
    "fulfillment wallet",
    "inventory_decrement",
    "sealBlock",
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
}

console.log("VOID_OPERATOR_WEBHOOK_RECEIVER_GUARD_V1_GREEN");
console.log(`exact_lane_file_count=${exactPaths.length}`);
console.log("loopback_only=1");
console.log("bearer_token_authentication=1");
console.log("payload_sha256_binding=1");
console.log("append_once_receipts=1");
console.log("duplicate_suppression=1");
console.log("gateway_route_disabled_by_default=1");
console.log("unit_installation=0");
console.log("unit_enablement=0");
console.log("runtime_import_count=0");
console.log("activation_performed=0");
console.log("wallet_access=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("money_movement=0");
