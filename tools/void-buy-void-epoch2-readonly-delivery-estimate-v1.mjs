#!/usr/bin/env node
// Read-only E2 simulation against the selected production RPC. No key or
// payment record is consulted; the synthetic payment ID is NEVER submitted.
import crypto from "node:crypto";
import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  Interface, concat, keccak256, zeroPadValue,
} from "ethers";
import {
  VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1 as PRESALE,
  VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1 as FULFILLER,
  VOID_BUY_VOID_EPOCH2_PRODUCTION_RPC_URL_V1 as RPC_URL,
  buyVoidPresaleRequiredAccessListV1,
} from "../src/economic/buy_void_epoch2_fulfillment_access_list_v1.js";

export const VOID_BUY_VOID_EPOCH2_READONLY_DELIVERY_ESTIMATE_V1 =
  "VOID_BUY_VOID_EPOCH2_READONLY_DELIVERY_ESTIMATE_V1";
const TOKEN = "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const GENESIS = "0x8b522cd3dad5301f2d48c2fb1a750fca1e55dfcaa8bf699423bccdb5a061d01d";
const CODE_SHA = "b200e702e07140921813c83a833d4f4abacea61dd5863f08b0d9c1147b8da225";
const TOKEN_CODE_SHA = "7c2e39f57c3240b740d68ef77ae4e9d0fb6110ccb412cbdb1bec99c485ea4adb";
const PRESALE_BALANCE_SLOT = "0xb7c0ee5e49cd64bfaca4a7bd9a24ee438d5b56b1f74e500899752b943375722c";
const CAP_ATOMS = 10_000_000n * (10n ** 18n);
const PREMINE_ATOMS = 333_333_333n * (10n ** 18n);
const AMOUNT_ATOMS = 2n * (10n ** 18n);
const MAX_ESTIMATED_GAS = 320_000n;
const RFC_TEST_RECIPIENT = "0x000000000000000000000000000000000000dead";
const FULFILL = new Interface([
  "function fulfill(bytes32 paymentDeliveryId,address recipient,uint256 amountAtoms)",
]);
const RPC_ALLOWED = Object.freeze(new Set([
  "eth_chainId", "eth_blockNumber", "eth_getBlockByNumber",
  "net_peerCount", "eth_getCode", "eth_getStorageAt", "eth_estimateGas",
]));

function exactQuantity(raw) {
  if (typeof raw !== "string" || !/^0x(?:0|[1-9a-f][0-9a-f]*)$/u.test(raw)) {
    throw new Error("rpc_quantity_invalid");
  }
  return BigInt(raw);
}
function storageWord(raw) {
  if (typeof raw !== "string" || !/^0x[0-9a-f]{64}$/u.test(raw)) {
    throw new Error("rpc_storage_word_invalid");
  }
  return BigInt(raw);
}
function codeSha(raw) {
  if (typeof raw !== "string" ||
      !/^0x(?:[a-f0-9]{2})*$/u.test(raw) ||
      raw.length > 20000) {
    throw new Error("rpc_contract_code_invalid");
  }
  return crypto.createHash("sha256").update(Buffer.from(raw.slice(2), "hex"))
    .digest("hex");
}
function safeError(value) {
  return String(value ?? "error").replace(/[^a-zA-Z0-9_]/gu, "_").slice(0,100);
}
export function buildBuyVoidEpoch2ReadOnlyEstimateV1(paymentId) {
  if (typeof paymentId !== "string" ||
      !/^0x[0-9a-f]{64}$/u.test(paymentId) ||
      paymentId === "0x" + "0".repeat(64)) {
    throw new Error("synthetic_payment_id_invalid");
  }
  const computedSlot = keccak256(concat([
    zeroPadValue(PRESALE, 32),
    zeroPadValue("0x01", 32),
  ])).toLowerCase();
  if (computedSlot !== PRESALE_BALANCE_SLOT) {
    throw new Error("reviewed_presale_balance_slot_mismatch");
  }
  const transaction = {
    type: "0x2",
    chainId: "0x802",
    from: FULFILLER,
    to: PRESALE,
    value: "0x0",
    data: FULFILL.encodeFunctionData("fulfill", [
      paymentId, RFC_TEST_RECIPIENT, AMOUNT_ATOMS,
    ]),
    maxFeePerGas: "0x0",
    maxPriorityFeePerGas: "0x0",
    accessList: buyVoidPresaleRequiredAccessListV1(PRESALE),
  };
  return Object.freeze({
    transaction,
    payment_id: paymentId,
    amount_atoms: AMOUNT_ATOMS.toString(),
    rpc_url: RPC_URL,
    signer_authorized_by_probe: false,
    wallet_access: false,
    transaction_broadcast: false,
  });
}

export function classifyBuyVoidEpoch2ReadOnlyEstimateV1(observed) {
  const hold = (reason) => Object.freeze({
    ok: false, status: "HOLD", reason,
    transaction_broadcast: false, wallet_access: false,
    presale_activation: false,
  });
  try {
    if (!observed || typeof observed !== "object") return hold("observation_missing");
    if (observed.chain !== "0x802" ||
        observed.genesis?.hash?.toLowerCase() !== GENESIS) {
      return hold("epoch2_chain_identity_invalid");
    }
    if (codeSha(observed.presale_code) !== CODE_SHA ||
        codeSha(observed.token_code) !== TOKEN_CODE_SHA) {
      return hold("epoch2_contract_code_mismatch");
    }
    const before = exactQuantity(observed.block_before);
    const after = exactQuantity(observed.block_after);
    const peers = exactQuantity(observed.peers);
    if (after < before || before < 3854n || peers < 2n) {
      return hold("epoch2_quorum_or_history_not_qualified");
    }
    const balance = storageWord(observed.token_presale_balance);
    const fulfilled = storageWord(observed.total_fulfilled);
    const supply = storageWord(observed.total_supply);
    if (balance + fulfilled !== CAP_ATOMS ||
        fulfilled > CAP_ATOMS || supply !== PREMINE_ATOMS ||
        balance < AMOUNT_ATOMS) {
      return hold("epoch2_inventory_or_supply_invalid");
    }
    const gas = exactQuantity(observed.estimate_gas);
    if (gas <= 0n || gas > MAX_ESTIMATED_GAS) {
      return hold("epoch2_estimated_gas_outside_reviewed_ceiling");
    }
    return Object.freeze({
      ok: true,
      status: "READONLY_EPOCH2_DELIVERY_ESTIMATE_GREEN",
      gas_estimate: gas.toString(),
      max_estimate_ceiling: MAX_ESTIMATED_GAS.toString(),
      chain_id: 2050,
      initial_head: before.toString(),
      final_head: after.toString(),
      peer_count: peers.toString(),
      presale_balance_atoms: balance.toString(),
      presale_fulfilled_atoms: fulfilled.toString(),
      zero_fee_type2_marker_estimate_accepted: true,
      synthetic_payment_id_only: true,
      credential_access: false,
      wallet_access: false,
      signing_performed: false,
      transaction_broadcast: false,
      presale_activation: false,
      funds_movement: false,
    });
  } catch {
    return hold("epoch2_rpc_evidence_malformed");
  }
}

let requestId = 0;
async function rpcRead(method, params) {
  if (!RPC_ALLOWED.has(method)) throw new Error("rpc_method_not_read_only");
  if (RPC_URL !== "http://127.0.0.1:18553/") throw new Error("rpc_binding_invalid");
  const id = ++requestId;
  const body = Buffer.from(JSON.stringify({
    jsonrpc: "2.0", id, method, params,
  }), "utf8");
  return await new Promise((resolve, reject) => {
    const request = http.request({
      hostname: "127.0.0.1",
      port: 18553,
      path: "/",
      method: "POST",
      agent: false,
      timeout: 6000,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": body.length,
        "Connection": "close",
      },
    }, response => {
      if (response.statusCode !== 200 ||
          !String(response.headers["content-type"] || "")
            .toLowerCase().startsWith("application/json")) {
        response.resume();
        reject(new Error("rpc_http_or_content_type_invalid"));
        return;
      }
      let size = 0;
      const chunks = [];
      response.on("data", chunk => {
        size += chunk.length;
        if (size > 65536) {
          request.destroy(new Error("rpc_response_oversize"));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => {
        try {
          const responseBody = JSON.parse(
            new TextDecoder("utf-8", { fatal: true })
              .decode(Buffer.concat(chunks)),
          );
          if (responseBody?.jsonrpc !== "2.0" ||
              responseBody.id !== id ||
              responseBody.error !== undefined ||
              responseBody.result === undefined ||
              responseBody.result === null) {
            throw new Error(
              "rpc_" + safeError(method) + "_" +
              safeError(responseBody?.error?.message || "invalid_response"),
            );
          }
          resolve(responseBody.result);
        } catch (error) { reject(error); }
      });
      response.on("error", reject);
    });
    request.on("error", reject);
    request.on("timeout", () => request.destroy(new Error("rpc_timeout")));
    request.end(body);
  });
}

export async function observeBuyVoidEpoch2ReadOnlyEstimateV1() {
  const paymentId = "0x" + crypto.randomBytes(32).toString("hex");
  const probe = buildBuyVoidEpoch2ReadOnlyEstimateV1(paymentId);
  const observed = {};
  observed.chain = await rpcRead("eth_chainId", []);
  observed.block_before = await rpcRead("eth_blockNumber", []);
  observed.genesis = await rpcRead("eth_getBlockByNumber", ["0x0", false]);
  observed.peers = await rpcRead("net_peerCount", []);
  observed.presale_code = await rpcRead("eth_getCode", [PRESALE, "latest"]);
  observed.token_code = await rpcRead("eth_getCode", [TOKEN, "latest"]);
  observed.token_presale_balance = await rpcRead("eth_getStorageAt", [
    TOKEN, PRESALE_BALANCE_SLOT, "latest",
  ]);
  observed.total_fulfilled = await rpcRead("eth_getStorageAt", [
    PRESALE, "0x1", "latest",
  ]);
  observed.total_supply = await rpcRead("eth_getStorageAt", [
    TOKEN, "0x0", "latest",
  ]);
  observed.estimate_gas = await rpcRead("eth_estimateGas", [
    probe.transaction, "pending",
  ]);
  observed.block_after = await rpcRead("eth_blockNumber", []);
  return classifyBuyVoidEpoch2ReadOnlyEstimateV1(observed);
}

if (process.argv[1] &&
    import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  console.log("marker=" + VOID_BUY_VOID_EPOCH2_READONLY_DELIVERY_ESTIMATE_V1);
  console.log("mode=LIVE_READONLY_RPC_SIMULATION");
  console.log("rpc=selected_epoch2_localhost_18553_only");
  console.log("real_customer_payment_id_used=false");
  console.log("synthetic_recipient_only=true");
  console.log("private_keys_or_credentials_access=false");
  console.log("transaction_signing_or_broadcast=false");
  console.log("service_or_chain_mutation=false");
  console.log("public_presale_activation=false");
  try {
    if (process.argv.length !== 3 || process.argv[2] !== "--live") {
      throw new Error("explicit_readonly_live_confirmation_required");
    }
    const result = await observeBuyVoidEpoch2ReadOnlyEstimateV1();
    for (const [key, value] of Object.entries(result)) {
      console.log(key + "=" + String(value));
    }
    if (!result.ok) process.exitCode = 2;
  } catch (error) {
    console.log("status=HOLD");
    console.log("reason=" + safeError(
      error instanceof Error ? error.message : "unknown_error",
    ));
    process.exitCode = 2;
  }
}
