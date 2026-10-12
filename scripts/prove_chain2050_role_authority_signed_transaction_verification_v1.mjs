#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  AUTHORITY_V1,
  EXPECTED,
  verifyRoleAuthoritySignedTransactionEvidenceV1,
} from "../tools/chain2050-role-authority-signed-transaction-verification-v1.mjs";

const evidence = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/chain2050-role-authority-signed-transaction-verification-precision-v1.json",
    "utf8",
  ),
);

const verified =
  verifyRoleAuthoritySignedTransactionEvidenceV1(evidence);

assert.equal(verified.ok, true);
assert.match(verified.verification_id, /^voidcrastv1_[0-9a-f]{64}$/);
assert.equal(
  verified.signed_transaction_hash,
  EXPECTED.signed_transaction_hash,
);
assert.equal(
  verified.signed_transaction_file_sha256,
  EXPECTED.signed_transaction_file_sha256,
);
assert.equal(
  verified.signer_address,
  EXPECTED.signer_address,
);
assert.equal(
  verified.decision,
  "HOLD_PENDING_FRESH_PRECISION_PRE_BROADCAST_REVALIDATION",
);
assert.equal(AUTHORITY_V1.raw_signed_transaction_committed, false);
assert.equal(AUTHORITY_V1.raw_signed_transaction_access, false);
assert.equal(AUTHORITY_V1.rpc_call, false);
assert.equal(AUTHORITY_V1.private_key_access, false);
assert.equal(AUTHORITY_V1.wallet_or_signer_access, false);
assert.equal(AUTHORITY_V1.transaction_signing, false);
assert.equal(AUTHORITY_V1.transaction_broadcast, false);
assert.equal(AUTHORITY_V1.deployment, false);
assert.equal(AUTHORITY_V1.chain2050_mutation, false);
assert.equal(AUTHORITY_V1.funds_action, false);

const badHash = structuredClone(evidence);
badHash.signed_transaction_hash =
  "0x" + "0".repeat(64);
assert.throws(
  () => verifyRoleAuthoritySignedTransactionEvidenceV1(badHash),
  /signed_transaction_exact_binding_mismatch/,
);

const badFile = structuredClone(evidence);
badFile.signed_transaction_file_sha256 =
  "0".repeat(64);
assert.throws(
  () => verifyRoleAuthoritySignedTransactionEvidenceV1(badFile),
  /signed_transaction_exact_binding_mismatch/,
);

const badAuthority = structuredClone(evidence);
badAuthority.transaction_broadcast = true;
assert.throws(
  () => verifyRoleAuthoritySignedTransactionEvidenceV1(badAuthority),
  /signed_transaction_authority_or_verification_boundary_invalid/,
);

const source = fs.readFileSync(
  "tools/chain2050-role-authority-signed-transaction-verification-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "broadcastTransaction(",
  "sendTransaction(",
  "signTransaction(",
  "privateKey",
  "mnemonic",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log(
  "VOID_CHAIN2050_ROLE_AUTHORITY_SIGNED_TRANSACTION_VERIFICATION_V1_GREEN",
);
console.log("verification_id=" + verified.verification_id);
console.log(
  "signed_transaction_hash=" +
    verified.signed_transaction_hash,
);
console.log(
  "signed_transaction_file_sha256=" +
    verified.signed_transaction_file_sha256,
);
console.log("raw_signed_transaction_committed=false");
console.log("rpc_call=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log(
  "decision=HOLD_PENDING_FRESH_PRECISION_PRE_BROADCAST_REVALIDATION",
);
