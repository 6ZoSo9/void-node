import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type {
  BuyVoidPreparedTransactionPlanReservationV1,
} from "./buy_void_prepared_transaction_plan_reservation_v1.js";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODY_V1 =
  "VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODY_V1";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODY_CONFIRMATION_V1 =
  "buyVoidPrepareTransactionInOpaqueCustodyV1";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODY_AUTHORITY_V1 = {
  source_only_contract: true,
  external_custodian_dependency_required: true,
  custodian_prepare_once_required: true,
  custodian_inspection_required: true,
  application_private_key_access: false,
  application_wallet_access: false,
  application_signing: false,
  external_custodian_signing_when_applied: true,
  opaque_private_handle_persistence: true,
  custody_handle_output: false,
  raw_signed_transaction_input: false,
  raw_signed_transaction_persistence: false,
  raw_signed_transaction_output: false,
  transaction_broadcast: false,
  automatic_retry: false,
  money_movement: false,
} as const;

const RECORD_SCHEMA =
  "void_buy_void_prepared_transaction_custody_record_v1";
const SHA256 = /^[0-9a-f]{64}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const HANDLE = /^[A-Za-z0-9._:@/-]{16,240}$/;
const MAX_JSON_BYTES = 256 * 1024;
const FORBIDDEN_RESULT_KEYS = new Set([
  "privatekey",
  "mnemonic",
  "seed",
  "seedphrase",
  "rawtransaction",
  "rawsignedtransaction",
  "signedtransaction",
  "signedpayload",
  "keystore",
]);

export type BuyVoidPreparedTransactionCustodianPrepareRequestV1 = {
  idempotency_key_sha256: string;
  saga_id: string;
  attempt_id: string;
  plan_reservation_id: string;
  transaction_plan_fingerprint_sha256: string;
  chain_id: "2050";
  wallet_address: string;
  nonce: number;
  delivery_address: string;
  native_value_wei: string;
  gas_limit: string;
  max_fee_per_gas_wei: string;
  max_priority_fee_per_gas_wei: string;
};

export type BuyVoidPreparedTransactionCustodianPreparedV1 = {
  ok: true;
  status: "prepared" | "duplicate";
  custody_handle: string;
  signed_transaction_hash: string;
  wallet_address: string;
  signer_fingerprint_sha256: string;
  transaction_plan_fingerprint_sha256: string;
  reason?: never;
};

export type BuyVoidPreparedTransactionCustodianHeldV1 = {
  ok: false;
  status: "held";
  reason: string;
  custody_handle?: never;
  signed_transaction_hash?: never;
  wallet_address?: never;
  signer_fingerprint_sha256?: never;
  transaction_plan_fingerprint_sha256?: never;
};

export type BuyVoidPreparedTransactionCustodianDecisionV1 =
  | BuyVoidPreparedTransactionCustodianPreparedV1
  | BuyVoidPreparedTransactionCustodianHeldV1;

export type BuyVoidPreparedTransactionCustodianV1 = {
  prepare_once: (
    request: Readonly<BuyVoidPreparedTransactionCustodianPrepareRequestV1>,
  ) => Promise<BuyVoidPreparedTransactionCustodianDecisionV1>;
  inspect_prepared: (request: Readonly<{
    idempotency_key_sha256: string;
    attempt_id: string;
    custody_handle: string;
  }>) => Promise<BuyVoidPreparedTransactionCustodianDecisionV1>;
};

export type BuyVoidPreparedTransactionCustodyRecordV1 = {
  schema: typeof RECORD_SCHEMA;
  marker: typeof VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODY_V1;
  version: 1;
  recorded_at_ms: number;
  saga_id: string;
  attempt_id: string;
  plan_reservation_id: string;
  idempotency_key_sha256: string;
  transaction_plan_fingerprint_sha256: string;
  nonce: number;
  wallet_address_fingerprint_sha256: string;
  signer_fingerprint_sha256: string;
  custody_handle: string;
  custody_handle_fingerprint_sha256: string;
  signed_transaction_hash: string;
  custody_status: "prepared";
  application_private_key_accessed: false;
  application_wallet_accessed: false;
  raw_signed_transaction_persisted: false;
  raw_signed_transaction_returned: false;
  transaction_broadcast_authorized: false;
  money_movement_authorized: false;
};

export type BuyVoidPreparedTransactionCustodyPublicProjectionV1 = Omit<
  BuyVoidPreparedTransactionCustodyRecordV1,
  "custody_handle"
> & {
  custody_handle_private: true;
};

export type BuyVoidPreparedTransactionCustodyDecisionV1 =
  | {
      ok: true;
      status: "dry_run";
      applied: false;
      mutation_performed: false;
      required_confirmation:
        typeof VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODY_CONFIRMATION_V1;
      idempotency_key_sha256: string;
      custody: null;
      custodian_called: false;
      external_signing_performed: false;
      transaction_broadcast_performed: false;
      raw_signed_transaction_persisted: false;
      raw_signed_transaction_returned: false;
      money_movement_performed: false;
      reason?: never;
      detail?: never;
    }
  | {
      ok: true;
      status: "prepared" | "duplicate";
      applied: true;
      mutation_performed: boolean;
      custody: BuyVoidPreparedTransactionCustodyPublicProjectionV1;
      custodian_called: boolean;
      external_signing_performed: boolean;
      transaction_broadcast_performed: false;
      raw_signed_transaction_persisted: false;
      raw_signed_transaction_returned: false;
      money_movement_performed: false;
      reason?: never;
      detail?: never;
    }
  | {
      ok: false;
      status: "held";
      applied: boolean;
      mutation_performed: false;
      reason: string;
      detail?: Record<string, unknown>;
      custodian_called: boolean;
      external_signing_performed: boolean;
      transaction_broadcast_performed: false;
      raw_signed_transaction_persisted: false;
      raw_signed_transaction_returned: false;
      money_movement_performed: false;
      custody?: never;
    };

export type PrepareBuyVoidTransactionCustodyInputV1 = {
  root_dir: string;
  plan: BuyVoidPreparedTransactionPlanReservationV1;
  custodian?: BuyVoidPreparedTransactionCustodianV1;
  apply?: boolean;
  confirmation?: unknown;
  now_ms?: number;
};

function held(
  applied: boolean,
  reason: string,
  options: {
    custodian_called?: boolean;
    external_signing_performed?: boolean;
    detail?: Record<string, unknown>;
  } = {},
): Extract<BuyVoidPreparedTransactionCustodyDecisionV1, { ok: false }> {
  return {
    ok: false,
    status: "held",
    applied,
    mutation_performed: false,
    reason,
    ...(options.detail ? { detail: options.detail } : {}),
    custodian_called: options.custodian_called === true,
    external_signing_performed:
      options.external_signing_performed === true,
    transaction_broadcast_performed: false,
    raw_signed_transaction_persisted: false,
    raw_signed_transaction_returned: false,
    money_movement_performed: false,
  };
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizedAddress(value: unknown): string {
  const address = String(value || "").trim().toLowerCase();
  return ADDRESS.test(address) ? address : "";
}

function safeNow(value: unknown): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : Date.now();
}

function forbiddenResultKey(value: unknown, depth = 0): string | null {
  if (!value || typeof value !== "object") return null;
  if (depth > 12) return "__custodian_result_depth_exceeded__";
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = forbiddenResultKey(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (FORBIDDEN_RESULT_KEYS.has(normalized)) return key;
    const found = forbiddenResultKey(child, depth + 1);
    if (found) return found;
  }
  return null;
}

function validatePlan(
  plan: BuyVoidPreparedTransactionPlanReservationV1,
): string | null {
  if (
    !plan ||
    plan.marker !== "VOID_BUY_VOID_PREPARED_TRANSACTION_PLAN_RESERVATION_V1" ||
    plan.version !== 1 ||
    !SHA256.test(String(plan.reservation_id || "")) ||
    !SHA256.test(String(plan.attempt_id || "")) ||
    !SHA256.test(String(plan.transaction_plan_fingerprint_sha256 || "")) ||
    plan.chain_id !== "2050" ||
    !normalizedAddress(plan.wallet_address) ||
    !normalizedAddress(plan.delivery_address) ||
    !Number.isSafeInteger(plan.nonce) ||
    plan.nonce < 0 ||
    plan.reservation_status !== "reserved" ||
    plan.raw_signed_transaction_persisted !== false ||
    plan.signing_authorized !== false ||
    plan.transaction_broadcast_authorized !== false ||
    plan.money_movement_authorized !== false
  ) {
    return "prepared_custody_plan_invalid";
  }
  return null;
}

function custodyRoot(rootDir: string): string {
  const raw = String(rootDir || "").trim();
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) {
    throw new Error("prepared_custody_root_must_be_absolute");
  }
  return path.join(
    path.resolve(raw),
    "buy-void-prepared-transaction-custody-v1",
  );
}

function ensurePrivateDirectory(directory: string): void {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
  const metadata = fs.lstatSync(directory);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error("prepared_custody_directory_must_be_direct_directory");
  }
  if (typeof process.getuid === "function" && metadata.uid !== process.getuid()) {
    throw new Error("prepared_custody_directory_owner_mismatch");
  }
  if ((metadata.mode & 0o077) !== 0) {
    throw new Error("prepared_custody_directory_must_be_private");
  }
}

function fsyncDirectory(directory: string): void {
  const descriptor = fs.openSync(directory, "r");
  try {
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
}

function recordPath(rootDir: string, attemptId: string): string {
  const root = custodyRoot(rootDir);
  const records = path.join(root, "records");
  ensurePrivateDirectory(root);
  ensurePrivateDirectory(records);
  return path.join(records, `${attemptId}.json`);
}

function atomicCreateJson(file: string, value: unknown): "created" | "exists" {
  const parent = path.dirname(file);
  ensurePrivateDirectory(parent);
  const temporary = path.join(
    parent,
    `.${path.basename(file)}.tmp-${process.pid}-${crypto.randomBytes(8).toString("hex")}`,
  );
  const descriptor = fs.openSync(temporary, "wx", 0o600);
  try {
    fs.writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  try {
    try {
      fs.linkSync(temporary, file);
      fsyncDirectory(parent);
      return "created";
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === "EEXIST") return "exists";
      throw error;
    }
  } finally {
    try {
      fs.unlinkSync(temporary);
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") throw error;
    }
  }
}

function readJsonObject(file: string): Record<string, any> | null {
  try {
    const metadata = fs.lstatSync(file);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
      throw new Error("prepared_custody_record_must_be_direct_file");
    }
    if (metadata.size < 2 || metadata.size > MAX_JSON_BYTES) {
      throw new Error("prepared_custody_record_size_out_of_range");
    }
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("prepared_custody_record_object_required");
    }
    return value as Record<string, any>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return null;
    throw error;
  }
}

function idempotencyKey(
  plan: BuyVoidPreparedTransactionPlanReservationV1,
): string {
  return sha256([
    "void-buy-prepared-transaction-custody-v1",
    plan.saga_id,
    plan.attempt_id,
    plan.reservation_id,
    plan.transaction_plan_fingerprint_sha256,
  ].join("\n"));
}

function prepareRequest(
  plan: BuyVoidPreparedTransactionPlanReservationV1,
): BuyVoidPreparedTransactionCustodianPrepareRequestV1 {
  return {
    idempotency_key_sha256: idempotencyKey(plan),
    saga_id: plan.saga_id,
    attempt_id: plan.attempt_id,
    plan_reservation_id: plan.reservation_id,
    transaction_plan_fingerprint_sha256:
      plan.transaction_plan_fingerprint_sha256,
    chain_id: "2050",
    wallet_address: plan.wallet_address,
    nonce: plan.nonce,
    delivery_address: plan.delivery_address,
    native_value_wei: plan.native_value_wei,
    gas_limit: plan.gas_limit,
    max_fee_per_gas_wei: plan.max_fee_per_gas_wei,
    max_priority_fee_per_gas_wei:
      plan.max_priority_fee_per_gas_wei,
  };
}

function validateCustodianDecision(
  decision: BuyVoidPreparedTransactionCustodianDecisionV1,
  request: BuyVoidPreparedTransactionCustodianPrepareRequestV1,
): BuyVoidPreparedTransactionCustodianPreparedV1 {
  const forbidden = forbiddenResultKey(decision);
  if (forbidden) throw new Error(`custodian_result_forbidden_key:${forbidden}`);
  if ("reason" in decision) {
    throw new Error(
      `custodian_prepare_held:${String(decision.reason || "unknown")}`,
    );
  }
  const wallet = normalizedAddress(decision.wallet_address);
  const hash = String(decision.signed_transaction_hash || "")
    .trim()
    .toLowerCase();
  const handle = String(decision.custody_handle || "").trim();
  const signerFingerprint = String(
    decision.signer_fingerprint_sha256 || "",
  ).trim().toLowerCase();
  const planFingerprint = String(
    decision.transaction_plan_fingerprint_sha256 || "",
  ).trim().toLowerCase();
  if (
    !["prepared", "duplicate"].includes(decision.status) ||
    !HANDLE.test(handle) ||
    !HASH.test(hash) ||
    wallet !== request.wallet_address ||
    !SHA256.test(signerFingerprint) ||
    planFingerprint !== request.transaction_plan_fingerprint_sha256
  ) {
    throw new Error("custodian_prepared_binding_invalid");
  }
  return {
    ok: true,
    status: decision.status,
    custody_handle: handle,
    signed_transaction_hash: hash,
    wallet_address: wallet,
    signer_fingerprint_sha256: signerFingerprint,
    transaction_plan_fingerprint_sha256: planFingerprint,
  };
}

function buildRecord(input: {
  plan: BuyVoidPreparedTransactionPlanReservationV1;
  prepared: BuyVoidPreparedTransactionCustodianPreparedV1;
  now_ms: number;
}): BuyVoidPreparedTransactionCustodyRecordV1 {
  return {
    schema: RECORD_SCHEMA,
    marker: VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODY_V1,
    version: 1,
    recorded_at_ms: input.now_ms,
    saga_id: input.plan.saga_id,
    attempt_id: input.plan.attempt_id,
    plan_reservation_id: input.plan.reservation_id,
    idempotency_key_sha256: idempotencyKey(input.plan),
    transaction_plan_fingerprint_sha256:
      input.plan.transaction_plan_fingerprint_sha256,
    nonce: input.plan.nonce,
    wallet_address_fingerprint_sha256:
      sha256(input.plan.wallet_address),
    signer_fingerprint_sha256:
      input.prepared.signer_fingerprint_sha256,
    custody_handle: input.prepared.custody_handle,
    custody_handle_fingerprint_sha256:
      sha256(input.prepared.custody_handle),
    signed_transaction_hash:
      input.prepared.signed_transaction_hash,
    custody_status: "prepared",
    application_private_key_accessed: false,
    application_wallet_accessed: false,
    raw_signed_transaction_persisted: false,
    raw_signed_transaction_returned: false,
    transaction_broadcast_authorized: false,
    money_movement_authorized: false,
  };
}

function parseRecord(
  value: Record<string, any>,
): BuyVoidPreparedTransactionCustodyRecordV1 {
  if (
    value.schema !== RECORD_SCHEMA ||
    value.marker !== VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODY_V1 ||
    value.version !== 1 ||
    !Number.isSafeInteger(value.recorded_at_ms) ||
    value.recorded_at_ms <= 0 ||
    !/^voidbvfsg1_[0-9a-f]{64}$/.test(String(value.saga_id || "")) ||
    !SHA256.test(String(value.attempt_id || "")) ||
    !SHA256.test(String(value.plan_reservation_id || "")) ||
    !SHA256.test(String(value.idempotency_key_sha256 || "")) ||
    !SHA256.test(String(value.transaction_plan_fingerprint_sha256 || "")) ||
    !Number.isSafeInteger(value.nonce) ||
    value.nonce < 0 ||
    !SHA256.test(String(value.wallet_address_fingerprint_sha256 || "")) ||
    !SHA256.test(String(value.signer_fingerprint_sha256 || "")) ||
    !HANDLE.test(String(value.custody_handle || "")) ||
    !SHA256.test(String(value.custody_handle_fingerprint_sha256 || "")) ||
    value.custody_handle_fingerprint_sha256 !== sha256(value.custody_handle) ||
    !HASH.test(String(value.signed_transaction_hash || "")) ||
    value.custody_status !== "prepared" ||
    value.application_private_key_accessed !== false ||
    value.application_wallet_accessed !== false ||
    value.raw_signed_transaction_persisted !== false ||
    value.raw_signed_transaction_returned !== false ||
    value.transaction_broadcast_authorized !== false ||
    value.money_movement_authorized !== false
  ) {
    throw new Error("prepared_custody_record_invalid");
  }
  return value as BuyVoidPreparedTransactionCustodyRecordV1;
}

function assertRecordMatchesPlan(
  record: BuyVoidPreparedTransactionCustodyRecordV1,
  plan: BuyVoidPreparedTransactionPlanReservationV1,
): void {
  if (
    record.saga_id !== plan.saga_id ||
    record.attempt_id !== plan.attempt_id ||
    record.plan_reservation_id !== plan.reservation_id ||
    record.idempotency_key_sha256 !== idempotencyKey(plan) ||
    record.transaction_plan_fingerprint_sha256 !==
      plan.transaction_plan_fingerprint_sha256 ||
    record.nonce !== plan.nonce ||
    record.wallet_address_fingerprint_sha256 !==
      sha256(plan.wallet_address)
  ) {
    throw new Error("prepared_custody_plan_binding_conflict");
  }
}

function publicProjection(
  record: BuyVoidPreparedTransactionCustodyRecordV1,
): BuyVoidPreparedTransactionCustodyPublicProjectionV1 {
  const { custody_handle: privateHandle, ...publicRecord } = record;
  void privateHandle;
  return {
    ...publicRecord,
    custody_handle_private: true,
  };
}

export async function prepareBuyVoidTransactionInCustodyV1(
  input: PrepareBuyVoidTransactionCustodyInputV1,
): Promise<BuyVoidPreparedTransactionCustodyDecisionV1> {
  const planError = validatePlan(input?.plan);
  if (planError) return held(input?.apply === true, planError);
  const key = idempotencyKey(input.plan);

  if (input?.apply !== true) {
    return {
      ok: true,
      status: "dry_run",
      applied: false,
      mutation_performed: false,
      required_confirmation:
        VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODY_CONFIRMATION_V1,
      idempotency_key_sha256: key,
      custody: null,
      custodian_called: false,
      external_signing_performed: false,
      transaction_broadcast_performed: false,
      raw_signed_transaction_persisted: false,
      raw_signed_transaction_returned: false,
      money_movement_performed: false,
    };
  }

  if (
    String(input?.confirmation || "") !==
      VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODY_CONFIRMATION_V1
  ) {
    return held(true, "prepared_custody_confirmation_required", {
      detail: {
        required_confirmation:
          VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODY_CONFIRMATION_V1,
      },
    });
  }

  const custodian = input?.custodian;
  if (
    !custodian ||
    typeof custodian.prepare_once !== "function" ||
    typeof custodian.inspect_prepared !== "function"
  ) {
    return held(true, "prepared_custodian_dependency_required");
  }

  try {
    const file = recordPath(input.root_dir, input.plan.attempt_id);
    const existingRaw = readJsonObject(file);
    if (existingRaw) {
      const existing = parseRecord(existingRaw);
      assertRecordMatchesPlan(existing, input.plan);
      const inspected = validateCustodianDecision(
        await custodian.inspect_prepared({
          idempotency_key_sha256: existing.idempotency_key_sha256,
          attempt_id: existing.attempt_id,
          custody_handle: existing.custody_handle,
        }),
        prepareRequest(input.plan),
      );
      if (
        inspected.custody_handle !== existing.custody_handle ||
        inspected.signed_transaction_hash !==
          existing.signed_transaction_hash ||
        inspected.signer_fingerprint_sha256 !==
          existing.signer_fingerprint_sha256
      ) {
        throw new Error("prepared_custody_inspection_conflict");
      }
      return {
        ok: true,
        status: "duplicate",
        applied: true,
        mutation_performed: false,
        custody: publicProjection(existing),
        custodian_called: true,
        external_signing_performed: false,
        transaction_broadcast_performed: false,
        raw_signed_transaction_persisted: false,
        raw_signed_transaction_returned: false,
        money_movement_performed: false,
      };
    }

    const request = prepareRequest(input.plan);
    let external: BuyVoidPreparedTransactionCustodianDecisionV1;
    try {
      external = await custodian.prepare_once(request);
    } catch (error) {
      return held(true, "prepared_custodian_call_failed", {
        custodian_called: true,
        external_signing_performed: true,
        detail: {
          error_class: String((error as Error)?.name || "Error").slice(0, 80),
        },
      });
    }
    const prepared = validateCustodianDecision(external, request);
    const record = buildRecord({
      plan: input.plan,
      prepared,
      now_ms: safeNow(input?.now_ms),
    });
    const created = atomicCreateJson(file, record);
    if (created === "exists") {
      const racedRaw = readJsonObject(file);
      if (!racedRaw) throw new Error("prepared_custody_race_unreadable");
      const raced = parseRecord(racedRaw);
      assertRecordMatchesPlan(raced, input.plan);
      if (
        raced.custody_handle !== record.custody_handle ||
        raced.signed_transaction_hash !== record.signed_transaction_hash ||
        raced.signer_fingerprint_sha256 !== record.signer_fingerprint_sha256
      ) {
        throw new Error("prepared_custody_race_conflict");
      }
      return {
        ok: true,
        status: "duplicate",
        applied: true,
        mutation_performed: false,
        custody: publicProjection(raced),
        custodian_called: true,
        external_signing_performed: prepared.status === "prepared",
        transaction_broadcast_performed: false,
        raw_signed_transaction_persisted: false,
        raw_signed_transaction_returned: false,
        money_movement_performed: false,
      };
    }

    return {
      ok: true,
      status: "prepared",
      applied: true,
      mutation_performed: true,
      custody: publicProjection(record),
      custodian_called: true,
      external_signing_performed: prepared.status === "prepared",
      transaction_broadcast_performed: false,
      raw_signed_transaction_persisted: false,
      raw_signed_transaction_returned: false,
      money_movement_performed: false,
    };
  } catch (error) {
    return held(true, "prepared_custody_failed", {
      custodian_called: true,
      detail: {
        message: String((error as Error)?.message || error).slice(0, 240),
      },
    });
  }
}

export function readBuyVoidPreparedTransactionCustodyV1(input: {
  root_dir: string;
  attempt_id: string;
}): BuyVoidPreparedTransactionCustodyPublicProjectionV1 | null {
  const attemptId = String(input?.attempt_id || "").trim().toLowerCase();
  if (!SHA256.test(attemptId)) {
    throw new Error("prepared_custody_attempt_id_invalid");
  }
  const raw = readJsonObject(recordPath(input.root_dir, attemptId));
  if (!raw) return null;
  return publicProjection(parseRecord(raw));
}
