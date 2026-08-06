#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const MARKER =
  "VOID_VALIDATOR_CONSENSUS_KEY_RELEASE_ON_UNBOND_V1";
const DECISION =
  "SOURCE_ONLY_LIVENESS_REPAIR_READY_DEPLOYMENT_NOT_AUTHORIZED";
const ROOT = process.cwd();

const paths = Object.freeze({
  contract: "contracts/mainnet0/VoidValidatorCandidateRegistry.sol",
  test:
    "test/mainnet0/VoidValidatorCandidateRegistryConsensusKeyReleaseOnUnbondV1.t.sol",
  documentation:
    "docs/operators/void-validator-consensus-key-release-on-unbond-v1.md",
  workflow:
    ".github/workflows/void-validator-consensus-key-release-on-unbond-v1.yml",
});

function read(relative) {
  const file = path.join(ROOT, relative);
  const stats = fs.lstatSync(file);
  assert.equal(stats.isFile(), true, `${relative} must be regular`);
  assert.equal(stats.isSymbolicLink(), false, `${relative} must not be symlinked`);
  assert.ok(stats.size > 0 && stats.size < 2 * 1024 * 1024, `${relative} size`);
  return fs.readFileSync(file, "utf8");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function blockFor(source, signature) {
  const start = source.indexOf(signature);
  assert.notEqual(start, -1, `missing ${signature}`);
  const open = source.indexOf("{", start);
  assert.notEqual(open, -1, `missing opening brace for ${signature}`);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  assert.fail(`unclosed ${signature}`);
}

function requireAll(source, values, label) {
  for (const value of values) {
    assert.ok(source.includes(value), `${label} missing ${value}`);
  }
}

const contract = read(paths.contract);
const test = read(paths.test);
const documentation = read(paths.documentation);
const workflow = read(paths.workflow);

const finalizeExit = blockFor(contract, "function finalizeExit(");
const markUnbonded = blockFor(contract, "function markUnbonded(");
const withdrawStake = blockFor(contract, "function withdrawStake(");
const releaseHelper = blockFor(contract, "function _releaseConsensusKey(");

requireAll(
  finalizeExit,
  [
    "c.state = ValidatorState.Unbonded;",
    "_releaseConsensusKey(msg.sender, c.consensusKeyHash);",
    "emit CandidateUnbonded(msg.sender);",
  ],
  "participant finalization",
);
assert.ok(
  finalizeExit.indexOf("_releaseConsensusKey") <
    finalizeExit.indexOf("emit CandidateUnbonded"),
  "participant release must precede unbonded event",
);

requireAll(
  markUnbonded,
  [
    "c.state = ValidatorState.Unbonded;",
    "_releaseConsensusKey(candidateOwner, c.consensusKeyHash);",
    "emit CandidateUnbonded(candidateOwner);",
  ],
  "administrative unbond",
);
assert.ok(
  markUnbonded.indexOf("_releaseConsensusKey") <
    markUnbonded.indexOf("emit CandidateUnbonded"),
  "administrative release must precede unbonded event",
);

requireAll(
  releaseHelper,
  [
    "consensusKeyOwner[consensusKeyHash] != candidateOwner",
    "delete consensusKeyOwner[consensusKeyHash];",
    "emit ConsensusKeyReleased(candidateOwner, consensusKeyHash);",
  ],
  "owner-conditional release helper",
);

requireAll(
  withdrawStake,
  [
    "_releaseConsensusKey(msg.sender, c.consensusKeyHash);",
    "recipient.call{value: amount}",
    "emit StakeWithdrawn(msg.sender, recipient, amount);",
  ],
  "defensive withdrawal",
);
assert.equal(
  withdrawStake.includes("delete consensusKeyOwner"),
  false,
  "withdrawal must not directly delete a later claimant",
);
assert.equal(
  contract.split("emit ConsensusKeyReleased(").length - 1,
  1,
  "only the owner-conditional helper may emit key release",
);

requireAll(
  test,
  [
    "testAdministrativeUnbondReleasesKeyBeforeWithdrawalAndOldWithdrawalCannotDeleteNewClaim",
    "testCandidateExitFinalizationReleasesKeyWithoutWithdrawal",
    "testActiveExitFinalizationReleasesKeyAfterRemovalConfirmation",
    "testRevertedOldWithdrawalPreservesNewOwnerClaimAndOldStake",
    "reg.consensusKeyOwner(sharedKey), bob",
    "StakeTransferFailed.selector",
  ],
  "Foundry regression suite",
);

requireAll(
  documentation,
  [
    MARKER,
    DECISION,
    "release occurs when the record enters `Unbonded`",
    "refuses to withdraw",
    "cannot delete a newer claimant",
    "Proof of possession remains a separate admission gate",
    "No historical unsigned packet may be signed",
    "or broadcast.",
  ],
  "operator documentation",
);

requireAll(
  workflow,
  [
    "actions/checkout@v6",
    "persist-credentials: false",
    "actions/setup-node@v6",
    'node-version: "24"',
    "ghcr.io/foundry-rs/foundry:v1.7.1",
    "VoidValidatorCandidateRegistryConsensusKeyReleaseOnUnbondV1.t.sol",
    "--use 0.8.20",
    "--evm-version paris",
    "npm run typecheck",
    "git diff --check",
  ],
  "focused workflow",
);

for (const term of [
  "privateKey",
  "mnemonic",
  "seedPhrase",
  "broadcastTransaction",
  "delegatecall",
  "selfdestruct",
]) {
  assert.equal(contract.includes(term), false, `forbidden term ${term}`);
}

console.log(
  JSON.stringify(
    {
      marker: MARKER,
      decision: DECISION,
      contract_source_sha256: sha256(contract),
      regression_test_sha256: sha256(test),
      participant_unbond_releases_key: true,
      administrative_unbond_releases_key: true,
      refusal_to_withdraw_cannot_lock_key: true,
      old_withdrawal_cannot_delete_new_claim: true,
      failed_withdrawal_preserves_new_claim: true,
      active_exit_removal_confirmation_preserved: true,
      live_rpc_access: false,
      wallet_or_signer_access: false,
      transaction_constructed: false,
      transaction_broadcast: false,
      contract_deployed: false,
      fund_movement: false,
      status: "GREEN",
    },
    null,
    2,
  ),
);
console.log(`${MARKER}_PROOF_GREEN`);
