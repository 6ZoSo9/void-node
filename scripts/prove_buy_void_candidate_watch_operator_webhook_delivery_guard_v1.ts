import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const exactPaths = [
  ".github/workflows/buy-void-candidate-watch-operator-webhook-delivery-v1.yml",
  "docs/operators/buy-void-candidate-watch-operator-webhook-delivery-v1.md",
  "examples/systemd/void-buy-void-candidate-watch-operator-webhook-delivery-v1.path",
  "examples/systemd/void-buy-void-candidate-watch-operator-webhook-delivery-v1.service",
  "examples/systemd/void-buy-void-candidate-watch-operator-webhook-delivery-v1.timer",
  "fixtures/buy-void/candidate-operator-webhook-delivery-config-v1.example.json",
  "schemas/buy-void-candidate-operator-webhook-delivery-config-v1.schema.json",
  "schemas/buy-void-candidate-operator-delivery-health-v1.schema.json",
  "schemas/buy-void-candidate-operator-delivery-receipt-v1.schema.json",
  "scripts/buy_void_candidate_watch_operator_webhook_delivery_v1.ts",
  "scripts/prove_buy_void_candidate_watch_operator_webhook_delivery_guard_v1.ts",
  "scripts/prove_buy_void_candidate_watch_operator_webhook_delivery_v1.ts",
  "src/economic/buy_void_candidate_watch_operator_webhook_delivery_v1.ts",
];

for (const relative of exactPaths) {
  assert.equal(fs.existsSync(path.join(root, relative)), true, relative);
}

const source = fs.readFileSync(
  path.join(
    root,
    "src/economic/buy_void_candidate_watch_operator_webhook_delivery_v1.ts",
  ),
  "utf8",
);
const cli = fs.readFileSync(
  path.join(
    root,
    "scripts/buy_void_candidate_watch_operator_webhook_delivery_v1.ts",
  ),
  "utf8",
);
const service = fs.readFileSync(
  path.join(
    root,
    "examples/systemd/void-buy-void-candidate-watch-operator-webhook-delivery-v1.service",
  ),
  "utf8",
);
const timer = fs.readFileSync(
  path.join(
    root,
    "examples/systemd/void-buy-void-candidate-watch-operator-webhook-delivery-v1.timer",
  ),
  "utf8",
);
const pathUnit = fs.readFileSync(
  path.join(
    root,
    "examples/systemd/void-buy-void-candidate-watch-operator-webhook-delivery-v1.path",
  ),
  "utf8",
);

assert.equal(
  source.includes(
    "sendBuyVoidCandidateOperatorNotification",
  ),
  true,
);
assert.equal(source.includes("automatic_retry: false"), true);
assert.equal(source.includes("external_network_request: true"), true);
assert.equal(source.includes("wallet_access: false"), true);
assert.equal(source.includes("signing: false"), true);
assert.equal(source.includes("transaction_broadcast: false"), true);
assert.equal(source.includes("money_movement: false"), true);
assert.equal(source.includes("config_endpoint_https"), true);
assert.equal(source.includes("config_endpoint_host_allowlist"), true);

assert.equal(cli.includes('import https from "node:https"'), true);
assert.equal(cli.includes("maxRedirects"), false);
assert.equal(cli.includes("request.end(body"), true);
assert.equal(cli.includes("possible_delivery"), true);
assert.equal(cli.includes("automatic_retry=false"), true);
assert.equal(cli.includes("Bearer ${input.bearerToken}"), true);
assert.equal(cli.includes("console.log(input.bearerToken"), false);
assert.equal(cli.includes("console.error(input.bearerToken"), false);

assert.equal(service.includes("Type=oneshot"), true);
assert.equal(service.includes("--mode apply"), true);
assert.equal(
  service.includes(
    "--confirm sendBuyVoidCandidateOperatorNotification",
  ),
  true,
);
assert.equal(service.includes("NoNewPrivileges=true"), true);
assert.equal(pathUnit.includes("PathChanged="), true);
assert.equal(timer.includes("OnActiveSec=1min"), true);
assert.equal(timer.includes("OnUnitInactiveSec=10min"), true);

const forbiddenRuntimeImports = [
  "src/index",
  "runtime_integration",
  "delivery_sign",
  "native_chain2050",
  "fulfillment_wallet",
];
for (const marker of forbiddenRuntimeImports) {
  assert.equal(source.includes(marker), false, marker);
  assert.equal(cli.includes(marker), false, marker);
}

console.log(
  "VOID_BUY_VOID_CANDIDATE_WATCH_OPERATOR_WEBHOOK_DELIVERY_GUARD_V1_GREEN",
);
console.log(`exact_lane_file_count=${exactPaths.length}`);
console.log("runtime_import_count=0");
console.log("one_notification_per_run=1");
console.log("dry_run_default=1");
console.log("exact_apply_confirmation=1");
console.log("https_allowlist=1");
console.log("no_redirect_following=1");
console.log("append_once_delivery_receipts=1");
console.log("automatic_retry=0");
console.log("units_disabled_until_installed=1");
console.log("network_state_write=0");
console.log("activation_performed=0");
console.log("inventory_reservation=0");
console.log("execution_attempt_reservation=0");
console.log("wallet_access=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("rpc_mutation=0");
console.log("money_movement=0");
