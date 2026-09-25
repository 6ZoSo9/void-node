#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  AUTHORITY,
  EXPECTED,
  verifyPendingSigningAuthorizationV1,
  verifySigningAuthorizationV1,
} from "../tools/void-wc-void-market-vault-deployer-gas-signing-authorization-v1.mjs";

const pending = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/wc-void-market-vault-deployer-gas-signing-authorization-v1.json",
    "utf8",
  ),
);

const held = verifyPendingSigningAuthorizationV1(pending);
assert.equal(held.ok, true);
assert.equal(held.status, "AUTHORIZATION_PENDING");
assert.equal(held.signing_request_id, EXPECTED.signing_request_id);
assert.equal(
  held.proposed_authorization_id,
  EXPECTED.proposed_authorization_id,
);
assert.equal(held.credential_access_authorized, false);
assert.equal(held.private_key_access_authorized, false);
assert.equal(held.transaction_signing_authorized, false);
assert.equal(held.transaction_broadcast_authorized, false);
assert.equal(held.funds_movement_authorized, false);

for (const [key, value] of Object.entries(AUTHORITY)) {
  if (
    key === "source_only_authorization_verification" ||
    key === "credential_binding_metadata_read"
  ) {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const authorized = structuredClone(pending);
authorized.status = "authorized_exact_single_signature";
authorized.authorization_id = EXPECTED.proposed_authorization_id;
authorized.authorization_source = "interactive_sovereign_authorization";
authorized.authorization.credential_access_authorized = true;
authorized.authorization.private_key_access_authorized = true;
authorized.authorization.transaction_signing_authorized = true;
authorized.authorization.maximum_signatures = 1;

const verified = verifySigningAuthorizationV1(authorized);
assert.equal(verified.ok, true);
assert.equal(
  verified.status,
  "AUTHORIZED_FOR_ONE_FIXED_CREDENTIAL_SIGNATURE_ONLY",
);
assert.equal(
  verified.authorization_id,
  "voidwcvdgsa1_979042b6cbf43a3c78475bf518c0bd10c8707958aad18fbdd3bf39541ab45d2f",
);
assert.equal(
  verified.signing_request_id,
  "voidwcvdgsr1_8a216f9f6ef2c63b0c901c47f94b5e93b092d6d10e6ac5a1d35b652e49f4396d",
);
assert.equal(
  verified.signer_address,
  "0xc884f631c3881b8b672bfcbf019c856146cd7f73",
);
assert.equal(verified.credential_id, "buy-void-native-fulfillment-wallet-v1");
assert.equal(
  verified.unsigned_transaction_hash,
  "0xe0ffe7279501b1c334b7a0b0e67081ab2813db7d407970aa6c9ea9f6882da3e9",
);
assert.equal(verified.maximum_signatures, 1);
assert.equal(verified.automatic_retry, false);
assert.equal(verified.transaction_broadcast_authorized, false);
assert.equal(verified.chain2050_write_authorized, false);
assert.equal(verified.funds_movement_authorized, false);
assert.equal(verified.separate_broadcast_authorization_required, true);

{
  const wrong = structuredClone(authorized);
  wrong.unsigned_transaction_hash = "0x" + "0".repeat(64);
  assert.throws(
    () => verifySigningAuthorizationV1(wrong),
    (error) => error?.code === "signing_authorization_common_binding_invalid",
  );
}

{
  const wrong = structuredClone(authorized);
  wrong.authorization.maximum_signatures = 2;
  assert.throws(
    () => verifySigningAuthorizationV1(wrong),
    (error) => error?.code === "signing_authorization_binding_invalid",
  );
}

{
  const wrong = structuredClone(authorized);
  wrong.authorization.transaction_broadcast_authorized = true;
  assert.throws(
    () => verifySigningAuthorizationV1(wrong),
    (error) => error?.code === "signing_authorization_common_binding_invalid",
  );
}

console.log(
  "VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_SIGNING_AUTHORIZATION_V1_PROOF_GREEN",
);
console.log("canonical_authorization_status=AUTHORIZATION_PENDING");
console.log(
  "proposed_authorization_id=voidwcvdgsa1_979042b6cbf43a3c78475bf518c0bd10c8707958aad18fbdd3bf39541ab45d2f",
);
console.log(
  "signing_request_id=voidwcvdgsr1_8a216f9f6ef2c63b0c901c47f94b5e93b092d6d10e6ac5a1d35b652e49f4396d",
);
console.log(
  "unsigned_transaction_hash=0xe0ffe7279501b1c334b7a0b0e67081ab2813db7d407970aa6c9ea9f6882da3e9",
);
console.log("synthetic_single_signature_authorization_proven=true");
console.log("credential_access=false");
console.log("private_key_access=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
console.log("funds_movement=false");
