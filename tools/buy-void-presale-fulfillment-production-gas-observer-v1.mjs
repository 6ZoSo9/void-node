#!/usr/bin/env node
import crypto from "node:crypto";
import * as http from "node:http";
import {
  Interface,
  getAddress,
} from "ethers";

import {
  VOID_BUY_VOID_PRESALE_FULFILLMENT_LOCAL_GAS_EVIDENCE_RECORD_V1,
} from "../src/economic/buy_void_presale_fulfillment_local_gas_evidence_v1.js";

export const VOID_BUY_VOID_PRESALE_FULFILLMENT_PRODUCTION_GAS_OBSERVER_V1 =
  "VOID_BUY_VOID_PRESALE_FULFILLMENT_PRODUCTION_GAS_OBSERVER_V1";

export const VOID_BUY_VOID_PRESALE_FULFILLMENT_PRODUCTION_GAS_OBSERVER_AUTHORITY_V1 = {
  canonical_chain_id: "2050",
  loopback_http_only: true,
  fixed_block_observation: true,
  real_void_token_execution_path_required: true,
  zero_balance_probe_recipient_required: true,
  unused_payment_id_required: true,
  fulfillment_contract_inventory_required: true,
  estimate_gas_only: true,
  post_estimate_state_revalidation_required: true,
  local_lower_bound_evidence_required: true,
  candidate_ceiling_not_accepted: true,
  read_only_rpc_methods: [
    "eth_chainId",
    "eth_blockNumber",
    "eth_getBlockByNumber",
    "eth_getCode",
    "eth_call",
    "eth_getBalance",
    "eth_estimateGas",
  ],
  rpc_mutation: false,
  filesystem_read: false,
  filesystem_write: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  deployment: false,
  chain2050_mutation: false,
  inventory_funding: false,
  production_configuration_mutation: false,
  runtime_enablement_change: false,
  public_activation: false,
  automatic_retry: false,
  money_movement: false,
};

const ADDRESS = /^0x[0-9a-f]{40}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const HEX_QUANTITY =
  /^0x(?:0|[1-9a-f][0-9a-f]*)$/i;
const HEX_BYTES =
  /^0x(?:[0-9a-f]{2})*$/i;
const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RESPONSE_BYTES = 1_048_576;
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const MAX_REQUEST_BYTES = 64 * 1024;
const MAX_ESTIMATE = 5_000_000n;
const BPS = 10_000n;
const CANDIDATE_MULTIPLIER_BPS = 15_000n;
const ROUNDING_QUANTUM = 10_000n;
const LOCAL_LOWER_BOUND =
  BigInt(
    VOID_BUY_VOID_PRESALE_FULFILLMENT_LOCAL_GAS_EVIDENCE_RECORD_V1
      .measurement.local_candidate_runtime_gas_ceiling,
  );

const FULFILLMENT = new Interface([
  "function voidToken() view returns (address)",
  "function fulfiller() view returns (address)",
  "function predecessor() view returns (address)",
  "function remainingInventoryAtoms() view returns (uint256)",
  "function isFulfilled(bytes32) view returns (bool)",
  "function fulfill(bytes32,address,uint256)",
]);

const TOKEN = new Interface([
  "function balanceOf(address) view returns (uint256)",
]);

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

function bytes(value) {
  const raw = text(value).toLowerCase();
  return HEX_BYTES.test(raw) ? raw : "";
}

function quantity(value) {
  const raw = text(value);
  if (!HEX_QUANTITY.test(raw)) {
    return null;
  }
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function positiveDecimal(value) {
  try {
    const raw = text(value);
    if (!/^[1-9][0-9]*$/.test(raw)) {
      return null;
    }
    return BigInt(raw);
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

function roundUp(value, quantum) {
  return (
    (value + quantum - 1n) /
    quantum
  ) * quantum;
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
        "production_gas_observer_request_too_large",
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
                "void-buy-void-production-gas-observer-v1",
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
                      "production_gas_observer_response_too_large",
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
                    "production_gas_observer_http_status_invalid",
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
                    "production_gas_observer_rpc_json_invalid",
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
                    "production_gas_observer_rpc_envelope_invalid",
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
              "production_gas_observer_timeout",
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
      VOID_BUY_VOID_PRESALE_FULFILLMENT_PRODUCTION_GAS_OBSERVER_V1,
    version: 1,
    reason,
    rpc_url_fingerprint_sha256:
      options.rpc_url_fingerprint_sha256 ??
      null,
    rpc_methods_used:
      options.rpc_methods_used || [],
    observation: null,
    production_runtime_gas_ceiling_accepted:
      false,
    rpc_call_performed:
      (options.rpc_methods_used || [])
        .length > 0,
    mutation_performed: false,
    credential_access_performed: false,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed:
      false,
    deployment_performed: false,
    chain2050_mutation_performed: false,
    inventory_funding_performed: false,
    production_configuration_mutation:
      false,
    runtime_enablement_changed: false,
    public_activation_performed: false,
    automatic_retry_allowed: false,
    money_movement_performed: false,
    ...(options.detail
      ? { detail: options.detail }
      : {}),
  };
}

function decodeAddress(
  iface,
  name,
  raw,
) {
  const data = bytes(raw);
  if (!data) {
    throw new Error(
      "production_gas_view_result_invalid:" +
        name,
    );
  }
  const decoded =
    iface.decodeFunctionResult(
      name,
      data,
    );
  const value = address(decoded[0]);
  if (!value) {
    throw new Error(
      "production_gas_view_address_invalid:" +
        name,
    );
  }
  return value;
}

function decodeUint(
  iface,
  name,
  raw,
) {
  const data = bytes(raw);
  if (!data) {
    throw new Error(
      "production_gas_view_result_invalid:" +
        name,
    );
  }
  return BigInt(
    iface.decodeFunctionResult(
      name,
      data,
    )[0],
  );
}

function decodeBool(
  iface,
  name,
  raw,
) {
  const data = bytes(raw);
  if (!data) {
    throw new Error(
      "production_gas_view_result_invalid:" +
        name,
    );
  }
  return Boolean(
    iface.decodeFunctionResult(
      name,
      data,
    )[0],
  );
}

export async function observeBuyVoidPresaleFulfillmentProductionGasV1(
  input,
) {
  const rpcPolicy =
    normalizeRpcPolicy(input);
  const contract = address(
    input?.fulfillment_contract_address,
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
  const recipient = address(
    input?.probe_recipient,
  );
  const paymentId = hash(
    input?.probe_payment_id,
  );
  const amount =
    positiveDecimal(
      input?.probe_amount_atoms,
    );

  if (
    !rpcPolicy ||
    !contract ||
    !token ||
    !fulfiller ||
    !predecessor ||
    !recipient ||
    !paymentId ||
    amount === null ||
    contract === token ||
    contract === fulfiller ||
    recipient === contract ||
    recipient === token
  ) {
    return held(
      "production_gas_observer_input_invalid",
      {
        rpc_url_fingerprint_sha256:
          rpcPolicy
            ?.rpc_url_fingerprint_sha256 ??
          null,
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
    if (
      quantity(
        await call(
          "eth_chainId",
          [],
        ),
      ) !== 2050n
    ) {
      return held(
        "production_gas_observer_chain_id_mismatch",
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
        "production_gas_observer_head_invalid",
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
    if (
      !blockHashA ||
      quantity(blockA?.number) !==
        head
    ) {
      return held(
        "production_gas_observer_block_invalid",
        {
          rpc_url_fingerprint_sha256:
            rpcPolicy
              .rpc_url_fingerprint_sha256,
          rpc_methods_used: methods,
        },
      );
    }

    const contractCode = bytes(
      await call(
        "eth_getCode",
        [contract, headTag],
      ),
    );
    const tokenCode = bytes(
      await call(
        "eth_getCode",
        [token, headTag],
      ),
    );
    if (
      !contractCode ||
      contractCode === "0x" ||
      !tokenCode ||
      tokenCode === "0x"
    ) {
      return held(
        "production_gas_observer_code_missing",
        {
          rpc_url_fingerprint_sha256:
            rpcPolicy
              .rpc_url_fingerprint_sha256,
          rpc_methods_used: methods,
        },
      );
    }

    const view = async (
      iface,
      name,
      args = [],
      to = contract,
    ) =>
      await call(
        "eth_call",
        [
          {
            to,
            data:
              iface.encodeFunctionData(
                name,
                args,
              ),
          },
          headTag,
        ],
      );

    const observedToken =
      decodeAddress(
        FULFILLMENT,
        "voidToken",
        await view(
          FULFILLMENT,
          "voidToken",
        ),
      );
    const observedFulfiller =
      decodeAddress(
        FULFILLMENT,
        "fulfiller",
        await view(
          FULFILLMENT,
          "fulfiller",
        ),
      );
    const observedPredecessor =
      decodeAddress(
        FULFILLMENT,
        "predecessor",
        await view(
          FULFILLMENT,
          "predecessor",
        ),
      );
    const remaining =
      decodeUint(
        FULFILLMENT,
        "remainingInventoryAtoms",
        await view(
          FULFILLMENT,
          "remainingInventoryAtoms",
        ),
      );
    const fulfilledBefore =
      decodeBool(
        FULFILLMENT,
        "isFulfilled",
        await view(
          FULFILLMENT,
          "isFulfilled",
          [paymentId],
        ),
      );
    const contractTokenBefore =
      decodeUint(
        TOKEN,
        "balanceOf",
        await view(
          TOKEN,
          "balanceOf",
          [contract],
          token,
        ),
      );
    const recipientTokenBefore =
      decodeUint(
        TOKEN,
        "balanceOf",
        await view(
          TOKEN,
          "balanceOf",
          [recipient],
          token,
        ),
      );
    const nativeBalance =
      quantity(
        await call(
          "eth_getBalance",
          [fulfiller, headTag],
        ),
      );

    if (
      observedToken !== token ||
      observedFulfiller !==
        fulfiller ||
      observedPredecessor !==
        predecessor ||
      fulfilledBefore !== false ||
      recipientTokenBefore !== 0n ||
      remaining < amount ||
      contractTokenBefore < amount ||
      nativeBalance === null ||
      nativeBalance <= 0n
    ) {
      return held(
        "production_gas_observer_preconditions_not_met",
        {
          rpc_url_fingerprint_sha256:
            rpcPolicy
              .rpc_url_fingerprint_sha256,
          rpc_methods_used: methods,
          detail: {
            observed_token:
              observedToken,
            observed_fulfiller:
              observedFulfiller,
            observed_predecessor:
              observedPredecessor,
            payment_already_fulfilled:
              fulfilledBefore,
            recipient_token_balance_atoms:
              recipientTokenBefore.toString(),
            remaining_inventory_atoms:
              remaining.toString(),
            fulfillment_contract_token_balance_atoms:
              contractTokenBefore.toString(),
            fulfiller_native_balance_wei:
              nativeBalance?.toString() ??
              null,
          },
        },
      );
    }

    const calldata =
      FULFILLMENT.encodeFunctionData(
        "fulfill",
        [
          paymentId,
          recipient,
          amount,
        ],
      );

    const estimate =
      quantity(
        await call(
          "eth_estimateGas",
          [
            {
              from: fulfiller,
              to: contract,
              data: calldata,
              value: "0x0",
            },
            headTag,
          ],
        ),
      );

    if (
      estimate === null ||
      estimate <= 0n ||
      estimate > MAX_ESTIMATE
    ) {
      return held(
        "production_gas_observer_estimate_invalid",
        {
          rpc_url_fingerprint_sha256:
            rpcPolicy
              .rpc_url_fingerprint_sha256,
          rpc_methods_used: methods,
        },
      );
    }

    const fulfilledAfter =
      decodeBool(
        FULFILLMENT,
        "isFulfilled",
        await view(
          FULFILLMENT,
          "isFulfilled",
          [paymentId],
        ),
      );
    const contractTokenAfter =
      decodeUint(
        TOKEN,
        "balanceOf",
        await view(
          TOKEN,
          "balanceOf",
          [contract],
          token,
        ),
      );
    const recipientTokenAfter =
      decodeUint(
        TOKEN,
        "balanceOf",
        await view(
          TOKEN,
          "balanceOf",
          [recipient],
          token,
        ),
      );
    const blockB =
      await call(
        "eth_getBlockByNumber",
        [headTag, false],
      );

    if (
      fulfilledAfter !== false ||
      contractTokenAfter !==
        contractTokenBefore ||
      recipientTokenAfter !==
        recipientTokenBefore ||
      hash(blockB?.hash) !==
        blockHashA ||
      quantity(blockB?.number) !==
        head
    ) {
      return held(
        "production_gas_observer_post_estimate_revalidation_mismatch",
        {
          rpc_url_fingerprint_sha256:
            rpcPolicy
              .rpc_url_fingerprint_sha256,
          rpc_methods_used: methods,
        },
      );
    }

    const liveCandidate =
      roundUp(
        ceilMulDiv(
          estimate,
          CANDIDATE_MULTIPLIER_BPS,
          BPS,
        ),
        ROUNDING_QUANTUM,
      );
    const candidate =
      liveCandidate >
      LOCAL_LOWER_BOUND
        ? liveCandidate
        : LOCAL_LOWER_BOUND;

    const observation = {
      chain_id: "2050",
      observation_block_number:
        head.toString(),
      observation_block_hash:
        blockHashA,
      fulfillment_contract_address:
        contract,
      void_token_address: token,
      fulfiller_address: fulfiller,
      predecessor_address:
        predecessor,
      probe_payment_id: paymentId,
      probe_recipient: recipient,
      probe_amount_atoms:
        amount.toString(),
      fulfillment_contract_token_balance_atoms:
        contractTokenBefore.toString(),
      recipient_token_balance_atoms:
        recipientTokenBefore.toString(),
      remaining_inventory_atoms:
        remaining.toString(),
      fulfiller_native_balance_wei:
        nativeBalance.toString(),
      live_estimated_transaction_gas:
        estimate.toString(),
      live_candidate_multiplier_bps:
        CANDIDATE_MULTIPLIER_BPS.toString(),
      rounding_quantum_gas:
        ROUNDING_QUANTUM.toString(),
      live_candidate_runtime_gas_ceiling:
        liveCandidate.toString(),
      local_lower_bound_candidate:
        LOCAL_LOWER_BOUND.toString(),
      proposed_runtime_gas_ceiling:
        candidate.toString(),
      state_unchanged_after_estimate:
        true,
      block_hash_revalidated: true,
      real_void_token_execution_path:
        true,
    };

    return {
      ok: true,
      status:
        "production_gas_observed_candidate_unaccepted",
      marker:
        VOID_BUY_VOID_PRESALE_FULFILLMENT_PRODUCTION_GAS_OBSERVER_V1,
      version: 1,
      rpc_url_fingerprint_sha256:
        rpcPolicy
          .rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
      observation,
      production_runtime_gas_ceiling_accepted:
        false,
      production_configuration_updated:
        false,
      runtime_enablement_changed:
        false,
      rpc_call_performed: true,
      mutation_performed: false,
      credential_access_performed: false,
      wallet_access_performed: false,
      signing_performed: false,
      transaction_broadcast_performed:
        false,
      deployment_performed: false,
      chain2050_mutation_performed:
        false,
      inventory_funding_performed:
        false,
      production_configuration_mutation:
        false,
      public_activation_performed:
        false,
      automatic_retry_allowed: false,
      money_movement_performed: false,
      next_gate:
        "review_and_accept_production_runtime_gas_ceiling_before_runtime_activation",
      authority:
        VOID_BUY_VOID_PRESALE_FULFILLMENT_PRODUCTION_GAS_OBSERVER_AUTHORITY_V1,
    };
  } catch (error) {
    return held(
      "production_gas_observer_rpc_failed",
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
