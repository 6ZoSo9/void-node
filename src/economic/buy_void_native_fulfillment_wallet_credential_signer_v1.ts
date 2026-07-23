import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  Wallet,
  getAddress,
} from "ethers";
import type {
  BuyVoidNativeDeliverySignerV1,
  BuyVoidNativeDeliveryUnsignedTransactionV1,
} from "./buy_void_native_delivery_sign_broadcast_adapter_v1.js";

export const VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_SIGNER_V1 =
  "VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_SIGNER_V1";

export const VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1 =
  "buy-void-native-fulfillment-wallet-v1";

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
  };
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

  let stat: fs.Stats;
  try {
    stat = fs.lstatSync(credentialPath);
  } catch (error) {
    return held("credential_missing_or_unreadable", {
      detail: { error_class: safeErrorClass(error) },
    });
  }

  if (stat.isSymbolicLink()) {
    return held("credential_symlink_forbidden");
  }
  if (!stat.isFile()) {
    return held("credential_not_regular_file");
  }
  if (stat.size <= 0 || stat.size > MAX_CREDENTIAL_BYTES) {
    return held("credential_size_out_of_policy", {
      detail: { size_bytes: stat.size },
    });
  }

  const mode = stat.mode & 0o777;
  if ((mode & 0o077) !== 0) {
    return held("credential_permissions_too_broad", {
      detail: { mode: mode.toString(8).padStart(3, "0") },
    });
  }

  let credentialBytes: Buffer;
  try {
    credentialBytes = fs.readFileSync(credentialPath);
  } catch (error) {
    return held("credential_read_failed", {
      detail: { error_class: safeErrorClass(error) },
    });
  }

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
