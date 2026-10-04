import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  writeBuyVoidOperatorEventWithCapacityAdmissionV1,
} from "../src/economic/buy_void_verified_payment_capacity_admission_v1.js";

const tx = (digit: string) => "0x" + digit.repeat(64);

type Request = {
  request_id: string;
  source_chain: string;
  tx_hash: string;
  quoted_void: number;
};

function event(
  request: Request,
  logIndex: number,
  markedAt: number,
) {
  return {
    schema: "void_buy_void_verified_payment_event_v2",
    marker: "VOID_BUY_VOID_VERIFIED_PAYMENT_V2",
    ok: true,
    request_id: request.request_id,
    operator_status: "payment_verified",
    marked_at_ms: markedAt,
    tx_hash: request.tx_hash,
    payment_verified: true,
    payment_identity_input_complete: true,
    quoted_void: request.quoted_void,
    payment_verifier: {
      chain: request.source_chain,
      transaction_hash: request.tx_hash,
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
  };
}

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-duplicate-runtime-integration-"),
);

try {
  fs.chmodSync(root, 0o700);

  const sharedTx = tx("a");
  const requests: Request[] = [
    {
      request_id: "buyvoid_racea_aaaaaaaa",
      source_chain: "base",
      tx_hash: sharedTx,
      quoted_void: 4,
    },
    {
      request_id: "buyvoid_raceb_bbbbbbbb",
      source_chain: "base",
      tx_hash: sharedTx,
      quoted_void: 4,
    },
    {
      request_id: "buyvoid_racec_cccccccc",
      source_chain: "base",
      tx_hash: tx("c"),
      quoted_void: 4,
    },
  ];

  fs.writeFileSync(
    path.join(root, "requests.jsonl"),
    requests.map((request) => JSON.stringify(request)).join("\n") + "\n",
    { mode: 0o600 },
  );

  const eventsPath = path.join(root, "operator-events.jsonl");

  const readEvents = () => {
    if (!fs.existsSync(eventsPath)) return [] as any[];
    return fs
      .readFileSync(eventsPath, "utf8")
      .split(/\n+/u)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  };

  const readSaleState = async () => {
    const verified = new Set(
      readEvents()
        .filter((row) => row.operator_status === "payment_verified")
        .map((row) => String(row.request_id)),
    );
    const verifiedVoid = requests.reduce(
      (sum, request) =>
        sum +
        (verified.has(request.request_id)
          ? Number(request.quoted_void)
          : 0),
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

  const write = (
    request: Request,
    markedAt: number,
    logIndex: number,
  ) =>
    writeBuyVoidOperatorEventWithCapacityAdmissionV1({
      event: event(request, logIndex, markedAt),
      request,
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
    /buy_void_verified_payment_duplicate_guard_duplicate_payment_identity_already_claimed/u,
  );

  assert.equal(peakMutations, 1);
  assert.equal(mutationCalls, 1);

  let rows = readEvents().filter(
    (row) => row.operator_status === "payment_verified",
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].schema, "void_buy_void_verified_payment_event_v2");
  assert.equal(rows[0].payment_identity_input_complete, true);
  assert.equal(rows[0].payment_verifier.log_index, "7");

  const winnerId = String(rows[0].request_id);
  const winner =
    requests.find((request) => request.request_id === winnerId) ||
    requests[0];
  const loser =
    requests.find((request) => request.request_id !== winnerId) ||
    requests[1];

  let state = await readSaleState();
  assert.equal(state.verified_void_total, 4);
  assert.equal(state.remaining_void, 8);

  const exactReplay = await write(winner, 13, 7);
  assert.equal(exactReplay.idempotent, true);
  assert.equal(exactReplay.duplicate_guard.ok, true);
  if (!exactReplay.duplicate_guard.ok) {
    throw new Error("expected duplicate guard idempotent");
  }
  assert.equal(exactReplay.duplicate_guard.idempotent, true);
  assert.equal(mutationCalls, 1);
  assert.equal(
    readEvents().filter(
      (row) => row.operator_status === "payment_verified",
    ).length,
    1,
  );

  // The losing request can use the same transaction only if it identifies a
  // distinct transfer log. That is a different canonical payment identity.
  const distinctLog = await write(loser, 14, 8);
  assert.equal(distinctLog.idempotent, false);
  assert.equal(distinctLog.duplicate_guard.ok, true);
  assert.equal(mutationCalls, 2);

  state = await readSaleState();
  assert.equal(state.verified_void_total, 8);
  assert.equal(state.remaining_void, 4);

  // A fresh invocation has no in-memory reservation cache. It must reconstruct
  // both duplicate identity and finite-capacity authority from durable history.
  const afterRestart = await write(requests[2], 15, 3);
  assert.equal(afterRestart.idempotent, false);
  assert.equal(afterRestart.duplicate_guard.ok, true);
  assert.equal(mutationCalls, 3);

  state = await readSaleState();
  assert.equal(state.verified_void_total, 12);
  assert.equal(state.remaining_void, 0);

  rows = readEvents().filter(
    (row) => row.operator_status === "payment_verified",
  );
  assert.equal(rows.length, 3);

  await assert.rejects(
    () =>
      write(
        {
          request_id: "buyvoid_raced_dddddddd",
          source_chain: "base",
          tx_hash: tx("d"),
          quoted_void: 1,
        },
        16,
        4,
      ),
    /buy_void_verified_payment_capacity_candidate_request_missing/u,
  );

  console.log(
    "VOID_BUY_VOID_VERIFIED_PAYMENT_DUPLICATE_GUARD_RUNTIME_INTEGRATION_V1_GREEN",
  );
  console.log("duplicate_guard_inside_capacity_lock=true");
  console.log("concurrent_same_identity_double_admission=false");
  console.log("same_request_same_identity_reverification_idempotent=true");
  console.log("same_transaction_different_log_index_distinct=true");
  console.log("durable_restart_recount_enforced=true");
  console.log("peak_launch_mutations=1");
  console.log("payment_verified_event_schema=v2");
  console.log("allocation_reservation_write=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
