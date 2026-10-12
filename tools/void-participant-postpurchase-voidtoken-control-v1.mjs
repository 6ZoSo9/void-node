import {
  Interface,
  Transaction,
  getAddress,
} from "ethers";

export const VOID_PARTICIPANT_POSTPURCHASE_VOIDTOKEN_CONTROL_V1 =
  "VOID_PARTICIPANT_POSTPURCHASE_VOIDTOKEN_CONTROL_V1";

export const VOID_PARTICIPANT_POSTPURCHASE_VOIDTOKEN_CONTROL_POLICY_V1 =
  Object.freeze({
    chain_id: "2050",
    execution_epoch: 2,
    void_token: "0x470075b85352eb86f7d089fb9ba88945f12aad94",
    transaction_type: 2,
    native_value_wei_required: "0",
    max_fee_per_gas_wei_required: "0",
    max_priority_fee_per_gas_wei_required: "0",
    max_gas_limit: "3000000",
    transfer_selector: "0xa9059cbb",
    participant_raw_signature_required: true,
    delivery_recipient_signer_binding_required: true,
    raw_public_rpc_allowed: false,
  });

export const VOID_PARTICIPANT_POSTPURCHASE_VOIDTOKEN_CONTROL_AUTHORITY_V1 =
  Object.freeze({
    source_only: true,
    explicit_input_only: true,
    raw_signed_transaction_content_read: true,
    signature_recovery: true,
    delivery_provenance_verified: false,
    wallet_access: false,
    private_key_access: false,
    credential_content_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    runtime_route_active: false,
    public_submission_open: false,
    authoritative_chain2050_write: false,
    token_movement: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const DELIVERY_KEYS = Object.freeze([
  "marker",
  "delivery_confirmed",
  "chain_id",
  "void_token_address",
  "delivery_address",
  "token_amount_atoms",
  "transaction_hash",
  "receipt_evidence_fingerprint_sha256",
  "observed_confirmation_count",
]);

const TOP_KEYS = Object.freeze([
  "delivery",
  "raw_signed_transaction",
]);

const ADDRESS = /^0x[0-9a-f]{40}$/u;
const HASH = /^0x[0-9a-f]{64}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const UINT = /^(0|[1-9][0-9]*)$/u;
const MAX_RAW_TRANSACTION_HEX_CHARS = 262_144 * 2 + 2;

const TOKEN_INTERFACE = new Interface([
  "function transfer(address to,uint256 amount) returns (bool)",
]);

function fail(code) {
  throw new Error(code);
}

function snapshotExpectedFields(value, keys, code) {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw null;
    }
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw null;
    const snapshot = Object.create(null);
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        !descriptor ||
        descriptor.enumerable !== true ||
        !Object.hasOwn(descriptor, "value")
      ) {
        throw null;
      }
      snapshot[key] = descriptor.value;
    }
    return Object.freeze(snapshot);
  } catch {
    fail(code);
  }
}

function normalizeAddress(value, code) {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{40}$/u.test(value)) {
    fail(code);
  }
  try {
    const normalized = getAddress(value).toLowerCase();
    if (
      !ADDRESS.test(normalized) ||
      normalized === "0x0000000000000000000000000000000000000000"
    ) {
      fail(code);
    }
    return normalized;
  } catch {
    fail(code);
  }
}

function normalizeHash(value, code) {
  if (typeof value !== "string") fail(code);
  const normalized = value.toLowerCase();
  if (!HASH.test(normalized)) fail(code);
  return normalized;
}

function positiveUint(value, code) {
  if (typeof value !== "string" || !UINT.test(value)) fail(code);
  const parsed = BigInt(value);
  if (parsed <= 0n) fail(code);
  return parsed;
}

function nonnegativeUint(value, code) {
  if (typeof value !== "string" || !UINT.test(value)) fail(code);
  return BigInt(value);
}

function deliveryEvidence(raw) {
  const delivery = snapshotExpectedFields(
    raw,
    DELIVERY_KEYS,
    "INVALID_PARTICIPANT_POSTPURCHASE_DELIVERY_SHAPE",
  );

  if (
    delivery.marker !== "VOID_BUY_VOID_ERC20_DELIVERY_RECEIPT_RECONCILER_V1" ||
    delivery.delivery_confirmed !== true ||
    delivery.chain_id !== "2050"
  ) {
    fail("PARTICIPANT_POSTPURCHASE_DELIVERY_NOT_CONFIRMED");
  }

  const token = normalizeAddress(
    delivery.void_token_address,
    "INVALID_PARTICIPANT_POSTPURCHASE_DELIVERY_TOKEN",
  );
  if (
    token !==
    VOID_PARTICIPANT_POSTPURCHASE_VOIDTOKEN_CONTROL_POLICY_V1.void_token
  ) {
    fail("PARTICIPANT_POSTPURCHASE_DELIVERY_TOKEN_MISMATCH");
  }

  const participant = normalizeAddress(
    delivery.delivery_address,
    "INVALID_PARTICIPANT_POSTPURCHASE_DELIVERY_ADDRESS",
  );
  const deliveredAtoms = positiveUint(
    delivery.token_amount_atoms,
    "INVALID_PARTICIPANT_POSTPURCHASE_DELIVERED_ATOMS",
  );
  const transactionHash = normalizeHash(
    delivery.transaction_hash,
    "INVALID_PARTICIPANT_POSTPURCHASE_DELIVERY_TRANSACTION_HASH",
  );

  if (
    typeof delivery.receipt_evidence_fingerprint_sha256 !== "string" ||
    !SHA256.test(delivery.receipt_evidence_fingerprint_sha256)
  ) {
    fail("INVALID_PARTICIPANT_POSTPURCHASE_RECEIPT_FINGERPRINT");
  }

  const confirmations = positiveUint(
    delivery.observed_confirmation_count,
    "INVALID_PARTICIPANT_POSTPURCHASE_CONFIRMATION_COUNT",
  );

  return Object.freeze({
    token,
    participant,
    delivered_atoms: deliveredAtoms,
    delivery_transaction_hash: transactionHash,
    receipt_evidence_fingerprint_sha256:
      delivery.receipt_evidence_fingerprint_sha256,
    observed_confirmation_count: confirmations,
  });
}

function parseSignedTransfer(raw, delivery) {
  if (
    typeof raw !== "string" ||
    raw.length < 4 ||
    raw.length > MAX_RAW_TRANSACTION_HEX_CHARS ||
    !/^0x[0-9a-fA-F]+$/u.test(raw) ||
    (raw.length - 2) % 2 !== 0
  ) {
    fail("PARTICIPANT_POSTPURCHASE_RAW_TRANSACTION_ENCODING_INVALID");
  }

  let tx;
  try {
    tx = Transaction.from(raw);
  } catch {
    fail("PARTICIPANT_POSTPURCHASE_RAW_TRANSACTION_DECODE_FAILED");
  }

  if (!tx.isSigned()) {
    fail("PARTICIPANT_POSTPURCHASE_SIGNATURE_REQUIRED");
  }

  let signer;
  try {
    signer = getAddress(tx.from).toLowerCase();
  } catch {
    fail("PARTICIPANT_POSTPURCHASE_SIGNER_RECOVERY_FAILED");
  }
  if (signer !== delivery.participant) {
    fail("PARTICIPANT_POSTPURCHASE_SIGNER_NOT_DELIVERY_RECIPIENT");
  }

  if (
    BigInt(tx.chainId) !==
    BigInt(VOID_PARTICIPANT_POSTPURCHASE_VOIDTOKEN_CONTROL_POLICY_V1.chain_id)
  ) {
    fail("PARTICIPANT_POSTPURCHASE_CHAIN_ID_MISMATCH");
  }
  if (
    tx.type !==
    VOID_PARTICIPANT_POSTPURCHASE_VOIDTOKEN_CONTROL_POLICY_V1.transaction_type
  ) {
    fail("PARTICIPANT_POSTPURCHASE_TRANSACTION_TYPE_MISMATCH");
  }

  const target = normalizeAddress(
    tx.to,
    "INVALID_PARTICIPANT_POSTPURCHASE_TRANSACTION_TARGET",
  );
  if (target !== delivery.token) {
    fail("PARTICIPANT_POSTPURCHASE_TRANSACTION_TARGET_MISMATCH");
  }

  if (BigInt(tx.value) !== 0n) {
    fail("PARTICIPANT_POSTPURCHASE_NATIVE_VALUE_FORBIDDEN");
  }
  if (tx.maxFeePerGas === null || BigInt(tx.maxFeePerGas) !== 0n) {
    fail("PARTICIPANT_POSTPURCHASE_MAX_FEE_PER_GAS_MISMATCH");
  }
  if (
    tx.maxPriorityFeePerGas === null ||
    BigInt(tx.maxPriorityFeePerGas) !== 0n
  ) {
    fail("PARTICIPANT_POSTPURCHASE_PRIORITY_FEE_MISMATCH");
  }

  const gasLimit = BigInt(tx.gasLimit);
  if (
    gasLimit < 21_000n ||
    gasLimit >
      BigInt(
        VOID_PARTICIPANT_POSTPURCHASE_VOIDTOKEN_CONTROL_POLICY_V1.max_gas_limit,
      )
  ) {
    fail("PARTICIPANT_POSTPURCHASE_GAS_LIMIT_INVALID");
  }
  if (!Number.isSafeInteger(tx.nonce) || tx.nonce < 0) {
    fail("PARTICIPANT_POSTPURCHASE_NONCE_INVALID");
  }

  let decoded;
  try {
    decoded = TOKEN_INTERFACE.decodeFunctionData("transfer", tx.data);
  } catch {
    fail("PARTICIPANT_POSTPURCHASE_NOT_VOIDTOKEN_TRANSFER");
  }

  const recipient = normalizeAddress(
    String(decoded[0]),
    "INVALID_PARTICIPANT_POSTPURCHASE_TRANSFER_RECIPIENT",
  );
  const amount = BigInt(decoded[1]);
  if (amount <= 0n) {
    fail("PARTICIPANT_POSTPURCHASE_TRANSFER_AMOUNT_INVALID");
  }
  if (amount > delivery.delivered_atoms) {
    fail("PARTICIPANT_POSTPURCHASE_TRANSFER_EXCEEDS_DELIVERED_AMOUNT");
  }

  const transactionHash = normalizeHash(
    tx.hash,
    "INVALID_PARTICIPANT_POSTPURCHASE_CONTROL_TRANSACTION_HASH",
  );

  return Object.freeze({
    transaction_hash: transactionHash,
    signer_address: signer,
    nonce: String(tx.nonce),
    transaction_type: tx.type,
    target,
    native_value_wei: "0",
    gas_limit: gasLimit.toString(),
    max_fee_per_gas_wei: "0",
    max_priority_fee_per_gas_wei: "0",
    transfer_recipient: recipient,
    transfer_amount_atoms: amount.toString(),
  });
}

export function verifyVoidParticipantPostpurchaseVoidTokenControlV1(value) {
  const input = snapshotExpectedFields(
    value,
    TOP_KEYS,
    "INVALID_PARTICIPANT_POSTPURCHASE_CONTROL_SHAPE",
  );
  const delivery = deliveryEvidence(input.delivery);
  const transfer = parseSignedTransfer(
    input.raw_signed_transaction,
    delivery,
  );

  return Object.freeze({
    marker: VOID_PARTICIPANT_POSTPURCHASE_VOIDTOKEN_CONTROL_V1,
    chain_id: 2050,
    execution_epoch: 2,
    void_token: delivery.token,
    delivery_address: delivery.participant,
    delivered_token_amount_atoms: delivery.delivered_atoms.toString(),
    delivery_transaction_hash: delivery.delivery_transaction_hash,
    delivery_receipt_evidence_fingerprint_sha256:
      delivery.receipt_evidence_fingerprint_sha256,
    observed_delivery_confirmation_count:
      delivery.observed_confirmation_count.toString(),
    control_transaction_hash: transfer.transaction_hash,
    control_signer_address: transfer.signer_address,
    control_nonce: transfer.nonce,
    control_transaction_type: transfer.transaction_type,
    control_target: transfer.target,
    control_transfer_recipient: transfer.transfer_recipient,
    control_transfer_amount_atoms: transfer.transfer_amount_atoms,
    participant_eoa_signature_recovered: true,
    delivery_recipient_equals_control_signer: true,
    canonical_voidtoken_transfer_calldata_verified: true,
    zero_native_value_verified: true,
    zero_gas_price_policy_bound: true,
    delivered_amount_upper_bound_enforced: true,
    participant_postpurchase_voidtoken_control_source_ready: true,
    delivery_provenance_verified: false,
    participant_balance_verified_live: false,
    transaction_submission_path_ready: false,
    runtime_route_active: false,
    public_submission_open: false,
    transaction_submitted: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    token_movement_performed_by_this_verifier: false,
    market_activation_authority: false,
    public_presale_activation_authority: false,
    funds_movement_authority: false,
    raw_signed_transaction_persisted: false,
    authority:
      VOID_PARTICIPANT_POSTPURCHASE_VOIDTOKEN_CONTROL_AUTHORITY_V1,
  });
}
