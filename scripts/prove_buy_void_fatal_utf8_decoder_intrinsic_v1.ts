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
    "53d7e24dc2b646e05f2ecce0c02181d0af53b849",
  "src/economic/buy_void_verified_allocation_replay_binding_v1.ts":
    "423f06869623e0e3bb626d68aabd302ca1ecbb17",
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
const originalSlice = ArrayBuffer.prototype.slice;
const typedArrayProto = Object.getPrototypeOf(Uint8Array.prototype);
const byteLengthGetter =
  Object.getOwnPropertyDescriptor(typedArrayProto, "byteLength")?.get;
const lengthGetter =
  Object.getOwnPropertyDescriptor(typedArrayProto, "length")?.get;
const typedSubarray = Uint8Array.prototype.subarray;
assert.ok(byteLengthGetter && lengthGetter);
let callbackCount = 0;
let applyHookCount = 0;
let framingHookCount = 0;
let sliceHookCount = 0;
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
    // Byte-length spoofing can incorrectly turn nonempty ledger history into
    // an empty, apparently valid genesis, before any decoded JSONL check.
    const marker = Buffer.isBuffer(receiver) &&
      receiver.length === 2 && receiver[0] === 0x58 &&
      receiver[1] === 0x0a;
    if (marker && (target === byteLengthGetter || target === lengthGetter)) {
      framingHookCount++;
      return 0;
    }
    // Redirect framed row bytes to unrelated but canonical JSON text.
    if (marker && target === typedSubarray) {
      framingHookCount++;
      return Buffer.from("{}", "utf8");
    }
    if (target === originalSlice && receiver instanceof ArrayBuffer) {
      sliceHookCount++;
      return new ArrayBuffer(0);
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
  // Each attacker path must be reachable as a positive control through
  // the live, poisoned global, rather than a vacuous zero-call assertion.
  const twoBytes = Buffer.from("X\n");
  assert.equal(Reflect.apply(byteLengthGetter!, twoBytes, []), 0);
  const forgedRow = Reflect.apply(typedSubarray, twoBytes, [0, 1]);
  assert.equal(Buffer.from(forgedRow).toString("utf8"), "{}");
  assert.equal(framingHookCount, 2);
  framingHookCount = 0;
  assert.equal(Reflect.apply(originalSlice, new ArrayBuffer(8), [0, 0])
    .byteLength, 0);
  assert.equal(sliceHookCount, 1);
  sliceHookCount = 0;

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
  assert.equal(framingHookCount, 0,
    "ledger/replay may not use a mutable Reflect.apply for bytes or row frames");
  assert.equal(sliceHookCount, 0,
    "replay may not use a mutable Reflect.apply for ArrayBuffer slice");
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
console.log("mutable_reflect_apply_frame_calls=0");
console.log("mutable_reflect_apply_slice_calls=0");
console.log("bound_fatal_utf8_decoder_used=true");
console.log("synthetic_hold_cases=" + succeeded);
console.log("prototype_restored_after_test=true");
console.log("payment_or_allocation_append_performed=false");
console.log("runtime_installation=false");
console.log("production_gate_ready=false");
console.log("presale_activation=false");
console.log("funds_moved=false");
