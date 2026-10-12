import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import type {
  BuyVoidPreparedTransactionCustodianDecisionV1,
  BuyVoidPreparedTransactionCustodianPrepareRequestV1,
  BuyVoidPreparedTransactionCustodianV1,
} from "./buy_void_prepared_transaction_custody_v1.js";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_IPC_V1 =
  "VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_IPC_V1";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_IPC_AUTHORITY_V1 = {
  source_only_contract: true,
  unix_socket_only: true,
  socket_path_server_controlled: true,
  expected_signer_fingerprint_server_controlled: true,
  socket_must_be_private: true,
  same_uid_socket_required_when_available: true,
  one_request_per_connection: true,
  bounded_request_bytes: true,
  bounded_response_bytes: true,
  bounded_response_time: true,
  exact_response_schema_required: true,
  deterministic_idempotency_key_required: true,
  forbidden_secret_response_fields_rejected: true,
  secret_bearing_held_reason_rejected: true,
  application_private_key_access: false,
  application_wallet_access: false,
  application_signing: false,
  raw_signed_transaction_input: false,
  raw_signed_transaction_persistence: false,
  raw_signed_transaction_output: false,
  transaction_broadcast: false,
  automatic_retry: false,
  runtime_route_mount: false,
  background_loop: false,
  startup_execution: false,
  money_movement: false,
} as const;

const REQUEST_SCHEMA =
  "void_buy_void_prepared_transaction_custodian_ipc_request_v1";
const RESPONSE_SCHEMA =
  "void_buy_void_prepared_transaction_custodian_ipc_response_v1";
const SHA256 = /^[0-9a-f]{64}$/;
const SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/;
const IDEMPOTENCY_DOMAIN = "void-buy-prepared-transaction-custody-v1";
const HANDLE = /^custody:void-buy:[A-Za-z0-9._:@/-]{1,220}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const SAFE_REASON = /^[a-z][a-z0-9_]{2,159}$/;
const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_BYTES = 64 * 1024;
const MAX_MAX_BYTES = 256 * 1024;
const FORBIDDEN_RESPONSE_KEYS = new Set([
  "privatekey",
  "private_key",
  "mnemonic",
  "seed",
  "seedphrase",
  "seed_phrase",
  "keystore",
  "rawtransaction",
  "raw_transaction",
  "rawsignedtransaction",
  "raw_signed_transaction",
  "signedtransaction",
  "signed_transaction",
  "signedpayload",
  "signed_payload",
  "signingkey",
  "signing_key",
]);

export type BuyVoidPreparedTransactionCustodianIpcOptionsV1 = {
  socket_path: string;
  expected_signer_fingerprint_sha256: string;
  timeout_ms?: number;
  max_request_bytes?: number;
  max_response_bytes?: number;
};

type IpcMethodV1 = "prepare_once" | "inspect_prepared";

type IpcEnvelopeV1 = {
  schema: typeof REQUEST_SCHEMA;
  marker: typeof VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_IPC_V1;
  version: 1;
  request_id_sha256: string;
  method: IpcMethodV1;
  request: Record<string, unknown>;
};

function normalizedKey(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

function findForbiddenResponseKey(value: unknown, depth = 0): string | null {
  if (!value || typeof value !== "object") return null;
  if (depth > 12) return "__response_nesting_depth_exceeded__";
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findForbiddenResponseKey(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const normalized = normalizedKey(key);
    if (FORBIDDEN_RESPONSE_KEYS.has(normalized)) return key;
    const found = findForbiddenResponseKey(child, depth + 1);
    if (found) return found;
  }
  return null;
}

function expectedPrepareIdempotencyKey(
  request: Record<string, unknown>,
): string {
  const sagaId = String(request.saga_id || "").trim();
  const attemptId = String(request.attempt_id || "").trim().toLowerCase();
  const reservationId = String(request.plan_reservation_id || "")
    .trim()
    .toLowerCase();
  const planFingerprint = String(
    request.transaction_plan_fingerprint_sha256 || "",
  )
    .trim()
    .toLowerCase();
  const supplied = String(request.idempotency_key_sha256 || "")
    .trim()
    .toLowerCase();
  if (
    !SAGA_ID.test(sagaId) ||
    !SHA256.test(attemptId) ||
    !SHA256.test(reservationId) ||
    !SHA256.test(planFingerprint) ||
    !SHA256.test(supplied)
  ) {
    throw new Error("prepared_custodian_ipc_prepare_request_binding_invalid");
  }
  const expected = crypto
    .createHash("sha256")
    .update(
      [
        IDEMPOTENCY_DOMAIN,
        sagaId,
        attemptId,
        reservationId,
        planFingerprint,
      ].join("\n"),
      "utf8",
    )
    .digest("hex");
  if (supplied !== expected) {
    throw new Error("prepared_custodian_ipc_idempotency_key_mismatch");
  }
  return expected;
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

function assertPrivateDirectory(directory: string, label: string): void {
  const metadata = fs.lstatSync(directory);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error(`${label}_must_be_direct_directory`);
  }
  if (
    typeof process.getuid === "function" &&
    metadata.uid !== process.getuid()
  ) {
    throw new Error(`${label}_owner_mismatch`);
  }
  if ((metadata.mode & 0o077) !== 0) {
    throw new Error(`${label}_must_be_private`);
  }
}

function assertPrivateSocket(socketPath: string): string {
  const raw = String(socketPath || "").trim();
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) {
    throw new Error("prepared_custodian_ipc_socket_path_must_be_absolute");
  }
  const resolved = path.resolve(raw);
  assertNoSymlinkAncestors(
    path.dirname(resolved),
    "prepared_custodian_ipc_socket_parent",
  );
  assertPrivateDirectory(
    path.dirname(resolved),
    "prepared_custodian_ipc_socket_parent",
  );
  const metadata = fs.lstatSync(resolved);
  if (!metadata.isSocket() || metadata.isSymbolicLink()) {
    throw new Error("prepared_custodian_ipc_socket_must_be_direct_socket");
  }
  if (
    typeof process.getuid === "function" &&
    metadata.uid !== process.getuid()
  ) {
    throw new Error("prepared_custodian_ipc_socket_owner_mismatch");
  }
  if ((metadata.mode & 0o077) !== 0) {
    throw new Error("prepared_custodian_ipc_socket_must_be_private");
  }
  return resolved;
}

function validatePreparedDecision(
  object: Record<string, unknown>,
): BuyVoidPreparedTransactionCustodianDecisionV1 {
  const forbidden = findForbiddenResponseKey(object);
  if (forbidden) {
    throw new Error(`prepared_custodian_ipc_secret_response_rejected:${forbidden}`);
  }

  if (object.ok === false) {
    exactKeys(object, ["ok", "status", "reason"], "prepared_custodian_ipc_held");
    if (
      object.status !== "held" ||
      typeof object.reason !== "string" ||
      !SAFE_REASON.test(object.reason) ||
      !object.reason.includes("_") ||
      /(?:0x)?[0-9a-fA-F]{48,}/.test(object.reason)
    ) {
      throw new Error("prepared_custodian_ipc_held_invalid");
    }
    return {
      ok: false,
      status: "held",
      reason: object.reason,
    };
  }

  exactKeys(
    object,
    [
      "ok",
      "status",
      "custody_handle",
      "signed_transaction_hash",
      "wallet_address",
      "signer_fingerprint_sha256",
      "transaction_plan_fingerprint_sha256",
    ],
    "prepared_custodian_ipc_prepared",
  );
  const handle = String(object.custody_handle || "").trim();
  const hash = String(object.signed_transaction_hash || "").trim().toLowerCase();
  const wallet = String(object.wallet_address || "").trim().toLowerCase();
  const signerFingerprint = String(
    object.signer_fingerprint_sha256 || "",
  ).trim().toLowerCase();
  const planFingerprint = String(
    object.transaction_plan_fingerprint_sha256 || "",
  ).trim().toLowerCase();
  if (
    object.ok !== true ||
    (object.status !== "prepared" && object.status !== "duplicate") ||
    !HANDLE.test(handle) ||
    !HASH.test(hash) ||
    !ADDRESS.test(wallet) ||
    !SHA256.test(signerFingerprint) ||
    !SHA256.test(planFingerprint)
  ) {
    throw new Error("prepared_custodian_ipc_prepared_invalid");
  }
  return {
    ok: true,
    status: object.status,
    custody_handle: handle,
    signed_transaction_hash: hash,
    wallet_address: wallet,
    signer_fingerprint_sha256: signerFingerprint,
    transaction_plan_fingerprint_sha256: planFingerprint,
  };
}

function validateResponse(
  value: unknown,
  requestId: string,
  method: IpcMethodV1,
  request: Record<string, unknown>,
  expectedSignerFingerprint: string,
): BuyVoidPreparedTransactionCustodianDecisionV1 {
  const object = directObject(value, "prepared_custodian_ipc_response");
  exactKeys(
    object,
    ["schema", "marker", "version", "request_id_sha256", "decision"],
    "prepared_custodian_ipc_response",
  );
  if (
    object.schema !== RESPONSE_SCHEMA ||
    object.marker !== VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_IPC_V1 ||
    object.version !== 1 ||
    object.request_id_sha256 !== requestId
  ) {
    throw new Error("prepared_custodian_ipc_response_binding_invalid");
  }
  const decision = validatePreparedDecision(
    directObject(object.decision, "prepared_custodian_ipc_decision"),
  );
  if (!decision.ok) return decision;
  if (decision.signer_fingerprint_sha256 !== expectedSignerFingerprint) {
    throw new Error("prepared_custodian_ipc_signer_fingerprint_mismatch");
  }
  if (method === "prepare_once") {
    const idempotencyKey = String(request.idempotency_key_sha256 || "")
      .trim()
      .toLowerCase();
    const wallet = String(request.wallet_address || "").trim().toLowerCase();
    const planFingerprint = String(
      request.transaction_plan_fingerprint_sha256 || "",
    ).trim().toLowerCase();
    if (
      !SHA256.test(idempotencyKey) ||
      decision.custody_handle !== `custody:void-buy:ipc-v1/${idempotencyKey}` ||
      decision.wallet_address !== wallet ||
      decision.transaction_plan_fingerprint_sha256 !== planFingerprint
    ) {
      throw new Error("prepared_custodian_ipc_prepare_response_binding_invalid");
    }
  } else {
    const handle = String(request.custody_handle || "").trim();
    if (decision.custody_handle !== handle) {
      throw new Error("prepared_custodian_ipc_inspect_response_binding_invalid");
    }
  }
  return decision;
}

function callIpc(
  options: BuyVoidPreparedTransactionCustodianIpcOptionsV1,
  method: IpcMethodV1,
  request: Record<string, unknown>,
): Promise<BuyVoidPreparedTransactionCustodianDecisionV1> {
  if (method === "prepare_once") {
    expectedPrepareIdempotencyKey(request);
  }
  const socketPath = assertPrivateSocket(options.socket_path);
  const expectedSignerFingerprint = String(
    options.expected_signer_fingerprint_sha256 || "",
  ).trim().toLowerCase();
  if (!SHA256.test(expectedSignerFingerprint)) {
    throw new Error("prepared_custodian_ipc_expected_signer_fingerprint_required");
  }
  const timeoutMs = positiveBoundedInteger(
    options.timeout_ms,
    DEFAULT_TIMEOUT_MS,
    MAX_TIMEOUT_MS,
    "prepared_custodian_ipc_timeout_ms",
  );
  const maxRequestBytes = positiveBoundedInteger(
    options.max_request_bytes,
    DEFAULT_MAX_BYTES,
    MAX_MAX_BYTES,
    "prepared_custodian_ipc_max_request_bytes",
  );
  const maxResponseBytes = positiveBoundedInteger(
    options.max_response_bytes,
    DEFAULT_MAX_BYTES,
    MAX_MAX_BYTES,
    "prepared_custodian_ipc_max_response_bytes",
  );
  const requestId = crypto.randomBytes(32).toString("hex");
  const envelope: IpcEnvelopeV1 = {
    schema: REQUEST_SCHEMA,
    marker: VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_IPC_V1,
    version: 1,
    request_id_sha256: requestId,
    method,
    request,
  };
  const line = `${JSON.stringify(envelope)}\n`;
  if (Buffer.byteLength(line, "utf8") > maxRequestBytes) {
    throw new Error("prepared_custodian_ipc_request_too_large");
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let response = "";
    const socket = net.createConnection({ path: socketPath });

    const finishError = (error: unknown): void => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(error instanceof Error ? error : new Error(String(error)));
    };

    const finishDecision = (
      decision: BuyVoidPreparedTransactionCustodianDecisionV1,
    ): void => {
      if (settled) return;
      settled = true;
      socket.removeAllListeners("data");
      socket.destroy();
      resolve(decision);
    };

    socket.setEncoding("utf8");
    socket.setTimeout(timeoutMs);

    socket.on("connect", () => {
      socket.write(line);
    });
    socket.on("timeout", () => {
      finishError(new Error("prepared_custodian_ipc_response_timeout"));
    });
    socket.on("error", (error) => {
      finishError(
        new Error(
          `prepared_custodian_ipc_transport_failed:${String(
            (error as Error)?.message || error,
          ).slice(0, 160)}`,
        ),
      );
    });
    socket.on("data", (chunk: string) => {
      if (settled) return;
      response += chunk;
      if (Buffer.byteLength(response, "utf8") > maxResponseBytes) {
        finishError(new Error("prepared_custodian_ipc_response_too_large"));
        return;
      }
      const newline = response.indexOf("\n");
      if (newline < 0) return;
      const trailing = response.slice(newline + 1);
      if (trailing.trim()) {
        finishError(new Error("prepared_custodian_ipc_multiple_responses_rejected"));
        return;
      }
      const raw = response.slice(0, newline);
      try {
        finishDecision(
          validateResponse(
            JSON.parse(raw),
            requestId,
            method,
            request,
            expectedSignerFingerprint,
          ),
        );
      } catch (error) {
        finishError(error);
      }
    });
    socket.on("end", () => {
      if (!settled) {
        finishError(new Error("prepared_custodian_ipc_response_incomplete"));
      }
    });
  });
}

export function createBuyVoidPreparedTransactionCustodianIpcV1(
  options: BuyVoidPreparedTransactionCustodianIpcOptionsV1,
): BuyVoidPreparedTransactionCustodianV1 {
  const socketPath = String(options?.socket_path || "").trim();
  if (!socketPath) {
    throw new Error("prepared_custodian_ipc_socket_path_required");
  }
  const expectedSignerFingerprint = String(
    options?.expected_signer_fingerprint_sha256 || "",
  ).trim().toLowerCase();
  if (!SHA256.test(expectedSignerFingerprint)) {
    throw new Error("prepared_custodian_ipc_expected_signer_fingerprint_required");
  }
  const fixedOptions = {
    ...options,
    socket_path: socketPath,
    expected_signer_fingerprint_sha256: expectedSignerFingerprint,
  };
  return {
    prepare_once: async (
      request: Readonly<BuyVoidPreparedTransactionCustodianPrepareRequestV1>,
    ) =>
      callIpc(
        fixedOptions,
        "prepare_once",
        request as unknown as Record<string, unknown>,
      ),
    inspect_prepared: async (request) =>
      callIpc(
        fixedOptions,
        "inspect_prepared",
        request as unknown as Record<string, unknown>,
      ),
  };
}
