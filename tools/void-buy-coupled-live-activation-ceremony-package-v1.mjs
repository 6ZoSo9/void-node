#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs";
import process from "node:process";

import { verifyTypedData } from "ethers";

import {
  VOID_BUY_COUPLED_LAUNCH_ID_V1,
  VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1,
  VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_V1,
  VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1,
  buyLaunchLiveActivationReceiptIdV1,
  buyLaunchLiveActivationTypedDataV1,
  verifyBuyLaunchLiveActivationSignatureV1,
  verifyBuyLaunchLiveActivationSovereignSignatureV1,
} from "../src/economic/buy_void_coupled_launch_gate_v1.mjs";

export const VOID_BUY_COUPLED_LIVE_ACTIVATION_CEREMONY_PACKAGE_V1 =
  "VOID_BUY_COUPLED_LIVE_ACTIVATION_CEREMONY_PACKAGE_V1";
export const VOID_BUY_COUPLED_LIVE_ACTIVATION_CEREMONY_PACKAGE_SCHEMA_V1 =
  "void.buy-coupled-live-activation-ceremony-package.v1";
export const VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_ASSEMBLY_V1 =
  "VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_ASSEMBLY_V1";

export const VOID_BUY_COUPLED_LIVE_ACTIVATION_CEREMONY_AUTHORITY_V1 =
  Object.freeze({
    source_only_unsigned_package_creation: true,
    public_signature_assembly: true,
    fixed_production_signer_verification: true,
    filesystem_read: true,
    filesystem_write: false,
    wallet_access: false,
    private_key_access: false,
    signing: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    wc_ledger_write: false,
    inventory_funding: false,
    liquidity_movement: false,
    market_activation: false,
    public_presale_activation: false,
    public_buy_request_intake_activation: false,
    runtime_service_mutation: false,
    funds_movement: false,
  });

const BYTES32 = /^0x[0-9a-fA-F]{64}$/u;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const SIGNATURE = /^0x[0-9a-fA-F]{130}$/u;
const PACKAGE_ID = /^voidbcapkg1_[0-9a-f]{64}$/u;
const MAX_PACKAGE_BYTES = 128 * 1024;
const MAX_LEASE_MS = 5 * 60 * 1000;

function fail(code) {
  throw new Error(code);
}

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  if (typeof value === "bigint") return JSON.stringify(value.toString());
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (plain(value)) {
    return "{" + Object.keys(value).sort().map(
      (key) => JSON.stringify(key) + ":" + canonicalJson(value[key]),
    ).join(",") + "}";
  }
  fail("activation_ceremony_noncanonical_value");
}

function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function normalizeTypedDataJson(value) {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(normalizeTypedDataJson);
  if (plain(value)) {
    return Object.fromEntries(
      Object.keys(value).map(
        (key) => [key, normalizeTypedDataJson(value[key])],
      ),
    );
  }
  return value;
}

function packageId(body) {
  return "voidbcapkg1_" + sha256Hex(
    Buffer.from(canonicalJson(body), "utf8"),
  );
}

function validateLeaseTimes(activatedAtMs, expiresAtMs) {
  if (
    !Number.isSafeInteger(activatedAtMs) ||
    activatedAtMs <= 0 ||
    !Number.isSafeInteger(expiresAtMs) ||
    expiresAtMs <= activatedAtMs ||
    expiresAtMs - activatedAtMs > MAX_LEASE_MS
  ) {
    fail("activation_ceremony_lease_invalid");
  }
}

export function buildVoidBuyCoupledLiveActivationCeremonyPackageV1(input) {
  if (!plain(input)) fail("activation_ceremony_input_invalid");

  const sourceCompositionId = String(input.source_composition_id || "");
  const activationGeneration = String(input.activation_generation || "");
  const generationTipSha256 = String(input.generation_tip_sha256 || "");
  const activationNonce = String(input.activation_nonce || "");

  if (!SHA256_ID.test(sourceCompositionId)) {
    fail("activation_ceremony_source_composition_id_invalid");
  }
  if (!BYTES32.test(activationGeneration)) {
    fail("activation_ceremony_generation_invalid");
  }
  if (!SHA256_ID.test(generationTipSha256)) {
    fail("activation_ceremony_generation_tip_invalid");
  }
  if (!BYTES32.test(activationNonce)) {
    fail("activation_ceremony_nonce_invalid");
  }
  validateLeaseTimes(input.activated_at_ms, input.expires_at_ms);

  const receiptBody = Object.freeze({
    activated_at_ms: input.activated_at_ms,
    activation_generation: activationGeneration,
    activation_nonce: activationNonce,
    activation_signer: VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1,
    buy_void_private_runtime_active: true,
    coupled_launch_id: VOID_BUY_COUPLED_LAUNCH_ID_V1,
    expires_at_ms: input.expires_at_ms,
    generation_tip_sha256: generationTipSha256,
    marker: VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_V1,
    public_buy_request_intake_authorized: true,
    public_presale_active: true,
    runtime_or_launch_evidence: true,
    same_launch_ceremony: true,
    sovereign_signer: VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1,
    source_composition_id: sourceCompositionId,
    source_ready_only: false,
    status: "COUPLED_PUBLIC_LAUNCH_ACTIVE",
    version: 1,
    wc_void_market_active: true,
  });

  const activationReceiptId =
    buyLaunchLiveActivationReceiptIdV1(receiptBody);

  const unsignedReceipt = Object.freeze({
    ...receiptBody,
    activation_receipt_id: activationReceiptId,
  });

  const typedData = normalizeTypedDataJson(
    buyLaunchLiveActivationTypedDataV1(unsignedReceipt),
  );
  const typedDataSha256 = "sha256:" + sha256Hex(
    Buffer.from(canonicalJson(typedData), "utf8"),
  );

  const body = Object.freeze({
    schema: VOID_BUY_COUPLED_LIVE_ACTIVATION_CEREMONY_PACKAGE_SCHEMA_V1,
    marker: VOID_BUY_COUPLED_LIVE_ACTIVATION_CEREMONY_PACKAGE_V1,
    version: 1,
    coupled_launch_id: VOID_BUY_COUPLED_LAUNCH_ID_V1,
    source_composition_id: sourceCompositionId,
    activation_generation: activationGeneration,
    generation_tip_sha256: generationTipSha256,
    activated_at_ms: input.activated_at_ms,
    expires_at_ms: input.expires_at_ms,
    unsigned_receipt: unsignedReceipt,
    activation_signing_request: Object.freeze({
      role: "activation_signer",
      expected_signer: VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1,
      typed_data_sha256: typedDataSha256,
      typed_data: typedData,
    }),
    sovereign_signing_request: Object.freeze({
      role: "sovereign_signer",
      expected_signer: VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1,
      typed_data_sha256: typedDataSha256,
      typed_data: typedData,
    }),
    authority: VOID_BUY_COUPLED_LIVE_ACTIVATION_CEREMONY_AUTHORITY_V1,
  });

  return Object.freeze({
    ...body,
    package_id: packageId(body),
  });
}

export function validateVoidBuyCoupledLiveActivationCeremonyPackageV1(value) {
  if (
    !plain(value) ||
    value.schema !==
      VOID_BUY_COUPLED_LIVE_ACTIVATION_CEREMONY_PACKAGE_SCHEMA_V1 ||
    value.marker !== VOID_BUY_COUPLED_LIVE_ACTIVATION_CEREMONY_PACKAGE_V1 ||
    value.version !== 1 ||
    !PACKAGE_ID.test(String(value.package_id || ""))
  ) {
    fail("activation_ceremony_package_invalid");
  }

  const receipt = value.unsigned_receipt;
  if (!plain(receipt)) {
    fail("activation_ceremony_unsigned_receipt_invalid");
  }

  const rebuilt = buildVoidBuyCoupledLiveActivationCeremonyPackageV1({
    source_composition_id: value.source_composition_id,
    activation_generation: value.activation_generation,
    generation_tip_sha256: value.generation_tip_sha256,
    activation_nonce: receipt.activation_nonce,
    activated_at_ms: value.activated_at_ms,
    expires_at_ms: value.expires_at_ms,
  });

  if (canonicalJson(rebuilt) !== canonicalJson(value)) {
    fail("activation_ceremony_package_binding_mismatch");
  }
  return rebuilt;
}

export function verifyVoidBuyCoupledLiveActivationCeremonySignaturesV1(
  receipt,
  {
    activation_signer,
    sovereign_signer,
  },
) {
  if (!plain(receipt)) {
    fail("activation_ceremony_signed_receipt_invalid");
  }

  try {
    const typed = buyLaunchLiveActivationTypedDataV1(receipt);
    const activationRecovered = verifyTypedData(
      typed.domain,
      typed.types,
      typed.value,
      receipt.activation_signature,
    ).toLowerCase();
    const sovereignRecovered = verifyTypedData(
      typed.domain,
      typed.types,
      typed.value,
      receipt.sovereign_signature,
    ).toLowerCase();

    return Object.freeze({
      activation_verified:
        activationRecovered ===
          String(activation_signer || "").toLowerCase(),
      sovereign_verified:
        sovereignRecovered ===
          String(sovereign_signer || "").toLowerCase(),
      activation_recovered: activationRecovered,
      sovereign_recovered: sovereignRecovered,
    });
  } catch {
    return Object.freeze({
      activation_verified: false,
      sovereign_verified: false,
      activation_recovered: null,
      sovereign_recovered: null,
    });
  }
}

export function assembleVoidBuyCoupledLiveActivationReceiptCandidateV1({
  ceremony_package,
  activation_signature,
  sovereign_signature,
}) {
  const ceremonyPackage =
    validateVoidBuyCoupledLiveActivationCeremonyPackageV1(ceremony_package);

  if (!SIGNATURE.test(String(activation_signature || ""))) {
    fail("activation_ceremony_activation_signature_invalid");
  }
  if (!SIGNATURE.test(String(sovereign_signature || ""))) {
    fail("activation_ceremony_sovereign_signature_invalid");
  }

  const receipt = Object.freeze({
    ...ceremonyPackage.unsigned_receipt,
    activation_signature,
    sovereign_signature,
  });
  const receiptJson = JSON.stringify(receipt, null, 2) + "\n";
  const receiptSha256 = sha256Hex(Buffer.from(receiptJson, "utf8"));

  return Object.freeze({
    marker: VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_ASSEMBLY_V1,
    version: 1,
    package_id: ceremonyPackage.package_id,
    receipt,
    receipt_json: receiptJson,
    receipt_sha256: receiptSha256,
    activation_confirmation:
      "activate-coupled-public-buy-v1:" +
      receipt.activation_generation + ":" +
      receipt.generation_tip_sha256 + ":" +
      receipt.activation_receipt_id + ":" +
      receiptSha256,
    signatures_verified: false,
    activation_authority: false,
    runtime_activation_performed: false,
    funds_movement: false,
  });
}

export function finalizeVoidBuyCoupledLiveActivationReceiptV1(input) {
  const candidate =
    assembleVoidBuyCoupledLiveActivationReceiptCandidateV1(input);

  const activation = verifyBuyLaunchLiveActivationSignatureV1(
    candidate.receipt,
    VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1,
  );
  const sovereign = verifyBuyLaunchLiveActivationSovereignSignatureV1(
    candidate.receipt,
    VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1,
  );

  if (activation.verified !== true) {
    fail("activation_ceremony_activation_signature_mismatch");
  }
  if (sovereign.verified !== true) {
    fail("activation_ceremony_sovereign_signature_mismatch");
  }

  return Object.freeze({
    ...candidate,
    signatures_verified: true,
    activation_recovered_signer: activation.recovered_signer,
    sovereign_recovered_signer: sovereign.recovered_signer,
  });
}

function readJsonFileBounded(filePath) {
  if (!filePath) fail("activation_ceremony_package_file_required");
  const stat = fs.statSync(filePath);
  if (!stat.isFile() || stat.size < 2 || stat.size > MAX_PACKAGE_BYTES) {
    fail("activation_ceremony_package_file_size_invalid");
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function arg(name) {
  const at = process.argv.indexOf(name);
  return at >= 0 && at + 1 < process.argv.length
    ? String(process.argv[at + 1] || "").trim()
    : "";
}

function print(value) {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
}

if (
  process.argv[1] &&
  process.argv[1].endsWith(
    "void-buy-coupled-live-activation-ceremony-package-v1.mjs",
  )
) {
  const command = String(process.argv[2] || "");

  try {
    if (command === "--help" || command === "help" || command === "") {
      process.stdout.write([
        VOID_BUY_COUPLED_LIVE_ACTIVATION_CEREMONY_PACKAGE_V1,
        "wallet_access=false",
        "private_key_access=false",
        "signing=false",
        "runtime_activation=false",
        "",
        "prepare:",
        "  --source-composition-id sha256:<64hex>",
        "  --activation-generation 0x<64hex>",
        "  --generation-tip-sha256 sha256:<64hex>",
        "  --activation-nonce 0x<64hex>",
        "  --activated-at-ms <positive-safe-integer>",
        "  --expires-at-ms <positive-safe-integer>",
        "",
        "assemble:",
        "  --package <json-file>",
        "  --activation-signature 0x<130hex>",
        "  --sovereign-signature 0x<130hex>",
        "",
      ].join("\n"));
    } else if (command === "prepare") {
      print(buildVoidBuyCoupledLiveActivationCeremonyPackageV1({
        source_composition_id: arg("--source-composition-id"),
        activation_generation: arg("--activation-generation"),
        generation_tip_sha256: arg("--generation-tip-sha256"),
        activation_nonce: arg("--activation-nonce"),
        activated_at_ms: Number(arg("--activated-at-ms")),
        expires_at_ms: Number(arg("--expires-at-ms")),
      }));
    } else if (command === "assemble") {
      print(finalizeVoidBuyCoupledLiveActivationReceiptV1({
        ceremony_package: readJsonFileBounded(arg("--package")),
        activation_signature: arg("--activation-signature"),
        sovereign_signature: arg("--sovereign-signature"),
      }));
    } else {
      fail("activation_ceremony_command_invalid");
    }
  } catch (error) {
    process.stderr.write(
      "[fail] " + String(error?.message || error) + "\n",
    );
    process.exitCode = 2;
  }
}
