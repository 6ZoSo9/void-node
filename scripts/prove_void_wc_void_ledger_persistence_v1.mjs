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
  VOID_WC_VOID_LEDGER_PERSISTENCE_AUTHORITY_V1,
  VOID_WC_VOID_LEDGER_PERSISTENCE_V1,
  inspectWcVoidOpeningLedgerPersistenceV1,
} from "../tools/void-wc-void-ledger-persistence-v1.mjs";

const hash = (digit) => "sha256:" + String(digit).repeat(64);
const launchId = hash("c");

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

function append(file, value) {
  fs.appendFileSync(file, JSON.stringify(value) + "\n", {
    encoding: "utf8",
    mode: 0o600,
  });
}

function rejects(fn, code) {
  assert.throws(
    fn,
    (error) => error instanceof Error && error.message === code,
    code,
  );
}

function fixture() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-wc-void-ledger-persistence-"),
  );
  fs.chmodSync(root, 0o700);
  const wcDir = path.join(root, "wc_v1");
  fs.mkdirSync(wcDir, { mode: 0o700 });
  const ledger = path.join(wcDir, "ledger.jsonl");
  fs.writeFileSync(
    ledger,
    JSON.stringify({
      kind: "credit",
      account: "historical-account",
      delta: 3,
      ts_ms: 1790340000000,
      reason: "verified_receipt_acceptance_v1",
    }) + "\n",
    { mode: 0o600 },
  );
  const prestateBytes = fs.statSync(ledger).size;

  const first = commitment("1", "opening-alpha", "120");
  const second = commitment("2", "opening-beta", "380");
  const firstDebit = debit(first, 120, 1790345000001);
  const secondDebit = debit(second, 380, 1790345000002);

  append(ledger, {
    kind: "credit",
    account: "other-account",
    delta: 3,
    ts_ms: 1790345000000,
    reason: "verified_receipt_acceptance_v1",
  });
  append(ledger, secondDebit);
  append(ledger, firstDebit);

  return {
    root,
    wcDir,
    ledger,
    prestateBytes,
    commitments: [first, second],
    debits: [firstDebit, secondDebit],
  };
}

assert.equal(
  VOID_WC_VOID_LEDGER_PERSISTENCE_V1,
  "VOID_WC_VOID_LEDGER_PERSISTENCE_V1",
);
for (const [key, value] of Object.entries(
  VOID_WC_VOID_LEDGER_PERSISTENCE_AUTHORITY_V1,
)) {
  assert.equal(
    [
      "bounded_read_only_filesystem_inspection",
      "canonical_wc_ledger_path_required",
      "append_window_only",
      "stable_file_identity_required",
    ].includes(key)
      ? value
      : !value,
    true,
    key,
  );
}

{
  const f = fixture();
  try {
    const result = inspectWcVoidOpeningLedgerPersistenceV1({
      data_dir: f.root,
      coupled_launch_id: launchId,
      commitments: f.commitments,
      expected_ledger_debits: f.debits,
      prestate_bytes: String(f.prestateBytes),
    });
    assert.equal(result.ok, true);
    assert.equal(result.status, "PERSISTENCE_VERIFIED");
    assert.equal(result.coupled_launch_id, launchId);
    assert.equal(
      result.settlement_adapter_id,
      "void-wc-ledger-opening-settlement-v1",
    );
    assert.equal(result.opening_settlement_line_count, 2);
    assert.equal(result.expected_settlement_count, 2);
    assert.equal(result.total_settled_wc_units, "500");
    assert.equal(result.exact_expected_settlement_set_present, true);
    assert.equal(result.no_extra_opening_settlement_in_window, true);
    assert.equal(result.canonical_ledger_direct_file, true);
    assert.equal(result.canonical_ledger_realpath_exact, true);
    assert.equal(result.canonical_ledger_owner_bound, true);
    assert.equal(
      result.canonical_ledger_not_group_or_world_writable,
      true,
    );
    assert.equal(result.prestate_line_boundary_verified, true);
    assert.equal(result.stable_file_identity_during_read, true);
    assert.equal(result.ledger_persistence_verified, true);
    assert.equal(result.quote_reserve_custody_verified, true);
    assert.equal(result.ledger_write_performed, false);
    assert.equal(result.wc_balance_mutation_performed, false);
    assert.equal(result.market_activation_authority, false);
    assert.equal(result.inventory_funding_authority, false);
    assert.equal(result.public_presale_activation_authority, false);
    assert.equal(result.funds_movement_authority, false);
    assert.match(result.append_window_sha256, /^[0-9a-f]{64}$/);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  try {
    const extraCommitment = commitment("3", "opening-gamma", "1");
    const extraDebit = debit(extraCommitment, 1, 1790345000003);
    append(f.ledger, extraDebit);
    rejects(
      () => inspectWcVoidOpeningLedgerPersistenceV1({
        data_dir: f.root,
        coupled_launch_id: launchId,
        commitments: f.commitments,
        expected_ledger_debits: f.debits,
        prestate_bytes: String(f.prestateBytes),
      }),
      "WC_VOID_LEDGER_OPENING_SETTLEMENT_COUNT_MISMATCH",
    );
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  try {
    rejects(
      () => inspectWcVoidOpeningLedgerPersistenceV1({
        data_dir: f.root,
        coupled_launch_id: launchId,
        commitments: f.commitments,
        expected_ledger_debits: [f.debits[0]],
        prestate_bytes: String(f.prestateBytes),
      }),
      "WC_VOID_LEDGER_OPENING_SETTLEMENT_COUNT_MISMATCH",
    );
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  try {
    rejects(
      () => inspectWcVoidOpeningLedgerPersistenceV1({
        data_dir: f.root,
        coupled_launch_id: launchId,
        commitments: f.commitments,
        expected_ledger_debits: f.debits,
        prestate_bytes: String(f.prestateBytes - 1),
      }),
      "WC_VOID_LEDGER_PRESTATE_NOT_LINE_ALIGNED",
    );
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  try {
    fs.chmodSync(f.ledger, 0o622);
    rejects(
      () => inspectWcVoidOpeningLedgerPersistenceV1({
        data_dir: f.root,
        coupled_launch_id: launchId,
        commitments: f.commitments,
        expected_ledger_debits: f.debits,
        prestate_bytes: String(f.prestateBytes),
      }),
      "WC_VOID_CANONICAL_LEDGER_MODE_NOT_PRIVATE",
    );
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  const original = f.ledger + ".real";
  try {
    fs.renameSync(f.ledger, original);
    fs.symlinkSync(original, f.ledger);
    rejects(
      () => inspectWcVoidOpeningLedgerPersistenceV1({
        data_dir: f.root,
        coupled_launch_id: launchId,
        commitments: f.commitments,
        expected_ledger_debits: f.debits,
        prestate_bytes: String(f.prestateBytes),
      }),
      "WC_VOID_CANONICAL_LEDGER_NOT_DIRECT_FILE",
    );
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
}

const source = fs.readFileSync(
  "tools/void-wc-void-ledger-persistence-v1.mjs",
  "utf8",
);
assert.doesNotMatch(
  source,
  /appendFileSync|writeFileSync|renameSync|unlinkSync|rmSync|mkdirSync/,
);
assert.doesNotMatch(source, /private[_-]?key|mnemonic/i);
assert.match(source, /fs\.openSync\(ledger, "r"\)/);
assert.match(source, /prestateBytes/);
assert.match(source, /MAX_APPEND_BYTES/);
assert.match(source, /WC_VOID_LEDGER_CHANGED_DURING_INSPECTION/);

console.log("VOID_WC_VOID_LEDGER_PERSISTENCE_V1_PROOF_GREEN");
console.log("append_window_only=true");
console.log("canonical_wc_ledger_path_required=true");
console.log("canonical_ledger_direct_file=true");
console.log("stable_file_identity_required=true");
console.log("exact_expected_settlement_set_required=true");
console.log("extra_opening_settlement_rejected=true");
console.log("ledger_persistence_verified=true");
console.log("quote_reserve_custody_verified=true");
console.log("ledger_write=false");
console.log("wc_balance_mutation=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
