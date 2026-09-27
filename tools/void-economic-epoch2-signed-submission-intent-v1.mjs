#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import {
  TypedDataEncoder,
  getAddress,
  isHexString,
  keccak256,
  toUtf8Bytes,
  verifyTypedData,
} from "ethers";

export const VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_INTENT_V1 =
  "VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_INTENT_V1";

export const VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_GATEWAY_ID_V1 =
  keccak256(
    toUtf8Bytes("VOID_ECONOMIC_EPOCH2_PUBLIC_SUBMISSION_GATEWAY_V1"),
  );

export const VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_DOMAIN_V1 =
  Object.freeze({
    name: "VOID Epoch2 Submission Intent",
    version: "1",
    chainId: 2050,
    salt: keccak256(
      toUtf8Bytes("VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_DOMAIN_V1"),
    ),
  });

export const VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_TYPES_V1 =
  Object.freeze({
    SubmissionIntent: Object.freeze([
      Object.freeze({ name: "execution_epoch", type: "uint64" }),
      Object.freeze({ name: "gateway_id", type: "bytes32" }),
      Object.freeze({ name: "policy_generation", type: "uint64" }),
      Object.freeze({ name: "signer", type: "address" }),
      Object.freeze({ name: "nonce", type: "uint256" }),
      Object.freeze({ name: "issued_at_unix", type: "uint64" }),
      Object.freeze({ name: "expires_at_unix", type: "uint64" }),
      Object.freeze({ name: "target", type: "address" }),
      Object.freeze({ name: "value_wei", type: "uint256" }),
      Object.freeze({ name: "gas_limit", type: "uint64" }),
      Object.freeze({ name: "calldata_keccak256", type: "bytes32" }),
    ]),
  });

export const VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_POLICY_V1 =
  Object.freeze({
    chain_id: 2050,
    execution_epoch: "2",
    gateway_id: VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_GATEWAY_ID_V1,
    policy_generation: "1",
    max_ttl_seconds: "300",
    max_gas_limit: "3000000",
    native_value_wei_required: "0",
    target_allowlist_required: true,
    calldata_hash_binding_required: true,
    signer_binding_required: true,
    nonce_binding_required: true,
    atomic_replay_digest_consume_required: true,
    raw_public_rpc_allowed: false,
  });

export const VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_AUTHORITY_V1 =
  Object.freeze({
    source_only: true,
    signature_verification: true,
    local_replay_set_observation: true,
    runtime_route_active: false,
    public_submission_open: false,
    rpc_call: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    wallet_access: false,
    private_key_access: false,
    credential_content_access: false,
    authoritative_chain2050_write: false,
    token_movement: false,
    funds_movement: false,
    migration_authorized: false,
    public_activation: false,
  });

const UINT64_MAX = (1n << 64n) - 1n;
const UINT256_MAX = (1n << 256n) - 1n;

const INTENT_KEYS = Object.freeze([
  "marker",
  "version",
  "execution_epoch",
  "gateway_id",
  "policy_generation",
  "signer",
  "nonce",
  "issued_at_unix",
  "expires_at_unix",
  "target",
  "value_wei",
  "gas_limit",
  "calldata_keccak256",
]);

export class VoidEconomicEpoch2SignedSubmissionIntentHoldV1 extends Error {
  constructor(reason, detail = null) {
    super(reason);
    this.name = "VoidEconomicEpoch2SignedSubmissionIntentHoldV1";
    this.reason = reason;
    this.detail = detail;
  }
}

function hold(reason, detail = null) {
  throw new VoidEconomicEpoch2SignedSubmissionIntentHoldV1(reason, detail);
}

function exactObject(value, reason) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    hold(reason);
  }
  return value;
}

function exactKeys(value, expected, reason) {
  const observed = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (
    observed.length !== wanted.length ||
    observed.some((key, index) => key !== wanted[index])
  ) {
    hold(reason, { observed, expected: wanted });
  }
}

function exactDecimal(value, max, reason) {
  const maxDigits = max.toString().length;
  if (
    typeof value !== "string" ||
    value.length > maxDigits ||
    !/^(?:0|[1-9][0-9]*)$/.test(value)
  ) {
    hold(reason, { value });
  }
  let parsed;
  try {
    parsed = BigInt(value);
  } catch {
    hold(reason, { value });
  }
  if (parsed < 0n || parsed > max) {
    hold(reason, { value });
  }
  return parsed;
}

function exactLowerAddress(value, reason) {
  if (
    typeof value !== "string" ||
    !/^0x[0-9a-f]{40}$/.test(value)
  ) {
    hold(reason, { value });
  }
  let normalized;
  try {
    normalized = getAddress(value).toLowerCase();
  } catch {
    hold(reason, { value });
  }
  if (normalized !== value) {
    hold(reason, { value });
  }
  return value;
}

function exactBytes32(value, reason) {
  if (
    typeof value !== "string" ||
    !/^0x[0-9a-f]{64}$/.test(value)
  ) {
    hold(reason, { value });
  }
  return value;
}

function exactCalldata(value) {
  if (
    typeof value !== "string" ||
    !/^0x(?:[0-9a-f]{2})*$/.test(value)
  ) {
    hold("calldata_not_canonical_lower_hex");
  }
  return value;
}

function typedValue(intent) {
  return {
    execution_epoch: intent.execution_epoch,
    gateway_id: intent.gateway_id,
    policy_generation: intent.policy_generation,
    signer: intent.signer,
    nonce: intent.nonce,
    issued_at_unix: intent.issued_at_unix,
    expires_at_unix: intent.expires_at_unix,
    target: intent.target,
    value_wei: intent.value_wei,
    gas_limit: intent.gas_limit,
    calldata_keccak256: intent.calldata_keccak256,
  };
}

function validateIntentShape(intent) {
  exactObject(intent, "intent_not_object");
  exactKeys(intent, INTENT_KEYS, "intent_schema_mismatch");

  if (intent.marker !== VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_INTENT_V1) {
    hold("intent_marker_mismatch");
  }
  if (intent.version !== 1) {
    hold("intent_version_mismatch");
  }
  if (intent.execution_epoch !== "2") {
    hold("execution_epoch_mismatch");
  }
  if (
    intent.gateway_id !==
    VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_GATEWAY_ID_V1
  ) {
    hold("gateway_id_mismatch");
  }
  if (intent.policy_generation !== "1") {
    hold("policy_generation_mismatch");
  }

  exactLowerAddress(intent.signer, "signer_invalid");
  exactLowerAddress(intent.target, "target_invalid");
  exactBytes32(intent.calldata_keccak256, "calldata_hash_invalid");

  const nonce = exactDecimal(intent.nonce, UINT256_MAX, "nonce_invalid");
  const issuedAt = exactDecimal(
    intent.issued_at_unix,
    UINT64_MAX,
    "issued_at_invalid",
  );
  const expiresAt = exactDecimal(
    intent.expires_at_unix,
    UINT64_MAX,
    "expires_at_invalid",
  );
  const valueWei = exactDecimal(
    intent.value_wei,
    UINT256_MAX,
    "value_wei_invalid",
  );
  const gasLimit = exactDecimal(
    intent.gas_limit,
    UINT64_MAX,
    "gas_limit_invalid",
  );

  if (valueWei !== 0n) {
    hold("native_value_forbidden");
  }
  if (gasLimit < 21_000n) {
    hold("gas_limit_below_minimum");
  }
  if (
    gasLimit >
    BigInt(VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_POLICY_V1.max_gas_limit)
  ) {
    hold("gas_limit_above_policy_maximum");
  }
  if (expiresAt <= issuedAt) {
    hold("intent_time_window_invalid");
  }
  if (
    expiresAt - issuedAt >
    BigInt(VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_POLICY_V1.max_ttl_seconds)
  ) {
    hold("intent_ttl_above_policy_maximum");
  }

  return {
    nonce,
    issuedAt,
    expiresAt,
    valueWei,
    gasLimit,
  };
}

export function buildVoidEconomicEpoch2SignedSubmissionIntentV1({
  signer,
  nonce,
  issuedAtUnix,
  expiresAtUnix,
  target,
  gasLimit,
  calldata,
}) {
  const canonicalCalldata = exactCalldata(calldata);
  const intent = Object.freeze({
    marker: VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_INTENT_V1,
    version: 1,
    execution_epoch: "2",
    gateway_id: VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_GATEWAY_ID_V1,
    policy_generation: "1",
    signer: exactLowerAddress(signer, "signer_invalid"),
    nonce: String(nonce),
    issued_at_unix: String(issuedAtUnix),
    expires_at_unix: String(expiresAtUnix),
    target: exactLowerAddress(target, "target_invalid"),
    value_wei: "0",
    gas_limit: String(gasLimit),
    calldata_keccak256: keccak256(canonicalCalldata),
  });
  validateIntentShape(intent);
  return intent;
}

export function voidEconomicEpoch2SignedSubmissionTypedDataV1(intent) {
  validateIntentShape(intent);
  return Object.freeze({
    domain: VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_DOMAIN_V1,
    types: VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_TYPES_V1,
    value: Object.freeze(typedValue(intent)),
  });
}

export function voidEconomicEpoch2SignedSubmissionDigestV1(intent) {
  const data = voidEconomicEpoch2SignedSubmissionTypedDataV1(intent);
  return TypedDataEncoder.hash(data.domain, data.types, data.value);
}

export function verifyVoidEconomicEpoch2SignedSubmissionIntentV1({
  intent,
  calldata,
  signature,
  nowUnix,
  allowedTargets,
  consumedDigests,
}) {
  const parsed = validateIntentShape(intent);
  const canonicalCalldata = exactCalldata(calldata);

  const now = exactDecimal(nowUnix, UINT64_MAX, "now_unix_invalid");
  if (now < parsed.issuedAt) {
    hold("intent_not_yet_valid");
  }
  if (now >= parsed.expiresAt) {
    hold("intent_expired");
  }

  if (
    !Array.isArray(allowedTargets) ||
    allowedTargets.length === 0
  ) {
    hold("target_allowlist_required");
  }
  const canonicalAllowedTargets = new Set(
    allowedTargets.map((address) =>
      exactLowerAddress(address, "allowed_target_invalid"),
    ),
  );
  if (!canonicalAllowedTargets.has(intent.target)) {
    hold("target_not_allowed");
  }

  if (
    keccak256(canonicalCalldata) !== intent.calldata_keccak256
  ) {
    hold("calldata_hash_mismatch");
  }

  if (
    !consumedDigests ||
    typeof consumedDigests.has !== "function"
  ) {
    hold("replay_set_required");
  }

  const data = voidEconomicEpoch2SignedSubmissionTypedDataV1(intent);
  const digest = TypedDataEncoder.hash(
    data.domain,
    data.types,
    data.value,
  );
  if (consumedDigests.has(digest)) {
    hold("intent_replay_detected", { digest });
  }

  if (
    typeof signature !== "string" ||
    !isHexString(signature, 65)
  ) {
    hold("signature_invalid_encoding");
  }

  let recovered;
  try {
    recovered = verifyTypedData(
      data.domain,
      data.types,
      data.value,
      signature,
    ).toLowerCase();
  } catch {
    hold("signature_verification_failed");
  }
  if (recovered !== intent.signer) {
    hold("signature_signer_mismatch", {
      expected: intent.signer,
      observed: recovered,
    });
  }

  return Object.freeze({
    marker:
      "VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_INTENT_VERIFICATION_V1",
    ok: true,
    status: "VERIFIED_REPLAY_CONSUMPTION_REQUIRED",
    chain_id: 2050,
    execution_epoch: 2,
    gateway_id:
      VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_GATEWAY_ID_V1,
    signer: intent.signer,
    nonce: intent.nonce,
    target: intent.target,
    gas_limit: intent.gas_limit,
    calldata_keccak256: intent.calldata_keccak256,
    typed_data_digest: digest,
    atomic_replay_digest_consume_required: true,
    runtime_route_active: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    migration_authorized: false,
    public_activation: false,
  });
}
