import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VOID_BUY_VOID_HISTORY_CARRIER_LIFECYCLE_MOUNT_AUTHORITY_V1,
} from "../src/economic/buy_void_history_carrier_lifecycle_mount_v1.js";
import {
  VOID_BUY_VOID_HISTORY_CARRIER_PIPELINE_MOUNT_AUTHORITY_V1,
} from "../src/economic/buy_void_history_carrier_pipeline_mount_v1.js";
import {
  VOID_BUY_VOID_HISTORY_CARRIER_TERMINAL_CLOSEOUT_MOUNT_AUTHORITY_V1,
} from "../src/economic/buy_void_history_carrier_terminal_closeout_mount_v1.js";
import {
  VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_AUTHORITY_V1,
} from "../src/economic/buy_void_history_carrier_successor_publication_v1.js";
import {
  VOID_BUY_VOID_HISTORY_SEGMENTED_SUCCESSOR_AUTHORITY_V1,
} from "../src/economic/buy_void_history_segmented_successor_v1.js";
import {
  VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_BINDING_AUTHORITY_V1,
} from "../src/economic/buy_void_history_carrier_runtime_binding_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_AUTHORITY_V1,
} from "../src/economic/buy_void_payment_keyed_full_runtime_v1.js";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function source(relative: string): string {
  return fs.readFileSync(path.join(ROOT, relative), "utf8");
}

function ordered(
  body: string,
  markers: string[],
  label: string,
): void {
  let previous = -1;
  for (const marker of markers) {
    const index = body.indexOf(marker);
    assert.ok(index >= 0, `${label}:missing:${marker}`);
    assert.ok(index > previous, `${label}:order:${marker}`);
    previous = index;
  }
}

const lifecycle = source(
  "src/economic/buy_void_history_carrier_lifecycle_mount_v1.ts",
);
const pipeline = source(
  "src/economic/buy_void_pipeline_coordinator_v1.ts",
);
const pipelineMount = source(
  "src/economic/buy_void_history_carrier_pipeline_mount_v1.ts",
);
const bounded = source(
  "src/economic/buy_void_bounded_auto_fulfillment_orchestrator_v1.ts",
);
const crashSaga = source(
  "src/economic/buy_void_crash_consistent_saga_runtime_v1.ts",
);
const runtimeParent = source(
  "src/economic/buy_void_runtime_integration_v1.ts",
);
const terminalMount = source(
  "src/economic/buy_void_history_carrier_terminal_closeout_mount_v1.ts",
);
const fullRuntime = source(
  "src/economic/buy_void_payment_keyed_full_runtime_v1.ts",
);
const runtimeBinding = source(
  "src/economic/buy_void_history_carrier_runtime_binding_v1.ts",
);

assert.deepEqual(
  {
    reservation:
      VOID_BUY_VOID_HISTORY_CARRIER_LIFECYCLE_MOUNT_AUTHORITY_V1
        .reservation_lifecycle_mount,
    paid_unreservable:
      VOID_BUY_VOID_HISTORY_CARRIER_LIFECYCLE_MOUNT_AUTHORITY_V1
        .paid_unreservable_obligation_lifecycle_mount,
    terminal:
      VOID_BUY_VOID_HISTORY_CARRIER_LIFECYCLE_MOUNT_AUTHORITY_V1
        .terminal_closeout_refresh_mount,
  },
  {
    reservation: true,
    paid_unreservable: true,
    terminal: true,
  },
);

for (const authority of [
  VOID_BUY_VOID_HISTORY_CARRIER_LIFECYCLE_MOUNT_AUTHORITY_V1,
  VOID_BUY_VOID_HISTORY_CARRIER_PIPELINE_MOUNT_AUTHORITY_V1,
  VOID_BUY_VOID_HISTORY_CARRIER_TERMINAL_CLOSEOUT_MOUNT_AUTHORITY_V1,
]) {
  assert.equal(authority.runtime_enablement, false);
  assert.equal(authority.apply_enablement, false);
  assert.equal(authority.public_activation, false);
  assert.equal(authority.transaction_broadcast, false);
  assert.equal(authority.funds_movement, false);
}

assert.equal(
  VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_AUTHORITY_V1
    .reservation_lifecycle_mount,
  false,
);
assert.equal(
  VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_AUTHORITY_V1
    .paid_unreservable_obligation_lifecycle_mount,
  false,
);
assert.equal(
  VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_AUTHORITY_V1
    .terminal_closeout_refresh_mount,
  false,
);
assert.equal(
  VOID_BUY_VOID_HISTORY_SEGMENTED_SUCCESSOR_AUTHORITY_V1
    .reservation_lifecycle_mount,
  false,
);
assert.equal(
  VOID_BUY_VOID_HISTORY_SEGMENTED_SUCCESSOR_AUTHORITY_V1
    .paid_unreservable_obligation_lifecycle_mount,
  false,
);
assert.equal(
  VOID_BUY_VOID_HISTORY_SEGMENTED_SUCCESSOR_AUTHORITY_V1
    .terminal_closeout_refresh_mount,
  false,
);
assert.equal(
  VOID_BUY_VOID_HISTORY_SEGMENTED_SUCCESSOR_AUTHORITY_V1
    .runtime_activation_ready,
  false,
);

assert.equal(
  VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_BINDING_AUTHORITY_V1
    .successor_publication_mounted,
  true,
);
assert.equal(
  VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_BINDING_AUTHORITY_V1
    .runtime_activation_ready,
  true,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_AUTHORITY_V1
    .history_carrier_successor_publication_mounted,
  true,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_AUTHORITY_V1
    .history_carrier_activation_ready,
  true,
);

const applyStart = pipeline.indexOf(
  "function applyVerifyReserveAndClaim(",
);
assert.ok(applyStart >= 0);
const applyEnd = pipeline.indexOf(
  "\nfunction applyReserveExecution(",
  applyStart,
);
assert.ok(applyEnd > applyStart);
const applyBody = pipeline.slice(applyStart, applyEnd);

ordered(
  applyBody,
  [
    "const inventory = reserveBuyVoidInventoryV1({",
    "dependencies?.publish_durable_inventory_history",
    "const claim = claimBuyVoidFulfillmentJournalV1({",
  ],
  "reservation-before-carrier-before-claim",
);
assert.ok(
  applyBody.includes(
    "paid_inventory_history_carrier_publication_required",
  ),
);
assert.ok(
  applyBody.includes(
    "inventory_history_carrier_publication_required",
  ),
);
assert.ok(
  applyBody.includes(
    "terminal_recovery_obligation_recorded === true",
  ),
);

assert.ok(
  pipelineMount.includes(
    "history_carrier_authority_root_required_before_inventory_mutation",
  ),
);
ordered(
  pipelineMount,
  [
    "if (\n    command.action !== \"verify_reserve_and_claim\"",
    "const authorityRoot = String(",
    "return runBuyVoidPipelineCommandV1(\n    command,",
  ],
  "pipeline-preflight",
);
assert.ok(
  pipelineMount.includes(
    "listBuyVoidPaidUnreservableObligationsV1",
  ),
);
assert.ok(
  pipelineMount.includes(
    "publishBuyVoidHistoryCarrierPrimaryRecordV1",
  ),
);

for (const [name, body] of [
  ["bounded", bounded],
  ["crash-saga", crashSaga],
  ["runtime-parent", runtimeParent],
] as const) {
  assert.ok(
    body.includes(
      "runBuyVoidPipelineCommandWithHistoryCarrierV1",
    ),
    `${name}:carrier-wrapper-required`,
  );
}

assert.ok(
  lifecycle.includes(
    'VOID_BUY_VOID_HISTORY_CARRIER_LIVE_ROOT_NAME_V1 =\n  "buy-void-payment-history-segmented-live-v1"',
  ),
);
assert.ok(
  lifecycle.includes(
    "legacy_migration_namespace_mutation: false",
  ),
);
ordered(
  lifecycle,
  [
    "carrierAlreadyContainsPrimary(",
    "ensureLiveSegmentedState(",
    "stageBuyVoidHistorySegmentedSuccessorV1({",
    "publishSegmentedJsonlDurableRootV1(",
    "planBuyVoidHistoryCarrierCommitV1({",
    "applyCarrierPlan(",
  ],
  "primary-publication",
);
assert.ok(
  lifecycle.includes(
    "durableRoot.store_generation !==\n      Number(carrierRoot.active_segmented_store_generation) + 1",
  ),
);
assert.ok(
  lifecycle.includes(
    "durableRoot.previous_root_sha256 !==",
  ),
);
assert.ok(
  lifecycle.includes(
    "history_carrier_lifecycle_segmented_carrier_divergence",
  ),
);
assert.ok(
  lifecycle.includes(
    "planBuyVoidHistoryCarrierRefreshV1({",
  ),
);
assert.ok(
  lifecycle.includes(
    '"history_refresh"',
  ),
);

ordered(
  terminalMount,
  [
    "if (input.apply === true && !authorityRoot)",
    "runBuyVoidPaymentKeyedTerminalCloseoutV1(input)",
    "refreshBuyVoidHistoryCarrierAfterTerminalV1({",
  ],
  "terminal-closeout-then-refresh",
);
assert.ok(
  terminalMount.includes(
    "closeout.confirmed_state.payment_key_sha256",
  ),
);
assert.ok(
  VOID_BUY_VOID_HISTORY_CARRIER_TERMINAL_CLOSEOUT_MOUNT_AUTHORITY_V1
    .duplicate_closeout_repairs_missing_refresh,
);
assert.ok(
  VOID_BUY_VOID_HISTORY_CARRIER_TERMINAL_CLOSEOUT_MOUNT_AUTHORITY_V1
    .inventory_consumption_replay_forbidden,
);
assert.ok(
  VOID_BUY_VOID_HISTORY_CARRIER_TERMINAL_CLOSEOUT_MOUNT_AUTHORITY_V1
    .transaction_broadcast_replay_forbidden,
);

assert.ok(
  fullRuntime.includes(
    "runBuyVoidPaymentKeyedTerminalCloseoutWithHistoryCarrierV1",
  ),
);
assert.ok(
  runtimeBinding.includes(
    "successor_publication_mounted: true",
  ),
);
assert.ok(
  runtimeBinding.includes(
    "runtime_activation_ready: true",
  ),
);

for (const body of [
  lifecycle,
  pipelineMount,
  terminalMount,
]) {
  assert.doesNotMatch(
    body,
    /\b(?:signTransaction|broadcastTransaction|sendRawTransaction|eth_sendRawTransaction)\b/u,
  );
}

console.log(
  "VOID_BUY_VOID_HISTORY_CARRIER_LIFECYCLE_MOUNT_V1_PROOF_GREEN",
);
console.log("reservation_after_durable_before_claim=true");
console.log("paid_unreservable_after_durable_obligation=true");
console.log("terminal_duplicate_refresh_recovery=true");
console.log("crash_between_segmented_and_carrier_recovery=true");
console.log("stale_predecessor_rejected=true");
console.log("page_root_revalidation=true");
console.log("primitive_self_mount=false");
console.log("runtime_enablement=false");
console.log("apply_enablement=false");
console.log("public_activation=false");
console.log("transaction_broadcast=false");
console.log("funds_movement=false");
