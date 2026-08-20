import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  canonicalBuyVoidPaymentIdentityV1,
  decideBuyVoidAutoFulfillmentV1,
  type BuyVoidAutoFulfillmentDecisionV1,
  type BuyVoidAutoFulfillmentPolicyV1,
  type BuyVoidFulfillmentClaimV1,
  type BuyVoidRequestV1,
  type BuyVoidVerifiedPaymentAdmissionEventV1,
} from "./buy_void_auto_fulfillment_v1.js";

export const VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1 =
  "VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1";

export const VOID_BUY_VOID_FULFILLMENT_JOURNAL_AUTHORITY_V1 = {
  filesystem_read: true,
  filesystem_write: true,
  claim_persistence: true,
  request_index_persistence: true,
  rpc_call: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  runtime_route_mount: false,
  money_movement: false,
} as const;

const ADDRESS = /^0x[0-9a-f]{40}$/;
const HEX_32 = /^0x[0-9a-f]{64}$/;

export type BuyVoidFulfillmentJournalVerificationBindingV1 = {
  source_chain: string;
  payment_transaction_hash: string;
  payment_log_index: string;
  confirmed_block_number: string;
  confirmation_count_at_claim: string;
  usdc_contract: string;
  payer_address: string;
  receive_address: string;
  delivery_address: string;
  payment_usdc_units: string;
  requested_usdc_units: string;
  quoted_void_units: string;
};

export type BuyVoidFulfillmentJournalIntentV1 = {
  schema: "void_buy_void_fulfillment_journal_intent_v1";
  marker: typeof VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1;
  created_at_ms: number;
  payment_key_sha256: string;
  request_key_sha256: string;
  claim: BuyVoidFulfillmentClaimV1;
  verification_binding: BuyVoidFulfillmentJournalVerificationBindingV1;
  signing_authorized: false;
  transaction_broadcast_authorized: false;
  money_movement_authorized: false;
};

export type BuyVoidFulfillmentRequestIndexV1 = {
  schema: "void_buy_void_fulfillment_request_index_v1";
  marker: typeof VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1;
  created_at_ms: number;
  request_id: string;
  request_key_sha256: string;
  canonical_payment_identity: string;
  payment_key_sha256: string;
  instruction_id: string;
};

export type BuyVoidFulfillmentJournalHoldV1 = {
  schema: "void_buy_void_fulfillment_journal_hold_v1";
  marker: typeof VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1;
  recorded_at_ms: number;
  reason: string;
  request_id: string;
  canonical_payment_identity: string;
  detail?: Record<string, unknown>;
};

export type BuyVoidFulfillmentJournalDecisionV1 =
  | {
      ok: true;
      status: "approved";
      duplicate: false;
      new_claim: true;
      recovered_request_index: false;
      claim: BuyVoidFulfillmentClaimV1;
      intent: BuyVoidFulfillmentJournalIntentV1;
    }
  | {
      ok: true;
      status: "duplicate";
      duplicate: true;
      new_claim: false;
      recovered_request_index: boolean;
      claim: BuyVoidFulfillmentClaimV1;
      intent: BuyVoidFulfillmentJournalIntentV1;
    }
  | {
      ok: false;
      status: "held";
      duplicate: false;
      new_claim: boolean;
      recovered_request_index: false;
      reason: string;
      detail?: Record<string, unknown>;
    };

export type ClaimBuyVoidFulfillmentJournalInputV1 = {
  root_dir: string;
  request: BuyVoidRequestV1;
  verified_payment_event: BuyVoidVerifiedPaymentAdmissionEventV1;
  policy: BuyVoidAutoFulfillmentPolicyV1;
  now_ms?: number;
};

export type BuyVoidFulfillmentJournalPathsV1 = {
  root_dir: string;
  journal_dir: string;
  payments_dir: string;
  requests_dir: string;
  holds_dir: string;
};

function held(
  reason: string,
  detail?: Record<string, unknown>,
  newClaim = false,
): BuyVoidFulfillmentJournalDecisionV1 {
  return {
    ok: false,
    status: "held",
    duplicate: false,
    new_claim: newClaim,
    recovered_request_index: false,
    reason,
    ...(detail ? { detail } : {}),
  };
}

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeAddress(value: unknown): string {
  const address = String(value || "").trim().toLowerCase();
  return ADDRESS.test(address) ? address : "";
}

function normalizeHash(value: unknown): string {
  const hash = String(value || "").trim().toLowerCase();
  return HEX_32.test(hash) ? hash : "";
}

function parseNonNegativeInteger(value: unknown): bigint | null {
  if (typeof value === "bigint") return value >= 0n ? value : null;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) return null;
    return BigInt(value);
  }

  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;
  try {
    if (/^0x[0-9a-f]+$/.test(raw) || /^[0-9]+$/.test(raw)) {
      const n = BigInt(raw);
      return n >= 0n ? n : null;
    }
  } catch {
    return null;
  }
  return null;
}

function decimalToUnits(value: unknown, decimals = 6): bigint | null {
  const raw = String(value ?? "").trim();
  if (!raw || !/^[0-9]+(?:\.[0-9]+)?$/.test(raw)) return null;
  const [whole, fraction = ""] = raw.split(".");
  if (fraction.length > decimals) return null;
  try {
    return (
      BigInt(whole) * 10n ** BigInt(decimals) +
      BigInt(fraction.padEnd(decimals, "0") || "0")
    );
  } catch {
    return null;
  }
}

function safeNow(value: unknown): number {
  const n = Number(value);
  if (Number.isSafeInteger(n) && n > 0) return n;
  return Date.now();
}

function validateRoot(rootDir: unknown): string {
  const raw = String(rootDir || "").trim();
  if (!raw || raw.includes("\0")) throw new Error("invalid_journal_root");
  return path.resolve(raw);
}

export function buyVoidFulfillmentJournalPathsV1(
  rootDir: string,
): BuyVoidFulfillmentJournalPathsV1 {
  const root = validateRoot(rootDir);
  const journalDir = path.join(root, "buy-void-auto-fulfillment-v1");
  return {
    root_dir: root,
    journal_dir: journalDir,
    payments_dir: path.join(journalDir, "payments"),
    requests_dir: path.join(journalDir, "requests"),
    holds_dir: path.join(journalDir, "holds"),
  };
}

function ensurePrivateDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  try {
    fs.chmodSync(dir, 0o700);
  } catch {
    // Permission tightening is best effort on non-POSIX filesystems.
  }
}

function fsyncDir(dir: string): void {
  let fd: number | null = null;
  try {
    fd = fs.openSync(dir, "r");
    fs.fsyncSync(fd);
  } catch {
    // Directory fsync is unavailable on some filesystems. File fsync still holds.
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }
}

function writeTempJson(parentDir: string, basename: string, value: unknown): string {
  ensurePrivateDir(parentDir);
  const temp = path.join(
    parentDir,
    `.${basename}.tmp-${process.pid}-${crypto.randomBytes(8).toString("hex")}`,
  );
  const fd = fs.openSync(temp, "wx", 0o600);
  try {
    fs.writeFileSync(fd, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  return temp;
}

function atomicCreateJson(file: string, value: unknown): "created" | "exists" {
  const parent = path.dirname(file);
  const temp = writeTempJson(parent, path.basename(file), value);
  try {
    try {
      fs.linkSync(temp, file);
    } catch (error) {
      const code = String((error as NodeJS.ErrnoException)?.code || "");
      if (code === "EEXIST") return "exists";
      throw error;
    }
    fsyncDir(parent);
    return "created";
  } finally {
    try {
      fs.unlinkSync(temp);
    } catch {
      // The published hard link is independent of the temporary name.
    }
  }
}

function readJsonObject(file: string): Record<string, any> | null {
  if (!fs.existsSync(file)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(
      `journal_corrupt_json:${file}:${String((error as Error)?.message || error)}`,
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`journal_corrupt_shape:${file}`);
  }
  return parsed as Record<string, any>;
}

function requestKey(requestId: string): string {
  return sha256Hex(`void-buy-request-v1\n${requestId}`);
}

function paymentKey(canonicalPaymentIdentity: string): string {
  return sha256Hex(`void-buy-payment-v1\n${canonicalPaymentIdentity}`);
}

function paymentFile(paths: BuyVoidFulfillmentJournalPathsV1, key: string): string {
  return path.join(paths.payments_dir, `${key}.json`);
}

function requestFile(paths: BuyVoidFulfillmentJournalPathsV1, key: string): string {
  return path.join(paths.requests_dir, `${key}.json`);
}

function holdFile(paths: BuyVoidFulfillmentJournalPathsV1, key: string): string {
  return path.join(paths.holds_dir, `${key}.json`);
}

function parseIntent(value: Record<string, any>): BuyVoidFulfillmentJournalIntentV1 {
  if (
    value.schema !== "void_buy_void_fulfillment_journal_intent_v1" ||
    value.marker !== VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1 ||
    !value.claim ||
    !value.verification_binding
  ) {
    throw new Error("journal_corrupt_payment_intent");
  }
  return value as BuyVoidFulfillmentJournalIntentV1;
}

function parseRequestIndex(value: Record<string, any>): BuyVoidFulfillmentRequestIndexV1 {
  if (
    value.schema !== "void_buy_void_fulfillment_request_index_v1" ||
    value.marker !== VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1 ||
    !value.request_id ||
    !value.canonical_payment_identity
  ) {
    throw new Error("journal_corrupt_request_index");
  }
  return value as BuyVoidFulfillmentRequestIndexV1;
}

function canonicalIdentityFromEvent(
  event: BuyVoidVerifiedPaymentAdmissionEventV1,
): string {
  return canonicalBuyVoidPaymentIdentityV1({
    source_chain: event?.payment_verifier?.chain,
    payment_transaction_hash:
      event?.payment_verifier?.transaction_hash || event?.tx_hash,
    payment_log_index: event?.payment_verifier?.log_index,
  });
}

function buildVerificationBinding(
  input: ClaimBuyVoidFulfillmentJournalInputV1,
  claim: BuyVoidFulfillmentClaimV1,
): BuyVoidFulfillmentJournalVerificationBindingV1 | null {
  const request = input.request;
  const verifier = input.verified_payment_event?.payment_verifier;
  if (!verifier) return null;

  const requestUsdcUnits = decimalToUnits(request.usdc_amount, 6);
  const quotedVoidUnits = decimalToUnits(request.quoted_void, 6);
  const logIndex = parseNonNegativeInteger(verifier.log_index);
  const blockNumber = parseNonNegativeInteger(verifier.block_number);
  const confirmations = parseNonNegativeInteger(verifier.confirmations);
  const amountUnits = parseNonNegativeInteger(verifier.amount_units);
  const requestedUnits = parseNonNegativeInteger(verifier.requested_units);
  const txHash = normalizeHash(verifier.transaction_hash || input.verified_payment_event.tx_hash);
  const usdcContract = normalizeAddress(verifier.usdc_contract);
  const payerAddress = normalizeAddress(verifier.from_address);
  const receiveAddress = normalizeAddress(verifier.receive_address);
  const deliveryAddress = normalizeAddress(verifier.delivery_address);

  if (
    requestUsdcUnits === null ||
    quotedVoidUnits === null ||
    logIndex === null ||
    blockNumber === null ||
    confirmations === null ||
    amountUnits === null ||
    requestedUnits === null ||
    !txHash ||
    !usdcContract ||
    !payerAddress ||
    !receiveAddress ||
    !deliveryAddress
  ) {
    return null;
  }

  return {
    source_chain: claim.unsigned_instruction.source_chain,
    payment_transaction_hash: txHash,
    payment_log_index: logIndex.toString(),
    confirmed_block_number: blockNumber.toString(),
    confirmation_count_at_claim: confirmations.toString(),
    usdc_contract: usdcContract,
    payer_address: payerAddress,
    receive_address: receiveAddress,
    delivery_address: deliveryAddress,
    payment_usdc_units: amountUnits.toString(),
    requested_usdc_units: requestedUnits.toString(),
    quoted_void_units: quotedVoidUnits.toString(),
  };
}

function retryCompatibility(
  input: ClaimBuyVoidFulfillmentJournalInputV1,
  intent: BuyVoidFulfillmentJournalIntentV1,
): { ok: true } | { ok: false; reason: string; detail?: Record<string, unknown> } {
  const request = input.request;
  const event = input.verified_payment_event;
  const verifier = event?.payment_verifier;
  const binding = intent.verification_binding;
  const instruction = intent.claim.unsigned_instruction;

  if (!verifier) return { ok: false, reason: "missing_payment_verifier" };
  if (String(request.request_id || "").trim() !== intent.claim.request_id) {
    return {
      ok: false,
      reason: "payment_identity_already_claimed",
      detail: {
        claimed_request_id: intent.claim.request_id,
        attempted_request_id: String(request.request_id || ""),
      },
    };
  }
  if (
    String(event.request_id || "").trim() !== intent.claim.request_id ||
    event.payment_verified !== true ||
    String(event.operator_status || "").toLowerCase() !== "payment_verified"
  ) {
    return { ok: false, reason: "payment_not_verified" };
  }

  let identity = "";
  try {
    identity = canonicalIdentityFromEvent(event);
  } catch {
    return { ok: false, reason: "invalid_canonical_payment_identity" };
  }
  if (identity !== intent.claim.canonical_payment_identity) {
    return { ok: false, reason: "canonical_payment_identity_mismatch" };
  }

  const requestUsdcUnits = decimalToUnits(request.usdc_amount, 6);
  const quotedVoidUnits = decimalToUnits(request.quoted_void, 6);
  const blockNumber = parseNonNegativeInteger(verifier.block_number);
  const confirmations = parseNonNegativeInteger(verifier.confirmations);
  const amountUnits = parseNonNegativeInteger(verifier.amount_units);
  const requestedUnits = parseNonNegativeInteger(verifier.requested_units);
  const claimConfirmations = parseNonNegativeInteger(
    binding.confirmation_count_at_claim,
  );

  const checks: Array<[boolean, string]> = [
    [
      normalizeHash(request.tx_hash) === binding.payment_transaction_hash,
      "payment_transaction_hash_mismatch",
    ],
    [
      normalizeAddress(request.delivery_address) === binding.delivery_address,
      "delivery_address_binding_mismatch",
    ],
    [
      normalizeAddress(request.receive_address) === binding.receive_address,
      "receive_address_binding_mismatch",
    ],
    [
      normalizeAddress(verifier.usdc_contract) === binding.usdc_contract,
      "usdc_contract_mismatch",
    ],
    [
      normalizeAddress(verifier.from_address) === binding.payer_address,
      "payer_address_mismatch",
    ],
    [
      normalizeAddress(verifier.receive_address) === binding.receive_address,
      "verified_receive_address_mismatch",
    ],
    [
      normalizeAddress(verifier.delivery_address) === binding.delivery_address,
      "verified_delivery_address_mismatch",
    ],
    [
      requestUsdcUnits !== null &&
        requestUsdcUnits.toString() === binding.requested_usdc_units,
      "requested_amount_binding_mismatch",
    ],
    [
      quotedVoidUnits !== null &&
        quotedVoidUnits.toString() === binding.quoted_void_units &&
        quotedVoidUnits.toString() === instruction.void_amount_units,
      "quoted_void_binding_mismatch",
    ],
    [
      amountUnits !== null &&
        amountUnits.toString() === binding.payment_usdc_units &&
        amountUnits.toString() === instruction.payment_usdc_units,
      "verified_amount_binding_mismatch",
    ],
    [
      requestedUnits !== null &&
        requestedUnits.toString() === binding.requested_usdc_units,
      "verified_requested_amount_binding_mismatch",
    ],
    [
      blockNumber !== null &&
        blockNumber.toString() === binding.confirmed_block_number,
      "confirmed_block_number_mismatch",
    ],
  ];

  for (const [condition, reason] of checks) {
    if (!condition) return { ok: false, reason };
  }

  if (
    confirmations === null ||
    claimConfirmations === null ||
    confirmations < claimConfirmations
  ) {
    return {
      ok: false,
      reason: "confirmation_count_regression",
      detail: {
        confirmation_count_at_claim: binding.confirmation_count_at_claim,
        attempted_confirmation_count:
          confirmations === null ? "invalid" : confirmations.toString(),
      },
    };
  }

  return { ok: true };
}

function requestIndexForIntent(
  intent: BuyVoidFulfillmentJournalIntentV1,
): BuyVoidFulfillmentRequestIndexV1 {
  return {
    schema: "void_buy_void_fulfillment_request_index_v1",
    marker: VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1,
    created_at_ms: intent.created_at_ms,
    request_id: intent.claim.request_id,
    request_key_sha256: intent.request_key_sha256,
    canonical_payment_identity: intent.claim.canonical_payment_identity,
    payment_key_sha256: intent.payment_key_sha256,
    instruction_id: intent.claim.instruction_id,
  };
}

function recordHold(
  paths: BuyVoidFulfillmentJournalPathsV1,
  paymentKeyValue: string,
  hold: BuyVoidFulfillmentJournalHoldV1,
): void {
  try {
    atomicCreateJson(holdFile(paths, paymentKeyValue), hold);
  } catch {
    // The primary claim remains authoritative; hold evidence is best effort.
  }
}

function ensureRequestIndex(
  paths: BuyVoidFulfillmentJournalPathsV1,
  intent: BuyVoidFulfillmentJournalIntentV1,
): { ok: true; recovered: boolean } | { ok: false; reason: string; detail?: Record<string, unknown> } {
  const indexFile = requestFile(paths, intent.request_key_sha256);
  const existingRaw = readJsonObject(indexFile);
  if (existingRaw) {
    const existing = parseRequestIndex(existingRaw);
    if (
      existing.request_id === intent.claim.request_id &&
      existing.canonical_payment_identity ===
        intent.claim.canonical_payment_identity &&
      existing.instruction_id === intent.claim.instruction_id
    ) {
      return { ok: true, recovered: false };
    }
    return {
      ok: false,
      reason: "request_already_claimed",
      detail: {
        request_id: intent.claim.request_id,
        claimed_payment_identity: existing.canonical_payment_identity,
        attempted_payment_identity: intent.claim.canonical_payment_identity,
      },
    };
  }

  const created = atomicCreateJson(indexFile, requestIndexForIntent(intent));
  if (created === "created") return { ok: true, recovered: true };

  const racedRaw = readJsonObject(indexFile);
  if (!racedRaw) {
    return { ok: false, reason: "request_index_race_unreadable" };
  }
  const raced = parseRequestIndex(racedRaw);
  if (
    raced.request_id === intent.claim.request_id &&
    raced.canonical_payment_identity === intent.claim.canonical_payment_identity &&
    raced.instruction_id === intent.claim.instruction_id
  ) {
    return { ok: true, recovered: false };
  }
  return {
    ok: false,
    reason: "request_claim_race_conflict",
    detail: {
      request_id: intent.claim.request_id,
      claimed_payment_identity: raced.canonical_payment_identity,
      attempted_payment_identity: intent.claim.canonical_payment_identity,
    },
  };
}

function decisionToHeld(
  decision: BuyVoidAutoFulfillmentDecisionV1,
): BuyVoidFulfillmentJournalDecisionV1 {
  if (!("reason" in decision)) return held("unexpected_engine_success_shape");
  return held(decision.reason, decision.detail);
}

export function claimBuyVoidFulfillmentJournalV1(
  input: ClaimBuyVoidFulfillmentJournalInputV1,
): BuyVoidFulfillmentJournalDecisionV1 {
  let paths: BuyVoidFulfillmentJournalPathsV1;
  try {
    paths = buyVoidFulfillmentJournalPathsV1(input?.root_dir);
  } catch (error) {
    return held(String((error as Error)?.message || error));
  }

  const requestId = String(input?.request?.request_id || "").trim();
  if (!/^[A-Za-z0-9._:-]{3,160}$/.test(requestId)) {
    return held("invalid_request_id");
  }

  let canonicalPaymentIdentity = "";
  try {
    canonicalPaymentIdentity = canonicalIdentityFromEvent(
      input.verified_payment_event,
    );
  } catch {
    const decision = decideBuyVoidAutoFulfillmentV1({
      request: input.request,
      verified_payment_event: input.verified_payment_event,
      policy: input.policy,
      prior_claims: [],
    });
    return decisionToHeld(decision);
  }

  const paymentKeyValue = paymentKey(canonicalPaymentIdentity);
  const requestKeyValue = requestKey(requestId);
  const paymentPath = paymentFile(paths, paymentKeyValue);
  const requestPath = requestFile(paths, requestKeyValue);

  try {
    const existingPaymentRaw = readJsonObject(paymentPath);
    if (existingPaymentRaw) {
      const intent = parseIntent(existingPaymentRaw);
      const compatibility = retryCompatibility(input, intent);
      if ("reason" in compatibility) {
        return held(compatibility.reason, compatibility.detail);
      }

      const indexResult = ensureRequestIndex(paths, intent);
      if ("reason" in indexResult) {
        recordHold(paths, paymentKeyValue, {
          schema: "void_buy_void_fulfillment_journal_hold_v1",
          marker: VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1,
          recorded_at_ms: safeNow(input.now_ms),
          reason: indexResult.reason,
          request_id: requestId,
          canonical_payment_identity: canonicalPaymentIdentity,
          ...(indexResult.detail ? { detail: indexResult.detail } : {}),
        });
        return held(indexResult.reason, indexResult.detail);
      }

      return {
        ok: true,
        status: "duplicate",
        duplicate: true,
        new_claim: false,
        recovered_request_index: indexResult.recovered,
        claim: intent.claim,
        intent,
      };
    }

    const existingRequestRaw = readJsonObject(requestPath);
    if (existingRequestRaw) {
      const existingRequest = parseRequestIndex(existingRequestRaw);
      if (
        existingRequest.canonical_payment_identity === canonicalPaymentIdentity
      ) {
        return held("journal_inconsistent_missing_payment_claim", {
          request_id: requestId,
          canonical_payment_identity: canonicalPaymentIdentity,
        });
      }
      return held("request_already_claimed", {
        request_id: requestId,
        claimed_payment_identity: existingRequest.canonical_payment_identity,
        attempted_payment_identity: canonicalPaymentIdentity,
      });
    }

    const decision = decideBuyVoidAutoFulfillmentV1({
      request: input.request,
      verified_payment_event: input.verified_payment_event,
      policy: input.policy,
      prior_claims: [],
    });
    if ("reason" in decision) return decisionToHeld(decision);

    const binding = buildVerificationBinding(input, decision.claim);
    if (!binding) return held("incomplete_verification_binding");

    const intent: BuyVoidFulfillmentJournalIntentV1 = {
      schema: "void_buy_void_fulfillment_journal_intent_v1",
      marker: VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1,
      created_at_ms: safeNow(input.now_ms),
      payment_key_sha256: paymentKeyValue,
      request_key_sha256: requestKeyValue,
      claim: decision.claim,
      verification_binding: binding,
      signing_authorized: false,
      transaction_broadcast_authorized: false,
      money_movement_authorized: false,
    };

    const paymentCreated = atomicCreateJson(paymentPath, intent);
    if (paymentCreated === "exists") {
      return claimBuyVoidFulfillmentJournalV1(input);
    }

    const indexResult = ensureRequestIndex(paths, intent);
    if ("reason" in indexResult) {
      recordHold(paths, paymentKeyValue, {
        schema: "void_buy_void_fulfillment_journal_hold_v1",
        marker: VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1,
        recorded_at_ms: safeNow(input.now_ms),
        reason: indexResult.reason,
        request_id: requestId,
        canonical_payment_identity: canonicalPaymentIdentity,
        ...(indexResult.detail ? { detail: indexResult.detail } : {}),
      });
      return held(indexResult.reason, indexResult.detail, true);
    }

    return {
      ok: true,
      status: "approved",
      duplicate: false,
      new_claim: true,
      recovered_request_index: false,
      claim: decision.claim,
      intent,
    };
  } catch (error) {
    return held("fulfillment_journal_failed", {
      message: String((error as Error)?.message || error),
    });
  }
}

export function readBuyVoidFulfillmentJournalClaimV1(input: {
  root_dir: string;
  canonical_payment_identity: string;
}): BuyVoidFulfillmentJournalIntentV1 | null {
  const paths = buyVoidFulfillmentJournalPathsV1(input.root_dir);
  const key = paymentKey(String(input.canonical_payment_identity || ""));
  const raw = readJsonObject(paymentFile(paths, key));
  return raw ? parseIntent(raw) : null;
}

export function listBuyVoidFulfillmentJournalClaimsV1(
  rootDir: string,
): BuyVoidFulfillmentJournalIntentV1[] {
  const paths = buyVoidFulfillmentJournalPathsV1(rootDir);
  if (!fs.existsSync(paths.payments_dir)) return [];
  const out: BuyVoidFulfillmentJournalIntentV1[] = [];
  for (const name of fs.readdirSync(paths.payments_dir).sort()) {
    if (!/^[0-9a-f]{64}\.json$/.test(name)) continue;
    const raw = readJsonObject(path.join(paths.payments_dir, name));
    if (raw) out.push(parseIntent(raw));
  }
  return out;
}
