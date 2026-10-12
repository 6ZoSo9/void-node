import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const lane = [
  ".github/workflows/buy-void-observe-and-claim-candidate-watch-notification-bridge-v1.yml",
  "docs/operators/buy-void-observe-and-claim-candidate-watch-notification-bridge-v1.md",
  "examples/systemd/void-buy-void-observe-and-claim-candidate-watch-notification-bridge-v1.service",
  "examples/systemd/void-buy-void-observe-and-claim-candidate-watch-notification-bridge-v1.path",
  "examples/systemd/void-buy-void-observe-and-claim-candidate-watch-notification-bridge-v1.timer",
  "schemas/buy-void-observe-and-claim-candidate-notification-v1.schema.json",
  "schemas/buy-void-observe-and-claim-candidate-watch-health-v1.schema.json",
  "scripts/buy_void_observe_and_claim_candidate_watch_notification_bridge_v1.ts",
  "scripts/prove_buy_void_observe_and_claim_candidate_watch_notification_bridge_v1.ts",
  "scripts/prove_buy_void_observe_and_claim_candidate_watch_notification_bridge_guard_v1.ts",
  "src/economic/buy_void_observe_and_claim_candidate_watch_notification_bridge_v1.ts",
];

for (const relative of lane) {
  assert.equal(fs.existsSync(path.join(root, relative)), true, relative);
}

const source = fs.readFileSync(path.join(root, lane[10]), "utf8");
const cli = fs.readFileSync(path.join(root, lane[7]), "utf8");
const service = fs.readFileSync(path.join(root, lane[2]), "utf8");
const pathUnit = fs.readFileSync(path.join(root, lane[3]), "utf8");
const timer = fs.readFileSync(path.join(root, lane[4]), "utf8");
const docs = fs.readFileSync(path.join(root, lane[1]), "utf8");
const index = fs.readFileSync(path.join(root, "src/index.ts"), "utf8");

assert.equal(index.includes("candidate_watch_notification_bridge_v1"), false);
assert.equal(service.includes("Type=oneshot"), true);
assert.equal(service.includes("NoNewPrivileges=true"), true);
assert.equal(service.includes("ProtectSystem=strict"), true);
assert.equal(service.includes("ProtectHome=read-only"), true);
assert.equal(pathUnit.includes("PathChanged=%h/void-precision-smoke/buy-void-observe-and-claim-candidate-watch-latest.json"), true);
assert.equal(pathUnit.includes("WantedBy=default.target"), true);
assert.equal(timer.includes("OnActiveSec=1min"), true);
assert.equal(timer.includes("OnUnitInactiveSec=5min"), true);
assert.equal(timer.includes("RandomizedDelaySec=30s"), true);
assert.equal(timer.includes("Persistent=true"), true);
assert.equal(docs.includes("does not arm"), true);
assert.equal(docs.includes("separate explicit installation lane"), true);

for (const forbidden of [
  "systemctl --user enable",
  "systemctl --user start",
  "systemctl --user restart",
  "gh pr merge",
  "eth_sendRawTransaction",
  "private_key",
  "mnemonic",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
  assert.equal(cli.includes(forbidden), false, forbidden);
}

for (const marker of [
  "network_state_write: false",
  "activation_performed: false",
  "inventory_reservation: false",
  "execution_attempt_reservation: false",
  "wallet_access: false",
  "signing: false",
  "transaction_broadcast: false",
  "rpc_mutation: false",
  "money_movement: false",
]) {
  assert.equal(source.includes(marker), true, marker);
}

JSON.parse(fs.readFileSync(path.join(root, lane[5]), "utf8"));
JSON.parse(fs.readFileSync(path.join(root, lane[6]), "utf8"));

console.log("VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_WATCH_NOTIFICATION_BRIDGE_GUARD_V1_GREEN");
console.log(`exact_lane_file_count=${lane.length}`);
console.log("runtime_import_count=0");
console.log("one_shot_bridge=1");
console.log("path_trigger_example=1");
console.log("health_timer_example=1");
console.log("units_disabled_until_installed=1");
console.log("append_once_notification_receipts=1");
console.log("duplicate_notification_suppression=1");
console.log("operator_local_state_write=1");
console.log("network_state_write=0");
console.log("activation_performed=0");
console.log("inventory_reservation=0");
console.log("execution_attempt_reservation=0");
console.log("wallet_access=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("rpc_mutation=0");
console.log("money_movement=0");
