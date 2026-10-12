import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import type {
  BuyVoidPreparedTransactionBroadcastRequestV1,
  BuyVoidPreparedTransactionBroadcasterDecisionV1,
  BuyVoidPreparedTransactionBroadcasterV1,
  BuyVoidPreparedTransactionBroadcastReceiptV1,
} from "./buy_void_prepared_transaction_broadcast_custody_v1.js";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_IPC_V1 =
  "VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_IPC_V1";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_IPC_AUTHORITY_V1 = {
  source_only_contract: true,
  unix_socket_only: true,
  socket_path_server_controlled: true,
  socket_must_be_private: true,
  same_uid_socket_required_when_available: true,
  one_request_per_connection: true,
  bounded_request_bytes: true,
  bounded_response_bytes: true,
  bounded_response_time: true,
  exact_response_schema_required: true,
  metadata_only_request: true,
  raw_signed_transaction_input: false,
  raw_signed_transaction_persistence: false,
  raw_signed_transaction_output: false,
  custody_handle_input: false,
  custody_handle_output: false,
  application_private_material_access: false,
  application_wallet_access: false,
  application_signing: false,
  external_submission_possible_through_private_service: true,
  automatic_resubmission: false,
  runtime_route_mount: false,
  background_loop: false,
  startup_execution: false,
} as const;

const REQUEST_SCHEMA =
  "void_buy_void_prepared_transaction_broadcaster_ipc_request_v1";
const RESPONSE_SCHEMA =
  "void_buy_void_prepared_transaction_broadcaster_ipc_response_v1";
const SHA256 = /^[0-9a-f]{64}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/;
const BROADCAST_INTENT_ID = /^voidbvbci1_[0-9a-f]{64}$/;
const DECIMAL = /^(0|[1-9][0-9]*)$/;
const SAFE_PROVIDER_ID = /^[A-Za-z0-9._:@/-]{0,200}$/;
const SAFE_REASON = /^[a-z][a-z0-9_]{2,159}$/;
const MAX_RESULT_DEPTH = 16;
const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_BYTES = 64 * 1024;
const MAX_MAX_BYTES = 256 * 1024;

const REQUEST_KEYS = [
  "submission_idempotency_key_sha256",
  "saga_id",
  "attempt_id",
  "broadcast_intent_id",
  "custody_idempotency_key_sha256",
  "custody_handle_fingerprint_sha256",
  "transaction_plan_fingerprint_sha256",
  "signed_transaction_hash",
] as const;

const READY_KEYS = [
  "ok",
  "status",
  "transaction_hash",
  "provider_submission_id",
  "definitive_not_submitted",
  "submission_call_performed",
  "submission_may_have_occurred",
  "receipt",
] as const;

const HELD_KEYS = ["ok", "status", "reason"] as const;
const RECEIPT_KEYS = [
  "chain_id",
  "transaction_hash",
  "transaction_status",
  "block_number",
  "block_hash",
  "current_block_number",
  "confirmation_count",
  "from_address",
  "to_address",
  "amount_units",
] as const;

const FORBIDDEN_RESULT_KEYS = new Set([
  "privatekey",
  "private_key",
  "mnemonic",
  "seed",
  "seedphrase",
  "seed_phrase",
  "keystore",
  "password",
  "secret",
  "custodyhandle",
  "custody_handle",
  "rawtransaction",
  "raw_transaction",
  "rawsignedtransaction",
  "raw_signed_transaction",
  "signedtransaction",
  "signed_transaction",
  "signedpayload",
  "signed_payload",
]);

export type BuyVoidPreparedTransactionBroadcasterIpcOptionsV1 = {
  socket_path: string;
  timeout_ms?: number;
  max_request_bytes?: number;
  max_response_bytes?: number;
};

type IpcMethodV1 = "submit_once" | "inspect_submission";

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function directObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label}_object_required`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error(`${label}_prototype_invalid`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label}_keys_invalid`);
  }
}

function normalizedKey(value: unknown): string {
  return text(value).toLowerCase().replace(/[^a-z0-9_]/g, "");
}

function forbiddenResultKey(value: unknown, depth = 0): string | null {
  if (!value || typeof value !== "object") return null;
  if (depth > MAX_RESULT_DEPTH) return "__broadcast_result_depth_exceeded__";
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = forbiddenResultKey(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  for (const [key, child] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (FORBIDDEN_RESULT_KEYS.has(normalizedKey(key))) return key;
    const found = forbiddenResultKey(child, depth + 1);
    if (found) return found;
  }
  return null;
}

function validateRequest(
  value: Readonly<BuyVoidPreparedTransactionBroadcastRequestV1>,
): BuyVoidPreparedTransactionBroadcastRequestV1 {
  const object = directObject(
    value,
    "prepared_broadcaster_ipc_request_payload",
  );
  exactKeys(object, REQUEST_KEYS, "prepared_broadcaster_ipc_request_payload");

  const normalized: BuyVoidPreparedTransactionBroadcastRequestV1 = {
    submission_idempotency_key_sha256: text(
      object.submission_idempotency_key_sha256,
    ).toLowerCase(),
    saga_id: text(object.saga_id).toLowerCase(),
    attempt_id: text(object.attempt_id).toLowerCase(),
    broadcast_intent_id: text(object.broadcast_intent_id).toLowerCase(),
    custody_idempotency_key_sha256: text(
      object.custody_idempotency_key_sha256,
    ).toLowerCase(),
    custody_handle_fingerprint_sha256: text(
      object.custody_handle_fingerprint_sha256,
    ).toLowerCase(),
    transaction_plan_fingerprint_sha256: text(
      object.transaction_plan_fingerprint_sha256,
    ).toLowerCase(),
    signed_transaction_hash: text(object.signed_transaction_hash).toLowerCase(),
  };

  if (
    !SHA256.test(normalized.submission_idempotency_key_sha256) ||
    !SAGA_ID.test(normalized.saga_id) ||
    !SHA256.test(normalized.attempt_id) ||
    !BROADCAST_INTENT_ID.test(normalized.broadcast_intent_id) ||
    !SHA256.test(normalized.custody_idempotency_key_sha256) ||
    !SHA256.test(normalized.custody_handle_fingerprint_sha256) ||
    !SHA256.test(normalized.transaction_plan_fingerprint_sha256) ||
    !HASH.test(normalized.signed_transaction_hash)
  ) {
    throw new Error("prepared_broadcaster_ipc_request_binding_invalid");
  }

  return normalized;
}

function validateReceipt(
  value: unknown,
  expectedHash: string,
  expectedStatus: 0 | 1,
): BuyVoidPreparedTransactionBroadcastReceiptV1 {
  const object = directObject(value, "prepared_broadcaster_ipc_receipt");
  exactKeys(object, RECEIPT_KEYS, "prepared_broadcaster_ipc_receipt");

  const receipt: BuyVoidPreparedTransactionBroadcastReceiptV1 = {
    chain_id: "2050",
    transaction_hash: text(object.transaction_hash).toLowerCase(),
    transaction_status: Number(object.transaction_status) as 0 | 1,
    block_number: text(object.block_number),
    block_hash: text(object.block_hash).toLowerCase(),
    current_block_number: text(object.current_block_number),
    confirmation_count: text(object.confirmation_count),
    from_address: text(object.from_address).toLowerCase(),
    to_address: text(object.to_address).toLowerCase(),
    amount_units: text(object.amount_units),
  };

  if (
    object.chain_id !== "2050" ||
    receipt.transaction_hash !== expectedHash ||
    receipt.transaction_status !== expectedStatus ||
    !DECIMAL.test(receipt.block_number) ||
    BigInt(receipt.block_number) <= 0n ||
    !HASH.test(receipt.block_hash) ||
    !DECIMAL.test(receipt.current_block_number) ||
    BigInt(receipt.current_block_number) <= 0n ||
    !DECIMAL.test(receipt.confirmation_count) ||
    BigInt(receipt.confirmation_count) <= 0n ||
    !ADDRESS.test(receipt.from_address) ||
    !ADDRESS.test(receipt.to_address) ||
    !DECIMAL.test(receipt.amount_units) ||
    BigInt(receipt.amount_units) <= 0n
  ) {
    throw new Error("prepared_broadcaster_ipc_receipt_invalid");
  }

  const observed =
    BigInt(receipt.current_block_number) -
    BigInt(receipt.block_number) +
    1n;
  if (
    observed <= 0n ||
    observed.toString() !== receipt.confirmation_count
  ) {
    throw new Error(
      "prepared_broadcaster_ipc_receipt_confirmation_count_invalid",
    );
  }
  return receipt;
}

function validateDecision(
  value: unknown,
  request: BuyVoidPreparedTransactionBroadcastRequestV1,
): BuyVoidPreparedTransactionBroadcasterDecisionV1 {
  const forbidden = forbiddenResultKey(value);
  if (forbidden) {
    throw new Error(
      `prepared_broadcaster_ipc_secret_response_rejected:${forbidden}`,
    );
  }

  const object = directObject(value, "prepared_broadcaster_ipc_decision");
  if (object.ok === false) {
    exactKeys(object, HELD_KEYS, "prepared_broadcaster_ipc_held");
    const reason = text(object.reason);
    if (
      object.status !== "held" ||
      !SAFE_REASON.test(reason) ||
      !reason.includes("_") ||
      /(?:0x)?[0-9a-fA-F]{48,}/.test(reason)
    ) {
      throw new Error("prepared_broadcaster_ipc_held_invalid");
    }
    return { ok: false, status: "held", reason };
  }

  exactKeys(object, READY_KEYS, "prepared_broadcaster_ipc_ready");
  const status = text(object.status);
  const transactionHash = text(object.transaction_hash).toLowerCase();
  const providerSubmissionId = text(object.provider_submission_id);
  if (
    object.ok !== true ||
    ![
      "not_submitted",
      "unknown",
      "accepted",
      "confirmed",
      "reverted",
    ].includes(status) ||
    transactionHash !== request.signed_transaction_hash ||
    !SAFE_PROVIDER_ID.test(providerSubmissionId)
  ) {
    throw new Error("prepared_broadcaster_ipc_ready_invalid");
  }

  if (status === "not_submitted") {
    if (
      object.definitive_not_submitted !== true ||
      object.submission_call_performed !== false ||
      object.submission_may_have_occurred !== false ||
      object.receipt !== null
    ) {
      throw new Error("prepared_broadcaster_ipc_not_submitted_invalid");
    }
    return {
      ok: true,
      status: "not_submitted",
      transaction_hash: transactionHash,
      provider_submission_id: providerSubmissionId,
      definitive_not_submitted: true,
      submission_call_performed: false,
      submission_may_have_occurred: false,
      receipt: null,
    };
  }

  if (
    object.definitive_not_submitted !== false ||
    object.submission_call_performed !== true ||
    object.submission_may_have_occurred !== true
  ) {
    throw new Error("prepared_broadcaster_ipc_submission_flags_invalid");
  }

  if (status === "unknown" || status === "accepted") {
    if (object.receipt !== null) {
      throw new Error("prepared_broadcaster_ipc_nonterminal_receipt_invalid");
    }
    return {
      ok: true,
      status,
      transaction_hash: transactionHash,
      provider_submission_id: providerSubmissionId,
      definitive_not_submitted: false,
      submission_call_performed: true,
      submission_may_have_occurred: true,
      receipt: null,
    };
  }

  const receipt = validateReceipt(
    object.receipt,
    transactionHash,
    status === "confirmed" ? 1 : 0,
  );
  return {
    ok: true,
    status: status as "confirmed" | "reverted",
    transaction_hash: transactionHash,
    provider_submission_id: providerSubmissionId,
    definitive_not_submitted: false,
    submission_call_performed: true,
    submission_may_have_occurred: true,
    receipt,
  };
}

function positiveBoundedInteger(
  value: unknown,
  fallback: number,
  maximum: number,
  label: string,
): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0 || parsed > maximum) {
    throw new Error(`${label}_invalid`);
  }
  return parsed;
}

function assertNoSymlinkAncestors(target: string, label: string): void {
  const resolved = path.resolve(target);
  const parsed = path.parse(resolved);
  let cursor = parsed.root;
  const relative = resolved.slice(parsed.root.length);
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, segment);
    try {
      const metadata = fs.lstatSync(cursor);
      if (metadata.isSymbolicLink()) {
        throw new Error(`${label}_symlink_ancestor_rejected`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return;
      throw error;
    }
  }
}

function assertPrivateSocket(socketPath: string): string {
  const raw = text(socketPath);
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) {
    throw new Error("prepared_broadcaster_ipc_socket_path_must_be_absolute");
  }
  const resolved = path.resolve(raw);
  const parent = path.dirname(resolved);
  assertNoSymlinkAncestors(parent, "prepared_broadcaster_ipc_socket_parent");
  const parentMetadata = fs.lstatSync(parent);
  if (
    !parentMetadata.isDirectory() ||
    parentMetadata.isSymbolicLink() ||
    (parentMetadata.mode & 0o077) !== 0
  ) {
    throw new Error("prepared_broadcaster_ipc_socket_parent_must_be_private");
  }
  if (
    typeof process.getuid === "function" &&
    parentMetadata.uid !== process.getuid()
  ) {
    throw new Error("prepared_broadcaster_ipc_socket_parent_owner_mismatch");
  }

  const metadata = fs.lstatSync(resolved);
  if (!metadata.isSocket() || metadata.isSymbolicLink()) {
    throw new Error("prepared_broadcaster_ipc_socket_must_be_direct_socket");
  }
  if (
    typeof process.getuid === "function" &&
    metadata.uid !== process.getuid()
  ) {
    throw new Error("prepared_broadcaster_ipc_socket_owner_mismatch");
  }
  if ((metadata.mode & 0o077) !== 0) {
    throw new Error("prepared_broadcaster_ipc_socket_must_be_private");
  }
  return resolved;
}

function callIpc(
  options: BuyVoidPreparedTransactionBroadcasterIpcOptionsV1,
  method: IpcMethodV1,
  input: Readonly<BuyVoidPreparedTransactionBroadcastRequestV1>,
): Promise<BuyVoidPreparedTransactionBroadcasterDecisionV1> {
  const request = validateRequest(input);
  const socketPath = assertPrivateSocket(options.socket_path);
  const timeoutMs = positiveBoundedInteger(
    options.timeout_ms,
    DEFAULT_TIMEOUT_MS,
    MAX_TIMEOUT_MS,
    "prepared_broadcaster_ipc_timeout_ms",
  );
  const maxRequestBytes = positiveBoundedInteger(
    options.max_request_bytes,
    DEFAULT_MAX_BYTES,
    MAX_MAX_BYTES,
    "prepared_broadcaster_ipc_max_request_bytes",
  );
  const maxResponseBytes = positiveBoundedInteger(
    options.max_response_bytes,
    DEFAULT_MAX_BYTES,
    MAX_MAX_BYTES,
    "prepared_broadcaster_ipc_max_response_bytes",
  );

  const requestId = crypto.randomBytes(32).toString("hex");
  const envelope = {
    schema: REQUEST_SCHEMA,
    marker: VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_IPC_V1,
    version: 1,
    request_id_sha256: requestId,
    method,
    request,
  };
  const line = `${JSON.stringify(envelope)}\n`;
  if (Buffer.byteLength(line, "utf8") > maxRequestBytes) {
    throw new Error("prepared_broadcaster_ipc_request_too_large");
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let response = "";
    const socket = net.createConnection({ path: socketPath });

    const fail = (error: unknown): void => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(error instanceof Error ? error : new Error(String(error)));
    };
    const finish = (
      decision: BuyVoidPreparedTransactionBroadcasterDecisionV1,
    ): void => {
      if (settled) return;
      settled = true;
      socket.removeAllListeners("data");
      socket.destroy();
      resolve(decision);
    };

    socket.setEncoding("utf8");
    socket.setTimeout(timeoutMs);
    socket.on("connect", () => socket.write(line));
    socket.on("timeout", () =>
      fail(new Error("prepared_broadcaster_ipc_response_timeout")),
    );
    socket.on("error", (error) =>
      fail(
        new Error(
          `prepared_broadcaster_ipc_transport_failed:${text(
            (error as Error)?.message || error,
          ).slice(0, 160)}`,
        ),
      ),
    );
    socket.on("data", (chunk: string) => {
      if (settled) return;
      response += chunk;
      if (Buffer.byteLength(response, "utf8") > maxResponseBytes) {
        fail(new Error("prepared_broadcaster_ipc_response_too_large"));
        return;
      }
      const newline = response.indexOf("\n");
      if (newline < 0) return;
      if (response.slice(newline + 1).trim()) {
        fail(new Error("prepared_broadcaster_ipc_multiple_responses_rejected"));
        return;
      }
      try {
        const parsed = directObject(
          JSON.parse(response.slice(0, newline)),
          "prepared_broadcaster_ipc_response",
        );
        exactKeys(
          parsed,
          ["schema", "marker", "version", "request_id_sha256", "decision"],
          "prepared_broadcaster_ipc_response",
        );
        if (
          parsed.schema !== RESPONSE_SCHEMA ||
          parsed.marker !==
            VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_IPC_V1 ||
          parsed.version !== 1 ||
          parsed.request_id_sha256 !== requestId
        ) {
          throw new Error("prepared_broadcaster_ipc_response_binding_invalid");
        }
        finish(validateDecision(parsed.decision, request));
      } catch (error) {
        fail(error);
      }
    });
    socket.on("end", () => {
      if (!settled) {
        fail(new Error("prepared_broadcaster_ipc_response_incomplete"));
      }
    });
  });
}

export function createBuyVoidPreparedTransactionBroadcasterIpcV1(
  options: BuyVoidPreparedTransactionBroadcasterIpcOptionsV1,
): BuyVoidPreparedTransactionBroadcasterV1 {
  const socketPath = text(options?.socket_path);
  if (!socketPath) {
    throw new Error("prepared_broadcaster_ipc_socket_path_required");
  }
  const fixed = { ...options, socket_path: socketPath };
  return {
    submit_once: async (request) =>
      callIpc(fixed, "submit_once", request),
    inspect_submission: async (request) =>
      callIpc(fixed, "inspect_submission", request),
  };
}
