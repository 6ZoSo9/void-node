#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_BTC_VOID_V1_MINIMUM_SPREAD_BPS,
  deriveBtcVoidBuybackLotV1,
} from "../tools/void-btc-void-market-maker-reserve-policy-v1.mjs";
import {
  VOID_BTC_VOID_BUYBACK_LOT_JOURNAL_TRANSITION_V1,
  evaluateBtcVoidBuybackLotJournalTransitionV1,
} from "../tools/void-btc-void-buyback-lot-journal-transition-v1.mjs";

function request(overrides = {}) {
  return {
    schema: "void.btc_void.reserve_recycling_request.v1",
    settlement: {
      source_sale_id:
        "sha256:b60b88ff3c3e9271ef9b9c38a60f62cbc3051884a876073a71bfc83c653a88ad",
      direction: "btc_to_void",
      status: "settled",
      bitcoin_network: "bitcoin_mainnet",
      bitcoin_funding_txid: "11".repeat(32),
      bitcoin_funding_vout: 1,
      bitcoin_confirmed_block_hash: "44".repeat(32),
      bitcoin_confirmed_block_height: 800000,
      bitcoin_observed_tip_hash: "55".repeat(32),
      bitcoin_observed_tip_height: 800005,
      void_chain_id: 2050,
      void_network_identity: "mainnet0",
      void_settlement_receipt_id: "sha256:" + "22".repeat(32),
      btc_received_sats: "1000000",
      void_sold_atomic: "2000000",
      observed_bitcoin_confirmations: 6,
      required_bitcoin_confirmations: 6,
      ...(overrides.settlement || {}),
    },
    policy: {
      minimum_spread_bps: VOID_BTC_VOID_V1_MINIMUM_SPREAD_BPS,
      bitcoin_network_fee_reserve_sats: "10000",
      ...(overrides.policy || {}),
    },
  };
}

function transition(candidatePlan, journalEntries = []) {
  return evaluateBtcVoidBuybackLotJournalTransitionV1({
    schema: "void.btc_void.buyback_lot_journal_transition_request.v1",
    journal_entries: journalEntries,
    candidate_plan: candidatePlan,
  });
}

const firstPlan = deriveBtcVoidBuybackLotV1(request());
const create = transition(firstPlan);
assert.equal(create.marker, VOID_BTC_VOID_BUYBACK_LOT_JOURNAL_TRANSITION_V1);
assert.equal(create.status, "CREATE");
assert.equal(create.reason, "new_verified_lot_plan");
assert.equal(create.journal_entry_count_before, 0);
assert.equal(create.append_entry.buyback_lot_id, firstPlan.buyback_lot_id);
assert.equal(
  create.append_entry.buyback_lot_plan_id,
  firstPlan.buyback_lot_plan_id,
);
assert.equal(
  create.append_entry.source_sale_id,
  firstPlan.source.settlement.source_sale_id,
);
assert.equal(
  create.append_entry.journal_entry_id,
  "sha256:4e9bfcd8d9165c2a408396b0ca5f5ae861f38bc076241a7306cbd0c486602dd4",
);
assert.equal(
  create.decision_id,
  "sha256:4499323fcc890acde046e69760ee13855b8a498599a62c4a5ed52761000156dd",
);

const duplicate = transition(firstPlan, [create.append_entry]);
assert.equal(duplicate.status, "IDEMPOTENT");
assert.equal(duplicate.reason, "exact_lot_plan_already_accepted");
assert.equal(duplicate.append_entry, null);
assert.equal(
  duplicate.accepted_buyback_lot_plan_id,
  firstPlan.buyback_lot_plan_id,
);

const laterObservationPlan = deriveBtcVoidBuybackLotV1(
  request({
    settlement: {
      bitcoin_observed_tip_hash: "66".repeat(32),
      bitcoin_observed_tip_height: 800006,
      observed_bitcoin_confirmations: 7,
    },
  }),
);
assert.equal(laterObservationPlan.buyback_lot_id, firstPlan.buyback_lot_id);
assert.notEqual(
  laterObservationPlan.buyback_lot_plan_id,
  firstPlan.buyback_lot_plan_id,
);
const conflict = transition(laterObservationPlan, [create.append_entry]);
assert.equal(conflict.status, "HOLD");
assert.equal(
  conflict.reason,
  "buyback_lot_id_already_bound_to_different_plan",
);
assert.equal(conflict.append_entry, null);
assert.equal(
  conflict.accepted_buyback_lot_plan_id,
  firstPlan.buyback_lot_plan_id,
);

const authority = create.authority;
assert.deepEqual(authority, {
  source_only_decision: true,
  journal_persisted: false,
  reserve_state_mutated: false,
  inventory_reserved: false,
  wallet_or_signer_accessed: false,
  transaction_constructed: false,
  transaction_broadcast: false,
  funds_moved: false,
});
assert.deepEqual(create.invariants, {
  candidate_plan_rederived_from_source: true,
  create_once_by_buyback_lot_id: true,
  duplicate_append_forbidden: true,
  conflicting_plan_requires_hold: true,
  source_sale_maps_to_one_lot: true,
});

const reorderedPlan = Object.fromEntries(Object.entries(firstPlan).reverse());
assert.equal(transition(reorderedPlan).decision_id, create.decision_id);

const tamperedPlan = structuredClone(firstPlan);
tamperedPlan.buyback_lot.maximum_btc_out_sats = "980101";
assert.throws(
  () => transition(tamperedPlan),
  /canonical reserve-policy derivation/,
);

const tamperedEntry = structuredClone(create.append_entry);
tamperedEntry.buyback_lot_plan_id = laterObservationPlan.buyback_lot_plan_id;
assert.throws(
  () => transition(firstPlan, [tamperedEntry]),
  /journal_entry_id content mismatch/,
);

assert.throws(
  () => transition(firstPlan, [create.append_entry, create.append_entry]),
  /duplicate buyback_lot_id/,
);
assert.throws(
  () =>
    evaluateBtcVoidBuybackLotJournalTransitionV1({
      schema: "void.btc_void.buyback_lot_journal_transition_request.v1",
      journal_entries: [],
      candidate_plan: firstPlan,
      usd_price: "0.50",
    }),
  /keys mismatch/,
);

const doc = fs.readFileSync(
  "docs/public/btc-void-buyback-lot-journal-transition-v1.md",
  "utf8",
);
for (const expected of [
  "VOID_BTC_VOID_BUYBACK_LOT_JOURNAL_TRANSITION_V1",
  "CREATE",
  "IDEMPOTENT",
  "HOLD",
  "does not persist",
  "native BTC/native VOID",
  "not live market capability",
]) {
  assert.ok(doc.includes(expected), `journal-transition doc missing ${expected}`);
}

process.stdout.write(
  JSON.stringify(
    {
      marker: VOID_BTC_VOID_BUYBACK_LOT_JOURNAL_TRANSITION_V1,
      status: "PASS",
      assertions: 39,
      deterministic_first_decision_id: create.decision_id,
      exact_duplicate_status: duplicate.status,
      conflicting_plan_status: conflict.status,
      authority,
    },
    null,
    2,
  ) + "\n",
);
