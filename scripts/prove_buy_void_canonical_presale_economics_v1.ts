import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1,
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1,
  readBuyVoidCanonicalPresaleServerPolicyV1,
} from "../src/economic/buy_void_crash_consistent_saga_server_policy_v1.js";
import type { BuyVoidRequestV1 } from "../src/economic/buy_void_auto_fulfillment_v1.js";
import type { BuyVoidTransactionReceiptV2 } from "../src/economic/buy_void_verified_payment_v2.js";
import { listBuyVoidFulfillmentJournalClaimsV1 } from "../src/economic/buy_void_fulfillment_journal_v1.js";
import {
  listBuyVoidInventoryReservationsV1,
  listBuyVoidPaidUnreservableObligationsV1,
} from "../src/economic/buy_void_inventory_reservation_journal_v1.js";
import {
  VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1,
  runBuyVoidPipelineCommandV1,
} from "../src/economic/buy_void_pipeline_coordinator_v1.js";

const ECON = VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1;
const ENVS = VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1;
const USDC = "0x1111111111111111111111111111111111111111";
const RECEIVE = "0x2222222222222222222222222222222222222222";
const WALLET = "0x4444444444444444444444444444444444444444";
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function address(n: number): string {
  return `0x${n.toString(16).padStart(40, "0")}`;
}
function tx(char: string): string {
  return `0x${char.repeat(64)}`;
}
function topic(value: string): string {
  return `0x${"0".repeat(24)}${value.slice(2)}`;
}
function decimalToUnits(value: string, decimals = 6): bigint {
  const [whole, fraction = ""] = value.split(".");
  return (
    BigInt(whole) * 10n ** BigInt(decimals) +
    BigInt(fraction.padEnd(decimals, "0") || "0")
  );
}
function env(): NodeJS.ProcessEnv {
  return {
    [ENVS.payment_chain]: "base",
    [ENVS.payment_usdc_contract]: USDC,
    [ENVS.payment_receive_address]: RECEIVE,
    [ENVS.payment_current_block_number]: "105",
    [ENVS.payment_min_confirmations]: "3",
    [ENVS.rate_void_units_numerator]: "2",
    [ENVS.rate_void_units_denominator]: "1",
    [ENVS.inventory_policy_version]: "presale-v1",
    [ENVS.pool_id]: "buy-void-presale-v1",
    [ENVS.pool_capacity_void_units]: "10000000000000",
    [ENVS.max_reservation_void_units]: "10000000000000",
    [ENVS.fulfillment_wallet_address]: WALLET,
  };
}
function payment(input: {
  request_id: string;
  tx_char: string;
  delivery: string;
  usdc: string;
  quoted_void: string;
  log_index: number;
}): { request: BuyVoidRequestV1; receipt: BuyVoidTransactionReceiptV2 } {
  const paymentTx = tx(input.tx_char);
  const request: BuyVoidRequestV1 = {
    request_id: input.request_id,
    source_chain: "base",
    tx_hash: paymentTx,
    delivery_address: input.delivery,
    receive_address: RECEIVE,
    usdc_amount: input.usdc,
    quoted_void: input.quoted_void,
  };
  const receipt: BuyVoidTransactionReceiptV2 = {
    status: 1,
    transactionHash: paymentTx,
    blockNumber: 100,
    logs: [{
      address: USDC,
      topics: [TRANSFER_TOPIC, topic(input.delivery), topic(RECEIVE)],
      data:
        `0x${decimalToUnits(input.usdc)
          .toString(16)
          .padStart(64, "0")}`,
      logIndex: input.log_index,
      transactionHash: paymentTx,
      blockNumber: 100,
      removed: false,
    }],
  };
  return { request, receipt };
}
function appliedResult(value: ReturnType<typeof runBuyVoidPipelineCommandV1>): any {
  if ("reason" in value) throw new Error(value.reason);
  if (!("result" in value)) throw new Error("expected_applied_result");
  return value.result;
}
function admit(
  root: string,
  canonical: Extract<
    ReturnType<typeof readBuyVoidCanonicalPresaleServerPolicyV1>,
    { ok: true }
  >,
  item: ReturnType<typeof payment>,
  now_ms: number,
) {
  return runBuyVoidPipelineCommandV1({
    action: "verify_reserve_and_claim",
    root_dir: root,
    request: item.request,
    receipt: item.receipt,
    verification_policy: canonical.policy.verification_policy,
    fulfillment_policy: canonical.policy.fulfillment_policy,
    inventory_policy: canonical.policy.inventory_policy,
    apply: true,
    confirmation:
      VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.verify_reserve_and_claim,
    now_ms,
  });
}

const canonical = readBuyVoidCanonicalPresaleServerPolicyV1(env());
assert.equal(canonical.ok, true);
if (!canonical.ok) throw new Error(canonical.reason);
assert.equal(canonical.policy.fulfillment_policy.rate_void_units_numerator, "2");
assert.equal(canonical.policy.fulfillment_policy.rate_void_units_denominator, "1");
assert.equal(
  canonical.policy.inventory_policy.pool_capacity_void_units,
  "10000000000000",
);
assert.equal(
  canonical.policy.inventory_policy.max_reservation_void_units,
  "10000000000000",
);
assert.equal(
  canonical.policy.inventory_policy.max_reservation_void_units,
  canonical.policy.inventory_policy.pool_capacity_void_units,
);
assert.equal(
  ECON.no_per_buyer_purchase_throttle_below_remaining_inventory,
  true,
);
assert.equal(ECON.delivery_execution_amount_cap_is_separate, true);

for (const [label, overrides, reason] of [
  [
    "noncanonical-rate",
    {
      [ENVS.rate_void_units_numerator]: "3",
      [ENVS.rate_void_units_denominator]: "2",
    },
    "canonical_presale_fixed_rate_mismatch",
  ],
  [
    "above-capacity",
    { [ENVS.pool_capacity_void_units]: "10000000000001" },
    "canonical_presale_pool_capacity_mismatch",
  ],
  [
    "two-void-reservation-throttle",
    { [ENVS.max_reservation_void_units]: "2000000" },
    "canonical_presale_reservation_ceiling_mismatch",
  ],
  [
    "alternate-pool",
    { [ENVS.pool_id]: "buy-void-presale-v2" },
    "canonical_presale_pool_id_mismatch",
  ],
] as const) {
  const decision = readBuyVoidCanonicalPresaleServerPolicyV1({
    ...env(),
    ...overrides,
  });
  assert.equal(decision.ok, false, label);
  if (decision.ok) throw new Error(`${label} unexpectedly configured`);
  assert.equal(decision.reason, reason, label);
}

const validatorRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-canonical-presale-validator-scale-v1-"),
);
try {
  const validator = payment({
    request_id: "buyvoid-validator-scale-10000-void-v1",
    tx_char: "a",
    delivery: address(0x33),
    usdc: "5000",
    quoted_void: "10000",
    log_index: 7,
  });
  const applied = appliedResult(
    admit(validatorRoot, canonical, validator, 1_702_000_000_000),
  );
  assert.equal(applied.reservation.status, "reserved");
  assert.equal(
    applied.reservation.reservation.reserved_void_units,
    "10000000000",
  );
  assert.equal(
    applied.reservation.aggregate.available_void_units,
    "9990000000000",
  );
  assert.equal(applied.claim.intent.claim.request_id, validator.request.request_id);
  assert.equal(
    applied.claim.intent.claim.unsigned_instruction.signing_authorized,
    false,
  );
  assert.equal(
    applied.claim.intent.claim.unsigned_instruction
      .transaction_broadcast_authorized,
    false,
  );
} finally {
  fs.rmSync(validatorRoot, { recursive: true, force: true });
}

const raceRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-canonical-presale-near-sellout-v1-"),
);
try {
  const seed = payment({
    request_id: "buyvoid-near-sellout-seed-v1",
    tx_char: "b",
    delivery: address(0x41),
    usdc: "4999997",
    quoted_void: "9999994",
    log_index: 1,
  });
  const seedApplied = appliedResult(
    admit(raceRoot, canonical, seed, 1_702_000_001_000),
  );
  assert.equal(seedApplied.reservation.aggregate.available_void_units, "6000000");

  const firstFour = payment({
    request_id: "buyvoid-near-sellout-first-four-v1",
    tx_char: "c",
    delivery: address(0x42),
    usdc: "2",
    quoted_void: "4",
    log_index: 2,
  });
  const firstApplied = appliedResult(
    admit(raceRoot, canonical, firstFour, 1_702_000_002_000),
  );
  assert.equal(firstApplied.reservation.aggregate.available_void_units, "2000000");

  const losingFour = payment({
    request_id: "buyvoid-near-sellout-losing-four-v1",
    tx_char: "d",
    delivery: address(0x43),
    usdc: "2",
    quoted_void: "4",
    log_index: 3,
  });
  const losing = admit(raceRoot, canonical, losingFour, 1_702_000_003_000);
  assert.equal(losing.ok, false);
  if (losing.ok) throw new Error("expected near-sellout hold");
  assert.equal(losing.reason, "paid_inventory_reconciliation_required");
  assert.equal(losing.detail?.reservation_reason, "insufficient_void_inventory");
  assert.equal(losing.detail?.terminal_recovery_obligation_recorded, true);

  const claimsAfterLosing = listBuyVoidFulfillmentJournalClaimsV1(raceRoot);
  assert.equal(
    claimsAfterLosing.some(
      (item) => item.claim.request_id === losingFour.request.request_id,
    ),
    false,
  );

  let obligations = listBuyVoidPaidUnreservableObligationsV1({
    root_dir: raceRoot,
    pool_id: ECON.pool_id,
  });
  assert.equal(obligations.length, 1);
  assert.equal(obligations[0].request_id, losingFour.request.request_id);
  assert.equal(obligations[0].requested_void_units, "4000000");
  assert.equal(obligations[0].available_void_units, "2000000");
  assert.equal(
    obligations[0].terminal_state,
    "operator_reconciliation_required",
  );
  assert.equal(obligations[0].automatic_retry, false);
  assert.equal(obligations[0].refund_execution_authorized, false);
  assert.equal(obligations[0].money_movement_authorized, false);

  const finalTwo = payment({
    request_id: "buyvoid-near-sellout-final-two-v1",
    tx_char: "e",
    delivery: address(0x44),
    usdc: "1",
    quoted_void: "2",
    log_index: 4,
  });
  const finalApplied = appliedResult(
    admit(raceRoot, canonical, finalTwo, 1_702_000_004_000),
  );
  assert.equal(finalApplied.reservation.aggregate.sold_out, true);
  assert.equal(finalApplied.reservation.aggregate.available_void_units, "0");

  const soldOut = payment({
    request_id: "buyvoid-sold-out-one-v1",
    tx_char: "f",
    delivery: address(0x45),
    usdc: "0.5",
    quoted_void: "1",
    log_index: 5,
  });
  const soldOutHeld = admit(raceRoot, canonical, soldOut, 1_702_000_005_000);
  assert.equal(soldOutHeld.ok, false);
  if (soldOutHeld.ok) throw new Error("expected sold-out hold");
  assert.equal(soldOutHeld.reason, "paid_inventory_reconciliation_required");
  assert.equal(soldOutHeld.detail?.reservation_reason, "inventory_sold_out");

  const claimsAfterSoldOut = listBuyVoidFulfillmentJournalClaimsV1(raceRoot);
  assert.equal(
    claimsAfterSoldOut.some(
      (item) => item.claim.request_id === soldOut.request.request_id,
    ),
    false,
  );

  obligations = listBuyVoidPaidUnreservableObligationsV1({
    root_dir: raceRoot,
    pool_id: ECON.pool_id,
  });
  assert.equal(obligations.length, 2);
  assert.equal(
    obligations.some(
      (item) =>
        item.request_id === soldOut.request.request_id &&
        item.reservation_failure_reason === "inventory_sold_out",
    ),
    true,
  );

  const reservations = listBuyVoidInventoryReservationsV1({
    root_dir: raceRoot,
    pool_id: ECON.pool_id,
  });
  const committed = reservations.reduce(
    (total, item) => total + BigInt(item.reserved_void_units),
    0n,
  );
  assert.equal(committed.toString(), ECON.pool_capacity_void_units);
} finally {
  fs.rmSync(raceRoot, { recursive: true, force: true });
}

console.log("VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1_PROOF_GREEN");
console.log("canonical_presale_max_void=10000000");
console.log("canonical_presale_max_fulfillment_units_6_decimal=10000000000000");
console.log("canonical_presale_rate_void_per_usdc=2");
console.log("presale_price_usdc_per_void=0.5");
console.log("reservation_ceiling_equals_total_pool=1");
console.log("per_buyer_purchase_throttle_below_remaining_inventory=0");
console.log("validator_scale_purchase_void=10000");
console.log("validator_scale_purchase_usdc=5000");
console.log("validator_scale_purchase_admission=1");
console.log("validator_scale_purchase_reservation=1");
console.log("payment_admission_reservation_before_new_claim=1");
console.log("near_sellout_combined_overage_loser_claim_committed=0");
console.log("near_sellout_terminal_obligation_recorded=1");
console.log("sold_out_terminal_obligation_recorded=1");
console.log("confirmed_payer_stranded_without_reservation_or_obligation=0");
console.log("delivery_execution_canary_cap_is_separate=1");
console.log("automatic_retry=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("money_movement=0");
