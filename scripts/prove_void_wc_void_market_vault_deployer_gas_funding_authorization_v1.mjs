#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  AUTHORITY,
  EXPECTED,
  buildAuthorizedUnsignedFundingTransactionV1,
  verifyFundingAuthorizationV1,
  verifyPendingAuthorizationV1,
} from "../tools/void-wc-void-market-vault-deployer-gas-funding-authorization-v1.mjs";

const request = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/wc-void-market-vault-deployer-gas-funding-request-v1.json",
    "utf8",
  ),
);
const pending = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/wc-void-market-vault-deployer-gas-funding-authorization-v1.json",
    "utf8",
  ),
);

const verified = verifyFundingAuthorizationV1(request, pending);
assert.equal(verified.ok, true);
assert.equal(
  verified.status,
  "AUTHORIZED_FOR_UNSIGNED_CONSTRUCTION_ONLY",
);
assert.equal(verified.funding_request_id, EXPECTED.request_id);
assert.equal(
  verified.authorization_id,
  EXPECTED.proposed_authorization_id,
);
assert.equal(verified.maximum_submission_attempts, 1);
assert.equal(verified.automatic_retry, false);
assert.equal(verified.signing_authorized, false);
assert.equal(verified.broadcast_authorized, false);
assert.equal(verified.funds_movement_authorized, false);

for (const [key, value] of Object.entries(AUTHORITY)) {
  if (key === "source_only_verification") {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const unsigned = buildAuthorizedUnsignedFundingTransactionV1(
  request,
  pending,
);
assert.equal(
  unsigned.marker,
  "VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_UNSIGNED_FUNDING_V1",
);
assert.equal(
  unsigned.status,
  "unsigned_exact_transaction_ready_for_fresh_revalidation",
);
assert.equal(unsigned.authorization_id, verified.authorization_id);
assert.equal(unsigned.funding_request_id, EXPECTED.request_id);
assert.equal(unsigned.transaction.chain_id, "2050");
assert.equal(unsigned.transaction.transaction_type, 2);
assert.equal(unsigned.transaction.source, EXPECTED.source);
assert.equal(unsigned.transaction.destination, EXPECTED.destination);
assert.equal(unsigned.transaction.nonce, "1");
assert.equal(unsigned.transaction.value_wei, "6669126000000000");
assert.equal(unsigned.transaction.gas_limit, "21000");
assert.equal(unsigned.transaction.max_fee_per_gas_wei, "3000000000");
assert.equal(
  unsigned.transaction.max_priority_fee_per_gas_wei,
  "1000000000",
);
assert.equal(unsigned.transaction.data, "0x");
assert.deepEqual(unsigned.transaction.access_list, []);
assert.match(
  unsigned.transaction.unsigned_transaction_hash,
  /^0x[0-9a-f]{64}$/u,
);
assert.match(
  unsigned.transaction.unsigned_serialized,
  /^0x[0-9a-f]+$/u,
);
assert.match(
  unsigned.transaction.unsigned_serialized_sha256,
  /^[0-9a-f]{64}$/u,
);
assert.equal(unsigned.authority.source_selection_authorized, true);
assert.equal(
  unsigned.authority.unsigned_transaction_construction_authorized,
  true,
);
assert.equal(unsigned.authority.private_key_access_authorized, false);
assert.equal(unsigned.authority.transaction_signing_authorized, false);
assert.equal(unsigned.authority.transaction_broadcast_authorized, false);
assert.equal(unsigned.authority.chain2050_write_authorized, false);
assert.equal(unsigned.authority.funds_movement_authorized, false);
assert.equal(unsigned.authority.maximum_submission_attempts, 1);
assert.equal(unsigned.authority.automatic_retry, false);
assert.equal(unsigned.authority.replacement_transaction_authorized, false);

{
  const wrong = structuredClone(pending);
  wrong.value_wei = "6669126000000001";
  assert.throws(
    () => verifyFundingAuthorizationV1(request, wrong),
    (error) => error?.code === "funding_authorization_binding_invalid",
  );
}

{
  const wrong = structuredClone(pending);
  wrong.nonce = "2";
  assert.throws(
    () => verifyFundingAuthorizationV1(request, wrong),
    (error) => error?.code === "funding_authorization_binding_invalid",
  );
}

{
  const wrong = structuredClone(pending);
  wrong.authorization.transaction_signing_authorized = true;
  assert.throws(
    () => verifyFundingAuthorizationV1(request, wrong),
    (error) => error?.code === "funding_authorization_binding_invalid",
  );
}

{
  const wrong = structuredClone(pending);
  wrong.authorization.maximum_submission_attempts = 2;
  assert.throws(
    () => verifyFundingAuthorizationV1(request, wrong),
    (error) => error?.code === "funding_authorization_binding_invalid",
  );
}

console.log(
  "VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_FUNDING_AUTHORIZATION_V1_PROOF_GREEN",
);
console.log("funding_request_id=" + EXPECTED.request_id);
console.log(
  "proposed_authorization_id=" + EXPECTED.proposed_authorization_id,
);
console.log("canonical_authorization_status=AUTHORIZED_FOR_UNSIGNED_CONSTRUCTION_ONLY");
console.log("canonical_authorization_id=" + verified.authorization_id);
console.log("unsigned_transaction_hash=" + unsigned.transaction.unsigned_transaction_hash);
console.log("unsigned_serialized_sha256=" + unsigned.transaction.unsigned_serialized_sha256);
console.log("unsigned_transaction_construction_authorized=true");
console.log("private_key_access=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
console.log("deployer_funding=false");
console.log("funds_movement=false");
