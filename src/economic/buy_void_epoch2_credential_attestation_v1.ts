import crypto from "node:crypto";
import { Interface, Transaction, getAddress } from "ethers";
import type {
  BuyVoidDeliveryUnsignedTransactionV1,
} from "./buy_void_delivery_sign_broadcast_adapter_v1.js";
import {
  VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1,
  VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1,
  buyVoidPresaleAccessListExactV1,
  buyVoidPresaleRequiredAccessListV1,
} from "./buy_void_epoch2_fulfillment_access_list_v1.js";
import {
  VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_BINDING_ID_V1,
} from "./buy_void_epoch2_credential_source_binding_v1.js";

export const VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_V1 =
  "VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_V1";
export const VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_CONFIRMATION_V1 =
  "probeBuyVoidEpoch2InstalledCredentialSigningCapabilityV1";
export const VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_PROBE_NONCE_V1 =
  Number.MAX_SAFE_INTEGER;
export const VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_PROBE_GAS_LIMIT_V1 =
  231_582n;

export const VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_AUTHORITY_V1 =
  Object.freeze({
    credential_content_read: true,
    local_signing_probe: true,
    raw_private_key_output: false,
    raw_signed_transaction_output: false,
    rpc_call: false,
    transaction_broadcast: false,
    transaction_submission: false,
    filesystem_write: false,
    dependency_assignment: false,
    runtime_enablement: false,
    service_restart: false,
    public_payment_acceptance: false,
    presale_activation: false,
    wc_void_market_activation: false,
    funds_movement: false,
  } as const);

const FULFILL = new Interface([
  "function fulfill(bytes32 paymentDeliveryId,address recipient,uint256 amountAtoms)",
]);
const HEX64 = /^[0-9a-f]{64}$/u;
const SHA40 = /^[0-9a-f]{40}$/u;

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizedAddress(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    return getAddress(value).toLowerCase();
  } catch {
    return null;
  }
}

export type BuyVoidEpoch2CredentialProbeV1 =
  Readonly<BuyVoidDeliveryUnsignedTransactionV1> & {
    accessList: Array<{ address: string; storageKeys: string[] }>;
  };

export function buildBuyVoidEpoch2CredentialCapabilityProbeV1(input: {
  source_head: string;
  challenge_hex: string;
}): BuyVoidEpoch2CredentialProbeV1 {
  const sourceHead = String(input?.source_head || "").toLowerCase();
  const challenge = String(input?.challenge_hex || "").toLowerCase();
  if (!SHA40.test(sourceHead)) throw new Error("epoch2_probe_source_head_invalid");
  if (!HEX64.test(challenge)) throw new Error("epoch2_probe_challenge_invalid");

  const paymentDeliveryId = "0x" + sha256([
    VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_V1,
    sourceHead,
    challenge,
  ].join("\0"));
  const data = FULFILL.encodeFunctionData("fulfill", [
    paymentDeliveryId,
    VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1,
    1n,
  ]);
  return Object.freeze({
    type: 2 as const,
    chainId: 2050n,
    nonce: VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_PROBE_NONCE_V1,
    gasLimit: VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_PROBE_GAS_LIMIT_V1,
    maxFeePerGas: 0n,
    maxPriorityFeePerGas: 0n,
    to: VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1,
    value: 0n as const,
    data,
    accessList: buyVoidPresaleRequiredAccessListV1(
      VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1,
    ),
  });
}

export function buyVoidEpoch2CredentialProbeFingerprintV1(
  probe: Readonly<BuyVoidEpoch2CredentialProbeV1>,
): string {
  return sha256(JSON.stringify({
    type: probe.type,
    chain_id: probe.chainId.toString(),
    nonce: probe.nonce,
    gas_limit: probe.gasLimit.toString(),
    max_fee_per_gas: probe.maxFeePerGas.toString(),
    max_priority_fee_per_gas: probe.maxPriorityFeePerGas.toString(),
    to: probe.to.toLowerCase(),
    value: probe.value.toString(),
    data: probe.data.toLowerCase(),
    access_list: probe.accessList.map((row) => ({
      address: row.address.toLowerCase(),
      storage_keys: row.storageKeys.map((key) => key.toLowerCase()),
    })),
  }));
}

export function verifyBuyVoidEpoch2CredentialSignedProbeV1(input: {
  raw_signed_transaction: string;
  expected_signer: string;
  probe: Readonly<BuyVoidEpoch2CredentialProbeV1>;
}): {
  ok: true;
  signer: string;
  transaction_hash: string;
  raw_signed_transaction_sha256: string;
} | {
  ok: false;
  reason: string;
} {
  const raw = String(input?.raw_signed_transaction || "");
  if (!/^0x[0-9a-fA-F]+$/u.test(raw) || raw.length < 4 || raw.length > 8192) {
    return { ok: false, reason: "epoch2_probe_signed_transaction_shape_invalid" };
  }
  const expectedSigner = normalizedAddress(input?.expected_signer);
  if (!expectedSigner) {
    return { ok: false, reason: "epoch2_probe_expected_signer_invalid" };
  }

  let tx: Transaction;
  try {
    tx = Transaction.from(raw);
  } catch {
    return { ok: false, reason: "epoch2_probe_signed_transaction_parse_failed" };
  }
  const signer = normalizedAddress(tx.from);
  const target = normalizedAddress(tx.to);
  if (!signer || signer !== expectedSigner) {
    return { ok: false, reason: "epoch2_probe_signer_mismatch" };
  }
  if (
    tx.type !== 2 ||
    tx.chainId !== 2050n ||
    tx.nonce !== input.probe.nonce ||
    tx.gasLimit !== input.probe.gasLimit ||
    tx.maxFeePerGas !== input.probe.maxFeePerGas ||
    tx.maxPriorityFeePerGas !== input.probe.maxPriorityFeePerGas ||
    target !== VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1 ||
    tx.value !== 0n ||
    tx.data.toLowerCase() !== input.probe.data.toLowerCase() ||
    !buyVoidPresaleAccessListExactV1(tx.accessList, tx.to)
  ) {
    return { ok: false, reason: "epoch2_probe_signed_envelope_mismatch" };
  }
  if (!tx.hash || !/^0x[0-9a-f]{64}$/u.test(tx.hash.toLowerCase())) {
    return { ok: false, reason: "epoch2_probe_transaction_hash_invalid" };
  }
  return {
    ok: true,
    signer,
    transaction_hash: tx.hash.toLowerCase(),
    raw_signed_transaction_sha256:
      crypto.createHash("sha256").update(Buffer.from(raw, "utf8")).digest("hex"),
  };
}

export function buildBuyVoidEpoch2CredentialAttestationEvidenceV1(input: {
  source_head: string;
  source_qualifier_blob: string;
  signer_source_blob: string;
  full_runtime_source_blob: string;
  attestation_source_blob: string;
  expected_signer: string;
  probe: Readonly<BuyVoidEpoch2CredentialProbeV1>;
  raw_signed_transaction: string;
}): Record<string, unknown> {
  const sourceHead = String(input?.source_head || "").toLowerCase();
  const blobs = [
    input?.source_qualifier_blob,
    input?.signer_source_blob,
    input?.full_runtime_source_blob,
    input?.attestation_source_blob,
  ].map((value) => String(value || "").toLowerCase());
  if (!SHA40.test(sourceHead) || blobs.some((value) => !SHA40.test(value))) {
    throw new Error("epoch2_attestation_source_identity_invalid");
  }
  const expectedSigner = normalizedAddress(input.expected_signer);
  if (!expectedSigner) throw new Error("epoch2_attestation_signer_invalid");

  const verified = verifyBuyVoidEpoch2CredentialSignedProbeV1({
    raw_signed_transaction: input.raw_signed_transaction,
    expected_signer: expectedSigner,
    probe: input.probe,
  });
  if (!verified.ok) throw new Error(verified.reason);

  const body = {
    marker: VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_V1,
    version: 1,
    status: "EPOCH2_INSTALLED_CREDENTIAL_SIGNING_CAPABILITY_GREEN",
    chain_id: 2050,
    execution_epoch: 2,
    source_head: sourceHead,
    source_identity: {
      epoch2_source_qualifier_git_blob: blobs[0],
      epoch2_credential_signer_git_blob: blobs[1],
      epoch2_full_runtime_git_blob: blobs[2],
      credential_attestation_git_blob: blobs[3],
      credential_source_binding_id:
        VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_BINDING_ID_V1,
    },
    credential_id: "buy-void-epoch2-fulfiller-v1",
    immutable_fulfiller: expectedSigner,
    fulfillment_contract: VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1,
    probe: {
      nonce: input.probe.nonce,
      amount_atoms: "1",
      max_fee_per_gas_wei: "0",
      max_priority_fee_per_gas_wei: "0",
      probe_envelope_sha256:
        buyVoidEpoch2CredentialProbeFingerprintV1(input.probe),
      transaction_hash: verified.transaction_hash,
      raw_signed_transaction_sha256: verified.raw_signed_transaction_sha256,
      raw_signed_transaction_output: false,
    },
    credential_content_read: true,
    immutable_fulfiller_identity_proven: true,
    active_signing_capability_proven: true,
    transaction_broadcast_performed: false,
    rpc_call_performed: false,
    runtime_activation_authorized: false,
    public_payment_acceptance_authorized: false,
    presale_activation_authorized: false,
    funds_movement: false,
    authority: VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_AUTHORITY_V1,
  };
  return Object.freeze({
    ...body,
    evidence_id: "voide2cred1_" + sha256(JSON.stringify(body)),
  });
}
