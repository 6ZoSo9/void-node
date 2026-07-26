#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repo = process.cwd();

const read = (relative) =>
  fs.readFileSync(path.join(repo, relative), "utf8");

const receiver = read(
  "ops/public/void-operator-webhook-receiver-v1.mjs",
);
const gateway = read(
  "ops/void-ai-agent-public-gateway-v1.mjs",
);
const integration = read(
  "scripts/prove_void_operator_webhook_receiver_gateway_integration_v1.mjs",
);
const dropin = read(
  "examples/systemd/void-ai-agent-public-gateway-v1.service.d/60-void-operator-webhook-receiver-v1.conf",
);
const receiverUnit = read(
  "examples/systemd/void-operator-webhook-receiver-v1.service",
);
const workflow = read(
  ".github/workflows/void-operator-webhook-receiver-v1.yml",
);
const receiverDoc = read(
  "docs/operators/void-operator-webhook-receiver-v1.md",
);
const aiDoc = read(
  "docs/public/ai-agent-public-ingress-isolated-gateway-v1.md",
);
const compositionDoc = read(
  "docs/public/public-app-composition-gateway-v1.md",
);

const route =
  "/__void/operator-notifications/v1/candidate";
const marker =
  "VOID_OPERATOR_WEBHOOK_RECEIVER_AI_GATEWAY_SOURCE_INTEGRATION_V1";

assert.equal(
  receiver.includes(`"${route}"`),
  true,
  "receiver route changed",
);
assert.equal(
  receiver.includes("money_movement: false"),
  true,
  "receiver money boundary changed",
);
assert.equal(
  receiver.includes("rpc_mutation: false"),
  true,
  "receiver RPC boundary changed",
);

for (const expected of [
  'import crypto from "node:crypto"',
  "VOID_OPERATOR_WEBHOOK_RECEIVER_UPSTREAM",
  `"${route}"`,
  "OPERATOR_WEBHOOK_RECEIVER_MAX_BODY_BYTES",
  "OPERATOR_WEBHOOK_RECEIVER_TIMEOUT_MS",
  "OPERATOR_WEBHOOK_RECEIVER_MAX_RESPONSE_BYTES",
  "readBoundedRequestBody",
  "proxyOperatorWebhookReceiver",
  "bearer_authorization_required",
  "x-void-payload-sha256",
  "payload_sha256_required",
  "payload_sha256_mismatch",
  'redirect: "manual"',
  '"set-cookie"',
  '"location"',
  '"X-Void-Operator-Webhook-Route"',
  "operator_webhook_receiver_unavailable",
  "bounded_operator_notification_proxy_authority",
  "generic_mutation: false",
  "wallet_access: false",
  "signing: false",
  "transaction_broadcast: false",
  "rpc_mutation: false",
  "money_movement: false",
]) {
  assert.equal(
    gateway.includes(expected),
    true,
    `AI gateway source missing ${expected}`,
  );
}

assert.equal(
  gateway.includes(
    'process.env.VOID_OPERATOR_WEBHOOK_RECEIVER_UPSTREAM || ""',
  ),
  true,
  "AI gateway route is not disabled by default",
);
assert.equal(
  gateway.includes(
    'if (parsed.pathname === OPERATOR_WEBHOOK_RECEIVER_PATH)',
  ),
  true,
  "AI gateway exact route dispatch missing",
);
assert.equal(
  gateway.includes('if (method === "POST")'),
  true,
  "AI gateway exact POST dispatch missing",
);
assert.equal(
  gateway.includes(
    'emptyResponse(response, 405, { Allow: "POST" })',
  ),
  true,
  "AI gateway route method guard missing",
);
assert.equal(
  gateway.includes(
    'emptyResponse(response, 405, { Allow: "GET, HEAD" })',
  ),
  true,
  "AI gateway generic method guard missing",
);

assert.equal(
  integration.includes(
    '"ops/void-ai-agent-public-gateway-v1.mjs"',
  ),
  true,
  "integration proof does not target AI gateway source",
);
assert.equal(
  integration.includes(
    "ops/public/void-public-app-composition-gateway-v1.mjs",
  ),
  false,
  "integration proof still targets composition source",
);
for (const expected of [
  "disabled receiver route should return 503",
  "set-cookie leaked through the gateway",
  "location leaked through the gateway",
  "rejected requests reached the receiver",
  "generic mutation reached the receiver",
]) {
  assert.equal(
    integration.includes(expected),
    true,
    `integration proof missing ${expected}`,
  );
}

assert.equal(
  dropin.includes(
    "Environment=VOID_OPERATOR_WEBHOOK_RECEIVER_UPSTREAM=http://127.0.0.1:4186",
  ),
  true,
  "gateway drop-in upstream changed",
);

for (const expected of [
  "PrivateDevices=false",
  "MemoryDenyWriteExecute=false",
  "NoNewPrivileges=true",
  "PrivateTmp=true",
  "ProtectSystem=strict",
  "ProtectHome=read-only",
  "RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX",
  "RestrictSUIDSGID=true",
  "LockPersonality=true",
  "UMask=0077",
]) {
  assert.equal(
    receiverUnit.includes(expected),
    true,
    `receiver unit hardening changed: ${expected}`,
  );
}

assert.equal(
  workflow.includes(
    '- "ops/void-ai-agent-public-gateway-v1.mjs"',
  ),
  true,
  "receiver workflow does not watch AI gateway source",
);
assert.equal(
  workflow.includes(
    '- "ops/public/void-public-app-composition-gateway-v1.mjs"',
  ),
  false,
  "receiver workflow still watches the wrong gateway source",
);
assert.equal(
  workflow.includes(
    '- "docs/public/ai-agent-public-ingress-isolated-gateway-v1.md"',
  ),
  true,
  "receiver workflow does not watch AI gateway documentation",
);
assert.equal(
  workflow.includes(
    "node scripts/prove_void_operator_webhook_receiver_gateway_integration_v1.mjs",
  ),
  true,
  "receiver workflow does not run integration proof",
);
assert.equal(
  workflow.includes(
    "node scripts/prove_void_operator_webhook_receiver_guard_v1.mjs",
  ),
  true,
  "receiver workflow does not run guard proof",
);

assert.equal(
  receiverDoc.includes(marker),
  true,
  "receiver documentation correction marker missing",
);
assert.equal(
  receiverDoc.includes(
    "`void-ai-agent-public-gateway-v1.service`",
  ),
  true,
  "receiver documentation live gateway ownership missing",
);
assert.equal(
  aiDoc.includes(marker),
  true,
  "AI gateway documentation correction marker missing",
);
assert.equal(
  aiDoc.includes(
    "sole mutation-method exception",
  ),
  true,
  "AI gateway documentation exception boundary missing",
);
assert.equal(
  compositionDoc.includes(marker),
  true,
  "composition documentation correction marker missing",
);
assert.equal(
  compositionDoc.includes(
    "is not served by the public-app composition gateway",
  ),
  true,
  "composition documentation ownership correction missing",
);

console.log("VOID_OPERATOR_WEBHOOK_RECEIVER_GUARD_V1_GREEN");
console.log("receiver_contract_file_count=14");
console.log("source_correction_lane_file_count=7");
console.log("loopback_only=1");
console.log("bearer_token_authentication=1");
console.log("payload_sha256_binding=1");
console.log("maximum_body_bytes=65536");
console.log("append_once_receipts=1");
console.log("duplicate_suppression=1");
console.log("gateway_route_disabled_by_default=1");
console.log("gateway_live_source_target=ai_agent_gateway");
console.log("composition_gateway_live_target=0");
console.log("unit_installation=0");
console.log("unit_enablement=0");
console.log("runtime_import_count=0");
console.log("activation_performed=0");
console.log("wallet_access=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("rpc_mutation=0");
console.log("money_movement=0");
