#!/usr/bin/env node

import crypto from "node:crypto";
import { pathToFileURL } from "node:url";

import { readBtcVoidBoundedStdinV1 } from "./void-btc-void-bounded-stdin-v1.mjs";

import {
  VOID_BTC_VOID_MARKET_MAKER_RESERVE_POLICY_V1,
  canonicalJson,
  deriveBtcVoidBuybackLotV1,
} from "./void-btc-void-market-maker-reserve-policy-v1.mjs";

export const VOID_BTC_VOID_BUYBACK_LOT_JOURNAL_TRANSITION_V1 =
  "VOID_BTC_VOID_BUYBACK_LOT_JOURNAL_TRANSITION_V1";

const JOURNAL_ENTRY_SCHEMA = "void.btc_void.buyback_lot_journal_entry.v1";
const TRANSITION_REQUEST_SCHEMA =
  "void.btc_void.buyback_lot_journal_transition_request.v1";
const TRANSITION_DECISION_SCHEMA =
  "void.btc_void.buyback_lot_journal_transition_decision.v1";
const JOURNAL_SNAPSHOT_SCHEMA =
  "void.btc_void.buyback_lot_journal_snapshot.v1";
const MAX_JOURNAL_ENTRIES = 10_000;
const MAX_STDIN_BYTES = 1_048_576;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/;

function plainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(label + " must be an object");
  }
  return value;
}

function exactKeys(value, keys, label) {
  const object = plainObject(value, label);
  const actual = Object.keys(object).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(label + " keys mismatch");
  }
  return object;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function contentId(value) {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(canonicalJson(value)).digest("hex")
  );
}

function sha256Id(value, label) {
  if (typeof value !== "string" || !SHA256_ID.test(value)) {
    throw new Error(label + " must be a canonical sha256 identity");
  }
  return value;
}

function validatedCandidatePlan(raw) {
  const candidate = plainObject(structuredClone(raw), "candidate_plan");
  const derived = deriveBtcVoidBuybackLotV1(candidate.source);
  if (canonicalJson(candidate) !== canonicalJson(derived)) {
    throw new Error(
      "candidate_plan does not match the canonical reserve-policy derivation",
    );
  }
  return candidate;
}

function entryPayload(plan) {
  return {
    schema: JOURNAL_ENTRY_SCHEMA,
    marker: VOID_BTC_VOID_BUYBACK_LOT_JOURNAL_TRANSITION_V1,
    reserve_policy_marker: VOID_BTC_VOID_MARKET_MAKER_RESERVE_POLICY_V1,
    buyback_lot_id: plan.buyback_lot_id,
    buyback_lot_plan_id: plan.buyback_lot_plan_id,
    source_sale_id: plan.source.settlement.source_sale_id,
    accepted_plan_source: structuredClone(plan.source),
  };
}

function createEntry(plan) {
  const payload = entryPayload(plan);
  return deepFreeze({
    ...payload,
    journal_entry_id: contentId(payload),
  });
}

function buybackLotIdForSourceSale(sourceSaleId) {
  return contentId({
    schema: "void.btc_void.buyback_lot_identity.v1",
    source_sale_id: sourceSaleId,
  });
}

function validateEntry(raw, index) {
  const label = `journal_entries[${index}]`;
  const entry = exactKeys(
    structuredClone(raw),
    [
      "schema",
      "marker",
      "reserve_policy_marker",
      "buyback_lot_id",
      "buyback_lot_plan_id",
      "source_sale_id",
      "accepted_plan_source",
      "journal_entry_id",
    ],
    label,
  );
  if (entry.schema !== JOURNAL_ENTRY_SCHEMA) {
    throw new Error(label + ".schema mismatch");
  }
  if (entry.marker !== VOID_BTC_VOID_BUYBACK_LOT_JOURNAL_TRANSITION_V1) {
    throw new Error(label + ".marker mismatch");
  }
  if (
    entry.reserve_policy_marker !==
    VOID_BTC_VOID_MARKET_MAKER_RESERVE_POLICY_V1
  ) {
    throw new Error(label + ".reserve_policy_marker mismatch");
  }
  for (const key of [
    "buyback_lot_id",
    "buyback_lot_plan_id",
    "source_sale_id",
    "journal_entry_id",
  ]) {
    sha256Id(entry[key], `${label}.${key}`);
  }
  if (entry.buyback_lot_id !== buybackLotIdForSourceSale(entry.source_sale_id)) {
    throw new Error(label + ".buyback_lot_id does not match source_sale_id");
  }
  const acceptedPlan = deriveBtcVoidBuybackLotV1(entry.accepted_plan_source);
  if (
    acceptedPlan.source.settlement.source_sale_id !== entry.source_sale_id
  ) {
    throw new Error(
      label + ".accepted_plan_source does not match source_sale_id",
    );
  }
  if (acceptedPlan.buyback_lot_id !== entry.buyback_lot_id) {
    throw new Error(
      label + ".accepted_plan_source does not match buyback_lot_id",
    );
  }
  if (acceptedPlan.buyback_lot_plan_id !== entry.buyback_lot_plan_id) {
    throw new Error(
      label + ".buyback_lot_plan_id does not match accepted_plan_source",
    );
  }
  const { journal_entry_id: suppliedId, ...payload } = entry;
  if (suppliedId !== contentId(payload)) {
    throw new Error(label + ".journal_entry_id content mismatch");
  }
  return entry;
}

function normalizedJournal(raw) {
  if (!Array.isArray(raw)) {
    throw new Error("journal_entries must be an array");
  }
  if (raw.length > MAX_JOURNAL_ENTRIES) {
    throw new Error("journal_entries exceeds the v1 entry limit");
  }
  const entries = raw.map(validateEntry);
  const lots = new Set();
  const sources = new Map();
  for (const entry of entries) {
    if (lots.has(entry.buyback_lot_id)) {
      throw new Error("journal contains a duplicate buyback_lot_id");
    }
    lots.add(entry.buyback_lot_id);
    const priorLot = sources.get(entry.source_sale_id);
    if (priorLot && priorLot !== entry.buyback_lot_id) {
      throw new Error("journal maps one source_sale_id to multiple lot IDs");
    }
    sources.set(entry.source_sale_id, entry.buyback_lot_id);
  }
  return entries;
}

function journalSnapshotId(entries) {
  return contentId({
    schema: JOURNAL_SNAPSHOT_SCHEMA,
    journal_entry_ids: entries.map((entry) => entry.journal_entry_id),
  });
}

export function evaluateBtcVoidBuybackLotJournalTransitionV1(raw) {
  const request = exactKeys(
    structuredClone(raw),
    ["schema", "journal_entries", "candidate_plan"],
    "journal-transition request",
  );
  if (request.schema !== TRANSITION_REQUEST_SCHEMA) {
    throw new Error("journal-transition request schema mismatch");
  }

  const entries = normalizedJournal(request.journal_entries);
  const journalSnapshotIdBefore = journalSnapshotId(entries);
  const candidate = validatedCandidatePlan(request.candidate_plan);
  const existing = entries.find(
    (entry) => entry.buyback_lot_id === candidate.buyback_lot_id,
  );
  let status;
  let reason;
  let appendEntry = null;
  if (!existing) {
    status = "CREATE";
    reason = "new_verified_lot_plan";
    appendEntry = createEntry(candidate);
  } else if (existing.buyback_lot_plan_id === candidate.buyback_lot_plan_id) {
    status = "IDEMPOTENT";
    reason = "exact_lot_plan_already_accepted";
  } else {
    status = "HOLD";
    reason = "buyback_lot_id_already_bound_to_different_plan";
  }
  const journalSnapshotIdAfter = journalSnapshotId(
    appendEntry === null ? entries : [...entries, appendEntry],
  );

  const decision = {
    schema: TRANSITION_DECISION_SCHEMA,
    marker: VOID_BTC_VOID_BUYBACK_LOT_JOURNAL_TRANSITION_V1,
    status,
    reason,
    journal_entry_count_before: entries.length,
    journal_snapshot_id_before: journalSnapshotIdBefore,
    journal_snapshot_id_after: journalSnapshotIdAfter,
    buyback_lot_id: candidate.buyback_lot_id,
    candidate_buyback_lot_plan_id: candidate.buyback_lot_plan_id,
    accepted_buyback_lot_plan_id: existing?.buyback_lot_plan_id || null,
    append_entry: appendEntry,
    invariants: {
      candidate_plan_rederived_from_source: true,
      accepted_plan_rederived_from_source: true,
      create_once_by_buyback_lot_id: true,
      duplicate_append_forbidden: true,
      conflicting_plan_requires_hold: true,
      source_sale_maps_to_one_lot: true,
      decision_bound_to_exact_ordered_journal_snapshot: true,
      expected_post_transition_snapshot_bound: true,
    },
    authority: {
      source_only_decision: true,
      journal_persisted: false,
      reserve_state_mutated: false,
      inventory_reserved: false,
      wallet_or_signer_accessed: false,
      transaction_constructed: false,
      transaction_broadcast: false,
      funds_moved: false,
    },
  };
  return deepFreeze({ ...decision, decision_id: contentId(decision) });
}

async function readBoundedStdin() {
  return readBtcVoidBoundedStdinV1({
    stream: process.stdin,
    maxBytes: MAX_STDIN_BYTES,
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--pretty") || args.length > 1) {
    throw new Error(
      "usage: void-btc-void-buyback-lot-journal-transition-v1.mjs [--pretty] < request.json",
    );
  }
  const result = evaluateBtcVoidBuybackLotJournalTransitionV1(
    JSON.parse(await readBoundedStdin()),
  );
  process.stdout.write(
    JSON.stringify(result, null, args[0] === "--pretty" ? 2 : 0) + "\n",
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(
      "VOID_BTC_VOID_BUYBACK_LOT_JOURNAL_TRANSITION_V1_HOLD: " +
        error.message +
        "\n",
    );
    process.exitCode = 1;
  });
}
