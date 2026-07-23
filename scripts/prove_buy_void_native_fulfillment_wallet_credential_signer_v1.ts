import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  Transaction,
  Wallet,
} from "ethers";
import {
  createBuyVoidNativeFulfillmentWalletCredentialSignerV1,
  VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1,
  VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_SIGNER_AUTHORITY_V1,
} from "../src/economic/buy_void_native_fulfillment_wallet_credential_signer_v1.js";

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-wallet-credential-signer-v1-"),
);

try {
  const wallet = Wallet.createRandom();
  const credential = path.join(
    root,
    VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1,
  );
  fs.writeFileSync(credential, `${wallet.privateKey}\n`, {
    mode: 0o400,
  });
  fs.chmodSync(credential, 0o400);

  const ready =
    createBuyVoidNativeFulfillmentWalletCredentialSignerV1({
      credentials_directory: root,
      expected_wallet_address: wallet.address,
    });
  assert.equal(ready.ok, true);
  if ("reason" in ready) throw new Error(ready.reason);

  assert.equal(
    await ready.signer.get_address(),
    wallet.address.toLowerCase(),
  );

  const raw = await ready.signer.sign_transaction({
    type: 2,
    chainId: 2050n,
    nonce: 0,
    gasLimit: 21_000n,
    maxFeePerGas: 2n,
    maxPriorityFeePerGas: 1n,
    to: Wallet.createRandom().address,
    value: 1n,
    data: "0x",
  });
  const parsed = Transaction.from(raw);
  assert.equal(parsed.chainId, 2050n);
  assert.equal(parsed.from?.toLowerCase(), wallet.address.toLowerCase());
  assert.equal(parsed.value, 1n);

  const mismatch =
    createBuyVoidNativeFulfillmentWalletCredentialSignerV1({
      credentials_directory: root,
      expected_wallet_address: Wallet.createRandom().address,
    });
  assert.equal(mismatch.ok, false);
  if (!("reason" in mismatch)) throw new Error("expected mismatch hold");
  assert.equal(mismatch.reason, "credential_wallet_address_mismatch");

  fs.chmodSync(credential, 0o644);
  const broad =
    createBuyVoidNativeFulfillmentWalletCredentialSignerV1({
      credentials_directory: root,
      expected_wallet_address: wallet.address,
    });
  assert.equal(broad.ok, false);
  if (!("reason" in broad)) throw new Error("expected permission hold");
  assert.equal(broad.reason, "credential_permissions_too_broad");

  fs.rmSync(credential);
  const target = path.join(root, "target.key");
  fs.writeFileSync(target, wallet.privateKey, { mode: 0o400 });
  fs.symlinkSync(target, credential);
  const symlink =
    createBuyVoidNativeFulfillmentWalletCredentialSignerV1({
      credentials_directory: root,
      expected_wallet_address: wallet.address,
    });
  assert.equal(symlink.ok, false);
  if (!("reason" in symlink)) throw new Error("expected symlink hold");
  assert.equal(symlink.reason, "credential_symlink_forbidden");

  assert.equal(
    VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_SIGNER_AUTHORITY_V1
      .node_private_key_reuse,
    false,
  );
  assert.equal(
    VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_SIGNER_AUTHORITY_V1
      .environment_private_key,
    false,
  );
  assert.equal(
    VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_SIGNER_AUTHORITY_V1
      .transaction_broadcast,
    false,
  );

  console.log(
    "VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_SIGNER_V1_GREEN",
  );
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
