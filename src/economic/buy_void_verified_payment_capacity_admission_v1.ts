import fs from "node:fs";
import path from "node:path";

import {
  withBuyVoidFilesystemBakeryLockAsyncV1,
} from "./buy_void_filesystem_bakery_lock_v1.js";
import {
  withBuyVoidTerminalCloseoutRequestLockV1,
} from "./buy_void_terminal_closeout_request_lock_v1.js";
import {
  canonicalBuyVoidPaymentIdentityV1,
} from "./buy_void_auto_fulfillment_v1.js";

export const VOID_BUY_VOID_VERIFIED_PAYMENT_CAPACITY_ADMISSION_V1 =
  "VOID_BUY_VOID_VERIFIED_PAYMENT_CAPACITY_ADMISSION_V1";

export const VOID_BUY_VOID_VERIFIED_PAYMENT_CAPACITY_ADMISSION_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    request_directory_read: true,
    request_directory_write: true,
    serialized_capacity_admission: true,
    strict_ledger_recount: true,
    payment_receipt_verification: false,
    duplicate_payment_identity_verification: true,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    inventory_funding: false,
    token_transfer: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const MICRO = 1_000_000n;
const REQUEST_ID = /^buyvoid_[a-z0-9]+_[0-9a-f]{8}$/u;
const PAYMENT_IDENTITY =
  /^voidpay1:(?:base|ethereum):0x[0-9a-f]{64}:(?:0|[1-9][0-9]*)$/u;

function fail(code: string): never {
  throw new Error(code);
}

function microVoid(value: unknown, code: string, positive = false): bigint {
  const raw = String(value ?? "").trim();
  const match = /^(0|[1-9][0-9]*)(?:\.([0-9]{1,6}))?$/u.exec(raw);
  if (!match) fail(code);
  const whole = BigInt(match[1]);
  const fraction = BigInt((match[2] || "").padEnd(6, "0") || "0");
  const units = whole * MICRO + fraction;
  if (positive ? units < 1n : units < 0n) fail(code);
  return units;
}

function canonicalIdentityFromVerifiedEventV1(
  event: any,
  code: string,
): string {
  if (
    !event ||
    typeof event !== "object" ||
    Array.isArray(event) ||
    String(event.operator_status || "").trim() !== "payment_verified" ||
    !event.payment_verifier ||
    typeof event.payment_verifier !== "object" ||
    Array.isArray(event.payment_verifier)
  ) {
    fail(code);
  }
  let identity = "";
  try {
    identity = canonicalBuyVoidPaymentIdentityV1({
      source_chain: event.payment_verifier.chain,
      payment_transaction_hash:
        event.payment_verifier.transaction_hash || event.tx_hash,
      payment_log_index: event.payment_verifier.log_index,
    });
  } catch {
    fail(code);
  }
  if (!PAYMENT_IDENTITY.test(identity)) fail(code);
  const stored = String(event.canonical_payment_identity || "").trim();
  if (stored && stored !== identity) {
    fail("buy_void_verified_payment_identity_stored_mismatch");
  }
  return identity;
}

const LEDGER_MAX_BYTES = 64 * 1024 * 1024;

function readStrictJsonLinesV1(filePath: string, code: string): any[] {
  if (!fs.existsSync(filePath)) return [];
  const metadata = fs.lstatSync(filePath);
  if (
    !metadata.isFile() ||
    metadata.isSymbolicLink() ||
    metadata.size > LEDGER_MAX_BYTES
  ) {
    fail(code + "_file_invalid");
  }
  const text = fs.readFileSync(filePath, "utf8");
  if (text.length === 0) return [];
  const lines = text.endsWith("\n")
    ? text.slice(0, -1).split("\n")
    : text.split("\n");
  if (lines.some((line) => line.length === 0)) {
    fail(code + "_empty_row");
  }
  return lines.map((line) => {
    let value: any;
    try {
      value = JSON.parse(line);
    } catch {
      fail(code + "_json_invalid");
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      fail(code + "_row_invalid");
    }
    return value;
  });
}

function readStrictCapacityLedgerV1(
  requestDir: string,
  poolVoidMicro: bigint,
) {
  const requestRows = readStrictJsonLinesV1(
    path.join(requestDir, "requests.jsonl"),
    "buy_void_verified_payment_capacity_requests",
  );
  const quotes = new Map<string, bigint>();
  for (const row of requestRows) {
    const requestId = String(row.request_id || "").trim();
    if (!REQUEST_ID.test(requestId)) {
      fail("buy_void_verified_payment_capacity_request_id_invalid");
    }
    const quote = microVoid(
      row.quoted_void,
      "buy_void_verified_payment_capacity_request_quote_invalid",
      true,
    );
    const prior = quotes.get(requestId);
    if (prior !== undefined && prior !== quote) {
      fail("buy_void_verified_payment_capacity_request_quote_changed");
    }
    quotes.set(requestId, quote);
  }

  const eventRows = readStrictJsonLinesV1(
    path.join(requestDir, "operator-events.jsonl"),
    "buy_void_verified_payment_capacity_operator_events",
  );
  const verifiedIds = new Set<string>();
  const paymentIdentityToRequest = new Map<string, string>();
  const requestToPaymentIdentity = new Map<string, string>();
  for (const row of eventRows) {
    const requestId = String(row.request_id || "").trim();
    const status = String(row.operator_status || "").trim();
    if (!REQUEST_ID.test(requestId) || !status) {
      fail("buy_void_verified_payment_capacity_operator_event_invalid");
    }
    if (status !== "payment_verified") continue;
    const quote = quotes.get(requestId);
    if (quote === undefined) {
      fail("buy_void_verified_payment_capacity_verified_request_missing");
    }
    if (row.quoted_void !== undefined && row.quoted_void !== null) {
      const eventQuote = microVoid(
        row.quoted_void,
        "buy_void_verified_payment_capacity_event_quote_invalid",
        true,
      );
      if (eventQuote !== quote) {
        fail("buy_void_verified_payment_capacity_event_quote_mismatch");
      }
    }
    const paymentIdentity = canonicalIdentityFromVerifiedEventV1(
      row,
      "buy_void_verified_payment_identity_history_incomplete",
    );
    const claimedRequest = paymentIdentityToRequest.get(paymentIdentity);
    if (claimedRequest !== undefined && claimedRequest !== requestId) {
      fail("buy_void_verified_payment_identity_already_claimed");
    }
    const claimedIdentity = requestToPaymentIdentity.get(requestId);
    if (claimedIdentity !== undefined && claimedIdentity !== paymentIdentity) {
      fail("buy_void_verified_payment_identity_request_conflict");
    }
    paymentIdentityToRequest.set(paymentIdentity, requestId);
    requestToPaymentIdentity.set(requestId, paymentIdentity);
    verifiedIds.add(requestId);
  }

  let verifiedVoidMicro = 0n;
  for (const requestId of verifiedIds) {
    verifiedVoidMicro += quotes.get(requestId) || 0n;
  }
  if (verifiedVoidMicro > poolVoidMicro) {
    fail("buy_void_verified_payment_capacity_ledger_oversubscribed");
  }
  return Object.freeze({
    verified_ids: verifiedIds,
    payment_identity_to_request: paymentIdentityToRequest,
    request_to_payment_identity: requestToPaymentIdentity,
    verified_void_micro: verifiedVoidMicro,
    reserved_void_micro: verifiedVoidMicro,
    remaining_void_micro: poolVoidMicro - verifiedVoidMicro,
  });
}

function assertProjectionMatchesStrictLedgerV1(
  decision: ReturnType<
    typeof classifyBuyVoidVerifiedPaymentCapacityAdmissionV1
  >,
  strict: ReturnType<typeof readStrictCapacityLedgerV1>,
): void {
  if (
    BigInt(decision.verified_void_micro) !== strict.verified_void_micro ||
    BigInt(decision.reserved_void_micro) !== strict.reserved_void_micro ||
    BigInt(decision.remaining_void_micro) !== strict.remaining_void_micro
  ) {
    fail("buy_void_verified_payment_capacity_projection_mismatch");
  }
}

function freezeDecision(input: {
  ready: boolean;
  reason: string | null;
  already_verified: boolean;
  quoted_void_micro: bigint;
  pool_void_micro: bigint;
  reserved_void_micro: bigint;
  verified_void_micro: bigint;
  remaining_void_micro: bigint;
}) {
  return Object.freeze({
    marker: VOID_BUY_VOID_VERIFIED_PAYMENT_CAPACITY_ADMISSION_V1,
    version: 1,
    ready: input.ready,
    reason: input.reason,
    already_verified: input.already_verified,
    quoted_void_micro: input.quoted_void_micro.toString(),
    pool_void_micro: input.pool_void_micro.toString(),
    reserved_void_micro: input.reserved_void_micro.toString(),
    verified_void_micro: input.verified_void_micro.toString(),
    remaining_void_micro: input.remaining_void_micro.toString(),
    authority:
      VOID_BUY_VOID_VERIFIED_PAYMENT_CAPACITY_ADMISSION_AUTHORITY_V1,
  });
}

export function classifyBuyVoidVerifiedPaymentCapacityAdmissionV1(input: {
  sale_state: any;
  quoted_void: unknown;
  already_verified?: boolean;
}) {
  const quoted = microVoid(
    input?.quoted_void,
    "buy_void_verified_payment_capacity_quote_invalid",
    true,
  );
  const sale = input?.sale_state;
  if (!sale || typeof sale !== "object" || Array.isArray(sale)) {
    fail("buy_void_verified_payment_capacity_state_invalid");
  }
  const pool = microVoid(
    sale.pool_void_total,
    "buy_void_verified_payment_capacity_state_invalid",
    true,
  );
  const reserved = microVoid(
    sale.allocation_reserved_void,
    "buy_void_verified_payment_capacity_state_invalid",
  );
  const verified = microVoid(
    sale.verified_void_total,
    "buy_void_verified_payment_capacity_state_invalid",
  );
  const remaining = microVoid(
    sale.remaining_void,
    "buy_void_verified_payment_capacity_state_invalid",
  );
  if (
    reserved > pool ||
    verified > pool ||
    remaining > pool ||
    reserved !== verified ||
    reserved + remaining !== pool
  ) {
    return freezeDecision({
      ready: false,
      reason: "buy_void_verified_payment_capacity_state_invalid",
      already_verified: input.already_verified === true,
      quoted_void_micro: quoted,
      pool_void_micro: pool,
      reserved_void_micro: reserved,
      verified_void_micro: verified,
      remaining_void_micro: remaining,
    });
  }
  const already = input.already_verified === true;
  if (!already && quoted > remaining) {
    return freezeDecision({
      ready: false,
      reason: "buy_void_verified_payment_capacity_exceeded",
      already_verified: false,
      quoted_void_micro: quoted,
      pool_void_micro: pool,
      reserved_void_micro: reserved,
      verified_void_micro: verified,
      remaining_void_micro: remaining,
    });
  }
  return freezeDecision({
    ready: true,
    reason: null,
    already_verified: already,
    quoted_void_micro: quoted,
    pool_void_micro: pool,
    reserved_void_micro: reserved,
    verified_void_micro: verified,
    remaining_void_micro: remaining,
  });
}

export async function withBuyVoidVerifiedPaymentCapacityAdmissionV1<T>(input: {
  request_dir: string;
  request_id: string;
  quoted_void: unknown;
  canonical_payment_identity: string;
  read_sale_state: () => Promise<any>;
  operation: () => Promise<T> | T;
}): Promise<{
  ok: true;
  idempotent: boolean;
  operation_performed: boolean;
  decision: ReturnType<
    typeof classifyBuyVoidVerifiedPaymentCapacityAdmissionV1
  >;
  result: T | null;
}> {
  const rawDir = String(input?.request_dir || "").trim();
  const requestId = String(input?.request_id || "").trim();
  const paymentIdentity = String(
    input?.canonical_payment_identity || "",
  ).trim();
  if (
    !rawDir ||
    !REQUEST_ID.test(requestId) ||
    !PAYMENT_IDENTITY.test(paymentIdentity) ||
    typeof input?.read_sale_state !== "function" ||
    typeof input?.operation !== "function"
  ) {
    fail("buy_void_verified_payment_capacity_input_invalid");
  }
  microVoid(
    input.quoted_void,
    "buy_void_verified_payment_capacity_quote_invalid",
    true,
  );
  const requestDir = path.resolve(rawDir);
  const lockPath = path.join(
    requestDir,
    ".verified-payment-capacity-admission-v1",
  );

  return withBuyVoidFilesystemBakeryLockAsyncV1(
    lockPath,
    async () => {
      const saleBefore = await input.read_sale_state();
      const poolBefore = microVoid(
        saleBefore?.pool_void_total,
        "buy_void_verified_payment_capacity_state_invalid",
        true,
      );
      const strictBefore = readStrictCapacityLedgerV1(
        requestDir,
        poolBefore,
      );
      const priorRequest =
        strictBefore.payment_identity_to_request.get(paymentIdentity);
      if (priorRequest !== undefined && priorRequest !== requestId) {
        fail("buy_void_verified_payment_identity_already_claimed");
      }
      const priorIdentity =
        strictBefore.request_to_payment_identity.get(requestId);
      if (priorIdentity !== undefined && priorIdentity !== paymentIdentity) {
        fail("buy_void_verified_payment_identity_request_conflict");
      }
      const alreadyVerified = priorIdentity === paymentIdentity;
      const before = classifyBuyVoidVerifiedPaymentCapacityAdmissionV1({
        sale_state: saleBefore,
        quoted_void: input.quoted_void,
        already_verified: alreadyVerified,
      });
      assertProjectionMatchesStrictLedgerV1(before, strictBefore);
      if (!before.ready) fail(String(before.reason));

      if (alreadyVerified) {
        return Object.freeze({
          ok: true as const,
          idempotent: true,
          operation_performed: false,
          decision: before,
          result: null,
        });
      }

      const result = await input.operation();
      const saleAfter = await input.read_sale_state();
      const poolAfter = microVoid(
        saleAfter?.pool_void_total,
        "buy_void_verified_payment_capacity_state_invalid",
        true,
      );
      if (poolAfter !== poolBefore) {
        fail("buy_void_verified_payment_capacity_pool_changed");
      }
      const strictAfter = readStrictCapacityLedgerV1(
        requestDir,
        poolAfter,
      );
      const after = classifyBuyVoidVerifiedPaymentCapacityAdmissionV1({
        sale_state: saleAfter,
        quoted_void: input.quoted_void,
        already_verified: true,
      });
      assertProjectionMatchesStrictLedgerV1(after, strictAfter);
      if (!after.ready) {
        fail("buy_void_verified_payment_capacity_postcheck_failed");
      }
      const expectedVerified =
        BigInt(before.verified_void_micro) +
        BigInt(before.quoted_void_micro);
      const expectedRemaining =
        BigInt(before.remaining_void_micro) -
        BigInt(before.quoted_void_micro);
      if (
        !strictAfter.verified_ids.has(requestId) ||
        strictAfter.request_to_payment_identity.get(requestId) !==
          paymentIdentity ||
        strictAfter.payment_identity_to_request.get(paymentIdentity) !==
          requestId ||
        strictAfter.verified_void_micro !== expectedVerified ||
        strictAfter.reserved_void_micro !== expectedVerified ||
        strictAfter.remaining_void_micro !== expectedRemaining ||
        BigInt(after.verified_void_micro) !== expectedVerified ||
        BigInt(after.reserved_void_micro) !== expectedVerified ||
        BigInt(after.remaining_void_micro) !== expectedRemaining ||
        after.pool_void_micro !== before.pool_void_micro
      ) {
        fail("buy_void_verified_payment_capacity_postcheck_failed");
      }
      return Object.freeze({
        ok: true as const,
        idempotent: false,
        operation_performed: true,
        decision: before,
        result,
      });
    },
  );
}

export async function writeBuyVoidOperatorEventWithCapacityAdmissionV1(input: {
  event: any;
  request: any;
  request_dir: string;
  with_launch_authority_mutation: (
    request: any,
    operation: () => any,
  ) => Promise<any>;
  read_sale_state: () => Promise<any>;
}) {
  const event = input?.event;
  const request = input?.request;
  const requestDirRaw = String(input?.request_dir || "").trim();
  const requestId = String(event?.request_id || "").trim();
  if (
    !event ||
    typeof event !== "object" ||
    Array.isArray(event) ||
    !request ||
    typeof request !== "object" ||
    Array.isArray(request) ||
    !REQUEST_ID.test(requestId) ||
    requestId !== String(request?.request_id || "").trim() ||
    !requestDirRaw ||
    typeof input?.with_launch_authority_mutation !== "function" ||
    typeof input?.read_sale_state !== "function"
  ) {
    fail("buy_void_operator_event_capacity_writer_input_invalid");
  }
  const requestDir = path.resolve(requestDirRaw);
  fs.mkdirSync(requestDir, { recursive: true });

  let eventToWrite = event;
  const append = () =>
    withBuyVoidTerminalCloseoutRequestLockV1(
      {
        request_dir: requestDir,
        request_id: requestId,
      },
      () => {
        fs.appendFileSync(
          path.join(requestDir, "operator-events.jsonl"),
          JSON.stringify(eventToWrite) + "\n",
        );
        fs.writeFileSync(
          path.join(
            requestDir,
            "operator-event-" +
              requestId +
              "-" +
              String(event.marked_at_ms || "") +
              ".json",
          ),
          JSON.stringify(eventToWrite, null, 2),
        );
        return { ok: true, dir: requestDir };
      },
    );

  if (String(event.operator_status || "") !== "payment_verified") {
    return append();
  }

  const paymentIdentity = canonicalIdentityFromVerifiedEventV1(
    event,
    "buy_void_verified_payment_identity_event_invalid",
  );
  eventToWrite = {
    ...event,
    canonical_payment_identity: paymentIdentity,
  };

  const requestQuoted = microVoid(
    request.quoted_void,
    "buy_void_verified_payment_capacity_quote_invalid",
    true,
  );
  const eventQuoted = microVoid(
    event.quoted_void,
    "buy_void_verified_payment_capacity_quote_invalid",
    true,
  );
  if (requestQuoted !== eventQuoted) {
    fail("buy_void_verified_payment_capacity_quote_mismatch");
  }

  const admission =
    await withBuyVoidVerifiedPaymentCapacityAdmissionV1({
      request_dir: requestDir,
      request_id: requestId,
      quoted_void: request.quoted_void,
      canonical_payment_identity: paymentIdentity,
      read_sale_state: input.read_sale_state,
      operation: () =>
        input.with_launch_authority_mutation(request, append),
    });
  if (admission.idempotent) {
    return {
      ok: true,
      dir: requestDir,
      idempotent: true,
      capacity_admission: admission.decision,
    };
  }
  return {
    ...(admission.result as any),
    idempotent: false,
    capacity_admission: admission.decision,
  };
}
