#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_WC_VOID_OPENING_COMMITMENT_SCHEMA_V1,
  VOID_WC_VOID_OPENING_LEDGER_DEBIT_SCHEMA_V1,
  VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
  wcVoidOpeningCommitmentIdV1,
  wcVoidOpeningSettlementIdV1,
} from "../tools/void-wc-void-coupled-opening-v1.mjs";
import {
  VOID_WC_VOID_REVERSE_SETTLEMENT_ADAPTER_ID_V1,
  VOID_WC_VOID_REVERSE_SETTLEMENT_POLICY_V1,
} from "../tools/void-wc-void-reverse-settlement-v1.mjs";
import {
  VOID_WC_VOID_CURRENT_QUOTE_RESERVE_AUTHORITY_V1,
  VOID_WC_VOID_CURRENT_QUOTE_RESERVE_V1,
  inspectWcVoidCurrentQuoteReserveV1,
} from "../tools/void-wc-void-current-quote-reserve-v1.mjs";

const hash = (digit) => "sha256:" + String(digit).repeat(64);
const txHash = (digit) => "0x" + String(digit).repeat(64);
const launchId = hash("a");
const marketVault =
  "0x1111111111111111111111111111111111111111";

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

function openingDebit(commitmentValue, amount, tsMs) {
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

function reverseCredit({
  digit,
  wcAmount,
  tsMs,
  coupledLaunchId = launchId,
  vault = marketVault,
}) {
  const amount = Number(wcAmount);
  assert(Number.isSafeInteger(amount));
  return {
    kind: "credit",
    account: "reverse-" + digit,
    delta: amount,
    ts_ms: tsMs,
    reason: "wc_void_reverse_settlement_v1",
    settlement_id: hash(digit),
    quote_id: hash(String(Number(digit) + 1)),
    coupled_launch_id: coupledLaunchId,
    market_state_id: hash(String(Number(digit) + 2)),
    participant_address:
      "0x" + digit.repeat(40),
    market_vault: vault,
    void_transfer_tx_hash: txHash(digit),
    void_transfer_log_index: "0",
    void_amount_atoms: "1000000000000000000",
    wc_amount: String(wcAmount),
    market_meta: {
      adapter_id: VOID_WC_VOID_REVERSE_SETTLEMENT_ADAPTER_ID_V1,
      pair: "WC_VOID",
      direction: "void_to_wc",
      source_domain: "void-work-credit-ledger",
      quote_asset_form: "ledger-credit",
      quote_unit: "wc",
      quote_decimals: 0,
      fixed_price: false,
      presale_price_authority: false,
      native_gas_model:
        VOID_WC_VOID_REVERSE_SETTLEMENT_POLICY_V1.native_gas_model,
      native_gas_economic_charge_atoms: "0",
    },
  };
}

const first = commitment("1", "reserve-alpha", "120");
const second = commitment("2", "reserve-beta", "380");
const firstDebit = openingDebit(first, 120, 1790400000001);
const secondDebit = openingDebit(second, 380, 1790400000002);
const commitments = [first, second];
const openingDebits = [firstDebit, secondDebit];

function genericEarning(account, delta, tsMs) {
  return {
    kind: "credit",
    account,
    delta,
    ts_ms: tsMs,
    reason: "verified_receipt_acceptance_v1",
    receipt_id: "receipt-" + account,
  };
}

function fixture(rows) {
  const parent = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-wc-current-reserve-"),
  );
  fs.chmodSync(parent, 0o700);
  const dataDir = path.join(parent, "data");
  const wcDir = path.join(dataDir, "wc_v1");
  fs.mkdirSync(wcDir, { recursive: true, mode: 0o700 });
  fs.chmodSync(dataDir, 0o700);
  fs.chmodSync(wcDir, 0o700);
  const ledger = path.join(wcDir, "ledger.jsonl");
  const bytes = Buffer.from(
    rows.map((row) => JSON.stringify(row)).join("\n") + "\n",
    "utf8",
  );
  fs.writeFileSync(ledger, bytes, { mode: 0o600 });
  fs.chmodSync(ledger, 0o600);
  return { parent, dataDir, ledger };
}

function inspect(dataDir) {
  return inspectWcVoidCurrentQuoteReserveV1({
    data_dir: dataDir,
    coupled_launch_id: launchId,
    market_vault: marketVault,
    commitments,
    expected_ledger_debits: openingDebits,
    prestate_bytes: "0",
  });
}

function rejects(rows, code) {
  const f = fixture(rows);
  try {
    assert.throws(
      () => inspect(f.dataDir),
      (error) =>
        error instanceof Error &&
        error.message === code,
      code,
    );
  } finally {
    fs.rmSync(f.parent, { recursive: true, force: true });
  }
}

{
  const rows = [
    genericEarning("unrelated-before", 3, 1790399999999),
    firstDebit,
    secondDebit,
    reverseCredit({
      digit: "3",
      wcAmount: 100,
      tsMs: 1790400001000,
    }),
    genericEarning("unrelated-after", 4, 1790400002000),
    reverseCredit({
      digit: "6",
      wcAmount: 50,
      tsMs: 1790400003000,
      coupledLaunchId: hash("f"),
      vault:
        "0x9999999999999999999999999999999999999999",
    }),
  ];
  const f = fixture(rows);
  try {
    const result = inspect(f.dataDir);
    assert.equal(result.ok, true);
    assert.equal(
      result.status,
      "CURRENT_QUOTE_RESERVE_CUSTODY_VERIFIED",
    );
    assert.equal(result.marker, VOID_WC_VOID_CURRENT_QUOTE_RESERVE_V1);
    assert.equal(result.coupled_launch_id, launchId);
    assert.equal(result.market_vault, marketVault);
    assert.equal(result.opening_settled_wc_reserve_units, "500");
    assert.equal(result.reverse_settlement_credit_count, 1);
    assert.deepEqual(
      result.reverse_settlement_ids,
      [hash("3")],
    );
    assert.equal(result.reverse_credited_wc_units, "100");
    assert.equal(result.current_quote_reserve_units, "400");
    assert.match(result.append_window_sha256, /^[0-9a-f]{64}$/u);
    assert.match(result.evidence_id, /^voidwcqrc2_[0-9a-f]{64}$/u);
    assert.equal(result.ledger_persistence_verified, true);
    assert.equal(result.quote_reserve_custody_verified, true);
    assert.equal(result.reverse_credit_projection_complete, true);
    assert.equal(result.unknown_launch_market_mutation_fail_closed, true);
    assert.equal(result.post_opening_forward_settlement_supported, false);
    assert.equal(result.point_in_time_filesystem_evidence, true);
    assert.equal(result.production_runtime_binding_verified, false);
    assert.equal(result.production_candidate_binding_allowed, false);
    assert.equal(result.ledger_write_performed, false);
    assert.equal(result.wc_balance_mutation_performed, false);
    assert.equal(result.market_activation_authorized, false);
    assert.equal(result.public_presale_activation_authorized, false);
    assert.equal(result.funds_movement_authorized, false);
  } finally {
    fs.rmSync(f.parent, { recursive: true, force: true });
  }
}

{
  const bad = reverseCredit({
    digit: "3",
    wcAmount: 100,
    tsMs: 1790400001000,
  });
  bad.delta = 99;
  rejects(
    [firstDebit, secondDebit, bad],
    "WC_VOID_CURRENT_QUOTE_RESERVE_REVERSE_DELTA_MISMATCH",
  );
}

{
  const unknown = {
    kind: "credit",
    account: "unknown-market",
    delta: 1,
    ts_ms: 1790400001000,
    reason: "wc_void_future_credit_v1",
    settlement_id: hash("9"),
    coupled_launch_id: launchId,
    market_meta: {
      pair: "WC_VOID",
      adapter_id: "future-adapter",
      direction: "void_to_wc",
    },
  };
  rejects(
    [firstDebit, secondDebit, unknown],
    "WC_VOID_CURRENT_QUOTE_RESERVE_UNKNOWN_LAUNCH_LEDGER_MUTATION",
  );
}

rejects(
  [
    firstDebit,
    reverseCredit({
      digit: "3",
      wcAmount: 10,
      tsMs: 1790400001000,
    }),
    secondDebit,
  ],
  "WC_VOID_CURRENT_QUOTE_RESERVE_REVERSE_BEFORE_OPENING_COMPLETE",
);

rejects(
  [
    firstDebit,
    secondDebit,
    reverseCredit({
      digit: "3",
      wcAmount: 300,
      tsMs: 1790400001000,
    }),
    reverseCredit({
      digit: "4",
      wcAmount: 300,
      tsMs: 1790400002000,
    }),
  ],
  "WC_VOID_CURRENT_QUOTE_RESERVE_UNDERFLOW",
);

{
  const same = reverseCredit({
    digit: "3",
    wcAmount: 100,
    tsMs: 1790400001000,
  });
  const duplicate = structuredClone(same);
  duplicate.ts_ms += 1;
  rejects(
    [firstDebit, secondDebit, same, duplicate],
    "WC_VOID_CURRENT_QUOTE_RESERVE_REVERSE_SETTLEMENT_DUPLICATE",
  );
}

{
  const bad = reverseCredit({
    digit: "3",
    wcAmount: 100,
    tsMs: 1790400001000,
  });
  bad.market_meta = {
    ...bad.market_meta,
    adapter_id: "wrong-adapter",
  };
  rejects(
    [firstDebit, secondDebit, bad],
    "WC_VOID_CURRENT_QUOTE_RESERVE_REVERSE_CREDIT_CONTRACT_MISMATCH",
  );
}

for (const [key, value] of Object.entries(
  VOID_WC_VOID_CURRENT_QUOTE_RESERVE_AUTHORITY_V1,
)) {
  if (
    key === "source_verification_only" ||
    key === "bounded_filesystem_read"
  ) {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const source = fs.readFileSync(
  "tools/void-wc-void-current-quote-reserve-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "writeFileSync(",
  "appendFileSync(",
  "renameSync(",
  "unlinkSync(",
  "JsonRpcProvider(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
  "systemctl",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}
assert.match(source, /wc_void_reverse_settlement_v1/);
assert.match(source, /reverse_credited_wc_units/);
assert.match(source, /current_quote_reserve_units/);
assert.match(
  source,
  /WC_VOID_CURRENT_QUOTE_RESERVE_UNKNOWN_LAUNCH_LEDGER_MUTATION/,
);

console.log("VOID_WC_VOID_CURRENT_QUOTE_RESERVE_V1_PROOF_GREEN");
console.log("opening_reserve_bound_to_persisted_settlement_set=true");
console.log("reverse_settlement_credits_subtracted=true");
console.log("generic_earning_credits_do_not_consume_quote_reserve=true");
console.log("unknown_launch_market_mutation_holds=true");
console.log("reverse_before_opening_complete_holds=true");
console.log("reserve_underflow_holds=true");
console.log("duplicate_reverse_settlement_holds=true");
console.log("ledger_persistence_verified=true");
console.log("quote_reserve_custody_verified=true");
console.log("point_in_time_filesystem_evidence=true");
console.log("production_runtime_binding_verified=false");
console.log("production_candidate_binding_allowed=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
