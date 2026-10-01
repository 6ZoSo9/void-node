#!/usr/bin/env node
import { createHash } from "node:crypto";

import {
  EXPECTED as COMPILED_IDENTITY_EXPECTED,
} from "./void-wc-void-market-vault-compiled-identity-acceptance-v1.mjs";
import {
  VOID_WC_VOID_MARKET_VAULT_RUNTIME_ATTESTATION_V1,
} from "./void-wc-void-market-vault-runtime-attestation-v1.mjs";

export const VOID_WC_VOID_MARKET_VAULT_RUNTIME_ATTESTATION_IMPORT_V1 =
  "VOID_WC_VOID_MARKET_VAULT_RUNTIME_ATTESTATION_IMPORT_V1";

export const VOID_WC_VOID_MARKET_VAULT_RUNTIME_ATTESTATION_IMPORT_AUTHORITY_V1 =
  Object.freeze({
    source_evidence_validation_only: true,
    production_candidate_binding_derivation: true,
    filesystem_read: false,
    filesystem_write: false,
    credential_access: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    rpc_call: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    inventory_funding: false,
    inventory_movement: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const CANONICAL_VOID_TOKEN =
  "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const CANONICAL_VOID_TOKEN_RUNTIME_SHA256 =
  "7c2e39f57c3240b740d68ef77ae4e9d0fb6110ccb412cbdb1bec99c485ea4adb";
const OPENING_INVENTORY_ATOMS =
  "10000000000000000000000000";
const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000";
const ZERO_BYTES32 = "0x" + "00".repeat(32);

const ADDRESS = /^0x[0-9a-f]{40}$/u;
const HASH = /^0x[0-9a-f]{64}$/u;
const SHA256_HEX = /^[0-9a-f]{64}$/u;
const EVIDENCE_ID = /^voidwcmvre1_[0-9a-f]{64}$/u;
const IMPORT_ID = /^voidwcmvri1_[0-9a-f]{64}$/u;
const BINDING_ID = /^voidwcmvrb1_[0-9a-f]{64}$/u;
const UINT = /^(0|[1-9][0-9]*)$/u;
const MAX_UINT_DIGITS = 78;

const INPUT_KEYS = Object.freeze([
  "expected",
  "evidence",
]);

const EXPECTED_KEYS = Object.freeze([
  "market_vault_address",
  "deployment_transaction_hash",
  "deployment_deployer",
  "launch_controller",
  "settlement_executor",
  "closeout_controller",
  "coupled_launch_id",
  "minimum_observed_head_block_number",
  "minimum_confirmation_count",
]);

const PAYLOAD_KEYS = Object.freeze([
  "marker",
  "version",
  "status",
  "chain_id",
  "execution_epoch",
  "compiled_identity_packet_id",
  "compiled_identity_id",
  "deployment_transaction_hash",
  "deployment_deployer",
  "deployment_block_number",
  "deployment_block_hash",
  "deployment_receipt_revalidated",
  "observed_head_block_number",
  "observed_head_block_hash",
  "observed_confirmation_count",
  "market_vault_address",
  "runtime_code_bytes",
  "runtime_code_sha256",
  "runtime_code_keccak256",
  "void_token",
  "void_token_runtime_code_sha256",
  "canonical_void_token_verified",
  "canonical_void_token_runtime_verified",
  "launch_controller",
  "settlement_executor",
  "closeout_controller",
  "coupled_launch_id",
  "opening_inventory_atoms",
  "current_void_reserve_atoms",
  "token_balance_atoms",
  "activated",
  "closing",
  "closed",
  "closeout_approved",
  "activated_at_block",
  "settlement_count",
  "lifetime_void_out_atoms",
  "pending_closeout_id",
  "pending_successor_vault",
]);

const RECEIPT_KEYS = Object.freeze([
  "ok",
  ...PAYLOAD_KEYS,
  "evidence_id",
  "rpc_methods_used",
  "deployment_attested",
  "final_role_bindings_attested",
  "deployed_runtime_code_observed",
  "market_vault_independently_verified",
  "inventory_funded",
  "inventory_lock_proven",
  "market_activation_authorized",
  "public_presale_activation_authorized",
  "funds_movement_authorized",
  "authority",
]);

const AUTHORITY_KEYS = Object.freeze([
  "read_only_rpc_verification",
  "injected_transport_required",
  "filesystem_read",
  "filesystem_write",
  "credential_access",
  "wallet_or_signer_access",
  "private_key_access",
  "transaction_construction",
  "transaction_signing",
  "transaction_submission",
  "transaction_broadcast",
  "authoritative_chain2050_write",
  "inventory_funding",
  "inventory_movement",
  "market_activation",
  "public_presale_activation",
  "funds_movement",
]);

const REQUIRED_RPC_METHODS = Object.freeze([
  "eth_chainId",
  "eth_getTransactionReceipt",
  "eth_blockNumber",
  "eth_getBlockByNumber",
  "eth_getCode",
  "eth_call",
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

function exactArray(value, code) {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    value.length < 1 ||
    value.length > 4096
  ) {
    fail(code);
  }
  return Object.freeze(value.map((item) => {
    if (typeof item !== "string") fail(code);
    return item;
  }));
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (typeof value === "bigint") return JSON.stringify(value.toString());
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (plain(value)) {
    const keys = Object.keys(value).sort();
    return "{" + keys.map((key) =>
      JSON.stringify(key) + ":" + canonicalJson(value[key])
    ).join(",") + "}";
  }
  fail("INVALID_CANONICAL_VALUE");
}

function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex");
}

function uint(value, code, { positive = false } = {}) {
  if (
    typeof value !== "string" ||
    value.length > MAX_UINT_DIGITS ||
    !UINT.test(value)
  ) {
    fail(code);
  }
  const parsed = BigInt(value);
  if (positive && parsed <= 0n) fail(code);
  return parsed;
}

function address(value, code) {
  if (typeof value !== "string") fail(code);
  const lower = value.toLowerCase();
  if (!ADDRESS.test(lower) || lower === ZERO_ADDRESS) fail(code);
  return lower;
}

function hash(value, code) {
  if (typeof value !== "string") fail(code);
  const lower = value.toLowerCase();
  if (!HASH.test(lower) || lower === ZERO_BYTES32) fail(code);
  return lower;
}

function sha256(value, code) {
  if (typeof value !== "string" || !SHA256_HEX.test(value)) fail(code);
  return value;
}

function expectedBinding(raw) {
  const value = exactObject(
    raw,
    EXPECTED_KEYS,
    "INVALID_WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_EXPECTED_SHAPE",
  );
  const out = Object.freeze({
    market_vault_address: address(
      value.market_vault_address,
      "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_EXPECTED_VAULT_INVALID",
    ),
    deployment_transaction_hash: hash(
      value.deployment_transaction_hash,
      "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_EXPECTED_DEPLOYMENT_HASH_INVALID",
    ),
    deployment_deployer: address(
      value.deployment_deployer,
      "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_EXPECTED_DEPLOYER_INVALID",
    ),
    launch_controller: address(
      value.launch_controller,
      "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_EXPECTED_LAUNCH_CONTROLLER_INVALID",
    ),
    settlement_executor: address(
      value.settlement_executor,
      "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_EXPECTED_SETTLEMENT_EXECUTOR_INVALID",
    ),
    closeout_controller: address(
      value.closeout_controller,
      "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_EXPECTED_CLOSEOUT_CONTROLLER_INVALID",
    ),
    coupled_launch_id: hash(
      value.coupled_launch_id,
      "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_EXPECTED_LAUNCH_ID_INVALID",
    ),
    minimum_observed_head_block_number: uint(
      value.minimum_observed_head_block_number,
      "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_MINIMUM_HEAD_INVALID",
      { positive: true },
    ),
    minimum_confirmation_count: uint(
      value.minimum_confirmation_count,
      "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_MINIMUM_CONFIRMATIONS_INVALID",
      { positive: true },
    ),
  });
  return Object.freeze({
    ...out,
    binding_id:
      "voidwcmvrb1_" + sha256Text(canonicalJson({
        market_vault_address: out.market_vault_address,
        deployment_transaction_hash: out.deployment_transaction_hash,
        deployment_deployer: out.deployment_deployer,
        launch_controller: out.launch_controller,
        settlement_executor: out.settlement_executor,
        closeout_controller: out.closeout_controller,
        coupled_launch_id: out.coupled_launch_id,
        minimum_observed_head_block_number:
          out.minimum_observed_head_block_number.toString(),
        minimum_confirmation_count:
          out.minimum_confirmation_count.toString(),
      })),
  });
}

function payloadFromReceipt(receipt) {
  const payload = Object.create(null);
  for (const key of PAYLOAD_KEYS) payload[key] = receipt[key];
  return payload;
}

function validateAuthority(raw) {
  const authority = exactObject(
    raw,
    AUTHORITY_KEYS,
    "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_AUTHORITY_SHAPE_INVALID",
  );
  for (const key of AUTHORITY_KEYS) {
    const expected =
      key === "read_only_rpc_verification" ||
      key === "injected_transport_required";
    if (authority[key] !== expected) {
      fail("WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_AUTHORITY_MISMATCH");
    }
  }
  return authority;
}

function validateRpcMethods(raw) {
  const methods = exactArray(
    raw,
    "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_RPC_METHOD_SET_INVALID",
  );
  const allowed = new Set(REQUIRED_RPC_METHODS);
  for (const method of methods) {
    if (!allowed.has(method)) {
      fail("WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_RPC_METHOD_FORBIDDEN");
    }
  }
  for (const required of REQUIRED_RPC_METHODS) {
    if (!methods.includes(required)) {
      fail("WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_RPC_METHOD_MISSING");
    }
  }
  return methods;
}

export function importWcVoidMarketVaultRuntimeAttestationV1(input) {
  const request = exactObject(
    input,
    INPUT_KEYS,
    "INVALID_WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_INPUT_SHAPE",
  );
  const expected = expectedBinding(request.expected);
  if (!BINDING_ID.test(expected.binding_id)) {
    fail("WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_BINDING_ID_INVALID");
  }

  const receipt = exactObject(
    request.evidence,
    RECEIPT_KEYS,
    "INVALID_WC_VOID_MARKET_VAULT_RUNTIME_ATTESTATION_RECEIPT_SHAPE",
  );

  if (
    receipt.ok !== true ||
    receipt.marker !== VOID_WC_VOID_MARKET_VAULT_RUNTIME_ATTESTATION_V1 ||
    receipt.version !== 1 ||
    receipt.status !==
      "RUNTIME_ATTESTED_PREACTIVATION_INVENTORY_LOCKED" ||
    receipt.chain_id !== 2050 ||
    receipt.execution_epoch !== 2
  ) {
    fail("WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_RECEIPT_IDENTITY_MISMATCH");
  }

  const evidenceId =
    "voidwcmvre1_" +
    sha256Text(canonicalJson(payloadFromReceipt(receipt)));
  if (
    typeof receipt.evidence_id !== "string" ||
    !EVIDENCE_ID.test(receipt.evidence_id) ||
    receipt.evidence_id !== evidenceId
  ) {
    fail("WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_EVIDENCE_ID_MISMATCH");
  }

  if (
    receipt.compiled_identity_packet_id !==
      COMPILED_IDENTITY_EXPECTED.packet_id ||
    receipt.compiled_identity_id !==
      COMPILED_IDENTITY_EXPECTED.identity_id ||
    receipt.runtime_code_bytes !==
      COMPILED_IDENTITY_EXPECTED.runtime_template_bytes
  ) {
    fail("WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_COMPILED_IDENTITY_MISMATCH");
  }

  const vault = address(
    receipt.market_vault_address,
    "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_VAULT_INVALID",
  );
  const deploymentHash = hash(
    receipt.deployment_transaction_hash,
    "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_DEPLOYMENT_HASH_INVALID",
  );
  const deployer = address(
    receipt.deployment_deployer,
    "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_DEPLOYER_INVALID",
  );
  const launchController = address(
    receipt.launch_controller,
    "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_LAUNCH_CONTROLLER_INVALID",
  );
  const settlementExecutor = address(
    receipt.settlement_executor,
    "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_SETTLEMENT_EXECUTOR_INVALID",
  );
  const closeoutController = address(
    receipt.closeout_controller,
    "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_CLOSEOUT_CONTROLLER_INVALID",
  );
  const coupledLaunchId = hash(
    receipt.coupled_launch_id,
    "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_LAUNCH_ID_INVALID",
  );

  if (
    vault !== expected.market_vault_address ||
    deploymentHash !== expected.deployment_transaction_hash ||
    deployer !== expected.deployment_deployer ||
    launchController !== expected.launch_controller ||
    settlementExecutor !== expected.settlement_executor ||
    closeoutController !== expected.closeout_controller ||
    coupledLaunchId !== expected.coupled_launch_id
  ) {
    fail("WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_EXPECTED_BINDING_MISMATCH");
  }

  if (
    address(
      receipt.void_token,
      "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_VOID_TOKEN_INVALID",
    ) !== CANONICAL_VOID_TOKEN ||
    sha256(
      receipt.void_token_runtime_code_sha256,
      "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_VOID_TOKEN_RUNTIME_INVALID",
    ) !== CANONICAL_VOID_TOKEN_RUNTIME_SHA256 ||
    receipt.canonical_void_token_verified !== true ||
    receipt.canonical_void_token_runtime_verified !== true
  ) {
    fail("WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_CANONICAL_TOKEN_MISMATCH");
  }

  sha256(
    receipt.runtime_code_sha256,
    "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_RUNTIME_SHA256_INVALID",
  );
  hash(
    receipt.runtime_code_keccak256,
    "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_RUNTIME_KECCAK_INVALID",
  );
  hash(
    receipt.deployment_block_hash,
    "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_DEPLOYMENT_BLOCK_HASH_INVALID",
  );
  hash(
    receipt.observed_head_block_hash,
    "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_HEAD_BLOCK_HASH_INVALID",
  );

  const deploymentBlock = uint(
    receipt.deployment_block_number,
    "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_DEPLOYMENT_BLOCK_INVALID",
    { positive: true },
  );
  const headBlock = uint(
    receipt.observed_head_block_number,
    "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_HEAD_BLOCK_INVALID",
    { positive: true },
  );
  const confirmations = uint(
    receipt.observed_confirmation_count,
    "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_CONFIRMATION_COUNT_INVALID",
    { positive: true },
  );
  if (headBlock < deploymentBlock) {
    fail("WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_HEAD_BEFORE_DEPLOYMENT");
  }
  if (confirmations !== headBlock - deploymentBlock + 1n) {
    fail("WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_CONFIRMATION_COUNT_MISMATCH");
  }
  if (
    headBlock < expected.minimum_observed_head_block_number ||
    confirmations < expected.minimum_confirmation_count
  ) {
    fail("WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_FRESHNESS_OR_FINALITY_HOLD");
  }

  if (
    receipt.opening_inventory_atoms !== OPENING_INVENTORY_ATOMS ||
    receipt.current_void_reserve_atoms !== OPENING_INVENTORY_ATOMS ||
    receipt.token_balance_atoms !== OPENING_INVENTORY_ATOMS
  ) {
    fail("WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_INVENTORY_LOCK_MISMATCH");
  }

  if (
    receipt.activated !== false ||
    receipt.closing !== false ||
    receipt.closed !== false ||
    receipt.closeout_approved !== false ||
    receipt.activated_at_block !== "0" ||
    receipt.settlement_count !== "0" ||
    receipt.lifetime_void_out_atoms !== "0" ||
    receipt.pending_closeout_id !== ZERO_BYTES32 ||
    receipt.pending_successor_vault !== ZERO_ADDRESS
  ) {
    fail("WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_PREACTIVATION_STATE_MISMATCH");
  }

  for (const key of [
    "deployment_receipt_revalidated",
    "deployment_attested",
    "final_role_bindings_attested",
    "deployed_runtime_code_observed",
    "market_vault_independently_verified",
    "inventory_funded",
    "inventory_lock_proven",
  ]) {
    if (receipt[key] !== true) {
      fail("WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_REQUIRED_PROOF_MISSING");
    }
  }
  for (const key of [
    "market_activation_authorized",
    "public_presale_activation_authorized",
    "funds_movement_authorized",
  ]) {
    if (receipt[key] !== false) {
      fail("WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_AUTHORITY_MUST_REMAIN_FALSE");
    }
  }

  validateAuthority(receipt.authority);
  validateRpcMethods(receipt.rpc_methods_used);

  const candidateFields = Object.freeze({
    market_vault_address: vault,
    market_vault_runtime_code_sha256: receipt.runtime_code_sha256,
    market_vault_independently_verified: true,
    inventory_funded: true,
    inventory_lock_proven: true,
  });

  const body = Object.freeze({
    marker: VOID_WC_VOID_MARKET_VAULT_RUNTIME_ATTESTATION_IMPORT_V1,
    version: 1,
    status: "VERIFIED_RUNTIME_ATTESTATION_IMPORT",
    binding_id: expected.binding_id,
    source_evidence_id: receipt.evidence_id,
    chain_id: 2050,
    execution_epoch: 2,
    coupled_launch_id: coupledLaunchId,
    market_vault_address: vault,
    market_vault_runtime_code_sha256: receipt.runtime_code_sha256,
    market_vault_compiled_identity_id:
      receipt.compiled_identity_id,
    deployment_transaction_hash: deploymentHash,
    deployment_block_number: deploymentBlock.toString(),
    deployment_block_hash: receipt.deployment_block_hash,
    observed_head_block_number: headBlock.toString(),
    observed_head_block_hash: receipt.observed_head_block_hash,
    observed_confirmation_count: confirmations.toString(),
    minimum_observed_head_block_number:
      expected.minimum_observed_head_block_number.toString(),
    minimum_confirmation_count:
      expected.minimum_confirmation_count.toString(),
    candidate_fields: candidateFields,
    production_candidate_binding_ready: false,
    production_candidate_binding_hold_reason:
      "fresh_live_head_and_preactivation_state_revalidation_required",
    freshness_revalidation_required: true,
    freshness_revalidation_basis:
      "live_head_and_preactivation_state",
    production_candidate_updated: false,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
  });

  return Object.freeze({
    ok: true,
    ...body,
    import_id:
      "voidwcmvri1_" + sha256Text(canonicalJson(body)),
    authority:
      VOID_WC_VOID_MARKET_VAULT_RUNTIME_ATTESTATION_IMPORT_AUTHORITY_V1,
  });
}
