import {
  VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1,
  buyVoidPresaleAccessListExactV1,
  buyVoidPresaleRequiredAccessListV1,
} from "../src/economic/buy_void_epoch2_fulfillment_access_list_v1.js";
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
  if ("reason" in ready) throw new Error(String(ready.reason));

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
  // Ephemeral synthetic signer only. E2 presale authorization is NOT inferred.
  const epoch2Marker = buyVoidPresaleRequiredAccessListV1(
    VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1,
  );
  const e2Unsigned = {
    type: 2 as const,
    chainId: 2050n,
    nonce: 1,
    gasLimit: 120_000n,
    maxFeePerGas: 2n,
    maxPriorityFeePerGas: 1n,
    to: VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1,
    value: 0n,
    data: "0x" as const,
    accessList: epoch2Marker,
  };
  const e2Signed = await ready.signer.sign_transaction(e2Unsigned as any);
  const e2Parsed = Transaction.from(e2Signed);
  assert.equal(
    buyVoidPresaleAccessListExactV1(
      e2Parsed.accessList, VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1,
    ),
    true,
  );
  await assert.rejects(
    () => ready.signer.sign_transaction({
      ...e2Unsigned,
      accessList: [{
        ...epoch2Marker[0],
        storageKeys: ["0x" + "f".repeat(64)],
      }],
    } as any),
    /buy_void_credential_signer_epoch2_marker_invalid/u,
  );
  // E2 cannot downgrade to an omitted marker, even if a downstream
  // payment-keyed caller normally supplies it.
  await assert.rejects(
    () => ready.signer.sign_transaction({
      ...e2Unsigned,
      accessList: undefined,
    } as any),
    /buy_void_credential_signer_epoch2_marker_invalid/u,
    "unsigned E2 target without the domain marker must HOLD before signing",
  );
  await assert.rejects(
    () => ready.signer.sign_transaction({
      ...e2Unsigned,
      accessList: [],
    } as any),
    /buy_void_credential_signer_epoch2_marker_invalid/u,
    "explicit empty E2 access list must HOLD before signing",
  );

  // A legacy/other target cannot smuggle the E2 signing-domain marker
  // through this reusable credential boundary.
  await assert.rejects(
    () => ready.signer.sign_transaction({
      ...e2Unsigned,
      to: Wallet.createRandom().address,
      accessList: epoch2Marker,
    } as any),
    /buy_void_credential_signer_epoch2_marker_invalid/u,
    "non-E2 target with E2 marker must HOLD before signing",
  );
  const historicalSigned = await ready.signer.sign_transaction({
    ...e2Unsigned,
    to: Wallet.createRandom().address,
    accessList: undefined,
  } as any);
  assert.deepEqual(Transaction.from(historicalSigned).accessList, [],
    "historical non-E2 transaction remains without domain marker");

  const mismatch =
    createBuyVoidNativeFulfillmentWalletCredentialSignerV1({
      credentials_directory: root,
      expected_wallet_address: Wallet.createRandom().address,
    });
  assert.equal(mismatch.ok, false);
  if (!("reason" in mismatch)) throw new Error("expected mismatch hold");
  assert.equal(mismatch.reason, "credential_wallet_address_mismatch");

  // Descriptor-bound credential read regression. All keys below are inert,
  // randomly generated synthetic fixtures, never systemd/operator material.
  const makeRaceRoot = (label: string) => {
    const dir = fs.mkdtempSync(path.join(root, "fd-" + label + "-"));
    fs.chmodSync(dir, 0o700);
    const file = path.join(dir,
      VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1);
    fs.writeFileSync(file, wallet.privateKey + "\n", { mode: 0o400 });
    fs.chmodSync(file, 0o400);
    return { dir, file };
  };
  const checked = makeRaceRoot("positive");
  const checkedSigner = createBuyVoidNativeFulfillmentWalletCredentialSignerV1({
    credentials_directory: checked.dir,
    expected_wallet_address: wallet.address,
  });
  assert.equal(checkedSigner.ok, true, "0400 credential FD read must pass");

  // The file path is swapped to a symlink after its lstat but immediately
  // before the fixed-name O_NOFOLLOW open through /proc/self/fd.
  const raceSymlink = makeRaceRoot("symlink");
  let symlinkInjected = false;
  let symlinkReadCount = 0;
  {
    const originalOpen = fs.openSync;
    const originalRead = fs.readSync;
    (fs as any).openSync = function(file: any, flags: any, mode?: any) {
      if (!symlinkInjected &&
          String(file).startsWith("/proc/self/fd/") &&
          String(file).endsWith("/" +
            VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1)) {
        symlinkInjected = true;
        fs.renameSync(raceSymlink.file, raceSymlink.file + ".held");
        fs.symlinkSync(raceSymlink.file + ".held", raceSymlink.file);
      }
      return (originalOpen as any)(file, flags, mode);
    };
    (fs as any).readSync = function(...args: any[]) {
      symlinkReadCount += 1;
      return (originalRead as any)(...args);
    };
    try {
      const decision = createBuyVoidNativeFulfillmentWalletCredentialSignerV1({
        credentials_directory: raceSymlink.dir,
        expected_wallet_address: wallet.address,
      });
      assert.equal(decision.ok, false);
    } finally {
      (fs as any).openSync = originalOpen;
      (fs as any).readSync = originalRead;
    }
  }
  assert.equal(symlinkInjected, true);
  assert.equal(symlinkReadCount, 0,
    "symlink substitution must HOLD before any credential bytes are read");

  // An equally private, same-sized second inode must not inherit an earlier
  // lstat admission. The original source bytes must not be read by the FD.
  const raceInode = makeRaceRoot("inode");
  let inodeInjected = false;
  let inodeReadCount = 0;
  {
    const originalOpen = fs.openSync;
    const originalRead = fs.readSync;
    (fs as any).openSync = function(file: any, flags: any, mode?: any) {
      if (!inodeInjected &&
          String(file).startsWith("/proc/self/fd/") &&
          String(file).endsWith("/" +
            VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1)) {
        inodeInjected = true;
        fs.renameSync(raceInode.file, raceInode.file + ".saved");
        fs.writeFileSync(raceInode.file, wallet.privateKey + "\n",
          { mode: 0o400 });
        fs.chmodSync(raceInode.file, 0o400);
      }
      return (originalOpen as any)(file, flags, mode);
    };
    (fs as any).readSync = function(...args: any[]) {
      inodeReadCount += 1;
      return (originalRead as any)(...args);
    };
    try {
      const decision = createBuyVoidNativeFulfillmentWalletCredentialSignerV1({
        credentials_directory: raceInode.dir,
        expected_wallet_address: wallet.address,
      });
      assert.equal(decision.ok, false);
    } finally {
      (fs as any).openSync = originalOpen;
      (fs as any).readSync = originalRead;
    }
  }
  assert.equal(inodeInjected, true);
  assert.equal(inodeReadCount, 0,
    "same-mode inode replacement must HOLD before credential FD read");

  // Directory namespace replacement after the parent stat, before the
  // directory FD acquisition must not redirect the credential authority.
  const raceParent = makeRaceRoot("parent");
  let parentInjected = false;
  {
    const originalOpen = fs.openSync;
    (fs as any).openSync = function(file: any, flags: any, mode?: any) {
      if (!parentInjected && String(file) === raceParent.dir &&
          typeof flags === "number" &&
          (flags & fs.constants.O_DIRECTORY) !== 0) {
        parentInjected = true;
        fs.renameSync(raceParent.dir, raceParent.dir + ".detached");
        fs.mkdirSync(raceParent.dir, { mode: 0o700 });
      }
      return (originalOpen as any)(file, flags, mode);
    };
    try {
      const decision = createBuyVoidNativeFulfillmentWalletCredentialSignerV1({
        credentials_directory: raceParent.dir,
        expected_wallet_address: wallet.address,
      });
      assert.equal(decision.ok, false);
    } finally {
      (fs as any).openSync = originalOpen;
    }
  }
  assert.equal(parentInjected, true);

  // Hardlinks must not be accepted as authority over mutable credentials.
  const multipleLinks = makeRaceRoot("hardlink");
  fs.linkSync(multipleLinks.file, multipleLinks.file + ".other");
  const linksHeld = createBuyVoidNativeFulfillmentWalletCredentialSignerV1({
    credentials_directory: multipleLinks.dir,
    expected_wallet_address: wallet.address,
  });
  assert.equal(linksHeld.ok, false);
  if (linksHeld.ok) throw new Error("hardlink accepted");
  assert.equal(linksHeld.reason, "credential_owner_or_links_invalid");

  // Simulate a wrong-owner lstat without changing the host's permissions.
  const wrongOwner = makeRaceRoot("owner");
  {
    const originalLstat = fs.lstatSync;
    (fs as any).lstatSync = function(file: any, options?: any) {
      const stat = (originalLstat as any)(file, options);
      if (String(file) === wrongOwner.file && options?.bigint === true) {
        return new Proxy(stat, {
          get(target: any, key: any) {
            if (key === "uid") return BigInt(process.getuid!() + 1);
            return Reflect.get(target, key);
          },
        });
      }
      return stat;
    };
    try {
      const decision = createBuyVoidNativeFulfillmentWalletCredentialSignerV1({
        credentials_directory: wrongOwner.dir,
        expected_wallet_address: wallet.address,
      });
      assert.equal(decision.ok, false);
    } finally {
      (fs as any).lstatSync = originalLstat;
    }
  }

  // Growth during the bounded FD read must be detected and no signer
  // returned; the original admitted inode remains pinned.
  const raceGrowth = makeRaceRoot("growth");
  let growthInjected = false;
  {
    const originalRead = fs.readSync;
    (fs as any).readSync = function(...args: any[]) {
      if (!growthInjected && typeof args[0] === "number") {
        growthInjected = true;
        fs.chmodSync(raceGrowth.file, 0o600);
        fs.appendFileSync(raceGrowth.file, "X");
        fs.chmodSync(raceGrowth.file, 0o400);
      }
      return (originalRead as any)(...args);
    };
    try {
      const decision = createBuyVoidNativeFulfillmentWalletCredentialSignerV1({
        credentials_directory: raceGrowth.dir,
        expected_wallet_address: wallet.address,
      });
      assert.equal(decision.ok, false);
    } finally {
      (fs as any).readSync = originalRead;
    }
  }
  assert.equal(growthInjected, true);

  // Even if closeSync throws after the OS closes the FD, authority is
  // uncertain and must HOLD rather than constructing a signer.
  const raceClose = makeRaceRoot("close");
  let closeInjected = false;
  let credentialFd = -1;
  {
    const originalOpen = fs.openSync;
    const originalClose = fs.closeSync;
    (fs as any).openSync = function(file: any, flags: any, mode?: any) {
      const fd = (originalOpen as any)(file, flags, mode);
      if (String(file).startsWith("/proc/self/fd/") &&
          String(file).endsWith("/" +
            VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1)) {
        credentialFd = fd;
      }
      return fd;
    };
    (fs as any).closeSync = function(fd: number) {
      (originalClose as any)(fd);
      if (!closeInjected && fd === credentialFd) {
        closeInjected = true;
        throw new Error("synthetic_close_uncertain");
      }
    };
    try {
      const decision = createBuyVoidNativeFulfillmentWalletCredentialSignerV1({
        credentials_directory: raceClose.dir,
        expected_wallet_address: wallet.address,
      });
      assert.equal(decision.ok, false);
      if (decision.ok) throw new Error("close uncertainty accepted");
      assert.equal(decision.reason, "credential_fd_close_uncertain");
    } finally {
      (fs as any).openSync = originalOpen;
      (fs as any).closeSync = originalClose;
    }
  }
  assert.equal(closeInjected, true);
  console.log("credential_inode_and_namespace_substitution_refused=true");
  console.log("credential_fd_growth_and_close_uncertainty_refused=true");

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
