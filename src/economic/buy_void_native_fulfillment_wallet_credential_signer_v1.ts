import {
  VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1,
  VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1,
  buyVoidPresaleAccessListExactV1,
} from "./buy_void_epoch2_fulfillment_access_list_v1.js";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  Interface,
  Wallet,
  getAddress,
} from "ethers";
import type {
  BuyVoidDeliveryUnsignedTransactionV1,
} from "./buy_void_delivery_sign_broadcast_adapter_v1.js";
import type {
  BuyVoidNativeDeliverySignerV1,
  BuyVoidNativeDeliveryUnsignedTransactionV1,
} from "./buy_void_native_delivery_sign_broadcast_adapter_v1.js";

export const VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_SIGNER_V1 =
  "VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_SIGNER_V1";

export const VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1 =
  "buy-void-native-fulfillment-wallet-v1";

// Independent systemd credential name for the successor immutable E2 fulfiller.
// Never reinterpret the retired E1 wallet credential as a new-chain signer.
export const VOID_BUY_VOID_EPOCH2_FULFILLER_CREDENTIAL_ID_V1 =
  "buy-void-epoch2-fulfiller-v1";

export const VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_SIGNER_AUTHORITY_V1 = {
  systemd_credential_only: true,
  fixed_credential_id: true,
  arbitrary_path_input: false,
  node_private_key_reuse: false,
  environment_private_key: false,
  request_private_key: false,
  mnemonic_input: false,
  credential_symlink_allowed: false,
  group_or_world_access_allowed: false,
  filesystem_read: true,
  filesystem_write: false,
  wallet_access: true,
  signing_when_called: true,
  transaction_broadcast: false,
  rpc_call: false,
  runtime_route_mount: false,
  raw_private_key_output: false,
  raw_signed_transaction_persistence: false,
} as const;

export type BuyVoidNativeFulfillmentWalletCredentialSignerPolicyV1 = {
  credentials_directory: string;
  expected_wallet_address: string;
};

export type BuyVoidNativeFulfillmentWalletCredentialSignerReadyV1 = {
  ok: true;
  marker: typeof VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_SIGNER_V1;
  version: 1;
  status: "ready";
  credential_id:
    typeof VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1;
  wallet_address: string;
  wallet_address_fingerprint_sha256: string;
  signer: BuyVoidNativeDeliverySignerV1;
  authority:
    typeof VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_SIGNER_AUTHORITY_V1;
};

export type BuyVoidNativeFulfillmentWalletCredentialSignerHeldV1 = {
  ok: false;
  marker: typeof VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_SIGNER_V1;
  version: 1;
  status: "held";
  reason: string;
  credential_id:
    typeof VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1;
  wallet_address: string | null;
  wallet_address_fingerprint_sha256: string | null;
  authority:
    typeof VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_SIGNER_AUTHORITY_V1;
  detail?: Record<string, unknown>;
};

export type BuyVoidNativeFulfillmentWalletCredentialSignerDecisionV1 =
  | BuyVoidNativeFulfillmentWalletCredentialSignerReadyV1
  | BuyVoidNativeFulfillmentWalletCredentialSignerHeldV1;

const PRIVATE_KEY = /^(?:0x)?[0-9a-fA-F]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const MAX_CREDENTIAL_BYTES = 256;

function safeErrorClass(error: unknown): string {
  const raw = String((error as any)?.name || "Error").trim();
  return /^[A-Za-z0-9._:-]{1,80}$/.test(raw) ? raw : "Error";
}

function fingerprint(value: string): string {
  return crypto
    .createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

function normalizeAddress(value: unknown): string | null {
  const raw = String(value || "").trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) return null;
  try {
    const normalized = getAddress(raw).toLowerCase();
    return ADDRESS.test(normalized) ? normalized : null;
  } catch {
    return null;
  }
}

function held(
  reason: string,
  options: {
    wallet_address?: string | null;
    detail?: Record<string, unknown>;
  } = {},
): BuyVoidNativeFulfillmentWalletCredentialSignerHeldV1 {
  const walletAddress = normalizeAddress(options.wallet_address);
  return {
    ok: false,
    marker:
      VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_SIGNER_V1,
    version: 1,
    status: "held",
    reason,
    credential_id:
      VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1,
    wallet_address: walletAddress,
    wallet_address_fingerprint_sha256:
      walletAddress ? fingerprint(walletAddress) : null,
    authority:
      VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_SIGNER_AUTHORITY_V1,
    ...(options.detail ? { detail: options.detail } : {}),
  };
}

function renderTransaction(
  transaction: Readonly<BuyVoidNativeDeliveryUnsignedTransactionV1>,
): Record<string, unknown> {
  // The native-transfer v1 type remains unchanged. The payment-keyed E2
  // composer supplies a separately bound optional access-list extension.
  const marker = (
    transaction as Readonly<BuyVoidNativeDeliveryUnsignedTransactionV1> & {
      accessList?: Array<{ address: string; storageKeys: string[] }>;
    }
  ).accessList;
  // Both the marker and its absence are validated against the actual
  // destination. E2 may never omit it; legacy targets may never carry it.
  if (!buyVoidPresaleAccessListExactV1(marker, transaction.to)) {
    throw new Error("buy_void_credential_signer_epoch2_marker_invalid");
  }
  return {
    type: 2,
    chainId: transaction.chainId,
    nonce: transaction.nonce,
    gasLimit: transaction.gasLimit,
    maxFeePerGas: transaction.maxFeePerGas,
    maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
    to: transaction.to,
    value: transaction.value,
    data: transaction.data,
    ...(marker !== undefined ? { accessList: marker } : {}),
  };
}

class CredentialFdReadHoldV1 extends Error {
  constructor(readonly reason: string) {
    super(reason);
  }
}

function credentialStatSameV1(
  left: fs.BigIntStats,
  right: fs.BigIntStats,
): boolean {
  return left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode &&
    left.nlink === right.nlink &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs;
}

function readPinnedCredentialBytesV1(
  directory: string,
  credentialPath: string,
  credentialId: typeof VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1 |
    typeof VOID_BUY_VOID_EPOCH2_FULFILLER_CREDENTIAL_ID_V1 =
      VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1,
): { ok: true; bytes: Buffer } | { ok: false; reason: string } {
  let directoryFd = -1;
  let credentialFd = -1;
  let scratch: Buffer | null = null;
  let result: Buffer | null = null;
  let reason = "";
  const reject = (why: string): never => {
    throw new CredentialFdReadHoldV1(why);
  };

  try {
    if (process.platform !== "linux" ||
        typeof process.getuid !== "function") {
      reject("credential_fd_platform_unsupported");
    }
    const userId = BigInt((process.getuid as () => number)());
    const directoryFlag = fs.constants.O_DIRECTORY;
    const noFollowFlag = fs.constants.O_NOFOLLOW;
    if (!Number.isInteger(directoryFlag) ||
        !Number.isInteger(noFollowFlag) ||
        directoryFlag === 0 || noFollowFlag === 0 ||
        !fs.existsSync("/proc/self/fd")) {
      reject("credential_fd_primitives_unavailable");
    }

    // Pin and revalidate every path component. Sticky root-owned parents
    // (for example /tmp in inert tests) are allowed only as ancestors,
    // never as the credentials directory itself.
    const root = path.parse(directory).root;
    const components = path.relative(root, directory).split(path.sep)
      .filter(Boolean);
    const ancestors: Array<{ name: string; stat: fs.BigIntStats }> = [];
    let current = root;
    const inspectAncestor = (name: string, isLeaf: boolean) => {
      const stat = fs.lstatSync(name, { bigint: true });
      const mode = stat.mode & 0o7777n;
      const stickyProtected = !isLeaf && stat.uid === 0n &&
        (mode & 0o1000n) !== 0n;
      if (stat.isSymbolicLink() || !stat.isDirectory() ||
          (stat.uid !== 0n && stat.uid !== userId) ||
          ((mode & 0o022n) !== 0n && !stickyProtected)) {
        reject("credential_directory_namespace_untrusted");
      }
      ancestors.push({ name, stat });
    };
    inspectAncestor(root, components.length === 0);
    for (let index = 0; index < components.length; index += 1) {
      current = path.join(current, components[index]);
      inspectAncestor(current, index === components.length - 1);
    }

    const beforeDirectory = ancestors[ancestors.length - 1].stat;
    directoryFd = fs.openSync(directory,
      fs.constants.O_RDONLY | directoryFlag | noFollowFlag);
    const openedDirectory = fs.fstatSync(directoryFd, { bigint: true });
    if (!credentialStatSameV1(beforeDirectory, openedDirectory)) {
      reject("credential_directory_fd_identity_changed");
    }

    const beforeCredential: fs.BigIntStats = (() => {
      try {
        return fs.lstatSync(credentialPath, { bigint: true });
      } catch {
        throw new CredentialFdReadHoldV1("credential_missing_or_unreadable");
      }
    })();
    if (beforeCredential.isSymbolicLink()) {
      reject("credential_symlink_forbidden");
    }
    if (!beforeCredential.isFile()) {
      reject("credential_not_regular_file");
    }
    if (beforeCredential.uid !== userId ||
        beforeCredential.nlink !== 1n) {
      reject("credential_owner_or_links_invalid");
    }
    if (beforeCredential.size < 1n ||
        beforeCredential.size > BigInt(MAX_CREDENTIAL_BYTES)) {
      reject("credential_size_out_of_policy");
    }
    if (((beforeCredential.mode & 0o777n) & 0o077n) !== 0n) {
      reject("credential_permissions_too_broad");
    }

    // This fixed-name open is relative to the already pinned directory,
    // not a second pathname lookup through an ambient mutable ancestor.
    const pinnedLeaf = "/proc/self/fd/" + String(directoryFd) + "/" +
      credentialId;
    credentialFd = fs.openSync(pinnedLeaf,
      fs.constants.O_RDONLY | noFollowFlag);
    const openedCredential = fs.fstatSync(credentialFd, { bigint: true });
    if (!credentialStatSameV1(beforeCredential, openedCredential)) {
      reject("credential_file_fd_identity_changed");
    }

    scratch = Buffer.alloc(MAX_CREDENTIAL_BYTES + 1);
    let readCount = 0;
    while (readCount < scratch.length) {
      const n = fs.readSync(credentialFd, scratch, readCount,
        scratch.length - readCount, null);
      if (!Number.isSafeInteger(n) || n < 0) {
        reject("credential_fd_read_invalid");
      }
      if (n === 0) break;
      readCount += n;
    }
    if (readCount !== Number(beforeCredential.size) ||
        readCount > MAX_CREDENTIAL_BYTES) {
      reject("credential_fd_bytes_changed");
    }

    const afterCredential = fs.fstatSync(credentialFd, { bigint: true });
    const visibleCredential = fs.lstatSync(credentialPath, { bigint: true });
    const afterDirectory = fs.fstatSync(directoryFd, { bigint: true });
    const visibleDirectory = fs.lstatSync(directory, { bigint: true });
    if (!credentialStatSameV1(beforeCredential, afterCredential) ||
        !credentialStatSameV1(beforeCredential, visibleCredential) ||
        !credentialStatSameV1(beforeDirectory, afterDirectory) ||
        !credentialStatSameV1(beforeDirectory, visibleDirectory)) {
      reject("credential_file_or_directory_changed_during_read");
    }
    for (const ancestor of ancestors) {
      if (!credentialStatSameV1(
        ancestor.stat, fs.lstatSync(ancestor.name, { bigint: true }),
      )) {
        reject("credential_parent_namespace_changed");
      }
    }
    result = Buffer.from(scratch.subarray(0, readCount));
  } catch (error) {
    // A missing credential or directory still returns the historical HOLD.
    // All other descriptor failures remain fail-closed.
    const errorCode = (error as NodeJS.ErrnoException)?.code;
    reason = error instanceof CredentialFdReadHoldV1
      ? error.reason
      : errorCode === "ENOENT" || errorCode === "ENOTDIR"
        ? "credential_missing_or_unreadable"
        : "credential_fd_read_failed";
  } finally {
    if (scratch !== null) scratch.fill(0);
    for (const fd of [credentialFd, directoryFd]) {
      if (fd >= 0) {
        try {
          fs.closeSync(fd);
        } catch {
          reason = "credential_fd_close_uncertain";
        }
      }
    }
  }
  if (reason || result === null) {
    if (result !== null) result.fill(0);
    return { ok: false, reason: reason || "credential_fd_read_failed" };
  }
  return { ok: true, bytes: result };
}

export function createBuyVoidNativeFulfillmentWalletCredentialSignerV1(
  input: BuyVoidNativeFulfillmentWalletCredentialSignerPolicyV1,
): BuyVoidNativeFulfillmentWalletCredentialSignerDecisionV1 {
  const credentialsDirectory = String(
    input?.credentials_directory || "",
  ).trim();
  if (!credentialsDirectory || !path.isAbsolute(credentialsDirectory)) {
    return held("credentials_directory_must_be_absolute");
  }

  const expectedWalletAddress = normalizeAddress(
    input?.expected_wallet_address,
  );
  if (!expectedWalletAddress) {
    return held("expected_wallet_address_invalid");
  }

  const normalizedDirectory = path.normalize(credentialsDirectory);
  const credentialPath = path.join(
    normalizedDirectory,
    VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1,
  );

  if (path.dirname(credentialPath) !== normalizedDirectory) {
    return held("credential_path_escape_detected");
  }

  const credentialRead = readPinnedCredentialBytesV1(
    normalizedDirectory, credentialPath,
  );
  if ("reason" in credentialRead) {
    return held(credentialRead.reason);
  }
  const credentialBytes = credentialRead.bytes;

  let privateKey = "";
  try {
    privateKey = credentialBytes.toString("utf8").trim();
  } finally {
    credentialBytes.fill(0);
  }

  if (!PRIVATE_KEY.test(privateKey)) {
    privateKey = "";
    return held("credential_private_key_shape_invalid");
  }
  if (!privateKey.startsWith("0x")) privateKey = `0x${privateKey}`;

  let wallet: Wallet;
  try {
    wallet = new Wallet(privateKey);
  } catch (error) {
    privateKey = "";
    return held("credential_wallet_construction_failed", {
      detail: { error_class: safeErrorClass(error) },
    });
  }
  privateKey = "";

  const walletAddress = normalizeAddress(wallet.address);
  if (!walletAddress) {
    return held("credential_wallet_address_invalid");
  }
  if (walletAddress !== expectedWalletAddress) {
    return held("credential_wallet_address_mismatch", {
      wallet_address: walletAddress,
      detail: {
        expected_wallet_address_fingerprint_sha256:
          fingerprint(expectedWalletAddress),
      },
    });
  }

  const signer: BuyVoidNativeDeliverySignerV1 = {
    async get_address(): Promise<string> {
      return walletAddress;
    },

    async sign_transaction(
      transaction: Readonly<BuyVoidNativeDeliveryUnsignedTransactionV1>,
    ): Promise<string> {
      return await wallet.signTransaction(renderTransaction(transaction));
    },
  };

  return {
    ok: true,
    marker:
      VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_SIGNER_V1,
    version: 1,
    status: "ready",
    credential_id:
      VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1,
    wallet_address: walletAddress,
    wallet_address_fingerprint_sha256: fingerprint(walletAddress),
    signer,
    authority:
      VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_SIGNER_AUTHORITY_V1,
  };
}

export const VOID_BUY_VOID_EPOCH2_FULFILLER_CREDENTIAL_SIGNER_V1 =
  "VOID_BUY_VOID_EPOCH2_FULFILLER_CREDENTIAL_SIGNER_V1" as const;

// This function is not mounted into the running Buy VOID application.
// Only a separately provisioned systemd LoadCredential with this NEW name
// and the immutable E2 fulfiller's actual private key can produce READY.
// It does not accept a supplied wallet address or key path.
export function createBuyVoidEpoch2FulfillerCredentialSignerV1(input: {
  credentials_directory: string;
}): {
  ok: true;
  status: "ready";
  marker: typeof VOID_BUY_VOID_EPOCH2_FULFILLER_CREDENTIAL_SIGNER_V1;
  credential_id: typeof VOID_BUY_VOID_EPOCH2_FULFILLER_CREDENTIAL_ID_V1;
  public_address: typeof VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1;
  signer: {
    get_address: () => Promise<string>;
    sign_transaction: (
      transaction: Readonly<BuyVoidDeliveryUnsignedTransactionV1>,
    ) => Promise<string>;
  };
  credential_content_read: true;
  signing_performed_by_factory: false;
  transaction_broadcast_by_factory: false;
  runtime_activation_authorized: false;
} | {
  ok: false;
  status: "HOLD";
  marker: typeof VOID_BUY_VOID_EPOCH2_FULFILLER_CREDENTIAL_SIGNER_V1;
  reason: string;
  credential_content_read: boolean;
  signing_performed_by_factory: false;
  transaction_broadcast_by_factory: false;
  runtime_activation_authorized: false;
} {
  const heldE2 = (reason: string, read = false) => ({
    ok: false as const,
    status: "HOLD" as const,
    marker: VOID_BUY_VOID_EPOCH2_FULFILLER_CREDENTIAL_SIGNER_V1,
    reason,
    credential_content_read: read,
    signing_performed_by_factory: false as const,
    transaction_broadcast_by_factory: false as const,
    runtime_activation_authorized: false as const,
  });
  if (!input || typeof input.credentials_directory !== "string" ||
      !path.isAbsolute(input.credentials_directory) ||
      path.normalize(input.credentials_directory) !==
        input.credentials_directory) {
    return heldE2("epoch2_credentials_directory_invalid");
  }
  const credentialPath = path.join(
    input.credentials_directory, VOID_BUY_VOID_EPOCH2_FULFILLER_CREDENTIAL_ID_V1,
  );
  const read = readPinnedCredentialBytesV1(
    input.credentials_directory, credentialPath,
    VOID_BUY_VOID_EPOCH2_FULFILLER_CREDENTIAL_ID_V1,
  );
  if (!read.ok) return heldE2(read.reason);
  let key = "";
  try {
    key = read.bytes.toString("utf8").trim();
  } finally {
    read.bytes.fill(0);
  }
  if (!PRIVATE_KEY.test(key)) {
    key = "";
    return heldE2("epoch2_credential_private_key_shape_invalid", true);
  }
  let wallet: Wallet;
  try {
    wallet = new Wallet(key.startsWith("0x") ? key : "0x" + key);
  } catch {
    key = "";
    return heldE2("epoch2_credential_public_derivation_failed", true);
  }
  key = "";
  if (wallet.address.toLowerCase() !==
      VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1) {
    return heldE2("epoch2_immutable_fulfiller_public_identity_mismatch", true);
  }

  const fulfillment = new Interface([
    "function fulfill(bytes32 paymentDeliveryId,address recipient,uint256 amountAtoms)",
  ]);
  const signer = {
    async get_address(): Promise<string> {
      return VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1;
    },
    async sign_transaction(
      tx: Readonly<BuyVoidDeliveryUnsignedTransactionV1>,
    ): Promise<string> {
      if (!tx || tx.type !== 2 || tx.chainId !== 2050n ||
          !Number.isSafeInteger(tx.nonce) || tx.nonce < 0 ||
          typeof tx.gasLimit !== "bigint" || tx.gasLimit <= 0n ||
          tx.gasLimit > 320_000n ||
          typeof tx.maxFeePerGas !== "bigint" || tx.maxFeePerGas < 0n ||
          tx.maxFeePerGas > 5_000_000_000n ||
          tx.maxPriorityFeePerGas !== 0n ||
          tx.value !== 0n ||
          normalizeAddress(tx.to) !==
            VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1 ||
          !buyVoidPresaleAccessListExactV1(tx.accessList, tx.to) ||
          typeof tx.data !== "string") {
        throw new Error("epoch2_fulfiller_transaction_envelope_invalid");
      }
      let args: ReturnType<typeof fulfillment.decodeFunctionData>;
      try {
        args = fulfillment.decodeFunctionData("fulfill", tx.data);
      } catch {
        throw new Error("epoch2_fulfiller_calldata_invalid");
      }
      const paymentId = String(args[0]).toLowerCase();
      const recipient = normalizeAddress(args[1]);
      const amount = args[2] as bigint;
      if (!/^0x[0-9a-f]{64}$/.test(paymentId) ||
          paymentId === "0x" + "0".repeat(64) ||
          !recipient || typeof amount !== "bigint" ||
          amount <= 0n || amount > 10_000_000n * 10n ** 18n ||
          fulfillment.encodeFunctionData("fulfill", [
            paymentId, recipient, amount,
          ]).toLowerCase() !== tx.data.toLowerCase()) {
        throw new Error("epoch2_fulfiller_calldata_binding_invalid");
      }
      // No broadcasting or durable key/transaction storage occurs here.
      return await wallet.signTransaction({
        ...renderTransaction(
          tx as unknown as Readonly<BuyVoidNativeDeliveryUnsignedTransactionV1>,
        ),
      });
    },
  };
  return {
    ok: true,
    status: "ready",
    marker: VOID_BUY_VOID_EPOCH2_FULFILLER_CREDENTIAL_SIGNER_V1,
    credential_id: VOID_BUY_VOID_EPOCH2_FULFILLER_CREDENTIAL_ID_V1,
    public_address: VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1,
    signer,
    credential_content_read: true,
    signing_performed_by_factory: false,
    transaction_broadcast_by_factory: false,
    runtime_activation_authorized: false,
  };
}
