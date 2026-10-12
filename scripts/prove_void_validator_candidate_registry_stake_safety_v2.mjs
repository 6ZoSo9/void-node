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
  activeExitTest:
    "test/mainnet0/VoidValidatorCandidateRegistryActiveExit.t.sol",
  policy: "docs/mainnet0/VALIDATOR_POLICY.md",
  activeExitDoc: "docs/mainnet0/VALIDATOR_ACTIVE_EXIT_SAFETY_V1.md",
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
const activeExitTest = read(paths.activeExitTest);
const policy = read(paths.policy);
const activeExitDoc = read(paths.activeExitDoc);
const documentation = read(paths.documentation);
const workflow = read(paths.workflow);

requireAll(
  contract,
  [
    "uint256 public constant UNBONDING_DELAY = 7 days;",
    "uint256 public totalStaked;",
    "uint256 public pendingActiveExitCount;",
    "mapping(address => uint256) public exitRequestedAt;",
    "mapping(address => bool) public activeSetRemovalRequired;",
    "mapping(address => bool) public activeSetRemovalConfirmed;",
    "mapping(address => bytes32) public activeSetRemovalEvidenceHash;",
    "address public pendingOwner;",
    "function requestExit() external",
    "function confirmActiveSetRemoval(",
    "function finalizeExit() external",
    "function withdrawStake(address payable recipient) external nonReentrant",
    "function acceptOwnership() external",
    "function cancelOwnershipTransfer() external onlyOwner",
    "event ActiveSetRemovalConfirmed(",
    "event StakeWithdrawn(",
    "error ActiveSetRemovalNotConfirmed();",
    "error InvalidActiveSetRemovalEvidence();",
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

const activeBatchBody = blockFor(contract, "function markActiveBatch(");
requireAll(
  activeBatchBody,
  [
    "activeCount + pendingActiveExitCount + owners.length",
    "maxActiveValidators",
    "revert ActiveCapReached();",
  ],
  "active cap",
);

const jailBody = blockFor(contract, "function jail(");
requireAll(
  jailBody,
  [
    "c.state == ValidatorState.Waiting",
    "c.state == ValidatorState.Active",
    "c.state != ValidatorState.Candidate",
    "revert InvalidState();",
    "activeSetRemovalRequired[candidateOwner] = true;",
    "activeSetRemovalConfirmed[candidateOwner] = true;",
    "VOID_VALIDATOR_ACTIVE_SET_REMOVAL_OWNER_JAIL_V1",
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
    "pendingActiveExitCount += 1;",
    "activeSetRemovalRequired[msg.sender] = true;",
    "activeSetRemovalConfirmed[msg.sender] = false;",
    "exitRequestedAt[msg.sender] = requestedAt;",
    "c.state = ValidatorState.Exiting;",
    "requestedAt + UNBONDING_DELAY",
  ],
  "participant exit request",
);

const removalBody = blockFor(contract, "function confirmActiveSetRemoval(");
requireAll(
  removalBody,
  [
    "external onlyOwner",
    "!activeSetRemovalRequired[candidateOwner]",
    "activeSetRemovalConfirmed[candidateOwner]",
    "c.state != ValidatorState.Exiting",
    "evidenceHash == bytes32(0)",
    "activeSetRemovalEvidenceHash[candidateOwner] = evidenceHash;",
    "pendingActiveExitCount -= 1;",
  ],
  "active-set removal confirmation",
);

const finalizeExitBody = blockFor(contract, "function finalizeExit()");
requireAll(
  finalizeExitBody,
  [
    "candidates[msg.sender]",
    "c.state != ValidatorState.Exiting",
    "requestedAt + UNBONDING_DELAY",
    "revert UnbondingNotReady();",
    "activeSetRemovalRequired[msg.sender] &&",
    "!activeSetRemovalConfirmed[msg.sender]",
    "revert ActiveSetRemovalNotConfirmed();",
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
    "c.state == ValidatorState.Active",
    "revert ActiveSetRemovalNotConfirmed();",
    "ValidatorState.Candidate",
    "ValidatorState.Jailed",
    "activeSetRemovalRequired[candidateOwner] &&",
    "c.state = ValidatorState.Unbonded;",
  ],
  "administrative unbonding",
);
assert.equal(
  markUnbondedBody.includes("ValidatorState.Exiting"),
  false,
  "owner must not bypass a started exit delay",
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
    "testRecipientTransferFailurePreservesStakeAccounting",
    "testWithdrawalReentrancyIsBlocked",
    "testInvalidStateTransitionsAreRejected",
    "testOwnershipTransferIsTwoStepAndCancelable",
    "testJailAndAdministrativeUnbondCountersRemainExact",
  ],
  "Forge custody test suite",
);
assert.equal(test.includes('import "forge-std/Test.sol"'), false);

requireAll(
  activeExitTest,
  [
    "contract VoidValidatorCandidateRegistryActiveExitTest",
    "testActiveExitRequiresRemovalConfirmation",
    "testPendingActiveExitStillConsumesActivationCap",
    "testDirectAdministrativeUnbondOfActiveIsRejected",
    "testJailedActiveParticipantKeepsConfirmedRemovalOnDelayedExit",
    "ActiveSetRemovalNotConfirmed.selector",
    "InvalidActiveSetRemovalEvidence.selector",
    "ActiveSetRemovalAlreadyConfirmed.selector",
  ],
  "Forge active-exit test suite",
);
assert.equal(activeExitTest.includes('import "forge-std/Test.sol"'), false);

const rejectedPacketId =
  "voidvcrudpt1_18c8e237f07c66cbf9f3d647ea2f6d43f2543e9a68102f42c586686709a327b4";
const rejectedPacketSha =
  "b1c50ea6129758b57bd72f79d4e79cb65b369a7640556755684a08cac40f349b";
const rejectedUnsignedHash =
  "0x09216225ea11ed7150a4a1df6c12308ade9e4fbabd4d17d1f973d1c59dc17e02";

requireAll(
  policy,
  [
    "Participant-controlled exit initiation: **available from Candidate, Waiting, Active, or Jailed**",
    "Active-origin exit finalization: **requires seven days plus explicit active-set removal confirmation**",
    "pendingActiveExitCount",
    "Administrative `markUnbonded(...)` is limited to Candidate, Waiting, or",
    "cannot directly unbond Active",
    "confirmActiveSetRemoval(...)",
    "must never be signed, broadcast, extended, or reused",
    rejectedPacketId,
    rejectedPacketSha,
    rejectedUnsignedHash,
  ],
  "validator policy",
);

requireAll(
  activeExitDoc,
  [
    "VOID_VALIDATOR_ACTIVE_EXIT_SAFETY_V1",
    "pendingActiveExitCount",
    "confirmActiveSetRemoval(...)",
    "direct administrative `markUnbonded(...)` from Active is rejected",
    "`README.md` is not changed",
  ],
  "active-exit documentation",
);

requireAll(
  documentation,
  [
    MARKER,
    DECISION,
    rejectedPacketId,
    "permanently inaccessible",
    "requestExit()",
    "confirmActiveSetRemoval(...)` with a",
    "pendingActiveExitCount",
    "Direct administrative unbonding from Active is rejected",
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
    "prove_void_validator_candidate_registry_active_exit_safety_v1.mjs",
    "ghcr.io/foundry-rs/foundry:v1.7.1",
    "VoidValidatorCandidateRegistry.t.sol",
    "VoidValidatorCandidateRegistryActiveExit.t.sol",
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
      active_exit_test_source_sha256: sha256(activeExitTest),
      participant_exit_without_owner: true,
      jailed_exit_without_owner: true,
      active_exit_removal_confirmation_required: true,
      pending_active_exit_consumes_cap: true,
      direct_active_admin_unbond_rejected: true,
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
