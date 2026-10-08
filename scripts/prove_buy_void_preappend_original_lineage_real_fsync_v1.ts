import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_VOID_VERIFIED_PAYMENT_ALLOCATION_HANDOFF_AUTHORITY_V1,
  VOID_BUY_VOID_VERIFIED_PAYMENT_ALLOCATION_HANDOFF_V1,
  writeBuyVoidVerifiedPaymentAllocationHandoffV1,
} from "../src/economic/buy_void_verified_payment_capacity_admission_v1.js";
import {
  classifyBuyVoidAllocationReservationLedgerV1,
} from "../src/economic/buy_void_allocation_reservation_ledger_v1.js";
import {
  classifyBuyVoidAllocationReservationHighWaterBindingV1,
  deriveBuyVoidAllocationReservationHighWaterV1,
} from "../src/economic/buy_void_allocation_reservation_high_water_v1.js";

const LEDGER_NAME = "allocation-reservations-v1.jsonl";
const HIGH_WATER_NAME = "allocation-reservation-high-water-v1.json";
const BASE_USDC =
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const RECEIVE = "0x" + "3".repeat(40);
const POOL_VOID = 10_000_000n;
const MICRO = 1_000_000n;

const shaRef = (hex: string) => "sha256:" + hex.repeat(64);
const tx = (hex: string) => "0x" + hex.repeat(64);
const address = (hex: string) => "0x" + hex.repeat(40);

const LAUNCH = Object.freeze({
  marker: "VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1",
  version: 1,
  coupled_launch_id: shaRef("a"),
  source_composition_id: shaRef("b"),
  activation_generation: tx("c"),
  generation_tip_sha256: shaRef("d"),
  activation_receipt_id: "voidbclive1_" + "e".repeat(64),
  activation_receipt_sha256: "f".repeat(64),
  expires_at_ms: 1_900_000_000_000,
});

function request(
  suffix: string,
  transaction: string,
  delivery: string,
  markedAt: number,
) {
  return Object.freeze({
    schema: "void_public_buy_void_request_v1",
    request_id: "buyvoid_" + suffix + "_" + suffix.repeat(8),
    status: "payment_submitted_pending_manual_review",
    source_chain: "base",
    payment_chain: "base",
    tx_hash: transaction,
    quoted_void: "6",
    usdc_amount: "3",
    delivery_address: delivery,
    receive_address: RECEIVE,
    usdc_contract: BASE_USDC,
    launch_authority: LAUNCH,
    created_at_ms: markedAt - 10,
  });
}

function event(
  req: ReturnType<typeof request>,
  logIndex: string,
  markedAt: number,
) {
  return Object.freeze({
    schema: "void_buy_void_verified_payment_event_v2",
    marker: "VOID_BUY_VOID_VERIFIED_PAYMENT_V2",
    request_id: req.request_id,
    operator_status: "payment_verified",
    payment_verified: true,
    payment_identity_input_complete: true,
    marked_at_ms: markedAt,
    tx_hash: req.tx_hash,
    quoted_void: req.quoted_void,
    payment_verifier: {
      chain: "base",
      transaction_hash: req.tx_hash,
      log_index: logIndex,
      block_number: "100",
      confirmations: "12",
      usdc_contract: BASE_USDC,
      from_address: req.delivery_address,
      receive_address: req.receive_address,
      delivery_address: req.delivery_address,
      amount_units: "3000000",
      requested_units: "3000000",
    },
  });
}

function jsonl(values: readonly unknown[]): string {
  return values.length
    ? values.map((value) => JSON.stringify(value)).join("\n") + "\n"
    : "";
}

type Fixture = {
  root: string;
  requestDir: string;
  ledgerRoot: string;
  highWaterRoot: string;
};

function fixture(requests: readonly unknown[]): Fixture {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-payment-allocation-handoff-v1-"),
  );
  fs.chmodSync(root, 0o700);
  const requestDir = path.join(root, "requests");
  const ledgerRoot = path.join(root, "allocation-ledger");
  const highWaterRoot = path.join(root, "allocation-high-water");
  for (const directory of [requestDir, ledgerRoot, highWaterRoot]) {
    fs.mkdirSync(directory, { mode: 0o700 });
  }
  fs.writeFileSync(
    path.join(requestDir, "requests.jsonl"),
    jsonl(requests),
    { mode: 0o600 },
  );
  fs.writeFileSync(
    path.join(requestDir, "operator-events.jsonl"),
    "",
    { mode: 0o600 },
  );
  fs.writeFileSync(
    path.join(ledgerRoot, LEDGER_NAME),
    "",
    { mode: 0o600 },
  );
  const genesis =
    deriveBuyVoidAllocationReservationHighWaterV1("");
  assert.equal(genesis.ok, true);
  fs.writeFileSync(
    path.join(highWaterRoot, HIGH_WATER_NAME),
    genesis.high_water_json,
    { mode: 0o600 },
  );
  return { root, requestDir, ledgerRoot, highWaterRoot };
}

function cleanup(value: Fixture): void {
  fs.rmSync(value.root, { recursive: true, force: true });
}

function readRows(file: string): any[] {
  const text = fs.readFileSync(file, "utf8");
  return text
    ? text.trimEnd().split("\n").map((line) => JSON.parse(line))
    : [];
}

function microText(units: bigint): string {
  const whole = units / MICRO;
  const fraction = (units % MICRO)
    .toString()
    .padStart(6, "0")
    .replace(/0+$/u, "");
  return fraction ? whole + "." + fraction : whole.toString();
}

function saleState(f: Fixture) {
  return async () => {
    const requests = readRows(path.join(f.requestDir, "requests.jsonl"));
    const quotes = new Map(
      requests.map((row) => [
        String(row.request_id),
        BigInt(String(row.quoted_void)) * MICRO,
      ]),
    );
    const verified = new Set<string>();
    for (const row of readRows(
      path.join(f.requestDir, "operator-events.jsonl"),
    )) {
      if (row.operator_status === "payment_verified") {
        verified.add(String(row.request_id));
      }
    }
    let reserved = 0n;
    for (const id of verified) reserved += quotes.get(id) || 0n;
    return {
      pool_void_total: microText(POOL_VOID * MICRO),
      allocation_reserved_void: microText(reserved),
      verified_void_total: microText(reserved),
      remaining_void: microText(POOL_VOID * MICRO - reserved),
    };
  };
}

function launchMutation() {
  let assertions = 0;
  const fn = async (
    _request: unknown,
    operation: (assertCurrent: () => void) => unknown,
  ) =>
    operation(() => {
      assertions += 1;
    });
  return {
    fn,
    get assertions() {
      return assertions;
    },
  };
}

function eventLineSha(value: unknown): string {
  return (
    "sha256:" +
    crypto
      .createHash("sha256")
      .update(Buffer.from(JSON.stringify(value) + "\n", "utf8"))
      .digest("hex")
  );
}

function allocationState(f: Fixture) {
  const ledger = fs.readFileSync(
    path.join(f.ledgerRoot, LEDGER_NAME),
    "utf8",
  );
  const highWater = fs.readFileSync(
    path.join(f.highWaterRoot, HIGH_WATER_NAME),
    "utf8",
  );
  const classified = classifyBuyVoidAllocationReservationLedgerV1(ledger);
  assert.equal(classified.ok, true);
  const bound = classifyBuyVoidAllocationReservationHighWaterBindingV1({
    ledger_jsonl: ledger,
    high_water_json: highWater,
  });
  assert.equal(bound.ok, true);
  return { ledger, classified, bound };
}

async function invoke(
  f: Fixture,
  req: ReturnType<typeof request>,
  evt: ReturnType<typeof event>,
  hooks: {
    afterPayment?: () => void;
    afterAllocation?: () => void;
  } = {},
) {
  const launch = launchMutation();
  const result = await writeBuyVoidVerifiedPaymentAllocationHandoffV1({
    event: evt,
    request: req,
    request_dir: f.requestDir,
    allocation_ledger_root: f.ledgerRoot,
    allocation_high_water_root: f.highWaterRoot,
    with_launch_authority_mutation: launch.fn,
    read_sale_state: saleState(f),
    test_only_after_payment_fsync: hooks.afterPayment || null,
    test_only_after_allocation_persist: hooks.afterAllocation || null,
  });
  return { result, launchAssertions: launch.assertions };
}

assert.equal(
  VOID_BUY_VOID_VERIFIED_PAYMENT_ALLOCATION_HANDOFF_V1,
  "VOID_BUY_VOID_VERIFIED_PAYMENT_ALLOCATION_HANDOFF_V1",
);
assert.equal(
  VOID_BUY_VOID_VERIFIED_PAYMENT_ALLOCATION_HANDOFF_AUTHORITY_V1
    .same_capacity_serialization_domain,
  true,
);
assert.equal(
  VOID_BUY_VOID_VERIFIED_PAYMENT_ALLOCATION_HANDOFF_AUTHORITY_V1
    .runtime_integration,
  false,
);
assert.equal(
  VOID_BUY_VOID_VERIFIED_PAYMENT_ALLOCATION_HANDOFF_AUTHORITY_V1
    .production_gate_ready,
  false,
);

// First durable payment and allocation: exactly one of each, payment before
// allocation, exact event-line digest, and one sidecar.
{
  const req = request("a", tx("1"), address("2"), 1_800_000_000_010);
  const evt = event(req, "7", 1_800_000_000_020);
  const f = fixture([req]);
  try {
    const first = await invoke(f, req, evt);
    assert.equal(first.result.idempotent, false);
    assert.equal(first.result.payment_event_appended, true);
    assert.equal(first.launchAssertions, 1);
    assert.equal(
      first.result.allocation.payment_verified_event_sha256,
      eventLineSha(evt),
    );
    assert.match(
      first.result.allocation.allocation_record_id,
      /^voidalloc1_[0-9a-f]{64}$/u,
    );
    assert.equal(
      readRows(path.join(f.requestDir, "operator-events.jsonl")).length,
      1,
    );
    const state = allocationState(f);
    assert.equal(state.classified.record_count, 1);
    assert.equal(
      state.classified.records[0].payment_verified_event_sha256,
      eventLineSha(evt),
    );
    assert.equal(
      fs.existsSync(
        path.join(
          f.requestDir,
          "operator-event-" + req.request_id + "-" +
            String(evt.marked_at_ms) + ".json",
        ),
      ),
      true,
    );

    const replay = await invoke(f, req, evt);
    assert.equal(replay.result.idempotent, true);
    assert.equal(replay.result.payment_event_appended, false);
    assert.equal(replay.launchAssertions, 0);
    assert.equal(
      replay.result.allocation.allocation_record_id,
      first.result.allocation.allocation_record_id,
    );
    assert.equal(
      readRows(path.join(f.requestDir, "operator-events.jsonl")).length,
      1,
    );
    assert.equal(allocationState(f).classified.record_count, 1);
  } finally {
    cleanup(f);
  }
}

// Crash cut: payment row fsynced, allocation not started. Exact replay repairs
// the missing allocation without another payment row or current launch lease.
{
  const req = request("b", tx("4"), address("5"), 1_800_000_001_010);
  const evt = event(req, "8", 1_800_000_001_020);
  const f = fixture([req]);
  try {
    await assert.rejects(
      () =>
        invoke(f, req, evt, {
          afterPayment() {
            throw new Error("synthetic_crash_after_payment_fsync");
          },
        }),
      /synthetic_crash_after_payment_fsync/u,
    );
    assert.equal(
      readRows(path.join(f.requestDir, "operator-events.jsonl")).length,
      1,
    );
    assert.equal(allocationState(f).classified.record_count, 0);
    assert.equal(
      fs.existsSync(
        path.join(
          f.requestDir,
          "operator-event-" + req.request_id + "-" +
            String(evt.marked_at_ms) + ".json",
        ),
      ),
      false,
    );

    const recovered = await invoke(f, req, evt);
    assert.equal(recovered.result.idempotent, true);
    assert.equal(recovered.result.payment_event_appended, false);
    assert.equal(recovered.launchAssertions, 0);
    assert.equal(
      readRows(path.join(f.requestDir, "operator-events.jsonl")).length,
      1,
    );
    assert.equal(allocationState(f).classified.record_count, 1);
  } finally {
    cleanup(f);
  }
}

// Crash cut: payment and allocation durable, sidecar/public result missing.
// Replay must remain one payment + one allocation and only repair sidecar.
{
  const req = request("c", tx("6"), address("7"), 1_800_000_002_010);
  const evt = event(req, "9", 1_800_000_002_020);
  const f = fixture([req]);
  try {
    await assert.rejects(
      () =>
        invoke(f, req, evt, {
          afterAllocation() {
            throw new Error(
              "synthetic_crash_after_allocation_before_sidecar",
            );
          },
        }),
      /synthetic_crash_after_allocation_before_sidecar/u,
    );
    assert.equal(
      readRows(path.join(f.requestDir, "operator-events.jsonl")).length,
      1,
    );
    const beforeReplay = allocationState(f);
    assert.equal(beforeReplay.classified.record_count, 1);
    const recordId = beforeReplay.classified.records[0].record_id;

    const recovered = await invoke(f, req, evt);
    assert.equal(recovered.result.idempotent, true);
    assert.equal(recovered.result.payment_event_appended, false);
    assert.equal(recovered.launchAssertions, 0);
    assert.equal(
      recovered.result.allocation.allocation_record_id,
      recordId,
    );
    assert.equal(
      readRows(path.join(f.requestDir, "operator-events.jsonl")).length,
      1,
    );
    assert.equal(allocationState(f).classified.record_count, 1);
  } finally {
    cleanup(f);
  }
}

// Existing verified payment with no allocation blocks a different new payment
// BEFORE the second payment row can be appended.
{
  const reqA = request("d", tx("8"), address("9"), 1_800_000_003_010);
  const evtA = event(reqA, "10", 1_800_000_003_020);
  const reqB = request("e", tx("a"), address("b"), 1_800_000_004_010);
  const evtB = event(reqB, "11", 1_800_000_004_020);
  const f = fixture([reqA, reqB]);
  try {
    fs.writeFileSync(
      path.join(f.requestDir, "operator-events.jsonl"),
      jsonl([evtA]),
      { mode: 0o600 },
    );
    await assert.rejects(
      () => invoke(f, reqB, evtB),
      /buy_void_verified_payment_allocation_prior_verified_gap/u,
    );
    const events = readRows(
      path.join(f.requestDir, "operator-events.jsonl"),
    );
    assert.equal(events.length, 1);
    assert.equal(events[0].request_id, reqA.request_id);
    assert.equal(allocationState(f).classified.record_count, 0);
  } finally {
    cleanup(f);
  }
}

console.log(
  "VOID_BUY_VOID_VERIFIED_PAYMENT_ALLOCATION_HANDOFF_V1_PROOF_GREEN",
);
console.log("real_temp_filesystem_fsync_path_exercised=true");
console.log("payment_before_allocation_order_proven=true");
console.log("payment_fsync_crash_recovery_exactly_once=true");
console.log("allocation_before_sidecar_crash_replay_exactly_once=true");
console.log("prior_verified_allocation_gap_blocks_new_payment=true");
console.log("same_capacity_serialization_domain=true");
console.log("duplicate_payment_reappend=false");
console.log("runtime_integration=false");
console.log("protected_high_water_custody_proven=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");



// PRE-APPEND ORIGINAL BUYER + RECEIPT NEGATIVE REGRESSIONS.
// These call the REAL handoff with disposable private OS-temp ledgers. A
// rejection AFTER payment fsync is a security failure, not an expected hold.
async function requirePreappendHold(
  label: string,
  req: ReturnType<typeof request>,
  evt: ReturnType<typeof event>,
  rows: readonly unknown[],
  expected: RegExp,
  allowCorrectRetry: boolean,
  correctRequest: ReturnType<typeof request>,
  correctEvent: ReturnType<typeof event>,
): Promise<void> {
  const f = fixture(rows);
  let fsyncReached = false;
  try {
    await assert.rejects(
      () => invoke(f, req, evt, {
        afterPayment() { fsyncReached = true; },
      }),
      expected,
      label + ": unexpected preappend disposition",
    );
    assert.equal(fsyncReached, false, label + ": payment fsync hook reached");
    assert.equal(
      fs.readFileSync(path.join(f.requestDir, "operator-events.jsonl")).length,
      0,
      label + ": irreversible payment row appended",
    );
    assert.equal(
      allocationState(f).classified.record_count,
      0,
      label + ": an allocation was reserved",
    );
    assert.equal(
      fs.existsSync(
        path.join(f.requestDir, "operator-event-" +
          req.request_id + "-" + String(evt.marked_at_ms) + ".json"),
      ),
      false,
      label + ": payment sidecar was published",
    );
    // Even after a malicious input HOLD, the *original valid payment* must
    // still pass a fresh admission and create exactly one payment+allocation.
    if (allowCorrectRetry) {
      const accepted = await invoke(f, correctRequest, correctEvent);
      assert.equal(accepted.result.payment_event_appended, true, label);
      assert.equal(accepted.result.idempotent, false, label);
      assert.equal(
        readRows(path.join(f.requestDir, "operator-events.jsonl")).length,
        1,
        label,
      );
      assert.equal(allocationState(f).classified.record_count, 1, label);
      const replay = await invoke(f, correctRequest, correctEvent);
      assert.equal(replay.result.payment_event_appended, false, label);
      assert.equal(replay.result.idempotent, true, label);
      assert.equal(
        readRows(path.join(f.requestDir, "operator-events.jsonl")).length,
        1,
        label,
      );
    }
  } finally {
    cleanup(f);
  }
}

{
  const req = request("d", tx("8"), address("9"), 1_800_000_005_010);
  const evt = event(req, "13", 1_800_000_005_020);
  await requirePreappendHold(
    "forged_verified_receipt_from_wallet",
    req,
    { ...evt, payment_verifier: {
      ...evt.payment_verifier,
      from_address: address("1"),
    }},
    [req],
    /buy_void_preappend_verified_original_replay_lineage_invalid/u,
    true, req, evt,
  );
}
{
  const original = request("e", tx("9"), address("a"), 1_800_000_006_010);
  const evt = event(original, "14", 1_800_000_006_020);
  await requirePreappendHold(
    "caller_delivery_wallet_not_original",
    { ...original, delivery_address: address("1") },
    evt, [original],
    /buy_void_preappend_caller_original_delivery_address_mismatch/u,
    true, original, evt,
  );
}
{
  const original = request("f", tx("a"), address("b"), 1_800_000_007_010);
  const evt = event(original, "15", 1_800_000_007_020);
  await requirePreappendHold(
    "caller_launch_generation_not_original",
    { ...original, launch_authority: {
      ...LAUNCH, activation_generation: tx("1"),
    }},
    evt, [original],
    /buy_void_preappend_caller_original_launch_authority_mismatch/u,
    true, original, evt,
  );
}
{
  const original = request("a", tx("b"), address("c"), 1_800_000_008_010);
  const evt = event(original, "16", 1_800_000_008_020);
  const invalidFirst = { ...original, launch_authority: undefined };
  await requirePreappendHold(
    "later_snapshot_cannot_upgrade_missing_initial_launch",
    original, evt, [invalidFirst, original],
    /buy_void_preappend_verified_original_replay_lineage_invalid/u,
    false, original, evt,
  );
}
{
  const original = request("b", tx("c"), address("d"), 1_800_000_009_010);
  const evt = event(original, "17", 1_800_000_009_020);
  const invalidFirst = { ...original, usdc_contract: undefined };
  await requirePreappendHold(
    "later_snapshot_cannot_upgrade_missing_original_native_token",
    original, evt, [invalidFirst, original],
    /buy_void_preappend_verified_original_replay_lineage_invalid/u,
    false, original, evt,
  );
}

// The capacity, duplicate, and exact crash/idempotent recovery positives
// above continue to test real fsync ordering; no live operator file is read.
const sourceBytes = fs.readFileSync(
  path.join(process.cwd(),
    "src/economic/buy_void_verified_payment_capacity_admission_v1.ts"),
);
const reviewedGitBlob = crypto.createHash("sha1")
  .update(Buffer.from("blob " + sourceBytes.length + "\0", "utf8"))
  .update(sourceBytes).digest("hex");
assert.equal(
  reviewedGitBlob,
  "8aa451be5663edb75ec860ee850ac473c1b6b10b",
  "preappend handoff source identity changed without review",
);
const source = sourceBytes.toString("utf8");
const guardPos = source.indexOf(
  "assertBuyVoidVerifiedPaymentPreappendOriginalLineageV1({\n                  request",
);
const appendPos = source.indexOf(
  "appendPaymentVerifiedEventDurableV1(\n                  authority.operator_ledger",
);
assert.ok(guardPos > 0 && appendPos > guardPos,
  "strict original buyer guard must precede irreversible payment append");
console.log("VOID_BUY_VOID_PREAPPEND_ORIGINAL_LINEAGE_REAL_FSYNC_V1_GREEN");
console.log("valid_payment_allocation_and_replay_remain_exactly_once=true");
console.log("forged_receipt_and_caller_lineage_rejected_before_payment_fsync=true");
console.log("first_original_native_token_and_launch_required=true");
console.log("operator_payment_jsonl_unchanged_on_malicious_input=true");
console.log("production_payment_ingress_enabled=false");
console.log("runtime_integration=false");
console.log("funds_moved=false");
