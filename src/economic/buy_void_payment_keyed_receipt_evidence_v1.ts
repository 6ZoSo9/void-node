import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type {
  BuyVoidPaymentKeyedReceiptOutcomeDecisionV1,
} from "./buy_void_payment_keyed_receipt_outcome_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_EVIDENCE_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_EVIDENCE_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_EVIDENCE_AUTHORITY_V1 = {
  source_only_contract: true,
  filesystem_read: true,
  filesystem_write: true,
  private_directories_required: true,
  immutable_terminal_record: true,
  exact_attempt_transaction_binding: true,
  exact_receipt_policy_fingerprint_required: true,
  confirmed_and_reverted_only: true,
  raw_receipt_logs_persisted: false,
  raw_signed_transaction_persisted: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  automatic_retry: false,
  inventory_mutation: false,
  public_fulfilled_closeout: false,
  runtime_route_mount: false,
  money_movement: false,
} as const;

const SCHEMA =
  "void_buy_void_payment_keyed_receipt_evidence_v1";
const SHA256 = /^[0-9a-f]{64}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/;
const DECIMAL = /^(0|[1-9][0-9]*)$/;
const MAX_JSON_BYTES = 256 * 1024;

export type BuyVoidPaymentKeyedReceiptEvidenceV1 = {
  schema: typeof SCHEMA;
  marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_EVIDENCE_V1;
  version: 1;
  saga_id: string;
  attempt_id: string;
  transaction_hash: string;
  outcome: "confirmed" | "reverted";
  recorded_at_ms: number;
  receipt_policy_fingerprint_sha256: string;
  receipt_evidence_fingerprint_sha256: string;
  receipt_block_number: string;
  receipt_block_hash: string;
  observed_confirmation_count: string;
  fulfillment_wallet_address: string;
  fulfillment_contract_address: string;
  delivery_address: string;
  void_amount_units: string;
  canonical_payment_identity: string | null;
  payment_delivery_id: string | null;
  void_token_address: string | null;
  token_amount_atoms: string | null;
  fulfillment_event_log_index: string | null;
  transfer_event_log_index: string | null;
  evidence_fingerprint_sha256: string;
  authority:
    typeof VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_EVIDENCE_AUTHORITY_V1;
};

export type BuyVoidPaymentKeyedReceiptEvidenceDecisionV1 =
  | {
      ok: true;
      status: "recorded" | "duplicate";
      duplicate: boolean;
      mutation_performed: boolean;
      evidence: BuyVoidPaymentKeyedReceiptEvidenceV1;
    }
  | {
      ok: false;
      status: "held";
      duplicate: false;
      mutation_performed: false;
      reason: string;
      detail?: Record<string, unknown>;
      evidence?: never;
    };

function held(
  reason: string,
  detail?: Record<string, unknown>,
): Extract<
  BuyVoidPaymentKeyedReceiptEvidenceDecisionV1,
  { ok: false }
> {
  return {
    ok: false,
    status: "held",
    duplicate: false,
    mutation_performed: false,
    reason,
    ...(detail ? { detail } : {}),
  };
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonical).join(",") + "]";
  }
  const record = value as Record<string, unknown>;
  return "{" +
    Object.keys(record)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonical(record[key]))
      .join(",") +
    "}";
}

function safeNow(value: unknown): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0
    ? parsed
    : Date.now();
}

function rootDir(root: string): string {
  const raw = text(root);
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) {
    throw new Error("payment_keyed_receipt_evidence_root_invalid");
  }
  const resolved = path.resolve(raw);
  if (resolved === path.parse(resolved).root) {
    throw new Error("payment_keyed_receipt_evidence_root_is_filesystem_root");
  }
  return path.join(
    resolved,
    "buy-void-payment-keyed-receipt-evidence-v1",
  );
}

function ensurePrivateDirectory(directory: string): string {
  const resolved = path.resolve(directory);
  fs.mkdirSync(resolved, { recursive: true, mode: 0o700 });
  const stat = fs.lstatSync(resolved);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error(
      "payment_keyed_receipt_evidence_directory_invalid",
    );
  }
  if (
    typeof process.getuid === "function" &&
    stat.uid !== process.getuid()
  ) {
    throw new Error(
      "payment_keyed_receipt_evidence_directory_owner_mismatch",
    );
  }
  if ((stat.mode & 0o077) !== 0) {
    throw new Error(
      "payment_keyed_receipt_evidence_directory_not_private",
    );
  }
  return resolved;
}

function existingPrivateDirectory(
  directory: string,
): string | null {
  const resolved = path.resolve(directory);
  try {
    const stat = fs.lstatSync(resolved);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      throw new Error(
        "payment_keyed_receipt_evidence_directory_invalid",
      );
    }
    if (
      typeof process.getuid === "function" &&
      stat.uid !== process.getuid()
    ) {
      throw new Error(
        "payment_keyed_receipt_evidence_directory_owner_mismatch",
      );
    }
    if ((stat.mode & 0o077) !== 0) {
      throw new Error(
        "payment_keyed_receipt_evidence_directory_not_private",
      );
    }
    return resolved;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function attemptsDir(root: string): string {
  return ensurePrivateDirectory(
    path.join(ensurePrivateDirectory(rootDir(root)), "attempts"),
  );
}

function evidenceFile(root: string, attemptId: string): string {
  return path.join(attemptsDir(root), attemptId + ".json");
}

function existingEvidenceFile(
  root: string,
  attemptId: string,
): string | null {
  const top = existingPrivateDirectory(rootDir(root));
  if (!top) return null;
  const attempts = existingPrivateDirectory(
    path.join(top, "attempts"),
  );
  if (!attempts) return null;
  const file = path.join(attempts, attemptId + ".json");
  return fs.existsSync(file) ? file : null;
}

function fsyncDirectory(directory: string): void {
  const fd = fs.openSync(directory, "r");
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function validateEvidence(
  value: unknown,
): BuyVoidPaymentKeyedReceiptEvidenceV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(
      "payment_keyed_receipt_evidence_object_required",
    );
  }
  const record =
    value as BuyVoidPaymentKeyedReceiptEvidenceV1;
  const expectedKeys = [
    "schema",
    "marker",
    "version",
    "saga_id",
    "attempt_id",
    "transaction_hash",
    "outcome",
    "recorded_at_ms",
    "receipt_policy_fingerprint_sha256",
    "receipt_evidence_fingerprint_sha256",
    "receipt_block_number",
    "receipt_block_hash",
    "observed_confirmation_count",
    "fulfillment_wallet_address",
    "fulfillment_contract_address",
    "delivery_address",
    "void_amount_units",
    "canonical_payment_identity",
    "payment_delivery_id",
    "void_token_address",
    "token_amount_atoms",
    "fulfillment_event_log_index",
    "transfer_event_log_index",
    "evidence_fingerprint_sha256",
    "authority",
  ].sort();
  const actualKeys = Object.keys(
    value as Record<string, unknown>,
  ).sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    throw new Error(
      "payment_keyed_receipt_evidence_keys_invalid",
    );
  }
  if (
    record.schema !== SCHEMA ||
    record.marker !==
      VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_EVIDENCE_V1 ||
    record.version !== 1 ||
    !SAGA_ID.test(record.saga_id) ||
    !SHA256.test(record.attempt_id) ||
    !HASH.test(record.transaction_hash) ||
    !["confirmed", "reverted"].includes(record.outcome) ||
    !Number.isSafeInteger(record.recorded_at_ms) ||
    record.recorded_at_ms <= 0 ||
    !SHA256.test(record.receipt_policy_fingerprint_sha256) ||
    !SHA256.test(record.receipt_evidence_fingerprint_sha256) ||
    !DECIMAL.test(record.receipt_block_number) ||
    BigInt(record.receipt_block_number) <= 0n ||
    !HASH.test(record.receipt_block_hash) ||
    !DECIMAL.test(record.observed_confirmation_count) ||
    BigInt(record.observed_confirmation_count) <= 0n ||
    !ADDRESS.test(record.fulfillment_wallet_address) ||
    !ADDRESS.test(record.fulfillment_contract_address) ||
    !ADDRESS.test(record.delivery_address) ||
    !DECIMAL.test(record.void_amount_units) ||
    BigInt(record.void_amount_units) <= 0n ||
    !SHA256.test(record.evidence_fingerprint_sha256) ||
    canonical(record.authority) !==
      canonical(
        VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_EVIDENCE_AUTHORITY_V1,
      )
  ) {
    throw new Error(
      "payment_keyed_receipt_evidence_invalid",
    );
  }
  if (record.outcome === "confirmed") {
    if (
      !record.canonical_payment_identity ||
      !/^voidpay1:(base|ethereum):0x[0-9a-f]{64}:(0|[1-9][0-9]*)$/.test(
        record.canonical_payment_identity,
      ) ||
      !record.payment_delivery_id ||
      !/^0x[0-9a-f]{64}$/.test(record.payment_delivery_id) ||
      !record.void_token_address ||
      !ADDRESS.test(record.void_token_address) ||
      !record.token_amount_atoms ||
      !DECIMAL.test(record.token_amount_atoms) ||
      BigInt(record.token_amount_atoms) <= 0n ||
      record.fulfillment_event_log_index === null ||
      !DECIMAL.test(record.fulfillment_event_log_index) ||
      record.transfer_event_log_index === null ||
      !DECIMAL.test(record.transfer_event_log_index)
    ) {
      throw new Error(
        "payment_keyed_receipt_evidence_confirmed_fields_invalid",
      );
    }
  } else if (
    record.canonical_payment_identity !== null ||
    record.payment_delivery_id !== null ||
    record.void_token_address !== null ||
    record.token_amount_atoms !== null ||
    record.fulfillment_event_log_index !== null ||
    record.transfer_event_log_index !== null
  ) {
    throw new Error(
      "payment_keyed_receipt_evidence_reverted_fields_invalid",
    );
  }

  const {
    evidence_fingerprint_sha256: ignored,
    ...body
  } = record;
  void ignored;
  if (record.evidence_fingerprint_sha256 !== sha256(canonical(body))) {
    throw new Error(
      "payment_keyed_receipt_evidence_fingerprint_mismatch",
    );
  }
  return structuredClone(record);
}

function readFile(
  file: string,
): BuyVoidPaymentKeyedReceiptEvidenceV1 {
  const stat = fs.lstatSync(file);
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.size < 2 ||
    stat.size > MAX_JSON_BYTES
  ) {
    throw new Error(
      "payment_keyed_receipt_evidence_file_invalid",
    );
  }
  if (
    typeof process.getuid === "function" &&
    stat.uid !== process.getuid()
  ) {
    throw new Error(
      "payment_keyed_receipt_evidence_file_owner_mismatch",
    );
  }
  if ((stat.mode & 0o077) !== 0) {
    throw new Error(
      "payment_keyed_receipt_evidence_file_not_private",
    );
  }
  return validateEvidence(
    JSON.parse(fs.readFileSync(file, "utf8")),
  );
}

export function readBuyVoidPaymentKeyedReceiptEvidenceV1(input: {
  root_dir: string;
  attempt_id: string;
}): BuyVoidPaymentKeyedReceiptEvidenceV1 | null {
  const attemptId = text(input?.attempt_id).toLowerCase();
  if (!SHA256.test(attemptId)) {
    throw new Error(
      "payment_keyed_receipt_evidence_attempt_id_invalid",
    );
  }
  const file = existingEvidenceFile(
    input.root_dir,
    attemptId,
  );
  return file ? readFile(file) : null;
}

export function recordBuyVoidPaymentKeyedReceiptEvidenceV1(input: {
  root_dir: string;
  saga_id: string;
  receipt_policy_fingerprint_sha256: string;
  outcome: Extract<
    BuyVoidPaymentKeyedReceiptOutcomeDecisionV1,
    { ok: true; status: "confirmed" | "reverted" }
  >;
  now_ms?: number;
}): BuyVoidPaymentKeyedReceiptEvidenceDecisionV1 {
  const sagaId = text(input?.saga_id).toLowerCase();
  const policyFingerprint = text(
    input?.receipt_policy_fingerprint_sha256,
  ).toLowerCase();
  const outcome = input?.outcome;
  if (
    !SAGA_ID.test(sagaId) ||
    !SHA256.test(policyFingerprint) ||
    !outcome ||
    outcome.ok !== true ||
    (
      outcome.status !== "confirmed" &&
      outcome.status !== "reverted"
    )
  ) {
    return held(
      "payment_keyed_receipt_evidence_input_invalid",
    );
  }

  const common = {
    schema: SCHEMA,
    marker:
      VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_EVIDENCE_V1,
    version: 1 as const,
    saga_id: sagaId,
    attempt_id: outcome.attempt_id,
    transaction_hash: outcome.transaction_hash,
    outcome: outcome.status,
    recorded_at_ms: safeNow(input.now_ms),
    receipt_policy_fingerprint_sha256: policyFingerprint,
  };

  const body = outcome.status === "confirmed"
    ? {
        ...common,
        outcome: "confirmed" as const,
        receipt_evidence_fingerprint_sha256:
          outcome.confirmed.receipt_evidence_fingerprint_sha256,
        receipt_block_number:
          outcome.confirmed.receipt_block_number,
        receipt_block_hash:
          outcome.confirmed.receipt_block_hash,
        observed_confirmation_count:
          outcome.confirmed.observed_confirmation_count,
        fulfillment_wallet_address:
          outcome.confirmed.fulfillment_wallet_address,
        fulfillment_contract_address:
          outcome.confirmed.fulfillment_contract_address,
        delivery_address:
          outcome.confirmed.delivery_address,
        void_amount_units:
          outcome.confirmed.void_amount_units,
        canonical_payment_identity:
          outcome.confirmed.canonical_payment_identity,
        payment_delivery_id:
          outcome.confirmed.payment_delivery_id,
        void_token_address:
          outcome.confirmed.void_token_address,
        token_amount_atoms:
          outcome.confirmed.token_amount_atoms,
        fulfillment_event_log_index:
          outcome.confirmed.fulfillment_event_log_index,
        transfer_event_log_index:
          outcome.confirmed.transfer_event_log_index,
        authority:
          VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_EVIDENCE_AUTHORITY_V1,
      }
    : {
        ...common,
        outcome: "reverted" as const,
        receipt_evidence_fingerprint_sha256:
          outcome.reverted.receipt_evidence_fingerprint_sha256,
        receipt_block_number:
          outcome.reverted.receipt_block_number,
        receipt_block_hash:
          outcome.reverted.receipt_block_hash,
        observed_confirmation_count:
          outcome.reverted.observed_confirmation_count,
        fulfillment_wallet_address:
          outcome.reverted.fulfillment_wallet_address,
        fulfillment_contract_address:
          outcome.reverted.fulfillment_contract_address,
        delivery_address:
          outcome.reverted.delivery_address,
        void_amount_units:
          outcome.reverted.void_amount_units,
        canonical_payment_identity: null,
        payment_delivery_id: null,
        void_token_address: null,
        token_amount_atoms: null,
        fulfillment_event_log_index: null,
        transfer_event_log_index: null,
        authority:
          VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_EVIDENCE_AUTHORITY_V1,
      };

  const evidence: BuyVoidPaymentKeyedReceiptEvidenceV1 = {
    ...body,
    evidence_fingerprint_sha256: sha256(canonical(body)),
  };
  try {
    validateEvidence(evidence);
    const target = evidenceFile(
      input.root_dir,
      evidence.attempt_id,
    );
    if (fs.existsSync(target)) {
      const existing = readFile(target);
      if (
        existing.evidence_fingerprint_sha256 ===
          evidence.evidence_fingerprint_sha256
      ) {
        return {
          ok: true,
          status: "duplicate",
          duplicate: true,
          mutation_performed: false,
          evidence: existing,
        };
      }
      return held(
        "payment_keyed_receipt_evidence_terminal_conflict",
        {
          existing_outcome: existing.outcome,
          new_outcome: evidence.outcome,
        },
      );
    }

    const parent = path.dirname(target);
    const temporary = path.join(
      parent,
      "." +
        path.basename(target) +
        ".tmp-" +
        String(process.pid) +
        "-" +
        crypto.randomBytes(8).toString("hex"),
    );
    const fd = fs.openSync(temporary, "wx", 0o600);
    try {
      fs.writeFileSync(
        fd,
        JSON.stringify(evidence, null, 2) + "\n",
        "utf8",
      );
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    try {
      fs.linkSync(temporary, target);
      fsyncDirectory(parent);
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== "EEXIST") {
        throw error;
      }
    } finally {
      try {
        fs.unlinkSync(temporary);
      } catch (error) {
        if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") {
          throw error;
        }
      }
    }

    const stored = readFile(target);
    if (
      stored.evidence_fingerprint_sha256 !==
        evidence.evidence_fingerprint_sha256
    ) {
      return held(
        "payment_keyed_receipt_evidence_race_conflict",
      );
    }
    return {
      ok: true,
      status: "recorded",
      duplicate: false,
      mutation_performed: true,
      evidence: stored,
    };
  } catch (error) {
    return held(
      "payment_keyed_receipt_evidence_write_failed",
      {
        error_class:
          text((error as Error)?.name || "Error"),
        message:
          text((error as Error)?.message || error).slice(0, 200),
      },
    );
  }
}
