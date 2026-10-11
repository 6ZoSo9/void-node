// Source-only actual writer regression: terminal status must be monotonic
// inside the SAME per-request lock that protects the operator-event append.
// All state is disposable synthetic JSONL. No payment/signer/service access.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
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
  console.log("under_request_lock_jsonl_revalidated=true");
  console.log("actual_customer_ledger_access=false");
  console.log("payment_acceptance=false");
  console.log("presale_activation=false");
  console.log("funds_movement=false");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
