#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  VOID_BTC_VOID_V1_MINIMUM_SPREAD_BPS,
  canonicalJson,
  deriveBtcVoidBuybackLotV1,
} from "../tools/void-btc-void-market-maker-reserve-policy-v1.mjs";
import {
  VOID_BTC_VOID_BUYBACK_LOT_JOURNAL_TRANSITION_V1,
  evaluateBtcVoidBuybackLotJournalTransitionV1,
} from "../tools/void-btc-void-buyback-lot-journal-transition-v1.mjs";

function contentId(value) {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(canonicalJson(value)).digest("hex")
  );
}

function request(overrides = {}) {
  const value = {
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
  value.settlement.source_sale_id = contentId({
    schema: "void.btc_void.source_sale_receipt.v1",
    direction: value.settlement.direction,
    bitcoin_network: value.settlement.bitcoin_network,
    bitcoin_funding_txid: value.settlement.bitcoin_funding_txid,
    bitcoin_funding_vout: value.settlement.bitcoin_funding_vout,
    void_chain_id: value.settlement.void_chain_id,
    void_network_identity: value.settlement.void_network_identity,
    void_settlement_receipt_id: value.settlement.void_settlement_receipt_id,
    btc_received_sats: value.settlement.btc_received_sats,
    void_sold_atomic: value.settlement.void_sold_atomic,
  });
  return value;
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
assert.equal(
  create.journal_snapshot_id_before,
  contentId({
    schema: "void.btc_void.buyback_lot_journal_snapshot.v1",
    journal_entry_ids: [],
  }),
);
assert.equal(
  create.journal_snapshot_id_after,
  contentId({
    schema: "void.btc_void.buyback_lot_journal_snapshot.v1",
    journal_entry_ids: [create.append_entry.journal_entry_id],
  }),
);
assert.notEqual(
  create.journal_snapshot_id_after,
  create.journal_snapshot_id_before,
);
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
  "sha256:66fcf0fe3a4566b95e8b39f8043b9be9cfbf247a5b39c7402beeb2eec47e7b34",
);
assert.equal(
  create.decision_id,
  "sha256:871ba3b9fce15104b282cfdd78c4e46b77c46005ced6230d0a753050aacc01d5",
);

const immutableDecisionId = create.decision_id;
const immutableJournalEntryId = create.append_entry.journal_entry_id;
assert.equal(Object.isFrozen(create), true);
assert.equal(Object.isFrozen(create.invariants), true);
assert.equal(Object.isFrozen(create.authority), true);
assert.equal(Object.isFrozen(create.append_entry), true);
assert.equal(Object.isFrozen(create.append_entry.accepted_plan_source), true);
assert.equal(
  Object.isFrozen(create.append_entry.accepted_plan_source.settlement),
  true,
);
assert.equal(
  Object.isFrozen(create.append_entry.accepted_plan_source.policy),
  true,
);
assert.throws(() => {
  create.authority.funds_moved = true;
}, TypeError);
assert.throws(() => {
  create.append_entry.accepted_plan_source.settlement.btc_received_sats = "1";
}, TypeError);
assert.equal(create.decision_id, immutableDecisionId);
assert.equal(create.append_entry.journal_entry_id, immutableJournalEntryId);

const duplicate = transition(firstPlan, [create.append_entry]);
assert.equal(duplicate.status, "IDEMPOTENT");
assert.equal(duplicate.reason, "exact_lot_plan_already_accepted");
assert.equal(duplicate.append_entry, null);
assert.equal(
  duplicate.journal_snapshot_id_before,
  contentId({
    schema: "void.btc_void.buyback_lot_journal_snapshot.v1",
    journal_entry_ids: [create.append_entry.journal_entry_id],
  }),
);
assert.equal(
  duplicate.accepted_buyback_lot_plan_id,
  firstPlan.buyback_lot_plan_id,
);
assert.equal(
  duplicate.journal_snapshot_id_after,
  duplicate.journal_snapshot_id_before,
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
assert.equal(
  conflict.journal_snapshot_id_after,
  conflict.journal_snapshot_id_before,
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
  accepted_plan_rederived_from_source: true,
  create_once_by_buyback_lot_id: true,
  duplicate_append_forbidden: true,
  conflicting_plan_requires_hold: true,
  source_sale_maps_to_one_lot: true,
  decision_bound_to_exact_ordered_journal_snapshot: true,
  expected_post_transition_snapshot_bound: true,
});

const alternatePlanA = deriveBtcVoidBuybackLotV1(
  request({
    settlement: {
      bitcoin_funding_txid: "77".repeat(32),
      void_settlement_receipt_id: "sha256:" + "88".repeat(32),
    },
  }),
);
const alternatePlanB = deriveBtcVoidBuybackLotV1(
  request({
    settlement: {
      bitcoin_funding_txid: "99".repeat(32),
      void_settlement_receipt_id: "sha256:" + "aa".repeat(32),
    },
  }),
);
const alternateEntryA = transition(alternatePlanA).append_entry;
const alternateEntryB = transition(alternatePlanB).append_entry;
const equalLengthJournalA = transition(firstPlan, [alternateEntryA]);
const equalLengthJournalB = transition(firstPlan, [alternateEntryB]);
assert.notEqual(
  equalLengthJournalA.journal_snapshot_id_before,
  equalLengthJournalB.journal_snapshot_id_before,
);
assert.notEqual(
  equalLengthJournalA.decision_id,
  equalLengthJournalB.decision_id,
);
const orderedJournal = transition(firstPlan, [
  alternateEntryA,
  alternateEntryB,
]);
const reorderedJournal = transition(firstPlan, [
  alternateEntryB,
  alternateEntryA,
]);
assert.notEqual(
  orderedJournal.journal_snapshot_id_before,
  reorderedJournal.journal_snapshot_id_before,
);
assert.notEqual(orderedJournal.decision_id, reorderedJournal.decision_id);
assert.equal(
  orderedJournal.journal_snapshot_id_after,
  contentId({
    schema: "void.btc_void.buyback_lot_journal_snapshot.v1",
    journal_entry_ids: [
      alternateEntryA.journal_entry_id,
      alternateEntryB.journal_entry_id,
      orderedJournal.append_entry.journal_entry_id,
    ],
  }),
);

const reorderedPlan = Object.fromEntries(Object.entries(firstPlan).reverse());
assert.equal(transition(reorderedPlan).decision_id, create.decision_id);

const tamperedPlan = structuredClone(firstPlan);
tamperedPlan.buyback_lot.maximum_btc_out_sats = "980101";
assert.throws(
  () => transition(tamperedPlan),
  /canonical reserve-policy derivation/,
);

const tamperedEntry = structuredClone(create.append_entry);
tamperedEntry.journal_entry_id = "sha256:" + "33".repeat(32);
assert.throws(
  () => transition(firstPlan, [tamperedEntry]),
  /journal_entry_id content mismatch/,
);

const fabricatedPlanEntry = structuredClone(create.append_entry);
fabricatedPlanEntry.buyback_lot_plan_id = "sha256:" + "77".repeat(32);
const { journal_entry_id: ignoredFabricatedId, ...fabricatedPlanPayload } =
  fabricatedPlanEntry;
void ignoredFabricatedId;
fabricatedPlanEntry.journal_entry_id = contentId(fabricatedPlanPayload);
assert.throws(
  () => transition(firstPlan, [fabricatedPlanEntry]),
  /buyback_lot_plan_id does not match accepted_plan_source/,
);

const inconsistentLotEntry = structuredClone(create.append_entry);
inconsistentLotEntry.buyback_lot_id = "sha256:" + "99".repeat(32);
const { journal_entry_id: ignoredEntryId, ...inconsistentLotPayload } =
  inconsistentLotEntry;
void ignoredEntryId;
inconsistentLotEntry.journal_entry_id = contentId(inconsistentLotPayload);
assert.throws(
  () => transition(firstPlan, [inconsistentLotEntry]),
  /buyback_lot_id does not match source_sale_id/,
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
  "recursively immutable",
]) {
  assert.ok(doc.includes(expected), `journal-transition doc missing ${expected}`);
}

process.stdout.write(
  JSON.stringify(
    {
      marker: VOID_BTC_VOID_BUYBACK_LOT_JOURNAL_TRANSITION_V1,
      status: "PASS",
      assertions: 66,
      deterministic_first_decision_id: create.decision_id,
      exact_duplicate_status: duplicate.status,
      conflicting_plan_status: conflict.status,
      authority,
    },
    null,
    2,
  ) + "\n",
);
