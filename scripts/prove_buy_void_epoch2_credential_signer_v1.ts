#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Interface, Wallet, Transaction } from "ethers";
import {
  VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1,
  VOID_BUY_VOID_EPOCH2_FULFILLER_CREDENTIAL_ID_V1,
  VOID_BUY_VOID_EPOCH2_FULFILLER_CREDENTIAL_SIGNER_V1,
  createBuyVoidNativeFulfillmentWalletCredentialSignerV1,
  createBuyVoidEpoch2FulfillerCredentialSignerV1,
  validateBuyVoidEpoch2FulfillerCredentialEnvelopeV1,
} from "../src/economic/buy_void_native_fulfillment_wallet_credential_signer_v1.js";
import {
  VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1,
  VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1,
  buyVoidPresaleRequiredAccessListV1,
} from "../src/economic/buy_void_epoch2_fulfillment_access_list_v1.js";

assert.equal(VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1,
  "buy-void-native-fulfillment-wallet-v1");
assert.equal(VOID_BUY_VOID_EPOCH2_FULFILLER_CREDENTIAL_ID_V1,
  "buy-void-epoch2-fulfiller-v1");
assert.notEqual(VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1,
  VOID_BUY_VOID_EPOCH2_FULFILLER_CREDENTIAL_ID_V1);
assert.equal(VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1,
  "0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a");

const missing = createBuyVoidEpoch2FulfillerCredentialSignerV1({
  credentials_directory: "/private/absent-e2-credential-" +
    process.pid.toString(),
});
assert.equal(missing.ok, false);
if (missing.ok) throw Error("missing_e2_credential_accepted");
assert.equal(missing.signing_performed_by_factory, false);
assert.equal(missing.transaction_broadcast_by_factory, false);
assert.equal(missing.runtime_activation_authorized, false);
assert.equal(Object.hasOwn(missing, "signer"), false);

// The dummy wallet is a known test key and MUST never be interpreted as the
// actual immutable Epoch-2 launch-operator signer or as production custody.
const dummyKey = "0x" + "11".repeat(32);
const dummyWallet = new Wallet(dummyKey);
assert.notEqual(dummyWallet.address.toLowerCase(),
  VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1);
const root = fs.mkdtempSync(path.join(os.tmpdir(),
  "void-buy-e2-distinct-credential-source-only-"));
const oldFile = path.join(root,
  VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1);
const e2File = path.join(root,
  VOID_BUY_VOID_EPOCH2_FULFILLER_CREDENTIAL_ID_V1);
try {
  fs.chmodSync(root, 0o700);
  fs.writeFileSync(oldFile, dummyKey + "\n", { mode: 0o600 });
  // The already-shipped E1 signer still reads ONLY its old credential ID.
  const old = createBuyVoidNativeFulfillmentWalletCredentialSignerV1({
    credentials_directory: root,
    expected_wallet_address: dummyWallet.address,
  });
  assert.equal(old.ok, true);
  if (!old.ok) throw Error("legacy_credential_id_regressed:" + old.reason);
  assert.equal(old.credential_id,
    VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1);
  const signedLegacy = await old.signer.sign_transaction({
    type: 2, chainId: 2050n, nonce: 7,
    gasLimit: 21000n, maxFeePerGas: 1n, maxPriorityFeePerGas: 0n,
    to: "0x" + "3".repeat(40), value: 1n, data: "0x",
  });
  assert.equal(Transaction.from(signedLegacy).from?.toLowerCase(),
    dummyWallet.address.toLowerCase());
  // The E2 signer may NEVER fall back to the old credential.
  const missingNewId = createBuyVoidEpoch2FulfillerCredentialSignerV1({
    credentials_directory: root,
  });
  assert.equal(missingNewId.ok, false);
  if (missingNewId.ok) throw Error("e2_reused_legacy_credential");
  assert.equal(Object.hasOwn(missingNewId, "signer"), false);

  fs.symlinkSync(oldFile, e2File);
  const symlink = createBuyVoidEpoch2FulfillerCredentialSignerV1({
    credentials_directory: root,
  });
  assert.equal(symlink.ok, false);
  if (symlink.ok) throw Error("e2_symlink_credential_accepted");
  assert.equal(symlink.reason, "credential_symlink_forbidden");
  fs.unlinkSync(e2File);

  fs.linkSync(oldFile, e2File);
  const hardlink = createBuyVoidEpoch2FulfillerCredentialSignerV1({
    credentials_directory: root,
  });
  assert.equal(hardlink.ok, false);
  if (hardlink.ok) throw Error("e2_hardlink_credential_accepted");
  assert.equal(hardlink.reason, "credential_owner_or_links_invalid");
  fs.unlinkSync(e2File);

  fs.writeFileSync(e2File, dummyKey + "\n", { mode: 0o600 });
  fs.chmodSync(e2File, 0o644);
  const world = createBuyVoidEpoch2FulfillerCredentialSignerV1({
    credentials_directory: root,
  });
  assert.equal(world.ok, false);
  if (world.ok) throw Error("e2_world_readable_key_accepted");
  assert.equal(world.reason, "credential_permissions_too_broad");
  fs.chmodSync(e2File, 0o600);
  const mismatch = createBuyVoidEpoch2FulfillerCredentialSignerV1({
    credentials_directory: root,
    // No runtime or caller supplied public-key override exists.
    expected_wallet_address: dummyWallet.address,
  } as any);
  assert.equal(mismatch.ok, false);
  if (mismatch.ok) throw Error("e2_dummy_key_accepted");
  assert.equal(mismatch.reason,
    "epoch2_immutable_fulfiller_public_identity_mismatch");
  assert.equal(mismatch.marker,
    VOID_BUY_VOID_EPOCH2_FULFILLER_CREDENTIAL_SIGNER_V1);
  assert.equal(mismatch.credential_content_read, true);
  assert.equal(mismatch.signing_performed_by_factory, false);
  assert.equal(mismatch.transaction_broadcast_by_factory, false);
  assert.equal(mismatch.runtime_activation_authorized, false);
  assert.equal(Object.hasOwn(mismatch, "signer"), false);
  assert.equal(Object.hasOwn(mismatch, "private_key"), false);
  assert.equal(Object.hasOwn(mismatch, "raw_signed_transaction"), false);
  assert.equal(JSON.stringify(mismatch).includes(dummyKey.slice(2)), false);

  assert.equal(createBuyVoidEpoch2FulfillerCredentialSignerV1({
    credentials_directory: "relative/path",
  }).ok, false);
  assert.equal(createBuyVoidEpoch2FulfillerCredentialSignerV1({
    credentials_directory: root + "/../",
  }).ok, false);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

// The immutable E2 signing envelope is tested without touching the real
// fulfiller credential or signing an economic transaction.
const iface = new Interface([
  "function fulfill(bytes32 paymentDeliveryId,address recipient,uint256 amountAtoms)",
]);
const id = "0x" + "d".repeat(64);
const recipient = "0x" + "4".repeat(40);
const validTx = {
  type: 2 as const,
  chainId: 2050n,
  nonce: 7,
  gasLimit: 231582n,
  maxFeePerGas: 0n,
  maxPriorityFeePerGas: 0n,
  to: VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1,
  value: 0n as const,
  data: iface.encodeFunctionData("fulfill", [id, recipient, 2n * 10n ** 18n]),
  accessList: buyVoidPresaleRequiredAccessListV1(
    VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1,
  ),
};
assert.equal(validateBuyVoidEpoch2FulfillerCredentialEnvelopeV1(validTx),
  true, "exact E2 signed-envelope source should validate");
const badEnvelope = (name: string, change: Record<string, unknown>) =>
  assert.equal(validateBuyVoidEpoch2FulfillerCredentialEnvelopeV1(
    { ...validTx, ...change },
  ), false, name);
badEnvelope("missing_marker", { accessList: undefined });
badEnvelope("wrong_marker_key", { accessList: [
  { address: validTx.accessList[0].address,
    storageKeys: ["0x" + "a".repeat(64)] },
] });
badEnvelope("duplicate_marker", { accessList: [
  ...validTx.accessList, ...validTx.accessList,
] });
badEnvelope("legacy_contract", { to: "0x" + "3".repeat(40) });
badEnvelope("wrong_chain", { chainId: 1n });
badEnvelope("wrong_type", { type: 0 });
badEnvelope("priority_fee_required_zero", { maxPriorityFeePerGas: 1n });
badEnvelope("fee_over_policy", { maxFeePerGas: 5_000_000_001n });
badEnvelope("gas_over_reviewed_ceiling", { gasLimit: 320001n });
badEnvelope("zero_value_only", { value: 1n });
badEnvelope("negative_nonce", { nonce: -1 });
badEnvelope("wrong_function", { data: "0xdeadbeef" });
badEnvelope("zero_payment_id", { data: iface.encodeFunctionData(
  "fulfill", ["0x" + "0".repeat(64), recipient, 1n],
) });
badEnvelope("zero_amount", { data: iface.encodeFunctionData(
  "fulfill", [id, recipient, 0n],
) });
badEnvelope("over_inventory", { data: iface.encodeFunctionData(
  "fulfill", [id, recipient, 10_000_001n * 10n ** 18n],
) });
badEnvelope("null_destination", { data: iface.encodeFunctionData(
  "fulfill", [id, "0x" + "0".repeat(40), 1n],
) });
assert.equal(validateBuyVoidEpoch2FulfillerCredentialEnvelopeV1(null), false);

console.log("VOID_BUY_VOID_EPOCH2_FULFILLER_CREDENTIAL_SIGNER_V1_PROOF_GREEN");
console.log("distinct_systemd_credential_id_required=true");
console.log("existing_epoch1_credential_signer_regression_green=true");
console.log("missing_symlink_hardlink_and_world_readable_keys_hold=true");
console.log("public_identity_must_equal_immutable_e2_fulfiller=true");
console.log("epoch2_immutable_signer_unsigned_envelope_positive_and_16_negative=true");
console.log("dummy_private_key_never_grants_e2_authority=true");
console.log("no_live_credential_or_seller_funds_access=true");
console.log("production_epoch2_credential_installed_observed=false");
console.log("real_signing_or_broadcast_performed=false");
