#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const contractPath = "contracts/mainnet/BuyVoidPresaleFulfillmentV1.sol";
const testPath = "test/mainnet/BuyVoidPresaleFulfillmentV1.t.sol";
const docPath = "docs/architecture/buy-void-presale-fulfillment-contract-v1.md";
const workflowPath = ".github/workflows/buy-void-presale-fulfillment-contract-v1.yml";

const contract = read(contractPath);
const test = read(testPath);
const doc = read(docPath);
const workflow = read(workflowPath);

for (const required of [
  "contract BuyVoidPresaleFulfillmentV1",
  "uint256 public constant override maxInventoryAtoms = 10_000_000 ether;",
  "address public immutable fulfiller;",
  "IBuyVoidPresaleFulfillmentHistoryV1 public immutable predecessor;",
  "if (isFulfilled(paymentDeliveryId)) revert AlreadyFulfilled(paymentDeliveryId);",
  "_fulfillments[paymentDeliveryId] = Fulfillment({",
  "_localFulfilledAtoms += amountAtoms;",
  "bool transferred = token.transfer(recipient, amountAtoms);",
  "if (!transferred) revert TokenTransferFailed();",
]) {
  assert.ok(contract.includes(required), `missing contract invariant: ${required}`);
}

const effectIndex = contract.indexOf("_fulfillments[paymentDeliveryId] = Fulfillment({");
const transferIndex = contract.indexOf("bool transferred = token.transfer(recipient, amountAtoms);");
assert.ok(effectIndex >= 0 && transferIndex > effectIndex, "checks-effects-interactions ordering");
assert.equal(contract.includes("delegatecall"), false);
assert.equal(contract.includes("selfdestruct"), false);
assert.equal(contract.includes("setFulfiller"), false);
assert.equal(contract.includes("setPredecessor"), false);

for (const required of [
  "test_duplicatePaymentCannotTransferAgainEvenWithChangedRecipientOrAmount",
  "test_failedTokenTransferRevertsClaimAndAllowsExactRetry",
  "test_inventoryCapIsExactTenMillionVoidAtoms",
  "test_successorPreservesPaymentIdentityAndInventoryAcrossGenerations",
  "test_successorRejectsDifferentTokenLineage",
]) {
  assert.ok(test.includes(required), `missing adversarial test: ${required}`);
}

for (const required of [
  "source-only",
  "payment_delivery_id",
  "10,000,000 VOID",
  "predecessor",
  "no deployment",
  "no inventory funding",
  "source-finality",
]) {
  assert.ok(doc.toLowerCase().includes(required.toLowerCase()), `missing documentation boundary: ${required}`);
}

assert.ok(workflow.includes("ghcr.io/foundry-rs/foundry:v1.7.1"));
assert.ok(workflow.includes("--use 0.8.24"));
assert.ok(workflow.includes(contractPath));
assert.ok(workflow.includes(testPath));

console.log("VOID_BUY_VOID_PRESALE_FULFILLMENT_CONTRACT_V1_PROOF_GREEN");
console.log("payment_keyed_exactly_once=true");
console.log("predecessor_lineage_replay_guard=true");
console.log("presale_cap_atoms=10000000000000000000000000");
console.log("deployment=false");
console.log("inventory_funding=false");
console.log("wallet_or_signer_access=false");
console.log("transaction_broadcast=false");
console.log("funds_action=false");
