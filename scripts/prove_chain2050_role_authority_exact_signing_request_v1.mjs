#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  AUTHORITY_V1,
  buildRoleAuthorityExactSigningRequestV1,
} from "../tools/chain2050-role-authority-exact-signing-request-v1.mjs";

const evidence = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/chain2050-role-authority-fresh-pre-sign-revalidation-precision-v1.json",
    "utf8",
  ),
);

const request =
  buildRoleAuthorityExactSigningRequestV1(
    evidence,
  );

assert.equal(
  request.status,
  "HOLD_PENDING_EXPLICIT_SOVEREIGN_SINGLE_TRANSACTION_SIGNING_AUTHORIZATION",
);
assert.match(
  request.signing_request_id,
  /^voidcrasr1_[0-9a-f]{64}$/,
);
assert.equal(
  request.transaction_summary.unsigned_transaction_hash,
  "0xc5982072b34a49c3f8ead20cd8e358e8711a620f91ff4aeae0e9a7072d600f25",
);
assert.equal(
  request.transaction_summary.candidate_fingerprint_sha256,
  "a67c90c030cc3a728ca611b620fe4ae8598a47284b2ca69238717583062c6c42",
);
assert.equal(
  request.transaction_summary.from_address,
  "0x4d0a1149d13b03448c56ee6582d161159c5e537f",
);
assert.equal(
  request.transaction_summary.nonce,
  "0",
);
assert.equal(
  request.transaction_summary.to_address,
  null,
);
assert.equal(
  request.transaction_summary.value_wei,
  "0",
);
assert.equal(
  request.transaction_summary.gas_limit,
  "2402981",
);
assert.equal(
  request.funding_evidence.transaction_hash,
  "0x5ac002fc33cbb02500b4be35aa875a4676848cf01892f3944c60fc58ec81002a",
);
assert.equal(
  request.fresh_pre_sign_observation.block_number,
  "37378",
);
assert.equal(
  request.fresh_pre_sign_observation.predicted_contract_address_vacant,
  true,
);
assert.equal(
  request.authority_boundary.signing_authorized,
  false,
);
assert.equal(
  request.authority_boundary.transaction_broadcast_authorized,
  false,
);
assert.equal(
  request.authority_boundary.deployment_authorized,
  false,
);
assert.equal(
  AUTHORITY_V1.private_key_access,
  false,
);
assert.equal(
  AUTHORITY_V1.signing,
  false,
);
assert.equal(
  AUTHORITY_V1.transaction_broadcast,
  false,
);
assert.equal(
  AUTHORITY_V1.deployment,
  false,
);

const badHash = structuredClone(evidence);
badHash.unsigned_transaction_hash =
  "0x" + "0".repeat(64);
assert.throws(
  () =>
    buildRoleAuthorityExactSigningRequestV1(
      badHash,
    ),
  /fresh_pre_sign_exact_binding_mismatch/,
);

const badFunding = structuredClone(evidence);
badFunding.funding_receipt_status = "0";
assert.throws(
  () =>
    buildRoleAuthorityExactSigningRequestV1(
      badFunding,
    ),
  /fresh_pre_sign_required_fact_missing/,
);

const source = fs.readFileSync(
  "tools/chain2050-role-authority-exact-signing-request-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "sendTransaction(",
  "signTransaction(",
  "privateKey",
  "mnemonic",
]) {
  assert.equal(
    source.includes(forbidden),
    false,
    forbidden,
  );
}

console.log(
  "VOID_CHAIN2050_ROLE_AUTHORITY_EXACT_SIGNING_REQUEST_V1_GREEN",
);
console.log(
  "signing_request_id=" +
    request.signing_request_id,
);
console.log(
  "unsigned_transaction_hash=" +
    request.transaction_summary.unsigned_transaction_hash,
);
console.log(
  "candidate_fingerprint_sha256=" +
    request.transaction_summary.candidate_fingerprint_sha256,
);
console.log("signing_authorized=false");
console.log("transaction_broadcast_authorized=false");
console.log("deployment_authorized=false");
