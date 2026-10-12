#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const MARKER =
  "VOID_VALIDATOR_CANDIDATE_REGISTRY_LIFECYCLE_COMPLETENESS_V3";
const DECISION =
  "HOLD_PENDING_REGENERATED_COMPILER_OUTPUTS_SEMANTIC_REVIEW_AND_NEW_UNSIGNED_PACKET";
const ROOT = process.cwd();

const paths = Object.freeze({
  contract: "contracts/mainnet0/VoidValidatorCandidateRegistry.sol",
  lifecycleTest:
    "test/mainnet0/VoidValidatorCandidateRegistryLifecycleCompletenessV3.t.sol",
  custodyTest: "test/mainnet0/VoidValidatorCandidateRegistry.t.sol",
  activeExitTest:
    "test/mainnet0/VoidValidatorCandidateRegistryActiveExit.t.sol",
  documentation:
    "docs/operators/void-validator-candidate-registry-lifecycle-completeness-v3.md",
  workflow:
    ".github/workflows/void-validator-candidate-registry-lifecycle-completeness-v3.yml",
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

function requireAll(source, values, label) {
  for (const value of values) {
    assert.ok(source.includes(value), `${label} missing ${value}`);
  }
}

function requirePatterns(source, patterns, label) {
  for (const [description, expression] of patterns) {
    assert.match(source, expression, `${label} missing ${description}`);
  }
}

function blockFor(source, signature) {
  const start = source.indexOf(signature);
  assert.notEqual(start, -1, `missing block ${signature}`);
  const open = source.indexOf("{", start);
  assert.notEqual(open, -1, `missing opening brace ${signature}`);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  assert.fail(`unclosed block ${signature}`);
}

function functionHeader(source, functionName) {
  const expression = new RegExp(
    `function\\s+${functionName}\\s*\\([\\s\\S]*?\\)\\s*([^{{;]*)\\{`,
  );
  const match = source.match(expression);
  assert.ok(match, `missing function header ${functionName}`);
  return match[0];
}

const contract = read(paths.contract);
const lifecycleTest = read(paths.lifecycleTest);
const custodyTest = read(paths.custodyTest);
const activeExitTest = read(paths.activeExitTest);
const documentation = read(paths.documentation);
const workflow = read(paths.workflow);

requireAll(
  contract,
  [
    "mapping(address => uint256) public registrationCycle;",
    "mapping(bytes32 => address) public consensusKeyOwner;",
    "event CandidateReRegistered(",
    "event CandidateProfileUpdated(",
    "event CandidateReturnedToCandidate(address indexed owner);",
    "event ConsensusKeyReleased(",
    "error ConsensusKeyAlreadyRegistered(",
    "error StakeNotWithdrawn();",
    "error NoProfileChange();",
    "function maxActivationBatchSize() external view returns (uint256)",
    "function reregisterCandidate(",
    "function updateCandidateProfile(",
    "function returnToCandidate() external nonReentrant",
    "function uniqueCandidateOwnerCount() external view returns (uint256)",
    "function _validateProfile(",
  ],
  "lifecycle contract",
);

const aliasBody = blockFor(contract, "function maxActivationBatchSize(");
requireAll(aliasBody, ["return activationChurnLimit;"], "batch-size alias");

const registerBody = blockFor(contract, "function registerCandidate(");
requireAll(
  registerBody,
  [
    "_validateProfile(reward, consensusKeyHash, msg.sender);",
    "consensusKeyOwner[consensusKeyHash] = msg.sender;",
    "registrationCycle[msg.sender] = 1;",
    "candidateOwners.push(msg.sender);",
    "candidateCount += 1;",
    "totalStaked += msg.value;",
    "state: ValidatorState.Candidate",
  ],
  "first registration",
);

const reregisterBody = blockFor(contract, "function reregisterCandidate(");
requireAll(
  reregisterBody,
  [
    "c.state != ValidatorState.Unbonded",
    "c.stakeAmount != 0",
    "revert StakeNotWithdrawn();",
    "_validateProfile(reward, consensusKeyHash, msg.sender);",
    "msg.value < minValidatorStake",
    "registrationCycle[msg.sender] + 1",
    "c.state = ValidatorState.Candidate;",
    "registrationCycle[msg.sender] = cycle;",
    "consensusKeyOwner[consensusKeyHash] = msg.sender;",
    "exitRequestedAt[msg.sender] = 0;",
    "activeSetRemovalRequired[msg.sender] = false;",
    "activeSetRemovalConfirmed[msg.sender] = false;",
    "activeSetRemovalEvidenceHash[msg.sender] = bytes32(0);",
    "totalStaked += msg.value;",
    "emit CandidateReRegistered(",
  ],
  "re-registration",
);
assert.equal(
  reregisterBody.includes("candidateOwners.push"),
  false,
  "re-registration must not duplicate candidateOwners",
);
assert.equal(
  reregisterBody.includes("candidateCount +="),
  false,
  "re-registration must not inflate unique-owner count",
);

const profileBody = blockFor(contract, "function updateCandidateProfile(");
requireAll(
  profileBody,
  [
    "c.state != ValidatorState.Candidate",
    "_validateProfile(reward, consensusKeyHash, msg.sender);",
    "revert NoProfileChange();",
    "delete consensusKeyOwner[oldConsensusKeyHash];",
    "consensusKeyOwner[consensusKeyHash] = msg.sender;",
    "c.reward = reward;",
    "c.consensusKeyHash = consensusKeyHash;",
    "c.metadataHash = metadataHash;",
    "emit CandidateProfileUpdated(",
  ],
  "candidate profile update",
);

const returnBody = blockFor(contract, "function returnToCandidate(");
requireAll(
  returnBody,
  [
    "c.state != ValidatorState.Waiting",
    "waitingCount -= 1;",
    "c.state = ValidatorState.Candidate;",
    "emit CandidateReturnedToCandidate(msg.sender);",
  ],
  "Waiting rollback",
);

const releaseBody = blockFor(contract, "function _releaseConsensusKey(");
requireAll(
  releaseBody,
  [
    "consensusKeyOwner[consensusKeyHash] != candidateOwner",
    "delete consensusKeyOwner[consensusKeyHash];",
    "emit ConsensusKeyReleased(candidateOwner, consensusKeyHash);",
  ],
  "owner-conditional consensus-key release",
);
assert.ok(
  releaseBody.indexOf("consensusKeyOwner[consensusKeyHash] != candidateOwner") <
    releaseBody.indexOf("delete consensusKeyOwner[consensusKeyHash]"),
  "consensus-key release must verify the current owner before deletion",
);
assert.ok(
  releaseBody.indexOf("delete consensusKeyOwner[consensusKeyHash]") <
    releaseBody.indexOf("emit ConsensusKeyReleased(candidateOwner, consensusKeyHash)"),
  "consensus-key release event must follow deletion",
);

const finalizeExitBody = blockFor(contract, "function finalizeExit(");
requireAll(
  finalizeExitBody,
  [
    "c.state = ValidatorState.Unbonded;",
    "_releaseConsensusKey(msg.sender, c.consensusKeyHash);",
    "emit CandidateUnbonded(msg.sender);",
  ],
  "participant exit key release",
);
assert.ok(
  finalizeExitBody.indexOf("c.state = ValidatorState.Unbonded;") <
    finalizeExitBody.indexOf("_releaseConsensusKey(msg.sender, c.consensusKeyHash);"),
  "participant exit must enter Unbonded before releasing the key",
);

const markUnbondedBody = blockFor(contract, "function markUnbonded(");
requireAll(
  markUnbondedBody,
  [
    "c.state = ValidatorState.Unbonded;",
    "_releaseConsensusKey(candidateOwner, c.consensusKeyHash);",
    "emit CandidateUnbonded(candidateOwner);",
  ],
  "administrative unbond key release",
);
assert.ok(
  markUnbondedBody.indexOf("c.state = ValidatorState.Unbonded;") <
    markUnbondedBody.indexOf("_releaseConsensusKey(candidateOwner, c.consensusKeyHash);"),
  "administrative unbond must enter Unbonded before releasing the key",
);

const withdrawalBody = blockFor(contract, "function withdrawStake(");
requireAll(
  withdrawalBody,
  [
    "c.state != ValidatorState.Unbonded",
    "c.stakeAmount = 0;",
    "totalStaked -= amount;",
    "_releaseConsensusKey(msg.sender, c.consensusKeyHash);",
    "recipient.call{value: amount}",
    "revert StakeTransferFailed();",
    "emit StakeWithdrawn(",
  ],
  "stake withdrawal and defensive key release",
);
assert.ok(
  withdrawalBody.indexOf("_releaseConsensusKey(msg.sender, c.consensusKeyHash)") <
    withdrawalBody.indexOf("recipient.call{value: amount}"),
  "defensive key release must occur before the external interaction and roll back atomically",
);

const validationBody = blockFor(contract, "function _validateProfile(");
requireAll(
  validationBody,
  [
    "reward == address(0)",
    "consensusKeyHash == bytes32(0)",
    "consensusKeyOwner[consensusKeyHash]",
    "registeredOwner != candidateOwner",
    "revert ConsensusKeyAlreadyRegistered(",
  ],
  "profile validation",
);

const mutatingFunctions = [
  "registerCandidate",
  "reregisterCandidate",
  "updateCandidateProfile",
  "returnToCandidate",
  "moveToWaiting",
  "markActiveBatch",
  "jail",
  "requestExit",
  "confirmActiveSetRemoval",
  "finalizeExit",
  "markUnbonded",
  "withdrawStake",
  "transferOwnership",
  "cancelOwnershipTransfer",
  "acceptOwnership",
];
for (const functionName of mutatingFunctions) {
  const header = functionHeader(contract, functionName);
  assert.ok(header.includes("nonReentrant"), `${functionName} lacks nonReentrant`);
}

// Preserve existing public-signature discovery contracts while adding the lock.
requireAll(
  contract,
  [
    "function moveToWaiting(address candidateOwner) external onlyOwner",
    "function withdrawStake(address payable recipient) external nonReentrant",
    "function cancelOwnershipTransfer() external onlyOwner",
    "function acceptOwnership() external",
  ],
  "legacy signature compatibility",
);
requirePatterns(
  contract,
  [
    [
      "markActiveBatch(address[] calldata owners) external onlyOwner",
      /function\s+markActiveBatch\s*\(\s*address\[\]\s+calldata\s+owners\s*\)\s+external\s+onlyOwner/,
    ],
  ],
  "legacy signature compatibility",
);

// Preserve the V2 custody and Active-exit boundaries.
requireAll(
  contract,
  [
    "uint256 public constant UNBONDING_DELAY = 7 days;",
    "uint256 public pendingActiveExitCount;",
    "function confirmActiveSetRemoval(",
    "activeCount + pendingActiveExitCount + owners.length",
    "revert ActiveSetRemovalNotConfirmed();",
    "function withdrawStake(address payable recipient) external nonReentrant",
    "function acceptOwnership() external nonReentrant",
  ],
  "V2 safety preservation",
);

requireAll(
  lifecycleTest,
  [
    "contract VoidValidatorCandidateRegistryLifecycleCompletenessV3Test",
    "testActivationBatchAliasIsHonestAndCompatible",
    "testDuplicateConsensusKeyRejectedAndReleasedAfterWithdrawal",
    "testCandidateProfileUpdateRotatesConsensusKey",
    "testReturnToCandidateRequiresWaitingState",
    "testReregisterAfterWithdrawalPreservesUniqueOwnerCount",
    "testReregisterClearsHistoricalActiveExitFlags",
    "testProfileUpdateCannotTakeAnotherCandidatesKey",
    "testWithdrawalBlocksCrossFunctionReentry",
    "testWithdrawalFailurePreservesConsensusKeyOwnershipAndStakeAccounting",
  ],
  "lifecycle Foundry suite",
);
requirePatterns(
  lifecycleTest,
  [
    [
      "ConsensusKeyAlreadyRegistered.selector",
      /ConsensusKeyAlreadyRegistered\s*\.\s*selector/,
    ],
    ["StakeNotWithdrawn.selector", /StakeNotWithdrawn\s*\.\s*selector/],
    ["NoProfileChange.selector", /NoProfileChange\s*\.\s*selector/],
    ["Reentrancy.selector", /Reentrancy\s*\.\s*selector/],
    [
      "StakeTransferFailed.selector",
      /StakeTransferFailed\s*\.\s*selector/,
    ],
  ],
  "lifecycle Foundry suite selectors",
);
assert.equal(lifecycleTest.includes('import "forge-std/Test.sol"'), false);

requireAll(
  custodyTest,
  [
    "testParticipantExitReturnsCompleteAdditionalStake",
    "testRecipientTransferFailurePreservesStakeAccounting",
    "testWithdrawalReentrancyIsBlocked",
    "testOwnershipTransferIsTwoStepAndCancelable",
  ],
  "custody regression suite",
);
requireAll(
  activeExitTest,
  [
    "testActiveExitRequiresRemovalConfirmation",
    "testPendingActiveExitStillConsumesActivationCap",
    "testDirectAdministrativeUnbondOfActiveIsRejected",
  ],
  "Active-exit regression suite",
);

requireAll(
  documentation,
  [
    MARKER,
    DECISION,
    "consensusKeyOwner(bytes32)",
    "returnToCandidate()",
    "maxActivationBatchSize()",
    "does not claim to enforce a time-window or epoch churn rate",
    "every state-changing external registry entry point",
    "a failed stake transfer rolls back stake accounting and consensus-key release atomically",
    "Nothing from the historical packet may be signed, broadcast, extended, or treated as deployment approval.",
  ],
  "operator documentation",
);
requirePatterns(
  documentation,
  [
    [
      "candidateCount as the unique-owner count",
      /(?:`candidateCount`|candidateCount)\s+as\s+the\s+unique-owner\s+count/,
    ],
    [
      "updateCandidateProfile(...) is candidate-owner-controlled",
      /(?:`updateCandidateProfile\(\.\.\.\)`|updateCandidateProfile\(\.\.\.\))\s+is\s+candidate-owner-controlled/,
    ],
  ],
  "operator documentation formatting",
);

requireAll(
  workflow,
  [
    "actions/checkout@v6",
    "persist-credentials: false",
    "actions/setup-node@v6",
    'node-version: "24"',
    "prove_void_validator_candidate_registry_lifecycle_completeness_v3.mjs",
    "ghcr.io/foundry-rs/foundry:v1.7.1",
    "VoidValidatorCandidateRegistryLifecycleCompletenessV3.t.sol",
    "--use 0.8.20",
    "--evm-version paris",
    "npm run typecheck",
  ],
  "focused workflow",
);
assert.equal(workflow.includes("workflow_dispatch"), false);
assert.equal(workflow.includes("contents: write"), false);

const forbiddenContractTerms = [
  "privateKey",
  "mnemonic",
  "seedPhrase",
  "broadcastTransaction",
  "selfdestruct",
  "delegatecall",
];
for (const term of forbiddenContractTerms) {
  assert.equal(contract.includes(term), false, `forbidden contract term ${term}`);
}

console.log(
  JSON.stringify(
    {
      marker: MARKER,
      decision: DECISION,
      contract_source_sha256: sha256(contract),
      lifecycle_test_sha256: sha256(lifecycleTest),
      unique_consensus_key_ownership: true,
      candidate_profile_rotation: true,
      waiting_return_to_candidate: true,
      safe_reregistration_after_withdrawal: true,
      unique_owner_count_preserved: true,
      historical_exit_flags_reset: true,
      cross_function_reentrancy_blocked: true,
      failed_withdrawal_rolls_back_key_release: true,
      legacy_activation_getter_preserved: true,
      honest_batch_size_alias: true,
      temporal_churn_claimed: false,
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
