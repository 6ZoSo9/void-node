import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { deriveBuyVoidAllocationReservationHighWaterV1 } from
  "../src/economic/buy_void_allocation_reservation_high_water_v1.js";
import { classifyBuyVoidVerifiedAllocationReplayBindingV1 } from
  "../src/economic/buy_void_verified_allocation_replay_binding_v1.js";
import { writeBuyVoidVerifiedPaymentAllocationHandoffV1 } from
  "../src/economic/buy_void_verified_payment_capacity_admission_v1.js";

const BASE_USDC =
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const RECEIVE = "0x" + "3".repeat(40);
const WALLET = "0x" + "2".repeat(40);
const WRONG_WALLET = "0x" + "9".repeat(40);
const TX = "0x" + "1".repeat(64);
const REQUEST_ID = "buyvoid_h_" + "a".repeat(8);
const VERIFIED_AT = 1_800_000_000_020;
const LEDGER = "allocation-reservations-v1.jsonl";
const HIGH_WATER = "allocation-reservation-high-water-v1.json";
const QUOTE = "6";
const POOL = "10000000";

const launch = Object.freeze({
  marker: "VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1",
  version: 1,
  coupled_launch_id: "sha256:" + "a".repeat(64),
  source_composition_id: "sha256:" + "b".repeat(64),
  activation_generation: "0x" + "c".repeat(64),
  generation_tip_sha256: "sha256:" + "d".repeat(64),
  activation_receipt_id: "voidbclive1_" + "e".repeat(64),
  activation_receipt_sha256: "f".repeat(64),
  expires_at_ms: 1_900_000_000_000,
});

const request = Object.freeze({
  schema: "void_public_buy_void_request_v1",
  request_id: REQUEST_ID,
  status: "payment_submitted_pending_manual_review",
  source_chain: "base",
  payment_chain: "base",
  tx_hash: TX,
  quoted_void: QUOTE,
  usdc_amount: "3",
  delivery_address: WALLET,
  receive_address: RECEIVE,
  usdc_contract: BASE_USDC,
  launch_authority: launch,
  created_at_ms: VERIFIED_AT - 10,
});

const correctEvent = Object.freeze({
  schema: "void_buy_void_verified_payment_event_v2",
  marker: "VOID_BUY_VOID_VERIFIED_PAYMENT_V2",
  request_id: REQUEST_ID,
  operator_status: "payment_verified",
  payment_verified: true,
  payment_identity_input_complete: true,
  marked_at_ms: VERIFIED_AT,
  tx_hash: TX,
  quoted_void: QUOTE,
  payment_verifier: {
    chain: "base",
    transaction_hash: TX,
    log_index: "7",
    block_number: "100",
    confirmations: "12",
    usdc_contract: BASE_USDC,
    from_address: WALLET,
    receive_address: RECEIVE,
    delivery_address: WALLET,
    amount_units: "3000000",
    requested_units: "3000000",
  },
});

type Fixture = {
  root: string;
  requestDir: string;
  ledgerRoot: string;
  highWaterRoot: string;
};

function readRows(file: string): any[] {
  const text = fs.readFileSync(file, "utf8");
  return text
    ? text.trimEnd().split("\n").filter(Boolean)
        .map((line) => JSON.parse(line))
    : [];
}

function setup(): Fixture {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-preappend-hardening-"),
  );
  fs.chmodSync(root, 0o700);
  const requestDir = path.join(root, "requests");
  const ledgerRoot = path.join(root, "ledger");
  const highWaterRoot = path.join(root, "high-water");
  for (const dir of [requestDir, ledgerRoot, highWaterRoot]) {
    fs.mkdirSync(dir, { mode: 0o700 });
  }
  fs.writeFileSync(
    path.join(requestDir, "requests.jsonl"),
    JSON.stringify(request) + "\n",
    { mode: 0o600 },
  );
  fs.writeFileSync(
    path.join(requestDir, "operator-events.jsonl"),
    "",
    { mode: 0o600 },
  );
  fs.writeFileSync(
    path.join(ledgerRoot, LEDGER),
    "",
    { mode: 0o600 },
  );
  const genesis = deriveBuyVoidAllocationReservationHighWaterV1("");
  assert.equal(genesis.ok, true);
  fs.writeFileSync(
    path.join(highWaterRoot, HIGH_WATER),
    genesis.high_water_json,
    { mode: 0o600 },
  );
  return { root, requestDir, ledgerRoot, highWaterRoot };
}

function state(fixture: Fixture) {
  return async () => {
    const verified = readRows(
      path.join(fixture.requestDir, "operator-events.jsonl"),
    ).filter((row) => row.operator_status === "payment_verified").length;
    const value = 6 * verified;
    return {
      pool_void_total: POOL,
      allocation_reserved_void: String(value),
      verified_void_total: String(value),
      remaining_void: String(10_000_000 - value),
    };
  };
}

async function invoke(
  fixture: Fixture,
  candidateRequest: any,
  candidateEvent: any,
  mark = { appendReached: false },
) {
  return writeBuyVoidVerifiedPaymentAllocationHandoffV1({
    request: candidateRequest,
    event: candidateEvent,
    request_dir: fixture.requestDir,
    allocation_ledger_root: fixture.ledgerRoot,
    allocation_high_water_root: fixture.highWaterRoot,
    with_launch_authority_mutation: async (
      _request,
      operation,
    ) => operation(() => {}),
    read_sale_state: state(fixture),
    test_only_after_payment_fsync: () => {
      mark.appendReached = true;
    },
  });
}

function sidecarPath(fixture: Fixture): string {
  return path.join(
    fixture.requestDir,
    `operator-event-${REQUEST_ID}-${VERIFIED_AT}.json`,
  );
}

async function provePositive(): Promise<void> {
  const fixture = setup();
  try {
    const mark = { appendReached: false };
    const result = await invoke(
      fixture,
      request,
      correctEvent,
      mark,
    );
    assert.equal(result.ok, true);
    assert.equal(mark.appendReached, true);
    assert.equal(result.payment_event_appended, true);
    assert.equal(readRows(
      path.join(fixture.requestDir, "operator-events.jsonl"),
    ).length, 1);
    const allocation = fs.readFileSync(
      path.join(fixture.ledgerRoot, LEDGER),
    );
    assert.ok(allocation.length > 0);
    const replay =
      classifyBuyVoidVerifiedAllocationReplayBindingV1({
        request_id: REQUEST_ID,
        requests_jsonl: fs.readFileSync(
          path.join(fixture.requestDir, "requests.jsonl"),
        ),
        operator_events_jsonl: fs.readFileSync(
          path.join(fixture.requestDir, "operator-events.jsonl"),
        ),
        allocation_jsonl: allocation,
      });
    assert.equal(replay.ok, true);
    assert.equal(replay.status, "allocation_present");
    assert.equal(fs.existsSync(sidecarPath(fixture)), true);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
}

async function provePreappendHold(
  label: string,
  candidateRequest: any,
  candidateEvent: any,
  expectedReason: string,
): Promise<void> {
  const fixture = setup();
  const mark = { appendReached: false };
  try {
    let reason = "";
    try {
      await invoke(
        fixture,
        candidateRequest,
        candidateEvent,
        mark,
      );
    } catch (error) {
      reason = error instanceof Error
        ? error.message
        : String(error);
    }
    assert.equal(reason, expectedReason, label);
    assert.equal(
      mark.appendReached,
      false,
      label + ": must HOLD before payment fsync",
    );
    assert.equal(
      readRows(
        path.join(fixture.requestDir, "operator-events.jsonl"),
      ).length,
      0,
      label + ": operator ledger must remain empty",
    );
    assert.equal(
      fs.readFileSync(
        path.join(fixture.ledgerRoot, LEDGER),
        "utf8",
      ),
      "",
      label + ": allocation ledger must remain empty",
    );
    assert.equal(
      fs.existsSync(sidecarPath(fixture)),
      false,
      label + ": sidecar must not exist",
    );
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
}

async function prepareExistingSidecar(): Promise<Fixture> {
  const fixture = setup();
  await invoke(fixture, request, correctEvent);
  assert.equal(fs.existsSync(sidecarPath(fixture)), true);
  return fixture;
}

function isTargetFd(fd: number, target: string): boolean {
  try {
    const linked = fs.readlinkSync("/proc/self/fd/" + String(fd));
    return path.resolve(linked.replace(/ \(deleted\)$/u, "")) ===
      path.resolve(target);
  } catch {
    return false;
  }
}

async function proveGrowthBound(): Promise<void> {
  const fixture = await prepareExistingSidecar();
  const target = sidecarPath(fixture);
  const originalReadSync = fs.readSync;
  let mutated = false;
  let consumed = 0;
  let maxRequested = 0;
  try {
    (fs as any).readSync = (
      fd: number,
      buffer: Buffer,
      offset: number,
      length: number,
      position: number | null,
    ) => {
      const targetFd = isTargetFd(fd, target);
      if (targetFd) maxRequested = Math.max(maxRequested, length);
      const read = (originalReadSync as any)(
        fd,
        buffer,
        offset,
        length,
        position,
      ) as number;
      if (targetFd) {
        consumed += read;
        if (!mutated && read > 0) {
          mutated = true;
          fs.appendFileSync(target, Buffer.alloc(2 * 1024 * 1024, 0x78));
        }
      }
      return read;
    };

    let reason = "";
    try {
      await invoke(fixture, request, correctEvent);
    } catch (error) {
      reason = error instanceof Error
        ? error.message
        : String(error);
    }
    assert.equal(
      reason,
      "buy_void_verified_payment_capacity_sidecar_conflict",
    );
    assert.equal(mutated, true);
    const expectedBytes =
      Buffer.byteLength(JSON.stringify(correctEvent, null, 2), "utf8");
    assert.ok(maxRequested <= expectedBytes + 1);
    assert.ok(consumed <= expectedBytes + 1);
  } finally {
    (fs as any).readSync = originalReadSync;
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
}

async function proveSameSizePathReplacement(): Promise<void> {
  const fixture = await prepareExistingSidecar();
  const target = sidecarPath(fixture);
  const originalReadSync = fs.readSync;
  let replaced = false;
  try {
    (fs as any).readSync = (
      fd: number,
      buffer: Buffer,
      offset: number,
      length: number,
      position: number | null,
    ) => {
      const targetFd = isTargetFd(fd, target);
      const read = (originalReadSync as any)(
        fd,
        buffer,
        offset,
        length,
        position,
      ) as number;
      if (targetFd && !replaced && read > 0) {
        replaced = true;
        const original = fs.readFileSync(target);
        const moved = target + ".moved";
        fs.renameSync(target, moved);
        const replacement = Buffer.from(original);
        replacement[0] = replacement[0] === 0x7b ? 0x5b : 0x7b;
        fs.writeFileSync(target, replacement, { mode: 0o600 });
      }
      return read;
    };

    let reason = "";
    try {
      await invoke(fixture, request, correctEvent);
    } catch (error) {
      reason = error instanceof Error
        ? error.message
        : String(error);
    }
    assert.equal(
      reason,
      "buy_void_verified_payment_capacity_sidecar_conflict",
    );
    assert.equal(replaced, true);
  } finally {
    (fs as any).readSync = originalReadSync;
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
}

async function proveCallerEventToJsonNotInvoked(): Promise<void> {
  const fixture = setup();
  let serializationCount = 0;
  const candidate = {
    ...correctEvent,
    payment_verifier: {
      ...correctEvent.payment_verifier,
    },
  };
  Object.defineProperty(candidate, "toJSON", {
    enumerable: false,
    configurable: false,
    value() {
      serializationCount += 1;
      return structuredClone(correctEvent);
    },
  });

  try {
    const result = await invoke(fixture, request, candidate);
    assert.equal(result.ok, true);
    assert.equal(
      serializationCount,
      0,
      "caller payment event toJSON must not execute during detached snapshot",
    );
    const durable = fs.readFileSync(
      path.join(fixture.requestDir, "operator-events.jsonl"),
    );
    assert.equal(
      durable.equals(
        Buffer.from(JSON.stringify(correctEvent) + "\n", "utf8"),
      ),
      true,
      "durable payment row must equal the validated canonical event bytes",
    );
    const allocation = fs.readFileSync(
      path.join(fixture.ledgerRoot, LEDGER),
    );
    const replay =
      classifyBuyVoidVerifiedAllocationReplayBindingV1({
        request_id: REQUEST_ID,
        requests_jsonl: fs.readFileSync(
          path.join(fixture.requestDir, "requests.jsonl"),
        ),
        operator_events_jsonl: durable,
        allocation_jsonl: allocation,
      });
    assert.equal(replay.ok, true);
    assert.equal(replay.status, "allocation_present");
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
}

await provePositive();
await proveCallerEventToJsonNotInvoked();

await provePreappendHold(
  "forged_verifier_buyer",
  request,
  {
    ...correctEvent,
    payment_verifier: {
      ...correctEvent.payment_verifier,
      from_address: WRONG_WALLET,
    },
  },
  "buy_void_verified_payment_preappend_lineage_" +
    "preappend_strict_replay_verified_event_destination_or_amount_mismatch",
);

await provePreappendHold(
  "altered_caller_delivery",
  {
    ...request,
    delivery_address: WRONG_WALLET,
  },
  correctEvent,
  "buy_void_verified_payment_preappend_lineage_" +
    "preappend_caller_delivery_address_mismatch",
);

await proveGrowthBound();
await proveSameSizePathReplacement();

console.log("VOID_BUY_VOID_PAYMENT_ALLOCATION_PREAPPEND_HARDENING_V1_GREEN");
console.log("valid_payment_append_allocation_sidecar=true");
console.log("caller_payment_event_toJSON_not_invoked=true");
console.log("validated_payment_jsonl_equals_fsynced_bytes=true");
console.log("forged_buyer_holds_before_payment_fsync=true");
console.log("altered_caller_holds_before_payment_fsync=true");
console.log("operator_jsonl_unchanged_on_preappend_hold=true");
console.log("allocation_jsonl_unchanged_on_preappend_hold=true");
console.log("sidecar_read_bound_to_expected_size_plus_one=true");
console.log("same_size_sidecar_path_replacement_rejected=true");
console.log("real_customer_ledger_access=false");
console.log("runtime_mounted=false");
console.log("wallet_or_signer_access=false");
console.log("funds_moved=false");
