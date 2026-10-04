import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_VOID_VERIFIED_PAYMENT_CAPACITY_ADMISSION_AUTHORITY_V1,
  classifyBuyVoidVerifiedPaymentCapacityAdmissionV1,
  testOnlyReadStrictCapacityLedgerFileV1,
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

  const eventFor = (
    request: { request_id: string; quoted_void: number },
    markedAt: number,
  ) => ({
    schema: "void_buy_void_operator_mark_v1",
    ok: true,
    request_id: request.request_id,
    operator_status: "payment_verified",
    marked_at_ms: markedAt,
    tx_hash: "0x" + String(markedAt).padStart(64, "0").slice(-64),
    payment_verified: true,
    quoted_void: request.quoted_void,
  });
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
  assert.equal(
    (await readEvents()).filter(
      (event) => event.operator_status === "payment_verified",
    ).length,
    1,
  );
  let state = await readSaleState();
  assert.equal(state.allocation_reserved_void, 6);
  assert.equal(state.remaining_void, 4);

  const four = await write(requests[2], 3);
  assert.equal(four.idempotent, false);
  state = await readSaleState();
  assert.equal(state.allocation_reserved_void, 10);
  assert.equal(state.remaining_void, 0);

  const fourSidecar = path.join(
    root,
    "operator-event-" + requests[2].request_id + "-3.json",
  );
  assert.equal(fs.existsSync(fourSidecar), true);

  await assert.rejects(
    () => write(requests[3], 4),
    /buy_void_verified_payment_capacity_exceeded/u,
  );
  assert.equal(mutationCalls, 2);

  // Simulate a crash after the durable JSONL append but before sidecar
  // publication. Exact re-verification must recover the historical sidecar,
  // not append another capacity reservation or publish a new timestamped event.
  fs.unlinkSync(fourSidecar);
  assert.equal(fs.existsSync(fourSidecar), false);
  const duplicate = await write(requests[2], 5);
  assert.equal(duplicate.idempotent, true);
  assert.equal(duplicate.sidecar_recovered, true);
  assert.equal(duplicate.recovered_sidecar_count, 1);
  assert.equal(mutationCalls, 2);
  assert.equal(fs.existsSync(fourSidecar), true);
  assert.equal(
    fs.existsSync(
      path.join(root, "operator-event-" + requests[2].request_id + "-5.json"),
    ),
    false,
  );
  const recoveredSidecar = JSON.parse(fs.readFileSync(fourSidecar, "utf8"));
  assert.equal(recoveredSidecar.request_id, requests[2].request_id);
  assert.equal(recoveredSidecar.operator_status, "payment_verified");
  assert.equal(recoveredSidecar.marked_at_ms, 3);
  assert.equal(
    (await readEvents()).filter(
      (event) => event.operator_status === "payment_verified",
    ).length,
    2,
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

  // Descriptor-bound strict reads must reject a visible-path replacement
  // after the opened inode has already passed its initial stat.
  {
    const ledgerRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "void-buy-capacity-read-swap-"),
    );
    try {
      fs.chmodSync(ledgerRoot, 0o700);
      const ledger = path.join(ledgerRoot, "requests.jsonl");
      const detached = path.join(ledgerRoot, "requests.detached.jsonl");
      const replacement =
        Buffer.from(
          JSON.stringify({
            request_id: "buyvoid_swap_eeeeeeee",
            quoted_void: 1,
          }) + "\n",
          "utf8",
        );
      fs.writeFileSync(ledger, replacement, { mode: 0o600 });

      assert.throws(
        () =>
          testOnlyReadStrictCapacityLedgerFileV1(
            ledger,
            "buy_void_verified_payment_capacity_requests",
            () => {
              fs.renameSync(ledger, detached);
              fs.writeFileSync(ledger, replacement, { mode: 0o600 });
            },
          ),
        /buy_void_verified_payment_capacity_requests_path_not_bound/u,
      );
      assert.equal(fs.readFileSync(ledger).equals(replacement), true);
      assert.equal(fs.readFileSync(detached).equals(replacement), true);
    } finally {
      fs.rmSync(ledgerRoot, { recursive: true, force: true });
    }
  }

  // Growth after the admitted fstat must be detected from the retained
  // descriptor without allocating or reading the enlarged 65 MiB object.
  {
    const ledgerRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "void-buy-capacity-read-growth-"),
    );
    try {
      fs.chmodSync(ledgerRoot, 0o700);
      const ledger = path.join(ledgerRoot, "requests.jsonl");
      fs.writeFileSync(
        ledger,
        JSON.stringify({
          request_id: "buyvoid_grow_ffffffff",
          quoted_void: 1,
        }) + "\n",
        { mode: 0o600 },
      );
      assert.throws(
        () =>
          testOnlyReadStrictCapacityLedgerFileV1(
            ledger,
            "buy_void_verified_payment_capacity_requests",
            () => {
              fs.truncateSync(ledger, 65 * 1024 * 1024);
            },
          ),
        /buy_void_verified_payment_capacity_requests_(?:file_invalid|changed_during_read)/u,
      );
    } finally {
      fs.rmSync(ledgerRoot, { recursive: true, force: true });
    }
  }

  // The payment append must use the exact operator-ledger inode admitted by
  // the capacity census. Replacing the visible path after census but before
  // launch-authority mutation must HOLD before any event bytes are written.
  {
    const swapRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "void-buy-capacity-append-swap-"),
    );
    try {
      fs.chmodSync(swapRoot, 0o700);
      const swapRequest = {
        request_id: "buyvoid_swap2_12121212",
        quoted_void: 1,
      };
      fs.writeFileSync(
        path.join(swapRoot, "requests.jsonl"),
        JSON.stringify(swapRequest) + "\n",
        { mode: 0o600 },
      );
      const swapEvents = path.join(swapRoot, "operator-events.jsonl");
      const detached = path.join(
        swapRoot,
        "operator-events.detached.jsonl",
      );
      fs.writeFileSync(swapEvents, "", { mode: 0o600 });
      const sentinel = Buffer.from('{"replacement":true}\n', "utf8");

      const swapSaleState = async () => ({
        pool_void_total: 10,
        allocation_reserved_void: 0,
        verified_void_total: 0,
        remaining_void: 10,
      });
      const swapMutation = async (
        _request: any,
        operation: () => any,
      ) => {
        fs.renameSync(swapEvents, detached);
        fs.writeFileSync(swapEvents, sentinel, { mode: 0o600 });
        return operation();
      };

      await assert.rejects(
        () =>
          writeBuyVoidOperatorEventWithCapacityAdmissionV1({
            event: eventFor(swapRequest, 101),
            request: swapRequest,
            request_dir: swapRoot,
            with_launch_authority_mutation: swapMutation,
            read_sale_state: swapSaleState,
          }),
        /buy_void_verified_payment_capacity_operator_events_path_not_bound/u,
      );
      assert.equal(fs.readFileSync(swapEvents).equals(sentinel), true);
      assert.equal(fs.statSync(detached).size, 0);
      assert.equal(
        fs.existsSync(
          path.join(
            swapRoot,
            "operator-event-" + swapRequest.request_id + "-101.json",
          ),
        ),
        false,
      );
    } finally {
      fs.rmSync(swapRoot, { recursive: true, force: true });
    }
  }

  // Same-inode growth after census is also rejected before the append.
  {
    const growRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "void-buy-capacity-append-growth-"),
    );
    try {
      fs.chmodSync(growRoot, 0o700);
      const growRequest = {
        request_id: "buyvoid_grow2_34343434",
        quoted_void: 1,
      };
      fs.writeFileSync(
        path.join(growRoot, "requests.jsonl"),
        JSON.stringify(growRequest) + "\n",
        { mode: 0o600 },
      );
      const growEvents = path.join(growRoot, "operator-events.jsonl");
      fs.writeFileSync(growEvents, "", { mode: 0o600 });

      const growSaleState = async () => ({
        pool_void_total: 10,
        allocation_reserved_void: 0,
        verified_void_total: 0,
        remaining_void: 10,
      });
      const growMutation = async (
        _request: any,
        operation: () => any,
      ) => {
        fs.truncateSync(growEvents, 65 * 1024 * 1024);
        return operation();
      };

      await assert.rejects(
        () =>
          writeBuyVoidOperatorEventWithCapacityAdmissionV1({
            event: eventFor(growRequest, 102),
            request: growRequest,
            request_dir: growRoot,
            with_launch_authority_mutation: growMutation,
            read_sale_state: growSaleState,
          }),
        /buy_void_verified_payment_capacity_operator_events_file_invalid/u,
      );
      assert.equal(fs.statSync(growEvents).size, 65 * 1024 * 1024);
      assert.equal(
        fs.existsSync(
          path.join(
            growRoot,
            "operator-event-" + growRequest.request_id + "-102.json",
          ),
        ),
        false,
      );
    } finally {
      fs.rmSync(growRoot, { recursive: true, force: true });
    }
  }

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
        "durable_payment_verified_append",
        "payment_verified_sidecar_recovery",
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
  console.log("payment_verified_jsonl_append_fsync=true");
  console.log("requests_ledger_descriptor_bound_bounded_read=true");
  console.log("operator_ledger_same_inode_census_append=true");
  console.log("operator_ledger_visible_swap_before_append_rejected=true");
  console.log("ledger_growth_after_admission_metadata_rejected=true");
  console.log("missing_payment_verified_sidecar_recovered=true");
  console.log("idempotent_recovery_does_not_append_new_event=true");
  console.log("duplicate_payment_identity_guard_proven=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
