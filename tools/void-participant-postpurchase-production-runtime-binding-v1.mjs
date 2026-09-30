#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

import {
  importVoidParticipantPostpurchaseFinalityV1,
} from "./void-participant-postpurchase-finality-import-v1.mjs";

export const VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_BINDING_V1 =
  "VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_BINDING_V1";

export const VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_BINDING_AUTHORITY_V1 =
  Object.freeze({
    read_only_external_runtime_verification: true,
    finality_reimport_required: true,
    exact_public_origin_required: true,
    exact_public_read_status_required: true,
    exact_delivery_receipt_revalidation_required: true,
    exact_control_receipt_revalidation_required: true,
    filesystem_input_read: true,
    create_only_evidence_output: true,
    raw_public_rpc: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    wallet_access: false,
    private_key_access: false,
    credential_content_access: false,
    validator_mutation: false,
    token_movement: false,
    funds_movement: false,
    market_activation: false,
    public_presale_activation: false,
    coupled_candidate_update: false,
  });

export const VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_PUBLIC_ORIGIN_V1 =
  "https://seed.nullfeed.org";

const STATUS_PATH =
  "/public-node/economic/epoch2/read-status-v1.json";
const RECEIPT_PATH =
  "/public-node/economic/epoch2/receipt-v1";
const RUNTIME_MARKER =
  "VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_V1";
const CANONICAL_VOID_TOKEN =
  "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const EXPECTED_GENESIS_BLOCK_HASH =
  "0x8b522cd3dad5301f2d48c2fb1a750fca1e55dfcaa8bf699423bccdb5a061d01d";
const EXPECTED_GENESIS_STATE_ROOT =
  "0x7aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b2";
const MAX_INPUT_BYTES = 1024 * 1024;
const MAX_RESPONSE_BYTES = 256 * 1024;
const HASH = /^0x[0-9a-f]{64}$/u;
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const EVIDENCE_ID = /^sha256:[0-9a-f]{64}$/u;
const UINT = /^(0|[1-9][0-9]*)$/u;
const HEX_QUANTITY = /^0x(?:0|[1-9a-f][0-9a-f]*)$/u;
const SHA256 = /^[0-9a-f]{64}$/u;

function fail(code) {
  throw new Error(code);
}

function plain(value) {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value);
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
  if (plain(value)) {
    return (
      "{"
      + Object.keys(value)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key)
            + ":"
            + canonicalJson(value[key]),
        )
        .join(",")
      + "}"
    );
  }
  fail("PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_CANONICAL_VALUE_INVALID");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalHash(value, code) {
  if (typeof value !== "string") fail(code);
  const normalized = value.toLowerCase();
  if (!HASH.test(normalized)) fail(code);
  return normalized;
}

function canonicalAddress(value, code) {
  if (typeof value !== "string") fail(code);
  const normalized = value.toLowerCase();
  if (!ADDRESS.test(normalized)) fail(code);
  return normalized;
}

function decimalUint(value, code) {
  if (typeof value !== "string" || !UINT.test(value)) fail(code);
  return BigInt(value);
}

function hexQuantity(value, code) {
  if (typeof value !== "string") fail(code);
  const normalized = value.toLowerCase();
  if (!HEX_QUANTITY.test(normalized)) fail(code);
  return BigInt(normalized);
}

function canonicalInteger(value, name, minimum, maximum) {
  if (
    typeof value !== "string"
    || !/^(0|[1-9][0-9]*)$/u.test(value)
  ) {
    fail(name + "_invalid");
  }
  const parsed = Number(value);
  if (
    !Number.isSafeInteger(parsed)
    || parsed < minimum
    || parsed > maximum
  ) {
    fail(name + "_invalid");
  }
  return parsed;
}

function readJsonFile(file) {
  if (
    typeof file !== "string"
    || !path.isAbsolute(file)
  ) {
    fail("finality_input_path_must_be_absolute");
  }
  let canonical;
  try {
    canonical = fs.realpathSync.native(file);
  } catch (error) {
    fail(
      "finality_input_path_unavailable:"
      + String(error?.message || error),
    );
  }
  if (canonical !== file) {
    fail("finality_input_path_alias_forbidden");
  }
  const stat = fs.lstatSync(canonical, { bigint: true });
  if (!stat.isFile() || stat.isSymbolicLink()) {
    fail("finality_input_must_be_regular_file");
  }
  if (
    stat.size < 2n
    || stat.size > BigInt(MAX_INPUT_BYTES)
  ) {
    fail("finality_input_size_invalid");
  }
  const bytes = fs.readFileSync(canonical);
  const after = fs.lstatSync(canonical, { bigint: true });
  if (
    stat.dev !== after.dev
    || stat.ino !== after.ino
    || stat.size !== after.size
    || stat.mtimeNs !== after.mtimeNs
    || stat.ctimeNs !== after.ctimeNs
    || BigInt(bytes.length) !== stat.size
  ) {
    fail("finality_input_changed_during_read");
  }
  let text;
  try {
    text = new TextDecoder(
      "utf-8",
      { fatal: true },
    ).decode(bytes);
  } catch {
    fail("finality_input_utf8_invalid");
  }
  try {
    return JSON.parse(text);
  } catch {
    fail("finality_input_json_invalid");
  }
}

function canonicalOutputPath(file) {
  if (
    typeof file !== "string"
    || !path.isAbsolute(file)
    || path.resolve(file) !== file
  ) {
    fail("output_path_must_be_absolute_canonical");
  }
  const parent = path.dirname(file);
  const realParent = fs.realpathSync.native(parent);
  if (realParent !== parent) {
    fail("output_parent_alias_forbidden");
  }
  try {
    fs.lstatSync(file);
    fail("output_already_exists");
  } catch (error) {
    if (error?.message === "output_already_exists") {
      throw error;
    }
    if (error?.code !== "ENOENT") throw error;
  }
  return file;
}

function writePrivateJson(file, value) {
  const fd = fs.openSync(
    file,
    fs.constants.O_WRONLY
      | fs.constants.O_CREAT
      | fs.constants.O_EXCL
      | Number(fs.constants.O_NOFOLLOW || 0),
    0o600,
  );
  try {
    const bytes = Buffer.from(
      JSON.stringify(value, null, 2) + "\n",
      "utf8",
    );
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
    fs.fchmodSync(fd, 0o600);
    return Object.freeze({
      bytes: bytes.length,
      sha256: sha256(bytes),
    });
  } finally {
    fs.closeSync(fd);
  }
}

function exactPublicUrl(pathname) {
  const url = new URL(
    pathname,
    VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_PUBLIC_ORIGIN_V1,
  );
  if (
    url.origin
      !== VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_PUBLIC_ORIGIN_V1
    || url.protocol !== "https:"
    || url.hostname !== "seed.nullfeed.org"
    || url.port
    || url.username
    || url.password
    || url.hash
  ) {
    fail("production_public_read_url_invalid");
  }
  return url;
}

function runtimeBoundary(body, code) {
  if (
    body?.production_successor_rpc_endpoint_selected !== true
    || body?.exact_production_genesis_read_replica !== true
    || body?.p2p_enabled !== false
    || body?.discovery_enabled !== false
    || body?.raw_public_rpc_allowed !== false
    || body?.transaction_construction !== false
    || body?.transaction_signing !== false
    || body?.transaction_submission !== false
    || body?.transaction_broadcast !== false
    || body?.authoritative_chain2050_write !== false
    || body?.wallet_access !== false
    || body?.private_key_access !== false
    || body?.credential_content_access !== false
    || body?.validator_mutation !== false
    || body?.token_movement !== false
    || body?.funds_movement !== false
    || body?.migration_authorized !== false
    || body?.public_activation_authorized !== false
  ) {
    fail(code);
  }
}

function validateTransportResult(result, expectedUrl, code) {
  if (
    !plain(result)
    || result.url !== expectedUrl
    || result.http_status !== 200
    || !plain(result.body)
    || typeof result.artifact_sha256 !== "string"
    || !SHA256.test(result.artifact_sha256)
  ) {
    fail(code);
  }
  return result.body;
}

function validateStatus(result) {
  const expectedUrl = exactPublicUrl(
    STATUS_PATH,
  ).href;
  const body = validateTransportResult(
    result,
    expectedUrl,
    "PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_STATUS_TRANSPORT_INVALID",
  );
  if (
    body.ok !== true
    || body.marker !== RUNTIME_MARKER
    || body.status !== "INACTIVE_SUCCESSOR_PUBLIC_READ_RUNTIME_READY"
    || body.chain_id !== 2050
    || body.execution_epoch !== 2
    || String(body.block_number || "").toLowerCase() !== "0x0"
    || canonicalHash(
      body.block_hash,
      "PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_STATUS_BLOCK_HASH_INVALID",
    ) !== EXPECTED_GENESIS_BLOCK_HASH
    || canonicalHash(
      body.state_root,
      "PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_STATUS_STATE_ROOT_INVALID",
    ) !== EXPECTED_GENESIS_STATE_ROOT
    || !Array.isArray(body.query_kinds)
    || body.query_kinds.length !== 3
    || body.query_kinds[0] !== "balance"
    || body.query_kinds[1] !== "code"
    || body.query_kinds[2] !== "receipt"
    || body.live_receipt_lookup_transport_verified !== true
    || body.successful_receipt_semantics_source_proven !== true
    || body.live_balance_receipt_code_gateway_ready !== true
    || body.runtime_route_active !== true
    || body.public_gateway_active !== false
  ) {
    fail("PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_STATUS_IDENTITY_INVALID");
  }
  runtimeBoundary(
    body,
    "PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_STATUS_AUTHORITY_INVALID",
  );
  return Object.freeze({
    url: result.url,
    artifact_sha256: result.artifact_sha256,
    status: String(body.status || ""),
    chain_id: 2050,
    execution_epoch: 2,
    genesis_block_hash: EXPECTED_GENESIS_BLOCK_HASH,
    genesis_state_root: EXPECTED_GENESIS_STATE_ROOT,
  });
}

function receiptPath(transactionHash) {
  return (
    RECEIPT_PATH
    + "?tx="
    + transactionHash
  );
}

function validateReceipt(
  result,
  {
    transactionHash,
    blockNumber,
    blockHash,
    receiptFrom,
    receiptTo,
    label,
  },
) {
  const expectedUrl = exactPublicUrl(
    receiptPath(transactionHash),
  ).href;
  const body = validateTransportResult(
    result,
    expectedUrl,
    "PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_"
      + label
      + "_TRANSPORT_INVALID",
  );
  if (
    body.ok !== true
    || body.marker !== RUNTIME_MARKER
    || body.status !== "LIVE_SUCCESSOR_RECEIPT_VERIFIED"
    || body.receipt_found !== true
    || canonicalHash(
      body.transaction_hash,
      "PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_"
        + label
        + "_TRANSACTION_HASH_INVALID",
    ) !== transactionHash
    || hexQuantity(
      body.block_number,
      "PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_"
        + label
        + "_BLOCK_NUMBER_INVALID",
    ) !== blockNumber
    || canonicalHash(
      body.block_hash,
      "PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_"
        + label
        + "_BLOCK_HASH_INVALID",
    ) !== blockHash
    || !HASH.test(String(body.state_root || "").toLowerCase())
    || String(body.receipt_status || "").toLowerCase() !== "0x1"
    || canonicalAddress(
      body.receipt_from,
      "PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_"
        + label
        + "_FROM_INVALID",
    ) !== receiptFrom
    || canonicalAddress(
      body.receipt_to,
      "PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_"
        + label
        + "_TO_INVALID",
    ) !== receiptTo
    || typeof body.source_evidence_id !== "string"
    || !EVIDENCE_ID.test(body.source_evidence_id)
    || body.exact_receipt_identity_revalidated !== true
    || body.exact_block_identity_revalidated !== true
    || body.live_receipt_lookup_transport_verified !== true
    || body.successful_receipt_semantics_source_proven !== true
    || body.live_balance_receipt_code_gateway_ready !== true
    || body.runtime_route_active !== true
    || body.public_gateway_active !== false
  ) {
    fail(
      "PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_"
      + label
      + "_RECEIPT_IDENTITY_INVALID",
    );
  }
  runtimeBoundary(
    body,
    "PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_"
      + label
      + "_AUTHORITY_INVALID",
  );

  const normalizedStateRoot = canonicalHash(
    body.state_root,
    "PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_"
      + label
      + "_STATE_ROOT_INVALID",
  );
  const normalizedFrom = canonicalAddress(
    body.receipt_from,
    "PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_"
      + label
      + "_FROM_INVALID",
  );
  const normalizedTo = canonicalAddress(
    body.receipt_to,
    "PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_"
      + label
      + "_TO_INVALID",
  );
  const sourceEvidenceMaterial = Object.freeze({
    query_kind: "receipt",
    chain_id: 2050,
    execution_epoch: 2,
    block_number: String(body.block_number).toLowerCase(),
    block_hash: blockHash,
    state_root: normalizedStateRoot,
    transaction_hash: transactionHash,
    receipt_status: "0x1",
    receipt_from: normalizedFrom,
    receipt_to: normalizedTo,
  });
  const expectedSourceEvidenceId =
    "sha256:"
    + sha256(
      Buffer.from(
        canonicalJson(sourceEvidenceMaterial),
        "utf8",
      ),
    );
  if (body.source_evidence_id !== expectedSourceEvidenceId) {
    fail(
      "PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_"
      + label
      + "_SOURCE_EVIDENCE_ID_MISMATCH",
    );
  }

  return Object.freeze({
    url: result.url,
    artifact_sha256: result.artifact_sha256,
    source_evidence_id: body.source_evidence_id,
    transaction_hash: transactionHash,
    block_number: blockNumber.toString(),
    block_hash: blockHash,
    state_root: normalizedStateRoot,
    receipt_status: "0x1",
    receipt_from: normalizedFrom,
    receipt_to: normalizedTo,
    exact_receipt_identity_revalidated: true,
    exact_block_identity_revalidated: true,
  });
}

export function buildVoidParticipantPostpurchaseProductionRuntimeBindingV1({
  finalityInput,
  statusResult,
  deliveryReceiptResult,
  controlReceiptResult,
} = {}) {
  const imported =
    importVoidParticipantPostpurchaseFinalityV1(
      finalityInput,
    );

  if (
    imported?.participant_control_finality_evidence_imported !== true
    || imported?.participant_post_purchase_voidtoken_control_ready !== false
    || imported?.production_runtime_binding_required !== true
    || imported?.coupled_candidate_updated !== false
  ) {
    fail("PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_IMPORT_STATE_INVALID");
  }

  const status = validateStatus(statusResult);
  const delivery = validateReceipt(
    deliveryReceiptResult,
    {
      transactionHash: canonicalHash(
        imported.delivery_transaction_hash,
        "PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_DELIVERY_IMPORT_HASH_INVALID",
      ),
      blockNumber: decimalUint(
        imported.delivery_receipt_block_number,
        "PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_DELIVERY_IMPORT_BLOCK_INVALID",
      ),
      blockHash: canonicalHash(
        imported.delivery_receipt_block_hash,
        "PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_DELIVERY_IMPORT_BLOCK_HASH_INVALID",
      ),
      receiptFrom: canonicalAddress(
        imported.delivery_fulfillment_wallet,
        "PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_DELIVERY_FULFILLMENT_INVALID",
      ),
      receiptTo: CANONICAL_VOID_TOKEN,
      label: "DELIVERY",
    },
  );
  const control = validateReceipt(
    controlReceiptResult,
    {
      transactionHash: canonicalHash(
        imported.control_transaction_hash,
        "PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_CONTROL_IMPORT_HASH_INVALID",
      ),
      blockNumber: decimalUint(
        imported.control_receipt_block_number,
        "PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_CONTROL_IMPORT_BLOCK_INVALID",
      ),
      blockHash: canonicalHash(
        imported.control_receipt_block_hash,
        "PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_CONTROL_IMPORT_BLOCK_HASH_INVALID",
      ),
      receiptFrom: canonicalAddress(
        imported.participant_address,
        "PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_CONTROL_PARTICIPANT_INVALID",
      ),
      receiptTo: CANONICAL_VOID_TOKEN,
      label: "CONTROL",
    },
  );

  if (
    BigInt(control.block_number)
      < BigInt(delivery.block_number)
  ) {
    fail(
      "PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_CONTROL_BEFORE_DELIVERY",
    );
  }

  const identity = Object.freeze({
    finality_import_id: imported.import_id,
    finality_binding_id: imported.binding_id,
    source_finality_evidence_id:
      imported.source_evidence_id,
    public_origin:
      VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_PUBLIC_ORIGIN_V1,
    chain_id: 2050,
    execution_epoch: 2,
    status_artifact_sha256:
      status.artifact_sha256,
    delivery_artifact_sha256:
      delivery.artifact_sha256,
    control_artifact_sha256:
      control.artifact_sha256,
    delivery_source_evidence_id:
      delivery.source_evidence_id,
    control_source_evidence_id:
      control.source_evidence_id,
    delivery_transaction_hash:
      delivery.transaction_hash,
    delivery_receipt_block_number:
      delivery.block_number,
    delivery_receipt_block_hash:
      delivery.block_hash,
    control_transaction_hash:
      control.transaction_hash,
    control_receipt_block_number:
      control.block_number,
    control_receipt_block_hash:
      control.block_hash,
  });
  const runtimeBindingId =
    "voidpprtb1_"
    + sha256(
      Buffer.from(
        canonicalJson(identity),
        "utf8",
      ),
    );

  return Object.freeze({
    marker:
      VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_BINDING_V1,
    version: 1,
    status:
      "PRODUCTION_RUNTIME_FINALITY_BINDING_VERIFIED_SOURCE_PROMOTION_HOLD",
    runtime_binding_id: runtimeBindingId,
    finality: Object.freeze({
      import_id: imported.import_id,
      binding_id: imported.binding_id,
      source_evidence_id:
        imported.source_evidence_id,
      participant_address:
        imported.participant_address,
      delivered_token_amount_atoms:
        imported.delivered_token_amount_atoms,
      control_transfer_recipient:
        imported.control_transfer_recipient,
      control_transfer_amount_atoms:
        imported.control_transfer_amount_atoms,
      observed_delivery_confirmation_count:
        imported.observed_delivery_confirmation_count,
      observed_control_confirmation_count:
        imported.observed_control_confirmation_count,
    }),
    runtime: Object.freeze({
      public_origin:
        VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_PUBLIC_ORIGIN_V1,
      chain_id: 2050,
      execution_epoch: 2,
      status,
      delivery,
      control,
      external_public_receipt_route_verified: true,
      raw_public_rpc_used: false,
    }),
    production_runtime_binding_verified: true,
    participant_control_finality_evidence_imported: true,
    participant_postpurchase_voidtoken_control_runtime_binding_source_ready:
      true,
    participant_post_purchase_voidtoken_control_ready: false,
    coupled_candidate_updated: false,
    candidate_promotion_required: true,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
    authority:
      VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_BINDING_AUTHORITY_V1,
  });
}

export async function collectVoidParticipantPostpurchaseProductionRuntimeBindingV1({
  finalityInput,
  fetchJson,
} = {}) {
  if (typeof fetchJson !== "function") {
    fail("production_runtime_fetcher_required");
  }

  const imported =
    importVoidParticipantPostpurchaseFinalityV1(
      finalityInput,
    );
  const deliveryHash = canonicalHash(
    imported.delivery_transaction_hash,
    "PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_DELIVERY_IMPORT_HASH_INVALID",
  );
  const controlHash = canonicalHash(
    imported.control_transaction_hash,
    "PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_CONTROL_IMPORT_HASH_INVALID",
  );

  const statusResult = await fetchJson(
    STATUS_PATH,
  );
  const [
    deliveryReceiptResult,
    controlReceiptResult,
  ] = await Promise.all([
    fetchJson(receiptPath(deliveryHash)),
    fetchJson(receiptPath(controlHash)),
  ]);

  return buildVoidParticipantPostpurchaseProductionRuntimeBindingV1({
    finalityInput,
    statusResult,
    deliveryReceiptResult,
    controlReceiptResult,
  });
}

function fetchProductionJsonV1(
  pathname,
  {
    connectTimeoutMs,
    inactivityTimeoutMs,
    totalTimeoutMs,
  },
) {
  const url = exactPublicUrl(pathname);

  return new Promise((resolve, reject) => {
    let settled = false;
    let connectTimer = null;
    let totalTimer = null;

    const settle = (error, value) => {
      if (settled) return;
      settled = true;
      if (connectTimer) clearTimeout(connectTimer);
      if (totalTimer) clearTimeout(totalTimer);
      if (error) reject(error);
      else resolve(value);
    };

    const request = https.request(
      {
        protocol: "https:",
        hostname: "seed.nullfeed.org",
        port: 443,
        path: url.pathname + url.search,
        method: "GET",
        agent: false,
        headers: {
          accept: "application/json",
          "user-agent":
            "void-participant-postpurchase-production-runtime-binding-v1",
        },
      },
      (response) => {
        if (connectTimer) {
          clearTimeout(connectTimer);
          connectTimer = null;
        }

        const declared = String(
          response.headers["content-length"] || "",
        ).trim();
        if (declared) {
          if (!/^(0|[1-9][0-9]*)$/u.test(declared)) {
            response.destroy();
            settle(
              new Error(
                "production_runtime_content_length_invalid",
              ),
            );
            return;
          }
          if (
            BigInt(declared)
              > BigInt(MAX_RESPONSE_BYTES)
          ) {
            response.destroy();
            settle(
              new Error(
                "production_runtime_response_above_bound",
              ),
            );
            return;
          }
        }

        const chunks = [];
        let total = 0;

        response.on("data", (chunk) => {
          const value = Buffer.isBuffer(chunk)
            ? chunk
            : Buffer.from(chunk);
          total += value.length;
          if (total > MAX_RESPONSE_BYTES) {
            response.destroy();
            settle(
              new Error(
                "production_runtime_response_above_bound",
              ),
            );
            return;
          }
          chunks.push(value);
        });
        response.on("aborted", () => {
          settle(
            new Error(
              "production_runtime_response_aborted",
            ),
          );
        });
        response.on("close", () => {
          if (!response.complete) {
            settle(
              new Error(
                "production_runtime_response_incomplete",
              ),
            );
          }
        });
        response.on("error", (error) => {
          settle(error);
        });
        response.on("end", () => {
          if (!response.complete) {
            settle(
              new Error(
                "production_runtime_response_incomplete",
              ),
            );
            return;
          }
          if (
            declared
            && BigInt(declared) !== BigInt(total)
          ) {
            settle(
              new Error(
                "production_runtime_content_length_mismatch",
              ),
            );
            return;
          }

          const bytes = Buffer.concat(
            chunks,
            total,
          );
          let text;
          try {
            text = new TextDecoder(
              "utf-8",
              { fatal: true },
            ).decode(bytes);
          } catch {
            settle(
              new Error(
                "production_runtime_response_utf8_invalid",
              ),
            );
            return;
          }

          let body;
          try {
            body = JSON.parse(text);
          } catch {
            settle(
              new Error(
                "production_runtime_response_json_invalid",
              ),
            );
            return;
          }

          settle(
            null,
            Object.freeze({
              url: url.href,
              http_status:
                Number(response.statusCode || 0),
              body,
              artifact_sha256: sha256(bytes),
            }),
          );
        });
      },
    );

    totalTimer = setTimeout(
      () => request.destroy(
        new Error(
          "production_runtime_total_timeout",
        ),
      ),
      totalTimeoutMs,
    );

    request.once("socket", (socket) => {
      const connected = () => {
        if (connectTimer) {
          clearTimeout(connectTimer);
          connectTimer = null;
        }
      };
      if (socket.connecting) {
        connectTimer = setTimeout(
          () => request.destroy(
            new Error(
              "production_runtime_connect_timeout",
            ),
          ),
          connectTimeoutMs,
        );
        socket.once("secureConnect", connected);
      } else {
        connected();
      }
    });

    request.setTimeout(
      inactivityTimeoutMs,
      () => request.destroy(
        new Error(
          "production_runtime_inactivity_timeout",
        ),
      ),
    );
    request.on("error", (error) => {
      settle(error);
    });
    request.end();
  });
}

function parseCli(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      "finality-input": { type: "string" },
      output: { type: "string" },
      "connect-timeout-ms": {
        type: "string",
        default: "5000",
      },
      "inactivity-timeout-ms": {
        type: "string",
        default: "5000",
      },
      "total-timeout-ms": {
        type: "string",
        default: "15000",
      },
      help: {
        type: "boolean",
        short: "h",
        default: false,
      },
    },
    strict: true,
    allowPositionals: true,
  });
  return {
    command: positionals[0] || "",
    values,
  };
}

function usage() {
  console.log(
    "usage: node tools/void-participant-postpurchase-production-runtime-binding-v1.mjs collect "
      + "--finality-input /absolute/finality-input.json "
      + "--output /absolute/runtime-binding.json "
      + "[--connect-timeout-ms 5000] "
      + "[--inactivity-timeout-ms 5000] "
      + "[--total-timeout-ms 15000]",
  );
}

const direct =
  process.argv[1]
  && import.meta.url
    === pathToFileURL(
      process.argv[1],
    ).href;

if (direct) {
  try {
    const { command, values } =
      parseCli(
        process.argv.slice(2),
      );

    if (
      values.help
      || command === "help"
      || command === "--help"
      || command === "-h"
    ) {
      usage();
    } else if (command === "collect") {
      if (
        !values["finality-input"]
        || !values.output
      ) {
        fail(
          "collect_requires_finality_input_and_output",
        );
      }

      const finalityInput = readJsonFile(
        values["finality-input"],
      );
      const output = canonicalOutputPath(
        values.output,
      );
      const connectTimeoutMs =
        canonicalInteger(
          values["connect-timeout-ms"],
          "connect_timeout_ms",
          250,
          30_000,
        );
      const inactivityTimeoutMs =
        canonicalInteger(
          values["inactivity-timeout-ms"],
          "inactivity_timeout_ms",
          250,
          30_000,
        );
      const totalTimeoutMs =
        canonicalInteger(
          values["total-timeout-ms"],
          "total_timeout_ms",
          Math.max(
            connectTimeoutMs,
            inactivityTimeoutMs,
          ),
          120_000,
        );

      const evidence =
        await collectVoidParticipantPostpurchaseProductionRuntimeBindingV1({
          finalityInput,
          fetchJson: (pathname) =>
            fetchProductionJsonV1(
              pathname,
              {
                connectTimeoutMs,
                inactivityTimeoutMs,
                totalTimeoutMs,
              },
            ),
        });

      const written = writePrivateJson(
        output,
        evidence,
      );
      console.log(
        VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_BINDING_V1,
      );
      console.log(
        "status=" + evidence.status,
      );
      console.log(
        "runtime_binding_id="
        + evidence.runtime_binding_id,
      );
      console.log(
        "finality_import_id="
        + evidence.finality.import_id,
      );
      console.log(
        "public_origin="
        + evidence.runtime.public_origin,
      );
      console.log(
        "production_runtime_binding_verified=true",
      );
      console.log(
        "participant_postpurchase_voidtoken_control_runtime_binding_source_ready=true",
      );
      console.log(
        "participant_post_purchase_voidtoken_control_ready=false",
      );
      console.log(
        "candidate_promotion_required=true",
      );
      console.log(
        "raw_public_rpc_used=false",
      );
      console.log(
        "transaction_submission=false",
      );
      console.log(
        "funds_movement=false",
      );
      console.log(
        "artifact_sha256="
        + written.sha256,
      );
    } else {
      usage();
      fail("unknown_command");
    }
  } catch (error) {
    console.error(
      "VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_BINDING_V1_HOLD",
    );
    console.error(
      error instanceof Error
        ? error.message
        : String(error),
    );
    process.exitCode = 1;
  }
}
