#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_V1,
  runBuyVoidPaymentKeyedDispatcherPostgresAdmittedGuardedRuntimeV1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_postgres_admitted_guarded_runtime_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1,
  type BuyVoidPaymentKeyedDispatcherLeaseV1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_v1.js";
import {
  buyVoidPaymentKeyedFullRuntimePolicyStateV1,
} from "../src/economic/buy_void_payment_keyed_full_runtime_v1.js";

const LIVE_FIXTURE_ENV =
  "VOID_TEST_POSTGRES_ADMITTED_GUARDED_RUNTIME_LIVE_FIXTURE";
const ATTEMPT_ID = "1".repeat(64);
const LEASE: BuyVoidPaymentKeyedDispatcherLeaseV1 = {
  marker: VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1,
  attempt_id: ATTEMPT_ID,
  lease_gen: 1n,
  lease_token: "2".repeat(32),
  worker_id: "postgres-admitted-live-fixture-v1",
  lease_expires_us: 9_000_000_000_000_000n,
};

function proveStaticBoundary(): void {
  const authority =
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_AUTHORITY_V1;
  assert.equal(authority.source_only_composition, true);
  assert.equal(authority.disabled_by_default, true);
  assert.equal(authority.live_schema_admission_required_before_worker, true);
  assert.equal(authority.schema_admission_database_mutation_allowed, false);
  assert.equal(authority.same_admitted_factory_pool_reused_for_worker, true);
  assert.equal(authority.bounded_guarded_broadcast_worker_required, true);
  assert.equal(authority.factory_close_after_command, true);
  assert.equal(authority.automatic_retry, false);
  assert.equal(authority.runtime_route_mount, false);
  assert.equal(authority.service_mutation, false);
  console.log(
    "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_LIVE_FIXTURE_V1_STATIC_GREEN",
  );
  console.log("live_fixture_requested=false");
  console.log("credential_read=false");
  console.log("postgres_connect=false");
  console.log("worker_invoked=false");
  console.log("transaction_broadcast=false");
  console.log("money_movement=false");
}

async function proveLiveFixture(): Promise<void> {
  const policy = buyVoidPaymentKeyedFullRuntimePolicyStateV1(process.env);
  if (policy.configured !== true) {
    throw new Error(
      "live_fixture_full_runtime_policy_held:" +
        policy.reason +
        ":" +
        JSON.stringify({
          missing_envs: policy.missing_envs,
          invalid_envs: policy.invalid_envs,
        }),
    );
  }
  assert.equal(policy.root_dir, process.env.VOID_BUY_VOID_RUNTIME_DIR);

  const result =
    await runBuyVoidPaymentKeyedDispatcherPostgresAdmittedGuardedRuntimeV1({
      lease: LEASE,
    });

  assert.equal(
    result.marker,
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_V1,
  );
  assert.equal(result.ok, false);
  assert.equal(result.status, "held");
  assert.equal(result.stage, "worker");
  assert.equal(result.reason, "guarded_broadcast_context_held");
  assert.equal(result.attempt_id, ATTEMPT_ID);
  assert.equal(result.worker_id, LEASE.worker_id);
  assert.match(
    String(result.configuration_fingerprint_sha256),
    /^[0-9a-f]{64}$/,
  );
  assert.match(String(result.schema_fingerprint_sha256), /^[0-9a-f]{64}$/);
  assert.equal(result.credential_read_performed, true);
  assert.equal(result.schema_query_performed, true);
  assert.equal(result.schema_admission_database_mutation_performed, false);
  assert.equal(result.worker_invoked, true);
  assert.equal(result.dispatcher_database_mutation_may_have_occurred, true);
  assert.equal(result.factory_close_attempted, true);
  assert.equal(result.factory_close_failed, false);
  assert.equal(result.broadcast_call_performed, false);
  assert.equal(result.transaction_broadcast_accepted, false);
  assert.equal(result.money_movement_performed, false);
  assert.equal(result.money_movement_may_have_occurred, false);

  assert.ok(result.worker);
  if (!result.worker || result.worker.ok) {
    throw new Error("live_fixture_worker_hold_expected");
  }
  assert.equal(result.worker.status, "held");
  assert.equal(result.worker.reason, "guarded_broadcast_context_held");
  assert.equal(result.worker.worker_execution_performed, false);
  assert.equal(result.worker.dependency_bootstrap_performed, false);
  assert.equal(result.worker.broadcast_call_performed, false);
  assert.equal(result.worker.transaction_broadcast_accepted, false);
  assert.equal(result.worker.money_movement_performed, false);
  assert.equal(result.worker.money_movement_may_have_occurred, false);
  assert.deepEqual(result.worker.detail, {
    context_reason: "runtime_preview_held",
  });

  console.log(
    "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_LIVE_FIXTURE_V1_GREEN",
  );
  console.log("live_postgres_tls_verified=true");
  console.log("systemd_style_postgres_credentials_read=true");
  console.log("live_schema_admission_passed=true");
  console.log("schema_admission_database_mutation=false");
  console.log("guarded_worker_entered=true");
  console.log("dependency_bootstrap_performed=false");
  console.log("signing_exercised=false");
  console.log("transaction_broadcast_exercised=false");
  console.log("money_movement_exercised=false");
  console.log("factory_close_success=true");
}

if (process.env[LIVE_FIXTURE_ENV] === "1") {
  await proveLiveFixture();
} else {
  proveStaticBoundary();
}
