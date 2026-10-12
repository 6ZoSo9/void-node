#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const MARKER =
  "VOID_VALIDATOR_CANDIDATE_REGISTRY_ACTIVE_EXIT_SAFETY_V1_PROOF_GREEN";

const paths = {
  contract: "contracts/mainnet0/VoidValidatorCandidateRegistry.sol",
  test: "test/mainnet0/VoidValidatorCandidateRegistryActiveExit.t.sol",
  doc: "docs/mainnet0/VALIDATOR_ACTIVE_EXIT_SAFETY_V1.md",
  workflow:
    ".github/workflows/void-validator-candidate-registry-stake-safety-v2.yml",
};

function read(relativePath) {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function requireAll(source, values, label) {
  for (const value of values) {
    assert.equal(
      source.includes(value),
      true,
      `${label} missing required contract: ${value}`,
    );
  }
}

function rejectAll(source, values, label) {
  for (const value of values) {
    assert.equal(
      source.includes(value),
      false,
      `${label} contains forbidden behavior: ${value}`,
    );
  }
}

const contract = read(paths.contract);
const test = read(paths.test);
const doc = read(paths.doc);
const workflow = read(paths.workflow);

requireAll(
  contract,
  [
    "uint256 public pendingActiveExitCount;",
    "mapping(address => bool) public activeSetRemovalRequired;",
    "mapping(address => bool) public activeSetRemovalConfirmed;",
    "mapping(address => bytes32) public activeSetRemovalEvidenceHash;",
    "event ActiveSetRemovalConfirmed(",
    "error ActiveSetRemovalNotRequired();",
    "error ActiveSetRemovalNotConfirmed();",
    "error ActiveSetRemovalAlreadyConfirmed();",
    "error InvalidActiveSetRemovalEvidence();",
    "activeCount + pendingActiveExitCount + owners.length",
    "pendingActiveExitCount += 1;",
    "function confirmActiveSetRemoval(",
    "if (c.state != ValidatorState.Exiting) revert InvalidState();",
    "pendingActiveExitCount -= 1;",
    "activeSetRemovalRequired[msg.sender] &&",
    "!activeSetRemovalConfirmed[msg.sender]",
    "c.state == ValidatorState.Active",
    "revert ActiveSetRemovalNotConfirmed();",
    "VOID_VALIDATOR_ACTIVE_SET_REMOVAL_OWNER_JAIL_V1",
  ],
  "contract",
);

requireAll(
  test,
  [
    "testActiveExitRequiresRemovalConfirmation",
    "testPendingActiveExitStillConsumesActivationCap",
    "testDirectAdministrativeUnbondOfActiveIsRejected",
    "testJailedActiveParticipantKeepsConfirmedRemovalOnDelayedExit",
    "ActiveSetRemovalNotConfirmed.selector",
    "InvalidActiveSetRemovalEvidence.selector",
    "ActiveSetRemovalAlreadyConfirmed.selector",
    "pendingActiveExitCount()",
    "confirmActiveSetRemoval(",
  ],
  "foundry test",
);

requireAll(
  doc,
  [
    "VOID_VALIDATOR_ACTIVE_EXIT_SAFETY_V1",
    "pendingActiveExitCount",
    "nonzero sanitized active-set removal evidence hash",
    "direct administrative `markUnbonded(...)` from Active is rejected",
    "`README.md` is not changed",
    "does not inspect",
    "does not",
  ],
  "documentation",
);

requireAll(
  workflow,
  [
    paths.test,
    paths.doc,
    "scripts/prove_void_validator_candidate_registry_active_exit_safety_v1.mjs",
    "ghcr.io/foundry-rs/foundry:v1.7.1",
    "--use 0.8.20",
    "--evm-version paris",
  ],
  "workflow",
);

rejectAll(
  `${contract}\n${test}\n${doc}\n${workflow}`,
  [
    "private key",
    "private_key",
    "mnemonic",
    "eth_sendRawTransaction",
    "signTransaction",
    "systemctl restart",
    "wallet access authorized",
    "money_movement=true",
    "selfdestruct",
    "delegatecall",
  ],
  "lane",
);

console.log(`marker=${MARKER}`);
console.log("active_exit_requires_removal_confirmation=true");
console.log("pending_active_exit_consumes_cap=true");
console.log("direct_active_admin_unbond_rejected=true");
console.log("credential_access=false");
console.log("wallet_access=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("money_movement=false");
console.log(MARKER);
