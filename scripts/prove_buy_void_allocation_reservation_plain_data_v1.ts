import assert from "node:assert/strict";

import {
  VOID_BUY_VOID_ALLOCATION_RESERVATION_LEDGER_AUTHORITY_V1,
  classifyBuyVoidAllocationReservationLedgerV1,
  planBuyVoidAllocationReservationV1,
} from "../src/economic/buy_void_allocation_reservation_ledger_v1.js";

const sha = (hex: string) => "sha256:" + hex.repeat(64);
const baseInput = {
  ledger_jsonl: "",
  request_id: "buyvoid_a_aaaaaaaa",
  source_chain: "base",
  payment_transaction_hash: "0x" + "a".repeat(64),
  payment_log_index: 7,
  launch_authority: {
    marker: "VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1",
    version: 1,
    coupled_launch_id: sha("a"),
    source_composition_id: sha("b"),
    activation_generation: "0x" + "c".repeat(64),
    generation_tip_sha256: sha("d"),
    activation_receipt_id: "voidbclive1_" + "e".repeat(64),
    activation_receipt_sha256: "f".repeat(64),
    expires_at_ms: 1_800_000_300_000,
  },
  buyer_delivery_wallet: "0x" + "1".repeat(40),
  quote_void_amount: "6",
  quote_usdc_amount: "3",
  pool_void_total: "10000000",
  verified_payment_receipt_ref: sha("1"),
  payment_verified_event_sha256: sha("0"),
  duplicate_payment_guard_result: sha("2"),
  inventory_allocation_guard_result: sha("3"),
  operator_activation_record_ref: sha("4"),
  created_at_ms: 1_800_000_000_000,
  verified_payment_gate_green: true,
  duplicate_payment_guard_green: true,
  inventory_allocation_guard_green: true,
  operator_activation_record_green: true,
};

type Plan = ReturnType<typeof planBuyVoidAllocationReservationV1>;
function requireOk(decision: Plan) {
  assert.equal(decision.ok, true, "expected approved reservation");
  if (!decision.ok) throw Error("allocation reservation unexpectedly held");
  return decision;
}
function requireHeld(decision: Plan, reason: string) {
  assert.equal(decision.ok, false);
  if (decision.ok) throw Error("expected HELD input");
  assert.equal(decision.reason, reason);
}
const first = requireOk(planBuyVoidAllocationReservationV1(baseInput));
assert.equal(first.status, "planned");
assert.equal(first.record.record_type, "allocation_reserved");
assert.equal(first.next_record_count, 1);
assert.equal(first.record.quote_void_amount, "6");
assert.equal(first.record.quote_usdc_amount, "3");
assert.equal(first.record.remaining_void_after, "9999994");
const canonicalFirst = first.next_ledger_jsonl;
assert.equal(
  classifyBuyVoidAllocationReservationLedgerV1(canonicalFirst).ok,
  true,
  "canonical record must remain valid",
);
const replayBuffer = Buffer.from(canonicalFirst, "utf8");
const replay = requireOk(planBuyVoidAllocationReservationV1({
  ...baseInput,
  ledger_jsonl: replayBuffer,
  created_at_ms: baseInput.created_at_ms + 1,
}));
assert.equal(replay.status, "idempotent");
assert.equal(replay.next_ledger_jsonl, canonicalFirst);
assert.equal(replay.record.allocation_record_hash, first.record.allocation_record_hash);
replayBuffer.fill(0);
assert.equal(replay.next_ledger_jsonl, canonicalFirst);

let traps = 0;
const throwingProxy = new Proxy(baseInput, {
  get() { traps++; throw Error("unauthorized_proxy_get"); },
  ownKeys() { traps++; throw Error("unauthorized_proxy_keys"); },
  getOwnPropertyDescriptor() {
    traps++; throw Error("unauthorized_proxy_descriptor");
  },
});
requireHeld(
  planBuyVoidAllocationReservationV1(throwingProxy),
  "allocation_reservation_input_not_plain_data",
);
assert.equal(traps, 0, "top-level Proxy traps must never execute");

{
  let reads = 0;
  const accessor: any = { ...baseInput };
  Object.defineProperty(accessor, "request_id", {
    enumerable: true,
    get() { reads++; throw Error("unauthorized_getter"); },
  });
  requireHeld(
    planBuyVoidAllocationReservationV1(accessor),
    "allocation_reservation_input_not_plain_data",
  );
  assert.equal(reads, 0, "caller input accessor must not execute");
}
{
  let reads = 0;
  const nested: any = { ...baseInput.launch_authority };
  Object.defineProperty(nested, "coupled_launch_id", {
    enumerable: true,
    get() { reads++; throw Error("unauthorized_launch_getter"); },
  });
  requireHeld(
    planBuyVoidAllocationReservationV1({
      ...baseInput, launch_authority: nested,
    }),
    "allocation_reservation_request_launch_authority_invalid",
  );
  assert.equal(reads, 0, "launch authority accessor must not execute");
}
{
  let reads = 0;
  const proxiedLaunch = new Proxy(baseInput.launch_authority, {
    get() { reads++; throw Error("unauthorized_launch_get"); },
    ownKeys() { reads++; throw Error("unauthorized_launch_keys"); },
  });
  requireHeld(
    planBuyVoidAllocationReservationV1({
      ...baseInput, launch_authority: proxiedLaunch,
    }),
    "allocation_reservation_request_launch_authority_invalid",
  );
  assert.equal(reads, 0, "launch authority Proxy trap must not execute");
}

for (const name of [
  "request_id",
  "source_chain",
  "payment_transaction_hash",
  "payment_log_index",
  "buyer_delivery_wallet",
  "quote_void_amount",
  "quote_usdc_amount",
  "pool_void_total",
  "verified_payment_receipt_ref",
  "payment_verified_event_sha256",
  "created_at_ms",
  "verified_payment_gate_green",
] as const) {
  let executions = 0;
  const malicious = {
    toString() { executions++; return String((baseInput as any)[name]); },
    valueOf() { executions++; return (baseInput as any)[name]; },
    [Symbol.toPrimitive]() {
      executions++; return (baseInput as any)[name];
    },
  };
  requireHeld(
    planBuyVoidAllocationReservationV1({
      ...baseInput,
      [name]: malicious,
    } as any),
    "allocation_reservation_input_not_plain_data",
  );
  assert.equal(executions, 0, name + " coerced untrusted object");
}
{
  let executions = 0;
  const fakeLedger = {
    toString() {
      executions++;
      return "";
    },
  };
  requireHeld(
    planBuyVoidAllocationReservationV1({
      ...baseInput,
      ledger_jsonl: fakeLedger,
    } as any),
    "allocation_reservation_input_not_plain_data",
  );
  assert.equal(executions, 0);
  const classified = classifyBuyVoidAllocationReservationLedgerV1(
    fakeLedger as any,
  );
  assert.equal(classified.ok, false);
  if (!classified.ok) {
    assert.equal(classified.reason, "allocation_reservation_ledger_not_plain_data");
  }
  assert.equal(executions, 0, "classification coerced fake ledger");
}
requireHeld(
  planBuyVoidAllocationReservationV1({
    ...baseInput,
    never_reviewed: "unknown_extra",
  } as any),
  "allocation_reservation_input_not_plain_data",
);
{
  const nullPrototype = Object.assign(Object.create(null), baseInput);
  const valid = requireOk(planBuyVoidAllocationReservationV1(nullPrototype));
  assert.equal(valid.next_ledger_jsonl, canonicalFirst);
}

const inherited = Object.getOwnPropertyDescriptor(Object.prototype, "toJSON");
let toJsonCalls = 0;
try {
  Object.defineProperty(Object.prototype, "toJSON", {
    configurable: true,
    enumerable: false,
    writable: true,
    value() { toJsonCalls++; return { attacker_replacement: true }; },
  });
  const underHook = requireOk(planBuyVoidAllocationReservationV1(baseInput));
  assert.equal(underHook.next_ledger_jsonl, canonicalFirst);
  assert.equal(underHook.record.allocation_record_hash, first.record.allocation_record_hash);
  const replay = classifyBuyVoidAllocationReservationLedgerV1(canonicalFirst);
  assert.equal(replay.ok, true, "inherited toJSON must not change ledger parser");
  assert.equal(toJsonCalls, 0, "ambient prototype toJSON executed");
} finally {
  if (inherited) Object.defineProperty(Object.prototype, "toJSON", inherited);
  else delete (Object.prototype as any).toJSON;
}
assert.equal(
  VOID_BUY_VOID_ALLOCATION_RESERVATION_LEDGER_AUTHORITY_V1.filesystem_write,
  false,
);
assert.equal(
  VOID_BUY_VOID_ALLOCATION_RESERVATION_LEDGER_AUTHORITY_V1.production_gate_ready,
  false,
);

console.log("VOID_BUY_VOID_ALLOCATION_LEDGER_PLAIN_DATA_V1_GREEN");
console.log("canonical_record_jsonl_unchanged=true");
console.log("idempotent_buffer_replay_unchanged=true");
console.log("top_level_proxy_traps_executed=false");
console.log("top_level_accessor_invoked=false");
console.log("nested_launch_proxy_or_accessor_invoked=false");
console.log("primitive_structural_coercion_callbacks_executed=false");
console.log("unreviewed_fields_held=true");
console.log("ambient_Object_toJSON_executed=false");
console.log("production_allocation_mutation_ready=false");
console.log("wallet_or_signer_access=false");
console.log("funds_moved=false");
