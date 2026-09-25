#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  AUTHORITY,
  EXPECTED,
  VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_EXACT_SIGNING_REQUEST_V1,
  verifyExactSigningRequestV1,
  verifyFreshPreSignEvidenceV1,
} from "../tools/void-wc-void-market-vault-deployer-gas-exact-signing-request-v1.mjs";

const evidence = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/wc-void-market-vault-deployer-gas-pre-sign-revalidation-evidence-v1.json",
    "utf8",
  ),
);
const request = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/wc-void-market-vault-deployer-gas-exact-signing-request-v1.json",
    "utf8",
  ),
);

assert.equal(
  VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_EXACT_SIGNING_REQUEST_V1,
  "VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_EXACT_SIGNING_REQUEST_V1",
);

const evidenceResult = verifyFreshPreSignEvidenceV1(evidence);
assert.equal(evidenceResult.ok, true);
assert.equal(
  evidenceResult.pre_sign_revalidation_id,
  "voidwcvdgpsr1_6b5cc97d1dfd63389466b7348b9623235cbd4c85d3e1f994157bcb7784222176",
);
assert.equal(
  evidenceResult.unsigned_transaction_hash,
  "0xe0ffe7279501b1c334b7a0b0e67081ab2813db7d407970aa6c9ea9f6882da3e9",
);

const result = verifyExactSigningRequestV1(request, evidence);
assert.equal(result.ok, true);
assert.equal(
  result.status,
  "HOLD_PENDING_EXPLICIT_SOVEREIGN_SINGLE_TRANSACTION_SIGNING_AUTHORIZATION",
);
assert.equal(
  result.signing_request_id,
  "voidwcvdgsr1_8a216f9f6ef2c63b0c901c47f94b5e93b092d6d10e6ac5a1d35b652e49f4396d",
);
assert.equal(
  result.pre_sign_revalidation_id,
  "voidwcvdgpsr1_6b5cc97d1dfd63389466b7348b9623235cbd4c85d3e1f994157bcb7784222176",
);
assert.equal(
  result.unsigned_transaction_hash,
  "0xe0ffe7279501b1c334b7a0b0e67081ab2813db7d407970aa6c9ea9f6882da3e9",
);
assert.equal(
  result.signer_address,
  "0xc884f631c3881b8b672bfcbf019c856146cd7f73",
);
assert.equal(result.credential_id, "buy-void-native-fulfillment-wallet-v1");
assert.equal(result.private_key_access_authorized, false);
assert.equal(result.transaction_signing_authorized, false);
assert.equal(result.transaction_broadcast_authorized, false);
assert.equal(result.chain2050_write_authorized, false);
assert.equal(result.funds_movement_authorized, false);

for (const [key, value] of Object.entries(AUTHORITY)) {
  if (
    key === "source_only_request_verification" ||
    key === "credential_binding_metadata_read"
  ) {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const credentialSource = fs.readFileSync(
  "src/economic/buy_void_erc20_production_credential_binding_evidence_v1.ts",
  "utf8",
);

for (const required of [
  'credential_id: "buy-void-native-fulfillment-wallet-v1"',
  'expected_wallet_address: "0xc884f631c3881b8b672bfcbf019c856146cd7f73"',
  'derived_wallet_address: "0xc884f631c3881b8b672bfcbf019c856146cd7f73"',
  '"68dd42774ebc792bb79b509ec651a9d560005d9ac0a54f7b50ce2e288ee3e498"',
  "exact_wallet_binding: true",
  "private_key_output: false",
  "signing_performed: false",
  "transaction_broadcast_performed: false",
]) {
  assert.ok(credentialSource.includes(required), required);
}

const candidateBinding = fs.readFileSync(
  "src/economic/buy_void_erc20_production_configuration_candidate_binding_v1.ts",
  "utf8",
);
assert.ok(
  candidateBinding.includes(
    '"20b5201b7d0516b3a4eb538fa4ec8fc1d1c68d5d1158740a11992025a2451495"',
  ),
);
assert.ok(
  candidateBinding.includes(
    '"0xc884f631c3881b8b672bfcbf019c856146cd7f73"',
  ),
);

{
  const wrong = structuredClone(evidence);
  wrong.source_pending_nonce = "2";
  assert.throws(
    () => verifyFreshPreSignEvidenceV1(wrong),
    (error) => error?.code === "fresh_pre_sign_evidence_binding_invalid",
  );
}

{
  const wrong = structuredClone(request);
  wrong.transaction.unsigned_transaction_hash =
    "0x" + "0".repeat(64);
  assert.throws(
    () => verifyExactSigningRequestV1(wrong, evidence),
    (error) => error?.code === "exact_signing_request_binding_invalid",
  );
}

{
  const wrong = structuredClone(request);
  wrong.credential_binding.credential_id = "wrong-credential";
  assert.throws(
    () => verifyExactSigningRequestV1(wrong, evidence),
    (error) => error?.code === "exact_signing_request_binding_invalid",
  );
}

{
  const wrong = structuredClone(request);
  wrong.authority_boundary.transaction_signing_authorized = true;
  assert.throws(
    () => verifyExactSigningRequestV1(wrong, evidence),
    (error) => error?.code === "exact_signing_request_binding_invalid",
  );
}

console.log(
  "VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_EXACT_SIGNING_REQUEST_V1_PROOF_GREEN",
);
console.log(
  "signing_request_id=voidwcvdgsr1_8a216f9f6ef2c63b0c901c47f94b5e93b092d6d10e6ac5a1d35b652e49f4396d",
);
console.log(
  "pre_sign_revalidation_id=voidwcvdgpsr1_6b5cc97d1dfd63389466b7348b9623235cbd4c85d3e1f994157bcb7784222176",
);
console.log(
  "unsigned_transaction_hash=0xe0ffe7279501b1c334b7a0b0e67081ab2813db7d407970aa6c9ea9f6882da3e9",
);
console.log(
  "credential_binding_evidence_id_sha256=20b5201b7d0516b3a4eb538fa4ec8fc1d1c68d5d1158740a11992025a2451495",
);
console.log("credential_id=buy-void-native-fulfillment-wallet-v1");
console.log("private_key_access=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
console.log("funds_movement=false");
