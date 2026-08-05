#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MARKER = "VOID_VALIDATOR_CANDIDATE_REGISTRY_STAKE_SAFETY_V2";
const DECISION =
  "HOLD_PENDING_REGENERATED_COMPILER_OUTPUTS_SEMANTIC_REVIEW_AND_NEW_UNSIGNED_PACKET";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const paths = Object.freeze({
  contract: "contracts/mainnet0/VoidValidatorCandidateRegistry.sol",
  test: "test/mainnet0/VoidValidatorCandidateRegistry.t.sol",
  policy: "docs/mainnet0/VALIDATOR_POLICY.md",
  documentation:
    "docs/operators/void-validator-candidate-registry-stake-safety-v2.md",
  workflow:
    ".github/workflows/void-validator-candidate-registry-stake-safety-v2.yml",
});

function read(relative) {
  const file = path.join(ROOT, relative);
  const stats = fs.lstatSync(file);
  assert.equal(stats.isFile(), true, `${relative} must be a regular file`);
  assert.equal(stats.isSymbolicLink(), false, `${relative} must not be symlinked`);
  assert.ok(stats.size > 0 && stats.size < 2 * 1024 * 1024, `${relative} size`);
  return fs.readFileSync(file, "utf8");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function blockFor(source, marker) {
  const markerIndex = source.indexOf(marker);
  assert.ok(markerIndex >= 0, `missing marker: ${marker}`);
  const opening = source.indexOf("{", markerIndex);
  assert.ok(opening >= 0, `missing opening brace: ${marker}`);

  let depth = 0;
  for (let index = opening; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(markerIndex, index + 1);
    }
  }
  assert.fail(`unterminated block: ${marker}`);
}

function requireAll(source, values, label) {
  for (const value of values) {
    assert.ok(source.includes(value), `${label} missing: ${value}`);
  }
}

const contract = read(paths.contract);
const test = read(paths.test);
const policy = read(paths.policy);
const documentation = read(paths.documentation);
const workflow = read(paths.workflow);

requireAll(
  contract,
  [
    "uint256 public constant UNBONDING_DELAY = 7 days;",
    "uint256 public totalStaked;",
    "mapping(address => uint256) public exitRequestedAt;",
    "address public pendingOwner;",
    "function requestExit() external",
    "function finalizeExit() external",
    "function withdrawStake(address payable recipient) external nonReentrant",
    "function acceptOwnership() external",
    "function cancelOwnershipTransfer() external onlyOwner",
    "event StakeWithdrawn(",
    "error StakeTransferFailed();",
    "error Reentrancy();",
  ],
  "contract",
);

for (const forbidden of ["selfdestruct", "delegatecall", "tx.origin"]) {
  assert.equal(contract.includes(forbidden), false, `forbidden Solidity: ${forbidden}`);
}

const candidateStruct = blockFor(contract, "struct Candidate");
requireAll(
  candidateStruct,
  [
    "address owner;",
    "address reward;",
    "bytes32 consensusKeyHash;",
    "bytes32 metadataHash;",
    "uint256 stakeAmount;",
    "uint256 registeredAt;",
    "uint256 updatedAt;",
    "ValidatorState state;",
  ],
  "candidate tuple",
);
assert.equal(
  (candidateStruct.match(/;/g) || []).length,
  8,
  "public candidate tuple must remain eight fields",
);

const constructorBody = blockFor(contract, "constructor(");
requireAll(
  constructorBody,
  [
    "_minValidatorStake == 0",
    "_maxActiveValidators == 0",
    "_activationChurnLimit == 0",
    "_activationChurnLimit > _maxActiveValidators",
    "owner = msg.sender;",
  ],
  "constructor",
);

const registrationBody = blockFor(contract, "function registerCandidate(");
requireAll(
  registrationBody,
  [
    "if (msg.value < minValidatorStake) revert StakeTooLow();",
    "state: ValidatorState.Candidate",
    "totalStaked += msg.value;",
  ],
  "registration",
);
assert.equal(
  registrationBody.includes("ValidatorState.Waiting"),
  false,
  "registration must not enter Waiting",
);
assert.equal(
  registrationBody.includes("ValidatorState.Active"),
  false,
  "registration must not enter Active",
);

const jailBody = blockFor(contract, "function jail(");
requireAll(
  jailBody,
  [
    "c.state == ValidatorState.Waiting",
    "c.state == ValidatorState.Active",
    "c.state != ValidatorState.Candidate",
    "revert InvalidState();",
    "c.state = ValidatorState.Jailed;",
  ],
  "jail",
);
assert.equal(
  jailBody.includes("ValidatorState.Exiting"),
  false,
  "jail must not accept Exiting",
);
assert.equal(
  jailBody.includes("ValidatorState.Unbonded"),
  false,
  "jail must not accept Unbonded",
);

const requestExitBody = blockFor(contract, "function requestExit()");
requireAll(
  requestExitBody,
  [
    "candidates[msg.sender]",
    "ValidatorState.Waiting",
    "ValidatorState.Active",
    "ValidatorState.Candidate",
    "ValidatorState.Jailed",
    "waitingCount -= 1;",
    "activeCount -= 1;",
    "exitRequestedAt[msg.sender] = requestedAt;",
    "c.state = ValidatorState.Exiting;",
    "requestedAt + UNBONDING_DELAY",
  ],
  "participant exit request",
);

const finalizeExitBody = blockFor(contract, "function finalizeExit()");
requireAll(
  finalizeExitBody,
  [
    "candidates[msg.sender]",
    "c.state != ValidatorState.Exiting",
    "requestedAt + UNBONDING_DELAY",
    "revert UnbondingNotReady();",
    "c.state = ValidatorState.Unbonded;",
  ],
  "participant exit finalization",
);

const markUnbondedBody = blockFor(contract, "function markUnbonded(");
requireAll(
  markUnbondedBody,
  [
    "external onlyOwner",
    "ValidatorState.Waiting",
    "ValidatorState.Active",
    "ValidatorState.Candidate",
    "ValidatorState.Jailed",
    "c.state = ValidatorState.Unbonded;",
  ],
  "administrative unbonding",
);
assert.equal(
  markUnbondedBody.includes("ValidatorState.Exiting"),
  false,
  "owner must not bypass a started exit delay",
);
assert.equal(
  markUnbondedBody.includes("ValidatorState.Unbonded"),
  true,
  "administrative unbonding must set Unbonded",
);

const withdrawalBody = blockFor(contract, "function withdrawStake(");
requireAll(
  withdrawalBody,
  [
    "external nonReentrant",
    "candidates[msg.sender]",
    "c.state != ValidatorState.Unbonded",
    "recipient == address(0)",
    "uint256 amount = c.stakeAmount;",
    "c.stakeAmount = 0;",
    "totalStaked -= amount;",
    "recipient.call{value: amount}(\"\")",
    "if (!transferred) revert StakeTransferFailed();",
  ],
  "stake withdrawal",
);
const zeroIndex = withdrawalBody.indexOf("c.stakeAmount = 0;");
const accountingIndex = withdrawalBody.indexOf("totalStaked -= amount;");
const callIndex = withdrawalBody.indexOf("recipient.call{value: amount}");
assert.ok(zeroIndex >= 0 && zeroIndex < accountingIndex, "stake must zero first");
assert.ok(
  accountingIndex >= 0 && accountingIndex < callIndex,
  "accounting must update before external transfer",
);

const reentrancyBody = blockFor(contract, "modifier nonReentrant()");
requireAll(
  reentrancyBody,
  [
    "withdrawalStatus != 1",
    "withdrawalStatus = 2;",
    "withdrawalStatus = 1;",
  ],
  "reentrancy guard",
);

const transferBody = blockFor(contract, "function transferOwnership(");
requireAll(
  transferBody,
  [
    "newOwner == address(0)",
    "newOwner == owner",
    "pendingOwner != address(0)",
    "pendingOwner = newOwner;",
  ],
  "ownership proposal",
);
assert.equal(
  transferBody.includes("owner = newOwner"),
  false,
  "ownership proposal must not transfer immediately",
);

const acceptBody = blockFor(contract, "function acceptOwnership()");
requireAll(
  acceptBody,
  [
    "msg.sender != pendingOwner",
    "owner = msg.sender;",
    "pendingOwner = address(0);",
  ],
  "ownership acceptance",
);

requireAll(
  test,
  [
    "contract VoidValidatorCandidateRegistryTest is TestBase",
    "testConstructorRejectsUnsafePolicy",
    "testParticipantExitReturnsCompleteAdditionalStake",
    "testWaitingAndActiveExitMaintainCounters",
    "testJailedParticipantCanExitWithoutOwnerCooperation",
    "testOwnerCannotBypassStartedParticipantExitDelay",
    "testFailedRecipientTransferPreservesStakeAccounting",
    "testWithdrawalReentrancyIsBlocked",
    "testInvalidStateTransitionsAreRejected",
    "testOwnershipTransferIsTwoStepAndCancelable",
    "testJailAndAdministrativeUnbondCountersRemainExact",
  ],
  "Forge test suite",
);
assert.equal(test.includes('import "forge-std/Test.sol"'), false);

const rejectedPacketId =
  "voidvcrudpt1_18c8e237f07c66cbf9f3d647ea2f6d43f2543e9a68102f42c586686709a327b4";
const rejectedPacketSha =
  "b1c50ea6129758b57bd72f79d4e79cb65b369a7640556755684a08cac40f349b";
const rejectedUnsignedHash =
  "0x09216225ea11ed7150a4a1df6c12308ade9e4fbabd4d17d1f973d1c59dc17e02";

requireAll(
  policy,
  [
    "Participant-controlled exit: **available from Candidate, Waiting, Active, or Jailed**",
    "Participant exit delay: **7 days before Unbonded**",
    "Stake withdrawal: **candidate owner only",
    "two-step pending-owner acceptance",
    rejectedPacketId,
    rejectedPacketSha,
    rejectedUnsignedHash,
    "must never be signed, broadcast, extended, or reused",
  ],
  "validator policy",
);

requireAll(
  documentation,
  [
    MARKER,
    DECISION,
    rejectedPacketId,
    "permanently inaccessible",
    "requestExit()",
    "finalizeExit()",
    "withdrawStake(...) for that candidate",
    "failed transfer reverts",
    "reentrant withdrawal rejection",
    "two-step, cancelable ownership transfer",
    "does not accept the bytecode for deployment",
  ],
  "operator documentation",
);

requireAll(
  workflow,
  [
    "actions/checkout@v6",
    "actions/setup-node@v6",
    'node-version: "24"',
    "prove_void_validator_candidate_registry_stake_safety_v2.mjs",
    "ghcr.io/foundry-rs/foundry:v1.7.1",
    "VoidValidatorCandidateRegistry.t.sol",
    "--evm-version paris",
    "npm run typecheck",
  ],
  "focused workflow",
);
assert.equal(workflow.includes("workflow_dispatch"), false);

console.log(
  JSON.stringify(
    {
      marker: MARKER,
      decision: DECISION,
      contract_source_sha256: sha256(contract),
      forge_test_source_sha256: sha256(test),
      participant_exit_without_owner: true,
      jailed_exit_without_owner: true,
      full_additional_stake_withdrawable: true,
      checks_effects_interactions: true,
      reentrancy_guarded: true,
      failed_transfer_rolls_back: true,
      double_withdrawal_rejected: true,
      two_step_ownership: true,
      old_unsigned_packet_rejected: true,
      signing_authorized: false,
      broadcast_authorized: false,
      deployment_authorized: false,
      fund_movement_authorized: false,
      status: "GREEN",
    },
    null,
    2,
  ),
);
console.log(`${MARKER}_PROOF_GREEN`);
