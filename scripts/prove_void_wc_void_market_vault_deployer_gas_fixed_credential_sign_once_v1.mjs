#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  AUTHORITY as SIGN_ONCE_AUTHORITY,
  MARKER as SIGN_ONCE_MARKER,
} from "../tools/void-wc-void-market-vault-deployer-gas-fixed-credential-sign-once-v1.mjs";
import {
  verifySigningAuthorizationV1,
} from "../tools/void-wc-void-market-vault-deployer-gas-signing-authorization-v1.mjs";
import {
  verifyExactSigningRequestV1,
} from "../tools/void-wc-void-market-vault-deployer-gas-exact-signing-request-v1.mjs";

const authorization = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/wc-void-market-vault-deployer-gas-signing-authorization-v1.json",
    "utf8",
  ),
);
const request = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/wc-void-market-vault-deployer-gas-exact-signing-request-v1.json",
    "utf8",
  ),
);
const evidence = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/wc-void-market-vault-deployer-gas-pre-sign-revalidation-evidence-v1.json",
    "utf8",
  ),
);

const auth = verifySigningAuthorizationV1(authorization);
assert.equal(auth.ok, true);
assert.equal(
  auth.status,
  "AUTHORIZED_FOR_ONE_FIXED_CREDENTIAL_SIGNATURE_ONLY",
);
assert.equal(auth.maximum_signatures, 1);
assert.equal(auth.automatic_retry, false);
assert.equal(auth.transaction_broadcast_authorized, false);
assert.equal(auth.chain2050_write_authorized, false);
assert.equal(auth.funds_movement_authorized, false);

const signingRequest = verifyExactSigningRequestV1(request, evidence);
assert.equal(signingRequest.ok, true);
assert.equal(
  signingRequest.signing_request_id,
  "voidwcvdgsr1_8a216f9f6ef2c63b0c901c47f94b5e93b092d6d10e6ac5a1d35b652e49f4396d",
);
assert.equal(
  signingRequest.unsigned_transaction_hash,
  "0xe0ffe7279501b1c334b7a0b0e67081ab2813db7d407970aa6c9ea9f6882da3e9",
);

assert.equal(
  SIGN_ONCE_MARKER,
  "VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_FIXED_CREDENTIAL_SIGN_ONCE_V1",
);
for (const [key, value] of Object.entries(SIGN_ONCE_AUTHORITY)) {
  if (
    [
      "exact_signing_authorization_required",
      "exact_signing_request_required",
      "exact_fresh_pre_sign_evidence_required",
      "fixed_systemd_credential_only",
      "one_signature_consumption_required_before_credential_read",
      "filesystem_read",
      "filesystem_write_private_state_only",
      "credential_access_when_called",
      "private_key_access_when_called",
      "wallet_or_signer_access_when_called",
      "transaction_signing_when_called",
    ].includes(key)
  ) {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const source = fs.readFileSync(
  "tools/void-wc-void-market-vault-deployer-gas-fixed-credential-sign-once-v1.mjs",
  "utf8",
);

for (const forbidden of [
  "http.request",
  "https.request",
  "JsonRpcProvider",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "broadcastTransaction",
  "sendTransaction(",
  "fetch(",
  "WebSocket",
  "mnemonic",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

for (const required of [
  "buy-void-native-fulfillment-wallet-v1",
  "signing_authorization_already_consumed",
  "consumed_before_credential_read",
  "credential_wallet_address_mismatch",
  "signed_transaction_exact_verification_failed",
  "SIGNED_EXACTLY_ONCE_HELD_FOR_INDEPENDENT_VERIFICATION",
  "transaction_broadcast_authorized: false",
  "transaction_broadcast_performed: false",
  "funds_movement_authorized: false",
  "funds_movement_performed: false",
]) {
  assert.ok(source.includes(required), required);
}

const consumptionWrite =
  source.indexOf("writePrivateExclusive(\n    consumptionPath");
const credentialRead =
  source.indexOf("fs.readFileSync(credentialPath)");
assert.ok(consumptionWrite >= 0);
assert.ok(credentialRead >= 0);
assert.ok(consumptionWrite < credentialRead);

console.log(
  "VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_FIXED_CREDENTIAL_SIGN_ONCE_V1_PROOF_GREEN",
);
console.log(
  "authorization_id=voidwcvdgsa1_979042b6cbf43a3c78475bf518c0bd10c8707958aad18fbdd3bf39541ab45d2f",
);
console.log(
  "signing_request_id=voidwcvdgsr1_8a216f9f6ef2c63b0c901c47f94b5e93b092d6d10e6ac5a1d35b652e49f4396d",
);
console.log(
  "unsigned_transaction_hash=0xe0ffe7279501b1c334b7a0b0e67081ab2813db7d407970aa6c9ea9f6882da3e9",
);
console.log("maximum_signatures=1");
console.log("consumption_before_credential_read=true");
console.log("credential_id=buy-void-native-fulfillment-wallet-v1");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
console.log("funds_movement=false");
