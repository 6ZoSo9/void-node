import crypto from "node:crypto";
import * as http from "node:http";
import { Interface, getAddress, id } from "ethers";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CALL_V1,
  type BuyVoidPaymentKeyedFulfillmentCallReadyV1,
} from "./buy_void_payment_keyed_fulfillment_call_v1.js";
import {
  bindBuyVoidSourceFinalityPaymentV1,
} from "./buy_void_source_finality_execution_preflight_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_RECEIPT_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_RECEIPT_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_RECEIPT_AUTHORITY_V1 = {
  source_only_contract: true,
  one_transaction_per_run: true,
  disabled_by_policy_default: true,
  canonical_chain_id: "2050",
  payment_keyed_fulfillment_call_required: true,
  exact_fulfillment_contract_required: true,
  exact_fulfillment_wallet_required: true,
  exact_fulfilled_event_required: true,
  exact_void_token_transfer_required: true,
  exact_payment_delivery_id_required: true,
  exact_recipient_required: true,
  exact_token_amount_atoms_required: true,
  fulfilled_block_number_binding_required: true,
  transfer_precedes_fulfilled_event_required: true,
  minimum_confirmations_required: true,
  receipt_revalidation_required: true,
  receipt_block_hash_stability_required: true,
  server_controlled_rpc_url: true,
  loopback_http_only: true,
  read_only_rpc_methods: [
    "eth_chainId",
    "eth_getTransactionReceipt",
    "eth_blockNumber",
  ],
  filesystem_read: false,
  filesystem_write: false,
  wallet_access: false,
  secret_access: false,
  signing: false,
  transaction_broadcast: false,
  inventory_mutation: false,
  runtime_route_mount: false,
  background_loop: false,
  automatic_retry: false,
  money_movement: false,
} as const;

export type BuyVoidPaymentKeyedFulfillmentReceiptRpcMethodV1 =
  | "eth_chainId"
  | "eth_getTransactionReceipt"
  | "eth_blockNumber";

export type BuyVoidPaymentKeyedFulfillmentReceiptRpcCallV1 = {
  method: BuyVoidPaymentKeyedFulfillmentReceiptRpcMethodV1;
  params: unknown[];
};

export type BuyVoidPaymentKeyedFulfillmentReceiptTransportV1 = (
  call: Readonly<BuyVoidPaymentKeyedFulfillmentReceiptRpcCallV1>,
) => Promise<unknown>;

export type BuyVoidPaymentKeyedFulfillmentReceiptPolicyV1 = {
  enabled: boolean;
  chain_id: "2050";
  rpc_url: string;
  fulfillment_wallet_address: string;
  fulfillment_contract_address: string;
  void_token_address: string;
  min_confirmations: string | number | bigint;
  request_timeout_ms?: string | number;
  max_response_bytes?: string | number;
};

export type BuyVoidPaymentKeyedFulfillmentReceiptInputV1 = {
  transaction_hash: string;
  fulfillment_call: BuyVoidPaymentKeyedFulfillmentCallReadyV1;
  policy: BuyVoidPaymentKeyedFulfillmentReceiptPolicyV1;
  transport?: BuyVoidPaymentKeyedFulfillmentReceiptTransportV1;
};

export type BuyVoidPaymentKeyedFulfillmentReceiptReadyV1 = {
  ok: true;
  status: "confirmed";
  marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_RECEIPT_V1;
  version: 1;
  chain_id: "2050";
  transaction_hash: string;
  payment_delivery_id: string;
  canonical_payment_identity: string;
  fulfillment_wallet_address: string;
  fulfillment_contract_address: string;
  void_token_address: string;
  delivery_address: string;
  void_amount_units: string;
  token_amount_atoms: string;
  fulfillment_event_log_index: string;
  transfer_event_log_index: string;
  receipt_block_number: string;
  receipt_block_hash: string;
  observed_confirmation_count: string;
  receipt_evidence_fingerprint_sha256: string;
  rpc_url_fingerprint_sha256: string;
  rpc_methods_used: BuyVoidPaymentKeyedFulfillmentReceiptRpcMethodV1[];
  mutation_performed: false;
  wallet_access_performed: false;
  signing_performed: false;
  transaction_broadcast_performed: false;
  money_movement_performed: false;
};

export type BuyVoidPaymentKeyedFulfillmentReceiptHeldV1 = {
  ok: false;
  status: "held";
  marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_RECEIPT_V1;
  version: 1;
  reason: string;
  transaction_hash: string | null;
  rpc_url_fingerprint_sha256: string | null;
  rpc_methods_used: BuyVoidPaymentKeyedFulfillmentReceiptRpcMethodV1[];
  mutation_performed: false;
  wallet_access_performed: false;
  signing_performed: false;
  transaction_broadcast_performed: false;
  money_movement_performed: false;
  detail?: Record<string, unknown>;
};

export type BuyVoidPaymentKeyedFulfillmentReceiptDecisionV1 =
  | BuyVoidPaymentKeyedFulfillmentReceiptReadyV1
  | BuyVoidPaymentKeyedFulfillmentReceiptHeldV1;

type NormalizedPolicyV1 = {
  rpc_url: string;
  rpc_url_fingerprint_sha256: string;
  fulfillment_wallet_address: string;
  fulfillment_contract_address: string;
  void_token_address: string;
  min_confirmations: bigint;
  request_timeout_ms: number;
  max_response_bytes: number;
};

type ExpectedCallV1 = {
  transaction_hash: string;
  payment_delivery_id: string;
  canonical_payment_identity: string;
  delivery_address: string;
  void_amount_units: string;
  token_amount_atoms: bigint;
};

type FulfillmentReceiptBindingV1 = {
  transaction_hash: string;
  from: string;
  to: string;
  block_number: bigint;
  block_hash: string;
  status: 1n;
  payment_delivery_id: string;
  recipient: string;
  amount_atoms: bigint;
  fulfilled_at_block: bigint;
  fulfillment_log_index: string;
  transfer_from: string;
  transfer_to: string;
  transfer_value: bigint;
  transfer_log_index: string;
};

const ADDRESS = /^0x[0-9a-f]{40}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const BYTES32 = /^0x[0-9a-f]{64}$/;
const PAYMENT_ID =
  /^voidpay1:(base|ethereum):(0x[0-9a-f]{64}):(0|[1-9][0-9]*)$/;
const DECIMAL = /^(0|[1-9][0-9]*)$/;
const HEX_QUANTITY = /^0x(?:0|[1-9a-f][0-9a-f]*)$/i;
const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RESPONSE_BYTES = 65_536;
const MAX_RESPONSE_BYTES = 1_048_576;
const MAX_REQUEST_BYTES = 16_384;
const MAX_RECEIPT_LOGS = 1_024;
const MAX_PAYMENT_ID_CHARS = 192;
const MAX_UINT256_DECIMAL_DIGITS = 78;
const TOKEN_ATOM_MULTIPLIER = 1_000_000_000_000n;
const FULFILLMENT_CALLS = new Interface([
  "function fulfill(bytes32 paymentDeliveryId,address recipient,uint256 amountAtoms)",
]);
const FULFILLED_TOPIC =
  id("Fulfilled(bytes32,address,uint256,uint256)").toLowerCase();
const TRANSFER_TOPIC =
  id("Transfer(address,address,uint256)").toLowerCase();
const FULFILLMENT_EVENTS = new Interface([
  "event Fulfilled(bytes32 indexed paymentDeliveryId,address indexed recipient,uint256 amountAtoms,uint256 fulfilledAtBlock)",
]);
const TRANSFER_EVENTS = new Interface([
  "event Transfer(address indexed from,address indexed to,uint256 value)",
]);

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function address(value: unknown): string {
  const raw = text(value);
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) return "";
  try {
    const normalized = getAddress(raw).toLowerCase();
    return ADDRESS.test(normalized) ? normalized : "";
  } catch {
    return "";
  }
}

function hash(value: unknown): string {
  const raw = text(value).toLowerCase();
  return HASH.test(raw) ? raw : "";
}

function parsePositive(value: unknown): bigint | null {
  try {
    if (typeof value === "bigint") return value > 0n ? value : null;
    if (typeof value === "number") {
      return Number.isSafeInteger(value) && value > 0 ? BigInt(value) : null;
    }
    if (typeof value !== "string") return null;
    const raw = value.trim();
    if (!/^[1-9][0-9]{0,77}$/.test(raw)) return null;
    return BigInt(raw);
  } catch {
    return null;
  }
}

function parseHexQuantity(value: unknown): bigint | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!HEX_QUANTITY.test(raw)) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function boundedPositive(
  value: unknown,
  fallback: number,
  maximum: number,
): number | null {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string" && typeof value !== "number") return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= maximum
    ? parsed
    : null;
}

function held(
  reason: string,
  options: {
    transaction_hash?: string | null;
    rpc_url_fingerprint_sha256?: string | null;
    rpc_methods_used?: BuyVoidPaymentKeyedFulfillmentReceiptRpcMethodV1[];
    detail?: Record<string, unknown>;
  } = {},
): BuyVoidPaymentKeyedFulfillmentReceiptHeldV1 {
  return {
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_RECEIPT_V1,
    version: 1,
    reason,
    transaction_hash: options.transaction_hash ?? null,
    rpc_url_fingerprint_sha256:
      options.rpc_url_fingerprint_sha256 ?? null,
    rpc_methods_used: options.rpc_methods_used || [],
    mutation_performed: false,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    ...(options.detail ? { detail: options.detail } : {}),
  };
}

function normalizePolicy(
  input: BuyVoidPaymentKeyedFulfillmentReceiptPolicyV1,
):
  | { ok: true; policy: NormalizedPolicyV1 }
  | { ok: false; reason: string; fingerprint: string | null } {
  if (input?.enabled !== true) {
    return {
      ok: false,
      reason: "payment_keyed_fulfillment_receipt_disabled",
      fingerprint: null,
    };
  }
  if (text(input.chain_id) !== "2050") {
    return {
      ok: false,
      reason: "payment_keyed_fulfillment_receipt_chain_id_invalid",
      fingerprint: null,
    };
  }

  let url: URL;
  try {
    url = new URL(text(input.rpc_url));
  } catch {
    return {
      ok: false,
      reason: "payment_keyed_fulfillment_receipt_rpc_url_invalid",
      fingerprint: null,
    };
  }
  const host = url.hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  if (
    url.protocol !== "http:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !["127.0.0.1", "::1", "localhost"].includes(host)
  ) {
    return {
      ok: false,
      reason: "payment_keyed_fulfillment_receipt_rpc_must_be_loopback_http",
      fingerprint: null,
    };
  }
  const normalizedUrl = url.toString();
  const fingerprint = sha256(normalizedUrl);

  const wallet = address(input.fulfillment_wallet_address);
  const contract = address(input.fulfillment_contract_address);
  const token = address(input.void_token_address);
  const minimum = parsePositive(input.min_confirmations);
  const timeout = boundedPositive(
    input.request_timeout_ms,
    DEFAULT_TIMEOUT_MS,
    MAX_TIMEOUT_MS,
  );
  const maxResponse = boundedPositive(
    input.max_response_bytes,
    DEFAULT_MAX_RESPONSE_BYTES,
    MAX_RESPONSE_BYTES,
  );
  if (
    !wallet ||
    !contract ||
    !token ||
    wallet === contract ||
    token === contract ||
    wallet === token ||
    minimum === null ||
    timeout === null ||
    maxResponse === null
  ) {
    return {
      ok: false,
      reason: "payment_keyed_fulfillment_receipt_policy_invalid",
      fingerprint,
    };
  }

  return {
    ok: true,
    policy: {
      rpc_url: normalizedUrl,
      rpc_url_fingerprint_sha256: fingerprint,
      fulfillment_wallet_address: wallet,
      fulfillment_contract_address: contract,
      void_token_address: token,
      min_confirmations: minimum,
      request_timeout_ms: timeout,
      max_response_bytes: maxResponse,
    },
  };
}

function createHttpTransport(
  policy: Readonly<NormalizedPolicyV1>,
): BuyVoidPaymentKeyedFulfillmentReceiptTransportV1 {
  let nextRequestId = 0;
  return async (call) => {
    if (
      !VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_RECEIPT_AUTHORITY_V1
        .read_only_rpc_methods.includes(call.method)
    ) {
      throw new Error("payment_keyed_fulfillment_receipt_rpc_method_not_allowed");
    }
    const requestId = ++nextRequestId;
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: requestId,
      method: call.method,
      params: call.params,
    });
    if (Buffer.byteLength(body, "utf8") > MAX_REQUEST_BYTES) {
      throw new Error("payment_keyed_fulfillment_receipt_request_too_large");
    }

    return await new Promise((resolve, reject) => {
      const url = new URL(policy.rpc_url);
      const startedAtMs = Date.now();
      let settled = false;
      let totalDeadline: ReturnType<typeof setTimeout> | null = null;
      const finish = (error: Error | null, value?: unknown) => {
        if (settled) return;
        settled = true;
        if (totalDeadline !== null) {
          clearTimeout(totalDeadline);
          totalDeadline = null;
        }
        if (error) reject(error);
        else resolve(value);
      };

      const request = http.request(
        {
          protocol: "http:",
          hostname: url.hostname,
          port: url.port || "80",
          path: url.pathname + url.search,
          method: "POST",
          headers: {
            "content-type": "application/json",
            "content-length": String(Buffer.byteLength(body, "utf8")),
            "user-agent": "void-buy-void-payment-keyed-fulfillment-receipt-v1",
          },
          timeout: policy.request_timeout_ms,
        },
        (response) => {
          const chunks: Buffer[] = [];
          let total = 0;
          response.on("aborted", () => {
            finish(new Error("payment_keyed_fulfillment_receipt_response_aborted"));
          });
          response.on("error", () => {
            finish(new Error("payment_keyed_fulfillment_receipt_response_error"));
          });
          response.on("data", (chunk: Buffer) => {
            total += chunk.length;
            if (total > policy.max_response_bytes) {
              request.destroy(
                new Error("payment_keyed_fulfillment_receipt_response_too_large"),
              );
              return;
            }
            chunks.push(chunk);
          });
          response.on("end", () => {
            if (Number(response.statusCode || 0) !== 200) {
              finish(new Error("payment_keyed_fulfillment_receipt_http_status_not_ok"));
              return;
            }
            const contentType = String(response.headers["content-type"] || "")
              .toLowerCase()
              .split(";", 1)[0]
              ?.trim() || "";
            if (contentType !== "application/json") {
              finish(new Error("payment_keyed_fulfillment_receipt_response_not_json"));
              return;
            }
            let payload: any;
            try {
              payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            } catch {
              finish(new Error("payment_keyed_fulfillment_receipt_response_json_invalid"));
              return;
            }
            if (
              !payload ||
              payload.jsonrpc !== "2.0" ||
              payload.id !== requestId ||
              payload.error ||
              !("result" in payload)
            ) {
              finish(new Error("payment_keyed_fulfillment_receipt_rpc_envelope_invalid"));
              return;
            }
            finish(null, payload.result);
          });
        },
      );

      request.on("timeout", () => {
        request.destroy(new Error("payment_keyed_fulfillment_receipt_rpc_timeout"));
      });
      request.on("error", (error) => finish(error));
      totalDeadline = setTimeout(
        () => {
          request.destroy(
            new Error("payment_keyed_fulfillment_receipt_rpc_total_deadline_exceeded"),
          );
        },
        Math.max(
          0,
          policy.request_timeout_ms - (Date.now() - startedAtMs),
        ),
      );
      request.end(body);
    });
  };
}

function logIndex(log: any): string {
  const raw = log?.logIndex ?? log?.index;
  if (typeof raw === "number" && Number.isSafeInteger(raw) && raw >= 0) {
    return String(raw);
  }
  const parsed = parseHexQuantity(raw);
  return parsed === null ? "" : parsed.toString();
}

function expectedCall(
  input: BuyVoidPaymentKeyedFulfillmentReceiptInputV1,
  policy: Readonly<NormalizedPolicyV1>,
):
  | { ok: true; expected: ExpectedCallV1 }
  | { ok: false; reason: string; transaction_hash: string | null } {
  const transactionHash = hash(input?.transaction_hash);
  if (!transactionHash) {
    return {
      ok: false,
      reason: "payment_keyed_fulfillment_receipt_transaction_hash_invalid",
      transaction_hash: null,
    };
  }

  const call = input?.fulfillment_call;
  if (
    call?.ok !== true ||
    call.status !== "ready" ||
    call.marker !== VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CALL_V1 ||
    call.version !== 1 ||
    call.chain_id !== "2050" ||
    call.value_wei !== "0" ||
    call.source_finality_ready_verified !== true ||
    call.legacy_local_payment_key_chain_authority !== false ||
    call.wallet_access_performed !== false ||
    call.signing_performed !== false ||
    call.transaction_broadcast_performed !== false ||
    call.money_movement_performed !== false
  ) {
    return {
      ok: false,
      reason: "payment_keyed_fulfillment_receipt_call_not_ready",
      transaction_hash: transactionHash,
    };
  }

  const identity = text(call.canonical_payment_identity).toLowerCase();
  const key = text(call.canonical_payment_key_sha256).toLowerCase();
  const contract = address(call.fulfillment_contract_address);
  const recipient = address(call.delivery_address);
  const units = text(call.void_amount_units);
  const atoms = text(call.token_amount_atoms);
  const calldata = text(call.calldata).toLowerCase();
  const calldataSha = text(call.calldata_sha256).toLowerCase();
  const callFingerprint = text(call.call_fingerprint_sha256).toLowerCase();
  if (
    !identity ||
    identity.length > MAX_PAYMENT_ID_CHARS ||
    !PAYMENT_ID.test(identity) ||
    !SHA256.test(key) ||
    contract !== policy.fulfillment_contract_address ||
    !recipient ||
    !DECIMAL.test(units) ||
    units.length > MAX_UINT256_DECIMAL_DIGITS ||
    !DECIMAL.test(atoms) ||
    atoms.length > MAX_UINT256_DECIMAL_DIGITS ||
    !/^0x[0-9a-f]+$/.test(calldata) ||
    !SHA256.test(calldataSha) ||
    !SHA256.test(callFingerprint)
  ) {
    return {
      ok: false,
      reason: "payment_keyed_fulfillment_receipt_call_invalid",
      transaction_hash: transactionHash,
    };
  }

  const identityMatch = PAYMENT_ID.exec(identity);
  if (!identityMatch || identityMatch[1] !== call.source_chain) {
    return {
      ok: false,
      reason: "payment_keyed_fulfillment_receipt_call_identity_invalid",
      transaction_hash: transactionHash,
    };
  }
  const verifiedPayment = bindBuyVoidSourceFinalityPaymentV1({
    source_chain: identityMatch[1],
    transaction_hash: identityMatch[2],
    reservation_canonical_payment_identity: identity,
    observed_canonical_payment_identity: identity,
    observed_payment_key_sha256: key,
  });
  if (
    !verifiedPayment ||
    verifiedPayment.canonical_payment_identity !== identity ||
    verifiedPayment.payment_key_sha256 !== key
  ) {
    return {
      ok: false,
      reason: "payment_keyed_fulfillment_receipt_payment_key_invalid",
      transaction_hash: transactionHash,
    };
  }

  const unitValue = BigInt(units);
  const atomValue = BigInt(atoms);
  if (
    unitValue <= 0n ||
    atomValue <= 0n ||
    atomValue !== unitValue * TOKEN_ATOM_MULTIPLIER
  ) {
    return {
      ok: false,
      reason: "payment_keyed_fulfillment_receipt_call_amount_invalid",
      transaction_hash: transactionHash,
    };
  }

  const expectedCalldata = FULFILLMENT_CALLS.encodeFunctionData("fulfill", [
    "0x" + key,
    recipient,
    atomValue,
  ]).toLowerCase();
  if (
    calldata !== expectedCalldata ||
    calldataSha !== sha256(calldata)
  ) {
    return {
      ok: false,
      reason: "payment_keyed_fulfillment_receipt_call_calldata_invalid",
      transaction_hash: transactionHash,
    };
  }

  const expectedCallFingerprint = sha256(
    JSON.stringify({
      marker: VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CALL_V1,
      version: 1,
      chain_id: "2050",
      fulfillment_contract_address: contract,
      canonical_payment_identity: identity,
      canonical_payment_key_sha256: key,
      delivery_address: recipient,
      void_amount_units: unitValue.toString(),
      token_amount_atoms: atomValue.toString(),
      value_wei: "0",
      calldata,
    }),
  );
  if (callFingerprint !== expectedCallFingerprint) {
    return {
      ok: false,
      reason: "payment_keyed_fulfillment_receipt_call_fingerprint_invalid",
      transaction_hash: transactionHash,
    };
  }

  return {
    ok: true,
    expected: {
      transaction_hash: transactionHash,
      payment_delivery_id: "0x" + key,
      canonical_payment_identity: identity,
      delivery_address: recipient,
      void_amount_units: units,
      token_amount_atoms: atomValue,
    },
  };
}

function receiptBinding(
  value: unknown,
  expected: Readonly<ExpectedCallV1>,
  policy: Readonly<NormalizedPolicyV1>,
): FulfillmentReceiptBindingV1 | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const receipt = value as Record<string, any>;
  const transactionHash = hash(receipt.transactionHash);
  const from = address(receipt.from);
  const to = address(receipt.to);
  const blockNumber = parseHexQuantity(receipt.blockNumber);
  const blockHash = hash(receipt.blockHash);
  const status = parseHexQuantity(receipt.status);
  if (
    transactionHash !== expected.transaction_hash ||
    from !== policy.fulfillment_wallet_address ||
    to !== policy.fulfillment_contract_address ||
    blockNumber === null ||
    blockNumber <= 0n ||
    !blockHash ||
    status !== 1n
  ) {
    return null;
  }

  const logs = Array.isArray(receipt.logs) ? receipt.logs : null;
  if (!logs || logs.length > MAX_RECEIPT_LOGS) return null;

  const fulfilled: Array<{
    payment_delivery_id: string;
    recipient: string;
    amount_atoms: bigint;
    fulfilled_at_block: bigint;
    log_index: string;
  }> = [];
  const transfers: Array<{
    from: string;
    to: string;
    value: bigint;
    log_index: string;
  }> = [];

  for (const rawLog of logs) {
    const log = rawLog as any;
    const logAddress = address(log?.address);
    const topics = Array.isArray(log?.topics)
      ? log.topics.map((topic: unknown) => text(topic).toLowerCase())
      : [];
    const logTransactionHash = log?.transactionHash
      ? hash(log.transactionHash)
      : expected.transaction_hash;
    if (logTransactionHash !== expected.transaction_hash) return null;
    const indexValue = logIndex(log);
    if (!indexValue) return null;

    if (
      logAddress === policy.fulfillment_contract_address &&
      topics[0] === FULFILLED_TOPIC
    ) {
      let parsed;
      try {
        parsed = FULFILLMENT_EVENTS.parseLog({
          topics,
          data: text(log?.data),
        });
      } catch {
        return null;
      }
      if (!parsed || parsed.name !== "Fulfilled") return null;
      const paymentDeliveryId = text(parsed.args[0]).toLowerCase();
      const recipient = address(parsed.args[1]);
      let amountAtoms: bigint;
      let fulfilledAtBlock: bigint;
      try {
        amountAtoms = BigInt(parsed.args[2]);
        fulfilledAtBlock = BigInt(parsed.args[3]);
      } catch {
        return null;
      }
      if (
        !BYTES32.test(paymentDeliveryId) ||
        !recipient ||
        amountAtoms <= 0n ||
        fulfilledAtBlock <= 0n
      ) {
        return null;
      }
      fulfilled.push({
        payment_delivery_id: paymentDeliveryId,
        recipient,
        amount_atoms: amountAtoms,
        fulfilled_at_block: fulfilledAtBlock,
        log_index: indexValue,
      });
      continue;
    }

    if (
      logAddress === policy.void_token_address &&
      topics[0] === TRANSFER_TOPIC
    ) {
      let parsed;
      try {
        parsed = TRANSFER_EVENTS.parseLog({
          topics,
          data: text(log?.data),
        });
      } catch {
        return null;
      }
      if (!parsed || parsed.name !== "Transfer") return null;
      const transferFrom = address(parsed.args[0]);
      const transferTo = address(parsed.args[1]);
      let transferValue: bigint;
      try {
        transferValue = BigInt(parsed.args[2]);
      } catch {
        return null;
      }
      if (!transferFrom || !transferTo || transferValue <= 0n) return null;
      transfers.push({
        from: transferFrom,
        to: transferTo,
        value: transferValue,
        log_index: indexValue,
      });
    }
  }

  if (fulfilled.length !== 1 || transfers.length !== 1) return null;
  const event = fulfilled[0];
  const transfer = transfers[0];
  if (
    event.payment_delivery_id !== expected.payment_delivery_id ||
    event.recipient !== expected.delivery_address ||
    event.amount_atoms !== expected.token_amount_atoms ||
    event.fulfilled_at_block !== blockNumber ||
    transfer.from !== policy.fulfillment_contract_address ||
    transfer.to !== expected.delivery_address ||
    transfer.value !== expected.token_amount_atoms
  ) {
    return null;
  }

  const transferIndex = BigInt(transfer.log_index);
  const fulfillmentIndex = BigInt(event.log_index);
  if (transferIndex >= fulfillmentIndex) return null;

  return {
    transaction_hash: transactionHash,
    from,
    to,
    block_number: blockNumber,
    block_hash: blockHash,
    status: 1n,
    payment_delivery_id: event.payment_delivery_id,
    recipient: event.recipient,
    amount_atoms: event.amount_atoms,
    fulfilled_at_block: event.fulfilled_at_block,
    fulfillment_log_index: event.log_index,
    transfer_from: transfer.from,
    transfer_to: transfer.to,
    transfer_value: transfer.value,
    transfer_log_index: transfer.log_index,
  };
}

function sameBinding(
  left: Readonly<FulfillmentReceiptBindingV1>,
  right: Readonly<FulfillmentReceiptBindingV1>,
): boolean {
  return (
    left.transaction_hash === right.transaction_hash &&
    left.from === right.from &&
    left.to === right.to &&
    left.block_number === right.block_number &&
    left.block_hash === right.block_hash &&
    left.status === right.status &&
    left.payment_delivery_id === right.payment_delivery_id &&
    left.recipient === right.recipient &&
    left.amount_atoms === right.amount_atoms &&
    left.fulfilled_at_block === right.fulfilled_at_block &&
    left.fulfillment_log_index === right.fulfillment_log_index &&
    left.transfer_from === right.transfer_from &&
    left.transfer_to === right.transfer_to &&
    left.transfer_value === right.transfer_value &&
    left.transfer_log_index === right.transfer_log_index
  );
}

export async function runBuyVoidPaymentKeyedFulfillmentReceiptV1(
  input: BuyVoidPaymentKeyedFulfillmentReceiptInputV1,
): Promise<BuyVoidPaymentKeyedFulfillmentReceiptDecisionV1> {
  if (!input || !input.fulfillment_call || !input.policy) {
    return held("payment_keyed_fulfillment_receipt_missing_input");
  }

  const normalized = normalizePolicy(input.policy);
  if (normalized.ok === false) {
    return held(normalized.reason, {
      transaction_hash: hash(input.transaction_hash) || null,
      rpc_url_fingerprint_sha256: normalized.fingerprint,
    });
  }
  const policy = normalized.policy;
  const expectedDecision = expectedCall(input, policy);
  if (expectedDecision.ok === false) {
    return held(expectedDecision.reason, {
      transaction_hash: expectedDecision.transaction_hash,
      rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
    });
  }
  const expected = expectedDecision.expected;

  const methods: BuyVoidPaymentKeyedFulfillmentReceiptRpcMethodV1[] = [];
  const transport = input.transport || createHttpTransport(policy);
  const call = async (
    method: BuyVoidPaymentKeyedFulfillmentReceiptRpcMethodV1,
    params: unknown[],
  ): Promise<
    | { ok: true; value: unknown }
    | { ok: false; decision: BuyVoidPaymentKeyedFulfillmentReceiptHeldV1 }
  > => {
    methods.push(method);
    try {
      return { ok: true, value: await transport({ method, params }) };
    } catch (error) {
      return {
        ok: false,
        decision: held("payment_keyed_fulfillment_receipt_rpc_call_failed", {
          transaction_hash: expected.transaction_hash,
          rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
          rpc_methods_used: methods,
          detail: {
            method,
            error_class: String((error as Error)?.name || "Error"),
          },
        }),
      };
    }
  };

  const chainResponse = await call("eth_chainId", []);
  if (chainResponse.ok === false) return chainResponse.decision;
  if (parseHexQuantity(chainResponse.value) !== 2050n) {
    return held("payment_keyed_fulfillment_receipt_chain_id_mismatch", {
      transaction_hash: expected.transaction_hash,
      rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
    });
  }

  const receiptResponse = await call(
    "eth_getTransactionReceipt",
    [expected.transaction_hash],
  );
  if (receiptResponse.ok === false) return receiptResponse.decision;
  if (receiptResponse.value === null) {
    return held("payment_keyed_fulfillment_receipt_not_found", {
      transaction_hash: expected.transaction_hash,
      rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
    });
  }

  const first = receiptBinding(receiptResponse.value, expected, policy);
  if (!first) {
    return held("payment_keyed_fulfillment_receipt_binding_invalid", {
      transaction_hash: expected.transaction_hash,
      rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
    });
  }

  const headResponse = await call("eth_blockNumber", []);
  if (headResponse.ok === false) return headResponse.decision;
  const head = parseHexQuantity(headResponse.value);
  if (head === null || head < first.block_number) {
    return held("payment_keyed_fulfillment_receipt_chain_head_invalid", {
      transaction_hash: expected.transaction_hash,
      rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
      rpc_methods_used: methods,
    });
  }
  const confirmations = head - first.block_number + 1n;
  if (confirmations < policy.min_confirmations) {
    return held(
      "payment_keyed_fulfillment_receipt_confirmations_insufficient",
      {
        transaction_hash: expected.transaction_hash,
        rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
        rpc_methods_used: methods,
        detail: {
          observed_confirmations: confirmations.toString(),
          required_confirmations: policy.min_confirmations.toString(),
        },
      },
    );
  }

  const revalidationResponse = await call(
    "eth_getTransactionReceipt",
    [expected.transaction_hash],
  );
  if (revalidationResponse.ok === false) return revalidationResponse.decision;
  const second = receiptBinding(
    revalidationResponse.value,
    expected,
    policy,
  );
  if (!second) {
    return held(
      "payment_keyed_fulfillment_receipt_revalidation_invalid",
      {
        transaction_hash: expected.transaction_hash,
        rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
        rpc_methods_used: methods,
      },
    );
  }
  if (!sameBinding(first, second)) {
    return held(
      "payment_keyed_fulfillment_receipt_changed_during_confirmation_window",
      {
        transaction_hash: expected.transaction_hash,
        rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
        rpc_methods_used: methods,
        detail: {
          first_block_number: first.block_number.toString(),
          first_block_hash: first.block_hash,
          revalidated_block_number: second.block_number.toString(),
          revalidated_block_hash: second.block_hash,
        },
      },
    );
  }

  const evidenceFingerprint = sha256(
    [
      "marker=" + VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_RECEIPT_V1,
      "version=1",
      "chain_id=2050",
      "transaction_hash=" + expected.transaction_hash,
      "fulfillment_wallet_address=" + policy.fulfillment_wallet_address,
      "fulfillment_contract_address=" + policy.fulfillment_contract_address,
      "void_token_address=" + policy.void_token_address,
      "canonical_payment_identity=" + expected.canonical_payment_identity,
      "payment_delivery_id=" + expected.payment_delivery_id,
      "delivery_address=" + expected.delivery_address,
      "void_amount_units=" + expected.void_amount_units,
      "token_amount_atoms=" + expected.token_amount_atoms.toString(),
      "fulfillment_event_log_index=" + first.fulfillment_log_index,
      "transfer_event_log_index=" + first.transfer_log_index,
      "receipt_block_number=" + first.block_number.toString(),
      "receipt_block_hash=" + first.block_hash,
      "observed_confirmation_count=" + confirmations.toString(),
    ].join("\n"),
  );

  return {
    ok: true,
    status: "confirmed",
    marker: VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_RECEIPT_V1,
    version: 1,
    chain_id: "2050",
    transaction_hash: expected.transaction_hash,
    payment_delivery_id: expected.payment_delivery_id,
    canonical_payment_identity: expected.canonical_payment_identity,
    fulfillment_wallet_address: policy.fulfillment_wallet_address,
    fulfillment_contract_address: policy.fulfillment_contract_address,
    void_token_address: policy.void_token_address,
    delivery_address: expected.delivery_address,
    void_amount_units: expected.void_amount_units,
    token_amount_atoms: expected.token_amount_atoms.toString(),
    fulfillment_event_log_index: first.fulfillment_log_index,
    transfer_event_log_index: first.transfer_log_index,
    receipt_block_number: first.block_number.toString(),
    receipt_block_hash: first.block_hash,
    observed_confirmation_count: confirmations.toString(),
    receipt_evidence_fingerprint_sha256: evidenceFingerprint,
    rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
    rpc_methods_used: methods,
    mutation_performed: false,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
  };
}
