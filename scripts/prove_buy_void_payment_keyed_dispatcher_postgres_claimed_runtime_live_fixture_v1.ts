#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_CONFIRMATION_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_WORKER_ID_V1,
  runBuyVoidPaymentKeyedDispatcherPostgresClaimedRuntimeV1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_postgres_claimed_runtime_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_V1,
} from "../src/economic/buy_void_payment_keyed_preparation_custody_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_REQUEST_SCHEMA_V1,
} from "../src/economic/buy_void_payment_keyed_custodian_prepare_request_v1.js";
import {
  buyVoidPaymentKeyedFullRuntimePolicyStateV1,
} from "../src/economic/buy_void_payment_keyed_full_runtime_v1.js";

const LIVE_FIXTURE_ENV =
  "VOID_TEST_POSTGRES_CLAIMED_RUNTIME_LIVE_FIXTURE";
const ATTEMPT_ID = "1".repeat(64);
const REQUEST_FINGERPRINT = "a".repeat(64);

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function writeCustody(root: string): {
  request_fingerprint_sha256: string;
  custody_fingerprint_sha256: string;
} {
  const sagaId = "voidbvfsg1_" + "3".repeat(64);
  const planReservationId = "4".repeat(64);
  const idempotencyKey = "5".repeat(64);
  const wallet = "0x" + "1".repeat(40);
  const signedHash = "0x" + "9".repeat(64);
  const rawSha = "b".repeat(64);

  const request = {
    schema: VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_REQUEST_SCHEMA_V1,
    marker: VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_V1,
    version: 1,
    idempotency_key_sha256: idempotencyKey,
    request_fingerprint_sha256: REQUEST_FINGERPRINT,
    saga_id: sagaId,
    attempt_id: ATTEMPT_ID,
    plan_reservation_id: planReservationId,
    chain_id: "2050",
    wallet_address: wallet,
    nonce: 7,
    transaction_to: "0x" + "2".repeat(40),
    transaction_value_wei: "0",
    transaction_calldata: "0x00",
    transaction_calldata_sha256: "6".repeat(64),
    gas_limit: "21000",
    max_fee_per_gas_wei: "100",
    max_priority_fee_per_gas_wei: "1",
    canonical_payment_identity:
      "voidpay1:base:0x" + "c".repeat(64) + ":0",
    canonical_payment_key_sha256: "d".repeat(64),
    delivery_address: "0x" + "3".repeat(40),
    void_amount_units: "100",
    token_amount_atoms: "100000000000000",
    call_fingerprint_sha256: "e".repeat(64),
    transaction_plan_fingerprint_sha256: "f".repeat(64),
    unsigned_transaction_fingerprint_sha256: "0".repeat(64),
    credential_access_authorized: false,
    wallet_access_authorized: false,
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    raw_signed_transaction_persisted: false,
    money_movement_authorized: false,
  };

  const custodyFingerprint = sha256(
    [
      "marker=" + VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_V1,
      "version=1",
      "request_fingerprint_sha256=" + REQUEST_FINGERPRINT,
      "request_idempotency_key_sha256=" + idempotencyKey,
      "attempt_id=" + ATTEMPT_ID,
      "saga_id=" + sagaId,
      "plan_reservation_id=" + planReservationId,
      "signer_address=" + wallet,
      "signed_transaction_hash=" + signedHash,
      "raw_signed_transaction_sha256=" + rawSha,
    ].join("\n"),
  );

  const record = {
    schema: "void_buy_void_payment_keyed_preparation_custody_record_v1",
    marker: VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_V1,
    version: 1,
    recorded_at_ms: 1_700_000_000_000,
    request,
    signer_address: wallet,
    signed_transaction_hash: signedHash,
    raw_signed_transaction_sha256: rawSha,
    custody_fingerprint_sha256: custodyFingerprint,
    deterministic_signing_verified: true,
    raw_signed_transaction_persisted: false,
    raw_signed_transaction_returned: false,
    transaction_broadcast_authorized: false,
    money_movement_authorized: false,
  };

  const records = path.join(
    root,
    "buy-void-payment-keyed-preparation-custody-v1",
    "records",
  );
  fs.mkdirSync(records, { recursive: true, mode: 0o700 });
  fs.chmodSync(path.dirname(records), 0o700);
  fs.chmodSync(records, 0o700);
  const file = path.join(records, ATTEMPT_ID + ".json");
  fs.writeFileSync(file, JSON.stringify(record, null, 2) + "\n", {
    encoding: "utf8",
    mode: 0o600,
  });
  fs.chmodSync(file, 0o600);
  return {
    request_fingerprint_sha256: REQUEST_FINGERPRINT,
    custody_fingerprint_sha256: custodyFingerprint,
  };
}

function proveStaticBoundary(): void {
  const authority =
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_AUTHORITY_V1;
  assert.equal(authority.source_only_composition, true);
  assert.equal(authority.runtime_route_mount, false);
  assert.equal(authority.caller_lease_authority, false);
  assert.equal(authority.caller_worker_id_authority, false);
  assert.equal(authority.server_enqueue_required, true);
  assert.equal(authority.server_claim_required, true);
  assert.equal(authority.claim_factory_closed_before_child, true);
  assert.equal(authority.fresh_child_factory_revalidation_required, true);
  assert.equal(authority.lease_capability_returned, false);
  assert.equal(authority.automatic_retry, false);
  console.log(
    "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_LIVE_FIXTURE_V1_STATIC_GREEN",
  );
  console.log("live_fixture_requested=false");
  console.log("postgres_connect=false");
  console.log("dispatcher_enqueue=false");
  console.log("dispatcher_claim=false");
  console.log("child_invoked=false");
  console.log("transaction_broadcast=false");
  console.log("money_movement=false");
}

async function proveLiveFixture(): Promise<void> {
  const policy = buyVoidPaymentKeyedFullRuntimePolicyStateV1(process.env);
  if (policy.configured !== true) {
    throw new Error(
      "claimed_live_fixture_full_runtime_policy_held:" +
        policy.reason +
        ":" +
        JSON.stringify({
          missing_envs: policy.missing_envs,
          invalid_envs: policy.invalid_envs,
        }),
    );
  }
  const root = process.env.VOID_BUY_VOID_RUNTIME_DIR || "";
  assert.ok(path.isAbsolute(root));
  assert.equal(policy.root_dir, root);

  const custody = writeCustody(root);
  assert.equal(custody.request_fingerprint_sha256, REQUEST_FINGERPRINT);
  assert.match(custody.custody_fingerprint_sha256, /^[0-9a-f]{64}$/);

  const result =
    await runBuyVoidPaymentKeyedDispatcherPostgresClaimedRuntimeV1({
      attempt_id: ATTEMPT_ID,
      apply: true,
      confirmation:
        VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_CONFIRMATION_V1,
    });

  assert.equal(
    result.marker,
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_V1,
  );
  assert.equal(result.ok, false);
  assert.equal(result.status, "held");
  assert.equal(result.stage, "child");
  assert.equal(result.reason, "guarded_broadcast_context_held");
  assert.equal(result.attempt_id, ATTEMPT_ID);
  assert.equal(
    result.worker_id,
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_WORKER_ID_V1,
  );
  assert.equal(result.enqueue_status, "submitted");
  assert.equal(result.claim_status, "claimed");
  assert.equal(result.credential_read_performed, true);
  assert.equal(result.schema_query_performed, true);
  assert.equal(
    result.schema_admission_database_mutation_performed,
    false,
  );
  assert.equal(
    result.dispatcher_database_mutation_may_have_occurred,
    true,
  );
  assert.equal(result.lease_capability_issued, true);
  assert.equal(result.lease_capability_returned, false);
  assert.equal(result.claim_factory_close_attempted, true);
  assert.equal(result.claim_factory_close_failed, false);
  assert.equal(result.child_invoked, true);
  assert.equal(result.raw_signed_transaction_returned, false);
  assert.equal(result.broadcast_call_performed, false);
  assert.equal(result.transaction_broadcast_accepted, false);
  assert.equal(result.money_movement_performed, false);
  assert.equal(result.money_movement_may_have_occurred, false);
  assert.equal(result.automatic_retry_allowed, false);

  assert.ok(result.child);
  if (!result.child) throw new Error("claimed_live_fixture_child_missing");
  assert.equal(result.child.ok, false);
  assert.equal(result.child.status, "held");
  assert.equal(result.child.stage, "worker");
  assert.equal(result.child.reason, "guarded_broadcast_context_held");
  assert.equal(result.child.attempt_id, ATTEMPT_ID);
  assert.equal(
    result.child.worker_id,
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_WORKER_ID_V1,
  );
  assert.equal(result.child.credential_read_performed, true);
  assert.equal(result.child.schema_query_performed, true);
  assert.equal(
    result.child.schema_admission_database_mutation_performed,
    false,
  );
  assert.equal(result.child.worker_invoked, true);
  assert.equal(result.child.factory_close_attempted, true);
  assert.equal(result.child.factory_close_failed, false);
  assert.equal(result.child.broadcast_call_performed, false);
  assert.equal(result.child.transaction_broadcast_accepted, false);
  assert.equal(result.child.money_movement_performed, false);
  assert.equal(result.child.money_movement_may_have_occurred, false);

  assert.ok(result.child.worker);
  if (!result.child.worker || result.child.worker.ok) {
    throw new Error("claimed_live_fixture_worker_hold_expected");
  }
  assert.equal(result.child.worker.status, "held");
  assert.equal(
    result.child.worker.reason,
    "guarded_broadcast_context_held",
  );
  assert.equal(result.child.worker.worker_execution_performed, false);
  assert.equal(result.child.worker.dependency_bootstrap_performed, false);
  assert.equal(result.child.worker.broadcast_call_performed, false);
  assert.equal(result.child.worker.transaction_broadcast_accepted, false);
  assert.equal(result.child.worker.money_movement_performed, false);
  assert.equal(
    result.child.worker.money_movement_may_have_occurred,
    false,
  );
  assert.deepEqual(result.child.worker.detail, {
    context_reason: "runtime_preview_held",
  });

  const serialized = JSON.stringify(
    result,
    (_key, value) =>
      typeof value === "bigint" ? value.toString(10) : value,
  );
  assert.doesNotMatch(serialized, /"lease_token"/);
  assert.doesNotMatch(serialized, /"raw_signed_transaction"/);

  console.log(
    "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_LIVE_FIXTURE_V1_GREEN",
  );
  console.log("synthetic_private_custody_written=true");
  console.log("live_postgres_tls_verified=true");
  console.log("systemd_style_postgres_credentials_read=true");
  console.log("live_schema_admission_passed=true");
  console.log("dispatcher_enqueue_status=submitted");
  console.log("dispatcher_claim_status=claimed");
  console.log("fixed_server_worker_identity=true");
  console.log("lease_capability_returned=false");
  console.log("admitted_child_entered=true");
  console.log("dependency_bootstrap_performed=false");
  console.log("signing_exercised=false");
  console.log("transaction_broadcast_exercised=false");
  console.log("money_movement_exercised=false");
  console.log("claim_factory_close_success=true");
  console.log("child_factory_close_success=true");
}

if (process.env[LIVE_FIXTURE_ENV] === "1") {
  await proveLiveFixture();
} else {
  proveStaticBoundary();
}
