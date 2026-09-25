#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const CENSUS_PATH =
  "ops/mainnet0/wc-void-deployer-gas-source-census-v2.json";
const REQUEST_PATH =
  "ops/mainnet0/wc-void-market-vault-deployer-gas-funding-request-v1.json";

const census = JSON.parse(fs.readFileSync(CENSUS_PATH, "utf8"));
const request = JSON.parse(fs.readFileSync(REQUEST_PATH, "utf8"));

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  return (
    "{" +
    Object.keys(value)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
      .join(",") +
    "}"
  );
}

const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

assert.equal(census.marker, "VOID_WC_VOID_DEPLOYER_GAS_SOURCE_CENSUS_V2");
assert.equal(census.version, 2);
assert.equal(census.status, "green_read_only_source_census");
assert.equal(census.chain_id, 2050);
assert.equal(census.observation_block_number, "37392");
assert.equal(census.required_deployer_value_wei, "6669126000000000");
assert.equal(census.funding_gas_limit, "21000");
assert.equal(census.max_fee_per_gas_wei, "3000000000");
assert.equal(census.maximum_source_liability_wei, "6732126000000000");
assert.equal(
  census.standard_anvil_prefunded_source_excluded,
  "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
);
assert.equal(census.automatic_source_selection, false);
assert.equal(census.source_selected, false);
assert.equal(census.funding_authorized, false);
assert.equal(census.balance_sufficient_noncontract_candidate_count, 1);

const sufficient = census.candidates.filter(
  (candidate) =>
    candidate.has_code === false &&
    candidate.covers_max_source_liability === true,
);
assert.equal(sufficient.length, 1);
assert.equal(
  sufficient[0].address,
  "0xc884f631c3881b8b672bfcbf019c856146cd7f73",
);
assert.equal(sufficient[0].label, "buy_void_fulfillment_wallet");
assert.equal(sufficient[0].balance_wei, "2000025200000189000");
assert.equal(sufficient[0].pending_nonce, "1");

assert.equal(
  request.marker,
  "VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_FUNDING_REQUEST_V1",
);
assert.equal(request.version, 1);
assert.equal(request.status, "exact_request_authorization_pending");
assert.equal(request.chain_id, "2050");
assert.equal(
  request.purpose,
  "single_wc_void_market_vault_deployer_gas_funding",
);

const body = structuredClone(request);
delete body.funding_request_id;
assert.equal(
  request.funding_request_id,
  "voidwcvdgfr1_" + sha256(canonicalJson(body)),
);
assert.equal(
  request.funding_request_id,
  "voidwcvdgfr1_1cdff2d7f8129e3debfdf0e080b8f059b0129ea7c1ec44c414c95282262d1148",
);

assert.equal(request.source_census.observation_block_number, "37392");
assert.equal(
  request.source_census.standard_anvil_prefunded_source_excluded,
  "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
);
assert.equal(
  request.source_census.balance_sufficient_noncontract_candidate_count,
  1,
);
assert.equal(request.source_census.automatic_source_selection, false);

assert.equal(
  request.source.address,
  "0xc884f631c3881b8b672bfcbf019c856146cd7f73",
);
assert.equal(request.source.role, "BuyVoidFulfillmentWallet");
assert.equal(request.source.role_class, "dedicated_runtime_role");
assert.equal(request.source.balance_wei, "2000025200000189000");
assert.equal(request.source.pending_nonce, "1");
assert.equal(request.source.has_code, false);
assert.equal(request.source.covers_max_source_liability, true);
assert.equal(request.source.source_selected, false);
assert.equal(
  request.source.native_gas_funding_authority_expansion_approved,
  false,
);

assert.equal(
  request.destination.address,
  "0x907ea7d0d57f5631219674bdf666a7e929613074",
);
assert.equal(request.destination.role, "wc_void_market_vault_deployer");
assert.equal(request.destination.current_balance_wei, "0");
assert.equal(request.destination.required_balance_wei, "6669126000000000");

assert.equal(request.transaction.transaction_type, 2);
assert.equal(request.transaction.nonce, "1");
assert.equal(request.transaction.value_wei, "6669126000000000");
assert.equal(request.transaction.gas_limit, "21000");
assert.equal(request.transaction.max_fee_per_gas_wei, "3000000000");
assert.equal(
  request.transaction.max_priority_fee_per_gas_wei,
  "1000000000",
);
assert.equal(request.transaction.data, "0x");
assert.deepEqual(request.transaction.access_list, []);
assert.equal(
  request.transaction.maximum_source_liability_wei,
  "6732126000000000",
);
assert.equal(request.transaction.unsigned_transaction_hash, null);

const value = BigInt(request.transaction.value_wei);
const gas = BigInt(request.transaction.gas_limit);
const maxFee = BigInt(request.transaction.max_fee_per_gas_wei);
const liability = BigInt(request.transaction.maximum_source_liability_wei);
assert.equal(value + gas * maxFee, liability);
assert.ok(BigInt(request.source.balance_wei) >= liability);

for (const key of [
  "source_selection_authorized",
  "native_gas_funding_authority_expansion_authorized",
  "unsigned_transaction_construction_authorized",
  "transaction_signing_authorized",
  "transaction_broadcast_authorized",
  "chain2050_write_authorized",
  "funds_movement_authorized",
  "automatic_retry",
  "replacement_transaction_authorized",
]) {
  assert.equal(request.scope[key], false, key);
}
assert.equal(request.scope.maximum_submission_attempts, 0);
assert.equal(
  request.next_gate,
  "explicit_source_selection_and_exact_funding_authorization",
);

console.log(
  "VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_FUNDING_REQUEST_V1_PROOF_GREEN",
);
console.log("funding_request_id=" + request.funding_request_id);
console.log("source_candidate=" + request.source.address);
console.log("destination=" + request.destination.address);
console.log("value_wei=" + request.transaction.value_wei);
console.log("source_pending_nonce=" + request.transaction.nonce);
console.log(
  "maximum_source_liability_wei=" +
    request.transaction.maximum_source_liability_wei,
);
console.log("source_selected=false");
console.log("funding_authorized=false");
console.log("unsigned_transaction_hash=null");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("funds_movement=false");
