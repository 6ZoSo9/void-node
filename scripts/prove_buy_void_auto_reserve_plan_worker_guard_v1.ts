import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  VOID_BUY_VOID_AUTO_RESERVE_PLAN_AUTHORITY_V1,
  VOID_BUY_VOID_AUTO_RESERVE_PLAN_CONFIRMATION_V1,
} from "../src/economic/buy_void_auto_reserve_plan_worker_v1.js";
import {
  VOID_BUY_VOID_INVENTORY_RESERVATION_AUTHORITY_V1,
} from "../src/economic/buy_void_inventory_reservation_journal_v1.js";

const sourceFiles = [
  "src/economic/buy_void_inventory_reservation_journal_v1.ts",
  "src/economic/buy_void_auto_reserve_plan_worker_v1.ts",
];

const proofFiles = [
  "scripts/prove_buy_void_inventory_reservation_journal_v1.ts",
  "scripts/prove_buy_void_auto_reserve_plan_worker_v1.ts",
  "scripts/prove_buy_void_auto_reserve_plan_worker_guard_v1.ts",
];

for (const relative of [...sourceFiles, ...proofFiles]) {
  assert.equal(fs.existsSync(path.resolve(relative)), true, relative);
}

assert.equal(
  VOID_BUY_VOID_AUTO_RESERVE_PLAN_CONFIRMATION_V1,
  "buyVoidAutoReservePlan",
);

assert.deepEqual(
  VOID_BUY_VOID_AUTO_RESERVE_PLAN_AUTHORITY_V1,
  {
    one_request_per_run: true,
    disabled_by_policy_default: true,
    dry_by_default: true,
    exact_confirmation_required: true,
    server_controlled_policy: true,
    fulfillment_claim_required: true,
    aggregate_inventory_reservation_on_apply: true,
    execution_attempt_reservation_on_apply: true,
    request_journal_write: false,
    inventory_decrement: false,
    inventory_release: false,
    wallet_access: false,
    signing: false,
    transaction_broadcast: false,
    runtime_route_mount: false,
    background_loop: false,
    money_movement: false,
  },
);

assert.deepEqual(
  VOID_BUY_VOID_INVENTORY_RESERVATION_AUTHORITY_V1,
  {
    filesystem_read: true,
    filesystem_write: true,
    aggregate_inventory_reservation: true,
    duplicate_safe_reservation: true,
    global_pool_lock: true,
    paid_unreservable_terminal_obligation: true,
    durable_history_expected_set_commitment: true,
    durable_history_filename_content_identity: true,
    durable_history_creation_recovery: true,
    durable_history_separate_anchor_authority: true,
    durable_history_coherent_suffix_rollback_detection: true,
    stale_pool_lock_recovery: true,
    obligation_automatic_retry: false,
    obligation_refund_execution_authorized: false,
    inventory_decrement: false,
    reservation_release: false,
    sold_out_closeout: false,
    request_journal_write: false,
    rpc_call: false,
    wallet_access: false,
    signing: false,
    transaction_broadcast: false,
    runtime_route_mount: false,
    money_movement: false,
  },
);

const sourceText = sourceFiles
  .map((relative) => fs.readFileSync(relative, "utf8"))
  .join("\n");

for (const forbidden of [
  "eth_sendRawTransaction",
  "sendRawTransaction",
  "private_key",
  "privateKey",
  "signTransaction",
  "signingKey",
  "buy_void_native_chain2050_broadcaster_v1",
  "recordBuyVoidExecutionBroadcastV1",
  "prepareBuyVoidExecutionTransactionV1",
  "app.post(",
  "router.post(",
  "setInterval(",
  "setTimeout(",
]) {
  assert.equal(
    sourceText.includes(forbidden),
    false,
    `forbidden source token: ${forbidden}`,
  );
}

assert.equal(
  sourceText.includes("reserveBuyVoidExecutionAttemptV1"),
  true,
);
assert.equal(
  sourceText.includes("reserveBuyVoidInventoryV1"),
  true,
);
assert.equal(
  sourceText.includes("buyVoidAutoReservePlan"),
  true,
);
assert.equal(
  sourceText.includes("one_request_per_run: true"),
  true,
);
assert.equal(
  sourceText.includes("automatic_delivery_authorized: false"),
  true,
);
assert.equal(
  sourceText.includes("money_movement_authorized: false"),
  true,
);

assert.equal(fs.existsSync("src/index.ts"), true);
const indexText = fs.readFileSync("src/index.ts", "utf8");
assert.equal(
  indexText.includes("buy_void_auto_reserve_plan_worker_v1"),
  false,
);
assert.equal(
  indexText.includes("buy_void_inventory_reservation_journal_v1"),
  false,
);

console.log("VOID_BUY_VOID_AUTO_RESERVE_PLAN_WORKER_GUARD_V1_GREEN");
console.log("source_file_count=2");
console.log("proof_file_count=3");
console.log("aggregate_inventory_reservation=source_complete");
console.log("execution_attempt_reservation=source_complete");
console.log("runtime_integration_modified=0");
console.log("src_index_modified=0");
console.log("startup_execution=0");
console.log("request_journal_write=0");
console.log("inventory_decrement=0");
console.log("inventory_release=0");
console.log("wallet_access=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("money_movement=0");
console.log(
  "verdict=BUY_VOID_AUTO_RESERVE_PLAN_WORKER_GUARD_EXACT_GREEN",
);
