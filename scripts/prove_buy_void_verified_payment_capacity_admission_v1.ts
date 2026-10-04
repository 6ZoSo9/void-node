import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_VOID_VERIFIED_PAYMENT_CAPACITY_ADMISSION_AUTHORITY_V1,
  classifyBuyVoidVerifiedPaymentCapacityAdmissionV1,
  writeBuyVoidOperatorEventWithCapacityAdmissionV1,
} from "../src/economic/buy_void_verified_payment_capacity_admission_v1.js";

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-capacity-admission-"),
);
try {
  fs.chmodSync(root, 0o700);
  const requests = [
    { request_id: "buyvoid_a_aaaaaaaa", quoted_void: 6 },
    { request_id: "buyvoid_b_bbbbbbbb", quoted_void: 6 },
    { request_id: "buyvoid_c_cccccccc", quoted_void: 4 },
    { request_id: "buyvoid_d_dddddddd", quoted_void: 1 },
  ];
  const requestsPath = path.join(root, "requests.jsonl");
  fs.writeFileSync(
    requestsPath,
    requests.map((request) => JSON.stringify(request)).join("\n") + "\n",
    { mode: 0o600 },
  );
  const eventsPath = path.join(root, "operator-events.jsonl");
  const readEvents = async () => {
    if (!fs.existsSync(eventsPath)) return [];
    const out: any[] = [];
    for (const line of fs
      .readFileSync(eventsPath, "utf8")
      .split(/\n+/u)
      .filter(Boolean)) {
      try {
        out.push(JSON.parse(line));
      } catch {
        // Mirror the legacy runtime projection. Capacity authority must not
        // rely on this lenient reader to detect ledger corruption.
      }
    }
    return out;
  };
  const readSaleState = async () => {
    const events = await readEvents();
    const verified = new Set(
      events
        .filter((event) => event.operator_status === "payment_verified")
        .map((event) => String(event.request_id)),
    );
    const verifiedVoid = requests.reduce(
      (sum, request) =>
        sum + (verified.has(request.request_id) ? Number(request.quoted_void) : 0),
      0,
    );
    const pool = 10;
    const reserved = Math.min(pool, verifiedVoid);
    return {
      pool_void_total: pool,
      allocation_reserved_void: reserved,
      verified_void_total: verifiedVoid,
      remaining_void: Math.max(0, pool - reserved),
    };
  };

  assert.equal(
    classifyBuyVoidVerifiedPaymentCapacityAdmissionV1({
      sale_state: await readSaleState(),
      quoted_void: 10,
    }).ready,
    true,
  );
  const over = classifyBuyVoidVerifiedPaymentCapacityAdmissionV1({
    sale_state: {
      pool_void_total: 10,
      allocation_reserved_void: 6,
      verified_void_total: 6,
      remaining_void: 4,
    },
    quoted_void: 4.000001,
  });
  assert.equal(over.ready, false);
  assert.equal(over.reason, "buy_void_verified_payment_capacity_exceeded");
  assert.equal(
    classifyBuyVoidVerifiedPaymentCapacityAdmissionV1({
      sale_state: {
        pool_void_total: 10,
        allocation_reserved_void: 10,
        verified_void_total: 12,
        remaining_void: 0,
      },
      quoted_void: 1,
    }).reason,
    "buy_void_verified_payment_capacity_state_invalid",
  );

  let activeMutations = 0;
  let peakMutations = 0;
  let mutationCalls = 0;
  const withLaunchAuthorityMutation = async (
    _request: any,
    operation: () => any,
  ) => {
    mutationCalls += 1;
    activeMutations += 1;
    peakMutations = Math.max(peakMutations, activeMutations);
    try {
      await new Promise((resolve) => setTimeout(resolve, 25));
      return operation();
    } finally {
      activeMutations -= 1;
    }
  };

  const paymentSeed = new Map([
    [requests[0].request_id, 101],
    [requests[1].request_id, 102],
    [requests[2].request_id, 103],
    [requests[3].request_id, 104],
  ]);
  const eventFor = (
    request: { request_id: string; quoted_void: number },
    markedAt: number,
    seed = paymentSeed.get(request.request_id) || 999,
  ) => {
    const txHash =
      "0x" + String(seed).padStart(64, "0").slice(-64);
    return {
      schema: "void_buy_void_operator_mark_v1",
      ok: true,
      request_id: request.request_id,
      operator_status: "payment_verified",
      marked_at_ms: markedAt,
      tx_hash: txHash,
      payment_verified: true,
      payment_verifier: {
        chain: "base",
        transaction_hash: txHash,
        log_index: "0",
      },
      quoted_void: request.quoted_void,
    };
  };
  const write = (
    request: { request_id: string; quoted_void: number },
    markedAt: number,
  ) =>
    writeBuyVoidOperatorEventWithCapacityAdmissionV1({
      event: eventFor(request, markedAt),
      request,
      request_dir: root,
      with_launch_authority_mutation: withLaunchAuthorityMutation,
      read_sale_state: readSaleState,
    });

  const race = await Promise.allSettled([
    write(requests[0], 1),
    write(requests[1], 2),
  ]);
  assert.equal(race.filter((value) => value.status === "fulfilled").length, 1);
  assert.equal(race.filter((value) => value.status === "rejected").length, 1);
  const rejection = race.find((value) => value.status === "rejected");
  assert.match(
    String(
      rejection && rejection.status === "rejected"
        ? rejection.reason?.message || rejection.reason
        : "",
    ),
    /buy_void_verified_payment_capacity_exceeded/u,
  );
  assert.equal(peakMutations, 1);
  assert.equal(mutationCalls, 1);
  const raceVerified = (await readEvents()).filter(
    (event) => event.operator_status === "payment_verified",
  );
  assert.equal(raceVerified.length, 1);
  assert.match(
    String(raceVerified[0].canonical_payment_identity || ""),
    /^voidpay1:base:0x[0-9a-f]{64}:0$/u,
  );
  const winningRequest = requests.find(
    (request) => request.request_id === raceVerified[0].request_id,
  );
  assert.ok(winningRequest);
  const winningSeed = paymentSeed.get(winningRequest.request_id);
  assert.ok(winningSeed);

  await assert.rejects(
    () =>
      writeBuyVoidOperatorEventWithCapacityAdmissionV1({
        event: eventFor(requests[3], 20, winningSeed),
        request: requests[3],
        request_dir: root,
        with_launch_authority_mutation: withLaunchAuthorityMutation,
        read_sale_state: readSaleState,
      }),
    /buy_void_verified_payment_identity_already_claimed/u,
  );
  await assert.rejects(
    () =>
      writeBuyVoidOperatorEventWithCapacityAdmissionV1({
        event: eventFor(winningRequest, 21, 901),
        request: winningRequest,
        request_dir: root,
        with_launch_authority_mutation: withLaunchAuthorityMutation,
        read_sale_state: readSaleState,
      }),
    /buy_void_verified_payment_identity_request_conflict/u,
  );

  let state = await readSaleState();
  assert.equal(state.allocation_reserved_void, 6);
  assert.equal(state.remaining_void, 4);

  const four = await write(requests[2], 3);
  assert.equal(four.idempotent, false);
  state = await readSaleState();
  assert.equal(state.allocation_reserved_void, 10);
  assert.equal(state.remaining_void, 0);

  await assert.rejects(
    () => write(requests[3], 4),
    /buy_void_verified_payment_capacity_exceeded/u,
  );
  assert.equal(mutationCalls, 2);

  const duplicate = await write(requests[2], 5);
  assert.equal(duplicate.idempotent, true);
  assert.equal(mutationCalls, 2);
  const verifiedAfterDuplicate = (await readEvents()).filter(
    (event) => event.operator_status === "payment_verified",
  );
  assert.equal(verifiedAfterDuplicate.length, 2);
  const requestCEvents = verifiedAfterDuplicate.filter(
    (event) => event.request_id === requests[2].request_id,
  );
  assert.equal(requestCEvents.length, 1);
  assert.match(
    String(requestCEvents[0].canonical_payment_identity || ""),
    /^voidpay1:base:0x[0-9a-f]{64}:0$/u,
  );

  const reviewEvent = {
    schema: "void_buy_void_operator_mark_v1",
    ok: true,
    request_id: requests[2].request_id,
    operator_status: "reviewed",
    marked_at_ms: 6,
    quoted_void: requests[2].quoted_void,
  };
  const reviewed = await writeBuyVoidOperatorEventWithCapacityAdmissionV1({
    event: reviewEvent,
    request: requests[2],
    request_dir: root,
    with_launch_authority_mutation: withLaunchAuthorityMutation,
    read_sale_state: readSaleState,
  });
  assert.equal(reviewed.ok, true);
  assert.equal(mutationCalls, 2);
  state = await readSaleState();
  assert.equal(state.allocation_reserved_void, 10);

  const validEventBytes = fs.readFileSync(eventsPath);
  fs.appendFileSync(
    eventsPath,
    JSON.stringify({
      schema: "void_buy_void_operator_mark_v1",
      request_id: requests[3].request_id,
      operator_status: "payment_verified",
      payment_verified: true,
      quoted_void: requests[3].quoted_void,
    }) + "\n",
  );
  await assert.rejects(
    () => write(requests[3], 7),
    /buy_void_verified_payment_identity_history_incomplete/u,
  );
  fs.writeFileSync(eventsPath, validEventBytes);

  fs.appendFileSync(eventsPath, "{malformed-json}\n");
  assert.equal(
    (await readEvents()).filter(
      (event) => event.operator_status === "payment_verified",
    ).length,
    2,
    "legacy projection intentionally skips malformed row",
  );
  await assert.rejects(
    () => write(requests[3], 7),
    /buy_void_verified_payment_capacity_operator_events_json_invalid/u,
  );
  assert.equal(mutationCalls, 2);

  for (const [key, value] of Object.entries(
    VOID_BUY_VOID_VERIFIED_PAYMENT_CAPACITY_ADMISSION_AUTHORITY_V1,
  )) {
    if (
      [
        "source_contract",
        "request_directory_read",
        "request_directory_write",
        "serialized_capacity_admission",
        "strict_ledger_recount",
        "duplicate_payment_identity_verification",
      ].includes(key)
    ) {
      assert.equal(value, true, key);
    } else {
      assert.equal(value, false, key);
    }
  }

  console.log("VOID_BUY_VOID_VERIFIED_PAYMENT_CAPACITY_ADMISSION_V1_GREEN");
  console.log("concurrent_near_sellout_double_reservation=false");
  console.log("capacity_lock_spans_payment_verified_append=true");
  console.log("exact_remaining_capacity_admitted=true");
  console.log("capacity_exhaustion_rejected=true");
  console.log("malformed_authoritative_ledger_fails_closed=true");
  console.log("legacy_lenient_projection_is_not_capacity_authority=true");
  console.log("duplicate_request_reverification_idempotent=true");
  console.log("duplicate_payment_identity_guard_proven=true");
  console.log("canonical_payment_identity_source_chain_tx_log_index=true");
  console.log("cross_request_payment_reuse_rejected=true");
  console.log("same_request_payment_identity_conflict_rejected=true");
  console.log("legacy_verified_payment_identity_incomplete_fails_closed=true");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
