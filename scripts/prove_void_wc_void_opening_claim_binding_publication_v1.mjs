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
  inspectWcVoidOpeningClaimBindingPersistenceV1,
} from "../tools/void-wc-void-opening-claim-binding-persistence-v1.mjs";

import {
  initialWcVoidOpeningReplayStateV1,
} from "../tools/void-wc-void-opening-replay-protection-v1.mjs";

import {
  VOID_WC_VOID_OPENING_REPLAY_PERSISTENCE_CONFIRMATION_V1,
  persistWcVoidOpeningReplayTerminalV1,
} from "../tools/void-wc-void-opening-replay-persistence-v1.mjs";

import {
  VOID_WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_AUTHORITY_V1,
  VOID_WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_CONFIRMATION_V1,
  VOID_WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_V1,
  persistWcVoidOpeningClaimBindingV1,
} from "../tools/void-wc-void-opening-claim-binding-publication-v1.mjs";

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

function openingFixture() {
  const first = commitment("1", "publish-alpha", "250");
  const second = commitment("2", "publish-beta", "750");
  const firstDebit = debit(first, 250, 1790353000001);
  const secondDebit = debit(second, 750, 1790353000002);
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

  return {
    commitments,
    ledgerDebits,
    transfers: [
      transferClaim(first, "0x1111111111111111111111111111111111111111"),
      transferClaim(second, "0x2222222222222222222222222222222222222222"),
    ],
    refunds: [refundClaim(first), refundClaim(second)],
  };
}

function temporaryDataDir() {
  const parent = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-wc-claim-binding-publication-"),
  );
  fs.chmodSync(parent, 0o700);
  const dataDir = path.join(parent, "data");
  const wcDir = path.join(dataDir, "wc_v1");
  fs.mkdirSync(wcDir, { recursive: true, mode: 0o700 });
  fs.chmodSync(dataDir, 0o700);
  fs.chmodSync(wcDir, 0o700);
  return { parent, dataDir, wcDir };
}

function replayRequest(dataDir, fixture, mode = "finalize", dispositions = fixture.transfers) {
  return {
    data_dir: dataDir,
    recorded_at_utc: "2030-01-01T00:00:00Z",
    confirmation: VOID_WC_VOID_OPENING_REPLAY_PERSISTENCE_CONFIRMATION_V1,
    before_state: initialWcVoidOpeningReplayStateV1(launchId),
    coupled_launch_id: launchId,
    commitments: fixture.commitments,
    ledger_debits: fixture.ledgerDebits,
    mode,
    dispositions,
  };
}

function publishRequest(
  dataDir,
  fixture,
  mode = "finalize",
  dispositions = fixture.transfers,
  confirmation = VOID_WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_CONFIRMATION_V1,
) {
  return {
    data_dir: dataDir,
    confirmation,
    coupled_launch_id: launchId,
    commitments: fixture.commitments,
    ledger_debits: fixture.ledgerDebits,
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
  VOID_WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_V1,
  "VOID_WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_V1",
);
assert.equal(
  VOID_WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_CONFIRMATION_V1,
  "persistWcVoidOpeningClaimBinding",
);

for (const [key, value] of Object.entries(
  VOID_WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_AUTHORITY_V1,
)) {
  const allowed = new Set([
    "bounded_filesystem_read",
    "bounded_filesystem_write",
    "create_once_claim_binding_persistence",
    "replay_terminal_required",
    "exact_binding_rederivation_required",
  ]);
  assert.equal(value, allowed.has(key), key);
}

{
  const fixture = openingFixture();
  const nonexistent = path.join(
    os.tmpdir(),
    "void-wc-claim-binding-publication-missing-" + String(process.pid),
  );
  rejects(
    () =>
      persistWcVoidOpeningClaimBindingV1(
        publishRequest(
          nonexistent,
          fixture,
          "finalize",
          fixture.transfers,
          "notConfirmed",
        ),
      ),
    "WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_CONFIRMATION_REQUIRED",
  );
}

{
  const fixture = openingFixture();
  const f = temporaryDataDir();
  try {
    rejects(
      () =>
        persistWcVoidOpeningClaimBindingV1(
          publishRequest(f.dataDir, fixture),
        ),
      "WC_VOID_OPENING_CLAIM_BINDING_REPLAY_TERMINAL_MISMATCH",
    );
  } finally {
    fs.rmSync(f.parent, { recursive: true, force: true });
  }
}

{
  const fixture = openingFixture();
  const f = temporaryDataDir();
  const originalLstatSync = fs.lstatSync;
  const safeDataDir = f.dataDir + ".checked";
  const replacementDataDir = f.dataDir + ".replacement";
  let swapped = false;
  try {
    persistWcVoidOpeningReplayTerminalV1(
      replayRequest(f.dataDir, fixture),
    );

    fs.mkdirSync(path.join(replacementDataDir, "wc_v1"), {
      recursive: true,
      mode: 0o700,
    });
    fs.chmodSync(replacementDataDir, 0o700);
    fs.chmodSync(path.join(replacementDataDir, "wc_v1"), 0o700);

    fs.lstatSync = function(candidate, ...args) {
      const resolved = path.resolve(String(candidate));
      const replayStore = path.resolve(
        f.dataDir,
        "wc_v1",
        "opening-replay-terminal-v1",
      );
      if (!swapped && resolved === replayStore) {
        fs.renameSync(f.dataDir, safeDataDir);
        fs.renameSync(replacementDataDir, f.dataDir);
        swapped = true;
      }
      return originalLstatSync.call(fs, candidate, ...args);
    };

    rejects(
      () =>
        persistWcVoidOpeningClaimBindingV1(
          publishRequest(f.dataDir, fixture),
        ),
      "WC_VOID_OPENING_CLAIM_BINDING_REPLAY_TERMINAL_MISMATCH",
    );
    assert.equal(swapped, true);
    assert.equal(
      fs.existsSync(
        path.join(
          f.dataDir,
          "wc_v1",
          "opening-claim-bindings-v1",
        ),
      ),
      false,
      "publisher must not create a binding store after replay-custody replacement",
    );
  } finally {
    fs.lstatSync = originalLstatSync;
    fs.rmSync(f.dataDir, { recursive: true, force: true });
    fs.rmSync(safeDataDir, { recursive: true, force: true });
    fs.rmSync(replacementDataDir, { recursive: true, force: true });
    fs.rmSync(f.parent, { recursive: true, force: true });
  }
}

{
  const fixture = openingFixture();
  const f = temporaryDataDir();
  try {
    const replay = persistWcVoidOpeningReplayTerminalV1(
      replayRequest(f.dataDir, fixture),
    );
    assert.equal(replay.ok, true);
    assert.equal(replay.status, "committed");
    assert.equal(replay.terminal_replay_state_persisted, true);

    const published = persistWcVoidOpeningClaimBindingV1(
      publishRequest(f.dataDir, fixture),
    );
    assert.equal(published.ok, true);
    assert.equal(published.status, "committed");
    assert.equal(published.coupled_launch_id, launchId);
    assert.equal(published.mode, "finalize");
    assert.equal(published.disposition_count, 2);
    assert.equal(published.exact_duplicate, false);
    assert.equal(published.create_once_binding_file, true);
    assert.equal(published.atomic_complete_file_publication, true);
    assert.equal(published.replay_terminal_required, true);
    assert.equal(
      published.replay_terminal_binding_match_verified,
      true,
    );
    assert.equal(published.replay_terminal_capsule_id, replay.capsule_id);
    assert.equal(
      published.replay_terminal_capsule_sha256,
      replay.terminal_capsule_sha256,
    );
    assert.equal(published.exact_binding_rederivation_verified, true);
    assert.equal(published.binding_persistence_verified, true);
    assert.equal(
      published.opening_claim_transfer_or_refund_binding_persistence_verified,
      true,
    );
    assert.equal(published.production_opening_claim_binding_gate_updated, false);
    assert.equal(published.runtime_execution_ready, false);
    assert.equal(published.ledger_write_performed, false);
    assert.equal(published.wc_balance_mutation_performed, false);
    assert.equal(published.token_transfer_performed, false);
    assert.equal(published.refund_write_performed, false);
    assert.equal(published.market_activation_authority, false);
    assert.equal(published.public_presale_activation_authority, false);
    assert.equal(published.funds_movement_authority, false);

    const file = path.join(f.dataDir, published.persisted_path);
    const before = fs.lstatSync(file);
    assert.equal(before.isFile(), true);
    assert.equal(before.mode & 0o777, 0o600);

    const inspected = inspectWcVoidOpeningClaimBindingPersistenceV1({
      data_dir: f.dataDir,
      coupled_launch_id: launchId,
      commitments: fixture.commitments,
      ledger_debits: fixture.ledgerDebits,
      mode: "finalize",
      dispositions: fixture.transfers,
    });
    assert.equal(inspected.status, "PERSISTENCE_VERIFIED");
    assert.equal(inspected.binding_id, published.binding_id);
    assert.equal(
      inspected.persisted_file_sha256,
      published.persisted_file_sha256,
    );

    const duplicate = persistWcVoidOpeningClaimBindingV1(
      publishRequest(f.dataDir, fixture),
    );
    assert.equal(duplicate.status, "duplicate");
    assert.equal(duplicate.exact_duplicate, true);
    assert.equal(duplicate.binding_id, published.binding_id);
    assert.equal(fs.lstatSync(file).ino, before.ino);

    rejects(
      () =>
        persistWcVoidOpeningClaimBindingV1(
          publishRequest(
            f.dataDir,
            fixture,
            "abort",
            fixture.refunds,
          ),
        ),
      "WC_VOID_OPENING_CLAIM_BINDING_REPLAY_TERMINAL_MISMATCH",
    );

    const stalePending = path.join(
      path.dirname(file),
      ".pending-stale-proof.json",
    );
    fs.writeFileSync(stalePending, "{}\n", { mode: 0o600 });
    rejects(
      () =>
        persistWcVoidOpeningClaimBindingV1(
          publishRequest(f.dataDir, fixture),
        ),
      "WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_PENDING_ARTIFACT_REQUIRES_REVIEW",
    );
    fs.unlinkSync(stalePending);
  } finally {
    fs.rmSync(f.parent, { recursive: true, force: true });
  }
}

const source = fs.readFileSync(
  "tools/void-wc-void-opening-claim-binding-publication-v1.mjs",
  "utf8",
);
assert.match(source, /inspectWcVoidOpeningReplayTerminalV1/);
assert.match(source, /inspectWcVoidOpeningClaimBindingPersistenceV1/);
assert.match(source, /fs\.linkSync\(pending, file\)/);
assert.match(source, /fs\.fsyncSync/);
assert.match(
  source,
  /WC_VOID_OPENING_CLAIM_BINDING_REPLAY_TERMINAL_MISMATCH/,
);
assert.match(
  source,
  /DATA_DIR_CHANGED_DURING_REPLAY_VERIFY/,
);
assert.match(
  source,
  /WC_DIR_CHANGED_DURING_REPLAY_VERIFY/,
);
for (const forbidden of [
  "JsonRpcProvider(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
  "mnemonic",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}
assert.doesNotMatch(
  source,
  /(?:process\.env\.)?PRIVATE_KEY|["']private_key["']\s*[:=]/u,
);

console.log(
  "VOID_WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_V1_PROOF_GREEN",
);
console.log("replay_terminal_required=true");
console.log("replay_terminal_binding_match_verified=true");
console.log("create_once_binding_file=true");
console.log("atomic_complete_file_publication=true");
console.log("binding_persistence_verified=true");
console.log("production_opening_claim_binding_gate_updated=false");
console.log("runtime_execution_ready=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
