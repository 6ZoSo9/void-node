#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_APPLY_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_APPLY_V1,
  applyBuyVoidPaymentKeyedDispatcherGuardedBroadcastV1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_guarded_broadcast_apply_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1,
} from "../src/economic/buy_void_payment_keyed_full_runtime_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1,
  type BuyVoidPaymentKeyedDispatcherLeaseV1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_v1.js";

const ATTEMPT = "1".repeat(64);
const LEASE: BuyVoidPaymentKeyedDispatcherLeaseV1 = {
  marker: VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1,
  attempt_id: ATTEMPT,
  lease_gen: 1n,
  lease_token: "2".repeat(32),
  worker_id: "guarded-broadcast-worker-proof",
  lease_expires_us: 2_000_000n,
};

const envs = VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1;
const originalEnabled = process.env[envs.enabled];
const originalApply = process.env[envs.apply_enabled];
const originalRpc = process.env[envs.rpc_url];

try {
  assert.equal(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_APPLY_V1,
    "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_APPLY_V1",
  );
  const authority =
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_APPLY_AUTHORITY_V1;
  assert.equal(authority.worker_execution_bounded, true);
  assert.equal(authority.worker_execution_scope, "guarded_broadcast_only");
  assert.equal(authority.fixed_guarded_broadcast_context_required, true);
  assert.equal(authority.fixed_canonical_postgres_store_required, true);
  assert.equal(authority.fixed_nonreplayable_lease_session_required, true);
  assert.equal(authority.full_runtime_enabled_required, true);
  assert.equal(authority.full_runtime_apply_enabled_required, true);
  assert.equal(authority.production_dependency_bootstrap_fixed, true);
  assert.equal(authority.caller_dependency_authority, false);
  assert.equal(authority.caller_confirmation_authority, false);
  assert.equal(authority.caller_policy_authority, false);
  assert.equal(authority.dispatcher_publish, false);
  assert.equal(authority.dispatcher_renew, false);
  assert.equal(authority.automatic_retry, false);
  assert.equal(authority.raw_signed_transaction_returned, false);
  assert.equal(authority.inventory_mutation, false);
  assert.equal(authority.public_fulfilled_closeout, false);

  const invalid = await applyBuyVoidPaymentKeyedDispatcherGuardedBroadcastV1({
    root_dir: "relative",
    lease: LEASE,
    pool: {} as any,
  });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.reason, "input_invalid");
  assert.equal(invalid.worker_execution_performed, false);
  assert.equal(invalid.broadcast_call_performed, false);

  process.env[envs.enabled] = "0";
  process.env[envs.apply_enabled] = "1";
  const disabled = await applyBuyVoidPaymentKeyedDispatcherGuardedBroadcastV1({
    root_dir: "/tmp/void-dispatcher-guarded-proof",
    lease: LEASE,
    pool: {} as any,
  });
  assert.equal(disabled.ok, false);
  assert.equal(disabled.reason, "full_runtime_disabled");
  assert.equal(disabled.worker_execution_performed, false);
  assert.equal(disabled.dependency_bootstrap_performed, false);

  process.env[envs.enabled] = "1";
  process.env[envs.apply_enabled] = "0";
  const applyDisabled =
    await applyBuyVoidPaymentKeyedDispatcherGuardedBroadcastV1({
      root_dir: "/tmp/void-dispatcher-guarded-proof",
      lease: LEASE,
      pool: {} as any,
    });
  assert.equal(applyDisabled.ok, false);
  assert.equal(applyDisabled.reason, "full_runtime_apply_disabled");
  assert.equal(applyDisabled.worker_execution_performed, false);
  assert.equal(applyDisabled.dependency_bootstrap_performed, false);

  process.env[envs.enabled] = "1";
  process.env[envs.apply_enabled] = "1";
  process.env[envs.rpc_url] = "";
  const policyHeld =
    await applyBuyVoidPaymentKeyedDispatcherGuardedBroadcastV1({
      root_dir: "/tmp/void-dispatcher-guarded-proof",
      lease: LEASE,
      pool: {} as any,
    });
  assert.equal(policyHeld.ok, false);
  assert.equal(policyHeld.reason, "runtime_policy_held");
  assert.equal(policyHeld.worker_execution_performed, false);

  const source = fs.readFileSync(
    new URL(
      "../src/economic/buy_void_payment_keyed_dispatcher_guarded_broadcast_apply_v1.ts",
      import.meta.url,
    ),
    "utf8",
  );
  for (const required of [
    "buildBuyVoidPaymentKeyedDispatcherGuardedBroadcastContextV1",
    "createBuyVoidPaymentKeyedDispatcherPostgresStoreV1",
    "createBuyVoidPaymentKeyedRuntimeDependencyBootstrapV1",
    "createBuyVoidPaymentKeyedGuardedBroadcastLeaseRunnerV1",
    "full_runtime_apply_disabled",
    "context.required_guarded_broadcast_confirmation",
    "context.required_saga_confirmation",
    "context.required_saga_action_confirmation",
    "context.required_signer_confirmation",
    "context.required_broadcast_confirmation",
    "dispatcher_publish_performed: false",
    "dispatcher_renew_performed: false",
  ]) {
    assert.equal(source.includes(required), true, "missing fixed binding: " + required);
  }
  for (const forbidden of [
    "runBuyVoidPaymentKeyedFullRuntimeV1(",
    "publishBuyVoidPaymentKeyedDispatchResultV1",
    "renewBuyVoidPaymentKeyedDispatchLeaseV1",
    "input.dependencies",
    "input.server_policy",
    "input.confirmation",
    "input.stage",
  ]) {
    assert.equal(source.includes(forbidden), false, "forbidden worker authority: " + forbidden);
  }

  console.log(
    "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_APPLY_V1_PROOF_GREEN",
  );
  console.log("guarded_broadcast_worker_execution_bounded=true");
  console.log("generic_full_runtime_apply_forbidden=true");
  console.log("caller_dependency_authority=false");
  console.log("caller_confirmation_authority=false");
  console.log("dispatcher_publish=false");
  console.log("automatic_retry=false");
  console.log("live_execution_exercised=false");
} finally {
  if (originalEnabled === undefined) delete process.env[envs.enabled];
  else process.env[envs.enabled] = originalEnabled;
  if (originalApply === undefined) delete process.env[envs.apply_enabled];
  else process.env[envs.apply_enabled] = originalApply;
  if (originalRpc === undefined) delete process.env[envs.rpc_url];
  else process.env[envs.rpc_url] = originalRpc;
}
