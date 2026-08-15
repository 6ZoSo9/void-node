import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1,
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1,
  readBuyVoidCanonicalPresaleServerPolicyV1,
} from "../src/economic/buy_void_crash_consistent_saga_server_policy_v1.js";
import {
  buildBuyVoidVerifiedPaymentEventV2,
  type BuyVoidTransactionReceiptV2,
} from "../src/economic/buy_void_verified_payment_v2.js";
import {
  claimBuyVoidFulfillmentJournalV1,
} from "../src/economic/buy_void_fulfillment_journal_v1.js";
import {
  reserveBuyVoidInventoryV1,
} from "../src/economic/buy_void_inventory_reservation_journal_v1.js";
import type {
  BuyVoidRequestV1,
} from "../src/economic/buy_void_auto_fulfillment_v1.js";

const ECON = VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1;
const ENVS = VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1;
const USDC = "0x1111111111111111111111111111111111111111";
const RECEIVE = "0x2222222222222222222222222222222222222222";
const BUYER = "0x3333333333333333333333333333333333333333";
const WALLET = "0x4444444444444444444444444444444444444444";
const PAYMENT_TX = `0x${"a".repeat(64)}`;
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function topic(address: string): string {
  return `0x${"0".repeat(24)}${address.slice(2)}`;
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
    {
      [ENVS.pool_capacity_void_units]: "10000000000001",
    },
    "canonical_presale_pool_capacity_mismatch",
  ],
  [
    "two-void-reservation-throttle",
    {
      [ENVS.max_reservation_void_units]: "2000000",
    },
    "canonical_presale_reservation_ceiling_mismatch",
  ],
  [
    "alternate-pool",
    {
      [ENVS.pool_id]: "buy-void-presale-v2",
    },
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

const request: BuyVoidRequestV1 = {
  request_id: "buyvoid-validator-scale-10000-void-v1",
  source_chain: "base",
  tx_hash: PAYMENT_TX,
  delivery_address: BUYER,
  receive_address: RECEIVE,
  usdc_amount: "5000",
  quoted_void: "10000",
};

const receipt: BuyVoidTransactionReceiptV2 = {
  status: 1,
  transactionHash: PAYMENT_TX,
  blockNumber: 100,
  logs: [{
    address: USDC,
    topics: [TRANSFER_TOPIC, topic(BUYER), topic(RECEIVE)],
    data:
      `0x${BigInt("5000000000")
        .toString(16)
        .padStart(64, "0")}`,
    logIndex: 7,
    transactionHash: PAYMENT_TX,
    blockNumber: 100,
    removed: false,
  }],
};

const verified = buildBuyVoidVerifiedPaymentEventV2({
  request,
  receipt,
  policy: canonical.policy.verification_policy,
});
if ("reason" in verified) throw new Error(verified.reason);
assert.equal(
  verified.event.payment_verifier.amount_units,
  "5000000000",
);

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-canonical-presale-economics-v1-"),
);
try {
  const claimed = claimBuyVoidFulfillmentJournalV1({
    root_dir: root,
    request,
    verified_payment_event: verified.event,
    policy: canonical.policy.fulfillment_policy,
    now_ms: 1_702_000_000_000,
  });
  if ("reason" in claimed) throw new Error(claimed.reason);
  assert.equal(
    claimed.intent.claim.unsigned_instruction.void_amount_units,
    "10000000000",
  );
  assert.equal(
    claimed.intent.claim.unsigned_instruction.signing_authorized,
    false,
  );
  assert.equal(
    claimed.intent.claim.unsigned_instruction.transaction_broadcast_authorized,
    false,
  );

  const reserved = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent: claimed.intent,
    policy: canonical.policy.inventory_policy,
    apply: true,
    now_ms: 1_702_000_000_100,
  });
  assert.equal(reserved.ok, true);
  if (!reserved.ok) throw new Error(reserved.reason);
  assert.equal(reserved.status, "reserved");
  assert.equal(
    reserved.reservation.reserved_void_units,
    "10000000000",
  );
  assert.equal(
    reserved.aggregate.available_void_units,
    "9990000000000",
  );
  assert.equal(
    reserved.reservation.execution_authorized_by_this_module,
    false,
  );
  assert.equal(
    reserved.reservation.signing_authorized_by_this_module,
    false,
  );
  assert.equal(
    reserved.reservation.transaction_broadcast_authorized_by_this_module,
    false,
  );
  assert.equal(
    reserved.reservation.money_movement_authorized_by_this_module,
    false,
  );
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log("VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1_PROOF_GREEN");
console.log("canonical_presale_max_void=10000000");
console.log(
  "canonical_presale_max_fulfillment_units_6_decimal=10000000000000",
);
console.log("canonical_presale_rate_void_per_usdc=2");
console.log("presale_price_usdc_per_void=0.5");
console.log("reservation_ceiling_equals_total_pool=1");
console.log("per_buyer_purchase_throttle_below_remaining_inventory=0");
console.log("validator_scale_purchase_void=10000");
console.log("validator_scale_purchase_usdc=5000");
console.log("validator_scale_purchase_admission=1");
console.log("validator_scale_purchase_reservation=1");
console.log("remaining_after_validator_purchase_void=9990000");
console.log("delivery_execution_canary_cap_is_separate=1");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("money_movement=0");
