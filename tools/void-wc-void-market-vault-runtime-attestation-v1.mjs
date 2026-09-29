#!/usr/bin/env node
import { createHash } from "node:crypto";
import {
  Interface,
  getAddress,
  keccak256,
  zeroPadValue,
} from "ethers";

import {
  EXPECTED as COMPILED_IDENTITY_EXPECTED,
  verifyWcVoidMarketVaultCompiledIdentityAcceptanceV1,
} from "./void-wc-void-market-vault-compiled-identity-acceptance-v1.mjs";

export const VOID_WC_VOID_MARKET_VAULT_RUNTIME_ATTESTATION_V1 =
  "VOID_WC_VOID_MARKET_VAULT_RUNTIME_ATTESTATION_V1";

export const VOID_WC_VOID_MARKET_VAULT_RUNTIME_ATTESTATION_AUTHORITY_V1 =
  Object.freeze({
    read_only_rpc_verification: true,
    injected_transport_required: true,
    filesystem_read: false,
    filesystem_write: false,
    credential_access: false,
    wallet_or_signer_access: false,
    private_key_access: false,
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

const EXPECTED_CHAIN_ID = 2050n;
const CANONICAL_VOID_TOKEN =
  "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const CANONICAL_VOID_TOKEN_RUNTIME_SHA256 =
  "7c2e39f57c3240b740d68ef77ae4e9d0fb6110ccb412cbdb1bec99c485ea4adb";
const OPENING_INVENTORY_ATOMS = 10_000_000n * 10n ** 18n;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO_BYTES32 = "0x" + "00".repeat(32);
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const HASH = /^0x[0-9a-f]{64}$/u;
const BYTES32 = /^0x[0-9a-f]{64}$/u;
const MAX_CONFIRMATIONS = 1000n;

const INPUT_KEYS = Object.freeze([
  "compiled_identity_acceptance",
  "deployment",
  "min_confirmations",
  "transport",
]);

const DEPLOYMENT_KEYS = Object.freeze([
  "market_vault_address",
  "deployment_transaction_hash",
  "deployment_deployer",
  "void_token",
  "launch_controller",
  "settlement_executor",
  "closeout_controller",
  "coupled_launch_id",
]);

const RECEIPT_FIELDS = Object.freeze([
  "transactionHash",
  "from",
  "to",
  "contractAddress",
  "status",
  "blockNumber",
  "blockHash",
]);

const BLOCK_FIELDS = Object.freeze([
  "number",
  "hash",
]);

const VAULT = new Interface([
  "function voidToken() view returns (address)",
  "function launchController() view returns (address)",
  "function settlementExecutor() view returns (address)",
  "function closeoutController() view returns (address)",
  "function coupledLaunchId() view returns (bytes32)",
  "function openingInventoryAtoms() view returns (uint256)",
  "function currentVoidReserveAtoms() view returns (uint256)",
  "function activated() view returns (bool)",
  "function closing() view returns (bool)",
  "function closed() view returns (bool)",
  "function closeoutApproved() view returns (bool)",
  "function activatedAtBlock() view returns (uint256)",
  "function settlementCount() view returns (uint256)",
  "function lifetimeVoidOutAtoms() view returns (uint256)",
  "function pendingCloseoutId() view returns (bytes32)",
  "function pendingSuccessorVault() view returns (address)",
]);

const TOKEN = new Interface([
  "function balanceOf(address) view returns (uint256)",
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

function snapshotFields(value, keys, code) {
  if (!plain(value)) fail(code);
  const out = Object.create(null);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.hasOwn(descriptor, "value")) fail(code);
    out[key] = descriptor.value;
  }
  return Object.freeze(out);
}

function normalizeAddress(value, code) {
  if (typeof value !== "string") fail(code);
  const lower = value.toLowerCase();
  if (!ADDRESS.test(lower)) fail(code);
  try {
    return getAddress(lower).toLowerCase();
  } catch {
    fail(code);
  }
}

function normalizeHash(value, code) {
  if (typeof value !== "string") fail(code);
  const lower = value.toLowerCase();
  if (!HASH.test(lower)) fail(code);
  return lower;
}

function normalizeBytes32(value, code) {
  if (typeof value !== "string") fail(code);
  const lower = value.toLowerCase();
  if (!BYTES32.test(lower)) fail(code);
  return lower;
}

function quantity(value, code, { positive = false } = {}) {
  let parsed;
  try {
    if (
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "bigint"
    ) {
      throw null;
    }
    parsed = BigInt(value);
  } catch {
    fail(code);
  }
  if (parsed < 0n || (positive && parsed <= 0n)) fail(code);
  return parsed;
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
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

function evidenceId(value) {
  return "voidwcmvre1_" +
    createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function patch32(runtime, reference, value, code) {
  if (
    !plain(reference) ||
    !Number.isSafeInteger(reference.start) ||
    reference.start < 0 ||
    reference.length !== 32 ||
    reference.start + 32 > runtime.length ||
    !Buffer.isBuffer(value) ||
    value.length !== 32
  ) {
    fail(code);
  }
  value.copy(runtime, reference.start);
}

function immutableBytes(name, deployment) {
  if (name === "token") {
    return Buffer.from(zeroPadValue(deployment.void_token, 32).slice(2), "hex");
  }
  if (name === "launchController") {
    return Buffer.from(
      zeroPadValue(deployment.launch_controller, 32).slice(2),
      "hex",
    );
  }
  if (name === "settlementExecutor") {
    return Buffer.from(
      zeroPadValue(deployment.settlement_executor, 32).slice(2),
      "hex",
    );
  }
  if (name === "closeoutController") {
    return Buffer.from(
      zeroPadValue(deployment.closeout_controller, 32).slice(2),
      "hex",
    );
  }
  if (name === "coupledLaunchId") {
    return Buffer.from(deployment.coupled_launch_id.slice(2), "hex");
  }
  fail("WC_VOID_MARKET_VAULT_RUNTIME_UNKNOWN_IMMUTABLE");
}

export function reconstructWcVoidMarketVaultRuntimeV1(
  compiledIdentityAcceptance,
  deploymentInput,
) {
  const decision =
    verifyWcVoidMarketVaultCompiledIdentityAcceptanceV1(
      compiledIdentityAcceptance,
    );
  if (
    decision?.ok !== true ||
    decision.packet_id !== COMPILED_IDENTITY_EXPECTED.packet_id ||
    decision.identity_id !== COMPILED_IDENTITY_EXPECTED.identity_id
  ) {
    fail("WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_NOT_ACCEPTED");
  }

  const deployment = normalizeDeployment(deploymentInput);
  const runtimeHex =
    compiledIdentityAcceptance?.artifacts?.runtime_template_hex;
  const layout =
    compiledIdentityAcceptance?.artifacts?.immutable_layout;
  if (
    typeof runtimeHex !== "string" ||
    !/^0x(?:[0-9a-f]{2})+$/u.test(runtimeHex) ||
    !plain(layout)
  ) {
    fail("WC_VOID_MARKET_VAULT_RUNTIME_TEMPLATE_INVALID");
  }
  const runtime = Buffer.from(runtimeHex.slice(2), "hex");
  if (
    runtime.length !==
    COMPILED_IDENTITY_EXPECTED.runtime_template_bytes
  ) {
    fail("WC_VOID_MARKET_VAULT_RUNTIME_TEMPLATE_LENGTH_MISMATCH");
  }

  const allowed = new Set([
    "token",
    "launchController",
    "settlementExecutor",
    "closeoutController",
    "coupledLaunchId",
  ]);
  const names = Object.keys(layout).sort();
  if (
    names.length !== allowed.size ||
    names.some((name) => !allowed.has(name))
  ) {
    fail("WC_VOID_MARKET_VAULT_IMMUTABLE_LAYOUT_SHAPE_INVALID");
  }

  const occupied = new Set();
  for (const name of names) {
    const row = layout[name];
    if (!plain(row) || !Array.isArray(row.references) || row.references.length < 1) {
      fail("WC_VOID_MARKET_VAULT_IMMUTABLE_LAYOUT_ROW_INVALID");
    }
    const value = immutableBytes(name, deployment);
    for (const reference of row.references) {
      for (let offset = 0; offset < 32; offset += 1) {
        const index = reference?.start + offset;
        if (occupied.has(index)) {
          fail("WC_VOID_MARKET_VAULT_IMMUTABLE_LAYOUT_OVERLAP");
        }
        occupied.add(index);
      }
      patch32(
        runtime,
        reference,
        value,
        "WC_VOID_MARKET_VAULT_IMMUTABLE_REFERENCE_INVALID",
      );
    }
  }

  return Object.freeze({
    runtime_hex: "0x" + runtime.toString("hex"),
    runtime_bytes: runtime.length,
    runtime_sha256: sha256Bytes(runtime),
    runtime_keccak256: keccak256("0x" + runtime.toString("hex")),
  });
}

function normalizeDeployment(raw) {
  const value = exactObject(
    raw,
    DEPLOYMENT_KEYS,
    "INVALID_WC_VOID_MARKET_VAULT_DEPLOYMENT_SHAPE",
  );
  const out = Object.freeze({
    market_vault_address: normalizeAddress(
      value.market_vault_address,
      "INVALID_WC_VOID_MARKET_VAULT_ADDRESS",
    ),
    deployment_transaction_hash: normalizeHash(
      value.deployment_transaction_hash,
      "INVALID_WC_VOID_MARKET_VAULT_DEPLOYMENT_TRANSACTION_HASH",
    ),
    deployment_deployer: normalizeAddress(
      value.deployment_deployer,
      "INVALID_WC_VOID_MARKET_VAULT_DEPLOYER",
    ),
    void_token: normalizeAddress(
      value.void_token,
      "INVALID_WC_VOID_MARKET_VAULT_TOKEN",
    ),
    launch_controller: normalizeAddress(
      value.launch_controller,
      "INVALID_WC_VOID_MARKET_VAULT_LAUNCH_CONTROLLER",
    ),
    settlement_executor: normalizeAddress(
      value.settlement_executor,
      "INVALID_WC_VOID_MARKET_VAULT_SETTLEMENT_EXECUTOR",
    ),
    closeout_controller: normalizeAddress(
      value.closeout_controller,
      "INVALID_WC_VOID_MARKET_VAULT_CLOSEOUT_CONTROLLER",
    ),
    coupled_launch_id: normalizeBytes32(
      value.coupled_launch_id,
      "INVALID_WC_VOID_MARKET_VAULT_COUPLED_LAUNCH_ID",
    ),
  });
  for (const address of [
    out.market_vault_address,
    out.deployment_deployer,
    out.void_token,
    out.launch_controller,
    out.settlement_executor,
    out.closeout_controller,
  ]) {
    if (address === ZERO_ADDRESS) {
      fail("WC_VOID_MARKET_VAULT_ZERO_ADDRESS_FORBIDDEN");
    }
  }
  if (out.void_token !== CANONICAL_VOID_TOKEN) {
    fail("WC_VOID_MARKET_VAULT_NONCANONICAL_VOID_TOKEN");
  }
  if (out.coupled_launch_id === ZERO_BYTES32) {
    fail("WC_VOID_MARKET_VAULT_ZERO_LAUNCH_ID_FORBIDDEN");
  }
  return out;
}

function parseReceipt(raw, deployment) {
  const receipt = snapshotFields(
    raw,
    RECEIPT_FIELDS,
    "INVALID_WC_VOID_MARKET_VAULT_DEPLOYMENT_RECEIPT_SHAPE",
  );
  if (
    normalizeHash(
      receipt.transactionHash,
      "INVALID_WC_VOID_MARKET_VAULT_RECEIPT_TRANSACTION_HASH",
    ) !== deployment.deployment_transaction_hash ||
    normalizeAddress(
      receipt.from,
      "INVALID_WC_VOID_MARKET_VAULT_RECEIPT_FROM",
    ) !== deployment.deployment_deployer ||
    receipt.to !== null ||
    normalizeAddress(
      receipt.contractAddress,
      "INVALID_WC_VOID_MARKET_VAULT_RECEIPT_CONTRACT_ADDRESS",
    ) !== deployment.market_vault_address ||
    quantity(
      receipt.status,
      "INVALID_WC_VOID_MARKET_VAULT_RECEIPT_STATUS",
    ) !== 1n
  ) {
    fail("WC_VOID_MARKET_VAULT_DEPLOYMENT_RECEIPT_MISMATCH");
  }
  return Object.freeze({
    transaction_hash: deployment.deployment_transaction_hash,
    deployer: deployment.deployment_deployer,
    market_vault_address: deployment.market_vault_address,
    block_number: quantity(
      receipt.blockNumber,
      "INVALID_WC_VOID_MARKET_VAULT_DEPLOYMENT_BLOCK_NUMBER",
      { positive: true },
    ),
    block_hash: normalizeHash(
      receipt.blockHash,
      "INVALID_WC_VOID_MARKET_VAULT_DEPLOYMENT_BLOCK_HASH",
    ),
  });
}

function sameReceipt(left, right) {
  return (
    left.transaction_hash === right.transaction_hash &&
    left.deployer === right.deployer &&
    left.market_vault_address === right.market_vault_address &&
    left.block_number === right.block_number &&
    left.block_hash === right.block_hash
  );
}

function parseBlock(raw, expectedNumber) {
  const block = snapshotFields(
    raw,
    BLOCK_FIELDS,
    "INVALID_WC_VOID_MARKET_VAULT_BLOCK_SHAPE",
  );
  const number = quantity(
    block.number,
    "INVALID_WC_VOID_MARKET_VAULT_BLOCK_NUMBER",
  );
  if (number !== expectedNumber) {
    fail("WC_VOID_MARKET_VAULT_BLOCK_NUMBER_MISMATCH");
  }
  return Object.freeze({
    number,
    hash: normalizeHash(
      block.hash,
      "INVALID_WC_VOID_MARKET_VAULT_BLOCK_HASH",
    ),
  });
}

function sameBlock(left, right) {
  return left.number === right.number && left.hash === right.hash;
}

function hexQuantity(value) {
  return "0x" + value.toString(16);
}

function decodeCall(name, raw) {
  if (typeof raw !== "string" || !/^0x[0-9a-fA-F]*$/u.test(raw)) {
    fail("WC_VOID_MARKET_VAULT_ETH_CALL_RESULT_INVALID");
  }
  try {
    return VAULT.decodeFunctionResult(name, raw)[0];
  } catch {
    fail("WC_VOID_MARKET_VAULT_ETH_CALL_DECODE_FAILED");
  }
}

export async function attestWcVoidMarketVaultRuntimeV1(input) {
  const request = exactObject(
    input,
    INPUT_KEYS,
    "INVALID_WC_VOID_MARKET_VAULT_RUNTIME_ATTESTATION_INPUT_SHAPE",
  );
  const deployment = normalizeDeployment(request.deployment);
  const expectedRuntime = reconstructWcVoidMarketVaultRuntimeV1(
    request.compiled_identity_acceptance,
    deployment,
  );
  const minimum = quantity(
    request.min_confirmations,
    "INVALID_WC_VOID_MARKET_VAULT_MIN_CONFIRMATIONS",
    { positive: true },
  );
  if (minimum > MAX_CONFIRMATIONS) {
    fail("WC_VOID_MARKET_VAULT_MIN_CONFIRMATIONS_TOO_LARGE");
  }
  if (typeof request.transport !== "function") {
    fail("WC_VOID_MARKET_VAULT_INJECTED_TRANSPORT_REQUIRED");
  }

  const methods = [];
  const call = async (method, params) => {
    if (![
      "eth_chainId",
      "eth_getTransactionReceipt",
      "eth_blockNumber",
      "eth_getBlockByNumber",
      "eth_getCode",
      "eth_call",
    ].includes(method)) {
      fail("WC_VOID_MARKET_VAULT_RPC_METHOD_FORBIDDEN");
    }
    methods.push(method);
    return await request.transport(
      Object.freeze({
        method,
        params: Object.freeze(params),
      }),
    );
  };

  const chainId = quantity(
    await call("eth_chainId", []),
    "INVALID_WC_VOID_MARKET_VAULT_CHAIN_ID",
  );
  if (chainId !== EXPECTED_CHAIN_ID) {
    fail("WC_VOID_MARKET_VAULT_CHAIN_ID_MISMATCH");
  }

  const receiptRaw = await call(
    "eth_getTransactionReceipt",
    [deployment.deployment_transaction_hash],
  );
  if (receiptRaw === null) {
    fail("WC_VOID_MARKET_VAULT_DEPLOYMENT_RECEIPT_NOT_FOUND");
  }
  const receipt = parseReceipt(receiptRaw, deployment);

  const deploymentBlock = parseBlock(
    await call(
      "eth_getBlockByNumber",
      [hexQuantity(receipt.block_number), false],
    ),
    receipt.block_number,
  );
  if (deploymentBlock.hash !== receipt.block_hash) {
    fail("WC_VOID_MARKET_VAULT_DEPLOYMENT_BLOCK_HASH_MISMATCH");
  }

  const headNumber = quantity(
    await call("eth_blockNumber", []),
    "INVALID_WC_VOID_MARKET_VAULT_HEAD_NUMBER",
  );
  if (headNumber < receipt.block_number) {
    fail("WC_VOID_MARKET_VAULT_HEAD_BEFORE_DEPLOYMENT");
  }
  const confirmations = headNumber - receipt.block_number + 1n;
  if (confirmations < minimum) {
    fail("WC_VOID_MARKET_VAULT_CONFIRMATIONS_INSUFFICIENT");
  }
  const headTag = hexQuantity(headNumber);
  const firstHead = parseBlock(
    await call("eth_getBlockByNumber", [headTag, false]),
    headNumber,
  );

  const code = String(
    await call("eth_getCode", [deployment.market_vault_address, headTag]),
  ).toLowerCase();
  if (!/^0x(?:[0-9a-f]{2})+$/u.test(code) || code === "0x") {
    fail("WC_VOID_MARKET_VAULT_RUNTIME_CODE_INVALID");
  }
  if (code !== expectedRuntime.runtime_hex) {
    fail("WC_VOID_MARKET_VAULT_RUNTIME_CODE_MISMATCH");
  }

  const tokenCode = String(
    await call("eth_getCode", [deployment.void_token, headTag]),
  ).toLowerCase();
  if (!/^0x(?:[0-9a-f]{2})+$/u.test(tokenCode) || tokenCode === "0x") {
    fail("WC_VOID_MARKET_VAULT_TOKEN_CODE_MISSING");
  }
  const tokenRuntimeSha256 = sha256Bytes(
    Buffer.from(tokenCode.slice(2), "hex"),
  );
  if (tokenRuntimeSha256 !== CANONICAL_VOID_TOKEN_RUNTIME_SHA256) {
    fail("WC_VOID_MARKET_VAULT_TOKEN_RUNTIME_CODE_MISMATCH");
  }

  const vaultCall = async (name, args = []) => {
    const data = VAULT.encodeFunctionData(name, args);
    return decodeCall(
      name,
      await call(
        "eth_call",
        [{ to: deployment.market_vault_address, data }, headTag],
      ),
    );
  };
  const tokenBalance = async () => {
    const data = TOKEN.encodeFunctionData(
      "balanceOf",
      [deployment.market_vault_address],
    );
    const raw = await call(
      "eth_call",
      [{ to: deployment.void_token, data }, headTag],
    );
    try {
      return BigInt(TOKEN.decodeFunctionResult("balanceOf", raw)[0]);
    } catch {
      fail("WC_VOID_MARKET_VAULT_TOKEN_BALANCE_DECODE_FAILED");
    }
  };

  const observed = Object.freeze({
    void_token: normalizeAddress(
      String(await vaultCall("voidToken")),
      "WC_VOID_MARKET_VAULT_GETTER_TOKEN_INVALID",
    ),
    launch_controller: normalizeAddress(
      String(await vaultCall("launchController")),
      "WC_VOID_MARKET_VAULT_GETTER_LAUNCH_CONTROLLER_INVALID",
    ),
    settlement_executor: normalizeAddress(
      String(await vaultCall("settlementExecutor")),
      "WC_VOID_MARKET_VAULT_GETTER_SETTLEMENT_EXECUTOR_INVALID",
    ),
    closeout_controller: normalizeAddress(
      String(await vaultCall("closeoutController")),
      "WC_VOID_MARKET_VAULT_GETTER_CLOSEOUT_CONTROLLER_INVALID",
    ),
    coupled_launch_id: normalizeBytes32(
      String(await vaultCall("coupledLaunchId")),
      "WC_VOID_MARKET_VAULT_GETTER_LAUNCH_ID_INVALID",
    ),
    opening_inventory_atoms: BigInt(
      await vaultCall("openingInventoryAtoms"),
    ),
    current_void_reserve_atoms: BigInt(
      await vaultCall("currentVoidReserveAtoms"),
    ),
    token_balance_atoms: await tokenBalance(),
    activated: Boolean(await vaultCall("activated")),
    closing: Boolean(await vaultCall("closing")),
    closed: Boolean(await vaultCall("closed")),
    closeout_approved: Boolean(await vaultCall("closeoutApproved")),
    activated_at_block: BigInt(await vaultCall("activatedAtBlock")),
    settlement_count: BigInt(await vaultCall("settlementCount")),
    lifetime_void_out_atoms: BigInt(await vaultCall("lifetimeVoidOutAtoms")),
    pending_closeout_id: normalizeBytes32(
      String(await vaultCall("pendingCloseoutId")),
      "WC_VOID_MARKET_VAULT_PENDING_CLOSEOUT_ID_INVALID",
    ),
    pending_successor_vault: normalizeAddress(
      String(await vaultCall("pendingSuccessorVault")),
      "WC_VOID_MARKET_VAULT_PENDING_SUCCESSOR_INVALID",
    ),
  });

  if (
    observed.void_token !== deployment.void_token ||
    observed.launch_controller !== deployment.launch_controller ||
    observed.settlement_executor !== deployment.settlement_executor ||
    observed.closeout_controller !== deployment.closeout_controller ||
    observed.coupled_launch_id !== deployment.coupled_launch_id
  ) {
    fail("WC_VOID_MARKET_VAULT_IMMUTABLE_GETTER_MISMATCH");
  }

  if (
    observed.opening_inventory_atoms !== OPENING_INVENTORY_ATOMS ||
    observed.current_void_reserve_atoms !== OPENING_INVENTORY_ATOMS ||
    observed.token_balance_atoms !== OPENING_INVENTORY_ATOMS
  ) {
    fail("WC_VOID_MARKET_VAULT_OPENING_INVENTORY_NOT_EXACT");
  }

  if (
    observed.activated !== false ||
    observed.closing !== false ||
    observed.closed !== false ||
    observed.closeout_approved !== false ||
    observed.activated_at_block !== 0n ||
    observed.settlement_count !== 0n ||
    observed.lifetime_void_out_atoms !== 0n ||
    observed.pending_closeout_id !== ZERO_BYTES32 ||
    observed.pending_successor_vault !== ZERO_ADDRESS
  ) {
    fail("WC_VOID_MARKET_VAULT_PREACTIVATION_LOCK_STATE_INVALID");
  }

  const secondHead = parseBlock(
    await call("eth_getBlockByNumber", [headTag, false]),
    headNumber,
  );
  if (!sameBlock(firstHead, secondHead)) {
    fail("WC_VOID_MARKET_VAULT_HEAD_BLOCK_CHANGED_DURING_ATTESTATION");
  }

  const secondReceiptRaw = await call(
    "eth_getTransactionReceipt",
    [deployment.deployment_transaction_hash],
  );
  if (secondReceiptRaw === null) {
    fail("WC_VOID_MARKET_VAULT_DEPLOYMENT_RECEIPT_REVALIDATION_MISSING");
  }
  const secondReceipt = parseReceipt(secondReceiptRaw, deployment);
  if (!sameReceipt(receipt, secondReceipt)) {
    fail("WC_VOID_MARKET_VAULT_DEPLOYMENT_RECEIPT_CHANGED");
  }

  const payload = Object.freeze({
    marker: VOID_WC_VOID_MARKET_VAULT_RUNTIME_ATTESTATION_V1,
    version: 1,
    status: "RUNTIME_ATTESTED_PREACTIVATION_INVENTORY_LOCKED",
    chain_id: 2050,
    execution_epoch: 2,
    compiled_identity_packet_id: COMPILED_IDENTITY_EXPECTED.packet_id,
    compiled_identity_id: COMPILED_IDENTITY_EXPECTED.identity_id,
    deployment_transaction_hash: receipt.transaction_hash,
    deployment_deployer: receipt.deployer,
    deployment_block_number: receipt.block_number.toString(),
    deployment_block_hash: receipt.block_hash,
    deployment_receipt_revalidated: true,
    observed_head_block_number: headNumber.toString(),
    observed_head_block_hash: firstHead.hash,
    observed_confirmation_count: confirmations.toString(),
    market_vault_address: deployment.market_vault_address,
    runtime_code_bytes: expectedRuntime.runtime_bytes,
    runtime_code_sha256: expectedRuntime.runtime_sha256,
    runtime_code_keccak256: expectedRuntime.runtime_keccak256,
    void_token: observed.void_token,
    void_token_runtime_code_sha256: tokenRuntimeSha256,
    canonical_void_token_verified: true,
    canonical_void_token_runtime_verified: true,
    launch_controller: observed.launch_controller,
    settlement_executor: observed.settlement_executor,
    closeout_controller: observed.closeout_controller,
    coupled_launch_id: observed.coupled_launch_id,
    opening_inventory_atoms: observed.opening_inventory_atoms.toString(),
    current_void_reserve_atoms:
      observed.current_void_reserve_atoms.toString(),
    token_balance_atoms: observed.token_balance_atoms.toString(),
    activated: false,
    closing: false,
    closed: false,
    closeout_approved: false,
    activated_at_block: "0",
    settlement_count: "0",
    lifetime_void_out_atoms: "0",
    pending_closeout_id: ZERO_BYTES32,
    pending_successor_vault: ZERO_ADDRESS,
  });

  return Object.freeze({
    ok: true,
    ...payload,
    evidence_id: evidenceId(payload),
    rpc_methods_used: Object.freeze([...methods]),
    deployment_attested: true,
    final_role_bindings_attested: true,
    deployed_runtime_code_observed: true,
    canonical_void_token_verified: true,
    canonical_void_token_runtime_verified: true,
    market_vault_independently_verified: true,
    inventory_funded: true,
    inventory_lock_proven: true,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
    authority:
      VOID_WC_VOID_MARKET_VAULT_RUNTIME_ATTESTATION_AUTHORITY_V1,
  });
}
