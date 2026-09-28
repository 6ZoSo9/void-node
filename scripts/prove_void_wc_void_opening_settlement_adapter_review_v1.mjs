#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_WC_VOID_OPENING_COMMITMENT_SCHEMA_V1,
  VOID_WC_VOID_OPENING_LEDGER_DEBIT_SCHEMA_V1,
  VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
  verifyWcVoidOpeningLedgerSettlementsV1,
  wcVoidOpeningCommitmentIdV1,
  wcVoidOpeningSettlementIdV1,
} from "../tools/void-wc-void-coupled-opening-v1.mjs";

import {
  EXPECTED,
  VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_REVIEW_AUTHORITY_V1,
  VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_REVIEW_V1,
  verifyWcVoidOpeningSettlementAdapterReviewV1,
} from "../tools/void-wc-void-opening-settlement-adapter-review-v1.mjs";

const ROOT = process.cwd();

function gitBlobSha(buffer) {
  return createHash("sha1")
    .update(Buffer.from("blob " + buffer.length + "\0", "utf8"))
    .update(buffer)
    .digest("hex");
}

const packet = JSON.parse(
  fs.readFileSync(path.join(ROOT, EXPECTED.packet_path), "utf8"),
);
const decision = verifyWcVoidOpeningSettlementAdapterReviewV1(packet);
assert.equal(decision.ok, true);
assert.equal(
  decision.status,
  "source_review_accepted_held_on_live_ledger_persistence_and_quote_reserve_custody",
);
assert.equal(decision.review_id, EXPECTED.review_id);
assert.equal(decision.adapter_id, EXPECTED.adapter_id);
assert.equal(decision.settlement_adapter_independently_reviewed, true);
assert.equal(decision.live_ledger_persistence_verified, false);
assert.equal(decision.quote_reserve_custody_verified, false);
assert.equal(decision.market_activation_authorized, false);
assert.equal(decision.public_presale_activation_authorized, false);
assert.equal(decision.funds_movement_authorized, false);

const sourceBytes = fs.readFileSync(path.join(ROOT, EXPECTED.source_path));
assert.equal(gitBlobSha(sourceBytes), EXPECTED.source_git_blob_sha);

for (const [key, value] of Object.entries(
  VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_REVIEW_AUTHORITY_V1,
)) {
  if (key === "source_review_only") {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const hash = (digit) => "sha256:" + String(digit).repeat(64);
const launchId = hash("a");

function commitment(participantDigit, account, wcUnits) {
  const value = {
    schema: VOID_WC_VOID_OPENING_COMMITMENT_SCHEMA_V1,
    commitment_id: hash("0"),
    coupled_launch_id: launchId,
    participant_id: hash(participantDigit),
    account,
    wc_units: String(wcUnits),
  };
  value.commitment_id = wcVoidOpeningCommitmentIdV1(value);
  return value;
}

function debit(commitmentValue, amount, tsMs) {
  const value = {
    schema: VOID_WC_VOID_OPENING_LEDGER_DEBIT_SCHEMA_V1,
    kind: "debit",
    account: commitmentValue.account,
    amount,
    delta: -amount,
    ts_ms: tsMs,
    reason: "wc_void_opening_settlement_v1",
    settlement_id: hash("0"),
    commitment_id: commitmentValue.commitment_id,
    coupled_launch_id: launchId,
    pair: "WC_VOID",
    source_domain: "void-work-credit-ledger",
    quote_asset_form: "ledger-credit",
    quote_unit: "wc",
    quote_decimals: 0,
    market_meta: {
      adapter_id: VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
      opening_only: true,
      fixed_price: false,
      protocol_wc_seed_units: "0",
    },
  };
  value.settlement_id = wcVoidOpeningSettlementIdV1(value);
  return value;
}

const first = commitment("1", "review-alpha", "120");
const second = commitment("2", "review-beta", "380");
const firstDebit = debit(first, 120, 1790350000001);
const secondDebit = debit(second, 380, 1790350000002);

const reviewed = verifyWcVoidOpeningLedgerSettlementsV1(
  launchId,
  [first, second],
  [secondDebit, firstDebit],
);
assert.equal(reviewed.adapter_id, EXPECTED.adapter_id);
assert.equal(reviewed.total_settled_wc_units, "500");
assert.equal(reviewed.exact_commitment_settlement_bijection, true);
assert.equal(reviewed.duplicate_settlement_rejected, true);
assert.equal(reviewed.duplicate_commitment_settlement_rejected, true);
assert.equal(reviewed.ledger_event_shape_verified, true);
assert.equal(reviewed.canonical_balance_debit_compatible, true);
assert.equal(reviewed.ledger_persistence_verified, false);
assert.equal(reviewed.ledger_write_performed, false);
assert.equal(reviewed.wc_balance_mutation_performed, false);

function rejects(mutator, code) {
  const bad = structuredClone([firstDebit, secondDebit]);
  mutator(bad);
  assert.throws(
    () => verifyWcVoidOpeningLedgerSettlementsV1(
      launchId,
      [first, second],
      bad,
    ),
    (error) => error instanceof Error && error.message === code,
    code,
  );
}

rejects(
  (bad) => {
    bad[0].market_meta.fixed_price = true;
    bad[0].settlement_id = wcVoidOpeningSettlementIdV1(bad[0]);
  },
  "WC_VOID_OPENING_LEDGER_DEBIT_META_MISMATCH",
);
rejects(
  (bad) => {
    bad[0].account = "review-gamma";
    bad[0].settlement_id = wcVoidOpeningSettlementIdV1(bad[0]);
  },
  "WC_VOID_OPENING_SETTLEMENT_COMMITMENT_MISMATCH",
);
rejects(
  (bad) => {
    bad[1] = structuredClone(bad[0]);
  },
  "DUPLICATE_WC_VOID_OPENING_SETTLED_COMMITMENT",
);

{
  const bad = structuredClone(packet);
  bad.review.live_ledger_persistence_verified = true;
  assert.equal(
    verifyWcVoidOpeningSettlementAdapterReviewV1(bad).reason,
    "review_packet_id_invalid",
  );
}

const source = fs.readFileSync(
  "tools/void-wc-void-opening-settlement-adapter-review-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "JsonRpcProvider(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
  "writeFileSync",
  "appendFileSync",
  "renameSync",
  "systemctl",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log("VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_REVIEW_V1_PROOF_GREEN");
console.log("review_id=" + EXPECTED.review_id);
console.log("adapter_id=" + EXPECTED.adapter_id);
console.log("source_git_blob_sha=" + EXPECTED.source_git_blob_sha);
console.log("settlement_adapter_independently_reviewed=true");
console.log("live_ledger_persistence_verified=false");
console.log("quote_reserve_custody_verified=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
