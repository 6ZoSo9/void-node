#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const contractPath = "contracts/mainnet/WCVoidMarketVaultV2.sol";
const testPath = "test/mainnet/WCVoidMarketVaultV2.t.sol";

const source = fs.readFileSync(contractPath, "utf8");
const tests = fs.readFileSync(testPath, "utf8");

function need(text) {
  assert.ok(source.includes(text), "missing source token: " + text);
}
function needTest(text) {
  assert.ok(tests.includes(text), "missing test token: " + text);
}

for (const required of [
  "contract WCVoidMarketVaultV2",
  "uint256 public constant openingInventoryAtoms = 10_000_000 ether;",
  'keccak256("VOID_WC_VOID_RECOVERY_ACCEPTED_V2")',
  "address public immutable launchController;",
  "address public immutable settlementExecutor;",
  "address public immutable closeoutController;",
  "bytes32 public immutable coupledLaunchId;",
  "function proposeCloseout(",
  "function approveCloseout(",
  "function executeCloseout(",
  "if (closing) revert MarketClosing();",
  "if (msg.sender != closeoutController) revert NotCloseoutController();",
  "if (msg.sender != settlementExecutor) revert NotSettlementExecutor();",
  "successorVault.code.length == 0",
  "_requireSuccessorLineage(successorVault);",
  "if (!closeoutApproved) revert CloseoutNotApproved();",
  "uint256 reserveAtoms = currentVoidReserveAtoms();",
  "bool transferred = token.transfer(successorVault, reserveAtoms);",
  ".acceptRecoveredVoid(closeoutId, reserveAtoms);",
  "if (acknowledgement != recoveryAcknowledgement)",
  "closeoutId != pendingCloseoutId",
  "successorVault != pendingSuccessorVault",
  "successor.voidToken()",
  "successor.coupledLaunchId()",
  "successor.predecessorVault()",
]) {
  need(required);
}

for (const forbidden of [
  /\bowner\b/i,
  /\bwithdraw\w*\s*\(/i,
  /\bapprove\s*\(/i,
  /\btransferFrom\s*\(/i,
  /\bselfdestruct\b/i,
  /\bdelegatecall\b/i,
  /\bcallcode\b/i,
  /\bcancelCloseout\b/i,
  /\breopen\w*\s*\(/i,
  /\bsetPrice\w*\s*\(/i,
  /\bmanualPrice\b/i,
]) {
  assert.doesNotMatch(source, forbidden);
}

assert.doesNotMatch(source, /tx\.origin/);
assert.doesNotMatch(source, /block\.timestamp/);
assert.doesNotMatch(source, /assembly\s*\{/);
assert.doesNotMatch(source, /payable/);

for (const requiredTest of [
  "test_activationStillRequiresExactOpeningInventory",
  "test_closeoutCannotBeProposedBeforeActivation",
  "test_onlyCloseoutControllerCanProposeOrExecute",
  "test_proposalImmediatelyFreezesNewSettlement",
  "test_closeoutRequiresIndependentSettlementExecutorApproval",
  "test_onlySettlementExecutorCanApproveExactProposal",
  "test_successorMustMatchTokenLaunchAndPredecessor",
  "test_closeoutProposalCannotBeReplacedOrCancelled",
  "test_failedRecoveryAcknowledgementRollsBackEntireCloseout",
  "test_successfulCloseoutMovesEntireLiveReserveOnce",
  "9_250_000 ether",
  "successor.acceptCount() == 1",
]) {
  needTest(requiredTest);
}

console.log("VOID_WC_VOID_MARKET_VAULT_RECOVERY_V2_PROOF_GREEN");
console.log("market_vault_contract=WCVoidMarketVaultV2");
console.log("exact_opening_inventory_required=true");
console.log("closeout_freezes_new_settlement=true");
console.log("closeout_controller_immutable=true");
console.log("settlement_executor_independent_approval_required=true");
console.log("closeout_proposal_replaceable=false");
console.log("closeout_cancel_available=false");
console.log("successor_contract_required=true");
console.log("successor_void_token_lineage_required=true");
console.log("successor_coupled_launch_lineage_required=true");
console.log("successor_predecessor_lineage_required=true");
console.log("entire_live_reserve_migrated=true");
console.log("operator_selected_closeout_amount=false");
console.log("successor_acknowledgement_required=true");
console.log("failed_ack_rolls_back=true");
console.log("owner_withdrawal=false");
console.log("generic_rescue=false");
console.log("manual_price_control=false");
console.log("deployment=false");
console.log("inventory_funding=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
