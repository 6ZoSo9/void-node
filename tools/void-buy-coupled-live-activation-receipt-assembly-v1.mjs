#!/usr/bin/env node
import crypto from "node:crypto";

import { getAddress, verifyTypedData } from "ethers";

import {
  VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1,
  VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1,
} from "../src/economic/buy_void_coupled_launch_gate_v1.mjs";
import {
  verifyBuyCoupledLiveActivationSigningRequestV1,
} from "./void-buy-coupled-live-activation-signing-request-v1.mjs";

export const VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_ASSEMBLY_V1 =
  "VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_ASSEMBLY_V1";

export const VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_ASSEMBLY_AUTHORITY_V1 =
  Object.freeze({
    source_only_assembly: true,
    private_key_access: false,
    credential_access: false,
    wallet_or_signer_access: false,
    signature_creation: false,
    signature_verification: true,
    filesystem_write: false,
    runtime_mutation: false,
    service_restart: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    chain2050_write: false,
    wc_ledger_write: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const SIGNATURE65 = /^0x[0-9a-fA-F]{130}$/u;

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
  fail("activation_receipt_assembly_noncanonical");
}

function sha256Bytes(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function verifyCoupledLiveActivationTypedDataSignaturesV1({
  typedData,
  activationSignature,
  sovereignSignature,
  expectedActivationSigner,
  expectedSovereignSigner,
}) {
  if (
    !typedData ||
    typeof typedData !== "object" ||
    Array.isArray(typedData) ||
    typedData.primary_type !== "CoupledPublicLaunchActivation" ||
    !SIGNATURE65.test(String(activationSignature || "")) ||
    !SIGNATURE65.test(String(sovereignSignature || ""))
  ) {
    fail("activation_receipt_signature_input_invalid");
  }

  let expectedController;
  let expectedSovereign;
  let recoveredController;
  let recoveredSovereign;
  try {
    expectedController = getAddress(expectedActivationSigner);
    expectedSovereign = getAddress(expectedSovereignSigner);
    recoveredController = getAddress(
      verifyTypedData(
        typedData.domain,
        typedData.types,
        typedData.value,
        activationSignature,
      ),
    );
    recoveredSovereign = getAddress(
      verifyTypedData(
        typedData.domain,
        typedData.types,
        typedData.value,
        sovereignSignature,
      ),
    );
  } catch {
    fail("activation_receipt_signature_verification_failed");
  }

  if (recoveredController !== expectedController) {
    fail("activation_controller_signature_mismatch");
  }
  if (recoveredSovereign !== expectedSovereign) {
    fail("activation_sovereign_signature_mismatch");
  }

  return Object.freeze({
    verified: true,
    activation_signer: recoveredController.toLowerCase(),
    sovereign_signer: recoveredSovereign.toLowerCase(),
  });
}

export function assembleBuyCoupledLiveActivationReceiptV1({
  signingRequest,
  activationSignature,
  sovereignSignature,
}) {
  verifyBuyCoupledLiveActivationSigningRequestV1(signingRequest);

  const verified = verifyCoupledLiveActivationTypedDataSignaturesV1({
    typedData: signingRequest.typed_data,
    activationSignature,
    sovereignSignature,
    expectedActivationSigner:
      VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1,
    expectedSovereignSigner:
      VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1,
  });

  const receipt = Object.freeze({
    ...signingRequest.unsigned_receipt,
    activation_signature: activationSignature,
    sovereign_signature: sovereignSignature,
  });
  const receiptBytes = Buffer.from(
    JSON.stringify(receipt, null, 2) + "\n",
    "utf8",
  );
  const receiptSha256 = sha256Bytes(receiptBytes);
  const operatorConfirmation =
    "activate-coupled-public-buy-v1:" +
    receipt.activation_generation +
    ":" +
    receipt.generation_tip_sha256 +
    ":" +
    receipt.activation_receipt_id +
    ":" +
    receiptSha256;

  const assemblyBody = Object.freeze({
    schema: "void.buy-void-coupled-live-activation-receipt-assembly.v1",
    signing_request_id: signingRequest.signing_request_id,
    typed_data_digest: signingRequest.typed_data_digest,
    activation_receipt_id: receipt.activation_receipt_id,
    activation_signer: verified.activation_signer,
    sovereign_signer: verified.sovereign_signer,
    receipt,
    receipt_bytes: receiptBytes.length,
    receipt_sha256: receiptSha256,
    operator_confirmation: operatorConfirmation,
    installation_boundary: Object.freeze({
      private_receipt_file_written: false,
      environment_binding_installed: false,
      generation_revalidated: false,
      external_high_water_revalidated: false,
      pending_publication_intent_checked: false,
      runtime_gate_revalidated: false,
    }),
    authority_boundary:
      VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_ASSEMBLY_AUTHORITY_V1,
    next_gate:
      "private_receipt_installation_then_exact_runtime_gate_revalidation",
  });

  return Object.freeze({
    marker: VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_ASSEMBLY_V1,
    version: 1,
    status:
      "HOLD_PENDING_PRIVATE_RECEIPT_INSTALLATION_AND_LIVE_REVALIDATION",
    assembly_id:
      "voidbclara1_" +
      sha256Bytes(Buffer.from(canonicalJson(assemblyBody), "utf8")),
    ...assemblyBody,
  });
}

export function verifyBuyCoupledLiveActivationReceiptAssemblyV1(assembly) {
  if (
    !assembly ||
    typeof assembly !== "object" ||
    Array.isArray(assembly) ||
    assembly.marker !== VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_ASSEMBLY_V1 ||
    assembly.version !== 1 ||
    assembly.status !==
      "HOLD_PENDING_PRIVATE_RECEIPT_INSTALLATION_AND_LIVE_REVALIDATION" ||
    !/^voidbclara1_[0-9a-f]{64}$/u.test(String(assembly.assembly_id || ""))
  ) {
    fail("activation_receipt_assembly_invalid");
  }

  const {
    marker: _marker,
    version: _version,
    status: _status,
    assembly_id: _assemblyId,
    ...assemblyBody
  } = assembly;
  const expectedId =
    "voidbclara1_" +
    sha256Bytes(Buffer.from(canonicalJson(assemblyBody), "utf8"));
  if (assembly.assembly_id !== expectedId) {
    fail("activation_receipt_assembly_id_mismatch");
  }

  const receiptBytes = Buffer.from(
    JSON.stringify(assembly.receipt, null, 2) + "\n",
    "utf8",
  );
  if (
    receiptBytes.length !== assembly.receipt_bytes ||
    sha256Bytes(receiptBytes) !== assembly.receipt_sha256 ||
    assembly.operator_confirmation !==
      "activate-coupled-public-buy-v1:" +
        assembly.receipt.activation_generation +
        ":" +
        assembly.receipt.generation_tip_sha256 +
        ":" +
        assembly.receipt.activation_receipt_id +
        ":" +
        assembly.receipt_sha256 ||
    assembly.authority_boundary?.private_key_access !== false ||
    assembly.authority_boundary?.signature_creation !== false ||
    assembly.authority_boundary?.runtime_mutation !== false ||
    assembly.authority_boundary?.funds_movement !== false
  ) {
    fail("activation_receipt_assembly_binding_invalid");
  }

  return Object.freeze({
    verified: true,
    assembly_id: assembly.assembly_id,
    activation_receipt_id: assembly.activation_receipt_id,
    receipt_sha256: assembly.receipt_sha256,
    operator_confirmation: assembly.operator_confirmation,
  });
}
