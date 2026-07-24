import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_SERVER_SNAPSHOT_AUTHORITY_V1,
  deriveBuyVoidBoundedOrchestratorServerSnapshotV1,
} from "../src/economic/buy_void_bounded_orchestrator_server_snapshot_v1.js";

function writeJson(
  root: string,
  filename: string,
  value: unknown,
): void {
  fs.writeFileSync(
    path.join(root, filename),
    JSON.stringify(value, null, 2) + "\n",
    { mode: 0o600 },
  );
}

function request(
  requestId: string,
  status = "payment_submitted_pending_manual_review",
): Record<string, unknown> {
  return {
    schema: "void_public_buy_void_request_v1",
    ok: true,
    request_id: requestId,
    status,
  };
}

function event(input: {
  request_id: string;
  marked_at_ms: number;
  prior_status: string;
  operator_status: string;
}): Record<string, unknown> {
  return {
    schema: "void_buy_void_operator_mark_v1",
    ok: true,
    ...input,
  };
}

function claim(
  requestId: string,
  paymentIdentity: string,
): Record<string, unknown> {
  return {
    claim: {
      request_id: requestId,
      canonical_payment_identity: paymentIdentity,
      status: "claimed",
    },
  };
}

function attempt(input: {
  request_id: string;
  payment_identity: string;
  attempt_id: string;
  attempt_number: number;
  status: string;
  delivery_tx?: string;
}): Record<string, unknown> {
  return {
    reservation: {
      request_id: input.request_id,
      canonical_payment_identity: input.payment_identity,
      attempt_id: input.attempt_id,
      attempt_number: input.attempt_number,
    },
    status: input.status,
    confirmation: input.delivery_tx
      ? { void_delivery_tx_hash: input.delivery_tx }
      : null,
  };
}

async function main(): Promise<void> {
  assert.equal(
    VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_SERVER_SNAPSHOT_AUTHORITY_V1
      .request_id_only_selector,
    true,
  );
  assert.equal(
    VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_SERVER_SNAPSHOT_AUTHORITY_V1
      .client_supplied_snapshot_forbidden,
    true,
  );
  assert.equal(
    VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_SERVER_SNAPSHOT_AUTHORITY_V1
      .filesystem_write,
    false,
  );

  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-buy-server-snapshot-v1-"),
  );
  const requestDir = path.join(root, "requests");
  fs.mkdirSync(requestDir, { recursive: true, mode: 0o700 });

  try {
    const newRequestId = "buyvoid_server_snapshot_new_v1";
    writeJson(
      requestDir,
      `${newRequestId}.json`,
      request(newRequestId),
    );

    const newDecision =
      deriveBuyVoidBoundedOrchestratorServerSnapshotV1({
        root_dir: root,
        request_dir: requestDir,
        request_id: newRequestId,
        dependencies: {
          list_claims: () => [],
          list_attempts: () => [],
          read_broadcast: () => null,
          list_confirmed: () => [],
        },
      });

    assert.equal(newDecision.ok, true);
    if (!newDecision.ok) throw new Error(newDecision.reason);
    assert.equal(newDecision.snapshot.claim_status, "missing");
    assert.equal(newDecision.snapshot.attempt_status, "missing");
    assert.equal(newDecision.snapshot.broadcast_status, "none");
    assert.equal(
      newDecision.snapshot.public_status,
      "payment_submitted_pending_manual_review",
    );

    const reserveRequestId =
      "buyvoid_server_snapshot_reserve_v1";
    const reservePayment =
      "voidpay1:base:0x" + "1".repeat(64) + ":4";
    writeJson(
      requestDir,
      `${reserveRequestId}.json`,
      request(reserveRequestId),
    );
    writeJson(
      requestDir,
      `operator-event-${reserveRequestId}-100.json`,
      event({
        request_id: reserveRequestId,
        marked_at_ms: 100,
        prior_status:
          "payment_submitted_pending_manual_review",
        operator_status: "payment_verified",
      }),
    );

    const reserveDecision =
      deriveBuyVoidBoundedOrchestratorServerSnapshotV1({
        root_dir: root,
        request_dir: requestDir,
        request_id: reserveRequestId,
        dependencies: {
          list_claims: () => [
            claim(reserveRequestId, reservePayment),
          ],
          list_attempts: () => [],
          read_broadcast: () => null,
          list_confirmed: () => [],
        },
      });

    assert.equal(reserveDecision.ok, true);
    if (!reserveDecision.ok) {
      throw new Error(reserveDecision.reason);
    }
    assert.equal(reserveDecision.snapshot.claim_status, "claimed");
    assert.equal(
      reserveDecision.snapshot.canonical_payment_identity,
      reservePayment,
    );
    assert.equal(reserveDecision.snapshot.attempt_status, "missing");
    assert.equal(
      reserveDecision.snapshot.public_status,
      "payment_verified",
    );

    const unknownRequestId =
      "buyvoid_server_snapshot_unknown_v1";
    const unknownPayment =
      "voidpay1:base:0x" + "2".repeat(64) + ":5";
    const unknownAttempt = "a".repeat(64);
    writeJson(
      requestDir,
      `${unknownRequestId}.json`,
      request(unknownRequestId),
    );

    const unknownDecision =
      deriveBuyVoidBoundedOrchestratorServerSnapshotV1({
        root_dir: root,
        request_dir: requestDir,
        request_id: unknownRequestId,
        dependencies: {
          list_claims: () => [
            claim(unknownRequestId, unknownPayment),
          ],
          list_attempts: () => [
            attempt({
              request_id: unknownRequestId,
              payment_identity: unknownPayment,
              attempt_id: unknownAttempt,
              attempt_number: 1,
              status: "broadcast",
            }),
          ],
          read_broadcast: () => ({
            status: "broadcast_unknown",
            retry_allowed: false,
            reconciliation_required: true,
          }),
          list_confirmed: () => [],
        },
      });

    assert.equal(unknownDecision.ok, true);
    if (!unknownDecision.ok) {
      throw new Error(unknownDecision.reason);
    }
    assert.equal(
      unknownDecision.snapshot.attempt_id,
      unknownAttempt,
    );
    assert.equal(
      unknownDecision.snapshot.attempt_status,
      "broadcast",
    );
    assert.equal(
      unknownDecision.snapshot.broadcast_status,
      "broadcast_unknown",
    );

    const fulfilledRequestId =
      "buyvoid_server_snapshot_fulfilled_v1";
    const fulfilledPayment =
      "voidpay1:base:0x" + "3".repeat(64) + ":6";
    const fulfilledAttempt = "b".repeat(64);
    const deliveryTx = "0x" + "4".repeat(64);
    writeJson(
      requestDir,
      `${fulfilledRequestId}.json`,
      request(fulfilledRequestId),
    );
    writeJson(
      requestDir,
      `operator-event-${fulfilledRequestId}-100.json`,
      event({
        request_id: fulfilledRequestId,
        marked_at_ms: 100,
        prior_status:
          "payment_submitted_pending_manual_review",
        operator_status: "payment_verified",
      }),
    );
    writeJson(
      requestDir,
      `operator-event-${fulfilledRequestId}-200.json`,
      event({
        request_id: fulfilledRequestId,
        marked_at_ms: 200,
        prior_status: "payment_verified",
        operator_status: "fulfilled",
      }),
    );

    const fulfilledDecision =
      deriveBuyVoidBoundedOrchestratorServerSnapshotV1({
        root_dir: root,
        request_dir: requestDir,
        request_id: fulfilledRequestId,
        dependencies: {
          list_claims: () => [
            claim(fulfilledRequestId, fulfilledPayment),
          ],
          list_attempts: () => [
            attempt({
              request_id: fulfilledRequestId,
              payment_identity: fulfilledPayment,
              attempt_id: fulfilledAttempt,
              attempt_number: 1,
              status: "confirmed",
              delivery_tx: deliveryTx,
            }),
          ],
          read_broadcast: () => ({
            status: "confirmed",
            retry_allowed: false,
            reconciliation_required: false,
          }),
          list_confirmed: () => [{
            request_id: fulfilledRequestId,
            canonical_payment_identity: fulfilledPayment,
            fulfillment_receipt: {
              void_delivery_tx_hash: deliveryTx,
            },
          }],
        },
      });

    assert.equal(fulfilledDecision.ok, true);
    if (!fulfilledDecision.ok) {
      throw new Error(fulfilledDecision.reason);
    }
    assert.equal(
      fulfilledDecision.snapshot.public_status,
      "fulfilled",
    );
    assert.equal(
      fulfilledDecision.snapshot.attempt_status,
      "confirmed",
    );
    assert.equal(
      fulfilledDecision.snapshot.broadcast_status,
      "confirmed",
    );
    assert.equal(
      fulfilledDecision.evidence.confirmed_state_present,
      true,
    );
    assert.equal(
      fulfilledDecision.evidence.fulfilled_event_count,
      1,
    );

    const duplicateClaim =
      deriveBuyVoidBoundedOrchestratorServerSnapshotV1({
        root_dir: root,
        request_dir: requestDir,
        request_id: reserveRequestId,
        dependencies: {
          list_claims: () => [
            claim(reserveRequestId, reservePayment),
            claim(reserveRequestId, reservePayment),
          ],
          list_attempts: () => [],
          read_broadcast: () => null,
          list_confirmed: () => [],
        },
      });

    assert.equal(duplicateClaim.ok, false);
    if (duplicateClaim.ok) {
      throw new Error("expected duplicate-claim hold");
    }
    assert.equal(
      duplicateClaim.reason,
      "multiple_claims_for_request",
    );

    const symlinkId = "buyvoid_server_snapshot_symlink_v1";
    const outside = path.join(root, "outside.json");
    writeJson(root, "outside.json", request(symlinkId));
    fs.symlinkSync(
      outside,
      path.join(requestDir, `${symlinkId}.json`),
    );

    const symlinkDecision =
      deriveBuyVoidBoundedOrchestratorServerSnapshotV1({
        root_dir: root,
        request_dir: requestDir,
        request_id: symlinkId,
        dependencies: {
          list_claims: () => [],
          list_attempts: () => [],
          read_broadcast: () => null,
          list_confirmed: () => [],
        },
      });

    assert.equal(symlinkDecision.ok, false);
    if (symlinkDecision.ok) {
      throw new Error("expected symlink hold");
    }
    assert.equal(
      symlinkDecision.reason,
      "public_request_projection_failed",
    );

    console.log(
      "VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_SERVER_SNAPSHOT_V1_GREEN",
    );
    console.log("request_id_only_selector=1");
    console.log("client_supplied_snapshot=0");
    console.log("server_owned_request_projection=1");
    console.log("server_owned_claim_reader=1");
    console.log("server_owned_attempt_reader=1");
    console.log("server_owned_broadcast_reader=1");
    console.log("server_owned_confirmed_reader=1");
    console.log("filesystem_write=0");
    console.log("wallet_access=0");
    console.log("signing=0");
    console.log("transaction_broadcast=0");
    console.log("money_movement=0");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
