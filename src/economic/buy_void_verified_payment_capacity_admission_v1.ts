import fs from "node:fs";
import path from "node:path";

import {
  withBuyVoidFilesystemBakeryLockAsyncV1,
} from "./buy_void_filesystem_bakery_lock_v1.js";
import {
  withBuyVoidTerminalCloseoutRequestLockV1,
} from "./buy_void_terminal_closeout_request_lock_v1.js";

export const VOID_BUY_VOID_VERIFIED_PAYMENT_CAPACITY_ADMISSION_V1 =
  "VOID_BUY_VOID_VERIFIED_PAYMENT_CAPACITY_ADMISSION_V1";

export const VOID_BUY_VOID_VERIFIED_PAYMENT_CAPACITY_ADMISSION_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    request_directory_read: true,
    request_directory_write: true,
    serialized_capacity_admission: true,
    payment_receipt_verification: false,
    duplicate_payment_identity_verification: false,
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
  read_sale_state: () => Promise<any>;
  read_operator_events: () => Promise<any[]>;
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
  if (
    !rawDir ||
    !REQUEST_ID.test(requestId) ||
    typeof input?.read_sale_state !== "function" ||
    typeof input?.read_operator_events !== "function" ||
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
      const events = await input.read_operator_events();
      if (!Array.isArray(events)) {
        fail("buy_void_verified_payment_capacity_events_invalid");
      }
      const alreadyVerified = events.some(
        (event: any) =>
          String(event?.request_id || "") === requestId &&
          String(event?.operator_status || "") === "payment_verified",
      );
      const before = classifyBuyVoidVerifiedPaymentCapacityAdmissionV1({
        sale_state: await input.read_sale_state(),
        quoted_void: input.quoted_void,
        already_verified: alreadyVerified,
      });
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
      const after = classifyBuyVoidVerifiedPaymentCapacityAdmissionV1({
        sale_state: await input.read_sale_state(),
        quoted_void: input.quoted_void,
        already_verified: true,
      });
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
  read_operator_events: () => Promise<any[]>;
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
    typeof input?.read_sale_state !== "function" ||
    typeof input?.read_operator_events !== "function"
  ) {
    fail("buy_void_operator_event_capacity_writer_input_invalid");
  }
  const requestDir = path.resolve(requestDirRaw);
  fs.mkdirSync(requestDir, { recursive: true });

  const append = () =>
    withBuyVoidTerminalCloseoutRequestLockV1(
      {
        request_dir: requestDir,
        request_id: requestId,
      },
      () => {
        fs.appendFileSync(
          path.join(requestDir, "operator-events.jsonl"),
          JSON.stringify(event) + "\n",
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
          JSON.stringify(event, null, 2),
        );
        return { ok: true, dir: requestDir };
      },
    );

  if (String(event.operator_status || "") !== "payment_verified") {
    return append();
  }

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
      read_sale_state: input.read_sale_state,
      read_operator_events: input.read_operator_events,
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
