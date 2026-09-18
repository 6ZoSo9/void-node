#!/usr/bin/env node
import crypto from "node:crypto";
import * as http from "node:http";
import {
  getAddress,
  getCreateAddress,
} from "ethers";

import {
  buildBuyVoidPresaleFulfillmentDeploymentDataV1,
} from "./buy-void-presale-fulfillment-deployment-attestation-v1.mjs";

export const VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_RESOLUTION_OBSERVER_V1 =
  "VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_RESOLUTION_OBSERVER_V1";

export const VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_RESOLUTION_OBSERVER_AUTHORITY_V1 = {
  explicit_deployer_address_required: true,
  canonical_chain_id: "2050",
  loopback_http_only: true,
  read_only_rpc_methods: [
    "eth_chainId",
    "eth_blockNumber",
    "eth_getBlockByNumber",
    "eth_getTransactionCount",
    "eth_getBalance",
    "eth_maxPriorityFeePerGas",
    "eth_estimateGas",
  ],
  pending_nonce_revalidation_required: true,
  observation_block_hash_revalidation_required: true,
  exact_creation_data_required: true,
  create_address_derived_only: true,
  inherited_fee_caps_checked_not_changed: true,
  deployment_gas_limit_derived_from_estimate: true,
  payment_keyed_runtime_gas_ceiling_resolved: false,
  rpc_mutation: false,
  filesystem_read: false,
  filesystem_write: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  transaction_construction: false,
  transaction_broadcast: false,
  deployment: false,
  chain2050_mutation: false,
  inventory_funding: false,
  runtime_enablement_change: false,
  production_configuration_mutation: false,
  public_activation: false,
  automatic_retry: false,
  money_movement: false,
};

const ADDRESS = /^0x[0-9a-f]{40}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const HEX_QUANTITY =
  /^0x(?:0|[1-9a-f][0-9a-f]*)$/i;
const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RESPONSE_BYTES = 1_048_576;
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const MAX_REQUEST_BYTES = 128 * 1024;
const MAX_DEPLOYMENT_GAS_ESTIMATE = 20_000_000n;
const BPS = 10_000n;

function text(value) {
  return typeof value === "string"
    ? value.trim()
    : String(value ?? "").trim();
}

function sha256(value) {
  return crypto
    .createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

function address(value) {
  const raw = text(value);
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) {
    return "";
  }
  try {
    const normalized =
      getAddress(raw).toLowerCase();
    return ADDRESS.test(normalized)
      ? normalized
      : "";
  } catch {
    return "";
  }
}

function hash(value) {
  const raw = text(value).toLowerCase();
  return HASH.test(raw) ? raw : "";
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

function positiveDecimal(value, maximum = null) {
  try {
    const raw = text(value);
    if (!/^[1-9][0-9]*$/.test(raw)) {
      return null;
    }
    const parsed = BigInt(raw);
    if (
      maximum !== null &&
      parsed > maximum
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function boundedPositive(
  value,
  fallback,
  maximum,
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }
  const parsed = Number(value);
  return (
    Number.isSafeInteger(parsed) &&
    parsed > 0 &&
    parsed <= maximum
  )
    ? parsed
    : null;
}

function ceilMulDiv(
  value,
  multiplier,
  denominator,
) {
  return (
    value * multiplier +
    denominator -
    1n
  ) / denominator;
}

function normalizeRpcPolicy(input) {
  let url;
  try {
    url = new URL(text(input?.rpc_url));
  } catch {
    return null;
  }
  const host = url.hostname
    .toLowerCase()
    .replace(/^\[/, "")
    .replace(/\]$/, "");
  const hostname =
    host === "127.0.0.1"
      ? "127.0.0.1"
      : host === "::1"
        ? "::1"
        : null;
  const port = Number(url.port || 0);
  const timeout = boundedPositive(
    input?.request_timeout_ms,
    DEFAULT_TIMEOUT_MS,
    MAX_TIMEOUT_MS,
  );
  const maxBytes = boundedPositive(
    input?.max_response_bytes,
    DEFAULT_MAX_RESPONSE_BYTES,
    MAX_RESPONSE_BYTES,
  );
  if (
    !hostname ||
    url.protocol !== "http:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !Number.isInteger(port) ||
    port <= 0 ||
    port > 65_535 ||
    !url.pathname.startsWith("/") ||
    url.pathname.length > 256 ||
    timeout === null ||
    maxBytes === null
  ) {
    return null;
  }
  const rendered =
    hostname === "::1"
      ? "[::1]"
      : hostname;
  const normalized =
    "http://" +
    rendered +
    ":" +
    String(port) +
    url.pathname;
  return {
    rpc_url: normalized,
    rpc_url_fingerprint_sha256:
      sha256(normalized),
    hostname,
    port,
    path: url.pathname,
    request_timeout_ms: timeout,
    max_response_bytes: maxBytes,
  };
}

function createHttpTransport(policy) {
  let nextId = 0;
  return async (call) => {
    const id = ++nextId;
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id,
      method: call.method,
      params: call.params,
    });

    if (
      Buffer.byteLength(body, "utf8") >
      MAX_REQUEST_BYTES
    ) {
      throw new Error(
        "deployment_resolution_request_too_large",
      );
    }

    return await new Promise(
      (resolve, reject) => {
        let settled = false;
        const finish = (
          error,
          value = undefined,
        ) => {
          if (settled) return;
          settled = true;
          if (error) reject(error);
          else resolve(value);
        };

        const request = http.request(
          {
            protocol: "http:",
            hostname: policy.hostname,
            port: policy.port,
            path: policy.path,
            method: "POST",
            family:
              policy.hostname === "::1"
                ? 6
                : 4,
            agent: false,
            headers: {
              Accept: "application/json",
              "Content-Type":
                "application/json",
              "Content-Length": String(
                Buffer.byteLength(
                  body,
                  "utf8",
                ),
              ),
              Connection: "close",
              "User-Agent":
                "void-buy-void-fulfillment-deployment-resolution-v1",
            },
          },
          (response) => {
            const chunks = [];
            let total = 0;
            response.on(
              "data",
              (chunk) => {
                const buffer =
                  Buffer.isBuffer(chunk)
                    ? chunk
                    : Buffer.from(chunk);
                total += buffer.length;
                if (
                  total >
                  policy.max_response_bytes
                ) {
                  request.destroy(
                    new Error(
                      "deployment_resolution_response_too_large",
                    ),
                  );
                  return;
                }
                chunks.push(buffer);
              },
            );
            response.on("end", () => {
              if (
                Number(
                  response.statusCode || 0,
                ) !== 200
              ) {
                finish(
                  new Error(
                    "deployment_resolution_http_status_invalid",
                  ),
                );
                return;
              }
              let payload;
              try {
                payload = JSON.parse(
                  Buffer.concat(
                    chunks,
                  ).toString("utf8"),
                );
              } catch {
                finish(
                  new Error(
                    "deployment_resolution_rpc_json_invalid",
                  ),
                );
                return;
              }
              if (
                !payload ||
                payload.jsonrpc !== "2.0" ||
                payload.id !== id ||
                payload.error ||
                !Object.prototype
                  .hasOwnProperty.call(
                    payload,
                    "result",
                  )
              ) {
                finish(
                  new Error(
                    "deployment_resolution_rpc_envelope_invalid",
                  ),
                );
                return;
              }
              finish(
                null,
                payload.result,
              );
            });
          },
        );

        request.setTimeout(
          policy.request_timeout_ms,
        );
        request.on("timeout", () => {
          request.destroy(
            new Error(
              "deployment_resolution_timeout",
            ),
          );
        });
        request.on(
          "error",
          (error) => finish(error),
        );
        request.end(body);
      },
    );
  };
}

function held(reason, options = {}) {
  return {
    ok: false,
    status: "held",
    marker:
      VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_RESOLUTION_OBSERVER_V1,
    version: 1,
    reason,
    rpc_url_fingerprint_sha256:
      options.rpc_url_fingerprint_sha256 ??
      null,
    rpc_methods_used:
      options.rpc_methods_used || [],
    observation: null,
    rpc_call_performed:
      (options.rpc_methods_used || [])
        .length > 0,
    mutation_performed: false,
    credential_access_performed: false,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_construction_performed:
      false,
    transaction_broadcast_performed:
      false,
    deployment_performed: false,
    chain2050_mutation_performed: false,
    inventory_funding_performed: false,
    runtime_enablement_changed: false,
    production_configuration_mutation:
      false,
    public_activation_performed: false,
    automatic_retry_allowed: false,
    money_movement_performed: false,
    ...(options.detail
      ? { detail: options.detail }
      : {}),
  };
}

export async function observeBuyVoidPresaleFulfillmentDeploymentResolutionV1(
  input,
) {
  const rpcPolicy =
    normalizeRpcPolicy(input);
  const deployer = address(
    input?.deployer_address,
  );
  const token = address(
    input?.void_token_address,
  );
  const fulfiller = address(
    input?.fulfiller_address,
  );
  const predecessor = address(
    input?.predecessor_address,
  );
  const maxFeeCap =
    positiveDecimal(
      input?.max_fee_per_gas_wei,
    );
  const priorityCap =
    positiveDecimal(
      input?.max_priority_fee_per_gas_wei,
    );
  const gasMultiplier =
    positiveDecimal(
      input?.gas_limit_multiplier_bps,
      30_000n,
    );

  if (
    !rpcPolicy ||
    !deployer ||
    !token ||
    !fulfiller ||
    !predecessor ||
    maxFeeCap === null ||
    priorityCap === null ||
    priorityCap > maxFeeCap ||
    gasMultiplier === null ||
    gasMultiplier < BPS ||
    gasMultiplier > 30_000n
  ) {
    return held(
      "deployment_resolution_input_invalid",
      {
        rpc_url_fingerprint_sha256:
          rpcPolicy
            ?.rpc_url_fingerprint_sha256 ??
          null,
      },
    );
  }

  let deploymentData;
  try {
    deploymentData =
      buildBuyVoidPresaleFulfillmentDeploymentDataV1({
        compiled_identity:
          input.compiled_identity,
        void_token_address: token,
        fulfiller_address: fulfiller,
        predecessor_address: predecessor,
      });
  } catch (error) {
    return held(
      "deployment_resolution_compiled_identity_or_constructor_invalid",
      {
        rpc_url_fingerprint_sha256:
          rpcPolicy
            .rpc_url_fingerprint_sha256,
        detail: {
          error:
            text(
              error?.message || error,
            ).slice(0, 240),
        },
      },
    );
  }

  const methods = [];
  const transport =
    input?.transport ||
    createHttpTransport(rpcPolicy);

  const call = async (
    method,
    params,
  ) => {
    methods.push(method);
    return await transport({
      method,
      params,
    });
  };

  try {
    const chainId =
      quantity(
        await call(
          "eth_chainId",
          [],
        ),
      );
    if (chainId !== 2050n) {
      return held(
        "deployment_resolution_chain_id_mismatch",
        {
          rpc_url_fingerprint_sha256:
            rpcPolicy
              .rpc_url_fingerprint_sha256,
          rpc_methods_used: methods,
        },
      );
    }

    const head =
      quantity(
        await call(
          "eth_blockNumber",
          [],
        ),
      );
    if (head === null || head <= 0n) {
      return held(
        "deployment_resolution_head_invalid",
        {
          rpc_url_fingerprint_sha256:
            rpcPolicy
              .rpc_url_fingerprint_sha256,
          rpc_methods_used: methods,
        },
      );
    }
    const headTag =
      "0x" + head.toString(16);

    const blockA =
      await call(
        "eth_getBlockByNumber",
        [headTag, false],
      );
    const blockHashA =
      hash(blockA?.hash);
    const baseFee =
      quantity(
        blockA?.baseFeePerGas,
      );
    if (
      !blockHashA ||
      quantity(blockA?.number) !==
        head ||
      baseFee === null
    ) {
      return held(
        "deployment_resolution_observation_block_invalid",
        {
          rpc_url_fingerprint_sha256:
            rpcPolicy
              .rpc_url_fingerprint_sha256,
          rpc_methods_used: methods,
        },
      );
    }

    const latestNonce =
      quantity(
        await call(
          "eth_getTransactionCount",
          [deployer, headTag],
        ),
      );
    const pendingNonceA =
      quantity(
        await call(
          "eth_getTransactionCount",
          [deployer, "pending"],
        ),
      );
    const balance =
      quantity(
        await call(
          "eth_getBalance",
          [deployer, headTag],
        ),
      );
    const priority =
      quantity(
        await call(
          "eth_maxPriorityFeePerGas",
          [],
        ),
      );

    if (
      latestNonce === null ||
      pendingNonceA === null ||
      pendingNonceA < latestNonce ||
      balance === null ||
      priority === null ||
      priority <= 0n
    ) {
      return held(
        "deployment_resolution_account_or_fee_observation_invalid",
        {
          rpc_url_fingerprint_sha256:
            rpcPolicy
              .rpc_url_fingerprint_sha256,
          rpc_methods_used: methods,
        },
      );
    }

    const estimate =
      quantity(
        await call(
          "eth_estimateGas",
          [
            {
              from: deployer,
              data:
                deploymentData
                  .deployment_data,
              value: "0x0",
            },
            headTag,
          ],
        ),
      );
    if (
      estimate === null ||
      estimate <= 0n ||
      estimate >
        MAX_DEPLOYMENT_GAS_ESTIMATE
    ) {
      return held(
        "deployment_resolution_gas_estimate_invalid",
        {
          rpc_url_fingerprint_sha256:
            rpcPolicy
              .rpc_url_fingerprint_sha256,
          rpc_methods_used: methods,
        },
      );
    }

    const pendingNonceB =
      quantity(
        await call(
          "eth_getTransactionCount",
          [deployer, "pending"],
        ),
      );
    const blockB =
      await call(
        "eth_getBlockByNumber",
        [headTag, false],
      );

    if (
      pendingNonceB === null ||
      pendingNonceB !== pendingNonceA ||
      hash(blockB?.hash) !==
        blockHashA ||
      quantity(blockB?.number) !==
        head ||
      quantity(blockB?.baseFeePerGas) !==
        baseFee
    ) {
      return held(
        "deployment_resolution_revalidation_mismatch",
        {
          rpc_url_fingerprint_sha256:
            rpcPolicy
              .rpc_url_fingerprint_sha256,
          rpc_methods_used: methods,
        },
      );
    }

    const paddedGasLimit =
      ceilMulDiv(
        estimate,
        gasMultiplier,
        BPS,
      );
    const observedFeeNeed =
      baseFee * 2n + priority;
    const feeCapsSufficient =
      priority <= priorityCap &&
      observedFeeNeed <= maxFeeCap;
    const maxDeploymentCost =
      paddedGasLimit *
      maxFeeCap;
    const balanceSufficient =
      balance >= maxDeploymentCost;

    let futureAddress;
    try {
      futureAddress =
        getCreateAddress({
          from: deployer,
          nonce: pendingNonceA,
        }).toLowerCase();
    } catch {
      return held(
        "deployment_resolution_create_address_failed",
        {
          rpc_url_fingerprint_sha256:
            rpcPolicy
              .rpc_url_fingerprint_sha256,
          rpc_methods_used: methods,
        },
      );
    }

    const observation = {
      chain_id: "2050",
      rpc_url_fingerprint_sha256:
        rpcPolicy
          .rpc_url_fingerprint_sha256,
      observation_block_number:
        head.toString(),
      observation_block_hash:
        blockHashA,
      deployer_address: deployer,
      latest_nonce:
        latestNonce.toString(),
      pending_nonce:
        pendingNonceA.toString(),
      pending_transactions_present:
        pendingNonceA > latestNonce,
      future_contract_address:
        futureAddress,
      deployer_balance_wei:
        balance.toString(),
      base_fee_per_gas_wei:
        baseFee.toString(),
      observed_priority_fee_per_gas_wei:
        priority.toString(),
      inherited_max_fee_per_gas_wei:
        maxFeeCap.toString(),
      inherited_max_priority_fee_per_gas_wei:
        priorityCap.toString(),
      observed_two_x_base_plus_priority_wei:
        observedFeeNeed.toString(),
      inherited_fee_caps_sufficient:
        feeCapsSufficient,
      deployment_gas_estimate:
        estimate.toString(),
      deployment_gas_multiplier_bps:
        gasMultiplier.toString(),
      proposed_deployment_gas_limit:
        paddedGasLimit.toString(),
      proposed_max_deployment_cost_wei:
        maxDeploymentCost.toString(),
      deployer_balance_sufficient_for_max_cost:
        balanceSufficient,
      constructor_deployment_data_keccak256:
        deploymentData
          .deployment_data_keccak256,
      exact_creation_data_bound: true,
      pending_nonce_revalidated: true,
      observation_block_hash_revalidated:
        true,
      payment_keyed_runtime_gas_ceiling_resolved:
        false,
    };

    return {
      ok: true,
      status:
        feeCapsSufficient &&
        balanceSufficient
          ? "deployment_resolution_observed_held_on_runtime_gas_ceiling_and_deployer_review"
          : "deployment_resolution_observed_held_on_fee_or_balance_and_runtime_gas_ceiling",
      marker:
        VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_RESOLUTION_OBSERVER_V1,
      version: 1,
      rpc_url_fingerprint_sha256:
        rpcPolicy
          .rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
      observation,
      read_only_observation_complete: true,
      deployer_reviewed: false,
      payment_keyed_runtime_gas_ceiling_resolved:
        false,
      unsigned_transaction_constructed:
        false,
      signing_performed: false,
      transaction_broadcast_performed:
        false,
      deployment_performed: false,
      chain2050_mutation_performed: false,
      inventory_funding_performed: false,
      runtime_enablement_changed: false,
      production_configuration_mutation:
        false,
      public_activation_performed: false,
      automatic_retry_allowed: false,
      money_movement_performed: false,
      next_gate:
        "review_explicit_deployer_and_local_payment_keyed_runtime_gas_measurement",
      authority:
        VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_RESOLUTION_OBSERVER_AUTHORITY_V1,
    };
  } catch (error) {
    return held(
      "deployment_resolution_rpc_failed",
      {
        rpc_url_fingerprint_sha256:
          rpcPolicy
            .rpc_url_fingerprint_sha256,
        rpc_methods_used: methods,
        detail: {
          error_class:
            text(
              error?.name || "Error",
            ).slice(0, 80),
          message:
            text(
              error?.message || error,
            ).slice(0, 240),
        },
      },
    );
  }
}
