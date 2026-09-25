#!/usr/bin/env node
import crypto from "node:crypto";
import * as http from "node:http";
import fs from "node:fs";
import { getAddress, getCreateAddress } from "ethers";

import {
  prepareWcVoidMarketVaultDeploymentV1,
} from "./void-wc-void-market-vault-deployment-preparation-v1.mjs";

export const VOID_WC_VOID_MARKET_VAULT_DEPLOYMENT_OBSERVER_V1 =
  "VOID_WC_VOID_MARKET_VAULT_DEPLOYMENT_OBSERVER_V1";

export const AUTHORITY = Object.freeze({
  explicit_deployer_address_required: true,
  loopback_http_only: true,
  canonical_chain_id: 2050,
  read_only_rpc_methods: Object.freeze([
    "eth_chainId",
    "eth_blockNumber",
    "eth_getBlockByNumber",
    "eth_getTransactionCount",
    "eth_getBalance",
    "eth_maxPriorityFeePerGas",
    "eth_getCode",
    "eth_estimateGas",
  ]),
  pending_nonce_revalidation_required: true,
  observation_block_hash_revalidation_required: true,
  exact_authorized_constructor_payload_required: true,
  create_address_derived_only: true,
  rpc_mutation: false,
  credential_access: false,
  wallet_or_signer_access: false,
  private_key_access: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_broadcast: false,
  deployment: false,
  chain2050_write: false,
  deployer_funding: false,
  inventory_funding: false,
  market_activation: false,
  public_presale_activation: false,
  wc_mutation: false,
  funds_movement: false,
  automatic_retry: false,
});

const ADDRESS = /^0x[0-9a-f]{40}$/u;
const HASH = /^0x[0-9a-f]{64}$/u;
const HEX_QUANTITY = /^0x(?:0|[1-9a-f][0-9a-f]*)$/iu;
const BPS = 10_000n;
const MAX_DEPLOYMENT_GAS_ESTIMATE = 25_000_000n;
const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_RESPONSE_BYTES = 1_048_576;
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;

const FORBIDDEN_DEPLOYER_ADDRESSES = new Set([
  "0x470075b85352eb86f7d089fb9ba88945f12aad94",
  "0x554ecc7be6f0b7cc3d1c578c2bb848e535c02514",
  "0xf0d64c62a87034e1838db8ec1e2e33666814e7d9",
  "0xa40a43adfd174f88309173cb3daa6e09c10154a7",
  "0xc884f631c3881b8b672bfcbf019c856146cd7f73",
  "0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b",
  "0x2f1e0005e865b772b268bd8c797bf3eaa901d97e",
  "0x2b4d94ce678ec0bc17924b83236b714339c70b9d",
  "0xdadb70747fb39e79c867811f5a5592c1611bcb52",
  "0xcf4239ec209bbdb25f5c22903a5aa2050752dd24",
  "0x4b3f78e86b0427f750938e7b022d98aa4275f2f7",
  "0x72b2dead8ce4728a1f3b800f96502a7ace091b81",
  "0xe2670614ab3cab77999847f3fd2ff6fc34fe2292",
  "0x77dfeedd19a4741f299c902ad5bbe0de917a9e59",
  "0x8dc0d4abc9ecd40b5e8f6b4c2fe1370822e52bc4",
  "0x5730ca2ac38f0e39bf46c121fbdf581638fa72bc",
  "0xd2571d5d471d6574f7d57d0a3aca5b34d0c8da6f",
]);

function text(value) {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeAddress(value) {
  const raw = text(value);
  if (!/^0x[0-9a-fA-F]{40}$/u.test(raw)) return "";
  try {
    const normalized = getAddress(raw).toLowerCase();
    return ADDRESS.test(normalized) ? normalized : "";
  } catch {
    return "";
  }
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

function positiveDecimal(value, max = null) {
  const raw = text(value);
  if (!/^[1-9][0-9]*$/u.test(raw)) return null;
  try {
    const parsed = BigInt(raw);
    if (max !== null && parsed > max) return null;
    return parsed;
  } catch {
    return null;
  }
}

function ceilMulDiv(value, multiplier, denominator) {
  return (value * multiplier + denominator - 1n) / denominator;
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
  const rendered = hostname === "::1" ? "[::1]" : hostname;
  const normalized = "http://" + rendered + ":" + port + (url.pathname || "/");
  return {
    normalized,
    hostname,
    port,
    path: url.pathname || "/",
    timeout,
    maxBytes,
    fingerprint: sha256(normalized),
  };
}

function createTransport(policy) {
  let id = 0;
  return async ({ method, params }) => {
    const requestId = ++id;
    const body = JSON.stringify({ jsonrpc: "2.0", id: requestId, method, params });
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
            "User-Agent": "void-wc-void-market-vault-deployment-observer-v1",
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
            if (res.statusCode !== 200) return reject(new Error("rpc_http_status_invalid"));
            try {
              const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
              if (
                payload?.jsonrpc !== "2.0" ||
                payload?.id !== requestId ||
                payload?.error ||
                !Object.prototype.hasOwnProperty.call(payload, "result")
              ) {
                return reject(new Error("rpc_envelope_invalid"));
              }
              resolve(payload.result);
            } catch (error) {
              reject(error);
            }
          });
        },
      );
      req.setTimeout(policy.timeout, () => req.destroy(new Error("rpc_timeout")));
      req.on("error", reject);
      req.end(body);
    });
  };
}

function held(reason, methods = [], detail = undefined) {
  return Object.freeze({
    ok: false,
    status: "HOLD",
    marker: VOID_WC_VOID_MARKET_VAULT_DEPLOYMENT_OBSERVER_V1,
    reason,
    rpc_methods_used: Object.freeze([...methods]),
    observation: null,
    deployment_authorized: false,
    authority: AUTHORITY,
    ...(detail ? { detail } : {}),
  });
}

export async function observeWcVoidMarketVaultDeploymentV1(input) {
  const rpc = normalizeRpc(input);
  const deployer = normalizeAddress(input?.deployer_address);
  const maxFee = positiveDecimal(input?.max_fee_per_gas_wei);
  const maxPriority = positiveDecimal(input?.max_priority_fee_per_gas_wei);
  const multiplier = positiveDecimal(input?.gas_limit_multiplier_bps, 30000n);

  if (
    !rpc ||
    !deployer ||
    FORBIDDEN_DEPLOYER_ADDRESSES.has(deployer) ||
    maxFee === null ||
    maxPriority === null ||
    maxPriority > maxFee ||
    multiplier === null ||
    multiplier < BPS
  ) {
    return held("deployment_observer_input_invalid");
  }

  let prepared;
  try {
    prepared = prepareWcVoidMarketVaultDeploymentV1({
      manifest: input.compiled_identity,
      creationBytecodeHex: input.creation_bytecode_hex,
      bindings: input.bindings,
    });
  } catch (error) {
    return held("authorized_deployment_payload_invalid", [], {
      message: text(error?.code || error?.message || error).slice(0, 200),
    });
  }
  if (prepared.status !== "SOURCE_READY" || prepared.deployment_data_constructed !== true) {
    return held("authorized_deployment_payload_not_ready");
  }

  const creation = text(input.creation_bytecode_hex).toLowerCase();
  const deploymentData =
    creation + prepared.abi_encoded_constructor_arguments.slice(2);
  const deploymentBytes = Buffer.from(deploymentData.slice(2), "hex");
  if (sha256(deploymentBytes) !== prepared.deployment_data_sha256) {
    return held("deployment_data_sha256_mismatch");
  }

  const methods = [];
  const transport = input.transport || createTransport(rpc);
  const call = async (method, params) => {
    methods.push(method);
    return await transport({ method, params });
  };

  try {
    const chainId = quantity(await call("eth_chainId", []));
    if (chainId !== 2050n) return held("chain_id_mismatch", methods);

    const head = quantity(await call("eth_blockNumber", []));
    if (head === null || head <= 0n) return held("head_invalid", methods);
    const headTag = "0x" + head.toString(16);

    const blockA = await call("eth_getBlockByNumber", [headTag, false]);
    const blockHash = hash(blockA?.hash);
    const baseFee = quantity(blockA?.baseFeePerGas);
    if (!blockHash || quantity(blockA?.number) !== head || baseFee === null) {
      return held("observation_block_invalid", methods);
    }

    const code = text(await call("eth_getCode", [deployer, headTag])).toLowerCase();
    if (code !== "0x") return held("deployer_has_code", methods);

    const latestNonce = quantity(await call("eth_getTransactionCount", [deployer, headTag]));
    const pendingNonceA = quantity(await call("eth_getTransactionCount", [deployer, "pending"]));
    const balance = quantity(await call("eth_getBalance", [deployer, headTag]));
    const priority = quantity(await call("eth_maxPriorityFeePerGas", []));
    if (
      latestNonce === null ||
      pendingNonceA === null ||
      pendingNonceA < latestNonce ||
      balance === null ||
      priority === null ||
      priority <= 0n
    ) {
      return held("account_or_fee_observation_invalid", methods);
    }

    const estimate = quantity(
      await call("eth_estimateGas", [
        { from: deployer, data: deploymentData, value: "0x0" },
        headTag,
      ]),
    );
    if (
      estimate === null ||
      estimate <= 0n ||
      estimate > MAX_DEPLOYMENT_GAS_ESTIMATE
    ) {
      return held("deployment_gas_estimate_invalid", methods);
    }

    const pendingNonceB = quantity(await call("eth_getTransactionCount", [deployer, "pending"]));
    const blockB = await call("eth_getBlockByNumber", [headTag, false]);
    if (
      pendingNonceB !== pendingNonceA ||
      hash(blockB?.hash) !== blockHash ||
      quantity(blockB?.number) !== head ||
      quantity(blockB?.baseFeePerGas) !== baseFee
    ) {
      return held("revalidation_mismatch", methods);
    }

    const gasLimit = ceilMulDiv(estimate, multiplier, BPS);
    const observedFeeNeed = baseFee * 2n + priority;
    const feeCapsSufficient = priority <= maxPriority && observedFeeNeed <= maxFee;
    const maxCost = gasLimit * maxFee;
    const balanceSufficient = balance >= maxCost;
    const predicted = getCreateAddress({ from: deployer, nonce: pendingNonceA }).toLowerCase();

    return Object.freeze({
      ok: true,
      status:
        feeCapsSufficient && balanceSufficient
          ? "OBSERVED_READY_FOR_REVIEW"
          : "OBSERVED_HOLD_ON_FEE_OR_BALANCE",
      marker: VOID_WC_VOID_MARKET_VAULT_DEPLOYMENT_OBSERVER_V1,
      rpc_url_fingerprint_sha256: rpc.fingerprint,
      rpc_methods_used: Object.freeze([...methods]),
      observation: Object.freeze({
        chain_id: "2050",
        observation_block_number: head.toString(),
        observation_block_hash: blockHash,
        deployer_address: deployer,
        deployer_has_code: false,
        latest_nonce: latestNonce.toString(),
        pending_nonce: pendingNonceA.toString(),
        pending_transactions_present: pendingNonceA > latestNonce,
        predicted_contract_address: predicted,
        deployer_balance_wei: balance.toString(),
        base_fee_per_gas_wei: baseFee.toString(),
        observed_priority_fee_per_gas_wei: priority.toString(),
        proposed_max_fee_per_gas_wei: maxFee.toString(),
        proposed_max_priority_fee_per_gas_wei: maxPriority.toString(),
        observed_two_x_base_plus_priority_wei: observedFeeNeed.toString(),
        fee_caps_sufficient: feeCapsSufficient,
        deployment_gas_estimate: estimate.toString(),
        deployment_gas_multiplier_bps: multiplier.toString(),
        proposed_deployment_gas_limit: gasLimit.toString(),
        proposed_max_deployment_cost_wei: maxCost.toString(),
        deployer_balance_sufficient_for_max_cost: balanceSufficient,
        deployment_data_sha256: prepared.deployment_data_sha256,
        exact_authorized_constructor_payload_bound: true,
        pending_nonce_revalidated: true,
        observation_block_hash_revalidated: true,
      }),
      deployment_authorized: false,
      transaction_construction_performed: false,
      transaction_signing_performed: false,
      transaction_broadcast_performed: false,
      deployment_performed: false,
      deployer_funding_performed: false,
      inventory_funding_performed: false,
      market_activation_performed: false,
      public_presale_activation_performed: false,
      funds_movement_performed: false,
      next_gate:
        "review_observation_then_separately_authorize_deployer_funding_or_unsigned_transaction_construction",
      authority: AUTHORITY,
    });
  } catch (error) {
    return held("rpc_observation_failed", methods, {
      error_class: text(error?.name || "Error").slice(0, 80),
      message: text(error?.message || error).slice(0, 220),
    });
  }
}

async function main() {
  const deployer = text(process.argv[2]);
  if (!deployer) throw new Error("usage: <deployer-address>");

  const compiled_identity = JSON.parse(
    fs.readFileSync(
      "ops/mainnet0/wc-void-market-vault-v2-compiled-identity-v1.json",
      "utf8",
    ),
  );
  const creation_bytecode_hex = fs.readFileSync(
    "ops/mainnet0/wc-void-market-vault-v2-creation-bytecode.hex",
    "utf8",
  );
  const prep = JSON.parse(
    fs.readFileSync(
      "ops/mainnet0/wc-void-market-vault-deployment-preparation-v1.json",
      "utf8",
    ),
  );

  const result = await observeWcVoidMarketVaultDeploymentV1({
    rpc_url: process.env.VOID_WC_VOID_CHAIN2050_RPC_URL || "http://127.0.0.1:8545/",
    deployer_address: deployer,
    max_fee_per_gas_wei:
      process.env.VOID_WC_VOID_DEPLOYMENT_MAX_FEE_PER_GAS_WEI || "3000000000",
    max_priority_fee_per_gas_wei:
      process.env.VOID_WC_VOID_DEPLOYMENT_MAX_PRIORITY_FEE_PER_GAS_WEI ||
      "1000000000",
    gas_limit_multiplier_bps:
      process.env.VOID_WC_VOID_DEPLOYMENT_GAS_LIMIT_MULTIPLIER_BPS || "12000",
    request_timeout_ms: 5000,
    max_response_bytes: 1048576,
    compiled_identity,
    creation_bytecode_hex,
    bindings: prep.bindings,
  });

  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  if (result.ok !== true) process.exitCode = 1;
}

if (process.argv[1]?.endsWith("void-wc-void-market-vault-deployment-observer-v1.mjs")) {
  main().catch((error) => {
    console.error(error?.message || error);
    process.exit(1);
  });
}
