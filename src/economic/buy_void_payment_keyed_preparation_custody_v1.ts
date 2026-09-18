import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_REQUEST_SCHEMA_V1,
  type BuyVoidPaymentKeyedCustodianPrepareRequestV1,
} from "./buy_void_payment_keyed_custodian_prepare_request_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_CONFIRMATION_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_V1,
  runBuyVoidPaymentKeyedCustodianSignerV1,
} from "./buy_void_payment_keyed_custodian_signer_v1.js";
import type {
  BuyVoidDeliverySignerV1,
} from "./buy_void_delivery_sign_broadcast_adapter_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_CONFIRMATION_V1 =
  "buyVoidPreparePaymentKeyedTransactionCustodyV1";

export const VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_AUTHORITY_V1 = {
  source_only_contract: true,
  exact_payment_keyed_custodian_request_required: true,
  exact_request_revalidated_before_signing: true,
  injected_signer_only: true,
  deterministic_double_sign_before_first_persistence: true,
  recovery_resign_exact_request_required: true,
  recovery_raw_bytes_must_match_sha256: true,
  private_mode_0700_directory_required: true,
  private_mode_0600_record_required: true,
  append_once_record: true,
  raw_signed_transaction_input: false,
  raw_signed_transaction_persistence: false,
  raw_signed_transaction_output: false,
  signer_access_when_applied: true,
  signing_when_applied: true,
  transaction_broadcast: false,
  durable_submission_claim: false,
  receipt_wait: false,
  saga_mutation: false,
  execution_attempt_mutation: false,
  inventory_mutation: false,
  public_fulfilled_closeout: false,
  runtime_route_mount: false,
  automatic_retry: false,
  money_movement: false,
} as const;

const RECORD_SCHEMA =
  "void_buy_void_payment_keyed_preparation_custody_record_v1";
const SHA256 = /^[0-9a-f]{64}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/;
const MAX_JSON_BYTES = 512 * 1024;

const REQUEST_KEYS = [
  "schema",
  "marker",
  "version",
  "idempotency_key_sha256",
  "request_fingerprint_sha256",
  "saga_id",
  "attempt_id",
  "plan_reservation_id",
  "chain_id",
  "wallet_address",
  "nonce",
  "transaction_to",
  "transaction_value_wei",
  "transaction_calldata",
  "transaction_calldata_sha256",
  "gas_limit",
  "max_fee_per_gas_wei",
  "max_priority_fee_per_gas_wei",
  "canonical_payment_identity",
  "canonical_payment_key_sha256",
  "delivery_address",
  "void_amount_units",
  "token_amount_atoms",
  "call_fingerprint_sha256",
  "transaction_plan_fingerprint_sha256",
  "unsigned_transaction_fingerprint_sha256",
  "credential_access_authorized",
  "wallet_access_authorized",
  "signing_authorized",
  "transaction_broadcast_authorized",
  "raw_signed_transaction_persisted",
  "money_movement_authorized",
] as const;

const RECORD_KEYS = [
  "schema",
  "marker",
  "version",
  "recorded_at_ms",
  "request",
  "signer_address",
  "signed_transaction_hash",
  "raw_signed_transaction_sha256",
  "custody_fingerprint_sha256",
  "deterministic_signing_verified",
  "raw_signed_transaction_persisted",
  "raw_signed_transaction_returned",
  "transaction_broadcast_authorized",
  "money_movement_authorized",
] as const;

export type BuyVoidPaymentKeyedPreparationCustodyRecordV1 = {
  schema: typeof RECORD_SCHEMA;
  marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_V1;
  version: 1;
  recorded_at_ms: number;
  request: BuyVoidPaymentKeyedCustodianPrepareRequestV1;
  signer_address: string;
  signed_transaction_hash: string;
  raw_signed_transaction_sha256: string;
  custody_fingerprint_sha256: string;
  deterministic_signing_verified: true;
  raw_signed_transaction_persisted: false;
  raw_signed_transaction_returned: false;
  transaction_broadcast_authorized: false;
  money_movement_authorized: false;
};

export type BuyVoidPaymentKeyedPreparationCustodyPublicV1 = {
  marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_V1;
  version: 1;
  saga_id: string;
  attempt_id: string;
  plan_reservation_id: string;
  request_idempotency_key_sha256: string;
  request_fingerprint_sha256: string;
  call_fingerprint_sha256: string;
  transaction_plan_fingerprint_sha256: string;
  unsigned_transaction_fingerprint_sha256: string;
  wallet_address: string;
  fulfillment_contract_address: string;
  delivery_address: string;
  void_amount_units: string;
  signer_address: string;
  signed_transaction_hash: string;
  raw_signed_transaction_sha256: string;
  custody_fingerprint_sha256: string;
  deterministic_signing_verified: true;
  raw_signed_transaction_persisted: false;
  raw_signed_transaction_returned: false;
  transaction_broadcast_authorized: false;
  money_movement_authorized: false;
};

export type BuyVoidPaymentKeyedPreparationCustodyDecisionV1 =
  | {
      ok: true;
      status: "dry_run";
      applied: false;
      mutation_performed: false;
      required_confirmation:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_CONFIRMATION_V1;
      request_fingerprint_sha256: string;
      request_idempotency_key_sha256: string;
      custody: null;
      signer_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      raw_signed_transaction_persisted: false;
      raw_signed_transaction_returned: false;
      money_movement_performed: false;
    }
  | {
      ok: true;
      status: "prepared" | "duplicate";
      applied: true;
      mutation_performed: boolean;
      custody: BuyVoidPaymentKeyedPreparationCustodyPublicV1;
      signer_access_performed: true;
      signing_performed: true;
      transaction_broadcast_performed: false;
      raw_signed_transaction_persisted: false;
      raw_signed_transaction_returned: false;
      money_movement_performed: false;
    }
  | {
      ok: false;
      status: "held";
      applied: boolean;
      mutation_performed: boolean;
      reason: string;
      signer_access_performed: boolean;
      signing_performed: boolean;
      transaction_broadcast_performed: false;
      raw_signed_transaction_persisted: false;
      raw_signed_transaction_returned: false;
      money_movement_performed: false;
      detail?: Record<string, unknown>;
    };

export type PrepareBuyVoidPaymentKeyedPreparationCustodyInputV1 = {
  root_dir: string;
  request: BuyVoidPaymentKeyedCustodianPrepareRequestV1;
  signer?: BuyVoidDeliverySignerV1;
  apply?: boolean;
  confirmation?: unknown;
  now_ms?: number;
  fault_inject?: (
    stage:
      | "after_first_sign_before_second_sign"
      | "after_second_sign_before_record",
  ) => void | Promise<void>;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function safeNow(value: unknown): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : Date.now();
}

function directObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(label + "_object_required");
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    throw new Error(label + "_prototype_invalid");
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
    throw new Error(label + "_keys_invalid");
  }
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  const record = directObject(value, "canonical_value");
  return (
    "{" +
    Object.keys(record)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonical(record[key]))
      .join(",") +
    "}"
  );
}

function safeRoot(rootDir: string): string {
  const raw = text(rootDir);
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) {
    throw new Error("payment_keyed_preparation_custody_root_invalid");
  }
  const resolved = path.resolve(raw);
  if (resolved === path.parse(resolved).root) {
    throw new Error("payment_keyed_preparation_custody_root_is_filesystem_root");
  }
  return resolved;
}

function custodyRoot(rootDir: string): string {
  return path.join(
    safeRoot(rootDir),
    "buy-void-payment-keyed-preparation-custody-v1",
  );
}

function ensurePrivateDirectory(directory: string): void {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
  const metadata = fs.lstatSync(directory);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error("payment_keyed_preparation_custody_directory_invalid");
  }
  if (
    typeof process.getuid === "function" &&
    metadata.uid !== process.getuid()
  ) {
    throw new Error("payment_keyed_preparation_custody_directory_owner_mismatch");
  }
  if ((metadata.mode & 0o077) !== 0) {
    throw new Error("payment_keyed_preparation_custody_directory_not_private");
  }
}

function fsyncDirectory(directory: string): void {
  const fd = fs.openSync(directory, "r");
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function recordPath(
  rootDir: string,
  attemptId: string,
  create = true,
): string {
  if (!SHA256.test(attemptId)) {
    throw new Error("payment_keyed_preparation_custody_attempt_id_invalid");
  }
  const root = custodyRoot(rootDir);
  const records = path.join(root, "records");
  if (create) {
    ensurePrivateDirectory(root);
    ensurePrivateDirectory(records);
  }
  return path.join(records, attemptId + ".json");
}

function atomicCreateJson(file: string, value: unknown): "created" | "exists" {
  const parent = path.dirname(file);
  ensurePrivateDirectory(parent);
  const temporary = path.join(
    parent,
    "." +
      path.basename(file) +
      ".tmp-" +
      process.pid +
      "-" +
      crypto.randomBytes(8).toString("hex"),
  );
  const fd = fs.openSync(temporary, "wx", 0o600);
  try {
    fs.writeFileSync(fd, JSON.stringify(value, null, 2) + "\n", "utf8");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }

  try {
    try {
      fs.linkSync(temporary, file);
      fsyncDirectory(parent);
      return "created";
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === "EEXIST") {
        return "exists";
      }
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

function readJsonObject(file: string): Record<string, unknown> | null {
  try {
    const metadata = fs.lstatSync(file);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
      throw new Error("payment_keyed_preparation_custody_record_invalid_file");
    }
    if ((metadata.mode & 0o077) !== 0) {
      throw new Error("payment_keyed_preparation_custody_record_not_private");
    }
    if (metadata.size < 2 || metadata.size > MAX_JSON_BYTES) {
      throw new Error("payment_keyed_preparation_custody_record_size_invalid");
    }
    return directObject(
      JSON.parse(fs.readFileSync(file, "utf8")),
      "payment_keyed_preparation_custody_record",
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return null;
    throw error;
  }
}

function validateRequestShape(
  value: unknown,
): BuyVoidPaymentKeyedCustodianPrepareRequestV1 {
  const request = directObject(value, "payment_keyed_custody_request");
  exactKeys(request, REQUEST_KEYS, "payment_keyed_custody_request");

  if (
    request.schema !== VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_REQUEST_SCHEMA_V1 ||
    request.marker !== VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_V1 ||
    request.version !== 1 ||
    !SHA256.test(text(request.idempotency_key_sha256).toLowerCase()) ||
    !SHA256.test(text(request.request_fingerprint_sha256).toLowerCase()) ||
    !SAGA_ID.test(text(request.saga_id).toLowerCase()) ||
    !SHA256.test(text(request.attempt_id).toLowerCase()) ||
    !SHA256.test(text(request.plan_reservation_id).toLowerCase()) ||
    request.chain_id !== "2050" ||
    !ADDRESS.test(text(request.wallet_address).toLowerCase()) ||
    !Number.isSafeInteger(request.nonce) ||
    Number(request.nonce) < 0 ||
    !ADDRESS.test(text(request.transaction_to).toLowerCase()) ||
    request.transaction_value_wei !== "0" ||
    !/^0x[0-9a-f]+$/i.test(text(request.transaction_calldata)) ||
    !SHA256.test(text(request.transaction_calldata_sha256).toLowerCase()) ||
    !/^[1-9][0-9]*$/.test(text(request.gas_limit)) ||
    !/^[1-9][0-9]*$/.test(text(request.max_fee_per_gas_wei)) ||
    !/^(0|[1-9][0-9]*)$/.test(text(request.max_priority_fee_per_gas_wei)) ||
    !SHA256.test(text(request.canonical_payment_key_sha256).toLowerCase()) ||
    !ADDRESS.test(text(request.delivery_address).toLowerCase()) ||
    !/^[1-9][0-9]*$/.test(text(request.void_amount_units)) ||
    !/^[1-9][0-9]*$/.test(text(request.token_amount_atoms)) ||
    !SHA256.test(text(request.call_fingerprint_sha256).toLowerCase()) ||
    !SHA256.test(
      text(request.transaction_plan_fingerprint_sha256).toLowerCase(),
    ) ||
    !SHA256.test(
      text(request.unsigned_transaction_fingerprint_sha256).toLowerCase(),
    ) ||
    request.credential_access_authorized !== false ||
    request.wallet_access_authorized !== false ||
    request.signing_authorized !== false ||
    request.transaction_broadcast_authorized !== false ||
    request.raw_signed_transaction_persisted !== false ||
    request.money_movement_authorized !== false
  ) {
    throw new Error("payment_keyed_preparation_custody_request_shape_invalid");
  }

  return request as unknown as BuyVoidPaymentKeyedCustodianPrepareRequestV1;
}

function custodyFingerprint(input: {
  request: BuyVoidPaymentKeyedCustodianPrepareRequestV1;
  signer_address: string;
  signed_transaction_hash: string;
  raw_signed_transaction_sha256: string;
}): string {
  return sha256(
    [
      "marker=" + VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_V1,
      "version=1",
      "request_fingerprint_sha256=" +
        input.request.request_fingerprint_sha256,
      "request_idempotency_key_sha256=" +
        input.request.idempotency_key_sha256,
      "attempt_id=" + input.request.attempt_id,
      "saga_id=" + input.request.saga_id,
      "plan_reservation_id=" + input.request.plan_reservation_id,
      "signer_address=" + input.signer_address,
      "signed_transaction_hash=" + input.signed_transaction_hash,
      "raw_signed_transaction_sha256=" +
        input.raw_signed_transaction_sha256,
    ].join("\n"),
  );
}

function parseRecord(
  value: Record<string, unknown>,
): BuyVoidPaymentKeyedPreparationCustodyRecordV1 {
  exactKeys(value, RECORD_KEYS, "payment_keyed_preparation_custody_record");
  const request = validateRequestShape(value.request);
  const signerAddress = text(value.signer_address).toLowerCase();
  const txHash = text(value.signed_transaction_hash).toLowerCase();
  const rawSha = text(value.raw_signed_transaction_sha256).toLowerCase();
  const fingerprint = text(value.custody_fingerprint_sha256).toLowerCase();

  if (
    value.schema !== RECORD_SCHEMA ||
    value.marker !== VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_V1 ||
    value.version !== 1 ||
    !Number.isSafeInteger(value.recorded_at_ms) ||
    Number(value.recorded_at_ms) <= 0 ||
    !ADDRESS.test(signerAddress) ||
    signerAddress !== request.wallet_address ||
    !HASH.test(txHash) ||
    !SHA256.test(rawSha) ||
    !SHA256.test(fingerprint) ||
    fingerprint !==
      custodyFingerprint({
        request,
        signer_address: signerAddress,
        signed_transaction_hash: txHash,
        raw_signed_transaction_sha256: rawSha,
      }) ||
    value.deterministic_signing_verified !== true ||
    value.raw_signed_transaction_persisted !== false ||
    value.raw_signed_transaction_returned !== false ||
    value.transaction_broadcast_authorized !== false ||
    value.money_movement_authorized !== false
  ) {
    throw new Error("payment_keyed_preparation_custody_record_invalid");
  }

  return value as unknown as BuyVoidPaymentKeyedPreparationCustodyRecordV1;
}

function publicProjection(
  record: BuyVoidPaymentKeyedPreparationCustodyRecordV1,
): BuyVoidPaymentKeyedPreparationCustodyPublicV1 {
  const request = record.request;
  return {
    marker: VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_V1,
    version: 1,
    saga_id: request.saga_id,
    attempt_id: request.attempt_id,
    plan_reservation_id: request.plan_reservation_id,
    request_idempotency_key_sha256: request.idempotency_key_sha256,
    request_fingerprint_sha256: request.request_fingerprint_sha256,
    call_fingerprint_sha256: request.call_fingerprint_sha256,
    transaction_plan_fingerprint_sha256:
      request.transaction_plan_fingerprint_sha256,
    unsigned_transaction_fingerprint_sha256:
      request.unsigned_transaction_fingerprint_sha256,
    wallet_address: request.wallet_address,
    fulfillment_contract_address: request.transaction_to,
    delivery_address: request.delivery_address,
    void_amount_units: request.void_amount_units,
    signer_address: record.signer_address,
    signed_transaction_hash: record.signed_transaction_hash,
    raw_signed_transaction_sha256:
      record.raw_signed_transaction_sha256,
    custody_fingerprint_sha256: record.custody_fingerprint_sha256,
    deterministic_signing_verified: true,
    raw_signed_transaction_persisted: false,
    raw_signed_transaction_returned: false,
    transaction_broadcast_authorized: false,
    money_movement_authorized: false,
  };
}

function held(
  applied: boolean,
  reason: string,
  options: {
    mutation_performed?: boolean;
    signer_access_performed?: boolean;
    signing_performed?: boolean;
    detail?: Record<string, unknown>;
  } = {},
): Extract<BuyVoidPaymentKeyedPreparationCustodyDecisionV1, { ok: false }> {
  return {
    ok: false,
    status: "held",
    applied,
    mutation_performed: options.mutation_performed === true,
    reason,
    signer_access_performed:
      options.signer_access_performed === true,
    signing_performed: options.signing_performed === true,
    transaction_broadcast_performed: false,
    raw_signed_transaction_persisted: false,
    raw_signed_transaction_returned: false,
    money_movement_performed: false,
    ...(options.detail ? { detail: options.detail } : {}),
  };
}

async function validateRequestWithDrySigner(
  request: BuyVoidPaymentKeyedCustodianPrepareRequestV1,
): Promise<boolean> {
  const decision = await runBuyVoidPaymentKeyedCustodianSignerV1({
    request,
    apply: false,
  });
  return (
    decision.ok === true &&
    decision.status === "dry_run" &&
    decision.applied === false &&
    decision.attempt_id === request.attempt_id &&
    decision.request_fingerprint_sha256 ===
      request.request_fingerprint_sha256 &&
    decision.idempotency_key_sha256 === request.idempotency_key_sha256 &&
    decision.transaction_plan_fingerprint_sha256 ===
      request.transaction_plan_fingerprint_sha256 &&
    decision.unsigned_transaction_fingerprint_sha256 ===
      request.unsigned_transaction_fingerprint_sha256 &&
    decision.wallet_access_performed === false &&
    decision.signing_performed === false
  );
}

async function signExact(
  request: BuyVoidPaymentKeyedCustodianPrepareRequestV1,
  signer: BuyVoidDeliverySignerV1,
) {
  const decision = await runBuyVoidPaymentKeyedCustodianSignerV1({
    request,
    apply: true,
    confirmation:
      VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_CONFIRMATION_V1,
    signer,
  });
  if (
    decision.ok !== true ||
    decision.status !== "signed" ||
    decision.applied !== true ||
    !decision.raw_signed_transaction ||
    !decision.raw_signed_transaction_sha256 ||
    !decision.signed_transaction_hash ||
    !decision.signer_address
  ) {
    throw new Error(
      decision.ok === false
        ? decision.reason
        : "payment_keyed_preparation_custody_signer_not_signed",
    );
  }
  return {
    signer_address: decision.signer_address,
    signed_transaction_hash: decision.signed_transaction_hash,
    raw_signed_transaction_sha256:
      decision.raw_signed_transaction_sha256,
  };
}

function exactRequest(
  left: BuyVoidPaymentKeyedCustodianPrepareRequestV1,
  right: BuyVoidPaymentKeyedCustodianPrepareRequestV1,
): boolean {
  return canonical(left) === canonical(right);
}

export async function prepareBuyVoidPaymentKeyedPreparationCustodyV1(
  input: PrepareBuyVoidPaymentKeyedPreparationCustodyInputV1,
): Promise<BuyVoidPaymentKeyedPreparationCustodyDecisionV1> {
  let request: BuyVoidPaymentKeyedCustodianPrepareRequestV1;
  try {
    request = validateRequestShape(input?.request);
  } catch (error) {
    return held(
      input?.apply === true,
      "payment_keyed_preparation_custody_request_invalid",
      {
        detail: {
          message: text((error as Error)?.message || error).slice(0, 240),
        },
      },
    );
  }

  if (!(await validateRequestWithDrySigner(request))) {
    return held(
      input?.apply === true,
      "payment_keyed_preparation_custody_request_revalidation_failed",
    );
  }

  if (input?.apply !== true) {
    return {
      ok: true,
      status: "dry_run",
      applied: false,
      mutation_performed: false,
      required_confirmation:
        VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_CONFIRMATION_V1,
      request_fingerprint_sha256: request.request_fingerprint_sha256,
      request_idempotency_key_sha256: request.idempotency_key_sha256,
      custody: null,
      signer_access_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      raw_signed_transaction_persisted: false,
      raw_signed_transaction_returned: false,
      money_movement_performed: false,
    };
  }

  if (
    text(input.confirmation) !==
    VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_CONFIRMATION_V1
  ) {
    return held(
      true,
      "payment_keyed_preparation_custody_confirmation_required",
      {
        detail: {
          required_confirmation:
            VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_CONFIRMATION_V1,
        },
      },
    );
  }

  if (
    !input.signer ||
    typeof input.signer.get_address !== "function" ||
    typeof input.signer.sign_transaction !== "function"
  ) {
    return held(
      true,
      "payment_keyed_preparation_custody_signer_required",
    );
  }

  let file: string;
  try {
    file = recordPath(input.root_dir, request.attempt_id, true);
  } catch (error) {
    return held(true, "payment_keyed_preparation_custody_path_invalid", {
      detail: {
        message: text((error as Error)?.message || error).slice(0, 240),
      },
    });
  }

  let existingRaw: Record<string, unknown> | null = null;
  try {
    existingRaw = readJsonObject(file);
  } catch (error) {
    return held(true, "payment_keyed_preparation_custody_read_failed", {
      detail: {
        message: text((error as Error)?.message || error).slice(0, 240),
      },
    });
  }

  if (existingRaw) {
    let existing: BuyVoidPaymentKeyedPreparationCustodyRecordV1;
    try {
      existing = parseRecord(existingRaw);
      if (!exactRequest(existing.request, request)) {
        throw new Error(
          "payment_keyed_preparation_custody_request_conflict",
        );
      }
    } catch (error) {
      return held(true, "payment_keyed_preparation_custody_existing_invalid", {
        detail: {
          message: text((error as Error)?.message || error).slice(0, 240),
        },
      });
    }

    try {
      const recovered = await signExact(request, input.signer);
      if (
        recovered.signer_address !== existing.signer_address ||
        recovered.signed_transaction_hash !==
          existing.signed_transaction_hash ||
        recovered.raw_signed_transaction_sha256 !==
          existing.raw_signed_transaction_sha256
      ) {
        return held(
          true,
          "payment_keyed_preparation_custody_recovery_signature_drift",
          {
            signer_access_performed: true,
            signing_performed: true,
          },
        );
      }
      return {
        ok: true,
        status: "duplicate",
        applied: true,
        mutation_performed: false,
        custody: publicProjection(existing),
        signer_access_performed: true,
        signing_performed: true,
        transaction_broadcast_performed: false,
        raw_signed_transaction_persisted: false,
        raw_signed_transaction_returned: false,
        money_movement_performed: false,
      };
    } catch (error) {
      return held(true, "payment_keyed_preparation_custody_recovery_sign_failed", {
        signer_access_performed: true,
        signing_performed: true,
        detail: {
          message: text((error as Error)?.message || error).slice(0, 240),
        },
      });
    }
  }

  let first;
  let second;
  try {
    first = await signExact(request, input.signer);
    await input.fault_inject?.("after_first_sign_before_second_sign");
    second = await signExact(request, input.signer);
  } catch (error) {
    return held(true, "payment_keyed_preparation_custody_sign_failed", {
      signer_access_performed: true,
      signing_performed: true,
      detail: {
        message: text((error as Error)?.message || error).slice(0, 240),
      },
    });
  }

  if (
    first.signer_address !== second.signer_address ||
    first.signed_transaction_hash !== second.signed_transaction_hash ||
    first.raw_signed_transaction_sha256 !==
      second.raw_signed_transaction_sha256
  ) {
    return held(
      true,
      "payment_keyed_preparation_custody_nondeterministic_signer",
      {
        signer_access_performed: true,
        signing_performed: true,
      },
    );
  }

  const record: BuyVoidPaymentKeyedPreparationCustodyRecordV1 = {
    schema: RECORD_SCHEMA,
    marker: VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_V1,
    version: 1,
    recorded_at_ms: safeNow(input.now_ms),
    request: structuredClone(request),
    signer_address: first.signer_address,
    signed_transaction_hash: first.signed_transaction_hash,
    raw_signed_transaction_sha256:
      first.raw_signed_transaction_sha256,
    custody_fingerprint_sha256: custodyFingerprint({
      request,
      signer_address: first.signer_address,
      signed_transaction_hash: first.signed_transaction_hash,
      raw_signed_transaction_sha256:
        first.raw_signed_transaction_sha256,
    }),
    deterministic_signing_verified: true,
    raw_signed_transaction_persisted: false,
    raw_signed_transaction_returned: false,
    transaction_broadcast_authorized: false,
    money_movement_authorized: false,
  };

  try {
    await input.fault_inject?.("after_second_sign_before_record");
    const created = atomicCreateJson(file, record);
    if (created === "exists") {
      const racedRaw = readJsonObject(file);
      if (!racedRaw) {
        throw new Error(
          "payment_keyed_preparation_custody_race_unreadable",
        );
      }
      const raced = parseRecord(racedRaw);
      if (
        !exactRequest(raced.request, request) ||
        raced.signer_address !== record.signer_address ||
        raced.signed_transaction_hash !==
          record.signed_transaction_hash ||
        raced.raw_signed_transaction_sha256 !==
          record.raw_signed_transaction_sha256 ||
        raced.custody_fingerprint_sha256 !==
          record.custody_fingerprint_sha256
      ) {
        throw new Error(
          "payment_keyed_preparation_custody_race_conflict",
        );
      }
      return {
        ok: true,
        status: "duplicate",
        applied: true,
        mutation_performed: false,
        custody: publicProjection(raced),
        signer_access_performed: true,
        signing_performed: true,
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
      signer_access_performed: true,
      signing_performed: true,
      transaction_broadcast_performed: false,
      raw_signed_transaction_persisted: false,
      raw_signed_transaction_returned: false,
      money_movement_performed: false,
    };
  } catch (error) {
    return held(true, "payment_keyed_preparation_custody_write_failed", {
      signer_access_performed: true,
      signing_performed: true,
      detail: {
        message: text((error as Error)?.message || error).slice(0, 240),
      },
    });
  }
}

export function readBuyVoidPaymentKeyedPreparationCustodyRecordV1(input: {
  root_dir: string;
  attempt_id: string;
}): BuyVoidPaymentKeyedPreparationCustodyRecordV1 | null {
  const attemptId = text(input?.attempt_id).toLowerCase();
  if (!SHA256.test(attemptId)) {
    throw new Error("payment_keyed_preparation_custody_attempt_id_invalid");
  }
  const raw = readJsonObject(
    recordPath(input.root_dir, attemptId, false),
  );
  return raw ? parseRecord(raw) : null;
}

export function readBuyVoidPaymentKeyedPreparationCustodyPublicV1(input: {
  root_dir: string;
  attempt_id: string;
}): BuyVoidPaymentKeyedPreparationCustodyPublicV1 | null {
  const record = readBuyVoidPaymentKeyedPreparationCustodyRecordV1(input);
  return record ? publicProjection(record) : null;
}

export function inspectBuyVoidPaymentKeyedPreparationCustodyFileV1(input: {
  root_dir: string;
  attempt_id: string;
}): {
  exists: boolean;
  mode: number | null;
  size: number | null;
  direct_file: boolean;
  symlink: boolean;
} {
  const attemptId = text(input?.attempt_id).toLowerCase();
  if (!SHA256.test(attemptId)) {
    throw new Error("payment_keyed_preparation_custody_attempt_id_invalid");
  }
  const file = recordPath(input.root_dir, attemptId, false);
  try {
    const metadata = fs.lstatSync(file);
    return {
      exists: true,
      mode: metadata.mode & 0o777,
      size: metadata.size,
      direct_file: metadata.isFile(),
      symlink: metadata.isSymbolicLink(),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return {
        exists: false,
        mode: null,
        size: null,
        direct_file: false,
        symlink: false,
      };
    }
    throw error;
  }
}

void VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_V1;
