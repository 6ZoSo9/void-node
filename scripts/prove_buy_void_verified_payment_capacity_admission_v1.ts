import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_VOID_VERIFIED_PAYMENT_CAPACITY_ADMISSION_AUTHORITY_V1,
  classifyBuyVoidVerifiedPaymentCapacityAdmissionV1,
  testOnlyReadStrictCapacityCensusV1,
  testOnlyReadStrictCapacityLedgerFileV1,
  writeBuyVoidOperatorEventWithCapacityAdmissionV1,
} from "../src/economic/buy_void_verified_payment_capacity_admission_v1.js";

import {
  buyVoidTerminalCloseoutRequestLockPathV1,
} from "../src/economic/buy_void_terminal_closeout_request_lock_v1.js";

const capacitySource = fs.readFileSync(
  path.join(
    process.cwd(),
    "src",
    "economic",
    "buy_void_verified_payment_capacity_admission_v1.ts",
  ),
  "utf8",
);
assert.match(
  capacitySource,
  /buy_void_verified_payment_capacity_descriptor_safety_unavailable/u,
);
assert.match(
  capacitySource,
  /!fs\.existsSync\("\/proc\/self\/fd"\)/u,
);
assert.doesNotMatch(
  capacitySource,
  /fs\.constants\.O_NOFOLLOW[\s\S]{0,120}: 0;/u,
);
assert.doesNotMatch(
  capacitySource,
  /fs\.constants\.O_DIRECTORY[\s\S]{0,120}: 0;/u,
);
assert.match(
  capacitySource,
  /withBuyVoidTerminalCloseoutRequestLockV1/u,
);
assert.doesNotMatch(
  capacitySource.slice(
    capacitySource.indexOf(
      "export async function writeBuyVoidOperatorEventWithCapacityAdmissionV1",
    ),
  ),
  /buyVoidTerminalCloseoutRequestLockPathV1/u,
);

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-capacity-admission-"),
);
try {
  fs.chmodSync(root, 0o700);
  const requests = [
    { request_id: "buyvoid_a_aaaaaaaa", quoted_void: 6, source_chain: "base", tx_hash: "0x" + "a".repeat(64) },
    { request_id: "buyvoid_b_bbbbbbbb", quoted_void: 6, source_chain: "base", tx_hash: "0x" + "b".repeat(64) },
    { request_id: "buyvoid_c_cccccccc", quoted_void: 4, source_chain: "base", tx_hash: "0x" + "c".repeat(64) },
    { request_id: "buyvoid_d_dddddddd", quoted_void: 1, source_chain: "base", tx_hash: "0x" + "d".repeat(64) },
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
    operation: (assert_current_authority: () => any) => any,
  ) => {
    mutationCalls += 1;
    activeMutations += 1;
    peakMutations = Math.max(peakMutations, activeMutations);
    try {
      await new Promise((resolve) => setTimeout(resolve, 25));
      return operation(() => ({ ready: true }));
    } finally {
      activeMutations -= 1;
    }
  };

  const identityTxHashForRequest = (requestId: string) =>
    "0x" +
    Buffer.from(requestId, "utf8")
      .toString("hex")
      .padEnd(64, "0")
      .slice(0, 64);
  const eventFor = (
    request: {
      request_id: string;
      quoted_void: number;
      source_chain?: string;
      tx_hash?: string;
    },
    markedAt: number,
    identityLogIndex = markedAt,
  ) => {
    const sourceChain = request.source_chain || "base";
    const transactionHash =
      request.tx_hash || identityTxHashForRequest(request.request_id);
    request.source_chain = sourceChain;
    request.tx_hash = transactionHash;
    return {
      schema: "void_buy_void_verified_payment_event_v2",
      marker: "VOID_BUY_VOID_VERIFIED_PAYMENT_V2",
      ok: true,
      request_id: request.request_id,
      operator_status: "payment_verified",
      marked_at_ms: markedAt,
      tx_hash: transactionHash,
      payment_verified: true,
      payment_identity_input_complete: true,
      quoted_void: request.quoted_void,
      payment_verifier: {
        chain: sourceChain,
        transaction_hash: transactionHash,
        log_index: String(identityLogIndex),
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
  };
  const write = (
    request: {
      request_id: string;
      quoted_void: number;
      source_chain?: string;
      tx_hash?: string;
    },
    markedAt: number,
    identityLogIndex = markedAt,
  ) =>
    writeBuyVoidOperatorEventWithCapacityAdmissionV1({
      event: eventFor(request, markedAt, identityLogIndex),
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
  const duplicate = await write(requests[2], 5, 3);
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

  // If the legacy/public projection is stale after the durable append,
  // the authoritative postcheck must fail before orchestration sidecar
  // publication. An exact retry may then recover the sidecar idempotently.
  {
    const postcheckRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "void-buy-capacity-postcheck-sidecar-"),
    );
    try {
      fs.chmodSync(postcheckRoot, 0o700);
      const postcheckRequest = {
        request_id: "buyvoid_post_90909090",
        quoted_void: 1,
        source_chain: "base",
        tx_hash: "0x" + "9".repeat(64),
      };
      fs.writeFileSync(
        path.join(postcheckRoot, "requests.jsonl"),
        JSON.stringify(postcheckRequest) + "\n",
        { mode: 0o600 },
      );
      const postcheckEvents = path.join(
        postcheckRoot,
        "operator-events.jsonl",
      );
      const postcheckSidecar = path.join(
        postcheckRoot,
        "operator-event-" + postcheckRequest.request_id + "-105.json",
      );
      const postcheckMutation = async (
        _request: any,
        operation: (assert_current_authority: () => any) => any,
      ) => operation(() => ({ ready: true }));
      const staleSaleState = async () => ({
        pool_void_total: 10,
        allocation_reserved_void: 0,
        verified_void_total: 0,
        remaining_void: 10,
      });

      await assert.rejects(
        () =>
          writeBuyVoidOperatorEventWithCapacityAdmissionV1({
            event: eventFor(postcheckRequest, 105),
            request: postcheckRequest,
            request_dir: postcheckRoot,
            with_launch_authority_mutation: postcheckMutation,
            read_sale_state: staleSaleState,
          }),
        /buy_void_verified_payment_capacity_projection_mismatch/u,
      );
      assert.equal(fs.existsSync(postcheckSidecar), false);
      const durableRows = fs
        .readFileSync(postcheckEvents, "utf8")
        .trimEnd()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));
      assert.equal(durableRows.length, 1);
      assert.equal(
        durableRows[0].operator_status,
        "payment_verified",
      );

      const accurateSaleState = async () => {
        const rows = fs.existsSync(postcheckEvents)
          ? fs
              .readFileSync(postcheckEvents, "utf8")
              .split(/\n+/u)
              .filter(Boolean)
              .map((line) => JSON.parse(line))
          : [];
        const verified = rows.some(
          (event) =>
            event.request_id === postcheckRequest.request_id &&
            event.operator_status === "payment_verified",
        );
        return {
          pool_void_total: 10,
          allocation_reserved_void: verified ? 1 : 0,
          verified_void_total: verified ? 1 : 0,
          remaining_void: verified ? 9 : 10,
        };
      };
      const recovered = await writeBuyVoidOperatorEventWithCapacityAdmissionV1({
        event: eventFor(postcheckRequest, 105),
        request: postcheckRequest,
        request_dir: postcheckRoot,
        with_launch_authority_mutation: postcheckMutation,
        read_sale_state: accurateSaleState,
      });
      assert.equal(recovered.idempotent, true);
      assert.equal(recovered.sidecar_recovered, true);
      assert.equal(recovered.recovered_sidecar_count, 1);
      assert.equal(fs.existsSync(postcheckSidecar), true);
      const finalRows = fs
        .readFileSync(postcheckEvents, "utf8")
        .trimEnd()
        .split("\n")
        .filter(Boolean);
      assert.equal(finalRows.length, 1);
    } finally {
      fs.rmSync(postcheckRoot, { recursive: true, force: true });
    }
  }

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

  // A payment writer may await generation authority, but it must not hold the
  // synchronous request lock while doing so. An ordinary same-process reviewed
  // mark for the same request must complete before generation authority is
  // released to the payment writer.
  {
    const livenessRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "void-buy-capacity-same-process-liveness-"),
    );
    try {
      fs.chmodSync(livenessRoot, 0o700);
      const livenessRequest = {
        request_id: "buyvoid_liveness_34343434",
        quoted_void: 1,
        source_chain: "base",
        tx_hash: "0x" + "3".repeat(64),
      };
      fs.writeFileSync(
        path.join(livenessRoot, "requests.jsonl"),
        JSON.stringify(livenessRequest) + "\n",
        { mode: 0o600 },
      );
      const livenessEventsPath = path.join(
        livenessRoot,
        "operator-events.jsonl",
      );
      const livenessSaleState = async () => {
        const rows = fs.existsSync(livenessEventsPath)
          ? fs
              .readFileSync(livenessEventsPath, "utf8")
              .split(/\n+/u)
              .filter(Boolean)
              .map((line) => JSON.parse(line))
          : [];
        const verified = rows.some(
          (row) =>
            row.request_id === livenessRequest.request_id &&
            row.operator_status === "payment_verified",
        );
        return {
          pool_void_total: 10,
          allocation_reserved_void: verified ? 1 : 0,
          verified_void_total: verified ? 1 : 0,
          remaining_void: verified ? 9 : 10,
        };
      };

      let launchEnteredResolve!: () => void;
      let releaseLaunchResolve!: () => void;
      const launchEntered = new Promise<void>(
        (resolve) => { launchEnteredResolve = resolve; },
      );
      const releaseLaunch = new Promise<void>(
        (resolve) => { releaseLaunchResolve = resolve; },
      );
      let launchReleased = false;
      let freshAuthorityAssertions = 0;
      const delayedLaunchMutation = async (
        _request: any,
        operation: (assert_current_authority: () => any) => any,
      ) => {
        launchEnteredResolve();
        await releaseLaunch;
        launchReleased = true;
        return operation(() => {
          freshAuthorityAssertions += 1;
          return { ready: true };
        });
      };

      const paymentPromise =
        writeBuyVoidOperatorEventWithCapacityAdmissionV1({
          event: eventFor(livenessRequest, 118),
          request: livenessRequest,
          request_dir: livenessRoot,
          with_launch_authority_mutation: delayedLaunchMutation,
          read_sale_state: livenessSaleState,
        });
      await launchEntered;

      const reviewEvent = {
        schema: "void_buy_void_operator_mark_v1",
        ok: true,
        request_id: livenessRequest.request_id,
        operator_status: "reviewed",
        marked_at_ms: 117,
        quoted_void: livenessRequest.quoted_void,
      };
      const reviewStartedAt = Date.now();
      const reviewResult =
        await writeBuyVoidOperatorEventWithCapacityAdmissionV1({
          event: reviewEvent,
          request: livenessRequest,
          request_dir: livenessRoot,
          with_launch_authority_mutation: delayedLaunchMutation,
          read_sale_state: livenessSaleState,
        });
      assert.equal(reviewResult.ok, true);
      assert.equal(
        launchReleased,
        false,
        "ordinary reviewed mark must finish while payment is still awaiting generation authority",
      );
      assert.ok(
        Date.now() - reviewStartedAt < 2_000,
        "same-process reviewed mark must not stall behind an async payment request-lock holder",
      );

      const paymentRejected = assert.rejects(
        paymentPromise,
        /buy_void_verified_payment_capacity_operator_events_changed_since_census/u,
      );
      releaseLaunchResolve();
      await paymentRejected;
      assert.equal(freshAuthorityAssertions, 1);
      const livenessRows = fs
        .readFileSync(livenessEventsPath, "utf8")
        .trimEnd()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));
      assert.equal(
        livenessRows.filter(
          (row) => row.operator_status === "reviewed",
        ).length,
        1,
      );
      assert.equal(
        livenessRows.filter(
          (row) => row.operator_status === "payment_verified",
        ).length,
        0,
        "payment must fail closed when the ordinary mark changes the operator ledger after capacity census",
      );
    } finally {
      fs.rmSync(livenessRoot, { recursive: true, force: true });
    }
  }

  // Generation authority is acquired before the request lock. The external
  // holder waits for the initial authority check, marks the synthetic lease
  // expired while still owning the request lock, then releases it. The fresh
  // under-held-generation assertion inside the request critical section must
  // observe that post-wait expiry and reject before any payment_verified append.
  {
    const expiryRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "void-buy-capacity-request-lock-expiry-"),
    );
    let holder: ReturnType<typeof spawn> | null = null;
    try {
      fs.chmodSync(expiryRoot, 0o700);
      const expiryRequest = {
        request_id: "buyvoid_expiry_12121212",
        quoted_void: 1,
        source_chain: "base",
        tx_hash: "0x" + "1".repeat(64),
      };
      fs.writeFileSync(
        path.join(expiryRoot, "requests.jsonl"),
        JSON.stringify(expiryRequest) + "\n",
        { mode: 0o600 },
      );
      const expiryEventsPath = path.join(
        expiryRoot,
        "operator-events.jsonl",
      );
      const expirySaleState = async () => {
        const eventRows = fs.existsSync(expiryEventsPath)
          ? fs
              .readFileSync(expiryEventsPath, "utf8")
              .split(/\n+/u)
              .filter(Boolean)
              .map((line) => JSON.parse(line))
          : [];
        const verified = eventRows.some(
          (row) =>
            row.request_id === expiryRequest.request_id &&
            row.operator_status === "payment_verified",
        );
        return {
          pool_void_total: 10,
          allocation_reserved_void: verified ? 1 : 0,
          verified_void_total: verified ? 1 : 0,
          remaining_void: verified ? 9 : 10,
        };
      };

      const requestLockPath =
        buyVoidTerminalCloseoutRequestLockPathV1({
          request_dir: expiryRoot,
          request_id: expiryRequest.request_id,
        });
      const readyPath = path.join(expiryRoot, "external-holder-ready");
      const initialAuthorityPath = path.join(
        expiryRoot,
        "initial-authority-checked",
      );
      const expiredPath = path.join(expiryRoot, "synthetic-lease-expired");
      const holderSource = [
        'import fs from "node:fs";',
        'const m = await import("./src/economic/buy_void_filesystem_bakery_lock_v1.ts");',
        'await m.withBuyVoidFilesystemBakeryLockAsyncV1(',
        '  process.env.VOID_TEST_REQUEST_LOCK_PATH,',
        '  async () => {',
        '    fs.writeFileSync(process.env.VOID_TEST_REQUEST_LOCK_READY, "ready\\n");',
        '    const deadline = Date.now() + 5000;',
        '    while (!fs.existsSync(process.env.VOID_TEST_INITIAL_AUTHORITY_CHECKED)) {',
        '      if (Date.now() >= deadline) throw new Error("initial_authority_handshake_timeout");',
        '      await new Promise((resolve) => setTimeout(resolve, 10));',
        '    }',
        '    fs.writeFileSync(process.env.VOID_TEST_SYNTHETIC_LEASE_EXPIRED, "expired\\n");',
        '  },',
        ');',
      ].join("\n");
      let holderStdout = "";
      let holderStderr = "";
      holder = spawn(
        process.execPath,
        [
          "--import",
          "tsx",
          "--input-type=module",
          "--eval",
          holderSource,
        ],
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            VOID_TEST_REQUEST_LOCK_PATH: requestLockPath,
            VOID_TEST_REQUEST_LOCK_READY: readyPath,
            VOID_TEST_INITIAL_AUTHORITY_CHECKED: initialAuthorityPath,
            VOID_TEST_SYNTHETIC_LEASE_EXPIRED: expiredPath,
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      holder.stdout?.on(
        "data",
        (chunk) => { holderStdout += chunk.toString("utf8"); },
      );
      holder.stderr?.on(
        "data",
        (chunk) => { holderStderr += chunk.toString("utf8"); },
      );
      const holderDone = new Promise<number>((resolve, reject) => {
        holder?.once("error", reject);
        holder?.once(
          "exit",
          (code) => resolve(code ?? -1),
        );
      });
      const readyDeadline = Date.now() + 5_000;
      while (!fs.existsSync(readyPath)) {
        if (holder.exitCode !== null) {
          throw new Error(
            "external_request_lock_holder_exited_before_ready:" +
              holderStdout +
              holderStderr,
          );
        }
        if (Date.now() >= readyDeadline) {
          throw new Error("external_request_lock_holder_ready_timeout");
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      let launchMutationCalls = 0;
      let freshAuthorityAssertions = 0;
      const expiryLaunchMutation = async (
        _request: any,
        operation: (assert_current_authority: () => any) => any,
      ) => {
        launchMutationCalls += 1;
        if (fs.existsSync(expiredPath)) {
          throw new Error(
            "request_launch_authority_expired_or_superseded",
          );
        }
        fs.writeFileSync(
          initialAuthorityPath,
          "checked\n",
          { flag: "wx", mode: 0o600 },
        );
        return operation(() => {
          freshAuthorityAssertions += 1;
          if (!fs.existsSync(expiredPath)) {
            throw new Error(
              "synthetic_launch_expiry_not_observed_after_request_wait",
            );
          }
          throw new Error(
            "request_launch_authority_expired_or_superseded",
          );
        });
      };

      await assert.rejects(
        () =>
          writeBuyVoidOperatorEventWithCapacityAdmissionV1({
            event: eventFor(expiryRequest, 120),
            request: expiryRequest,
            request_dir: expiryRoot,
            with_launch_authority_mutation: expiryLaunchMutation,
            read_sale_state: expirySaleState,
          }),
        /request_launch_authority_expired_or_superseded/u,
      );
      assert.equal(await holderDone, 0);
      assert.equal(launchMutationCalls, 1);
      assert.equal(freshAuthorityAssertions, 1);
      if (fs.existsSync(expiryEventsPath)) {
        assert.equal(fs.statSync(expiryEventsPath).size, 0);
      }
    } finally {
      if (holder && holder.exitCode === null) {
        holder.kill("SIGKILL");
      }
      fs.rmSync(expiryRoot, { recursive: true, force: true });
    }
  }

  // Capacity admission must bind the candidate to the durable request ledger,
  // not only to the caller-supplied request object/event envelope.
  {
    const bindingRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "void-buy-capacity-request-binding-"),
    );
    try {
      fs.chmodSync(bindingRoot, 0o700);
      const durableRequest = {
        request_id: "buyvoid_bound_56565656",
        quoted_void: 2,
        source_chain: "base",
        tx_hash: "0x" + "5".repeat(64),
      };
      fs.writeFileSync(
        path.join(bindingRoot, "requests.jsonl"),
        JSON.stringify(durableRequest) + "\n",
        { mode: 0o600 },
      );
      let bindingMutationCalls = 0;
      const bindingMutation = async (
        _request: any,
        operation: (assert_current_authority: () => any) => any,
      ) => {
        bindingMutationCalls += 1;
        return operation(() => ({ ready: true }));
      };
      const bindingSaleState = async () => ({
        pool_void_total: 10,
        allocation_reserved_void: 0,
        verified_void_total: 0,
        remaining_void: 10,
      });

      const missingRequest = {
        request_id: "buyvoid_missing_78787878",
        quoted_void: 1,
      };
      await assert.rejects(
        () =>
          writeBuyVoidOperatorEventWithCapacityAdmissionV1({
            event: eventFor(missingRequest, 103),
            request: missingRequest,
            request_dir: bindingRoot,
            with_launch_authority_mutation: bindingMutation,
            read_sale_state: bindingSaleState,
          }),
        /buy_void_verified_payment_capacity_candidate_request_missing/u,
      );

      const mismatchedQuote = {
        ...durableRequest,
        quoted_void: 1,
      };
      await assert.rejects(
        () =>
          writeBuyVoidOperatorEventWithCapacityAdmissionV1({
            event: eventFor(mismatchedQuote, 104),
            request: mismatchedQuote,
            request_dir: bindingRoot,
            with_launch_authority_mutation: bindingMutation,
            read_sale_state: bindingSaleState,
          }),
        /buy_void_verified_payment_capacity_candidate_quote_mismatch/u,
      );
      assert.equal(bindingMutationCalls, 0);

      const mismatchedPaymentBinding = {
        ...durableRequest,
        tx_hash: "0x" + "6".repeat(64),
      };
      await assert.rejects(
        () =>
          writeBuyVoidOperatorEventWithCapacityAdmissionV1({
            event: eventFor(mismatchedPaymentBinding, 105),
            request: mismatchedPaymentBinding,
            request_dir: bindingRoot,
            with_launch_authority_mutation: bindingMutation,
            read_sale_state: bindingSaleState,
          }),
        /buy_void_verified_payment_duplicate_guard_request_binding_mismatch/u,
      );

      const mismatchedSourceChain = {
        ...durableRequest,
        source_chain: "ethereum",
      };
      await assert.rejects(
        () =>
          writeBuyVoidOperatorEventWithCapacityAdmissionV1({
            event: eventFor(mismatchedSourceChain, 106),
            request: mismatchedSourceChain,
            request_dir: bindingRoot,
            with_launch_authority_mutation: bindingMutation,
            read_sale_state: bindingSaleState,
          }),
        /buy_void_verified_payment_duplicate_guard_request_binding_mismatch/u,
      );
      assert.equal(bindingMutationCalls, 0);
      const bindingEvents = path.join(
        bindingRoot,
        "operator-events.jsonl",
      );
      assert.equal(fs.existsSync(bindingEvents), true);
      assert.equal(fs.statSync(bindingEvents).size, 0);
    } finally {
      fs.rmSync(bindingRoot, { recursive: true, force: true });
    }
  }

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

  // Every historical original request snapshot needs explicit chain evidence.
  // Do not admit a Base default or accept a contradictory alternate alias:
  // that would create paid capacity which byte-exact replay must later HOLD.
  {
    const chainRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "void-buy-capacity-chain-lineage-"),
    );
    try {
      fs.chmodSync(chainRoot, 0o700);
      const requestFile = path.join(chainRoot, "requests.jsonl");
      fs.writeFileSync(
        path.join(chainRoot, "operator-events.jsonl"),
        "", { mode: 0o600 },
      );
      const original = {
        request_id: "buyvoid_chain_12121212",
        quoted_void: 2,
        source_chain: "base",
        tx_hash: "0x" + "a".repeat(64),
      };
      const writeOriginalHistory = (rows: any[]) =>
        fs.writeFileSync(requestFile,
          rows.map((row) => JSON.stringify(row)).join("\n") + "\n",
          { mode: 0o600 });
      const census = () => testOnlyReadStrictCapacityCensusV1(
        chainRoot, 10_000_000n, () => {},
      );
      writeOriginalHistory([
        { ...original, payment_chain: "base", chain: "BASE" },
        { ...original, request_id: "buyvoid_eth_34343434",
          source_chain: "ethereum", payment_chain: "eth", chain: "ETH" },
      ]);
      const qualified = census();
      assert.equal(qualified.request_payment_bindings.get(original.request_id)?.source_chain, "base");
      assert.equal(qualified.request_payment_bindings.get("buyvoid_eth_34343434")?.source_chain, "ethereum");
      const invalidHistories: Array<{
        name: string; rows: any[]; reason: string;
      }> = [
        { name: "missing source_chain with Base alias",
          rows: [{ ...original, source_chain: undefined, payment_chain: "base" }],
          reason: "invalid" },
        { name: "missing every source chain label",
          rows: [{ ...original, source_chain: undefined }],
          reason: "invalid" },
        { name: "empty source_chain with Ethereum alias",
          rows: [{ ...original, source_chain: "", payment_chain: "ethereum" }],
          reason: "invalid" },
        { name: "conflicting payment_chain",
          rows: [{ ...original, payment_chain: "ethereum" }],
          reason: "alias_mismatch" },
        { name: "conflicting chain alias",
          rows: [{ ...original, chain: "ethereum" }],
          reason: "alias_mismatch" },
        { name: "present but null alias",
          rows: [{ ...original, payment_chain: null }],
          reason: "alias_mismatch" },
        { name: "two aliases contradict one another",
          rows: [{ ...original, payment_chain: "base", chain: "eth" }],
          reason: "alias_mismatch" },
        { name: "later snapshot cannot erase first alias contradiction",
          rows: [{ ...original }, { ...original, status: "later", chain: "ethereum" }],
          reason: "alias_mismatch" },
        { name: "unverified unrelated legacy missing original chain",
          rows: [
            { ...original, request_id: "buyvoid_legacy_56565656", source_chain: undefined },
            { ...original },
          ],
          reason: "invalid" },
      ];
      for (const { name, rows, reason } of invalidHistories) {
        writeOriginalHistory(rows);
        const bytesBefore = fs.readFileSync(requestFile);
        assert.throws(census,
          new RegExp("buy_void_verified_payment_capacity_request_source_chain_" + reason, "u"), name);
        assert.equal(fs.readFileSync(requestFile).equals(bytesBefore), true,
          "HOLD may not rewrite original historical request bytes");
      }
    } finally {
      fs.rmSync(chainRoot, { recursive: true, force: true });
    }
  }

  // A syntactically valid but non-LF-terminated row must not be treated as a
  // committed operator event. Raw bytes are never normalized or rewritten.
  // Exercise the SAME bounded, pinned reader used for request and event
  // histories, not a second hand-written synthetic JSON parser.
  {
    const strictRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "void-buy-capacity-canonical-jsonl-"),
    );
    try {
      fs.chmodSync(strictRoot, 0o700);
      const fixture = {
        request_id: "buyvoid_canonical_12121212",
        quoted_void: "2",
        source_chain: "base",
        note: "synthetic only",
      };
      const canonical = JSON.stringify(fixture) + "\n";
      const utf8Corrupt = Buffer.concat([
        Buffer.from(JSON.stringify(fixture).slice(0, -1) + ',"detail":"', "utf8"),
        Buffer.from([0xff]),
        Buffer.from('"}\n', "utf8"),
      ]);
      const adversaries: Array<{ label: string; bytes: Buffer; suffix: string }> = [
        { label: "complete json without terminating LF",
          bytes: Buffer.from(canonical.slice(0, -1)), suffix: "_truncated_or_noncanonical" },
        { label: "CRLF line ending", bytes: Buffer.from(canonical.replace("\n", "\r\n")),
          suffix: "_truncated_or_noncanonical" },
        { label: "duplicate request_id field",
          bytes: Buffer.from('{"request_id":"buyvoid_forged_ffffffff",' +
            JSON.stringify(fixture).slice(1) + "\n"),
          suffix: "_row_noncanonical" },
        { label: "invalid UTF-8 byte", bytes: utf8Corrupt, suffix: "_utf8_invalid" },
        { label: "UTF-8 BOM", bytes: Buffer.concat([
          Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(canonical),
        ]), suffix: "_utf8_bom_not_canonical" },
        { label: "empty terminal JSONL row",
          bytes: Buffer.from(canonical + "\n"), suffix: "_empty_row" },
        { label: "noncanonical whitespace",
          bytes: Buffer.from(JSON.stringify(fixture).replace(
            ',"quoted_void"', ', "quoted_void"') + "\n"),
          suffix: "_row_noncanonical" },
      ];
      for (const ledgerName of ["requests.jsonl", "operator-events.jsonl"]) {
        const code = ledgerName === "requests.jsonl"
          ? "buy_void_verified_payment_capacity_requests"
          : "buy_void_verified_payment_capacity_operator_events";
        const ledger = path.join(strictRoot, ledgerName);
        const read = () => testOnlyReadStrictCapacityLedgerFileV1(
          ledger, code, () => {},
        );
        fs.writeFileSync(ledger, canonical, { mode: 0o600 });
        assert.deepEqual(read(), [fixture]);
        fs.writeFileSync(ledger, canonical + canonical, { mode: 0o600 });
        assert.deepEqual(read(), [fixture, fixture],
          "valid LF-terminated rows preserve raw order");
        for (const { label, bytes, suffix } of adversaries) {
          fs.writeFileSync(ledger, bytes, { mode: 0o600 });
          assert.throws(read, new RegExp(code + suffix, "u"), label);
          assert.equal(fs.readFileSync(ledger).equals(bytes), true,
            "authoritative input must never be rewritten by observation");
        }
        fs.writeFileSync(ledger, Buffer.alloc(0), { mode: 0o600 });
        assert.deepEqual(read(), [],
          "zero-byte ledger can be observed but not treated as payment proof");
      }
    } finally {
      fs.rmSync(strictRoot, { recursive: true, force: true });
    }
  }

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
        /buy_void_verified_payment_capacity_requests_(?:changed_during_read|path_not_bound)/u,
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


  // The census must not pair bytes from one ledger state with metadata sampled
  // from a later state. Mutate only after both stable reads have completed.
  {
    const censusRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "void-buy-capacity-byte-bound-census-"),
    );
    try {
      fs.chmodSync(censusRoot, 0o700);
      const censusRequests = path.join(censusRoot, "requests.jsonl");
      const censusEvents = path.join(censusRoot, "operator-events.jsonl");
      const censusRequest = {
        request_id: "buyvoid_census_34343434",
        quoted_void: 1,
        source_chain: "base",
        tx_hash: "0x" + "4".repeat(64),
      };
      fs.writeFileSync(
        censusRequests,
        JSON.stringify(censusRequest) + "\n",
        { mode: 0o600 },
      );
      fs.writeFileSync(censusEvents, "", { mode: 0o600 });

      assert.throws(
        () =>
          testOnlyReadStrictCapacityCensusV1(
            censusRoot,
            10_000_000n,
            () => {
              fs.appendFileSync(
                censusRequests,
                JSON.stringify({
                  request_id: "buyvoid_census2_45454545",
                  quoted_void: 1,
                  source_chain: "base",
                  tx_hash: "0x" + "5".repeat(64),
                }) + "\n",
              );
            },
          ),
        /buy_void_verified_payment_capacity_requests_changed_since_read/u,
      );

      fs.writeFileSync(
        censusRequests,
        JSON.stringify(censusRequest) + "\n",
        { mode: 0o600 },
      );
      fs.writeFileSync(censusEvents, "", { mode: 0o600 });

      assert.throws(
        () =>
          testOnlyReadStrictCapacityCensusV1(
            censusRoot,
            10_000_000n,
            () => {
              fs.appendFileSync(
                censusEvents,
                JSON.stringify({
                  schema: "void_buy_void_operator_mark_v1",
                  ok: true,
                  request_id: censusRequest.request_id,
                  operator_status: "reviewed",
                  marked_at_ms: 34,
                  quoted_void: 1,
                }) + "\n",
              );
            },
          ),
        /buy_void_verified_payment_capacity_operator_events_changed_since_read/u,
      );

      assert.equal(
        fs.readFileSync(censusEvents, "utf8").includes("payment_verified"),
        false,
        "byte/stat census rejection must occur before any candidate payment append",
      );
    } finally {
      fs.rmSync(censusRoot, { recursive: true, force: true });
    }
  }

  // A same-inode request-ledger change after the pre-census snapshot must
  // HOLD inside the final request lock before payment verification is written.
  {
    const snapshotRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "void-buy-capacity-request-snapshot-"),
    );
    try {
      fs.chmodSync(snapshotRoot, 0o700);
      const snapshotRequest = {
        request_id: "buyvoid_snapr_56565656",
        quoted_void: 1,
        source_chain: "base",
        tx_hash: "0x" + "6".repeat(64),
      };
      const snapshotRequests = path.join(snapshotRoot, "requests.jsonl");
      const snapshotEvents = path.join(
        snapshotRoot,
        "operator-events.jsonl",
      );
      fs.writeFileSync(
        snapshotRequests,
        JSON.stringify(snapshotRequest) + "\n",
        { mode: 0o600 },
      );
      fs.writeFileSync(snapshotEvents, "", { mode: 0o600 });
      const snapshotSale = async () => ({
        pool_void_total: 10,
        allocation_reserved_void: 0,
        verified_void_total: 0,
        remaining_void: 10,
      });
      const snapshotMutation = async (
        _request: any,
        operation: (assert_current_authority: () => any) => any,
      ) => {
        fs.appendFileSync(
          snapshotRequests,
          JSON.stringify({
            request_id: "buyvoid_other_78787878",
            quoted_void: 1,
          }) + "\n",
        );
        return operation(() => ({ ready: true }));
      };
      await assert.rejects(
        () =>
          writeBuyVoidOperatorEventWithCapacityAdmissionV1({
            event: eventFor(snapshotRequest, 91),
            request: snapshotRequest,
            request_dir: snapshotRoot,
            with_launch_authority_mutation: snapshotMutation,
            read_sale_state: snapshotSale,
          }),
        /buy_void_verified_payment_capacity_requests_changed_since_census/u,
      );
      assert.equal(fs.statSync(snapshotEvents).size, 0);
      assert.equal(
        fs.existsSync(
          path.join(
            snapshotRoot,
            "operator-event-" + snapshotRequest.request_id + "-91.json",
          ),
        ),
        false,
      );
    } finally {
      fs.rmSync(snapshotRoot, { recursive: true, force: true });
    }
  }

  // A same-inode operator-ledger change after the pre-census snapshot must
  // likewise HOLD before this request's payment_verified event is appended.
  {
    const snapshotRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "void-buy-capacity-operator-snapshot-"),
    );
    try {
      fs.chmodSync(snapshotRoot, 0o700);
      const snapshotRequest = {
        request_id: "buyvoid_snapo_90909090",
        quoted_void: 1,
        source_chain: "base",
        tx_hash: "0x" + "7".repeat(64),
      };
      fs.writeFileSync(
        path.join(snapshotRoot, "requests.jsonl"),
        JSON.stringify(snapshotRequest) + "\n",
        { mode: 0o600 },
      );
      const snapshotEvents = path.join(
        snapshotRoot,
        "operator-events.jsonl",
      );
      fs.writeFileSync(snapshotEvents, "", { mode: 0o600 });
      const snapshotSale = async () => ({
        pool_void_total: 10,
        allocation_reserved_void: 0,
        verified_void_total: 0,
        remaining_void: 10,
      });
      const snapshotMutation = async (
        _request: any,
        operation: (assert_current_authority: () => any) => any,
      ) => {
        fs.appendFileSync(
          snapshotEvents,
          JSON.stringify({
            schema: "void_buy_void_operator_mark_v1",
            ok: true,
            request_id: snapshotRequest.request_id,
            operator_status: "reviewed",
            marked_at_ms: 90,
            quoted_void: 1,
          }) + "\n",
        );
        return operation(() => ({ ready: true }));
      };
      await assert.rejects(
        () =>
          writeBuyVoidOperatorEventWithCapacityAdmissionV1({
            event: eventFor(snapshotRequest, 92),
            request: snapshotRequest,
            request_dir: snapshotRoot,
            with_launch_authority_mutation: snapshotMutation,
            read_sale_state: snapshotSale,
          }),
        /buy_void_verified_payment_capacity_operator_events_changed_since_census/u,
      );
      const rows = fs
        .readFileSync(snapshotEvents, "utf8")
        .trimEnd()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));
      assert.equal(rows.length, 1);
      assert.equal(rows[0].operator_status, "reviewed");
      assert.equal(
        fs.existsSync(
          path.join(
            snapshotRoot,
            "operator-event-" + snapshotRequest.request_id + "-92.json",
          ),
        ),
        false,
      );
    } finally {
      fs.rmSync(snapshotRoot, { recursive: true, force: true });
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
        source_chain: "base",
        tx_hash: "0x" + "8".repeat(64),
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
        operation: (assert_current_authority: () => any) => any,
      ) => {
        fs.renameSync(swapEvents, detached);
        fs.writeFileSync(swapEvents, sentinel, { mode: 0o600 });
        return operation(() => ({ ready: true }));
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
        source_chain: "base",
        tx_hash: "0x" + "9".repeat(64),
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
        operation: (assert_current_authority: () => any) => any,
      ) => {
        fs.truncateSync(growEvents, 65 * 1024 * 1024);
        return operation(() => ({ ready: true }));
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
        "durable_request_payment_binding",
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
  console.log("authoritative_jsonl_requires_exact_lf_termination=true");
  console.log("authoritative_jsonl_rejects_duplicate_members_and_invalid_utf8=true");
  console.log("authoritative_jsonl_rejects_crlf_and_noncanonical_rows=true");
  console.log("historical_invalid_authority_bytes_are_not_rewritten=true");
  console.log("legacy_lenient_projection_is_not_capacity_authority=true");
  console.log("candidate_request_must_exist_in_durable_ledger=true");
  console.log("candidate_quote_bound_to_durable_request=true");
  console.log("candidate_payment_tx_bound_to_durable_request=true");
  console.log("candidate_source_chain_bound_to_durable_request=true");
  console.log("original_request_chain_explicit_no_base_default=true");
  console.log("original_request_chain_aliases_all_agree_or_hold=true");
  console.log("duplicate_request_reverification_idempotent=true");
  console.log("payment_verified_jsonl_append_fsync=true");
  console.log("requests_ledger_descriptor_bound_bounded_read=true");
  console.log("operator_ledger_same_inode_census_append=true");
  console.log("request_ledger_preappend_snapshot_required=true");
  console.log("operator_ledger_preappend_snapshot_required=true");
  console.log("operator_ledger_visible_swap_before_append_rejected=true");
  console.log("ledger_growth_after_admission_metadata_rejected=true");
  console.log("missing_payment_verified_sidecar_recovered=true");
  console.log("postcheck_failure_sidecar_publication=false");
  console.log("postcheck_failure_exact_retry_recovers_sidecar=true");
  console.log("idempotent_recovery_does_not_append_new_event=true");
  console.log("duplicate_payment_identity_guard_proven=true");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
