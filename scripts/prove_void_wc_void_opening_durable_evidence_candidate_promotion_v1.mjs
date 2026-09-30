#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

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
  wcVoidOpeningTransferDispositionIdV1,
} from "../tools/void-wc-void-opening-claim-binding-v1.mjs";
import {
  initialWcVoidOpeningReplayStateV1,
} from "../tools/void-wc-void-opening-replay-protection-v1.mjs";
import {
  VOID_WC_VOID_OPENING_REPLAY_PERSISTENCE_CONFIRMATION_V1,
  persistWcVoidOpeningReplayTerminalV1,
} from "../tools/void-wc-void-opening-replay-persistence-v1.mjs";
import {
  VOID_WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_CONFIRMATION_V1,
  persistWcVoidOpeningClaimBindingV1,
} from "../tools/void-wc-void-opening-claim-binding-publication-v1.mjs";
import {
  VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANDIDATE_PROMOTION_AUTHORITY_V1,
  VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANDIDATE_PROMOTION_V1,
  prepareVoidWcVoidOpeningDurableEvidenceCandidatePromotionV1,
} from "../tools/void-wc-void-opening-durable-evidence-candidate-promotion-v1.mjs";

const ROOT = process.cwd();
const TOOL = path.join(
  ROOT,
  "tools/void-wc-void-opening-durable-evidence-candidate-promotion-v1.mjs",
);
const PRODUCTION = path.join(
  ROOT,
  "ops/mainnet0/wc-void-production-candidate-v1.json",
);
const COUPLED = path.join(
  ROOT,
  "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json",
);
const SUCCESSOR = path.join(
  ROOT,
  "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json",
);
const PRODUCTION_REL =
  "ops/mainnet0/wc-void-production-candidate-v1.json";
const COUPLED_REL =
  "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
const SUCCESSOR_REL =
  "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json";

function gitValue(args) {
  const result = spawnSync(
    "git",
    ["-C", ROOT, ...args],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        GIT_OPTIONAL_LOCKS: "0",
      },
    },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return String(result.stdout || "").trim();
}

const HEAD = gitValue(["rev-parse", "HEAD"]);
const TREE = gitValue(["rev-parse", "HEAD^{tree}"]);
const PRODUCTION_BLOB = gitValue(["rev-parse", `HEAD:${PRODUCTION_REL}`]);
const COUPLED_BLOB = gitValue(["rev-parse", `HEAD:${COUPLED_REL}`]);
const SUCCESSOR_BLOB = gitValue(["rev-parse", `HEAD:${SUCCESSOR_REL}`]);
assert.match(HEAD, /^[0-9a-f]{40}$/);
assert.match(TREE, /^[0-9a-f]{40}$/);
assert.match(PRODUCTION_BLOB, /^[0-9a-f]{40}$/);
assert.match(COUPLED_BLOB, /^[0-9a-f]{40}$/);
assert.match(SUCCESSOR_BLOB, /^[0-9a-f]{40}$/);
assert.equal(
  gitValue(["status", "--porcelain=v1", "--untracked-files=all"]),
  "",
);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function prettyBytes(value) {
  return Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
}

function rejects(fn, pattern) {
  assert.throws(fn, pattern);
}

const launchId = "sha256:" + "a".repeat(64);
const hash = (digit) => "sha256:" + String(digit).repeat(64);

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

const first = commitment("1", "promotion-alpha", "250");
const second = commitment("2", "promotion-beta", "750");
const commitments = [first, second];
const ledgerDebits = [
  debit(first, 250, 1790354000001),
  debit(second, 750, 1790354000002),
];
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
  value.disposition_id =
    wcVoidOpeningTransferDispositionIdV1(value);
  return value;
}

const dispositions = [
  transferClaim(
    first,
    "0x1111111111111111111111111111111111111111",
  ),
  transferClaim(
    second,
    "0x2222222222222222222222222222222222222222",
  ),
];

function createState(parent) {
  const dataDir = path.join(parent, "data");
  const wcDir = path.join(dataDir, "wc_v1");
  fs.mkdirSync(wcDir, { recursive: true, mode: 0o700 });
  fs.chmodSync(dataDir, 0o700);
  fs.chmodSync(wcDir, 0o700);

  const replay = persistWcVoidOpeningReplayTerminalV1({
    data_dir: dataDir,
    recorded_at_utc: "2030-01-01T00:00:00Z",
    confirmation:
      VOID_WC_VOID_OPENING_REPLAY_PERSISTENCE_CONFIRMATION_V1,
    before_state:
      initialWcVoidOpeningReplayStateV1(launchId),
    coupled_launch_id: launchId,
    commitments,
    ledger_debits: ledgerDebits,
    mode: "finalize",
    dispositions,
  });
  assert.equal(replay.ok, true);

  const binding = persistWcVoidOpeningClaimBindingV1({
    data_dir: dataDir,
    confirmation:
      VOID_WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_CONFIRMATION_V1,
    coupled_launch_id: launchId,
    commitments,
    ledger_debits: ledgerDebits,
    mode: "finalize",
    dispositions,
  });
  assert.equal(binding.ok, true);
  assert.equal(binding.binding_id, replay.binding_id);

  return { dataDir, replay, binding };
}

function requestFor(dataDir) {
  return {
    commitments,
    coupled_launch_id: launchId,
    data_dir: dataDir,
    dispositions,
    ledger_debits: ledgerDebits,
    mode: "finalize",
  };
}

assert.equal(
  VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANDIDATE_PROMOTION_V1,
  "VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANDIDATE_PROMOTION_V1",
);
for (const [key, value] of Object.entries(
  VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANDIDATE_PROMOTION_AUTHORITY_V1,
)) {
  const allowed = new Set([
    "durable_opening_evidence_read",
    "canonical_candidate_read",
    "successor_candidate_read",
    "git_repository_identity_read",
    "clean_worktree_required",
    "create_only_private_output",
  ]);
  assert.equal(value, allowed.has(key), key);
}

const originalProduction = fs.readFileSync(PRODUCTION);
const originalCoupled = fs.readFileSync(COUPLED);

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-wc-opening-durable-promotion-"),
);
try {
  fs.chmodSync(temp, 0o700);
  const { dataDir, replay, binding } = createState(temp);
  const request = requestFor(dataDir);
  const requestFile = path.join(temp, "request.json");
  const outputFile = path.join(temp, "promotion.json");
  fs.writeFileSync(requestFile, prettyBytes(request), { mode: 0o600 });
  fs.chmodSync(requestFile, 0o600);
  const requestSha = sha256(fs.readFileSync(requestFile));

  const promotion =
    prepareVoidWcVoidOpeningDurableEvidenceCandidatePromotionV1({
      requestFile,
      requestFileSha256: requestSha,
    });

  assert.match(
    promotion.promotion_id,
    /^voidwcodecp1_[0-9a-f]{64}$/,
  );
  assert.equal(promotion.repository_head_sha, HEAD);
  assert.equal(promotion.repository_tree_sha, TREE);
  assert.equal(
    promotion.production_candidate_git_blob_sha1,
    PRODUCTION_BLOB,
  );
  assert.equal(
    promotion.coupled_candidate_git_blob_sha1,
    COUPLED_BLOB,
  );
  assert.equal(
    promotion.successor_candidate_git_blob_sha1,
    SUCCESSOR_BLOB,
  );
  assert.equal(promotion.request_file_sha256, requestSha);
  assert.equal(promotion.coupled_launch_id, launchId);
  assert.equal(promotion.mode, "finalize");
  assert.equal(promotion.binding_id, binding.binding_id);
  assert.equal(
    promotion.replay_terminal_capsule_id,
    replay.capsule_id,
  );
  assert.equal(
    promotion.replay_terminal_capsule_sha256,
    replay.terminal_capsule_sha256,
  );
  assert.equal(promotion.durable_claim_binding_verified, true);
  assert.equal(promotion.durable_replay_terminal_verified, true);
  assert.equal(
    promotion.shared_opening_evidence_custody_generation_verified,
    true,
  );
  assert.deepEqual(
    promotion.promoted_production_fields,
    [
      "duplicate_replay_protection_proven",
      "participant_opening_claim_policy_ready",
    ],
  );
  assert.deepEqual(
    promotion.promoted_coupled_gates,
    ["opening_claim_transfer_or_refund_binding_ready"],
  );
  assert.equal(
    promotion.promoted_production_candidate
      .participant_opening_claim_policy_ready,
    true,
  );
  assert.equal(
    promotion.promoted_production_candidate
      .duplicate_replay_protection_proven,
    true,
  );
  assert.equal(
    promotion.promoted_coupled_candidate.gates
      .opening_claim_transfer_or_refund_binding_ready,
    true,
  );
  assert.equal(promotion.production_before.status, "HOLD");
  assert.equal(promotion.production_after.status, "HOLD");
  assert.equal(
    promotion.production_before.missing_gates.length
      - promotion.production_after.missing_gates.length,
    2,
  );
  assert.equal(promotion.coupled_before.status, "HOLD");
  assert.equal(promotion.coupled_after.status, "HOLD");
  assert.equal(
    promotion.coupled_before.missing_gates.length
      - promotion.coupled_after.missing_gates.length,
    1,
  );
  assert.equal(promotion.production_candidate_file_updated, false);
  assert.equal(promotion.coupled_candidate_file_updated, false);
  assert.equal(promotion.candidate_promotion_application_required, true);
  assert.equal(promotion.bounded_canary_green, false);
  assert.equal(promotion.coupled_activation_ready, false);
  assert.equal(promotion.market_activation_authorized, false);
  assert.equal(promotion.public_presale_activation_authorized, false);
  assert.equal(promotion.funds_movement_authorized, false);

  const repeat =
    prepareVoidWcVoidOpeningDurableEvidenceCandidatePromotionV1({
      requestFile,
      requestFileSha256: requestSha,
    });
  assert.equal(repeat.promotion_id, promotion.promotion_id);

  rejects(
    () =>
      prepareVoidWcVoidOpeningDurableEvidenceCandidatePromotionV1({
        requestFile,
        requestFileSha256: "f".repeat(64),
      }),
    /promotion_request_sha256_mismatch/,
  );

  fs.chmodSync(requestFile, 0o644);
  rejects(
    () =>
      prepareVoidWcVoidOpeningDurableEvidenceCandidatePromotionV1({
        requestFile,
        requestFileSha256: requestSha,
      }),
    /promotion_request_must_be_private/,
  );
  fs.chmodSync(requestFile, 0o600);

  const wrongLaunch = {
    ...request,
    coupled_launch_id: "sha256:" + "b".repeat(64),
  };
  fs.writeFileSync(
    requestFile,
    prettyBytes(wrongLaunch),
    { mode: 0o600 },
  );
  const wrongLaunchSha = sha256(fs.readFileSync(requestFile));
  rejects(
    () =>
      prepareVoidWcVoidOpeningDurableEvidenceCandidatePromotionV1({
        requestFile,
        requestFileSha256: wrongLaunchSha,
      }),
    /promotion_coupled_launch_id_mismatch/,
  );
  fs.writeFileSync(requestFile, prettyBytes(request), { mode: 0o600 });

  const replayPath = path.join(
    dataDir,
    "wc_v1",
    "opening-replay-terminal-v1",
    launchId.slice("sha256:".length) + ".json",
  );
  const replayBackup = fs.readFileSync(replayPath);
  fs.unlinkSync(replayPath);
  rejects(
    () =>
      prepareVoidWcVoidOpeningDurableEvidenceCandidatePromotionV1({
        requestFile,
        requestFileSha256: requestSha,
      }),
    /WC_VOID_OPENING_REPLAY_/,
  );
  fs.writeFileSync(replayPath, replayBackup, { mode: 0o600 });
  fs.chmodSync(replayPath, 0o600);

  const bindingPath = path.join(
    dataDir,
    "wc_v1",
    "opening-claim-bindings-v1",
    binding.binding_id.slice("sha256:".length) + ".json",
  );
  const bindingBackup = fs.readFileSync(bindingPath);
  fs.unlinkSync(bindingPath);
  rejects(
    () =>
      prepareVoidWcVoidOpeningDurableEvidenceCandidatePromotionV1({
        requestFile,
        requestFileSha256: requestSha,
      }),
    /WC_VOID_OPENING_CLAIM_BINDING_/,
  );
  fs.writeFileSync(bindingPath, bindingBackup, { mode: 0o600 });
  fs.chmodSync(bindingPath, 0o600);

  // The claim and replay inspectors are individually generation-safe, but
  // promotion also requires one shared store generation across both reads.
  // Swap only the replay store after the outer pre-snapshot. The replacement
  // contains identical valid terminal bytes, so the replay inspector itself
  // can succeed; the combined custody envelope must still HOLD.
  {
    const raceParent = fs.mkdtempSync(
      path.join(os.tmpdir(), "void-wc-opening-promotion-custody-race-"),
    );
    fs.chmodSync(raceParent, 0o700);
    const raceState = createState(raceParent);
    const raceRequest = requestFor(raceState.dataDir);
    const raceRequestFile = path.join(raceParent, "request.json");
    fs.writeFileSync(
      raceRequestFile,
      prettyBytes(raceRequest),
      { mode: 0o600 },
    );
    fs.chmodSync(raceRequestFile, 0o600);
    const raceRequestSha = sha256(fs.readFileSync(raceRequestFile));

    const replayFile = path.join(
      raceState.dataDir,
      raceState.replay.terminal_path,
    );
    const replayDir = path.dirname(replayFile);
    const replayName = path.basename(replayFile);
    const replayBytes = fs.readFileSync(replayFile);
    const replacementDir = replayDir + ".replacement";
    const originalDir = replayDir + ".original";
    fs.mkdirSync(replacementDir, { mode: 0o700 });
    fs.chmodSync(replacementDir, 0o700);
    fs.writeFileSync(
      path.join(replacementDir, replayName),
      replayBytes,
      { mode: 0o600 },
    );
    fs.chmodSync(
      path.join(replacementDir, replayName),
      0o600,
    );

    const originalLstatSync = fs.lstatSync;
    let replayDirLstatCount = 0;
    let swappedReplayStore = false;
    try {
      fs.lstatSync = function injectedLstatSync(candidate, ...args) {
        const resolved = path.resolve(String(candidate));
        if (resolved === path.resolve(replayDir)) {
          replayDirLstatCount += 1;
          if (!swappedReplayStore && replayDirLstatCount === 2) {
            fs.renameSync(replayDir, originalDir);
            fs.renameSync(replacementDir, replayDir);
            swappedReplayStore = true;
          }
        }
        return originalLstatSync.call(fs, candidate, ...args);
      };

      rejects(
        () =>
          prepareVoidWcVoidOpeningDurableEvidenceCandidatePromotionV1({
            requestFile: raceRequestFile,
            requestFileSha256: raceRequestSha,
          }),
        /promotion_opening_evidence_custody_changed/,
      );
    } finally {
      fs.lstatSync = originalLstatSync;
      fs.rmSync(raceParent, { recursive: true, force: true });
    }
    assert.equal(swappedReplayStore, true);
    assert.ok(replayDirLstatCount >= 2);
  }

  const cli = spawnSync(
    process.execPath,
    [
      TOOL,
      "prepare",
      "--request",
      requestFile,
      "--request-sha256",
      requestSha,
      "--output",
      outputFile,
    ],
    {
      cwd: ROOT,
      encoding: "utf8",
    },
  );
  assert.equal(cli.status, 0, cli.stderr || cli.stdout);
  assert.match(
    cli.stdout,
    /VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANDIDATE_PROMOTION_V1/,
  );
  assert.match(cli.stdout, /production_candidate_file_updated=false/);
  assert.match(cli.stdout, /coupled_candidate_file_updated=false/);
  assert.match(cli.stdout, /bounded_canary_green=false/);
  assert.match(cli.stdout, /coupled_activation_ready=false/);
  assert.equal(fs.statSync(outputFile).mode & 0o077, 0);

  const output = JSON.parse(fs.readFileSync(outputFile, "utf8"));
  assert.equal(output.promotion_id, promotion.promotion_id);

  const second = spawnSync(
    process.execPath,
    [
      TOOL,
      "prepare",
      "--request",
      requestFile,
      "--request-sha256",
      requestSha,
      "--output",
      outputFile,
    ],
    {
      cwd: ROOT,
      encoding: "utf8",
    },
  );
  assert.notEqual(second.status, 0);
  assert.match(second.stderr, /promotion_output_already_exists/);
} finally {
  assert.deepEqual(fs.readFileSync(PRODUCTION), originalProduction);
  assert.deepEqual(fs.readFileSync(COUPLED), originalCoupled);
  fs.rmSync(temp, { recursive: true, force: true });
}

const source = fs.readFileSync(
  "tools/void-wc-void-opening-durable-evidence-candidate-promotion-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "JsonRpcProvider(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
  "systemctl",
  "persistWcVoidOpeningReplayTerminalV1",
  "persistWcVoidOpeningClaimBindingV1",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log(
  "VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANDIDATE_PROMOTION_V1_PROOF_GREEN",
);
console.log("real_inspector_composition_green=true");
console.log("claim_and_replay_binding_identity_equal=true");
console.log("clean_repository_generation_bound=true");
console.log("canonical_candidate_bytes_bound_to_head_blobs=true");
console.log("shared_opening_evidence_custody_generation_bound=true");
console.log("cross_inspector_store_swap_rejected=true");
console.log("production_candidate_exact_two_gate_delta=true");
console.log("coupled_candidate_exact_one_gate_delta=true");
console.log("production_candidate_file_updated=false");
console.log("coupled_candidate_file_updated=false");
console.log("candidate_promotion_application_required=true");
console.log("bounded_canary_green=false");
console.log("coupled_activation_ready=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
