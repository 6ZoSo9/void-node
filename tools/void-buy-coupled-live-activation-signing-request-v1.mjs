#!/usr/bin/env node
import crypto from "node:crypto";

import { TypedDataEncoder } from "ethers";

import {
  VOID_BUY_COUPLED_LAUNCH_ID_V1,
  VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1,
  VOID_BUY_COUPLED_LIVE_ACTIVATION_DOMAIN_V1,
  VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_V1,
  VOID_BUY_COUPLED_LIVE_ACTIVATION_TYPES_V1,
  VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1,
  buyLaunchLiveActivationReceiptIdV1,
  buyLaunchLiveActivationTypedDataV1,
} from "../src/economic/buy_void_coupled_launch_gate_v1.mjs";

export const VOID_BUY_COUPLED_LIVE_ACTIVATION_SIGNING_REQUEST_V1 =
  "VOID_BUY_COUPLED_LIVE_ACTIVATION_SIGNING_REQUEST_V1";

export const VOID_BUY_COUPLED_LIVE_ACTIVATION_SIGNING_REQUEST_AUTHORITY_V1 =
  Object.freeze({
    source_only_request: true,
    private_key_access: false,
    credential_access: false,
    wallet_or_signer_access: false,
    signature_creation: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    chain2050_write: false,
    wc_ledger_write: false,
    runtime_mutation: false,
    service_restart: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const INPUT_KEYS = Object.freeze([
  "activated_at_ms",
  "activation_generation",
  "activation_nonce",
  "expires_at_ms",
  "generation_tip_sha256",
  "source_composition_id",
]);

const BYTES32 = /^0x[0-9a-fA-F]{64}$/u;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const RECEIPT_ID = /^voidbclive1_[0-9a-f]{64}$/u;
const MAX_LEASE_MS = 5 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 30 * 1000;

function fail(code) {
  throw new Error(code);
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
        .join(",") +
      "}"
    );
  }
  fail("activation_signing_request_noncanonical_value");
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function jsonSafe(value) {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, jsonSafe(item)]),
    );
  }
  return value;
}

function assertExactInput(input, nowMs) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    fail("activation_signing_request_input_invalid");
  }
  if (
    Object.keys(input).sort().join("\n") !==
    [...INPUT_KEYS].sort().join("\n")
  ) {
    fail("activation_signing_request_input_shape_invalid");
  }
  if (
    !Number.isSafeInteger(nowMs) ||
    nowMs <= 0 ||
    !Number.isSafeInteger(input.activated_at_ms) ||
    input.activated_at_ms <= 0 ||
    !Number.isSafeInteger(input.expires_at_ms) ||
    input.expires_at_ms <= input.activated_at_ms ||
    input.expires_at_ms - input.activated_at_ms > MAX_LEASE_MS ||
    input.activated_at_ms > nowMs + MAX_FUTURE_SKEW_MS ||
    input.expires_at_ms <= nowMs
  ) {
    fail("activation_signing_request_lease_invalid");
  }
  if (
    !BYTES32.test(String(input.activation_generation || "")) ||
    !BYTES32.test(String(input.activation_nonce || "")) ||
    !SHA256_ID.test(String(input.generation_tip_sha256 || "")) ||
    !SHA256_ID.test(String(input.source_composition_id || ""))
  ) {
    fail("activation_signing_request_identity_invalid");
  }
}

export function buildBuyCoupledLiveActivationSigningRequestV1(
  input,
  nowMs = Date.now(),
) {
  assertExactInput(input, nowMs);

  const receiptBody = Object.freeze({
    activated_at_ms: input.activated_at_ms,
    activation_generation: input.activation_generation,
    activation_nonce: input.activation_nonce,
    activation_signer:
      VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1,
    buy_void_private_runtime_active: true,
    coupled_launch_id: VOID_BUY_COUPLED_LAUNCH_ID_V1,
    expires_at_ms: input.expires_at_ms,
    generation_tip_sha256: input.generation_tip_sha256,
    marker: VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_V1,
    public_buy_request_intake_authorized: true,
    public_presale_active: true,
    runtime_or_launch_evidence: true,
    same_launch_ceremony: true,
    sovereign_signer:
      VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1,
    source_composition_id: input.source_composition_id,
    source_ready_only: false,
    status: "COUPLED_PUBLIC_LAUNCH_ACTIVE",
    version: 1,
    wc_void_market_active: true,
  });

  const activationReceiptId =
    buyLaunchLiveActivationReceiptIdV1(receiptBody);
  if (!RECEIPT_ID.test(activationReceiptId)) {
    fail("activation_signing_request_receipt_id_invalid");
  }

  const unsignedReceipt = Object.freeze({
    ...receiptBody,
    activation_receipt_id: activationReceiptId,
  });
  const typed = buyLaunchLiveActivationTypedDataV1(unsignedReceipt);
  const typedDataDigest = TypedDataEncoder.hash(
    typed.domain,
    typed.types,
    typed.value,
  ).toLowerCase();

  const requestBody = Object.freeze({
    schema: "void.buy-void-coupled-live-activation-signing-request.v1",
    prepared_at_ms: nowMs,
    activation_receipt_id: activationReceiptId,
    typed_data_digest: typedDataDigest,
    typed_data: Object.freeze({
      domain: jsonSafe(typed.domain),
      primary_type: "CoupledPublicLaunchActivation",
      types: jsonSafe(typed.types),
      value: jsonSafe(typed.value),
    }),
    unsigned_receipt: unsignedReceipt,
    required_signers: Object.freeze([
      Object.freeze({
        role: "launch_controller",
        signer_address:
          VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1,
        receipt_signature_field: "activation_signature",
      }),
      Object.freeze({
        role: "sovereign_cosigner",
        signer_address:
          VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1,
        receipt_signature_field: "sovereign_signature",
      }),
    ]),
    live_revalidation_boundary: Object.freeze({
      generation_current_verified: false,
      external_high_water_verified: false,
      no_pending_publication_intent_verified: false,
      source_ready_verified: false,
      receipt_custody_verified: false,
      final_runtime_gate_required: true,
    }),
    authority_boundary:
      VOID_BUY_COUPLED_LIVE_ACTIVATION_SIGNING_REQUEST_AUTHORITY_V1,
    next_gate:
      "dual_offline_signatures_then_content_addressed_receipt_assembly_and_live_gate_revalidation",
  });

  return Object.freeze({
    marker: VOID_BUY_COUPLED_LIVE_ACTIVATION_SIGNING_REQUEST_V1,
    version: 1,
    status:
      "HOLD_PENDING_DUAL_OFFLINE_SIGNATURES_AND_LIVE_REVALIDATION",
    signing_request_id:
      "voidbclasr1_" + sha256Text(canonicalJson(requestBody)),
    ...requestBody,
  });
}

export function verifyBuyCoupledLiveActivationSigningRequestV1(request) {
  if (
    !request ||
    typeof request !== "object" ||
    Array.isArray(request) ||
    request.marker !==
      VOID_BUY_COUPLED_LIVE_ACTIVATION_SIGNING_REQUEST_V1 ||
    request.version !== 1 ||
    request.status !==
      "HOLD_PENDING_DUAL_OFFLINE_SIGNATURES_AND_LIVE_REVALIDATION" ||
    !/^voidbclasr1_[0-9a-f]{64}$/u.test(
      String(request.signing_request_id || ""),
    )
  ) {
    fail("activation_signing_request_invalid");
  }

  const {
    marker: _marker,
    version: _version,
    status: _status,
    signing_request_id: _requestId,
    ...requestBody
  } = request;
  const expectedId =
    "voidbclasr1_" + sha256Text(canonicalJson(requestBody));
  if (request.signing_request_id !== expectedId) {
    fail("activation_signing_request_id_mismatch");
  }

  const typed = request.typed_data;
  if (
    typed?.primary_type !== "CoupledPublicLaunchActivation" ||
    TypedDataEncoder.hash(
      typed.domain,
      typed.types,
      typed.value,
    ).toLowerCase() !== request.typed_data_digest ||
    request.unsigned_receipt?.activation_receipt_id !==
      request.activation_receipt_id ||
    request.required_signers?.[0]?.signer_address !==
      VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1 ||
    request.required_signers?.[1]?.signer_address !==
      VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1 ||
    request.authority_boundary?.signature_creation !== false ||
    request.authority_boundary?.private_key_access !== false ||
    request.authority_boundary?.funds_movement !== false
  ) {
    fail("activation_signing_request_binding_invalid");
  }

  return Object.freeze({
    verified: true,
    signing_request_id: request.signing_request_id,
    activation_receipt_id: request.activation_receipt_id,
    typed_data_digest: request.typed_data_digest,
  });
}
