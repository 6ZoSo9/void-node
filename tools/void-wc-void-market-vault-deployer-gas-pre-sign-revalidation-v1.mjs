#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import * as http from "node:http";
import { Transaction } from "ethers";

export const VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_PRE_SIGN_REVALIDATION_V1 =
  "VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_PRE_SIGN_REVALIDATION_V1";

export const AUTHORITY = Object.freeze({
  source_only_dynamic_binding: true,
  exact_authorization_required: true,
  exact_unsigned_transaction_required: true,
  loopback_http_only: true,
  canonical_chain_id: 2050,
  exact_source_nonce_required: true,
  source_balance_sufficiency_required: true,
  destination_unfunded_required: true,
  fee_caps_revalidated: true,
  pending_nonce_revalidation_required: true,
  observation_block_hash_revalidation_required: true,
  rpc_mutation: false,
  credential_access: false,
  wallet_or_signer_access: false,
  private_key_access: false,
  transaction_signing: false,
  transaction_broadcast: false,
  chain2050_write: false,
  deployer_funding: false,
  inventory_funding: false,
  market_activation: false,
  public_presale_activation: false,
  funds_movement: false,
  automatic_retry: false,
});

const EXPECTED = Object.freeze({
  chain_id: 2050n,
  authorization_id:
    "voidwcvdgfa1_b2255123b21f6bfef86ea5aa288bcfd8a86d7d46e3a94f6b861bdadacb416392",
  funding_request_id:
    "voidwcvdgfr1_1cdff2d7f8129e3debfdf0e080b8f059b0129ea7c1ec44c414c95282262d1148",
  source: "0xc884f631c3881b8b672bfcbf019c856146cd7f73",
  destination: "0x907ea7d0d57f5631219674bdf666a7e929613074",
  nonce: 1n,
  value_wei: 6669126000000000n,
  gas_limit: 21000n,
  max_fee_per_gas_wei: 3000000000n,
  max_priority_fee_per_gas_wei: 1000000000n,
  maximum_source_liability_wei: 6732126000000000n,
  unsigned_transaction_hash:
    "0xe0ffe7279501b1c334b7a0b0e67081ab2813db7d407970aa6c9ea9f6882da3e9",
  unsigned_serialized_sha256:
    "5e25fb995cf853fa3942bb4e6aa364c9746d0f411f87b55cac15b06b12b352fd",
});

const HEX_QUANTITY = /^0x(?:0|[1-9a-f][0-9a-f]*)$/iu;
const HASH = /^0x[0-9a-f]{64}$/u;
const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_RESPONSE_BYTES = 1048576;
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;

function text(value) {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function quantity(value) {
  const raw = text(value);
  if (!HEX_QUANTITY.test(raw)) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function hash(value) {
  const raw = text(value).toLowerCase();
  return HASH.test(raw) ? raw : "";
}

function sha256Bytes(hex) {
  return crypto
    .createHash("sha256")
    .update(Buffer.from(hex.replace(/^0x/u, ""), "hex"))
    .digest("hex");
}

function normalizeRpc(input) {
  let url;
  try {
    url = new URL(text(input?.rpc_url));
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^\[/u, "").replace(/\]$/u, "");
  const hostname = host === "127.0.0.1" ? "127.0.0.1" : host === "::1" ? "::1" : null;
  const port = Number(url.port || 0);
  const timeout = Number(input?.request_timeout_ms ?? DEFAULT_TIMEOUT_MS);
  const maxBytes = Number(input?.max_response_bytes ?? DEFAULT_MAX_RESPONSE_BYTES);

  if (
    !hostname ||
    url.protocol !== "http:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !Number.isInteger(port) ||
    port <= 0 ||
    port > 65535 ||
    !Number.isSafeInteger(timeout) ||
    timeout <= 0 ||
    timeout > 30000 ||
    !Number.isSafeInteger(maxBytes) ||
    maxBytes <= 0 ||
    maxBytes > MAX_RESPONSE_BYTES
  ) {
    return null;
  }

  return {
    hostname,
    port,
    path: url.pathname || "/",
    timeout,
    maxBytes,
  };
}

function createTransport(policy) {
  let id = 0;
  return async ({ method, params }) => {
    const requestId = ++id;
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: requestId,
      method,
      params,
    });

    return await new Promise((resolve, reject) => {
      const req = http.request(
        {
          protocol: "http:",
          hostname: policy.hostname,
          port: policy.port,
          path: policy.path,
          method: "POST",
          family: policy.hostname === "::1" ? 6 : 4,
          agent: false,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "Content-Length": String(Buffer.byteLength(body)),
            Connection: "close",
            "User-Agent":
              "void-wc-void-market-vault-deployer-gas-pre-sign-revalidation-v1",
          },
        },
        (res) => {
          const chunks = [];
          let total = 0;
          res.on("data", (chunk) => {
            total += chunk.length;
            if (total > policy.maxBytes) {
              req.destroy(new Error("rpc_response_too_large"));
              return;
            }
            chunks.push(chunk);
          });
          res.on("end", () => {
            if (res.statusCode !== 200) {
              reject(new Error("rpc_http_status_invalid"));
              return;
            }
            try {
              const payload = JSON.parse(
                Buffer.concat(chunks).toString("utf8"),
              );
              if (
                payload?.jsonrpc !== "2.0" ||
                payload?.id !== requestId ||
                payload?.error ||
                !Object.prototype.hasOwnProperty.call(payload, "result")
              ) {
                reject(new Error("rpc_envelope_invalid"));
                return;
              }
              resolve(payload.result);
            } catch (error) {
              reject(error);
            }
          });
        },
      );
      req.setTimeout(policy.timeout, () =>
        req.destroy(new Error("rpc_timeout")),
      );
      req.on("error", reject);
      req.end(body);
    });
  };
}

function validateAuthorization(auth) {
  if (
    !auth ||
    auth.marker !==
      "VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_FUNDING_AUTHORIZATION_V1" ||
    auth.version !== 1 ||
    auth.status !== "authorized_exact_single_funding_transaction" ||
    auth.authorization_id !== EXPECTED.authorization_id ||
    auth.authorization_source !== "interactive_sovereign_authorization" ||
    auth.funding_request_id !== EXPECTED.funding_request_id ||
    auth.source !== EXPECTED.source ||
    auth.destination !== EXPECTED.destination ||
    BigInt(auth.value_wei) !== EXPECTED.value_wei ||
    BigInt(auth.nonce) !== EXPECTED.nonce ||
    BigInt(auth.gas_limit) !== EXPECTED.gas_limit ||
    BigInt(auth.max_fee_per_gas_wei) !== EXPECTED.max_fee_per_gas_wei ||
    BigInt(auth.max_priority_fee_per_gas_wei) !==
      EXPECTED.max_priority_fee_per_gas_wei ||
    BigInt(auth.maximum_source_liability_wei) !==
      EXPECTED.maximum_source_liability_wei ||
    auth.authorization?.source_selection_authorized !== true ||
    auth.authorization?.native_gas_funding_authority_expansion_authorized !==
      true ||
    auth.authorization?.unsigned_transaction_construction_authorized !== true ||
    auth.authorization?.transaction_signing_authorized !== false ||
    auth.authorization?.transaction_broadcast_authorized !== false ||
    auth.authorization?.chain2050_write_authorized !== false ||
    auth.authorization?.funds_movement_authorized !== false ||
    auth.authorization?.maximum_submission_attempts !== 1 ||
    auth.authorization?.automatic_retry !== false ||
    auth.authorization?.replacement_transaction_authorized !== false
  ) {
    fail("authorization_binding_invalid");
  }
}

function validateUnsigned(unsigned) {
  if (
    !unsigned ||
    unsigned.marker !==
      "VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_UNSIGNED_FUNDING_V1" ||
    unsigned.version !== 1 ||
    unsigned.status !==
      "unsigned_exact_transaction_ready_for_fresh_revalidation" ||
    unsigned.authorization_id !== EXPECTED.authorization_id ||
    unsigned.funding_request_id !== EXPECTED.funding_request_id ||
    unsigned.transaction?.source !== EXPECTED.source ||
    unsigned.transaction?.destination !== EXPECTED.destination ||
    BigInt(unsigned.transaction?.chain_id) !== EXPECTED.chain_id ||
    unsigned.transaction?.transaction_type !== 2 ||
    BigInt(unsigned.transaction?.nonce) !== EXPECTED.nonce ||
    BigInt(unsigned.transaction?.value_wei) !== EXPECTED.value_wei ||
    BigInt(unsigned.transaction?.gas_limit) !== EXPECTED.gas_limit ||
    BigInt(unsigned.transaction?.max_fee_per_gas_wei) !==
      EXPECTED.max_fee_per_gas_wei ||
    BigInt(unsigned.transaction?.max_priority_fee_per_gas_wei) !==
      EXPECTED.max_priority_fee_per_gas_wei ||
    unsigned.transaction?.data !== "0x" ||
    !Array.isArray(unsigned.transaction?.access_list) ||
    unsigned.transaction.access_list.length !== 0 ||
    unsigned.transaction?.unsigned_transaction_hash !==
      EXPECTED.unsigned_transaction_hash ||
    unsigned.transaction?.unsigned_serialized_sha256 !==
      EXPECTED.unsigned_serialized_sha256 ||
    unsigned.authority?.private_key_access_authorized !== false ||
    unsigned.authority?.transaction_signing_authorized !== false ||
    unsigned.authority?.transaction_broadcast_authorized !== false ||
    unsigned.authority?.chain2050_write_authorized !== false ||
    unsigned.authority?.funds_movement_authorized !== false
  ) {
    fail("unsigned_artifact_binding_invalid");
  }

  const tx = Transaction.from(unsigned.transaction.unsigned_serialized);
  if (
    tx.type !== 2 ||
    tx.chainId !== EXPECTED.chain_id ||
    BigInt(tx.nonce) !== EXPECTED.nonce ||
    String(tx.to).toLowerCase() !== EXPECTED.destination ||
    tx.value !== EXPECTED.value_wei ||
    tx.gasLimit !== EXPECTED.gas_limit ||
    tx.maxFeePerGas !== EXPECTED.max_fee_per_gas_wei ||
    tx.maxPriorityFeePerGas !== EXPECTED.max_priority_fee_per_gas_wei ||
    tx.data !== "0x" ||
    tx.signature !== null ||
    tx.from !== null ||
    tx.unsignedHash !== EXPECTED.unsigned_transaction_hash ||
    sha256Bytes(tx.unsignedSerialized) !== EXPECTED.unsigned_serialized_sha256
  ) {
    fail("unsigned_serialized_transaction_mismatch");
  }
}

function hold(reason, methods = [], detail = undefined) {
  return Object.freeze({
    ok: false,
    status: "HOLD",
    marker:
      VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_PRE_SIGN_REVALIDATION_V1,
    reason,
    rpc_methods_used: Object.freeze([...methods]),
    observation: null,
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    chain2050_write_authorized: false,
    funds_movement_authorized: false,
    authority: AUTHORITY,
    ...(detail ? { detail } : {}),
  });
}

export async function revalidateWcVoidDeployerGasFundingPreSignV1(input) {
  const rpc = normalizeRpc(input);
  if (!rpc) return hold("rpc_policy_invalid");

  try {
    validateAuthorization(input.authorization);
    validateUnsigned(input.unsigned);
  } catch (error) {
    return hold(
      text(error?.code || error?.message || "artifact_binding_invalid"),
    );
  }

  const methods = [];
  const transport = input.transport || createTransport(rpc);
  const call = async (method, params) => {
    methods.push(method);
    return await transport({ method, params });
  };

  try {
    const chainId = quantity(await call("eth_chainId", []));
    if (chainId !== EXPECTED.chain_id) {
      return hold("chain_id_mismatch", methods);
    }

    const head = quantity(await call("eth_blockNumber", []));
    if (head === null || head <= 0n) {
      return hold("head_invalid", methods);
    }
    const headTag = "0x" + head.toString(16);

    const blockA = await call("eth_getBlockByNumber", [headTag, false]);
    const blockHash = hash(blockA?.hash);
    const baseFee = quantity(blockA?.baseFeePerGas);
    if (
      !blockHash ||
      quantity(blockA?.number) !== head ||
      baseFee === null
    ) {
      return hold("observation_block_invalid", methods);
    }

    const sourceCode = text(
      await call("eth_getCode", [EXPECTED.source, headTag]),
    ).toLowerCase();
    const destinationCode = text(
      await call("eth_getCode", [EXPECTED.destination, headTag]),
    ).toLowerCase();
    if (sourceCode !== "0x") return hold("source_has_code", methods);
    if (destinationCode !== "0x") {
      return hold("destination_has_code", methods);
    }

    const sourceLatest = quantity(
      await call("eth_getTransactionCount", [EXPECTED.source, headTag]),
    );
    const sourcePendingA = quantity(
      await call("eth_getTransactionCount", [EXPECTED.source, "pending"]),
    );
    const destinationLatest = quantity(
      await call("eth_getTransactionCount", [EXPECTED.destination, headTag]),
    );
    const destinationPending = quantity(
      await call("eth_getTransactionCount", [EXPECTED.destination, "pending"]),
    );

    const sourceBalance = quantity(
      await call("eth_getBalance", [EXPECTED.source, headTag]),
    );
    const destinationBalance = quantity(
      await call("eth_getBalance", [EXPECTED.destination, headTag]),
    );
    const priority = quantity(
      await call("eth_maxPriorityFeePerGas", []),
    );

    if (
      sourceLatest === null ||
      sourcePendingA === null ||
      destinationLatest === null ||
      destinationPending === null ||
      sourceBalance === null ||
      destinationBalance === null ||
      priority === null ||
      priority <= 0n
    ) {
      return hold("account_or_fee_observation_invalid", methods);
    }

    if (
      sourceLatest !== EXPECTED.nonce ||
      sourcePendingA !== EXPECTED.nonce
    ) {
      return hold("source_nonce_mismatch", methods, {
        source_latest_nonce: sourceLatest.toString(),
        source_pending_nonce: sourcePendingA.toString(),
      });
    }

    if (sourceBalance < EXPECTED.maximum_source_liability_wei) {
      return hold("source_balance_insufficient", methods, {
        source_balance_wei: sourceBalance.toString(),
      });
    }

    if (
      destinationBalance !== 0n ||
      destinationLatest !== 0n ||
      destinationPending !== 0n
    ) {
      return hold("destination_already_changed", methods, {
        destination_balance_wei: destinationBalance.toString(),
        destination_latest_nonce: destinationLatest.toString(),
        destination_pending_nonce: destinationPending.toString(),
      });
    }

    const observedFeeNeed = baseFee * 2n + priority;
    if (
      priority > EXPECTED.max_priority_fee_per_gas_wei ||
      observedFeeNeed > EXPECTED.max_fee_per_gas_wei
    ) {
      return hold("fee_caps_insufficient", methods, {
        base_fee_per_gas_wei: baseFee.toString(),
        observed_priority_fee_per_gas_wei: priority.toString(),
        observed_two_x_base_plus_priority_wei:
          observedFeeNeed.toString(),
      });
    }

    const sourcePendingB = quantity(
      await call("eth_getTransactionCount", [EXPECTED.source, "pending"]),
    );
    const blockB = await call("eth_getBlockByNumber", [headTag, false]);

    if (
      sourcePendingB !== sourcePendingA ||
      hash(blockB?.hash) !== blockHash ||
      quantity(blockB?.number) !== head ||
      quantity(blockB?.baseFeePerGas) !== baseFee
    ) {
      return hold("revalidation_mismatch", methods);
    }

    return Object.freeze({
      ok: true,
      status:
        "GREEN_FRESH_PRE_SIGN_REVALIDATION_READY_FOR_SEPARATE_EXACT_SIGNING_AND_BROADCAST_AUTHORIZATION",
      marker:
        VOID_WC_VOID_MARKET_VAULT_DEPLOYER_GAS_PRE_SIGN_REVALIDATION_V1,
      authorization_id: EXPECTED.authorization_id,
      funding_request_id: EXPECTED.funding_request_id,
      unsigned_transaction_hash: EXPECTED.unsigned_transaction_hash,
      unsigned_serialized_sha256:
        EXPECTED.unsigned_serialized_sha256,
      rpc_methods_used: Object.freeze([...methods]),
      observation: Object.freeze({
        chain_id: "2050",
        block_number: head.toString(),
        block_hash: blockHash,
        source_address: EXPECTED.source,
        source_latest_nonce: sourceLatest.toString(),
        source_pending_nonce: sourcePendingA.toString(),
        source_balance_wei: sourceBalance.toString(),
        destination_address: EXPECTED.destination,
        destination_balance_wei: destinationBalance.toString(),
        destination_latest_nonce: destinationLatest.toString(),
        destination_pending_nonce: destinationPending.toString(),
        source_has_code: false,
        destination_has_code: false,
        base_fee_per_gas_wei: baseFee.toString(),
        observed_priority_fee_per_gas_wei: priority.toString(),
        observed_two_x_base_plus_priority_wei:
          observedFeeNeed.toString(),
        max_fee_per_gas_wei:
          EXPECTED.max_fee_per_gas_wei.toString(),
        max_priority_fee_per_gas_wei:
          EXPECTED.max_priority_fee_per_gas_wei.toString(),
        maximum_source_liability_wei:
          EXPECTED.maximum_source_liability_wei.toString(),
        source_balance_sufficient: true,
        destination_unfunded: true,
        pending_nonce_revalidated: true,
        observation_block_hash_revalidated: true,
      }),
      signing_authorized: false,
      transaction_broadcast_authorized: false,
      chain2050_write_authorized: false,
      funds_movement_authorized: false,
      next_gate:
        "separate_explicit_exact_signing_and_broadcast_authorization",
      authority: AUTHORITY,
    });
  } catch (error) {
    return hold("rpc_revalidation_failed", methods, {
      error_class: text(error?.name || "Error").slice(0, 80),
      message: text(error?.message || error).slice(0, 220),
    });
  }
}

async function main() {
  const authorization = JSON.parse(
    fs.readFileSync(
      "ops/mainnet0/wc-void-market-vault-deployer-gas-funding-authorization-v1.json",
      "utf8",
    ),
  );
  const unsigned = JSON.parse(
    fs.readFileSync(
      "ops/mainnet0/wc-void-market-vault-deployer-gas-unsigned-funding-v1.json",
      "utf8",
    ),
  );

  const result =
    await revalidateWcVoidDeployerGasFundingPreSignV1({
      rpc_url:
        process.env.VOID_WC_VOID_CHAIN2050_RPC_URL ||
        "http://127.0.0.1:8545/",
      request_timeout_ms: 5000,
      max_response_bytes: 1048576,
      authorization,
      unsigned,
    });

  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  if (result.ok !== true) process.exitCode = 1;
}

if (
  process.argv[1]?.endsWith(
    "void-wc-void-market-vault-deployer-gas-pre-sign-revalidation-v1.mjs",
  )
) {
  main().catch((error) => {
    console.error(error?.code || error?.message || error);
    process.exit(1);
  });
}
