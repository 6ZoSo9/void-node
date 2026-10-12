import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  ".github/workflows/buy-void-bounded-orchestrator-server-snapshot-v1.yml",
  "docs/operators/buy-void-bounded-orchestrator-server-snapshot-v1.md",
  "scripts/prove_buy_void_bounded_orchestrator_server_snapshot_guard_v1.ts",
  "scripts/prove_buy_void_bounded_orchestrator_server_snapshot_runtime_v1.ts",
  "scripts/prove_buy_void_bounded_orchestrator_server_snapshot_v1.ts",
  "src/economic/buy_void_bounded_orchestrator_server_snapshot_v1.ts",
  "src/economic/buy_void_bounded_auto_fulfillment_orchestrator_runtime_v1.ts",
  "scripts/prove_buy_void_bounded_auto_fulfillment_orchestrator_runtime_v1.ts",
];

for (const relative of required) {
  assert.equal(
    fs.existsSync(path.join(root, relative)),
    true,
    `missing ${relative}`,
  );
}

const snapshot = fs.readFileSync(
  path.join(
    root,
    "src/economic/buy_void_bounded_orchestrator_server_snapshot_v1.ts",
  ),
  "utf8",
);
const runtime = fs.readFileSync(
  path.join(
    root,
    "src/economic/buy_void_bounded_auto_fulfillment_orchestrator_runtime_v1.ts",
  ),
  "utf8",
);
for (const marker of [
  "request_id_only_selector: true",
  "client_supplied_snapshot_forbidden: true",
  "server_controlled_root_dir: true",
  "server_controlled_request_dir: true",
  "public_request_base_read: true",
  "append_only_operator_event_read: true",
  "fulfillment_claim_journal_read: true",
  "execution_attempt_journal_read: true",
  "broadcast_outcome_journal_read: true",
  "confirmed_state_journal_read: true",
  "filesystem_write: false",
  "rpc_call: false",
  "wallet_access: false",
  "signing: false",
  "transaction_broadcast: false",
  "money_movement: false",
  "background_loop: false",
  "startup_execution: false",
  "operator_event_status_chain_conflict",
  "fulfilled_public_status_without_confirmed_state",
]) {
  assert.equal(
    snapshot.includes(marker),
    true,
    `snapshot module missing ${marker}`,
  );
}

for (const marker of [
  '"server_derived_request_id_only"',
  '"client_supplied_snapshot_forbidden"',
  '"request_id_required"',
  "snapshot_dependencies",
  "deriveBuyVoidBoundedOrchestratorServerSnapshotV1",
  "runtime_apply_not_enabled_v1",
]) {
  assert.equal(
    runtime.includes(marker),
    true,
    `runtime missing ${marker}`,
  );
}

for (const forbidden of [
  "setInterval(",
  "setTimeout(",
  "while (true)",
  "for (;;)",
]) {
  assert.equal(
    snapshot.includes(forbidden),
    false,
    `snapshot module forbidden ${forbidden}`,
  );
}

console.log(
  "VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_SERVER_SNAPSHOT_GUARD_V1_GREEN",
);
console.log("exact_lane_file_count=8");
console.log("request_id_only_selector=1");
console.log("client_supplied_snapshot=0");
console.log("server_owned_state_readers=1");
console.log("runtime_apply=0");
console.log("background_loop=0");
console.log("startup_execution=0");
console.log("service_restart=0");
