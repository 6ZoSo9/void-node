#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_WC_VOID_OPENING_COMMITMENT_SCHEMA_V1,
  VOID_WC_VOID_OPENING_LEDGER_DEBIT_SCHEMA_V1,
  VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
  deriveWcVoidCoupledOpeningStateV1,
  verifyWcVoidOpeningLedgerSettlementsV1,
  wcVoidOpeningCommitmentIdV1,
  wcVoidOpeningSettlementIdV1,
} from "../tools/void-wc-void-coupled-opening-v1.mjs";

import {
  VOID_WC_VOID_OPENING_EXECUTION_BINDING_V1,
  VOID_WC_VOID_OPENING_TRANSFER_CLAIM_SCHEMA_V1,
  deriveWcVoidOpeningClaimBindingV1,
  wcVoidOpeningTransferDispositionIdV1,
} from "../tools/void-wc-void-opening-claim-binding-v1.mjs";

import {
  VOID_WC_VOID_OPENING_CLAIM_BINDING_PERSISTENCE_AUTHORITY_V1,
  VOID_WC_VOID_OPENING_CLAIM_BINDING_PERSISTENCE_V1,
  inspectWcVoidOpeningClaimBindingPersistenceV1,
} from "../tools/void-wc-void-opening-claim-binding-persistence-v1.mjs";

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

function fixture() {
  const first = commitment("1", "wc-opening-alpha", "250");
  const second = commitment("2", "wc-opening-beta", "750");
  const firstDebit = debit(first, 250, 1790344000001);
  const secondDebit = debit(second, 750, 1790344000002);
  const commitments = [first, second];
  const ledgerDebits = [firstDebit, secondDebit];

  const opening = deriveWcVoidCoupledOpeningStateV1({
    coupled_launch_id: launchId,
    commitments,
    ledger_debits: ledgerDebits,
  });
  const settlements = verifyWcVoidOpeningLedgerSettlementsV1(
    launchId,
    commitments,
    ledgerDebits,
  );

  const allocationByCommitment = new Map(
    opening.participant_allocations.map((value) => [
      value.commitment_id,
      value,
    ]),
  );
  const settlementByCommitment = new Map(
    settlements.settlements.map((value) => [
      value.commitment_id,
      value,
    ]),
  );

  const transfer = (commitmentValue, recipient) => {
    const allocation = allocationByCommitment.get(
      commitmentValue.commitment_id,
    );
    const settlement = settlementByCommitment.get(
      commitmentValue.commitment_id,
    );
    const value = {
      schema: VOID_WC_VOID_OPENING_TRANSFER_CLAIM_SCHEMA_V1,
      disposition_id: hash("0"),
      coupled_launch_id: launchId,
      opening_state_id: opening.opening_state_id,
      chain_id: VOID_WC_VOID_OPENING_EXECUTION_BINDING_V1.chain_id,
      network_identity:
        VOID_WC_VOID_OPENING_EXECUTION_BINDING_V1.network_identity,
      execution_epoch:
        VOID_WC_VOID_OPENING_EXECUTION_BINDING_V1.execution_epoch,
      void_token: VOID_WC_VOID_OPENING_EXECUTION_BINDING_V1.void_token,
      commitment_id: commitmentValue.commitment_id,
      settlement_id: settlement.settlement_id,
      participant_id: commitmentValue.participant_id,
      account: commitmentValue.account,
      void_recipient: recipient,
      void_atoms: allocation.void_atoms,
    };
    value.disposition_id = wcVoidOpeningTransferDispositionIdV1(value);
    return value;
  };

  const dispositions = [
    transfer(first, "0x1111111111111111111111111111111111111111"),
    transfer(second, "0x2222222222222222222222222222222222222222"),
  ];

  const binding = deriveWcVoidOpeningClaimBindingV1({
    coupled_launch_id: launchId,
    commitments,
    ledger_debits: ledgerDebits,
    mode: "finalize",
    dispositions,
  });

  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-wc-void-claim-binding-persist-"),
  );
  fs.chmodSync(root, 0o700);
  const wcDir = path.join(root, "wc_v1");
  const bindingDir = path.join(wcDir, "opening-claim-bindings-v1");
  fs.mkdirSync(bindingDir, { recursive: true, mode: 0o700 });
  fs.chmodSync(wcDir, 0o700);
  fs.chmodSync(bindingDir, 0o700);

  const file = path.join(
    bindingDir,
    binding.binding_id.slice("sha256:".length) + ".json",
  );
  fs.writeFileSync(file, JSON.stringify(binding, null, 2) + "\n", {
    encoding: "utf8",
    mode: 0o600,
  });

  return {
    root,
    wcDir,
    bindingDir,
    file,
    commitments,
    ledgerDebits,
    dispositions,
    binding,
  };
}

function inspect(f) {
  return inspectWcVoidOpeningClaimBindingPersistenceV1({
    data_dir: f.root,
    coupled_launch_id: launchId,
    commitments: f.commitments,
    ledger_debits: f.ledgerDebits,
    mode: "finalize",
    dispositions: f.dispositions,
  });
}

function rejects(fn, code) {
  assert.throws(
    fn,
    (error) => error instanceof Error && error.message === code,
    code,
  );
}

assert.equal(
  VOID_WC_VOID_OPENING_CLAIM_BINDING_PERSISTENCE_V1,
  "VOID_WC_VOID_OPENING_CLAIM_BINDING_PERSISTENCE_V1",
);

for (const [key, value] of Object.entries(
  VOID_WC_VOID_OPENING_CLAIM_BINDING_PERSISTENCE_AUTHORITY_V1,
)) {
  assert.equal(
    [
      "bounded_read_only_filesystem_inspection",
      "canonical_binding_path_required",
      "stable_file_identity_required",
      "exact_binding_rederivation_required",
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
    const result = inspect(f);
    assert.equal(result.ok, true);
    assert.equal(result.status, "PERSISTENCE_VERIFIED");
    assert.equal(result.coupled_launch_id, launchId);
    assert.equal(result.opening_state_id, f.binding.opening_state_id);
    assert.equal(result.binding_id, f.binding.binding_id);
    assert.equal(result.mode, "finalize");
    assert.equal(result.disposition_count, 2);
    assert.equal(
      result.transferred_void_atoms,
      "5000000000000000000000000",
    );
    assert.equal(result.refunded_wc_units, "0");
    assert.equal(result.canonical_binding_direct_file, true);
    assert.equal(result.canonical_binding_realpath_exact, true);
    assert.equal(result.canonical_binding_owner_bound, true);
    assert.equal(
      result.canonical_binding_not_group_or_world_writable,
      true,
    );
    assert.equal(result.stable_file_identity_during_read, true);
    assert.equal(result.exact_binding_rederivation_verified, true);
    assert.equal(result.binding_persistence_verified, true);
    assert.equal(
      result.opening_claim_transfer_or_refund_binding_persistence_verified,
      true,
    );
    assert.equal(result.runtime_execution_ready, false);
    assert.equal(result.ledger_write_performed, false);
    assert.equal(result.wc_balance_mutation_performed, false);
    assert.equal(result.token_transfer_performed, false);
    assert.equal(result.refund_write_performed, false);
    assert.equal(result.market_activation_authority, false);
    assert.equal(result.public_presale_activation_authority, false);
    assert.equal(result.funds_movement_authority, false);
    assert.match(result.persisted_file_sha256, /^[0-9a-f]{64}$/);
    assert.match(
      result.persisted_path,
      /^wc_v1\/opening-claim-bindings-v1\/[0-9a-f]{64}\.json$/,
    );
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  try {
    const parsed = JSON.parse(fs.readFileSync(f.file, "utf8"));
    parsed.transferred_void_atoms =
      "4999999999999999999999999";
    fs.writeFileSync(f.file, JSON.stringify(parsed) + "\n", {
      mode: 0o600,
    });
    rejects(
      () => inspect(f),
      "WC_VOID_OPENING_CLAIM_BINDING_PERSISTED_CONTENT_MISMATCH",
    );
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  try {
    const parsed = JSON.parse(fs.readFileSync(f.file, "utf8"));
    parsed.extra_field = true;
    fs.writeFileSync(f.file, JSON.stringify(parsed) + "\n", {
      mode: 0o600,
    });
    rejects(
      () => inspect(f),
      "WC_VOID_OPENING_CLAIM_BINDING_PERSISTED_CONTENT_MISMATCH",
    );
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  try {
    fs.chmodSync(f.file, 0o622);
    rejects(
      () => inspect(f),
      "WC_VOID_OPENING_CLAIM_BINDING_MODE_NOT_PRIVATE",
    );
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  const real = f.file + ".real";
  try {
    fs.renameSync(f.file, real);
    fs.symlinkSync(real, f.file);
    rejects(
      () => inspect(f),
      "WC_VOID_OPENING_CLAIM_BINDING_NOT_DIRECT_FILE",
    );
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  try {
    fs.unlinkSync(f.file);
    rejects(
      () => inspect(f),
      "WC_VOID_OPENING_CLAIM_BINDING_PERSISTED_FILE_UNAVAILABLE",
    );
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  try {
    fs.chmodSync(f.bindingDir, 0o722);
    rejects(
      () => inspect(f),
      "WC_VOID_CLAIM_BINDING_DIRECTORY_CUSTODY_INVALID",
    );
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  try {
    rejects(
      () => inspectWcVoidOpeningClaimBindingPersistenceV1({
        data_dir: "relative/path",
        coupled_launch_id: launchId,
        commitments: f.commitments,
        ledger_debits: f.ledgerDebits,
        mode: "finalize",
        dispositions: f.dispositions,
      }),
      "INVALID_WC_VOID_CLAIM_BINDING_DATA_DIR",
    );
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  try {
    const bad = structuredClone(f.dispositions);
    bad[0].void_atoms =
      (BigInt(bad[0].void_atoms) - 1n).toString();
    bad[0].disposition_id =
      wcVoidOpeningTransferDispositionIdV1(bad[0]);
    rejects(
      () => inspectWcVoidOpeningClaimBindingPersistenceV1({
        data_dir: f.root,
        coupled_launch_id: launchId,
        commitments: f.commitments,
        ledger_debits: f.ledgerDebits,
        mode: "finalize",
        dispositions: bad,
      }),
      "WC_VOID_OPENING_TRANSFER_ALLOCATION_MISMATCH",
    );
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
}

const source = fs.readFileSync(
  "tools/void-wc-void-opening-claim-binding-persistence-v1.mjs",
  "utf8",
);
assert.doesNotMatch(
  source,
  /appendFileSync|writeFileSync|renameSync|unlinkSync|rmSync|mkdirSync/,
);
assert.doesNotMatch(source, /private[_-]?key|mnemonic/i);
assert.doesNotMatch(source, /eth_sendRawTransaction|eth_sendTransaction/i);
assert.match(source, /fs\.openSync\(file, "r"\)/);
assert.match(source, /sameStableFile\(lstat, observed\.stat\)/);
assert.match(source, /exact_binding_rederivation_verified: true/);

console.log(
  "VOID_WC_VOID_OPENING_CLAIM_BINDING_PERSISTENCE_V1_PROOF_GREEN",
);
console.log("canonical_binding_path_required=true");
console.log("exact_binding_rederivation_required=true");
console.log("stable_file_identity_required=true");
console.log("binding_persistence_verified=true");
console.log(
  "opening_claim_transfer_or_refund_binding_persistence_verified=true",
);
console.log("runtime_execution_ready=false");
console.log("ledger_write=false");
console.log("token_transfer=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
