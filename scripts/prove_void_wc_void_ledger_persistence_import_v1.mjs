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
  inspectWcVoidOpeningLedgerPersistenceV1,
} from "../tools/void-wc-void-ledger-persistence-v1.mjs";
import {
  VOID_WC_VOID_LEDGER_PERSISTENCE_IMPORT_AUTHORITY_V1,
  VOID_WC_VOID_LEDGER_PERSISTENCE_IMPORT_V1,
  importWcVoidLedgerPersistenceV1,
  wcVoidLedgerPersistenceReviewBindingIdV1,
} from "../tools/void-wc-void-ledger-persistence-import-v1.mjs";

const launchId = "sha256:" + "a".repeat(64);

function commitment() {
  const value = {
    schema: VOID_WC_VOID_OPENING_COMMITMENT_SCHEMA_V1,
    commitment_id: "sha256:" + "0".repeat(64),
    coupled_launch_id: launchId,
    participant_id: "sha256:" + "1".repeat(64),
    account: "ledger-import-participant",
    wc_units: "25",
  };
  value.commitment_id = wcVoidOpeningCommitmentIdV1(value);
  return value;
}

function debit(commitmentValue) {
  const value = {
    schema: VOID_WC_VOID_OPENING_LEDGER_DEBIT_SCHEMA_V1,
    kind: "debit",
    account: commitmentValue.account,
    amount: 25,
    delta: -25,
    ts_ms: 1790353000001,
    reason: "wc_void_opening_settlement_v1",
    settlement_id: "sha256:" + "0".repeat(64),
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

function fixture() {
  const parent = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-wc-ledger-import-"),
  );
  fs.chmodSync(parent, 0o700);
  const dataDir = path.join(parent, "data");
  const wcDir = path.join(dataDir, "wc_v1");
  fs.mkdirSync(wcDir, { recursive: true, mode: 0o700 });
  fs.chmodSync(dataDir, 0o700);
  fs.chmodSync(wcDir, 0o700);

  const c = commitment();
  const d = debit(c);
  const ledger = path.join(wcDir, "ledger.jsonl");
  fs.writeFileSync(ledger, JSON.stringify(d) + "\n", { mode: 0o600 });
  fs.chmodSync(ledger, 0o600);

  const receipt = inspectWcVoidOpeningLedgerPersistenceV1({
    data_dir: dataDir,
    coupled_launch_id: launchId,
    commitments: [c],
    expected_ledger_debits: [d],
    prestate_bytes: "0",
  });

  const expected = {
    coupled_launch_id: launchId,
    settlement_adapter_id:
      VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
    prestate_bytes: "0",
    settlement_set_root: receipt.settlement_set_root,
    total_settled_wc_units: receipt.total_settled_wc_units,
    expected_settlement_count: receipt.expected_settlement_count,
    binding_id: "voidwclprb1_" + "0".repeat(64),
  };
  expected.binding_id =
    wcVoidLedgerPersistenceReviewBindingIdV1(expected);

  return { parent, dataDir, c, d, receipt, expected };
}

function rejects(fn, code) {
  assert.throws(
    fn,
    (error) => error instanceof Error && error.message === code,
    code,
  );
}

assert.equal(
  VOID_WC_VOID_LEDGER_PERSISTENCE_IMPORT_V1,
  "VOID_WC_VOID_LEDGER_PERSISTENCE_IMPORT_V1",
);

{
  const f = fixture();
  try {
    assert.equal(f.receipt.ok, true);
    assert.equal(f.receipt.status, "PERSISTENCE_VERIFIED");
    assert.equal(f.receipt.ledger_persistence_verified, true);
    assert.equal(f.receipt.quote_reserve_custody_verified, true);

    const imported = importWcVoidLedgerPersistenceV1({
      expected: f.expected,
      evidence: f.receipt,
    });
    assert.equal(imported.ok, true);
    assert.equal(imported.status, "VERIFIED_LEDGER_PERSISTENCE_IMPORT");
    assert.match(imported.import_id, /^voidwclpri1_[0-9a-f]{64}$/);
    assert.match(imported.binding_id, /^voidwclprb1_[0-9a-f]{64}$/);
    assert.match(imported.source_receipt_sha256, /^sha256:[0-9a-f]{64}$/);
    assert.equal(imported.coupled_launch_id, launchId);
    assert.equal(
      imported.settlement_adapter_id,
      VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
    );
    assert.equal(imported.prestate_bytes, "0");
    assert.equal(
      imported.settlement_set_root,
      f.receipt.settlement_set_root,
    );
    assert.equal(imported.total_settled_wc_units, "25");
    assert.equal(imported.expected_settlement_count, 1);
    assert.equal(imported.wc_ledger_persistence_verified, true);
    assert.equal(imported.quote_reserve_custody_verified, true);
    assert.equal(imported.production_candidate_binding_allowed, true);
    assert.equal(imported.production_candidate_updated, false);
    assert.equal(imported.market_activation_authorized, false);
    assert.equal(imported.public_presale_activation_authorized, false);
    assert.equal(imported.funds_movement_authorized, false);

    const repeat = importWcVoidLedgerPersistenceV1({
      expected: structuredClone(f.expected),
      evidence: structuredClone(f.receipt),
    });
    assert.equal(repeat.import_id, imported.import_id);
    assert.equal(
      repeat.source_receipt_sha256,
      imported.source_receipt_sha256,
    );

    {
      const badExpected = structuredClone(f.expected);
      badExpected.total_settled_wc_units = "26";
      badExpected.binding_id =
        wcVoidLedgerPersistenceReviewBindingIdV1(badExpected);
      rejects(
        () => importWcVoidLedgerPersistenceV1({
          expected: badExpected,
          evidence: f.receipt,
        }),
        "WC_VOID_LEDGER_PERSISTENCE_IMPORT_EXPECTED_BINDING_MISMATCH",
      );
    }

    {
      const bad = structuredClone(f.receipt);
      bad.quote_reserve_custody_verified = false;
      rejects(
        () => importWcVoidLedgerPersistenceV1({
          expected: f.expected,
          evidence: bad,
        }),
        "WC_VOID_LEDGER_PERSISTENCE_IMPORT_REQUIRED_PROOF_MISSING",
      );
    }

    {
      const bad = structuredClone(f.receipt);
      bad.authority.wallet_or_signer_access = true;
      rejects(
        () => importWcVoidLedgerPersistenceV1({
          expected: f.expected,
          evidence: bad,
        }),
        "WC_VOID_LEDGER_PERSISTENCE_IMPORT_SOURCE_AUTHORITY_MISMATCH",
      );
    }

    {
      const bad = structuredClone(f.receipt);
      bad.extra = true;
      rejects(
        () => importWcVoidLedgerPersistenceV1({
          expected: f.expected,
          evidence: bad,
        }),
        "INVALID_WC_VOID_LEDGER_PERSISTENCE_RECEIPT_SHAPE",
      );
    }

    {
      const bad = structuredClone(f.receipt);
      bad.settlement_set_root = "sha256:" + "f".repeat(64);
      rejects(
        () => importWcVoidLedgerPersistenceV1({
          expected: f.expected,
          evidence: bad,
        }),
        "WC_VOID_LEDGER_PERSISTENCE_IMPORT_EXPECTED_BINDING_MISMATCH",
      );
    }
  } finally {
    fs.rmSync(f.parent, { recursive: true, force: true });
  }
}

for (const [key, value] of Object.entries(
  VOID_WC_VOID_LEDGER_PERSISTENCE_IMPORT_AUTHORITY_V1,
)) {
  if (key === "source_only" || key === "explicit_input_only") {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const source = fs.readFileSync(
  "tools/void-wc-void-ledger-persistence-import-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "readFileSync(",
  "writeFileSync(",
  "appendFileSync(",
  "renameSync(",
  "JsonRpcProvider(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
  "systemctl",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log("VOID_WC_VOID_LEDGER_PERSISTENCE_IMPORT_V1_PROOF_GREEN");
console.log("canonical_ledger_verifier_receipt_consumed=true");
console.log("review_binding_content_addressed=true");
console.log("source_receipt_content_addressed=true");
console.log("settlement_root_bound=true");
console.log("settled_wc_total_bound=true");
console.log("prestate_offset_bound=true");
console.log("wc_ledger_persistence_verified=true");
console.log("quote_reserve_custody_verified=true");
console.log("production_candidate_binding_allowed=true");
console.log("production_candidate_updated=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
