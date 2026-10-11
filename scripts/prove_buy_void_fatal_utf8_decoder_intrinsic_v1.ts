// Current source-only P1 regression: mutated TextDecoder.prototype.decode may
// not decide which authenticated first-buyer or allocation JSONL bytes exist.
// Actual economic classifiers only, synthetic malformed data, zero writes.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { TextDecoder } from "node:util";
import {
  classifyBuyVoidAllocationReservationLedgerV1,
} from "../src/economic/buy_void_allocation_reservation_ledger_v1.js";
import {
  classifyBuyVoidVerifiedAllocationReplayBindingV1,
} from "../src/economic/buy_void_verified_allocation_replay_binding_v1.js";

const PINNED_SOURCE = Object.freeze({
  "src/economic/buy_void_allocation_reservation_ledger_v1.ts":
    "1542e833242a20bea8359396e2e157882e53cabc",
  "src/economic/buy_void_verified_allocation_replay_binding_v1.ts":
    "b5dbbbd932688f8b0ad04477433cd11ede413bb7",
});
function gitBlob(file: string): string {
  const bytes = fs.readFileSync(file);
  return crypto.createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0"))
    .update(bytes).digest("hex");
}
for (const [path, expected] of Object.entries(PINNED_SOURCE)) {
  assert.equal(gitBlob(path), expected, "current reviewed UTF-8 source drift: " + path);
}
const original = Object.getOwnPropertyDescriptor(TextDecoder.prototype, "decode");
assert.ok(original && original.configurable && typeof original.value === "function");
const originalApply = Reflect.apply;
let callbackCount = 0;
let applyHookCount = 0;
Object.defineProperty(TextDecoder.prototype, "decode", {
  ...original,
  value(_bytes: unknown) {
    callbackCount++;
    // A contaminated caller wants to substitute a canonical-looking row
    // for the bytes actually presented to the economic classifiers.
    return '{"record_type":"allocation_reserved","request_id":"buyvoid_z_aaaaaaaa"}';
  },
});
let succeeded = 0;
try {
  // Positive control: the inherited decoder method was actually replaced.
  const positive = new TextDecoder("utf-8").decode(Buffer.from("X", "utf8"));
  assert.match(positive, /allocation_reserved/u);
  assert.equal(callbackCount, 1, "malicious prototype control not armed");
  callbackCount = 0;
  // A captured native method is still unsafe if passed through a mutable
  // Reflect.apply at parse time. Reproduce that second callback boundary.
  const forged = '{"record_type":"allocation_reserved","request_id":"buyvoid_z_aaaaaaaa"}';
  Object.defineProperty(Reflect, "apply", {
    configurable: true,
    writable: true,
    value: function(target: Function, receiver: unknown, args: any[]) {
    if (target === original.value && Array.isArray(args) &&
        args.length === 1 && Buffer.isBuffer(args[0])) {
      applyHookCount++;
      return forged;
    }
    return originalApply(target, receiver, args);
    },
  });
  const intercepted = Reflect.apply(original.value,
    new TextDecoder("utf-8", { fatal: true }),
    [Buffer.from([0xc3, 0x28, 0x0a])]);
  assert.equal(intercepted, forged,
    "malicious Reflect.apply control not armed");
  assert.equal(applyHookCount, 1);
  applyHookCount = 0;

  const ledger = classifyBuyVoidAllocationReservationLedgerV1(Buffer.from("X\n"));
  assert.equal(ledger.ok, false, "invalid allocation JSONL must HOLD");
  succeeded++;
  const ledgerInvalidUtf8 =
    classifyBuyVoidAllocationReservationLedgerV1(Buffer.from([0xc3, 0x28, 0x0a]));
  assert.equal(ledgerInvalidUtf8.ok, false, "invalid UTF8 must HOLD");
  succeeded++;

  const replay = classifyBuyVoidVerifiedAllocationReplayBindingV1({
    request_id: "buyvoid_z_aaaaaaaa",
    requests_jsonl: Buffer.from("X\n"),
    operator_events_jsonl: Buffer.alloc(0),
    allocation_jsonl: Buffer.alloc(0),
  });
  assert.equal(replay.ok, false, "unparseable original request must HOLD");
  succeeded++;
  const replayInvalidUtf8 = classifyBuyVoidVerifiedAllocationReplayBindingV1({
    request_id: "buyvoid_z_aaaaaaaa",
    requests_jsonl: Buffer.from([0xc3, 0x28, 0x0a]),
    operator_events_jsonl: Buffer.alloc(0),
    allocation_jsonl: Buffer.alloc(0),
  });
  assert.equal(replayInvalidUtf8.ok, false, "unparseable UTF8 replay must HOLD");
  succeeded++;

  assert.equal(callbackCount, 0,
    "source parsers must NEVER invoke mutated TextDecoder.prototype.decode");
  assert.equal(applyHookCount, 0,
    "source parsers must NEVER invoke mutable Reflect.apply for UTF-8 decode");
} finally {
  Reflect.apply = originalApply;
  Object.defineProperty(TextDecoder.prototype, "decode", original);
}
assert.equal(succeeded, 4);
assert.equal(new TextDecoder("utf-8").decode(Buffer.from("X")), "X",
  "decoder prototype restored after regression");
console.log("VOID_BUY_VOID_FATAL_UTF8_INTRINSIC_SOURCE_GREEN");
console.log("reviewed_allocation_source_blob=" + PINNED_SOURCE[
  "src/economic/buy_void_allocation_reservation_ledger_v1.ts"]);
console.log("reviewed_replay_source_blob=" + PINNED_SOURCE[
  "src/economic/buy_void_verified_allocation_replay_binding_v1.ts"]);
console.log("malicious_decoder_control_armed=true");
console.log("malicious_decoder_callback_invocations_on_economic_classifiers=0");
console.log("mutable_reflect_apply_decoder_calls=0");
console.log("bound_fatal_utf8_decoder_used=true");
console.log("synthetic_hold_cases=" + succeeded);
console.log("prototype_restored_after_test=true");
console.log("payment_or_allocation_append_performed=false");
console.log("runtime_installation=false");
console.log("production_gate_ready=false");
console.log("presale_activation=false");
console.log("funds_moved=false");
