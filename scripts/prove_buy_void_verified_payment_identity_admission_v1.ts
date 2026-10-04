import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  writeBuyVoidOperatorEventWithCapacityAdmissionV1,
} from "../src/economic/buy_void_verified_payment_capacity_admission_v1.js";
import {
  VOID_BUY_VOID_VERIFIED_PAYMENT_IDENTITY_ADMISSION_AUTHORITY_V1,
  assertBuyVoidVerifiedPaymentIdentityAdmissionV1,
  classifyBuyVoidVerifiedPaymentIdentityAdmissionV1,
} from "../src/economic/buy_void_verified_payment_identity_admission_v1.js";

const tx = (digit: string) => "0x" + digit.repeat(64);

const request = (
  requestId: string,
  transactionHash: string,
  quotedVoid = 4,
) => ({
  request_id: requestId,
  source_chain: "base",
  tx_hash: transactionHash,
  quoted_void: quotedVoid,
});

const event = (
  value: ReturnType<typeof request>,
  logIndex: number,
  markedAt: number,
) => ({
  schema: "void_buy_void_verified_payment_event_v2",
  marker: "VOID_BUY_VOID_VERIFIED_PAYMENT_V2",
  request_id: value.request_id,
  operator_status: "payment_verified",
  payment_verified: true,
  payment_identity_input_complete: true,
  marked_at_ms: markedAt,
  tx_hash: value.tx_hash,
  quoted_void: value.quoted_void,
  payment_verifier: {
    chain: value.source_chain,
    transaction_hash: value.tx_hash,
    log_index: String(logIndex),
    block_number: "100",
    confirmations: "12",
    usdc_contract: "0x" + "a".repeat(40),
    from_address: "0x" + "b".repeat(40),
    receive_address: "0x" + "c".repeat(40),
    delivery_address: "0x" + "d".repeat(40),
    amount_units: "1000000",
    requested_units: "1000000",
  },
});

const a = request("buyvoid_a_aaaaaaaa", tx("a"));
const bSamePayment = request("buyvoid_b_bbbbbbbb", tx("a"));
const bOtherPayment = request("buyvoid_b_bbbbbbbb", tx("b"));

const aEvent = event(a, 7, 1);
const fresh = classifyBuyVoidVerifiedPaymentIdentityAdmissionV1({
  request: a,
  event: aEvent,
  operator_events: [],
});
assert.equal(fresh.ready, true);
assert.equal(fresh.already_verified, false);
assert.match(
  fresh.canonical_payment_identity,
  /^voidpay1:base:0x[a-f0-9]{64}:7$/u,
);

const replay = classifyBuyVoidVerifiedPaymentIdentityAdmissionV1({
  request: bSamePayment,
  event: event(bSamePayment, 7, 2),
  operator_events: [aEvent],
});
assert.equal(replay.ready, false);
assert.equal(
  replay.reason,
  "buy_void_verified_payment_identity_reused",
);

const exactReplay = assertBuyVoidVerifiedPaymentIdentityAdmissionV1({
  request: a,
  event: event(a, 7, 3),
  operator_events: [aEvent],
});
assert.equal(exactReplay.already_verified, true);

const changedRequestPayment =
  classifyBuyVoidVerifiedPaymentIdentityAdmissionV1({
    request: a,
    event: event(a, 8, 4),
    operator_events: [aEvent],
  });
assert.equal(changedRequestPayment.ready, false);
assert.equal(
  changedRequestPayment.reason,
  "buy_void_verified_payment_identity_request_changed",
);

const differentPayment =
  classifyBuyVoidVerifiedPaymentIdentityAdmissionV1({
    request: bOtherPayment,
    event: event(bOtherPayment, 7, 5),
    operator_events: [aEvent],
  });
assert.equal(differentPayment.ready, true);
assert.equal(differentPayment.already_verified, false);

const sameTransactionDifferentLog =
  classifyBuyVoidVerifiedPaymentIdentityAdmissionV1({
    request: bSamePayment,
    event: event(bSamePayment, 9, 6),
    operator_events: [aEvent],
  });
assert.equal(sameTransactionDifferentLog.ready, true);

assert.throws(
  () =>
    classifyBuyVoidVerifiedPaymentIdentityAdmissionV1({
      request: bOtherPayment,
      event: event(bOtherPayment, 7, 7),
      operator_events: [
        {
          request_id: a.request_id,
          operator_status: "payment_verified",
          payment_verified: true,
        },
      ],
    }),
  /buy_void_verified_payment_identity_event_provenance_invalid/u,
);

assert.throws(
  () =>
    classifyBuyVoidVerifiedPaymentIdentityAdmissionV1({
      request: bOtherPayment,
      event: event(bOtherPayment, 7, 8),
      operator_events: [aEvent, event(bSamePayment, 7, 9)],
    }),
  /buy_void_verified_payment_identity_history_reused/u,
);

const mismatchedRequest = {
  ...a,
  tx_hash: tx("c"),
};
assert.throws(
  () =>
    classifyBuyVoidVerifiedPaymentIdentityAdmissionV1({
      request: mismatchedRequest,
      event: aEvent,
      operator_events: [],
    }),
  /buy_void_verified_payment_identity_request_binding_mismatch/u,
);

for (const [key, value] of Object.entries(
  VOID_BUY_VOID_VERIFIED_PAYMENT_IDENTITY_ADMISSION_AUTHORITY_V1,
)) {
  if (
    [
      "source_contract",
      "canonical_payment_identity_validation",
      "strict_verified_history_collision_detection",
    ].includes(key)
  ) {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-payment-identity-admission-"),
);
try {
  fs.chmodSync(root, 0o700);
  const sameTx = tx("e");
  const requests = [
    request("buyvoid_race_a_aaaaaaaa", sameTx),
    request("buyvoid_race_b_bbbbbbbb", sameTx),
    request("buyvoid_race_c_cccccccc", tx("f")),
  ];
  fs.writeFileSync(
    path.join(root, "requests.jsonl"),
    requests.map((value) => JSON.stringify(value)).join("\n") + "\n",
    { mode: 0o600 },
  );

  const eventsPath = path.join(root, "operator-events.jsonl");
  const readEvents = async () => {
    if (!fs.existsSync(eventsPath)) return [];
    return fs
      .readFileSync(eventsPath, "utf8")
      .split(/\n+/u)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  };
  const readSaleState = async () => {
    const verified = new Set(
      (await readEvents())
        .filter((value) => value.operator_status === "payment_verified")
        .map((value) => String(value.request_id)),
    );
    const verifiedVoid = requests.reduce(
      (sum, value) =>
        sum +
        (verified.has(value.request_id) ? Number(value.quoted_void) : 0),
      0,
    );
    const pool = 12;
    return {
      pool_void_total: pool,
      allocation_reserved_void: verifiedVoid,
      verified_void_total: verifiedVoid,
      remaining_void: pool - verifiedVoid,
    };
  };

  let mutationCalls = 0;
  const withLaunchAuthorityMutation = async (
    _request: any,
    operation: () => any,
  ) => {
    mutationCalls += 1;
    await new Promise((resolve) => setTimeout(resolve, 25));
    return operation();
  };

  const write = (
    value: (typeof requests)[number],
    markedAt: number,
    logIndex: number,
  ) =>
    writeBuyVoidOperatorEventWithCapacityAdmissionV1({
      event: event(value, logIndex, markedAt),
      request: value,
      request_dir: root,
      with_launch_authority_mutation: withLaunchAuthorityMutation,
      read_sale_state: readSaleState,
    });

  const raced = await Promise.allSettled([
    write(requests[0], 11, 7),
    write(requests[1], 12, 7),
  ]);
  assert.equal(
    raced.filter((value) => value.status === "fulfilled").length,
    1,
  );
  assert.equal(
    raced.filter((value) => value.status === "rejected").length,
    1,
  );
  const rejected = raced.find((value) => value.status === "rejected");
  assert.match(
    String(
      rejected && rejected.status === "rejected"
        ? rejected.reason?.message || rejected.reason
        : "",
    ),
    /buy_void_verified_payment_identity_reused/u,
  );
  assert.equal(mutationCalls, 1);

  let rows = await readEvents();
  const verifiedRows = rows.filter(
    (value) => value.operator_status === "payment_verified",
  );
  assert.equal(verifiedRows.length, 1);
  const winnerId = String(verifiedRows[0].request_id);
  const winner =
    requests.find((value) => value.request_id === winnerId) || requests[0];
  const loser =
    requests.find((value) => value.request_id !== winnerId) || requests[1];

  let state = await readSaleState();
  assert.equal(state.verified_void_total, 4);
  assert.equal(state.remaining_void, 8);

  const exactReplayResult = await write(winner, 13, 7);
  assert.equal(exactReplayResult.idempotent, true);
  assert.equal(mutationCalls, 1);
  rows = await readEvents();
  assert.equal(
    rows.filter((value) => value.operator_status === "payment_verified")
      .length,
    1,
  );

  // The losing request may proceed only with a different canonical payment
  // identity and while fresh capacity remains. A different log index is a
  // distinct identity even when the transaction hash is the same.
  const differentIdentity = await write(loser, 14, 8);
  assert.equal(differentIdentity.idempotent, false);
  assert.equal(mutationCalls, 2);
  state = await readSaleState();
  assert.equal(state.verified_void_total, 8);
  assert.equal(state.remaining_void, 4);

  // A fresh call has no in-memory reservation cache: it must recount the
  // durable ledger before admitting the remaining request.
  const afterRestart = await write(requests[2], 15, 3);
  assert.equal(afterRestart.idempotent, false);
  state = await readSaleState();
  assert.equal(state.verified_void_total, 12);
  assert.equal(state.remaining_void, 0);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log("VOID_BUY_VOID_VERIFIED_PAYMENT_IDENTITY_ADMISSION_V1_GREEN");
console.log("one_payment_identity_one_request=true");
console.log("concurrent_duplicate_payment_identity_double_admission=false");
console.log("same_request_exact_identity_reverification_idempotent=true");
console.log("same_request_different_identity_rejected=true");
console.log("different_identity_for_losing_request_can_use_fresh_capacity=true");
console.log("durable_restart_recount_enforced=true");
console.log("same_transaction_different_log_identity_distinct=true");
console.log("incomplete_verified_history_fails_closed=true");
console.log("filesystem_write_by_identity_helper=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
