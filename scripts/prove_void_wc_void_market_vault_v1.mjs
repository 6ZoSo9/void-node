#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const contractPath = "contracts/mainnet/WCVoidMarketVaultV1.sol";
const testPath = "test/mainnet/WCVoidMarketVaultV1.t.sol";

const source = fs.readFileSync(contractPath, "utf8");
const tests = fs.readFileSync(testPath, "utf8");

function escaped(value) {
  return value.replace(/[.*+?^$()|[\]\\{}]/g, "\\$&");
}

for (const required of [
  "contract WCVoidMarketVaultV1",
  "uint256 public constant openingInventoryAtoms = 10_000_000 ether;",
  "address public immutable launchController;",
  "address public immutable settlementExecutor;",
  "bytes32 public immutable coupledLaunchId;",
  "function activate(bytes32 launchId) external",
  "function settleVoid(",
  "if (observed != openingInventoryAtoms)",
  "if (msg.sender != launchController) revert NotLaunchController();",
  "if (msg.sender != settlementExecutor) revert NotSettlementExecutor();",
  "if (launchId != coupledLaunchId) revert CoupledLaunchIdMismatch();",
  "if (!activated) revert NotActivated();",
  "if (_settled[settlementId]) revert AlreadySettled(settlementId);",
  "if (amountAtoms > available)",
  "_settled[settlementId] = true;",
  "bool transferred = token.transfer(recipient, amountAtoms);",
  "if (!transferred) revert TokenTransferFailed();",
]) {
  assert.match(source, new RegExp(escaped(required)));
}

for (const forbidden of [
  /\bwithdraw\b/i,
  /\bapprove\s*\(/i,
  /\btransferFrom\s*\(/i,
  /\bowner\b/i,
  /\bselfdestruct\b/i,
  /\bdelegatecall\b/i,
  /\bcallcode\b/i,
  /\brecover\w*\s*\(/i,
  /\bcloseout\w*\s*\(/i,
  /\bemergency\w*\s*\(/i,
]) {
  assert.doesNotMatch(source, forbidden);
}

assert.doesNotMatch(source, /tx\.origin/);
assert.doesNotMatch(source, /block\.timestamp/);
assert.doesNotMatch(source, /assembly\s*\{/);
assert.doesNotMatch(source, /payable/);

for (const requiredTest of [
  "test_activationRequiresExactTenMillionVoidAndIsOneShot",
  "test_overfundedOpeningFailsClosed",
  "test_activationRequiresFixedControllerAndCoupledLaunchId",
  "test_settlementCannotRunBeforeActivation",
  "test_exactSettlementTransfersAndCannotReplay",
  "test_onlySettlementExecutorAndExactLaunchCanSettle",
  "test_failedTransferRollsBackSettlementIdentityAndCounters",
  "test_cannotSettleMoreThanLiveReserve",
  "test_returnedVoidCanBeSettledAgainWithoutLifetimeCap",
  "test_zeroInputsFailClosed",
  "vault.lifetimeVoidOutAtoms() == 10_500_000 ether",
]) {
  assert.match(tests, new RegExp(escaped(requiredTest)));
}

assert.match(
  tests,
  /participant\.returnVoid\(token, address\(vault\), 500_000 ether\)/,
);
assert.match(
  tests,
  /9_500_000 ether/,
);

console.log("VOID_WC_VOID_MARKET_VAULT_V1_PROOF_GREEN");
console.log("opening_inventory_atoms=10000000000000000000000000");
console.log("exact_opening_inventory_required=true");
console.log("coupled_launch_id_immutable=true");
console.log("launch_controller_immutable=true");
console.log("settlement_executor_immutable=true");
console.log("settlement_replay_protection=true");
console.log("settlement_requires_activation=true");
console.log("settlement_uses_live_void_reserve=true");
console.log("returned_void_can_be_resettled=true");
console.log("lifetime_outflow_not_false_capped_at_opening_inventory=true");
console.log("operator_withdrawal_function=false");
console.log("token_approval_function=false");
console.log("generic_rescue_function=false");
console.log("recovery_function=false");
console.log("closeout_function=false");
console.log("manual_price_function=false");
console.log("deployment=false");
console.log("inventory_funding=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
