#!/usr/bin/env node
import crypto from "node:crypto";
import * as http from "node:http";
import {
  Interface,
  getAddress,
} from "ethers";

import {
  VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_ATTESTATION_V1,
  verifyBuyVoidPresaleFulfillmentDeploymentObservationV1,
} from "./buy-void-presale-fulfillment-deployment-attestation-v1.mjs";

export const VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_OBSERVER_V1 =
  "VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_OBSERVER_V1";

export const VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_OBSERVER_AUTHORITY_V1 = {
  canonical_chain_id: "2050",
  loopback_http_only: true,
  fixed_block_observation: true,
  block_hash_revalidation_required: true,
  deployment_receipt_revalidation_required: true,
  read_only_rpc_methods: [
    "eth_chainId",
    "eth_blockNumber",
    "eth_getBlockByNumber",
    "eth_getTransactionByHash",
    "eth_getTransactionReceipt",
    "eth_getCode",
    "eth_call",
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
  runtime_enablement_change: false,
  public_activation: false,
  automatic_retry: false,
  money_movement: false,
};

const HASH = /^0x[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const HEX_QUANTITY =
  /^0x(?:0|[1-9a-f][0-9a-f]*)$/i;
const HEX_BYTES =
  /^0x(?:[0-9a-f]{2})*$/i;
const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RESPONSE_BYTES = 1_048_576;
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const MAX_REQUEST_BYTES = 32_768;

const VIEWS = new Interface([
  "function voidToken() view returns (address)",
  "function fulfiller() view returns (address)",
  "function predecessor() view returns (address)",
  "function maxInventoryAtoms() view returns (uint256)",
  "function totalFulfilledAtoms() view returns (uint256)",
  "function remainingInventoryAtoms() view returns (uint256)",
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

function bytes(value) {
  const raw = text(value).toLowerCase();
  return HEX_BYTES.test(raw) ? raw : "";
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
        "deployment_observer_request_too_large",
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
                "void-buy-void-presale-fulfillment-deployment-observer-v1",
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
                      "deployment_observer_response_too_large",
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
                    "deployment_observer_http_status_invalid",
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
                    "deployment_observer_rpc_json_invalid",
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
                    "deployment_observer_rpc_envelope_invalid",
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
              "deployment_observer_timeout",
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
      VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_OBSERVER_V1,
    version: 1,
    reason,
    rpc_url_fingerprint_sha256:
      options.rpc_url_fingerprint_sha256 ??
      null,
    rpc_methods_used:
      options.rpc_methods_used || [],
    observation: null,
    attestation: null,
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
    runtime_enablement_changed: false,
    public_activation_performed: false,
    automatic_retry_allowed: false,
    money_movement_performed: false,
    ...(options.detail
      ? { detail: options.detail }
      : {}),
  };
}

function viewCall(contract, name) {
  return {
    to: contract,
    data:
      VIEWS.encodeFunctionData(
        name,
      ),
  };
}

function decodeAddress(name, raw) {
  const data = bytes(raw);
  if (!data) {
    throw new Error(
      "deployment_observer_view_result_invalid:" +
        name,
    );
  }
  const decoded =
    VIEWS.decodeFunctionResult(
      name,
      data,
    );
  const value = address(decoded[0]);
  if (!value) {
    throw new Error(
      "deployment_observer_view_address_invalid:" +
        name,
    );
  }
  return value;
}

function decodeUint(name, raw) {
  const data = bytes(raw);
  if (!data) {
    throw new Error(
      "deployment_observer_view_result_invalid:" +
        name,
    );
  }
  const decoded =
    VIEWS.decodeFunctionResult(
      name,
      data,
    );
  const value = BigInt(decoded[0]);
  if (value < 0n) {
    throw new Error(
      "deployment_observer_view_uint_invalid:" +
        name,
    );
  }
  return value.toString();
}

export async function observeBuyVoidPresaleFulfillmentDeploymentV1(
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
  const txHash = hash(
    input?.deployment_transaction_hash,
  );
  const minimum = (() => {
    try {
      const value = BigInt(
        text(input?.min_confirmations),
      );
      return value > 0n &&
        value <= 1_000_000n
        ? value
        : null;
    } catch {
      return null;
    }
  })();

  if (
    !rpcPolicy ||
    !contract ||
    !token ||
    !fulfiller ||
    !predecessor ||
    !txHash ||
    minimum === null
  ) {
    return held(
      "deployment_observer_input_invalid",
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
    const chainRaw = await call(
      "eth_chainId",
      [],
    );
    const chainId = quantity(chainRaw);
    if (chainId !== 2050n) {
      return held(
        "deployment_observer_chain_id_mismatch",
        {
          rpc_url_fingerprint_sha256:
            rpcPolicy
              .rpc_url_fingerprint_sha256,
          rpc_methods_used: methods,
        },
      );
    }

    const headRaw = await call(
      "eth_blockNumber",
      [],
    );
    const head = quantity(headRaw);
    if (head === null || head <= 0n) {
      return held(
        "deployment_observer_head_invalid",
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

    const blockA = await call(
      "eth_getBlockByNumber",
      [headTag, false],
    );
    const blockHashA = hash(
      blockA?.hash,
    );
    if (
      !blockHashA ||
      quantity(blockA?.number) !== head
    ) {
      return held(
        "deployment_observer_observation_block_invalid",
        {
          rpc_url_fingerprint_sha256:
            rpcPolicy
              .rpc_url_fingerprint_sha256,
          rpc_methods_used: methods,
        },
      );
    }

    const tx = await call(
      "eth_getTransactionByHash",
      [txHash],
    );
    const receiptA = await call(
      "eth_getTransactionReceipt",
      [txHash],
    );
    if (!tx || !receiptA) {
      return held(
        "deployment_observer_deployment_transaction_not_visible",
        {
          rpc_url_fingerprint_sha256:
            rpcPolicy
              .rpc_url_fingerprint_sha256,
          rpc_methods_used: methods,
        },
      );
    }

    const runtimeCode = bytes(
      await call(
        "eth_getCode",
        [contract, headTag],
      ),
    );
    if (
      !runtimeCode ||
      runtimeCode === "0x"
    ) {
      return held(
        "deployment_observer_contract_code_absent",
        {
          rpc_url_fingerprint_sha256:
            rpcPolicy
              .rpc_url_fingerprint_sha256,
          rpc_methods_used: methods,
        },
      );
    }

    const viewRaw = {};
    for (const name of [
      "voidToken",
      "fulfiller",
      "predecessor",
      "maxInventoryAtoms",
      "totalFulfilledAtoms",
      "remainingInventoryAtoms",
    ]) {
      viewRaw[name] =
        await call(
          "eth_call",
          [
            viewCall(
              contract,
              name,
            ),
            headTag,
          ],
        );
    }

    const blockB = await call(
      "eth_getBlockByNumber",
      [headTag, false],
    );
    const receiptB = await call(
      "eth_getTransactionReceipt",
      [txHash],
    );

    if (
      hash(blockB?.hash) !==
        blockHashA ||
      quantity(blockB?.number) !==
        head ||
      hash(receiptA?.transactionHash) !==
        txHash ||
      hash(receiptB?.transactionHash) !==
        txHash ||
      hash(receiptA?.blockHash) !==
        hash(receiptB?.blockHash) ||
      quantity(receiptA?.blockNumber) !==
        quantity(receiptB?.blockNumber) ||
      address(receiptA?.contractAddress) !==
        address(
          receiptB?.contractAddress,
        )
    ) {
      return held(
        "deployment_observer_revalidation_mismatch",
        {
          rpc_url_fingerprint_sha256:
            rpcPolicy
              .rpc_url_fingerprint_sha256,
          rpc_methods_used: methods,
        },
      );
    }

    const txNonce =
      quantity(tx?.nonce);
    const txValue =
      quantity(tx?.value);
    const txChainId =
      quantity(tx?.chainId);
    const receiptBlock =
      quantity(receiptA?.blockNumber);
    if (
      txNonce === null ||
      txValue === null ||
      txChainId !== 2050n ||
      receiptBlock === null
    ) {
      return held(
        "deployment_observer_transaction_shape_invalid",
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
      observation_block_number:
        head.toString(),
      observation_block_hash:
        blockHashA,
      contract_address: contract,
      deployment_transaction: {
        hash: txHash,
        from: address(tx?.from),
        to:
          tx?.to === null
            ? null
            : address(tx?.to),
        nonce:
          txNonce.toString(),
        input: bytes(
          tx?.input ?? tx?.data,
        ),
        value_wei:
          txValue.toString(),
        chain_id: "2050",
      },
      deployment_receipt: {
        transaction_hash: txHash,
        status:
          quantity(receiptA?.status)
            ?.toString() ?? "",
        block_number:
          receiptBlock.toString(),
        block_hash:
          hash(receiptA?.blockHash),
        contract_address:
          address(
            receiptA?.contractAddress,
          ),
      },
      runtime_code: runtimeCode,
      views: {
        void_token_address:
          decodeAddress(
            "voidToken",
            viewRaw.voidToken,
          ),
        fulfiller_address:
          decodeAddress(
            "fulfiller",
            viewRaw.fulfiller,
          ),
        predecessor_address:
          decodeAddress(
            "predecessor",
            viewRaw.predecessor,
          ),
        max_inventory_atoms:
          decodeUint(
            "maxInventoryAtoms",
            viewRaw.maxInventoryAtoms,
          ),
        total_fulfilled_atoms:
          decodeUint(
            "totalFulfilledAtoms",
            viewRaw.totalFulfilledAtoms,
          ),
        remaining_inventory_atoms:
          decodeUint(
            "remainingInventoryAtoms",
            viewRaw.remainingInventoryAtoms,
          ),
      },
    };

    const attestation =
      verifyBuyVoidPresaleFulfillmentDeploymentObservationV1({
        compiled_identity:
          input.compiled_identity,
        policy: {
          chain_id: "2050",
          fulfillment_contract_address:
            contract,
          void_token_address: token,
          fulfiller_address: fulfiller,
          predecessor_address:
            predecessor,
          min_confirmations:
            minimum.toString(),
        },
        observation,
      });

    if (attestation.ok === false) {
      return held(
        "deployment_observer_attestation_held:" +
          attestation.reason,
        {
          rpc_url_fingerprint_sha256:
            rpcPolicy
              .rpc_url_fingerprint_sha256,
          rpc_methods_used: methods,
          detail: {
            attestation_reason:
              attestation.reason,
          },
        },
      );
    }

    return {
      ok: true,
      status:
        "deployment_attested_genesis_lineage_held_on_inventory_funding",
      marker:
        VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_OBSERVER_V1,
      version: 1,
      rpc_url_fingerprint_sha256:
        rpcPolicy
          .rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
      observation,
      attestation,
      fixed_block_observation: true,
      observation_block_hash_revalidated:
        true,
      deployment_receipt_revalidated:
        true,
      rpc_call_performed: true,
      mutation_performed: false,
      credential_access_performed: false,
      wallet_access_performed: false,
      signing_performed: false,
      transaction_broadcast_performed:
        false,
      deployment_performed: false,
      chain2050_mutation_performed: false,
      inventory_funding_performed: false,
      runtime_enablement_changed: false,
      public_activation_performed: false,
      automatic_retry_allowed: false,
      money_movement_performed: false,
      authority:
        VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYMENT_OBSERVER_AUTHORITY_V1,
    };
  } catch (error) {
    return held(
      "deployment_observer_rpc_failed",
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
