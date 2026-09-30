#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  verifyVoidParticipantPostpurchaseFinalityV1,
} from "./void-participant-postpurchase-finality-v1.mjs";
import {
  importVoidParticipantPostpurchaseFinalityV1,
} from "./void-participant-postpurchase-finality-import-v1.mjs";

export const VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_FINALITY_V1 =
  "VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_FINALITY_V1";
export const VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_TARGET_V1 =
  "VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_TARGET_V1";

export const VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_FINALITY_AUTHORITY_V1 =
  Object.freeze({
    source_validation: true,
    read_only_rpc: true,
    built_in_loopback_transport: true,
    filesystem_read: true,
    create_only_receipt_write: true,
    credential_access: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    token_movement: false,
    funds_movement: false,
    market_activation: false,
    public_presale_activation: false,
  });

const CANONICAL_TARGET_PATH =
  "ops/mainnet0/participant-postpurchase-production-runtime-target-v1.json";
const HOSTNAME = "zoso-Precision-Tower-7810";
const NETWORK_IDENTITY = "mainnet0";
const SHA256 = /^[0-9a-f]{64}$/u;
const ID = /^voidppprf1_[0-9a-f]{64}$/u;
const TARGET_ID = /^voidppprt1_[0-9a-f]{64}$/u;
const ALLOWED_RPC_METHODS = new Set([
  "eth_chainId",
  "eth_getTransactionReceipt",
  "eth_blockNumber",
]);

const TARGET_KEYS = Object.freeze([
  "marker",
  "version",
  "status",
  "chain_id",
  "execution_epoch",
  "network_identity",
  "hostname",
  "rpc_url",
  "rpc_url_fingerprint_sha256",
  "production_rpc_target_selected",
  "runtime_active_verified",
  "exact_genesis_bound",
  "production_validator_set_bound",
  "migration_authorized",
  "public_presale_activation_authorized",
  "authority",
]);
const TARGET_AUTHORITY_KEYS = Object.freeze([
  "source_only",
  "rpc_call",
  "filesystem_secret_read",
  "credential_access",
  "wallet_access",
  "private_key_access",
  "transaction_construction",
  "transaction_signing",
  "transaction_submission",
  "transaction_broadcast",
  "chain2050_mutation",
  "token_movement",
  "funds_movement",
  "market_activation",
  "public_presale_activation",
]);

function fail(code) {
  throw new Error(code);
}

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactObject(value, keys, code) {
  if (!plain(value)) fail(code);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Reflect.ownKeys(descriptors);
  if (actual.some((key) => typeof key !== "string")) fail(code);
  const sorted = actual.sort();
  const expected = [...keys].sort();
  if (
    sorted.length !== expected.length ||
    sorted.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
  const out = Object.create(null);
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail(code);
    }
    out[key] = descriptor.value;
  }
  return Object.freeze(out);
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (plain(value)) {
    const keys = Object.keys(value).sort();
    return "{" + keys.map((key) =>
      JSON.stringify(key) + ":" + canonicalJson(value[key])
    ).join(",") + "}";
  }
  fail("PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_CANONICAL_VALUE_INVALID");
}

function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex");
}

function validateTargetAuthority(raw) {
  const authority = exactObject(
    raw,
    TARGET_AUTHORITY_KEYS,
    "PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_TARGET_AUTHORITY_SHAPE_INVALID",
  );
  for (const key of TARGET_AUTHORITY_KEYS) {
    const expected = key === "source_only";
    if (authority[key] !== expected) {
      fail("PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_TARGET_AUTHORITY_MISMATCH");
    }
  }
}

function normalizeLoopbackRpcUrl(value) {
  if (typeof value !== "string") {
    fail("PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_RPC_URL_INVALID");
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    fail("PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_RPC_URL_INVALID");
  }
  const port = Number(url.port);
  if (
    url.protocol !== "http:" ||
    url.hostname !== "127.0.0.1" ||
    !Number.isInteger(port) ||
    port < 1024 ||
    port > 65535 ||
    url.pathname !== "/" ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    fail("PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_RPC_URL_INVALID");
  }
  return url.href;
}

export function validateVoidParticipantPostpurchaseProductionRuntimeTargetV1(
  raw,
  { requireActive = true } = {},
) {
  const target = exactObject(
    raw,
    TARGET_KEYS,
    "PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_TARGET_SHAPE_INVALID",
  );
  validateTargetAuthority(target.authority);
  if (
    target.marker !== VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_TARGET_V1 ||
    target.version !== 1 ||
    target.chain_id !== 2050 ||
    target.execution_epoch !== 2 ||
    target.network_identity !== NETWORK_IDENTITY ||
    target.hostname !== HOSTNAME ||
    target.public_presale_activation_authorized !== false
  ) {
    fail("PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_TARGET_IDENTITY_MISMATCH");
  }

  if (!requireActive) {
    if (
      target.status !== "HOLD_PRODUCTION_EPOCH2_RPC_TARGET_NOT_SELECTED" ||
      target.rpc_url !== null ||
      target.rpc_url_fingerprint_sha256 !== null ||
      target.production_rpc_target_selected !== false ||
      target.runtime_active_verified !== false ||
      target.exact_genesis_bound !== false ||
      target.production_validator_set_bound !== false ||
      target.migration_authorized !== false
    ) {
      fail("PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_HOLD_TARGET_INVALID");
    }
    return Object.freeze({ ...target, target_id: null });
  }

  if (
    target.status !== "PRODUCTION_EPOCH2_RPC_TARGET_SELECTED" ||
    target.production_rpc_target_selected !== true ||
    target.runtime_active_verified !== true ||
    target.exact_genesis_bound !== true ||
    target.production_validator_set_bound !== true ||
    target.migration_authorized !== true
  ) {
    fail("PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_TARGET_NOT_READY");
  }

  const rpcUrl = normalizeLoopbackRpcUrl(target.rpc_url);
  const fingerprint = sha256Text(rpcUrl);
  if (
    typeof target.rpc_url_fingerprint_sha256 !== "string" ||
    !SHA256.test(target.rpc_url_fingerprint_sha256) ||
    target.rpc_url_fingerprint_sha256 !== fingerprint
  ) {
    fail("PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_RPC_FINGERPRINT_MISMATCH");
  }

  const normalized = Object.freeze({ ...target, rpc_url: rpcUrl });
  const targetId = "voidppprt1_" + sha256Text(canonicalJson(normalized));
  if (!TARGET_ID.test(targetId)) {
    fail("PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_TARGET_ID_INVALID");
  }
  return Object.freeze({ ...normalized, target_id: targetId });
}

function createTransport({ rpcUrl, fetchImpl, requestTimeoutMs }) {
  if (typeof fetchImpl !== "function") {
    fail("PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_FETCH_REQUIRED");
  }
  if (
    !Number.isSafeInteger(requestTimeoutMs) ||
    requestTimeoutMs < 100 ||
    requestTimeoutMs > 30_000
  ) {
    fail("PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_TIMEOUT_INVALID");
  }
  let requestId = 0;
  return async ({ method, params }) => {
    if (!ALLOWED_RPC_METHODS.has(method)) {
      fail("PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_RPC_METHOD_FORBIDDEN");
    }
    requestId += 1;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      const response = await fetchImpl(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: requestId, method, params }),
        redirect: "error",
        signal: controller.signal,
      });
      if (!response || response.ok !== true) {
        fail("PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_RPC_HTTP_FAILURE");
      }
      let body;
      try {
        body = await response.json();
      } catch {
        fail("PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_RPC_JSON_INVALID");
      }
      if (
        !plain(body) ||
        body.jsonrpc !== "2.0" ||
        body.id !== requestId ||
        Object.hasOwn(body, "error") ||
        !Object.hasOwn(body, "result")
      ) {
        fail("PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_RPC_RESPONSE_INVALID");
      }
      return body.result;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_")
      ) {
        throw error;
      }
      fail("PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_RPC_CALL_FAILED");
    } finally {
      clearTimeout(timer);
    }
  };
}

export async function verifyVoidParticipantPostpurchaseProductionRuntimeFinalityV1({
  submission,
  expected,
  min_confirmations,
  runtime_target,
  fetch_impl = globalThis.fetch,
  request_timeout_ms = 5_000,
}) {
  const target =
    validateVoidParticipantPostpurchaseProductionRuntimeTargetV1(runtime_target);
  const evidence = await verifyVoidParticipantPostpurchaseFinalityV1({
    submission,
    min_confirmations,
    transport: createTransport({
      rpcUrl: target.rpc_url,
      fetchImpl: fetch_impl,
      requestTimeoutMs: request_timeout_ms,
    }),
  });
  const imported = importVoidParticipantPostpurchaseFinalityV1({
    expected,
    evidence,
  });

  const body = Object.freeze({
    marker: VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_FINALITY_V1,
    version: 1,
    status: "VERIFIED_PRODUCTION_RUNTIME_FINALITY",
    chain_id: 2050,
    execution_epoch: 2,
    network_identity: NETWORK_IDENTITY,
    hostname: HOSTNAME,
    runtime_target_id: target.target_id,
    rpc_url_fingerprint_sha256: target.rpc_url_fingerprint_sha256,
    source_finality_evidence_id: evidence.evidence_id,
    source_finality_import_id: imported.import_id,
    source_binding_id: imported.binding_id,
    delivery_transaction_hash: imported.delivery_transaction_hash,
    control_transaction_hash: imported.control_transaction_hash,
    participant_address: imported.participant_address,
    observed_delivery_confirmation_count:
      imported.observed_delivery_confirmation_count,
    observed_control_confirmation_count:
      imported.observed_control_confirmation_count,
    production_runtime_target_selected: true,
    production_runtime_active_verified: true,
    exact_genesis_bound: true,
    production_validator_set_bound: true,
    migration_authorized: true,
    participant_control_finality_evidence_imported: true,
    participant_post_purchase_voidtoken_control_ready: true,
    production_runtime_binding_required: false,
    coupled_candidate_updated: false,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
  });
  const runtimeFinalityId =
    "voidppprf1_" + sha256Text(canonicalJson(body));
  if (!ID.test(runtimeFinalityId)) {
    fail("PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_FINALITY_ID_INVALID");
  }
  return Object.freeze({
    ok: true,
    ...body,
    runtime_finality_id: runtimeFinalityId,
    authority:
      VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_FINALITY_AUTHORITY_V1,
  });
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, "utf8"));
}

if (
  process.argv[1] &&
  import.meta.url === new URL("file://" + path.resolve(process.argv[1])).href
) {
  const submissionPath = path.resolve(String(arg("--submission") || ""));
  const expectedPath = path.resolve(String(arg("--expected") || ""));
  const targetPath = path.resolve(String(arg("--target") || CANONICAL_TARGET_PATH));
  const outputPath = path.resolve(String(arg("--output") || ""));
  const minConfirmations = String(arg("--min-confirmations") || "");
  const requestTimeoutMs = Number(arg("--request-timeout-ms") || "5000");

  for (const [label, filename] of [
    ["submission", submissionPath],
    ["expected", expectedPath],
    ["target", targetPath],
  ]) {
    if (!filename || filename === path.parse(filename).root || !fs.existsSync(filename)) {
      fail("PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_" + label.toUpperCase() + "_PATH_INVALID");
    }
  }
  if (!outputPath || outputPath === path.parse(outputPath).root) {
    fail("PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_OUTPUT_PATH_INVALID");
  }
  if (fs.existsSync(outputPath)) {
    fail("PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_OUTPUT_ALREADY_EXISTS");
  }

  const result =
    await verifyVoidParticipantPostpurchaseProductionRuntimeFinalityV1({
      submission: readJson(submissionPath),
      expected: readJson(expectedPath),
      min_confirmations: minConfirmations,
      runtime_target: readJson(targetPath),
      request_timeout_ms: requestTimeoutMs,
    });
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + "\n", {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  });
  console.log(VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_FINALITY_V1);
  console.log("runtime_finality_id=" + result.runtime_finality_id);
  console.log("participant_post_purchase_voidtoken_control_ready=true");
  console.log("production_runtime_binding_required=false");
  console.log("coupled_candidate_updated=false");
  console.log("market_activation=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
  console.log("output=" + outputPath);
}
