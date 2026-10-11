// Source-only actual writer regression: terminal status must be monotonic
// inside the SAME per-request lock that protects the operator-event append.
// All state is disposable synthetic JSONL. No payment/signer/service access.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { TextDecoder } from "node:util";
import {
  writeBuyVoidOperatorEventWithCapacityAdmissionV1,
} from "../src/economic/buy_void_verified_payment_capacity_admission_v1.js";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-status-under-lock-"));
const first = {
  request_id: "buyvoid_terminal_aaaaaaaa",
  quoted_void: 2,
  source_chain: "base",
  tx_hash: "0x" + "a".repeat(64),
};
const other = {
  request_id: "buyvoid_unrelated_bbbbbbbb",
  quoted_void: 2,
  source_chain: "base",
  tx_hash: "0x" + "b".repeat(64),
};
const event = (
  request: typeof first,
  operator_status: "reviewed" | "rejected" | "fulfilled",
  marked_at_ms: number,
) => ({
  schema: "void_buy_void_operator_mark_v1",
  ok: true,
  request_id: request.request_id,
  operator_status,
  marked_at_ms,
  quoted_void: request.quoted_void,
});
const noLaunch = async () => {
  assert.fail("status-only terminal proof must not invoke payment launch");
};
const noSale = async () => {
  assert.fail("status-only terminal proof must not read sale state");
};
async function mark(
  request: typeof first,
  status: "reviewed" | "rejected" | "fulfilled",
  time: number,
) {
  return writeBuyVoidOperatorEventWithCapacityAdmissionV1({
    event: event(request, status, time),
    request,
    request_dir: root,
    with_launch_authority_mutation: noLaunch,
    read_sale_state: noSale,
  });
}
const historyPath = path.join(root, "operator-events.jsonl");
try {
  fs.chmodSync(root, 0o700);
  const initial = await mark(first, "reviewed", 100);
  assert.equal(initial.ok, true);
  assert.equal(fs.existsSync(historyPath), true);

  // Simulate an *already committed* valid terminal row between a stale
  // route projection and this writer's request-lock acquisition.
  const terminal = event(first, "fulfilled", 200);
  fs.appendFileSync(historyPath, JSON.stringify(terminal) + "\n");
  const before = fs.readFileSync(historyPath);
  for (const [status, time] of [
    ["reviewed", 301],
    ["rejected", 302],
    ["fulfilled", 303],
  ] as const) {
    await assert.rejects(
      () => mark(first, status, time),
      /buy_void_operator_fulfilled_terminal_under_lock/u,
    );
    assert.deepEqual(fs.readFileSync(historyPath), before,
      "stale mark mutated canonical history after terminal closeout");
    assert.equal(fs.existsSync(path.join(root,
      "operator-event-" + first.request_id + "-" + time + ".json")), false,
      "stale mark wrote a visible sidecar");
  }

  // A terminal row for request A cannot freeze unrelated request B.
  const unrelated = await mark(other, "reviewed", 400);
  assert.equal(unrelated.ok, true);
  const beforeCorruption = fs.readFileSync(historyPath);
  assert.ok(beforeCorruption.length > before.length);

  // Exercise the *actual* locked writer with hostile same-process globals.
  // Native parsing must retain the historical fulfilled row even when the
  // inherited string/JSON methods can forge an apparent rejected projection.
  const stableHistory = fs.readFileSync(historyPath);
  const originalSplit = String.prototype.split;
  const originalDecode = TextDecoder.prototype.decode;
  const originalParse = JSON.parse;
  const originalStringify = JSON.stringify;
  const originalToJSON = Object.getOwnPropertyDescriptor(
    Object.prototype, "toJSON",
  );
  const fulfilledLine = originalStringify(terminal);
  const forgedLine = originalStringify({ ...terminal,
    operator_status: "rejected",
  });
  let splitCalls = 0;
  let decodeCalls = 0;
  let parseCalls = 0;
  let stringifyCalls = 0;
  let inheritedCalls = 0;
  try {
    (String.prototype as any).split = function(
      this: string, separator: string | RegExp, limit?: number,
    ) {
      if (separator === "\n" &&
          String(this).includes(fulfilledLine)) {
        splitCalls += 1;
        return [forgedLine];
      }
      return originalSplit.call(this, separator, limit);
    };
    (TextDecoder.prototype as any).decode = function(this: TextDecoder,
      bytes: Uint8Array) {
      const decoded = Reflect.apply(originalDecode, this, [bytes]) as string;
      if (decoded.includes(fulfilledLine)) {
        decodeCalls += 1;
        return decoded.replace(fulfilledLine, forgedLine);
      }
      return decoded;
    };
    (JSON as any).parse = function(source: string, reviver?: any) {
      if (source === fulfilledLine) {
        parseCalls += 1;
        return originalParse(forgedLine, reviver);
      }
      return originalParse(source, reviver);
    };
    (JSON as any).stringify = function(value: any, ...extra: any[]) {
      if (value?.operator_status === "fulfilled") {
        stringifyCalls += 1;
        return Reflect.apply(originalStringify, JSON, [
          { ...value, operator_status: "rejected" }, ...extra,
        ]);
      }
      return Reflect.apply(originalStringify, JSON, [value, ...extra]);
    };
    Object.defineProperty(Object.prototype, "toJSON", {
      configurable: true,
      writable: true,
      value: function(this: any) {
        if (this?.operator_status === "fulfilled") {
          inheritedCalls += 1;
          return { ...this, operator_status: "rejected" };
        }
        return this;
      },
    });
    // All hooks must be demonstrably armed, not zero-call tautologies.
    assert.equal("line\nother".split("\n").length, 2);
    assert.equal(
      ("prefix" + fulfilledLine + "\n").split("\n")[0], forgedLine);
    assert.equal(new TextDecoder("utf-8").decode(
      Buffer.from(fulfilledLine + "\n")).includes(forgedLine), true);
    assert.equal(JSON.parse(fulfilledLine).operator_status, "rejected");
    assert.equal(JSON.stringify(terminal).includes('"rejected"'), true);
    assert.equal(originalStringify(terminal).includes('"rejected"'), true);
    assert.equal(splitCalls, 1);
    assert.equal(decodeCalls, 1);
    assert.equal(parseCalls, 1);
    assert.equal(stringifyCalls, 1);
    assert.equal(inheritedCalls, 1);
    splitCalls = 0;
    decodeCalls = 0;
    parseCalls = 0;
    stringifyCalls = 0;
    inheritedCalls = 0;

    await assert.rejects(
      () => mark(first, "rejected", 450),
      /buy_void_operator_fulfilled_terminal_under_lock/u,
    );
    assert.deepEqual(fs.readFileSync(historyPath), stableHistory,
      "hostile hooks changed durable operator history");
    assert.equal(fs.existsSync(path.join(root,
      "operator-event-" + first.request_id + "-450.json")), false);
    assert.equal(splitCalls, 0, "writer invoked poisoned String.split");
    assert.equal(decodeCalls, 0, "writer invoked poisoned decoder");
    assert.equal(parseCalls, 0, "writer invoked poisoned JSON.parse");
    assert.equal(stringifyCalls, 0, "writer invoked poisoned JSON.stringify");
    assert.equal(inheritedCalls, 0, "writer invoked inherited toJSON");
  } finally {
    (String.prototype as any).split = originalSplit;
    (TextDecoder.prototype as any).decode = originalDecode;
    (JSON as any).parse = originalParse;
    (JSON as any).stringify = originalStringify;
    if (originalToJSON) {
      Object.defineProperty(Object.prototype, "toJSON", originalToJSON);
    } else {
      delete (Object.prototype as any).toJSON;
    }
  }

  // The central reader must HOLD on malformed raw JSONL instead of silently
  // skipping a torn historical fulfillment the mounted queue might omit.
  fs.appendFileSync(historyPath, '{"request_id":"truncated","operator_status":\n');
  const corrupted = fs.readFileSync(historyPath);
  await assert.rejects(
    () => mark(other, "rejected", 500),
    /buy_void_operator_terminal_history_(?:json_invalid|truncated_or_noncanonical)/u,
  );
  assert.deepEqual(fs.readFileSync(historyPath), corrupted,
    "malformed operator history was changed during hold");
  assert.equal(fs.existsSync(path.join(root,
    "operator-event-" + other.request_id + "-500.json")), false);

  console.log("VOID_BUY_VOID_OPERATOR_UNDER_LOCK_TERMINAL_V1_GREEN");
  console.log("historic_fulfillment_refuses_review_reject_and_duplicate=true");
  console.log("stale_route_projection_cannot_append_after_terminal=true");
  console.log("different_request_mark_still_accepted=true");
  console.log("malformed_raw_history_holds_before_append=true");
  console.log("terminal_history_hostile_intrinsics_ignored=true");
  console.log("under_request_lock_jsonl_revalidated=true");
  console.log("actual_customer_ledger_access=false");
  console.log("payment_acceptance=false");
  console.log("presale_activation=false");
  console.log("funds_movement=false");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
