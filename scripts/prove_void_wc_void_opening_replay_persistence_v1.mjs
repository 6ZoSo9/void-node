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
  VOID_WC_VOID_OPENING_REFUND_CLAIM_SCHEMA_V1,
  VOID_WC_VOID_OPENING_TRANSFER_CLAIM_SCHEMA_V1,
  wcVoidOpeningRefundDispositionIdV1,
  wcVoidOpeningTransferDispositionIdV1,
} from "../tools/void-wc-void-opening-claim-binding-v1.mjs";

import {
  initialWcVoidOpeningReplayStateV1,
} from "../tools/void-wc-void-opening-replay-protection-v1.mjs";

import {
  VOID_WC_VOID_OPENING_REPLAY_PERSISTENCE_AUTHORITY_V1,
  VOID_WC_VOID_OPENING_REPLAY_PERSISTENCE_CONFIRMATION_V1,
  VOID_WC_VOID_OPENING_REPLAY_PERSISTENCE_V1,
  VOID_WC_VOID_OPENING_REPLAY_TERMINAL_CAPSULE_V1,
  persistWcVoidOpeningReplayTerminalV1,
} from "../tools/void-wc-void-opening-replay-persistence-v1.mjs";

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

const first = commitment("1", "persist-alpha", "250");
const second = commitment("2", "persist-beta", "750");
const firstDebit = debit(first, 250, 1790352000001);
const secondDebit = debit(second, 750, 1790352000002);
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

function transferClaim(commitmentValue, recipient) {
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
}

function refundClaim(commitmentValue) {
  const settlement = settlementByCommitment.get(
    commitmentValue.commitment_id,
  );
  const value = {
    schema: VOID_WC_VOID_OPENING_REFUND_CLAIM_SCHEMA_V1,
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
    wc_refund_units: settlement.amount_wc,
  };
  value.disposition_id = wcVoidOpeningRefundDispositionIdV1(value);
  return value;
}

const transfers = [
  transferClaim(first, "0x1111111111111111111111111111111111111111"),
  transferClaim(second, "0x2222222222222222222222222222222222222222"),
];
const refunds = [refundClaim(first), refundClaim(second)];
const initial = initialWcVoidOpeningReplayStateV1(launchId);

function temporaryDataDir() {
  const parent = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-wc-replay-persistence-"),
  );
  fs.chmodSync(parent, 0o700);
  const dataDir = path.join(parent, "data");
  const wcDir = path.join(dataDir, "wc_v1");
  fs.mkdirSync(wcDir, { recursive: true, mode: 0o700 });
  fs.chmodSync(dataDir, 0o700);
  fs.chmodSync(wcDir, 0o700);
  return { parent, dataDir, wcDir };
}

function request(
  dataDir,
  mode = "finalize",
  dispositions = transfers,
  confirmation = VOID_WC_VOID_OPENING_REPLAY_PERSISTENCE_CONFIRMATION_V1,
  recordedAt = "2030-01-01T00:00:00Z",
  beforeState = initial,
) {
  return {
    data_dir: dataDir,
    recorded_at_utc: recordedAt,
    confirmation,
    before_state: beforeState,
    coupled_launch_id: launchId,
    commitments,
    ledger_debits: ledgerDebits,
    mode,
    dispositions,
  };
}

function rejects(fn, code) {
  assert.throws(
    fn,
    (error) => error instanceof Error && error.message === code,
    code,
  );
}

assert.equal(
  VOID_WC_VOID_OPENING_REPLAY_PERSISTENCE_V1,
  "VOID_WC_VOID_OPENING_REPLAY_PERSISTENCE_V1",
);
assert.equal(
  VOID_WC_VOID_OPENING_REPLAY_TERMINAL_CAPSULE_V1,
  "VOID_WC_VOID_OPENING_REPLAY_TERMINAL_CAPSULE_V1",
);
assert.equal(
  VOID_WC_VOID_OPENING_REPLAY_PERSISTENCE_CONFIRMATION_V1,
  "persistWcVoidOpeningReplayTerminalState",
);

{
  const nonexistent = path.join(
    os.tmpdir(),
    "void-wc-replay-persistence-missing-" + String(process.pid),
  );
  rejects(
    () => persistWcVoidOpeningReplayTerminalV1(
      request(nonexistent, "finalize", transfers, "notConfirmed"),
    ),
    "WC_VOID_OPENING_REPLAY_PERSISTENCE_CONFIRMATION_REQUIRED",
  );
}

{
  const f = temporaryDataDir();
  try {
    const committed = persistWcVoidOpeningReplayTerminalV1(
      request(f.dataDir),
    );
    assert.equal(committed.ok, true);
    assert.equal(committed.status, "committed");
    assert.equal(committed.coupled_launch_id, launchId);
    assert.equal(committed.mode, "finalize");
    assert.equal(committed.recorded_at_utc, "2030-01-01T00:00:00Z");
    assert.match(committed.capsule_id, /^voidwcrp1_[0-9a-f]{64}$/);
    assert.match(committed.transition_id, /^sha256:[0-9a-f]{64}$/);
    assert.match(committed.binding_id, /^sha256:[0-9a-f]{64}$/);
    assert.equal(committed.terminal_replay_state_persisted, true);
    assert.equal(committed.exact_duplicate, false);
    assert.equal(committed.create_once_terminal_file, true);
    assert.equal(committed.atomic_complete_file_publication, true);
    assert.equal(committed.stable_private_custody_verified, true);
    assert.equal(
      committed.duplicate_replay_protection_persistence_mechanism_ready,
      true,
    );
    assert.equal(committed.production_duplicate_replay_gate_updated, false);
    assert.equal(committed.market_activation_authority, false);
    assert.equal(committed.public_presale_activation_authority, false);
    assert.equal(committed.funds_movement_authority, false);

    const terminal = path.join(f.dataDir, committed.terminal_path);
    const terminalStat = fs.lstatSync(terminal);
    assert.equal(terminalStat.isFile(), true);
    assert.equal((terminalStat.mode & 0o777), 0o600);

    const capsule = JSON.parse(fs.readFileSync(terminal, "utf8"));
    assert.equal(
      capsule.marker,
      VOID_WC_VOID_OPENING_REPLAY_TERMINAL_CAPSULE_V1,
    );
    assert.equal(capsule.capsule_id, committed.capsule_id);
    assert.equal(capsule.transition_id, committed.transition_id);
    assert.equal(capsule.binding_id, committed.binding_id);
    assert.equal(capsule.after_revision, 1);
    assert.equal(capsule.terminal_state.revision, 1);

    const duplicate = persistWcVoidOpeningReplayTerminalV1(
      request(
        f.dataDir,
        "finalize",
        transfers,
        VOID_WC_VOID_OPENING_REPLAY_PERSISTENCE_CONFIRMATION_V1,
        "2030-01-01T00:00:01Z",
      ),
    );
    assert.equal(duplicate.status, "duplicate");
    assert.equal(duplicate.exact_duplicate, true);
    assert.equal(duplicate.capsule_id, committed.capsule_id);
    assert.equal(fs.lstatSync(terminal).ino, terminalStat.ino);

    rejects(
      () => persistWcVoidOpeningReplayTerminalV1(
        request(f.dataDir, "abort", refunds),
      ),
      "WC_VOID_OPENING_REPLAY_TERMINAL_ALREADY_COMMITTED",
    );

    const stalePending = path.join(
      path.dirname(terminal),
      ".pending-stale-proof.json",
    );
    fs.writeFileSync(stalePending, "{}\n", { mode: 0o600 });
    rejects(
      () => persistWcVoidOpeningReplayTerminalV1(
        request(f.dataDir),
      ),
      "WC_VOID_OPENING_REPLAY_PERSISTENCE_PENDING_ARTIFACT_REQUIRES_REVIEW",
    );
    fs.unlinkSync(stalePending);
  } finally {
    fs.rmSync(f.parent, { recursive: true, force: true });
  }
}

{
  const f = temporaryDataDir();
  try {
    const committed = persistWcVoidOpeningReplayTerminalV1(
      request(f.dataDir),
    );
    const terminal = path.join(f.dataDir, committed.terminal_path);
    fs.writeFileSync(terminal, "{}\n", { mode: 0o600 });
    rejects(
      () => persistWcVoidOpeningReplayTerminalV1(
        request(f.dataDir),
      ),
      "WC_VOID_OPENING_REPLAY_TERMINAL_ALREADY_COMMITTED",
    );
  } finally {
    fs.rmSync(f.parent, { recursive: true, force: true });
  }
}

{
  const f = temporaryDataDir();
  try {
    const notInitial = structuredClone(initial);
    notInitial.revision = 1;
    rejects(
      () => persistWcVoidOpeningReplayTerminalV1(
        request(
          f.dataDir,
          "finalize",
          transfers,
          VOID_WC_VOID_OPENING_REPLAY_PERSISTENCE_CONFIRMATION_V1,
          "2030-01-01T00:00:00Z",
          notInitial,
        ),
      ),
      "WC_VOID_OPENING_REPLAY_PERSISTENCE_INITIAL_STATE_REQUIRED",
    );
  } finally {
    fs.rmSync(f.parent, { recursive: true, force: true });
  }
}

for (const [key, value] of Object.entries(
  VOID_WC_VOID_OPENING_REPLAY_PERSISTENCE_AUTHORITY_V1,
)) {
  if (
    key === "explicit_confirmation_required" ||
    key === "bounded_filesystem_read" ||
    key === "bounded_filesystem_write" ||
    key === "terminal_replay_state_persistence"
  ) {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const source = fs.readFileSync(
  "tools/void-wc-void-opening-replay-persistence-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "JsonRpcProvider(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
  "private_key",
  "mnemonic",
  "systemctl",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}
assert.match(source, /O_EXCL/);
assert.match(source, /O_NOFOLLOW/);
assert.match(source, /fs\.linkSync\(pending, terminal\)/);
assert.match(source, /fs\.fsyncSync/);
assert.doesNotMatch(source, /fs\.renameSync\(/);

console.log("VOID_WC_VOID_OPENING_REPLAY_PERSISTENCE_V1_PROOF_GREEN");
console.log("explicit_confirmation_required=true");
console.log("create_once_terminal_file=true");
console.log("atomic_complete_file_publication=true");
console.log("exact_duplicate_idempotent=true");
console.log("alternate_outcome_conflict_rejected=true");
console.log("stale_pending_artifact_holds=true");
console.log("persisted_capsule_tamper_holds=true");
console.log("production_duplicate_replay_gate_updated=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
